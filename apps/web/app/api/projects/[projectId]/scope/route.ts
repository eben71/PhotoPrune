import { forward, forwardRequestBody } from '../../../_lib/backend';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  return forward(request, `/api/projects/${projectId}/scope`);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  return forwardRequestBody(request, `/api/projects/${projectId}/scope`, {
    method: 'POST'
  });
}
