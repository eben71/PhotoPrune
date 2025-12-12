# PhotoPrune — MVP Technical Roadmap

> Purpose: Build the MVP of PhotoPrune (Duplicate/Near-Duplicate Photo Finder).
> Tracking: Use the checkboxes as the single source of truth for progress.

---

## 1) What We’re Building (MVP Overview)

PhotoPrune MVP is a tool that helps a user:
1. **Access Google Photos through API
2. **Scan and index** images with reliable metadata and fast hashing.
3. **Detect duplicates and near-duplicates** (exact copies + visually similar variants).
4. **Review results safely** (grouped clusters, side-by-side compare, keep/delete picks).
5. **Provide the user a list of candidates to prune. Deleting is out of scope, but the user will have a list of URLs to navigate to the photo for deleting.

### MVP Success Criteria
- Scans a realistic library (e.g., 10k–100k photos) without crashing.
- Produces duplicate clusters that a user can trust (low false positives).
- Review experience is fast and safe (no accidental loss).
- Outputs are actionable: delete/move, or export a plan.
- Functioning front-end where the user can login and review clusters
- Functioning backend to handle scanning and processing.

---

## 2) Guiding Principles (Non-Negotiables)

- **Safety first**: no destructive action without explicit confirmation and a reversible/staged approach.
- **Deterministic + explainable**: users should understand *why* items are grouped.
- **Performance**: scanning must be incremental; re-scans should reuse prior results.
- **Extensible**: architecture should allow future add-ons (videos, cloud libs, dedupe rules).

---

## 3) Decision Log (Keep Updated)

> Record key decisions and why they were chosen.

- [ ] Decision: Storage model for index (file-based vs embedded DB vs server DB).  
  - Chosen:
  - Why:

- [ ] Decision: Similarity approach for near-duplicates (perceptual hashing vs embedding-based vs hybrid).  
  - Chosen:
  - Why:

- [ ] Decision: Deletion strategy (move to trash vs quarantine folder vs OS recycle bin integration).  
  - Chosen: Links to selected photos provided to allow user to delete
  - Why: Safe and user interaction preferred

- [ ] Decision: UI approach (desktop vs web UI vs CLI-first).  
  - Chosen: Web
  - Why: SaaS product

- [ ] Decision: Full tech stack finalisation (languages/frameworks/runtime/deployment).  
  - Chosen:
  - Why:

---

## 4) Roadmap Phases

### Phase 0 — Repo Bootstrap & Operating Model
**Goal:** Make the repo ready for productive iteration.

- [ ] Add project docs:
  - [x] `ROADMAP.md` (this file)
  - [ ] `AGENT_RULES.md` (rules for AI/Codex contributions)
  - [ ] `DECISIONS.md` (optional: expanded ADR-style decisions)
  - [ ] `CONTRIBUTING.md` (lightweight: how to run, test, PR)
- [ ] Create basic repo hygiene:
  - [ ] `.gitignore`
  - [ ] `.editorconfig`
  - [ ] Lint/format placeholders (stack TBD)
- [ ] Define MVP scope boundaries:
  - [ ] In scope for MVP
  - [ ] Out of scope for MVP
  - [ ] “Not now” list (future)

**Exit Criteria**
- Repo has tracking docs and rules of engagement.
- MVP scope is written and agreed.

---

### Phase 1 — Finalise Tech Stack (Decision Gate)
**Goal:** Choose the minimal stack that supports the MVP with speed and quality.

- [ ] Define constraints and requirements:
  - [ ] Supported OS targets (Windows/Mac/Linux?) — MVP target
  - [ ] Local-first vs server-first — MVP target
  - [ ] Scale target (photos count, disk size)
  - [ ] Expected UX (CLI-only vs UI required for MVP)
- [ ] Evaluate 2–3 candidate stacks (quick comparison doc):
  - [ ] Option A
  - [ ] Option B
  - [ ] Option C (optional)
- [ ] Decide:
  - [ ] Language/runtime
  - [ ] UI approach
  - [ ] Storage/index tech
  - [ ] Packaging/distribution approach
- [ ] Write the “Stack Lock” decision in Decision Log.

**Exit Criteria**
- Tech stack is explicitly chosen and recorded.
- “Hello World” skeleton runs end-to-end locally.

---

### Phase 2 — Data Model & Indexing Foundations
**Goal:** Define how files are represented and how we persist scan results.

- [ ] Define canonical entities:
  - [ ] File reference (path, inode/file-id if available, size, mtime/ctime)
  - [ ] Image metadata (width/height, format, EXIF basics)
  - [ ] Fingerprints (exact hash, perceptual hash, optional embedding)
  - [ ] Scan sessions (when/what/params)
- [ ] Index rules:
  - [ ] Incremental update: detect changed/new/deleted files
  - [ ] Avoid reprocessing unchanged images
- [ ] Storage schema:
  - [ ] Tables/collections/structures for entities
  - [ ] Versioning/migrations plan

**Exit Criteria**
- You can scan a folder and persist index state.
- Re-scan only processes deltas.

---

### Phase 3 — Exact Duplicate Detection
**Goal:** Identify byte-identical files and obvious duplicates reliably.

- [ ] Compute robust file identity:
  - [ ] Fast pre-filter (size)
  - [ ] Content hash (streaming)
- [ ] Grouping:
  - [ ] Cluster exact duplicates by content hash
  - [ ] Pick a default “keep” heuristic (e.g., best path, earliest date, highest resolution)
- [ ] Export/report:
  - [ ] Output duplicate groups as JSON/CSV

**Exit Criteria**
- Exact duplicate clustering is correct on a test dataset.
- Export output is stable and readable.

---

### Phase 4 — Near-Duplicate Detection (Visually Similar)
**Goal:** Catch resized/compressed/edited variants with a safe thresholding strategy.

- [ ] Choose similarity method (from Decision Log):
  - [ ] Implement fingerprint generation
  - [ ] Distance metric + threshold strategy
- [ ] Candidate generation (performance):
  - [ ] Avoid N^2 comparisons (bucket/index approach)
- [ ] Clustering:
  - [ ] Build similarity groups (clusters)
  - [ ] Add “confidence” score per match
- [ ] Explainability:
  - [ ] Record why an item matched (distance/score + method)

**Exit Criteria**
- Near-duplicate matching works on a curated dataset with known variants.
- False positives are manageable with conservative defaults.

---

### Phase 5 — Review Experience (MVP UI/Workflow)
**Goal:** Give users a fast, safe way to review clusters and decide what to keep.

- [ ] Core UX flow:
  - [ ] Select scan target
  - [ ] Run scan with progress feedback
  - [ ] View duplicate clusters
  - [ ] Compare images (side-by-side or carousel)
  - [ ] Mark keep/delete
- [ ] Safety mechanisms:
  - [ ] Default to “no deletion”
  - [ ] Confirmation step
  - [ ] Undo or staged delete/quarantine
- [ ] Quality-of-life:
  - [ ] Keyboard shortcuts (if UI supports)
  - [ ] Filters (exact vs near-duplicate, confidence thresholds)
  - [ ] Sort heuristics (date, size, resolution)

**Exit Criteria**
- User can complete a prune session without confusion.
- No destructive action happens without explicit confirmation.

---

### Phase 6 — Pruning Actions (Safe Delete / Quarantine / Export)
**Goal:** Turn review decisions into real-world outcomes safely.

- [ ] Action options (pick at least one for MVP):
  - [ ] Move to OS trash/recycle bin (preferred if feasible)
  - [ ] Move to quarantine folder
  - [ ] Export a deletion script/list for manual execution
- [ ] Atomicity & recovery:
  - [ ] Log all actions
  - [ ] Support “revert” where feasible
- [ ] Dry-run mode:
  - [ ] Always available
  - [ ] Produces a report without changes

**Exit Criteria**
- Pruning works end-to-end on a real folder.
- Recovery story is documented and tested.

---

### Phase 7 — Testing, Benchmarks, and Quality Gates
**Goal:** Avoid regressions and prove the MVP works at realistic scale.

- [ ] Test datasets:
  - [ ] Small synthetic set (exact duplicates)
  - [ ] Near-duplicate set (resized/compressed/edited)
  - [ ] “Realistic” folder test (10k+ images)
- [ ] Automated tests:
  - [ ] Index integrity tests
  - [ ] Duplicate detection correctness tests
  - [ ] UI smoke tests (if applicable)
- [ ] Performance checks:
  - [ ] Scan time baseline
  - [ ] Incremental scan baseline
  - [ ] Memory usage baseline

**Exit Criteria**
- CI passes with minimum quality bar.
- Performance is acceptable for MVP targets.

---

### Phase 8 — Packaging & MVP Release
**Goal:** Make it easy to run and validate by others.

- [ ] Packaging approach (from tech stack decision):
  - [ ] Build artifacts
  - [ ] Local install/run instructions
- [ ] Docs:
  - [ ] Quickstart
  - [ ] Safety notes
  - [ ] Known limitations
- [ ] MVP release checklist:
  - [ ] Version tag
  - [ ] Example outputs
  - [ ] Demo script / screenshots

**Exit Criteria**
- A new user can install/run in < 10 minutes with docs.
- MVP scope is met.

---

## 5) MVP Backlog (Parking Lot)

- [ ] Videos support
- [ ] Cloud library integrations (e.g., photo services)
- [ ] Multi-device sync
- [ ] Face-based grouping
- [ ] Shared family library workflows
- [ ] Advanced rules engine (“prefer originals”, “prefer edited”, etc.)

---

## 6) Current Status

**Today’s focus:**  
- [ ] Phase 0: Repo bootstrap & docs  
- [ ] Phase 1: Tech stack finalisation  

**Blockers / Risks:**  
- None yet

---

## 7) Notes

- Keep this roadmap updated as tasks move.
- Add links to PRs/issues next to completed tasks where possible.
