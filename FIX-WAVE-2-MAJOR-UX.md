# Hbit — Fix Wave 2: Major UX (P1)

**Prerequisites:** Wave 1 must be complete before running this wave.

Run `/frontend-design` to reload the Hbit design context from `.impeccable.md`.

Execute ALL fixes below in order. Each section specifies which skill(s) to invoke.

---

## Fix 1 — Complete Light Theme on All Pages

**Run `/colorize`** with the following targets:

### `css/pages/focus.css`
The Focus page has ZERO light theme support. Every color is hardcoded for dark mode.

- Add `html[data-theme="light"]` overrides for:
  - The timer ring background and stroke colors
  - The ambient glow (should be a soft warm orange glow, not dark)
  - The breathing circle (should use a muted blue-tinted light background)
  - Control button backgrounds (`--panel` equivalent in light)
  - Phase chip (Work/Break) background and text
  - The config pill at the top
- The work phase glow should be `rgba(249, 115, 22, 0.12)` in light mode (not the dark 0.25 version)
- The break phase glow should be `rgba(96, 165, 250, 0.10)` in light mode

### `css/pages/sleep.css`
The Sleep page light theme is partial and broken — hardcoded dark colors in several sections.

- Audit every `background`, `color`, `border-color`, and `box-shadow` in the file
- Replace any hardcoded dark values (e.g. `rgba(255,255,255,0.05)`, `rgba(0,0,0,0.3)`, `#1a1a2e`, `#16213e`) with `html[data-theme="light"]` overrides using existing token variables
- The "Connect your device" section should be redesigned (not removed): give it a cleaner card style with a subtle dashed border, a device icon placeholder, a short "Integrations coming soon" headline in muted text, and remove the "Coming soon" badge chips — replace them with a simple list of planned device names styled as muted tags. This section should look intentional and polished, not abandoned.
- Wind-down checklist cards need light-mode card backgrounds
- Sleep debt stat block needs readable contrast in light mode

### `css/pages/budget.css`
Budget page light theme is minimal — gradient account cards are hardcoded for dark.

- Account card gradients need `html[data-theme="light"]` versions: use lighter, more pastel variants of the same hue (e.g. for amber card: `linear-gradient(135deg, #fef3c7, #fde68a)` with dark amber text)
- Transaction list row backgrounds need light-mode values
- Chart section backgrounds need overrides

### `css/pages/login.css` + `css/pages/signup.css` + `css/auth.css`
Auth pages are always dark regardless of system/user preference.

- Add `@media (prefers-color-scheme: light)` AND `html[data-theme="light"]` overrides for both pages
- The glassmorphism left panel should invert: use a light frosted glass effect (`backdrop-filter: blur(20px); background: rgba(255,255,255,0.6)`)
- Form inputs, labels, and buttons need light-mode readable versions
- The brand mark and tagline should remain readable

After all CSS changes, run `/audit` on each of these pages and confirm theming score improves to 3/4 or better.

---

## Fix 2 — Complete i18n Coverage (All Untranslated Strings)

**Run `/harden`** with the following specific targets:

### `profile.html`
This page has 0% i18n coverage — every string is hardcoded English.

Add `data-i18n` attributes to ALL of the following elements (create the translation keys if they don't already exist in the i18n file):
- Page title / `<h1>` heading
- "Personal Info" section heading
- All form labels: "Full Name", "Username", "Age", "Gender", "Bio"
- Bio placeholder text
- "Your Progress" section heading
- All stat labels in the progress grid
- "Account" section heading
- "Email", "Account Type", "Member Since" labels
- "Save Changes" button
- "Log Out" button
- Any toast/confirmation messages triggered by this page's JS

Also add `data-i18n` to the `<title>` tag using a script that updates `document.title` on language switch.

### `focus.html` + `js/pages/focus.js`
The Focus settings modal is entirely hardcoded English:
- "Work Duration (mins)" → add `data-i18n`
- "Break Duration (mins)" → add `data-i18n`
- "Daily Goal (sessions)" → add `data-i18n`
- "Breathing Pattern" → add `data-i18n`
- All 4 breathing pattern option labels → add `data-i18n`
- "Save Preferences" button → add `data-i18n`
- "completed" label next to session count → add `data-i18n`
- Any hardcoded JS strings in `focus.js` that update the DOM directly

### `plan.html` + `js/pages/plan.js`
The Plan modal and carry-over banner are hardcoded:
- "Schedule Event" modal title → `data-i18n`
- "Start Time" label → `data-i18n`
- "Duration (mins)" label → `data-i18n`
- "Priority" label → `data-i18n`
- "Notes & Links" label → `data-i18n`
- "Add to Itinerary" button → `data-i18n`
- "Bring to today" carry-over banner text → `data-i18n`
- "Clear Schedule" empty state text → `data-i18n`
- Any hardcoded strings in `plan.js` that set `textContent` or `innerHTML` directly

### `sleep.html` + `js/pages/sleep.js`
The help modal and breathing overlay labels are hardcoded:
- All text inside the sleep help modal → `data-i18n` or dynamic i18n via JS
- Breathing overlay "Inhale", "Exhale", "Hold" labels → `data-i18n`
- "4 sec", "7 sec", "8 sec" timing labels in the breathing overlay → `data-i18n`
- Footer "Privacy" and "Terms" links text → `data-i18n`
- "How are you feeling?" cross-module CTA title → `data-i18n`

### `js/core/toast.js`
System toast messages bypass the translation system:
- Find all hardcoded strings like "You're offline", "Back online", "Saved", "Error saving" in `toast.js`
- Replace each with `HBIT.i18n.t('key')` calls
- Add the corresponding keys to both EN and FR translation files if missing

### Verification
After all i18n changes:
1. Switch the entire app to French
2. Navigate through every page
3. Confirm zero visible English-only strings remain (excluding user-entered data)
4. Confirm `{n}`, `{amount}`, `{score}` placeholders are resolved (from Wave 1 fix)

---

## Fix 3 — Normalize Shared Components Across Pages

**Run `/normalize`** with these targets:

### Button sizes — `css/core/components.css` + `css/pages/budget.css`
- All header icon buttons should be `min-width: 40px; height: 40px` with at least `8px` padding
- Budget page header buttons are 34px — bring them up to 40px to match all other pages
- Create a single `.hdr-btn` utility class in `components.css` if one doesn't exist, and replace page-specific button classes that are doing the same thing

### Avatar — `css/core/components.css`
There are 4 different avatar implementations. Consolidate:
- Create one `.hdr-avatar` class: `width: 40px; height: 40px; border-radius: var(--radius-3); object-fit: cover`
- Replace `.hm-avatar`, `.hb-avatar`, `.sl-avatar` usages in their respective CSS and HTML files
- Profile page avatar should use `var(--brand)` for its gradient, not `var(--mind)` (which is the mood module color)

### Modal structure — `css/core/components.css`
At least 6 different modal implementations exist across pages. Create shared base classes:
```css
.modal-overlay { ... }   /* backdrop */
.modal-panel   { ... }   /* the card/panel */
.modal-header  { ... }   /* title + close button row */
.modal-body    { ... }   /* scrollable content area */
.modal-footer  { ... }   /* action buttons row */
```
Page-specific modal CSS should only override colors/sizing on top of these base classes, not redefine structure from scratch.

### `font-weight: 1000` — `css/core/components.css`
Find all instances of `font-weight: 1000` (invalid — DM Sans maxes at 800) and replace with `font-weight: 800`. Check: `.tag`, `.tag-title`, `.empty-main`, `.chev` and any others.

### `color-scheme` — `css/core/tokens.css`
Add to `:root`:
```css
color-scheme: dark light;
```
This ensures native form controls (date inputs, selects, checkboxes) match the active theme.

---

## Fix 4 — Accessibility: Keyboard & Screen Reader Gaps

**Run `/harden`** for accessibility:

### Plan page — `plan.html`
- Calendar strip days are `<div>` elements — replace with `<button type="button">` 
- Each day button needs `aria-label="[Weekday], [Date]"` (e.g. "Monday, April 14")
- Selected day should have `aria-pressed="true"`

### Habits page — `habits.html`
- The contribution heatmap (`<div class="hb-heatmap">` or similar) has no accessible description
- Add `role="img"` and `aria-label="Habit activity over the last 365 days. [X] active days."` to the heatmap container
- Individual heatmap cells don't need labels (mark them `aria-hidden="true"`)

### Habits modal — `habits.html`
- The "Delete" button in the detail modal should be visually distinct from "Edit", "Pause", "Archive"
- Apply a danger style: `color: var(--danger, #ef4444); border-color: var(--danger, #ef4444)` or use an existing danger token
- Add `aria-label="Delete habit permanently"` to the delete button

### Budget + Plan — delete confirmations
- Add a confirmation step before deleting a transaction or plan event
- Pattern: clicking Delete changes the button to show "Are you sure? [Confirm] [Cancel]" inline — no modal needed
- This prevents accidental deletions

---

## Verification Checklist

After completing all Wave 2 fixes:

- [ ] Toggle to light mode — all 11 pages render readably with proper contrast
- [ ] Toggle to French — all pages (including Profile, Focus, Plan, Sleep help modal) are fully translated
- [ ] Tab through the Plan calendar strip with keyboard — all days are focusable and selectable
- [ ] Screen reader announces the habits heatmap descriptively
- [ ] All header buttons are ≥ 40px tap targets across all pages
- [ ] No `font-weight: 1000` remains in any CSS file (search and confirm)
- [ ] Native `<select>` and `<input type="date">` elements visually match the active theme

Run `/audit` on the full app after Wave 2 and confirm overall technical score reaches 15+/20.
