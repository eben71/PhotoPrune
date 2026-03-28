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
- Local stack: `make dev`
- Install git hooks: `make hooks`

## CI gates
The GitHub Actions workflow runs on PRs and `main` updates. It performs:
- Dependency installation (pnpm + uv)
- Lint (web + shared via ESLint, Python via Ruff)
- Format check (Prettier + Black)
- Type checking (TypeScript + MyPy)
- Tests with coverage (Vitest, pytest) and combined coverage gate (>=80% each surface)
- Builds (Next.js, shared package build, Python bytecode compile as a smoke test)
- Documentation guard (`scripts/check-docs.js`) ensuring README stays in sync with commands/structure
- Dependency audits (`pnpm audit --audit-level=high`, `pip-audit`)

If a gate is hard to run locally, document why and how it is validated.
