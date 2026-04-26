(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $ = (id) => document.getElementById(id);
  const VIEW_MODE_KEY = "hbit:plan:viewMode";
  const HOUR_START = 6;
  const HOUR_END = 23;
  const ROW_H = 56;
  const SNAP_MIN = 15;
  const DEFAULT_VIEW = window.matchMedia?.("(max-width: 720px)")?.matches ? "today" : "today";
  const WHEN_TIMES = { morning: "08:00", afternoon: "13:00", evening: "19:00", flexible: "" };

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
    dateMetaByDate: {},
    allOpenTasks: [],
    habits: [],
    habitLogs: {},
    priorityFilter: "all",
    editingTaskId: null,
    pendingTaskIds: new Set(),
    viewMode: getStoredViewMode(),
    nowTimer: null,
    quickDraft: null,
    dragState: null,
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

  function getStoredViewMode() {
    try {
      const value = localStorage.getItem(VIEW_MODE_KEY);
      return ["today", "week", "list"].includes(value) ? value : DEFAULT_VIEW;
    } catch {
      return DEFAULT_VIEW;
    }
  }

  function setViewMode(mode) {
    if (!["today", "week", "list"].includes(mode)) return;
    state.viewMode = mode;
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch {}
    document.querySelectorAll("[data-view-mode]").forEach((btn) => {
      const active = btn.dataset.viewMode === mode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderList();
    manageNowTimer();
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

  function minutesToTime(mins) {
    const normalized = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function timeToMinutes(timeStr, fallback = HOUR_START * 60) {
    if (!timeStr) return fallback;
    const [h, m] = String(timeStr).split(":").map(Number);
    if (!Number.isFinite(h)) return fallback;
    return (h || 0) * 60 + (m || 0);
  }

  function snapMinutes(mins) {
    return Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 + 45, Math.round(mins / SNAP_MIN) * SNAP_MIN));
  }

  function taskDuration(task) {
    return Math.max(15, Number(task?.duration) || 60);
  }

  function priorityRank(priority) {
    if (priority === "high") return 3;
    if (priority === "medium") return 2;
    return 1;
  }

  function priorityTone(priority) {
    if (priority === "high") return "priority-high";
    if (priority === "medium") return "priority-medium";
    return "priority-low";
  }

  function buildCalendarMeta(allTasks) {
    const countMap = {};
    const metaMap = {};
    (allTasks || []).forEach((task) => {
      if (!task.date || task.done) return;
      countMap[task.date] = (countMap[task.date] || 0) + 1;
      const p = task.priority || "low";
      if (!metaMap[task.date] || priorityRank(p) > priorityRank(metaMap[task.date].priority)) {
        metaMap[task.date] = { priority: p };
      }
    });
    state.taskMapByDate = countMap;
    state.dateMetaByDate = metaMap;
  }

  function showPlanToast(type, key, fallback, retryFn) {
    const msg = tr(key, fallback);
    const api = HBIT.toast;
    const opts = retryFn ? { action: tr("plan.toast.retry", "Retry"), onAction: retryFn } : undefined;
    if (api?.[type]) api[type](msg, opts);
    else if (api?.show) api.show(msg, type);
  }

  function showPlanError(err, retryFn) {
    const key = err?.code === "permission-denied" ? "plan.toast.permission" : "plan.toast.error";
    const fallback = err?.code === "permission-denied"
      ? "Could not save. Sign in and try again."
      : "Could not save your plan.";
    showPlanToast("error", key, fallback, retryFn);
  }

  function setTaskPending(id, pending) {
    if (!id) return;
    if (pending) state.pendingTaskIds.add(id);
    else state.pendingTaskIds.delete(id);
    renderList();
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
      if (state.viewMode !== "list") renderList();
    } catch (_) {
      state.habits = [];
      state.habitLogs = {};
      renderHabits();
      if (state.viewMode !== "list") renderList();
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
      }, (err) => {
        state.tasksSnapReady = true;
        renderList();
        showPlanError(err, () => loadTasks());
      });

      HBIT.db.tasks.listAll().then(allTasks => {
        const today = getTodayStr();
        const mapped = (allTasks || []).filter(t => t.done === false);
        state.allOpenTasks = mapped;
        state.allPastUndone = mapped.filter(t => t.date < today);
        buildCalendarMeta(mapped);
        if ($("plCarryOver")) $("plCarryOver").hidden = true;
        maybeShowMorningReview();
        renderCalendar();
      }).catch((err) => {
        showPlanError(err, () => loadTasks());
      });

      loadTodaysHabits();

    } else {
      const raw = localStorage.getItem("hbit:plan:tasks");
      const allTasks = raw ? JSON.parse(raw) : [];
      state.tasks = allTasks.filter(t => t.date === state.selectedDate);
      const today = getTodayStr();
      state.allPastUndone = allTasks.filter(t => t.done === false && t.date < today);
      state.allOpenTasks = allTasks.filter(t => t.done === false);
      buildCalendarMeta(allTasks);
      if ($("plCarryOver")) $("plCarryOver").hidden = true;
      maybeShowMorningReview();
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
    const t = { ...normalizeTaskPayload(data), done: false, date: data.date || state.selectedDate, createdAt: Date.now() };
    try {
      if (isFs()) { await HBIT.db.tasks.add(t); }
      else {
        const all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
        t.id = String(Date.now());
        all.push(t);
        localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
        loadTasks();
      }
      showPlanToast("success", "plan.toast.added", "Task added.");
    } catch (err) {
      showPlanError(err, () => addTask(data));
      throw err;
    }
  }

  async function updateTask(id, data) {
    try {
      const current = state.tasks.find((task) => task.id === id)
        || state.allOpenTasks.find((task) => task.id === id)
        || state.allPastUndone.find((task) => task.id === id)
        || {};
      const normalized = normalizeTaskPayload({ ...current, ...data });
      if (isFs()) { await HBIT.db.tasks.update(id, { ...normalized, updatedAt: Date.now() }); }
      else {
        let all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
        all = all.map(t => t.id === id ? { ...t, ...normalized, updatedAt: Date.now() } : t);
        localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
        loadTasks();
      }
      showPlanToast("success", "plan.toast.updated", "Task updated.");
    } catch (err) {
      showPlanError(err, () => updateTask(id, data));
      throw err;
    }
  }

  function normalizeTaskPayload(data = {}) {
    return {
      ...data,
      title: String(data.title || data.text || "").trim(),
      time: normalizeTimeInput(data.time || ""),
      duration: Math.max(1, Number(data.duration) || 60),
      priority: ["low", "medium", "high"].includes(data.priority) ? data.priority : "medium",
      recurrence: data.recurrence || "once",
      habitId: data.habitId || "",
      subtasks: Array.isArray(data.subtasks) ? data.subtasks.slice(0, 5).map((item) => ({
        text: String(item.text || "").trim(),
        done: !!item.done,
      })).filter((item) => item.text) : [],
      tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag).trim().replace(/^#/, "")).filter(Boolean) : [],
      reminderOffsetMin: data.reminderOffsetMin === "" || data.reminderOffsetMin == null ? "" : Number(data.reminderOffsetMin),
      customDays: Array.isArray(data.customDays) ? data.customDays : [],
      notes: String(data.notes || "").trim(),
    };
  }

  async function toggleTask(id, currentDone) {
    setTaskPending(id, true);
    try {
      if (isFs()) { await HBIT.db.tasks.update(id, { done: !currentDone }); }
      else {
        let all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
        all = all.map(t => t.id === id ? { ...t, done: !currentDone } : t);
        localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
        loadTasks();
      }
      showPlanToast("success", currentDone ? "plan.toast.reopened" : "plan.toast.completed", currentDone ? "Task reopened." : "Task complete.");
    } catch (err) {
      showPlanError(err, () => toggleTask(id, currentDone));
    } finally {
      setTaskPending(id, false);
    }
  }

  async function deleteTask(id) {
    setTaskPending(id, true);
    try {
      if (isFs()) { await HBIT.db.tasks.delete(id); }
      else {
        let all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
        all = all.filter(t => t.id !== id);
        localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
        loadTasks();
      }
      showPlanToast("success", "plan.toast.deleted", "Task deleted.");
    } catch (err) {
      showPlanError(err, () => deleteTask(id));
    } finally {
      setTaskPending(id, false);
    }
  }

  async function carryOver() {
    if (!state.allPastUndone.length) return;
    const today = getTodayStr();
    try {
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
      showPlanToast("success", "plan.toast.carried", "Tasks moved to today.");
    } catch (err) {
      showPlanError(err, carryOver);
    }
  }

  function reviewKey() {
    return `hbit:plan:morningReview:${getTodayStr()}`;
  }

  function dismissMorningReview() {
    try { localStorage.setItem(reviewKey(), "done"); } catch {}
    const overlay = $("plMorningReview");
    if (overlay) HBIT.components?.closeSheet ? HBIT.components.closeSheet(overlay) : (overlay.hidden = true);
  }

  function maybeShowMorningReview() {
    const overlay = $("plMorningReview");
    const list = $("plReviewList");
    if (!overlay || !list || state.selectedDate !== getTodayStr() || !state.allPastUndone.length) return;
    try {
      if (localStorage.getItem(reviewKey()) === "done") return;
    } catch {}
    list.innerHTML = state.allPastUndone.map((task) => `<article class="pl-review-row" data-review-id="${escapeHtml(task.id)}">
      <div>
        <strong>${escapeHtml(task.title || task.text || tr("plan.task.untitled", "Untitled task"))}</strong>
        <span>${escapeHtml(task.date || "")} · ${escapeHtml(formatTimeDisp(task.time))}</span>
      </div>
      <div class="pl-review-actions">
        <button type="button" data-review-action="forward">${escapeHtml(tr("plan.review.forward", "Bring forward"))}</button>
        <button type="button" data-review-action="reschedule">${escapeHtml(tr("plan.review.reschedule", "Reschedule..."))}</button>
        <button type="button" data-review-action="drop">${escapeHtml(tr("plan.review.drop", "Drop"))}</button>
      </div>
      <div class="pl-review-reschedule" hidden>
        <input type="date" value="${escapeHtml(getTodayStr())}" aria-label="${escapeHtml(tr("plan.review.pickDate", "Move to date"))}">
        <button type="button" data-review-action="apply-date">${escapeHtml(tr("common.apply", "Apply"))}</button>
      </div>
    </article>`).join("");
    HBIT.components?.openSheet ? HBIT.components.openSheet(overlay) : (overlay.hidden = false);
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
      const tone = hasTasks ? priorityTone(state.dateMetaByDate[dStr]?.priority) : "";
      const isToday = dStr === today;
      const label = formatterLong.format(d);
      return `
        <button class="pl-cal-day ${isActive ? "active" : ""} ${hasTasks ? "has-tasks" : ""} ${tone} ${isToday ? "today" : ""}" data-date="${dStr}" type="button"
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
    renderDaySummary();
    renderOverview();
    renderViewSwitch();
    renderHabitMenu();
    if (state.viewMode === "week") renderWeekGrid();
    else if (state.viewMode === "list") renderAgendaList();
    else renderDayGrid();
  }

  function renderViewSwitch() {
    document.querySelectorAll("[data-view-mode]").forEach((btn) => {
      const active = btn.dataset.viewMode === state.viewMode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function scheduledTasks() {
    return state.tasks.filter((task) => task.time && (state.priorityFilter === "all" || (task.priority || "low") === state.priorityFilter));
  }

  function timelineHabitBlocks() {
    if (state.selectedDate !== getTodayStr()) return [];
    return (state.habits || []).map((habit) => {
      const time = habit.time || habit.startTime || WHEN_TIMES[habit.when || "flexible"] || "";
      if (!time) return null;
      return {
        id: `habit:${habit.id}`,
        habitId: habit.id,
        title: habit.name || habit.title || tr("plan.habit.untitled", "Habit"),
        time,
        duration: Number(habit.duration) || 30,
        priority: "habit",
        isHabit: true,
        done: state.habitLogs[habit.id]?.status === "done",
      };
    }).filter(Boolean);
  }

  function blockStyle(item, dense = false) {
    const start = Math.max(HOUR_START * 60, timeToMinutes(item.time));
    const endCap = (HOUR_END + 1) * 60;
    const top = ((start - HOUR_START * 60) / 60) * (dense ? 42 : ROW_H);
    const height = Math.max(dense ? 24 : 38, (Math.min(taskDuration(item), endCap - start) / 60) * (dense ? 42 : ROW_H));
    return `top:${top}px;height:${height}px;`;
  }

  function renderDayGrid() {
    const list = $("planList");
    const empty = $("planEmpty");
    if (!list || !empty) return;
    const isEmpty = state.tasks.length === 0 && state.habits.length === 0;
    empty.hidden = !isEmpty;
    const summary = document.querySelector(".pl-day-summary");
    const overview = document.querySelector(".pl-overview");
    const filter = document.querySelector(".pl-priority-filter");
    if (summary) summary.hidden = isEmpty;
    if (overview) overview.hidden = isEmpty;
    if (filter) filter.hidden = isEmpty;
    const fab = document.getElementById("plFabBtn");
    if (fab) fab.hidden = isEmpty;
    if (isEmpty) { list.innerHTML = ""; list.className = "pl-timeline"; return; }
    const hours = [];
    for (let h = HOUR_START; h <= HOUR_END; h += 1) hours.push(h);
    const blocks = [...scheduledTasks(), ...timelineHabitBlocks()].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const nowLine = renderNowLine();
    list.className = "pl-timeline pl-timeline--grid";
    list.innerHTML = `
      <div class="pl-day-grid" style="--row-h:${ROW_H}px">
        <div class="pl-hour-rail" aria-hidden="true">
          ${hours.map((h) => `<div class="pl-hour-label">${String(h).padStart(2, "0")}:00</div>`).join("")}
        </div>
        <div class="pl-hour-canvas">
          ${hours.map((h) => `<button class="pl-hour-row" type="button" data-slot-time="${minutesToTime(h * 60)}" aria-label="${escapeHtml(tr("plan.grid.addAt", "Add task at {time}", { time: minutesToTime(h * 60) }))}"></button>`).join("")}
          ${nowLine}
          ${blocks.map((item) => renderTimelineBlock(item)).join("")}
        </div>
      </div>
      ${renderAnytimeLane()}
    `;
  }

  function renderTimelineBlock(item) {
    const priority = item.isHabit ? "habit" : (item.priority || "low");
    const conflict = item.isHabit ? null : findConflict(item);
    const tags = (item.tags || []).slice(0, 2).map((tag) => `<span class="pl-block-tag hbit-pill" data-dot="false">#${escapeHtml(tag)}</span>`).join("");
    return `<article class="pl-grid-block ${item.done ? "is-done" : ""} ${item.isHabit ? "is-habit" : ""} priority-${escapeHtml(priority)}"
        style="${blockStyle(item)}" data-id="${escapeHtml(item.id)}" data-block-kind="${item.isHabit ? "habit" : "task"}">
      <div class="pl-grid-block-main">
        <span class="pl-block-time">${formatTimeDisp(item.time)} &middot; ${taskDuration(item)}m</span>
        <strong>${escapeHtml(item.title || item.text || tr("plan.task.untitled", "Untitled task"))}</strong>
        <span class="pl-block-meta">${item.isHabit ? escapeHtml(tr("plan.block.habit", "Habit")) : escapeHtml(tr(`plan.priority.${item.priority || "low"}`, item.priority || "low"))}${tags}</span>
      </div>
      ${item.isHabit ? `<button class="pl-block-check" type="button" data-action="habit-toggle">${item.done ? "OK" : "Done"}</button>` : `
        <div class="pl-block-nudge" aria-label="${escapeHtml(tr("plan.grid.nudge", "Move task"))}">
          <button type="button" data-action="move-earlier" aria-label="${escapeHtml(tr("plan.grid.moveEarlier", "Move 15 minutes earlier"))}">-15</button>
          <button type="button" data-action="move-later" aria-label="${escapeHtml(tr("plan.grid.moveLater", "Move 15 minutes later"))}">+15</button>
        </div>
        <button class="pl-block-check" type="button" data-action="toggle">${item.done ? "Open" : "Done"}</button>
        <span class="pl-resize-handle" data-resize-handle aria-hidden="true"></span>
      `}
      ${conflict ? `<div class="pl-conflict-actions">
        <span>${escapeHtml(tr("plan.conflict.with", "Conflicts with {title}", { title: conflict.title || conflict.text || "task" }))}</span>
        <button type="button" data-action="conflict-later">${escapeHtml(tr("plan.conflict.moveLater", "Move 30m later"))}</button>
        <button type="button" data-action="conflict-free">${escapeHtml(tr("plan.conflict.nextFree", "Next free"))}</button>
      </div>` : ""}
    </article>`;
  }

  function renderAnytimeLane() {
    const anytime = state.tasks.filter((item) => !item.time && (state.priorityFilter === "all" || (item.priority || "low") === state.priorityFilter));
    if (!anytime.length) return "";
    return `<section class="pl-anytime-lane">
      <h2 class="pl-list-section-title">${escapeHtml(tr("plan.section.anytime", "Anytime"))}</h2>
      ${anytime.map((item) => `<button class="pl-anytime-pill ${item.done ? "is-done" : ""}" type="button" data-id="${escapeHtml(item.id)}" data-action="edit">
        <span>${escapeHtml(item.title || item.text || tr("plan.task.untitled", "Untitled task"))}</span>
        <small>${escapeHtml(tr(`plan.priority.${item.priority || "low"}`, item.priority || "low"))}</small>
      </button>`).join("")}
    </section>`;
  }

  function renderNowLine() {
    if (state.selectedDate !== getTodayStr()) return "";
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (mins < HOUR_START * 60 || mins > (HOUR_END + 1) * 60) return "";
    const top = ((mins - HOUR_START * 60) / 60) * ROW_H;
    return `<div class="pl-now-line" style="top:${top}px"><span>${escapeHtml(tr("plan.grid.now", "Now"))}</span></div>`;
  }

  function renderWeekGrid() {
    const list = $("planList");
    const empty = $("planEmpty");
    if (!list || !empty) return;
    empty.hidden = true;
    const summary = document.querySelector(".pl-day-summary");
    const overview = document.querySelector(".pl-overview");
    const filter = document.querySelector(".pl-priority-filter");
    if (summary) summary.hidden = false;
    if (overview) overview.hidden = false;
    if (filter) filter.hidden = false;
    const fab = document.getElementById("plFabBtn");
    if (fab) fab.hidden = false;
    const base = strToDate(state.selectedDate);
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    const days = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d;
    });
    const loc = getLang() === "fr" ? "fr-CA" : "en-CA";
    list.className = "pl-timeline pl-timeline--week";
    list.innerHTML = `<div class="pl-week-grid">
      ${days.map((day) => {
        const dateKey = dateToStr(day);
        const dayTasks = (dateKey === state.selectedDate ? state.tasks : state.allOpenTasks.filter((task) => task.date === dateKey)).filter((task) => task.time);
        return `<section class="pl-week-col ${dateKey === state.selectedDate ? "active" : ""}" data-week-date="${dateKey}">
          <button class="pl-week-head" type="button" data-week-pick="${dateKey}">
            <span>${new Intl.DateTimeFormat(loc, { weekday: "short" }).format(day)}</span>
            <strong>${new Intl.DateTimeFormat(loc, { day: "numeric" }).format(day)}</strong>
          </button>
          <div class="pl-week-stack">
            ${(dateKey === state.selectedDate ? [...scheduledTasks(), ...timelineHabitBlocks()] : dayTasks).map((task) => `<button class="pl-week-task priority-${escapeHtml(task.isHabit ? "habit" : task.priority || "low")}" type="button" data-id="${escapeHtml(task.id)}" data-week-task-date="${escapeHtml(dateKey)}" data-block-kind="${task.isHabit ? "habit" : "task"}">
              <span>${escapeHtml(formatTimeDisp(task.time))}</span>
              <strong>${escapeHtml(task.title || task.text || "")}</strong>
            </button>`).join("") || `<p>${escapeHtml(tr("plan.week.empty", "No timed plans"))}</p>`}
          </div>
        </section>`;
      }).join("")}
    </div>`;
  }

  function renderAgendaList() {
    const list = $("planList");
    const empty = $("planEmpty");
    if (!list || !empty) return;
    list.className = "pl-timeline";

    if (state.user && window.firebase && firebase.firestore && !state.tasksSnapReady) {
      empty.hidden = true;
      list.innerHTML = [1, 2, 3].map(() =>
        `<article class="pl-item skeleton" aria-hidden="true"><div class="pl-card hbit-card" style="min-height:72px"></div></article>`
      ).join("");
      return;
    }

    const filteredTasks = state.tasks.filter((task) => {
      if (state.priorityFilter === "all") return true;
      return (task.priority || "low") === state.priorityFilter;
    });

    const isEmpty = state.tasks.length === 0;
    empty.hidden = !isEmpty;
    const summary = document.querySelector(".pl-day-summary");
    const overview = document.querySelector(".pl-overview");
    const filter = document.querySelector(".pl-priority-filter");
    if (summary) summary.hidden = isEmpty;
    if (overview) overview.hidden = isEmpty;
    if (filter) filter.hidden = isEmpty;
    const fab = document.getElementById("plFabBtn");
    if (fab) fab.hidden = isEmpty;

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
      const isOverdue = !item.done && item.date < today;
      const confirming = state.planDeleteConfirmId === item.id;
      const pending = state.pendingTaskIds.has(item.id);
      const statusKey = item.done ? "done" : isOverdue ? "overdue" : isCurrent ? "current" : item.time ? "upcoming" : "unscheduled";
      const priority = item.priority || "low";
      const conflict = hasConflict(item);
      const actionsHtml = confirming
        ? `<div class="pl-del-confirm" role="group" aria-label="${escapeHtml(tr("plan.delete.confirm", "Are you sure?"))}">
            <span class="pl-del-msg">${escapeHtml(tr("plan.delete.confirm", "Are you sure?"))}</span>
            <button class="pl-act-btn is-confirm" data-action="confirm-delete" type="button">${escapeHtml(tr("common.confirm", "Confirm"))}</button>
            <button class="pl-act-btn is-cancel" data-action="cancel-delete" type="button">${escapeHtml(tr("common.cancel", "Cancel"))}</button>
          </div>`
        : `<button class="pl-act-btn is-edit" data-action="edit" type="button" aria-label="${escapeHtml(tr("common.edit", "Edit"))}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="pl-act-btn is-delete" data-action="delete" type="button" aria-label="${escapeHtml(tr("common.delete", "Delete"))}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button class="pl-act-btn is-check" data-action="toggle" type="button" aria-label="${escapeHtml(item.done ? tr("plan.aria.reopen", "Reopen task") : tr("plan.aria.complete", "Complete task"))}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </button>`;
      return `
      <article class="pl-item ${item.done ? "is-done" : ""} ${isUpcoming ? "is-upcoming" : ""} ${isCurrent ? "is-current" : ""} ${isOverdue ? "is-overdue" : ""} ${pending ? "is-pending" : ""}" data-id="${item.id}" data-pty="${priority}">
        <div class="pl-item-head">
          <div class="pl-time-col">
            <span class="pl-time-display">${formatTimeDisp(item.time)}</span>
            ${item.duration ? `<span class="pl-dur-display">${item.duration}m</span>` : ''}
          </div>
          <div class="pl-card hbit-card" tabindex="0" aria-busy="${pending ? "true" : "false"}">
            <div class="pl-card-meta">
              <span class="pl-status-pill hbit-pill is-${statusKey}" data-dot="false">${statusIcon(statusKey)} ${escapeHtml(taskStatusLabel(statusKey))}</span>
              <span class="pl-priority-pill hbit-pill ${escapeHtml(priority)}" data-dot="false">${priorityIcon(priority)} ${escapeHtml(tr(`plan.priority.${priority}`, priority))}</span>
              ${conflict ? `<span class="pl-status-pill hbit-pill is-overdue" data-dot="false">${escapeHtml(tr("plan.status.conflict", "Conflict"))}</span>` : ""}
            </div>
            <div class="pl-card-top">
              <h3 class="pl-item-title"><span class="pl-task-name">${escapeHtml(item.title || item.text)}</span></h3>
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

  function renderDaySummary() {
    const main = $("plSummaryMain");
    const meta = $("plSummaryMeta");
    const fill = $("plSummaryFill");
    if (!main || !meta || !fill) return;
    const total = state.tasks.length;
    const done = state.tasks.filter(t => !!t.done).length;
    const mins = state.tasks.reduce((n, t) => n + (Number(t.duration) || 0), 0);
    main.textContent = tr("plan.summary.main", "{count} tasks", { count: total });
    meta.textContent = tr("plan.summary.meta", "{done} complete • {mins} min", { done, mins });
    fill.style.width = `${total ? Math.round(done / total * 100) : 0}%`;
  }

  function renderOverview() {
    const dateEl = $("plOverviewDate");
    const dateMetaEl = $("plOverviewDateMeta");
    const nextEl = $("plOverviewNext");
    const nextMetaEl = $("plOverviewNextMeta");
    if (!dateEl || !dateMetaEl || !nextEl || !nextMetaEl) return;

    const loc = getLang() === "fr" ? "fr-CA" : "en-CA";
    const selected = strToDate(state.selectedDate);
    dateEl.textContent = new Intl.DateTimeFormat(loc, { weekday: "long", month: "short", day: "numeric" }).format(selected);
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => !!t.done).length;
    dateMetaEl.textContent = tr("plan.overview.dateMeta", "{done}/{total} done", { done, total });

    const upcoming = state.tasks
      .filter((t) => !t.done)
      .sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"))[0];

    if (!upcoming) {
      nextEl.textContent = tr("plan.overview.noNext", "No upcoming task");
      nextMetaEl.textContent = tr("plan.overview.noNextMeta", "Add a task to start planning.");
      return;
    }

    nextEl.textContent = upcoming.title || upcoming.text || tr("plan.task.untitled", "Untitled task");
    nextMetaEl.textContent = `${formatTimeDisp(upcoming.time)} • ${upcoming.duration || 0}m • ${tr(`plan.priority.${upcoming.priority || "low"}`, upcoming.priority || "low")}`;

    const counts = { high: 0, medium: 0, low: 0 };
    state.tasks.forEach((t) => {
      const p = (t.priority || "low").toLowerCase();
      if (counts[p] !== undefined) counts[p] += 1;
    });
    const setMix = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = String(n); };
    setMix("plMixHigh", counts.high);
    setMix("plMixMedium", counts.medium);
    setMix("plMixLow", counts.low);
  }

  function taskStatusLabel(status) {
    const map = {
      current: ["plan.status.current", "Now"],
      upcoming: ["plan.status.upcoming", "Upcoming"],
      unscheduled: ["plan.status.unscheduled", "Anytime"],
      overdue: ["plan.status.overdue", "Overdue"],
      done: ["plan.status.done", "Done"],
    };
    const pair = map[status] || map.upcoming;
    return tr(pair[0], pair[1]);
  }

  function statusIcon(status) {
    if (status === "done") return "✓";
    if (status === "overdue") return "!";
    if (status === "current") return "•";
    return "○";
  }

  function priorityIcon(priority) {
    if (priority === "high") return "!";
    if (priority === "medium") return "•";
    return "○";
  }

  function hasConflict(item) {
    return !!findConflict(item);
  }

  function findConflict(item) {
    if (!item?.time || item.done) return null;
    const dur = Math.max(1, parseInt(item.duration, 10) || 1);
    const [sh, sm] = String(item.time).split(":").map(Number);
    const start = (sh || 0) * 60 + (sm || 0);
    const end = start + dur;
    return state.tasks.find((t) => {
      if (t === item || t.id === item.id || !t.time || t.done) return false;
      const [th, tm] = String(t.time).split(":").map(Number);
      const ts = (th || 0) * 60 + (tm || 0);
      const te = ts + Math.max(1, parseInt(t.duration, 10) || 1);
      return start < te && end > ts;
    }) || null;
  }

  function nextFreeSlot(task, afterMinutes = null) {
    const duration = taskDuration(task);
    const busy = state.tasks
      .filter((item) => item.id !== task.id && item.time && !item.done)
      .map((item) => {
        const start = timeToMinutes(item.time);
        return { start, end: start + taskDuration(item) };
      })
      .sort((a, b) => a.start - b.start);
    let cursor = snapMinutes(afterMinutes == null ? timeToMinutes(task.time) : afterMinutes);
    const latest = (HOUR_END + 1) * 60 - duration;
    while (cursor <= latest) {
      const end = cursor + duration;
      const clash = busy.find((slot) => cursor < slot.end && end > slot.start);
      if (!clash) return minutesToTime(cursor);
      cursor = snapMinutes(clash.end);
    }
    return minutesToTime(latest);
  }

  function renderHabits() {
    const section = $("plHabitsSection");
    const list = $("plHabitList");
    if (!section || !list) return;
    section.hidden = true;
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

  function renderHabitMenu() {
    const menu = $("plHabitMenu");
    if (!menu) return;
    const options = [`<button type="button" data-habit-option="">${escapeHtml(tr("plan.habit.none", "No linked habit"))}</button>`]
      .concat((state.habits || []).map((habit) => `<button type="button" data-habit-option="${escapeHtml(habit.id)}">${escapeHtml(habit.name || habit.title || tr("plan.habit.untitled", "Habit"))}</button>`));
    menu.innerHTML = options.join("");
  }

  function manageNowTimer() {
    if (state.nowTimer) {
      clearInterval(state.nowTimer);
      state.nowTimer = null;
    }
    if (state.viewMode === "today" && state.selectedDate === getTodayStr()) {
      state.nowTimer = setInterval(() => renderDayGrid(), 60000);
    }
  }

  function normalizeTimeInput(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    const ampm = raw.match(/^(\d{1,2})(?::?([0-5]\d))?\s*(am|pm)$/);
    if (ampm) {
      let h = Number(ampm[1]);
      const m = Number(ampm[2] || 0);
      if (ampm[3] === "pm" && h < 12) h += 12;
      if (ampm[3] === "am" && h === 12) h = 0;
      return minutesToTime(h * 60 + m);
    }
    const plain = raw.match(/^(\d{1,2})(?::|\.)([0-5]\d)$/) || raw.match(/^(\d{1,2})$/);
    if (plain) {
      const h = Number(plain[1]);
      const m = Number(plain[2] || 0);
      if (h >= 0 && h <= 23) return minutesToTime(h * 60 + m);
    }
    return "";
  }

  function parseQuickAdd(text) {
    let rest = String(text || "").trim();
    const tags = [...rest.matchAll(/#([\w-]+)/g)].map((m) => m[1]);
    rest = rest.replace(/#[\w-]+/g, " ");
    const priorityMatch = rest.match(/\b(low|medium|high)\b/i);
    const priority = priorityMatch ? priorityMatch[1].toLowerCase() : "low";
    if (priorityMatch) rest = rest.replace(priorityMatch[0], " ");
    const durationMatch = rest.match(/\b(\d{1,3})\s*(m|min)\b/i);
    const duration = durationMatch ? Number(durationMatch[1]) : 60;
    if (durationMatch) rest = rest.replace(durationMatch[0], " ");
    const timeMatch = rest.match(/\b(?:[01]?\d|2[0-3])(?:[:.][0-5]\d)?\s?(?:am|pm)?\b/i);
    const time = timeMatch ? normalizeTimeInput(timeMatch[0]) : "";
    if (timeMatch) rest = rest.replace(timeMatch[0], " ");
    const title = rest.replace(/\s+/g, " ").trim() || text.trim();
    return { title, time, duration, priority, tags };
  }

  function renderQuickPreview() {
    const preview = $("plQuickPreview");
    const input = $("plQuickInput");
    if (!preview || !input) return;
    const value = input.value.trim();
    if (!value) {
      state.quickDraft = null;
      preview.hidden = true;
      preview.innerHTML = "";
      return;
    }
    const parsed = parseQuickAdd(value);
    state.quickDraft = parsed;
    preview.hidden = false;
    preview.innerHTML = [
      parsed.time ? formatTimeDisp(parsed.time) : tr("plan.time.anytime", "Anytime"),
      `${parsed.duration}m`,
      tr(`plan.priority.${parsed.priority}`, parsed.priority),
      ...parsed.tags.map((tag) => `#${escapeHtml(tag)}`),
    ].map((chip) => `<span class="hbit-pill" data-dot="false">${escapeHtml(chip)}</span>`).join("");
  }

  function beginGridPointer(e) {
    const block = e.target.closest(".pl-grid-block[data-block-kind='task']");
    if (!block || e.target.closest("button")) return;
    const task = state.tasks.find((item) => item.id === block.dataset.id);
    const canvas = block.closest(".pl-hour-canvas");
    if (!task || !canvas) return;
    e.preventDefault();
    block.setPointerCapture?.(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const startY = e.clientY;
    const startMinutes = timeToMinutes(task.time);
    const startDuration = taskDuration(task);
    const resizing = !!e.target.closest("[data-resize-handle]");
    state.dragState = { id: task.id, rect, startY, startMinutes, startDuration, resizing };
    block.classList.add("is-dragging");

    const move = (ev) => {
      if (!state.dragState) return;
      const deltaMin = ((ev.clientY - state.dragState.startY) / ROW_H) * 60;
      if (state.dragState.resizing) {
        const duration = Math.max(15, Math.round((state.dragState.startDuration + deltaMin) / SNAP_MIN) * SNAP_MIN);
        block.style.height = `${Math.max(38, (duration / 60) * ROW_H)}px`;
        block.dataset.previewDuration = String(duration);
      } else {
        const next = snapMinutes(state.dragState.startMinutes + deltaMin);
        block.style.top = `${((next - HOUR_START * 60) / 60) * ROW_H}px`;
        block.dataset.previewTime = minutesToTime(next);
      }
    };

    const up = async () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      const previewTime = block.dataset.previewTime;
      const previewDuration = block.dataset.previewDuration;
      block.classList.remove("is-dragging");
      delete block.dataset.previewTime;
      delete block.dataset.previewDuration;
      const payload = {};
      if (previewTime) payload.time = previewTime;
      if (previewDuration) payload.duration = Number(previewDuration);
      state.dragState = null;
      if (Object.keys(payload).length) await updateTask(task.id, payload);
      else renderList();
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, { once: true });
  }

  // ======================================================================
  // UI LOGIC
  // ======================================================================
  function bindUi() {
    const modal = $("plModal");
    const form = $("planForm");
    function setSegmentValue(inputId, selector, value) {
      const input = $(inputId);
      if (input) input.value = value == null ? "" : String(value);
      document.querySelectorAll(selector).forEach((btn) => {
        const key = btn.dataset.priorityValue ?? btn.dataset.recurrenceValue ?? btn.dataset.reminderValue ?? "";
        const active = String(key) === String(value == null ? "" : value);
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-checked", active ? "true" : "false");
      });
    }

    function getCustomDays() {
      return Array.from(document.querySelectorAll("[data-custom-day].active")).map((btn) => btn.dataset.customDay);
    }

    function setCustomDays(days = []) {
      document.querySelectorAll("[data-custom-day]").forEach((btn) => {
        btn.classList.toggle("active", days.includes(btn.dataset.customDay));
      });
    }

    function setHabitValue(id) {
      const input = $("plInputHabit");
      const label = $("plHabitTriggerText");
      const habit = state.habits.find((item) => item.id === id);
      if (input) input.value = id || "";
      if (label) label.textContent = habit ? (habit.name || habit.title || tr("plan.habit.untitled", "Habit")) : tr("plan.habit.none", "No linked habit");
      if (habit && $("plInputDur")) $("plInputDur").value = Number(habit.duration) || $("plInputDur").value || 30;
    }

    function renderSubtaskInputs(items = []) {
      const wrap = $("plSubtasks");
      if (!wrap) return;
      const normalized = items.slice(0, 5);
      wrap.innerHTML = normalized.map((item, index) => `<label class="pl-subtask-row">
        <input type="checkbox" ${item.done ? "checked" : ""} />
        <input type="text" value="${escapeHtml(item.text || "")}" data-subtask-index="${index}" placeholder="${escapeHtml(tr("plan.subtask.placeholder", "Subtask"))}" />
        <button type="button" data-subtask-remove="${index}" aria-label="${escapeHtml(tr("common.delete", "Delete"))}">x</button>
      </label>`).join("");
    }

    function readSubtasks() {
      return Array.from(document.querySelectorAll(".pl-subtask-row")).map((row) => ({
        done: !!row.querySelector('input[type="checkbox"]')?.checked,
        text: row.querySelector('input[type="text"]')?.value.trim() || "",
      })).filter((item) => item.text).slice(0, 5);
    }

    function populateHourSelect(sel, withNone) {
      if (!sel || sel.options.length) return;
      if (withNone) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = tr("plan.time.none", "—");
        sel.appendChild(opt);
      }
      for (let h = HOUR_START; h <= HOUR_END; h += 1) {
        for (const m of [0, 30]) {
          const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const o = document.createElement("option");
          o.value = v;
          o.textContent = formatTimeDisp(v);
          sel.appendChild(o);
        }
      }
    }

    function setKind(kind) {
      const k = kind === "event" ? "event" : "task";
      const hidden = $("plInputKind");
      if (hidden) hidden.value = k;
      document.querySelectorAll("[data-kind-value]").forEach((btn) => {
        const active = btn.dataset.kindValue === k;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-checked", active ? "true" : "false");
      });
      const row = document.getElementById("plEventTimeRow");
      if (row) row.hidden = k !== "event";
    }

    function openTaskSheet(task, preset = {}) {
      const data = { ...(task || {}), ...(preset || {}) };
      state.editingTaskId = task?.id || null;
      if ($("plEditingId")) $("plEditingId").value = state.editingTaskId || "";
      if ($("plInputTitle")) $("plInputTitle").value = data.title || data.text || "";
      populateHourSelect($("plInputTime"), true);
      populateHourSelect($("plInputEnd"), false);
      const kind = data.kind || (data.time ? "event" : "task");
      setKind(kind);
      if ($("plInputTime")) $("plInputTime").value = data.time || "";
      if ($("plInputDur")) $("plInputDur").value = data.duration || 60;
      if ($("plInputEnd")) {
        if (data.time) {
          const endMin = timeToMinutes(data.time) + (Number(data.duration) || 60);
          $("plInputEnd").value = minutesToTime(Math.min(endMin, (HOUR_END + 1) * 60 - 30));
        } else {
          $("plInputEnd").value = "";
        }
      }
      if ($("plInputLocation")) $("plInputLocation").value = data.location || "";
      setSegmentValue("plInputPty", "[data-priority-value]", data.priority || "medium");
      setSegmentValue("plInputRecurrence", "[data-recurrence-value]", data.recurrence || "once");
      setSegmentValue("plInputReminder", "[data-reminder-value]", data.reminderOffsetMin ?? "");
      setCustomDays(data.customDays || []);
      $("plCustomDays")?.toggleAttribute("hidden", (data.recurrence || "once") !== "custom");
      setHabitValue(data.habitId || "");
      renderSubtaskInputs(data.subtasks || []);
      if ($("plInputTags")) $("plInputTags").value = (data.tags || []).join(", ");
      if ($("plInputNotes")) $("plInputNotes").value = data.notes || "";
      const title = document.querySelector(".pl-modal-title");
      if (title) title.textContent = state.editingTaskId ? tr("plan.modal.editTitle", "Edit Task") : tr("plan.modal.title", "Add Task");
      const save = $("plModalSave");
      if (save) save.textContent = state.editingTaskId ? tr("plan.btn.saveTask", "Save task") : tr("plan.btn.addItinerary", "Add task");
      if (modal) { HBIT.components?.openSheet(modal); $("plInputTitle")?.focus(); }
      checkConflict();
    }

    function closeTaskSheet() {
      if (modal) HBIT.components?.closeSheet(modal);
      state.editingTaskId = null;
      if (form) form.reset();
      if ($("plEditingId")) $("plEditingId").value = "";
      const msg = $("plConflictMsg");
      if (msg) { msg.hidden = true; msg.textContent = ""; }
    }

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
        manageNowTimer();
      }
    });
    $("plWeekPrev")?.addEventListener("click", () => {
      state.weekOffset -= 1;
      if (state.viewMode === "week") {
        const d = strToDate(state.selectedDate);
        d.setDate(d.getDate() - 7);
        state.selectedDate = dateToStr(d);
        renderHeader();
        loadTasks();
      }
      renderCalendar();
    });
    $("plWeekNext")?.addEventListener("click", () => {
      state.weekOffset += 1;
      if (state.viewMode === "week") {
        const d = strToDate(state.selectedDate);
        d.setDate(d.getDate() + 7);
        state.selectedDate = dateToStr(d);
        renderHeader();
        loadTasks();
      }
      renderCalendar();
    });

    document.querySelector(".pl-view-switch")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view-mode]");
      if (!btn) return;
      setViewMode(btn.dataset.viewMode);
    });

    $("planList")?.addEventListener("click", (e) => {
      const slot = e.target.closest("[data-slot-time]");
      if (slot) {
        openTaskSheet(null, { time: slot.dataset.slotTime, duration: 60, priority: "medium" });
        return;
      }
      const weekPick = e.target.closest("[data-week-pick]");
      if (weekPick) {
        state.selectedDate = weekPick.dataset.weekPick;
        setViewMode("today");
        renderHeader();
        loadTasks();
        manageNowTimer();
        return;
      }
      const actionEl = e.target.closest("[data-action]");
      const item = e.target.closest(".pl-item, .pl-grid-block, .pl-anytime-pill, .pl-week-task");
      if (!item) return;
      
      const id = item.getAttribute("data-id");
      const action = actionEl?.getAttribute("data-action");
      const task = state.tasks.find((t) => t.id === id) || state.allOpenTasks.find((t) => t.id === id);
      if (!actionEl && item.classList.contains("pl-week-task")) {
        const pickedDate = item.dataset.weekTaskDate;
        if (pickedDate) {
          state.selectedDate = pickedDate;
          setViewMode("today");
          renderHeader();
          loadTasks();
          manageNowTimer();
        }
        return;
      }
      if (!actionEl) return;
      if (item.dataset.blockKind === "habit" || id?.startsWith("habit:")) {
        const habitId = item.getAttribute("data-id")?.replace("habit:", "");
        if (action === "habit-toggle" && habitId) {
          HBIT.db?.habitLogs?.set?.(habitId, state.selectedDate, "done").then(() => {
            state.habitLogs[habitId] = { status: "done" };
            renderList();
          }).catch((err) => showPlanError(err));
        }
        return;
      }
      if (action === "edit" && task) {
        state.planDeleteConfirmId = null;
        openTaskSheet(task);
      }
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
      if (action === "conflict-later" && task) {
        updateTask(id, { time: minutesToTime(timeToMinutes(task.time) + 30), duration: taskDuration(task) });
      }
      if (action === "conflict-free" && task) {
        updateTask(id, { time: nextFreeSlot(task, timeToMinutes(task.time) + SNAP_MIN), duration: taskDuration(task) });
      }
      if (action === "move-earlier" && task) {
        updateTask(id, { time: minutesToTime(Math.max(HOUR_START * 60, timeToMinutes(task.time) - SNAP_MIN)), duration: taskDuration(task) });
      }
      if (action === "move-later" && task) {
        updateTask(id, { time: minutesToTime(Math.min(HOUR_END * 60, timeToMinutes(task.time) + SNAP_MIN)), duration: taskDuration(task) });
      }
    });

    $("planList")?.addEventListener("pointerdown", beginGridPointer);

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
      try {
        await HBIT.db.habitLogs.set(id, state.selectedDate, "done");
        state.habitLogs[id] = { status: "done" };
        renderHabits();
      } catch (err) {
        showPlanError(err, () => row.click());
      }
    });

    $("plCarryBtn")?.addEventListener("click", carryOver);
    $("plEmptyCta")?.addEventListener("click", () => $("plFabBtn")?.click());
    $("plQuickInput")?.addEventListener("input", renderQuickPreview);
    $("plQuickAdd")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = $("plQuickInput");
      const parsed = state.quickDraft || parseQuickAdd(input?.value || "");
      if (!parsed.title) return;
      await addTask(parsed);
      if (input) input.value = "";
      renderQuickPreview();
    });

    document.querySelectorAll("[data-time-preset]").forEach((btn) => btn.addEventListener("click", () => {
      if ($("plInputTime")) $("plInputTime").value = btn.dataset.timePreset || "";
      checkConflict();
    }));
    document.querySelectorAll("[data-duration-preset]").forEach((btn) => btn.addEventListener("click", () => {
      if ($("plInputDur")) $("plInputDur").value = btn.dataset.durationPreset || "60";
      checkConflict();
    }));
    document.querySelectorAll("[data-duration-step]").forEach((btn) => btn.addEventListener("click", () => {
      const current = Number($("plInputDur")?.value) || 60;
      if ($("plInputDur")) $("plInputDur").value = Math.max(1, current + Number(btn.dataset.durationStep || 0));
      checkConflict();
    }));
    document.querySelectorAll("[data-priority-value]").forEach((btn) => btn.addEventListener("click", () => setSegmentValue("plInputPty", "[data-priority-value]", btn.dataset.priorityValue)));
    document.querySelectorAll("[data-recurrence-value]").forEach((btn) => btn.addEventListener("click", () => {
      setSegmentValue("plInputRecurrence", "[data-recurrence-value]", btn.dataset.recurrenceValue);
      $("plCustomDays")?.toggleAttribute("hidden", btn.dataset.recurrenceValue !== "custom");
    }));
    document.querySelectorAll("[data-reminder-value]").forEach((btn) => btn.addEventListener("click", () => setSegmentValue("plInputReminder", "[data-reminder-value]", btn.dataset.reminderValue ?? "")));
    document.querySelectorAll("[data-custom-day]").forEach((btn) => btn.addEventListener("click", () => btn.classList.toggle("active")));
    $("plHabitTrigger")?.addEventListener("click", () => {
      const menu = $("plHabitMenu");
      const trigger = $("plHabitTrigger");
      if (!menu) return;
      const open = menu.hidden;
      menu.hidden = !open;
      trigger?.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $("plHabitMenu")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-habit-option]");
      if (!btn) return;
      setHabitValue(btn.dataset.habitOption || "");
      $("plHabitMenu").hidden = true;
      $("plHabitTrigger")?.setAttribute("aria-expanded", "false");
    });
    $("plAddSubtask")?.addEventListener("click", () => {
      const items = readSubtasks();
      if (items.length >= 5) return;
      renderSubtaskInputs([...items, { text: "", done: false }]);
      document.querySelector(".pl-subtask-row:last-child input[type='text']")?.focus();
    });
    $("plSubtasks")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-subtask-remove]");
      if (!btn) return;
      const index = Number(btn.dataset.subtaskRemove);
      renderSubtaskInputs(readSubtasks().filter((_, i) => i !== index));
    });
    $("plReviewClose")?.addEventListener("click", dismissMorningReview);
    $("plReviewDismiss")?.addEventListener("click", dismissMorningReview);
    $("plReviewList")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-review-action]");
      const row = e.target.closest("[data-review-id]");
      if (!btn || !row) return;
      const id = row.dataset.reviewId;
      const task = state.allPastUndone.find((item) => item.id === id);
      if (!task) return;
      try {
        if (btn.dataset.reviewAction === "forward") {
          await updateTask(id, { date: getTodayStr(), time: task.time || "", duration: taskDuration(task) });
        } else if (btn.dataset.reviewAction === "drop") {
          await updateTask(id, { done: true });
        } else if (btn.dataset.reviewAction === "reschedule") {
          const picker = row.querySelector(".pl-review-reschedule");
          if (picker) picker.hidden = !picker.hidden;
          return;
        } else if (btn.dataset.reviewAction === "apply-date") {
          const picked = row.querySelector(".pl-review-reschedule input")?.value;
          if (!picked || !/^\d{4}-\d{2}-\d{2}$/.test(picked)) return;
          await updateTask(id, { date: picked, duration: taskDuration(task) });
        }
        row.remove();
        state.allPastUndone = state.allPastUndone.filter((item) => item.id !== id);
        if (!state.allPastUndone.length) dismissMorningReview();
      } catch (err) {
        showPlanError(err);
      }
    });

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
        if (!t.time || t.id === state.editingTaskId) return false;
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
      openTaskSheet(null);
    });
    
    $("plModalClose")?.addEventListener("click", closeTaskSheet);
    
    document.querySelectorAll("[data-kind-value]").forEach((btn) => {
      btn.addEventListener("click", () => setKind(btn.dataset.kindValue));
    });

    $("planForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = $("plInputTitle").value.trim();
      if (!title) return;

      const kind = $("plInputKind")?.value || "task";
      let time = "";
      let duration = 60;
      if (kind === "event") {
        time = $("plInputTime")?.value || "";
        const endVal = $("plInputEnd")?.value || "";
        if (time && endVal) {
          duration = Math.max(15, timeToMinutes(endVal) - timeToMinutes(time));
        } else {
          duration = Number($("plInputDur")?.value) || 60;
        }
      }

      const payload = {
        title,
        kind,
        time,
        duration,
        location: ($("plInputLocation")?.value || "").trim(),
        priority: $("plInputPty").value,
        recurrence: $("plInputRecurrence")?.value || "once",
        customDays: getCustomDays(),
        habitId: $("plInputHabit")?.value || "",
        subtasks: readSubtasks(),
        tags: ($("plInputTags")?.value || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        reminderOffsetMin: $("plInputReminder")?.value || "",
        notes: $("plInputNotes").value.trim()
      };

      const save = $("plModalSave");
      if (save) save.disabled = true;
      try {
        if (state.editingTaskId) await updateTask(state.editingTaskId, payload);
        else await addTask(payload);
        closeTaskSheet();
      } finally {
        if (save) save.disabled = false;
      }
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
    $("plModal")?.setAttribute("hidden", "");
    $("plHelpOverlay")?.classList.remove("open");
    $("plHelpOverlay")?.setAttribute("aria-hidden", "true");
    renderHeader(); renderCalendar(); bindUi();
    renderList();
    manageNowTimer();

    if (!$("plHelpBtn")?.hidden && !planHelpModalBound && HBIT.utils?.initHelpModal) {
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
      } else {
        state.user = null;
        window.location.replace("login.html");
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
