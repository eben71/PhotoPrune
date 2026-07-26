import { forward } from '../../../../../_lib/backend';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; scanId: string }> }
) {
  const { projectId, scanId } = await params;
  return forward(request, `/api/projects/${projectId}/scans/${scanId}/diff`);
}
