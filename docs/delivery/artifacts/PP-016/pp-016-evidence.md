# PP-016 Delivery Evidence

Date: 2026-07-27

## Outcome

PP-016 is complete with an honest exact-or-unavailable contract:

- A compatible source-provided exact item URL must be HTTPS on `photos.google.com` and include a non-empty `photo` path segment.
- A verified URL is rendered as “Open exact photo in Google Photos,” opens in a new tab, and uses `noopener noreferrer`.
- When no verified URL exists, the UI shows “Exact Google Photos link unavailable” and calm guidance to identify the photo manually before making changes.
- Google Photos homepage, filename-query, and media-ID search fallbacks are not generated, copied, opened, or represented as exact.

Google’s current [Picker API `PickedMediaItem` reference](https://developers.google.com/photos/picker/reference/rest/v1/mediaItems) documents `id`, `createTime`, `type`, and `mediaFile`, but no `productUrl`. Automated Picker evidence therefore expects the unavailable state. PP-023 remains the separate real-account validation gate.

## Acceptance Evidence

| Acceptance area | Evidence |
| --- | --- |
| Exact destination | API and web validators accept supported photo-item paths and reject homepage, search, non-Google, and non-HTTPS destinations. |
| New tab | Component and project-flow tests assert `target="_blank"` and `rel="noopener noreferrer"`. |
| No destructive behavior | Trust scan and visual review found no in-app delete, automatic cleanup, write scope, recovery/trash claim, or similarity percentage. |
| Honest unavailable state | Unit tests, saved-project API tests, and the MVP Playwright smoke assert that absent URLs remain absent and show manual guidance. |
| Mixed group behavior | Component/unit and visual QA confirm exact and unavailable candidates remain independent within the same group. |

## Verification

- Focused web: 94 tests passed; line coverage 85.14%.
- Focused API: 35 tests passed.
- Full API: 157 tests passed; coverage 92.37%.
- Worker: 2 tests passed; coverage 100%.
- Deployment-boundary tests: 19 passed.
- Dependency-preflight tests: 6 passed.
- `make lint`: passed.
- `make format-check`: passed.
- `make typecheck`: passed.
- `make test`: passed.
- `node scripts/check-coverage.mjs`: passed.
- `make build`: passed.
- `pnpm check:deployment-boundary`: passed.
- `pnpm check:docs`: passed.
- `pnpm smoke:mvp`: passed in Chromium.

The smoke initially exposed a pre-existing mismatch: Playwright ran the web gateway on port 3022 after PP-028 restricted it to port 3000. The smoke configuration now uses the documented port, and the gateway accepts either documented loopback alias only when the browser supplies a same-origin Fetch Metadata signal. Focused and full security tests cover the repair.

## Trust UI Review

- Review groups remain the primary action unit.
- Confidence remains `High`, `Medium`, or `Low` only.
- The exact link is a secondary external action; unavailable candidates show information rather than a deceptive or dead action.
- Copy is centralized in `trustCopy.ts`, plain English, and explicit that users must review and act manually.
- Desktop 1440×900 and mobile 390×844 visual checks found no horizontal overflow.

## Visual Artifacts

- `pp-016-unavailable-desktop.png`
- `pp-016-unavailable-desktop-focus.png`
- `pp-016-unavailable-mobile.png`
- `pp-016-mixed-link-desktop.png`

Fixture placeholders can emit existing Next Image sizing warnings during evidence capture; this does not affect the exact-link control or real selected-photo rendering. No PP-016 acceptance criterion was skipped.
