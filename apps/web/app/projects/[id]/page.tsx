'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Scan = { id: string; createdAt: string; sourceType: string };

export default function ProjectDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectName, setProjectName] = useState('');
  const [scans, setScans] = useState<Scan[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [unreviewedCount, setUnreviewedCount] = useState(0);

  useEffect(() => {
    void (async () => {
      const { id } = await params;
      const projectResponse = await fetch(`/api/projects/${id}`);
      const project = await projectResponse.json();
      setProjectName(project.name);
      const scansResponse = await fetch(`/api/projects/${id}/scans`);
      const scansPayload = await scansResponse.json();
      setScans(scansPayload);
      if (scansPayload[0]) {
        const resultsResponse = await fetch(
          `/api/projects/${id}/scans/${scansPayload[0].id}/results`
        );
        const results = await resultsResponse.json();
        const reviews = Object.values(results.reviews ?? {}) as Array<{ state: string }>;
        setDoneCount(reviews.filter((review) => review.state === 'DONE').length);
        setUnreviewedCount(reviews.filter((review) => review.state === 'UNREVIEWED').length);
      }
    })();
  }, [params]);

  return (
    <section>
      <h1>{projectName || 'Project'}</h1>
      <p>Done: {doneCount}</p>
      <p>Unreviewed: {unreviewedCount}</p>
      <Link href="./run">New scan</Link>
      {scans[0] ? <Link href={`./results?scanId=${scans[0].id}`}>Resume latest results</Link> : null}
      <h2>Scans</h2>
      <ul>
        {scans.map((scan) => (
          <li key={scan.id}>{scan.id}</li>
        ))}
      </ul>
    </section>
  );
}
