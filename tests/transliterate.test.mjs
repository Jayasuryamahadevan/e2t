import test from 'node:test';
import assert from 'node:assert/strict';
import { transliterateWord, transliterateText } from '../lib/transliterate.js';

test('common words produce expected Tamil', () => {
  const examples = {
    vanakkam: 'வணக்கம்', nandri: 'நன்றி', tamizh: 'தமிழ்',
    amma: 'அம்மா', appa: 'அப்பா', ungal: 'உங்கள்',
    eppadi: 'எப்படி', vazhga: 'வாழ்க', naan: 'நான்',
  };
  for (const [raw, tamil] of Object.entries(examples)) assert.equal(transliterateWord(raw), tamil);
});

test('vowels, consonants, and letter-case variants', () => {
  assert.equal(transliterateWord('a'), 'அ');
  assert.equal(transliterateWord('aa'), 'ஆ');
  assert.equal(transliterateWord('ai'), 'ஐ');
  assert.equal(transliterateWord('ka'), 'க');
  assert.equal(transliterateWord('ki'), 'கி');
  assert.equal(transliterateWord('k'), 'க்');
  assert.equal(transliterateWord('zh'), 'ழ்');
  assert.equal(transliterateWord('th'), 'த்');
  assert.equal(transliterateWord('Na'), 'ண');
  assert.equal(transliterateWord('La'), 'ள');
  assert.equal(transliterateWord('Ra'), 'ற');
});

test('preserves punctuation and only transliterates Latin runs', () => {
  assert.equal(transliterateText('vanakkam! nandri.'), 'வணக்கம்! நன்றி.');
  assert.equal(transliterateText('தமிழ் 123'), 'தமிழ் 123');
  assert.equal(transliterateWord('hello-world'), 'hello-world');
  assert.equal(transliterateWord(''), '');
});
