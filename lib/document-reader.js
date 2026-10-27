import { MAX_TEXT_LENGTH } from './translation-api.js';

const MAX_DOCUMENT_BYTES = 8_000_000;
const JSZIP_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';
const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const PDF_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

function checkLength(text) {
  if (!text.trim()) throw new Error('No selectable text found in this document. Scanned PDFs need OCR.');
  if (Array.from(text).length > MAX_TEXT_LENGTH) throw new Error('Document contains over 10,000 characters. Translate a smaller section instead.');
  return text;
}

function extractWordXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('This Word document is invalid or damaged.');
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  return Array.from(doc.getElementsByTagNameNS(ns, 'p')).map(p => {
    let str = '';
    const walk = node => {
      for (const child of node.childNodes) {
        if (child.namespaceURI === ns && child.localName === 't') str += child.textContent;
        else if (child.namespaceURI === ns && child.localName === 'tab') str += '\t';
        else if (child.namespaceURI === ns && ['br', 'cr'].includes(child.localName)) str += '\n';
        else walk(child);
      }
    };
    walk(p);
    return str;
  }).join('\n');
}

export async function extractDocumentText(file, { importer = u => import(u) } = {}) {
  if (!file?.name || !Number.isFinite(file.size) || file.size === 0 || file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('Choose a non-empty document smaller than 8 MB.');
  }
  const extension = file.name.split('.').pop().toLowerCase();
  if (['txt', 'md'].includes(extension)) return checkLength((await file.text()).replace(/^\uFEFF/, ''));
  if (extension === 'docx') {
    let ZIP;
    try { ZIP = (await importer(JSZIP_URL)).default; } catch { throw new Error('Cannot load Word reader. Connect to the internet and retry.'); }
    const archive = await ZIP.loadAsync(await file.arrayBuffer());
    const entry = archive.file('word/document.xml');
    if (!entry) throw new Error('No text document found inside the Word file.');
    return checkLength(extractWordXml(await entry.async('string')));
  }
  if (extension === 'pdf') {
    let pdfjs;
    try { pdfjs = await importer(PDFJS_URL); } catch { throw new Error('Cannot load PDF reader. Connect to the internet and retry.'); }
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    const pdf = await pdfjs.getDocument({data: new Uint8Array(await file.arrayBuffer())}).promise;
    try {
      const lines = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        let line = '';
        for (const item of content.items) {
          line += item.str || '';
          if (item.hasEOL) { lines.push(line); line = ''; }
        }
        if (line) lines.push(line);
        lines.push('');
        if (lines.join('\n').length > MAX_TEXT_LENGTH) throw new Error('Document contains over 10,000 characters. Translate a smaller section instead.');
      }
      return checkLength(lines.join('\n').trim());
    } finally { await pdf.destroy(); }
  }
  throw new Error('Supported documents: TXT, Markdown, Word (.docx), PDF (selectable text).');
}
