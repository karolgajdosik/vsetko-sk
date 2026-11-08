import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const operations=JSON.parse(await readFile('src/data/site-operations.json','utf8'));
const origin=process.env.VSETKO_ORIGIN??'https://vsetko24.sk';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 for(const route of ['/kontakt/','/ochrana-sukromia/','/pristupnost/']){
  const response=await page.goto(origin+route,{waitUntil:'networkidle',timeout:30000});
  assert.equal(response?.status(),200,route);
  const main=page.locator('main');
  await main.getByText(operations.privacyEmail,{exact:true}).waitFor({state:'visible'});
  const text=await main.innerText();
  assert.ok(text.includes(operations.operator),route+' operator');
  if(operations.privacyEmailActive){assert.ok(operations.privacyEmailVerifiedAt);assert.equal(await main.locator('a[href="mailto:'+operations.privacyEmail+'"]').count(),1,route+' email link');}
  else {assert.ok(text.includes('čaká na aktiváciu'),route+' pending state');assert.equal(await main.locator('a[href="mailto:'+operations.privacyEmail+'"]').count(),0,route+' inactive email must not invite sending');}
  console.log('PASS rendered privacy contact '+route);
 }
}finally{await browser.close();}
