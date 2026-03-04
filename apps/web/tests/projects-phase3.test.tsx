import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectsPage from '../app/projects/page';
import ProjectRunPage from '../app/projects/[id]/run/page';
import ProjectResultsPage from '../app/projects/[id]/results/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('scanId=scan-1')
}));

describe('phase 3 projects pages', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((input: string) => {
      if (input === '/api/projects') {
        return Promise.resolve(
          new Response(JSON.stringify({ projects: [{ id: 'p1', name: 'Trip', status: 'active' }] }))
        );
      }
      if (input.includes('/scans/scan-1/results')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              envelope: {
                results: {
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
                          thumbnail: { baseUrl: 'https://placehold.co/200', suggestedSizePx: 300 },
                          links: { googlePhotos: { url: null, fallbackQuery: 'i1', fallbackUrl: 'https://photos.google.com' } }
                        },
                        {
                          itemId: 'i2',
                          type: 'PHOTO',
                          createTime: '2025-01-01T00:00:00Z',
                          filename: 'b.jpg',
                          mimeType: 'image/jpeg',
                          thumbnail: { baseUrl: 'https://placehold.co/200', suggestedSizePx: 300 },
                          links: { googlePhotos: { url: null, fallbackQuery: 'i2', fallbackUrl: 'https://photos.google.com' } }
                        }
                      ]
                    }
                  ]
                }
              },
              reviews: { g1: { state: 'UNREVIEWED', keep_media_item_id: null, notes: null } }
            })
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ projectScanId: 'scan-1' })));
    }) as unknown as typeof fetch);
  });

  it('renders projects list', async () => {
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByText('Trip')).toBeInTheDocument());
  });

  it('project run posts to project scan endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<ProjectRunPage params={Promise.resolve({ id: 'p1' })} />);
    await userEvent.click(screen.getByText('Start project scan'));
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
    await waitFor(() => expect(screen.getByText('Checklist for g1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Mark DONE'));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/projects/p1/groups/g1/review',
        expect.objectContaining({ method: 'PATCH' })
      )
    );
  });
});
