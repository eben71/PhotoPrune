# Optional Advanced Baton and Git Worktree Guide

Baton is an optional workspace-orchestration tool for advanced development setups. It is not part of PhotoPrune's standard development workflow.

Baton is not required to:

- use Codex
- use BMAD or any BMAD workflow
- implement a single task or story
- create a normal scoped branch
- run repository verification

Baton does not replace Codex or BMAD. Codex performs the implementation work, while a selected BMAD workflow provides the applicable planning or development process. Baton may coordinate workspaces around those tools when a user explicitly chooses it.

## When Baton is useful

Consider Baton for:

- multiple concurrent Codex sessions
- multiple isolated worktrees
- long-running feature work
- pausing and resuming implementation work
- parallel feature development
- advanced workspace and task orchestration

For one story in one Codex session, use the standard workflow in [WORKFLOW.md](WORKFLOW.md). A scoped `codex/<task-or-story-slug>` branch is sufficient.

## Advanced workspace rules

When Baton is selected:

- Run `docs/ai/TASK_ROUTING.md` before implementation to verify model capability and reasoning suitability. Task complexity never selects Baton.
- Map each Baton workspace to one task ID from `docs/delivery/TASK_BACKLOG.md`.
- Isolate each task in its own branch or worktree. Prefer the repository branch convention `codex/<task-or-story-slug>`.
- Read `AGENTS.md`, `AGENT_RULES.md`, the task acceptance criteria, relevant product docs, and `docs/testing/VERIFICATION_CHECKLIST.md` before changes.
- Keep decisions and evidence in repository artifacts, not only in Baton notes.
- Update tests, documentation, the backlog, and `docs/delivery/ITERATION_LOG.md` before handoff.
- Keep work in progress to two or three concurrent implementation tasks, and only one P0 usability task unless the tasks are independent.

## Worktree setup

The following plain Git commands are suitable whether or not Baton manages the workspaces:

```bash
git fetch origin
git switch main
git pull --ff-only
git worktree add ../PhotoPrune-PP-001 -b codex/pp-001-home-nav-profile
git -C ../PhotoPrune-PP-001 status
```

Confirm that every worktree has:

- one clearly scoped task
- an isolated branch
- actionable acceptance criteria
- a known owner or Codex session
- a handoff point recorded in repository documentation

## Pausing and resuming

Before pausing long-running work:

- leave the working tree in a reviewable state
- record completed and remaining acceptance criteria
- record verification already run and any failures
- document blockers, residual risks, and the next safe action
- do not rely on chat history or Baton-only notes as the source of truth

When resuming, reread current repository instructions and task records because policy or adjacent work may have changed.

## Parallel development

Use parallel workspaces only for genuinely independent tasks. Avoid overlapping edits to shared policy, contracts, generated files, dependency locks, or delivery ledgers. Coordinate integration order when tasks share a boundary.

Baton manages workspace orchestration; it does not relax PhotoPrune's task isolation, product guardrails, verification gates, or builder/verifier separation.

## Handoff and cleanup

After handoff or merge:

```bash
git worktree remove ../PhotoPrune-PP-001
git branch --delete codex/pp-001-home-nav-profile
```

Verify the resolved worktree path before removal. If the branch is not merged, do not remove its worktree or delete the branch until the owner confirms the work can be discarded.
