# Main branch protection — status and verification

Related issue: #137. This is a **partial, code-level safety check**, not GitHub branch protection.

## Current repository constraints (2026-11-01)

- The repository is private; the `main` branch reports `protected: false` and required checks disabled.
- GitHub's repository rulesets endpoint returned HTTP 403 with a plan/visibility limitation. The branch-protection endpoint returned HTTP 403 for the integration.
- Changing the subscription, visibility, or repository permissions requires an explicit owner decision. Do **not** make the repository public merely to enable protection.

## What is already checked

`Validate VSETKO24` runs on pull requests **and on direct pushes to `main`** (post-push detection only; it cannot reject a push), and executes `npm test`, build, link validation and browser checks. `Auto-merge validated pull requests` processes only successful pull-request workflow runs, ignores drafts and external forks, matches the PR head SHA and requires a successful `verify` check from the **same check suite as the triggering workflow run** before attempting a SHA-guarded squash merge. This avoids trusting a successful check from a different run on the same commit. The automation also fails closed unless GitHub explicitly reports `mergeable: true`; conflicts (`false`) and pending mergeability (`null`) are skipped rather than attempted. GitHub independently rejects merge conflicts. Before merging, the automation reads the **live** `refs/heads/main` SHA, rejects a stale PR base snapshot, and compares the validated PR head against that live commit; a PR behind `main` is skipped (the branch must be updated and CI rerun). This narrows the time-of-check/time-of-use window, but a concurrent change to `main` **after** the ref read remains a race until GitHub-enforced branch protection is enabled.

The auto-merge workflow also reads the **complete paginated changed-file list** and refuses to automatically merge PRs that modify CI-defining files: `.github/workflows/`, `.github/actions/`, `package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `.npmrc`, `astro.config.mjs`, `scripts/` or `tests/`. Renames **from** these paths are also blocked via `previous_filename`; an incomplete changed-file list is rejected. These files can change the tests/build or the CI environment and must receive deliberate manual review after successful CI. The same rule also applies to `functions/` (Cloudflare serverless API handlers) and `public/_redirects` (production routing), including files renamed out of these paths. This is a deliberate security trade-off: backend and redirect changes require manual review rather than unattended merging. The auto-merge workflow also reads all paginated PR reviews and refuses to merge while any reviewer has an outstanding `CHANGES_REQUESTED` decision; a later approval or dismissal clears that reviewer's block, while a comment does not. Ordinary content-only changes may still auto-merge when all existing checks pass. This code-level guard does not prevent direct pushes or replace GitHub-enforced branch protection.

The pull-request validation workflow uses an explicit read-only `GITHUB_TOKEN` (`contents: read`) and `actions/checkout` with `persist-credentials: false`, reducing the risk of exposing repository write credentials to untrusted PR code. This does **not** enforce branch protection or prevent direct pushes. The merge workflow retains separately scoped write permissions for validated squash merges.

`tests/merge-policy.test.mjs` is executed by `npm test` and detects accidental removal of these key safeguards. It is a **static regression test**, not an authorization control. A user with direct write access to `main` can still bypass PR validation; the tests cannot prevent this.

## Remaining steps before resolving #137

1. Obtain an owner-approved GitHub plan/permissions approach that supports enforced protection for this private repository; do not purchase or change visibility automatically.
2. Configure `main` to reject direct pushes, require a successful `verify` status check, and reject conflicting or stale PR merges. Check compatibility with the existing `workflow_run`-based merge automation.
3. Test with a safe PR: a failed `verify` must prevent merging; a successful PR may merge only after required checks; direct push must be rejected.
4. Verify the actual branch rules and production deployment independently, then close #137.

Until the above is complete, report branch protection as **not enforced** even if CI and production monitoring are green.
