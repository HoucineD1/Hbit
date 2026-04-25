# (C) Hbit — Merged Roadmap to 10/10

> Combination of the two audits run on 2026-04-24 / 2026-04-25:
>
> - `(C)-FULL-AUDIT-2026-04-24.md` — Claude (live walkthrough, DOM introspection, code line-numbers, color system, type system, investor scorecard).
> - `HBIT-FULL-AUDIT-2026-04-25.md` — GPT 5.5 (root-cause `[hidden]` selector bug, schema mismatches, silent listener errors, encoding/mojibake, account-deletion gap).
>
> Both audits agree on the verdict: **~5.5/10 today**, strong bones, demo-grade not investor-grade. Where the audits found different things, both findings are kept here. Where they overlap, the more specific one wins.
>
> This document is structured for Codex / Claude Code: each phase has a goal, a checklist, the exact files and line numbers to touch, and the skill (`/command`) to invoke from `COMMANDS.md`. **No code is written here** — the implementing agent picks the implementation; this file tells it *what* and *in which order*.

---

## Verdict and target

| | Today | After Phase 1 | After Phase 2 | After Phase 3 |
|---|---|---|---|---|
| Overall | 5.5/10 | **7.0/10** | **8.5/10** | **9.5/10** |
| Plan module | 4/10 | 6/10 | **8.5/10** | 9.5/10 |
| Investor-readiness | 4.5/10 | 6.5/10 | 8/10 | **9/10** |

Three phases. Roughly 1 week, 2-3 weeks, 2 weeks.

---

## PHASE 1 — STOP THE BLEEDING

**Goal:** kill every visible bug, brand violation and broken state. After this phase the app **looks finished** even if it isn't yet **brilliant**. This is the phase you cannot skip.

**Estimated:** ~1 week of focused work.

**Skills to invoke (in order):** `/harden` → `/audit` → `/normalize` → `/colorize` → `/adapt` → `/web-design-guidelines`.

### 1.1 — The single most impactful fix: global `[hidden]` enforcement

**Why this is #1.** GPT's audit identified the root cause of three visible bugs at once:

- Plan: carry-over banner shows even though DOM has `hidden` (claude observed this live).
- Focus → Timer view: "Inhale 4" leaks behind the `25:00` countdown.
- Focus → Breathe tab: cards present but pushed below the fold by an active-but-hidden timer panel.

**Cause.** `css/core/base.css:49` only defines `.hidden { display:none !important; }`, **not** `[hidden] { display:none !important; }`. Page CSS then beats the browser default — `.pl-carry-over { display:flex; }` (`css/pages/plan.css:239`) and `.fc-br-display { display:flex; }` (`css/pages/focus.css:372`) — so the `hidden` HTML attribute does nothing.

**Action.**
- Add `[hidden] { display: none !important; }` globally to `css/core/base.css`.
- Sweep every overlay, sheet, empty-state, breathing display, panel — confirm the visual match the `hidden` attribute.
- For Focus specifically, also set `.fc-panel:not(.is-active) { display: none; }` so inactive panels don't reserve vertical space and push Breathe content off-screen.
- Add 1 Playwright smoke test per page that asserts `hidden` elements are not visible.

**Skill:** `/harden` and `/audit`.

### 1.2 — Stop visible content drift / split-brain

| Bug | File / line | Fix direction |
|---|---|---|
| Home reads `hbit:plan:items` with `item.text` | `js/pages/home.js:10`, `:138` | Read through `HBIT.db.tasks`. Migrate legacy `text → title` once. |
| Plan writes `hbit:plan:tasks` with `item.title` | `js/pages/plan.js:186`, `:213` | Stays. Becomes the canonical schema. |
| Habits writes habit logs with random Firestore IDs | `js/pages/habits.js:856` | Switch to `HBIT.db.habitLogs.set/remove`. Backfill old random-ID logs by `(habitId, dateKey)`. |
| Plan reads habit logs with deterministic IDs | `js/pages/plan.js:152`, `js/core/db.js:275` | Stays after Habits is migrated. |
| Plan Firestore listener swallows errors | `js/pages/plan.js:168`, `js/pages/plan.js:181` (`.catch(()=>{})`), `js/core/db.js:898` | Add an error callback to `tasks.onSnapshot`. Plan shows a retryable toast on snapshot failure. |
| Account deletion leaves user data behind | `js/pages/profile.js:314` | Re-auth → delete Firestore subcollections (Cloud Function or client) → only then `user.delete()`. Add export-data button alongside. |

**Skill:** `/harden`.

### 1.3 — Brand and color enforcement (visible in 30 seconds)

Per `CLAUDE.md` the canonical accents are: Habits `#34D399`, Budget `#F59E0B`, Sleep `#818CF8`, Mood `#A78BFA`, Focus `#F97316`, Plan `#22D3EE`. **Three live violations** found:

- Budget "Spending by category" donut renders **cyan** — should be amber.
- Mood floating action button renders **amber** — should be violet.
- Plan "All" filter chip uses **emerald** (Habits) — should be cyan or neutral.

Also: avatar shows `H` on Mood instead of the user's first initial (e.g., `M` for Mimi).

**Action.**
- Replace every page's hard-coded color values with token variables (`--habit-accent`, `--budget-accent`, etc.).
- Make accents the only source of color truth.
- Add a lint check (regex grep) that fails CI when a hex value appears in `js/pages/*.js`.

**Skill:** `/colorize` then `/normalize`.

### 1.4 — i18n, encoding, and copy quality

- **Mojibake** in shipped pages: `Hbit â€” Dashboard`, `Sendingâ€¦`, corrupted bullets. Convert source files to UTF-8 BOM-less and re-save. Add a static check that fails on `Ã`, `â€`, `Â` patterns.
- **Hard-coded language strings.** `Planifiés` is set directly in `js/pages/home.js:123`. Every visible string must go through `t()`.
- **Mid-render mixed languages.** Budget header simultaneously shows English (`Left to spend`, `Income`, `Spent`) and French abbreviations (`AVRIL 2026`, `VEN. 24 AVR.`). Audit every locale-formatted date and either commit fully to the active language or kill the inconsistency.
- **Dashboard kicker line** reads as a placeholder: `Habits 0/4 Slept -- Mood 2/10 $200 Focus 0/3 Planned 0`. Either kill it (the cards below already say everything) or rewrite labeled, null-aware: `Habits 0/4 · Sleep — · Mood 2/10 · Spent $200 · Focus 0/3 · Plan 0`.

**Skill:** `/normalize` then `/clarify`.

### 1.5 — Landing page first viewport

Public Vercel screenshots show a huge empty area before the headline on desktop. On mobile, the H1 clips: "Track everything. Improve everythin...". A user or investor reasonably reads this as **unfinished**.

**Files to touch:** `css/pages/landing.css:221`, `:275`, `:1589`, `:1805`. Reframe the hero so brand and product preview are above the fold. H1 must wrap cleanly at 320–390px. Desktop hero must not waste 60% of viewport.

**Skill:** `/adapt` then `/arrange`.

### 1.6 — Touch-target floor (mobile reality check)

Live measurement found 10 buttons below 44×44 px including the Focus tabs (36px tall), the 32×32 theme toggle, and Plan action buttons that shrink to 34px on mobile (`css/pages/plan.css:499`, `:607`).

**Action.** Add `--tap-min: 44px` to `tokens.css` and apply it as the *minimum* `height` and `min-width` to every interactive element. Visible icons can stay smaller; the **interactive box** must be ≥44px.

**Skill:** `/adapt`.

### 1.7 — Auth persistence and Firebase weight

- `js/core/firebase-init.js:26-28` uses `SESSION` persistence. Fine for dev; **fatal for prod** because users get logged out every browser close. Switch to `LOCAL` (gate by env if needed).
- Sleep page shows "INTEGRATIONS COMING SOON" with Oura / Apple Watch / Fitbit / Garmin chips on the *active surface*. Investors read this as overpromise. Move to a "Coming soon" lane in Settings or remove.

**Skill:** `/harden` and `/quieter`.

### 1.8 — Light theme parity for Plan and Budget

Override-rule counts: Habits 37, Sleep 31, Focus 28, Mood 26, Budget 11, Plan 8. Plan and Budget visibly break in light mode. Bring both to ≥30 rules at parity.

**Skill:** `/colorize` then `/polish`.

### Phase 1 exit criteria

- [ ] No `hidden` element renders visibly.
- [ ] No mojibake on any shipped page.
- [ ] No Plan/Mood/Budget color violation.
- [ ] No tap target < 44px.
- [ ] Account delete actually deletes user data.
- [ ] Plan and Home read the same task source of truth.
- [ ] Landing first viewport shows the product on desktop and mobile.
- [ ] Auth persists across tab close.
- [ ] Light theme works on Plan and Budget.

**Score gate: 7.0 / 10.**

---

## PHASE 2 — REBUILD THE FLAGSHIPS

**Goal:** Plan stops being a task list and becomes a real planner. Focus stops being a Pomodoro and becomes a wellness module. Cross-module shell becomes a coherent product system. After this phase the app **feels original and premium**.

**Estimated:** 2-3 weeks.

**Skills to invoke:** `/overdrive` → `/ui-ux-pro-max` → `/ckm:design` → `/ckm:design-system` → `/normalize` → `/distill` → `/extract` → `/animate` → `/delight`.

### 2.1 — Plan module: from list to flagship

Both audits agree: today's Plan is decorated task list, not a planner. Rebuild as follows.

**View modes (segmented control above date strip):**

- **Today** — vertical hour-grid (06:00 → 23:00) on the left rail. Tasks render as colored blocks of their `duration` (color = priority). A red **"now" line** sweeps across in real time. **This is the new mobile default.**
- **Week** — a Sunday-to-Saturday 7-column grid version of the same.
- **List / Agenda** — keep the existing flat list as a fallback view.

**Hero interactions:**

- **Tap empty slot** → adds a task at that time.
- **Long-press / drag a task** → reschedule to a different time, or resize from the corner to change duration.
- **Quick-add bar** at the top of the day. Single input with natural-language parsing: `Workout 7am 45m high #fitness` → `time=07:00, duration=45, priority=high, tags=[fitness]`. Steal from Sunsama / Motion.
- **Conflict resolution.** Today `js/pages/plan.js:649` detects conflicts but only shows a warning pill. Make it actionable: "Conflicts with *Standup*" with a "Move 30m later" suggestion.

**Carry-over redesign.**

- Today: a persistent banner outside the timeline.
- Tomorrow: a **morning review sheet** that pops once per day, lets the user bulk-decide each unfinished task: *Bring forward · Reschedule · Drop*. After dismissed, never shown again that day.

**Habit fusion.**

- `loadTodaysHabits()` already computes scheduled habits. Render them in the timeline as recurring slots, color-coded emerald, completable from inside the planner. No separate list. One canvas.

**Modal redesign — fields the current modal is missing:**

- Recurrence (`Once / Daily / Weekdays / Weekly / Custom`)
- Linked habit (dropdown of user's active habits → fills color/duration defaults)
- Subtasks (max 5)
- Tags (free text, comma-separated)
- Reminder (offset minutes)
- Estimated effort already exists as `duration`.

The current modal also uses **native unstyled controls** (`<select>` for priority, `<input type="time">`). On Safari and iOS PWA they break. Replace with custom segmented controls and a wheel time-picker.

Also: kill the duplicate add button (FAB + bottom black `+` both visible). Pick one. Rename the "Colors" overview kicker to "Priority" (the items below are priorities, not colors).

**Files to touch:** `plan.html` (lines 82, 114-122, 161-164), `js/pages/plan.js` (357-445 for `renderList` → `renderDayGrid`), `css/pages/plan.css`.

**Skills:** `/overdrive` → `/ui-ux-pro-max` → `/ckm:design` for visual, `/distill` for the morning review.

### 2.2 — Focus module: real wellness, not just a timer

Today there are two breathing surfaces fighting each other (`#fcBrDisplay` inline + `#fcBreathOverlay` full-screen). After Phase 1's `[hidden]` fix the bugs are gone, but the experience still isn't premium.

**Action.**

- **Single time slot, state-machine driven.** `focus.html:108-114`: rebuild so `#fcTimeDisplay` and `#fcBrDisplay` are **mutually exclusive children** of one `#fcDisplay` slot. JS swaps `innerHTML` based on `phase === 'work' | 'break' | 'breathe'`. Drop `position: absolute` from `.fc-br-display` (`css/pages/focus.css:372`).
- **Breathing animation, three real patterns.** Box (4-4-4-4), 4-7-8, Coherent (6-6). The full-screen overlay (`#fcBreathOverlay`) already has all the markup — wire it: a CSS-animated circle that scales + opacity-pulses on the timing of the active pattern. Add `prefers-reduced-motion` opt-out.
- **Haptics on mobile.** Settings copy already says "device vibrations will guide your rhythm screen-free." Wire it via `navigator.vibrate([200])` on each phase transition.
- **Replace confetti with calm completion.** GPT was right — confetti is the wrong tone for a quiet premium brand. Use a soft pulse, "Session saved" sheet with the next-action CTA, and the option to start a follow-up session.
- **Breathe tab cards** become real entry points: tapping a card opens the full-screen overlay running that pattern.

**Files:** `focus.html:108-114`, `focus.html:175-191`, `focus.html:278-291`, `js/pages/focus.js:468-487` (`setActiveTab`), `js/pages/focus.js:651` (confetti site), `css/pages/focus.css:372`.

**Skills:** `/overdrive` then `/animate` then `/quieter` for the completion moment.

### 2.3 — Cross-module shell standardization

Both audits flagged this. Each module has a different header, different modal style, different empty state, different toast placement. Investors read this as immaturity.

**Build (or extend) a single set of primitives — `/extract` then `/ckm:design-system`:**

- **`<ModuleHeader>`** — icon, module name, contextual subtitle, primary action, language/theme/profile cluster, help. Used by every module.
- **`<Sheet>`** — bottom-sheet on mobile, side-panel on desktop. Used everywhere a modal exists today.
- **`<Card>` / `<Stat>` / `<Pill>`** — kill page-specific CSS where possible.
- **`<EmptyState>`** with hero icon + title + sub + CTA + tip list — Plan already has the best version of this; promote it.
- **`<Skeleton>`** — Plan has it, others don't. Make it shared.
- **`<Toast>`** placement and motion shared.
- **Confirmation pattern** for destructive actions (delete task, delete habit, sign out, delete account).

After this pass, any new module can be built in 1/3 the time.

**Skills:** `/extract` → `/ckm:design-system` → `/normalize`.

### 2.4 — Code-weight reduction

`js/pages/budget.js` is **5,648 lines** in one file. Split:

- `budget-state.js` — state, derived selectors, conflict detection.
- `budget-render.js` — DOM render functions.
- `budget-modals.js` — bills, expense, income, account, goal modals.
- `budget-charts.js` — donut, bar, financial-health.

Same pattern for `js/pages/sleep.js` (2,043) and `js/pages/habits.js` (1,880) when they're touched.

`i18n.js` at 2,611 lines — leave alone for now, but consider splitting per-locale JSON when the library passes 5k.

**Skill:** `/optimize`.

### Phase 2 exit criteria

- [ ] Plan has Today / Week / List view modes.
- [ ] Plan Today is a vertical hour-grid with now-line and drag-to-reschedule.
- [ ] Plan supports natural-language quick-add.
- [ ] Plan habit blocks render in the same canvas as tasks.
- [ ] Plan modal has recurrence, habitId, subtasks, tags, reminders.
- [ ] Plan no longer uses native unstyled `<select>` / `<input type=time>`.
- [ ] Focus has one display slot — no overlap possible.
- [ ] Focus breathing animations work on three patterns with reduced-motion.
- [ ] Focus completion is calm, not confetti.
- [ ] All modules use `<ModuleHeader>`, `<Sheet>`, `<Card>`, `<EmptyState>`, `<Skeleton>`, `<Toast>` from a shared library.
- [ ] No JS file > 2,500 lines.

**Score gate: 8.5 / 10. Plan from 4 to 8.5.**

---

## PHASE 3 — PREMIUM FINISH + INVESTOR STORY

**Goal:** the app feels expensive, the demo tells a story, and the wedge — *cross-module insights* — actually exists. After this phase, **you can ship to investors**.

**Estimated:** ~2 weeks.

**Skills:** `/typeset` → `/animate` → `/delight` → `/onboard` → `/ckm:banner-design` → `/polish` → `/web-design-guidelines`.

### 3.1 — Typography lockdown ("police weak" fix)

The user said it directly: *"police weak"*. Fix:

- **Lock down a 1.25 modular type scale:** 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56. Add as CSS custom properties. Forbid arbitrary `font-size` values in PRs.
- **Use weight contrast.** Big numbers (`$1,200`, `25:00`) → 800 weight, letter-spacing -0.02em. Headings 700. Supporting text 500. Currently nothing is at 800.
- **`font-variant-numeric: tabular-nums`** on every element where digits change live (timer, money, counts) — eliminates width flicker.
- **`font-optical-sizing: auto`** on `body` — DM Sans is variable opsz-aware.
- Consider a **display-pair font** for hero numbers only (Inter Display or Space Grotesk), one site-wide pairing.
- Headline `line-height` 1.05–1.15. Body 1.5. Today H1 looks soft because it's at 1.4.

**Skill:** `/typeset`.

### 3.2 — Motion system

Define three speeds: **fast 200ms**, **normal 320ms**, **deliberate 480ms**, all with `cubic-bezier(0.2, 0.8, 0.2, 1)`. Apply to: card hover, tab switch, modal/sheet open, ring fill, banner enter/exit, toast.

Respect `prefers-reduced-motion: reduce` everywhere — set transitions to `0.01ms` and disable looping animations.

**Skill:** `/animate` then `/delight`.

### 3.3 — Mobile shell upgrade

- **Bottom-tab nav** on mobile (the sidebar is desktop-first and the hamburger is friction). 5 tabs: Overview / Habits / Plan / Focus / Profile. Mood, Sleep, Budget accessible through cards and the cross-module insight nav.
- **Swipe-back gesture** on iOS PWA.
- **PWA install prompt** — add a small "Add to home screen" hint after 3 sessions.

**Skill:** `/adapt` then `/arrange`.

### 3.4 — The wedge: Weekly Insights Engine

**This is the single most investor-credible feature you can ship.** Hbit's pitch is "track everything that matters, in one app". Today the modules don't talk to each other. Investors will ask "*so what?*". The answer is the Weekly Insights Engine:

A scheduled job (Cloud Function or client cron) runs once a week and synthesizes 3 cards on the Home dashboard. Each card is one cross-module observation. Examples:

- "Days you exceeded your budget, you slept **38 minutes less** on average."
- "Your best mood weeks correlate with **4+ habit completions** on Mon-Wed."
- "You complete **70% more focus sessions** when you log a habit before noon."
- "Your spending peaks on the **second day of low-mood streaks**."

Each card links to the source modules with the relevant filter applied. Add a **"Why?"** affordance that explains the math.

This single feature changes the pitch from "another tracking app" to "*the only app that tells you why you spend more when you sleep less*".

**Skills:** `/ui-ux-pro-max` → `/ckm:design`.

### 3.5 — Onboarding (60 seconds, not skippable)

After signup today, user lands on home with empty cards and zero idea what to do. Build a 60-second onboarding:

1. Pick goals (chips: better sleep / save money / build habits / quit something / focus / clarity).
2. Pick 3 starter habits (chosen from the user's goals).
3. Sleep target (hours).
4. Monthly budget (currency).
5. First focus block today (Y/N).
6. Mood baseline (one tap).

Output: home dashboard pre-populated, first weekly insight scheduled.

**Skill:** `/onboard`.

### 3.6 — Streaks and digest

- **Streak system across all modules.** Habits already has it; add to Mood (consecutive days logged), Sleep (consecutive nights logged), Focus (consecutive days hitting daily goal), Budget (consecutive days under budget), Plan (consecutive days completing all tasks).
- **Weekly Digest email** — Friday 5pm. Sends the three insight cards + streak status + a single CTA back into the app.

**Skill:** `/delight`.

### 3.7 — Demo data mode for investor walkthrough

A toggle in Settings that loads 6 weeks of realistic seed data across all modules. When ON, the app renders the dashboard you'd want to show on Demo Day. When OFF (default), real user data.

**Skill:** `/polish`.

### 3.8 — Landing rework

- Real product screenshots (not mockup ringgs).
- Feature preview above the fold (no empty hero).
- A clear differentiator headline tied to the Weekly Insights Engine ("*the personal OS that actually connects the dots*").
- Pricing or waitlist CTA below the hero — investors expect to see the funnel.
- Social proof slot: counts, beta-user testimonials, founder quote.
- Privacy / data stance with a single sentence and a link.

**Skills:** `/ckm:banner-design` → `/ckm:slides` → `/polish`.

### 3.9 — Reliability and credibility

- **Sentry / Logflare** for client errors. Today silent failures are common (`.catch(()=>{})`).
- **1 Playwright smoke test per module.** Login → land on module → assert primary action visible. CI gate.
- **Data export** in Profile (JSON download).
- **Account-deletion flow** with re-auth, export reminder, cleanup confirmation (already started in Phase 1; completes here).
- **Performance pass** with Lighthouse on mobile 3G. Target: LCP <2.5s, TBT <300ms, CLS <0.1.

**Skill:** `/optimize` then `/harden`.

### Phase 3 exit criteria

- [ ] Type scale enforced. Tabular nums on all live digits.
- [ ] Motion tiers and reduced-motion respected.
- [ ] Bottom-tab nav on mobile, sidebar on desktop.
- [ ] Weekly Insights Engine ships 3 cross-module cards every Monday.
- [ ] Onboarding wizard runs at first login.
- [ ] Streak counter on every module.
- [ ] Weekly Digest email sends.
- [ ] Demo data mode loads in 1 click.
- [ ] Landing has real product previews above the fold.
- [ ] Sentry receives errors.
- [ ] Playwright smoke tests run in CI.
- [ ] Lighthouse mobile score ≥ 90.

**Score gate: 9.5 / 10. Investor-ready.**

---

## How to give this to Codex / Claude Code

Suggested prompt format per phase:

```
Read (C)-HBIT-MERGED-ROADMAP-2026-04-25.md.

Execute Phase 1 only.

For each numbered subsection (1.1 through 1.8):
  1. Run the listed /skill commands in order.
  2. Apply the changes to the listed files / lines.
  3. Verify the exit criteria for that subsection.

When all of Phase 1 is done, run the Phase 1 exit-criteria checklist.
Stop. Wait for sign-off before starting Phase 2.
```

Same shape for Phase 2 and Phase 3.

**Order matters.** Don't let the agent jump ahead to Phase 3 (typography, motion) before Phase 1 (bug fixes). Polish on broken UI is wasted polish.

---

## Cross-reference: what each audit uniquely contributed

| Finding | Source | Impact |
|---|---|---|
| Global `[hidden]` selector missing | GPT 5.5 | Root-cause of 3 separate bugs at once. **Phase 1 #1.** |
| Habit log schema mismatch (random vs deterministic IDs) | GPT 5.5 | Silent data drift. Phase 1.2. |
| Local/cloud split-brain (`text` vs `title`, `items` vs `tasks`) | GPT 5.5 | Phase 1.2. |
| Plan Firestore listener swallows errors | GPT 5.5 | Phase 1.2. |
| Account deletion leaves data | GPT 5.5 | Phase 1.2. |
| Mojibake / hard-coded `Planifiés` | GPT 5.5 | Phase 1.4. |
| Landing first-viewport empty + mobile clipping | GPT 5.5 | Phase 1.5. |
| Confetti is wrong tone for premium quiet brand | GPT 5.5 | Phase 2.2. |
| Color-system violations (Budget cyan, Mood amber, Plan emerald) | Claude | Phase 1.3. |
| Tap-target measurements (10 below 44px) | Claude | Phase 1.6. |
| Light-theme rule counts (Plan 8, Budget 11 vs Habits 37) | Claude | Phase 1.8. |
| Plan modal field-level rebuild list (recurrence, habitId, subtasks, tags) | Claude | Phase 2.1. |
| Plan duplicate add button + "Colors" mislabel | Claude | Phase 2.1. |
| `budget.js` is 5,648 lines | Claude | Phase 2.4. |
| Typography lockdown (scale, tabular-nums, optical-sizing, weight contrast) | Claude | Phase 3.1. |
| Investor-readiness scorecard (9 pillars) | Claude | Phase 3 framing. |
| Weekly Insights Engine as the wedge | Claude | Phase 3.4. |
| Onboarding wizard spec | Claude | Phase 3.5. |
| Demo data mode | Claude | Phase 3.7. |
| Both: hidden state + tap targets + cross-module shell + Plan rebuild | Both | Confirms priority. |
| Both: investor not ready today | Both | Confirms target. |

---

*Merged 2026-04-25. Hand this file to the implementing agent. Do Phase 1 in one week. Do not jump ahead.*
