'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { RunEnvelopeSchema } from '../../src/types/phase2Envelope';
import { requireSelection } from '../state/sessionGuards';
import { useRunSession } from '../state/runSessionStore';

const StartRunResponseSchema = z.object({ runId: z.string() });

export default function RunPage() {
  const router = useRouter();
  const { state, hydrated, applyEnvelope, clearResults, clearSelection } =
    useRunSession();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!requireSelection(state.selection.length).allow) router.replace('/');
  }, [hydrated, state.selection.length, router]);

  useEffect(() => {
    if (!state.run?.runId || state.run.status !== 'RUNNING') return;
    const interval = setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/run/${state.run?.runId}`);
          applyEnvelope(RunEnvelopeSchema.parse(await response.json()));
          setError(null);
        } catch {
          setError('Connection lost. No changes were made.');
        }
      })();
    }, 1500);
    return () => clearInterval(interval);
  }, [state.run?.runId, state.run?.status, applyEnvelope]);

  const handleStart = async () => {
    if (!hydrated || state.selection.length === 0) return;
    setStarting(true);
    clearResults();
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selection: state.selection })
      });
      const payload = StartRunResponseSchema.parse(await response.json());
      const pollResponse = await fetch(`/api/run/${payload.runId}`);
      applyEnvelope(RunEnvelopeSchema.parse(await pollResponse.json()));
    } catch {
      setError('Something interrupted this session.');
    } finally {
      setStarting(false);
    }
  };

  const handleConfirmEndSession = async () => {
    if (state.run?.status === 'RUNNING' && state.run.runId) {
      try {
        const response = await fetch(`/api/run/${state.run.runId}/cancel`, {
          method: 'POST'
        });
        const envelope = RunEnvelopeSchema.parse(await response.json());
        applyEnvelope(envelope);
      } catch {
        setError('Unable to stop this scan right now. Please try again.');
        return;
      }
    }

    clearSelection();
    setShowEndSessionConfirm(false);
  };

  const progressValue = useMemo(() => {
    if (!state.progress) return 0;
    return (
      (state.progress.counts.processed /
        Math.max(1, state.progress.counts.total)) *
      100
    );
  }, [state.progress]);

  const hitHardCap = state.telemetry?.cost.hitHardCap ?? false;

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Processing analysis</p>
        <h1>Analysis in progress</h1>
        <p>You will review every suggestion before anything changes.</p>
      </section>

      <section className="grid grid-2-1" style={{ marginTop: '1.25rem' }}>
        <article className="card">
          <p>Selected items: {state.selection.length}</p>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <p>
            {state.progress
              ? `${state.progress.stage}: ${state.progress.counts.processed}/${state.progress.counts.total}`
              : 'Ready to start'}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 10,
              flexWrap: 'wrap'
            }}
          >
            {state.run?.status === 'COMPLETED' ? (
              <Link href="/results" className="btn btn-primary">
                Review current results
              </Link>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void handleStart()}
                disabled={starting || !hydrated || state.selection.length === 0}
              >
                {starting ? 'Starting...' : 'Start review session'}
              </button>
            )}

            {state.run?.status === 'RUNNING' ? (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowEndSessionConfirm(true)}
              >
                Stop Scan (No Changes Made)
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={clearSelection}
              >
                End Session
              </button>
            )}
          </div>

          {hitHardCap ? <p>Scan limit reached</p> : null}
          {error ? <p>{error}</p> : null}

          {showEndSessionConfirm ? (
            <section role="dialog" aria-modal="true" style={{ marginTop: 12 }}>
              <h2>Are you sure you want to end this session?</h2>
              <p>Nothing has been deleted</p>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => void handleConfirmEndSession()}
              >
                End Session
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowEndSessionConfirm(false)}
              >
                Continue Reviewing
              </button>
            </section>
          ) : null}
        </article>
      </section>
    </main>
  );
}
