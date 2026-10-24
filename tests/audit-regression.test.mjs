import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('AI search splits on whitespace and removes Slovak accents',()=>{
 const source=read('src/pages/ai.astro');
 assert.match(source,/split\(\/\\s\+\/\)/);
 assert.match(source,/replace\(\/\[\\u0300-\\u036f\]\/g/);
 assert.doesNotMatch(source,/split\(\/\\\\s\+\/\)/);
});
test('suite uses local ISO dates instead of locale-specific date strings',()=>{
 const source=read('src/pages/nastroje/[slug].astro');
 assert.match(source,/function localDateISO\(/);
 assert.doesNotMatch(source,/toLocaleDateString\('en-CA'\)/);
});
test('header contains a more-menu and versioned CSS asset',()=>{
 const source=read('src/layouts/Base.astro');
 assert.match(source,/class="nav-more"/);
 assert.match(source,/site\.css\?v=4\.27\.0/);
});
