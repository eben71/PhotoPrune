'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Banner } from './components/Banner';
import {
  useGooglePhotosPicker,
  normalizePickerSelection
} from './hooks/useGooglePhotosPicker';
import { useRunSession } from './state/runSessionStore';
import { trustCopy } from './copy/trustCopy';

export default function HomePage() {
  const router = useRouter();
  const { setSelection, clearSelection } = useRunSession();
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const { isLoading, error, lastOutcome, openPicker } = useGooglePhotosPicker();

  const maxSelection = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_SCAN_MAX_PHOTOS;
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const handleSelectFromGoogle = async () => {
    const selectedItems = await openPicker();
    if (!selectedItems || selectedItems.length === 0) {
      return;
    }

    if (maxSelection && selectedItems.length > maxSelection) {
      setSelectionWarning(
        `You selected ${selectedItems.length} items, but this session supports up to ${maxSelection}. Only the first ${maxSelection} items will be analyzed.`
      );
    } else {
      setSelectionWarning(null);
    }

    const normalized = normalizePickerSelection(
      maxSelection ? selectedItems.slice(0, maxSelection) : selectedItems
    );

    setSelection(normalized);
    router.push('/run');
  };

  const handleReset = () => {
    clearSelection();
    router.push('/');
  };

  return (
    <>
      <section>
        <h1>{trustCopy.landing.header}</h1>
        <p>{trustCopy.landing.subheader}</p>
        {trustCopy.landing.safetyLines.map((line) => (
          <p key={line}>{line}</p>
        ))}

        <button
          type="button"
          onClick={() => void handleSelectFromGoogle()}
          disabled={isLoading}
        >
          {isLoading ? 'Opening Google Photos…' : 'Select from Google Photos'}
        </button>

        <button type="button" onClick={handleReset}>
          {trustCopy.landing.secondaryButton}
        </button>

        {selectionWarning ? (
          <Banner tone="warn" title="Selection limit applied">
            <p>{selectionWarning}</p>
          </Banner>
        ) : null}

        {error ? (
          <Banner tone="error" title="Google Photos Picker unavailable">
            <p>{error}</p>
            <p>Confirm your Google API credentials, then refresh and retry.</p>
          </Banner>
        ) : null}

        {lastOutcome === 'cancelled' ? (
          <p aria-live="polite">Selection cancelled.</p>
        ) : null}

        <p>
          <Link href="/projects">Go to Projects</Link>
        </p>
      </section>
    </>
  );
}
