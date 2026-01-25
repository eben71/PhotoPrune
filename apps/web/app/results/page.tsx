'use client';

import Link from 'next/link';

import { Banner } from '../components/Banner';
import { CostPanel } from '../components/CostPanel';
import { GroupList } from '../components/GroupList';
import { requireResults } from '../state/sessionGuards';
import { useRunSession } from '../state/runSessionStore';

export default function ResultsPage() {
  const { state, hydrated } = useRunSession();

  if (!hydrated) {
    return null;
  }

  const guard = requireResults(state.results);

  if (!guard.allow) {
    return (
      <section>
        <h1>Session expired</h1>
        <p>Your results are no longer available in this session.</p>
        <Link href="/">Return to start</Link>
      </section>
    );
  }

  const { results, telemetry } = state;
  if (!results) {
    return null;
  }

  const hasIssues =
    results.skippedItems.length > 0 || results.failedItems.length > 0;
  const hitHardCap = telemetry?.cost.hitHardCap ?? false;

  return (
    <section>
      <h1>Results</h1>
      <p>Potential duplicates grouped by confidence (High/Medium/Low).</p>

      {hasIssues || hitHardCap ? (
        <Banner tone="warn" title="Partial results">
          {hitHardCap
            ? 'Hard cap reached; results may be partial.'
            : 'Some items were skipped or failed during analysis.'}
        </Banner>
      ) : null}

      <section>
        <h2>Run summary</h2>
        <ul>
          <li>Groups: {results.summary.groupsCount}</li>
          <li>Grouped items: {results.summary.groupedItemsCount}</li>
          <li>Ungrouped items: {results.summary.ungroupedItemsCount}</li>
        </ul>
      </section>

      <GroupList groups={results.groups} />

      {results.skippedItems.length > 0 ? (
        <section>
          <h2>Skipped items</h2>
          <ul>
            {results.skippedItems.map((item) => (
              <li key={`${item.itemId}-${item.reasonCode}`}>
                {item.itemId}: {item.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results.failedItems.length > 0 ? (
        <section>
          <h2>Failed items</h2>
          <ul>
            {results.failedItems.map((item) => (
              <li key={`${item.itemId}-${item.reasonCode}`}>
                {item.itemId}: {item.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CostPanel telemetry={telemetry} />
    </section>
  );
}
