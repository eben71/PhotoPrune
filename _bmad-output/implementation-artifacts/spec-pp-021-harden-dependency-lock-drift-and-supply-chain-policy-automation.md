---
title: 'PP-021 Harden dependency lock drift and supply-chain policy automation'
type: 'chore'
created: '2026-07-01'
status: 'ready-for-dev'
baseline_commit: 'TBD-at-implementation-start'
context:
  - `AGENT_RULES.md`
  - `docs/delivery/TASK_BACKLOG.md`
  - `docs/delivery/WORKFLOW.md`
  - `docs/ai/testing.md`
  - `.github/workflows/ci.yml`
  - `.github/workflows/python-dependency-refresh.yml`
  - `Makefile`
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
  - `apps/api/pyproject.toml`
  - `apps/api/uv.lock`
  - `apps/api/requirements.lock`
  - `apps/api/requirements-dev.lock`
  - `apps/worker/pyproject.toml`
  - `apps/worker/uv.lock`
  - `apps/worker/requirements.lock`
  - `apps/worker/requirements-dev.lock`
  - `scripts/sync-python-locks.sh`
  - `scripts/check-python-lock-pins.py`
  - `_bmad-output/project-context.md`
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** CI is repeatedly failing in dependency setup workflows rather than in product tests. The current failures show two recurring classes of dependency drift:

1. `pnpm install --frozen-lockfile` rejects recently published lockfile entries under pnpm's supply-chain policy. The reported example is `turbo@2.10.2` plus its platform packages, published on 2026-06-30 after the active minimum-release-age cutoff.
2. `make python-locks-check` rejects stale Python locks after manifest pin changes. The reported examples are API and worker `ruff` pins where `pyproject.toml` moved to `ruff==0.15.20` but `uv.lock` and `requirements-dev.lock` still contained `ruff==0.15.18`.

These failures are useful guardrails, but they currently arrive as repeated CI breakages that require a human to infer which dependency-maintenance path should repair the branch.

**Approach:** Add a dependency-maintenance story that turns these failures into early, focused, and as-automatic-as-safe checks. Keep protected CI non-mutating, but add automation that can repair lock-only drift on dependency-update branches/PRs. Make pnpm minimum-release-age behavior explicit so dependency automation does not keep committing too-new package versions before policy allows them.

## Boundaries & Constraints

**Always:** Keep the existing supply-chain safety intent. Preserve frozen installs and non-mutating verification on protected CI. Prefer the existing `make python-locks`, `make python-locks-upgrade`, `make python-locks-check`, `pnpm clean --lockfile`, and `pnpm install` workflows unless a simpler wrapper is clearly justified. Keep changes focused on dependency automation, CI diagnostics, and docs.

**Ask First:** Relaxing pnpm minimum-release-age policy, disabling Python lock checks, changing dependency managers, adding new third-party automation actions, or broadening this into unrelated package upgrades requires human approval.

**Never:** Do not bypass supply-chain policy by silently disabling it in CI. Do not make protected CI commit to `main`. Do not introduce product-scope behavior, destructive photo actions, similarity percentages, or user-facing product claims as part of this chore.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Too-new pnpm package | Lockfile contains a package published inside the configured minimum-release-age window | Dependency preflight fails early with the package/version, publish time, policy cutoff, and next safe action | Do not auto-relax the policy; automation should wait/retry or refresh after the age window |
| Stale pnpm lock after manifest edit | `package.json`/workspace config changes but `pnpm-lock.yaml` is stale | Focused command identifies frozen-lockfile drift and suggests the lock rebuild path | Protected CI remains read-only |
| Python manifest pin bump | API or worker `pyproject.toml` changes a pinned dev dependency such as `ruff` | Automation syncs `uv.lock`, `requirements.lock`, and `requirements-dev.lock` on the same dependency PR where safe | If branch cannot be pushed, CI prints exact local commands |
| Cross-service Python drift | Only API or only worker locks are refreshed | Check reports the service and files still stale | Repair command updates both services consistently |
| Scheduled Python refresh | Weekly refresh runs before dependency update windows | Refresh PR contains synchronized Python locks and clear title/body | No PR is opened when there are no changes |
| Dependabot or bot PR | Bot opens a dependency PR with manifest-only changes | A lock-repair workflow updates the bot branch or comments actionable steps, depending on permissions | Avoid infinite workflow loops and force-push surprises |
| Local developer workflow | Developer bumps dependencies locally | Docs explain the required lock commands and policy caveats | Verification command names are copy/pasteable |

</frozen-after-approval>

## Code Map

- `.github/workflows/ci.yml` -- Existing protected CI path. Candidate for an early dependency preflight job or clearer dependency setup steps before the full gate.
- `.github/workflows/python-dependency-refresh.yml` -- Existing scheduled Python lock refresh workflow; candidate for reuse or extension.
- `.github/dependabot.yml` or equivalent dependency-bot configuration if added/confirmed -- Candidate place to coordinate package update cadence with pnpm release-age policy.
- `package.json` -- Declares pnpm version and Node dependency ranges such as `turbo`.
- `pnpm-lock.yaml` -- Node lockfile that can contain entries rejected by minimum-release-age policy.
- `pnpm-workspace.yaml` / `.npmrc` -- Check current pnpm supply-chain policy configuration before changing behavior.
- `Makefile` -- Existing canonical dependency commands: `python-locks`, `python-locks-upgrade`, `python-locks-check`.
- `scripts/sync-python-locks.sh` -- Existing Python lock sync/check implementation.
- `scripts/check-python-lock-pins.py` -- Existing offline exact-pin guard.
- `apps/api/pyproject.toml` and `apps/worker/pyproject.toml` -- Python manifests whose pinned dependency changes must stay synchronized with lock outputs.
- `apps/api/uv.lock`, `apps/api/requirements.lock`, `apps/api/requirements-dev.lock`, `apps/worker/uv.lock`, `apps/worker/requirements.lock`, `apps/worker/requirements-dev.lock` -- Lock outputs to repair automatically where safe.
- `docs/ai/testing.md` and `docs/CONTRIBUTING.md` -- Candidate docs for dependency-maintenance commands and failure triage.
- `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` -- Delivery task source of truth and required evidence log.

## Tasks & Acceptance

**Execution:**

- [ ] Reproduce or model the two reported failure classes: pnpm minimum-release-age rejection for too-new lockfile entries and Python lock drift after a pinned dependency bump.
- [ ] Inventory the current pnpm supply-chain policy configuration and dependency automation schedule. Document where the minimum release age is configured and which workflows run frozen installs.
- [ ] Add an early dependency preflight or split dependency-check job that runs before expensive lint/type/test/build work and produces concise, actionable repair output.
- [ ] Implement safe auto-repair for Python lock drift on eligible dependency PR branches by running the existing lock sync path and pushing only the affected lock files back to the same branch; ensure a manifest bump in either `apps/api` or `apps/worker` refreshes both services so API-only and worker-only lock-check jobs cannot keep failing independently.
- [ ] Add or adjust Node dependency automation so pnpm minimum-release-age violations are avoided where possible: delay update PRs, retry after the age window, or refresh the lockfile after the policy window rather than repeatedly failing CI.
- [ ] Add regression coverage for the helper scripts/workflow logic that can be run without depending on live package-publication timing. Use fixtures or deterministic script tests for stale Python locks and too-new pnpm lock entries.
- [ ] Update dependency-maintenance docs with copy/pasteable local commands and CI triage guidance.
- [ ] Update `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` with exact implementation evidence, skipped checks, follow-ups, and residual risk.

**Acceptance Criteria:**

- Given a lockfile contains package versions inside the configured pnpm minimum-release-age window, when dependency checks run, then the workflow fails early with a clear diagnosis and does not proceed to the full expensive gate.
- Given a Python manifest pin changes without regenerated lock outputs, when eligible dependency automation runs on a PR branch, then it updates the corresponding `uv.lock`, `requirements.lock`, and `requirements-dev.lock` files automatically or reports the exact permission blocker and local repair commands.
- Given protected CI runs on `main` or an untrusted PR, when dependency drift is detected, then CI remains non-mutating and never commits directly to protected branches.
- Given dependency automation opens or updates Node dependency PRs, when pnpm's release-age policy would reject a version, then the automation waits, retries, or clearly marks the PR as blocked instead of producing repeated ambiguous install failures.
- Given docs are reviewed, when PP-021 is complete, then maintainers know when to run `make python-locks`, `make python-locks-upgrade`, `make python-locks-check`, `pnpm clean --lockfile`, and `pnpm install`.
- Given delivery evidence is reviewed, when backlog/log are checked, then PP-021 status, commands, results, residual risk, and any follow-up task IDs are recorded.

## Dev Notes

- The user-provided CI output for `pnpm install --frozen-lockfile` names seven rejected lockfile entries: `turbo@2.10.2` and platform packages `@turbo/darwin-64`, `@turbo/darwin-arm64`, `@turbo/linux-64`, `@turbo/linux-arm64`, `@turbo/windows-64`, and `@turbo/windows-arm64`, all published on 2026-06-30 after the active cutoff.
- The user-provided Python lock-check output names stale `ruff` pins in both Python services. Treat this as a workflow robustness story, not just a one-off lock refresh.
- Follow-up CI evidence shows the same failure class appears as separate service-specific failures: one run reported `apps/worker/uv.lock` and `apps/worker/requirements-dev.lock` still at `ruff==0.15.18` while `pyproject.toml` pinned `ruff==0.15.20`; another reported the same stale `ruff==0.15.18` lock outputs for `apps/api`. PP-021 implementation should therefore repair both services whenever either service manifest changes, rather than assuming only one workflow or one lock file drifted.
- Prefer repairing lock drift through existing repo scripts so local and CI behavior stay aligned.
- Be careful with GitHub Actions permissions on forked PRs and bot branches. If auto-push is unsafe or impossible, use a comment/check summary fallback with exact commands.
- If Dependabot configuration does not exist yet, add only the minimum necessary configuration or workflow wrapper for the dependency update cadence. Do not introduce a new dependency-update platform without approval.
- Consider `concurrency` settings for auto-repair workflows to avoid branch update races.
- Avoid relying on current wall-clock package age in tests. Use fixtures or script-level injection for cutoff times.

### Project Structure Notes

- Keep new scripts under `scripts/` if they are repo-wide dependency helpers.
- Keep GitHub Actions workflow changes under `.github/workflows/` and minimize duplicated shell logic where a script would be easier to test.
- Do not commit generated dependency cache directories, virtualenvs, `.turbo`, `node_modules`, coverage, or Playwright artifacts.

### References

- Reported failing command: `pnpm install --frozen-lockfile`
- Reported failing command: `make python-locks-check`
- Existing CI workflow: `.github/workflows/ci.yml`
- Existing Python lock refresh workflow: `.github/workflows/python-dependency-refresh.yml`
- Existing Python sync command: `scripts/sync-python-locks.sh`
- Existing Python pin guard: `scripts/check-python-lock-pins.py`
- Testing guide dependency-lock section: `docs/ai/testing.md`
- Delivery workflow: `docs/delivery/WORKFLOW.md`
- Product/trust guardrails: `AGENT_RULES.md`

## Spec Change Log

## Verification

**Focused commands for the PP-021 implementation session:**

- `make python-locks-check` -- expected: Python lock files are synchronized after any dependency repair changes.
- `pnpm install --frozen-lockfile` -- expected: frozen install passes or fails only with an intentional, documented minimum-release-age policy block.
- Any new dependency-preflight command added by PP-021 -- expected: deterministic checks pass and produce actionable failures for fixture cases.
- Any new script/unit tests added for dependency-preflight behavior -- expected: pass without relying on live package publication timing.
- `pnpm check:docs` -- expected: docs guard passes after dependency workflow documentation changes.

**Broader handoff commands to consider because PP-021 affects CI setup:**

- `make lint`
- `make format-check`
- `make typecheck`
- `make test`
- `node scripts/check-coverage.mjs`
- `make build`

**Known verification caveat:**

- This story was created from reported CI failures. The local branch at story creation may not contain the exact manifest/lock drift shown in the user-provided logs; implementation should validate current branch state before changing dependency versions.

## Suggested Review Order

**CI Safety**

- Confirm protected CI remains read-only and supply-chain policy is not bypassed.

**Automation Reliability**

- Confirm auto-repair only updates lock files for committed manifest changes and does not create infinite workflow loops.

**Diagnostics**

- Confirm failure messages name the exact package/service/file drift and the recommended repair command.

**Docs And Delivery Evidence**

- Confirm docs, backlog, and iteration log accurately describe the implemented dependency maintenance flow.

## Dev Agent Record

### Agent Model Used

GPT-5.5

### Debug Log References

- User requested: `bmad-create-story` for recurring CI dependency failures and automatic repair robustness.
- Attempted to run `bmad-create-story "PP-021 Harden dependency lock drift and supply-chain policy automation"`, but the command was not available in this container (`command not found`), so the story was created manually using the existing BMAD story artifact format.
- Used `docs-guard` because the requested story covers dependency workflow and CI documentation.

### Completion Notes List

- Added PP-021 backlog task with acceptance criteria for dependency preflight, pnpm release-age handling, Python lock auto-repair, docs, and deterministic tests.
- Created ready-for-dev PP-021 story artifact.
- No implementation of PP-021 dependency automation was started.

### File List

- `docs/delivery/TASK_BACKLOG.md`
- `_bmad-output/implementation-artifacts/spec-pp-021-harden-dependency-lock-drift-and-supply-chain-policy-automation.md`
