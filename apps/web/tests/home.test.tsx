import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import HomePage from '../app/page';
import { RunSessionProvider } from '../app/state/runSessionStore';

const pushMock = vi.fn();
const openPickerMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn()
  })
}));

vi.mock('../app/hooks/useGooglePhotosPicker', () => ({
  useGooglePhotosPicker: () => ({
    isLoading: false,
    error: null,
    lastOutcome: null,
    openPicker: openPickerMock
  }),
  normalizePickerSelection: (items: Array<Record<string, string>>) =>
    items.map((item) => ({
      id: item.id,
      createTime: item.createTime,
      filename: item.filename,
      mimeType: item.mimeType,
      baseUrl: item.baseUrl,
      type: 'PHOTO'
    }))
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trust and scope copy', () => {
    render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );

    expect(
      screen.getByRole('heading', { name: /review similar photos safely/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/it does not delete anything/i)
    ).toBeInTheDocument();
  });

  it('stores picker selection and routes to run', async () => {
    openPickerMock.mockResolvedValue([
      {
        id: '1',
        createTime: '2024-01-01T00:00:00Z',
        filename: 'a.jpg',
        mimeType: 'image/jpeg',
        baseUrl: 'https://example.com/a.jpg'
      }
    ]);

    render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );

    fireEvent.click(
      screen.getByRole('button', { name: /select from google photos/i })
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/run');
    });
  });
});
