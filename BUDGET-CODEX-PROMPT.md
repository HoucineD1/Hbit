# ChatGPT Codex Handoff Prompt — Hbit Budget Module
**Paste everything below this line into ChatGPT Codex.**

---

## Context

You are continuing work on **Hbit**, a solo-built personal growth web app by Houcine (aka "God" / "Dem"). Stack: **vanilla HTML + CSS + JavaScript + Firebase (Auth + Firestore + Realtime DB)**. No frameworks, no build tools, no npm in the app.

Repo root: `C:\Users\demxa\Desktop\Hbit`
Live URL: https://hbit-2026.vercel.app/
Login for QA: `Mimi@gmail.com` / `12345678`

You are picking up work on the **Budget module** (`budget.html` + `js/pages/budget.js` + `css/pages/budget.css`). A prior AI assistant (Claude) completed Fixes 1–6 of a 12-item punch list. Your job is to finish Fixes 7–12.

### Rules (non-negotiable)
1. **Vanilla only** — no React, no build tools, no npm packages.
2. **Never break existing functionality.** Test mentally before writing.
3. **Mobile-first.** Must work at 320px.
4. **All themes must keep working.** Dark is default; light, and others must still pass WCAG AA.
5. **Bilingual (EN/FR).** Any new user-visible string MUST be added to the `BUDGET_COPY` map in `js/pages/budget.js` and referenced via `t("key", "English fallback")`. Do NOT hardcode literals.
6. **Respect `prefers-reduced-motion`** for any animation.
7. **Module accent color for Budget:** `#F59E0B` (amber).
8. **Don't touch** `.obsidian/` or anything outside the Hbit folder.
9. **Prefix any new doc/note filenames with `(C)`** if they are AI-generated.

### Status from previous session
✅ Fix 1: Footer `{year}` interpolation
✅ Fix 2: `t()` falls through to `BUDGET_COPY`
✅ Fix 3: ~80 FR/EN keys added to `BUDGET_COPY`
✅ Fix 4: Net Worth calc corrected
✅ Fix 5: Light theme WCAG contrast + alert card styling
✅ Fix 5.5: Revolut single-column 820px desktop layout
⚠️ Fix 6: Setup checklist i18n — 90% done; finish it (see Fix 6-finish below)

---

## Your punch list (Fixes 6-finish through 12)

### Fix 6-finish — Remaining hardcoded English in setup alerts (15 min)
**File:** `js/pages/budget.js` around lines 950–951.
Look for literals like `"Set it now"` and `"Start planning"` inside alert/button definitions. Replace with:
```javascript
t("budget.alert.setNow", "Set it now")
t("budget.alert.startPlanning", "Start planning")
```
Both keys already exist in `BUDGET_COPY` with FR translations. Also grep for any remaining hardcoded English strings in render functions and wrap them in `t()` — priority is anything that displays on the dashboard hero, empty states, or CTA buttons.

---

### Fix 7 (P1) — Entry swipe listeners memory leak (45 min)
**File:** `js/pages/budget.js` lines ~2515–2536.

**Problem:** Inside the transaction list render loop, `row.addEventListener('touchstart'/'touchmove'/'touchend', …)` is called for every row on every re-render. Old rows' listeners never get cleaned up → memory leak + ghost listeners firing on stale DOM.

**Fix pattern (event delegation):**
1. Find the scroll container that wraps the transaction rows (likely `.bg-tx-list` or similar — confirm by reading lines ~2480–2540).
2. Outside the render loop (during module init or on first render), attach ONE listener of each type to the container.
3. In the handler, use `e.target.closest('.bg-tx-row')` (or whatever the row class is) to resolve which row was touched.
4. Track swipe state in a `Map` keyed by the row element (or its `data-id` attribute), scoped to a module-level closure.
5. Remove the per-row `addEventListener` calls entirely.

**Verify:** After fix, open DevTools → Performance → Record → scroll the list 5x → stop. "Event Listeners" count in Memory heap snapshot should not grow per render.

---

### Fix 8 (P1) — Trend tooltip listeners memory leak (30 min)
**File:** `js/pages/budget.js` lines ~3571–3580.

**Problem:** Same anti-pattern as Fix 7, but on SVG trend chart points. Each render attaches `mouseenter`/`mouseleave` per `<circle>`.

**Fix pattern:**
1. Attach ONE `pointermove` listener on the parent `<svg>` during init.
2. On move, compute the nearest data-point x-index (either via `elementFromPoint` + `closest('circle[data-idx]')`, or mathematically from `e.offsetX` / chart width × data length).
3. Show tooltip, update its `data-current-idx`.
4. Attach one `pointerleave` on the svg to hide.

---

### Fix 9 (P1) — Layout engine immutability (30 min)
**File:** `js/pages/budget.js` `buildLayoutConfig()` ~lines 317–431.

**Problem:** Lines ~403–405 set `rules.length = 0` (or `rules = []`) before applying personalization, wiping the wizard-driven reordering on every re-invocation.

**Fix pattern:**
1. Freeze the base config at module load:
   ```javascript
   const BASE_LAYOUT_RULES = Object.freeze([/* original rules */]);
   ```
2. Inside `buildLayoutConfig`, do:
   ```javascript
   const rules = structuredClone(BASE_LAYOUT_RULES);
   // apply personalization mutations on the clone
   return { ...config, rules };
   ```
3. Remove lines 403–405 (the `.length = 0` / reassignment).

**Verify:** Complete the wizard → confirm the personalized section order persists → navigate away and back → order should still be personalized (not reset to default).

---

### Fix 10 (P1) — Remove duplicate render functions (20 min)
**File:** `js/pages/budget.js`

Delete these duplicates (keep the FIRST definition, delete the SECOND):
- `renderAccountsSection` — keep ~line 1274, delete ~line 4833
- `renderGoalsSection` — keep ~line 2470, delete ~line 5005
- `renderBillsSection` — keep ~line 2786, delete ~line 5047

**Verify:**
```bash
grep -n "function renderAccountsSection" js/pages/budget.js  # should show only 1 line
grep -n "function renderGoalsSection" js/pages/budget.js     # should show only 1 line
grep -n "function renderBillsSection" js/pages/budget.js     # should show only 1 line
```
Then run the app and make sure accounts/goals/bills still render correctly.

---

### Fix 11 (P1) — A11y polish (60 min)

**11a. Bill status glyphs**
In `renderBillsSection` (~line 2786), wherever status strings like `"paid"`, `"late"`, `"due"` render, replace with:
```html
<span class="bg-bill-status bg-bill-status--paid" aria-label="${t('budget.bills.statusPaid','Paid')}">✓</span>
<span class="bg-bill-status bg-bill-status--late" aria-label="${t('budget.bills.statusLate','Late')}">⚠</span>
<span class="bg-bill-status bg-bill-status--due"  aria-label="${t('budget.bills.statusDue','Due')}">•</span>
```
Add the three new keys to `BUDGET_COPY` with FR translations (`Payée`, `En retard`, `À venir`). Add minimal CSS in `css/pages/budget.css` for the three variants (color from `--bgt-success` / `--bgt-danger` / `--bgt-warning`).

**11b. Edit pencil buttons — aria-labels**
Grep for `<button ...class="bg-edit"` or whatever edit-icon button class is used. Each one needs `aria-label="${t('budget.a11y.editRow','Edit')}"`. Add the key.

**11c. Focus trap for non-wizard modals**
The wizard (`showWizard()`) has a focus trap. Find that implementation (grep for `focus` + `Tab` or `trapFocus` in budget.js) and apply the same pattern to:
- Account edit modal (`openAccountEdit`)
- Goal edit modal (`openGoalEdit`)
- Bill edit modal (`openBillEdit`)
- Transaction edit modal (`openTxEdit`)

A minimal focus trap:
```javascript
function trapFocus(modal) {
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0], last = focusable[focusable.length - 1];
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  first?.focus();
}
```

---

### Fix 12 (P1) — Delight animations (60 min)

**12a. Balance count-up on dashboard hero**
Where the main balance number gets set (grep for `bgHeroBalance` or similar), wrap the final text set in:
```javascript
function animateCountUp(el, to, duration = 800) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = formatMoney(to);
    return;
  }
  const from = 0;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.textContent = formatMoney(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```
Call on first render and when the value changes by more than 1 unit.

**12b. Donut sweep-in**
Find where the category spend donut renders (grep for `stroke-dasharray` on `<circle>` elements). For each segment:
```javascript
circle.style.transition = 'stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)';
circle.style.transitionDelay = `${idx * 100}ms`;
circle.style.strokeDashoffset = circumference; // start hidden
requestAnimationFrame(() => {
  circle.style.strokeDashoffset = targetOffset; // animate to target
});
```
Wrap the entire block in a `prefers-reduced-motion` guard — if reduced-motion is on, skip the transition and set `strokeDashoffset` directly.

---

## Workflow

For EACH fix above, in order:
1. Read the relevant code region first (use the line number hints).
2. Write the change.
3. Run a mental test: "If I clear state and reload, does this still work? What about on 320px? What about in light theme? What about in French?"
4. If adding any new user-visible string, add the EN and FR to `BUDGET_COPY`.
5. Confirm with the grep verification commands where provided.
6. Move to the next fix.

When all 12 fixes are done, append a short "Done" section to `BUDGET-PROGRESS-HANDOFF.md` listing which fixes you shipped and any notes/caveats.

## Do not
- Do not rewrite the whole Budget module.
- Do not introduce a framework or bundler.
- Do not change the design tokens in `css/core/tokens.css` — only touch `css/pages/budget.css` unless a global issue is discovered.
- Do not delete the `BUDGET-AUDIT-10-OF-10.md` or `BUDGET-PROGRESS-HANDOFF.md` files — append to them if needed.
- Do not hardcode English in new render code.

Start with Fix 6-finish. Go.
