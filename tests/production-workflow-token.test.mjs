import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/production-api-health.yml', import.meta.url), 'utf8');

test('production monitor does not persist its issue-writing GitHub token in checkout', () => {
  assert.match(workflow, /^permissions:\n  contents: read\n  issues: write$/m);
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
