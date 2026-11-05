import test from 'node:test';
import assert from 'node:assert/strict';
import {coreRoutes, classifyProbeError, probeCoreRoutes} from '../scripts/check-production-core-routes.mjs';

const html = (status = 200, type = 'text/html') => new Response('<!doctype html><html><body>OK</body></html>', {status, headers: {'content-type': type}});

test('core smoke checks homepage and both newly merged category routes', async () => {
  const seen = [];
  const result = await probeCoreRoutes({fetchImpl: async (url, options) => {
    seen.push(new URL(url).pathname);
    assert.equal(options.method, 'GET');
    return html();
  }});
  assert.equal(result.ok, true);
  assert.deepEqual(seen, coreRoutes);
  assert.ok(result.results.every(item => item.status === 200 && item.ok));
});

test('HTTP 200 with JSON or non-HTML content does not pass', async () => {
  const result = await probeCoreRoutes({routes: ['/'], fetchImpl: async () => html(200, 'application/json')});
  assert.equal(result.ok, false);
  assert.equal(result.results[0].reason, 'unexpected_http_or_html');
});

test('missing route returns failure without hiding status', async () => {
  const result = await probeCoreRoutes({routes: ['/byvanie/'], fetchImpl: async () => html(404)});
  assert.equal(result.ok, false);
  assert.equal(result.results[0].status, 404);
});

test('DNS and timeout errors are reported separately from HTTP failures', async () => {
  const dns = Object.assign(new Error('fetch failed'), {cause: {code: 'ENOTFOUND'}});
  assert.equal(classifyProbeError(dns), 'dns_unresolved');
  assert.equal(classifyProbeError(new DOMException('timeout', 'TimeoutError')), 'timeout');
  const result = await probeCoreRoutes({routes: ['/'], fetchImpl: async () => {throw dns;}});
  assert.equal(result.results[0].reason, 'dns_unresolved');
  assert.equal(result.results[0].status, null);
});
