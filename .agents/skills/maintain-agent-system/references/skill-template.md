# Repo Skill Template

Use this template when creating a new repo-local skill.

The goal is to keep every skill:
- focused on one job
- easy for Codex to route correctly
- easy for humans to maintain
- small enough to avoid prompt bloat
- explicit about inputs, outputs, and boundaries

---

# 1) When to create a skill

Create a skill when:
- the workflow is repeatable
- the workflow has multiple steps
- the workflow benefits from consistent outputs
- the workflow is likely to be reused across tasks
- the workflow would otherwise bloat `AGENTS.md`
- the workflow needs a stable operating pattern

Do NOT create a skill when:
- a normal doc is enough
- the task is one-off
- the scope is too broad
- the work should be handled by a script/tool instead
- the “skill” would just repeat repo-wide instructions
- the behavior belongs in a nested `AGENTS.md` because it is directory-specific context

## Quick decision rule

Use:
- `AGENTS.md` for always-on repo guidance
- nested `AGENTS.md` for local directory-specific guidance
- a focused doc for rich reference material
- a skill for repeatable workflows
- a script when the task is best executed mechanically

---

# 2) Recommended folder structure

```text
.agents/
  skills/
    <skill-name>/
      SKILL.md
      agents/
        openai.yaml         # optional
      references/          # optional
      scripts/             # optional
      assets/              # optional
