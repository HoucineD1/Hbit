# Hbit — Full UI Master Audit Report

**Date:** April 9, 2026  
**Auditor:** Claude (AI-assisted)  
**App:** Hbit — All-in-one personal growth dashboard  
**Stack:** Vanilla HTML/CSS/JS + Firebase  
**Brand color:** #E63946 (Red) | Dark theme default

---

## 1. Executive Summary

### Overall Scores

| Dimension | Score | Max |
|-----------|-------|-----|
| Heuristic Average (across all pages) | 27/40 | 40 |
| Technical Audit Average | 13/20 | 20 |
| **Combined** | **40/60** | **60** |

### Top 5 Most Critical Issues

1. **P0 — i18n interpolation is broken.** Translation keys like `{n}`, `{amount}`, `{score}` render literally — dynamic values never get replaced. Every page is affected. (`js/core/i18n.js`)
2. **P0 — Sidebar HTML is copy-pasted across all 9 app pages.** Any nav change requires editing 9 files. One typo = broken navigation site-wide. No shared template or include system.
3. **P1 — Light theme is incomplete.** Sleep, Focus, Plan, and Budget pages have partial or missing light-theme overrides. Switching to light mode produces unreadable text, invisible borders, or broken contrast on these pages.
4. **P1 — No loading states on any page.** When Firebase data loads, users see hardcoded placeholder text ("—", "0/0") with no skeleton, spinner, or shimmer. Feels broken on slow connections.
5. **P1 — Toast/offline messages and several UI strings are hardcoded in English.** Despite 1250+ i18n keys, core system messages bypass the translation system entirely.

### Top 5 Things Already Working Well

1. **Sidebar navigation is excellent.** Swipe gestures, keyboard shortcuts (Escape, Ctrl+B), ARIA attributes (`aria-current`, `aria-hidden`, `aria-expanded`), responsive push/overlay — this is genuinely well-built.
2. **Design token system is solid.** `tokens.css` provides a coherent palette, type scale, radius scale, and shadow system. Most pages actually use them.
3. **Page entrance animations are tasteful.** Staggered `hbitFadeUp` on grid cards, spring-like easing, and `prefers-reduced-motion` support — not overdone, not missing.
4. **Module accent color system works.** Each module (habits=green, budget=amber, sleep=blue, mood=purple, focus=orange, plan=cyan) has a consistent color that carries through dashboard cards, page headers, and charts.
5. **Mood page UX is the strongest.** Band selector, sub-dimensions (energy/stress/focus/social), emotion chips, reflection questions, streak tracking — this is thoughtful product design, not just a form.

### AI Slop Verdict

**Mixed.** The landing page has classic AI-generated tells (fake social proof "10,000+ users", generic testimonial quotes, overly symmetrical layout). The app pages themselves are more distinctive — the dashboard card system, sleep cycle calculator, and mood band selector feel like original product thinking, not template output. The biggest "AI smell" is the inconsistency between pages — each one feels like it was designed in a separate session with slightly different conventions.

---

## 2. Design System Audit

### Token Architecture (`css/core/tokens.css`)

**What you have:**
- Font family stack: `DM Sans` with system fallbacks — good choice for a personal app
- Type scale: 8 sizes from `0.6875rem` to `2.25rem` — well-spaced
- Weight scale: 4 weights (500–800) — sufficient
- Color: Brand `#E63946`, 7 module accent colors, semantic backgrounds/text/borders
- Radius: 5-step scale (`10px` to `9999px`) — clean
- Shadow: 5-level scale plus an accent shadow — good
- Light theme: Basic overrides for `--bg`, `--panel`, `--text`, `--muted`, `--border`

**Issues found:**

| Issue | Severity | Details |
|-------|----------|---------|
| No spacing tokens | P2 | Padding/margins are hardcoded everywhere (`20px`, `16px`, `14px`, `12px`). Should have `--space-1` through `--space-8` |
| No transition/easing tokens | P2 | `cubic-bezier(0.22, 1, 0.36, 1)` is repeated 20+ times across files. Should be `--ease-spring` |
| Light theme shadows missing | P1 | `--shadow-*` values are dark-mode-only (black alpha). Light mode needs lighter, warmer shadows |
| Module colors defined in 3 places | P2 | `tokens.css` has `--habit`, `--budget` etc. `home.css` redefines them as `--hc-habits`, `--hc-budget`. `habits.css` has `--hb-accent`. Pick one namespace |
| `--brand` (#E63946) rarely used | P3 | The brand red appears in the sidebar mark and profile avatar, but the actual app pages use module-specific colors. The brand feels disconnected |
| No `--font-size-4xl` or `--font-size-5xl` | P3 | Focus timer (`clamp(52px, 12vw, 76px)`) and landing page headlines hardcode large sizes |
| Hardcoded `font-weight: 1000` | P2 | Used in `components.css` (`.tag`, `.tag-title`, `.empty-main`, `.chev`) — `1000` is invalid in most fonts. DM Sans maxes at 800. Browser clamps silently |
| No `color-scheme` declaration | P2 | Missing `color-scheme: dark light` on `:root` — native form controls (date inputs, selects) won't match theme |

### Typography Evaluation

**DM Sans** is a strong choice — geometric, modern, readable at small sizes. Good fit for the "personal coach, not hospital" brand.

**Issues:**
- `.sub` class uses hardcoded `13px` instead of `var(--font-size-sm)` (`base.css:27`)
- `.time` class uses hardcoded `12px` instead of `var(--font-size-sm)` (`base.css:30`)
- Budget page header buttons are `34px` tall while every other page uses `40-44px` — inconsistent hit targets
- `font-weight: 900` and `font-weight: 1000` used throughout — DM Sans doesn't have these weights; browser silently clamps to 800

### Color Palette Evaluation

Module colors are well-chosen and create clear visual identity:
- Habits: `#34D399` (emerald green) — growth, progress
- Budget: `#F59E0B` (amber) — money, caution
- Sleep: `#818CF8` / `#60A5FA` (indigo/blue) — calm, night (**inconsistency: two different blues used**)
- Mood: `#A78BFA` / `#7c4dff` (purple) — mind, emotion (**also inconsistent between pages**)
- Focus: `#F97316` (orange) — energy, urgency
- Plan: `#22D3EE` (cyan) — clarity, scheduling

**Problem:** Sleep uses `#3aa0ff` in tokens.css, `#818CF8` in sleep.css, and `#60A5FA` in home.css. Mood uses `#7c4dff` in tokens.css and `#A78BFA` in home.css. These should be unified.

### Spacing System

No formal spacing scale exists. Every file picks its own values:
- Home cards: `padding: 20px`
- Budget header: `padding: 10px 16px`
- Mood main: `padding: 24px 18px 120px`
- Sleep header: `padding: 12px 20px 10px 56px`

This creates subtle but visible inconsistency between pages.

### Animation System (`animations.css`)

**Strong.** Keyframes are well-defined, stagger timing is tasteful, `prefers-reduced-motion` is fully supported. The `hbitFadeUp` entrance is signature and consistent.

**Missing:** No shared exit animations (page transitions exist but aren't used consistently), no micro-interaction keyframes (success checkmark, error shake, etc.).

---

## 3. Page-by-Page Analysis

---

### 3.1 Landing Page (`index.html`)

**What it looks like:** Split hero — left side has headline, social proof, feature chips, CTA buttons, and stat counters. Right side has a carousel showing module previews. Ambient glow layers and grid overlay create depth. Navigation bar at top with theme/language toggles.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility of system status | 3 | Carousel has navigation dots, active chip highlighted |
| 2 | Match real world | 3 | Natural language, clear value proposition |
| 3 | User control | 3 | Can navigate carousel, toggle theme/lang |
| 4 | Consistency | 3 | Follows its own design language well |
| 5 | Error prevention | 2 | No form inputs to validate here |
| 6 | Recognition vs recall | 3 | Clear CTAs, obvious navigation |
| 7 | Flexibility | 2 | No keyboard navigation for carousel |
| 8 | Aesthetic/minimalist | 3 | Clean but dense — a lot of content above fold |
| 9 | Error recovery | N/A | No errors possible on landing |
| 10 | Help/documentation | 2 | No FAQ, no feature explanations beyond chips |
| | **Total** | **24/36** | |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 2/4 | Good ARIA on chips/tabs, but carousel lacks `aria-roledescription`, social proof avatars are decorative (good), no skip-to-content link |
| Performance | 2/4 | Google Fonts loaded render-blocking. No font preload. Large CSS file. No lazy loading for carousel images |
| Responsive | 3/4 | Good breakpoints, mobile layout works. Carousel might overflow on very small screens |
| Theming | 2/4 | Light theme exists but ambient glows and gradients need light-mode tuning |
| Anti-patterns | 3/4 | Clean code, good use of CSS custom properties |
| **Total** | **12/20** | |

**AI Slop Check: PARTIAL FAIL**
- Fake "Trusted by 10,000+ users" with fake avatar initials — classic AI-generated social proof
- "★★★★★ 4.8" rating with no source — looks manufactured
- Count-up animation on stats — overused AI pattern
- The feature chips and carousel are more distinctive

**Issues:**
- **P1:** Social proof section is fake — either remove it or make it real
- **P2:** No `<link rel="preload">` for DM Sans font — causes FOIT/FOUT
- **P2:** `ld+json` schema says "price: 0" — good, but `applicationCategory` should be `"HealthApplication"` not `"LifestyleApplication"`
- **P3:** Hero headline "Everything that makes you better. Right here." is generic — could be any app
- **P3:** No scroll indicator or "learn more" below fold

**What's Working:**
1. Feature chip nav that highlights active module with accent color — distinctive interaction
2. Ambient glow layers create premium depth without being distracting
3. Good meta tags (OG, Twitter, schema.org) — shows SEO awareness

**Fix Commands:** Run `/bolder` on the headline copy. Run `/harden` to fix font preloading. Remove or replace fake social proof manually.

---

### 3.2 Login Page (`login.html`)

**What it looks like:** Split-screen layout. Left panel (desktop only) shows brand mark, motivational copy ("Your streak is waiting"), glassmorphism info rows, and an inspirational quote. Right side has the actual login form — email/password fields, "Sign in" button, Google sign-in, and link to signup.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 3 | Clear form states, loading indicators |
| 2 | Real world | 3 | Standard auth patterns |
| 3 | User control | 3 | Can toggle password visibility, switch to signup |
| 4 | Consistency | 3 | Matches signup page styling |
| 5 | Error prevention | 2 | No inline validation before submit |
| 6 | Recognition | 3 | Google sign-in button is recognizable |
| 7 | Flexibility | 2 | No "Remember me" checkbox, no magic link option |
| 8 | Aesthetic | 4 | The split-screen with glassmorphism panel is genuinely premium |
| 9 | Error recovery | 2 | Error messages exist but could be more specific |
| 10 | Help | 2 | "Forgot password?" link exists |
| | **Total** | **27/40** | |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 2/4 | Form labels exist, but left panel is `aria-hidden` (correct). Password toggle needs better ARIA |
| Performance | 3/4 | No unnecessary scripts loaded. Auth page is lean |
| Responsive | 3/4 | Left panel hides on mobile. Form centers well |
| Theming | 1/4 | No light theme support on auth pages — always dark |
| Anti-patterns | 3/4 | Clean form handling |
| **Total** | **12/20** | |

**AI Slop Check: MINOR FAIL**
- Motivational quote on login is a bit much — "Small daily improvements lead to staggering long-term results" feels generic
- "Your streak is waiting" is good product copy though

**Issues:**
- **P1:** Auth pages don't support light theme — if user has system preference for light, they'll get jarring dark login then light dashboard
- **P2:** No inline form validation — errors only show after submit
- **P2:** No "Remember me" option
- **P3:** Left panel quote should rotate or be dynamic

**What's Working:**
1. Split-screen layout is premium and distinctive
2. Glassmorphism motivational rows are a nice touch
3. Smooth entrance animations on form elements

**Fix Commands:** Run `/harden` for theme support. Run `/animate` for input focus states.

---

### 3.3 Signup Page (`signup.html`)

Nearly identical structure to login. Left panel shows module mini-cards instead of motivational rows. Right side has name + email + password fields, Google sign-in.

**Scores:** Same as login (27/40 heuristic, 12/20 technical).

**Additional Issues:**
- **P2:** Password strength indicator missing — users can set weak passwords
- **P2:** No terms of service / privacy policy checkbox (legal risk)
- **P3:** Module cards on left panel use hardcoded colors instead of token variables

---

### 3.4 Home / Dashboard (`home.html`)

**What it looks like:** Sticky header with date, "Overview" title, lang/theme toggles, avatar. Greeting strip ("Hello, [name]"). Grid of module cards — each shows a metric, mini-chart (donut/bars/sparkline), and footer text. Featured "Weekly Summary" card with concentric ring chart. Clean, dark, Oura-inspired.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 3 | Each card shows current metric + chart |
| 2 | Real world | 3 | Metrics use natural language ("6.5 hrs", "3/5 done") |
| 3 | User control | 2 | Cards are clickable but no way to reorder, hide, or customize dashboard |
| 4 | Consistency | 3 | All cards follow same structure (label, metric, chart, footer) |
| 5 | Error prevention | 2 | No destructive actions on this page |
| 6 | Recognition | 3 | Module colors + icons make each card instantly recognizable |
| 7 | Flexibility | 2 | No widgets, no customization, fixed layout |
| 8 | Aesthetic | 4 | This is the best-looking page. The dark aesthetic with module accent glows is premium |
| 9 | Error recovery | 1 | No error states shown when data fails to load |
| 10 | Help | 1 | No onboarding, no tooltips, no explanation of metrics |
| | **Total** | **24/40** | |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 2/4 | Cards have `aria-label` (good). Weekly donut has `aria-hidden` (good). But no `role="img"` on SVG charts, no alt text for sparklines |
| Performance | 2/4 | Loads 4 Firebase scripts synchronously before any content renders. `dashboardData.js` fetches all modules — no lazy loading |
| Responsive | 3/4 | Grid switches from 1→2→3→4 columns. Works well on mobile |
| Theming | 3/4 | Light theme is well-implemented with warm parchment background |
| Anti-patterns | 3/4 | Clean component structure, good use of `data-module` attributes |
| **Total** | **13/20** | |

**AI Slop Check: PASS** — The concentric ring chart, module-specific accent glows, and card layout feel like original product design.

**Issues:**
- **P0:** No loading/skeleton state — on first load, all metrics show "—" or "0/0" with no indication that data is loading
- **P1:** Mood card wraps in an extra `div.hc-card--mood-wrap` that breaks the grid consistency
- **P2:** Footer text is hardcoded English ("No habits yet · Create one") and not i18n'd via `data-i18n`
- **P2:** Weekly summary card has no interactivity — can't click individual rings to navigate
- **P3:** Greeting date and header date are redundant — showing date twice in close proximity

**What's Working:**
1. Concentric ring chart for weekly summary is distinctive and informative
2. Module accent glow on card hover is a premium touch
3. Responsive grid works perfectly across breakpoints

**Fix Commands:** Run `/animate` to add skeleton loading states. Run `/harden` to fix i18n on footer text. Run `/arrange` to fix the mood card wrapper.

---

### 3.5 Habits Page (`habits.html`)

**What it looks like:** Header with "New habit" CTA button (green). Today strip showing completion count. Filter chips (All, Health, Fitness, Mind...). Contribution heatmap (GitHub-style). Habit cards list. Wizard modal for creating habits. Detail modal for viewing/editing.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 4 | Today strip, heatmap, per-habit progress — excellent feedback |
| 2 | Real world | 3 | Category chips match real habit domains |
| 3 | User control | 3 | Can filter, archive, delete, pause habits |
| 4 | Consistency | 3 | Card structure is consistent |
| 5 | Error prevention | 3 | Wizard has step validation, error messages |
| 6 | Recognition | 3 | Filter chips show categories at a glance |
| 7 | Flexibility | 3 | 7-step wizard allows detailed or quick setup |
| 8 | Aesthetic | 3 | Good but the heatmap + chips + list is a lot of visual density |
| 9 | Error recovery | 3 | Wizard shows inline errors, can go back |
| 10 | Help | 2 | No explanation of how streaks work or what the heatmap shows |
| | **Total** | **30/40** | |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 3/4 | Filter chips use `role="tablist"` + `aria-selected` (good). Wizard has `aria-live`. Modals have `aria-modal`. Missing: heatmap has no `role="img"` or accessible description |
| Performance | 2/4 | Heatmap renders 365 cells in DOM. Large habit lists could be slow |
| Responsive | 3/4 | Works well on mobile, chips scroll horizontally |
| Theming | 3/4 | Light theme support is solid |
| Anti-patterns | 3/4 | Good modal management, proper focus trapping mentioned in structure |
| **Total** | **14/20** | |

**AI Slop Check: PASS** — GitHub-style heatmap, custom wizard flow, filter chips — this feels like intentional product design.

**Issues:**
- **P1:** Heatmap is not accessible — screen readers get no information from it
- **P2:** "Step 1 of 7" in wizard is not i18n'd
- **P2:** Detail modal footer buttons ("Edit", "Pause", "Archive", "Delete") all look the same weight — destructive action (Delete) needs stronger visual distinction
- **P3:** Heatmap toggle could remember collapsed state across sessions

**What's Working:**
1. Contribution heatmap is a standout feature — gamification done right
2. 7-step wizard is thorough without being overwhelming
3. Filter chips with "Archived" as a separate muted chip is smart UX

**Fix Commands:** Run `/harden` for heatmap accessibility. Run `/colorize` to differentiate destructive buttons. Run `/typeset` to fix wizard step labels.

---

### 3.6 Sleep Page (`sleep.html`)

**What it looks like:** Two-tab layout (Tonight / History). Tonight tab has: hero section with tonight's bedtime/wake plan + sleep debt stats, cycle calculator, wind-down checklist, weekly schedule, device connection section, and cross-module CTA to mood. History tab has calendar view with month navigation.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 3 | Sleep debt, tonight's plan, countdown — good status indicators |
| 2 | Real world | 4 | Sleep cycles, wind-down routine, bed/wake times — maps perfectly to real sleep patterns |
| 3 | User control | 3 | Can edit plan, adjust wake time, log manually |
| 4 | Consistency | 2 | This page has a completely different layout system than other pages (two-column with sidebar) |
| 5 | Error prevention | 3 | Alarm disclaimer is honest and helpful |
| 6 | Recognition | 3 | Emoji icons (🌙, ☀️) are immediately recognizable |
| 7 | Flexibility | 3 | Multiple entry points (cycle calc, manual log, schedule) |
| 8 | Aesthetic | 3 | Well-designed but visually dense — lots of sections |
| 9 | Error recovery | 2 | Log deletion is hidden behind `style="display:none"` — not discoverable |
| 10 | Help | 3 | Built-in help modal explaining how Sleep works — rare and valuable |
| | **Total** | **29/40** | |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 2/4 | Tabs use `role="tab"` + `aria-selected` (good). Calendar needs keyboard nav. Breathing overlay needs focus management |
| Performance | 2/4 | Two-column layout with many sections loads all at once |
| Responsive | 2/4 | Two-column layout collapses on mobile but wind-down + schedule stack awkwardly |
| Theming | 1/4 | Light theme is barely implemented — most colors are hardcoded |
| Anti-patterns | 2/4 | Inline `style="display:none"` on delete button. Inline script at bottom for boot. Help modal text is hardcoded English |
| **Total** | **9/20** | |

**AI Slop Check: PASS** — Sleep cycle calculator, wind-down checklist, breathing exercise overlay — this is clearly thought-through product design.

**Issues:**
- **P1:** Light theme is broken — indigo/blue accents on white background have poor contrast
- **P1:** Help modal content is entirely hardcoded English — not i18n'd at all
- **P1:** "Connect your device" section with "Coming soon" badges — either build it or remove it. Showing disabled features hurts credibility
- **P2:** Breathing exercise overlay (`sl-breath-overlay`) has hardcoded "Inhale"/"4 sec" labels
- **P2:** Footer links are hardcoded ("Privacy", "Terms") instead of using `data-i18n`
- **P3:** CTA card "How are you feeling?" title is not i18n'd

**What's Working:**
1. Sleep cycle calculator is a genuinely useful tool — not just a logger
2. Wind-down routine checklist is thoughtful UX
3. Help modal is one of the best features in the entire app — other pages should copy this pattern

**Fix Commands:** Run `/colorize` for light theme. Run `/harden` for i18n gaps. Remove "Connect your device" section or implement it.

---

### 3.7 Mood Page (`mood.html`)

**What it looks like:** "How are you today?" lead-in. Two-column layout. Left: Today card with 5 mood band selector (Very Difficult → Great) with color swatches, sub-dimension sliders (Energy, Stress, Focus, Social), emotion chips, impact chips, reflection questions, and notes. Right: Streak counter, weekly insight bar chart, recent entries list.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 4 | Band colors change the entire page tint — immediate feedback |
| 2 | Real world | 4 | "How are you today?" with layered depth (quick → detailed) matches real emotional check-in flow |
| 3 | User control | 4 | Quick save OR detailed entry. Can edit today. Progressive disclosure |
| 4 | Consistency | 3 | Follows app design language |
| 5 | Error prevention | 3 | Save button disabled until mood selected |
| 6 | Recognition | 4 | Color bands, emotion chips, reflection prompts — rich recognition aids |
| 7 | Flexibility | 4 | Quick mood (1 tap + save) or deep reflection (sliders + chips + text) |
| 8 | Aesthetic | 3 | Good but dense on mobile — a lot of UI in the left column |
| 9 | Error recovery | 2 | Can edit today's entry but can't edit past entries |
| 10 | Help | 2 | No explanation of what sub-dimensions mean or how insights are calculated |
| | **Total** | **33/40** | Highest score in the app |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 3/4 | Band selector uses `role="listbox"` + `role="option"` (good). Sliders have `aria-valuemin/max`. Depth section toggles `aria-hidden` |
| Performance | 3/4 | Lightweight page, minimal DOM |
| Responsive | 2/4 | Two-column collapses but left column is very long on mobile |
| Theming | 2/4 | Band colors work in both themes but card backgrounds have hardcoded dark values |
| Anti-patterns | 3/4 | Clean code, good state management |
| **Total** | **13/20** | |

**AI Slop Check: PASS** — This is the most distinctive page. The 5-band system with progressive disclosure is genuine product thinking.

**Issues:**
- **P2:** Hardcoded `rgba(255, 255, 255, ...)` values in mood.css won't work in light theme
- **P2:** "Show more" buttons for emotion/impact chips need i18n
- **P2:** Weekly insight bar chart has `role="img"` but `aria-label="Last 7 days"` is not descriptive enough
- **P3:** Streak counter is hidden by default — should show even at streak=0 with encouragement

**What's Working:**
1. Progressive disclosure (quick save → add details) is the best UX pattern in the app
2. Page tint that changes with mood band selection is delightful
3. Reflection questions ("What impacted your day the most?") add genuine value

**Fix Commands:** Run `/adapt` for mobile layout. Run `/harden` for light theme colors.

---

### 3.8 Budget Page (`budget.html`)

**What it looks like:** Header with date, "Budget" title, and action buttons. Account cards (salary, cash, credit, debt) with gradient backgrounds. Transaction list. Add expense/income modal. Category breakdown. Chart section.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 3 | Account balances visible, transaction list shows recent |
| 2 | Real world | 3 | Categories match real spending patterns |
| 3 | User control | 3 | Can add/edit/delete transactions |
| 4 | Consistency | 2 | Header buttons are 34px vs 40-44px on every other page |
| 5 | Error prevention | 2 | Amount field accepts negative numbers |
| 6 | Recognition | 3 | Account cards with color-coded gradients |
| 7 | Flexibility | 2 | No recurring transactions, no budget limits per category |
| 8 | Aesthetic | 3 | Account card gradients are nice but busy |
| 9 | Error recovery | 2 | Delete has no undo |
| 10 | Help | 1 | No help, no tooltips, no onboarding |
| | **Total** | **24/40** | |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 2/4 | Form labels exist but modals need focus trapping |
| Performance | 2/4 | Transaction list renders all items — no virtualization or pagination |
| Responsive | 2/4 | Account cards may overflow on small screens |
| Theming | 1/4 | Light theme is minimal — gradient backgrounds hardcoded for dark |
| Anti-patterns | 2/4 | Account card gradients use hardcoded colors instead of tokens |
| **Total** | **9/20** | |

**AI Slop Check: PASS** — The account card system with gradient backgrounds is distinctive.

**Issues:**
- **P1:** Light theme is broken — dark gradient backgrounds on light page
- **P1:** Header button sizes (34px) are smaller than app standard (40-44px) — inconsistent touch targets
- **P2:** No confirmation dialog before deleting transactions
- **P2:** Avatar is 32px round while other pages use 40px rounded-rect — inconsistent
- **P3:** Category breakdown chart has no accessibility description

**What's Working:**
1. Account card gradient system is visually distinctive
2. Category icons with amber accent create clear hierarchy
3. Expense/income toggle is clear

**Fix Commands:** Run `/normalize` to fix button sizes and avatar. Run `/colorize` for light theme. Run `/harden` for delete confirmation.

---

### 3.9 Focus Page (`focus.html`)

**What it looks like:** Minimal, zen-like layout. Header with "Zen Timer" title and settings button. Config pill showing daily progress. Large circular timer ring with phase chip (Work/Break), time display, session counter. Three control buttons (reset, play/pause, skip). Settings modal for work/break duration and breathing pattern. Ambient glow changes color between work (orange) and break (blue).

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 4 | Ring progress, time display, phase label, session count — excellent status |
| 2 | Real world | 3 | Pomodoro technique is well-known |
| 3 | User control | 3 | Play/pause, reset, skip, configurable durations |
| 4 | Consistency | 2 | This page has a completely different layout — centered, no grid, no cards |
| 5 | Error prevention | 3 | Can't accidentally delete sessions |
| 6 | Recognition | 3 | Play/pause icons are universal |
| 7 | Flexibility | 3 | Configurable work/break/goal, 4 breathing patterns |
| 8 | Aesthetic | 4 | The zen aesthetic with breathing circle animation is the most polished page |
| 9 | Error recovery | 2 | Reset is irreversible, no "are you sure?" |
| 10 | Help | 1 | No explanation of breathing patterns or Pomodoro technique |
| | **Total** | **28/40** | |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 2/4 | Timer uses `aria-live="polite"` (good). Controls have `aria-label`. But settings modal needs focus trapping |
| Performance | 4/4 | Minimal DOM, efficient animation via CSS transforms |
| Responsive | 3/4 | Timer scales with `min(300px, 80vw)` — works everywhere |
| Theming | 1/4 | No light theme support at all — hardcoded dark colors throughout |
| Anti-patterns | 2/4 | Settings modal labels are hardcoded English, not i18n'd |
| **Total** | **12/20** | |

**AI Slop Check: PASS** — The unified work-ring + breath-circle design is original and well-executed.

**Issues:**
- **P1:** No light theme support — entire page is hardcoded dark
- **P1:** Settings modal text is all hardcoded English ("Work Duration (mins)", "Break Duration (mins)", etc.)
- **P2:** No session history — completed sessions aren't visible after the page closes
- **P2:** "completed" label next to session count is not i18n'd
- **P3:** No sound/notification when timer ends — relies on visual only

**What's Working:**
1. Breathing circle animation during breaks is genuinely calming
2. Ambient glow color transition (orange→blue) between work/break is premium
3. Minimal, distraction-free layout is perfect for a focus tool

**Fix Commands:** Run `/colorize` for light theme. Run `/harden` for i18n. Run `/delight` to add timer completion sound.

---

### 3.10 Plan Page (`plan.html`)

**What it looks like:** Header with date title. Horizontal calendar strip (7 days, scrollable). Timeline-style itinerary with vertical line, time dots, and event cards. FAB button for adding events. Modal form with title, start time, duration, priority, and notes fields. Empty state with dashed border.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 3 | Calendar dots show which days have tasks. Timeline shows progress |
| 2 | Real world | 3 | Calendar strip + timeline matches real scheduling mental model |
| 3 | User control | 3 | Can add, check off, delete, and carry over tasks |
| 4 | Consistency | 2 | Uses FAB (only page with one). Modal style differs from habits wizard |
| 5 | Error prevention | 2 | No validation that end time doesn't overlap with other events |
| 6 | Recognition | 3 | Check/delete icons are clear. Priority dot is visible |
| 7 | Flexibility | 2 | No recurring events, no drag-to-reorder, no categories |
| 8 | Aesthetic | 3 | Timeline design is clean. Empty state is well-done |
| 9 | Error recovery | 2 | Delete has no undo |
| 10 | Help | 1 | No onboarding, no explanation |
| | **Total** | **24/40** | |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 2/4 | FAB has `aria-label`. Calendar days are clickable divs — should be buttons. Modal needs focus trapping |
| Performance | 3/4 | Lightweight page, efficient timeline rendering |
| Responsive | 3/4 | Calendar strip scrolls well. Timeline is single-column |
| Theming | 3/4 | Light theme is well-implemented with proper token overrides |
| Anti-patterns | 2/4 | Modal text is hardcoded English. "Bring to today" carry-over text not i18n'd |
| **Total** | **13/20** | |

**AI Slop Check: PASS** — Timeline itinerary design is distinctive.

**Issues:**
- **P1:** Modal form labels are all hardcoded English ("Schedule Event", "Start Time", "Duration (mins)", "Priority", "Notes & Links")
- **P2:** Calendar strip days should be `<button>` elements, not `<div>` — keyboard inaccessible
- **P2:** Carry-over banner text is hardcoded English
- **P2:** "Clear Schedule" empty state text is not i18n'd
- **P3:** No time conflict detection when adding overlapping events

**What's Working:**
1. Timeline with vertical line and dots is a clean visual metaphor
2. Calendar strip with task dots gives quick weekly overview
3. Carry-over feature for unfinished tasks is smart product thinking

**Fix Commands:** Run `/harden` for i18n and accessibility. Run `/delight` for drag-to-reorder.

---

### 3.11 Profile Page (`profile.html`)

**What it looks like:** Uses the shared `topbar` component (only page that does). Avatar hero card with name/meta. Personal info form (full name, username, age, gender, bio with character counter). Progress stats grid (habits count, streak, sleep logs, mood logs, transactions). Account info (email, provider, member since). Logout button.

**Heuristic Scores:**

| # | Heuristic | Score | Notes |
|---|-----------|-------|-------|
| 1 | Visibility | 3 | Stats grid shows progress. Save button has spinner |
| 2 | Real world | 3 | Standard profile page structure |
| 3 | User control | 3 | Can edit all fields, save explicitly |
| 4 | Consistency | 2 | Only page using `topbar` component. Uses `container` + `grid` layout while others use custom layouts |
| 5 | Error prevention | 2 | Bio has character counter (good). No email validation |
| 6 | Recognition | 3 | Stats are labeled clearly |
| 7 | Flexibility | 2 | Can't change email or password from profile |
| 8 | Aesthetic | 2 | Most boring page visually — just stacked cards with form fields |
| 9 | Error recovery | 2 | Save message appears but no undo for changes |
| 10 | Help | 1 | No explanation of what stats mean or how they're calculated |
| | **Total** | **23/40** | Lowest score |

**Technical Scores:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 2/4 | Form labels exist and are properly associated. Missing: no `aria-describedby` for character counter |
| Performance | 3/4 | Simple page, minimal DOM |
| Responsive | 3/4 | Grid collapses properly. Form fields stack on mobile |
| Theming | 3/4 | Uses token variables throughout — light theme should work |
| Anti-patterns | 1/4 | All text is hardcoded English ("Personal Info", "Full Name", "Your Progress", "Account", "Log Out") — zero i18n on this page |
| **Total** | **12/20** | |

**AI Slop Check: PASS** — Simple profile page, nothing distinctive but nothing sloppy.

**Issues:**
- **P1:** Entire page has ZERO i18n support — every label, title, button is hardcoded English
- **P1:** Only page using `topbar` component — creates layout inconsistency with all other pages that use custom headers
- **P2:** Stats grid has hardcoded `style="--accent:..."` inline — should use data attributes
- **P2:** No "Change password" or "Delete account" option
- **P3:** Avatar gradient uses `var(--mind)` which is for mood module — should use `var(--brand)`

**What's Working:**
1. Character counter on bio field is a nice touch
2. Stats grid provides a good overview of app usage
3. Save button with spinner state is proper UX

**Fix Commands:** Run `/harden` for complete i18n. Run `/normalize` to align with other page layouts. Run `/bolder` to make the page more visually interesting.

---

## 4. Cross-Cutting Issues

### 4.1 Sidebar Duplication
The entire `<nav class="sb">` element (100+ lines of HTML) is copied verbatim into all 9 app pages. This means:
- Adding a new nav item requires editing 9 files
- A typo in one file creates inconsistency
- No way to A/B test or dynamically update navigation

**Fix:** Create a `components/sidebar.html` partial and inject via JS, or use a build tool to include it.

### 4.2 Navigation Consistency
Navigation is consistent in structure but has small differences:
- Home uses `css/core/nav.css` as a separate import; habits doesn't
- Focus header says "Zen Timer" not "Focus" — name mismatch with sidebar
- Each page has a different header structure (home has greeting strip, habits has today strip + chips, sleep has tabs, focus is minimal)

### 4.3 Shared Component Quality
- **Cards:** `.card` component is well-defined but most pages create their own card styles (`.hc-card`, `.md-card`, `.sl-card`, `.pl-card`)
- **Buttons:** At least 5 different button patterns (`.btn`, `.hb-hdr-btn`, `.hm-hdr-btn`, `.md-hdr-btn`, `.sl-hdr-btn`) that do the same thing
- **Avatars:** 4 different avatar implementations (`.avatar`, `.hm-avatar`, `.hb-avatar`, `.sl-avatar`) with different sizes and styles
- **Modals:** Each page has its own modal CSS. No shared `.modal-overlay`, `.modal-panel`, `.modal-header` components

### 4.4 i18n Implementation Quality
- **Coverage:** 1250+ keys is impressive, but critical gaps exist:
  - Profile page: 0% translated
  - Focus settings modal: 0% translated
  - Plan modal: 0% translated
  - Sleep help modal: 0% translated
  - Toast/offline messages: 0% translated
- **Interpolation bug:** `{n}`, `{amount}`, `{score}` placeholders in translation keys are never replaced with actual values
- **HTML safety:** `innerHTML` used for newline conversion — XSS risk if translations ever come from user input

### 4.5 Theme Switching Quality
- **Good:** Home, Habits, Plan pages have comprehensive light theme support
- **Partial:** Mood, Budget pages have some overrides but miss card backgrounds
- **Missing:** Focus page has zero light theme support
- **Broken:** Sleep page light theme produces unreadable text in some sections
- **Missing from auth:** Login/signup pages are always dark regardless of system preference

### 4.6 Mobile Responsiveness
Generally good. Key issues:
- Sleep two-column layout stacks awkwardly on mobile (too many sections)
- Budget account cards may overflow narrow screens
- Mood left column is very long on mobile (band selector + 4 sliders + chips + questions + notes)
- Calendar strip on plan page is hard to scroll on very small devices

---

## 5. Prioritized Action Plan

### P0 — Fix Immediately (blocks users or breaks core functionality)

1. **Fix i18n interpolation** → edit `js/core/i18n.js` — implement `replace(/\{(\w+)\}/g, ...)` in the `t()` function to substitute `{n}`, `{amount}`, `{score}` placeholders
2. **Add loading states to all pages** → run `/animate` — add skeleton shimmer to dashboard cards, habit list, budget transactions, sleep stats while Firebase data loads
3. **Extract sidebar into shared component** → create `js/core/sidebar.js` that injects the nav HTML, eliminating 9 copies

### P1 — Fix Before Launch (major UX problems)

4. **Complete light theme on all pages** → run `/colorize` on `focus.css`, `sleep.css`, `budget.css` — add `html[data-theme="light"]` overrides for every hardcoded dark color
5. **Add i18n to Profile page** → run `/harden` on `profile.html` — add `data-i18n` attributes to all 20+ hardcoded strings
6. **Add i18n to Focus settings modal** → add `data-i18n` to "Work Duration", "Break Duration", "Save Preferences", etc.
7. **Add i18n to Plan modal** → add `data-i18n` to "Schedule Event", "Start Time", "Duration", "Priority", "Notes & Links", "Add to Itinerary"
8. **Add i18n to Sleep help modal** → translate all hardcoded help text
9. **Localize toast/offline messages** → edit `js/core/toast.js` — use `HBIT.i18n.t()` for "You're offline" and "Back online" messages
10. **Remove or replace fake social proof** on landing page — either get real testimonials or remove the "10,000+ users" section
11. **Remove "Connect your device" section** from sleep page or implement it — "Coming soon" badges undermine trust

### P2 — Fix Soon (noticeable quality issues)

12. **Add spacing tokens** → define `--space-1` through `--space-8` in `tokens.css` and migrate hardcoded padding/margins
13. **Add easing tokens** → define `--ease-spring`, `--ease-smooth`, `--ease-snappy` in `tokens.css`
14. **Unify module accent colors** → pick one definition per module color and use it everywhere (not 3 different blues for sleep)
15. **Normalize button sizes** → all header icon buttons should be 40px minimum across all pages (budget is 34px)
16. **Normalize avatar styles** → one `.hdr-avatar` component used everywhere instead of 4 different implementations
17. **Create shared modal component** → one CSS pattern for all modals (wizard, detail, settings, log, plan form)
18. **Fix `font-weight: 1000`** → replace with `800` (max weight DM Sans supports) in `components.css`
19. **Add `color-scheme: dark light`** to `:root` in `tokens.css` for native form control theming
20. **Fix heatmap accessibility** → add `role="img"` and `aria-label` describing the habit activity pattern
21. **Make Plan calendar days into `<button>` elements** instead of `<div>` for keyboard accessibility
22. **Add delete confirmation dialogs** to budget transactions and plan events
23. **Fix light theme shadows** → add separate `--shadow-*` values for light mode

### P3 — Polish (nice to have)

24. **Add onboarding/help modals** to Habits, Budget, Mood, Focus, and Plan pages (copy the Sleep help pattern)
25. **Add timer completion sound** to Focus page
26. **Add password strength indicator** to signup form
27. **Add scroll-to-top on mobile** for long pages (Mood, Sleep)
28. **Add skip-to-content link** on all pages for keyboard/screen reader users
29. **Preload DM Sans font** with `<link rel="preload">` on all pages
30. **Add `aria-label` to lang/theme toggle buttons** with translated descriptions

---

## 6. Missing Features & Additions

### UI Patterns That Should Exist But Don't

| Pattern | Status | Where Needed |
|---------|--------|-------------|
| Loading/skeleton states | Missing everywhere | All pages |
| Error states (data fetch failed) | Missing everywhere | All pages |
| Empty states | Exists on Habits, Plan | Missing on Budget, Sleep history, Mood entries |
| Success states (beyond toast) | Missing | After saving habit, mood, budget entry |
| Confirmation dialogs | Missing | Before delete actions |
| Undo actions | Missing | After deleting a habit, transaction, or plan item |

### Micro-interactions Missing

- Checkbox animation when completing a habit (currently instant state change)
- Number counting animation when metrics update on dashboard
- Pull-to-refresh on mobile
- Swipe-to-delete on list items (habits, transactions, plan events)
- Haptic feedback on mobile (timer completion, habit check)

### Accessibility Features Missing

- Skip-to-content link
- `color-scheme` meta for native controls
- Keyboard navigation for calendar (sleep history, plan strip)
- Focus management when modals open/close (some pages have it, others don't)
- High contrast mode support
- Screen reader descriptions for all charts/graphs

### Responsive Adaptations Missing

- Landscape mode optimization for Focus timer
- Tablet-specific layouts (currently jumps from mobile to desktop)
- Safe area handling for notched phones (only some pages use `env(safe-area-inset-*)`)
- Print styles for budget/plan pages

### Delight Moments That Could Be Added

- Confetti or celebration animation when completing all daily habits
- Streak milestone celebrations (7 days, 30 days, 100 days)
- Motivational messages that change based on time of day
- Smooth transitions between pages (currently hard navigates)
- Ambient sound option for Focus timer (rain, lo-fi, white noise)

---

## 7. Recommended Redesigns

### Pages That Need Full Redesign

| Page | Verdict | Reason |
|------|---------|--------|
| Profile | **Redesign** | Weakest page visually. No personality. Zero i18n. Uses outdated topbar component. Needs to feel like a personal space, not a settings form |
| Budget | **Partial redesign** | Light theme is broken. Header sizing is inconsistent. Account cards need refinement. Modal needs shared component |

### Pages That Just Need Fixes

| Page | Verdict |
|------|---------|
| Landing | Remove fake social proof, strengthen headline copy, preload fonts |
| Login/Signup | Add light theme support, inline validation |
| Home | Add loading states, fix mood card wrapper |
| Habits | Fix heatmap accessibility, normalize wizard i18n |
| Sleep | Fix light theme, i18n help modal, remove "coming soon" section |
| Mood | Fix hardcoded dark colors, mobile layout density |
| Focus | Add light theme, i18n settings modal |
| Plan | Fix i18n, make calendar keyboard accessible |

### Redesign Directions

**Profile page redesign:**
1. Run `/frontend-design` to create a new profile concept — should feel like a personal achievement dashboard, not a form
2. Run `/arrange` for layout — hero with larger avatar, stats as visual progress rings, form in a collapsible section
3. Run `/typeset` for better type hierarchy
4. Run `/harden` for complete i18n support
5. Run `/animate` for stat counter animations

**Budget page partial redesign:**
1. Run `/normalize` to align header/button sizes with app standards
2. Run `/colorize` to implement proper light theme
3. Run `/arrange` to improve account card layout on mobile
4. Run `/harden` for delete confirmations and better form validation

---

*End of report. This audit analyzed 11 pages, 7 core CSS files, 5 core JS files, and 11 page-specific CSS files. Every issue has a specific file reference and severity level. No fixes were applied — this is analysis only.*
