# MVP Progress Ledger

This ledger is the durable product truth for MVP readiness. Update it when work is accepted, rejected, or discovered.

## Current readiness status

- **MVP readiness: Not yet verified.** MVP-ready means every product, trust, automated-verification, and real-account demonstration gate in `docs/product/MVP_EXIT_CRITERIA.md` has passed with evidence recorded in `docs/delivery/ITERATION_LOG.md`.
- **Technical milestone status:** Phase 2 and Phase 3 components are implemented and documented, but technical milestone delivery is not MVP-readiness evidence.
- **Final real-account demonstration gate:** PP-023 is `Blocked` until PP-027, PP-006, and PP-020 pass; PP-020 includes PP-016 automated coverage. It also requires a product-owner-controlled real account, interactive Chrome, and suitable real content.
- **Separate lifecycle gate:** PP-015 owns truthful timeout, partial-result, retry, cancellation, and persistence behavior required by the exit criteria.

## Completed / accepted product truths

- PhotoPrune is a trust-first, review-only product for duplicate and near-duplicate photo groups from read-only Google Photos content.
- The MVP user is the product owner using a personal Google Photos library to cull photos, regain space, and discover the value proposition for future users.
- The MVP promise is to offer an easy way for users to group and review similar and duplicate photos so they can reduce their photos and save money.
- The review unit is the group, not a raw photo pair.
- Confidence may be shown only as `High`, `Medium`, or `Low`.
- Users must always stay in control; PhotoPrune does not automatically delete photos.
- MVP scope is authenticated read-only Google Photos access for Picker-selected photos from the product owner's real library through the Google Photos Picker API session/media-items flow.
- Full-library scanning is out of scope for MVP.
- MVP must be practically usable against real live Google Photos content selected through the Picker, not only fake or sample datasets.
- Project history is nice to have, not a show-stopper for MVP.
- MVP persistence is session based only: store what is needed to complete the current scan, preserve current-session selections after timeout where possible, and restart after browser close if needed.
- Settings/Profile should show only required MVP account settings and account details.
- Manual cleanup happens outside PhotoPrune through links or references that open the exact selected photo in Google Photos.
- MVP is free for the product owner's use; pricing, limits, freemium policy, and billing UI are deferred until adding users.
- Phase 2 trust-first review foundation is locked.
- Product copy should be calm, plain-English, and avoid hypey AI framing.
- Numeric similarity percentages are an open product-policy decision. The product owner sees them as potentially important for decision-making, but current guardrails require a dedicated resolution task before implementation.

## Implemented / accepted technical milestones

- Phase 3 records reopenable projects, explicit picker scope metadata, multiple saved scans, scan history/snapshots, scan diffs, and preserved done state for unchanged reviewed groups as implemented technical components.
- Phase 3 records scoped ingestion components, including retryable album/set ingestion and resumable page checkpoints. These are not evidence for arbitrary existing-album access or MVP readiness.
- Read-only album/set ingestion exists through scoped source metadata without write scopes or automatic deletion claims.
- Root package metadata includes Playwright as a dev dependency.

## Known usability gaps

- Phase complete claims must be reconciled with actual demo usability.
- Real authenticated Google Photos login, Picker API session/media-items selection, scan, review, Google Photos link-out, and manual cleanup path must be verified end to end in Chrome.
- Arbitrary real user-library single-album and multiple-album source modes are not MVP pass evidence after PP-024. Official Google docs now limit Library API album/media listing and retrieval to app-created content after the 2025 broad-scope removal; Picker-selected media items remain the supported user-library path.
- Raw album ID inputs, backend source metadata, fixture/paged test data, app-created-data-only Library API reads, and code inspection are not sufficient MVP manual-demo evidence.
- The review UI must help identify identical and similar photos with understandable reasons.

## Known verification gaps

- Playwright MVP smoke gate exists as `pnpm smoke:mvp`; it does not replace the real Google Photos manual demo.
- Manual MVP demo checklist exists; it still needs to be passed and recorded.
- PP-014 recorded a blocked result on 2026-07-02. Real Chrome/authenticated Google Photos MVP readiness is not proven.
- PP-022 recorded a blocked result on 2026-07-02. Real arbitrary user-library single/multiple album selection is not currently supported through documented read-only Google Photos APIs.
- PP-024 recorded the MVP source-scope decision on 2026-07-02: Picker-selected real Google Photos content through the Google Photos Picker API session/media-items flow is the required MVP source mode, replacing arbitrary single/multiple album source modes for launch evidence.
- Picker-selected photos need a real Chrome demo with a real Google account, real Google Photos content, and the supported Picker API session/list flow.
- Similarity percentage policy must be resolved before any numeric similarity UI is implemented.

## Discarded / out-of-scope items

- Automatic deletion.
- Hidden destructive actions.
- Similarity percentages, unless the explicit product-policy decision is resolved and trust docs/tests/copy rules are updated together.
- Write-scope Google Photos actions.
- Full-library scanning for MVP.
- Arbitrary real user-library single-album or multiple-album scanning as MVP pass evidence unless a later approved task documents a supported read-only Google Photos path.
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

## MVP readiness blockers

- P0 PP-027: Repair the real-photo scan input and Picker lifecycle.
- P0 PP-006: Make review actions, representative language, and trust copy truthful after PP-005 establishes readiness wording.
- P0 PP-016: Implement or verify exact-photo Google Photos link-out after PP-027 preserves the required Picker metadata.
- P0 PP-020: Replace the stale Picker smoke contract and add deterministic golden-path coverage after PP-006, PP-016, and PP-027.
- P0 PP-023: Run the real Chrome Picker-selected Google Photos demo after PP-027, PP-006, and PP-020; this demo validates PP-016's automated result rather than blocking PP-016 completion.
- P1 PP-015: Make run and project lifecycle behavior reliable and truthful after PP-027.
- Verification gate: Run and record the full CI gate and manual MVP demo required by `docs/product/MVP_EXIT_CRITERIA.md`.

## Other product-policy and documentation work

- P1 PP-013: Resolve the still-open numeric similarity evidence policy with an explicit product-owner decision.
- P1 PP-032: Rewrite architecture, privacy, terms, and risk truth, subject to the security and operations decisions it names.
- P1 PP-033: Enforce documentation and delivery-state consistency from this reconciled baseline.
