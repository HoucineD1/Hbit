# (C) Phase 3 — Premium Finish + Investor Story. Hand-off Prompt.

> **For Codex / Claude Code.** Do **not** start Phase 3 until Phase 2's master exit checklist is fully ticked. Phase 3 is what turns a working app into an investor-ready product. Polish on broken UI is wasted polish.
>
> **Goal.** The app feels expensive, the demo tells a story, and the wedge — *cross-module insights* — actually exists. After this phase, you can ship to investors.
>
> **Score gate:** 8.5 → **9.5 / 10**. Investor-readiness 8 → 9. Estimated 2 weeks.

---

## Skills to invoke (in this order)

`/typeset` → `/animate` → `/delight` → `/adapt` → `/onboard` → `/ckm:banner-design` → `/ui-ux-pro-max` → `/optimize` → `/harden` → `/polish` → `/web-design-guidelines`.

After every subsection: `npm run check:phase1`. After every commit: human spot-check on mobile.

---

## 3.1 — Typography lockdown (the "police weak" fix)

The user's exact word was *"police weak"* — typography reads soft.

### What to do

- **Lock a 1.25 modular type scale** in `css/core/tokens.css`:
  ```
  --fs-12: 12px; --fs-14: 14px; --fs-16: 16px; --fs-20: 20px;
  --fs-24: 24px; --fs-32: 32px; --fs-40: 40px; --fs-56: 56px;
  ```
  Add a static check (extend `scripts/phase1-static-check.js` or create `phase3-static-check.js`) that fails CI if any `js/pages/*.js` or `css/pages/*.css` declares a `font-size:` value not from this scale.
- **Use weight contrast.** Big numbers (`$1,200`, `25:00`, big stat values) must be `font-weight: 800` with `letter-spacing: -0.02em`. Headings 700. Supporting text 500. Today nothing is at 800.
- **Tabular numerals.** Add `font-variant-numeric: tabular-nums` to every element where digits change live: timer, money totals, counters, progress meters. Eliminates width-flicker.
- **Optical sizing.** Add `font-optical-sizing: auto` on `body` (DM Sans is variable opsz-aware).
- **Display-pair font for hero numbers only** (optional). Add Inter Display or Space Grotesk as a `--font-display` token. Use only on hero numbers — not body.
- **Headline line-height.** 1.05 – 1.15 on `<h1>` / hero numbers. 1.5 on body. Today H1 line-height is 1.4 — too soft.

### Exit criteria

- [ ] All `font-size` values resolve to the scale tokens.
- [ ] Money / timer / counts use tabular-nums everywhere.
- [ ] Hero stat values render at weight 800.
- [ ] H1 line-height ≤ 1.15.
- [ ] Static check fails on off-scale font sizes.

---

## 3.2 — Motion system

### What to do

Define three motion tiers in `css/core/tokens.css` and apply across components:

```
--motion-fast:       200ms cubic-bezier(0.2, 0.8, 0.2, 1);
--motion-normal:     320ms cubic-bezier(0.2, 0.8, 0.2, 1);
--motion-deliberate: 480ms cubic-bezier(0.2, 0.8, 0.2, 1);
```

Apply to: card hover, tab switch, modal/sheet open + close, ring fill, banner enter/exit, toast slide-in, FAB press, segmented-control switch.

Respect `prefers-reduced-motion: reduce` everywhere — set `transition-duration` to `0.01ms` and disable looping animations.

### Exit criteria

- [ ] No new `transition-duration` values appear outside the three tier tokens.
- [ ] Every interactive element animates with the right tier.
- [ ] Reduced-motion users see effectively-static UI.

---

## 3.3 — Mobile shell upgrade

### What to do

- **Bottom-tab nav** on mobile (`<= 768px`). Hide the sidebar; show a bottom bar with 5 tabs: `Overview / Habits / Plan / Focus / Profile`. Mood, Sleep, Budget remain reachable via cards from Overview and via cross-module insight links.
- **Swipe-back gesture** on iOS PWA (`history.back()` on right-edge swipe).
- **PWA install prompt.** Show a one-time "Add to home screen" sheet after the user has visited 3 sessions (use `window.matchMedia('(display-mode: standalone)')` to suppress when already installed).
- **Safe-area insets** everywhere (`env(safe-area-inset-bottom)` in particular for the new bottom-tab bar).

### Exit criteria

- [ ] On a 390 × 844 viewport, the sidebar is gone; a bottom-tab bar is visible.
- [ ] iOS PWA users can swipe right from the left edge to go back.
- [ ] Install prompt appears once per device after 3 sessions and is dismissable.
- [ ] No content is occluded by the tab bar (FABs, last list items, modal close buttons).

---

## 3.4 — Weekly Insights Engine (the wedge)

This is the single most investor-credible feature you can ship. Hbit's pitch is "*track everything that matters, in one app*". Today the modules don't talk to each other. Investors will ask "*so what?*". This is the answer.

### What to build

- **`js/core/insights.js`** — pure-function library:
  - `correlate(seriesA, seriesB)` → Pearson r over a date-aligned window.
  - `streakAnalysis(events, predicate)` → longest streak + current streak.
  - `cohort({ slice: 'high-spend' | 'low-mood' | 'low-sleep' | 'high-habit' })` → segments user's last 8 weeks by predicate.
- **`js/core/insightsScheduler.js`** — Firebase Cloud Function (`/functions/insights/`) runs every Monday 03:00 user-local. For each user it:
  1. Pulls last 8 weeks of cross-module data.
  2. Runs ~15 candidate insight rules.
  3. Picks the top 3 by `|effect size| × confidence`.
  4. Writes them to `users/{uid}/insights/{weekKey}` with shape `{ id, title, body, math, sourceModules: [...], generatedAt }`.
- **Home `<InsightCard>`** — shows the latest 3 insights at the top of Overview. Each card has:
  - A short headline ("*Days you exceeded your budget, you slept 38 minutes less.*")
  - A "Why?" expander that reveals the math.
  - A "Take me there" link that opens the relevant module with the relevant filter applied.

### Candidate insight rules (start set)

- "Days you exceeded your budget, you slept *N* minutes less on average."
- "Your best mood weeks correlate with *N+* habit completions on Mon-Wed."
- "You complete *N%* more focus sessions when you log a habit before noon."
- "Your spending peaks on the second day of low-mood streaks."
- "Sleep < 6 h is followed by a *N%* drop in habit completion the next day."
- "You hit your daily focus goal on *N* of *M* days when you logged sleep ≥ 7 h."
- "Your highest-mood days had *N* habit completions on average."

Each rule needs a minimum-sample-size guard (≥ 4 weeks of data) — below that, fall back to encouraging "check back next Monday" cards.

### Exit criteria

- [ ] Cron runs once a week per user, idempotent.
- [ ] Three Insight cards appear at the top of Overview every Monday.
- [ ] Each card's "Why?" expander shows the math.
- [ ] "Take me there" deep-links into the right module with the relevant filter.

---

## 3.5 — Onboarding (60 seconds, not skippable)

### What to build

A 6-step wizard at first login. Each step is a single screen. Total ≤ 60 seconds.

1. **Pick goals** — chips: better sleep / save money / build habits / quit something / focus / clarity.
2. **Pick 3 starter habits** — preset list filtered by goals chosen in step 1.
3. **Sleep target** — hours stepper.
4. **Monthly budget** — currency picker + amount.
5. **First focus block today?** — Y / N. If Y, schedule it on Plan.
6. **Mood baseline** — one tap on the 5-point scale.

After completion: home dashboard pre-populated, first weekly insight scheduled for next Monday, a celebratory but calm welcome toast.

### Exit criteria

- [ ] Wizard runs once per user; persisted in `users/{uid}/onboarding/{completedAt}`.
- [ ] Wizard data seeds Habits, Sleep, Budget, Plan, Mood.
- [ ] User can re-run the wizard from Profile → Settings.

---

## 3.6 — Streaks across all modules

### What to do

Today only Habits has a streak. Add to:

- **Mood** — consecutive days with at least one entry.
- **Sleep** — consecutive nights logged.
- **Focus** — consecutive days hitting the daily session goal.
- **Budget** — consecutive days under the daily budget allowance.
- **Plan** — consecutive days completing all scheduled tasks.

Surface each streak on the module's main view as a small chip. Add a global `<StreakBadge>` primitive (extends Phase 2.3 design system).

### Exit criteria

- [ ] Each module shows its current streak.
- [ ] Streak resets cleanly across local-time day boundaries.

---

## 3.7 — Weekly Digest email

### What to build

A scheduled email (Friday 17:00 user-local) sent through Firebase Extensions or a Cloud Function. Body:

- Hero: "*Your week, in one line.*" — generated from the top insight.
- Streak status across all modules.
- Three insights from the Insights Engine.
- A single CTA back to the dashboard.

### Exit criteria

- [ ] Email renders on Gmail, Outlook web, iOS Mail.
- [ ] Email links land logged-in (use sign-in link tokens).
- [ ] User can opt out from Profile → Notifications.

---

## 3.8 — Demo data mode

### What to build

A toggle in Profile → Settings: `Load demo data`. When ON, the app loads 6 weeks of seeded realistic data across all modules so a recruiter / investor sees a populated dashboard. When OFF, real user data.

The seeded data lives in `seeds/demo.json` and is loaded into Firestore under a special `users/demo-{uid}/...` path; the UI swaps `state.uid` to the demo uid while the toggle is on.

### Exit criteria

- [ ] One-click toggle works.
- [ ] Toggling back restores the user's real data identically.
- [ ] Demo data tells a coherent story (realistic mood / sleep / spending arcs, not noise).

---

## 3.9 — Landing rework

### What to do

- Real product screenshots — not the abstract ring mockups currently in `index.html`.
- A clear differentiator headline tied to the Insights Engine: "*The personal OS that actually connects the dots.*"
- Pricing or waitlist CTA below the hero.
- Social proof slot: signups count, beta-user testimonials, founder quote.
- One-line privacy statement with link.

### Exit criteria

- [ ] First viewport tells the wedge.
- [ ] At least three real product screenshots embedded.
- [ ] Landing Lighthouse mobile score ≥ 95.

---

## 3.10 — Reliability and credibility

### What to do

- **Sentry / Logflare** wired to capture client errors. Today silent failures are common (`.catch(()=>{})` patterns).
- **Playwright smoke tests** — one per module: login → land on module → assert primary action visible. Run in CI.
- **Data export** in Profile (JSON download) — already partially in place in `js/pages/profile.js:271` from Phase 1; finish the per-module export coverage.
- **Account-deletion flow** — already wired in Phase 1; extend with a confirmation that lists subcollections to be deleted.
- **Lighthouse mobile pass** — targets: LCP < 2.5 s, TBT < 300 ms, CLS < 0.1.

### Exit criteria

- [ ] Sentry receives at least one captured error from a deliberate test.
- [ ] CI gate runs Playwright smoke tests; failing test = failing PR.
- [ ] Data export covers Habits, Sleep, Mood, Budget, Plan, Focus, Profile.
- [ ] Lighthouse mobile ≥ 90.

---

## Phase 3 master exit checklist

- [ ] 3.1 Type scale + tabular-nums + weight contrast all green.
- [ ] 3.2 Motion tiers + reduced-motion respected everywhere.
- [ ] 3.3 Bottom-tab nav on mobile, swipe-back, install prompt.
- [ ] 3.4 Weekly Insights Engine ships 3 insights every Monday.
- [ ] 3.5 Onboarding wizard runs at first login.
- [ ] 3.6 Streak badges on every module.
- [ ] 3.7 Weekly Digest email sends.
- [ ] 3.8 Demo data mode toggles cleanly.
- [ ] 3.9 Landing has real product screenshots above the fold.
- [ ] 3.10 Sentry + Playwright + data export + Lighthouse ≥ 90.

When this checklist is ticked: **9.5 / 10. Investor-ready.**

---

## Suggested commit cadence

Eight commits, one per major area, all reviewable in isolation:

1. `phase 3.1 — Typography scale + tabular-nums + weight contrast`
2. `phase 3.2 — Motion tier tokens + reduced-motion sweep`
3. `phase 3.3 — Mobile bottom-tab nav + swipe-back + install prompt`
4. `phase 3.4 — Weekly Insights Engine: cron, library, InsightCard component`
5. `phase 3.5 — 60-second onboarding wizard`
6. `phase 3.6 — Streak system across all modules`
7. `phase 3.7 — Weekly Digest email + opt-out`
8. `phase 3.8 — Demo data mode + 3.9 landing rework + 3.10 reliability gates`

Each commit must leave the static checks green and Lighthouse no worse than the prior baseline.

---

*Hand this file to the implementing agent **only after Phase 2 is signed off.** This is investor finish — the polish gets noticed only when the substance underneath is solid.*
