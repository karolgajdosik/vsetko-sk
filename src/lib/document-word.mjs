// Small, uncompressed ZIP package. DOCX needs three XML parts and no server.
const encoder = new TextEncoder();
const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const contentTypes = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const relationships = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipXml(parts) {
  const local = [];
  const directory = [];
  let offset = 0;
  let directorySize = 0;
  for (const [path, xml] of parts) {
    const name = encoder.encode(path);
    const data = encoder.encode(declaration + xml);
    const checksum = crc32(data);
    const header = new Uint8Array(30);
    const record = new DataView(header.buffer);
    record.setUint32(0, 0x04034b50, true);
    record.setUint16(4, 20, true); // minimum ZIP reader version
    record.setUint16(12, 33, true); // DOS date 1980-01-01
    record.setUint32(14, checksum, true);
    record.setUint32(18, data.length, true);
    record.setUint32(22, data.length, true);
    record.setUint16(26, name.length, true);
    local.push(header, name, data);

    const central = new Uint8Array(46);
    const entry = new DataView(central.buffer);
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    central.set(header.subarray(4), 6); // same compression, timestamp, CRC and sizes
    entry.setUint32(42, offset, true);
    directory.push(central, name);
    directorySize += central.length + name.length;
    offset += header.length + name.length + data.length;
  }
  const end = new Uint8Array(22);
  const trailer = new DataView(end.buffer);
  trailer.setUint32(0, 0x06054b50, true);
  trailer.setUint16(8, parts.length, true);
  trailer.setUint16(10, parts.length, true);
  trailer.setUint32(12, directorySize, true);
  trailer.setUint32(16, offset, true);
  return new Blob([...local, ...directory, end], { type: mime });
}

function xmlText(text) {
  // XML 1.0 excludes control characters and unpaired UTF-16 surrogates.
  return text.replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function createWordDocument(heading, paragraphs) {
  const title = '<w:p><w:pPr><w:spacing w:after="320"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>' + xmlText(heading) + '</w:t></w:r></w:p>';
  const body = paragraphs.flatMap(text => text.split(/\r\n?|\n/)).map(line =>
    '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:t xml:space="preserve">' + xmlText(line) + '</w:t></w:r></w:p>'
  ).join('');
  const section = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
  const document = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + title + body + section + '</w:body></w:document>';
  return zipXml([['[Content_Types].xml', contentTypes], ['_rels/.rels', relationships], ['word/document.xml', document]]);
}
