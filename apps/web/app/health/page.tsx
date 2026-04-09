'use client';

import { useEffect, useState } from 'react';

const API_BASE_URL =
  process.env.PHOTOPRUNE_API_BASE_URL ?? 'http://localhost:8000';

function readHealthStatus(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    typeof data.status === 'string'
  ) {
    return data.status;
  }

  return 'unknown';
}

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
        setStatus(readHealthStatus(data));
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
