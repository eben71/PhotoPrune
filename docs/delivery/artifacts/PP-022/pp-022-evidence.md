# PP-022 Evidence - Google Photos Album Source Selection

## Result

Status: Blocked.

PP-022 cannot honestly be completed as real arbitrary user-library single-album or multiple-album selection/fetch without changing product scope or relying on unsupported Google Photos API behavior. The supported user-library selection path is the Google Photos Picker API, which returns user-selected media items for a Picker session, not a product-ready album listing/fetch API.

## Official Google API Evidence

Retrieved: 2026-07-02.

Sources:

- Google Photos API updates: https://developers.google.com/photos/support/updates (page last updated 2025-08-28 UTC)
- Google Photos authorization scopes: https://developers.google.com/photos/overview/authorization (page last updated 2025-08-28 UTC)
- Google Photos Picker REST reference: https://developers.google.com/photos/picker/reference/rest (page last updated 2024-10-09 UTC)

Findings:

- Google's API update page says the 2025 changes introduce the Picker API for secure user photo selection and refocus the Library API on app-created content. It states that `photoslibrary.readonly`, `photoslibrary.sharing`, and `photoslibrary` were removed after March 31, 2025.
- The same update page says listing, searching, and retrieving media items and albums is now limited to content created by the app. It directs apps that need users to select photos or albums from the entire library to use the Picker API.
- The authorization page lists the Picker scope `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` as access to create, get, and delete Picker sessions and list media items for sessions.
- The authorization page warns that after March 31, 2025, the removed broad Library API scopes only allow access to content created by the application. It also lists `photoslibrary.appendonly` as write access only and `photoslibrary.readonly.appcreateddata` as read access only to developer-created media items and albums.
- The Picker REST reference exposes `v1.sessions` and `v1.mediaItems`. `GET /v1/mediaItems` returns media items picked by the user during a session. The reference does not expose a user-library album listing/fetch endpoint.

Conclusion: There is no documented read-only Google Photos API path for PhotoPrune to list and fetch arbitrary real albums from the product owner's existing library. Picker-selected photos remain viable; PP-024 later resolved that Picker-selected real Google Photos content is the MVP source mode.

## Local Code Inspection

Inspected paths:

- `apps/web/app/hooks/useGooglePhotosPicker.ts`
- `apps/web/app/projects/[id]/run/page.tsx`
- `apps/api/app/projects/ingestion.py`
- `packages/shared/src/projects.ts`
- `apps/web/src/types/projects.ts`

Findings:

- The browser picker hook requests `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`, matching the supported Picker media-item session path.
- The saved-project run page still exposes raw `Album IDs (comma-separated)` for `album_set` projects and separately supports picker-selected media items. This is not a product-owner-ready Google Photos album picker.
- The API `AlbumSetSourceAdapter` consumes supplied `albumIds`, `mediaItemIds`, `mediaItems`, or `pagedMediaItems`. It does not authenticate to Google Photos or fetch arbitrary real user album contents.
- Shared project schemas retain `album_set` metadata. That internal scope metadata and fixture-style ingestion path should remain separate from MVP manual-demo evidence.

## Acceptance Assessment

- Single arbitrary real user-library album selection: Blocked by current Google API support.
- Multiple arbitrary real user-library album selection: Blocked by current Google API support.
- Scan input populated from arbitrary real Google Photos album content without write scope: Blocked.
- Trust guardrails: Passed for this task. No write scope, in-app Google Photos deletion, automatic deletion, recovery/trash claim, full-library scanning claim, or numeric similarity/confidence was introduced.

## Required Follow-Up

- PP-024 resolved the MVP source-scope decision: Picker-selected real Google Photos content is the MVP source mode, and arbitrary single/multiple album support is not MVP pass evidence unless a later approved task documents a supported read-only Google Photos path.
- PP-014 cannot pass MVP source evidence through raw album IDs, fixture/paged test data, app-created-data-only Library API reads, backend metadata, or code inspection alone.
