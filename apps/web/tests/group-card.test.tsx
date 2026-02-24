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
          url: null,
          fallbackQuery: 'IMG_0001 item-1',
          fallbackUrl: 'https://photos.google.com/'
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
          url: null,
          fallbackQuery: 'IMG_0001_COPY item-2',
          fallbackUrl: 'https://photos.google.com/'
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
          url: null,
          fallbackQuery: 'IMG_0001_EDIT item-3',
          fallbackUrl: 'https://photos.google.com/'
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
          url: null,
          fallbackQuery: 'IMG_0001_ALT item-4',
          fallbackUrl: 'https://photos.google.com/'
        }
      }
    }
  ]
};

describe('GroupCard', () => {
  it('shows reason panel and expands to reveal all items', () => {
    render(<GroupCard group={group} index={0} />);

    expect(screen.getByText('Confidence: HIGH')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show all items/i }));

    expect(screen.getByText('IMG_0001_ALT.JPG')).toBeInTheDocument();
    expect(
      screen.getAllByText(/mark for potential removal \(review externally\)/i)
        .length
    ).toBeGreaterThan(0);
  });
});
