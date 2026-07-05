import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGooglePhotosPicker } from '../app/hooks/useGooglePhotosPicker';

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

function scriptFor(src: string) {
  const script = document.createElement('script');
  script.src = src;
  document.head.appendChild(script);
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

describe('useGooglePhotosPicker hook', () => {
  const env = process.env;
  const fetchCalls: FetchCall[] = [];

  beforeEach(() => {
    process.env = {
      ...env,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID:
        '123456789012-client-id.apps.googleusercontent.com'
    };

    scriptFor('https://accounts.google.com/gsi/client');

    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => callback({ access_token: 'token' })
          })
        }
      }
    };

    vi.spyOn(window, 'open').mockReturnValue({
      closed: false
    } as Window);

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ input, init });

        const url = requestUrl(input);
        if (
          url === 'https://photospicker.googleapis.com/v1/sessions' &&
          init?.method === 'POST'
        ) {
          return Promise.resolve(
            jsonResponse({
              id: 'session-1',
              pickerUri: 'https://photos.google.com/picker/session-1',
              pollingConfig: { pollInterval: '0.001s', timeoutIn: '1s' },
              mediaItemsSet: false
            })
          );
        }

        if (
          url === 'https://photospicker.googleapis.com/v1/sessions/session-1' &&
          init?.method === 'DELETE'
        ) {
          return Promise.resolve(jsonResponse({}));
        }

        if (
          url === 'https://photospicker.googleapis.com/v1/sessions/session-1'
        ) {
          return Promise.resolve(
            jsonResponse({
              id: 'session-1',
              pickerUri: 'https://photos.google.com/picker/session-1',
              mediaItemsSet: true
            })
          );
        }

        if (
          url ===
          'https://photospicker.googleapis.com/v1/mediaItems?sessionId=session-1&pageSize=100'
        ) {
          return Promise.resolve(
            jsonResponse({
              mediaItems: [
                {
                  id: 'photo-1',
                  createTime: '2025-01-01T00:00:00Z',
                  type: 'PHOTO',
                  mediaFile: {
                    baseUrl: 'https://lh3.googleusercontent.com/photo-1',
                    mimeType: 'image/jpeg',
                    filename: 'a.jpg',
                    mediaFileMetadata: {
                      width: 100,
                      height: 90
                    }
                  }
                }
              ]
            })
          );
        }

        return Promise.resolve(jsonResponse({}, { status: 404 }));
      }
    );
  });

  afterEach(() => {
    process.env = env;
    fetchCalls.length = 0;
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    delete window.google;
  });

  it('creates a Photos Picker API session and returns selected media items', async () => {
    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(window.open).toHaveBeenCalledWith(
      'https://photos.google.com/picker/session-1/autoclose',
      '_blank',
      'popup,width=960,height=720'
    );
    expect(output).toEqual([
      {
        id: 'photo-1',
        createTime: '2025-01-01T00:00:00Z',
        filename: 'a.jpg',
        mimeType: 'image/jpeg',
        width: 100,
        height: 90,
        baseUrl: 'https://lh3.googleusercontent.com/photo-1=w2048-h2048'
      }
    ]);
    expect(result.current.lastOutcome).toBe('selected');
    expect(fetchCalls.map((call) => requestUrl(call.input))).toEqual([
      'https://photospicker.googleapis.com/v1/sessions',
      'https://photospicker.googleapis.com/v1/sessions/session-1',
      'https://photospicker.googleapis.com/v1/mediaItems?sessionId=session-1&pageSize=100',
      'https://photospicker.googleapis.com/v1/sessions/session-1'
    ]);
    expect(fetchCalls[0]?.init?.headers).toMatchObject({
      Authorization: 'Bearer token'
    });
  });

  it('keeps polling a closed picker window until selected media is available', async () => {
    vi.mocked(window.open).mockReturnValue({
      closed: true
    } as Window);

    let sessionPolls = 0;
    vi.mocked(fetch).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ input, init });

        const url = requestUrl(input);
        if (
          url === 'https://photospicker.googleapis.com/v1/sessions' &&
          init?.method === 'POST'
        ) {
          return Promise.resolve(
            jsonResponse({
              id: 'session-1',
              pickerUri: 'https://photos.google.com/picker/session-1',
              pollingConfig: { pollInterval: '0.001s', timeoutIn: '1s' },
              mediaItemsSet: false
            })
          );
        }

        if (
          url === 'https://photospicker.googleapis.com/v1/sessions/session-1' &&
          init?.method === 'DELETE'
        ) {
          return Promise.resolve(jsonResponse({}));
        }

        if (
          url === 'https://photospicker.googleapis.com/v1/sessions/session-1'
        ) {
          sessionPolls += 1;
          return Promise.resolve(
            jsonResponse({
              id: 'session-1',
              pickerUri: 'https://photos.google.com/picker/session-1',
              mediaItemsSet: true
            })
          );
        }

        if (
          url ===
          'https://photospicker.googleapis.com/v1/mediaItems?sessionId=session-1&pageSize=100'
        ) {
          return Promise.resolve(
            jsonResponse({
              mediaItems: [
                {
                  id: 'photo-1',
                  createTime: '2025-01-01T00:00:00Z',
                  type: 'PHOTO',
                  mediaFile: {
                    baseUrl: 'https://lh3.googleusercontent.com/photo-1',
                    filename: 'a.jpg'
                  }
                }
              ]
            })
          );
        }

        return Promise.resolve(jsonResponse({}, { status: 404 }));
      }
    );

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output?.[0]).toMatchObject({
      id: 'photo-1',
      baseUrl: 'https://lh3.googleusercontent.com/photo-1=w2048-h2048'
    });
    expect(result.current.lastOutcome).toBe('selected');
    expect(sessionPolls).toBe(1);
  });

  it('returns null when the picker window closes before media is selected', async () => {
    vi.mocked(window.open).mockReturnValue({
      closed: true
    } as Window);
    vi.mocked(fetch).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ input, init });

        const url = requestUrl(input);
        if (
          url === 'https://photospicker.googleapis.com/v1/sessions' &&
          init?.method === 'POST'
        ) {
          return Promise.resolve(
            jsonResponse({
              id: 'session-1',
              pickerUri: 'https://photos.google.com/picker/session-1',
              pollingConfig: { pollInterval: '0.001s', timeoutIn: '1s' },
              mediaItemsSet: false
            })
          );
        }

        if (
          url === 'https://photospicker.googleapis.com/v1/sessions/session-1'
        ) {
          return Promise.resolve(
            jsonResponse({
              id: 'session-1',
              pickerUri: 'https://photos.google.com/picker/session-1',
              mediaItemsSet: false
            })
          );
        }

        return Promise.resolve(jsonResponse({}));
      }
    );

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output).toBeNull();
    expect(result.current.lastOutcome).toBe('cancelled');
  });

  it('reports config error when client id is missing', async () => {
    process.env = {
      ...env,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: undefined
    };

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output).toBeNull();
    expect(result.current.error).toMatch(/not configured/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports an error when the Photos Picker API fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }));

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output).toBeNull();
    expect(result.current.error).toMatch(/unable to open/i);
  });

  it('stops media listing when Google repeats a page token', async () => {
    vi.mocked(fetch).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ input, init });

        const url = requestUrl(input);
        if (
          url === 'https://photospicker.googleapis.com/v1/sessions' &&
          init?.method === 'POST'
        ) {
          return Promise.resolve(
            jsonResponse({
              id: 'session-1',
              pickerUri: 'https://photos.google.com/picker/session-1',
              pollingConfig: { pollInterval: '0.001s', timeoutIn: '1s' },
              mediaItemsSet: true
            })
          );
        }

        if (
          url.startsWith('https://photospicker.googleapis.com/v1/mediaItems?')
        ) {
          return Promise.resolve(
            jsonResponse({
              mediaItems: [],
              nextPageToken: 'repeat-token'
            })
          );
        }

        return Promise.resolve(jsonResponse({}));
      }
    );

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output).toBeNull();
    expect(result.current.error).toMatch(/unable to open/i);
  });

  it('deletes a created session when the picker window is blocked', async () => {
    vi.mocked(window.open).mockReturnValue(null);

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output).toBeNull();
    expect(result.current.error).toMatch(/unable to open/i);
    expect(fetchCalls.map((call) => requestUrl(call.input))).toEqual([
      'https://photospicker.googleapis.com/v1/sessions',
      'https://photospicker.googleapis.com/v1/sessions/session-1'
    ]);
    expect(fetchCalls[1]?.init?.method).toBe('DELETE');
  });
});
