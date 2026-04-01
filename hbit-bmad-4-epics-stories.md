# Hbit — Epics & Stories
### BMAD Phase 4 · Scrum Master Role

---

## Overview

The work is organized into **7 Epics**, each representing a major product area. Stories are sequenced by dependency — Epics 1–2 must be done before users can access any real features. Sprints are suggested at 1 week each.

**Priority Legend:**
- 🔴 P0 — Launch blocker
- 🟠 P1 — Launch week
- 🟡 P2 — Month 1
- 🟢 P3 — Future

---

## Epic 1 — Foundation & Auth
**Goal**: Users can create accounts, sign in, and access the app securely.
**Blocks**: Everything else.
**Sprint**: 1

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E1-S1 | Set up Firebase project, enable Email/Password auth | 2 | 🔴 |
| E1-S2 | Create `js/core/firebase.js` — init Firebase, export `auth` and `db` | 2 | 🔴 |
| E1-S3 | Build Sign Up page (`/auth/signup.html`) — form, validation, Firebase `createUserWithEmailAndPassword` | 3 | 🔴 |
| E1-S4 | Build Sign In page (`/auth/login.html`) — form, Firebase `signInWithEmailAndPassword` | 3 | 🔴 |
| E1-S5 | Implement auth guard — redirect to login if no session on protected pages | 2 | 🔴 |
| E1-S6 | Implement logout — `signOut()` + redirect to landing | 1 | 🔴 |
| E1-S7 | Password reset flow — "Forgot password?" link → Firebase `sendPasswordResetEmail` | 2 | 🟠 |
| E1-S8 | Email verification — send verification email on signup, prompt user to verify | 2 | 🟠 |
| E1-S9 | Auth page — mobile responsive (virtual keyboard safe, no overflow) | 2 | 🔴 |
| E1-S10 | Page transition animations on auth pages (fade in/out via `body.page-ready`) | 1 | 🟠 |

**Definition of Done**: A user can sign up, sign in, reset password, and be redirected appropriately on all screen sizes.

---

## Epic 2 — Onboarding & Dashboard Shell
**Goal**: After signup, new users are onboarded; returning users see a functional dashboard.
**Sprint**: 2

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E2-S1 | Create Firestore `users/{uid}/profile` document on signup (displayName, email, language, plan: "free", activeModules: all 6, createdAt, onboardingComplete: false) | 2 | 🔴 |
| E2-S2 | Build 3-step onboarding flow — Step 1: module selection, Step 2: first habit (optional), Step 3: dashboard preview | 5 | 🟠 |
| E2-S3 | Build Dashboard shell (`/app/dashboard.html`) — nav sidebar, main content area, module card grid | 5 | 🔴 |
| E2-S4 | Dashboard — "Today at a glance" row: today's date, completion rings, greeting | 3 | 🟠 |
| E2-S5 | Dashboard — module cards showing live summary (last entry, streak, today's status) | 5 | 🟠 |
| E2-S6 | Dashboard — nav sidebar with module links + settings link + sign out | 3 | 🔴 |
| E2-S7 | Dashboard — fully responsive (sidebar collapses to bottom nav on mobile) | 4 | 🔴 |
| E2-S8 | Language toggle in app settings persists to Firestore profile + `localStorage` | 2 | 🔴 |

**Definition of Done**: A new user lands on the dashboard after onboarding; returning user sees their module summaries.

---

## Epic 3 — Landing Page Polish
**Goal**: The marketing landing page converts visitors to signups at ≥8%.
**Sprint**: 3 (can run in parallel with Epic 2)

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E3-S1 | Implement Part 1 upgrade prompt (nav pulse, social proof strip, How It Works, stat counters, section-break headlines, repeat CTAs) | 8 | 🔴 |
| E3-S2 | Implement Part 2 upgrade prompt (Bricolage Grotesque font, copy rewrite EN+FR, mobile CSS, FR button fix, language indicator) | 8 | 🔴 |
| E3-S3 | A/B test hero headline (track which CTA copy gets more clicks via Firebase Analytics events) | 3 | 🟡 |
| E3-S4 | Add pricing/plans section to landing page (Free vs Hbit+ comparison table) | 3 | 🟠 |
| E3-S5 | Fix copyright year in footer (© 2025 → © 2026) | 1 | 🔴 |
| E3-S6 | Add Open Graph + meta tags for social sharing previews | 2 | 🟠 |
| E3-S7 | Lighthouse audit — achieve ≥85 performance, ≥90 accessibility | 3 | 🟠 |

**Definition of Done**: Landing page scores ≥85 Lighthouse performance, is fully responsive, FR works on all sections, and both upgrade prompts are implemented.

---

## Epic 4 — Core Modules (All 6)
**Goal**: All 6 modules have functional CRUD, basic visualization, and persist to Firestore.
**Sprint**: 4–6

### 4A — Habits Module (Sprint 4)

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E4-S1 | Build habits page (`/app/habits.html`) — list view of all habits | 3 | 🔴 |
| E4-S2 | Create habit flow — modal with name, emoji picker, frequency selector | 4 | 🔴 |
| E4-S3 | Habit CRUD — create, read (list), update, delete (archive) in Firestore | 5 | 🔴 |
| E4-S4 | Mark habit complete for today — single-tap, Firestore `completions/{date}` | 3 | 🔴 |
| E4-S5 | Streak calculation — compute current streak from `completions` subcollection | 4 | 🔴 |
| E4-S6 | 30-day calendar heatmap — visual calendar showing completion history | 5 | 🟠 |
| E4-S7 | Streak milestone celebration — confetti/animation on 7, 30, 100-day streaks | 3 | 🟠 |
| E4-S8 | Free tier limit — cap at 5 habits, show upsell prompt on 6th | 2 | 🟠 |
| E4-S9 | Habits module card on dashboard — shows today's completion status + streak | 2 | 🔴 |

### 4B — Sleep + Mind Modules (Sprint 5)

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E4-S10 | Sleep log form — bedtime picker, wake time picker, quality 1–5 stars | 3 | 🔴 |
| E4-S11 | Sleep CRUD — save/read/delete from Firestore | 3 | 🔴 |
| E4-S12 | Sleep 7-day bar chart (canvas or SVG, no library) | 4 | 🟠 |
| E4-S13 | Sleep dashboard card — shows last night's hours + 7-day average | 2 | 🔴 |
| E4-S14 | Mood log form — emoji selector (5 moods), optional journal text | 3 | 🔴 |
| E4-S15 | Mind CRUD — save/read/delete from Firestore | 3 | 🔴 |
| E4-S16 | Mood 7-day trend chart | 4 | 🟠 |
| E4-S17 | Journal entry browse — paginated list by date | 3 | 🟠 |
| E4-S18 | Mind dashboard card — shows today's mood + 7-day trend arrow | 2 | 🔴 |

### 4C — Budget, Focus, Planning Modules (Sprint 6)

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E4-S19 | Budget transaction form — amount, type (income/expense), category, date | 3 | 🔴 |
| E4-S20 | Budget CRUD — save/read/delete from Firestore (amount in cents) | 3 | 🔴 |
| E4-S21 | Budget current month balance — income − expenses calculation | 3 | 🔴 |
| E4-S22 | Budget category donut chart | 4 | 🟠 |
| E4-S23 | Budget dashboard card — shows month balance + spend vs limit | 2 | 🔴 |
| E4-S24 | Focus Pomodoro timer — 25/5 default, custom duration, pause/resume | 5 | 🔴 |
| E4-S25 | Focus session log — save completed sessions to Firestore | 3 | 🔴 |
| E4-S26 | Focus today's deep work total + weekly chart | 3 | 🟠 |
| E4-S27 | Focus dashboard card — shows today's focus time | 2 | 🔴 |
| E4-S28 | Planning task CRUD — add, complete, delete tasks with priority | 4 | 🔴 |
| E4-S29 | Planning rollover — uncompleted tasks flag as rolled over on new day | 3 | 🟡 |
| E4-S30 | Planning dashboard card — shows today's tasks + completion count | 2 | 🔴 |

**Definition of Done for Epic 4**: All 6 modules have working CRUD, data persists to Firestore, dashboard cards reflect live data, and all module pages are mobile responsive.

---

## Epic 5 — Freemium & Premium
**Goal**: Free tier limits enforced; pricing page live; Hbit+ payment flow integrated.
**Sprint**: 7

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E5-S1 | Define free tier limits in a config constant (5 habits, 30-day history, 1 month budget) | 1 | 🟠 |
| E5-S2 | Implement free tier enforcement — check plan before allowing action, show upsell | 4 | 🟠 |
| E5-S3 | Build pricing page (`/pricing.html`) — Free vs Hbit+ feature comparison table | 4 | 🟠 |
| E5-S4 | Integrate Stripe — embed Stripe Checkout for monthly and annual plans | 6 | 🟡 |
| E5-S5 | Stripe webhook → Firebase Cloud Function → update `plan: "premium"` in Firestore | 5 | 🟡 |
| E5-S6 | Premium badge + UI indicators in app when plan is active | 2 | 🟡 |
| E5-S7 | Cancel subscription flow — link to Stripe customer portal | 3 | 🟡 |

**Definition of Done**: Free users hit limits and see upsell; Premium users can subscribe via Stripe and immediately get unlocked features.

---

## Epic 6 — Settings & Profile
**Goal**: Users can manage their account and preferences.
**Sprint**: 8

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E6-S1 | Settings page — display name update, language toggle, sign out | 3 | 🟠 |
| E6-S2 | Change password flow — current password → new password | 3 | 🟠 |
| E6-S3 | Delete account — confirm modal → delete all Firestore data + Firebase Auth user | 4 | 🟠 |
| E6-S4 | Data export — generate and download JSON of all user data | 4 | 🟡 |
| E6-S5 | Light mode toggle (persisted to profile) | 3 | 🟡 |

---

## Epic 7 — PWA & Performance
**Goal**: App is installable, fast, and works offline.
**Sprint**: 9

| Story ID | Story | Points | Priority |
|---|---|---|---|
| E7-S1 | Create `manifest.json` with app name, icons, theme color, standalone display | 2 | 🟠 |
| E7-S2 | Service Worker — cache app shell (HTML, CSS, JS, fonts) | 4 | 🟠 |
| E7-S3 | Offline banner — detect connection loss, show "You're offline" state | 3 | 🟠 |
| E7-S4 | "Add to Home Screen" prompt on mobile after 3rd session | 3 | 🟡 |
| E7-S5 | Lighthouse audit — 85+ performance, 90+ accessibility, 90+ best practices | 3 | 🟠 |
| E7-S6 | Core Web Vitals — LCP < 2.5s, FID < 100ms, CLS < 0.1 | 4 | 🟡 |

---

## Suggested Sprint Roadmap

| Sprint | Epic | Key Deliverable |
|---|---|---|
| Sprint 1 | Epic 1 | Users can sign up, log in, log out |
| Sprint 2 | Epic 2 | Dashboard shell + onboarding works |
| Sprint 3 | Epic 3 (parallel) | Landing page fully upgraded + converting |
| Sprint 4 | Epic 4A | Habits module end-to-end |
| Sprint 5 | Epic 4B | Sleep + Mind modules end-to-end |
| Sprint 6 | Epic 4C | Budget + Focus + Planning modules end-to-end |
| Sprint 7 | Epic 5 | Freemium limits + Stripe payment |
| Sprint 8 | Epic 6 | Settings + account management |
| Sprint 9 | Epic 7 | PWA + performance hardening |
| Sprint 10+ | Backlog | Cross-module insights, AI features, nutrition module |

**Total story points (P0+P1)**: ~145 points
**Estimated velocity**: 20–25 points/sprint (solo dev)
**Estimated time to fully working MVP (Epics 1–4)**: ~6 sprints = 6 weeks

---

## Definition of Done (Global)

A story is done when:
- ✅ Feature works in Chrome, Firefox, and Safari
- ✅ Feature is fully responsive (480px, 768px, 1024px+)
- ✅ UI text is translated in both EN and FR
- ✅ Firestore data is correctly written and read
- ✅ No console errors
- ✅ Passes auth guard (unauthenticated user cannot access)
- ✅ Works offline (shows cached data or graceful message)

---

*Document produced by: Scrum Master agent — BMAD Phase 4*
*Date: March 2026*
