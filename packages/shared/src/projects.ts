import { z } from "zod";

export const ProjectScopeSchema = z.object({
  type: z.enum(["picker", "album_set"]),
  albumIds: z.array(z.string()),
  status: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.enum(["active", "archived"]),
  scope: ProjectScopeSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProjectListSchema = z.object({
  projects: z.array(ProjectSchema),
});
