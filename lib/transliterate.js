const VOWELS = [
  ['aau', 'ௌ', 'ஔ'], ['ai', 'ை', 'ஐ'], ['au', 'ௌ', 'ஔ'], ['aa', 'ா', 'ஆ'],
  ['ii', 'ீ', 'ஈ'], ['ee', 'ீ', 'ஈ'], ['uu', 'ூ', 'ஊ'], ['oo', 'ூ', 'ஊ'],
  ['ae', 'ே', 'ஏ'], ['ea', 'ே', 'ஏ'], ['oa', 'ோ', 'ஓ'], ['oe', 'ோ', 'ஓ'],
  ['a', '', 'அ'], ['i', 'ி', 'இ'], ['u', 'ு', 'உ'], ['e', 'ெ', 'எ'], ['o', 'ொ', 'ஒ'],
];
const CONSONANTS = [
  ['ng', 'ங'], ['nj', 'ஞ'], ['ny', 'ஞ'], ['zh', 'ழ'], ['sh', 'ஷ'], ['ch', 'ச'],
  ['th', 'த'], ['dh', 'த'], ['ph', 'ஃப'], ['kh', 'க'], ['gh', 'க'], ['bh', 'ப'],
  ['rr', 'ற'], ['ll', 'ள'], ['nn', 'ண'], ['k', 'க'], ['g', 'க'], ['c', 'ச'], ['s', 'ஸ'],
  ['j', 'ஜ'], ['t', 'ட'], ['d', 'ட'], ['n', 'ந'], ['p', 'ப'], ['b', 'ப'], ['m', 'ம'],
  ['y', 'ய'], ['r', 'ர'], ['l', 'ல'], ['v', 'வ'], ['w', 'வ'], ['h', 'ஹ'], ['f', 'ஃப'], ['z', 'ழ'],
];
const COMMON_WORDS = new Map(Object.entries({
  vanakkam:'வணக்கம்', nandri:'நன்றி', nanri:'நன்றி', tamizh:'தமிழ்', tamil:'தமிழ்',
  amma:'அம்மா', appa:'அப்பா', ungal:'உங்கள்', enakku:'எனக்கு', eppadi:'எப்படி',
  vazhga:'வாழ்க', naan:'நான்', neengal:'நீங்கள்', thamizh:'தமிழ்', anbu:'அன்பு',
  iniya:'இனிய', kaalai:'காலை',
  enna:'என்ன', ennai:'என்னை', en:'என்', un:'உன்', nee:'நீ', neenga:'நீங்க',
  unga:'உங்க', ungalukku:'உங்களுக்கு', ennoda:'என்னோட', unnoda:'உன்னோட',
  namma:'நம்ம', namakku:'நமக்கு', nam:'நம்', namadhu:'நமது', ungaludan:'உங்களுடன்',
  nalla:'நல்ல', nallaa:'நல்லா', nallathu:'நல்லது', romba:'ரொம்ப', rombaa:'ரொம்ப',
  sari:'சரி', seri:'சரி', illai:'இல்லை', illa:'இல்ல', aama:'ஆமா', aam:'ஆம்',
  irukku:'இருக்கு', irukken:'இருக்கேன்', irukkiren:'இருக்கிறேன்', irukka:'இருக்கா',
  irukkanga:'இருக்காங்க', irukkinga:'இருக்கீங்க', irundhu:'இருந்து',
  epdi:'எப்படி', eppadi:'எப்படி', eppo:'எப்போ', eppodhu:'எப்போது',
  enga:'எங்க', enge:'எங்கே', engu:'எங்கு', yen:'ஏன்', edhukku:'எதுக்கு',
  edharku:'எதற்கு', evvalavu:'எவ்வளவு', yaar:'யார்', yaaru:'யாரு',
  indha:'இந்த', antha:'அந்த', andha:'அந்த', idhu:'இது', adhu:'அது',
  inge:'இங்கே', ange:'அங்கே', innum:'இன்னும்', ippo:'இப்போ', ippodhu:'இப்போது',
  innikku:'இன்னிக்கு', naalai:'நாளை', netru:'நேற்று', indru:'இன்று',
  sapadu:'சாப்பாடு', saapadu:'சாப்பாடு', saaptiya:'சாப்பிட்டியா',
  saptiya:'சாப்பிட்டியா', saaptiya:'சாப்பிட்டியா', sapten:'சாப்பிட்டேன்',
  saapten:'சாப்பிட்டேன்', saapidu:'சாப்பிடு', saapida:'சாப்பிட',
  ponga:'போங்க', po:'போ', pogalam:'போகலாம்', ponnen:'போனேன்',
  va:'வா', vaanga:'வாங்க', vandhen:'வந்தேன்', vandhu:'வந்து',
  sollu:'சொல்லு', sollunga:'சொல்லுங்க', solren:'சொல்றேன்', sol:'சொல்',
  seiyum:'செய்யும்', seiya:'செய்ய', seithu:'செய்து', seiven:'செய்வேன்',
  thambi:'தம்பி', akka:'அக்கா', anna:'அண்ணா', thangachi:'தங்கச்சி',
  nanban:'நண்பன்', nanbargal:'நண்பர்கள்', magizhchi:'மகிழ்ச்சி',
  puthagam:'புத்தகம்', padippu:'படிப்பு', padi:'படி', padikka:'படிக்க',
  veedu:'வீடு', veetukku:'வீட்டுக்கு', velai:'வேலை', neram:'நேரம்',
  thanni:'தண்ணி', thanneer:'தண்ணீர்', kaadhal:'காதல்', vazhkai:'வாழ்க்கை',
  ulagham:'உலகம்', ulagam:'உலகம்', chennai:'சென்னை', madurai:'மதுரை',
  coimbatore:'கோயம்புத்தூர்', kovai:'கோவை', tamilnadu:'தமிழ்நாடு',
  vanthanam:'வந்தனம்', vazhthukkal:'வாழ்த்துக்கள்', vaazhthukkal:'வாழ்த்துக்கள்',
  vazhthugal:'வாழ்த்துகள்', thirukkural:'திருக்குறள்', kadavul:'கடவுள்',
}));
function findToken(input, position, tokens) {
  for (const token of tokens) if (input.slice(position, position + token[0].length).toLowerCase() === token[0]) return token;
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
      // At the start of a word, n normally represents ந; within words and
      // at the end, it usually represents ன (enna -> என்ன, naan -> நான்).
      const consonantTamil = !special && consonant[0] === 'n' && position > consonant[0].length ? 'ன' : consonant[1];
      if (vowel) { output += consonantTamil + vowel[1]; position += vowel[0].length; }
      else output += consonantTamil + '்';
      continue;
    }
    const vowel = findToken(input, position, VOWELS);
    if (vowel) { output += vowel[2]; position += vowel[0].length; }
    else { output += char; position++; }
  }
  return output;
}
export function transliterateText(text) { return text.replace(/[a-zA-Z]+/g, transliterateWord); }