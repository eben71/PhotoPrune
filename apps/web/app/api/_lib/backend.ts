export function apiBaseUrl() {
  return process.env.PHOTOPRUNE_API_BASE_URL ?? 'http://localhost:8000';
}

export async function forward(path: string, init?: RequestInit) {
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
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json'
    }
  });
}
