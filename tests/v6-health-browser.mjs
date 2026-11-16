import assert from 'node:assert/strict';
export async function checkFinanceHealth(browser,origin){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(origin+'/financie/kontrola/',{waitUntil:'domcontentloaded'});
  const values={income:2500,expenses:1500,reserve:3000,debtPayments:400,targetMonths:6,savingMonthly:250};
  for(const [key,value] of Object.entries(values))await page.locator('#health-'+key).fill(String(value));
  await page.locator('#health-form button[type=submit]').click();
  assert.equal(await page.locator('#health-results').isVisible(),true);
  const metrics=await page.locator('#health-metrics').innerText();assert.match(metrics,/24 mesiacov/);assert.match(metrics,/16 %/);
  await page.locator('#health-income').fill('1000');assert.equal(await page.locator('#health-results').isVisible(),false);
  await page.locator('#health-form button[type=submit]').click();assert.match(await page.locator('#health-plan-status').innerText(),/presahuje/);
  await page.locator('#health-debtPayments').fill('2000');await page.locator('#health-form button[type=submit]').click();assert.match(await page.locator('#health-status').innerText(),/nesmú byť vyššie/);assert.equal(await page.locator('#health-results').isVisible(),false);
  await page.locator('#health-form details summary').click();await page.locator('#health-import').click();assert.match(await page.locator('#health-import-status').innerText(),/Najprv/);
  await page.evaluate(()=>localStorage.setItem('v24-personal-center-v1',JSON.stringify({version:1,tasks:[],deadlines:[],budget:{income:3000,housing:700,loans:400,food:300,transport:100,other:100}})));
  await page.locator('#health-import-consent').check();await page.locator('#health-import').click();assert.equal(await page.locator('#health-income').inputValue(),'3000');assert.equal(await page.locator('#health-expenses').inputValue(),'1600');assert.equal(await page.locator('#health-debtPayments').inputValue(),'400');
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#health-form button[type=reset]').click();assert.equal(await page.locator('#health-income').inputValue(),'');assert.equal(await page.locator('#health-results').isVisible(),false);assert.deepEqual(errors,[]);
  console.log('PASS V6 financial check: cents, deficit, debt validation, explicit local import, stale-result reset and mobile layout');
 }finally{await context.close();}
}
