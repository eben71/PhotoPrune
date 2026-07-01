import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const script = join(repoRoot, 'scripts', 'check-python-lock-pins.py');
const uv = process.env.UV || 'uv';

function hasUv() {
  return spawnSync(uv, ['--version'], { encoding: 'utf8' }).status === 0;
}

function writeService(root, service, ruffVersion) {
  const dir = join(root, service);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'pyproject.toml'),
    `[project]\ndependencies = ["fastapi==1.0.0"]\n\n[dependency-groups]\ndev = ["ruff==0.15.20"]\n`,
  );
  writeFileSync(
    join(dir, 'uv.lock'),
    `name = "fastapi"\nversion = "1.0.0"\n\nname = "ruff"\nversion = "${ruffVersion}"\n`,
  );
  writeFileSync(join(dir, 'requirements-dev.lock'), `fastapi==1.0.0\nruff==${ruffVersion}\n`);
}

test('reports exact Python pin drift against a fixture repo root', { skip: !hasUv() }, () => {
  const root = mkdtempSync(join(tmpdir(), 'photoprune-python-pins-'));
  const uvCache = mkdtempSync(join(tmpdir(), 'photoprune-uv-cache-'));
  writeService(root, 'apps/api', '0.15.20');
  writeService(root, 'apps/worker', '0.15.18');

  const result = spawnSync(uv, ['run', 'python', script, '--root', root], {
    cwd: repoRoot,
    env: { ...process.env, UV_CACHE_DIR: uvCache },
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /apps[\\/]worker[\\/]uv\.lock has ruff==0\.15\.18/);
  assert.match(result.stderr, /Run `make python-locks`/);
});

test('passes when fixture service locks match exact pins', { skip: !hasUv() }, () => {
  const root = mkdtempSync(join(tmpdir(), 'photoprune-python-pins-'));
  const uvCache = mkdtempSync(join(tmpdir(), 'photoprune-uv-cache-'));
  writeService(root, 'apps/api', '0.15.20');
  writeService(root, 'apps/worker', '0.15.20');

  const result = spawnSync(uv, ['run', 'python', script, '--root', root], {
    cwd: repoRoot,
    env: { ...process.env, UV_CACHE_DIR: uvCache },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Python exact dependency pins match/);
});
