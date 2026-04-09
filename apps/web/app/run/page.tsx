'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { AppIcon } from '../components/AppIcon';
import { ReviewShell } from '../components/ReviewShell';
import { trustCopy } from '../copy/trustCopy';
import { requireSelection } from '../state/sessionGuards';
import { useRunSession } from '../state/runSessionStore';
import { RunEnvelopeSchema } from '../../src/types/phase2Envelope';

const StartRunResponseSchema = z.object({ runId: z.string() });

const progressSteps = [
  {
    id: 'SCAN',
    title: 'Scanning selected photos',
    subtitle: 'Selected items are being indexed for grouping.'
  },
  {
    id: 'GROUP',
    title: 'Identifying similar groups',
    subtitle: 'Analyzing visual patterns and grouping candidates.'
  },
  {
    id: 'FINALIZE',
    title: 'Preparing your review session',
    subtitle: 'Organizing your review queue.'
  }
] as const;

function getStepState(currentStage: string, runStatus?: string | null) {
  const stepOrder = {
    SCAN: 0,
    GROUP: 1,
    FINALIZE: 2
  } as const;

  const normalizedStage: keyof typeof stepOrder =
    currentStage === 'INGEST' || currentStage === 'HASH'
      ? 'SCAN'
      : currentStage === 'COMPARE' || currentStage === 'GROUP'
        ? 'GROUP'
        : 'FINALIZE';

  return {
    normalizedStage,
    isDone: (step: keyof typeof stepOrder) =>
      runStatus === 'COMPLETED' || stepOrder[step] < stepOrder[normalizedStage],
    isActive: (step: keyof typeof stepOrder) =>
      runStatus !== 'COMPLETED' && step === normalizedStage
  };
}

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
          setError(trustCopy.errors.network.title + ' No changes were made.');
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
      setError(trustCopy.errors.generic.title);
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
    router.push('/');
  };

  const progressValue = useMemo(() => {
    if (!state.progress) return 0;
    return (
      (state.progress.counts.processed /
        Math.max(1, state.progress.counts.total)) *
      100
    );
  }, [state.progress]);

  const estimatedMinutes = useMemo(() => {
    if (!state.progress) return 4;
    const remaining = Math.max(
      0,
      state.progress.counts.total - state.progress.counts.processed
    );
    return Math.max(1, Math.ceil(remaining / 40));
  }, [state.progress]);

  const hitHardCap = state.telemetry?.cost.hitHardCap ?? false;
  const stepState = getStepState(
    state.progress?.stage ?? 'INGEST',
    state.run?.status ?? null
  );

  return (
    <ReviewShell activeStage="SCANNING">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-14">
          <span className="label-chip">Processing Analysis</span>
          <h1 className="run-title mt-6 max-w-[720px] font-extrabold leading-[0.97] tracking-[-0.05em] text-[var(--pp-on-background)]">
            Curating your moments.
          </h1>
          <p className="mt-5 max-w-[560px] text-lg font-light leading-8 text-[var(--pp-on-surface-muted)]">
            {trustCopy.run.subtext[0]} You&apos;ll review every suggestion
            before any action is taken.
          </p>
        </header>

        <section className="run-grid">
          <article className="run-progress-panel surface-panel-light confidence-band-high rounded-[1rem]">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(79,85,99,0.8)]">
                  Overall Progress
                </p>
                <p className="mt-2 text-[3.2rem] font-black tracking-[-0.05em] text-[var(--pp-paper-text)]">
                  {Math.round(progressValue)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(79,85,99,0.68)]">
                  Estimated Finish
                </p>
                <p className="mt-2 text-base font-semibold text-[rgba(79,85,99,0.88)]">
                  ~ {estimatedMinutes} mins
                </p>
              </div>
            </div>

            <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-[#d9dfeb]">
              <div
                className="h-full rounded-full bg-[var(--pp-primary)] transition-all"
                style={{ width: `${progressValue}%` }}
              />
            </div>

            <div className="space-y-6">
              {progressSteps.map((step) => {
                const isDone = stepState.isDone(step.id);
                const isActive = stepState.isActive(step.id);

                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between ${
                      !isDone && !isActive ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isDone || isActive
                            ? 'bg-[rgba(90,218,206,0.12)] text-[var(--pp-primary)]'
                            : 'bg-[#edf1f8] text-[#91a0ba]'
                        }`}
                      >
                        {isDone ? (
                          <AppIcon name="check" className="h-[16px] w-[16px]" />
                        ) : step.id === 'GROUP' && isActive ? (
                          <AppIcon name="group" className="h-[16px] w-[16px]" />
                        ) : (
                          <AppIcon
                            name="sparkle"
                            className="h-[16px] w-[16px]"
                          />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[var(--pp-paper-text)]">
                          {step.title}
                        </p>
                        <p className="text-xs text-[rgba(79,85,99,0.72)]">
                          {isActive
                            ? (state.progress?.message ?? step.subtitle)
                            : step.subtitle}
                        </p>
                      </div>
                    </div>

                    <p
                      className={`text-[0.62rem] font-bold uppercase tracking-[0.18em] ${
                        isDone
                          ? 'text-[var(--pp-primary)]'
                          : isActive
                            ? 'text-[var(--pp-primary)]'
                            : 'text-[#b3bccf]'
                      }`}
                    >
                      {isDone
                        ? 'Finished'
                        : isActive
                          ? 'In Progress'
                          : 'Pending'}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <div className="flex flex-col gap-4">
            <article className="surface-panel rounded-[0.85rem] px-6 py-7">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#96a8cf]">
                Current Batch
              </p>

              <dl className="mt-6 space-y-4 text-sm text-[var(--pp-on-background)]">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#c3cde5]">Selected items</dt>
                  <dd className="font-bold text-[var(--pp-primary)]">
                    {state.selection.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#c3cde5]">Processed</dt>
                  <dd className="font-bold text-[var(--pp-on-background)]">
                    {state.progress?.counts.processed ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#c3cde5]">Confidence level</dt>
                  <dd className="font-bold text-[var(--pp-primary)]">
                    {hitHardCap ? 'Limited' : 'Stable'}
                  </dd>
                </div>
              </dl>

              <div className="mt-8">
                <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#96a8cf]">
                  Session status
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-[#132540]">
                    <div
                      className="h-full rounded-full bg-[var(--pp-primary)]"
                      style={{ width: `${Math.max(progressValue, 12)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[var(--pp-primary)]">
                    {Math.round(progressValue)}%
                  </span>
                </div>
              </div>
            </article>

            <article className="surface-panel rounded-[0.85rem] px-6 py-7">
              <div className="mb-4 flex items-center gap-3 text-[var(--pp-secondary)]">
                <AppIcon name="sparkle" className="h-[16px] w-[16px]" />
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em]">
                  Observation
                </p>
              </div>

              <p className="text-sm leading-7 text-[var(--pp-on-surface-muted)]">
                {trustCopy.run.transparency}
              </p>

              {hitHardCap ? (
                <div className="mt-5 rounded-xl bg-[rgba(127,41,39,0.38)] px-4 py-4 text-sm leading-6 text-[#ffd7c7]">
                  <p className="font-bold text-[#ffe5d6]">
                    {trustCopy.capReached.header}
                  </p>
                  <p className="mt-2">{trustCopy.capReached.explanation[0]}</p>
                </div>
              ) : null}
            </article>
          </div>
        </section>

        {error ? (
          <p className="mt-6 rounded-xl bg-[rgba(127,41,39,0.45)] px-4 py-3 text-sm text-[#ffd1cd]">
            {error}
          </p>
        ) : null}

        <footer className="run-footer mt-16">
          <div className="max-w-[320px]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#96a8cf]">
              Privacy &amp; Security
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
              All processing occurs within the current session. No photos are
              deleted automatically, and stopping the scan safely discards this
              run.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {state.run?.status === 'COMPLETED' ? (
              <Link
                href="/results"
                className="action-button-primary px-8 py-3.5 text-sm"
              >
                Review current results
              </Link>
            ) : (
              <button
                className="action-button-primary px-8 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => void handleStart()}
                disabled={starting || !hydrated || state.selection.length === 0}
              >
                {starting ? 'Starting...' : 'Start review session'}
              </button>
            )}

            <button
              className="rounded-md bg-[#2a354b] px-8 py-3.5 text-sm font-bold text-[#d5def2] transition hover:bg-[#344159]"
              type="button"
              onClick={() => {
                if (state.run?.status === 'RUNNING') {
                  setShowEndSessionConfirm(true);
                  return;
                }
                void handleConfirmEndSession();
              }}
            >
              {state.run?.status === 'RUNNING'
                ? trustCopy.run.cancelButton
                : 'End Session'}
            </button>
          </div>
        </footer>
      </div>

      {showEndSessionConfirm ? (
        <section className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(5,9,21,0.78)] px-5 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-[560px] rounded-[1.1rem] px-8 py-8">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]">
              End Session
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
              {trustCopy.cancelModal.title}
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
              {trustCopy.cancelModal.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="rounded-md bg-[#d45d5d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e16d6d]"
                type="button"
                onClick={() => void handleConfirmEndSession()}
              >
                {trustCopy.cancelModal.primaryAction}
              </button>
              <button
                className="rounded-md bg-[#2a354b] px-5 py-3 text-sm font-bold text-[#d5def2] transition hover:bg-[#344159]"
                type="button"
                onClick={() => setShowEndSessionConfirm(false)}
              >
                {trustCopy.cancelModal.secondaryAction}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </ReviewShell>
  );
}
