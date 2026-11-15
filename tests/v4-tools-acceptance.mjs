import assert from 'node:assert/strict';
import { json } from 'node:stream/consumers';

const euro = amount => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(amount);

export async function checkV4Tools(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(new URL('/financie/prehlad/', origin).href);
    const budget = { income: 2000, housing: 600, food: 300, transport: 100, debt: 0, other: 0, annual: 1200, reserve: 3300 };
    for (const [field, value] of Object.entries(budget)) {
      await page.locator('#finance-' + field).fill(String(value));
    }
    await page.locator('#finance-overview-form button[type=submit]').click();
    await page.locator('#finance-results').waitFor();
    assert.equal(await page.locator('#finance-balance').innerText(), euro(900));
    assert.equal(await page.locator('#finance-reserveTarget').innerText(), euro(3300));
    for (const field of Object.keys(budget)) {
      await page.locator('#finance-' + field).fill('0');
    }
    await page.locator('#finance-overview-form button[type=submit]').click();
    assert.equal(await page.locator('#finance-balance').innerText(), euro(0));
    assert.equal(await page.locator('#finance-reserveMonths').innerText(), 'Bez výdavkov sa neurčuje');
    await page.locator('#finance-income').fill('-1');
    await page.locator('#finance-overview-form button[type=submit]').click();
    assert.equal(await page.locator('#finance-results').isVisible(), false);
    assert.equal(await page.locator('#finance-error').isVisible(), true);

    await page.goto(new URL('/porovnavace/', origin).href);
    await page.locator('#comparison-months').fill('13');
    for (const [key, value] of Object.entries({ monthly: 20, annual: 12, setup: 5, promoMonths: 2, promoMonthly: 10 })) {
      await page.locator('#comparison-A-' + key).fill(String(value));
    }
    await page.locator('#comparison-B-monthly').fill('20');
    await page.locator('#comparison-form button[type=submit]').click();
    await page.locator('#comparison-results').waitFor();
    const difference = await page.locator('#comparison-difference').innerText();
    assert.ok(difference.includes('Ponuka B') && difference.includes(euro(9)), difference);

    const costs = page.locator('#comparison-rows');
    for (const [label, expected] of [
      ['Akciové mesiace spolu', 20], ['Bežné mesiace spolu', 220],
      ['Ročné poplatky spolu', 24], ['Vstupný poplatok', 5], ['Celkom za obdobie', 269],
    ]) {
      const row = costs.getByRole('row').filter({ has: page.getByRole('rowheader', { name: label, exact: true }) });
      assert.equal(await row.getByRole('cell').first().innerText(), euro(expected));
    }

    await page.goto(new URL('/auto/moje-auto/', origin).href);
    const backup = { version: 1, distance: 100, entries: [{ id: 'fixture', date: '2026-01-01', category: 'energy', cents: 1250 }] };
    const file = data => ({ name: 'zaloha.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
    await page.locator('#vehicle-import').setInputFiles(file(backup));
    const apply = page.locator('#vehicle-import-apply');
    page.once('dialog', dialog => dialog.accept());
    await apply.click();
    await page.reload();
    assert.equal(await page.locator('#vehicle-total').innerText(), euro(12.5));
    assert.equal(await page.locator('#vehicle-distance').inputValue(), '100');
    assert.equal(await page.locator('#vehicle-per-km').innerText(), '0,125 €/km');
    await page.locator('#vehicle-date').fill('2026-02-02');
    await page.locator('#vehicle-category').selectOption('service');
    await page.locator('#vehicle-amount').fill('7.50');
    await page.locator('#vehicle-form button[type=submit]').click();
    assert.equal(await page.locator('#vehicle-total').innerText(), euro(20));
    assert.equal(await page.locator('#vehicle-per-km').innerText(), '0,20 €/km');
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.locator('#vehicle-export').click(),
    ]);
    assert.equal(download.suggestedFilename(), 'vsetko24-moje-auto.json');
    const exported = await json(await download.createReadStream());
    assert.equal(exported.version, backup.version);
    assert.equal(exported.distance, backup.distance);
    assert.equal(exported.entries.length, 2);
    assert.deepEqual(exported.entries[0], backup.entries[0]);
    const { id, ...expense } = exported.entries[1];
    assert.ok(id && id !== backup.entries[0].id);
    assert.deepEqual(expense, { date: '2026-02-02', category: 'service', cents: 750 });
    await page.locator('#vehicle-import').setInputFiles(file({ version: 99 }));
    await page.locator('#vehicle-import-status').filter({ hasText: 'nie je platná záloha' }).waitFor();
    assert.equal(await apply.isDisabled(), true);
    assert.equal(await page.locator('#vehicle-total').innerText(), euro(20));
    await page.locator('#vehicle-delete').click();
    await page.locator('#vehicle-delete-yes').click();
    await page.reload();
    assert.equal(await page.locator('#vehicle-count').innerText(), '0');
    assert.equal(await page.locator('#vehicle-distance').inputValue(), '0');
  } finally {
    await page.close();
  }
}
