const ALLOWED_LOCAL_HOSTS = new Set(['localhost:3000', '127.0.0.1:3000']);
const ALLOWED_LOOPBACK_API_URLS = new Set([
  'http://localhost:8000',
  'http://127.0.0.1:8000'
]);
const INTERNAL_API_URL = 'http://api:8000';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const RETRY_AFTER_PATTERN = /^\d{1,10}$/;
const MAX_REQUEST_BODY_BYTES = 32 * 1024 * 1024;

export function apiBaseUrls() {
  const internalUrl = process.env.INTERNAL_API_BASE_URL;
  if (internalUrl !== undefined) {
    if (internalUrl !== INTERNAL_API_URL) {
      throw new Error('INTERNAL_API_BASE_URL is not supported.');
    }
    return [internalUrl];
  }

  const loopbackUrl = process.env.PHOTOPRUNE_API_BASE_URL;
  if (loopbackUrl !== undefined) {
    if (!ALLOWED_LOOPBACK_API_URLS.has(loopbackUrl)) {
      throw new Error(
        'PHOTOPRUNE_API_BASE_URL must use the documented loopback API.'
      );
    }
    return [loopbackUrl];
  }
  return ['http://127.0.0.1:8000'];
}

export function apiBaseUrl() {
  return apiBaseUrls()[0];
}

function correlationId(request: Request) {
  const supplied = request.headers.get('x-correlation-id');
  if (supplied && CORRELATION_ID_PATTERN.test(supplied)) return supplied;
  return crypto.randomUUID().replaceAll('-', '');
}

export function gatewayError(
  request: Request,
  status: number,
  message: string,
  category = 'local_only_boundary'
) {
  const requestCorrelationId = correlationId(request);
  return Response.json(
    {
      error: message,
      detail: {
        category,
        message,
        correlationId: requestCorrelationId
      }
    },
    {
      status,
      headers: { 'X-Correlation-ID': requestCorrelationId }
    }
  );
}

export function enforceLocalGateway(request: Request): Response | null {
  const requestUrl = new URL(request.url);
  const host = request.headers.get('host') ?? requestUrl.host;
  if (!ALLOWED_LOCAL_HOSTS.has(host.toLowerCase())) {
    return gatewayError(
      request,
      421,
      'This request was blocked by the local-only gateway.'
    );
  }

  if (!STATE_CHANGING_METHODS.has(request.method.toUpperCase())) {
    return null;
  }
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (
    (origin !== null && origin !== requestUrl.origin) ||
    (fetchSite !== null && fetchSite !== 'same-origin')
  ) {
    return gatewayError(
      request,
      403,
      'This request was blocked by the same-origin policy.'
    );
  }
  return null;
}

export async function readBoundedRequestBody(
  request: Request
): Promise<{ body: string } | { response: Response }> {
  const declaredLength = request.headers.get('content-length');
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > MAX_REQUEST_BODY_BYTES
  ) {
    return {
      response: gatewayError(
        request,
        413,
        'The request body is too large.',
        'request_body_too_large'
      )
    };
  }
  if (!request.body) return { body: '' };

  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      return {
        response: gatewayError(
          request,
          413,
          'The request body is too large.',
          'request_body_too_large'
        )
      };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body: new TextDecoder().decode(bytes) };
}

async function forwardAllowed(
  request: Request,
  path: string,
  init?: RequestInit
) {
  const requestCorrelationId = correlationId(request);
  try {
    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('X-Correlation-ID', requestCorrelationId);
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers
    });
    const text = await response.text();
    const responseCorrelationId =
      response.headers.get('X-Correlation-ID') ?? requestCorrelationId;
    const responseHeaders = new Headers({
      'Content-Type':
        response.headers.get('Content-Type') ?? 'application/json',
      'X-Correlation-ID': responseCorrelationId
    });
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter && RETRY_AFTER_PATTERN.test(retryAfter)) {
      responseHeaders.set('Retry-After', retryAfter);
    }
    return new Response(text, {
      status: response.status,
      headers: responseHeaders
    });
  } catch {
    return gatewayError(
      request,
      503,
      'PhotoPrune API is unavailable. Start the API service and retry.',
      'upstream_unavailable'
    );
  }
}

export async function forward(
  request: Request,
  path: string,
  init?: RequestInit
) {
  const blocked = enforceLocalGateway(request);
  if (blocked) return blocked;
  return forwardAllowed(request, path, init);
}

export async function forwardRequestBody(
  request: Request,
  path: string,
  init?: RequestInit
) {
  const blocked = enforceLocalGateway(request);
  if (blocked) return blocked;
  const boundedBody = await readBoundedRequestBody(request);
  if ('response' in boundedBody) return boundedBody.response;
  return forwardAllowed(request, path, {
    ...init,
    body: boundedBody.body
  });
}
