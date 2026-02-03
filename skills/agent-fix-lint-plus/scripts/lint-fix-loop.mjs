import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MAX_OUTPUT_CHARS = 2 * 1024 * 1024;
const MAX_FIX_ATTEMPTS = 2;
const LINT_FAILURE_REASON = 'Lint failed.';

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

function readPackageJson(packagePath) {
  if (!fs.existsSync(packagePath)) {
    return null;
  }
  const raw = fs.readFileSync(packagePath, 'utf8');
  return JSON.parse(raw);
}

function getScripts(repoRoot) {
  const rootPackage = readPackageJson(path.join(repoRoot, 'package.json'));
  return rootPackage?.scripts ?? {};
}

function normalize(text) {
  return (text || '').toLowerCase();
}

function scriptIncludes(script, fragment) {
  return normalize(script).includes(fragment);
}

function hasLintFixScript(scripts) {
  return typeof scripts['lint:fix'] === 'string';
}

function usesTurboLint(scripts, stepRun) {
  return (
    scriptIncludes(scripts.lint, 'turbo lint') ||
    normalize(stepRun).includes('turbo lint')
  );
}

function usesPnpmRecursiveLint(scripts, stepRun) {
  const normalized = normalize(stepRun);
  return (
    scriptIncludes(scripts.lint, 'pnpm -r lint') ||
    scriptIncludes(scripts.lint, 'pnpm --recursive lint') ||
    normalized.includes('pnpm -r lint') ||
    normalized.includes('pnpm --recursive lint')
  );
}

function hasEslintDependency(packageDir) {
  const packageJson = readPackageJson(path.join(packageDir, 'package.json'));
  const deps = packageJson?.dependencies ?? {};
  const devDeps = packageJson?.devDependencies ?? {};
  return Boolean(deps.eslint || devDeps.eslint);
}

function detectFailingPackages(output) {
  const normalized = normalize(output);
  const targets = [];
  if (/apps[\\/]+web/.test(normalized)) {
    targets.push('apps/web');
  }
  if (/packages[\\/]+shared/.test(normalized)) {
    targets.push('packages/shared');
  }
  return targets;
}

function detectRuffTargets(output) {
  const normalized = normalize(output);
  const targets = [];
  if (normalized.includes('apps/api')) {
    targets.push('apps/api');
  }
  if (normalized.includes('apps/worker')) {
    targets.push('apps/worker');
  }
  if (targets.length === 0 && normalized.includes('ruff')) {
    if (fs.existsSync(path.join(process.cwd(), 'apps', 'api'))) {
      targets.push('apps/api');
    }
    if (fs.existsSync(path.join(process.cwd(), 'apps', 'worker'))) {
      targets.push('apps/worker');
    }
  }
  return targets;
}

function buildRuffFixCommands(repoRoot, output) {
  const normalized = normalize(output);
  if (!normalized.includes('ruff')) {
    return [];
  }
  const targets = detectRuffTargets(output);
  if (targets.length === 0) {
    return [];
  }

  return targets.map((target) => ({
    command: 'uv run ruff check app tests --fix',
    cwd: path.join(repoRoot, target),
    summary: `Applied ruff --fix in ${target}.`,
  }));
}

function buildEslintFallbackCommands(repoRoot, output) {
  const targets = detectFailingPackages(output);
  if (targets.length === 0) {
    return [];
  }

  const commands = [];

  if (targets.includes('apps/web')) {
    const webDir = path.join(repoRoot, 'apps', 'web');
    if (fs.existsSync(webDir) && hasEslintDependency(webDir)) {
      commands.push({
        command: 'pnpm exec eslint . --fix',
        cwd: webDir,
        summary: 'Applied eslint --fix in apps/web.',
      });
    }
  }

  if (targets.includes('packages/shared')) {
    const sharedDir = path.join(repoRoot, 'packages', 'shared');
    if (fs.existsSync(sharedDir) && hasEslintDependency(sharedDir)) {
      commands.push({
        command: 'pnpm exec eslint "src/**/*.{ts,tsx}" --fix',
        cwd: sharedDir,
        summary: 'Applied eslint --fix in packages/shared.',
      });
    }
  }

  return commands;
}

function getLintFixPlan({ repoRoot, step, output }) {
  const scripts = getScripts(repoRoot);
  if (hasLintFixScript(scripts)) {
    return [
      {
        command: 'pnpm lint:fix',
        cwd: repoRoot,
        summary: 'Applied pnpm lint:fix.',
      },
    ];
  }

  if (usesTurboLint(scripts, step.run)) {
    return [
      {
        command: 'pnpm exec turbo lint -- --fix',
        cwd: repoRoot,
        summary: 'Applied turbo lint -- --fix.',
      },
    ];
  }

  if (usesPnpmRecursiveLint(scripts, step.run)) {
    return [
      {
        command: 'pnpm -r lint -- --fix',
        cwd: repoRoot,
        summary: 'Applied pnpm recursive lint -- --fix.',
      },
    ];
  }

  const ruffFixes = buildRuffFixCommands(repoRoot, output);
  if (ruffFixes.length > 0) {
    return ruffFixes;
  }

  const fallbackCommands = buildEslintFallbackCommands(repoRoot, output);
  if (fallbackCommands.length > 0) {
    return fallbackCommands;
  }

  return null;
}

export function runLintFixLoop({ steps, repoRoot, mode }) {
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
      const label =
        attemptLabel === 0 ? step.name : `${step.name} (re-run ${attemptLabel})`;
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

      const fixPlan = getLintFixPlan({ repoRoot, step, output: stepOutput });
      if (!fixPlan) {
        summary.stopped = {
          stepName: step.name,
          stepCommand: step.run,
          stepWorkingDirectory: step.workingDirectory ?? '.',
          output: stepOutput,
          reason: LINT_FAILURE_REASON,
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
          reason: LINT_FAILURE_REASON,
        };
        return summary;
      }

      for (const fixCommand of fixPlan) {
        process.stdout.write(
          `\nAttempting auto-fix (${fixAttempts}/${MAX_FIX_ATTEMPTS}): ${fixCommand.command}\n` +
            `Reason: ${LINT_FAILURE_REASON}\n`
        );

        const fixResult = runCommand(fixCommand.command, fixCommand.cwd);
        summary.fixed.push({
          step: step.name,
          fixCommand: fixCommand.command,
          summary: fixCommand.summary ?? 'Applied auto-fix.',
          status: fixResult.status === 0 ? 'applied' : 'failed',
        });

        if (fixResult.status !== 0) {
          summary.stopped = {
            stepName: step.name,
            stepCommand: step.run,
            stepWorkingDirectory: step.workingDirectory ?? '.',
            output: fixResult.output,
            reason: LINT_FAILURE_REASON,
          };
          return summary;
        }
      }

      attemptLabel += 1;
    }
  }

  return summary;
}
