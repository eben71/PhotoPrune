import Link from 'next/link';

import { Header } from '../../src/components/Header';

const accountDetails = [
  {
    label: 'Connection status',
    value: 'Connect from the home screen when you start a review'
  },
  {
    label: 'Google Photos access',
    value: 'Read-only picker selection for the current review flow'
  },
  {
    label: 'Account management',
    value: 'Full account settings are not part of this MVP'
  }
] as const;

export default function AccountPage() {
  return (
    <div className="app-bg min-h-screen">
      <Header />

      <main className="page-shell desktop-gutter settings-main">
        <section className="settings-hero">
          <span className="home-eyebrow">Account</span>
          <h1 className="settings-title">Account status</h1>
          <p className="settings-copy">
            Account details are limited to the current Google Photos review
            workflow.
          </p>
        </section>

        <section className="settings-grid" aria-label="Account details">
          {accountDetails.map((item) => (
            <article key={item.label} className="surface-panel settings-panel">
              <h2 className="settings-panel-title">{item.label}</h2>
              <p className="settings-panel-copy">{item.value}</p>
            </article>
          ))}
        </section>

        <Link href="/" className="action-button-primary settings-primary-link">
          Start from home
        </Link>
      </main>
    </div>
  );
}
