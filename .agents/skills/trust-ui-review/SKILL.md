---
name: trust-ui-review
description: Use when a task changes user-facing review UI or copy in apps/web and must be checked against PhotoPrune trust, confidence-band, and destructive-action guardrails.
---
# trust-ui-review

## Use when
- Editing screens, components, copy, or states in `apps/web`.
- Reviewing a UI change for trust-first product regressions.

## Do not use when
- The task is backend-only, infra-only, or unrelated to user-facing review flows.
- The task is broad visual exploration with no repo change target.

## Inputs
- Files under `apps/web`
- `AGENT_RULES.md`
- `docs/trust-copy.md`
- `docs/frontend-design-implementation-note.md`

## Workflow
1. Confirm the change keeps the review group as the main unit of action.
2. Confirm confidence language stays `High`, `Medium`, or `Low` only.
3. Confirm destructive actions are explicit, separated, and never implied to run automatically.
4. Prefer shared components and tokens over page-local styling.
5. Run `pnpm --filter web lint`, `pnpm --filter web typecheck`, and `pnpm --filter web test`.
6. If the change alters shared behavior or release-facing UX, run the full repo gate from `docs/ai/testing.md`.

## Outputs
- Updated UI code and tests
- Any required copy or design-note updates

## Success criteria
- User-facing copy is plain English and matches repo trust rules.
- No similarity percentages or unsupported deletion/recovery claims were introduced.
- Relevant web checks pass.
