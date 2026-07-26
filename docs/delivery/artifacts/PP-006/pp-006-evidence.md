# PP-006 Delivery Evidence

Date: 2026-07-26  
Branch: `codex/pp-006-trust-review-actions`  
Baseline: `ff21193dcf57b3c66287d75ccd5f52ba1b17b28f`

## Acceptance evidence

- Ephemeral result cards no longer show the inert `Keep Recommended`, `Mark Externally`, or `Skip For Now` controls. They show explicit temporary-session guidance instead.
- Saved projects persist representative selection, `SNOOZED` (`Skip for now`), and `DONE` decisions through the existing review PATCH route. A failed request restores the prior state and displays the existing save error.
- User-facing algorithm selections are labelled `Representative`; keeper/recommended wording was removed from affected UI and documentation.
- Home/session copy refers to Picker-selected photos and temporary results; saved-project copy says review decisions are saved to that project.
- Non-functional Privacy, Terms, Security, and Support labels were removed. Settings and Account remain working destinations.
- Targeted forbidden-claim scans found no affected similarity percentages, automatic-delete/recovery/write-scope claims, unsupported security/storage claims, or whole-library language.

## Automated verification

- Focused Vitest: 34 tests passed across `group-card`, `projects-phase3`, `home`, and `trust-layer`.
- Web trust review: `pnpm --filter web lint`, `pnpm --filter web typecheck`, and `pnpm --filter web test` passed; 91 tests passed and web line coverage was 85.17%.
- Full repository: `make lint`, `make format-check`, `make typecheck`, and `make test` passed. The test gate included 90 web tests, 156 API tests, 2 worker tests, 19 deployment-boundary tests, and 6 dependency-policy tests.
- `node scripts/check-coverage.mjs` passed: web 85.17%, API 92.36%, worker 100%.
- `make build` passed after the final UI corrections.
- `node scripts/check-deployment-boundary.mjs`, `pnpm check:docs`, and `git diff --check` passed.

## MVP smoke result

`pnpm smoke:mvp` was run in Playwright Chromium with the Desktop Chrome profile. Both the initial attempt and CI retry failed before the PP-006 review surface: after `Start review session`, the run remained at 0% with `Something interrupted this session`, so `Review current results` never appeared.

Retained diagnostics:

- `test-results/mvp-smoke-MVP-golden-path--2bfeb--trust-settings-and-account-chromium/error-context.md`
- `test-results/mvp-smoke-MVP-golden-path--2bfeb--trust-settings-and-account-chromium/trace.zip`
- Retry evidence under the sibling `-retry1` folder.

This is the existing deterministic smoke-path gap owned by PP-020; PP-006 did not change run execution or fixture orchestration. The failure prevents PP-006 from being marked Done even though its acceptance behavior and focused browser review pass.

## Visual and functional review

Playwright reviewed the home and seeded session-results routes at 1440×900 and 390×844. Normal click/touch interaction expanded a group; Representative labels and temporary-session guidance were visible; inert session-decision buttons were absent. Desktop and mobile both reported no horizontal overflow.

Visual review caught and corrected three issues before final capture:

- remaining whole-library/theatrical wording;
- a Representative badge escaping its media container because a generated utility was missing;
- the mobile navigation inheriting the top-header inset and covering the viewport.

Independent adversarial and edge-case review then corrected implicit algorithmic choices in saved projects, removed remaining accessible/checklist keeper wording, prevented same-group overlapping saves, kept per-group save errors independent, consumed valid server review responses, and represented `IN_PROGRESS` truthfully.

Final screenshots:

- `home-desktop-1440x900.png`
- `home-mobile-390x844.png`
- `review-desktop-1440x900.png`
- `review-mobile-390x844.png`

## Residual risk and follow-up

- PP-020 remains the owner of the deterministic MVP smoke repair; no new follow-up task was created.
- The real-account Chrome demonstration remains PP-023 and is not replaced by fixture or seeded-session evidence.
