import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('validation has a verify job triggered for pull requests', () => {
  const workflow = read('.github/workflows/validate.yml');
  assert.match(workflow, /^  pull_request:\s*$/m);
  assert.match(workflow, /^  verify:\s*$/m);
  assert.match(workflow, /- run: npm test/);
  assert.match(workflow, /- run: npm run build/);
});

test('auto-merge requires successful pull-request validation and matching head', () => {
  const workflow = read('.github/workflows/auto-merge.yml');
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows: \["Validate VSETKO24"\]/);
  assert.match(workflow, /types: \[completed\]/);
  assert.ok(workflow.includes("github.event.workflow_run.event == 'pull_request'"));
  assert.ok(workflow.includes("github.event.workflow_run.conclusion == 'success'"));
  assert.ok(workflow.includes("pr.state !== 'open' || pr.draft || pr.base.ref !== 'main'"));
  assert.ok(workflow.includes('pr.head.repo.full_name !== `${owner}/${repo}`'));
  assert.ok(workflow.includes('pr.head.sha !== run.head_sha'));
});

test('auto-merge requires successful verify check and uses head-SHA guarded squash', () => {
  const workflow = read('.github/workflows/auto-merge.yml');
  assert.ok(workflow.includes("c.name === 'verify' && c.app?.slug === 'github-actions'"));
  assert.ok(workflow.includes("validation.some(c => c.conclusion === 'success')"));
  assert.match(workflow, /merge_method:'squash',sha:pr\.head\.sha/);
  assert.doesNotMatch(workflow, /pull_request_target:/);
});
