# PhotoPrune

PhotoPrune helps people review duplicate or near-duplicate photos selected from Google Photos.

It is a **trust-first, review-only** product:
- it groups similar photos for review
- it recommends likely keeper images
- it never deletes photos automatically

## Current Product Status

PhotoPrune has completed its Phase 3 picker-scoped recurring workflow:
- projects can be reopened over time
- each project stores explicit picker scope metadata
- projects can hold multiple saved scans
- scan history and saved scan snapshots remain available
- latest scans are compared with the previous scan
- new, changed, and previously reviewed unchanged groups are surfaced for review
- unchanged reviewed groups keep their done state

The Phase 2 trust-first review foundation remains locked:
- review UX stays calm and group-based
- confidence shown only as `High`, `Medium`, or `Low`
- plain-English guidance for manual review actions
- no hidden destructive behavior

Real read-only album/set ingestion is not implemented yet. A scoped source adapter is in place so future album/set support can plug in without adding write scopes or whole-library enumeration.

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
- write-scope Google Photos actions

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
