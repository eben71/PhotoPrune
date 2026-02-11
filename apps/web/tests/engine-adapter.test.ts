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
      NODE_ENV: 'development'
    });
    const { runId } = adapter.startRun(selection);
    resolveFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve(buildScanResult())
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const completed = adapter.pollRun(runId);
    expect(completed.run.status).toBe('COMPLETED');
    expect(completed.results.groups.length).toBe(1);
    expect(completed.results.groups[0].confidence).toBe('HIGH');
    expect(completed.results.groups[0].reasonCodes.length).toBeGreaterThan(0);
  });

  it('flags hard caps while preserving results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              ...buildScanResult(),
              costEstimate: { totalCost: 0.5 }
            })
        })
      ) as unknown as typeof fetch
    );
    const adapter = await loadAdapter({
      NODE_ENV: 'development'
    });
    const { runId } = adapter.startRun(selection, {
      softCapUnits: 10,
      hardCapUnits: 20
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const completed = adapter.pollRun(runId);
    expect(completed.run.status).toBe('COMPLETED');
    expect(completed.telemetry.cost.hitHardCap).toBe(true);
    expect(completed.results.groups.length).toBe(1);
  });

  it('flags soft caps without failing the run', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              ...buildScanResult(),
              costEstimate: { totalCost: 0.02 }
            })
        })
      ) as unknown as typeof fetch
    );
    const adapter = await loadAdapter({
      NODE_ENV: 'development'
    });
    const { runId } = adapter.startRun(selection, {
      softCapUnits: 1,
      hardCapUnits: 5000
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const completed = adapter.pollRun(runId);
    expect(completed.run.status).toBe('COMPLETED');
    expect(completed.telemetry.cost.hitSoftCap).toBe(true);
    expect(completed.telemetry.cost.hitHardCap).toBe(false);
  });

  it('advances stages in order and never regresses progress counts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)) as unknown as typeof fetch
    );
    const adapter = await loadAdapter({
      NODE_ENV: 'development'
    });
    const { runId } = adapter.startRun(selection);
    const stageOrder = ['INGEST', 'HASH', 'COMPARE', 'GROUP', 'FINALIZE'];
    const checkpoints = [0, 1300, 3000, 4700, 6000, 7000];
    let previousStageIndex = -1;
    let previousProcessed = 0;

    for (const offset of checkpoints) {
      vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z').getTime() + offset);
      const running = adapter.pollRun(runId);
      const stageIndex = stageOrder.indexOf(running.progress.stage);
      expect(stageIndex).toBeGreaterThanOrEqual(previousStageIndex);
      expect(running.progress.counts.processed).toBeGreaterThanOrEqual(
        previousProcessed
      );
      previousStageIndex = stageIndex;
      previousProcessed = running.progress.counts.processed;
    }
  });
  it('reports failures when the scan API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: false, status: 500 })
      ) as unknown as typeof fetch
    );
    const adapter = await loadAdapter({
      NODE_ENV: 'development'
    });
    const { runId } = adapter.startRun(selection);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const failed = adapter.pollRun(runId);
    expect(failed.run.status).toBe('FAILED');
  });

  it('returns a running envelope while awaiting the scan', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)) as unknown as typeof fetch
    );
    const adapter = await loadAdapter({
      NODE_ENV: 'development'
    });
    const { runId } = adapter.startRun(selection);
    const running = adapter.pollRun(runId);
    expect(running.run.status).toBe('RUNNING');
  });

  it('returns a failure envelope for unknown runs', async () => {
    const adapter = await loadAdapter({
      NODE_ENV: 'development'
    });
    const failed = adapter.pollRun('missing-run');
    expect(failed.run.status).toBe('FAILED');
  });

  it('returns a failure envelope when cancelling an unknown run', async () => {
    const adapter = await loadAdapter({
      NODE_ENV: 'development'
    });
    const failed = adapter.cancelRun('missing-run');
    expect(failed.run.status).toBe('FAILED');
  });
});
