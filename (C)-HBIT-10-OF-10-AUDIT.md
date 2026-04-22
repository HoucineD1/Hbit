# Hbit — "10/10 Audit" (Mobile‑First)
*(C) AI‑generated · 2026‑04‑18 · for God/Houcine*

> **Goal of this document:** give you a brutally honest, line‑level audit of the live app (hbit-2027.vercel.app) and the local `C:\Users\demxa\Desktop\Hbit` source. Every finding is tied to a file/line, a severity, and a fix direction. A companion file — **`(C)-HBIT-10-OF-10-CODEX-PROMPT.md`** — translates these findings into a single paste‑ready prompt for ChatGPT Codex.

---

## 1) Executive scorecard

Scores are mobile‑first (375–414 px), weighted **Functionality 40 / UX 30 / Visual polish 20 / Consistency 10**. Desktop scores are bracketed.

| Module       | Mobile | Desktop | Verdict |
|--------------|:------:|:-------:|---------|
| Home / Overview | 7.0 | [8.0] | Solid shell, but the 4 themes are nearly indistinguishable; landing page has no light theme at all. |
| Habits       | 7.5 | [8.0] | Best‑looking module. Heatmap overflows on mobile, stop‑habit flow is tone‑deaf. |
| Sleep        | 5.5 | [7.0] | Time picker is too small on mobile, bedtime recs can suggest <6 h, weekly schedule card is dead weight, breathing should live in Focus. |
| Mood         | 6.5 | [7.5] | Good bones but not at Habits quality; "log my day" asks the user to enter edit mode before seeing the questions. |
| Budget       | 4.0 | [5.5] | Information overload, unpolished type/spacing vs. Habits, documented black‑screen modal bug not yet applied, 5,583‑line god‑file. |
| Focus        | 4.5 | [5.5] | Sessions list appears empty / broken; breathing logic present but not exposed as a standalone exercise; no Pomodoro presets UI. |
| Plan         | 4.0 | [5.0] | No real day/week calendar view, no drag‑to‑reschedule, no natural‑language quick‑add. Task list masquerading as a planner. |

**Overall mobile grade: 5.6 / 10.** You are *not* far from a 10/10, but Budget, Focus and Plan need rework, and the theme system needs to genuinely ship 4 distinct looks.

---

## 2) Global / cross‑module findings

### 2.1 Theme system is "2 themes pretending to be 4"
`css/core/tokens.css` defines four palettes whose bg/panel/panel2 values are within ~6 % lightness of their pair:

- **Midnight** `bg #070B14 / panel #0D1117`
- **Obsidian** `bg #0C0A1A / panel #13101F` ← essentially the same cool near‑black
- **Ivory**    `bg #F7F5F0 / panel #FFFFFF`
- **Arctic**   `bg #F8FAFC / panel #FFFFFF` ← identical panel, 1.3 % diff in bg

**What needs to change** (implemented in §6 and in the Codex prompt):

| Slot | Current | Replace with | Why |
|------|---------|--------------|-----|
| Dark 1 | Midnight (cool near‑black) | **Midnight** — kept, minor polish | Default. Oura‑like. |
| Dark 2 | Obsidian (same as Midnight) | **Terra** — warm sepia dark (#0D0B08) | Warm vs. cool: a real second dark mood. |
| Light 1 | Ivory (warm cream) | **Prism** — cool neutral (#FAFBFC) | Linear/Arc style, data‑first. |
| Light 2 | Arctic (cool near‑white) | **Aurora** — twilight deep‑blue/violet (#0F1729) | A distinctive "accent‑driven" theme that is neither pure light nor pure dark — a true fourth option. |

Complete token sets for the 4 palettes are in §6 "Research‑backed palettes".

### 2.2 Hard‑coded colors defeat theming
Spot checks show hexes that won't follow the active palette:

- `css/pages/home.css:116` `rgba(154, 28, 28, 0.11)` — ambient glow is brand‑red only.
- `css/pages/home.css:136` `rgba(7, 9, 14, 0.90)` — header is locked to Midnight bg.
- `css/pages/landing.css:28` `background:#04060d` — landing page is locked dark.
- `css/pages/sleep.css:322‑323` `#fff`, `#0f172a` — inside dark‑theme rules.
- `css/pages/focus.css:406,525,546‑547` `#fff, #f97316, #fb923c, #fdba74, #7dd3fc` — focus accent gradient is hard‑coded.
- `css/pages/plan.css:59,244,291,344,464,467,507` — priority colors + text `#000` hard‑coded.
- `css/pages/mood.css:322‑323,546‑547` — band text `#fff` + warning `#fcd34d` hard‑coded.

**Fix pattern:** replace with `var(--bg)` / `var(--panel)` / `var(--text)` / module tokens (`--hc-habits`, `--hc-sleep`, …). Add missing tokens to `tokens.css`.

### 2.3 Light theme coverage is incomplete
Rough coverage per module (grep of `html[data-theme="light"]` in each module CSS):

- Sleep ~5 % • Plan ~20 % • Mood ~15 % • Focus ~40 % • Budget ~50 % • Habits ~60 % • Home ~90 %.
- **Landing page (`css/pages/landing.css`) has *zero* light‑theme rules** — a user who picks a light theme and then lands here sees dark‑only. Critical for marketing/first‑impression.

### 2.4 i18n interpolation broken
User reports `{placeholder}` tokens render literally. `sleep.cyclePreview` for example is `"Sleep at {bed} → {cycles} cycles → wake at {wake}…"` but shows with braces intact. Fix in `js/core/i18n.js` `t()` function — confirm it performs `{key}` → value substitution, test with known strings per module, add a unit‑like smoke test.

### 2.5 Auth still uses SESSION persistence
`firebase.auth().setPersistence(browserSessionPersistence)` — confirmed in `js/core/firebase-init.js`. Known‑intentional for dev testing; must flip to `browserLocalPersistence` before launch.

### 2.6 Scroll‑to‑top is present, `prefers-reduced-motion` isn't
`base.css:100` enables `@view-transition` and a 260 ms spring animation on every page nav. No `@media (prefers-reduced-motion: reduce)` escape hatch. Adding one is a 4‑line fix that wins accessibility points.

---

## 3) Module‑by‑module findings

Each finding has: `[SEV]` (CRIT / HIGH / MED / LOW), file+line, problem, fix direction.

### 3.1 Home / Landing (`index.html`, `home.html`, `home.css`, `landing.css`)

1. **[HIGH] 4 themes look like 2.** `css/core/tokens.css:83‑163`. See §2.1 + §6 for replacement palette.
2. **[HIGH] Landing has no light theme.** `landing.css` — add an `html[data-theme="light"] #landingPage { … }` block covering hero, nav, CTAs, SVG slide stroke colors. Without it, toggling light → horrible contrast on the only page unauthenticated visitors see.
3. **[MED] Theme picker has no live preview.** `profile.html:204‑221` — palette chips only show 2 inline colors. Competitors (Arc, Raycast, Linear) show a miniature UI preview. Add a 3‑line mock (bg + card + accent + text) as the chip's visual.
4. **[MED] Module accents not checked against each bg for contrast.** Emerald `#34D399` on pure white = 4.2 : 1 (FAIL body, AA large only). Use darker "on‑light" variants (e.g. `#0D9488`) when a module accent is used as text color on Prism/Ivory. See §6 compatibility matrix.
5. **[MED] Landing hero doesn't stack at 375 px.** `landing.css` — first responsive rule is `max-width:480px` at line 442; `.ld-hero` is 2‑column above that. Add a `@media (max-width: 479px)` block that switches to 1‑column and bumps font sizes.
6. **[LOW] Hard‑coded red ambient glow.** `home.css:116` — tokenize into `--ambient-glow-color`, default `color-mix(in srgb, var(--brand) 28%, transparent)`.
7. **[LOW] Theme toggle cycles all 4 palettes in one button.** `js/core/theme.js` — hard to find "Prism" in a cycle. Replace with an explicit 4‑swatch segment control in the profile page; keep the header icon as "toggle dark/light" only.

### 3.2 Habits (`habits.html`, `habits.css`, `habits.js`)

1. **[HIGH] GitHub‑style heatmap overflows mobile.** `habits.js` renders 52×7 cells at fixed size. On 320 px screens, a 12 px cell × 53 columns ≈ 636 px, clipped on the right. **Fix**: cell size `clamp(10px, 2vw, 16px)`, wrap in `overflow-x:auto; overscroll-behavior-x:contain`, add sticky month labels to the left.
2. **[HIGH] Stop‑habit suggestions are tone‑deaf.** When the user chooses "stop", the suggestion strip still shows positive‑behavior items ("drink 2 L water daily"). `habits.js` needs three distinct arrays keyed by `intent` ∈ {`build`,`quit`,`maintain`}. See §7 for ready‑to‑drop lists in EN + FR.
3. **[MED] Wizard text box looks amateur.** The free‑text input at `habits.wz.step3` lacks padding, focus ring, and a character counter. Fix tokens `--input-bg / --input-border / --input-focus`, add `box-shadow: 0 0 0 3px color-mix(in srgb, var(--habit) 22%, transparent)` on focus, and a 0/40 chars counter.
4. **[MED] "Done" label on a quit habit is wrong.** When intent is `quit`, the completion button reads "Done". It should read "Stayed strong today" / "Tenu bon aujourd'hui" (see §7 copy block). Same for toast: "Fait / Done" → "Encore une journée sans X / Another day without X".
5. **[MED] Streak flame uses module accent for both build and quit.** In the quit flow, the timer should be "days since quit" not "current streak". Visual treatment: muted amber with milestone badges (1d / 3d / 1 wk / 1 mo / 90 d).
6. **[LOW] Identity‑based framing missing.** Per Atoms (James Clear), each habit should allow an optional "I am someone who…" label under the name. Add a new optional field in the wizard; render it under the habit card in the list.

### 3.3 Sleep (`sleep.html`, `sleep.css`, `sleep.js`)

1. **[CRIT] "Wake at" time picker is tiny on mobile.** `sleep.css:498‑540` — `sl-time-picker-part` uses `min-height:46px / min-width:52px` with only `>640px` breakpoints. Fingers can't hit the targets at 375 px. **Fix**: for `<640 px`, `min-height:56px`, `min-width:72px`, `gap:12px`, `font-size:20px`, and keep the native `<input type="time">` accessible as a fall‑back with `position:absolute; inset:0; opacity:0` on the **entire** picker so any tap opens the OS wheel.
2. **[HIGH] Bedtime recommender can suggest <6 h sleep.** `sleep.js` `suggestedBedtimes()` (~line 302) returns options for N cycles × 90 min − 14 min. There's no safety clamp. **Fix**: hard‑coded allowed set `[4, 5, 6]` cycles (6h, 7h30, 9h); show a red warning banner if chosen wake time would produce < 6 h from "now" (user is asking for a same‑day nap recommendation); never *display* the <6h option as a default suggestion. Cite AASM ≥ 7 h guideline in a "Why?" popover.
3. **[HIGH] "Weekly schedule" card on Tonight tab is redundant + read‑only.** `sleep.html:205‑232`. The History tab already has an editable calendar. **Fix**: delete this card from Tonight (move the "planWake" input into a compact row inside the Hero); keep History as the single source of truth for past entries, and let tapping a past day open the log sheet.
4. **[HIGH] Breathing exercise should live in Focus, not Sleep.** `sleep.html:411‑426` + `sleep.js ~1176‑1220` + ~100 lines of CSS `.sl-breath-*`. Migrate:
   - Move overlay markup to `focus.html` (rename `sl-breath-*` → `fc-breath-*`).
   - Move logic to `focus.js` (rename `brState`/`BREATH_PHASES`/`openBreathingModal`).
   - Move CSS to `focus.css`.
   - Keep the i18n keys; re‑namespace `sleep.breath.*` → `focus.breath.*`.
   - Remove the "breathing" CTA from Sleep wind‑down; replace with "Start focus breathing →" link to `focus.html?mode=breathing`.
5. **[MED] Light theme ~5 % covered.** `sleep.css:1594‑1608` overrides only `sl-input`, `sl-time-picker`, `sl-sheet`. Missing: hero, cards, tabs, badges, warn banner, calendar cells, breathing overlay.
6. **[MED] Hero "Sleep at / Wake at" rows are two separate blocks.** On mobile they stack with lots of vertical rhythm wasted. Consider a single horizontal strip `🌙 22:30 → ☀ 07:00 · 8h 30m` like Apple Health's "Time in bed" pill.
7. **[LOW] History calendar doesn't highlight "today" prominently.** Tap target for "today" is same as other days. Add `--today-ring` using `--sleep` color.

### 3.4 Mood (`mood.html`, `mood.css`, `mood.js`)

1. **[HIGH] "Log how your day was" is a 2‑step flow.** `mood.html:99‑204`. User taps a band → "Save" + "Add details ↓" appear → user taps again → depth section expands. Should be a single sheet that shows: band picker (top) + depth sliders + emotion chips + impact question, all visible; one **Save** button. Mirror the Habits wizard pattern so the two modules share visual language.
2. **[HIGH] Typography/scale doesn't match Habits.** Compare:
   - Habits card label: 16 px / 700 wt / 0.01 em tracking.
   - Mood `.md-card-label`: 15 px / 600 wt, no tracking. **Fix**: unify via `--card-title-font-size: 16px; --card-title-weight: 700` tokens and use them in both modules.
3. **[HIGH] Band text is hard‑coded `#fff`.** `mood.css:322‑323`. On Prism/Ivory light themes the bands become white‑on‑pastel with bad contrast. **Fix**: `color: color-mix(in srgb, var(--text) 92%, transparent)` — or explicit `--md-band-text` token with a light‑theme override.
4. **[MED] Sleep banner in Mood (`mood.html:89‑93`)** shows static sleep info even if user just logged an hour ago. Either drive it from the same Firestore doc (single source of truth) or remove it — duplicated "at‑a‑glance sleep" confuses the page purpose.
5. **[MED] Emotion chips overflow on 320 px.** `.md-chip-wrap` wraps but with 8 px gap and default 12 px padding a 320 px viewport leaves no room. Add `-webkit-overflow-scrolling:touch` horizontal scroll + fade‑mask on the right edge.
6. **[LOW] No "streak" of logged days.** Mirror the Habits streak flame at the top of the hero (small, not dominant).

### 3.5 Budget (`budget.html`, `budget.css`, `budget.js` = 5,583 lines)

1. **[CRIT] Black‑screen modal bug not yet applied.** `budget-blackscreen-fix-prompt.md` already documents the cause (`closeOverlay()` resets `display: ""`, falling back to the `display:flex` from the base CSS rule, which means the scrim stays on). Ship that fix first. Safe modal pattern:
   ```css
   .bg-overlay{position:fixed;inset:0;z-index:220;display:none;align-items:flex-end;justify-content:center;background:var(--bgt-overlay)}
   .bg-overlay.open{display:flex;animation:fadeIn 160ms ease both}
   .bg-sheet{background:var(--bgt-surface-1);border-radius:var(--r-lg) var(--r-lg) 0 0;transform:translateY(100%);transition:transform 240ms var(--ease-spring);max-height:90vh;overflow:auto}
   .bg-overlay.open .bg-sheet{transform:translateY(0)}
   ```
   Ensure no ancestor creates a stacking context (`position:relative; z-index: 1` on `.bg-main`) — or the scrim will live *behind* it and look "black".
2. **[CRIT] Information overload on the dashboard.** Budget renders 8+ sections (Planner, Bills, Chart, Transactions, Accounts, Goals, Calendar, Trend) stacked vertically on mobile — scroll length easily > 5 000 px. **Fix**: a **first‑run wizard** that lets the user pick which of these cards to show, with a "Manage dashboard" settings section afterwards. Default new‑user layout (§3.5.2.a).
   - **(a) Default new‑user cards (3, in order):** `Hero — Spent this month` / `Top 3 categories` / `Upcoming bills` . Everything else is opt‑in.
   - **(b) Later, power users can toggle:** Savings goals, Net worth, Calendar heat, Trend, Accounts, Recurring. Store as `user.budget.cards = ['hero','top3','bills']` in Firestore; render only those.
3. **[HIGH] UI feels "vibe‑coded" vs. Habits/Sleep.** Typography drift: bg card titles at 14 px/600 vs. Habits at 16 px/700; inconsistent corner radii (12 / 14 / 16 / 20 mixed — should be `--r-md 12` / `--r-lg 16` / `--r-xl 20` only). Spacing: `bg-sheet-head` has `padding: 12px` while `hb-*` equivalents have `16px`. **Fix**: adopt shared component tokens (see §8 "Design tokens") and refactor Budget to use them.
4. **[HIGH] `budget.js` is 5,583 lines.** Code‑smell. Risk of duplicated rendering logic and re‑entrancy bugs (typical source of black‑screen). **Fix** (post‑v1): split into:
   - `budget/state.js` — Firestore sync + reactive store
   - `budget/cards.js` — one `render{Card}` per dashboard widget
   - `budget/wizard.js` — first‑run + settings
   - `budget/sheets.js` — all bottom‑sheet modals (add tx, edit tx, category, goal)
   - `budget/formulas.js` — money math (leave, spent, upcoming, category%)
5. **[MED] FAB speed‑dial uses hidden overflow parent.** `css/pages/budget.css:422` `.bg-fab-wrap{right:var(--sp-4); bottom:max(var(--sp-4),env(safe-area-inset-bottom));z-index:120;display:grid;justify-items:end;gap:var(--sp-3)}`. If any ancestor uses `overflow:hidden` this collapses on keyboard focus. Add `isolation:isolate` on `body` or wrap FAB in a portal‑style fixed div at the root.
6. **[MED] Positive/negative amount colors aren't semantic.** Amounts are all the same neutral. Use `color: var(--success)` (green) for income, `color: var(--danger)` (red) for over‑budget categories, muted for neutral spend — paired with an arrow icon (not color alone, for a11y).
7. **[LOW] No empty state illustration.** New user sees raw zeros. Add a one‑sentence empty state: *"Add your first expense to see your month come to life →"* with a single FAB arrow pointing to +.

### 3.6 Focus (`focus.html`, `focus.css`, `focus.js`)

1. **[CRIT] "Sessions" tab appears empty for all users.** `js/pages/focus.js:461‑480` filters `sessionHistory` by `date === today` *before* loading the remote collection. Depending on the auth timing, `sessionHistory` is empty on first render and the empty state locks in. **Fix**: render a skeleton while loading; subscribe to Firestore changes (`onSnapshot`) instead of a one‑shot `get()`; re‑render when data arrives. Confirm by logging `sessionHistory.length` at render.
2. **[HIGH] No Pomodoro preset UI.** `focus.html:153‑161` has preset buttons with `data-work/data-break` attributes, but the flow never surfaces them as the primary choice. Redesign:
   - Big circular start button in the middle.
   - Row of pills above it: **25/5** (Pomodoro) · **50/10** (Deep) · **90/20** (Ultradian) · **Custom**.
   - "Custom" opens a compact sheet with two steppers (work min, break min) and a preview ("2 × 50 / 10 · 2 h total").
   - Remember last choice per user.
3. **[HIGH] Breathing isn't exposed as a standalone exercise.** Logic (`brState`, `BR_PATTERNS`, `syncBreatheUI`) exists but is only invoked during a break. Add a **third tab** "Breathe" (Timer / Breathe / Sessions), with 3 presets:
   - **Box 4‑4‑4‑4** (calm) · **4‑7‑8** (sleep) · **Coherent 6‑6** (focus)
   - Full‑screen immersive overlay with animated circle, phase label, counter, ambient sound off by default.
   - On completion: haptic + "Great, 3 minutes breathed today" toast, logged as a session of type `breathe`.
4. **[MED] Post‑session feels abrupt.** After a 25‑min work block, the timer flips straight to break. Add a 3‑second "Nice focus! Take a breath." screen with confetti + a one‑tap "Skip to break" / "End session".
5. **[MED] Session history card design is list‑like and ugly.** `.fc-session-row` flexbox with 3 spans. Match Habits list visual — card with colored left bar (accent), two‑line text, right‑side minutes chip.
6. **[LOW] No streaks / daily goal gauge at top.** Home‑page donut uses `settings.dailyGoal` but Focus page doesn't show it visually above the timer. Add a thin ring around the start button (progress toward today's goal).

### 3.7 Plan (`plan.html`, `plan.css`, `plan.js`)

1. **[CRIT] No calendar view — only a task list with date chips.** Current structure is: calendar **strip** (7 days horizontally) + task **list** grouped by date. There is no Day view with a vertical time‑grid and no Week view showing 7 columns of time blocks. **Fix**: introduce a tabbed view:
   - **Today (Day view)** — vertical time grid 00:00–24:00, task/event blocks placed at their `start`/`end`. Tap empty slot to quick‑add.
   - **Week** — 7 narrow columns × time grid. Tap a block to edit; drag to reschedule.
   - **List** — current list kept as an option for users who prefer it.
2. **[HIGH] No quick‑add with natural language.** Fantastical's `"Lunch with Sarah tomorrow 1 pm for 45 min"` pattern is the gold standard. Add a single input at the top of Day view that parses with a small regex/Chrono‑like parser (strings like `today`, `tomorrow`, `lun 15h`, `tue 3pm`, `in 30 min`). This is a big UX multiplier for 50 lines of code.
3. **[HIGH] No drag‑to‑reschedule.** Tasks are only movable via the modal. Long‑press → drag to time/day → drop is what Google Calendar, TickTick, and Todoist ship on mobile. Implement in Day/Week view using pointer events.
4. **[MED] Priority colors hard‑coded.** `plan.css` uses `#9a1c1c`, `#059669`, `#dc2626`, etc. Move to `--prio-high/med/low` tokens defined per theme.
5. **[MED] Modal form stacks badly at 375 px.** `.pl-time-row` contains 3 inputs in one row. Stack column under 400 px and bump label size.
6. **[MED] Carry‑over UX lacks preview.** `"You have unfinished tasks from previous days"` has no count or preview. Show `"3 unfinished tasks from yesterday"` with a collapsible list before the "Bring to today" button.
7. **[LOW] FAB can occlude last task.** Add `scroll-padding-bottom: 96px` on `.pl-main` and ensure FAB `z-index: 80`.

---

## 4) The mandatory bug fixes (do these first)

Do these in order; each one is cheap and unblocks QA.

| # | Module | Fix | Effort |
|---|--------|-----|--------|
| 1 | Budget | Apply documented black‑screen modal fix. | 30 min |
| 2 | Core   | Fix i18n `{placeholder}` interpolation in `js/core/i18n.js`. | 30 min |
| 3 | Sleep  | Enlarge mobile time‑picker targets (72 × 56 px) + re‑enable native OS wheel on tap. | 1 h |
| 4 | Sleep  | Clamp bedtime recs to cycles ∈ {4,5,6}; show "Under 6 h" red banner if chosen. | 1 h |
| 5 | Focus  | Fix empty‑state flash by subscribing with `onSnapshot` + skeleton while loading. | 1 h |
| 6 | Habits | Split suggestions by `intent: build | quit | maintain`; change "Done" → "Stayed strong" for quit. | 2 h |
| 7 | Global | Add `@media (prefers-reduced-motion)` to `base.css`. | 10 min |
| 8 | Auth   | Swap `browserSessionPersistence` for `browserLocalPersistence` before launch. | 5 min |

---

## 5) The redesign work (Phases B and C)

### Phase B — Budget + Focus + Plan polish (≈ 8–12 days)
- Budget wizard + opt‑in cards, typography/spacing tokenization, split `budget.js` into modules, positive/negative semantic colors, empty states.
- Focus: timer hero redesign, preset pills + custom stepper, "Breathe" third tab with 3 presets, post‑session confetti moment, session list re‑skin.
- Plan: Day / Week / List tabs, natural‑language quick‑add, drag‑to‑reschedule, carry‑over with preview.

### Phase C — 10/10 delight (≈ 5–7 days)
- Shared micro‑interactions (confetti, streak flame, haptic where supported).
- Identity‑based framing on Habits.
- Hero strip for Sleep ("🌙 22:30 → ☀ 07:00 · 8 h 30 m").
- Landing light theme + SVG illustration variants.
- Theme picker with 4 mini‑UI previews.
- A `prefers-reduced-motion` full pass.

---

## 6) Research‑backed 4‑theme palette (full tokens)

Distinct story for each theme: Midnight (cool dark) · Terra (warm dark) · Prism (clean light) · Aurora (twilight accent‑driven). Contrast ratios are vs. body text; all clear WCAG AA, most AAA. Full details + references in the companion Codex prompt.

### 6.1 Midnight — refined (Dark 1)
```
--bg:              #050810
--panel:           #0A0E1A
--panel2:          #0F1426
--surface:         #131829
--text:            #E6E8ED
--text-secondary:  #A0A4B2
--text-muted:      #6B707F
--border:          #1F2537
--input-bg:        #0F1426
--input-border:    #2A3347
--input-focus:     #3A4461
--shadow-sm:       0 1px 2px rgba(0,0,0,0.4)
--shadow-md:       0 4px 12px rgba(0,0,0,0.5)
--shadow-lg:       0 12px 24px rgba(0,0,0,0.6)
--shadow-xl:       0 20px 48px rgba(0,0,0,0.7)
--shadow-accent:   0 0 16px rgba(52,211,153,0.15)
```
Body‑on‑bg 16.8 : 1 (AAA). Reference: Oura, Linear "Woodsmoke".

### 6.2 Terra — warm sepia dark (Dark 2, replaces Obsidian)
```
--bg:              #0D0B08
--panel:           #14110D
--panel2:          #1C1814
--surface:         #21191A
--text:            #EFE8E0
--text-secondary:  #B8AEA0
--text-muted:      #8A7F75
--border:          #2A2218
--input-bg:        #1C1814
--input-border:    #3A3028
--input-focus:     #4A3F35
--shadow-sm:       0 1px 2px rgba(0,0,0,0.5)
--shadow-md:       0 4px 12px rgba(0,0,0,0.6)
--shadow-lg:       0 12px 24px rgba(0,0,0,0.7)
--shadow-xl:       0 20px 48px rgba(0,0,0,0.8)
--shadow-accent:   0 0 16px rgba(245,158,11,0.2)
```
Body‑on‑bg 15.6 : 1 (AAA). Reference: Bear, Reeder, Notion warm‑dark.

### 6.3 Prism — clean cool light (Light 1, replaces Arctic)
```
--bg:              #FAFBFC
--panel:           #FFFFFF
--panel2:          #F3F4F6
--surface:         #E5E7EB
--text:            #0D1117
--text-secondary:  #57606A
--text-muted:      #8B949E
--border:          #D0D7DE
--input-bg:        #FFFFFF
--input-border:    #D0D7DE
--input-focus:     #E1E4E8
--shadow-sm:       0 1px 3px rgba(0,0,0,0.08)
--shadow-md:       0 4px 6px rgba(0,0,0,0.10)
--shadow-lg:       0 12px 16px rgba(0,0,0,0.12)
--shadow-xl:       0 20px 25px rgba(0,0,0,0.15)
--shadow-accent:   0 0 0 3px rgba(34,211,238,0.10)
```
Body‑on‑bg 15.2 : 1 (AAA). Reference: Linear, Arc, GitHub light.

**Accent‑on‑light caveat:** emerald/indigo/violet/cyan all fall below 4.5 : 1 on pure white. When used as *text* (not background), swap to darker variants:
- Habits `#34D399` → `#0D9488`
- Budget `#F59E0B` → `#B45309`
- Sleep  `#818CF8` → `#4338CA`
- Mood   `#A78BFA` → `#6D28D9`
- Focus  `#F97316` → `#C2410C`
- Plan   `#22D3EE` → `#0E7490`
- Quit   `#FF5252` → `#B91C1C`
Keep bright versions for badges, chart fills, and icons.

### 6.4 Aurora — twilight accent‑driven (Light 2 slot, replaces Ivory)
```
--bg:              #0F1729
--panel:           #131F35
--panel2:          #1A2847
--surface:         #1F3255
--text:            #E6E9F5
--text-secondary:  #9BA6BE
--text-muted:      #6B7A94
--border:          #293349
--input-bg:        #1A2847
--input-border:    #3A4A68
--input-focus:     #4A5A78
--shadow-sm:       0 1px 3px rgba(0,0,0,0.4)
--shadow-md:       0 4px 12px rgba(0,0,0,0.5)
--shadow-lg:       0 12px 24px rgba(0,0,0,0.6)
--shadow-xl:       0 20px 48px rgba(0,0,0,0.7)
--shadow-accent:   0 0 20px rgba(167,139,250,0.25)
```
Body‑on‑bg 14.1 : 1 (AAA). Reference: Raycast dark, Material‑You dynamic.

### 6.5 Image / illustration adaptation
- **Midnight / Terra / Aurora** — SVGs using `currentColor` inherit from `--text`; raster PNG heroes get a subtle 15–25 % gradient overlay from `--bg` to the module accent.
- **Prism** — needs *light* variants of any dark‑baked PNG. SVGs using `currentColor` work automatically.
- **Landing page SVG slides** (`index.html:210‑588`) — add `data-theme="light"` variants of strokes that are hard‑coded to white/rgba(255,…).

---

## 7) Habit suggestion lists (ready to drop into `habits.js`)

Intent‑aware arrays. Ship both EN and FR.

### 7.1 Build (start)
EN: Drink 8 glasses of water · 20‑min walk · Read 20 min · Meditate 5 min · Journal · Stretch or yoga · Sleep by 23:00 · Eat a healthy breakfast · Gratitude (3 things) · No phone after 21:00 · Morning pages · Cold shower · Cook a meal · Visualize goals · Practice a skill.
FR: Boire 8 verres d'eau · Marche de 20 min · Lire 20 min · Méditer 5 min · Tenir un journal · Étirements ou yoga · Dormir avant 23 h · Petit déjeuner sain · Gratitude (3 choses) · Pas de téléphone après 21 h · Morning pages · Douche froide · Cuisiner un repas · Visualiser mes objectifs · Pratiquer une compétence.

### 7.2 Quit (stop)
EN: Quit smoking · Reduce added sugar · Stop doomscrolling · No late‑night snacking · No caffeine after 14:00 · Stop procrastinating · Less social media · Drink less alcohol · Stop negative self‑talk · No binge eating · Stop impulse shopping · No screens in bed · Stop nail biting · Quit perfectionism · Less gaming.
FR: Arrêter de fumer · Réduire le sucre ajouté · Arrêter le doomscrolling · Pas de grignotage tardif · Pas de caféine après 14 h · Arrêter de procrastiner · Moins de réseaux sociaux · Moins d'alcool · Arrêter l'auto‑critique · Arrêter les excès alimentaires · Arrêter les achats impulsifs · Pas d'écran au lit · Arrêter de se ronger les ongles · Arrêter le perfectionnisme · Moins de jeux vidéo.

### 7.3 Maintain
EN: Keep flossing · Keep my gym routine · Keep a consistent sleep schedule · Keep eating veggies · Keep journaling · Keep meditating · Keep learning a language · Stay hydrated · Keep a tidy workspace · Keep reading · Keep taking vitamins · Keep practicing gratitude · Keep stretching · Keep in touch with friends · Keep regular dinner time.
FR: Continuer la soie dentaire · Maintenir ma routine de gym · Maintenir mon horaire de sommeil · Continuer à manger des légumes · Continuer à tenir mon journal · Maintenir la méditation · Continuer d'apprendre une langue · Rester hydraté·e · Garder mon espace de travail rangé · Continuer à lire · Continuer mes suppléments · Maintenir la gratitude · Maintenir mes étirements · Garder le lien avec mes amis · Maintenir une heure de dîner régulière.

### 7.4 Copy for quit flow
- Completion button (per day) → **"Stayed strong" / "Tenu bon"**
- Hero timer → **"Day 14 without smoking" / "Jour 14 sans fumer"**
- Celebration toasts on 1 d / 3 d / 7 d / 30 d / 90 d milestones.
- Never say "Failed" or "Echec" — on a missed day: **"Reset — a fresh start" / "On repart à zéro, ça arrive"**.

---

## 8) Shared component tokens (to align Habits / Sleep / Mood / Budget / Focus / Plan)

Add to `tokens.css`:
```css
:root{
  /* Shared card */
  --card-radius: var(--radius-2);
  --card-padding: var(--space-4);
  --card-title-size: 16px;
  --card-title-weight: 700;
  --card-title-tracking: 0.01em;
  --card-subtitle-size: 13px;
  --card-subtitle-color: var(--muted);

  /* Sections */
  --section-gap: var(--space-6);
  --section-header-gap: var(--space-3);

  /* Buttons */
  --btn-height-md: 44px;
  --btn-height-lg: 52px;
  --btn-radius: var(--radius-full);

  /* Inputs */
  --input-height: 48px;
  --input-radius: var(--radius-2);
  --input-focus-ring: 0 0 0 3px color-mix(in srgb, var(--brand) 22%, transparent);

  /* Touch targets */
  --tap-min: 44px;

  /* Module‑on‑light text color (for Prism) */
  --on-light-habit:  #0D9488;
  --on-light-budget: #B45309;
  --on-light-sleep:  #4338CA;
  --on-light-mood:   #6D28D9;
  --on-light-focus:  #C2410C;
  --on-light-plan:   #0E7490;
  --on-light-quit:   #B91C1C;
}
```
Then run a sweep across `habits.css / sleep.css / mood.css / focus.css / budget.css / plan.css` to replace hand‑tuned values with these tokens.

---

## 9) Research sources (cited in findings)

Sleep: AASM ≥ 7 h guideline; National Sleep Foundation 7–9 h; Oura chronotypes; Apple Health curved slider; Pillow sleep rings.
Focus: Cirillo Pomodoro 25/5; ultradian 90/20; Focus Keeper tactile UI; Session reflection prompts; box 4‑4‑4‑4 and 4‑7‑8 breathing (Navy SEAL reference).
Calendar: Fantastical natural language; Google Calendar drag‑to‑reschedule; TickTick/Todoist time‑blocking; SetProduct calendar UI patterns.
Budget: Monarch / Rocket Money customizable widgets; Material 3 bottom sheets; NN/g bottom‑sheet guidelines.
Habits: James Clear "Atoms" (identity‑based); Finch; Habitify; Quitzilla (quit‑specific).
Color: WCAG 2.2 1.4.3; WebAIM contrast checker; Linear redesign notes on LCH; Raycast colors; Notion warm‑dark.

(Full URL list was collected by the research agents and is embedded in the Codex prompt.)

---

## 10) Definition of "10 / 10"

Hbit reaches 10 / 10 when, on a 375 px iPhone screen:

1. Every page responds in < 300 ms and never shows flash‑of‑unstyled or "black screen" modals.
2. Every module has: a polished empty state, a first‑run guided flow, streaks / feedback on success, `prefers-reduced-motion` respected.
3. Each of the 4 themes feels genuinely different (one cool‑dark, one warm‑dark, one clean‑light, one accent‑driven).
4. Sleep never recommends < 6 h.
5. Budget shows 3 cards by default and up to 8 by user choice.
6. Focus has Timer / Breathe / Sessions.
7. Plan has Day / Week / List and drag‑to‑reschedule.
8. Mood logs fully in one modal.
9. Habits separates build / quit / maintain with intent‑correct copy and an overflow‑safe heatmap.
10. `{placeholder}` renders its value; all user‑visible strings are in i18n EN + FR.

Hit those ten and the app feels — rightly — premium.
