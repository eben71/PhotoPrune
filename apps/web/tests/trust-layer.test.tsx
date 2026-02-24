import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { GroupList } from '../app/components/GroupList';
import ResultsPage from '../app/results/page';
import RunPage from '../app/run/page';
import { useRunSession } from '../app/state/runSessionStore';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockApplyEnvelope = vi.fn();
const mockClearResults = vi.fn();
const mockClearSelection = vi.fn();
const mockSetSelection = vi.fn();

type RunSessionContextValue = ReturnType<typeof useRunSession>;

const createSession = (): RunSessionContextValue => ({
  state: {
    selection: [
      {
        id: 'item-1',
        baseUrl: 'https://placehold.co/80',
        filename: 'IMG_1.jpg',
        mimeType: 'image/jpeg',
        createTime: '2024-01-01T00:00:00.000Z',
        type: 'PHOTO'
      }
    ],
    run: null,
    progress: null,
    telemetry: null,
    results: {
      summary: { groupsCount: 1, groupedItemsCount: 2, ungroupedItemsCount: 1 },
      groups: [
        {
          groupId: 'group-1',
          groupType: 'EXACT',
          confidence: 'HIGH',
          reasonCodes: ['HASH_MATCH'],
          itemsCount: 2,
          representativeItemIds: ['i1'],
          items: [
            {
              itemId: 'i1',
              type: 'PHOTO',
              createTime: '2024-01-01T00:00:00.000Z',
              filename: 'a.jpg',
              mimeType: 'image/jpeg',
              thumbnail: {
                baseUrl: 'https://placehold.co/100',
                suggestedSizePx: 100
              },
              links: {
                googlePhotos: {
                  url: null,
                  fallbackQuery: 'a',
                  fallbackUrl: 'https://photos.google.com/'
                }
              }
            },
            {
              itemId: 'i2',
              type: 'PHOTO',
              createTime: '2024-01-01T00:00:00.000Z',
              filename: 'b.jpg',
              mimeType: 'image/jpeg',
              thumbnail: {
                baseUrl: 'https://placehold.co/100',
                suggestedSizePx: 100
              },
              links: {
                googlePhotos: {
                  url: null,
                  fallbackQuery: 'b',
                  fallbackUrl: 'https://photos.google.com/'
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
  hydrated: true,
  setSelection: mockSetSelection,
  applyEnvelope: mockApplyEnvelope,
  clearResults: mockClearResults,
  clearSelection: mockClearSelection
});

let currentSession: RunSessionContextValue = createSession();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));

vi.mock('../app/state/runSessionStore', () => ({
  useRunSession: () => currentSession
}));

beforeEach(() => {
  currentSession = createSession();
  vi.clearAllMocks();
});

describe('Trust layer states', () => {
  it('shows cancel confirmation trust copy', () => {
    currentSession.state.run = {
      runId: 'run-1',
      status: 'RUNNING',
      startedAt: '2024-01-01T00:00:00.000Z',
      finishedAt: null,
      selection: { requestedCount: 1, acceptedCount: 1, rejectedCount: 0 }
    };
    currentSession.state.progress = {
      stage: 'COMPARE',
      message: 'Comparing',
      counts: { processed: 2, total: 3 }
    };

    render(<RunPage />);

    fireEvent.click(screen.getByRole('button', { name: /stop scan/i }));

    expect(
      screen.getByRole('heading', {
        name: /are you sure you want to end this session\?/i
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Nothing has been deleted')).toBeInTheDocument();
  });

  it('starts a run and applies envelope results', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ runId: 'run-123' })
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              schemaVersion: '2.2.0',
              run: {
                runId: 'run-123',
                status: 'COMPLETED',
                startedAt: '2024-01-01T00:00:00.000Z',
                finishedAt: '2024-01-01T00:00:01.000Z',
                selection: {
                  requestedCount: 1,
                  acceptedCount: 1,
                  rejectedCount: 0
                }
              },
              progress: {
                stage: 'FINALIZE',
                message: 'Done',
                counts: { processed: 1, total: 1 }
              },
              telemetry: {
                cost: {
                  apiCalls: 1,
                  estimatedUnits: 1,
                  softCapUnits: 5,
                  hardCapUnits: 10,
                  hitSoftCap: false,
                  hitHardCap: false
                },
                warnings: []
              },
              results: currentSession.state.results
            })
        })
    );

    render(<RunPage />);
    fireEvent.click(
      screen.getByRole('button', { name: /start review session/i })
    );

    await waitFor(() => expect(mockApplyEnvelope).toHaveBeenCalled());
    expect(mockClearResults).toHaveBeenCalled();
  });

  it('shows cap reached copy', () => {
    currentSession.state.run = {
      runId: 'run-1',
      status: 'RUNNING',
      startedAt: '2024-01-01T00:00:00.000Z',
      finishedAt: null,
      selection: { requestedCount: 1, acceptedCount: 1, rejectedCount: 0 }
    };
    currentSession.state.telemetry = {
      cost: {
        apiCalls: 2,
        estimatedUnits: 80,
        softCapUnits: 100,
        hardCapUnits: 100,
        hitSoftCap: false,
        hitHardCap: true
      },
      warnings: []
    };
    render(<RunPage />);
    expect(screen.getByText('Scan limit reached')).toBeInTheDocument();
  });

  it('shows results trust panels and session warning', () => {
    currentSession.state.telemetry = {
      cost: {
        apiCalls: 2,
        estimatedUnits: 80,
        softCapUnits: 100,
        hardCapUnits: 100,
        hitSoftCap: false,
        hitHardCap: false
      },
      warnings: []
    };

    render(<ResultsPage />);
    expect(
      screen.getByRole('heading', { name: /what the confidence bands mean:/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing is deleted automatically/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/results will be lost/i)).toBeInTheDocument();
  });

  it('shows empty state copy when groups are empty', () => {
    render(<GroupList groups={[]} />);
    expect(
      screen.getByRole('heading', { name: /no similar photo groups detected/i })
    ).toBeInTheDocument();
  });
});
