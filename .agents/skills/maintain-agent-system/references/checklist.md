# Maintain Agent System Checklist

Use this checklist when auditing or maintaining this repository's agent guidance and repo-local skills.

## 1) Root instruction layer
- [ ] Root `AGENTS.md` exists if this repo uses Codex repository guidance.
- [ ] Root `AGENTS.md` is concise and high-signal.
- [ ] Root `AGENTS.md` contains only always-on guidance that Codex should see frequently.
- [ ] Root `AGENTS.md` includes exact commands for:
  - [ ] install
  - [ ] build
  - [ ] lint
  - [ ] typecheck
  - [ ] test
  - [ ] relevant project verification flows
- [ ] Root `AGENTS.md` includes concrete “definition of done” checks.
- [ ] Root `AGENTS.md` avoids long prose, motivational language, and generic advice.
- [ ] Root `AGENTS.md` does not duplicate large sections from `AGENT_RULES.md` or docs.

## 2) Layering and topology
- [ ] Instruction topology is easy to understand.
- [ ] Nested `AGENTS.md` files are only used where local rules materially differ.
- [ ] Nested `AGENTS.override.md` files are only used where override behavior is truly needed.
- [ ] There are no unnecessary instruction layers.
- [ ] Richer or less-frequently-needed guidance has been moved to focused docs instead of bloating root `AGENTS.md`.
- [ ] Referenced docs are clearly named and located in sensible paths.

## 3) Canonical broader guidance
- [ ] `AGENT_RULES.md` exists only if it adds value beyond `AGENTS.md`.
- [ ] `AGENT_RULES.md` acts as the broader canonical engineering / workflow agreement.
- [ ] Repeated sections between `AGENTS.md` and `AGENT_RULES.md` have been trimmed.
- [ ] Repo-wide non-negotiables are clear and current.
- [ ] Tooling, architecture, testing, security, and workflow guidance are concrete and enforceable.

## 4) Focused supporting docs
- [ ] Long-form guidance is split into focused docs only where justified.
- [ ] Likely locations are sensible, e.g. `docs/ai/`.
- [ ] Each focused doc has one clear purpose.
- [ ] Commands are not copied redundantly across multiple docs unless necessary.
- [ ] Stale or orphaned docs have been removed or linked correctly.

## 5) Existing skills audit
For every skill under `.agents/skills/` or equivalent:

- [ ] Skill folder is valid and clearly named.
- [ ] `SKILL.md` exists.
- [ ] `SKILL.md` has valid front matter.
- [ ] `name` is specific and stable.
- [ ] `description` reads like routing logic:
  - [ ] when to use
  - [ ] when not to use
  - [ ] expected outputs
- [ ] Skill is focused on one job.
- [ ] Skill instructions are imperative and actionable.
- [ ] Inputs are clear.
- [ ] Outputs are clear.
- [ ] Success criteria are clear.
- [ ] Skill does not duplicate large parts of `AGENTS.md`.
- [ ] Skill does not overlap confusingly with other skills.
- [ ] Supporting files are included only when useful.
- [ ] Scripts are present only when a script is better than plain instructions.
- [ ] Old, vague, stale, or bloated skills have been removed, merged, split, or rewritten.

## 6) Future skill standard
- [ ] A reusable skill template exists.
- [ ] A skill authoring guide exists if the repo is complex enough to need one.
- [ ] New skills follow one naming convention.
- [ ] New skills follow one description-writing standard.
- [ ] There is a clear rule for:
  - [ ] when to create a skill
  - [ ] when to use a normal doc
  - [ ] when to use a script
  - [ ] when to add a nested `AGENTS.md`
- [ ] Skill authors know how to avoid overlap with existing skills.

## 7) Duplication and bloat checks
- [ ] No repeated command lists across too many files.
- [ ] No repeated policy blocks across AGENTS, docs, and skills.
- [ ] No generic statements like “write clean code” unless made concrete.
- [ ] No outdated architecture or tooling references remain.
- [ ] No oversized “catch-all” skills remain.
- [ ] No oversized “catch-all” `AGENTS.md` remains.

## 8) Discovery and routing validation
- [ ] It is clear which `AGENTS.md` files Codex will auto-discover.
- [ ] It is clear which files are only referenced material and not auto-discovered.
- [ ] It is clear how repo-local skills are intended to be triggered.
- [ ] Skills meant to be explicit-only are configured that way where appropriate.
- [ ] Skill descriptions are strong enough to support reliable routing.

## 9) Change quality
- [ ] Changes are scoped and minimal.
- [ ] File names are vendor-neutral where practical.
- [ ] Guidance is maintainable by humans, not just AI tools.
- [ ] The resulting system is easy to extend later for other agents.

## 10) Final output
Always produce:

### Current topology
- Root instruction files
- Nested instruction files
- Canonical broader guidance files
- Focused docs
- Repo-local skills
- Templates / standards

### Findings
- Bloat
- Duplication
- Stale guidance
- Missing guidance
- Routing issues
- Weak skill descriptions
- Overlap between skills
- Discovery misunderstandings

### Recommended changes
- Keep
- Trim
- Split
- Merge
- Move
- Delete
- Create

### If implementing
- Exact files changed
- Why each file changed

### Validation summary
- What Codex auto-discovers
- What it does not auto-discover
- Where `AGENT_RULES.md` fits
- Whether the skill setup is coherent
- What future authors should follow
