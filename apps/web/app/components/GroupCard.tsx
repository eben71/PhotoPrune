'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';
import { OpenInGooglePhotosButton } from './OpenInGooglePhotosButton';

const confidenceDescriptions: Record<Group['confidence'], string> = {
  HIGH: trustCopy.results.confidenceBands.HIGH,
  MEDIUM: trustCopy.results.confidenceBands.MEDIUM,
  LOW: trustCopy.results.confidenceBands.LOW
};

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
  if (firstKnownReason) {
    return reasonCodeSummary[firstKnownReason];
  }

  if (group.confidence === 'HIGH') {
    return 'Reason: Strong visual match across structure and content';
  }

  if (group.confidence === 'MEDIUM') {
    return 'Reason: Matching dominant features with moderate visual differences';
  }

  return 'Reason: Shared visual traits with weaker overall similarity';
}

export function GroupCard({ group, index }: { group: Group; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const representativeItems = useMemo(() => {
    const representatives = group.items.filter((item) =>
      group.representativeItemIds.includes(item.itemId)
    );
    if (representatives.length > 0) {
      return representatives.slice(0, 2);
    }
    return group.items.slice(0, 2);
  }, [group]);

  const remainingCount = Math.max(0, group.itemsCount - 2);

  return (
    <article>
      <header>
        <h3>{`Group ${index + 1} — ${group.confidence} Confidence`}</h3>
        <p>{`Confidence: ${group.confidence}`}</p>
        <p>{getReasonSummary(group)}</p>
      </header>

      <p>{confidenceDescriptions[group.confidence]}</p>
      <p>{trustCopy.groupDetail.reviewLines[0]}</p>
      <p>{trustCopy.groupDetail.reviewLines[1]}</p>

      <details>
        <summary>{trustCopy.results.reasonTitle}</summary>
        <ul>
          {trustCopy.results.reasonBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <p>{trustCopy.results.footnote}</p>
      </details>

      {!expanded ? (
        <div>
          <div>
            {representativeItems.map((item) => (
              <Image
                key={item.itemId}
                src={item.thumbnail.baseUrl}
                alt={item.filename}
                width={160}
                height={160}
              />
            ))}
          </div>
          {remainingCount > 0 ? <p>+{remainingCount} more</p> : null}
        </div>
      ) : (
        <div>
          {group.items.map((item) => (
            <div key={item.itemId}>
              <Image
                src={item.thumbnail.baseUrl}
                alt={item.filename}
                width={160}
                height={160}
              />
              <p>{item.filename}</p>
              <p>{new Date(item.createTime).toLocaleString()}</p>
              <OpenInGooglePhotosButton item={item} />
              <label>
                <input
                  type="checkbox"
                  name={`potential-removal-${item.itemId}`}
                />
                {trustCopy.groupDetail.neutralSelection}
              </label>
            </div>
          ))}
        </div>
      )}

      {group.itemsCount > 2 ? (
        <button type="button" onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? 'Show fewer' : 'Show all items'}
        </button>
      ) : null}
    </article>
  );
}
