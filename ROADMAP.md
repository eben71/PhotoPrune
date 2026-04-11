# PhotoPrune Roadmap

> Purpose: keep delivery focused on a trust-first, review-only product that helps users clean up duplicate and near-duplicate photos without automated deletion.

## Roadmap Snapshot (as of April 10, 2026)

### Completed Foundations

- Phase 0 - Repo + CI baseline: monorepo, quality gates, and core documentation are in place.
- Phase 1 / 1b - Feasibility gates: Google Photos feasibility validated; picker-based, user-selected ingestion established as the viable path.
- Phase 2 - Validation MVP:
  - Tiered matching pipeline and deterministic grouping shipped.
  - Single-session, review-only flow shipped.
  - Trust-first UI refresh completed and aligned to calm, plain-English guidance.
  - Confidence remains constrained to `High`, `Medium`, `Low`.

### Current Focus

Delivery focus is now on Phase 3 recurring workflows while preserving the locked Phase 2 trust and scope guardrails.

## Phase 3 - Recurring Workflow & Scoped Ingestion (In Progress)

### 3.1 Projects & Persistence

- [x] Introduce Projects that users can revisit.
- [x] Persist review state metadata across sessions without storing image bytes.
- [x] Resume project progress with clear scan history and saved review state.

### 3.2 Project-Based Review Flow

- [x] Create projects from the web app and route directly into saved scans.
- [x] Reuse the Phase 2 review shell and group UI for project-based results.
- [x] Reopen saved scans and continue review work later.
- [x] Persist per-group `DONE` state and keeper selection across sessions.

### 3.3 Manual Cleanup Guidance

- [x] Surface per-group keep choice and remove-candidate guidance.
- [x] Support copy-friendly checklists and CSV exports for saved scans.
- [x] Expose Google Photos deep links for manual action.
- [x] Keep actions manual-only with no write scopes and no automatic delete or archive behavior.

### 3.4 Scoped Ingestion (Read-Only)

- [ ] Add read-only album/set ingestion beyond the current picker flow.
- [ ] Persist richer derived fingerprints for cross-scan matching.
- [ ] Run incremental rescans that preserve prior decisions and surface only new or changed groups.
- [ ] Harden resumable behavior for rate limits and partial failures.

## Next Milestones

1. Complete scoped album/set ingestion without expanding into whole-library reads.
2. Improve cross-scan matching with richer persisted fingerprints and incremental scan logic.
3. Validate larger recurring cleanup projects for resume correctness and partial-failure handling.
4. Confirm recurring workflow outcomes before expanding beyond the current trust boundaries.

## Guardrails (Always On)

- No automatic deletion or hidden destructive actions.
- No similarity percentages in product UX.
- Confidence labels limited to `High` / `Medium` / `Low`.
- Group-based review remains the primary interaction model.
- No silent scope expansion beyond user-selected ingestion and manual action guidance.
