# PhotoPrune Roadmap

> Purpose: keep delivery focused on a trust-first, review-only product that helps users clean up duplicate and near-duplicate photos without automated deletion.

## Roadmap Snapshot (as of April 9, 2026)

### ✅ Completed Foundations

- **Phase 0 — Repo + CI baseline:** monorepo, quality gates, and core documentation are in place.
- **Phase 1 / 1b — Feasibility gates:** Google Photos feasibility validated; picker-based, user-selected ingestion established as the viable path.
- **Phase 2 — Validation MVP:**
  - Tiered matching pipeline and deterministic grouping shipped.
  - Single-session, review-only flow shipped.
  - Trust-first UI refresh completed and aligned to calm, plain-English guidance.
  - Confidence remains constrained to `High`, `Medium`, `Low`.

### 🔄 Current Focus

Now that UI design is in a stronger place, delivery focus moves to **Phase 3 recurring workflows** while preserving Phase 2 guardrails.

## Phase 3 — Recurring Workflow & Scoped Ingestion (In Progress)

### 3.1 Projects & Persistence

- ✅ Introduce Projects (cleanup campaigns) that users can revisit.
- ✅ Persist review state metadata across sessions (no image-byte storage).
- ✅ Resume campaign progress with clear state tracking.

### 3.2 Scoped Re-Ingestion (Read-Only)

- ✅ Add Google auth with read-only permissions.
- [ ] Fetch media only from user-selected albums/sets (no whole-library enumeration).
- [ ] Persist stable identifiers + derived fingerprints for better matching across sessions.
- [ ] Run incremental rescans that preserve prior decisions and surface only new/changed groups.
- [ ] Harden resumable behavior for rate limits and partial failures.

### 3.3 Manual Cleanup Guidance

- ✅ Per-group manual cleanup checklists.
- ✅ CSV/JSON exports and copy-friendly item lists.
- ✅ Deep links to Google Photos where available.
- ✅ Manual-only actions (no write scopes, no automatic delete/move/archive).

## Next Milestones

1. **Scoped ingestion completion:** finish album/set fetch + incremental rescan behavior.
2. **Project reliability pass:** verify resume correctness and partial-failure recovery on larger sets.
3. **Review throughput improvements:** improve speed and clarity for high-volume group triage without changing trust boundaries.
4. **Phase 3 validation gate:** confirm recurring workflow outcomes with real projects before expanding scope.

## Guardrails (Always On)

- No automatic deletion or hidden destructive actions.
- No similarity percentages in product UX.
- Confidence labels limited to `High` / `Medium` / `Low`.
- Group-based review remains the primary interaction model.
- No silent scope expansion beyond user-selected ingestion and manual action guidance.
