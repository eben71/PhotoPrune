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
