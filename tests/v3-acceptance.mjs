import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const amount = text => Number(text.replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.'));
export async function checkV3Acceptance(browser, base) {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({viewport: {width, height: 900}});
    try {
      await page.goto(base + '/kalkulacky/cista-mzda/', {waitUntil: 'load'});
      await page.waitForFunction(() => document.querySelector('#paycheck-net').textContent !== '—');
      assert.equal(amount(await page.locator('#paycheck-net').textContent()), 1134.51, 'Salary: independent 1500 EUR fixture');
      await page.locator('#paycheck-allowance').uncheck();
      assert.equal(amount(await page.locator('#paycheck-net').textContent()), 1040.04, 'Salary without allowance');
      await page.locator('#paycheck-gross').fill('-1');
      assert.ok(await page.locator('#paycheck-error').isVisible());
      assert.equal(await page.locator('#paycheck-net').textContent(), '—');
      await page.locator('#paycheck-form button[type=reset]').click();
      await page.waitForFunction(() => document.querySelector('#paycheck-error').hidden && document.querySelector('#paycheck-net').textContent !== '—');
      assert.equal(amount(await page.locator('#paycheck-net').textContent()), 1134.51);

      await page.goto(base + '/kalkulacky/naklady-na-byvanie/', {waitUntil: 'load'});
      await page.waitForFunction(() => document.querySelector('#reserve-six').textContent !== '—');
      assert.equal(amount(await page.locator('#reserve-three').textContent()), 3612.5);
      assert.equal(amount(await page.locator('#reserve-six').textContent()), 7225);
      assert.equal(amount(await page.locator('#reserve-gap').textContent()), 6225);
      assert.match(await page.locator('#reserve-time').textContent(), /^42 /);
      await page.locator('#upfront').fill('99999');
      assert.equal(amount(await page.locator('#reserve-six').textContent()), 7225, 'One-off costs excluded from recurring reserve');
      await page.locator('#reserve-monthly').fill('0');
      assert.equal(await page.locator('#reserve-time').textContent(), 'Bez sporenia nedosiahnuteľné');
      await page.locator('#reserve-savings').fill('10000');
      assert.equal(await page.locator('#reserve-time').textContent(), 'Cieľ splnený');
      await page.locator('#reserve-savings').fill('-1');
      assert.ok(await page.locator('#reserve-error').isVisible());
      assert.equal(await page.locator('#reserve-six').textContent(), '—');
      await page.locator('#reserve-savings').fill('0');
      await page.locator('#monthlyPayment').fill('1000');
      assert.equal(amount(await page.locator('#reserve-six').textContent()), 8125);

      await page.goto(base + '/auto/porovnanie-nakladov/', {waitUntil: 'load'});
      await page.waitForFunction(() => document.querySelector('#ev-total').textContent !== '—');
      assert.equal(amount(await page.locator('#ev-total').textContent()), 33500);
      assert.equal(amount(await page.locator('#petrol-total').textContent()), 36450);
      assert.equal(amount(await page.locator('#diesel-total').textContent()), 35525);
      await page.locator('#km').fill('0');
      assert.equal(await page.locator('#ev-perkm').textContent(), '—', 'No division by zero');
      await page.locator('#years').fill('0');
      assert.match(await page.locator('#tco-winner').textContent(), /neplatné vstupy/);

      await page.goto(base + '/kalendar/', {waitUntil: 'load'});
      await page.evaluate(() => localStorage.removeItem('v24-personal-center-v1'));
      await page.reload({waitUntil: 'load'});
      await page.locator('#calendar-title').fill('Akceptácia V3, termín; test');
      await page.locator('#calendar-date').fill('2027-01-15');
      await page.locator('#calendar-form button').click();
      assert.equal(await page.locator('.event').count(), 1);
      await page.reload({waitUntil: 'load'});
      assert.equal(await page.locator('.event').count(), 1, 'Calendar survives reload');
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#calendar-export').click();
      const download = await downloadPromise;
      const ics = await readFile(await download.path(), 'utf8');
      assert.match(ics, /DTSTART;VALUE=DATE:20270115/);
      assert.match(ics, /DTEND;VALUE=DATE:20270116/);
      assert.ok(ics.includes('SUMMARY:Akceptácia V3\\, termín\\; test'));
      await page.locator('.event button').click();
      assert.equal(await page.locator('.event').count(), 0);

      await page.goto(base + '/generator-reklamacie/', {waitUntil: 'load'});
      const marker = 'V3-PRIVATE-FIXTURE-7319';
      let transmitted = false;
      const inspect = request => { if ((request.url() + (request.postData() || '')).includes(marker)) transmitted = true; };
      page.on('request', inspect);
      assert.ok(await page.locator('#claim-copy').isDisabled());
      await page.locator('#claim-buyer').fill(marker);
      await page.locator('#claim-seller').fill('Predajca, Bratislava');
      await page.locator('#claim-item').fill('Testovací výrobok');
      await page.locator('#claim-date').fill('2026-10-01');
      await page.locator('#claim-defect').fill('Výrobok sa nezapína.');
      await page.locator('#claim-form button').click();
      assert.match(await page.locator('#claim-text').inputValue(), /V3-PRIVATE-FIXTURE-7319/);
      assert.match(await page.locator('#claim-text').inputValue(), /01\. 10\. 2026/);
      assert.ok(await page.locator('#claim-copy').isEnabled());
      assert.equal(transmitted, false, 'Claim contents stay in browser');
      page.off('request', inspect);

      // Structural checks are a baseline; they do not constitute a full WCAG audit.
      for (const route of ['/kalkulacky/cista-mzda/', '/kalkulacky/naklady-na-byvanie/', '/auto/porovnanie-nakladov/', '/kalendar/', '/generator-reklamacie/', '/metriky/']) {
        const response = await page.goto(base + route, {waitUntil: 'load'});
        assert.equal(response.status(), 200, route);
        assert.equal(await page.locator('h1').count(), 1, route);
        assert.equal(await page.locator('main#obsah').count(), 1, route);
        const checks = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          unlabeled: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(el => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(el => el.id),
          missingAlt: document.querySelectorAll('img:not([alt])').length,
          language: document.documentElement.lang,
          navigationMs: performance.getEntriesByType('navigation')[0]?.duration
        }));
        assert.ok(checks.overflow <= 1, 'Overflow ' + route + ' at ' + width);
        assert.deepEqual(checks.unlabeled, [], 'Missing form labels ' + route);
        assert.equal(checks.missingAlt, 0);
        assert.equal(checks.language, 'sk');
        console.log('V3 baseline ' + JSON.stringify({route, width, ...checks, measurement: 'single lab navigation; not field Core Web Vitals'}));
      }
      console.log('PASS V3 interactive acceptance at ' + width + 'px');
    } finally { await page.close(); }
  }
}
