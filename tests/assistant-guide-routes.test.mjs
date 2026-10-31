import test from 'node:test';
import assert from 'node:assert/strict';
import {guideNavigationFor} from '../functions/api/assistant-guide-routes.mjs';
import {onRequestPost} from '../functions/api/assistant.js';

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
