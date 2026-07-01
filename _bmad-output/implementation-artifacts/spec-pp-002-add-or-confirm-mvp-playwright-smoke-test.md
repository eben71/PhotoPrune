---
title: 'PP-002 Add or confirm MVP Playwright smoke test for the golden path'
type: 'test'
created: '2026-06-30'
status: 'review'
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
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** PP-002 is the first ready P0 task after the merged navigation work. The repo has a root `playwright` dependency but no discovered Playwright config, E2E spec, or documented MVP smoke command. MVP readiness still requires a repeatable smoke gate that exercises the primary scan/review path and records evidence.

**Approach:** Confirm whether an existing command already covers the MVP smoke path. If not, add the smallest repo-aligned Playwright smoke setup and command that can run a deterministic golden-path smoke without real Google credentials. Document the command and record backlog/log evidence. Keep real authenticated Google Photos verification scoped to manual demo / PP-014 unless a safe existing test hook already supports it.

## Boundaries & Constraints

**Always:** Keep scope limited to PP-002 acceptance criteria. Prefer existing dependencies and scripts. Use Playwright because PP-002 explicitly asks for an MVP Playwright smoke gate. Preserve the trust rules: no similarity percentages, no auto-delete, no in-app delete, no write-scope implication, no recovery/trash claims, and no unsupported privacy/storage/local-only claims. Update `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` with exact evidence.

**Ask First:** Adding new dependencies, changing Google Photos auth scope, adding backend persistence, changing API contracts, adding scan history, creating real Google credential requirements in CI, or broadening PP-002 into PP-014/PP-015/PP-016 requires human approval.

**Never:** Do not implement real authenticated Google integration in this story. Do not fake MVP readiness for real Google Photos. Do not mark PP-002 Done unless the smoke command exists or is confirmed, docs identify it, and evidence is recorded. Do not claim the smoke replaces manual Chrome/authenticated demo verification.

## I/O & Edge-Case Matrix

| Scenario                      | Input / State                                                            | Expected Output / Behavior                                                                                                                               | Error Handling                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Existing smoke command exists | Developer finds a committed command that already runs the MVP smoke path | Confirm it, document it in `docs/testing/MVP_SMOKE_TEST_PLAN.md`, and record evidence                                                                    | If coverage is partial, document the gap and extend only what PP-002 requires                                  |
| No Playwright setup exists    | Root has `playwright` dependency but no config/spec                      | Add minimal Playwright config/spec/script using existing package manager and app routes                                                                  | Avoid new dependencies unless impossible; explain any skipped browser install issue                            |
| Home path                     | Smoke opens `/`                                                          | Home loads, primary CTA is visible, visible nav/actions are not broken, Settings/Profile behavior is present                                             | Fail with clear assertion names if key affordances are missing                                                 |
| Primary CTA and run path      | Smoke simulates a safe selected-photo path or supported test route state | Primary CTA leads into scan/progress flow and `/run` renders start/progress states                                                                       | Do not require live Google login in automated smoke unless already supported safely                            |
| Results/review path           | Smoke reaches or seeds results state                                     | Grouped review UI renders, confidence labels are band-only, manual guidance is visible, Google Photos link/reference behavior is present where available | Fail if results are absent without a documented deterministic setup                                            |
| Trust guardrails              | Smoke scans visible text on smoke pages                                  | No similarity percentages, no auto-delete/destructive claims, no write-scope or recovery/trash promises appear                                           | Use targeted allowlists only for legitimate percent progress UI on `/run`; do not allow similarity percentages |
| Settings/Profile behavior     | Smoke visits or activates `/settings` and `/account`                     | Settings/Profile show required MVP-scoped information or unavailable states only                                                                         | Fail on ambiguous root routing or unsupported account/settings claims                                          |

</frozen-after-approval>

## Code Map

- `package.json` -- Root scripts currently include lint/format/typecheck/test/build/docs guard and root `playwright` devDependency. Add a smoke script here if no existing command satisfies PP-002.
- `apps/web/package.json` -- Web scripts are Vitest/Next focused; use only if the smoke command belongs at the web package level.
- `apps/web/app/page.tsx` -- Home page and primary `Connect Photo Library` CTA. Current CTA calls `useGooglePhotosPicker`, stores normalized selection, then routes to `/run`.
- `apps/web/app/run/page.tsx` -- Scan/progress route. Requires a session selection and can redirect to `/` without one; starting a run posts to `/api/run` and polls `/api/run/:runId`.
- `apps/web/app/results/page.tsx` -- Grouped review route. Requires session results; otherwise renders the session-expired state.
- `apps/web/app/components/GroupCard.tsx` -- Confidence labels, group review UI, manual item review affordances, and expanded Google Photos link access.
- `apps/web/app/components/OpenInGooglePhotosButton.tsx` -- Opens exact/fallback Google Photos references in a new tab and shows fallback copy behavior.
- `apps/web/app/settings/page.tsx` and `apps/web/app/account/page.tsx` -- MVP-scoped Settings/Profile expectations.
- `apps/web/tests/home.test.tsx` and `apps/web/tests/projects-phase3.test.tsx` -- Existing Vitest coverage for navigation, picker routing, project scan/results, confidence labels, and trust behavior; useful reference, but not a Playwright smoke substitute.
- `docs/testing/MVP_SMOKE_TEST_PLAN.md` -- Must document the smoke command, assertions, and evidence expectations.
- `docs/delivery/TASK_BACKLOG.md` -- PP-002 source of truth and status/evidence target.
- `docs/delivery/ITERATION_LOG.md` -- Required delivery evidence log.

## Tasks & Acceptance

**Execution:**

- [x] Inspect existing scripts/config/tests for any committed Playwright or smoke command. If one fully satisfies PP-002, document and verify it instead of adding duplicate setup.
- [x] If missing, add a minimal Playwright smoke setup and command. Prefer root-level files and scripts unless existing repo conventions clearly point elsewhere.
- [x] Implement the smoke path so it covers home, primary CTA, scan/progress, grouped results/review, confidence labels, manual guidance, and Settings/Profile behavior.
- [x] Make the smoke deterministic. Use route interception, browser storage seeding, or existing app test seams as needed; do not require a live Google account for CI/local automated smoke unless already supported.
- [x] Add trust assertions that reject unsupported similarity percentages, auto-delete/delete/write-scope/recovery claims, and unsupported privacy/storage/local-only claims on the smoke pages.
- [x] Update `docs/testing/MVP_SMOKE_TEST_PLAN.md` with the exact command, what it covers, what remains manual, and what evidence to record.
- [x] Update `docs/delivery/TASK_BACKLOG.md` for PP-002 status/evidence according to repo workflow.
- [x] Update `docs/delivery/ITERATION_LOG.md` with commands run, results, skipped checks, artifacts, follow-up tasks, and residual risk.

**Acceptance Criteria:**

- Given a developer checks the repo commands, when PP-002 is complete, then a documented command runs the MVP smoke path or an existing command is explicitly confirmed with evidence.
- Given the MVP smoke command runs, when it exercises the golden path, then it covers home, primary CTA, scan/progress, grouped results/review, confidence labels, manual guidance, and Settings/Profile behavior.
- Given smoke assertions inspect trust-sensitive UI, when unsupported claims appear, then the smoke fails on similarity percentages, automatic deletion, in-app delete/write-scope/recovery promises, or unsupported storage/privacy/local-only claims.
- Given PP-002 is handed off, when docs are reviewed, then the smoke command appears in `docs/testing/MVP_SMOKE_TEST_PLAN.md` and PP-002 evidence appears in backlog/log updates.

## Dev Notes

- Current discovery found no `playwright.config.*`, `*.spec.ts`, `*.e2e.ts`, or `*smoke*` files. Root `package.json` already has `playwright` as a devDependency, so adding Playwright config/specs should not require a new dependency.
- The automated smoke cannot honestly prove real Google login or real Google Photos content without credentials and a manual browser path. Keep that limitation explicit; PP-014 owns real authenticated Google Photos verification.
- `/run` and `/results` depend on `RunSessionProvider` state. A Playwright smoke may need a deterministic test seam such as storage/session seeding, route interception, or a test-only path through the existing UI. Keep any seam narrow, documented, and production-safe.
- Avoid testing only happy text presence. The smoke should prove navigation/action continuity: home loads, CTA path proceeds to run/progress, results/review renders grouped output, and Settings/Profile routes are reachable and scoped.
- Treat run progress percentages as distinct from forbidden similarity percentages. Do not write a broad assertion that fails on legitimate progress UI such as `0%` or `100%`; target forbidden similarity/match copy patterns and confidence-display areas.
- Use existing confidence vocabulary. UI may expose `High Confidence`, `Medium Confidence`, or `Low Confidence`, but not numeric confidence or match scores.
- If browser binaries are missing locally, follow the sandbox escalation rules for any install/download attempt and record the exact blocker if installation cannot run.

### Project Structure Notes

- Put smoke specs where a future maintainer will expect them. Reasonable options are `tests/e2e`, `apps/web/e2e`, or `apps/web/tests/e2e`; choose the smallest convention and document it in the config/script.
- Keep generated artifacts out of source. Traces, screenshots, and reports should land in ignored output folders or documented delivery artifact paths only when evidence is needed.
- Do not edit `.next`, `coverage`, `node_modules`, `.turbo`, or other generated/cache output.

### References

- PP-002 acceptance criteria: `docs/delivery/TASK_BACKLOG.md`
- Repo workflow and evidence rules: `docs/delivery/WORKFLOW.md`
- MVP smoke golden path and required assertions: `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Full verification command policy: `docs/ai/testing.md`
- MVP exit gates and manual demo distinction: `docs/product/MVP_EXIT_CRITERIA.md`
- Product trust guardrails: `AGENT_RULES.md`
- Web-specific rules: `apps/web/AGENTS.md`
- Agent implementation constraints: `_bmad-output/project-context.md`

## Spec Change Log

- 2026-06-30: Implemented PP-002 MVP Playwright smoke command, config, spec, docs, and delivery evidence.

## Verification

**Minimum focused commands for the PP-002 implementation session:**

- `pnpm --filter web lint` -- expected: frontend lint passes if web files changed.
- `pnpm --filter web typecheck` -- expected: frontend typecheck passes if web TypeScript changed.
- `pnpm --filter web test` -- expected: existing web tests remain green if app/test helpers changed.
- `<new-or-confirmed smoke command>` -- expected: MVP smoke passes and evidence is recorded.
- `pnpm check:docs` -- expected: docs guard passes after smoke-plan/backlog/log updates.

**Broader handoff commands to consider because PP-002 affects the main MVP verification path:**

- `make lint`
- `make format-check`
- `make typecheck`
- `make test`
- `node scripts/check-coverage.mjs`
- `make build`

**Manual checks:**

- Confirm the smoke output names the browser/device/viewport or config used.
- Confirm docs clearly separate automated smoke from the later manual Chrome + real Google Photos demo.
- Confirm no implementation claim says MVP is ready solely because PP-002 passes.

## Suggested Review Order

**Smoke Command And Config**

- Start with root/web package scripts and Playwright config to confirm the documented command is discoverable and deterministic.

**Golden Path Coverage**

- Review the smoke spec for actual action continuity across home, run/progress, results/review, Settings, and Account/Profile. Avoid accepting isolated text snapshots as full smoke coverage.

**Trust Assertions**

- Check that forbidden claim assertions are specific enough to catch unsupported similarity/delete/write/recovery/privacy claims without failing on legitimate run-progress percentages.

**Delivery Evidence**

- Verify `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `docs/delivery/TASK_BACKLOG.md`, and `docs/delivery/ITERATION_LOG.md` all name the same command and describe any residual manual/PP-014 gaps.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Create-story discovery: no existing Playwright config/spec/smoke files found by `rg --files -g '*playwright*' -g '*.spec.ts' -g '*.e2e.ts' -g '*smoke*'`.
- Root `package.json` includes `playwright` devDependency and no smoke script.
- Implementation discovery confirmed `playwright/test` is available from the existing `playwright` package; separate `@playwright/test` is not installed.
- First `pnpm smoke:mvp` run inside the sandbox failed with `EPERM` opening Playwright's installed CLI.
- Escalated `pnpm smoke:mvp` exposed a Playwright webServer argument issue, then missing local Chromium browser binaries.
- `pnpm exec playwright install chromium` installed Playwright Chromium successfully.
- Final `pnpm smoke:mvp` passed: 1 Playwright Chromium test passed.
- `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter web test`, `pnpm check:docs`, and touched-file Prettier check passed.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `node scripts/check-coverage.mjs`, and `pnpm build` passed.
- `pnpm format:check` failed on generated shared package `dist` files outside PP-002 scope; touched parseable files passed targeted Prettier check.

### Completion Notes List

- Story implemented and ready for review.
- BMad sprint status was not updated because this repo currently has no `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- The BMad customization resolver could not run via `python` because `python` is not on PATH; fallback merge found no repo/user overrides for `bmad-create-story`, so base customization applies.
- Added root `pnpm smoke:mvp` command and Playwright config.
- Added deterministic MVP smoke spec that stubs Google Picker scripts in-browser and uses fixture run mode for the app scan path.
- Updated smoke-plan docs, backlog evidence, iteration log, and ignored Playwright report output.
- Real Google Photos account verification remains out of scope for this automated smoke and belongs to PP-014/manual demo.
- Story status set to `review`.
- Full root format check remains red on generated `packages/shared/dist` files outside this story's scope.

### File List

- `_bmad-output/implementation-artifacts/spec-pp-002-add-or-confirm-mvp-playwright-smoke-test.md`
- `.gitignore`
- `package.json`
- `playwright.config.ts`
- `tests/e2e/mvp-smoke.spec.ts`
- `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- `docs/delivery/TASK_BACKLOG.md`
- `docs/delivery/ITERATION_LOG.md`
