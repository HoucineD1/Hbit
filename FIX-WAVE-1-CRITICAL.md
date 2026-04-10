# Hbit — Fix Wave 1: Critical (P0)

Run `/frontend-design` first to load the Hbit design context. If `.impeccable.md` doesn't exist, create it using this context:
- App: Hbit — all-in-one personal growth dashboard (Habits, Sleep, Mood, Budget, Focus, Plan)
- Stack: Vanilla HTML/CSS/JS + Firebase (Auth + Firestore), no framework, no build tools
- Brand: `#E63946` red, dark theme default, bilingual EN/FR
- Audience: 18–35, mobile-first, personal coach feel — warm and modern, not clinical
- Design tokens: `css/core/tokens.css`

Then execute ALL of the following fixes in order. Do not stop between steps. Confirm each fix is complete before moving to the next.

---

## Fix 1 — i18n Interpolation Bug (BROKEN on every page)

**File:** `js/core/i18n.js`

The `t()` function returns raw translation strings without replacing dynamic placeholders. Variables like `{n}`, `{amount}`, `{score}`, `{name}`, `{count}`, `{percent}` are rendered literally in the UI.

**What to do:**
1. Read `js/core/i18n.js` in full
2. Find the `t()` function (or equivalent translation lookup function)
3. Add interpolation support: after retrieving the translation string, apply `str.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? \`{${key}}\`)`
4. The function signature should accept an optional second argument: `t(key, params = {})`
5. Read the French translation file (likely `js/core/i18n.js` or a separate `locales/fr.js` / `translations/fr.js` — find it by searching the codebase) and verify that at least 5 keys using `{n}`, `{amount}`, or `{score}` now resolve correctly in both EN and FR
6. Test the fix by tracing 3 representative keys through the function mentally and confirming the output

**Run `/harden`** after the fix to verify no regressions in i18n coverage.

---

## Fix 2 — Sidebar Deduplication via JS Injection

**Affected files:** `home.html`, `habits.html`, `sleep.html`, `mood.html`, `budget.html`, `focus.html`, `plan.html`, `profile.html`, `budget.html` (all 9 app pages)

The entire `<nav class="sb">` element (100+ lines) is copy-pasted into all 9 pages. Any nav change requires editing 9 files.

**What to do:**
1. Read the sidebar HTML from `home.html` — extract the complete `<nav class="sb">...</nav>` block
2. Create a new file `js/core/sidebar.js`:
   - Define the sidebar HTML as a template literal string
   - On `DOMContentLoaded`, find `document.querySelector('nav.sb')` or inject before `<main>` if not found
   - Replace the existing nav element's `innerHTML` with the template, OR inject the full nav if the page has a placeholder `<nav class="sb"></nav>`
   - Preserve the `data-page` active state logic: read the current page filename and apply `aria-current="page"` to the correct nav item
   - Preserve all existing ARIA attributes, keyboard shortcuts (Escape, Ctrl+B), and swipe gesture logic that currently lives in `js/core/nav.js`
3. In all 9 app pages, replace the full `<nav class="sb">...</nav>` block with a minimal placeholder: `<nav class="sb" aria-label="Main navigation"></nav>`
4. Add `<script src="js/core/sidebar.js"></script>` to each of the 9 pages (before the closing `</body>`)
5. Verify the sidebar renders correctly and active state highlights the correct page on: home, habits, sleep, focus

---

## Fix 3 — Loading / Skeleton States on All App Pages

**Affected files:** `home.html`, `home.css`, `home.js`, `habits.html`, `habits.css`, `habits.js`, `budget.html`, `budget.css`, `budget.js`, `sleep.html`, `sleep.css`, `sleep.js`, `mood.html`, `mood.css`, `mood.js`, `focus.html`, `plan.html`, `plan.js`

When Firebase data is loading, users see `—`, `0/0`, and empty lists with no indication that data is coming. This looks broken, especially on slow connections.

**Run `/animate`** with the following specific instructions:

**Step 1 — Add skeleton CSS to `css/core/components.css`:**
```css
/* Skeleton loading shimmer */
@keyframes hbitSkeleton {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    var(--panel) 25%,
    color-mix(in srgb, var(--panel) 70%, var(--text)) 50%,
    var(--panel) 75%
  );
  background-size: 200% 100%;
  animation: hbitSkeleton 1.4s ease infinite;
  border-radius: var(--radius-2);
  color: transparent !important;
  pointer-events: none;
  user-select: none;
}
.skeleton * { visibility: hidden; }
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background: var(--panel); }
}
```

**Step 2 — Dashboard (`home.js` + `home.html`):**
- Before Firebase data resolves, add class `skeleton` to each `.hc-card` metric value element and mini-chart area
- Remove `skeleton` class once data populates each card
- The weekly summary rings should show a muted gray placeholder ring while loading

**Step 3 — Habits page (`habits.js`):**
- Show 3 skeleton `.hb-card` placeholders (same height as real cards) while habits load from Firebase
- Replace with real cards once data resolves
- If no habits exist after load (empty state), show the existing empty state UI

**Step 4 — Budget page (`budget.js`):**
- Show skeleton rows in the transaction list while data loads
- Account card balance values should show skeleton until real data arrives

**Step 5 — Sleep page (`sleep.js`):**
- Sleep debt stat, tonight's bedtime/wake values should show skeleton while loading

**Step 6 — Mood page (`mood.js`):**
- Streak counter and weekly insight chart should show skeleton while loading

**Step 7 — Plan page (`plan.js`):**
- Timeline items should show 2–3 skeleton event cards while loading

---

## Verification Checklist

After completing all 3 fixes, verify:

- [ ] Open the app in a browser with network throttled to "Slow 3G" — skeleton states appear before data loads on all pages
- [ ] Switch the UI language to French — no `{n}`, `{amount}`, or `{score}` literals appear anywhere in the UI
- [ ] Click every nav item from the sidebar — it highlights the correct active page
- [ ] Make a nav change (rename one sidebar label) in `sidebar.js` only — confirm it reflects on all 9 pages without editing any HTML file
- [ ] Console shows no JS errors on any page

Run `/audit` at the end and confirm the anti-patterns score improves by at least 1 point on affected pages.
