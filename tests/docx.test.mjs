import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocx, documentXml, safeFileName } from '../lib/docx.js';

test('generates Office Open XML package with ZIP file header', () => {
  const output = createDocx('என் ஆவணம்', 'வணக்கம்\nநன்றி');
  assert.ok(output instanceof Uint8Array);
  assert.deepEqual([...output.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.ok(output.length > 1600);
  assert.deepEqual([...output.slice(-22, -18)], [0x50, 0x4b, 0x05, 0x06]);
});

test('Tamil Unicode is retained and XML special characters escaped', () => {
  const xml = documentXml('தமிழ் & <English>', 'வணக்கம் <நன்றி>\n\n"hello" & you');
  assert.ok(xml.includes('தமிழ் &amp; &lt;English&gt;'));
  assert.ok(xml.includes('வணக்கம் &lt;நன்றி&gt;'));
  assert.ok(xml.includes('&quot;hello&quot; &amp; you'));
  assert.equal((xml.match(/<w:p>/g) || []).length, 4);
});

test('filenames remain valid and support Tamil', () => {
  assert.equal(safeFileName('தமிழ்: ஒரு / ஆவணம்', 'docx'), 'தமிழ் ஒரு  ஆவணம்.docx');
  assert.equal(safeFileName('..?/', 'txt'), 'tamil-document.txt');
});
