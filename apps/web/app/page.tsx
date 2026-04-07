'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Header } from '../src/components/Header';
import { trustCopy } from './copy/trustCopy';
import {
  normalizePickerSelection,
  useGooglePhotosPicker
} from './hooks/useGooglePhotosPicker';
import { useRunSession } from './state/runSessionStore';

export default function HomePage() {
  const router = useRouter();
  const { setSelection, clearSelection } = useRunSession();
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const { isLoading, error, lastOutcome, openPicker } = useGooglePhotosPicker();

  const maxSelection = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_SCAN_MAX_PHOTOS;
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const handleSelectFromGoogle = async () => {
    const selectedItems = await openPicker();
    if (!selectedItems || selectedItems.length === 0) return;

    if (maxSelection && selectedItems.length > maxSelection) {
      setSelectionWarning(
        `You selected ${selectedItems.length} items, but this session supports up to ${maxSelection}.`
      );
    } else {
      setSelectionWarning(null);
    }

    const normalized = normalizePickerSelection(
      maxSelection ? selectedItems.slice(0, maxSelection) : selectedItems
    );

    setSelection(normalized);
    router.push('/run');
  };

  return (
    <div className="app-bg min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1240px] px-6 pb-16 pt-28">
        <section className="max-w-[760px]">
          <h2 className="sr-only">Review Similar Photos Safely</h2>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#f2a357]">
            Smart photo review
          </p>
          <h1 className="mt-6 max-w-[760px] font-display text-[5.2rem] font-semibold leading-[0.96] tracking-tight text-balance text-[#edf2ff]">
            Review and declutter your photo library with confidence.
          </h1>
          <p className="mt-6 max-w-[560px] text-lg leading-8 text-slate-400">
            {trustCopy.landing.subheader}
          </p>

          <div className="mt-10 flex flex-row flex-wrap items-center gap-4">
            <button
              type="button"
              aria-label="Select from Google Photos"
              className="rounded-xl bg-gradient-to-r from-[#42d3cb] to-[#167f78] px-6 py-3.5 text-sm font-semibold text-[#05131b] shadow-[0_14px_40px_rgba(18,173,165,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleSelectFromGoogle()}
              disabled={isLoading}
            >
              {isLoading ? 'Opening Google Photos…' : 'Connect Photo Library'}
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-3.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              onClick={clearSelection}
            >
              Clear session
            </button>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            Nothing is removed automatically. You review every group first.
          </p>

          {selectionWarning ? (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {selectionWarning}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          {lastOutcome === 'cancelled' ? (
            <p className="mt-4 text-sm text-slate-500" aria-live="polite">
              Selection cancelled.
            </p>
          ) : null}
        </section>

        <section className="mt-14 grid gap-5 [grid-template-columns:minmax(0,1.9fr)_minmax(280px,0.9fr)]">
          <article className="surface-panel-light overflow-hidden rounded-[2rem] p-8">
            <div className="grid gap-8 [grid-template-columns:minmax(0,1.1fr)_minmax(280px,0.95fr)]">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/14 text-xl text-cyan-700">
                  ✦
                </div>
                <h2 className="mt-5 font-display text-[2rem] font-semibold tracking-tight text-slate-900">
                  Review-first workflow
                </h2>
                <p className="mt-4 max-w-[420px] text-base leading-7 text-slate-600">
                  {trustCopy.landing.doesBullets[2]}.{' '}
                  {trustCopy.landing.doesNotBullets[0]}.
                </p>
                <div className="mt-8 space-y-3">
                  {trustCopy.landing.doesBullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-4 shadow-[0_14px_34px_rgba(26,38,64,0.08)]"
                    >
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500" />
                      <p className="text-sm leading-6 text-slate-700">
                        {bullet}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-gradient-to-br from-[#ffd9c8] via-[#f5efe9] to-[#edd6cd] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <div className="flex h-full min-h-[360px] flex-col justify-between rounded-[1.4rem] bg-white/70 p-5">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-white">
                      Review 12 similar photos
                    </span>
                  </div>
                  <div className="rounded-[1.25rem] bg-gradient-to-br from-white to-slate-100 p-4 shadow-[0_16px_30px_rgba(28,38,57,0.12)]">
                    <div className="h-44 rounded-[1rem] bg-[linear-gradient(120deg,#f3d5c9_0%,#fff_34%,#d8d6d4_35%,#fff_55%,#f3d5c9_100%)]" />
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Recommended keeper
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-cyan-700">
                          Action required
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-800">
                        Keep recommended
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-5">
            <article className="surface-panel rounded-[1.65rem] px-6 py-7">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-cyan-300">
                Review before action
              </p>
              <p className="mt-6 text-lg leading-8 text-slate-200">
                {trustCopy.landing.safetyLines[0]}{' '}
                {trustCopy.landing.safetyLines[2]}
              </p>
            </article>
            <article className="surface-panel rounded-[1.65rem] border-l border-l-[#f09543] px-6 py-7">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#f2a357]">
                Private and secure
              </p>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                {trustCopy.landing.doesNotBullets.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-[620px] text-center">
          <h2 className="font-display text-[2.35rem] font-semibold tracking-tight text-slate-100">
            Ready to reclaim your library?
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Start a single-session review and keep every decision in your hands.
          </p>
          <button
            type="button"
            className="mt-8 rounded-2xl bg-[#eef2fb] px-10 py-4 text-sm font-semibold text-slate-900 shadow-[0_18px_45px_rgba(240,244,255,0.2)] transition hover:bg-white"
            onClick={() => void handleSelectFromGoogle()}
            disabled={isLoading}
          >
            {isLoading
              ? 'Opening Google Photos…'
              : trustCopy.landing.primaryButton}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Safe and secure. Nothing can be deleted from this screen.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 px-6 py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3">
          <p>© 2026 PhotoPrune. All rights reserved.</p>
          <div className="flex gap-5">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security</span>
            <span>Contact Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
