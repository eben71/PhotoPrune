import path from 'node:path';
import { findRepoRoot } from '../agent-utils/common/repo-root.mjs';
import {
  loadCiWorkflowSteps,
  selectCiCheckSteps,
} from './scripts/ci-workflow.mjs';
import { runFixLoop } from './scripts/fix-loop.mjs';
import { classifyFailure } from './scripts/failure-parser.mjs';
import { buildCodexCapsule } from './scripts/codex-capsule.mjs';

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
const checkSteps = selectCiCheckSteps(steps);

if (checkSteps.length === 0) {
  console.error('No CI run steps found in .github/workflows/ci.yml.');
  process.exit(1);
}

console.log('PhotoPrune CI checks discovered:');
checkSteps.forEach((step, index) => {
  console.log(
    `${index + 1}. ${step.name} -> ${step.run} (cwd: ${
      step.workingDirectory ?? '.'
    })`
  );
});

const summary = runFixLoop({
  steps: checkSteps,
  repoRoot,
  classifyFailure,
  mode,
});

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
      'Do not change business logic semantics to satisfy tests.',
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
      rerunCommand: `node skills/agent-fix-ci/agent-fix-ci.mjs ${rerunFlag}`,
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

console.log('\nPhotoPrune CI checks green — ready to commit');
