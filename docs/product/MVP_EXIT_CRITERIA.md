# MVP Exit Criteria

MVP exit requires evidence that the product is usable, safe, and aligned with the trust-first scope. Roadmap status alone is not sufficient.

## Exit gates

MVP is ready only when all gates below pass and the evidence is recorded in `docs/delivery/ITERATION_LOG.md`.

### Product usability

- Home screen loads without broken visible actions.
- Settings and Account/Profile show only required MVP account details and settings; non-required items are hidden or clearly unavailable.
- User can log in with an actual Google account through the authenticated flow.
- User can start the primary scan/review flow from real, read-only Google Photos content selected through the Google Photos Picker API session/media-items flow.
- User can scan Picker-selected photos from a real authenticated Google account after the app creates a Picker API session and lists selected media items through `v1.mediaItems`.
- Arbitrary single-album and multiple-album source modes are not required MVP pass evidence after PP-024 unless a later approved task documents a supported read-only Google Photos path.
- Full-library scanning is not required and must not be implied.
- User can complete the current review session without hidden persistence or destructive assumptions.
- Current-session selections survive an in-session timeout where technically possible; closing the browser may restart the scan for MVP.
- Results render grouped duplicate/near-duplicate candidates from real Google Photos content.
- Review helps the user identify identical and similar photos with clear reasons, such as shared people or backgrounds.
- Manual cleanup guidance is clear.
- Selected photos expose links or references that open the exact photo in Google Photos in a new tab for manual cleanup.
- Known limitations are visible before they can surprise the user.

### Trust and safety

- Confidence bands are only `High`, `Medium`, or `Low`.
- No similarity percentages appear in UI or product copy unless the explicit product-policy decision is resolved and the relevant trust docs, tests, and copy rules are updated together.
- No automatic deletion is offered, implied, or hidden.
- No in-app delete option is offered for Google Photos items in MVP.
- No write-scope Google Photos actions are requested or implied.
- No unsupported recovery, trash, recently-deleted, deletion-safety, storage-reclaimed, privacy, sharing, storage, or local-only claims appear.
- Trust copy states the authenticated secure flow, no auto-delete, no in-app image deletion, no stored or shared images unless actually implemented and documented otherwise, and no write scope into the Google library.
- User remains in control of each group and any real-world cleanup action.

### Verification

- MVP Playwright smoke test passes for the golden path in `docs/testing/MVP_SMOKE_TEST_PLAN.md`.
- Full CI gate passes: lint, format check, typecheck, tests, coverage gate, build, docs guard, and audits where applicable.
- `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` passes in Chrome with a real Google account and is recorded.
- Any known limitation is documented in `docs/product/MVP_PROGRESS_LEDGER.md` and has a follow-up task if it blocks launch.

## Known current status

- **MVP readiness: Not yet verified.** Implemented Phase 2 and Phase 3 technical components remain credited, but technical milestone delivery does not satisfy these exit gates.
- **PP-027 (`Ready`):** real-photo scan input and the Picker authorization/session lifecycle require repair before the supported path can be proven.
- **PP-006 (`Ready`):** review decisions, representative language, Settings/Profile behavior, and trust copy require truthful implementation or an honest unavailable state.
- **PP-016 (`Ready`):** exact-photo Google Photos link-out or a supported exact-item reference requires implementation and automated evidence.
- **PP-020 (`Ready`):** `pnpm smoke:mvp` exists, but its stale Picker contract must be replaced and the deterministic gate must run in CI; it cannot substitute for the real-account demo.
- **PP-015 (`Ready`):** current-run and project timeout, partial-result, retry, cancellation, and persistence behavior require truthful implementation and evidence.
- **PP-023 (`Blocked`):** the final real Chrome demonstration requires PP-027, PP-006, and PP-020 to pass, plus a product-owner-controlled real account, interactive Chrome, and suitable real content. PP-020 includes PP-016 automated coverage.
- **Full verification:** the complete CI gate and manual MVP demo remain required with evidence recorded in `docs/delivery/ITERATION_LOG.md` before the readiness status can change.
