const capabilityOrder = ["Economical", "Primary", "Frontier"];
const reasoningOrder = ["Low", "Medium", "High"];
const registeredRuntimes = new Set(["Codex", "Claude Code"]);

function meetsOrExceeds(current, required, order) {
  return order.indexOf(current) >= order.indexOf(required);
}

export function assessCompatibility(current, required) {
  if (
    !registeredRuntimes.has(current?.runtime) ||
    !capabilityOrder.includes(current.capability) ||
    !reasoningOrder.includes(current.reasoning)
  ) {
    return { status: "Unable to verify", pause: false };
  }

  const compatible =
    meetsOrExceeds(current.capability, required.capability, capabilityOrder) &&
    meetsOrExceeds(current.reasoning, required.reasoning, reasoningOrder);

  return compatible
    ? { status: "Compatible", pause: false }
    : { status: "Change required", pause: true };
}
