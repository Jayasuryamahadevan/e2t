import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('provider routes are explicit, HTTPS, and distinct from the native editor', () => {
  for (const route of ['writer', 'desh', 'translate']) assert.match(html, new RegExp('data-route="' + route + '"'));
  assert.match(js, /https:\/\/www\.deshkeyboard\.com\/tamil-typing\//);
  assert.match(js, /https:\/\/www\.easytamiltyping\.com\/english\/to\/tamil\/translation/);
  assert.match(js, /window\.addEventListener\('hashchange', renderRoute\)/);
});

test('external tools have official-site fallback and user-mediated text transfer', () => {
  assert.match(html, /id="provider-external"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/);
  assert.match(html, /id="provider-copy"/);
  assert.match(html, /id="provider-paste"/);
  assert.match(js, /navigator\.clipboard\.readText/);
  assert.match(js, /window\.location\.hash = '#writer'/);
});
