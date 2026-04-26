/* ==========================================================
   Hbit — State of Mind — Firestore moodLogs, 5-band UI
   FUTURE: Video suggestions based on mood band (see weekly insight card)
   FUTURE: Article suggestions from emotion tag → static map
   FUTURE: HBIT.sleep.openBreathingModal() shortcut from this page
   ========================================================== */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});

  const KEY_HIST = "life_mood7_history";
  const KEY_TODAY = "life_mood7_today";
  const SS_EMO = "md-emo-more";
  const SS_IMP = "md-imp-more";

  const $ = (id) => document.getElementById(id);
  const qs = (sel, r) => (r || document).querySelector(sel);
  const qsa = (sel, r) => Array.from((r || document).querySelectorAll(sel));

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const num = (v, f = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  /** Local calendar add (days can be negative). dateStr = YYYY-MM-DD */
  function addDaysKey(dateStr, deltaDays) {
    const [y, m, day] = dateStr.split("-").map(Number);
    const d = new Date(y, m - 1, day);
    d.setDate(d.getDate() + deltaDays);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function getLang() {
    return HBIT.i18n?.getLang?.() === "fr" ? "fr" : "en";
  }

  function t(key, fb, params) {
    try {
      const v = HBIT.i18n?.t?.(key, fb, params);
      return v != null && v !== key ? v : fb;
    } catch (_) {
      let s = fb != null ? fb : key;
      if (params && typeof params === "object" && typeof s === "string") {
        s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? String(params[k]) : `{${k}}`);
      }
      return s;
    }
  }

  function scaleLabel(v, lang) {
    const bands = lang === "fr"
      ? ["Tres desagreable", "Desagreable", "Neutre", "Agreable", "Tres agreable"]
      : ["Very unpleasant", "Unpleasant", "Neutral", "Pleasant", "Very pleasant"];
    return bands[clamp(Math.round(v), 1, 5) - 1] || "—";
  }

  function emotionSets(lang) {
    const EN = {
      verybad: { base: ["Overwhelmed", "Anxious", "Angry", "Sad", "Hopeless", "Tired", "Stressed"], more: ["Empty", "Burned out", "Panicked", "Ashamed", "Numb", "Defeated", "Confused", "Guilty", "Scared", "Irritable", "Lonely"] },
      bad: { base: ["Unmotivated", "Irritated", "Worried", "Drained", "Frustrated", "Insecure", "Down"], more: ["Bored", "Restless", "Sensitive", "Disappointed", "Uncertain", "Stuck", "Annoyed", "Distracted", "Tense", "Undervalued", "Disconnected"] },
      slight: { base: ["Okay", "Meh", "Calm", "Reserved", "Low energy", "Quiet", "Neutral"], more: ["Stable", "Chill", "Content", "Thoughtful", "Observing", "Routine", "Balanced", "Patient", "Grounded"] },
      good: { base: ["Calm", "Hopeful", "Content", "Grateful", "Motivated", "Clear", "Connected"], more: ["Joyful", "Excited", "Confident", "Energized", "Proud", "Inspired", "Loved", "Creative", "Peaceful"] },
      other: { base: ["Other", "Mixed", "Unsure", "Complicated", "Different", "Unique", "Varied"], more: ["Bittersweet", "Changing", "In between", "Hard to name", "Uneven", "Blurred", "Complex"] }
    };
    const FR = {
      verybad: { base: ["Débordé", "Anxieux", "En colère", "Triste", "Sans espoir", "Fatigué", "Stressé"], more: ["Vide", "Épuisé mentalement", "Paniqué", "Honteux", "Engourdi", "Abattu", "Confus", "Coupable", "Effrayé", "Irritable", "Seul"] },
      bad: { base: ["Démotivé", "Irrité", "Inquiet", "Drainé", "Frustré", "Insécure", "Morne"], more: ["Ennuyé", "Agité", "Sensible", "Déçu", "Incertain", "Bloqué", "Gosser", "Distrait", "Tendu", "Sous-estimé", "Déconnecté"] },
      slight: { base: ["OK", "Bof", "Calme", "Réservé", "Faible énergie", "Discret", "Neutre"], more: ["Stable", "Tranquille", "Satisfait", "Pensif", "Observateur", "Routiné", "Équilibré", "Patient", "Ancré"] },
      good: { base: ["Confiant", "Motivé", "Plein d'espoir", "Reconnaissant", "Énergique", "Fier", "Détendu"], more: ["Optimiste", "Lucide", "Productif", "Sociable", "Joueur", "Présent", "Discipliné", "Connecté", "Reposé", "Courageux", "Créatif"] },
      other: { base: ["Autre", "Mitigé", "Incertain", "Compliqué", "Différent", "Unique", "Varié"], more: ["Doux-amer", "Changeant", "Entre deux", "Difficile à nommer", "Inégal", "Flou", "Complexe"] }
    };
    return lang === "fr" ? FR : EN;
  }

  function impactSets(lang) {
    const EN = {
      base: ["Sleep", "Work/School", "Training", "Relationships", "Money", "Health"],
      more: ["Diet", "Family", "Friends", "Weather", "Travel", "Social media", "Deadlines", "Injury", "Recovery", "Motivation", "Confidence", "Time management", "Habits", "Stress"]
    };
    const FR = {
      base: ["Sommeil", "Travail/École", "Entraînement", "Relations", "Argent", "Santé"],
      more: ["Alimentation", "Famille", "Amis", "Météo", "Voyage", "Réseaux sociaux", "Deadlines", "Blessure", "Récupération", "Motivation", "Confiance", "Gestion du temps", "Habitudes", "Stress"]
    };
    return lang === "fr" ? FR : EN;
  }

  function bandKeyFromMood(band) {
    const b = clamp(Math.round(num(band, 3)), 1, 5);
    if (b === 1) return "verybad";
    if (b === 2) return "bad";
    if (b === 3) return "slight";
    if (b === 4) return "good";
    return "good";
  }

  function moodLabel(band, lang) {
    return t(`mood.band.${clamp(Math.round(band), 1, 5)}`, scaleLabel(band, lang));
  }

  function inferMoodBand(log) {
    if (!log) return 3;
    if (log.mood != null && log.mood !== "") return clamp(Math.round(num(log.mood, 3)), 1, 5);
    const s = num(log.score, 0);
    if (s > 0) return clamp(Math.round(s / 2), 1, 5);
    return 3;
  }

  function tenToSlider(v) {
    if (v == null) return 3;
    return clamp(Math.round(num(v, 6) / 2), 1, 5);
  }

  function sliderToTen(v) {
    return clamp(Math.round(num(v, 3)) * 2, 2, 10);
  }

  function overallScore(st) {
    const raw = (num(st.mood, 3) + num(st.energy, 3) + num(st.focus, 3) + num(st.social, 3)) / 4;
    const adj = raw - ((num(st.stress, 3) - 3) * 0.4);
    return clamp(Math.round(adj * 10) / 10, 1, 5);
  }

  const state = {
    uid: null,
    todayLog: null,
    recentLogs: [],
    heatmapLogs: [],
    heatmapMonth: todayKey().slice(0, 7),
    selectedBand: null,
    depthOpen: false,
    depthBand: 3,
    streak: 0,
    weekInsight: null,
    editingToday: false,
    editingDateKey: null,
    emotionPick: "",
    impactPick: "",
    sliderTouched: { energy: false, stress: false, focus: false, social: false },
    eventsBound: false,
    moodDataReady: false,
    wizardMood: 3,
    wizardEmotion: "",
  };

  async function migrateLegacyData() {
    try {
      const raw = localStorage.getItem(KEY_HIST);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return;
      const norm = (v) =>
        Math.max(1, Math.min(5, Math.round(((Math.max(1, Math.min(7, v || 3)) - 1) * 4) / 6 + 1)));
      for (const entry of arr) {
        const dk = entry.dateKey || (entry.ts ? new Date(entry.ts).toISOString().slice(0, 10) : "");
        if (!dk) continue;
        await HBIT.db.moodLogs.set(dk, {
          mood: norm(entry.mood),
          stress: norm(entry.stress) * 2,
          energy: norm(entry.energy) * 2,
          focus: norm(entry.focus) * 2,
          social: norm(entry.social) * 2,
          score: entry.overall != null ? Math.round(clamp(num(entry.overall, 3), 1, 5) * 2) : norm(entry.mood) * 2,
          emotion: entry.emotion || "",
          impact: entry.impact || "",
          impactQ: entry.impactQ || "",
          triggerQ: entry.triggerQ || "",
          actionQ: entry.actionQ || "",
          notes: entry.note || "",
          tags: []
        });
      }
      localStorage.removeItem(KEY_HIST);
      localStorage.removeItem(KEY_TODAY);
    } catch (e) {
      /* silent */
    }
  }

  async function loadTodayLog() {
    return HBIT.db.moodLogs.get(todayKey());
  }

  async function loadRecentLogs() {
    return HBIT.db.moodLogs.recent(7);
  }

  function logDateKey(log) {
    return log.date || log.id || "";
  }

  function calcStreak(logs) {
    if (!logs.length) return 0;
    let streak = 0;
    let expected = todayKey();
    const byDate = new Map(logs.map((l) => [logDateKey(l), l]));
    while (byDate.has(expected)) {
      streak++;
      expected = addDaysKey(expected, -1);
    }
    return streak;
  }

  function formatLogTime(log) {
    const ts = log.createdAt;
    let d = null;
    if (ts && typeof ts.toDate === "function") d = ts.toDate();
    else if (ts && typeof ts.seconds === "number") d = new Date(ts.seconds * 1000);
    if (!d || isNaN(d.getTime())) d = new Date();
    const locale = getLang() === "fr" ? "fr-FR" : "en-US";
    return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }

  function formatEntryDate(dateStr) {
    const today = todayKey();
    const yest = addDaysKey(today, -1);
    const locale = getLang() === "fr" ? "fr-FR" : "en-US";
    if (dateStr === today) return t("mood.today", "Today");
    if (dateStr === yest) return t("mood.yesterday", "Yesterday");
    const [Y, M, D] = dateStr.split("-").map(Number);
    const dt = new Date(Y, M - 1, D);
    const now = new Date();
    const diffDays = (now - dt) / (864e5);
    if (diffDays < 7) {
      return dt.toLocaleDateString(locale, { weekday: "long" });
    }
    return dt.toLocaleDateString(locale, { month: "short", day: "numeric" });
  }

  function topEmotionFromLogs(logs) {
    const freq = new Map();
    for (const l of logs) {
      const e = l.emotion;
      if (!e) continue;
      freq.set(e, (freq.get(e) || 0) + 1);
    }
    let best = null;
    let bestN = 0;
    for (const [k, n] of freq) {
      if (n > bestN) {
        best = k;
        bestN = n;
      }
    }
    return best;
  }

  function generateWeeklyInsight(logs) {
    if (logs.length < 3) return null;
    const lang = getLang();
    const avg = logs.reduce((s, l) => s + inferMoodBand(l), 0) / logs.length;
    const avgBand = clamp(Math.round(avg), 1, 5);
    const best = logs.reduce((a, b) => (inferMoodBand(b) > inferMoodBand(a) ? b : a), logs[0]);
    const topEmotion = topEmotionFromLogs(logs);
    const locale = lang === "fr" ? "fr-FR" : "en-US";
    const bestDate = logDateKey(best);
    const dayName = new Date(bestDate + "T12:00:00").toLocaleDateString(locale, { weekday: "long" });
    const label = moodLabel(avgBand, lang);

    const poolEn = [
      avg >= 4 ? `A strong week — you averaged "${label}" across ${logs.length} days.` : null,
      avg <= 2 ? `A tough week. You logged "${label}" on average — be kind to yourself.` : null,
      topEmotion ? `Your most common feeling this week was "${topEmotion}".` : null,
      best ? `${dayName} was your best day this week.` : null
    ].filter(Boolean);

    const poolFr = [
      avg >= 4 ? `Belle semaine — tu as moyenné "${label}" sur ${logs.length} jours.` : null,
      avg <= 2 ? `Semaine difficile. Tu as moyenné "${label}" — sois indulgent avec toi-même.` : null,
      topEmotion ? `Ton ressenti le plus fréquent cette semaine : "${topEmotion}".` : null,
      best ? `${dayName} était ta meilleure journée de la semaine.` : null
    ].filter(Boolean);

    const pool = lang === "fr" ? poolFr : poolEn;
    return pool[0] || null;
  }

  function applyMoodTint(band) {
    const page = $("moodPage");
    const main = qs(".md-main");
    if (!page) return;
    if (band != null && band >= 1 && band <= 5) {
      page.setAttribute("data-mood-band", String(band));
      main?.classList.add("tinted");
    } else {
      page.removeAttribute("data-mood-band");
      main?.classList.remove("tinted");
    }
  }

  function showToast(msg, opts = 2200) {
    const type = typeof opts === "string" ? opts : "success";
    const ms = typeof opts === "number" ? opts : 2200;
    if (HBIT.toast?.[type]) {
      HBIT.toast[type](msg, { duration: ms });
      return;
    }
    if (HBIT.toast?.show) {
      HBIT.toast.show(msg, type, { duration: ms });
      return;
    }
    const el = $("mdToast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("visible"), ms);
  }

  async function saveMoodQuick(band) {
    const b = clamp(Math.round(band), 1, 5);
    await HBIT.db.moodLogs.set(todayKey(), {
      mood: b,
      score: b * 2,
      energy: null,
      stress: null,
      focus: null,
      social: null,
      emotion: "",
      impact: "",
      impactQ: "",
      triggerQ: "",
      actionQ: "",
      notes: "",
      tags: []
    });
  }

  async function saveMoodFull(data, dateKey) {
    const dk = dateKey || todayKey();
    const payload = {
      mood: data.mood,
      score: data.mood * 2,
      energy: data.energy,
      stress: data.stress,
      focus: data.focus,
      social: data.social,
      emotion: data.emotion,
      impact: data.impact,
      impactQ: data.impactQ,
      triggerQ: data.triggerQ,
      actionQ: data.actionQ,
      notes: data.notes,
      tags: data.tags
    };
    await HBIT.db.moodLogs.set(dk, payload);
  }

  function readDepthFormData() {
    const moodBand = clamp(
      Math.round(state.depthBand || state.selectedBand || inferMoodBand(state.todayLog) || 3),
      1,
      5
    );
    const g = (id) => num($(id)?.value, 3);
    return {
      mood: moodBand,
      energy: state.sliderTouched.energy ? sliderToTen(g("mdRngEnergy")) : null,
      stress: state.sliderTouched.stress ? sliderToTen(g("mdRngStress")) : null,
      focus: state.sliderTouched.focus ? sliderToTen(g("mdRngFocus")) : null,
      social: state.sliderTouched.social ? sliderToTen(g("mdRngSocial")) : null,
      emotion: state.emotionPick || "",
      impact: state.impactPick || "",
      impactQ: $("mdImpactQ")?.value?.trim() || "",
      triggerQ: $("mdTriggerQ")?.value?.trim() || "",
      actionQ: $("mdActionQ")?.value?.trim() || "",
      notes: $("mdNote")?.value?.trim() || "",
      tags: [state.emotionPick, state.impactPick].filter(Boolean)
    };
  }

  function updateSubdimCaps() {
    const lang = getLang();
    [["mdRngEnergy", "mdCapEnergy"], ["mdRngStress", "mdCapStress"], ["mdRngFocus", "mdCapFocus"], ["mdRngSocial", "mdCapSocial"]].forEach(([rid, cid]) => {
      const r = $(rid);
      const c = $(cid);
      if (!r || !c) return;
      const v = clamp(num(r.value, 3), 1, 5);
      c.textContent = scaleLabel(v, lang);
    });
  }

  function renderDepthBands() {
    const wrap = $("mdDepthBands");
    if (!wrap) return;
    const need = state.editingDateKey && state.editingDateKey !== todayKey();
    if (!need) {
      wrap.classList.add("md-depth-bands--hidden");
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    wrap.classList.remove("md-depth-bands--hidden");
    wrap.hidden = false;
    const lang = getLang();
    wrap.innerHTML = [1, 2, 3, 4, 5]
      .map((b) => {
        const active = state.depthBand === b ? " active" : "";
        return `<button type="button" class="md-depth-band${active}" data-db="${b}">${moodLabel(b, lang)}</button>`;
      })
      .join("");
    wrap.querySelectorAll(".md-depth-band").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.depthBand = num(btn.getAttribute("data-db"), 3);
        renderDepthBands();
        renderEmotionChips(state.depthBand);
      });
    });
  }

  function renderEmotionChips(band) {
    const box = $("mdEmotionChips");
    if (!box) return;
    const lang = getLang();
    const key = bandKeyFromMood(band);
    const set = emotionSets(lang)[key];
    const expanded = sessionStorage.getItem(SS_EMO) === "1";
    const labels = expanded ? [...set.base, ...set.more] : set.base;
    box.innerHTML = "";
    labels.forEach((label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "md-chip" + (state.emotionPick === label ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        state.emotionPick = state.emotionPick === label ? "" : label;
        renderEmotionChips(band);
      });
      box.appendChild(b);
    });
    const moreBtn = $("mdEmoMore");
    if (moreBtn) {
      moreBtn.textContent = expanded ? t("mood.showLess", "Show less") : t("mood.showMore", "Show more");
      moreBtn.onclick = () => {
        sessionStorage.setItem(SS_EMO, expanded ? "" : "1");
        renderEmotionChips(band);
      };
    }
  }

  function renderImpactChips() {
    const box = $("mdImpactChips");
    if (!box) return;
    const lang = getLang();
    const set = impactSets(lang);
    const expanded = sessionStorage.getItem(SS_IMP) === "1";
    const labels = expanded ? [...set.base, ...set.more] : set.base;
    box.innerHTML = "";
    labels.forEach((label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "md-chip" + (state.impactPick === label ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        state.impactPick = state.impactPick === label ? "" : label;
        renderImpactChips();
      });
      box.appendChild(b);
    });
    const moreBtn = $("mdImpMore");
    if (moreBtn) {
      moreBtn.textContent = expanded ? t("mood.showLess", "Show less") : t("mood.showMore", "Show more");
      moreBtn.onclick = () => {
        sessionStorage.setItem(SS_IMP, expanded ? "" : "1");
        renderImpactChips();
      };
    }
  }

  function openDepthSection(prefill) {
    const depth = $("mdDepth");
    if (!depth) return;
    state.depthOpen = true;
    depth.classList.add("open");
    depth.setAttribute("aria-hidden", "false");

    state.sliderTouched = { energy: false, stress: false, focus: false, social: false };
    const band = inferMoodBand(prefill) || state.selectedBand || 3;
    state.depthBand = clamp(Math.round(band), 1, 5);

    const setR = (id, val, touched) => {
      const el = $(id);
      if (el) el.value = String(val);
      return touched;
    };

    if (prefill) {
      setR("mdRngEnergy", prefill.energy != null ? tenToSlider(prefill.energy) : 3, false);
      setR("mdRngStress", prefill.stress != null ? tenToSlider(prefill.stress) : 3, false);
      setR("mdRngFocus", prefill.focus != null ? tenToSlider(prefill.focus) : 3, false);
      setR("mdRngSocial", prefill.social != null ? tenToSlider(prefill.social) : 3, false);
      if (prefill.energy != null) state.sliderTouched.energy = true;
      if (prefill.stress != null) state.sliderTouched.stress = true;
      if (prefill.focus != null) state.sliderTouched.focus = true;
      if (prefill.social != null) state.sliderTouched.social = true;
      state.emotionPick = prefill.emotion || "";
      state.impactPick = prefill.impact || "";
      if ($("mdImpactQ")) $("mdImpactQ").value = prefill.impactQ || "";
      if ($("mdTriggerQ")) $("mdTriggerQ").value = prefill.triggerQ || "";
      if ($("mdActionQ")) $("mdActionQ").value = prefill.actionQ || "";
      if ($("mdNote")) $("mdNote").value = prefill.notes || "";
    } else {
      ["mdRngEnergy", "mdRngStress", "mdRngFocus", "mdRngSocial"].forEach((id) => {
        const el = $(id);
        if (el) el.value = "3";
      });
      state.emotionPick = "";
      state.impactPick = "";
      ["mdImpactQ", "mdTriggerQ", "mdActionQ", "mdNote"].forEach((id) => {
        const el = $(id);
        if (el) el.value = "";
      });
    }

    updateSubdimCaps();
    renderDepthBands();
    renderEmotionChips(state.depthBand);
    renderImpactChips();
  }

  function closeDepthSection() {
    const depth = $("mdDepth");
    if (!depth) return;
    state.depthOpen = false;
    depth.classList.remove("open");
    depth.setAttribute("aria-hidden", "true");
    state.editingDateKey = null;
    state.editingToday = false;
    renderDepthBands();
  }

  function renderSelector() {
    const cards = qsa(".md-band-card");
    const band =
      state.selectedBand != null
        ? state.selectedBand
        : state.todayLog
          ? inferMoodBand(state.todayLog)
          : null;
    cards.forEach((c) => {
      const b = num(c.getAttribute("data-band"), 0);
      const sel = band != null && b === band;
      c.classList.toggle("selected", sel);
      c.setAttribute("aria-selected", sel ? "true" : "false");
    });
    const saveBtn = $("mdSaveQuick");
    if (saveBtn) saveBtn.disabled = state.selectedBand == null;
  }

  function selectBand(band) {
    state.selectedBand = clamp(Math.round(band), 1, 5);
    applyMoodTint(state.selectedBand);
    renderSelector();
    const actions = $("mdSelectorActions");
    if (actions) {
      actions.classList.add("md-selector-actions--hidden");
      actions.hidden = true;
    }
    const saveBtn = $("mdSaveQuick");
    if (saveBtn) saveBtn.disabled = false;
    openDepthSection({
      mood: state.selectedBand,
      energy: null,
      stress: null,
      focus: null,
      social: null,
      emotion: "",
      impact: "",
      impactQ: "",
      triggerQ: "",
      actionQ: "",
      notes: ""
    });
  }

  function renderTodaySummary(log) {
    const el = $("mdTodaySummary");
    if (!el) return;
    const b = inferMoodBand(log);
    const lang = getLang();
    const time = formatLogTime(log);
    const logged = t("mood.loggedAt", "Logged at {time}", { time });
    el.innerHTML = `
      <span class="md-today-summary-swatch" style="--entry-band:var(--md-band-${b})"></span>
      <div class="md-today-summary-text">
        <span class="md-today-summary-label">${moodLabel(b, lang)}</span>
        <span class="md-today-summary-time">${logged}</span>
      </div>`;
    el.classList.remove("md-today-summary--hidden");
    el.hidden = false;
  }

  function hideTodaySummary() {
    const el = $("mdTodaySummary");
    if (el) {
      el.classList.add("md-today-summary--hidden");
      el.hidden = true;
      el.innerHTML = "";
    }
  }

  function renderStreak(logs) {
    const el = $("mdStreak");
    if (!el) return;
    if (!state.moodDataReady) {
      el.classList.remove("md-streak--hidden");
      el.hidden = false;
      el.classList.add("skeleton");
      el.textContent = "\u00a0";
      return;
    }
    el.classList.remove("skeleton");
    const n = calcStreak(logs);
    state.streak = n;
    if (n < 2) {
      el.classList.add("md-streak--hidden");
      el.hidden = true;
      return;
    }
    el.classList.remove("md-streak--hidden");
    el.hidden = false;
    const text = t("mood.streak", "{n}-day streak", { n });
    el.textContent = "🔥 " + text;
  }

  function renderWeeklyInsight(logs) {
    const textEl = $("mdInsightText");
    const labelsEl = $("mdMiniBarLabels");
    const barsEl = $("mdMiniBars");
    if (!textEl || !barsEl) return;

    if (!state.moodDataReady) {
      textEl.classList.add("skeleton");
      textEl.textContent = "\u00a0";
      if (labelsEl) labelsEl.innerHTML = "";
      barsEl.innerHTML = "";
      barsEl.classList.add("skeleton");
      barsEl.style.minHeight = "48px";
      return;
    }
    textEl.classList.remove("skeleton");
    barsEl.classList.remove("skeleton");
    barsEl.style.minHeight = "";

    if (logs.length < 3) {
      textEl.textContent = t("mood.insightNeedMore", "Log a few more days for insights.");
    } else {
      textEl.textContent = generateWeeklyInsight(logs) || t("mood.insightNeedMore", "Log a few more days for insights.");
    }

    const locale = getLang() === "fr" ? "fr-FR" : "en-US";
    const today = todayKey();
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(addDaysKey(today, -i));
    const map = new Map(logs.map((l) => [logDateKey(l), l]));

    if (labelsEl) {
      labelsEl.innerHTML = days
        .map((d) => {
          const dt = new Date(d + "T12:00:00");
          const short = dt.toLocaleDateString(locale, { weekday: "short" });
          return `<span>${short}</span>`;
        })
        .join("");
    }

    barsEl.innerHTML = days
      .map((d) => {
        const log = map.get(d);
        const b = log ? inferMoodBand(log) : null;
        const h = b ? 12 + b * 10 : 12;
        if (!b) return `<div class="md-mini-bar empty" style="height:${h}px"></div>`;
        return `<div class="md-mini-bar" style="--md-color:var(--md-band-${b});height:${h}px;background:var(--md-band-${b})"></div>`;
      })
      .join("");
  }

  function renderEntryCards(logs) {
    const box = $("mdEntries");
    const empty = $("mdEntriesEmpty");
    if (!box) return;
    box.innerHTML = "";
    const lang = getLang();
    if (!logs.length) {
      empty?.classList.remove("md-entries-empty--hidden");
      if (empty) empty.hidden = false;
      return;
    }
    empty?.classList.add("md-entries-empty--hidden");
    if (empty) empty.hidden = true;

    logs.slice(0, 7).forEach((log) => {
      const dk = logDateKey(log);
      const b = inferMoodBand(log);
      const card = document.createElement("article");
      card.className = "hbit-card md-entry-card";
      card.innerHTML = `
        <div class="md-entry-swatch" style="--entry-band:var(--md-band-${b})"></div>
        <div class="md-entry-body">
          <div class="md-entry-top">
            <span class="md-entry-label">${moodLabel(b, lang)}</span>
            <span class="md-entry-date">${formatEntryDate(dk)}</span>
          </div>
          <div class="md-entry-chips"></div>
          <div class="md-entry-note"></div>
        </div>
        <button type="button" class="md-entry-edit" data-date="${dk}">${t("mood.edit", "Edit")}</button>`;
      const chips = card.querySelector(".md-entry-chips");
      const noteEl = card.querySelector(".md-entry-note");
      if (log.emotion) {
        const s = document.createElement("span");
        s.className = "md-entry-chip";
        s.textContent = log.emotion;
        chips.appendChild(s);
      }
      if (log.impact) {
        const s = document.createElement("span");
        s.className = "md-entry-chip";
        s.textContent = log.impact;
        chips.appendChild(s);
      }
      if (log.notes) {
        noteEl.textContent = log.notes;
      } else {
        noteEl.remove();
      }
      box.appendChild(card);
    });
  }

  async function loadHeatmapLogs() {
    const month = state.heatmapMonth || todayKey().slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const start = `${month}-01`;
    const end = `${month}-${pad2(last)}`;
    try {
      return await HBIT.db.moodLogs.range(start, end);
    } catch (_) {
      return [];
    }
  }

  function renderMoodHeatmap(logs) {
    const grid = $("mdMoodHeatmap");
    const labelEl = $("mdHeatmapMonthLabel");
    if (!grid) return;
    const month = state.heatmapMonth || todayKey().slice(0, 7);
    const [year, monthNum] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const first = new Date(year, monthNum - 1, 1);
    const days = [];
    for (let i = 1; i <= lastDay; i++) days.push(`${month}-${pad2(i)}`);
    const map = new Map((logs || []).map((l) => [logDateKey(l), l]));
    const locale = getLang() === "fr" ? "fr-FR" : "en-US";
    const startPad = (first.getDay() + 6) % 7;

    const blanks = Array.from({ length: startPad }, () => `<span class="md-heatmap-cell is-empty" aria-hidden="true"></span>`);
    grid.innerHTML = blanks.join("") + days.map((dk) => {
      const log = map.get(dk);
      const band = log ? inferMoodBand(log) : "";
      const date = new Date(dk + "T12:00:00");
      const label = log
        ? `${date.toLocaleDateString(locale, { month: "short", day: "numeric" })}: ${moodLabel(band, getLang())}`
        : `${date.toLocaleDateString(locale, { month: "short", day: "numeric" })}: ${t("mood.history.empty", "No entry")}`;
      return `<button type="button" class="md-heatmap-cell" data-date="${dk}" ${band ? `data-band="${band}"` : ""} aria-label="${label}" title="${label}"></button>`;
    }).join("");

    grid.querySelectorAll(".md-heatmap-cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        const dk = cell.dataset.date;
        const log = map.get(dk);
        if (log) {
          state.editingDateKey = dk;
          state.editingToday = dk === todayKey();
          openMoodWizard(log);
        } else if (dk === todayKey()) {
          openMoodWizard();
        }
      });
    });

    if (labelEl) {
      labelEl.textContent = first.toLocaleDateString(locale, { month: "long", year: "numeric" });
    }
  }

  function resourceCards() {
    const low = state.todayLog ? inferMoodBand(state.todayLog) <= 2 : false;
    return [
      {
        type: t("mood.resources.article", "Article"),
        title: low ? t("mood.resources.nhsLow", "Small steps for tough days") : t("mood.resources.nhs", "5 steps to mental wellbeing"),
        copy: low ? t("mood.resources.lowCopy", "Gentle actions when your mood feels heavy.") : t("mood.resources.nhsCopy", "Simple habits for connection, movement, learning, giving, and attention."),
        href: "https://www.nhs.uk/conditions/stress-anxiety-depression/improve-mental-wellbeing/",
      },
      {
        type: t("mood.resources.video", "YouTube"),
        title: low ? t("mood.resources.videoLow", "Guided breathing for anxiety") : t("mood.resources.videoGood", "Quick mood reset"),
        copy: t("mood.resources.videoCopy", "A short guided video for your current state."),
        href: low
          ? "https://www.youtube.com/results?search_query=5+minute+guided+breathing+exercise+for+anxiety"
          : "https://www.youtube.com/results?search_query=5+minute+positive+mood+guided+meditation",
      },
      {
        type: t("mood.resources.action", "Action"),
        title: t("mood.resources.focus", "Switch to Focus"),
        copy: t("mood.resources.focusCopy", "Use a breathing timer or a short focus block."),
        href: "focus.html",
      },
    ];
  }

  function renderMoodResources() {
    const box = $("mdResourceGrid");
    if (!box) return;
    const cards = resourceCards();
    const cardHtml = (r) => `
      <a class="hbit-card md-resource-card" href="${r.href}" ${r.href.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>
        <span class="md-resource-type">${r.type}</span>
        <span>
          <h3 class="md-resource-title">${r.title}</h3>
          <p class="md-resource-copy">${r.copy}</p>
        </span>
      </a>`;
    box.innerHTML = `
      ${cardHtml(cards[0])}
      <details class="md-resource-more">
        <summary>${t("mood.resources.more", "More resources")}</summary>
        <div class="md-resource-more-body">${cards.slice(1).map(cardHtml).join("")}</div>
      </details>`;
  }

  function updateMoodWizardColor() {
    const band = clamp(Math.round(num($("mdMoodSlider")?.value, state.wizardMood || 3)), 1, 5);
    state.wizardMood = band;
    applyMoodTint(band);
    const label = $("mdWizardMoodLabel");
    if (label) label.textContent = moodLabel(band, getLang());
    renderWizardEmotionChips();
  }

  function renderWizardEmotionChips() {
    const box = $("mdWizardEmotionChips");
    if (!box) return;
    const set = emotionSets(getLang())[bandKeyFromMood(state.wizardMood)] || emotionSets(getLang()).slight;
    const labels = set.base;
    box.innerHTML = "";
    labels.forEach((label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "md-chip" + (state.wizardEmotion === label ? " active" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => {
        state.wizardEmotion = state.wizardEmotion === label ? "" : label;
        renderWizardEmotionChips();
      });
      box.appendChild(btn);
    });
  }

  function openMoodWizard(prefill) {
    const ov = $("mdWizardOverlay");
    if (!ov) return;
    const band = prefill ? inferMoodBand(prefill) : (state.todayLog ? inferMoodBand(state.todayLog) : 3);
    state.wizardMood = band;
    state.wizardEmotion = prefill?.emotion || "";
    const slider = $("mdMoodSlider");
    if (slider) slider.value = String(band);
    if ($("mdWizardNote")) $("mdWizardNote").value = prefill?.notes || "";
    updateMoodWizardColor();
    if (HBIT.components?.openSheet) HBIT.components.openSheet(ov);
    else {
      ov.hidden = false;
      ov.setAttribute("aria-hidden", "false");
    }
    ov.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeMoodWizard() {
    const ov = $("mdWizardOverlay");
    if (!ov) return;
    ov.classList.remove("open");
    if (HBIT.components?.closeSheet) HBIT.components.closeSheet(ov);
    else {
      ov.hidden = true;
      ov.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
    state.editingDateKey = null;
    state.editingToday = false;
  }

  function showSaveBurst() {
    const el = $("mdSaveBurst");
    if (!el) return;
    el.hidden = false;
    clearTimeout(showSaveBurst._t);
    showSaveBurst._t = setTimeout(() => {
      el.hidden = true;
    }, 900);
  }

  async function saveMoodWizard() {
    const data = {
      mood: clamp(Math.round(num($("mdMoodSlider")?.value, 3)), 1, 5),
      energy: null,
      stress: null,
      focus: null,
      social: null,
      emotion: state.wizardEmotion || "",
      impact: "",
      impactQ: "",
      triggerQ: "",
      actionQ: "",
      notes: $("mdWizardNote")?.value?.trim() || "",
      tags: [state.wizardEmotion].filter(Boolean),
    };
    const dk = state.editingDateKey || todayKey();
    await saveMoodFull(data, dk);
    state.todayLog = await loadTodayLog();
    state.recentLogs = await loadRecentLogs();
    state.heatmapLogs = await loadHeatmapLogs();
    closeMoodWizard();
    renderAll();
    showSaveBurst();
    showToast(t("mood.savedFullToast", "Saved ✓"));
    window.dispatchEvent(new CustomEvent("hbit:data-changed", { detail: { area: "mood" } }));
  }

  function updateDateDisplay() {
    const el = $("moodDate");
    if (!el) return;
    const locale = getLang() === "fr" ? "fr-FR" : "en-US";
    el.textContent = new Date().toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  }

  function handleSleepBanner() {
    const banner = $("mdSleepBanner");
    const textEl = $("mdSleepText");
    if (!banner || !textEl) return;
    const sum = HBIT.sleep?.lastNightSummary;
    if (!sum || sum.isBelowTarget !== true) {
      banner.classList.add("md-sleep-banner--hidden");
      banner.hidden = true;
      return;
    }
    const dismissKey = `md-sleep-banner-dismissed-${todayKey()}`;
    if (sessionStorage.getItem(dismissKey) === "1") {
      banner.classList.add("md-sleep-banner--hidden");
      banner.hidden = true;
      return;
    }
    const hours = sum.displayHours || sum.hoursLabel || sum.hoursFormatted || "—";
    textEl.innerHTML = t("mood.sleepBanner", "Last night you slept {hours}.", {
      hours: `<strong>${hours}</strong>`,
    });
    banner.classList.remove("md-sleep-banner--hidden");
    banner.hidden = false;
  }

  function renderAll() {
    updateDateDisplay();
    HBIT.i18n?.apply?.(document);

    const hasToday = !!state.todayLog;
    const historyEdit = state.editingDateKey && state.editingDateKey !== todayKey();
    const collapsed = hasToday && !state.editingToday && state.editingDateKey == null;

    const wrap = $("mdSelectorWrap");
    const actions = $("mdSelectorActions");
    const editRow = $("mdEditRow");

    if (collapsed) {
      wrap?.classList.add("md-selector-wrap--hidden");
      if (wrap) wrap.hidden = true;
      actions?.classList.add("md-selector-actions--hidden");
      if (actions) actions.hidden = true;
      editRow?.classList.remove("md-edit-row--hidden");
      if (editRow) editRow.hidden = false;
      renderTodaySummary(state.todayLog);
      state.selectedBand = null;
      applyMoodTint(inferMoodBand(state.todayLog));
      renderSelector();
    } else {
      hideTodaySummary();
      if (historyEdit) {
        wrap?.classList.add("md-selector-wrap--hidden");
        if (wrap) wrap.hidden = true;
        editRow?.classList.add("md-edit-row--hidden");
        if (editRow) editRow.hidden = true;
      } else {
        wrap?.classList.remove("md-selector-wrap--hidden");
        if (wrap) wrap.hidden = false;
        editRow?.classList.add("md-edit-row--hidden");
        if (editRow) editRow.hidden = true;
      }
      if (!state.depthOpen && !state.selectedBand && hasToday && !historyEdit) {
        state.selectedBand = inferMoodBand(state.todayLog);
      }
      if (state.selectedBand != null) applyMoodTint(state.selectedBand);
      else if (!hasToday) applyMoodTint(null);
      else applyMoodTint(inferMoodBand(state.todayLog));
      renderSelector();
      if (historyEdit) {
        actions?.classList.add("md-selector-actions--hidden");
        if (actions) actions.hidden = true;
      } else if (state.selectedBand != null) {
        actions?.classList.remove("md-selector-actions--hidden");
        if (actions) actions.hidden = false;
      } else if (!hasToday) {
        actions?.classList.add("md-selector-actions--hidden");
        if (actions) actions.hidden = true;
      } else {
        actions?.classList.add("md-selector-actions--hidden");
        if (actions) actions.hidden = true;
      }
    }

    renderStreak(state.recentLogs);
    renderWeeklyInsight(state.recentLogs);
    renderEntryCards(state.recentLogs);
    renderMoodHeatmap(state.heatmapLogs);
    renderMoodResources();

    HBIT.mood = HBIT.mood || {};
    HBIT.mood.todaySummary = {
      band: state.todayLog ? inferMoodBand(state.todayLog) : null,
      label: state.todayLog ? moodLabel(inferMoodBand(state.todayLog), getLang()) : null,
      logged: !!state.todayLog
    };
  }

  function bindEvents() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    qsa(".md-band-card").forEach((card) => {
      card.addEventListener("click", () => {
        const b = num(card.getAttribute("data-band"), 3);
        selectBand(b);
      });
    });

    [["mdRngEnergy", "energy"], ["mdRngStress", "stress"], ["mdRngFocus", "focus"], ["mdRngSocial", "social"]].forEach(([id, key]) => {
      $(id)?.addEventListener("input", () => {
        state.sliderTouched[key] = true;
        updateSubdimCaps();
      });
    });

    $("mdSaveQuick")?.addEventListener("click", async () => {
      if (state.selectedBand == null) return;
      try {
        await saveMoodQuick(state.selectedBand);
        state.todayLog = await loadTodayLog();
        state.recentLogs = await loadRecentLogs();
        state.editingToday = false;
        state.selectedBand = null;
        state.depthOpen = false;
        $("mdDepth")?.classList.remove("open");
        $("mdDepth")?.setAttribute("aria-hidden", "true");
        renderAll();
        showToast(t("mood.savedToast", "Mood saved ✓"));
        window.dispatchEvent(new CustomEvent("hbit:data-changed", { detail: { area: "mood" } }));
      } catch (e) {
        /* silent */
        showToast(t("mood.saveError", "Could not save. Check your connection."), "error");
      }
    });

    $("mdOpenDepth")?.addEventListener("click", () => {
      if (state.selectedBand == null) return;
      if ($("mdDepth")?.classList.contains("open")) return;
      state.depthBand = state.selectedBand;
      openDepthSection({
        mood: state.selectedBand,
        energy: null,
        stress: null,
        focus: null,
        social: null,
        emotion: "",
        impact: "",
        impactQ: "",
        triggerQ: "",
        actionQ: "",
        notes: ""
      });
    });

    $("mdSaveFull")?.addEventListener("click", async () => {
      try {
        const data = readDepthFormData();
        const dk = state.editingDateKey || todayKey();
        await saveMoodFull(data, dk);
        closeDepthSection();
        state.todayLog = await loadTodayLog();
        state.recentLogs = await loadRecentLogs();
        state.selectedBand = null;
        renderAll();
        showToast(t("mood.savedFullToast", "Saved ✓"));
        window.dispatchEvent(new CustomEvent("hbit:data-changed", { detail: { area: "mood" } }));
      } catch (e) {
        /* silent */
        showToast(t("mood.saveError", "Could not save. Check your connection."), "error");
      }
    });

    $("mdEditToday")?.addEventListener("click", () => {
      state.editingToday = true;
      state.editingDateKey = null;
      state.selectedBand = inferMoodBand(state.todayLog);
      applyMoodTint(state.selectedBand);
      openDepthSection(state.todayLog);
      renderAll();
    });

    $("mdSleepDismiss")?.addEventListener("click", () => {
      sessionStorage.setItem(`md-sleep-banner-dismissed-${todayKey()}`, "1");
      const b = $("mdSleepBanner");
      b?.classList.add("md-sleep-banner--hidden");
      if (b) b.hidden = true;
    });

    $("mdOpenLogFab")?.addEventListener("click", () => openMoodWizard());
    $("mdHeatmapPrev")?.addEventListener("click", async () => {
      const [y, m] = (state.heatmapMonth || todayKey().slice(0, 7)).split("-").map(Number);
      state.heatmapMonth = m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`;
      state.heatmapLogs = await loadHeatmapLogs();
      renderMoodHeatmap(state.heatmapLogs);
    });
    $("mdHeatmapNext")?.addEventListener("click", async () => {
      const [y, m] = (state.heatmapMonth || todayKey().slice(0, 7)).split("-").map(Number);
      state.heatmapMonth = m === 12 ? `${y + 1}-01` : `${y}-${pad2(m + 1)}`;
      state.heatmapLogs = await loadHeatmapLogs();
      renderMoodHeatmap(state.heatmapLogs);
    });
    $("mdWizardClose")?.addEventListener("click", closeMoodWizard);
    $("mdWizardOverlay")?.addEventListener("click", (e) => {
      if (e.target.id === "mdWizardOverlay") closeMoodWizard();
    });
    $("mdMoodSlider")?.addEventListener("input", updateMoodWizardColor);
    $("mdWizardSave")?.addEventListener("click", async () => {
      const btn = $("mdWizardSave");
      if (btn) btn.disabled = true;
      try {
        await saveMoodWizard();
      } catch (e) {
        showToast(t("mood.saveError", "Could not save. Check your connection."), "error");
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("mdWizardOverlay")?.classList.contains("open")) {
        closeMoodWizard();
      }
    });

    $("mdEntries")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".md-entry-edit");
      if (!btn) return;
      const dk = btn.getAttribute("data-date");
      if (!dk) return;
      const log = state.recentLogs.find((l) => logDateKey(l) === dk);
      if (!log) return;
      state.editingDateKey = dk;
      state.editingToday = dk === todayKey();
      state.selectedBand = inferMoodBand(log);
      state.depthBand = state.selectedBand;
      openDepthSection(log);
      renderAll();
    });

    document.addEventListener("hbit:lang-changed", () => {
      renderAll();
      if (state.depthOpen) {
        renderDepthBands();
        renderEmotionChips(state.depthBand);
        renderImpactChips();
        updateSubdimCaps();
      }
      if ($("mdWizardOverlay")?.classList.contains("open")) updateMoodWizardColor();
    });
  }

  let _moodHelpModalBound = false;

  async function start(user) {
    state.uid = user.uid;
    const avatar = $("moodProfileBtn");
    if (avatar) {
      let name = user.displayName || "";
      try {
        const profile = await HBIT.getCurrentUserProfile?.();
        name = profile?.fullName || profile?.name || name;
      } catch (_) {}
      avatar.textContent = (name || user.email || "H").trim().charAt(0).toUpperCase();
    }
    await migrateLegacyData();
    const [todayLog, recentLogs, heatmapLogs] = await Promise.all([loadTodayLog(), loadRecentLogs(), loadHeatmapLogs()]);
    state.todayLog = todayLog;
    state.recentLogs = recentLogs;
    state.heatmapLogs = heatmapLogs;
    state.weekInsight = generateWeeklyInsight(recentLogs);
    state.moodDataReady = true;
    bindEvents();
    renderAll();
    handleSleepBanner();
    if (!_moodHelpModalBound && HBIT.utils?.initHelpModal) {
      HBIT.utils.initHelpModal({
        openBtn: "mdHelpBtn",
        overlay: "mdHelpOverlay",
        closeBtn: "mdHelpClose",
      });
      _moodHelpModalBound = true;
    }
  }

  function init() {
    if (!window.firebase?.auth) {
      /* silent */
      return;
    }
    if (!_moodHelpModalBound && HBIT.utils?.initHelpModal) {
      HBIT.utils.initHelpModal({
        openBtn: "mdHelpBtn",
        overlay: "mdHelpOverlay",
        closeBtn: "mdHelpClose",
      });
      _moodHelpModalBound = true;
    }
    const auth = firebase.auth();
    if (auth.currentUser) {
      start(auth.currentUser).catch(() => {});
      return;
    }
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        unsub();
        start(user).catch(() => {});
      }
    });
  }

  HBIT.pages = HBIT.pages || {};
  HBIT.pages.mood = { init };

  if (typeof HBIT.onReady !== "function") {
    HBIT.onReady = function (cb) {
      if (!window.firebase?.auth) return;
      const auth = firebase.auth();
      if (auth.currentUser) {
        Promise.resolve().then(() => cb(auth.currentUser));
        return;
      }
      const u = auth.onAuthStateChanged((user) => {
        if (user) {
          u();
          cb(user);
        }
      });
    };
  }
})();
