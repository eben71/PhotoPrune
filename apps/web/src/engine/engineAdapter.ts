import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { PickerItem, RunEnvelope } from '../types/phase2Envelope';

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
  error?: string;
};
const runRegistry = new Map<string, RunRecord>();
type ScanItem = { id: string };
type ScanGroup = {
  groupId: string;
  category: string;
  items: ScanItem[];
  representativePair: { earliest: ScanItem; latest: ScanItem };
};
type ScanResult = {
  stageMetrics: {
    timingsMs: Record<string, number>;
    counts: Record<string, number>;
  };
  costEstimate: { totalCost: number };
  groupsExact: ScanGroup[];
  groupsVerySimilar: ScanGroup[];
  groupsPossiblySimilar: ScanGroup[];
};
const categoryMappings: Record<
  string,
  {
    groupType: RunEnvelope['results']['groups'][number]['groupType'];
    confidence: RunEnvelope['results']['groups'][number]['confidence'];
    reasonCodes: string[];
  }
> = {
  EXACT: {
    groupType: 'EXACT',
    confidence: 'HIGH',
    reasonCodes: ['HASH_MATCH']
  },
  VERY_SIMILAR: {
    groupType: 'NEAR_DUPLICATE',
    confidence: 'MEDIUM',
    reasonCodes: ['PERCEPTUAL_HASH_VERY']
  },
  POSSIBLY_SIMILAR: {
    groupType: 'NEAR_DUPLICATE',
    confidence: 'LOW',
    reasonCodes: ['PERCEPTUAL_HASH_POSSIBLE']
  }
};
const DEFAULT_SOFT_CAP_UNITS = 1200;
const DEFAULT_HARD_CAP_UNITS = 2000;
const COST_UNIT_SCALE = 100000;
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
const useFixture =
  process.env.USE_PHASE2_FIXTURE === '1' || process.env.NODE_ENV === 'test';
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
  return JSON.parse(raw) as RunEnvelope;
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

function buildFailureEnvelope(
  runId: string,
  message: string,
  record?: RunRecord,
  resultsOverride?: RunEnvelope['results']
): RunEnvelope {
  const selectionCount = record?.selection.length ?? 0;
  return {
    schemaVersion: '2.2.0',
    run: {
      runId,
      status: 'FAILED',
      startedAt: record?.startedAt ?? nowIso(),
      finishedAt: record?.finishedAt ?? nowIso(),
      selection: {
        requestedCount: selectionCount,
        acceptedCount: selectionCount,
        rejectedCount: 0
      }
    },
    progress: {
      stage: 'FINALIZE',
      message,
      counts: {
        processed: 0,
        total: selectionCount
      }
    },
    telemetry: {
      cost: {
        apiCalls: 0,
        estimatedUnits: 0,
        softCapUnits: record?.limits?.softCapUnits ?? DEFAULT_SOFT_CAP_UNITS,
        hardCapUnits: record?.limits?.hardCapUnits ?? DEFAULT_HARD_CAP_UNITS,
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
    results: resultsOverride ?? buildEmptyResults()
  };
}

function mapScanResults(record: RunRecord, scan: ScanResult): RunEnvelope {
  const selectionById = new Map(
    record.selection.map((item) => [item.id, item])
  );
  const groups = [
    ...scan.groupsExact,
    ...scan.groupsVerySimilar,
    ...scan.groupsPossiblySimilar
  ].map((group) => {
    const mapping = categoryMappings[group.category] ?? {
      groupType: 'NEAR_DUPLICATE',
      confidence: 'LOW',
      reasonCodes: ['UNSPECIFIED']
    };
    const items = group.items
      .map((item) => selectionById.get(item.id))
      .filter((item): item is PickerItem => item !== undefined)
      .map((item) => ({
        itemId: item.id,
        type: item.type,
        createTime: item.createTime,
        filename: item.filename,
        mimeType: item.mimeType,
        thumbnail: { baseUrl: item.baseUrl, suggestedSizePx: 300 },
        links: {
          googlePhotos: {
            url: null,
            fallbackQuery: `${item.filename} ${item.id}`,
            fallbackUrl: 'https://photos.google.com/'
          }
        }
      }));
    const representativeItemIds = Array.from(
      new Set([
        group.representativePair.earliest.id,
        group.representativePair.latest.id
      ])
    ).slice(0, 2);
    if (representativeItemIds.length === 0 && items.length > 0)
      representativeItemIds.push(items[0].itemId);
    return {
      groupId: group.groupId,
      groupType: mapping.groupType,
      confidence: mapping.confidence,
      reasonCodes: mapping.reasonCodes,
      itemsCount: items.length,
      representativeItemIds,
      items
    };
  });
  const groupedIds = new Set(
    groups.flatMap((group) => group.items.map((item) => item.itemId))
  );
  const groupedItemsCount = groupedIds.size;
  const ungroupedItemsCount = Math.max(
    0,
    record.selection.length - groupedItemsCount
  );
  const totalTimingMs = Object.values(scan.stageMetrics.timingsMs).reduce(
    (sum, value) => sum + value,
    0
  );
  const estimatedUnits = Math.max(
    1,
    Math.round(scan.costEstimate.totalCost * COST_UNIT_SCALE)
  );
  return {
    schemaVersion: '2.2.0',
    run: {
      runId: record.runId,
      status: 'COMPLETED',
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
      message: 'Run completed.',
      counts: {
        processed: record.selection.length,
        total: record.selection.length
      }
    },
    telemetry: {
      cost: {
        apiCalls: scan.stageMetrics.counts['downloads_performed'] ?? 0,
        estimatedUnits,
        softCapUnits: record.limits?.softCapUnits ?? DEFAULT_SOFT_CAP_UNITS,
        hardCapUnits: record.limits?.hardCapUnits ?? DEFAULT_HARD_CAP_UNITS,
        hitSoftCap: false,
        hitHardCap: false
      },
      timingMs: totalTimingMs,
      warnings: []
    },
    results: {
      summary: {
        groupsCount: groups.length,
        groupedItemsCount,
        ungroupedItemsCount
      },
      groups,
      skippedItems: [],
      failedItems: []
    }
  };
}

function applySelectionToFixture(
  fixture: RunEnvelope,
  selection: PickerItem[]
): RunEnvelope {
  if (selection.length === 0) {
    return {
      ...fixture,
      run: {
        ...fixture.run,
        selection: {
          requestedCount: 0,
          acceptedCount: 0,
          rejectedCount: 0
        }
      },
      results: buildEmptyResults()
    };
  }

  const selectionIds = new Set(selection.map((item) => item.id));
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
  const filteredSkippedItems = fixture.results.skippedItems.filter((item) =>
    selectionIds.has(item.itemId)
  );
  const filteredFailedItems = fixture.results.failedItems.filter((item) =>
    selectionIds.has(item.itemId)
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
      summary: {
        groupsCount: updatedGroups.length,
        groupedItemsCount: groupedItemIds.size,
        ungroupedItemsCount
      },
      groups: updatedGroups,
      skippedItems: filteredSkippedItems,
      failedItems: filteredFailedItems
    }
  };
}

async function executeRun(record: RunRecord): Promise<void> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        photoItems: record.selection.map((item) => ({
          id: item.id,
          createTime: item.createTime,
          filename: item.filename,
          mimeType: item.mimeType,
          downloadUrl: item.baseUrl
        })),
        consentConfirmed: true
      })
    });

    if (!response.ok) {
      throw new Error(`Phase 2.1 scan failed with status ${response.status}.`);
    }

    const scan = (await response.json()) as ScanResult;

    if (record.cancelled) {
      return;
    }

    record.finishedAt = nowIso();
    record.envelope = mapScanResults(record, scan);
    record.status = 'COMPLETED';
  } catch (error) {
    if (record.cancelled) {
      return;
    }
    record.finishedAt = nowIso();
    record.status = 'FAILED';
    record.error =
      error instanceof Error ? error.message : 'Unable to run the core engine.';
  } finally {
    runRegistry.set(record.runId, record);
  }
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

  const record: RunRecord = {
    runId,
    selection,
    limits,
    status: 'RUNNING',
    startedAt,
    finishedAt: null,
    cancelled: false
  };

  runRegistry.set(runId, record);
  if (!useFixture) {
    void executeRun(record);
  }

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

  if (record.error) {
    const resultsOverride: RunEnvelope['results'] | undefined = undefined;
    return buildFailureEnvelope(
      record.runId,
      record.error,
      record,
      resultsOverride
    );
  }

  const startedAt = new Date(record.startedAt).getTime();
  const elapsedMs = Date.now() - startedAt;

  if (elapsedMs < totalDurationMs()) {
    return buildRunningEnvelope(record);
  }

  if (useFixture) {
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

  return buildRunningEnvelope(record);
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
