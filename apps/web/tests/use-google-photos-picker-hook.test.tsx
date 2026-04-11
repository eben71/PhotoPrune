import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGooglePhotosPicker } from '../app/hooks/useGooglePhotosPicker';

type PickerData = {
  action?: string;
  state?: string;
  docs?: Array<{
    id?: string;
    url?: string;
    name?: string;
    mimeType?: string;
    photoMediaMetadata?: {
      creationTime?: string;
      width?: number;
      height?: number;
    };
    thumbnails?: Array<{ url?: string }>;
  }>;
};

describe('useGooglePhotosPicker hook', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      NEXT_PUBLIC_GOOGLE_API_KEY: 'api-key',
      NEXT_PUBLIC_GOOGLE_CLIENT_ID:
        '123456789012-client-id.apps.googleusercontent.com'
    };

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('state-123');

    const gsi = document.createElement('script');
    gsi.src = 'https://accounts.google.com/gsi/client';
    document.head.appendChild(gsi);

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    document.head.appendChild(gapiScript);
  });

  afterEach(() => {
    process.env = env;
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    delete window.gapi;
    delete window.google;
  });

  it('returns selected items from picker callback', async () => {
    let pickerCallback: ((data: PickerData) => void) | undefined;
    let pickerAppId: string | undefined;

    class DocsView {
      setMimeTypes() {
        return this;
      }
      setSelectFolderEnabled() {
        return this;
      }
      setIncludeFolders() {
        return this;
      }
    }

    class PickerBuilder {
      addView() {
        return this;
      }
      setOAuthToken() {
        return this;
      }
      setDeveloperKey() {
        return this;
      }
      setCallback(callback: (data: PickerData) => void) {
        pickerCallback = callback;
        return this;
      }
      setAppId(appId: string) {
        pickerAppId = appId;
        return this;
      }
      setSelectableMimeTypes() {
        return this;
      }
      build() {
        return {
          setVisible: () => {
            pickerCallback?.({
              action: 'picked',
              state: 'state-123',
              docs: [
                {
                  id: 'photo-1',
                  url: 'https://photos.google.com/item-1',
                  name: 'a.jpg',
                  mimeType: 'image/jpeg',
                  photoMediaMetadata: {
                    creationTime: '2025-01-01T00:00:00Z',
                    width: 100,
                    height: 90
                  },
                  thumbnails: [{ url: 'https://thumbs/a.jpg' }]
                }
              ]
            });
          }
        };
      }
    }

    window.gapi = {
      load: (_lib, callback) => callback()
    };

    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => callback({ access_token: 'token' })
          })
        }
      },
      picker: {
        Action: { PICKED: 'picked', CANCEL: 'cancel' },
        DocsView,
        PickerBuilder,
        ViewId: { DOCS_IMAGES: 'docs_images' }
      }
    };

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output!).toHaveLength(1);
    expect(output![0]).toMatchObject({
      id: 'photo-1',
      filename: 'a.jpg',
      baseUrl: 'https://thumbs/a.jpg'
    });
    expect(pickerAppId).toBe('123456789012');
  });

  it('returns null when picker is cancelled', async () => {
    let pickerCallback: ((data: PickerData) => void) | undefined;

    class DocsView {
      setMimeTypes() {
        return this;
      }
      setSelectFolderEnabled() {
        return this;
      }
      setIncludeFolders() {
        return this;
      }
    }

    class PickerBuilder {
      addView() {
        return this;
      }
      setOAuthToken() {
        return this;
      }
      setDeveloperKey() {
        return this;
      }
      setCallback(callback: (data: PickerData) => void) {
        pickerCallback = callback;
        return this;
      }
      setAppId() {
        return this;
      }
      setSelectableMimeTypes() {
        return this;
      }
      build() {
        return {
          setVisible: () => {
            pickerCallback?.({ action: 'cancel', state: 'state-123' });
          }
        };
      }
    }

    window.gapi = {
      load: (_lib, callback) => callback()
    };

    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => callback({ access_token: 'token' })
          })
        }
      },
      picker: {
        Action: { PICKED: 'picked', CANCEL: 'cancel' },
        DocsView,
        PickerBuilder,
        ViewId: { DOCS_IMAGES: 'docs_images' }
      }
    };

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output).toBeNull();
    expect(result.current.lastOutcome).toBe('cancelled');
  });

  it('reports config error when credentials are missing', async () => {
    process.env = {
      ...env,
      NEXT_PUBLIC_GOOGLE_API_KEY: undefined,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: undefined,
      NEXT_PUBLIC_GOOGLE_APP_ID: undefined
    };

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output).toBeNull();
    expect(result.current.error).toMatch(/not configured/i);
  });

  it('prefers explicit google app id when configured', async () => {
    let pickerCallback: ((data: PickerData) => void) | undefined;
    let pickerAppId: string | undefined;

    process.env = {
      ...env,
      NEXT_PUBLIC_GOOGLE_API_KEY: 'api-key',
      NEXT_PUBLIC_GOOGLE_CLIENT_ID:
        '123456789012-client-id.apps.googleusercontent.com',
      NEXT_PUBLIC_GOOGLE_APP_ID: '999888777666'
    };

    class DocsView {
      setMimeTypes() {
        return this;
      }
      setSelectFolderEnabled() {
        return this;
      }
      setIncludeFolders() {
        return this;
      }
    }

    class PickerBuilder {
      addView() {
        return this;
      }
      setOAuthToken() {
        return this;
      }
      setDeveloperKey() {
        return this;
      }
      setCallback(callback: (data: PickerData) => void) {
        pickerCallback = callback;
        return this;
      }
      setAppId(appId: string) {
        pickerAppId = appId;
        return this;
      }
      setSelectableMimeTypes() {
        return this;
      }
      build() {
        return {
          setVisible: () => {
            pickerCallback?.({ action: 'cancel', state: 'state-123' });
          }
        };
      }
    }

    window.gapi = {
      load: (_lib, callback) => callback()
    };

    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => callback({ access_token: 'token' })
          })
        }
      },
      picker: {
        Action: { PICKED: 'picked', CANCEL: 'cancel' },
        DocsView,
        PickerBuilder,
        ViewId: { DOCS_IMAGES: 'docs_images' }
      }
    };

    const { result } = renderHook(() => useGooglePhotosPicker());

    await act(async () => {
      await result.current.openPicker();
    });

    expect(pickerAppId).toBe('999888777666');
  });
});
