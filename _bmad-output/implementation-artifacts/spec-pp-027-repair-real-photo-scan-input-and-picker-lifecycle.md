---
title: "PP-027 Repair the Real-Photo Scan Input and Picker Lifecycle"
type: "feature"
created: "2026-07-20"
status: "done"
approved: "2026-07-20"
baseline_commit: "725f749"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/apps/web/AGENTS.md"
  - "{project-root}/docs/delivery/TASK_BACKLOG.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-pp-025-google-photos-picker-api-session-media-items-source-path.md"
---

# PP-027 Repair the Real-Photo Scan Input and Picker Lifecycle

## Approval Record

Approved on 2026-07-20 for builder implementation. The intent, boundaries, technical decisions, edge-case expectations, acceptance criteria, verification requirements, and non-goals in this specification are frozen. Any implementation need that would change them requires renewed human review before the builder proceeds.

The review questions are resolved as follows:

1. Allow partial scan results when individual downloads fail, recording those items through the existing failed/skipped-item contract. Fail the entire scan only when no selected item can be hashed.
2. Preserve `productUrl` ephemerally through the current scan so PP-016 can evaluate exact-item link-out. Do not persist it as project scope or scan history.
3. Define the 2,000-item limit once in each runtime where needed and protect alignment with contract tests. Do not introduce unrelated shared-package churn.

## Intent

**Problem:** The supported Google Photos Picker session flow returns real media metadata, but the saved-project run page discards the selected `baseUrl` and real dimensions when it builds `photoItems`. The API can therefore receive items with no retrievable bytes, and the scan engine silently skips byte hashing for them. The Picker hook also opens its window only after asynchronous token and session work, has no explicit popup-blocked outcome, and does not recover once from an expired access token or a Picker API `401`.

**Approach:** Preserve one ephemeral Picker item contract from selection through the saved-project scan request, normalize that contract at the existing API boundary, and fail the scan clearly when selected items cannot supply image bytes. Open a blank named window synchronously in the selection button's user gesture and navigate it only after authorization and Picker-session creation. Centralize Picker API authorization so one bounded token refresh and request replay handles `401` responses. Keep the existing single-session limit of 2,000 items and reject any response that exceeds it rather than truncating.

## Boundaries and Constraints

**Always:** Keep OAuth access tokens in browser memory only; send only the selected media ID, creation time, filename, MIME type, real dimensions, Picker `baseUrl`/download URL, and product URL when needed for the existing exact-item link-out evaluation; preserve the read-only Picker scope; keep the group-based review flow; return explicit, trust-safe failure states; use deterministic local image bytes for automated tests.

**Ask first:** Persisting Picker `baseUrl` values beyond the current scan, storing OAuth tokens anywhere, changing the deployment security boundary, introducing a batching/resume persistence design, adding dependencies, or changing the 2,000-item product limit.

**Never:** Add Google Photos write scopes, silently truncate a completed selection, treat metadata-only items as successfully scanned, retry authorization without a fixed bound, claim that photo bytes are stored, add deletion behavior, or expose similarity percentages.

## Technical Decisions

### 1. Ephemeral selected-item contract

`PickerItemSchema` remains the browser/session contract and is extended only where its current fields are insufficient. A selected item must carry:

- `id`
- `createTime`
- `filename`
- `mimeType`
- real `width` and `height`
- download-ready `baseUrl`
- optional `productUrl`

The saved-project run page must map these values without substituting fixed dimensions or omitting the URL. Its scan request sends the URL under the API's existing `downloadUrl` alias (or updates the shared boundary consistently if `baseUrl` remains the wire name). Do not persist the expiring download URL in project scope or scan history; it is current-scan input only.

### 2. Byte retrieval is required for Picker scans

The API normalizer continues to produce `PhotoItem.download_url`. For a Picker-source request, missing or empty download URLs are validation failures before scan execution. A retrieval or decode failure is reported as a failed/skipped item according to the existing result-envelope contract; if no selected item can be hashed, the scan fails instead of returning a successful empty result.

The engine must not silently `continue` past every item without a download URL. Album or fixture paths that intentionally allow metadata-only input must not be broadened or broken; source-specific validation belongs at ingestion/route normalization, with a defensive engine failure for an entirely unhashable real scan.

### 3. Popup lifecycle

`openPicker()` synchronously calls `window.open('', <stable-name>)` before its first `await`.

- If `window.open` returns `null`, stop immediately with an explicit `popup-blocked` outcome and calm retry guidance.
- While token and session creation run, keep the blank window under app control.
- After `pickerUri` is returned, navigate the existing window to the autoclose URI; do not open a second window.
- If the user closes the placeholder before navigation, cancel session setup/cleanup and report `cancelled`.
- During polling, preserve the existing close grace period so Google can finalize a completed selection; after the grace period, report `cancelled`.
- Close the placeholder on setup failure and delete a created Picker session on every terminal path where cleanup is possible.

### 4. Bounded authorization and `401` recovery

The only requested Google scope is `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`. Remove profile or other unused scopes from this hook.

Create one authorization helper that can request an access token and one Picker-fetch helper that:

1. sends the request with the current in-memory token;
2. on the first `401` only, requests a fresh token and replays that request once;
3. surfaces the second `401` or any non-retriable response without another authorization loop.

The retry budget applies to each logical Picker operation and is never recursive or unbounded. Cancellation or OAuth errors do not replay the operation. Session cleanup may make a best-effort authorized request but must not start an interactive reauthorization prompt after a successful selection.

### 5. Item limit

The supported value is **2,000 selected items per Picker session and scan**. Keep `maxItemCount: '2000'`, align the web engine hard cap and API validation to the same value, and document the value in user-facing limit copy only where the UI already presents scan limits.

Pagination must collect all pages, detect repeated page tokens, and reject a collected response above 2,000. It must never use `slice`, stop after the first page, or silently discard items. A batching/resume design is out of scope for PP-027.

## I/O and Edge-Case Matrix

| Scenario                       | Input/state                                                              | Expected behavior                                                                                   | Evidence                                             |
| ------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Successful selection           | Two Picker media items with valid local fixture URLs and real dimensions | The saved scan sends both URLs/dimensions; API downloads bytes; exact fixture bytes produce a group | Hook, page/route, adapter, and API integration tests |
| Popup blocked                  | Synchronous `window.open` returns `null`                                 | No token/session request; explicit blocked state; no scan starts                                    | Hook test                                            |
| Placeholder closed early       | Window closes before session navigation                                  | Flow cancels and cleans up without opening another window                                           | Hook test                                            |
| Picker closed after selection  | Window closes while Google finalizes `mediaItemsSet`                     | Grace-period polling can still return the completed selection                                       | Hook test                                            |
| Expired token                  | First logical Picker request returns `401`                               | One fresh token request and one successful replay                                                   | Hook test                                            |
| Repeated `401`                 | Initial and replayed requests return `401`                               | Flow fails after one replay; no loop                                                                | Hook test                                            |
| Over-limit response            | Pagination yields 2,001 items                                            | Whole selection is rejected with explicit limit error                                               | Hook/route test                                      |
| Repeated page token            | API repeats a non-empty token                                            | Listing fails explicitly; partial items are not returned                                            | Hook test                                            |
| Missing URL                    | Picker scan item has no usable URL                                       | Request is rejected before a successful scan is recorded                                            | Route/API test                                       |
| Unretrievable or invalid bytes | URL returns an error or non-image bytes                                  | Item failure is visible; an all-invalid scan fails rather than returning empty success              | API integration test                                 |
| Valid duplicate bytes          | Local server returns identical deterministic images at two URLs          | Byte hashes are created and an exact group is returned                                              | API integration test                                 |

## Code Map

- `apps/web/app/hooks/useGooglePhotosPicker.ts` — synchronous placeholder window, explicit outcomes, scope minimization, bounded reauthorization, pagination, limit enforcement, and session cleanup.
- `apps/web/src/types/phase2Envelope.ts` — authoritative ephemeral Picker selection fields used by browser state and engine input.
- `apps/web/app/projects/[id]/run/page.tsx` — preserve selected URL and real dimensions in `photoItems`; surface Picker and scan failures without unsupported claims.
- `apps/web/app/api/projects/[projectId]/scan/route.ts` — verify the proxy preserves the request contract unchanged.
- `apps/web/src/engine/engineAdapter.ts` — keep the 2,000-item hard cap aligned and preserve `downloadUrl` at the API boundary.
- `apps/api/app/engine/schemas.py` and `apps/api/app/engine/normalizer.py` — validate and normalize the download-ready wire contract.
- `apps/api/app/projects/ingestion.py` and `apps/api/app/api/routes.py` — enforce Picker-source requirements before execution and record truthful failures.
- `apps/api/app/engine/scan.py` — defensively prevent a real scan with zero usable byte hashes from succeeding silently.
- `scripts/fixture_media_server.py` and `tests/fixtures/picker/` — deterministic local image responses, including invalid and failing variants.
- `apps/web/tests/use-google-photos-picker-hook.test.tsx`, `apps/web/tests/projects-phase3.test.tsx`, and `apps/web/tests/engine-adapter.test.ts` — browser, request, and adapter coverage.
- `apps/api/tests/test_projects.py`, `apps/api/tests/test_routes_scan.py`, and `apps/api/tests/test_scan.py` — request validation, byte retrieval, failure, and grouping coverage.
- `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` — implementation status and exact verification evidence after building.

## Tasks and Acceptance

### Task 1: Make Picker authorization and window handling resilient

- [x] Open the placeholder synchronously and represent blocked, closed, cancelled, selected, and failed terminal states explicitly.
- [x] Navigate the placeholder after session creation and clean up it and the Picker session on terminal paths.
- [x] Remove unused OAuth scopes.
- [x] Add one bounded token refresh and replay for Picker API `401` responses.
- [x] Preserve complete paginated selection and enforce the 2,000-item limit without truncation.

### Task 2: Preserve real scan inputs across the web boundary

- [x] Carry the Picker `baseUrl`, dimensions, media ID, filename, MIME type, creation time, and optional product URL through `PickerItem` and current run state.
- [x] Send real dimensions and `downloadUrl` from the saved-project scan page.
- [x] Keep the adapter and direct run path consistent with the saved-project path.
- [x] Do not persist tokens, photo bytes, or expiring download URLs beyond the current scan.

### Task 3: Reject or report inputs without usable bytes

- [x] Validate that Picker-source items have a usable download URL.
- [x] Report retrieval/decode failures through the existing failed/skipped-item model where possible.
- [x] Fail a scan with no hashable bytes instead of returning successful empty groups.
- [x] Preserve valid exact and near-duplicate grouping behavior.

### Task 4: Prove the end-to-end contract

- [x] Add deterministic local-image integration fixtures.
- [x] Assert URLs and dimensions survive hook, page, route, adapter, normalizer, and engine boundaries.
- [x] Cover popup blocked/closed, token expiry/`401`, repeated `401`, over-limit selection, invalid media, and successful exact grouping.
- [x] Update backlog and iteration evidence only after implementation and verification.

## Acceptance Criteria

1. Given Picker-selected real items, starting a saved-project scan preserves a download-ready URL, real dimensions, media ID, and only the minimum current-scan metadata through the hashing boundary.
2. Given an item without retrievable image bytes, the scan rejects it or reports it truthfully; an entirely unhashable input cannot complete as an unexplained empty result.
3. Given a user click, the Picker placeholder opens synchronously; blocked and user-closed windows produce distinct, explicit outcomes.
4. Given an expired token or first Picker API `401`, the operation obtains one fresh token and retries once; a second failure terminates without looping.
5. Given a completed selection, all pages up to 2,000 items are retained; a response above 2,000 is rejected and never truncated.
6. Given deterministic duplicate image bytes, integration coverage proves the API downloads and hashes them into a successful exact group.
7. No Google Photos write scope, token persistence, photo-byte persistence, automatic deletion, recovery claim, or similarity percentage is introduced.

## Verification

### Focused checks while building

```text
pnpm --filter web test -- use-google-photos-picker-hook.test.tsx projects-phase3.test.tsx engine-adapter.test.ts
pnpm --filter web lint
pnpm --filter web typecheck
apps/api/.venv/bin/pytest apps/api/tests/test_projects.py apps/api/tests/test_routes_scan.py apps/api/tests/test_scan.py apps/api/tests/test_downloads.py
```

### Required handoff gate

```text
make lint
make format-check
make typecheck
make test
node scripts/check-coverage.mjs
make build
pnpm check:docs
pnpm smoke:mvp
```

PP-023 remains the separate product-owner-controlled real-account Chrome proof. Automated fixture evidence for PP-027 must not be recorded as that real-account proof.

## Non-Goals

- Persisted scan-history or run-lifecycle redesign owned by PP-015.
- Exact Google Photos destination behavior owned by PP-016.
- Real-account demo sign-off owned by PP-023.
- Deployment security changes owned by PP-028.
- Multi-session batching/resume or a selection limit above 2,000.
- Album-source restoration, Google Photos write behavior, deletion, or recovery flows.

## Builder Handoff

- Implement PP-027 in a separate builder session from baseline commit `d4d9a7e`, using this approved specification as the frozen contract.
- Keep the failed/skipped-item envelope, ephemeral `productUrl`, and per-runtime 2,000-item constants within the approved decisions above.
- Stop for renewed human review if implementation would change an approved boundary, acceptance criterion, verification requirement, or non-goal.
- Update the delivery backlog and iteration log only after implementation and verification evidence exist.
- Use a separate verifier session where practical before marking PP-027 done.

## Suggested Review Order

**Picker lifecycle and authorization**

- Start with the synchronous popup, bounded authorization, and terminal cleanup orchestration.
  [`useGooglePhotosPicker.ts:389`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L389)

- Review strict pagination, completeness, duplicate-ID, and 2,000-item enforcement.
  [`useGooglePhotosPicker.ts:297`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L297)

**Current-scan contract**

- Saved scans preserve real metadata, consent, and the immediate ephemeral envelope.
  [`page.tsx:69`](../../apps/web/app/projects/[id]/run/page.tsx#L69)

- Matching current-session results retain exact links and truthful failed-item guidance.
  [`page.tsx:132`](../../apps/web/app/projects/[id]/results/page.tsx#L132)

- Direct scans send the same dimensions, URLs, and ephemeral product link.
  [`engineAdapter.ts:396`](../../apps/web/src/engine/engineAdapter.ts#L396)

**API validation and partial outcomes**

- Picker project requests reject missing URLs and over-limit selections before execution.
  [`schemas.py:114`](../../apps/api/app/projects/schemas.py#L114)

- Scan execution isolates unreadable items and fails only entirely unhashable real scans.
  [`scan.py:24`](../../apps/api/app/engine/scan.py#L24)

- Result envelopes count accepted, rejected, grouped, and ungrouped items consistently.
  [`routes.py:278`](../../apps/api/app/api/routes.py#L278)

- Picker product links are intentionally excluded from durable project records.
  [`repository.py:314`](../../apps/api/app/projects/repository.py#L314)

**Verification and fixtures**

- Hook tests cover blocked, closed, timeout, 401, pagination, and cleanup branches.
  [`use-google-photos-picker-hook.test.tsx:43`](../../apps/web/tests/use-google-photos-picker-hook.test.tsx#L43)

- The local fixture contract proves duplicate grouping plus invalid and failed downloads.
  [`test_pp027_fixture_contract.py:16`](../../apps/api/tests/test_pp027_fixture_contract.py#L16)

- Browser smoke now exercises Photos Picker REST instead of the retired legacy stub.
  [`mvp-smoke.spec.ts:17`](../../tests/e2e/mvp-smoke.spec.ts#L17)
