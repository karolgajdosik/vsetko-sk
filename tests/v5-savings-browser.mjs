import assert from 'node:assert/strict';
export async function checkSavingsCenter(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const euro = value => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);
  try {
    const response = await page.goto(new URL('/centrum-uspor/', origin).href);
    assert.equal(response.status(), 200);
    await page.locator('#savings-import').click();
    assert.match(await page.locator('#savings-import-status').innerText(), /Najprv potvrďte/);
    await page.locator('#savings-current-monthly').fill('30');
    await page.locator('#savings-alternative-monthly').fill('20');
    await page.locator('#savings-setup').fill('25');
    await page.locator('#savings-income').fill('1000');
    await page.locator('#savings-expenses').fill('1200');
    await page.locator('#savings-form button[type=submit]').click();
    assert.equal(await page.locator('#savings-net').innerText(), euro(215));
    assert.match(await page.locator('#savings-recovery').innerText(), /v mesiaci 3/);
    assert.equal(await page.locator('#savings-timeline tr').count(), 24);
    assert.ok((await page.locator('#savings-budget-result').innerText()).includes(euro(-200)));
    assert.equal(await page.locator('#savings-results').isVisible(), true);
    const downloading = page.waitForEvent('download');
    await page.locator('#savings-export').click();
    const download = await downloading;
    assert.equal(download.suggestedFilename(), 'centrum-uspor.csv');
    await page.locator('#savings-alternative-monthly').fill('50');
    assert.equal(await page.locator('#savings-results').isVisible(), false);
    await page.locator('#savings-form button[type=submit]').click();
    assert.equal(await page.locator('#savings-net').innerText(), euro(-505));
    assert.match(await page.locator('#savings-recovery').innerText(), /nevrátia/);
    await page.locator('#savings-category').selectOption('insurance');
    assert.match(await page.locator('#savings-category-hint').innerText(), /spoluúčasť/);
    await page.locator('#savings-form button[type=reset]').click();
    assert.equal(await page.locator('#savings-results').isVisible(), false);
    assert.equal(await page.locator('#savings-income').inputValue(), '');
    assert.equal(await page.locator('#savings-current-monthly').inputValue(), '0');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    console.log('PASS V5 savings own offers, exit/setup, stable recovery, negative budget, CSV, invalidation and reset at 390px');
  } finally { await page.close(); }
}
