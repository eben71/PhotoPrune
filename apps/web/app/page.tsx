'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  normalizePickerSelection,
  useGooglePhotosPicker
} from './hooks/useGooglePhotosPicker';
import { useRunSession } from './state/runSessionStore';

export default function HomePage() {
  const router = useRouter();
  const { setSelection, clearSelection } = useRunSession();
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const { isLoading, error, lastOutcome, openPicker } = useGooglePhotosPicker();

  const maxSelection = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_SCAN_MAX_PHOTOS;
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const handleSelectFromGoogle = async () => {
    const selectedItems = await openPicker();
    if (!selectedItems || selectedItems.length === 0) return;
    if (maxSelection && selectedItems.length > maxSelection) {
      setSelectionWarning(
        `You selected ${selectedItems.length} items, but this session supports up to ${maxSelection}.`
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

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">
          <strong>PhotoPrune</strong>
          <nav className="nav-links">
            <Link className="nav-link" href="/">
              Get started
            </Link>
            <Link className="nav-link" href="/run">
              Analysis
            </Link>
            <Link className="nav-link" href="/results">
              Review
            </Link>
          </nav>
        </div>
      </header>
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">Trust-first review</p>
          <h1>Review similar photos safely</h1>
          <p>You review each group before anything changes.</p>
        </section>

        <section className="grid grid-2-1" style={{ marginTop: '1.25rem' }}>
          <div className="card">
            <h2>We found groups of very similar photos for you to review.</h2>
            <p>
              Recommended photo and confidence bands keep the process clear and
              calm.
            </p>
            <p>It does not delete anything automatically.</p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 12
              }}
            >
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void handleSelectFromGoogle()}
                disabled={isLoading}
              >
                {isLoading
                  ? 'Opening Google Photos…'
                  : 'Select from Google Photos'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={clearSelection}
              >
                Clear session
              </button>
            </div>
            {selectionWarning ? <p>{selectionWarning}</p> : null}
            {error ? <p role="alert">{error}</p> : null}
            {lastOutcome === 'cancelled' ? (
              <p aria-live="polite">Selection cancelled.</p>
            ) : null}
          </div>
          <aside className="card-dark">
            <h3>High, Medium, Low confidence</h3>
            <p>Confidence reflects similarity, not importance.</p>
            <p>Skip this group and come back later.</p>
          </aside>
        </section>
      </main>
    </>
  );
}
