import { forward } from '../../_lib/backend';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  return forward(request, `/api/projects/${projectId}`);
}
