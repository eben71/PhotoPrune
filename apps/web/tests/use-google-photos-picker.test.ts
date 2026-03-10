import { describe, expect, it } from 'vitest';

import { normalizePickerSelection } from '../app/hooks/useGooglePhotosPicker';

describe('normalizePickerSelection', () => {
  it('maps picker items into run session selection payload', () => {
    expect(
      normalizePickerSelection([
        {
          id: 'item-1',
          createTime: '2024-01-01T00:00:00Z',
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          width: 100,
          height: 80,
          baseUrl: 'https://example.com/base',
          productUrl: 'https://photos.google.com/photo/abc'
        }
      ])
    ).toEqual([
      {
        id: 'item-1',
        createTime: '2024-01-01T00:00:00Z',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        baseUrl: 'https://example.com/base',
        type: 'PHOTO'
      }
    ]);
  });
});
