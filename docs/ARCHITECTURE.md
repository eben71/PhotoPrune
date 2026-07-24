# Architecture

## Supported deployment boundary

PhotoPrune supports exactly `local_only`: one trusted operator using a browser
on the same machine. Docker publishes only Next.js at
`127.0.0.1:3000`. FastAPI, PostgreSQL, Redis, and the worker are reachable only
inside the private Compose network.

The project and scan APIs are unauthenticated. Google Photos Picker OAuth grants
read access to Picker-selected media; it is not PhotoPrune identity,
authentication, or authorization. CORS is browser defense in depth only.
Reverse proxies, tunnels, LAN binds, hosted deployments, remote Docker ingress,
and multiple operators are unsupported until a separate identity, session,
authorization, CSRF, and tenant-persistence architecture is approved.

Run `pnpm check:deployment-boundary` to inspect the effective base plus
development Compose configuration. The policy rejects public, omitted,
wildcard, LAN, and IPv6-wildcard web bindings and any host-published API,
PostgreSQL, or Redis port. It also rejects host networking, undocumented
Compose overrides, extra API replicas/processes, and extra application
workers.

## Services and request flow

- **Web (`apps/web`)** is the sole local gateway. Browser calls use same-origin
  `/api/...` handlers. Server forwarding prefers
  `INTERNAL_API_BASE_URL=http://api:8000`; the loopback API fallback exists only
  for explicit non-container development. The gateway accepts exactly
  `localhost:3000` and `127.0.0.1:3000`; state-changing requests with an
  incompatible `Origin` or Fetch Metadata signal are rejected before
  forwarding or reading their body. It applies the same 32 MiB streamed body
  ceiling before buffering, accepts only the documented private or loopback
  API base URL, and preserves safe `Retry-After` metadata. Absent Fetch
  Metadata is accepted only to preserve documented non-browser/internal local
  traffic; an explicit cross-site signal is never accepted.
- **API (`apps/api`)** validates the exact deployment/environment contract
  before serving. Pure ASGI middleware adds safe correlation IDs, enforces the
  32 MiB pre-parse body ceiling, and applies process-local request safety fuses.
- **Worker (`apps/worker`)** connects to Redis on the private network.
- **PostgreSQL and Redis** have no host-published ports in the shipped
  configuration. Use `docker compose exec` for local diagnostics.

Health UI traffic uses the same-origin `/api/health` web handler, which forwards
privately to FastAPI `/healthz`. Health responses expose only readiness-safe
status.

## Outbound media boundary

An empty download allowlist denies all media retrieval in every environment.
The shipped local configuration uses the narrow `googleusercontent.com` policy
token for `lh<digits>.googleusercontent.com` Picker media hosts.

For each initial URL and redirect, the API:

1. validates HTTPS URL syntax, exact host policy, and redirect count;
2. resolves the complete A/AAAA set and rejects it if any address is non-global;
3. connects to one validated IP while preserving the original hostname for TLS
   SNI and certificate verification;
4. verifies the connected peer belongs to the validated set; and
5. uses a direct transport that does not inherit proxies, ambient credentials,
   cookies, `.netrc`, or environment-selected trust; and
6. enforces per-item, aggregate, 30-second attempt, and one monotonic scan
   deadline while streaming; DNS resolution and connection phases are bounded
   by the remaining deadline.

Encoded responses fail closed unless they use identity encoding, so automatic
decompression cannot expand beyond the per-item or aggregate byte ceilings.
DNS, connection, TLS, redirects, reads, scheduling, and cleanup all consume the
same scan deadline. A byte, redirect, or time budget violation stops the scan
before another item is scheduled.

Local/test fixture overrides are explicit, require the original fixture
hostname to be allowlisted, and are rejected in production. Client errors and
logs use stable categories and correlation IDs without media URL paths,
queries, credentials, response bodies, or OAuth material.

## Data and contracts

- The project database retains `local-user` only as an internal non-null storage
  sentinel. It is not accepted from requests or returned as identity.
- Shared browser/API contracts live in `packages/shared`.
- Python services use `uv`-managed locks; JavaScript packages use pnpm and
  Turborepo.
- Photo review remains group-based, read-only, and free of automatic deletion
  or numeric similarity claims.
