---
name: repo-verify
description: Use when a task is near handoff, CI triage, or release-readiness work and the full PhotoPrune verification gate must be run or repaired.
---
# repo-verify

## Use when
- Preparing a change for handoff.
- Investigating why local checks or CI failed.
- Verifying a branch after cross-cutting edits.

## Do not use when
- The task is a narrow exploratory change that is not ready for verification.
- The user asked for analysis only and no checks should run yet.

## Inputs
- `docs/ai/testing.md`
- `Makefile`
- `.github/workflows/ci.yml`
- `scripts/check-coverage.mjs`

## Workflow
1. Run the full gate in the order documented in `docs/ai/testing.md`.
2. If a step fails, fix the smallest underlying issue before rerunning the relevant step.
3. If the task changed docs or workflow, run `pnpm check:docs`.
4. If a required step cannot run, record the exact command, blocker, and risk.

## Outputs
- Verification status by command
- Any fixes needed to restore green checks

## Success criteria
- Required repo checks pass, or each remaining blocker is explicit and actionable.
- Reported verification status matches the commands actually run.
