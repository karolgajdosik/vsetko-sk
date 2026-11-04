import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/rpo.js';

const request = new Request('https://vsetko24.sk/api/rpo?ico=31333532');
async function withMockFetch(mock, run) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { await run(); } finally { globalThis.fetch = original; }
}

test('RPO: a transient upstream TimeoutError is retried and can recover', async () => {
  let attempts = 0;
  await withMockFetch(async (_url, options) => {
    assert.ok(options.signal, 'Every upstream request must have a timeout signal');
    attempts++;
    if (attempts === 1) throw new DOMException('Upstream timed out', 'TimeoutError');
    return Response.json({ results: [{ identifier: '31333532', name: 'Verified business' }] });
  }, async () => {
    const response = await onRequestGet({ request });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).results[0].name, 'Verified business');
  });
  assert.equal(attempts, 2);
});

test('RPO: repeated upstream TimeoutError fails closed and reports final failure', async () => {
  let attempts = 0;
  await withMockFetch(async () => {
    attempts++;
    throw new DOMException('Upstream timed out', 'TimeoutError');
  }, async () => {
    const response = await onRequestGet({ request });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const body = await response.json();
    assert.equal(body.upstreamFailureType, 'TimeoutError');
    assert.ok(!('results' in body), 'Never invent verified registry data');
  });
  assert.equal(attempts, 2);
});
