'use client';

import { useEffect, useState } from 'react';

import { HealthStatusSchema } from '@photoprune/shared';

const API_BASE_URL =
  process.env.PHOTOPRUNE_API_BASE_URL ?? 'http://localhost:8000';

export default function HealthPage() {
  const [status, setStatus] = useState<string>('loading');

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch(`${API_BASE_URL}/healthz`);
        if (!res.ok) {
          throw new Error('Health check failed');
        }
        const data: unknown = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const parsed = HealthStatusSchema.parse(data);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        setStatus(parsed.status ?? 'unknown');
      } catch (error) {
        console.error('Health check error', error);
        setStatus('error');
      }
    }

    void fetchHealth();
  }, []);

  return (
    <section>
      <h1>API Health</h1>
      <p data-testid="health-status">Status: {status}</p>
    </section>
  );
}
