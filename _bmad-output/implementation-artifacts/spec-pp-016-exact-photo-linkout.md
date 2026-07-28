---
title: "PP-016 Implement honest exact-photo Google Photos link-out"
type: "feature"
created: "2026-07-27"
status: "in-review"
review_loop_iteration: 0
baseline_commit: "0b1921edf9668ebe2c9c763027c1dcf9278afa21"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/apps/web/AGENTS.md"
  - "{project-root}/docs/trust-copy.md"
  - "{project-root}/docs/delivery/TASK_BACKLOG.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Review cards label a control as opening the selected photo in Google Photos even when no Picker-provided exact URL exists. The current fallback opens the Google Photos homepage or a media-ID search, neither of which proves it locates the selected item.

**Approach:** Preserve and expose only a Picker-provided exact-item URL. When it is unavailable, disable the external-open action and present calm, clear manual-cleanup guidance without a fallback destination, deletion action, or unsupported claim.

## Boundaries & Constraints

**Always:** Keep review groups as the primary unit; open a verified exact Google Photos item in a new tab with `noopener,noreferrer`; use centralized, plain-English trust copy; keep Picker `productUrl` current-session-only where existing contracts require; add deterministic unit and Playwright coverage for exact and unavailable states; record only actual verification evidence.

**Ask First:** Any Google OAuth scope change; accepting a URL shape that is not supplied by the supported Picker response; persisting `productUrl` beyond the current scan; adding dependencies; adding a write/delete/recovery capability; or changing PP-023 real-account demo requirements.

**Never:** Generate a homepage, search-by-media-ID, filename-query, or other inferred link and describe it as exact; add in-app deletion, automatic cleanup, write scope, similarity percentages, or a recovery/trash claim.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Exact Picker URL | Selected item has a non-empty Picker `productUrl` | Enabled “Open in Google Photos” action opens precisely that URL in a new tab | No fallback UI is shown |
| Missing exact URL | Item URL is absent, empty, or only a generated fallback | No external-open navigation occurs; UI says the exact Google Photos link is unavailable and guides manual review | Control is disabled/unavailable and no query or URL is copied |
| Mixed group | Some candidate items have URLs and others do not | Each item independently presents its exact-open or unavailable state | Missing link on one item does not block a verified item |
| Saved-project result | Persisted project result has no verified exact URL | It remains unavailable rather than receiving a synthesized search URL | UI stays truthful across future review |

</frozen-after-approval>

## Code Map

- `apps/api/app/engine/deeplinks.py` — removes synthetic search fallback from the exact-link boundary.
- `apps/api/app/engine/normalizer.py` and `apps/api/app/api/routes.py` — forward only source-provided exact links into result items.
- `apps/api/app/projects/repository.py` — avoids constructing a search URL for saved-project review items.
- `apps/web/src/types/phase2Envelope.ts` — models exact link availability without a fallback destination/query.
- `apps/web/src/engine/engineAdapter.ts` — maps the direct current-session result consistently.
- `apps/web/app/copy/trustCopy.ts` and `apps/web/app/components/OpenInGooglePhotosButton.tsx` — centralize and render truthful exact/unavailable guidance.
- `apps/web/tests/open-in-google-photos-button.test.tsx`, `apps/api/tests/test_deeplinks.py`, and `tests/e2e/mvp-smoke.spec.ts` — cover API, accessible UI, new-tab, unavailable, and browser-path behavior.
- `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` — record completed acceptance criteria and actual verification evidence.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/app/engine/deeplinks.py`, `apps/api/app/engine/normalizer.py`, `apps/api/app/api/routes.py`, and `apps/api/app/projects/repository.py` — preserve only validated source URLs and remove generated search/homepage fallbacks — prevents an unproven destination from crossing the result boundary.
- [x] `apps/web/src/types/phase2Envelope.ts` and `apps/web/src/engine/engineAdapter.ts` — align the web envelope and current-session mapping with exact-or-unavailable link semantics — keeps direct and saved review flows consistent.
- [x] `apps/web/app/copy/trustCopy.ts` and `apps/web/app/components/OpenInGooglePhotosButton.tsx` — show an enabled exact-item action only when one exists; otherwise render accessible unavailable/manual-cleanup guidance — preserves trust and user control.
- [x] `apps/api/tests/test_deeplinks.py`, `apps/web/tests/open-in-google-photos-button.test.tsx`, and `tests/e2e/mvp-smoke.spec.ts` — cover source URL preservation, no synthesized fallback, new-tab opening, disabled unavailable UI, and the Picker-backed browser path — protects all acceptance criteria.
- [x] `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` — update status and append commands/results, review outcome, skipped checks, residual risk, and PP-023 dependency boundary after verification — provides delivery evidence.

**Acceptance Criteria:**
- Given a Picker-selected cleanup candidate with a supported exact Google Photos URL, when the user activates its external action, then that exact URL opens in a new tab with no in-app cleanup.
- Given a cleanup candidate without a supported exact Google Photos URL, when the user reviews it, then no homepage, search, media-ID reference, or inferred destination is offered as exact and the unavailable state is clear.
- Given a group containing both link states, when its items are expanded, then each item exposes only its own supported exact action or unavailable guidance.
- Given a direct or saved-project result, when it crosses backend and web result boundaries, then an absent exact URL stays absent rather than becoming a generated fallback.
- Given the changed UI, then confidence remains band-only, group-based review remains intact, and copy clearly states manual, external cleanup without delete, write scope, or recovery claims.

## Design Notes

Use the existing compact item-level control placement. An unavailable destination is an informational state, not an error: it must not masquerade as a disabled primary action, prompt users to copy an unverified query, or block review of other group items. Exact-link support is determined solely by the supported Picker `productUrl` already passed ephemerally by PP-027; this task does not claim real-account proof, which remains PP-023.

## Verification

**Commands:**
- `pnpm --filter web test -- open-in-google-photos-button.test.tsx` — exact and unavailable item controls pass.
- `pnpm --filter web lint` — web lint passes.
- `pnpm --filter web typecheck` — web types pass.
- `pnpm --filter web test` — web test suite passes.
- `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_deeplinks.py` — source-link/no-fallback API behavior passes.
- `pnpm smoke:mvp` — Picker-backed browser smoke proves the exact external action and retains trust constraints.
- `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, `make build`, `pnpm check:docs`, and `pnpm check:deployment-boundary` — full handoff gate passes.

**Manual checks:**
- Trust UI review: confirm group-based review, High/Medium/Low-only confidence, no automatic/destructive action, clear unavailable state, shared copy/tokens, keyboard access, and new-tab behavior.
