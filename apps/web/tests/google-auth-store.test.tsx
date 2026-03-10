import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGoogleAuthState } from '../app/state/googleAuthStore';

function Harness() {
  const { auth, hydrated, setAuthenticated, clearAuth } = useGoogleAuthState();

  return (
    <div>
      <p>{hydrated ? 'hydrated' : 'loading'}</p>
      <p>{auth ? auth.accessToken : 'none'}</p>
      <button type="button" onClick={() => setAuthenticated('token-123', 60)}>
        set
      </button>
      <button type="button" onClick={clearAuth}>
        clear
      </button>
    </div>
  );
}

describe('useGoogleAuthState', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('drops invalid session storage payloads', () => {
    sessionStorage.setItem('photoprune-google-auth-v1', '{invalid-json');

    render(<Harness />);

    expect(screen.getByText('hydrated')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
    expect(sessionStorage.getItem('photoprune-google-auth-v1')).toBeNull();
  });

  it('drops expired auth payloads and can set/clear auth', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    sessionStorage.setItem(
      'photoprune-google-auth-v1',
      JSON.stringify({ accessToken: 'old-token', expiresAt: 999 })
    );

    render(<Harness />);

    expect(screen.getByText('none')).toBeInTheDocument();

    fireEvent.click(screen.getByText('set'));
    expect(screen.getByText('token-123')).toBeInTheDocument();
    expect(sessionStorage.getItem('photoprune-google-auth-v1')).toContain(
      'token-123'
    );

    fireEvent.click(screen.getByText('clear'));
    expect(screen.getByText('none')).toBeInTheDocument();
    expect(sessionStorage.getItem('photoprune-google-auth-v1')).toBeNull();
  });
});
