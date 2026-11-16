import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {checkFinanceHealth} from './v6-health-browser.mjs';
import {checkDecisionComparison} from './v6-comparison-browser.mjs';
import {checkActionPlan} from './v6-plan-browser.mjs';
import {checkContracts} from './v6-contracts-browser.mjs';
import {checkAnnualExpenses} from './v6-annual-browser.mjs';
import {checkTransactionImport} from './v6-csv-browser.mjs';
const origin=process.env.VSETKO_ORIGIN??'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true});
try{
 for(const check of [checkFinanceHealth,checkDecisionComparison,checkActionPlan,checkContracts,checkAnnualExpenses,checkTransactionImport])await check(browser,origin);
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.goto(origin+'/moje-vysledky/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>dispatchEvent(new CustomEvent('v24:complete',{detail:{tool:'health'}})));
 assert.equal(await page.evaluate(()=>localStorage.getItem('v24-completions-v6')),null);
 await page.locator('#metrics-toggle').click();
 await page.evaluate(()=>dispatchEvent(new CustomEvent('v24:complete',{detail:{tool:'health'}})));
 await page.reload({waitUntil:'domcontentloaded'});assert.match(await page.locator('#metrics-counts').innerText(),/Kontrola financií: 1/);
 await page.locator('#metrics-clear').click();assert.equal(await page.evaluate(()=>localStorage.getItem('v24-completions-v6')),null);
 for(const route of ['/rozhodovanie/','/moje-vysledky/','/financie/kontrola/','/porovnanie-rozhodnuti/','/moj-plan/','/moje-zmluvy/','/rocne-vydavky/','/import-vydavkov/']){
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.documentElement.dataset.theme='dark');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' overflow');
 }
 await context.close();console.log('PASS V6 opt-in local completion counters and mobile dark routes');
}finally{await browser.close();}
