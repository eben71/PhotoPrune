'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import type { Group } from '../../src/types/phase2Envelope';
import { OpenInGooglePhotosButton } from './OpenInGooglePhotosButton';

const confidenceDescriptions: Record<Group['confidence'], string> = {
  HIGH: 'Likely duplicates based on strong signals.',
  MEDIUM: 'Possible duplicates based on partial signals.',
  LOW: 'Weak match signals; review carefully.'
};

export function GroupCard({ group }: { group: Group }) {
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
        <h3>
          {group.groupType.replace('_', ' ')} · {group.confidence}
        </h3>
        <p>{confidenceDescriptions[group.confidence]}</p>
        <p>Reasons: {group.reasonCodes.join(', ') || 'None listed'}</p>
      </header>

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
