import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { v7Entries } from './fixtures/v7-cases.mjs';

const origin = process.env.VSETKO_ORIGIN ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  const open = async path => {
    const response = await page.goto(origin + path, {waitUntil:'domcontentloaded'});
    assert.equal(response.status(), 200);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  };
  await open('/vyriesit/');
  await page.evaluate(entries => {
    for (const [key,value] of Object.entries(entries)) localStorage.setItem(key,JSON.stringify(value));
  }, v7Entries);
  await page.reload();
  assert.match(await page.locator('#inbox-confirmed').innerText(), /Potvrdené výsledky \(1\)/);
  assert.match(await page.locator('#inbox-estimates').innerText(), /1 rozpracovaných/);
  await page.locator('.inbox-card').filter({hasText:'Práčka'}).getByRole('link',{name:'Otvoriť prípad'}).click();
  await page.locator('#complaint-detail').waitFor();
  await page.locator('#complaint-receipt-check').check();
  await page.locator('#complaint-evidence-save').click();
  const dialog = page.waitForEvent('dialog');
  const exportClick = page.locator('#complaint-export').click();
  const warning = await dialog;
  assert.match(warning.message(), /opis vady/);
  await warning.dismiss();
  await exportClick;
  await page.locator('#complaint-prepared').click();
  await page.locator('#complaint-archive').click();
  await open('/vyriesit/');
  await page.locator('#inbox-archive summary').click();
  await page.locator('#inbox-archive').getByRole('link',{name:'Otvoriť prípad'}).click();
  assert.match(await page.locator('#complaint-history').innerText(), /Zaznamenaná príprava/);
  assert.equal(await page.locator('#complaint-receipt-check').isChecked(), true);
  await page.locator('#complaint-archive').click();
  assert.match(await page.locator('#complaint-history').innerText(), /znovu otvorený/);

  await open('/vyriesit/koniec-zmluvy/#pripad=contract-1');
  for (const [id,value] of Object.entries({'renew-price':'420','renew-fee':'10','switch-price':'390','switch-fee':'20'})) {
    await page.locator('#end-' + id).fill(value);
  }
  await page.locator('#end-option').selectOption('switch');
  await page.locator('#end-options-save').click();
  assert.match(await page.locator('#end-options-summary').innerText(), /430.*410/);
  await page.locator('#end-doc-request').click();
  await page.locator('#case-draft-load').click();
  assert.match(await page.locator('#doc-body').inputValue(), /2027-01-31/);

  await open('/vyriesit/koniec-zmluvy/#pripad=contract-1');
  await page.locator('#end-sent-on').fill('2020-01-01');
  await page.locator('#end-contact-on').fill('2020-01-02');
  await page.locator('#end-follow-up-save').click();
  await open('/vyriesit/');
  assert.match(await page.locator('#inbox-due-list').innerText(), /Poistenie auta/);
  const download = page.waitForEvent('download');
  await page.locator('.inbox-card').filter({hasText:'Poistenie auta'}).getByRole('button',{name:'Stiahnuť termín (.ics)'}).click();
  assert.equal((await download).suggestedFilename(), 'vsetko24-dalsi-kontakt.ics');

  await open('/moje-zmluvy/');
  await page.locator('#contract-title').fill('Kontrolná zmluva');
  await page.locator('#contract-payment').fill('12.50');
  await page.locator('#contract-frequency').selectOption('monthly');
  await page.locator('#contract-renewal').fill('2028-05-30');
  await page.locator('#contract-form button[type=submit]').click();
  await page.getByRole('button',{name:'Vytvoriť prípad: Kontrolná zmluva'}).click();
  assert.equal(await page.locator('#end-current').inputValue(), '150.00');
  assert.equal(await page.locator('#end-date').inputValue(), '2028-05-30');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('v24-v7-contract-end-v1')).entries.length), 1);
  await page.locator('#end-form button[type=submit]').click();
  await page.locator('#end-confirm').check();
  await page.locator('#end-create').click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('v24-v7-contract-end-v1')).entries.length), 2);
  console.log('PASS V8 mobile case workflows');
} finally {
  await browser.close();
}
