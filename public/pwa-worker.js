'use strict';

// Only public, immutable fallback assets enter this cache. No page responses,
// API data, form submissions, user records or external requests are cached.
const CACHE_PREFIX = 'vsetko24-pwa-offline-';
const CACHE_NAME = CACHE_PREFIX + 'v2';
const OFFLINE_PAGE = '/pwa-offline.html';
const STATIC_ASSETS = [OFFLINE_PAGE, '/pwa-retry.js', '/pwa-icon-192.png', '/pwa-icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      request.headers.has('authorization')) return;

  if (STATIC_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache =>
      (await cache.match(url.pathname)) || fetch(request)));
    return;
  }
  if (request.mode !== 'navigate') return;

  // Personal tools and API routes keep their original network behaviour.
  if (/^\/(?:api|moje-centrum|moj-prehlad|kalendar|moje-kontrolne-zoznamy|dokumenty)(?:\/|$)/.test(url.pathname)) return;

  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    const fallback = await cache.match(OFFLINE_PAGE);
    return fallback || new Response('Nie ste pripojení. Obnovte pripojenie a skúste stránku načítať znova.', {
      status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
    });
  }));
});
