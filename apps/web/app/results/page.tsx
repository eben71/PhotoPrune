'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { GroupList } from '../components/GroupList';
import { requireResults } from '../state/sessionGuards';
import { useRunSession } from '../state/runSessionStore';

export default function ResultsPage() {
  const router = useRouter();
  const { state, hydrated, clearSelection } = useRunSession();

  if (!hydrated) return null;
  const guard = requireResults(state.results);
  if (!guard.allow) {
    return (
      <main className="shell">
        <section className="card">
          <h1>Session expired</h1>
          <p>This is a single-session scan. Start a new run to continue.</p>
          <Link href="/">Return to start</Link>
        </section>
      </main>
    );
  }

  const { results } = state;
  if (!results) return null;

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Action required</p>
        <h1>Review dashboard</h1>
        <p>You review each group before anything changes.</p>
      </section>
      <section className="card" style={{ marginTop: '1rem' }}>
        <div className="summary">
          <div>
            <h2>Session summary</h2>
            <p>
              Groups: {results.summary.groupsCount} • Grouped items:{' '}
              {results.summary.groupedItemsCount}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              clearSelection();
              router.push('/');
            }}
          >
            End Session
          </button>
        </div>
        <div className="badges">
          <span className="badge badge-high">High confidence</span>
          <span className="badge badge-medium">Medium confidence</span>
          <span className="badge badge-low">Low confidence</span>
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2>What the confidence bands mean:</h2>
        <p>
          High confidence, Medium confidence, and Low confidence indicate
          similarity only.
        </p>
        <p>Nothing is deleted automatically.</p>
        <p>
          This is a single-session scan. If you refresh or close this page,
          results will be lost.
        </p>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <GroupList groups={results.groups} />
      </section>
    </main>
  );
}
