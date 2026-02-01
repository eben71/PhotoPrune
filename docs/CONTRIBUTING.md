# Contributing

## Expectations (from AGENTS.md)
- Follow secure coding practices: no secrets or PII in code/logs; use environment variables.
- Keep code small, focused, and well-structured; avoid dead code and unresolved TODOs.
- Maintain repo-wide coverage **>= 80%** and add appropriate tests for changes.
- Update documentation whenever behavior, APIs, configs, or workflows change.
- Keep CI green: lint, format, type checks, tests, coverage, builds, and audits must pass.

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

## Agent skills
PhotoPrune ships a local-only helper skill for keeping CI checks green.

### `agent fix:ci`
- Runs the same checks defined in `.github/workflows/ci.yml`.
- Attempts safe auto-fixes (currently formatting via `make format` only).
- Stops on any non-fixable failure and explains why.

Run it from the repo root:

```bash
node skills/agent-fix-ci/agent-fix-ci.mjs
```

Or via pnpm:

```bash
pnpm agent:fix:ci
```

Or via Makefile:

```bash
make agent-fix-ci
```

Makefile agent convention (for future skills):

```bash
make agent-<name>
```
