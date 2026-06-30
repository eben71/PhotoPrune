# Repo-Native Delivery Workflow

Use this workflow for every delivery task. Repo docs are the source of truth across Codex, ChatGPT, Claude, Gemini, Baton, and future tools.

## Steps

1. Select the first `Ready` task from `docs/delivery/TASK_BACKLOG.md`.
2. Create an isolated branch or worktree, optionally via Baton.
3. Builder agent implements only that task.
4. Builder updates tests, docs, backlog, and `docs/delivery/ITERATION_LOG.md`.
5. Separate verifier session reviews against acceptance criteria where practical.
6. Run relevant checks from `docs/ai/testing.md`.
7. Run MVP smoke if UI or the main flow changed.
8. Human reviews product behavior and delivery evidence.
9. Merge only when verification evidence is recorded.
10. Create follow-up tasks for discovered gaps instead of expanding scope silently.

## WIP limits

- Maximum 2-3 concurrent BMAP/Baton/worktree tasks.
- Only one P0 usability task at a time unless tasks are clearly independent.
- A task stays unfinished until evidence is in the iteration log.

## Role separation

- Planner scopes tasks and acceptance criteria.
- Builder implements the scoped task and records evidence but does not declare final verification alone.
- Verifier skeptically checks acceptance criteria, guardrails, and evidence.
- Reviewer checks product usability and trust, not only code correctness.
