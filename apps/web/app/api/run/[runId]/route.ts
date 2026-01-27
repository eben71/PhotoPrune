import { NextResponse } from 'next/server';

import { pollRun } from '../../../../src/engine/engineAdapter';

export async function GET(
  _request: Request,
  { params }: { params: { runId: string } }
) {
  const envelope = await pollRun(params.runId);
  return NextResponse.json(envelope);
}
