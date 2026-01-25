import { NextResponse } from 'next/server';

import { cancelRun } from '../../../../../src/engine/engineAdapter';

export async function POST(
  _request: Request,
  { params }: { params: { runId: string } }
) {
  const envelope = await cancelRun(params.runId);
  return NextResponse.json(envelope);
}
