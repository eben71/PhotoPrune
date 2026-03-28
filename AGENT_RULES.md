# AGENT_RULES.md

## Mission
Implement PhotoPrune as a trust-first, production-quality photo review app.

Prioritise:
- clarity
- safety
- accessibility
- maintainability
- predictable behaviour

Do not prioritise cleverness over trust.

---

## Mandatory Guardrails
- Do not expand scope unless explicitly instructed.
- No automatic deletion flows.
- No persistence or backend architecture changes unless explicitly required for the requested task.
- Prefer small, isolated, reviewable changes.
- Keep tests passing before handoff.
- Do not add new dependencies unless they are part of the current stack or clearly justified by the task.

---

## Product Truths
- PhotoPrune helps users review duplicate or near-duplicate photo groups.
- The UX unit is the group.
- The app does not auto-delete photos.
- Confidence is displayed only as `High`, `Medium`, or `Low`.
- Users must always feel in control.

---

## Non-Negotiables
- Do not introduce similarity percentages.
- Do not add hypey or theatrical AI copy.
- Do not imply destructive actions happen automatically.
- Do not claim unsupported technical behaviour.
- Do not invent product scope that does not exist.
- Do not add recovery, trash, or recently-deleted flows unless they are explicitly implemented in scope.

---

## Approved Frontend Direction
Use or align to:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI primitives
- lucide-react
- class-variance-authority
- clsx
- tailwind-merge
- subtle motion only

---

## Implementation Rules
- Use semantic design tokens.
- Keep photos visually primary.
- Keep the UI calm and uncluttered.
- Separate primary, secondary, and destructive actions clearly.
- Use subtle motion only.
- Prefer reusable components over one-off styling.
- Preserve responsive behaviour and accessibility.
- Update docs when commands, workflow, or product behaviour changes.

---

## Copy Rules
Prefer plain English:
- "Recommended photo"
- "High confidence"
- "You review each group before anything changes."
- "Skip this group and come back later."

Avoid:
- "98% match"
- "Neural engine"
- "Digital curator engine"
- "Deep scan"
- "Photos pruned"
- "Recover deleted items"

---

## Verification Rules
Before finishing substantial work:
- run lint
- run format check
- run typecheck
- run tests
- run coverage gate
- run build
- run docs guard if commands, repo structure, or workflow docs changed
- confirm no percentage-based confidence remains
- confirm no unsupported deletion or recovery claims remain
- confirm scope has not expanded silently
