(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $ = (id) => document.getElementById(id);

  let state = {
    user: null,
    selectedDate: getTodayStr(), 
    tasks: [], 
    allPastUndone: [], 
    unsubscribe: null,
    tasksSnapReady: false,
    planDeleteConfirmId: null,
    weekOffset: 0,
    taskMapByDate: {},
    habits: [],
    habitLogs: {},
    priorityFilter: "all",
  };

  // ======================================================================
  // HELPERS
  // ======================================================================
  function getLang() { return HBIT.i18n?.getLang?.() || "en"; }
  function tr(key, fallback, params) {
    if (HBIT.i18n?.t) return HBIT.i18n.t(key, fallback, params);
    let s = fallback != null ? fallback : key;
    if (params && typeof params === "object" && typeof s === "string") {
      s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? String(params[k]) : `{${k}}`);
    }
    return s;
  }

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dateToStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function strToDate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function getWeekDays() {
    const today = new Date();
    today.setDate(today.getDate() + (state.weekOffset || 0) * 7);
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }
  function formatTimeDisp(timeStr) {
    if (!timeStr) return tr("plan.time.anytime", "Anytime");
    const [h, m] = String(timeStr).split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    const loc = getLang() === "fr" ? "fr-CA" : "en-CA";
    return new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit" }).format(d);
  }

  // ======================================================================
  // DATA
  // ======================================================================
  function isFs() { return !!(window.firebase && firebase.firestore && state.user && HBIT.db?.tasks); }
  function createdMs(task) {
    const v = task?.createdAt;
    if (typeof v === "number") return v;
    if (typeof v?.toMillis === "function") return v.toMillis();
    return 0;
  }

  function habitScheduledForDate(habit, dateKey) {
    const date = strToDate(dateKey);
    const day = date.getDay();
    if (habit.frequency === "weekdays") return day >= 1 && day <= 5;
    if (habit.frequency === "custom") {
      const names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      return (habit.customDays || []).includes(names[day]) || (habit.customDays || []).includes(day);
    }
    return true;
  }

  async function loadTodaysHabits() {
    if (!isFs() || !HBIT.db?.habits || !HBIT.db?.habitLogs) {
      state.habits = [];
      state.habitLogs = {};
      renderHabits();
      return;
    }
    try {
      const habits = (await HBIT.db.habits.list()).filter((habit) => habitScheduledForDate(habit, state.selectedDate));
      const logs = {};
      await Promise.all(habits.map(async (habit) => {
        logs[habit.id] = await HBIT.db.habitLogs.get(habit.id, state.selectedDate).catch(() => null);
      }));
      state.habits = habits;
      state.habitLogs = logs;
      renderHabits();
    } catch (_) {
      state.habits = [];
      state.habitLogs = {};
      renderHabits();
    }
  }

  async function loadTasks() {
    if (isFs()) {
      if (state.unsubscribe) state.unsubscribe();
      state.tasksSnapReady = false;
      state.unsubscribe = HBIT.db.tasks.onSnapshot(state.selectedDate, (tasks) => {
        state.tasks = tasks;
        state.tasksSnapReady = true;
        sortRender();
      });

      HBIT.db.tasks.listAll().then(allTasks => {
        const today = getTodayStr();
        const mapped = (allTasks || []).filter(t => t.done === false);
        state.allPastUndone = mapped.filter(t => t.date < today);
        const map = {};
        mapped.forEach((t) => {
          if (!t.date) return;
          map[t.date] = (map[t.date] || 0) + 1;
        });
        state.taskMapByDate = map;
        if ($("plCarryOver")) $("plCarryOver").hidden = state.allPastUndone.length === 0 || state.selectedDate !== today;
        renderCalendar();
      }).catch(()=>{});

      loadTodaysHabits();

    } else {
      const raw = localStorage.getItem("hbit:plan:tasks");
      const allTasks = raw ? JSON.parse(raw) : [];
      state.tasks = allTasks.filter(t => t.date === state.selectedDate);
      const today = getTodayStr();
      state.allPastUndone = allTasks.filter(t => t.done === false && t.date < today);
      const map = {};
      allTasks.forEach((t) => {
        if (!t.date) return;
        map[t.date] = (map[t.date] || 0) + 1;
      });
      state.taskMapByDate = map;
      if ($("plCarryOver")) $("plCarryOver").hidden = state.allPastUndone.length === 0 || state.selectedDate !== today;
      state.tasksSnapReady = true;
      loadTodaysHabits();
      sortRender();
    }
  }

  function sortRender() {
    // Sort by time: objects without time go to end, then sort by localeCompare
    state.tasks.sort((a,b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      const ta = a.time || "24:00";
      const tb = b.time || "24:00";
      if (ta === tb) return createdMs(b) - createdMs(a);
      return ta.localeCompare(tb);
    });
    renderList();
    renderCalendar();
  }

  async function addTask(data) {
    const t = { ...data, done: false, date: state.selectedDate, createdAt: Date.now() };
    if (isFs()) { await HBIT.db.tasks.add(t); } 
    else {
      const all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
      t.id = String(Date.now());
      all.push(t);
      localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
      loadTasks();
    }
  }

  async function toggleTask(id, currentDone) {
    if (isFs()) { await HBIT.db.tasks.update(id, { done: !currentDone }); } 
    else {
      let all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
      all = all.map(t => t.id === id ? { ...t, done: !currentDone } : t);
      localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
      loadTasks();
    }
  }

  async function deleteTask(id) {
    if (isFs()) { await HBIT.db.tasks.delete(id); } 
    else {
      let all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
      all = all.filter(t => t.id !== id);
      localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
      loadTasks();
    }
  }

  async function carryOver() {
    if (!state.allPastUndone.length) return;
    const today = getTodayStr();
    if (isFs()) {
      await Promise.all(state.allPastUndone.map(t =>
        HBIT.db.tasks.update(t.id, { date: today, createdAt: Date.now() })
      ));
    } else {
      let all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
      state.allPastUndone.forEach(pt => {
        const idx = all.findIndex(t => t.id === pt.id);
        if (idx !== -1) { all[idx].date = today; all[idx].createdAt = Date.now(); }
      });
      localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
      loadTasks();
    }
  }

  // ======================================================================
  // RENDER
  // ======================================================================
  function escapeHtml(t) { return String(t||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function renderHeader() {
    const lbl = $("plSelDateLabel");
    if (!lbl) return;
    const today = getTodayStr();
    if (state.selectedDate === today) lbl.textContent = tr("mood.today", "Today");
    else {
      lbl.textContent = new Intl.DateTimeFormat(getLang() === "fr" ? "fr-CA" : "en-CA", { weekday: "short", month: "short", day: "numeric" }).format(strToDate(state.selectedDate));
    }
  }

  function renderCalendar() {
    const track = $("plCalTrack");
    if (!track) return;
    const days = getWeekDays();
    const loc = getLang() === "fr" ? "fr-CA" : "en-CA";
    const formatterDay = new Intl.DateTimeFormat(loc, { weekday: "short" });
    const formatterNum = new Intl.DateTimeFormat(loc, { day: "numeric" });
    const formatterLong = new Intl.DateTimeFormat(loc, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const monthLabel = $("plCalMonthLabel");
    if (monthLabel) {
      monthLabel.textContent = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(days[3]);
    }
    const today = getTodayStr();

    track.setAttribute("role", "group");
    track.setAttribute("aria-label", tr("plan.calendar.stripLabel", "Week view — pick a day"));

    track.innerHTML = days.map(d => {
      const dStr = dateToStr(d);
      const isActive = dStr === state.selectedDate;
      const hasTasks = (state.taskMapByDate[dStr] || 0) > 0;
      const isToday = dStr === today;
      const label = formatterLong.format(d);
      return `
        <button class="pl-cal-day ${isActive ? "active" : ""} ${hasTasks ? "has-tasks" : ""} ${isToday ? "today" : ""}" data-date="${dStr}" type="button"
                aria-label="${escapeHtml(label)}" aria-pressed="${isActive ? "true" : "false"}">
          <span class="pl-cal-weekday">${formatterDay.format(d)}</span>
          <span class="pl-cal-date">${formatterNum.format(d)}</span>
          <span class="pl-cal-dot"></span>
        </button>
      `;
    }).join("");
    
    setTimeout(() => { track.querySelector(".active, .today")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }, 50);
  }

  function renderList() {
    const list = $("planList");
    const empty = $("planEmpty");
    if (!list || !empty) return;

    /* Firebase auth not resolved yet — show skeleton instead of a blank hidden empty state */
    if (window.firebase?.auth && window.firebase?.firestore && !state.user) {
      empty.hidden = true;
      list.innerHTML = [1, 2, 3].map(() =>
        `<article class="pl-item skeleton" aria-hidden="true"><div class="pl-card" style="min-height:72px"></div></article>`
      ).join("");
      return;
    }

    if (state.user && window.firebase && firebase.firestore && !state.tasksSnapReady) {
      empty.hidden = true;
      list.innerHTML = [1, 2, 3].map(() =>
        `<article class="pl-item skeleton" aria-hidden="true"><div class="pl-card" style="min-height:72px"></div></article>`
      ).join("");
      return;
    }

    const filteredTasks = state.tasks.filter((task) => {
      if (state.priorityFilter === "all") return true;
      return (task.priority || "low") === state.priorityFilter;
    });

    empty.hidden = state.tasks.length > 0;
    
    const now = new Date();
    const today = getTodayStr();
    let currentMarked = false;
    const renderTask = (item) => {
      let timeMinutes = 9999;
      if (item.time) {
        const [hh, mm] = String(item.time).split(":").map(Number);
        timeMinutes = (hh || 0) * 60 + (mm || 0);
      }
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const isCurrent = !item.done && item.date === today && !currentMarked && timeMinutes >= nowMinutes;
      if (isCurrent) currentMarked = true;
      const isUpcoming = !item.done && item.date >= today;
      const confirming = state.planDeleteConfirmId === item.id;
      const actionsHtml = confirming
        ? `<div class="pl-del-confirm" role="group" aria-label="${escapeHtml(tr("plan.delete.confirm", "Are you sure?"))}">
            <span class="pl-del-msg">${escapeHtml(tr("plan.delete.confirm", "Are you sure?"))}</span>
            <button class="pl-act-btn is-confirm" data-action="confirm-delete" type="button">${escapeHtml(tr("common.confirm", "Confirm"))}</button>
            <button class="pl-act-btn is-cancel" data-action="cancel-delete" type="button">${escapeHtml(tr("common.cancel", "Cancel"))}</button>
          </div>`
        : `<button class="pl-act-btn is-delete" data-action="delete" type="button" aria-label="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button class="pl-act-btn is-check" data-action="toggle" type="button" aria-label="Done">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>`;
      return `
      <article class="pl-item ${item.done ? "is-done" : ""} ${isUpcoming ? "is-upcoming" : ""} ${isCurrent ? "is-current" : ""}" data-id="${item.id}" data-pty="${item.priority || "none"}">
        <div class="pl-item-head">
          <div class="pl-time-col">
            <span class="pl-time-display">${formatTimeDisp(item.time)}</span>
            ${item.duration ? `<span class="pl-dur-display">${item.duration}m</span>` : ''}
          </div>
          <div class="pl-card" tabindex="0">
            <div class="pl-card-top">
              <h3 class="pl-item-title"><span class="pl-priority-dot ${escapeHtml(item.priority || "low")}"></span><span class="pl-task-name">${escapeHtml(item.title || item.text)}</span></h3>
              <div class="pl-card-actions">
                ${actionsHtml}
              </div>
            </div>
            ${item.notes ? `<div class="pl-notes-area">${escapeHtml(item.notes)}</div>` : ''}
          </div>
        </div>
      </article>`;
    };

    const scheduled = filteredTasks.filter((item) => item.time);
    const anytime = filteredTasks.filter((item) => !item.time);
    list.innerHTML = `
      ${scheduled.length ? `<h2 class="pl-list-section-title">${escapeHtml(tr("plan.section.scheduled", "Scheduled"))}</h2>${scheduled.map(renderTask).join("")}` : ""}
      ${anytime.length ? `<h2 class="pl-list-section-title">${escapeHtml(tr("plan.section.anytime", "Anytime"))}</h2>${anytime.map(renderTask).join("")}` : ""}
      ${!filteredTasks.length && state.tasks.length ? `<p class="pl-filter-empty">${escapeHtml(tr("plan.filter.empty", "No tasks match this filter."))}</p>` : ""}
    `;
  }

  function renderHabits() {
    const section = $("plHabitsSection");
    const list = $("plHabitList");
    if (!section || !list) return;
    section.hidden = !state.habits.length || state.selectedDate !== getTodayStr();
    if (section.hidden) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = state.habits.map((habit) => {
      const done = state.habitLogs[habit.id]?.status === "done";
      return `<button class="pl-habit-row ${done ? "is-done" : ""}" type="button" data-habit-id="${escapeHtml(habit.id)}" aria-pressed="${done ? "true" : "false"}">
        <span class="pl-habit-check" aria-hidden="true">${done ? "✓" : ""}</span>
        <span>${escapeHtml(habit.name || habit.title || tr("plan.habit.untitled", "Habit"))}</span>
      </button>`;
    }).join("");
  }

  // ======================================================================
  // UI LOGIC
  // ======================================================================
  function bindUi() {
    $("plCalTrack")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".pl-cal-day");
      if (!btn) return;
      const dStr = btn.getAttribute("data-date");
      if (dStr !== state.selectedDate) {
        state.planDeleteConfirmId = null;
        state.selectedDate = dStr;
        renderHeader();
        loadTasks();
        loadTodaysHabits();
      }
    });
    $("plWeekPrev")?.addEventListener("click", () => {
      state.weekOffset -= 1;
      renderCalendar();
    });
    $("plWeekNext")?.addEventListener("click", () => {
      state.weekOffset += 1;
      renderCalendar();
    });

    $("planList")?.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      const item = e.target.closest(".pl-item");
      if (!actionEl || !item) return;
      
      const id = item.getAttribute("data-id");
      const action = actionEl.getAttribute("data-action");
      if (action === "toggle") {
        state.planDeleteConfirmId = null;
        toggleTask(id, item.classList.contains("is-done"));
      }
      if (action === "delete") {
        state.planDeleteConfirmId = id;
        renderList();
      }
      if (action === "confirm-delete") {
        state.planDeleteConfirmId = null;
        deleteTask(id);
      }
      if (action === "cancel-delete") {
        state.planDeleteConfirmId = null;
        renderList();
      }
    });

    document.querySelector(".pl-priority-filter")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-priority-filter]");
      if (!btn) return;
      state.priorityFilter = btn.dataset.priorityFilter || "all";
      document.querySelectorAll("[data-priority-filter]").forEach((el) => {
        const active = el === btn;
        el.classList.toggle("active", active);
        el.setAttribute("aria-checked", active ? "true" : "false");
      });
      renderList();
    });

    $("plHabitList")?.addEventListener("click", async (e) => {
      const row = e.target.closest("[data-habit-id]");
      if (!row || !HBIT.db?.habitLogs) return;
      const id = row.dataset.habitId;
      await HBIT.db.habitLogs.set(id, state.selectedDate, "done");
      state.habitLogs[id] = { status: "done" };
      renderHabits();
    });

    $("plCarryBtn")?.addEventListener("click", carryOver);
    $("plEmptyCta")?.addEventListener("click", () => $("plFabBtn")?.click());

    // Modal
    const modal = $("plModal");
    function checkConflict() {
      const msg = $("plConflictMsg");
      if (!msg) return;
      const timeVal = $("plInputTime")?.value || "";
      const dur = Math.max(1, parseInt($("plInputDur")?.value, 10) || 1);
      if (!timeVal) {
        msg.hidden = true;
        msg.textContent = "";
        return;
      }
      const [sh, sm] = timeVal.split(":").map(Number);
      const start = (sh || 0) * 60 + (sm || 0);
      const end = start + dur;
      const overlap = state.tasks.find((t) => {
        if (!t.time) return false;
        const [th, tm] = String(t.time).split(":").map(Number);
        const ts = (th || 0) * 60 + (tm || 0);
        const te = ts + Math.max(1, parseInt(t.duration, 10) || 1);
        return start < te && end > ts;
      });
      if (!overlap) {
        msg.hidden = true;
        msg.textContent = "";
        return;
      }
      msg.hidden = false;
      msg.textContent = tr("plan.conflict.warning", "This overlaps with '{title}' at {time}", {
        title: overlap.title || overlap.text || "task",
        time: formatTimeDisp(overlap.time),
      });
    }
    $("plFabBtn")?.addEventListener("click", () => {
      modal.hidden = false;
      $("plInputTitle")?.focus();
      checkConflict();
    });
    
    $("plModalClose")?.addEventListener("click", () => modal.hidden = true );
    
    $("planForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("plInputTitle").value.trim();
      if (!title) return;
      
      addTask({
        title,
        time: $("plInputTime").value,
        duration: $("plInputDur").value,
        priority: $("plInputPty").value,
        notes: $("plInputNotes").value.trim()
      });
      
      $("planForm").reset();
      const msg = $("plConflictMsg");
      if (msg) { msg.hidden = true; msg.textContent = ""; }
      modal.hidden = true;
    });
    $("plInputTime")?.addEventListener("input", checkConflict);
    $("plInputDur")?.addEventListener("input", checkConflict);
  }

  // ======================================================================
  // BOOT
  // ======================================================================
  let planHelpModalBound = false;

  async function init() {
    if (document.body.id !== "planPage") return;
    renderHeader(); renderCalendar(); bindUi();
    renderList();

    if (!planHelpModalBound && HBIT.utils?.initHelpModal) {
      HBIT.utils.initHelpModal({
        openBtn: "plHelpBtn",
        overlay: "plHelpOverlay",
        closeBtn: "plHelpClose",
      });
      planHelpModalBound = true;
    }

    window.addEventListener("hbit:lang-changed", () => { renderHeader(); renderCalendar(); renderList(); });

    if (!window.firebase || !firebase.auth) { loadTasks(); return; }

    firebase.auth().onAuthStateChanged(u => {
      if (u) {
        state.user = u; loadTasks();
        if ($("planAvatar")) $("planAvatar").textContent = (u.displayName || "H").charAt(0).toUpperCase();
      } else window.location.replace("login.html");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
