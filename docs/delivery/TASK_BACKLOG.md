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

- Status: Done
- Type: UI / Trust
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `apps/web/AGENTS.md`
- Goal: Ensure visible Settings and Profile/Account affordances show only required MVP account details and settings, with non-required items hidden or clearly unavailable.
- Acceptance criteria:
  - Settings does not route ambiguously to `/`.
  - Required MVP account details and settings are visible and working.
  - Non-required account/settings items are hidden or clearly unavailable.
  - Screenshots prove visible home/header states.
  - Backlog and iteration log are updated.

### PP-002 Add or confirm MVP Playwright smoke test for the golden path

- Status: Done
- Type: Test
- Links: `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `package.json`
- Goal: Provide a repeatable MVP smoke gate for the primary scan/review path.
- Acceptance criteria:
  - A documented command runs the MVP smoke path or an existing command is confirmed.
  - Smoke covers home, primary CTA, scan/progress, grouped results/review, confidence labels, manual guidance, and Settings/Profile behavior.
  - The command is added to docs and backlog evidence.
- Evidence:
  - `pnpm smoke:mvp` runs the Playwright Chromium MVP smoke spec at `tests/e2e/mvp-smoke.spec.ts`.
  - 2026-06-30 local result: `pnpm smoke:mvp` passed, 1 test passed.
  - The smoke uses deterministic fixture mode and a Google Picker browser stub; real Google Photos account verification remains covered by PP-014/manual demo work.

### PP-003 Run full repo verification gate and reconcile failures

- Status: Done
- Type: Verification
- Links: `docs/ai/testing.md`, `.agents/skills/repo-verify/SKILL.md`
- Goal: Establish current green/red status for the full repo gate after reset.
- Acceptance criteria:
  - Full gate commands from `docs/ai/testing.md` are run or explicitly skipped with blocker/risk.
  - Failures are triaged into fixes or follow-up tasks.
  - Iteration log records exact evidence.
- Evidence:
  - 2026-07-01 full gate result: `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, `make build`, and `pnpm check:docs` passed.
  - `make format-check` initially failed on ignored/generated `packages/shared/dist/index.d.ts` and `packages/shared/dist/index.js`; added `packages/shared/.prettierignore` so generated shared build output is excluded from the source-format gate.
  - `make python-locks-check` was not required because PP-003 changed no Python dependency manifests or lock files.
  - Sandbox runs of make targets initially hit Corepack user-cache `EPERM`; escalated reruns reached the real commands and are recorded in `docs/delivery/ITERATION_LOG.md`.

### PP-004 Create manual MVP demo checklist

- Status: Done
- Type: Docs / Verification
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Define a human demo checklist that must pass before MVP exit.
- Acceptance criteria:
  - Checklist includes Chrome, real Google login, read-only Google Photos scope, scan start, progress, grouped review, manual cleanup guidance, and limitations.
  - Checklist includes Settings/Profile expected behavior for required MVP account details only.
  - Checklist references artifacts/screenshots to capture.
- Evidence:
  - Added `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` as the canonical human Chrome demo checklist for real authenticated Google Photos MVP verification.
  - Linked the checklist from `docs/testing/MVP_SMOKE_TEST_PLAN.md` and `docs/product/MVP_EXIT_CRITERIA.md`.
  - PP-004 creates the checklist artifact only; running the real Google demo remains future PP-014/manual MVP evidence work.

### PP-017 Resolve manual review findings for PP-001 navigation labels and settings copy

- Status: Done
- Type: UI / Navigation / Trust
- Links: `docs/delivery/ITERATION_LOG.md`, `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `apps/web/AGENTS.md`
- Goal: Resolve product-owner manual review findings where top navigation labels do not clearly match their routes and the Settings page exposes implementation-phase language.
- Acceptance criteria:
  - Settings page heading uses user-facing copy such as `Settings`, not `MVP Settings`.
  - Top navigation labels and destinations are consistent across the home header and review shell.
  - `History` is either backed by an intentional `/history` experience or renamed/reworked so it does not ambiguously point to `/results`.
  - Results/review navigation does not create a confusing `History` versus `Review` loop or imply an unsupported `/review` route.
  - Settings still routes to `/settings`; Account/Profile still routes to `/account`.
  - Tests and screenshot evidence cover the corrected home and review-shell navigation states.

### PP-018 Fix Compose web image build after pnpm 11 upgrade

- Status: Done
- Type: Chore / Dev Environment
- Links: `package.json`, `infra/docker/web.Dockerfile`, `apps/web/Dockerfile`, `Makefile`
- Goal: Restore `make dev` after the repo package manager moved to `pnpm@11.9.0`.
- Acceptance criteria:
  - Web Docker build uses a Node runtime compatible with the declared pnpm version.
  - pnpm override configuration is stored where pnpm 11 reads it so frozen installs match the lockfile.
  - Dev container install uses a pnpm 11-compatible workspace install path and explicitly allows dependency build scripts required by native packages.
  - `make dev` image preflight checks the same Node image used by the web Dockerfile.
  - Compose reaches the web service build step without the Corepack `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` failure.
  - Any remaining runtime or dependency failures are recorded with exact evidence.

### PP-019 Align CI pnpm and Node versions with repo package manager

- Status: Done
- Type: Chore / CI
- Links: `.github/workflows/ci.yml`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- Goal: Restore frozen pnpm installs in CI by using the same pnpm major version that generated the current workspace override-aware lockfile on a Node runtime supported by pnpm 11.
- Acceptance criteria:
  - GitHub Actions installs `pnpm@11.9.0`, matching the package manager declared in `package.json`.
  - GitHub Actions uses Node 24 so pnpm 11 can load required modern Node built-ins such as `node:sqlite`.
  - `pnpm-workspace.yaml` remains the canonical location for pnpm overrides.
  - Dependency versions and lockfile resolutions are not changed for this CI repair.
  - Local verification records that `pnpm@11.9.0` could not be downloaded in this environment if registry access remains blocked.

### PP-021 Harden dependency lock drift and supply-chain policy automation

- Status: Done
- Type: Chore / CI / Dependency Management
- Links: `.github/workflows/ci.yml`, `.github/workflows/python-dependency-refresh.yml`, `.github/workflows/python-lock-repair.yml`, `.github/dependabot.yml`, `package.json`, `pnpm-lock.yaml`, `apps/api/pyproject.toml`, `apps/worker/pyproject.toml`, `scripts/sync-python-locks.sh`, `docs/ai/testing.md`
- Goal: Make recurring Node and Python dependency-lock CI failures self-diagnosing and automatically repairable where safe, so Dependabot/scheduled dependency changes do not repeatedly break install or lock-check workflows.
- Acceptance criteria:
  - CI has a focused dependency preflight that catches pnpm minimum-release-age violations and Python manifest/lock drift before the expensive full gate, with actionable output that names the exact repair command or automation path.
  - Node dependency updates account for pnpm supply-chain policy timing: either dependency automation waits until packages satisfy the configured minimum release age or opens a delayed/refresh PR instead of committing too-new lockfile entries.
  - Python dependency updates keep `apps/api` and `apps/worker` `pyproject.toml`, `uv.lock`, `requirements.lock`, and `requirements-dev.lock` synchronized automatically when pins change, including Dependabot-created ruff-style version bumps that currently fail as separate API and worker `make python-locks-check` errors.
  - Safe auto-repair is implemented for lock-only drift where the manifest change is already committed: automation can run the existing lock sync commands and update the same branch/PR, while protected CI remains non-mutating.
  - Repo docs explain the dependency maintenance flow, when to run `make python-locks`, `make python-locks-upgrade`, `pnpm clean --lockfile`, and `pnpm install`, and how pnpm minimum-release-age failures should be handled.
  - Tests or workflow dry-runs cover stale Python locks and too-new pnpm lock entries without relying on live package publication timing.
  - The implementation records exact evidence in `docs/delivery/ITERATION_LOG.md` and leaves no unsupported product-scope changes.

### PP-027 Repair the real-photo scan input and Picker lifecycle

- Status: Done
- Priority: P0
- Type: Product / Integration / Reliability
- Finding coverage: RR-002, RR-008, RR-014
- Dependencies: PP-025 (Done); blocks PP-006 decision persistence evidence, PP-015 lifecycle work, PP-016 exact-link evidence, and PP-023 real demo.
- Links: `apps/web/app/projects/[id]/run/page.tsx`, `apps/web/app/hooks/useGooglePhotosPicker.ts`, `apps/web/src/engine/engineAdapter.ts`, `apps/api/app/engine/scan.py`
- Goal: Ensure Picker-selected real items reach the hashing engine with usable image bytes and truthful metadata through a resilient browser authorization/session lifecycle.
- Acceptance criteria:
  - Saved-project scan requests preserve an engine-usable Picker `baseUrl`/download URL, real dimensions, media ID, and only the minimum metadata required for the current scan.
  - The scan rejects or reports items without retrievable bytes instead of silently producing meaningless empty groups.
  - The Picker window is opened synchronously from the user gesture, then navigated after session creation; popup-blocked and user-closed states are explicit.
  - Access-token expiry and 401 responses trigger bounded reauthorization/retry, and unused OAuth scopes are removed.
  - Picker and API item limits have one documented value or an explicit batching/resume design; selection is never silently truncated after the user finishes choosing.
- Required verification:
  - Hook, adapter, route, and API integration tests use deterministic local image bytes and assert dimensions/URLs survive the boundary.
  - Tests cover blocked popup, closed window, expired token/401, over-limit selection, invalid media, and successful grouped results.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, `make build`, and `pnpm smoke:mvp`.
  - PP-023 records the separate real-account Chrome proof.
- Builder evidence:
  - The review-repaired focused web suite passed with 13 files and 78 tests; web lint and typecheck passed.
  - Focused API verification passed with 72 tests across project scans, scan routes, schema/normalizer boundaries, partial failures, downloads, and the deterministic fixture contract.
  - Deterministic duplicate, invalid-byte, and failing-download media are exercised through the real local fixture server and host-override path using `scripts/fixture_media_server.py` and `tests/fixtures/picker/pp027_scan_contract.json`.
  - The matching current-session envelope preserves exact links and failed-item guidance without persisting Picker URLs; persisted failed-item reload truth remains deferred to PP-015.
  - Independent blind and edge-case reviews were resolved without expanding persistence or product scope.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, `make build`, `pnpm check:docs`, and `pnpm smoke:mvp` passed after review repairs.
  - Coverage passed at web 83.59%, API 93.01%, and worker 100%; PP-023 remains the separate real-account Chrome proof.

### PP-028 Enforce the deployment security boundary

- Status: Ready
- Priority: P0
- Type: Security / API / Deployment
- Finding coverage: RR-003, RR-004
- Dependencies: The approved PP-028 implementation contract selects technically enforced localhost-only, single-operator use; authenticated multi-user and all non-local exposure are out of scope. Coordinate persistence ownership with PP-015 and readiness checks with PP-030.
- Links: `_bmad-output/implementation-artifacts/spec-pp-028-enforce-localhost-deployment-security-boundary.md`, `_bmad-output/planning-artifacts/architecture-pp-028-localhost-security-boundary.md`, `apps/api/app/api/routes.py`, `apps/api/app/core/config.py`, `apps/api/app/engine/downloads.py`, `apps/api/app/projects/repository.py`
- Goal: Prevent unauthorized project access and fail closed at the remote-download boundary before PhotoPrune can be deployed beyond an explicitly local environment.
- Acceptance criteria:
  - Runtime and shipped network configuration technically enforce localhost-only, single-operator use; docs state that project operations are unauthenticated, Google OAuth is not PhotoPrune login, and non-local exposure is unsupported.
  - Production mode is enum-like and fail-closed; an empty download-host allowlist denies all in every supported environment, and missing production security settings prevent startup rather than allowing every host.
  - Every redirect and resolved address is revalidated; private/link-local/loopback destinations, DNS rebinding, oversized responses, and excessive work are bounded.
  - The absence of application authentication, a pre-parse inbound request-body ceiling, bounded request fields, process-local safety rate limits, per-request and aggregate download byte/item/time limits, audit-safe errors, and CORS responsibilities are tested and documented without making multi-user claims.
- Required verification:
  - Negative API/security tests cover public-bind regressions, identity-header spoofing, declared/streamed oversized bodies before JSON parsing, oversized fields, redirects to private addresses, rebinding simulation, bad environment values, empty allowlists in every mode, redaction, size/work limits, concurrency, and rate limits; web tests prove project proxies and same-origin health work with only the private API URL.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, and `make build`.
  - Deployment review confirms no public listener can start with insecure defaults.

## P1

### PP-026 Add advisory task-routing gate for agent workflows

- Status: Done
- Type: Docs / Delivery / Agent Guidance
- Links: `AGENTS.md`, `docs/ai/TASK_ROUTING.md`, `docs/delivery/WORKFLOW.md`, `docs/delivery/BATON_WORKTREE_GUIDE.md`, `_bmad-output/project-context.md`
- Goal: Require one concise, advisory complexity and session-suitability assessment before meaningful Codex, BMAD, or Baton planning and implementation work.
- Acceptance criteria:
  - Root guidance makes the routing gate reliably discoverable without copying the detailed rubric into `AGENTS.md`.
  - The concrete incoming or backlog task is identified and read before routing, so the gate never classifies the mechanical act of task selection.
  - One canonical policy classifies Light, Medium, and High tasks across the required risk and complexity dimensions and maps them to relative model, reasoning, and workflow recommendations.
  - The gate reports session suitability honestly, never changes the active model or reasoning level, and avoids repeated routing loops.
  - BMAD work is routed before workflow selection, and Baton work is routed before implementation without weakening backlog, acceptance-criteria, builder/verifier, or verification rules.
  - Five representative dry runs cover Light, Medium, High/forbidden, ambiguous, and escalation cases without implementing the scenarios.
  - Delivery records and required verification evidence are updated.
- Required checks:
  - `make lint`
  - `make format-check`
  - `make typecheck`
  - `make test`
  - `node scripts/check-coverage.mjs`
  - `make build`
  - `pnpm check:docs`
- Residual risk:
  - Codex session metadata may not expose the active model or reasoning level, so suitability detection and switching remain manual.
- Evidence:
  - `docs/delivery/artifacts/PP-026/task-routing-dry-runs.md` records the five required dry runs and confirms the forbidden auto-delete scenario stops on repository policy.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, `make build`, and `pnpm check:docs` passed on 2026-07-10.
  - Review feedback corrected the delivery sequence so an explicit task or selected `Ready` backlog entry is read before the routing gate runs.
  - Pull request #242 merged as commit `72a6706`; implementation and recorded verification are complete.

### PP-005 Reconcile milestone status with demonstrated MVP readiness

- Status: Done
- Priority: P1
- Type: Docs / Verification
- Finding coverage: RR-001
- Dependencies: None; complete before new feature work is described as product-ready.
- Links: `README.md`, `ROADMAP.md`, `docs/product/CURRENT_STATE.md`, `docs/product/MVP_PROGRESS_LEDGER.md`, `docs/product/MVP_EXIT_CRITERIA.md`
- Goal: Separate technical milestone delivery from a demonstrated, usable MVP and make the golden-path blockers the canonical current status.
- Acceptance criteria:
  - README, roadmap, current-state docs, and MVP ledger use consistent readiness vocabulary and do not equate “Phase 3 complete” with product readiness.
  - PP-023 and every unresolved golden-path dependency are visible as blockers to MVP readiness.
  - Completed engineering components remain credited without implying that the real authenticated flow has passed.
  - Any newly identified mismatch is linked to an existing task or a narrowly scoped follow-up.
- Required verification:
  - `pnpm check:docs`
  - Targeted internal-link and cross-document status checks introduced by PP-033, if available.
  - Manual comparison against `docs/product/MVP_EXIT_CRITERIA.md` and the PP-023 evidence record.
- Evidence:
  - README, roadmap, current-state, MVP ledger, and exit-criteria language now distinguishes implemented technical milestones from demonstrated MVP readiness.
  - PP-023 and its PP-027, PP-006, PP-016/PP-020 prerequisites are visible alongside PP-015 and the full verification gate; no application behavior or unrelated task scope changed.
  - Builder and verifier checks, manual cross-document comparison, the pnpm environment limitation, and the direct docs-guard pass are recorded in `docs/delivery/ITERATION_LOG.md`.
  - Verifier review corrected one stale current-state symptom that still described Phase 3 as presently marked complete, then confirmed the acceptance criteria and scoped documentation-only diff.

### PP-006 Make review actions, representative language, and trust copy truthful

- Status: Ready
- Priority: P0
- Type: UI / Docs / Trust
- Finding coverage: RR-005, RR-006, RR-025
- Dependencies: PP-005; coordinate automated browser coverage with PP-020.
- Links: `AGENT_RULES.md`, `docs/trust-copy.md`, `apps/web/app/components/GroupCard.tsx`, `apps/web/app/copy/trustCopy.ts`, `apps/web/app/components/ReviewShell.tsx`
- Goal: Ensure every visible review action works or is clearly unavailable and remove unsupported keeper, privacy, whole-library, theatrical, and legal/support claims.
- Acceptance criteria:
  - `Keep Recommended`, `Mark Externally`, and `Skip For Now` persist a truthful review decision, or are removed/disabled with plain-English unavailable copy.
  - “Recommended”/“keeper” language is replaced with “Representative” unless a separately approved evidence-backed keeper policy exists.
  - Selection-scoped and mode-specific copy accurately distinguishes ephemeral runs from persisted projects.
  - Non-functional Privacy, Terms, Security, and Support labels become working destinations or are removed.
  - No similarity percentages, auto-delete, recovery, write-scope, or unsupported security/storage claims are introduced.
- Required verification:
  - Focused component/unit tests for every review-action state and copy branch.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, and `pnpm check:docs`.
  - `pnpm smoke:mvp` plus trust UI review and screenshots at desktop and mobile widths.

### PP-007 Add task-discovery follow-up workflow

- Status: Done
- Type: Delivery
- Links: `docs/delivery/WORKFLOW.md`, `.agent/prompts/task-discovery.md`
- Acceptance criteria:
  - Discovery workflow explains when to create follow-up tasks rather than expanding scope.
  - New task entries include priority, status, acceptance criteria, and verification expectations.
- Evidence: `docs/delivery/WORKFLOW.md` and `.agent/prompts/task-discovery.md` implement the follow-up-task rule and required task fields.

### PP-008 Baton/git worktree usage guide

- Status: Done
- Type: Delivery
- Links: `docs/delivery/BATON_WORKTREE_GUIDE.md`
- Acceptance criteria:
  - Baton and git worktree rules exist and map one workspace to one task ID.
  - Branch naming and handoff requirements are documented.
- Evidence: `docs/delivery/BATON_WORKTREE_GUIDE.md` exists and records task/worktree isolation and handoff requirements; branch-policy consolidation remains PP-034.

### PP-009 Align or document pnpm version mismatch between package.json and CI

- Status: Done
- Type: Chore / Docs
- Links: `package.json`, `.github/workflows/ci.yml`, `docs/ai/testing.md`
- Evidence: The repository and CI now use the package-manager version declared by `package.json`; the pnpm 10/9 mismatch described by the original task is stale.
- Acceptance criteria:
  - Decision is made to align CI or explicitly document why mismatch is intentional.
  - Relevant install/CI docs are updated.
  - CI dependency installation remains reproducible.
- Evidence: CI installs pnpm from the root `packageManager` declaration; PP-019 and PP-021 recorded the aligned/tooling-hardened implementation.

### PP-011 Repair Python lock check and cleanup run pruning

- Status: Done
- Type: Chore / CI
- Links: `apps/worker/pyproject.toml`, `.github/workflows/cleanup-runs.yml`, `docs/CONTRIBUTING.md`
- Goal: Restore the Python lock check to a manifest/lock-consistent state and make scheduled cleanup prune old completed runs tied to closed PR refs or branch names.
- Acceptance criteria:
  - Worker Python dev dependency pins match the committed lock files.
  - Cleanup run pruning detects closed PR runs by `pull_requests` metadata, `refs/pull/<number>/head` refs, and closed PR head branch names.
  - Documentation reflects the cleanup behavior.
  - Relevant checks are run or blockers are recorded.

### PP-010 Fix apps/web/AGENTS.md frontend notes link mismatch if confirmed

- Status: Done
- Type: Docs
- Links: `apps/web/AGENTS.md`, `docs/frontend-design-implementation-notes.md`
- Evidence: Link text referenced plural notes while target pointed to singular `docs/frontend-design-implementation-note.md`.
- Acceptance criteria:
  - Link target points to `docs/frontend-design-implementation-notes.md`.
  - Docs guard passes.

### PP-012 Record product-owner MVP alignment in canonical docs

- Status: Done
- Type: Docs / Product
- Links: `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md`, `docs/product/MVP_EXIT_CRITERIA.md`, `docs/product/MVP_PROGRESS_LEDGER.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Convert questionnaire answers into canonical MVP scope, demo, trust, verification, and backlog docs without implementing product changes.
- Acceptance criteria:
  - Product docs identify the MVP user, promise, real Google Photos data path, session-only persistence, required Settings/Profile scope, and manual cleanup link-out.
  - Trust docs preserve no auto-delete, no in-app delete, no write scope, and no unsupported storage/sharing/privacy claims.
  - Similarity percentages are recorded as a dedicated product-policy decision before implementation.
  - Docs guard passes or any blocker is recorded.

### PP-013 Resolve numeric similarity evidence policy

- Status: Ready
- Priority: P1
- Type: Product / Trust
- Dependencies: Requires an explicit product-owner decision; current prohibition remains the binding interim guardrail until then.
- Links: `AGENT_RULES.md`, `docs/product/DO_NOT_BUILD.md`, `docs/trust-copy.md`, `docs/questionnaires/MVP_ALIGNMENT_QUESTIONNAIRE.md`
- Goal: Decide whether MVP should show numeric similarity percentages or only plain-English similarity reasons and confidence bands.
- Acceptance criteria:
  - Product owner decision is recorded explicitly.
  - If percentages are approved, UI copy rules explain where they may appear and how they differ from confidence.
  - If percentages remain prohibited, review explanation requirements are updated to avoid numeric scoring.
  - Tests and smoke assertions are updated to match the decision.
- Required verification:
  - Record the product-owner decision in canonical product and trust documentation.
  - Update affected tests and smoke assertions, then run `make test`, `pnpm smoke:mvp`, and `pnpm check:docs`.
- Current evidence: `AGENT_RULES.md` and trust documentation prohibit similarity percentages as an interim guardrail; `docs/product/MVP_PROGRESS_LEDGER.md` confirms the product-policy decision remains open.

### PP-014 Implement or verify real authenticated Google Photos MVP flow

- Status: Blocked
- Type: Product / Integration
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Prove the MVP path with a real Google account, real Picker-selected Google Photos content, scan, review, and manual cleanup link-out in Chrome.
- Acceptance criteria:
  - Authenticated Google flow works without write scope.
  - User can scan Picker-selected real Google Photos content, or unsupported subpaths are clearly recorded as blockers.
  - Results show grouped identical/similar candidates from real Google Photos content.
  - Manual demo evidence is recorded.
- Evidence:
  - 2026-07-02 result: Blocked. See `docs/delivery/artifacts/PP-014/pp-014-evidence.md`.
  - Code inspection found the picker-selected path uses the read-only Google Picker media-items scope, but this session could not run a real Chrome/OAuth demo with a user-owned Google account and real Google Photos content.
  - Single-album and multiple-album source modes were blocked before PP-024 by missing product-ready real Google Photos album selection/fetch; after PP-024, they are not MVP pass evidence.
  - Follow-up: PP-022 records evidence that arbitrary real user-library album source modes are blocked by current Google Photos API support; PP-024 changed MVP source scope to Picker-selected real Google Photos content.
  - Follow-up: PP-023 must run and record the real Chrome picker-selected Google Photos path before PP-014 can pass.

### PP-015 Make run and project lifecycle reliable and truthful

- Status: Ready
- Priority: P1
- Type: Product / Reliability
- Finding coverage: RR-009, RR-013
- Dependencies: PP-027 for valid real-photo scan input; security decisions in PP-028 must constrain any persistence design.
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `apps/web/src/engine/engineAdapter.ts`, `apps/api/app/engine/scan.py`, `apps/api/app/projects/repository.py`
- Goal: Define one intentional current-run lifecycle with truthful persistence, partial outcomes, retry, timeout, and cancellation behavior.
- Acceptance criteria:
  - The in-memory run registry and SQLite project lifecycle have documented durability, cleanup/TTL, restart, multi-instance, and browser-close semantics.
  - Reopened results preserve real thumbnails and truthful status, warnings, skipped items, failed items, and review choices rather than fabricating `COMPLETED` state.
  - Per-item download/decode failures produce bounded retries and truthful partial results instead of aborting every viable result.
  - Cancellation reaches active backend work; UI state does not claim cancellation while work continues unchecked.
  - Current-session timeout recovery is tested; previous scan history remains outside MVP requirements unless explicitly approved.
- Required verification:
  - API and web unit/integration tests for partial success, retry exhaustion, cancel, TTL cleanup, timeout, restart, and failed/skipped serialization.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, and `make build`.
  - Deterministic browser coverage through PP-020 and documented manual restart/timeout evidence.

### PP-016 Implement or verify Google Photos exact-photo link-out for manual cleanup

- Status: Ready
- Priority: P0
- Type: Product / Trust
- Finding coverage: RR-007
- Dependencies: PP-027 must preserve the Picker metadata needed to evaluate a supported exact-item destination; blocks PP-023 sign-off.
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`
- Goal: Let users open the exact selected photo in Google Photos in a new tab for manual cleanup outside PhotoPrune.
- Acceptance criteria:
  - Each selected cleanup candidate has a link or reference to the exact Google Photos item.
  - Link opens in a new tab.
  - No in-app delete option or write-scope action is introduced.
  - Manual cleanup guidance remains clear and non-destructive.
  - If Google exposes no supported exact-item URL, the requirement and UI are revised honestly; homepage or unproven media-ID search fallbacks are not represented as exact.
- Required verification:
  - Unit and Playwright tests distinguish an exact supported destination from unavailable/fallback states.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, and `pnpm smoke:mvp`.
  - Automated evidence can complete PP-016 before PP-023. PP-023 then validates the implemented exact-link or honest unavailable state with real Picker output and records any newly discovered defect as a follow-up task.

### PP-022 Implement real Google Photos album source selection and fetch

- Status: Discarded
- Type: Product / Integration
- Links: `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`, `docs/delivery/artifacts/PP-014/pp-014-evidence.md`
- Goal: Provide a product-ready read-only Google Photos flow for selecting and scanning one or more real albums without relying on raw album ID entry or fixture/paged test data.
- Acceptance criteria:
  - User can authenticate with read-only Google Photos access and select one real album.
  - User can select multiple real albums.
  - Scan input is populated from real Google Photos album content without requesting write scope.
  - Album flow remains clearly separate from full-library scanning and does not imply unsupported write, delete, recovery, storage, or privacy behavior.
  - Tests and manual evidence cover single-album and multiple-album scans, or any Google API limitation is documented as a launch blocker.
- Evidence:
  - 2026-07-02 result: Blocked. See `docs/delivery/artifacts/PP-022/pp-022-evidence.md`.
  - Official Google Photos documentation says broad Library API scopes were removed after March 31, 2025 and listing/searching/retrieving albums and media items is limited to app-created content.
  - The supported user-library path is the Google Photos Picker API, which returns selected media items for a Picker session and does not expose product-ready arbitrary real album listing/fetch.
  - Local code inspection found the app's real user-library path uses the read-only Picker media-items scope; `album_set` paths accept raw IDs or supplied metadata/test pages and are not sufficient MVP manual-demo evidence.
  - PP-024 superseded this task by approving Picker-selected content as the sole MVP source mode. The task is Discarded, not Blocked: arbitrary user-library album support is outside current MVP scope unless a later approved task reopens it around a supported API.

### PP-024 Decide MVP source scope after Google Photos album API limitation

- Status: Done
- Type: Product / Scope
- Links: `docs/delivery/artifacts/PP-022/pp-022-evidence.md`, `docs/product/MVP_EXIT_CRITERIA.md`, `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`
- Goal: Decide whether MVP source scope can shift from single/multiple Google Photos album modes to Picker-selected Google Photos content, or whether album-specific source modes remain launch-blocking.
- Acceptance criteria:
  - Product owner decision explicitly accepts or rejects replacing single/multiple album source modes with Picker-selected content for MVP.
  - Decision output names the exact MVP source modes, user-facing labels/copy implications, and manual demo evidence required after the decision.
  - MVP exit criteria, progress ledger, manual demo checklist, backlog, and any affected smoke/manual-test docs are updated to match the decision before the changed source-mode definition is used as pass evidence.
  - If album source modes remain required, PP-014 stays blocked until Google exposes a supported read-only album selection/fetch path or an approved alternative is documented.
  - If Picker-selected content is accepted, raw album IDs, backend source metadata, app-created-data-only reads, fixture/paged test data, and code inspection still cannot count as real MVP source evidence.
- Evidence:
  - 2026-07-02 result: Done. See `docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md`.
  - Product-owner decision accepts Picker-selected real Google Photos content as the MVP source mode, replacing arbitrary single-album and multiple-album source modes for MVP pass evidence.
  - Updated MVP exit criteria, progress ledger, manual demo checklist, smoke handoff docs, repo guardrails, README, ROADMAP, and current-state docs to match the decision.
  - Raw album IDs, backend source metadata, app-created-data-only Library API reads, fixture/paged test data, and code inspection still cannot count as real MVP source evidence.
- Residual risk:
  - PP-014 remains blocked until the real Chrome Picker-selected Google Photos demo passes with a real account and real content.
  - PP-015 and PP-016 remain separate MVP gates for session timeout recovery and exact-photo link-out behavior.

### PP-023 Run real Chrome picker-selected Google Photos demo

- Status: Blocked
- Priority: P0
- Type: Product / Verification
- Dependencies: PP-027, PP-006, and PP-020 must pass first; PP-020 includes PP-016 automated coverage. The demo also requires a product-owner-controlled real Google account, interactive Chrome, and suitable real content.
- Links: `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md`, `docs/delivery/artifacts/PP-014/pp-014-evidence.md`
- Goal: Prove the picker-selected Google Photos MVP path in Chrome with a real account and real Google Photos content.
- Acceptance criteria:
  - Chrome completes Google OAuth or Google Photos Picker API authorization with a real account and no write scope.
  - App creates a Google Photos Picker API session through `v1.sessions`.
  - App lists selected real Google Photos media items through `v1.mediaItems`.
  - Scan starts from the selected real items and grouped review results render.
  - The implemented exact-photo link-out or honest unavailable state is validated and recorded; any discrepancy from PP-016 automated evidence becomes a follow-up defect without retroactively making PP-023 a prerequisite for PP-016.
  - Evidence is captured under a task artifact folder and summarized in `docs/delivery/ITERATION_LOG.md`.
- Evidence:
  - 2026-07-05 PP-025 implementation added the Google Photos Picker API session/media-items source path.
  - PP-023 remains blocked until a human runs Chrome with a real Google account and records endpoint-level `v1.sessions` and `v1.mediaItems` evidence, selected real media, scan start, grouped review results, and exact-photo link-out/reference behavior.
  - Legacy Google Picker `DocsView(DOCS_IMAGES)`, raw album IDs, backend metadata, fixture/paged test data, mocked tests, and code inspection alone still cannot count as PP-023 or PP-014 MVP source evidence.
- Required verification:
  - Complete every row in `docs/testing/MANUAL_MVP_DEMO_CHECKLIST.md` with redacted screenshots/network evidence for OAuth scope, Picker session/list, real scan, grouped review, decisions, and exact-link or honest unavailable state.
  - Record browser/version, selected-item count, elapsed behavior, failures, artifacts, and any blocker in the iteration log; mocked automation cannot substitute for this evidence.

### PP-025 Implement Google Photos Picker API session media-items source path

- Status: Done
- Type: Product / Integration
- Links: `docs/delivery/artifacts/PP-024/pp-024-source-scope-decision.md`, `docs/delivery/artifacts/PP-022/pp-022-evidence.md`, `apps/web/app/hooks/useGooglePhotosPicker.ts`
- Goal: Replace or supplement the legacy Google Picker `DocsView(DOCS_IMAGES)` path with the supported Google Photos Picker API session/media-items flow required for MVP source evidence.
- Acceptance criteria:
  - App creates a Google Photos Picker API session using the read-only Picker scope.
  - User completes selection through the Google Photos Picker session UI.
  - App lists selected media items through the Picker API `v1.mediaItems` endpoint for that session.
  - Selected media items feed the existing scan start path without requesting write scope.
  - Legacy Google Picker `DocsView(DOCS_IMAGES)`, raw album IDs, backend metadata, fixture/paged test data, and code inspection alone cannot satisfy PP-023 or PP-014 MVP source evidence.
  - Tests or manual evidence cover the session creation/list flow, or blockers are recorded with exact failure evidence.
- Evidence:
  - 2026-07-05 implementation replaced the web project picker hook's legacy Google Picker `DocsView(DOCS_IMAGES)` flow with Google Photos Picker API `v1.sessions` creation, `pickerUri` opening with `/autoclose`, session polling, and `v1.mediaItems` listing.
  - Selected Picker API `PHOTO` media items are normalized into the existing picker selection shape and continue through the saved project scan path as `sourceType: "picker"` and `photoItems`.
  - Focused hook tests cover session creation/listing, closed-window cancellation, missing client configuration, and Picker API failure.
  - Verification passed: `pnpm --filter web test -- use-google-photos-picker-hook.test.tsx`, `make lint`, `make format-check`, `make typecheck`, `make test`, `node scripts/check-coverage.mjs`, `make build`, and `pnpm check:docs`.
  - PP-023 and PP-014 still require a real Chrome run with a real Google account and recorded endpoint evidence; code inspection and mocked tests alone are not MVP pass evidence.

### PP-020 Expand Playwright MVP regression coverage

- Status: Ready
- Priority: P0
- Type: Test
- Finding coverage: RR-010
- Dependencies: PP-006, PP-016, and PP-027 define the trust-critical behavior to automate.
- Links: `tests/e2e/mvp-smoke.spec.ts`, `playwright.config.ts`, `docs/testing/MVP_SMOKE_TEST_PLAN.md`, `docs/product/MVP_EXIT_CRITERIA.md`
- Goal: Expand the PP-002 Playwright smoke foundation into focused MVP regression coverage for trust-critical browser behavior without replacing the real-Google manual demo path.
- Acceptance criteria:
  - The retired `google.picker.DocsView`/`PickerBuilder` mock is replaced by deterministic Photos Picker REST `v1.sessions` and `v1.mediaItems` contract fixtures that feed the Next and FastAPI scan path.
  - CI runs the deterministic MVP smoke gate and preserves browser artifacts on failure.
  - Playwright coverage is split into maintainable focused specs or helper modules instead of one oversized smoke test.
  - Coverage includes at least three MVP regression areas beyond the basic golden path, such as route/session guard behavior, trust-copy forbidden-claim checks across key pages, Google Photos link-out behavior, Settings/Account scope, or viewport/accessibility-critical navigation.
  - The existing `pnpm smoke:mvp` command remains fast and deterministic, or any additional Playwright command is documented with when to use it.
  - Reusable Playwright helpers avoid duplicating the Google Picker stub, fixture-mode setup, forbidden-claim assertions, and common navigation flows.
  - Coverage includes review decisions, exact-link available/unavailable states, partial item failures, cancellation, timeout/restart behavior, and trust-copy assertions.
  - Docs and delivery evidence explain what is automated versus what remains manual/PP-023 real Google Photos verification.
- Required verification:
  - `pnpm smoke:mvp` and the CI workflow-equivalent command pass with Chromium.
  - `make lint`, `make format-check`, `make typecheck`, `make test`, and `pnpm check:docs`.

### PP-035 Patch Next.js and Sharp production vulnerabilities

- Status: Verifying
- Priority: P1
- Type: Build / CI / Supply Chain
- Links: `apps/web/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`
- Goal: Restore the protected production dependency audit by moving Next.js and its Sharp runtime dependency to patched versions without broadening the dependency update.
- Acceptance criteria:
  - Next.js resolves to `16.2.11` or newer and its framework lint packages remain aligned.
  - Sharp resolves to `0.35.0` or newer, including through Next.js's optional production dependency path.
  - The pnpm release-age preflight and `pnpm audit --prod --audit-level=high` pass.
  - The full repository verification gate passes, with any unrelated intermittent failure recorded accurately.
- Evidence:
  - Next.js, `@next/eslint-plugin-next`, and `eslint-config-next` resolve to `16.2.11`; the workspace Sharp override resolves the Next.js optional dependency to `0.35.0`.
  - The dependency preflight passed for 707 locked versions under the 1,440-minute policy, and the production audit reported no known vulnerabilities.
  - Lint, format check, typecheck, tests, coverage, and build passed; the build identifies Next.js `16.2.11`.

## P2

### PP-029 Establish matching-quality evidence and performance budgets

- Status: Draft
- Priority: P2
- Type: Engine / Quality / Performance
- Finding coverage: RR-011, RR-012
- Dependencies: PP-027 provides a correct real-byte input path; PP-006 must settle representative versus keeper language. Begin corpus design after golden-path correctness, then optimize only from measurements.
- Links: `apps/api/app/engine/candidates.py`, `apps/api/app/engine/grouping.py`, `apps/api/app/engine/hashing.py`, `apps/api/app/engine/scan.py`, `tests/fixtures`
- Goal: Measure whether grouping is useful and whether supported selection sizes complete within explicit resource budgets.
- Acceptance criteria:
  - A privacy-safe, labelled corpus covers exact copies, crops, edits, exports, screenshots, metadata changes, and difficult non-matches.
  - Precision, recall, false-positive tolerance, representative-policy evidence, latency, memory, bandwidth, and supported-size targets are approved before algorithm changes.
  - Candidate-bucket misses and small-input fallback behavior are measured and reported reproducibly.
  - Benchmarks drive bounded concurrency, optimized hashing, progress, or async-worker decisions; no unsupported scale or quality claim is published.
- Required verification:
  - Versioned corpus manifest, expected labels, benchmark harness, repeatable command, and baseline report are committed without private user media.
  - Regression tests enforce approved quality thresholds and performance smoke budgets with documented environment variance.
  - Full repo gate and docs guard pass after any engine or claim change.

### PP-030 Simplify infrastructure and harden storage/operations

- Status: Draft
- Priority: P2
- Type: Architecture / Operations
- Finding coverage: RR-015, RR-016, RR-020
- Dependencies: PP-015 defines the intended run/project lifecycle; PP-028 defines production configuration and exposure; PP-029 supplies evidence if async execution is needed.
- Links: `docker-compose.yml`, `apps/api/app/projects/repository.py`, `apps/api/app/api/routes.py`, `apps/worker`
- Goal: Make the runtime topology match actual product behavior and give retained storage an intentional integrity and operational model.
- Acceptance criteria:
  - PostgreSQL, Redis, and Celery are removed from the MVP stack unless an approved measured requirement wires and tests them end to end.
  - If SQLite remains, it has foreign-key enforcement, versioned migrations, WAL/busy-timeout decisions, a durable mounted path where required, backup/concurrency expectations, and deletion/retention behavior.
  - Readiness checks validate storage and required secure configuration rather than returning static success.
  - Privacy-safe structured logs include correlation/run IDs, failure categories, lifecycle timing, and reliability signals without exposing photo content or tokens.
- Required verification:
  - Compose/config tests prove the minimal stack starts, persists only as documented, migrates safely, reports dependency failure, and does not start unused services.
  - Migration upgrade/rollback or recovery procedure is tested from a representative prior schema.
  - `make dev` smoke, full repo gate, container builds, and `pnpm check:docs` pass.

### PP-031 Make builds hermetic and repair security/toolchain automation

- Status: Draft
- Priority: P2
- Type: Build / CI / Supply Chain
- Finding coverage: RR-017, RR-018, RR-019
- Dependencies: PP-030 should identify the retained service/image set before container simplification.
- Links: `apps/web/app/layout.tsx`, `infra/docker`, `.github/codeql-config.yml`, `.github/workflows`, `pnpm-workspace.yaml`, `package.json`
- Goal: Remove avoidable network and version ambiguity from builds and ensure security analysis covers the actual exposed code.
- Acceptance criteria:
  - Web production builds do not fetch fonts or other optional assets from the network.
  - Container build tools/images are pinned appropriately, Next standalone output is used, and duplicate/incompatible Dockerfiles are removed.
  - A workflow invokes CodeQL for both Python and JavaScript/TypeScript with correct paths, or the unused configuration is removed with rationale.
  - Turbo release-age exceptions are removed or narrowly time-bounded, and Next/Turbo/package metadata has one canonical aligned version source.
- Required verification:
  - Offline/restricted-network production build and retained container builds pass.
  - CodeQL workflow/config validation covers `apps/web`, `apps/api`, and any retained worker code.
  - Dependency preflight, full repo gate, image smoke tests, and docs guard pass.

### PP-032 Rewrite architecture, privacy, terms, and risk truth

- Status: Ready
- Priority: P1
- Type: Docs / Architecture / Legal / Risk
- Finding coverage: RR-021, RR-022
- Dependencies: PP-005 supplies readiness vocabulary; PP-028 and PP-030 decisions must be reflected before final sign-off. An interim privacy/risk correction may proceed immediately and blocks wider testing/deployment.
- Links: `docs/ARCHITECTURE.md`, `DECISIONS.md`, `docs/PRIVACY_NOTICE_DRAFT.md`, `docs/TERMS_OF_USE_DRAFT.md`, `RISK_REGISTER.md`
- Goal: Describe the actual system, data lifecycle, security boundary, and material product risks without stale Phase 0/Phase 3 placeholders.
- Acceptance criteria:
  - Architecture documents the Picker sequence, scan contract, project routes, run registry, retained storage, service topology, security boundary, deployment model, and failure/cancellation lifecycle as implemented or explicitly planned.
  - Major persistence, source-scope, execution, and deployment choices are recorded as dated ADRs; stale decision TODOs are resolved or linked to backlog tasks.
  - Privacy and terms enumerate stored metadata, purpose, retention/deletion behavior, third parties, user controls, limitations, and a real owner/contact path approved by the product owner.
  - Risk register covers authorization, SSRF/abuse, retention, public exposure, accuracy/false positives, popup/token/URL expiry, and operational failure with owners and mitigations.
- Required verification:
  - Product-owner/legal review is recorded for privacy/terms; engineering reviews architecture/data-flow accuracy against current code and PP-028/PP-030 decisions.
  - All internal links and required sections pass PP-033 checks and `pnpm check:docs`.

### PP-033 Enforce documentation and delivery-state consistency

- Status: Ready
- Priority: P1
- Type: Docs / Delivery Automation
- Finding coverage: RR-023, RR-024
- Dependencies: PP-005 establishes canonical readiness vocabulary; this reconciliation supplies the baseline statuses.
- Links: `scripts/check-docs.js`, `docs/delivery/TASK_BACKLOG.md`, `docs/delivery/ITERATION_LOG.md`, `docs/product/MVP_PROGRESS_LEDGER.md`, `.github/workflows/ci.yml`
- Goal: Turn docs guard into a useful truth/link consistency gate and prevent backlog, ledger, iteration evidence, and version claims from drifting again.
- Acceptance criteria:
  - Checks validate internal links, canonical version references, readiness vocabulary, required privacy/risk sections, task IDs, allowed statuses/transitions, and duplicate IDs.
  - `Done`/`Verifying` states require appropriate artifact or iteration evidence; merged work cannot remain indefinitely `Verifying` without an explicit verifier blocker.
  - Ledger next-work references resolve to actionable non-Done tasks with satisfied/visible dependencies; stale PP-025 next-work text is corrected.
  - Historical iteration evidence remains durable while an archive/index policy keeps the active log usable.
  - Fixtures test contradictory phases, stale task references, missing evidence, invalid transitions, broken links, and version drift.
- Required verification:
  - Focused tests for `scripts/check-docs.js` fail on every acceptance fixture and pass on the reconciled repository.
  - `pnpm check:docs`, `make test`, and CI workflow validation pass.

### PP-034 Consolidate agent guidance and repository hygiene

- Status: Draft
- Priority: P2
- Type: Agent System / Repository Hygiene / Docs
- Finding coverage: RR-026, RR-027, RR-028
- Dependencies: PP-033 should define canonical-reference and link checks. Use the required `maintain-agent-system` skill for the agent-guidance portion.
- Links: `AGENT_RULES.md`, `AGENTS.md`, `apps/web/AGENTS.md`, `docs/ai`, `docs/delivery/BATON_WORKTREE_GUIDE.md`, `docs/CONTRIBUTING.md`, `_bmad-output/project-context.md`
- Goal: Reduce contradictory agent policy and remove stale, generated, duplicate, or personal artifacts without erasing durable delivery evidence.
- Acceptance criteria:
  - One canonical policy layer owns trust, verification, done, and branch rules; derivative guidance links to or is validated against it.
  - Codex and Baton branch conventions are unified or their distinct contexts are explicit, and the `BMAP/Baton` typo is corrected.
  - Tracked generated/personal artifacts such as empty coverage output and environment dumps are removed and covered by ignore/check rules.
  - Duplicate frontend-note aliases and historical scratchpads are consolidated or archived with inbound links preserved or updated.
  - Contributing/project context no longer calls the lockfile a placeholder or duplicates stale Turbo/Ruff versions when canonical manifests suffice.
- Required verification:
  - Run the `maintain-agent-system` audit/review workflow and record its evidence.
  - `pnpm check:docs`, targeted ignore/tracked-artifact checks, link validation, and full repo gate pass.
