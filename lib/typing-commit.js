import { transliterateWord } from './transliterate.js';

// Convert only a complete, standalone Latin word immediately before Space.
// Keep punctuation, Tamil, digits, URLs and mixed-script tokens untouched.
const WORD_WITH_PUNCTUATION = /^([([{«“‘"']*)([A-Za-z]+)([)\]}»”’"'.,!?;:]*)$/u;

export function findTanglishWordToCommit(value, caret) {
  if (!Number.isInteger(caret) || caret < 0 || caret > value.length) return null;
  // If editing within a Latin word, inserting Space should not silently
  // change part of the existing word.
  if (caret < value.length && /[A-Za-z]/.test(value[caret])) return null;

  let start = caret;
  while (start > 0 && !/\s/u.test(value[start - 1])) start--;
  if (start === caret) return null;

  const token = value.slice(start, caret);
  const match = WORD_WITH_PUNCTUATION.exec(token);
  if (!match) return null;

  const result = transliterateWord(match[2]);
  if (result === match[2]) return null;
  return { start, end: caret, replacement: match[1] + result + match[3] };
}