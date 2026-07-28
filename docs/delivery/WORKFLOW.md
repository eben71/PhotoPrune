# Repo-Native Delivery Workflow

Use this workflow for every delivery task. Repo docs are the source of truth across ChatGPT Desktop, Codex, BMAD, and other tools.

The standard PhotoPrune path is:

```text
Story
    ↓
ChatGPT Desktop
    ↓
Codex
    ↓
Selected BMAD workflow
    ↓
Implementation
```

For example, a scoped story may use `bmad-quick-dev`. Choose the BMAD workflow based on the user's process and the task's needs; the task-routing gate does not select it.

## Steps

1. Identify the concrete delivery task. If the incoming request names a task, confirm its backlog entry and acceptance criteria; otherwise select the first `Ready` task from `docs/delivery/TASK_BACKLOG.md` and read its full entry.
2. Run the capability gate in `docs/ai/TASK_ROUTING.md` on that task; pause on a detected configuration mismatch and otherwise continue the already selected workflow.
3. Create an isolated scoped branch.
4. Builder agent implements only that task.
5. Builder updates tests, docs, backlog, and `docs/delivery/ITERATION_LOG.md`.
6. Separate verifier session reviews against acceptance criteria where practical.
7. Run relevant checks from `docs/ai/testing.md`.
8. Run MVP smoke if UI or the main flow changed.
9. Human reviews product behavior and delivery evidence.
10. Merge only when verification evidence is recorded.
11. Create follow-up tasks for discovered gaps instead of expanding scope silently.

## WIP limits

- Keep normal development focused on one implementation task.
- Only one P0 usability task at a time unless tasks are clearly independent.
- A task stays unfinished until evidence is in the iteration log.

## Optional advanced orchestration

Baton is not required for Codex, BMAD, or single-task development and is not part of the standard path above. Advanced users may opt into Baton when coordinating multiple concurrent Codex sessions, worktrees, long-running or resumable work, parallel features, or other advanced workspace needs.

When Baton is explicitly selected, consult [BATON_WORKTREE_GUIDE.md](BATON_WORKTREE_GUIDE.md). Baton coordinates workspaces; it does not replace Codex, BMAD, repository task records, or verification.

## Role separation

- Planner scopes tasks and acceptance criteria.
- Builder implements the scoped task and records evidence but does not declare final verification alone.
- Verifier skeptically checks acceptance criteria, guardrails, and evidence.
- Reviewer checks product usability and trust, not only code correctness.
