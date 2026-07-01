# Contributing

## Working agreement
- Treat [AGENT_RULES.md](../AGENT_RULES.md) as the canonical engineering and product guardrail file.
- Treat [docs/ai/testing.md](ai/testing.md) as the canonical verification guide.
- Keep changes small, typed, testable, and aligned with the trust-first product scope.
- Update documentation whenever behavior, APIs, commands, configs, or workflows change.

## Setup
1. Copy `.env.example` to `.env` and adjust values for your environment.
2. Install toolchains and dependencies:
   ```bash
   make setup
   ```
   - JS/TS uses pnpm + Turborepo.
   - Python services use `uv` with pinned requirement files (`requirements-dev.lock`).
   - The initial `pnpm-lock.yaml` is a placeholder; regenerate it on first install and commit the updated lockfile.

## Development commands
- Lint: `make lint`
- Format (write): `make format`
- Format (check): `make format-check`
- Type check: `make typecheck`
- Tests (with coverage): `make test`
- Coverage gate: `node scripts/check-coverage.mjs`
- Build: `make build`
- Sync Python lock files after Python dependency edits: `make python-locks`
- Refresh Python lock files to latest allowed versions: `make python-locks-upgrade`
- Verify Python lock files are in sync with the service `pyproject.toml` files without modifying the working tree or upgrading committed pins: `make python-locks-check`
- Check Node lockfile package age against pnpm supply-chain policy: `pnpm dependency:preflight`
- Test dependency preflight scripts with deterministic fixtures: `pnpm test:dependency-preflight`
- Local stack: `make dev`
- Install git hooks: `make hooks`

## CI gates
The GitHub Actions workflow runs on PRs and `main` updates. It performs:
- Dependency installation (pnpm + uv)
- Python lock-file consistency (`make python-locks-check`, including the offline exact-pin guard in `scripts/check-python-lock-pins.py`)
- Lint (web + shared via ESLint, Python via Ruff)
- Format check (Prettier + Black)
- Type checking (TypeScript + MyPy)
- Tests with coverage (Vitest, pytest) and combined coverage gate (>=80% each surface)
- Builds (Next.js, shared package build, Python bytecode compile as a smoke test)
- Documentation guard (`scripts/check-docs.js`) ensuring README stays in sync with commands/structure
- Dependency audits (`pnpm audit --audit-level=high`, `pip-audit`)

A scheduled GitHub Actions workflow runs `make python-locks-upgrade` before the weekly Dependabot window and opens or updates a Python lock refresh PR when allowed versions change. CI pins the `uv` version used for lock checks and refreshes so lock metadata does not churn when a new `uv` release changes output formatting. This keeps transient audit fixes, such as patched tooling packages pulled in by `pip-audit`, from repeatedly breaking Dependabot PRs.
A same-repository pull request that changes `apps/api/pyproject.toml` or `apps/worker/pyproject.toml` also runs a Python lock repair workflow. When permissions allow, it runs `make python-locks` and pushes only synchronized lock files back to the PR branch. Protected CI remains non-mutating and continues to verify with `make python-locks-check`.

Node dependency updates keep pnpm's 24-hour `minimumReleaseAge` policy enabled in `pnpm-workspace.yaml`, and Dependabot waits two days before opening routine npm update PRs. `pnpm dependency:preflight` checks locked package publish times before the expensive CI gate. If a package is too new, wait until the reported safe-after time, then rerun `pnpm install` and commit the refreshed `pnpm-lock.yaml`. If registry metadata is unavailable, restore npm registry access and rerun the preflight. Do not use `pnpm clean --lockfile`; this repo does not define that as a maintenance command.
A scheduled cleanup workflow prunes completed GitHub Actions runs from closed or merged pull requests, including runs whose head branch is only recorded as a `refs/pull/<number>/head` ref or closed PR branch name, and deleted branches after a grace period, while keeping recent runs for active branches.

If a gate is hard to run locally, document why and how it is validated.
