'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { RunEnvelopeSchema } from '../../src/types/phase2Envelope';
import { ReviewShell } from '../components/ReviewShell';
import { trustCopy } from '../copy/trustCopy';
import { requireSelection } from '../state/sessionGuards';
import { useRunSession } from '../state/runSessionStore';

const StartRunResponseSchema = z.object({ runId: z.string() });

const stageLabels = [
  { id: 'INGEST', title: 'Scanning selected photos' },
  { id: 'HASH', title: 'Scanning selected photos' },
  { id: 'COMPARE', title: 'Identifying similar groups' },
  { id: 'GROUP', title: 'Identifying similar groups' },
  { id: 'FINALIZE', title: 'Preparing your review session' }
] as const;

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
    if (!state.progress) return null;
    const remaining = Math.max(
      0,
      state.progress.counts.total - state.progress.counts.processed
    );
    return Math.max(1, Math.ceil(remaining / 40));
  }, [state.progress]);

  const hitHardCap = state.telemetry?.cost.hitHardCap ?? false;
  const currentStage = state.progress?.stage ?? 'INGEST';

  return (
    <ReviewShell activeStage="SCANNING">
      <section className="max-w-[920px]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-cyan-300">
          Processing analysis
        </p>
        <h1 className="mt-6 max-w-[760px] font-display text-[3.6rem] font-semibold leading-[0.96] tracking-tight text-[#edf2ff]">
          Curating your moments.
        </h1>
        <p className="mt-5 max-w-[680px] text-lg leading-8 text-slate-400">
          {trustCopy.run.subtext[0]} You will review every suggestion before any
          action is taken.
        </p>
      </section>

      <section className="mt-12 grid gap-5 [grid-template-columns:minmax(0,1.55fr)_minmax(280px,0.72fr)]">
        <article className="surface-panel-light rounded-[1.9rem] p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Overall progress
              </p>
              <p className="mt-3 text-5xl font-semibold tracking-tight text-slate-900">
                {Math.round(progressValue)}%
              </p>
            </div>
            <div className="text-right text-sm leading-6 text-slate-500">
              <p className="uppercase tracking-[0.26em]">Estimated finish</p>
              <p className="mt-2 text-lg font-semibold text-slate-700">
                ~ {estimatedMinutes ?? 4} mins
              </p>
            </div>
          </div>

          <div className="mt-8 h-2 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#59ddd3] to-[#3cc7bf]"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <div className="mt-8 space-y-5">
            {stageLabels.map((stage, index) => {
              const done =
                state.progress &&
                stageLabels.findIndex((item) => item.id === currentStage) >
                  index;
              const active = stage.id === currentStage;

              return (
                <div
                  key={stage.id}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-white/65 px-4 py-4"
                >
                  <div className="flex gap-4">
                    <div
                      className={`mt-1 flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold ${
                        done || active
                          ? 'bg-cyan-400/20 text-cyan-800'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {done ? '✓' : index + 1}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {stage.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {active
                          ? (state.progress?.message ?? 'In progress')
                          : done
                            ? 'Finished'
                            : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                      done
                        ? 'text-cyan-700'
                        : active
                          ? 'text-[#f2a357]'
                          : 'text-slate-400'
                    }`}
                  >
                    {done ? 'Finished' : active ? 'In progress' : 'Pending'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {state.run?.status === 'COMPLETED' ? (
              <Link
                href="/results"
                className="rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#129388]"
              >
                Review current results
              </Link>
            ) : (
              <button
                className="rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#129388] disabled:cursor-not-allowed disabled:opacity-55"
                type="button"
                onClick={() => void handleStart()}
                disabled={starting || !hydrated || state.selection.length === 0}
              >
                {starting ? 'Starting…' : 'Start review session'}
              </button>
            )}

            <button
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500"
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

          {error ? (
            <p className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </article>

        <div className="space-y-5">
          <article className="surface-panel rounded-[1.55rem] px-6 py-7">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Current batch
            </p>
            <dl className="mt-5 space-y-4 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <dt>Selected items</dt>
                <dd className="font-semibold text-cyan-300">
                  {state.selection.length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Processed</dt>
                <dd className="font-semibold text-slate-100">
                  {state.progress?.counts.processed ?? 0}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Confidence level</dt>
                <dd className="font-semibold text-cyan-300">
                  {hitHardCap ? 'Limited' : 'Stable'}
                </dd>
              </div>
            </dl>
            <div className="mt-6 h-1.5 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: `${Math.max(progressValue, 12)}%` }}
              />
            </div>
          </article>

          <article className="surface-panel rounded-[1.55rem] px-6 py-7">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#f2a357]">
              Observation
            </p>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              {trustCopy.run.transparency}
            </p>
            {hitHardCap ? (
              <div className="mt-4 rounded-xl border border-[#f2a357]/30 bg-[#f2a357]/10 px-4 py-3 text-sm text-[#ffd4a5]">
                <p className="font-semibold text-[#ffe1bb]">
                  {trustCopy.capReached.header}
                </p>
                <p className="mt-2">{trustCopy.capReached.explanation[0]}</p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[1.55rem] border border-slate-800 bg-slate-950/55 px-6 py-7">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Privacy & security
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              All processing occurs within the current session. No photos are
              deleted automatically, and stopping the scan safely discards this
              run.
            </p>
          </article>
        </div>
      </section>

      {showEndSessionConfirm ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-[#050915]/70 px-5 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-[560px] rounded-[1.9rem] p-8">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#f2a357]">
              End session
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-white">
              {trustCopy.cancelModal.title}
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
              {trustCopy.cancelModal.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-[#d45d5d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e16d6d]"
                type="button"
                onClick={() => void handleConfirmEndSession()}
              >
                {trustCopy.cancelModal.primaryAction}
              </button>
              <button
                className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500"
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
