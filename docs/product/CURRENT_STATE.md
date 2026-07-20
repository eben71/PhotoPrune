# Current State

This page summarizes repo evidence without assuming the app is MVP-usable.

## What README and ROADMAP record as implemented

- README records implemented Phase 3 picker-scoped recurring-workflow components: projects can be reopened, store picker scope metadata, hold multiple saved scans, keep scan history/snapshots, compare latest scans with previous scans, surface new/changed/unchanged groups, and preserve done state for unchanged reviewed groups.
- README says the Phase 2 trust-first review foundation remains locked: calm group-based UX, confidence only as `High`, `Medium`, or `Low`, manual review guidance, and no hidden destructive behavior.
- README says scoped album/set project metadata and checkpointing exist for controlled ingestion paths, while PP-024 keeps the MVP source path on real Picker-selected Google Photos content.
- ROADMAP records the Phase 3 recurring-workflow and scoped-ingestion technical milestone, including retryable album/set ingestion, resumable page checkpoints, large-project rescan validation, and deterministic scan diffs; it does not treat that milestone as MVP-readiness evidence.

## MVP readiness blockers

- **PP-027 - real-photo input and Picker lifecycle (`Ready`):** Picker-selected real Google Photos items must reach the hashing engine with retrievable bytes and truthful metadata through a resilient authorization/session lifecycle.
- **PP-006 - review behavior and trust copy (`Ready`):** visible decisions, representative language, Settings/Profile affordances, and user-facing claims must be functional or honestly unavailable.
- **PP-016 - exact-photo link-out (`Ready`):** selected cleanup candidates need a supported exact-item link or reference that opens in a new tab, without an in-app delete action.
- **PP-020 - deterministic browser coverage (`Ready`):** `pnpm smoke:mvp` exists, but its retired Picker mock contract must be replaced and the gate must run in CI. Automated evidence cannot replace the real-account demo.
- **PP-015 - run and project lifecycle (`Ready`):** timeout, partial-result, retry, cancellation, and persistence behavior must be reliable and truthful.
- **PP-023 - real Chrome demonstration (`Blocked`):** after its prerequisites pass, a human must prove the Picker API session/media-items flow, scan, grouped review, and exact-link or honest unavailable behavior with a real account and real content.
- **Full verification gate:** lint, format check, typecheck, tests, coverage, build, docs guard, applicable audits, and the manual MVP demo must pass with recorded evidence.

PP-024 removed arbitrary single-album and multiple-album source modes from MVP
pass evidence because current Google Photos APIs do not expose a supported
read-only selection/fetch path for existing user-library albums. Numeric
similarity remains a separate product-policy decision owned by PP-013 and must
not appear unless that policy task updates the trust rules, tests, and copy
together.

## Known UX symptoms from product owner

- Phase 3 was previously presented as complete without a clear distinction between technical milestone delivery and demonstrated MVP usability.
- Home screen Settings/Account affordances are confusing or broken.
- Agents have completed iterations without clear verified product progress.

## Current confidence in MVP usability

**MVP readiness: Not yet verified.** Phase 2 and Phase 3 technical components
remain credited, but their implementation does not prove the supported real
Picker-to-review path or satisfy the exit gates.

## Next step

Treat `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md` as historical
product-owner input. Use `docs/product/MVP_EXIT_CRITERIA.md`,
`docs/product/MVP_PROGRESS_LEDGER.md`, and
`docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md` as the current
MVP source-scope truth. Complete the named blockers from
`docs/delivery/TASK_BACKLOG.md`, then run PP-023 and record the manual-demo
evidence before changing the readiness status.
