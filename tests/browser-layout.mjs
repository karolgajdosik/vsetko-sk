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
   assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','Mobile theme switch must work');
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
 console.log('Browser layout and mobile interaction checks passed across 7 widths and 10 sections');
} finally {await browser.close()}
