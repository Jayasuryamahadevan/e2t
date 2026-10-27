import { transliterateWord, transliterateText } from './lib/transliterate.js';
import { findTanglishWordToCommit } from './lib/typing-commit.js';
import { createDocx, safeFileName } from './lib/docx.js';

const $ = id => document.getElementById(id);
const editor = $('editor');
const documentTitle = $('document-title');
const saveStatus = $('save-status');
const wordCount = $('word-count');
const characterCount = $('character-count');
const toast = $('toast');
const DRAFT_KEY = 'e2t-draft-v1';

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

function restoreDraft() {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!value || typeof value !== 'object') return;
    if (typeof value.title === 'string') documentTitle.value = value.title;
    if (typeof value.body === 'string') editor.value = value.body;
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
  if (isComposing || event.isComposing) return;
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
  if (!isComposing && !event.isComposing &&
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


window.addEventListener('pagehide', () => { clearTimeout(saveTimer); saveDraft(); });
restoreDraft();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
