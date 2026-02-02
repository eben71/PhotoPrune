import path from 'node:path';
import { findRepoRoot } from '../../scripts/agent-utils/common/repo-root.mjs';
import {
  loadCiWorkflowSteps,
  selectCiCheckSteps,
} from '../../scripts/agent-utils/fix-ci/ci-workflow.mjs';
import { runFixLoop } from '../../scripts/agent-utils/fix-ci/fix-loop.mjs';
import { classifyFailure } from '../../scripts/agent-utils/fix-ci/failure-parser.mjs';

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
  console.log(
    `\nStopped: manual intervention required (${summary.stopped.reason})`
  );
  process.exit(1);
}

console.log('\nPhotoPrune CI checks green — ready to commit');
