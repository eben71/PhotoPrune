# Repo-Native Delivery Workflow

Use this workflow for every delivery task. Repo docs are the source of truth across Codex, ChatGPT, Claude, Gemini, Baton, and future tools.

## Steps

1. Identify the concrete delivery task. If the incoming request names a task, confirm its backlog entry and acceptance criteria; otherwise select the first `Ready` task from `docs/delivery/TASK_BACKLOG.md` and read its full entry.
2. Run the advisory gate in `docs/ai/TASK_ROUTING.md` on that task; route unresolved High or materially ambiguous work to BMAD analysis or planning before implementation.
3. Create an isolated branch or worktree, optionally via Baton.
4. Builder agent implements only that task.
5. Builder updates tests, docs, backlog, and `docs/delivery/ITERATION_LOG.md`.
6. Separate verifier session reviews against acceptance criteria where practical.
7. Run relevant checks from `docs/ai/testing.md`.
8. Run MVP smoke if UI or the main flow changed.
9. Human reviews product behavior and delivery evidence.
10. Merge only when verification evidence is recorded.
11. Create follow-up tasks for discovered gaps instead of expanding scope silently.

## WIP limits

- Maximum 2-3 concurrent BMAP/Baton/worktree tasks.
- Only one P0 usability task at a time unless tasks are clearly independent.
- A task stays unfinished until evidence is in the iteration log.

## Role separation

- Planner scopes tasks and acceptance criteria.
- Builder implements the scoped task and records evidence but does not declare final verification alone.
- Verifier skeptically checks acceptance criteria, guardrails, and evidence.
- Reviewer checks product usability and trust, not only code correctness.
