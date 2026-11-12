import assert from 'node:assert/strict';
export async function checkKeyboardAudit(browser,base){
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 try{
  await page.goto(base+'/',{waitUntil:'load'});
  assert.equal(await page.locator('main h1').count(),1,'Main landmark includes the page heading');
  assert.equal(await page.locator('main #search').count(),1,'Skip link does not bypass primary search');
  await page.keyboard.press('Tab');assert.equal(await page.locator('.skip').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Enter');assert.equal(await page.locator('main').evaluate(e=>e===document.activeElement),true,'Skip destination receives focus');
  await page.keyboard.press('Tab');assert.equal(await page.locator('#search').evaluate(e=>e===document.activeElement),true,'Search is the next keyboard action');
  await page.setViewportSize({width:340,height:234});
  const toggle=page.locator('.mobile-menu-toggle');await toggle.press('Enter');
  const menu=await page.locator('#site-nav').evaluate(e=>({height:e.getBoundingClientRect().height,bottom:e.getBoundingClientRect().bottom,overflow:getComputedStyle(e).overflowY,scrollable:e.scrollHeight>e.clientHeight}));
  assert.ok(menu.bottom<=234,JSON.stringify(menu));assert.equal(menu.overflow,'auto');assert.equal(menu.scrollable,true);
  await page.locator('.nav-more summary').press('Enter');
  const last=page.locator('#site-nav a[href="/faq/"]');await last.focus();
  const visible=await last.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('nav').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1;});
  assert.equal(visible,true,'Last menu link is reachable within the scrolled menu');
  await last.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/kalendar/',{waitUntil:'load'});
  await page.locator('#calendar-form button').press('Enter');assert.equal(await page.locator('#calendar-title').evaluate(e=>e===document.activeElement),true,'Invalid form focuses the missing title');
  await page.locator('#calendar-title').fill('Keyboard audit fixture');await page.locator('#calendar-date').fill('2026-12-01');await page.locator('#calendar-form button').press('Enter');
  await page.getByRole('button',{name:'Odstrániť termín: Keyboard audit fixture',exact:true}).press('Enter');
  assert.equal(await page.locator('#calendar-title').evaluate(e=>e===document.activeElement),true,'Delete does not strand focus on BODY');
  assert.match(await page.locator('#calendar-status').textContent(),/Termín odstránený/);
  console.log('Keyboard review regressions passed: main/skip/search, short viewport menu, Escape, form validation and delete focus');
 }finally{await page.close();}
}
