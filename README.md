# PhotoPrune

## Project Summary

**What PhotoPrune does:** PhotoPrune is a validation MVP that helps users **review potential duplicate and near-duplicate photos** selected via the Google Photos Picker. It groups likely matches, labels confidence, and guides a cautious, review-only workflow.

**What PhotoPrune does NOT do (Phase 2):** It does **not** scan full libraries, **does not** delete photos automatically, and **does not** use embeddings or semantic similarity in the MVP.

## Phase 2 MVP Constraints (Locked)

- **Picker API only** (user-selected items; no library-wide scan).
- **Configurable max photos per run** (cost guardrail).
- **Review-only** results (no deletion or bulk destructive actions).
- **Single-session usage** (no background sync, no multi-session accounts).

> Phase 2 is a **validation MVP**. Accuracy perfection is **not** the goal; trust and predictability are.

## Trust & Safety

- Review-first workflow; users must make the final decision.
- Clear confidence labels and known limitations are shown to users.
- Cost guardrails prevent unexpected usage spikes.

## Phase 2.2 Functional UX (Current)

Phase 2.2 delivers a **single-session, review-only** web flow:

1. **Start** (`/`) — expectations + “Select photos” CTA
2. **Run** (`/run`) — confirm selection, start analysis, monitor progress + cost, cancel if needed
3. **Results** (`/results`) — review duplicate groups, expand groups, and open items in Google Photos

The UI consumes a Phase 2.2 envelope schema (version `2.2.0`) and uses a local fixture
(`apps/web/fixtures/phase2_2_sample_results.json`) via an in-memory adapter to simulate
engine output until Phase 2.1 is fully wired.

Phase 2.2 runs Next.js images in unoptimized mode to avoid remote host restrictions during
MVP validation; revisit this in Phase 2.3 when the image pipeline is stabilized.

## Tech stack (current)

- **Frontend:** Next.js + React + TypeScript
- **Backend API:** Python + FastAPI
- **Worker:** Celery (Redis broker)
- **Queue/Broker:** Redis
- **Database:** PostgreSQL
- **Validation:** Zod (shared types)
- **Monorepo:** Turborepo + pnpm workspaces
- **CI:** GitHub Actions
- **Testing:** Vitest (FE), pytest (API/worker)
- **Lint/Format/Typecheck:** ESLint/Prettier, Ruff/Black, MyPy

## Core Engine (Phase 2.1)

The core engine lives in the FastAPI service and produces deterministic group cards for:

- **Exact duplicates** (byte-identical SHA-256 hashes)
- **Near duplicates** (dHash/pHash similarity with fixed thresholds)

The engine performs metadata-based candidate narrowing, downloads bytes on demand with per-run
caching, and returns a structured `ScanResult` payload that maps 1:1 to the results UI model.
It also emits timing/count metrics and a cost estimate per run.

### Minimal scan endpoint

`POST /api/scan` accepts either normalized `photoItems` or a raw `pickerPayload`:

```json
{
  "photoItems": [
    {
      "id": "abc123",
      "createTime": "2024-01-01T12:00:00Z",
      "filename": "IMG_0001.jpg",
      "mimeType": "image/jpeg",
      "width": 4032,
      "height": 3024,
      "downloadUrl": "https://photos.google.com/lr/...",
      "googlePhotosDeepLink": "https://photos.google.com/photo/..."
    }
  ],
  "consentConfirmed": false
}
```

For Picker payloads, the engine normalizes `mediaItems` with metadata under either top-level
fields or `mediaFile.*`. No photo bytes or URLs are persisted. Google Photos deep links are
propagated when provided (`googlePhotosDeepLink` or picker `productUrl`) and otherwise
fall back to a conservative Google Photos search link by item id to support manual review.

## Repo Structure

- `apps/web` — Next.js app with the Phase 2.2 flow (`/`, `/run`, `/results`) plus a `/health` check
- `apps/web/fixtures` — Phase 2.2 sample envelope data for the async run simulation
- `apps/api` — FastAPI service exposing `/healthz` and loading settings from env
- `apps/worker` — Celery worker with a demo `ping` task
- `packages/shared` — Shared Zod schemas/types (e.g., health payload)
- `infra/docker` — Dockerfiles used by local Docker Compose services
- `docs` — Architecture and contributing guides
- `.github/workflows` — CI pipelines and checks

## Local Development

Prereqs: Node.js 20+, pnpm (via Corepack), Python 3.12+, and `uv`.

1. Copy `.env.example` to `.env` and adjust if needed.
2. Install dependencies and toolchains:
   ```bash
   make setup
   ```
3. Common tasks:
   ```bash
   make dev       # docker compose up web/api/worker + services
   make lint      # lint JS/TS (pnpm) + Ruff
   make format    # apply Prettier + Black
   make format-check  # formatting check only
   make typecheck # TypeScript + MyPy
   make test      # Vitest + pytest (with coverage)
   make build     # Turbo builds + Python bytecode compile
   make hooks     # install git hooks via lefthook
   ```
4. Web tests only run from `apps/web/tests` (excluding `.next`) to avoid picking up compiled artifacts.
5. Web tests only run from `apps/web/tests` (excluding `.next`) to avoid picking up compiled artifacts.
6. If you regenerate lockfiles (e.g., after dependency changes), commit the updated `pnpm-lock.yaml` and requirement locks so CI stays reproducible.

### Picker harness (fixture extraction)

Use `tools/picker-harness.html` to run the Google Photos Picker flow locally and export fixture JSON for tests/UI mocks.

1. Serve the `tools/` directory over localhost (GIS requires `http://localhost` / `http://127.0.0.1`, not `file://`):
   ```bash
   py -m http.server --directory tools 42813
   ```
2. Open `http://localhost:8001/picker-harness.html`.
3. Use a **Web application** OAuth client and ensure the **Authorized JavaScript origin** matches the page’s origin (shown at the top of the page).
4. Click **Authorize**, then **Open Picker**, select items, and wait for polling to finish.
5. Copy or download the JSON payload, then save it as a fixture (for example, in `apps/web/fixtures/`).

The harness prints the payload to the page and `console.log()` and intentionally excludes access tokens.

### CI notes

CI runs the same Makefile targets listed above (`make lint`, `make format-check`, `make typecheck`, `make test`, `make build`) to keep checks consistent between local and GitHub Actions.

### Agent skill: `fix:ci`

For local CI parity checks with safe auto-fixes, use the PhotoPrune agent skill:

```bash
node skills/agent-fix-ci/agent-fix-ci.mjs
```

This reads `.github/workflows/ci.yml` to stay aligned with CI. It will auto-apply safe fixes (formatting) and re-run a step until it passes or a guardrail/manual failure stops the loop.

To emit a Codex repair capsule for non-fixable failures:

```bash
node skills/agent-fix-ci/agent-fix-ci.mjs --codex
```

You can also run the shortcut:

```bash
make agent-fix-ci
```

To pass flags through Make, append them after the target:

```bash
make agent-fix-ci -- --codex
```

Future agent skills follow the same Makefile convention:

```bash
make agent-<name>
```

### API configuration (scan guardrails)

```
ENVIRONMENT=local
SCAN_MAX_PHOTOS=250
SCAN_CONSENT_THRESHOLD=200
SCAN_ALLOWED_DOWNLOAD_HOSTS=photos.google.com,lh3.googleusercontent.com,googleusercontent.com
SCAN_DHASH_THRESHOLD_VERY=5
SCAN_DHASH_THRESHOLD_POSSIBLE=10
SCAN_PHASH_THRESHOLD_VERY=6
SCAN_PHASH_THRESHOLD_POSSIBLE=12
SCAN_COST_PER_DOWNLOAD=0.0002
SCAN_COST_PER_BYTE_HASH=0.00005
SCAN_COST_PER_PERCEPTUAL_HASH=0.00008
SCAN_COST_PER_COMPARISON=0.00001
SCAN_SMALL_INPUT_FALLBACK_MAX=20
SCAN_EXPLAIN=0
```

In `local` or `dev`, guardrails only log warnings. In `prod`, limits are enforced. Download
`SCAN_ALLOWED_DOWNLOAD_HOSTS` accepts a JSON array (e.g. `["lh3.googleusercontent.com"]`),
a comma-delimited string, or an empty/unset value to disable the allowlist locally. Only
exact hostnames are allowed. To accept Google Photos media hosts like `lh4.googleusercontent.com`,
include `googleusercontent.com` or `.googleusercontent.com` in the allowlist, which enables
only `lh<N>.googleusercontent.com` (not arbitrary subdomains). URLs are rejected if they
resolve to non-global addresses to mitigate SSRF risk. Fixtures must not obfuscate hostnames;
if they do, add the real hostnames to the allowlist in local/dev.

For small scans where metadata narrowing yields zero candidates, the engine optionally
falls back to a lightweight near-duplicate pass across the full selection when
`SCAN_SMALL_INPUT_FALLBACK_MAX` is set (defaults to 20). For diagnostics, set `SCAN_EXPLAIN=1`
or send `X-Scan-Explain: 1` in local/dev to include extra candidate narrowing counters and a
debug block (ids/counts only; no URLs) in the scan response.

For local/dev fixture runs with obfuscated hosts, you can rewrite hostnames before validation
and download with `SCAN_DOWNLOAD_HOST_OVERRIDES` (JSON map or `source:dest` CSV). This is
ignored in `prod`. If an override is present in local/dev, the host allowlist and
private-address checks are bypassed for that overridden host to support local fixture
servers. Example:

```
SCAN_DOWNLOAD_HOST_OVERRIDES=example.test:http://127.0.0.1:8001
```

### Fixture Hygiene (Local Dev)

Do not commit live or expiring `downloadUrl` values in fixtures. Keep fixture payloads
sanitized and prefer local bytes for repeatable runs.

Recommended `.gitignore` additions for local-only fixtures:

```
tests/fixtures/picker/*
tests/fixtures/requests/*
tests/fixtures/results/*
```

## Out of Scope (Phase 2)

- Library-wide scanning (Library API enumeration)
- Automatic deletion or bulk destructive actions
- Embedding/semantic similarity in the MVP
- Multi-session accounts, background sync, or persistent indexing
- Pricing plans, billing systems, or free-tier enforcement
- Hosted production deployment guarantees

## Notes

- No secrets are committed. Use `.env.example` as a template and provide values locally.
- CI enforces linting, formatting, type checking, tests, coverage (>=80%), doc guard, and audits.
- The checked-in `pnpm-lock.yaml` is a placeholder due to offline bootstrapping; regenerate with `pnpm install` when network access is available and commit the result.

## Reports (Phase 1b)

Generate a static HTML report from Phase 1b artifacts (developer-facing only). This is also
automatically generated after a successful Phase 1b similarity probe.

```bash
pnpm report:phase1b -- \
  --run /mnt/data/2026-01-11T13-24-14-332Z-test-run.json \
  --items /mnt/data/2026-01-11T13-24-14-332Z-test-items.ndjson \
  --similarity /mnt/data/2026-01-11T13-24-14-332Z-test-similarity.ndjson \
  --out experiments/phase1b/reports \
  --threshold 70 \
  --topPairs 100
```

By default the report generator downloads thumbnails when `PHASE1B_REPORT_ACCESS_TOKEN`
is available. To explicitly cache images for offline viewing:

```bash
PHASE1B_REPORT_ACCESS_TOKEN=... pnpm report:phase1b -- \
  --run /mnt/data/2026-01-11T13-24-14-332Z-test-run.json \
  --items /mnt/data/2026-01-11T13-24-14-332Z-test-items.ndjson \
  --similarity /mnt/data/2026-01-11T13-24-14-332Z-test-similarity.ndjson \
  --out experiments/phase1b/reports \
  --topPairs 100
```

To skip caching and use remote `baseUrl` images only:

```bash
pnpm report:phase1b -- \
  --run /mnt/data/2026-01-11T13-24-14-332Z-test-run.json \
  --items /mnt/data/2026-01-11T13-24-14-332Z-test-items.ndjson \
  --similarity /mnt/data/2026-01-11T13-24-14-332Z-test-similarity.ndjson \
  --out experiments/phase1b/reports \
  --noDownloadImages
```

Open the report at:

```bash
open experiments/phase1b/reports/2026-01-11T13-24-14-332Z-test/report/index.html
```

Note: images use remote `baseUrl` links and may require a valid auth session in the browser.
