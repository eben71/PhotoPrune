# AGENT_RULES.md

## Mandatory Guardrails
- Do not expand scope: no persistence, no deletion, and no backend logic changes beyond wiring existing error/cap states.
- Prefer small, isolated commits.
- Keep tests passing before handoff.
- Do not add new dependencies unless already approved by repository norms.
