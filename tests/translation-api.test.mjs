import test from 'node:test';
import assert from 'node:assert/strict';
import {translateRequest, validateEndpoint, validateText, imageToBase64} from '../lib/translation-api.js';

const api = 'https://e2t-translate-api.example.workers.dev/translate';

test('accepts HTTPS endpoint and rejects insecure, injected or invalid URLs', () => {
  assert.equal(validateEndpoint(api), api);
  assert.throws(() => validateEndpoint('http://evil.example/translate'), /HTTPS/);
  assert.throws(() => validateEndpoint('https://user:password@evil.example/translate'), /credentials/);
  assert.throws(() => validateEndpoint('https://evil.example/translate?secret=x'), /query parameters/);
  assert.throws(() => validateEndpoint(''), /Enter/);
});

test('POSTs text JSON to configured API and returns data to the page, never navigates', async () => {
  let called;
  const result = await translateRequest({endpoint: api, source: 'en', target: 'ta', text: 'Hello', fetcher: async (url, options) => {
    called = {url, ...options};
    return new Response(JSON.stringify({translatedText: 'வணக்கம்', sourceText: 'Hello', detectedSourceLanguage: 'en'}), {status: 200, headers: {'Content-Type': 'application/json'}});
  }});
  assert.equal(called.method, 'POST');
  assert.equal(called.url, api);
  assert.deepEqual(JSON.parse(called.body), {kind: 'text', source: 'en', target: 'ta', text: 'Hello'});
  assert.equal(called.credentials, 'omit');
  assert.equal(result.translatedText, 'வணக்கம்');
});

test('input validation, upstream errors and network failures are readable', async () => {
  assert.throws(() => validateText('   '), /Enter/);
  assert.throws(() => validateText('a'.repeat(10001)), /10,000/);
  await assert.rejects(translateRequest({endpoint: api, source: 'ta', target: 'ta', text: 'அ', fetcher: async () => { throw Error('unreachable'); }}), /different/);
  await assert.rejects(translateRequest({endpoint: api, text: 'hello', fetcher: async () => new Response(JSON.stringify({error:'Service unavailable'}), {status:503})}), /Service unavailable/);
  await assert.rejects(translateRequest({endpoint: api, text: 'hello', fetcher: async () => {throw Error('Connection failed');}}), /Could not connect/);
});

test('image upload is base64-encoded and validation guards size and type', async () => {
  const f={type:'image/png',size:3,arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer};
  assert.equal(await imageToBase64(f), 'AQID');
  const r=await translateRequest({endpoint:api,imageBase64:'AQID',fetcher:async (_url, opts)=> {
    assert.equal(JSON.parse(opts.body).kind,'image');
    return new Response(JSON.stringify({translatedText:'Hello',sourceText:'வணக்கம்'}));
  }});
  assert.equal(r.sourceText,'வணக்கம்');
  await assert.rejects(imageToBase64({type:'image/gif',size:10}), /JPG, PNG/);
});
