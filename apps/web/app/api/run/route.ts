import { NextResponse } from 'next/server';
import { z } from 'zod';

import { startRun } from '../../../src/engine/engineAdapter';
import { PickerItemSchema } from '../../../src/types/phase2Envelope';

const RunRequestSchema = z.object({
  selection: z.array(PickerItemSchema),
  limits: z
    .object({
      softCapUnits: z.number().optional(),
      hardCapUnits: z.number().optional()
    })
    .optional()
});

export async function POST(request: Request) {
  const { selection, limits } = RunRequestSchema.parse(await request.json());
  const { runId } = startRun(selection, limits);
  return NextResponse.json({ runId });
}
