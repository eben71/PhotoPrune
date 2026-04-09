'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppIcon } from './components/AppIcon';
import { trustCopy } from './copy/trustCopy';
import {
  normalizePickerSelection,
  useGooglePhotosPicker
} from './hooks/useGooglePhotosPicker';
import { useRunSession } from './state/runSessionStore';
import { Header } from '../src/components/Header';

const previewImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD4ywXXaNJnaiB9T0jNjm7tjDtOik9ogM4xDi8zryWkGlyZl3w3eMDhyaOXDmVp2h-9qF4oLbmsI7Mh2Fyv89li0BxEbKGg53-RS-DN2Ky57iHPm-nFZT553Z7r8EXQ8VYC947xM5bW2q06i0xMnd-Y-OqIPYaswO-d7KYe5phnUWroYPaGMX3hdXjYVOGR95OK_e4nKbOBkWHBaaBl8YAXpJMdT0O3ceDk4kptLaiR_2lAgtuWV0QoJl3KC_wIinH29I023vLyT834';

export default function HomePage() {
  const router = useRouter();
  const { setSelection } = useRunSession();
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
    <div className="app-bg min-h-screen">
      <Header />

      <main className="page-shell desktop-gutter home-main">
        <section className="home-hero">
          <h2 className="sr-only">Review Similar Photos Safely</h2>
          <span className="home-eyebrow">Smart Photo Review</span>

          <h1 className="home-title">
            Review and declutter
            <br className="home-title-break" />
            <span className="bg-gradient-to-r from-[var(--pp-primary)] to-[#2c8d86] bg-clip-text text-transparent">
              your photo library
            </span>{' '}
            with confidence.
          </h1>

          <p className="home-subtitle">{trustCopy.landing.subheader}</p>

          <div className="home-cta-stack">
            <p className="sr-only">It does not delete anything.</p>
            <div className="home-cta-row">
              <button
                type="button"
                aria-label="Select from Google Photos"
                className="action-button-primary home-primary-cta"
                onClick={() => void handleSelectFromGoogle()}
                disabled={isLoading}
              >
                {isLoading
                  ? 'Opening Google Photos...'
                  : 'Connect Photo Library'}
              </button>

              <a
                href="#how-it-works"
                className="action-button-secondary home-secondary-cta"
              >
                Learn how it works
              </a>
            </div>

            <div className="home-trust-line">
              <AppIcon
                name="check"
                className="h-[14px] w-[14px] text-[var(--pp-primary)]"
              />
              <span>
                Nothing is removed automatically. You review every group first.
              </span>
            </div>
          </div>

          {selectionWarning ? (
            <p className="home-inline-message home-inline-message-error">
              {selectionWarning}
            </p>
          ) : null}
          {error ? (
            <p className="home-inline-message home-inline-message-error">
              {error}
            </p>
          ) : null}
          {lastOutcome === 'cancelled' ? (
            <p className="home-inline-message" aria-live="polite">
              Selection cancelled.
            </p>
          ) : null}
        </section>

        <section id="how-it-works" className="home-bento">
          <article className="home-paper-panel surface-panel-light">
            <div className="home-paper-glow" />

            <div className="home-paper-content">
              <div className="home-paper-top">
                <div className="home-paper-heading">
                  <div className="home-paper-icon">
                    <AppIcon name="review" className="h-[20px] w-[20px]" />
                  </div>
                  <h3 className="home-paper-title">Review-First Workflow</h3>
                </div>

                <div className="home-paper-copy">
                  <p className="home-paper-lede">
                    Your photos, curated with care. No photos are deleted
                    automatically. You stay in control of every decision.
                  </p>
                  <p className="home-paper-detail">
                    {trustCopy.landing.doesBullets[0]}.{' '}
                    {trustCopy.landing.doesBullets[1]}.{' '}
                    {trustCopy.landing.doesBullets[2]}.
                  </p>
                </div>

                <div className="home-progress-row" aria-hidden="true">
                  <span className="home-progress-pill home-progress-pill-active" />
                  <span className="home-progress-pill" />
                  <span className="home-progress-pill" />
                </div>
              </div>

              <div className="home-preview-shell">
                <div className="home-preview">
                  <Image
                    src={previewImage}
                    alt="App review interface with photo grouping"
                    fill
                    className="object-cover opacity-80"
                    sizes="(max-width: 768px) 100vw, 54vw"
                  />
                </div>
                <div className="home-preview-fade" />
                <div className="home-preview-overlay">
                  <div className="home-preview-label">
                    <AppIcon name="group" className="h-[16px] w-[16px]" />
                    <span>Review 12 similar photos</span>
                  </div>
                  <span className="home-preview-badge">Action Required</span>
                </div>
              </div>
            </div>
          </article>

          <div className="home-side-stack">
            <article className="surface-panel home-side-card confidence-band-high">
              <div className="home-side-card-content">
                <AppIcon
                  name="group"
                  className="home-side-card-icon text-[var(--pp-primary)]"
                />
                <div>
                  <h3 className="home-side-card-title">Review Before Action</h3>
                  <p className="home-side-card-copy">
                    Experience a non-destructive workflow where every suggested
                    change is presented for your explicit approval before
                    anything changes outside this app.
                  </p>
                </div>
              </div>
            </article>

            <article className="surface-panel home-side-card home-side-card-secondary">
              <div className="home-side-card-content">
                <AppIcon
                  name="support"
                  className="home-side-card-icon text-[var(--pp-secondary)]"
                />
                <div>
                  <h3 className="home-side-card-title">Private &amp; Secure</h3>
                  <div className="home-side-card-list">
                    <p>{trustCopy.landing.doesNotBullets[0]}.</p>
                    <p>{trustCopy.landing.doesNotBullets[1]}.</p>
                    <p>{trustCopy.landing.doesNotBullets[2]}.</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="home-bottom-cta">
          <h2 className="home-bottom-title">Ready to reclaim your library?</h2>
          <p className="home-bottom-copy">
            Start a single-session review and keep every decision in your hands.
          </p>
          <button
            type="button"
            className="home-bottom-button"
            onClick={() => void handleSelectFromGoogle()}
            disabled={isLoading}
          >
            {isLoading ? 'Opening Google Photos...' : 'Get Started For Free'}
          </button>
          <p className="home-bottom-note">
            Safe and secure. Nothing can be deleted from this screen.
          </p>
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-split page-shell desktop-gutter">
          <div>
            <p className="home-footer-brand">PhotoPrune</p>
            <p className="home-footer-meta">
              Copyright 2026 PhotoPrune. All rights reserved.
            </p>
          </div>

          <div className="home-footer-links">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security</span>
            <span>Contact Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
