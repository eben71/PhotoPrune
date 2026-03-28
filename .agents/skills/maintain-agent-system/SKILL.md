---
name: maintain-agent-system
description: Audit and maintain this repository's Codex instruction system and skill system. Use when the task is to review, repair, standardize, or optimize AGENTS.md files, AGENT_RULES.md, nested instruction layers, repo-local skills, skill templates, or skill authoring standards. Use when the goal is to reduce instruction bloat, remove duplication, improve routing clarity, validate skill structure, or future-proof the repo's agent setup. Do not use for normal feature development, bug fixing, CI repair, or code review unless the task is specifically about the repository's agent guidance or skills. Outputs should include: the current instruction topology, issues found, proposed changes, implemented fixes where requested, and a concise summary of what Codex will auto-discover versus what must be referenced manually.
---

# Purpose

Maintain the repository's Codex guidance and repo-local skills so they stay:

- concise
- layered sensibly
- easy for Codex to discover and route
- free of duplication and stale instructions
- future-friendly for other agents later

# Use this skill for tasks like

- audit `AGENTS.md` and nested `AGENTS.md` / `AGENTS.override.md`
- review `AGENT_RULES.md` for overlap or drift
- validate repo-local skills under `.agents/skills`
- check whether skill descriptions are good routing metadata
- split bloated guidance into focused docs
- create or improve a skill template / skill authoring standard
- explain which files Codex will auto-load and which it will not
- reduce instruction bloat without losing important constraints

# Do not use this skill for

- implementing product features
- debugging application code
- fixing CI unrelated to agent guidance
- general architecture changes unrelated to agent setup
- writing broad process docs that are not about agent instructions or skills

# Required audit scope

When invoked, audit all of the following if they exist:

- root `AGENTS.md`
- nested `AGENTS.md`
- nested `AGENTS.override.md`
- `AGENT_RULES.md`
- `.codex/config.toml`
- `.agents/skills/**`
- all `SKILL.md` files
- docs related to planning, review, testing, architecture, release, or AI workflow
- any skill templates or authoring guides
- scripts or CI steps that are referenced by AGENTS or skills

# Audit goals

Check for:

1. Instruction topology

- Is the root `AGENTS.md` concise and high-signal?
- Are nested AGENTS files only used where local rules materially differ?
- Are references to richer docs used instead of copying large blocks?
- Are rules concrete, testable, and current?

2. Duplication and bloat

- Repeated commands across multiple files
- Repeated policy statements
- Long prose that should live in a focused doc
- Vague advice with no operational meaning

3. Skill quality

- valid folder structure
- required `SKILL.md`
- good `name`
- strong routing `description`
- one-job scope
- actionable imperative instructions
- clear inputs, outputs, and success criteria
- low overlap with other skills
- scripts/resources only when justified

4. Future-proofing

- vendor-neutral naming where practical
- reusable docs/scripts instead of tool-specific prompt sprawl
- easy extension path for additional agents later

# How to work

1. Map the current instruction and skill topology.
2. Identify what Codex will auto-discover versus what is only referenced material.
3. Find duplication, bloat, stale guidance, and unclear routing.
4. Propose the smallest useful structural improvements.
5. Implement changes only if the user asked for implementation; otherwise provide a clear plan.
6. Prefer:
   - concise root `AGENTS.md`
   - nested AGENTS only when justified
   - focused docs for richer guidance
   - focused skills for repeatable workflows
7. Avoid inventing unsupported syntax or discovery behavior.
8. Keep diffs scoped and explain trade-offs.

# Output format

Return:

## Current topology

- root AGENTS files
- nested AGENTS files
- canonical broader guidance files
- repo-local skills
- supporting docs/templates

## Findings

- instruction bloat
- duplication
- stale guidance
- missing guidance
- skill routing issues
- weak descriptions
- overlap between skills
- discovery misunderstandings

## Recommended changes

- keep
- trim
- split
- merge
- move
- delete
- create

## If implementing

List exact files changed and why.

## Validation summary

State:

- what Codex auto-discovers
- what it does not auto-discover
- where AGENT_RULES.md fits
- whether skill triggering is reliable
- what future skill authors should follow

# Success criteria

The repo should end with:

- a concise, practical `AGENTS.md`
- sensible instruction layering
- valid, focused repo-local skills
- a clear future-skill standard
- reduced duplication
- improved routing clarity
