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
 assert.match(source,/site\.css\?v=4\.\d+\.\d+/);
});

test('all key portal sections use contextual photographic headers',()=>{
 const source=read('src/layouts/Base.astro');
 for(const section of ['financie','kalkulacky','auto','urady','navody','sprievodca','sluzby','nastroje','data','ai']){
  assert.ok(source.includes(section+':['),section+' should have an image');
 }
 assert.match(source,/class="section-photo"/);
});

test('mobile navigation provides five direct functional section links',()=>{
 const source=read('src/layouts/Base.astro');
 assert.match(source,/class="mobile-bottom-nav"/);
 assert.match(source,/class="mobile-quick-actions"/);
 for(const href of ['/sluzby/','/kalkulacky/','/ai/','/navody/','/moje-centrum/'])assert.ok(source.includes('href="'+href+'"'));
 const css=read('public/site.css');
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.mobile-bottom-nav/);
});

test('mobile accessibility controls and guide index are functional',()=>{
 const source=read('src/layouts/Base.astro');
 assert.match(source,/id="mobile-theme-toggle"/);
 assert.match(source,/id="mobile-font-up"/);
 assert.match(source,/getElementById\('mobile-theme-toggle'\)/);
 assert.match(source,/getElementById\('mobile-font-up'\)/);
 assert.match(read('src/pages/navody/index.astro'),/guides\.map/);
});

test('sitemap includes all main navigable section indexes and key comparison tools',()=>{
 const sitemap=read('src/pages/sitemap.xml.ts');
 for(const route of ['/navody/','/kalkulacky/','/financie/porovnanie-hypotek/','/auto/porovnanie-nakladov/','/pristupnost/']){
  assert.ok(sitemap.includes("'"+route+"'"),'Sitemap missing '+route);
 }
});

test('page titles use current brand and theme toggle exposes accessible state',()=>{
 const base=read('src/layouts/Base.astro');
 assert.match(base,/title === 'VŠETKO24.sk'/);
 assert.match(base,/id="mobile-theme-toggle" aria-pressed="false"/);
 assert.match(base,/noindex,follow/);
 assert.match(read('src/pages/404.astro'),/VŠETKO24.sk/);
});

test('homepage and fulltext use the same ranked search module',()=>{
 const home=read('src/pages/index.astro');
 const fulltext=read('src/pages/hladat.astro');
 assert.match(home,/import \{searchPortal\} from '\.\.\/lib\/search\.mjs'/);
 assert.match(fulltext,/import \{searchPortal\} from '\.\.\/lib\/search\.mjs'/);
});

test('obsolete mortgage calculator URL redirects to a published calculator',()=>{
 const redirects=read('public/_redirects');
 assert.match(redirects,/\/kalkulacky\/hypoteka\/\s+\/kalkulacky\/dostupnost-hypoteky\/\s+301/);
 const home=read('src/pages/index.astro');
 assert.doesNotMatch(home,/href="\/kalkulacky\/hypoteka\/"/);
 const calculators=JSON.parse(read('src/data/calculators.json'));
 assert.ok(calculators.some(x=>x.slug==='dostupnost-hypoteky'));
});
