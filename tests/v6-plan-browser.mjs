import assert from 'node:assert/strict';
export async function checkActionPlan(browser,origin){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL('/moj-plan/',origin).href);
  await page.locator('#plan-import').click();assert.match(await page.locator('#plan-import-status').innerText(),/Najprv potvrďte/);
  for(const [key,value] of Object.entries({income:2500,expenses:1800,reserve:1000,monthlySaving:200,targetMonths:3}))await page.locator('#plan-'+key).fill(String(value));
  await page.locator('#plan-form button[type=submit]').click();assert.match(await page.locator('#plan-summary').innerText(),/22 mesiacov/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('v24-personal-center-v1')),null);
  await page.locator('#plan-accept').click();assert.match(await page.locator('#plan-status').innerText(),/Vyberte/);
  await page.locator('#plan-steps input[value=reserve]').check();await page.locator('#plan-accept').click();assert.match(await page.locator('#plan-status').innerText(),/Pridané úlohy: 1/);
  await page.locator('#plan-accept').click();assert.match(await page.locator('#plan-status').innerText(),/Už existujúce kroky: 1/);
  await page.locator('#plan-reserve').fill('2000');assert.equal(await page.locator('#plan-results').isVisible(),false);
  await page.locator('#plan-form button[type=submit]').click();await page.locator('#plan-steps input[value=offers]').check();await page.evaluate(()=>localStorage.setItem('v24-personal-center-v1','broken'));await page.locator('#plan-accept').click();assert.equal(await page.evaluate(()=>localStorage.getItem('v24-personal-center-v1')),'broken');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  console.log('PASS V6 explicit explained action plan, selected acceptance, deduplication, invalidation and corrupt-storage preservation');
 }finally{await context.close();}
}
