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
