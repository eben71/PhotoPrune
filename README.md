# PhotoPrune

PhotoPrune helps people review duplicate or near-duplicate photos selected from Google Photos.

It is a **trust-first, review-only** product:
- it groups similar photos for review
- it recommends likely keeper images
- it never deletes photos automatically

## Current Product Status

PhotoPrune has completed its Phase 2 validation build and now has a stronger, trust-first UI foundation:
- redesigned review UX focused on calm, group-based decisions
- confidence shown only as `High`, `Medium`, or `Low`
- plain-English guidance for manual review actions
- no hidden destructive behavior

With the UI design now in a stable place, current roadmap work focuses on recurring workflows (projects, persistence, and scoped re-ingestion) while preserving strict trust and cost guardrails.

## Product Principles

PhotoPrune is designed around:
- user control over automation
- calm, plain-English guidance
- predictable review flows
- confidence bands only: `High`, `Medium`, `Low`
- group-based review, not raw similarity scoring

### Explicitly not supported
- automatic deletion
- similarity percentages in the UI
- library-wide scanning in the current product scope
- hidden destructive actions

---

## Local Development

```bash
make setup
make dev
make lint
make format-check
make typecheck
make test
node scripts/check-coverage.mjs
make build
pnpm check:docs
```

`make setup` installs the JavaScript workspace and Python service dependencies.

`make dev` starts the local development stack.

## Repo Structure

- `apps/web` - Next.js frontend for the review flow
- `apps/api` - FastAPI API for ingestion and grouping workflows
- `apps/worker` - Celery worker for async processing
- `packages/shared` - shared TypeScript contracts and utilities
- `infra/docker` - Dockerfiles and container build assets
- `docs` - project documentation and contribution guides
- `.github/workflows` - CI automation and repository checks

## Roadmap

See [ROADMAP.md](ROADMAP.md) for phased delivery status and next milestones.
