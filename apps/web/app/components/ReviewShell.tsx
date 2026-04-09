'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { AppIcon } from './AppIcon';

type ReviewStage = 'SCANNING' | 'GROUPING' | 'REVIEW' | 'SUMMARY';

const railItems: Array<{
  id: ReviewStage;
  label: string;
  href: '/' | '/run' | '/results';
  icon: 'scan' | 'group' | 'review' | 'summary';
}> = [
  { id: 'SCANNING', label: 'Scanning', href: '/run', icon: 'scan' },
  { id: 'GROUPING', label: 'Grouping', href: '/results', icon: 'group' },
  { id: 'REVIEW', label: 'Review', href: '/results', icon: 'review' },
  { id: 'SUMMARY', label: 'Summary', href: '/results', icon: 'summary' }
];

export function ReviewShell({
  activeStage,
  children
}: {
  activeStage: ReviewStage;
  children: ReactNode;
}) {
  const showReviewTopLink = activeStage === 'REVIEW';

  return (
    <div className="shell-root app-bg min-h-screen">
      <header className="glass-header fixed inset-x-0 top-0 z-50">
        <div className="page-shell desktop-gutter flex h-16 items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-[1.5rem] font-bold tracking-[-0.04em] text-slate-100"
            >
              PhotoPrune
            </Link>
            <p className="sr-only">Digital Curator</p>
          </div>

          <nav className="top-nav-desktop">
            <Link href="/results" className="shell-nav-link">
              History
            </Link>
            {showReviewTopLink ? (
              <Link
                href="/results"
                className="shell-nav-link shell-nav-link-active pb-1"
              >
                Review
              </Link>
            ) : null}
            <Link href="/" className="shell-nav-link">
              Settings
            </Link>
          </nav>

          <div className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pp-primary)]">
            <AppIcon name="profile" className="h-[18px] w-[18px]" />
          </div>
        </div>
      </header>

      <div className="page-shell flex pt-16">
        <aside className="side-rail">
          <div className="flex w-full flex-col py-10">
            <div className="px-5">
              <Link
                href="/"
                className="text-[1.55rem] font-black tracking-[-0.04em] text-slate-100"
              >
                PhotoPrune
              </Link>
              <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-[#5f6f92]">
                Digital Curator
              </p>
            </div>

            <nav className="mt-10 space-y-1">
              {railItems.map((item) => {
                const active = item.id === activeStage;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`rail-item ${active ? 'rail-item-active' : ''}`}
                  >
                    <AppIcon name={item.icon} className="h-[15px] w-[15px]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto px-5">
              <div className="rail-item px-0 text-[0.72rem] text-[#7383a6] hover:bg-transparent hover:text-[#b6c4e3]">
                <AppIcon name="support" className="h-[15px] w-[15px]" />
                <span>Support</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="shell-main min-w-0 flex-1">{children}</main>
      </div>

      <nav className="mobile-bottom-nav glass-header fixed inset-x-0 bottom-0 z-50 border-t border-white/5">
        <div className="grid h-20 grid-cols-4 items-center px-4">
          {railItems.map((item) => {
            const active = item.id === activeStage;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`mx-auto flex w-fit flex-col items-center rounded-xl px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] ${
                  active
                    ? 'bg-[#12253f] text-[var(--pp-primary)]'
                    : 'text-[#5c6d92]'
                }`}
              >
                <AppIcon name={item.icon} className="mb-1 h-[16px] w-[16px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
