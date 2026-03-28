# Skill Guide

Repo-managed skills live in `.agents/skills/`. They are committed, reviewable workflow assets. Do not rely on `.codex/` for project standards because `.codex/` is gitignored in this repo.

## Use the right tool
- Use `AGENTS.md` for short auto-loaded rules that are always useful in a directory.
- Use `AGENT_RULES.md` for durable repo-wide policy and product guardrails.
- Use a skill for a repeatable workflow with a clear trigger, output, and success criteria.
- Use a normal doc for reference material that is informative but not a routed workflow.
- Add scripts or templates only when they remove real repetition.

## Skill location and naming
- Put each skill in its own folder under `.agents/skills/<skill-name>/`.
- Use lowercase kebab-case names.
- Keep one skill focused on one job.
- Prefer instruction-only skills. Add `scripts/` or `resources/` only when they are actively used by the workflow.

## Required SKILL.md structure
Every skill must include YAML front matter with:

```yaml
---
name: skill-name
description: Routing sentence that says when to use the skill and what job it handles.
---
```

Then include these sections:
- `# <skill-name>`
- `## Use when`
- `## Do not use when`
- `## Inputs`
- `## Workflow`
- `## Outputs`
- `## Success criteria`

## Description writing rules
- Write the description as routing logic, not marketing.
- Include the trigger and the boundary in plain language.
- Good: `Use when a change touches user-facing review UI or copy in apps/web and must be checked against trust-first product rules.`
- Bad: `Premium UI quality system for world-class interfaces.`

## Workflow rules
- Write imperative steps that can be followed without guesswork.
- Reference exact commands and file paths.
- Name the required artifacts or checks.
- Include non-trigger cases when the boundary is easy to confuse.

## Review checklist for new or updated skills
- The name is specific.
- The description routes correctly.
- The skill does one job.
- The workflow names concrete inputs and outputs.
- The skill does not duplicate large sections of `AGENTS.md` or another skill.
- Scripts and resources are minimal and justified.

## Maintenance note
- Update `AGENTS.md` when a rule should auto-load for most tasks in a directory.
- Update `AGENT_RULES.md` when a repo-wide policy or product truth changes.
- Update a task doc in `docs/ai/` when a workflow or verification rule changes but should not auto-load everywhere.
- Update a skill when a repeatable routed workflow changes.
- Update the template when the standard shape for future skills changes.
