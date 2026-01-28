import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      url: null,
      fallbackQuery: 'IMG_0001 item-1',
      fallbackUrl: 'https://photos.google.com/'
    }
  }
};

describe('OpenInGooglePhotosButton', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(
    navigator,
    'clipboard'
  );

  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      delete (navigator as { clipboard?: Clipboard }).clipboard;
    }
  });

  it('opens the direct Google Photos URL when available', () => {
    const item = {
      ...baseItem,
      links: {
        googlePhotos: {
          ...baseItem.links.googlePhotos,
          url: 'https://photos.google.com/direct/123'
        }
      }
    };

    render(<OpenInGooglePhotosButton item={item} />);

    fireEvent.click(
      screen.getByRole('button', { name: /open in google photos/i })
    );

    expect(window.open).toHaveBeenCalledWith(
      'https://photos.google.com/direct/123',
      '_blank',
      'noopener,noreferrer'
    );
    expect(screen.queryByText(/fallback search/i)).not.toBeInTheDocument();
  });

  it('shows and copies the fallback query when no direct URL is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    });
    vi.useFakeTimers();

    render(<OpenInGooglePhotosButton item={baseItem} />);

    expect(screen.getByText(/fallback search:/i)).toHaveTextContent(
      `Fallback search: ${baseItem.links.googlePhotos.fallbackQuery}`
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy query/i }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(
      baseItem.links.googlePhotos.fallbackQuery
    );
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(
      screen.getByRole('button', { name: /copy query/i })
    ).toBeInTheDocument();
  });

  it('does not attempt to copy when the clipboard API is unavailable', () => {
    delete (navigator as { clipboard?: Clipboard }).clipboard;

    render(<OpenInGooglePhotosButton item={baseItem} />);

    fireEvent.click(screen.getByRole('button', { name: /copy query/i }));

    expect(
      screen.getByRole('button', { name: /copy query/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /copied/i })
    ).not.toBeInTheDocument();
  });
});
