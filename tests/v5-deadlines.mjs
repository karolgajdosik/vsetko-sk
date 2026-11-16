import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function checkV5Deadlines(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(origin + '/kalendar/');
    await page.evaluate(() => {
      localStorage.setItem('v24-personal-center-v1', JSON.stringify({ version: 1, tasks: [{ id: 'keep', title: 'Zachovať úlohu', done: false }], deadlines: [], budget: { income: 1234 } }));
      localStorage.setItem('v24-workspace-v5', JSON.stringify({version:1,activeCaseId:'calendar-case',cases:[{id:'calendar-case',kind:'car',title:'Rodinné auto',createdAt:'2026-11-16T12:00:00Z',updatedAt:'2026-11-16T12:00:00Z',completed:[],values:{}}]}));
    });
    await page.reload();
    assert.equal(await page.locator('#calendar-case-assign').isChecked(), false);
    await page.locator('#calendar-template').selectOption('stk');
    await page.locator('#calendar-date').fill('2037-12-31');
    await page.locator('#calendar-reminder').selectOption('30');
    await page.locator('#calendar-form button').click();
    await page.reload();
    const row = page.locator('#calendar-items article');
    assert.equal(await row.count(), 1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('v24-personal-center-v1')).deadlines[0].caseId), undefined);
    await row.getByRole('button', { name: 'Upraviť termín:', exact: false }).click();
    await page.locator('#calendar-case-assign').check();
    await page.locator('#calendar-form button').click();
    await page.reload();
    assert.ok((await row.innerText()).includes('Situácia: Rodinné auto'));
    assert.ok((await row.innerText()).includes('30 dní vopred'));
    assert.equal(await row.locator('a[href="/navody/stk-priprava/"]').count(), 1);
    await row.getByRole('button', { name: 'Upraviť termín:', exact: false }).click();
    assert.equal(await page.locator('#calendar-template').inputValue(), 'stk');
    assert.equal(await page.locator('#calendar-reminder').inputValue(), '30');
    await page.locator('#calendar-reminder').selectOption('7');
    await page.locator('#calendar-form button').click();
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#calendar-export').click();
    const download = await downloadEvent;
    const calendar = await readFile(await download.path(), 'utf8');
    assert.ok(calendar.includes('TRIGGER:-P7D'));
    assert.ok(calendar.includes('URL:https://vsetko24.sk/navody/stk-priprava/'));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('v24-personal-center-v1')));
    assert.equal(stored.tasks[0].id, 'keep');
    assert.equal(stored.budget.income, 1234);
    assert.equal(stored.deadlines[0].type, 'stk');
    assert.equal(stored.deadlines[0].reminderDays, 7);
    assert.equal(stored.deadlines[0].caseId, 'calendar-case');
    await row.getByRole('button', { name: 'Upraviť termín:', exact: false }).click();
    assert.equal(await page.locator('#calendar-case-assign').isChecked(), false);
    await page.locator('#calendar-case-remove').check();
    await page.locator('#calendar-form button').click();
    await page.reload();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('v24-personal-center-v1')).deadlines[0].caseId), undefined);
    await page.locator('#calendar-filter').selectOption('past');
    assert.equal(await page.locator('#calendar-items article').count(), 0);
    await page.locator('#calendar-filter').selectOption('all');
    await row.getByRole('button', { name: 'Odstrániť termín:', exact: false }).click();
    assert.equal(await row.count(), 0);
    await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('v24-workspace-v5'));state.cases[0].title='A'.repeat(100);localStorage.setItem('v24-workspace-v5',JSON.stringify(state));});
    await page.setViewportSize({width:320,height:844});await page.reload();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Long case title must wrap at 320px');
    await page.evaluate(()=>localStorage.setItem('v24-personal-center-v1',JSON.stringify({version:1,tasks:[],budget:{},deadlines:[null,{id:'valid',title:'Platný termín',date:'2037-01-01'}]})));
    await page.reload();
    assert.equal(await page.locator('#calendar-items article').count(),1,'Malformed stored records must not break valid deadlines');
    await page.locator('#calendar-items article').getByRole('button',{name:'Odstrániť termín:',exact:false}).click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('v24-personal-center-v1')).deadlines.length),2,'Malformed original data must not be overwritten');
    assert.match(await page.locator('#calendar-status').innerText(),/neboli prepísané/);
    console.log('PASS V5 deadline types, preparation links, reminder edit/ICS VALARM and explicit case association/unlink and preservation of tasks/budget');
  } finally { await page.close(); }
}
