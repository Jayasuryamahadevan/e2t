const VOWELS = [
  ['aau', 'ௌ', 'ஔ'],
  ['ai', 'ை', 'ஐ'],
  ['au', 'ௌ', 'ஔ'],
  ['aa', 'ா', 'ஆ'],
  ['ii', 'ீ', 'ஈ'],
  ['ee', 'ீ', 'ஈ'],
  ['uu', 'ூ', 'ஊ'],
  ['oo', 'ூ', 'ஊ'],
  ['ae', 'ே', 'ஏ'],
  ['ea', 'ே', 'ஏ'],
  ['oa', 'ோ', 'ஓ'],
  ['oe', 'ோ', 'ஓ'],
  ['a', '', 'அ'],
  ['i', 'ி', 'இ'],
  ['u', 'ு', 'உ'],
  ['e', 'ெ', 'எ'],
  ['o', 'ொ', 'ஒ'],
];

const CONSONANTS = [
  ['ng', 'ங'], ['nj', 'ஞ'], ['ny', 'ஞ'],
  ['zh', 'ழ'], ['sh', 'ஷ'], ['ch', 'ச'],
  ['th', 'த'], ['dh', 'த'], ['ph', 'ஃப'],
  ['kh', 'க'], ['gh', 'க'], ['bh', 'ப'],
  ['rr', 'ற'], ['ll', 'ள'], ['nn', 'ண'],
  ['k', 'க'], ['g', 'க'], ['c', 'ச'], ['s', 'ஸ'],
  ['j', 'ஜ'], ['t', 'ட'], ['d', 'ட'], ['n', 'ந'],
  ['p', 'ப'], ['b', 'ப'], ['m', 'ம'], ['y', 'ய'],
  ['r', 'ர'], ['l', 'ல'], ['v', 'வ'], ['w', 'வ'],
  ['h', 'ஹ'], ['f', 'ஃப'], ['z', 'ழ'],
];

const COMMON_WORDS = new Map(Object.entries({
  vanakkam: 'வணக்கம்',
  nandri: 'நன்றி',
  nanri: 'நன்றி',
  tamizh: 'தமிழ்',
  tamil: 'தமிழ்',
  amma: 'அம்மா',
  appa: 'அப்பா',
  ungal: 'உங்கள்',
  enakku: 'எனக்கு',
  eppadi: 'எப்படி',
  vazhga: 'வாழ்க',
  naan: 'நான்',
  neengal: 'நீங்கள்',
  thamizh: 'தமிழ்',
  anbu: 'அன்பு',
  iniya: 'இனிய',
  kaalai: 'காலை',
}));

function findToken(input, position, tokens) {
  for (const token of tokens) {
    if (input.slice(position, position + token[0].length).toLowerCase() === token[0]) {
      return token;
    }
  }
  return null;
}

export function transliterateWord(input) {
  if (!input) return '';
  if (!/^[a-zA-Z]+$/.test(input)) return input;

  const exact = COMMON_WORDS.get(input.toLowerCase());
  if (exact) return exact;

  let output = '';
  for (let position = 0; position < input.length;) {
    const char = input[position];
    const upper = char === char.toUpperCase();
    const special = upper && ({ N: 'ண', L: 'ள', R: 'ற', Z: 'ழ', S: 'ஷ', T: 'ட' })[char];
    const consonant = special ? [char, special] : findToken(input, position, CONSONANTS);

    if (consonant) {
      position += consonant[0].length;
      const vowel = findToken(input, position, VOWELS);
      if (vowel) {
        output += consonant[1] + vowel[1];
        position += vowel[0].length;
      } else {
        output += consonant[1] + '்';
      }
      continue;
    }

    const vowel = findToken(input, position, VOWELS);
    if (vowel) {
      output += vowel[2];
      position += vowel[0].length;
    } else {
      output += char;
      position++;
    }
  }
  return output;
}

export function transliterateText(text) {
  return text.replace(/[a-zA-Z]+/g, transliterateWord);
}
