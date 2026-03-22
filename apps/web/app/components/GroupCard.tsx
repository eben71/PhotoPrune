'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';
import { OpenInGooglePhotosButton } from './OpenInGooglePhotosButton';

const reasonCodeSummary: Record<string, string> = {
  HASH_MATCH: 'Reason: Strong visual match across structure and content',
  PHASH_CLOSE:
    'Reason: Matching dominant features with small visual variations',
  DHASH_CLOSE: 'Reason: Shared visual composition and similar framing',
  BURST_SEQUENCE:
    'Reason: Similar framing or perspective across nearby captures',
  EDIT_VARIANT: 'Reason: Shared structure with likely edit differences'
};

function getReasonSummary(group: Group) {
  const firstKnownReason = group.reasonCodes.find(
    (code) => reasonCodeSummary[code]
  );
  if (firstKnownReason) return reasonCodeSummary[firstKnownReason];
  if (group.confidence === 'HIGH') return reasonCodeSummary.HASH_MATCH;
  if (group.confidence === 'MEDIUM') {
    return 'Reason: Matching dominant features with moderate visual differences';
  }
  return 'Reason: Shared visual traits with weaker overall similarity';
}

export function GroupCard({ group, index }: { group: Group; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const representativeItems = useMemo(() => {
    const reps = group.items.filter((item) =>
      group.representativeItemIds.includes(item.itemId)
    );
    return (reps.length > 0 ? reps : group.items).slice(0, 2);
  }, [group]);

  const remainingCount = Math.max(0, group.itemsCount - 2);
  const bandClass =
    group.confidence === 'HIGH'
      ? 'conf-band-high'
      : group.confidence === 'MEDIUM'
        ? 'conf-band-medium'
        : 'conf-band-low';

  return (
    <article className={`group-card ${bandClass}`}>
      <div className="group-main">
        <h3>Group {index + 1}</h3>
        <p>Confidence: {group.confidence}</p>
        <p>{getReasonSummary(group)}</p>
        <div className="img-grid">
          {representativeItems.map((item) => (
            <Image
              key={item.itemId}
              src={item.thumbnail.baseUrl}
              alt={item.filename}
              width={200}
              height={200}
            />
          ))}
        </div>
        {remainingCount > 0 ? <p>+{remainingCount} more</p> : null}
        {group.itemsCount > 2 ? (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? 'Show fewer' : 'Show all items'}
          </button>
        ) : null}
      </div>
      <div className="group-actions">
        <button className="btn btn-primary" type="button">
          Keep recommended
        </button>
        <button className="btn btn-danger" type="button">
          Remove selected
        </button>
        <button className="btn btn-secondary" type="button">
          Skip for now
        </button>
        {expanded
          ? group.items.map((item) => (
              <div key={item.itemId} style={{ marginTop: 12 }}>
                <p>{item.filename}</p>
                <OpenInGooglePhotosButton item={item} />
                <label>
                  <input
                    type="checkbox"
                    name={`potential-removal-${item.itemId}`}
                  />
                  {trustCopy.groupDetail.neutralSelection}
                </label>
              </div>
            ))
          : null}
      </div>
    </article>
  );
}
