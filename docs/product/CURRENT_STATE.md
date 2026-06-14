# Current State

This page summarizes repo evidence without assuming the app is MVP-usable.

## What README and ROADMAP say is complete

- README says Phase 3 picker-scoped recurring workflow is complete: projects can be reopened, store picker scope metadata, hold multiple saved scans, keep scan history/snapshots, compare latest scans with previous scans, surface new/changed/unchanged groups, and preserve done state for unchanged reviewed groups.
- README says the Phase 2 trust-first review foundation remains locked: calm group-based UX, confidence only as `High`, `Medium`, or `Low`, manual review guidance, and no hidden destructive behavior.
- README says read-only album/set ingestion is supported through scoped source metadata and resumable checkpoints, without write scopes, image-byte storage, or automatic deletion.
- ROADMAP marks Phase 3 recurring workflow and scoped ingestion complete, including retryable album/set ingestion, resumable page checkpoints, large-project rescan validation, and deterministic scan diffs.

## What still needs validation

- Whether the current app can be demoed end-to-end as an MVP against a real authenticated Google Photos account in Chrome.
- Whether the app can scan a single album, multiple albums, and picker-selected photos without full-library scope.
- Whether the review flow can identify identical and similar photos with understandable reasons.
- Whether selected photos can open as exact Google Photos links in a new tab for manual cleanup.
- Whether Settings and Profile/Account affordances show only required MVP account details and settings.
- Whether current-session selections survive an in-session timeout where technically possible.
- Whether a root MVP Playwright smoke test exists and covers the golden path.
- Whether full CI and docs guard are green after the reset.
- Whether Phase 3 completion language matches actual product usability.
- Whether numeric similarity percentages should remain prohibited or become an explicitly approved MVP decision-support feature.

## Known UX symptoms from product owner

- Phase 3 is marked complete, but the app is still not solid/usable enough.
- Home screen Settings/Account affordances are confusing or broken.
- Agents have completed iterations without clear verified product progress.

## Current confidence in MVP usability

Not yet verified.

## Next step

Use `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md` as the product-owner alignment source, then run P0 usability work and the MVP smoke/manual-demo gates from `docs/delivery/TASK_BACKLOG.md`.
