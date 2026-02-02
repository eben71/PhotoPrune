const FORMAT_CHECK_PATTERNS = ['make format-check', 'format:check'];
const LINT_PATTERNS = [
  'eslint',
  'turbo lint',
  'pnpm lint',
  'npm run lint',
  'yarn lint',
  'make lint',
];
const TYPECHECK_PATTERNS = [
  'typecheck',
  'type-check',
  'tsc',
  'turbo typecheck',
  'pnpm typecheck',
  'npm run typecheck',
  'yarn typecheck',
];
const TEST_PATTERNS = [
  'jest',
  'vitest',
  'pytest',
  'pnpm test',
  'npm test',
  'yarn test',
  'make test',
];
const COVERAGE_PATTERNS = [
  'coverage gate',
  'check-coverage',
  'coverage threshold',
  'coverage minimum',
  'coverage not met',
  'coverage below',
  'coverage failed',
  'coverage-summary',
  'coverage-summary.json',
];
const BUILD_PATTERNS = [
  'turbo build',
  'pnpm build',
  'npm run build',
  'yarn build',
  'make build',
];
const DOCS_PATTERNS = [
  'docs',
  'docs:check',
  'docs:lint',
  'markdownlint',
  'mdlint',
];
const AUDIT_PATTERNS = [
  'audit',
  'npm audit',
  'pnpm audit',
  'yarn audit',
  'audit-ci',
];

function matchesPatterns(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

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

  const match = (patterns) =>
    matchesPatterns(normalizedRun, patterns) ||
    matchesPatterns(normalizedOutput, patterns);

  if (match(LINT_PATTERNS)) {
    const hasEslint =
      normalizedRun.includes('eslint') || normalizedOutput.includes('eslint');
    return {
      fixable: false,
      reason: hasEslint ? 'Lint failed (eslint).' : 'Lint failed.',
    };
  }

  if (match(TYPECHECK_PATTERNS)) {
    return {
      fixable: false,
      reason: 'Type check failed.',
    };
  }

  if (match(TEST_PATTERNS)) {
    return {
      fixable: false,
      reason: 'Tests failed.',
    };
  }

  if (match(COVERAGE_PATTERNS)) {
    return {
      fixable: false,
      reason: 'Coverage gate failed.',
    };
  }

  if (match(BUILD_PATTERNS)) {
    return {
      fixable: false,
      reason: 'Build failed.',
    };
  }

  if (match(DOCS_PATTERNS)) {
    return {
      fixable: false,
      reason: 'Documentation guard failed.',
    };
  }

  if (match(AUDIT_PATTERNS)) {
    return {
      fixable: false,
      reason: 'Dependency audit failed.',
    };
  }

  return {
    fixable: false,
    reason: 'Manual investigation required.',
  };
}
