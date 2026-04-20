import { forward } from '../../../../../_lib/backend';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; scanId: string }> }
) {
  const { projectId, scanId } = await params;
  return forward(`/api/projects/${projectId}/scans/${scanId}/diff`);
}
