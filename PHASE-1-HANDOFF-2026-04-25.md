# Hbit Phase 1 Handoff - 2026-04-25

Phase 1 from `(C)-HBIT-MERGED-ROADMAP-2026-04-25.md` has been implemented as a stabilization pass. Target state: stop visible breakage, fix data drift, enforce brand/color rules, improve mobile basics, and add checks so the same bugs do not quietly return.

## Completed

### 1.1 Hidden-state enforcement
- Added global `[hidden] { display: none !important; }` in `css/core/base.css`.
- Added Focus-specific guards so hidden breathe UI cannot leak behind the timer.
- Added `.fc-panel:not(.is-active) { display: none; }` so inactive Focus panels no longer reserve height.

### 1.2 Data drift and broken persistence
- Home now reads canonical planner data from `HBIT.db.tasks` via `js/core/dashboardData.js`.
- Home migrates old local planner items from `hbit:plan:items` / `hbit:plan:tasks` into the canonical task schema once per user.
- Plan Firestore snapshots now expose an error callback and Plan shows retryable errors instead of silently failing.
- Habits now writes deterministic habit logs through `HBIT.db.habitLogs.set/remove`.
- `habitLogs.get()` now falls back to legacy random-ID logs by `(habitId, dateKey)` so old data still resolves.
- Account deletion now has data export, re-auth support, subcollection cleanup, and Auth deletion.

### 1.3 Brand and color enforcement
- Budget category visuals moved away from cyan toward the Budget amber family.
- Mood floating action button uses Mood violet instead of Budget amber.
- Plan overview label changed from "Colors" to "Priority".
- Mood profile avatar now uses the user's name/email initial instead of hard-coded `H`.
- Removed raw hex values from `js/pages/*.js`; page scripts now use CSS tokens/variables.

### 1.4 i18n, encoding, and copy cleanup
- Home hero summary now uses `t()` keys instead of hard-coded mixed EN/FR strings.
- Fixed the corrupted Planner label in Home.
- Cleaned visible mojibake from shipped HTML fallbacks/titles/placeholders.
- Added Phase 1 static check for known mojibake patterns.

### 1.5 Landing first viewport
- Reworked landing hero spacing so desktop no longer opens with a mostly empty first viewport.
- Mobile now shows product preview, brand headline, subhead, and CTA above the fold.
- Mobile nav no longer clips the CTA; hero carries the primary CTA instead.

### 1.6 Mobile tap targets
- Added `--tap-min: 44px` usage to global interactive controls.
- Raised Focus tabs and Plan action buttons to a 44px minimum hit area.

### 1.7 Auth persistence and overpromise cleanup
- Firebase persistence now uses `LOCAL`, with `SESSION` only as fallback.
- Login and signup persistence match the app-level auth persistence.
- Sleep "integrations coming soon" panel is hidden from the active surface.

### 1.8 Light theme parity
- Added larger light-theme parity blocks for Plan and Budget surfaces, controls, pills, modals, and muted copy.

## New Guardrails

- Added `scripts/phase1-static-check.js`.
- Added `npm run check:phase1`.
- The check fails if:
  - global `[hidden]` enforcement is missing,
  - inactive Focus panels can still reserve layout height,
  - `js/pages/*.js` contains raw hex colors,
  - known mojibake patterns appear in shipped HTML/CSS/JS.

## Verification Run

Commands passed:

```powershell
npm.cmd run check:phase1
node --check js\core\db.js
node --check js\core\dashboardData.js
node --check js\pages\home.js
node --check js\pages\plan.js
node --check js\pages\habits.js
node --check js\pages\profile.js
node --check js\pages\login.js
node --check js\pages\signup.js
node --check js\pages\mood.js
node --check js\pages\sleep.js
git diff --check
```

Notes:
- `npm` is blocked by the local PowerShell execution policy, so use `npm.cmd run check:phase1` on this machine.
- `git diff --check` only reports line-ending warnings about LF becoming CRLF when Git touches files; no whitespace errors were reported.

Chrome screenshots generated locally:
- `output/phase1-index-mobile-v4.png`
- `output/phase1-index-desktop-v2.png`
- `output/phase1-login-mobile.png`
- `output/phase1-welcome-mobile.png`

## Files Changed

Core/data:
- `js/core/db.js`
- `js/core/dashboardData.js`
- `js/core/firebase-init.js`
- `js/core/i18n.js`

Pages/scripts:
- `js/pages/home.js`
- `js/pages/plan.js`
- `js/pages/habits.js`
- `js/pages/profile.js`
- `js/pages/login.js`
- `js/pages/signup.js`
- `js/pages/mood.js`
- `js/pages/sleep.js`

CSS:
- `css/core/base.css`
- `css/pages/focus.css`
- `css/pages/plan.css`
- `css/pages/budget.css`
- `css/pages/mood.css`
- `css/pages/landing.css`

HTML:
- `profile.html`
- `plan.html`
- `sleep.html`
- `habits.html`
- `home.html`
- `login.html`
- `mood.html`
- `privacy.html`
- `signup.html`
- `terms.html`
- `welcome.html`

Tooling:
- `package.json`
- `scripts/phase1-static-check.js`

## Remaining Work - Phase 2

Phase 2 is still the flagship rebuild:
- Rebuild Plan into Today / Week / List with a real hour grid, now line, drag/reschedule, natural-language quick add, habit blocks, conflict actions, and a morning review sheet.
- Rebuild Focus into one display slot with a proper state machine, real breathing animations, haptics, reduced-motion support, and calm completion instead of confetti.
- Extract shared primitives: ModuleHeader, Sheet, Card, Stat, Pill, EmptyState, Skeleton, Toast, confirmations.
- Split oversized files, especially `js/pages/budget.js`, then sleep/habits when touched.

## Remaining Work - Phase 3

Phase 3 is investor-grade finish:
- Lock typography scale, weights, tabular numbers, and optical sizing.
- Define motion tiers and reduced-motion behavior everywhere.
- Add mobile bottom-tab shell.
- Ship Weekly Insights Engine as the investor wedge.
- Add onboarding, streaks, weekly digest, demo data mode, landing screenshots, Sentry/Logflare, Playwright CI smoke tests, export/delete final polish, and Lighthouse mobile performance targets.
