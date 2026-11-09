import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/production-api-health.yml', import.meta.url), 'utf8');

test('production monitor does not persist its issue-writing GitHub token in checkout', () => {
  assert.match(workflow, /^permissions:\n  contents: read\n  checks: read\n  issues: write$/m);
  const checkouts = [...workflow.matchAll(/^\s*- uses: actions\/checkout@v\d+\s*$/gm)];
  assert.equal(checkouts.length, 1, 'expected exactly one checkout step');
  assert.match(workflow, /^      - uses: actions\/checkout@v\d+\n        with:\n          persist-credentials: false$/m);
  assert.doesNotMatch(workflow, /^\s*pull_request_target:/m);
});


test('production monitor uses Node 24 compatible official Actions', () => {
  assert.match(workflow, /^      - uses: actions\/checkout@v5$/m);
  assert.match(workflow, /^      - uses: actions\/setup-node@v5$/m);
  assert.match(workflow, /^      - uses: actions\/upload-artifact@v6$/m);
  assert.match(workflow, /^          node-version: '22'$/m);
  for (const outdated of ['actions/checkout@v4', 'actions/setup-node@v4', 'actions/upload-artifact@v4']) {
    assert.ok(!workflow.includes('- uses: ' + outdated), 'outdated action: ' + outdated);
  }
});


test('production outage issue steps use Node.js 24 GitHub Script', () => {
  const scripts = [...workflow.matchAll(/^        uses: actions\/github-script@v(\d+)$/gm)];
  assert.equal(scripts.length, 3, 'expected deployment gate and API/UI issue automation steps');
  assert.ok(scripts.every(match => match[1] === '8'), 'all script steps must use github-script@v8');
});

test('production checks wait for the exact checked-out Cloudflare release', () => {
  const gateStart = workflow.indexOf('- name: Wait for Cloudflare deployment');
  const liveStart = workflow.indexOf('- name: Check public production pages');
  assert.ok(gateStart >= 0 && gateStart < liveStart, 'deployment gate must precede live checks');
  const gate = workflow.slice(gateStart, liveStart);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(gate, /DEPLOYMENT_SHA:.*steps\.release\.outputs\.sha/);
  assert.match(gate, /ref: sha/);
  assert.match(gate, /check\.app\?\.slug === 'cloudflare-workers-and-pages'/);
  assert.match(gate, /deployment\.conclusion !== 'success'/);
  assert.match(gate, /throw new Error\('Timed out waiting/);
});
