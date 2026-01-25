import { z } from 'zod';

export const RunStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
]);

export const ProgressStageSchema = z.enum([
  'INGEST',
  'HASH',
  'COMPARE',
  'GROUP',
  'FINALIZE'
]);

export const ConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const GroupTypeSchema = z.enum([
  'EXACT',
  'NEAR_DUPLICATE',
  'BURST_SERIES',
  'EDIT_VARIANT'
]);

export const PickerItemSchema = z.object({
  id: z.string(),
  baseUrl: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  createTime: z.string(),
  type: z.enum(['PHOTO', 'VIDEO'])
});

export const ItemSchema = z.object({
  itemId: z.string(),
  type: z.enum(['PHOTO', 'VIDEO']),
  createTime: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number()
    })
    .optional(),
  thumbnail: z.object({
    baseUrl: z.string(),
    suggestedSizePx: z.number()
  }),
  links: z.object({
    googlePhotos: z.object({
      url: z.string().nullable(),
      fallbackQuery: z.string(),
      fallbackUrl: z.string().optional()
    })
  }),
  debug: z.record(z.unknown()).optional()
});

export const ItemIssueSchema = z.object({
  itemId: z.string(),
  reasonCode: z.string(),
  message: z.string()
});

export const GroupSchema = z.object({
  groupId: z.string(),
  groupType: GroupTypeSchema,
  confidence: ConfidenceSchema,
  reasonCodes: z.array(z.string()),
  itemsCount: z.number(),
  representativeItemIds: z.array(z.string()).min(1).max(2),
  items: z.array(ItemSchema)
});

export const RunEnvelopeSchema = z.object({
  schemaVersion: z.literal('2.2.0'),
  run: z.object({
    runId: z.string(),
    status: RunStatusSchema,
    startedAt: z.string(),
    finishedAt: z.string().nullable(),
    selection: z.object({
      requestedCount: z.number(),
      acceptedCount: z.number(),
      rejectedCount: z.number()
    })
  }),
  progress: z.object({
    stage: ProgressStageSchema,
    message: z.string(),
    counts: z.object({
      processed: z.number(),
      total: z.number()
    })
  }),
  telemetry: z.object({
    cost: z.object({
      apiCalls: z.number(),
      estimatedUnits: z.number(),
      softCapUnits: z.number(),
      hardCapUnits: z.number(),
      hitSoftCap: z.boolean(),
      hitHardCap: z.boolean()
    }),
    timingMs: z.number().optional(),
    warnings: z.array(
      z.object({
        code: z.string(),
        severity: z.enum(['INFO', 'WARN', 'ERROR']),
        message: z.string(),
        count: z.number().optional()
      })
    )
  }),
  results: z.object({
    summary: z.object({
      groupsCount: z.number(),
      groupedItemsCount: z.number(),
      ungroupedItemsCount: z.number()
    }),
    groups: z.array(GroupSchema),
    skippedItems: z.array(ItemIssueSchema),
    failedItems: z.array(ItemIssueSchema)
  })
});

export type RunEnvelope = z.infer<typeof RunEnvelopeSchema>;
export type PickerItem = z.infer<typeof PickerItemSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ItemIssue = z.infer<typeof ItemIssueSchema>;
