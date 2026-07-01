# MVP Smoke Test Plan

The MVP smoke test proves the golden path is usable enough for review. It is not a substitute for full CI or manual demo verification.

## Automated command

Run from the repo root:

```bash
pnpm smoke:mvp
```

This starts the Next.js web app on `127.0.0.1:3022` with `NEXT_PUBLIC_PHASE2_RUN_MODE=fixture`, stubs the Google Picker browser scripts, and runs the Playwright Chromium smoke spec in `tests/e2e/mvp-smoke.spec.ts`.

The automated smoke is deterministic and does not use real Google credentials or real Google Photos content. The Chrome manual demo with a real Google account remains a separate MVP exit gate.

## Golden path

- Home page loads.
- No broken visible nav/actions appear.
- Primary CTA works.
- Authenticated Google login flow works without requesting write scope.
- User can choose real read-only Google Photos content from a single album, multiple albums, or picker-selected photos.
- No fake dataset is used for MVP readiness.
- Full-library scanning is not offered or implied.
- Scan can start from the selected real Google Photos content.
- Run/progress screen renders.
- Results/review screen renders grouped output.
- Confidence labels are `High`, `Medium`, or `Low` only.
- Review gives understandable reasons for identical/similar grouping, such as shared people or backgrounds.
- Current-session selections survive an in-session timeout where technically possible.
- Manual guidance is visible.
- Selected photos expose links or references that open the exact photo in Google Photos in a new tab.
- No automatic deletion or destructive copy appears.
- Settings/Profile show only required MVP account details and settings, or hide non-required items.

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
- Browser/device viewport used. The automated smoke currently uses Playwright Chromium with the Desktop Chrome profile; MVP manual demo browser is Chrome.
- Pass/fail result.
- Screenshot or trace path when UI changed or a failure is found.
- Follow-up task IDs for failures.
