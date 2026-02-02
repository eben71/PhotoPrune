import { spawnSync } from 'node:child_process';
import path from 'node:path';

const MAX_OUTPUT_CHARS = 2 * 1024 * 1024;
const MAX_FIX_ATTEMPTS = 3;

function capOutput(output) {
  if (output.length <= MAX_OUTPUT_CHARS) {
    return output;
  }
  return output.slice(-MAX_OUTPUT_CHARS);
}

function runCommand(command, cwd) {
  const result = spawnSync(command, {
    shell: true,
    cwd,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const output = capOutput(`${stdout}${stderr}`);

  if (stdout) {
    process.stdout.write(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
  }

  return {
    status: result.status ?? 1,
    output,
  };
}

export function runFixLoop({ steps, repoRoot, classifyFailure, mode }) {
  const summary = {
    checks: [],
    fixed: [],
    stopped: null,
    mode,
  };

  for (const step of steps) {
    const workingDirectory = step.workingDirectory
      ? path.resolve(repoRoot, step.workingDirectory)
      : repoRoot;
    let fixAttempts = 0;
    let attemptLabel = 0;

    while (true) {
      const label = attemptLabel === 0 ? step.name : `${step.name} (re-run ${attemptLabel})`;
      process.stdout.write(
        `\n==> Running: ${label}\n` +
          `Command: ${step.run}\n` +
          `Working directory: ${workingDirectory}\n`
      );

      const result = runCommand(step.run, workingDirectory);
      const stepOutput = result.output;
      summary.checks.push({
        name: label,
        command: step.run,
        workingDirectory: step.workingDirectory ?? '.',
        status: result.status === 0 ? 'passed' : 'failed',
      });

      if (result.status === 0) {
        break;
      }

      const failure = classifyFailure(step, stepOutput);

      if (!failure.fixable) {
        summary.stopped = {
          stepName: step.name,
          stepCommand: step.run,
          stepWorkingDirectory: step.workingDirectory ?? '.',
          output: stepOutput,
          reason: failure.reason,
        };
        return summary;
      }

      fixAttempts += 1;
      if (fixAttempts > MAX_FIX_ATTEMPTS) {
        summary.stopped = {
          stepName: step.name,
          stepCommand: step.run,
          stepWorkingDirectory: step.workingDirectory ?? '.',
          output: stepOutput,
          reason: `Guardrail triggered: exceeded ${MAX_FIX_ATTEMPTS} auto-fix attempts for ${step.name}.`,
        };
        return summary;
      }

      process.stdout.write(
        `\nAttempting auto-fix (${fixAttempts}/${MAX_FIX_ATTEMPTS}): ${failure.fixCommand}\n` +
          `Reason: ${failure.reason}\n`
      );

      const fixResult = runCommand(failure.fixCommand, repoRoot);
      summary.fixed.push({
        step: step.name,
        fixCommand: failure.fixCommand,
        summary: failure.fixSummary ?? 'Applied auto-fix.',
        status: fixResult.status === 0 ? 'applied' : 'failed',
      });

      if (fixResult.status !== 0) {
        summary.stopped = {
          stepName: step.name,
          stepCommand: step.run,
          stepWorkingDirectory: step.workingDirectory ?? '.',
          output: fixResult.output,
          reason: 'Auto-fix command failed.',
        };
        return summary;
      }

      attemptLabel += 1;
    }
  }

  return summary;
}
