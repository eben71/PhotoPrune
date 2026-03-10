'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { LiveFeed, type FeedEvent } from '../../components/LiveFeed';
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
  const [scans, setScans] = useState<ProjectScanRecord[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [unreviewedCount, setUnreviewedCount] = useState(0);

  const liveEvents = useMemo<FeedEvent[]>(
    () =>
      scans.slice(0, 8).map((scan) => ({
        id: scan.id,
        timestamp: scan.createdAt,
        label: `Scan ${scan.id} captured from ${scan.sourceType}`
      })),
    [scans]
  );

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    void (async () => {
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

      const loadScans = async () => {
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
      };

      await loadScans();

      if (cancelled) {
        return;
      }

      interval = setInterval(() => {
        if (!cancelled) {
          void loadScans();
        }
      }, 4000);
    })();

    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [params]);

  return (
    <section>
      <h1>{projectName || 'Project'}</h1>
      <p>Done: {doneCount}</p>
      <p>Unreviewed: {unreviewedCount}</p>
      {projectId ? (
        <Link href={`/projects/${projectId}/run`}>New scan</Link>
      ) : null}
      {projectId && scans[0] ? (
        <Link href={`/projects/${projectId}/results?scanId=${scans[0].id}`}>
          Resume latest results
        </Link>
      ) : null}
      <h2>Scans</h2>
      <ul>
        {scans.map((scan) => (
          <li key={scan.id}>{scan.id}</li>
        ))}
      </ul>
      <LiveFeed title="Live project feed" events={liveEvents} />
    </section>
  );
}
