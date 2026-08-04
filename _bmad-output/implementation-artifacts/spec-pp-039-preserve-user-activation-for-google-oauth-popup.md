---
title: "PP-039 Preserve User Activation for the Google OAuth Popup"
type: "bugfix"
created: "2026-08-04"
status: "done"
review_loop_iteration: 1
baseline_commit: "36f704639789a6981e2dc4107d5b3c1b96c8d6f4"
context:
  - "{project-root}/AGENT_RULES.md"
  - "{project-root}/apps/web/AGENTS.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-pp-027-repair-real-photo-scan-input-and-picker-lifecycle.md"
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The real Google Identity Services token flow can fail with `popup_failed_to_open` because `openPicker()` awaits GIS script loading before calling `requestAccessToken()`. That asynchronous boundary can consume the browser's transient user activation even though the separate Photos Picker placeholder is opened synchronously.

**Approach:** Use an explicit two-step MVP flow. The first user action opens only the GIS authorization popup; after authorization succeeds, the UI clearly asks for a second user action that opens the Photos Picker placeholder and continues session creation. Preload GIS, expose readiness and session-only authorization state, and handle GIS popup failures and user closure through `error_callback` instead of waiting for the generic OAuth timeout.

## Boundaries & Constraints

**Always:** Preserve the read-only Photos Picker scope, the synchronous named Picker placeholder, in-memory-only access tokens, bounded callbacks/timeouts, calm explicit outcomes, and the existing session cleanup behavior. Each popup-opening step must have its own user gesture. Keep the two actions visually and verbally clear, announce state changes accessibly, and prevent concurrent flows.

**Ask First:** Switching to the authorization-code model, adding backend token exchange/storage, changing OAuth client configuration, adding dependencies, changing the supported Google Photos scope, or collapsing the two MVP actions without real-browser evidence that one user gesture safely supports the design.

**Never:** Persist OAuth tokens, add Google Photos write access, silently retry an interactive popup without another user gesture, open the OAuth and Picker windows from the same gesture, weaken popup/cancellation handling, add deletion behavior, or introduce unsupported product claims.

## I/O & Edge-Case Matrix

| Scenario                 | Input / State                                 | Expected Output / Behavior                                                                      | Error Handling                                                              |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| GIS ready, access absent | User chooses Connect after preload            | Only the GIS OAuth popup opens; successful callback marks access ready for this browser session | Present the separate Select action; do not open the Picker yet              |
| Access ready             | User chooses Select                           | Named Picker placeholder opens synchronously, then session creation navigates that window       | Preserve existing blocked, closed, polling, selection, and cleanup behavior |
| GIS still loading        | Page has rendered before the library is ready | Connect action is temporarily unavailable with an honest preparing state                        | Do not schedule a delayed OAuth popup                                       |
| OAuth popup blocked      | GIS reports `popup_failed_to_open`            | Authorization stops immediately                                                                 | Report `popup-blocked` with popup guidance                                  |
| OAuth popup closed       | GIS reports `popup_closed`                    | Authorization stops without creating a Picker session                                           | Report cancellation without a misleading failure                            |
| Picker API returns `401` | Access expires during session work            | Cached access is cleared and the Picker flow stops                                              | Require a fresh Connect gesture; do not open OAuth asynchronously           |
| OAuth callback absent    | GIS neither succeeds nor errors               | Existing fixed timeout terminates the flow                                                      | Report bounded timeout without opening the Picker                           |

</frozen-after-approval>

## Code Map

- `apps/web/app/hooks/useGooglePhotosPicker.ts` -- GIS readiness, explicit authorization state/action, error callback mapping, and Picker lifecycle.
- `apps/web/app/copy/trustCopy.ts` -- shared plain-English labels and session-only authorization guidance.
- `apps/web/app/page.tsx` -- two-step home action and accessible status messaging.
- `apps/web/app/projects/[id]/run/page.tsx` -- two-step saved-project action and accessible status messaging.
- `apps/web/tests/use-google-photos-picker-hook.test.tsx` -- timing and terminal-outcome regression coverage.
- `apps/web/tests/home.test.tsx`, `apps/web/tests/projects-phase3.test.tsx` -- user-facing two-step behavior and copy coverage.
- `docs/delivery/TASK_BACKLOG.md` -- PP-039 scope, acceptance, status, and evidence.
- `docs/delivery/ITERATION_LOG.md` -- implementation and verification record.

## Tasks & Acceptance

**Execution:**

- [x] `apps/web/app/hooks/useGooglePhotosPicker.ts` -- separate authorization from Picker launch, preload GIS, expose readiness/session authorization, prevent concurrent flows, and require a fresh gesture after `401`.
- [x] `apps/web/app/hooks/useGooglePhotosPicker.ts` -- capture GIS non-OAuth popup errors and map blocked versus closed outcomes explicitly.
- [x] `apps/web/app/copy/trustCopy.ts`, `apps/web/app/page.tsx`, `apps/web/app/projects/[id]/run/page.tsx` -- render clear two-step actions and accessible status/error announcements on both entry paths.
- [x] `apps/web/tests/use-google-photos-picker-hook.test.tsx`, `apps/web/tests/home.test.tsx`, `apps/web/tests/projects-phase3.test.tsx` -- cover readiness, separate gestures, blocked/closed OAuth, expired access, concurrency, and visible state transitions.
- [x] `docs/delivery/TASK_BACKLOG.md`, `docs/delivery/ITERATION_LOG.md` -- record PP-039 evidence and add a post-MVP story to evaluate a more seamless design with real-browser and security evidence.

**Acceptance Criteria:**

- Given GIS has preloaded and access is absent, when the user chooses Connect, then only `requestAccessToken()` runs from that gesture and no Picker placeholder opens.
- Given authorization succeeds, when the UI updates, then it explains that Google Photos is connected for this session and presents a separate Select action.
- Given access is ready, when the user chooses Select, then the Picker placeholder opens synchronously and the existing Picker session flow continues.
- Given GIS has not loaded, when the page renders, then authorization is unavailable without scheduling a delayed popup attempt.
- Given GIS reports a blocked or closed OAuth popup, when authorization terminates, then the UI exposes the correct blocked or cancelled outcome.
- Given a Picker request returns `401`, when access is cleared, then the UI requires a fresh Connect gesture and does not launch asynchronous reauthorization.
- Given the fix, when focused web checks run, then session creation, token-expiry handling, pagination, selection, and cleanup behavior remains green.

## Spec Change Log

- Review loop 1: Independent review found that the original one-click approach could consume one browser gesture by opening the Picker placeholder before GIS attempted a second popup. The user approved an explicit two-step MVP flow and requested a separate post-MVP backlog story for seamless alternatives. Preserve the read-only scope, in-memory token boundary, existing Picker cleanup, and real-Chrome verification requirement.

## Design Notes

Preloading alone is insufficient because the previous one-click design asks the browser to open both the Picker placeholder and GIS OAuth popup from one gesture. The MVP deliberately uses two user actions. A post-MVP backlog story will evaluate alternatives such as a code-model redirect or other supported browser flow, but may not commit to token persistence or backend expansion without separate approval.

## Verification

**Commands:**

- `pnpm --filter web test -- use-google-photos-picker-hook.test.tsx home.test.tsx projects-phase3.test.tsx` -- expected: hook and both user entry paths pass two-step flow coverage.
- `pnpm --filter web lint` -- expected: no lint errors.
- `pnpm --filter web typecheck` -- expected: strict TypeScript passes.
- `pnpm --filter web format:check` -- expected: changed web files are formatted.
- `pnpm check:docs` -- expected: delivery documentation remains consistent.

**Manual checks:**

- In Chrome at `http://localhost:3000`, Connect Google Photos opens only OAuth; after success, the separate Select from Google Photos action opens only the Picker. Closing or blocking either popup produces the expected calm outcome.

## Suggested Review Order

**Popup and authorization lifecycle**

- Start with the explicit preload, authorization, expiry, and Picker gesture boundaries.
  [`useGooglePhotosPicker.ts:460`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L460)

- Expired access clears authorization while retaining best-effort session cleanup.
  [`useGooglePhotosPicker.ts:607`](../../apps/web/app/hooks/useGooglePhotosPicker.ts#L607)

**User-facing state transitions**

- Home routes Preparing, Retry, Connect, then Select through one clear action.
  [`page.tsx:61`](../../apps/web/app/page.tsx#L61)

- Saved projects mirror the same two-gesture contract and accessible states.
  [`run/page.tsx:154`](../../apps/web/app/projects/%5Bid%5D/run/page.tsx#L154)

- Shared copy keeps session-only access and popup guidance consistent.
  [`trustCopy.ts:35`](../../apps/web/app/copy/trustCopy.ts#L35)

**Regression evidence and follow-up**

- Hook tests exercise script failure, retry, separate gestures, and cleanup after expiry.
  [`use-google-photos-picker-hook.test.tsx:194`](../../apps/web/tests/use-google-photos-picker-hook.test.tsx#L194)

- Chromium smoke proves the deterministic Connect then Select path end to end.
  [`mvp-smoke.spec.ts:13`](../../tests/e2e/mvp-smoke.spec.ts#L13)

- Post-MVP research is explicitly backlog-only with security review boundaries.
  [`TASK_BACKLOG.md:771`](../../docs/delivery/TASK_BACKLOG.md#L771)
