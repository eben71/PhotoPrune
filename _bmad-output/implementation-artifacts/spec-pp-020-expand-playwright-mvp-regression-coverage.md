---
title: 'PP-020 Expand Playwright MVP regression coverage'
type: 'test'
created: '2026-07-01'
status: 'ready-for-dev'
baseline_commit: 'c4f7ecee792308278adf49a27ab6ce3028848dff'
context:
  - `AGENT_RULES.md`
  - `apps/web/AGENTS.md`
  - `docs/delivery/TASK_BACKLOG.md`
  - `docs/delivery/WORKFLOW.md`
  - `docs/testing/MVP_SMOKE_TEST_PLAN.md`
  - `docs/ai/testing.md`
  - `docs/product/MVP_EXIT_CRITERIA.md`
  - `_bmad-output/project-context.md`
  - `_bmad-output/implementation-artifacts/spec-pp-002-add-or-confirm-mvp-playwright-smoke-test.md`
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** PP-002 established a working MVP Playwright smoke gate, but it is intentionally one broad golden-path test. Future regression coverage needs to grow without turning that smoke test into a brittle catch-all, and without confusing deterministic fixture coverage with the real-Google MVP demo path.

**Approach:** Build on the PP-002 Playwright foundation by extracting reusable helpers and adding focused MVP browser regression specs for trust-critical behavior. Keep `pnpm smoke:mvp` fast and deterministic. If a broader Playwright command is needed, add and document it separately from the smoke gate.

## Boundaries & Constraints

**Always:** Preserve PP-002 behavior and keep the smoke command deterministic. Reuse the existing `playwright/test` package, `playwright.config.ts`, fixture run mode, and Google Picker stub pattern. Keep confidence display band-only: `High`, `Medium`, `Low`. Maintain the group as the UX unit. Update backlog/log/docs with evidence.

**Ask First:** Adding dependencies, requiring real Google credentials in automated tests, changing Google Photos scopes, changing app behavior just to satisfy tests, introducing scan history/persistence, or broadening this story into PP-014/PP-015/PP-016 product implementation requires human approval.

**Never:** Do not use Playwright fixtures as proof of real Google Photos MVP readiness. Do not add similarity percentages, automatic deletion, in-app delete, write-scope behavior, recovery/trash claims, storage-reclaimed claims, or unsupported local-only/privacy claims. Do not commit Playwright traces, reports, videos, screenshots, or generated browser artifacts unless deliberately added as delivery evidence.

## I/O & Edge-Case Matrix

| Scenario                       | Input / State                                                                   | Expected Output / Behavior                                                                        | Error Handling                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Smoke command preservation     | Developer runs `pnpm smoke:mvp`                                                 | Existing MVP golden path remains fast, deterministic, and passing                                 | Failures should point to the broken page/step, not generic timeout noise       |
| Helper extraction              | Multiple Playwright specs need Google Picker, fixture mode, or trust assertions | Shared helpers remove duplication while staying explicit and readable                             | Avoid hiding product assertions in opaque helpers                              |
| Route/session guards           | User opens `/run` or `/results` without required session state                  | App redirects or shows the existing single-session/expired state without destructive implications | Assert no unsupported recovery/delete/storage claims                           |
| Trust regression scan          | Key pages render visible copy                                                   | Forbidden similarity percentages and destructive/write-scope/recovery claims are absent           | Keep run-progress percentages allowed; do not overmatch legitimate progress UI |
| Google Photos link-out         | Fixture-backed group details expose Google Photos action                        | Link-out opens/falls back as currently implemented and remains manual/non-destructive             | Do not require real Google item URLs unless PP-016 implements them             |
| Settings/Account regression    | User visits `/settings` and `/account` directly and through navigation          | Pages remain MVP-scoped and do not expose unsupported account/settings categories                 | Fail on ambiguous routes or unsupported claims                                 |
| Viewport/navigation regression | Desktop and at least one narrow viewport render core navigation                 | Primary actions, Settings, Account, and review navigation remain reachable and non-overlapping    | Capture failure traces/screenshots only through ignored Playwright output      |

</frozen-after-approval>

## Code Map

- `playwright.config.ts` -- Existing PP-002 Playwright config. Preserve fixture-mode web server settings and reporter/output behavior unless the story requires a documented extension.
- `tests/e2e/mvp-smoke.spec.ts` -- Current broad MVP smoke. Candidate for helper extraction, but keep the golden-path assertions readable.
- `tests/e2e/` -- Expected home for additional focused browser regression specs and helper files.
- `package.json` -- Contains `pnpm smoke:mvp`. Add a second command only if focused regression tests should be separately runnable from the smoke gate.
- `docs/testing/MVP_SMOKE_TEST_PLAN.md` -- Must stay accurate about what smoke covers and what broader Playwright tests cover.
- `docs/delivery/TASK_BACKLOG.md` -- PP-020 task source of truth and status/evidence target.
- `docs/delivery/ITERATION_LOG.md` -- Required delivery evidence log.
- `apps/web/app/page.tsx` -- Home and primary picker CTA behavior.
- `apps/web/app/run/page.tsx` -- Run/progress route and session guard behavior.
- `apps/web/app/results/page.tsx` -- Grouped results route and session-expired state.
- `apps/web/app/components/GroupCard.tsx` -- Group display, confidence labels, manual review affordances, and expanded item actions.
- `apps/web/app/components/OpenInGooglePhotosButton.tsx` -- Google Photos link-out/fallback behavior.
- `apps/web/app/settings/page.tsx` and `apps/web/app/account/page.tsx` -- MVP-scoped settings/account surfaces.
- `apps/web/app/copy/trustCopy.ts` -- Central trust copy; tests should assert rendered behavior, not encourage copy churn.

## Tasks & Acceptance

**Execution:**

- [ ] Inspect PP-002 Playwright files and identify duplication or brittle assertions that should be helperized before adding more specs.
- [ ] Extract reusable helpers for Google Picker stubbing, forbidden-claim assertions, common fixture-mode navigation, and any session seeding or result navigation needed by multiple specs.
- [ ] Add focused Playwright regression specs for at least three MVP risk areas beyond the basic golden path. Prioritize route/session guard behavior, trust forbidden-claim coverage across key pages, Google Photos link-out/manual cleanup behavior, Settings/Account scope, and one desktop/narrow viewport navigation check.
- [ ] Keep `pnpm smoke:mvp` passing. If additional focused specs would make smoke too slow or conceptually broad, add a separate documented command such as `pnpm test:e2e` or `pnpm test:e2e:mvp`.
- [ ] Update docs to distinguish smoke, broader deterministic Playwright regression tests, and manual/PP-014 real Google verification.
- [ ] Update `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` with exact evidence, skipped checks, follow-ups, and residual risk.

**Acceptance Criteria:**

- Given the Playwright test suite is reviewed, when PP-020 is complete, then helper code removes duplicated Google Picker stubbing, fixture-mode flow setup, and forbidden-claim assertion logic without obscuring the test intent.
- Given Playwright tests run, when focused regression specs execute, then at least three MVP regression areas beyond the PP-002 golden path are covered.
- Given the smoke gate runs, when `pnpm smoke:mvp` executes, then it remains deterministic and passes without requiring real Google credentials.
- Given docs are reviewed, when PP-020 is handed off, then the repo explains which command runs smoke, which command runs broader Playwright regression coverage if separate, and what remains manual/PP-014 verification.
- Given delivery evidence is reviewed, when backlog/log are checked, then PP-020 status, commands, results, residual risk, and any follow-up task IDs are recorded.

## Dev Notes

- PP-002 currently uses a single `tests/e2e/mvp-smoke.spec.ts` with an inline Google Picker/browser script stub and inline forbidden-copy patterns. PP-020 should avoid duplicating those blocks across new specs.
- Prefer small helper modules under `tests/e2e/` such as `helpers/googlePicker.ts`, `helpers/trustAssertions.ts`, or `helpers/session.ts` if that keeps tests readable. Do not build an elaborate custom framework.
- The current Playwright config starts Next.js on `127.0.0.1:3022` with `NEXT_PUBLIC_PHASE2_RUN_MODE=fixture`. Preserve that deterministic setup unless a clear reason emerges.
- Automated Playwright coverage may use fixture content and browser stubs. It must not claim real Google account coverage; PP-014/manual demo owns that.
- If checking `window.open` behavior for `OpenInGooglePhotosButton`, prefer Playwright page/context event assertions or a controlled browser stub. Keep the test focused on visible manual link-out behavior and non-destructive copy.
- Route/session guard tests should verify the current product truth: session-only behavior is acceptable for MVP, and browser close/restart may require starting again. Do not introduce previous scan history.
- For forbidden percentage assertions, allow legitimate progress UI on `/run`; specifically target match/similarity/confidence percentage wording.
- Keep failure artifacts ignored. `.gitignore` already ignores `playwright-report` and `test-results` from PP-002.

### Project Structure Notes

- Additional E2E files should stay under `tests/e2e/` unless the repo establishes a different convention before implementation.
- Do not edit `.next`, `coverage`, `node_modules`, `.turbo`, Playwright reports, traces, screenshots, or videos as source files.
- Do not change app copy solely to make a test convenient. If a test exposes a real copy/product issue, create a follow-up task or fix only if it is within PP-020 acceptance criteria.

### References

- PP-020 backlog task: `docs/delivery/TASK_BACKLOG.md`
- Existing Playwright smoke: `tests/e2e/mvp-smoke.spec.ts`
- Playwright config and fixture-mode command: `playwright.config.ts`, `package.json`
- Smoke plan and manual boundary: `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- MVP exit gates: `docs/product/MVP_EXIT_CRITERIA.md`
- Product trust guardrails: `AGENT_RULES.md`
- Web-local rules: `apps/web/AGENTS.md`
- Implementation standards: `_bmad-output/project-context.md`
- Prior implementation story: `_bmad-output/implementation-artifacts/spec-pp-002-add-or-confirm-mvp-playwright-smoke-test.md`

## Spec Change Log

## Verification

**Focused commands for the PP-020 implementation session:**

- `pnpm smoke:mvp` -- expected: existing MVP smoke remains green.
- Any new Playwright command added by PP-020 -- expected: focused regression tests pass.
- `pnpm --filter web lint` -- expected: web lint passes if test/helper TypeScript is linted through web or root config.
- `pnpm --filter web typecheck` -- expected: web typecheck passes if helper types touch app imports.
- `pnpm --filter web test` -- expected: existing Vitest coverage remains green if app/test helpers change.
- `pnpm check:docs` -- expected: docs guard passes after backlog/log/test-plan updates.

**Broader handoff commands to consider because PP-020 affects MVP verification:**

- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `node scripts/check-coverage.mjs`
- `pnpm build`

**Known verification caveat:**

- PP-002 recorded that root `pnpm format:check` was red on generated `packages/shared/dist` files outside the Playwright source changes. Recheck current state during PP-020 and record exact evidence rather than assuming it remains the same.

## Suggested Review Order

**Test Architecture**

- Confirm helpers reduce duplication without making test intent hard to read.

**Regression Coverage**

- Verify each new Playwright spec maps to a distinct MVP risk and does not duplicate PP-002 smoke assertions without added value.

**Trust Guardrails**

- Confirm forbidden-claim checks remain precise, band-only confidence is preserved, and run-progress percentages are not incorrectly treated as similarity scores.

**Command And Docs**

- Confirm `pnpm smoke:mvp` still means smoke. If a broader command is added, docs must say when to run it and how it differs from smoke/manual demo.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Created from user request: `bmad-create-story PP-020 Expand Playwright MVP regression coverage`.
- Current branch had uncommitted PP-002 implementation changes at story creation time; PP-020 was created as planning/backlog/story work only.
- BMad sprint status was not updated because this repo currently has no `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- BMad create-story customization fallback found no repo/user overrides; base customization applies.

### Completion Notes List

- Added PP-020 backlog task with acceptance criteria.
- Created ready-for-dev PP-020 story artifact.
- No implementation of PP-020 Playwright expansion was started.

### File List

- `docs/delivery/TASK_BACKLOG.md`
- `_bmad-output/implementation-artifacts/spec-pp-020-expand-playwright-mvp-regression-coverage.md`
