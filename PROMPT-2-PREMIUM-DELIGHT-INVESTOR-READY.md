# PROMPT 2 — Make Hbit Premium, Delightful, and Investor-Ready

> **Prerequisite:** Prompt 1 must be complete. The app should have zero bugs, complete i18n, working light theme, and proper responsiveness before starting this prompt.
>
> **Goal:** After this prompt runs, Hbit looks and feels like a polished product built by a team of engineers — not a solo vibe-coded project. Every page feels premium, consistent, and delightful. An investor can open it on their phone and be impressed.

---

## MANDATORY: Load Context + Research

1. Run `/frontend-design` — reload `.impeccable.md`
2. Run `/ckm:design-system` — verify the token architecture is clean (from Prompt 1 fixes)
3. Run `design:design-system` — audit the current component library for consistency gaps
4. Run `design:design-critique` — get a fresh heuristic score on the Dashboard, Focus, Plan, and Budget pages before making changes

Keep these baselines. We'll compare after.

---

## PHASE 1: FOCUS PAGE UPGRADE — Zen Timer + Session Analytics

**Run `/arrange`** then **`/bolder`** then **`/animate`** then **`/delight`**

The Focus page is minimal and clean — that's good. But competitors (Reclaim, Flocus, Be Focused) offer session analytics, ambient customization, and completion sounds. Hbit's Focus page needs to feel premium while keeping its zen identity.

### 1.1 — Add Session History Tab
Add a two-tab layout: **"Timer"** (current view) and **"Sessions"** (new).

**Timer tab:** Stays exactly as-is (zen aesthetic, ring, breathing circle, controls).

**Sessions tab** (new):
- **Today's sessions** — list of completed sessions with start time, duration, and phase (work/break)
- **Weekly focus chart** — horizontal bar chart showing focus hours per day (Mon-Sun). Use the orange accent color (`--focus: #F97316`). Style like the mood weekly insight chart for consistency
- **Stats row** — 3 stat cards in a row:
  - Total sessions today: `{n}` with i18n
  - Total focus time today: `{hours}h {mins}m` formatted with locale
  - Current streak: `{n} days` (consecutive days with at least 1 session)
- **Empty state:** If no sessions yet, show an inspiring empty state: focus icon + "Start your first session to see your stats" (i18n'd)

Store session history in Firestore under the user's document: `focus_sessions` collection with `{ date, startTime, duration, type: 'work'|'break' }`.

**Tab implementation:**
- Use `role="tablist"` + `role="tab"` + `role="tabpanel"` (same accessible pattern as Sleep page)
- Smooth transition between tabs (slide or fade, 200ms)
- Remember which tab was last active in `localStorage`

### 1.2 — Timer Completion Sound
Use Web Audio API (no external files):
- **Work session end:** 3-note ascending chime (440Hz → 550Hz → 660Hz), each 150ms, sine wave, gentle envelope, 20% volume
- **Break end:** 2-note descending tone (550Hz → 440Hz)
- Add a sound toggle button (🔔/🔕) in the Focus header
- Store mute preference in `localStorage: hbit_focus_sound`
- `aria-label` on toggle button uses `data-i18n-aria-label`
- Respect browser autoplay policy: only play after first user interaction with the timer

### 1.3 — Focus Timer Ring Enhancement
The ring is good but can feel more premium:
- Add a subtle pulse animation on the ring trail (the completed portion) — a gentle opacity oscillation (0.8 → 1 → 0.8) at 2s period
- The ambient glow transition between work (orange) and break (blue) should use a smooth 800ms crossfade, not an instant switch
- On session complete: brief ring fill animation (the trail fills to 100% rapidly over 400ms) before resetting

### 1.4 — Focus Light Theme Polish
Verify the light theme feels calming, not clinical:
- Work mode: warm light background with subtle orange tint
- Break mode: cool light background with subtle blue tint
- The glow should be barely visible in light mode (5-8% opacity)
- Timer text should be deep charcoal, not pure black

---

## PHASE 2: PLAN PAGE UPGRADE — Premium Planner

**Run `/arrange`** then **`/bolder`** then **`/delight`** then **`/ux-copy`** (from design plugin)

Competitors like Structured and Sunsama make planning feel intentional and calm. Hbit's Plan page feels functional but basic.

### 2.1 — Better Empty State + Onboarding
The current empty state is a dashed box. Replace with:
- A beautiful illustration or large icon (📋 or a custom SVG timeline illustration)
- Headline: "Plan your perfect day" (i18n'd)
- Subtext: "Add your first task and build your ideal schedule" (i18n'd)
- A prominent "Add your first task" CTA button (uses `--schedule` cyan accent color)
- Below the CTA: 3 small tips in muted text:
  1. "Set priorities to focus on what matters most"
  2. "Unfinished tasks carry over to the next day"
  3. "Tap the calendar to plan ahead"
- All text i18n'd with FR translations

### 2.2 — Calendar Date Picker Enhancement
The calendar strip currently shows 7 days. Enhance:
- Add month/year label above the strip (e.g. "April 2026") using `Intl.DateTimeFormat` for locale
- Add left/right arrows to navigate weeks (not just the 7 visible days)
- Today's date should have a dot indicator below the number AND a subtle accent ring
- Days with tasks should show a small colored dot (using `--schedule` cyan)
- Selected day should have a filled background (not just a ring/border)
- The strip should auto-scroll to center today's date on page load
- ALL dates formatted with locale (FR: "lun", "mar", "mer" etc.)

### 2.3 — Time Conflict Detection
When adding or editing a task:
- Check if the new task's time range overlaps with any existing task
- If overlap detected: show an inline warning below the time field (orange text, not blocking)
- "This overlaps with '[task name]' at [time]" (i18n'd with interpolation)
- The user can still save (warning only, not prevention)

### 2.4 — Timeline Visual Upgrade
The current timeline with vertical line and dots is clean. Polish it:
- The vertical timeline line should be a gradient from `--schedule` cyan at top to `var(--border)` at bottom
- Completed tasks: line segment should be solid cyan, dot should be filled
- Upcoming tasks: line segment should be dashed/muted, dot should be hollow
- Current/next task should have a subtle pulse animation on its dot
- Time labels on the left side should use locale-aware formatting (`Intl.DateTimeFormat`)
- Priority indicator: high priority tasks get a small colored bar on the left edge of the card (red for high, default for normal)

### 2.5 — Plan Help Modal
Add a "?" help button in the header (same pattern as Sleep page):
- Explain how the timeline works
- Explain carry-over for unfinished tasks
- Explain priority levels
- All content i18n'd

---

## PHASE 3: BUDGET PAGE CARD REDESIGN

**Run `/colorize`** then **`/arrange`** then **`/bolder`**

The budget account cards need a full redesign. Inspired by Revolut and Monarch Money: clean, professional, readable.

### 3.1 — New Account Card Design
Replace the current gradient-heavy cards with a cleaner design:

**Dark mode:**
- Background: `var(--panel)` with a subtle left border in the account's accent color (4px solid)
- Top: Account name (bold) + account type badge (muted pill)
- Center: Balance amount (large, white, `--font-size-xl`)
- Bottom: Last transaction or change indicator (+/-% this month) in muted text
- Hover: subtle lift shadow + accent glow at 10% opacity

**Light mode:**
- Background: white with the same colored left border
- Balance: dark text
- Subtle shadow instead of glow on hover

The accent colors per account type:
- Salary: green (`--habit`)
- Cash: amber (`--budget`)
- Credit: blue (`--sleep`)
- Debt: red (`--brand`)

### 3.2 — Account Cards Layout
- On desktop: horizontal scroll row (4 cards visible)
- On tablet: 2×2 grid
- On mobile: horizontal snap-scroll (swipe between cards)
- Each card: `min-width: 220px; max-width: 280px`

### 3.3 — Budget KPI Stats
Above the account cards, show 3 KPI stats in a row:
- Monthly income, Monthly spending, Net balance
- Each stat: large number + label below + trend arrow (up/down + percentage)
- Green for positive, red for negative
- Style like Dashboard cards (consistent with home page)

---

## PHASE 4: PROFILE PAGE FULL REDESIGN

**Run `/arrange`** then **`/typeset`** then **`/bolder`** then **`/animate`** then **`/harden`**

The Profile page scored 23/40 — lowest in the app. Transform it from a boring settings form into a personal achievement dashboard.

### 4.1 — New Layout Structure (top to bottom)

**Hero section:**
- Large avatar (72px, rounded-rect, gradient using `var(--brand)`)
- User name as `--font-size-xl` bold heading
- Username + "Member since [date]" as muted subtext below
- "Edit Profile" secondary button (small, muted border)
- On mobile: center-aligned. On desktop: left-aligned with avatar inline

**Achievement stats grid — 6 cards, 2×3 on desktop, 2×3 on tablet, 1 column on mobile:**

| Card | Emoji | Stat | Label | Accent Color |
|------|-------|------|-------|-------------|
| Habits tracked | ✅ | total count | "habits.statsLabel" | `--habit` green |
| Longest streak | 🔥 | N days | "profile.longestStreak" | `--brand` red |
| Sleep logs | 🌙 | total count | "profile.sleepLogs" | `--sleep` indigo |
| Mood check-ins | 💜 | total count | "profile.moodLogs" | `--mind` violet |
| Transactions | 💰 | total count | "profile.transactions" | `--budget` amber |
| Focus sessions | ⏱️ | total count | "profile.focusSessions" | `--focus` orange |

Each card:
- Module accent color as left border or top accent bar
- Number animates on load: count-up from 0 using `requestAnimationFrame`
- `data-module` attribute for the accent system
- All labels use `data-i18n`
- Emoji has `aria-hidden="true"`

**Personal info — collapsible section:**
- Default: COLLAPSED with "Edit personal info ▾" toggle
- Expanded: Full Name, Username, Age, Gender (select), Bio (with character counter)
- "Save Changes" button with loading spinner
- All labels `data-i18n`

**Account section:**
- Email (read-only, with icon)
- Account type (Google / Email, with icon)
- "Change password" (only for email accounts, hidden otherwise)
- "Delete account" button — danger styled, requires confirmation modal
- "Log out" button — secondary, bottom

### 4.2 — Remove Topbar Dependency
Profile MUST use the same header pattern as all other pages. No `topbar` component:
- Use the `.hm-header` style header (date, "Profile" title, lang/theme/avatar)
- Ensure sidebar nav works correctly and highlights "Profile"

### 4.3 — Profile Animations
- Stat cards: stagger entrance with `hbitFadeUp` (50ms between each, same as dashboard)
- Numbers: count-up animation on first load (600ms, ease-out)
- Collapsible section: smooth height transition (300ms, `var(--ease-spring)`)

---

## PHASE 5: DELIGHT FEATURES

### 5.1 — Skeleton Loading States
**Run `/animate`**

Verify Prompt 1 added skeletons. If not, add them now. ALSO enhance:
- Skeleton-to-content transition: fade-in (opacity 0→1 over 200ms)
- Dashboard weekly summary rings: show gray placeholder rings at 0% with pulsing opacity while loading
- Plan timeline: 2-3 skeleton event cards while loading

### 5.2 — Habit Completion Confetti
**File:** Create `js/core/confetti.js` + integrate in `habits.js`

When ALL habits for today are marked complete:
1. Canvas overlay: 60 particles using brand colors (`#E63946`, `#34D399`, `#F59E0B`, `#818CF8`, `#F97316`, `#22D3EE`)
2. Duration: 1.5 seconds, auto-removes canvas
3. Fire once per day: store `localStorage: hbit_confetti_YYYY-MM-DD`
4. Pair with toast: `HBIT.i18n.t('habits.allComplete')` — "All habits complete! 🎉"
5. `prefers-reduced-motion`: skip canvas, show toast only

### 5.3 — Streak Milestone Celebrations
**Files:** `habits.js`, `home.js`

When a habit's streak reaches 7, 30, or 100 days:
1. Full-screen modal overlay:
   - 7 days: 🔥 icon, "7-day streak!" headline
   - 30 days: ⚡ icon, "30-day streak!" headline
   - 100 days: 👑 icon, "100-day streak!" headline
   - Subtext: motivational copy (different for each, i18n'd)
   - "Keep going!" dismiss button
2. `hbitFadeUp` entrance + confetti (reuse confetti.js)
3. Store seen milestones in Firestore: `habit.milestonesShown: [7, 30]`
4. Respects `prefers-reduced-motion`

### 5.4 — Micro-interactions
**Run `/animate`**

**Habit checkbox:** When a habit is checked:
- Checkmark scales: 0 → 1.2 → 1 over 300ms (`var(--ease-snappy)`)
- Card flashes module green at 15% opacity (400ms fade-out)
- "Today" progress counter does a brief scale pulse

**Dashboard metrics:** On first load after skeletons:
- Number values count up from 0 to real value over 600ms using `requestAnimationFrame`
- Only on first session load (not every re-render)

**Scroll-to-top:** On Mood and Sleep pages (long on mobile):
- Floating circle button appears after 400px scroll
- Smooth scrolls to top on click
- Bottom-right, above nav, `var(--panel)` background
- Fades in/out with 200ms transition

### 5.5 — Help Modals on All Remaining Pages
**Run `/delight`** then **`/ux-copy`** (from design plugin)

Copy the Sleep page help modal pattern to:

**Habits:** "?" button in header
- Explains: What streaks are and how they work
- Explains: What the heatmap shows
- Explains: How habit scoring works
- Explains: Archive vs Delete

**Budget:** "?" button in header (may already exist — verify and complete)
- Explains: Account types (salary, cash, credit, debt)
- Explains: How transactions work
- Explains: What the spending breakdown shows
- Explains: What the trend chart shows

**Mood:** "?" button in header
- Explains: What the 5 mood bands mean
- Explains: What sub-dimensions (energy, stress, focus, social) measure
- Explains: How the weekly insight chart is calculated
- Explains: Why reflection questions matter

**Focus:** "?" button in header
- Explains: The Pomodoro technique briefly
- Explains: What each breathing pattern does
- Explains: What the session goal means

**Plan:** "?" button in header
- Explains: How the timeline works
- Explains: Carry-over for unfinished tasks
- Explains: Priority levels

ALL help modals must be:
- Fully i18n'd (EN + FR)
- Using the shared modal base classes from Prompt 1
- Triggered by a `?` icon button in the page header (consistent style across all pages)
- Dismissible with Escape + close button
- Focus-trapped when open

---

## PHASE 6: ACCESSIBILITY FINAL PASS

**Run `design:accessibility-review`** on the full app.

### 6.1 — Skip-to-Content Link
Add to ALL pages:
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```
Style: visually hidden, visible on `:focus`, appears at top of page. i18n'd.

### 6.2 — ARIA on Toggle Buttons
All language and theme toggle buttons need:
- `aria-label` with translated descriptions
- `data-i18n-aria-label` keys: `"a11y.switchLang"`, `"a11y.switchTheme"`
- Example: "Switch to French" / "Passer en anglais"

### 6.3 — Chart Accessibility
ALL SVG charts and data visualizations need:
- `role="img"`
- `aria-label` describing the data (e.g. "Weekly mood: mostly positive, improving trend")
- Dashboard sparklines, mood bar chart, sleep calendar, budget pie chart, focus weekly bars

### 6.4 — Focus Trap on ALL Modals
Verify every modal in the app traps focus:
- Habits wizard ✓ (likely already done)
- Habits detail modal
- Budget wizard, transaction modal
- Focus settings modal
- Plan event modal
- Sleep log modal, breathing overlay
- Mood depth section
- Profile delete confirmation
- ALL help modals (new)

Tab should cycle between focusable elements within the modal. Escape should close.

---

## PHASE 7: FINAL POLISH

### 7.1 — Landing Page Social Proof
Keep the social proof section as-is per your decision. BUT: ensure i18n covers it fully and the testimonial quotes are translated to French.

### 7.2 — Sleep "Connect Your Device" Section
Redesign (not remove):
- Clean card style with subtle dashed border
- Device icon placeholder (SVG or emoji)
- "Integrations coming soon" headline (i18n'd, styled as H4 muted)
- Planned device names as small muted tags (not "Coming soon" badges)
- Should look intentional and polished, not abandoned

### 7.3 — Copyright Year
Update all `"© 2025 Hbit"` instances to `"© 2026 Hbit"` or better: dynamically generate with JS.

### 7.4 — Meta Tags
Verify all pages have:
- Proper `<title>` with `data-i18n`
- `<meta name="description">` with `data-i18n` (or at least different per page)
- `<meta name="color-scheme" content="dark light">`
- `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Open Graph tags on at least the landing page

---

## PHASE 8: FINAL AUDIT

Run these skills as a comprehensive final check:

1. **`/critique`** on ALL 11 pages — get a fresh heuristic score. Target: 30+/40 on every page, 33+/40 on Mood and Habits.
2. **`/audit`** on ALL 11 pages — get fresh technical scores. Target: 16+/20 on every page.
3. **`design:accessibility-review`** — full WCAG 2.1 AA audit. Target: zero critical violations.
4. **`/overdrive`** on Dashboard and Profile — final premium push on the two most visible pages.
5. **`/polish`** on Focus and Plan — final refinement on the two upgraded pages.

### Score Targets (vs. original audit):

| Page | Original Heuristic | Target | Original Technical | Target |
|------|-------------------|--------|-------------------|--------|
| Landing | 24/36 | 30/36 | 12/20 | 16/20 |
| Login | 27/40 | 32/40 | 12/20 | 16/20 |
| Signup | 27/40 | 32/40 | 12/20 | 16/20 |
| Dashboard | 24/40 | 32/40 | 13/20 | 17/20 |
| Habits | 30/40 | 34/40 | 14/20 | 17/20 |
| Sleep | 29/40 | 33/40 | 9/20 | 16/20 |
| Mood | 33/40 | 36/40 | 13/20 | 17/20 |
| Budget | 24/40 | 30/40 | 9/20 | 16/20 |
| Focus | 28/40 | 34/40 | 12/20 | 17/20 |
| Plan | 24/40 | 32/40 | 13/20 | 17/20 |
| Profile | 23/40 | 32/40 | 12/20 | 16/20 |

### AI Slop Re-check
Run the AI slop detector on ALL pages. Targets:
- Landing: address the fake social proof concern (kept by user decision, but ensure it doesn't scream "AI")
- All other pages: PASS — no page should feel template-generated
- Key test: does each page feel like it was designed by the same team, or does each one feel like a separate session? After these fixes, they should feel unified.

---

## VERIFICATION CHECKLIST

Before declaring this prompt complete:

- [ ] **Investor test:** Open the app on a phone. Hand it to someone who's never seen it. Can they navigate all features in under 2 minutes?
- [ ] **Focus Timer tab:** Ring animation smooth, breathing circle works, phase transitions are fluid. Light theme looks calming, not clinical.
- [ ] **Focus Sessions tab:** Shows today's session list, weekly focus chart with orange bars, 3 stat cards (sessions/time/streak). Empty state works. Tab switch is smooth and accessible.
- [ ] **Focus sounds:** Work end = 3-note ascending chime. Break end = 2-note descending tone. Toggle 🔔/🔕 works. Sound respects `prefers-reduced-motion`. No autoplay errors.
- [ ] **Plan empty state:** Shows illustration + headline + CTA + 3 tips. All i18n'd. CTA creates first task.
- [ ] **Plan calendar:** Month/year label above strip. Week navigation arrows work. Today has dot + ring. Days with tasks show colored dots. Locale-aware dates (FR shows "lun", "mar").
- [ ] **Plan time conflicts:** Add two overlapping events → orange inline warning appears below time field → user can still save.
- [ ] **Plan timeline:** Gradient line, completed=solid/filled dot, upcoming=dashed/hollow dot, current task pulses. Priority bar on high items.
- [ ] **Budget cards redesign:** Clean left-border accent cards. Dark mode: panel bg + accent border. Light mode: white bg + accent border + shadow. No gradient artifacts. KPI stats row visible above cards.
- [ ] **Budget mobile:** Cards snap-scroll horizontally on mobile.
- [ ] **Profile redesign:** Hero with large avatar + name. 6 achievement stat cards in grid with count-up animation. Collapsible personal info form. No topbar component. All i18n'd.
- [ ] **Confetti:** Complete all daily habits → confetti fires (60 particles, brand colors, 1.5s). Toast appears. Doesn't repeat same day (check localStorage key). `prefers-reduced-motion` → toast only, no canvas.
- [ ] **Streak milestones:** 7-day streak → 🔥 modal + confetti. 30-day → ⚡ modal. 100-day → 👑 modal. Each fires once per habit per milestone (check Firestore `milestonesShown`). Dismiss with "Keep going!" button.
- [ ] **Habit checkbox animation:** Check a habit → checkmark scales 0→1.2→1 over 300ms. Card flashes green at 15% opacity. Today counter pulses.
- [ ] **Dashboard count-up:** On first load, number values animate from 0 to real value over 600ms. Only on initial load, not re-renders.
- [ ] **Scroll-to-top:** Appears on Mood and Sleep after 400px scroll. Smooth scrolls to top. Doesn't overlap Plan FAB. Correct z-index (below modals, above content).
- [ ] **Help modals:** All 6 pages (Habits, Budget, Mood, Focus, Plan + Sleep existing) have "?" button. Modals open, are fully translated in FR, close with Escape, focus-trap works.
- [ ] **Accessibility:** Skip-to-content link visible on Tab. All charts have `role="img"` + descriptive `aria-label`. All modals trap focus. `aria-label` on theme/lang toggles translated.
- [ ] **Consistency:** Navigate all 11 pages in sequence — same button sizes (40px min), same card shadows, same animation easing (`var(--ease-spring)`), same header layout pattern. Feels like one team built it.
- [ ] **AI slop check:** Read each page's copy aloud. Does it feel like one human's voice or a template? Landing page social proof aside, all other pages should feel distinctive and intentional.
- [ ] **Speed:** Page loads feel instant. Skeletons within 100ms, fade to content over 200ms. No jank on animation. Rapid page switching causes no errors.
- [ ] **No regressions:** Everything from Prompt 1 still works. i18n, light theme, sidebar, keyboard nav, screen reader — all intact.

---

*End of Prompt 2. After both prompts: Hbit is testable, polished, and investor-ready.*
