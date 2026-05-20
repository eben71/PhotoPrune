# MVP Exit Criteria

MVP exit requires evidence that the product is usable, safe, and aligned with the trust-first scope. Roadmap status alone is not sufficient.

## Exit gates

MVP is ready only when all gates below pass and the evidence is recorded in `docs/delivery/ITERATION_LOG.md`.

### Product usability

- Home screen loads without broken visible actions.
- Settings and Account/Profile either work or are intentionally unavailable with clear MVP-safe copy.
- User can start the primary scan/review flow.
- User can use sample/dev data or picker-backed data according to the current implementation.
- User can complete a review session without hidden persistence or destructive assumptions.
- Results render grouped duplicate/near-duplicate candidates.
- Manual cleanup guidance is clear.
- Known limitations are visible before they can surprise the user.

### Trust and safety

- Confidence bands are only `High`, `Medium`, or `Low`.
- No similarity percentages appear in UI or product copy.
- No automatic deletion is offered, implied, or hidden.
- No write-scope Google Photos actions are requested or implied.
- No unsupported recovery, trash, recently-deleted, deletion-safety, storage-reclaimed, privacy, or local-only claims appear.
- User remains in control of each group and any real-world cleanup action.

### Verification

- MVP Playwright smoke test passes for the golden path in `docs/testing/MVP_SMOKE_TEST_PLAN.md`.
- Full CI gate passes: lint, format check, typecheck, tests, coverage gate, build, docs guard, and audits where applicable.
- Manual MVP demo checklist passes and is recorded.
- Any known limitation is documented in `docs/product/MVP_PROGRESS_LEDGER.md` and has a follow-up task if it blocks launch.

## Known current status

- Phase 3 recurring/scoped workflow: documented as complete in `README.md` and `ROADMAP.md`, but requires product usability verification.
- Header Settings/Profile usability: needs verification/fix because current visible affordances appear confusing or incomplete.
- MVP smoke test gate: missing or incomplete until proven otherwise.
