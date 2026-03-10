import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { PickerPayloadImporter } from '../app/components/PickerPayloadImporter';

describe('PickerPayloadImporter', () => {
  it('parses picker payload and emits selection', () => {
    const onApplySelection = vi.fn();
    render(<PickerPayloadImporter onApplySelection={onApplySelection} />);

    fireEvent.change(screen.getByLabelText('Picker payload'), {
      target: {
        value: JSON.stringify({
          mediaItems: [
            {
              id: 'm1',
              baseUrl: 'https://placehold.co/300',
              filename: 'photo.jpg',
              mimeType: 'image/jpeg',
              createTime: '2025-01-01T00:00:00Z',
              type: 'PHOTO'
            }
          ]
        })
      }
    });

    fireEvent.click(screen.getByText('Use selection'));
    expect(onApplySelection).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'm1' })])
    );
  });
});
