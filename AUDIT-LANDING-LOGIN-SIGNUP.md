# Hbit — Full Design Audit: Landing · Login · Signup
### Score Today: 5.5/10 → Target: 10/10
**Audit Date:** April 11, 2026 | **Scope:** index.html, login.html, signup.html + all CSS

---

## Part 1 — Competitor Landscape & What's Working in 2025–26

Before fixing bugs, you need to understand where the bar is. Here's what the best apps in your space are doing.

### 1A. Direct Competitors

| App | Strengths | Auth Screen Design | What to steal |
|---|---|---|---|
| **Habitify** | Cross-platform, deep analytics, clean minimal UI | Single logo, centered form, no clutter, system font respect | Time-of-day grouping, clean single-column mobile |
| **Fabulous** | Science-backed, premium feel | Full-bleed gradient splash, ONE logo, large CTA | Emotional headline copy, progressive onboarding |
| **Headspace** | Emotional design, calm UX | Soft colors, rounded inputs, NO split-screen on mobile | Breathing room, minimal fields, friendly microcopy |
| **Finch** | Gentle brand, zero punishment | Illustrated hero, warm colors | Progressive profile collection after signup |
| **Streaks** | Cleanest visuals in category | Apple-native, system components | Perfect tap targets, haptics, zero-redundancy |
| **Notion** | Aesthetic flexibility, power users | Minimal centered login, social login prominent | "Continue with Google" as #1 CTA, email below |

### 1B. Design-Leader Reference (outside category)

| Company | Landing Page Strength | Auth Screen Strength |
|---|---|---|
| **Linear** | Bold centered headline, product screenshot as hero visual, no filler text | Single card, no panel, token-perfect spacing |
| **Vercel** | Sub-3 word value prop, instant CTA visibility, zero nav clutter on mobile | GitHub social login as primary, email as fallback |
| **Loom** | Video-first hero, social proof inline with hero, trust built without testimonials section | Clean split on desktop, pure single col on mobile |
| **Superhuman** | Scarcity + exclusivity in copy, email-first capture | Minimal, zero decoration, max contrast |
| **Calm** | Full-screen background visual, ONE headline, breathing animation | Single centered card, logo once, very large inputs |

### 1C. The 5 Patterns That Work Everywhere in 2025

1. **One logo, one place.** In the auth topbar or in the card — never both.
2. **Mobile = single column, full width, no side panel.** The left panel is a desktop-only feature and must vanish completely on mobile.
3. **Social login first.** "Continue with Google" above the email form, or at minimum equally prominent. Reduces friction by 40%+.
4. **Progressive profile collection.** Don't ask for name + email + password + confirm + DOB all at once. Collect essentials at signup, collect profile data (age, goals, preferences) in a post-signup onboarding flow.
5. **Inputs that breathe.** 52–56px height, 16px font (never smaller — iOS auto-zooms below 16px), full width on mobile, generous padding.

---

## Part 2 — Bug-by-Bug Audit of Your 3 Screens

### 2A. login.html — 7 Problems Found

---

**BUG #1 — CRITICAL: Logo appears twice on mobile**

**What's happening:** The `au-topbar` has `.au-logo` (Hbit mark + name), AND the `.auth-mobile-showcase` section below it has `.auth-mobile-showcase-brand` (another Hbit mark + name). On mobile, both are visible simultaneously. This is the #1 unprofessional issue you spotted.

**Root cause in code:**
```html
<!-- In au-topbar (always visible) -->
<a class="au-logo" href="index.html">
  <div class="au-logo-mark">H</div>
  <span class="au-logo-name">Hbit</span>
</a>

<!-- In auth-mobile-showcase (visible on mobile) -->
<div class="auth-mobile-showcase-brand">
  <div class="auth-mobile-showcase-mark">H</div>
  <span class="auth-mobile-showcase-name">Hbit</span>
</div>
```

**Fix:** Remove `.au-logo` from the topbar entirely on mobile (hide it with CSS), OR remove the logo from `.auth-mobile-showcase-brand` and just keep the headline. The logo in the topbar is enough — the mobile showcase should lead with the motivational headline directly, no logo.

```css
/* Add to auth.css — hide topbar logo on mobile */
@media (max-width: 959px) {
  .au-logo { display: none; }
}
```

---

**BUG #2 — CRITICAL: Mobile text alignment — content drifts left/right**

**What's happening:** `.au-wrap` has `max-width: 500px` but no explicit `text-align: center` for mobile. The `.auth-mobile-showcase` headline sits left-aligned because the flex container doesn't center text on small viewports. The form card itself is fine, but the showcase section above it looks unbalanced.

**Root cause:** `.auth-mobile-showcase` uses `flex-direction: column` but is missing `align-items: center` and `text-align: center` as defaults.

**Fix:**
```css
@media (max-width: 959px) {
  .auth-mobile-showcase {
    align-items: center;
    text-align: center;
    padding: 20px 16px;
  }
  .auth-mobile-showcase-headline {
    text-align: center;
    margin: 0 auto;
  }
}
```

---

**BUG #3 — MAJOR: Desktop input fields — text is cut off**

**What's happening:** `.auth-input` has `height: 50px` with `padding: 0 14px 0 44px`. On desktop at certain viewport widths (900–1100px), the `.auth-card` is constrained inside `.auth-form-wrap` which is `flex: 1` inside the split-screen. When the panel takes up 42% of width, the remaining form area can compress the card below 380px, making the placeholder text clip on the right.

**Fix:** Set a proper `min-width` on `.auth-form-wrap` and ensure the input never goes below a comfortable reading width:
```css
.auth-form-wrap { min-width: 400px; }
.auth-card { min-width: 320px; }
.auth-input { 
  min-width: 0;          /* already set but confirm */
  font-size: 16px;       /* CRITICAL: prevents iOS zoom AND improves readability */
}
```

---

**BUG #4 — MAJOR: No user profile data collection**

**What's happening:** The signup form only collects name, email, and password. For a personal growth app tracking habits, sleep, mood, budget — you need age, timezone, and goals to personalize the experience. This is confirmed missing by your own observation.

**Fix (two-step approach — industry standard):**
- **Step 1 (signup.html):** Keep as-is — name, email, password only.
- **Step 2 (welcome.html or post-signup onboarding):** Add a 2–3 step wizard collecting:
  - Birthday / Age range (for personalization)
  - Primary goal (Build habits / Improve sleep / Manage budget / All)
  - Reminder preference (morning / evening / none)
  - Timezone (auto-detected, but confirmable)

This is exactly what Fabulous, Headspace, and Finch all do. Never gate the account creation behind profile data — you lose 30–60% of signups.

---

**BUG #5 — MODERATE: The "back" button and logo both link to index.html — redundant navigation**

The `au-back` chevron and `au-logo` both navigate to `index.html`. The back button is semantically correct. The centered logo should NOT be a link in the topbar on auth pages — it creates a confusing affordance where clicking the logo abandons your login attempt.

**Fix:** Remove `href` from `.au-logo` on auth pages, or make it a `<div>` instead of `<a>`.

---

**BUG #6 — MODERATE: Password/Confirm fields in 2-column grid on signup — breaks on mid-range screens**

**What's happening:** `.auth-field-row` uses `grid-template-columns: 1fr 1fr`. This is fine on wide desktop but on 960–1100px (when the panel eats up 42%), the two password columns become very narrow (~140px each). Placeholder text "At least 8 chars" and "Repeat password" clips badly.

**Fix:** Stack password fields always — put them in a single column. Only collapse to 2-col on very wide screens (1280px+).
```css
.auth-field-row { grid-template-columns: 1fr; }
@media (min-width: 1280px) {
  .auth-field-row { grid-template-columns: 1fr 1fr; }
}
```

---

**BUG #7 — MINOR: The `au-title` font is too large on mobile at 1.85rem**

`clamp(2rem, 5vw, 2.7rem)` is overridden to `1.85rem` on mobile, but on a 320px iPhone SE screen this still pushes the "Welcome back" or "Create your account" onto 2 lines that don't look intentional. The card feels cramped.

**Fix:** `clamp(1.5rem, 5vw, 2.2rem)` with `line-height: 1.05` gives more breathing room.

---

### 2B. index.html (Landing Page) — 5 Problems Found

---

**BUG #1 — CRITICAL: Mobile hero layout — carousel visual and chip nav overflow**

**What's happening:** `.ld-chips-nav` on mobile uses `overflow-x: auto; flex-wrap: nowrap` which creates a horizontal scroll. On iOS, this scroll is invisible (no scrollbar visible) and users don't discover it. The chips appear cut off at the right edge, making it look broken.

**Fix:** On mobile (< 480px), show chips in 2-row wrap instead of horizontal scroll:
```css
@media (max-width: 480px) {
  .ld-chips-nav {
    flex-wrap: wrap;
    overflow: visible;
    justify-content: center;
    gap: 6px;
  }
  .ld-chip-nav { flex-shrink: 0; }
}
```

---

**BUG #2 — CRITICAL: CTA row on mobile — buttons stack but gap is too tight**

The `.ld-cta-row` has 2 CTAs ("Start for free" + "Sign in →"). At 480px these should stack vertically with `width: 100%` but the CSS doesn't enforce this — they try to stay in a row, creating two compressed buttons that are hard to tap.

**Fix:**
```css
@media (max-width: 480px) {
  .ld-cta-row { flex-direction: column; width: 100%; }
  .ld-cta-primary, .ld-cta-secondary { width: 100%; justify-content: center; }
}
```

---

**BUG #3 — MAJOR: No hamburger/mobile nav menu**

The `.ld-nav` hides `.ld-nav-ghost` ("Sign in") on mobile (< 768px) and keeps only "Get started". This means there's no way to reach Sign In from the landing page on mobile except by scrolling down to the hero CTAs. This hurts returning users on mobile significantly.

**Fix:** Add a minimal hamburger that reveals a small overlay with "Sign in" and "Get started". OR simply keep both nav buttons visible on mobile and shrink them:
```css
/* Keep Sign in visible on mobile — just smaller */
@media (max-width: 768px) {
  .ld-nav-ghost { 
    display: inline-flex;  /* override the display:none */
    padding: 6px 12px;
    font-size: 12px;
  }
}
```

---

**BUG #4 — MAJOR: Social proof numbers ("10,000+ users", "★★★★★ 4.8") are fabricated**

From a trust and legal standpoint, claiming 10,000+ users and a 4.8 star rating without actual backing is a risk. Top competitors (Linear, Notion early days) used vaguer trust signals until they had real numbers.

**Fix options:**
- Replace with "Join early builders" + a wait-list number you actually have
- Remove star rating, keep "Trusted by early adopters" without a number
- Or earn the number and add a real source

---

**BUG #5 — MINOR: `ld-hero` padding on mobile is too tight**

At 768px, `padding: 24px 16px 24px` with the nav taking `52px` means the hero content starts nearly touching the nav. The visual breathes, but with the carousel on top (mobile: carousel is first via `order: -1`) and then the copy below, the whole section feels compressed.

**Fix:** Increase bottom padding and add more gap between carousel and copy on mobile:
```css
@media (max-width: 768px) {
  .ld-hero { padding: 32px 20px 40px; gap: 28px; }
}
```

---

### 2C. signup.html — 4 Additional Problems

---

**BUG #1 — CRITICAL: Same double-logo issue as login** — Same fix applies (hide `.au-logo` in topbar on mobile, keep only the mobile-showcase brand mark).

---

**BUG #2 — MAJOR: Module pills on mobile showcase have no spacing from card**

The `.auth-mobile-showcase-pills` row sits directly above the `.auth-card` with only the `gap: 22px` from `.au-wrap`. On 375px screens, the pills row takes 2–3 lines and the whole page requires scrolling before even seeing the form. Users abandon.

**Fix:** Collapse the pill showcase on very small screens (< 400px) to just the headline, hide the pills:
```css
@media (max-width: 400px) {
  .auth-mobile-showcase-pills { display: none; }
  .auth-mobile-bottom { display: none; }
}
```

---

**BUG #3 — MAJOR: No password confirmation field visible cue when mismatch**

The `confirmInput` has no inline real-time validation feedback. Users only discover a mismatch after clicking "Create my account" — this is a UX failure on mobile where typos are common.

**Fix:** Add real-time `input` event listener that shows ✓ or ✗ next to the confirm field as the user types.

---

**BUG #4 — MINOR: The "Trusted by 10,000+ people" claim appears on the left panel (desktop) AND in the mobile bottom strip — same fabrication concern as landing page.**

---

## Part 3 — The 10/10 Vision: What Each Screen Should Feel Like

### Landing Page (index.html)
**Reference:** Linear.app + Fabulous.app + Headspace.com

The hero should land in under 1 second emotionally. On desktop: two-column, left-side copy with bold headline, right-side product carousel — which you already have and it's good. On mobile: carousel first (you have this), then a clean centered headline, then ONE big primary CTA ("Start for free — it's free") and a text link for Sign in below it (not a button — reduces visual weight). The chip nav wraps to 2 rows instead of scrolling horizontally. Social proof is a simple "Join 500+ people" (honest number) rather than 10K.

### Login (login.html)
**Reference:** Notion + Vercel + Calm

One logo — in the topbar. No mobile showcase brand mark. "Welcome back" headline in the card, large and centered. Inputs at 52px height, 16px font, full-width. "Continue with Google" button as the FIRST element (above the divider, not below). Email / password below. "Forgot password?" stays. Zero redundancy. On mobile: pure single column, everything centered, breathing room between elements. The left panel (desktop only) stays exactly as-is — it's well-designed.

### Signup (signup.html)
**Reference:** Headspace onboarding + Fabulous

Step 1 (this page): Name, Email, Password only. No confirm field (use real-time inline validation instead). "Continue with Google" as the primary CTA. Step 2 (new welcome.html): Collect age range, primary goal, reminder time — presented as 3 delightful screens with progress dots. This is what every top wellness and productivity app does in 2025–26.

---

## Part 4 — Priority Fix Roadmap

### 🔴 Wave 1 — Fix Today (Breaks professionalism)
1. Remove duplicate logo on mobile (login + signup) — 10 min CSS change
2. Center the mobile showcase text (login + signup) — 5 min CSS change
3. Fix input `font-size: 16px` to prevent iOS zoom — 2 min CSS change
4. Stack CTA buttons full-width on mobile (landing) — 5 min CSS change
5. Fix `auth-field-row` password columns — always single column — 3 min CSS change

### 🟡 Wave 2 — Fix This Week (Major UX)
1. Move social login buttons ABOVE the email/password form on both auth pages
2. Add hamburger or keep "Sign in" visible in mobile nav on landing page
3. Add real-time password match validation (confirm field)
4. Fix horizontal chip overflow on landing page mobile
5. Replace fabricated social proof numbers with honest numbers

### 🟢 Wave 3 — Build Next (10/10 Polish)
1. Build welcome.html — post-signup onboarding wizard (age, goal, reminders, timezone)
2. Add "Continue with Google" as PRIMARY auth method (move it above the form)
3. Remove `href` from topbar logo on auth pages (or convert to `<div>`)
4. Add page transition animations between login ↔ signup (you have the JS file — use it more)
5. Add subtle haptic-equivalent feedback (CSS micro-animations on input focus, button press)

---

## Part 5 — Exact CSS/HTML Prompt to Give Your Developer (or Claude)

Use this as your implementation brief:

```
HBIT AUTH + LANDING RESPONSIVE FIX — IMPLEMENTATION BRIEF

FILES: css/pages/auth.css, css/pages/landing.css, login.html, signup.html, index.html

--- AUTH FIXES (login.html + signup.html) ---

1. DUPLICATE LOGO: In auth.css, inside @media (max-width: 959px):
   Add: .au-logo { display: none; }
   This hides the topbar logo on mobile — the mobile-showcase-brand is enough.
   On login.html, remove the entire <div class="auth-mobile-showcase-brand"> block
   and instead show just the headline directly: the logo in the topbar is the brand.

2. MOBILE TEXT CENTERING: Add to auth.css @media (max-width: 959px):
   .auth-mobile-showcase { align-items: center; text-align: center; }
   .auth-mobile-showcase-headline { text-align: center; max-width: 280px; margin: 0 auto; }
   .auth-mobile-bottom-inner { text-align: center; }
   .auth-mobile-feat { justify-content: center; }

3. INPUT FONT SIZE: In .auth-input rule:
   Change font: 500 15px/1 to font: 500 16px/1
   This prevents iOS from zooming in on inputs (16px is the iOS minimum).

4. INPUT HEIGHT MOBILE: In @media (max-width: 540px):
   Add: .auth-input, .auth-submit-btn, .auth-social-btn { height: 52px; }
   52px gives better thumb tap targets on mobile.

5. PASSWORD COLUMN FIX: Change .auth-field-row:
   Default: grid-template-columns: 1fr; (always single column)
   Only use 1fr 1fr at @media (min-width: 1440px) for very wide screens.

6. TOPBAR LOGO AS NON-LINK: In login.html and signup.html, change:
   <a class="au-logo" href="index.html"> to <div class="au-logo">
   Add cursor: default to .au-logo in auth.css
   The back button (chevron) already handles going home.

7. AUTH-CARD MIN-WIDTH: Add to .auth-form-wrap:
   min-width: min(100%, 420px);
   This prevents the form compressing too narrow on mid-range desktop.

--- LANDING PAGE FIXES (index.html + landing.css) ---

8. CHIP NAV MOBILE WRAP: In @media (max-width: 480px):
   .ld-chips-nav { flex-wrap: wrap; overflow: visible; justify-content: center; }
   This shows all chips in a 2-row grid instead of a hidden horizontal scroll.

9. CTA STACKING: In @media (max-width: 480px):
   .ld-cta-row { flex-direction: column; width: 100%; gap: 10px; }
   .ld-cta-primary, .ld-cta-secondary { width: 100%; justify-content: center; text-align: center; }

10. MOBILE NAV SIGN IN: In @media (max-width: 768px):
    Remove or override: .ld-nav-ghost { display: none; }
    Replace with: .ld-nav-ghost { display: inline-flex; padding: 6px 10px; font-size: 12px; }
    Keep "Sign in" visible in mobile nav — returning users need it.

11. HERO MOBILE PADDING: In @media (max-width: 768px):
    .ld-hero { padding: 32px 20px 48px; gap: 32px; }
    More breathing room between carousel and copy.
```

---

## Part 6 — What's Already Working Well (Keep It)

- **Design tokens and color system** — Your CSS variable structure is excellent. The dark/light theme switching is well-implemented.
- **Left panel on desktop** — The split-screen panel on login is genuinely premium. The motivational rows, quote, and glow effects are better than most competitors.
- **Glass card styling** — `backdrop-filter: blur(28px)` with the subtle `inset` gradient gives a premium depth that Headspace and Calm would envy.
- **Ambient background system** — The `au-ambient` glow orbs with `radial-gradient` are sophisticated and match Linear/Vercel's aesthetic.
- **Password strength bar** — Real-time strength feedback is a UX best practice that many competitors miss.
- **Social proof chip row on landing** — The mini avatars with overlapping circles is a proven pattern that adds warmth.
- **The grid overlay** — The `56px 56px` grid with mask fade is a beautiful detail. Don't remove it.
- **i18n system** — Bilingual EN/FR from the start is a real competitive advantage. Keep it.
- **Accessibility skip-link** — You have `<a href="#main-content" class="skip-link">` — most apps don't bother.
- **The carousel on landing** — SVG-illustrated feature slides with smooth transitions is above average for a solo project.

---

## Summary Score Card

| Area | Current | Target | Key Fix |
|---|---|---|---|
| Mobile centering/alignment | 4/10 | 10/10 | CSS text-align + align-items |
| Logo duplication | 2/10 | 10/10 | Hide topbar logo on mobile |
| Input sizing & UX | 6/10 | 10/10 | 16px font, 52px height |
| Desktop layout | 7/10 | 10/10 | Fix card min-width compression |
| Profile data collection | 2/10 | 10/10 | Build post-signup onboarding wizard |
| Landing mobile | 5/10 | 10/10 | Fix chip wrap + CTA stack + nav |
| Social proof credibility | 3/10 | 10/10 | Use honest/real numbers |
| What's already great | 8/10 | — | Design tokens, glass card, panel |

**Overall today: 5.5/10. After Wave 1 fixes: 7.5/10. After Wave 2: 9/10. After Wave 3: 10/10.**

---

*Audit by Claude | April 11, 2026*
*Competitor research: Habitify, Headspace, Fabulous, Finch, Streaks, Calm, Linear, Vercel, Loom*
