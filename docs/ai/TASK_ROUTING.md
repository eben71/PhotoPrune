# Advisory Task Routing

Use this gate once, before meaningful planning or implementation work. It recommends a workflow, a relative model tier, and a reasoning level; it does not change the active Codex session.

## When to run

Run before meaningful:

- planning or repository-wide analysis
- code or test implementation
- configuration changes
- documentation changes
- BMAD workflow selection or execution
- Baton-managed implementation

Skip repeated checks for internal steps of the same unchanged task. Reassess only when scope materially changes, previously unknown security, persistence, infrastructure, or architectural impact appears, the original classification becomes invalid, or repeated failures indicate that stronger reasoning may be needed.

## Assess the task

Consider all of these dimensions together:

- scope and number of systems or packages involved
- ambiguity and implementation novelty
- architectural and product impact
- security, privacy, data, persistence, and infrastructure risk
- ease of verification
- likelihood that an established repository pattern already exists

Size alone does not make a task High. A large mechanical change can remain Medium.

### Light

Use when the task is mechanical, well defined, low risk, limited to a few files, follows an obvious pattern, is easy to validate, and needs little or no design judgment. Examples include copy or formatting corrections, straightforward renames, minor documentation changes, small isolated tests, and simple configuration corrections.

### Medium

Use for ordinary implementation that touches related files, needs some exploration and judgment, follows established architecture, carries normal regression risk, and can be verified with existing checks. Examples include a standard story, ordinary bug fix, conventional component, or extension of an existing API or workflow.

### High

Use when material ambiguity, missing patterns, architectural or service-boundary changes, authentication or authorization, privacy or security, deletion, persisted data, infrastructure, deployment, schema or migration work, concurrency, complex unknown-cause debugging, substantial product or operational harm, difficult verification, or multiple independent systems are involved.

Repository guardrails remain decisive. A High recommendation never authorizes forbidden work or overrides `AGENT_RULES.md`.

## Recommendation policy

This is the only model-tier mapping for the routing gate. Keep it relative so the policy survives model changes.

| Task tier | Model tier                                | Reasoning |
| --------- | ----------------------------------------- | --------- |
| Light     | Economical coding model, where available  | Light/Low |
| Medium    | Primary coding model                      | Medium    |
| High      | Strongest suitable coding/reasoning model | High      |

Do not invent or promise model names, aliases, commands, capabilities, pricing, or supported reasoning levels. If maintainers want example name mappings, keep them in a single clearly labelled, user-configurable subsection here; no example mapping is currently committed.

Recommend the workflow independently of model strength:

- **Direct Codex** for small, well-defined changes.
- **Baton** for normal, scoped story execution using established repository patterns.
- **BMAD first** when requirements, scope, design, or architecture need resolution before implementation. High or materially ambiguous tasks normally start here.

Light and ordinary Medium work should not receive duplicate BMAD analysis merely because Baton manages its workspace. Existing acceptance criteria, backlog, iteration-log, verification, and builder/verifier separation rules still apply.

## Session suitability

- **Suitable:** the active model and reasoning level are known and meet or exceed the recommendation. Continue unless another repository rule blocks work.
- **Switch recommended:** the active configuration is known and clearly below the recommendation. Stop before substantial planning or implementation, name the required relative model tier and reasoning level, direct the user to `/model`, and give a compact resume instruction.
- **Unable to determine:** session metadata is not reliable or complete. Recommend the relative tier and reasoning level, and ask the user to compare them with `/status` or `/model`. Do not claim the session is suitable or unsuitable.

Unavailable metadata alone does not block normal Medium work. For High work, stop before substantial planning or implementation until the user confirms or selects a suitable configuration.

The gate never invokes `/model`, changes configuration, or claims an automatic switch.

## Required response

Keep the response concise and use this shape:

```text
TASK ROUTING

Complexity: Light | Medium | High
Recommended workflow: Direct Codex | Baton | BMAD first
Recommended model tier: Economical | Primary | Strongest suitable
Recommended reasoning: Light/Low | Medium | High
Current session suitability: Suitable | Switch recommended | Unable to determine

Why:
- concise reason
- concise reason

Key risks:
- risk, or "No material elevated risks identified"

Action:
- Continue with the current session
or
- Before implementation, switch using `/model` to the recommended available model and reasoning level, then resend or resume this task
```

When suitability is `Unable to determine`, the action must also tell the user to compare the recommendation with `/status` or `/model`. If High work is blocked, preserve a short resume instruction such as: `Resume <task> after confirming Strongest suitable / High.`

## Workflow integration

### Codex

Root `AGENTS.md` is the always-loaded entry point. Print the routing block before substantial work, then continue when the session is suitable or when unavailable metadata does not block the selected tier.

### BMAD

Classify before choosing or executing a BMAD skill. Route materially ambiguous or High tasks to the relevant BMAD analysis, product, UX, specification, or architecture workflow before a builder workflow. Do not edit installer-managed BMAD files to enforce this gate; root guidance and this project-owned policy survive BMAD upgrades.

### Baton

Classify before implementation begins in the Baton workspace. Use Baton for an already scoped task with actionable acceptance criteria. Route unresolved High or materially ambiguous work to BMAD first, then return to Baton for implementation. Baton remains a workspace manager; repository artifacts remain the source of truth.

### Policy conflicts

If a request conflicts with `AGENT_RULES.md`, report the conflict as a key risk and stop the forbidden work. A model or workflow recommendation cannot weaken product, delivery, security, or verification rules.
