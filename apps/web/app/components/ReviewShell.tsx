'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

type ReviewStage = 'SCANNING' | 'GROUPING' | 'REVIEW' | 'SUMMARY';

const railItems: Array<{
  id: ReviewStage;
  label: string;
  href: '/' | '/run' | '/results';
}> = [
  { id: 'SCANNING', label: 'Scanning', href: '/run' },
  { id: 'GROUPING', label: 'Grouping', href: '/results' },
  { id: 'REVIEW', label: 'Review', href: '/results' },
  { id: 'SUMMARY', label: 'Summary', href: '/results' }
];

export function ReviewShell({
  activeStage,
  children
}: {
  activeStage: ReviewStage;
  children: ReactNode;
}) {
  return (
    <div className="app-bg min-h-screen">
      <header className="glass-header sticky top-0 z-40">
        <div className="mx-auto flex h-[4.5rem] max-w-[1400px] items-center justify-between px-5">
          <div>
            <Link
              href="/"
              className="font-display text-xl font-semibold tracking-tight text-white"
            >
              PhotoPrune
            </Link>
            <p className="mt-1 text-[0.62rem] uppercase tracking-[0.34em] text-slate-500">
              Digital curator
            </p>
          </div>
          <nav className="flex items-center gap-8 text-sm text-slate-400">
            <Link href="/" className="transition hover:text-white">
              History
            </Link>
            <Link
              href="/results"
              className="border-b border-cyan-400 pb-1 text-cyan-300"
            >
              Review
            </Link>
            <Link href="/" className="transition hover:text-white">
              Settings
            </Link>
          </nav>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
            <span className="text-sm font-semibold">•</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="min-h-[calc(100vh-4.5rem)] w-[184px] shrink-0 border-r border-slate-800/80 bg-[#060c1a]/80">
          <nav className="flex h-full flex-col justify-between py-10">
            <div className="space-y-2 px-3">
              {railItems.map((item) => {
                const active = item.id === activeStage;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium tracking-[0.18em] uppercase transition ${
                      active
                        ? 'bg-cyan-400/12 text-cyan-300 shadow-[inset_3px_0_0_0_#44d9d1]'
                        : 'text-slate-500 hover:bg-slate-900/80 hover:text-slate-200'
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="px-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5">
                <p className="text-[0.62rem] uppercase tracking-[0.3em] text-slate-500">
                  Support
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Review stays in your control. No photos are deleted
                  automatically.
                </p>
              </div>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
