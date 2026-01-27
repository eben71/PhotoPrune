import { NextResponse } from 'next/server';

import { pollRun } from '../../../../src/engine/engineAdapter';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const envelope = await pollRun(runId);
  return NextResponse.json(envelope);
}
