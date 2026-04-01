# Hbit — Architecture Document
### BMAD Phase 3 · Architect Role

---

## 1. System Overview

Hbit is a **client-side web application** with a Firebase backend. There is no custom server — all business logic lives in the browser, and all persistence and auth go through Firebase SDKs directly. This keeps operational complexity near zero and hosting costs minimal.

```
┌──────────────────────────────────────────────┐
│                  Browser                      │
│                                              │
│   index.html + landing.css + landing.js      │
│   ↓                                          │
│   app/dashboard.html + app CSS + app JS      │
│   ↓                                          │
│   js/core/   → auth, i18n, storage, utils    │
│   js/modules/→ habits, sleep, mind, budget,  │
│               focus, planning                │
└───────────────────┬──────────────────────────┘
                    │  Firebase SDK (v9 modular)
          ┌─────────┼─────────┐
          ▼         ▼         ▼
    Firebase      Firebase  Firebase
     Auth        Firestore  Hosting
```

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| HTML | Plain HTML5 | No build step, instant iteration |
| CSS | Vanilla CSS with custom properties | Design token system, no dependencies |
| JavaScript | Vanilla ES Modules | Browser-native, no bundler needed |
| Auth | Firebase Authentication | Email/password + social providers later |
| Database | Cloud Firestore | Real-time, offline support, free tier |
| Hosting | Firebase Hosting + Vercel | CDN edge delivery, free tier |
| Fonts | Google Fonts (variable fonts) | Bricolage Grotesque, Plus Jakarta Sans |
| Icons | Inline SVG + emoji | Zero dependency |
| Analytics | Firebase Analytics (planned) | Already bundled with Firebase SDK |

---

## 3. File Structure

```
hbit/
├── index.html                    # Landing page
├── app/
│   ├── dashboard.html            # Main app shell
│   ├── habits.html               # Habits module page (or route)
│   ├── sleep.html
│   ├── mind.html
│   ├── budget.html
│   ├── focus.html
│   └── planning.html
│
├── css/
│   ├── core/
│   │   ├── tokens.css            # Design tokens (colors, fonts, spacing)
│   │   ├── reset.css             # Normalize + base styles
│   │   ├── animations.css        # Shared keyframes + transitions
│   │   └── components.css        # Shared UI components (buttons, cards, modals)
│   ├── pages/
│   │   ├── landing.css           # Scoped to #landingPage
│   │   ├── dashboard.css
│   │   └── [module].css          # Per-module styles
│   └── themes/
│       └── light.css             # Light mode overrides (future)
│
├── js/
│   ├── core/
│   │   ├── firebase.js           # Firebase init + exports (auth, db)
│   │   ├── auth.js               # Auth state management, login, signup, logout
│   │   ├── auth-transitions.js   # Page-ready / page-exit transitions
│   │   ├── i18n.js               # Translation system + EN/FR dictionaries
│   │   ├── storage.js            # Firestore CRUD helpers
│   │   ├── utils.js              # Shared utility functions
│   │   └── router.js             # Client-side routing (future)
│   ├── pages/
│   │   ├── landing.js            # Landing page logic (carousel, scroll, counters)
│   │   ├── dashboard.js          # Dashboard orchestration
│   │   └── auth-page.js          # Login / signup page logic
│   └── modules/
│       ├── habits.js             # Habit CRUD, streak calculation, calendar
│       ├── sleep.js              # Sleep log CRUD, average calculation
│       ├── mind.js               # Mood log, journal CRUD
│       ├── budget.js             # Transaction CRUD, balance calc, chart
│       ├── focus.js              # Pomodoro timer, session log
│       └── planning.js           # Task CRUD, rollover logic
│
├── data/
│   └── (reserved for static data / seed content)
│
├── firebase.json
├── .firebaserc
└── firestore.rules
```

---

## 4. Firebase Architecture

### 4.1 Authentication
- Provider: **Email + Password** (v1)
- Future: Google OAuth, Apple OAuth
- Email verification required before full access
- Password reset via Firebase built-in flow
- Auth state persisted with `browserLocalPersistence`

### 4.2 Firestore Data Model

```
/users/{userId}
  ├── profile/
  │     displayName: string
  │     email: string
  │     language: "en" | "fr"
  │     activeModules: string[]       // ["habits","sleep","mind","budget","focus","planning"]
  │     plan: "free" | "premium"
  │     createdAt: timestamp
  │     onboardingComplete: boolean
  │
  ├── habits/{habitId}
  │     name: string
  │     emoji: string
  │     frequency: "daily" | "weekly" | number[]  // number[] = days of week [0–6]
  │     createdAt: timestamp
  │     archived: boolean
  │     completions/{dateStr}         // dateStr = "2026-03-24"
  │           completed: boolean
  │           completedAt: timestamp
  │
  ├── sleep/{logId}
  │     date: string                  // "2026-03-24"
  │     bedtime: string               // "23:30"
  │     wakeTime: string              // "07:15"
  │     durationMinutes: number       // computed client-side
  │     quality: number               // 1–5
  │     note: string | null
  │     createdAt: timestamp
  │
  ├── mind/{logId}
  │     date: string
  │     moodScore: number             // 1–5
  │     moodEmoji: string
  │     journalText: string | null
  │     reflectionPrompt: string | null
  │     createdAt: timestamp
  │
  ├── budget/{transactionId}
  │     date: string
  │     type: "income" | "expense"
  │     amount: number                // in cents to avoid float issues
  │     category: string
  │     description: string | null
  │     createdAt: timestamp
  │
  │   budgetSettings/
  │     monthlyLimit: number          // in cents
  │
  ├── focus/{sessionId}
  │     date: string
  │     label: string
  │     durationMinutes: number
  │     completed: boolean
  │     startedAt: timestamp
  │     endedAt: timestamp | null
  │
  └── planning/{taskId}
        title: string
        priority: "high" | "medium" | "low"
        dueDate: string               // "2026-03-24"
        completed: boolean
        completedAt: timestamp | null
        rolledOver: boolean
        createdAt: timestamp
```

### 4.3 Firestore Security Rules (Skeleton)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // No public read access to any user data
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 5. Frontend Architecture Patterns

### 5.1 Module Pattern
Each JS module (habits, sleep, etc.) follows this structure:

```javascript
// js/modules/habits.js
import { db, auth } from '../core/firebase.js';
import { getUserRef } from '../core/storage.js';

// ── State ──────────────────────────────────────────
let habits = [];

// ── DOM References ─────────────────────────────────
const habitList = document.querySelector('.habit-list');

// ── Init ───────────────────────────────────────────
export async function initHabits() {
  await loadHabits();
  renderHabits();
  bindEvents();
}

// ── Data ───────────────────────────────────────────
async function loadHabits() { /* Firestore query */ }
async function saveHabit(habit) { /* Firestore write */ }

// ── Render ─────────────────────────────────────────
function renderHabits() { /* DOM update */ }

// ── Events ─────────────────────────────────────────
function bindEvents() { /* event listeners */ }
```

### 5.2 i18n System
- Translation keys stored in `js/core/i18n.js` as nested objects `{ en: {...}, fr: {...} }`
- All translatable elements use `data-i18n="key"` attributes
- `applyTranslations()` re-queries the DOM on every language toggle (dynamic DOM safe)
- Elements with `<br>` or HTML content use `data-i18n-html="key"` + `innerHTML` assignment
- Language preference stored in `localStorage` + Firestore user profile

### 5.3 Page Transitions
- `body` starts `opacity: 0; transform: translateY(8px)`
- `body.page-ready` → fades in (managed by `auth-transitions.js`)
- `body.page-exit` → fades out before navigation
- Auth guard: pages requiring login redirect to `/auth.html` if no `currentUser`

### 5.4 CSS Architecture
- **Design tokens**: `css/core/tokens.css` — single source of truth for colors, fonts, spacing, radii, shadows
- **Scope**: All landing page CSS prefixed with `#landingPage .ld-*`; app CSS prefixed with `#appShell .app-*`
- **No utility classes**: Component-scoped BEM-like classes only
- **Responsive**: Mobile-first breakpoints at 480px, 768px, 1024px

---

## 6. Performance Strategy

| Concern | Solution |
|---|---|
| First paint | Critical CSS inlined in `<head>`; rest loaded async |
| Font loading | `font-display: swap`; preconnect to fonts.googleapis.com |
| Firebase SDK size | Use v9 modular SDK — import only what you use |
| Images | WebP format, lazy loading, no heavy hero images |
| JS execution | All module JS deferred; no blocking scripts |
| Caching | Firebase Hosting CDN handles cache headers; set long TTL for hashed assets |

---

## 7. Offline & PWA Strategy

### Phase 1 (v1 — minimal)
- Service Worker caches app shell (HTML, CSS, JS)
- Last viewed data readable offline
- "You're offline" banner when connection lost

### Phase 2 (v2 — full PWA)
- Full offline write queue (IndexedDB → sync on reconnect)
- "Add to Home Screen" prompt (beforeinstallprompt)
- Push notifications for habit reminders

### `manifest.json` (to be created)
```json
{
  "name": "Hbit",
  "short_name": "Hbit",
  "start_url": "/app/dashboard.html",
  "display": "standalone",
  "background_color": "#0b0f16",
  "theme_color": "#9a1c1c",
  "icons": [...]
}
```

---

## 8. Security Considerations

| Risk | Mitigation |
|---|---|
| Unauthorized data access | Firestore rules enforce `auth.uid == userId` |
| XSS via journal text | Sanitize before `innerHTML` assignment; use `textContent` by default |
| Credential exposure | Firebase config keys are safe to expose (protected by Firestore rules + domain restrictions) |
| Session hijacking | Firebase Auth handles token rotation |
| Rate limiting | Firebase built-in rate limiting; add App Check in v2 |

---

## 9. Scalability Notes

- **Current**: Single Firestore database, serverless, scales to thousands of users with zero ops
- **At ~10k MAU**: Enable Firestore composite indexes for complex queries; evaluate Firebase performance monitoring
- **At ~50k MAU**: Consider splitting heavy analytics reads to a separate read replica or BigQuery export
- **Revenue tracking**: Stripe webhooks → Cloud Functions → update `plan` field in Firestore

---

## 10. Dependency Inventory

| Dependency | Version | Purpose | Risk |
|---|---|---|---|
| Firebase SDK | v9+ (modular) | Auth + Firestore | Medium (vendor lock-in) |
| Google Fonts | CDN | Bricolage Grotesque + Plus Jakarta Sans | Low |
| No others | — | No npm, no bundler, no framework | Zero |

---

*Document produced by: Architect agent — BMAD Phase 3*
*Date: March 2026*
