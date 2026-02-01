const FORMAT_CHECK_PATTERNS = ['make format-check', 'format:check'];

export function classifyFailure(step, output) {
  const normalizedRun = step.run.toLowerCase();
  const normalizedOutput = output.toLowerCase();

  if (FORMAT_CHECK_PATTERNS.some((pattern) => normalizedRun.includes(pattern))) {
    return {
      fixable: true,
      reason: 'Formatting check failed.',
      fixCommand: 'make format',
      fixSummary: 'Applied automatic formatting (Prettier + Black).',
    };
  }

  if (normalizedOutput.includes('command not found') || normalizedOutput.includes('enoent')) {
    return {
      fixable: false,
      reason: 'Missing required tooling. Ensure dependencies are installed.',
    };
  }

  return {
    fixable: false,
    reason: 'Manual investigation required.',
  };
}
