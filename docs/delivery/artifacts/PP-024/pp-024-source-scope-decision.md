# PP-024 Source Scope Decision

## Decision

Status: Accepted.

- Decision date: 2026-07-02
- Decision source: Product owner approval of PP-024 quick-dev spec in this Codex workflow, recorded in `docs/delivery/ITERATION_LOG.md`.
- Approver: Product owner / MVP user.

MVP source scope shifts to real Google Photos Picker-selected content. Single-album and multiple-album source modes for arbitrary existing user-library albums are not required MVP pass evidence after PP-024.

This decision replaces the earlier MVP source-mode requirement for single albums, multiple albums, and picker-selected photos with one required source mode:

- Picker-selected Google Photos content from a real authenticated Google account, using read-only Picker access.

## Reason

PP-022 found no supported read-only Google Photos API path for PhotoPrune to list and fetch arbitrary existing user-library albums. Current Google Photos documentation directs apps that need user library selection to the Picker API, while Library API album and media listing is limited to app-created content after the 2025 broad-scope removal.

Keeping arbitrary album modes as launch evidence would make MVP exit depend on unsupported Google API behavior. Picker-selected content preserves the product goal: the product owner can choose real Google Photos items, run a scan, review grouped results, and clean up manually outside PhotoPrune without write scope.

## Exact MVP Source Modes

Required for MVP pass evidence:

- Picker-selected Google Photos items selected in Chrome with a real Google account.

Not accepted as MVP pass evidence:

- Raw album ID entry.
- Backend source metadata alone.
- Fixture or paged test data.
- App-created-data-only Google Library API reads.
- Code inspection without a real Chrome run.
- Arbitrary single-album or multiple-album source modes unless a later approved task documents a supported read-only Google Photos path.

## Copy And UX Implications

User-facing MVP copy should describe choosing photos from Google Photos through the picker. It should not promise arbitrary album browsing, full-library scanning, write-scope cleanup, in-app deletion, automatic deletion, recovery, trash, recently-deleted behavior, storage reclaimed, or unsupported privacy/local-only guarantees.

Existing internal `album_set` scope metadata and retry/checkpoint behavior may remain documented as technical capability, but it must not be used as real user-library MVP pass evidence.

## Required Evidence After This Decision

PP-023 or a later PP-014 rerun must record:

- Chrome execution with a real Google account.
- Read-only Google Photos Picker authorization.
- Selection of real Google Photos items through the picker.
- Scan start from the selected real items.
- Grouped duplicate or near-duplicate review results.
- Manual cleanup guidance.
- Exact-photo Google Photos link-out or reference behavior, or PP-016 remains blocking.
- Absence of forbidden trust claims and unsupported destructive actions.

PP-014 remains blocked until the updated manual demo path passes with recorded evidence.
