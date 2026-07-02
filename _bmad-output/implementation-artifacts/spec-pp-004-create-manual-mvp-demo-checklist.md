---
title: "PP-004 Create manual MVP demo checklist"
type: "chore"
created: "2026-07-01"
status: "done"
baseline_commit: "d7866b0c229099a460c1d11683745109f8faafea"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/docs/product/MVP_EXIT_CRITERIA.md"
  - "{project-root}/docs/testing/MVP_SMOKE_TEST_PLAN.md"
  - "{project-root}/docs/testing/VERIFICATION_CHECKLIST.md"
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** MVP exit currently requires a manual Chrome demo with real Google Photos content, but the repo does not yet define a concrete checklist for running, capturing, and recording that demo. Without a canonical checklist, PP-014 and later MVP readiness work can pass automated smoke tests while still missing real authenticated flow evidence.

**Approach:** Add a focused manual MVP demo checklist document and wire it into existing verification docs, backlog evidence, and the iteration log. Keep the artifact practical for a human runner: clear prerequisites, step-by-step pass/fail checks, required screenshots/artifacts, and explicit handling for known limitations and follow-up task creation.

## Boundaries & Constraints

**Always:** Treat the manual demo as separate from deterministic Playwright fixture smoke. Require Chrome, a real Google login, read-only Google Photos access, single-album, multiple-album, and picker-selected photo coverage, scan start/progress, grouped review, exact-photo manual cleanup link-out/reference checks, Settings/Profile checks, known limitation review, and artifact capture. Keep confidence to `High`, `Medium`, or `Low`; keep cleanup external/manual; record evidence in delivery docs.

**Ask First:** Changing product behavior, adding or changing Google Photos scopes, changing authenticated flow architecture, requiring new tooling, changing automated Playwright coverage, or marking real Google subpaths as complete without runnable evidence requires human approval.

**Never:** Do not add auto-delete, in-app delete, write-scope actions, recovery/trash claims, full-library scanning claims, local-only/privacy/storage guarantees, similarity percentages, or implementation work for PP-014/PP-015/PP-016 inside this task.

## I/O & Edge-Case Matrix

| Scenario                                | Input / State                                                                                         | Expected Output / Behavior                                                                                         | Error Handling                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Canonical checklist exists              | Maintainer needs to run the MVP manual demo                                                           | A checklist explains prerequisites, steps, pass/fail criteria, screenshots/artifacts, and where to record evidence | Missing or unsupported app behavior is recorded as a blocker/follow-up, not silently passed |
| Real Google path differs by source type | Single album, multiple albums, or picker-selected photos are tested                                   | Each source type has an explicit checkbox and expected result                                                      | Unsupported subpaths are marked failed/blocked with follow-up task IDs                      |
| Trust guardrail is violated             | Demo exposes percentage scores, destructive copy, write scope, or unsupported recovery/privacy claims | Checklist instructs runner to fail the demo and record the exact location                                          | Create or reference a follow-up task before MVP exit                                        |
| Evidence capture is incomplete          | Demo passes but screenshots/log references are missing                                                | Checklist remains incomplete until evidence paths and iteration-log entry are recorded                             | Record residual risk instead of marking PP-004 or MVP readiness complete                    |

</frozen-after-approval>

## Code Map

- `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` -- New canonical human-run checklist for the real Chrome/authenticated Google Photos MVP demo.
- `docs/testing/MVP_SMOKE_TEST_PLAN.md` -- Existing automated/manual boundary doc; should link to the new manual checklist.
- `docs/product/MVP_EXIT_CRITERIA.md` -- MVP exit gate source; should name the concrete manual checklist artifact.
- `docs/delivery/TASK_BACKLOG.md` -- PP-004 source of truth and final evidence/status target.
- `docs/delivery/ITERATION_LOG.md` -- Delivery evidence log for PP-004 commands, documentation changes, and residual risk.

## Tasks & Acceptance

**Execution:**

- [x] `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` -- Add the checklist with prerequisites, ordered demo sections, pass/fail criteria, artifact requirements, limitation handling, and evidence-recording instructions.
- [x] `docs/testing/MVP_SMOKE_TEST_PLAN.md` -- Link the manual checklist and clarify that fixture smoke does not satisfy the real Google demo gate.
- [x] `docs/product/MVP_EXIT_CRITERIA.md` -- Reference the checklist as the required manual demo artifact for MVP exit.
- [x] `docs/delivery/TASK_BACKLOG.md` -- Move PP-004 through status and record evidence once checks pass.
- [x] `docs/delivery/ITERATION_LOG.md` -- Record PP-004 implementation evidence, skipped checks, residual risk, and follow-up tasks.

**Acceptance Criteria:**

- Given the manual demo runner opens the checklist, when they prepare the demo, then Chrome, real Google login, read-only Google Photos scope, test content, environment, and artifact destination prerequisites are explicit.
- Given the runner executes the checklist, when they verify the core path, then scan start, progress, grouped review, manual cleanup guidance, limitations, and Settings/Profile required MVP details are covered.
- Given the runner tests Google Photos source modes, when single album, multiple albums, and picker-selected photos are assessed, then each mode has an explicit pass/fail/blocker recording point.
- Given trust guardrails are checked, when unsupported similarity percentages, deletion/recovery claims, write scopes, full-library scanning claims, or unsupported privacy/storage claims appear, then the checklist requires a failed result and follow-up task.
- Given PP-004 is handed off, when delivery docs are reviewed, then backlog and iteration log record PP-004 status, command evidence, residual risk, and any follow-up task IDs.

## Spec Change Log

## Verification

**Commands:**

- `pnpm check:docs` -- expected: docs guard passes after new checklist links and delivery evidence updates.
- `pnpm exec prettier --check docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md docs/testing/MVP_SMOKE_TEST_PLAN.md docs/product/MVP_EXIT_CRITERIA.md docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md` -- expected: touched Markdown files are formatted.

**Manual checks:**

- Inspect the checklist against PP-004 acceptance criteria and `docs/testing/VERIFICATION_CHECKLIST.md`.
- Confirm the checklist distinguishes deterministic fixture smoke from the real authenticated Google Photos manual demo.

## Suggested Review Order

**Manual Demo Contract**

- Start with the canonical runner-facing checklist and its evidence contract.
  [`MANUAL_MVP_DEMO_CHECKLIST.md:1`](../../../docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md#L1)

- Confirm all three Google Photos source modes have explicit outcomes.
  [`MANUAL_MVP_DEMO_CHECKLIST.md:40`](../../../docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md#L40)

- Check forbidden claims are confirmed absent instead of checked as present.
  [`MANUAL_MVP_DEMO_CHECKLIST.md:91`](../../../docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md#L91)

- Verify passing demos require durable redacted evidence.
  [`MANUAL_MVP_DEMO_CHECKLIST.md:105`](../../../docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md#L105)

- Confirm required failures cannot be converted into passes.
  [`MANUAL_MVP_DEMO_CHECKLIST.md:118`](../../../docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md#L118)

**Automated Versus Manual Boundary**

- Fixture smoke now describes fixture-only expectations.
  [`MVP_SMOKE_TEST_PLAN.md:17`](../../../docs/testing/MVP_SMOKE_TEST_PLAN.md#L17)

- Real Google checks are handed to the manual checklist.
  [`MVP_SMOKE_TEST_PLAN.md:54`](../../../docs/testing/MVP_SMOKE_TEST_PLAN.md#L54)

- MVP exit requires all source modes, not one of them.
  [`MVP_EXIT_CRITERIA.md:15`](../../../docs/product/MVP_EXIT_CRITERIA.md#L15)

- MVP exit names the concrete manual checklist artifact.
  [`MVP_EXIT_CRITERIA.md:40`](../../../docs/product/MVP_EXIT_CRITERIA.md#L40)

**Delivery Evidence**

- Backlog records PP-004 as checklist creation only.
  [`TASK_BACKLOG.md:67`](../../../docs/delivery/TASK_BACKLOG.md#L67)

- Iteration log records commands, review fixes, and residual risk.
  [`ITERATION_LOG.md:22`](../../../docs/delivery/ITERATION_LOG.md#L22)
