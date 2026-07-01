---
project_name: "PhotoPrune"
user_name: "Eben"
date: "2026-06-28"
sections_completed: ["discovery", "technology_stack", "language_specific_rules", "framework_specific_rules", "testing_rules", "code_quality_style_rules", "development_workflow_rules", "critical_dont_miss_rules"]
existing_patterns_found: 18
status: "complete"
rule_count: 85
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Monorepo uses pnpm `11.9.0` and Turborepo `2.10.2`; workspace packages are `apps/*`, `packages/*`, and `docs`.
- TypeScript is `5.9.3` with strict mode, `moduleResolution: "bundler"`, `noEmit`, `isolatedModules`, and `allowJs: false`.
- Web app is Next.js `16.2.x`, React `19.2.x`, React DOM `19.2.x`, Tailwind CSS `4.3.x`, ESLint `9.39.x`, Prettier `3.8.x`, and Vitest `4.1.x` with jsdom.
- Shared package is `@photoprune/shared`; cross-service TypeScript contracts and Zod schemas belong there. Zod is `4.4.3`.
- API service is Python `>=3.11`, FastAPI `>=0.114.0`, Pydantic Settings `>=2.4.0`, Pillow `>=12.2.0`, and uv-managed lock files.
- Worker service is Python `>=3.11`, Celery `>=5.4.0`, Redis `>=5.0.8`, and uv-managed lock files.
- Python quality tools are pinned: ruff `0.15.20`, black `26.5.1`, mypy `1.20.2`, pytest `9.1.1`, pytest-cov `5.0.0`, pip-audit `2.10.1`.
- Local dev stack uses Docker Compose with PostgreSQL, Redis, web, API, and worker services.
- Do not add dependencies unless the current task clearly needs them; prefer existing stack, helpers, contracts, and design tokens.

## Critical Implementation Rules

### Language-Specific Rules

- Keep TypeScript strict-clean. Do not introduce `any`, implicit null handling, or unchecked object access when a Zod schema, discriminated union, or explicit type can model the data.
- Treat confidence as a product contract, not just presentation copy. TypeScript and Python models must use confidence bands only: `High`, `Medium`, `Low` in UI copy and existing enum-style values at internal boundaries. Do not add numeric confidence or similarity percentage fields unless product policy is explicitly changed.
- Put shared API/UI contracts in `packages/shared/src`; web code should import shared schemas/types instead of duplicating response shapes locally.
- Preserve Zod as the runtime boundary validator for cross-service contracts. When API response shape changes, update shared schemas, route adapters, and affected tests together.
- Use TypeScript module syntax consistently; package resolution is configured for bundler-style ESM.
- Web components in `apps/web/app` use explicit client boundaries. Add `'use client'` only when hooks, browser APIs, or client state require it.
- Keep trust copy centralized in `apps/web/app/copy/trustCopy.ts`; do not bury user-facing safety claims or confidence language in component-local strings.
- Python services use `from __future__ import annotations`, strict mypy, and first-party imports from `app`. Preserve typed function signatures and normalize untrusted or loosely typed data at module boundaries.
- Python formatting is black line length `100`; ruff enforces `E`, `F`, `I`, `B`, `W`, and `UP`. Keep imports sorted and avoid compatibility code for old Python versions.
- SQLite repository code serializes structured fields as JSON deliberately. When changing persisted shape, use additive/backfilled changes, preserve existing rows, and update repository tests together.

### Framework-Specific Rules

- Next.js App Router routes live under `apps/web/app`. Keep API proxy/adapter code in route handlers and shared backend helpers, not directly inside page components.
- Treat App Router route handlers as adapter boundaries. They may translate request/response shapes, but business logic belongs in shared helpers, backend services, or tested domain modules.
- Preserve `apps/web/app/api/_lib/backend.ts` for backend fetch behavior; do not reimplement base URL selection, error handling, or fetch plumbing independently in every route.
- Browser-facing API base URLs and server-side API base URLs are intentionally distinct: browser checks use `PHOTOPRUNE_API_BASE_URL`; server-side run execution prefers `INTERNAL_API_BASE_URL` and falls back to `PHOTOPRUNE_API_BASE_URL`.
- React UI should keep photos visually primary and review groups as the main unit. Do not redesign flows around individual file rows or raw similarity scores.
- Client state belongs in the existing `apps/web/app/state` patterns unless a task explicitly calls for a new persistence model.
- Use existing `apps/web/app/components` patterns before adding one-off components. Preserve keyboard access, visible focus states, responsive behavior, and reduced-motion support.
- Before changing web layout or visual treatment, read `apps/web/AGENTS.md`, `docs/trust-copy.md`, and `docs/frontend-design-implementation-notes.md`.
- Tailwind styling should use existing semantic tokens and CSS variables from the app. Avoid introducing unrelated palettes, decorative UI, or local style systems.
- FastAPI app construction goes through `create_app()` in `apps/api/app/main.py`; add routers through `app.api.routes` rather than creating parallel app entrypoints.
- API settings belong in `apps/api/app/core/config.py` via Pydantic Settings. Do not hardcode service URLs, CORS origins, database paths, or Redis configuration in routes.
- Celery worker changes should preserve the existing `apps/worker/app/celery_app.py` and `tasks.py` structure unless the task explicitly changes queue architecture.
- Route or service contract changes should update both route tests and shared contract/schema tests where applicable.
- Do not introduce backend persistence or architecture changes for UI-only tasks. `AGENT_RULES.md` explicitly forbids persistence/backend expansion unless required by the requested task.
- If framework behavior changes user-visible product behavior, update the relevant docs in the same change.

### Testing Rules

- Use the smallest relevant check while iterating, then run the full handoff gate for substantial work: `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, `make build`, and docs guard when applicable.
- Prefer service-local checks during iteration: web changes use `pnpm --filter web lint`, `pnpm --filter web typecheck`, and `pnpm --filter web test`; shared package changes use `pnpm --filter @photoprune/shared lint` and `pnpm --filter @photoprune/shared typecheck`.
- Web tests live in `apps/web/tests` and run through Vitest with jsdom and V8 coverage. Coverage threshold is `80` lines, but trust behavior assertions matter more than only satisfying line coverage.
- UI changes should test rendered behavior, confidence labels, trust copy, safe/destructive action visibility, route guards, accessible labels/focus behavior, and responsive or reduced-motion behavior where affected.
- Add or update tests that prevent unsupported product claims: no similarity percentages, no auto-delete implications, no hidden destructive actions, and no unsupported recovery/trash claims.
- Shared contract changes should verify the full path where applicable: `packages/shared` schemas/types, web route adapters, and API route/schema behavior.
- API tests live in `apps/api/tests` and run with pytest coverage. Add or update pytest coverage for route, repository, schema, ingestion, or engine behavior changes.
- Worker tests live in `apps/worker/tests`; Celery or task behavior changes need focused worker tests.
- Python checks are ruff, black `--check`, mypy strict, and pytest for the changed service. Use the repo `Makefile` targets for full gates.
- If Python dependency manifests or lock files change, run `make python-locks-check`; use `make python-locks` after editing Python dependency declarations.
- Run `pnpm check:docs` whenever commands, repo structure, workflow docs, or user-facing product behavior documentation changes.
- If a check is skipped, state the exact command, why it was skipped, and the residual risk.

### Code Quality & Style Rules

- Prefer small, isolated, reviewable changes. Do not refactor unrelated areas or change product scope while solving a narrow task.
- Use existing helpers, components, schemas, and repository patterns before adding new abstractions. Add an abstraction only when it removes real duplication, clarifies an existing boundary, or matches an established local pattern.
- Keep user-facing copy plain, calm, and trust-first. Follow `AGENT_RULES.md` and `docs/trust-copy.md` rather than inventing new safety language.
- For web UI, keep photos visually primary and avoid clutter. Separate primary, secondary, and destructive actions clearly.
- Treat PhotoPrune as an operational review UI, not a marketing site. Avoid oversized hero treatment, decorative gradients, unrelated illustration, hype copy, and ornamental UI that competes with photo review.
- Use semantic design tokens and existing CSS variables. Do not introduce a new local design system, unrelated palette, or decorative layout language.
- Do not show similarity percentages or numeric confidence in UI, copy, schemas, tests, logs intended for users, or exported review artifacts.
- Do not add automatic deletion, hidden destructive actions, recovery/trash claims, or write-scope Google Photos behavior unless explicitly scoped and documented.
- Centralize reusable copy in `apps/web/app/copy/trustCopy.ts`; centralize cross-service contracts in `packages/shared/src`.
- Keep code reviewable: avoid clever state coupling, broad rewrites, hidden side effects, and logic split across files without a clear boundary.
- Add comments only where they explain non-obvious domain or safety behavior. Avoid comments that restate the code.
- Do not edit or treat generated/cache artifacts as source, including `.next`, `coverage`, `node_modules`, `__pycache__`, `.pytest_cache`, `.turbo`, and `tsconfig.tsbuildinfo`.
- Keep docs aligned when commands, workflow, architecture, or product behavior changes.

### Development Workflow Rules

- Start delivery work from `docs/delivery/TASK_BACKLOG.md`; select one `Ready` task and keep implementation scoped to that task's acceptance criteria.
- Every task must have acceptance criteria before implementation. If acceptance criteria are missing or vague, clarify or create the criteria before changing code.
- Use one isolated branch or worktree per task where practical; keep branch/worktree scope mapped to the task ID.
- Every implementation task must update `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` with evidence before it can be considered done.
- Do not expand scope silently. Create follow-up backlog tasks for discovered gaps instead of folding them into the current task.
- Use role separation where practical: builder implements, verifier checks acceptance criteria and evidence, reviewer checks product usability and trust.
- A task is unfinished until verification evidence is recorded in the iteration log.
- Passing checks alone does not mean Done. Done requires acceptance criteria, tests/docs updates, backlog/log updates, skipped-check rationale, follow-up tasks, and residual risk to be handled.
- Follow WIP limits from `docs/delivery/WORKFLOW.md`: keep concurrent work low and avoid multiple P0 usability tasks unless clearly independent.
- For UI/main-flow changes, run or explicitly defer the MVP smoke path and capture screenshots when visible UI changes.
- Before marking MVP-related work done, check `docs/testing/VERIFICATION_CHECKLIST.md` and preserve the real Chrome/authenticated Google Photos demo path.
- Use repo docs as source of truth, not chat history or external issue trackers.
- Do not merge or hand off substantial work without recording skipped checks, blockers, residual risk, and follow-up tasks.

### Critical Don't-Miss Rules

- Never add automatic deletion, in-app deletion, hidden destructive actions, Google Photos write scopes, or cleanup actions that happen without explicit external user control.
- Never introduce similarity percentages or numeric confidence unless PP-013 or an equivalent product-policy task explicitly resolves the decision and updates trust docs, copy rules, UI, and tests together.
- Do not claim unsupported behavior: recovery/trash safety, storage reclaimed, full-library scanning, local-only processing, image storage/sharing guarantees, or deletion safety claims must match implemented behavior and docs.
- Passing tests is not enough if product truth is violated. For UI, copy, contracts, or export changes, explicitly check for forbidden similarity percentages, auto-delete implications, hidden destructive actions, and unsupported recovery/privacy/storage claims.
- Do not treat roadmap completion as product completion. MVP readiness requires recorded smoke/demo/verification evidence.
- Do not bypass the group-based review model. The UX unit is the similar-photo group, and a recommended photo is only a review aid, not an automatic decision.
- Do not request or imply broader Google Photos access than the current authenticated read-only album/picker scope.
- Do not hardcode secrets, Google credentials, base URLs, database paths, Redis URLs, or API tokens. Use existing settings/env patterns and documented config.
- Do not add persistence, backend architecture, scan history, or dependency changes for UI/copy tasks unless explicitly required. Follow the current task scope rather than extrapolating from roadmap or README language.
- Do not duplicate contract shapes across web/API/shared packages. Update shared schemas and route adapters together.
- Do not bury safety copy in isolated components; trust-critical copy belongs in centralized copy docs/modules and must be tested.
- Do not leave changed behavior undocumented when docs, smoke paths, or user-facing limitations are affected.
- This `project-context.md` is implementation guidance derived from canonical docs. If product policy changes, update canonical docs and tests first, then regenerate or update this context.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing code in this repository.
- Follow all rules exactly as documented; when in doubt, choose the more restrictive trust-first option.
- Treat canonical product and delivery docs as source of truth when policy or workflow changes.
- Update this file only after the canonical docs, tests, and implementation patterns change.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update it when the technology stack, workflow, or core implementation patterns change.
- Review periodically for outdated or redundant rules.
- Remove rules that become obvious from stable code structure.

Last Updated: 2026-06-28
