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
import { getPhase21RunMode } from '../../src/engine/runMode';
import { trustCopy } from '../copy/trustCopy';

const StartRunResponseSchema = z.object({ runId: z.string() });

export default function RunPage() {
  const router = useRouter();
  const { state, hydrated, applyEnvelope, clearResults, clearSelection } =
    useRunSession();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const isCompleted = state.run?.status === 'COMPLETED';
  const runMode = getPhase21RunMode();
  const showDevRunModeLabel = process.env.NODE_ENV !== 'production';

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
        try {
          const response = await fetch(`/api/run/${state.run?.runId}`);
          const envelope = RunEnvelopeSchema.parse(await response.json());
          applyEnvelope(envelope);
          setError(null);
        } catch {
          setError(trustCopy.errors.network.title);
        }
      })();
    }, 1500);

    return () => clearInterval(interval);
  }, [state.run?.runId, state.run?.status, applyEnvelope]);

  const handleStart = async () => {
    if (!hydrated || state.selection.length === 0) {
      setError(trustCopy.errors.generic.title);
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
      setError(trustCopy.errors.generic.title);
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
    setShowEndSessionConfirm(false);
  };

  const hitHardCap = state.telemetry?.cost.hitHardCap ?? false;

  return (
    <section>
      <h1>{trustCopy.run.header}</h1>
      {trustCopy.run.subtext.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p>{trustCopy.run.transparency}</p>

      {showDevRunModeLabel ? (
        <p data-testid="dev-run-mode-label">Dev mode: {runMode} backend</p>
      ) : null}

      <SelectionSummary selection={state.selection} />

      {error ? (
        <Banner tone="error" title={error}>
          {error === trustCopy.errors.network.title
            ? trustCopy.errors.network.body.map((line) => (
                <p key={line}>{line}</p>
              ))
            : trustCopy.errors.generic.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
        </Banner>
      ) : null}

      {state.run?.status === 'FAILED' ? (
        <Banner tone="error" title={trustCopy.errors.processing.title}>
          {trustCopy.errors.processing.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </Banner>
      ) : null}

      {hitHardCap ? (
        <Banner tone="warn" title={trustCopy.capReached.header}>
          {trustCopy.capReached.explanation.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <Link href="/results">{trustCopy.capReached.primaryAction}</Link>
          <button type="button" onClick={() => setShowEndSessionConfirm(true)}>
            {trustCopy.capReached.secondaryAction}
          </button>
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
          {starting ? 'Starting...' : trustCopy.landing.primaryButton}
        </button>
      )}

      {state.run?.status === 'RUNNING' ? (
        <>
          <button type="button" onClick={() => setShowEndSessionConfirm(true)}>
            {trustCopy.run.cancelButton}
          </button>
          <p>{trustCopy.run.cancelMicrocopy}</p>
        </>
      ) : null}

      {showEndSessionConfirm ? (
        <section role="dialog" aria-modal="true">
          <h2>{trustCopy.cancelModal.title}</h2>
          <ul>
            {trustCopy.cancelModal.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          {state.run?.status === 'RUNNING' ? (
            <button type="button" onClick={() => void handleCancel()}>
              {trustCopy.cancelModal.primaryAction}
            </button>
          ) : (
            <button type="button" onClick={handleClearSession}>
              {trustCopy.cancelModal.primaryAction}
            </button>
          )}
          <button type="button" onClick={() => setShowEndSessionConfirm(false)}>
            {trustCopy.cancelModal.secondaryAction}
          </button>
        </section>
      ) : null}

      <ProgressPanel progress={state.progress} status={state.run?.status} />
      <CostPanel telemetry={state.telemetry} />

      {isCompleted ? (
        <Link
          href="/results"
          style={{ display: 'inline-block', marginTop: '0.5rem' }}
        >
          Review Current Results
        </Link>
      ) : null}
    </section>
  );
}
