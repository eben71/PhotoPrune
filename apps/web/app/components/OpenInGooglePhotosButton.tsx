'use client';

import { useState } from 'react';

import type { Item } from '../../src/types/phase2Envelope';

export function OpenInGooglePhotosButton({ item }: { item: Item }) {
  const [copied, setCopied] = useState(false);
  const { url, fallbackQuery, fallbackUrl } = item.links.googlePhotos;

  const handleOpen = () => {
    const targetUrl = url ?? fallbackUrl ?? 'https://photos.google.com/';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(fallbackQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <button type="button" onClick={handleOpen}>
        Open in Google Photos
      </button>
      {!url ? (
        <div>
          <p>Fallback search: {fallbackQuery}</p>
          <button type="button" onClick={() => void handleCopy()}>
            {copied ? 'Copied' : 'Copy query'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
