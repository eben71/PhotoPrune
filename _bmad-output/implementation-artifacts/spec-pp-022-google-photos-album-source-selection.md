---
title: "PP-022 Google Photos album source selection"
type: "chore"
created: "2026-07-02"
status: "done"
baseline_commit: "dee6cafbf5c0676422b17e27e53ff056c2027530"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/docs/product/MVP_EXIT_CRITERIA.md"
  - "{project-root}/docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md"
  - "{project-root}/docs/delivery/artifacts/PP-014/pp-014-evidence.md"
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** PP-022 was created to provide read-only single-album and multiple-album Google Photos source selection, but official Google documentation indicates arbitrary real user album listing/fetch is no longer supported through broad Library API scopes after March 31, 2025. Leaving PP-022 as a normal implementation task would encourage unsupported scopes, raw album ID workarounds, or false MVP-readiness claims.

**Approach:** Treat PP-022 as a blocker-resolution task: verify the current Google API limitation against official docs and local code, record the launch blocker in delivery/product docs, and create or reference a product decision on whether MVP source scope can shift to picker-selected content or whether album-specific support remains launch-blocking.

## Boundaries & Constraints

**Always:** Keep the Google Photos flow read-only, plain-English, and honest about API limits. Preserve picker-selected photos as the only currently viable user-library path unless a documented Google API supports real album selection without write scope. Cite official Google documentation for the API limitation. Keep raw album ID and paged test fixtures out of MVP evidence.

**Ask First:** Changing OAuth scopes, adding any `photoslibrary.*` scope to production auth, adding a new backend Google API integration, changing MVP scope from albums to picker-selected photos only, or removing existing album-set test/backend paths requires human approval before implementation.

**Never:** Do not request Google Photos write scope. Do not claim arbitrary real album scanning works unless it is proven with supported APIs and a real Chrome demo. Do not add auto-delete, in-app Google Photos deletion, full-library scanning, recovery/trash claims, storage-reclaimed claims, or numeric confidence/similarity.

## I/O & Edge-Case Matrix

| Scenario                                   | Input / State                                                                                                       | Expected Output / Behavior                                                                 | Error Handling                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Official API blocks real album fetch       | Google docs restrict Library API list/search to app-created content and direct user-library selection to Picker API | PP-022 is marked Blocked with source citations, and PP-014 remains blocked for album modes | Create or update follow-up guidance; do not implement unsupported scopes |
| Existing raw album ID path remains in code | Saved-project run page accepts raw album IDs for `album_set` scope                                                  | Docs explicitly state raw IDs are not sufficient MVP evidence                              | Keep existing tests unless scoped removal is approved                    |
| Google API support is found                | Official docs expose a read-only real-user album selection/fetch path                                               | Halt and ask before changing auth/API architecture                                         | Do not silently broaden scope                                            |

</frozen-after-approval>

## Code Map

- `apps/web/app/hooks/useGooglePhotosPicker.ts` -- Current browser selection path; uses Picker-style selected media items, not real album listing.
- `apps/web/app/projects/[id]/run/page.tsx` -- Saved-project scan UI that currently exposes raw album/media ID fields for `album_set`.
- `apps/api/app/projects/ingestion.py` -- Backend `album_set` adapter accepts supplied metadata/test pages but does not fetch real Google Photos albums.
- `docs/delivery/TASK_BACKLOG.md` -- PP-022 status and evidence; PP-014 follow-up relationship.
- `docs/product/MVP_PROGRESS_LEDGER.md` -- Durable MVP truth and launch blocker.
- `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` -- Manual demo source-mode expectations that must not treat raw album IDs as passing.
- `docs/delivery/artifacts/PP-022/pp-022-evidence.md` -- New evidence artifact for official API findings.

## Tasks & Acceptance

**Execution:**

- [x] `docs/delivery/artifacts/PP-022/pp-022-evidence.md` -- add official Google API evidence and local code inspection notes -- make the blocker auditable.
- [x] `docs/delivery/TASK_BACKLOG.md` -- move PP-022 to Blocked or Done-as-blocker-resolution with exact evidence and next dependency -- keep backlog truthful.
- [x] `docs/delivery/TASK_BACKLOG.md` -- add or reference a product decision follow-up for MVP source scope -- separate platform limitation from product acceptance.
- [x] `docs/product/MVP_PROGRESS_LEDGER.md` -- record that real album source modes are a Google API/product-scope blocker, not merely missing UI polish -- prevent future overclaiming.
- [x] `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` -- clarify album rows cannot pass through raw album ID entry or app-created-data-only paths -- keep demo evidence honest.
- [x] `_bmad-output/implementation-artifacts/spec-pp-022-google-photos-album-source-selection.md` -- keep verification and review evidence current -- satisfy BMAD traceability.

**Acceptance Criteria:**

- Given PP-022 is reviewed, when a reader checks the evidence artifact, then they see official Google docs showing Library API real-user album listing/fetch is not available for arbitrary user libraries after the 2025 scope changes.
- Given PP-014 is rerun, when album source modes are assessed, then raw album IDs, fixture pages, app-created-data-only Library API paths, or unverified code inspection cannot count as passing real album evidence.
- Given delivery docs are reviewed, when PP-022 is handed off, then the repo clearly says whether the next step is a product-scope decision, a Google-supported Picker/manual-selection path, or a future API change.
- Given trust guardrails are checked, when PP-022 completes, then no write scope, auto-delete, in-app deletion, full-library scanning, recovery/trash claim, or numeric similarity/confidence was introduced.

## Spec Change Log

## Design Notes

Official docs checked during planning:

- Google Photos API update page says Library API listing/searching albums and media items is now limited to app-created content, and user-library selection should use the Google Photos Picker API.
- Google authorization docs list `photospicker.mediaitems.readonly` for Picker sessions and warn that broad Library API scopes were removed after March 31, 2025.
- Google Photos Picker REST reference exposes sessions and selected media item listing; it does not expose a real album-listing API.

The implementation should not pretend this is a UI-only gap. The likely outcome is resolution as a documented platform limitation unless Google later exposes a supported read-only album selection path, plus a product decision about whether MVP can substitute picker-selected content for album-specific source modes.

## Verification

**Commands:**

- `pnpm check:docs` -- expected: docs guard passes.
- `apps/web/node_modules/.bin/prettier.cmd --check docs/delivery/TASK_BACKLOG.md docs/product/MVP_PROGRESS_LEDGER.md docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md docs/delivery/artifacts/PP-022/pp-022-evidence.md _bmad-output/implementation-artifacts/spec-pp-022-google-photos-album-source-selection.md` -- expected: changed Markdown is formatted.
- `rg -n "\b\d+%|auto-delete|automatically delete|write scope|recently deleted|recovery|trash|storage reclaimed|full-library" docs/delivery/artifacts/PP-022 docs/delivery/TASK_BACKLOG.md docs/product/MVP_PROGRESS_LEDGER.md docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md _bmad-output/implementation-artifacts/spec-pp-022-google-photos-album-source-selection.md` -- expected: matches are negative guardrails, source-scope evidence, or blocker wording only.

**Manual checks:**

- Review official Google docs cited in the evidence artifact and confirm the final PP-022 status does not claim real album MVP support.

## Suggested Review Order

**Blocker Evidence**

- Start here for the official API conclusion and task result.
  [`pp-022-evidence.md:5`](../../docs/delivery/artifacts/PP-022/pp-022-evidence.md#L5)

- Check the narrowed arbitrary user-library album assessment.
  [`pp-022-evidence.md:48`](../../docs/delivery/artifacts/PP-022/pp-022-evidence.md#L48)

**Backlog And Decision Trail**

- Confirm PP-022 is blocked with evidence and next dependency.
  [`TASK_BACKLOG.md:277`](../../docs/delivery/TASK_BACKLOG.md#L277)

- Review the new product decision task and required outputs.
  [`TASK_BACKLOG.md:294`](../../docs/delivery/TASK_BACKLOG.md#L294)

- Verify the durable MVP ledger reflects the API limitation.
  [`MVP_PROGRESS_LEDGER.md:50`](../../docs/product/MVP_PROGRESS_LEDGER.md#L50)

**Manual Demo Guardrails**

- Confirm raw IDs and fixtures cannot pass album rows.
  [`MANUAL_MVP_DEMO_CHECKLIST.md:52`](../../docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md#L52)

- Check PP-014 now routes album resolution through PP-024 or supported APIs.
  [`pp-014-evidence.md:60`](../../docs/delivery/artifacts/PP-014/pp-014-evidence.md#L60)

**Verification Trail**

- Review executed checks and BMAD review-fix summary.
  [`ITERATION_LOG.md:32`](../../docs/delivery/ITERATION_LOG.md#L32)
