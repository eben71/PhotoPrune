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
7. `pnpm check:docs` when commands, structure, or workflow docs changed

## Expected test coverage
- UI changes should cover render behavior, confidence labels, and safe versus destructive action visibility.
- API and worker changes should update or add pytest coverage for the changed behavior.
- If a change is too small for new tests, explain why.

## When a check is skipped
- State the exact command not run.
- State why it was skipped.
- State the residual risk.
