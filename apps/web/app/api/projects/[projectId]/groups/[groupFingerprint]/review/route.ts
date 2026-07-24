import { forwardRequestBody } from '../../../../../_lib/backend';

export async function PATCH(
  request: Request,
  {
    params
  }: { params: Promise<{ projectId: string; groupFingerprint: string }> }
): Promise<Response> {
  const { projectId, groupFingerprint } = await params;
  return forwardRequestBody(
    request,
    `/api/projects/${projectId}/groups/${groupFingerprint}/review`,
    {
      method: 'PATCH'
    }
  );
}
