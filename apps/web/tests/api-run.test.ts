import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { POST as startRun } from '../app/api/run/route';
import { GET as getRun } from '../app/api/run/[runId]/route';
import { POST as cancelRun } from '../app/api/run/[runId]/cancel/route';
import { RunEnvelopeSchema } from '../src/types/phase2Envelope';

const StartRunResponseSchema = z.object({ runId: z.string() });

const selection = [
  {
    id: 'test-1',
    baseUrl: 'https://placehold.co/200x200/png?text=Test',
    filename: 'IMG_TEST.JPG',
    mimeType: 'image/jpeg',
    createTime: '2024-12-12T10:12:00.000Z',
    type: 'PHOTO'
  }
];

describe('run API lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts, progresses, and completes a run', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
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
            })
        })
      ) as unknown as typeof fetch
    );
    const request = new Request('http://localhost/api/run', {
      method: 'POST',
      body: JSON.stringify({ selection })
    });

    const response = await startRun(request);
    const { runId } = StartRunResponseSchema.parse(await response.json());

    await new Promise((resolve) => setTimeout(resolve, 0));

    const envelopeResponse = await getRun(new Request('http://localhost'), {
      params: Promise.resolve({ runId })
    });
    const envelope = RunEnvelopeSchema.parse(await envelopeResponse.json());

    expect(envelope.run.status).toBe('COMPLETED');
  });

  it('cancels a run', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              runId: 'scan-run',
              inputCount: selection.length,
              stageMetrics: {
                timingsMs: { candidate_narrowing_ms: 1 },
                counts: { downloads_performed: 1 }
              },
              costEstimate: { totalCost: 0.0012 },
              groupsExact: [],
              groupsVerySimilar: [],
              groupsPossiblySimilar: []
            })
        })
      ) as unknown as typeof fetch
    );
    const request = new Request('http://localhost/api/run', {
      method: 'POST',
      body: JSON.stringify({ selection })
    });

    const response = await startRun(request);
    const { runId } = StartRunResponseSchema.parse(await response.json());

    const cancelResponse = await cancelRun(new Request('http://localhost'), {
      params: Promise.resolve({ runId })
    });
    const envelope = RunEnvelopeSchema.parse(await cancelResponse.json());

    expect(envelope.run.status).toBe('CANCELLED');
  });
});
