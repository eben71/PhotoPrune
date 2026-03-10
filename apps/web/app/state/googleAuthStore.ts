'use client';

import { useCallback, useEffect, useState } from 'react';

const AUTH_KEY = 'photoprune-google-auth-v1';

export type GoogleAuthState = {
  accessToken: string;
  expiresAt: number;
};

function loadAuthState(): GoogleAuthState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as GoogleAuthState;
    if (!parsed.accessToken || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(AUTH_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function useGoogleAuthState() {
  const [auth, setAuth] = useState<GoogleAuthState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAuth(loadAuthState());
    setHydrated(true);
  }, []);

  const setAuthenticated = useCallback((accessToken: string, expiresInSeconds: number) => {
    const nextState: GoogleAuthState = {
      accessToken,
      expiresAt: Date.now() + expiresInSeconds * 1000
    };
    setAuth(nextState);
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(nextState));
  }, []);

  const clearAuth = useCallback(() => {
    setAuth(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AUTH_KEY);
    }
  }, []);

  return {
    auth,
    hydrated,
    setAuthenticated,
    clearAuth
  };
}
