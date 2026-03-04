'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { sampleSelection } from '../../../data/sampleSelection';

export default function ProjectRunPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState('');
  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);
  const router = useRouter();

  const handleStart = async () => {
    if (!id) return;
    const response = await fetch(`/api/projects/${id}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoItems: sampleSelection.map((item) => ({
          id: item.id,
          createTime: item.createTime,
          filename: item.filename,
          mimeType: item.mimeType,
          width: 300,
          height: 300
        }))
      })
    });
    const payload = await response.json();
    router.push(`/projects/${id}/results?scanId=${payload.projectScanId}`);
  };

  return (
    <section>
      <h1>Project scan</h1>
      <p>Manual-only guidance. No deletion API calls are performed.</p>
      <button type="button" onClick={() => void handleStart()}>
        Start project scan
      </button>
    </section>
  );
}
