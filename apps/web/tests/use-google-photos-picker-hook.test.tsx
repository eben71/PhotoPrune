import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi
} from 'vitest';

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

function pickerWindowMock() {
  return {
    closed: false,
    location: { href: '' },
    close: vi.fn()
  } as unknown as Window;
}

describe('useGooglePhotosPicker hook', () => {
  const env = process.env;
  const fetchCalls: FetchCall[] = [];
  let requestedScope = '';
  let openSpy: MockInstance<Window['open']>;

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
          initTokenClient: ({ callback, scope }) => {
            requestedScope = scope;
            return {
              requestAccessToken: () => callback({ access_token: 'token' })
            };
          }
        }
      }
    };

    openSpy = vi.spyOn(window, 'open').mockReturnValue(pickerWindowMock());

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
    requestedScope = '';
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    delete window.google;
  });

  it('creates a Photos Picker API session and returns selected media items', async () => {
    const openedWindow = pickerWindowMock();
    openSpy.mockReturnValue(openedWindow);
    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(openSpy).toHaveBeenCalledWith(
      '',
      'photoprune-google-photos-picker',
      'popup,width=960,height=720'
    );
    expect(openedWindow.location.href).toBe(
      'https://photos.google.com/picker/session-1/autoclose'
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
    expect(requestedScope).toBe(
      'https://www.googleapis.com/auth/photospicker.mediaitems.readonly'
    );
    const createBody = fetchCalls[0]?.init?.body;
    expect(typeof createBody).toBe('string');
    expect(JSON.parse(createBody as string) as unknown).toEqual({
      pickingConfig: { maxItemCount: '2000' }
    });
  });

  it('keeps polling a closed picker window until selected media is available', async () => {
    const location = { href: '' };
    openSpy.mockReturnValue({
      get closed() {
        return location.href.length > 0;
      },
      location,
      close: vi.fn()
    } as unknown as Window);

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
                    filename: 'a.jpg',
                    mediaFileMetadata: { width: 100, height: 90 }
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
    openSpy.mockReturnValue({
      closed: true,
      location: { href: '' },
      close: vi.fn()
    } as unknown as Window);
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
    expect(result.current.error).toMatch(/not available/i);
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
    expect(result.current.error).toMatch(/could not complete/i);
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
    expect(result.current.error).toMatch(/repeated selection data/i);
  });

  it('rejects the whole selection when one selected item is incomplete', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (requestUrl(input).includes('/mediaItems?')) {
        fetchCalls.push({ input, init });
        return Promise.resolve(
          jsonResponse({
            mediaItems: [
              {
                id: 'incomplete-photo',
                createTime: '2025-01-01T00:00:00Z',
                type: 'PHOTO',
                mediaFile: {
                  baseUrl: 'https://lh3.googleusercontent.com/incomplete',
                  filename: 'incomplete.jpg'
                }
              }
            ]
          })
        );
      }
      return defaultFetch!(input, init);
    });

    const { result } = renderHook(() => useGooglePhotosPicker());
    await act(async () => {
      await result.current.openPicker();
    });

    expect(result.current.lastOutcome).toBe('failed');
    expect(result.current.error).toMatch(/incomplete selection/i);
  });

  it('rejects repeated media ids across pages', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation();
    let mediaPage = 0;
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (requestUrl(input).includes('/mediaItems?')) {
        fetchCalls.push({ input, init });
        mediaPage += 1;
        return Promise.resolve(
          jsonResponse({
            mediaItems: [
              {
                id: 'same-photo',
                createTime: '2025-01-01T00:00:00Z',
                type: 'PHOTO',
                mediaFile: {
                  baseUrl: 'https://lh3.googleusercontent.com/same-photo',
                  filename: 'same.jpg',
                  mediaFileMetadata: { width: 100, height: 90 }
                }
              }
            ],
            ...(mediaPage === 1 ? { nextPageToken: 'second-page' } : {})
          })
        );
      }
      return defaultFetch!(input, init);
    });

    const { result } = renderHook(() => useGooglePhotosPicker());
    await act(async () => {
      await result.current.openPicker();
    });

    expect(result.current.lastOutcome).toBe('failed');
    expect(result.current.error).toMatch(/repeated selection data/i);
    expect(mediaPage).toBe(2);
  });

  it('cleans up a malformed session that has an id but no picker URI', async () => {
    vi.mocked(fetch).mockImplementation((input, init) => {
      fetchCalls.push({ input, init });
      const url = requestUrl(input);
      if (url.endsWith('/sessions') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ id: 'malformed-session' }));
      }
      return Promise.resolve(jsonResponse({}));
    });

    const { result } = renderHook(() => useGooglePhotosPicker());
    await act(async () => {
      await result.current.openPicker();
    });

    expect(result.current.error).toMatch(/could not start the selection/i);
    const cleanup = fetchCalls.find((call) => call.init?.method === 'DELETE');
    expect(requestUrl(cleanup!.input)).toContain('/sessions/malformed-session');
  });

  it('refreshes once and replays a Picker request after a 401', async () => {
    let tokenRequests = 0;
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => {
              tokenRequests += 1;
              callback({ access_token: `token-${tokenRequests}` });
            }
          })
        }
      }
    };
    const defaultFetch = vi.mocked(fetch).getMockImplementation();
    let sessionCreates = 0;
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (
        requestUrl(input) ===
          'https://photospicker.googleapis.com/v1/sessions' &&
        init?.method === 'POST'
      ) {
        sessionCreates += 1;
        if (sessionCreates === 1) {
          fetchCalls.push({ input, init });
          return Promise.resolve(jsonResponse({}, { status: 401 }));
        }
      }
      return defaultFetch!(input, init);
    });

    const { result } = renderHook(() => useGooglePhotosPicker());
    await act(async () => {
      await result.current.openPicker();
    });

    expect(result.current.lastOutcome).toBe('selected');
    expect(tokenRequests).toBe(2);
    const createCalls = fetchCalls.filter(
      (call) =>
        requestUrl(call.input) ===
          'https://photospicker.googleapis.com/v1/sessions' &&
        call.init?.method === 'POST'
    );
    expect(createCalls).toHaveLength(2);
    expect(createCalls[1]?.init?.headers).toMatchObject({
      Authorization: 'Bearer token-2'
    });
  });

  it('stops after one replay when a Picker request returns 401 twice', async () => {
    let tokenRequests = 0;
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => {
              tokenRequests += 1;
              callback({ access_token: `token-${tokenRequests}` });
            }
          })
        }
      }
    };
    vi.mocked(fetch).mockImplementation((input, init) => {
      fetchCalls.push({ input, init });
      return Promise.resolve(jsonResponse({}, { status: 401 }));
    });

    const { result } = renderHook(() => useGooglePhotosPicker());
    await act(async () => {
      await result.current.openPicker();
    });

    expect(result.current.lastOutcome).toBe('failed');
    expect(result.current.error).toMatch(/could not complete/i);
    expect(tokenRequests).toBe(2);
    expect(fetchCalls).toHaveLength(2);
  });

  it('rejects a completed selection above the 2,000-item limit', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (requestUrl(input).includes('/mediaItems?')) {
        fetchCalls.push({ input, init });
        return Promise.resolve(
          jsonResponse({
            mediaItems: Array.from({ length: 2001 }, (_, index) => ({
              id: `photo-${index}`,
              createTime: '2025-01-01T00:00:00Z',
              type: 'PHOTO',
              mediaFile: {
                baseUrl: `https://lh3.googleusercontent.com/photo-${index}`,
                filename: `photo-${index}.jpg`,
                mimeType: 'image/jpeg',
                mediaFileMetadata: { width: 100, height: 90 }
              }
            }))
          })
        );
      }
      return defaultFetch!(input, init);
    });

    const { result } = renderHook(() => useGooglePhotosPicker());
    await act(async () => {
      await result.current.openPicker();
    });

    expect(result.current.lastOutcome).toBe('failed');
    expect(result.current.error).toMatch(/more than 2000 selected items/i);
  });

  it('reports a blocked placeholder before authorization or session creation', async () => {
    openSpy.mockReturnValue(null);

    const { result } = renderHook(() => useGooglePhotosPicker());

    let output: Awaited<ReturnType<typeof result.current.openPicker>> = null;
    await act(async () => {
      output = await result.current.openPicker();
    });

    expect(output).toBeNull();
    expect(result.current.error).toMatch(/blocked/i);
    expect(result.current.lastOutcome).toBe('popup-blocked');
    expect(fetchCalls).toEqual([]);
  });

  it('closes a still-open placeholder when session polling times out', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    const openedWindow = pickerWindowMock();
    openSpy.mockReturnValue(openedWindow);
    vi.mocked(fetch).mockImplementation((input, init) => {
      fetchCalls.push({ input, init });
      const url = requestUrl(input);
      if (url.endsWith('/sessions') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            id: 'session-timeout',
            pickerUri: 'https://photos.google.com/picker/session-timeout',
            pollingConfig: { pollInterval: '0.001s', timeoutIn: '0.001s' },
            mediaItemsSet: false
          })
        );
      }
      if (init?.method === 'DELETE') {
        return Promise.resolve(jsonResponse({}));
      }
      return Promise.resolve(
        jsonResponse({ id: 'session-timeout', mediaItemsSet: false })
      );
    });
    const { result } = renderHook(() => useGooglePhotosPicker());

    await act(async () => {
      const openPromise = result.current.openPicker();
      await vi.advanceTimersByTimeAsync(300);
      await openPromise;
    });

    expect(result.current.lastOutcome).toBe('cancelled');
    expect(
      (openedWindow as unknown as { close: ReturnType<typeof vi.fn> }).close
    ).toHaveBeenCalled();
  });

  it('bounds an OAuth request when Google never calls back', async () => {
    vi.useFakeTimers();
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: () => ({ requestAccessToken: () => undefined })
        }
      }
    };
    const openedWindow = pickerWindowMock();
    openSpy.mockReturnValue(openedWindow);
    const { result } = renderHook(() => useGooglePhotosPicker());

    await act(async () => {
      const openPromise = result.current.openPicker();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(60001);
      await openPromise;
    });

    expect(result.current.lastOutcome).toBe('failed');
    expect(result.current.error).toMatch(/authorization took too long/i);
    expect(
      (openedWindow as unknown as { close: ReturnType<typeof vi.fn> }).close
    ).toHaveBeenCalled();
  });

  it('does not hang when the cleanup request never settles', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((input, init) => {
      fetchCalls.push({ input, init });
      const url = requestUrl(input);
      if (url.endsWith('/sessions') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            id: 'session-cleanup-timeout',
            pickerUri:
              'https://photos.google.com/picker/session-cleanup-timeout',
            mediaItemsSet: true
          })
        );
      }
      if (init?.method === 'DELETE') {
        return new Promise<Response>(() => undefined);
      }
      if (url.includes('/mediaItems?')) {
        return Promise.resolve(
          jsonResponse({
            mediaItems: [
              {
                id: 'photo-cleanup-timeout',
                createTime: '2025-01-01T00:00:00Z',
                type: 'PHOTO',
                mediaFile: {
                  baseUrl:
                    'https://lh3.googleusercontent.com/photo-cleanup-timeout',
                  filename: 'cleanup.jpg',
                  mimeType: 'image/jpeg',
                  mediaFileMetadata: { width: 100, height: 90 }
                }
              }
            ]
          })
        );
      }
      return Promise.resolve(jsonResponse({}));
    });
    const { result } = renderHook(() => useGooglePhotosPicker());

    const capture: {
      output: Awaited<ReturnType<typeof result.current.openPicker>>;
    } = { output: null };
    await act(async () => {
      const openPromise = result.current.openPicker();
      await vi.advanceTimersByTimeAsync(15001);
      capture.output = await openPromise;
    });

    expect(capture.output?.[0]?.id).toBe('photo-cleanup-timeout');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastOutcome).toBe('selected');
  });
});
