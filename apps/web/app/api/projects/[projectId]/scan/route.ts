import { forwardRequestBody } from '../../../_lib/backend';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  return forwardRequestBody(request, `/api/projects/${projectId}/scan`, {
    method: 'POST'
  });
}
