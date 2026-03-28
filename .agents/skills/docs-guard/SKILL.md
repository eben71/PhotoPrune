---
name: docs-guard
description: Use when a task changes repo commands, workflow, structure, or user-facing product claims and the documentation must stay aligned with the docs guard and trust rules.
---
# docs-guard

## Use when
- Changing setup, verification, CI, repo layout, or developer workflow.
- Changing product claims in README or other user-facing docs.

## Do not use when
- The code change has no documentation impact.
- The task is a general code review with no doc updates needed.

## Inputs
- `README.md`
- `docs/CONTRIBUTING.md`
- `AGENTS.md`
- `AGENT_RULES.md`
- `scripts/check-docs.js`

## Workflow
1. Identify which commands, paths, or claims changed.
2. Update the smallest set of docs that should remain canonical.
3. Keep product language consistent with trust-first scope and guardrails.
4. Run `pnpm check:docs`.
5. If docs changed because workflow changed, also check `docs/ai/testing.md` and related skill docs.

## Outputs
- Updated docs aligned with the codebase
- Passing docs guard

## Success criteria
- Canonical docs match the actual command surface and structure.
- No stale product or workflow claims remain.
- `pnpm check:docs` passes.
