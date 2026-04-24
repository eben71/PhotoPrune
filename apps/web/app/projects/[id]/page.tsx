'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { LiveFeed, type FeedEvent } from '../../components/LiveFeed';
import { ReviewShell } from '../../components/ReviewShell';
import { trustCopy } from '../../copy/trustCopy';
import {
  type ProjectScanRecord,
  ProjectSchema,
  ProjectScanRecordSchema,
  ProjectScanResultsResponseSchema
} from '../../../src/types/projects';

export default function ProjectDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [scopeLabel, setScopeLabel] = useState<string>(
    trustCopy.projects.scopePicker
  );
  const [scans, setScans] = useState<ProjectScanRecord[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const liveEvents = useMemo<FeedEvent[]>(
    () =>
      scans.slice(0, 8).map((scan) => ({
        id: scan.id,
        timestamp: scan.createdAt,
        label: `Saved scan from ${scan.sourceType}`
      })),
    [scans]
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { id } = await params;
        if (cancelled) {
          return;
        }

        setProjectId(id);
        const projectResponse = await fetch(`/api/projects/${id}`);
        const project = ProjectSchema.parse(await projectResponse.json());
        if (cancelled) {
          return;
        }

        setProjectName(project.name);
        setScopeLabel(
          project.scope?.type === 'album_set'
            ? trustCopy.projects.scopeAlbumSet
            : trustCopy.projects.scopePicker
        );

        const scansResponse = await fetch(`/api/projects/${id}/scans`);
        const scansPayload = ProjectScanRecordSchema.array().parse(
          await scansResponse.json()
        );
        if (cancelled) {
          return;
        }

        setScans(scansPayload);

        const latestScan = scansPayload[0];
        if (!latestScan) {
          setDoneCount(0);
          setUnreviewedCount(0);
          return;
        }

        const resultsResponse = await fetch(
          `/api/projects/${id}/scans/${latestScan.id}/results`
        );
        const results = ProjectScanResultsResponseSchema.parse(
          await resultsResponse.json()
        );
        if (cancelled) {
          return;
        }

        const reviews = Object.values(results.reviews);
        setDoneCount(
          reviews.filter((review) => review.state === 'DONE').length
        );
        setUnreviewedCount(
          reviews.filter((review) => review.state === 'UNREVIEWED').length
        );
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Unable to load this project right now.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <ReviewShell activeStage="SUMMARY">
      <div className="mx-auto max-w-[1120px] pb-16 pt-12">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[720px]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
              Saved project
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] text-[var(--pp-on-background)]">
              {projectName || 'Project'}
            </h1>
            <p className="mt-5 text-base leading-8 text-[var(--pp-on-surface-muted)]">
              {trustCopy.projects.listIntro}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {projectId ? (
              <Link
                href={`/projects/${projectId}/run`}
                className="action-button-primary px-8 py-3.5 text-sm"
              >
                Run another scan
              </Link>
            ) : null}
            {projectId && scans[0] ? (
              <Link
                href={`/projects/${projectId}/results`}
                className="rounded-md bg-[#2a354b] px-8 py-3.5 text-sm font-bold text-[#d5def2] transition hover:bg-[#344159]"
              >
                Resume latest results
              </Link>
            ) : null}
          </div>
        </header>

        {error ? (
          <p className="mb-8 rounded-xl bg-[rgba(127,41,39,0.45)] px-4 py-3 text-sm text-[#ffd1cd]">
            {error}
          </p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="surface-panel rounded-[1rem] px-8 py-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
                  Done
                </p>
                <p className="mt-3 text-[3rem] font-black tracking-[-0.05em] text-white">
                  {doneCount}
                </p>
              </div>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]">
                  Unreviewed
                </p>
                <p className="mt-3 text-[3rem] font-black tracking-[-0.05em] text-white">
                  {unreviewedCount}
                </p>
              </div>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#96a8cf]">
                  Scope
                </p>
                <p className="mt-3 text-sm font-semibold leading-7 text-[var(--pp-on-surface-muted)]">
                  {scopeLabel}
                </p>
              </div>
            </div>
          </article>

          <article className="surface-panel rounded-[1rem] px-6 py-7">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]">
              Project guidance
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
              {trustCopy.projects.resultsReminder}
            </p>
          </article>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="surface-panel rounded-[1rem] px-8 py-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
                  Scan history
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
                  Resume any saved scan.
                </h2>
              </div>
              <Link
                href="/projects"
                className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]"
              >
                Back to projects
              </Link>
            </div>

            {scans.length === 0 ? (
              <p className="text-base leading-8 text-[var(--pp-on-surface-muted)]">
                No scans have been saved to this project yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {scans.map((scan) => (
                  <li key={scan.id}>
                    <Link
                      href={`/projects/${projectId}/results?scanId=${scan.id}`}
                      className="flex items-center justify-between rounded-xl border border-[rgba(99,118,155,0.14)] px-4 py-4 text-sm text-[var(--pp-on-background)] transition hover:border-[var(--pp-primary)]"
                    >
                      <span>{formatDate(scan.createdAt)}</span>
                      <span className="font-bold uppercase tracking-[0.14em] text-[var(--pp-secondary)]">
                        {scan.sourceType}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <LiveFeed title="Recent activity" events={liveEvents} />
        </section>
      </div>
    </ReviewShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
