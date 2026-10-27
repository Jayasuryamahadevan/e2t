import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDocumentText} from '../lib/document-reader.js';

test('document reader extracts local UTF-8 text and validates size, extension and length', async () => {
  const file={name:'notes.txt',size:32,text:async()=> '\uFEFFவணக்கம்\nHello'};
  assert.equal(await extractDocumentText(file), 'வணக்கம்\nHello');
  await assert.rejects(extractDocumentText({...file,name:'notes.exe'}),/Supported documents/);
  await assert.rejects(extractDocumentText({...file,size:9000000}),/8 MB/);
  await assert.rejects(extractDocumentText({...file,text:async()=> 'x'.repeat(10001)}),/10,000/);
});
