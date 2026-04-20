import { z } from 'zod';

import { RunEnvelopeSchema } from './phase2Envelope';

export const ProjectScopeSchema = z.object({
  type: z.enum(['picker', 'album_set']),
  albumIds: z.array(z.string()),
  status: z.string().optional()
});

export const ProjectSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.enum(['active', 'archived']),
  scope: ProjectScopeSchema.nullable().optional(),
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

export const ProjectScanDiffGroupSchema = z.object({
  groupFingerprint: z.string(),
  category: z.enum(['NEW', 'CHANGED', 'UNCHANGED']),
  memberMediaItemIds: z.array(z.string()),
  previousGroupFingerprint: z.string().nullable().optional(),
  previousMemberMediaItemIds: z.array(z.string()).nullable().optional(),
  reviewState: z.enum(['UNREVIEWED', 'IN_PROGRESS', 'DONE', 'SNOOZED']),
  priorReviewStatePreserved: z.boolean(),
  previouslyReviewed: z.boolean(),
  requiresReview: z.boolean()
});

export const ProjectScanDiffResponseSchema = z.object({
  projectId: z.string(),
  projectScanId: z.string(),
  previousProjectScanId: z.string().nullable(),
  summary: z.object({
    totalGroups: z.number(),
    new: z.number(),
    changed: z.number(),
    unchanged: z.number(),
    previouslyReviewedUnchanged: z.number(),
    requiresReview: z.number()
  }),
  groups: z.array(ProjectScanDiffGroupSchema)
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectScanRecord = z.infer<typeof ProjectScanRecordSchema>;
export type ProjectScanResultsResponse = z.infer<
  typeof ProjectScanResultsResponseSchema
>;
export type ProjectScanDiffGroup = z.infer<typeof ProjectScanDiffGroupSchema>;
export type ProjectScanDiffResponse = z.infer<
  typeof ProjectScanDiffResponseSchema
>;
