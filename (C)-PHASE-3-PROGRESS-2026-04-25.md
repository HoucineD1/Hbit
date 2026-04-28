# Hbit Phase 3 Progress - 2026-04-25

## Current Status

Phase 3 has started after Phase 2 Budget runtime sign-off.

Overall: Phase 3 foundation is underway. The app is not investor-ready yet, but the first premium-system layers are now in place.

## Completed In This Pass

### 3.1 Typography Lockdown

- Added locked type scale tokens in `css/core/tokens.css`: `12 / 14 / 16 / 20 / 24 / 32 / 40 / 56`.
- Mapped legacy font-size aliases onto the locked scale.
- Added optical sizing on `body`.
- Added tabular numerals for live values: money, timers, counters, stats.
- Added stronger hero-number weight and tighter heading line-height.
- Added `scripts/phase3-static-check.js`.
- Added `npm run check:phase3` and `npm run check:all`.

### 3.2 Motion System

- Added global motion tokens:
  - `--motion-fast`
  - `--motion-normal`
  - `--motion-deliberate`
  - `--motion-instant`
- Mapped older easing aliases to the new motion curve.
- Replaced key shared transitions in `base.css`, `animations.css`, `components.css`, and `nav.css` with the new motion tokens.
- Kept `prefers-reduced-motion` protection active in base, animations, components, and nav.
- Extended `check:phase3` so it verifies typography tokens, motion tokens, tabular numerals, reduced-motion support, and mobile bottom-tabs.

### 3.3 Mobile Shell Foundation

- Added a mobile bottom-tab bar injected by `js/core/sidebar.js`.
- Mobile tabs: Overview, Habits, Plan, Focus, Profile.
- On mobile (`<= 767px`), the old sidebar and menu trigger are hidden.
- Added safe-area aware bottom padding so content and FABs do not sit under the tab bar.
- Added a mobile swipe-back gesture from the left edge.
- Added a one-time PWA install prompt after 3 sessions, suppressed when already installed or dismissed.

### 3.4 Weekly Insights Engine Foundation

- Added `js/core/insights.js`.
- Added pure helpers:
  - `correlate(seriesA, seriesB)`
  - `streakAnalysis(events, predicate)`
  - `cohort({ slice, items })`
- Added a client-side `generateFromDashboard()` fallback that creates three Home insight cards from current dashboard data.
- Added a new Home `Weekly Insights / Connect the dots` section above the weekly summary.
- Insight cards include title, body, confidence, `Why?` math expander, and a deep link.
- Added a scheduled Firebase Function scaffold in `functions/index.js`.
- Added pure weekly-insight math in `functions/insightsCore.js`.
- Function runs every Monday at 03:00 America/Toronto and writes cards to `users/{uid}/insights/{weekKey}`.
- Added Firestore index entries for `insights.weekKey`, `budgetEntries.dateKey`, and `focus_sessions.dateKey`.
- Home now loads saved insight cards first, then falls back to local dashboard-derived cards.

### 3.5 Onboarding Wizard

- Replaced the old 3-step welcome flow with a 6-step activation wizard in `js/pages/onboarding.js`.
- New flow: goals, 3 starter habits, sleep target, monthly budget, first focus block, mood baseline.
- The wizard is no longer skippable in the UI.
- On finish, it seeds:
  - active habits
  - sleep target settings
  - monthly budget goal
  - today's mood baseline
  - optional first focus task in Plan
- Added `welcome.html?force=1` support so completed users can rerun setup.
- Added Profile account link: `Rebuild my setup`.
- Fixed light-theme onboarding contrast after browser smoke exposed nearly invisible text.

### 3.6 Streak Surface

- Added cross-module streak calculation to `js/core/dashboardData.js`.
- Home now receives `streaks` for Habits, Sleep, Mood, Budget, Focus, and Plan.
- Added a new Home `Momentum / Streaks` section with six module-linked streak pills.
- Budget streak now only counts days with actual budget entries that stay under the daily target, avoiding fake 30-day streaks on empty data.

### 3.7 Demo Data Mode

- Added `js/core/demoData.js`.
- Added a Profile toggle: `Demo data mode`.
- Demo mode is local and reversible; it does not write demo records into the user's Firestore data.
- Home uses a realistic 6-week investor walkthrough dataset when demo mode is enabled:
  - 4/5 habits complete
  - budget remaining
  - sleep and mood history
  - streaks across all six modules
  - three investor-grade cross-module insight cards

## Verification

Passed:

```powershell
npm.cmd run check:all
node --check js\core\sidebar.js
node --check js\core\components.js
node --check js\core\insights.js
node --check js\core\demoData.js
node --check js\core\dashboardData.js
node --check js\pages\home.js
node --check js\pages\onboarding.js
node --check js\pages\profile.js
```

Browser smoke:

- Mobile 390px:
  - bottom tabs visible
  - 5 tabs rendered
  - active tab set to `home.html`
  - sidebar and old trigger hidden
  - body bottom padding present
  - PWA prompt appears after session count reaches 3
- Desktop 1366px:
  - sidebar remains visible
  - bottom tabs hidden
  - no JavaScript page errors
- Home insights 390px:
  - `#homeInsights` renders
  - 3 `.hc-insight-card` cards render
  - active bottom tab remains `home.html`
  - no JavaScript page errors
- Onboarding 390px:
  - auth guard redirects anonymous users to login
  - logged-in `welcome.html?force=1` shows 6 progress dots
  - can move through all 6 steps without a page error
  - step 6 CTA is visible and enabled
  - light-theme contrast fixed after screenshot review
- Home streaks 390px:
  - 6 streak pills render
  - 3 insight cards render
  - mobile bottom tabs render
  - budget empty-data streak fixed from 30 to 0
- Demo data mode 390px:
  - Home metrics switch to demo values
  - 6 demo streaks render
  - 3 demo insight cards render
  - no Firestore writes required

Screenshots:

- `output/phase3-mobile-shell-pwa.png`
- `output/phase3-home-insights-mobile.png`
- `output/onboarding-debug-wait.png`
- `output/phase3-home-streaks-mobile.png`
- `output/phase3-demo-data-home-mobile.png`

## Still Open In Phase 3

- Finish full 3.2 motion audit across page-level CSS; many page files still use legacy local transition values.
- Deploy and verify 3.4 Weekly Insights Engine Cloud Function in Firebase.
- Run one real onboarding completion on a test account to confirm Firestore seeding end-to-end.
- Add per-module streak badges directly inside Sleep, Budget, and Plan pages if required beyond the Home streak surface.
- 3.7 Weekly Digest email.
- 3.9 Landing rework with real product screenshots and insight positioning.
- 3.10 Sentry/Logflare, Playwright smoke tests in CI, export coverage, deletion confirmation, Lighthouse pass.
- External: deploy Firestore indexes with `firebase deploy --only firestore:indexes`.

## One-Line Status

Phase 3 foundations are now materially in place: typography, motion tokens, mobile bottom navigation, swipe-back, PWA prompt, Home insight cards, weekly insight function scaffold, and six-step onboarding are implemented and locally verified. Next best step is streak badges across all modules, then demo data mode.
