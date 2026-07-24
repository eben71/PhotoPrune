import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../app/api/health/route';
import HealthPage from '../app/health/page';

describe('same-origin health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('forwards the health check through the private API URL', async () => {
    vi.stubEnv('INTERNAL_API_BASE_URL', 'http://api:8000');
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ status: 'ok' }, { status: 200 }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://127.0.0.1:3000/api/health'));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api:8000/healthz',
      expect.any(Object)
    );
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('loads health from the same-origin route', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ status: 'ok' }, { status: 200 }))
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<HealthPage />);

    await waitFor(() =>
      expect(screen.getByTestId('health-status')).toHaveTextContent(
        'Status: ok'
      )
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/health');
  });

  it('shows a calm error state when same-origin health is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('unavailable')))
    );

    render(<HealthPage />);

    await waitFor(() =>
      expect(screen.getByTestId('health-status')).toHaveTextContent(
        'Status: error'
      )
    );
  });
});
