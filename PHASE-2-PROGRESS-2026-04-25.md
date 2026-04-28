# Hbit Phase 2 Progress - 2026-04-25

This pass continues Phase 2 and lands the highest-risk product changes: Plan 2.1, Focus 2.2, the shared primitive foundation for 2.3, and the safe part of Budget 2.4.

## Completed

### 2.1 Plan

- Added persistent `Today / Week / List` view modes.
- Built the Today 06:00-23:00 vertical hour grid with a live Now line.
- Rendered timed tasks as positioned blocks with priority color, duration height, drag-to-reschedule, resize, and conflict actions.
- Empty hour rows open the Add Task sheet pre-filled with time and duration.
- Habit blocks render in the planner timeline instead of as a separate list.
- Quick-add parses one-line input like `Workout 7am 45m high #fitness`.
- Replaced the carry-over banner with a Morning Review sheet.
- Morning Review now uses an inline date picker, not `window.prompt`.
- Week tasks can jump into the matching Today view.
- Timeline blocks include `-15 / +15` keyboard-friendly nudge controls.
- The Add Task sheet has recurrence, linked habit, subtasks, tags, reminders, custom priority, duration, and time controls.
- Plan no longer uses native `<select>` or `<input type="time">`.

### 2.2 Focus

- Replaced the overlapping timer/breath display with one `#fcDisplay` slot.
- Removed old `#fcTimeDisplay`, `#fcBrDisplay`, and `#fcFocusPop` surfaces.
- Breathe cards open the full-screen overlay for Box, 4-7-8, and Coherent patterns.
- The overlay shows phase label, seconds, progress, and remaining time.
- Haptics fire on breathing phase transitions where supported.
- End-early records breathing only after at least 60 seconds.
- Per-session confetti is gone. Completion now shows a calm "Session saved" sheet with next actions.
- Focus respects `prefers-reduced-motion`.

### 2.3 Shared Primitive Foundation

- Added `js/core/components.js`.
- Loaded the shared component script across Home, Habits, Mood, Sleep, Budget, Focus, Plan, and Profile.
- Added shared APIs for:
  - `HBIT.components.confirm`
  - `HBIT.components.openSheet`
  - `HBIT.components.closeSheet`
  - `HBIT.components.bindSheet`
  - `HBIT.components.moduleHeader`
  - `HBIT.components.card`
  - `HBIT.components.stat`
  - `HBIT.components.pill`
  - `HBIT.components.emptyState`
  - `HBIT.components.skeleton`
- Added matching CSS primitives in `css/core/components.css`.
- Migrated Habits destructive delete from native `confirm()` to the shared Confirm primitive.
- Habits delete failures now show a toast instead of failing silently.
- Routed Mood and Sleep page-local toast calls through the global `HBIT.toast` placement.
- Migrated Plan's page header to shared `.hbit-module-header`.
- Migrated Plan Add Task and Morning Review sheets to shared `.hbit-sheet-overlay` / `.hbit-sheet`.
- Plan sheets now use `data-hbit-sheet` and `data-hbit-sheet-close`, so backdrop close, Escape, and focus management are shared.
- Removed remaining dead Plan mobile CSS references to old `.pl-header`, `.pl-header-actions`, `.pl-icon-btn`, and `.pl-avatar`.
- Cleaned Plan initial fallback mojibake in the document title and week navigation arrows.
- Migrated Plan summary surface to shared `.hbit-card`.
- Migrated Plan overview cards to shared `.hbit-stat`.
- Migrated Plan empty state to shared `.hbit-empty-state` / `.hbit-empty-icon`.
- Migrated Plan filter chips, task status/priority pills, timeline tags, and quick-add preview chips to shared `.hbit-pill`.
- Fixed Plan mobile app bar height regression caused by the long `plan.subtitle` wrapping in the shared header kicker.
- Hardened shared header chrome so module marks/actions do not shrink, theme toggles show only one icon, and avatars render as proper circular buttons.
- Added the missing global `.sr-only` utility in `css/core/base.css`; this fixed Plan's quick-add label rendering visibly on mobile.
- Retested Plan mobile after the fix: header stays 69px high, actions are 44x44, quick-add shows only the placeholder + Add button, and the Today grid remains visible.
- Migrated Focus's page header to shared `.hbit-module-header`.
- Migrated Focus Settings from page-local modal chrome to shared `.hbit-sheet-overlay` / `.hbit-sheet`.
- Focus Settings now opens/closes through `HBIT.components.openSheet` / `HBIT.components.closeSheet`, including shared Escape and aria-hidden handling.
- Migrated Mood's page header to shared `.hbit-module-header`; shortened the mobile title treatment to avoid app-bar ellipsis.
- Migrated Mood Daily Check-in to shared `.hbit-sheet-overlay` / `.hbit-sheet`.
- Migrated Sleep's page header to shared `.hbit-module-header`.
- Migrated Sleep Plan Tonight and Log Sleep sheets to shared `.hbit-sheet-overlay` / `.hbit-sheet`.
- Sleep and Mood sheet open/close flows now call `HBIT.components.openSheet` / `HBIT.components.closeSheet` while preserving their existing page state classes.
- Cleaned remaining mojibake in `sleep.html` caught by `npm run check:phase1`.
- Migrated Habits header to shared `.hbit-module-header`.
- Migrated Habits New Habit wizard and Habit Detail modal to shared `.hbit-sheet-overlay` / `.hbit-sheet`.
- Habits wizard/detail open-close paths now call `HBIT.components.openSheet` / `HBIT.components.closeSheet`.
- Migrated Budget header to shared `.hbit-module-header`.
- Migrated Budget primary sheets (`acct`, `expense`, `bill`, `limit`, `goal`, `goal detail`, `autofill`) to shared `.hbit-sheet-overlay` / `.hbit-sheet`.
- Budget's central `openOverlay` / `closeOverlay` now routes through `HBIT.components.openSheet` / `HBIT.components.closeSheet`.
- Hid Budget's export control from the mobile app bar to stop the title from truncating; export remains available on larger headers.
- Added visible Help buttons to the shared module headers for Plan, Focus, Habits, Mood, Sleep, and Budget.
- Fixed `HBIT.utils.initHelpModal` so it accepts both CSS selectors and bare element IDs; this restored Help wiring on pages that passed IDs like `hbHelpBtn`.
- Routed shared Help overlays through `HBIT.components.openSheet` / `HBIT.components.closeSheet`, while preserving the existing `.open` class for page CSS.
- Added true initial `hidden` state to Plan, Focus, Habits, Mood, and Sleep Help overlays so they do not sit invisibly active at rest.
- Migrated Sleep Help to the shared `.hbit-help-overlay` / `.hbit-help-card` structure and restored a 44x44 close target.
- Bound Habits and Mood Help earlier in page init so app-bar Help is clickable before slow auth/data reads finish.
- Migrated Habits streak milestone overlay through the shared sheet lifecycle and wired its close CTA, backdrop, and Escape close behavior.
- Migrated Budget Month-end summary overlay to `hbit-sheet-overlay` lifecycle with `hidden`, `aria-hidden`, shared Escape close, and shared sheet opening/closing.
- Marked Mood main panels, Sleep calculator/device/CTA cards, Focus intent/progress/session cards, Habits cards, and Budget sections as shared `hbit-card` surfaces while preserving their existing module-specific visual styling.
- Marked Focus session counters and Budget KPI buttons as shared `hbit-stat` surfaces.
- Marked Habits and Budget empty states as shared `hbit-empty-state` surfaces.
- Added shared primitive classes to dynamic cards generated by Mood, Sleep, Habits, and Budget render paths.

### 2.4 Budget Weight

- Moved the large Budget implementation to `js/pages/budget/index.js`.
- Kept `js/pages/budget.js` as a tiny compatibility entry.
- Updated `budget.html` to load the new entry directly.
- Direct `js/pages/*.js` files are now all under 2,500 lines.
- Split Budget further into `js/pages/budget/{index,render-modern,wizard-goals,copy}.js`, all loaded `defer` into one shared IIFE scope.
- Restored render functions lost during the split: `renderOverviewDonut`, `renderBills`, `renderAccounts`, `animateDonutSweep` (extracted from commit `d3c365f` and adapted to current helpers `setCountedMoney` / `isBillPaid` / `billStatus` / `billDueText`).
- Restored `computeHealthScore()` in `js/pages/budget/index.js`; this fixed the last observed Budget runtime error after the split.
- `node --check` passes for all four split files; `npm run check:phase1` passes.

### Phase 3.1 Started

- Added locked typography scale tokens: `12 / 14 / 16 / 20 / 24 / 32 / 40 / 56`.
- Mapped legacy font aliases onto the locked scale.
- Added `font-optical-sizing: auto`, stronger hero-number weights, tighter heading line-height, and tabular numerals for live values.
- Added `scripts/phase3-static-check.js`.
- Added `npm run check:phase3` and `npm run check:all`.
- `npm run check:all` currently passes.

## Verification

Passed:

```powershell
node --check js\pages\plan.js
node --check js\pages\focus.js
node --check js\pages\budget.js
node --check js\pages\budget\index.js
node --check js\core\components.js
node --check js\pages\habits.js
node --check js\core\i18n.js
npm.cmd run check:phase1
git diff --check
```

`git diff --check` only reported Windows line-ending warnings.

Local Chrome smoke:

- Focus loads with exactly one `#fcDisplay`.
- Old Focus display nodes are gone.
- Box breathing card opens the live overlay.
- Shared component API is available on page boot.
- Shared Confirm opens, traps focus, and closes on Escape.
- Authenticated Plan loads and shows the view switch.
- Authenticated Plan Add Task sheet opens through `HBIT.components.openSheet` and closes on Escape.
- Authenticated Plan smoke confirms shared primitives render: header, cards, stats, pills, empty state, and sheet markers.
- Visual Plan app bar check: mobile header is 69px high, actions are 44x44, theme toggle shows one icon, avatar renders as a 44px circle.
- Visual Plan quick-add check: `.sr-only` label is visually hidden again, input remains 44px tall, and the mobile row no longer has label/placeholder collision.
- Visual Focus app bar check: mobile header is 69px high, mark is 44x44, and sound/settings actions are 44x44.
- Visual Focus Settings check: shared sheet opens with `is-open`, close button is 44x44, and Escape closes it with `aria-hidden="true"`.
- Visual Mood app bar check: mobile header is 69px high, mark/actions/avatar are 44x44, and title no longer clips.
- Visual Mood Daily Check-in check: shared sheet opens with `is-open`, close button is 44x44, and Escape closes it.
- Visual Sleep app bar check: mobile header is 69px high, mark/actions/avatar are 44x44.
- Visual Sleep Plan Tonight check: shared sheet opens with `is-open`, close button is 44x44, and Escape closes it.
- Visual Habits app bar check: mobile header is 69px high, mark/actions/avatar are 44x44.
- Visual Habits New Habit wizard check: shared sheet opens with `is-open`, close button is 44x44, and Escape closes it.
- Visual Budget app bar check: mobile header is 69px high, title no longer truncates, and visible actions/avatar are 44x44.
- Visual Budget Expense sheet check: shared sheet opens with `is-open`/`open`, close button is 44x44, and Escape closes it.
- Authenticated Budget loads and shows the Budget header.
- Visual Help overlay smoke: Sleep, Habits, Plan, Mood, Focus, and Budget Help buttons open their overlays and close via Escape.
- Visual Habits milestone smoke: milestone overlay opens through the shared sheet lifecycle and closes via CTA with `hidden=true` / `aria-hidden="true"`.
- Visual primitive-count smoke after card migration:
  - Focus: 4 shared cards, 1 shared empty state.
  - Mood: 12 shared cards.
  - Sleep: 6 shared cards.
  - Habits: 4 shared cards, 1 shared empty state.
  - Budget: 26 shared cards, 3 shared stats, 3 shared empty states.
- Visual Budget Month-end smoke: shared overlay opens with `is-open`, closes on Escape, and returns to `hidden=true` / `aria-hidden="true"`.
- Visual Budget add-flow smoke after Claude continuation and Codex fix:
  - Mobile 390px: Expense, Income, Bill, Account, and Goal sheets all open with `hidden=false`, `aria-hidden=false`, `display:flex`, and no console/page errors.
  - Desktop 1440px: Expense sheet opens with `hidden=false`, `display:flex`, and no console/page errors.
  - Budget mobile app bar: header is 69px high, title width is 154px, actions cluster is 96px wide, visible actions are 44px tall.

Observed during smoke, unrelated to this pass:

- Firestore temporarily reported offline/unavailable.
- Firestore requires a composite index for `habits.list`.
- External deploy still needed before a clean Phase 3 data pass: `firebase deploy --only firestore:indexes`.

## Still Open

### 2.3 Cross-module shell migration

The foundation exists, but the full visual migration is still open. The next pass should replace page-specific implementations with the new shared primitives:

- ModuleHeader
- Sheet
- Card
- Stat
- Pill
- EmptyState
- Skeleton
- Toast
- Confirm

Current migration status:

- Plan: header, sheets, cards, stats, pills, empty state done.
- Focus: header and settings sheet done; Breathe overlay and Session Saved sheet intentionally remain custom full-screen wellness surfaces for now.
- Mood: header, Daily Check-in sheet, and Help overlay wiring done; deeper cards remain page-specific.
- Sleep: header, Plan Tonight sheet, Log Sleep sheet, and Help overlay done; page cards remain page-specific.
- Habits: header, New Habit wizard, Habit Detail sheet, Help overlay, streak milestone overlay, Confirm, and Toast wiring done.
- Budget: header, Help entry point, primary sheets, month-end overlay, cards, stats, and empty states done; setup wizard remains custom.

Recommended next migration order: complete the real Budget code split (`state/render/modals/charts`), then run a Phase 2 visual polish sweep.
