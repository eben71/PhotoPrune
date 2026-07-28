# Task-routing runtime adapters

This document keeps runtime-specific evidence and configuration mappings separate from the provider-neutral rubric in `docs/ai/TASK_ROUTING.md`.

An adapter may report a runtime only from reliable session metadata, environment information, launcher configuration, or another trustworthy signal. Repository contents, writing style, commands, and self-asserted model knowledge are not runtime evidence.

An adapter is usable for compatibility enforcement only when it can determine all of:

- runtime
- current model or capability configuration
- a maintained mapping from that configuration to `Economical`, `Primary`, or `Frontier`
- current reasoning configuration
- a maintained mapping from that configuration to `Low`, `Medium`, or `High`

If any value or mapping is missing, return `Status: Unable to verify`.

## Codex

Reliable Codex session metadata may identify the runtime as `Codex`. Runtime identity alone does not establish the active model's capability tier or reasoning effort.

This repository currently has no maintained Codex model-to-capability or reasoning-setting adapter. Therefore:

- report `Runtime: Codex` only when session metadata identifies Codex
- report `Status: Unable to verify` unless reliable metadata and a maintained mapping determine both required current values
- do not infer compatibility from a model family name, an agent description, or assumed defaults

## Claude Code

Report `Runtime: Claude Code` only when reliable Claude Code session or launcher metadata is available.

This repository currently has no maintained Claude Code model-to-capability or reasoning-equivalence adapter. Claude Code compatibility therefore remains `Unable to verify`, even when the runtime itself is known.

## Other runtimes

Add a named adapter only when trustworthy runtime detection and maintained capability and reasoning mappings are available. Otherwise report:

```text
Runtime: Unknown
Status: Unable to verify
```

Provider-specific mappings belong here or in local configuration, never in the canonical classification rubric.

## Verification policy

The active policy is `Enforce when detectable`:

- known sufficient configuration: `Compatible`, then continue
- known insufficient configuration: `Change required`, print the required comparison and `PAUSED`, then stop
- incomplete evidence: `Unable to verify`, report the limitation once, then continue

Tests may simulate adapter results to validate comparisons and blocking behavior. Simulated metadata proves policy behavior, not live runtime detection.
