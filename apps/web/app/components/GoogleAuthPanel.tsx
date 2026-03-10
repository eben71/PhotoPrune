'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useGoogleAuthState } from '../state/googleAuthStore';

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => GoogleTokenClient;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

export function GoogleAuthPanel() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { auth, hydrated, setAuthenticated, clearAuth } = useGoogleAuthState();
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => {
      setError('Unable to load Google auth script. Check your network and retry.');
    };
    document.head.appendChild(script);
  }, []);

  const tokenClient = useMemo(() => {
    if (!scriptReady || !clientId || typeof window === 'undefined') {
      return null;
    }
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      return null;
    }

    return oauth2.initTokenClient({
      client_id: clientId,
      scope:
        'https://www.googleapis.com/auth/photospicker.mediaitems.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      callback: (response) => {
        if (response.error || !response.access_token || !response.expires_in) {
          setError('Google sign-in failed. Please retry.');
          return;
        }
        setError(null);
        setAuthenticated(response.access_token, response.expires_in);
      }
    });
  }, [scriptReady, clientId, setAuthenticated]);

  const signIn = useCallback(() => {
    if (!tokenClient) {
      setError('Google auth is not ready. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and retry.');
      return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }, [tokenClient]);

  const signOut = useCallback(() => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (auth?.accessToken && oauth2?.revoke) {
      oauth2.revoke(auth.accessToken, () => {
        clearAuth();
      });
      return;
    }
    clearAuth();
  }, [auth?.accessToken, clearAuth]);

  return (
    <section>
      <h2>Google auth (read-only)</h2>
      <p>Connect with read-only scopes to use live Google Photos Picker selections.</p>
      {!clientId ? (
        <p role="alert">Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.</p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {hydrated && auth ? (
        <>
          <p aria-live="polite">Connected for this browser session.</p>
          <button type="button" onClick={signOut}>
            Disconnect Google
          </button>
        </>
      ) : (
        <button type="button" onClick={signIn} disabled={!clientId || !scriptReady}>
          Connect Google
        </button>
      )}
    </section>
  );
}
