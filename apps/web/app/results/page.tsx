'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { GroupList } from '../components/GroupList';
import { ReviewShell } from '../components/ReviewShell';
import { trustCopy } from '../copy/trustCopy';
import { requireResults } from '../state/sessionGuards';
import { useRunSession } from '../state/runSessionStore';

export default function ResultsPage() {
  const router = useRouter();
  const { state, hydrated, clearSelection } = useRunSession();

  if (!hydrated) return null;

  const guard = requireResults(state.results);
  if (!guard.allow) {
    return (
      <ReviewShell activeStage="REVIEW">
        <section className="surface-panel mx-auto max-w-[680px] rounded-[1.8rem] px-8 py-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#f2a357]">
            Session expired
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-white">
            Start a new review to continue.
          </h1>
          <p className="mt-5 max-w-[540px] text-base leading-8 text-slate-400">
            This is a single-session scan. If the page refreshes or closes,
            results are intentionally cleared.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#129388]"
          >
            Return to start
          </Link>
        </section>
      </ReviewShell>
    );
  }

  const { results } = state;
  if (!results) return null;

  const summaryCards = [
    {
      label: 'Groups reviewed',
      value: results.summary.groupsCount,
      accent: 'text-cyan-300'
    },
    {
      label: 'Photos marked for action',
      value: results.summary.groupedItemsCount,
      accent: 'text-[#f2a357]'
    },
    {
      label: 'Items kept outside groups',
      value: results.summary.ungroupedItemsCount,
      accent: 'text-[#ff7d7d]'
    }
  ];

  return (
    <ReviewShell activeStage="REVIEW">
      <section className="max-w-[920px]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-cyan-300">
          Action required
        </p>
        <h1 className="mt-6 max-w-[760px] font-display text-[3.6rem] font-semibold leading-[0.96] tracking-tight text-[#edf2ff]">
          Review groups.
        </h1>
        <p className="mt-5 max-w-[700px] text-lg leading-8 text-slate-400">
          {trustCopy.results.intro[0]} {trustCopy.results.intro[1]}{' '}
          {trustCopy.results.intro[2]}
        </p>
      </section>

      <section className="mt-10 grid gap-5 [grid-template-columns:repeat(3,minmax(0,1fr))]">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="surface-panel-light rounded-[1.55rem] px-6 py-7"
          >
            <p className={`text-2xl ${card.accent}`}>●</p>
            <p className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">
              {card.value}
            </p>
            <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              {card.label}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-5 [grid-template-columns:minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <article className="surface-panel rounded-[1.8rem] px-7 py-8">
          <div className="grid items-center gap-6 [grid-template-columns:220px_minmax(0,1fr)]">
            <div className="flex min-h-[150px] items-center justify-center rounded-[1.5rem] bg-[#15284a] text-5xl text-cyan-300">
              ✦
            </div>
            <div>
              <h2 className="font-display text-[2rem] font-semibold tracking-tight text-white">
                Peace of mind by design.
              </h2>
              <p className="mt-4 max-w-[560px] text-base leading-8 text-slate-300">
                Confidence reflects visual similarity only. You decide what to
                keep, what to skip, and whether anything should be acted on
                outside this app.
              </p>
              <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#f2a357]">
                Curation protocol active
              </p>
            </div>
          </div>
        </article>

        <article className="surface-panel rounded-[1.8rem] px-6 py-7">
          <h2 className="font-display text-2xl font-semibold text-white">
            {trustCopy.results.confidenceTitle}
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
            <p>
              <span className="font-semibold text-cyan-300">
                High confidence:
              </span>{' '}
              {trustCopy.results.confidenceBands.HIGH}
            </p>
            <p>
              <span className="font-semibold text-[#f2a357]">
                Medium confidence:
              </span>{' '}
              {trustCopy.results.confidenceBands.MEDIUM}
            </p>
            <p>
              <span className="font-semibold text-[#ff9b9b]">
                Low confidence:
              </span>{' '}
              {trustCopy.results.confidenceBands.LOW}
            </p>
            <p className="text-slate-400">
              {trustCopy.results.confidenceFooter}
            </p>
            <p className="text-slate-400">{trustCopy.sessionBanner[1]}</p>
          </div>
          <button
            className="mt-8 rounded-xl border border-slate-700 bg-slate-950/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500"
            type="button"
            onClick={() => {
              clearSelection();
              router.push('/');
            }}
          >
            End Session
          </button>
        </article>
      </section>

      <section className="mt-10">
        <GroupList groups={results.groups} />
      </section>
    </ReviewShell>
  );
}
