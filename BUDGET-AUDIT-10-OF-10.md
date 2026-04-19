# Hbit — Budget Page: Full Audit & Path to 10/10

**Date:** 2026-04-17
**Auditor:** Claude
**Scope:** Live site `https://hbit-2026.vercel.app/budget.html` (logged in as Mimi@gmail.com, FR locale, CAD) + static code review of `budget.html`, `js/pages/budget.js` (5,358 lines), `css/pages/budget.css` (735 lines).
**Baseline verdict:** Currently **6.0 / 10**. The bones are there — wizard works end-to-end, the data pipeline is solid, the personalization engine exists. What's holding it back is a cluster of foundational polish bugs: broken i18n on ~60% of strings, a wrecked desktop grid, a couple of contrast/readability failures in light mode, orphan UI fragments, and ~3 memory-leak hotspots. Fix the twelve items in §7 and this page becomes a legitimate 10/10.

---

## 1. What's fixed (confirmed working)

| Previously reported | Status | Evidence |
| --- | --- | --- |
| Wizard fade-out → black screen | **FIXED** | `budget.js:3334` adds `.bg-wizard-fade-out` to the overlay itself, not just the card. I also opened the Add Expense modal on the live site and closed it with Escape — no black flash, clean backdrop dim. |
| Modal backdrop open/close | **WORKING** | `budget.js:3005–3047` uses `display:flex` → `opacity` transition + `transitionend` listener + 350 ms fallback + proper `aria-hidden` toggling. |
| Dead debug code (`console.log`) | **CLEAN** | Zero `console.log` left in production. |
| No `!important` CSS | **CLEAN** | Grep across `budget.css` returns none. |

Give yourself credit — the stuff that used to be scary is no longer scary.

---

## 2. What's still broken (live-site evidence)

These are the things a user sees right now.

### 2a. i18n is the #1 visible problem
Mimi is in French (`lang=fr`, UI chrome shows `VEN. 17 AVR.`, `avril 2026`, `Day 1`). But the Budget page is **a patchwork of French and English** that looks unfinished. Captured screenshots show:

- **Footer:** `© {year} Hbit` — the `{year}` placeholder is rendering literally. This is the exact interpolation bug you flagged. It's **not** coming from the `t()` function in `budget.js` (which does interpolate correctly — `budget.js:501–503`). It's in a shared footer/layout, most likely using a non-interpolating render path. **Fix:** find the footer template that emits `{year}` and replace with `new Date().getFullYear()` or route it through the same interpolating `t()`.
- **English strings on a French page** (non-exhaustive list from live screenshots): `Left to spend`, `of $1,400.00 budgeted`, `$200.00 spent`, `Income / Spent / Remaining` KPI labels, `Accounts`, `Financial Health`, `Details`, `Good`, `Money Overview`, `Net Worth:`, `Income / Spent / Debt / Remaining` legend, `Spending by category`, `total`, `Transactions`, `Search transactions…`, `All / Income / Expenses`, `Subscriptions`, `Savings Goals`, `Create a savings goal to stay motivated`, `Save for a vacation, emergency fund, or down payment.`, `Set a Goal`, `+ New Goal`, `Budget Planner`, `Tap to set a monthly limit`, `Track / Plan`, `Auto-fill 50/30/20`, category names (`Housing / Food / Transport / Health / Fun / Shopping / Education / Savings / Other`), `Remaining`, `No limit set`, `Set limit`, `Budgeted: … – Spent: … – Remaining: …`, `Over budget`, `Bills`, `All / Unpaid / Paid / Subscriptions`, `No bills yet`, `Add recurring bills like rent, utilities or subscriptions.`, `Add bill`, `Spending Activity`, `Daily spending`, `Salary`, `No recent change`, `Add account`, `Set up your budget`, `Complete these to unlock the full dashboard.`, `3 / 5 done`, `Log your first income`, `Set your monthly plan`, `Log your first expense`, `Add a recurring bill`, `Create a savings goal`, `Income uses Salary and Cash account balances. Add an account to set income.`, `You've exceeded your Subscriptions budget by $110.00 this month.`
- The "Add expense" modal itself: title, `Save`, and all 10 category labels are English.

**Root cause (inferred):** huge chunks of the Budget page either (a) use hardcoded literals instead of `t()`, or (b) call `t("key")` with an English default but no French translation exists in the FR locale bundle. Either way, the fix is a one-afternoon pass: grep for every user-visible string in `budget.js`/`budget.html`, wrap in `t()`, add matching keys to the FR i18n bundle.

### 2b. Desktop grid is broken (huge empty left column)
At 1440 px wide, the middle viewport renders a **single dominant right column** for Money Overview and Spending-by-category, with a ~500 px wide empty left gutter. Then Transactions jumps back into a center-biased column with empty space on both sides. Savings Goals sits on the left, Budget Planner on the right — fine — but Spending Activity starts inside the right rail while Bills is centered-left, leaving a large empty top-left block. The page looks like a Bento grid that has partially collapsed.

**Fix:** the layout engine (`buildLayoutConfig`, `budget.js:317–431`) returns a section order, but the CSS grid that consumes it isn't set up for a responsive 2-column layout at ≥1024 px. Right now sections appear to pick arbitrary columns based on render order. Either:
- Apply a proper `display: grid; grid-template-columns: 1fr 1fr; gap: 20px;` at ≥1024 px with explicit column assignment per section key, **or**
- Go single-column (like Revolut) and cap content width at ~720–820 px. Personally I'd do the single-column option — it's what Revolut does and it kills this entire class of bug.

### 2c. Light theme has two real readability failures
Most of the light theme actually survived — cards render, category icons look fine. But two very visible failures:

1. **Hero "$1,200.00" in mint green on white** — contrast way below WCAG AA (mint `#34D399` on white ≈ 1.9:1, needs 4.5:1 for body text, 3:1 for large text). The exact same rule applies to `$19,800.00 Remaining` and the `Remaining: $800.00` green sub-values in the Budget Planner rows.
2. **Subtitle `of $1,400.00 budgeted` and `$200.00 spent`** are in `var(--text-3)` which in light mode is too close to background. They read as invisible.

**Fix:** in light mode, use a darker emerald for positive-money (`#059669` or `#047857`) and bump muted text to `#4b5563` minimum.

### 2d. Data inconsistency: Net Worth = Remaining
The Money Overview card shows **Net Worth: $1,200.00** while the legend right below shows **Remaining: $19,800.00** and **Income: $20,000**. Net Worth should at minimum be `Σ account balances − Σ debts`, not the same as "Left to spend." Either the label is wrong ("Left to spend this month" was already shown above) or the computation is wrong. Users notice this immediately.

### 2e. Orphan UI fragments
- The `×` dismiss button under "You've exceeded your Subscriptions budget by $110.00 this month." is a bare glyph on a tiny chip with no label/affordance. Looks like a broken close icon.
- The `×` buttons on each transaction row also look orphaned — they're aligned to the right edge of a wide card with too much surrounding space.
- The income transaction has an avatar circle that just says `O` (the first letter of the — apparently empty — description field). Needs either a category icon or the first letter of a non-empty default label (`Revenu` / `Income`).

### 2f. Account cards
The account card in the bottom carousel shows `Rtl / Salary / $1,200.00 / No recent change`. `Rtl` is presumably the account name Mimi entered. Fine. But:
- The "edit pencil" icon is a small grey square with no tooltip in FR (no `aria-label` at all in the code — `budget.js:2257`).
- "Salary" is hard-coded English even though the other FR strings in that area (`Comptes`, `Ajouter un compte` — wait, those are also English: `Accounts`, `Add account`). Entire accounts rail is un-localized.

### 2g. The "CAD" currency pill
In the top-right corner of the month selector row sits a `CAD ▾` pill that looks interactive but is actually *just a chip* — clicking it doesn't open a switcher in the live app (or if it does, it wasn't reachable in my pass). Either make it a real currency switcher or style it as a static badge so users don't keep trying to click it.

---

## 3. What's still broken (code-level, not yet user-visible but will be)

### 3a. Memory leaks (P0)
Two places that will degrade performance over a session:
1. **Entry swipe listeners** (`budget.js:2515–2536`) — `addEventListener("touchstart"…)` is re-bound on every `renderEntries()` call without removing the previous binding. A user who adds 10 transactions ends up with dozens of zombie listeners pointing at detached DOM nodes.
2. **Trend chart tooltip listeners** (`budget.js:3571–3580`) — same pattern, attached inside a `setTimeout(0)` with no cleanup. Trend chart lazy-loads on scroll; if the user scrolls up and back down, listeners double.

**Fix:** either (a) clone-and-replace the list container before each render to nuke old listeners, or better (b) switch to event delegation on the fixed parent container, so you bind *once* and read `event.target.closest(".bg-entry-card")`.

### 3b. Fragile layout engine (P1)
`buildLayoutConfig()` at `budget.js:317–431` has a subtle bug: lines 403–405 **clear** the `hidden` and `expanded` sets right before the final switch, discarding rules that were set by the preceding `challenge`-based logic (lines 398–400). Net effect: some wizard answers silently stop mattering. This is why the dashboard may not feel "different" across profiles even though the wizard asks about them.

**Fix:** refactor as immutable — each rule returns a partial `{ order, hidden, expanded }` that merges into an accumulator. No mutation, no clearing.

### 3c. Duplicated render functions (P1)
Three instances of real code duplication, which means a visual fix in one place doesn't propagate:
- `renderBillsSummary` — defined at both `budget.js:1274–1287` and `budget.js:4833–4894` with divergent behavior.
- Transaction card rendering — `budget.js:2470` vs `budget.js:5005`, near-identical but different class names.
- `renderCatGrid` — defined at `budget.js:2786` and `budget.js:5047`, later definition wins.

**Fix:** delete the older copies (verify with `git log` which came first). Keep one source of truth.

### 3d. Silent Firestore error handling (P2)
Every Firestore read/write is wrapped in `catch (err) { /* silent */ }` (e.g. `budget.js:605–619, 691–693, 251–254`). When the network drops, data silently becomes empty — user sees an empty dashboard and thinks their data is lost. At minimum, log to console for your own debugging; ideally surface a toast: "Couldn't load entries — tap to retry".

### 3e. Accessibility gaps (P2)
- **Focus trap only in wizard** (`budget.js:3296–3315`). All other modals (Add Expense, Add Account, Add Bill, Add Goal, edit modals) have no trap — Tab leaks behind the backdrop.
- **Color-only signaling** on bill status chips (paid / overdue / due-soon) — `budget.js:2145, 2150`. Colorblind users can't distinguish. Add a glyph: ✓ / ⚠ / •.
- **Missing `aria-label`** on edit pencils (`budget.js:2257`), monthly-limit numeric inputs (`budget.js:1985` — uses `placeholder` only), and the currency pill.
- **Keyboard support** on category grid in the Add Expense modal — grid cells look like buttons but don't have `role="button"` or `tabindex`.

### 3f. Light theme CSS coverage (P2, already user-visible)
Only ~10 rules in `budget.css` scope to `[data-theme="light"]` out of 735 lines. Most colors survive because they use CSS vars that flip at the `html` level, but anywhere a hex value is inline (template strings at `budget.js:1033, 1039, 1107, 1241, 1267, 1682, 1752, 1886, 1927, 2241, 2253, 2468, 2873, …`) the dark-mode literal leaks into light mode. Extract all hex literals from JS into CSS custom properties.

---

## 4. Comparison: what Revolut-grade would look like

Putting this up against the Revolut teardown from the earlier research:

| Aspect | Revolut / 10-of-10 target | Hbit today | Gap |
| --- | --- | --- | --- |
| Hero number | Single huge balance, animated reveal on entry | Static `$1,200.00` in mint, hard-to-read in light | Add count-up animation on first paint; fix contrast |
| Card radius / shadow | 12 px radius, soft `0 2px 8px rgba(0,0,0,.08)` | Radii inconsistent per section, no shadows visible in dark | Unify to one `--card-radius` / `--card-shadow` token |
| Typography scale | Strict 4-step scale (Display 40, H1 24, Body 15, Caption 12) | Ad-hoc sizes (`$1,200` is huge, KPI numbers are medium, some text is tiny) | Lock to a 4-step scale, enforce it per-section |
| Color hierarchy | Accent used *only* for primary action + active state | Orange, green, red, cyan, violet, indigo all present simultaneously on the home view | Pick one accent per state; push module colors into small dots/icons only |
| Information density | Single column, tight vertical rhythm (16 → 24 → 32 px) | Broken 2-column grid with ~500 px empty columns | Single column + centered 720 px content rail |
| Empty states | Action-driven hero with one CTA | Already good (Savings Goals empty state, Bills empty state) | Minor copy tightening |
| Micro-interactions | Balance count-up, card tap ripple, smooth chart draw-in | Static | Add count-up on balance + donut sweep-in on first render |
| Localization | Full i18n with runtime switch | ~40% localized on Budget page | See §2a |

---

## 5. New wizard questions (delta vs. current)

From the earlier research pass, the proposed improvement is to cut the wizard from 7 questions to **6 high-signal ones**, each tied to a concrete UI change. Briefly:

1. **Primary goal** → controls which section pins to position 1 (Debt tracker / Savings ring / Transaction feed / Budget planner)
2. **Track vs Plan** → controls Budget Planner's default tab + whether "Today's spend" hero vs "Monthly budget" hero
3. **Pay cadence** → weekly cadence swaps the Spending Activity bars from per-day to per-week
4. **Experience level** → beginner collapses Trend / Accounts / Activity; advanced expands everything + shows per-category variance
5. **Biggest challenges** (multi-select, optional) → pins Bills card for `irregular_bills`, pins Goals for `savings_discipline`, shows Accounts consolidation hint for `multiple_accounts`
6. **Notification cadence** (optional) → just stores a preference, no layout effect but matters for the full app

Drop "commitment" — it overlaps with experience level and causes the buggy "slice(4).forEach(hide)" clobbering in `buildLayoutConfig`.

---

## 6. Severity-ranked fix list

Priorities are **P0** (shipping today is a bad look), **P1** (fix this sprint), **P2** (next sprint polish).

| # | Sev | Where | Fix |
| --- | --- | --- | --- |
| 1 | **P0** | footer template (find via grep for `{year}`) | Replace `{year}` with actual year or pass through `t()` with interpolation |
| 2 | **P0** | All Budget page strings | Full i18n pass — wrap every user-visible string in `t()`, add FR keys |
| 3 | **P0** | Desktop layout CSS | Fix broken grid — either explicit 2-column with section-to-column mapping, or single-column + 720 px max-width (recommended) |
| 4 | **P0** | `budget.css` — light mode | Fix hero number + muted text contrast; darken emerald, bump muted grey |
| 5 | **P0** | Money Overview card | Fix `netWorth` computation — `Σ(account balances) − Σ(debts)`, not "Remaining" |
| 6 | **P1** | `budget.js:2515–2536` | Event-delegate entry swipe listeners instead of per-render bind |
| 7 | **P1** | `budget.js:3571–3580` | Event-delegate trend tooltip listeners |
| 8 | **P1** | `budget.js:317–431` | Refactor `buildLayoutConfig` immutably so challenge rules aren't clobbered |
| 9 | **P1** | `budget.js:1274` + `2470` + `2786` | Delete the older copies of the 3 duplicated render functions |
| 10 | **P1** | Bill status chips | Add glyphs (✓ / ⚠ / •) for colorblind accessibility |
| 11 | **P1** | Add Expense / Bill / Account / Goal modals | Apply same focus trap used in wizard |
| 12 | **P1** | Orphan `×` dismiss chips | Either expand into full dismiss button with label, or remove |
| 13 | **P2** | Transaction avatar when description empty | Fall back to category icon, not first letter of empty string |
| 14 | **P2** | Top-right `CAD ▾` pill | Either make it a real switcher or remove the caret |
| 15 | **P2** | All Firestore `catch (err) {}` blocks | Show non-silent failure toast with retry |
| 16 | **P2** | `budget.js:3425` | Disable wizard "Back" button on slide 0 instead of silently no-op-ing |
| 17 | **P2** | `renderBudgetPlanner` (125 lines) | Split into `renderPlannerPlan / Track / Empty` |

---

## 7. Twelve-item 10/10 checklist

If you only ship these twelve, the page lands at a 10/10:

1. `{year}` footer placeholder → real year.
2. French i18n coverage 100% on Budget page (lock it in with a lint test that flags any `t("…")` call missing a FR key).
3. Desktop: single-column layout, `max-width: 820px`, centered. Kill the broken 2-column grid entirely.
4. Light-mode hero number: use `#059669` (dark emerald) instead of `#34D399`.
5. Light-mode muted text: minimum `#4b5563`.
6. `netWorth` = `Σ accounts − Σ debts`, not "Remaining."
7. Event-delegate both leaky listeners (swipe + trend tooltip).
8. Refactor `buildLayoutConfig` to be immutable; add one unit test per profile combo.
9. Delete duplicate renderers (3 instances).
10. Bill status gets glyphs; edit pencils get `aria-label`; focus-trap every modal.
11. Remove the orphan `×` dismiss fragments (or expand into real buttons).
12. Add a **balance count-up** on first render and a **donut sweep-in** on Money Overview + Spending-by-category. Everything else is fine — two small motion touches make it feel Revolut-tier.

---

## 8. What's good, so you don't forget

- Wizard black-screen bug: **fixed**. Applause.
- Modal open/close is **clean** (verified live).
- Empty states on Savings, Bills, Transactions, Accounts, Planner are **action-driven** with a primary CTA — already best-in-class.
- The Financial Health half-gauge showing "73 GOOD" is a smart addition that Revolut doesn't have.
- The setup checklist ("3 / 5 done") at the bottom is solid onboarding UX — just needs French translations.
- Zero `console.log` in production. Zero `!important`. Good hygiene.

---

## 9. Estimated effort to 10/10

- **Half a day:** items 1 (`{year}`), 4–5 (contrast), 6 (netWorth), 11 (orphan ×), 12 (count-up / donut sweep) — surface wins.
- **One day:** i18n full pass (item 2) — tedious but mechanical.
- **One day:** layout refactor (item 3) — test at 320/768/1024/1440.
- **Half a day:** memory-leak fixes + focus traps + glyphs (items 7, 10).
- **Half a day:** layout engine refactor + duplicate removal (items 8, 9).

Total: **~3 working days**, and the page is genuinely a 10/10.

---
*Audit run 2026-04-17 against live build `hbit-2026.vercel.app/budget.html`. Code paths cited against `budget.js` (5,358 LoC) and `budget.css` (735 LoC) on disk at `/mnt/Hbit`.*
