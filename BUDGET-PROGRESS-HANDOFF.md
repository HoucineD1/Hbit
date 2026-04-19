# Budget Module — Progress Report & Codex Handoff
**Date:** 2026-04-17
**Session:** Claude → ChatGPT Codex handoff
**Target file:** `js/pages/budget.js` (5,358 lines) + `css/pages/budget.css` + `budget.html`
**Goal:** Get Budget module to 10/10 (see `BUDGET-AUDIT-10-OF-10.md`)

---

## PART A — What Claude already fixed (Fixes 1–6)

### Fix 1 — Footer copyright `{year}` interpolation ✅
- **File:** `budget.html` line ~162 — changed static "Copyright 2026 Hbit" to `&copy; 2026 Hbit` with `id="bgFooterCopyright"`.
- **File:** `js/pages/budget.js` `applyBudgetI18n()` (~line 573) — passes `{year: new Date().getFullYear()}` when key is `footer.copyright`.

### Fix 2 — `t()` falls through to local `BUDGET_COPY` ✅
- **File:** `js/pages/budget.js` `t()` helper (~line 493).
- Now: tries `HBIT.i18n.t()` first, then `BUDGET_COPY[key]` with lang detection (`fr` picks index 1, else 0), then runs `{placeholder}` regex interpolation.
- This instantly wires up ~80 call sites to FR without having to touch each render function.

### Fix 3 — Added ~80 FR/EN keys to `BUDGET_COPY` ✅
- **File:** `js/pages/budget.js` `BUDGET_COPY` object.
- Keys added across namespaces: `budget.income/spent/remaining`, `budget.accounts.*`, `budget.overview.*`, `budget.pie.*`, `budget.tx.*`, `budget.goals.*`, `budget.planner.*`, `budget.cat.*` (all 10 categories), `budget.bills.*`, `budget.activity.*`, `budget.setup.*`, `budget.alert.*`, `budget.modal.*`, `budget.daily.leftToday`.

### Fix 4 — Net Worth calculation ✅
- **File:** `js/pages/budget.js` `computeNetWorth()` (~line 773).
- Removed misleading fallback that returned `income - expenses` when no accounts existed. Now always returns `assets - liabilities` from `state.accounts`, returning 0 if none.

### Fix 5 — Light theme WCAG AA contrast + orphan `×` alert fragments ✅
- **File:** `css/pages/budget.css` light theme override (~line 30) — darkened semantic colors (`--bgt-income:#047857`, `--bgt-spent:#DC2626`, `--bgt-saved:#4F46E5`, `--bgt-success:#047857`, `--bgt-danger:#DC2626`, `--bgt-warning:#B45309`, `--bgt-text-3:#4B5563`).
- **File:** `css/pages/budget.css` (~line 425) — added complete styling for `.bg-alert-card`, `.bg-alert-msg`, `.bg-alert-link`, `.bg-alert-dismiss`, plus `.bg-alert-card--err/warn/ok/info` variants. Dismiss button is now absolute-positioned top-right instead of floating orphan text.

### Fix 5.5 — Revolut single-column desktop layout ✅
- **File:** `css/pages/budget.css` desktop media query (~line 553).
- Replaced broken 2-column `nth-child` grid with single-column 820px max-width centered stack. Updated 1024px breakpoint to extend the 820px treatment and pad the sticky header to align.

### Fix 6 — Setup checklist i18n (~90%) ⚠️
- **File:** `js/pages/budget.js` (~lines 962–975).
- Wrapped hardcoded English labels in `t()` calls; `bgSetupCount` now interpolates `{done}/{total}`.
- **Remaining:** alert CTA buttons at ~lines 950–951 still have hardcoded `"Set it now"` / `"Start planning"`. The FR/EN keys are already defined in `BUDGET_COPY` as `budget.alert.setNow` and `budget.alert.startPlanning`; just swap the literals for `t()` calls.

---

## PART B — What's left (Fixes 7–12) — for Codex

See the detailed prompt in `BUDGET-CODEX-PROMPT.md` (next file).

### Fix 7 (P1) — Memory leak: entry swipe listeners
- **Where:** `js/pages/budget.js` ~lines 2515–2536.
- **Problem:** `addEventListener('touchstart'/'touchmove'/'touchend')` attached per-row in a loop. Each re-render leaks listeners.
- **Pattern:** single delegated listener on the scroll container, use `e.target.closest('.bg-tx-row')` to resolve the row, track swipe state in closure-scope `Map` keyed by element.

### Fix 8 (P1) — Memory leak: trend tooltip listeners
- **Where:** `js/pages/budget.js` ~lines 3571–3580.
- **Problem:** Same as Fix 7 — attach-per-node in a render loop on SVG points.
- **Pattern:** one `pointermove` listener on the parent `<svg>`, hit-test by `elementFromPoint` or compute closest x-band.

### Fix 9 (P1) — Layout engine immutability
- **Where:** `js/pages/budget.js` `buildLayoutConfig` ~lines 317–431.
- **Problem:** Lines 403–405 wipe the `rules` array before applying personalization, erasing the wizard-driven reordering on re-run.
- **Pattern:** Treat the base rules array as frozen (`Object.freeze`), do all mutations on a `structuredClone`, return the cloned config.

### Fix 10 (P1) — Remove duplicate render functions
- **Where:**
  - `renderAccountsSection` at ~1274 vs ~4833 (keep first, delete second)
  - `renderGoalsSection` at ~2470 vs ~5005
  - `renderBillsSection` at ~2786 vs ~5047
- **Verification:** grep the function names — ensure only one definition remains and all call sites resolve to it.

### Fix 11 (P1) — A11y polish
- Bill status glyphs: replace text "paid"/"late"/"due" with icons ✓/⚠/• + `aria-label`.
- Add `aria-label` to every edit pencil button (currently just an icon, no text).
- Add focus trap to non-wizard modals (account edit, goal edit, bill edit, transaction edit). Wizard already has one — copy that pattern.

### Fix 12 (P1) — Delight animations
- **Balance count-up:** When dashboard hero loads, animate the balance number from 0 to target over 800ms with `easeOutCubic`. Respect `prefers-reduced-motion`.
- **Donut sweep-in:** Animate `stroke-dashoffset` from `circumference` → target over 600ms stagger 100ms per segment. Again respect reduced motion.

---

## PART C — Files modified in this session (full list)

1. `js/pages/budget.js` — `t()`, `applyBudgetI18n()`, `computeNetWorth()`, `BUDGET_COPY`, setup checklist render.
2. `css/pages/budget.css` — light theme vars, `.bg-alert-card*` classes, desktop single-column layout.
3. `budget.html` — footer copyright markup.
4. `BUDGET-AUDIT-10-OF-10.md` — full audit (unchanged, reference only).
5. `BUDGET-PROGRESS-HANDOFF.md` — this file.
6. `BUDGET-CODEX-PROMPT.md` — the prompt to paste into ChatGPT Codex.

---

## PART D — How to verify what Claude did before Codex starts

```bash
# 1. Confirm the t() fallback logic
grep -n "BUDGET_COPY\[key\]" js/pages/budget.js
# expect a hit around line ~495

# 2. Confirm Net Worth no longer falls back
grep -n "Income - Expenses" js/pages/budget.js
# expect NO hits (removed)

# 3. Confirm alert classes are styled
grep -n "bg-alert-dismiss" css/pages/budget.css
# expect hits around line ~425

# 4. Confirm single-column desktop layout
grep -n "820px" css/pages/budget.css
# expect hits in the 768px and 1024px media queries

# 5. Confirm footer id exists
grep -n "bgFooterCopyright" budget.html
# expect one hit
```

If all 5 checks pass, Fixes 1–5 are in place and Codex can start from Fix 7.

---

## Done — Codex continuation

- Shipped Fix 6-finish: setup alert CTAs now use `budget.alert.setNow` / `budget.alert.startPlanning`, and dismiss uses the existing alert label key.
- Shipped Fix 7: transaction swipe-to-delete now uses delegated touch listeners on `entriesList` with per-row state in a `WeakMap`.
- Shipped Fix 8: trend tooltip hover handling now uses one `pointermove` and one `pointerleave` listener on the SVG.
- Shipped Fix 9: layout section IDs/orders are frozen base config, and `buildLayoutConfig()` clones the base order before personalization instead of clearing/rebuilding it.
- Shipped Fix 10: removed the second `renderBills()` definition; the repo did not contain `renderAccountsSection` / `renderBillsSection` names, and `renderGoalsSection()` only had one definition.
- Shipped Fix 11: bill status glyphs now have accessible labels, edit icon buttons have shared `budget.a11y.editRow` labels, and non-wizard overlays use a reusable focus trap.
- Shipped Fix 12: dashboard hero count-up and donut sweep animation both respect `prefers-reduced-motion`.
- Verification: `node --check js/pages/budget.js` passes; grep confirms no per-row `touchstart/touchmove/touchend` or `mouseenter/mouseleave` listener pattern remains, and only one `renderBills()` remains.
