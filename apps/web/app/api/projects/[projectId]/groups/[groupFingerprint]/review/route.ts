import { forward } from '../../../../../_lib/backend';

export async function PATCH(
  request: Request,
  {
    params
  }: { params: Promise<{ projectId: string; groupFingerprint: string }> }
): Promise<Response> {
  const { projectId, groupFingerprint } = await params;
  return forward(`/api/projects/${projectId}/groups/${groupFingerprint}/review`, {
    method: 'PATCH',
    body: await request.text()
  });
}
