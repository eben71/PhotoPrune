'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { Banner } from '../components/Banner';
import { CostPanel } from '../components/CostPanel';
import { ProgressPanel } from '../components/ProgressPanel';
import { SelectionSummary } from '../components/SelectionSummary';
import { requireSelection } from '../state/sessionGuards';
import { useRunSession } from '../state/runSessionStore';
import { RunEnvelopeSchema } from '../../src/types/phase2Envelope';

const StartRunResponseSchema = z.object({ runId: z.string() });

export default function RunPage() {
  const router = useRouter();
  const { state, hydrated, applyEnvelope, clearResults, clearSelection } =
    useRunSession();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCompleted = state.run?.status === 'COMPLETED';

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const guard = requireSelection(state.selection.length);
    if (!guard.allow) {
      router.replace('/');
    }
  }, [hydrated, state.selection.length, router]);

  useEffect(() => {
    if (!state.run?.runId) {
      return;
    }
    if (
      state.run.status === 'COMPLETED' ||
      state.run.status === 'FAILED' ||
      state.run.status === 'CANCELLED'
    ) {
      return;
    }

    const interval = setInterval(() => {
      void (async () => {
        const response = await fetch(`/api/run/${state.run?.runId}`);
        const envelope = RunEnvelopeSchema.parse(await response.json());
        applyEnvelope(envelope);
      })();
    }, 1500);

    return () => clearInterval(interval);
  }, [state.run?.runId, state.run?.status, applyEnvelope]);

  const handleStart = async () => {
    if (!hydrated || state.selection.length === 0) {
      setError('Selection is not ready yet. Please wait a moment.');
      return;
    }
    setError(null);
    setStarting(true);
    clearResults();

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selection: state.selection })
      });
      const payload = StartRunResponseSchema.parse(await response.json());
      const pollResponse = await fetch(`/api/run/${payload.runId}`);
      const envelope = RunEnvelopeSchema.parse(await pollResponse.json());
      applyEnvelope(envelope);
    } catch {
      setError('Unable to start the run. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleClearSession = () => {
    clearSelection();
    router.push('/');
  };

  const handleCancel = async () => {
    if (!state.run?.runId) {
      return;
    }
    const response = await fetch(`/api/run/${state.run.runId}/cancel`, {
      method: 'POST'
    });
    const envelope = RunEnvelopeSchema.parse(await response.json());
    applyEnvelope(envelope);
  };

  return (
    <section>
      <h1>Run analysis</h1>
      <p>Confirm your selection and start a one-time analysis.</p>

      <button type="button" onClick={handleClearSession}>
        Clear session
      </button>

      <SelectionSummary selection={state.selection} />

      {error ? (
        <Banner tone="error" title="Run error">
          {error}
        </Banner>
      ) : null}

      {state.run ? (
        <Banner tone="info" title={`Run status: ${state.run.status}`}>
          {state.run.status === 'COMPLETED'
            ? 'Run completed. Review groups on the results page.'
            : null}
        </Banner>
      ) : null}

      {isCompleted ? (
        <p aria-live="polite">Analysis completed</p>
      ) : (
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={starting || !hydrated || state.selection.length === 0}
        >
          {starting ? 'Starting…' : 'Start analysis'}
        </button>
      )}
      {state.run?.status === 'RUNNING' ? (
        <button type="button" onClick={() => void handleCancel()}>
          Cancel run
        </button>
      ) : null}

      <ProgressPanel progress={state.progress} status={state.run?.status} />
      <CostPanel telemetry={state.telemetry} />

      {isCompleted ? (
        <Link
          href="/results"
          style={{
            display: 'inline-block',
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#111',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          View results
        </Link>
      ) : null}
    </section>
  );
}
