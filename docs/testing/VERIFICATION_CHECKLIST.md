# Verification Checklist

Verifier agents must use this checklist before work is marked done.

- [ ] Acceptance criteria are met.
- [ ] Scope did not expand.
- [ ] No forbidden features from `docs/product/DO_NOT_BUILD.md` were introduced.
- [ ] Google Photos changes keep read-only scope and do not imply full-library scanning.
- [ ] MVP flow changes support or clearly document the real Chrome/authenticated Google Photos demo path.
- [ ] Similarity explanations follow the current policy; numeric percentages are not introduced unless the product-policy task is resolved.
- [ ] Selected-photo cleanup links open or are specified to open exact Google Photos items in a new tab.
- [ ] Tests were added or updated, or the reason they were unnecessary is recorded.
- [ ] Relevant checks from `docs/ai/testing.md` were run.
- [ ] Playwright MVP smoke was run when UI/main flow changed.
- [ ] Manual MVP demo checklist was run or explicitly deferred when MVP readiness is affected.
- [ ] Screenshots were captured when UI changed.
- [ ] Docs were updated.
- [ ] `docs/delivery/TASK_BACKLOG.md` was updated.
- [ ] `docs/delivery/ITERATION_LOG.md` was updated.
- [ ] Follow-up tasks were created for discovered gaps.
- [ ] Residual risk is recorded.
