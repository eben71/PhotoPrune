import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const REQUIRED_PRIVATE_SERVICES = ['api', 'postgres', 'redis', 'worker'];
const ALLOWED_COMPOSE_FILES = new Set([
  'docker-compose.yml',
  'docker-compose.dev.yml'
]);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.pytest_cache',
  '.pnpm-store',
  '.turbo',
  '.uv-cache',
  '.venv',
  '__pycache__',
  'coverage',
  'dist',
  'node_modules'
]);

function normalizePort(port) {
  if (typeof port === 'string') {
    throw new Error('Compose must report structured port data with an explicit host IP.');
  }
  return {
    hostIp: port.host_ip ?? port.hostIp ?? '',
    published: String(port.published ?? ''),
    target: Number(port.target),
    protocol: port.protocol ?? 'tcp'
  };
}

function commandText(service) {
  if (Array.isArray(service.command)) {
    return service.command.join(' ');
  }
  return typeof service.command === 'string' ? service.command : '';
}

function environmentValue(service, name) {
  const environment = service.environment;
  if (Array.isArray(environment)) {
    const entry = environment.find((value) => value.startsWith(`${name}=`));
    return entry?.slice(name.length + 1);
  }
  if (environment && typeof environment === 'object') {
    return environment[name];
  }
  return undefined;
}

function validateSingleProcessCommands(services) {
  const apiCommand = commandText(services.api);
  const apiStarts = (apiCommand.match(/\buvicorn\b/g) ?? []).length;
  const apiWorkerMatches = [
    ...apiCommand.matchAll(/(?:--workers(?:=|\s+)|-w\s+)(\d+)/g)
  ];
  if (
    !Array.isArray(services.api.command) ||
    apiStarts !== 1 ||
    apiWorkerMatches.some((match) => Number(match[1]) !== 1) ||
    Number(environmentValue(services.api, 'WEB_CONCURRENCY') ?? 1) !== 1 ||
    Number(environmentValue(services.api, 'UVICORN_WORKERS') ?? 1) !== 1
  ) {
    throw new Error('api must run exactly one application process.');
  }

  const workerCommand = commandText(services.worker);
  const celeryStarts = (workerCommand.match(/\bcelery\b/g) ?? []).length;
  const soloPools = (workerCommand.match(/--pool(?:=|\s+)solo\b/g) ?? []).length;
  const concurrencyValues = [
    ...workerCommand.matchAll(/--concurrency(?:=|\s+)(\d+)/g)
  ].map((match) => Number(match[1]));
  if (
    celeryStarts === 0 ||
    soloPools !== celeryStarts ||
    concurrencyValues.length !== celeryStarts ||
    concurrencyValues.some((value) => value !== 1) ||
    Number(
      environmentValue(services.worker, 'CELERY_WORKER_CONCURRENCY') ?? 1
    ) !== 1
  ) {
    throw new Error('worker must run exactly one application worker.');
  }
}

export function validateDeploymentBoundary(config) {
  const services = config?.services;
  if (!services || typeof services !== 'object') {
    throw new Error('Effective Compose configuration has no services.');
  }

  const web = services.web;
  if (!web) {
    throw new Error('Effective Compose configuration has no web service.');
  }
  const webPorts = Array.isArray(web.ports) ? web.ports.map(normalizePort) : [];
  if (
    webPorts.length !== 1 ||
    webPorts[0].hostIp !== '127.0.0.1' ||
    webPorts[0].published !== '3000' ||
    webPorts[0].target !== 3000 ||
    webPorts[0].protocol !== 'tcp'
  ) {
    throw new Error(
      'web must publish exactly 127.0.0.1:3000 to container TCP port 3000.'
    );
  }

  for (const serviceName of REQUIRED_PRIVATE_SERVICES) {
    const service = services[serviceName];
    if (!service) {
      throw new Error(`Effective Compose configuration has no ${serviceName} service.`);
    }
  }

  for (const [serviceName, service] of Object.entries(services)) {
    if (
      serviceName !== 'web' &&
      Array.isArray(service.ports) &&
      service.ports.length > 0
    ) {
      throw new Error(`${serviceName} must not publish a host port.`);
    }
    if (service.network_mode === 'host') {
      throw new Error(`${serviceName} must not use host networking.`);
    }
    const serviceNetworks = Array.isArray(service.networks)
      ? service.networks
      : Object.keys(service.networks ?? {});
    if (serviceNetworks.some((networkName) => networkName !== 'default')) {
      throw new Error(`${serviceName} must use only the private default network.`);
    }
  }
  if (
    config.networks &&
    (Object.keys(config.networks).some((networkName) => networkName !== 'default') ||
      config.networks.default?.external === true)
  ) {
    throw new Error('Compose must use only its private default network.');
  }

  for (const serviceName of ['api', 'worker']) {
    const service = services[serviceName];
    const replicas = Number(service.deploy?.replicas ?? service.scale ?? 1);
    if (!Number.isInteger(replicas) || replicas !== 1) {
      throw new Error(`${serviceName} must run exactly one replica.`);
    }
  }
  validateSingleProcessCommands(services);
}

export function validateComposeFileSet(fileNames) {
  const unexpected = fileNames.filter(
    (fileName) => {
      const normalized = fileName.replaceAll('\\', '/');
      const baseName = path.posix.basename(normalized);
      return (
        /^(?:docker-)?compose.*\.ya?ml$/i.test(baseName) &&
        !ALLOWED_COMPOSE_FILES.has(normalized)
      );
    }
  );
  if (unexpected.length > 0) {
    throw new Error(
      `Undocumented shipped Compose override detected: ${unexpected.join(', ')}.`
    );
  }
}

function discoverComposeFiles(directory, relativeDirectory = '') {
  const discovered = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      discovered.push(...discoverComposeFiles(absolutePath, relativePath));
    } else {
      discovered.push(relativePath);
    }
  }
  return discovered;
}

function loadEffectiveComposeConfig(files) {
  const fileArgs = files.flatMap((fileName) => ['-f', fileName]);
  const result = spawnSync(
    'docker',
    [
      'compose',
      ...fileArgs,
      'config',
      '--format',
      'json'
    ],
    { cwd: process.cwd(), encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(
      'Unable to inspect effective Compose configuration. Run Docker Compose config locally.'
    );
  }
  return JSON.parse(result.stdout);
}

function main() {
  try {
    validateComposeFileSet(discoverComposeFiles(process.cwd()));
    validateDeploymentBoundary(loadEffectiveComposeConfig(['docker-compose.yml']));
    validateDeploymentBoundary(
      loadEffectiveComposeConfig(['docker-compose.yml', 'docker-compose.dev.yml'])
    );
    process.stdout.write('Deployment boundary OK: only 127.0.0.1:3000 is published.\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown deployment policy error.';
    process.stderr.write(`Deployment boundary check failed: ${message}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main();
}
