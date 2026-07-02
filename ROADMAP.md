# PhotoPrune Roadmap

> Purpose: keep delivery focused on a trust-first, review-only product that helps users clean up duplicate and near-duplicate photos without automated deletion.

## Roadmap Snapshot (as of May 9, 2026)

### Completed Foundations

- Phase 0 - Repo + CI baseline: monorepo, quality gates, and core documentation are in place.
- Phase 1 / 1b - Feasibility gates: Google Photos feasibility validated; picker-based, user-selected ingestion established as the viable path.
- Phase 2 - Validation MVP:
  - Tiered matching pipeline and deterministic grouping shipped.
  - Single-session, review-only flow shipped.
  - Trust-first UI refresh completed and aligned to calm, plain-English guidance.
  - Confidence remains constrained to `High`, `Medium`, `Low`.

### Current Focus

Phase 3 recurring workflows are complete for picker-selected and album/set-scoped projects, including retryable album/set ingestion, resumable page checkpoints, large-project rescan validation, and deterministic scan diffs.

PP-024 narrowed MVP pass evidence to real Picker-selected Google Photos content because current Google Photos APIs do not expose a supported read-only selection/fetch path for arbitrary existing user-library albums. Album/set-scoped project metadata remains a technical capability, not MVP album-source proof.

## Phase 3 - Recurring Workflow & Scoped Ingestion (Complete)

### 3.1 Projects & Persistence

- [x] Introduce Projects that users can revisit.
- [x] Persist review state metadata across sessions without storing image bytes.
- [x] Resume project progress with clear scan history and saved review state.
- [x] Store explicit project scope metadata for picker-selected sources.

### 3.2 Project-Based Review Flow

- [x] Create projects from the web app and route directly into saved scans.
- [x] Reuse the Phase 2 review shell and group UI for project-based results.
- [x] Reopen saved scans and continue review work later.
- [x] Persist per-group `DONE` state and keeper selection across sessions.
- [x] Run multiple scans in the same project without overwriting prior scan snapshots.
- [x] Compare a saved scan with the previous scan.
- [x] Surface `NEW`, `CHANGED`, and `UNCHANGED` groups in project results.
- [x] Preserve reviewed state for unchanged groups and keep changed groups requiring review.

### 3.3 Manual Cleanup Guidance

- [x] Surface per-group keep choice and remove-candidate guidance.
- [x] Support copy-friendly checklists and CSV/JSON exports for saved scans.
- [x] Expose Google Photos deep links for manual action.
- [x] Keep actions manual-only with no write scopes and no automatic delete or archive behavior.

### 3.4 Scoped Ingestion (Read-Only)

- [x] Add a scoped source abstraction with picker as the implemented source.
- [x] Scaffold `album_set` scope metadata without adding write scopes or whole-library reads.
- [x] Persist group fingerprints and scan membership snapshots for deterministic cross-scan diffing.
- [x] Run repeat scans that preserve prior decisions for unchanged groups and surface new or changed groups.
- [x] Add read-only album/set ingestion with persisted scope metadata and resumable page checkpoints.
- [x] Harden resumable behavior for rate limits and partial failures.

## Phase 3 Reliability Notes

- Album/set ingestion retries temporary Google Photos API failures such as rate limits, timeouts, and server errors with exponential backoff before pausing.
- Page checkpoints are persisted after each successful page fetch and when a retryable partial failure pauses ingestion, so reruns can resume from the last unfinished page without re-adding already-ingested project items.
- Large recurring album validation covers multi-page albums across repeat scans, including `NEW`, `CHANGED`, and `UNCHANGED` diff categories and preserved `DONE` state for unchanged groups.
- Operational limit: production scans still honor the configured per-run scan limit (`SCAN_MAX_PHOTOS`) and consent threshold. Very large albums should continue via resumable page checkpoints rather than expanding scope or requiring write access.
- Known edge case: intentionally chunked partial scans are saved as partial scan snapshots; scan diffs compare saved snapshots, while project item storage deduplicates repeated media IDs across resumes and rescans.

## Next Milestones

1. Improve cross-scan matching only where deterministic persisted fingerprints support it.
2. Confirm recurring workflow outcomes before expanding beyond the current trust boundaries.

## Guardrails (Always On)

- No automatic deletion or hidden destructive actions.
- No similarity percentages in product UX.
- Confidence labels limited to `High` / `Medium` / `Low`.
- Group-based review remains the primary interaction model.
- No silent scope expansion beyond user-selected ingestion and manual action guidance.
