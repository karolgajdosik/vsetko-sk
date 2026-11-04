import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const taxonomy=JSON.parse(readFileSync(new URL('../src/data/content-taxonomy.json',import.meta.url),'utf8'));
const scenarios=JSON.parse(readFileSync(new URL('../src/data/scenarios.json',import.meta.url),'utf8'));
test('six unique canonical content categories',()=>{
 assert.equal(taxonomy.categories.length,6);
 assert.equal(new Set(taxonomy.categories.map(x=>x.slug)).size,6);
 for(const c of taxonomy.categories){assert.match(c.slug,/^[a-z-]+$/);assert.ok(c.title);assert.ok(['active','planned'].includes(c.status));}
});
test('mapped scenario categories exist and planned education is not claimed active',()=>{
 const names=new Set(scenarios.map(x=>x.category));
 for(const c of taxonomy.categories) for(const tag of c.scenarioCategories) assert.ok(names.has(tag),tag);
 const edu=taxonomy.categories.find(x=>x.slug==='vzdelavanie');
 assert.equal(edu.status,'planned');assert.deepEqual(edu.scenarioCategories,[]);
});
