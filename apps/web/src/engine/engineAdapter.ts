import { randomUUID } from 'node:crypto';

import fixtureRunEnvelope from '../../fixtures/phase2_2_sample_results.json';

import type { PickerItem, RunEnvelope } from '../types/phase2Envelope';
import { shouldUsePhase21FixtureMode } from './runMode';

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
  resultsOverride?: RunEnvelope['results'],
  warningCode: 'RUN_NOT_FOUND' | 'RUN_EXECUTION_FAILED' = 'RUN_EXECUTION_FAILED'
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
          code: warningCode,
          severity: 'ERROR',
          message
        }
      ]
    },
    results: resultsOverride ?? buildEmptyResults()
  };
}

function formatValidationErrorDetails(detail: unknown): string | null {
  if (!Array.isArray(detail)) {
    return null;
  }
  const messages = detail
    .map((entry): string | null => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const msg = typeof record.msg === 'string' ? record.msg : null;
      const loc = Array.isArray(record.loc)
        ? record.loc
            .filter(
              (segment): segment is string | number =>
                typeof segment === 'string' || typeof segment === 'number'
            )
            .map((segment) => String(segment))
            .join('.')
        : undefined;
      if (!msg) {
        return null;
      }
      return loc ? `${loc}: ${msg}` : msg;
    })
    .filter((item): item is string => Boolean(item));
  if (messages.length === 0) {
    return null;
  }
  return messages.join(' | ');
}

function formatApiErrorMessage(status: number, payload: unknown): string {
  const prefix = `Phase 2.1 scan failed (${status})`;
  if (!payload || typeof payload !== 'object') {
    return `${prefix}.`;
  }
  const detail =
    'detail' in payload
      ? (payload as Record<string, unknown>).detail
      : undefined;
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return `${prefix}: ${detail}`;
  }
  const validationDetails = formatValidationErrorDetails(detail);
  if (validationDetails) {
    return `${prefix}: ${validationDetails}`;
  }
  return `${prefix}.`;
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
  const softCapUnits = record.limits?.softCapUnits ?? DEFAULT_SOFT_CAP_UNITS;
  const hardCapUnits = record.limits?.hardCapUnits ?? DEFAULT_HARD_CAP_UNITS;
  const hitSoftCap = estimatedUnits >= softCapUnits;
  const hitHardCap = estimatedUnits >= hardCapUnits;
  const warnings = [
    ...(hitHardCap
      ? [
          {
            code: 'HARD_CAP_REACHED',
            severity: 'ERROR' as const,
            message: 'Estimated cost exceeded the hard cap for this run.'
          }
        ]
      : []),
    ...(hitSoftCap && !hitHardCap
      ? [
          {
            code: 'SOFT_CAP_REACHED',
            severity: 'WARN' as const,
            message: 'Estimated cost exceeded the soft cap for this run.'
          }
        ]
      : [])
  ];
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
        softCapUnits,
        hardCapUnits,
        hitSoftCap,
        hitHardCap
      },
      timingMs: totalTimingMs,
      warnings
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

function buildFixtureEnvelope(record: RunRecord): RunEnvelope {
  const fixture = structuredClone(fixtureRunEnvelope) as RunEnvelope;
  return {
    ...fixture,
    run: {
      ...fixture.run,
      runId: record.runId,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt ?? nowIso(),
      selection: {
        requestedCount: record.selection.length,
        acceptedCount: record.selection.length,
        rejectedCount: 0
      }
    },
    progress: {
      ...fixture.progress,
      counts: {
        processed: record.selection.length,
        total: record.selection.length
      }
    }
  };
}

async function executeRun(record: RunRecord): Promise<void> {
  try {
    if (shouldUsePhase21FixtureMode()) {
      record.finishedAt = nowIso();
      record.envelope = buildFixtureEnvelope(record);
      record.status = 'COMPLETED';
      return;
    }

    const baseUrls = Array.from(
      new Set([
        process.env.INTERNAL_API_BASE_URL,
        process.env.NEXT_PUBLIC_API_BASE_URL,
        'http://localhost:8000'
      ])
    ).filter((url): url is string => Boolean(url));
    const payload = JSON.stringify({
      photoItems: record.selection.map((item) => ({
        id: item.id,
        createTime: item.createTime,
        filename: item.filename,
        mimeType: item.mimeType,
        downloadUrl: item.baseUrl
      })),
      consentConfirmed: true
    });
    let response: Response | undefined;
    let lastNetworkError: unknown;
    let lastAttemptedUrl: string | undefined;

    for (const baseUrl of baseUrls) {
      try {
        const scanUrl = `${baseUrl.replace(/\/$/, '')}/api/scan`;
        lastAttemptedUrl = scanUrl;
        response = await fetch(scanUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: payload
        });
        break;
      } catch (error) {
        lastNetworkError = error;
      }
    }

    if (!response) {
      const networkMessage =
        lastNetworkError instanceof Error
          ? lastNetworkError.message
          : 'fetch failed';
      throw new Error(
        `Unable to reach the scan API (${networkMessage}). Check that the API is running and NEXT_PUBLIC_API_BASE_URL / INTERNAL_API_BASE_URL are correct. Last URL: ${lastAttemptedUrl ?? 'n/a'}`
      );
    }

    if (!response.ok) {
      let errorPayload: unknown = null;
      try {
        errorPayload = await response.json();
      } catch {
        errorPayload = null;
      }
      throw new Error(formatApiErrorMessage(response.status, errorPayload));
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
    console.error('[run] executeRun failed', {
      runId: record.runId,
      message: record.error
    });
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
  void executeRun(record);

  return { runId };
}

export function pollRun(runId: string): RunEnvelope {
  const record = runRegistry.get(runId);
  if (!record) {
    return buildFailureEnvelope(
      runId,
      'Run not found. The server may have restarted; please start a new session.',
      undefined,
      undefined,
      'RUN_NOT_FOUND'
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
    return buildFailureEnvelope(
      record.runId,
      record.error,
      record,
      undefined,
      'RUN_EXECUTION_FAILED'
    );
  }

  const startedAt = new Date(record.startedAt).getTime();
  const elapsedMs = Date.now() - startedAt;

  if (elapsedMs < totalDurationMs()) {
    return buildRunningEnvelope(record);
  }

  return buildRunningEnvelope(record);
}

export function cancelRun(runId: string): RunEnvelope {
  const record = runRegistry.get(runId);
  if (!record) {
    return buildFailureEnvelope(
      runId,
      'Run not found. The server may have restarted; please start a new session.',
      undefined,
      undefined,
      'RUN_NOT_FOUND'
    );
  }

  record.cancelled = true;
  record.status = 'CANCELLED';
  record.finishedAt = nowIso();
  runRegistry.set(record.runId, record);

  return pollRun(runId);
}
