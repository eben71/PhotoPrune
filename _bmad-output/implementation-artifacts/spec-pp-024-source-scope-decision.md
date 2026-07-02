---
title: "PP-024 MVP Source Scope Decision"
type: "chore"
created: "2026-07-02"
status: "done"
baseline_commit: "14af9fc7f82e8dad081c25ce82673a2aad6a9064"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/docs/delivery/TASK_BACKLOG.md"
  - "{project-root}/docs/delivery/artifacts/PP-022/pp-022-evidence.md"
  - "{project-root}/docs/product/MVP_EXIT_CRITERIA.md"
  - "{project-root}/docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md"
---

<frozen-after-approval reason="human-owned intent -- do not modify unless human renegotiates">

## Intent

**Problem:** PP-022 found that current Google Photos APIs do not provide a supported read-only path for PhotoPrune to list and fetch arbitrary real user-library albums. The MVP docs still require single-album, multiple-album, and picker-selected source modes, which keeps PP-014 blocked until the source-scope decision is made.

**Approach:** Record the product-owner decision that real Picker-selected Google Photos content is the MVP source mode, replacing arbitrary single/multiple album source modes for MVP evidence. Keep album-specific source modes out of MVP launch evidence unless Google exposes a supported read-only album path or a later approved product decision changes scope.

## Boundaries & Constraints

**Always:** Preserve trust-first guardrails: read-only Google Photos access, no write scope, no automatic deletion, no in-app deletion, no full-library scanning, no unsupported recovery/privacy/storage claims, and confidence bands only. Distinguish current MVP source evidence from existing internal `album_set` metadata, raw album ID inputs, app-created-data-only reads, and fixture/paged test data.

**Ask First:** If implementation would change app behavior, remove existing internal album-set code, add new Google API scopes, claim album scanning works for arbitrary user libraries, or change the numeric similarity policy, stop and ask.

**Never:** Do not implement new source selection UI or backend ingestion in this task. Do not claim that raw album IDs, app-created Library API data, backend metadata, code inspection, or fixture data count as real MVP source evidence.

## I/O & Edge-Case Matrix

| Scenario                      | Input / State                                                                    | Expected Output / Behavior                                                                                                   | Error Handling                                             |
| ----------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Source decision accepted      | PP-022 evidence shows arbitrary album source modes are unsupported               | Canonical docs name Picker-selected Google Photos content as the MVP source mode and say album modes are not launch evidence | Record follow-up evidence requirements under PP-023/PP-014 |
| Legacy album wording remains  | A doc still says MVP requires single and multiple albums as passing source modes | Update wording or explicitly mark it as historical/pre-decision context                                                      | Do not leave contradictory exit criteria                   |
| Test evidence is fixture-only | Automated smoke uses fixture/picker stubs                                        | Docs state fixture smoke cannot prove real Google Photos MVP readiness                                                       | Manual demo remains required                               |

</frozen-after-approval>

## Code Map

- `docs/delivery/TASK_BACKLOG.md` -- canonical task status and PP-024 acceptance/evidence record.
- `docs/delivery/ITERATION_LOG.md` -- required delivery evidence log for PP-024.
- `docs/delivery/artifacts/PP-014/pp-014-evidence.md` -- previous blocked manual-demo evidence that needs post-PP-024 stale wording clarified.
- `docs/delivery/artifacts/PP-022/pp-022-evidence.md` -- prior blocker evidence that now needs to reference the completed PP-024 decision.
- `docs/product/MVP_EXIT_CRITERIA.md` -- canonical MVP readiness source-mode gate.
- `docs/product/MVP_PROGRESS_LEDGER.md` -- durable product truth and residual risk ledger.
- `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` -- human Chrome demo source-selection checklist.
- `docs/testing/MVP_SMOKE_TEST_PLAN.md` -- automated/manual verification boundary.
- `docs/product/CURRENT_STATE.md` -- current MVP validation summary.
- `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md` -- historical alignment input that needs a PP-024 supersession note.
- `README.md` -- product status summary visible from repo root.
- `ROADMAP.md` -- roadmap source-scope status.
- `AGENT_RULES.md` -- repo-level policy summary that currently names album modes in MVP scope.
- `docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md` -- decision artifact to make the product-scope change explicit and reviewable.

## Tasks & Acceptance

**Execution:**

- [x] `docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md` -- add a concise decision artifact naming accepted source modes, rejected evidence, user-facing copy implications, and required manual evidence.
- [x] `docs/product/MVP_EXIT_CRITERIA.md` and `docs/product/MVP_PROGRESS_LEDGER.md` -- replace MVP album-mode requirements with Picker-selected real Google Photos content and record album-specific modes as blocked/out of MVP evidence.
- [x] `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` and `docs/testing/MVP_SMOKE_TEST_PLAN.md` -- update source-mode rows and manual evidence requirements so PP-023/PP-014 can use the new source-mode definition.
- [x] `README.md`, `ROADMAP.md`, and `docs/product/CURRENT_STATE.md` -- align adjacent product-status language so technical album-set capability is not confused with MVP pass evidence.
- [x] `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md` -- mark pre-PP-024 album-specific answers as historical input superseded for MVP pass evidence.
- [x] `docs/delivery/artifacts/PP-014/pp-014-evidence.md` -- clarify that its single/multiple album rows are historical pre-PP-024 blocker evidence and no longer launch-blocking source modes.
- [x] `docs/delivery/artifacts/PP-022/pp-022-evidence.md` -- replace stale pending PP-024 follow-up wording with the completed decision.
- [x] `AGENT_RULES.md` -- update the repo-level MVP product truth to match the accepted source scope.
- [x] `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` -- mark PP-024 done with exact evidence and residual risks; update PP-014/PP-023 wording if needed.

**Acceptance Criteria:**

- Given PP-022's API limitation evidence, when the docs are reviewed, then they explicitly accept Picker-selected Google Photos content as the MVP source mode replacing single/multiple arbitrary album source modes.
- Given a future manual MVP demo, when the runner reads the checklist, then only real Picker-selected Google Photos content is required for source-mode pass evidence.
- Given album-related docs remain in the repo, when they describe album-set behavior, then they do not imply arbitrary real user-library albums count as MVP pass evidence.
- Given automated smoke remains fixture-based, when MVP readiness is assessed, then docs still require real Chrome/authenticated Google Photos manual evidence.

## Verification

**Commands:**

- `apps/web/node_modules/.bin/prettier.cmd --check AGENT_RULES.md docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md docs/product/MVP_EXIT_CRITERIA.md docs/product/MVP_PROGRESS_LEDGER.md docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md docs/testing/MVP_SMOKE_TEST_PLAN.md _bmad-output/implementation-artifacts/spec-pp-024-source-scope-decision.md` -- expected: all touched Markdown files are formatted.
- `pnpm check:docs` -- expected: docs guard passes.
- `rg -n "\b\d+%|auto-delete|automatically delete|write scope|recently deleted|recovery|trash|storage reclaimed|full-library" AGENT_RULES.md docs/product docs/testing docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-024` -- expected: no new unsupported product claims; any matches are negative guardrails or historical task references.

## Suggested Review Order

**Decision Core**

- Start with the accepted source-scope decision and provenance.
  [`pp-024-source-scope-decision.md:5`](../../docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md#L5)

- Review the exact accepted and rejected evidence modes.
  [`pp-024-source-scope-decision.md:23`](../../docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md#L23)

- Confirm required post-decision manual evidence.
  [`pp-024-source-scope-decision.md:44`](../../docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md#L44)

**Canonical Gates**

- Check MVP exit criteria now require Picker-selected content.
  [`MVP_EXIT_CRITERIA.md:14`](../../docs/product/MVP_EXIT_CRITERIA.md#L14)

- Confirm arbitrary album modes are no longer pass evidence.
  [`MVP_EXIT_CRITERIA.md:16`](../../docs/product/MVP_EXIT_CRITERIA.md#L16)

- Verify manual demo source selection matches the new gate.
  [`MANUAL_MVP_DEMO_CHECKLIST.md:40`](../../docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md#L40)

- Check rejected evidence types remain explicit for demo runners.
  [`MANUAL_MVP_DEMO_CHECKLIST.md:50`](../../docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md#L50)

**Delivery Evidence**

- Confirm PP-014 now targets real Picker-selected content.
  [`TASK_BACKLOG.md:238`](../../docs/delivery/TASK_BACKLOG.md#L238)

- Check PP-024 evidence and residual risk in backlog.
  [`TASK_BACKLOG.md:294`](../../docs/delivery/TASK_BACKLOG.md#L294)

- Verify PP-014 historical album blocker is superseded.
  [`pp-014-evidence.md:27`](../../docs/delivery/artifacts/PP-014/pp-014-evidence.md#L27)

**Historical Context**

- Confirm questionnaire album answers are marked historical.
  [`MVP_ALIGNMENT_QUESTIONNAIRE.md:5`](../../docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md#L5)
