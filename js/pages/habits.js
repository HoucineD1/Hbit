/* ==========================================================
   Hbit � js/pages/habits.js
   Firestore habits � 7-step wizard � SVG donuts � quick log
   ========================================================== */
(function () {
  "use strict";

  /* ?? helpers ??????????????????????????????????????????????? */
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  /* ?? i18n shim ????????????????????????????????????????????? */
  function t(key, fallback) {
    try {
      const v = window.HBIT?.i18n?.t?.(key);
      return (v && v !== key) ? v : (fallback || key);
    } catch (_) { return fallback || key; }
  }

  /* ?? Donut geometry ???????????????????????????????????????? */
  const CARD_R = 19;
  const CARD_CIRC = 2 * Math.PI * CARD_R;   // ? 119.38
  const GOAL_R = 34;
  const GOAL_CIRC = 2 * Math.PI * GOAL_R;   // ? 213.63

  /* ?? Categories ???????????????????????????????????????????? */
  const CATEGORIES = [
    {
      id: "health", label: "Health",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
               <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06
                 a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06
                 a5.5 5.5 0 0 0 0-7.78z"/>
             </svg>`,
    },
    {
      id: "fitness", label: "Fitness",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
               <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
             </svg>`,
    },
    {
      id: "mind", label: "Mind",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/>
               <path d="M12 8v4l3 3"/>
             </svg>`,
    },
    {
      id: "learning", label: "Learning",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
               <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
               <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
             </svg>`,
    },
    {
      id: "finance", label: "Finance",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/>
               <line x1="12" y1="8" x2="12" y2="16"/>
               <path d="M15 9.5a3 3 0 0 0-3-1.5c-1.657 0-3 .895-3 2s1.343 2 3 2
                 s3 .895 3 2-1.343 2-3 2a3 3 0 0 1-3-1.5"/>
             </svg>`,
    },
    {
      id: "sleep", label: "Sleep",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
               <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
             </svg>`,
    },
    {
      id: "social", label: "Social",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
               <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
               <circle cx="9" cy="7" r="4"/>
               <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
               <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
             </svg>`,
    },
    {
      id: "lifestyle", label: "Lifestyle",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="5"/>
               <line x1="12" y1="1" x2="12" y2="3"/>
               <line x1="12" y1="21" x2="12" y2="23"/>
               <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
               <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
               <line x1="1" y1="12" x2="3" y2="12"/>
               <line x1="21" y1="12" x2="23" y2="12"/>
               <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
               <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
             </svg>`,
    },
  ];

  /* ?? Habit presets per category ???????????????????????????? */
  const PRESETS = {
    health:    ["Drink 2L water daily", "No junk food", "Take daily vitamins", "Healthy breakfast", "Cut sugar", "Cook at home"],
    fitness:   ["Morning workout", "Walk 8,000 steps", "Stretch 10 min", "Gym session", "Run 20 min", "Bike ride 30 min"],
    mind:      ["Meditate 10 min", "Daily journaling", "Gratitude practice", "No phone 1h", "Deep breathing", "Read before bed"],
    learning:  ["Read 20 min", "Study 45 min", "Language practice", "Online course lesson", "Review flashcards", "Take notes"],
    finance:   ["Track expenses", "Save 10%", "No impulse buys", "Cook lunch at home", "Weekly budget review", "Cancel unused sub"],
    sleep:     ["Bed by 10:30pm", "No screen before bed", "Consistent wake time", "Evening wind-down", "No caffeine after 2pm", "Dark room"],
    social:    ["Call a friend", "Family dinner", "Random kindness", "Reach out to someone", "Limit social media", "Plan a meetup"],
    lifestyle: ["Make bed daily", "Clean workspace", "Meal prep Sunday", "Evening routine", "Posture check", "Declutter 5 min"],
  };

  const MOTIVATION_CHIPS = ["Health", "Energy", "Confidence", "Stress relief", "Focus", "Family", "Career", "Growth", "Discipline", "Happiness"];
  const OBSTACLE_CHIPS   = ["Time", "Stress", "Phone", "Social plans", "Low energy", "Mood", "Forgetfulness", "Comfort zone"];
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* ?? App state ?????????????????????????????????????????????? */
  const state = {
    uid: null,
    habits: [],       // { id, name, category, intent, frequency, customDays,
                      //   when, goalDays, motivationTags, obstacles,
                      //   difficulty, archived, paused, pinned, doneDays, createdAt }
    todayLogs: {},    // { habitId: { id, status } }
    activeTab: "today",
    detailId: null,
    wizard: {
      open: false,
      step: 0,
      data: {},      // accumulated answers
      editId: null,  // non-null when editing existing habit
    },
  };
  let db = null;

  /* ?? Firestore refs ???????????????????????????????????????? */
  function habitsCol() {
    return db.collection("users").doc(state.uid).collection("habits");
  }
  function logsCol() {
    return db.collection("users").doc(state.uid).collection("habitLogs");
  }
  function onboardingCol() {
    return db.collection("users").doc(state.uid).collection("habitOnboarding");
  }

  /* ?? Data loading ?????????????????????????????????????????? */
  async function loadData() {
    try {
      const [habitsSnap, logsSnap] = await Promise.all([
        habitsCol().get(),
        logsCol().where("dateKey", "==", todayKey()).get(),
      ]);

      state.habits = habitsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return tb - ta;
        });

      state.todayLogs = {};
      logsSnap.docs.forEach((d) => {
        const data = d.data();
        state.todayLogs[data.habitId] = { id: d.id, ...data };
      });
    } catch (err) {
      console.warn("[habits] loadData error:", err);
      state.habits = [];
      state.todayLogs = {};
    }
    renderAll();
  }

  /* ?? Render all ???????????????????????????????????????????? */
  function renderAll() {
    renderTodayStrip();
    renderList();
  }

  function renderTodayStrip() {
    const active = state.habits.filter((h) => !h.archived);
    const done = active.filter((h) => state.todayLogs[h.id]?.status === "done").length;
    const el = $("hbTodayText");
    if (el) el.textContent = `Today: ${done} / ${active.length} done`;
  }

  function renderList() {
    const list = $("hbList");
    const empty = $("hbEmpty");
    if (!list) return;

    const filtered = state.habits.filter((h) => {
      if (state.activeTab === "archived") return !!h.archived;
      if (state.activeTab === "today")    return !h.archived && !h.paused;
      return !h.archived; // "all" shows active + paused
    });

    list.innerHTML = "";
    list.setAttribute("role", "list");

    if (!filtered.length) {
      if (empty) {
        empty.style.display = "flex";
        const title = qs(".hb-empty-title", empty);
        const sub   = qs(".hb-empty-sub", empty);
        const cta   = $("btnEmptyNew");
        if (state.activeTab === "archived") {
          if (title) title.textContent = "No archived habits";
          if (sub)   sub.textContent   = "Habits you archive will appear here.";
          if (cta)   cta.style.display = "none";
        } else {
          if (title) title.textContent = "No habits yet";
          if (sub)   sub.textContent   = "Start with one simple habit and build from there.";
          if (cta)   cta.style.display = "";
        }
      }
      return;
    }
    if (empty) empty.style.display = "none";

    filtered.forEach((h) => {
      list.appendChild(buildCard(h));
    });
  }

  /* -- 7-dot mini-streak approximation ----------------------------------- */
  function build7Dots(doneDays, goalDays) {
    const filled = Math.round(Math.min(7, (doneDays / Math.max(1, goalDays)) * 7));
    return Array.from({ length: 7 }, (_, i) =>
      '<span class="hb-mini-dot' + (i < filled ? ' filled' : '') + '"></span>'
    ).join('');
  }

  function buildCard(h) {
    const log = state.todayLogs[h.id];
    const status = log?.status || null;
    const doneDays = Math.max(0, Number(h.doneDays) || 0);
    const goalDays = Math.max(1, Number(h.goalDays) || 30);
    const pct = Math.min(1, doneDays / goalDays);
    const offset = (CARD_CIRC * (1 - pct)).toFixed(2);
    const pctRound = Math.round(pct * 100);
    const isAllTab = state.activeTab === 'all';

    const statusClass = status === 'done' ? 'hb-status--done'
                      : status === 'skip' ? 'hb-status--skip'
                      : status === 'start' ? 'hb-status--start'
                      : '';
    const statusText = status === 'done' ? 'Done'
                     : status === 'skip' ? 'Skipped'
                     : status === 'start' ? 'Started'
                     : 'Not yet';

    const isDoneBtn = status === 'done';
    const isSkipBtn = status === 'skip';
    const isStartBtn = status === 'start';
    const showStartNow = !status;
    const footer = status === 'done' ? 'Completed today — Great work!'
                 : status === 'skip' ? 'Skipped today — Try again tomorrow'
                 : status === 'start' ? 'Started — Tap to mark done'
                 : 'Today — Start now or skip';

    const isPaused = !!h.paused;
    const freqLabel = h.frequency === 'daily' ? 'Daily'
                    : h.frequency === 'weekdays' ? 'Weekdays'
                    : h.frequency === 'custom' ? 'Custom'
                    : h.frequency || 'Daily';

    const card = document.createElement('div');
    card.className = 'hb-card' + (isAllTab ? ' hb-card--rich' : '') + (isPaused ? ' hb-card--paused' : '');
    card.dataset.id = h.id;
    card.setAttribute('role', 'listitem');

    if (isAllTab) {
      const pausedChip = isPaused
        ? '<span class="hb-status-chip hb-status--paused">Paused</span>'
        : '<span class="hb-status-chip ' + statusClass + '">' + statusText + '</span>';
      card.innerHTML = `
        <div class="hb-card-body">
          <div class="hb-card-info">
            <div class="hb-card-name">${esc(h.name)}</div>
            <div class="hb-card-chips">
              <span class="hb-cat-chip">${esc(h.category || 'General')}</span>
              <span class="hb-freq-chip">${freqLabel}</span>
              ${pausedChip}
            </div>
            <div class="hb-mini-dots-row">${build7Dots(doneDays, goalDays)}</div>
            <div class="hb-prog-wrap">
              <div class="hb-prog-bar">
                <div class="hb-prog-fill" style="width:${pctRound}%"></div>
              </div>
              <span class="hb-prog-label">${doneDays}/${goalDays}d &middot; ${pctRound}%</span>
            </div>
          </div>
          <div class="hb-card-donut" aria-hidden="true">
            <svg class="hb-donut-svg" viewBox="0 0 50 50" data-id="${h.id}">
              <circle class="hb-donut-track" cx="25" cy="25" r="${CARD_R}"/>
              <circle class="hb-donut-fill" cx="25" cy="25" r="${CARD_R}"
                      stroke-dasharray="${CARD_CIRC.toFixed(2)}"
                      stroke-dashoffset="${offset}"
                      transform="rotate(-90 25 25)"/>
              <text class="hb-donut-top" x="25" y="22">${doneDays}</text>
              <text class="hb-donut-bot" x="25" y="31">/${goalDays}</text>
            </svg>
          </div>
        </div>
        <div class="hb-card-footer">
          <span class="hb-card-footer-text">${isPaused ? 'Paused — tap to view' : footer}</span>
          <svg class="hb-card-chevron" viewBox="0 0 8 14" fill="none">
            <polyline points="1 1 7 7 1 13" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="hb-card-body">
          <div class="hb-card-info">
            <div class="hb-card-name">${esc(h.name)}</div>
            <div class="hb-card-meta">
              <span class="hb-cat-chip">${esc(h.category || 'General')}</span>
              <span class="hb-status-chip ${statusClass}">${statusText}</span>
            </div>
          </div>
          <div class="hb-card-donut" aria-hidden="true">
            <svg class="hb-donut-svg" viewBox="0 0 50 50" data-id="${h.id}">
              <circle class="hb-donut-track" cx="25" cy="25" r="${CARD_R}"/>
              <circle class="hb-donut-fill" cx="25" cy="25" r="${CARD_R}"
                      stroke-dasharray="${CARD_CIRC.toFixed(2)}"
                      stroke-dashoffset="${offset}"
                      transform="rotate(-90 25 25)"/>
              <text class="hb-donut-top" x="25" y="22">${doneDays}</text>
              <text class="hb-donut-bot" x="25" y="31">/${goalDays}</text>
            </svg>
          </div>
        </div>
        <div class="hb-card-actions">
          ${showStartNow
            ? `<button class="hb-act-btn hb-act-btn--start" data-action="start" data-id="${h.id}" type="button">Start now</button>
               <button class="hb-act-btn ${isSkipBtn ? 'hb-act-btn--skip' : ''}" data-action="skip" data-id="${h.id}" type="button">Skip</button>`
            : isStartBtn
              ? `<button class="hb-act-btn primary" data-action="done" data-id="${h.id}" type="button">Mark done</button>
                 <button class="hb-act-btn ${isSkipBtn ? 'hb-act-btn--skip' : ''}" data-action="skip" data-id="${h.id}" type="button">Skip</button>`
              : `<button class="hb-act-btn ${isDoneBtn ? 'hb-act-btn--done' : ''}" data-action="done" data-id="${h.id}" type="button">${isDoneBtn ? 'Undo' : 'Done'}</button>
                 <button class="hb-act-btn ${isSkipBtn ? 'hb-act-btn--skip' : ''}" data-action="skip" data-id="${h.id}" type="button">Skip</button>`
          }
        </div>
        <div class="hb-card-footer">
          <span class="hb-card-footer-text">${footer}</span>
          <svg class="hb-card-chevron" viewBox="0 0 8 14" fill="none">
            <polyline points="1 1 7 7 1 13" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;
    }

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.hb-act-btn')) openDetail(h.id);
    });

    qsa('[data-action]', card).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        logHabit(btn.dataset.id, btn.dataset.action);
      });
    });

    return card;
  }

  /* ?? Logging ??????????????????????????????????????????????? */
  async function logHabit(habitId, newStatus) {
    if (!state.uid) return;
    const existing = state.todayLogs[habitId];
    const today = todayKey();

    // Undo done
    if (newStatus === "done" && existing?.status === "done") {
      try {
        await logsCol().doc(existing.id).delete();
        await habitsCol().doc(habitId).update({
          doneDays: firebase.firestore.FieldValue.increment(-1),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        const h = state.habits.find((x) => x.id === habitId);
        if (h) h.doneDays = Math.max(0, (h.doneDays || 0) - 1);
        delete state.todayLogs[habitId];
      } catch (err) { console.warn("[habits] undo done:", err); }
      animateDonut(habitId);
      renderAll();
      return;
    }

    // Write or update log (status: done | skip | start)
    try {
      let logId;
      if (existing) {
        await logsCol().doc(existing.id).update({
          status: newStatus,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        logId = existing.id;
        if (existing.status === "done" && newStatus === "skip") {
          await habitsCol().doc(habitId).update({
            doneDays: firebase.firestore.FieldValue.increment(-1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          const h = state.habits.find((x) => x.id === habitId);
          if (h) h.doneDays = Math.max(0, (h.doneDays || 0) - 1);
        }
        if (existing.status === "skip" && newStatus === "done") {
          await habitsCol().doc(habitId).update({
            doneDays: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          const h = state.habits.find((x) => x.id === habitId);
          if (h) h.doneDays = (h.doneDays || 0) + 1;
        }
        // Start -> Done: increment doneDays
        if (existing.status === "start" && newStatus === "done") {
          await habitsCol().doc(habitId).update({
            doneDays: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          const h = state.habits.find((x) => x.id === habitId);
          if (h) h.doneDays = (h.doneDays || 0) + 1;
        }
      } else {
        const ref = await logsCol().add({
          habitId,
          dateKey: today,
          status: newStatus,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        logId = ref.id;
        if (newStatus === "done") {
          await habitsCol().doc(habitId).update({
            doneDays: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          const h = state.habits.find((x) => x.id === habitId);
          if (h) h.doneDays = (h.doneDays || 0) + 1;
        }
        // start: no doneDays increment
      }
      state.todayLogs[habitId] = { id: logId, habitId, dateKey: today, status: newStatus };
    } catch (err) { console.warn("[habits] logHabit:", err); }

    animateDonut(habitId);
    renderAll();
  }

  /* ?? Donut animation ??????????????????????????????????????? */
  function animateDonut(habitId) {
    const h = state.habits.find((x) => x.id === habitId);
    if (!h) return;
    const doneDays = Math.max(0, h.doneDays || 0);
    const goalDays = Math.max(1, h.goalDays || 30);
    const pct = Math.min(1, doneDays / goalDays);
    const offset = (CARD_CIRC * (1 - pct)).toFixed(2);

    const svg = qs(`.hb-donut-svg[data-id="${habitId}"]`);
    if (!svg) return;
    const fill = qs(".hb-donut-fill", svg);
    const top  = qs(".hb-donut-top", svg);
    const bot  = qs(".hb-donut-bot", svg);
    if (fill) fill.style.strokeDashoffset = offset;
    if (top)  top.textContent = String(doneDays);
    if (bot)  bot.textContent = `/${goalDays}`;
  }

  /* ?? Detail modal ?????????????????????????????????????????? */
  function openDetail(habitId) {
    const h = state.habits.find((x) => x.id === habitId);
    if (!h) return;
    state.detailId = habitId;

    const log = state.todayLogs[habitId];
    const status = log?.status || null;
    const doneDays = Math.max(0, h.doneDays || 0);
    const goalDays = Math.max(1, h.goalDays || 30);
    const pct = Math.max(0, Math.min(100, Math.round((doneDays / goalDays) * 100)));

    $("detailTitle").textContent = h.name;
    $("detailSub").textContent = [h.category || "General", h.intent || "start", h.frequency || "daily"].join(" \u00b7 ");

    // Adjust footer buttons for archived / paused state
    var archiveBtnEl = $("detailArchive");
    var pauseBtnEl   = $("detailPause");
    var editBtnEl    = $("detailEdit");
    if (archiveBtnEl) archiveBtnEl.textContent = h.archived ? "Restore" : "Archive";
    if (editBtnEl)    editBtnEl.style.display   = h.archived ? "none" : "";
    if (pauseBtnEl) {
      pauseBtnEl.style.display  = h.archived ? "none" : "";
      pauseBtnEl.textContent    = h.paused ? "Resume" : "Pause";
    }

    $("detailBody").innerHTML = `
      <div class="hb-det-stat-row">
        <div class="hb-det-stat">
          <div class="hb-det-stat-label">Progress</div>
          <div class="hb-det-stat-val">${doneDays}/${goalDays}</div>
        </div>
        <div class="hb-det-stat">
          <div class="hb-det-stat-label">Completion</div>
          <div class="hb-det-stat-val">${pct}%</div>
        </div>
        <div class="hb-det-stat">
          <div class="hb-det-stat-label">Goal</div>
          <div class="hb-det-stat-val">${goalDays}d</div>
        </div>
      </div>
      ${h.paused ? `<div class="hb-det-paused-banner">This habit is paused. Resume it to keep tracking.</div>` : ""}
      <div class="hb-det-actions">
        <button class="hb-det-action-btn ${status === "done" ? "done-state" : status === "start" ? "primary" : "primary"}"
                id="detActDone" type="button" ${h.paused ? "disabled" : ""}>
          ${status === "done" ? t("habits.detail.undo","Undo done") : status === "start" ? t("habits.spot.markDone","Mark done") : !status ? "Start now" : t("habits.spot.markDone","Mark done")}
        </button>
        <button class="hb-det-action-btn ${status === "skip" ? "skip-state" : ""}"
                id="detActSkip" type="button" ${h.paused ? "disabled" : ""}>
          ${status === "skip" ? t("habits.detail.undoSkip","Undo skip") : t("habits.spot.skip","Skip today")}
        </button>
      </div>
    `;

    $("detActDone")?.addEventListener("click", () => {
      const log = state.todayLogs[habitId];
      const action = log?.status === "done" ? "done" : (log?.status === "start" ? "done" : "start");
      logHabit(habitId, action);
      closeDetail();
    });
    $("detActSkip")?.addEventListener("click", () => {
      logHabit(habitId, "skip");
      closeDetail();
    });

    const modal = $("detailModal");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeDetail() {
    const modal = $("detailModal");
    if (modal) modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.detailId = null;
  }

  /* ?? Wizard: open / close ?????????????????????????????????? */
  function openWizard(editHabit) {
    state.wizard.step = 0;
    state.wizard.editId = editHabit?.id || null;

    if (editHabit) {
      state.wizard.data = {
        intent:         editHabit.intent         || "",
        category:       editHabit.category       || "",
        name:           editHabit.name           || "",
        motivationTags: editHabit.motivationTags || [],
        frequency:      editHabit.frequency      || "daily",
        customDays:     editHabit.customDays     || [],
        difficulty:     editHabit.difficulty     || "moderate",
        when:           editHabit.when           || "flexible",
        obstacles:      editHabit.obstacles      || [],
        goalDays:       editHabit.goalDays       || 30,
      };
    } else {
      state.wizard.data = {
        intent: "", category: "", name: "",
        motivationTags: [], frequency: "daily", customDays: [],
        difficulty: "moderate", when: "flexible",
        obstacles: [], goalDays: 30,
      };
    }

    buildWizardSlides();
    syncWizardUI();

    $("wizardModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeWizard() {
    $("wizardModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  /* ?? Wizard: build slides ?????????????????????????????????? */
  function buildWizardSlides() {
    const slides = $("wzSlides");
    slides.innerHTML = "";

    /* generate 7 dot elements */
    const dots = $("wzDots");
    dots.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const d = document.createElement("button");
      d.className = "wz-dot";
      d.type = "button";
      d.setAttribute("aria-label", `Step ${i + 1}`);
      d.addEventListener("click", () => goToStep(i));
      dots.appendChild(d);
    }

    slides.appendChild(buildStep1());
    slides.appendChild(buildStep2());
    slides.appendChild(buildStep3());
    slides.appendChild(buildStep4());
    slides.appendChild(buildStep5());
    slides.appendChild(buildStep6());
    slides.appendChild(buildStep7());
  }

  function makeSlide() {
    const div = document.createElement("div");
    div.className = "wz-slide";
    return div;
  }

  /* Step 1 � Intention ??????????????????????????????????????? */
  function buildStep1() {
    const s = makeSlide();
    s.innerHTML = `
      <div class="wz-slide-inner">
        <div class="wz-slide-title">${t("habits.wz.step1.title","What's your goal?")}</div>
        <div class="wz-slide-sub">Choose your direction to get started.</div>
        <div class="wz-intent-grid">
          ${intentCard("start",    "??", "Start",    "Build something new")}
          ${intentCard("maintain", "?",  "Maintain", "Keep what's already working")}
          ${intentCard("reset",    "??", "Reset",    "Rebuild a habit you lost")}
        </div>
      </div>`;
    qsa(".wz-intent-card", s).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.wizard.data.intent = btn.dataset.intent;
        qsa(".wz-intent-card", s).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    return s;
  }

  function intentCard(id, emoji, label, sub) {
    const a = state.wizard.data.intent === id ? " active" : "";
    return `
      <button class="wz-intent-card${a}" data-intent="${id}" type="button">
        <div class="wz-intent-icon">${emoji}</div>
        <div class="wz-intent-text">
          <div class="wz-intent-label">${label}</div>
          <div class="wz-intent-sub">${sub}</div>
        </div>
        <div class="wz-intent-check">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <polyline points="1 4 4 7 9 1" stroke="#07090e" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </button>`;
  }

  /* Step 2 � Category ???????????????????????????????????????? */
  function buildStep2() {
    const s = makeSlide();
    const catCards = CATEGORIES.map((c) => {
      const a = state.wizard.data.category === c.id ? " active" : "";
      return `
        <button class="wz-cat-card${a}" data-cat="${c.id}" type="button">
          <div class="wz-cat-icon">${c.icon}</div>
          <div class="wz-cat-label">${c.label}</div>
        </button>`;
    }).join("");
    s.innerHTML = `
      <div class="wz-slide-inner">
        <div class="wz-slide-title">${t("habits.wz.step2.title","What area of life?")}</div>
        <div class="wz-slide-sub">Pick the domain that fits your habit.</div>
        <div class="wz-cat-grid">${catCards}</div>
      </div>`;
    qsa(".wz-cat-card", s).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.wizard.data.category = btn.dataset.cat;
        qsa(".wz-cat-card", s).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        refreshPresetChips();
      });
    });
    return s;
  }

  /* Step 3 � Habit name ????????????????????????????????????? */
  function buildStep3() {
    const s = makeSlide();
    s.id = "wzStep3";
    s.innerHTML = `
      <div class="wz-slide-inner">
        <div class="wz-slide-title">${t("habits.wz.step3.title","Choose your habit")}</div>
        <div class="wz-slide-sub">Select a suggestion or type your own.</div>
        <div class="wz-preset-chips" id="wzPresetChips"></div>
        <div class="wz-custom-field">
          <div class="wz-field-label">Or write your own</div>
          <input class="wz-input" id="wzCustomName" type="text"
                 placeholder="e.g. Practice guitar 15 min" maxlength="80"
                 value="${esc(state.wizard.data.name || "")}" />
        </div>
      </div>`;
    const input = qs("#wzCustomName", s);
    input.addEventListener("input", () => {
      state.wizard.data.name = input.value.trim();
      // deselect preset chips if typing custom
      qsa(".wz-chip", qs("#wzPresetChips", s)).forEach((c) => c.classList.remove("active"));
    });
    refreshPresetChips(s);
    return s;
  }

  function refreshPresetChips(stepEl) {
    const wrap = $("wzPresetChips");
    if (!wrap) return;
    const cat = state.wizard.data.category;
    const list = (cat && PRESETS[cat]) ? PRESETS[cat] : Object.values(PRESETS).flat().slice(0, 8);
    wrap.innerHTML = list.map((name) => {
      const a = state.wizard.data.name === name ? " active" : "";
      return `<button class="wz-chip${a}" data-preset="${esc(name)}" type="button">${esc(name)}</button>`;
    }).join("");
    qsa(".wz-chip", wrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.wizard.data.name = btn.dataset.preset;
        const customInput = $("wzCustomName");
        if (customInput) customInput.value = "";
        qsa(".wz-chip", wrap).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  /* Step 4 � Motivation ????????????????????????????????????? */
  function buildStep4() {
    const s = makeSlide();
    const chips = MOTIVATION_CHIPS.map((m) => {
      const a = (state.wizard.data.motivationTags || []).includes(m) ? " active" : "";
      return `<button class="wz-chip${a}" data-mot="${esc(m)}" type="button">${esc(m)}</button>`;
    }).join("");
    s.innerHTML = `
      <div class="wz-slide-inner">
        <div class="wz-slide-title">${t("habits.wz.step4.title","Why does this matter?")}</div>
        <div class="wz-slide-sub">Select all that resonate (optional).</div>
        <div class="wz-preset-chips" id="wzMotChips">${chips}</div>
        <div class="wz-custom-field">
          <div class="wz-field-label">Personal note (optional)</div>
          <textarea class="wz-textarea" id="wzMotText"
                    placeholder="Remind yourself why this habit is worth it�"
                    maxlength="200">${esc(state.wizard.data.motivationNote || "")}</textarea>
        </div>
      </div>`;
    qsa(".wz-chip", qs("#wzMotChips", s)).forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.mot;
        const tags = state.wizard.data.motivationTags || [];
        const idx = tags.indexOf(val);
        if (idx === -1) { tags.push(val); btn.classList.add("active"); }
        else            { tags.splice(idx, 1); btn.classList.remove("active"); }
        state.wizard.data.motivationTags = tags;
      });
    });
    const ta = qs("#wzMotText", s);
    ta.addEventListener("input", () => {
      state.wizard.data.motivationNote = ta.value.trim();
    });
    return s;
  }

  /* Step 5 � Frequency + Difficulty ????????????????????????? */
  function buildStep5() {
    const s = makeSlide();
    const freqMap = { daily: "Daily", weekdays: "Weekdays", custom: "Custom" };
    const diffMap = { easy: "Easy ??", moderate: "Moderate ??", hard: "Hard ??" };
    const freqBtns = Object.entries(freqMap).map(([k, label]) => {
      const a = state.wizard.data.frequency === k ? " active" : "";
      return `<button class="wz-opt-btn${a}" data-freq="${k}" type="button">${label}</button>`;
    }).join("");
    const diffBtns = Object.entries(diffMap).map(([k, label]) => {
      const a = state.wizard.data.difficulty === k ? " active" : "";
      return `<button class="wz-opt-btn${a}" data-diff="${k}" type="button">${label}</button>`;
    }).join("");
    const dayBtns = DAYS.map((d) => {
      const a = (state.wizard.data.customDays || []).includes(d) ? " active" : "";
      return `<button class="wz-day-btn${a}" data-day="${d}" type="button">${d.slice(0,2)}</button>`;
    }).join("");
    const daysVisible = state.wizard.data.frequency === "custom" ? "" : " style=\"display:none\"";
    s.innerHTML = `
      <div class="wz-slide-inner">
        <div class="wz-slide-title">${t("habits.wz.step5.title","How often?")}</div>
        <div class="wz-option-row" id="wzFreqBtns">${freqBtns}</div>
        <div class="wz-days-row" id="wzDaysRow"${daysVisible}>${dayBtns}</div>
        <div class="wz-slide-section">How hard is it for you?</div>
        <div class="wz-option-row" id="wzDiffBtns">${diffBtns}</div>
      </div>`;

    qsa("[data-freq]", s).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.wizard.data.frequency = btn.dataset.freq;
        qsa("[data-freq]", s).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const row = $("wzDaysRow");
        if (row) row.style.display = btn.dataset.freq === "custom" ? "flex" : "none";
      });
    });
    qsa("[data-day]", s).forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = btn.dataset.day;
        const days = state.wizard.data.customDays || [];
        const idx = days.indexOf(d);
        if (idx === -1) { days.push(d); btn.classList.add("active"); }
        else            { days.splice(idx, 1); btn.classList.remove("active"); }
        state.wizard.data.customDays = days;
      });
    });
    qsa("[data-diff]", s).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.wizard.data.difficulty = btn.dataset.diff;
        qsa("[data-diff]", s).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    return s;
  }

  /* Step 6 � When + Obstacles ??????????????????????????????? */
  function buildStep6() {
    const s = makeSlide();
    const whenMap = { morning: "? Morning", afternoon: "?? Afternoon", evening: "?? Evening", flexible: "?? Flexible" };
    const whenBtns = Object.entries(whenMap).map(([k, label]) => {
      const a = state.wizard.data.when === k ? " active" : "";
      return `<button class="wz-opt-btn${a}" data-when="${k}" type="button">${label}</button>`;
    }).join("");
    const obsChips = OBSTACLE_CHIPS.map((o) => {
      const a = (state.wizard.data.obstacles || []).includes(o) ? " active" : "";
      return `<button class="wz-chip${a}" data-obs="${esc(o)}" type="button">${esc(o)}</button>`;
    }).join("");
    s.innerHTML = `
      <div class="wz-slide-inner">
        <div class="wz-slide-title">${t("habits.wz.step6.title","When will you do it?")}</div>
        <div class="wz-option-row" id="wzWhenBtns" style="flex-wrap:wrap">${whenBtns}</div>
        <div class="wz-slide-section">What might get in the way?</div>
        <div class="wz-slide-sub" style="margin-top:-14px">Pick your likely obstacles (optional).</div>
        <div class="wz-preset-chips" id="wzObsChips">${obsChips}</div>
      </div>`;
    qsa("[data-when]", s).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.wizard.data.when = btn.dataset.when;
        qsa("[data-when]", s).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    qsa("[data-obs]", s).forEach((btn) => {
      btn.addEventListener("click", () => {
        const o = btn.dataset.obs;
        const obs = state.wizard.data.obstacles || [];
        const idx = obs.indexOf(o);
        if (idx === -1) { obs.push(o); btn.classList.add("active"); }
        else            { obs.splice(idx, 1); btn.classList.remove("active"); }
        state.wizard.data.obstacles = obs;
      });
    });
    return s;
  }

  /* Step 7 � Goal ??????????????????????????????????????????? */
  function buildStep7() {
    const s = makeSlide();
    s.id = "wzStep7";
    const goals = [7, 14, 30, 60, 90];
    const goalChips = goals.map((g) => {
      const a = state.wizard.data.goalDays === g ? " active" : "";
      return `<button class="wz-chip${a}" data-goal="${g}" type="button">${g} days</button>`;
    }).join("") + `
      <button class="wz-chip${typeof state.wizard.data.goalDays === "number" &&
                               !goals.includes(state.wizard.data.goalDays) ? " active" : ""}"
              data-goal="custom" type="button">Custom</button>`;
    const isCustomGoal = !goals.includes(state.wizard.data.goalDays);
    const g0 = state.wizard.data.goalDays || 30;
    s.innerHTML = `
      <div class="wz-slide-inner">
        <div class="wz-slide-title">${t("habits.wz.step7.title","Set your goal")}</div>
        <div class="wz-slide-sub">How many days to complete your habit?</div>
        <div class="wz-preset-chips" id="wzGoalChips">${goalChips}</div>
        <div class="wz-custom-field" id="wzCustomGoalWrap"
             style="${isCustomGoal ? "" : "display:none"}">
          <div class="wz-field-label">Custom number of days</div>
          <input class="wz-input" id="wzCustomGoal" type="number" min="1" max="999" step="1"
                 placeholder="e.g. 45" value="${isCustomGoal ? g0 : ""}" />
        </div>
        <div class="wz-goal-preview">
          <div class="wz-goal-ring-wrap">
            <svg class="wz-goal-ring-svg" viewBox="0 0 80 80">
              <circle class="wz-goal-track" cx="40" cy="40" r="${GOAL_R}"/>
              <circle class="wz-goal-fill" id="wzGoalRing" cx="40" cy="40" r="${GOAL_R}"
                      stroke-dasharray="${GOAL_CIRC.toFixed(2)}"
                      stroke-dashoffset="${(GOAL_CIRC * 0.92).toFixed(2)}"
                      transform="rotate(-90 40 40)"/>
            </svg>
            <div class="wz-goal-label">
              <div class="wz-goal-num" id="wzGoalNum">${g0}</div>
              <div class="wz-goal-unit">days</div>
            </div>
          </div>
        </div>
        <div class="wz-summary-box" id="wzSummaryBox">
          <div class="wz-summary-name" id="wzSummaryName">${esc(state.wizard.data.name || "Your habit")}</div>
          <div class="wz-summary-meta" id="wzSummaryMeta">
            ${buildSummaryMeta()}
          </div>
        </div>
      </div>`;

    function setGoal(g) {
      state.wizard.data.goalDays = g;
      const num = $("wzGoalNum");
      if (num) num.textContent = String(g);
      const ring = $("wzGoalRing");
      if (ring) {
        const pct = Math.min(1, Math.max(0.04, g / 90));
        ring.style.strokeDashoffset = String(GOAL_CIRC * (1 - pct));
      }
      const metaEl = $("wzSummaryMeta");
      if (metaEl) metaEl.textContent = buildSummaryMeta();
    }

    qsa("[data-goal]", s).forEach((btn) => {
      btn.addEventListener("click", () => {
        qsa("[data-goal]", s).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const customWrap = $("wzCustomGoalWrap");
        if (btn.dataset.goal === "custom") {
          if (customWrap) customWrap.style.display = "";
          const ci = $("wzCustomGoal");
          if (ci && ci.value) setGoal(parseInt(ci.value, 10) || 30);
        } else {
          if (customWrap) customWrap.style.display = "none";
          setGoal(parseInt(btn.dataset.goal, 10));
        }
      });
    });
    const ci = $("wzCustomGoal");
    if (ci) {
      ci.addEventListener("input", () => {
        const v = parseInt(ci.value, 10);
        if (v > 0) setGoal(v);
      });
    }
    return s;
  }

  function buildSummaryMeta() {
    const d = state.wizard.data;
    const parts = [];
    if (d.frequency) parts.push(d.frequency.charAt(0).toUpperCase() + d.frequency.slice(1));
    if (d.goalDays)  parts.push(`${d.goalDays} days`);
    if (d.difficulty) parts.push(d.difficulty);
    return parts.join(" � ") || "�";
  }

  /* ?? Wizard navigation ?????????????????????????????????????? */
  const WIZARD_TOTAL = 7;

  function syncWizardUI() {
    const step = state.wizard.step;
    const slides = $("wzSlides");
    if (slides) slides.style.transform = `translateX(-${step * 100}%)`;

    const label = $("wzStepLabel");
    if (label) label.textContent = t("habits.wz.step","Step") + " " + (step+1) + " " + t("habits.wz.of","of") + " " + WIZARD_TOTAL;

    const fill = $("wzProgressFill");
    if (fill) fill.style.width = `${(step / (WIZARD_TOTAL - 1)) * 100}%`;

    qsa(".wz-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === step);
      dot.classList.toggle("done",   i < step);
    });

    const backBtn = $("wzBack");
    const nextBtn = $("wzNext");
    if (backBtn) backBtn.disabled = step === 0;

    if (nextBtn) {
      if (step === WIZARD_TOTAL - 1) {
        nextBtn.textContent = state.wizard.editId ? "Save changes" : "Create habit";
        nextBtn.innerHTML   = state.wizard.editId ? "Save changes" : "Create habit";
        nextBtn.classList.add("wz-btn-save");
      } else {
        nextBtn.innerHTML = `Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>`;
        nextBtn.classList.remove("wz-btn-save");
      }
    }

    // Update step-3 summary name and step-7 summary when navigating there
    if (step === 6) {
      const sn = $("wzSummaryName");
      if (sn) sn.textContent = state.wizard.data.name || "Your habit";
      const sm = $("wzSummaryMeta");
      if (sm) sm.textContent = buildSummaryMeta();
    }
  }

  function goToStep(n) {
    const target = Math.max(0, Math.min(WIZARD_TOTAL - 1, n));
    state.wizard.step = target;
    syncWizardUI();
  }

  function validateStep() {
    const d = state.wizard.data;
    switch (state.wizard.step) {
      case 0: return !!d.intent;
      case 1: return !!d.category;
      case 2: return !!(d.name && d.name.trim().length > 0);
      case 4: return !!(d.frequency && d.difficulty);
      case 5: return !!d.when;
      default: return true;
    }
  }

  function showStepError(msg) {
    const err = $("wzErrorMsg");
    if (!err) return;
    err.textContent = msg;
    setTimeout(() => { if (err) err.textContent = ""; }, 2200);
  }

  /* ?? Wizard: save to Firestore ?????????????????????????????? */
  async function saveHabit() {
    const d = state.wizard.data;
    if (!d.name?.trim()) { showStepError("Please enter a habit name."); return; }
    if (!d.category)     { showStepError("Please choose a category."); return; }

    // A1) Duplicate prevention — redirect to edit mode if name already exists
    if (!state.wizard.editId) {
      const nameNorm = d.name.trim().toLowerCase();
      const dup = state.habits.find((h) => !h.archived && h.name.trim().toLowerCase() === nameNorm);
      if (dup) {
        showStepError(`"${d.name.trim()}" already exists \u2014 opening to edit.`);
        console.log("[habits] Duplicate habit detected, redirecting to edit:", dup.id);
        setTimeout(() => { closeWizard(); openWizard(dup); }, 1000);
        return;
      }
    }

    const btnNext = $("wzNext");
    if (btnNext) { btnNext.disabled = true; btnNext.textContent = "Saving�"; }

    try {
      const trimmedName = d.name.trim();
      const payload = {
        name:           trimmedName,
        nameNormalized: trimmedName.toLowerCase(),
        category:       d.category,
        intent:         d.intent         || "start",
        frequency:      d.frequency      || "daily",
        customDays:     d.customDays     || [],
        when:           d.when           || "flexible",
        goalDays:       Number(d.goalDays) || 30,
        motivationTags: d.motivationTags || [],
        obstacles:      d.obstacles      || [],
        difficulty:     d.difficulty     || "moderate",
        archived:       false,
        pinned:         false,
        updatedAt:      firebase.firestore.FieldValue.serverTimestamp(),
      };

      let habitId;
      if (state.wizard.editId) {
        habitId = state.wizard.editId;
        await habitsCol().doc(habitId).update(payload);
        // update local state
        const idx = state.habits.findIndex((x) => x.id === habitId);
        if (idx !== -1) state.habits[idx] = { ...state.habits[idx], ...payload };
      } else {
        payload.doneDays  = 0;
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await habitsCol().add(payload);
        habitId = ref.id;
        state.habits.unshift({ id: habitId, ...payload, doneDays: 0 });
      }

      // store onboarding answers (non-blocking)
      onboardingCol().doc(habitId).set({
        stepsData: {
          intent: d.intent, category: d.category, name: d.name,
          motivationTags: d.motivationTags, motivationNote: d.motivationNote,
          frequency: d.frequency, customDays: d.customDays,
          difficulty: d.difficulty, when: d.when,
          obstacles: d.obstacles, goalDays: d.goalDays,
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});

    } catch (err) {
      console.error("[habits] saveHabit:", err);
      if (btnNext) { btnNext.disabled = false; btnNext.textContent = "Retry"; }
      return;
    }

    closeWizard();
    renderAll();
  }

  /* ?? Archive / Delete ?????????????????????????????????????? */
  async function archiveHabit(habitId) {
    if (!habitId) return;
    try {
      await habitsCol().doc(habitId).update({
        archived: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      const h = state.habits.find((x) => x.id === habitId);
      if (h) h.archived = true;
    } catch (err) { console.warn("[habits] archive:", err); }
    closeDetail();
    renderAll();
  }

  async function deleteHabit(habitId) {
    if (!habitId) return;
    if (!confirm("Delete this habit permanently?")) return;
    try {
      await habitsCol().doc(habitId).delete();
      state.habits = state.habits.filter((x) => x.id !== habitId);
      delete state.todayLogs[habitId];
    } catch (err) { console.warn("[habits] delete:", err); }
    closeDetail();
    renderAll();
  }

  async function restoreHabit(habitId) {
    if (!habitId) return;
    try {
      await habitsCol().doc(habitId).update({
        archived: false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      const h = state.habits.find((x) => x.id === habitId);
      if (h) h.archived = false;
    } catch (err) { console.warn("[habits] restore:", err); }
    renderAll();
  }

  /* A5) Pause / Resume habit ─────────────────────────────── */
  async function pauseHabit(habitId) {
    if (!habitId) return;
    try {
      await habitsCol().doc(habitId).update({
        paused: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      const h = state.habits.find((x) => x.id === habitId);
      if (h) h.paused = true;
      console.log("[habits] paused:", habitId);
    } catch (err) { console.warn("[habits] pause:", err); }
    closeDetail();
    renderAll();
  }

  async function resumeHabit(habitId) {
    if (!habitId) return;
    try {
      await habitsCol().doc(habitId).update({
        paused: false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      const h = state.habits.find((x) => x.id === habitId);
      if (h) h.paused = false;
      console.log("[habits] resumed:", habitId);
    } catch (err) { console.warn("[habits] resume:", err); }
    closeDetail();
    renderAll();
  }

  /* ?? Header date ??????????????????????????????????????????? */
  function setHeaderDate() {
    const el = $("hbDate");
    if (!el) return;
    const d = new Date();
    const opts = { weekday: "short", month: "short", day: "numeric" };
    el.textContent = d.toLocaleDateString(undefined, opts).toUpperCase();
  }

  /* ?? Events ???????????????????????????????????????????????? */
  function bindEvents() {
    // New habit buttons
    [$("btnNewHabit"), $("btnEmptyNew")].forEach((btn) => {
      btn?.addEventListener("click", () => openWizard());
    });

    // Wizard navigation
    $("wzClose")?.addEventListener("click", closeWizard);
    $("wzBack")?.addEventListener("click", () => {
      if (state.wizard.step > 0) goToStep(state.wizard.step - 1);
    });
    $("wzNext")?.addEventListener("click", () => {
      if (state.wizard.step === WIZARD_TOTAL - 1) {
        saveHabit();
        return;
      }
      if (!validateStep()) {
        const msgs = {
          0: "Choose a direction first.",
          1: "Pick a category to continue.",
          2: "Enter or choose a habit name.",
          4: "Choose frequency and difficulty.",
          5: "Pick a time of day.",
        };
        showStepError(msgs[state.wizard.step] || "Please complete this step.");
        return;
      }
      goToStep(state.wizard.step + 1);
    });

    // Wizard backdrop click
    $("wizardModal")?.addEventListener("click", (e) => {
      if (e.target === $("wizardModal")) closeWizard();
    });

    // Detail modal close/actions
    $("detailClose")?.addEventListener("click",   closeDetail);
    $("detailBackdrop")?.addEventListener("click", closeDetail);
    $("detailEdit")?.addEventListener("click", () => {
      const h = state.habits.find((x) => x.id === state.detailId);
      if (!h || h.archived) return;
      closeDetail();
      openWizard(h);
    });
    $("detailArchive")?.addEventListener("click", () => {
      const h = state.habits.find((x) => x.id === state.detailId);
      if (!h) return;
      if (h.archived) restoreHabit(state.detailId);
      else archiveHabit(state.detailId);
    });
    $("detailPause")?.addEventListener("click", () => {
      const h = state.habits.find((x) => x.id === state.detailId);
      if (!h) return;
      if (h.paused) resumeHabit(state.detailId);
      else pauseHabit(state.detailId);
    });
    $("detailDelete")?.addEventListener("click",  () => deleteHabit(state.detailId));

    // Tabs
    qsa(".hb-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.activeTab = tab.dataset.tab;
        qsa(".hb-tab").forEach((t) => {
          t.classList.toggle("active",      t === tab);
          t.setAttribute("aria-selected",   String(t === tab));
        });
        renderList();
      });
    });

    // Logout
    $("hbLogoutBtn")?.addEventListener("click", () => {
      if (typeof firebase === "undefined") return;
      firebase.auth().signOut().then(() => {
        window.location.href = "login.html";
      });
    });

    // Keyboard: Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if ($("wizardModal")?.getAttribute("aria-hidden") === "false") closeWizard();
        if ($("detailModal")?.getAttribute("aria-hidden") === "false") closeDetail();
      }
    });
  }

  /* ?? Init ?????????????????????????????????????????????????? */
  function init() {
    if (typeof firebase === "undefined") {
      console.error("[habits] Firebase not loaded.");
      return;
    }
    setHeaderDate();
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = "login.html"; return; }
      state.uid = user.uid;
      db = firebase.firestore();

      // Update avatar
      const av = $("hbAvatar");
      if (av && user.displayName) {
        av.textContent = user.displayName.charAt(0).toUpperCase();
      } else if (av && user.email) {
        av.textContent = user.email.charAt(0).toUpperCase();
      }

      loadData();
      bindEvents();
    });
  }

  /* ?? Register ?????????????????????????????????????????????? */
  window.HBIT = window.HBIT || {};
  window.HBIT.pages = window.HBIT.pages || {};
  window.HBIT.pages.habits = { init };
})();
