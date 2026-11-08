import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getRepairedGuideRoutes,repairedSearchTargets,getPracticalGuideRoutes,practicalGuideSlugs} from '../scripts/production-guide-routes.mjs';
const search=JSON.parse(readFileSync(new URL('../src/data/search.json',import.meta.url),'utf8'));
const guides=JSON.parse(readFileSync(new URL('../src/data/guides.json',import.meta.url),'utf8'));

test('production smoke monitors all nine repaired Auto and Úrady search destinations',()=>{
 const routes=getRepairedGuideRoutes(search,guides);
 assert.equal(routes.length,9);
 assert.equal(new Set(routes.map(route=>route.path)).size,9);
 assert.deepEqual(routes.map(route=>route.path),repairedSearchTargets.map(([,slug])=>'/navody/'+slug+'/'));
 for(const route of routes){
  assert.match(route.path,/^\/navody\/[a-z0-9-]+\/$/);
  assert.equal(route.markers.length,1);
  assert.equal(typeof route.markers[0].heading,'string');
  assert.ok(route.markers[0].heading.length>5);
 }
});

test('production smoke fails closed if a repaired search destination disappears',()=>{
 const withoutSearch=search.filter(item=>item.url!=='/navody/prepis-auta/');
 assert.throws(()=>getRepairedGuideRoutes(withoutSearch,guides),/Missing repaired search destination/);
 const withoutGuide=guides.filter(guide=>guide.slug!=='stk-priprava');
 assert.throws(()=>getRepairedGuideRoutes(search,withoutGuide),/Missing published guide/);
});

test('Astro scoped H1 attributes and nested spans do not cause false production outages',async()=>{
 const {hasProductionMarker,productionMarkerLabel}=await import('../scripts/production-ui-markers.mjs');
 const marker={heading:'Prepis auta na Slovensku'};
 assert.equal(hasProductionMarker('<main><h1 data-astro-cid-xyz="">Prepis auta na Slovensku</h1></main>',marker),true);
 assert.equal(hasProductionMarker('<h1 class="title"><span>Prepis auta</span> na Slovensku</h1>',marker),true);
 assert.equal(hasProductionMarker('<h1>Iný návod</h1>',marker),false);
 assert.equal(hasProductionMarker('<h2>Prepis auta na Slovensku</h2>',marker),false);
 assert.equal(hasProductionMarker('<h1>Prepis auta na Slovensku</h1>','<h1>Prepis auta na Slovensku</h1>'),true);
 assert.equal(productionMarkerLabel(marker),'H1 heading: Prepis auta na Slovensku');
});


test('production smoke covers all four merged backlog practical guides',()=>{
 const routes=getPracticalGuideRoutes(guides);
 assert.deepEqual(routes.map(route=>route.path),practicalGuideSlugs.map(slug=>'/navody/'+slug+'/'));
 for(const route of routes){
  assert.equal(route.markers.length,2);
  assert.equal(route.markers[1].practicalTitles.length,5);
  assert.ok(route.markers[1].practicalTitles.every(title=>title.length>8));
 }
 assert.throws(()=>getPracticalGuideRoutes(guides.filter(guide=>guide.slug!=='domace-nabijanie')),/Missing practical guide/);
 const broken=guides.map(guide=>guide.slug==='stk-priprava'?{...guide,practical:[]}:guide);
 assert.throws(()=>getPracticalGuideRoutes(broken),/Missing practical advice/);
});

test('production practical marker requires visible tips inside section and TOC navigation',async()=>{
 const {hasProductionMarker,productionMarkerLabel}=await import('../scripts/production-ui-markers.mjs');
 const marker={practicalTitles:['Overte úrok & poplatky','Porovnajte všetky náklady']};
 const section='<section class="panel" data-astro-cid="abc" id="prakticke-tipy"><h2>Praktické rady</h2><article><h3 data-astro-cid="abc">Overte úrok &amp; poplatky</h3><p>Porovnajte podmienky banky vrátane všetkých súvisiacich nákladov.</p></article><article><h3>Porovnajte všetky náklady</h3><p>Skontrolujte poplatky, dobu splatnosti a ďalšie požiadavky banky.</p></article></section>';
 const nav='<nav aria-label="Obsah návodu"><a href="#prakticke-tipy">Praktické rady</a></nav>';
 assert.equal(hasProductionMarker(nav+section,marker),true);
 assert.equal(hasProductionMarker(section,marker),false,'Missing navigation must fail');
 assert.equal(hasProductionMarker(nav+section.replace('id="prakticke-tipy"','id="ine"'),marker),false,'Missing section must fail');
 assert.equal(hasProductionMarker(nav+section.replace('Porovnajte všetky náklady</h3>','Iný text</h3>'),marker),false,'Changed heading must fail');
 assert.equal(hasProductionMarker(nav+section.replace('Skontrolujte poplatky, dobu splatnosti a ďalšie požiadavky banky.','Krátke.'),marker),false,'Missing actionable paragraph must fail');
 assert.equal(productionMarkerLabel(marker),'Practical tips section and navigation (2 tips)');
});
