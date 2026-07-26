import { NextResponse } from 'next/server';

import { cancelRun } from '../../../../../src/engine/engineAdapter';
import { enforceLocalGateway } from '../../../_lib/backend';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const blocked = enforceLocalGateway(request);
  if (blocked) return blocked;

  const { runId } = await params;
  const envelope = cancelRun(runId);
  return NextResponse.json(envelope);
}
