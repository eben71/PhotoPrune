# Manual MVP Demo Checklist

Use this checklist before declaring MVP ready. Record evidence in `docs/delivery/ITERATION_LOG.md`.

## Demo setup

- [ ] Browser is Chrome.
- [ ] User logs in with an actual Google account.
- [ ] Google Photos access is read-only.
- [ ] No write-scope Google Photos permission is requested.
- [ ] Demo uses real live Google Photos album or picker content, not fake datasets.

## Demo script

- [ ] Log in.
- [ ] Select one album.
- [ ] Select multiple albums or confirm the current build clearly limits this path.
- [ ] Select picker-selected photos or confirm the current build clearly limits this path.
- [ ] Run scan.
- [ ] Confirm progress is visible.
- [ ] Review grouped identical or similar photos.
- [ ] Confirm review explains why photos are identical or similar in plain English, such as shared people or backgrounds.
- [ ] Mark review decisions.
- [ ] Confirm current-session selections survive an in-session timeout where technically possible.
- [ ] Open the selected photo link or reference in a new tab.
- [ ] Confirm the exact photo opens in Google Photos.
- [ ] Remove photos manually in Google Photos, outside PhotoPrune.

## Trust checks

- [ ] No automatic deletion is offered or implied.
- [ ] No in-app delete option is shown for Google Photos items.
- [ ] No full-library scan is offered or implied.
- [ ] No write-scope action is requested or implied.
- [ ] No unsupported recovery, trash, recently-deleted, storage-reclaimed, local-only, sharing, or privacy guarantee is claimed.
- [ ] Confidence is shown only as `High`, `Medium`, or `Low`.
- [ ] Numeric similarity percentages are not shown unless the product-policy decision has been explicitly resolved and documented.
- [ ] Settings/Profile show only required MVP account details and settings, or hide non-required items.

## Evidence to record

- [ ] Date of demo.
- [ ] Browser and viewport.
- [ ] Account type used, without recording secrets or private account details.
- [ ] Album or picker path used, without recording sensitive photo details.
- [ ] Pass/fail result for each script step.
- [ ] Screenshots or trace links for failures.
- [ ] Follow-up task IDs for every blocking issue.
