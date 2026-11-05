import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../src/pages/byvanie.astro', import.meta.url), 'utf8');
test('bývanie hub has descriptive heading and accessible landmark', () => {
  assert.match(page, /<h1>Bývanie a nehnuteľnosti<\/h1>/);
  assert.match(page, /<main[^>]*id="obsah"/);
  assert.match(page, /aria-labelledby="byvanie-nastroje"/);
});
test('bývanie hub links to existing mortgage and calculators routes', () => {
  for (const route of ['/kalkulacky/dostupnost-hypoteky/', '/financie/porovnanie-hypotek/', '/kalkulacky/']) assert.ok(page.includes(route));
});
