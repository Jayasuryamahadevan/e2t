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
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  removeAttribute(key) { delete this.attributes[key]; }
  focus() {}
  click() { this.dispatch('click'); }
  append() {}
  remove() {}
  replaceChildren(...children) { this.children = children; }
  setRangeText(replacement, start, end) {
    this.value = this.value.slice(0, start) + replacement + this.value.slice(end);
    this.selectionStart = this.selectionEnd = start + replacement.length;
  }
}

test('browser app handles phonetic typing, direct typing, PDF dialog and autosave without a server', async () => {
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
    for (const char of 'vanakkam nandri') type(char);
    assert.equal(editor.value, 'வணக்கம் நன்றி');
    assert.match(get('word-count').textContent, /2 words/);
    assert.match(get('character-count').textContent, /characters/);
    let blocked = false;
    editor.dispatch('beforeinput', { inputType: 'deleteContentBackward', preventDefault: () => { blocked = true; } });
    assert.equal(blocked, true);
    type('i');
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
    window.location.hash = '#desh';
    windowEvents.get('hashchange')();
    assert.equal(get('provider-panel').hidden, false);
    assert.equal(get('writer-workspace').hidden, true);
    assert.equal(get('provider-frame').getAttribute('src'), 'https://www.deshkeyboard.com/tamil-typing/');
    window.location.hash = '#translate';
    windowEvents.get('hashchange')();
    assert.equal(get('provider-external').href, 'https://www.easytamiltyping.com/english/to/tamil/translation');
    window.location.hash = '#writer';
    windowEvents.get('hashchange')();
    assert.equal(get('provider-frame').getAttribute('src'), null);
    get('mode-direct').click();
    type('a');
    assert.equal(editor.value, 'வணக்கம் நன்றிa');
  } finally {
    globalThis.setTimeout = nativeTimeout;
    URL.createObjectURL = originalCreateObjectURL;
    delete globalThis.__printed;
  }
});
