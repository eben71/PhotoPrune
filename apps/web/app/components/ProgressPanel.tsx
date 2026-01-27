import type { RunEnvelope } from '../../src/types/phase2Envelope';

type ProgressPanelProps = {
  progress: RunEnvelope['progress'] | null;
  status?: RunEnvelope['run']['status'];
};

const stageLabels: Record<RunEnvelope['progress']['stage'], string> = {
  INGEST: 'Ingest',
  HASH: 'Hash',
  COMPARE: 'Compare',
  GROUP: 'Group',
  FINALIZE: 'Finalize'
};

export function ProgressPanel({ progress, status }: ProgressPanelProps) {
  if (!progress) {
    return (
      <section>
        <h2>Progress</h2>
        <p>No run started yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Progress</h2>
      <p>
        Stage: {stageLabels[progress.stage]} ({progress.counts.processed} of{' '}
        {progress.counts.total})
      </p>
      <p>{progress.message}</p>
      {status === 'RUNNING' ? <p>Working…</p> : null}
    </section>
  );
}
