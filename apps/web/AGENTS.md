# AGENTS.md

This layer applies only inside `apps/web`.

## Open when needed

- [../../AGENT_RULES.md](../../AGENT_RULES.md) for product and copy guardrails.
- [../../docs/trust-copy.md](../../docs/trust-copy.md) when changing user-facing copy.
- [../../docs/frontend-design-implementation-note.md](../../docs/frontend-design-implementation-note.md) when changing layout or visual treatment.

## Local rules

- Keep photos visually primary and the review group as the main UX unit.
- Confidence UI and copy may only use `High`, `Medium`, or `Low`.
- Separate primary, secondary, and destructive actions clearly.
- Use shared components and tokens before adding page-local styling.
- Preserve responsive behavior, keyboard access, visible focus states, and reduced-motion support.

## Verification

- Run `pnpm --filter web lint`
- Run `pnpm --filter web typecheck`
- Run `pnpm --filter web test`
- If the change affects app-level flows, also run the repo checks from the root before handoff.
