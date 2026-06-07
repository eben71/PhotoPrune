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
