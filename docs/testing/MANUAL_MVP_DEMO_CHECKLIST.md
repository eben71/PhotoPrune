# Manual MVP Demo Checklist

Use this checklist for the human Chrome demo required before MVP exit. It proves the real authenticated Google Photos path; it does not replace `pnpm smoke:mvp`, and `pnpm smoke:mvp` does not replace this checklist.

Record the completed checklist result in `docs/delivery/ITERATION_LOG.md`. Store required screenshots or notes under `docs/delivery/artifacts/<task-id>/` for every completed demo, including passing demos.

## Result Summary

- Demo date:
- Runner:
- Browser: Chrome
- Environment or branch:
- Overall result: Pass | Fail | Blocked
- Evidence folder:
- Iteration log entry:
- Follow-up task IDs:
- Residual risk:

## Prerequisites

- [ ] Chrome is used for the full demo.
- [ ] The app is running from the branch/environment being evaluated.
- [ ] A real Google account can complete the authenticated flow.
- [ ] Google Photos access remains read-only; no write scope is requested.
- [ ] Real Google Photos content exists for Google Photos Picker API session selection.
- [ ] The runner knows where screenshots, console notes, and failure artifacts will be stored.
- [ ] The current `docs/product/MVP_EXIT_CRITERIA.md` and `docs/testing/MVP_SMOKE_TEST_PLAN.md` have been reviewed.

## Start And Authentication

- [ ] Home screen loads without broken visible actions.
- [ ] Primary scan/review action is visible and works.
- [ ] Google login completes with a real account.
- [ ] The consent or picker flow does not request Google Photos write scope.
- [ ] Full-library scanning is not offered or implied.
- [ ] Known limitations are visible before they can surprise the user.

Fail the demo if authentication requires a write scope, implies full-library scanning, or relies on fake/sample data for MVP readiness.

## Source Selection

Run or explicitly record the result for the MVP source type.

| Source type            | Expected result                                                                                                                            | Result                | Evidence / notes |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ---------------- |
| Picker-selected photos | App creates a Google Photos Picker API session through `v1.sessions`, lists selected real media through `v1.mediaItems`, and starts a scan | Pass / Fail / Blocked |                  |

If Picker-selected photos are unsupported, mark the demo `Blocked` or `Fail` and create or reference a follow-up task. Do not treat unsupported source behavior as passing MVP evidence.

After PP-024, arbitrary single-album and multiple-album source modes are not required MVP pass evidence unless a later approved task documents a supported read-only Google Photos path. Raw album ID entry, fixture or paged test data, backend source metadata, app-created-data-only Library API reads, legacy Google Picker `DocsView(DOCS_IMAGES)` selection without `v1.sessions` creation and `v1.mediaItems` listing evidence, and code inspection do not count as passing evidence for the MVP source path.

## Scan And Progress

- [ ] Scan starts from the selected real Google Photos content.
- [ ] Progress or run status is visible while work is in progress.
- [ ] The user can stop, leave, or recover from expected navigation without hidden destructive assumptions.
- [ ] In-session timeout behavior is checked where technically possible.
- [ ] Current-session selections survive an in-session timeout where technically possible.
- [ ] Browser-close restart behavior is documented as acceptable if the session cannot resume after close.

Record any timeout or session persistence gap against PP-015 or a new follow-up task.

## Grouped Review

- [ ] Results render grouped duplicate or near-duplicate candidates from real Google Photos content.
- [ ] The review unit is the group, not a raw individual-photo cleanup queue.
- [ ] Confidence appears only as `High`, `Medium`, or `Low`.
- [ ] Review explanations are plain English and help identify identical or similar photos, such as shared people or backgrounds.
- [ ] No similarity percentages are visible unless the dedicated product-policy task has changed the rule and updated trust docs/tests together.
- [ ] The user remains in control of each group.

## Manual Cleanup Guidance

- [ ] Manual cleanup guidance is visible and clear.
- [ ] Selected cleanup candidates expose a link or reference to the exact Google Photos item.
- [ ] Exact-photo links or references open Google Photos in a new tab when available.
- [ ] No in-app delete option is offered for Google Photos items.
- [ ] No automatic deletion is offered, implied, or hidden.
- [ ] No recovery, trash, recently-deleted, deletion-safety, or storage-reclaimed claim appears unless that behavior is actually implemented and documented.

Record missing exact-photo link-out behavior against PP-016 or a new follow-up task.

## Settings And Profile

- [ ] Settings is reachable through the visible app navigation.
- [ ] Account/Profile is reachable where the MVP UI exposes it.
- [ ] Settings and Account/Profile show only required MVP account details and settings.
- [ ] Non-required account/settings items are hidden or clearly unavailable.
- [ ] Settings/Profile copy does not imply unsupported account management, billing, deletion recovery, or Google Photos write actions.

## Trust Guardrails

Confirm each forbidden item is absent. Fail the demo and record the exact location if any item is present.

| Forbidden item                                                                                                                    | Confirmed absent | If present, evidence / follow-up task |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------- |
| Similarity percentages or numeric confidence without an approved policy change                                                    | [ ]              |                                       |
| Automatic deletion or hidden destructive action                                                                                   | [ ]              |                                       |
| In-app Google Photos deletion                                                                                                     | [ ]              |                                       |
| Google Photos write-scope action                                                                                                  | [ ]              |                                       |
| Full-library scanning claim or affordance                                                                                         | [ ]              |                                       |
| Unsupported recovery, trash, recently-deleted, deletion-safety, storage-reclaimed, privacy, sharing, storage, or local-only claim | [ ]              |                                       |
| Hypey or theatrical AI copy that undermines trust                                                                                 | [ ]              |                                       |

## Evidence To Capture

- [ ] Screenshot of home/start state.
- [ ] Screenshot or note for Google login/consent showing read-only scope, with personal account identifiers, OAuth details, and unrelated account information redacted.
- [ ] Screenshot or note for the Picker-selected photos source result.
- [ ] Screenshot of scan progress.
- [ ] Screenshot of grouped review results.
- [ ] Screenshot or note for exact-photo Google Photos link-out/reference behavior.
- [ ] Screenshot of Settings.
- [ ] Screenshot of Account/Profile, if visible in the MVP UI.
- [ ] Follow-up task IDs for every failed or blocked item.
- [ ] Final pass/fail/blocker summary in `docs/delivery/ITERATION_LOG.md`.

## Completion Rule

The manual MVP demo passes only when every required section above is checked as passing, the required Picker-selected source mode passes, and evidence is recorded. Follow-up task IDs can cover discovered non-blocking gaps only; they cannot convert a failed required source mode, trust guardrail, scan/review path, or exact-photo cleanup path into a passing demo. Future product scope changes must update this checklist before using a changed source-mode definition as pass evidence.
