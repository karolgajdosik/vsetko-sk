import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const faq=readFileSync(new URL('../src/pages/faq.astro',import.meta.url),'utf8');
test('FAQ has an accessible main target for the layout skip link',()=>{
 assert.match(faq,/<main[^>]*id="obsah"/);
 assert.match(faq,/<h1>Časté otázky<\/h1>/);
});
test('FAQ links to real internal destinations',()=>{
 const links=[...faq.matchAll(/href:'(\/[^']+)'/g)].map(m=>m[1]);
 assert.ok(links.length>=4);
 for(const link of links){
  const path=link.slice(1).replace(/\/$/,'');
  assert.ok(existsSync(root+'src/pages/'+path+'.astro')||existsSync(root+'src/pages/'+path+'/index.astro'),link);
 }
});
test('FAQ explicitly explains that calculators are indicative',()=>{
 assert.match(faq,/orientačné/);
 assert.match(faq,/oficiálnom webe/);
});
