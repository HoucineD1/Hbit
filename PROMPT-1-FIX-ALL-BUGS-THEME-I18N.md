# PROMPT 1 — Fix Every Bug, i18n Gap, Theme Issue, and Responsiveness Problem in Hbit

> **Goal:** After this prompt runs, the app has ZERO bugs, ZERO broken UI, ZERO hardcoded English, ZERO light-theme issues, and works perfectly on every screen size. This is the "make it work flawlessly" prompt.

---

## MANDATORY: Load Context First

1. Run `/frontend-design` — load or create `.impeccable.md` with this context:
   - **App:** Hbit — all-in-one personal growth dashboard (Habits, Sleep, Mood, Budget, Focus, Plan)
   - **Stack:** Vanilla HTML/CSS/JS + Firebase (Auth + Firestore), no framework, no build tools
   - **Brand:** `#E63946` red, dark theme default, bilingual EN/FR
   - **Audience:** 18–35, mobile-first, personal coach feel — warm, modern, motivating. NOT corporate. NOT clinical.
   - **Design tokens:** `css/core/tokens.css`
   - **Module colors:** Habits=#34D399, Budget=#F59E0B, Sleep=#818CF8, Mood=#A78BFA, Focus=#F97316, Plan=#22D3EE
2. Run `/ckm:design-system` — audit the full token architecture

Then execute EVERY fix below. Do NOT stop between sections. Verify each fix works before moving on.

---

## PHASE 1: CORE SYSTEM FIXES (affects every page)

### 1.1 — Fix i18n Interpolation Bug
**File:** `js/core/i18n.js`

Read the full file. The `t()` function must support interpolation. Find the translation lookup and ensure:
- After resolving the string, apply: `str.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? \`{${key}}\`)`
- The function accepts optional params: `t(key, params = {})`
- Test mentally with 5 keys: any using `{n}`, `{amount}`, `{score}`, `{count}`, `{name}` must resolve correctly in BOTH EN and FR

Also fix:
- Line ~1755: Language toggle label "FR"/"EN" is hardcoded — use i18n keys `i18n.switchToFR` / `i18n.switchToEN` or at minimum keep it but ensure it's accessible
- Verify `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria-label` all work with interpolation too

### 1.2 — Fix Sidebar Architecture (ALL 9 App Pages)
**File:** `focus.html` has a FULL hardcoded sidebar (100+ lines of HTML). Other pages should be using `js/core/sidebar.js` injection but verify ALL of them.

**Step 1:** Check every app page (home, habits, sleep, mood, budget, focus, plan, profile) for their sidebar implementation:
- If the page has a FULL hardcoded `<nav class="sb">` with complete menu items inside → replace with the empty placeholder: `<nav class="sb" aria-hidden="true" aria-label="Main navigation"></nav>`
- If the page already has the empty placeholder → verify it works

**Step 2:** Verify `sidebar.js`:
- Read `js/core/sidebar.js` — confirm it injects the full nav HTML into the empty `<nav class="sb">` placeholder
- Confirm it reads the current page filename and applies `aria-current="page"` to the correct nav item
- Confirm it preserves keyboard shortcuts (Escape, Ctrl+B) and swipe gesture logic
- Ensure `<script src="js/core/sidebar.js"></script>` is present in ALL 9 pages

**Step 3:** Test by mentally tracing: load focus.html → sidebar.js fires → nav HTML injected → Focus nav item highlighted. Do the same for home, habits, budget.

### 1.2b — Add Skeleton Loading States to ALL Pages

**CRITICAL: This was P0 in the audit.** When Firebase data loads, users see dashes and zeros with no indication data is coming.

**Step 1 — Add skeleton CSS to `css/core/components.css`:**
```css
@keyframes hbitSkeleton {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    var(--panel) 25%,
    color-mix(in srgb, var(--panel) 70%, var(--text)) 50%,
    var(--panel) 75%
  );
  background-size: 200% 100%;
  animation: hbitSkeleton 1.4s ease infinite;
  border-radius: var(--radius-2);
  color: transparent !important;
  pointer-events: none;
  user-select: none;
}
.skeleton * { visibility: hidden; }
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background: var(--panel); }
}
html[data-theme="light"] .skeleton {
  background: linear-gradient(90deg,
    var(--panel) 25%,
    color-mix(in srgb, var(--panel) 60%, var(--border)) 50%,
    var(--panel) 75%
  );
  background-size: 200% 100%;
}
```

**Step 2 — Dashboard (`home.js`):**
- Before Firebase data resolves, add class `skeleton` to each `.hc-card` metric value and mini-chart area
- Remove `skeleton` class once data populates each card
- Weekly summary rings: show muted gray placeholder rings while loading
- Skeleton-to-content: fade-in transition (opacity 0→1 over 200ms)

**Step 3 — Habits (`habits.js`):**
- Show 3 skeleton `.hb-card` placeholders while habits load from Firebase
- Replace with real cards once data resolves
- If no habits after load: show existing empty state

**Step 4 — Budget (`budget.js`):**
- Account card balance values: skeleton until data arrives
- Transaction list: show skeleton rows while loading
- KPI stats: skeleton while calculating

**Step 5 — Sleep (`sleep.js`):**
- Sleep debt stat, tonight's bedtime/wake values: skeleton while loading

**Step 6 — Mood (`mood.js`):**
- Streak counter and weekly insight chart: skeleton while loading

**Step 7 — Plan (`plan.js`):**
- Timeline: show 2–3 skeleton event cards while loading

### 1.3 — Fix All Invalid font-weight Values
**Run `/normalize`**

DM Sans maxes at weight 800. Search ALL CSS files for `font-weight` values above 800.

Files known to have violations:
- `css/core/base.css` — `.b { font-weight: 900 }` → change to `800`
- `css/core/components.css` — `.tag`, `.tag-title`, `.empty-main`, `.empty-sub` use 800-900 → cap at `800`
- `css/core/topbar.css` — `.brand .t`, `.brand .s`, `.btn`, `.avatar` use 800-900 → cap at `800`
- `css/pages/home.css` — multiple 800+ instances → cap at `800`
- `css/pages/habits.css` — multiple 800+ instances → cap at `800`
- `css/pages/profile-settings.css` — `font-weight: 900` → `800`

Do a global search: `grep -rn "font-weight.*\(9\|1000\)" css/` and fix every match.

### 1.4 — Add color-scheme Declaration
**File:** `css/core/tokens.css`

Add to `:root`:
```css
color-scheme: dark light;
```

Add to `<head>` on ALL HTML pages:
```html
<meta name="color-scheme" content="dark light">
```

This makes native form controls (date pickers, selects, checkboxes) match the active theme.

### 1.5 — Add Spacing Tokens
**File:** `css/core/tokens.css`

Add after existing tokens:
```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-7: 32px;  --space-8: 48px;  --space-9: 64px;
```

Then migrate the MOST COMMON hardcoded values in these files:
- `css/core/components.css`, `css/core/layout.css`, `css/core/base.css`
- `css/pages/home.css`, `css/pages/habits.css`, `css/pages/mood.css`, `css/pages/plan.css`

Replace: `padding: 20px` → `var(--space-5)`, `padding: 16px` → `var(--space-4)`, `gap: 12px` → `var(--space-3)`, etc.

### 1.6 — Add Easing Tokens
**File:** `css/core/tokens.css`

Add:
```css
--ease-spring:  cubic-bezier(0.22, 1, 0.36, 1);
--ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-snappy:  cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-out:     cubic-bezier(0, 0, 0.2, 1);
```

Search all CSS files for hardcoded `cubic-bezier(0.22, 1, 0.36, 1)` and replace with `var(--ease-spring)`. Do the same for other commonly repeated curves.

### 1.7 — Unify Module Accent Colors
**File:** `css/core/tokens.css` + all page CSS files

Canonical colors (ONE definition each):
| Module | Token | Canonical Value | Files to fix |
|--------|-------|----------------|--------------|
| Sleep  | `--sleep` | `#818CF8` | tokens.css has `#3aa0ff`, home.css has `#60A5FA` — align ALL to `#818CF8` |
| Mood   | `--mind` | `#A78BFA` | tokens.css has `#7c4dff` — align ALL to `#A78BFA` |

Search ALL CSS files for the old hex values and replace. Verify dashboard cards, page headers, and charts all show the correct unified color.

### 1.8 — Preload DM Sans Font on All Pages
Add to the `<head>` of EVERY HTML page, BEFORE the Google Fonts stylesheet:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### 1.9 — Remove Production Console Logs
Search all JS files for `console.log(`, `console.warn(`, `console.error(`. There are 40+ instances.

**Rule:** Keep `console.error()` for critical failures only. Remove ALL `console.log()` and `console.warn()` or wrap them behind a debug flag:
```javascript
const DEBUG = location.hostname === 'localhost';
if (DEBUG) console.warn(...);
```

Files with most violations: `budget.js` (15+), `habits.js` (8), `dashboardData.js` (8), `mood.js` (5), `sleep.js` (3), `profile.js` (3).

---

## PHASE 2: COMPLETE i18n ON EVERY PAGE

**Run `/harden`** for each target below.

Every user-visible string in the app must use `data-i18n` or `HBIT.i18n.t()`. Add missing keys to BOTH EN and FR translation objects. No hardcoded English anywhere.

### 2.1 — Budget Page (`budget.html` + `budget.js`)
This is the WORST offender. Fix ALL of these:
- `"Export as CSV"` label → `data-i18n="budget.exportCSV"`
- `"Current month"`, `"Last 3 months"`, `"Last 6 months"`, `"All time"` radio labels → `data-i18n`
- `"Income uses Salary and Cash account balances..."` hint → `data-i18n`
- `"🚀 Set up your budget"` + `"Complete these to unlock your full dashboard"` → `data-i18n`
- `"Spending Activity"` section heading → `data-i18n`
- `"Add your first expense to see your spending breakdown."` empty state → `data-i18n`
- `"Spending Trend"` heading → `data-i18n`
- `"© 2025 Hbit"` footer → `data-i18n` (update year to 2026)
- In `budget.js`: `"Save failed"`, `"Tap a category..."`, `"💚 left today"`, `"🔴 over today"` — all use `HBIT.i18n.t()`
- ALL wizard step labels and button text → `data-i18n`
- `"Next →"` button → `data-i18n` (replace → with CSS arrow or SVG icon)
- Currency codes (CAD, USD, EUR, GBP, CAF) are fine as-is (universal)

### 2.2 — Login Page (`login.html` + `login.js`)
- `login.js` line ~44, 52: Password toggle `aria-label` → use `data-i18n-aria-label`
- `login.js` lines 102-106: Error messages → `HBIT.i18n.t('auth.error.invalidEmail')` etc.
- `login.js` lines 144-165: Reset email UI strings → all through i18n
- `login.js` lines 243, 262: Social auth error messages → i18n
- `login.html`: `#resetEmailInput` needs a proper `<label>` element

### 2.3 — Signup Page (`signup.html` + `signup.js`)
- `signup.html` lines 154-159: Module pill buttons ("Habits", "Budget", "Sleep", "Mood", "Focus", "Planner") are HARDCODED — add `data-i18n` to each
- `signup.js` lines 15-102: Module descriptions hardcoded in JS objects — move to i18n keys
- `signup.js` lines 380-381: Password strength labels ("Weak", "Fair", "Good", "Strong") → i18n
- `signup.js` lines 228-234: Firebase error messages → i18n
- Missing `<label>` elements for `#nameInput`, `#passwordInput`, `#confirmInput` — add visible or visually-hidden labels

### 2.4 — Focus Page (`focus.html` + `focus.js`)
- Breathing labels "Inhale", "Exhale", "Hold" → `data-i18n` (these are duplicated in sleep.js too — centralize the i18n keys)
- "4 sec", "7 sec", "8 sec" timing labels → `data-i18n` with interpolation `{n}`
- `"Ready to Focus"` phase label → `data-i18n`
- `"0 sessions today"` → i18n with `{n}` interpolation
- `"goal: 4"` → i18n with `{n}` interpolation
- `"Work"` / `"Break"` phase chip → `data-i18n`
- Sound toggle 🔔/🔕 `aria-label` → `data-i18n-aria-label`
- ALL settings modal labels → `data-i18n` (they may already have them — verify they work)
- Select option text for breathing patterns → `data-i18n`

### 2.5 — Plan Page (`plan.html` + `plan.js`)
- `plan.js` line 47: `"Anytime"` fallback → i18n
- `plan.js` line 50: `"AM"` / `"PM"` → use `Intl.DateTimeFormat` with locale, not hardcoded
- Modal form: "Schedule Event", "Start Time", "Duration (mins)", "Priority", "Notes & Links", "Add to Itinerary" — verify ALL have `data-i18n` and it works
- Priority options "Normal" and "High (!)" → `data-i18n` (remove hardcoded `(!)` — use CSS or emoji for priority indicator)
- `"You have unfinished tasks from previous days."` carry-over banner → verify `data-i18n` works
- `"Cloud"` in help footer → fix with proper i18n key

### 2.6 — Sleep Page (`sleep.html` + `sleep.js`)
- Breathing overlay "Inhale"/"Exhale"/"Hold" → shared i18n keys (same as focus)
- `sleep.js` line 20: Hardcoded breathing labels → use `HBIT.i18n.t()`
- All help modal content → verify fully translated
- `"How did you feel? Any disturbances?"` placeholder → `data-i18n-placeholder`

### 2.7 — Mood Page (`mood.html` + `mood.js`)
- `mood.js` lines 426, 455: "Show less" / "Show more" → `HBIT.i18n.t()`
- `mood.js` line 603: `"🔥 "` with dynamic text → ensure number uses i18n interpolation
- Range input labels: verify all 4 sub-dimension labels (Energy, Stress, Focus, Social) use `data-i18n`

### 2.8 — Home Dashboard (`home.html` + `home.js`)
- `"No habits yet · Create one"` → verify `data-i18n` is present and working
- `"No entries yet · Add expense"` → same
- `"No sleep logged · Log last night"` → same
- `"No check-in · Quick mood log"` → same
- `"No tasks yet · Add your first one"` → same
- `"Pomodoro · Tap to start session"` → same
- `"25 min"` focus metric → use i18n with `{n}` interpolation

### 2.9 — Profile Page (`profile.html` + `profile.js`)
- `"0 / 200"` character counter → format with i18n: `{n} / {max}`
- Gender select options → verify `data-i18n` works on `<option>` elements (some browsers don't support it — may need JS update)
- All stat labels in progress grid → verify `data-i18n`
- "Change password" link → `data-i18n`

### 2.10 — Toast System (`js/core/toast.js`)
- ALL toast messages must go through `HBIT.i18n.t()` — no hardcoded strings
- Verify offline/online messages are translated
- Verify save success/error messages are translated

### 2.11 — Core (`js/core/core.js`)
- `"© 2026 Hbit"` copyright → `HBIT.i18n.t('footer.copyright', { year: new Date().getFullYear() })`

After ALL i18n changes: switch to French, navigate every page, confirm ZERO English-only strings visible.

---

## PHASE 3: FIX LIGHT THEME ON EVERY PAGE

**Run `/colorize`** on each target.

### 3.1 — Budget Page (`css/pages/budget.css`)
This is the MOST broken. White artifacts visible, gradient backgrounds incompatible with light mode.

- Add comprehensive `html[data-theme="light"]` block
- Account card gradients → create light variants: use lighter, pastel versions of each gradient with dark text
- Transaction list rows → light card backgrounds
- KPI stat cards → readable on white
- Chart section → light-compatible backgrounds and labels
- Wizard overlay → light theme compatible
- ALL `rgba(255,255,255,0.05)` and similar dark-mode-only values → override in light theme
- Fix the white line/artifact bug: search for borders or box-shadows using `rgba(255,255,255,...)` — these show as visible white lines on light backgrounds. Replace with `var(--border)` or theme-aware values

### 3.2 — Focus Page (`css/pages/focus.css`)
Read the file. It has light theme overrides but verify COMPLETENESS:
- Timer ring background/stroke
- Ambient glow: light mode should use subtle warm glow at ~10% opacity, not dark's 25%
- Breathing circle: muted background
- Control buttons: proper contrast
- Phase chip: readable
- Config pill: visible border
- Settings modal: everything readable

### 3.3 — Sleep Page (`css/pages/sleep.css`)
Light theme is partial and some text becomes unreadable:
- Hero gradient → light variant (soft indigo-to-white instead of deep dark indigo)
- Wind-down checklist cards → light card backgrounds
- Sleep debt stat block → readable contrast
- Calendar (History tab) → light-friendly colors
- Breathing overlay → light-compatible
- "Connect your device" section → clean light appearance
- ALL hardcoded dark colors (`#1a1a2e`, `#16213e`, `rgba(255,255,255,0.05)`) → override

### 3.4 — Login/Signup (`css/pages/login.css`, `css/pages/signup.css`, `css/auth.css`)
Auth pages are ALWAYS dark. Add light theme support:
- Add BOTH `html[data-theme="light"]` AND `@media (prefers-color-scheme: light)` overrides
- **Left panel (glassmorphism):** Change to light frosted glass: `background: rgba(255,255,255,0.7); backdrop-filter: blur(20px)`. Text inside should be dark (`--text` in light mode)
- **Right panel (form area):** Background should be light (`var(--bg)`), form card uses `var(--panel)` with light shadow
- **Form inputs:** Border `var(--border)`, background `var(--panel)`, text `var(--text)` — all should be readable on white/cream background
- **Buttons:** Primary button (brand red) stays the same. Secondary/Google button needs light border variant
- **Brand mark:** Ensure logo/text stays visible on light background (may need a dark variant or ensure contrast)
- **Error messages:** Red text on light background — verify contrast ratio ≥ 4.5:1
- **Social auth buttons:** Light border + dark text variant
- **Inspirational rows** (on login left panel): Glass cards should use `rgba(0,0,0,0.05)` background instead of `rgba(255,255,255,0.05)`
- **Module preview cards** (on signup left panel): Should use light card backgrounds with visible module accent colors

Also add **inline form validation** to both login and signup:
- Validate email format on blur (before submit)
- Validate password length on blur
- Show inline error below the field, not just after submit
- Use `aria-invalid="true"` and `aria-describedby` for error messages

Also add to **signup page**:
- Password strength indicator: visual bar that fills + label ("Weak"/"Fair"/"Good"/"Strong") — all i18n'd
- Terms of service / privacy policy checkbox with link (legal requirement)
- Verify the module pill buttons ("Habits", "Budget", etc.) have `data-i18n` attributes

### 3.5 — Profile Page (`css/pages/profile-settings.css`)
- Verify light theme works for all sections
- Hero card → light background variant
- Stats grid → module accent colors should still pop on light background
- Form fields → light-compatible
- Danger/delete button → red stays readable
- Add light shadow tokens if needed

### 3.6 — Landing Page (`css/pages/landing.css`)
- Has `.ld-light` class — verify it's comprehensive
- Hero ambient glows → light-compatible
- Feature cards → light backgrounds
- Carousel → light card backgrounds
- Stats counters → readable on light
- CTA buttons → both variants readable on light background
- Footer → light-compatible

### 3.7 — Components (`css/core/components.css`)
- Toast colors → add light theme variants (currently hardcoded dark: `#052e16`, `#1c0a0a`, etc.)
- Cards → light theme shadow adjustment
- Help modal → light background
- Skeleton shimmer → light variant (use darker shimmer on light backgrounds)
- Offline banner → light variant

### 3.8 — Light Theme Shadows (`css/core/tokens.css`)
Add inside `html[data-theme="light"]`:
```css
--shadow-1: 0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
--shadow-2: 0 2px 4px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04);
--shadow-3: 0 4px 8px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06);
--shadow-accent: 0 4px 14px color-mix(in srgb, var(--brand) 15%, transparent);
```

After ALL theme fixes: toggle light mode on EVERY page. Every page must be fully readable with proper contrast. No white artifacts, no invisible text, no broken gradients.

---

## PHASE 4: FIX RESPONSIVENESS ON EVERY PAGE

**Run `/adapt`** for each issue:

### 4.1 — Mood Page (mobile)
The left column is extremely long on mobile (band selector + 4 sliders + emotion chips + impact chips + reflection questions + notes). On small screens this requires excessive scrolling.

Fix: Collapse sub-dimensions into an expandable "Add details" section (progressive disclosure). On mobile, the default view should be: band selector + save button. "Add details" expands to show sliders, chips, questions, notes.

### 4.2 — Sleep Page (mobile)
Two-column layout stacks awkwardly. Wind-down checklist + weekly schedule + device section create a very long page.

Fix: Stack sections in a logical order. Consider collapsible sections for wind-down and schedule on mobile. Ensure breathing overlay is full-screen on mobile.

### 4.3 — Budget Page (mobile)
Account cards may overflow on small screens.

Fix: Account cards should scroll horizontally on mobile (snap scrolling) rather than wrapping. Ensure minimum card width of 260px with `scroll-snap-align: start`.

### 4.4 — Plan Page (mobile)
Calendar strip is hard to scroll on very small devices.

Fix: Ensure the calendar strip has `overflow-x: auto` with `-webkit-overflow-scrolling: touch` and `scroll-snap-type: x mandatory`. Each day button should `scroll-snap-align: center`.

### 4.5 — Focus Page (landscape)
Focus timer should optimize for landscape mode (desk mounting scenario):

Fix: Add `@media (orientation: landscape) and (max-height: 500px)` — reduce timer ring size, stack controls horizontally, hide non-essential elements.

### 4.6 — All Pages (safe area)
Ensure ALL pages use `env(safe-area-inset-*)` for notched phones. Check:
- Sidebar bottom padding
- FAB button positioning (Plan)
- Bottom navigation/footer spacing
- Modal bottom padding

### 4.7 — All Pages (tablet)
Currently the app jumps from mobile to desktop with no tablet-specific layouts. Add a breakpoint around `768px-1024px`:
- Dashboard grid: 2 columns on tablet (not 1 like mobile, not 3-4 like desktop)
- Two-column pages (Mood, Sleep): remain two-column on tablet but with adjusted widths
- Cards: appropriate sizing for tablet screens

---

## PHASE 5: FIX PAGE-SPECIFIC BUGS

### 5.1 — Budget XSS Risk
**File:** `budget.js`

Lines ~1108, 1254, 1278 use `innerHTML` with generated HTML from data. Account names, category names, and bill descriptions could contain malicious input.

Fix: Add an `escapeHtml()` function if one doesn't exist:
```javascript
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
```
Apply it to ALL user-supplied data before inserting into innerHTML templates.

### 5.2 — Budget Header Button Sizes
Button targets are 34px — should be 40px minimum (matching all other pages).

Fix in `css/pages/budget.css`: find all header icon buttons and set `min-width: 40px; min-height: 40px`.

### 5.3 — Home Dashboard Mood Card Wrapper
The mood card wraps in an extra `div.hc-card--mood-wrap` that breaks grid consistency.

Fix: Remove the extra wrapper or adjust the grid to account for it. The mood card should behave identically to other module cards in the grid.

### 5.4 — Habits Detail Modal Delete Button
The Delete button looks identical to Edit, Pause, Archive — no visual distinction for a destructive action.

Fix: Apply danger styling to the Delete button:
```css
.hb-detail-delete { color: var(--quit, #ef4444); border-color: var(--quit, #ef4444); }
.hb-detail-delete:hover { background: rgba(239, 68, 68, 0.1); }
```

### 5.5 — Profile Avatar Color
Uses `var(--mind)` (mood module purple). Should use `var(--brand)` (app red).

Fix in `profile-settings.css` or `profile.html`: change the avatar gradient to use `var(--brand)`.

### 5.6 — Profile Topbar Inconsistency
Profile was the only page using the old `topbar` component. Verify it now uses the same header pattern as other pages (`.hm-header` style). If it still uses topbar, replace with the standard header.

### 5.7 — Plan Calendar Accessibility
Calendar strip days are `<div>` elements.

Fix: Replace with `<button type="button">`. Each day button needs:
- `aria-label="[Weekday], [Full Date]"` (e.g. "Monday, April 14, 2026")
- `aria-pressed="true"` on selected day
- Keyboard navigation: arrow keys to move between days

### 5.8 — Habits Heatmap Accessibility
The 365-cell heatmap has no screen reader information.

Fix: Add to the heatmap container:
```html
<div class="hb-heatmap" role="img" aria-label="Habit activity over the last 365 days">
```
Mark individual cells `aria-hidden="true"`.

### 5.9 — Delete Confirmations (Budget + Plan)
Deleting transactions and plan events is instant with no undo.

Fix: Implement inline confirmation. On delete click:
1. Button changes to "Are you sure?" with [Confirm] [Cancel] options
2. Auto-reverts after 3 seconds if no action taken
3. Confirm triggers actual deletion
4. Both buttons need `data-i18n`

### 5.10 — Mood Range Input Labels
`mood.html` uses `<span>` instead of proper `<label for="">` elements for range inputs.

Fix: Change each range slider label to a proper `<label for="mdRngEnergy">` etc. with the correct `for` attribute.

---

## PHASE 6: NORMALIZE SHARED COMPONENTS

**Run `/normalize`**

### 6.1 — Shared Modal Base Classes
Create in `css/core/components.css`:
```css
.modal-overlay  { /* backdrop: fixed, inset 0, z-index, bg rgba */ }
.modal-panel    { /* card: max-width, border-radius, bg var(--panel), shadow */ }
.modal-header   { /* flex row: title + close button, border-bottom */ }
.modal-body     { /* padding, overflow-y auto, max-height */ }
.modal-footer   { /* flex row: action buttons, border-top, gap */ }
```
Then refactor ALL page-specific modal CSS to extend these base classes instead of redefining from scratch. Pages should only override colors/sizing.

### 6.2 — Shared Avatar Component
Create ONE `.hdr-avatar` class in `components.css`:
```css
.hdr-avatar {
  width: 40px; height: 40px;
  border-radius: var(--radius-3);
  object-fit: cover;
  flex-shrink: 0;
}
```
Replace `.hm-avatar`, `.hb-avatar`, `.sl-avatar` and other page-specific avatar classes.

### 6.3 — Shared Header Button
Create ONE `.hdr-btn` class in `components.css`:
```css
.hdr-btn {
  min-width: 40px; min-height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-2);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: background var(--ease-smooth) 200ms;
}
.hdr-btn:hover { background: var(--hover, rgba(255,255,255,0.06)); }
```
Replace `.hb-hdr-btn`, `.hm-hdr-btn`, `.md-hdr-btn`, `.sl-hdr-btn`, `.bg-hdr-btn`.

---

## VERIFICATION CHECKLIST (Run these tests)

Run `/audit` on the entire app after all fixes. Then manually verify:

- [ ] **i18n:** Switch to French → navigate ALL 11 pages → ZERO English-only strings visible
- [ ] **Interpolation:** Values like `{n}`, `{amount}`, `{score}` show real numbers everywhere
- [ ] **Light theme:** Toggle light mode → ALL 11 pages render with proper contrast, no white artifacts, no invisible text
- [ ] **Auth light theme:** Login and Signup pages in light mode — forms readable, glassmorphism inverted, brand mark visible
- [ ] **Loading states:** Throttle network to Slow 3G — dashboard cards, habits list, budget transactions, mood chart, plan timeline ALL show skeleton shimmer before data loads. Skeletons fade to real content smoothly.
- [ ] **Mobile (375px):** Every page fully usable on iPhone SE width — no overflow, no cut-off, proper tap targets (≥40px)
- [ ] **Mobile mood:** Left column has progressive disclosure — sub-dimensions collapsed by default
- [ ] **Mobile sleep:** Sections stack logically, no awkward gaps or overlaps
- [ ] **Mobile budget:** Account cards scroll horizontally with snap, min 260px wide
- [ ] **Tablet (768px):** Every page looks good at iPad width — dashboard 2-col grid, not just stretched mobile
- [ ] **Sidebar:** Works on all 9 app pages, highlights correct active item, NO hardcoded sidebar HTML in any page (check `focus.html` especially)
- [ ] **Keyboard:** Tab through every page — all interactive elements reachable, modals trap focus, Escape closes modals
- [ ] **Screen reader:** Heatmap, charts, and images all have descriptive aria-labels
- [ ] **Delete actions:** Budget transaction and Plan event deletion shows inline confirmation before executing
- [ ] **XSS:** Enter `<script>alert('x')</script>` as a budget account name and category name — no HTML injection, text is escaped
- [ ] **Form validation:** Login/Signup show inline errors on blur, not just after submit. Signup shows password strength bar.
- [ ] **Console:** No console.log or console.warn in production (only console.error for critical failures)
- [ ] **No crashes:** Navigate rapidly between all pages, toggle theme/language repeatedly — no JS errors in console

Run `/audit` on the full app. Target: technical score 15+/20 average across all pages.

---

*End of Prompt 1. This fixes everything that is broken. Prompt 2 makes everything premium.*
