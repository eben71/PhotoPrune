import { fireEvent, render, screen } from '@testing-library/react';

import { GroupCard } from '../app/components/GroupCard';
import type { Group } from '../src/types/phase2Envelope';

const group: Group = {
  groupId: 'group-1',
  groupType: 'EXACT',
  confidence: 'HIGH',
  reasonCodes: ['HASH_MATCH'],
  itemsCount: 4,
  representativeItemIds: ['item-1', 'item-2'],
  items: [
    {
      itemId: 'item-1',
      type: 'PHOTO',
      createTime: '2024-12-12T10:12:00.000Z',
      filename: 'IMG_0001.JPG',
      mimeType: 'image/jpeg',
      thumbnail: {
        baseUrl: 'https://placehold.co/300x300/png?text=1',
        suggestedSizePx: 300
      },
      links: {
        googlePhotos: {
          url: null
        }
      }
    },
    {
      itemId: 'item-2',
      type: 'PHOTO',
      createTime: '2024-12-12T10:12:05.000Z',
      filename: 'IMG_0001_COPY.JPG',
      mimeType: 'image/jpeg',
      thumbnail: {
        baseUrl: 'https://placehold.co/300x300/png?text=2',
        suggestedSizePx: 300
      },
      links: {
        googlePhotos: {
          url: null
        }
      }
    },
    {
      itemId: 'item-3',
      type: 'PHOTO',
      createTime: '2024-12-12T10:12:12.000Z',
      filename: 'IMG_0001_EDIT.JPG',
      mimeType: 'image/jpeg',
      thumbnail: {
        baseUrl: 'https://placehold.co/300x300/png?text=3',
        suggestedSizePx: 300
      },
      links: {
        googlePhotos: {
          url: null
        }
      }
    },
    {
      itemId: 'item-4',
      type: 'PHOTO',
      createTime: '2024-12-12T10:12:20.000Z',
      filename: 'IMG_0001_ALT.JPG',
      mimeType: 'image/jpeg',
      thumbnail: {
        baseUrl: 'https://placehold.co/300x300/png?text=4',
        suggestedSizePx: 300
      },
      links: {
        googlePhotos: {
          url: null
        }
      }
    }
  ]
};

describe('GroupCard', () => {
  it('shows reason panel, Google Photos actions, and expanded items', () => {
    render(<GroupCard group={group} index={0} />);

    expect(screen.getByText('Confidence: HIGH')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Reason: Strong visual match across structure and content'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Representative Photo')).toBeInTheDocument();
    expect(
      screen.getByText(/this temporary review does not save group decisions/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /keep recommended/i })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /mark externally/i })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /skip for now/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /show all items/i }));

    expect(screen.getByText('IMG_0001_ALT.JPG')).toBeInTheDocument();
    expect(
      screen.getAllByText(/exact google photos link unavailable/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole('link', { name: /open exact photo/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/mark for potential removal \(review externally\)/i)
        .length
    ).toBeGreaterThan(0);
  });

  it('uses confidence-aware fallback reason text when reason code is unknown', () => {
    const lowConfidenceGroup: Group = {
      ...group,
      confidence: 'LOW',
      reasonCodes: ['UNKNOWN_REASON']
    };

    render(<GroupCard group={lowConfidenceGroup} index={1} />);

    expect(
      screen.getByText(
        'Reason: Shared visual traits with weaker overall similarity'
      )
    ).toBeInTheDocument();
  });
});
