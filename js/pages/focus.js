(function () {
  "use strict";

  /* ── DOM refs ─────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);

  const timeDisplay  = $("fcTimeDisplay");
  const ringFill     = $("fcRingFill");
  const phaseChip    = $("fcPhaseChip");
  const phaseLabel   = $("fcPhaseLabel");
  const sessionsEl   = $("fcSessions");
  const startBtn     = $("fcStartBtn");
  const playIcon     = $("fcPlayIcon");
  const pauseIcon    = $("fcPauseIcon");
  const resetBtn     = $("fcResetBtn");
  const skipBtn      = $("fcSkipBtn");
  const presetBtns   = document.querySelectorAll(".fc-preset-btn");
  const tipEl        = $("fcTip");
  const body         = document.getElementById("focusPage");

  /* ── Ring geometry  r=96  circ=2π×96≈603.186 ─────────── */
  const RING_CIRC = 2 * Math.PI * 96;

  /* ── Presets ──────────────────────────────────────────── */
  const PRESETS = {
    pomodoro: { work: 25, brk: 5,  label: "Pomodoro" },
    deepWork: { work: 50, brk: 10, label: "Deep Work" },
  };

  const TIPS = [
    "Put your phone down and eliminate distractions.",
    "One task at a time. Close unused tabs.",
    "Stay hydrated — keep a glass of water nearby.",
    "Great work! Take your break seriously.",
    "Short breaks boost focus. Step away from the screen.",
  ];

  /* ── State ────────────────────────────────────────────── */
  let preset    = "pomodoro";
  let isWorking = true;
  let timeLeft  = PRESETS.pomodoro.work * 60;
  let total     = PRESETS.pomodoro.work * 60;
  let sessions  = 0;
  let running   = false;
  let interval  = null;

  /* ── Helpers ──────────────────────────────────────────── */
  function fmt(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function setRing(pct) {
    if (!ringFill) return;
    const offset = RING_CIRC * (1 - Math.max(0, Math.min(1, pct)));
    ringFill.style.strokeDashoffset = String(offset);
  }

  function setPhase(working) {
    isWorking = working;
    const p = PRESETS[preset];
    total    = working ? p.work * 60 : p.brk * 60;
    timeLeft = total;

    if (phaseChip)  phaseChip.textContent  = working ? "Work" : "Break";
    if (phaseLabel) phaseLabel.textContent = p.label;

    if (body) {
      body.classList.toggle("is-break", !working);
    }
    showTip(working ? 0 : 3);
    updateDisplay();
  }

  function updateDisplay() {
    if (timeDisplay) timeDisplay.textContent = fmt(timeLeft);
    if (sessionsEl)  sessionsEl.textContent  = String(sessions);
    setRing(timeLeft / total);
  }

  function showTip(idx) {
    if (!tipEl) return;
    const span = tipEl.querySelector("span");
    if (span) span.textContent = TIPS[idx % TIPS.length];
  }

  function setRunningUI(isRunning) {
    if (!startBtn || !playIcon || !pauseIcon) return;
    if (isRunning) {
      playIcon.style.display  = "none";
      pauseIcon.style.display = "";
      startBtn.classList.add("is-running");
      startBtn.setAttribute("aria-label", "Pause timer");
    } else {
      playIcon.style.display  = "";
      pauseIcon.style.display = "none";
      startBtn.classList.remove("is-running");
      startBtn.setAttribute("aria-label", "Start timer");
    }
  }

  /* ── Timer controls ───────────────────────────────────── */
  function start() {
    if (running) return;
    running = true;
    setRunningUI(true);

    interval = setInterval(function () {
      timeLeft--;
      updateDisplay();

      if (timeLeft <= 0) {
        clearInterval(interval);
        running = false;
        setRunningUI(false);

        if (isWorking) {
          sessions++;
          /* vibrate if supported */
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          setPhase(false);
        } else {
          setPhase(true);
        }
      }
    }, 1000);
  }

  function pause() {
    clearInterval(interval);
    running = false;
    setRunningUI(false);
  }

  function reset() {
    pause();
    const p = PRESETS[preset];
    isWorking = true;
    total     = p.work * 60;
    timeLeft  = total;
    if (body)      body.classList.remove("is-break");
    if (phaseChip) phaseChip.textContent  = "Work";
    if (phaseLabel) phaseLabel.textContent = p.label;
    showTip(0);
    updateDisplay();
  }

  function skip() {
    pause();
    if (isWorking) {
      sessions++;
      setPhase(false);
    } else {
      setPhase(true);
    }
  }

  function applyPreset(key) {
    preset = key;
    presetBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.preset === key);
    });
    reset();
  }

  /* ── Event listeners ──────────────────────────────────── */
  if (startBtn) {
    startBtn.addEventListener("click", function () {
      if (running) pause();
      else start();
    });
  }

  if (resetBtn) resetBtn.addEventListener("click", reset);
  if (skipBtn)  skipBtn.addEventListener("click", skip);

  presetBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyPreset(btn.dataset.preset);
    });
  });

  /* Keyboard: Space = start/pause, R = reset, S = skip */
  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.code === "Space") {
      e.preventDefault();
      if (running) pause();
      else start();
    } else if (e.code === "KeyR") {
      reset();
    } else if (e.code === "KeyS") {
      skip();
    }
  });

  /* ── Logout ───────────────────────────────────────────── */
  var fcLogoutBtn = $("fcLogoutBtn");
  if (fcLogoutBtn) {
    fcLogoutBtn.addEventListener("click", function () {
      if (typeof firebase === "undefined") return;
      firebase.auth().signOut().then(function () {
        window.location.href = "login.html";
      });
    });
  }

  /* ── Auth guard ───────────────────────────────────────── */
  function init() {
    if (typeof firebase === "undefined") { updateDisplay(); return; }
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      updateDisplay();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
