# AGENT_RULES.md

## Phase 1 Feasibility Guardrails (Mandatory)
- This repo is in **Phase 1 feasibility**. Ship only disposable probe code.
- All spike/probe code **must live in `experiments/phase1/`** unless minimal plumbing is required elsewhere.
- Do **not** build reusable services, production-grade pipelines, or long-lived abstractions.
- Keep dependencies minimal and well-justified.
- Follow the `ROADMAP.md` Phase 1 scope and CI additions.

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
