# Hbit — AI Coding Agent Prompt: 10/10 Screen Redesign
## Landing Page · Login · Signup · Post-Signup Onboarding Wizard
### Full Developer Specification — Ready to Execute

---

> **HOW TO USE THIS PROMPT**
> This document is your complete brief for an AI coding agent (Claude Code, Cursor, Copilot, etc.).
> Feed the entire document. The agent has full context on what exists, what's broken, what to build, and the exact quality bar.
> Do NOT skip sections. The order matters — foundational fixes must happen before enhancements.

---

## 0. PROJECT CONTEXT

You are working on **Hbit** — an all-in-one personal growth web app built in **vanilla JavaScript + Firebase**. No frameworks, no bundlers. Plain HTML, CSS (with CSS custom properties), and vanilla JS. The app is bilingual (EN/FR) using a custom i18n system via `data-i18n` attributes. Firebase handles auth and Firestore. The app is deployed on Firebase Hosting.

**Tech stack constraints:**
- Vanilla HTML/CSS/JS only — no React, no Vue, no Svelte
- All styles live in `css/pages/auth.css`, `css/pages/landing.css`, and `styles.css`
- All scripts live in `js/pages/` and `js/core/`
- No build step — files are served as-is
- i18n keys live in JS files under `js/core/i18n.js` — when you change copy in HTML, add the corresponding key there too
- Firebase Auth is already initialized in `js/core/firebase-init.js`
- Google Auth provider is already available — it just needs to be surfaced in the UI

**Files you will touch:**
- `index.html` + `css/pages/landing.css`
- `login.html` + `signup.html` + `css/pages/auth.css`
- `js/pages/login.js` + `js/pages/signup.js`
- `js/core/i18n.js` (for any new copy keys)
- **New file to create:** `welcome.html` + `css/pages/welcome.css` + `js/pages/welcome.js`

**Files you must NOT touch:**
- `js/core/firebase-init.js` — Firebase config is live
- `js/core/db.js` — database schema is in production
- `firestore.rules` — security rules are live
- Any `home.html`, `habits.html`, `budget.html`, `sleep.html`, `mood.html`, `focus.html`, `plan.html` — out of scope

**Quality bar:** Every change must match or exceed the visual quality of apps like Headspace, Habitify, Linear, and Vercel. The existing design system (glass cards, ambient glows, color tokens) is good — you are fixing bugs and adding missing pieces, not redesigning from scratch.

---

## 1. DESIGN TOKENS REFERENCE

Do not hardcode colors or spacing. Use these existing CSS custom properties from `css/pages/auth.css`:

```
Authentication screens:
--au-bg           Background base color
--au-text         Primary text
--au-muted        Secondary/label text
--au-subtle       Placeholder / disabled text
--au-border       Default border
--au-border-hi    Highlighted border (hover)
--au-surface      Card/field background
--au-surface-hi   Hovered surface
--au-brand        Brand red (#c0292a)
--au-brand-dark   Darker brand red (#9a1c1c)
--au-success      Success green (#55c28a)
--au-shadow       Card drop shadow
--auth-input-bg   Input field background

Landing page (scoped to #landingPage):
--ld-brand        Brand red
--ld-brand-l      Lighter brand red
--ld-brand-glow   Brand glow for shadows
--ld-text         Primary text
--ld-muted        Secondary text
--ld-subtle       Dimmed text
--ld-glass-bg     Glass card background
--ld-glass-border Glass border
```

**Typography scale (already loaded):**
- Display/headings: `"Bricolage Grotesque"` — used for titles, brand mark
- Body/UI: `"Plus Jakarta Sans"` — used for labels, inputs, body text

**Breakpoints to respect:**
- `480px` — small phones (iPhone SE, Galaxy A)
- `540px` — most phones
- `768px` — phablets / small tablets
- `960px` — tablet landscape / where desktop panel appears
- `1024px` — where landing switches from 1-col to 2-col
- `1280px` — wide desktop
- `1440px` — very wide desktop

---

## 2. WAVE 1 — CRITICAL FIXES (Do These First, In Order)

These are breaking visual bugs. Nothing else matters until these are done.

---

### 2.1 Fix: Duplicate Logo on Mobile (login.html + signup.html)

**Problem:** On viewports below 960px, both the topbar `.au-logo` and the `.auth-mobile-showcase-brand` show the Hbit H-mark and name simultaneously. Two logos = unprofessional.

**Solution A — CSS only (preferred, zero HTML change):**

In `css/pages/auth.css`, inside the existing `@media (min-width: 960px)` block that shows `.auth-panel`, add its inverse to hide the topbar logo below 960px:

```css
/* Hide topbar logo on mobile — showcase brand below takes the role */
@media (max-width: 959px) {
  .au-logo {
    display: none;
  }
}
```

This means:
- Mobile: one logo in the showcase section, topbar has only the back-chevron and lang toggle
- Desktop (960px+): topbar logo visible (panel also shows brand — this is intentional on desktop)

**Verify:** Open login.html on a 375px viewport. Count logos. There should be exactly one.

---

### 2.2 Fix: Mobile Text Alignment Drift (login.html + signup.html)

**Problem:** On mobile, the `.auth-mobile-showcase` headline and feature rows inside `.auth-mobile-bottom-inner` are left-aligned instead of centered. Text drifts to the left edge giving an unfinished look.

**In `css/pages/auth.css`**, add this block (new, below the existing `@media (max-width: 540px)` block):

```css
@media (max-width: 959px) {
  /* Center the mobile intro section above the card */
  .auth-mobile-showcase {
    align-items: center;
    text-align: center;
    padding: 16px 16px 0;
  }

  .auth-mobile-showcase-headline {
    text-align: center;
    max-width: 300px;
    margin: 0 auto;
  }

  .auth-mobile-showcase-desc {
    text-align: center;
    margin: 0 auto;
  }

  /* Center the bottom feature strip */
  .auth-mobile-bottom-inner {
    align-items: center;
    text-align: center;
  }

  .auth-mobile-bottom-features {
    align-items: center;
  }

  .auth-mobile-feat {
    justify-content: center;
  }

  /* Center the trust line */
  .auth-trust {
    justify-content: center;
  }
}
```

**Verify:** On 375px iPhone viewport, every text element from top to bottom should be horizontally centered. No text should hug the left edge.

---

### 2.3 Fix: Input Font Size to 16px (auth.css)

**Problem:** `.auth-input` uses `font: 500 15px/1`. On iOS Safari, any input with font-size below 16px triggers an automatic page zoom when focused. This breaks the mobile layout and looks terrible.

**In `css/pages/auth.css`**, find the `.auth-input` rule and change:

```css
/* FROM */
font: 500 15px/1 "Plus Jakarta Sans", sans-serif;

/* TO */
font: 500 16px/1.2 "Plus Jakarta Sans", sans-serif;
```

Also change `line-height` from `1` to `1.2` — this gives the input text vertical breathing room so it doesn't look clipped.

**Verify:** On an iOS device or iOS simulator, tap any input field. The page should NOT zoom. The text should be clearly legible.

---

### 2.4 Fix: Input + Button Height on Mobile (auth.css)

**Problem:** Current `height: 50px` on inputs and buttons is acceptable on desktop but too short for reliable thumb tapping on mobile (minimum recommended: 48px per Apple HIG, 44px per Google Material). On mobile, bump to 52px for inputs and 54px for the submit button.

**In `css/pages/auth.css`**, update the existing `@media (max-width: 540px)` block:

```css
@media (max-width: 540px) {
  /* existing rules stay... then add: */
  .auth-input {
    height: 52px;
  }

  .auth-submit-btn {
    height: 54px;
    font-size: 16px;
    border-radius: 16px;
  }

  .auth-social-btn {
    height: 50px;
    font-size: 15px;
  }

  .auth-reset-btn {
    height: 50px;
  }
}
```

**Verify:** On mobile, all tap targets are visually generous and easy to tap accurately.

---

### 2.5 Fix: Password Column Grid — Always Stack Vertically (auth.css + signup.html)

**Problem:** `.auth-field-row` uses `grid-template-columns: 1fr 1fr` which places Password and Confirm Password side by side. At 960–1100px viewport (when the left panel consumes 42% of width), the form area compresses and both columns become ~140px wide — causing placeholder text to clip.

**In `css/pages/auth.css`**, change `.auth-field-row`:

```css
/* Default: always single column */
.auth-field-row {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Only go 2-col on very wide screens where there's genuinely space */
@media (min-width: 1400px) {
  .auth-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}
```

**Verify:** At every viewport from 320px to 1600px, the password and confirm fields should stack vertically, with placeholder text always fully visible.

---

### 2.6 Fix: Auth Card Min-Width to Prevent Compression (auth.css)

**Problem:** `.auth-form-wrap` is `flex: 1` with no `min-width`. When the panel takes 42% width, the form side can compress below usable width on 960–1100px viewports.

**In `css/pages/auth.css`**, update `.auth-form-wrap`:

```css
.auth-form-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-width: clamp(340px, 50%, 600px); /* overrides the 0 above */
}
```

And update `.auth-card`:

```css
.auth-card {
  /* add to existing rule: */
  min-width: min(100%, 360px);
}
```

**Verify:** At 960px–1100px viewport with desktop panel visible, the form card should never appear compressed or have clipped text.

---

### 2.7 Fix: Landing Page — Stack CTA Buttons on Mobile (landing.css)

**Problem:** `.ld-cta-row` tries to keep "Start for free" and "Sign in →" in a row on mobile. On 375px and 390px iPhones they compress to small buttons that are hard to tap and look amateurish.

**In `css/pages/landing.css`**, inside the existing `@media (max-width: 480px)` block:

```css
@media (max-width: 480px) {
  /* Force CTAs to stack full-width */
  .ld-cta-row {
    flex-direction: column;
    width: 100%;
    align-items: stretch;
    gap: 10px;
  }

  .ld-cta-primary {
    width: 100%;
    justify-content: center;
    text-align: center;
    padding: 16px 24px;
    font-size: 15px;
    border-radius: 14px;
  }

  .ld-cta-secondary {
    width: 100%;
    justify-content: center;
    text-align: center;
    padding: 14px 24px;
    font-size: 14px;
  }
}
```

**Verify:** On 375px mobile, both CTA buttons should be full-width, stacked vertically, easy to tap, and visually balanced.

---

### 2.8 Fix: Landing Page — Chip Nav Wraps Instead of Horizontal Scroll (landing.css)

**Problem:** `.ld-chips-nav` on mobile uses `overflow-x: auto; flex-wrap: nowrap`. iOS hides the scrollbar, so the clipped chips look broken rather than scrollable.

**In `css/pages/landing.css`**, inside `@media (max-width: 480px)`:

```css
@media (max-width: 480px) {
  .ld-chips-nav {
    flex-wrap: wrap;
    overflow-x: visible;
    overflow-y: visible;
    justify-content: center;
    gap: 7px;
    padding-bottom: 0;
  }

  .ld-chip-nav {
    flex-shrink: 0;
  }
}
```

**Verify:** On mobile, all 5 feature chips should be visible without scrolling, wrapping into 2–3 rows, centered.

---

### 2.9 Fix: Landing Page — Hero Padding on Mobile (landing.css)

**Problem:** At 768px, `.ld-hero` padding `24px 16px 24px` with the nav consuming `52px` of top space makes the hero feel cramped. The visual carousel on mobile (which renders first via `order: -1`) has too little breathing room from the nav.

**In `css/pages/landing.css`**, update the `@media (max-width: 768px)` block for `.ld-hero`:

```css
@media (max-width: 768px) {
  .ld-hero {
    padding: 32px 20px 52px;
    gap: 32px;
  }
}

@media (max-width: 480px) {
  .ld-hero {
    padding: 24px 16px 44px;
    gap: 24px;
  }
}
```

**Verify:** The carousel and headline have visible breathing room from the nav bar. No content feels pressed against edges.

---

## 3. WAVE 2 — MAJOR UX IMPROVEMENTS

Do these after Wave 1 passes visual QA.

---

### 3.1 Elevate Social Login to Primary Position (login.html + signup.html)

**Problem:** "Continue with Google" and "Continue with Apple" are buried BELOW the email/password form, separated by a divider. Industry research (Notion, Vercel, Linear, Headspace) consistently shows that placing social auth FIRST reduces friction and increases signups/logins by 30–40%.

**Redesign the form order in both `login.html` and `signup.html`:**

New order inside `.auth-card`:
1. `.au-hero` (title + subtitle) — stays
2. `.auth-social` (Google + Apple buttons) — MOVE THIS UP
3. `.auth-divider` ("or continue with email") — MOVE THIS UP
4. `<form>` (email/password fields + submit) — stays, now below social
5. `.auth-bottom-link` (account link) — stays

**In `login.html`**, cut the `.auth-social` and `.auth-divider` divs from below the form and paste them immediately after `.au-hero` and before `<form>`.

**In `signup.html`**, same operation.

**Update the Google button to actually work** — in `js/pages/login.js` and `js/pages/signup.js`, add the Google sign-in handler. Firebase Google Auth is already initialized. Add:

```javascript
// In login.js and signup.js — find the Google social button and add:
document.querySelector('.auth-social-btn[aria-label*="Google"]')
  ?.addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await firebase.auth().signInWithPopup(provider);
      // Redirect handled by existing auth state listener
    } catch (err) {
      console.error('Google auth error:', err);
      // Surface error in existing #loginError / #signupError element
    }
  });
```

**Verify:** Opening login.html, the first interactive elements after the title are the Google and Apple buttons. Email/password form is below the "or continue with email" divider.

---

### 3.2 Keep "Sign In" Visible in Mobile Nav (landing.css + index.html)

**Problem:** `.ld-nav-ghost` ("Sign in") is set to `display: none` on mobile (< 768px). Returning users have no quick path to login from the landing page on mobile except scrolling past the hero.

**In `css/pages/landing.css`**, inside `@media (max-width: 768px)`:

```css
/* Remove or override the display:none on .ld-nav-ghost */
.ld-nav-ghost {
  display: inline-flex; /* was: none */
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 8px;
}
```

Also inside `@media (max-width: 480px)`:
```css
.ld-nav-ghost {
  display: none; /* Hide on smallest screens — hero CTAs are visible */
}
```

Logic: Show "Sign in" in nav on 480–768px. Hide it below 480px because the stacked CTAs in the hero provide both paths.

**Verify:** On 375px → "Sign in" is hidden in nav (hero CTAs cover it). On 540px → "Sign in" appears in nav next to "Get started".

---

### 3.3 Real-Time Password Match Validation (signup.html + js/pages/signup.js)

**Problem:** The confirm password field has zero real-time feedback. Users type, submit, get an error, have to fix and resubmit. On mobile with autocorrect this is very painful.

**In `signup.html`**, add an inline validation message element after `confirmInput`'s `.auth-input-wrap`:

```html
<!-- After the confirm password .auth-input-wrap, inside .auth-field -->
<p class="auth-field-hint auth-confirm-hint hidden" id="confirmHint"></p>
```

**In `js/pages/signup.js`**, add the real-time listener (place after the existing form element queries):

```javascript
const confirmInput = document.getElementById('confirmInput');
const passwordInput = document.getElementById('passwordInput');
const confirmHint = document.getElementById('confirmHint');

function validatePasswordMatch() {
  const pw = passwordInput.value;
  const confirm = confirmInput.value;

  if (!confirm) {
    confirmHint.classList.add('hidden');
    confirmInput.classList.remove('valid', 'error');
    return;
  }

  if (pw === confirm) {
    confirmHint.textContent = ''; // clear
    confirmInput.classList.add('valid');
    confirmInput.classList.remove('error');
    confirmHint.classList.add('hidden');
  } else {
    confirmHint.textContent = 'Passwords do not match';
    confirmHint.classList.remove('hidden');
    confirmInput.classList.add('error');
    confirmInput.classList.remove('valid');
  }
}

confirmInput.addEventListener('input', validatePasswordMatch);
passwordInput.addEventListener('input', validatePasswordMatch);
```

**In `css/pages/auth.css`**, make the hint colorize on error state:

```css
.auth-confirm-hint {
  color: #ff8080;
  font-size: 12px;
  margin-top: 4px;
}
```

**i18n note:** Add `"signup.confirm.mismatch": "Passwords do not match"` / `"Les mots de passe ne correspondent pas"` to `js/core/i18n.js` and use `data-i18n` on the hint element.

**Verify:** Type mismatched passwords → red border + "Passwords do not match" appears instantly. Fix the mismatch → green border, hint disappears.

---

### 3.4 Remove Redundant Link from Topbar Logo (login.html + signup.html)

**Problem:** Both the `au-back` chevron button AND the centered `au-logo` link navigate to `index.html`. Two elements doing the same thing = unclear affordance. Clicking the logo while mid-login is also disruptive.

**In `login.html` and `signup.html`**, change the topbar logo from `<a>` to `<div>`:

```html
<!-- FROM: -->
<a class="au-logo" href="index.html" aria-label="Hbit — go to home">

<!-- TO: -->
<div class="au-logo" aria-label="Hbit">
```

Close with `</div>` instead of `</a>`.

**In `css/pages/auth.css`**, add:

```css
.au-logo {
  cursor: default;
  /* Remove pointer cursor since it's no longer a link */
}

/* Only make it pointer in landing context if needed */
a.au-logo {
  cursor: pointer;
}
```

**Verify:** On login/signup pages, clicking the centered Hbit logo does nothing. The back-chevron still works. No console errors.

---

### 3.5 Replace Fabricated Social Proof (index.html + login.html + signup.html)

**Problem:** "Trusted by 10,000+ people", "★★★★★ 4.8", and the 4 avatar initials imply a user base that may not exist yet. This is a trust and legal risk.

**In `index.html`**, replace the social proof section. Keep the avatar visual (it's warm) but update the copy:

Find `.ld-proof-count` and `.ld-proof-stars` elements and update their content:

```html
<!-- FROM: -->
<span class="ld-proof-count">Trusted by <strong>10,000+</strong> users</span>
<span class="ld-proof-stars" aria-label="Rated 4.8 out of 5">★★★★★ <em>4.8</em></span>

<!-- TO: -->
<span class="ld-proof-count">Join the <strong>early community</strong></span>
<span class="ld-proof-stars">Free forever · No credit card</span>
```

Also update the stats row in `index.html`:

Find `.ld-stat-value[data-target="10"]` and its label:
```html
<!-- FROM: data-target="10" data-suffix="K+" -->
<!-- label: "People growing daily" -->

<!-- TO: data-target="6" data-suffix=" modules" -->
<!-- label: "Track everything that matters" -->
<!-- (reuse the modules stat visually — it's accurate) -->
```

Remove the `★★★★★ 4.8` stat entirely. Replace with a trust signal you can stand behind:
```html
<div class="ld-stat">
  <span class="ld-stat-value">100%</span>
  <span class="ld-stat-label" data-i18n="landing.stat.free.label">Free forever</span>
</div>
```

**In `signup.html`** and `login.html`, find `auth.panel.trust` i18n string ("Trusted by 10,000+ people building better habits") and update the i18n key value to: `"Join the early community of builders"` / `"Rejoignez la communauté de bâtisseurs"`.

**Update in `js/core/i18n.js`** the corresponding keys.

**Verify:** No numeric claim appears anywhere on the three screens that isn't backed by actual data.

---

### 3.6 Fix: Pills on Signup Mobile — Hide on Small Screens (signup.html + auth.css)

**Problem:** On 375px screens, the `.auth-mobile-showcase-pills` row (6 colored pill buttons) takes 2–3 lines of space, pushing the form card below the fold. Users must scroll before even seeing the form.

**In `css/pages/auth.css`**, add:

```css
@media (max-width: 420px) {
  /* Hide pills on very small screens — form should be immediately visible */
  .auth-mobile-showcase-pills {
    display: none;
  }

  /* Also hide the bottom feature strip — too much content before the form */
  .auth-mobile-bottom {
    display: none;
  }

  /* Reduce showcase section to just the headline */
  .auth-mobile-showcase {
    padding: 12px 16px 4px;
    gap: 8px;
  }
}
```

**Verify:** On 375px iPhone, open signup.html. The Hbit brand mark + a single headline is visible, then the form card starts immediately below it without any scrolling required.

---

## 4. WAVE 3 — BUILD: Post-Signup Onboarding Wizard (New File)

This is the most impactful new feature in the entire roadmap. Every top competitor (Headspace, Fabulous, Finch, Duolingo, Notion) collects user profile data in a post-signup wizard — never during signup.

**Create three new files:**
- `welcome.html`
- `css/pages/welcome.css`
- `js/pages/welcome.js`

---

### 4.1 welcome.html — Structure

The page has no nav, no footer. It's a full-screen wizard with:
- A top progress indicator (3 dots / steps)
- A centered card that transitions between steps
- A "Continue" button on each step
- A "Skip for now" text link below each button
- Optional back arrow (left) to go to previous step

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hbit — Let's personalize your experience</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="color-scheme" content="dark light" />

  <!-- Same fonts as auth pages -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" />

  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="css/pages/welcome.css" />

  <!-- Firebase -->
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>

  <script defer src="js/core/utils.js"></script>
  <script defer src="js/core/storage.js"></script>
  <script defer src="js/core/theme.js"></script>
  <script defer src="js/core/i18n.js"></script>
  <script defer src="js/core/firebase-init.js"></script>
  <script defer src="js/core/db.js"></script>
  <script defer src="js/pages/welcome.js"></script>
</head>

<body id="welcomePage">

  <!-- Ambient background — same as auth pages -->
  <div class="au-ambient au-ambient--tr" aria-hidden="true"></div>
  <div class="au-ambient au-ambient--bl" aria-hidden="true"></div>
  <div class="au-grid" aria-hidden="true"></div>

  <!-- Progress dots -->
  <header class="wl-header" aria-label="Setup progress">
    <div class="wl-brand">
      <div class="wl-brand-mark" aria-hidden="true">H</div>
      <span class="wl-brand-name">Hbit</span>
    </div>
    <div class="wl-progress" role="progressbar" aria-valuenow="1" aria-valuemin="1" aria-valuemax="3" aria-label="Step 1 of 3">
      <span class="wl-dot wl-dot--active" data-step="1"></span>
      <span class="wl-dot" data-step="2"></span>
      <span class="wl-dot" data-step="3"></span>
    </div>
    <div class="wl-header-spacer" aria-hidden="true"></div>
  </header>

  <!-- Wizard main -->
  <main class="wl-main" id="main-content">

    <!-- STEP 1: Goal selection -->
    <section class="wl-step wl-step--active" id="step1" aria-labelledby="step1-title">
      <div class="wl-card">
        <div class="wl-card-eyebrow" data-i18n="welcome.step1.eyebrow">STEP 1 OF 3</div>
        <h1 class="wl-card-title" id="step1-title" data-i18n="welcome.step1.title">
          What's your main goal?
        </h1>
        <p class="wl-card-sub" data-i18n="welcome.step1.sub">
          We'll personalize your dashboard to help you focus on what matters most.
        </p>

        <div class="wl-options" role="radiogroup" aria-labelledby="step1-title">
          <button class="wl-option" data-value="habits" type="button" role="radio" aria-checked="false">
            <span class="wl-option-icon wl-option-icon--green" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <div class="wl-option-text">
              <span class="wl-option-label" data-i18n="welcome.goal.habits">Build better habits</span>
              <span class="wl-option-desc" data-i18n="welcome.goal.habits.desc">Streaks, daily routines, accountability</span>
            </div>
            <span class="wl-option-check" aria-hidden="true"></span>
          </button>

          <button class="wl-option" data-value="sleep" type="button" role="radio" aria-checked="false">
            <span class="wl-option-icon wl-option-icon--blue" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </span>
            <div class="wl-option-text">
              <span class="wl-option-label" data-i18n="welcome.goal.sleep">Improve my sleep</span>
              <span class="wl-option-desc" data-i18n="welcome.goal.sleep.desc">Sleep cycles, bedtime, quality tracking</span>
            </div>
            <span class="wl-option-check" aria-hidden="true"></span>
          </button>

          <button class="wl-option" data-value="budget" type="button" role="radio" aria-checked="false">
            <span class="wl-option-icon wl-option-icon--amber" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </span>
            <div class="wl-option-text">
              <span class="wl-option-label" data-i18n="welcome.goal.budget">Manage my finances</span>
              <span class="wl-option-desc" data-i18n="welcome.goal.budget.desc">Budget tracking, spending insights</span>
            </div>
            <span class="wl-option-check" aria-hidden="true"></span>
          </button>

          <button class="wl-option" data-value="all" type="button" role="radio" aria-checked="false">
            <span class="wl-option-icon wl-option-icon--brand" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </span>
            <div class="wl-option-text">
              <span class="wl-option-label" data-i18n="welcome.goal.all">All of the above</span>
              <span class="wl-option-desc" data-i18n="welcome.goal.all.desc">Full dashboard — build every dimension</span>
            </div>
            <span class="wl-option-check" aria-hidden="true"></span>
          </button>
        </div>

        <button class="wl-cta" id="step1Next" type="button" disabled data-i18n="welcome.cta.next">Continue</button>
        <button class="wl-skip" id="step1Skip" type="button" data-i18n="welcome.cta.skip">Skip for now</button>
      </div>
    </section>

    <!-- STEP 2: Age range + birthday -->
    <section class="wl-step" id="step2" aria-labelledby="step2-title" aria-hidden="true">
      <div class="wl-card">
        <div class="wl-card-eyebrow" data-i18n="welcome.step2.eyebrow">STEP 2 OF 3</div>
        <h1 class="wl-card-title" id="step2-title" data-i18n="welcome.step2.title">
          Tell us about yourself
        </h1>
        <p class="wl-card-sub" data-i18n="welcome.step2.sub">
          This helps us give you age-appropriate insights. We never share this.
        </p>

        <div class="wl-fields">
          <!-- First name (pre-filled from signup if available) -->
          <div class="wl-field">
            <label class="wl-label" for="welcomeName" data-i18n="auth.field.name">First name</label>
            <div class="wl-input-wrap">
              <input class="wl-input" id="welcomeName" type="text" name="name"
                     autocomplete="given-name" placeholder="Alex"
                     data-i18n-placeholder="signup.name.ph" />
            </div>
          </div>

          <!-- Age range (select) -->
          <div class="wl-field">
            <label class="wl-label" for="welcomeAge" data-i18n="welcome.field.age">Age range</label>
            <div class="wl-select-wrap">
              <select class="wl-select" id="welcomeAge" name="age">
                <option value="" data-i18n="welcome.age.placeholder">Select your age range</option>
                <option value="under18" data-i18n="welcome.age.under18">Under 18</option>
                <option value="18-24" data-i18n="welcome.age.18_24">18–24</option>
                <option value="25-34" data-i18n="welcome.age.25_34">25–34</option>
                <option value="35-44" data-i18n="welcome.age.35_44">35–44</option>
                <option value="45-54" data-i18n="welcome.age.45_54">45–54</option>
                <option value="55plus" data-i18n="welcome.age.55plus">55 and over</option>
              </select>
              <span class="wl-select-arrow" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </div>
          </div>
        </div>

        <button class="wl-cta" id="step2Next" type="button" data-i18n="welcome.cta.next">Continue</button>
        <button class="wl-skip" id="step2Skip" type="button" data-i18n="welcome.cta.skip">Skip for now</button>
        <button class="wl-back" id="step2Back" type="button" aria-label="Go back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          <span data-i18n="welcome.cta.back">Back</span>
        </button>
      </div>
    </section>

    <!-- STEP 3: Reminder preference -->
    <section class="wl-step" id="step3" aria-labelledby="step3-title" aria-hidden="true">
      <div class="wl-card">
        <div class="wl-card-eyebrow" data-i18n="welcome.step3.eyebrow">STEP 3 OF 3</div>
        <h1 class="wl-card-title" id="step3-title" data-i18n="welcome.step3.title">
          When should we remind you?
        </h1>
        <p class="wl-card-sub" data-i18n="welcome.step3.sub">
          A gentle nudge at the right time makes all the difference. You can change this later.
        </p>

        <div class="wl-options wl-options--horizontal" role="radiogroup" aria-labelledby="step3-title">
          <button class="wl-option wl-option--compact" data-value="morning" type="button" role="radio" aria-checked="false">
            <span class="wl-option-emoji" aria-hidden="true">🌅</span>
            <span class="wl-option-label" data-i18n="welcome.reminder.morning">Morning</span>
            <span class="wl-option-desc" data-i18n="welcome.reminder.morning.time">~8:00 AM</span>
          </button>

          <button class="wl-option wl-option--compact" data-value="evening" type="button" role="radio" aria-checked="false">
            <span class="wl-option-emoji" aria-hidden="true">🌙</span>
            <span class="wl-option-label" data-i18n="welcome.reminder.evening">Evening</span>
            <span class="wl-option-desc" data-i18n="welcome.reminder.evening.time">~8:00 PM</span>
          </button>

          <button class="wl-option wl-option--compact" data-value="none" type="button" role="radio" aria-checked="false">
            <span class="wl-option-emoji" aria-hidden="true">🔕</span>
            <span class="wl-option-label" data-i18n="welcome.reminder.none">No reminders</span>
            <span class="wl-option-desc" data-i18n="welcome.reminder.none.desc">I'll check in myself</span>
          </button>
        </div>

        <button class="wl-cta wl-cta--finish" id="step3Finish" type="button" data-i18n="welcome.cta.finish">
          Go to my dashboard →
        </button>
        <button class="wl-skip" id="step3Skip" type="button" data-i18n="welcome.cta.skipAll">Skip setup</button>
        <button class="wl-back" id="step3Back" type="button" aria-label="Go back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          <span data-i18n="welcome.cta.back">Back</span>
        </button>
      </div>
    </section>

  </main>

</body>
</html>
```

---

### 4.2 welcome.js — Wizard Logic

```javascript
// js/pages/welcome.js
// Post-signup onboarding wizard — 3 steps
// Collects: goal, name, ageRange, reminderTime
// Saves to Firestore users/{uid}/profile subcollection

'use strict';

const STEPS = ['step1', 'step2', 'step3'];
let currentStep = 0;
const collected = { goal: null, name: '', ageRange: '', reminderTime: null };

// ── DOM refs ────────────────────────────────────────────────
const stepEls = STEPS.map(id => document.getElementById(id));
const dots = document.querySelectorAll('.wl-dot');

// Step 1
const step1Next = document.getElementById('step1Next');
const step1Skip = document.getElementById('step1Skip');

// Step 2
const step2Next = document.getElementById('step2Next');
const step2Skip = document.getElementById('step2Skip');
const step2Back = document.getElementById('step2Back');
const welcomeName = document.getElementById('welcomeName');
const welcomeAge = document.getElementById('welcomeAge');

// Step 3
const step3Finish = document.getElementById('step3Finish');
const step3Skip = document.getElementById('step3Skip');
const step3Back = document.getElementById('step3Back');

// ── Navigation helpers ──────────────────────────────────────
function goToStep(idx) {
  stepEls.forEach((el, i) => {
    el.classList.toggle('wl-step--active', i === idx);
    el.setAttribute('aria-hidden', i !== idx ? 'true' : 'false');
  });
  dots.forEach((dot, i) => {
    dot.classList.toggle('wl-dot--active', i <= idx);
    dot.classList.toggle('wl-dot--complete', i < idx);
  });

  // Update progress bar aria
  const progressBar = document.querySelector('.wl-progress');
  if (progressBar) progressBar.setAttribute('aria-valuenow', idx + 1);

  currentStep = idx;
}

// ── Option selection (radio-button style) ───────────────────
function initOptions(stepEl, onSelect) {
  const options = stepEl.querySelectorAll('.wl-option');
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => {
        o.classList.remove('wl-option--selected');
        o.setAttribute('aria-checked', 'false');
      });
      opt.classList.add('wl-option--selected');
      opt.setAttribute('aria-checked', 'true');
      if (onSelect) onSelect(opt.dataset.value);
    });
  });
}

// Step 1 options
initOptions(stepEls[0], (value) => {
  collected.goal = value;
  step1Next.disabled = false;
  step1Next.classList.add('wl-cta--ready');
});

// Step 3 options
initOptions(stepEls[2], (value) => {
  collected.reminderTime = value;
  step3Finish.disabled = false;
  step3Finish.classList.add('wl-cta--ready');
});

// ── Step navigation ─────────────────────────────────────────
step1Next?.addEventListener('click', () => {
  goToStep(1);
  // Pre-fill name from Firebase auth display name if available
  firebase.auth().onAuthStateChanged(user => {
    if (user?.displayName && !welcomeName.value) {
      welcomeName.value = user.displayName.split(' ')[0];
    }
  });
});

step1Skip?.addEventListener('click', () => goToStep(1));

step2Next?.addEventListener('click', () => {
  collected.name = welcomeName.value.trim();
  collected.ageRange = welcomeAge.value;
  goToStep(2);
});

step2Skip?.addEventListener('click', () => goToStep(2));
step2Back?.addEventListener('click', () => goToStep(0));

// ── Finish & save ───────────────────────────────────────────
async function finishOnboarding(skipAll = false) {
  if (!skipAll) {
    collected.reminderTime = document.querySelector('#step3 .wl-option--selected')?.dataset.value || null;
    collected.name = welcomeName.value.trim() || collected.name;
    collected.ageRange = welcomeAge.value || collected.ageRange;
  }

  try {
    const user = firebase.auth().currentUser;
    if (user) {
      // Save profile data to Firestore
      await firebase.firestore()
        .collection('users').doc(user.uid)
        .set({
          onboardingCompleted: true,
          onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp(),
          profile: {
            goal: collected.goal,
            ageRange: collected.ageRange || null,
            reminderTime: collected.reminderTime || null,
          }
        }, { merge: true });

      // Update display name if collected
      if (collected.name && !user.displayName) {
        await user.updateProfile({ displayName: collected.name });
      }
    }
  } catch (err) {
    console.warn('Could not save onboarding data:', err);
    // Non-blocking — user proceeds to dashboard regardless
  }

  window.location.href = 'home.html';
}

step3Finish?.addEventListener('click', () => finishOnboarding(false));
step3Skip?.addEventListener('click', () => finishOnboarding(true));
step3Back?.addEventListener('click', () => goToStep(1));

// ── Guard: redirect to home if already onboarded ───────────
firebase.auth().onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const doc = await firebase.firestore().collection('users').doc(user.uid).get();
    if (doc.exists && doc.data()?.onboardingCompleted) {
      window.location.href = 'home.html';
    }
  } catch (_) {
    // If check fails, let user proceed with onboarding
  }
});
```

---

### 4.3 welcome.css — Wizard Styles

```css
/* css/pages/welcome.css */
/* Post-signup onboarding wizard */
/* Reuses au-ambient, au-grid from auth.css */

#welcomePage {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  font-family: "Plus Jakarta Sans", sans-serif;
  background: var(--au-bg, #04060d);
  color: var(--au-text, rgba(255,255,255,0.94));
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ── Header ─────────────────────────────────────────────── */
.wl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.wl-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wl-brand-mark {
  width: 34px; height: 34px;
  border-radius: 10px;
  background: linear-gradient(145deg, #d13a3c, #971718);
  color: #fff;
  display: grid;
  place-items: center;
  font: 700 13px/1 "Bricolage Grotesque", sans-serif;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset,
              0 8px 20px rgba(192,41,42,0.28);
}

.wl-brand-name {
  font: 700 15px/1 "Bricolage Grotesque", sans-serif;
  letter-spacing: -0.03em;
  color: var(--au-text);
}

.wl-header-spacer {
  width: 34px; /* matches brand mark width for centering */
}

/* ── Progress dots ──────────────────────────────────────── */
.wl-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wl-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  transition: background 0.28s ease, transform 0.28s ease, width 0.28s ease;
}

.wl-dot--active {
  background: var(--au-brand, #c0292a);
  width: 24px;
  border-radius: 999px;
  transform: none;
}

.wl-dot--complete {
  background: var(--au-success, #55c28a);
  width: 8px;
  border-radius: 50%;
}

/* ── Main / Step container ──────────────────────────────── */
.wl-main {
  flex: 1;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px 48px;
}

/* Each step is absolute-ish; we use visibility + opacity */
.wl-step {
  width: 100%;
  max-width: 480px;
  display: none; /* hidden by default */
  flex-direction: column;
  align-items: center;
}

.wl-step--active {
  display: flex;
  animation: wlFadeUp 0.38s ease both;
}

@keyframes wlFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Card ─────────────────────────────────────────────── */
.wl-card {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 28px;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.058) 0%, rgba(255,255,255,0.018) 100%),
    rgba(6,8,14,0.82);
  box-shadow: 0 32px 80px rgba(0,0,0,0.42),
              inset 0 1px 0 rgba(255,255,255,0.07);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  padding: 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  overflow: hidden;
}

.wl-card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14) 50%, transparent);
  pointer-events: none;
}

/* ── Card Typography ─────────────────────────────────── */
.wl-card-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--au-brand, #c0292a);
}

.wl-card-title {
  font: 800 clamp(1.6rem, 4.5vw, 2.2rem)/1.05 "Bricolage Grotesque", sans-serif;
  letter-spacing: -0.045em;
  color: var(--au-text);
  margin: -4px 0 0;
}

.wl-card-sub {
  font-size: 15px;
  line-height: 1.65;
  color: var(--au-muted);
  max-width: 38ch;
}

/* ── Options (radio cards) ───────────────────────────── */
.wl-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wl-options--horizontal {
  flex-direction: row;
  gap: 10px;
}

.wl-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--au-text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
  position: relative;
  width: 100%;
}

.wl-option:hover {
  border-color: rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
}

.wl-option--selected {
  border-color: var(--au-brand, #c0292a);
  background: rgba(192,41,42,0.08);
  box-shadow: 0 0 0 3px rgba(192,41,42,0.12);
}

.wl-option:focus-visible {
  outline: 2px solid var(--au-brand);
  outline-offset: 2px;
}

/* Compact option variant (step 3 reminders) */
.wl-option--compact {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 6px;
  padding: 16px 12px;
  text-align: center;
}

.wl-option-icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wl-option-icon--green  { background: rgba(52,211,153,0.12); color: rgba(52,211,153,0.9); }
.wl-option-icon--blue   { background: rgba(96,165,250,0.12); color: rgba(96,165,250,0.9); }
.wl-option-icon--amber  { background: rgba(245,158,11,0.12); color: rgba(245,158,11,0.9); }
.wl-option-icon--brand  { background: rgba(192,41,42,0.12); color: #c0292a; }

.wl-option-emoji {
  font-size: 22px;
  line-height: 1;
}

.wl-option-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.wl-option-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--au-text);
}

.wl-option-desc {
  font-size: 12.5px;
  color: var(--au-muted);
  line-height: 1.4;
}

.wl-option-check {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.18);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.wl-option--selected .wl-option-check {
  border-color: var(--au-brand);
  background: var(--au-brand);
}

.wl-option--selected .wl-option-check::after {
  content: "";
  width: 6px; height: 6px;
  border-radius: 50%;
  background: white;
}

/* ── Fields (step 2) ─────────────────────────────────── */
.wl-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wl-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.wl-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--au-muted);
}

.wl-input-wrap,
.wl-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.wl-input,
.wl-select {
  width: 100%;
  height: 52px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  background: rgba(255,255,255,0.035);
  color: var(--au-text);
  font: 500 16px/1 "Plus Jakarta Sans", sans-serif;
  padding: 0 16px;
  outline: none;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
  appearance: none;
  -webkit-appearance: none;
}

.wl-input::placeholder { color: rgba(255,255,255,0.28); }

.wl-input:focus,
.wl-select:focus {
  border-color: rgba(154,28,28,0.55);
  background: rgba(255,255,255,0.05);
  box-shadow: 0 0 0 4px rgba(154,28,28,0.10);
}

.wl-select-arrow {
  position: absolute;
  right: 14px;
  pointer-events: none;
  color: rgba(255,255,255,0.38);
}

/* ── Buttons ──────────────────────────────────────────── */
.wl-cta {
  height: 54px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(180deg, #f4f8ff 0%, #d6dce8 100%);
  color: #10121a;
  font: 700 16px/1 "Plus Jakarta Sans", sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  transition: transform 0.16s, box-shadow 0.16s;
  opacity: 0.45; /* disabled state by default for step1 */
  pointer-events: none;
}

.wl-cta--ready,
.wl-cta[id="step2Next"],
.wl-cta[id="step3Finish"] {
  opacity: 1;
  pointer-events: auto;
}

.wl-cta:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(255,255,255,0.12); }
.wl-cta:active { transform: scale(0.985); }

.wl-cta--finish {
  background: linear-gradient(135deg, #d13a3c 0%, #971718 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 24px rgba(154,28,28,0.32);
  opacity: 0.45;
}

.wl-cta--finish.wl-cta--ready {
  opacity: 1;
}

.wl-skip {
  background: none;
  border: none;
  color: var(--au-subtle);
  font: 500 13px/1 "Plus Jakarta Sans", sans-serif;
  cursor: pointer;
  text-align: center;
  padding: 8px;
  transition: color 0.15s;
}

.wl-skip:hover { color: var(--au-muted); }

.wl-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--au-subtle);
  font: 500 12px/1 "Plus Jakarta Sans", sans-serif;
  cursor: pointer;
  padding: 6px 0;
  transition: color 0.15s;
  align-self: flex-start;
}

.wl-back:hover { color: var(--au-muted); }

/* ── Light theme ────────────────────────────────────── */
@media (prefers-color-scheme: light) {
  #welcomePage { background: #f0ece5; }
  .wl-card {
    background: linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.82) 100%);
    border-color: rgba(0,0,0,0.07);
    box-shadow: 0 24px 60px rgba(60,40,20,0.10);
  }
}

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 540px) {
  .wl-header { padding: 14px 16px; }
  .wl-main { padding: 8px 14px 32px; }
  .wl-card { padding: 24px 20px; border-radius: 22px; gap: 16px; }
  .wl-card-title { font-size: 1.5rem; }
  .wl-options--horizontal { flex-direction: column; }
  .wl-option--compact { flex-direction: row; justify-content: flex-start; text-align: left; }
}
```

---

### 4.4 Redirect to welcome.html After Successful Signup

**In `js/pages/signup.js`**, find where successful signup redirects (look for `window.location.href = 'home.html'` or similar Firebase `onAuthStateChanged` redirect):

Change the post-signup redirect from `home.html` to `welcome.html`:

```javascript
// After successful account creation, redirect to onboarding wizard
// BEFORE (wherever successful signup redirects):
window.location.href = 'home.html';

// AFTER:
window.location.href = 'welcome.html';
```

Also add a check in `home.html`'s JS: if `onboardingCompleted !== true` in Firestore, redirect to `welcome.html`. This catches edge cases.

---

## 5. WAVE 4 — FINAL POLISH (10/10 Details)

After Waves 1–3 are complete and tested, apply these finishing touches.

---

### 5.1 Topbar Logo on Auth Pages — Convert to Static Brand (no nav affordance)

**In `login.html` and `signup.html`**: The topbar centered element should be a visual brand mark only, not a navigation link. See Wave 2, item 3.4 — convert `<a class="au-logo">` to `<div class="au-logo">`. Add `role="img"` and `aria-label="Hbit"`.

---

### 5.2 Auth Page Title Clamp on Small Screens

**In `css/pages/auth.css`**, update the mobile override for `.au-title`:

```css
@media (max-width: 540px) {
  .au-title {
    font-size: clamp(1.45rem, 7vw, 1.85rem);
    line-height: 1.08;
    letter-spacing: -0.04em;
  }
}

@media (max-width: 360px) {
  .au-title {
    font-size: 1.35rem;
  }
}
```

---

### 5.3 Micro-Interaction: Input Focus Ring Enhancement

**In `css/pages/auth.css`**, enhance the focus state for a more premium feel:

```css
.auth-input:focus {
  border-color: rgba(154, 28, 28, 0.60);
  background: rgba(255, 255, 255, 0.055);
  box-shadow: 0 0 0 4px rgba(154, 28, 28, 0.10),
              0 1px 3px rgba(0, 0, 0, 0.12);
  /* Add: */
  outline: none;
  transform: none; /* prevent any accidental layout shift */
}
```

---

### 5.4 Submit Button Loading State — Add Disabled Styles

**In `css/pages/auth.css`**, ensure the loading state is visually clear:

```css
.auth-submit-btn.loading,
.auth-submit-btn[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}
```

---

### 5.5 Landing Page — Hero Mobile Padding Tweak (480px)

```css
@media (max-width: 480px) {
  .ld-hero {
    padding: 20px 16px 36px;
    gap: 20px;
  }

  .ld-hero-left { gap: 16px; }

  .ld-h1 {
    font-size: clamp(24px, 8vw, 36px);
    line-height: 1.05;
  }

  .ld-sub {
    font-size: 14px;
    max-width: 100%;
  }
}
```

---

## 6. i18n — NEW KEYS TO ADD

Add all of these to `js/core/i18n.js` under both `en` and `fr` objects:

```javascript
// English additions:
"welcome.step1.eyebrow": "STEP 1 OF 3",
"welcome.step1.title": "What's your main goal?",
"welcome.step1.sub": "We'll personalize your dashboard to focus on what matters most.",
"welcome.step2.eyebrow": "STEP 2 OF 3",
"welcome.step2.title": "Tell us about yourself",
"welcome.step2.sub": "This helps us give you age-appropriate insights. We never share this.",
"welcome.step3.eyebrow": "STEP 3 OF 3",
"welcome.step3.title": "When should we remind you?",
"welcome.step3.sub": "A gentle nudge at the right time makes all the difference.",
"welcome.goal.habits": "Build better habits",
"welcome.goal.habits.desc": "Streaks, daily routines, accountability",
"welcome.goal.sleep": "Improve my sleep",
"welcome.goal.sleep.desc": "Sleep cycles, bedtime, quality tracking",
"welcome.goal.budget": "Manage my finances",
"welcome.goal.budget.desc": "Budget tracking, spending insights",
"welcome.goal.all": "All of the above",
"welcome.goal.all.desc": "Full dashboard — build every dimension",
"welcome.field.age": "Age range",
"welcome.age.placeholder": "Select your age range",
"welcome.age.under18": "Under 18",
"welcome.age.18_24": "18–24",
"welcome.age.25_34": "25–34",
"welcome.age.35_44": "35–44",
"welcome.age.45_54": "45–54",
"welcome.age.55plus": "55 and over",
"welcome.reminder.morning": "Morning",
"welcome.reminder.morning.time": "~8:00 AM",
"welcome.reminder.evening": "Evening",
"welcome.reminder.evening.time": "~8:00 PM",
"welcome.reminder.none": "No reminders",
"welcome.reminder.none.desc": "I'll check in myself",
"welcome.cta.next": "Continue",
"welcome.cta.skip": "Skip for now",
"welcome.cta.back": "Back",
"welcome.cta.finish": "Go to my dashboard →",
"welcome.cta.skipAll": "Skip setup",
"signup.confirm.mismatch": "Passwords do not match",
"auth.panel.trust": "Join the early community of builders",

// French additions (same keys, French values):
"welcome.step1.eyebrow": "ÉTAPE 1 SUR 3",
"welcome.step1.title": "Quel est ton objectif principal ?",
"welcome.step1.sub": "Nous personnalisons ton tableau de bord pour te concentrer sur l'essentiel.",
"welcome.step2.eyebrow": "ÉTAPE 2 SUR 3",
"welcome.step2.title": "Parle-nous de toi",
"welcome.step2.sub": "Cela nous aide à personnaliser tes insights. Nous ne partageons jamais ces données.",
"welcome.step3.eyebrow": "ÉTAPE 3 SUR 3",
"welcome.step3.title": "Quand veux-tu être rappelé ?",
"welcome.step3.sub": "Un petit rappel au bon moment fait toute la différence.",
"welcome.goal.habits": "Construire de meilleures habitudes",
"welcome.goal.habits.desc": "Séries, routines quotidiennes, responsabilité",
"welcome.goal.sleep": "Améliorer mon sommeil",
"welcome.goal.sleep.desc": "Cycles de sommeil, heure du coucher, qualité",
"welcome.goal.budget": "Gérer mes finances",
"welcome.goal.budget.desc": "Suivi du budget, aperçus des dépenses",
"welcome.goal.all": "Tout ce qui précède",
"welcome.goal.all.desc": "Tableau de bord complet — développer chaque dimension",
"welcome.field.age": "Tranche d'âge",
"welcome.age.placeholder": "Sélectionne ta tranche d'âge",
"welcome.age.under18": "Moins de 18 ans",
"welcome.age.18_24": "18–24 ans",
"welcome.age.25_34": "25–34 ans",
"welcome.age.35_44": "35–44 ans",
"welcome.age.45_54": "45–54 ans",
"welcome.age.55plus": "55 ans et plus",
"welcome.reminder.morning": "Matin",
"welcome.reminder.morning.time": "~8h00",
"welcome.reminder.evening": "Soir",
"welcome.reminder.evening.time": "~20h00",
"welcome.reminder.none": "Pas de rappels",
"welcome.reminder.none.desc": "Je me connecterai moi-même",
"welcome.cta.next": "Continuer",
"welcome.cta.skip": "Passer pour l'instant",
"welcome.cta.back": "Retour",
"welcome.cta.finish": "Aller à mon tableau de bord →",
"welcome.cta.skipAll": "Passer la configuration",
"signup.confirm.mismatch": "Les mots de passe ne correspondent pas",
"auth.panel.trust": "Rejoignez la communauté des bâtisseurs",
```

---

## 7. QA CHECKLIST — Verify Every Fix Before Done

Run through this checklist on actual mobile devices or browser DevTools at 375px, 390px, 480px, 768px, 960px, 1280px:

### Mobile (375px iPhone)
- [ ] Landing: Logo visible once in nav. "Start for free" full-width button. "Sign in" text link below it. All 5 chips visible in 2-row grid (no horizontal scroll). Hero has breathing room from nav.
- [ ] Login: ONE Hbit logo (in mobile showcase). "Welcome back" headline centered. Google + Apple buttons at top of card. Email/password below. All text horizontally centered. Inputs 52px tall, 16px font (no iOS zoom on tap).
- [ ] Signup: ONE Hbit logo. "Create your account" centered. No pills visible on 375px (collapsed). Google + Apple first. Password and confirm stacked. Real-time mismatch indicator.
- [ ] Welcome: One logo top-left. 3 progress dots centered at top. Card fills width. All option buttons full-width. Step transitions animate. "Go to dashboard" saves to Firestore.

### Tablet (768px)
- [ ] Landing: "Sign in" visible in nav. Hero single-column with carousel above. Chips visible.
- [ ] Login/Signup: Left panel hidden. Form centered. All fixes from mobile apply.

### Desktop (1024px+)
- [ ] Landing: 2-column hero. Left panel visible (habits/sleep/budget/mood carousel right side).
- [ ] Login: Left panel visible (motivational rows + quote). Form on right. No text clipping.
- [ ] Signup: Left panel visible (module cards). Password + confirm single-column (or 2-col at 1400px+). No text clipping.

### Cross-browser
- [ ] Safari iOS: No input zoom on focus (font-size: 16px confirmed)
- [ ] Chrome Android: Touch targets all ≥48px
- [ ] Firefox Desktop: Glass card and backdrop-filter render correctly
- [ ] Chrome Desktop: All animations smooth

### Accessibility
- [ ] Tab navigation flows logically through all interactive elements
- [ ] All form inputs have visible labels
- [ ] Error messages have `role="alert"` and `aria-live="polite"`
- [ ] Progress bar has `role="progressbar"` with aria-valuenow/min/max
- [ ] Buttons are not `<div>` or `<span>` — real `<button>` elements used
- [ ] Color is not the only indicator of state (check the error state, valid state)

---

## 8. FILES CHANGED SUMMARY

| File | Type of Change |
|---|---|
| `css/pages/auth.css` | Bug fixes: 8 additions/modifications to media queries and rules |
| `css/pages/landing.css` | Bug fixes: 5 additions/modifications to media queries |
| `login.html` | Structural: social login moved up, logo converted to div |
| `signup.html` | Structural: social login moved up, logo converted to div, confirm hint added |
| `index.html` | Copy: social proof numbers updated to honest values |
| `js/pages/login.js` | Feature: Google auth handler wired up |
| `js/pages/signup.js` | Feature: Google auth, real-time confirm validation, redirect to welcome.html |
| `js/core/i18n.js` | Copy: ~30 new keys added in EN + FR |
| `welcome.html` | **NEW FILE** — 3-step onboarding wizard |
| `css/pages/welcome.css` | **NEW FILE** — full styles for wizard |
| `js/pages/welcome.js` | **NEW FILE** — wizard logic + Firestore save |

---

*Prompt prepared by Claude | April 11, 2026*
*Based on full audit of Hbit codebase + competitor analysis of Habitify, Headspace, Fabulous, Finch, Linear, Vercel, Loom, Notion, Calm*
*Design references: AUDIT-LANDING-LOGIN-SIGNUP.md*
