# PhotoPrune Repository Review

**Review date:** 20 July 2026  
**Repository:** `eben71/PhotoPrune`  
**Reviewed commit:** `99f1c367a921c20b6f9002f2f0f05a9725ff2daa`  
**Review type:** Read-only repository, product, documentation, testing, security, and delivery-system review

## Purpose

This document records the findings from a repository-wide review of PhotoPrune. It is intended to provide durable evidence for reconciling `docs/delivery/TASK_BACKLOG.md`, correcting stale project status, and creating missing implementation tasks.

No application code, repository documentation, GitHub issues, branches, or pull requests were changed as part of the review.

## Rating scale

### Improvement rating

- **5 — Critical:** Resolves a fundamental correctness, trust, security, or MVP-readiness problem.
- **4 — High:** Materially improves reliability, usability, maintainability, or delivery confidence.
- **3 — Useful:** Meaningful engineering or process improvement, but not an immediate blocker.
- **2 — Minor:** Repository hygiene or lower-priority simplification.
- **1 — Marginal:** Cosmetic or optional improvement.

### Difficulty rating

- **1 — Small:** Hours or a very small change.
- **2 — Moderate:** Approximately one to two focused development days.
- **3 — Significant:** Several days with cross-component testing.
- **4 — Large:** Multi-week or architectural work.
- **5 — Very large:** Multi-sprint redesign or major product change.

## Executive assessment

PhotoPrune has a strong trust-first product foundation, strict typed boundaries, good unit-test coverage, and thoughtful dependency automation. The primary gap is that the repository currently treats implemented technical components as evidence of a usable product.

Work on recurring projects, saved scans, ingestion checkpoints, delivery orchestration, and agent processes has moved ahead of proving the core real-world path:

1. Authenticate with Google.
2. Select real photos through the supported Google Photos Picker API flow.
3. Scan the selected photos successfully.
4. Present accurate and understandable groups.
5. Record meaningful review decisions.
6. Open the exact selected photo in Google Photos for manual action.

The repository itself acknowledges that this end-to-end path has not passed its required real Chrome demonstration. New feature work should pause until this golden path is corrected, automated where possible, and demonstrated against real Google Photos content.

## Critical product, correctness, and security findings

| ID | Recommended change | Improvement | Difficulty | Finding and reason | Primary evidence |
| --- | --- | ---: | ---: | --- | --- |
| RR-001 | Reclassify current project status around a proven MVP rather than “Phase 3 complete.” | 5 | 1 | `README.md` and `ROADMAP.md` claim that Phase 3 recurring workflows are complete, while the MVP ledger and blocked tasks state that the real authenticated Picker-to-review flow is not yet proven. This creates false confidence and distorts priorities. Technical milestone completion must be separated from demonstrated product readiness. | `README.md`; `ROADMAP.md`; `docs/product/MVP_PROGRESS_LEDGER.md`; `docs/product/MVP_EXIT_CRITERIA.md` |
| RR-002 | Fix the saved-project scan request before adding further Phase 3 behavior. | 5 | 2 | `apps/web/app/projects/[id]/run/page.tsx` constructs `photoItems` without `downloadUrl` or Picker `baseUrl` and replaces real dimensions with `300x300`. The core engine therefore has no image bytes to hash. The normal single-session adapter does transmit `downloadUrl`. A real saved-project scan is likely to produce no meaningful duplicate groups. | `apps/web/app/projects/[id]/run/page.tsx`; `apps/web/src/engine/engineAdapter.ts`; `apps/api/app/engine/scan.py` |
| RR-003 | Add authentication and per-user authorization, or technically enforce a localhost-only product until they exist. | 5 | 4 | Scan and project CRUD endpoints are unauthenticated. Project creation assigns every project to the hard-coded user `local-user`, and project reads, updates, exports, scans, and review changes do not verify ownership. Any non-local deployment could expose or modify all stored projects. CORS is not an authorization control. | `apps/api/app/api/routes.py`; `apps/api/app/projects/repository.py`; `apps/api/app/main.py` |
| RR-004 | Harden the URL-download boundary before any public deployment. | 5 | 3 | The download-host allowlist defaults to empty, and an empty list means allow every host. Scan limits and override restrictions apply only when `ENVIRONMENT` equals exactly `prod`; values such as `production` retain development behavior. URL validation occurs before `urllib` resolves and follows the request, and redirect targets are not visibly revalidated. This leaves SSRF, DNS-rebinding, abuse, bandwidth, and denial-of-service risks. Production configuration should fail closed, use an enum-like environment mode, validate every redirect, bind requests to validated addresses, require authentication, rate-limit calls, and limit total request size and work. | `apps/api/app/core/config.py`; `apps/api/app/engine/downloads.py`; `apps/api/app/engine/scan.py`; `apps/api/app/api/routes.py` |
| RR-005 | Remove or disable non-functional review actions until they work. | 5 | 2 | The primary results card renders `Keep Recommended`, `Mark Externally`, and `Skip For Now`, but none has an event handler. These controls create the appearance of saved review decisions while doing nothing. This directly violates the repository rule that visible actions must work or be disabled. | `apps/web/app/components/GroupCard.tsx`; `apps/web/tests/group-card.test.tsx`; `AGENT_RULES.md` |
| RR-006 | Rename “Recommended” to “Representative,” or implement an evidence-backed keeper-quality policy. | 5 | 3 | The engine selects the earliest and latest photo by creation time as the representative pair. It does not measure sharpness, exposure, resolution preference, faces, composition, or other quality signals. Calling one item the recommended keeper and claiming that PhotoPrune recommends likely keeper images is unsupported. | `apps/api/app/engine/grouping.py`; `apps/web/app/components/GroupCard.tsx`; `README.md`; `apps/web/app/copy/trustCopy.ts` |
| RR-007 | Resolve exact-photo Google Photos link-out honestly. | 5 | 3 | The main result adapter sets the Google Photos item URL to `null` and falls back to the Google Photos homepage. Saved-project results construct a search-by-media-ID URL. Neither behavior proves that the exact selected photo opens. The Picker normalization also does not preserve a verified product URL. The product must either prove a supported exact link using real Picker output or change the requirement and UI rather than representing a fallback as exact. | `apps/web/src/engine/engineAdapter.ts`; `apps/api/app/engine/deeplinks.py`; `apps/api/app/projects/repository.py`; `apps/web/app/hooks/useGooglePhotosPicker.ts`; PP-016 |
| RR-008 | Make the Google Photos Picker launch and token lifecycle resilient. | 4 | 2 | `window.open` occurs only after script loading, OAuth, and Picker-session creation. Because it no longer runs directly inside the original click gesture, a real browser may block the popup. The hook caches the access token without tracking expiry or recovering from a 401 response. It also requests `userinfo.profile` although the application does not use profile information. Pre-open the popup synchronously, navigate it after session creation, handle expiry/re-authentication, and remove unused scope. | `apps/web/app/hooks/useGooglePhotosPicker.ts` |
| RR-009 | Replace the mixed ephemeral and persistent run architecture with an intentional lifecycle. | 5 | 4 | Active runs are stored in a process-global JavaScript `Map`, so restarts, serverless execution, or multiple web instances lose them. The map has no TTL cleanup. Project persistence uses SQLite at `/tmp/photoprune_projects.db`, but Docker Compose mounts no SQLite volume. Reopened project results replace real thumbnails with `placehold.co`, always reconstruct scans as `COMPLETED`, and discard partial status, warnings, skipped items, and failed items. These behaviors do not support the claimed recurring workflow reliably. | `apps/web/src/engine/engineAdapter.ts`; `apps/api/app/core/config.py`; `apps/api/app/projects/repository.py`; `docker-compose.yml` |
| RR-010 | Replace the stale browser smoke test and run it in CI. | 5 | 3 | CI does not run `pnpm smoke:mvp`. The Playwright test still mocks the retired `google.picker.DocsView` and `PickerBuilder` object model instead of the current Photos Picker REST session and media-items flow. It does not mock `photospicker.googleapis.com`, exercise decision actions, verify exact link-out, cover partial failures, or test restart/timeout behavior. A contract-level smoke test should cover the browser hook, Next route, FastAPI scan, and review UI using deterministic local media fixtures. | `.github/workflows/ci.yml`; `tests/e2e/mvp-smoke.spec.ts`; `playwright.config.ts`; PP-020; PP-023; PP-025 |
| RR-011 | Establish a labelled real-image corpus and measurable matching-quality targets. | 5 | 4 | Current tests prove deterministic behavior but not whether users receive useful groups. Candidate narrowing requires the same creation date, coarse aspect-ratio class, and integer-megapixel bucket. Crops, edited copies, exports, screenshots, or metadata changes can cross these boundaries and be silently missed. The small-input fallback only runs in limited circumstances. Define precision, recall, acceptable false-positive behavior, and keeper-policy evidence against a representative corpus. | `apps/api/app/engine/candidates.py`; `apps/api/app/engine/grouping.py`; `apps/api/tests/test_core_engine.py`; `tests/fixtures` |
| RR-012 | Profile and optimise the scan pipeline before making scale claims. | 4 | 4 | Exact hashing downloads every item sequentially. Perceptual hashing is also sequential, and the pHash DCT is implemented as deeply nested pure-Python loops. The candidate stage reduces comparisons but does not reduce the initial byte-download requirement. At 250 to 2,000 photos, performance may be poor. Add representative benchmarks, bounded concurrency, an optimised hashing implementation, real progress reporting, and an async execution strategy where evidence requires it. | `apps/api/app/engine/scan.py`; `apps/api/app/engine/hashing.py`; `apps/api/app/engine/downloads.py`; `apps/worker` |
| RR-013 | Add per-item partial success, retry, and real cancellation behavior. | 4 | 3 | A download or image-decode failure can abort the entire scan. Response envelopes always contain empty `skippedItems` and `failedItems`, despite copy suggesting that remaining results can stay valid. The web cancel action changes local state only after synchronous backend work may already be consuming resources. Classify failures per item, add bounded retry policy, return truthful partial results, and propagate cancellation to actual execution. | `apps/api/app/engine/scan.py`; `apps/api/app/api/routes.py`; `apps/web/src/engine/engineAdapter.ts`; `apps/web/app/copy/trustCopy.ts` |
| RR-014 | Reconcile the Picker maximum with the scan maximum. | 4 | 2 | Picker sessions request up to 2,000 items, while the production API defaults to a 250-photo maximum. `NEXT_PUBLIC_SCAN_MAX_PHOTOS` is optional and is not documented in `.env.example` or Compose. When set, the home page warns and silently slices the selected array before continuing. Introduce explicit batching/resume behavior or lower the Picker cap and clearly inform the user before selection. | `apps/web/app/hooks/useGooglePhotosPicker.ts`; `apps/web/app/page.tsx`; `apps/api/app/core/config.py`; `.env.example`; `docker-compose.yml` |

## Architecture, performance, and operational findings

| ID | Recommended change | Improvement | Difficulty | Finding and reason | Primary evidence |
| --- | --- | ---: | ---: | --- | --- |
| RR-015 | Remove PostgreSQL, Redis, and Celery from the MVP stack unless they are intentionally implemented. | 4 | 2 | Docker Compose provisions PostgreSQL and Redis and starts a Celery worker, but the API never uses `DATABASE_URL`, project data always uses SQLite, and scans execute synchronously in FastAPI. The worker remains a demo ping skeleton with comments that tasks will be added later. This increases setup time, build surface, maintenance, and architectural confusion without delivering product value. | `docker-compose.yml`; `apps/api/app/core/config.py`; `apps/api/app/projects/repository.py`; `apps/worker/app/tasks.py`; `apps/worker/app/celery_app.py` |
| RR-016 | Add intentional SQLite integrity and migration management if SQLite remains. | 3 | 3 | Tables declare foreign keys, but connections do not enable `PRAGMA foreign_keys=ON`. Schema evolution is handled through startup `CREATE TABLE` and ad-hoc `ALTER TABLE` calls. WAL, busy timeout, versioned migrations, backup behavior, concurrency expectations, and deletion lifecycle are not defined. | `apps/api/app/projects/repository.py` |
| RR-017 | Make production builds hermetic and simplify container images. | 3 | 2 | The web build fetches Inter and Manrope from Google Fonts at build time, so an otherwise valid build fails without that external connection. Docker images install unpinned `uv`; the web runtime copies broad `.next` and `node_modules` trees despite standalone output; and `apps/web/Dockerfile` duplicates the canonical infrastructure Dockerfile and appears incompatible with normal Docker build contexts. Self-host fonts, pin build tools/images appropriately, use standalone output, and remove the duplicate Dockerfile. | `apps/web/app/layout.tsx`; `apps/web/next.config.js`; `infra/docker/web.Dockerfile`; `apps/web/Dockerfile`; `infra/docker/api.Dockerfile`; `infra/docker/worker.Dockerfile` |
| RR-018 | Wire CodeQL correctly, including the web application, or remove the misleading configuration. | 3 | 2 | `.github/codeql-config.yml` exists, but no repository workflow references it. Its configured paths include the Python services and workflow files but omit the Next.js/TypeScript application, which contains much of the exposed request and authentication surface. | `.github/codeql-config.yml`; `.github/workflows` |
| RR-019 | Remove the permanent Turbo release-age exception and align declared dependency versions. | 3 | 1 | `minimumReleaseAgeExclude` exempts Turbo and every platform package by package name even though the comment calls the exception temporary and refers to an older toolchain. Package metadata declares Next.js `^16.2.10`, while the workspace override and observed build use `16.2.6`. Exceptions and overrides should be narrow, current, and automatically checked for expiry or inconsistency. | `pnpm-workspace.yaml`; `package.json`; `apps/web/package.json`; `pnpm-lock.yaml` |
| RR-020 | Add meaningful readiness and structured operational telemetry. | 3 | 2 | `/healthz` and `/health` return static success and do not validate storage or required production configuration. Scan logging is minimal and lacks correlation IDs, structured failure categories, queue/run lifecycle metrics, or aggregated timing and reliability signals. Add readiness checks and privacy-safe observability before wider deployment. | `apps/api/app/api/routes.py`; `apps/api/app/main.py`; `apps/web/src/engine/engineAdapter.ts` |

## Documentation, product-copy, delivery, and agent-system findings

| ID | Recommended change | Improvement | Difficulty | Finding and reason | Primary evidence |
| --- | --- | ---: | ---: | --- | --- |
| RR-021 | Rewrite the architecture document as the current system and record major decisions as ADRs. | 4 | 2 | `docs/ARCHITECTURE.md` is still a short “Phase 0 skeleton.” It omits the Photos Picker sequence, scan contract, project routes, SQLite, the in-memory run registry, security boundary, data lifecycle, failure behavior, deployment model, and actual relationships between web, API, worker, Redis, and PostgreSQL. `DECISIONS.md` still contains “TODO: Phase 3” items after Phase 3 is called complete. | `docs/ARCHITECTURE.md`; `DECISIONS.md`; `docker-compose.yml` |
| RR-022 | Rewrite the Privacy Notice, Terms, and Risk Register before wider testing or deployment. | 5 | 2 | Privacy documentation leaves retention, deletion workflow, and contact details as Phase 3 TODOs. The implementation persists media IDs, filenames, timestamps, dimensions, fingerprints, deep links, project membership, scan history, and review choices. The risk register remains focused on obsolete full-library feasibility risks and omits authentication, authorization, SSRF, API abuse, retention, public deployment, accuracy, false positives, popup blocking, expired URLs, and operational failure. | `docs/PRIVACY_NOTICE_DRAFT.md`; `docs/TERMS_OF_USE_DRAFT.md`; `RISK_REGISTER.md`; `apps/api/app/projects/repository.py` |
| RR-023 | Replace the documentation guard with a truth, link, and consistency checker. | 4 | 2 | `pnpm check:docs` passes even with substantial contradictions and stale facts because `scripts/check-docs.js` only confirms that README contains several headings, commands, and paths. Extend it to validate internal links, canonical version sources, phase/readiness vocabulary, backlog references, generated aliases, required privacy sections, and selected cross-document facts. | `scripts/check-docs.js`; `.github/workflows/ci.yml`; `README.md`; `ROADMAP.md` |
| RR-024 | Reconcile the backlog, MVP ledger, and iteration log automatically. | 4 | 1 | Several task statuses and recommendations are stale. PP-007 and PP-008 remain `Ready` although their workflow and Baton guide exist. PP-009 describes old pnpm versions. PP-026 remains `Verifying` after its pull request merged. The MVP ledger lists PP-025 as next work although it is `Done`. Add validation for task IDs, status transitions, completed-artifact evidence, version claims, and references from the ledger. Consider archiving older iteration-log entries while retaining durable evidence. | `docs/delivery/TASK_BACKLOG.md`; `docs/delivery/ITERATION_LOG.md`; `docs/product/MVP_PROGRESS_LEDGER.md`; `docs/delivery/BATON_WORKTREE_GUIDE.md` |
| RR-025 | Remove or correct scope-expanding, theatrical, and privacy-sensitive product copy. | 4 | 1 | Copy such as “Connect Photo Library,” “reclaim your library,” “Private & Secure,” and mode-independent “Nothing is stored” can imply whole-library access or no persistence. Project mode does persist metadata. “Digital Curator” and similar phrases conflict with the calm, plain-English product rule. Footer Privacy, Terms, Security, and Support labels are non-clickable spans. Copy should be selection-scoped and mode-specific; non-functional legal/support links should be implemented or removed. | `apps/web/app/page.tsx`; `apps/web/app/copy/trustCopy.ts`; `apps/web/app/components/ReviewShell.tsx`; `docs/trust-copy.md`; `apps/web/AGENTS.md` |
| RR-026 | Consolidate agent instructions and resolve branch-policy conflicts. | 3 | 2 | Trust constraints, verification commands, done criteria, and workflow rules are repeated across `AGENT_RULES.md`, `AGENTS.md`, AI documentation, project context, delivery workflow, and repo-local skills. Root `AGENTS.md` requires `codex/<slug>` branches, while the Baton guide requires `task/PP-...`. `WORKFLOW.md` also contains a `BMAP/Baton` typo. Keep one canonical policy layer, reduce copied rules, generate or validate derivative guidance, and adopt one branch convention or explicitly define when each applies. | `AGENT_RULES.md`; `AGENTS.md`; `apps/web/AGENTS.md`; `docs/ai`; `docs/delivery/BATON_WORKTREE_GUIDE.md`; `docs/delivery/WORKFLOW.md`; `.agents/skills` |
| RR-027 | Remove generated, personal, duplicate, and obsolete repository artifacts. | 2 | 1 | `apps/worker/coverage.json` is a tracked empty generated coverage file. `temp_pyvenv_dump.txt` contains a personal Windows environment path. Both singular and plural frontend implementation-note files exist, with one acting only as a compatibility alias. Remove unnecessary artifacts, strengthen ignore rules, and archive historical implementation scratchpads rather than mixing them with current product documentation. | `apps/worker/coverage.json`; `temp_pyvenv_dump.txt`; `docs/frontend-design-implementation-note.md`; `docs/frontend-design-implementation-notes.md` |
| RR-028 | Refresh setup, tooling-version, and generated-artifact documentation. | 3 | 1 | `docs/CONTRIBUTING.md` still calls `pnpm-lock.yaml` an initial placeholder and tells contributors to regenerate it. `_bmad-output/project-context.md` lists Turbo `2.10.2` and Ruff `0.15.20`, while current configuration uses Turbo `2.10.4` and Ruff `0.15.21`. Stable documentation should refer to canonical version sources instead of duplicating values where possible. | `docs/CONTRIBUTING.md`; `_bmad-output/project-context.md`; `package.json`; `apps/api/pyproject.toml`; `apps/worker/pyproject.toml` |

## Positive findings to preserve

The following aspects of the project are strong and should be preserved while addressing the findings:

- Trust-first, review-only product constraints are clear and extensively reinforced.
- The product avoids automatic deletion and hidden destructive behavior.
- Confidence is consistently constrained to `High`, `Medium`, or `Low` rather than unsupported precision.
- Zod and Pydantic provide strong runtime validation at many boundaries.
- TypeScript strictness, Python mypy configuration, linting, and formatting are well established.
- Unit-test coverage is strong across the web, API, and worker surfaces.
- Group identifiers, fingerprints, and ordering behavior are deterministic.
- Dependency locking, audits, Dependabot configuration, release-age policy, and lockfile checks are unusually thoughtful.
- The repository correctly distinguishes fixture smoke evidence from the required real authenticated Chrome demonstration.
- The repository-native backlog and iteration log provide a useful foundation for durable delivery evidence.
- Downloader code already attempts scheme, host, private-address, and size controls; the recommendation is to make these controls fail closed and resistant to redirects and rebinding.

## Recommended delivery order

The findings should not be implemented in one large change. They should be reconciled into approximately eight to ten coherent backlog tasks, reusing existing PP tasks wherever possible.

Recommended order:

1. **MVP truth and backlog reconciliation**
   - Reconcile Phase 3 language, backlog status, ledger state, and evidence.
   - Map this review onto existing tasks before creating new ones.

2. **Broken real-photo golden path**
   - Fix the saved-project scan payload and preserve real Picker metadata.
   - Make visible review actions work or remove them.
   - Replace unsupported keeper recommendations with representative language unless a quality policy is implemented.

3. **Picker and exact-photo action path**
   - Fix popup handling and token renewal.
   - Prove or revise exact-photo link-out.

4. **Automated and manual MVP evidence**
   - Replace the stale Playwright mock with the Photos Picker REST contract.
   - Add the smoke test to CI.
   - Run and record the real Chrome demonstration with real Google Photos content.

5. **Deployment security boundary**
   - Implement authentication/authorization or enforce a local-only application boundary.
   - Harden downloader validation, rate limits, and workload limits before public deployment.

6. **Run and project reliability**
   - Resolve in-memory run lifecycle, persistent storage, expired thumbnails, truthful partial status, cancellation, retries, and per-item failures.

7. **Matching quality and performance**
   - Create a labelled corpus, establish accuracy targets, benchmark the engine, and optimise only from evidence.

8. **Infrastructure and documentation simplification**
   - Remove or implement unused PostgreSQL/Redis/Celery infrastructure.
   - Rewrite architecture, privacy, risk, and operating documentation.
   - Strengthen automated documentation consistency checks.

9. **Agent-system and repository hygiene**
   - Resolve branch-policy conflicts, reduce duplicated instructions, refresh version facts, and remove tracked generated or personal artifacts.

## Existing backlog areas likely to absorb findings

Before creating new tickets, reconcile the review against at least the following existing work:

- **PP-005:** Phase 3 completion language versus actual MVP usability.
- **PP-006:** Frontend trust copy and unsupported claims.
- **PP-013:** Similarity evidence and product-policy decision.
- **PP-015:** Session persistence and timeout recovery.
- **PP-016:** Exact-photo Google Photos link-out.
- **PP-020:** Expanded Playwright/end-to-end coverage.
- **PP-023:** Real Chrome Picker-selected Google Photos demonstration.
- **PP-025:** Photos Picker API session/media-items implementation; verify whether completion evidence included the smoke suite.
- **PP-026:** Task-routing gate; reconcile its current status after merge.

New tasks should be created only for findings that cannot be represented cleanly by updating or splitting existing tasks.

## Verification performed during the review

The following checks completed successfully against the reviewed commit:

- JavaScript/TypeScript lint.
- Prettier formatting check.
- TypeScript type checking.
- Web unit tests: **65 passed**.
- API tests: **77 passed**, with approximately **92% line coverage**.
- Worker tests: **2 passed**, with **100% coverage** over the small worker skeleton.
- Dependency-preflight tests: **6 passed**.
- Python Ruff checks.
- Python Black checks.
- Python mypy checks.
- Repository documentation guard.

The following checks were constrained:

- The Next.js production build reached the application build but could not access Google Fonts from the review environment. This was not treated as proof of a source compilation defect, but it revealed a build-time external-network dependency that should be removed.
- Playwright could not launch because the review environment did not contain the required Chromium binary. Independent source inspection confirmed that the smoke specification still mocks the previous Google Picker object model rather than the current Photos Picker REST flow.
- The real authenticated Google Photos Chrome demonstration was not performed because it requires the product owner’s account, real content, and interactive browser confirmation.

## Final conclusion

PhotoPrune’s strongest asset is its trust-first intent. Its largest risk is that status language, tests, and delivery artifacts can make the product appear more complete than the demonstrated user experience warrants.

The next phase should focus on convergence: one supported real-photo source path, one working scan path, truthful grouping and recommendation language, functional review decisions, a proven exact-photo action path or an honest alternative, automated integration coverage, and a completed real-world demonstration. Security and data-lifecycle work must be completed before the application is exposed beyond an explicitly local environment.
