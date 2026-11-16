import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSourceUrl, publicReportPath, reportText, reportMailto } from '../src/lib/content-trust.mjs';
test('configured content sources reject untrusted and credentialed URLs', () => {
  assert.equal(contentSourceUrl('https://nbs.sk/topic/'), 'https://nbs.sk/topic/');
  for (const value of ['http://nbs.sk/', 'https://nbs.sk.evil.example/', 'https://name@nbs.sk/', 'javascript:alert(1)', 'https://evil.example/', 'https://nbs.sk:444/']) assert.equal(contentSourceUrl(value), null);
});
test('report uses only a concrete public route and approved step/category', () => {
  assert.equal(publicReportPath('/navody/prepis-auta/'), '/navody/prepis-auta/');
  for (const path of ['https://evil.example/', '/navody/prepis-auta/?name=secret', '/navody/../kontakt/', '/navody/foo/#x', '//evil.example/', '/moje-situacie/']) assert.throws(() => publicReportPath(path));
  assert.throws(() => reportText({path:'/navody/prepis-auta/', category:'fake'}));
  assert.throws(() => reportText({path:'/navody/prepis-auta/', category:'broken', step:'Krok 1\nsecret'}));
  assert.throws(() => reportText({path:'/navody/prepis-auta/', category:'broken', detail:'x'.repeat(1201)}));
  const text = reportText({path:'/navody/prepis-auta/', category:'broken', step:'Krok 2', detail:'Odkaz nefunguje.\u0000'});
  assert.match(text, /https:\/\/vsetko24.sk\/navody\/prepis-auta\//);
  assert.match(text, /Miesto: Krok 2/);
  assert.ok(!text.includes('\u0000'));
  assert.match(text, /Sám sa neodoslal/);
});
test('mailto encodes report content and cannot inject mail headers', () => {
  assert.throws(() => reportMailto('a@example.sk\r\nbcc:evil@example.sk', 'text'));
  assert.throws(() => reportMailto('a@example.sk', 'x'.repeat(1801)));
  const result = reportMailto('sukromie@vsetko24.sk', 'Text & bcc=evil@example.sk\nĽšč');
  assert.equal(new URL(result).searchParams.get('body'), 'Text & bcc=evil@example.sk\nĽšč');
  assert.equal(new URL(result).searchParams.get('bcc'), null);
});
