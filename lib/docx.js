const encoder = new TextEncoder();

function escapeXml(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function crc32(data) {
  let crc = -1;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}

function zipFiles(files) {
  const parts = [];
  const central = [];
  let offset = 0;

  for (const [path, text] of Object.entries(files)) {
    const name = encoder.encode(path);
    const data = encoder.encode(text);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const header = new DataView(local.buffer);
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 0x0800, true);
    header.setUint16(8, 0, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, name.length, true);
    local.set(name, 30);
    parts.push(local, data);

    const directory = new Uint8Array(46 + name.length);
    const record = new DataView(directory.buffer);
    record.setUint32(0, 0x02014b50, true);
    record.setUint16(4, 20, true);
    record.setUint16(6, 20, true);
    record.setUint16(8, 0x0800, true);
    record.setUint16(10, 0, true);
    record.setUint32(16, crc, true);
    record.setUint32(20, data.length, true);
    record.setUint32(24, data.length, true);
    record.setUint16(28, name.length, true);
    record.setUint32(42, offset, true);
    directory.set(name, 46);
    central.push(directory);
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((size, entry) => size + entry.length, 0);
  const end = new Uint8Array(22);
  const last = new DataView(end.buffer);
  last.setUint32(0, 0x06054b50, true);
  last.setUint16(8, central.length, true);
  last.setUint16(10, central.length, true);
  last.setUint32(12, centralSize, true);
  last.setUint32(16, offset, true);

  const zip = new Uint8Array(offset + centralSize + end.length);
  let position = 0;
  for (const part of [...parts, ...central, end]) {
    zip.set(part, position);
    position += part.length;
  }
  return zip;
}

function paragraph(text, style = '') {
  const segments = text.split('\t');
  const runs = segments.map((segment, index) =>
    `${index ? '<w:r><w:tab/></w:r>' : ''}<w:r><w:t xml:space="preserve">${escapeXml(segment)}</w:t></w:r>`
  ).join('');
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${runs}</w:p>`;
}

export function documentXml(title, body) {
  const lines = String(body).replace(/\r\n?/g, '\n').split('\n');
  const content = [paragraph(title || 'Untitled document', 'Title'), ...lines.map(line => paragraph(line))].join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${content}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

export function createDocx(title, body) {
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/document.xml': documentXml(title, body),
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'word/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Noto Sans Tamil" w:hAnsi="Noto Sans Tamil" w:eastAsia="Noto Sans Tamil" w:cs="Noto Sans Tamil"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ta-IN" w:eastAsia="ta-IN" w:bidi="ta-IN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="340" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="360"/></w:pPr><w:rPr><w:b/><w:sz w:val="38"/><w:szCs w:val="38"/></w:rPr></w:style></w:styles>`,
  };
  return zipFiles(files);
}

export function safeFileName(title, extension) {
  const name = String(title).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/[. ]+$/g, '').trim().slice(0, 80);
  return `${name || 'tamil-document'}.${extension}`;
}
