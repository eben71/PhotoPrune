# MVP Progress Ledger

This ledger is the durable product truth for MVP readiness. Update it when work is accepted, rejected, or discovered.

## Completed / accepted product truths

- PhotoPrune is a trust-first, review-only product for duplicate and near-duplicate photo groups from read-only Google Photos content.
- The MVP user is the product owner using a personal Google Photos library to cull photos, regain space, and discover the value proposition for future users.
- The MVP promise is to offer an easy way for users to group and review similar and duplicate photos so they can reduce their photos and save money.
- The review unit is the group, not a raw photo pair.
- Confidence may be shown only as `High`, `Medium`, or `Low`.
- Users must always stay in control; PhotoPrune does not automatically delete photos.
- MVP scope is authenticated read-only Google Photos access for single albums, multiple albums, and picker-selected photos.
- Full-library scanning is out of scope for MVP.
- MVP must be practically usable against real live Google Photos album content, not only fake or sample datasets.
- Project history is nice to have, not a show-stopper for MVP.
- MVP persistence is session based only: store what is needed to complete the current scan, preserve current-session selections after timeout where possible, and restart after browser close if needed.
- Settings/Profile should show only required MVP account settings and account details.
- Manual cleanup happens outside PhotoPrune through links or references that open the exact selected photo in Google Photos.
- MVP is free for the product owner's use; pricing, limits, freemium policy, and billing UI are deferred until adding users.
- Phase 2 trust-first review foundation is locked.
- Product copy should be calm, plain-English, and avoid hypey AI framing.
- Numeric similarity percentages are an open product-policy decision. The product owner sees them as potentially important for decision-making, but current guardrails require a dedicated resolution task before implementation.

## Completed / accepted technical milestones

- README states Phase 3 picker-scoped recurring workflow is complete: reopenable projects, explicit picker scope metadata, multiple saved scans, scan history/snapshots, scan diffs, and preserved done state for unchanged reviewed groups.
- ROADMAP marks Phase 3 recurring workflow and scoped ingestion complete, including retryable album/set ingestion and resumable page checkpoints.
- Read-only album/set ingestion exists through scoped source metadata without write scopes or automatic deletion claims.
- Root package metadata includes Playwright as a dev dependency.

## Known usability gaps

- Settings nav currently routes to `/` and must be fixed so only required MVP settings are visible or unavailable items are hidden.
- Profile/account icon must expose only required MVP account details or be hidden until needed.
- Home visible affordances may imply unavailable settings/account behavior.
- Phase complete claims must be reconciled with actual demo usability.
- Real authenticated Google Photos login, album selection, scan, review, Google Photos link-out, and manual cleanup path must be verified end to end in Chrome.
- The review UI must help identify identical and similar photos with understandable reasons.

## Known verification gaps

- Playwright MVP smoke gate needs to be confirmed or added.
- There is no obvious root MVP smoke/e2e script in `package.json`.
- Full repo verification must be run and recorded after the reset.
- Manual MVP demo checklist still needs to be created, passed, and recorded.
- CI uses pnpm `9.12.2` while `package.json` declares pnpm `10.30.3`; this is recorded as PP-009 and should be aligned or explicitly documented.
- Similarity percentage policy must be resolved before any numeric similarity UI is implemented.

## Discarded / out-of-scope items

- Automatic deletion.
- Hidden destructive actions.
- Similarity percentages, unless the explicit product-policy decision is resolved and trust docs/tests/copy rules are updated together.
- Write-scope Google Photos actions.
- Full-library scanning for MVP.
- Unsupported recovery/trash/recently-deleted flows.
- Hypey AI/marketing copy.
- Unsupported privacy/local-processing claims.
- Storage-reclaim or commit/finalize claims unless actually implemented safely.
- Full account/settings system beyond required MVP account details and settings.

## Open risks

- Roadmap completion may overstate current product usability.
- Visible UI affordances may create trust failures if they look clickable but do not work.
- Agents may continue to mark tasks complete without smoke-test or manual-demo evidence unless the delivery workflow is followed.
- Documentation may drift unless backlog and iteration log updates are required for implementation tasks.

## Next recommended P0/P1 tasks

- P0 PP-001: Verify/fix visible home navigation and profile/account affordances.
- P0 PP-002: Add or confirm MVP Playwright smoke test for the golden path.
- P0 PP-003: Run full repo verification gate and reconcile failures.
- P0 PP-004: Create, pass, and record the manual MVP demo checklist.
- P1 PP-005: Reconcile Phase 3 “complete” roadmap status with actual MVP usability.
- P0 PP-013: Resolve numeric similarity evidence policy.
- P0 PP-014: Implement or verify the real authenticated Google Photos MVP flow.
- P0 PP-015: Implement or verify session-only scan persistence and timeout recovery.
- P0 PP-016: Implement or verify Google Photos exact-photo link-out for manual cleanup.
