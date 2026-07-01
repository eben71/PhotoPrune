---
title: 'PP-003 Run full repo verification gate and reconcile failures'
type: 'chore'
created: '2026-07-01'
status: 'done'
baseline_commit: '797776ecc7aba6b8e0dbeb8b343a1a8a9ba366c1'
context:
  - `AGENT_RULES.md`
  - `docs/ai/testing.md`
  - `docs/delivery/TASK_BACKLOG.md`
  - `docs/delivery/ITERATION_LOG.md`
  - `.agents/skills/repo-verify/SKILL.md`
  - `_bmad-output/project-context.md`
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** PP-003 is the repo's current P0 verification task: the project needs an up-to-date full-gate green/red record after recent MVP smoke, Docker, and CI repair work. Prior evidence already shows at least one likely failure area, root format check on generated `packages/shared/dist` files, so the task must distinguish current failures from stale assumptions.

**Approach:** Run the full verification gate from `docs/ai/testing.md` in order, repair only small in-scope verification blockers when safe, and record exact command evidence in the delivery log and backlog. If a failure is not safe to fix inside PP-003, triage it into a clear follow-up task rather than expanding scope.

## Boundaries & Constraints

**Always:** Use `docs/ai/testing.md` and `repo-verify` as the command policy. Keep changes limited to verification fixes, delivery evidence, and follow-up task entries. Preserve product trust rules: no similarity percentages, no auto-delete, no in-app delete, no write-scope or recovery/trash claims. Record skipped commands with exact blocker and residual risk.

**Ask First:** Changing product behavior, modifying dependency versions or lock files, deleting generated artifacts, changing CI architecture, broadening into PP-014 real Google verification, or making large formatting/build-system changes requires human approval before proceeding.

**Never:** Do not hide or reinterpret failing checks as passing. Do not mark PP-003 Done without exact evidence in `docs/delivery/ITERATION_LOG.md`. Do not fold unrelated Ready backlog items such as PP-004, PP-013, PP-014, PP-015, PP-016, or PP-020 into this task.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Full gate is green | All required commands pass locally | Backlog marks PP-003 Done and iteration log records command evidence | Note any environment caveats without creating unnecessary follow-ups |
| Known or new gate failure appears | A command fails during the full gate | Small safe fixes are applied and the relevant command is rerun | If unsafe or out of scope, create or update a follow-up backlog task and record blocker/risk |
| Command cannot run in this environment | Tooling, sandbox, network, Docker, browser, or OS issue prevents execution | The exact command, failure mode, and residual risk are recorded | Do not substitute a different command unless docs allow it; explain any narrower check separately |
| Docs or workflow evidence changes | Backlog or iteration log is updated | Docs guard is run and recorded | If docs guard fails, fix doc issues in scope or record a follow-up blocker |

</frozen-after-approval>

## Code Map

- `docs/ai/testing.md` -- Source of truth for the full handoff gate order and skipped-check reporting rules.
- `.agents/skills/repo-verify/SKILL.md` -- Verification workflow: run full gate, repair smallest underlying issue, record blockers.
- `Makefile` -- Root command implementations for lint, format-check, typecheck, test, build, and Python lock checks.
- `package.json` -- Root pnpm scripts including `smoke:mvp`, lint, format, typecheck, test, build, and docs guard.
- `scripts/check-coverage.mjs` -- Combined web/API/worker coverage threshold gate.
- `docs/delivery/TASK_BACKLOG.md` -- PP-003 status, evidence, and any follow-up task entries.
- `docs/delivery/ITERATION_LOG.md` -- Required exact command evidence and residual risk record.
- `_bmad-output/implementation-artifacts/spec-pp-002-add-or-confirm-mvp-playwright-smoke-test.md` -- Prior verification note that root `pnpm format:check` failed on generated shared `dist` files.

## Tasks & Acceptance

**Execution:**
- [x] `docs/ai/testing.md` and `.agents/skills/repo-verify/SKILL.md` -- Use these as the required gate and triage policy before running checks.
- [x] Root verification commands -- Run `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, and `make build` in order, plus `pnpm check:docs` after delivery-doc updates.
- [x] Failing command scope -- For each failure, identify whether a small safe fix belongs in PP-003; if yes, apply it and rerun the relevant command, otherwise create or update a follow-up task.
- [x] `docs/delivery/TASK_BACKLOG.md` -- Move PP-003 through the appropriate status and record final evidence or blocker; add follow-up tasks only for confirmed out-of-scope failures.
- [x] `docs/delivery/ITERATION_LOG.md` -- Add a PP-003 entry with exact commands, results, skipped checks, fixes, follow-ups, and residual risk.

**Acceptance Criteria:**
- Given PP-003 is executed, when the full gate from `docs/ai/testing.md` is run, then each required command has exact pass/fail/skipped evidence recorded.
- Given a gate command fails, when the failure is triaged, then the smallest safe in-scope fix is applied and rerun, or an actionable follow-up task is recorded.
- Given delivery docs are updated, when handoff occurs, then `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` agree on PP-003 status and evidence.
- Given checks cannot run because of local environment constraints, when evidence is recorded, then the skipped command includes exact blocker and residual risk.

## Spec Change Log

## Verification

**Commands:**
- `make lint` -- expected: root lint and Python ruff checks pass, or failures are fixed/triaged.
- `make format-check` -- expected: formatting checks pass, or generated/out-of-scope failures are recorded with follow-up.
- `make typecheck` -- expected: TypeScript and Python mypy checks pass, or failures are fixed/triaged.
- `make test` -- expected: root tests and API/worker pytest pass, or failures are fixed/triaged.
- `node scripts/check-coverage.mjs` -- expected: web, API, and worker coverage meet threshold using current coverage artifacts.
- `make build` -- expected: root build and Python compile checks pass, or failures are fixed/triaged.
- `pnpm check:docs` -- expected: docs guard passes after PP-003 backlog/log/spec updates.

**Manual checks:**
- Confirm the final report does not claim real authenticated Google Photos MVP readiness; PP-014/manual demo remains separate.
- Confirm no unsupported similarity percentage, auto-delete, in-app delete, write-scope, recovery/trash, or storage-reclaimed claim was introduced in delivery docs.

## Suggested Review Order

**Delivery Evidence**

- Start with the task state and summarized gate result.
  [`TASK_BACKLOG.md:51`](../../docs/delivery/TASK_BACKLOG.md#L51)

- Check the detailed command trail and review patch evidence.
  [`ITERATION_LOG.md:22`](../../docs/delivery/ITERATION_LOG.md#L22)

- Verify docs guard evidence was recorded after review.
  [`ITERATION_LOG.md:40`](../../docs/delivery/ITERATION_LOG.md#L40)

**Format Gate Fix**

- Confirm generated shared build output is ignored, not edited.
  [`.prettierignore:1`](../../packages/shared/.prettierignore#L1)

**Spec Trail**

- Review the approved task checklist and acceptance mapping.
  [`spec-pp-003-run-full-repo-verification-gate-and-reconcile-failures.md:54`](spec-pp-003-run-full-repo-verification-gate-and-reconcile-failures.md#L54)
