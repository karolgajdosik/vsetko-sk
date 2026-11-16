import assert from 'node:assert/strict';
import { WORKSPACE_KEY, createCase } from '../src/lib/workspace-store.mjs';

export async function checkWorkspaceTransfer(browser, origin) {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const item = createCase('home', 'Prenos výpočtov', '2026-11-16T12:00:00Z', 'bridge-browser');
  item.values = {purchasePrice:200000,downPayment:40000,annualRate:4,loanYears:30};
  const state = {version:1,activeCaseId:item.id,cases:[item]};
  await context.addInitScript(({key,value}) => {
    if (!sessionStorage.getItem('v5-test-seeded')) {
      localStorage.setItem(key,JSON.stringify(value)); sessionStorage.setItem('v5-test-seeded','1');
    }
  }, {key:WORKSPACE_KEY,value:state});
  const page = await context.newPage();
  try {
    await page.goto(new URL('/kalkulacky/splatka-uveru/',origin).href);
    const panel = page.locator('[data-workspace-mode="loan"]');
    assert.equal(await page.locator('#amount').inputValue(),'15000', 'No automatic personal-data application');
    await panel.locator('[data-transfer-apply]').click();
    assert.equal(await page.locator('#amount').inputValue(),'160000');
    assert.equal(await page.locator('#rate').inputValue(),'4');
    assert.equal(await page.locator('#years').inputValue(),'30');
    await page.locator('#rate').fill('3.5');
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).cases[0].values.annualRate,WORKSPACE_KEY),4,'Editing calculator does not implicitly save');
    await panel.locator('[data-transfer-save]').click();
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).cases[0].values.annualRate,WORKSPACE_KEY),3.5);
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).cases[0].values.purchasePrice,WORKSPACE_KEY),200000);

    await page.goto(new URL('/financie/prehlad/',origin).href);
    for (const [key,value] of Object.entries({income:2000,housing:600,food:200,transport:100,debt:100,other:100,annual:1200})) await page.locator('#finance-'+key).fill(String(value));
    await page.locator('[data-workspace-mode="finance"] [data-transfer-save]').click();
    assert.deepEqual(await page.evaluate(key=>{
      const {monthlyIncome,monthlyExpenses}=JSON.parse(localStorage.getItem(key)).cases[0].values;
      return {monthlyIncome,monthlyExpenses};
    },WORKSPACE_KEY),{monthlyIncome:2000,monthlyExpenses:1200});
    await page.goto(new URL('/kalkulacky/sporenie/',origin).href);
    assert.equal(await page.locator('#monthly').inputValue(),'100');
    await page.locator('[data-transfer-apply]').click();
    assert.equal(await page.locator('#monthly').inputValue(),'800');
    console.log('PASS V5 explicit case transfer: principal, rate/year save, budget average and savings surplus without implicit persistence');
  } finally {await context.close();}
}
