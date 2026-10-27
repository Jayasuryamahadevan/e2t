import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGoogleTranslateUrl, getTextHandoff, MAX_TRANSLATE_URL_LENGTH } from '../lib/google-translate.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('Google Translate URLs prefill text in Tamil and use text mode, not websites mode', () => {
  const message = 'We are delighted to share that SBI has been recognised as the winner.\nநன்றி! & <test>';
  const url = new URL(buildGoogleTranslateUrl({text: message}));
  assert.equal(url.origin, 'https://translate.google.co.in');
  assert.equal(url.searchParams.get('sl'), 'auto');
  assert.equal(url.searchParams.get('tl'), 'ta');
  assert.equal(url.searchParams.get('op'), 'translate');
  assert.equal(url.searchParams.get('text'), message.trim());
  assert.equal(getTextHandoff({text: message}).canPrefill, true);
});

test('Image, document, and website modes hand off to official Google UI without embedding or file exfiltration', () => {
  for (const [mode, op] of Object.entries({images: 'images', documents: 'docs', websites: 'websites'})) {
    const url = new URL(buildGoogleTranslateUrl({mode, source: 'en', target: 'ta'}));
    assert.equal(url.searchParams.get('op'), op);
    assert.equal(url.searchParams.has('text'), false);
    assert.match(html, new RegExp('id="google-open-' + mode + '"[^>]+target="_blank"[^>]+rel="noopener noreferrer"'));
  }
  assert.doesNotMatch(html, /<iframe[^>]+google/i);
  assert.match(html, /your files are uploaded directly to Google/i);
  assert.match(app, /buildGoogleTranslateUrl/);
});

test('Large source text cannot be silently truncated or auto-sent through a large URL', () => {
  const long = 'தமிழ்'.repeat(MAX_TRANSLATE_URL_LENGTH);
  const handoff = getTextHandoff({text: long});
  assert.equal(handoff.canPrefill, false);
  assert.equal(handoff.needsManualPaste, true);
  assert.equal(new URL(handoff.url).searchParams.has('text'), false);
  assert.throws(() => buildGoogleTranslateUrl({mode: 'upload'}), /Unsupported/);
  assert.throws(() => buildGoogleTranslateUrl({target: 'https://evil.example'}), /Invalid/);
});

test('Static app exposes Google route and caches URL builder for offline writer', () => {
  assert.match(html, /data-route="google"/);
  assert.match(app, /candidate === 'google'/);
  for (const mode of ['text', 'images', 'documents', 'websites']) assert.match(html, new RegExp('id="google-tab-' + mode + '"'));
  assert.match(serviceWorker, /lib\/google-translate\.js/);
  assert.match(html, /id="google-paste-result"/);
});
