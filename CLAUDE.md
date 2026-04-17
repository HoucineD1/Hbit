# Hbit — Claude Context File

> Read this first every session. Do not re-read files you don't need.

---

## What Is Hbit

Hbit is an all-in-one personal growth web app with 6 modules:
**Habits · Sleep · Mood · Budget · Focus · Planning**

Built solo by **God (Houcine)**. Bilingual EN/FR. Freemium model.
Stack: **Vanilla HTML + CSS + JavaScript + Firebase (Auth + Firestore + Realtime DB)**
No frameworks. No build tools. No npm packages in the app itself.

Target audience: 18–40 growth-oriented users, Francophone (Quebec, France, West Africa) + English speakers.

---

## Folder Structure

```
Hbit/
├── CLAUDE.md                     ← You are here
├── COMMANDS.md                   ← All skills + commands reference
├── skills-lock.json              ← Installed Claude Code skills
├── *.html                        ← One HTML file per module/page
├── styles.css                    ← Global base styles
├── css/
│   ├── core/                     ← nav.css, tokens.css, base.css, etc.
│   └── pages/                    ← One CSS file per module
├── js/
│   ├── core/                     ← firebase-init, auth, db, i18n, utils, etc.
│   └── pages/                    ← One JS file per module
└── assets/                       ← Images, icons, og-cover
```

---

## Current Status (April 2026)

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation fixes | Prompt written, not yet applied |
| Phase 2 — Premium redesign | Prompt written, not yet applied |
| Phase 3 — Budget complete rebuild | In planning |

**Known bugs:**
- Budget module: black screen when opening modals (fix documented in `budget-blackscreen-fix-prompt.md`)
- Light theme incomplete on Sleep, Focus, Plan, Budget pages
- i18n interpolation broken (`{placeholder}` tokens render literally)
- Auth uses SESSION persistence (intentional for dev testing)

---

## Rules

- **Never break existing functionality** — test every change mentally before applying
- **Never touch `.obsidian/` or vault files** — only work inside `C:\Users\demxa\Desktop\Hbit`
- **No frameworks, no new dependencies** — vanilla only
- **Mobile first** — every UI must work at 320px min width
- **All 4 themes must work** — dark (default), light, and any others
- **`(C)` prefix** — AI-generated notes/docs get this prefix
- **Ask before editing** files without `(C)` prefix if uncertain
- **Always respond in English** even if written to in French
- **Bilingual awareness** — all new strings need EN + FR keys in i18n

---

## Module Accent Colors (Canonical)

```
Habits  → #34D399  (emerald)
Budget  → #F59E0B  (amber)
Sleep   → #818CF8  (indigo)
Mood    → #A78BFA  (violet)
Focus   → #F97316  (orange)
Plan    → #22D3EE  (cyan)
```

---

## Design References

- **Oura Ring app** — dark, data-first, premium materials, subtle glow
- **Apple Health** — clean hierarchy, ring visualizations, calm confidence
- **Notion** — sharp typography, modular cards, excellent empty states
- **Revolut** — mobile-first finance UI, bottom sheets, speed-dial FAB

---

## Installed Skills (Claude Code)

See `COMMANDS.md` for full list. Key ones:
- `/overdrive` — full power redesign
- `/ui-ux-pro-max` — pro UI/UX overhaul
- `/ckm:design` — complete design rebuild
- `/polish` — polish existing UI
- `/audit` — full code/UI audit
- `/animate` — add animations
- `/delight` — micro-interactions
- `/onboard` — onboarding flow
- `/web-design-guidelines` — Vercel standards audit

---

## Key People

Solo project — **God (Houcine)** builds everything.
Second brain / thinking partner: **Claudian** (in Obsidian vault at `C:\Users\demxa\Desktop\HBrain`)
