# Task-routing validation scenarios

These are policy dry runs only. None of the scenario work was implemented. Simulated runtime metadata validates comparison behavior but does not prove live runtime detection.

## 1. Documentation typo

```text
TASK ROUTING

Complexity: Light
Capability tier: Economical
Reasoning effort: Low
Runtime: Unknown
Status: Unable to verify

Continuing because the current verification policy only blocks detected mismatches.
```

Expected: a detected sufficient configuration would return `Compatible`. No BMAD, Baton, workflow, or workspace recommendation appears.

## 2. Normal scoped PhotoPrune feature

```text
TASK ROUTING

Complexity: Medium
Capability tier: Primary
Reasoning effort: Medium
Runtime: Codex
Status: Unable to verify

Continuing because the current verification policy only blocks detected mismatches.
```

Expected: established patterns, several related files, and normal test updates classify as Medium. Codex runtime identity alone cannot establish capability or reasoning.

## 3. Security-sensitive small change

```text
TASK ROUTING

Complexity: High
Capability tier: Frontier
Reasoning effort: High
Runtime: Unknown
Status: Unable to verify

Continuing because the current verification policy only blocks detected mismatches.
```

Expected: authentication or authorization risk keeps the task High complexity regardless of its small scope.

## 4. Destructive automatic deletion

```text
TASK ROUTING

Complexity: High
Capability tier: Frontier
Reasoning effort: High
Runtime: Unknown
Status: Unable to verify
```

Expected: `AGENT_RULES.md` independently rejects automatic deletion. Routing status never authorizes prohibited work, so the workflow stops on the product guardrail.

## 5. Schema migration

```text
TASK ROUTING

Complexity: High
Capability tier: Frontier
Reasoning effort: High
Runtime: Unknown
Status: Unable to verify

Continuing because the current verification policy only blocks detected mismatches.
```

Expected: persistence, compatibility, rollback, and verification risks require High/Frontier/High.

## 6. Detected mismatch

Simulated current configuration:

```text
TASK ROUTING

Complexity: Medium
Capability tier: Primary
Reasoning effort: Medium
Runtime: Codex
Status: Change required

Current configuration:
Capability tier: Economical
Reasoning effort: Low

Required configuration:
Capability tier: Primary
Reasoning effort: Medium

PAUSED
```

Expected: stop before implementation, patches, tests, architectural work, or implementation-related delivery updates.

## 7. Unknown runtime

```text
TASK ROUTING

Complexity: Medium
Capability tier: Primary
Reasoning effort: Medium
Runtime: Unknown
Status: Unable to verify

Continuing because the current verification policy only blocks detected mismatches.
```

Expected: do not guess or repeatedly request manual verification.

## 8. Claude Code or another provider

```text
TASK ROUTING

Complexity: Medium
Capability tier: Primary
Reasoning effort: Medium
Runtime: Claude Code
Status: Unable to verify

Continuing because the current verification policy only blocks detected mismatches.
```

Expected: simulated reliable runtime identity does not fabricate model capability or reasoning equivalence. A future adapter may return another status only after maintained mappings exist.
