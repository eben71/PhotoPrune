import { z } from 'zod';

import { RunEnvelopeSchema } from './phase2Envelope';

export const ProjectSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.enum(['active', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ProjectListResponseSchema = z.object({
  projects: z.array(ProjectSchema)
});

export const ProjectScanRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  createdAt: z.string(),
  sourceType: z.string(),
  sourceRef: z.record(z.string(), z.unknown())
});

export const ProjectScanResponseSchema = z.object({
  projectScanId: z.string(),
  envelope: RunEnvelopeSchema.optional()
});

export const ReviewStateSchema = z.object({
  id: z.string().optional(),
  project_id: z.string().optional(),
  group_fingerprint: z.string().optional(),
  state: z.enum(['UNREVIEWED', 'IN_PROGRESS', 'DONE', 'SNOOZED']),
  keep_media_item_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export const ProjectScanResultsResponseSchema = z.object({
  projectScanId: z.string(),
  envelope: RunEnvelopeSchema,
  reviews: z.record(z.string(), ReviewStateSchema)
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectScanRecord = z.infer<typeof ProjectScanRecordSchema>;
export type ProjectScanResultsResponse = z.infer<typeof ProjectScanResultsResponseSchema>;
