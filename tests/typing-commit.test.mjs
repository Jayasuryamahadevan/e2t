import test from 'node:test';
import assert from 'node:assert/strict';
import {findTanglishWordToCommit} from '../lib/typing-commit.js';
import {transliterateWord} from '../lib/transliterate.js';

const commit = (value, caret=value.length) => findTanglishWordToCommit(value, caret);

test('converts only the word preceding Space, with correct replacement offsets', () => {
  assert.deepEqual(commit('vanakkam'), {start:0, end:8, replacement:'வணக்கம்'});
  assert.deepEqual(commit('வணக்கம் nandri'), {start:8, end:14, replacement:'நன்றி'});
  assert.deepEqual(commit('foo\nvanakkam'), {start:4,end:12,replacement:'வணக்கம்'});
  assert.deepEqual(commit('romba nalla'), {start:6,end:11,replacement:'நல்ல'});
});

test('retains punctuation around completed words and case variants', () => {
  assert.deepEqual(commit('(vanakkam!),'), {start:0,end:12,replacement:'(வணக்கம்!),'});
  assert.deepEqual(commit('NANDRI.'), {start:0,end:7,replacement:'நன்றி.'});
  assert.equal(commit('வணக்கம்!'), null);
});

test('does not convert incomplete/mixed/numeric/email/URL or cursor-middle words', () => {
  for(const s of ['','  ','தமிழ்','hello123','e-mail','me@example.com','https://example.com','தமிழ்vanakkam','#vanakkam','hello_world']) assert.equal(commit(s),null,s);
  assert.equal(commit('vanakkam',4),null);
  assert.equal(commit('vanakkam',-1),null);
  assert.equal(commit('vanakkam',99),null);
  assert.equal(commit('vanakkam ',9),null);
});

test('frequent everyday Tanglish terms are correctly transliterated without internet', () => {
  for(const [input, expected] of Object.entries({
    vanakkam:'வணக்கம்', nandri:'நன்றி', enna:'என்ன', en:'என்', naan:'நான்',
    nalla:'நல்ல', sari:'சரி', romba:'ரொம்ப', ungal:'உங்கள்', eppadi:'எப்படி',
    chennai:'சென்னை', saptiya:'சாப்பிட்டியா', irukken:'இருக்கேன்',
    vanakkam:'வணக்கம்', ka:'க', ki:'கி', Na:'ண', La:'ள', Ra:'ற',
  })) assert.equal(transliterateWord(input),expected,input);
});