import { describe, expect, it, vi } from 'vitest';

async function loadRunMode(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return import('../src/engine/runMode');
}

describe('Phase 2.1 run mode', () => {
  it('defaults to engine mode in development', async () => {
    const runMode = await loadRunMode({
      NODE_ENV: 'development',
      NEXT_PUBLIC_PHASE2_RUN_MODE: undefined
    });

    expect(runMode.getPhase21RunMode()).toBe('engine');
    expect(runMode.shouldUsePhase21FixtureMode()).toBe(false);
  });

  it('enables fixture mode only in development when explicitly requested', async () => {
    const runMode = await loadRunMode({
      NODE_ENV: 'development',
      NEXT_PUBLIC_PHASE2_RUN_MODE: 'fixture'
    });

    expect(runMode.getPhase21RunMode()).toBe('fixture');
    expect(runMode.shouldUsePhase21FixtureMode()).toBe(true);
  });

  it('never enables fixture mode in production', async () => {
    const runMode = await loadRunMode({
      NODE_ENV: 'production',
      NEXT_PUBLIC_PHASE2_RUN_MODE: 'fixture'
    });

    expect(runMode.getPhase21RunMode()).toBe('fixture');
    expect(runMode.shouldUsePhase21FixtureMode()).toBe(false);
  });
});
