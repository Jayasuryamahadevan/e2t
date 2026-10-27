export const MAX_TEXT_LENGTH = 10000;
export const MAX_IMAGE_BYTES = 2_000_000;
export const LANGUAGES = Object.freeze(['auto', 'en', 'ta', 'hi', 'ml', 'te']);

export function validateEndpoint(value) {
  const input = String(value || '').trim();
  if (!input) throw new Error('Enter the URL of your deployed translation API first.');
  let parsed;
  try { parsed = new URL(input); } catch { throw new Error('Enter a valid translation API URL.'); }
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('Use an HTTPS API URL (HTTP is only supported on localhost).');
  }
  if (parsed.username || parsed.password || parsed.hash || parsed.search) throw new Error('Use a plain API endpoint URL without credentials, query parameters, or fragments.');
  return parsed.toString();
}

export function validateLanguages(source, target) {
  if (!LANGUAGES.includes(source) || !LANGUAGES.includes(target) || target === 'auto') throw new Error('Choose a supported language.');
  if (source === target) throw new Error('Source and target languages must be different.');
}

export function validateText(text) {
  if (!String(text || '').trim()) throw new Error('Enter some text to translate.');
  if (Array.from(text).length > MAX_TEXT_LENGTH) throw new Error(`Text exceeds ${MAX_TEXT_LENGTH.toLocaleString()} characters. Split it into smaller sections.`);
}

export async function translateRequest({endpoint, source = 'auto', target = 'ta', text, imageBase64, signal, fetcher = fetch}) {
  const url = validateEndpoint(endpoint);
  validateLanguages(source, target);
  const kind = imageBase64 ? 'image' : 'text';
  if (kind === 'text') validateText(text);
  if (kind === 'image' && (typeof imageBase64 !== 'string' || imageBase64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 16)) throw new Error('Image is too large; select an image under 2 MB.');
  let response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({kind, source, target, ...(kind === 'text' ? {text} : {imageBase64})}),
      signal,
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error('Could not connect to the translation API. Check the endpoint and its CORS configuration.');
  }
  let result;
  try { result = await response.json(); } catch { throw new Error('The translation API returned invalid JSON.'); }
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : `Translation failed (HTTP ${response.status}).`);
  if (typeof result?.translatedText !== 'string') throw new Error('The translation API did not return translatedText.');
  return {
    translatedText: result.translatedText,
    sourceText: typeof result.sourceText === 'string' ? result.sourceText : (text || ''),
    detectedSourceLanguage: result.detectedSourceLanguage || source,
  };
}

export async function imageToBase64(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 2 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const slice = 32768;
  for (let i = 0; i < bytes.length; i += slice) binary += String.fromCharCode(...bytes.subarray(i, i + slice));
  return btoa(binary);
}
