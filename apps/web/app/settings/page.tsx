import { Header } from '../../src/components/Header';

const settings = [
  {
    label: 'Photo source',
    value: 'Google Photos picker, read-only selection'
  },
  {
    label: 'Cleanup actions',
    value: 'Manual review and Google Photos link-out only'
  },
  {
    label: 'Session scope',
    value: 'Current review session'
  }
] as const;

const unavailableItems = [
  'Billing',
  'Storage management',
  'Automatic cleanup',
  'Recovery or trash controls',
  'Sharing controls'
] as const;

export default function SettingsPage() {
  return (
    <div className="app-bg min-h-screen">
      <Header />

      <main className="page-shell desktop-gutter settings-main">
        <section className="settings-hero">
          <span className="home-eyebrow">Settings</span>
          <h1 className="settings-title">MVP settings</h1>
          <p className="settings-copy">
            PhotoPrune keeps this screen limited to settings that exist in the
            current review workflow.
          </p>
        </section>

        <section className="settings-grid" aria-label="Available settings">
          {settings.map((item) => (
            <article key={item.label} className="surface-panel settings-panel">
              <h2 className="settings-panel-title">{item.label}</h2>
              <p className="settings-panel-copy">{item.value}</p>
            </article>
          ))}
        </section>

        <section
          className="surface-panel-soft settings-unavailable"
          aria-labelledby="settings-unavailable-title"
        >
          <h2 id="settings-unavailable-title" className="settings-panel-title">
            Not available in MVP
          </h2>
          <ul className="settings-unavailable-list">
            {unavailableItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
