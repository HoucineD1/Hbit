---
name: ui-master
description: Master UI orchestrator that automatically coordinates ALL your installed design and frontend skills to deliver the highest-quality result. Use this skill for ANY UI-related request — designing, analyzing, critiquing, creating, editing, or improving any interface, component, page, or visual element. Triggers on words like: design, analyze, critique, review, create UI, build component, edit layout, improve interface, make it look better, fix the UI, style this, make it beautiful, what do you think of this design, how does this look. Always use this skill before doing any UI work — it will orchestrate all skills in the right order and save you from missing critical design steps.
---

# UI Master — Full-Stack Design Orchestrator

You are now in **UI Master mode**. Your job is to coordinate every relevant design skill in the right sequence to deliver the best possible result. Think of yourself as a design director who delegates to specialized experts — critique, frontend engineering, motion, accessibility — and synthesizes everything into a single, exceptional output.

## What This Skill Does

This skill orchestrates all of these installed skills in smart phases:

| Phase | Skills Used | Purpose |
|-------|-------------|---------|
| 1. Understand | `frontend-design`, `ckm-design-system`, `web-design-guidelines` | Load design context, standards, tokens |
| 2. Analyze | `critique`, `audit`, `extract` | Diagnose what exists or what's needed |
| 3. Build/Improve | `frontend-design`, `ckm-design`, `ckm-ui-styling`, `shadcn`, `bolder`, `arrange`, `colorize`, `typeset` | Create or refine the interface |
| 4. Elevate | `animate`, `delight`, `overdrive` | Add motion, personality, extraordinary moments |
| 5. Harden | `polish`, `harden`, `optimize`, `normalize`, `adapt`, `audit` | Quality, accessibility, performance |

Not every phase applies to every request — use judgment to skip phases that don't fit the task.

---

## Step 1: Identify the Request Type

Before doing anything, classify the user's request into one of these modes:

- **CREATE** — building something new from scratch (component, page, feature)
- **CRITIQUE** — reviewing or analyzing an existing design
- **EDIT** — improving or modifying something that already exists
- **ANALYZE** — understanding what's there and surfacing issues

This determines which phases to prioritize and which to skip.

---

## Step 2: Load Design Context (Always Required)

**Every single UI task requires project context before producing output.** Generic output without context is worthless.

Run `/frontend-design` now. It contains the **Context Gathering Protocol** — follow it to either:
- Load existing design context from `.impeccable.md` or current instructions
- OR run `/teach-impeccable` if no context exists yet

**Do not skip this step.** Code tells you what was built — it does not tell you who it's for or how it should feel. Only the creator can provide this context.

---

## Step 3: Run the Appropriate Phase Sequence

### For CREATE requests

Execute in this order:

**Phase 1 — Standards**
- Run `/ckm-design-system` to understand token architecture, spacing, and design tokens if they exist
- Check if `shadcn/ui` is in use — if so, `/shadcn` will be the component layer

**Phase 2 — Design & Build**
- Run `/frontend-design` — commit to a bold, specific aesthetic direction. Avoid all anti-patterns listed there (AI slop fingerprints). Make something distinctive.
- If brand identity is involved: run `/ckm-design` for logo, brand, and CIP guidance
- If using shadcn/ui + Tailwind: run `/ckm-ui-styling` for component and styling patterns

**Phase 3 — Amplify**
- Run `/arrange` — ensure layout has rhythm and strong hierarchy
- Run `/typeset` — typography must be intentional, not defaults
- Run `/colorize` — color should communicate, not just decorate
- Run `/bolder` if the result plays it too safe — push for distinctiveness
- Run `/animate` to add meaningful motion and micro-interactions
- Run `/delight` to add personality moments worth remembering

**Phase 4 — Harden**
- Run `/adapt` — make it responsive and touch-friendly
- Run `/harden` — accessibility, semantic HTML, WCAG compliance
- Run `/optimize` — performance, bundle size, rendering
- Run `/normalize` — consistency pass across all elements
- Run `/polish` — final micro-detail pass before delivery

**Phase 5 — Extraordinary (optional)**
- If the user wants to wow or push limits: run `/overdrive`
- Present 2-3 overdrive directions first and let the user pick before implementing

---

### For CRITIQUE requests

Execute in this order:

**Phase 1 — Full Critique**
- Run `/critique` — this is the primary skill. It will:
  - Score against Nielsen's 10 heuristics
  - Check for AI-slop anti-patterns
  - Evaluate emotional journey, hierarchy, and usability
  - Recommend follow-up skills

**Phase 2 — Technical Audit**
- Run `/audit` — checks accessibility, performance, theming, responsive design, and anti-patterns at the code level

**Phase 3 — Persona Testing**
- `/critique` already does persona-based testing. If the user wants deeper research synthesis, suggest `/design:research-synthesis` from the design plugin.

**Phase 4 — Action Plan**
- Synthesize findings from both `/critique` and `/audit` into a unified priority list
- Group issues by P0/P1/P2/P3 severity
- Map each issue to the skill that fixes it
- Present the plan and ask which area to tackle first

---

### For EDIT/IMPROVE requests

Execute in this order:

**Phase 1 — Diagnosis**
- Run `/critique` quickly to understand what's actually wrong (don't assume — diagnose first)
- Run `/audit` for technical issues

**Phase 2 — Targeted Fixes**
Based on what the diagnosis reveals, run only the skills that address the specific issues found. Common patterns:

| Issue Found | Skills to Run |
|-------------|--------------|
| Layout feels off | `/arrange` → `/adapt` |
| Colors look dull or wrong | `/colorize` → `/typeset` |
| Too generic/safe | `/bolder` → `/frontend-design` |
| Missing life/energy | `/animate` → `/delight` |
| Accessibility issues | `/harden` → `/adapt` |
| Performance problems | `/optimize` → `/normalize` |
| Fonts look wrong | `/typeset` |
| Inconsistencies | `/normalize` → `/polish` |

**Phase 3 — Final Polish**
- Always end with `/polish` — it catches the details other skills miss

---

## Step 4: Synthesize and Deliver

After running all relevant skills, do NOT dump raw skill outputs one after another. Instead:

**Synthesize into a unified response:**
1. **What you found** — a single diagnosis summary (if analyzing/editing)
2. **What you built/changed** — the actual output or diff
3. **Why the choices were made** — brief rationale for key design decisions
4. **What to do next** — 2-3 specific next steps or commands

The user asked for the best result — give them one coherent answer, not a playlist of skill reports.

---

## Phase Selection Guide

Use this to decide which phases to run when in doubt:

| User says... | Phases to run |
|-------------|---------------|
| "Design a new [X]" | CREATE: all 5 phases |
| "Build a component for [X]" | CREATE: phases 1, 2, 4 (skip overdrive unless asked) |
| "What do you think of this design?" | CRITIQUE: phases 1, 2, 3 |
| "Is this accessible?" | CRITIQUE: phase 2 only (`/audit`) |
| "Make this look better" | EDIT: diagnosis + targeted fixes + polish |
| "This looks boring" | EDIT: `/bolder` + `/colorize` + `/animate` |
| "Fix the layout" | EDIT: `/arrange` + `/adapt` + `/polish` |
| "Add animations" | EDIT: `/animate` → optionally `/overdrive` |
| "Make it extraordinary" | CREATE/EDIT: all phases + `/overdrive` |
| "Polish this before shipping" | EDIT: `/audit` + `/polish` + `/harden` |

---

## Important Principles

**Design context first, always.** Every skill in this orchestration assumes context exists. If `/frontend-design`'s Context Gathering Protocol finds no context, run `/teach-impeccable` before anything else. This is non-negotiable — generic output wastes everyone's time.

**Diagnose before prescribing.** For EDIT requests especially, run `/critique` or `/audit` first even briefly. Don't assume you know what's wrong. The real issue is often different from what the user describes.

**Quality over speed.** Running all relevant skills takes more time but produces dramatically better output. This skill exists precisely because running them all in sequence gives better results than running any one alone.

**Synthesize, don't dump.** The user gets one coherent, thoughtful response — not a series of skill outputs stapled together. Read everything the skills produce, then write a unified answer that reflects it all.

**Push for distinctiveness.** The `/frontend-design` skill's anti-pattern list exists for a reason — AI-generated work has recognizable fingerprints. Every design that comes through this orchestrator should look like it was made by a human designer with a specific vision, not by a model running defaults. Hold that bar.

**End with `/polish`.** Every EDIT and CREATE workflow should end with a polish pass. Small details — inconsistent spacing, missing states, off-center icons — are what separate shipped from great.

---

## Skill Directory Reference

All skills live in `.agents/skills/` relative to the project root:

**Impeccable skills (pbakaus/impeccable):**
`adapt`, `animate`, `arrange`, `audit`, `bolder`, `clarify`, `colorize`, `critique`, `delight`, `distill`, `extract`, `frontend-design`, `harden`, `normalize`, `onboard`, `optimize`, `overdrive`, `polish`, `quieter`, `teach-impeccable`, `typeset`

**CKM design skills (nextlevelbuilder/ui-ux-pro-max-skill):**
`ckm-design` (logos, CIP, banners, slides, icons, social), `ckm-brand`, `ckm-design-system`, `ckm-ui-styling`, `ckm-banner-design`, `ckm-slides`

**Shadcn skill:**
`shadcn` (component management for shadcn/ui projects)

**Web design guidelines:**
`web-design-guidelines` (UI standards and best practices reference)

Invoke skills using their slash command: `/skill-name` or `/ckm-design`, etc.
