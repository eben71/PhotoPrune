# Task Capability Routing

Use this gate once, before meaningful planning or implementation. Its only purpose is to classify the task and verify that the current model capability and reasoning configuration are sufficient. It does not select a workflow, workspace, orchestration tool, or number of agents.

Runtime detection and provider-specific configuration mappings are defined separately in [TASK_ROUTING_RUNTIME_ADAPTERS.md](TASK_ROUTING_RUNTIME_ADAPTERS.md). Repository safety rules remain authoritative and can reject work independently of this gate.

## Identify the task

Classify the concrete incoming task. When asked to take the next backlog item, select the first `Ready` task and read its goal, context, acceptance criteria, and linked evidence before classifying it.

Task identification is lightweight intake. Do not classify the mechanical act of selecting a task. Missing or vague acceptance criteria increase ambiguity.

## When to run

Run before meaningful:

- planning or repository-wide analysis
- code or test implementation
- configuration or documentation changes
- any selected BMAD, Baton, Codex, or other runtime workflow begins implementation

Run once for an unchanged task. Reassess only when scope or risk materially changes or repeated failures invalidate the original classification.

Before routing completes, only read instructions, inspect enough context to classify accurately, and identify policy conflicts. Do not edit files, generate implementation patches, run implementation-focused agents, commit, or update implementation status.

## Classification rubric

Assess these factors together:

- number of files, packages, services, and external systems involved
- ambiguity, novelty, and repository familiarity
- architectural or product impact
- security, privacy, authentication, and authorization
- destructive behavior
- persistence, schema, or migration changes
- infrastructure and deployment
- concurrency and distributed-system behavior
- verification difficulty and regression risk
- repeated prior failures

Line count alone does not determine complexity. Similar tasks should receive similar recommendations.

### Light

Small, mechanical, highly constrained, low-risk work that follows an obvious pattern and is easy to verify. Examples include documentation corrections, formatting, simple renames, narrow test updates, and minor repetitive code changes.

### Medium

Normal software-development work requiring repository understanding, implementation across one or more related files, normal debugging or tests, moderate design judgment, and integration with established patterns. This is the default for scoped feature work.

### High

Work involving substantial architectural decisions, high ambiguity, unfamiliar or complex systems, security- or privacy-sensitive behavior, deletion or other destructive operations, persistence or schema migrations, infrastructure or deployment, difficult concurrency, major cross-system integration, repeated failed attempts, high-risk refactoring, or difficult root-cause analysis.

Repository guardrails remain decisive. A High classification never authorizes forbidden work or overrides `AGENT_RULES.md`.

## Capability tiers

These tiers are provider-neutral. Do not map them to fixed model names in this canonical policy.

### Economical

Suitable for small, mechanical, highly constrained, low-risk work based on obvious existing patterns.

### Primary

Suitable for normal software development requiring repository understanding, implementation, debugging, tests, moderate design judgment, and established application patterns.

### Frontier

Required for substantial architecture, high ambiguity, complex or unfamiliar systems, security or privacy sensitivity, destructive behavior, persistence or migrations, infrastructure, difficult concurrency, major integration, repeated failures, high-risk refactoring, or difficult root-cause analysis.

## Reasoning effort

Use `Low`, `Medium`, or `High` to describe the reasoning the task requires. These categories do not imply identical provider controls.

| Complexity | Default capability tier | Default reasoning effort |
| ---------- | ----------------------- | ------------------------ |
| Light      | Economical              | Low                      |
| Medium     | Primary                 | Medium                   |
| High       | Frontier                | High                     |

Complexity is risk-aware, not scope-only. Security- or privacy-sensitive work, including small authentication or authorization changes, remains High and requires Frontier capability with High reasoning. A large repetitive change may be Medium with Primary capability and Low or Medium reasoning.

## Runtime and configuration verification

Detect a runtime only from reliable session metadata, environment information, launcher configuration, or another trustworthy signal. Do not infer it from writing style, repository contents alone, model knowledge claims, or the command being executed. Use `Unknown` when reliable evidence is absent.

Where a documented runtime adapter exposes the current configuration:

1. Map the current model to a capability tier.
2. Map the current reasoning configuration to the closest generic effort category.
3. Compare both with the required configuration.

Do not invent capabilities, settings, or equivalence across providers. If runtime, model, capability, or reasoning cannot be reliably determined, verification is unavailable.

## Compatibility

Capability and reasoning levels are ordered:

```text
Economical < Primary < Frontier
Low < Medium < High
```

### Compatible

Use only when both current values are known and meet or exceed the recommendation. Print the compact block and continue the already selected workflow immediately. Do not ask for confirmation or add explanatory prose.

### Change required

Use when reliable metadata detects that either current value is below the recommendation. Print the compact block and only the comparison below it:

```text
Current configuration:
Capability tier: Economical
Reasoning effort: Low

Required configuration:
Capability tier: Primary
Reasoning effort: Medium

PAUSED
```

Then stop before implementation, file modification, code or test generation, architectural work, or implementation-related delivery updates. Resume only after the user changes the configuration. Never warn and proceed.

### Unable to verify

Use when any required runtime, model, capability-tier, or reasoning evidence is unavailable.

The current verification policy is:

```text
Verification policy: Enforce when detectable
```

Under this policy, detected compatibility continues, a detected mismatch pauses, and unavailable verification briefly reports the limitation and continues:

```text
Continuing because the current verification policy only blocks detected mismatches.
```

Do not repeatedly ask for manual verification. A future `Strict` policy may pause when verification is unavailable, but Strict mode is not enabled.

## Required output

```text
TASK ROUTING

Complexity: Light | Medium | High
Capability tier: Economical | Primary | Frontier
Reasoning effort: Low | Medium | High
Runtime: Codex | Claude Code | <recognised runtime> | Unknown
Status: Compatible | Change required | Unable to verify
```

Do not include workflow or workspace recommendations, BMAD or Baton recommendations, a `Why` section, an `Action` section, or general explanation when compatible.

## Workflow boundaries

The gate may run inside any workflow or runtime, but it never recommends or changes that workflow. BMAD and Baton remain optional tools chosen outside this policy. Baton documentation may explain worktrees, parallel agents, and resumable workspaces, but task complexity does not select Baton.

Existing acceptance-criteria, backlog, iteration-log, verification, and builder/verifier rules still apply. Policy conflicts stop prohibited work regardless of routing status.
