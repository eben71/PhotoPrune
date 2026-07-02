# MVP Smoke Test Plan

The MVP smoke test proves the golden path is usable enough for review. It is not a substitute for full CI or manual demo verification.

## Automated command

Run from the repo root:

```bash
pnpm smoke:mvp
```

This starts the Next.js web app on `127.0.0.1:3022` with `NEXT_PUBLIC_PHASE2_RUN_MODE=fixture`, stubs the Google Picker browser scripts, and runs the Playwright Chromium smoke spec in `tests/e2e/mvp-smoke.spec.ts`.

The automated smoke is deterministic and does not use real Google credentials or real Google Photos content. The Chrome manual demo with a real Google account remains a separate MVP exit gate and must be run with `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`.

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

Real Google login, Picker-selected photos, timeout behavior, and exact-photo Google Photos link-out/reference checks belong to `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`.

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

## Manual demo handoff

Use `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` when verifying the real Chrome/authenticated Google Photos MVP path. That checklist owns human evidence for real login, read-only scope, source selection from real Google Photos content, grouped review output, exact-photo manual cleanup link-out/reference behavior, Settings/Profile scope, and known limitation handling.
