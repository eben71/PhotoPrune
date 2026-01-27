# AGENT_RULES.md

## Phase 2 MVP Build Status (Mandatory)
- PhotoPrune is **past feasibility** and now in **Phase 2 MVP development**.
- MVP product work **may** modify the app and services directly (not limited to `experiments/`).
- Stay within the Phase 2 scope in `ROADMAP.md` and the user-provided phase instructions.
- Keep dependencies minimal and well-justified.

## Token Safety (Non-Negotiable)
- Never commit or log access/refresh tokens or authorization codes.
- Token storage must be encrypted at rest (or system keychain if used).
- `experiments/phase1/.tokens/` must remain untracked.

## Documentation Outputs (Required)
- Maintain the root docs:
  - `DECISIONS.md`
  - `RISK_REGISTER.md`
  - `PHASE1_REPORT.md`

## Quality Gates
- Security standards in `AGENTS.md` are mandatory.
- Repo-wide tests must remain green; coverage must not drop below 80%.
- CI checks must remain fully green.

## If Ambiguous
- Stop and ask. Quality over speed.
