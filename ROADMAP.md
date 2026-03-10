# PhotoPrune — MVP Roadmap (LLM-Resistant, MVP-First)

> **Purpose**
> This roadmap defines the minimum phases required to validate PhotoPrune as a product.
> It prioritises **early validation of Google Photos constraints**, **user trust**, and **speed to MVP** over architectural elegance.
>
> ⚠️ Any suggestion that increases scope without improving MVP validation should be treated as **post-MVP**.

---

## 0 — Phase 0: Project Foundation, Repo Setup & CI Baseline (NO PRODUCT LOGIC)

> **Goal:** Create a clean, disciplined workspace so MVP work can start without rework.

### Repository & Project Scaffolding

- ✅ Initialise mono-repo (frontend + backend, clear separation)
- ✅ Define top-level folder structure
- ✅ Add `.gitignore`, `.editorconfig`
- ✅ Add `.env.example` (no secrets, just placeholders)
- ✅ Define local dev commands (documented in README)
  - ✅ `dev` (run locally)
  - ✅ `lint`
  - ✅ `test`
  - ✅ `build`

### Documentation Skeleton (Minimal but Real)

- ✅ `README.md` (what it is, what it is not, MVP scope boundaries)
- ✅ `ROADMAP.md` (this file)

### Code Quality Baseline (Local)

- ✅ Linting configured (language-appropriate)
- ✅ Formatting rules enforced
- ✅ Type checking enabled (if applicable)
- ✅ Pre-commit hooks (lint + format only)

### CI/CD Baseline (Starts Now)

- ✅ CI pipeline runs on every PR and on main branch updates
- ✅ CI steps (PR gate):
  - ✅ Install dependencies
  - ✅ Lint (fail = block merge)
  - ✅ Format check (fail = block merge)
  - ✅ Type check (if applicable)
  - ✅ Build frontend
  - ✅ Build backend
- ✅ Branch protection enabled:
  - ✅ Required checks must pass before merge
  - ✅ No direct pushes to main

### Guardrails (Prevent Roadmap Drift)

- ✅ MVP scope explicitly written in README
- ✅ “Out of scope” list included to prevent drift
- ✅ No infrastructure provisioning in this phase
- ✅ No product logic implemented in this phase

**Exit Criteria**

- Repo can be cloned and skeleton can run/build locally
- CI is green and required for merge
- Docs exist and clearly constrain scope

---

## 1 — Phase 1: Feasibility & Risk Validation (EARLIEST GATE)

> **Goal:** Prove Google Photos is viable **before** building the product.

### Google Photos API Validation (Critical)

- ✅ OAuth flow works end-to-end
- ✅ Fetch full library (pagination, large accounts)
- ✅ Measure under realistic conditions:
  - ✅ API rate limits encountered during scan
  - ✅ Time to scan 10k / 50k photos
  - ✅ Metadata completeness (IDs, URLs, timestamps, dimensions where available)
- ✅ Validate expiring media URL behaviour (how often you need to refresh access)
- ✅ Confirm incremental scan strategy feasibility (avoid full re-scan every time)
- ✅ Identify hard blockers or unacceptable constraints

### Feasibility Decision Outcomes

- ✅ **GO:** API limits acceptable → proceed
- ✅ **ADAPT:** limits tight → adjust scan strategy and retry
- ✅ **STOP:** limits kill viability → reassess product direction

### Phase 1 Conclusion (Library API)

- **Library API whole-library enumeration: STOP / not viable**
  - Outcome summary: API access is constrained to app-created items and does not support practical whole-library enumeration for typical users.

### CI Additions (Feasibility)

- ✅ Add smoke tests to CI:
  - ✅ App boots in CI (headless)
  - ✅ Minimal health endpoint returns OK (even stubbed)

> 🚨 **No further phases proceed without passing this gate**

---

## 1b — Phase 1b: Picker API Feasibility Spike (USER-SELECTED INGESTION)

> **Goal:** Validate Picker session flow + ability to retrieve user-selected items at meaningful scale.

### What We Must Measure

- ✅ Selection friction & practical selection size (10, 200, 1k–5k or album-based)
- ✅ Ability to list selected media items reliably
- ✅ Content access works (Picker `baseUrl` fetch with Authorization header + required URL params)
- ✅ Metadata coverage: id, createTime, filename, mimeType, dimensions; % with GPS if present
- ✅ Duplicate/near-match feasibility:
  - ✅ Exact duplicates via SHA-256 on downloaded bytes
  - ✅ Near matches via pHash/embeddings on downloaded renditions

### Red / Amber / Green Gates

- **GREEN:** user can select/retrieve ≥1k items (or album), high content fetch success, metadata gaps <5%
- **AMBER:** limited selection size or requires re-selection; URL refresh complexities; metadata gaps 5–20%
- **RED:** can’t reliably retrieve content/metadata; selection too limited; metadata gaps >20%

### Phase 1b Output

- ✅ Update [DECISIONS.md](DECISIONS.md) and [RISK_REGISTER.md](RISK_REGISTER.md) with findings
- ✅ Record a short outcome summary in project docs and decisions
- ✅ Validate practical review/calibration approach for user-selected ingestion

### Similarity Pipeline (Tiered Decision)

1. Candidate narrowing via metadata (mimeType, dimensions, createTime, filename heuristic; GPS only as negative filter when both present)
2. Near-duplicate scoring via content features (pHash/dHash and/or embeddings) → 0–100 similarity score
3. Optional exact duplicate confirmation by downloading bytes and hashing (SHA-256)
   Outputs: candidate reduction ratio; cost/time per 1k images; false-positive/false-negative sampling plan.
   Finalize thresholds/models in DECISIONS.md after Phase 1b.

---

## Risks / Open Questions (Feasibility)

- Shared project quota scaling (parked for later deep dive)
- No checksum/hash in API payloads → downloads required for exact duplicates
- Location metadata is inconsistent/optional → only a negative filter

---

## 2 — Phase 2: Validation MVP (LOCKED SCOPE)

> **Goal:** Deliver a validation MVP that proves trust, predictability, and cost control.
> Accuracy perfection is explicitly **not** a goal for Phase 2.

### Phase 2.0: Documentation & Guardrails

- ✅ Align all docs to Phase 2 validation MVP scope
- ✅ Record locked decisions + deferred decisions (with TODOs for Phase 3)
- ✅ Establish cost, trust, and scope guardrails

### Phase 2.1: Core Engine (**DONE**)

- ✅ Picker API session + selected-item ingestion only
- ✅ Tiered similarity pipeline (metadata → perceptual hash → optional byte hash)
- ✅ Configurable max photos per run (cost guardrail)
- ✅ Deterministic, repeatable scan results
- ✅ Full automated validation coverage (Checklist A–F, H)

### Phase 2.2: Functional UX (**DONE**)

- ✅ Single-session review flow (no background jobs)
- ✅ Grouping + review-only UI (no deletion)
- ✅ Clear match confidence labels + explanations
- ✅ Cost summary surfaced in UI
- ✅ Cancel + cap smoke tests (manual)
- ✅ End-to-end local validation (engine + UI wired)

### Phase 2.1 & 2.2 Validation Checklist Tracker

- ✅ **A — Selection & ingestion**: automated coverage for single-item ingest, mixed filenames, duplicate IDs, and unsupported media warnings.
- ✅ **B — Execution & progress**: automated stage-order and non-regressing progress checks.
- ✅ **C — Results correctness**: automated fixture checks for exact duplicates, burst series, and no duplicate item assignment.
- ✅ **D — Confidence + reasons only**: automated assertions for HIGH/MEDIUM/LOW confidence, populated reason codes, and no similarity percentages.
- ✅ **E — Cost & limits**: automated soft-cap warning and hard-cap behavior checks (behavioral assertions, not exact numeric thresholds).
- ✅ **F — Failure handling**: automated checks that bad items are isolated/skipped while accepted items continue and counts remain correct.
- ✅ **G — UX & human review**: manual-only validation remains required.
- ✅ **H — Schema contract**: automated run-envelope schema validation + snapshot contract coverage.

Manual-only remaining work:

- ✅ Checklist G human review pass
- ✅ Cancel + cap smoke tests in live/manual flows

### Phase 2.3: Style & Trust Layer

- ✅ Trust-first copy (predictability over hype)
- ✅ Clear scope boundaries visible in UI
- ✅ Transparency on limits and known failure modes
- ✅ Checklist A (Selection & Ingestion) verified via automated tests
- ✅ Trust copy source and update guidance documented (`docs/trust-copy.md`)

### Phase 2.4: Validation & Stress Testing

- ✅ Validate with real user-selected sets (1k–5k)
- ✅ Stress test cost + time per run
- ✅ Capture feedback on confidence labels + review flow

### Phase 2 Guardrails (Cost, Trust, Scope)

- **Cost:** enforce per-run item caps; no library-wide scanning.
- **Trust:** review-only output; no automated deletion.
- **Scope:** single-session only; no background sync, no accounts history.

### Out of Scope for Phase 2

- Library-wide scanning (Library API enumeration)
- Automatic deletion or bulk destructive actions
- Embeddings/semantic similarity in the MVP
- Multi-session accounts, background sync, or persistent indexing
- Pricing plans, billing systems, or free-tier enforcement
- Hosted production deployment guarantees

**Exit Criteria**

- Phase 2 scope is clearly documented and enforced
- Trust and predictability validated with real users
- Cost guardrails respected in realistic runs

---

## 3 — Phase 3: Recurring Workflow & Scoped Ingestion (POST-VALIDATION)

> **Goal:** Transform PhotoPrune from a single-session validator into a recurring workflow **without** breaking Phase 2 trust and cost guardrails.

### Projects & Persistence

- ✅ Introduce Projects (cleanup campaigns) so users can return to the same effort over time.
- ✅ Persist review state across sessions using metadata only (no image bytes stored).
- ✅ Support resume flow with clear progress tracking per project.

### Scoped Ingestion (Read-Only)

- ✅ Add Google auth using read-only permissions only.
- [ ] Fetch media items only from user-selected albums/sets (no library-wide enumeration).
- [ ] Persist stable identifiers and derived fingerprints to improve matching across sessions.
- [ ] Run incremental re-scans inside a project that surface only new/changed groups while preserving prior decisions.
- [ ] Handle rate limits and partial failures with resumable progress.

### Manual Action Guidance

- ✅ Provide per-group checklists to guide manual cleanup in Google Photos.
- ✅ Offer CSV/JSON exports and copyable item lists for manual execution.
- ✅ Include deep links to Google Photos when available (fallback to item-id search links when needed).
- ✅ Keep actions manual-only: no write scopes and no automated delete/move/archive actions.

**Exit Criteria**

- Users can create and revisit a project/campaign across multiple sessions.
- Existing project review state resumes correctly without storing image bytes.
- Incremental rescans show only new/changed groups and preserve prior decisions.
- Cleanup support remains manual-only (checklists/exports/deep links); no automated destructive actions.
