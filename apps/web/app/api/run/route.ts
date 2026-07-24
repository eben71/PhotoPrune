import { NextResponse } from 'next/server';
import { z } from 'zod';

import { startRun } from '../../../src/engine/engineAdapter';
import { PICKER_MAX_ITEMS } from '../../../src/constants/scanLimits';
import { PickerItemSchema } from '../../../src/types/phase2Envelope';
import {
  enforceLocalGateway,
  gatewayError,
  readBoundedRequestBody
} from '../_lib/backend';

const RunRequestSchema = z.object({
  selection: z.array(PickerItemSchema).max(PICKER_MAX_ITEMS),
  limits: z
    .object({
      softCapUnits: z.number().optional(),
      hardCapUnits: z.number().optional()
    })
    .optional()
});

export async function POST(request: Request) {
  const blocked = enforceLocalGateway(request);
  if (blocked) return blocked;

  const boundedBody = await readBoundedRequestBody(request);
  if ('response' in boundedBody) return boundedBody.response;
  let parsedRequest: z.infer<typeof RunRequestSchema>;
  try {
    parsedRequest = RunRequestSchema.parse(JSON.parse(boundedBody.body));
  } catch {
    return gatewayError(
      request,
      422,
      'The request body is invalid.',
      'request_validation'
    );
  }
  const { selection, limits } = parsedRequest;
  const { runId } = startRun(selection, limits);
  return NextResponse.json({ runId });
}
