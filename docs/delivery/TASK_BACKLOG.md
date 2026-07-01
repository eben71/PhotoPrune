# Task Backlog

Repo-native source of truth for delivery tasks. Do not use GitHub Issues/Projects as source of truth for now.

## Status values

Draft | Ready | In Progress | Verifying | Done | Blocked | Discarded

## P0

### PP-000 Agentic Delivery Reset

- Status: Done
- Type: Docs / Delivery
- Links: `AGENT_RULES.md`, `docs/product/MVP_EXIT_CRITERIA.md`, `docs/delivery/WORKFLOW.md`, `docs/testing/VERIFICATION_CHECKLIST.md`
- Goal: Create repo-native artifacts for MVP truth, backlog discipline, iteration tracking, verification gates, and reusable prompts.
- Acceptance criteria:
  - Reset docs, backlog, iteration log, prompts, MVP smoke plan, and verification checklist exist.
  - `AGENT_RULES.md` contains concise delivery-convergence rules.
  - Known doc-only inconsistencies are fixed or recorded as follow-up tasks.
  - Docs checks are run and evidence is recorded.

### PP-001 Verify/fix visible home navigation and profile/account affordances

- Status: Done
- Type: UI / Trust
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `apps/web/AGENTS.md`
- Goal: Ensure visible Settings and Profile/Account affordances show only required MVP account details and settings, with non-required items hidden or clearly unavailable.
- Acceptance criteria:
  - Settings does not route ambiguously to `/`.
  - Required MVP account details and settings are visible and working.
  - Non-required account/settings items are hidden or clearly unavailable.
  - Screenshots prove visible home/header states.
  - Backlog and iteration log are updated.

### PP-002 Add or confirm MVP Playwright smoke test for the golden path

- Status: Done
- Type: Test
- Links: `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `package.json`
- Goal: Provide a repeatable MVP smoke gate for the primary scan/review path.
- Acceptance criteria:
  - A documented command runs the MVP smoke path or an existing command is confirmed.
  - Smoke covers home, primary CTA, scan/progress, grouped results/review, confidence labels, manual guidance, and Settings/Profile behavior.
  - The command is added to docs and backlog evidence.
- Evidence:
  - `pnpm smoke:mvp` runs the Playwright Chromium MVP smoke spec at `tests/e2e/mvp-smoke.spec.ts`.
  - 2026-06-30 local result: `pnpm smoke:mvp` passed, 1 test passed.
  - The smoke uses deterministic fixture mode and a Google Picker browser stub; real Google Photos account verification remains covered by PP-014/manual demo work.

### PP-003 Run full repo verification gate and reconcile failures

- Status: Ready
- Type: Verification
- Links: `docs/ai/testing.md`, `.agents/skills/repo-verify/SKILL.md`
- Goal: Establish current green/red status for the full repo gate after reset.
- Acceptance criteria:
  - Full gate commands from `docs/ai/testing.md` are run or explicitly skipped with blocker/risk.
  - Failures are triaged into fixes or follow-up tasks.
  - Iteration log records exact evidence.

### PP-004 Create manual MVP demo checklist

- Status: Ready
- Type: Docs / Verification
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Define a human demo checklist that must pass before MVP exit.
- Acceptance criteria:
  - Checklist includes Chrome, real Google login, read-only Google Photos scope, scan start, progress, grouped review, manual cleanup guidance, and limitations.
  - Checklist includes Settings/Profile expected behavior for required MVP account details only.
  - Checklist references artifacts/screenshots to capture.

### PP-017 Resolve manual review findings for PP-001 navigation labels and settings copy

- Status: Done
- Type: UI / Navigation / Trust
- Links: `docs/delivery/ITERATION_LOG.md`, `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `apps/web/AGENTS.md`
- Goal: Resolve product-owner manual review findings where top navigation labels do not clearly match their routes and the Settings page exposes implementation-phase language.
- Acceptance criteria:
  - Settings page heading uses user-facing copy such as `Settings`, not `MVP Settings`.
  - Top navigation labels and destinations are consistent across the home header and review shell.
  - `History` is either backed by an intentional `/history` experience or renamed/reworked so it does not ambiguously point to `/results`.
  - Results/review navigation does not create a confusing `History` versus `Review` loop or imply an unsupported `/review` route.
  - Settings still routes to `/settings`; Account/Profile still routes to `/account`.
  - Tests and screenshot evidence cover the corrected home and review-shell navigation states.

### PP-018 Fix Compose web image build after pnpm 11 upgrade

- Status: Done
- Type: Chore / Dev Environment
- Links: `package.json`, `infra/docker/web.Dockerfile`, `apps/web/Dockerfile`, `Makefile`
- Goal: Restore `make dev` after the repo package manager moved to `pnpm@11.9.0`.
- Acceptance criteria:
  - Web Docker build uses a Node runtime compatible with the declared pnpm version.
  - pnpm override configuration is stored where pnpm 11 reads it so frozen installs match the lockfile.
  - Dev container install uses a pnpm 11-compatible workspace install path and explicitly allows dependency build scripts required by native packages.
  - `make dev` image preflight checks the same Node image used by the web Dockerfile.
  - Compose reaches the web service build step without the Corepack `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` failure.
  - Any remaining runtime or dependency failures are recorded with exact evidence.

### PP-019 Align CI pnpm and Node versions with repo package manager

- Status: Done
- Type: Chore / CI
- Links: `.github/workflows/ci.yml`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- Goal: Restore frozen pnpm installs in CI by using the same pnpm major version that generated the current workspace override-aware lockfile on a Node runtime supported by pnpm 11.
- Acceptance criteria:
  - GitHub Actions installs `pnpm@11.9.0`, matching the package manager declared in `package.json`.
  - GitHub Actions uses Node 24 so pnpm 11 can load required modern Node built-ins such as `node:sqlite`.
  - `pnpm-workspace.yaml` remains the canonical location for pnpm overrides.
  - Dependency versions and lockfile resolutions are not changed for this CI repair.
  - Local verification records that `pnpm@11.9.0` could not be downloaded in this environment if registry access remains blocked.

### PP-021 Harden dependency lock drift and supply-chain policy automation

- Status: Ready
- Type: Chore / CI / Dependency Management
- Links: `.github/workflows/ci.yml`, `.github/workflows/python-dependency-refresh.yml`, `package.json`, `pnpm-lock.yaml`, `apps/api/pyproject.toml`, `apps/worker/pyproject.toml`, `scripts/sync-python-locks.sh`, `docs/ai/testing.md`
- Goal: Make recurring Node and Python dependency-lock CI failures self-diagnosing and automatically repairable where safe, so Dependabot/scheduled dependency changes do not repeatedly break install or lock-check workflows.
- Acceptance criteria:
  - CI has a focused dependency preflight that catches pnpm minimum-release-age violations and Python manifest/lock drift before the expensive full gate, with actionable output that names the exact repair command or automation path.
  - Node dependency updates account for pnpm supply-chain policy timing: either dependency automation waits until packages satisfy the configured minimum release age or opens a delayed/refresh PR instead of committing too-new lockfile entries.
  - Python dependency updates keep `apps/api` and `apps/worker` `pyproject.toml`, `uv.lock`, `requirements.lock`, and `requirements-dev.lock` synchronized automatically when pins change, including Dependabot-created ruff-style version bumps that currently fail as separate API and worker `make python-locks-check` errors.
  - Safe auto-repair is implemented for lock-only drift where the manifest change is already committed: automation can run the existing lock sync commands and update the same branch/PR, while protected CI remains non-mutating.
  - Repo docs explain the dependency maintenance flow, when to run `make python-locks`, `make python-locks-upgrade`, `pnpm clean --lockfile`, and `pnpm install`, and how pnpm minimum-release-age failures should be handled.
  - Tests or workflow dry-runs cover stale Python locks and too-new pnpm lock entries without relying on live package publication timing.
  - The implementation records exact evidence in `docs/delivery/ITERATION_LOG.md` and leaves no unsupported product-scope changes.


## P1

### PP-005 Reconcile Phase 3 “complete” roadmap status with actual MVP usability

- Status: Ready
- Type: Docs / Verification
- Links: `README.md`, `ROADMAP.md`, `docs/product/CURRENT_STATE.md`, `docs/product/MVP_PROGRESS_LEDGER.md`
- Acceptance criteria:
  - Phase 3 language distinguishes technical milestone completion from product usability readiness.
  - Any mismatch found during demo/smoke is recorded as a task.

### PP-006 Audit frontend trust copy and visible unsupported claims

- Status: Ready
- Type: UI / Docs
- Links: `AGENT_RULES.md`, `docs/trust-copy.md`, `docs/product/DO_NOT_BUILD.md`
- Acceptance criteria:
  - UI copy contains no unsupported similarity percentages, auto-delete claims, unsupported recovery claims, hypey AI copy, or unsupported privacy/local-only claims.
  - Findings are documented with follow-up tasks if fixes are needed.

### PP-007 Add task-discovery follow-up workflow

- Status: Ready
- Type: Delivery
- Links: `docs/delivery/WORKFLOW.md`, `.agent/prompts/task-discovery.md`
- Acceptance criteria:
  - Discovery workflow explains when to create follow-up tasks rather than expanding scope.
  - New task entries include priority, status, acceptance criteria, and verification expectations.

### PP-008 Baton/git worktree usage guide

- Status: Ready
- Type: Delivery
- Links: `docs/delivery/BATON_WORKTREE_GUIDE.md`
- Acceptance criteria:
  - Baton and git worktree rules exist and map one workspace to one task ID.
  - Branch naming and handoff requirements are documented.

### PP-009 Align or document pnpm version mismatch between package.json and CI

- Status: Ready
- Type: Chore / Docs
- Links: `package.json`, `.github/workflows/ci.yml`, `docs/ai/testing.md`
- Evidence: `package.json` declares pnpm `10.30.3`; CI currently sets pnpm `9.12.2`.
- Acceptance criteria:
  - Decision is made to align CI or explicitly document why mismatch is intentional.
  - Relevant install/CI docs are updated.
  - CI dependency installation remains reproducible.

### PP-011 Repair Python lock check and cleanup run pruning

- Status: Done
- Type: Chore / CI
- Links: `apps/worker/pyproject.toml`, `.github/workflows/cleanup-runs.yml`, `docs/CONTRIBUTING.md`
- Goal: Restore the Python lock check to a manifest/lock-consistent state and make scheduled cleanup prune old completed runs tied to closed PR refs or branch names.
- Acceptance criteria:
  - Worker Python dev dependency pins match the committed lock files.
  - Cleanup run pruning detects closed PR runs by `pull_requests` metadata, `refs/pull/<number>/head` refs, and closed PR head branch names.
  - Documentation reflects the cleanup behavior.
  - Relevant checks are run or blockers are recorded.

### PP-010 Fix apps/web/AGENTS.md frontend notes link mismatch if confirmed

- Status: Done
- Type: Docs
- Links: `apps/web/AGENTS.md`, `docs/frontend-design-implementation-notes.md`
- Evidence: Link text referenced plural notes while target pointed to singular `docs/frontend-design-implementation-note.md`.
- Acceptance criteria:
  - Link target points to `docs/frontend-design-implementation-notes.md`.
  - Docs guard passes.

### PP-012 Record product-owner MVP alignment in canonical docs

- Status: Done
- Type: Docs / Product
- Links: `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md`, `docs/product/MVP_EXIT_CRITERIA.md`, `docs/product/MVP_PROGRESS_LEDGER.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Convert questionnaire answers into canonical MVP scope, demo, trust, verification, and backlog docs without implementing product changes.
- Acceptance criteria:
  - Product docs identify the MVP user, promise, real Google Photos data path, session-only persistence, required Settings/Profile scope, and manual cleanup link-out.
  - Trust docs preserve no auto-delete, no in-app delete, no write scope, and no unsupported storage/sharing/privacy claims.
  - Similarity percentages are recorded as a dedicated product-policy decision before implementation.
  - Docs guard passes or any blocker is recorded.

### PP-013 Resolve numeric similarity evidence policy

- Status: Ready
- Type: Product / Trust
- Links: `AGENT_RULES.md`, `docs/product/DO_NOT_BUILD.md`, `docs/trust-copy.md`, `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md`
- Goal: Decide whether MVP should show numeric similarity percentages or only plain-English similarity reasons and confidence bands.
- Acceptance criteria:
  - Product owner decision is recorded explicitly.
  - If percentages are approved, UI copy rules explain where they may appear and how they differ from confidence.
  - If percentages remain prohibited, review explanation requirements are updated to avoid numeric scoring.
  - Tests and smoke assertions are updated to match the decision.

### PP-014 Implement or verify real authenticated Google Photos MVP flow

- Status: Ready
- Type: Product / Integration
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Prove the MVP path with a real Google account, real read-only album or picker content, scan, review, and manual cleanup link-out in Chrome.
- Acceptance criteria:
  - Authenticated Google flow works without write scope.
  - User can scan a single album, multiple albums, and picker-selected photos, or unsupported subpaths are clearly recorded as blockers.
  - Results show grouped identical/similar candidates from real Google Photos content.
  - Manual demo evidence is recorded.

### PP-015 Implement or verify session-only scan persistence and timeout recovery

- Status: Ready
- Type: Product / Reliability
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/product/MVP_PROGRESS_LEDGER.md`
- Goal: Store only what is needed to complete the current scan and preserve current-session selections after timeout where technically possible.
- Acceptance criteria:
  - Current-session selections survive an in-session timeout where possible.
  - Browser close restart behavior is documented as acceptable for MVP.
  - Previous scan history is not required for MVP readiness.
  - Tests or manual evidence cover timeout behavior.

### PP-016 Implement or verify Google Photos exact-photo link-out for manual cleanup

- Status: Ready
- Type: Product / Trust
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Let users open the exact selected photo in Google Photos in a new tab for manual cleanup outside PhotoPrune.
- Acceptance criteria:
  - Each selected cleanup candidate has a link or reference to the exact Google Photos item.
  - Link opens in a new tab.
  - No in-app delete option or write-scope action is introduced.
  - Manual cleanup guidance remains clear and non-destructive.

### PP-020 Expand Playwright MVP regression coverage

- Status: Ready
- Type: Test
- Links: `tests/e2e/mvp-smoke.spec.ts`, `playwright.config.ts`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `docs/product/MVP_EXIT_CRITERIA.md`
- Goal: Expand the PP-002 Playwright smoke foundation into focused MVP regression coverage for trust-critical browser behavior without replacing the real-Google manual demo path.
- Acceptance criteria:
  - Playwright coverage is split into maintainable focused specs or helper modules instead of one oversized smoke test.
  - Coverage includes at least three MVP regression areas beyond the basic golden path, such as route/session guard behavior, trust-copy forbidden-claim checks across key pages, Google Photos link-out behavior, Settings/Account scope, or viewport/accessibility-critical navigation.
  - The existing `pnpm smoke:mvp` command remains fast and deterministic, or any additional Playwright command is documented with when to use it.
  - Reusable Playwright helpers avoid duplicating the Google Picker stub, fixture-mode setup, forbidden-claim assertions, and common navigation flows.
  - Docs and delivery evidence explain what is automated versus what remains manual/PP-014 real Google Photos verification.
