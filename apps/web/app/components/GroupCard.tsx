'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';
import { OpenInGooglePhotosButton } from './OpenInGooglePhotosButton';

const reasonCodeSummary: Record<string, string> = {
  HASH_MATCH: 'Strong visual match across structure and content',
  PHASH_CLOSE: 'Matching dominant features with small visual variations',
  DHASH_CLOSE: 'Shared visual composition and similar framing',
  BURST_SEQUENCE: 'Similar framing or perspective across nearby captures',
  EDIT_VARIANT: 'Shared structure with likely edit differences'
};

const confidenceTone = {
  HIGH: {
    ring: 'accent-ring-high',
    badge: 'bg-cyan-300/18 text-cyan-900',
    text: 'text-cyan-300'
  },
  MEDIUM: {
    ring: 'accent-ring-medium',
    badge: 'bg-[#f2a357]/20 text-[#7b4300]',
    text: 'text-[#f2a357]'
  },
  LOW: {
    ring: 'accent-ring-low',
    badge: 'bg-[#ff8a8a]/20 text-[#7f2323]',
    text: 'text-[#ff9b9b]'
  }
} as const;

function getReasonSummary(group: Group) {
  const firstKnownReason = group.reasonCodes.find(
    (code) => reasonCodeSummary[code]
  );
  if (firstKnownReason) return reasonCodeSummary[firstKnownReason];
  if (group.confidence === 'HIGH') return reasonCodeSummary.HASH_MATCH;
  if (group.confidence === 'MEDIUM')
    return 'Matching dominant features with moderate visual differences';
  return 'Shared visual traits with weaker overall similarity';
}

export function GroupCard({ group, index }: { group: Group; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const representativeItems = useMemo(() => {
    const reps = group.items.filter((item) =>
      group.representativeItemIds.includes(item.itemId)
    );
    return (reps.length > 0 ? reps : group.items).slice(0, 2);
  }, [group]);

  const remainingCount = Math.max(
    0,
    group.itemsCount - representativeItems.length
  );
  const tone = confidenceTone[group.confidence];
  const leadItem = representativeItems[0] ?? group.items[0];

  return (
    <article className="surface-panel overflow-hidden rounded-[1.9rem]">
      <div className="grid [grid-template-columns:minmax(0,1.35fr)_360px]">
        <div className={`relative min-h-[430px] ${tone.ring}`}>
          <p className="sr-only">Confidence: {group.confidence}</p>
          <p className="sr-only">Reason: {getReasonSummary(group)}</p>
          {leadItem ? (
            <Image
              src={leadItem.thumbnail.baseUrl}
              alt={leadItem.filename}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 66vw"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1f] via-[#09101d]/20 to-transparent" />
          <div className="absolute left-6 top-6">
            <span
              className={`rounded-full px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] ${tone.badge}`}
            >
              {group.confidence} confidence
            </span>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="inline-flex rounded-full bg-[#08101d]/88 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-cyan-300">
              Recommended photo
            </div>
            <h3 className="mt-4 max-w-[420px] font-display text-[2.1rem] font-semibold tracking-tight text-white">
              Group #{String(index + 1).padStart(2, '0')}
            </h3>
            <p className="mt-3 max-w-[520px] text-base leading-7 text-slate-200">
              {getReasonSummary(group)}
            </p>
          </div>
        </div>

        <div className="surface-panel-light flex flex-col gap-5 px-6 py-7">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Group detail
            </p>
            <h4 className="mt-3 font-display text-[2rem] font-semibold tracking-tight text-slate-900">
              {group.itemsCount} similar photos
            </h4>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {trustCopy.groupDetail.reviewLines[0]}{' '}
              {trustCopy.groupDetail.reviewLines[1]}
            </p>
          </div>

          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
            {representativeItems.map((item) => (
              <div
                key={item.itemId}
                className="overflow-hidden rounded-2xl bg-slate-200"
              >
                <div className="relative aspect-[1/1]">
                  <Image
                    src={item.thumbnail.baseUrl}
                    alt={item.filename}
                    fill
                    className="object-cover"
                    sizes="180px"
                  />
                </div>
                <div className="px-3 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.filename}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {remainingCount > 0 ? (
            <p className="text-sm text-slate-500">+{remainingCount} more</p>
          ) : null}

          <div className="space-y-3">
            <button
              className="w-full rounded-xl bg-[#1bb0a8] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#07232a] transition hover:brightness-105"
              type="button"
            >
              Keep recommendation
            </button>
            <button
              className="w-full rounded-xl border border-[#f09b9b]/55 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#d16767] transition hover:bg-[#fff5f5]"
              type="button"
            >
              Mark others externally
            </button>
            <button
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:bg-white"
              type="button"
            >
              Skip for now
            </button>
          </div>

          {group.itemsCount > representativeItems.length ? (
            <button
              className="self-start rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
              type="button"
              onClick={() => setExpanded((previous) => !previous)}
            >
              {expanded ? 'Show fewer' : 'Show all items'}
            </button>
          ) : null}

          {expanded ? (
            <div className="space-y-4 rounded-[1.5rem] bg-white/70 p-4">
              {group.items.map((item) => (
                <div
                  key={item.itemId}
                  className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {item.filename}
                  </p>
                  <label className="mt-3 flex items-start gap-3 text-sm leading-6 text-slate-600">
                    <input
                      type="checkbox"
                      name={`potential-removal-${item.itemId}`}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <span>{trustCopy.groupDetail.neutralSelection}</span>
                  </label>
                  <div className="mt-3">
                    <OpenInGooglePhotosButton item={item} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
