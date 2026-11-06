import test from 'node:test';
import assert from 'node:assert/strict';
import {coreRoutes, expectedHeadings, classifyProbeError, probeCoreRoutes} from '../scripts/check-production-core-routes.mjs';

const html = (status = 200, type = 'text/html', heading = 'OK') => new Response(`<html><body><main><h1>${heading}</h1></main></body></html>`, {status, headers: {'content-type': type}});

test('core smoke checks homepage and both newly merged category routes', async () => {
  const seen = [];
  const result = await probeCoreRoutes({fetchImpl: async (url, options) => {
    seen.push(new URL(url).pathname);
    assert.equal(options.method, 'GET');
    return html(200, 'text/html', expectedHeadings[new URL(url).pathname] ?? 'OK');
  }});
  assert.equal(result.ok, true);
  assert.deepEqual(seen, coreRoutes);
  assert.ok(result.results.every(item => item.status === 200 && item.ok));
});

test('all six new V3 production routes have expected page headings', () => {
  const expected = ['/faq/', '/generator-reklamacie/', '/kupa-nehnutelnosti/', '/zalozenie-zivnosti/', '/umrtie-v-rodine/', '/strata-dokladov/'];
  for (const route of expected) {
    assert.ok(coreRoutes.includes(route), 'Missing live smoke route: ' + route);
    assert.ok(expectedHeadings[route], 'Missing expected heading for ' + route);
  }
  assert.equal(new Set(coreRoutes).size, coreRoutes.length);
});

test('HTTP 200 homepage fallback does not pass as a new feature', async () => {
  const result = await probeCoreRoutes({routes: ['/faq/'], fetchImpl: async () => html(200, 'text/html', 'Všetko, čo potrebuješ')});
  assert.equal(result.ok, false);
  assert.equal(result.results[0].status, 200);
  assert.equal(result.results[0].reason, 'unexpected_page_heading');
  assert.equal(result.results[0].expectedHeading, 'Časté otázky');
});

test('each new V3 page passes only with its own heading', async () => {
  const routes = coreRoutes.filter(route => route in expectedHeadings);
  const result = await probeCoreRoutes({routes, fetchImpl: async url => html(200, 'text/html', expectedHeadings[new URL(url).pathname])});
  assert.equal(result.ok, true);
  assert.ok(result.results.every(item => item.reason === 'ok'));
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

test('cross-origin redirect to a successful HTML page is rejected', async () => {
  const result = await probeCoreRoutes({routes: ['/'], fetchImpl: async () => {
    const response = html();
    Object.defineProperty(response, 'url', {value: 'https://untrusted.example/login'});
    return response;
  }});
  assert.equal(result.ok, false);
  assert.equal(result.results[0].reason, 'unexpected_redirect_origin');
  assert.equal(result.results[0].finalUrl, 'https://untrusted.example/login');
});

// The production workflow must execute the probe, not merely unit-test it.
import {readFileSync} from 'node:fs';
test('production workflow executes and gates core route smoke', () => {
  const workflow = readFileSync(new URL('../.github/workflows/production-api-health.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes('id: coreRoutes'));
  assert.ok(workflow.includes('node scripts/check-production-core-routes.mjs'));
  assert.ok(workflow.includes("steps.coreRoutes.outcome == 'failure'"));
  assert.ok(workflow.includes("'scripts/check-production-core-routes.mjs'"));
});
