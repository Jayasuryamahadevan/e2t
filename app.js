import { transliterateWord, transliterateText } from './lib/transliterate.js';
import { findTanglishWordToCommit } from './lib/typing-commit.js';
import { createDocx, safeFileName } from './lib/docx.js';
import { translateRequest, imageToBase64, validateEndpoint, MAX_TEXT_LENGTH } from './lib/translation-api.js';
import { extractDocumentText } from './lib/document-reader.js';
import { DEFAULT_TRANSLATION_API_URL } from './lib/translation-config.js';

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
  previousEditorValue = editor.value;
  updateCounts();
  clearTimeout(saveTimer);
  saveStatus.innerHTML = '<span class="saved-dot"></span> Saving…';
  saveTimer = setTimeout(saveDraft, 250);
}

function setMode(mode, persist = true) {
  typingMode = mode;
  modePhonetic.classList.toggle('selected', mode === 'phonetic');
  modeDirect.classList.toggle('selected', mode === 'direct');
  modePhonetic.setAttribute('aria-pressed', String(mode === 'phonetic'));
  modeDirect.setAttribute('aria-pressed', String(mode === 'direct'));
  typingHelp.innerHTML = mode === 'phonetic'
    ? 'Type <strong>vanakkam</strong> in English. Press <strong>Space</strong> to convert it into <strong lang="ta">வணக்கம்</strong>.'
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

// Keep active Tanglish words in Latin letters. Only the Space key commits a word.
let skipNextSpaceInput = false;
let previousEditorValue = '';
editor.addEventListener('compositionstart', () => { isComposing = true; });
editor.addEventListener('compositionend', () => { isComposing = false; scheduleSave(); });
editor.addEventListener('beforeinput', event => {
  if (typingMode !== 'phonetic' || isComposing || event.isComposing) return;
  if (event.inputType !== 'insertText' || event.data !== ' ') {
    skipNextSpaceInput = false;
    return;
  }

  // Replacing a selection is a normal text edit, not completion of a word.
  if (editor.selectionStart !== editor.selectionEnd) {
    skipNextSpaceInput = true;
    return;
  }
  const edit = findTanglishWordToCommit(editor.value, editor.selectionStart);
  if (!edit) return;

  event.preventDefault();
  editor.setRangeText(edit.replacement + ' ', edit.start, edit.end, 'end');
  scheduleSave();
});

// Mobile keyboards sometimes skip beforeinput. In that case, convert only
// after a literal Space has been inserted by a normal typing input event.
editor.addEventListener('input', event => {
  if (skipNextSpaceInput) {
    skipNextSpaceInput = false;
    scheduleSave();
    previousEditorValue = editor.value;
    return;
  }
  const caret = editor.selectionStart;
  const newlyInsertedSpace = event.data === ' ' ||
    (event.data == null && editor.value.length === previousEditorValue.length + 1 && editor.value[caret - 1] === ' ');
  if (typingMode === 'phonetic' && !isComposing && !event.isComposing &&
      event.inputType === 'insertText' && newlyInsertedSpace && caret > 0 &&
      editor.value[caret - 1] === ' ' && editor.selectionEnd === caret) {
    const edit = findTanglishWordToCommit(editor.value, caret - 1);
    if (edit) {
      editor.setRangeText(edit.replacement, edit.start, edit.end, 'end');
      // Keep caret AFTER the existing space.
      const afterSpace = editor.selectionStart + 1;
      editor.setSelectionRange(afterSpace, afterSpace);
    }
  }
  scheduleSave();
  previousEditorValue = editor.value;
});

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
  return candidate === 'google' || Object.hasOwn(PROVIDERS, candidate) ? candidate : 'writer';
}

function renderRoute() {
  const route = routeFromHash(window.location?.hash || '');
  const provider = PROVIDERS[route];
  $('writer-workspace').hidden = route !== 'writer';
  $('provider-panel').hidden = !provider;
  $('google-panel').hidden = route !== 'google';
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
  scheduleSave();
  announce('Converted Tanglish words to Tamil script.');
});

// Translation POST requests target an owner-configured serverless API, not Google's browser website.
const TRANSLATION_ENDPOINT_KEY = 'e2t-translation-api-url';
let googleMode = 'text';
let currentRequest = null;
let lastCompletedText = '';
let activeRequestId = 0;

function setTranslationStatus(message, kind = '') {
  const status = $('google-text-status');
  status.textContent = message;
  status.dataset.state = kind;
}

function setGoogleMode(mode) {
  if (!['text', 'images', 'documents'].includes(mode)) return;
  googleMode = mode;
  for (const section of ['text', 'images', 'documents']) {
    $('google-mode-' + section).hidden = section !== mode;
    const tab = $('google-tab-' + section);
    tab.setAttribute('aria-selected', String(section === mode));
    tab.classList.toggle('active', section === mode);
  }
}

function setRequestBusy(busy) {
  for (const id of ['google-translate-text', 'google-translate-image', 'google-translate-document']) $(id).disabled = busy;
  $('google-cancel').hidden = !busy;
}

function setResult(sourceText, translatedText, detected) {
  $('google-source-preview').value = sourceText;
  $('google-result').value = translatedText;
  $('google-detected-language').hidden = !detected;
  $('google-detected-language').textContent = detected ? `Detected: ${detected.toUpperCase()}` : '';
  lastCompletedText = translatedText;
  $('google-copy-result').disabled = !translatedText.trim();
  $('google-insert-result').disabled = !translatedText.trim();
}

function translationEndpoint() {
  return validateEndpoint($('google-api-url').value);
}

function updateConnection() {
  try {
    translationEndpoint();
    $('google-connection').textContent = 'Endpoint set · not verified';
    $('google-connection').dataset.state = 'configured';
  } catch {
    $('google-connection').textContent = 'Not configured';
    $('google-connection').dataset.state = 'missing';
  }
}

try { $('google-api-url').value = localStorage.getItem(TRANSLATION_ENDPOINT_KEY) || DEFAULT_TRANSLATION_API_URL; } catch {}
updateConnection();

$('google-save-endpoint').addEventListener('click', () => {
  try {
    const url = translationEndpoint();
    localStorage.setItem(TRANSLATION_ENDPOINT_KEY, url);
    $('google-api-url').value = url;
    updateConnection();
    setTranslationStatus('Endpoint saved. Select Translate to check connectivity.', 'info');
  } catch (err) { setTranslationStatus(err.message, 'error'); }
});
$('google-api-url').addEventListener('input', updateConnection);

document.querySelectorAll('[data-google-mode]').forEach(button => button.addEventListener('click', () => setGoogleMode(button.dataset.googleMode)));
$('google-text').addEventListener('input', () => {
  const text = $('google-text').value;
  $('google-text-count').textContent = `${Array.from(text).length.toLocaleString()} / ${MAX_TEXT_LENGTH.toLocaleString()} characters`;
});
$('google-use-editor').addEventListener('click', () => {
  if (!editor.value.trim()) { announce('Your writer is empty. Add text first.'); return; }
  if (Array.from(editor.value).length > MAX_TEXT_LENGTH) { announce('Writer text is too long. Select a smaller section.'); return; }
  if ($('google-text').value.trim() && $('google-text').value !== editor.value && !window.confirm('Replace the translation source with your writer text?')) return;
  $('google-text').value = editor.value;
  $('google-text').dispatchEvent(new Event('input'));
  setGoogleMode('text');
  announce('Writer text loaded.');
});
$('google-copy-source').addEventListener('click', async () => {
  if (!$('google-text').value.trim()) { announce('Add text to copy.'); return; }
  try { await navigator.clipboard.writeText($('google-text').value); announce('Source text copied.'); }
  catch { $('google-text').focus(); $('google-text').select(); announce('Use Ctrl+C to copy.'); }
});

$('google-swap-languages').addEventListener('click', () => {
  const source = $('google-source-language');
  const target = $('google-target-language');
  if (source.value === 'auto') {
    source.value = target.value;
    target.value = source.value === 'en' ? 'ta' : 'en';
  } else {
    const oldSource = source.value;
    source.value = target.value;
    target.value = oldSource;
  }
  if ($('google-result').value.trim()) {
    const oldText = $('google-text').value;
    $('google-text').value = $('google-result').value;
    $('google-result').value = oldText;
    $('google-text').dispatchEvent(new Event('input'));
  }
});

async function performTranslation({kind, text, file}) {
  // Ensure no older completion can overwrite the newest translation.
  if (currentRequest) currentRequest.abort();
  const id = ++activeRequestId;
  const controller = new AbortController();
  currentRequest = controller;
  const timer = setTimeout(() => controller.abort(), 30000);
  setRequestBusy(true);
  setResult('', '', '');
  setTranslationStatus('Preparing your translation…', 'busy');
  try {
    const endpoint = translationEndpoint();
    const source = $('google-source-language').value;
    const target = $('google-target-language').value;
    let bodyText = text;
    let imageBase64;
    if (kind === 'document') bodyText = await extractDocumentText(file);
    if (kind === 'image') imageBase64 = await imageToBase64(file);
    if (controller.signal.aborted || id !== activeRequestId) return;
    setTranslationStatus('Translating securely via your API…', 'busy');
    const result = await translateRequest({endpoint, source, target, text: bodyText, imageBase64, signal: controller.signal});
    if (id !== activeRequestId || controller.signal.aborted) return;
    setResult(result.sourceText, result.translatedText, result.detectedSourceLanguage);
    setTranslationStatus('Translation complete. Edit the result, copy it, or add it to your document.', 'success');
  } catch (error) {
    if (id !== activeRequestId) return;
    setTranslationStatus(error.name === 'AbortError' ? 'Request cancelled or timed out.' : error.message, 'error');
  } finally {
    clearTimeout(timer);
    if (id === activeRequestId) { currentRequest = null; setRequestBusy(false); }
  }
}

$('google-translate-text').addEventListener('click', () => performTranslation({kind: 'text', text: $('google-text').value}));
$('google-translate-image').addEventListener('click', () => performTranslation({kind: 'image', file: $('google-image-file').files?.[0]}));
$('google-translate-document').addEventListener('click', () => performTranslation({kind: 'document', file: $('google-document-file').files?.[0]}));
$('google-cancel').addEventListener('click', () => {
  if (currentRequest) currentRequest.abort();
  setTranslationStatus('Request cancelled.', 'info');
});
for (const [id, caption] of [['google-image-file', 'google-image-description'], ['google-document-file', 'google-document-description']]) {
  $(id).addEventListener('change', () => {
    const file = $(id).files?.[0];
    $(caption).textContent = file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB` : 'No file selected.';
  });
}
$('google-result').addEventListener('input', () => {
  const enabled = !!$('google-result').value.trim();
  $('google-copy-result').disabled = !enabled;
  $('google-insert-result').disabled = !enabled;
});
$('google-copy-result').addEventListener('click', async () => {
  if (!$('google-result').value.trim()) return;
  try { await navigator.clipboard.writeText($('google-result').value); announce('Translation copied.'); }
  catch { $('google-result').focus(); $('google-result').select(); announce('Use Ctrl+C to copy.'); }
});
$('google-insert-result').addEventListener('click', () => {
  const text = $('google-result').value.trim();
  if (!text) return;
  const separator = editor.value && !editor.value.endsWith('\n') ? '\n\n' : '';
  insertAtSelection(separator + text, editor.value.length, editor.value.length);
  window.location.hash = '#writer';
  renderRoute();
  announce('Translation added to writer. Download as DOCX or PDF whenever ready.');
});
setGoogleMode('text');

window.addEventListener('pagehide', () => { clearTimeout(saveTimer); saveDraft(); });
restoreDraft();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

renderRoute();
