# Hbit Full Product Audit

Date: 2026-04-25  
Scope: live Vercel app, local code, mobile/desktop screenshots, Plan and Focus deep dive, investor-readiness review.

Login check:
- Used the provided account and reached `https://hbit-202603.vercel.app/home.html`.
- Authenticated Home text showed `Good evening, Mimi`, `Habits 0/4`, `Mood 2/10`, `$200`, `Focus 0/3`, `Planned 0`.
- The authenticated page title rendered as `Hbit â€” Dashboard`, confirming an encoding/polish issue in the shipped UI.

Live screenshots captured:
- `output/live-home-mobile.png`
- `output/live-home-desktop.png`
- `output/live-plan-mobile.png`
- `output/live-plan-desktop.png`
- `output/live-focus-mobile.png`

## Executive Grade

Overall: **5.8/10 today**

Hbit has the bones of a strong personal growth OS: clear modules, Firebase sync direction, bilingual ambition, theme tokens, and a warm premium concept. It is not yet investor-ready because the public first impression has visible layout failures, Plan does not yet feel like a real planner, shared data models drift between modules, and a global hidden-state bug makes UI state unreliable.

## Area Scores

| Area | Grade | Read |
|---|---:|---|
| Landing / first impression | 4/10 | Public hero is mostly empty above the fold; mobile headline clips horizontally. This hurts trust immediately. |
| Auth / onboarding | 6/10 | Polished visual shell, but persistence is session-only and auth pages still have hard-coded/encoding issues. |
| Home dashboard | 6/10 | Useful module overview, but planner/focus summaries can be stale because Home reads old localStorage shapes. |
| Habits | 6.5/10 | Strongest module conceptually, but habit log schema conflicts with shared DB layer. |
| Plan | 4.5/10 | Current live UI has visible hidden-state bugs and is still a task list, not a calendar-grade planner. |
| Focus / breathing | 6/10 | Good feature idea and solid timer base, but breathing UI is visibly broken on mobile because hidden display is overridden. |
| Budget | 5.5/10 | Feature-rich but too dense; risk of feeling like a spreadsheet rather than a calm coach. |
| Sleep | 6.5/10 | Good direction, still needs consistency and lighter presentation. |
| Mood | 6.5/10 | Emotionally aligned, but needs stronger insight loop and tighter system consistency. |
| Profile / settings | 5.5/10 | Basic account controls exist, but account deletion does not clean app data. |
| Accessibility | 5/10 | Some labels/skip links exist, but touch targets, hidden states, contrast, and keyboard flows need work. |
| Responsive design | 5/10 | Mobile-first intent exists, but live screenshots show clipping, overcrowded cards, and awkward desktop use of space. |
| Data reliability | 5/10 | Firebase abstraction exists, but page-local schemas and silent failures create drift. |
| Investor readiness | 5/10 | Promising story, but too many demo-visible flaws for a confident pitch. |

## Audit Health Score

| Dimension | Score | Key Finding |
|---|---:|---|
| Accessibility | 2/4 | Hidden-state bug, sub-44px controls, inconsistent modal/focus behavior. |
| Performance | 3/4 | Static app is relatively light, but huge page-level CSS/JS files and external scripts delay confidence. |
| Responsive | 2/4 | Mobile screenshots show clipped landing text and crowded Plan cards. |
| Theming | 2/4 | Tokens exist, but modules still use hard-coded colors and local palettes. |
| Anti-patterns | 2/4 | Too many card stacks, samey hierarchy, and dashboard overload in key flows. |
| Total | **11/20** | Acceptable foundation, risky release. |

## Critical Findings

### P0 - Global hidden-state bug breaks multiple screens

Impact: UI shows elements that the app logic explicitly hides. This is visible in Chrome screenshots:
- Plan mobile shows the carry-over banner even though DOM has `hidden`.
- Focus mobile shows the breathing phase label and seconds behind the `25:00` timer during work mode.

Cause: the app only defines `.hidden { display:none !important; }` in `css/core/base.css:49`, but does not define `[hidden] { display:none !important; }`. Page CSS then overrides the browser default with declarations like `.pl-carry-over { display:flex; }` in `css/pages/plan.css:239` and `.fc-br-display { display:flex; }` in `css/pages/focus.css:372`.

Fix:
- Add global `[hidden] { display: none !important; }` to base CSS.
- Audit all overlays, sheets, empty states, breathing displays, and sections using `hidden`.
- Add a smoke test per page that checks known hidden elements are actually non-rendered.

### P0 - Landing page fails the first-viewport trust test

Impact: public Vercel screenshots show a huge dark empty area before the headline. On mobile, the headline is clipped: "Track everything. Improve everythin...". A user or investor can reasonably interpret this as unfinished.

Evidence:
- `output/live-home-mobile.png`
- `output/live-home-desktop.png`
- Landing CSS has large hero sizing and many fixed/fit-content elements around `css/pages/landing.css:221`, `css/pages/landing.css:275`, `css/pages/landing.css:1589`, and `css/pages/landing.css:1805`.

Fix:
- Reframe landing hero so brand/product is visible in the first viewport.
- Put the product UI preview or meaningful module surface above the fold.
- Ensure H1 wraps cleanly at 320-390px and desktop hero does not waste 60% of the viewport.

### P1 - Plan is not a 10/10 planner yet

Impact: The current Plan feature looks like a decorated task list. It lacks the mental model users expect from "planner": day/week modes, real time blocks, drag/long-press rescheduling, calendar density, and fast capture.

Evidence:
- Plan structure is summary cards + priority filters + timeline list in `plan.html:82`.
- Time conflict detection exists in `js/pages/plan.js:649`, but conflicts are warnings only; there is no assisted rescheduling.
- Empty state exists, but the first screen is dominated by meta cards before the task/planning surface.

Fix:
- Add `Today / Week / List` segmented control.
- Make Today the default mobile canvas: vertical time grid, "now" line, tap empty slot to add, long-press task to reschedule.
- Add natural-language quick add: "Gym tomorrow 7am 45m high".
- Move summary/legend behind a compact header or bottom sheet.
- Sync today's habits into the day schedule as optional blocks, not a separate list.

### P1 - Habit logs are written with incompatible IDs

Impact: Plan reads habit completion through `HBIT.db.habitLogs.get(habit.id, date)`, which expects deterministic IDs. Habits writes completion logs with random Firestore IDs. Result: a habit completed in Habits may not show completed in Plan.

Evidence:
- `js/pages/habits.js:856` uses `logsCol().add(...)`.
- `js/core/db.js:275` expects `habitId_dateKey`.
- `js/pages/plan.js:152` reads through shared deterministic getter.

Fix:
- Migrate Habits to `HBIT.db.habitLogs.set/remove`.
- Backfill or lookup legacy random-ID logs by `(habitId, dateKey)` during migration.

### P1 - Plan Firestore listener can fail silently

Impact: permission/index/network errors can leave the planner looking empty or loading without explanation.

Evidence:
- `js/core/db.js:898` exposes `tasks.onSnapshot(date, callback)` with no error callback.
- `js/pages/plan.js:168` subscribes without handling snapshot errors.
- `js/pages/plan.js:181` suppresses `listAll` errors with `.catch(()=>{})`.

Fix:
- Add error callback support to `HBIT.db.tasks.onSnapshot`.
- In Plan, show a toast with retry and fall back to last known cache only when clearly labeled.

### P1 - Local/cloud split-brain will confuse daily users

Impact: Plan uses Firestore when authenticated and localStorage when unauthenticated. Home reads a different localStorage key and older item shape. A user can add tasks, log in, and see different task totals.

Evidence:
- Plan local fallback key: `hbit:plan:tasks` in `js/pages/plan.js:186`.
- Home planner key: `hbit:plan:items` in `js/pages/home.js:10`.
- Home filters for `item.text` in `js/pages/home.js:138`.
- Plan creates `title` in `js/pages/plan.js:213`.

Fix:
- One canonical `tasks` schema in `HBIT.db`.
- Home should read `HBIT.db.tasks` when authenticated and migrate old local tasks once.
- Show explicit "offline/local" state if local mode remains.

### P1 - Account deletion leaves user data behind

Impact: `user.delete()` removes Firebase Auth only; Firestore/Realtime DB subcollections remain unless a backend cleanup exists. This is a privacy and compliance risk.

Evidence:
- `js/pages/profile.js:314` calls `await user.delete()` without deleting app data.

Fix:
- Add Cloud Function cleanup, or implement a verified client-side delete workflow before auth deletion.
- Include re-auth, export/download option, and clear confirmation copy.

### P1 - Cross-module shell is inconsistent

Impact: The user has to relearn each module. Investors will read this as lack of product system maturity.

Examples:
- Plan header title is the date/module depending on live/local state.
- Focus header says "Zen Timer" and "FOCUS TIME" instead of following the same module/title pattern.
- Budget is denser and more spreadsheet-like than Mood/Focus.

Fix:
- Standardize module shell: icon, module name, contextual subtitle, primary action, language/theme/profile cluster, help.
- Standardize bottom sheets, empty states, danger confirmations, loading skeletons, and toast placement.

### P2 - Focus/breathing is close but not premium

Impact: The idea is strong, but the current mobile screenshot shows visual overlap. Completion also feels too playful for the quiet premium brand when confetti fires after focus.

Evidence:
- Breathing display hidden attr is overridden by CSS at `css/pages/focus.css:372`.
- Focus completion uses confetti in `js/pages/focus.js:651`.

Fix:
- Fix `[hidden]`.
- Add reduced-motion handling for ring/breath animations.
- Replace confetti with a calmer completion moment: soft pulse, session saved sheet, next action.
- Make Breathe tab a guided session with visible phase timeline and better close/end affordances.

### P2 - Touch targets miss mobile standards

Impact: Small controls cause accidental taps, especially for one-thumb use.

Evidence:
- Plan action buttons are 36px and become 34px on mobile in `css/pages/plan.css:499` and `css/pages/plan.css:607`.
- Apple recommends 44x44 pt targets; Material commonly uses 48x48 dp.

Fix:
- Use `--tap-min:44px` everywhere.
- Keep visible icons smaller if desired, but make the interactive box at least 44px.

### P2 - i18n and encoding issues reduce polish

Impact: A bilingual app cannot ship with mojibake or hard-coded English/French strings.

Evidence:
- Home sets `Planifiés` directly in `js/pages/home.js:123`.
- Several files and screenshots show mojibake like `Hbit â€”`, `Sendingâ€¦`, and corrupted bullets.

Fix:
- Enforce all visible copy through `t()`.
- Convert files to UTF-8 consistently.
- Add a static check for mojibake patterns: `Ã`, `â€`, `Â`.

## What To Do To Make It 10/10

### Wave 1 - Fix demo-breaking bugs

1. Add global `[hidden] { display:none !important; }`.
2. Fix landing hero mobile and desktop first viewport.
3. Fix Plan carry-over visibility and Focus breathing display.
4. Fix Home/Plan task schema mismatch.
5. Add Plan snapshot error callback and visible retry toasts.

Expected result: **5.8/10 -> 7/10**.

### Wave 2 - Make Plan a flagship feature

1. Today/Week/List modes.
2. Mobile time-grid as default.
3. Tap empty slot to add.
4. Long-press/drag to reschedule.
5. Natural language quick add.
6. Conflict resolution suggestions.
7. Habit/task merge into one daily plan.
8. Carry-over as a morning review sheet, not a persistent banner.

Expected result: **Plan 4.5/10 -> 8.5/10**.

### Wave 3 - Normalize the product system

1. Shared module header.
2. Shared sheet/modal component.
3. Shared empty/loading/error states.
4. Token-only colors and spacing.
5. 44px minimum target system.
6. One consistent help/onboarding pattern.

Expected result: **overall 7/10 -> 8/10**.

### Wave 4 - Investor-ready story

1. Add an insights layer: "Because sleep was low and spending was high, keep today lighter."
2. Add weekly review: habits, mood, sleep, budget, focus, plan in one narrative.
3. Add demo data mode for a clean investor walkthrough.
4. Tighten landing: product preview, clear differentiator, screenshots, pricing waitlist/free CTA.
5. Add credibility: privacy stance, sync reliability, export/delete data.

Expected result: **overall 8/10 -> 9+**.

## Research Notes

- Apple Human Interface Guidelines recommend touch targets around 44x44 pt and enough spacing between controls: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Material and common mobile accessibility guidance use 48x48 dp targets for Android-style touch comfort: https://m3.material.io/foundations/accessible-design/accessibility-basics
- NN/g consistency guidance: users should not have to wonder whether different words/actions mean the same thing; internal consistency lowers learning cost: https://www.nngroup.com/articles/consistency-and-standards/
- NN/g recognition rather than recall: keep needed information and actions visible or easily retrievable: https://www.nngroup.com/articles/recognition-and-recall/
- Baymard mobile form research emphasizes that mobile typing, limited page overview, clear labels, field descriptions, and error messages are major usability drivers: https://baymard.com/blog/mobile-ecommerce-checkout-forms

## Recommended Implementation Order

1. `/harden` - hidden-state, snapshot errors, local/cloud split, account deletion risk.
2. `/adapt` - landing mobile, Plan mobile calendar, touch targets.
3. `/normalize` - shared shell, tokens, modals/sheets.
4. `/distill` - Budget and Plan cognitive load.
5. `/typeset` - hierarchy and copy density.
6. `/polish` - investor demo finish.
