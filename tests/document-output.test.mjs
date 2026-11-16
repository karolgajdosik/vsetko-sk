import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPdfDocument } from '../src/lib/document-pdf.mjs';
import { caseDocumentDraft, documentMissingFields, documentTemplate } from '../src/lib/document-case.mjs';
const font = new Uint8Array(await readFile(new URL('../public/fonts/document-sans.ttf', import.meta.url)));

test('case draft uses only explicitly entered case values and preserves text as text', () => {
  const draft = caseDocumentDraft({kind:'car',title:'Auto <rodina>',values:{purchasePrice:12345.67,downPayment:0,monthlyIncome:9999}});
  assert.match(draft.subject, /Auto <rodina>/);
  assert.ok(draft.body.includes(new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'}).format(12345.67)));
  assert.doesNotMatch(draft.body,/9.?999/);
  assert.throws(()=>caseDocumentDraft({kind:'unknown',title:'x'}));
});
test('termination and complaint require identifying fields without breaking original generic drafts', () => {
  assert.deepEqual(documentMissingFields('request',{sender:'Test',body:'Text'}),[]);
  assert.deepEqual(documentMissingFields('termination',{sender:'Test',body:'Text'}),['recipient','subject','date','reference']);
  assert.ok(documentTemplate('complaint').body.includes('Opis zistenej vady'));
});
test('Unicode PDF embeds font, character mappings and valid xref offsets across pages', async () => {
  const blob=createPdfDocument('Žiadosť – Ľubomír Šťastný',['Číslo zmluvy: ČŽ-2026','Cena 12,50 €\nĎalší riadok',...Array(75).fill('Príliš žltučký kôň úpel ďábelské ódy.')],font);
  assert.equal(blob.type,'application/pdf');
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const source=new TextDecoder('latin1').decode(bytes);
  assert.ok(source.startsWith('%PDF-1.7'));
  assert.match(source,/\/FontFile2/);
  assert.match(source,/<[0-9a-f]{4}> <017D>/i);
  const marker=new TextEncoder().encode('xref\n');
  const start=Number(source.match(/startxref\n(\d+)/)[1]);
  assert.deepEqual(bytes.slice(start,start+marker.length),marker);
  const count=Number(source.match(/\/Type \/Pages \/Count (\d+)/)[1]);
  assert.ok(count>=2,'long documents paginate');
  const xref=source.slice(source.lastIndexOf('\nxref\n')+1).split('\n');
  const objectCount=Number(xref[1].split(' ')[1]);
  for(let id=1;id<objectCount;id++){
    const offset=Number(xref[id+2].slice(0,10));
    assert.equal(new TextDecoder().decode(bytes.slice(offset,offset+String(id).length+6)),id+' 0 obj');
  }
});
