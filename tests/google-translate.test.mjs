import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('Google route is an in-page API UI without external redirects or embedded Google pages',()=>{
  assert.match(html,/data-route="google"/);
  for(const mode of ['text','images','documents']) assert.match(html,new RegExp('id="google-tab-'+mode+'"'));
  assert.match(html,/id="google-result"/);
  assert.match(html,/id="google-insert-result"/);
  assert.match(html,/id="google-save-endpoint"/);
  assert.doesNotMatch(html, /google-open-|translate\.google\.co\.in|<iframe[^>]+google/i);
  assert.match(app,/translateRequest/);
  assert.match(sw,/translation-api\.js/);
  assert.match(sw,/document-reader\.js/);
});
