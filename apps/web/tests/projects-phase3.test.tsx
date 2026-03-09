import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectResultsPage from '../app/projects/[id]/results/page';
import ProjectRunPage from '../app/projects/[id]/run/page';
import ProjectsPage from '../app/projects/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('scanId=scan-1')
}));

describe('phase 3 projects pages', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
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
                    createdAt: '2025-01-01T00:00:00Z',
                    updatedAt: '2025-01-01T00:00:00Z'
                  }
                ]
              })
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
                        ],
                        debug: undefined
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
        return Promise.resolve(
          new Response(JSON.stringify({ projectScanId: 'scan-1' }))
        );
      }) as unknown as typeof fetch
    );
  });

  it('renders projects list', async () => {
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByText('Trip')).toBeInTheDocument());
  });

  it('handles empty projects response body without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input === '/api/projects') {
          return Promise.resolve(new Response(null, { status: 200 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ projectScanId: 'scan-1' }))
        );
      }) as unknown as typeof fetch
    );

    render(<ProjectsPage />);
    await waitFor(() =>
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
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

        if (input === '/api/projects') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                projects: []
              })
            )
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({ projectScanId: 'scan-1' }))
        );
      }) as unknown as typeof fetch
    );

    render(<ProjectsPage />);

    fireEvent.change(screen.getByPlaceholderText('Project name'), {
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

  it('project run posts to project scan endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<ProjectRunPage params={Promise.resolve({ id: 'p1' })} />);
    const startButton = screen.getByText('Start project scan');
    await waitFor(() => expect(startButton).not.toBeDisabled());
    fireEvent.click(startButton);
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/projects/p1/scan',
        expect.objectContaining({ method: 'POST' })
      )
    );
  });

  it('results page loads state and marks done', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<ProjectResultsPage params={Promise.resolve({ id: 'p1' })} />);
    await waitFor(() =>
      expect(screen.getByText('Checklist for g1')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('Mark DONE'));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/projects/p1/groups/g1/review',
        expect.objectContaining({ method: 'PATCH' })
      )
    );
  });
});
