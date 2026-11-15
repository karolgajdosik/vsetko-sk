import assert from 'node:assert/strict';
import { createServer, get } from 'node:http';
import { once } from 'node:events';

export async function checkOfflineNavigation(browser, origin) {
  // Interrupt requests at the test server so the service worker and page
  // experience the same outage, including requests initiated by the worker.
  let offline = false;
  let interrupted = 0;
  const server = createServer((request, response) => {
    if (offline) {
      interrupted++;
      request.socket.destroy();
      return;
    }
    const upstream = get(new URL(request.url, origin), incoming => {
      response.writeHead(incoming.statusCode, { ...incoming.headers, 'cache-control': 'no-store' });
      incoming.pipe(response);
    });
    upstream.on('error', () => response.destroy());
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let context;
  try {
    context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const url = 'http://127.0.0.1:' + server.address().port + '/aplikacia/?zdroj=plocha';
    await page.goto(url);
    await page.waitForFunction(async () => Boolean(await navigator.serviceWorker.getRegistration()?.then(r => r?.active)));
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    offline = true;
    await page.reload();
    await page.getByRole('heading', { name: 'Teraz ste bez pripojenia' }).waitFor();
    assert.ok(interrupted > 0);
    assert.equal(page.url(), url);
    offline = false;
    await page.getByRole('button', { name: 'Načítať túto stránku znova' }).click();
    await page.getByRole('heading', { name: 'VŠETKO24 do mobilu' }).waitFor();
    assert.equal(page.url(), url);
  } finally {
    await context?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
