# PhotoPrune

PhotoPrune helps people review duplicate or near-duplicate photos selected from Google Photos.

It is a **trust-first, review-only** product:

- it groups similar photos for review
- it recommends likely keeper images
- it never deletes photos automatically

## Current Product Status

**MVP readiness: Not yet verified.** PhotoPrune has implemented and documented
Phase 3 picker-scoped recurring-workflow components, but technical milestone
delivery is not evidence that the product is MVP-ready:

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

PhotoPrune has scoped album/set project metadata and checkpointing for controlled
ingestion paths. That technical path is not MVP pass evidence for arbitrary
existing Google Photos albums after PP-024; the MVP source path is real
Picker-selected Google Photos content. The app still does not request write
scopes, store image bytes, or perform automatic deletion.

MVP readiness requires every product, trust, automated-verification, and
real-account demonstration gate in the
[MVP exit criteria](docs/product/MVP_EXIT_CRITERIA.md) to pass with recorded
evidence. The [MVP progress ledger](docs/product/MVP_PROGRESS_LEDGER.md) tracks
the current blockers. PP-023, the real Chrome demonstration with a real Google
account and real Picker-selected content, remains blocked by the documented
real-photo input (PP-027), review-truth (PP-006), exact-link (PP-016), and
deterministic browser-coverage (PP-020) prerequisites. PP-015 separately owns
the truthful run and project lifecycle required by the MVP exit criteria.

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

`make dev` starts the supported local development stack. Open
`http://127.0.0.1:3000`; the effective Compose configuration publishes only
that web port on IPv4 loopback. FastAPI, PostgreSQL, and Redis remain private
to the Compose network. Verify the merged topology with:

```bash
pnpm check:deployment-boundary
```

PhotoPrune currently has no application accounts, sessions, or authorization.
Project, scan, review, and export operations are unauthenticated and are safe
only inside the enforced single-operator boundary. Google Photos Picker OAuth
authorizes access to selected Google media; it is not a PhotoPrune login.
CORS is browser policy, not authentication. Do not expose this stack through a
LAN bind, reverse proxy, tunnel, port-forward, hosted runner, or remote Docker
ingress.

For explicit non-container development, bind both processes to loopback:

```bash
cd apps/api
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000

cd apps/web
pnpm exec next dev -H 127.0.0.1 -p 3000
```

The non-container web server may use
`PHOTOPRUNE_API_BASE_URL=http://127.0.0.1:8000`. The supported Compose gateway
uses `INTERNAL_API_BASE_URL=http://api:8000` and same-origin `/api/...` routes.
The gateway accepts only `localhost:3000` and `127.0.0.1:3000` and rejects
explicitly cross-site state-changing requests before reading or forwarding
their bodies. Private and loopback API forwarding URLs are allowlisted rather
than treated as arbitrary deployment configuration.
Use `docker compose exec` for private database, Redis, or API diagnostics; do
not republish their ports.

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
