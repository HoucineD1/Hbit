/* =====================================================================
   Hbit — Sleep module
   Log sleep, cycle calculator, weekly planner, calendar.
   Firestore: users/{uid}/sleepLogs/{dateKey}
   ===================================================================== */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $ = (id) => document.getElementById(id);

  const CYCLE_MIN = 90; // minutes per sleep cycle
  const state = {
    uid: null,
    logs: [],         // logs for current calendar month
    lastNight: null,  // most recent log for summary
    recentLogs: [],   // last 7 logs for weekly bars
    calMonth: null,   // YYYY-MM
    editingDateKey: null,
  };

  function todayKey() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function pad2(n) { return String(n).padStart(2, "0"); }
  function t(key) { return (HBIT.i18n && typeof HBIT.i18n.t === "function" ? HBIT.i18n.t(key) : null) || key; }

  function addMinutes(d, min) {
    return new Date(d.getTime() + min * 60000);
  }

  function timeToDate(hhmm) {
    const [h, m] = String(hhmm || "").split(":").map((x) => parseInt(x, 10));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  function formatTime(d) {
    return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : "—";
  }

  function durationHours(sleepTime, wakeTime) {
    const s = timeToDate(sleepTime);
    const w = timeToDate(wakeTime);
    if (!s || !w) return 0;
    let ms = w - s;
    if (ms < 0) ms += 24 * 60 * 60 * 1000;
    return ms / (60 * 60 * 1000);
  }

  /* ── Cycle calculator: wake time → suggested bedtimes (90 min cycles) ── */
  /**
   * Returns a list of suggested bedtimes based on a desired wake time.
   * - Uses 90-minute cycles (4–8 cycles).
   * - Never suggests times that are already in the past relative to \"now\".
   * - If the wake time is earlier than \"now\", it's treated as tomorrow morning.
   */
  function suggestedBedtimes(wakeHhmm, count = 5) {
    const wake = timeToDate(wakeHhmm);
    if (!wake) return [];

    const now = new Date();
    // If the wake time is already passed today, treat it as tomorrow.
    if (wake <= now) {
      wake.setDate(wake.getDate() + 1);
    }

    const cycles = [4, 5, 6, 7, 8].slice(0, count);
    const future = [];

    for (const c of cycles) {
      const bed = addMinutes(wake, -c * CYCLE_MIN);
      if (bed <= now) continue; // skip times already in the past
      future.push({
        cycles: c,
        time: bed,
        hhmm: formatTime(bed),
        duration: (c * CYCLE_MIN) / 60,
      });
    }

    // If filtering removed everything (edge cases), fall back to unfiltered list.
    const list = future.length ? future : cycles.map(c => {
      const bed = addMinutes(wake, -c * CYCLE_MIN);
      return {
        cycles: c,
        time: bed,
        hhmm: formatTime(bed),
        duration: (c * CYCLE_MIN) / 60,
      };
    });

    return list.sort((a, b) => a.cycles - b.cycles);
  }

  /* ── Weekly schedule: wake + duration → bedtime, repeat for week ── */
  function weeklySchedule(wakeHhmm, durationHours) {
    const wake = timeToDate(wakeHhmm);
    if (!wake || !Number.isFinite(durationHours)) return [];
    const bed = addMinutes(wake, -durationHours * 60);
    const bedStr = formatTime(bed);
    const wakeStr = formatTime(wake);
    const days = [
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
      "Saturday", "Sunday",
    ];
    return days.map((day, i) => ({
      day: i < 5 ? day : day,
      bedtime: bedStr,
      wake: wakeStr,
      isWeekend: i >= 5,
    }));
  }

  /* ── Firestore ───────────────────────────────────────────────────── */
  async function loadLastNight() {
    try {
      const list = await HBIT.db.sleepLogs.recent(7);
      state.lastNight  = list[0] || null;
      state.recentLogs = list;
    } catch (e) {
      state.lastNight  = null;
      state.recentLogs = [];
    }
  }

  async function deleteLog(dateKey) {
    await HBIT.db.sleepLogs.delete(dateKey);
  }

  async function loadMonth(month) {
    try {
      state.logs = await HBIT.db.sleepLogs.getMonth(month);
    } catch (e) {
      state.logs = [];
    }
  }

  async function saveLog(dateKey, data) {
    const sleepTime = data.sleepTime || data.bedtime || "23:00";
    const wakeTime = data.wakeTime || "07:00";
    const duration = data.duration != null ? data.duration : durationHours(sleepTime, wakeTime);
    const quality = Math.max(1, Math.min(10, parseInt(data.quality, 10) || 5));
    const cycles = duration > 0 ? Math.round((duration * 60) / CYCLE_MIN) : 0;
    await HBIT.db.sleepLogs.set(dateKey, {
      sleepTime,
      bedtime: sleepTime,
      wakeTime,
      duration,
      quality,
      cycles,
      notes: (data.notes || "").trim(),
    });
  }

  /* ── Render hero card (last night + weekly bars) ─────────────────── */
  function renderHero() {
    const d = state.lastNight;

    if (!d) {
      const durEl = $("slHeroDurNum");
      if (durEl) durEl.textContent = "—";
      const bedEl = $("slHeroBedtime"); if (bedEl) bedEl.textContent = "—";
      const wkEl  = $("slHeroWake");   if (wkEl)  wkEl.textContent  = "—";
      const cycEl = $("slHeroCycles"); if (cycEl) cycEl.textContent = "—";
      setQualityDots(0);
      renderWeekBars([]);
      const avgEl = $("slHeroAvg"); if (avgEl) avgEl.textContent = "—";
      const wkAvgEl = $("slHeroWeekAvg"); if (wkAvgEl) wkAvgEl.textContent = "—";
      return;
    }

    const dur = d.duration != null
      ? d.duration
      : durationHours(d.bedtime || d.sleepTime, d.wakeTime);
    const h   = Math.floor(dur);
    const m   = Math.round((dur - h) * 60);
    const durStr = h > 0 && m > 0
      ? `${h}h ${pad2(m)}m`
      : h > 0 ? `${h}h` : `${m}m`;

    const durNumEl = $("slHeroDurNum"); if (durNumEl) durNumEl.textContent = durStr;
    const bedEl    = $("slHeroBedtime"); if (bedEl) bedEl.textContent = d.bedtime || d.sleepTime || "—";
    const wkEl     = $("slHeroWake");   if (wkEl)  wkEl.textContent  = d.wakeTime || "—";
    const cycEl    = $("slHeroCycles"); if (cycEl) cycEl.textContent = d.cycles != null ? d.cycles : "—";

    setQualityDots(d.quality || 0);

    /* Weekly stats */
    const vals     = state.recentLogs.map(l => l.duration || 0).reverse();
    const nonZero  = vals.filter(v => v > 0);
    const avg      = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
    const avgEl    = $("slHeroAvg");
    if (avgEl) avgEl.textContent = avg > 0 ? `${avg.toFixed(1)}h` : "—";
    const wkAvgEl  = $("slHeroWeekAvg");
    if (wkAvgEl) wkAvgEl.textContent = avg > 0 ? `avg ${avg.toFixed(1)}h` : "—";

    renderWeekBars(vals);
  }

  /** Fill quality dot indicators (5 dots, quality 1-10). */
  function setQualityDots(quality) {
    const wrap = $("slHeroQuality");
    if (!wrap) return;
    const dots = wrap.querySelectorAll(".sl-q-dot");
    /* Map 1-10 → 0-5 filled dots */
    const filled = quality > 0 ? Math.round(quality / 2) : 0;
    dots.forEach((dot, i) => {
      dot.classList.toggle("filled", i < filled);
    });
  }

  /** Render 7-day SVG mini bars in the hero. viewBox="0 0 112 32" */
  function renderWeekBars(values) {
    const svg = $("slWeekBars");
    if (!svg) return;
    const data = (values || []).slice(-7);
    while (data.length < 7) data.unshift(0);
    const W = 112, H = 32, n = 7, barW = 10, gap = 6;
    const total = n * barW + (n - 1) * gap;
    const xOff  = (W - total) / 2;
    const maxV  = Math.max(9, ...data);
    const col   = "#60A5FA";
    svg.innerHTML = data.map((v, i) => {
      const x  = xOff + i * (barW + gap);
      const bh = Math.max(3, Math.round((Math.max(0, v) / maxV) * (H - 5)));
      const y  = H - bh - 2;
      const r  = Math.min(3, barW / 2);
      const op = (0.5 + (i / n) * 0.5).toFixed(2);
      return `<rect x="${x}" y="2" width="${barW}" height="${H - 4}" rx="${r}"
              fill="${col}18"/>
              ${bh > 2 ? `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="${r}"
              fill="${col}" opacity="${op}"/>` : ""}`;
    }).join("");
  }

  /** Legacy: keep for compat — hero replaces the old text summary */
  function renderLogSummary() { renderHero(); }

  /* ── Render cycle suggestions ────────────────────────────────────── */
  function renderCycleSuggestions() {
    const wrap = $("cycleSuggestions");
    if (!wrap) return;
    const wake = $("wakeTarget")?.value || "07:00";
    const suggestions = suggestedBedtimes(wake);
    /* Mark 5 or 6 cycles as "recommended" (7.5h or 9h) */
    wrap.innerHTML = suggestions
      .map((s) => {
        const recommended = (s.cycles === 5 || s.cycles === 6);
        return `
          <button type="button"
                  class="sl-sug-card${recommended ? " recommended" : ""}"
                  data-bed="${s.hhmm}" data-wake="${wake}"
                  title="${s.cycles} sleep cycles · ${s.duration.toFixed(1)} hours">
            <div class="sl-sug-time">${s.hhmm}</div>
            <div class="sl-sug-meta">${s.cycles} cycles&thinsp;·&thinsp;${s.duration.toFixed(1)}h</div>
          </button>
        `;
      })
      .join("");
    wrap.querySelectorAll(".sl-sug-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        if ($("logSleepTime")) $("logSleepTime").value = btn.dataset.bed;
        if ($("logWakeTime"))  $("logWakeTime").value  = btn.dataset.wake;
        openLogSheet();
      });
    });
  }

  /* ── Render weekly schedule ──────────────────────────────────────── */
  function renderWeekSchedule() {
    const wrap = $("weekSchedule");
    if (!wrap) return;
    const wake = $("planWake")?.value || "07:00";
    const dur  = parseFloat($("planDuration")?.value) || 7.5;
    const week = weeklySchedule(wake, dur);
    wrap.innerHTML = week
      .map((r) => `
        <div class="sl-week-row${r.isWeekend ? " weekend" : ""}">
          <span class="sl-week-day-dot"></span>
          <span class="sl-week-day">${r.day}</span>
          <span class="sl-week-times">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                 style="opacity:.6;vertical-align:middle">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            ${r.bedtime}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                 style="opacity:.45;vertical-align:middle">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            ${r.wake}
          </span>
        </div>
      `).join("");
  }

  /* ── Calendar ────────────────────────────────────────────────────── */
  function calendarMonthLabel(ym) {
    const [y, m] = ym.split("-");
    return new Date(+y, +m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function renderCalendar() {
    const wrap = $("sleepCalendar");
    const labelEl = $("calMonthLabel");
    if (!wrap) return;
    const ym = state.calMonth || todayKey().slice(0, 7);
    state.calMonth = ym;
    if (labelEl) labelEl.textContent = calendarMonthLabel(ym);

    const [y, m] = ym.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const logMap = {};
    (state.logs || []).forEach((l) => {
      const d = l.dateKey || l.date;
      if (d) logMap[d] = l;
    });

    let html = "";
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekDays.forEach((d) => {
      html += `<div class="sl-cal-day" style="cursor:default;opacity:.6;font-size:10px;">${d}</div>`;
    });
    for (let i = 0; i < startPad; i++) {
      const prev = new Date(y, m - 1, -startPad + i + 1);
      const dk = `${prev.getFullYear()}-${pad2(prev.getMonth() + 1)}-${pad2(prev.getDate())}`;
      html += `<div class="sl-cal-day other-month" data-date="${dk}"><span class="sl-cal-num">${prev.getDate()}</span></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dk  = `${ym}-${pad2(day)}`;
      const log = logMap[dk];
      const dur = log && (log.duration != null) ? `${log.duration.toFixed(1)}h` : "";
      const q   = log?.quality || 0;
      const qAttr = q >= 7 ? "high" : q > 0 && q <= 4 ? "low" : "";
      html += `<div class="sl-cal-day ${log ? "has-log" : ""}" data-date="${dk}"
                    ${qAttr ? `data-quality="${qAttr}"` : ""}
                    role="button" tabindex="0">
        <span class="sl-cal-num">${day}</span>
        ${dur ? `<span class="sl-cal-dur">${dur}</span>` : ""}
      </div>`;
    }
    const totalCells = 7 * 6;
    const filled = startPad + daysInMonth;
    for (let i = filled; i < totalCells; i++) {
      const next = new Date(y, m, i - filled + 1);
      const dk = `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}`;
      html += `<div class="sl-cal-day other-month" data-date="${dk}"><span class="sl-cal-num">${next.getDate()}</span></div>`;
    }
    wrap.innerHTML = html;

    wrap.querySelectorAll(".sl-cal-day[data-date]").forEach((cell) => {
      const dk = cell.dataset.date;
      if (!dk) return;
      cell.addEventListener("click", () => openLogSheet(dk));
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLogSheet(dk);
        }
      });
    });
  }

  /* ── Log sheet ───────────────────────────────────────────────────── */
  async function openLogSheet(dateKey, prefill) {
    const dk = dateKey || todayKey();
    state.editingDateKey = dk;
    if ($("logDate")) $("logDate").value = dk;

    let log = (state.logs || []).find((l) => (l.dateKey || l.date) === dk);
    if (!log && state.uid) {
      try { log = await HBIT.db.sleepLogs.get(dk); } catch (_) {}
    }
    if (log) {
      if ($("logSleepTime")) $("logSleepTime").value = log.sleepTime || log.bedtime || "23:00";
      if ($("logWakeTime"))  $("logWakeTime").value  = log.wakeTime || "07:00";
      const q = log.quality != null ? log.quality : 7;
      if ($("logQuality"))   $("logQuality").value   = q;
      if ($("logQualityVal")) $("logQualityVal").textContent = q;
      if ($("logNotes"))     $("logNotes").value     = log.notes || "";
    } else {
      // Use prefill values if provided (e.g. from "Convert plan" flow)
      if ($("logSleepTime")) $("logSleepTime").value = prefill?.sleepTime || "23:00";
      if ($("logWakeTime"))  $("logWakeTime").value  = prefill?.wakeTime  || "07:00";
      if ($("logQuality"))   $("logQuality").value   = 7;
      if ($("logQualityVal")) $("logQualityVal").textContent = "7";
      if ($("logNotes"))     $("logNotes").value     = "";
    }

    /* Show delete button only when editing an existing log */
    const delBtn = $("logDelete");
    if (delBtn) delBtn.style.display = log ? "" : "none";

    const overlay = $("logOverlay");
    if (overlay) {
      overlay.setAttribute("aria-hidden", "false");
      overlay.classList.add("open");
    }
    document.body.style.overflow = "hidden";
  }

  function closeLogSheet() {
    const overlay = $("logOverlay");
    if (overlay) {
      overlay.setAttribute("aria-hidden", "true");
      overlay.classList.remove("open");
    }
    document.body.style.overflow = "";
  }

  async function submitDeleteLog() {
    const dk = state.editingDateKey;
    if (!dk) return;
    closeLogSheet();
    try {
      await deleteLog(dk);
      state.logs = (state.logs || []).filter(l => (l.dateKey || l.date) !== dk);
      if (state.lastNight && (state.lastNight.dateKey || state.lastNight.date) === dk) {
        await loadLastNight();
      }
      renderHero();
      renderCalendar();
    } catch (err) {
      console.warn("[Hbit] Sleep delete:", err?.message);
    }
  }

  async function submitLog() {
    const dateKey   = $("logDate")?.value   || todayKey();
    const sleepTime = $("logSleepTime")?.value || "23:00";
    const wakeTime  = $("logWakeTime")?.value  || "07:00";
    const quality   = parseInt($("logQuality")?.value, 10) || 7;
    const notes     = ($("logNotes")?.value  || "").trim();
    const duration  = durationHours(sleepTime, wakeTime);

    /* Save button visual feedback */
    const saveBtn = $("logSave");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "…"; }

    try {
      await saveLog(dateKey, { sleepTime, wakeTime, duration, quality, notes });
      closeLogSheet();
      await loadLastNight();
      const month = dateKey.slice(0, 7);
      state.calMonth = month;
      await loadMonth(month);
      renderAll();
    } catch (err) {
      console.warn("[Hbit] Sleep save:", err?.message);
      if (saveBtn) { saveBtn.textContent = "Error — retry"; saveBtn.style.background = "var(--sl-red,#F87171)"; }
      setTimeout(() => {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save"; saveBtn.style.background = ""; }
      }, 2500);
      return;
    }
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save"; }
  }

  /* ── Sleep Plan CRUD ─────────────────────────────────────────────── */
  function sleepPlansCol() {
    if (!state.uid) return null;
    const db = firebase.firestore();
    return db.collection("users").doc(state.uid).collection("sleepPlans");
  }

  async function loadSleepPlans() {
    if (!state.uid) return [];
    try {
      const snap = await sleepPlansCol()
        .orderBy("createdAt", "desc").limit(8).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("[sleep] loadPlans:", err);
      return [];
    }
  }

  async function saveSleepPlan() {
    const dateVal    = $("planDate")?.value;
    const bedTime    = $("planBedTime")?.value;
    const wakeTime   = $("planWakeTime")?.value;
    const note       = $("planNote")?.value?.trim() || "";
    const btn        = $("slSavePlan");

    if (!dateVal || !bedTime || !wakeTime) {
      alert("Please fill in date, bedtime and wake time.");
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = "Saving\u2026"; }
    try {
      const dur = durationHours(bedTime, wakeTime);
      await sleepPlansCol().add({
        date:             dateVal,
        bedTimePlanned:   bedTime,
        wakeTimePlanned:  wakeTime,
        targetHours:      Math.round(dur * 10) / 10,
        note,
        status:           "planned",
        createdAt:        firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log("[sleep] Plan saved for", dateVal);
      // Clear form
      if ($("planNote")) $("planNote").value = "";
      await renderSavedPlans();
    } catch (err) {
      console.warn("[sleep] savePlan error:", err);
      alert("Failed to save plan.");
    }
    if (btn) { btn.disabled = false; btn.textContent = "Save tonight\u2019s plan"; }
  }

  async function completePlan(planId, plan) {
    // Convert to actual sleep log
    const dateKey  = plan.date;
    const existing = state.logs.find((l) => l.dateKey === dateKey);
    if (!state.uid) return;
    try {
      // Mark plan as completed
      await sleepPlansCol().doc(planId).update({ status: "completed" });
      // Write a sleepLog with the planned times (pre-fill the log sheet)
      openLogSheet(dateKey, {
        sleepTime: plan.bedTimePlanned,
        wakeTime:  plan.wakeTimePlanned,
      });
      await renderSavedPlans();
    } catch (err) {
      console.warn("[sleep] completePlan:", err);
    }
  }

  async function deletePlan(planId) {
    if (!state.uid) return;
    try {
      await sleepPlansCol().doc(planId).delete();
      await renderSavedPlans();
    } catch (err) {
      console.warn("[sleep] deletePlan:", err);
    }
  }

  async function renderSavedPlans() {
    const container = $("slSavedPlans");
    if (!container || !state.uid) return;
    const plans = await loadSleepPlans();
    if (!plans.length) { container.innerHTML = ""; return; }

    container.innerHTML = plans.map((p) => {
      const isCompleted = p.status === "completed";
      const dur = durationHours(p.bedTimePlanned, p.wakeTimePlanned);
      const dateLabel = p.date
        ? new Date(p.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
        : p.date;
      return `
        <div class="sl-plan-item${isCompleted ? " completed" : ""}" data-pid="${p.id}">
          <div class="sl-plan-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              ${isCompleted
                ? '<polyline points="20 6 9 17 4 12"/>'
                : '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'}
            </svg>
          </div>
          <div class="sl-plan-item-body">
            <div class="sl-plan-item-date">${dateLabel} &middot; ${dur.toFixed(1)}h</div>
            <div class="sl-plan-item-times">
              <span>${p.bedTimePlanned}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
              <span>${p.wakeTimePlanned}</span>
            </div>
          </div>
          <div class="sl-plan-item-actions">
            ${!isCompleted
              ? `<button class="sl-plan-item-btn primary" data-action="complete" data-pid="${p.id}" type="button">Log it</button>`
              : ""}
            <button class="sl-plan-item-btn" data-action="delete" data-pid="${p.id}" type="button">Delete</button>
          </div>
        </div>`;
    }).join("");

    // Bind plan actions
    container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const pid    = btn.dataset.pid;
        const action = btn.dataset.action;
        const plan   = plans.find((p) => p.id === pid);
        if (!plan) return;
        if (action === "complete") await completePlan(pid, plan);
        if (action === "delete")   await deletePlan(pid);
      });
    });
  }

  /* ── Plan date duration preview ────────────────────────── */
  function updatePlanDurationPreview() {
    const bedTime  = $("planBedTime")?.value;
    const wakeTime = $("planWakeTime")?.value;
    const el       = $("slPlanDurText");
    if (!el) return;
    if (!bedTime || !wakeTime) { el.textContent = "\u2014 hrs planned"; return; }
    const dur = durationHours(bedTime, wakeTime);
    el.textContent = `${dur.toFixed(1)} hrs planned`;
  }

  /* ── Mode tab switching ─────────────────────────────────── */
  function switchSleepMode(mode) {
    const grid = $("slGrid");
    if (grid) grid.setAttribute("data-slmode", mode);
    document.querySelectorAll("#sleepPage .sl-mode-tab").forEach((tab) => {
      const active = tab.dataset.slmode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    // When switching to past mode, open the log sheet
    if (mode === "past") {
      openLogSheet();
      // Revert to plan mode after sheet opens
      setTimeout(() => switchSleepMode("plan"), 100);
    }
    // When switching to history, load the calendar data
    if (mode === "history" && state.uid) {
      loadMonth(state.calMonth).then(renderCalendar);
    }
  }

  /* ── Sleep mode suggestion ───────────────────────────────────────── */
  function onSleepModeClick() {
    const msg = t("sleep.mode.hint") || "Enable Night Shift or blue light filter for better sleep.";
    if (typeof alert !== "undefined") alert(msg);
    else console.log(msg);
  }

  /* ── Help overlay ─────────────────────────────────────────────────── */
  function openSleepHelp() {
    const ov = $("slHelpOverlay");
    if (!ov) return;
    ov.classList.add("open");
    ov.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeSleepHelp() {
    const ov = $("slHelpOverlay");
    if (!ov) return;
    ov.classList.remove("open");
    ov.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  /* ── Bind events ─────────────────────────────────────────────────── */
  function bindEvents() {
    $("btnOpenLog")?.addEventListener("click", () => openLogSheet());
    $("logClose")?.addEventListener("click", closeLogSheet);
    $("logSave")?.addEventListener("click", submitLog);
    $("logDelete")?.addEventListener("click", submitDeleteLog);
    $("logOverlay")?.addEventListener("click", (e) => {
      if (e.target.id === "logOverlay") closeLogSheet();
    });

    /* Quality slider → live value display */
    $("logQuality")?.addEventListener("input", (e) => {
      const valEl = $("logQualityVal");
      if (valEl) valEl.textContent = e.target.value;
    });

    $("wakeTarget")?.addEventListener("change", renderCycleSuggestions);
    $("wakeTarget")?.addEventListener("input", renderCycleSuggestions);
    $("planWake")?.addEventListener("change", renderWeekSchedule);
    $("planWake")?.addEventListener("input", renderWeekSchedule);
    $("planDuration")?.addEventListener("change", renderWeekSchedule);
    $("planDuration")?.addEventListener("input", renderWeekSchedule);

    $("calPrev")?.addEventListener("click", () => {
      const [y, m] = (state.calMonth || todayKey().slice(0, 7)).split("-").map(Number);
      state.calMonth = m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`;
      loadMonth(state.calMonth).then(renderCalendar);
    });
    $("calNext")?.addEventListener("click", () => {
      const [y, m] = (state.calMonth || todayKey().slice(0, 7)).split("-").map(Number);
      state.calMonth = m === 12 ? `${y + 1}-01` : `${y}-${pad2(m + 1)}`;
      loadMonth(state.calMonth).then(renderCalendar);
    });

    $("btnSleepMode")?.addEventListener("click", onSleepModeClick);

    // Mode tabs
    document.querySelectorAll("#sleepPage .sl-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchSleepMode(tab.dataset.slmode));
    });

    // Plan form
    $("slSavePlan")?.addEventListener("click", saveSleepPlan);
    $("planBedTime")?.addEventListener("input", updatePlanDurationPreview);
    $("planWakeTime")?.addEventListener("input", updatePlanDurationPreview);

    // Pre-fill plan date with today
    const planDateEl = $("planDate");
    if (planDateEl && !planDateEl.value) planDateEl.value = todayKey();

    $("slHelpBtn")?.addEventListener("click", openSleepHelp);
    $("slHelpClose")?.addEventListener("click", closeSleepHelp);
    $("slHelpOverlay")?.addEventListener("click", (e) => {
      if (e.target.id === "slHelpOverlay") closeSleepHelp();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const logOpen  = $("logOverlay")?.classList.contains("open");
      const helpOpen = $("slHelpOverlay")?.classList.contains("open");
      if (logOpen) closeLogSheet();
      else if (helpOpen) closeSleepHelp();
    });

    $("logoutBtn")?.addEventListener("click", async () => {
      try {
        await firebase.auth().signOut();
        window.location.replace("login.html");
      } catch (err) {
        console.error("[Hbit] Sign-out:", err.message);
      }
    });
  }

  /* ── Full render ─────────────────────────────────────────────────── */
  function renderAll() {
    const d = new Date();
    if ($("slDate")) $("slDate").textContent = d.toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric"
    }).toUpperCase();
    renderHero();
    renderCycleSuggestions();
    renderWeekSchedule();
    renderCalendar();
    updatePlanDurationPreview();
    // Pre-fill plan date with today if empty
    const planDateEl = $("planDate");
    if (planDateEl && !planDateEl.value) planDateEl.value = todayKey();
  }

  function init() {
    if (document.body.id !== "sleepPage") return;
    if (document.body.dataset.sleepInit) return;
    document.body.dataset.sleepInit = "1";

    state.calMonth = todayKey().slice(0, 7);
    bindEvents();
    renderAll(); // paint immediately with empty state

    if (!window.firebase?.auth) return;
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.replace("login.html");
        return;
      }
      state.uid = user.uid;
      try {
        const profile = await HBIT.getCurrentUserProfile?.();
        const name = profile?.fullName || user.displayName || user.email || "U";
        const av = $("slAvatar");
        if (av) av.textContent = name.charAt(0).toUpperCase();
      } catch (_) {}
      await loadLastNight();
      await loadMonth(state.calMonth);
      renderAll(); // re-render with Firestore data
      renderSavedPlans().catch(() => {});
    });
  }

  HBIT.pages = HBIT.pages || {};
  HBIT.pages.sleep = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
