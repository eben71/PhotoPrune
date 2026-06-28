import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import HomePage from '../app/page';
import AccountPage from '../app/account/page';
import { ReviewShell } from '../app/components/ReviewShell';
import SettingsPage from '../app/settings/page';
import { RunSessionProvider } from '../app/state/runSessionStore';

const pushMock = vi.fn();
const openPickerMock = vi.fn();
let pathnameMock = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock,
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
    pathnameMock = '/';
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

  it('renders non-ambiguous settings and account affordances', () => {
    render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );

    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute(
      'href',
      '/settings'
    );
    expect(
      screen.getByRole('link', { name: /account status/i })
    ).toHaveAttribute('href', '/account');
    expect(screen.getByRole('link', { name: /history/i })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('renders non-ambiguous review shell settings and account affordances', () => {
    render(
      <ReviewShell activeStage="REVIEW">
        <p>Review content</p>
      </ReviewShell>
    );

    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute(
      'href',
      '/settings'
    );
    expect(
      screen.getByRole('link', { name: /account status/i })
    ).toHaveAttribute('href', '/account');
  });

  it('shows only MVP-scoped settings', () => {
    pathnameMock = '/settings';

    render(<SettingsPage />);

    expect(
      screen.getByRole('heading', { name: /mvp settings/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/read-only selection/i)).toBeInTheDocument();
    expect(screen.getByText(/automatic cleanup/i)).toBeInTheDocument();
    expect(screen.getByText(/not available in mvp/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('shows only MVP-scoped account status', () => {
    pathnameMock = '/account';

    render(<AccountPage />);

    expect(
      screen.getByRole('heading', { name: /account status/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/connect from the home screen/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/read-only picker selection/i)).toBeInTheDocument();
    expect(
      screen.getByText(/full account settings are not part of this mvp/i)
    ).toBeInTheDocument();
  });
});
