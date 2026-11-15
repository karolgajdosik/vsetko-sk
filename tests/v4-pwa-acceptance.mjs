import assert from 'node:assert/strict';
import { createServer, get } from 'node:http';
import { once } from 'node:events';

async function verifyInstallation(page, origin) {
  const response = await page.goto(new URL('/aplikacia/', origin).href);
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
  const facts = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const manifestUrl = document.querySelector('link[rel="manifest"]').href;
    const manifestResponse = await fetch(manifestUrl);
    const manifest = await manifestResponse.json();
    const icons = await Promise.all(manifest.icons.map(async icon => {
      const image = new Image();
      image.src = new URL(icon.src, manifestUrl).href;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }));
    const keys = await caches.keys();
    const assets = [];
    for (const key of keys.filter(key => key.startsWith('vsetko24-pwa-offline-'))) {
      const cache = await caches.open(key);
      assets.push(...(await cache.keys()).map(req => new URL(req.url).pathname));
    }
    return {
      scope: registration.scope, worker: navigator.serviceWorker.controller.scriptURL,
      manifestStatus: manifestResponse.status, start: manifest.start_url, display: manifest.display,
      icons, assets: assets.sort()
    };
  });
  assert.equal(facts.scope, new URL('/', origin).href);
  assert.equal(facts.worker, new URL('/pwa-worker.js', origin).href);
  assert.equal(facts.manifestStatus, 200);
  assert.equal(facts.start, '/aplikacia/');
  assert.equal(facts.display, 'standalone');
  assert.deepEqual(facts.icons.sort((a,b) => a[0] - b[0]), [[192,192],[512,512]]);
  assert.deepEqual(facts.assets, ['/pwa-icon-192.png', '/pwa-icon-512.png', '/pwa-offline.html', '/pwa-retry.js']);
}

export async function checkProductionPwa(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await verifyInstallation(page, origin);
    console.log('PASS live PWA at', origin, 'mobile manifest, decoded icons, active root worker and public-only fallback cache');
  } finally {
    await page.close();
  }
}

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
    const base = 'http://127.0.0.1:' + server.address().port;
    await verifyInstallation(page, base);
    const url = base + '/aplikacia/?zdroj=plocha';
    offline = true;
    await page.goto(url);
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
