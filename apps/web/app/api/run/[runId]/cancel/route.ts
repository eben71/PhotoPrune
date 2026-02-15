import { NextResponse } from 'next/server';

import { cancelRun } from '../../../../../src/engine/engineAdapter';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const envelope = cancelRun(runId);
  return NextResponse.json(envelope);
}
