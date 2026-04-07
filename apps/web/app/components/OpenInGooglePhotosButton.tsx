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
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Open in Google Photos
      </button>
      {!url ? (
        <div className="rounded-xl bg-slate-100 px-3 py-3 text-xs leading-6 text-slate-600">
          <p>Fallback search: {fallbackQuery}</p>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-400 hover:bg-white"
          >
            {copied ? 'Copied' : 'Copy query'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
