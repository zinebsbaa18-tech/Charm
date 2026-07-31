/**
 * Thin wrapper around fetch for the Charm backend API.
 * Automatically attaches the Firebase Auth ID token.
 */
import { auth } from './firebase/config';

const BASE = import.meta.env.VITE_API_URL ?? '';

const AUTH_TIMEOUT_MS  = 8000;
const FETCH_TIMEOUT_MS = 15000;
const CHAT_TIMEOUT_MS  = 45000; // Gemini + up to ~15 SerpAPI searches can exceed 15s

/**
 * Waits for Firebase Auth to restore the session, then returns the ID token.
 * auth.currentUser is null for a brief moment after page load - this resolves it.
 * Times out instead of hanging forever if auth state never resolves.
 */
function getToken() {
  return new Promise((resolve, reject) => {
    let settled = false;
    let unsub = null;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (unsub) unsub();
      reject(new Error('Auth timed out - check your connection and try again.'));
    }, AUTH_TIMEOUT_MS);

    const finish = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(val);
    };

    // If user is already available (subsequent calls), fast-path
    if (auth.currentUser) {
      auth.currentUser.getIdToken()
        .then((token) => finish(resolve, token))
        .catch((err) => finish(reject, err));
      return;
    }

    // Otherwise wait for the auth state to be restored (one-time)
    unsub = auth.onAuthStateChanged((user) => {
      if (unsub) unsub();
      if (user) {
        user.getIdToken()
          .then((token) => finish(resolve, token))
          .catch((err) => finish(reject, err));
      } else {
        finish(reject, new Error('Not authenticated'));
      }
    });
  });
}

/**
 * Wraps fetch with a timeout so requests fail fast instead of hanging
 * indefinitely on a stalled connection.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send a text message to the AI stylist.
 * @param {string} message
 * @param {object} [anchor] - { type, color, description, image } from the original upload
 * @param {string[]} [previousComplements] - item names already suggested, to avoid repeats
 */
export async function sendChat(message, anchor = null, previousComplements = []) {
  const body = { message, anchor, previousComplements };
  console.log('[sendChat] Payload:', JSON.stringify({ message: message?.slice(0, 60), anchor, previousComplementsLen: previousComplements.length }));
  const token = await getToken();
  const res   = await fetchWithTimeout(`${BASE}/api/v1/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify(body),
  }, CHAT_TIMEOUT_MS);
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  return res.json(); // { reply, complements: [{ item, category, reason, imageUrl, allImages }] }
}

/**
 * Upload an image file for vision analysis.
 * @param {File} file
 * @param {string} [prompt] - Optional accompanying text
 */
export async function analyzeImage(file, prompt = '') {
  const token   = await getToken();
  console.log('[step1] analyzeImage called', { name: file?.name, size: file?.size, type: file?.type, prompt, hasToken: !!token });

  const form    = new FormData();
  form.append('image', file);
  if (prompt) form.append('prompt', prompt);

  const res = await fetchWithTimeout(`${BASE}/api/v1/analyze`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  }, 30000); // longer timeout for image upload/analysis
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.log('[step1] analyzeImage FAILED', { status: res.status, body: text });
    throw new Error(`Analyze API error: ${res.status}`);
  }
  const data = await res.json();
  console.log('[step7] analyzeImage response:', JSON.stringify(data, null, 2).slice(0, 1000));
  return data; // { garment, outfits[] }
}
