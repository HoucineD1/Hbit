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

  function setOverallPill(st) {
    const lang = getLang();
    const ov = overallScore(st);
    const pill = qs("#moodOverallPill");
    if (!pill) return;

    const v = clamp(Math.round(ov), 1, 5);
    pill.className = `pill ${moodClassFrom5(v)}`;
    pill.textContent = scaleLabel(v, lang);
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

  /* ════════════════════════════════════════════════════════════
     WIZARD — step-by-step log popup
     Steps: 0 sliders | 1 emotion | 2 impact | 3 impact-q |
            4 trigger-q | 5 action-q | 6 notes
     ════════════════════════════════════════════════════════════ */
  const WZ_TOTAL = 7;
  const wz = {
    step: 0,
    data: { mood:3, stress:3, energy:3, focus:3, social:3, emotion:"", impact:"", impactQ:"", triggerQ:"", actionQ:"", note:"" }
  };

  function wzTitle(step) {
    const lang = getLang();
    const en = [
      "How do you feel today?",
      "What emotion fits best?",
      "What had the most impact?",
      "What impacted your day?",
      "What was the main trigger?",
      "One action you can take now?",
      "Any notes?"
    ];
    const fr = [
      "Comment tu te sens aujourd'hui ?",
      "Quelle émotion te correspond ?",
      "Qu'est-ce qui a eu le plus d'impact ?",
      "Qu'est-ce qui a impacté ta journée ?",
      "Quel a été le déclencheur principal ?",
      "Une action que tu peux faire maintenant ?",
      "Des notes ?"
    ];
    return (lang === "fr" ? fr : en)[step] || "";
  }

  function wzSave() {
    const s = wz.step;
    const lang = getLang();
    if (s === 0) {
      const dims = ["Mood7","Stress7","Energy7","Focus7","Social7"];
      const keys = ["mood","stress","energy","focus","social"];
      dims.forEach((d, i) => {
        const el = qs("#wzRng" + d);
        if (el) wz.data[keys[i]] = num(el.value, 3);
      });
    } else if (s === 1) {
      const a = qs("#wzEmotionChips .mood-chip.active");
      if (a) wz.data.emotion = a.getAttribute("data-value");
    } else if (s === 2) {
      const a = qs("#wzImpactChips .mood-chip.active");
      if (a) wz.data.impact = a.getAttribute("data-value");
    } else if (s === 3) {
      wz.data.impactQ = (qs("#wzImpactQ")?.value || "").trim();
    } else if (s === 4) {
      wz.data.triggerQ = (qs("#wzTriggerQ")?.value || "").trim();
    } else if (s === 5) {
      wz.data.actionQ = (qs("#wzActionQ")?.value || "").trim();
    } else if (s === 6) {
      wz.data.note = (qs("#wzNote")?.value || "").trim();
    }
  }

  function wzRender(step) {
    const content = qs("#mdLogContent");
    if (!content) return;
    const lang = getLang();
    content.innerHTML = "";

    if (step === 0) {
      const dims = [
        { id: "Mood7",   key: "mood",   label: lang === "fr" ? "Humeur" : "Mood" },
        { id: "Stress7", key: "stress", label: "Stress" },
        { id: "Energy7", key: "energy", label: lang === "fr" ? "Énergie" : "Energy" },
        { id: "Focus7",  key: "focus",  label: "Focus" },
        { id: "Social7", key: "social", label: "Social" },
      ];
      const grid = document.createElement("div");
      grid.className = "md-sliders";
      dims.forEach(d => {
        const v = wz.data[d.key];
        const card = document.createElement("div");
        card.className = "md-slider-card";
        card.innerHTML = `
          <div class="md-slider-head">
            <span class="md-slider-label">${d.label}</span>
            <span class="pill mood7-pill" id="wzPill${d.id}">—</span>
          </div>
          <input id="wzRng${d.id}" type="range" min="1" max="5" value="${v}" class="md-range" />
          <div class="md-cap" id="wzCap${d.id}">—</div>
        `;
        grid.appendChild(card);
      });
      content.appendChild(grid);

      const ringWrap = document.createElement("div");
      ringWrap.className = "md-ring-wrap";
      ringWrap.innerHTML = `
        <div class="md-ring" id="wzRing" style="--deg:0deg;">
          <div class="md-ring-center">
            <span class="md-ring-label">${lang === "fr" ? "Global" : "Overall"}</span>
            <span class="md-ring-val" id="wzRingScore">—</span>
          </div>
        </div>
      `;
      content.appendChild(ringWrap);

      function wzUpdateRing() {
        const ov = overallScore(wz.data);
        const deg = (ov / 5) * 360;
        const ring = qs("#wzRing");
        const score = qs("#wzRingScore");
        if (ring) {
          ring.style.setProperty("--deg", `${deg}deg`);
          ring.style.setProperty("--ringColor", moodColor(Math.round(ov)));
        }
        if (score) score.textContent = scaleLabel(Math.round(ov), lang);
      }

      dims.forEach(d => {
        renderOne("wzRng" + d.id, "wzPill" + d.id, "wzCap" + d.id);
        const el = qs("#wzRng" + d.id);
        if (el) {
          updateRangeStyle(el, num(el.value, 3), 5);
          el.addEventListener("input", () => {
            wz.data[d.key] = num(el.value, 3);
            renderOne("wzRng" + d.id, "wzPill" + d.id, "wzCap" + d.id);
            wzUpdateRing();
          });
        }
      });
      wzUpdateRing();

    } else if (step === 1) {
      const ov = overallScore(wz.data);
      const band = bandFromOverall(ov);
      const ui = readUI();
      const sets = emotionSets(lang)[band];
      const list = ui.emoMore ? [...sets.base, ...sets.more] : sets.base;
      const wrap = document.createElement("div");
      wrap.id = "wzEmotionChips";
      wrap.className = "chips";
      list.forEach(name => {
        const b = makeChip(name, name, () => {
          qsa("#wzEmotionChips .mood-chip").forEach(x => x.classList.remove("active"));
          b.classList.add("active");
          wz.data.emotion = name;
        });
        if (wz.data.emotion === name) b.classList.add("active");
        wrap.appendChild(b);
      });
      content.appendChild(wrap);
      const moreBtn = document.createElement("button");
      moreBtn.className = "md-btn small";
      moreBtn.style.marginTop = "10px";
      moreBtn.textContent = ui.emoMore ? (lang === "fr" ? "Afficher moins" : "Show less") : (lang === "fr" ? "Afficher plus" : "Show more");
      moreBtn.addEventListener("click", () => {
        const u = readUI(); u.emoMore = !u.emoMore; writeUI(u); wzRender(1);
      });
      content.appendChild(moreBtn);

    } else if (step === 2) {
      const ui = readUI();
      const sets = impactSets(lang);
      const list = ui.impMore ? [...sets.base, ...sets.more] : sets.base;
      const wrap = document.createElement("div");
      wrap.id = "wzImpactChips";
      wrap.className = "chips";
      list.forEach(name => {
        const b = makeChip(name, name, () => {
          qsa("#wzImpactChips .mood-chip").forEach(x => x.classList.remove("active"));
          b.classList.add("active");
          wz.data.impact = name;
        });
        if (wz.data.impact === name) b.classList.add("active");
        wrap.appendChild(b);
      });
      content.appendChild(wrap);
      const moreBtn = document.createElement("button");
      moreBtn.className = "md-btn small";
      moreBtn.style.marginTop = "10px";
      moreBtn.textContent = ui.impMore ? (lang === "fr" ? "Afficher moins" : "Show less") : (lang === "fr" ? "Afficher plus" : "Show more");
      moreBtn.addEventListener("click", () => {
        const u = readUI(); u.impMore = !u.impMore; writeUI(u); wzRender(2);
      });
      content.appendChild(moreBtn);

    } else if (step === 3) {
      const inp = document.createElement("input");
      inp.type = "text"; inp.id = "wzImpactQ"; inp.className = "md-input";
      inp.placeholder = lang === "fr" ? "ex. Travail, sommeil, famille..." : "e.g. Work, sleep, family...";
      inp.maxLength = 120; inp.value = wz.data.impactQ || "";
      content.appendChild(inp);
      setTimeout(() => inp.focus(), 60);

    } else if (step === 4) {
      const inp = document.createElement("input");
      inp.type = "text"; inp.id = "wzTriggerQ"; inp.className = "md-input";
      inp.placeholder = lang === "fr" ? "ex. Après ___ je me suis senti(e)..." : "e.g. After ___ I felt ___";
      inp.maxLength = 120; inp.value = wz.data.triggerQ || "";
      content.appendChild(inp);
      setTimeout(() => inp.focus(), 60);

    } else if (step === 5) {
      const inp = document.createElement("input");
      inp.type = "text"; inp.id = "wzActionQ"; inp.className = "md-input";
      inp.placeholder = lang === "fr" ? "ex. 5 min de marche, appeler un ami..." : "e.g. 5 min walk, call a friend...";
      inp.maxLength = 120; inp.value = wz.data.actionQ || "";
      content.appendChild(inp);
      setTimeout(() => inp.focus(), 60);

    } else if (step === 6) {
      const ta = document.createElement("textarea");
      ta.id = "wzNote"; ta.className = "md-textarea"; ta.rows = 4;
      ta.placeholder = lang === "fr" ? "Écris ce que tu veux..." : "Write anything...";
      ta.value = wz.data.note || "";
      content.appendChild(ta);
      setTimeout(() => ta.focus(), 60);
    }
  }

  function wzSync() {
    const lang = getLang();
    const label = qs("#mdLogStepLabel");
    if (label) label.textContent = `${wz.step + 1} / ${WZ_TOTAL}`;

    const fill = qs("#mdLogProgressFill");
    if (fill) fill.style.width = `${(wz.step / (WZ_TOTAL - 1)) * 100}%`;

    const title = qs("#mdLogStepTitle");
    if (title) title.textContent = wzTitle(wz.step);

    const back = qs("#mdLogBtnBack");
    if (back) {
      back.disabled = wz.step === 0;
      back.textContent = lang === "fr" ? "Retour" : "Back";
    }

    const next = qs("#mdLogBtnNext");
    if (next) {
      if (wz.step === WZ_TOTAL - 1) {
        next.textContent = lang === "fr" ? "Enregistrer ✓" : "Save ✓";
      } else {
        next.textContent = lang === "fr" ? "Suivant →" : "Next →";
      }
    }

    wzRender(wz.step);
  }

  function wzPersistAndSave() {
    wzSave();
    const data = { ...wz.data };
    const ov = overallScore(data);
    const entry = { ...data, overall: ov, ts: Date.now() };
    const arr = readHistory();
    arr.unshift(entry);
    writeHistory(arr);
    saveToday(data);

    setOverallPill(data);
    const page = document.getElementById("moodPage");
    if (page) {
      const v = Math.round(ov);
      page.setAttribute("data-mood-tone", v <= 2 ? "low" : v >= 4 ? "high" : "mid");
    }

    renderHistory();
    closeMoodLogModal();

    if (window.HBIT?.db) {
      const today = new Date().toISOString().slice(0, 10);
      const to10 = v => Math.round(clamp(num(v, 3), 1, 5) * 2);
      HBIT.db.moodLogs.set(today, {
        score:  to10(ov),
        energy: to10(data.energy || 3),
        stress: to10(data.stress || 3),
        focus:  to10(data.focus || 3),
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
  }

  function openMoodLogModal() {
    const prev = normalizeEntry(readToday());
    const def = { mood:3, stress:3, energy:3, focus:3, social:3, emotion:"", impact:"", impactQ:"", triggerQ:"", actionQ:"", note:"" };
    wz.data = { ...def, ...(prev || {}) };
    wz.step = 0;
    wzSync();
    const modal = qs("#moodLogModal");
    if (modal) { modal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  }

  function closeMoodLogModal() {
    const modal = qs("#moodLogModal");
    if (modal) { modal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  }

  function bind() {
    on(qs("#moodLogBtn"),   "click", openMoodLogModal);
    on(qs("#moodLogClose"), "click", closeMoodLogModal);

    qs("#moodLogModal")?.addEventListener("click", (e) => {
      if (e.target.id === "moodLogModal") closeMoodLogModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && qs("#moodLogModal")?.getAttribute("aria-hidden") === "false") closeMoodLogModal();
    });

    on(qs("#mdLogBtnBack"), "click", () => {
      if (wz.step > 0) { wzSave(); wz.step--; wzSync(); }
    });

    on(qs("#mdLogBtnNext"), "click", () => {
      wzSave();
      if (wz.step === WZ_TOTAL - 1) {
        wzPersistAndSave();
      } else {
        wz.step++;
        wzSync();
      }
    });
  }

  function init() {
    const ui = readUI();
    writeUI(ui);

    const def = { mood:3, stress:3, energy:3, focus:3, social:3, emotion:"", impact:"", impactQ:"", triggerQ:"", actionQ:"", note:"" };
    const st = normalizeEntry(readToday());
    const active = st || def;
    if (!st) saveToday(def);
    setOverallPill(active);

    const page = document.getElementById("moodPage");
    if (page && st) {
      const v = Math.round(overallScore(st));
      page.setAttribute("data-mood-tone", v <= 2 ? "low" : v >= 4 ? "high" : "mid");
    }

    const dateEl = document.getElementById("moodDate");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString(getLang() === "fr" ? "fr-FR" : "en-US", { weekday: "short", day: "numeric", month: "short" });

    bind();
    renderHistory();

    qs("#logoutBtn")?.addEventListener("click", async () => {
      try {
        if (typeof firebase !== "undefined" && firebase.auth) {
          await firebase.auth().signOut();
          window.location.replace("index.html");
        }
      } catch (e) {
        console.warn("[mood] Sign out:", e?.message);
      }
    });
  }

  HBIT.pages = HBIT.pages || {};
  HBIT.pages.mood = { init };
})();
