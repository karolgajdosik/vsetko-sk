import test from 'node:test';
import assert from 'node:assert/strict';
import {guideNavigationFor} from '../functions/api/assistant-guide-routes.mjs';
import {onRequestPost} from '../functions/api/assistant.js';
import {trustedOfficialUrl} from '../src/lib/official-sources.mjs';

const post=question=>new Request('https://vsetko24.sk/api/assistant',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://vsetko24.sk'},body:JSON.stringify({question})});

test('narrow, accent-insensitive matches for Slovak mortgage, car transfer and inheritance',()=>{
 for(const [question,expected] of [
  ['Ako postupovať pri kúpe bytu a porovnaní hypoték?','/navody/porovnanie-hypotek/'],
  ['Ako vybaviť HYPOTÉKU?','/navody/porovnanie-hypotek/'],
  ['Čo potrebujem na prepis auta?','/navody/prepis-auta/'],
  ['Ako prepisat vozidlo?','/navody/prepis-auta/'],
  ['Čo treba na dedičské konanie?','/navody/dedicske-konanie/'],
  ['Ako vybaviť dedičstvo po úmrtí?','/navody/dedicske-konanie/']
 ]){
  const result=guideNavigationFor(question);
  assert.equal(result?.sources[0].url,expected,question);
  assert.equal(result.mode,'guide-navigation');
  assert.match(result.answer,/overte|overiť/);
  assert.doesNotMatch(result.answer,/\b(?:\d+\s*(?:eur|€|dní|dni)|povinn[eé]\s+do)\b/i);
 }
});

test('negative matches do not hijack unrelated, foreign or negated questions',()=>{
 for(const question of [
  'Ako urobiť prepis rozhovoru?',
  'Ako prepisat knihu?',
  'Ako funguje dedenie v Java?',
  'Čo je dedičstvo v programovaní?',
  'Čo treba na prepis auta v Česku?',
  'Ako vybaviť hypotéku v Rakúsku?',
  'Nechcem hypotéku, chcem porovnať leasing.',
  'Ako riešiť stratu občianskeho preukazu?',
  'Ako si vytvoriť finančnú rezervu?',
  'Koľko stojí prepis elektriny?'
 ])assert.equal(guideNavigationFor(question),null,question);
});

test('request validation remains in force and guide navigation works without paid AI binding',async()=>{
 const noModel={};
 const result=await onRequestPost({request:post('Čo potrebujem na prepis auta?'),env:noModel});
 assert.equal(result.status,200);
 const body=await result.json();
 assert.equal(body.mode,'guide-navigation');
 assert.equal(body.sources[0].url,'/navody/prepis-auta/');
 assert.ok(body.officialSources.every(x=>x.url.startsWith('https://www.slovensko.sk/')));
 assert.equal(result.headers.get('cache-control'),'no-store');
 const other=await onRequestPost({request:post('Aké je počasie?'),env:noModel});
 assert.equal(other.status,503);
 assert.equal((await other.json()).code,'not_configured');
 const foreign=await onRequestPost({request:new Request('https://vsetko24.sk/api/assistant',{method:'POST',headers:{'content-type':'application/json','origin':'https://evil.example'},body:JSON.stringify({question:'Čo potrebujem na prepis auta?'})}),env:noModel});
 assert.equal(foreign.status,403);
 const invalid=await onRequestPost({request:post('x'),env:noModel});
 assert.equal(invalid.status,400);
});

test('guide navigation links to verified, topic-specific official information without procedural claims',()=>{
 const expected=[
  ['Ako vybaviť hypotéku?','nbs.sk','/dohlad-nad-financnym-trhom/ofs/zivotne-situacie/chceme-byvat-sami/'],
  ['Čo potrebujem na prepis auta?','www.slovensko.sk','/sk/zivotne-situacie/zivotna-situacia/_elektronicke-sluzby-evidencie'],
  ['Čo treba na dedičské konanie?','www.justice.gov.sk','/agenda-ministerstva/civilne-pravo/civilny-mimosporovy-poriadok/']
 ];
 for(const [question,hostname,pathname] of expected){
  const guide=guideNavigationFor(question);
  assert.equal(guide?.mode,'guide-navigation');
  assert.equal(guide.officialSources?.length,1,question);
  const url=trustedOfficialUrl(guide.officialSources[0].url);
  assert.ok(url,question);
  assert.equal(new URL(url).hostname,hostname);
  assert.equal(new URL(url).pathname,pathname);
  assert.match(guide.answer,/overte|overiť/);
 }
});

test('official source validator blocks lookalike domains, credentials and unsafe schemes',()=>{
 for(const input of [
  'http://nbs.sk/', 'javascript:alert(1)',
  'https://nbs.sk.evil.example/', 'https://nbs.sk@evil.example/',
  'https://www.justice.gov.sk.evil.example/',
  'https://www.slovensko.sk:444/',
  'https://evil.example/?redirect=https://nbs.sk/',
  '/navody/prepis-auta/', null, {}
 ])assert.equal(trustedOfficialUrl(input),null,String(input));
 for(const url of ['https://nbs.sk/','https://www.slovensko.sk/','https://www.justice.gov.sk/']){
  assert.equal(trustedOfficialUrl(url),url);
 }
});
