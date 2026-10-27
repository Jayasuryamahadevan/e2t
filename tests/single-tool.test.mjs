import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const app = read('app.js');
const css = read('styles.css');
const sw = read('sw.js');

test('only the Tanglish editor and document export features are exposed', () => {
  assert.match(html, /id="editor"/);
  assert.match(html, /id="download-docx"/);
  assert.match(html, /id="download-pdf"/);
  assert.match(html, /id="download-txt"/);
  assert.match(html, /Press <strong>Space<\/strong>/);
  for (const value of ['provider-panel', 'google-panel', 'tool-navigation', 'mode-direct', 'mode-phonetic', '<iframe', 'translate.google', 'deshkeyboard', 'easytamiltyping']) {
    assert.ok(!html.includes(value), 'Unexpected removed UI component: ' + value);
  }
});

test('all processing stays inside the static writer', () => {
  assert.match(app, /findTanglishWordToCommit/);
  assert.match(app, /createDocx/);
  assert.match(app, /window\.print\(\)/);
  for (const value of ['fetch(', 'google-', 'provider-', 'translation-api', 'document-reader', 'workers.dev', 'renderRoute']) {
    assert.ok(!app.includes(value), 'Unexpected remote dependency: ' + value);
  }
  assert.ok(!css.includes('.google-panel'));
  assert.ok(!css.includes('.provider-panel'));
  assert.ok(!sw.includes('translation-api'));
  assert.ok(!sw.includes('document-reader'));
});
