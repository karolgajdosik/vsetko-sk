import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4321';
try {
 for(const width of [320,375,430,768,1024,1280,1920]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.locator('.hero-art').evaluate(img=>img.decode());
  const info=await page.evaluate(()=>{
   const nav=document.querySelector('#site-nav'),header=document.querySelector('.top'),tiles=document.querySelector('.home-highlights');
   const links=[...nav.querySelectorAll(':scope > a')];
   const rects=links.map(el=>el.getBoundingClientRect());
   return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,headerHeight:header.getBoundingClientRect().height,
    navVisible:getComputedStyle(nav).display!=='none',rows:new Set(rects.map(r=>Math.round(r.top))).size,
    tilesColumns:tiles?getComputedStyle(tiles).gridTemplateColumns.split(' ').length:0};
  });
  assert.ok(info.scroll<=width+1,`Horizontal overflow at ${width}px: ${JSON.stringify(info)}`);
  if(width>760){assert.equal(info.rows,1,`Navigation wraps at ${width}px`);assert.ok(info.headerHeight<110,`Header too tall at ${width}px`)}
  if(width<=620)assert.equal(info.tilesColumns,1,`Homepage highlights should stack at ${width}px`);
  if(width>=1024)assert.equal(info.tilesColumns,2,`Homepage highlights should have two columns at ${width}px`);
  await page.screenshot({path:`layout-${width}.png`,fullPage:true});
  if(width<=430){
   const bottom=page.locator('.mobile-bottom-nav');
   assert.equal(await bottom.locator('a').count(),5,'Mobile dock must have five links');
   assert.ok(await bottom.isVisible(),'Mobile dock must be visible');
   await page.locator('#mobile-theme-toggle').click();
   assert.equal(await page.locator('#mobile-theme-toggle').getAttribute('aria-pressed'),'true','Mobile theme button state must be announced');
   assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','Mobile theme switch must work');
   await page.locator('#mobile-theme-toggle').click();
   assert.equal(await page.locator('#mobile-theme-toggle').getAttribute('aria-pressed'),'false','Mobile theme button must reset');
   await page.locator('#mobile-font-up').click();
   const fontSize=await page.locator('html').evaluate(el=>parseInt(el.style.fontSize,10));
   assert.ok(fontSize>=110,'Mobile font increase must work');
   await page.locator('.mobile-menu-toggle').click();
   assert.equal(await page.locator('.mobile-menu-toggle').getAttribute('aria-expanded'),'true','Mobile menu should open');
   await page.locator('.mobile-menu-toggle').click();
   await page.evaluate(()=>{localStorage.removeItem('v24-theme');localStorage.removeItem('v24-font')});
  }
  await page.close();
 }
 for(const width of [320,375,430,768,1024]){
  const page=await browser.newPage({viewport:{width,height:850}});
  for(const route of ['/sluzby/','/kalkulacky/','/navody/','/sprievodca/','/moje-centrum/','/financie/','/auto/','/urady/','/ai/','/hladat/']){
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,`Broken page ${route}`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=1,`Horizontal overflow at ${width}px on ${route}: ${overflow}px`);
   if(width<=430)assert.ok(await page.locator('.mobile-bottom-nav').isVisible(),`Missing mobile dock on ${route}`);
  }
  await page.close();
 }
 // End-to-end visitor journeys: homepage search, results and unknown query.
 {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#search').fill('hypotéka');
  await page.locator('#search-form button[type="submit"]').click();
  await page.waitForURL(url=>url.pathname==='/hladat/' && url.searchParams.has('q'));
  assert.equal(await page.locator('#fulltext').inputValue(),'hypotéka','Search term must survive navigation');
  assert.ok(await page.locator('.finder-result').count()>0,'Known topic must return results');
  await page.locator('#fulltext').fill('zzzxqvnomatchunique');
  await page.locator('#fulltext-form button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('#no-match')?.hidden===false && document.querySelectorAll('.finder-result').length===0,null,{timeout:5000});
  assert.ok(await page.locator('#no-match').isVisible(),'No-match feedback must be visible');
  await page.close();
 }
 // Audit all calculator pages using real browser input events on mobile and desktop.
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:850}});
  for(const slug of ['splatka-uveru','refinancovanie','sporenie','zlozene-urocenie','inflacia','financna-rezerva','dostupnost-hypoteky','rozpocet-na-dovolenku','cena-cesty','cena-nabijania','ev-vs-benzin','leasing','odpis-hodnoty-auta','servisny-rozpocet','rocny-najazd']){
   const response=await page.goto(base+'/kalkulacky/'+slug+'/',{waitUntil:'load'});
   assert.equal(response.status(),200,'Calculator page missing: '+slug);
   const primary=page.locator('#primary-result');
   await assert.doesNotReject(()=>primary.waitFor({state:'visible'}));
   const before=await primary.textContent();
   assert.ok(before&&!before.endsWith('—'),'Calculator has no initial result: '+slug);
   const first=page.locator('#calculator input').first();
   const value=Number(await first.inputValue());
   await first.fill(String(value+100));
   const after=await primary.textContent();
   assert.notEqual(after,before,'Calculator does not update after input: '+slug);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=1,'Calculator horizontal overflow: '+slug+' at '+width+'px');
  }
  await page.goto(base+'/kalkulacky/naklady-na-auto/',{waitUntil:'load'});
  const annual=page.locator('#annual');
  const initial=await annual.textContent();
  await page.locator('#type').selectOption('ev');
  assert.ok((await page.locator('label[for="consumption"]').textContent()).includes('kWh'),'EV consumption unit not updated');
  assert.notEqual(await annual.textContent(),initial,'Car costs do not update on drivetrain change');
  await page.locator('#km').fill('20000');
  assert.ok((await annual.textContent())!=='—','Car costs result missing after input');
  await page.close();
 }
 // Phase 3: essential user journeys in the three primary hubs.
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:850}});
  await page.goto(base+'/financie/',{waitUntil:'load'});
  const originalPayment=await page.locator('#payment').textContent();
  assert.ok(originalPayment&&!originalPayment.includes('—'),'Mortgage result must be calculated');
  await page.locator('#amount').fill('250000');
  assert.notEqual(await page.locator('#payment').textContent(),originalPayment,'Mortgage slider must recalculate');
  await page.locator('#income').fill('3000');
  await page.locator('#expenses').fill('2000');
  assert.ok((await page.locator('#balance').textContent()).includes('1 000')||(await page.locator('#balance').textContent()).replace(/\\s/g,'').includes('1000'),'Budget must show EUR 1000 balance');
  await page.goto(base+'/data/hypoteky-nbs/',{waitUntil:'load'});
  const mortgageLink=page.getByRole('link',{name:'Otvoriť kalkulačku'});
  await mortgageLink.click();
  await page.waitForURL(url=>url.pathname==='/financie/'&&url.hash==='#hypoteka');
  await page.goto(base+'/auto/',{waitUntil:'load'});
  assert.ok(await page.locator('a[href="/kalkulacky/naklady-na-auto/"]').count()>0,'Car costs tool must be discoverable');
  await page.locator('a[href="/kalkulacky/naklady-na-auto/"]').first().click();
  await page.waitForURL(url=>url.pathname==='/kalkulacky/naklady-na-auto/');
  assert.ok(await page.locator('#annual').isVisible(),'Car costs result must be visible');
  await page.goto(base+'/urady/',{waitUntil:'load'});
  const guide=page.locator('a[href="/navody/vybavenie-po-umrti/"]').first();
  assert.ok(await guide.isVisible(),'Office guide must be discoverable');
  await guide.click();
  await page.waitForURL(url=>url.pathname==='/navody/vybavenie-po-umrti/');
  assert.ok(await page.locator('h1').isVisible(),'Office guide heading must be visible');
  await page.close();
 }
 // Phase 4: real visitor flows, including zero-interest mortgage and negative budget.
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:850}});
  await page.goto(base+'/financie/',{waitUntil:'load'});
  await page.locator('#amount').fill('120000');
  await page.locator('#rate').fill('0');
  await page.locator('#years').fill('10');
  const payment=(await page.locator('#payment').textContent()).replace(/[^0-9,]/g,'');
  assert.ok(payment.startsWith('1000'),'Zero-interest mortgage must cost 1000 EUR monthly: '+payment);
  await page.locator('#income').fill('1000');
  await page.locator('#expenses').fill('1500');
  assert.ok((await page.locator('#balance').textContent()).includes('-500'),'Negative monthly budget must remain visible');
  await page.goto(base+'/hladat/?q='+encodeURIComponent('občiansky preukaz'),{waitUntil:'load'});
  assert.equal(await page.locator('#fulltext').inputValue(),'občiansky preukaz');
  assert.ok(await page.locator('.finder-result').count()>0,'Official-document query must return results');
  await page.locator('#fulltext').fill('neexistujucetema987654321');
  await page.locator('#fulltext-form button').click();
  assert.ok(await page.locator('#no-match').isVisible(),'Unknown search must show no-results message');
  await page.goto(base+'/kontakt/',{waitUntil:'load'});
  assert.ok(await page.getByRole('heading',{name:'Kontakt a spätná väzba'}).isVisible());
  assert.ok(await page.getByText('nemáme zverejnený kontaktný e-mail ani kontaktný formulár',{exact:false}).isVisible(),'Contact page must disclose missing contact channel');
  await page.close();
 }
 console.log('Browser layout and mobile interaction checks passed across 7 widths and 10 sections');
} finally {await browser.close()}
