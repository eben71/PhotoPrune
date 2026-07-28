import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { assessCompatibility } from "../../scripts/task-routing-policy.mjs";

const policy = await readFile(
  new URL("../../docs/ai/TASK_ROUTING.md", import.meta.url),
  "utf8",
);
const adapters = await readFile(
  new URL("../../docs/ai/TASK_ROUTING_RUNTIME_ADAPTERS.md", import.meta.url),
  "utf8",
);
const batonGuide = await readFile(
  new URL("../../docs/delivery/BATON_WORKTREE_GUIDE.md", import.meta.url),
  "utf8",
);
const deliveryWorkflow = await readFile(
  new URL("../../docs/delivery/WORKFLOW.md", import.meta.url),
  "utf8",
);
const rootAgents = await readFile(
  new URL("../../AGENTS.md", import.meta.url),
  "utf8",
);
const contributing = await readFile(
  new URL("../../docs/CONTRIBUTING.md", import.meta.url),
  "utf8",
);

test("canonical output contains only capability-routing fields", () => {
  const requiredOutput = policy.slice(policy.indexOf("## Required output"));

  for (const field of [
    "Complexity:",
    "Capability tier:",
    "Reasoning effort:",
    "Runtime:",
    "Status:",
  ]) {
    assert.match(requiredOutput, new RegExp(field));
  }

  for (const removedField of [
    "Recommended workflow:",
    "Development workflow:",
    "Workspace orchestration:",
    "Recommended model tier:",
    "Why:",
    "Action:",
  ]) {
    assert.doesNotMatch(requiredOutput, new RegExp(removedField));
  }
});

test("canonical policy is provider-neutral and keeps adapters separate", () => {
  const canonicalRubric = policy.slice(0, policy.indexOf("## Required output"));

  assert.doesNotMatch(canonicalRubric, /GPT|Claude \d|OpenAI|Anthropic/i);
  assert.match(policy, /TASK_ROUTING_RUNTIME_ADAPTERS\.md/);
  assert.match(adapters, /## Codex/);
  assert.match(adapters, /## Claude Code/);
});

test("classification defaults map to provider-neutral capability and reasoning", () => {
  for (const row of [
    "| Light      | Economical              | Low",
    "| Medium     | Primary                 | Medium",
    "| High       | Frontier                | High",
  ]) {
    assert.ok(policy.includes(row));
  }

  assert.match(
    policy,
    /small authentication or authorization changes[\s\S]*remains High[\s\S]*High reasoning/,
  );
});

test("known sufficient configuration is compatible", () => {
  assert.deepEqual(
    assessCompatibility(
      { runtime: "Codex", capability: "Frontier", reasoning: "High" },
      { capability: "Primary", reasoning: "Medium" },
    ),
    { status: "Compatible", pause: false },
  );
});

test("a detected mismatch pauses before implementation", () => {
  assert.deepEqual(
    assessCompatibility(
      { runtime: "Codex", capability: "Economical", reasoning: "Low" },
      { capability: "Primary", reasoning: "Medium" },
    ),
    { status: "Change required", pause: true },
  );
  assert.match(policy, /Then stop before implementation/);
  assert.match(policy, /PAUSED/);
});

test("unknown or incompletely mapped runtime cannot claim compatibility", () => {
  for (const current of [
    { runtime: undefined, capability: undefined, reasoning: undefined },
    { runtime: "Unknown", capability: "Frontier", reasoning: "High" },
    {
      runtime: "Unregistered Runtime",
      capability: "Frontier",
      reasoning: "High",
    },
  ]) {
    assert.deepEqual(
      assessCompatibility(current, {
        capability: "Primary",
        reasoning: "Medium",
      }),
      { status: "Unable to verify", pause: false },
    );
  }
  assert.match(policy, /Enforce when detectable/);
});

test("Baton is documented only as optional advanced orchestration", () => {
  assert.match(
    batonGuide,
    /optional workspace-orchestration tool for advanced/i,
  );
  assert.match(batonGuide, /not required to:[\s\S]*use Codex[\s\S]*use BMAD/i);
  assert.match(batonGuide, /does not replace Codex or BMAD/i);
  assert.match(
    deliveryWorkflow,
    /Story[\s\S]*ChatGPT Desktop[\s\S]*Codex[\s\S]*Selected BMAD workflow/,
  );
  assert.match(deliveryWorkflow, /Baton is not required/i);
  assert.match(
    rootAgents,
    /Consult .*BATON_WORKTREE_GUIDE.* only when using Baton/i,
  );
  assert.match(
    contributing,
    /Baton is not required for Codex, BMAD, or a single development task/i,
  );

  for (const currentGuidance of [
    policy,
    batonGuide,
    deliveryWorkflow,
    rootAgents,
    contributing,
  ]) {
    assert.doesNotMatch(
      currentGuidance,
      /(?:Medium|High).{0,80}(?:use|choose|requires?) Baton/is,
    );
  }
});
