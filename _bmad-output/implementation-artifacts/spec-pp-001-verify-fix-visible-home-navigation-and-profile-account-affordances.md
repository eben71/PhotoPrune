---
title: 'PP-001 Verify/fix visible home navigation and profile/account affordances'
type: 'feature'
created: '2026-06-28'
status: 'done'
baseline_commit: '85e379102fb422bb346b57dcad95fb576da8f161'
context:
  - `AGENT_RULES.md`
  - `apps/web/AGENTS.md`
  - `docs/product/MVP_EXIT_CRITERIA.md`
  - `docs/testing/MVP_SMOKE_TEST_PLAN.md`
  - `docs/delivery/TASK_BACKLOG.md`
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The home header has visible account/settings affordances that do not meet MVP trust rules: `Settings` routes back to `/`, `History` is marked active on the home page, and the profile icon is visible without an accessible account destination or clear unavailable state.

**Approach:** Make the header affordances honest and MVP-scoped by giving settings/account visible, accessible destinations or clear unavailable states, while keeping non-required account/settings capabilities hidden or explicitly unavailable. Preserve the trust-first, no-delete, no-write-scope product boundaries and capture screenshot evidence for the home/header states.

## Boundaries & Constraints

**Always:** Keep scope to visible home/header account and settings behavior. Use plain-English copy. Show only required MVP account details/settings or clearly unavailable states. Preserve confidence label policy, no automatic deletion, no in-app delete, and no write-scope implications. Update backlog and iteration log with evidence.

**Ask First:** Creating a full account system, storing profile/account data, changing authentication architecture, adding dependencies, or expanding navigation beyond the PP-001 affordances requires human approval before implementation.

**Never:** Do not route Settings ambiguously to `/`. Do not imply paid plans, cloud storage, privacy guarantees, sharing behavior, recovery/trash flows, storage savings, write access, or automatic cleanup. Do not add hidden destructive actions.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Home header render | Visitor lands on `/` before connecting Google Photos | Header shows PhotoPrune home link, non-ambiguous Settings behavior, and profile/account affordance that exposes only MVP-required account status/details or a clear unavailable state | N/A |
| Settings navigation | User activates Settings from the home header | User is not sent back to `/`; settings surface is accessible or the affordance clearly communicates unavailable MVP scope | Avoid broken links and avoid unsupported settings categories |
| Account/profile affordance | User tabs to or clicks the profile/account affordance | Affordance has an accessible name and exposes only required MVP account status/details or a clear signed-out/unavailable state | Avoid blank icons, inaccessible controls, and unsupported account-management claims |
| Non-required settings/account item | User looks for billing, storage, sharing, deletion, recovery, or advanced account controls | These items are absent or clearly marked unavailable without implying implementation | Do not create dead links to unsupported pages |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/Header.tsx` -- Shared visible header; currently contains the ambiguous Settings link and inaccessible profile icon.
- `apps/web/app/page.tsx` -- Home page uses the shared header and primary Google Photos picker CTA.
- `apps/web/app/globals.css` -- Header/nav/profile styles and responsive behavior.
- `apps/web/tests/home.test.tsx` -- Existing home render and picker-routing tests; suitable for header affordance assertions.
- `docs/delivery/TASK_BACKLOG.md` -- PP-001 source of truth and status update target.
- `docs/delivery/ITERATION_LOG.md` -- Required delivery evidence log.
- `AGENTS.md` -- Repo instruction update target for future story-branch automation.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/components/Header.tsx` -- Fix nav/account affordances so Settings does not route to `/`, active state is honest, and profile/account behavior is accessible and MVP-scoped.
- [x] `apps/web/app/globals.css` -- Add or adjust minimal styles needed for any new header/settings/account state without introducing a new visual system.
- [x] `apps/web/tests/home.test.tsx` -- Add focused tests for visible header/settings/profile behavior and the non-ambiguous Settings destination/state.
- [x] `docs/delivery/TASK_BACKLOG.md` -- Move PP-001 out of Ready and record completion/verifying state.
- [x] `docs/delivery/ITERATION_LOG.md` -- Add PP-001 evidence, commands, screenshots, and residual risk.
- [x] `AGENTS.md` -- Keep the new branch-before-story-work instruction requested by the user.

**Acceptance Criteria:**
- Given the home page renders, when a user inspects the header, then Settings does not point to `/` and visible account/profile behavior is accessible.
- Given a user opens Settings or Account/Profile, when unsupported MVP items would otherwise appear, then those items are hidden or clearly unavailable without unsupported product claims.
- Given automated tests run, when the home/header assertions execute, then they prove the visible affordances are non-ambiguous and MVP-scoped.
- Given implementation is ready for handoff, when evidence is recorded, then backlog, iteration log, and screenshot artifacts identify the visible home/header state.

## Spec Change Log

## Verification

**Commands:**
- `pnpm --filter web test -- home.test.tsx` -- expected: home/header behavior tests pass.
- `pnpm --filter web lint` -- expected: frontend lint passes.
- `pnpm --filter web typecheck` -- expected: frontend typecheck passes.
- `pnpm check:docs` -- expected: docs guard passes after backlog/log/instruction changes.

**Manual checks:**
- Capture desktop and mobile screenshots of the home/header state after implementation.

## Suggested Review Order

**Shared Navigation**

- Header owns the home/account/settings affordance contract and null-safe active state.
  [`Header.tsx:8`](../../apps/web/src/components/Header.tsx#L8)

- Review shell mirrors the same non-root Settings and accessible account behavior.
  [`ReviewShell.tsx:58`](../../apps/web/app/components/ReviewShell.tsx#L58)

**MVP Account And Settings Scope**

- Settings page exposes only current MVP settings and unavailable categories.
  [`page.tsx:26`](../../apps/web/app/settings/page.tsx#L26)

- Account page keeps status copy static and MVP-scoped.
  [`page.tsx:7`](../../apps/web/app/account/page.tsx#L7)

**Responsive And Accessible Styling**

- Header account link now has visible hover and focus treatment.
  [`globals.css:113`](../../apps/web/app/globals.css#L113)

- Narrow mobile header spacing keeps Settings visible without crowding.
  [`globals.css:1183`](../../apps/web/app/globals.css#L1183)

**Delivery Evidence**

- Tests cover home header, review shell, settings, and account affordances.
  [`home.test.tsx:106`](../../apps/web/tests/home.test.tsx#L106)

- Iteration log records verification commands and screenshot artifacts.
  [`ITERATION_LOG.md:22`](../../docs/delivery/ITERATION_LOG.md#L22)

- Repo instruction records branch-before-story-work behavior.
  [`AGENTS.md:31`](../../AGENTS.md#L31)
