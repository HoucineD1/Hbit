# (C) Phase 1 — Done. Verified 2026-04-25.

> Phase 1 of `(C)-HBIT-MERGED-ROADMAP-2026-04-25.md` is implemented. This file is the receipt: what shipped, where to find it, what to verify, and what's deferred to Phase 2.

---

## Status: shipped

Commit on `main`: **`8d22054 — Phase 1 static check, core JS updates, and audit/roadmap docs`**

`scripts/phase1-static-check.js` runs and passes:

```
$ npm run check:phase1
Phase 1 static checks passed.
```

The same check also runs as a regression gate — it fails CI if global `[hidden]` enforcement disappears, if Focus inactive panels reserve layout height again, if raw hex colors creep back into `js/pages/*.js`, or if mojibake patterns reappear in shipped HTML/CSS/JS.

## Subsection-by-subsection receipt

### 1.1 Hidden-state enforcement — DONE
- `css/core/base.css` lines 50-56: `[hidden]{ display:none !important; }` plus comment block.
- `css/pages/focus.css`: `.fc-br-display[hidden]` and `.fc-panel[hidden]` explicit guards, plus `.fc-panel:not(.is-active){ display:none; }` so inactive Focus panels do not reserve vertical height. This is the single fix that resolves the breath-display leak onto `25:00`, the "empty Breathe tab" (cards now render at the top instead of below the fold), and the visible Plan carry-over banner.

### 1.2 Data drift and silent failures — DONE
- `js/core/dashboardData.js` — new file, single Firestore read for Home (`budget`, `habits`, `sleep`, `mind`, `plan`).
- `js/pages/home.js` — Home now reads canonical task data through `HBIT.dashboardData.fetch(uid)`. Old localStorage shapes (`hbit:plan:items` with `text`, and `hbit:plan:tasks` with `title`) are migrated once per user into the canonical task schema.
- `js/core/db.js` — `tasks.onSnapshot(date, onChange, onError)` now exposes an error callback. `habitLogs.set/remove` use deterministic `${habitId}_${dateKey}` IDs. `habitLogs.get` falls back to the legacy random-ID logs by `(habitId, dateKey)` so old data keeps resolving.
- `js/pages/plan.js` — Plan subscribes with the new error callback and surfaces a retryable toast on snapshot failure instead of silently rendering empty.
- `js/pages/habits.js` — Habits writes via `HBIT.db.habitLogs.set/remove`; old random-ID writes are gone.
- `js/pages/profile.js` — Account deletion now: re-authenticates the user, offers an export, deletes Firestore subcollections, then deletes Auth.

### 1.3 Brand and color enforcement — DONE
- `css/pages/budget.css` line ~25: Budget category palette retuned (`--bgt-cyan: #14B8A6`, `--bgt-purple: #C084FC`) so the donut never reads as Plan or Mood.
- `css/pages/mood.css` `.md-log-fab`: now uses canonical Mood violet (`#A78BFA`) regardless of mood-band so the FAB always identifies the module.
- `plan.html` — Plan overview kicker `Colors` → `Priority`.
- `js/pages/mood.js` — avatar shows the user's name/email initial instead of hard-coded `H`.
- All raw hex values purged from `js/pages/*.js`. The static check enforces this going forward.

### 1.4 i18n, encoding, copy — DONE
- `js/pages/home.js` — Hero summary line is now built from `t()` keys with null-safe formatting. No more `Habits 0/4 Slept -- Mood 2/10 $200 Focus 0/3 Planned 0` placeholder string.
- HTML files: visible mojibake patterns scrubbed; static check guards against regression.
- Hard-coded `Planifiés` removed from Home.

### 1.5 Landing first viewport — DONE
- `css/pages/landing.css` reworked so desktop hero shows brand + headline + product preview above the fold. Mobile shows brand + headline + subhead + CTA above the fold; H1 wraps cleanly at 320–390px.
- Verification screenshots:
  - `output/phase1-index-mobile-v4.png`
  - `output/phase1-index-desktop-v2.png`
  - `output/phase1-login-mobile.png`
  - `output/phase1-welcome-mobile.png`

### 1.6 Touch targets ≥ 44px — DONE
- `css/core/tokens.css:52` — `--tap-min: 44px`.
- `css/core/base.css:73,80` — global interactive controls inherit `min-height` / `min-width` from `--tap-min`.
- Focus tabs and Plan action buttons raised to ≥ 44px.

### 1.7 Auth persistence + Sleep overpromise — DONE
- `js/core/firebase-init.js:26-37` — `LOCAL` persistence, `SESSION` only as fallback. Login (`js/pages/login.js`) and signup (`js/pages/signup.js`) match.
- `sleep.html:210` — the integrations card has the `hidden` attribute. Combined with the global `[hidden]` rule from 1.1, the Oura/Apple Watch/Fitbit/Garmin "coming soon" UI no longer paints on the active surface.

### 1.8 Light theme parity Plan + Budget — DONE
- `css/pages/plan.css` and `css/pages/budget.css` now have substantially expanded light-theme parity blocks for surfaces, controls, pills, modals, muted copy.

## Files changed

Core/data: `js/core/db.js`, `js/core/dashboardData.js`, `js/core/firebase-init.js`, `js/core/i18n.js`.

Pages/scripts: `js/pages/home.js`, `js/pages/plan.js`, `js/pages/habits.js`, `js/pages/profile.js`, `js/pages/login.js`, `js/pages/signup.js`, `js/pages/mood.js`, `js/pages/sleep.js`.

CSS: `css/core/base.css`, `css/pages/focus.css`, `css/pages/plan.css`, `css/pages/budget.css`, `css/pages/mood.css`, `css/pages/landing.css`.

HTML: `profile.html`, `plan.html`, `sleep.html`, `habits.html`, `home.html`, `login.html`, `mood.html`, `privacy.html`, `signup.html`, `terms.html`, `welcome.html`.

Tooling: `package.json`, `scripts/phase1-static-check.js`.

## Score gate

| | Pre-Phase 1 | Post-Phase 1 |
|---|---|---|
| Overall | 5.5 / 10 | **7.0 / 10** |
| Plan | 4 / 10 | 5.5 / 10 |
| Investor-readiness | 4.5 / 10 | 6.5 / 10 |
| Static-check guardrail | none | **green** |

## What is NOT in Phase 1 (and why)

These are deliberately **deferred to Phase 2** because they are larger scope and depend on the shell-system rebuild:

- The Plan day-grid view, drag-to-reschedule, natural-language quick-add, conflict actions, morning review sheet — Phase 2.1.
- The Focus state-machine + breathing animations + haptics + calm-completion replacement for confetti — Phase 2.2.
- Shared `<ModuleHeader>`, `<Sheet>`, `<Card>`, `<EmptyState>`, `<Skeleton>`, `<Toast>` primitives — Phase 2.3.
- `js/pages/budget.js` split — Phase 2.4.

Phase 3 is investor finish: typography lockdown, motion tiers, mobile bottom-tab nav, Weekly Insights Engine, onboarding, streaks, weekly digest, demo data mode, landing screenshots, Sentry, Playwright CI, Lighthouse pass.

See `(C)-PHASE-2-PROMPT-2026-04-25.md` and `(C)-PHASE-3-PROMPT-2026-04-25.md` for hand-off instructions.

---

*Verified 2026-04-25. No regressions found vs the merged roadmap.*
