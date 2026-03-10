'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { GoogleAuthPanel } from '../../../components/GoogleAuthPanel';
import { PickerPayloadImporter } from '../../../components/PickerPayloadImporter';
import { useRunSession } from '../../../state/runSessionStore';
import { ProjectScanResponseSchema } from '../../../../src/types/projects';

export default function ProjectRunPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);
  const router = useRouter();
  const { state, setSelection } = useRunSession();

  const handleStart = async () => {
    if (!id || state.selection.length === 0) {
      return;
    }
    const response = await fetch(`/api/projects/${id}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoItems: state.selection.map((item) => ({
          id: item.id,
          createTime: item.createTime,
          filename: item.filename,
          mimeType: item.mimeType,
          width: 300,
          height: 300
        }))
      })
    });

    if (!response.ok) {
      setError('Unable to start project scan. Verify API connectivity and try again.');
      return;
    }

    const payload = ProjectScanResponseSchema.parse(await response.json());
    router.push(`/projects/${id}/results?scanId=${payload.projectScanId}`);
  };

  return (
    <>
      <section>
        <h1>Project scan</h1>
        <p>Manual-only guidance. No deletion API calls are performed.</p>
        <p>Selected items: {state.selection.length}</p>
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={!id || state.selection.length === 0}
        >
          Start project scan
        </button>
        {error ? <p role="alert">{error}</p> : null}
      </section>
      <GoogleAuthPanel />
      <PickerPayloadImporter
        onApplySelection={(selection) => {
          setSelection(selection);
          setError(null);
        }}
      />
    </>
  );
}
