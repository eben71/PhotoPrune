# Task Backlog

Repo-native source of truth for delivery tasks. Do not use GitHub Issues/Projects as source of truth for now.

## Status values

Draft | Ready | In Progress | Verifying | Done | Blocked | Discarded

## P0

### PP-000 Agentic Delivery Reset

- Status: Done
- Type: Docs / Delivery
- Links: `AGENT_RULES.md`, `docs/product/MVP_EXIT_CRITERIA.md`, `docs/delivery/WORKFLOW.md`, `docs/testing/VERIFICATION_CHECKLIST.md`
- Goal: Create repo-native artifacts for MVP truth, backlog discipline, iteration tracking, verification gates, and reusable prompts.
- Acceptance criteria:
  - Reset docs, backlog, iteration log, prompts, MVP smoke plan, and verification checklist exist.
  - `AGENT_RULES.md` contains concise delivery-convergence rules.
  - Known doc-only inconsistencies are fixed or recorded as follow-up tasks.
  - Docs checks are run and evidence is recorded.

### PP-001 Verify/fix visible home navigation and profile/account affordances

- Status: Ready
- Type: UI / Trust
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `apps/web/AGENTS.md`
- Goal: Ensure visible Settings and Profile/Account affordances either work or are intentionally unavailable with MVP-safe copy.
- Acceptance criteria:
  - Settings does not route ambiguously to `/` unless labelled intentionally unavailable.
  - Profile/account icon has a clear MVP decision: implement, disable, hide, or document out of scope.
  - Screenshots prove visible home/header states.
  - Backlog and iteration log are updated.

### PP-002 Add or confirm MVP Playwright smoke test for the golden path

- Status: Ready
- Type: Test
- Links: `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `package.json`
- Goal: Provide a repeatable MVP smoke gate for the primary scan/review path.
- Acceptance criteria:
  - A documented command runs the MVP smoke path or an existing command is confirmed.
  - Smoke covers home, primary CTA, scan/progress, grouped results/review, confidence labels, manual guidance, and Settings/Profile behavior.
  - The command is added to docs and backlog evidence.

### PP-003 Run full repo verification gate and reconcile failures

- Status: Ready
- Type: Verification
- Links: `docs/ai/testing.md`, `.agents/skills/repo-verify/SKILL.md`
- Goal: Establish current green/red status for the full repo gate after reset.
- Acceptance criteria:
  - Full gate commands from `docs/ai/testing.md` are run or explicitly skipped with blocker/risk.
  - Failures are triaged into fixes or follow-up tasks.
  - Iteration log records exact evidence.

### PP-004 Create manual MVP demo checklist

- Status: Ready
- Type: Docs / Verification
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Define a human demo checklist that must pass before MVP exit.
- Acceptance criteria:
  - Checklist includes setup, data path, scan start, progress, grouped review, manual cleanup guidance, and limitations.
  - Checklist includes Settings/Profile expected behavior.
  - Checklist references artifacts/screenshots to capture.

## P1

### PP-005 Reconcile Phase 3 “complete” roadmap status with actual MVP usability

- Status: Ready
- Type: Docs / Verification
- Links: `README.md`, `ROADMAP.md`, `docs/product/CURRENT_STATE.md`, `docs/product/MVP_PROGRESS_LEDGER.md`
- Acceptance criteria:
  - Phase 3 language distinguishes technical milestone completion from product usability readiness.
  - Any mismatch found during demo/smoke is recorded as a task.

### PP-006 Audit frontend trust copy and visible unsupported claims

- Status: Ready
- Type: UI / Docs
- Links: `AGENT_RULES.md`, `docs/trust-copy.md`, `docs/product/DO_NOT_BUILD.md`
- Acceptance criteria:
  - UI copy contains no similarity percentages, auto-delete claims, unsupported recovery claims, hypey AI copy, or unsupported privacy/local-only claims.
  - Findings are documented with follow-up tasks if fixes are needed.

### PP-007 Add task-discovery follow-up workflow

- Status: Ready
- Type: Delivery
- Links: `docs/delivery/WORKFLOW.md`, `.agent/prompts/task-discovery.md`
- Acceptance criteria:
  - Discovery workflow explains when to create follow-up tasks rather than expanding scope.
  - New task entries include priority, status, acceptance criteria, and verification expectations.

### PP-008 Baton/git worktree usage guide

- Status: Ready
- Type: Delivery
- Links: `docs/delivery/BATON_WORKTREE_GUIDE.md`
- Acceptance criteria:
  - Baton and git worktree rules exist and map one workspace to one task ID.
  - Branch naming and handoff requirements are documented.

### PP-009 Align or document pnpm version mismatch between package.json and CI

- Status: Ready
- Type: Chore / Docs
- Links: `package.json`, `.github/workflows/ci.yml`, `docs/ai/testing.md`
- Evidence: `package.json` declares pnpm `10.30.3`; CI currently sets pnpm `9.12.2`.
- Acceptance criteria:
  - Decision is made to align CI or explicitly document why mismatch is intentional.
  - Relevant install/CI docs are updated.
  - CI dependency installation remains reproducible.

### PP-010 Fix apps/web/AGENTS.md frontend notes link mismatch if confirmed

- Status: Done
- Type: Docs
- Links: `apps/web/AGENTS.md`, `docs/frontend-design-implementation-notes.md`
- Evidence: Link text referenced plural notes while target pointed to singular `docs/frontend-design-implementation-note.md`.
- Acceptance criteria:
  - Link target points to `docs/frontend-design-implementation-notes.md`.
  - Docs guard passes.
