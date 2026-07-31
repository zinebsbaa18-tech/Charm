import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { chat, analyzeImage } from './watsonx.js';
import { searchWeb, searchImages } from './serper.js';
import { STYLIST_SYSTEM_PROMPT, COMPLEMENT_ONLY_PROMPT, TEXT_STYLING_PROMPT } from './prompts.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Config ───────────────────────────────────────────────────────
const {
  GROQ_API_KEY,
  SERPER_API_KEY,
  PORT = 4000,
  MODEL = 'llama-3.3-70b-versatile',
  VISION_MODEL = 'qwen/qwen3.6-27b',
} = process.env;

if (!GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY in .env');
  process.exit(1);
}
if (!SERPER_API_KEY) {
  console.warn('Warning: SERPER_API_KEY not set — product search will be skipped');
}

// ── Rate limiter (Lite: 1 concurrent, 600ms cooldown) ──────────
let busy = false;
let lastRequestTime = 0;

async function acquireSlot() {
  if (busy) {
    throw Object.assign(new Error('Server busy. Please wait before sending another message.'), { statusCode: 429 });
  }
  const now = Date.now();
  const gap = 600 - (now - lastRequestTime);
  if (gap > 0) {
    await new Promise((r) => setTimeout(r, gap));
  }
  busy = true;
}

function releaseSlot() {
  busy = false;
  lastRequestTime = Date.now();
}

// ── Token budget (resets monthly) ───────────────────────────────
const MONTHLY_LIMIT = 300_000;
let tokenUsage = { input: 0, output: 0, monthStart: Date.now() };

function resetBudgetIfNeeded() {
  const now = Date.now();
  const msSinceMonthStart = now - tokenUsage.monthStart;
  if (msSinceMonthStart > 30 * 24 * 60 * 60 * 1000) {
    tokenUsage = { input: 0, output: 0, monthStart: now };
  }
}

function checkBudget(estimatedTokens) {
  resetBudgetIfNeeded();
  const total = tokenUsage.input + tokenUsage.output;
  if (total + estimatedTokens > MONTHLY_LIMIT) {
    throw Object.assign(
      new Error(`Lite plan token limit (${MONTHLY_LIMIT.toLocaleString()}/month) nearly reached. Upgrade your plan to continue.`),
      { statusCode: 429 }
    );
  }
}

function trackTokens(inputTokens, outputTokens) {
  resetBudgetIfNeeded();
  tokenUsage.input += inputTokens;
  tokenUsage.output += outputTokens;
}

// ── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Helpers ──────────────────────────────────────────────────────
function parseModelResponse(text) {
  const trimmed = text.trim();

  // Strategy 1: extract JSON from a ```json or ``` code block
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* fall through */ }
  }

  // Strategy 2: strip <think>...</think> tags then scan for the last valid JSON
  const noThink = trimmed.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Strategy 3: collect all properly balanced {…} blocks, try from rightmost first.
  // Reasoning text often contains stray braces — walking right-to-left picks the final answer.
  const candidates = [];
  let depth = 0, start = -1;
  for (let i = 0; i < noThink.length; i++) {
    const ch = noThink[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        candidates.push(noThink.slice(start, i + 1));
        start = -1;
      }
    }
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        console.log('[server] parseModelResponse: extracted JSON from rightmost block');
        return parsed;
      }
    } catch { /* try the next block */ }
  }

  // Fallback: conversational reply, no structured outfits
  console.warn('[server] Model response was not valid JSON, wrapping as plain reply');
  const reply = noThink || text;
  return { reply, outfits: [] };
}

// Approximate token count: ~4 chars per token for English
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

// ── Product + image search enrichment ────────────────────────────
async function enrichOutfits(outfits, originalImage) {
  if (!SERPER_API_KEY || !outfits || outfits.length === 0) return outfits;

  const allTags = [...new Set(outfits.flatMap((o) => o.tags || []))];

  const hasOriginal = !!originalImage;

  const [webResults, imageResults] = await Promise.all([
    // Web search per tag (for product links)
    allTags.length > 0
      ? Promise.allSettled(allTags.map((tag) => searchWeb(tag)))
      : [],
    // Image search per outfit — skip if we have an original garment image to use instead
    !hasOriginal
      ? Promise.allSettled(
          outfits.map((o) => {
            const query = [o.name, ...(o.tags || []).slice(0, 2), 'outfit']
              .filter(Boolean)
              .join(' ');
            console.log('[serper] Image query for', `"${o.name}":`, query);
            return searchImages(query);
          })
        )
      : Promise.resolve([]),
  ]);

  // Map web results to tags → products
  const tagResults = {};
  for (let i = 0; i < allTags.length; i++) {
    const tag = allTags[i];
    const settled = webResults[i];
    if (settled?.status === 'fulfilled') {
      const data = settled.value;
      tagResults[tag] = (data.organic || []).slice(0, 3).map((r) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
      }));
    } else {
      console.warn(`[serper] Web search failed for "${tag}":`, settled?.reason?.message);
      tagResults[tag] = [];
    }
  }

  // Map image results to outfits → imageUrl + allImages (fallback list)
  return outfits.map((o, idx) => {
    let imageUrl = o.imageUrl || '';
    let allImages = [];

    if (hasOriginal) {
      // Use the original uploaded garment image as the outfit image
      imageUrl = originalImage;
    } else if (imageResults[idx]?.status === 'fulfilled') {
      const data = imageResults[idx].value;
      const images = data.images || [];
      if (images.length > 0) {
        const first = images[0];
        console.log(`[serper-image] Outfit "${o.name}" — available fields:`, JSON.stringify({ imageUrl: first.imageUrl?.slice(0,80), link: first.link?.slice(0,80), source: first.source, sourceUrl: first.sourceUrl, original: first.original, title: first.title }));
        imageUrl = first.imageUrl || first.link || imageUrl;
        // Collect up to 5 valid image URLs for onError fallback
        allImages = images.slice(0, 5).map((img) => img.imageUrl || img.link).filter(Boolean);
      } else {
        console.warn(`[serper] No images found for outfit "${o.name}"`);
      }
    } else if (imageResults[idx]) {
      console.warn(`[serper] Image search failed for "${o.name}":`, imageResults[idx]?.reason?.message);
    }
    console.log(`[serper-image] Final imageUrl for "${o.name}":`, imageUrl?.slice(0, 100));

    return {
      ...o,
      imageUrl,
      allImages: hasOriginal ? [] : allImages,
      products: (o.tags || []).flatMap((tag) => tagResults[tag] || []).slice(0, 6),
    };
  });
}

/**
 * Search Serper images for each item name, returning { itemName: { imageUrl, allImages[] } }
 */
async function searchImagesForItems(items) {
  if (!SERPER_API_KEY || !items || items.length === 0) return {};
  const results = await Promise.allSettled(
    items.map((item) => {
      console.log('[serper-item] Searching image for:', item);
      return searchImages(item);
    })
  );
  const imageMap = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const settled = results[i];
    if (settled?.status === 'fulfilled') {
      const images = (settled.value.images || []).slice(0, 5);
      const allImages = images.map((img) => img.imageUrl || img.link).filter(Boolean);
      imageMap[item] = {
        imageUrl: allImages[0] || '',
        allImages,
      };
    } else {
      console.warn(`[serper-item] Image search failed for "${item}":`, settled?.reason?.message);
      imageMap[item] = { imageUrl: '', allImages: [] };
    }
  }
  return imageMap;
}

/**
 * Parse a complement-only model response (expects a JSON array).
 * Falls back to text reply if parsing fails.
 */
function parseComplementResponse(text) {
  const trimmed = text.trim();
  // Try extracting from a ```json fence first
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { complements: parsed };
    }
  } catch { /* fall through */ }
  // Try the raw text as a fallback reply
  return { reply: trimmed, complements: [] };
}

/**
 * Parse a text-only styling request into a structured anchor.
 * Returns { type, color, length, material, style } or null on failure.
 */
async function parseTextAnchor(userMessage) {
  const systemPrompt = `Extract the clothing item and its exact attributes from the user's request.

Respond with ONLY valid JSON — no other text, no explanation:
{
  "type": "the clothing type (e.g. dress, shirt, pants, jacket, skirt, etc.)",
  "color": "exact color the user specified — preserve modifiers (e.g. 'dark green' NOT 'green', 'navy blue' NOT 'blue')",
  "length": "length if mentioned (e.g. short, long, midi, knee-length, cropped)",
  "material": "material if mentioned (e.g. cotton, silk, denim, linen, wool, leather)",
  "style": "style if mentioned (e.g. casual, formal, sporty, vintage, bohemian, minimalist)"
}

Rules:
- ONLY include fields the user EXPLICITLY mentioned. Leave others as null.
- Preserve EXACT wording for color/attributes. 'dark green' must stay 'dark green'.
- If the user describes multiple items, extract the PRIMARY / main item they want to style.
- If no clothing item is described at all, respond with { "type": null, "color": null, "length": null, "material": null, "style": null }`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    const result = await chat({
      apiKey: GROQ_API_KEY,
      url: '',
      projectId: '',
      modelId: MODEL,
      messages,
      parameters: { temperature: 0.1, max_tokens: 200 },
    });
    const raw = result.choices?.[0]?.message?.content ?? '';
    console.log('[parseTextAnchor] Raw:', raw.slice(0, 300));
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.type) {
      return parsed;
    }
    return null; // no clothing item detected
  } catch (err) {
    console.warn('[parseTextAnchor] Failed:', err.message);
    return null;
  }
}

/**
 * Search Serper image for an anchor item and return the best image URL + fallbacks.
 */
async function searchAnchorImage(searchQuery) {
  if (!SERPER_API_KEY || !searchQuery) return { imageUrl: '', allImages: [] };
  try {
    const data = await searchImages(searchQuery);
    const images = (data.images || []).slice(0, 5);
    const allImages = images.map((img) => img.imageUrl || img.link).filter(Boolean);
    return { imageUrl: allImages[0] || '', allImages };
  } catch (err) {
    console.warn('[searchAnchorImage] Failed:', err.message);
    return { imageUrl: '', allImages: [] };
  }
}

// ── Routes ───────────────────────────────────────────────────────

/**
 * POST /api/v1/chat
 * Rate-limited: 1 concurrent request, 600ms cooldown between requests.
 * Retries watsonx 429s with exponential backoff + jitter.
 * Tracks token budget against Lite 300K/month limit.
 */
app.post('/api/v1/chat', async (req, res) => {
  try {
    await acquireSlot();
  } catch (err) {
    return res.status(err.statusCode || 429).json({ error: err.message });
  }

  try {
    const { message, anchor, previousComplements = [] } = req.body;
    console.log('[Complement] Received:', JSON.stringify({ message: message?.slice(0, 60), anchor, previousComplementsLen: previousComplements.length }));
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    let replyText = '';
    let complements = [];
    let textDerivedAnchor = null;
    let textAnchorImage = '';

    if (anchor && anchor.type) {
      // ── Complement-only mode: model generates only 3 complementary items ──
      const systemPrompt = COMPLEMENT_ONLY_PROMPT(anchor, previousComplements);
      const userPrompt = message;

      const estimatedPromptTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt);
      checkBudget(estimatedPromptTokens + 500);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      console.log('[Complement] Prompt sent to model:', JSON.stringify(messages));

      const result = await chat({
        apiKey: GROQ_API_KEY,
        url: '',
        projectId: '',
        modelId: MODEL,
        messages,
        parameters: { temperature: 0.3 },
      });

      replyText = result.choices?.[0]?.message?.content ?? '';
      console.log('[Complement] Raw model response:', replyText);

      const parsed = parseComplementResponse(replyText);
      if (parsed.complements && parsed.complements.length > 0) {
        // Replace raw JSON reply with a conversational message
        replyText = parsed.reply || `Here are some items that pair well with your ${anchor.color} ${anchor.type}:`;
        // Search images for each complement item
        const itemNames = parsed.complements.map((c) => c.item);
        const imageMap = await searchImagesForItems(itemNames);
        complements = parsed.complements.map((c) => ({
          ...c,
          ...(imageMap[c.item] || { imageUrl: '', allImages: [] }),
        }));
      }

      const inputTokens = result.usage?.prompt_tokens ?? estimatedPromptTokens;
      const outputTokens = result.usage?.completion_tokens ?? estimateTokens(replyText);
      trackTokens(inputTokens, outputTokens);
    } else {
      // ── No anchor provided — try to parse as a text-based styling request ──
      textDerivedAnchor = await parseTextAnchor(message);

      if (textDerivedAnchor && textDerivedAnchor.type) {
        // Build a description from available attributes
        const parts = [textDerivedAnchor.color, textDerivedAnchor.length, textDerivedAnchor.material, textDerivedAnchor.style, textDerivedAnchor.type].filter(Boolean);
        const description = parts.join(' ');
        const searchQuery = description || textDerivedAnchor.type;

        // Fetch an image for the anchor item
        const imgResult = await searchAnchorImage(searchQuery);
        textAnchorImage = imgResult.imageUrl;

        // Build anchor for the frontend + prompt
        const anchorForPrompt = {
          type: textDerivedAnchor.type,
          color: textDerivedAnchor.color || '',
          description,
        };

        // Run complement-only generation
        const systemPrompt = COMPLEMENT_ONLY_PROMPT(anchorForPrompt, previousComplements);
        const estimatedPromptTokens = estimateTokens(systemPrompt) + estimateTokens(message);
        checkBudget(estimatedPromptTokens + 500);

        const result = await chat({
          apiKey: GROQ_API_KEY,
          url: '',
          projectId: '',
          modelId: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          parameters: { temperature: 0.3 },
        });

        replyText = result.choices?.[0]?.message?.content ?? '';
        console.log('[TextAnchor] Raw model response:', replyText);

        const parsed = parseComplementResponse(replyText);
        if (parsed.complements && parsed.complements.length > 0) {
          // Replace raw JSON reply with a conversational message
          replyText = parsed.reply || `Here are some items that pair well with your ${textDerivedAnchor.color} ${textDerivedAnchor.type}:`;
          const itemNames = parsed.complements.map((c) => c.item);
          const imageMap = await searchImagesForItems(itemNames);
          complements = parsed.complements.map((c) => ({
            ...c,
            ...(imageMap[c.item] || { imageUrl: '', allImages: [] }),
          }));
        }

        const inputTokens = result.usage?.prompt_tokens ?? estimatedPromptTokens;
        const outputTokens = result.usage?.completion_tokens ?? estimateTokens(replyText);
        trackTokens(inputTokens, outputTokens);

        // Return anchor info so the frontend can store + display it
        return res.json({
          reply: replyText,
          complements,
          anchor: { type: textDerivedAnchor.type, color: textDerivedAnchor.color || '', description },
          anchorImage: textAnchorImage,
        });
      }

      // ── Text styling request — generate anchor + 3 complements ──
      const systemPrompt = TEXT_STYLING_PROMPT;
      const estimatedPromptTokens = estimateTokens(systemPrompt) + estimateTokens(message);
      checkBudget(estimatedPromptTokens + 500);

      const result = await chat({
        apiKey: GROQ_API_KEY,
        url: '',
        projectId: '',
        modelId: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });

      replyText = result.choices?.[0]?.message?.content ?? '';
      const parsed = parseModelResponse(replyText);

      const inputTokens = result.usage?.prompt_tokens ?? estimatedPromptTokens;
      const outputTokens = result.usage?.completion_tokens ?? estimateTokens(replyText);
      trackTokens(inputTokens, outputTokens);

      // If model returned a structured anchor + complements, enrich with images
      if (parsed && parsed.anchor && parsed.anchor.type) {
        const searchQuery = `${parsed.anchor.color} ${parsed.anchor.type}`.trim();
        const imgResult = await searchAnchorImage(searchQuery);
        const anchorImage = imgResult.imageUrl;

        const itemNames = (parsed.complements || []).map((c) => c.item).filter(Boolean);
        let imageMap = {};
        if (itemNames.length > 0) {
          imageMap = await searchImagesForItems(itemNames);
        }
        const complements = (parsed.complements || []).map((c) => {
          const enriched = imageMap[c.item] || {};
          return {
            ...c,
            imageUrl: enriched.imageUrl || '',
            allImages: enriched.allImages || [],
          };
        });

        return res.json({
          reply: parsed.reply || '',
          complements: complements.map((c) => {
            if (!c.imageUrl) {
              const seed = c.item.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              c.imageUrl = `https://picsum.photos/seed/${seed}/600/800`;
            }
            return c;
          }),
          anchor: parsed.anchor,
          anchorImage,
        });
      }

      // Fallback: casual conversation — no styling intent
      return res.json({ reply: parsed?.reply || replyText, anchor: null, complements: [] });
    }

    // Fallback: picsum for any complement without an image
    complements = complements.map((c) => {
      if (!c.imageUrl) {
        const seed = c.item.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        c.imageUrl = `https://picsum.photos/seed/${seed}/600/800`;
      }
      return c;
    });

    res.json({ reply: replyText, complements });
  } catch (err) {
    console.error('[/api/v1/chat] Error:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  } finally {
    releaseSlot();
  }
});

/**
 * POST /api/v1/analyze
 * Multipart form: image (file), prompt? (string)
 */
app.post('/api/v1/analyze', upload.single('image'), async (req, res) => {
  try {
    await acquireSlot();
  } catch (err) {
    return res.status(err.statusCode || 429).json({ error: err.message });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'image file is required' });
    }

    console.log('[step2] Multer received file:', { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const prompt = req.body.prompt || '';
    console.log('[step3] Image prepared for vision API:', { mimeType, base64Length: base64Image.length, prompt, model: VISION_MODEL });

    const estimatedTokens = estimateTokens(prompt) + Math.ceil(base64Image.length / 500);
    checkBudget(estimatedTokens + 500);

    const result = await analyzeImage({
      apiKey: GROQ_API_KEY,
      url: '',
      projectId: '',
      modelId: VISION_MODEL,
      base64Image,
      mimeType,
      prompt: prompt || undefined,
      systemPrompt: STYLIST_SYSTEM_PROMPT,
    });

    const replyText = result.choices?.[0]?.message?.content ?? '';
    console.log('[step5b] Groq raw reply length:', replyText.length);
    const parsed = parseModelResponse(replyText);
    console.log('[step6] Parsed model response:', JSON.stringify({ reply: parsed.reply?.slice(0, 100), garment: parsed.garment, outfitCount: parsed.outfits?.length }));

    const inputTokens = result.usage?.prompt_tokens ?? estimatedTokens;
    const outputTokens = result.usage?.completion_tokens ?? estimateTokens(replyText);
    trackTokens(inputTokens, outputTokens);

    const dataUri = `data:${mimeType};base64,${base64Image}`;
    if (parsed.outfits) {
      parsed.outfits = await enrichOutfits(parsed.outfits);
      console.log('[step6b] Outfits after enrichment:', parsed.outfits.map((o) => ({ name: o.name, imageUrl: (o.imageUrl || '').slice(0, 80), productCount: o.products?.length })));
      // Fall back to the uploaded image only when Serper returned nothing
      parsed.outfits = parsed.outfits.map((o) => ({
        ...o,
        imageUrl: o.imageUrl && o.imageUrl.trim() !== '' ? o.imageUrl : dataUri,
        garmentImage: dataUri,
      }));

      // Also search images per UNIQUE tag for the initial complement display
      const allTags = [...new Set(parsed.outfits.flatMap((o) => o.tags || []))];
      const imageMap = await searchImagesForItems(allTags);
      parsed.tagImages = imageMap;
    }

    parsed.originalImage = dataUri;

    console.log('[step6c] Final response keys:', Object.keys(parsed).join(', '), '| hasOriginalImage:', !!parsed.originalImage, '| hasTagImages:', !!parsed.tagImages, '| tagImageKeys:', parsed.tagImages ? Object.keys(parsed.tagImages).join(',') : 'none');
    res.json(parsed);
  } catch (err) {
    console.error('[/api/v1/analyze] Error:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  } finally {
    releaseSlot();
  }
});

// ── Health check with token usage ────────────────────────────────
app.get('/api/health', (_req, res) => {
  resetBudgetIfNeeded();
  const total = tokenUsage.input + tokenUsage.output;
  res.json({
    status: 'ok',
    provider: 'groq',
    model: MODEL,
    visionModel: VISION_MODEL,
    tokenUsage: {
      input: tokenUsage.input,
      output: tokenUsage.output,
      total,
      limit: MONTHLY_LIMIT,
      remaining: MONTHLY_LIMIT - total,
      percentUsed: Math.round((total / MONTHLY_LIMIT) * 100),
    },
  });
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Charm server running on http://localhost:${PORT}`);
  console.log(`   Provider: Groq`);
  console.log(`   Model: ${MODEL}`);
  console.log(`   Vision: ${VISION_MODEL}`);
  console.log(`   Rate limit: 1 concurrent request, 600ms cooldown`);
  console.log(`   Token budget: ${MONTHLY_LIMIT.toLocaleString()}/month (Lite plan)`);
});
