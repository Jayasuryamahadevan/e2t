import { transliterateWord, transliterateText } from './lib/transliterate.js';
import { createDocx, safeFileName } from './lib/docx.js';

const $ = id => document.getElementById(id);
const editor = $('editor');
const documentTitle = $('document-title');
const saveStatus = $('save-status');
const wordCount = $('word-count');
const characterCount = $('character-count');
const modePhonetic = $('mode-phonetic');
const modeDirect = $('mode-direct');
const typingHelp = $('typing-help-text');
const toast = $('toast');
const DRAFT_KEY = 'e2t-draft-v1';

let typingMode = 'phonetic';
let activeWord = null;
let saveTimer = null;
let toastTimer = null;
let isComposing = false;

function announce(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
}

function updateCounts() {
  const value = editor.value.trim();
  const words = value ? value.split(/\s+/u).length : 0;
  const chars = [...editor.value].length;
  wordCount.textContent = `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}`;
  characterCount.textContent = `${chars.toLocaleString()} ${chars === 1 ? 'character' : 'characters'}`;
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      title: documentTitle.value,
      body: editor.value,
      mode: typingMode,
      size: $('editor-size').value,
    }));
    saveStatus.innerHTML = '<span class="saved-dot"></span> Saved on this device';
  } catch {
    saveStatus.textContent = 'Local storage unavailable';
  }
}

function scheduleSave() {
  updateCounts();
  clearTimeout(saveTimer);
  saveStatus.innerHTML = '<span class="saved-dot"></span> Saving…';
  saveTimer = setTimeout(saveDraft, 250);
}

function setMode(mode, persist = true) {
  typingMode = mode;
  activeWord = null;
  modePhonetic.classList.toggle('selected', mode === 'phonetic');
  modeDirect.classList.toggle('selected', mode === 'direct');
  modePhonetic.setAttribute('aria-pressed', String(mode === 'phonetic'));
  modeDirect.setAttribute('aria-pressed', String(mode === 'direct'));
  typingHelp.innerHTML = mode === 'phonetic'
    ? 'Type <strong>vanakkam</strong> → <strong lang="ta">வணக்கம்</strong>. Press Space to finish a word.'
    : 'Type with your usual keyboard or your device’s Tamil input method.';
  if (persist) scheduleSave();
}

function restoreDraft() {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!value || typeof value !== 'object') return;
    if (typeof value.title === 'string') documentTitle.value = value.title;
    if (typeof value.body === 'string') editor.value = value.body;
    if (value.mode === 'direct') setMode('direct', false);
    if (['18', '20', '22', '24'].includes(value.size)) $('editor-size').value = value.size;
  } catch {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }
  editor.style.fontSize = `${$('editor-size').value}px`;
  updateCounts();
}

function insertAtSelection(text, start = editor.selectionStart, end = editor.selectionEnd) {
  editor.setRangeText(text, start, end, 'end');
  scheduleSave();
}

editor.addEventListener('compositionstart', () => { isComposing = true; activeWord = null; });
editor.addEventListener('compositionend', () => { isComposing = false; activeWord = null; scheduleSave(); });
editor.addEventListener('beforeinput', event => {
  if (typingMode !== 'phonetic' || isComposing || event.isComposing) return;

  if (event.inputType === 'deleteContentBackward' && activeWord && editor.selectionStart === activeWord.end && editor.selectionEnd === activeWord.end) {
    event.preventDefault();
    const raw = activeWord.raw.slice(0, -1);
    const rendered = transliterateWord(raw);
    const start = activeWord.start;
    insertAtSelection(rendered, start, activeWord.end);
    activeWord = raw ? { raw, start, end: start + rendered.length } : null;
    return;
  }

  if (event.inputType !== 'insertText' || !event.data || !/^[A-Za-z]$/.test(event.data)) {
    activeWord = null;
    return;
  }

  event.preventDefault();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const continuing = activeWord && start === end && start === activeWord.end;
  const raw = (continuing ? activeWord.raw : '') + event.data;
  const replacementStart = continuing ? activeWord.start : start;
  const rendered = transliterateWord(raw);
  insertAtSelection(rendered, replacementStart, end);
  activeWord = { raw, start: replacementStart, end: replacementStart + rendered.length };
});

editor.addEventListener('input', scheduleSave);
editor.addEventListener('click', () => { activeWord = null; });
editor.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) activeWord = null;
});
editor.addEventListener('paste', () => { activeWord = null; });
editor.addEventListener('drop', () => { activeWord = null; });

documentTitle.addEventListener('input', scheduleSave);
modePhonetic.addEventListener('click', () => setMode('phonetic'));
modeDirect.addEventListener('click', () => setMode('direct'));
$('editor-size').addEventListener('change', event => {
  editor.style.fontSize = `${event.target.value}px`;
  scheduleSave();
});

function download(bytes, type, extension) {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFileName(documentTitle.value, extension);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

$('download-docx').addEventListener('click', () => {
  try {
    download(createDocx(documentTitle.value, editor.value), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx');
    announce('Word document downloaded.');
  } catch {
    announce('Unable to generate the Word document.');
  }
});

$('download-txt').addEventListener('click', () => {
  download(`\uFEFF${documentTitle.value}\n\n${editor.value}`, 'text/plain;charset=utf-8', 'txt');
  announce('Text file downloaded.');
});

$('download-pdf').addEventListener('click', () => {
  $('print-title').textContent = documentTitle.value || 'Untitled document';
  const container = $('print-body');
  const paragraphs = editor.value.replace(/\r\n?/g, '\n').split('\n').map(line => {
    const node = document.createElement('p');
    node.textContent = line || '\u00A0';
    return node;
  });
  container.replaceChildren(...paragraphs);
  window.print();
});

$('copy-text').addEventListener('click', async () => {
  if (!editor.value) { announce('Write something before copying.'); return; }
  try {
    await navigator.clipboard.writeText(editor.value);
    announce('Copied to clipboard.');
  } catch {
    editor.focus();
    editor.select();
    announce('Select the text and use Ctrl+C to copy.');
  }
});

$('clear-text').addEventListener('click', () => {
  if (!editor.value) return;
  if (!window.confirm('Clear the editor? This will replace your locally saved draft.')) return;
  editor.value = '';
  activeWord = null;
  scheduleSave();
  editor.focus();
  announce('Editor cleared.');
});

$('load-text').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/\.(txt|md)$/i.test(file.name)) { announce('Choose a .txt or .md file.'); return; }
  if (file.size > 2_000_000) { announce('Choose a text file smaller than 2 MB.'); return; }
  if (editor.value && !window.confirm('Replace your current draft with this file?')) { event.target.value = ''; return; }
  try {
    editor.value = (await file.text()).replace(/^\uFEFF/, '');
    documentTitle.value = file.name.replace(/\.(txt|md)$/i, '');
    activeWord = null;
    scheduleSave();
    announce('Text file opened.');
  } catch {
    announce('Unable to open the selected file.');
  }
  event.target.value = '';
});

document.querySelectorAll('[data-sample]').forEach(button => button.addEventListener('click', () => {
  const rendered = transliterateWord(button.dataset.sample);
  const spacer = editor.value && !/\s$/.test(editor.value.slice(0, editor.selectionStart)) ? ' ' : '';
  insertAtSelection(spacer + rendered);
  activeWord = null;
  editor.focus();
}));


// Hash-based routes work on GitHub Pages without a server-side router.
// Third-party sites are framed only when explicitly selected; they may disallow framing.
const PROVIDERS = Object.freeze({
  desh: {
    title: 'Desh Tamil Keyboard',
    description: 'Phonetic Tanglish typing, suggestions and voice typing (provider features depend on your browser).',
    url: 'https://www.deshkeyboard.com/tamil-typing/',
  },
  translate: {
    title: 'English → Tamil Translation',
    description: 'Translate the meaning of English sentences into Tamil using Easy Tamil Typing. Translation is different from writing Tamil words with English letters.',
    url: 'https://www.easytamiltyping.com/english/to/tamil/translation',
  },
});

function routeFromHash(hash) {
  const candidate = String(hash || '').replace(/^#/, '').toLowerCase();
  return Object.hasOwn(PROVIDERS, candidate) ? candidate : 'writer';
}

function renderRoute() {
  const route = routeFromHash(window.location?.hash || '');
  const provider = PROVIDERS[route];
  $('writer-workspace').hidden = Boolean(provider);
  $('provider-panel').hidden = !provider;
  document.querySelectorAll('[data-route]').forEach(link => {
    link.setAttribute('aria-current', link.dataset.route === route ? 'page' : 'false');
  });
  if (provider) {
    $('provider-title').textContent = provider.title;
    $('provider-description').textContent = provider.description;
    $('provider-external').href = provider.url;
    const frame = $('provider-frame');
    frame.title = provider.title + ' — third-party website';
    if (frame.getAttribute('src') !== provider.url) frame.setAttribute('src', provider.url);
  } else {
    // Stop remote activity once users return to their private editor.
    $('provider-frame').removeAttribute('src');
  }
}

window.addEventListener('hashchange', renderRoute);

$('provider-copy').addEventListener('click', async () => {
  if (!editor.value) { announce('Your document is empty. Add some text first.'); return; }
  try {
    await navigator.clipboard.writeText(editor.value);
    announce('Copied. Paste into the external website.');
  } catch {
    announce('Clipboard access blocked. Copy from the Writer tab manually.');
  }
});

$('provider-paste').addEventListener('click', async () => {
  let text = '';
  try {
    if (navigator.clipboard?.readText) text = await navigator.clipboard.readText();
  } catch { /* Prompt fallback below. */ }
  if (!text && typeof window.prompt === 'function') text = window.prompt('Paste the Tamil text to add to your document:') || '';
  if (!text.trim()) { announce('No text was pasted.'); return; }
  // Do not overwrite the user's existing draft with an external result.
  const separator = editor.value && !editor.value.endsWith('\n') ? '\n\n' : '';
  insertAtSelection(separator + text, editor.value.length, editor.value.length);
  window.location.hash = '#writer';
  renderRoute();
  announce('Text added to the end of your document.');
});

$('convert-text').addEventListener('click', () => {
  if (!editor.value) { announce('Write or paste some Tanglish first.'); return; }
  if (!/[a-z]/i.test(editor.value)) { announce('No English-letter words to convert.'); return; }
  if (!window.confirm('Convert English-letter words phonetically to Tamil? This is not English-to-Tamil translation.')) return;
  editor.value = transliterateText(editor.value);
  activeWord = null;
  scheduleSave();
  announce('Converted Tanglish words to Tamil script.');
});

window.addEventListener('pagehide', () => { clearTimeout(saveTimer); saveDraft(); });
restoreDraft();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

renderRoute();
