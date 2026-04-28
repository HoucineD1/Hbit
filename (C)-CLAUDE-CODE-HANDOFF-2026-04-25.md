# (C) Hbit — Claude Code Handoff. State as of 2026-04-25.

> **For Claude Code.** Single file, full context. Read this end-to-end before touching anything. The audits and roadmap that produced this work are referenced at the bottom — open them only if you need source-of-truth on a decision.
>
> **TL;DR.** Phase 1 is fully shipped and gated by a static check. Phase 2 is **half-shipped** — the two big rebuilds (Plan and Focus) are done but the cross-module shell migration and the deeper Budget split are still open. Phase 3 has not been started. There are also two external blockers Codex hit during smoke that need addressing before Phase 2 can be signed off.
>
> **Score gates.** Today ≈ 7.8 / 10. Phase 2 done = 8.5. Phase 3 done = 9.5.

---

## 1. Status snapshot

| Phase | Subsection | State |
|---|---|---|
| 1.1 | Global `[hidden]` + Focus inactive panels | ✅ DONE |
| 1.2 | Schema split-brain, habit log IDs, Plan listener errors, account delete | ✅ DONE |
| 1.3 | Color/accent violations (Budget donut, Mood FAB, Plan kicker, avatar) | ✅ DONE |
| 1.4 | i18n, mojibake, hard-coded strings, kicker | ✅ DONE |
| 1.5 | Landing first viewport | ✅ DONE |
| 1.6 | Touch targets ≥ 44px (`--tap-min` token) | ✅ DONE |
| 1.7 | Auth `LOCAL` persistence + Sleep "coming soon" hidden | ✅ DONE |
| 1.8 | Light theme parity Plan + Budget | ✅ DONE |
| 1.* | Static check `npm run check:phase1` | ✅ DONE — passes |
| 2.1 | Plan: Today/Week/List, hour grid, drag, conflicts, quick-add, morning review, modal rebuild | ✅ DONE |
| 2.2 | Focus: single display slot, breathing animations, haptics, reduced-motion, calm completion | ✅ DONE |
| 2.3 | Cross-module shell — primitives created, **migration not done** | 🟡 PARTIAL |
| 2.4 | Budget split — file relocated, **not actually split** | 🟡 PARTIAL |
| 3.* | Premium finish + investor story | ⛔ NOT STARTED |
| ext | Firestore composite index for `habits.list` | 🔴 BLOCKER |
| ext | Firestore intermittent "unavailable/offline" during smoke | 🔴 INVESTIGATE |

---

## 2. What was actually shipped — verified line-by-line

### Phase 1 (commit `8d22054`)

Receipts in `(C)-PHASE-1-DONE-2026-04-25.md`. The static check `scripts/phase1-static-check.js` enforces these going forward:

- `[hidden]` global rule.
- `.fc-panel:not(.is-active){display:none}` so inactive Focus panels do not reserve height.
- No raw hex colors in `js/pages/*.js`.
- No mojibake patterns in shipped HTML/CSS/JS.

### Phase 2.1 — Plan (verified in `js/pages/plan.js`)

- `VIEW_MODE_KEY = "hbit:plan:viewMode"` persistence.
- `state.viewMode` toggles `Today / Week / List`.
- Today renders as a vertical hour grid `06:00 → 23:00` with a live now-line.
- Tasks render as positioned blocks; drag to reschedule, resize handle on the corner, `-15 / +15` keyboard nudge controls.
- Empty hour rows open the Add Task sheet pre-filled with that time.
- Habit blocks render in the timeline (no longer a separate list).
- Quick-add parses one-line input like `Workout 7am 45m high #fitness`.
- Carry-over banner replaced by a Morning Review sheet (key `hbit:plan:morningReview:${dateKey}`); inline date picker, not `prompt()`.
- Add Task sheet has recurrence, linked habit, subtasks, tags, reminders, custom priority/duration/time.
- Plan no longer uses native `<select>` or `<input type="time">`.

### Phase 2.2 — Focus (verified in `focus.html`, `js/pages/focus.js`)

- Single `#fcDisplay` slot at `focus.html:108` — old `#fcTimeDisplay`, `#fcBrDisplay`, `#fcFocusPop` are removed.
- Breath overlay at `focus.html:274` with phase label, seconds, progress, remaining time.
- Box / 4-7-8 / Coherent breathing cards each open the live overlay.
- Haptics fire on phase transitions where supported.
- End-early records breathing only if ≥ 60 s.
- Per-session confetti gone; `Session saved` sheet at `focus.html:291` (calm completion).
- Focus respects `prefers-reduced-motion`.

### Phase 2.3 — Shared primitive foundation (PARTIAL)

`js/core/components.js` exists and exposes:

```
HBIT.components = {
  confirm, openSheet, closeSheet, bindSheet,
  moduleHeader, card, stat, pill, emptyState, skeleton
}
```

CSS primitives in `css/core/components.css`. Loaded across Home / Habits / Mood / Sleep / Budget / Focus / Plan / Profile.

The two pieces of migration that *did* happen:

- Habits `confirm()` → `HBIT.components.confirm` (with toast on failure).
- Mood + Sleep page-local toasts → `HBIT.toast` global placement.

**Everything else in 2.3 is NOT migrated.** Verified: `grep -rn "HBIT.components" *.html` returns **zero matches across all 8 pages**. The primitives are defined; nothing visual on any page uses them yet.

### Phase 2.4 — Budget split (PARTIAL)

- `js/pages/budget.js` is now a 10-line compatibility shim.
- `js/pages/budget/index.js` is **5,648 lines** — same monolith, just relocated. Verified.
- The intended split into `state.js / render.js / modals.js / charts.js` has not happened.

---

## 3. What is left in Phase 2

### 2.3 — Cross-module shell migration (the bulk of remaining work)

Migrate every module to the shared primitives in `HBIT.components`. Suggested order:

`Plan → Focus → Habits → Mood → Sleep → Budget`.

For each module:

1. **ModuleHeader.** Replace the page-specific header markup with `HBIT.components.moduleHeader({ icon, name, subtitle, primaryAction, langToggle, themeToggle, profileBtn, helpBtn })`. Identical visual across all modules.
2. **Sheet.** Replace every `*-modal` / `*-overlay` with `HBIT.components.openSheet({ title, body, footer })`. Bottom-sheet on mobile, side-panel on desktop. Focus trap + Escape close + safe-area-inset-bottom.
3. **Card / Stat / Pill / EmptyState / Skeleton.** Replace one-off page CSS with the shared primitives. Net CSS lines deleted should exceed lines added per module.
4. **Toast.** Make every page that still calls a local toast route through `HBIT.toast.show / success / error / warn`.
5. **Confirm.** Every destructive action — delete task, delete habit, sign out, delete account, clear data — must go through `HBIT.components.confirm`.

After each module is migrated:

- Run `npm run check:phase1`. Static check must pass.
- Spot-check the page on mobile (390 × 844) and desktop (1440 × 900).
- Commit. One commit per migrated module.

Exit criteria for 2.3:

- [ ] Every page uses `HBIT.components.moduleHeader(...)`. Headers are visually identical across modules.
- [ ] No page declares its own modal CSS.
- [ ] No page declares its own primary card surface CSS.
- [ ] Toast placement and motion are identical app-wide.
- [ ] Every destructive action goes through `HBIT.components.confirm`.
- [ ] Per-page CSS files shrink measurably (`git diff --stat` for `css/pages/*.css`).

### 2.4 — Budget actually split

Today `js/pages/budget/index.js` is 5,648 lines. Split it into:

```
js/pages/budget/
  index.js     -- entrypoint, mounts state and wires DOM
  state.js     -- state object, derived selectors, conflict logic
  render.js    -- DOM render functions
  modals.js    -- bills / expense / income / account / goal sheets (use Phase 2.3 Sheet primitive)
  charts.js    -- donut / bar / financial-health gauge
```

Constraints:

- Behaviour must be identical before/after.
- `budget.html` keeps a single `<script defer src="js/pages/budget/index.js"></script>`. The other files load via that entrypoint (concatenation via additional `<script>` tags is fine — vanilla JS, zero bundler).
- After the split, no file in `js/pages/budget/` should exceed ~1,500 lines.
- Static check must still pass.

### 2.5 — External blockers from smoke (must clear before Phase 2 sign-off)

1. **Firestore composite index for `habits.list`.** Codex hit this during smoke. The index needs to be declared in `firestore.indexes.json` and deployed via `firebase deploy --only firestore:indexes`. Field combination is whatever the `habits.list()` query in `js/core/db.js` requests (likely `archived` + `order` or `archived` + `createdAt`).
2. **Intermittent Firestore "unavailable/offline" during smoke.** Investigate: log when it happens, check if the SDK is reconnecting, ensure `enablePersistence` is configured for offline cache. If reproducible, file a fix; if transient, add a "Reconnecting…" indicator in the global toast surface.

### 2.6 — Phase 2 manual smoke (mandatory before sign-off)

Run end-to-end on a real device, ideally one mobile + one desktop:

1. Log in.
2. Add a planner task via quick-add: `Workout 7am 45m high #fitness`. Confirm chips show `time=07:00, duration=45, priority=high, tags=[fitness]`.
3. Drag the task to a different time. Confirm the drag persists across reload.
4. Complete the task. Confirm it shows the done state and counts in the day summary.
5. Open Focus. Run a 2-minute Coherent breath. Confirm haptics, phase label, "Session saved" sheet.
6. Log a habit. Confirm it appears as a slot in tomorrow's Plan.
7. Idle the app for 30 s. Confirm zero console errors.
8. Lighthouse mobile run. Score must be **no worse** than the Phase 1 baseline (capture in `output/lighthouse-phase2.json`).

---

## 4. What is left in Phase 3 (untouched)

The full content is in `(C)-PHASE-3-PROMPT-2026-04-25.md`. Quick map:

| Section | Goal |
|---|---|
| 3.1 Typography lockdown | 1.25 modular scale, weight 800 on hero numbers, tabular-nums everywhere digits change, optical-sizing auto on body, line-height ≤ 1.15 on H1. Static check fails on off-scale font sizes. |
| 3.2 Motion system | Three motion tier tokens (`--motion-fast/normal/deliberate`), applied consistently. Reduced-motion respected. |
| 3.3 Mobile shell upgrade | Bottom-tab nav (Overview / Habits / Plan / Focus / Profile) on mobile, swipe-back, PWA install prompt, safe-area-inset everywhere. |
| 3.4 Weekly Insights Engine | The wedge. `js/core/insights.js` + `insightsScheduler.js` Cloud Function + `<InsightCard>` on Home. Three cross-module insights generated every Monday 03:00 user-local. ~15 candidate rules; pick top 3 by `\|effect size\| × confidence`. |
| 3.5 Onboarding wizard | 6 steps in 60 seconds: goals → 3 starter habits → sleep target → monthly budget → first focus block today? → mood baseline. Persisted in `users/{uid}/onboarding/`. |
| 3.6 Streaks across modules | Mood / Sleep / Focus / Budget / Plan all get streaks. Shared `<StreakBadge>` primitive. |
| 3.7 Weekly Digest email | Friday 17:00 user-local. Top insight + streaks + 3 insights + CTA. Renders on Gmail / Outlook / iOS Mail. Opt-out from Profile → Notifications. |
| 3.8 Demo data mode | Profile → Settings toggle. Loads 6 weeks of seeded realistic data so investors see a populated dashboard. Toggle back restores real data. |
| 3.9 Landing rework | Real product screenshots above the fold. Differentiator headline tied to Insights Engine. Pricing/waitlist CTA. Social proof slot. Privacy one-liner. Lighthouse ≥ 95. |
| 3.10 Reliability | Sentry/Logflare wired; Playwright smoke per module in CI; data export covers every module; account-deletion confirmation lists subcollections; Lighthouse mobile ≥ 90. |

Phase 3 cannot start until Phase 2's master exit checklist (§3 above) is fully ticked.

---

## 5. Files Claude Code should read first (priority order)

1. **This file** (`(C)-CLAUDE-CODE-HANDOFF-2026-04-25.md`). Compiled context.
2. `(C)-HBIT-MERGED-ROADMAP-2026-04-25.md`. Source-of-truth roadmap.
3. `PHASE-2-PROGRESS-2026-04-25.md`. Codex's own report of what shipped in Phase 2.
4. `(C)-PHASE-1-DONE-2026-04-25.md`. Phase 1 receipts.
5. `(C)-PHASE-2-PROMPT-2026-04-25.md`. Original Phase 2 spec — for the parts not yet done.
6. `(C)-PHASE-3-PROMPT-2026-04-25.md`. Phase 3 spec.
7. `CLAUDE.md`. Project rules: no frameworks, mobile-first, all 4 themes, `(C)` prefix on AI-generated docs, bilingual EN/FR.
8. `COMMANDS.md`. Catalogue of installed `/skills` to invoke.
9. `js/core/components.js`. The shared primitives — read before migrating any module.
10. `js/core/db.js`. The data layer — read before touching schemas.

---

## 6. Suggested execution plan for Claude Code

**Sprint A — Finish Phase 2 (≈ 1 week)**

1. Clear external blockers first:
   - Add `firestore.indexes.json` entry for `habits.list` and deploy.
   - Investigate the offline/unavailable error; add `enablePersistence` if missing; surface a "Reconnecting…" toast.
2. Migrate the cross-module shell, one module per commit, in order: Plan → Focus → Habits → Mood → Sleep → Budget.
3. Split `js/pages/budget/index.js` into `state.js / render.js / modals.js / charts.js`.
4. Run the manual smoke test from §3.6.
5. Commit `phase 2 closeout — shell migration + budget split + smoke pass`.

**Sprint B — Phase 3.1 + 3.2 + 3.3 (≈ 4 days)**

Type scale, motion system, mobile bottom-tab nav. These three depend on each other; do as one cohesive pass.

**Sprint C — Phase 3.4 (≈ 1 week)**

Weekly Insights Engine. The wedge. Most investor-credible feature in the roadmap. Don't skimp.

**Sprint D — Phase 3.5 + 3.6 + 3.7 + 3.8 (≈ 1 week)**

Onboarding wizard, streaks, weekly digest, demo data mode.

**Sprint E — Phase 3.9 + 3.10 (≈ 4 days)**

Landing rework, reliability gates (Sentry, Playwright CI, Lighthouse pass, export coverage).

**Sign-off ritual.** After every sprint:

- `npm run check:phase1` green.
- Manual smoke per the relevant sprint's exit criteria.
- One commit per subsection. Each commit must leave the static check green.
- A short `(C)-SPRINT-{n}-DONE-{date}.md` receipt in the workspace, mirroring `(C)-PHASE-1-DONE-2026-04-25.md`.

---

## 7. Things Codex did right that should not regress

- The static check `scripts/phase1-static-check.js` and the `npm run check:phase1` gate. Extend it as new invariants are added (Phase 3.1 type-scale check goes here).
- `js/core/dashboardData.js` — single Firestore read for Home. Do not fork the dashboard data path again.
- The `tasks.onSnapshot(date, onChange, onError)` error callback contract. Other listener subscribers should adopt this same shape.
- Habit log deterministic IDs `${habitId}_${dateKey}`. Anywhere new habit-log writes are added, keep this scheme.
- Account-delete with re-auth → export → cleanup → Auth delete. Any future destructive flow should follow the same four-step pattern.

---

## 8. One-paragraph summary you can paste into a Claude Code session

> Hbit is a 6-module personal-growth web app on vanilla HTML/CSS/JS + Firebase. Phase 1 (bug fixes, schema cleanup, brand enforcement, mobile basics, light-theme parity, auth persistence) is shipped and gated by `npm run check:phase1`. Phase 2 Plan rebuild (Today/Week/List, hour grid, drag, quick-add NLP, morning review, recurrence/habit/subtasks/tags) and Phase 2 Focus rebuild (single display slot, three breathing patterns, haptics, reduced-motion, calm Session-saved completion) are shipped. Phase 2 cross-module shell primitives exist (`HBIT.components` + `css/core/components.css`) but no module's UI has been migrated to them yet. Phase 2 Budget was relocated from a 5,648-line monolith into `js/pages/budget/index.js` but not actually split. Phase 3 is untouched. Two external blockers: Firestore composite index for `habits.list` and intermittent offline/unavailable during smoke. Read `(C)-CLAUDE-CODE-HANDOFF-2026-04-25.md` for the file-level execution plan, then start with the shell migration in order Plan → Focus → Habits → Mood → Sleep → Budget. One commit per migrated module. `npm run check:phase1` must stay green.

---

*Prepared 2026-04-25. Hand to Claude Code. Start with Sprint A.*
