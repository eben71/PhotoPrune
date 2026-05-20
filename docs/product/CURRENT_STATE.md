# Current State

This page summarizes repo evidence without assuming the app is MVP-usable.

## What README and ROADMAP say is complete

- README says Phase 3 picker-scoped recurring workflow is complete: projects can be reopened, store picker scope metadata, hold multiple saved scans, keep scan history/snapshots, compare latest scans with previous scans, surface new/changed/unchanged groups, and preserve done state for unchanged reviewed groups.
- README says the Phase 2 trust-first review foundation remains locked: calm group-based UX, confidence only as `High`, `Medium`, or `Low`, manual review guidance, and no hidden destructive behavior.
- README says read-only album/set ingestion is supported through scoped source metadata and resumable checkpoints, without write scopes, image-byte storage, or automatic deletion.
- ROADMAP marks Phase 3 recurring workflow and scoped ingestion complete, including retryable album/set ingestion, resumable page checkpoints, large-project rescan validation, and deterministic scan diffs.

## What still needs validation

- Whether the current app can be demoed end-to-end as an MVP without confusing visible actions.
- Whether Settings and Profile/Account affordances are working, hidden, disabled, or labelled as unavailable.
- Whether a root MVP Playwright smoke test exists and covers the golden path.
- Whether full CI and docs guard are green after the reset.
- Whether Phase 3 completion language matches actual product usability.

## Known UX symptoms from product owner

- Phase 3 is marked complete, but the app is still not solid/usable enough.
- Home screen Settings/Account affordances are confusing or broken.
- Agents have completed iterations without clear verified product progress.

## Current confidence in MVP usability

Not yet verified.

## Next step

Complete these reset artifacts, then run P0 usability work and the MVP smoke-test pass from `docs/delivery/TASK_BACKLOG.md`.
