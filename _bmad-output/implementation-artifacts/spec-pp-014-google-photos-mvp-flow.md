---
title: "PP-014 Google Photos MVP flow"
type: "chore"
created: "2026-07-02"
status: "done"
baseline_commit: "569c72c192c4c7013da0f9c68269fcf802669ec7"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/docs/product/MVP_EXIT_CRITERIA.md"
  - "{project-root}/docs/testing/MVP_SMOKE_TEST_PLAN.md"
  - "{project-root}/docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md"
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** PP-014 needs honest MVP evidence for the real authenticated Google Photos path, but the repo currently separates deterministic fixture smoke coverage from the manual Chrome demo gate. Without recorded PP-014 evidence, the project cannot claim real Google Photos MVP readiness.

**Approach:** Run the strongest available verification from this workspace, inspect the real Google Photos implementation path, and record a PP-014 result with evidence. If real Chrome/authenticated Google account execution or source modes cannot be completed here, mark those subpaths as blocked with exact reasons and follow-up task IDs instead of treating them as passed.

## Boundaries & Constraints

**Always:** Keep Google Photos access read-only. Preserve the group-based review model. Record manual-demo evidence under `docs/delivery/artifacts/PP-014/` and summarize it in `docs/delivery/ITERATION_LOG.md`. Update `docs/delivery/TASK_BACKLOG.md` to reflect the actual PP-014 outcome. Distinguish automated fixture smoke, code inspection, and real authenticated Google evidence.

**Ask First:** Adding dependencies, changing OAuth scopes, adding Google Photos write actions, adding backend persistence, requiring real Google credentials in CI, changing product policy for similarity percentages, or expanding this task into PP-015/PP-016 implementation requires human approval.

**Never:** Do not claim real Google Photos readiness without a completed real-account Chrome demo. Do not add auto-delete, in-app Google Photos deletion, recovery/trash claims, full-library scanning, hidden destructive actions, or numeric similarity/confidence percentages.

## I/O & Edge-Case Matrix

| Scenario                  | Input / State                                                              | Expected Output / Behavior                                                                   | Error Handling                                                                                   |
| ------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Picker-selected photos    | Chrome can complete Google Picker auth with real read-only media selection | Scan starts from selected real items and review renders grouped identical/similar candidates | If OAuth credentials or account access are unavailable, record Blocked with missing prerequisite |
| Single album              | User needs to scan one real Google Photos album                            | User can select or supply one real album source and start a scan without write scope         | If no real album selection/fetch path exists, record Blocked and create/reference a follow-up    |
| Multiple albums           | User needs to scan more than one real Google Photos album                  | User can select or supply multiple real album sources and start a scan without write scope   | If no real multi-album path exists, record Blocked and create/reference a follow-up              |
| Trust guardrail violation | UI or docs show forbidden claims during verification                       | PP-014 fails and records exact location                                                      | Add a scoped follow-up or fix only if it is directly required for PP-014                         |

</frozen-after-approval>

## Code Map

- `apps/web/app/hooks/useGooglePhotosPicker.ts` -- Browser Google OAuth and Picker integration; currently requests `photospicker.mediaitems.readonly` plus profile scope and returns selected media.
- `apps/web/app/page.tsx` -- Home picker-selected flow that stores selected items and routes to `/run`.
- `apps/web/app/projects/[id]/run/page.tsx` -- Saved-project scan flow; exposes picker selection and album-set inputs before starting a project scan.
- `apps/api/app/projects/ingestion.py` -- Backend source adapter for picker and album-set scan requests.
- `packages/shared/src/projects.ts` -- Shared project scope contract for picker versus album-set scopes.
- `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` -- Canonical manual Chrome demo checklist for real Google Photos evidence.
- `docs/delivery/TASK_BACKLOG.md` -- Delivery task status and PP-014 outcome.
- `docs/delivery/ITERATION_LOG.md` -- Verification evidence and residual risk log.
- `docs/delivery/artifacts/PP-014/` -- Evidence notes and screenshots for this task.

## Tasks & Acceptance

**Execution:**

- [x] `apps/web/app/hooks/useGooglePhotosPicker.ts` and related flow files -- inspect implemented OAuth, picker, scope, and source-selection behavior -- establish what can be verified from code before real-account testing.
- [x] `docs/delivery/artifacts/PP-014/` -- create a PP-014 evidence note using the manual demo checklist result fields -- preserve exact pass/fail/blocked evidence.
- [x] `docs/delivery/TASK_BACKLOG.md` -- update PP-014 status/outcome and add follow-up task references for any blocked source modes -- keep backlog truthful.
- [x] `docs/delivery/ITERATION_LOG.md` -- record commands, manual demo status, blockers, residual risk, and follow-up tasks -- satisfy delivery evidence requirements.
- [x] `docs/product/MVP_PROGRESS_LEDGER.md` -- record the launch-blocking album source-mode gap -- keep MVP readiness truth aligned with PP-014 evidence.

**Acceptance Criteria:**

- Given the PP-014 handoff, when the delivery docs are reviewed, then they state whether real Chrome/authenticated Google verification passed, failed, or was blocked, with evidence location.
- Given source-mode verification, when single album, multiple albums, or picker-selected photos cannot be completed, then the blocked mode has an exact reason and a follow-up task ID.
- Given trust guardrail review, when PP-014 is handed off, then no output claims write scope, automatic deletion, recovery/trash safety, full-library scanning, or numeric similarity/confidence.
- Given local checks are run, when verification completes, then the smallest relevant docs/format checks and any feasible smoke checks are recorded, with skipped checks explained.

## Spec Change Log

## Design Notes

PP-014 can end in `Blocked` and still be useful if the evidence is precise. A blocked manual demo must not be described as MVP readiness; it should identify the smallest follow-up that would unblock the real Google Photos path.

## Verification

**Commands:**

- `pnpm smoke:mvp` -- expected: deterministic fixture smoke passes or any failure is recorded as not real Google evidence.
- `pnpm check:docs` -- expected: delivery and testing docs remain linked and formatted for docs guard.
- `pnpm format:check -- docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-014/pp-014-evidence.md _bmad-output/implementation-artifacts/spec-pp-014-google-photos-mvp-flow.md` -- expected: changed Markdown is formatted.

**Manual checks (if no CLI):**

- Run `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` in Chrome with a real Google account and record screenshots/notes under `docs/delivery/artifacts/PP-014/`. If this environment lacks credentials, Chrome access, or suitable Google Photos test content, record Blocked rather than Passed.

## Suggested Review Order

**Blocked Outcome**

- Start with the PP-014 source-mode verdict and evidence boundaries.
  [`pp-014-evidence.md:25`](../../docs/delivery/artifacts/PP-014/pp-014-evidence.md#L25)

- Confirm backlog status and follow-up ownership match the evidence.
  [`TASK_BACKLOG.md:233`](../../docs/delivery/TASK_BACKLOG.md#L233)

- Check the iteration log for verification commands and review closure.
  [`ITERATION_LOG.md:22`](../../docs/delivery/ITERATION_LOG.md#L22)

**MVP Readiness**

- Verify the product ledger records PP-014 as blocked without overclaiming readiness.
  [`MVP_PROGRESS_LEDGER.md:42`](../../docs/product/MVP_PROGRESS_LEDGER.md#L42)

- Review next-work routing for PP-022 and PP-023.
  [`MVP_PROGRESS_LEDGER.md:72`](../../docs/product/MVP_PROGRESS_LEDGER.md#L72)

**Follow-Ups**

- Review album-source implementation scope and acceptance criteria.
  [`TASK_BACKLOG.md:275`](../../docs/delivery/TASK_BACKLOG.md#L275)

- Review picker real-account demo scope and acceptance criteria.
  [`TASK_BACKLOG.md:288`](../../docs/delivery/TASK_BACKLOG.md#L288)
