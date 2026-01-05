# Phase 1 Feasibility Report — Google Photos Library API

## Scope
Phase 1 focuses on validating whether the Google Photos Library API can support full-library scans and repeated incremental scans for PhotoPrune.

## Quota Facts (Library API)
- Requests per project per day: **10,000**
- Media bytes from `baseUrl` per project per day: **75,000**
- Minimum requests per full scan = `ceil(total_items / 100)`

## Hypotheses (Pre-Run)

### Scan Time
- 10k items: **< 2 minutes**
- 50k items: **< 10 minutes** (target), **< 15 minutes** (acceptable ceiling for GO)

### Rate Limits
- 0 hard failures on a single 50k scan under normal conditions
- Retries/backoff should be rare; total wait time **< 60s** for GO

### Metadata Completeness
- 100%: `id`, `mimeType`, `baseUrl`
- 95%+: `creationTime`, `filename`
- Photo dimensions: 90%+ have width/height (videos may vary)
- Missing important fields:
  - <5% => GREEN
  - 5–20% => AMBER
  - >20% => RED

### URL Expiry
- `baseUrl` works at T+0 (near 100%)
- Expect short-lived; if it expires **<30 minutes**, treat as RED

## Run Results

### SMALL (1k items)
- Run artifact: `TBD`
- Requests per scan: `TBD`
- Scan time: `TBD`
- Rate limits/backoff: `TBD`
- Metadata completeness: `TBD`

### MEDIUM (10k items)
- Run artifact: `TBD`
- Requests per scan: `TBD`
- Scan time: `TBD`
- Rate limits/backoff: `TBD`
- Metadata completeness: `TBD`

### LARGE (50k items)
- Run artifact: `TBD`
- Requests per scan: `TBD`
- Scan time: `TBD`
- Rate limits/backoff: `TBD`
- Metadata completeness: `TBD`

## URL Expiry Checks
- T+0: `TBD`
- T+15m: `TBD`
- T+60m: `TBD`
- Refresh via `mediaItems.get`: `TBD`

## Incremental Scan Feasibility
- Baseline diff (full scan + local diff): `TBD`
- `mediaItems.search` date filter behavior: `TBD`

## OAuth Notes
- Re-auth flow: `TBD`
- Revoke flow: `TBD`

## Feasibility Verdict
- Verdict: **TBD (GO / ADAPT / STOP)**
- Quantitative thresholds met: `TBD`
- Adaptations required (if AMBER): `TBD`

