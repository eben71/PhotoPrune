# PhotoPrune

PhotoPrune helps users review duplicate or near-duplicate photos selected from Google Photos.
It never deletes photos automatically.

## Local Development

```bash
make setup
make dev
```

## Quality Gates

Run before opening a PR:

```bash
make lint
make format
make typecheck
make test
make build
```

## Repo Structure

- `apps/web` — Next.js frontend
- `apps/api` — FastAPI API
- `apps/worker` — Celery worker
- `packages/shared` — shared TypeScript types/utilities
- `infra/docker` — Dockerfiles for local/containerized services
- `docs` — product, architecture, and trust-copy documentation
- `.github/workflows` — CI pipeline definitions

## Key Environment Variables

### Frontend (`apps/web`)

- `NEXT_PUBLIC_GOOGLE_API_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_SCAN_MAX_PHOTOS`
- `NEXT_PUBLIC_API_BASE_URL`

### API (`apps/api`)

- `PHOTO_PRUNE_DATABASE_URL`
- `PHOTO_PRUNE_SCAN_MAX_PHOTOS`
- `PHOTO_PRUNE_SCAN_CONSENT_THRESHOLD`
- `PHOTO_PRUNE_COST_SOFT_CAP_USD`
- `PHOTO_PRUNE_COST_HARD_CAP_USD`

Copy `.env.example` and provide local values. Do not commit secrets.

## Product Behavior

1. User selects photos via Google Photos Picker.
2. Selection is normalized and scanned for duplicate groups.
3. User reviews grouped results and cost telemetry.
4. No deletion calls are made by PhotoPrune.

## Documentation

- Architecture: `docs/ARCHITECTURE.md`
- Trust copy: `docs/trust-copy.md`
- Contribution workflow: `docs/CONTRIBUTING.md`
