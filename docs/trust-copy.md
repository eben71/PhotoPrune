# Trust Copy Guidelines (Phase 2.3)

## Principles

- Use calm, precise language. Avoid hype, urgency, or marketing claims.
- State scope boundaries explicitly (what the app does and does not do).
- Be transparent about limitations and failure modes (cap reached, partial analysis, network interruption).
- Reassure safety in every critical state: no deletion and session-only behavior.
- Keep controls predictable: cancel/exit always explains discard behavior.

## Where strings live

- Primary trust copy is centralized in `apps/web/app/copy/trustCopy.ts`.
- Route-level UI consumes those strings from:
  - `apps/web/app/page.tsx` (landing)
  - `apps/web/app/run/page.tsx` (scan, cap, cancel, errors)
  - `apps/web/app/results/page.tsx` (results trust panels)
  - `apps/web/app/components/GroupList.tsx` and `GroupCard.tsx` (group and empty states)

## Safe update workflow

1. Update text in `trustCopy.ts` first.
2. Verify all affected states still render with existing logic (no backend changes required).
3. Update/add tests in `apps/web/tests` for required trust elements.
4. Run web tests and lint/type checks before commit.
5. If copy meaning changes, update `README.md` and `ROADMAP.md` in the same PR.
