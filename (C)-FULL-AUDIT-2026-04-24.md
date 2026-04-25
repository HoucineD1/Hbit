# (C) Hbit — Full Audit, April 24 2026

> Produced from: live walkthrough at `https://hbit-202603.vercel.app` (mimi@gmail.com), full code read across `js/`, `css/`, every `*.html`, and Firebase config. Tested at 1440×900 desktop. Mobile assessed via CSS breakpoint analysis.

---

## TL;DR — verdict

**Overall today: 5.4 / 10.** You have a great skeleton (auth, Firebase wiring, 6 module split, dark theme tokens, sidebar, cross-module hooks). You have a *very* unprofessional surface: the breathing tool is broken, the planner is generic, several pages have rendering bugs you'd never ship to investors, the dashboard has a placeholder-looking summary line, color rules are violated, and typography hierarchy is weak.

Hbit can be 10/10. It is not 10/10. It is **demo-grade, not investor-grade**.

To get to 10/10 user-and-investor-ready, three things have to happen, in order:

1. **Stop the bleeding** — fix the seven critical bugs (below) so nothing looks broken.
2. **Earn the premium** — typography overhaul, a single canonical card system, motion, and one *signature* feature per module that nobody else has.
3. **Tell the story** — onboarding, empty states, weekly auto-generated insight cards that *prove* the cross-module thesis (Habits × Sleep × Mood × Budget).

Detail below. Module grades, bug inventory, Plan rebuild spec, breathing fix, investor scorecard, and a 4-wave roadmap.

---

## 1. Module-by-module grades

| Module | UI /10 | Function /10 | Mobile /10 | Notes |
|---|---|---|---|---|
| Landing (`index.html`) | 7.5 | 8 | 7 | Strong hero, decent carousel, eyebrow + chips work. Slightly generic feature copy, no social proof, no real product screenshots. |
| Login / Signup | 7 | 7.5 | 7 | Two-column with side benefits is good. Auth uses **SESSION persistence** (re-login every browser close) — *kill this for prod*. Apple/Google buttons present but unverified. |
| Dashboard / Home | 5.5 | 6 | 5 | Dashboard cards are clean BUT the kicker line reads `Habits 0/4 Slept -- Mood 2/10 $200 Focus 0/3 Planned 0` — the `Slept --` and naked `$200` look like an unfinished placeholder. Weekly Summary ring is good. No greeting personalization beyond "Mimi". No insight cards. |
| Habits | 7 | 7.5 | 7 | Best module. GitHub-style heatmap, progress ring per card, category chips, archived state. "Stayed strong / Done" CTA is a nice touch. Lacks: social streak share, smart suggestions, link-to-plan. |
| Budget | 5 | 6 | 5 | $1,200/$1,400 budget left visualization is solid. **Color violation** — "Spending by category" donut renders **cyan** (Plan accent) instead of amber. Two add-points (FAB + speed-dial) competing. "Day 4" chip is unexplained. Setup checklist (3/5) is actually nice. Native `<select>` for currency. Light theme has only **11** override rules — visibly broken. |
| Sleep | 6.5 | 6 | 6 | Tonight's plan card with sleep/wake times is clean. "Find your ideal bedtime" calculator is a real differentiator. Side panel "Connect your device — Oura, Apple Watch, Fitbit, Garmin" is **vapor** (no integrations exist) — investors will ask. Cross-promo to State of Mind is smart. |
| State of Mind (Mood) | 6 | 6 | 6 | Calendar mood-map is a nice Apple-Health-y artifact. **Color violation** — FAB renders amber, should be violet (#A78BFA). Avatar shows "H" instead of user initial. 5-step pleasant scale is correct. Lacks: triggers/notes per entry, weekly digest. |
| Focus / Zen Timer | 4 | 4.5 | 5 | **Two confirmed bugs** (see §2). Timer ring + presets are decent. Sessions tab with weekly bars is fine. Side panel intent + preset grid feels desktop-only. |
| Plan / Planner | 3.5 | 4 | 4 | The user's complaint is correct. See §3 — full rebuild spec. |

**Average UI: 5.7 · Average Function: 6.1 · Average Mobile: 5.7 → composite ~5.8/10.**

---

## 2. Critical bug inventory (severity-ranked)

### P0 — embarrassing, fix before anyone touches the app

1. **Focus → Breathe tab looks empty.** The 3 breathing-card buttons exist in DOM (verified: `cardCount: 3, opacity: 1, visibility: visible`) but they render at `y = 822px` while the viewport ends around `y = 812px`. The Timer panel reserves vertical space that pushes Breathe content **below the fold**. Cause: `.fc-cockpit` height is preserved across panels because both are children of the same `.fc-main` flow without `display:none` on inactive panels (only `hidden` + opacity). Fix: when a tab is inactive, set `display: none` on the panel (not just `hidden`), OR move the panel into a sibling that owns its own scroll/height. (`css/pages/focus.css` line 110, `js/pages/focus.js` line 482.)

2. **Focus → Timer view leaks "Inhale" overlay onto the "25:00" countdown.** The `#fcBrDisplay` has `position: absolute` and stays in the DOM with `display: flex` even when `hidden=true` and `opacity:0`. Bounding rect overlap is **confirmed**: timer at `y=406, h=82`, breath display at `y=416, h=65`. There is a brief flash on initial render before JS sets opacity:0, and during break/work phase transitions the two readouts can collide. Fix: render the breath display as a child of `.fc-timer-inner` *replacing* the time display when active (state machine, not stacked layers), or set `display:none` when not the active phase. (`focus.html` lines 108–114.)

3. **Dashboard kicker is broken/placeholder-looking.** `Habits 0/4 Slept -- Mood 2/10 $200 Focus 0/3 Planned 0` is a concatenation that breaks down on null states (`Slept --`, naked `$200` with no label, `Planned 0`). Replace with a labeled, separated, copy-pattern: `Habits 0/4 · Sleep — · Mood 2/10 · Spent $200 · Focus 0/3 · Plan 0`. Or better: kill it and use the cards below as the source of truth.

4. **Color/accent violations break brand promise.** Per your `CLAUDE.md` you've enshrined accent colors per module:
   - Budget donut chart renders **cyan** (Plan's color) instead of **amber #F59E0B**.
   - Mood FAB renders **amber** (Budget's color) instead of **violet #A78BFA**.
   - Plan calendar selected day uses **cyan** correctly, but the "All" filter chip uses **emerald** (Habits) — should be cyan or neutral.
   These are 30-minute fixes but they signal that there is no design system enforcement.

### P1 — visibly weak, fix this sprint

5. **Plan modal uses native unstyled controls.** `<select>` for Priority, `<input type="time">`, `<input type="number">` all render with browser defaults. On Chrome desktop they look fine; on Safari / mobile Safari / iOS PWA they break. Replace with custom segmented controls (priority), a custom time picker, and a stepper for duration.

5b. **Tap targets below 44px.** 10 buttons measured below the WCAG 2.1 / Apple HIG 44×44 minimum, including the 3 Focus tabs (36px tall), the 32px theme toggle, sidebar item buttons. iOS guideline = 44pt, Material = 48dp.

6. **Light theme is incomplete on Plan and Budget.** Override-rule counts: Habits 37, Sleep 31, Focus 28, Mood 26, Budget 11, Plan 8. You can verify by toggling light theme and watching black backgrounds bleed through.

7. **Auth uses SESSION persistence** (`firebase-init.js:26-28`). User logs out every time they close the tab. CLAUDE.md says it's intentional for dev, but if any of this audit's URL test users come back tomorrow they will need to log in again. Investors evaluating the product won't know that. Switch to `LOCAL` persistence for prod, gate by env.

8. **i18n breakage on shared layouts.** Budget header simultaneously shows English (`Left to spend`, `Income`, `Spent`) AND French abbreviations (`AVRIL 2026`, `VEN. 24 AVR.`) on the same screen, regardless of language toggle. Date formatting is locale-aware; copy isn't. Decide: either both or neither.

9. **Sleep "Connect your device" is vaporware.** Showing Oura / Apple Watch / Fitbit / Garmin chips with "INTEGRATIONS COMING SOON" is fine on the roadmap page but on the main Sleep tab it tells users *you do less than you do*. Remove from the active surface or move to a "Coming soon" lane in Settings.

### P2 — polish gaps that separate good from great

10. Plan: `Colors` legend is mislabeled — those are **priorities**, not "colors". Rename the kicker to `Priority`.
11. Plan: Two add-task buttons (FAB + bottom black `+`) appear simultaneously. Pick one.
12. Plan: empty state copy is OK but generic. Differentiate.
13. Mood: avatar shows `H` not the user's first initial.
14. Focus tab tabs render at 36px height — bump to 40–44.
15. Budget setup checklist with 3/5 done is excellent — promote that pattern to other modules.
16. Habit cards: inconsistent label between "Stayed strong" and "Done" — pick one verb system.
17. No global loading skeletons consistent across pages. Plan has them, others don't.
18. Sidebar collapse button visible at top-left has tiny tap target.

---

## 3. Plan module — full rebuild spec (your top complaint)

### What's wrong now

Plan today is: **a calendar strip + a flat list of cards + a barebones modal**. That's task management v0. Compare to what users expect from Sunsama, Motion, Things 3, Cron, Reclaim — Plan today does none of the things that *make* a planner.

**Specific UI/UX problems observed live:**
- Date strip days (TUE/21) — weak hierarchy, weekday and number compete instead of one being primary.
- Three overview cards (Selected date / Next up / Colors) waste massive vertical space when empty. On mobile, this is the entire above-the-fold real estate.
- Banner "You have unfinished tasks from previous days" + button "Bring to today" is a great concept but lives outside the timeline. It should live IN the timeline as a "Carry-over" card with a swipe action.
- The empty state is well-written but kicks in instead of showing the empty timeline grid — a first-time user has no idea *what the planner will look like* once it has tasks.
- The "Add Task" modal: title underline (Material), unstyled time/select (browser default), no project, no recurrence, no subtasks, no link-to-habit, no reminders, no estimated effort, no tags, no drag-handle.
- After creating a task, the timeline is just chronological lines. No daily focus blocks. No collision warning rendered visually. No "now" indicator. No drag-to-reschedule.

### What 10/10 looks like

A planner you'd see in a YC pitch:

1. **Day grid as the hero.** Replace the flat list with a vertical hour-grid (06:00 → 23:00) on the left rail. Tasks appear as colored blocks of their `duration`, like Google Calendar. A red **"now" line** sweeps across in real time.
2. **Drag to reschedule, drag corner to resize.** Tasks become tactile.
3. **Task cards inline-editable.** Tap to expand, tab through fields, no modal for fast capture.
4. **Quick-add bar at the top.** Single input. `Workout 7am 45m high #fitness` parses naturally → time, duration, priority, tag, plus a button to confirm. Steal from Sunsama.
5. **Right rail = Daily focus and time accounting.** "Planned 4h 15m / 8h available". Bar fills. A "What's the one thing?" intent input mirrors the Focus module — answer once, both modules pick it up.
6. **Carry-over → in-timeline.** Render past-undone tasks as ghost blocks at the top of today with a single "Bring forward" CTA per block.
7. **Habit integration.** Today's scheduled habits (you already compute `loadTodaysHabits()`) appear in the timeline as recurring slots, color-coded emerald, ticked from the same place.
8. **Weekly view + agenda view + month heat-map.** Three tabs above the date strip.
9. **Templates.** "Morning routine", "Deep work day", "Friday review" — apply with one tap.
10. **A real Add Task sheet** (mobile bottom-sheet, desktop side-panel):
    - Title (big, autofocus)
    - Segmented Priority (Low / Med / High) with the dot color rendered inline
    - Time picker (custom wheel on mobile, popover on desktop)
    - Duration stepper (15 / 30 / 45 / 60 / 90)
    - Recurrence (Once / Daily / Weekdays / Weekly / Custom)
    - Link to habit (dropdown of user's active habits)
    - Subtasks (max 5)
    - Notes (markdown lite)
    - Tags
    - Save defaults to "Today, 60m, Medium, no link" so the fast path is one input + Enter.

### Code direction

`js/pages/plan.js` already has clean state management (`state.tasks`, `state.taskMapByDate`, `priorityRank`, `hasConflict`, sort-by-time). Keep all of this. The work is mostly **render layer + new fields + timeline grid**:

- Add a `view` state: `"day" | "week" | "agenda"`.
- New `renderDayGrid()` that produces 18 hourly rows; absolute-positioned task blocks with `top = hourOffset * 56px + minutes * (56/60)px`, `height = duration * (56/60)px`.
- `renderNowLine()` updates every 60s.
- Drag handlers using pointer events (not jQuery, vanilla — same 0-deps rule).
- Extend the `task` schema: add `recurrence`, `habitId`, `subtasks: []`, `tags: []`. Forward-compat: persist as new fields, default to undefined.
- Replace native `<select>` and `<input type="time">` with custom components scoped under `pl-` so they don't bleed.

---

## 4. Breathing exercise — the fix

You have **two breathing surfaces** and they fight each other:

- **A.** Inline breath display inside the timer ring (`#fcBrDisplay`) — meant to show during break phase.
- **B.** Full-screen `.fc-breath-overlay` (`#fcBreathOverlay`) — separate, opens when a Breathe-tab card is tapped.
- **C.** Breathe tab cards (`#fcPanelBreathe > .fc-breathe-grid`) — pickers for Box / 4-7-8 / Coherent.

Today (A) leaks visually onto the timer, (B) probably works but you can't reach it because (C) renders below the viewport.

**Fix sequence:**

1. **Make the Breathe tab content visible.** In `setActiveTab(tab)` (focus.js:468), do `panel.style.display = tabName === thisName ? 'flex' : 'none'` for each panel — not just `hidden`. The Timer's reserved height is what's pushing Breathe down.
2. **Stop layering breath display over timer.** In `focus.html` at lines 108–114, refactor to a state machine:
   - `<div id="fcDisplay"></div>` — single slot
   - JS swaps `innerHTML` between time-fmt and breath-fmt based on `phase === 'breathe'`
   - Remove `position:absolute` from `.fc-br-display`
3. **Build the breathing animation.** The full-screen overlay (`#fcBreathOverlay`) has all the markup. The circle should scale + opacity-pulse using CSS animation timed to the pattern: Box (4-4-4-4) = 16s loop, 4-7-8 = 19s loop, Coherent (6-6) = 12s loop. Add `prefers-reduced-motion` opt-out.
4. **Haptics on mobile.** You already have `navigator.vibrate` hint copy ("device vibrations will guide your rhythm screen-free"). Wire it: `vibrate([200])` at each transition. PWA + iOS won't get vibration; that's fine — the visual is enough.
5. **End early + completion confetti.** Confetti import is already there (`confetti.js`). Trigger on `End early` only if 60s+ completed.

A Calm-app-grade breathing experience here is a 1–2 day fix and turns Focus into a real wellness module.

---

## 5. Code architecture & quality — assessment

| Area | Grade | Notes |
|---|---|---|
| File org | 8/10 | `js/core/` for shared, `js/pages/` per page, mirroring CSS — clean. |
| State management | 7/10 | Each module owns its `state` object — fine for vanilla. Some duplication between modules. |
| Firebase wiring | 7.5/10 | Compat SDKs (v10.14) loaded per page — heavy. Every page pulls auth + db + firestore. Consider `firebase-app-lite` and lazy module loading. Auth listener + onSnapshot subscriptions look correct. |
| Bundle weight | 5/10 | `i18n.js` is 2611 lines — biggest single JS file. `mood.js` 1242, `sleep.js` 2043, `habits.js` 1880, `budget.js` 5648 (!). Budget alone is a single mega-file and is the file you complained about most. Split it: `budget-state.js`, `budget-render.js`, `budget-modals.js`. |
| CSS architecture | 6/10 | Tokens in `tokens.css`, components in `components.css`, per-page override files. But the per-page CSS is enormous (`landing.css` 2515 lines, `sleep.css` 2003, `habits.css` 1561). Lots of one-off hand-rolled CSS that *should* be using shared component classes. |
| Light theme coverage | 4/10 | Plan: 8 rules. Budget: 11. You're missing dozens of overrides. |
| Accessibility | 6/10 | You have `aria-label`, `role`, skip-link, `aria-live` regions in Plan — good. But 10+ tap targets under 44px and several SVG icons without `aria-hidden`. |
| Error handling | 7/10 | `showPlanError()` with retry callback is the *right* pattern. Generalize. |
| i18n | 5/10 | `tr()` + interpolation is solid. But mixed-language renders (Budget) prove plumbing is unwired in places. The `data-i18n-aria-label` attributes aren't always honored. |
| SEO / meta | 7/10 | OG tags, JSON-LD WebApplication schema, robots. Canonical points to `hbit-d62a6.web.app` while you're hosting at `vercel.app` — fix. |
| Performance | n/a | Not measured live. Likely fine on desktop, untested on 3G mobile. Run Lighthouse. |
| Tests | 0/10 | No tests anywhere. For investor diligence this is the single biggest red flag. Add 1 Playwright smoke test per module. |

---

## 6. UI / typography — what "police weak" really means

You said the typography looks weak. Here's why:

- You're loading DM Sans 400/500/600/700/800 + italic. Good choice for a personal app — but **you under-use weight contrast**. Big numbers like `$1,200` on Budget should be 800 weight + tighter letter-spacing (-0.02em). Headings like "Planner" use 700 — but supporting text is 500 with no contrast.
- **No type scale enforcement.** Pages use ad-hoc px sizes (28, 32, 36, 18, 16, 14, 13, 12, 11) freely. Lock down to a 1.25 modular scale: 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56.
- **Numerals are not tabular.** Add `font-variant-numeric: tabular-nums` everywhere a number changes (timer, money, count). Right now `$1,200.00` flickers width as digits change.
- **No optical sizing.** DM Sans is variable opsz-aware. Add `font-optical-sizing: auto` on `body` so headlines look tighter and body text looks wider.
- **Big-money numbers should be a *display* font feel.** Consider pairing DM Sans with a display variant — *Inter Display* or *Space Grotesk* — for the hero numbers only. One pairing site-wide.
- **Line-height too loose for headlines.** `<h1>` at line-height 1.4 on a hero looks soft. 1.05–1.15 for headlines, 1.5 for body.

This single typography pass alone is worth +0.5 on every UI grade.

---

## 7. Investor-readiness scorecard

| Pillar | Today | Target | Gap |
|---|---|---|---|
| Brand & polish | 5 | 9 | Color-system enforcement, type scale, motion system, no rendering bugs. |
| Differentiated wedge | 6 | 9 | Cross-module insights ("you sleep worse on days you spent over budget") are the wedge. Hbit promises this in copy but doesn't *show* it anywhere. Build a Weekly Insight card on the dashboard. |
| Activation / onboarding | 4 | 9 | After signup, user lands on home with empty cards. There is no module-walkthrough, no first-task seed, no "pick your 3 habits" wizard. Add a 60-second onboarding. |
| Retention loop | 4 | 8 | Streaks exist on Habits but not other modules. No notifications/reminders system. No weekly digest email. |
| Bilingual | 6 | 9 | French is real but mid-render mixed strings break trust. |
| Mobile | 5 | 10 | This is a phone product. PWA manifest exists; install flow not tested. Bottom-tab nav on mobile would help (today: hamburger sidebar). |
| Privacy / data | 7 | 9 | Firestore rules exist. Add a data export and a "delete my account" flow — investors and GDPR will ask. |
| Reliability | 6 | 9 | No telemetry, no error tracking. Add Sentry or Logflare. |
| Tests | 0 | 7 | At least Playwright smoke tests per module. |

**Investor-readiness today: 4.5 / 10.** Investor-ready threshold: 8 / 10.

---

## 8. The 4-wave roadmap to 10/10

### Wave 1 — Stop the bleeding (1 week)
- [ ] Fix Breathe-tab fold issue (`display:none` on inactive panels).
- [ ] Fix breath-display layering on Timer (state machine, not stacked).
- [ ] Fix dashboard kicker line — labeled and separated.
- [ ] Fix 3 color-accent violations (Budget donut, Mood FAB, Plan filter).
- [ ] Replace native `<select>` and `<input type="time">` everywhere with styled components.
- [ ] Bump tap targets to 44px minimum across sidebar, tabs, theme toggle.
- [ ] Switch Firebase auth persistence to `LOCAL` for prod.
- [ ] Remove Sleep "Coming Soon" integrations from main surface.
- [ ] Add Sentry (or equivalent).

### Wave 2 — Plan + Focus rebuild (2 weeks)
- [ ] Plan day-grid view with hourly rails, drag-to-reschedule, now-line, color-coded blocks.
- [ ] Plan extended schema: recurrence, habitId, subtasks, tags.
- [ ] Plan quick-add parser ("Workout 7am 45m high #fitness").
- [ ] Plan task sheet redesign (no modal — inline expand on desktop, bottom-sheet on mobile).
- [ ] Focus breathing animation (3 patterns × visual circle × haptics).
- [ ] Focus + Plan share the daily intent ("the one thing").

### Wave 3 — Premium feel (2 weeks)
- [ ] Type scale lock-down + variable-font optical sizing + tabular-nums.
- [ ] Motion system: 200ms / 320ms / 480ms tiers with `cubic-bezier(0.2, 0.8, 0.2, 1)`. Apply to card hover, tab switch, modal open, ring fill.
- [ ] Light theme completed for Plan, Budget (parity with Habits).
- [ ] Component library: a single `Card`, `Stat`, `Pill`, `Sheet`, `Sheet-form-row` used everywhere — kill page-specific CSS where possible.
- [ ] Skeleton loaders consistent across pages.
- [ ] Mobile: bottom-tab nav, swipe-back gesture.

### Wave 4 — The wedge (2 weeks)
- [ ] **Weekly Insights Engine.** Cron-job once a week: synthesize cross-module data and publish 3 cards on the home dashboard. Examples:
  - "Days you exceeded your budget, you slept 38m less on average."
  - "Your best mood weeks correlate with 4+ habit completions on Mon-Wed."
  - "You complete 70% more focus sessions when you logged a habit before noon."
- [ ] Onboarding wizard: pick goals, pick 3 habits, sleep target, monthly budget, first focus block.
- [ ] Streak system across all modules (today only Habits has it).
- [ ] Weekly Digest email (Friday 5pm) — links to dashboard with insight of the week.
- [ ] Public-facing landing page case studies + 3 product screenshots (real, not fake).
- [ ] Tests: 1 Playwright smoke test per module.

When all four waves ship: **9.5 / 10** UI, **9 / 10** functionality, **9 / 10** investor-ready.

---

## 9. Specific code locations to fix first

| File | Line | What to do |
|---|---|---|
| `js/core/firebase-init.js` | 26-28 | Switch to `LOCAL` persistence (gate by env). |
| `js/pages/focus.js` | 468-487 | In `setActiveTab`, set `panel.style.display = active ? 'flex' : 'none'`. |
| `focus.html` | 108-114 | Make `#fcTimeDisplay` and `#fcBrDisplay` mutually exclusive — single slot. |
| `css/pages/focus.css` | 372 | Remove `position:absolute` from `.fc-br-display`. |
| `js/pages/home.js` | (kicker render) | Replace concat string with labeled, null-aware fields. |
| `js/pages/budget.js` | (donut) | Stroke color must be `--budget-accent` not `--plan-accent`. |
| `js/pages/mood.js` | (FAB) | Background must be `--mood-accent`. |
| `plan.html` | 114-122 | `Colors` kicker → `Priority`. |
| `plan.html` | 161-164 + bottom `+` | Remove duplicate add button. |
| `js/pages/plan.js` | 357-445 | Replace `renderList` with `renderDayGrid` view path; keep `renderList` as agenda view. |
| `css/pages/plan.css` | 597+ | Add tablet/mobile breakpoints; current set is 600/479/390/1024 — fine but Plan content doesn't use them aggressively. |
| `firestore.rules` | (root) | Lock down per-uid only; add an export-data scope. |

---

## 10. References used

- Live walkthrough: `https://hbit-202603.vercel.app/{login,home,habits,budget,sleep,mood,focus,plan}.html`, logged in as `mimi@gmail.com`
- DOM/computed-style introspection on Focus and Plan pages (pages where bugs were suspected)
- Code: `js/core/*.js`, `js/pages/*.js`, all `*.html`, `css/core/*.css`, `css/pages/*.css`, `firebase.json`, `firestore.rules`, `package.json`, `CLAUDE.md`
- Reference patterns from: Oura, Apple Health, Things 3, Sunsama, Motion, Calm, Notion, Revolut, Cron, Reclaim
- Existing internal docs you'd already written that this audit confirms: `BUDGET-AUDIT-10-OF-10.md`, `FIX-WAVE-1-CRITICAL.md`, `mood-redesign-prompt.md`, `sleep-redesign-prompt.md`, `(C)-HBIT-10-OF-10-AUDIT.md`

---

*Audit produced 2026-04-24 by Claude. Save this file, kill Wave 1 in one week, and your investor demo gets dramatically less awkward.*
