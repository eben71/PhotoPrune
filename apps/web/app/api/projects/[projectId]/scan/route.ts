import { forward } from '../../../_lib/backend';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  return forward(`/api/projects/${projectId}/scan`, {
    method: 'POST',
    body: await request.text()
  });
}
