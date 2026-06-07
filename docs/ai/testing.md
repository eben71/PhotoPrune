# Testing Guide

Use the smallest useful check during iteration, then run the full repo gate before handoff for substantial work.

## Fast local checks
- Root lint: `make lint`
- Root format check: `make format-check`
- Root typecheck: `make typecheck`
- Root tests: `make test`
- Coverage gate: `node scripts/check-coverage.mjs`
- Root build: `make build`
- Docs guard: `pnpm check:docs`
- Python lock sync check: `make python-locks-check`

## Service-level checks
- Web: `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter web test`
- Shared package: `pnpm --filter @photoprune/shared lint`, `pnpm --filter @photoprune/shared typecheck`
- API: `cd apps/api && uv run ruff check app tests`, `cd apps/api && uv run mypy app`, `cd apps/api && uv run pytest`
- Worker: `cd apps/worker && uv run ruff check app tests`, `cd apps/worker && uv run mypy app`, `cd apps/worker && uv run pytest`

## Full handoff gate
Run these from the repo root unless the task is docs-only or another narrower path is explicitly sufficient:
1. `make lint`
2. `make format-check`
3. `make typecheck`
4. `make test`
5. `node scripts/check-coverage.mjs`
6. `make build`
7. `make python-locks-check` when Python dependency manifests or lock files changed
8. `pnpm check:docs` when commands, structure, or workflow docs changed

## Expected test coverage
- UI changes should cover render behavior, confidence labels, and safe versus destructive action visibility.
- API and worker changes should update or add pytest coverage for the changed behavior.
- If a change is too small for new tests, explain why.

## Dependency lock maintenance
- Run `make python-locks` after editing `apps/api/pyproject.toml` or `apps/worker/pyproject.toml` so `uv.lock`, `requirements.lock`, and `requirements-dev.lock` stay aligned.
- Run `make python-locks-upgrade` when intentionally refreshing Python dependencies to the latest allowed versions. A scheduled workflow runs this weekly before Dependabot and opens a PR if lock files change.
- CI runs the non-mutating `make python-locks-check` before installing Python dependencies so stale Dependabot or manual dependency edits fail with a focused lock-file diff instead of later audit failures. CI also pins the `uv` version used for lock checks and refreshes to avoid lock metadata churn from tool output-format changes.

## When a check is skipped
- State the exact command not run.
- State why it was skipped.
- State the residual risk.
