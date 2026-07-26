---
title: "PP-006 Make review actions, representative language, and trust copy truthful"
type: "feature"
created: "2026-07-26"
status: "done"
baseline_commit: "ff21193dcf57b3c66287d75ccd5f52ba1b17b28f"
review_loop_iteration: 0
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/docs/trust-copy.md"
  - "{project-root}/docs/frontend-design-implementation-notes.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The review UI exposes session-only action buttons that do not save a decision, describes algorithm-selected examples as “recommended keepers,” and shows trust/legal/support labels or claims that are not backed by working destinations or current product behavior. These gaps make it unclear what PhotoPrune actually saves and what the user must do outside the app.

**Approach:** Remove unavailable session-only decision actions, describe algorithm-selected items consistently as “Representative,” retain and clarify the already-persisted project review controls, and remove unsupported or non-functional footer/support claims. Centralize trust-critical copy and add focused tests for ephemeral and persisted review modes.

## Boundaries & Constraints

**Always:** Keep the review group as the unit of action; use only High, Medium, or Low confidence; distinguish temporary session results from saved project reviews; preserve explicit manual cleanup guidance; use existing components, state, API contracts, and semantic tokens; record screenshots and delivery evidence.

**Ask First:** Any new persistence shape, backend contract, external legal/support destination, or evidence-backed keeper-selection policy.

**Never:** Add automatic or in-app deletion, Google Photos write scope, similarity percentages, recovery/trash flows, unsupported privacy/security/storage claims, new dependencies, or PP-016/PP-020 behavior beyond compatibility with their future work.

## I/O & Edge-Case Matrix

| Scenario             | Input / State                                 | Expected Output / Behavior                                                                                  | Error Handling                                                                          |
| -------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Ephemeral review     | Session results render a group                | Representative language and manual-review guidance render; unavailable decision controls are absent         | No claim that a decision was saved                                                      |
| Saved project review | Project group is unreviewed, snoozed, or done | Representative choice, skip, and done controls call the existing review endpoint and reflect saved state    | Failed save shows existing plain-English error and does not claim persistence succeeded |
| Navigation claims    | Home/review shell renders                     | Settings and Account remain working; non-functional Privacy, Terms, Security, and Support labels are absent | No placeholder destination is invented                                                  |
| Mode copy            | Session and project routes render             | Session copy says results are temporary; project copy says grouped results and review decisions are saved   | Copy does not claim permanent image storage or whole-library access                     |

</frozen-after-approval>

## Code Map

- `apps/web/app/components/GroupCard.tsx` — ephemeral group presentation and currently inert actions.
- `apps/web/app/components/GroupList.tsx` — review queue heading and keeper language.
- `apps/web/app/projects/[id]/results/page.tsx` — persisted project review choices and state transitions.
- `apps/web/app/components/ReviewShell.tsx` and `apps/web/app/page.tsx` — non-functional support/legal/security labels.
- `apps/web/app/copy/trustCopy.ts` — centralized session/project/representative trust language.
- `apps/web/tests/group-card.test.tsx`, `apps/web/tests/projects-phase3.test.tsx`, and route trust tests — focused behavior and copy coverage.
- `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` — completion status and delivery evidence.

## Tasks & Acceptance

**Execution:**

- [x] Update centralized copy and session group components to use Representative language and remove inert review-decision controls.
- [x] Update saved-project review copy/labels while preserving existing PATCH-backed representative selection, snooze, and done behavior.
- [x] Remove non-functional Privacy, Terms, Security, and Support labels and unsupported trust claims without inventing destinations.
- [x] Add focused tests covering ephemeral action absence, every persisted project review action/state, mode-specific copy, representative terminology, and forbidden claims.
- [x] Run trust UI review, web and full required gates, MVP smoke, desktop/mobile screenshots, and record exact evidence.

**Acceptance Criteria:**

- Given ephemeral results, when a group renders, then no visible control claims to save Keep Recommended, Mark Externally, or Skip For Now and the UI explains manual external review truthfully.
- Given a saved project group, when the user selects a representative, skips it, or marks it done, then the existing persisted review endpoint receives the truthful decision and the rendered state matches the response path.
- Given any affected review surface, when copy renders, then algorithm-selected examples are called Representative, not recommended keepers.
- Given session and project modes, when their guidance renders, then temporary session scope and saved-project scope are accurately distinguished.
- Given home and review navigation, when rendered, then Settings and Account work while non-functional legal, security, privacy, and support labels are absent.
- Given all changed surfaces, when scanned and tested, then no forbidden percentage, automatic-delete, recovery, write-scope, or unsupported security/storage claim is introduced.

## Verification

**Commands:**

- `pnpm --filter web test -- group-card.test.tsx projects-phase3.test.tsx trust-layer.test.tsx` — focused action and copy branches pass.
- `pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test` — trust UI review checks pass.
- `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, `make build`, `pnpm check:docs` — repository handoff gates pass.
- `pnpm smoke:mvp` — deterministic MVP path passes and captures updated artifacts.
- Targeted `rg` forbidden-claim scan plus desktop/mobile Playwright screenshots — affected UI is trust-safe and responsive.

## Suggested Review Order

**Persisted review truth**

- Starts with per-group optimistic persistence, isolation, rollback, and response normalization.
  [`page.tsx:198`](../../apps/web/app/projects/%5Bid%5D/results/page.tsx#L198)

- Separates algorithmic suggestions from explicit user-selected Representatives.
  [`page.tsx:508`](../../apps/web/app/projects/%5Bid%5D/results/page.tsx#L508)

- Normalizes valid server responses without trusting malformed payloads.
  [`page.tsx:780`](../../apps/web/app/projects/%5Bid%5D/results/page.tsx#L780)

**Ephemeral review and scope**

- Replaces inert decisions with explicit temporary-session guidance.
  [`GroupCard.tsx:181`](../../apps/web/app/components/GroupCard.tsx#L181)

- Centralizes Representative and selected-photo language across modes.
  [`trustCopy.ts:103`](../../apps/web/app/copy/trustCopy.ts#L103)

- Removes whole-library framing from the primary entry point.
  [`page.tsx:65`](../../apps/web/app/page.tsx#L65)

**Responsive trust UI**

- Anchors mobile navigation correctly and contains Representative badges.
  [`globals.css:397`](../../apps/web/app/globals.css#L397)

**Verification and evidence**

- Covers persisted selection, skip, done, rollback, and overlap prevention.
  [`projects-phase3.test.tsx:803`](../../apps/web/tests/projects-phase3.test.tsx#L803)

- Records exact gates, screenshots, smoke failure, and residual ownership.
  [`pp-006-evidence.md:1`](../../docs/delivery/artifacts/PP-006/pp-006-evidence.md#L1)
