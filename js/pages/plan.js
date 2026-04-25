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
    dateMetaByDate: {},
    habits: [],
    habitLogs: {},
    priorityFilter: "all",
    editingTaskId: null,
    pendingTaskIds: new Set(),
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
      }, (err) => {
        state.tasksSnapReady = true;
        renderList();
        showPlanError(err, () => loadTasks());
      });

      HBIT.db.tasks.listAll().then(allTasks => {
        const today = getTodayStr();
        const mapped = (allTasks || []).filter(t => t.done === false);
        state.allPastUndone = mapped.filter(t => t.date < today);
        buildCalendarMeta(mapped);
        if ($("plCarryOver")) $("plCarryOver").hidden = state.allPastUndone.length === 0 || state.selectedDate !== today;
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
      buildCalendarMeta(allTasks);
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
      if (isFs()) { await HBIT.db.tasks.update(id, { ...data, updatedAt: Date.now() }); }
      else {
        let all = JSON.parse(localStorage.getItem("hbit:plan:tasks") || "[]");
        all = all.map(t => t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t);
        localStorage.setItem("hbit:plan:tasks", JSON.stringify(all));
        loadTasks();
      }
      showPlanToast("success", "plan.toast.updated", "Task updated.");
    } catch (err) {
      showPlanError(err, () => updateTask(id, data));
      throw err;
    }
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
    const list = $("planList");
    const empty = $("planEmpty");
    if (!list || !empty) return;

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

    renderDaySummary();
    renderOverview();
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
          <div class="pl-card" tabindex="0" aria-busy="${pending ? "true" : "false"}">
            <div class="pl-card-meta">
              <span class="pl-status-pill is-${statusKey}">${statusIcon(statusKey)} ${escapeHtml(taskStatusLabel(statusKey))}</span>
              <span class="pl-priority-pill ${escapeHtml(priority)}">${priorityIcon(priority)} ${escapeHtml(tr(`plan.priority.${priority}`, priority))}</span>
              ${conflict ? `<span class="pl-status-pill is-overdue">${escapeHtml(tr("plan.status.conflict", "Conflict"))}</span>` : ""}
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
    if (!item?.time || item.done) return false;
    const dur = Math.max(1, parseInt(item.duration, 10) || 1);
    const [sh, sm] = String(item.time).split(":").map(Number);
    const start = (sh || 0) * 60 + (sm || 0);
    const end = start + dur;
    return state.tasks.some((t) => {
      if (t === item || t.id === item.id || !t.time || t.done) return false;
      const [th, tm] = String(t.time).split(":").map(Number);
      const ts = (th || 0) * 60 + (tm || 0);
      const te = ts + Math.max(1, parseInt(t.duration, 10) || 1);
      return start < te && end > ts;
    });
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
    const modal = $("plModal");
    const form = $("planForm");
    function openTaskSheet(task) {
      state.editingTaskId = task?.id || null;
      if ($("plEditingId")) $("plEditingId").value = state.editingTaskId || "";
      if ($("plInputTitle")) $("plInputTitle").value = task?.title || task?.text || "";
      if ($("plInputTime")) $("plInputTime").value = task?.time || "";
      if ($("plInputDur")) $("plInputDur").value = task?.duration || 60;
      if ($("plInputPty")) $("plInputPty").value = task?.priority || "low";
      if ($("plInputNotes")) $("plInputNotes").value = task?.notes || "";
      const title = document.querySelector(".pl-modal-title");
      if (title) title.textContent = state.editingTaskId ? tr("plan.modal.editTitle", "Edit Task") : tr("plan.modal.title", "Add Task");
      const save = $("plModalSave");
      if (save) save.textContent = state.editingTaskId ? tr("plan.btn.saveTask", "Save task") : tr("plan.btn.addItinerary", "Add task");
      if (modal) modal.hidden = false;
      $("plInputTitle")?.focus();
      checkConflict();
    }

    function closeTaskSheet() {
      if (modal) modal.hidden = true;
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
      const task = state.tasks.find((t) => t.id === id);
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
    
    $("planForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = $("plInputTitle").value.trim();
      if (!title) return;

      const payload = {
        title,
        time: $("plInputTime").value,
        duration: $("plInputDur").value,
        priority: $("plInputPty").value,
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
