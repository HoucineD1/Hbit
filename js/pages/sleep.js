/* =====================================================================
   Hbit — Sleep module
   Firestore: users/{uid}/sleepLogs, sleepPlans, sleepSettings
   ===================================================================== */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $ = (id) => document.getElementById(id);

  if (typeof HBIT.onReady !== "function") {
    HBIT.onReady = function (callback) {
      if (!window.firebase?.auth) return;
      const unsub = firebase.auth().onAuthStateChanged((user) => {
        unsub();
        if (!user) {
          if (!String(location.pathname || "").includes("login")) {
            location.replace("login.html");
          }
          return;
        }
        callback(user);
      });
    };
  }

  const CYCLE_MIN = 90;
  const ONSET_MIN = 14;
  const BREATH_PHASES = [
    { labelKey: "sleep.inhale", label: "Inhale", secs: 4, scale: 1.4, color: "#60A5FA" },
    { labelKey: "sleep.hold", label: "Hold", secs: 7, scale: 1.4, color: "#818CF8" },
    { labelKey: "sleep.exhale", label: "Exhale", secs: 8, scale: 1.0, color: "#1e1b4b" },
  ];
  const BREATH_CYCLE_SECS = BREATH_PHASES.reduce((s, p) => s + p.secs, 0);
  const BREATH_TOTAL_MS = 180_000;

  const WIND_ITEMS = [
    {
      id: "warm",
      titleKey: "sleep.warmLight",
      subKey: "sleep.warmLightSub",
      links: [
        { label: "iPhone →", href: "App-Prefs:DISPLAY&path=NIGHT_SHIFT", hint: "Settings → Display & Brightness → Night Shift" },
        { label: "Android →", href: "intent://settings#Intent;action=android.settings.DISPLAY_SETTINGS;end", hint: "Settings → Display → Night light or comfort view" },
      ],
    },
    {
      id: "food",
      titleKey: "sleep.noFood",
      subKey: "sleep.noFoodSub",
      markKey: "common.save",
    },
    {
      id: "gray",
      titleKey: "sleep.grayscale",
      subKey: "sleep.grayscaleSub",
      links: [
        { label: "iPhone →", href: "App-Prefs:ACCESSIBILITY&path=DISPLAY_AND_TEXT", hint: "Settings → Accessibility → Display & Text Size → Color Filters" },
        { label: "Android →", href: "intent://settings#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end", hint: "Settings → Accessibility → Color inversion or color correction" },
      ],
    },
    {
      id: "breath",
      titleKey: "sleep.breathing",
      subKey: "sleep.breathingSub",
      breath: true,
    },
  ];

  const SLEEP_STRINGS = {
    en: {
      "sleep.tonightsPlan": "Tonight's plan",
      "sleep.sleepAt": "Sleep at",
      "sleep.wakeAt": "Wake at",
      "sleep.editPlan": "Edit plan",
      "sleep.sleepIn": "Sleep in {time}",
      "sleep.bedtimeNow": "Bedtime now 🌙",
      "sleep.noDataHero": "No data yet — log your first night!",
      "sleep.sleepDebt": "7-day sleep debt",
      "sleep.debtBehind": "behind target",
      "sleep.debtAhead": "on track 🌙",
      "sleep.lastNight": "Last night",
      "sleep.tabTonight": "Tonight",
      "sleep.tabHistory": "History",
      "sleep.findBedtime": "Find your ideal bedtime",
      "sleep.wakeGoal": "I want to wake up at",
      "sleep.recommended": "Recommended",
      "sleep.forTomorrow": "for tomorrow night",
      "sleep.bufferNote": "Includes 14 min to fall asleep",
      "sleep.cyclePreview": "Sleep at {bed} → {cycles} cycles → wake at {wake} feeling refreshed",
      "sleep.setAsPlan": "Set {time} as tonight's plan",
      "sleep.planSet": "Tonight's plan set ✓",
      "sleep.winddown": "1 hour before sleep",
      "sleep.winddownActive": "Wind-down starts now ✨",
      "sleep.winddownSub": "Prepare your body and mind for sleep.",
      "sleep.warmLight": "Switch to warm light",
      "sleep.warmLightSub": "Enable Night Shift or warm light on your phone",
      "sleep.noFood": "Stop eating",
      "sleep.noFoodSub": "Last meal should be 3+ hours before sleep",
      "sleep.grayscale": "Go grayscale",
      "sleep.grayscaleSub": "Reduce stimulation — switch phone to grayscale",
      "sleep.breathing": "Breathing exercise",
      "sleep.breathingSub": "4-7-8 method: inhale 4s · hold 7s · exhale 8s",
      "sleep.startBreath": "Start 3-min guide →",
      "sleep.breathProgress": "{done} / {total} complete",
      "sleep.readyToSleep": "Ready to Sleep 🌙",
      "sleep.readyDone": "Sleep session started ✓",
      "sleep.alarmSet": "Alarm set for {time} ✓",
      "sleep.alarmDenied": "Enable notifications to get your wake-up alarm ⚙️",
      "sleep.alarmNote": "Keep this tab open for the alarm. For reliability, also set your phone alarm.",
      "sleep.inhale": "Inhale",
      "sleep.hold": "Hold",
      "sleep.exhale": "Exhale",
      "sleep.breathDone": "Well done 🌙 Sleep well.",
      "sleep.scheduleTitle": "Your sleep schedule",
      "sleep.warnBanner": "You slept {hours} last night — be gentle with yourself today.",
      "sleep.connectDevice": "Connect your device",
      "sleep.connectSub": "Automatic tracking — no manual logging needed.",
      "sleep.comingSoon": "Coming soon",
      "sleep.comingSoonMsg": "We're working on it! 🌙",
      "sleep.noRecentLog": "No recent log",
      "sleep.winddownAllDone": "All done — sleep well! 🌙",
      "sleep.markDone": "Mark done",
      "sleep.notificationsUnsupported": "Notifications not supported on this browser",
    },
    fr: {
      "sleep.tonightsPlan": "Plan de cette nuit",
      "sleep.sleepAt": "Coucher à",
      "sleep.wakeAt": "Réveil à",
      "sleep.editPlan": "Modifier",
      "sleep.sleepIn": "Dans {time}",
      "sleep.bedtimeNow": "C'est l'heure 🌙",
      "sleep.noDataHero": "Pas encore de données — enregistre ta première nuit !",
      "sleep.sleepDebt": "Dette de sommeil (7j)",
      "sleep.debtBehind": "de retard",
      "sleep.debtAhead": "dans les temps 🌙",
      "sleep.lastNight": "La nuit dernière",
      "sleep.tabTonight": "Cette nuit",
      "sleep.tabHistory": "Historique",
      "sleep.findBedtime": "Trouve ton heure idéale",
      "sleep.wakeGoal": "Je veux me réveiller à",
      "sleep.recommended": "Recommandé",
      "sleep.forTomorrow": "pour demain soir",
      "sleep.bufferNote": "Inclut 14 min pour s'endormir",
      "sleep.cyclePreview": "Coucher à {bed} → {cycles} cycles → réveil à {wake} reposé",
      "sleep.setAsPlan": "Définir {time} comme plan",
      "sleep.planSet": "Plan de nuit enregistré ✓",
      "sleep.winddown": "1 heure avant le coucher",
      "sleep.winddownActive": "Routine du soir — c'est maintenant ✨",
      "sleep.winddownSub": "Prépare ton corps et ton esprit au sommeil.",
      "sleep.warmLight": "Passer en lumière chaude",
      "sleep.warmLightSub": "Active Night Shift ou la lumière chaude.",
      "sleep.noFood": "Arrêter de manger",
      "sleep.noFoodSub": "Dernier repas au moins 3h avant le coucher.",
      "sleep.grayscale": "Passer en niveaux de gris",
      "sleep.grayscaleSub": "Réduis la stimulation visuelle.",
      "sleep.breathing": "Exercice de respiration",
      "sleep.breathingSub": "4-7-8 : inspirez 4s · retenez 7s · expirez 8s",
      "sleep.startBreath": "Démarrer le guide 3 min →",
      "sleep.breathProgress": "{done} / {total} complétés",
      "sleep.readyToSleep": "Prêt à dormir 🌙",
      "sleep.readyDone": "Session de sommeil lancée ✓",
      "sleep.alarmSet": "Alarme réglée pour {time} ✓",
      "sleep.alarmDenied": "Active les notifications pour ton alarme ⚙️",
      "sleep.alarmNote": "Garde cet onglet ouvert. Règle aussi ton alarme téléphone.",
      "sleep.inhale": "Inspirez",
      "sleep.hold": "Retenez",
      "sleep.exhale": "Expirez",
      "sleep.breathDone": "Bravo 🌙 Bonne nuit.",
      "sleep.scheduleTitle": "Ton planning sommeil",
      "sleep.warnBanner": "Tu as dormi {hours} la nuit dernière — sois indulgent avec toi-même.",
      "sleep.connectDevice": "Connecter un appareil",
      "sleep.connectSub": "Suivi automatique — plus besoin de saisie.",
      "sleep.comingSoon": "Bientôt disponible",
      "sleep.comingSoonMsg": "On y travaille ! 🌙",
      "sleep.noRecentLog": "Pas de nuit récente",
      "sleep.winddownAllDone": "Tout est prêt — bonne nuit ! 🌙",
      "sleep.markDone": "Marquer fait",
      "sleep.notificationsUnsupported": "Notifications non prises en charge sur ce navigateur",
    },
  };

  const state = {
    uid: null,
    logs: [],
    lastNight: null,
    recentLogs: [],
    calMonth: null,
    editingDateKey: null,
    settings: {},
    tonightPlan: null,
    sleepDebt: 0,
    countdownTimer: null,
    breathTimer: null,
    breathAnimTimer: null,
    breathSessionElapsed: 0,
    cycleSelection: null,
    historyLoaded: false,
    activeTab: "tonight",
    statsSnapshot: null,
    saveSettingsTimer: null,
    deviceTooltipTimer: null,
  };

  function lang() {
    return HBIT.i18n?.getLang?.() || "en";
  }

  function tsleep(key, vars) {
    const L = SLEEP_STRINGS[lang()] || SLEEP_STRINGS.en;
    const fallback = L[key] || SLEEP_STRINGS.en[key] || key;
    let s = typeof HBIT.i18n?.t === "function" ? HBIT.i18n.t(key, fallback) : fallback;
    if (vars && typeof s === "string") {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      });
    }
    return s;
  }

  function todayKey() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

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

  function nextWakeDatetime(wakeHhmm) {
    const wake = timeToDate(wakeHhmm);
    if (!wake) return null;
    const now = new Date();
    if (wake <= now) wake.setDate(wake.getDate() + 1);
    return wake;
  }

  /**
   * Suggested bedtimes: wake − (cycles × 90 min) − 14 min onset.
   * Keeps legacy name; always returns 4–8 cycle rows for the calculator.
   */
  function suggestedBedtimes(wakeHhmm, count = 5) {
    const wake = nextWakeDatetime(wakeHhmm);
    if (!wake) return [];
    const now = new Date();
    const cyclesArr = [4, 5, 6, 7, 8].slice(0, Math.min(count, 5));
    const list = cyclesArr.map((c) => {
      const bed = addMinutes(wake, -c * CYCLE_MIN - ONSET_MIN);
      const hhmm = formatTime(bed);
      const duration = (c * CYCLE_MIN) / 60;
      const forTomorrow = bed.getTime() <= now.getTime();
      return { cycles: c, time: bed, hhmm, duration, forTomorrow };
    });
    return list.sort((a, b) => a.cycles - b.cycles);
  }

  function weeklySchedule(wakeHhmm, durationHoursVal) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((day, i) => {
      const isWeekend = i >= 5;
      const w = timeToDate(wakeHhmm);
      if (!w || !Number.isFinite(durationHoursVal)) {
        return { day, bedtime: "—", wake: "—", isWeekend, durLabel: "" };
      }
      const wakeD = new Date(w);
      if (isWeekend) wakeD.setMinutes(wakeD.getMinutes() + 30);
      const bed = addMinutes(wakeD, -durationHoursVal * 60);
      return {
        day,
        bedtime: formatTime(bed),
        wake: formatTime(wakeD),
        isWeekend,
        durLabel: formatDurHuman(durationHoursVal),
      };
    });
  }

  function formatDurHuman(h) {
    if (!Number.isFinite(h) || h <= 0) return "";
    const H = Math.floor(h);
    const M = Math.round((h - H) * 60);
    if (H > 0 && M > 0) return `${H}h ${M}m`;
    if (H > 0) return `${H}h`;
    return `${M}m`;
  }

  function formatDurFromLogHours(dur) {
    if (dur == null || !Number.isFinite(dur)) return "—";
    const h = Math.floor(dur);
    const m = Math.round((dur - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${pad2(m)}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  function effectiveSettings() {
    const s = state.settings || {};
    return {
      targetHours: s.targetHours != null ? Number(s.targetHours) : 8,
      defaultWake: s.defaultWake || "07:00",
      windDownMins: s.windDownMins != null ? Number(s.windDownMins) : 60,
      alarmEnabled: s.alarmEnabled !== false,
    };
  }

  function tonightBedDateTime(hhmm) {
    const t = timeToDate(hhmm);
    if (!t) return null;
    const d = new Date();
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return d;
  }

  function logDaysBehindToday(log) {
    const dk = log?.dateKey || log?.date;
    if (!dk) return 999;
    const a = new Date(`${todayKey()}T12:00:00`);
    const b = new Date(`${dk}T12:00:00`);
    return Math.round((a - b) / 86400000);
  }

  function qualifyingLastNightLog() {
    const log = state.lastNight;
    if (!log) return null;
    const d = logDaysBehindToday(log);
    if (d < 0 || d > 1) return null;
    return log;
  }

  function hasAnySleepData() {
    return (state.recentLogs && state.recentLogs.length > 0) || qualifyingLastNightLog() != null;
  }

  async function loadSettings() {
    try {
      const s = await HBIT.db.sleepSettings.get();
      return s && typeof s === "object" ? s : {};
    } catch (_) {
      return {};
    }
  }

  async function saveSettings(fields) {
    try {
      await HBIT.db.sleepSettings.set(fields);
    } catch (e) {
      console.warn("[sleep] saveSettings", e?.message);
    }
  }

  function schedulePersistSettings() {
    clearTimeout(state.saveSettingsTimer);
    state.saveSettingsTimer = setTimeout(() => {
      const wake = $("planWake")?.value || effectiveSettings().defaultWake;
      const dur = parseFloat($("planDuration")?.value);
      saveSettings({
        defaultWake: wake,
        targetHours: Number.isFinite(dur) ? dur : effectiveSettings().targetHours,
      });
    }, 450);
  }

  async function loadLastNight() {
    try {
      const list = await HBIT.db.sleepLogs.recent(7);
      state.lastNight = list[0] || null;
      state.recentLogs = list;
    } catch (_) {
      state.lastNight = null;
      state.recentLogs = [];
    }
  }

  async function deleteLog(dateKey) {
    await HBIT.db.sleepLogs.delete(dateKey);
  }

  async function loadMonth(month) {
    try {
      state.logs = await HBIT.db.sleepLogs.getMonth(month);
    } catch (_) {
      state.logs = [];
    }
  }

  async function saveLog(dateKey, data) {
    const sleepTime = data.sleepTime || data.bedtime || "23:00";
    const wakeTime = data.wakeTime || "07:00";
    const duration = data.duration != null ? data.duration : durationHours(sleepTime, wakeTime);
    const quality = Math.max(1, Math.min(10, parseInt(data.quality, 10) || 5));
    const cycles = duration > 0 ? Math.round((duration * 60) / CYCLE_MIN) : 0;
    let sleepStart = data.sleepStart;
    if (sleepStart == null) {
      try {
        const raw = sessionStorage.getItem(`sl-sleepStart-${dateKey}`);
        if (raw) sleepStart = raw;
      } catch (_) { /* ignore */ }
    }
    const windDownDone = data.windDownDone != null ? data.windDownDone : getWindDownDoneCount();
    await HBIT.db.sleepLogs.set(dateKey, {
      sleepTime,
      bedtime: sleepTime,
      wakeTime,
      duration,
      quality,
      cycles,
      notes: (data.notes || "").trim(),
      ...(sleepStart != null && { sleepStart }),
      ...(data.planned != null && { planned: data.planned }),
      ...(windDownDone != null && { windDownDone }),
      ...(data.planId != null && { planId: data.planId }),
    });
  }

  function sleepPlansCol() {
    if (!state.uid) return null;
    return firebase.firestore().collection("users").doc(state.uid).collection("sleepPlans");
  }

  async function loadSleepPlans() {
    if (!state.uid) return [];
    try {
      const snap = await sleepPlansCol()
        .orderBy("createdAt", "desc")
        .limit(24)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("[sleep] loadPlans:", err);
      return [];
    }
  }

  async function saveSleepPlan(payload) {
    const col = sleepPlansCol();
    if (!col) return;
    const p = payload || {};
    const dateVal = p.date || todayKey();
    const bedTime = p.bedTimePlanned || p.bedtime;
    const wakeTime = p.wakeTimePlanned || p.wakeTime;
    if (!dateVal || !bedTime || !wakeTime) return;
    const dur = durationHours(bedTime, wakeTime);
    await col.add({
      date: dateVal,
      bedTimePlanned: bedTime,
      wakeTimePlanned: wakeTime,
      targetHours: p.targetHours != null ? p.targetHours : Math.round(dur * 10) / 10,
      note: p.note || "",
      status: "planned",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async function completePlan(planId, plan) {
    if (!state.uid) return;
    try {
      await sleepPlansCol().doc(planId).update({ status: "completed" });
      openLogSheet(plan.date, {
        sleepTime: plan.bedTimePlanned,
        wakeTime: plan.wakeTimePlanned,
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

  async function deleteTodayPlannedPlans() {
    const col = sleepPlansCol();
    if (!col) return;
    try {
      const snap = await col.where("date", "==", todayKey()).get();
      const batch = firebase.firestore().batch();
      let n = 0;
      snap.docs.forEach((doc) => {
        if (doc.data().status === "planned") {
          batch.delete(doc.ref);
          n++;
        }
      });
      if (n) await batch.commit();
    } catch (err) {
      console.warn("[sleep] deleteTodayPlannedPlans:", err);
    }
  }

  async function renderSavedPlans() {
    const container = $("slSavedPlans");
    if (!container || !state.uid) return;
    const plans = await loadSleepPlans();
    if (!plans.length) {
      container.innerHTML = "";
      return;
    }

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
                ? "<polyline points=\"20 6 9 17 4 12\"/>"
                : "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>"}
            </svg>
          </div>
          <div class="sl-plan-item-body">
            <div class="sl-plan-item-date">${dateLabel} · ${dur.toFixed(1)}h</div>
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

    container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const pid = btn.dataset.pid;
        const action = btn.dataset.action;
        const plan = plans.find((p) => p.id === pid);
        if (!plan) return;
        if (action === "complete") await completePlan(pid, plan);
        if (action === "delete") await deletePlan(pid);
      });
    });
  }

  function setQualityDots(quality) {
    const wrap = $("slHeroQuality");
    if (!wrap) return;
    const dots = wrap.querySelectorAll(".sl-q-dot");
    const filled = quality > 0 ? Math.round(quality / 2) : 0;
    dots.forEach((dot, i) => {
      dot.classList.toggle("filled", i < filled);
    });
  }

  function renderWeekBars(values) {
    const svg = $("slWeekBars");
    if (!svg) return;
    const data = (values || []).slice(-7);
    while (data.length < 7) data.unshift(0);
    const W = 112;
    const H = 32;
    const n = 7;
    const barW = 10;
    const gap = 6;
    const total = n * barW + (n - 1) * gap;
    const xOff = (W - total) / 2;
    const maxV = Math.max(9, ...data);
    const col = "#818CF8";
    svg.innerHTML = data.map((v, i) => {
      const x = xOff + i * (barW + gap);
      const bh = Math.max(3, Math.round((Math.max(0, v) / maxV) * (H - 5)));
      const y = H - bh - 2;
      const r = Math.min(3, barW / 2);
      const op = (0.5 + (i / n) * 0.5).toFixed(2);
      return `<rect x="${x}" y="2" width="${barW}" height="${H - 4}" rx="${r}"
              fill="${col}18"/>
              ${bh > 2 ? `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="${r}"
              fill="${col}" opacity="${op}"/>` : ""}`;
    }).join("");
  }

  function formatDisplayTime12(hhmm) {
    if (!hhmm || hhmm === "—") return "—";
    const d = timeToDate(hhmm);
    if (!d) return hhmm;
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function defaultPlanDisplay() {
    const wake = state.tonightPlan?.wakeTimePlanned || $("cycleWakeInput")?.value || effectiveSettings().defaultWake;
    const sug = suggestedBedtimes(wake, 5);
    const five = sug.find((s) => s.cycles === 5) || sug[0];
    if (!five) return { bed: "—", wake, badge: "—", cycles: 5 };
    const durH = five.duration;
    const badge = `${formatDurHuman(durH)} · ${five.cycles} cycles`;
    return { bed: five.hhmm, bedDisp: formatDisplayTime12(five.hhmm), wake, wakeDisp: formatDisplayTime12(wake), badge, cycles: five.cycles };
  }

  function renderDebtIndicator(debtHours) {
    const el = $("slDebtVal");
    const sub = $("slDebtSub");
    if (!el) return;
    const abs = Math.abs(debtHours);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    let txt = "";
    if (h > 0 && m > 0) txt = `${h}h ${m}min`;
    else if (h > 0) txt = `${h}h`;
    else if (m > 0) txt = `${m}min`;
    else txt = "0";

    if (debtHours > 0.05) {
      el.textContent = `−${txt}`;
      el.classList.add("behind");
      el.classList.remove("ahead");
      if (sub) sub.textContent = tsleep("sleep.debtBehind");
    } else {
      el.textContent = debtHours < -0.05 ? `+${txt}` : txt;
      el.classList.add("ahead");
      el.classList.remove("behind");
      if (sub) sub.textContent = tsleep("sleep.debtAhead");
    }
  }

  function renderHeroV2() {
    const plan = state.tonightPlan;
    const bedLarge = $("slHeroBedtimeLarge");
    const wakeEl = $("slHeroWakeDisplay");
    const badgeEl = $("slHeroBadge");
    const countEl = $("slHeroCountdown");
    const debtBlock = $("slHeroDebtBlock");

    const disp = plan
      ? {
          bed: plan.bedTimePlanned,
          bedDisp: formatDisplayTime12(plan.bedTimePlanned),
          wake: plan.wakeTimePlanned,
          wakeDisp: formatDisplayTime12(plan.wakeTimePlanned),
          badge: `${formatDurHuman(durationHours(plan.bedTimePlanned, plan.wakeTimePlanned))} · ${Math.max(1, Math.round((durationHours(plan.bedTimePlanned, plan.wakeTimePlanned) * 60) / CYCLE_MIN))} cycles`,
        }
      : defaultPlanDisplay();

    if (bedLarge) bedLarge.textContent = disp.bedDisp || formatDisplayTime12(disp.bed);
    if (wakeEl) wakeEl.textContent = disp.wakeDisp || formatDisplayTime12(disp.wake);
    if (badgeEl) badgeEl.textContent = disp.badge || "—";

    if (countEl) {
      if (plan) {
        countEl.hidden = false;
        updateCountdownPill(plan.bedTimePlanned);
      } else {
        countEl.hidden = true;
        countEl.textContent = "";
        countEl.classList.remove("pulse");
      }
    }

    const ql = qualifyingLastNightLog();
    const anyData = hasAnySleepData();

    const debtTitle = debtBlock?.querySelector(".sl-debt-lbl");
    if (!anyData) {
      $("slDebtVal").textContent = "—";
      $("slDebtVal").classList.remove("behind", "ahead");
      if ($("slDebtSub")) $("slDebtSub").textContent = tsleep("sleep.noDataHero");
      if (debtTitle) debtTitle.style.display = "none";
      renderWeekBars([]);
    } else {
      if (debtTitle) debtTitle.style.display = "";
      const debt = state.statsSnapshot?.debtVsTarget ?? state.sleepDebt ?? 0;
      renderDebtIndicator(debt);
      const vals = state.recentLogs.map((l) => l.duration || 0).reverse();
      renderWeekBars(vals);
    }

    const pill = $("slLastNightPill");
    if (pill) {
      if (ql) {
        const dur = ql.duration != null ? ql.duration : durationHours(ql.bedtime || ql.sleepTime, ql.wakeTime);
        pill.hidden = false;
        pill.disabled = false;
        pill.style.opacity = "";
        pill.textContent = `${tsleep("sleep.lastNight")}: ${formatDurFromLogHours(dur)} · ★ ${ql.quality || "—"}`;
      } else {
        pill.hidden = false;
        pill.disabled = true;
        pill.style.opacity = "0.65";
        pill.textContent = tsleep("sleep.noRecentLog");
      }
    }
  }

  function formatCountdown(ms) {
    if (ms <= 0) return null;
    const m = Math.ceil(ms / 60000);
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h > 0) return `${h}h ${r}min`;
    return `${r}min`;
  }

  function updateCountdownPill(bedHhmm) {
    const el = $("slHeroCountdown");
    if (!el || !bedHhmm) return;
    const target = tonightBedDateTime(bedHhmm);
    if (!target) return;
    const now = new Date();
    const ms = target - now;
    if (ms <= 0) {
      el.textContent = tsleep("sleep.bedtimeNow");
      el.classList.remove("pulse");
      return;
    }
    const fmt = formatCountdown(ms);
    el.textContent = tsleep("sleep.sleepIn", { time: fmt || "" });
    el.classList.toggle("pulse", ms < 30 * 60000);
  }

  function startCountdown(bedtimeHhmm) {
    stopCountdown();
    if (!bedtimeHhmm) return;
    updateCountdownPill(bedtimeHhmm);
    state.countdownTimer = setInterval(() => updateCountdownPill(bedtimeHhmm), 60_000);
  }

  function stopCountdown() {
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
    }
  }

  function renderCycleCalculator() {
    const wrap = $("slCycleCards");
    if (!wrap) return;
    const wake = $("cycleWakeInput")?.value || effectiveSettings().defaultWake;
    const sug = suggestedBedtimes(wake, 5);
    wrap.innerHTML = sug.map((s) => {
      const rec = s.cycles === 5 || s.cycles === 6;
      const sel = state.cycleSelection && state.cycleSelection.cycles === s.cycles;
      return `
        <button type="button" class="sl-cycle-card${rec ? " recommended" : ""}${sel ? " selected" : ""}"
          data-cycles="${s.cycles}" data-bed="${s.hhmm}" data-wake="${wake}">
          ${rec ? `<span class="sl-cycle-badge">⭐ ${tsleep("sleep.recommended")}</span>` : "<span class=\"sl-cycle-badge\"></span>"}
          <div class="sl-cycle-meta-top">${s.cycles} cycles</div>
          <div class="sl-cycle-time">${formatDisplayTime12(s.hhmm)}</div>
          <div class="sl-cycle-meta">${formatDurHuman(s.duration)}</div>
          ${s.forTomorrow ? `<div class="sl-cycle-note">${tsleep("sleep.forTomorrow")}</div>` : ""}
        </button>`;
    }).join("");

    wrap.querySelectorAll(".sl-cycle-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectCycleCard(
          parseInt(btn.dataset.cycles, 10),
          btn.dataset.bed,
          btn.dataset.wake
        );
      });
    });

    const prev = state.cycleSelection;
    if (prev) {
      const still = sug.find((x) => x.cycles === prev.cycles);
      if (still) selectCycleCard(still.cycles, still.hhmm, wake);
      else {
        state.cycleSelection = null;
        const pvw = $("slCyclePreview");
        const cta = $("slCycleCta");
        if (pvw) pvw.hidden = true;
        if (cta) cta.hidden = true;
      }
    }
  }

  function selectCycleCard(cycles, bedtime, wake) {
    state.cycleSelection = { cycles, bedtime, wake };
    renderCycleCalculator();
    const pvw = $("slCyclePreview");
    const cta = $("slCycleCta");
    if (pvw) {
      pvw.hidden = false;
      pvw.textContent = tsleep("sleep.cyclePreview", {
        bed: formatDisplayTime12(bedtime),
        cycles: String(cycles),
        wake: formatDisplayTime12(wake),
      });
    }
    if (cta) {
      cta.hidden = false;
      cta.textContent = tsleep("sleep.setAsPlan", { time: formatDisplayTime12(bedtime) });
    }
    $("slCycleCta")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function setTonightsPlan(bedtime, wake) {
    await deleteTodayPlannedPlans();
    await saveSleepPlan({
      date: todayKey(),
      bedTimePlanned: bedtime,
      wakeTimePlanned: wake,
      targetHours: durationHours(bedtime, wake),
    });
    const plans = await loadSleepPlans();
    state.tonightPlan = plans.find((p) => p.date === todayKey() && p.status === "planned") || null;
    stopCountdown();
    if (state.tonightPlan) startCountdown(state.tonightPlan.bedTimePlanned);
    renderHeroV2();
    showToast(tsleep("sleep.planSet"));
    window.scrollTo({ top: 0, behavior: "smooth" });
    await renderSavedPlans();
  }

  function windDownStorageKey() {
    return `sl-winddown-${todayKey()}`;
  }

  function loadWindDownState() {
    try {
      const raw = sessionStorage.getItem(windDownStorageKey());
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveWindDownState(ids) {
    try {
      sessionStorage.setItem(windDownStorageKey(), JSON.stringify(ids));
    } catch (_) { /* ignore */ }
  }

  function getWindDownDoneCount() {
    return loadWindDownState().length;
  }

  function toggleWindDownItem(itemId) {
    let ids = loadWindDownState();
    if (ids.includes(itemId)) ids = ids.filter((x) => x !== itemId);
    else ids = [...ids, itemId];
    saveWindDownState(ids);
    renderWindDown();
    loadWindDownStateIntoUI();
  }

  function renderWindDown() {
    const list = $("slWindDownList");
    if (!list) return;
    const checked = new Set(loadWindDownState());
    list.innerHTML = WIND_ITEMS.map((item) => {
      const title = tsleep(item.titleKey);
      const sub = tsleep(item.subKey);
      const isCh = checked.has(item.id);
      let links = "";
      if (item.links) {
        links = `<div class="sl-winddown-links">
          ${item.links.map((l) =>
            `<button type="button" class="sl-winddown-link" data-href="${l.href}" data-hint="${l.hint.replace(/"/g, "&quot;")}">${l.label}</button>`
          ).join("")}
        </div>`;
      } else if (item.markKey) {
        links = `<div class="sl-winddown-links">
          <button type="button" class="sl-winddown-link" data-mark="${item.id}">${tsleep("sleep.markDone")}</button>
        </div>`;
      } else if (item.breath) {
        links = `<div class="sl-winddown-links">
          <button type="button" class="sl-winddown-link" data-breath="1">${tsleep("sleep.startBreath")}</button>
        </div>`;
      }
      return `
        <button type="button" class="sl-winddown-item${isCh ? " checked" : ""}" data-wd-id="${item.id}">
          <div class="sl-winddown-item-head">
            <span class="sl-winddown-check" aria-hidden="true"></span>
            <span class="sl-winddown-item-title">${title}</span>
          </div>
          <p class="sl-winddown-item-sub">${sub}</p>
          ${links}
          <div class="sl-winddown-tooltip" hidden></div>
        </button>`;
    }).join("");

    list.querySelectorAll(".sl-winddown-item").forEach((row) => {
      row.addEventListener("click", (e) => {
        const t = e.target;
        if (t.closest(".sl-winddown-link")) return;
        toggleWindDownItem(row.dataset.wdId);
      });
    });
    list.querySelectorAll(".sl-winddown-link[data-href]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const href = btn.dataset.href;
        const hint = btn.dataset.hint || "";
        let navigated = false;
        const onBlur = () => {
          if (!navigated) showLinkTooltip(btn, hint);
          window.removeEventListener("blur", onBlur);
        };
        window.addEventListener("blur", onBlur);
        setTimeout(() => {
          try {
            window.location.href = href;
            navigated = true;
          } catch (_) {
            showLinkTooltip(btn, hint);
          }
        }, 0);
        setTimeout(() => {
          if (document.hasFocus()) showLinkTooltip(btn, hint);
          window.removeEventListener("blur", onBlur);
        }, 900);
      });
    });
    list.querySelectorAll(".sl-winddown-link[data-mark]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleWindDownItem(btn.dataset.mark);
      });
    });
    list.querySelectorAll(".sl-winddown-link[data-breath]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openBreathingModal();
      });
    });
  }

  function showLinkTooltip(anchor, text) {
    const row = anchor.closest(".sl-winddown-item");
    const tip = row?.querySelector(".sl-winddown-tooltip");
    if (!tip || !text) return;
    tip.textContent = text;
    tip.hidden = false;
    setTimeout(() => { tip.hidden = true; }, 5000);
  }

  function loadWindDownStateIntoUI() {
    const done = getWindDownDoneCount();
    const total = WIND_ITEMS.length;
    const wrap = $("slWindDownProgressWrap");
    const lbl = $("slWindDownProgressLabel");
    const fill = $("slWindDownProgressFill");
    const doneMsg = $("slWindDownDoneMsg");
    if (done >= total) {
      if (wrap) wrap.hidden = true;
      if (doneMsg) {
        doneMsg.hidden = false;
        doneMsg.textContent = tsleep("sleep.winddownAllDone");
      }
    } else {
      if (wrap) wrap.hidden = false;
      if (doneMsg) doneMsg.hidden = true;
      if (lbl) lbl.textContent = tsleep("sleep.breathProgress", { done: String(done), total: String(total) });
      if (fill) fill.style.width = `${(done / total) * 100}%`;
    }
  }

  function plannedBedDateTimeFromPlan() {
    const p = state.tonightPlan;
    if (!p) return null;
    return tonightBedDateTime(p.bedTimePlanned);
  }

  function isWithinWindDown() {
    const bed = plannedBedDateTimeFromPlan();
    if (!bed) return false;
    const { windDownMins } = effectiveSettings();
    const start = addMinutes(bed, -windDownMins);
    const now = new Date();
    return now >= start && now < bed;
  }

  function activateWindDown() {
    const sec = $("slWindDown");
    if (!sec) return;
    if (!isWithinWindDown()) {
      sec.classList.remove("active");
      const t = $("slWindDownTitle");
      if (t) t.textContent = tsleep("sleep.winddown");
      return;
    }
    sec.classList.add("active");
    const t = $("slWindDownTitle");
    if (t) t.textContent = tsleep("sleep.winddownActive");
  }

  function runBreathPhase() {
    /* Phase visuals driven by paintBreathAt (1s interval in openBreathingModal). */
  }

  function paintBreathAt(total) {
    if (total >= 180) {
      endBreathingSession();
      return;
    }
    const prog = $("slBreathProgressBar");
    const remEl = $("slBreathRemaining");
    if (prog) prog.style.width = `${Math.min(100, (total / 180) * 100)}%`;
    if (remEl) {
      const left = Math.max(0, 180 - total);
      const mm = Math.floor(left / 60);
      const ss = left % 60;
      remEl.textContent = `${mm}:${pad2(ss)} remaining`;
    }
    const posInCycle = total % BREATH_CYCLE_SECS;
    let acc = 0;
    let phaseIdx = 0;
    let secInPhase = 0;
    for (let i = 0; i < BREATH_PHASES.length; i++) {
      const L = BREATH_PHASES[i].secs;
      if (posInCycle < acc + L) {
        phaseIdx = i;
        secInPhase = posInCycle - acc;
        break;
      }
      acc += L;
    }
    const phase = BREATH_PHASES[phaseIdx];
    const secsLeft = phase.secs - secInPhase;
    const labelEl = $("slBreathLabel");
    const secEl = $("slBreathSecs");
    const circle = $("slBreathCircle");
    if (labelEl) labelEl.textContent = tsleep(phase.labelKey);
    if (secEl) secEl.textContent = `${secsLeft} sec`;
    if (circle) {
      circle.style.background = phase.color;
      circle.style.transform = `scale(${phase.scale})`;
    }
  }

  function runBreathTick() {
    state.breathSessionElapsed += 1;
    paintBreathAt(state.breathSessionElapsed);
  }

  function openBreathingModal() {
    const ov = $("slBreathOverlay");
    const done = $("slBreathDone");
    const inner = ov?.querySelector(".sl-breath-inner");
    if (!ov) return;
    done && (done.hidden = true);
    inner?.querySelectorAll(".sl-breath-label, .sl-breath-secs, .sl-breath-progress, .sl-breath-remaining").forEach((el) => {
      if (!el.classList.contains("sl-breath-done")) el.style.display = "";
    });
    ov.classList.add("open");
    ov.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    state.breathSessionElapsed = 0;
    if (state.breathTimer) clearInterval(state.breathTimer);
    paintBreathAt(0);
    state.breathTimer = setInterval(runBreathTick, 1000);
  }

  function closeBreathingModal() {
    const ov = $("slBreathOverlay");
    if (state.breathTimer) {
      clearInterval(state.breathTimer);
      state.breathTimer = null;
    }
    if (ov) {
      ov.classList.remove("open");
      ov.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
  }

  function endBreathingSession() {
    if (state.breathTimer) {
      clearInterval(state.breathTimer);
      state.breathTimer = null;
    }
    const ids = loadWindDownState();
    if (!ids.includes("breath")) saveWindDownState([...ids, "breath"]);
    renderWindDown();
    loadWindDownStateIntoUI();
    const done = $("slBreathDone");
    const inner = $("slBreathOverlay")?.querySelector(".sl-breath-inner");
    inner?.querySelectorAll(".sl-breath-label, .sl-breath-secs, .sl-breath-progress, .sl-breath-remaining").forEach((el) => {
      el.style.display = "none";
    });
    if (done) {
      done.hidden = false;
      const p = $("slBreathDoneText");
      if (p) p.textContent = tsleep("sleep.breathDone");
    }
  }

  function recordSleepStart() {
    try {
      const key = `sl-sleepStart-${todayKey()}`;
      sessionStorage.setItem(key, new Date().toISOString());
    } catch (_) { /* ignore */ }
  }

  async function scheduleWakeAlarm(wakeHhmm) {
    if (!("Notification" in window)) {
      showToast(tsleep("sleep.notificationsUnsupported"));
      return;
    }
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (permission !== "granted") {
      showToast(tsleep("sleep.alarmDenied"));
      return;
    }
    const wake = timeToDate(wakeHhmm);
    const now = new Date();
    if (!wake) return;
    if (wake <= now) wake.setDate(wake.getDate() + 1);
    const delay = wake.getTime() - now.getTime();
    setTimeout(() => {
      try {
        new Notification("Good morning! 🌅", {
          body: `Wake up — you planned ${wakeHhmm}`,
          icon: "/favicon.ico",
          tag: "hbit-wake-alarm",
          requireInteraction: true,
        });
      } catch (_) { /* ignore */ }
    }, delay);
    showToast(tsleep("sleep.alarmSet", { time: wakeHhmm }));
  }

  async function activateReadyToSleep() {
    recordSleepStart();
    const es = effectiveSettings();
    const wake = state.tonightPlan?.wakeTimePlanned || $("cycleWakeInput")?.value || es.defaultWake;
    if (es.alarmEnabled) await scheduleWakeAlarm(wake);
    openBreathingModal();
    try {
      sessionStorage.setItem(`sl-ready-${todayKey()}`, "1");
    } catch (_) { /* ignore */ }
    updateReadyButtonUI();
  }

  function updateReadyButtonUI() {
    const btn = $("slReadyBtn");
    if (!btn) return;
    let done = false;
    try {
      done = sessionStorage.getItem(`sl-ready-${todayKey()}`) === "1";
    } catch (_) { /* ignore */ }
    if (done) {
      btn.disabled = true;
      btn.classList.add("done");
      btn.textContent = tsleep("sleep.readyDone");
    } else {
      btn.disabled = false;
      btn.classList.remove("done");
      btn.textContent = tsleep("sleep.readyToSleep");
    }
  }

  function showToast(msg, durationMs = 3000) {
    const el = $("slToast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("visible");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("visible"), durationMs);
  }

  function exposeSleepSummary() {
    const ql = qualifyingLastNightLog();
    const dur = ql
      ? (ql.duration != null ? ql.duration : durationHours(ql.bedtime || ql.sleepTime, ql.wakeTime))
      : 0;
    HBIT.sleep = HBIT.sleep || {};
    HBIT.sleep.lastNightSummary = {
      duration: dur || 0,
      quality: ql?.quality || 0,
      isBelowTarget: (dur || 0) < 6,
      dateKey: ql ? (ql.dateKey || ql.date) : null,
    };
  }

  function initTabs() {
    $("slTabTonight")?.addEventListener("click", () => switchTab("tonight"));
    $("slTabHistory")?.addEventListener("click", () => switchTab("history"));
  }

  async function switchTab(name) {
    state.activeTab = name;
    const tTonight = $("slTabTonight");
    const tHist = $("slTabHistory");
    const pTon = $("slPanelTonight");
    const pHis = $("slPanelHistory");
    const on = name === "tonight";
    tTonight?.classList.toggle("active", on);
    tHist?.classList.toggle("active", !on);
    tTonight?.setAttribute("aria-selected", String(on));
    tHist?.setAttribute("aria-selected", String(!on));
    if (pTon) pTon.hidden = !on;
    if (pHis) pHis.hidden = on;
    if (name === "history") {
      await loadMonth(state.calMonth || todayKey().slice(0, 7));
      state.historyLoaded = true;
      renderCalendar();
      await renderSavedPlans();
    }
    HBIT.i18n?.apply?.(document);
  }

  function handleWarnBanner() {
    const ban = $("slWarnBanner");
    if (!ban) return;
    const ql = qualifyingLastNightLog();
    const dur = ql ? (ql.duration != null ? ql.duration : durationHours(ql.bedtime || ql.sleepTime, ql.wakeTime)) : null;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(`sl-warn-dismissed-${todayKey()}`) === "1";
    } catch (_) { /* ignore */ }
    if (dur != null && dur < 6 && !dismissed) {
      ban.hidden = false;
      const tx = $("slWarnText");
      if (tx) {
        const hoursStr = formatDurFromLogHours(dur);
        tx.textContent = tsleep("sleep.warnBanner", { hours: hoursStr });
      }
    } else {
      ban.hidden = true;
    }
  }

  function initDevicePlaceholders() {
    document.querySelectorAll(".sl-device-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        let tip = document.querySelector(".sl-device-tooltip");
        if (!tip) {
          tip = document.createElement("div");
          tip.className = "sl-device-tooltip";
          document.body.appendChild(tip);
        }
        const r = btn.getBoundingClientRect();
        tip.textContent = tsleep("sleep.comingSoonMsg");
        tip.style.left = `${Math.max(8, r.left + r.width / 2 - 100)}px`;
        tip.style.top = `${r.top - 8}px`;
        tip.style.transform = "translateY(-100%)";
        tip.classList.add("visible");
        clearTimeout(state.deviceTooltipTimer);
        state.deviceTooltipTimer = setTimeout(() => tip.classList.remove("visible"), 2000);
      });
    });
  }

  function populateDurationSelect() {
    const sel = $("planDuration");
    if (!sel || sel.dataset.ready) return;
    sel.dataset.ready = "1";
    for (let v = 4; v <= 12; v += 0.5) {
      const o = document.createElement("option");
      o.value = String(v);
      o.textContent = `${v} h`;
      sel.appendChild(o);
    }
    sel.value = "7.5";
  }

  function renderWeekSchedule() {
    const wrap = $("weekSchedule");
    if (!wrap) return;
    populateDurationSelect();
    const wake = $("planWake")?.value || effectiveSettings().defaultWake;
    const dur = parseFloat($("planDuration")?.value) || effectiveSettings().targetHours;
    const week = weeklySchedule(wake, dur);
    wrap.innerHTML = week
      .map((r) => `
        <div class="sl-week-row sl-sched-row${r.isWeekend ? " weekend" : ""}">
          <span class="sl-week-day-dot"></span>
          <span class="sl-week-day">${r.day}</span>
          <span class="sl-week-times">
            <span aria-hidden="true">🌙</span> ${r.bedtime}
            <span aria-hidden="true">→</span>
            <span aria-hidden="true">☀️</span> ${r.wake}
            ${r.durLabel ? `<span class="sl-week-dur">${r.durLabel}</span>` : ""}
          </span>
        </div>
      `)
      .join("");
  }

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
      const dk = `${ym}-${pad2(day)}`;
      const log = logMap[dk];
      const dur = log && log.duration != null ? `${log.duration.toFixed(1)}h` : "";
      const q = log?.quality || 0;
      const qAttr = q >= 7 ? "high" : q > 0 && q <= 4 ? "low" : "";
      html += `<div class="sl-cal-day ${log ? "has-log" : ""}" data-date="${dk}"
                ${qAttr ? `data-quality="${qAttr}"` : ""}
                role="button" tabindex="0">
        <span class="sl-cal-num">${day}</span>
        ${dur ? `<span class="sl-cal-dur">${dur}</span>` : ""}
      </div>`;
    }
    const totalCells = 42;
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

  async function openLogSheet(dateKey, prefill) {
    const dk = dateKey || todayKey();
    state.editingDateKey = dk;
    if ($("logDate")) $("logDate").value = dk;

    let log = (state.logs || []).find((l) => (l.dateKey || l.date) === dk);
    if (!log && state.uid) {
      try {
        log = await HBIT.db.sleepLogs.get(dk);
      } catch (_) { /* ignore */ }
    }
    if (log) {
      if ($("logSleepTime")) $("logSleepTime").value = log.sleepTime || log.bedtime || "23:00";
      if ($("logWakeTime")) $("logWakeTime").value = log.wakeTime || "07:00";
      const q = log.quality != null ? log.quality : 7;
      if ($("logQuality")) $("logQuality").value = q;
      if ($("logQualityVal")) $("logQualityVal").textContent = q;
      if ($("logNotes")) $("logNotes").value = log.notes || "";
    } else {
      if ($("logSleepTime")) $("logSleepTime").value = prefill?.sleepTime || "23:00";
      if ($("logWakeTime")) $("logWakeTime").value = prefill?.wakeTime || "07:00";
      if ($("logQuality")) $("logQuality").value = 7;
      if ($("logQualityVal")) $("logQualityVal").textContent = "7";
      if ($("logNotes")) $("logNotes").value = "";
    }

    const yk = yesterdayKey();
    if (dk === yk) {
      try {
        const stored = sessionStorage.getItem(`sl-sleepStart-${yk}`);
        if (stored) {
          const d = new Date(stored);
          const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
          if ($("logSleepTime")) $("logSleepTime").value = hhmm;
        }
      } catch (_) { /* ignore */ }
    }

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
      state.logs = (state.logs || []).filter((l) => (l.dateKey || l.date) !== dk);
      if (state.lastNight && (state.lastNight.dateKey || state.lastNight.date) === dk) {
        await loadLastNight();
      }
      renderHeroV2();
      renderCalendar();
      exposeSleepSummary();
      handleWarnBanner();
    } catch (err) {
      console.warn("[Hbit] Sleep delete:", err?.message);
    }
  }

  async function submitLog() {
    const dateKey = $("logDate")?.value || todayKey();
    const sleepTime = $("logSleepTime")?.value || "23:00";
    const wakeTime = $("logWakeTime")?.value || "07:00";
    const quality = parseInt($("logQuality")?.value, 10) || 7;
    const notes = ($("logNotes")?.value || "").trim();
    const duration = durationHours(sleepTime, wakeTime);

    const saveBtn = $("logSave");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "…";
    }

    try {
      await saveLog(dateKey, { sleepTime, wakeTime, duration, quality, notes });
      closeLogSheet();
      await loadLastNight();
      const th = effectiveSettings().targetHours;
      state.statsSnapshot = await HBIT.db.sleepLogs.getStats(7, th);
      state.sleepDebt = state.statsSnapshot?.debtVsTarget || 0;
      const month = dateKey.slice(0, 7);
      state.calMonth = month;
      await loadMonth(month);
      renderAll();
      exposeSleepSummary();
      handleWarnBanner();
    } catch (err) {
      console.warn("[Hbit] Sleep save:", err?.message);
      if (saveBtn) {
        saveBtn.textContent = "Error — retry";
        saveBtn.style.background = "var(--sl-red,#F87171)";
      }
      setTimeout(() => {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = HBIT.i18n?.t?.("common.save", "Save") || "Save";
          saveBtn.style.background = "";
        }
      }, 2500);
      return;
    }
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = HBIT.i18n?.t?.("common.save", "Save") || "Save";
    }
  }

  function updateDateDisplay() {
    const d = new Date();
    if ($("slDate")) {
      $("slDate").textContent = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).toUpperCase();
    }
  }

  function bindEvents() {
    $("logClose")?.addEventListener("click", closeLogSheet);
    $("logSave")?.addEventListener("click", submitLog);
    $("logDelete")?.addEventListener("click", submitDeleteLog);
    $("logOverlay")?.addEventListener("click", (e) => {
      if (e.target.id === "logOverlay") closeLogSheet();
    });

    $("logQuality")?.addEventListener("input", (e) => {
      const valEl = $("logQualityVal");
      if (valEl) valEl.textContent = e.target.value;
    });

    $("cycleWakeInput")?.addEventListener("change", () => {
      state.cycleSelection = null;
      renderCycleCalculator();
      renderHeroV2();
    });
    $("cycleWakeInput")?.addEventListener("input", () => {
      state.cycleSelection = null;
      renderCycleCalculator();
      renderHeroV2();
    });

    $("slCycleCta")?.addEventListener("click", async () => {
      const sel = state.cycleSelection;
      if (!sel) return;
      const btn = $("slCycleCta");
      if (btn) btn.disabled = true;
      try {
        await setTonightsPlan(sel.bedtime, sel.wake);
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    $("slHeroEditPlan")?.addEventListener("click", () => {
      document.getElementById("slSecCycles")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("slLastNightPill")?.addEventListener("click", () => {
      const ql = qualifyingLastNightLog();
      if (!ql || $("slLastNightPill")?.disabled) return;
      const dk = ql.dateKey || ql.date;
      switchTab("history").then(() => openLogSheet(dk));
    });

    $("slReadyBtn")?.addEventListener("click", () => activateReadyToSleep());

    $("planWake")?.addEventListener("change", () => {
      renderWeekSchedule();
      schedulePersistSettings();
    });
    $("planWake")?.addEventListener("input", () => {
      renderWeekSchedule();
      schedulePersistSettings();
    });
    $("planDuration")?.addEventListener("change", () => {
      renderWeekSchedule();
      schedulePersistSettings();
    });
    $("planDuration")?.addEventListener("input", () => {
      renderWeekSchedule();
      schedulePersistSettings();
    });

    $("calPrev")?.addEventListener("click", () => {
      const [yy, mm] = (state.calMonth || todayKey().slice(0, 7)).split("-").map(Number);
      state.calMonth = mm === 1 ? `${yy - 1}-12` : `${yy}-${pad2(mm - 1)}`;
      loadMonth(state.calMonth).then(renderCalendar);
    });
    $("calNext")?.addEventListener("click", () => {
      const [yy, mm] = (state.calMonth || todayKey().slice(0, 7)).split("-").map(Number);
      state.calMonth = mm === 12 ? `${yy + 1}-01` : `${yy}-${pad2(mm + 1)}`;
      loadMonth(state.calMonth).then(renderCalendar);
    });

    $("slHelpBtn")?.addEventListener("click", openSleepHelp);
    $("slHelpClose")?.addEventListener("click", closeSleepHelp);
    $("slHelpOverlay")?.addEventListener("click", (e) => {
      if (e.target.id === "slHelpOverlay") closeSleepHelp();
    });

    $("slWarnDismiss")?.addEventListener("click", () => {
      try {
        sessionStorage.setItem(`sl-warn-dismissed-${todayKey()}`, "1");
      } catch (_) { /* ignore */ }
      const ban = $("slWarnBanner");
      if (ban) ban.hidden = true;
    });

    $("slBreathClose")?.addEventListener("click", closeBreathingModal);
    $("slBreathDoneClose")?.addEventListener("click", closeBreathingModal);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const logOpen = $("logOverlay")?.classList.contains("open");
      const helpOpen = $("slHelpOverlay")?.classList.contains("open");
      const breathOpen = $("slBreathOverlay")?.classList.contains("open");
      if (logOpen) closeLogSheet();
      else if (breathOpen) closeBreathingModal();
      else if (helpOpen) closeSleepHelp();
    });

    window.addEventListener("hbit:lang-changed", () => {
      renderCycleCalculator();
      renderWindDown();
      loadWindDownStateIntoUI();
      renderWeekSchedule();
      handleWarnBanner();
      renderHeroV2();
      HBIT.i18n?.apply?.(document);
    });
  }

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

  function renderAll() {
    updateDateDisplay();
    renderHeroV2();
    renderCycleCalculator();
    renderWindDown();
    loadWindDownStateIntoUI();
    populateDurationSelect();
    const pw = $("planWake");
    const pd = $("planDuration");
    const cw = $("cycleWakeInput");
    const es = effectiveSettings();
    if (pw && !pw.dataset.slSynced) {
      pw.value = es.defaultWake;
      pw.dataset.slSynced = "1";
    }
    if (pd && !pd.dataset.slSynced) {
      pd.value = String(es.targetHours);
      pd.dataset.slSynced = "1";
    }
    if (cw && !cw.dataset.slSynced) {
      cw.value = es.defaultWake;
      cw.dataset.slSynced = "1";
    }
    renderWeekSchedule();
    handleWarnBanner();
    updateReadyButtonUI();
    activateWindDown();
    if (state.historyLoaded) {
      loadMonth(state.calMonth).then(renderCalendar);
    }
    HBIT.i18n?.apply?.(document);
  }

  function init() {
    if (document.body.id !== "sleepPage") return;
    if (document.body.dataset.sleepInit) return;
    document.body.dataset.sleepInit = "1";

    state.calMonth = todayKey().slice(0, 7);
    bindEvents();
    initTabs();
    initDevicePlaceholders();
    populateDurationSelect();
    renderWindDown();
    renderAll();

    HBIT.onReady(async (user) => {
      state.uid = user.uid;
      try {
        const profile = await HBIT.getCurrentUserProfile?.();
        const name = profile?.fullName || user.displayName || user.email || "U";
        const av = $("slAvatar");
        if (av) av.textContent = name.charAt(0).toUpperCase();
      } catch (_) { /* ignore */ }

      const settings = await loadSettings();
      state.settings = settings || {};
      const th = effectiveSettings().targetHours;

      await loadLastNight();
      let stats;
      try {
        stats = await HBIT.db.sleepLogs.getStats(7, th);
      } catch (_) {
        stats = { debtVsTarget: 0, logs: [] };
      }
      state.statsSnapshot = stats;
      state.sleepDebt = stats?.debtVsTarget || 0;

      state.calMonth = todayKey().slice(0, 7);

      const plans = await loadSleepPlans();
      state.tonightPlan = plans.find((p) => p.date === todayKey() && p.status === "planned") || null;

      exposeSleepSummary();
      renderAll();

      if (state.tonightPlan) {
        startCountdown(state.tonightPlan.bedTimePlanned);
      }

      setInterval(() => activateWindDown(), 60_000);
    });
  }

  HBIT.pages = HBIT.pages || {};
  HBIT.pages.sleep = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
