# MVP Smoke Test Plan

The MVP smoke test proves the golden path is usable enough for review. It is not a substitute for full CI or manual demo verification.

## Golden path

- Home page loads.
- No broken visible nav/actions appear.
- Primary CTA works.
- Picker/dev/sample path can start a scan or intentionally explains unavailable state.
- Run/progress screen renders.
- Results/review screen renders grouped output.
- Confidence labels are `High`, `Medium`, or `Low` only.
- Manual guidance is visible.
- No automatic deletion or destructive copy appears.
- Settings/Profile are either working or intentionally unavailable.

## Required assertions

- No similarity percentages are visible.
- No write-scope Google Photos action is requested or implied.
- No recovery/trash/recently-deleted flow is promised.
- User can stop or navigate without hidden destructive assumptions.
- Known limitations are visible where the user needs them.

## Evidence to record

- Command used to run the smoke test.
- Browser/device viewport used.
- Pass/fail result.
- Screenshot or trace path when UI changed or a failure is found.
- Follow-up task IDs for failures.
