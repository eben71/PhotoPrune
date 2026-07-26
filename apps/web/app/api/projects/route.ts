import { forward, forwardRequestBody } from '../_lib/backend';

export async function GET(request: Request) {
  return forward(request, '/api/projects');
}

export async function POST(request: Request) {
  return forwardRequestBody(request, '/api/projects', { method: 'POST' });
}
