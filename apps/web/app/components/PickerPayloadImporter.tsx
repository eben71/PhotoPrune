'use client';

import { useState } from 'react';

import type { PickerItem } from '../../src/types/phase2Envelope';

type Props = {
  onApplySelection: (selection: PickerItem[]) => void;
};

type PickerPayloadShape = {
  mediaItems?: Array<{
    id?: string;
    baseUrl?: string;
    filename?: string;
    mimeType?: string;
    mediaFile?: {
      baseUrl?: string;
      filename?: string;
      mimeType?: string;
    };
    mediaMetadata?: {
      creationTime?: string;
    };
    createTime?: string;
    type?: 'PHOTO' | 'VIDEO';
  }>;
};

export function PickerPayloadImporter({ onApplySelection }: Props) {
  const [payload, setPayload] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [acceptedCount, setAcceptedCount] = useState(0);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(payload) as PickerPayloadShape;
      const mediaItems = parsed.mediaItems ?? [];
      const selection = mediaItems
        .map((item): PickerItem | null => {
          const id = item.id ?? '';
          const baseUrl = item.baseUrl ?? item.mediaFile?.baseUrl ?? '';
          const filename = item.filename ?? item.mediaFile?.filename ?? 'untitled';
          const mimeType = item.mimeType ?? item.mediaFile?.mimeType ?? 'image/jpeg';
          const createTime = item.createTime ?? item.mediaMetadata?.creationTime ?? new Date().toISOString();
          const type = item.type ?? (mimeType.startsWith('video/') ? 'VIDEO' : 'PHOTO');

          if (!id || !baseUrl) {
            return null;
          }

          return {
            id,
            baseUrl,
            filename,
            mimeType,
            createTime,
            type
          };
        })
        .filter((item): item is PickerItem => item !== null);

      if (selection.length === 0) {
        setError('No valid media items found. Paste a Picker payload containing mediaItems.');
        return;
      }

      setError(null);
      setAcceptedCount(selection.length);
      onApplySelection(selection);
    } catch {
      setError('Invalid JSON. Paste a valid Picker payload and retry.');
    }
  };

  return (
    <section>
      <h2>Import Picker payload</h2>
      <p>Paste JSON exported from the Picker harness or your live picker callback payload.</p>
      <textarea
        aria-label="Picker payload"
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        rows={8}
        style={{ width: '100%' }}
      />
      <button type="button" onClick={handleApply} disabled={!payload.trim()}>
        Use selection
      </button>
      {acceptedCount > 0 ? (
        <p aria-live="polite">Loaded {acceptedCount} selected items.</p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
