import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  PickerItem,
  RunEnvelope,
  RunEnvelopeSchema
} from '../types/phase2Envelope';

type RunLimits = {
  softCapUnits?: number;
  hardCapUnits?: number;
};

type RunRecord = {
  runId: string;
  selection: PickerItem[];
  limits?: RunLimits;
  status: RunEnvelope['run']['status'];
  startedAt: string;
  finishedAt: string | null;
  cancelled: boolean;
  envelope?: RunEnvelope;
};

const runRegistry = new Map<string, RunRecord>();

const stagePlan = [
  { stage: 'INGEST', durationMs: 1200 },
  { stage: 'HASH', durationMs: 1600 },
  { stage: 'COMPARE', durationMs: 1600 },
  { stage: 'GROUP', durationMs: 1200 },
  { stage: 'FINALIZE', durationMs: 800 }
] as const;

const stageMessages: Record<(typeof stagePlan)[number]['stage'], string> = {
  INGEST: 'Gathering selected items from the Picker session.',
  HASH: 'Building fingerprints for exact and near-duplicate checks.',
  COMPARE: 'Comparing candidate matches with safe thresholds.',
  GROUP: 'Clustering potential duplicates into review groups.',
  FINALIZE: 'Finalizing results and cost totals.'
};

async function loadFixture(): Promise<RunEnvelope> {
  let fixturePath: string;
  const moduleUrl = new URL(import.meta.url);
  if (moduleUrl.protocol === 'file:') {
    const fixtureUrl = new URL(
      '../../fixtures/phase2_2_sample_results.json',
      moduleUrl
    );
    fixturePath = fileURLToPath(fixtureUrl);
  } else {
    fixturePath = path.resolve(
      process.cwd(),
      'apps/web/fixtures/phase2_2_sample_results.json'
    );
  }
  const raw = await readFile(fixturePath, 'utf-8');
  return RunEnvelopeSchema.parse(JSON.parse(raw));
}

function nowIso() {
  return new Date().toISOString();
}

function totalDurationMs() {
  return stagePlan.reduce((sum, stage) => sum + stage.durationMs, 0);
}

function computeStage(elapsedMs: number) {
  let remaining = elapsedMs;
  for (const stage of stagePlan) {
    if (remaining <= stage.durationMs) {
      return stage.stage;
    }
    remaining -= stage.durationMs;
  }
  return 'FINALIZE';
}

function computeProgressCounts(stage: string, total: number) {
  const stageIndex = stagePlan.findIndex((entry) => entry.stage === stage);
  const progressRatio = Math.min(1, (stageIndex + 1) / stagePlan.length);
  const processed = Math.max(1, Math.floor(total * progressRatio));
  return {
    processed,
    total
  };
}

function buildEmptyResults() {
  return {
    summary: {
      groupsCount: 0,
      groupedItemsCount: 0,
      ungroupedItemsCount: 0
    },
    groups: [],
    skippedItems: [],
    failedItems: []
  };
}

function buildFailureEnvelope(runId: string, message: string): RunEnvelope {
  return {
    schemaVersion: '2.2.0',
    run: {
      runId,
      status: 'FAILED',
      startedAt: nowIso(),
      finishedAt: nowIso(),
      selection: {
        requestedCount: 0,
        acceptedCount: 0,
        rejectedCount: 0
      }
    },
    progress: {
      stage: 'FINALIZE',
      message,
      counts: {
        processed: 0,
        total: 0
      }
    },
    telemetry: {
      cost: {
        apiCalls: 0,
        estimatedUnits: 0,
        softCapUnits: 0,
        hardCapUnits: 0,
        hitSoftCap: false,
        hitHardCap: false
      },
      warnings: [
        {
          code: 'RUN_NOT_FOUND',
          severity: 'ERROR',
          message
        }
      ]
    },
    results: buildEmptyResults()
  };
}

function applySelectionToFixture(
  fixture: RunEnvelope,
  selection: PickerItem[]
): RunEnvelope {
  if (selection.length === 0) {
    return fixture;
  }

  const flattenedItems = fixture.results.groups.flatMap((group) => group.items);
  const selectionByIndex = selection.slice(0, flattenedItems.length);
  let cursor = 0;

  const updatedGroups = fixture.results.groups
    .map((group) => {
      const updatedItems = group.items
        .map((item) => {
          const selectionItem = selectionByIndex[cursor];
          cursor += 1;
          if (!selectionItem) {
            return null;
          }
          return {
            ...item,
            itemId: selectionItem.id,
            type: selectionItem.type,
            createTime: selectionItem.createTime,
            filename: selectionItem.filename,
            mimeType: selectionItem.mimeType,
            thumbnail: {
              ...item.thumbnail,
              baseUrl: selectionItem.baseUrl
            },
            links: {
              googlePhotos: {
                url: null,
                fallbackQuery: `${selectionItem.filename} ${selectionItem.id}`,
                fallbackUrl: 'https://photos.google.com/'
              }
            }
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (updatedItems.length === 0) {
        return null;
      }

      const representativeItemIds = updatedItems
        .slice(0, 2)
        .map((item) => item.itemId);

      return {
        ...group,
        items: updatedItems,
        representativeItemIds,
        itemsCount: updatedItems.length
      };
    })
    .filter((group): group is NonNullable<typeof group> => group !== null);

  const groupedItemIds = new Set(
    updatedGroups.flatMap((group) => group.items.map((item) => item.itemId))
  );
  const ungroupedItemsCount = Math.max(
    0,
    selection.length - groupedItemIds.size
  );

  return {
    ...fixture,
    run: {
      ...fixture.run,
      selection: {
        requestedCount: selection.length,
        acceptedCount: selection.length,
        rejectedCount: 0
      }
    },
    results: {
      ...fixture.results,
      summary: {
        groupsCount: updatedGroups.length,
        groupedItemsCount: groupedItemIds.size,
        ungroupedItemsCount
      },
      groups: updatedGroups
    }
  };
}

function buildRunningEnvelope(record: RunRecord): RunEnvelope {
  const startedAt = new Date(record.startedAt).getTime();
  const elapsedMs = Date.now() - startedAt;
  const stage = computeStage(elapsedMs);
  const counts = computeProgressCounts(stage, record.selection.length);

  return {
    schemaVersion: '2.2.0',
    run: {
      runId: record.runId,
      status: 'RUNNING',
      startedAt: record.startedAt,
      finishedAt: null,
      selection: {
        requestedCount: record.selection.length,
        acceptedCount: record.selection.length,
        rejectedCount: 0
      }
    },
    progress: {
      stage,
      message: stageMessages[stage],
      counts
    },
    telemetry: {
      cost: {
        apiCalls: Math.max(1, Math.ceil(counts.processed / 25)),
        estimatedUnits: Math.max(10, counts.processed * 2),
        softCapUnits: record.limits?.softCapUnits ?? 1200,
        hardCapUnits: record.limits?.hardCapUnits ?? 2000,
        hitSoftCap: false,
        hitHardCap: false
      },
      warnings: []
    },
    results: buildEmptyResults()
  };
}

export function startRun(
  selection: PickerItem[],
  limits?: RunLimits
): { runId: string } {
  const runId = randomUUID();
  const startedAt = nowIso();

  runRegistry.set(runId, {
    runId,
    selection,
    limits,
    status: 'RUNNING',
    startedAt,
    finishedAt: null,
    cancelled: false
  });

  return { runId };
}

export async function pollRun(runId: string): Promise<RunEnvelope> {
  const record = runRegistry.get(runId);
  if (!record) {
    return buildFailureEnvelope(
      runId,
      'Run not found. The server may have restarted; please start a new session.'
    );
  }

  if (record.cancelled) {
    return {
      schemaVersion: '2.2.0',
      run: {
        runId: record.runId,
        status: 'CANCELLED',
        startedAt: record.startedAt,
        finishedAt: record.finishedAt ?? nowIso(),
        selection: {
          requestedCount: record.selection.length,
          acceptedCount: record.selection.length,
          rejectedCount: 0
        }
      },
      progress: {
        stage: 'FINALIZE',
        message: 'Run cancelled by the user.',
        counts: {
          processed: 0,
          total: record.selection.length
        }
      },
      telemetry: {
        cost: {
          apiCalls: 0,
          estimatedUnits: 0,
          softCapUnits: record.limits?.softCapUnits ?? 1200,
          hardCapUnits: record.limits?.hardCapUnits ?? 2000,
          hitSoftCap: false,
          hitHardCap: false
        },
        warnings: [
          {
            code: 'RUN_CANCELLED',
            severity: 'WARN',
            message: 'This run was cancelled before completion.'
          }
        ]
      },
      results: buildEmptyResults()
    };
  }

  if (record.envelope) {
    return record.envelope;
  }

  const startedAt = new Date(record.startedAt).getTime();
  const elapsedMs = Date.now() - startedAt;

  if (elapsedMs < totalDurationMs()) {
    return buildRunningEnvelope(record);
  }

  const fixture = await loadFixture();
  const finalEnvelope = applySelectionToFixture(fixture, record.selection);
  const completedEnvelope: RunEnvelope = {
    ...finalEnvelope,
    run: {
      ...finalEnvelope.run,
      runId: record.runId,
      status: 'COMPLETED',
      startedAt: record.startedAt,
      finishedAt: nowIso()
    }
  };

  record.envelope = completedEnvelope;
  record.status = 'COMPLETED';
  record.finishedAt = completedEnvelope.run.finishedAt;
  runRegistry.set(record.runId, record);

  return completedEnvelope;
}

export async function cancelRun(runId: string): Promise<RunEnvelope> {
  const record = runRegistry.get(runId);
  if (!record) {
    return buildFailureEnvelope(
      runId,
      'Run not found. The server may have restarted; please start a new session.'
    );
  }

  record.cancelled = true;
  record.status = 'CANCELLED';
  record.finishedAt = nowIso();
  runRegistry.set(record.runId, record);

  return pollRun(runId);
}
