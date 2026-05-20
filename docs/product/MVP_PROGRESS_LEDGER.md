# MVP Progress Ledger

This ledger is the durable product truth for MVP readiness. Update it when work is accepted, rejected, or discovered.

## Completed / accepted product truths

- PhotoPrune is a trust-first, review-only product for duplicate and near-duplicate photo groups selected from Google Photos.
- The review unit is the group, not a raw photo pair or similarity score.
- Confidence may be shown only as `High`, `Medium`, or `Low`.
- Users must always stay in control; PhotoPrune does not automatically delete photos.
- The current scope is picker-selected and album/set-scoped ingestion, not full-library scanning.
- Phase 2 trust-first review foundation is locked.
- Product copy should be calm, plain-English, and avoid hypey AI framing.

## Completed / accepted technical milestones

- README states Phase 3 picker-scoped recurring workflow is complete: reopenable projects, explicit picker scope metadata, multiple saved scans, scan history/snapshots, scan diffs, and preserved done state for unchanged reviewed groups.
- ROADMAP marks Phase 3 recurring workflow and scoped ingestion complete, including retryable album/set ingestion and resumable page checkpoints.
- Read-only album/set ingestion exists through scoped source metadata without write scopes or automatic deletion claims.
- Root package metadata includes Playwright as a dev dependency.

## Known usability gaps

- Settings nav currently routes to `/` and must be fixed or made intentionally unavailable.
- Profile/account icon needs a clear decision: implement, disable, hide, or document out of MVP.
- Home visible affordances may imply unavailable settings/account behavior.
- Phase complete claims must be reconciled with actual demo usability.

## Known verification gaps

- Playwright MVP smoke gate needs to be confirmed or added.
- There is no obvious root MVP smoke/e2e script in `package.json`.
- Full repo verification must be run and recorded after the reset.
- Manual MVP demo checklist still needs to be created and passed.
- CI uses pnpm `9.12.2` while `package.json` declares pnpm `10.30.3`; this is recorded as PP-009 and should be aligned or explicitly documented.

## Discarded / out-of-scope items

- Automatic deletion.
- Hidden destructive actions.
- Similarity percentages.
- Write-scope Google Photos actions.
- Library-wide scanning in the current scope.
- Unsupported recovery/trash/recently-deleted flows.
- Hypey AI/marketing copy.
- Unsupported privacy/local-processing claims.
- Storage-reclaim or commit/finalize claims unless actually implemented safely.
- Full account/settings system unless explicitly brought into MVP scope.

## Open risks

- Roadmap completion may overstate current product usability.
- Visible UI affordances may create trust failures if they look clickable but do not work.
- Agents may continue to mark tasks complete without smoke-test or manual-demo evidence unless the delivery workflow is followed.
- Documentation may drift unless backlog and iteration log updates are required for implementation tasks.

## Next recommended P0/P1 tasks

- P0 PP-001: Verify/fix visible home navigation and profile/account affordances.
- P0 PP-002: Add or confirm MVP Playwright smoke test for the golden path.
- P0 PP-003: Run full repo verification gate and reconcile failures.
- P0 PP-004: Create manual MVP demo checklist.
- P1 PP-005: Reconcile Phase 3 “complete” roadmap status with actual MVP usability.
