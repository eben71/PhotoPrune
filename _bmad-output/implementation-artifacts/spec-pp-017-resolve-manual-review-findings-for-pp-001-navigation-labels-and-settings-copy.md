---
title: 'PP-017 Resolve manual review findings for PP-001 navigation labels and settings copy'
type: 'bugfix'
created: '2026-06-30'
status: 'done'
baseline_commit: '2accc88df398f4d3952a09977c7cff3c966a546d'
context:
  - `AGENT_RULES.md`
  - `apps/web/AGENTS.md`
  - `docs/delivery/TASK_BACKLOG.md`
  - `docs/product/MVP_EXIT_CRITERIA.md`
  - `docs/testing/MVP_SMOKE_TEST_PLAN.md`
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Product-owner manual review found that the top navigation still uses confusing route labels: `History` points to `/results`, the review shell can show both `History` and `Review` for the same destination, and the Settings page heading exposes implementation-phase language by saying `MVP settings`.

**Approach:** Keep the current MVP route surface small and honest: do not add scan history or a `/history` route in this story. Rename/rework the visible navigation so labels match the existing `/results` destination, remove duplicate `History`/`Review` ambiguity in the review shell, and change the Settings heading to user-facing copy.

## Boundaries & Constraints

**Always:** Keep Settings routed to `/settings` and Account/Profile routed to `/account`. Keep the current MVP scope: no previous scan history, no new persistence, no backend changes, no broader account/settings system. Use plain user-facing copy and preserve responsive keyboard-accessible navigation.

**Ask First:** Creating a real `/history` route, adding scan history, changing persistence/session architecture, changing Google Photos auth scope, or redesigning the review shell navigation model beyond label/destination clarity requires human approval.

**Never:** Do not imply historical scan persistence exists. Do not add a `/review` route unless explicitly approved. Do not use `MVP` in visible end-user headings. Do not add auto-delete, recovery/trash claims, similarity percentages, or hidden destructive actions.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Home navigation | User sees the home header | The `/results` destination has a label that matches what the user will see there, not `History` | Avoid dead or misleading links |
| Review shell on results | User lands on `/results` | Top nav does not show both `History` and `Review` as competing links to the same destination | Active state remains understandable |
| Settings page | User opens `/settings` | Page heading reads `Settings` and keeps MVP-scoped details in body copy only | Avoid implementation-phase wording |
| Unsupported history route | User expects prior scan history | UI does not imply previous scan history exists in MVP | Defer real history to a separate product decision |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/Header.tsx` -- Home/shared header nav currently labels `/results` as `History`.
- `apps/web/app/components/ReviewShell.tsx` -- Review flow shell currently shows `History` and conditionally `Review` for `/results`.
- `apps/web/app/settings/page.tsx` -- Settings page currently renders `MVP settings` as the main heading.
- `apps/web/tests/home.test.tsx` -- Existing tests for header, review shell, settings, and account behavior.
- `docs/delivery/TASK_BACKLOG.md` -- PP-017 task status and acceptance criteria.
- `docs/delivery/ITERATION_LOG.md` -- Delivery evidence and residual risk log.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/components/Header.tsx` -- Rename the `/results` top-nav item from `History` to route-accurate user-facing copy -- avoid implying unsupported scan history.
- [x] `apps/web/app/components/ReviewShell.tsx` -- Remove or rework duplicate `History`/`Review` top-nav links that point to `/results` -- make review-shell navigation unambiguous.
- [x] `apps/web/app/settings/page.tsx` -- Change the main heading from `MVP settings` to `Settings` -- remove implementation-phase copy from the user-facing page title.
- [x] `apps/web/tests/home.test.tsx` -- Update/add assertions for home header, review shell, and settings heading -- prevent regression of the manual review findings.
- [x] `docs/delivery/TASK_BACKLOG.md` -- Move PP-017 into the appropriate delivery status -- keep backlog source of truth current.
- [x] `docs/delivery/ITERATION_LOG.md` -- Record commands, screenshot/manual evidence, and residual risk -- satisfy delivery evidence requirements.

**Acceptance Criteria:**
- Given the home page renders, when the user reads the top navigation, then the `/results` link is not labelled `History`.
- Given the review shell renders on the results/review screen, when the user reads the top navigation, then it does not show competing `History` and `Review` links to the same destination.
- Given the Settings page renders, when the user reads the page heading, then it says `Settings`, not `MVP settings`.
- Given tests run, when the navigation and settings assertions execute, then they cover home header, review shell, Settings route, and Account/Profile route stability.
- Given implementation is ready for handoff, when evidence is recorded, then PP-017 backlog status and iteration log reflect the completed checks and any screenshots.

## Spec Change Log

## Verification

**Commands:**
- `apps/web/node_modules/.bin/vitest.cmd run --coverage -- home.test.tsx` -- passed after BMAD review fixes: 13 test files, 62 tests, coverage lines 81.26%.
- `apps/web/node_modules/.bin/tsc.cmd --noEmit` -- passed.
- `apps/web/node_modules/.bin/eslint.cmd .` -- passed.
- `apps/web/node_modules/.bin/prettier.cmd --check .` -- passed after formatting `apps/web/tests/home.test.tsx`.
- `apps/web/node_modules/.bin/next.cmd build` -- passed and listed `/results`, `/settings`, and `/account`.
- `node scripts/check-docs.js` -- passed after PP-017 evidence updates.

**Manual checks:**
- Captured desktop screenshots from a fresh Next dev server on port `3017` with system Chrome.
- Browser-observed top navigation labels on home, review shell, and settings are `Results` and `Settings`; the Settings page heading is `Settings`.

**BMAD review:**
- Blind Hunter found patch-level risks around route-active state, accessible current state, test scoping, and stale docs-guard wording.
- Edge Case Hunter found one patch-level issue where `Results` could appear inactive on results routes outside the `REVIEW` stage.
- Acceptance Auditor found no acceptance failures or material risks.
- Applied patch fixes: `ReviewShell` now uses the current pathname for the `Results` active state, exposes `aria-current="page"` on results routes, and tests scope the desktop top-nav assertions directly.

## Suggested Review Order

**Navigation Semantics**

- Review-shell entry point keeps `Results` route-active and accessible.
  [`ReviewShell.tsx:30`](../../apps/web/app/components/ReviewShell.tsx#L30)

- Top-nav link now exposes route-current state without duplicate Review text.
  [`ReviewShell.tsx:48`](../../apps/web/app/components/ReviewShell.tsx#L48)

- Home header now labels the existing destination honestly.
  [`Header.tsx:8`](../../apps/web/src/components/Header.tsx#L8)

**Settings Copy**

- Settings page removes implementation-phase heading copy.
  [`page.tsx:34`](../../apps/web/app/settings/page.tsx#L34)

**Verification**

- Home header test prevents the misleading History label from returning.
  [`home.test.tsx:100`](../../apps/web/tests/home.test.tsx#L100)

- Review-shell test scopes results assertions to the desktop top nav.
  [`home.test.tsx:117`](../../apps/web/tests/home.test.tsx#L117)

- Route-active regression test covers non-results shell routes.
  [`home.test.tsx:148`](../../apps/web/tests/home.test.tsx#L148)
