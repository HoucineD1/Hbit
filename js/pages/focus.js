(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $ = (id) => document.getElementById(id);
  const body = document.getElementById("focusPage");

  function tr(key, fallback, params) {
    if (typeof HBIT.i18n?.t !== "function") {
      let s = fallback != null ? fallback : key;
      if (params && typeof s === "string") {
        s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
      }
      return s;
    }
    if (params != null && typeof params === "object") return HBIT.i18n.t(key, fallback, params);
    return HBIT.i18n.t(key, fallback);
  }

  function translateBreathPhase(l) {
    if (l === "Inhale") return tr("focus.breath.inhale", l);
    if (l === "Exhale") return tr("focus.breath.exhale", l);
    if (l === "Hold") return tr("focus.breath.hold", l);
    return l;
  }

  // ======================================================================
  // SETTINGS & STORAGE
  // ======================================================================
  const SETTINGS_KEY = "hbit:focus:settings";
  const DAILY_KEY = "hbit:focus:daily";
  const SOUND_PREF_KEY = "hbit_focus_sound";
  const TAB_KEY = "hbit_focus_tab";
  const SESSIONS_KEY = "hbit:focus:sessions";

  let audioCtx = null;
  let audioUserReady = false;

  function soundEnabled() {
    try {
      return localStorage.getItem(SOUND_PREF_KEY) !== "0";
    } catch {
      return true;
    }
  }

  function setSoundPref(on) {
    try {
      localStorage.setItem(SOUND_PREF_KEY, on ? "1" : "0");
    } catch (_) {}
    updateSoundButton();
  }

  function markAudioUserReady() {
    audioUserReady = true;
    try {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === "suspended") ctx.resume();
    } catch (_) {}
  }

  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    return audioCtx;
  }

  function playToneAt(freq, startTime, duration, peakGain) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = startTime;
    const atk = Math.min(0.04, duration * 0.2);
    const t1 = t0 + atk;
    const t2 = t0 + duration;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peakGain, t1);
    g.gain.linearRampToValueAtTime(0.0001, t2);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t2 + 0.03);
  }

  function playWorkEndChime() {
    if (!audioUserReady || !soundEnabled()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const vol = 0.2;
    let t = ctx.currentTime;
    [440, 550, 660].forEach((hz) => {
      playToneAt(hz, t, 0.15, vol);
      t += 0.15;
    });
  }

  function playBreakEndChime() {
    if (!audioUserReady || !soundEnabled()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const vol = 0.2;
    let t = ctx.currentTime;
    [550, 440].forEach((hz) => {
      playToneAt(hz, t, 0.18, vol);
      t += 0.18;
    });
  }

  function updateSoundButton() {
    const btn = $("fcSoundToggle");
    if (!btn) return;
    const on = soundEnabled();
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "\u{1F514}" : "\u{1F515}";
    btn.setAttribute(
      "aria-label",
      on
        ? tr("focus.sound.ariaOn", "Timer sounds on")
        : tr("focus.sound.ariaOff", "Timer sounds muted")
    );
  }

  let settings = {
    workDuration: 25,
    breakDuration: 5,
    dailyGoal: 4,
    brPattern: "box",
  };

  // Breathing rhythms
  const BR_PATTERNS = {
    box:      [{l: "Inhale", t: 4}, {l: "Hold", t: 4}, {l: "Exhale", t: 4}, {l: "Hold", t: 4}],
    "478":    [{l: "Inhale", t: 4}, {l: "Hold", t: 7}, {l: "Exhale", t: 8}],
    sigh:     [{l: "Inhale", t: 2}, {l: "Inhale", t: 1}, {l: "Exhale", t: 6}],
    energize: [{l: "Inhale", t: 6}, {l: "Exhale", t: 2}]
  };

  function loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) settings = { ...settings, ...JSON.parse(stored) };
    } catch(e){}
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    renderSettingsState();
  }

  // ======================================================================
  // STATE
  // ======================================================================
  let timerState = {
    isWorking: true,
    timeLeft: 0,
    total: 0,
    sessions: 0,
    running: false,
    interval: null
  };
  let phaseStartedAt = Date.now();
  let sessionHistory = [];
  let historyLoaded = false;

  let brState = {
    seq: [],
    seqIdx: 0,
    phaseTick: 0,
  };

  const RING_CIRC = 2 * Math.PI * 106; // r=106
  
  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function loadDaily() {
    const tk = getTodayStr();
    try {
      const raw = localStorage.getItem(DAILY_KEY);
      const o = raw ? JSON.parse(raw) : null;
      timerState.sessions = (o && o.date === tk) ? parseInt(o.sessions, 10) || 0 : 0;
    } catch (e) { timerState.sessions = 0; }
  }

  function incDaily() {
    timerState.sessions++;
    try {
      localStorage.setItem(DAILY_KEY, JSON.stringify({ date: getTodayStr(), sessions: timerState.sessions }));
      if (window.firebase && firebase.firestore && firebase.auth().currentUser) {
        const uid = firebase.auth().currentUser.uid;
        firebase.firestore().collection("users").doc(uid).collection("focus").add({
          type: "zen", durationMins: settings.workDuration, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(()=>{});
      }
      if (HBIT.db?.users?.incrementStat) {
        HBIT.db.users.incrementStat("focusSessions", 1).catch(() => {});
      }
    } catch(e){}
    renderSettingsState();
  }

  function localLoadSessions() {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      sessionHistory = raw ? JSON.parse(raw) : [];
    } catch (_) {
      sessionHistory = [];
    }
  }

  function localSaveSessions() {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessionHistory.slice(-400)));
    } catch (_) {}
  }

  async function loadSessionHistory() {
    localLoadSessions();
    historyLoaded = true;
    renderSessionsTab();

    if (!(window.firebase && firebase.auth && firebase.firestore && firebase.auth().currentUser)) return;
    try {
      const uid = firebase.auth().currentUser.uid;
      const snap = await firebase.firestore()
        .collection("users").doc(uid).collection("focus_sessions")
        .orderBy("date", "desc")
        .limit(300)
        .get();
      const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (remote.length) {
        sessionHistory = remote;
        localSaveSessions();
        renderSessionsTab();
      }
    } catch (_) {}
  }

  async function recordSession(type, durationMins, startedAtMs) {
    const started = new Date(startedAtMs || Date.now());
    const dateKey = `${started.getFullYear()}-${String(started.getMonth() + 1).padStart(2, "0")}-${String(started.getDate()).padStart(2, "0")}`;
    const entry = {
      date: dateKey,
      startTime: started.toISOString(),
      duration: Math.max(1, Number(durationMins) || 1),
      type: type === "break" ? "break" : "work",
      createdAtMs: Date.now(),
    };
    sessionHistory.push(entry);
    localSaveSessions();
    renderSessionsTab();

    if (!(window.firebase && firebase.auth && firebase.firestore && firebase.auth().currentUser)) return;
    try {
      const uid = firebase.auth().currentUser.uid;
      await firebase.firestore().collection("users").doc(uid).collection("focus_sessions").add({
        ...entry,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (_) {}
  }

  function formatMinutesTotal(mins) {
    const m = Math.max(0, Math.round(Number(mins) || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${h}h ${r}m`;
  }

  function getWeekKeys() {
    const out = [];
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const n = new Date(d);
      n.setDate(d.getDate() + i);
      out.push(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`);
    }
    return out;
  }

  function calcStreak() {
    const workDays = new Set(
      sessionHistory
        .filter((s) => s.type === "work" && s.date)
        .map((s) => s.date)
    );
    if (!workDays.size) return 0;
    let streak = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (;;) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!workDays.has(key)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  // ======================================================================
  // UI & RENDER
  // ======================================================================
  const ui = {
    display: $("fcTimeDisplay"),
    ring: $("fcRingFill"),
    chip: $("fcPhaseChip"),
    label: $("fcPhaseLabel"),
    sess: $("fcSessions"),
    goalTxt: $("fcDailyGoalText"),
    goalTgt: $("fcGoalTargetText"),
    brDisp: $("fcBrDisplay"),
    brLabel: $("fcBrPhaseLabel"),
    brSecs: $("fcBrSecs"),
    brCircle: $("fcBrCircle"),
    startBtn: $("fcStartBtn"),
    playIcon: $("fcPlayIcon"),
    pauseIcon: $("fcPauseIcon"),
    modal: $("fcSettingsModal"),
    tabTimer: $("fcTabTimer"),
    tabSessions: $("fcTabSessions"),
    panelTimer: $("fcPanelTimer"),
    panelSessions: $("fcPanelSessions"),
    statTotalSessions: $("fcStatTotalSessions"),
    statFocusTime: $("fcStatFocusTime"),
    statStreak: $("fcStatStreak"),
    weekBars: $("fcWeekBars"),
    sessionList: $("fcSessionList"),
    sessionEmpty: $("fcSessionEmpty"),
  };

  function fmt(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderTimer() {
    if (ui.display) ui.display.textContent = fmt(timerState.timeLeft);
    if (ui.ring) {
      const pct = timerState.total > 0 ? timerState.timeLeft / timerState.total : 0;
      ui.ring.style.strokeDashoffset = String(RING_CIRC * (1 - Math.max(0, !!timerState.running ? pct : 1))); 
      // If paused/reset, full circle, else drain.
      if (!timerState.running && timerState.timeLeft === timerState.total) { // Initial state
         ui.ring.style.strokeDashoffset = "0";
      }
    }
  }

  function animateRingCompleteAndReset(done) {
    if (!ui.ring) {
      done?.();
      return;
    }
    const prev = ui.ring.style.transition;
    ui.ring.style.transition = "stroke-dashoffset 0.4s var(--ease-smooth)";
    ui.ring.style.strokeDashoffset = "0";
    setTimeout(() => {
      ui.ring.style.transition = prev || "stroke-dashoffset 0.8s ease, stroke 0.6s ease";
      done?.();
    }, 410);
  }

  function renderSettingsState() {
    if (ui.goalTxt) {
      ui.goalTxt.textContent = tr("focus.sessions.today", "{n} sessions today", { n: timerState.sessions });
    }
    if (ui.goalTgt) {
      ui.goalTgt.textContent = tr("focus.goal.target", "goal: {n}", { n: settings.dailyGoal });
    }
    if (ui.sess) ui.sess.textContent = String(timerState.sessions);
  }

  function setActiveTab(tab) {
    const next = tab === "sessions" ? "sessions" : "timer";
    const timerOn = next === "timer";
    ui.tabTimer?.classList.toggle("is-active", timerOn);
    ui.tabSessions?.classList.toggle("is-active", !timerOn);
    ui.tabTimer?.setAttribute("aria-selected", timerOn ? "true" : "false");
    ui.tabSessions?.setAttribute("aria-selected", !timerOn ? "true" : "false");
    ui.panelTimer?.classList.toggle("is-active", timerOn);
    ui.panelSessions?.classList.toggle("is-active", !timerOn);
    if (ui.panelTimer) ui.panelTimer.hidden = !timerOn;
    if (ui.panelSessions) ui.panelSessions.hidden = timerOn;
    try { localStorage.setItem(TAB_KEY, next); } catch (_) {}
    if (!timerOn) renderSessionsTab();
  }

  function renderSessionsTab() {
    if (!historyLoaded) return;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todays = sessionHistory.filter((s) => s.date === today);
    const workToday = todays.filter((s) => s.type === "work");
    const focusTodayMins = workToday.reduce((n, s) => n + (Number(s.duration) || 0), 0);

    if (ui.statTotalSessions) ui.statTotalSessions.textContent = String(todays.length);
    if (ui.statFocusTime) ui.statFocusTime.textContent = formatMinutesTotal(focusTodayMins);
    if (ui.statStreak) ui.statStreak.textContent = String(calcStreak());

    if (ui.sessionList) {
      const loc = getLang() === "fr" ? "fr-CA" : "en-CA";
      const tf = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit" });
      ui.sessionList.innerHTML = todays
        .slice()
        .sort((a, b) => String(b.startTime || "").localeCompare(String(a.startTime || "")))
        .map((s) => {
          const d = s.startTime ? new Date(s.startTime) : new Date();
          const tText = tf.format(d);
          return `<article class="fc-session-row">
            <span class="fc-session-badge ${s.type === "break" ? "break" : "work"}">${s.type === "break" ? tr("focus.phase.breathe", "Break") : tr("focus.phase.work", "Work")}</span>
            <span class="fc-session-time">${tText}</span>
            <span class="fc-session-dur">${Math.max(1, Number(s.duration) || 1)}m</span>
          </article>`;
        })
        .join("");
    }

    if (ui.sessionEmpty) ui.sessionEmpty.hidden = todays.length > 0;

    if (ui.weekBars) {
      const weekKeys = getWeekKeys();
      const loc = getLang() === "fr" ? "fr-CA" : "en-CA";
      const df = new Intl.DateTimeFormat(loc, { weekday: "short" });
      const map = {};
      weekKeys.forEach((k) => { map[k] = 0; });
      sessionHistory.forEach((s) => {
        if (s.type !== "work" || !map.hasOwnProperty(s.date)) return;
        map[s.date] += Number(s.duration) || 0;
      });
      const max = Math.max(1, ...weekKeys.map((k) => map[k]));
      ui.weekBars.innerHTML = weekKeys.map((k) => {
        const d = new Date(k + "T00:00:00");
        const mins = map[k];
        const width = Math.round((mins / max) * 100);
        return `<div class="fc-week-row">
          <span class="fc-week-day">${df.format(d)}</span>
          <div class="fc-week-track"><div class="fc-week-fill" style="width:${width}%"></div></div>
          <span class="fc-week-val">${Math.round(mins / 60 * 10) / 10}h</span>
        </div>`;
      }).join("");
    }
  }

  // ======================================================================
  // CORE LOGIC
  // ======================================================================
  function initPhase(isWork) {
    phaseStartedAt = Date.now();
    timerState.isWorking = isWork;
    const mins = isWork ? settings.workDuration : settings.breakDuration;
    timerState.total = mins * 60;
    timerState.timeLeft = timerState.total;

    body?.classList.toggle("is-break", !isWork);
    if (ui.chip) ui.chip.textContent = tr(isWork ? "focus.phase.work" : "focus.phase.breathe", isWork ? "Work" : "Breathe");
    if (ui.label) ui.label.textContent = tr(isWork ? "focus.sub.focusTime" : "focus.sub.breakRecover", isWork ? "Focus Time" : "Break & Recover");

    if (ui.brDisp) ui.brDisp.hidden = isWork;
    if (!isWork) setupBreathe();

    renderTimer();
  }

  // Breathing Logic (Executes alongside break countdown)
  function setupBreathe() {
    brState.seq = BR_PATTERNS[settings.brPattern] || BR_PATTERNS.box;
    brState.seqIdx = -1;
    advanceBreathe();
  }
  function advanceBreathe() {
    brState.seqIdx = (brState.seqIdx + 1) % brState.seq.length;
    brState.phaseTick = brState.seq[brState.seqIdx].t;
    syncBreatheUI();
  }
  function syncBreatheUI() {
    const lbl = brState.seq[brState.seqIdx].l;
    ui.brLabel.textContent = translateBreathPhase(lbl);
    ui.brSecs.textContent = String(brState.phaseTick);

    // Haptics
    if (timerState.running && navigator.vibrate) {
      if (lbl.includes("Inhale")) navigator.vibrate([40, 50, 40]);
      else if (lbl.includes("Hold")) navigator.vibrate([80]);
      else if (lbl.includes("Exhale")) navigator.vibrate([30, 80, 30, 80, 30]);
    }

    if (ui.brCircle) {
      ui.brCircle.className = "fc-br-circle";
      if (lbl.includes("Inhale")) ui.brCircle.classList.add("inhale");
      else if (lbl.includes("Exhale")) ui.brCircle.classList.add("exhale");
      else ui.brCircle.classList.add("hold");
    }
  }

  function tick() {
    timerState.timeLeft--;

    // Handle Breathe tick if in break
    if (!timerState.isWorking) {
      brState.phaseTick--;
      if (brState.phaseTick <= 0) advanceBreathe();
      else ui.brSecs.textContent = String(brState.phaseTick);
    }

    renderTimer();

    if (timerState.timeLeft <= 0) {
      const endedWork = timerState.isWorking;
      toggleRun(false);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
      const mins = endedWork ? settings.workDuration : settings.breakDuration;
      recordSession(endedWork ? "work" : "break", mins, phaseStartedAt);

      animateRingCompleteAndReset(() => {
        if (endedWork) {
          playWorkEndChime();
          incDaily();
          window.HBIT?.toast?.success(tr("focus.toast.sessionGreat", "Great focus session! Let's breathe."));
          initPhase(false);
        } else {
          playBreakEndChime();
          window.HBIT?.toast?.info(tr("focus.toast.breakDone", "Break complete. Back to work."));
          initPhase(true);
        }
      });
    }
  }

  function toggleRun(force = null) {
    const run = force !== null ? force : !timerState.running;
    if (run === timerState.running) return;

    timerState.running = run;
    ui.startBtn?.classList.toggle("is-running", run);
    if (ui.playIcon) ui.playIcon.style.display = run ? "none" : "";
    if (ui.pauseIcon) ui.pauseIcon.style.display = run ? "" : "none";

    renderTimer(); // flush ui

    if (run) {
      timerState.interval = setInterval(tick, 1000);
      // Kick off breathe visual if starting break
      if (!timerState.isWorking) syncBreatheUI();
    } else {
      clearInterval(timerState.interval);
      if (ui.brCircle) ui.brCircle.className = "fc-br-circle"; // Pause animation
    }
  }

  // ======================================================================
  // BINDINGS
  // ======================================================================
  function bindUi() {
    ui.tabTimer?.addEventListener("click", () => setActiveTab("timer"));
    ui.tabSessions?.addEventListener("click", () => setActiveTab("sessions"));
    [ui.tabTimer, ui.tabSessions].forEach((tab) => {
      tab?.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const next = tab === ui.tabTimer ? ui.tabSessions : ui.tabTimer;
        if (next) {
          next.focus();
          setActiveTab(next === ui.tabSessions ? "sessions" : "timer");
        }
      });
    });

    ui.startBtn?.addEventListener("click", () => {
      markAudioUserReady();
      toggleRun();
    });
    $("fcResetBtn")?.addEventListener("click", () => {
      markAudioUserReady();
      toggleRun(false);
      initPhase(true);
    });
    $("fcSkipBtn")?.addEventListener("click", () => {
      markAudioUserReady();
      toggleRun(false);
      if (timerState.isWorking) { incDaily(); initPhase(false); }
      else initPhase(true);
    });

    $("fcSoundToggle")?.addEventListener("click", () => {
      markAudioUserReady();
      setSoundPref(!soundEnabled());
    });

    // Settings Modal
    const openMod = () => {
      markAudioUserReady();
      toggleRun(false);
      ui.modal.hidden = false;
    };
    $("fcConfigPill")?.addEventListener("click", openMod);
    $("fcSettingsBtn")?.addEventListener("click", openMod);
    
    $("fcModalClose")?.addEventListener("click", () => { ui.modal.hidden = true; });
    $("fcModalSave")?.addEventListener("click", () => {
      const w = parseInt($("fcSetWork").value, 10) || 25;
      const b = parseInt($("fcSetBreak").value, 10) || 5;
      const g = parseInt($("fcSetGoal").value, 10) || 4;
      settings.workDuration = Math.max(1, w);
      settings.breakDuration = Math.max(1, b);
      settings.dailyGoal = Math.max(1, g);
      settings.brPattern = $("fcSetBrPattern").value || "box";
      saveSettings();
      ui.modal.hidden = true;
      initPhase(true);
    });

    // Spacebar mapping
    document.addEventListener("keydown", (e) => {
      if (e.target && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        markAudioUserReady();
        (!ui.modal.hidden) ? ui.modal.hidden = true : toggleRun();
      }
    });
  }

  // ======================================================================
  // INIT
  // ======================================================================
  let focusHelpModalBound = false;

  function init() {
    if (document.body.id !== "focusPage") return;
    loadSettings();
    loadDaily();

    // Populate Modal inputs with loaded settings
    if ($("fcSetWork")) $("fcSetWork").value = settings.workDuration;
    if ($("fcSetBreak")) $("fcSetBreak").value = settings.breakDuration;
    if ($("fcSetGoal")) $("fcSetGoal").value = settings.dailyGoal;
    if ($("fcSetBrPattern")) $("fcSetBrPattern").value = settings.brPattern;

    renderSettingsState();
    initPhase(true);
    bindUi();
    updateSoundButton();
    loadSessionHistory();
    let initialTab = "timer";
    try {
      initialTab = localStorage.getItem(TAB_KEY) || "timer";
    } catch (_) {}
    setActiveTab(initialTab);

    if (!focusHelpModalBound && HBIT.utils?.initHelpModal) {
      HBIT.utils.initHelpModal({
        openBtn: "fcHelpBtn",
        overlay: "fcHelpOverlay",
        closeBtn: "fcHelpClose",
      });
      focusHelpModalBound = true;
    }

    window.addEventListener("hbit:lang-changed", () => {
      renderSettingsState();
      updateSoundButton();
      renderSessionsTab();
      const isWork = timerState.isWorking;
      if (ui.chip) ui.chip.textContent = tr(isWork ? "focus.phase.work" : "focus.phase.breathe", isWork ? "Work" : "Breathe");
      if (ui.label) ui.label.textContent = tr(isWork ? "focus.sub.focusTime" : "focus.sub.breakRecover", isWork ? "Focus Time" : "Break & Recover");
      if (!isWork && brState.seq && brState.seq.length) syncBreatheUI();
    });
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } 
  else { init(); }

})();
