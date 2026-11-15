import assert from 'node:assert/strict';

export async function checkOfflineNavigation(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const url = new URL('/aplikacia/?zdroj=plocha', origin).href;
    await page.goto(url);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { name: 'Teraz ste bez pripojenia' }).waitFor();
    const retry = page.getByRole('button', { name: 'Načítať túto stránku znova' });
    await retry.waitFor();
    assert.equal(page.url(), url);
    await context.setOffline(false);
    await retry.click();
    await page.getByRole('heading', { name: 'VŠETKO24 do mobilu' }).waitFor();
    assert.equal(page.url(), url);
  } finally {
    await context.close();
  }
}
