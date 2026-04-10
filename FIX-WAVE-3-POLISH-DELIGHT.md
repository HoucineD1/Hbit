# Hbit — Fix Wave 3: Polish, Delight & Profile Redesign (P2/P3)

**Prerequisites:** Waves 1 and 2 must be complete before running this wave.

Run `/frontend-design` to reload the Hbit design context from `.impeccable.md`.

This wave covers: design system consolidation, delight features, missing micro-interactions, and a full Profile page redesign. Execute in order.

---

## Fix 1 — Design System Consolidation

**Run `/ckm:design-system`** then **`/normalize`** with these targets:

### Spacing tokens — `css/core/tokens.css`
Add a formal spacing scale. Insert after the existing radius scale:
```css
/* Spacing scale */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
--space-8: 48px;
--space-9: 64px;
```
Then migrate the most common hardcoded values across ALL CSS files:
- `padding: 20px` → `var(--space-5)`
- `padding: 16px` → `var(--space-4)`
- `gap: 12px` → `var(--space-3)`
- `margin-bottom: 24px` → `var(--space-6)`
- Focus on `css/core/components.css`, `css/pages/home.css`, `css/pages/habits.css`, `css/pages/mood.css`

### Easing tokens — `css/core/tokens.css`
Add after spacing tokens:
```css
/* Easing */
--ease-spring:  cubic-bezier(0.22, 1, 0.36, 1);
--ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-snappy:  cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-out:     cubic-bezier(0, 0, 0.2, 1);
```
Replace all hardcoded `cubic-bezier(0.22, 1, 0.36, 1)` occurrences across `animations.css`, `home.css`, `habits.css`, `mood.css`, `focus.css` with `var(--ease-spring)`.

### Module color unification — `css/core/tokens.css`
The following module colors are defined inconsistently across multiple files. Establish a single canonical value for each and remove all duplicates:

| Module | Canonical color | Files to fix |
|--------|----------------|--------------|
| Sleep  | `#818CF8` (indigo) | `tokens.css` has `#3aa0ff`, `home.css` has `#60A5FA` — align all to `#818CF8` |
| Mood   | `#A78BFA` (violet) | `tokens.css` has `#7c4dff` — align all to `#A78BFA` |

After fixing: search every CSS file for the old values and replace. Check that dashboard cards, page headers, and charts all show consistent module colors.

### Light theme shadows — `css/core/tokens.css`
Current `--shadow-*` values use black alpha, which looks wrong in light mode. Add inside the `html[data-theme="light"]` block:
```css
--shadow-1: 0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
--shadow-2: 0 2px 4px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04);
--shadow-3: 0 4px 8px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06);
--shadow-accent: 0 4px 14px color-mix(in srgb, var(--brand) 20%, transparent);
```

---

## Fix 2 — Skeleton Loading States Enhancement

**Run `/animate`** to enhance the skeleton states from Wave 1:

- Add a subtle fade-in transition when real content replaces skeletons (opacity 0→1 over 200ms)
- Dashboard weekly summary rings: while loading, show gray concentric rings at 0% progress with a pulsing opacity animation
- Habit heatmap: show a skeleton block the same dimensions as the heatmap grid instead of an empty area

---

## Fix 3 — Habit Completion Confetti

**Run `/delight`** for this feature:

**File:** `js/pages/habits.js` + `js/core/` (new utility)

When ALL habits for today are completed, trigger a celebration:
1. Create a lightweight confetti utility `js/core/confetti.js` — use a canvas overlay, 60 particles, brand colors (`#E63946`, `#34D399`, `#F59E0B`) and module accent colors, 1.5 second duration, auto-removes the canvas
2. The confetti fires once per day — store a flag in `localStorage` with today's date key: `hbit_confetti_[YYYY-MM-DD]` — don't replay if already shown today
3. Pair the confetti with a brief toast: use the i18n key for "All habits complete! 🎉" 
4. Confetti should be opt-out via `prefers-reduced-motion` — if reduced motion is set, show only the toast, skip the canvas animation

---

## Fix 4 — Focus Timer Sound on Completion

**Run `/delight`** for this feature:

**File:** `js/pages/focus.js`

When the Pomodoro work session ends and when the break ends:
1. Use the Web Audio API (no external files needed) to generate a soft completion tone:
   - Work session end: 3-note ascending chime (440Hz → 550Hz → 660Hz), each note 150ms, sine wave, gentle envelope
   - Break end: 2-note descending tone (550Hz → 440Hz) to signal "back to work"
2. Volume should be at 20% by default (not jarring)
3. Add a mute toggle button (🔔/🔕) to the Focus page header — store preference in `localStorage` key `hbit_focus_sound`
4. Add `data-i18n` to the mute button's `aria-label`
5. If the browser blocks autoplay (requires user interaction first), the sound triggers only after the user has interacted with the timer at least once

---

## Fix 5 — Streak Milestone Celebrations

**Run `/delight`** for this feature:

**Files:** `js/pages/habits.js`, `js/pages/home.js`

When a habit's streak reaches a milestone (7, 30, 100 days), trigger a celebration:
1. Show a full-screen modal overlay with:
   - A large animated emoji or icon (🔥 for 7 days, ⚡ for 30 days, 👑 for 100 days)
   - Headline: "X-day streak!" using i18n interpolation with `{n}` for the streak count
   - Subtext: motivational copy (i18n'd) 
   - A "Keep going!" CTA button that dismisses the modal
2. The modal appears once per milestone per habit — store seen milestones in Firestore under the habit document (field: `milestonesShown: [7, 30]`) or in localStorage if Firestore isn't preferable
3. Apply `hbitFadeUp` entrance animation (already in `animations.css`)
4. Pair with confetti (reuse `confetti.js` from Fix 3), respecting `prefers-reduced-motion`

---

## Fix 6 — Missing Micro-interactions

**Run `/animate`** for these small but impactful touches:

### Habit checkbox animation — `habits.js` + `habits.css`
When a habit is checked off:
- The checkbox/check icon should animate: scale from 0 → 1.2 → 1 over 300ms with `var(--ease-snappy)`
- The habit card should briefly flash the module green (`--habit`) as a background pulse (opacity 0.15 → 0 over 400ms)
- The "today" progress counter at the top should animate its number change (brief scale pulse)

### Dashboard metric updates — `home.js`
When Firebase data populates the dashboard cards after loading:
- Number values should count up from 0 to the real value over 600ms using `requestAnimationFrame`
- Only trigger on first load of the session (not on every re-render)

### Scroll-to-top on long mobile pages
Add a floating scroll-to-top button on `mood.html` and `sleep.html`:
- Appears after scrolling 400px down
- Smooth scroll back to top on click
- Small circle button, bottom-right, above the nav bar, using `var(--panel)` background
- Fades in/out with the existing `hbitFadeUp` animation

---

## Fix 7 — Font & Performance Improvements

**Run `/optimize`** on all HTML files:

### Font preloading — all 11 HTML pages
Add to the `<head>` of every page, before the existing Google Fonts `<link>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```
If DM Sans is loaded via `@import` in CSS, move it to a `<link rel="stylesheet">` in the HTML `<head>` with `media="print" onload="this.media='all'"` for non-blocking font load.

### `color-scheme` meta tag — all HTML pages
Add inside `<head>`:
```html
<meta name="color-scheme" content="dark light">
```

---

## Fix 8 — Profile Page Full Redesign

**Run `/arrange`**, then **`/typeset`**, then **`/bolder`**, then **`/harden`** in sequence on `profile.html` + `css/pages/profile-settings.css` + `js/pages/profile.js`.

The profile page is the weakest in the app — visually boring, zero personality, uses the wrong layout component (`topbar` instead of the sidebar header), and has zero i18n. Transform it into a personal achievement dashboard.

### Layout change
- Remove the `topbar` component — replace with the same sticky header pattern used on home.html (with date, page title, and avatar)
- Use the main content layout consistent with other pages (same max-width, same padding system)

### New structure (top to bottom):

**1. Hero card — "Your Space"**
- Large avatar (64px, `border-radius: var(--radius-3)`, gradient using `var(--brand)`)
- User's name as a large heading (font-size: var(--font-size-xl) or larger)
- Username, member-since date as muted subtext
- "Edit Profile" button (secondary style)

**2. Achievement stats grid — 6 cards in a 2×3 or 3×2 grid**
Each card shows:
- Module icon/emoji
- Stat number (large, bold, module accent color)
- Stat label below (muted, smaller)

Stats to show: Total habits tracked, Longest streak, Total sleep logs, Total mood logs, Total budget transactions, Focus sessions completed

Each card should use `data-module` attribute for accent color (same pattern as dashboard cards).

Add a subtle count-up animation when the page loads (reuse from Fix 6).

**3. Personal info form — collapsible section**
- Collapsed by default with a "Edit personal info" toggle
- When expanded: Full Name, Username, Age, Gender, Bio (with character counter)
- "Save Changes" button with spinner state
- All labels must use `data-i18n`

**4. Account section**
- Email (read-only)
- Account type (Google / Email)
- "Change password" link (only shown for email/password accounts)
- "Delete account" option (danger color, requires confirmation)
- "Log out" button

### Visual direction
- Use module accent colors on stat cards (same `.hc-card` feel as dashboard)
- The hero section should feel warm and personal, not like a settings page
- Use `hbitFadeUp` stagger animation on the stat cards on load

### i18n
Every single string on this page must have a `data-i18n` attribute. No hardcoded English. Create all needed keys in both EN and FR translation files.

---

## Fix 9 — Onboarding Help Modals (Copy the Sleep Pattern)

The Sleep page has the best feature in the app: a help modal explaining how Sleep works. Copy this pattern to pages that lack it.

**Run `/delight`** on:
- `habits.html` — add a "?" help button in the header that explains streaks, heatmap, and how habit scoring works
- `budget.html` — add help explaining account types, how transactions work, what the category breakdown shows
- `mood.html` — add help explaining what the 5 bands mean, what sub-dimensions measure, how the weekly insight is calculated
- `focus.html` — add help explaining the Pomodoro technique, what the breathing patterns do, and the session goal
- `plan.html` — add help explaining carry-over, how timeline priority levels work

Each help modal should:
- Be fully i18n'd
- Use the same modal structure from `components.css` (from Wave 2 Fix 3)
- Be triggered by a `?` icon button in the page header (consistent with sleep page)
- Have a close button and be dismissible with Escape key

---

## Fix 10 — Accessibility Final Pass

**Run `design:accessibility-review`** (from your installed Cowork design plugin) on the full app, then apply fixes:

- Add a skip-to-content link on all pages:
  ```html
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ```
  Style it to be visible only on focus (for keyboard/screen reader users)
- Add `aria-label` to all language and theme toggle buttons with translated descriptions (e.g. "Switch to French" / "Switch to light mode")
- All SVG charts that display data (weekly insight bar chart, sleep history calendar, dashboard sparklines) need `role="img"` + descriptive `aria-label`
- Verify focus trap is active on ALL modals (not just habits and mood)

---

## Verification Checklist

After completing all Wave 3 fixes:

- [ ] Complete all daily habits — confetti fires once, toast appears, doesn't repeat same day
- [ ] Reach a 7-day streak on any habit — milestone modal appears with correct animation
- [ ] Focus timer completes — chime plays (if sound enabled), break starts
- [ ] Profile page looks like an achievement dashboard, not a settings form
- [ ] All 5 new help modals open, are fully in French when FR is selected, close with Escape
- [ ] `tokens.css` has spacing scale, easing tokens, and unified module colors
- [ ] No hardcoded `cubic-bezier(0.22, 1, 0.36, 1)` remains in any CSS file
- [ ] Keyboard user can navigate the entire app (Tab, Enter, Escape) without a mouse
- [ ] Run Lighthouse on the deployed app — Performance ≥ 80, Accessibility ≥ 85

Run `/critique` on Profile page specifically and confirm heuristic score improves from 23/40 to at least 30/40.

Run `/overdrive` on the Profile and Dashboard pages as a final polish pass — push the visual quality to its ceiling.
