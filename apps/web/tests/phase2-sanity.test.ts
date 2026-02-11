import { describe, expect, it } from 'vitest';

import fixture from '../fixtures/phase2_2_sample_results.json';
import { RunEnvelopeSchema } from '../src/types/phase2Envelope';

describe('Phase 2.1 sanity fixtures', () => {
  it('matches the run envelope schema and avoids similarity percentages', () => {
    const parsed = RunEnvelopeSchema.parse(fixture);
    const serialized = JSON.stringify(parsed);

    expect(serialized).not.toContain('%');
    expect(serialized.toLowerCase()).not.toContain('percent');
  });

  it('captures expected duplicate, burst, and skip behavior', () => {
    const parsed = RunEnvelopeSchema.parse(fixture);
    const groups = parsed.results.groups;
    const exactGroup = groups.find((group) => group.groupType === 'EXACT');
    const burstGroup = groups.find((group) => group.groupType === 'BURST_SERIES');

    expect(exactGroup?.confidence).toBe('HIGH');
    expect(exactGroup?.itemsCount).toBe(3);
    expect(exactGroup?.representativeItemIds.length).toBe(2);
    expect(burstGroup?.confidence).toBe('MEDIUM');
    expect(burstGroup?.itemsCount).toBe(2);
    expect(parsed.results.skippedItems.length).toBeGreaterThan(0);
    expect(parsed.run.status).toBe('COMPLETED');
  });
});
