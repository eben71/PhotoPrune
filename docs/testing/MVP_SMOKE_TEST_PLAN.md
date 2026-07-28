# MVP Smoke Test Plan

The MVP smoke test proves the golden path is usable enough for review. It is not a substitute for full CI or manual demo verification.

## Automated command

Run from the repo root:

```bash
pnpm smoke:mvp
```

This starts the Next.js web app on `127.0.0.1:3000` with `NEXT_PUBLIC_PHASE2_RUN_MODE=fixture` and runs the Playwright Chromium suite under `tests/e2e/`. The suite keeps the broad golden path in `mvp-smoke.spec.ts` and focused trust regressions in `mvp-regression.spec.ts`.

The automated suite stubs the Google Photos Picker REST `v1.sessions` and `v1.mediaItems` contracts and uses deterministic fixture results. It does not use real Google credentials or real Google Photos content. The Chrome manual demo with a real Google account remains a separate MVP exit gate and must be run with `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`.

## Automated fixture path

- Home page loads.
- No broken visible nav/actions appear.
- Primary CTA works.
- Fixture-mode source selection works without requesting write scope.
- The test data is clearly deterministic fixture content and is not treated as real Google Photos MVP readiness evidence.
- Full-library scanning is not offered or implied.
- Scan can start from the selected fixture content.
- Run/progress screen renders.
- Results/review screen renders grouped output.
- Confidence labels are `High`, `Medium`, or `Low` only.
- Review gives understandable reasons for identical/similar grouping, such as shared people or backgrounds.
- Manual guidance is visible.
- No automatic deletion or destructive copy appears.
- Settings/Profile show only required MVP account details and settings, or hide non-required items.

## Focused deterministic regressions

The same command also verifies:

- `/run` and `/results` session guards remain truthful.
- PP-006 ephemeral reviews do not imply saved decisions, while saved-project representative and done decisions cross the browser API boundary.
- PP-016 exact supported Google Photos links open in a new tab with safe link attributes, and items without an exact link show the honest unavailable state.
- Trust-forbidden claims stay absent from key pages.
- Settings and Account remain reachable and MVP-scoped at a narrow viewport.

Real Google login, real Picker media, and endpoint-level proof that Google served the Picker session/media-items flow belong to `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`. PP-015 owns cancellation, timeout/restart, retry, and durable partial-result product behavior; deterministic tests must not stand in for unimplemented or separately gated lifecycle evidence.

## Required assertions

- No similarity percentages are visible unless the explicit product-policy decision has been resolved and the related trust docs, tests, and copy rules were updated together.
- No write-scope Google Photos action is requested or implied.
- No in-app Google Photos delete option is visible.
- No recovery/trash/recently-deleted flow is promised.
- No unsupported stored-images, shared-images, storage-reclaimed, privacy, or local-only claims are visible.
- User can stop or navigate without hidden destructive assumptions.
- Known limitations are visible where the user needs them.

## Evidence to record

- Command used to run the smoke test.
- Browser/device viewport used. The automated suite uses Playwright Chromium with the Desktop Chrome profile plus a 390 x 844 navigation regression; MVP manual demo browser is Chrome.
- Pass/fail result.
- Screenshot or trace path when UI changed or a failure is found.
- Follow-up task IDs for failures.

## Manual demo handoff

Use `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` when verifying the real Chrome/authenticated Google Photos MVP path. That checklist owns human evidence for real login, read-only scope, source selection from real Google Photos content, grouped review output, exact-photo manual cleanup link-out/reference behavior, Settings/Profile scope, and known limitation handling.

CI installs Playwright Chromium, runs `pnpm smoke:mvp`, and uploads the ignored `playwright-report/` and `test-results/` directories for seven days when a failure occurs.
