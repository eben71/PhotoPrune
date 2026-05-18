# MVP Alignment Questionnaire

Product owner: complete `TBD` answers before declaring MVP exit.

## MVP user

- Inferred: People reviewing duplicate or near-duplicate photos selected from Google Photos.
- TBD: Primary persona, urgency, and expected technical comfort.

## MVP promise

- Inferred: PhotoPrune helps users review grouped duplicate/near-duplicate candidates and decide manually what to keep.
- TBD: Exact one-sentence launch promise.

## Primary workflow

- Inferred: Start from home, choose picker/dev/sample-backed data according to implementation, run scan, review grouped results, follow manual cleanup guidance.
- TBD: Required data path for demo and launch.

## Must-have screens

- Inferred: Home, scan/start, run/progress, results/review, manual guidance/limitations.
- TBD: Whether project history is must-have for MVP demo.

## Deliberately out-of-scope screens

- Inferred: Full account/settings system, recovery/trash/recently-deleted, full-library scanning, automatic deletion.
- TBD: Any additional screens to hide or label unavailable.

## Settings/account decision

- Inferred: Current Settings/Profile affordances need a clear MVP decision.
- TBD: Implement, disable, hide, or explicitly label unavailable.

## Demo path

- Inferred: Demo must prove a group-based review session without destructive assumptions.
- TBD: Exact seed data/account, browser, and script.

## Trust and safety claims

- Inferred: No auto-delete, no similarity percentages, no write-scope Google Photos actions, no unsupported recovery/deletion-safety/local-only/privacy/storage-reclaim claims.
- TBD: Approved concise trust message for launch.

## Google Photos scope

- Inferred: Picker-selected and album/set-scoped ingestion; no current full-library scanning or write scopes.
- TBD: Which scope is required for MVP demo.

## Data/persistence expectations

- Inferred: Phase 3 docs describe projects, saved scans, scan history, persisted review state, diffs, retries, and resumable checkpoints.
- TBD: What persistence must be user-visible and reliable for MVP.

## Manual cleanup guidance

- Inferred: Guidance must be clear, manual, and non-destructive.
- TBD: Exact cleanup instructions users should follow outside PhotoPrune.

## Pricing/freemium assumptions

- TBD: Pricing, limits, freemium policy, and whether any billing UI exists for MVP.

## Launch readiness

- Inferred: Requires MVP smoke, full CI, manual demo checklist, and resolved visible broken actions.
- TBD: Launch approval owner and required artifact package.

## Success criteria

- Inferred: User can complete a safe review session with grouped results and clear limitations.
- TBD: Quantitative or qualitative success threshold.

## Known frustrations

- Inferred: Phase 3 marked complete but app is not solid/usable enough; Settings/Account affordances are confusing or broken; agent iterations lacked verified product progress.
- TBD: Additional owner frustrations.

## Questions for agent team

- What exact MVP smoke command should become canonical?
- Should CI pnpm version align to `package.json` or be documented as intentional?
- Should Settings/Profile be hidden, disabled, or minimally implemented for MVP?
- Which Phase 3 claims can be demonstrated end-to-end today?
