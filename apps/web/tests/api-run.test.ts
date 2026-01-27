import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts, progresses, and completes a run', async () => {
    const request = new Request('http://localhost/api/run', {
      method: 'POST',
      body: JSON.stringify({ selection })
    });

    const response = await startRun(request);
    const { runId } = StartRunResponseSchema.parse(await response.json());

    let envelopeResponse = await getRun(new Request('http://localhost'), {
      params: Promise.resolve({ runId })
    });
    let envelope = RunEnvelopeSchema.parse(await envelopeResponse.json());

    expect(envelope.run.status).toBe('RUNNING');

    vi.setSystemTime(new Date('2025-01-01T00:00:10.000Z'));

    envelopeResponse = await getRun(new Request('http://localhost'), {
      params: Promise.resolve({ runId })
    });
    envelope = RunEnvelopeSchema.parse(await envelopeResponse.json());

    expect(envelope.run.status).toBe('COMPLETED');
  });

  it('cancels a run', async () => {
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
