const TEXT_LIMIT = 10000;
const IMAGE_MAX_BYTES = 2_000_000;
const LANGUAGES = new Set(['auto', 'en', 'ta', 'hi', 'ml', 'te']);

function reply(data, status, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
    ...(origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    } : {}),
  };
  return new Response(JSON.stringify(data), { status, headers });
}

function error(message, status, origin) { return reply({error: message}, status, origin); }

function normalizedError(response, fallback) {
  return response?.error?.message ? String(response.error.message).slice(0, 230) : fallback;
}

function decodeHtmlEntities(value) {
  return String(value).replace(/&(#(?:x[\da-f]+|\d+)|amp|quot|apos|lt|gt|#39);/gi, (_, entity) => {
    const lower = entity.toLowerCase();
    const named = {amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', '#39': "'"};
    if (lower in named) return named[lower];
    const number = Number.parseInt(lower.startsWith('#x') ? lower.slice(2) : lower.slice(1), lower.startsWith('#x') ? 16 : 10);
    return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff) ? String.fromCodePoint(number) : '&' + entity + ';';
  });
}

async function googlePost(url, key, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json; charset=utf-8', 'X-goog-api-key': key},
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  let json;
  try { json = await response.json(); } catch { throw new Error('Google returned an invalid response.'); }
  if (!response.ok) throw new Error(normalizedError(json, 'Google API request failed.'));
  return json;
}

async function translate(text, source, target, apiKey) {
  const body = {q: text, target, format: 'text'};
  if (source !== 'auto') body.source = source;
  const result = await googlePost('https://translation.googleapis.com/language/translate/v2', apiKey, body);
  const translation = result?.data?.translations?.[0];
  if (!translation || typeof translation.translatedText !== 'string') throw new Error('No translation was returned by Google.');
  return {translatedText: decodeHtmlEntities(translation.translatedText), detectedSourceLanguage: translation.detectedSourceLanguage || source};
}

async function recognizeImage(imageBase64, apiKey) {
  const json = await googlePost('https://vision.googleapis.com/v1/images:annotate', apiKey, {
    requests: [{image: {content: imageBase64}, features: [{type: 'DOCUMENT_TEXT_DETECTION'}]}],
  });
  if (json?.responses?.[0]?.error) throw new Error(normalizedError(json.responses[0], 'Image recognition failed.'));
  return json?.responses?.[0]?.fullTextAnnotation?.text || json?.responses?.[0]?.textAnnotations?.[0]?.description || '';
}

export default {
  async fetch(request, env) {
    const permitted = env.ALLOWED_ORIGIN || 'https://jayasuryamahadevan.github.io';
    const requestOrigin = request.headers.get('Origin');
    const origin = requestOrigin === permitted ? permitted : null;
    const pathname = new URL(request.url).pathname;
    if (pathname !== '/translate') return error('Not found.', 404, origin);
    if (requestOrigin && !origin) return error('Origin not allowed.', 403, null);
    if (request.method === 'OPTIONS') return origin ? new Response(null, {status: 204, headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    }}) : error('Origin not allowed.', 403, null);
    if (request.method !== 'POST') return error('Only POST is supported.', 405, origin);
    if (!origin) return error('Browser origin required.', 403, null);
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return error('Expected JSON.', 415, origin);
    if (!env.GOOGLE_API_KEY) return error('Translation API is not configured by the site owner.', 503, origin);
    const size = Number(request.headers.get('Content-Length') || 0);
    if (size > 3_000_000) return error('Request is too large.', 413, origin);
    let body;
    try {
      const raw = await request.text();
      if (raw.length > 3_000_000) return error('Request is too large.', 413, origin);
      body = JSON.parse(raw);
    } catch { return error('Malformed JSON request.', 400, origin); }
    const {kind, source, target} = body || {};
    if (!['text', 'image'].includes(kind) || !LANGUAGES.has(source) || !LANGUAGES.has(target) || target === 'auto' || target === source) {
      return error('Unsupported mode or language selection.', 400, origin);
    }
    if (kind === 'text' && (typeof body.text !== 'string' || !body.text.trim() || Array.from(body.text).length > TEXT_LIMIT)) {
      return error('Provide 1–10,000 characters of text.', 400, origin);
    }
    if (kind === 'image' && (typeof body.imageBase64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.imageBase64) || body.imageBase64.length > Math.ceil(IMAGE_MAX_BYTES * 4 / 3) + 16)) {
      return error('Provide a valid image under 2 MB.', 400, origin);
    }
    if (!env.TRANSLATE_RATE_LIMIT) return error('Rate limiter is not configured.', 503, origin);
    const limiterKey = request.headers.get('CF-Connecting-IP') || 'unknown-client';
    const {success} = await env.TRANSLATE_RATE_LIMIT.limit({key: limiterKey});
    if (!success) return error('Too many translation requests. Try again later.', 429, origin);
    try {
      const text = kind === 'image' ? await recognizeImage(body.imageBase64, env.GOOGLE_API_KEY) : body.text;
      if (!text.trim()) return error('No readable text was found.', 422, origin);
      if (Array.from(text).length > TEXT_LIMIT) return error('Recognized text exceeds 10,000 characters. Use a smaller image.', 413, origin);
      const result = await translate(text, source, target, env.GOOGLE_API_KEY);
      return reply({sourceText: text, ...result}, 200, origin);
    } catch (err) {
      if (err?.name === 'TimeoutError') return error('Google did not respond in time. Try again.', 504, origin);
      return error(err instanceof Error ? err.message : 'Translation failed.', 502, origin);
    }
  },
};
