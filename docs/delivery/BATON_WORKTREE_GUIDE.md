# Baton and Git Worktree Guide

Baton is a workspace manager, not a source of truth. Repo artifacts remain canonical.

## Baton rules

- Run `docs/ai/TASK_ROUTING.md` before implementation. Use Baton for scoped Light or Medium execution; route unresolved High or materially ambiguous work to BMAD first.
- Every Baton workspace must map to one task ID from `docs/delivery/TASK_BACKLOG.md`.
- Branch naming: `task/PP-001-short-name`.
- Agents must read `AGENTS.md`, `AGENT_RULES.md`, the task/backlog entry, MVP docs, and `docs/testing/VERIFICATION_CHECKLIST.md` before changes.
- Do not store decisions only in Baton notes.
- Update repo docs before handoff.
- Keep WIP to 2-3 concurrent workspaces, and only one P0 usability task unless independent.

## Plain git worktree fallback

```bash
git fetch origin
git switch main
git pull --ff-only
git worktree add ../PhotoPrune-PP-001 -b task/PP-001-home-nav-profile
git -C ../PhotoPrune-PP-001 status
```

After handoff or merge:

```bash
git worktree remove ../PhotoPrune-PP-001
git branch --delete task/PP-001-home-nav-profile
```

If the branch is not merged, do not delete it until the owner confirms the work can be discarded.
