export function apiBaseUrl() {
  return process.env.PHOTOPRUNE_API_BASE_URL ?? 'http://localhost:8000';
}

export async function forward(path: string, init?: RequestInit) {
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') ?? 'application/json'
      }
    });
  } catch {
    return Response.json(
      {
        error: 'PhotoPrune API is unavailable. Start the API service and retry.'
      },
      { status: 503 }
    );
  }
}
