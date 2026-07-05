---
title: "PP-025 Google Photos Picker API Session Media Items Source Path"
type: "feature"
created: "2026-07-05"
status: "done"
baseline_commit: "007e3b98657c55e0d3ed7597892f6d8bc016a1a5"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/apps/web/AGENTS.md"
  - "{project-root}/docs/delivery/TASK_BACKLOG.md"
  - "{project-root}/docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md"
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** PP-025 is needed because the current project run path requests the read-only Google Photos Picker scope but still opens the legacy Google Picker `DocsView(DOCS_IMAGES)` UI, which cannot count as PP-023 or PP-014 MVP source evidence. The app has no implementation that creates Google Photos Picker API `v1.sessions` or lists selected media through `v1.mediaItems`.

**Approach:** Implement the supported browser-side Google Photos Picker API session flow in the existing web picker hook: obtain the same read-only Picker access token, create a Picker session, open the session picker URI for user selection, poll the session until media items can be listed, normalize those media items, and feed them into the existing project scan start path. Keep backend scan ingestion unchanged unless the selected media item shape exposes a necessary contract gap.

## Boundaries & Constraints

**Always:** Use only `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` plus existing profile scope if still required by current auth setup; preserve the group-based scan/review flow; keep user-facing copy plain and trust-safe; use existing web state and scan request paths where possible; record delivery evidence in `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md`.

**Ask First:** Any need for Google Photos write scopes, backend OAuth token storage, persistent scan history, new dependencies, app-created Library API reads, or a UX that asks users to paste raw Google Photos identifiers.

**Never:** Do not use legacy Google Picker `DocsView(DOCS_IMAGES)` as the implemented MVP evidence path; do not add auto-delete, in-app deletion, recovery/trash claims, similarity percentages, raw album ID workarounds, fixture/paged test evidence as real MVP proof, or unsupported privacy/storage claims.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Session selection succeeds | Configured Google OAuth client, user grants read-only Picker scope, Picker API returns session picker URI, user selects photos, `v1.mediaItems` returns selected media | Hook returns normalized selected photo items; project run page stores them in the current run session; existing Start saved scan posts them as `photoItems` with `sourceType: "picker"` | None |
| User cancels or closes selection | Session is created but no media items become available before the user finishes or timeout expires | Hook returns `null` or an empty selection and sets `lastOutcome` to `cancelled` without starting a scan | Show existing calm picker error only when the flow actually fails |
| Google API failure | Token, session creation, polling, or media item listing fails with non-ok response | Hook returns `null`; no scan starts; existing selection remains unchanged | Set a concise picker error that does not imply deletion, recovery, or unsupported guarantees |

</frozen-after-approval>

## Code Map

- `apps/web/app/hooks/useGooglePhotosPicker.ts` -- current legacy Google Picker hook; primary implementation target for OAuth token reuse, Picker API session creation, picker URI opening, polling/listing, selected item normalization, and error state.
- `apps/web/tests/use-google-photos-picker-hook.test.tsx` -- focused hook coverage currently stubs `gapi`/Google Picker; update to stub `fetch`, window opening, session polling, media item listing, cancellation, and failure paths.
- `apps/web/app/projects/[id]/run/page.tsx` -- consumes `openPicker()` and starts the existing project scan from `state.selection`; verify selected Picker API media still flows into `photoItems`.
- `apps/api/app/projects/ingestion.py` -- confirms picker scans already accept supplied `photoItems`; avoid backend changes unless web/API contracts require one.
- `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` -- required delivery status and evidence updates.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/app/hooks/useGooglePhotosPicker.ts` -- replace the legacy `gapi`/`DocsView(DOCS_IMAGES)` implementation with Photos Picker API `v1.sessions` create/get and `v1.mediaItems` list calls -- ensures PP-025 uses the supported Google Photos source path.
- [x] `apps/web/app/hooks/useGooglePhotosPicker.ts` -- map Picker API media item fields into the existing `PickerMediaItem` and `PickerItem` shapes -- preserves the current scan start path without broad contract churn.
- [x] `apps/web/tests/use-google-photos-picker-hook.test.tsx` -- update tests for successful session creation/listing, user cancellation or timeout, missing config, and API failure -- protects the new integration boundary and prevents regression to legacy DocsView evidence.
- [x] `docs/delivery/TASK_BACKLOG.md` -- mark PP-025 status/evidence accurately after implementation and verification -- keeps the repo-native source of truth current.
- [x] `docs/delivery/ITERATION_LOG.md` -- append exact verification evidence, skipped checks, residual risk, and follow-up blockers if any -- satisfies delivery convergence rules.

**Acceptance Criteria:**
- Given a configured Google OAuth client and API access, when the user selects photos through the Google Photos Picker API session UI, then the app creates a `v1.sessions` session and lists selected media through `v1.mediaItems`.
- Given selected Picker API media items, when the user starts a saved scan, then the app posts those items through the existing picker scan path without requesting any write scope.
- Given the legacy Google Picker library is unavailable, when the user opens the project source selector, then the supported Photos Picker API flow can still run and no `DocsView(DOCS_IMAGES)` dependency is required.
- Given no user selection or a recoverable Picker API failure, when the hook completes, then no scan starts automatically and the UI shows only trust-safe retry/error copy.
- Given PP-023 or PP-014 evidence is reviewed, when only legacy DocsView, raw album IDs, backend metadata, fixture/paged test data, or code inspection exists, then it is still not recorded as passing MVP source evidence.

## Spec Change Log

## Design Notes

The Google Photos Picker API does not use the legacy Google Picker JavaScript `DocsView` surface. The hook should treat the REST session as the source of truth, open the returned picker URI for the user, and list selected media items from the session endpoint before normalizing them for the existing scan request.

## Verification

**Commands:**
- `pnpm --filter web test -- use-google-photos-picker-hook.test.tsx` -- expected: focused hook tests pass.
- `pnpm --filter web lint` -- expected: web lint passes.
- `pnpm --filter web typecheck` -- expected: web typecheck passes.
- `pnpm --filter web test` -- expected: web test suite passes.
- `make lint` -- expected: repo lint gate passes before handoff if feasible.
- `make format-check` -- expected: repo format gate passes before handoff if feasible.
- `make typecheck` -- expected: repo typecheck gate passes before handoff if feasible.
- `make test` -- expected: repo tests pass before handoff if feasible.
- `node scripts/check-coverage.mjs` -- expected: coverage gate passes before handoff if feasible.
- `make build` -- expected: repo build passes before handoff if feasible.

## Suggested Review Order

**Picker API Flow**

- Start here to see the browser entry point and cleanup lifecycle.
  [`useGooglePhotosPicker.ts:379`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L379)

- Session creation defines the supported Google Photos Picker API boundary.
  [`useGooglePhotosPicker.ts:166`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L166)

- Polling handles `/autoclose`, cancellation, timeout, and completion states.
  [`useGooglePhotosPicker.ts:219`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L219)

- Media listing handles pagination and repeated page-token protection.
  [`useGooglePhotosPicker.ts:265`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L265)

- Normalization keeps the existing scan shape and download-ready photo URL.
  [`useGooglePhotosPicker.ts:309`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L309)

**Verification**

- Main test proves session creation, polling, media listing, and cleanup.
  [`use-google-photos-picker-hook.test.tsx:139`](../../apps/web/tests/use-google-photos-picker-hook.test.tsx#L139)

- Edge-case tests cover closed popups, pagination loops, and cleanup failure paths.
  [`use-google-photos-picker-hook.test.tsx:175`](../../apps/web/tests/use-google-photos-picker-hook.test.tsx#L175)

**Delivery Evidence**

- PP-023 now waits on real Chrome evidence, not missing implementation.
  [`TASK_BACKLOG.md:315`](../../docs/delivery/TASK_BACKLOG.md#L315)

- PP-025 records implementation evidence and remaining manual-demo boundary.
  [`TASK_BACKLOG.md:333`](../../docs/delivery/TASK_BACKLOG.md#L333)

- Iteration log captures review fixes and full green handoff gate.
  [`ITERATION_LOG.md:22`](../../docs/delivery/ITERATION_LOG.md#L22)
