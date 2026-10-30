import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getRepairedGuideRoutes,repairedSearchTargets} from '../scripts/production-guide-routes.mjs';
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
  assert.match(route.markers[0],/^<h1>.+<\/h1>$/);
 }
});

test('production smoke fails closed if a repaired search destination disappears',()=>{
 const withoutSearch=search.filter(item=>item.url!=='/navody/prepis-auta/');
 assert.throws(()=>getRepairedGuideRoutes(withoutSearch,guides),/Missing repaired search destination/);
 const withoutGuide=guides.filter(guide=>guide.slug!=='stk-priprava');
 assert.throws(()=>getRepairedGuideRoutes(search,withoutGuide),/Missing published guide/);
});
