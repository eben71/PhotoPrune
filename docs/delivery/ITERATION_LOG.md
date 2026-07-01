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
