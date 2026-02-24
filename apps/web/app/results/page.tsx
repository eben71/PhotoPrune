'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Banner } from '../components/Banner';
import { CostPanel } from '../components/CostPanel';
import { GroupList } from '../components/GroupList';
import { trustCopy } from '../copy/trustCopy';
import { requireResults } from '../state/sessionGuards';
import { useRunSession } from '../state/runSessionStore';

export default function ResultsPage() {
  const router = useRouter();
  const { state, hydrated, clearSelection } = useRunSession();

  if (!hydrated) {
    return null;
  }

  const guard = requireResults(state.results);

  if (!guard.allow) {
    return (
      <section>
        <h1>Session expired</h1>
        <p>{trustCopy.sessionBanner[0]}</p>
        <p>{trustCopy.sessionBanner[1]}</p>
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

  const handleClearSession = () => {
    clearSelection();
    router.push('/');
  };

  return (
    <section>
      <h1>{trustCopy.results.header}</h1>
      {trustCopy.results.intro.map((line) => (
        <p key={line}>{line}</p>
      ))}

      <Banner tone="info" title={trustCopy.sessionBanner[0]}>
        <p>{trustCopy.sessionBanner[1]}</p>
      </Banner>

      <button type="button" onClick={handleClearSession}>
        End Session
      </button>

      {hitHardCap ? (
        <Banner tone="warn" title={trustCopy.capReached.header}>
          {trustCopy.capReached.explanation.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </Banner>
      ) : null}

      <section>
        <h2>{trustCopy.results.confidenceTitle}</h2>
        <ul>
          <li>
            <strong>HIGH:</strong> {trustCopy.results.confidenceBands.HIGH}
          </li>
          <li>
            <strong>MEDIUM:</strong> {trustCopy.results.confidenceBands.MEDIUM}
          </li>
          <li>
            <strong>LOW:</strong> {trustCopy.results.confidenceBands.LOW}
          </li>
        </ul>
        <p>{trustCopy.results.confidenceFooter}</p>
      </section>

      <section>
        <h2>Run summary</h2>
        <ul>
          <li>Groups: {results.summary.groupsCount}</li>
          <li>Grouped items: {results.summary.groupedItemsCount}</li>
          <li>Ungrouped items: {results.summary.ungroupedItemsCount}</li>
        </ul>
      </section>

      <GroupList groups={results.groups} />

      {hasIssues ? (
        <Banner tone="warn" title={trustCopy.errors.processing.title}>
          {trustCopy.errors.processing.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </Banner>
      ) : null}

      <CostPanel telemetry={telemetry} />
    </section>
  );
}
