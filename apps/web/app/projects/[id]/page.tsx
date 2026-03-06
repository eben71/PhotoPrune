'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    void (async () => {
      const { id } = await params;
      setProjectId(id);
      const projectResponse = await fetch(`/api/projects/${id}`);
      const project = ProjectSchema.parse(await projectResponse.json());
      setProjectName(project.name);

      const scansResponse = await fetch(`/api/projects/${id}/scans`);
      const scansPayload = ProjectScanRecordSchema.array().parse(
        await scansResponse.json()
      );
      setScans(scansPayload);

      const latestScan = scansPayload[0];
      if (!latestScan) {
        return;
      }

      const resultsResponse = await fetch(
        `/api/projects/${id}/scans/${latestScan.id}/results`
      );
      const results = ProjectScanResultsResponseSchema.parse(
        await resultsResponse.json()
      );
      const reviews = Object.values(results.reviews);
      setDoneCount(reviews.filter((review) => review.state === 'DONE').length);
      setUnreviewedCount(
        reviews.filter((review) => review.state === 'UNREVIEWED').length
      );
    })();
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
    </section>
  );
}
