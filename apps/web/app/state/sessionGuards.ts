import type { RunEnvelope } from '../../src/types/phase2Envelope';

export type GuardDecision = {
  allow: boolean;
  reason?: string;
};

export function requireSelection(selectionCount: number): GuardDecision {
  if (selectionCount > 0) {
    return { allow: true };
  }
  return {
    allow: false,
    reason: 'Selection missing'
  };
}

export function requireResults(
  results: RunEnvelope['results'] | null
): GuardDecision {
  if (results) {
    return { allow: true };
  }
  return {
    allow: false,
    reason: 'Session expired'
  };
}
