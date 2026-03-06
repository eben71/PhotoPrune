import { forward } from '../../../_lib/backend';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get('format') ?? 'json';
  return forward(`/api/projects/${projectId}/export?format=${format}`);
}
