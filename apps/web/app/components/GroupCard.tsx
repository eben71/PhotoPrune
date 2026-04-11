'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';
import { OpenInGooglePhotosButton } from './OpenInGooglePhotosButton';
import { AppIcon } from './AppIcon';

const reasonCodeSummary: Record<string, string> = {
  HASH_MATCH: 'Strong visual match across structure and content',
  PHASH_CLOSE: 'Matching dominant features with small visual variations',
  DHASH_CLOSE: 'Shared visual composition and similar framing',
  BURST_SEQUENCE: 'Similar framing or perspective across nearby captures',
  EDIT_VARIANT: 'Shared structure with likely edit differences'
};

const confidenceTone = {
  HIGH: {
    band: 'confidence-band-high',
    badge: 'bg-[rgba(90,218,206,0.1)] text-[var(--pp-primary)]',
    accent: 'text-[var(--pp-primary)]',
    label: 'High Confidence'
  },
  MEDIUM: {
    band: 'confidence-band-medium',
    badge: 'bg-[rgba(232,133,50,0.12)] text-[var(--pp-secondary)]',
    accent: 'text-[var(--pp-secondary)]',
    label: 'Medium Confidence'
  },
  LOW: {
    band: 'confidence-band-low',
    badge: 'bg-[rgba(255,127,125,0.14)] text-[var(--pp-tertiary)]',
    accent: 'text-[var(--pp-tertiary)]',
    label: 'Low Confidence'
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

function getDescription(group: Group) {
  if (group.confidence === 'HIGH') {
    return `We found ${group.itemsCount} very similar photos. Review the recommended keeper before making any decision outside this app.`;
  }

  if (group.confidence === 'MEDIUM') {
    return `These images appear visually related. This frame is recommended for review first.`;
  }

  return 'These images share some visual traits. Review carefully before acting outside this app.';
}

export function GroupCard({
  group,
  index,
  showActions = true
}: {
  group: Group;
  index: number;
  showActions?: boolean;
}) {
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
    <article
      className={`surface-panel-light ${tone.band} overflow-hidden rounded-[0.85rem] shadow-[0_24px_50px_rgba(3,8,18,0.24)]`}
    >
      <p className="sr-only">Confidence: {group.confidence}</p>
      <p className="sr-only">Reason: {getReasonSummary(group)}</p>

      <div className="group-card-layout">
        <div className="group-card-media relative">
          {leadItem ? (
            <Image
              src={leadItem.thumbnail.baseUrl}
              alt={leadItem.filename}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,14,26,0.76)] via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/10 bg-[rgba(8,14,26,0.8)] px-3 py-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AppIcon
                name="sparkle"
                className={`h-[13px] w-[13px] ${tone.accent}`}
              />
              <span
                className={`text-[0.58rem] font-black uppercase tracking-[0.18em] ${tone.accent}`}
              >
                Recommended Photo
              </span>
            </div>
          </div>
        </div>

        <div className="group-card-panel flex flex-1 flex-col justify-between bg-[var(--pp-paper)]">
          <div>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[2rem] font-black leading-none tracking-[-0.05em] text-[var(--pp-paper-text)]">
                  Group #{String(index + 1).padStart(2, '0')}
                </h3>
                <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[rgba(79,85,99,0.68)]">
                  {group.itemsCount} Similar Photos
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] ${tone.badge}`}
              >
                {tone.label}
              </span>
            </div>

            <p className="mb-6 max-w-[290px] text-sm leading-7 text-[var(--pp-paper-muted)]">
              {getDescription(group)}
            </p>

            <div className="mb-8 grid grid-cols-3 gap-2">
              {representativeItems.map((item) => (
                <div
                  key={item.itemId}
                  className="relative aspect-square overflow-hidden rounded-lg border border-[#eef1f6]"
                >
                  <Image
                    src={item.thumbnail.baseUrl}
                    alt={item.filename}
                    fill
                    className="object-cover opacity-45 transition hover:opacity-100"
                    sizes="96px"
                  />
                </div>
              ))}

              {remainingCount > 0 ? (
                <div className="flex aspect-square items-center justify-center rounded-lg border border-[#eef1f6] bg-[#f6f8fc] text-[0.75rem] font-black text-[var(--pp-paper-muted)]">
                  +{remainingCount}
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#dfe5f0] bg-[#f7f9fc] text-[#bcc6da]">
                  <span className="text-lg leading-none">+</span>
                </div>
              )}
            </div>

            {remainingCount > 0 ? (
              <p className="mb-6 text-sm text-[var(--pp-paper-muted)]">
                +{remainingCount} more
              </p>
            ) : null}
          </div>

          {showActions ? (
            <div className="space-y-3">
              <button
                className="w-full rounded-lg bg-[var(--pp-primary)] px-4 py-4 text-sm font-black text-[#09423f] transition hover:bg-[var(--pp-primary-dim)]"
                type="button"
              >
                Keep Recommended
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="rounded-lg border border-[rgba(255,127,125,0.18)] px-3 py-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#e06f6d] transition hover:bg-[rgba(255,127,125,0.06)]"
                  type="button"
                >
                  Mark Externally
                </button>
                <button
                  className="rounded-lg border border-[#eef1f6] px-3 py-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#9aa6bf] transition hover:bg-[#f6f8fc]"
                  type="button"
                >
                  Skip For Now
                </button>
              </div>

              {group.itemsCount > representativeItems.length ? (
                <button
                  className="rounded-full border border-[#dfe5f0] px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--pp-paper-muted)] transition hover:bg-[#f7f9fc]"
                  type="button"
                  onClick={() => setExpanded((previous) => !previous)}
                >
                  {expanded ? 'Show fewer' : 'Show all items'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {showActions && expanded ? (
        <div className="group-card-expanded-wrap bg-[#f4f6fb]">
          <div className="group-card-expanded-grid">
            {group.items.map((item) => (
              <div
                key={item.itemId}
                className="rounded-[1rem] bg-white px-4 py-4 shadow-[0_12px_22px_rgba(8,14,26,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={item.thumbnail.baseUrl}
                      alt={item.filename}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--pp-paper-text)]">
                      {item.filename}
                    </p>
                    <label className="mt-3 flex items-start gap-3 text-sm leading-6 text-[var(--pp-paper-muted)]">
                      <input
                        type="checkbox"
                        name={`potential-removal-${item.itemId}`}
                        className="mt-1 h-4 w-4 rounded border-[#d4dce9]"
                      />
                      <span>{trustCopy.groupDetail.neutralSelection}</span>
                    </label>
                    <div className="mt-3">
                      <OpenInGooglePhotosButton item={item} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
