import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { vi } from 'vitest';

import HomePage from '../app/page';
import AccountPage from '../app/account/page';
import { ReviewShell } from '../app/components/ReviewShell';
import SettingsPage from '../app/settings/page';
import { RunSessionProvider } from '../app/state/runSessionStore';

const pushMock = vi.fn();
const prepareMock = vi.fn();
const authorizeMock = vi.fn();
const openPickerMock = vi.fn();
let pathnameMock = '/';
let pickerReadyMock = true;
let pickerAuthorizedMock = true;
let pickerErrorMock: string | null = null;
let pickerOutcomeMock: 'cancelled' | 'popup-blocked' | 'failed' | null = null;

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
    isReady: pickerReadyMock,
    isAuthorized: pickerAuthorizedMock,
    error: pickerErrorMock,
    lastOutcome: pickerOutcomeMock,
    prepare: prepareMock,
    authorize: authorizeMock,
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
    pickerReadyMock = true;
    pickerAuthorizedMock = true;
    pickerErrorMock = null;
    pickerOutcomeMock = null;
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
    expect(
      screen.getByText(/items you select.*representative examples/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/session results are temporary unless/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/privacy policy/i)).toBeNull();
    expect(screen.queryByText(/terms of service/i)).toBeNull();
    expect(screen.queryByText(/contact support/i)).toBeNull();
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
      screen.getAllByRole('button', { name: /select from google photos/i })[0]
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/run');
    });
  });

  it('uses separate Connect and Select actions for Google Photos', () => {
    pickerAuthorizedMock = false;
    authorizeMock.mockResolvedValue(true);

    const { rerender } = render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );

    const connectButtons = screen.getAllByRole('button', {
      name: /connect google photos/i
    });
    expect(
      screen.queryByRole('button', { name: /select from google photos/i })
    ).toBeNull();

    fireEvent.click(connectButtons[0]);

    expect(authorizeMock).toHaveBeenCalledTimes(1);
    expect(openPickerMock).not.toHaveBeenCalled();

    pickerAuthorizedMock = true;
    rerender(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );
    expect(
      screen.getAllByRole('button', { name: /select from google photos/i })[0]
    ).toBeEnabled();
  });

  it('disables authorization while Google Photos is preparing', () => {
    pickerReadyMock = false;
    pickerAuthorizedMock = false;

    render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );

    expect(
      screen.getAllByRole('button', { name: /preparing google photos/i })[0]
    ).toBeDisabled();
  });

  it('offers a retry when Google Photos setup fails', () => {
    pickerReadyMock = false;
    pickerAuthorizedMock = false;
    pickerErrorMock =
      'Google Photos could not load. Check your connection and try setup again.';
    prepareMock.mockResolvedValue(true);

    render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );

    const retryButton = screen.getAllByRole('button', {
      name: /retry google photos setup/i
    })[0];
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);
    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it('announces session-only connection and picker errors', () => {
    const { rerender } = render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );

    expect(screen.getByText(/connected for this session/i)).toHaveAttribute(
      'aria-live',
      'polite'
    );

    pickerAuthorizedMock = false;
    pickerErrorMock =
      'Your browser blocked Google authorization. Allow popups and try again.';
    rerender(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );
    expect(screen.queryByText(/connected for this session/i)).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(/blocked/i);
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
    expect(screen.getByRole('link', { name: /results/i })).toHaveAttribute(
      'href',
      '/results'
    );
    expect(screen.queryByRole('link', { name: /history/i })).toBeNull();
    expect(screen.getByRole('link', { name: /results/i })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('renders non-ambiguous review shell settings and account affordances', () => {
    pathnameMock = '/results';

    const { container } = render(
      <ReviewShell activeStage="REVIEW">
        <p>Review content</p>
      </ReviewShell>
    );
    const topNav = container.querySelector('.top-nav-desktop');

    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute(
      'href',
      '/settings'
    );
    expect(
      screen.getByRole('link', { name: /account status/i })
    ).toHaveAttribute('href', '/account');
    expect(topNav).not.toBeNull();
    const resultsLink = within(topNav as HTMLElement).getByRole('link', {
      name: /results/i
    });
    expect(resultsLink).toHaveAttribute('href', '/results');
    expect(resultsLink).toHaveAttribute('aria-current', 'page');
    expect(
      within(topNav as HTMLElement).queryByRole('link', { name: /history/i })
    ).toBeNull();
    expect(
      within(topNav as HTMLElement).queryByRole('link', { name: /^review$/i })
    ).toBeNull();
    expect(screen.queryByText(/^support$/i)).toBeNull();
  });

  it('does not mark Results active in the review shell away from results routes', () => {
    pathnameMock = '/run';

    const { container } = render(
      <ReviewShell activeStage="SCANNING">
        <p>Run content</p>
      </ReviewShell>
    );
    const topNav = container.querySelector('.top-nav-desktop');
    expect(topNav).not.toBeNull();
    expect(
      within(topNav as HTMLElement).getByRole('link', { name: /results/i })
    ).not.toHaveAttribute('aria-current');
  });

  it('shows only MVP-scoped settings', () => {
    pathnameMock = '/settings';

    render(<SettingsPage />);

    expect(
      screen.getByRole('heading', { name: /^settings$/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /mvp settings/i })
    ).not.toBeInTheDocument();
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
