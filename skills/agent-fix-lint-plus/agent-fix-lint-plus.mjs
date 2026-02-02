import path from 'node:path';
import { findRepoRoot } from '../agent-utils/common/repo-root.mjs';
import { loadCiWorkflowSteps } from '../agent-fix-ci/scripts/ci-workflow.mjs';
import { buildCodexCapsule } from '../agent-fix-ci/scripts/codex-capsule.mjs';
import {
  finalizeCodexRun,
  prepareCodexRun,
} from './scripts/codex-guardrails.mjs';
import { runLintFixLoop } from './scripts/lint-fix-loop.mjs';

const args = process.argv.slice(2);
const codexRequested = args.includes('--codex') || args.includes('--ai');
const mode = codexRequested ? 'codex' : 'deterministic';
const rerunFlag = args.includes('--ai') ? '--ai' : '--codex';

const repoRoot = findRepoRoot(process.cwd());

if (!repoRoot) {
  console.error(
    'Unable to locate PhotoPrune repo root. Run from within the repository.'
  );
  process.exit(1);
}

const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
const steps = loadCiWorkflowSteps(workflowPath);
const lintSteps = steps.filter((step) =>
  step.name.toLowerCase().includes('lint')
);

if (lintSteps.length === 0) {
  console.error('No lint steps found in .github/workflows/ci.yml.');
  process.exit(1);
}

console.log('PhotoPrune lint checks discovered:');
lintSteps.forEach((step, index) => {
  console.log(
    `${index + 1}. ${step.name} -> ${step.run} (cwd: ${
      step.workingDirectory ?? '.'
    })`
  );
});

let codexState = null;
let summary = null;

if (codexRequested) {
  const prepared = prepareCodexRun(repoRoot);
  codexState = prepared.state ?? null;
  if (prepared.stop) {
    summary = {
      checks: [],
      fixed: [],
      stopped: {
        stepName: 'Guardrail',
        stepCommand: 'N/A',
        stepWorkingDirectory: '.',
        output: prepared.stop.output ?? '',
        reason: prepared.stop.reason,
      },
      mode,
    };
  }
}

if (!summary) {
  summary = runLintFixLoop({
    steps: lintSteps,
    repoRoot,
    mode,
  });
}

if (codexRequested) {
  finalizeCodexRun(repoRoot, codexState, summary);
}

console.log('\nSummary:');
summary.checks.forEach((check) => {
  console.log(
    `- ${check.name}: ${check.status} (${check.command}) [cwd: ${check.workingDirectory}]`
  );
});

if (summary.fixed.length > 0) {
  console.log('\nAuto-fixes applied:');
  summary.fixed.forEach((fix) => {
    console.log(`- ${fix.step}: ${fix.summary} (${fix.fixCommand})`);
  });
}

if (summary.stopped) {
  if (mode === 'codex') {
    const guardrails = [
      'Never modify CI config or weaken checks.',
      'Never delete tests.',
      'Do not change business logic semantics to satisfy lint.',
      'Do not auto-commit changes.',
      'Prefer minimal, reviewable diffs.',
    ];
    const allowedActions = [
      'edit_files',
      'run_commands',
      'update_tests_only_if_test_expected_is_wrong',
    ];
    const capsule = buildCodexCapsule({
      repoRoot,
      stopped: summary.stopped,
      guardrails,
      allowedActions,
      rerunCommand: `node skills/agent-fix-lint-plus/agent-fix-lint-plus.mjs ${rerunFlag}`,
    });
    console.log('CODEX_REPAIR_REQUIRED');
    console.log(JSON.stringify(capsule));
    process.exit(2);
  }

  console.log(
    `\nStopped: manual intervention required (${summary.stopped.reason})`
  );
  console.log(
    'Tip: re-run with --codex to emit a repair capsule for AI-assisted fixing.'
  );
  process.exit(1);
}

console.log('\nLint checks green — ready to commit');
