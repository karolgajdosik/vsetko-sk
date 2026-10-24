import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4321';
try {
 for(const width of [375,768,1024,1280,1920]){
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
  await page.close();
 }
 console.log('Browser layout checks passed at 375, 768, 1024, 1280, 1920px');
} finally {await browser.close()}
