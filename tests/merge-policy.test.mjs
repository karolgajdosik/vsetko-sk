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


test('PR validation has least-privilege token and no persisted checkout credentials', () => {
  const workflow = read('.github/workflows/validate.yml');
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /- uses: actions\/checkout@v4\n        with:\n          persist-credentials: false/);
  assert.doesNotMatch(workflow, /^\s*pull_request_target:/m);
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

test('auto-merge binds the successful verify check to the triggering workflow run', () => {
  const workflow = read('.github/workflows/auto-merge.yml');
  assert.ok(workflow.includes("c.check_suite?.id === run.check_suite_id"));
  assert.ok(workflow.includes("validation.some(c => c.conclusion === 'success')"));
});

test('auto-merge only merges a validated PR when its head includes current main', async () => {
  const workflow = read('.github/workflows/auto-merge.yml');
  const marker = '          script: |' + String.fromCharCode(10);
  assert.ok(workflow.includes(marker));
  const script = workflow.split(marker)[1].replace(/^ {12}/gm, '');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = new AsyncFunction('github', 'context', 'core', script);
  const context = {
    repo: {owner: 'karolgajdosik', repo: 'vsetko-sk'},
    payload: {workflow_run: {
      head_sha: 'validated-head',
      check_suite_id: 123,
      pull_requests: [{number: 42}],
    }},
  };

  for (const aheadBy of [0, 2]) {
    let merges = 0;
    let compareArgs;
    const github = {rest: {
      pulls: {
        get: async () => ({data: {
          number: 42, state: 'open', draft: false,
          base: {ref: 'main', sha: 'current-main'},
          head: {sha: 'validated-head', repo: {full_name: 'karolgajdosik/vsetko-sk'}},
        }}),
        merge: async () => { merges++; return {data: {sha: 'merged-sha'}}; },
      },
      checks: {listForRef: async () => ({data: {check_runs: [{
        name: 'verify', conclusion: 'success',
        app: {slug: 'github-actions'}, check_suite: {id: 123},
      }]}})},
      repos: {compareCommits: async args => {
        compareArgs = args;
        return {data: {ahead_by: aheadBy}};
      }},
    }};
    await run(github, context, {info: () => {}, warning: () => {}});
    assert.deepEqual(compareArgs, {
      owner: 'karolgajdosik', repo: 'vsetko-sk',
      base: 'validated-head', head: 'current-main',
    });
    assert.equal(merges, aheadBy === 0 ? 1 : 0);
  }
});
