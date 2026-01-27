import type { PickerItem, RunEnvelope } from '../types/phase2Envelope';

export function startPhase21Run(
  _selection: PickerItem[]
): Promise<{ runId: string }> {
  void _selection;
  return Promise.reject(
    new Error(
      'Phase 2.1 engine integration is not wired here yet. Use the adapter stub in engineAdapter.ts.'
    )
  );
}

export function pollPhase21Run(_runId: string): Promise<RunEnvelope> {
  void _runId;
  return Promise.reject(
    new Error(
      'Phase 2.1 engine integration is not wired here yet. Use the adapter stub in engineAdapter.ts.'
    )
  );
}

export function cancelPhase21Run(_runId: string): Promise<RunEnvelope> {
  void _runId;
  return Promise.reject(
    new Error(
      'Phase 2.1 engine integration is not wired here yet. Use the adapter stub in engineAdapter.ts.'
    )
  );
}
