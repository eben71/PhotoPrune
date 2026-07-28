'use client';

import type { Item } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';

export function OpenInGooglePhotosButton({ item }: { item: Item }) {
  const { url } = item.links.googlePhotos;

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="action-button-secondary inline-flex rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] no-underline"
      >
        {trustCopy.groupDetail.exactPhotoAction}
      </a>
    );
  }

  return (
    <div className="rounded-xl bg-slate-100 px-3 py-3 text-xs leading-6 text-slate-600">
      <p className="font-semibold text-slate-700">
        {trustCopy.groupDetail.exactPhotoUnavailable}
      </p>
      <p>{trustCopy.groupDetail.exactPhotoUnavailableGuidance}</p>
    </div>
  );
}
