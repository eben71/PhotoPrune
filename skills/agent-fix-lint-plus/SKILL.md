---
name: agent-fix-lint-plus
description: "Run lint-only CI steps locally, apply deterministic lint auto-fixes, and stop with clear guidance (or emit a Codex repair capsule) when manual intervention is required. Use when lint-only fixing is requested or lint CI steps fail."
---

# Agent fix:lint+

## Follow the CI source of truth
- Discover lint steps by reading `.github/workflows/ci.yml`.
- Select steps whose **name includes "lint"** (case-insensitive), in order.
- Run the exact `run:` command with its specified `working-directory`.

## Deterministic lint fix loop
1. Run each lint step.
2. If a lint step fails, apply **deterministic** lint auto-fixes only:
   - `pnpm lint:fix` if it exists in `package.json`.
   - `turbo lint -- --fix` if turbo lint is already used in repo scripts.
   - `pnpm -r lint -- --fix` only when recursive lint is already used.
   - Fallback: `pnpm exec eslint` in `apps/web` and/or `packages/shared` **only when** the failing output indicates those packages.
3. Re-run the failing lint step.
4. Stop after **2** fix attempts total.

## Safety guardrails
- Never modify `.github/workflows/**`.
- Never change lint rules or configuration.
- Never weaken CI.
- Never auto-commit changes.
- Never delete code to satisfy lint (except clearly unused imports/vars).

## Use the bundled scripts
- Run `node skills/agent-fix-lint-plus/agent-fix-lint-plus.mjs` to execute lint-only checks.
- Run `node skills/agent-fix-lint-plus/agent-fix-lint-plus.mjs --codex` to emit a Codex repair capsule when lint cannot be auto-fixed.
- Reuse helpers from `skills/agent-fix-ci/scripts/*` for workflow parsing and capsule output.

## Codex repair mode contract
- When `--codex` is provided and lint remains failing, the runner emits:
  - `CODEX_REPAIR_REQUIRED`
  - A single-line JSON capsule describing the failure.
- The capsule contains the failing step, failure reason, output tail, guardrails, allowed actions, and a rerun command.

## Codex guardrails (automated)
- The `--codex` runner tracks progress in `.codex/agent-fix-lint-plus.json`.
- Guardrails enforced between runs:
  - Max iterations: 7
  - Max files changed per iteration: 10
  - Max total lines changed per iteration: 300
  - Stop if `.github/workflows/**` is modified
  - Stop if the same failing step + reason repeats twice

## Expected output
- Print each lint step name, command, and working directory.
- Summarize what failed, what was fixed, and why it stopped (if it did).
- End with:
  - `Lint checks green — ready to commit`, or
  - `Stopped: manual intervention required (Lint failed (eslint).)`
