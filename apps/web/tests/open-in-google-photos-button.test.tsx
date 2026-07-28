import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OpenInGooglePhotosButton } from '../app/components/OpenInGooglePhotosButton';
import type { Item } from '../src/types/phase2Envelope';

const baseItem: Item = {
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
};

describe('OpenInGooglePhotosButton', () => {
  it('renders the exact Google Photos URL as a safe new-tab link', () => {
    const item = {
      ...baseItem,
      links: {
        googlePhotos: {
          url: 'https://photos.google.com/photo/123'
        }
      }
    };

    render(<OpenInGooglePhotosButton item={item} />);

    const link = screen.getByRole('link', {
      name: /open exact photo in google photos/i
    });
    expect(link).toHaveAttribute('href', 'https://photos.google.com/photo/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(
      screen.queryByText(/exact google photos link unavailable/i)
    ).not.toBeInTheDocument();
  });

  it('shows manual guidance without any fallback action when no exact URL exists', () => {
    render(<OpenInGooglePhotosButton item={baseItem} />);

    expect(
      screen.getByText(/exact google photos link unavailable/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/find it manually in google photos/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /google photos/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /google photos|copy/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/fallback|query/i)).not.toBeInTheDocument();
  });

  it('keeps exact and unavailable item states independent', () => {
    const exactItem = {
      ...baseItem,
      itemId: 'item-2',
      links: {
        googlePhotos: {
          url: 'https://photos.google.com/photo/item-2'
        }
      }
    };

    const { rerender } = render(<OpenInGooglePhotosButton item={exactItem} />);
    expect(
      screen.getByRole('link', { name: /open exact photo/i })
    ).toBeInTheDocument();

    rerender(<OpenInGooglePhotosButton item={baseItem} />);

    expect(
      screen.queryByRole('link', { name: /open exact photo/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/exact google photos link unavailable/i)
    ).toBeInTheDocument();
  });
});
