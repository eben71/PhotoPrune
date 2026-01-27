import { requireResults, requireSelection } from '../app/state/sessionGuards';
import type { RunEnvelope } from '../src/types/phase2Envelope';

describe('route guards', () => {
  it('blocks run page when selection is empty', () => {
    expect(requireSelection(0)).toEqual({
      allow: false,
      reason: 'Selection missing'
    });
  });

  it('allows run page when selection exists', () => {
    expect(requireSelection(2)).toEqual({ allow: true });
  });

  it('blocks results page when results are missing', () => {
    expect(requireResults(null)).toEqual({
      allow: false,
      reason: 'Session expired'
    });
  });

  it('allows results page when results exist', () => {
    const results = {
      summary: {
        groupsCount: 1,
        groupedItemsCount: 2,
        ungroupedItemsCount: 0
      },
      groups: [],
      skippedItems: [],
      failedItems: []
    } satisfies RunEnvelope['results'];

    expect(requireResults(results)).toEqual({ allow: true });
  });
});
