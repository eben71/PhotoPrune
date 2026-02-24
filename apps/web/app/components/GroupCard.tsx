'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';

const confidenceDescriptions: Record<Group['confidence'], string> = {
  HIGH: trustCopy.results.confidenceBands.HIGH,
  MEDIUM: trustCopy.results.confidenceBands.MEDIUM,
  LOW: trustCopy.results.confidenceBands.LOW
};

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
        <p>{trustCopy.results.reasonSummary}</p>
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
