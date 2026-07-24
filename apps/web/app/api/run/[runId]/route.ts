import { NextResponse } from 'next/server';

import { pollRun } from '../../../../src/engine/engineAdapter';
import { enforceLocalGateway } from '../../_lib/backend';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const blocked = enforceLocalGateway(request);
  if (blocked) return blocked;

  const { runId } = await params;
  const envelope = pollRun(runId);
  return NextResponse.json(envelope);
}
