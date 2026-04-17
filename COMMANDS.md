# Hbit — Commands & Skills Reference

Quick reference for every skill installed and how to use it on this project.

---

## 🎨 UI/Design Skills — `pbakaus/impeccable`

> Use these when rebuilding or improving UI components.

| Command | When to use |
|---------|-------------|
| `/overdrive` | Nuclear option — full redesign of a component or page |
| `/polish` | Refine an existing UI without changing structure |
| `/delight` | Add micro-interactions, hover states, animations |
| `/animate` | Add motion: transitions, entrance animations, progress bars |
| `/colorize` | Fix or enhance the color system |
| `/typeset` | Fix typography: sizing, weight, line-height, hierarchy |
| `/adapt` | Make a component responsive (mobile → desktop) |
| `/arrange` | Fix layout, spacing, alignment, grid issues |
| `/bolder` | Make design more confident and visually strong |
| `/quieter` | Remove visual noise, simplify cluttered UI |
| `/distill` | Simplify overcomplicated UI to its essence |
| `/clarify` | Make a UI element clearer and easier to understand |
| `/critique` | Get a brutal honest design critique |
| `/audit` | Full code + UI audit — lists all issues |
| `/normalize` | Fix inconsistencies across components |
| `/extract` | Extract a UI pattern into a reusable component |
| `/harden` | Security + robustness hardening |
| `/optimize` | Performance — reduce repaints, lazy load, etc. |
| `/onboard` | Redesign onboarding/wizard flows |
| `/frontend-design` | Full frontend design pass |
| `/shadcn` | Add shadcn/ui components (if ever needed) |

---

## 🚀 Pro UI/UX Skills — `nextlevelbuilder/ui-ux-pro-max-skill`

> Use these for premium-level feature design.

| Command | When to use |
|---------|-------------|
| `/ui-ux-pro-max` | Full professional UI/UX overhaul on a module |
| `/ckm:design` | Complete design rebuild — structure + style + interactions |
| `/ckm:brand` | Brand identity consistency pass |
| `/ckm:design-system` | Build or extend the design system (tokens, components) |
| `/ckm:ui-styling` | Deep CSS styling — shadows, gradients, animations |
| `/ckm:banner-design` | Hero sections, banners, feature highlights |
| `/ckm:slides` | Pitch decks or slide-style cards |

---

## 🔍 Quality Skills

| Command | When to use |
|---------|-------------|
| `/web-design-guidelines <file>` | Audit any file against Vercel Web Interface Guidelines |

**Example usage:**
```
/web-design-guidelines budget.html
/web-design-guidelines css/pages/budget.css
/audit js/pages/budget.js
/critique budget.html
```

---

## 📋 Workflow for Budget Module Rebuild (Phase 3)

When running Phase 3 prompt, invoke skills in this order:

```
Step 1  → Apply black screen fix (manual, documented in budget-blackscreen-fix-prompt.md)
Step 2  → /audit budget.html css/pages/budget.css js/pages/budget.js
Step 3  → /ckm:design        (Bills popup complete redesign)
Step 4  → /onboard           (Wizard redesign — choices reshape UI layout)
Step 5  → /ui-ux-pro-max     (Financial Health Score, 50/30/20, Spending Streak)
Step 6  → /delight + /animate (Month-end Summary Card animations)
Step 7  → /ckm:ui-styling    (Subscription Tracker UI)
Step 8  → /polish            (PDF export layout)
Step 9  → /web-design-guidelines budget.html  (final QA)
```

---

## 📁 Prompt Files (in vault)

| File | What it covers |
|------|----------------|
| `Hbrain/03 Projects/Hbit/02 Dev/(C) Phase 1 - Foundation Fix Prompt.md` | Bug fixes, light mode, skeleton screens, auth, landing page |
| `Hbrain/03 Projects/Hbit/02 Dev/(C) Phase 2 - Premium Redesign Prompt.md` | Premium redesign, color palettes, feature expansion |
| `Hbrain/03 Projects/Hbit/02 Dev/(C) Phase 3 - Budget Complete Redesign Prompt.md` | Full budget module rebuild — Bills, Wizard, Features 14-20 |
