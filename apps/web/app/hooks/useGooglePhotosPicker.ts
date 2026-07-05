'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type { PickerItem } from '../../src/types/phase2Envelope';

type PickerOutcome = 'selected' | 'cancelled';

type PickerMediaItem = {
  id: string;
  createTime: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  baseUrl: string;
  productUrl?: string;
};

type UseGooglePhotosPickerResult = {
  isLoading: boolean;
  error: string | null;
  lastOutcome: PickerOutcome | null;
  openPicker: () => Promise<PickerMediaItem[] | null>;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type PickerPollingConfig = {
  pollInterval?: string;
  timeoutIn?: string;
};

type PickerSession = {
  id?: string;
  pickerUri?: string;
  pollingConfig?: PickerPollingConfig;
  mediaItemsSet?: boolean;
};

type CreatedPickerSession = PickerSession & {
  id: string;
  pickerUri: string;
};

type PickedMediaItem = {
  id?: string;
  createTime?: string;
  type?: string;
  mediaFile?: {
    baseUrl?: string;
    mimeType?: string;
    filename?: string;
    mediaFileMetadata?: {
      width?: number;
      height?: number;
    };
  };
};

type PickerMediaItemsResponse = {
  mediaItems?: PickedMediaItem[];
  nextPageToken?: string;
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
        };
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const PHOTOS_PICKER_API_BASE_URL = 'https://photospicker.googleapis.com/v1';
const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_POLL_TIMEOUT_MS = 120000;
const CLOSED_PICKER_GRACE_MS = 10000;
const MAX_PICKER_PAGE_SIZE = 100;
const PHOTO_DOWNLOAD_PARAMS = '=w2048-h2048';

function loadScript(src: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Google Photos Picker is only available in the browser.')
    );
  }

  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

function parseDurationMs(
  value: string | undefined,
  fallbackMs: number
): number {
  if (!value?.endsWith('s')) {
    return fallbackMs;
  }

  const seconds = Number(value.slice(0, -1));
  if (!Number.isFinite(seconds) || seconds < 0) {
    return fallbackMs;
  }

  return seconds * 1000;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function appendAutoclose(pickerUri: string): string {
  return pickerUri.endsWith('/autoclose')
    ? pickerUri
    : `${pickerUri}/autoclose`;
}

function appendPhotoDownloadParams(baseUrl: string): string {
  return baseUrl.includes('=') ? baseUrl : `${baseUrl}${PHOTO_DOWNLOAD_PARAMS}`;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Google Photos Picker API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

async function createPickerSession(
  token: string
): Promise<CreatedPickerSession> {
  const response = await fetch(`${PHOTOS_PICKER_API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      pickingConfig: {
        maxItemCount: '2000'
      }
    })
  });
  const session = await parseJsonResponse<PickerSession>(response);

  if (!session.id || !session.pickerUri) {
    throw new Error(
      'Google Photos Picker session did not include a picker URI.'
    );
  }

  return session as CreatedPickerSession;
}

async function getPickerSession(
  token: string,
  sessionId: string
): Promise<PickerSession> {
  const response = await fetch(
    `${PHOTOS_PICKER_API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: authHeaders(token)
    }
  );
  return parseJsonResponse<PickerSession>(response);
}

async function deletePickerSession(
  token: string,
  sessionId: string
): Promise<void> {
  try {
    await fetch(
      `${PHOTOS_PICKER_API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: 'DELETE',
        headers: authHeaders(token)
      }
    );
  } catch {
    // Session cleanup is recommended by Google, but a cleanup failure should not hide a valid selection.
  }
}

async function waitForPickedMedia(
  token: string,
  initialSession: PickerSession,
  pickerWindow: Window | null
): Promise<PickerSession | null> {
  const sessionId = initialSession.id;
  if (!sessionId) {
    throw new Error('Google Photos Picker session is missing an id.');
  }

  let session = initialSession;
  const timeoutMs = parseDurationMs(
    session.pollingConfig?.timeoutIn,
    DEFAULT_POLL_TIMEOUT_MS
  );
  const startedAt = Date.now();
  let pickerClosedAt: number | null = null;

  while (Date.now() - startedAt <= timeoutMs) {
    if (session.mediaItemsSet) {
      return session;
    }

    if (pickerWindow?.closed && pickerClosedAt === null) {
      pickerClosedAt = Date.now();
    }

    const pollIntervalMs = parseDurationMs(
      session.pollingConfig?.pollInterval,
      DEFAULT_POLL_INTERVAL_MS
    );
    await wait(Math.max(250, pollIntervalMs));
    session = await getPickerSession(token, sessionId);

    if (
      !session.mediaItemsSet &&
      pickerClosedAt !== null &&
      Date.now() - pickerClosedAt >= CLOSED_PICKER_GRACE_MS
    ) {
      return null;
    }
  }

  return null;
}

async function listPickedMediaItems(
  token: string,
  sessionId: string
): Promise<PickerMediaItem[]> {
  const items: PickerMediaItem[] = [];
  const seenPageTokens = new Set<string>();
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      sessionId,
      pageSize: String(MAX_PICKER_PAGE_SIZE)
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(
      `${PHOTOS_PICKER_API_BASE_URL}/mediaItems?${params.toString()}`,
      {
        headers: authHeaders(token)
      }
    );
    const payload = await parseJsonResponse<PickerMediaItemsResponse>(response);

    for (const item of payload.mediaItems ?? []) {
      const normalized = normalizePickedMediaItem(item);
      if (normalized) {
        items.push(normalized);
      }
    }

    pageToken = payload.nextPageToken;
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) {
        throw new Error('Google Photos Picker API repeated a page token.');
      }
      seenPageTokens.add(pageToken);
    }
  } while (pageToken);

  return items;
}

function normalizePickedMediaItem(
  item: PickedMediaItem
): PickerMediaItem | null {
  const mediaFile = item.mediaFile;
  if (
    !item.id ||
    item.type !== 'PHOTO' ||
    !item.createTime ||
    !mediaFile?.baseUrl
  ) {
    return null;
  }

  return {
    id: item.id,
    createTime: item.createTime,
    filename: mediaFile.filename ?? item.id,
    mimeType: mediaFile.mimeType ?? 'image/jpeg',
    width: mediaFile.mediaFileMetadata?.width ?? 0,
    height: mediaFile.mediaFileMetadata?.height ?? 0,
    baseUrl: appendPhotoDownloadParams(mediaFile.baseUrl)
  };
}

export function useGooglePhotosPicker(): UseGooglePhotosPickerResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<PickerOutcome | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const scopes = useMemo(
    () =>
      [
        'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' '),
    []
  );

  const getToken = useCallback(async () => {
    if (accessTokenRef.current) {
      return accessTokenRef.current;
    }

    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2 || !clientId) {
      throw new Error('Google OAuth is not configured.');
    }

    const token = await new Promise<string>((resolve, reject) => {
      const tokenClient = oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        callback: (response) => {
          if (!response.access_token || response.error) {
            reject(new Error('Google authorization was not completed.'));
            return;
          }
          resolve(response.access_token);
        }
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });

    accessTokenRef.current = token;
    return token;
  }, [clientId, scopes]);

  const openPicker = useCallback(async () => {
    if (!clientId) {
      setError(
        'Google Photos Picker is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.'
      );
      return null;
    }

    setIsLoading(true);
    setError(null);

    let cleanupSession: (() => Promise<void>) | null = null;
    try {
      await loadScript(GIS_SRC);
      const token = await getToken();
      const session = await createPickerSession(token);
      cleanupSession = () => deletePickerSession(token, session.id);
      const pickerWindow = window.open(
        appendAutoclose(session.pickerUri),
        '_blank',
        'popup,width=960,height=720'
      );

      if (!pickerWindow) {
        throw new Error('Google Photos Picker window was blocked.');
      }

      const completedSession = await waitForPickedMedia(
        token,
        session,
        pickerWindow
      );
      if (!completedSession?.id) {
        setLastOutcome('cancelled');
        return null;
      }

      const selected = await listPickedMediaItems(token, completedSession.id);
      setLastOutcome(selected.length > 0 ? 'selected' : 'cancelled');

      return selected.length > 0 ? selected : null;
    } catch {
      setError(
        'Unable to open Google Photos Picker. Check your connection and try again.'
      );
      return null;
    } finally {
      await cleanupSession?.();
      setIsLoading(false);
    }
  }, [clientId, getToken]);

  return {
    isLoading,
    error,
    lastOutcome,
    openPicker
  };
}

export function normalizePickerSelection(
  items: PickerMediaItem[]
): PickerItem[] {
  return items.map((item) => ({
    id: item.id,
    createTime: item.createTime,
    filename: item.filename,
    mimeType: item.mimeType,
    baseUrl: item.baseUrl,
    type: 'PHOTO'
  }));
}
