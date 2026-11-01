import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/auto-merge.yml', import.meta.url), 'utf8');
const marker = '          script: |\n';
const script = workflow.split(marker)[1]?.replace(/^ {12}/gm, '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

test('auto-merge refuses untrusted checks, stale refs, drafts and forks', async () => {
  assert.ok(script, 'auto-merge GitHub script must exist');
  const run = new AsyncFunction('github', 'context', 'core', script);
  const context = {
    repo: {owner: 'karolgajdosik', repo: 'vsetko-sk'},
    payload: {workflow_run: {
      head_sha: 'validated-head',
      check_suite_id: 123,
      pull_requests: [{number: 42}],
    }},
  };

  const cases = [
    {name: 'valid same-suite check and current base', expected: 1},
    {name: 'check from a different suite', suiteId: 999, expected: 0},
    {name: 'unsuccessful check', conclusion: 'failure', expected: 0},
    {name: 'untrusted check publisher', appSlug: 'third-party', expected: 0},
    {name: 'different check name', checkName: 'lint', expected: 0},
    {name: 'head changed after validation', headSha: 'unvalidated-head', expected: 0},
    {name: 'forked PR', headRepo: 'attacker/fork', expected: 0},
    {name: 'draft PR', draft: true, expected: 0},
    {name: 'closed PR', state: 'closed', expected: 0},
    {name: 'non-main base', baseRef: 'develop', expected: 0},
    {name: 'main changed after PR snapshot', mainSha: 'new-main', expected: 0},
    {name: 'head is behind main', aheadBy: 1, expected: 0},
  ];

  for (const scenario of cases) {
    let merges = 0;
    const github = {
      paginate: async () => [{filename: 'src/pages/index.astro'}],
      rest: {
        pulls: {
          get: async () => ({data: {
            number: 42,
            state: scenario.state ?? 'open',
            draft: scenario.draft ?? false,
            changed_files: 1,
            base: {ref: scenario.baseRef ?? 'main', sha: 'base-sha'},
            head: {
              sha: scenario.headSha ?? 'validated-head',
              repo: {full_name: scenario.headRepo ?? 'karolgajdosik/vsetko-sk'},
            },
          }}),
          listFiles: async () => { throw Error('use pagination'); },
          merge: async () => {
            merges++;
            return {data: {sha: 'merged-sha'}};
          },
        },
        checks: {
          listForRef: async () => ({data: {check_runs: [{
            name: scenario.checkName ?? 'verify',
            conclusion: scenario.conclusion ?? 'success',
            app: {slug: scenario.appSlug ?? 'github-actions'},
            check_suite: {id: scenario.suiteId ?? 123},
          }]}}),
        },
        git: {getRef: async () => ({data: {object: {sha: scenario.mainSha ?? 'base-sha'}}})},
        repos: {compareCommits: async () => ({data: {ahead_by: scenario.aheadBy ?? 0}})},
      },
    };
    await run(github, context, {info: () => {}, warning: () => {}});
    assert.equal(merges, scenario.expected, scenario.name);
  }
});
