// Browser-local Unicode PDF generation. The bundled DejaVu Sans font is embedded
// once per document; no network service receives the document text.
const encoder = new TextEncoder();
const textBytes = value => encoder.encode(value);
const joinBytes = parts => {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};
function readFont(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = offset => view.getUint16(offset);
  const i16 = offset => view.getInt16(offset);
  const u32 = offset => view.getUint32(offset);
  const tables = {};
  for (let i = 0; i < u16(4); i++) {
    const offset = 12 + i * 16;
    const tag = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    tables[tag] = u32(offset + 8);
  }
  if (!tables.head || !tables.hhea || !tables.hmtx || !tables.cmap) throw new Error('Neplatné písmo PDF.');
  const units = u16(tables.head + 18);
  const scale = value => Math.round(value * 1000 / units);
  const metricsCount = u16(tables.hhea + 34);
  const width = glyph => scale(u16(tables.hmtx + Math.min(glyph, metricsCount - 1) * 4));
  const maps = [];
  for (let i = 0; i < u16(tables.cmap + 2); i++) {
    const subtable = tables.cmap + u32(tables.cmap + 4 + i * 8 + 4);
    if ([4, 12].includes(u16(subtable))) maps.push(subtable);
  }
  maps.sort((a, b) => u16(b) - u16(a));
  const glyph = point => {
    for (const map of maps) {
      if (u16(map) === 12) {
        let low = 0, high = u32(map + 12) - 1;
        while (low <= high) {
          const mid = (low + high) >>> 1, record = map + 16 + mid * 12;
          const start = u32(record), end = u32(record + 4);
          if (point < start) high = mid - 1;
          else if (point > end) low = mid + 1;
          else return u32(record + 8) + point - start;
        }
      } else if (point <= 0xffff) {
        const count = u16(map + 6) / 2;
        const ends = map + 14, starts = ends + count * 2 + 2;
        const deltas = starts + count * 2, ranges = deltas + count * 2;
        for (let i = 0; i < count; i++) {
          if (point > u16(ends + 2 * i)) continue;
          if (point < u16(starts + 2 * i)) break;
          const delta = i16(deltas + 2 * i), range = u16(ranges + 2 * i);
          if (!range) return (point + delta) & 0xffff;
          const id = u16(ranges + 2 * i + range + (point - u16(starts + 2 * i)) * 2);
          return id ? (id + delta) & 0xffff : 0;
        }
      }
    }
    return 0;
  };
  return { glyph, width, bbox: [36, 38, 40, 42].map(offset => scale(i16(tables.head + offset))),
    ascent: scale(i16(tables.hhea + 4)), descent: scale(i16(tables.hhea + 6)) };
}
const utf16Hex = text => [...text].map(char => {
  const point = char.codePointAt(0);
  if (point <= 0xffff) return point.toString(16).padStart(4, '0');
  const value = point - 0x10000;
  return (0xd800 + (value >> 10)).toString(16) + (0xdc00 + (value & 1023)).toString(16);
}).join('').toUpperCase();

export function createPdfDocument(heading, paragraphs, fontData) {
  const fontBytes = fontData instanceof Uint8Array ? fontData : new Uint8Array(fontData);
  const font = readFont(fontBytes);
  const clean = value => String(value).replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '').replaceAll('\t', '    ');
  const records = [{ text: clean(heading), size: 17, gap: 14 }, ...paragraphs.map(text => ({ text: clean(text), size: 11, gap: 7 }))];
  const characters = [...new Set(records.flatMap(record => [...record.text]).filter(char => !/[\r\n]/.test(char)))];
  if (characters.length > 65000) throw new Error('Dokument obsahuje priveľa znakov.');
  const map = new Map(characters.map((char, index) => [char, { cid: index + 1, glyph: font.glyph(char.codePointAt(0)) }]));
  const unsupported = characters.filter(char => !map.get(char).glyph);
  if (unsupported.length) throw new Error('PDF písmo nepodporuje tieto znaky: ' + unsupported.slice(0, 8).join(' ') + '. Použite Word alebo tlač.');
  const width = (line, size) => [...line].reduce((sum, char) => sum + font.width(map.get(char).glyph) * size / 1000, 0);
  const lines = [];
  for (const record of records) {
    for (const paragraph of record.text.split(/\r\n?|\n/)) {
      let line = '';
      for (const word of paragraph.split(/(\s+)/)) {
        if (width(line + word, record.size) <= 475) { line += word; continue; }
        if (line.trim()) { lines.push({ text: line.trimEnd(), size: record.size, gap: 0 }); line = ''; }
        for (const char of word.trimStart()) {
          if (line && width(line + char, record.size) > 475) { lines.push({ text: line, size: record.size, gap: 0 }); line = ''; }
          line += char;
        }
      }
      lines.push({ text: line.trimEnd(), size: record.size, gap: 0 });
    }
    lines[lines.length - 1].gap = record.gap;
  }
  const objects = [];
  const add = content => { objects.push(typeof content === 'string' ? textBytes(content) : content); return objects.length; };
  const stream = (dictionary, bytes) => joinBytes([textBytes('<< ' + dictionary + ' /Length ' + bytes.length + ' >>\nstream\n'), bytes, textBytes('\nendstream')]);
  const catalog = add(''), pages = add('');
  const fontFile = add(stream('/Length1 ' + fontBytes.length, fontBytes));
  const descriptor = add('<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [' + font.bbox.join(' ') + '] /ItalicAngle 0 /Ascent ' + font.ascent + ' /Descent ' + font.descent + ' /CapHeight 729 /StemV 80 /FontFile2 ' + fontFile + ' 0 R >>');
  const cidBytes = new Uint8Array((characters.length + 1) * 2), cidView = new DataView(cidBytes.buffer);
  characters.forEach(char => { const entry = map.get(char); cidView.setUint16(entry.cid * 2, entry.glyph); });
  const cidMap = add(stream('', cidBytes));
  const unicodeChunks = [];
  for (let i = 0; i < characters.length; i += 100) {
    const chunk = characters.slice(i, i + 100);
    unicodeChunks.push(chunk.length + ' beginbfchar\n' + chunk.map(char => '<' + map.get(char).cid.toString(16).padStart(4, '0') + '> <' + utf16Hex(char) + '>').join('\n') + '\nendbfchar');
  }
  const unicode = add(stream('', textBytes('/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /VsetkoUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' + unicodeChunks.join('\n') + '\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend')));
  const widths = characters.map(char => font.width(map.get(char).glyph)).join(' ');
  const descendant = add('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ' + descriptor + ' 0 R /CIDToGIDMap ' + cidMap + ' 0 R /W [1 [' + widths + ']] >>');
  const fontObject = add('<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans /Encoding /Identity-H /DescendantFonts [' + descendant + ' 0 R] /ToUnicode ' + unicode + ' 0 R >>');
  const pageIds = [];
  let commands = [], y = 780;
  const finishPage = () => {
    const content = add(stream('', textBytes(commands.join('\n'))));
    pageIds.push(add('<< /Type /Page /Parent ' + pages + ' 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ' + fontObject + ' 0 R >> >> /Contents ' + content + ' 0 R >>'));
    commands = []; y = 780;
  };
  for (const line of lines) {
    if (y - line.size * 1.5 - line.gap < 58) finishPage();
    const encoded = [...line.text].map(char => map.get(char).cid.toString(16).padStart(4, '0')).join('');
    commands.push('BT /F1 ' + line.size + ' Tf 1 0 0 1 60 ' + y.toFixed(2) + ' Tm <' + encoded + '> Tj ET');
    y -= line.size * 1.5 + line.gap;
  }
  finishPage();
  objects[catalog - 1] = textBytes('<< /Type /Catalog /Pages ' + pages + ' 0 R >>');
  objects[pages - 1] = textBytes('<< /Type /Pages /Count ' + pageIds.length + ' /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] >>');
  const output = [new Uint8Array([37,80,68,70,45,49,46,55,10,37,226,227,207,211,10])], offsets = [0];
  let offset = output[0].length;
  objects.forEach((object, index) => {
    offsets.push(offset);
    const bytes = joinBytes([textBytes((index + 1) + ' 0 obj\n'), object, textBytes('\nendobj\n')]);
    output.push(bytes); offset += bytes.length;
  });
  output.push(textBytes('xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' + offsets.slice(1).map(value => value.toString().padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalog + ' 0 R >>\nstartxref\n' + offset + '\n%%EOF\n'));
  return new Blob(output, { type: 'application/pdf' });
}
