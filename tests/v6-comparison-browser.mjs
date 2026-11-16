import assert from 'node:assert/strict';
export async function checkDecisionComparison(browser,origin){
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/porovnanie-rozhodnuti/',{waitUntil:'domcontentloaded'});
 for(const [id,value] of Object.entries({title:'Rodinné auto','0-name':'Hotovosť','1-name':'Úver','0-upfront':'24000','0-monthly':'100','0-residual':'12000','1-upfront':'4000','1-monthly':'100','1-residual':'12000','1-principal':'20000','1-loanMonths':'48',months:'24'}))await page.locator('#decision-'+id).fill(value);
 await page.locator('#decision-form button[type=submit]').click();await page.locator('#decision-result').waitFor({state:'visible'});assert.match(await page.locator('#decision-verdict').innerText(),/rovnaké/);
 await page.locator('#decision-save').click();assert.match(await page.locator('#decision-status').innerText(),/uložené/);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#decision-saved').getByRole('button',{name:'Rodinné auto',exact:true}).click();assert.equal(await page.locator('#decision-1-principal').inputValue(),'20000');
 await page.locator('#decision-form button[type=submit]').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#decision-export').click()]);assert.equal(download.suggestedFilename(),'porovnanie-rozhodnuti.csv');
 await page.locator('#decision-1-monthly').fill('120');assert.equal(await page.locator('#decision-result').isVisible(),false);
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#decision-saved').getByRole('button',{name:'Odstrániť Rodinné auto',exact:true}).click();assert.equal(await page.locator('#decision-saved li').count(),0);
 await page.evaluate(()=>localStorage.setItem('v24-decisions-v6','broken'));await page.reload({waitUntil:'domcontentloaded'});
 for(const [id,value] of Object.entries({title:'Test','0-name':'A','1-name':'B'}))await page.locator('#decision-'+id).fill(value);
 await page.locator('#decision-form button[type=submit]').click();await page.locator('#decision-save').click();assert.equal(await page.evaluate(()=>localStorage.getItem('v24-decisions-v6')),'broken');assert.deepEqual(errors,[]);await context.close();
 console.log('PASS V6 decision cash/debt/residual comparison, explicit save/load/delete, CSV, stale result invalidation and corrupt storage preservation');
}
