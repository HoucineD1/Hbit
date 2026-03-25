# Hbit — Product Requirements Document (PRD)
### BMAD Phase 2 · Product Manager Role

---

## 1. Product Overview

| Field | Value |
|---|---|
| Product Name | Hbit |
| Version | 1.0 MVP |
| Stack | HTML, CSS, Vanilla JavaScript |
| Hosting | Firebase + Vercel |
| Languages | English (EN), French (FR) |
| Platform | Web (desktop + mobile responsive) |
| Business Model | Freemium |

---

## 2. Goals

### Product Goals (6 months)
1. Ship a fully functional MVP with all 6 modules working end-to-end
2. Achieve a landing page → signup conversion rate of ≥8%
3. Hit D30 retention of ≥25% for signed-up users
4. Convert ≥4% of active free users to Hbit+

### Anti-Goals
- Do NOT build a native mobile app in v1
- Do NOT add social/community features
- Do NOT over-engineer analytics before core usage is validated

---

## 3. User Stories by Area

---

### 3.1 — Authentication & Onboarding

| ID | User Story | Priority |
|---|---|---|
| AUTH-1 | As a visitor, I can create an account with email + password | P0 |
| AUTH-2 | As a visitor, I can sign in with an existing account | P0 |
| AUTH-3 | As a user, I can reset my password via email | P0 |
| AUTH-4 | As a new user, I go through a 3-step onboarding flow that asks which modules I want to activate | P1 |
| AUTH-5 | As a new user, I can choose my language preference (EN/FR) during onboarding | P1 |
| AUTH-6 | As a user, I can sign out | P0 |
| AUTH-7 | As a user on mobile, the auth forms are fully usable with a virtual keyboard | P0 |

**Acceptance Criteria — AUTH-4 (Onboarding Flow)**
- Step 1: "Which areas do you want to improve?" → multi-select cards for 6 modules
- Step 2: "Set your first habit" or "Start fresh" (skip option)
- Step 3: Dashboard preview → "Let's go" CTA
- Progress indicator visible (3 dots / steps)
- Skippable at any step
- Stores selections in user profile (Firebase)

---

### 3.2 — Dashboard

| ID | User Story | Priority |
|---|---|---|
| DASH-1 | As a user, I see a unified dashboard showing all my active modules at a glance | P0 |
| DASH-2 | As a user, I can reorder which modules appear on my dashboard | P2 |
| DASH-3 | As a user, I see a daily "Today at a glance" summary row at the top | P1 |
| DASH-4 | As a user, I see my current streaks and progress rings | P1 |
| DASH-5 | As a user, I can click into any module from the dashboard | P0 |
| DASH-6 | As a Premium user, I see a cross-module insight card ("Your focus scores are 40% higher on nights you sleep 7+ hours") | P2 |

---

### 3.3 — Habits Module

| ID | User Story | Priority |
|---|---|---|
| HAB-1 | As a user, I can create a habit with a name, icon, and frequency (daily / weekly / custom days) | P0 |
| HAB-2 | As a user, I can mark a habit as complete for today with one tap | P0 |
| HAB-3 | As a user, I can see my current streak for each habit | P0 |
| HAB-4 | As a user, I can view a 30-day calendar heatmap for each habit | P1 |
| HAB-5 | As a user, I can archive or delete a habit | P0 |
| HAB-6 | As a user, I get a visual celebration when I hit a streak milestone (7, 30, 100 days) | P1 |
| HAB-7 | As a Free user, I can create up to 5 habits; Premium unlocks unlimited | P1 |
| HAB-8 | As a user, I can set a daily reminder time for any habit (browser notification) | P2 |

**Acceptance Criteria — HAB-1 (Create Habit)**
- Modal/drawer with: name field, icon picker (emoji or preset set), frequency selector
- Validation: name required, max 40 chars
- Habit immediately appears in dashboard and habit list
- Saved to Firebase under user UID

---

### 3.4 — Sleep Module

| ID | User Story | Priority |
|---|---|---|
| SLP-1 | As a user, I can log my sleep by entering bedtime and wake time | P0 |
| SLP-2 | As a user, I can rate my sleep quality (1–5 scale) | P0 |
| SLP-3 | As a user, I see my average sleep duration for the past 7 days | P0 |
| SLP-4 | As a user, I see a weekly bar chart of sleep duration | P1 |
| SLP-5 | As a Premium user, I see a 30-day trend and best/worst sleep correlations | P2 |
| SLP-6 | As a user, I can add a note to any sleep log | P1 |

---

### 3.5 — State of Mind Module

| ID | User Story | Priority |
|---|---|---|
| MIND-1 | As a user, I can log my mood for today using an emoji/scale selector | P0 |
| MIND-2 | As a user, I can write a free-text journal entry tied to my mood log | P0 |
| MIND-3 | As a user, I see a 7-day mood trend chart | P1 |
| MIND-4 | As a user, I can browse past journal entries by date | P1 |
| MIND-5 | As a user, I see a daily reflection prompt (optional) | P2 |
| MIND-6 | As a Premium user, I see AI-generated mood pattern insights | P3 |

---

### 3.6 — Budget Module

| ID | User Story | Priority |
|---|---|---|
| BUD-1 | As a user, I can log an income or expense with an amount, category, and date | P0 |
| BUD-2 | As a user, I can see my current month's balance (income − expenses) | P0 |
| BUD-3 | As a user, I can view a category breakdown as a pie/donut chart | P1 |
| BUD-4 | As a user, I can set a monthly spending budget limit | P1 |
| BUD-5 | As a user, I get a warning when I've used 80% of my budget | P2 |
| BUD-6 | As a user, I can view a transaction history list with search/filter | P1 |
| BUD-7 | As a Free user, I can track 1 month of history; Premium unlocks full history | P1 |

---

### 3.7 — Focus Module

| ID | User Story | Priority |
|---|---|---|
| FOC-1 | As a user, I can start a Pomodoro timer (25 min work / 5 min break, or custom) | P0 |
| FOC-2 | As a user, I can label what I'm focusing on before starting | P0 |
| FOC-3 | As a user, I see today's total deep work time | P0 |
| FOC-4 | As a user, I see a weekly chart of focus sessions and time | P1 |
| FOC-5 | As a user, I can pause and resume a session | P0 |
| FOC-6 | As a user, I get an audio or vibration cue when a session ends | P1 |
| FOC-7 | As a user, I can see a log of all past focus sessions | P2 |

---

### 3.8 — Planning Module

| ID | User Story | Priority |
|---|---|---|
| PLN-1 | As a user, I can add tasks to today's plan | P0 |
| PLN-2 | As a user, I can mark tasks as complete | P0 |
| PLN-3 | As a user, I can set task priority (high / medium / low) | P1 |
| PLN-4 | As a user, I can schedule tasks for future dates | P1 |
| PLN-5 | As a user, I can view a weekly planner view | P2 |
| PLN-6 | As a user, uncompleted tasks roll over to the next day with a visual indicator | P2 |

---

### 3.9 — Landing Page & Marketing Site

| ID | User Story | Priority |
|---|---|---|
| LND-1 | As a visitor, I understand what Hbit is within 5 seconds of landing | P0 |
| LND-2 | As a visitor, I can see an interactive preview of all 6 modules | P0 |
| LND-3 | As a visitor, I can create an account directly from the landing page | P0 |
| LND-4 | As a French-speaking visitor, I can switch to FR and read the entire page in French | P0 |
| LND-5 | As a mobile visitor, the landing page is fully readable and usable | P0 |
| LND-6 | As a visitor, I see social proof (user count, reviews, or stats) | P1 |
| LND-7 | As a visitor, I see a clear explanation of what I get for free vs. premium | P1 |

---

### 3.10 — Settings & Profile

| ID | User Story | Priority |
|---|---|---|
| SET-1 | As a user, I can update my display name and email | P1 |
| SET-2 | As a user, I can change my password | P1 |
| SET-3 | As a user, I can toggle language between EN and FR | P0 |
| SET-4 | As a user, I can toggle dark/light mode | P2 |
| SET-5 | As a user, I can export my data as CSV or JSON | P2 |
| SET-6 | As a user, I can delete my account and all data | P1 |

---

### 3.11 — Premium / Hbit+

| ID | User Story | Priority |
|---|---|---|
| PRE-1 | As a Free user, I see a tasteful upsell when I hit a free tier limit | P1 |
| PRE-2 | As a user, I can view a pricing page explaining Free vs Hbit+ | P1 |
| PRE-3 | As a user, I can subscribe to Hbit+ (monthly or annual) | P2 |
| PRE-4 | As a subscriber, my Premium status is reflected in the UI | P2 |
| PRE-5 | As a subscriber, I can cancel at any time from settings | P2 |

---

## 4. Non-Functional Requirements

| Requirement | Target |
|---|---|
| First Contentful Paint (FCP) | < 1.5 seconds |
| Time to Interactive | < 3 seconds on 4G mobile |
| Lighthouse Performance Score | ≥ 85 |
| Lighthouse Accessibility Score | ≥ 90 |
| Data persistence | Firebase Firestore (real-time) |
| Offline support | Basic PWA — last state cached |
| Cross-browser support | Chrome, Firefox, Safari, Edge (last 2 versions) |
| Mobile breakpoints | 480px, 768px, 1024px |
| Auth security | Firebase Auth with email verification |
| Data privacy | No data sold; user owns their data |

---

## 5. Feature Prioritization Matrix

### P0 — Must Have (Launch Blockers)
Auth flow, Dashboard, Habits (create/check/streak), Sleep log, Mood log, Budget log, Focus timer, Planning tasks, Landing page, FR language toggle

### P1 — Should Have (Launch Week)
Charts for each module, Onboarding flow, Habit streaks, Daily at-a-glance row, Free tier limits, Pricing page upsell, Mobile responsiveness

### P2 — Nice to Have (Month 1)
Cross-module insights, Reminders/notifications, Data export, Light mode, Module reordering, PWA install prompt

### P3 — Future (v2)
AI insights, Nutrition module, Wearable integration, Native mobile app

---

## 6. Open Questions

1. **Payment provider**: Stripe (recommended), Paddle, or Lemon Squeezy? — Needs decision before PRE-3
2. **Notification strategy**: Browser push only, or email digest too?
3. **PWA**: Should the landing page include an "Add to Home Screen" prompt on mobile?
4. **Analytics**: Firebase Analytics, Plausible, or Mixpanel for event tracking?
5. **Moderation**: Since journal entries are free text stored in Firebase, no moderation needed now — but plan for eventual data encryption

---

*Document produced by: Product Manager agent — BMAD Phase 2*
*Date: March 2026*
