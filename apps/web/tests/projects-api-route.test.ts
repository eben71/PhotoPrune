import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../app/api/projects/route';

describe('projects API route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a 503 json error when the upstream API is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.reject(new Error('connect ECONNREFUSED'))
      ) as unknown as typeof fetch
    );

    const response = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Trip cleanup' }),
        headers: { 'Content-Type': 'application/json' }
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'PhotoPrune API is unavailable. Start the API service and retry.'
    });
  });
});
