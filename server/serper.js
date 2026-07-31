const SERPER_BASE = 'https://google.serper.dev';
const TIMEOUT_MS = 10000;

async function fetchSerper(endpoint, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SERPER_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Serper.dev error (${res.status}): ${text}`);
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Serper.dev timeout for query: ${query}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchWeb(query) {
  return fetchSerper('/search', query);
}

export async function searchImages(query) {
  return fetchSerper('/images', query);
}
