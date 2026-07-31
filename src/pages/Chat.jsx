import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ChatInput from '../components/ChatInput';
import ComplementCard from '../components/ComplementCard';
import { sendChat, analyzeImage } from '../api';
import { useChats } from '../context/ChatContext';

// Strip non-serializable data (object URLs) before persisting
function serializeMessages(msgs) {
  return msgs.map((m) => {
    const serialized = {
      ...m,
      content: m.content ?? '',
    };
    if (m.type === 'image') serialized.content = '[image]';
    if (serialized.outfit === undefined) delete serialized.outfit;
    if (serialized.complements === undefined) delete serialized.complements;
    return serialized;
  });
}

export default function Chat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const { saveChat, updateChat, getChat } = useChats();
  const chatIdRef = useRef(chatId || null);

  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(false);

  // Store pending image file for cleanup
  const [pendingImageUrl, setPendingImageUrl] = useState(null);

  // Anchor: the original uploaded garment — stored once, never changed
  const anchorRef = useRef(null);

  // Previous complementary items (accumulated across rounds to avoid repeats)
  const previousComplementsRef = useRef([]);

  // Refs for reliable persist across rounds
  const allMessagesRef = useRef([]);

  // Optimistic local state protection — prevents Firestore load from
  // overwriting messages that were already set locally from the API response.
  // Incremented on every local setMessages that originates from the API.
  const localGenerationRef = useRef(0);

  // Load existing chat from Firestore on mount
  useEffect(() => {
    if (chatId) {
      (async () => {
        try {
          // Check if we have messages passed via navigation state (optimistic local data)
          const navMessages = location.state?._localMessages;
          if (navMessages && navMessages.length > 0) {
            // Use navigation state as source of truth — avoids remount flash
            setMessages(navMessages);
            const roundMsg = navMessages.find((m) => m.type === 'round');
            if (roundMsg?.anchor) {
              anchorRef.current = { ...roundMsg.anchor };
            }
            const allItems = navMessages
              .filter((m) => m.type === 'round' && m.complements)
              .flatMap((m) => m.complements.map((c) => c.item));
            if (allItems.length > 0) {
              previousComplementsRef.current = allItems;
            }
            allMessagesRef.current = navMessages;
            return;
          }

          const data = await getChat(chatId);
          if (data?.messages && data.messages.length > 0) {
            // Only apply from Firestore if we have NO local state for this chat
            // (localGenerationRef stays 0 when loading an existing chat from history)
            if (localGenerationRef.current > 0 && allMessagesRef.current.length >= data.messages.length) {
              console.log('[Chat] Skipping Firestore load — local state is newer or equal');
              return;
            }
            setMessages(data.messages);
            // Restore anchor from the first round message
            const roundMsg = data.messages.find((m) => m.type === 'round');
            if (roundMsg?.anchor) {
              anchorRef.current = { ...roundMsg.anchor };
            }
            // Restore accumulated complement names
            const allItems = data.messages
              .filter((m) => m.type === 'round' && m.complements)
              .flatMap((m) => m.complements.map((c) => c.item));
            if (allItems.length > 0) {
              previousComplementsRef.current = allItems;
            }
            allMessagesRef.current = data.messages;
          }
        } catch (err) {
          console.error('[Chat] Failed to load chat:', err);
        }
      })();
    }
  }, []); // key prop forces remount, so empty deps is safe

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up object URL when it changes
  useEffect(() => {
    return () => {
      if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
    };
  }, [pendingImageUrl]);

  // Persist the current session to Firestore (create once, update subsequent rounds)
  const persistChat = useCallback(async () => {
    const allMessages = allMessagesRef.current;
    console.log('[persistChat] messages count:', allMessages?.length);
    const userMsgs = allMessages.filter((m) => m.sender === 'user');
    console.log('[persistChat] user messages:', userMsgs.length);
    if (userMsgs.length === 0) return;
    try {
      const first = userMsgs[0];
      let title;
      if (first.type === 'text') {
        title = first.content.length > 50 ? first.content.slice(0, 50) + '...' : first.content;
      } else {
        title = 'Image chat';
      }
      const serialized = serializeMessages(allMessages);
      console.log('[persistChat] saving to Firestore, chatId:', chatIdRef.current);
      if (chatIdRef.current) {
        await updateChat(chatIdRef.current, { title, messages: serialized });
        console.log('[persistChat] updated existing chat');
      } else {
        const newId = await saveChat({ title, messages: serialized });
        chatIdRef.current = newId;
        // Pass local messages via navigation state so the remount
        // doesn't start empty or rely on a stale Firestore snapshot
        navigate(`/chat/${newId}`, {
          replace: true,
          state: { _localMessages: allMessagesRef.current },
        });
      }
    } catch (err) {
      console.error('[Chat] Failed to persist chat:', err);
    }
  }, [saveChat, updateChat, navigate]);

  // Build a round message from anchor + complements + reply
  const buildRoundMessage = (reply, complements) => ({
    id: Date.now().toString() + '-round',
    sender: 'ai',
    type: 'round',
    content: reply || '',
    anchor: anchorRef.current ? { ...anchorRef.current } : null,
    complements: (complements || []).map((c) => ({ ...c })),
  });

  // ── Fire the API call ───────────────────────────────────────────
  const fireRequest = async (input) => {
    setLoading(true);
    try {
      let newMessages = [];

      if (input.type === 'image') {
        // ── First upload: analyze image ──
        console.log('[Chat] Starting analyzeImage...');
        const data = await analyzeImage(input.file);
        console.log('[Chat] analyzeImage response:', JSON.stringify({
          hasGarment: !!data.garment,
          hasOriginalImage: !!data.originalImage,
          hasTagImages: !!data.tagImages,
          outfitCount: data.outfits?.length,
          sampleTags: data.outfits?.[0]?.tags?.slice(0, 3),
          replySnippet: data.reply?.slice(0, 60),
        }));
        const garment = data.garment || null;
        const originalImage = data.originalImage || '';

        // Store anchor once
        if (garment && originalImage) {
          anchorRef.current = {
            type: garment.type,
            color: garment.color,
            description: garment.description,
            image: originalImage,
          };
          console.log('[Chat] Anchor set:', JSON.stringify(anchorRef.current));
        } else {
          console.warn('[Chat] No anchor set — garment:', !!garment, 'originalImage:', !!originalImage);
        }

        // Extract initial complements from the first outfit's tags
        const initialComplements = [];
        if (data.tagImages && data.outfits && data.outfits.length > 0) {
          const usedTags = new Set();
          for (const outfit of data.outfits) {
            for (const tag of (outfit.tags || [])) {
              if (!usedTags.has(tag) && initialComplements.length < 3) {
                usedTags.add(tag);
                const imgInfo = data.tagImages[tag] || {};
                console.log('[Chat] Tag image info for', tag, ':', JSON.stringify({ imageUrl: (imgInfo.imageUrl || '').slice(0, 60) }));
                initialComplements.push({
                  item: tag,
                  category: 'top',
                  reason: '',
                  imageUrl: imgInfo.imageUrl || '',
                  allImages: imgInfo.allImages || [],
                });
              }
            }
          }
        }
        console.log('[Chat] Initial complements extracted:', initialComplements.length, 'items:', initialComplements.map((c) => c.item));

        // Track initial complements
        previousComplementsRef.current = [
          ...previousComplementsRef.current,
          ...initialComplements.map((c) => c.item),
        ];

        newMessages = [buildRoundMessage(data.reply || '', initialComplements)];
        console.log('[Chat] Round message created:', JSON.stringify({ type: 'round', hasAnchor: !!newMessages[0]?.anchor, complementCount: newMessages[0]?.complements?.length }));
      } else {
        // ── Follow-up text (e.g. "give me another suggestion" or plain prompt) ──
        console.log('[Chat] Starting sendChat with anchor:', !!anchorRef.current, 'prevComplements:', previousComplementsRef.current.length);
        // Only send text description — the image stays on the frontend
        const anchorText = anchorRef.current
          ? { type: anchorRef.current.type, color: anchorRef.current.color, description: anchorRef.current.description }
          : null;
        const data = await sendChat(
          input.text,
          anchorText,
          previousComplementsRef.current
        );

        if (data.anchor) {
          // ── Text-derived anchor (styling request parsed into structured anchor) ──
          console.log('[Chat] Text-derived anchor:', JSON.stringify(data.anchor), 'anchorImage:', (data.anchorImage || '').slice(0, 60));
          // Store anchor with image for display across rounds
          anchorRef.current = {
            type: data.anchor.type,
            color: data.anchor.color || '',
            description: data.anchor.description || '',
            image: data.anchorImage || '',
          };
          const complements = data.complements || [];
          if (complements.length > 0) {
            previousComplementsRef.current = [
              ...previousComplementsRef.current,
              ...complements.map((c) => c.item),
            ];
          }
          newMessages = [buildRoundMessage(data.reply || '', complements)];
        } else {
          // ── Complement flow (existing anchor from image upload or prior text styling) ──
          const complements = data.complements || [];
          console.log('[Chat] sendChat response — complements:', complements.length, 'items:', complements.map((c) => c.item));

          // Track new complements
          if (complements.length > 0) {
            previousComplementsRef.current = [
              ...previousComplementsRef.current,
              ...complements.map((c) => c.item),
            ];
          }

          newMessages = [buildRoundMessage(data.reply || '', complements)];
        }
      }

      setMessages((prev) => {
        const next = [...prev, ...newMessages];
        return next;
      });
      allMessagesRef.current = [...allMessagesRef.current, ...newMessages];
      localGenerationRef.current += 1;
      persistChat();
    } catch (err) {
      console.error('[Chat] Request failed:', err);
      const detail = err?.message || String(err) || t('errors.networkError');
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + '-err', sender: 'ai', type: 'text', content: detail },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Text message ─────────────────────────────────────────────
  const handleSend = (text) => {
    const userMsg = { id: Date.now().toString(), sender: 'user', type: 'text', content: text };
    setMessages((prev) => [...prev, userMsg]);
    allMessagesRef.current = [...allMessagesRef.current, userMsg];
    fireRequest({ type: 'text', text, userMsg });
  };

  // ── Image upload ──────────────────────────────────────────────
  const handleUpload = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setPendingImageUrl(previewUrl);
    const userMsg = { id: Date.now().toString(), sender: 'user', type: 'image', content: previewUrl };
    setMessages((prev) => [...prev, userMsg]);
    allMessagesRef.current = [...allMessagesRef.current, userMsg];
    fireRequest({ type: 'image', file, userMsg });
  };

  // ── Empty state ───────────────────────────────────────────────
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] lg:min-h-screen px-5 md:px-16 animate-fade-in">
        <div className="w-full max-w-3xl flex flex-col items-center text-center">
          <h1 className="text-display-lg md:text-display-xl font-display font-thin uppercase text-primary leading-tight mb-6 whitespace-pre-line tracking-widest">
            {t('home.hero')}
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-md mb-12">
            {t('home.heroSub')}
          </p>

          <div className="w-full">
            <ChatInput onSend={handleSend} onUpload={handleUpload} isCentered={true} />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {['Style a summer outfit', 'What goes with mustard yellow?', 'Smart casual ideas'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                className="px-4 py-2 rounded-full border border-outline-variant/50 text-label-sm text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active chat ───────────────────────────────────────────────
  const anchor = anchorRef.current;

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] lg:h-screen animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 border-b border-outline-variant/20">
        <button
          onClick={() => navigate('/chat/new')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-label-md font-semibold"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          New chat
        </button>
      </div>

      {/* Chat feed */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col gap-2 max-w-[90%] md:max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>

                {/* User text bubble */}
                {msg.sender === 'user' && msg.type === 'text' && msg.content && (
                  <div className="p-4 md:p-5 text-body-md rounded-3xl bg-primary text-on-primary rounded-br-sm">
                    {msg.content}
                  </div>
                )}

                {/* User image bubble */}
                {msg.sender === 'user' && msg.type === 'image' && (
                  <div className="rounded-[2rem] overflow-hidden border-4 border-surface shadow-mediterranean max-w-sm w-full">
                    <img src={msg.content} alt="Uploaded" className="w-full h-auto object-cover" />
                  </div>
                )}

                {/* AI message — catches round messages, plain text, and errors */}
                {msg.sender === 'ai' && (
                  <div className="w-full">
                    {/* Plain text AI (errors, old-format responses) */}
                    {msg.type === 'text' && msg.content && (
                      <div className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-3xl rounded-bl-sm px-5 py-4 shadow-sm text-body-md whitespace-pre-line">
                        {msg.content}
                      </div>
                    )}

                    {/* Structured round: anchor + complements */}
                    {msg.type === 'round' && (
                      <div className="w-full space-y-4">
                        {/* Reply text */}
                        {msg.content && (
                          <div className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-3xl rounded-bl-sm px-5 py-4 shadow-sm text-body-md whitespace-pre-line">
                            {msg.content}
                          </div>
                        )}

                        {/* Anchor card — full-size image matching complement card style */}
                        {msg.anchor && msg.anchor.image && (
                          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden med-shadow border border-outline-variant/20">
                            <div className="relative aspect-square overflow-hidden bg-surface-container">
                              <img
                                src={msg.anchor.image}
                                alt={`${msg.anchor.color} ${msg.anchor.type}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = `https://picsum.photos/seed/${encodeURIComponent(msg.anchor.description || msg.anchor.type)}/600/800`; }}
                              />
                              <div className="absolute top-2 start-2">
                                <span className="bg-surface/80 backdrop-blur-sm text-on-surface text-label-xs px-2 py-0.5 rounded-full">
                                  Anchor item
                                </span>
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="text-label-md font-semibold text-on-surface truncate">
                                {msg.anchor.color} {msg.anchor.type}
                              </p>
                              {msg.anchor.description && (
                                <p className="text-label-xs text-on-surface-variant mt-0.5 truncate">
                                  {msg.anchor.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Complementary items */}
                        {msg.complements && msg.complements.length > 0 && (
                          <div>
                            <p className="text-label-sm font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">
                              Pair with:
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                              {msg.complements.map((comp, i) => (
                                <ComplementCard
                                  key={`${comp.item}-${i}`}
                                  item={comp.item}
                                  category={comp.category}
                                  reason={comp.reason}
                                  imageUrl={comp.imageUrl}
                                  allImages={comp.allImages}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary/50 animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <ChatInput
        onSend={handleSend}
        onUpload={handleUpload}
        isCentered={false}
        disabled={loading}
      />
    </div>
  );
}
