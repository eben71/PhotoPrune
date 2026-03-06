import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProjectListSchema = z.object({
  projects: z.array(ProjectSchema),
});
