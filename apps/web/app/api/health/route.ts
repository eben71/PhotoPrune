import { forward } from '../_lib/backend';

export async function GET(request: Request) {
  return forward(request, '/healthz');
}
