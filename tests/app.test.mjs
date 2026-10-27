import test from 'node:test';
import assert from 'node:assert/strict';

class Element {
  constructor(value = '') {
    this.value = value;
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.hidden = true;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.listeners = new Map();
    this.dataset = {};
    this.children = [];
    this.attributes = {};
    this.classList = { toggle() {} };
  }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  dispatch(type, event = {}) { return this.listeners.get(type)?.({ target: this, ...event }); }
  dispatchEvent(event) { return this.dispatch(event.type, event); }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  removeAttribute(key) { delete this.attributes[key]; }
  focus() {}
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  click() { return this.dispatch('click'); }
  append() {}
  remove() {}
  replaceChildren(...children) { this.children = children; }
  setRangeText(replacement, start, end) {
    this.value = this.value.slice(0, start) + replacement + this.value.slice(end);
    this.selectionStart = this.selectionEnd = start + replacement.length;
  }
}

test('browser app supports Tanglish space-to-convert, export and autosave without network calls', async () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element(id === 'editor-size' ? '20' : id === 'document-title' ? 'என் ஆவணம்' : ''));
    return elements.get(id);
  };
  const storage = new Map();
  const windowEvents = new Map();
  globalThis.document = {
    getElementById: get,
    querySelectorAll: () => [],
    createElement: () => new Element(),
    body: { append() {} },
  };
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  globalThis.window = {
    location: {hash: "#writer"},
    addEventListener: (name, fn) => windowEvents.set(name, fn),
    confirm: () => true,
    print: () => { globalThis.__printed = true; },
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async () => {} } } });
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    throw new Error('Tanglish writer must not make network requests');
  };
  const nativeTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (...args) => { const handle = nativeTimeout(...args); handle.unref?.(); return handle; };
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = () => 'blob:testing';
  URL.revokeObjectURL = () => {};
  try {
    await import('../app.js');
    const editor = get('editor');
    function type(character) {
      let blocked = false;
      editor.dispatch('beforeinput', {
        inputType: 'insertText', data: character,
        preventDefault: () => { blocked = true; },
      });
      if (!blocked) {
        editor.setRangeText(character, editor.selectionStart, editor.selectionEnd);
        editor.dispatch('input');
      }
    }
    for (const char of 'vanakkam') type(char);
    assert.equal(editor.value, 'vanakkam', 'Latin letters must remain untouched while typing');
    type(' ');
    assert.equal(editor.value, 'வணக்கம் ');
    for (const char of 'nandrX') type(char);
    assert.equal(editor.value, 'வணக்கம் nandrX', 'Second word stays English until Space');

    let blocked = false;
    editor.dispatch('beforeinput', {inputType:'deleteContentBackward',preventDefault:() => { blocked = true; }});
    assert.equal(blocked, false, 'Normal backspace must not be intercepted');
    editor.setRangeText('', editor.selectionStart - 1, editor.selectionEnd);
    editor.dispatch('input', {inputType:'deleteContentBackward'});
    type('i');
    assert.equal(editor.value, 'வணக்கம் nandri');
    type(' ');
    assert.equal(editor.value, 'வணக்கம் நன்றி ');
    assert.match(get('word-count').textContent, /2 words/);
    assert.match(get('character-count').textContent, /characters/);
    // Simulate native deletion of the trailing space.
    editor.setRangeText('', editor.selectionStart - 1, editor.selectionEnd);
    editor.dispatch('input', {inputType:'deleteContentBackward'});
    assert.equal(editor.value, 'வணக்கம் நன்றி');
    get('download-docx').click();
    get('download-txt').click();
    get('download-pdf').click();
    assert.equal(globalThis.__printed, true);
    assert.equal(get('print-body').children.length, 1);
    assert.equal(get('print-body').children[0].textContent, 'வணக்கம் நன்றி');
    windowEvents.get('pagehide')();
    const saved = JSON.parse(storage.get('e2t-draft-v1'));
    assert.equal(saved.body, 'வணக்கம் நன்றி');
    // Only the editor is present; no external routes are needed.
    assert.equal(get('editor').value, 'வணக்கம் நன்றி');
    editor.value = 'enna';
    editor.setSelectionRange(4, 4);
    editor.dispatch('input', { inputType:'insertText', data:'a' });
    editor.setRangeText(' ', 4, 4);
    editor.dispatch('input', { inputType:'insertText', data:' ' });
    assert.equal(editor.value, 'என்ன ', 'Mobile fallback commits after a native space');
    editor.value = 'vanakkam nandri';
    editor.setSelectionRange(editor.value.length, editor.value.length);
    editor.dispatch('input', { inputType:'insertFromPaste', data:'vanakkam nandri' });
    assert.equal(editor.value, 'vanakkam nandri', 'Pastes are not modified');
    type(' ');
    assert.equal(editor.value, 'vanakkam நன்றி ', 'Only word before Space converts');
    // Tamil script typed directly is always preserved.
    editor.value = 'தமிழ்';
    editor.setSelectionRange(editor.value.length, editor.value.length);
    editor.dispatch('input', { inputType: 'insertFromPaste', data: 'தமிழ்' });
    type(' ');
    assert.equal(editor.value, 'தமிழ் ');
    // Converting a selected sample remains a local operation.
    editor.value = 'vanakkam';
    editor.setSelectionRange(8, 8);
    editor.dispatch('input', { inputType: 'insertFromPaste', data: 'vanakkam' });
    type(' ');
    assert.equal(editor.value, 'வணக்கம் ');
  } finally {
    globalThis.setTimeout = nativeTimeout;
    globalThis.fetch = nativeFetch;
    URL.createObjectURL = originalCreateObjectURL;
    delete globalThis.__printed;
  }
});
