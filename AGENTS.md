# AGENTS.md

Open [AGENT_RULES.md](AGENT_RULES.md) before making meaningful changes. It is the canonical policy layer. Open local `AGENTS.md` files as you move into subdirectories.

## Repo map

- `apps/web`: Next.js review UI. See [apps/web/AGENTS.md](apps/web/AGENTS.md) for frontend and copy rules.
- `apps/api`: FastAPI API.
- `apps/worker`: Celery worker.
- `packages/shared`: shared TypeScript contracts.
- `docs/ARCHITECTURE.md`: current service boundaries and runtime wiring.
- `docs/ai/testing.md`: verification matrix and command policy.
- `docs/ai/skills.md`: repo skill standard and template rules.
- `_bmad-output/project-context.md`: contains important project context and conventions

## Advisory task routing

- Before meaningful planning, implementation, configuration or documentation changes, or repository-wide analysis, run the gate in [docs/ai/TASK_ROUTING.md](docs/ai/TASK_ROUTING.md) once and print its compact `TASK ROUTING` block.
- Route before selecting a BMAD workflow or beginning Baton implementation. Reassess only when scope or newly discovered risk materially changes the original classification.
- The gate is advisory: never change the active model or reasoning level automatically, and never treat a stronger model as permission to override repository policy.

## Commands

- Setup: `make setup`
- Dev stack: `make dev`
- Lint: `make lint`
- Format check: `make format-check`
- Typecheck: `make typecheck`
- Tests: `make test`
- Coverage gate: `node scripts/check-coverage.mjs`
- Build: `make build`
- Docs guard: `pnpm check:docs`

## Critical constraints

- Stay inside the current product scope unless the task explicitly expands it.
- Do not add auto-delete flows, deletion recovery claims, or hidden destructive actions.
- Do not show similarity percentages. Confidence stays `High`, `Medium`, or `Low`.
- Keep the UX group-based, trust-first, and plain-English.
- Prefer small, isolated changes. Do not add dependencies unless the task clearly needs them.
- For implementation or story work, if the current branch is `main`, create and switch to a scoped `codex/<task-or-story-slug>` branch before editing files.
- When asked to audit, repair, standardize, or future-proof this repository's agent guidance or repo-local skills, use the `maintain-agent-system` skill.

## Verification

- Run the smallest relevant checks while iterating.
- Before handoff for substantial work, run the full repo checks from [docs/ai/testing.md](docs/ai/testing.md) unless blocked.
- If a required check cannot run, say exactly what was skipped and why.

## Done when

- Requested behavior is implemented and scoped correctly.
- Relevant tests were added or updated.
- Lint, format check, typecheck, tests, coverage, build, and docs guard are green, or any gap is explicitly called out.
- User-facing copy and UI still match the trust guardrails in [AGENT_RULES.md](AGENT_RULES.md).
