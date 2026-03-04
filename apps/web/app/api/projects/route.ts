import { forward } from '../_lib/backend';

export async function GET() {
  return forward('/api/projects');
}

export async function POST(request: Request) {
  return forward('/api/projects', { method: 'POST', body: await request.text() });
}
