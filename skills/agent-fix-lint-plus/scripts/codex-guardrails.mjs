import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const STATE_DIR = '.codex';
const STATE_FILE = 'agent-fix-lint-plus.json';
const MAX_ITERATIONS = 7;
const MAX_FILES_CHANGED = 10;
const MAX_LINES_CHANGED = 300;
const FORBIDDEN_PREFIX = '.github/workflows/';

function readState(statePath) {
  if (!fs.existsSync(statePath)) {
    return {
      iteration: 0,
      lastFailureSignature: null,
      repeatCount: 0,
      lastDiffStats: { files: {} },
    };
  }
  const raw = fs.readFileSync(statePath, 'utf8');
  return JSON.parse(raw);
}

function writeState(statePath, state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function deleteState(statePath) {
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

function getStatePath(repoRoot) {
  return path.join(repoRoot, STATE_DIR, STATE_FILE);
}

function parseNumstatLine(line) {
  const [addedRaw, deletedRaw, file] = line.split('\t');
  if (!file) {
    return null;
  }
  const added = Number.isNaN(Number(addedRaw)) ? 0 : Number(addedRaw);
  const deleted = Number.isNaN(Number(deletedRaw)) ? 0 : Number(deletedRaw);
  return { file, added, deleted };
}

function getDiffStats(repoRoot) {
  const result = spawnSync('git diff --numstat', {
    shell: true,
    cwd: repoRoot,
    env: process.env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return { files: {}, error: result.stderr || result.stdout };
  }
  const files = {};
  const lines = (result.stdout || '').trim().split('\n').filter(Boolean);
  for (const line of lines) {
    const parsed = parseNumstatLine(line);
    if (!parsed) {
      continue;
    }
    files[parsed.file] = { added: parsed.added, deleted: parsed.deleted };
  }
  return { files };
}

function diffDelta(prevStats, nextStats) {
  const files = new Set([
    ...Object.keys(prevStats.files || {}),
    ...Object.keys(nextStats.files || {}),
  ]);
  let changedFiles = 0;
  let changedLines = 0;
  for (const file of files) {
    const prev = prevStats.files?.[file];
    const next = nextStats.files?.[file];
    const prevTotal = prev ? prev.added + prev.deleted : 0;
    const nextTotal = next ? next.added + next.deleted : 0;
    if (prevTotal !== nextTotal) {
      changedFiles += 1;
      changedLines += Math.abs(nextTotal - prevTotal);
    }
  }
  return { changedFiles, changedLines };
}

function containsForbiddenFiles(stats) {
  return Object.keys(stats.files || {}).some((file) =>
    file.startsWith(FORBIDDEN_PREFIX)
  );
}

export function prepareCodexRun(repoRoot) {
  const statePath = getStatePath(repoRoot);
  const state = readState(statePath);
  const nextIteration = state.iteration + 1;
  if (nextIteration > MAX_ITERATIONS) {
    return {
      stop: {
        reason: `Guardrail triggered: max iterations (${MAX_ITERATIONS}) reached.`,
        output: '',
      },
      state,
    };
  }

  const diffStats = getDiffStats(repoRoot);
  if (diffStats.error) {
    return {
      stop: {
        reason: 'Guardrail triggered: unable to read git diff state.',
        output: diffStats.error,
      },
      state,
    };
  }

  if (containsForbiddenFiles(diffStats)) {
    return {
      stop: {
        reason: 'Guardrail triggered: forbidden files modified (.github/workflows).',
        output: '',
      },
      state,
    };
  }

  const delta = diffDelta(state.lastDiffStats || { files: {} }, diffStats);
  if (delta.changedFiles > MAX_FILES_CHANGED) {
    return {
      stop: {
        reason: `Guardrail triggered: ${delta.changedFiles} files changed (max ${MAX_FILES_CHANGED}).`,
        output: '',
      },
      state,
    };
  }

  if (delta.changedLines > MAX_LINES_CHANGED) {
    return {
      stop: {
        reason: `Guardrail triggered: ${delta.changedLines} lines changed (max ${MAX_LINES_CHANGED}).`,
        output: '',
      },
      state,
    };
  }

  state.iteration = nextIteration;
  state.lastDiffStats = diffStats;
  writeState(statePath, state);

  return { stop: null, state };
}

export function finalizeCodexRun(repoRoot, state, summary) {
  if (!state) {
    return;
  }
  const statePath = getStatePath(repoRoot);
  if (!summary.stopped) {
    deleteState(statePath);
    return;
  }

  const signature = `${summary.stopped.stepName}::${summary.stopped.reason}`;
  if (signature === state.lastFailureSignature) {
    state.repeatCount = (state.repeatCount || 0) + 1;
  } else {
    state.repeatCount = 1;
  }
  state.lastFailureSignature = signature;

  if (state.repeatCount >= 2) {
    summary.stopped.reason = `Guardrail triggered: repeated failure for ${summary.stopped.stepName}.`;
  }

  writeState(statePath, state);
}
