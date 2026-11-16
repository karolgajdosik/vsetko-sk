import assert from 'node:assert/strict';

export async function checkFinancePlanning(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const euros = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });
  try {
    const response = await page.goto(new URL('/financie/prehlad/', origin).href);
    assert.equal(response?.status(), 200);
    const calculate = page.locator('#net-worth-form button[type=submit]');
    async function checkTotals(assets, debts, net) {
      await calculate.click();
      await page.locator('#net-worth-results').waitFor();
      for (const [key, amount] of Object.entries({ assets, debts, value: net })) {
        assert.equal(await page.locator('#net-' + key).innerText(), euros.format(amount));
      }
    }
    await checkTotals(0, 0, 0);
    for (const [key, amount] of Object.entries({
      cash: '0.10', investments: '0.20', property: '10000', otherAssets: '5.01',
      mortgage: '10010', otherDebt: '0.02'
    })) {
      await page.locator('#net-' + key).fill(amount);
    }
    await checkTotals(10005.31, 10010.02, -4.71);

    const cash = page.locator('#net-cash');
    for (const invalid of ['-0.01', '', '10000000.01', '0.001']) {
      await cash.fill(invalid);
      await calculate.click();
      assert.equal(await cash.evaluate(el => el.validity.valid), false);
      assert.equal(await page.locator('#net-worth-results').isVisible(), false);
    }
    await cash.fill('10000000');
    await checkTotals(10010005.21, 10010.02, 9999995.19);
    await page.locator('#net-worth-form button[type=reset]').click();
    assert.equal(await page.locator('#net-worth-results').isVisible(), false);
    await checkTotals(0, 0, 0);

    await page.getByRole('link', { name: 'Naplánovať pravidelné sporenie z mesačného zostatku' }).click();
    assert.equal(new URL(page.url()).pathname, '/kalkulacky/sporenie/');
    await page.locator('#monthly').fill('125.25');
    await page.locator('#rate').fill('0');
    await page.locator('#years').fill('2');
    assert.ok((await page.locator('#primary-result').innerText()).includes(euros.format(3006)));
    console.log('PASS V4 mobile net worth, euro cents, negative net value, input limits, reset and regular savings projection');
  } finally {
    await page.close();
  }
}
