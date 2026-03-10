import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleAuthPanel } from '../app/components/GoogleAuthPanel';

const state = {
  auth: null as null | { accessToken: string; expiresAt: number },
  hydrated: true,
  setAuthenticated: vi.fn(),
  clearAuth: vi.fn()
};

vi.mock('../app/state/googleAuthStore', () => ({
  useGoogleAuthState: () => state
}));

describe('GoogleAuthPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    state.auth = null;
    state.hydrated = true;
    state.setAuthenticated = vi.fn();
    state.clearAuth = vi.fn();
    document.head.innerHTML = '';
    // @ts-expect-error test-only override
    window.google = undefined;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client';
  });

  it('shows missing client id warning', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = '';

    render(<GoogleAuthPanel />);

    expect(
      screen.getByText('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.')
    ).toBeInTheDocument();
  });

  it('requests token and stores authenticated session on success', async () => {
    const requestAccessToken = vi.fn();
    const initTokenClient = vi.fn(
      (config: {
        callback: (response: {
          access_token?: string;
          expires_in?: number;
          error?: string;
        }) => void;
      }) => {
        config.callback({ access_token: 'abc', expires_in: 120 });
        return { requestAccessToken };
      }
    );

    // @ts-expect-error test-only override
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient,
          revoke: vi.fn()
        }
      }
    };

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    document.head.appendChild(script);

    render(<GoogleAuthPanel />);

    await waitFor(() => {
      expect(screen.getByText('Connect Google')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Connect Google'));

    expect(requestAccessToken).toHaveBeenCalledWith({ prompt: 'consent' });
    expect(state.setAuthenticated).toHaveBeenCalledWith('abc', 120);
  });

  it('revokes token when disconnecting', () => {
    const revoke = vi.fn((_, callback?: () => void) => callback?.());
    const initTokenClient = vi.fn(() => ({ requestAccessToken: vi.fn() }));

    state.auth = { accessToken: 'active-token', expiresAt: Date.now() + 99999 };

    // @ts-expect-error test-only override
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient,
          revoke
        }
      }
    };

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    document.head.appendChild(script);

    render(<GoogleAuthPanel />);

    fireEvent.click(screen.getByText('Disconnect Google'));

    expect(revoke).toHaveBeenCalledWith('active-token', expect.any(Function));
    expect(state.clearAuth).toHaveBeenCalled();
  });
});
