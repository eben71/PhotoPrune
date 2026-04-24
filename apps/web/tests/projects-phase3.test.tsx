import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectDetailPage from '../app/projects/[id]/page';
import ProjectResultsPage from '../app/projects/[id]/results/page';
import ProjectRunPage from '../app/projects/[id]/run/page';
import NewProjectPage from '../app/projects/new/page';
import ProjectsPage from '../app/projects/page';
import { RunSessionProvider } from '../app/state/runSessionStore';

const openPickerMock = vi.fn();
const routerPushMock = vi.fn();
let bodyAppendMock: ReturnType<
  typeof vi.fn<(...nodes: (Node | string)[]) => void>
>;
let searchParamsValue = 'scanId=scan-1';

vi.mock('../app/hooks/useGooglePhotosPicker', () => ({
  useGooglePhotosPicker: () => ({
    openPicker: openPickerMock,
    isLoading: false,
    error: null,
    lastOutcome: null
  }),
  normalizePickerSelection: (items: Array<Record<string, string>>) =>
    items.map((item) => ({
      id: item.id,
      createTime: item.createTime,
      filename: item.filename,
      mimeType: item.mimeType,
      baseUrl: item.baseUrl,
      type: 'PHOTO'
    }))
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
  useSearchParams: () => new URLSearchParams(searchParamsValue)
}));

describe('phase 3 projects pages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    openPickerMock.mockReset();
    routerPushMock.mockReset();
    searchParamsValue = 'scanId=scan-1';

    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = vi.fn(() => 'blob:export');
        static revokeObjectURL = vi.fn();
      }
    );

    bodyAppendMock = vi.fn<(...nodes: (Node | string)[]) => void>(
      () => undefined
    );
    vi.spyOn(document.body, 'append').mockImplementation(bodyAppendMock);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined
    );

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        if (input === '/api/projects' && init?.method === 'POST') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'p1',
                userId: 'local-user',
                name: 'Trip',
                status: 'active',
                scope: { type: 'picker', albumIds: [] },
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
              })
            )
          );
        }

        if (input === '/api/projects') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                projects: [
                  {
                    id: 'p1',
                    userId: 'local-user',
                    name: 'Trip',
                    status: 'active',
                    scope: { type: 'picker', albumIds: [] },
                    createdAt: '2025-01-01T00:00:00Z',
                    updatedAt: '2025-01-01T00:00:00Z'
                  }
                ]
              })
            )
          );
        }

        if (input === '/api/projects/p1') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'p1',
                userId: 'local-user',
                name: 'Trip',
                status: 'active',
                scope: { type: 'picker', albumIds: [] },
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
              })
            )
          );
        }

        if (input === '/api/projects/p1/scans') {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: 'scan-1',
                  projectId: 'p1',
                  createdAt: '2025-01-01T00:00:00Z',
                  sourceType: 'picker',
                  sourceRef: {}
                }
              ])
            )
          );
        }

        if (input.includes('/scans/scan-1/results')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                projectScanId: 'scan-1',
                envelope: {
                  schemaVersion: '2.2.0',
                  run: {
                    runId: 'scan-1',
                    status: 'COMPLETED',
                    startedAt: '2025-01-01T00:00:00Z',
                    finishedAt: '2025-01-01T00:00:01Z',
                    selection: {
                      requestedCount: 2,
                      acceptedCount: 2,
                      rejectedCount: 0
                    }
                  },
                  progress: {
                    stage: 'FINALIZE',
                    message: 'done',
                    counts: { processed: 2, total: 2 }
                  },
                  telemetry: {
                    cost: {
                      apiCalls: 0,
                      estimatedUnits: 1,
                      softCapUnits: 1200,
                      hardCapUnits: 2000,
                      hitSoftCap: false,
                      hitHardCap: false
                    },
                    warnings: []
                  },
                  results: {
                    summary: {
                      groupsCount: 1,
                      groupedItemsCount: 2,
                      ungroupedItemsCount: 0
                    },
                    groups: [
                      {
                        groupId: 'g1',
                        groupType: 'EXACT',
                        confidence: 'HIGH',
                        reasonCodes: ['HASH_MATCH'],
                        itemsCount: 2,
                        representativeItemIds: ['i1'],
                        items: [
                          {
                            itemId: 'i1',
                            type: 'PHOTO',
                            createTime: '2025-01-01T00:00:00Z',
                            filename: 'a.jpg',
                            mimeType: 'image/jpeg',
                            thumbnail: {
                              baseUrl: 'https://placehold.co/200',
                              suggestedSizePx: 300
                            },
                            links: {
                              googlePhotos: {
                                url: null,
                                fallbackQuery: 'i1',
                                fallbackUrl: 'https://photos.google.com'
                              }
                            }
                          },
                          {
                            itemId: 'i2',
                            type: 'PHOTO',
                            createTime: '2025-01-01T00:00:00Z',
                            filename: 'b.jpg',
                            mimeType: 'image/jpeg',
                            thumbnail: {
                              baseUrl: 'https://placehold.co/200',
                              suggestedSizePx: 300
                            },
                            links: {
                              googlePhotos: {
                                url: null,
                                fallbackQuery: 'i2',
                                fallbackUrl: 'https://photos.google.com'
                              }
                            }
                          }
                        ]
                      }
                    ],
                    skippedItems: [],
                    failedItems: []
                  }
                },
                reviews: {
                  g1: {
                    state: 'UNREVIEWED',
                    keep_media_item_id: null,
                    notes: null
                  }
                }
              })
            )
          );
        }

        if (input === '/api/projects/p1/export?format=csv&scanId=scan-1') {
          return Promise.resolve(
            new Response('group_fingerprint,confidence_band\n', {
              headers: { 'Content-Type': 'text/csv' }
            })
          );
        }

        if (input === '/api/projects/p1/export?format=json&scanId=scan-1') {
          return Promise.resolve(
            new Response(JSON.stringify([{ group_fingerprint: 'g1' }]), {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({ projectScanId: 'scan-1' }))
        );
      })
    );
  });

  it('renders the saved projects list', async () => {
    render(<ProjectsPage />);

    await waitFor(() => expect(screen.getByText('Trip')).toBeInTheDocument());
    expect(
      screen.getByRole('link', { name: 'New project' })
    ).toBeInTheDocument();
  });

  it('renders the empty state when no projects exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              projects: []
            })
          )
        )
      )
    );

    render(<ProjectsPage />);

    await waitFor(() =>
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
    );
  });

  it('shows create errors and preserves the entered name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        if (input === '/api/projects' && init?.method === 'POST') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                error:
                  'PhotoPrune API is unavailable. Start the API service and retry.'
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          );
        }

        return Promise.resolve(new Response(JSON.stringify({})));
      })
    );

    render(<NewProjectPage />);

    fireEvent.change(screen.getByPlaceholderText('Weekend cleanup'), {
      target: { value: 'Trip cleanup' }
    });
    fireEvent.click(screen.getByText('Create project'));

    await waitFor(() =>
      expect(
        screen.getByText(
          'PhotoPrune API is unavailable. Start the API service and retry.'
        )
      ).toBeInTheDocument()
    );
    expect(screen.getByDisplayValue('Trip cleanup')).toBeInTheDocument();
  });

  it('shows both CSV and JSON export actions on project results', async () => {
    render(<ProjectResultsPage params={Promise.resolve({ id: 'p1' })} />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Export CSV' })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('button', { name: 'Export JSON' })
    ).toBeInTheDocument();
  });

  it('shows an error instead of downloading when JSON export fails', async () => {
    const defaultFetch = global.fetch;
    const getFetchInputUrl = (input: RequestInfo | URL) =>
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.toString()
          : String(input);

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = getFetchInputUrl(input);
        if (
          requestUrl === '/api/projects/p1/export?format=json&scanId=scan-1' ||
          requestUrl.endsWith('/api/projects/p1/export?format=json&scanId=scan-1')
        ) {
          return Promise.resolve(new Response('Unavailable', { status: 503 }));
        }

        return defaultFetch(input, init);
      })
    );

    render(<ProjectResultsPage params={Promise.resolve({ id: 'p1' })} />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Export JSON' })
      ).toBeInTheDocument()
    );
    const exportJsonButton = screen.getByRole('button', { name: 'Export JSON' });
    await waitFor(() => expect(exportJsonButton).not.toBeDisabled());
    fireEvent.click(exportJsonButton);

    await waitFor(() =>
      expect(
        screen.getByText('Unable to export the checklist right now.')
      ).toBeInTheDocument()
    );
    expect(bodyAppendMock).not.toHaveBeenCalled();
  });

  it('creates a project and routes into the saved scan flow', async () => {
    render(<NewProjectPage />);

    fireEvent.change(screen.getByPlaceholderText('Weekend cleanup'), {
      target: { value: 'Trip cleanup' }
    });
    fireEvent.click(screen.getByText('Create project'));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith('/projects/p1/run')
    );
  });

  it('project run posts to the project scan endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    render(
      <RunSessionProvider>
        <ProjectRunPage params={Promise.resolve({ id: 'p1' })} />
      </RunSessionProvider>
    );

    openPickerMock.mockResolvedValue([
      {
        id: 'i1',
        baseUrl: 'https://placehold.co/300',
        filename: 'a.jpg',
        mimeType: 'image/jpeg',
        createTime: '2025-01-01T00:00:00Z'
      }
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Select from Google Photos' })
    );

    const startButton = await screen.findByText('Start saved scan');
    await waitFor(() => expect(startButton).not.toBeDisabled());
    fireEvent.click(startButton);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/projects/p1/scan',
        expect.objectContaining({ method: 'POST' })
      )
    );
  });

  it('results page loads saved state and marks a group done', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    render(<ProjectResultsPage params={Promise.resolve({ id: 'p1' })} />);

    await waitFor(() =>
      expect(
        screen.getByText('Keep one photo. Review the rest manually.')
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText('Mark done'));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/projects/p1/groups/g1/review',
        expect.objectContaining({ method: 'PATCH' })
      )
    );
  });

  it('results page exports csv for the active scan', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    render(<ProjectResultsPage params={Promise.resolve({ id: 'p1' })} />);

    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    await waitFor(() => expect(exportButton).not.toBeDisabled());

    fireEvent.click(exportButton);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/projects/p1/export?format=csv&scanId=scan-1'
      )
    );
  });

  it('project detail page loads project, scans, and review counts', async () => {
    render(<ProjectDetailPage params={Promise.resolve({ id: 'p1' })} />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Trip' })).toBeInTheDocument()
    );

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Unreviewed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New scan' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Resume latest results' })
    ).toBeInTheDocument();
  });

  it('project detail handles projects with no saved scans', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/projects/p1') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'p1',
                userId: 'local-user',
                name: 'Trip',
                status: 'active',
                scope: { type: 'picker', albumIds: [] },
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
              })
            )
          );
        }

        if (input === '/api/projects/p1/scans') {
          return Promise.resolve(new Response(JSON.stringify([])));
        }

        return Promise.resolve(new Response(JSON.stringify({})));
      })
    );

    render(<ProjectDetailPage params={Promise.resolve({ id: 'p1' })} />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Trip' })).toBeInTheDocument()
    );

    expect(
      screen.queryByRole('link', { name: 'Resume latest results' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('No scans have been saved to this project yet.')
    ).toBeInTheDocument();
  });
});
