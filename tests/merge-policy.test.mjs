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


test('direct pushes to main run the same verify job for detection, not prevention', () => {
  const workflow = read('.github/workflows/validate.yml');
  const pushTrigger = workflow.match(/^  push:\n    branches: \[([^\]]+)\]/m);
  assert.ok(pushTrigger, 'validation must define an explicit push branch list');
  const branches = pushTrigger[1].split(',').map(branch => branch.trim());
  assert.ok(branches.includes('main'), 'main pushes must run validation');
  assert.ok(branches.includes('release/v1.0-platform'), 'existing release validation must remain');
  assert.match(workflow, /^  pull_request:\s*$/m);
  assert.match(workflow, /^  verify:\s*$/m);
  assert.match(workflow, /- run: npm test/);
  assert.match(workflow, /- run: npm run build/);
});

test('PR validation has least-privilege token and no persisted checkout credentials', () => {
  const workflow = read('.github/workflows/validate.yml');
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /- uses: actions\/checkout@v5\n        with:\n          persist-credentials: false/);
  assert.doesNotMatch(workflow, /^\s*pull_request_target:/m);
});

test('PR validation uses Node 24 compatible official Actions', () => {
  const workflow = read('.github/workflows/validate.yml');
  assert.ok(workflow.includes('runs-on: ubuntu-24.04'));
  assert.ok(workflow.includes('- uses: actions/checkout@v5'));
  assert.ok(workflow.includes('- uses: actions/setup-node@v5'));
  assert.ok(workflow.includes('- uses: actions/upload-artifact@v6'));
  assert.ok(workflow.includes("node-version: '22'"));
  for (const outdated of ['actions/checkout@v4', 'actions/setup-node@v4', 'actions/upload-artifact@v4']) {
    assert.ok(!workflow.includes('- uses: ' + outdated), 'outdated action: ' + outdated);
  }
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
  assert.ok(workflow.includes('pr.mergeable !== true'));
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

test('auto-merge only merges a validated PR against the live main ref', async () => {
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

  const scenarios = [
    {mainSha: 'current-main', aheadBy: 0, expectedMerges: 1, expectedCompare: true},
    {mainSha: 'current-main', aheadBy: 2, expectedMerges: 0, expectedCompare: true},
    // A stale PR API snapshot must not be merged even when its old base was valid.
    {mainSha: 'advanced-main', aheadBy: 0, expectedMerges: 0, expectedCompare: false},
  ];
  for (const scenario of scenarios) {
    let merges = 0;
    let compareArgs;
    let refArgs;
    const github = {
      paginate: async (method, args) => {
        assert.equal(args.per_page, 100);
        return method === github.rest.pulls.listReviews ? [] : [{filename: 'src/pages/index.astro'}];
      },
      rest: {
      pulls: {
        get: async () => ({data: {
          number: 42, state: 'open', draft: false,
          changed_files: 1, mergeable: true,
          base: {ref: 'main', sha: 'current-main'},
          head: {sha: 'validated-head', repo: {full_name: 'karolgajdosik/vsetko-sk'}},
        }}),
        listReviews: async () => { throw Error('must use github.paginate'); },
        merge: async () => { merges++; return {data: {sha: 'merged-sha'}}; },
      },
      checks: {listForRef: async () => ({data: {check_runs: [{
        name: 'verify', conclusion: 'success',
        app: {slug: 'github-actions'}, check_suite: {id: 123},
      }]}})},
      git: {getRef: async args => {
        refArgs = args;
        return {data: {object: {sha: scenario.mainSha}}};
      }},
      repos: {compareCommits: async args => {
        compareArgs = args;
        return {data: {ahead_by: scenario.aheadBy}};
      }},
    }};
    await run(github, context, {info: () => {}, warning: () => {}});
    assert.deepEqual(refArgs, {
      owner: 'karolgajdosik', repo: 'vsetko-sk', ref: 'heads/main',
    });
    assert.deepEqual(compareArgs, scenario.expectedCompare ? {
      owner: 'karolgajdosik', repo: 'vsetko-sk',
      base: 'validated-head', head: 'current-main',
    } : undefined);
    assert.equal(merges, scenario.expectedMerges);
  }
});

test('auto-merge refuses CI-defining PRs and incomplete file listings', async () => {
  const workflow = read('.github/workflows/auto-merge.yml');
  const script = workflow.split('          script: |' + String.fromCharCode(10))[1].replace(/^ {12}/gm, '');
  assert.ok(script);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = new AsyncFunction('github', 'context', 'core', script);
  const context = {
    repo: {owner: 'karolgajdosik', repo: 'vsetko-sk'},
    payload: {workflow_run: {
      head_sha: 'validated-head', check_suite_id: 123,
      pull_requests: [{number: 42}],
    }},
  };
  const scenarios = [
    {filename: 'src/pages/index.astro', changedFiles: 1, expectedMerges: 1},
    {filename: '.github/workflows/validate.yml', changedFiles: 1, expectedMerges: 0},
    {filename: '.github/workflows/auto-merge.yml', changedFiles: 1, expectedMerges: 0},
    {filename: '.github/workflows/production-api-health.yml', changedFiles: 1, expectedMerges: 0},
    {filename: 'archived/validate.yml', previousFilename: '.github/workflows/validate.yml', changedFiles: 1, expectedMerges: 0},
    {filename: 'archived/merge.yml', previousFilename: '.github/workflows/auto-merge.yml', changedFiles: 1, expectedMerges: 0},
    {filename: '.github/workflows/validate.yml', previousFilename: 'archived/validate.yml', changedFiles: 1, expectedMerges: 0},
    {filename: '.github/actions/custom/action.yml', changedFiles: 1, expectedMerges: 0},
    {filename: '.github/CODEOWNERS', changedFiles: 1, expectedMerges: 0},
    {filename: '.github/dependabot.yml', changedFiles: 1, expectedMerges: 0},
    {filename: '.github/ISSUE_TEMPLATE/bug.yml', changedFiles: 1, expectedMerges: 0},
    {filename: 'docs/moved.yml', previousFilename: '.github/dependabot.yml', changedFiles: 1, expectedMerges: 0},
    {filename: '.github/CODEOWNERS', previousFilename: 'docs/CODEOWNERS', changedFiles: 1, expectedMerges: 0},
    {filename: 'package.json', changedFiles: 1, expectedMerges: 0},
    {filename: 'package-lock.json', changedFiles: 1, expectedMerges: 0},
    {filename: 'npm-shrinkwrap.json', changedFiles: 1, expectedMerges: 0},
    {filename: '.npmrc', changedFiles: 1, expectedMerges: 0},
    {filename: 'astro.config.mjs', changedFiles: 1, expectedMerges: 0},
    {filename: 'scripts/check-seo.mjs', changedFiles: 1, expectedMerges: 0},
    {filename: 'tests/merge-policy.test.mjs', changedFiles: 1, expectedMerges: 0},
    {filename: 'functions/api/rpo.js', changedFiles: 1, expectedMerges: 0},
    {filename: 'functions/api/assistant.js', changedFiles: 1, expectedMerges: 0},
    {filename: 'src/pages/old.astro', previousFilename: 'functions/api/old.js', changedFiles: 1, expectedMerges: 0},
    {filename: 'public/_redirects', changedFiles: 1, expectedMerges: 0},
    {filename: 'public/_headers', changedFiles: 1, expectedMerges: 0},
    {filename: 'public/_routes.json', changedFiles: 1, expectedMerges: 0},
    {filename: 'public/_worker.js', changedFiles: 1, expectedMerges: 0},
    {filename: 'wrangler.toml', changedFiles: 1, expectedMerges: 0},
    {filename: 'wrangler.json', changedFiles: 1, expectedMerges: 0},
    {filename: 'wrangler.jsonc', changedFiles: 1, expectedMerges: 0},
    {filename: 'src/pages/index.astro', previousFilename: 'public/_headers', changedFiles: 1, expectedMerges: 0},
    {filename: 'docs/old-wrangler.toml', previousFilename: 'wrangler.toml', changedFiles: 1, expectedMerges: 0},
    {filename: 'docs/old-redirects', previousFilename: 'public/_redirects', changedFiles: 1, expectedMerges: 0},
    {filename: 'src/pages/new.astro', previousFilename: 'tests/old.test.mjs', changedFiles: 1, expectedMerges: 0},
    {filename: 'src/pages/new.astro', previousFilename: 'scripts/old.mjs', changedFiles: 1, expectedMerges: 0},
    {filename: 'src/pages/new.astro', previousFilename: 'package.json', changedFiles: 1, expectedMerges: 0},
    {filename: 'src/pages/index.astro', changedFiles: 1, expectedMerges: 1},
    {filename: 'src/pages/new.astro', previousFilename: 'src/pages/old.astro', changedFiles: 1, expectedMerges: 1},
    {filename: 'src/pages/index.astro', changedFiles: 2, expectedMerges: 0},
  ];
  for (const scenario of scenarios) {
    let merges = 0;
    let listed = 0;
    const github = {
      paginate: async (method, args) => {
        if (method === github.rest.pulls.listReviews) return [];
        assert.equal(method, github.rest.pulls.listFiles);
        assert.equal(args.pull_number, 42);
        assert.equal(args.per_page, 100);
        listed++;
        return [{filename: scenario.filename, previous_filename: scenario.previousFilename}];
      },
      rest: {
        pulls: {
          get: async () => ({data: {
            number: 42, state: 'open', draft: false, changed_files: scenario.changedFiles, mergeable: true,
            base: {ref: 'main', sha: 'current-main'},
            head: {sha: 'validated-head', repo: {full_name: 'karolgajdosik/vsetko-sk'}},
          }}),
          listFiles: async () => { throw Error('must use github.paginate'); },
          listReviews: async () => { throw Error('must use github.paginate'); },
          merge: async () => { merges++; return {data: {sha: 'merged-sha'}}; },
        },
        checks: {listForRef: async () => ({data: {check_runs: [{
          name: 'verify', conclusion: 'success',
          app: {slug: 'github-actions'}, check_suite: {id: 123},
        }]}})},
        git: {getRef: async () => ({data: {object: {sha: 'current-main'}}})},
        repos: {compareCommits: async () => ({data: {ahead_by: 0}})},
      },
    };
    await run(github, context, {info: () => {}, warning: () => {}});
    assert.equal(listed, 1);
    assert.equal(merges, scenario.expectedMerges, scenario.filename);
  }
});


test('auto-merge runs GitHub Script on Node.js 24', () => {
  const workflow = read('.github/workflows/auto-merge.yml');
  assert.match(workflow, /^        uses: actions\/github-script@v8$/m);
  assert.doesNotMatch(workflow, /actions\/github-script@v7/);
});
