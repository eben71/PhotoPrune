# PP-014 Evidence - Real Authenticated Google Photos MVP Flow

## Result Summary

- Demo date: 2026-07-02
- Runner: Codex implementation session
- Browser: Not completed with real Chrome OAuth
- Environment or branch: `codex/pp-014-google-photos-mvp-flow`
- Overall result: Blocked
- Evidence folder: `docs/delivery/artifacts/PP-014/`
- Iteration log entry: `docs/delivery/ITERATION_LOG.md`
- Follow-up task IDs: PP-022 for Google Photos album source selection/fetch evidence; PP-024 for the MVP source-scope decision after the PP-022 API limitation finding; PP-023 for the real Chrome picker-selected Google Photos demo; PP-015 and PP-016 remain separate MVP gates for session timeout recovery and exact-photo link-out verification.
- Residual risk: Real Google Photos MVP readiness is not proven.

## Verification Performed

- Reviewed `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, and `docs/product/MVP_EXIT_CRITERIA.md`.
- Inspected the browser Google Picker implementation in `apps/web/app/hooks/useGooglePhotosPicker.ts`.
- Inspected the home picker-selected path in `apps/web/app/page.tsx`.
- Inspected the saved-project scan path in `apps/web/app/projects/[id]/run/page.tsx`.
- Inspected backend picker and album-set source resolution in `apps/api/app/projects/ingestion.py`.
- Searched for real Google Photos album API integration such as album listing, album media search, or Photos Library endpoints.
- Searched the changed PP-014 docs and evidence for forbidden claim patterns with `rg -n "\b\d+%|auto-delete|automatically delete|write scope|recently deleted|recovery|trash|storage reclaimed|full-library" ...`; matches were negative guardrail statements, historical command evidence, or blocker wording.

## Source Mode Results

| Source type            | Result                         | Evidence / notes                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single album           | Blocked                        | The saved-project scan UI accepts comma-separated album IDs when the project scope is `album_set`, but this session found no browser flow that lets the user authenticate and select one real Google Photos album. Backend album-set ingestion consumes supplied IDs, media items, or paged test data; it does not fetch real Google Photos album content itself. |
| Multiple albums        | Blocked                        | Same blocker as single album. The data model accepts multiple album IDs, but this session found no real Google Photos multi-album selection/fetch path suitable for the manual MVP demo.                                                                                                                                                                          |
| Picker-selected photos | Blocked for real-account proof | Code inspection shows a Google Picker path using the read-only picker media-items scope and selected media payload mapping, but the real Chrome/OAuth demo was not run because this agent session does not have a user-owned Google account, consent screen, or suitable real Google Photos test content. Follow-up: PP-023.                                      |

## Implementation Findings

- `apps/web/app/hooks/useGooglePhotosPicker.ts` requests `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` and `https://www.googleapis.com/auth/userinfo.profile`; no write scope was found in the picker hook or PP-014 changed docs.
- `apps/web/app/page.tsx` stores selected picker items in session state and routes to `/run`.
- `apps/web/app/projects/[id]/run/page.tsx` can start picker-scoped saved scans from selected items.
- `apps/web/app/projects/[id]/run/page.tsx` exposes raw album/media ID fields for `album_set` scoped projects, but that is not a product-owner-ready real Google Photos album picker.
- `apps/api/app/projects/ingestion.py` resolves `album_set` requests from provided `albumIds`, `mediaItemIds`, `mediaItems`, or `pagedMediaItems`; no live Google Photos album fetch was found there.

## Trust Guardrails

Code and documentation inspection for this task found no PP-014 change introducing:

- Google Photos write scope.
- Automatic deletion or hidden destructive actions.
- In-app Google Photos deletion.
- Full-library scanning claims or affordances.
- Numeric similarity/confidence percentages.
- Recovery, trash, recently-deleted, deletion-safety, or storage-reclaimed claims.

## Manual Demo Status

The manual MVP demo checklist was not completed. The blocker is not an automated test failure; it is missing real user-controlled execution evidence for Chrome OAuth and real Google Photos content, plus missing product-ready album source selection/fetch for single and multiple albums.

The MVP should not be described as passing PP-014 until:

- A human runs `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` in Chrome with a real Google account.
- Picker-selected photos pass with real content through PP-023 or a later PP-014 rerun.
- Single-album and multiple-album source modes pass through a real, read-only Google Photos flow supported by current APIs, or PP-024 changes MVP source scope and the relevant exit criteria/checklists are updated before a later PP-014 rerun records passing evidence.
