import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateComposeFileSet,
  validateDeploymentBoundary
} from '../../scripts/check-deployment-boundary.mjs';

function validConfig() {
  return {
    services: {
      web: {
        ports: [
          {
            host_ip: '127.0.0.1',
            published: '3000',
            target: 3000,
            protocol: 'tcp'
          }
        ]
      },
      api: {
        expose: ['8000'],
        command: ['uv', 'run', 'uvicorn', 'app.main:app']
      },
      postgres: { expose: ['5432'] },
      redis: { expose: ['6379'] },
      worker: {
        command: [
          'celery',
          '-A',
          'app.celery_app.app',
          'worker',
          '--pool=solo',
          '--concurrency=1'
        ]
      }
    }
  };
}

test('accepts the canonical localhost-only topology', () => {
  assert.doesNotThrow(() => validateDeploymentBoundary(validConfig()));
});

for (const hostIp of ['', '0.0.0.0', '::', '[::]', '192.168.1.10', 'localhost']) {
  test(`rejects web host IP ${hostIp || '(omitted)'}`, () => {
    const config = validConfig();
    config.services.web.ports[0].host_ip = hostIp;

    assert.throws(
      () => validateDeploymentBoundary(config),
      /web must publish exactly 127\.0\.0\.1:3000/
    );
  });
}

for (const serviceName of ['api', 'postgres', 'redis']) {
  test(`rejects a published ${serviceName} port`, () => {
    const config = validConfig();
    config.services[serviceName].ports = [
      { host_ip: '127.0.0.1', published: '9000', target: 9000 }
    ];

    assert.throws(
      () => validateDeploymentBoundary(config),
      new RegExp(`${serviceName} must not publish a host port`)
    );
  });
}

test('rejects short-form ports because the host IP is ambiguous', () => {
  const config = validConfig();
  config.services.web.ports = ['3000:3000'];

  assert.throws(
    () => validateDeploymentBoundary(config),
    /explicit host IP/
  );
});

test('rejects host networking on any service', () => {
  const config = validConfig();
  config.services.web.network_mode = 'host';

  assert.throws(
    () => validateDeploymentBoundary(config),
    /web must not use host networking/
  );
});

for (const serviceName of ['api', 'worker']) {
  test(`rejects multiple ${serviceName} replicas`, () => {
    const config = validConfig();
    config.services.worker = { expose: [] };
    config.services[serviceName].deploy = { replicas: 2 };

    assert.throws(
      () => validateDeploymentBoundary(config),
      new RegExp(`${serviceName} must run exactly one replica`)
    );
  });
}

test('rejects undocumented Compose overrides', () => {
  assert.doesNotThrow(() =>
    validateComposeFileSet(['docker-compose.yml', 'docker-compose.dev.yml'])
  );
  assert.throws(
    () =>
      validateComposeFileSet([
        'docker-compose.yml',
        'infra/docker/compose.remote.yml'
      ]),
    /Undocumented shipped Compose override/
  );
});

test('rejects a published port on an added service', () => {
  const config = validConfig();
  config.services.public_proxy = {
    ports: [
      {
        host_ip: '0.0.0.0',
        published: '8080',
        target: 8080,
        protocol: 'tcp'
      }
    ]
  };

  assert.throws(
    () => validateDeploymentBoundary(config),
    /public_proxy must not publish a host port/
  );
});

test('rejects multiple API processes hidden in the service command', () => {
  const config = validConfig();
  config.services.api.command.push('--workers', '2');

  assert.throws(
    () => validateDeploymentBoundary(config),
    /api must run exactly one application process/
  );
});

test('rejects multiple application workers hidden in the service command', () => {
  const config = validConfig();
  config.services.worker.command = [
    'celery',
    '-A',
    'app.celery_app.app',
    'worker',
    '--pool=prefork',
    '--concurrency=2'
  ];

  assert.throws(
    () => validateDeploymentBoundary(config),
    /worker must run exactly one application worker/
  );
});
