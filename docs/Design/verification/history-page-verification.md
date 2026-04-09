# History Page Verification

Date: 2026-04-08

## Route captured
- `/`

## Viewport sizes
- Desktop: `1600x1400`
- Tablet: `900x1200`
- Mobile: `390x844`

## Screenshots
- `docs/design/verification/history-page-current-desktop.png`
- `docs/design/verification/history-page-current-tablet.png`
- `docs/design/verification/history-page-current-mobile.png`

## What changed
- Replaced landing-critical utility-only spacing and sizing with explicit CSS classes so the header, hero, CTA row, paper card, side cards, and bottom CTA match the source screenshot more closely.
- Fixed the shared header so it remains full-width and correctly aligned across desktop and mobile.
- Increased CTA hit areas to stable button dimensions and tightened the bento-card proportions to reduce the remaining fidelity gap.

## Interaction verification results
- Primary CTA:
  - Mouse click triggered the expected configured-picker error state in local dev.
  - Keyboard `Enter` triggered the same handler correctly.
- Secondary CTA:
  - Mouse click and keyboard `Enter` both navigated to `#how-it-works`.
- Bottom CTA:
  - Mouse click and keyboard `Space` both triggered the expected configured-picker error state in local dev.
- Overlay/hit testing:
  - `document.elementFromPoint(...)` resolved to the CTA elements after the fix.
  - No blocking overlay or pointer-event conflict was observed in the tested desktop and mobile viewports.

## Remaining known gaps
- Desktop hero typography is still slightly denser than the exported source at the first fold.
- The right-side card copy is trust-safe rather than a literal export match, so its text block density differs slightly from the source.
- The closing CTA/footer spacing is closer than before, but the source still leaves a bit more quiet space around the final CTA group.
