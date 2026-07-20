# Iteration Log

Record every implementation or verification iteration here. The log is repo truth, not a chat transcript.

## Template

### YYYY-MM-DD — PP-XXX Title

- Role: Builder | Verifier | Reviewer | Planner
- Status: Started | Verifying | Done | Blocked | Discarded
- Goal:
- Acceptance criteria checked:
- Commands run:
- Manual verification:
- Artifacts/screenshots:
- Backlog updates:
- Follow-up tasks created:
- Residual risk:

## Entries

### 2026-07-20 - PP-027 Repair the real-photo scan input and Picker lifecycle

- Role: Builder
- Status: Done
- Goal: Carry Picker-selected image URLs and real metadata through hashing while making popup, authorization, pagination, and per-item failure behavior bounded and explicit.
- Acceptance criteria checked:
  - Picker selection now preserves media ID, creation time, filename, MIME type, real dimensions, download-ready URL, and optional product URL through both saved-project and direct scan boundaries.
  - A named placeholder opens synchronously; blocked, early-closed, cancelled, selected, and failed paths are distinct, with a single refresh/replay after a Picker API 401.
  - Pagination detects repeated tokens, retains all pages up to 2,000 items, and rejects any response above the shared limit without truncation.
  - Picker requests require download URLs; unreadable items are reported in `failedItems`, viable items continue, and an all-unreadable selection fails.
  - Picker download URLs, OAuth tokens, and product links are not written into saved project scope or scan-history records.
  - Review repairs keep the matching immediate project envelope available for current-session exact links and failed-item guidance while deferring persisted reload truth to PP-015.
  - Raw Picker payloads are capped and URL-validated before normalization; repeated or incomplete selections are rejected without silent item loss.
  - OAuth callbacks, Picker fetches, cleanup, and polling terminal paths are bounded, and user-facing errors do not expose raw API details.
  - Metadata-only album/fixture scans remain compatible while Picker and other real-byte scans fail defensively when nothing is hashable.
- Commands run:
  - `pnpm --filter web test -- use-google-photos-picker-hook.test.tsx projects-phase3.test.tsx engine-adapter.test.ts` passed after review repairs: 13 files, 78 tests.
  - `pnpm --filter web lint` passed.
  - `pnpm --filter web typecheck` passed.
  - `uv run pytest tests/test_projects.py tests/test_routes_scan.py tests/test_scan.py tests/test_downloads.py tests/test_schemas.py tests/test_normalizer.py tests/test_pp027_fixture_contract.py` passed after review repairs: 72 tests.
  - Focused Ruff and Prettier checks passed for all changed Python, TypeScript, Markdown, and fixture files.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, and `make build` passed.
  - The full suite passed with 78 web tests, 94 API tests, 2 worker tests, and 6 dependency-preflight tests.
  - Coverage passed at web 83.59%, API 93.01%, and worker 100%.
  - `pnpm check:docs` and `git diff --check` passed.
  - `pnpm smoke:mvp` initially failed because its fixture still used the retired legacy Google Picker stub; replacing it with deterministic Photos Picker REST `v1.sessions`/`v1.mediaItems` responses restored the gate, which then passed with 1 Chromium test.
- Manual verification: Inspected request mappings, API normalization, scan failure envelopes, SQLite writes, and the current-session results path to confirm URLs reach hashing and ephemeral links remain available without durable Picker URL persistence. Separate blind and edge-case review agents examined the complete baseline diff; their actionable findings were repaired and covered by tests.
- Artifacts/screenshots: `tests/fixtures/picker/pp027_scan_contract.json`, `scripts/fixture_media_server.py`, and `_bmad-output/implementation-artifacts/deferred-work.md`; screenshots are not applicable to deterministic contract verification.
- Backlog updates: Moved PP-027 from Ready through Verifying to Done after focused checks, independent review, the full handoff gate, and deterministic browser smoke passed.
- Follow-up tasks created: None; the existing PP-015 owns persisted failed-item reload truth.
- Residual risk: Persisted reloads do not yet retain failed-item facts; PP-015 owns that lifecycle redesign. PP-023 still requires separate real-account Chrome evidence and cannot be replaced by deterministic fixtures.

### 2026-07-20 - Repository review backlog reconciliation

- Role: Planner
- Status: Done
- Goal: Reconcile `docs/delivery/TASK_BACKLOG.md` against every finding in `docs/delivery/REPOSITORY_REVIEW_2026-07-20.md` without implementing application fixes.
- Acceptance criteria checked:
  - RR-001 through RR-028 are mapped to an existing updated task or one missing task with explicit priority, dependencies, acceptance criteria, and verification requirements.
  - Existing work was reused for MVP truth (PP-005), review/copy truth (PP-006), run lifecycle (PP-015), exact-photo link-out (PP-016), browser coverage (PP-020), and the real Chrome demonstration (PP-023).
  - PP-007, PP-008, PP-009, and PP-026 were corrected to Done based on existing canonical artifacts, merged implementation, or superseding delivery evidence; PP-022 was corrected to Discarded because PP-024 removed arbitrary album support from MVP scope.
  - Review feedback restored PP-013 to Ready because the canonical MVP ledger still identifies numeric similarity as an open product-owner decision.
  - Review feedback removed the PP-016/PP-023 verification cycle: PP-016 can complete from implementation and automated evidence, while PP-023 later validates that result with real Picker output.
  - Only missing scopes became PP-027 through PP-034: real-photo input/Picker lifecycle, deployment security, quality/performance evidence, infrastructure/storage operations, hermetic build/security automation, architecture/legal/risk truth, documentation/delivery consistency, and agent/repository hygiene.
  - No application code or finding fixes were implemented.
- Commands run:
  - `prettier --write docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/product/MVP_PROGRESS_LEDGER.md` passed.
  - `prettier --check docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/product/MVP_PROGRESS_LEDGER.md` passed.
  - `pnpm check:docs` could not start because the installed pnpm 11.9.0 requires Node.js 22.13 or newer while this environment provides Node.js 20.20.2; `node scripts/check-docs.js` passed as the direct docs-guard fallback.
  - Review-to-task coverage script passed, confirming every RR-001 through RR-028 identifier appears in backlog finding coverage.
  - `git diff --check` passed.
- Manual verification:
  - Compared the complete review, recommended delivery order, existing backlog, current iteration evidence, merge history, and MVP ledger references.
  - Reconciled the ledger's stale PP-007, PP-008, PP-009, and PP-025 text with backlog status and replaced its next-work list with current actionable P0/P1 tasks.
  - Confirmed critical golden-path work precedes the real Chrome demo and non-local deployment is blocked on PP-028.
- Artifacts/screenshots: `docs/delivery/REPOSITORY_REVIEW_2026-07-20.md`; screenshots are not applicable to planning-only documentation.
- Backlog updates: Corrected stale statuses, expanded six existing finding-owning tasks, added only PP-027 through PP-034 for uncovered scopes, restored unresolved PP-013 to Ready, and removed the PP-016/PP-023 verification cycle.
- Follow-up tasks created: PP-027, PP-028, PP-029, PP-030, PP-031, PP-032, PP-033, PP-034.
- Residual risk: The MVP remains unproven until the P0 golden-path, review-truth, exact-link, deterministic browser, and real-account Chrome gates pass. Wider deployment remains prohibited until PP-028 passes.

### 2026-07-10 - PP-026 Add advisory task-routing gate for agent workflows

- Role: Builder
- Status: Verifying
- Goal: Add one concise advisory task-routing gate before meaningful Codex, BMAD, or Baton work without automatic model or reasoning changes.
- Acceptance criteria checked:
  - Root `AGENTS.md` now auto-directs meaningful tasks to the compact gate while the detailed rubric remains canonical in `docs/ai/TASK_ROUTING.md`.
  - Review feedback corrected the delivery order: identify and read the explicit or next `Ready` task first, then run the gate on that task rather than on the task-selection operation.
  - The canonical policy assesses scope, ambiguity, novelty, architecture, product, security/privacy, data/persistence, infrastructure, system/package span, verification, and existing-pattern likelihood.
  - Light, Medium, and High map to relative model tiers, reasoning levels, and Direct Codex, Baton, or BMAD-first workflow recommendations without invented model names.
  - Session states cover Suitable, Switch recommended, and Unable to determine; High work blocks when suitability is unknown, normal Medium work does not, and no automatic switch is claimed.
  - BMAD classification occurs before workflow selection through root/project context, and Baton classification occurs before implementation while backlog, acceptance criteria, iteration-log, and builder/verifier rules remain intact.
  - The five dry runs cover Light, Medium, forbidden High, ambiguous High, and Medium-to-High migration escalation without implementing the scenarios or creating a routing loop.
- Commands run:
  - Targeted Prettier check initially found formatting drift in `AGENTS.md` and `docs/ai/TASK_ROUTING.md`; the existing Prettier formatter fixed both, and the rerun passed for all changed Markdown files.
  - The first docs-guard attempt could not resolve `pnpm.cmd`; Corepack then hit sandbox `EPERM` on its user cache. The approved sandbox-external rerun with pinned pnpm 11.9.0 passed, and the final `pnpm check:docs` passed.
  - `make lint` passed for web/shared ESLint and API/worker Ruff.
  - `make format-check` passed for web/shared Prettier and API/worker Black.
  - `make typecheck` passed for web/shared TypeScript and API/worker mypy.
  - `make test` passed: web 13 files/65 tests, dependency-preflight 6 tests, API 77 tests, and worker 2 tests.
  - `node scripts/check-coverage.mjs` passed: web 82.67%, API 92.3%, worker 100%.
  - `make build` passed for shared, Next.js, API compileall, and worker compileall.
  - `pnpm check:docs` passed.
  - After review-ordering feedback, targeted Prettier checks passed for `docs/delivery/WORKFLOW.md`, `docs/ai/TASK_ROUTING.md`, `docs/delivery/TASK_BACKLOG.md`, and `docs/delivery/ITERATION_LOG.md`; `pnpm check:docs` also passed.
- Manual verification:
  - Audited root/nested instructions, canonical rules, project context, project-owned skills and template, installed BMAD topology and customization boundary, portable role prompts, Baton guidance, delivery workflow, testing guidance, backlog, and iteration log.
  - Reviewed all five dry-run outputs against routing, product-policy, metadata-honesty, stop/continue, and no-loop requirements.
  - Confirmed task identification is lightweight intake and that missing or vague acceptance criteria feed the ambiguity assessment instead of preventing routing.
- Artifacts/screenshots: `docs/delivery/artifacts/PP-026/task-routing-dry-runs.md`; screenshots are not applicable to this agent-guidance change.
- Backlog updates: Added PP-026 with acceptance criteria before implementation and moved it to Verifying after the full builder gate passed.
- Follow-up tasks created: None.
- Residual risk: Active model and reasoning metadata may remain unavailable, so `/status` or `/model` comparison and any switch remain manual. Separate verifier sign-off is still pending.

### 2026-07-05 - PP-025 Google Photos Picker API session media-items source path

- Role: Builder
- Status: Done
- Goal: Replace the legacy Google Picker `DocsView(DOCS_IMAGES)` project source path with the supported Google Photos Picker API session/media-items flow required before PP-023 and PP-014 can pass.
- Acceptance criteria checked:
  - `apps/web/app/hooks/useGooglePhotosPicker.ts` now creates Google Photos Picker API sessions through `POST https://photospicker.googleapis.com/v1/sessions`.
  - The hook opens the returned `pickerUri` with `/autoclose`, polls `GET https://photospicker.googleapis.com/v1/sessions/{sessionId}`, and lists selected media through `GET https://photospicker.googleapis.com/v1/mediaItems?sessionId=...`.
  - Selected `PHOTO` media items are normalized from Picker API `mediaFile` metadata into the existing picker selection shape used by the saved project scan path.
  - The implementation does not request write scope, add deletion/recovery behavior, add similarity percentages, or use raw album IDs as MVP evidence.
  - Legacy Google Picker `DocsView(DOCS_IMAGES)`, fixture data, code inspection, raw album IDs, and backend metadata remain insufficient for PP-023 or PP-014 pass evidence.
- Commands run:
  - `pnpm --filter web test -- use-google-photos-picker-hook.test.tsx` initially failed inside the sandbox with `EPERM` reading Vitest from `node_modules`; the approved unsandboxed rerun with the local pnpm executable passed after review fixes: 13 test files, 65 tests, coverage lines 82.67%.
  - `pnpm --filter web lint` passed.
  - `pnpm --filter web typecheck` passed.
  - `apps/web/node_modules/.bin/prettier.cmd --check apps/web/app/hooks/useGooglePhotosPicker.ts apps/web/tests/use-google-photos-picker-hook.test.tsx _bmad-output/implementation-artifacts/spec-pp-025-google-photos-picker-api-session-media-items-source-path.md docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md` initially found formatting drift in the touched hook, test, and spec; targeted `prettier --write` was run for those files, then the spec frozen block was restored to the approved text.
  - `make lint` passed.
  - `make format-check` initially failed after review fixes because `apps/web/app/hooks/useGooglePhotosPicker.ts` needed formatting; after targeted Prettier write, `make format-check` passed.
  - `make typecheck` passed.
  - `make test` passed: web 13 files/65 tests, dependency-preflight 6 tests, API 77 tests, worker 2 tests.
  - `node scripts/check-coverage.mjs` passed: web 82.67, API 92.3, worker 100.
  - `make build` passed.
  - `pnpm check:docs` passed.
  - `rg -n "\b\d+%|auto-delete|automatically delete|write scope|recently deleted|recovery|trash|storage reclaimed|full-library" ...` completed; matches were existing negative guardrails, historical references, design artifacts, or legitimate progress/style percentages, not new unsupported product claims.
- Manual verification:
  - Reviewed official Google Photos Picker API docs for `v1.sessions.create`, `v1.sessions.get`, and `v1.mediaItems.list`; the implementation uses those endpoints and the required `photospicker.mediaitems.readonly` scope.
  - Confirmed the changed hook no longer loads `gapi` or references `google.picker.DocsView(DOCS_IMAGES)`.
  - BMAD Blind Hunter, Edge Case Hunter, and Acceptance Auditor reviews completed. Patch findings were resolved by adding closed-popup polling grace, centralized session cleanup, repeated page-token protection, Google photo download sizing parameters, expanded tests, and updated PP-023 backlog blocker wording.
- Artifacts/screenshots: Not applicable; real Chrome Google Photos demo evidence remains PP-023.
- Backlog updates: Moved PP-025 from Ready to Done and recorded implementation evidence.
- Follow-up tasks created: None.
- Residual risk: Real authenticated Google Photos behavior is not proven by PP-025. PP-023 must run Chrome with a real Google account and record `v1.sessions`, `v1.mediaItems`, selected real media, scan start, grouped review results, and exact-photo link-out/reference evidence before PP-014 can pass.

### 2026-07-05 - PP-024 PR feedback: align agent context and Picker API evidence

- Role: Builder
- Status: Done
- Goal: Address PP-024 PR feedback so agent guidance and MVP evidence requirements match the narrowed Picker-selected source scope.
- Acceptance criteria checked:
  - `_bmad-output/project-context.md` no longer tells agents the current authenticated read-only scope is album/picker; it now names the Picker-selected scope and warns that MVP pass evidence requires the Google Photos Picker API session/media-items path.
  - PP-024 evidence now requires `v1.sessions` and `v1.mediaItems` session/list evidence, not legacy Google Picker `DocsView(DOCS_IMAGES)` evidence alone.
  - PP-023 is blocked until a real Google Photos Picker API session/media-items source path exists.
  - PP-025 records the implementation follow-up for the missing Photos Picker API session/media-items path.
- Commands run:
  - `apps/web/node_modules/.bin/prettier.cmd --check AGENT_RULES.md _bmad-output/project-context.md docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md docs/product/CURRENT_STATE.md docs/product/MVP_EXIT_CRITERIA.md docs/product/MVP_PROGRESS_LEDGER.md docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md docs/testing/MVP_SMOKE_TEST_PLAN.md` passed after formatting `_bmad-output/project-context.md` and `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`.
  - `pnpm.cmd check:docs` passed and ran `node scripts/check-docs.js`.
  - `rg -n "album/picker scope|current authenticated read-only album/picker|DocsView\\(DOCS_IMAGES\\).*count|Picker-selected photos from a real authenticated|PP-023 Run real Chrome picker-selected|PP-025" ...` completed; matches were expected PP-023/PP-025 task titles and endpoint-level Picker API evidence requirements.
  - `rg -n "\b\d+%|auto-delete|automatically delete|write scope|recently deleted|recovery|trash|storage reclaimed|full-library" ...` completed; matches were negative guardrails, historical questionnaire input, task names, or PP-024 rejected-claim wording, not new unsupported product claims.
  - One-shot adversarial review subagent completed. Patch findings were resolved by adding explicit `v1.sessions` and `v1.mediaItems` requirements to `_bmad-output/project-context.md` and `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`.
- Manual verification:
  - Confirmed repo search finds `google.picker.DocsView(DOCS_IMAGES)` in `apps/web/app/hooks/useGooglePhotosPicker.ts` and no `photospicker.googleapis.com` session/media-items implementation.
- Artifacts/screenshots: Not applicable.
- Backlog updates: Marked PP-023 Blocked and added PP-025.
- Follow-up tasks created: PP-025.
- Residual risk: PP-014 and PP-023 remain blocked until PP-025 implements the supported Google Photos Picker API session/media-items flow and a real Chrome demo records passing evidence.

### 2026-07-02 - PP-024 Decide MVP source scope after Google Photos album API limitation

- Role: Builder
- Status: Done
- Goal: Decide whether MVP source scope can shift from arbitrary single/multiple Google Photos album source modes to Picker-selected Google Photos content after PP-022 found the album API limitation.
- Acceptance criteria checked:
  - Product-owner decision accepts Picker-selected real Google Photos content as the MVP source mode, replacing arbitrary single-album and multiple-album source modes for MVP pass evidence.
  - Decision output names the exact MVP source mode, user-facing copy implications, rejected evidence types, and manual demo evidence required after the decision.
  - MVP exit criteria, progress ledger, manual demo checklist, smoke handoff docs, backlog, repo guardrails, README, ROADMAP, and current-state docs now match the changed source-mode definition.
  - Raw album IDs, app-created-data-only Library API reads, backend metadata, fixture/paged test data, and code inspection still cannot count as real MVP source evidence.
- Commands run:
  - `apps/web/node_modules/.bin/prettier.cmd --check AGENT_RULES.md README.md ROADMAP.md docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-014/pp-014-evidence.md docs/delivery/artifacts/PP-022/pp-022-evidence.md docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md docs/product/CURRENT_STATE.md docs/product/MVP_EXIT_CRITERIA.md docs/product/MVP_PROGRESS_LEDGER.md docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md docs/testing/MVP_SMOKE_TEST_PLAN.md _bmad-output/implementation-artifacts/spec-pp-024-source-scope-decision.md` passed after formatting `AGENT_RULES.md`, `README.md`, and the PP-024 spec.
  - `pnpm.cmd check:docs` passed and ran `node scripts/check-docs.js`.
  - `rg -n "\b\d+%|auto-delete|automatically delete|write scope|recently deleted|recovery|trash|storage reclaimed|full-library" ...` completed; matches were negative guardrails, historical evidence, task names, or PP-024 rejected-claim wording, not new unsupported product claims.
  - Blind hunter, edge-case hunter, and acceptance auditor review subagents completed. Patch findings were resolved by narrowing README album/set language, updating stale PP-014/PP-022 evidence wording, adding PP-024 decision provenance, marking questionnaire album-scope answers as historical, adding backlog residual risk, and tightening checklist/source-evidence wording.
  - `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command "& 'C:\Program Files\nodejs\pnpm.cmd' check:docs"` could not run because that absolute pnpm path does not exist on this host; `pnpm.cmd check:docs` was used instead.
- Manual verification:
  - Reviewed PP-022 evidence and updated docs for stale single-album/multiple-album MVP pass requirements.
  - Reviewed review-agent findings and confirmed all non-noise findings were resolved in the patch.
- Artifacts/screenshots:
  - `docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md`
- Backlog updates: Moved PP-024 from Ready to Done and updated PP-014 follow-up wording.
- Follow-up tasks created: None.
- Residual risk: PP-014 remains blocked until the real Chrome Picker-selected Google Photos demo passes with a real account and real content. PP-015 and PP-016 remain separate MVP gates for session timeout recovery and exact-photo link-out behavior.

### 2026-07-02 - PP-022 Implement real Google Photos album source selection and fetch

- Role: Builder
- Status: Blocked
- Goal: Resolve whether PhotoPrune can provide product-ready read-only single-album and multiple-album Google Photos source selection without raw album IDs or fixture/paged test data.
- Acceptance criteria checked:
  - Official Google Photos API docs were reviewed for Library API scope changes and Picker API capabilities.
  - Local picker, saved-project run, ingestion, and project schema paths were inspected.
  - PP-022 evidence records that arbitrary real user-library album listing/fetch is blocked by current Google Photos API support and product-scope decision, while Picker-selected media items remain the supported user-library path.
  - Manual demo checklist now states raw album IDs, fixture/paged test data, backend metadata, and app-created-data-only Library API reads cannot pass the single-album or multiple-album rows.
- Commands run:
  - `apps/web/node_modules/.bin/prettier.cmd --check docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-014/pp-014-evidence.md docs/delivery/artifacts/PP-022/pp-022-evidence.md docs/product/MVP_PROGRESS_LEDGER.md docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md _bmad-output/implementation-artifacts/spec-pp-022-google-photos-album-source-selection.md` passed.
  - `pnpm.cmd check:docs` passed and ran `node scripts/check-docs.js`.
  - `rg -n "\b\d+%|auto-delete|automatically delete|write scope|recently deleted|recovery|trash|storage reclaimed|full-library" ...` completed; matches were negative guardrail statements, historical evidence, task titles, or PP-022 blocker wording, not new unsupported product claims.
  - BMAD blind hunter, edge-case hunter, and acceptance auditor review passes completed. Patch findings were resolved by replacing pending verification, routing stale PP-014 album follow-up language through PP-024, narrowing arbitrary user-library album wording, and making PP-024 decision outputs explicit.
- Manual verification:
  - Reviewed official Google Photos API update, authorization, and Picker REST reference pages.
  - Inspected `apps/web/app/hooks/useGooglePhotosPicker.ts`, `apps/web/app/projects/[id]/run/page.tsx`, `apps/api/app/projects/ingestion.py`, `packages/shared/src/projects.ts`, and `apps/web/src/types/projects.ts`.
- Artifacts/screenshots:
  - `docs/delivery/artifacts/PP-022/pp-022-evidence.md`
- Backlog updates: Moved PP-022 from Ready to Blocked and added PP-024 for the MVP source-scope decision.
- Follow-up tasks created: PP-024.
- Residual risk: PP-014 remains blocked for arbitrary real user-library single-album and multiple-album source modes until PP-024 changes MVP scope or Google exposes a supported read-only album selection/fetch path.

### 2026-07-02 - PP-014 Implement or verify real authenticated Google Photos MVP flow

- Role: Builder
- Status: Blocked
- Goal: Prove the MVP path with a real Google account, real read-only Google Photos content, scan, review, and manual cleanup link-out in Chrome. PP-024 later narrowed MVP source evidence to Picker-selected content.
- Acceptance criteria checked:
  - Authenticated Google flow was inspected in code but not proven with a real Google account in Chrome.
  - Picker-selected photos were inspected in code; real picker execution remains blocked by missing user-owned Google account, OAuth consent, and real Google Photos test content in this agent session.
  - Single-album and multiple-album source modes are blocked by missing product-ready real Google Photos album selection/fetch; the current saved-project UI accepts raw album/media IDs and the backend consumes supplied source metadata, but that is not sufficient manual-demo evidence.
  - Manual demo evidence was recorded as Blocked under `docs/delivery/artifacts/PP-014/pp-014-evidence.md`.
- Commands run:
  - `pnpm smoke:mvp` passed: 1 Playwright Chromium MVP smoke test passed.
  - `pnpm check:docs` passed and ran `node scripts/check-docs.js`.
  - `pnpm format:check -- docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-014/pp-014-evidence.md docs/product/MVP_PROGRESS_LEDGER.md _bmad-output/implementation-artifacts/spec-pp-014-google-photos-mvp-flow.md` initially failed inside the sandbox with `EPERM` reading Turbo, then reached the real command outside the sandbox and failed because Turbo forwarded root-relative doc paths into package directories.
  - `pnpm exec prettier --check ...` could not run because root `prettier` was not installed in this workspace.
  - `apps/web/node_modules/.bin/prettier.cmd --write docs/delivery/artifacts/PP-014/pp-014-evidence.md _bmad-output/implementation-artifacts/spec-pp-014-google-photos-mvp-flow.md` passed after the sandboxed run hit `EPERM` reading Prettier.
  - `apps/web/node_modules/.bin/prettier.cmd --check docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-014/pp-014-evidence.md docs/product/MVP_PROGRESS_LEDGER.md _bmad-output/implementation-artifacts/spec-pp-014-google-photos-mvp-flow.md` passed.
  - `rg -n "\b\d+%|auto-delete|automatically delete|write scope|recently deleted|recovery|trash|storage reclaimed|full-library" ...` completed; matches were negative guardrail statements, historical command evidence, or PP-014 blocker wording, not new unsupported product claims.
  - After BMAD review fixes, `pnpm check:docs` passed.
  - After BMAD review fixes, `apps/web/node_modules/.bin/prettier.cmd --check docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md docs/delivery/artifacts/PP-014/pp-014-evidence.md docs/product/MVP_PROGRESS_LEDGER.md _bmad-output/implementation-artifacts/spec-pp-014-google-photos-mvp-flow.md` passed.
  - After BMAD review fixes, the forbidden-pattern `rg` scan completed with only negative guardrail statements, historical command evidence, or blocker wording.
- Manual verification:
  - Reviewed `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, and `docs/product/MVP_EXIT_CRITERIA.md`.
  - Inspected `apps/web/app/hooks/useGooglePhotosPicker.ts`, `apps/web/app/page.tsx`, `apps/web/app/projects/[id]/run/page.tsx`, `apps/api/app/projects/ingestion.py`, and `packages/shared/src/projects.ts`.
  - Searched the repo for live Google Photos album listing/fetch integration and found no product-ready album source selection path.
  - Ran BMAD blind hunter, edge-case hunter, and acceptance auditor review agents. Patch findings were resolved by adding PP-023 for the picker-selected real Chrome demo, clarifying PP-014 evidence/follow-up ownership, and updating stale MVP progress ledger verification and next-work lines.
- Artifacts/screenshots:
  - `docs/delivery/artifacts/PP-014/pp-014-evidence.md`
- Backlog updates: Moved PP-014 from Ready to Blocked, added PP-022 for real Google Photos album source selection/fetch, and added PP-023 for the real Chrome picker-selected Google Photos demo.
- Follow-up tasks created: PP-022, PP-023.
- Residual risk: Real authenticated Google Photos MVP readiness is not proven. PP-014 must be rerun after a human can complete Chrome OAuth with real Google Photos content and after PP-022 resolves the album source-mode blocker.

### 2026-07-01 - PP-004 Create manual MVP demo checklist

- Role: Builder
- Status: Done
- Goal: Define the human Chrome demo checklist required before MVP exit.
- Acceptance criteria checked:
  - Checklist includes Chrome, real Google login, read-only Google Photos scope, source selection for single album, multiple albums, and picker-selected photos, scan start, progress, grouped review, manual cleanup guidance, and known limitations.
  - Checklist includes Settings/Profile expected behavior for required MVP account details only.
  - Checklist names screenshots, notes, follow-up task IDs, and iteration-log evidence to capture.
  - Automated fixture smoke remains documented as separate from the real Google manual demo gate.
- Commands run:
  - `pnpm check:docs` via `C:\Users\eben_\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd` passed and ran `node scripts/check-docs.js`.
  - Targeted Prettier check initially failed inside the sandbox with `EPERM` reading the workspace Prettier binary, then failed outside the sandbox on formatting for `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`, `docs/delivery/TASK_BACKLOG.md`, and `_bmad-output/implementation-artifacts/spec-pp-004-create-manual-mvp-demo-checklist.md`.
  - `prettier --write docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md docs/delivery/TASK_BACKLOG.md _bmad-output/implementation-artifacts/spec-pp-004-create-manual-mvp-demo-checklist.md` passed.
  - Targeted `prettier --check docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md docs/testing/MVP_SMOKE_TEST_PLAN.md docs/product/MVP_EXIT_CRITERIA.md docs/delivery/TASK_BACKLOG.md docs/delivery/ITERATION_LOG.md _bmad-output/implementation-artifacts/spec-pp-004-create-manual-mvp-demo-checklist.md` passed.
- Manual verification:
  - Reviewed the checklist against `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, and `docs/testing/VERIFICATION_CHECKLIST.md`.
  - Ran BMAD Blind Hunter, Edge Case Hunter, and Acceptance Auditor review agents. Patch findings were resolved by tightening required source-mode completion language, changing trust-guardrail checkboxes to confirmed-absent rows, adding account/OAuth redaction guidance, requiring evidence artifacts for passing demos, splitting fixture smoke expectations from real Google manual-demo checks, and changing the MVP source-mode exit gate from `or` to `and`.
- Artifacts/screenshots: Not applicable; PP-004 creates the checklist and does not run the real Google demo.
- Backlog updates: Moved PP-004 from Ready to Done.
- Follow-up tasks created: None.
- Residual risk: The manual MVP demo itself has not been run; PP-014 and later MVP readiness work still own real authenticated Google Photos execution evidence.

### 2026-07-01 - PP-021 Harden dependency lock drift and supply-chain policy automation

- Role: Builder
- Status: Done
- Goal: Make Node and Python dependency-lock CI failures fail early with actionable diagnostics and repair Python lock-only drift where safe.
- Acceptance criteria checked:
  - CI now has a `dependency-preflight` job that runs before the expensive full gate and keeps protected CI read-only.
  - `scripts/check-pnpm-release-age.mjs` checks pnpm locked package publish times against `pnpm-workspace.yaml` `minimumReleaseAge`, fails for too-new versions, and fails closed when registry metadata is unavailable.
  - Dependabot npm updates use a two-day cooldown so routine update PRs are not opened inside pnpm's 24-hour release-age window.
  - Same-repository PRs that change API or worker `pyproject.toml` files run a Python lock repair workflow that refreshes both services and pushes only lock outputs back to the PR branch.
  - Dependency maintenance docs explain `pnpm dependency:preflight`, `pnpm install`, `make python-locks`, `make python-locks-upgrade`, `make python-locks-check`, and why `pnpm clean --lockfile` is not a PhotoPrune command.
- Commands run:
  - `node --check scripts/check-pnpm-release-age.mjs` passed.
  - `node --test tests/dependency-preflight/*.test.mjs` passed: 6 tests.
  - `node scripts/check-pnpm-release-age.mjs` failed with exit 1 on the current too-new Turbo lock entries and printed publish times plus safe-after times; this is the intended pnpm release-age policy block.
  - `pnpm install --frozen-lockfile` reached pnpm's supply-chain policy gate and failed on the current too-new Turbo lock entries, matching the reported PP-021 failure class.
  - `make python-locks-check` could not run on this Windows host because the Makefile invokes `scripts/sync-python-locks.sh` through a WSL path and WSL has no installed distribution.
  - `UV_CACHE_DIR=C:\DevProjects\PhotoPrune\.uv-cache uv run python scripts/check-python-lock-pins.py` passed.
  - `pnpm check:docs` timed out while pnpm tried to rebuild the dependency tree and then hit the active supply-chain policy gate before running the docs script.
  - `node scripts/check-docs.js` passed.
- Manual verification:
  - Reviewed `.github/workflows/ci.yml`, `.github/workflows/python-lock-repair.yml`, `.github/dependabot.yml`, docs, and helper script behavior for protected-CI non-mutation and branch-scoped repair.
  - Ran BMAD Blind Hunter, Edge Case Hunter, and Acceptance Auditor review agents. Patch findings were resolved by switching npm metadata requests to full packuments, honoring `minimumReleaseAgeExclude`, adding registry timeout and concurrent/cached lookups, quoting the PR branch push ref, adding repair-workflow concurrency, wiring fixture tests into CI and `make test`, adding a non-mutating fork/protected-head fallback summary, and refreshing stale agent project context versions.
  - Confirmed no product UI, deletion, recovery, or similarity-confidence behavior changed.
- Artifacts/screenshots: Not applicable; CI/workflow-only change.
- Backlog updates: Moved PP-021 from In Progress to Done.
- Follow-up tasks created: None.
- Residual risk: Full repo gate remains blocked locally while pnpm release-age policy rejects the current Turbo entries and this Windows host lacks WSL for shell-based Python lock sync. Final confirmation should come from GitHub Actions after the npm registry metadata is reachable and the Turbo packages satisfy the configured release-age window.

### 2026-07-01 - PP-003 Run full repo verification gate and reconcile failures

- Role: Builder
- Status: Done
- Goal: Establish the current full repo verification status after recent MVP smoke, Docker, and CI repair work.
- Acceptance criteria checked:
  - Full gate commands from `docs/ai/testing.md` were run in order where applicable.
  - The format-check failure was triaged to generated shared `dist` output and fixed with a source ignore file instead of editing generated files.
  - Backlog and iteration log now record exact evidence and residual risk.
- Commands run:
  - `make lint` first failed inside the sandbox with Corepack `EPERM` opening `C:\Users\eben_\AppData\Local\node\corepack\v1\pnpm`; escalated rerun passed: root lint 2 packages successful, API ruff passed, worker ruff passed.
  - `make format-check` first failed inside the sandbox with the same Corepack `EPERM`; escalated rerun reached the real check and failed on `packages/shared/dist/index.d.ts` and `packages/shared/dist/index.js`.
  - Added `packages/shared/.prettierignore` for `dist`, `.turbo`, `coverage`, and `node_modules`.
  - `make format-check` rerun passed: shared and web Prettier checks passed; API and worker black checks passed.
  - `make typecheck` first failed inside the sandbox with the same Corepack `EPERM`; escalated rerun passed: shared/web TypeScript checks passed, API mypy passed, worker mypy passed.
  - `make test` first failed inside the sandbox with the same Corepack `EPERM`; escalated rerun passed: web 13 files and 62 tests passed; API 77 tests passed; worker 2 tests passed.
  - `node scripts/check-coverage.mjs` passed: web 81.26, API 92.3, worker 100.
  - `make build` first failed inside the sandbox with the same Corepack `EPERM`; escalated rerun passed: shared tsup build passed, Next build passed, API and worker compileall passed.
  - `pnpm check:docs` passed after delivery-doc updates.
  - `make python-locks-check` was not run because no Python dependency manifests or lock files changed.
- Manual verification:
  - Reviewed `git status` after `make build`; reverted unrelated generated `apps/web/next-env.d.ts` route-type churn from the build output.
  - Confirmed PP-003 documentation does not claim real authenticated Google Photos readiness; PP-014/manual demo remains separate.
- Artifacts/screenshots: Not applicable.
- Backlog updates: Moved PP-003 from Ready through In Progress to Done and recorded gate evidence.
- Follow-up tasks created: None.
- Residual risk: Local sandboxed make invocations cannot read the user-local Corepack pnpm cache, so make targets that invoke pnpm require approved escalation in this environment. The escalated runs completed the actual documented gate.

### 2026-06-30 - PP-002 Add or confirm MVP Playwright smoke test for the golden path

- Role: Builder
- Status: Done
- Goal: Provide a repeatable MVP Playwright smoke gate for the primary scan/review path.
- Acceptance criteria checked:
  - Added root command `pnpm smoke:mvp`.
  - Added Playwright config and Chromium smoke spec covering home, primary CTA, scan/progress, grouped results/review, confidence labels, manual guidance, Settings, and Account/Profile behavior.
  - Smoke includes trust assertions for unsupported similarity percentages, destructive/write-scope/recovery claims, and unsupported storage/privacy/local-only claims.
  - Updated `docs/testing/MVP_SMOKE_TEST_PLAN.md` with the command and the automated/manual verification boundary.
- Commands run:
  - `pnpm smoke:mvp` initially failed inside the sandbox with `EPERM` reading Playwright's installed CLI.
  - `pnpm smoke:mvp` outside the sandbox reached Playwright and exposed a webServer command argument bug, then a missing Chromium browser.
  - `pnpm exec playwright install chromium` passed and installed Playwright Chromium.
  - `pnpm smoke:mvp` passed: 1 Playwright Chromium test passed.
  - `pnpm --filter web lint` passed.
  - `pnpm --filter web typecheck` passed.
  - `pnpm --filter web test` passed: 13 test files, 62 tests, coverage lines 81.26%.
  - `pnpm check:docs` passed.
  - `pnpm --filter web exec prettier --check ...` passed for touched parseable files.
  - `pnpm lint` passed.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `node scripts/check-coverage.mjs` passed: web 81.26, api 90.9, worker 100.
  - `pnpm build` passed.
  - `pnpm format:check` failed on pre-existing/generated `packages/shared/dist/index.d.ts` and `packages/shared/dist/index.js`; touched parseable files passed targeted Prettier check.
- Manual verification:
  - Reviewed the passing smoke output. The smoke uses Playwright Chromium with the Desktop Chrome profile and fixture mode, not real Google Photos credentials.
- Artifacts/screenshots: Not applicable for the passing run; Playwright traces are retained only on failure under ignored `test-results/`.
- Backlog updates: Moved PP-002 from Ready to Verifying and recorded smoke evidence.
- Follow-up tasks created: None.
- Residual risk: The automated smoke does not prove real authenticated Google Photos behavior; PP-014/manual MVP demo still owns that exit gate. Full root format check is still red on generated shared `dist` files outside PP-002 scope.

### 2026-06-30 - PP-019 Align CI pnpm and Node versions with repo package manager

- Role: Builder
- Status: Done
- Goal: Restore frozen pnpm installs in CI by replacing the stale GitHub Actions `pnpm@9.12.2` setup with `pnpm@11.9.0`, matching `package.json`, and running it on Node 24 instead of Node 20.
- Acceptance criteria checked:
  - `.github/workflows/ci.yml` now installs `pnpm@11.9.0` and configures `actions/setup-node` with Node 24.
  - `package.json` remains on `pnpm@11.9.0`; `pnpm-workspace.yaml` remains the canonical override configuration; no dependency versions or lockfile resolutions changed.
- Commands run:
  - `pnpm install --frozen-lockfile` could not run under pnpm 11 locally because Corepack/npm registry access to `pnpm@11.9.0` returned HTTP 403 in this environment; this container also only has Node 20.20.2, while pnpm 11.9.0 requires at least Node 22.13.
  - `pnpm install --frozen-lockfile` passed with the locally cached `pnpm v10.30.3`, confirming the restored lockfile still matches the workspace overrides for the available compatible toolchain.
  - `pnpm check:docs` passed.
- Manual verification:
  - Reviewed `.github/workflows/ci.yml`, `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml` to confirm CI now uses the repo-declared pnpm major on Node 24 and the lockfile override block is preserved.
- Artifacts/screenshots: Not applicable.
- Backlog updates: Updated PP-019 and marked it Done.
- Follow-up tasks created: None.
- Residual risk: Local pnpm 11 execution could not be re-run due registry access restrictions and the local Node 20 runtime, so final confirmation should come from GitHub Actions where `pnpm/action-setup` provisions pnpm 11.9.0 and `actions/setup-node` provisions Node 24.

### 2026-06-30 - PP-018 Fix Compose web image build after pnpm 11 upgrade

- Role: Builder
- Status: Done
- Goal: Restore `make dev` after the repo package manager moved to `pnpm@11.9.0`.
- Acceptance criteria checked:
  - Web Docker build uses Node 22 for the build and runtime stages.
  - pnpm overrides moved from ignored `package.json` `pnpm.overrides` config to `pnpm-workspace.yaml` for pnpm 11 compatibility.
  - Web image and dev command now run a full workspace frozen install and explicitly allow dependency build scripts required by native packages under pnpm 11.
  - `make dev` preflight checks `node:22-slim`, matching the web Dockerfile.
  - Standalone `apps/web/Dockerfile` also uses Node 22 so the alternate web image path does not retain the broken Node 20/Corepack pairing.
- Commands run:
  - `docker image inspect node:22-slim` initially failed because the image was not local.
  - `docker pull node:22-slim` passed and downloaded `node:22-slim`.
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml -p photoprune build web` first confirmed the original Corepack crash was fixed, then exposed pnpm 11 config/build-policy follow-up failures.
  - `docker run --rm -v C:\DevProjects\PhotoPrune:/app:ro -w /app node:22-slim sh -lc "corepack enable && pnpm config get onlyBuiltDependencies && pnpm config get overrides"` confirmed pnpm 11 reads workspace config.
  - `docker run --rm -v C:\DevProjects\PhotoPrune:/src:ro node:22-slim sh -lc "mkdir /tmp/app && cd /tmp/app && cp /src/package.json /src/pnpm-lock.yaml /src/pnpm-workspace.yaml /src/turbo.json /src/tsconfig.base.json ./ && mkdir -p scripts apps packages && cp /src/scripts/prepare-lefthook.cjs scripts/ && cp -R /src/apps/web apps/web && cp -R /src/packages/shared packages/shared && corepack enable && pnpm install --frozen-lockfile --config.dangerously-allow-all-builds=true"` passed.
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml -p photoprune build web` passed and built `photoprune-web:latest`; install completed with `pnpm v11.9.0` and `next build` completed.
  - `node scripts/check-docs.js` passed.
  - `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"` passed.
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet` passed.
- Manual verification:
  - Reviewed the failed and passing Docker build output. The original `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` no longer appears; pnpm install and Next production build complete in the web image.
- Artifacts/screenshots: Not applicable.
- Backlog updates: Added PP-018 and marked it Done.
- Follow-up tasks created: None.
- Residual risk: Full `make dev` was not left running; verification used a focused Compose web build and combined Compose config validation.

### 2026-06-30 - PP-017 Resolve manual review findings for PP-001 navigation labels and settings copy

- Role: Builder
- Status: Verifying
- Goal: Resolve product-owner manual review findings by making navigation labels match their destinations and removing implementation-phase copy from Settings.
- Acceptance criteria checked:
  - Home header uses `Results` for `/results`, not `History`.
  - Review shell no longer shows competing `History` and `Review` top-nav links to `/results`.
  - Review shell marks `Results` active with `aria-current="page"` only on results routes.
  - Settings page heading reads `Settings`, not `MVP settings`.
  - Settings still routes to `/settings`; Account/Profile still routes to `/account`.
- Commands run:
  - `apps/web/node_modules/.bin/vitest.cmd run --coverage -- home.test.tsx` passed after BMAD review fixes: 13 test files, 62 tests, coverage lines 81.26%.
  - `apps/web/node_modules/.bin/tsc.cmd --noEmit` passed.
  - `apps/web/node_modules/.bin/eslint.cmd .` passed.
  - `apps/web/node_modules/.bin/prettier.cmd --check .` passed after formatting `apps/web/tests/home.test.tsx`.
  - `apps/web/node_modules/.bin/next.cmd build` passed and listed `/results`, `/settings`, and `/account`.
  - `node scripts/check-docs.js` passed after PP-017 evidence updates.
- Manual verification:
  - Captured desktop home, review shell, and settings page screenshots from a fresh Next dev server on port `3017` using system Chrome.
  - Browser-observed top navigation labels on home, review shell, and settings are `Results` and `Settings`.
  - Browser-observed Settings page heading is `Settings`.
- Artifacts/screenshots:
  - `docs/delivery/artifacts/PP-017/home-header-desktop.png`
  - `docs/delivery/artifacts/PP-017/run-shell-desktop.png`
  - `docs/delivery/artifacts/PP-017/settings-page-desktop.png`
- Backlog updates: Moved PP-017 from Ready to Verifying.
- Follow-up tasks created: None.
- Residual risk: BMAD review patch items were fixed and re-verified; no new product follow-up task identified.

### 2026-06-28 - PP-001 Verify/fix visible home navigation and profile/account affordances

- Role: Builder
- Status: Verifying
- Goal: Fix visible home header Settings and Account/Profile affordances so they are non-ambiguous, accessible, and limited to required MVP account/settings behavior.
- Acceptance criteria checked:
  - Settings no longer routes to `/`; it routes to `/settings`.
  - Account/Profile is an accessible `Account status` link to `/account`.
  - Settings and account pages expose only MVP-scoped account/settings details and clearly list unavailable non-required settings.
  - Desktop and mobile screenshots show the visible home/header state.
- Commands run:
  - `pnpm --filter web test -- home.test.tsx` passed after BMAD review fixes: 13 test files, 61 tests, coverage lines 81.24%.
  - `pnpm --filter web lint` passed.
  - `pnpm --filter web typecheck` passed.
  - `pnpm --filter web format:check` passed after running `pnpm --filter web format`.
  - `pnpm --filter web build` passed and listed `/settings` and `/account` in the app route table.
  - `pnpm check:docs` passed.
- Manual verification:
  - Launched the web app locally through Next dev and captured desktop and mobile home/header screenshots with system Chrome.
  - Browser check confirmed `Settings` resolves to `/settings` and `Account status` resolves to `/account`.
  - BMAD blind, edge-case, and acceptance review subagents completed.
  - Fixed review findings for null-safe pathname handling, narrow mobile header spacing, and stale `ReviewShell` Settings/Profile affordances.
  - Product-owner manual review later found confusing `History`/`Results`/`Review` navigation semantics and visible `MVP Settings` copy.
- Artifacts/screenshots:
  - `docs/delivery/artifacts/PP-001/home-header-desktop.png`
  - `docs/delivery/artifacts/PP-001/home-header-mobile.png`
- Backlog updates: Moved PP-001 from Ready to Verifying.
- Follow-up tasks created: PP-017.
- Residual risk: Full repo verification remains to be run after the focused PP-001 checks; PP-017 should be resolved before PP-001 is marked Done.

### 2026-05-18 — PP-000 Agentic Delivery Reset

- Role: Builder
- Status: Done
- Goal: Create repo-native delivery reset artifacts so future work starts from MVP truth, task discipline, iteration tracking, verification gates, and portable prompts.
- Reason for reset: Roadmap and agent completion were not enough to prove app usability.
- Source of truth: Repo artifacts are source of truth, not chat history.
- Baton: May be used as a workspace manager, but repo docs remain truth.
- GitHub Issues/Projects: Not source of truth for now.
- Next work rule: Future work must start from `docs/delivery/TASK_BACKLOG.md`.
- Commands run:
  - `make lint` passed.
  - `make format-check` passed.
  - `pnpm exec prettier --check apps/web/AGENTS.md .agent/prompts/*.md docs/product/*.md docs/delivery/*.md docs/testing/*.md docs/questionnaires/*.md` passed.
  - `make typecheck` passed.
  - `make test` passed.
  - `node scripts/check-coverage.mjs` passed.
  - `make build` failed because Next.js could not fetch Google Fonts (`Inter` and `Manrope`) during build.
  - `pnpm check:docs` passed.
- Manual verification: Docs-only review confirmed required reset artifacts exist; MVP usability remains not yet verified.
- Backlog updates: Seeded PP-000 through PP-010.
- Follow-up tasks created: PP-001 through PP-010.
- Residual risk: MVP usability remains not yet verified until P0 smoke/demo tasks run.

### 2026-06-07 — PP-011 Repair Python lock check and cleanup run pruning

- Role: Builder
- Status: Done
- Goal: Fix the stale worker Python dev dependency pin that made `uv lock --locked` fail in CI and broaden cleanup-run pruning for old closed PR runs recorded by PR refs or head branch names.
- Acceptance criteria checked:
  - Worker `pyproject.toml` ruff pin matches committed worker lock files.
  - Cleanup workflow caches closed PR metadata and matches completed runs by `pull_requests`, `refs/pull/<number>/head`, and closed PR head branch names before deleting after the closed-PR grace period.
  - Contributor docs describe the expanded cleanup behavior.
- Commands run:
  - `(cd apps/worker && /root/.local/bin/uv lock --locked) && (cd apps/api && /root/.local/bin/uv lock --locked)` passed.
  - `make python-locks-check` failed locally because the environment cannot fetch PyPI through the configured tunnel, but the manifest-only `uv lock --locked` check passes for both services.
  - `bash -n /tmp/cleanup-runs.sh` passed.
  - `pnpm check:docs` passed.
- Manual verification: Reviewed the workflow logic against the reported February closed-PR run examples.
- Artifacts/screenshots: Not applicable; CI/workflow-only change.
- Backlog updates: Added PP-011.
- Follow-up tasks created: None.
- Residual risk: Full non-mutating Python lock check still requires network access to PyPI for `uv pip compile`; local tunnel blocks that verification.

### 2026-06-14 - PP-012 Record product-owner MVP alignment in canonical docs

- Role: Builder
- Status: Done
- Goal: Convert `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md` answers into canonical MVP scope, demo, trust, verification, and backlog docs without implementing product changes.
- Acceptance criteria checked:
  - Product docs identify the MVP user, promise, real Google Photos data path, session-only persistence, required Settings/Profile scope, and manual cleanup link-out.
  - Trust docs preserve no auto-delete, no in-app delete, no write scope, and no unsupported storage/sharing/privacy claims.
  - Numeric similarity percentages are recorded as a dedicated product-policy decision before implementation.
  - Manual MVP demo checklist is recorded as a follow-up task.
- Commands run:
  - `Select-String -Path docs\questionnaires\MVP_ALIGNMENT_QUESTIONNAIRE.md -Pattern 'TBD|Missing' -CaseSensitive` found only the introductory questionnaire instruction.
  - `pnpm check:docs` passed.
  - `pnpm exec prettier --check ...` failed because the workspace could not access Corepack's pnpm cache inside the sandbox, then outside the sandbox reported no `prettier` binary.
  - `pnpm format:check` failed because `packages/shared/node_modules/prettier/bin/prettier.cjs` is missing.
  - `pnpm install --frozen-lockfile` failed inside and outside the sandbox with `EACCES` opening `packages/shared/node_modules/prettier/package.json`.
- Manual verification: Reviewed questionnaire answers against updated canonical docs and backlog tasks.
- Artifacts/screenshots: Not applicable; docs-only product alignment.
- Scope correction: Reverted earlier updates to files outside the artifact list requested by the product-alignment prompt.
- Backlog updates: Updated PP-004 for the Chrome real-Google manual demo checklist, added PP-012 through PP-016.
- Follow-up tasks created: PP-013, PP-014, PP-015, PP-016.
- Residual risk: MVP usability remains unverified until PP-014 and the manual demo checklist pass. Markdown formatting was not fully verified because the local `node_modules` tree has a Prettier permission/install issue.
