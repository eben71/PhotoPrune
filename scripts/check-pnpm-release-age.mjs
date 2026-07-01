#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const DEFAULT_MINIMUM_RELEASE_AGE_MINUTES = 1440;

function parseArgs(argv) {
  const options = {
    lockfile: 'pnpm-lock.yaml',
    workspace: 'pnpm-workspace.yaml',
    now: new Date(),
    registryFixture: '',
    registryUrl: process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmjs.org',
    allowMissingMetadata: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--lockfile' && next) {
      options.lockfile = next;
      index += 1;
    } else if (arg === '--workspace' && next) {
      options.workspace = next;
      index += 1;
    } else if (arg === '--now' && next) {
      options.now = new Date(next);
      index += 1;
    } else if (arg === '--registry-fixture' && next) {
      options.registryFixture = next;
      index += 1;
    } else if (arg === '--registry-url' && next) {
      options.registryUrl = next.replace(/\/$/, '');
      index += 1;
    } else if (arg === '--allow-missing-metadata') {
      options.allowMissingMetadata = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (Number.isNaN(options.now.valueOf())) {
    throw new Error('Invalid --now timestamp');
  }
  return options;
}

function extractListBlock(text, key) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) {
    return [];
  }
  const values = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) {
      break;
    }
    const match = line.match(/^\s*-\s+['"]?([^'"]+)['"]?\s*$/);
    if (match) {
      values.push(match[1]);
    }
  }
  return values;
}

function readPolicy(workspacePath) {
  if (!existsSync(workspacePath)) {
    return { minimumReleaseAgeMinutes: DEFAULT_MINIMUM_RELEASE_AGE_MINUTES, excluded: new Set() };
  }
  const workspace = readFileSync(workspacePath, 'utf8');
  const ageMatch = workspace.match(/^minimumReleaseAge:\s*(\d+)\s*$/m);
  return {
    minimumReleaseAgeMinutes: ageMatch
      ? Number.parseInt(ageMatch[1], 10)
      : DEFAULT_MINIMUM_RELEASE_AGE_MINUTES,
    excluded: new Set(extractListBlock(workspace, 'minimumReleaseAgeExclude')),
  };
}

function parsePackageKey(rawKey) {
  const key = rawKey.replace(/^['"]|['"]:?\s*$/g, '').replace(/:$/, '');
  const marker = key.startsWith('@') ? key.indexOf('@', 1) : key.lastIndexOf('@');
  if (marker <= 0) {
    return null;
  }
  const name = key.slice(0, marker);
  const versionWithPeers = key.slice(marker + 1);
  const version = versionWithPeers.split('(')[0];
  if (!name || !/^\d+\.\d+\.\d+/.test(version)) {
    return null;
  }
  return { name, version };
}

export function extractLockedPackages(lockfileText) {
  const packages = new Map();
  const lines = lockfileText.split(/\r?\n/);
  let inPackages = false;
  for (const line of lines) {
    if (line === 'packages:') {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line) && line.trim() !== '') {
      break;
    }
    if (!inPackages) {
      continue;
    }
    const match = line.match(/^  ([^ ].*):\s*$/);
    if (!match) {
      continue;
    }
    const parsed = parsePackageKey(match[1]);
    if (parsed) {
      packages.set(`${parsed.name}@${parsed.version}`, parsed);
    }
  }
  return [...packages.values()].sort((left, right) =>
    `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`),
  );
}

function readFixture(path) {
  if (!path) {
    return null;
  }
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return (name, version) => {
    const flat = data[`${name}@${version}`];
    const nested = data[name]?.[version];
    return flat || nested || null;
  };
}

function registryPackageUrl(registryUrl, name) {
  const encoded = name.startsWith('@')
    ? `@${encodeURIComponent(name.slice(1))}`
    : encodeURIComponent(name);
  return `${registryUrl.replace(/\/$/, '')}/${encoded}`;
}

async function fetchPackageTimes(registryUrl, name) {
  const response = await fetch(registryPackageUrl(registryUrl, name), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`npm registry returned ${response.status} for ${name}`);
  }
  const packument = await response.json();
  return packument.time || {};
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const policy = readPolicy(options.workspace);
  const cutoff = new Date(options.now.getTime() - policy.minimumReleaseAgeMinutes * 60_000);
  const fixtureLookup = readFixture(options.registryFixture);
  const lockfileText = readFileSync(options.lockfile, 'utf8');
  const packages = extractLockedPackages(lockfileText);
  const registryTimes = new Map();
  const violations = [];
  const missing = [];

  async function publishedAtFor(pkg) {
    if (fixtureLookup) {
      return fixtureLookup(pkg.name, pkg.version);
    }
    if (!registryTimes.has(pkg.name)) {
      registryTimes.set(pkg.name, fetchPackageTimes(options.registryUrl, pkg.name));
    }
    const times = await registryTimes.get(pkg.name);
    return times[pkg.version] || null;
  }

  async function checkPackage(pkg) {
    if (policy.excluded.has(pkg.name)) {
      return;
    }
    let publishedAtText = null;
    try {
      publishedAtText = await publishedAtFor(pkg);
    } catch {
      missing.push(pkg);
      return;
    }
    if (!publishedAtText) {
      missing.push(pkg);
      return;
    }
    const publishedAt = new Date(publishedAtText);
    if (Number.isNaN(publishedAt.valueOf())) {
      missing.push(pkg);
      return;
    }
    if (publishedAt > cutoff) {
      violations.push({
        ...pkg,
        publishedAt,
        safeAt: new Date(publishedAt.getTime() + policy.minimumReleaseAgeMinutes * 60_000),
      });
    }
  }

  for (let index = 0; index < packages.length; index += 24) {
    await Promise.all(packages.slice(index, index + 24).map((pkg) => checkPackage(pkg)));
  }

  if (violations.length > 0) {
    violations.sort((left, right) =>
      `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`),
    );
    console.error(
      `pnpm minimum release age check failed for ${basename(options.lockfile)}. Policy: ${policy.minimumReleaseAgeMinutes} minutes; cutoff: ${cutoff.toISOString()}`,
    );
    for (const violation of violations) {
      console.error(
        `- ${violation.name}@${violation.version}: published ${violation.publishedAt.toISOString()}; safe after ${violation.safeAt.toISOString()}`,
      );
    }
    console.error(
      'Next action: wait until the safe-after time, then refresh with `pnpm install`; do not bypass the release-age policy in protected CI.',
    );
    return 1;
  }

  if (missing.length > 0 && !options.allowMissingMetadata) {
    const examples = missing
      .slice(0, 10)
      .map((pkg) => `${pkg.name}@${pkg.version}`)
      .join(', ');
    console.error(
      `pnpm release-age metadata was unavailable for ${missing.length} locked package(s): ${examples}${missing.length > 10 ? ', ...' : ''}`,
    );
    console.error(
      'Next action: confirm npm registry access and rerun this preflight; protected CI must not bypass release-age policy when metadata is unavailable.',
    );
    return 2;
  }

  if (missing.length > 0) {
    console.warn(
      `pnpm release-age metadata was unavailable for ${missing.length} locked package(s); pnpm install remains the final policy gate.`,
    );
  }
  console.log(
    `pnpm release-age preflight passed for ${packages.length} locked package version(s). Policy: ${policy.minimumReleaseAgeMinutes} minutes.`,
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 2;
    });
}
