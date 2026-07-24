---
title: 'PP-028 Enforce the Localhost Deployment Security Boundary'
type: 'feature'
created: '2026-07-24'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c115510b08980e43a218c10e8cfd0ab9211ea6c3'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-pp-028-enforce-localhost-deployment-security-boundary.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture-pp-028-localhost-security-boundary.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PhotoPrune has unauthenticated APIs, public Compose bindings, and outbound media risks including permissive hosts, redirects, DNS rebinding, excess work, and sensitive diagnostics.

**Approach:** Enforce `local_only` settings, gateway, and Compose boundaries. Make downloads fail closed with pinned-peer TLS, redirect revalidation, fixed budgets, safe errors, and offline evidence.

## Boundaries & Constraints

**Always:** Publish only `web` at `127.0.0.1:3000`; keep other services private; empty allowlists deny all; validate each target, DNS set, and peer; preserve hostname TLS checks; enforce frozen ceilings; redact diagnostics.

**Ask First:** Any remote/LAN/proxy/tunnel ingress, identity/session/token design, persistence ownership migration, new dependency, TLS exception, or changed security ceiling.

**Never:** Treat OAuth, CORS, headers, IDs, or the owner sentinel as authentication; enable remote operation; auto-follow redirects; accept unsafe peers; leak URLs/tokens/bodies; expand persistence or product scope.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Local start | Merged Compose | Loopback web only; private forwarding works | Reject other publications |
| Unsafe startup | Unknown mode or unsafe production setting | App fails before serving | Redacted `invalid_configuration` |
| Oversized input | Declared, streamed, or semantic overflow | Rejected before parse/work | Safe `413` or validation error |
| Unsafe media | Bad host/DNS/redirect/peer | No bytes accepted | Redacted category |
| Excess work | Frozen ceiling exceeded | Processing stops at bound | Safe `422`/`429`/`503` and retry metadata |
| Identity spoofing | Identity-like headers | Same behavior as no headers | No authority granted |
| Internal gateway | Internal API URL only | Project and health proxies work | Calm `503` |

</frozen-after-approval>

## Code Map

- `apps/api/app/core/config.py`, `main.py`, `api/routes.py`, `engine/`, `projects/` — runtime boundary, downloads, budgets, and owner sentinel.
- `apps/web/app/api/`, `apps/web/app/health/` — private forwarding and same-origin health.
- `docker-compose*.yml`, `scripts/check-deployment-boundary.mjs`, `package.json` — topology and gate.
- `apps/api/tests/`, `apps/web/tests/`, `tests/deployment-boundary/` — negative evidence.
- `.env.example`, `README.md`, `docs/ARCHITECTURE.md`, `docs/delivery/` — boundary and delivery evidence.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/app/core/config.py`, `main.py`, `apps/api/tests/test_config.py`, `test_main.py` — add exact enums, production invariants, safe errors, correlation, pre-parse body ceiling, and general admission.
- [x] `apps/api/app/api/routes.py`, `engine/schemas.py`, `projects/schemas.py` plus route/schema tests — bound inputs and add deterministic scan fuses and spoofed-header evidence.
- [x] `apps/api/app/engine/{downloads,scan}.py`, `apps/api/tests/test_{downloads,scan}.py` — implement explicit redirects, full DNS/peer validation, pinned TLS, redaction, and item/aggregate/deadline budgets.
- [x] `apps/api/app/projects/repository.py`, `apps/api/tests/test_projects.py` — replace caller-facing owner defaults with an internal sentinel.
- [x] `apps/web/app/api/_lib/backend.ts`, `apps/web/app/api/health/route.ts`, `apps/web/app/health/page.tsx`, `apps/web/tests/` — prefer the private API and prove same-origin health/project forwarding.
- [x] `docker-compose*.yml`, `scripts/check-deployment-boundary.mjs`, deployment tests, `package.json` — expose loopback web only and gate IPv4/IPv6 topology.
- [x] `.env.example`, `README.md`, `docs/ARCHITECTURE.md`, `docs/delivery/{TASK_BACKLOG,ITERATION_LOG}.md` — document the unauthenticated local boundary and record verified evidence.
- [x] `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/web/package.json` — preserve the patched Next/Sharp graph; repair only if audit requires it.

**Acceptance Criteria:**
- Given the frozen contract, when all gates run, then its eleven criteria pass without scope expansion.
- Given hostile config, ingress, body, header, network, response, or load fixtures, when exercised offline, then each fails early with stable safe output.
- Given the production dependency graph, when preflight, frozen install, and high-severity audit run, then Next.js is at least `16.2.11`, Sharp is at least `0.35.0`, and the audit exits zero.

## Spec Change Log

## Design Notes

Keep A→B→C→D order. Inject network, clock, and limiter boundaries. Connect to an approved IP, wrap TLS with the original `server_hostname`, verify the peer, and never disable certificate checks. Existing dependency floors are verification inputs.

## Verification

**Commands:**
- Focused API security tests and web gateway tests/lint/typecheck — pass.
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml config` and `pnpm check:deployment-boundary` — topology passes.
- `pnpm dependency:preflight`, frozen install, and production high audit — dependency proof passes.
- Full lint, format, typecheck, test, coverage, build, and docs gates — handoff is green.

## Suggested Review Order

**Runtime fail-closed contract**

- Start with the exact modes, ceilings, allowlists, and production invariants.
  [`config.py:40`](../../apps/api/app/core/config.py#L40)

- Validate settings before route registration or request handling begins.
  [`main.py:20`](../../apps/api/app/main.py#L20)

- Enforce streamed body limits before downstream parsing or ignored-body responses.
  [`security.py:161`](../../apps/api/app/core/security.py#L161)

- Bound scan shape and workload before any media processing starts.
  [`schemas.py:117`](../../apps/api/app/engine/schemas.py#L117)

**Outbound media boundary**

- Pin connections to validated addresses while retaining original-host TLS verification.
  [`downloads.py:226`](../../apps/api/app/engine/downloads.py#L226)

- Revalidate hosts, DNS sets, redirects, peers, and certificate trust fail-closed.
  [`downloads.py:387`](../../apps/api/app/engine/downloads.py#L387)

- Centralize byte, item, redirect, and shared-deadline enforcement.
  [`downloads.py:436`](../../apps/api/app/engine/downloads.py#L436)

**Gateway and shipped topology**

- Restrict upstream selection to the private API or documented loopback addresses.
  [`backend.ts:12`](../../apps/web/app/api/_lib/backend.ts#L12)

- Reject non-local hosts and cross-origin state changes at the gateway.
  [`backend.ts:58`](../../apps/web/app/api/_lib/backend.ts#L58)

- Validate the effective Compose model, including added services and process counts.
  [`check-deployment-boundary.mjs:92`](../../scripts/check-deployment-boundary.mjs#L92)

- Publish only the web gateway on the IPv4 loopback interface.
  [`docker-compose.yml:97`](../../docker-compose.yml#L97)

**Single-operator ownership**

- Keep the storage owner sentinel internal and independent of caller headers.
  [`repository.py:20`](../../apps/api/app/projects/repository.py#L20)

- Prove identity-like headers cannot change project access or response content.
  [`test_projects.py:163`](../../apps/api/tests/test_projects.py#L163)

**Security evidence**

- Exercise resolver deadlines independently of socket connection behavior.
  [`test_downloads.py:384`](../../apps/api/tests/test_downloads.py#L384)

- Reject published ports introduced through previously unknown services.
  [`deployment-boundary.test.mjs:119`](../../tests/deployment-boundary/deployment-boundary.test.mjs#L119)

- Document the unauthenticated localhost-only boundary and unsupported exposure modes.
  [`ARCHITECTURE.md:3`](../../docs/ARCHITECTURE.md#L3)
