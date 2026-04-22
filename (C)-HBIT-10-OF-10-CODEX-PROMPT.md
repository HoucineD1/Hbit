# Hbit — "10/10" Implementation Prompt for ChatGPT Codex
*(C) AI-generated · 2026-04-18 · paste this entire file to Codex*

---

## System rules (do not violate)

You are improving an existing web app at `C:\Users\demxa\Desktop\Hbit`. It is a **vanilla HTML/CSS/JS** app with Firebase (Auth + Firestore + Realtime DB). **No frameworks. No build step. No new npm dependencies in the app itself.**

Hard rules:
- **Never break existing functionality.** Run a mental test of each page after every edit.
- **Never touch `.obsidian/` or vault files.** Stay inside `C:\Users\demxa\Desktop\Hbit`.
- **Mobile-first.** Every change must work at 320 px minimum width and feel polished at 375–414 px (iPhone target).
- **All 4 themes must work** after your changes. The 4 themes are being redefined below — use the new tokens.
- **Bilingual EN + FR.** Every user-visible string must have both `en` and `fr` keys in `js/core/i18n.js`.
- **Canonical module accent colors must not change**: Habits `#34D399`, Budget `#F59E0B`, Sleep `#818CF8`, Mood `#A78BFA`, Focus `#F97316`, Plan `#22D3EE`, Quit `#FF5252`. Brand red `#E63946`.
- **Files prefixed `(C)-`** are AI-generated docs; don't treat them as source.
- Where an existing file is `hbit-gap-analysis.docx` or one of the `*.md` prompts, treat them as context, not code.
- Preserve existing Firestore schema and auth flow. Only change auth persistence when Section 12 tells you to.
- **Do not introduce any framework** (React, Vue, Tailwind, etc.). Plain CSS custom properties + vanilla JS only.
- Use `prefers-reduced-motion` guards on every new animation.
- Every new interactive element must have `aria-*` attributes where relevant and a visible `:focus-visible` ring.
- Always verify changes by (a) reading the surrounding code, (b) re-reading the file after edit, (c) checking light-theme and mobile layout mentally.

Deliverable: one clean PR (conceptually — commit-by-commit if possible) that implements the sections below in the listed order.

---

## Reference: the new 4-theme palette

Replace the 4 palettes in `css/core/tokens.css` with these. Keep the keys `midnight`, `terra`, `prism`, `aurora`. Delete `obsidian`, `ivory`, `arctic` references everywhere (profile UI, theme.js, i18n, palette chips).

### Midnight (cool dark — default)
```
--bg: #050810; --panel: #0A0E1A; --panel2: #0F1426; --surface: #131829;
--text: #E6E8ED; --text-secondary: #A0A4B2; --text-muted: #6B707F;
--border: #1F2537;
--input-bg: #0F1426; --input-border: #2A3347; --input-focus: #3A4461;
--shadow-sm: 0 1px 2px rgba(0,0,0,.4);
--shadow-md: 0 4px 12px rgba(0,0,0,.5);
--shadow-lg: 0 12px 24px rgba(0,0,0,.6);
--shadow-xl: 0 20px 48px rgba(0,0,0,.7);
--shadow-accent: 0 0 16px rgba(52,211,153,.15);
--palette-name: "Midnight";
```

### Terra (warm dark — replaces Obsidian)
```
--bg: #0D0B08; --panel: #14110D; --panel2: #1C1814; --surface: #21191A;
--text: #EFE8E0; --text-secondary: #B8AEA0; --text-muted: #8A7F75;
--border: #2A2218;
--input-bg: #1C1814; --input-border: #3A3028; --input-focus: #4A3F35;
--shadow-sm: 0 1px 2px rgba(0,0,0,.5);
--shadow-md: 0 4px 12px rgba(0,0,0,.6);
--shadow-lg: 0 12px 24px rgba(0,0,0,.7);
--shadow-xl: 0 20px 48px rgba(0,0,0,.8);
--shadow-accent: 0 0 16px rgba(245,158,11,.20);
--palette-name: "Terra";
```

### Prism (clean cool light — replaces Arctic)
```
--bg: #FAFBFC; --panel: #FFFFFF; --panel2: #F3F4F6; --surface: #E5E7EB;
--text: #0D1117; --text-secondary: #57606A; --text-muted: #8B949E;
--border: #D0D7DE;
--input-bg: #FFFFFF; --input-border: #D0D7DE; --input-focus: #E1E4E8;
--shadow-sm: 0 1px 3px rgba(0,0,0,.08);
--shadow-md: 0 4px 6px rgba(0,0,0,.10);
--shadow-lg: 0 12px 16px rgba(0,0,0,.12);
--shadow-xl: 0 20px 25px rgba(0,0,0,.15);
--shadow-accent: 0 0 0 3px rgba(34,211,238,.10);
--palette-name: "Prism";
color-scheme: light;
```

### Aurora (twilight accent-driven — replaces Ivory)
```
--bg: #0F1729; --panel: #131F35; --panel2: #1A2847; --surface: #1F3255;
--text: #E6E9F5; --text-secondary: #9BA6BE; --text-muted: #6B7A94;
--border: #293349;
--input-bg: #1A2847; --input-border: #3A4A68; --input-focus: #4A5A78;
--shadow-sm: 0 1px 3px rgba(0,0,0,.4);
--shadow-md: 0 4px 12px rgba(0,0,0,.5);
--shadow-lg: 0 12px 24px rgba(0,0,0,.6);
--shadow-xl: 0 20px 48px rgba(0,0,0,.7);
--shadow-accent: 0 0 20px rgba(167,139,250,.25);
--palette-name: "Aurora";
```

### On-light module text colors
For the Prism palette only, add these additional tokens (used anywhere a module accent is used as **text** on white/near-white):
```
--on-light-habit:  #0D9488;
--on-light-budget: #B45309;
--on-light-sleep:  #4338CA;
--on-light-mood:   #6D28D9;
--on-light-focus:  #C2410C;
--on-light-plan:   #0E7490;
--on-light-quit:   #B91C1C;
```
Under `html[data-palette="prism"]` remap: `--habit: var(--on-light-habit);` etc. Keep bright originals for backgrounds, chart fills, icons.

### Global shared component tokens
Add once at the top of `:root`:
```
--card-radius: var(--radius-2);
--card-padding: var(--space-4);
--card-title-size: 16px;
--card-title-weight: 700;
--card-title-tracking: 0.01em;
--card-subtitle-size: 13px;
--card-subtitle-color: var(--muted);
--section-gap: var(--space-6);
--section-header-gap: var(--space-3);
--btn-height-md: 44px;
--btn-height-lg: 52px;
--btn-radius: var(--radius-full);
--input-height: 48px;
--input-radius: var(--radius-2);
--input-focus-ring: 0 0 0 3px color-mix(in srgb, var(--brand) 22%, transparent);
--tap-min: 44px;
```

---

# Execution plan — do these sections in order

Each section is self-contained. After each section, mentally regression-test every other module.

---

## Section 1 — Theming rebuild (tokens, picker, light theme)

### 1.1 Rewrite `css/core/tokens.css`
Replace the 4 palette blocks with the ones above. Keep the top `:root` block as the *Midnight default*. Keep the legacy `html[data-theme="light"]:not([data-palette])` fallback block but point it at Prism values (it's used by old toggles). Delete tokens/sections for `obsidian`, `ivory`, `arctic`.

### 1.2 Update theme engine `js/core/theme.js`
- Valid palettes: `["midnight","terra","prism","aurora"]`. Default `"midnight"`.
- Persist in `localStorage.hbit:palette`. If invalid, reset to `midnight`.
- On boot, set `html[data-palette=<value>]` AND `html[data-theme=<dark|light>]` (dark for midnight/terra/aurora, light for prism).
- Expose `HBIT.theme.set(palette)`, `HBIT.theme.current()`, `HBIT.theme.cycle()` (cycle through 4 in order).

### 1.3 Add a real palette picker on `profile.html`
Replace the swatch list with four mini-preview cards (each 120×80 px) that render a fake `bg + panel + accent row + text line`. Mark the active one with a check. On tap, call `HBIT.theme.set(x)`.

### 1.4 Landing page light theme — `css/pages/landing.css`
At the bottom of `landing.css`, add `html[data-palette="prism"] #landingPage { … }` rules for: body bg/text, `.ld-nav`, `.ld-nav-icon`, `.ld-hero-*`, `.ld-preview-deck`, any hard-coded `#04060d` → `var(--bg)`. SVG slides at `index.html:210-588` — swap `rgba(255,255,255,…)` strokes for `currentColor` where possible so they pick up `--text`.

Also add a `@media (max-width: 479px)` block that stacks `.ld-hero` vertically and reduces hero font-size.

### 1.5 Global hard-coded color sweep
Search and replace in all `css/pages/*.css`:
- `#fff` used as text → `var(--text)` or `color-mix(in srgb, var(--text) 92%, transparent)` when a soft white is desired.
- `#000` → `var(--text)` for text; `rgba(0,0,0,X)` → `rgba(var(--shadow-rgb,0,0,0),X)` (leave alone if inside a shadow).
- `#0f172a`, `#06222a`, `#111827` → `var(--text)` or `var(--panel2)` depending on usage.
- Module-accent hexes appearing as text → respective `--habit / --budget / --sleep / --mood / --focus / --plan`.

### 1.6 Reduced motion
In `css/core/base.css` add:
```css
@media (prefers-reduced-motion: reduce){
  *, *::before, *::after{
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  @view-transition { navigation: none; }
}
```

### 1.7 i18n keys
Add: `theme.midnight = Midnight / Minuit`, `theme.terra = Terra / Terra`, `theme.prism = Prism / Prisme`, `theme.aurora = Aurora / Aurore`. Remove `theme.obsidian / ivory / arctic`.

### Acceptance for Section 1
- Four visually distinct themes on every page including landing.
- No page flashes dark before switching to Prism (set palette before content render in `theme.js`).
- Light theme landing + login + signup readable.
- `prefers-reduced-motion: reduce` disables view-transitions and animations.
- No literal `#fff`/`#000` remain in `css/pages/*.css` except inside complex shadows.

---

## Section 2 — Core bug fixes (fast, high-impact)

### 2.1 Fix i18n interpolation
In `js/core/i18n.js`, inside `t(key, fallback, vars)`:
```js
let s = dict[lang]?.[key] ?? fallback ?? key;
if (vars) s = s.replace(/\{(\w+)\}/g, (_,k)=> (k in vars ? String(vars[k]) : ("{"+k+"}")));
return s;
```
Also scan the codebase for calls like `t("sleep.cyclePreview", "…{bed}…")` that pass placeholder strings but no `vars` — fix the call sites to pass `{ bed, cycles, wake }`.

### 2.2 Auth persistence — DO NOT flip yet
Leave `browserSessionPersistence` in place; add a top-of-file comment `// TODO(launch): switch to browserLocalPersistence` in `js/core/firebase-init.js`. (The user wants a manual switch moment.)

### 2.3 Add root stacking isolation
In `body{}` of `base.css`, add `isolation: isolate;` so fixed overlays from Budget/Sleep never live behind ancestor stacking contexts.

### Acceptance
- `{placeholder}` renders values, not literal braces, in Sleep, Habits, Focus, Plan.
- Reduced-motion works. No regression.

---

## Section 3 — Budget fix + redesign

### 3.1 Apply the documented black-screen modal fix
Follow `budget-blackscreen-fix-prompt.md` exactly (the two numbered bugs). Specifically:

- `css/pages/budget.css`: `.bg-overlay` is `display:none` by default; `.bg-overlay.open` becomes `display:flex`. Remove any base `display: flex` on the overlay.
- `js/pages/budget.js`: `closeOverlay()` must call `overlay.classList.remove("open")` and **not** write `overlay.style.display`. Remove inline `display:flex` on open; only toggle the class.
- Every `.bg-overlay` in `budget.html` must have `aria-hidden="true"` at rest.
- Add a DOM smoke test: on window load, ensure every `.bg-overlay` has `getComputedStyle().display === "none"`.

### 3.2 Replace dashboard with a wizard + opt-in cards
Add a new `budget.wizard.cards` array in user profile (Firestore: `users/{uid}/budget/settings`). Shape:
```json
{ "cards": ["hero","top3","bills"], "wizardComplete": true }
```
Default new users: `["hero","top3","bills"]`. First render: if `wizardComplete !== true`, open the wizard.

Wizard UX: single bottom-sheet, 3 steps.
1. **Goal**: "What do you want from Hbit Budget?" — radios: Keep track · Save more · Pay off debt.
2. **Cards**: a checklist of 8 cards with preview chip + description:
   - Hero (required, locked on) — "Spent this month"
   - Top 3 categories — "Where your money goes"
   - Upcoming bills — "Never miss a payment"
   - Accounts — "Balances across accounts"
   - Savings goals — "Progress toward your goals"
   - Net worth — "Month-over-month trend"
   - Calendar heat — "Daily spend heatmap"
   - Trend — "30-day spend line"
3. **Done** → persist, close, render only selected cards.

Later, add a "Manage dashboard" entry in the settings menu that reopens the checklist.

### 3.3 Budget UI polish — align with Habits
In `css/pages/budget.css`:
- Use `--card-radius`, `--card-padding`, `--card-title-size/weight/tracking`, `--card-subtitle-size/color` everywhere.
- Corner radii allowed: 12 / 16 / 20 only. Remove 14.
- Typography: every card header should be `font-size: var(--card-title-size); font-weight: var(--card-title-weight); letter-spacing: var(--card-title-tracking);`.
- Sub-text colors → `var(--card-subtitle-color)`.

### 3.4 Positive/negative semantics
- Add `--success: #10B981; --danger: #EF4444;` to `tokens.css`.
- Amounts with `+` → `color: var(--success)`. Amounts marked over-budget → `color: var(--danger)`. Pair with an inline arrow svg icon (↑ income, ↓ expense) for accessibility (don't rely on color alone).

### 3.5 FAB robustness
Wrap the FAB in a portal: append `#bg-fab-portal` div to `<body>` on init, move the FAB DOM node into it; scope CSS to `#bg-fab-portal`.

### 3.6 Split `budget.js` (optional but strongly recommended)
If time permits, split `js/pages/budget.js` (5,583 lines) into:
- `js/pages/budget/state.js`
- `js/pages/budget/cards.js`
- `js/pages/budget/wizard.js`
- `js/pages/budget/sheets.js`
- `js/pages/budget/formulas.js`
- `js/pages/budget/index.js` (public surface)
Update `budget.html` script list accordingly. If you can't safely split within this pass, skip; make sure tests still pass.

### Acceptance
- New user sees 3 cards, not 8. Completing wizard is persisted.
- Opening any sheet in Budget never produces a black screen. Scrim closes with tap-outside or swipe-down.
- Typography and radii align with Habits on screenshot comparison.

---

## Section 4 — Sleep rebuild

### 4.1 Mobile time-picker targets
Edit `css/pages/sleep.css` (around line 498–540) and add:
```css
@media (max-width: 639px){
  #sleepPage .sl-time-picker{ gap:12px; padding:8px 10px; }
  #sleepPage .sl-time-picker-part{
    min-width:72px; min-height:56px; font-size:20px; font-weight:700;
  }
  #sleepPage .sl-time-picker-part--period{ min-width:60px; }
}
```
Then make the native `<input type="time">` cover the custom picker visually via `position:absolute; inset:0; opacity:0; cursor:pointer;` so tap always opens the OS wheel. Keep the custom picker visible beneath.

### 4.2 Safe bedtime recommender
In `js/pages/sleep.js`, `suggestedBedtimes()`:
- Allowed cycles: `const ALLOWED_CYCLES = [4, 5, 6];` (6 h / 7 h 30 / 9 h). Never render 1–3 cycle options.
- Compute total sleep for each candidate. If total < 360 min, don't render.
- If chosen wake time is within the next 6 h from "now", show a red warning banner: `"Less than 6 hours until your wake time — consider waking later." / "Moins de 6 heures jusqu'au réveil — envisage de te lever plus tard."`
- Add a "Why these options?" link that opens a small popover citing AASM ≥ 7 h.

### 4.3 Remove the redundant "Your sleep schedule" card
In `sleep.html`, delete the `section.sl-sec--weekly-schedule` block (lines ~205–232). Remove associated CSS + `renderWeekSchedule()`. Move `planWake`/`planDuration` into the Hero as a small "Change plan" popover triggered by the existing "Edit plan" button.

### 4.4 Move breathing exercise to Focus
Migration:
1. **Copy** overlay markup from `sleep.html:411-426` to `focus.html`, renaming `sl-breath-*` → `fc-breath-*`.
2. **Copy** all `.sl-breath-*` CSS rules from `sleep.css` to `focus.css`, renaming selectors to `.fc-breath-*`.
3. **Copy** breathing logic (`BREATH_PHASES`, `openBreathingModal`, `closeBreathingModal`, timers) from `sleep.js` to `focus.js`. Rename namespace to `fcBreath*`.
4. **Remove** all the above from Sleep.
5. In the Sleep wind-down list, the "Breathing exercise" item should become a link: `→ focus.html?mode=breathing` (deep link that auto-opens the Focus breathing tab).
6. Update i18n: move `sleep.breath.*` keys to `focus.breath.*`.

### 4.5 History tab — tap a day to log
The calendar at `#sleepCalendar` already renders. Ensure clicking a date cell opens `#logOverlay` pre-filled with that date. Add `aria-label="Log sleep for {date}"` on each cell.

### 4.6 Complete light-theme coverage
Add `html[data-palette="prism"] #sleepPage { … }` rules for: hero, cards, tabs, badges, warn banner, calendar cells, sheet, textarea, range slider thumb, device tag chips.

### Acceptance
- Tapping anywhere on the wake-time picker opens the OS time wheel at ≥ 72 × 56 px target.
- "Wake at 03:00 tomorrow" never suggests bedtimes producing < 6 h sleep.
- Sleep has no breathing overlay; Focus has it.
- Tonight tab is shorter — the "Weekly schedule" card is gone.
- Prism theme renders Sleep without hard-coded dark text on light panels.

---

## Section 5 — Focus redesign

### 5.1 New layout
`focus.html` top-level tabs: **Timer · Breathe · Sessions** (replace current 2-tab layout).

### 5.2 Timer hero
- One big circular start/stop button (size `clamp(180px, 50vw, 240px)`).
- Ring around it: thin circular progress showing `completedSessionsToday / dailyGoal`.
- Above: preset pills → **25/5** · **50/10** · **90/20** · **Custom**. Active pill wears module accent (`--focus`).
- "Custom" opens a compact sheet with two steppers (work 5–180, break 1–60). Save persists to `settings.{workDuration, breakDuration, dailyGoal}`.

### 5.3 Fix empty sessions list
In `js/pages/focus.js`, replace the one-shot `loadSessionHistory()` with an `onSnapshot` subscription to `users/{uid}/focus_sessions`. On empty data, show the empty state. On data arrival, re-render. While pending, render 3 skeleton rows. Ensure no `ui.sessionEmpty.hidden = todays.length > 0;` runs on a stale empty array.

### 5.4 Standalone breathing
Breathe tab shows three preset cards:
- **Box 4-4-4-4** — calm; 2 min total
- **4-7-8** — sleep; 3 min total
- **Coherent 6-6** — focus; 3 min total

Tapping opens the `fc-breath-*` overlay (migrated in §4.4) in full-screen mode with:
- Expanding/contracting circle animated via CSS `transform: scale()`.
- Phase label with counter.
- Close (X) and "End early" both visible.
- On completion: log a `type: "breathe"` session; haptic pulse via `navigator.vibrate?.(20)`; toast `"Breathed {minutes} min today" / "Respiré {minutes} min aujourd'hui"`.

Deep-link: if the URL includes `?mode=breathing`, pre-select the Breathe tab on load.

### 5.5 Post-work-session moment
Between a work block and a break, show a 3-second full-screen overlay: `"Great focus!"` + tiny confetti burst (reuse `js/core/confetti.js`), then auto-advance to the break. Skip button available.

### 5.6 Session list re-skin
Sessions cards: left-side 4 px colored bar using `--focus` or `--sleep` depending on `s.type`; two-line text; right-side duration chip.

### Acceptance
- Sessions tab shows content for the authenticated test user `mimi@gmail.com` when they've completed any focus session.
- Timer presets + custom flow persist across reloads.
- Breathe tab works fully, logs entries, responds to `?mode=breathing`.

---

## Section 6 — Plan (full redesign)

### 6.1 View tabs
`plan.html` top: **Today · Week · List**. Default: Today.

### 6.2 Today (Day view)
Vertical time grid 00:00–24:00, 30-min rows. Auto-scroll to "now" on open. Tasks render as blocks positioned by `start`/`end` (fallback to 1h if no end). Tap empty slot → quick-add inline input.

### 6.3 Week view
7 narrow columns × time grid. Column headers show short weekday + date. "Today" column has an accent ring. Tap a block to edit, long-press + drag to reschedule.

### 6.4 Natural-language quick-add
Top of Today view: an input `Add something… (e.g. 'gym tomorrow 6pm 1h')`.

Parsing rules (simple regex, no external lib):
- `today` / `tomorrow` / `mon–sun` / `demain` / `aujourd'hui` / weekday names EN + FR.
- Time patterns `3pm`, `3:30pm`, `15h`, `15h30`.
- Duration `45min`, `1h`, `1h30`, `90 min`.
- Everything else → `title`.
Return `{ title, dateISO, start, end }`. Show a preview chip before save.

### 6.5 Drag-to-reschedule
Use Pointer Events (`pointerdown`/`pointermove`/`pointerup`). On long-press (400 ms hold) the block enters "drag" state (`opacity: .75; transform: scale(1.02)`). Snap to 15-min grid. On release → update Firestore + re-render.

### 6.6 Carry-over
When loading Today, compute tasks where `dueDateISO < today && !done`. Render banner:
```
"3 unfinished tasks from yesterday — bring to today?"
[ View ]  [ Bring all ]  [ Dismiss ]
```
"View" expands a preview list with per-task "Bring" toggles.

### 6.7 Fix modal stacking on mobile
Add:
```css
@media (max-width: 479px){
  #planPage .pl-time-row{ flex-direction: column; gap: var(--space-3); }
  #planPage .pl-input-num{ width: 100%; }
}
```

### 6.8 Light theme coverage
Full `html[data-palette="prism"] #planPage { … }` overrides for task card, timeline, priority filters, empty state, FAB.

### 6.9 Priority colors → tokens
Replace hard-coded hexes (`#9a1c1c`, `#059669`, `#dc2626`, `#06222a`, `#000`) with `--prio-high/med/low` per palette.

### Acceptance
- Today shows a real day-view grid, "now" line, tap-to-add.
- Week shows 7 days with drag-to-reschedule working.
- Natural-language parses the listed patterns in EN and FR.
- Mobile 375 px never overflows horizontally.

---

## Section 7 — Mood rebuild

### 7.1 One-screen log flow
When the user taps "Log today" (or equivalent CTA on `mood.html`), open a full-screen sheet containing, top to bottom:
1. Band picker (5 large buttons, accent fills).
2. Energy / Stress / Focus / Social sliders (4 rows, each with label + value).
3. Emotion chips (scrollable pill row).
4. Impact question textarea.
5. A single sticky "Save" button at the bottom.

Tapping a band must **not** collapse the rest. Remove the "Add details ↓" two-step flow.

### 7.2 Typography / spacing parity with Habits
Apply the shared tokens from Section 1. Target parity:
- `.md-card-label` → `font-size: var(--card-title-size); font-weight: var(--card-title-weight); letter-spacing: var(--card-title-tracking);`
- Section headers match `hb-section-title`.
- Band buttons height ≥ `--btn-height-lg`.

### 7.3 Band text color token
Add `--md-band-text` with default `#FFFFFF`. Under `html[data-palette="prism"]`, override to `color-mix(in srgb, var(--text) 95%, transparent)` so text remains readable on pastel bands.

### 7.4 Remove duplicated Sleep banner
Delete `mood.html:89-93` (sleep banner). If a cross-module surface is needed, make it read from the same Firestore doc and show "slept X h Y min last night" as a small pill, not a banner.

### 7.5 Emotion chips mobile overflow
Wrap the chip row in `.md-chip-wrap` with `overflow-x: auto; scroll-snap-type: x proximity;` and add a right-edge fade mask:
```css
.md-chip-wrap{ mask-image: linear-gradient(to right, #000 90%, transparent); }
```

### Acceptance
- One-screen log works without an edit step.
- Screenshot of Mood vs. Habits shows the same header/card typography and radii.
- Chips scroll horizontally at 320 px without clipping.

---

## Section 8 — Habits polish

### 8.1 Heatmap mobile overflow
In `css/pages/habits.css`, the cell size and wrapper:
```css
.hb-heatmap{
  --cell: clamp(10px, 2.4vw, 16px);
  --gap: 3px;
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, var(--cell));
  gap: var(--gap);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  padding-bottom: 6px;
}
.hb-heatmap > *{ width: var(--cell); height: var(--cell); border-radius: 3px; }
```
Add a sticky left column with weekday labels (Mon, Wed, Fri) that does not scroll with the grid.

### 8.2 Intent-aware suggestions
In `js/pages/habits.js`, add:
```js
const HABIT_SUGGESTIONS = {
  build:    [/* 15 EN/FR pairs, see AUDIT §7.1 */],
  quit:     [/* 15 pairs, see AUDIT §7.2 */],
  maintain: [/* 15 pairs, see AUDIT §7.3 */],
};
```
Wizard step 3 must render `HABIT_SUGGESTIONS[state.intent]`. Add a "Create custom" chip at the end of each list that opens the polished input (see 8.3).

### 8.3 Custom habit input polish
Input CSS:
```css
.hb-wz-input{
  height: var(--input-height);
  padding: 0 14px;
  border-radius: var(--input-radius);
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text);
  font: inherit;
  width: 100%;
}
.hb-wz-input:focus-visible{
  outline: none;
  border-color: var(--habit);
  box-shadow: var(--input-focus-ring);
}
```
Add a counter `<span class="hb-wz-counter">0 / 40</span>` under the input, updated on input.

### 8.4 "Done" vs "Stayed strong"
In completion handler, if `habit.intent === "quit"`, the button label becomes `t("habits.stayedStrong","Stayed strong")` (FR `"Tenu bon"`); the success toast becomes `t("habits.anotherDayWithout","Another day without {name}", { name })`.

### 8.5 Quit-habit "days since"
For `intent === "quit"`, the card's streak element shows `Day {N} without {name}` instead of current streak. Where N is computed from the `startedAt` timestamp. Milestone confetti at 1 / 3 / 7 / 30 / 90 days.

### 8.6 Never say "Failed" or "Missed"
Where applicable, replace with `t("habits.reset","Reset — a fresh start")` / `"On repart à zéro, ça arrive"`.

### 8.7 Identity label (optional)
Add optional field in the wizard: `"I am someone who…"` / `"Je suis quelqu'un qui…"`. Render under the habit card name in small muted type.

### Acceptance
- Heatmap never clips horizontally at 320 px; weekday sticky labels stay visible on scroll.
- Selecting intent "Quit" shows only quit-appropriate suggestions.
- Completing a quit habit says "Stayed strong" (not "Done").

---

## Section 9 — Home / Landing polish

### 9.1 Replace tokenized hard-coded colors
In `css/pages/home.css`:
- Line 116: `rgba(154, 28, 28, 0.11)` → `color-mix(in srgb, var(--brand) 11%, transparent)`.
- Line 136: `rgba(7, 9, 14, 0.90)` → `color-mix(in srgb, var(--bg) 90%, transparent)`.
- Lines 153 and 163 hard-coded whites → `var(--text-muted)` and `var(--text)`.

### 9.2 Theme picker preview
Re-do `profile-settings.css` palette chips as 4 mini UI previews (see Section 1.3).

### 9.3 Home hero strip
Above the grid, add a "Good {morning/afternoon/evening}, {name}" greeting + a single-line summary:
```
🟢 Habits 4/5   💤 Slept 7h 20m   😊 Mood 8/10   💸 $420 / $1500   ⏳ Focus 0/3   📅 2 planned
```
Uses the current Firestore aggregates already exposed via `core.js`.

### 9.4 Landing slide SVGs — theme-aware
In each slide SVG under `index.html:210–588`, replace `rgba(255,255,255,X)` fill/stroke with `currentColor` where it should follow `--text`; where an accent is intended, use one of `--habit/--budget/--sleep/--mood/--focus/--plan`. Wrap inline `style` swatches with the module tokens.

### Acceptance
- Prism palette on landing renders dark-text-on-light without manual overrides.
- Home greeting strip visible on all modules' data.

---

## Section 10 — Verification & rollout

After all sections:
1. Manually walk through each module at 320, 375, 414, 768, 1024 px widths (DevTools responsive mode) on each palette.
2. Confirm: no `{placeholder}` literals; no light-theme dark-on-dark; no Budget black screen; no clipped heatmap.
3. Re-run Firestore smoke: log a habit, sleep, mood, budget tx, focus session, plan task. Confirm persistence + cross-module reflection on Home.
4. Add `AUDIT-TEST-RESULTS.md` summarizing pass/fail per section.
5. Run `npm run build` (if it exists) or the project's lint/format script; fix any issues.

---

## Section 11 — File-by-file index of required edits

| File | Sections that edit it |
|------|-----------------------|
| `css/core/tokens.css` | 1.1, 1.2, 3.4, §Global shared tokens |
| `css/core/base.css` | 1.6, 2.3 |
| `css/pages/landing.css` | 1.4, 9.4 |
| `css/pages/home.css` | 1.5, 9.1, 9.3 |
| `css/pages/sleep.css` | 1.5, 4.1, 4.3, 4.6, 4.4 (remove) |
| `css/pages/focus.css` | 1.5, 4.4 (add), 5.1–5.6 |
| `css/pages/plan.css` | 1.5, 6.1–6.9 |
| `css/pages/mood.css` | 1.5, 7.1–7.5 |
| `css/pages/habits.css` | 1.5, 8.1, 8.3 |
| `css/pages/budget.css` | 1.5, 3.1–3.4 |
| `css/pages/profile-settings.css` | 1.3, 9.2 |
| `js/core/theme.js` | 1.2 |
| `js/core/i18n.js` | 2.1, 1.7 |
| `js/core/firebase-init.js` | 2.2 |
| `index.html` | 1.4, 9.4 |
| `home.html` | 9.3 |
| `sleep.html` | 4.3, 4.4, 4.5 |
| `focus.html` | 5.1–5.6, 4.4 (add) |
| `plan.html` | 6.1–6.9 |
| `mood.html` | 7.1–7.5 |
| `habits.html` | 8.1–8.7 |
| `budget.html` | 3.1–3.5 |
| `profile.html` | 1.3 |
| `js/pages/sleep.js` | 4.1, 4.2, 4.3, 4.4 (remove), 4.5, 4.6 |
| `js/pages/focus.js` | 5.1–5.6, 4.4 (add) |
| `js/pages/plan.js` | 6.1–6.9 |
| `js/pages/mood.js` | 7.1–7.5 |
| `js/pages/habits.js` | 8.1, 8.2, 8.4–8.7 |
| `js/pages/budget.js` | 3.1–3.6 |

---

## Section 12 — Pre-launch checklist (do NOT include in this pass)

These are manual / launch-time steps the developer must do separately — Codex should **not** touch them now:
- Flip `browserSessionPersistence` → `browserLocalPersistence` in `firebase-init.js`.
- Remove test account `mimi@gmail.com` / `12345678` if it was seeded.
- Add `noindex` → remove it from production pages that should be indexable.
- Verify Firestore rules in `firestore.rules` for the new `users/{uid}/budget/settings` and `users/{uid}/focus_sessions` paths.
- Add analytics only if the user approves.

---

## Section 13 — Do-NOTs

- Do not import any third-party CSS framework.
- Do not rewrite `js/pages/budget.js` from scratch in a single commit; refactor incrementally or skip the split.
- Do not change module accent colors.
- Do not delete i18n keys without updating their call sites.
- Do not touch `.obsidian/` or the Hbrain vault.
- Do not commit `.env` files or Firebase service credentials.

---

## Section 14 — Commit template

For each section, create a commit with a message like:
```
feat(sleep): safe bedtime recs + mobile time-picker targets (Section 4.1-4.2)
```
Small, reviewable commits > one giant commit. The user (God/Houcine) will review each.

---

**End of Codex prompt.** Please confirm which sections are complete in your PR description, paste the `AUDIT-TEST-RESULTS.md`, and flag any deviations or ambiguities before merging.
