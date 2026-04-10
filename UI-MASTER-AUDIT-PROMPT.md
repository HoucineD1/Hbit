# Full UI Master Audit — Hbit App

Run `/ui-master` and perform a **complete UI analysis** of the entire Hbit application. Analyze every page, every component, and every design decision — then give me a single comprehensive markdown report with everything I need to fix, improve, and add.

---

## Context About Hbit

Hbit is an all-in-one personal growth web app. Built with vanilla JS + Firebase, deployed live, bilingual (EN/FR). I'm the solo founder. The app covers: **Habits, Sleep, Mood, Budget, Focus, and Plan**.

**Target audience**: People who want to take control of their daily lives — track habits, improve sleep, manage mood, control spending, stay focused, and plan their days. Age 18-35, mobile-first, modern.

**Brand personality**: Personal, motivating, warm but modern. Not corporate. Not clinical. Should feel like a personal coach, not a hospital app.

**Tech stack**: Vanilla HTML/CSS/JS, Firebase (Auth + Firestore), no framework, no build tools. Design tokens live in `css/core/tokens.css`. Brand color is `#E63946` (red). Dark theme by default.

---

## Pages to Analyze (ALL of them)

Analyze every page in this order. For each one, read both the HTML and its matching CSS + JS files:

| Page | HTML | CSS | JS |
|------|------|-----|----|
| Landing | `index.html` | `css/pages/landing.css` | `js/pages/landing.js` |
| Login | `login.html` | `css/pages/login.css` | `js/pages/login.js` |
| Signup | `signup.html` | `css/pages/signup.css` | `js/pages/signup.js` |
| Home/Dashboard | `home.html` | `css/pages/home.css` | `js/pages/home.js` |
| Habits | `habits.html` | `css/pages/habits.css` | `js/pages/habits.js` |
| Sleep | `sleep.html` | `css/pages/sleep.css` | `js/pages/sleep.js` |
| Mood | `mood.html` | `css/pages/mood.css` | `js/pages/mood.js` |
| Budget | `budget.html` | `css/pages/budget.css` | `js/pages/budget.js` |
| Focus | `focus.html` | `css/pages/focus.css` | `js/pages/focus.js` |
| Plan | `plan.html` | `css/pages/plan.css` | `js/pages/plan.js` |
| Profile | `profile.html` | `css/pages/profile-settings.css` | `js/pages/profile.js` |

Also analyze the shared systems:
- `css/core/tokens.css` — design tokens
- `css/core/base.css` — base styles
- `css/core/components.css` — shared components
- `css/core/layout.css` — layout system
- `css/core/nav.css` — navigation
- `css/core/topbar.css` — top bar
- `css/core/animations.css` — animations
- `js/core/theme.js` — theming
- `js/core/nav.js` — navigation logic
- `js/core/i18n.js` — internationalization

---

## What to Run (Use ALL These Skills)

For each page, run these skills in sequence as the `/ui-master` skill describes:

### Phase 1: Understand
- `/frontend-design` — load the design context, check for `.impeccable.md`. If it doesn't exist, create one based on the context I gave above
- `/ckm-design-system` — audit the token architecture in `css/core/tokens.css`
- `web-design-guidelines` — check against modern UI standards

### Phase 2: Analyze
- `/critique` — full heuristic scoring for each page. Nielsen's 10 heuristics, P0-P3 severity, AI slop detection, persona testing
- `/audit` — technical audit: accessibility (WCAG AA), performance, responsive design, theming, anti-patterns. Score each dimension 0-4

### Phase 3: Identify Improvements
For each issue found, map it to the skill that fixes it:
- Layout problems → `/arrange`
- Typography issues → `/typeset`
- Color problems → `/colorize`
- Too generic/boring → `/bolder`
- Missing animations → `/animate`
- Accessibility gaps → `/harden`
- Performance issues → `/optimize`
- Inconsistencies → `/normalize`
- Responsive problems → `/adapt`
- Missing delight → `/delight`
- Needs extraordinary push → `/overdrive`

---

## Output Format

Save the report as `UI-MASTER-REPORT.md` in the project root. Structure it exactly like this:

### 1. Executive Summary
- Overall app health score (out of 40 for heuristics, out of 20 for technical audit)
- Top 5 most critical issues across the entire app
- Top 5 things that are already working well
- One-line verdict: does this app look AI-generated or distinctive?

### 2. Design System Audit
- Token architecture assessment (are tokens used consistently? any hardcoded values?)
- Typography evaluation (is DM Sans the right choice? is the scale working?)
- Color palette evaluation (is the brand color used effectively? are module colors cohesive?)
- Spacing and layout system evaluation
- Animation system evaluation
- Missing tokens or inconsistencies

### 3. Page-by-Page Analysis

For EACH of the 11 pages, provide:

**[Page Name]**
- **Screenshot description**: What the page looks like (describe it so I can picture it)
- **Heuristic Score**: Nielsen's 10 heuristics table (score 0-4 each, total /40)
- **Technical Score**: 5-dimension audit (accessibility, performance, responsive, theming, anti-patterns, total /20)
- **AI Slop Check**: Pass/fail — does this page look AI-generated? Specific tells
- **Issues Found**: List every issue with P0/P1/P2/P3 severity tag
- **What's Working**: 2-3 specific positives
- **Fix Commands**: Exactly which skills to run and what they should focus on

### 4. Cross-Cutting Issues
- Problems that appear on multiple pages (systematic issues)
- Navigation consistency
- Shared component quality
- i18n implementation quality
- Theme switching quality (if applicable)
- Mobile responsiveness across all pages

### 5. Prioritized Action Plan

A single, ordered list of EVERYTHING to do, grouped by priority:

**P0 — Fix Immediately (blocks users)**
1. [Issue] → run `/skill-name` on `file.html` — [what to fix]
2. ...

**P1 — Fix Before Launch (major UX problems)**
1. ...

**P2 — Fix Soon (noticeable quality issues)**
1. ...

**P3 — Polish (nice to have)**
1. ...

### 6. Missing Features & Additions
- UI patterns that should exist but don't (empty states, loading states, error states, success states)
- Micro-interactions that are missing
- Accessibility features that are missing
- Responsive adaptations that are missing
- Delight moments that could be added

### 7. Recommended Redesigns
- Which pages need a full redesign vs. just fixes
- For pages needing redesign, describe the new direction
- Suggest which skills to use in what order for each redesign

---

## Rules

- Be brutally honest. I need real feedback, not encouragement.
- Score low when something is genuinely bad. Don't inflate scores to be nice.
- Every issue must have a specific file, element, and fix — no vague "consider improving X"
- If something looks like every other AI-generated app, say so directly
- Compare pages against each other — flag inconsistencies between them
- The report should be long and detailed. This is a full audit, not a summary.
- Include code snippets for specific issues when helpful (e.g., "this CSS should be X instead of Y")
- Do NOT fix anything yet — just analyze and document. I'll decide what to fix and when.
