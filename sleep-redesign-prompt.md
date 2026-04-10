# Hbit — Sleep Module Complete Redesign
## Final IDE Prompt for Implementation

---

## 1. Project Context

Hbit is a personal growth web app — **vanilla JS + Firebase/Firestore**, bilingual EN/FR. No framework, no bundler. The sleep module lives in exactly three files you will rewrite completely:

| File | Role |
|------|------|
| `sleep.html` | Page markup + sidebar nav (sidebar is shared, do not change its classes) |
| `css/pages/sleep.css` | All sleep-specific styles |
| `js/pages/sleep.js` | All sleep logic (IIFE pattern, attached to `window.HBIT`) |

**Shared files you must NOT modify:**
`styles.css`, `css/core/nav.css`, `js/core/db.js`, `js/core/core.js`, `js/core/nav.js`, `js/core/i18n.js`, `js/core/firebase-init.js`, `js/app.js`

**Firebase SDK:** compat v10, already loaded via `<script>` tags.

**Auth pattern:** `HBIT.onReady(callback)` in `core.js` fires once auth state is confirmed. Inside the callback, `firebase.auth().currentUser` is the signed-in user. All Firestore calls use `HBIT.db.*`.

---

## 2. Current Firestore Schema (EXISTING — do not break)

All data lives under `/users/{uid}/...` — no top-level collections.

### `sleepLogs` — `/users/{uid}/sleepLogs/{YYYY-MM-DD}`
```
date       string   YYYY-MM-DD  (also stored as dateKey for compat)
dateKey    string   YYYY-MM-DD
bedtime    string   "HH:MM"     (also stored as sleepTime for compat)
sleepTime  string   "HH:MM"
wakeTime   string   "HH:MM"
duration   number   hours (decimal, e.g. 7.5)
quality    number   1–10
cycles     number
notes      string
createdAt  Timestamp
updatedAt  Timestamp
```

### `sleepPlans` — `/users/{uid}/sleepPlans/{autoId}`
```
date              string   YYYY-MM-DD
bedTimePlanned    string   "HH:MM"
wakeTimePlanned   string   "HH:MM"
targetHours       number
note              string
status            string   "planned" | "completed"
createdAt         Timestamp
```

**Existing `HBIT.db.sleepLogs` API** (keep all calls intact):
- `HBIT.db.sleepLogs.set(dateKey, logObj)` — create/overwrite
- `HBIT.db.sleepLogs.get(dateKey)` — fetch one
- `HBIT.db.sleepLogs.recent(n)` — last N logs, newest first
- `HBIT.db.sleepLogs.delete(dateKey)`
- `HBIT.db.sleepLogs.getMonth(month)` — all logs for YYYY-MM
- `HBIT.db.sleepLogs.range(start, end)` — date range

---

## 3. New Firestore Collections to Add

### A. `sleepSettings` — `/users/{uid}/sleepSettings/default`
One singleton document per user that stores their sleep preferences.

```js
// In db.js — add this new namespace to HBIT.db:
const sleepSettings = {
  _ref() {
    return userSubcollectionRef(getUidOrThrow(), "sleepSettings").doc("default");
  },

  async get() {
    try {
      const doc = await this._ref().get();
      return snap2obj(doc) || {};
    } catch (err) { return logAndThrow("sleepSettings.get", err); }
  },

  async set(fields) {
    try {
      await this._ref().set({
        targetHours:    fields.targetHours    ?? 8,
        defaultWake:    fields.defaultWake    ?? "07:00",
        windDownMins:   fields.windDownMins   ?? 60,
        alarmEnabled:   fields.alarmEnabled   ?? true,
        updatedAt:      now(),
      }, { merge: true });
    } catch (err) { return logAndThrow("sleepSettings.set", err); }
  }
};
```

**Schema:**
```
targetHours    number   daily sleep target (default 8)
defaultWake    string   "HH:MM" — user's usual wake time
windDownMins   number   minutes before bedtime to activate wind-down (default 60)
alarmEnabled   boolean
updatedAt      Timestamp
```

Add `sleepSettings` to the `HBIT.db` export object in `db.js`:
```js
HBIT.db = {
  // ...existing...
  sleepSettings,   // ← ADD THIS
};
```

### B. Extend `sleepLogs` with new optional fields
These fields are written by `saveLog()` — existing logs without them are fine (treat as undefined/null).

```
sleepStart     string   ISO timestamp — when "Ready to Sleep" was pressed (from sessionStorage)
planned        boolean  true if this log was pre-filled from a sleepPlan
windDownDone   number   0–4, how many wind-down items were completed
planId         string   (optional) ID of the sleepPlan this log fulfills
```

Update `HBIT.db.sleepLogs.set()` in `db.js` to include these fields:
```js
async set(date, log) {
  // ...existing code...
  await this._col().doc(date).set({
    date,
    dateKey:       date,
    bedtime,
    sleepTime:     bedtime,
    wakeTime,
    duration,
    quality,
    cycles,
    notes,
    // NEW optional fields (write only if provided):
    ...(log.sleepStart     != null && { sleepStart:     log.sleepStart }),
    ...(log.planned        != null && { planned:        log.planned }),
    ...(log.windDownDone   != null && { windDownDone:   log.windDownDone }),
    ...(log.planId         != null && { planId:         log.planId }),
    // Wearable hook (future — write null now so the field exists):
    wearable: log.wearable || null,
    createdAt: now(),
    updatedAt: now()
  }, { merge: true });
}
```

### C. Add `sleepLogs.getStats(days)` method to `db.js`
```js
/** Returns sleep stats object: { avgDuration, avgQuality, totalDays, debtVsTarget } */
async getStats(days = 7, targetHours = 8) {
  try {
    const logs = await this.recent(days);
    const durations = logs.map(l => l.duration || 0).filter(d => d > 0);
    const qualities = logs.map(l => l.quality || 0).filter(q => q > 0);
    const avgDuration = durations.length ? durations.reduce((a,b)=>a+b,0)/durations.length : 0;
    const avgQuality  = qualities.length  ? qualities.reduce((a,b)=>a+b,0)/qualities.length  : 0;
    const totalActual = logs.reduce((s, l) => s + (l.duration || 0), 0);
    const debtVsTarget = (targetHours * logs.length) - totalActual;
    return { avgDuration, avgQuality, totalDays: logs.length, debtVsTarget, logs };
  } catch (err) { return logAndThrow("sleepLogs.getStats", err); }
},
```

### D. Wearable hook comment (add to `db.js` schema comment)
```js
// FUTURE: wearable field schema (Apple Watch / Oura Ring — not yet implemented):
// wearable: {
//   source:  'apple_watch' | 'oura',
//   hrv:     Number,          // ms — Heart Rate Variability
//   spo2:    Number,          // % — Blood Oxygen
//   stages: {
//     deep:  Number,          // minutes
//     rem:   Number,          // minutes
//     light: Number,          // minutes
//     awake: Number,          // minutes
//   }
// }
```

---

## 4. Navigation & Page Flow

### Two-tab architecture (simple, clear)

```
┌──────────────┬──────────────┐
│  🌙 Tonight  │  📅 History  │
└──────────────┴──────────────┘
```

**Tab: Tonight** (default on every page load)
```
→ Warning banner (if last night < 6h)
→ Hero card
    ├── Tonight's Plan (bedtime + wake + countdown if plan is set)
    └── Sleep Debt + 7-day bars + last-night pill
→ Cycle Calculator ("Find your ideal bedtime")
→ Wind-Down Ritual checklist
→ Weekly Schedule (compact)
→ Device Connect placeholder
```

**Tab: History**
```
→ Month calendar (prev/next nav)
→ Log Past Sleep sheet (existing log overlay system)
```

### Navigation rules:
- Default tab on load: **Tonight**
- Tab state: NOT persisted — always opens on Tonight
- Switching to History tab triggers `loadMonth()` + `renderCalendar()`
- The "Log past sleep" overlay opens as a bottom sheet (same as current — keep `.logOverlay` system)
- "Last night" pill in the hero → switches to History tab AND opens that date's log sheet
- "Edit plan" button in hero → smooth-scrolls to the Cycle Calculator section
- Selecting a cycle card → smooth-scrolls to the "Set as tonight's plan" CTA

### Header (keep exactly as-is):
- Date display, Sleep title, help button (ℹ), language toggle, theme toggle, avatar — no changes

### Sidebar (keep exactly as-is):
- All `.sb-*` classes unchanged. Sleep is the active nav item.

---

## 5. Full Feature Specs

---

### 5.1 Hero Card

Full-width gradient card. Dark mode: deep indigo gradient (`#1e1b4b` → `#312e81`). Light mode: soft lavender tint (`#f5f3ff` → `#ede9fe`).

**Left block — Tonight's Plan:**

```
🌙  23:46          ← large, bold, --sl-accent color
    Sleep at

☀️  07:00          ← normal size
    Wake at

[ 7h 30min · 5 cycles ]  ← badge pill

[ Sleep in 1h 42min ]    ← countdown pill (ONLY shown when user has set a plan)
                           pulses when < 30min remaining
                           shows "Bedtime now 🌙" when time is reached

[ Edit plan ]            ← ghost link, scrolls to cycle calculator
```

**Right block — Sleep Debt:**

Load via `HBIT.db.sleepLogs.getStats(7, settings.targetHours)`.

```
−2h 30min          ← amber if behind, green if ahead/zero
7-day sleep debt

[mini bar chart]   ← existing renderWeekBars(), keep

Last night: 6h 45min · ★ 7   ← pill, clicking opens History tab + log sheet for yesterday
```

**No-data state** (new user, no logs):
- Left: show default plan (5 cycles × 90min − 14min = 23:46 for 07:00 wake)
- Right: show "No data yet — log your first night!" message, no debt shown

---

### 5.2 Cycle Calculator

Full-width card. Section title: "Find your ideal bedtime" with a clock icon.

**Input row:**
```
I want to wake up at  [ 07:00 ▼ ]   (time input, default = settings.defaultWake or "07:00")
```

On input change: immediately re-render the cards below.

**Formula:** `bedtime = wakeTime − (cycles × 90 min) − 14 min`

The 14-minute fall-asleep buffer (sleep onset latency) is **always included and always shown** as a note: `"Includes 14 min to fall asleep"`

**Cycle cards** — 5 cards: 4, 5, 6, 7, 8 cycles:

```
╔════════════╗  ╔════════════╗  ╔════════════╗  ╔════════════╗  ╔════════════╗
║  4 cycles  ║  ║ ⭐5 cycles ║  ║ ⭐6 cycles ║  ║  7 cycles  ║  ║  8 cycles  ║
║            ║  ║            ║  ║            ║  ║            ║  ║            ║
║  10:16 pm  ║  ║  11:46 pm  ║  ║  12:16 am  ║  ║   1:46 am  ║  ║   3:16 am  ║
║    6h      ║  ║    7h 30m  ║  ║    9h      ║  ║  10h 30m   ║  ║    12h     ║
╚════════════╝  ╚════════════╝  ╚════════════╝  ╚════════════╝  ╚════════════╝
                  RECOMMENDED      RECOMMENDED
```

Card behavior:
- Horizontal scroll on mobile (snap scrolling), 5-column grid on desktop
- 5 and 6 cycles: show `⭐ Recommended` badge
- Clicking a card: marks it selected (indigo border), shows preview row below, shows CTA button
- If the bedtime is already in the past for today: show a small note `"for tomorrow night"` on that card

**Preview row** (shown after selecting a card):
```
"Sleep at 11:46 pm → 5 cycles → wake at 07:00 feeling refreshed"
```

**CTA button** (shown after selecting):
```
[ Set 11:46 pm as tonight's plan ]   ← full-width indigo button
```

Clicking CTA:
1. Saves to Firestore: `sleepPlansCol().add({ date: todayKey(), bedTimePlanned: selectedBed, wakeTimePlanned: wakeInput, targetHours, status: 'planned', ... })`
2. Updates the hero card (re-renders left block with new bedtime)
3. Starts the countdown timer
4. Smooth-scrolls back to top of page
5. Shows success toast: `"Tonight's plan set ✓"`

---

### 5.3 Wind-Down Ritual

Card section. Header: `"1 hour before sleep"` with moon icon.

Always visible. Activates visually when within `settings.windDownMins` (default 60) of the planned bedtime — glows softly, header changes to `"Wind-down starts now ✨"`.

**Progress bar at top:** `"3 / 4 complete"` with a thin bar (indigo fill).

**Four checklist items** (tappable cards, toggle on tap):

```
┌──────────────────────────────────────────────────────────┐
│  ○  🟡  Switch to warm light                              │
│         Enable Night Shift or warm light on your phone    │
│         [iPhone →]  [Android →]                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  ○  🍽️  Stop eating                                       │
│         Last meal should be 3+ hours before sleep         │
│         [Mark done]                                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  ○  ⬛  Go grayscale                                       │
│         Reduce stimulation — switch phone to grayscale    │
│         [iPhone →]  [Android →]                            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  ○  🫁  Breathing exercise                                  │
│         4-7-8 method: inhale 4s · hold 7s · exhale 8s    │
│         [Start 3-min guide →]                             │
└──────────────────────────────────────────────────────────┘
```

Checked state: green tint on card, filled checkbox, strikethrough text.

**State storage:** `sessionStorage('sl-winddown-YYYY-MM-DD')` as a JSON array of checked item IDs. Resets automatically each new day (key includes dateKey).

**Deep links (use these exact URLs):**
```
iPhone warm light:   App-Prefs:DISPLAY&path=NIGHT_SHIFT
Android warm light:  intent://settings#Intent;action=android.settings.DISPLAY_SETTINGS;end
iPhone grayscale:    App-Prefs:ACCESSIBILITY&path=DISPLAY_AND_TEXT
Android grayscale:   intent://settings#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end
```

If a deep link fails (catch the click and detect no navigation): show a tooltip with manual instructions below the button. Don't use `alert()`.

**Breathing Modal** (opens on "Start 3-min guide →" click):

Full-screen overlay. Lock `document.body` scroll while open.

Layout:
```
[✕ close]                          ← top right, subtle

         ●                          ← large circle, CSS-animated
      Inhale                        ← phase label
       4 sec                        ← seconds remaining in phase

[━━━━━━━━━━━━━━━━━━━━━░░░░░]       ← total session progress bar (3 min)
   "2:14 remaining"
```

Animation phases (CSS `@keyframes`, driven by JS `setInterval`):
- **Inhale** — 4000ms: circle scales up (`transform: scale(1.0 → 1.4)`), color shifts to calm blue (`#60A5FA`)
- **Hold** — 7000ms: circle holds at scale 1.4, color indigo (`#818CF8`)
- **Exhale** — 8000ms: circle scales back down to 1.0, color fades to dark (`#1e1b4b`)

Total cycle: 19 seconds. Session: 180 seconds (~9.5 cycles).

After 180 seconds: fade to completion state — `"Well done 🌙 Sleep well."` with a close button. Also: auto-check the breathing checklist item.

```js
// Phase controller (add to sleep.js):
const BREATH_PHASES = [
  { label: 'Inhale', secs: 4, scale: 1.4, color: '#60A5FA' },
  { label: 'Hold',   secs: 7, scale: 1.4, color: '#818CF8' },
  { label: 'Exhale', secs: 8, scale: 1.0, color: '#1e1b4b' },
];
const BREATH_TOTAL_MS = 180_000;
// Use setInterval(tick, 1000) to drive countdown
// Track: currentPhaseIndex, timeInPhase, totalElapsed
// On each tick: update label, update circle CSS, update progress bar
```

Background: near-black `#0a0a12` with a radial gradient glow at center.

---

### 5.4 "Ready to Sleep" Button

Full-width button at the bottom of the Wind-Down section. Label: `"Ready to Sleep 🌙"`. Style: large, indigo, prominent.

On click, executes in this order:

**1. Record sleep start time:**
```js
function recordSleepStart() {
  const key = `sl-sleepStart-${todayKey()}`;
  sessionStorage.setItem(key, new Date().toISOString());
}
```

Modify `openLogSheet(dateKey, prefill)` — add this check:
```js
// If opening for yesterday, check if we have a stored sleep start
const yesterdayKey = /* yesterday's YYYY-MM-DD */;
if (dk === yesterdayKey) {
  const stored = sessionStorage.getItem(`sl-sleepStart-${yesterdayKey}`);
  if (stored) {
    const d = new Date(stored);
    const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    if ($("logSleepTime")) $("logSleepTime").value = hhmm;
  }
}
```

**2. Schedule browser alarm:**
```js
async function scheduleWakeAlarm(wakeHhmm) {
  if (!('Notification' in window)) {
    showToast('Notifications not supported on this browser');
    return;
  }
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') {
    showToast('Enable notifications to get your wake-up alarm ⚙️');
    return;
  }

  const wake = timeToDate(wakeHhmm);
  const now  = new Date();
  if (wake <= now) wake.setDate(wake.getDate() + 1);
  const delay = wake.getTime() - now.getTime();

  setTimeout(() => {
    new Notification('Good morning! 🌅', {
      body:             `Wake up — you planned ${wakeHhmm}`,
      icon:             '/favicon.ico',
      tag:              'hbit-wake-alarm',
      requireInteraction: true,
    });
  }, delay);

  showToast(`Alarm set for ${wakeHhmm} ✓`);
}
```

**3. Launch breathing modal:**
Immediately open the breathing modal (defined in 5.3).

**Button state after press:**
- Changes to `"Sleep session started ✓"` (green, disabled)
- Stored in `sessionStorage('sl-ready-YYYY-MM-DD')` — disable for the rest of the day
- Re-enable automatically the next day (check on page load)

**Disclaimer** (small text below button):
`"Keep this tab open for the alarm. For reliability, also set your phone alarm."`

---

### 5.5 Weekly Schedule (Compact)

Small card below the Wind-Down section.

Header: `"Your sleep schedule"` with a calendar icon.

**Controls at top (inline):**
```
Wake time: [ 07:00 ]    Sleep goal: [ 7.5 ▼ ] hours
```

**7-row strip:**
```
Mon   🌙 23:46  →  ☀️ 07:00   7h 30m
Tue   🌙 23:46  →  ☀️ 07:00   7h 30m
Wed   🌙 23:46  →  ☀️ 07:00   7h 30m
Thu   🌙 23:46  →  ☀️ 07:00   7h 30m
Fri   🌙 23:46  →  ☀️ 07:00   7h 30m
Sat   🌙 00:16  →  ☀️ 07:30   7h 30m  (weekends: subtle visual distinction)
Sun   🌙 00:16  →  ☀️ 07:30   7h 30m
```

Keep existing `weeklySchedule()` logic. Wire to new inline controls.

---

### 5.6 History Tab

**Calendar:**
- Keep existing `renderCalendar()` logic exactly
- `calPrev` / `calNext` buttons for month navigation
- Clicking a day opens the log sheet overlay for that date

**Log Sheet (bottom sheet overlay):**
- Keep existing overlay system (`.logOverlay`, `.logClose`, etc.)
- Keep all fields: date, sleep time, wake time, quality slider, notes
- Keep existing save/delete logic
- **New**: when opening yesterday's date, check `sessionStorage` for stored sleep start time and pre-fill it (see 5.4 step 1)

---

### 5.7 Low-Sleep Warning Banner

Show at top of page (below header) when `lastNight.duration < 6` AND not dismissed today.

```html
<div class="sl-warn-banner" id="slWarnBanner" role="alert">
  <span>🌙</span>
  <span id="slWarnText">You slept <strong>5h 20m</strong> last night — be gentle with yourself today.</span>
  <button class="sl-warn-dismiss" id="slWarnDismiss" aria-label="Dismiss">✕</button>
</div>
```

Dismissal: `sessionStorage.setItem('sl-warn-dismissed-YYYY-MM-DD', '1')`. Resets daily.

**Cross-module hook** — add after state loads in `sleep.js`:
```js
// Expose for habits.js and mood.js to read
HBIT.sleep = HBIT.sleep || {};
HBIT.sleep.lastNightSummary = {
  duration:      state.lastNight?.duration || 0,
  quality:       state.lastNight?.quality  || 0,
  isBelowTarget: (state.lastNight?.duration || 0) < 6,
  dateKey:       state.lastNight?.dateKey  || null,
};
```

---

### 5.8 Device Connect Placeholder

Small card at the bottom of the Tonight tab.

```html
<section class="sl-sec sl-sec--devices">
  <div class="sl-sec-head">
    <span class="sl-sec-title">Connect your device</span>
    <span class="sl-sec-sub">Automatic tracking — no manual logging needed.</span>
  </div>
  <div class="sl-device-row">
    <button class="sl-device-btn" data-device="apple-watch" type="button">
      [Apple Watch SVG]
      <span>Apple Watch</span>
      <span class="sl-device-soon">Coming soon</span>
    </button>
    <button class="sl-device-btn" data-device="oura" type="button">
      [Oura Ring SVG — circle/ring shape]
      <span>Oura Ring</span>
      <span class="sl-device-soon">Coming soon</span>
    </button>
  </div>
</section>
```

On click: show a non-blocking tooltip `"We're working on it! 🌙"` that auto-hides after 2 seconds. Use a positioned `<div>` tooltip, NOT `alert()`.

---

## 6. JavaScript: Complete Function List for `sleep.js`

### State object (extend existing):
```js
const state = {
  uid:            null,
  logs:           [],        // logs for current calendar month
  lastNight:      null,      // most recent log
  recentLogs:     [],        // last 7 logs for bars + debt
  calMonth:       null,      // YYYY-MM
  editingDateKey: null,
  settings:       {},        // sleepSettings document
  tonightPlan:    null,      // most recent sleepPlan with status='planned' for today
  sleepDebt:      0,         // hours behind (positive) or ahead (negative)
  countdownTimer: null,      // setInterval handle
  breathTimer:    null,      // setInterval handle for breathing modal
};
```

### Functions to ADD (new):
```js
// Settings
async function loadSettings()                        // loads sleepSettings/default
async function saveSettings(fields)                  // saves sleepSettings/default

// Hero v2
function renderHeroV2()                              // replaces renderHero()
function renderDebtIndicator(debtHours)              // sleep debt display
function startCountdown(bedtimeHhmm)                 // setInterval every 60s
function stopCountdown()                             // clearInterval

// Cycle calculator
function renderCycleCalculator()                     // replaces renderCycleSuggestions()
function selectCycleCard(cycles, bedtime, wake)      // marks card selected, shows preview+CTA
function setTonightsPlan(bedtime, wake)              // saves plan, updates hero, starts countdown

// Wind-down
function renderWindDown()                            // builds checklist HTML
function toggleWindDownItem(itemId)                  // checks/unchecks item
function saveWindDownState()                         // sessionStorage
function loadWindDownState()                         // sessionStorage
function isWithinWindDown()                          // returns true if within windDownMins of bedtime
function activateWindDown()                          // adds .active class to section

// Breathing modal
function openBreathingModal()
function closeBreathingModal()
function runBreathPhase(phaseIndex, elapsed, total)
function endBreathingSession()                       // auto-checks breathing item

// Ready to Sleep
function recordSleepStart()                          // sessionStorage
async function activateReadyToSleep()                // orchestrates all 3 steps
async function scheduleWakeAlarm(wakeHhmm)

// Tabs
function initTabs()
function switchTab(tabName)                          // 'tonight' | 'history'

// Warning banner
function handleWarnBanner()

// Device placeholder
function initDevicePlaceholders()

// Toast notifications
function showToast(msg, durationMs = 3000)           // non-blocking inline toast

// Cross-module
function exposeSleepSummary()

// Weekly schedule (update to use new inline controls)
function renderWeekSchedule()
```

### Functions to KEEP UNCHANGED:
```
suggestedBedtimes()   — but ADD 14-min buffer subtraction
weeklySchedule()      — keep logic, update wire-up to new controls
renderCalendar()      — keep entirely
renderWeekBars()      — keep entirely
setQualityDots()      — keep entirely
openLogSheet()        — keep, add sessionStorage sleep-start pre-fill
closeLogSheet()       — keep
submitLog()           — keep, add sleepStart/windDownDone fields
submitDeleteLog()     — keep
saveLog()             — keep
deleteLog()           — keep
saveSleepPlan()       — keep (used by setTonightsPlan)
loadSleepPlans()      — keep
completePlan()        — keep
deletePlan()          — keep
renderSavedPlans()    — keep (used in History tab)
durationHours()       — keep
formatTime()          — keep
timeToDate()          — keep
pad2()                — keep
todayKey()            — keep
addMinutes()          — keep
```

### Initialization flow:
```js
HBIT.onReady(async (user) => {
  state.uid = user.uid;

  // Load in parallel
  const [settings, , stats] = await Promise.all([
    loadSettings(),
    loadLastNight(),
    HBIT.db.sleepLogs.getStats(7),
  ]);

  state.settings  = settings || {};
  state.sleepDebt = stats?.debtVsTarget || 0;
  state.calMonth  = todayKey().slice(0, 7);

  // Load today's plan
  const plans = await loadSleepPlans();
  state.tonightPlan = plans.find(p => p.date === todayKey() && p.status === 'planned') || null;

  // Expose cross-module
  exposeSleepSummary();

  // Render
  renderAll();
  bindEvents();
  initTabs();
  initDevicePlaceholders();

  // Start countdown if plan exists
  if (state.tonightPlan) {
    startCountdown(state.tonightPlan.bedTimePlanned);
  }

  // Check wind-down activation every minute
  setInterval(() => {
    if (isWithinWindDown()) activateWindDown();
  }, 60_000);
});

function renderAll() {
  updateDateDisplay();
  renderHeroV2();
  renderCycleCalculator();
  renderWindDown();
  loadWindDownState();
  renderWeekSchedule();
  handleWarnBanner();
  // History tab content renders lazily when tab is switched
}
```

---

## 7. CSS: New Classes Required

Add to `css/pages/sleep.css`. Keep all existing `.sl-*` classes — add below them.

```css
/* ── Sleep design tokens ─────────────────────────────────────── */
:root {
  --sl-accent:       #818CF8;   /* indigo — sleep accent */
  --sl-accent-soft:  rgba(129,140,248,.12);
  --sl-accent-glow:  rgba(129,140,248,.25);
  --sl-warn:         #F59E0B;   /* amber */
  --sl-warn-soft:    rgba(245,158,11,.12);
  --sl-good:         #10B981;   /* green */
  --sl-good-soft:    rgba(16,185,129,.12);
  --sl-bad:          #F87171;   /* red */
}

/* ── Hero v2 ─────────────────────────────────────────────────── */
.sl-hero-v2 { }                      /* gradient card */
.sl-hero-plan { }                    /* left block */
.sl-hero-bedtime { }                 /* large bedtime number */
.sl-hero-badge { }                   /* "7h 30m · 5 cycles" pill */
.sl-hero-countdown { }               /* countdown pill */
.sl-hero-countdown.pulse { }         /* animation when < 30min */
.sl-hero-debt-block { }              /* right block */
.sl-debt-val { }                     /* the debt number */
.sl-debt-val.behind { color: var(--sl-warn); }
.sl-debt-val.ahead  { color: var(--sl-good); }
.sl-lastnite-pill { }                /* "Last night: Xh · ★Y" */

/* ── Tabs ────────────────────────────────────────────────────── */
.sl-tabs { }
.sl-tab { }
.sl-tab.active { }
.sl-tab-panel { }
.sl-tab-panel[hidden] { display: none; }

/* ── Warning banner ──────────────────────────────────────────── */
.sl-warn-banner { }                  /* amber warm banner */
.sl-warn-dismiss { }

/* ── Cycle calculator ────────────────────────────────────────── */
.sl-cycle-scroll { }                 /* horizontal scroll container */
.sl-cycle-card { }                   /* individual cycle card */
.sl-cycle-card.recommended { }       /* star + highlight */
.sl-cycle-card.selected { }          /* chosen card */
.sl-cycle-card.past { }              /* dimmed — bedtime already passed */
.sl-cycle-badge { }                  /* "⭐ Recommended" badge */
.sl-cycle-time { }                   /* large time display */
.sl-cycle-meta { }                   /* "X cycles · Yh" */
.sl-cycle-note { }                   /* "for tomorrow night" */
.sl-cycle-preview { }                /* preview sentence after selection */
.sl-cycle-cta { }                    /* "Set Xpm as tonight's plan" button */
.sl-buffer-note { }                  /* "Includes 14 min to fall asleep" */

/* ── Wind-down ───────────────────────────────────────────────── */
.sl-winddown { }                     /* section */
.sl-winddown.active { }              /* glowing state */
.sl-winddown-progress-bar { }        /* thin bar */
.sl-winddown-item { }                /* each card */
.sl-winddown-item.checked { }        /* checked state */
.sl-winddown-check { }               /* checkbox circle */
.sl-winddown-links { }               /* action link row */
.sl-winddown-link { }                /* iOS/Android deep link button */
.sl-winddown-tooltip { }             /* inline fallback tooltip */

/* ── Ready to Sleep ──────────────────────────────────────────── */
.sl-ready-btn { }                    /* large indigo CTA */
.sl-ready-btn.done { }               /* green success state */
.sl-ready-disclaimer { }             /* small text below button */

/* ── Breathing modal ─────────────────────────────────────────── */
.sl-breath-overlay { }               /* full-screen, z-index 1000 */
.sl-breath-inner { }
.sl-breath-circle { }                /* the pulsing circle */
.sl-breath-label { }                 /* phase name */
.sl-breath-secs { }                  /* seconds in phase */
.sl-breath-progress { }              /* session progress bar */
.sl-breath-remaining { }             /* "2:14 remaining" */
.sl-breath-close { }                 /* ✕ close button */
.sl-breath-done { }                  /* completion message */

/* ── Weekly schedule ─────────────────────────────────────────── */
.sl-sched-controls { }               /* wake + duration inline inputs */
.sl-sched-row { }                    /* one day row */
.sl-sched-row.weekend { }            /* visual distinction */

/* ── Device cards ────────────────────────────────────────────── */
.sl-device-row { }
.sl-device-btn { }
.sl-device-soon { }                  /* "Coming soon" badge */
.sl-device-tooltip { }               /* "We're working on it!" tooltip */

/* ── Toast ───────────────────────────────────────────────────── */
.sl-toast { }                        /* bottom-center, fade in/out */
.sl-toast.visible { }
```

---

## 8. Responsive Layout

```
Mobile (< 640px)
  • Single column throughout
  • Cycle cards: horizontal scroll with snap (overflow-x: auto; scroll-snap-type: x mandatory)
  • Hero: plan above, debt below (stacked)
  • Breathing modal: full viewport (100dvh)

Tablet (640–1024px)
  • Hero: two columns (plan left, debt right)
  • Cycle cards: 3-column grid (wrap, last 2 on second row)

Desktop (> 1024px)
  • Two-column page layout: left col = hero + cycle calc + wind-down; right col = weekly schedule + devices
  • Max-width 1100px, centered
  • Cycle cards: 5-column grid, no scroll
```

---

## 9. i18n Keys

Add to the translation system (wherever `HBIT.i18n` keys are defined):

```js
// English
'sleep.tonightsPlan':   "Tonight's plan",
'sleep.sleepAt':        "Sleep at",
'sleep.wakeAt':         "Wake at",
'sleep.editPlan':       "Edit plan",
'sleep.sleepIn':        "Sleep in {time}",
'sleep.bedtimeNow':     "Bedtime now 🌙",
'sleep.noDataHero':     "No data yet — log your first night!",
'sleep.sleepDebt':      "7-day sleep debt",
'sleep.debtBehind':     "behind target",
'sleep.debtAhead':      "on track 🌙",
'sleep.lastNight':      "Last night",
'sleep.tabTonight':     "Tonight",
'sleep.tabHistory':     "History",
'sleep.findBedtime':    "Find your ideal bedtime",
'sleep.wakeGoal':       "I want to wake up at",
'sleep.recommended':    "Recommended",
'sleep.forTomorrow':    "for tomorrow night",
'sleep.bufferNote':     "Includes 14 min to fall asleep",
'sleep.cyclePreview':   "Sleep at {bed} → {cycles} cycles → wake at {wake} feeling refreshed",
'sleep.setAsPlan':      "Set {time} as tonight's plan",
'sleep.planSet':        "Tonight's plan set ✓",
'sleep.winddown':       "1 hour before sleep",
'sleep.winddownActive': "Wind-down starts now ✨",
'sleep.winddownSub':    "Prepare your body and mind for sleep.",
'sleep.warmLight':      "Switch to warm light",
'sleep.warmLightSub':   "Enable Night Shift or warm light mode.",
'sleep.noFood':         "Stop eating",
'sleep.noFoodSub':      "Last meal should be 3+ hours before sleep.",
'sleep.grayscale':      "Go grayscale",
'sleep.grayscaleSub':   "Reduce screen stimulation before bed.",
'sleep.breathing':      "Breathing exercise",
'sleep.breathingSub':   "4-7-8 breathing: inhale 4s · hold 7s · exhale 8s",
'sleep.startBreath':    "Start 3-min guide →",
'sleep.breathProgress': "{done} / {total} complete",
'sleep.readyToSleep':   "Ready to Sleep 🌙",
'sleep.readyDone':      "Sleep session started ✓",
'sleep.alarmSet':       "Alarm set for {time} ✓",
'sleep.alarmDenied':    "Enable notifications to get your wake-up alarm ⚙️",
'sleep.alarmNote':      "Keep this tab open for the alarm. Also set your phone alarm.",
'sleep.inhale':         "Inhale",
'sleep.hold':           "Hold",
'sleep.exhale':         "Exhale",
'sleep.breathDone':     "Well done 🌙 Sleep well.",
'sleep.scheduleTitle':  "Your sleep schedule",
'sleep.warnBanner':     "You slept {hours} last night — be gentle with yourself today.",
'sleep.connectDevice':  "Connect your device",
'sleep.connectSub':     "Automatic tracking — no manual logging needed.",
'sleep.comingSoon':     "Coming soon",
'sleep.comingSoonMsg':  "We're working on it! 🌙",

// French (same keys)
'sleep.tonightsPlan':   "Plan de cette nuit",
'sleep.sleepAt':        "Coucher à",
'sleep.wakeAt':         "Réveil à",
'sleep.editPlan':       "Modifier",
'sleep.sleepIn':        "Dans {time}",
'sleep.bedtimeNow':     "C'est l'heure 🌙",
'sleep.noDataHero':     "Pas encore de données — enregistre ta première nuit !",
'sleep.sleepDebt':      "Dette de sommeil (7j)",
'sleep.debtBehind':     "de retard",
'sleep.debtAhead':      "dans les temps 🌙",
'sleep.lastNight':      "La nuit dernière",
'sleep.tabTonight':     "Cette nuit",
'sleep.tabHistory':     "Historique",
'sleep.findBedtime':    "Trouve ton heure idéale",
'sleep.wakeGoal':       "Je veux me réveiller à",
'sleep.recommended':    "Recommandé",
'sleep.forTomorrow':    "pour demain soir",
'sleep.bufferNote':     "Inclut 14 min pour s'endormir",
'sleep.cyclePreview':   "Coucher à {bed} → {cycles} cycles → réveil à {wake} reposé",
'sleep.setAsPlan':      "Définir {time} comme plan",
'sleep.planSet':        "Plan de nuit enregistré ✓",
'sleep.winddown':       "1 heure avant le coucher",
'sleep.winddownActive': "Routine du soir — c'est maintenant ✨",
'sleep.winddownSub':    "Prépare ton corps et ton esprit au sommeil.",
'sleep.warmLight':      "Passer en lumière chaude",
'sleep.warmLightSub':   "Active Night Shift ou la lumière chaude.",
'sleep.noFood':         "Arrêter de manger",
'sleep.noFoodSub':      "Dernier repas au moins 3h avant le coucher.",
'sleep.grayscale':      "Passer en niveaux de gris",
'sleep.grayscaleSub':   "Réduis la stimulation visuelle.",
'sleep.breathing':      "Exercice de respiration",
'sleep.breathingSub':   "4-7-8 : inspirez 4s · retenez 7s · expirez 8s",
'sleep.startBreath':    "Démarrer le guide 3 min →",
'sleep.breathProgress': "{done} / {total} complétés",
'sleep.readyToSleep':   "Prêt à dormir 🌙",
'sleep.readyDone':      "Session de sommeil lancée ✓",
'sleep.alarmSet':       "Alarme réglée pour {time} ✓",
'sleep.alarmDenied':    "Active les notifications pour ton alarme ⚙️",
'sleep.alarmNote':      "Garde cet onglet ouvert. Règle aussi ton alarme téléphone.",
'sleep.inhale':         "Inspirez",
'sleep.hold':           "Retenez",
'sleep.exhale':         "Expirez",
'sleep.breathDone':     "Bravo 🌙 Bonne nuit.",
'sleep.scheduleTitle':  "Ton planning sommeil",
'sleep.warnBanner':     "Tu as dormi {hours} la nuit dernière — sois indulgent avec toi-même.",
'sleep.connectDevice':  "Connecter un appareil",
'sleep.connectSub':     "Suivi automatique — plus besoin de saisie.",
'sleep.comingSoon':     "Bientôt disponible",
'sleep.comingSoonMsg':  "On y travaille ! 🌙",
```

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|----------|
| New user, zero logs | Hero shows default plan (23:46 / 07:00 / 5 cycles). No debt, no banner, no last-night pill. |
| Last log > 2 days old | Don't show as "last night". Show "No recent log" in the pill. |
| All cycle times already past | Show cards anyway, add "for tomorrow night" note on each. |
| Plan bedtime already past | Countdown shows "Bedtime now 🌙", button stays green if already pressed. |
| Notifications denied | Toast with instructions, graceful degradation, do not throw. |
| `sessionStorage` unavailable | Catch any errors silently. Wind-down state just won't persist. |
| Sleep start stored from 2+ days ago | Only pre-fill if timestamp is from yesterday's date. Otherwise ignore. |
| Wind-down already complete (4/4) | Show "All done — sleep well! 🌙" instead of progress bar. |
| Breathing modal on mobile | `document.body.style.overflow = 'hidden'`, restore on close. |
| `sleepSettings` doc missing | Use hardcoded defaults: `{ targetHours: 8, defaultWake: '07:00', windDownMins: 60 }`. |

---

## 11. What NOT to Touch

- `.sb-*` sidebar classes and all sidebar HTML — shared across every page
- `.sl-header` and all header HTML — keep exactly as-is
- `HBIT.db.sleepLogs.set / get / recent / delete / getMonth / range` — only ADD new fields, don't change signatures
- Theme toggle CSS variable system — it will work automatically
- `HBIT.onReady()`, `HBIT.i18n.t()`, `firebase.auth()` — use exactly as-is
- `app.js`, `core.js`, `nav.js`, `firebase-init.js` — do not touch

---

## 12. File Delivery

Provide **complete, drop-in files** — no diffs, no partials:

1. **`js/core/db.js`** — full file with `sleepSettings` namespace added, `sleepLogs.set()` extended, `sleepLogs.getStats()` added, wearable comment added, `sleepSettings` exported in `HBIT.db`
2. **`sleep.html`** — full file
3. **`css/pages/sleep.css`** — full file
4. **`js/pages/sleep.js`** — full file

Drop any of these files directly into the project and it should work without other changes.
