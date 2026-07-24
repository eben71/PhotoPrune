---
title: "PP-028 Enforce the Localhost Deployment Security Boundary"
type: "security"
created: "2026-07-21"
status: "ready-for-implementation"
baseline_commit: "bc04c9a"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/docs/delivery/TASK_BACKLOG.md"
  - "{project-root}/docs/delivery/REPOSITORY_REVIEW_2026-07-20.md"
  - "{project-root}/docs/ARCHITECTURE.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-pp-027-repair-real-photo-scan-input-and-picker-lifecycle.md"
architecture:
  - "{project-root}/_bmad-output/planning-artifacts/architecture-pp-028-localhost-security-boundary.md"
---

# PP-028 Enforce the Localhost Deployment Security Boundary

## Decision Record

PP-028 selects **technically enforced localhost-only, single-operator deployment** for the
current PhotoPrune product. Authenticated multi-user deployment is not approved by this task.

This is the smaller and safer contract for the current MVP because PhotoPrune has no application
identity provider, session model, authorization middleware, or proven tenant-aware repository.
Google OAuth authorizes the browser to read Picker-selected media; it does **not** authenticate a
PhotoPrune user to the API and must not be presented or reused as PhotoPrune login.

The existing `projects.user_id` column and `local-user` value are legacy single-operator storage
details, not an authorization boundary. PP-028 removes the misleading default from callable
repository interfaces where practical, but does not build tenant isolation or migrate persistence.
PP-015 must keep its persistence design inside this single-operator boundary. A later approved
architecture task is required before any remote or multi-user deployment and must cover identity,
sessions, CSRF, tenant-scoped queries, migration, and authorization tests end to end.

## Intent

**Problem:** Project, scan, review, and export routes are unauthenticated and repository queries are
not owner-scoped. Docker currently publishes the web, API, PostgreSQL, and Redis ports on every host
interface. The API also treats an empty download-host allowlist as allow-all, follows redirects
implicitly, and validates DNS separately from connection establishment. CORS does not prevent a
non-browser client from reaching these routes. The current stack is therefore unsafe if reachable
from another machine.

**Approach:** Make local-only operation an invariant at configuration, application, and shipped
network-launcher boundaries. Publish only the web entry point to the host loopback interface; keep
the API, database, Redis, and worker on the private Compose network. Make the API reject unsupported
deployment modes and unsafe production settings at startup. Harden remote media retrieval with an
explicit allowlist, redirect-by-redirect validation, DNS/connection peer verification, and fixed
resource budgets. Add local abuse controls and safe diagnostics without claiming that they replace
authentication.

## Security Invariants

### Always

- The supported deployment mode is exactly `local_only`; it means one trusted operator on the same
  machine, not one trusted LAN or one shared server.
- Shipped launch commands expose the web only on IPv4 loopback (`127.0.0.1:3000`). The API,
  PostgreSQL, and Redis have no host-published ports.
- Browser traffic reaches the API through same-origin Next.js route handlers. Container-to-container
  API traffic remains private and is not evidence of remote support.
- Health endpoints reveal only liveness/readiness-safe values and no configuration, credentials,
  storage paths, download URLs, or project data.
- CORS origins are explicit localhost origins needed by supported development. CORS is browser
  policy only and is never described as authentication or authorization.
- Every caller-controlled outbound media URL and every redirect target is independently validated
  immediately before connection; the connected peer address must be one of the validated public
  addresses.
- Logs and client errors identify a stable error category and correlation ID, not a complete media
  URL, URL query, OAuth token, credentials, response body, or internal exception.

### Ask first

- Any bind address other than loopback, reverse proxy, tunnel, hosted environment, LAN access,
  remote container ingress, or externally managed database/Redis service.
- Adding PhotoPrune accounts, bearer tokens, cookies, user sessions, tenant IDs, or an identity
  provider.
- Changing download byte, item, redirect, time, concurrency, or rate budgets.
- Migrating or redesigning project persistence, including ownership changes assigned to PP-015.

### Never

- Treat Google Picker OAuth, an API key, CORS, `Host`, `Origin`, a project UUID, or `local-user` as
  PhotoPrune authentication.
- Offer an opt-out flag that turns `local_only` into remote operation.
- Start production with an empty download allowlist, wildcard CORS, fixture host overrides, or an
  unknown environment/deployment-mode value.
- Follow a redirect automatically or trust a hostname after only an earlier DNS lookup.
- Retry or continue after a response exceeds a byte/time/work budget.
- Document Docker's internal `0.0.0.0` container bind as public exposure; the host publication
  boundary is authoritative for the shipped Compose topology.

## Technical Decisions

### 1. Configuration is enum-like and fails closed

Add typed settings with these canonical values:

- `deployment_mode`: only `local_only` is accepted in PP-028. Missing may safely default to
  `local_only`; any other non-empty value fails settings validation and application startup.
- `environment`: `local`, `test`, or `production`. Reject aliases such as `prod`, unknown values,
  and case-folded accidental variants rather than silently changing enforcement.

Settings validation occurs before middleware or routes are installed. In `production`:

- `scan_allowed_download_hosts` must contain only canonical exact hosts or the one existing,
  explicit `googleusercontent.com` media-host policy token;
- `scan_download_host_overrides` must be empty;
- when browser-direct CORS is enabled, `cors_origins` must be non-empty, use `http`, name only
  `localhost` or `127.0.0.1`, contain no wildcard, credentials, path, query, or fragment, and use an
  explicit allowed local port; a wholly same-origin gateway may disable CORS explicitly, but an empty
  list must never mean allow-all;
- budget and timeout settings must be positive and no greater than the contract maxima below.

In **every** supported environment, an empty `scan_allowed_download_hosts` list means deny all
downloads; it never means allow every HTTPS host. The shipped local configuration must supply the
minimum Google media allowlist needed by the Picker path. Local/test may use deterministic host
overrides only through explicit test/fixture configuration, and the original fixture hostname must
still be explicitly allowlisted. An override never becomes an implicit production exception.
Configuration errors name the invalid setting and safe remediation but do not print secret values.

### 2. The shipped topology makes remote ingress impossible

Update Compose and documentation so:

- `web` publishes `127.0.0.1:3000:3000`;
- `api`, `postgres`, and `redis` use `expose`/the private Compose network only and publish no host
  ports;
- the web server uses `INTERNAL_API_BASE_URL=http://api:8000` for server-side forwarding and the
  browser uses same-origin `/api/...` handlers;
- direct non-container development commands bind API and web to `127.0.0.1` explicitly.

It is acceptable for a process inside a container to listen on `0.0.0.0` so sibling containers can
reach it; no such port may be published on a non-loopback host interface. Add a deterministic
deployment-policy check that parses the effective Compose configuration and fails when a shipped
service publishes an empty/unspecified host IP, `0.0.0.0`, `::`, a LAN address, or any host port for
API/database/Redis. Run the same check in CI/docs guard or the normal test gate. The check must also
cover IPv6 so `localhost-only` cannot accidentally mean IPv4-safe but IPv6-public.

Application `Host`/origin checks may provide defense in depth, but they are not the primary peer
authorization boundary and must allow the documented private service name for internal forwarding.

The gateway change includes the existing web paths, not only Compose configuration:

- `apps/web/app/api/_lib/backend.ts` must prefer `INTERNAL_API_BASE_URL`, with the loopback API URL
  retained only for an explicitly supported non-container development path;
- add a same-origin web health route that forwards to FastAPI `/healthz`, and change
  `apps/web/app/health/page.tsx` to call that route rather than reading a browser-side API base URL;
- update proxy/helper, health page/route, and environment-selection tests so removing the API host
  port cannot turn project routes into `503` responses or health into a browser network failure.

### 3. No application authentication or tenant claim is introduced

All non-health routes remain usable only because the network boundary admits one trusted local
operator. Documentation must say they are unauthenticated and must not be exposed through a proxy,
tunnel, port-forward, hosted runner, or LAN bind.

Repository creation must not expose a defaulted `user_id="local-user"` parameter that suggests an
authenticated principal. Retain a clearly named internal single-operator storage owner constant
only if schema compatibility requires a non-null value. Do not return it as identity or accept an
owner from requests. Every route/repository test must prove that supplied identity-like headers
(`Authorization`, `X-User-Id`, forwarded-user headers) neither select another owner nor unlock a
resource.

Cross-user authorization tests from the original backlog are resolved as **not applicable to the
selected mode**. Replace them with negative boundary evidence: unauthenticated project operations
work only through loopback/private forwarding, remote exposure fails the deployment check, and
identity-spoofing headers have no authority. Tests and docs must make clear that this is containment,
not multi-user authorization.

### 4. Downloads use explicit redirect and DNS/peer validation

Replace implicit redirect handling with a fetch path that does not auto-follow redirects.

For the initial URL and each redirect:

1. Parse strictly; allow `https` only outside the explicit local/test fixture override path.
2. Reject userinfo, fragments, malformed/ambiguous hosts, disallowed ports, and non-allowlisted
   hostnames before DNS or connection.
3. Resolve all A/AAAA results and reject the whole destination if any result is loopback, private,
   link-local, multicast, reserved, unspecified, or otherwise non-global.
4. Connect using a validated address while preserving the original hostname for TLS SNI and
   certificate verification; inspect the socket peer and reject it unless it is in that validated
   address set. A second resolution or a changed peer cannot silently pass.
5. For a `301`, `302`, `303`, `307`, or `308`, resolve `Location` against the current URL and restart
   all checks. Reject missing/invalid locations and stop after **3 redirects**.

Do not forward caller-supplied authorization/cookie headers to media hosts. Tests must inject DNS,
connection, and response behavior without real network dependence, including a hostname that first
resolves public and then attempts a private connected peer.

### 5. Resource and abuse budgets are fixed

Centralize settings and enforce all lower/equal limits before allocating or scheduling more work:

| Budget                                      |         PP-028 maximum |
| ------------------------------------------- | ---------------------: |
| Inbound HTTP request body                   |                 32 MiB |
| Picker/scan items per request               |                  2,000 |
| Bytes per downloaded item                   |                 50 MiB |
| Aggregate downloaded bytes per scan request |                500 MiB |
| Redirects per item                          |                      3 |
| Connect/read timeout per attempt            |             30 seconds |
| Total download wall time per scan request   |             10 minutes |
| Concurrent scan executions per API process  |                      1 |
| Scan admissions per API process             |   5 per rolling minute |
| Non-health API requests per API process     | 120 per rolling minute |

Enforce the inbound body ceiling in a pure ASGI receive wrapper **before** Starlette/FastAPI reads or
JSON-decodes the body. Reject a declared `Content-Length` above the ceiling immediately, count actual
streamed bytes when the header is absent or false, stop receiving once the ceiling is crossed, and
return `413 request_body_too_large` without invoking request-model parsing. Do not use
`BaseHTTPMiddleware` in a way that buffers the complete body first.

After a bounded body is decoded, replace arbitrary request dictionaries with explicit bounded
Pydantic input models wherever they accept Picker/source data. Forbid unknown keys at the scan input
boundary and cap IDs/source references at 512 characters, filenames at 1,024 characters, MIME types
at 255 characters, URLs/deep links at 4,096 characters, review notes at 4,096 characters, and
collection counts at their existing product limits. URL length validation happens before DNS or URL
fetch policy work. The raw-body ceiling is the pre-parse memory boundary; field and shape validation
is the immediate post-parse semantic boundary.

Stream with a bounded chunk size. Reject an oversized `Content-Length` before reading, still count
actual streamed bytes, and stop the entire request once the aggregate budget is exhausted. Time and
byte counters include failed attempts and redirects where bytes are read. The same item must not
evade aggregate accounting through cache misses or duplicate IDs.

Because the selected mode has one trusted local operator, rate limits are process-wide and
in-memory; they are safety fuses, not distributed identity controls. Return `429` with `Retry-After`
for admission-rate failures and `503` with a safe busy category for the concurrency fuse. Injectable
clock/limiter fixtures must keep tests deterministic. Health endpoints remain outside rate limits.

### 6. Errors and diagnostics are audit-safe

Use stable categories such as `invalid_configuration`, `local_only_boundary`, `download_host`,
`download_address`, `download_redirect`, `download_size`, `download_timeout`, `scan_rate_limited`,
and `scan_busy`. Client detail stays calm and actionable without echoing untrusted URLs or internal
addresses. Server logs may include the normalized hostname, category, correlation ID, route template,
and status, but never URL paths/queries, request/response bodies, Picker URLs, OAuth material, or
tracebacks containing them. Preserve operational tracebacks only after redaction at a controlled
logging boundary.

## I/O and Threat Matrix

| Scenario                   | Input/state                                                                      | Expected behavior                                             | Evidence                         |
| -------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------- |
| Supported local start      | Canonical settings and shipped Compose config                                    | Only `127.0.0.1:3000` is host-published; stack starts         | Config and Compose-policy tests  |
| Public bind regression     | Web publishes `3000:3000`, `0.0.0.0`, or `::`; API/DB/Redis publishes any port   | Deployment-policy check fails                                 | Fixture-based policy tests       |
| Unknown mode               | `DEPLOYMENT_MODE=multi_user` or unknown environment                              | API fails before serving                                      | Settings/startup test            |
| Unsafe production defaults | Empty allowlist, wildcard/non-local CORS, or host override                       | API fails before serving                                      | Parameterized settings tests     |
| Identity spoofing          | Bearer token or user/forwarded-user headers                                      | Header has no authority and cannot select ownership           | Route tests                      |
| Allowed media              | HTTPS Google media host resolves and connects to the same public peer            | Stream succeeds inside all budgets                            | Download test                    |
| Private initial target     | Literal or DNS-resolved loopback/private/link-local address                      | Rejected before request data is sent                          | Download test                    |
| Redirect to private target | Allowed public host redirects to private/link-local URL                          | Redirect rejected before follow                               | Download test                    |
| DNS rebinding              | Validation returns public IP; connection peer is private or not in validated set | Connection rejected and no bytes accepted                     | Injected resolver/connector test |
| Mixed DNS answers          | One public and one non-global address                                            | Entire destination rejected                                   | Download test                    |
| Redirect loop/excess       | More than 3 redirects or repeating target                                        | Request fails with safe redirect category                     | Download test                    |
| Oversized response         | Large `Content-Length`, stream over 50 MiB, or aggregate over 500 MiB            | Reading/scheduling stops and scan fails truthfully            | Download/scan tests              |
| Excess work                | 2,001 items, second concurrent scan, or sixth scan in a minute                   | Rejected before excess work; retry semantics are explicit     | Route/limiter tests              |
| Sensitive upstream error   | URL contains query token and upstream returns an error                           | Client/log captures contain no token, URL path/query, or body | Redaction test                   |
| Oversized inbound body     | Declared or streamed body exceeds 32 MiB; nested fields are oversized            | Rejected before model parsing or work admission; no scan runs | ASGI/schema test                 |

## Code Map

- `apps/api/app/core/config.py` — deployment/environment enums, production invariants, and centralized
  security budgets.
- `apps/api/app/main.py` — startup validation, local-only defense-in-depth middleware, correlation
  IDs, pre-parse request-body ceiling, and safe error boundary.
- `apps/api/app/api/routes.py` — process-wide request/scan admission controls and safe responses.
- `apps/api/app/engine/downloads.py` — explicit redirects, allowlist enforcement, resolver/connector
  injection, peer verification, and per-item/aggregate/time budgets.
- `apps/api/app/engine/scan.py` — one aggregate download budget per scan and truthful budget failure.
- `apps/api/app/projects/repository.py` — remove caller-facing default ownership semantics without a
  PP-015 persistence redesign.
- `apps/api/tests/test_config.py`, `test_main.py`, `test_routes_scan.py`, `test_projects.py`, and
  `test_downloads.py` — negative settings, ingress, pre-parse body/field limits, spoofing, limiter,
  SSRF, rebinding, and budget coverage.
- `apps/web/app/api/_lib/backend.ts`, `apps/web/app/api/health/route.ts`, and
  `apps/web/app/health/page.tsx` — private internal API selection and same-origin health behavior.
- `apps/web/tests/projects-api-route.test.ts` and health/proxy tests — prove project and health paths
  continue to work with only `INTERNAL_API_BASE_URL` configured.
- `docker-compose.yml`, `docker-compose.dev.yml`, and `infra/docker/` — loopback-only host exposure
  with private service networking.
- `scripts/` and CI/package command wiring — deterministic effective-Compose policy check.
- `.env.example`, `README.md`, and `docs/ARCHITECTURE.md` — exact supported boundary and warnings.
- `docs/delivery/TASK_BACKLOG.md` and `docs/delivery/ITERATION_LOG.md` — status and implementation
  evidence after the builder completes the contract.

## Tasks and Acceptance

### Task 1: Encode the local-only startup contract

- [ ] Add strict deployment/environment values and fail-closed production validation.
- [ ] Reject empty production allowlists, unsafe CORS, fixture overrides, and invalid budgets.
- [ ] Keep configuration failures free of sensitive values.

### Task 2: Enforce loopback-only shipped networking

- [ ] Publish only web on IPv4 loopback; stop publishing API, PostgreSQL, and Redis.
- [ ] Keep server-side web-to-API forwarding on the private Compose network.
- [ ] Update the shared web forwarding helper to prefer the internal URL and route browser health
      checks through a tested same-origin handler.
- [ ] Add an IPv4/IPv6-aware effective-Compose policy check and run it in the repository gate.
- [ ] Document direct local commands with explicit loopback binds.

### Task 3: Remove false identity signals

- [ ] Document that project APIs are unauthenticated and locally contained.
- [ ] Remove default caller-facing `local-user` ownership semantics without changing schema scope.
- [ ] Prove identity-like request headers have no authority.
- [ ] Do not add accounts, sessions, tokens, or tenant claims.

### Task 4: Harden remote media retrieval

- [ ] Disable automatic redirects and validate every absolute/resolved target.
- [ ] Reject any non-global or mixed DNS answer and verify the connected peer against validated DNS.
- [ ] Preserve TLS hostname/certificate verification while connecting safely.
- [ ] Enforce redirect, item-byte, aggregate-byte, item-count, and time budgets.
- [ ] Redact sensitive URL and upstream response material from errors and logs.

### Task 5: Bound API work and prove the boundary

- [ ] Reject declared and streamed bodies above 32 MiB in ASGI middleware before JSON/model parsing.
- [ ] Replace arbitrary scan-input dictionaries with bounded, extra-forbidden models and enforce
      ID, filename, MIME, URL, deep-link, note, and collection limits.
- [ ] Add deterministic process-wide scan concurrency/rate and general API rate fuses.
- [ ] Cover invalid config, public exposure, spoofed identity, redirects, rebinding, limits, and safe
      errors with negative tests.
- [ ] Update canonical deployment/architecture docs and only record completion evidence after the
      full implementation gate passes.

## Acceptance Criteria

1. Given the shipped Compose configuration, inspecting the effective configuration shows that only
   the web port is published and its host IP is exactly `127.0.0.1`; API, PostgreSQL, and Redis have
   no host-published ports.
2. Given an unsupported deployment/environment value or unsafe production security setting, API
   construction fails before any socket can serve a route, with a non-sensitive configuration error.
3. Given any project/scan/review/export request, no header or Google OAuth state is treated as a
   PhotoPrune identity; docs truthfully state these operations are unauthenticated and local-only.
4. Given an initial URL, redirect, mixed DNS response, or changed connected peer that is private,
   loopback, link-local, non-global, or outside the allowlist, no response bytes are accepted.
5. Given excessive redirects, items, per-item bytes, aggregate bytes, elapsed download time,
   concurrent scans, or admission rate, processing stops at the documented bound and returns a
   stable safe error/retry contract.
6. Given a declared or streamed request body above 32 MiB, the API returns a safe `413` before JSON
   or Pydantic parsing and before route admission; given an oversized field or unknown scan-input key,
   bounded schema validation rejects it before scan/download work.
7. Given only `INTERNAL_API_BASE_URL=http://api:8000` and no host-published API port, project proxy
   routes and the same-origin health page/handler still reach FastAPI successfully.
8. Given upstream URLs and failures containing credentials, query tokens, paths, bodies, or internal
   exceptions, client responses and captured logs do not disclose them.
9. Negative automated tests cover invalid/empty configuration, IPv4 and IPv6 public exposure,
   declared/streamed body and field limits, identity spoofing, private redirects, DNS rebinding, mixed
   DNS, size/work/time limits, concurrency, rate limits, and redaction without live external network
   calls.
10. No multi-user/authentication claim, non-local deployment path, Google write scope, automatic
    deletion, recovery claim, photo-byte persistence, or similarity percentage is introduced.

## Verification

### Focused checks while building

```text
cd apps/api && uv run pytest tests/test_config.py tests/test_main.py tests/test_downloads.py tests/test_routes_scan.py tests/test_projects.py
cd apps/api && uv run ruff check app tests
cd apps/api && uv run mypy app
pnpm --filter web test -- projects-api-route.test.ts health.test.tsx
pnpm --filter web lint
pnpm --filter web typecheck
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
pnpm check:deployment-boundary
pnpm check:docs
```

### Required handoff gate

```text
make lint
make format-check
make typecheck
make test
node scripts/check-coverage.mjs
make build
pnpm check:docs
```

The deployment review must include the effective-Compose output and the automated policy result.
Passing application tests alone does not prove the network boundary.

## Non-Goals

- Authenticated or authorized multi-user PhotoPrune deployment.
- A PhotoPrune identity provider, account UI, session/cookie/token design, or Google sign-in reuse.
- Tenant migration, per-user database queries, row-level security, or ownership redesign.
- A reverse proxy, TLS termination, cloud deployment, LAN/mobile access, tunnel, or remote worker.
- Distributed rate limiting or a shared concurrency coordinator.
- Persistence/run lifecycle changes owned by PP-015 or readiness orchestration owned by PP-030.
- Google Photos write behavior, automatic deletion, recovery, or numeric similarity/confidence.

## Builder Handoff

- Implement PP-028 from baseline commit `bc04c9a` in a separate builder session using this document
  as the frozen implementation contract.
- Preserve the local-only decision. Stop for renewed human architecture/security review if any
  requirement needs a remote caller, a second operator, an authentication mechanism, a reverse
  proxy, or a tenant-aware persistence change.
- Treat the network policy check, startup failures, peer-address verification, aggregate budgets,
  and redaction tests as release-blocking security evidence rather than optional hardening.
- Coordinate any unavoidable ownership-schema work with PP-015 instead of expanding PP-028.
- Update backlog and iteration-log builder evidence only after implementation and verification.
- Use an independent verifier/security review where practical before marking PP-028 done.
