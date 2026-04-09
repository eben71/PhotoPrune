# Frontend Design Implementation Note (v1 trust-first refresh)

Date: 2026-03-22

## What changed
- Replaced the previous global visual layer with an updated trust-first token palette and calmer layout primitives in `apps/web/app/globals.css`.
- Reworked the key user screens to align with the approved design direction:
  - Home / get started (`/`)
  - Analysis in progress (`/run`)
  - Review dashboard (`/results`)
- Updated grouped result rendering so confidence remains band-only (`High`, `Medium`, `Low`) and destructive actions are clearly separated from primary actions.

## What was added
- New shell/nav, hero, card, badge, and button styling utilities in the global stylesheet.
- Updated run/session trust states in the run screen:
  - explicit stop-scan confirmation copy
  - hard-cap visibility copy
- Additional trust/context panels on the results screen for confidence-band interpretation and session-temporary warning.

## Assumptions made
- Existing run/session and API contracts remain source-of-truth; this pass focuses on frontend structure and visual-system adoption.
- The design exports in `docs/Design/v1` are treated as visual direction while copy follows trust guardrails in `AGENT_RULES.md`.
- No backend or persistence behavior changes are introduced.

## Mocked vs integrated
- Integrated:
  - Existing run-session orchestration and polling logic.
  - Existing grouped results rendering from API/session envelope.
- Still mocked/placeholder:
  - Rich image-detail interactions in the redesigned dashboard remain simplified to current API payload fields.
  - Full sidebar/history/settings experiences from the design exports remain represented as lightweight top-nav scaffolding.

## Diagnosis summary (2026-04-08)
- Primary visual source confirmed: the screenshots and exported HTML in `docs/Design/v1` are aligned. The current app diverges materially from that source, especially in shell geometry, navigation treatment, card proportions, and typography scale.
- Trust/source conflicts to preserve:
  - The design exports include copy and actions that overreach current product scope, including destructive framing (`Commit changes`, `Discard others`, `prune the outliers`, storage-reclaim claims, and privacy/local-processing claims not backed by the product truth).
  - I will keep the visual layout and interaction hierarchy where possible, but visible copy must remain within `docs/trust-copy.md` and `AGENT_RULES.md`.
- Layout / structure mismatches:
  - The landing page header uses pill-like nav items and a simplified hero flow instead of the thin glass bar, small nav links, and screenshot-matched bento layout.
  - The review shell currently uses a narrow rail, bordered support card, and page widths that do not match the screenshot shell proportions.
  - The results page is structurally different from the source: summary cards and trust panels are present, but the core review area does not match the two-up group-card composition with the bottom summary/action bar and lower continuation panel.
  - Group cards are implemented as stacked editorial panels rather than the design's side-by-side image/paper composition.
- Spacing / sizing mismatches:
  - Horizontal gutters and max widths are too tight in the shared shell.
  - The landing hero text block is too large and consumes too much width, causing poor line breaks compared with the screenshot.
  - Card radii and internal padding are consistently larger/heavier than the design exports.
  - Vertical section spacing on the landing page does not reproduce the large quiet gaps visible in the screenshots.
- Typography mismatches:
  - Current nav labels, metadata labels, and some card text are too large and too bold.
  - Headline line breaks and max widths differ from the screenshots on landing and results.
  - Several paper-card body styles use higher contrast and larger size than the exported design.
- Color / borders / radius / shadows mismatches:
  - The current implementation uses explicit borders in places where the design system requires tonal separation.
  - The dark surfaces are too uniform; the source uses clearer `surface`, `surface-container-low`, and paper-surface transitions.
  - The glass header/rail effect is flatter than the screenshots, and some panels use stronger border outlines than the source.
- Copy / trust language mismatches:
  - Some current copy is trust-safe but does not match the design placement or cadence.
  - The source copy itself is not fully usable because it introduces unsupported scope claims; the implementation pass will keep trust-safe wording while matching the source hierarchy and density.
- Responsiveness mismatches:
  - The current header/nav compresses badly at desktop widths.
  - Results and group-card layouts are not following the screenshot hierarchy on wide screens, and the shell needs deliberate breakpoint handling so it does not collapse early.

## Proposed approach (2026-04-08)
- Rebuild the shared shell first: top glass bar, side rail, spacing system, surface tokens, and type scale.
- Rework the landing page to mirror the screenshot composition exactly: restrained nav, large left-aligned hero, primary/secondary CTA row, trust line, large paper bento card, stacked side cards, centered closing CTA, and low-contrast footer.
- Rework the run page around the exported two-column progress layout with the white primary progress card, narrow right-side information stack, and screenshot-matched footer alignment.
- Rework the results page around the exported review dashboard structure, adapting the bottom commit bar into a trust-safe review summary/status bar instead of a destructive action.
- Rebuild `GroupCard` to follow the exported paper-card composition and use the `group_detail_refined_trust` export as the detailed interaction reference for layout language and thumbnail/action proportions.
- Keep changes mostly inside existing frontend files and shared tokens to avoid unnecessary architectural drift.

## Design decisions in progress
- The actual repo note path is `docs/frontend-design-implementation-note.md` (singular). I am maintaining this file as the active task log because it is the file referenced by `apps/web/AGENTS.md`.
- Because the design exports conflict with trust constraints, fidelity work will prioritize layout, proportion, spacing, and visual treatment over literal copy reuse.

## Experiments and results
- Compared the live app against the four exported screenshots through Playwright at desktop width.
- Result: the current implementation captures the broad color family but misses the shell proportions, nav treatment, page structure, and most paper-card geometry.

## Trade-offs
- The screenshot review dashboard's destructive commit bar and storage-reclaim metrics cannot be implemented literally without violating current product scope.
- The exported marketing-style copy on landing and summary screens must be softened to match trust-copy guidance, even where the screenshots use stronger promotional language.

## Design decisions (implemented)
- Rebuilt the shared chrome around a fixed glass top bar, left navigation rail, and a bottom mobile rail so the shell proportions follow the screenshots more closely on desktop while still holding together on smaller screens.
- Shifted the visual system to the exported dark-slate plus warm-paper palette, using tonal separation and ambient shadows instead of explicit borders for the main content surfaces.
- Reworked the landing page into the screenshot bento composition rather than the previous trust-card stack: large editorial hero, CTA row, trust line, paper feature panel, stacked side panels, then the centered closing CTA.
- Reworked the run screen around the white primary progress card and right-side contextual stack shown in the source, while keeping trust-safe start/end-session actions instead of inventing new process controls.
- Reworked the results screen so the review cards now appear before the summary/trust content, matching the review dashboard screenshot hierarchy instead of the previous hybrid review-plus-summary layout.
- Rebuilt `GroupCard` to use the screenshot’s image-left and paper-right composition, confidence pill placement, thumbnail strip, and stacked action area. The expandable detail area remains underneath to preserve current product capability.
- Updated visible copy in `trustCopy.ts` where needed so the design cadence is closer to the source material without reintroducing unsupported claims.

## Experiments and results (final)
- Playwright desktop comparison revealed that Tailwind responsive variants were not taking effect reliably in the running app for the key shell/layout classes.
- Result: replaced those critical breakpoint-dependent layout decisions with repo-local CSS classes and explicit media queries in `app/globals.css`. That stabilized desktop, tablet, and mobile composition across the pages touched in this task.
- Playwright full-page mobile review confirmed no horizontal overflow on the reviewed states and preserved the same trust-first hierarchy in the stacked layouts.
- Functional verification showed the redesigned pages still satisfy the existing render and trust-layer tests once route-level copy expectations were preserved.

## Trade-offs (final)
- The review dashboard screenshot implies commit/finalize actions and storage-reclaim metrics. Those were adapted into a trust-safe status bar and continuation controls because PhotoPrune does not auto-delete or finalize destructive actions in the current scope.
- The source exports use stronger product-marketing phrasing in several places. Where that conflicted with `docs/trust-copy.md`, the final implementation kept the screenshot structure and density but used calmer, scope-safe wording.
- The fixture-backed review screenshot in local QA necessarily used placeholder images for automated verification. The shipped layout is designed to match the source when populated with real thumbnails from the session payload.

## Final remaining gaps
- The desktop top navigation and some card micro-typography are still slightly looser than the source screenshots, especially in the landing header and review card button text.
- The results route still carries trust-explanation panels below the review flow to preserve required trust copy and test coverage, even though the primary review screenshot is more minimal.
- The existing app does not have a dedicated session-summary route equivalent to the exported `session_summary_refined_trust` screen, so that export informed token and surface treatment rather than a one-to-one route implementation in this pass.

## Remaining mismatch summary (targeted follow-up, pre-edit)
- The landing header is still off in three ways relative to `home_get_started_refined_trust`: the brand/nav cluster is too compressed against the left edge, the nav labels sit too high inside the 64px bar, and the right profile affordance does not align to the same visual rhythm as the source.
- The hero block is wider and visually louder than the source. The current line wrapping turns the headline into a three-line wall of text instead of preserving the screenshot's controlled break after `declutter`, and the subcopy/CTA cluster sits too low with insufficient vertical breathing room.
- The CTA row is materially undersized because the `px-8`, `py-4`, and related utility classes are not taking effect reliably in the current build. That leaves the buttons with near-browser-default padding, making them visually wrong and reducing the clickable target area enough to feel inconsistent.
- The main paper feature card is too tall in the text region, and the preview area/card footer composition does not yet match the screenshot's proportions. The right-side cards are also too tall, with icon/title placement and text alignment drifting from the source.
- The landing route still carries the closing CTA and footer correctly, but their spacing is looser than the screenshot and the mobile/tablet presentation drifts earlier than intended.

## Suspected causes
- Tailwind utility generation is incomplete or unreliable for several standard spacing/size utilities on this route (`px-8`, `py-4`, `text-sm`, `mt-36` were absent in live stylesheet inspection), so the page currently depends on classes that are present in markup but not applied in CSS.
- Because those utilities are missing, button sizing, CTA spacing, footer spacing, and some header offsets fall back to browser defaults or partial styling, creating both visual mismatch and smaller-than-designed hit targets.
- The landing layout still leans on generic utility composition instead of the repo-local media-query classes already used elsewhere in this pass, so desktop/tablet/mobile proportions are not controlled tightly enough for fidelity work.
- The right-side card heights come from `flex-1` plus generous padding rather than fixed screenshot-like proportions, causing the stack to stretch taller than the exported design.

## Proposed fixes
- Move the remaining landing-critical geometry into explicit CSS classes in `apps/web/app/globals.css`: header inner spacing, hero width/gaps, CTA row/button sizing, bento panel padding, right-card proportions, and bottom CTA spacing.
- Tighten the landing headline width and introduce explicit break control so desktop wraps closer to the screenshot while tablet/mobile still stack cleanly.
- Replace the current CTA utility mix with stable landing-specific button classes that enforce correct height, padding, gap, and alignment independent of Tailwind utility generation.
- Reduce the main feature-card text block height, tune the preview height, and give the side cards explicit minimum heights/padding so the bento stack better matches the source.
- Verify landing responsiveness at desktop, tablet, and mobile using Playwright screenshots and only keep sections present in the current design state.

## Interaction bug hypotheses
- The primary reported reliability issue is likely not a dead handler: the landing CTA handlers respond in the live app, but the computed button hit areas are only about 28px tall because missing padding utilities collapse the controls to almost text-height targets.
- A secondary risk is viewport-dependent obstruction near the lower page on mobile, where the fixed bottom navigation can overlap the final CTA region if spacing is not reserved explicitly.
- The follow-up pass should still re-check for overlay interference with `elementFromPoint`, `pointer-events`, `z-index`, keyboard activation, and disabled/loading state behavior after the CTA sizing/layout fix lands.

## Decisions made (targeted follow-up, implemented)
- Kept the landing page structure intact and limited the follow-up to the screenshot-specific gaps: shared header geometry, hero rhythm, CTA sizing, bento card proportions, and footer/closing CTA spacing.
- Moved the landing page's critical geometry out of fragile utility-only classes and into explicit CSS classes in `apps/web/app/globals.css`. This was necessary because the live stylesheet was missing several standard utility classes that the route depended on for spacing and sizing.
- Reworked the shared header through `glass-header`, `header-inner`, `header-brand-cluster`, and related classes so the bar is reliably fixed full-width and the inner spacing matches the screenshot more closely across desktop and mobile.
- Reworked the landing hero and bento internals with explicit classes (`home-main`, `home-hero`, `home-cta-row`, `home-paper-*`, `home-side-card*`) so the headline wrapping, button dimensions, card padding, and right-column proportions match the source more closely without introducing new layout ideas.

## Experiments tried and results
- Live DOM/style inspection in Playwright showed the main reliability problem was real but not caused by stale React handlers. Instead, the route was missing utility-generated CSS for several core classes (`px-8`, `py-4`, `text-sm`, `mt-36`, plus fixed-position layout utilities on the header).
- Result: the primary CTA had only about a 28px-tall hit area before the fix, and the header itself collapsed to content width on mobile because `fixed inset-x-0 top-0 h-16` were not taking effect reliably.
- After moving the landing-critical spacing and sizing into repo-local CSS classes, the primary CTA, secondary CTA, and bottom CTA all render as roughly 55px to 57px tall targets and behave consistently in Playwright with mouse and keyboard activation.

## What fixed the button issue
- The concrete fix was not changing the click handlers. The root issue was collapsed geometry from missing utility CSS, which made the buttons too small and caused the header shell to mis-size.
- The follow-up pass fixed this by giving the CTAs explicit dimensions and padding through `home-primary-cta`, `home-secondary-cta`, and `home-bottom-button`, and by making the header/frame positioning explicit in `glass-header` and `header-inner`.
- Post-fix Playwright verification confirmed:
  - button centers resolve to the actual button/link elements through `document.elementFromPoint`
  - `pointer-events` remain `auto`
  - mouse activation works for the top CTA, secondary anchor CTA, and bottom CTA
  - keyboard activation works with `Enter` on the top CTA and anchor CTA, and `Space` on the bottom CTA
  - no invisible overlay blocks interaction in the tested desktop and mobile viewports

## Remaining visual gaps after follow-up
- The landing page is materially closer to `home_get_started_refined_trust`, but the desktop hero still runs slightly larger and denser than the export in the first viewport fold.
- The right-side cards are now proportionally closer, though their copy remains trust-constrained and therefore slightly denser than the literal source export.
- The bottom CTA and footer are aligned to the screenshot structure, but the screenshot still uses slightly more negative space around the final CTA group than the current trust-safe implementation.
