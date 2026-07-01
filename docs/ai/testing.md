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
- Dependency preflight: `pnpm dependency:preflight`

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
- Run `pnpm dependency:preflight` before expensive local verification when `package.json`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml` changes. It checks locked package publish times against the configured pnpm `minimumReleaseAge` policy and reports when too-new package versions become safe to refresh. If npm registry metadata is unavailable, treat that as a blocker and rerun after registry access is restored; protected CI must not bypass the release-age policy.
- Run `pnpm install` after intentional Node manifest changes once the release-age preflight allows the selected package versions. Keep `pnpm install --frozen-lockfile` for read-only verification; it should fail if the lockfile is stale. Dependabot's npm updates use a two-day cooldown in `.github/dependabot.yml` so routine update PRs avoid pnpm's 24-hour release-age window.
- Do not use `pnpm clean --lockfile` as a PhotoPrune maintenance command; the repo does not define that command. If pnpm lock drift appears, rerun `pnpm install` with the intended manifest changes and commit the resulting `pnpm-lock.yaml`.
- Run `make python-locks` after editing `apps/api/pyproject.toml` or `apps/worker/pyproject.toml` so `uv.lock`, `requirements.lock`, and `requirements-dev.lock` stay aligned.
- Run `make python-locks-upgrade` when intentionally refreshing Python dependencies to the latest allowed versions. A scheduled workflow runs this weekly before Dependabot and opens a PR if lock files change.
- CI runs the non-mutating, pin-preserving `make python-locks-check` before installing Python dependencies so stale Dependabot or manual dependency edits fail with a focused lock-file diff instead of later audit failures. That command first runs `scripts/check-python-lock-pins.py`, an offline exact-pin guard that verifies pinned `pyproject.toml` dependencies appear in `uv.lock` and `requirements-dev.lock`, then runs the full uv lock/compile check. CI also pins the `uv` version used for lock checks and refreshes to avoid lock metadata churn from tool output-format changes.
- Same-repository pull requests that change API or worker `pyproject.toml` files run a Python lock repair workflow. It runs `make python-locks` and pushes only lock-file repairs back to the PR branch when GitHub permissions allow it. Protected CI remains non-mutating and still runs `make python-locks-check`.
- Run `pnpm test:dependency-preflight` after changing dependency preflight scripts. The tests use fixtures for stale Python locks and too-new pnpm lock entries, so they do not depend on live package publication timing.

## When a check is skipped
- State the exact command not run.
- State why it was skipped.
- State the residual risk.
