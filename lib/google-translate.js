export const GOOGLE_TRANSLATE_BASE = 'https://translate.google.co.in/';
export const GOOGLE_MODES = Object.freeze({
  text: 'translate',
  images: 'images',
  documents: 'docs',
  websites: 'websites',
});
export const MAX_TRANSLATE_URL_LENGTH = 7500;

export function buildGoogleTranslateUrl({mode = 'text', source = 'auto', target = 'ta', text = ''} = {}) {
  if (!Object.hasOwn(GOOGLE_MODES, mode)) throw new RangeError('Unsupported Google Translate mode');
  if (!/^(auto|[a-z]{2,3}(?:-[a-z]{2,4})?)$/i.test(source) || !/^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(target)) {
    throw new RangeError('Invalid translation language');
  }
  const url = new URL(GOOGLE_TRANSLATE_BASE);
  url.searchParams.set('sl', source);
  url.searchParams.set('tl', target);
  url.searchParams.set('op', GOOGLE_MODES[mode]);
  if (mode === 'text' && text) url.searchParams.set('text', text);
  return url.toString();
}

export function getTextHandoff({source = 'auto', target = 'ta', text = ''} = {}) {
  const trimmed = String(text).trim();
  const link = buildGoogleTranslateUrl({mode: 'text', source, target, text: trimmed});
  const canPrefill = link.length <= MAX_TRANSLATE_URL_LENGTH;
  return {
    url: canPrefill ? link : buildGoogleTranslateUrl({mode: 'text', source, target}),
    canPrefill,
    needsManualPaste: !canPrefill,
  };
}
