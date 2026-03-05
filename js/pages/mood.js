/* =========================
   Mood — js/pages/mood.js
   1..5 labels + emotion suggestions + impacts + ring + history
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  const KEY_TODAY = "life_mood7_today";
  const KEY_HIST  = "life_mood7_history";
  const KEY_UI    = "life_mood7_ui";

  // Prefer core utils if available
  const U = HBIT.utils || {};
  const qs  = U.qs  || ((s, r=document) => r.querySelector(s));
  const qsa = U.qsa || ((s, r=document) => Array.from(r.querySelectorAll(s)));
  const on  = U.on  || ((el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts));

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const num = (v, f=0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
  };

  function getLang() {
    return HBIT.i18n?.getLang?.() || "en";
  }

  function scaleLabel(v, lang) {
    const en = ["Very bad","Bad","Slightly bad","Good","Other"];
    const fr = ["Très mal","Mal","Légèrement mal","Bien","Autre"];
    return (lang === "fr" ? fr : en)[v - 1] || "—";
  }

  function emotionSets(lang) {
    const EN = {
      verybad: { base:["Overwhelmed","Anxious","Angry","Sad","Hopeless","Tired","Stressed"], more:["Empty","Burned out","Panicked","Ashamed","Numb","Defeated","Confused","Guilty","Scared","Irritable","Lonely"] },
      bad:     { base:["Unmotivated","Irritated","Worried","Drained","Frustrated","Insecure","Down"], more:["Bored","Restless","Sensitive","Disappointed","Uncertain","Stuck","Annoyed","Distracted","Tense","Undervalued","Disconnected"] },
      slight:  { base:["Okay","Meh","Calm","Reserved","Low energy","Quiet","Neutral"], more:["Stable","Chill","Content","Thoughtful","Observing","Routine","Balanced","Patient","Grounded"] },
      good:    { base:["Confident","Motivated","Hopeful","Grateful","Energized","Proud","Relaxed"], more:["Optimistic","Clear-headed","Productive","Social","Playful","Present","Disciplined","Connected","Refreshed","Brave","Creative"] },
      other:   { base:["Other","Mixed","Unsure","Complicated","Different","Unique","Varied"], more:["Bittersweet","Changing","In between","Hard to name","Uneven","Blurred","Complex"] }
    };

    const FR = {
      verybad: { base:["Débordé","Anxieux","En colère","Triste","Sans espoir","Fatigué","Stressé"], more:["Vide","Épuisé mentalement","Paniqué","Honteux","Engourdi","Abattu","Confus","Coupable","Effrayé","Irritable","Seul"] },
      bad:     { base:["Démotivé","Irrité","Inquiet","Drainé","Frustré","Insécure","Morne"], more:["Ennuyé","Agité","Sensible","Déçu","Incertain","Bloqué","Gosser","Distrait","Tendu","Sous-estimé","Déconnecté"] },
      slight:  { base:["OK","Bof","Calme","Réservé","Faible énergie","Discret","Neutre"], more:["Stable","Tranquille","Satisfait","Pensif","Observateur","Routin\u00e9","Équilibré","Patient","Ancré"] },
      good:    { base:["Confiant","Motivé","Plein d’espoir","Reconnaissant","Énergique","Fier","Détendu"], more:["Optimiste","Lucide","Productif","Sociable","Joueur","Présent","Discipliné","Connecté","Reposé","Courageux","Créatif"] },
      other:   { base:["Autre","Mitigé","Incertain","Compliqué","Différent","Unique","Varié"], more:["Doux-amer","Changeant","Entre deux","Difficile à nommer","Inégal","Flou","Complexe"] }
    };

    return (lang === "fr") ? FR : EN;
  }

  function impactSets(lang) {
    const EN = {
      base: ["Sleep","Work/School","Training","Relationships","Money","Health"],
      more: ["Diet","Family","Friends","Weather","Travel","Social media","Deadlines","Injury","Recovery","Motivation","Confidence","Time management","Habits","Stress"]
    };
    const FR = {
      base: ["Sommeil","Travail/École","Entraînement","Relations","Argent","Santé"],
      more: ["Alimentation","Famille","Amis","Météo","Voyage","Réseaux sociaux","Deadlines","Blessure","Récupération","Motivation","Confiance","Gestion du temps","Habitudes","Stress"]
    };
    return (lang === "fr") ? FR : EN;
  }

  function moodClassFrom5(v) { return `mood-${clamp(v, 1, 5)}`; }

  const MOOD_COLORS = ["#9b2748","#c6513b","#d1a23a","#42b883","#5cc9b7"];

  function moodColor(v) {
    return MOOD_COLORS[clamp(v, 1, 5) - 1];
  }

  function updateRangeStyle(el, v, max) {
    if (!el) return;
    const pct = Math.round((v - 1) / (max - 1) * 100);
    el.style.setProperty("--pct", `${pct}%`);
    el.style.setProperty("--moodColor", moodColor(v));
  }

  function setPill(el, v, text) {
    if (!el) return;
    el.className = `pill mood7-pill ${moodClassFrom5(v)}`;
    el.textContent = text ?? scaleLabel(v, getLang());
  }

  function renderOne(rngId, pillId, capId) {
    const r = qs("#" + rngId);
    const pill = qs("#" + pillId);
    const cap = qs("#" + capId);
    if (!r) return;

    const lang = getLang();
    const v = clamp(num(r.value, 3), 1, 5);
    const label = scaleLabel(v, lang);

    setPill(pill, v, label);
    if (cap) cap.textContent = label;
    updateRangeStyle(r, v, 5);
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readToday()   { return readJSON(KEY_TODAY, null); }
  function saveToday(st) { writeJSON(KEY_TODAY, st); }

  function readHistory() { return readJSON(KEY_HIST, []); }
  function writeHistory(arr) { writeJSON(KEY_HIST, arr.slice(0, 30)); }

  function readUI() {
    const ui = readJSON(KEY_UI, null);
    return ui || { emoMore:false, impMore:false };
  }
  function writeUI(ui) { writeJSON(KEY_UI, ui); }

  function readForm() {
    const mood   = num(qs("#rngMood7")?.value, 3);
    const stress = num(qs("#rngStress7")?.value, 3);
    const energy = num(qs("#rngEnergy7")?.value, 3);
    const focus  = num(qs("#rngFocus7")?.value, 3);
    const social = num(qs("#rngSocial7")?.value, 3);

    const emoBtn = qs("#emotionChips .mood-chip.active");
    const emotion = emoBtn ? emoBtn.getAttribute("data-value") : "";

    const impBtn = qs("#impactChips .mood-chip.active");
    const impact = impBtn ? impBtn.getAttribute("data-value") : "";

    const note = (qs("#moodNote")?.value || "").trim();
    return { mood, stress, energy, focus, social, emotion, impact, note };
  }

  function normalizeFrom7(v) {
    const n = clamp(num(v, 3), 1, 7);
    return clamp(Math.round(((n - 1) * 4) / 6 + 1), 1, 5);
  }

  function normalizeEntry(st) {
    if (!st) return st;
    // If legacy 1..7 values are present, map them to 1..5
    const max = Math.max(st.mood || 0, st.stress || 0, st.energy || 0, st.focus || 0, st.social || 0, st.overall || 0);
    if (max > 5) {
      return {
        ...st,
        mood: normalizeFrom7(st.mood),
        stress: normalizeFrom7(st.stress),
        energy: normalizeFrom7(st.energy),
        focus: normalizeFrom7(st.focus),
        social: normalizeFrom7(st.social),
        overall: normalizeFrom7(st.overall),
      };
    }
    return st;
  }

  function overallScore(st) {
    const raw = (st.mood + st.energy + st.focus + st.social) / 4;
    const adj = raw - ((st.stress - 3) * 0.4);
    return clamp(Math.round(adj * 10) / 10, 1, 5);
  }

  function bandFromOverall(v) {
    if (v <= 1.5) return "verybad";
    if (v <= 2.5) return "bad";
    if (v <= 3.5) return "slight";
    if (v <= 4.5) return "good";
    return "other";
  }

  function setRing(ov) {
    const ring = qs("#moodRing");
    const score = qs("#ringScore");
    if (!ring) return;

    const deg = (ov / 5) * 360;
    ring.style.setProperty("--deg", `${deg}deg`);
    ring.style.setProperty("--ringColor", moodColor(Math.round(ov)));
    if (score) score.textContent = scaleLabel(Math.round(ov), getLang());
  }

  function setOverallPill(st) {
    const lang = getLang();
    const ov = overallScore(st);
    const pill = qs("#moodOverallPill");
    if (!pill) return;

    const v = clamp(Math.round(ov), 1, 5);
    pill.className = `pill ${moodClassFrom5(v)}`;
    pill.textContent = scaleLabel(v, lang);
  }

  function renderAllSliders() {
    renderOne("rngMood7", "pillMood7", "capMood7");
    renderOne("rngStress7", "pillStress7", "capStress7");
    renderOne("rngEnergy7", "pillEnergy7", "capEnergy7");
    renderOne("rngFocus7", "pillFocus7", "capFocus7");
    renderOne("rngSocial7", "pillSocial7", "capSocial7");
  }

  function makeChip(label, value, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mood-chip";
    b.textContent = label;
    b.setAttribute("data-value", value);
    on(b, "click", onClick);
    return b;
  }

  function setActiveChip(containerSel, btnEl) {
    qsa(containerSel + " .mood-chip").forEach(x => x.classList.remove("active"));
    btnEl.classList.add("active");
  }

  function buildEmotionChips(st) {
    const wrap = qs("#emotionChips");
    if (!wrap) return;

    const ui = readUI();
    const lang = getLang();
    const ov = overallScore(st);
    const band = bandFromOverall(ov);
    const sets = emotionSets(lang)[band];

    const list = ui.emoMore ? [...sets.base, ...sets.more] : sets.base;
    const current = st.emotion || "";

    wrap.innerHTML = "";
    list.forEach((name) => {
      const b = makeChip(name, name, () => {
        setActiveChip("#emotionChips", b);
        const pill = qs("#pillEmotion");
        if (pill) setPill(pill, clamp(Math.round(ov), 1, 5), name);
        saveToday(readForm());
      });

      if (current && current === name) b.classList.add("active");
      wrap.appendChild(b);
    });

    const active = qs("#emotionChips .mood-chip.active");
    const pill = qs("#pillEmotion");
    if (pill) {
      if (active) setPill(pill, clamp(Math.round(ov), 1, 5), active.getAttribute("data-value"));
      else { pill.className = "pill"; pill.textContent = "—"; }
    }

    const moreBtn = qs("#emotionMoreBtn");
    if (moreBtn) {
      moreBtn.textContent = ui.emoMore
        ? (lang === "fr" ? "Afficher moins" : "Show less")
        : (lang === "fr" ? "Afficher plus" : "Show more");
    }
  }

  function buildImpactChips(st) {
    const wrap = qs("#impactChips");
    if (!wrap) return;

    const ui = readUI();
    const lang = getLang();
    const sets = impactSets(lang);
    const list = ui.impMore ? [...sets.base, ...sets.more] : sets.base;

    const current = st.impact || "";
    wrap.innerHTML = "";

    list.forEach((name) => {
      const b = makeChip(name, name, () => {
        setActiveChip("#impactChips", b);
        const ov = clamp(Math.round(overallScore(readForm())), 1, 5);
        const pill = qs("#pillImpact");
        if (pill) setPill(pill, ov, name);
        saveToday(readForm());
      });

      if (current && current === name) b.classList.add("active");
      wrap.appendChild(b);
    });

    const pill = qs("#pillImpact");
    const active = qs("#impactChips .mood-chip.active");
    const ov = clamp(Math.round(overallScore(st)), 1, 5);

    if (pill) {
      if (active) setPill(pill, ov, active.getAttribute("data-value"));
      else { pill.className = "pill"; pill.textContent = "—"; }
    }

    const moreBtn = qs("#impactMoreBtn");
    if (moreBtn) {
      moreBtn.textContent = ui.impMore
        ? (lang === "fr" ? "Afficher moins" : "Show less")
        : (lang === "fr" ? "Afficher plus" : "Show more");
    }
  }

  function applyToUI(st) {
    if (!st) return;

    const setRange = (id, v) => { const el = qs("#" + id); if (el) el.value = String(v); };

    setRange("rngMood7", st.mood ?? 3);
    setRange("rngStress7", st.stress ?? 3);
    setRange("rngEnergy7", st.energy ?? 3);
    setRange("rngFocus7", st.focus ?? 3);
    setRange("rngSocial7", st.social ?? 3);

    const note = qs("#moodNote");
    if (note) note.value = st.note || "";

    renderAllSliders();

    const cur = readForm();
    setOverallPill(cur);
    setRing(overallScore(cur));

    buildEmotionChips(cur);
    buildImpactChips(cur);
  }

  function renderHistory() {
    const box = qs("#moodHistory");
    const count = qs("#moodHistoryCount");
    if (!box) return;

    const arr = readHistory().map(normalizeEntry);
    if (count) count.textContent = String(arr.length);

    if (arr.length === 0) {
      box.innerHTML = `<div class="empty-note" data-i18n="mood.history.empty">No entries yet.</div>`;
      HBIT.i18n?.apply?.(box);
      return;
    }

    box.innerHTML = "";
    arr.forEach(e => {
      const div = document.createElement("div");
      div.className = "card";
      const dt = new Date(e.ts);
      div.innerHTML = `
        <div class="row">
          <div class="tag"><span class="dot"></span><span>${dt.toLocaleString()}</span></div>
          <div class="pill ${moodClassFrom5(Math.round(e.overall || 3))}">${scaleLabel(Math.round(e.overall || 3), getLang())}</div>
        </div>
        <div class="sub" style="margin-top:10px;">
          ${scaleLabel(e.mood, getLang())} • ${scaleLabel(e.stress, getLang())} • ${scaleLabel(e.energy, getLang())} • ${scaleLabel(e.focus, getLang())} • ${scaleLabel(e.social, getLang())}
        </div>
        <div class="sub" style="margin-top:8px;">
          ${e.emotion ? `Emotion: <b>${e.emotion}</b>` : "Emotion: —"} • ${e.impact ? `Impact: <b>${e.impact}</b>` : "Impact: —"}
        </div>
        ${e.note ? `<div class="sub" style="margin-top:8px;">${e.note}</div>` : ""}
      `;
      box.appendChild(div);
    });
  }

  function refreshEverything() {
    renderAllSliders();
    const st = readForm();
    setOverallPill(st);
    setRing(overallScore(st));
    buildEmotionChips(st);
    buildImpactChips(st);
    saveToday(st);
  }

  function bind() {
    ["rngMood7","rngStress7","rngEnergy7","rngFocus7","rngSocial7"].forEach(id => {
      const el = qs("#" + id);
      on(el, "input", refreshEverything);
      if (el) updateRangeStyle(el, num(el.value, 3), 5);
    });

    on(qs("#moodNote"), "input", () => saveToday(readForm()));

    on(qs("#emotionMoreBtn"), "click", () => {
      const ui = readUI();
      ui.emoMore = !ui.emoMore;
      writeUI(ui);
      buildEmotionChips(readForm());
    });

    on(qs("#impactMoreBtn"), "click", () => {
      const ui = readUI();
      ui.impMore = !ui.impMore;
      writeUI(ui);
      buildImpactChips(readForm());
    });

    on(qs("#moodResetToday"), "click", () => {
      const defaults = { mood:3, stress:3, energy:3, focus:3, social:3, emotion:"", impact:"", note:"" };
      applyToUI(defaults);
      saveToday(defaults);
    });

    on(qs("#moodClear"), "click", () => {
      localStorage.removeItem(KEY_TODAY);
      const defaults = { mood:3, stress:3, energy:3, focus:3, social:3, emotion:"", impact:"", note:"" };
      applyToUI(defaults);
    });

    on(qs("#moodSave"), "click", () => {
      const data = readForm();
      const ov = overallScore(data);
      const entry = { ...data, overall: ov, ts: Date.now() };

      const arr = readHistory();
      arr.unshift(entry);
      writeHistory(arr);

      const pill = qs("#moodOverallPill");
      if (pill) {
        const lang = getLang();
        pill.className = `pill ${moodClassFrom5(4)}`;
        pill.textContent = (lang === "fr") ? "Enregistré ✓" : "Saved ✓";
        setTimeout(() => setOverallPill(readForm()), 900);
      }

      renderHistory();

      /* ── Firestore sync (non-blocking) ─────────────── */
      if (window.HBIT?.db) {
        const today = new Date().toISOString().slice(0, 10);
        /* Map 1-5 scale to 1-10 */
        const to10 = v => Math.round(clamp(v, 1, 5) * 2);
        HBIT.db.moodLogs.set(today, {
          score:  to10(ov),
          energy: to10(data.energy || 3),
          stress: to10(data.stress || 3),
          notes:  data.note || "",
          tags:   [data.emotion, data.impact].filter(Boolean)
        }).then(() => {
          if (window.HBIT?.updateUserProfile) {
            HBIT.updateUserProfile({
              "stats.moodLogs": firebase.firestore.FieldValue.increment(1)
            }).catch(() => {});
          }
        }).catch(e => console.warn("[Hbit] Mood Firestore sync:", e.message));
      }
    });

    // Re-render when language label changes
    const lab = document.getElementById("langLabel");
    if (lab) {
      const obs = new MutationObserver(() => {
        renderAllSliders();
        const st = readForm();
        setOverallPill(st);
        setRing(overallScore(st));
        buildEmotionChips(st);
        buildImpactChips(st);
      });
      obs.observe(lab, { childList: true });
    }
  }

  function init() {
    // ensure UI defaults exist
    const ui = readUI();
    writeUI(ui);

    const st = normalizeEntry(readToday());
    if (st) applyToUI(st);
    else {
      const defaults = { mood:3, stress:3, energy:3, focus:3, social:3, emotion:"", impact:"", note:"" };
      applyToUI(defaults);
      saveToday(defaults);
    }

    bind();
    renderHistory();
  }

  HBIT.pages = HBIT.pages || {};
  HBIT.pages.mood = { init };
})();
