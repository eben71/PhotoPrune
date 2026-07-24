import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiBaseUrl } from '../app/api/_lib/backend';
import { GET, POST } from '../app/api/projects/route';

const GatewayErrorSchema = z.object({
  error: z.string(),
  detail: z.object({
    category: z.string(),
    message: z.string(),
    correlationId: z.string()
  })
});

describe('projects API route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('prefers the private API URL for server-side forwarding', () => {
    vi.stubEnv('INTERNAL_API_BASE_URL', 'http://api:8000');
    vi.stubEnv('PHOTOPRUNE_API_BASE_URL', 'http://127.0.0.1:8000');

    expect(apiBaseUrl()).toBe('http://api:8000');
  });

  it('rejects an undocumented backend URL', () => {
    vi.stubEnv('INTERNAL_API_BASE_URL', 'https://remote.example');

    expect(() => apiBaseUrl()).toThrow(
      'INTERNAL_API_BASE_URL is not supported'
    );
  });

  it('returns a 503 json error when the upstream API is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('connect ECONNREFUSED')))
    );

    const response = await POST(
      new Request('http://127.0.0.1:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Trip cleanup' }),
        headers: { 'Content-Type': 'application/json' }
      })
    );

    expect(response.status).toBe(503);
    const body = GatewayErrorSchema.parse(await response.json());
    expect(body).toMatchObject({
      error: 'PhotoPrune API is unavailable. Start the API service and retry.',
      detail: {
        category: 'upstream_unavailable',
        message:
          'PhotoPrune API is unavailable. Start the API service and retry.'
      }
    });
    expect(body.detail.correlationId).toBe(
      response.headers.get('X-Correlation-ID')
    );
  });

  it('rejects a hostile host before forwarding', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      new Request('http://127.0.0.1:3000/api/projects', {
        headers: { Host: 'attacker.example' }
      })
    );

    expect(response.status).toBe(421);
    await expect(response.json()).resolves.toMatchObject({
      detail: { category: 'local_only_boundary' }
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects explicitly cross-site state-changing requests', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Trip cleanup' }),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://attacker.example',
          'Sec-Fetch-Site': 'cross-site'
        }
      })
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards a documented same-origin state-changing request', async () => {
    const fetchMock = vi.fn(
      (input: string | URL | Request, init?: RequestInit) => {
        void input;
        void init;
        return Promise.resolve(
          Response.json({ id: 'project-1' }, { status: 200 })
        );
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Trip cleanup' }),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          'Sec-Fetch-Site': 'same-origin',
          'X-Correlation-ID': 'gateway-test'
        }
      })
    );

    expect(response.status).toBe(200);
    const forwardedInit = fetchMock.mock.calls[0]?.[1];
    const forwardedHeaders = new Headers(forwardedInit?.headers);
    expect(forwardedHeaders.get('X-Correlation-ID')).toBe('gateway-test');
    expect(response.headers.get('X-Correlation-ID')).toBe('gateway-test');
  });

  it('rejects a declared oversized body before reading or forwarding it', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        body: '{}',
        headers: {
          'Content-Length': String(32 * 1024 * 1024 + 1),
          Origin: 'http://localhost:3000',
          'Sec-Fetch-Site': 'same-origin'
        }
      })
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      detail: { category: 'request_body_too_large' }
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves safe retry timing from the private API', async () => {
    const fetchMock = vi.fn(
      (input: string | URL | Request, init?: RequestInit) => {
        void input;
        void init;
        return Promise.resolve(
          Response.json(
            { detail: { category: 'scan_rate_limited' } },
            { status: 429, headers: { 'Retry-After': '37' } }
          )
        );
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Trip cleanup' }),
        headers: {
          Origin: 'http://localhost:3000',
          'Sec-Fetch-Site': 'same-origin'
        }
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('37');
  });
});
