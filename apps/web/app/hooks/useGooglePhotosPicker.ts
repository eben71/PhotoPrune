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

type GooglePickerCallbackData = {
  action?: string;
  docs?: Array<{
    id?: string;
    url?: string;
    name?: string;
    mimeType?: string;
    photoMediaMetadata?: {
      height?: number;
      width?: number;
      creationTime?: string;
    };
    thumbnails?: Array<{
      url?: string;
    }>;
  }>;
  state?: string;
};

type GooglePickerView = {
  setMimeTypes: (types: string) => GooglePickerView;
  setSelectFolderEnabled: (enabled: boolean) => GooglePickerView;
  setIncludeFolders: (enabled: boolean) => GooglePickerView;
};

type GooglePickerInstance = {
  setVisible: (visible: boolean) => void;
};

type GooglePickerBuilder = {
  addView: (view: GooglePickerView) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (apiKey: string) => GooglePickerBuilder;
  setCallback: (
    callback: (data: GooglePickerCallbackData) => void
  ) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  setSelectableMimeTypes: (types: string) => GooglePickerBuilder;
  build: () => GooglePickerInstance;
};

declare global {
  interface Window {
    gapi?: {
      load: (lib: string, callback: () => void) => void;
    };
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
      picker?: {
        Action: { PICKED: string; CANCEL: string };
        DocsView: new (viewId?: string) => GooglePickerView;
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: {
          DOCS_IMAGES: string;
        };
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const GAPI_SRC = 'https://apis.google.com/js/api.js';

function resolveGoogleAppId(
  explicitAppId: string | undefined,
  clientId: string | undefined
): string | null {
  const normalizedExplicitAppId = explicitAppId?.trim();
  if (normalizedExplicitAppId) {
    return normalizedExplicitAppId;
  }

  const numericPrefix = clientId?.match(/^\d+/)?.[0];
  return numericPrefix ?? null;
}

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

export function useGooglePhotosPicker(): UseGooglePhotosPickerResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<PickerOutcome | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const appId = resolveGoogleAppId(
    process.env.NEXT_PUBLIC_GOOGLE_APP_ID,
    clientId
  );

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
    if (!apiKey || !clientId || !appId) {
      setError(
        'Google Picker is not configured. Set NEXT_PUBLIC_GOOGLE_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, and NEXT_PUBLIC_GOOGLE_APP_ID.'
      );
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([loadScript(GIS_SRC), loadScript(GAPI_SRC)]);

      await new Promise<void>((resolve, reject) => {
        if (!window.gapi?.load) {
          reject(new Error('Google API client did not initialize.'));
          return;
        }
        window.gapi.load('picker', resolve);
      });

      const token = await getToken();
      const picker = window.google?.picker;
      if (!picker) {
        throw new Error('Google Picker did not initialize.');
      }

      const stateToken = crypto.randomUUID();
      const selected = await new Promise<PickerMediaItem[] | null>(
        (resolve, reject) => {
          const docsView = new picker.DocsView(picker.ViewId.DOCS_IMAGES)
            .setMimeTypes(
              'image/jpeg,image/png,image/webp,image/heic,image/heif'
            )
            .setIncludeFolders(false)
            .setSelectFolderEnabled(false);

          const builtPicker = new picker.PickerBuilder()
            .addView(docsView)
            .setOAuthToken(token)
            .setDeveloperKey(apiKey)
            .setSelectableMimeTypes(
              'image/jpeg,image/png,image/webp,image/heic,image/heif'
            )
            .setAppId(appId)
            .setCallback((data) => {
              if (data.state && data.state !== stateToken) {
                reject(new Error('Invalid picker state. Please retry.'));
                return;
              }
              if (data.action === picker.Action.CANCEL) {
                setLastOutcome('cancelled');
                resolve(null);
                return;
              }
              if (data.action !== picker.Action.PICKED) {
                return;
              }

              const items = (data.docs ?? [])
                .map((doc): PickerMediaItem | null => {
                  if (!doc.id || !doc.url) {
                    return null;
                  }
                  return {
                    id: doc.id,
                    createTime:
                      doc.photoMediaMetadata?.creationTime ??
                      new Date().toISOString(),
                    filename: doc.name ?? doc.id,
                    mimeType: doc.mimeType ?? 'image/jpeg',
                    width: doc.photoMediaMetadata?.width ?? 0,
                    height: doc.photoMediaMetadata?.height ?? 0,
                    baseUrl: doc.thumbnails?.[0]?.url ?? doc.url,
                    productUrl: doc.url
                  };
                })
                .filter((item): item is PickerMediaItem => item !== null);

              setLastOutcome('selected');
              resolve(items);
            })
            .build();

          builtPicker.setVisible(true);
        }
      );

      return selected;
    } catch {
      setError(
        'Unable to open Google Photos Picker. Check your connection and try again.'
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, appId, clientId, getToken]);

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
