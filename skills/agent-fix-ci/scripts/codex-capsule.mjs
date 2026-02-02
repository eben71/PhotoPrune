const OUTPUT_TAIL_LINES = 200;

function tailLines(output, maxLines = OUTPUT_TAIL_LINES) {
  if (!output) {
    return '';
  }
  const lines = output.split(/\r?\n/);
  return lines.slice(-maxLines).join('\n');
}

export function buildCodexCapsule({
  repoRoot,
  stopped,
  guardrails,
  allowedActions,
  rerunCommand,
}) {
  return {
    repoRoot,
    failedStep: {
      name: stopped.stepName,
      command: stopped.stepCommand,
      workingDirectory: stopped.stepWorkingDirectory,
    },
    failureReason: stopped.reason,
    outputTail: tailLines(stopped.output),
    guardrails,
    allowedActions,
    rerunCommand,
  };
}
