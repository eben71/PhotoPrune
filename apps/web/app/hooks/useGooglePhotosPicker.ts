'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { trustCopy } from '../copy/trustCopy';
import { PICKER_MAX_ITEMS } from '../../src/constants/scanLimits';
import type { PickerItem } from '../../src/types/phase2Envelope';

type PickerOutcome = 'selected' | 'cancelled' | 'popup-blocked' | 'failed';

type PickerMediaItem = {
  id: string;
  createTime: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  baseUrl: string;
};

type UseGooglePhotosPickerResult = {
  isLoading: boolean;
  isReady: boolean;
  isAuthorized: boolean;
  error: string | null;
  lastOutcome: PickerOutcome | null;
  prepare: () => Promise<boolean>;
  authorize: () => Promise<boolean>;
  openPicker: () => Promise<PickerMediaItem[] | null>;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleOAuthPopupError = {
  type?: string;
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
            error_callback?: (error: GoogleOAuthPopupError) => void;
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
const PICKER_WINDOW_NAME = 'photoprune-google-photos-picker';
const PICKER_WINDOW_FEATURES = 'popup,width=960,height=720';
const PICKER_OPERATION_TIMEOUT_MS = 15000;
const OAUTH_CALLBACK_TIMEOUT_MS = 60000;
const GIS_LOAD_TIMEOUT_MS = 15000;

class PickerFlowError extends Error {}

class PickerAuthorizationError extends PickerFlowError {
  constructor(
    message: string,
    readonly outcome: Exclude<PickerOutcome, 'selected'>
  ) {
    super(message);
  }
}

type PickerFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

function loadScript(src: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Google Photos Picker is only available in the browser.')
    );
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${src}"]`
  );
  if (existing) {
    if (existing.dataset.photopruneLoaded === 'true') {
      existing.remove();
      return loadScript(src);
    }
    return new Promise((resolve, reject) => {
      const handleLoad = () => {
        existing.dataset.photopruneLoaded = 'true';
        resolve();
      };
      const handleError = () => {
        existing.remove();
        reject(new Error(`Unable to load ${src}`));
      };
      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.photopruneLoaded = 'false';
    script.onload = () => {
      script.dataset.photopruneLoaded = 'true';
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Unable to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

function removeGisScript(): void {
  document
    .querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    ?.remove();
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

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  safeMessage: string
): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new PickerFlowError(safeMessage));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

function appendAutoclose(pickerUri: string): string {
  return pickerUri.endsWith('/autoclose')
    ? pickerUri
    : `${pickerUri}/autoclose`;
}

function appendPhotoDownloadParams(baseUrl: string): string {
  return baseUrl.includes('=') ? baseUrl : `${baseUrl}${PHOTO_DOWNLOAD_PARAMS}`;
}

function closePickerWindow(pickerWindow: Window): void {
  if (typeof pickerWindow.close === 'function') {
    pickerWindow.close();
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new PickerFlowError(
      'Google Photos could not complete that request. Check your connection and try again.'
    );
  }
  return (await response.json()) as T;
}

async function createPickerSession(
  pickerFetch: PickerFetch
): Promise<PickerSession> {
  const response = await pickerFetch(`${PHOTOS_PICKER_API_BASE_URL}/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      pickingConfig: {
        maxItemCount: String(PICKER_MAX_ITEMS)
      }
    })
  });
  return parseJsonResponse<PickerSession>(response);
}

async function getPickerSession(
  pickerFetch: PickerFetch,
  sessionId: string
): Promise<PickerSession> {
  const response = await pickerFetch(
    `${PHOTOS_PICKER_API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`,
    {}
  );
  return parseJsonResponse<PickerSession>(response);
}

async function deletePickerSession(
  token: string,
  sessionId: string,
  onUnauthorized: () => void
): Promise<void> {
  try {
    const response = await withTimeout(
      fetch(
        `${PHOTOS_PICKER_API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`,
        {
          method: 'DELETE',
          headers: authHeaders(token)
        }
      ),
      PICKER_OPERATION_TIMEOUT_MS,
      'Google Photos cleanup took too long.'
    );
    if (response.status === 401) {
      onUnauthorized();
    }
  } catch {
    // Session cleanup is recommended by Google, but a cleanup failure should not hide a valid selection.
  }
}

async function waitForPickedMedia(
  pickerFetch: PickerFetch,
  initialSession: PickerSession,
  pickerWindow: Window
): Promise<PickerSession | null> {
  const sessionId = initialSession.id;
  if (!sessionId) {
    throw new PickerFlowError(
      'Google Photos could not start the selection. Please try again.'
    );
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
    session = await getPickerSession(pickerFetch, sessionId);

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
  pickerFetch: PickerFetch,
  sessionId: string
): Promise<PickerMediaItem[]> {
  const items: PickerMediaItem[] = [];
  let collectedCount = 0;
  const seenPageTokens = new Set<string>();
  const seenItemIds = new Set<string>();
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      sessionId,
      pageSize: String(MAX_PICKER_PAGE_SIZE)
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await pickerFetch(
      `${PHOTOS_PICKER_API_BASE_URL}/mediaItems?${params.toString()}`,
      {}
    );
    const payload = await parseJsonResponse<PickerMediaItemsResponse>(response);
    collectedCount += payload.mediaItems?.length ?? 0;
    if (collectedCount > PICKER_MAX_ITEMS) {
      throw new PickerFlowError(
        `Google Photos returned more than ${PICKER_MAX_ITEMS} selected items. Choose fewer photos and try again.`
      );
    }

    for (const item of payload.mediaItems ?? []) {
      const normalized = normalizePickedMediaItem(item);
      if (!normalized) {
        throw new PickerFlowError(
          'Google Photos returned an incomplete selection. Please select your photos again.'
        );
      }
      if (seenItemIds.has(normalized.id)) {
        throw new PickerFlowError(
          'Google Photos returned repeated selection data. Please try again.'
        );
      }
      seenItemIds.add(normalized.id);
      items.push(normalized);
    }

    pageToken = payload.nextPageToken;
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) {
        throw new PickerFlowError(
          'Google Photos returned repeated selection data. Please try again.'
        );
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
  const width = mediaFile?.mediaFileMetadata?.width;
  const height = mediaFile?.mediaFileMetadata?.height;
  if (
    !item.id ||
    item.type !== 'PHOTO' ||
    !item.createTime ||
    !mediaFile?.baseUrl ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  return {
    id: item.id,
    createTime: item.createTime,
    filename: mediaFile.filename ?? item.id,
    mimeType: mediaFile.mimeType ?? 'image/jpeg',
    width: width as number,
    height: height as number,
    baseUrl: appendPhotoDownloadParams(mediaFile.baseUrl)
  };
}

export function useGooglePhotosPicker(): UseGooglePhotosPickerResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<PickerOutcome | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const flowInFlightRef = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const scopes = useMemo(
    () =>
      ['https://www.googleapis.com/auth/photospicker.mediaitems.readonly'].join(
        ' '
      ),
    []
  );

  const prepare = useCallback(async () => {
    if (flowInFlightRef.current) {
      return false;
    }
    if (window.google?.accounts?.oauth2) {
      setIsReady(true);
      setError(null);
      return true;
    }
    if (!clientId) {
      setIsReady(false);
      setLastOutcome('failed');
      setError(trustCopy.googlePhotos.errors.unavailable);
      return false;
    }

    flowInFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await withTimeout(
        loadScript(GIS_SRC),
        GIS_LOAD_TIMEOUT_MS,
        trustCopy.googlePhotos.errors.setupFailed
      );
      if (!window.google?.accounts?.oauth2) {
        throw new PickerFlowError(trustCopy.googlePhotos.errors.setupFailed);
      }
      setIsReady(true);
      return true;
    } catch {
      removeGisScript();
      setIsReady(false);
      setLastOutcome('failed');
      setError(trustCopy.googlePhotos.errors.setupFailed);
      return false;
    } finally {
      flowInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void prepare();
  }, [prepare]);

  const authorize = useCallback(async () => {
    if (flowInFlightRef.current) {
      return false;
    }
    if (accessTokenRef.current) {
      setIsAuthorized(true);
      return true;
    }

    const oauth2 = window.google?.accounts?.oauth2;
    if (!isReady || !oauth2 || !clientId) {
      setLastOutcome('failed');
      setError(trustCopy.googlePhotos.errors.unavailable);
      return false;
    }

    flowInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    setLastOutcome(null);

    try {
      const token = await withTimeout(
        new Promise<string>((resolve, reject) => {
          const tokenClient = oauth2.initTokenClient({
            client_id: clientId,
            scope: scopes,
            callback: (response) => {
              if (!response.access_token || response.error) {
                reject(
                  new PickerAuthorizationError(
                    trustCopy.googlePhotos.errors.authorizationIncomplete,
                    'failed'
                  )
                );
                return;
              }
              resolve(response.access_token);
            },
            error_callback: (popupError) => {
              if (popupError.type === 'popup_failed_to_open') {
                reject(
                  new PickerAuthorizationError(
                    trustCopy.googlePhotos.errors.authorizationBlocked,
                    'popup-blocked'
                  )
                );
                return;
              }
              if (popupError.type === 'popup_closed') {
                reject(
                  new PickerAuthorizationError(
                    trustCopy.googlePhotos.errors.authorizationCancelled,
                    'cancelled'
                  )
                );
                return;
              }
              reject(
                new PickerAuthorizationError(
                  trustCopy.googlePhotos.errors.authorizationFailed,
                  'failed'
                )
              );
            }
          });
          tokenClient.requestAccessToken({ prompt: 'consent' });
        }),
        OAUTH_CALLBACK_TIMEOUT_MS,
        trustCopy.googlePhotos.errors.authorizationTimeout
      );

      accessTokenRef.current = token;
      setIsAuthorized(true);
      return true;
    } catch (authorizationError) {
      accessTokenRef.current = null;
      setIsAuthorized(false);
      if (authorizationError instanceof PickerAuthorizationError) {
        setLastOutcome(authorizationError.outcome);
        setError(
          authorizationError.outcome === 'cancelled'
            ? null
            : authorizationError.message
        );
      } else {
        setLastOutcome('failed');
        setError(
          authorizationError instanceof PickerFlowError
            ? authorizationError.message
            : trustCopy.googlePhotos.errors.authorizationFailed
        );
      }
      return false;
    } finally {
      flowInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [clientId, isReady, scopes]);

  const pickerFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const token = accessTokenRef.current;
      if (!token) {
        setIsAuthorized(false);
        throw new PickerFlowError(
          trustCopy.googlePhotos.errors.connectRequired
        );
      }

      const response = await withTimeout(
        fetch(input, {
          ...init,
          headers: { ...authHeaders(token), ...init.headers }
        }),
        PICKER_OPERATION_TIMEOUT_MS,
        'Google Photos took too long to respond. Check your connection and try again.'
      );
      if (response.status !== 401) {
        return response;
      }

      accessTokenRef.current = null;
      setIsAuthorized(false);
      throw new PickerFlowError(trustCopy.googlePhotos.errors.accessExpired);
    },
    []
  );

  const openPicker = useCallback(async () => {
    if (flowInFlightRef.current) {
      return null;
    }
    if (!accessTokenRef.current) {
      setIsAuthorized(false);
      setLastOutcome('failed');
      setError(trustCopy.googlePhotos.errors.connectRequired);
      return null;
    }

    flowInFlightRef.current = true;
    const pickerWindow = window.open(
      '',
      PICKER_WINDOW_NAME,
      PICKER_WINDOW_FEATURES
    );
    if (!pickerWindow) {
      setLastOutcome('popup-blocked');
      setError(trustCopy.googlePhotos.errors.pickerBlocked);
      flowInFlightRef.current = false;
      return null;
    }

    setIsLoading(true);
    setError(null);
    setLastOutcome(null);

    let cleanupSession: (() => Promise<void>) | null = null;
    let pickerNavigated = false;
    try {
      if (pickerWindow.closed) {
        setLastOutcome('cancelled');
        return null;
      }
      const session = await createPickerSession(pickerFetch);
      if (session.id) {
        const cleanupToken = accessTokenRef.current;
        cleanupSession = () => {
          return cleanupToken
            ? deletePickerSession(cleanupToken, session.id as string, () => {
                accessTokenRef.current = null;
                setIsAuthorized(false);
              })
            : Promise.resolve();
        };
      }
      if (!session.id || !session.pickerUri) {
        throw new PickerFlowError(
          'Google Photos could not start the selection. Please try again.'
        );
      }
      if (pickerWindow.closed) {
        setLastOutcome('cancelled');
        return null;
      }
      pickerWindow.location.href = appendAutoclose(session.pickerUri);
      pickerNavigated = true;

      const completedSession = await waitForPickedMedia(
        pickerFetch,
        session,
        pickerWindow
      );
      if (!completedSession?.id) {
        closePickerWindow(pickerWindow);
        setLastOutcome('cancelled');
        return null;
      }

      const selected = await listPickedMediaItems(
        pickerFetch,
        completedSession.id
      );
      setLastOutcome(selected.length > 0 ? 'selected' : 'cancelled');

      return selected.length > 0 ? selected : null;
    } catch (pickerError) {
      const userClosedPicker = pickerWindow.closed;
      closePickerWindow(pickerWindow);
      if (userClosedPicker && !pickerNavigated) {
        setLastOutcome('cancelled');
        setError(null);
        return null;
      }
      setLastOutcome('failed');
      setError(
        pickerError instanceof PickerFlowError
          ? pickerError.message
          : 'Unable to open Google Photos Picker. Check your connection and try again.'
      );
      return null;
    } finally {
      await cleanupSession?.();
      flowInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [pickerFetch]);

  return {
    isLoading,
    isReady,
    isAuthorized,
    error,
    lastOutcome,
    prepare,
    authorize,
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
    width: item.width,
    height: item.height,
    type: 'PHOTO'
  }));
}
