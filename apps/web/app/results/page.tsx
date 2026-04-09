'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppIcon } from '../components/AppIcon';
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
        <section className="mx-auto max-w-[760px] pt-12">
          <div className="surface-panel rounded-[1rem] px-8 py-10">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]">
              Session Expired
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] text-[var(--pp-on-background)]">
              Start a new review to continue.
            </h1>
            <p className="mt-5 max-w-[560px] text-base leading-8 text-[var(--pp-on-surface-muted)]">
              This is a single-session scan. If the page refreshes or closes,
              results are intentionally cleared.
            </p>
            <Link
              href="/"
              className="action-button-primary mt-8 px-6 py-3.5 text-sm"
            >
              Return to start
            </Link>
          </div>
        </section>
      </ReviewShell>
    );
  }

  const { results } = state;
  if (!results) return null;

  const itemsRemaining = results.groups.reduce(
    (total, group) => total + group.itemsCount,
    0
  );

  return (
    <ReviewShell activeStage="REVIEW">
      <div className="mx-auto max-w-[1140px] pb-12">
        <header className="mb-14">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
            Action Required
          </p>
          <h1 className="results-title mt-3 max-w-[720px] font-extrabold leading-[0.97] tracking-[-0.05em] text-[var(--pp-on-background)]">
            Review Groups
          </h1>
          <p className="mt-5 max-w-[620px] text-lg font-light leading-8 text-[var(--pp-on-surface-muted)]">
            {trustCopy.results.intro[0]} {trustCopy.results.intro[1]}{' '}
            {trustCopy.results.intro[2]}
          </p>
        </header>

        <section className="mt-10">
          <GroupList groups={results.groups} showHeader={false} />
        </section>

        <section className="results-sticky-bar sticky bottom-0 z-30 mt-10">
          <div className="surface-panel mx-auto overflow-hidden rounded-t-[0.8rem] px-8 py-6 shadow-[0_-12px_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-12">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
                    Groups in Session
                  </p>
                  <p className="mt-2 text-[2.15rem] font-black tracking-[-0.05em] text-white">
                    {results.summary.groupsCount}
                  </p>
                </div>

                <div className="h-10 w-px bg-[rgba(99,118,155,0.14)]" />

                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#7384aa]">
                    Items Remaining
                  </p>
                  <p className="mt-2 text-[2.15rem] font-black tracking-[-0.05em] text-white">
                    {itemsRemaining}
                  </p>
                </div>
              </div>

              <div className="flex min-w-[360px] flex-col items-end gap-3">
                <div className="flex items-center gap-4">
                  <a
                    href="#review-queue"
                    className="action-button-primary px-12 py-4 text-sm"
                  >
                    Continue Review
                  </a>
                  <button
                    className="rounded-lg bg-[#24324a] p-4 text-[#8ea0c7] transition hover:bg-[#2e3d57] hover:text-white"
                    type="button"
                    onClick={() => {
                      clearSelection();
                      router.push('/');
                    }}
                  >
                    <AppIcon name="summary" className="h-[20px] w-[20px]" />
                  </button>
                </div>
                <p className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#697a9f]">
                  <AppIcon
                    name="check"
                    className="h-[13px] w-[13px] text-[var(--pp-primary)]"
                  />
                  You review each group before anything changes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="surface-panel-soft rounded-[0.9rem] border border-dashed border-[rgba(53,72,107,0.2)] px-8 py-12 text-center">
            <h2 className="text-[2rem] font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
              Continue Scanning?
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-sm leading-7 text-[var(--pp-on-surface-muted)]">
              We&apos;ve reached the end of this batch. Start a new session to
              search for more similar photos in another selection.
            </p>
            <button
              className="mt-8 rounded-md bg-[#2a354b] px-8 py-3.5 text-sm font-bold text-[#d5def2] transition hover:bg-[#344159]"
              type="button"
              onClick={() => {
                clearSelection();
                router.push('/');
              }}
            >
              Search Library
            </button>
          </div>
        </section>

        <section className="results-info-grid mt-10">
          <article className="results-hero-card surface-panel rounded-[1rem]">
            <div className="results-hero-layout">
              <div className="flex w-full max-w-[210px] justify-center rounded-[0.85rem] bg-[#173057] p-10">
                <AppIcon
                  name="sparkle"
                  className="h-[64px] w-[64px] text-[var(--pp-primary)]"
                />
              </div>

              <div>
                <h2 className="text-[2rem] font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
                  Peace of mind by design.
                </h2>
                <p className="mt-4 max-w-[620px] text-base leading-8 text-[var(--pp-on-surface-muted)]">
                  Confidence reflects visual similarity only. You decide what to
                  keep, what to skip, and whether anything should be acted on
                  outside this app.
                </p>
                <div className="mt-6 flex items-center gap-3 text-[var(--pp-secondary)]">
                  <AppIcon name="check" className="h-[16px] w-[16px]" />
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em]">
                    Curation Protocol Active
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="surface-panel rounded-[1rem] px-6 py-7">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-[var(--pp-on-background)]">
              {trustCopy.results.confidenceTitle}
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
              <p>
                <span className="font-bold text-[var(--pp-primary)]">
                  High confidence:
                </span>{' '}
                {trustCopy.results.confidenceBands.HIGH}
              </p>
              <p>
                <span className="font-bold text-[var(--pp-secondary)]">
                  Medium confidence:
                </span>{' '}
                {trustCopy.results.confidenceBands.MEDIUM}
              </p>
              <p>
                <span className="font-bold text-[var(--pp-tertiary)]">
                  Low confidence:
                </span>{' '}
                {trustCopy.results.confidenceBands.LOW}
              </p>
              <p>{trustCopy.results.confidenceFooter}</p>
              <p>{trustCopy.sessionBanner[1]}</p>
            </div>
          </article>
        </section>
      </div>
    </ReviewShell>
  );
}
