import { describe, expect, it } from 'vitest';

import fixture from '../fixtures/phase2_2_sample_results.json';
import { RunEnvelopeSchema } from '../src/types/phase2Envelope';

describe('Phase 2.1 sanity fixtures', () => {
  it('matches the run envelope schema contract snapshot', () => {
    const parsed = RunEnvelopeSchema.parse(fixture);

    expect(parsed).toMatchSnapshot();
  });

  it('captures expected duplicate and burst behavior without duplicate item IDs', () => {
    const parsed = RunEnvelopeSchema.parse(fixture);
    const groups = parsed.results.groups;
    const exactGroup = groups.find((group) => group.groupType === 'EXACT');
    const burstGroup = groups.find(
      (group) => group.groupType === 'BURST_SERIES'
    );

    expect(exactGroup?.confidence).toBe('HIGH');
    expect(exactGroup?.itemsCount).toBe(3);
    expect(exactGroup?.representativeItemIds.length).toBe(2);
    expect(burstGroup?.confidence).toBe('MEDIUM');
    expect(burstGroup?.itemsCount).toBe(2);

    const groupedIds = groups.flatMap((group) =>
      group.items.map((item) => item.itemId)
    );
    expect(new Set(groupedIds).size).toBe(groupedIds.length);

    const supportsEditedVariants = groups.some(
      (group) => group.groupType === 'EDIT_VARIANT'
    );
    if (supportsEditedVariants) {
      expect(groups.some((group) => group.groupType === 'EDIT_VARIANT')).toBe(
        true
      );
    }

    expect(parsed.run.status).toBe('COMPLETED');
  });

  it('uses confidence bands with reasons and never exposes similarity percentages', () => {
    const parsed = RunEnvelopeSchema.parse(fixture);
    const serialized = JSON.stringify(parsed);

    expect(serialized).not.toContain('%');
    expect(serialized.toLowerCase()).not.toContain('percent');

    for (const group of parsed.results.groups) {
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(group.confidence);
      expect(group.reasonCodes.length).toBeGreaterThan(0);
    }
  });

  it('reports skipped or failed items with reason fields when present', () => {
    const parsed = RunEnvelopeSchema.parse(fixture);
    const issues = [
      ...parsed.results.skippedItems,
      ...parsed.results.failedItems
    ];

    for (const issue of issues) {
      expect(issue.itemId.length).toBeGreaterThan(0);
      expect(issue.reasonCode.length).toBeGreaterThan(0);
      expect(issue.message.length).toBeGreaterThan(0);
    }
  });
});
