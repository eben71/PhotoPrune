import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PickerItem } from '../src/types/phase2Envelope';

const selection: PickerItem[] = [
  {
    id: 'test-1',
    baseUrl: 'https://placehold.co/200x200/png?text=Test',
    filename: 'IMG_TEST.JPG',
    mimeType: 'image/jpeg',
    createTime: '2024-12-12T10:12:00.000Z',
    type: 'PHOTO'
  }
];

async function loadAdapter(env: Record<string, string>) {
  vi.resetModules();
  Object.assign(process.env, env);
  return import('../src/engine/engineAdapter');
}

function buildScanResult() {
  return {
    runId: 'scan-run',
    inputCount: selection.length,
    stageMetrics: {
      timingsMs: { candidate_narrowing_ms: 1 },
      counts: { downloads_performed: 1 }
    },
    costEstimate: { totalCost: 0.0012 },
    groupsExact: [
      {
        groupId: 'group-1',
        category: 'EXACT',
        items: [{ id: selection[0].id }],
        representativePair: {
          earliest: { id: selection[0].id },
          latest: { id: selection[0].id }
        }
      }
    ],
    groupsVerySimilar: [],
    groupsPossiblySimilar: []
  };
}

describe('engineAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('completes using fixtures in test mode', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const adapter = await loadAdapter({
      USE_PHASE2_FIXTURE: '1',
      NODE_ENV: 'test'
    });
    const { runId } = adapter.startRun(selection);
    const running = await adapter.pollRun(runId);
    expect(running.run.status).toBe('RUNNING');
    vi.setSystemTime(new Date('2025-01-01T00:00:10.000Z'));
    const completed = await adapter.pollRun(runId);
    expect(completed.run.status).toBe('COMPLETED');
  });

  it('completes using the scan API response', async () => {
    let resolveFetch: (value: {
      ok: boolean;
      status: number;
      json: () => Promise<unknown>;
    }) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      ) as unknown as typeof fetch
    );
    const adapter = await loadAdapter({
      USE_PHASE2_FIXTURE: '0',
      NODE_ENV: 'development'
    });
    const { runId } = adapter.startRun(selection);
    resolveFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve(buildScanResult())
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const completed = await adapter.pollRun(runId);
    expect(completed.run.status).toBe('COMPLETED');
    expect(completed.results.groups.length).toBe(1);
  });

  it('reports failures when the scan API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: false, status: 500 })
      ) as unknown as typeof fetch
    );
    const adapter = await loadAdapter({
      USE_PHASE2_FIXTURE: '0',
      NODE_ENV: 'development'
    });
    const { runId } = adapter.startRun(selection);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const failed = await adapter.pollRun(runId);
    expect(failed.run.status).toBe('FAILED');
  });
});
