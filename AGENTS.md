# AGENTS.md

## Purpose
This file tells coding agents how to work in the PhotoPrune repository.

Read this file first.
Then read `AGENT_RULES.md`.
If there is any conflict, `AGENT_RULES.md` wins.

---

## Project Context

PhotoPrune is a trust-first photo review product.

It helps users review duplicate or near-duplicate photos selected from Google Photos.
It does **not** automatically delete photos.
The UX unit is the **group**, not an individual similarity score.

Current repo architecture:
- `apps/web` — Next.js frontend
- `apps/api` — FastAPI API
- `apps/worker` — Celery worker
- `packages/shared` — shared TypeScript contracts/utilities

---

## Current Product Scope

Agents must stay inside the current validated product scope unless explicitly instructed otherwise.

In scope:
- Picker-based selected-photo ingestion
- Single-session review flow
- Grouped results
- Trust-first UX
- Confidence bands only: `High`, `Medium`, `Low`
- Review-only actions
- Cost and cap visibility
- UI polish and implementation hardening

Out of scope unless explicitly requested:
- Automatic deletion
- Background sync
- Multi-session persistence
- Library-wide scanning
- Embeddings/semantic search expansion
- Billing/pricing implementation
- New backend architecture

---

## Working Style

### 1. Prefer incremental changes
- Make small, isolated, reviewable changes.
- Reuse existing structure before adding new abstractions.
- Do not rewrite major sections unless clearly required.

### 2. Protect product truth
Never introduce UI, copy, or logic that suggests:
- auto-delete
- hidden destructive actions
- unsupported recovery flows
- percentage-based similarity
- exaggerated AI claims

### 3. Prioritise trust and clarity
Every user-facing change should support:
- calm UX
- plain English
- clear next actions
- obvious user control
- safe destructive-action handling

### 4. Match the approved design direction
The frontend should feel:
- premium
- calm
- spacious
- trustworthy
- photo-first

Avoid:
- generic SaaS dashboard styling
- neon AI visuals
- cluttered layouts
- hypey AI language

---

## Frontend Implementation Expectations

When working in `apps/web`, prefer this implementation layer:
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI primitives
- lucide-react
- class-variance-authority
- clsx
- tailwind-merge
- Framer Motion only for subtle transitions
- React Hook Form where needed
- Zod for validation
- TanStack Query where async client state is needed

### UI rules
- Build reusable components, not one-off pages.
- Use semantic tokens for colour, spacing, radius, and elevation.
- Keep photos visually primary.
- Keep confidence visualised only as:
  - High
  - Medium
  - Low
- Separate primary, secondary, and destructive actions clearly.
- Use restrained motion only.

---

## Copy Rules

Prefer plain English.

Good examples:
- “We found groups of very similar photos for you to review.”
- “Recommended photo”
- “High confidence”
- “You review each group before anything changes.”
- “Skip this group and come back later.”

Avoid:
- “98% match”
- “Digital Curator Engine”
- “Neural engine”
- “Deep scan”
- “Photos pruned”
- “Recover deleted items”
- “Recently deleted”

Do not claim:
- on-device analysis
- deletion recovery
- permanent action reversibility

unless those behaviours are actually implemented and verified.

---

## Engineering Rules

- Keep code typed, readable, and testable.
- Prefer composition over over-abstraction.
- Avoid dead code.
- Avoid speculative scaffolding.
- Preserve accessibility and responsive behaviour.
- Keep tests aligned with real product behaviour.

Before finishing substantial work:
- lint
- format check
- typecheck
- tests
- build

---

## Testing Expectations

Minimum expectation for meaningful UI changes:
- component render coverage
- confidence badge/band coverage
- safe/destructive action visibility checks
- key screen smoke tests

Where practical:
- add or update Playwright coverage for critical review flows

---

## File Change Discipline

When updating docs:
- keep README aligned with actual implementation
- keep ROADMAP aligned with actual scope
- keep trust language consistent across product and docs

When updating frontend:
- prefer shared components under a clear component structure
- avoid scattering ad hoc styles across pages
- centralise tokens and variants

---

## If You Are Unsure

If a proposed change creates uncertainty, choose the safer option:
- less scope
- less magic
- more clarity
- more explicit user control

Do not invent product capabilities to make the UI feel more complete.
