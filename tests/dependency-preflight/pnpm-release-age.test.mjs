import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const script = join(repoRoot, 'scripts', 'check-pnpm-release-age.mjs');

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'photoprune-pnpm-age-'));
}

function writeFixture(dir, publishedAt) {
  const lockfile = join(dir, 'pnpm-lock.yaml');
  const workspace = join(dir, 'pnpm-workspace.yaml');
  const registry = join(dir, 'registry.json');
  writeFileSync(
    lockfile,
    `lockfileVersion: '9.0'\n\npackages:\n\n  turbo@2.10.2:\n    resolution: {integrity: sha512-test}\n`,
  );
  writeFileSync(workspace, 'minimumReleaseAge: 1440\n');
  writeFileSync(registry, JSON.stringify({ turbo: { '2.10.2': publishedAt } }));
  return { lockfile, workspace, registry };
}

test('fails with actionable output for too-new locked packages', () => {
  const dir = tempDir();
  const { lockfile, workspace, registry } = writeFixture(dir, '2026-07-01T00:00:00.000Z');
  const result = spawnSync(
    process.execPath,
    [
      script,
      '--lockfile',
      lockfile,
      '--workspace',
      workspace,
      '--registry-fixture',
      registry,
      '--now',
      '2026-07-01T12:00:00.000Z',
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /turbo@2\.10\.2/);
  assert.match(result.stderr, /safe after 2026-07-02T00:00:00\.000Z/);
  assert.match(result.stderr, /do not bypass the release-age policy/);
});

test('passes when locked packages are older than the configured release age', () => {
  const dir = tempDir();
  const { lockfile, workspace, registry } = writeFixture(dir, '2026-06-29T00:00:00.000Z');
  const result = spawnSync(
    process.execPath,
    [
      script,
      '--lockfile',
      lockfile,
      '--workspace',
      workspace,
      '--registry-fixture',
      registry,
      '--now',
      '2026-07-01T12:00:00.000Z',
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /pnpm release-age preflight passed/);
});

test('honors packages excluded from pnpm release-age policy', () => {
  const dir = tempDir();
  const { lockfile, workspace, registry } = writeFixture(dir, '2026-07-01T00:00:00.000Z');
  writeFileSync(workspace, "minimumReleaseAge: 1440\nminimumReleaseAgeExclude:\n  - turbo\n");
  const result = spawnSync(
    process.execPath,
    [
      script,
      '--lockfile',
      lockfile,
      '--workspace',
      workspace,
      '--registry-fixture',
      registry,
      '--now',
      '2026-07-01T12:00:00.000Z',
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /pnpm release-age preflight passed/);
});

test('fails closed when registry metadata is unavailable', () => {
  const dir = tempDir();
  const { lockfile, workspace, registry } = writeFixture(dir, null);
  const result = spawnSync(
    process.execPath,
    [
      script,
      '--lockfile',
      lockfile,
      '--workspace',
      workspace,
      '--registry-fixture',
      registry,
      '--now',
      '2026-07-01T12:00:00.000Z',
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /metadata was unavailable/);
  assert.match(result.stderr, /must not bypass release-age policy/);
});
