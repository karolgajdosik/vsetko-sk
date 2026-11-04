import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = readFileSync(new URL('../src/pages/zivot-a-vzdelavanie.astro', import.meta.url),'utf8');
const scenarios = JSON.parse(readFileSync(new URL('../src/data/scenarios.json', import.meta.url),'utf8'));
test('category hub has accessible sections and uses real scenario slugs',()=>{
  for(const id of ['praca','rodina','vzdelavanie']) assert.ok(file.includes("slug:'"+id+"'"));
  assert.match(file,/aria-labelledby=/);
  assert.match(file,/scenarios\.filter/);
  for(const cat of ['Rodina','Podnikanie']) assert.ok(scenarios.some(s=>s.category===cat));
});
test('unpublished education content is not represented as a finished guide',()=>{
  assert.match(file,/Prvé návody sa pripravujú/);
  assert.match(file,/\/sprievodca\//);
});
