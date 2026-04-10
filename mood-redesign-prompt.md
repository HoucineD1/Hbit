# Hbit — State of Mind Module Complete Redesign
## Final IDE Prompt for Implementation

---

## 1. Project Context

Hbit is a personal growth web app — **vanilla JS + Firebase/Firestore**, bilingual EN/FR. No framework, no bundler. The State of Mind module lives in exactly three files you will rewrite completely:

| File | Role |
|------|------|
| `mood.html` | Page markup + sidebar nav |
| `css/pages/mood.css` | All mood-specific styles |
| `js/pages/mood.js` | All mood logic (IIFE pattern, attached to `window.HBIT`) |

**Shared files you must NOT modify:**
`styles.css`, `css/core/nav.css`, `js/core/db.js`, `js/core/core.js`, `js/core/nav.js`, `js/core/i18n.js`, `js/core/firebase-init.js`, `js/app.js`

**Firebase SDK:** compat v10, already loaded via `<script>` tags.

**Auth pattern:** `HBIT.onReady(callback)` fires once auth is confirmed. Inside, `firebase.auth().currentUser` is the signed-in user. All Firestore calls go through `HBIT.db.*`.

---

## 2. Critical Problem to Fix First: Storage Migration

**The current `mood.js` stores all data in `localStorage`. This is wrong — every other Hbit module uses Firestore.** Data stored in localStorage is lost if the user clears their browser, doesn't sync across devices, and is invisible to the home dashboard.

**The fix:** Migrate completely to `HBIT.db.moodLogs` which already exists in `db.js`.

### Existing `HBIT.db.moodLogs` API (use these, do not rewrite db.js):
```js
HBIT.db.moodLogs.set(dateKey, logObj)   // create/overwrite for a date
HBIT.db.moodLogs.get(dateKey)           // fetch one date's log
HBIT.db.moodLogs.recent(n)             // last N logs, newest first
HBIT.db.moodLogs.range(start, end)     // date range query
```

### Existing Firestore schema for `moodLogs` (`/users/{uid}/moodLogs/{YYYY-MM-DD}`):
```
date      string   YYYY-MM-DD
score     number   1–10  (overall mood — existing field)
energy    number   1–10
stress    number   1–10  (10 = very stressed)
focus     number   1–10
notes     string
tags      string[]
createdAt Timestamp
```

### Extended schema — add these fields (use `{ merge: true }` so existing docs aren't broken):
```
mood      number   1–5   (the primary mood score — maps to color band)
social    number   1–5
emotion   string   selected emotion chip label
impact    string   selected impact chip label
impactQ   string   free text — "what impacted your day?"
triggerQ  string   free text — "what was the main trigger?"
actionQ   string   free text — "one action you can take now?"
streak    number   (do not store in moodLogs — compute at read time, see section 6)
```

**Migration function** — call once on page load to silently migrate any localStorage data:
```js
async function migrateLegacyData() {
  const KEY_HIST = "life_mood7_history";
  try {
    const raw = localStorage.getItem(KEY_HIST);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return;
    for (const entry of arr) {
      const dk = entry.dateKey || new Date(entry.ts).toISOString().slice(0,10);
      if (!dk) continue;
      // Normalize legacy 1-7 values to 1-5
      const norm = v => Math.max(1, Math.min(5, Math.round(((Math.max(1,Math.min(7,v||3))-1)*4)/6+1)));
      await HBIT.db.moodLogs.set(dk, {
        mood:     norm(entry.mood),
        stress:   norm(entry.stress),
        energy:   norm(entry.energy),
        focus:    norm(entry.focus),
        social:   norm(entry.social),
        score:    entry.overall || norm(entry.mood),
        emotion:  entry.emotion || "",
        impact:   entry.impact  || "",
        impactQ:  entry.impactQ || "",
        triggerQ: entry.triggerQ || "",
        actionQ:  entry.actionQ  || "",
        notes:    entry.note     || "",
        tags:     [],
      });
    }
    localStorage.removeItem(KEY_HIST);
    localStorage.removeItem("life_mood7_today");
    console.log("[Hbit mood] Migrated", arr.length, "legacy entries to Firestore");
  } catch(e) {
    console.warn("[Hbit mood] Migration skipped:", e.message);
  }
}
```

---

## 3. Core Design Philosophy

The page name is **"State of Mind"** — not "Mood." This distinction matters for design. It's not a simple happy/sad tracker. It's a multi-dimensional daily check-in that treats the user as an adult.

**Design principles (backed by psychology research):**
- **No emojis** — use color + typography + abstract design instead. Emojis feel juvenile for this context. Color psychology is more powerful and adult.
- **Color IS the UI** — the selected mood drives the visual atmosphere of the entire page (background tint, accent color, gradient). The page *feels* like the user's current state.
- **5-point scale is optimal** — validated by Profile of Mood States (POMS) research. Not 3 (too coarse), not 10 (too fatiguing).
- **Log in one tap, go deeper optionally** — capture state instantly, reflection is optional. Never block saving.
- **No red = bad / green = good binary** — use a more nuanced, adult palette that avoids stigmatizing negative moods.

### Mood Color Palette (non-stigmatizing, warm, adult):
```
1 — Very difficult  →  deep indigo/slate   #4338CA  (calm, heavy, not alarming red)
2 — Difficult       →  muted mauve/violet  #7C3AED
3 — Okay            →  warm amber/sand     #D97706
4 — Good            →  soft sage green     #059669
5 — Great           →  warm teal/aqua      #0891B2
```

These colors avoid the anxiety-inducing red and the clinical green. They're inspired by how wellness apps like Reflectly and How We Feel handle color — warm, considered, non-medical.

---

## 4. Page Structure

```
[Header — existing, keep exactly as-is]

[TODAY CARD — hero section]
  ├── Mood selector: 5 large color-coded tap targets (no emoji — color + word only)
  ├── Selected state: full page background tint shifts to mood color
  ├── "That's it" — instant save button (appears after tap)
  └── "Tell me more →" — expands to optional depth section

[OPTIONAL DEPTH SECTION — collapsed by default, expands inline]
  ├── Sub-dimensions: Energy · Stress · Focus · Social (compact sliders)
  ├── Emotion chips (contextual to mood band)
  ├── Impact chips
  └── Optional note field + Save button

[WEEKLY INSIGHT CARD]
  └── Auto-generated sentence: "This week your best days correlated with good sleep"

[LAST 7 ENTRIES — card list]
  └── Beautiful entry cards with color, emotion tag, date, note

[STREAK INDICATOR]
  └── "🔥 8-day streak" (if > 1 day) — simple, motivating

[SLEEP CORRELATION BANNER — conditional]
  └── "Last night you slept 5h. On low-sleep days your mood averages Difficult."
      (reads from HBIT.sleep.lastNightSummary if available)
```

---

## 5. Detailed Feature Specifications

---

### 5.1 Today Card — Mood Selector

**The primary UI.** Five large rectangular tap targets stacked vertically on mobile, or in a single row on desktop. Each is a color block with a single word label. No emojis.

```
┌─────────────────────────────────────────────┐
│  ████████████████  Very difficult           │  ← deep indigo block, label right
├─────────────────────────────────────────────┤
│  ████████████████  Difficult                │  ← muted violet
├─────────────────────────────────────────────┤
│  ████████████████  Okay                     │  ← warm amber
├─────────────────────────────────────────────┤
│  ████████████████  Good                     │  ← sage green
├─────────────────────────────────────────────┤
│  ████████████████  Great                    │  ← warm teal
└─────────────────────────────────────────────┘
```

**On tap:**
1. Selected option expands slightly, gets a stronger color + a subtle checkmark indicator
2. Page background tints to the selected mood color (e.g. teal tint fills behind everything — subtle, not overwhelming)
3. Two buttons appear below the selector:
   - **"Save"** — saves immediately with just this one value, closes
   - **"Add details →"** — expands the depth section below without navigating away

**If user already logged today:** Show the selector with their current choice pre-selected. Show an "Edit" label. Saving overwrites.

**Color behavior:** Use `data-mood-band` attribute on `<body>` or `<main>` instead of the current `data-mood-tone`. CSS variables handle the rest:
```css
[data-mood-band="1"] { --md-color: #4338CA; --md-color-soft: rgba(67,56,202,.10); }
[data-mood-band="2"] { --md-color: #7C3AED; --md-color-soft: rgba(124,58,237,.10); }
[data-mood-band="3"] { --md-color: #D97706; --md-color-soft: rgba(217,119,6,.10); }
[data-mood-band="4"] { --md-color: #059669; --md-color-soft: rgba(5,150,105,.10); }
[data-mood-band="5"] { --md-color: #0891B2; --md-color-soft: rgba(8,145,178,.10); }
```

**French labels:**
```
1 → Très difficile
2 → Difficile
3 → Ça va
4 → Bien
5 → Super
```

---

### 5.2 Optional Depth Section (inline expand)

Appears below the selector when user taps "Add details →". Animate in with a smooth expand (CSS max-height transition).

**Sub-dimensions** — 4 compact horizontal sliders in a 2×2 grid:

```
Energy  [━━━━━━○──────]  Okay     │  Stress  [━━━━━━━━━○──]  High
Focus   [━━━━━━━━○────]  Good     │  Social  [━━○──────────]  Low
```

Each slider: 1–5, label on left, current value word on right. Minimal — no pills, no giant labels. Use the same 5 color-coded labels as the main selector but abbreviated.

**Emotion chips** — contextual to the selected mood band. Keep the existing emotion sets from the current `mood.js` (they are excellent — 30+ options per band, bilingual). Display as compact wrapping chip buttons:

```
[ Overwhelmed ]  [ Anxious ]  [ Stressed ]  [ Tired ]  [ Show more + ]
```

- Only show base set by default (7 chips)
- "Show more" expands to show all. State in `sessionStorage` per session.
- Selected chip gets mood color border + background tint
- Only one chip selectable at a time

**Impact chips** — same pattern, keep existing impact sets from `mood.js`. Single select.

**Note field** — single `<textarea>`, 2 rows, placeholder: "Anything else on your mind?" (FR: "Autre chose en tête ?"). Optional.

**Save button** — full-width, mood color, label "Save" (FR: "Enregistrer"). Saves all data to Firestore and closes the depth section.

---

### 5.3 Quick Save Flow (the critical path)

This is the most important UX flow. It must be frictionless:

```
1. User opens page
2. Sees 5 color blocks
3. Taps one (e.g. "Good")
4. Background tints green, "Save" and "Add details →" appear
5. Taps "Save"
6. Saved. Today card updates to show "Good" with time logged.
   Total time: ~3 seconds
```

**What gets saved on quick save:**
```js
await HBIT.db.moodLogs.set(todayKey(), {
  mood:     selectedBand,     // 1–5
  score:    selectedBand * 2, // map to 1–10 scale for db compat
  energy:   null,
  stress:   null,
  focus:    null,
  social:   null,
  emotion:  "",
  impact:   "",
  notes:    "",
  tags:     [],
});
```

**After saving:** The selector cards collapse into a compact "today summary" pill showing the color + label + time. An "Edit" ghost button appears to re-open the depth section.

---

### 5.4 Weekly Insight Card

A single card that auto-generates one meaningful sentence per week based on the last 7 Firestore logs. Runs client-side — no AI, no external call.

**Logic (compute in `generateWeeklyInsight(logs)`):**

```js
function generateWeeklyInsight(logs) {
  // logs = last 7 from HBIT.db.moodLogs.recent(7)
  if (logs.length < 3) return null; // not enough data

  const lang = getLang();
  const avg = logs.reduce((s,l) => s+(l.mood||3), 0) / logs.length;
  const best = logs.reduce((a,b) => (b.mood||0) > (a.mood||0) ? b : a);
  const worst = logs.reduce((a,b) => (b.mood||0) < (a.mood||0) ? b : a);

  // Find most common emotion
  const emotions = logs.map(l=>l.emotion).filter(Boolean);
  const topEmotion = emotions.sort((a,b) =>
    emotions.filter(v=>v===b).length - emotions.filter(v=>v===a).length
  )[0];

  // Check sleep correlation (if HBIT.sleep is available)
  const sleepSummary = HBIT.sleep?.lastNightSummary;

  // Generate insight sentence
  const avgBand = Math.round(avg);
  const dayName = new Date(best.date+'T12:00').toLocaleDateString(lang==='fr'?'fr-FR':'en-US', {weekday:'long'});

  const templates = {
    en: [
      avg >= 4   ? `A strong week — you averaged "${moodLabel(avgBand,'en')}" across ${logs.length} days.` : null,
      avg <= 2   ? `A tough week. You logged "${moodLabel(avgBand,'en')}" on average — be kind to yourself.` : null,
      topEmotion ? `Your most common feeling this week was "${topEmotion}".` : null,
      best       ? `${dayName} was your best day this week.` : null,
    ].filter(Boolean),
    fr: [
      avg >= 4   ? `Belle semaine — tu as moyenné "${moodLabel(avgBand,'fr')}" sur ${logs.length} jours.` : null,
      avg <= 2   ? `Semaine difficile. Tu as moyenné "${moodLabel(avgBand,'fr')}" — sois indulgent avec toi-même.` : null,
      topEmotion ? `Ton ressenti le plus fréquent cette semaine : "${topEmotion}".` : null,
      best       ? `${dayName} était ta meilleure journée de la semaine.` : null,
    ].filter(Boolean),
  };

  const pool = templates[lang] || templates.en;
  return pool[0] || null; // return the most relevant insight
}
```

**Card design:**
```
┌──────────────────────────────────────────────┐
│  📊 This week                                │
│                                              │
│  "A strong week — you averaged 'Good'        │
│   across 6 days."                            │
│                                              │
│  Mon ▪ Tue ▪ Wed ▪ Thu ▪ Fri ▪ Sat ▪ Sun    │
│  ████  ███  █████  ████  ███  ████  ██       │  ← 7-day mini color bars
└──────────────────────────────────────────────┘
```

The 7 mini bars are colored with `--md-color` for each day's mood band. Missing days = gray. This is the only chart on the page.

**Future hook** (add as a comment): Video suggestions, articles, and breathing exercises will attach here based on `avgBand`. Leave a `<!-- FUTURE: resource suggestions based on weekly mood -->` comment.

---

### 5.5 Last 7 Entries — Card List

Beautiful, scannable cards. No raw text like "Emotion: X • Impact: Y". Design each card properly.

```
┌──────────────────────────────────────────────┐
│  ████  Good                    Today, 8:42pm  │  ← color swatch + label + date
│        [ Motivated ]  [ Work/School ]          │  ← emotion chip + impact chip (read-only)
│        "Felt productive after the gym"         │  ← note (truncated to 2 lines)
│                                         [Edit] │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  ████  Okay                     Yesterday     │
│        [ Neutral ]                            │
│                                         [Edit] │
└──────────────────────────────────────────────┘
```

- Color swatch = `--md-color` for that entry's mood band
- Chips show read-only (not interactive on the history card)
- Note is shown if present, truncated at 2 lines with CSS
- "Edit" opens the full depth section pre-filled with that day's data
- Date formatting: "Today", "Yesterday", "Monday", then "Mar 24" for older dates
- Max 7 cards shown. No "load more" — keep it lightweight
- Empty state: "No entries yet — log your first day above ↑"

---

### 5.6 Logging Streak

Small pill shown above the entry list when streak ≥ 2 days:

```
🔥 8-day streak
```

**Streak calculation (compute at load time, not stored):**
```js
function calcStreak(logs) {
  // logs sorted newest first from recent()
  if (!logs.length) return 0;
  let streak = 0;
  const today = todayKey();
  let expected = today;
  for (const log of logs) {
    if (log.date === expected) {
      streak++;
      // move expected back one day
      const d = new Date(expected + 'T12:00');
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().slice(0,10);
    } else {
      break;
    }
  }
  return streak;
}
```

If streak = 0 or 1: don't show the pill (no pressure).
If streak ≥ 2: show "🔥 X-day streak" in a warm amber pill.
FR: "🔥 X jours d'affilée"

---

### 5.7 Sleep Correlation Banner (Hbit integration)

Shown conditionally when `HBIT.sleep?.lastNightSummary` is available AND `isBelowTarget === true`:

```html
<div class="md-sleep-banner" id="mdSleepBanner">
  <span class="md-sleep-icon">🌙</span>
  <span class="md-sleep-text">
    Last night you slept <strong>5h 20m</strong>.
    On low-sleep days your mood tends to be lower — be patient with yourself today.
  </span>
  <button class="md-sleep-dismiss" id="mdSleepDismiss">✕</button>
</div>
```

- Only show if `HBIT.sleep.lastNightSummary.isBelowTarget === true`
- Dismiss via `sessionStorage('md-sleep-banner-dismissed-YYYY-MM-DD')`
- Style: indigo/purple tint (sleep color), subtle, not alarming
- FR: "La nuit dernière tu as dormi X. Les jours avec peu de sommeil, ton humeur est souvent plus basse — sois patient avec toi-même."

---

## 6. JavaScript: Complete Function List for `mood.js`

### State object:
```js
const state = {
  uid:          null,
  todayLog:     null,    // today's Firestore log (or null)
  recentLogs:   [],      // last 7 logs from Firestore
  selectedBand: null,    // 1–5, chosen in the selector but not yet saved
  depthOpen:    false,   // whether the depth section is expanded
  streak:       0,
  weekInsight:  null,
};
```

### Functions to implement:

```js
// ── Data ────────────────────────────────────────────────────
async function loadTodayLog()          // HBIT.db.moodLogs.get(todayKey())
async function loadRecentLogs()        // HBIT.db.moodLogs.recent(7)
async function saveMoodQuick(band)     // saves mood + score only
async function saveMoodFull(data)      // saves all fields from depth section
async function migrateLegacyData()     // one-time localStorage → Firestore

// ── UI: Selector ─────────────────────────────────────────────
function renderSelector()              // 5 color cards, pre-select if today logged
function selectBand(band)             // highlight card, tint page, show action buttons
function applyMoodTint(band)          // set data-mood-band on body, update CSS vars

// ── UI: Depth section ────────────────────────────────────────
function openDepthSection(prefill)    // expand with animation, optionally prefill
function closeDepthSection()          // collapse
function renderEmotionChips(band)     // contextual chips from existing emotionSets()
function renderImpactChips()          // from existing impactSets()
function readDepthFormData()          // collect all slider + chip + note values

// ── UI: Today summary ─────────────────────────────────────────
function renderTodaySummary(log)      // compact "logged at X:XX" view after saving
function renderTodayEmpty()           // default empty state before logging

// ── UI: History ────────────────────────────────────────────────
function renderEntryCards(logs)       // 7 entry cards
function formatEntryDate(dateStr)     // "Today" / "Yesterday" / "Monday" / "Mar 24"

// ── UI: Insights ───────────────────────────────────────────────
function renderWeeklyInsight(logs)    // auto-generated sentence + mini bars
function generateWeeklyInsight(logs)  // returns insight string or null
function renderMiniBarChart(logs)     // 7 colored bars in the insight card
function renderStreak(logs)           // shows streak pill if ≥ 2

// ── UI: Sleep banner ───────────────────────────────────────────
function handleSleepBanner()          // check HBIT.sleep, show/hide banner

// ── Helpers ────────────────────────────────────────────────────
function todayKey()                    // YYYY-MM-DD
function moodLabel(band, lang)         // "Good" / "Bien" etc.
function moodColor(band)               // CSS color string
function overallScore(data)            // weighted score from sub-dimensions
function calcStreak(logs)              // returns number
function getLang()                     // 'en' | 'fr'
function showToast(msg, ms)            // non-blocking toast

// ── Keep from current code ─────────────────────────────────────
// emotionSets(lang)    — excellent, keep entirely
// impactSets(lang)     — excellent, keep entirely
// scaleLabel(v, lang)  — keep, use for sub-dimension labels
// MOOD_COLORS          — replace with new palette (see section 3)
```

### Initialization flow:
```js
HBIT.onReady(async (user) => {
  state.uid = user.uid;

  // Migrate legacy data first (silent, once)
  await migrateLegacyData();

  // Load data in parallel
  const [todayLog, recentLogs] = await Promise.all([
    loadTodayLog(),
    loadRecentLogs(),
  ]);

  state.todayLog   = todayLog;
  state.recentLogs = recentLogs;
  state.streak     = calcStreak(recentLogs);
  state.weekInsight = generateWeeklyInsight(recentLogs);

  // Expose cross-module hook
  HBIT.mood = HBIT.mood || {};
  HBIT.mood.todaySummary = {
    band:     todayLog?.mood || null,
    label:    todayLog ? moodLabel(todayLog.mood, getLang()) : null,
    logged:   !!todayLog,
  };

  renderAll();
  bindEvents();
  handleSleepBanner();
});

function renderAll() {
  updateDateDisplay();
  if (state.todayLog) {
    renderSelector(); // pre-selected with today's value
    renderTodaySummary(state.todayLog);
  } else {
    renderTodayEmpty();
    renderSelector();
  }
  renderStreak(state.recentLogs);
  renderWeeklyInsight(state.recentLogs);
  renderEntryCards(state.recentLogs);
}
```

### Event binding:
```js
function bindEvents() {
  // Mood selector cards
  document.querySelectorAll('.md-band-card').forEach(card => {
    card.addEventListener('click', () => {
      const band = parseInt(card.dataset.band);
      selectBand(band);
    });
  });

  // Quick save
  document.getElementById('mdSaveQuick')?.addEventListener('click', async () => {
    if (!state.selectedBand) return;
    await saveMoodQuick(state.selectedBand);
    // Reload today and history
    state.todayLog   = await loadTodayLog();
    state.recentLogs = await loadRecentLogs();
    state.streak     = calcStreak(state.recentLogs);
    renderAll();
    showToast(getLang()==='fr' ? 'Humeur enregistrée ✓' : 'Mood saved ✓');
  });

  // Add details
  document.getElementById('mdOpenDepth')?.addEventListener('click', () => {
    openDepthSection(state.todayLog);
  });

  // Full save (from depth section)
  document.getElementById('mdSaveFull')?.addEventListener('click', async () => {
    const data = readDepthFormData();
    data.mood  = state.selectedBand || state.todayLog?.mood || 3;
    data.score = data.mood * 2;
    await saveMoodFull(data);
    closeDepthSection();
    state.todayLog   = await loadTodayLog();
    state.recentLogs = await loadRecentLogs();
    state.streak     = calcStreak(state.recentLogs);
    renderAll();
    showToast(getLang()==='fr' ? 'Enregistré ✓' : 'Saved ✓');
  });

  // Edit today
  document.getElementById('mdEditToday')?.addEventListener('click', () => {
    openDepthSection(state.todayLog);
  });

  // Sleep banner dismiss
  document.getElementById('mdSleepDismiss')?.addEventListener('click', () => {
    sessionStorage.setItem(`md-sleep-banner-dismissed-${todayKey()}`, '1');
    document.getElementById('mdSleepBanner')?.remove();
  });
}
```

---

## 7. CSS Architecture

### New design tokens (add to `mood.css`):
```css
/* ── Mood band colors ─────────────────────────────────────── */
:root {
  --md-band-1: #4338CA;       /* very difficult — deep indigo */
  --md-band-1-soft: rgba(67,56,202,.10);
  --md-band-2: #7C3AED;       /* difficult — muted violet */
  --md-band-2-soft: rgba(124,58,237,.10);
  --md-band-3: #D97706;       /* okay — warm amber */
  --md-band-3-soft: rgba(217,119,6,.10);
  --md-band-4: #059669;       /* good — sage green */
  --md-band-4-soft: rgba(5,150,105,.10);
  --md-band-5: #0891B2;       /* great — warm teal */
  --md-band-5-soft: rgba(8,145,178,.10);

  /* Active mood color (set by JS via data-mood-band) */
  --md-color: var(--md-band-3);
  --md-color-soft: var(--md-band-3-soft);
}

/* Cascade active color from band attribute */
[data-mood-band="1"] { --md-color: var(--md-band-1); --md-color-soft: var(--md-band-1-soft); }
[data-mood-band="2"] { --md-color: var(--md-band-2); --md-color-soft: var(--md-band-2-soft); }
[data-mood-band="3"] { --md-color: var(--md-band-3); --md-color-soft: var(--md-band-3-soft); }
[data-mood-band="4"] { --md-color: var(--md-band-4); --md-color-soft: var(--md-band-4-soft); }
[data-mood-band="5"] { --md-color: var(--md-band-5); --md-color-soft: var(--md-band-5-soft); }
```

### New component classes:
```css
/* ── Page tint (animates when mood selected) ──────────────── */
.md-main { transition: background-color 0.4s ease; }
.md-main.tinted { background: var(--md-color-soft); }

/* ── Mood selector ───────────────────────────────────────── */
.md-selector { }                  /* container */
.md-band-card { }                 /* each clickable row */
.md-band-card .md-band-swatch { } /* colored rectangle left side */
.md-band-card .md-band-label { }  /* word label */
.md-band-card.selected { }        /* expanded + check indicator */
.md-selector-actions { }          /* Save + Add details buttons — hidden until selection */
.md-btn-save { }                  /* primary save button */
.md-btn-details { }               /* ghost "Add details →" button */

/* ── Today summary (post-log) ────────────────────────────── */
.md-today-summary { }             /* compact pill row */
.md-today-edit { }                /* ghost edit button */

/* ── Depth section ───────────────────────────────────────── */
.md-depth { max-height: 0; overflow: hidden; transition: max-height 0.35s ease; }
.md-depth.open { max-height: 1000px; }
.md-subdim-grid { }               /* 2x2 grid of sliders */
.md-subdim-row { }                /* label + slider + value */
.md-subdim-label { }
.md-subdim-val { }                /* current value word */
.md-chips { }                     /* chip grid */
.md-chip { }                      /* individual chip */
.md-chip.active { border-color: var(--md-color); background: var(--md-color-soft); }
.md-chip-more { }                 /* "Show more" button */
.md-note { }                      /* textarea */
.md-btn-save-full { }             /* full save button in depth */

/* ── Weekly insight card ─────────────────────────────────── */
.md-insight-card { }
.md-insight-text { }              /* the auto-generated sentence */
.md-mini-bars { }                 /* 7-day bar container */
.md-mini-bar { }                  /* single day bar */
.md-mini-bar.empty { }            /* missing day */

/* ── Entry cards ─────────────────────────────────────────── */
.md-entry-card { }
.md-entry-swatch { }              /* color strip on left edge */
.md-entry-label { }               /* mood word */
.md-entry-date { }
.md-entry-chips { }               /* emotion + impact chips (read-only) */
.md-entry-note { }                /* note text, 2-line clamp */
.md-entry-edit { }                /* edit ghost button */
.md-entries-empty { }             /* empty state */

/* ── Streak pill ─────────────────────────────────────────── */
.md-streak { }                    /* amber pill, hidden if streak < 2 */

/* ── Sleep banner ────────────────────────────────────────── */
.md-sleep-banner { }              /* indigo/purple tint banner */
.md-sleep-dismiss { }

/* ── Toast ───────────────────────────────────────────────── */
.md-toast { }                     /* bottom center, fade in/out */
.md-toast.visible { }
```

---

## 8. Responsive Layout

```
Mobile (< 640px)
  • Selector: 5 stacked full-width rows (each ~56px tall)
  • Depth section: single column
  • Entry cards: full width
  • Page tint: covers full background

Tablet (640–1024px)
  • Selector: same stacked layout, max-width 560px centered
  • Sub-dimension sliders: 2-column grid
  • Entry cards: slightly wider padding

Desktop (> 1024px)
  • Two-column layout: left = selector + today summary; right = insight + entries
  • Max-width 900px, centered
  • Depth section: expands below the selector (left column), pushes right column down
```

---

## 9. i18n Keys

Add to the translation system:

```js
// EN
'mood.title':           "State of Mind",
'mood.leadin':          "How are you today?",
'mood.band.1':          "Very difficult",
'mood.band.2':          "Difficult",
'mood.band.3':          "Okay",
'mood.band.4':          "Good",
'mood.band.5':          "Great",
'mood.save':            "Save",
'mood.addDetails':      "Add details →",
'mood.loggedAt':        "Logged at {time}",
'mood.edit':            "Edit",
'mood.editToday':       "Edit today",
'mood.energy':          "Energy",
'mood.stress':          "Stress",
'mood.focus':           "Focus",
'mood.social':          "Social",
'mood.emotionTitle':    "What emotion fits best?",
'mood.impactTitle':     "What had the most impact?",
'mood.notePlaceholder': "Anything else on your mind?",
'mood.saveAll':         "Save",
'mood.showMore':        "Show more",
'mood.showLess':        "Show less",
'mood.weekInsight':     "This week",
'mood.streak':          "{n}-day streak",
'mood.entries':         "Recent entries",
'mood.noEntries':       "No entries yet — log your first day above ↑",
'mood.savedToast':      "Mood saved ✓",
'mood.today':           "Today",
'mood.yesterday':       "Yesterday",
'mood.sleepBanner':     "Last night you slept {hours}. On low-sleep days your mood tends to be lower — be patient.",
'mood.sleepBannerDismiss': "Dismiss",

// FR
'mood.title':           "État d'esprit",
'mood.leadin':          "Comment tu te sens aujourd'hui ?",
'mood.band.1':          "Très difficile",
'mood.band.2':          "Difficile",
'mood.band.3':          "Ça va",
'mood.band.4':          "Bien",
'mood.band.5':          "Super",
'mood.save':            "Enregistrer",
'mood.addDetails':      "Ajouter des détails →",
'mood.loggedAt':        "Enregistré à {time}",
'mood.edit':            "Modifier",
'mood.editToday':       "Modifier aujourd'hui",
'mood.energy':          "Énergie",
'mood.stress':          "Stress",
'mood.focus':           "Focus",
'mood.social':          "Social",
'mood.emotionTitle':    "Quelle émotion te correspond ?",
'mood.impactTitle':     "Qu'est-ce qui a eu le plus d'impact ?",
'mood.notePlaceholder': "Autre chose en tête ?",
'mood.saveAll':         "Enregistrer",
'mood.showMore':        "Afficher plus",
'mood.showLess':        "Afficher moins",
'mood.weekInsight':     "Cette semaine",
'mood.streak':          "{n} jours d'affilée",
'mood.entries':         "Entrées récentes",
'mood.noEntries':       "Aucune entrée — enregistre ta première journée ci-dessus ↑",
'mood.savedToast':      "Humeur enregistrée ✓",
'mood.today':           "Aujourd'hui",
'mood.yesterday':       "Hier",
'mood.sleepBanner':     "La nuit dernière tu as dormi {hours}. Les jours avec peu de sommeil, l'humeur est souvent plus basse — sois patient.",
'mood.sleepBannerDismiss': "Fermer",
```

---

## 10. Future Hooks (add as comments in code, do not implement now)

```js
// FUTURE: Video suggestions based on mood band
// When weekInsight.avgBand <= 2, suggest a breathing or relaxation video
// Resource library will live at HBIT.resources.mood[band] = { video, article }
// Add a placeholder card below the weekly insight: "<!-- FUTURE: resources card -->"

// FUTURE: Article suggestions based on emotion tag
// e.g. if emotion === "Anxious" → link to anxiety management article
// Will be driven by a static JSON map of emotion → resource

// FUTURE: Breathing exercise shortcut
// A "Take a breath" button that links to the breathing modal in sleep.js
// HBIT.sleep.openBreathingModal() will be the cross-module call
```

---

## 11. Edge Cases

| Scenario | Behavior |
|----------|----------|
| No logs yet (new user) | Empty state message, no insight card, no streak, no sleep banner |
| Logged today already | Selector shows pre-selected, shows "Edit today" instead of "Save" |
| Only 1-2 logs total | No weekly insight (not enough data message: "Log a few more days for insights") |
| Streak = 1 or 0 | Don't show streak pill — no pressure on new users |
| `HBIT.sleep` not available | Skip sleep banner silently |
| Firestore write fails | Show error toast, keep UI in current state, do not clear selection |
| Legacy localStorage data exists | Migrate silently on first load, remove from localStorage after |
| User taps "Save" without selecting | Button is disabled until a band is selected — disable + dim it |
| Depth section: no emotion/impact selected | Save without them — they are always optional |
| Sub-dimension sliders not touched | Save as `null` (not 3) — null means "not rated", 3 means "okay" |

---

## 12. What NOT to Touch

- `.sb-*` sidebar classes and HTML — shared, do not change
- `.md-header` — keep exactly as-is
- `HBIT.db.moodLogs` API — use as-is, do not rewrite
- `HBIT.onReady()`, `HBIT.i18n.t()`, `firebase.auth()` — use as-is
- `app.js`, `core.js`, `nav.js`, `firebase-init.js` — do not touch
- `emotionSets(lang)` and `impactSets(lang)` — these are excellent, keep them entirely

---

## 13. File Delivery

Provide **complete, drop-in files** — no diffs, no partials:

1. **`mood.html`** — full file
2. **`css/pages/mood.css`** — full file
3. **`js/pages/mood.js`** — full file (includes migration function, full Firestore integration, all new UI logic)

All three files must work together when dropped directly into the project with no other changes.
