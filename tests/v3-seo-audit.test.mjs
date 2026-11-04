import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('sitemap includes dynamic guides, calculators and life situations', () => {
  const sitemap = source('src/pages/sitemap.xml.ts');
  assert.match(sitemap, /guides\.map\(g=>`\/navody\/\$\{g\.slug\}\/`\)/);
  assert.match(sitemap, /calculators\.map\(t=>`\/kalkulacky\/\$\{t\.slug\}\/`\)/);
  assert.match(sitemap, /scenarios\.map\(s=>`\/sprievodca\/\$\{s\.slug\}\/`\)/);
  assert.match(sitemap, /application\/xml; charset=utf-8/);
});

test('canonical and Open Graph URLs use the same absolute site path', () => {
  const layout = source('src/layouts/Base.astro');
  assert.match(layout, /const canonical = new URL\(path, Astro\.site \?\? 'https:\/\/vsetko24\.sk'\)\.href/);
  assert.match(layout, /rel="canonical" href=\{canonical\}/);
  assert.match(layout, /property="og:url" content=\{canonical\}/);
});

test('robots advertises the sitemap and avoids blocking public content', () => {
  const robots = source('src/pages/robots.txt.ts');
  assert.match(robots, /Sitemap:/);
  assert.doesNotMatch(robots, /Disallow:\s*\/\s*['"`]/);
});
