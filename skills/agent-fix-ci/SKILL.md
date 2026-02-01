---
name: agent-fix-ci
description: "Run PhotoPrune CI-equivalent checks locally, apply safe auto-fixes (formatting only), and stop with clear reasons when manual intervention is required. Use when a developer asks to run or fix CI checks, or when CI fails and local parity is needed."
---

# Agent fix:ci

## Follow the CI source of truth
- Discover the CI steps by reading `.github/workflows/ci.yml`.
- Run the exact `run:` commands in order, excluding setup/install-only steps.
- Use the same working directory specified by CI.

## Deterministic fix loop
1. Run a CI-equivalent step.
2. If it fails, classify the failure:
   - Auto-fixable: only formatting check failures.
   - Manual: anything else (lint, type check, tests, audits, build, docs guard).
3. For auto-fixable failures, apply the minimal fix (`make format`) then re-run the failed step.
4. Stop when:
   - All checks pass, or
   - A manual failure is detected, or
   - An auto-fix attempt fails.

## Safety guardrails
- Never modify CI config or weaken checks.
- Never delete tests or change business logic to satisfy checks.
- Do not commit changes automatically.

## Use the bundled scripts
- Run `node skills/agent-fix-ci/agent-fix-ci.mjs` to execute the fix loop.
- Reuse `scripts/agent-utils/*` for workflow parsing and loop orchestration.

## Expected output
- Print each step name, command, and working directory.
- Summarize what failed, what was fixed, and why it stopped (if it did).
- End with:
  - `PhotoPrune CI checks green — ready to commit`, or
  - `Stopped: manual intervention required (reason)`.
