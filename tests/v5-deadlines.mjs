import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function checkV5Deadlines(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(origin + '/kalendar/');
    await page.evaluate(() => localStorage.setItem('v24-personal-center-v1', JSON.stringify({ version: 1, tasks: [{ id: 'keep', title: 'Zachovať úlohu', done: false }], deadlines: [], budget: { income: 1234 } })));
    await page.reload();
    await page.locator('#calendar-template').selectOption('stk');
    await page.locator('#calendar-date').fill('2037-12-31');
    await page.locator('#calendar-reminder').selectOption('30');
    await page.locator('#calendar-form button').click();
    await page.reload();
    const row = page.locator('#calendar-items article');
    assert.equal(await row.count(), 1);
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
    await page.locator('#calendar-filter').selectOption('past');
    assert.equal(await page.locator('#calendar-items article').count(), 0);
    await page.locator('#calendar-filter').selectOption('all');
    await row.getByRole('button', { name: 'Odstrániť termín:', exact: false }).click();
    assert.equal(await row.count(), 0);
    console.log('PASS V5 deadline types, preparation links, reminder edit/ICS VALARM and preservation of tasks/budget');
  } finally { await page.close(); }
}
