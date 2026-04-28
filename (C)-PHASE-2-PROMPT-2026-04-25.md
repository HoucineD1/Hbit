# (C) Phase 2 — Rebuild the Flagships. Hand-off Prompt.

> **For Codex / Claude Code.** Read `(C)-HBIT-MERGED-ROADMAP-2026-04-25.md` and `(C)-PHASE-1-DONE-2026-04-25.md` first. Phase 1 is verified shipped. This file describes Phase 2 in execution-ready form.
>
> **Goal.** Plan stops being a task list and becomes a real planner. Focus stops being a Pomodoro and becomes a wellness module. Shared component primitives standardize the cross-module shell. After this phase the app **feels original and premium**.
>
> **Score gate:** 7.0 → **8.5 / 10**. Plan from 5.5 → 8.5. Estimated 2–3 weeks.
>
> **Order matters.** Do 2.1 → 2.2 → 2.3 → 2.4. Do not jump to Phase 3 until the Phase 2 exit checklist at the bottom of this file is ticked.

---

## Skills to invoke (in this order)

`/overdrive` → `/ui-ux-pro-max` → `/ckm:design` → `/ckm:design-system` → `/extract` → `/normalize` → `/distill` → `/animate` → `/delight` → `/web-design-guidelines`.

The file `COMMANDS.md` documents what each skill does. After every subsection, run `npm run check:phase1` to ensure the Phase 1 guardrails still pass.

---

## 2.1 — Plan: from list to flagship planner

### Files involved

| File | Lines | Role |
|---|---|---|
| `plan.html` | full | Add segmented control, restructure overview, keep modal but extend fields. |
| `js/pages/plan.js` | 357-445 (`renderList`) and surrounding | New `renderDayGrid()` view, parser, drag handlers. |
| `css/pages/plan.css` | full | New grid styles, new chip set, custom select/time/recurrence components. |
| `js/core/db.js` | tasks schema | Extend `task` shape: `recurrence`, `habitId`, `subtasks: []`, `tags: []`, `reminderOffsetMin`. Forward-compatible — undefined defaults. |

### What to build

**A. View modes (top-level segmented control above the date strip).**

- Segmented control: `Today` (default mobile) · `Week` · `List`.
- The chosen mode persists per user in `localStorage` under `hbit:plan:viewMode`.
- `Today` is the new mobile default and must be reachable from the FAB and from the bottom-tab nav (Phase 3.3).

**B. `Today` view — vertical hour grid.**

- Render hours `06:00 → 23:00` as a left rail column. Each hour row is `--row-h: 56px` (token; expose as a CSS custom property so density can be tweaked).
- Tasks render as absolutely-positioned blocks inside the grid: `top = (hour - 6) * row-h + minutes * (row-h / 60); height = duration * (row-h / 60)`.
- A red **"now" line** sweeps across at the current local time; updates every 60 s.
- Empty hour rows are tappable: tap → opens the Add Task sheet pre-filled with that start time and 60 m duration.
- Task block color = priority. Use the existing `--prio-high / --prio-med / --prio-low` tokens.
- Long-press / pointer-down + drag → reschedule. Resize from the bottom edge → change duration. Use Pointer Events API; vanilla, zero deps.
- Conflict resolution: today's `hasConflict()` only paints a pill. Add an in-block action: "Conflicts with *Standup*. Move 30 m later? Move to next free slot?" with one-tap apply.
- Habits already computed by `loadTodaysHabits()` render as recurring slots in the timeline, color-coded emerald, completable from inside the planner. They do **not** show as a separate list anymore.

**C. `Week` view.**

- 7 columns Sun→Sat (locale-aware first day). Same task-block rendering at smaller density.
- Tap a column header to switch into `Today` for that date.

**D. `List` view.**

- The current chronological list, kept as the agenda fallback.
- Group sections as today: `Scheduled` and `Anytime`.

**E. Quick-add bar.**

- Top of the day. Single text input. On Enter, parse with a small natural-language pass:
  - `Workout 7am 45m high #fitness` → `title="Workout"`, `time="07:00"`, `duration=45`, `priority=high`, `tags=["fitness"]`.
  - Recognise: `\b(?:[01]?\d|2[0-3])(?:[:.][0-5]\d)?\s?(?:am|pm)\b`, `\b\d+m\b` or `\b\d+min\b`, `#\w+`, `(low|medium|high)`.
  - Fall back: any leading word(s) → `title`, no parse → `title=text, duration=60, priority=low`.
- A confirm button shows the parsed result chips before commit so it is auditable.

**F. Carry-over redesign.**

- Today: a persistent banner outside the timeline.
- Tomorrow: a **Morning Review Sheet** that pops once per local day on first visit if `state.allPastUndone.length > 0`.
  - Each unfinished task is a row with three taps: `Bring forward` · `Reschedule…` · `Drop`.
  - `Reschedule…` opens a date picker.
  - After dismiss, set `localStorage` flag `hbit:plan:morningReview:${dateKey}=done` so it does not reappear that day.

**G. Modal redesign — replace native unstyled controls.**

- Time picker: custom wheel on mobile; popover with hour/minute columns on desktop.
- Priority: segmented control with the priority dot rendered inline; not a `<select>`.
- Duration: stepper with quick chips `15 / 30 / 45 / 60 / 90`.
- New fields:
  - **Recurrence** — segmented `Once / Daily / Weekdays / Weekly / Custom`. `Custom` opens a 7-day toggle row.
  - **Linked habit** — dropdown of user's active habits. Selection auto-fills `duration` from habit and tints the block emerald.
  - **Subtasks** — max 5 inline rows with checkboxes.
  - **Tags** — comma-separated chips input.
  - **Reminder** — segmented `None / 5m / 15m / 30m / 1h before`. Stores offset minutes.
- Save defaults: today, 60 m, Medium, no link. So fast path = type title + Enter.

**H. Cleanup tied to Plan.**

- Remove the duplicate add affordance — keep only the FAB. Audit the page for any lingering bottom `+` button.
- The `Priority` overview kicker (renamed from `Colors` in Phase 1.3) stays.
- `pl-time-row` form layout: stack vertically on `< 480 px`.

### Exit criteria for 2.1

- [ ] `Today / Week / List` segmented control persists choice.
- [ ] `Today` is a real hour-grid with now-line, drag-to-reschedule, resize-by-corner.
- [ ] Tap empty slot opens prefilled Add Task sheet.
- [ ] Quick-add parses time / duration / priority / tags from one line.
- [ ] Conflicts are actionable, not just labelled.
- [ ] Habit blocks render in the timeline, not as a separate list.
- [ ] Morning Review Sheet replaces the persistent carry-over banner.
- [ ] Add Task sheet has recurrence, linked habit, subtasks, tags, reminders, custom time + priority + duration controls. No native `<select>` or `<input type="time">` remains in Plan.
- [ ] Plan's accent/colors still pass `npm run check:phase1`.

---

## 2.2 — Focus: real wellness, not just a timer

### Files involved

| File | Lines | Role |
|---|---|---|
| `focus.html` | 108-114, 175-191, 278-291 | Single display slot; Breathe-card grid; full-screen overlay markup. |
| `js/pages/focus.js` | 468-487 (`setActiveTab`), 651 (confetti site) | State machine; replace confetti. |
| `css/pages/focus.css` | 372 (`.fc-br-display`) | Drop `position:absolute`. |

### What to build

**A. Single display slot, state-machine driven.**

- In `focus.html` lines 108-114, replace the two stacked elements (`#fcTimeDisplay` and `#fcBrDisplay`) with **one** `#fcDisplay` slot that owns its own `aria-live="polite"` region.
- A small pure function `renderDisplayForPhase(phase)` returns either the `mm:ss` countdown or the breath label + seconds. Phases: `'work' | 'break' | 'breathe' | 'idle'`.
- In `css/pages/focus.css:372`, drop `position:absolute` from `.fc-br-display` (now unused).

**B. Breathing animation — three patterns.**

- The full-screen overlay markup at `focus.html:278-291` already exists. Wire it.
- Patterns: **Box (4-4-4-4)**, **4-7-8 (calming)**, **Coherent (6-6 — focus)**. Each pattern is a CSS-driven timeline:
  - Box: `inhale 4s → hold 4s → exhale 4s → hold 4s` per cycle, looped.
  - 4-7-8: `inhale 4s → hold 7s → exhale 8s` per cycle, looped.
  - Coherent: `inhale 6s → exhale 6s` per cycle, looped.
- Animate the centre circle: scale 0.6 ↔ 1.0, opacity 0.55 ↔ 1.0, with a subtle box-shadow glow at peak inhale. CSS keyframes per pattern.
- Display the active phase label (`Inhale` / `Hold` / `Exhale`) and a per-phase second countdown.
- A linear progress bar runs across the full session duration (default 2-3 min depending on pattern).
- `End early` button. If session ≥ 60 s, log to `sessionHistory` as `{ type: 'breathe', date, startTime, duration, pattern }`. Otherwise discard.

**C. Haptics on mobile.**

- Wire `navigator.vibrate([200])` at each phase transition. Guard with `if ('vibrate' in navigator)`. Settings copy already promises this.

**D. Calm completion (replace confetti).**

- `js/pages/focus.js:651` — remove confetti call. Replace with:
  - Soft pulse on the centre ring (one 600 ms ease-out scale + opacity dim).
  - A small "Session saved" sheet slides up from the bottom showing: focus minutes added today, current streak, two CTAs: "Start another" · "Take a 2-min breathe".
- Confetti import stays for **personal-best** moments only (e.g. new daily-streak record), not every session.

**E. Reduced motion.**

- Respect `prefers-reduced-motion: reduce` everywhere: ring fill animates instantly, breath circle fades instead of pulsing, no looping animations on the timer.

**F. Breathe tab cards become real entry points.**

- `focus.html:175-191` — each card opens the full-screen overlay running the matching pattern. Today they exist but do nothing visible after Phase 1.

### Exit criteria for 2.2

- [ ] Only one display slot in the timer ring. No overlap is geometrically possible.
- [ ] Three breathing patterns animate correctly with phase labels and per-phase seconds.
- [ ] Mobile vibrates on phase transitions.
- [ ] Confetti gone from per-session completion. Calm "Session saved" sheet appears.
- [ ] `prefers-reduced-motion` is honoured everywhere in Focus.
- [ ] Each Breathe-tab card opens the full-screen overlay with its pattern.

---

## 2.3 — Cross-module shell standardization

### What to build

Build (or extend) a single set of primitives in `js/core/components/` and `css/core/components.css`, then migrate each module to use them. Every module follows the same shell after this pass.

| Primitive | What it is | Where it replaces |
|---|---|---|
| `<ModuleHeader>` | icon + module name + contextual subtitle + primary action + (lang, theme, profile) cluster + help button | every page header |
| `<Sheet>` | bottom-sheet on mobile, side-panel on desktop, with focus trap + Escape close | every modal-overlay today |
| `<Card>` | base elevated surface | every `*-card` page-specific class |
| `<Stat>` | kicker + big-number + meta line | dashboard stat cells, per-module summaries |
| `<Pill>` | rounded chip with optional dot, color tone | priority pills, status pills, filter chips |
| `<EmptyState>` | hero icon + title + sub + CTA + tip list | every empty/loading branch |
| `<Skeleton>` | shimmer placeholder rows | initial loads |
| `<Toast>` | bottom-centered, 4s default, action slot for retry | every page toast |
| `<Confirm>` | destructive confirmation modal | delete task / delete habit / sign out / delete account |

### Migration order

1. Extract primitives into `js/core/components/*.js` (vanilla — no React) using a small `defineCustomElement('hbit-sheet', class extends HTMLElement {...})` pattern OR a render function that returns string templates. Stay zero-dep.
2. Migrate Plan first (it gains the most). Then Focus, then Habits, Mood, Sleep, Budget.
3. Each migration deletes page-specific CSS that the new primitive replaces. Lines deleted should net out larger than lines added.
4. Run `npm run check:phase1` after each migration. The static check should still pass.

### Exit criteria for 2.3

- [ ] Every module page uses `<ModuleHeader>`. The visual is identical across modules.
- [ ] No page declares its own modal CSS. All modals are `<Sheet>`.
- [ ] No page declares its own card surface CSS. All cards are `<Card>`.
- [ ] Toast placement and motion are identical app-wide.
- [ ] Destructive actions go through `<Confirm>`.
- [ ] CSS net change: each migrated module's `css/pages/*.css` shrinks measurably.

---

## 2.4 — Code-weight reduction

### What to do

Split `js/pages/budget.js` (5,648 lines) into:

```
js/pages/budget/
  index.js            -- entrypoint, mounts state and wires DOM
  state.js            -- state object, derived selectors, conflict logic
  render.js           -- DOM render functions
  modals.js           -- bills, expense, income, account, goal sheets
  charts.js           -- donut, bar, financial-health gauge
```

`budget.html` keeps a single `<script defer src="js/pages/budget/index.js"></script>` (no module bundler — just a façade file that pulls others in via `<script>` tags or via dynamic `import()` if you keep type=module).

If `js/pages/sleep.js` or `js/pages/habits.js` are touched, apply the same split there.

`js/core/i18n.js` (2,611 lines) — leave intact for now; flag for Phase 3 if it grows further.

### Exit criteria for 2.4

- [ ] No `js/pages/*.js` exceeds 2,500 lines.
- [ ] Budget loads and behaves identically before/after the split.
- [ ] Static check still passes.

---

## Phase 2 master exit checklist

- [ ] 2.1 Plan exit criteria all green.
- [ ] 2.2 Focus exit criteria all green.
- [ ] 2.3 Cross-module shell exit criteria all green.
- [ ] 2.4 Code-weight reduction exit criteria all green.
- [ ] `npm run check:phase1` passes.
- [ ] Manual smoke test: log in, add a planner task via quick-add, drag it to a different time, complete it. Open Focus, run a 2-min Coherent breath. Log a habit, see it appear as a slot in tomorrow's Plan.
- [ ] No console errors at idle.
- [ ] Lighthouse mobile score not regressed vs Phase 1 baseline.

When this checklist is ticked, score gate: **8.5 / 10. Plan ≥ 8.5.** Stop. Commit. Wait for sign-off before Phase 3.

---

## Suggested commit cadence

Six commits, one per area, so each is reviewable in isolation:

1. `phase 2.1a — Plan: Today hour-grid view, segmented control, view persistence`
2. `phase 2.1b — Plan: drag-to-reschedule, conflicts, quick-add, morning review sheet`
3. `phase 2.1c — Plan: modal rebuild — recurrence, habitId, subtasks, tags, reminders`
4. `phase 2.2  — Focus: state-machine display slot, breathing animations, calm completion`
5. `phase 2.3  — Cross-module shell: ModuleHeader, Sheet, Card, EmptyState, Skeleton, Toast, Confirm`
6. `phase 2.4  — Split budget.js into state/render/modals/charts`

Each commit must leave the static check green.

---

*Hand this file to the implementing agent. Do 2.1 first. Do not jump ahead.*
