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
- Verify Python lock files are in sync with the service `pyproject.toml` files without modifying the working tree: `make python-locks-check`
- Local stack: `make dev`
- Install git hooks: `make hooks`

## CI gates
The GitHub Actions workflow runs on PRs and `main` updates. It performs:
- Dependency installation (pnpm + uv)
- Python lock-file consistency (`make python-locks-check`)
- Lint (web + shared via ESLint, Python via Ruff)
- Format check (Prettier + Black)
- Type checking (TypeScript + MyPy)
- Tests with coverage (Vitest, pytest) and combined coverage gate (>=80% each surface)
- Builds (Next.js, shared package build, Python bytecode compile as a smoke test)
- Documentation guard (`scripts/check-docs.js`) ensuring README stays in sync with commands/structure
- Dependency audits (`pnpm audit --audit-level=high`, `pip-audit`)

A scheduled GitHub Actions workflow runs `make python-locks-upgrade` before the weekly Dependabot window and opens or updates a Python lock refresh PR when allowed versions change. CI pins the `uv` version used for lock checks and refreshes so lock metadata does not churn when a new `uv` release changes output formatting. This keeps transient audit fixes, such as patched tooling packages pulled in by `pip-audit`, from repeatedly breaking Dependabot PRs.
A scheduled cleanup workflow prunes completed GitHub Actions runs from closed or merged pull requests and deleted branches after a grace period, while keeping recent runs for active branches.

If a gate is hard to run locally, document why and how it is validated.
