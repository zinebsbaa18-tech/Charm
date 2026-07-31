const GROQ_BASE = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function getIAMToken(apiKey) {
  return apiKey;
}

export async function chat({ apiKey, modelId, messages, parameters }) {
  const body = {
    model: modelId,
    messages: messages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    max_tokens: parameters?.max_tokens ?? 4096,
    temperature: parameters?.temperature ?? 0.7,
    top_p: parameters?.top_p ?? 0.95,
  };

  const res = await fetchWithTimeout(
    `${GROQ_BASE}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Groq API error (${res.status}): ${text}`), { statusCode: res.status });
  }

  const json = await res.json();
  const msg = json.choices?.[0]?.message ?? {};
  const thinkingText = msg.thinking ?? '';
  if (thinkingText) {
    console.log('[chat-thinking] Groq thinking block (discarded):', thinkingText.slice(0, 500));
  }
  return json;
}

export async function analyzeImage({ apiKey, modelId, base64Image, mimeType, prompt, systemPrompt }) {
  const imageModel = modelId;

  const userContent = [
    {
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64Image}` },
    },
    { type: 'text', text: prompt || 'Analyze this garment and suggest outfits.' },
  ];

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  const body = {
    model: imageModel,
    messages,
    max_tokens: 4096,
    temperature: 0.7,
    reasoning_format: 'hidden',
  };

  console.log('[step4] Sending to Groq vision API:', { model: imageModel, base64Length: base64Image.length, mimeType, prompt: prompt || '(default)', reasoning_format: 'hidden' });

  const res = await fetchWithTimeout(
    `${GROQ_BASE}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text();
    console.log('[step4] Groq vision API FAILED:', { status: res.status, body: text });
    throw Object.assign(new Error(`Groq vision API error (${res.status}): ${text}`), { statusCode: res.status });
  }

  const json = await res.json();
  const msg = json.choices?.[0]?.message ?? {};
  const replyText = msg.content ?? '';
  const thinkingText = msg.thinking ?? '';
  if (thinkingText) {
    console.log('[step5-thinking] Groq vision thinking block (discarded):', thinkingText.slice(0, 500));
  }
  console.log('[step5] Groq vision content:', replyText.slice(0, 500));
  return json;
}
