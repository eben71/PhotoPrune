# MVP Alignment Questionnaire

Product owner: complete `TBD` answers before declaring MVP exit.

Status note: This questionnaire records original product-owner alignment input. PP-024 supersedes the album-specific source-scope answers for MVP pass evidence: the current MVP source mode is real Google Photos Picker-selected content, while arbitrary existing user-library single-album and multiple-album source modes are not MVP pass evidence unless a later approved task documents a supported read-only Google Photos path.

## MVP user

- Inferred: People reviewing duplicate or near-duplicate photos selected from Google Photos.
- Answer: The MVP user is me. I want to use PhotoPrune on my personal library to cull photos and regain space. I am hoping that, by doing that, I can find the value add to sell to other people.

## MVP promise

- Inferred: PhotoPrune helps users review grouped duplicate/near-duplicate candidates and decide manually what to keep.
- Answer: Offer an easy way for users to group and review similar and duplicate photos so they can reduce their photos and save money.

## Primary workflow

- Inferred: Start from home, choose picker/dev/sample-backed data according to implementation, run scan, review grouped results, follow manual cleanup guidance.
- Answer: The required data path for demo and launch is real Google Photos from my authenticated library flow. Even though it is MVP, I want to be able to actually use the app to start filtering my photos, so the MVP must still be practically usable.

## Must-have screens

- Inferred: Home, scan/start, run/progress, results/review, manual guidance/limitations.
- Answer: Project history is nice to have. For MVP, it is not a show-stopper if we cannot retrieve and continue a scan. Only store required data to help with functionality.

## Deliberately out-of-scope screens

- Inferred: Full account/settings system, recovery/trash/recently-deleted, full-library scanning, automatic deletion.
- Answer: Basic account settings required for MVP functionality are in scope. The rest of the inferred items can be out of scope for MVP.

## Settings/account decision

- Inferred: Current Settings/Profile affordances need a clear MVP decision.
- Answer: Only show the required settings and account details. The rest can be not implemented or hidden until we need them.

## Demo path

- Inferred: Demo must prove a group-based review session without destructive assumptions.
- Answer: Log in with an actual Google account and access a real photo album. We do not want to demo with fake datasets, but actually use the real live photo album content.
- Answer: The MVP demo browser is Chrome.
- Answer: The demo script is: log in, select album, run scan, review groups, mark decisions, and follow cleanup guidance.
- Needs resolution: The review step has to include ways to identify identical or similar photos based on AI type analysis, such as explaining similarity due to the background or people in the photos. The example of showing `x% similarity` conflicts with the current repo guardrail that says not to show similarity percentages.

## Trust and safety claims

- Inferred: No auto-delete, no similarity percentages, no write-scope Google Photos actions, no unsupported recovery/deletion-safety/local-only/privacy/storage-reclaim claims.
- Answer: Trust should basically be an authenticated secure flow, no auto-delete, no options to delete images, no stored or shared images, and no write-scope into the Google library. We can add to this as we develop the MVP if we find anything that might concern an end-user.
- Needs resolution: The current repo guardrails avoid similarity percentages, but the product owner sees similarity percentage as a key aspect for helping a person make a decision.

## Google Photos scope

- Inferred: Picker-selected and album/set-scoped ingestion; no current full-library scanning or write scopes.
- Answer: MVP requires read-only Google Photos scope. Concentrate on single albums, multiple albums, and picker-selected photos for MVP. No full-library scan.

## Data/persistence expectations

- Inferred: Phase 3 docs describe projects, saved scans, scan history, persisted review state, diffs, retries, and resumable checkpoints.
- Answer: MVP persistence is session based only. Store anything required to continue the current scan to completion. Previous scan history can be avoided for MVP. If the session times out, we should allow the user to continue if possible. In the current session, if the user made selections, those should still be available after a timeout in the same session. If the user closes the browser, restarting the scan is acceptable for MVP.

## Manual cleanup guidance

- Inferred: Guidance must be clear, manual, and non-destructive.
- Answer: The user should have a link or reference to find the exact selected photo or photos in Google Photos. If the user clicks the link, that photo should open in a new tab in Google Photos.

## Pricing/freemium assumptions

- Answer: For MVP, focus on functionality first, so it is free because I will be the user. Revisit pricing, limits, freemium policy, and billing UI when we start adding users.

## Launch readiness

- Inferred: Requires MVP smoke, full CI, manual demo checklist, and resolved visible broken actions.
- Answer: MVP is ready if I am able to log in, scan albums, and identify identical and similar photos. I should be able to navigate successfully to photos in Google Photos and remove them manually.

## Success criteria

- Inferred: User can complete a safe review session with grouped results and clear limitations.
- Answer: MVP is ready if I am able to log in, scan albums, and identify identical and similar photos. I should be able to navigate successfully to photos in Google Photos and remove them manually.

## Known frustrations

- Inferred: Phase 3 marked complete but app is not solid/usable enough; Settings/Account affordances are confusing or broken; agent iterations lacked verified product progress.
- Answer: No additional owner frustrations.

## Questions for agent team

- What exact MVP smoke command should become canonical?
- Should CI pnpm version align to `package.json` or be documented as intentional?
- Should Settings/Profile be hidden, disabled, or minimally implemented for MVP?
- Which Phase 3 claims can be demonstrated end-to-end today?
