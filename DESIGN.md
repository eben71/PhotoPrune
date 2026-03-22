# Design System Specification: The Digital Curator

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Digital Curator**. Unlike standard utility apps that feel like cold databases, this system is designed to feel like a high-end, editorial archival tool. It treats user data not as "rows" but as "exhibits."

To break the "template" look common in modern SaaS, we move away from rigid grids and 1px borders. Instead, we embrace **Intentional Asymmetry** and **Tonal Depth**. This system prioritizes "Visual Calm" through expansive breathing room (utilizing the higher ends of our spacing scale) and sophisticated layering. By using high-contrast typography scales and overlapping surface elements, we create an experience that feels custom-built and authoritative.

---

## 2. Colors & Tonal Architecture
The palette is rooted in a deep, desaturated slate base, contrasted by warm, off-white surfaces that mimic the feel of premium cardstock.

### Surface Hierarchy & The "No-Line" Rule
**Rule:** 1px solid borders for sectioning are strictly prohibited. 
Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a `surface-container-low` section should sit directly on a `surface` background to define its edge.

*   **Base Layer:** `surface` (#080e1a) — The deep slate foundation.
*   **The "Paper" Layer:** `inverse-surface` (#f9f9ff) — Used for primary cards and modals to create the "Visual Calm" aesthetic. This warm neutral provides a high-contrast home for content.
*   **Nesting Logic:** Use `surface-container-low` (#0a1323) through `surface-container-highest` (#102546) to create depth. Treat the UI as stacked sheets; an inner container should always be one step higher or lower in the tier than its parent to define its importance without lines.

### The "Glass & Gradient" Rule
Floating elements (sticky headers, navigation rails) should utilize **Glassmorphism**. Apply a semi-transparent `surface-bright` (#112c53) with a `backdrop-blur` of 12px-20px. 

**Signature Texture:** Main CTAs must use a subtle linear gradient from `primary` (#5adace) to `primary-container` (#00504a). This provides a "soul" and professional polish that flat fills lack.

### Confidence Palette
*   **High Confidence:** `primary` (#5adace) — A cool green-teal. Restrict use to success states and "High" bands only.
*   **Medium Confidence:** `secondary` (#e88532) — A muted, sophisticated amber.
*   **Low Confidence:** `tertiary` (#ff7f7d) — A dusty rose, avoiding "alarm red" for a more editorial feel.

---

## 3. Typography: Editorial Authority
We use **Manrope** exclusively. Its geometric yet approachable structure provides a premium, modern feel.

*   **Display (lg/md):** Used for large, impactful moments. Tracking should be set to `-0.02em` to feel tighter and more bespoke.
*   **Headline (lg/md):** High contrast is key. Use `on-background` (#dbe5ff) against the deep slate backgrounds. Headlines should feel "lofty" with generous `16` (5.5rem) top margins.
*   **Title & Body:** For the "Visual Calm" effect on white cards, use `inverse-on-surface` (#4f5563) for body text to reduce harsh contrast and eye strain.
*   **Labels:** Use `label-sm` (0.6875rem) in `all-caps` with `+0.05em` letter spacing for technical metadata or confidence markers.

---

## 4. Elevation & Depth: Tonal Layering
Traditional structural lines are replaced by **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural "lift" that mimics physical paper on a desk.
*   **Ambient Shadows:** For floating modals, use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(8, 14, 26, 0.12)`. The shadow color must be a tinted version of the surface color, never pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` (#35486b) at **15% opacity**. 100% opaque borders are a failure of the design system.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `md` (0.375rem) roundedness. 
*   **Secondary:** Ghost style. No background, `outline-variant` at 20% opacity. Text in `primary`.
*   **Interaction:** On hover, primary buttons should scale to `1.02` with a subtle increase in shadow spread.

### Cards & Lists
*   **Forbid dividers.** Use `3` (1rem) or `4` (1.4rem) of vertical white space to separate list items. 
*   **Photo Cards:** Use the `xl` (0.75rem) roundedness for image containers. Information overlays should use a `surface-container-lowest` (#000000 at 40% opacity) glass blur at the bottom of the card.

### Confidence Bands
*   Vertical 4px bands placed on the far left of a card. 
*   Colors must strictly follow the High (Teal), Medium (Amber), and Low (Dusty Rose) definitions to ensure the user can "scan" confidence scores without reading numbers.

### Sticky Navigation
*   Must use the Glassmorphism rule. 
*   High-contrast `on-background` (#dbe5ff) icons to ensure visibility against the blurred slate background.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins (e.g., more space on the left than the right) to create an editorial, magazine-like feel.
*   **Do** use `20` (7rem) spacing for major section breaks to allow the user's eyes to rest.
*   **Do** lean into the "Warm Neutral" of the `inverse-surface` for all data-heavy workspaces.

### Don't
*   **Don't** use 1px borders to separate content. Use background color shifts.
*   **Don't** use the `primary` green for anything other than "High Confidence" or "Success." It is a precious resource.
*   **Don't** use standard drop shadows. If it doesn't look like ambient light, it doesn't belong.
*   **Don't** cram content. If a screen feels busy, increase the spacing scale by two increments.