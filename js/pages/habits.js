/* ==========================================================
   Hbit — js/pages/habits.js
   Firestore habits — 7-step wizard — Oura-inspired cards
   Filter chips — Heatmap — Detail calendar — Streak engine
   ========================================================== */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function t(key, fallback, params) {
    try {
      return window.HBIT?.i18n?.t?.(key, fallback, params) ?? fallback ?? key;
    } catch (_) {
      return fallback ?? key;
    }
  }

  /* Ring geometry */
  const RING_R = 28;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const GOAL_R = 34;
  const GOAL_CIRC = 2 * Math.PI * GOAL_R;

  /* Category data */
  const CATEGORIES = [
    { id: "health", label: "Health", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
    { id: "fitness", label: "Fitness", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>` },
    { id: "mind", label: "Mind", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>` },
    { id: "learning", label: "Learning", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>` },
    { id: "finance", label: "Finance", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2a3 3 0 0 1-3-1.5"/></svg>` },
    { id: "sleep", label: "Sleep", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>` },
    { id: "social", label: "Social", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
    { id: "lifestyle", label: "Lifestyle", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` },
  ];
  const CAT_ICON_MAP = {};
  CATEGORIES.forEach(c => { CAT_ICON_MAP[c.id] = c.icon; });

  const PRESETS = {
    health: [
      "Drink 2L water daily", "Eat 5 servings of fruits & veggies", "No junk food",
      "Take daily vitamins", "Healthy breakfast every day", "Cut refined sugar",
      "Cook a meal at home", "Eat a salad with lunch", "No eating after 8pm",
      "Track calories / macros", "Drink green tea", "Floss teeth every night",
      "Take a probiotic", "Eat mindfully (no screen)", "Prep healthy snacks",
      "Limit processed food", "Drink a glass of water on waking", "Eat whole grains",
    ],
    fitness: [
      "Morning workout 30 min", "Walk 10,000 steps", "Stretch for 10 min",
      "Go to the gym", "Run for 20 min", "Bike ride 30 min",
      "Do 50 push-ups", "Plank for 2 min", "Yoga session 20 min",
      "Jump rope 10 min", "Swim laps 30 min", "HIIT workout 15 min",
      "Take the stairs always", "Evening walk after dinner", "Strength training",
      "Dance workout 20 min", "Do 100 squats", "Cold shower or ice bath",
    ],
    mind: [
      "Meditate 10 min", "Daily journaling", "Gratitude list (3 things)",
      "No phone first hour", "Deep breathing 5 min", "Read before bed",
      "Digital detox 1 hour", "Positive affirmations", "Visualization practice",
      "Mindful walking 15 min", "Brain dump / free write", "Practice saying no",
      "Limit news consumption", "Body scan meditation", "No social media before noon",
      "Therapy / self-reflection", "Practice patience today", "Single-task (no multitasking)",
    ],
    learning: [
      "Read 20 pages", "Study for 45 min", "Practice a new language",
      "Complete an online course lesson", "Review flashcards (Anki)", "Take notes from a podcast",
      "Watch a TED talk", "Learn a new word", "Practice coding 30 min",
      "Write a summary of what I learned", "Listen to an audiobook", "Solve a puzzle or brain teaser",
      "Practice an instrument 20 min", "Sketch / draw for 15 min", "Write 500 words",
      "Learn a new recipe", "Practice public speaking", "Read an industry article",
    ],
    finance: [
      "Track every expense today", "Save 10% of income", "No impulse purchases",
      "Cook lunch instead of buying", "Weekly budget review", "Cancel an unused subscription",
      "Check bank balance", "Put money in savings", "No online shopping today",
      "Compare prices before buying", "Bring coffee from home", "Review monthly subscriptions",
      "Set a daily spending limit", "Read about personal finance", "Automate a bill payment",
      "Sell something I don't need", "Use cash only today", "Plan meals to cut food waste",
    ],
    sleep: [
      "In bed by 10:30 PM", "No screens 1 hour before bed", "Wake up at the same time",
      "Evening wind-down routine", "No caffeine after 2 PM", "Dark & cool bedroom",
      "Read for 15 min before sleep", "Avoid heavy meals at night", "Use a sleep mask",
      "Practice sleep meditation", "No alcohol before bed", "Stretch before sleeping",
      "Write a to-do list for tomorrow", "Dim lights after 8 PM", "White noise or calming sounds",
      "No naps after 3 PM", "Keep phone outside bedroom", "Take magnesium supplement",
    ],
    social: [
      "Call or text a friend", "Family dinner together", "Do a random act of kindness",
      "Reach out to someone new", "Limit social media to 30 min", "Plan a meet-up or outing",
      "Send a thank-you message", "Have a deep conversation", "Compliment someone sincerely",
      "Volunteer or help a neighbour", "Practice active listening", "Write a letter or card",
      "Host a game night", "Check in on a loved one", "Join a club or group",
      "No phone during meals with others", "Make eye contact & smile more", "Mentor or teach someone",
    ],
    lifestyle: [
      "Make bed every morning", "Clean workspace for 5 min", "Meal prep on Sunday",
      "Evening routine before bed", "Posture check every hour", "Declutter one area for 5 min",
      "Morning skincare routine", "Iron or prep clothes the night before", "Water my plants",
      "No TV during meals", "10-min tidy before bed", "Plan tomorrow's top 3 priorities",
      "Spend 15 min on a hobby", "Unsubscribe from one email", "Organize one drawer or shelf",
      "Walk or bike instead of driving", "Practise a morning routine", "Digital file cleanup 5 min",
    ],
  };

  /* French display labels for saved habits (Firestore stores English preset names). */
  const PRESETS_FR = {
    health: [
      "Boire 2 L d’eau par jour", "Manger 5 portions de fruits et légumes", "Pas de malbouffe",
      "Prendre des vitamines chaque jour", "Petit-déjeuner sain chaque jour", "Réduire le sucre raffiné",
      "Cuisiner un repas à la maison", "Une salade avec le déjeuner", "Ne plus manger après 20 h",
      "Suivre calories / macros", "Boire du thé vert", "Se filer les dents chaque soir",
      "Prendre un probiotique", "Manger en pleine conscience (sans écran)", "Préparer des encas sains",
      "Limiter les aliments ultra-transformés", "Un verre d’eau au réveil", "Privilégier les céréales complètes",
    ],
    fitness: [
      "Sport du matin 30 min", "Marcher 10 000 pas", "S’étirer 10 min",
      "Aller à la salle", "Courir 20 min", "Sortir le vélo 30 min",
      "Faire 50 pompes", "Planche 2 min", "Séance de yoga 20 min",
      "Corde à sauter 10 min", "Longueur de piscine 30 min", "HIIT 15 min",
      "Toujours prendre les escaliers", "Marche du soir après dîner", "Musculation",
      "Danse cardio 20 min", "Faire 100 squats", "Douche froide ou bain froid",
    ],
    mind: [
      "Méditer 10 min", "Tenir un journal", "Liste de gratitude (3 choses)",
      "Pas de téléphone la 1re heure", "Respiration profonde 5 min", "Lire avant de dormir",
      "Détox numérique 1 h", "Affirmations positives", "Visualisation",
      "Marche consciente 15 min", "Brain dump / écriture libre", "Apprendre à dire non",
      "Limiter les infos", "Méditation scan corporel", "Pas de réseaux avant midi",
      "Thérapie / introspection", "Travailler la patience", "Une tâche à la fois",
    ],
    learning: [
      "Lire 20 pages", "Étudier 45 min", "Pratiquer une langue",
      "Une leçon de cours en ligne", "Réviser les flashcards (Anki)", "Notes sur un podcast",
      "Regarder une conférence TED", "Apprendre un mot nouveau", "Coder 30 min",
      "Rédiger un résumé de ce que j’ai appris", "Écouter un livre audio", "Réflexion / puzzle",
      "Instrument 20 min", "Dessiner 15 min", "Écrire 500 mots",
      "Apprendre une nouvelle recette", "Prise de parole en public", "Lire un article pro",
    ],
    finance: [
      "Noter chaque dépense", "Épargner 10 % du revenu", "Pas d’achats impulsifs",
      "Préparer le déjeuner (pas acheté)", "Bilan budget hebdo", "Résilier un abonnement inutile",
      "Vérifier le solde bancaire", "Mettre de l’argent de côté", "Pas d’achats en ligne aujourd’hui",
      "Comparer les prix avant d’acheter", "Café de la maison", "Revoir les abonnements du mois",
      "Plafond de dépenses quotidien", "Lire sur les finances perso", "Automatiser un paiement",
      "Vendre un objet inutile", "Payer en liquide aujourd’hui", "Planifier les repas anti-gaspillage",
    ],
    sleep: [
      "Au lit avant 22 h 30", "Pas d’écran 1 h avant le coucher", "Réveil à heure fixe",
      "Rituel du soir apaisant", "Pas de café après 14 h", "Chambre sombre et fraîche",
      "Lire 15 min avant de dormir", "Pas de gros repas le soir", "Masque de sommeil",
      "Méditation du sommeil", "Pas d’alcool avant le coucher", "Étirements avant de dormir",
      "To-do pour demain", "Lumière tamisée après 20 h", "Bruit blanc ou sons calmes",
      "Pas de sieste après 15 h", "Téléphone hors de la chambre", "Magnésium",
    ],
    social: [
      "Appeler ou écrire à un ami", "Dîner en famille", "Un geste de gentillesse",
      "Contacter quelqu’un de nouveau", "Réseaux limités à 30 min", "Organiser une sortie",
      "Message de remerciement", "Conversation profonde", "Compliment sincère",
      "Bénévolat ou voisin", "Écoute active", "Écrire une carte ou lettre",
      "Soirée jeux", "Prendre des nouvelles d’un proche", "Rejoindre un club",
      "Pas de téléphone aux repas avec les autres", "Regarder et sourire", "Mentorer ou transmettre",
    ],
    lifestyle: [
      "Faire son lit chaque matin", "Ranger le bureau 5 min", "Meal prep le dimanche",
      "Rituel du soir avant le coucher", "Vérifier la posture chaque heure", "Désencombrer 5 min",
      "Routine soin du matin", "Préparer les vêtements la veille", "Arroser les plantes",
      "Pas de TV aux repas", "Rangement 10 min avant le coucher", "Planifier 3 priorités demain",
      "15 min sur un loisir", "Se désabonner d’un mail", "Organiser un tiroir ou une étagère",
      "Marcher ou vélo plutôt que la voiture", "Routine matinale", "Rangement fichiers numériques 5 min",
    ],
  };

  function getLang() {
    try {
      return window.HBIT?.i18n?.getLang?.() === "fr" ? "fr" : "en";
    } catch (_) { return "en"; }
  }

  function findCategoryForPreset(name) {
    const keys = Object.keys(PRESETS);
    for (let i = 0; i < keys.length; i++) {
      const cat = keys[i];
      if (PRESETS[cat].includes(name)) return cat;
    }
    return null;
  }

  function habitDisplayName(h) {
    const raw = (h && h.name) ? String(h.name) : "";
    if (!raw || getLang() !== "fr") return raw;
    const cat = h.category;
    if (!cat || !PRESETS[cat] || !PRESETS_FR[cat]) return raw;
    const idx = PRESETS[cat].indexOf(raw);
    return idx >= 0 ? PRESETS_FR[cat][idx] : raw;
  }

  function presetChipLabel(enName) {
    const name = String(enName || "");
    if (!name || getLang() !== "fr") return name;
    const cat = findCategoryForPreset(name);
    if (!cat) return name;
    const idx = PRESETS[cat].indexOf(name);
    return idx >= 0 ? PRESETS_FR[cat][idx] : name;
  }

  function heatmapTooltipText(count, dateKey) {
    return t("habits.heatmap.tooltip", "{n} done · {date}", { n: count, date: dateKey });
  }

  const MOTIVATION_CHIPS = ["Health", "Energy", "Confidence", "Stress relief", "Focus", "Family", "Career", "Growth", "Discipline", "Happiness", "Self-esteem", "Productivity", "Longevity", "Mental clarity", "Financial freedom"];
  const OBSTACLE_CHIPS   = ["Time", "Stress", "Phone", "Social plans", "Low energy", "Mood", "Forgetfulness", "Comfort zone", "Procrastination", "Weather", "Cost", "Motivation dips"];
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* ── App state ── */
  const state = {
    uid: null,
    habits: [],
    todayLogs: {},
    allLogs: [],
    habitLogsHydrated: false,
    activeFilter: "all",
    detailId: null,
    detailMonth: null,
    wizard: { open: false, step: 0, data: {}, editId: null },
  };
  let db = null;

  /* ── Firestore refs ── */
  function habitsCol() { return db.collection("users").doc(state.uid).collection("habits"); }
  function logsCol()   { return db.collection("users").doc(state.uid).collection("habitLogs"); }
  function onboardingCol() { return db.collection("users").doc(state.uid).collection("habitOnboarding"); }

  /* ══════════════════════════════════════════════════════════
     DATA LOADING
     ══════════════════════════════════════════════════════════ */
  async function loadData() {
    state.habitLogsHydrated = false;
    renderHeatmap();

    try {
      const [habitsSnap, logsSnap] = await Promise.all([
        habitsCol().get(),
        logsCol().orderBy("dateKey", "desc").limit(1200).get(),
      ]);

      state.habits = habitsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return tb - ta;
        });

      state.allLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.todayLogs = {};
      const today = todayKey();
      state.allLogs.forEach(l => {
        if (l.dateKey === today) {
          state.todayLogs[l.habitId] = l;
        }
      });
    } catch (err) {
      /* silent */
      state.habits = [];
      state.todayLogs = {};
      state.allLogs = [];
    }
    state.habitLogsHydrated = true;
    renderAll();
  }

  /* ══════════════════════════════════════════════════════════
     STREAK ENGINE
     ══════════════════════════════════════════════════════════ */
  function computeStreak(habitId) {
    const logs = state.allLogs
      .filter(l => l.habitId === habitId && l.status === "done")
      .map(l => l.dateKey)
      .sort()
      .reverse();

    const unique = [...new Set(logs)];
    if (!unique.length) return { current: 0, best: 0 };

    let current = 0;
    const d = new Date();
    const tk = todayKey();
    if (unique[0] === tk) {
      current = 1;
      d.setDate(d.getDate() - 1);
    }
    for (let i = (unique[0] === tk ? 1 : 0); i < unique.length; i++) {
      const expected = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      if (unique[i] === expected) {
        current++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    let best = 0, run = 1;
    const sorted = [...new Set(logs)].sort();
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const cur  = new Date(sorted[i]);
      const diff = (cur - prev) / 86400000;
      if (diff === 1) { run++; }
      else { best = Math.max(best, run); run = 1; }
    }
    best = Math.max(best, run);

    return { current, best };
  }

  function getWeekDots(habitId) {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const logsMap = {};
    state.allLogs.filter(l => l.habitId === habitId).forEach(l => {
      logsMap[l.dateKey] = l.status;
    });

    const dots = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const isFuture = d > now;
      const status = logsMap[key] || null;
      dots.push({ key, status, isFuture });
    }
    return dots;
  }

  /* ══════════════════════════════════════════════════════════
     HEATMAP
     ══════════════════════════════════════════════════════════ */
  function renderHeatmap() {
    const grid = $("hbHeatmapGrid");
    const monthsEl = $("hbHeatmapMonths");
    if (!grid) return;

    if (!state.habitLogsHydrated) {
      const totalWeeks = 16;
      const totalDays = totalWeeks * 7;
      grid.innerHTML = "";
      grid.style.gridTemplateColumns = `repeat(${totalWeeks}, 1fr)`;
      grid.setAttribute("role", "img");
      grid.setAttribute("aria-label", t("habits.heatmap.aria", "Habit activity over the last {weeks} weeks. {days} active days.", { weeks: String(totalWeeks), days: "…" }));
      for (let i = 0; i < totalDays; i++) {
        const el = document.createElement("span");
        el.className = "hb-heatmap-cell hb-heatmap-cell--skeleton";
        el.setAttribute("aria-hidden", "true");
        grid.appendChild(el);
      }
      if (monthsEl) {
        monthsEl.innerHTML = "";
        monthsEl.style.height = "14px";
      }
      return;
    }

    const dayMap = {};
    state.allLogs.forEach(l => {
      if (l.status === "done") {
        dayMap[l.dateKey] = (dayMap[l.dateKey] || 0) + 1;
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalWeeks = 16;
    const startDay = new Date(today);
    const todayDow = (today.getDay() + 6) % 7;
    startDay.setDate(today.getDate() - todayDow - (totalWeeks - 1) * 7);

    const cells = [];
    const monthLabels = [];
    let lastMonth = -1;
    const totalDays = totalWeeks * 7;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const count = dayMap[key] || 0;
      const level = count === 0 ? 0 : count <= 1 ? 1 : count <= 2 ? 2 : count <= 4 ? 3 : 4;
      const isFuture = d > today;

      if (i % 7 === 0 && d.getMonth() !== lastMonth) {
        const loc = getLang() === "fr" ? "fr-FR" : "en-US";
        monthLabels.push({ col: Math.floor(i / 7), label: d.toLocaleString(loc, { month: "short" }) });
        lastMonth = d.getMonth();
      }

      cells.push({ key, level: isFuture ? 0 : level, count, isFuture });
    }

    const activeDays = cells.filter(c => !c.isFuture && c.count > 0).length;
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(${totalWeeks}, 1fr)`;
    grid.setAttribute("role", "img");
    grid.setAttribute(
      "aria-label",
      t("habits.heatmap.aria", "Habit activity over the last {weeks} weeks. {days} active days.", {
        weeks: String(totalWeeks),
        days: String(activeDays),
      })
    );
    cells.forEach(c => {
      const el = document.createElement("span");
      el.className = "hb-heatmap-cell";
      el.setAttribute("aria-hidden", "true");
      el.dataset.level = c.isFuture ? "0" : String(c.level);
      if (!c.isFuture && c.count > 0) {
        el.dataset.tooltip = heatmapTooltipText(c.count, c.key);
      }
      grid.appendChild(el);
    });

    if (monthsEl) {
      const colWidth = grid.offsetWidth / totalWeeks;
      monthsEl.innerHTML = "";
      monthLabels.forEach((m, i) => {
        const span = document.createElement("span");
        span.textContent = m.label;
        const leftPx = m.col * colWidth;
        span.style.position = "absolute";
        span.style.left = leftPx + "px";
        monthsEl.appendChild(span);
      });
      monthsEl.style.position = "relative";
      monthsEl.style.height = "14px";
    }
  }

  /* ══════════════════════════════════════════════════════════
     RENDER ALL
     ══════════════════════════════════════════════════════════ */
  function renderAll() {
    renderTodayStrip();
    renderList();
    renderHeatmap();
  }

  function renderTodayStrip() {
    const active = state.habits.filter(h => !h.archived);
    const done = active.filter(h => state.todayLogs[h.id]?.status === "done").length;
    const el = $("hbTodayText");
    const strip = document.querySelector(".hb-today-strip");
    if (el) {
      const prev = el.dataset.prevDone;
      const next = String(done);
      el.textContent = `${t("habits.today.label", "Today")}: ${done} / ${active.length} ${t("habits.today.done", "done")}`;
      if (prev !== undefined && prev !== next && strip) {
        strip.classList.remove("hb-today-bump");
        void strip.offsetWidth;
        strip.classList.add("hb-today-bump");
        strip.addEventListener("animationend", () => strip.classList.remove("hb-today-bump"), { once: true });
      }
      el.dataset.prevDone = next;
    }
  }

  function renderList() {
    const list = $("hbList");
    const empty = $("hbEmpty");
    if (!list) return;

    const filter = state.activeFilter;
    const filtered = state.habits.filter(h => {
      if (filter === "archived") return !!h.archived;
      if (h.archived) return false;
      if (filter === "all") return true;
      return (h.category || "").toLowerCase() === filter;
    });

    list.innerHTML = "";
    list.setAttribute("role", "list");

    if (!filtered.length) {
      if (!state.habitLogsHydrated && state.uid && filter !== "archived") {
        if (empty) empty.style.display = "none";
        for (let i = 0; i < 3; i++) {
          const sk = document.createElement("div");
          sk.className = "hb-card skeleton";
          sk.setAttribute("aria-hidden", "true");
          sk.style.minHeight = "132px";
          list.appendChild(sk);
        }
        return;
      }
      if (empty) {
        empty.style.display = "flex";
        const title = qs(".hb-empty-title", empty);
        const sub   = qs(".hb-empty-sub", empty);
        const cta   = $("btnEmptyNew");
        if (filter === "archived") {
          if (title) title.textContent = t("habits.empty.archived", "No archived habits");
          if (sub)   sub.textContent   = t("habits.empty.archivedSub", "Habits you archive will appear here.");
          if (cta)   cta.style.display = "none";
        } else {
          if (title) title.textContent = t("habits.empty.title", "No habits yet");
          if (sub)   sub.textContent   = t("habits.empty.sub", "Start with one simple habit and build from there.");
          if (cta)   cta.style.display = "";
        }
      }
      return;
    }
    if (empty) empty.style.display = "none";

    filtered.forEach(h => {
      list.appendChild(buildCard(h));
    });
  }

  /* ══════════════════════════════════════════════════════════
     BUILD CARD — Oura-inspired
     ══════════════════════════════════════════════════════════ */
  function buildCard(h) {
    const log = state.todayLogs[h.id];
    const status = log?.status || null;
    const doneDays = Math.max(0, Number(h.doneDays) || 0);
    const goalDays = Math.max(1, Number(h.goalDays) || 30);
    const pct = Math.min(1, doneDays / goalDays);
    const pctRound = Math.round(pct * 100);
    const offset = (RING_CIRC * (1 - pct)).toFixed(2);
    const streak = computeStreak(h.id);
    const weekDots = getWeekDots(h.id);
    const isPaused = !!h.paused;
    const catIcon = CAT_ICON_MAP[h.category] || "";

    const dotClass = status === "done" ? "done" : status === "skip" ? "skip" : status === "start" ? "start" : "";

    const weekHtml = weekDots.map(d => {
      let cls = "hb-week-dot";
      if (d.isFuture) cls += " future";
      else if (d.status === "done") cls += " done";
      else if (d.status === "skip") cls += " skip";
      return `<span class="${cls}"></span>`;
    }).join("");

    let actionHtml;
    if (isPaused) {
      actionHtml = `<button class="hb-card-action-btn" data-action="view" data-id="${h.id}" type="button">${t("habits.card.viewDetails", "View details")}</button>`;
    } else if (status === "done") {
      actionHtml = `<button class="hb-card-action-btn done-state" data-action="done" data-id="${h.id}" type="button">${t("habits.card.undo", "Undo")}</button>`;
    } else {
      actionHtml = `<button class="hb-card-action-btn primary" data-action="${status === "start" ? "done" : "done"}" data-id="${h.id}" type="button">${status === "start" ? t("habits.card.markDone", "Mark done") : t("habits.card.done", "Done")}</button>`;
    }

    const card = document.createElement("div");
    card.className = "hb-card" + (isPaused ? " hb-card--paused" : "");
    card.dataset.id = h.id;
    card.dataset.cat = h.category || "";
    card.setAttribute("role", "listitem");

    card.innerHTML = `
      <div class="hb-card-inner">
        <div class="hb-card-head">
          <div class="hb-card-cat-icon">${catIcon}</div>
          <div class="hb-card-name">${esc(habitDisplayName(h))}</div>
          <span class="hb-card-status-dot ${dotClass}"></span>
        </div>
        <div class="hb-card-ring">
          <svg class="hb-ring-svg" viewBox="0 0 68 68" data-id="${h.id}">
            <circle class="hb-ring-track" cx="34" cy="34" r="${RING_R}"/>
            <circle class="hb-ring-fill" cx="34" cy="34" r="${RING_R}"
                    stroke-dasharray="${RING_CIRC.toFixed(2)}"
                    stroke-dashoffset="${offset}"
                    transform="rotate(-90 34 34)"/>
            <text class="hb-ring-pct" x="34" y="32">${pctRound}%</text>
            <text class="hb-ring-sub" x="34" y="42">${doneDays}/${goalDays}d</text>
          </svg>
        </div>
        <div class="hb-card-streak">
          <span class="hb-streak-flame">\u{1F525}</span>
          <span class="hb-streak-num">${streak.current}</span>
          <span>${t("habits.streak.days", "days")}</span>
          ${streak.best > 0 ? `<span class="hb-streak-best">(${t("habits.streak.best", "best")} ${streak.best})</span>` : ""}
        </div>
        <div class="hb-card-week">${weekHtml}</div>
      </div>
      <div class="hb-card-action">${actionHtml}</div>
    `;

    card.addEventListener("click", e => {
      if (!e.target.closest(".hb-card-action-btn")) openDetail(h.id);
    });

    qsa("[data-action]", card).forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        if (btn.dataset.action === "view") { openDetail(h.id); return; }
        logHabit(btn.dataset.id, btn.dataset.action);
      });
    });

    return card;
  }

  /* ══════════════════════════════════════════════════════════
     LOGGING
     ══════════════════════════════════════════════════════════ */
  function countActiveDoneToday() {
    const active = state.habits.filter(h => !h.archived);
    if (!active.length) return { active: 0, done: 0 };
    const done = active.filter(h => state.todayLogs[h.id]?.status === "done").length;
    return { active: active.length, done };
  }

  function maybeCelebrateAllHabitsDone(wasAllDoneBefore) {
    const { active, done } = countActiveDoneToday();
    if (!active || done !== active || wasAllDoneBefore) return;
    try {
      const key = `hbit_confetti_${todayKey()}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch (_) {}
    const msg = t("habits.confetti.allDone", "All habits complete! 🎉");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) window.HBIT?.confetti?.burst?.({ duration: 1500, count: 60 });
    window.HBIT?.toast?.success?.(msg);
  }

  async function logHabit(habitId, newStatus) {
    if (!state.uid) return;
    const existing = state.todayLogs[habitId];
    const today = todayKey();
    const { active: nActive, done: doneBefore } = countActiveDoneToday();
    const wasAllDoneBefore = nActive > 0 && doneBefore === nActive;

    if (newStatus === "done" && existing?.status === "done") {
      try {
        await logsCol().doc(existing.id).delete();
        await habitsCol().doc(habitId).update({
          doneDays: firebase.firestore.FieldValue.increment(-1),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        const h = state.habits.find(x => x.id === habitId);
        if (h) h.doneDays = Math.max(0, (h.doneDays || 0) - 1);
        state.allLogs = state.allLogs.filter(l => l.id !== existing.id);
        delete state.todayLogs[habitId];
      } catch (err) { /* silent */ }
      renderAll();
      window.dispatchEvent(new Event("hbit:data-changed"));
      return;
    }

    let logOk = false;
    try {
      let logId;
      if (existing) {
        await logsCol().doc(existing.id).update({
          status: newStatus,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        logId = existing.id;
        if (existing.status === "done" && newStatus !== "done") {
          await habitsCol().doc(habitId).update({
            doneDays: firebase.firestore.FieldValue.increment(-1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          const h = state.habits.find(x => x.id === habitId);
          if (h) h.doneDays = Math.max(0, (h.doneDays || 0) - 1);
        }
        if (existing.status !== "done" && newStatus === "done") {
          await habitsCol().doc(habitId).update({
            doneDays: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          const h = state.habits.find(x => x.id === habitId);
          if (h) h.doneDays = (h.doneDays || 0) + 1;
        }
        const idx = state.allLogs.findIndex(l => l.id === logId);
        if (idx !== -1) state.allLogs[idx].status = newStatus;
      } else {
        const ref = await logsCol().add({
          habitId, dateKey: today, status: newStatus,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        logId = ref.id;
        if (newStatus === "done") {
          await habitsCol().doc(habitId).update({
            doneDays: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          const h = state.habits.find(x => x.id === habitId);
          if (h) h.doneDays = (h.doneDays || 0) + 1;
        }
        const newLog = { id: logId, habitId, dateKey: today, status: newStatus };
        state.allLogs.unshift(newLog);
      }
      state.todayLogs[habitId] = { id: logId, habitId, dateKey: today, status: newStatus };
      logOk = true;
    } catch (err) { /* silent */ }

    renderAll();
    maybeCelebrateAllHabitsDone(wasAllDoneBefore);
    if (logOk && newStatus === "done") {
      const cardEl = document.querySelector('.hb-card[data-id="' + String(habitId).replace(/"/g, "") + '"]');
      if (cardEl) {
        cardEl.classList.remove("hb-card--done-pulse");
        void cardEl.offsetWidth;
        cardEl.classList.add("hb-card--done-pulse");
        cardEl.addEventListener("animationend", () => cardEl.classList.remove("hb-card--done-pulse"), { once: true });
      }
      void maybeStreakMilestone(habitId);
    }
    window.dispatchEvent(new Event("hbit:data-changed"));
  }

  function closeMilestoneModal() {
    const el = $("hbMilestoneOverlay");
    if (!el) return;
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  async function maybeStreakMilestone(habitId) {
    if (!habitId || !db) return;
    const st = computeStreak(habitId);
    const tier = [7, 30, 100].find((n) => n === st.current);
    if (!tier) return;
    const h = state.habits.find((x) => x.id === habitId);
    if (!h) return;
    const prev = Array.isArray(h.milestonesShown) ? h.milestonesShown : [];
    if (prev.includes(tier)) return;
    try {
      await habitsCol().doc(habitId).update({
        milestonesShown: firebase.firestore.FieldValue.arrayUnion(tier),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      h.milestonesShown = [...prev, tier];
    } catch (e) {
      /* silent */
      return;
    }
    showMilestoneModal(tier, st.current);
  }

  function showMilestoneModal(tier, n) {
    const el = $("hbMilestoneOverlay");
    if (!el) return;
    const icon = $("hbMsIcon");
    const titleEl = $("hbMsTitle");
    const subEl = $("hbMsSub");
    const emoji = tier === 7 ? "\u{1F525}" : tier === 30 ? "\u{26A1}" : "\u{1F451}";
    if (icon) icon.textContent = emoji;
    if (titleEl) {
      titleEl.textContent = t("habits.milestone.title", "{n}-day streak!").replace(/\{n\}/g, String(n));
    }
    const subKey =
      tier === 7 ? "habits.milestone.sub7" : tier === 30 ? "habits.milestone.sub30" : "habits.milestone.sub100";
    const subFb =
      tier === 7
        ? "One week strong — consistency is building."
        : tier === 30
          ? "A full month of showing up."
          : "Legendary dedication.";
    if (subEl) subEl.textContent = t(subKey, subFb);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) window.HBIT?.confetti?.burst?.({ duration: 1500, count: 60 });

    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("hbMsClose")?.focus();
    window.dispatchEvent(new CustomEvent("hbit:streak-milestone", { detail: { tier, n } }));
  }

  /* ══════════════════════════════════════════════════════════
     DETAIL MODAL + MONTH CALENDAR
     ══════════════════════════════════════════════════════════ */
  function openDetail(habitId) {
    const h = state.habits.find(x => x.id === habitId);
    if (!h) return;
    state.detailId = habitId;
    state.detailMonth = new Date();
    state.detailMonth.setDate(1);

    renderDetailContent(h);

    const modal = $("detailModal");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function renderDetailContent(h) {
    const log = state.todayLogs[h.id];
    const status = log?.status || null;
    const streak = computeStreak(h.id);
    const doneDays = Math.max(0, h.doneDays || 0);
    const goalDays = Math.max(1, h.goalDays || 30);
    const pct = Math.max(0, Math.min(100, Math.round((doneDays / goalDays) * 100)));

    $("detailTitle").textContent = habitDisplayName(h);
    const catId = (h.category || "lifestyle").toLowerCase();
    const catLbl = t("habits.chip." + catId, h.category || "General");
    const fq = (h.frequency || "daily").toLowerCase();
    const freqLbl = t("habits.freq." + fq, h.frequency || "daily");
    $("detailSub").textContent = [catLbl, freqLbl].join(" \u00b7 ");

    const archiveBtn = $("detailArchive");
    const pauseBtn   = $("detailPause");
    const editBtn    = $("detailEdit");
    if (archiveBtn) archiveBtn.textContent = h.archived ? t("habits.det.restore", "Restore") : t("habits.actions.archive", "Archive");
    if (editBtn) editBtn.style.display = h.archived ? "none" : "";
    if (pauseBtn) {
      pauseBtn.style.display = h.archived ? "none" : "";
      pauseBtn.textContent = h.paused ? t("habits.det.resume", "Resume") : t("habits.det.pause", "Pause");
    }

    const calHtml = renderDetailCalendar(h.id, state.detailMonth);

    $("detailBody").innerHTML = `
      ${calHtml}
      <div class="hb-det-stat-row">
        <div class="hb-det-stat">
          <div class="hb-det-stat-label">${t("habits.det.done", "Done")}</div>
          <div class="hb-det-stat-val">${doneDays}</div>
        </div>
        <div class="hb-det-stat">
          <div class="hb-det-stat-label">${t("habits.det.streak", "Streak")}</div>
          <div class="hb-det-stat-val">${streak.current}</div>
        </div>
        <div class="hb-det-stat">
          <div class="hb-det-stat-label">${t("habits.det.bestStreak", "Best")}</div>
          <div class="hb-det-stat-val">${streak.best}</div>
        </div>
        <div class="hb-det-stat">
          <div class="hb-det-stat-label">${t("habits.det.rate", "Rate")}</div>
          <div class="hb-det-stat-val">${pct}%</div>
        </div>
      </div>
      ${h.paused ? `<div class="hb-det-paused-banner">${t("habits.det.pausedMsg", "This habit is paused. Resume it to keep tracking.")}</div>` : ""}
      <div class="hb-det-actions">
        <button class="hb-det-action-btn ${status === "done" ? "done-state" : "primary"}"
                id="detActDone" type="button" ${h.paused ? "disabled" : ""}>
          ${status === "done" ? t("habits.detail.undo", "Undo done") : status === "start" ? t("habits.spot.markDone", "Mark done") : t("habits.card.done", "Done")}
        </button>
        <button class="hb-det-action-btn ${status === "skip" ? "skip-state" : ""}"
                id="detActSkip" type="button" ${h.paused ? "disabled" : ""}>
          ${status === "skip" ? t("habits.detail.undoSkip", "Undo skip") : t("habits.spot.skip", "Skip today")}
        </button>
      </div>
    `;

    $("detActDone")?.addEventListener("click", () => {
      const l = state.todayLogs[h.id];
      const action = l?.status === "done" ? "done" : (l?.status === "start" ? "done" : "done");
      logHabit(h.id, action);
      closeDetail();
    });
    $("detActSkip")?.addEventListener("click", () => {
      logHabit(h.id, "skip");
      closeDetail();
    });

    qs(".hb-det-cal-prev")?.addEventListener("click", () => {
      state.detailMonth.setMonth(state.detailMonth.getMonth() - 1);
      renderDetailContent(h);
    });
    qs(".hb-det-cal-next")?.addEventListener("click", () => {
      state.detailMonth.setMonth(state.detailMonth.getMonth() + 1);
      renderDetailContent(h);
    });
  }

  function renderDetailCalendar(habitId, monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const today = todayKey();

    const logsMap = {};
    state.allLogs.filter(l => l.habitId === habitId).forEach(l => {
      logsMap[l.dateKey] = l.status;
    });

    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
    const monthName = firstDay.toLocaleString("default", { month: "long", year: "numeric" });

    let cellsHtml = dayLabels.map(d => `<div class="hb-det-cal-day-label">${d}</div>`).join("");
    for (let i = 0; i < startDow; i++) {
      cellsHtml += `<div class="hb-det-cal-cell"></div>`;
    }
    for (let d = 1; d <= totalDays; d++) {
      const key = `${year}-${pad2(month + 1)}-${pad2(d)}`;
      const status = logsMap[key] || "";
      const isFuture = key > today;
      const isToday = key === today;
      let cls = "hb-det-cal-cell";
      if (isFuture) cls += " future";
      else if (status === "done") cls += " done";
      else if (status === "skip") cls += " skip";
      if (isToday) cls += " today";
      cellsHtml += `<div class="${cls}">${d}</div>`;
    }

    return `
      <div class="hb-det-calendar">
        <div class="hb-det-cal-nav">
          <button class="hb-det-cal-prev" type="button" aria-label="Previous month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="hb-det-cal-month">${monthName}</span>
          <button class="hb-det-cal-next" type="button" aria-label="Next month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="hb-det-cal-grid">${cellsHtml}</div>
      </div>
    `;
  }

  function closeDetail() {
    const modal = $("detailModal");
    if (modal) modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.detailId = null;
  }

  /* ══════════════════════════════════════════════════════════
     WIZARD
     ══════════════════════════════════════════════════════════ */
  function openWizard(editHabit) {
    state.wizard.step = 0;
    state.wizard.editId = editHabit?.id || null;

    if (editHabit) {
      state.wizard.data = {
        intent: editHabit.intent || "", category: editHabit.category || "",
        name: editHabit.name || "", motivationTags: editHabit.motivationTags || [],
        frequency: editHabit.frequency || "daily", customDays: editHabit.customDays || [],
        difficulty: editHabit.difficulty || "moderate", when: editHabit.when || "flexible",
        obstacles: editHabit.obstacles || [], goalDays: editHabit.goalDays || 30,
      };
    } else {
      state.wizard.data = {
        intent: "", category: "", name: "",
        motivationTags: [], frequency: "daily", customDays: [],
        difficulty: "moderate", when: "flexible",
        obstacles: [], goalDays: 30,
      };
    }

    buildWizardSlides();
    syncWizardUI();
    $("wizardModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    autoFocusStep();
  }

  function closeWizard() {
    $("wizardModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function buildWizardSlides() {
    const slides = $("wzSlides");
    slides.innerHTML = "";

    const dots = $("wzDots");
    dots.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const d = document.createElement("button");
      d.className = "wz-dot";
      d.type = "button";
      d.textContent = String(i + 1);
      d.setAttribute("aria-label", `Step ${i + 1}`);
      d.addEventListener("click", () => goToStep(i));
      dots.appendChild(d);
    }

    slides.appendChild(buildStep1());
    slides.appendChild(buildStep2());
    slides.appendChild(buildStep3());
    slides.appendChild(buildStep4());
    slides.appendChild(buildStep5());
    slides.appendChild(buildStep6());
    slides.appendChild(buildStep7());

    refreshPresetChips();
  }

  function makeSlide() {
    const div = document.createElement("div");
    div.className = "wz-slide";
    return div;
  }

  function buildStep1() {
    const s = makeSlide();
    s.innerHTML = `<div class="wz-slide-inner">
      <div class="wz-slide-title">${t("habits.wz.step1.title", "What's your goal?")}</div>
      <div class="wz-slide-sub">${t("habits.wz.step1.sub", "Choose your direction to get started.")}</div>
      <div class="wz-intent-grid">
        ${intentCard("start", "\u{1F680}", "Start", "Build something new")}
        ${intentCard("maintain", "\u{1F3AF}", "Maintain", "Keep what\u2019s already working")}
        ${intentCard("stop", "\u{1F6D1}", "Stop", "Break a bad habit for good")}
      </div>
    </div>`;
    qsa(".wz-intent-card", s).forEach(btn => {
      btn.addEventListener("click", () => {
        state.wizard.data.intent = btn.dataset.intent;
        qsa(".wz-intent-card", s).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    return s;
  }

  function intentCard(id, emoji, label, sub) {
    const a = state.wizard.data.intent === id ? " active" : "";
    return `<button class="wz-intent-card${a}" data-intent="${id}" type="button">
      <div class="wz-intent-icon">${emoji}</div>
      <div class="wz-intent-text"><div class="wz-intent-label">${label}</div><div class="wz-intent-sub">${sub}</div></div>
      <div class="wz-intent-check"><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><polyline points="1 4 4 7 9 1" stroke="#07090e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </button>`;
  }

  function buildStep2() {
    const s = makeSlide();
    const catCards = CATEGORIES.map(c => {
      const a = state.wizard.data.category === c.id ? " active" : "";
      return `<button class="wz-cat-card${a}" data-cat="${c.id}" type="button"><div class="wz-cat-icon">${c.icon}</div><div class="wz-cat-label">${esc(t("habits.chip." + c.id, c.label))}</div></button>`;
    }).join("");
    s.innerHTML = `<div class="wz-slide-inner">
      <div class="wz-slide-title">${t("habits.wz.step2.title", "What area of life?")}</div>
      <div class="wz-slide-sub">${t("habits.wz.step2.sub", "Pick the domain that fits your habit.")}</div>
      <div class="wz-cat-grid">${catCards}</div>
    </div>`;
    qsa(".wz-cat-card", s).forEach(btn => {
      btn.addEventListener("click", () => {
        state.wizard.data.category = btn.dataset.cat;
        qsa(".wz-cat-card", s).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        refreshPresetChips();
      });
    });
    return s;
  }

  function buildStep3() {
    const s = makeSlide();
    s.id = "wzStep3";
    s.innerHTML = `<div class="wz-slide-inner">
      <div class="wz-slide-title">${t("habits.wz.step3.title", "Choose your habit")}</div>
      <div class="wz-slide-sub">${t("habits.wz.step3.sub", "Select a suggestion or type your own.")}</div>
      <div class="wz-preset-chips" id="wzPresetChips"></div>
      <div class="wz-custom-field">
        <div class="wz-field-label">${t("habits.wz.orCustom", "Or write your own")}</div>
        <input class="wz-input" id="wzCustomName" type="text" placeholder="e.g. Practice guitar 15 min" maxlength="80" value="${esc(state.wizard.data.name || "")}" />
      </div>
    </div>`;
    const input = qs("#wzCustomName", s);
    input.addEventListener("input", () => {
      state.wizard.data.name = input.value.trim();
      const presetWrap = $("wzPresetChips") || qs("#wzPresetChips", s);
      if (presetWrap) qsa(".wz-chip", presetWrap).forEach(c => c.classList.remove("active"));
    });
    return s;
  }

  function refreshPresetChips() {
    const wrap = $("wzPresetChips");
    if (!wrap) return;
    const cat = state.wizard.data.category;
    const list = (cat && PRESETS[cat]) ? PRESETS[cat] : Object.entries(PRESETS).flatMap(([, v]) => v.slice(0, 2)).slice(0, 16);
    wrap.innerHTML = list.map(name => {
      const a = state.wizard.data.name === name ? " active" : "";
      return `<button class="wz-chip${a}" data-preset="${esc(name)}" type="button">${esc(presetChipLabel(name))}</button>`;
    }).join("");
    qsa(".wz-chip", wrap).forEach(btn => {
      btn.addEventListener("click", () => {
        state.wizard.data.name = btn.dataset.preset;
        const ci = $("wzCustomName");
        if (ci) ci.value = "";
        qsa(".wz-chip", wrap).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  function buildStep4() {
    const s = makeSlide();
    const chips = MOTIVATION_CHIPS.map(m => {
      const a = (state.wizard.data.motivationTags || []).includes(m) ? " active" : "";
      return `<button class="wz-chip${a}" data-mot="${esc(m)}" type="button">${esc(m)}</button>`;
    }).join("");
    s.innerHTML = `<div class="wz-slide-inner">
      <div class="wz-slide-title">${t("habits.wz.step4.title", "Why does this matter?")}</div>
      <div class="wz-slide-sub">${t("habits.wz.step4.sub", "Select all that resonate (optional).")}</div>
      <div class="wz-preset-chips" id="wzMotChips">${chips}</div>
      <div class="wz-custom-field">
        <div class="wz-field-label">${t("habits.wz.personalNote", "Personal note (optional)")}</div>
        <textarea class="wz-textarea" id="wzMotText" placeholder="${t("habits.wz.notePlaceholder", "Remind yourself why this habit is worth it\u2026")}" maxlength="200">${esc(state.wizard.data.motivationNote || "")}</textarea>
      </div>
    </div>`;
    qsa(".wz-chip", qs("#wzMotChips", s)).forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.mot;
        const tags = state.wizard.data.motivationTags || [];
        const idx = tags.indexOf(val);
        if (idx === -1) { tags.push(val); btn.classList.add("active"); }
        else { tags.splice(idx, 1); btn.classList.remove("active"); }
        state.wizard.data.motivationTags = tags;
      });
    });
    const ta = qs("#wzMotText", s);
    ta.addEventListener("input", () => { state.wizard.data.motivationNote = ta.value.trim(); });
    return s;
  }

  function buildStep5() {
    const s = makeSlide();
    const freqMap = {
      daily: t("habits.freq.daily", "Daily"),
      weekdays: t("habits.freq.weekdays", "Weekdays"),
      custom: t("habits.freq.custom", "Custom"),
    };
    const diffMap = { easy: "Easy \u{1F33F}", moderate: "Moderate \u{1F525}", hard: "Hard \u{1F4AA}" };
    const freqBtns = Object.entries(freqMap).map(([k, l]) => {
      const a = state.wizard.data.frequency === k ? " active" : "";
      return `<button class="wz-opt-btn${a}" data-freq="${k}" type="button">${l}</button>`;
    }).join("");
    const diffBtns = Object.entries(diffMap).map(([k, l]) => {
      const a = state.wizard.data.difficulty === k ? " active" : "";
      return `<button class="wz-opt-btn${a}" data-diff="${k}" type="button">${l}</button>`;
    }).join("");
    const dayShort = { Mon: "Mo", Tue: "Tu", Wed: "We", Thu: "Th", Fri: "Fr", Sat: "Sa", Sun: "Su" };
    const dayShortFr = { Mon: "Lu", Tue: "Ma", Wed: "Me", Thu: "Je", Fri: "Ve", Sat: "Sa", Sun: "Di" };
    const dayBtns = DAYS.map(d => {
      const a = (state.wizard.data.customDays || []).includes(d) ? " active" : "";
      const lbl = getLang() === "fr" ? dayShortFr[d] : dayShort[d];
      return `<button class="wz-day-btn${a}" data-day="${d}" type="button">${lbl}</button>`;
    }).join("");
    const daysVis = state.wizard.data.frequency === "custom" ? "" : ' style="display:none"';
    s.innerHTML = `<div class="wz-slide-inner">
      <div class="wz-slide-title">${t("habits.wz.step5.title", "How often?")}</div>
      <div class="wz-option-row" id="wzFreqBtns">${freqBtns}</div>
      <div class="wz-days-row" id="wzDaysRow"${daysVis}>${dayBtns}</div>
      <div class="wz-slide-section">${t("habits.wz.difficulty", "How hard is it for you?")}</div>
      <div class="wz-option-row" id="wzDiffBtns">${diffBtns}</div>
    </div>`;
    qsa("[data-freq]", s).forEach(btn => {
      btn.addEventListener("click", () => {
        state.wizard.data.frequency = btn.dataset.freq;
        qsa("[data-freq]", s).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const row = $("wzDaysRow");
        if (row) row.style.display = btn.dataset.freq === "custom" ? "flex" : "none";
      });
    });
    qsa("[data-day]", s).forEach(btn => {
      btn.addEventListener("click", () => {
        const d = btn.dataset.day;
        const days = state.wizard.data.customDays || [];
        const idx = days.indexOf(d);
        if (idx === -1) { days.push(d); btn.classList.add("active"); }
        else { days.splice(idx, 1); btn.classList.remove("active"); }
        state.wizard.data.customDays = days;
      });
    });
    qsa("[data-diff]", s).forEach(btn => {
      btn.addEventListener("click", () => {
        state.wizard.data.difficulty = btn.dataset.diff;
        qsa("[data-diff]", s).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    return s;
  }

  function buildStep6() {
    const s = makeSlide();
    const whenMap = { morning: "\u2600\uFE0F Morning", afternoon: "\u{1F324}\uFE0F Afternoon", evening: "\u{1F319} Evening", flexible: "\u{1F552} Flexible" };
    const whenBtns = Object.entries(whenMap).map(([k, l]) => {
      const a = state.wizard.data.when === k ? " active" : "";
      return `<button class="wz-opt-btn${a}" data-when="${k}" type="button">${l}</button>`;
    }).join("");
    const obsChips = OBSTACLE_CHIPS.map(o => {
      const a = (state.wizard.data.obstacles || []).includes(o) ? " active" : "";
      return `<button class="wz-chip${a}" data-obs="${esc(o)}" type="button">${esc(o)}</button>`;
    }).join("");
    s.innerHTML = `<div class="wz-slide-inner">
      <div class="wz-slide-title">${t("habits.wz.step6.title", "When will you do it?")}</div>
      <div class="wz-option-row" id="wzWhenBtns" style="flex-wrap:wrap">${whenBtns}</div>
      <div class="wz-slide-section">${t("habits.wz.obstacles", "What might get in the way?")}</div>
      <div class="wz-slide-sub" style="margin-top:-14px">${t("habits.wz.obstaclesSub", "Pick your likely obstacles (optional).")}</div>
      <div class="wz-preset-chips" id="wzObsChips">${obsChips}</div>
    </div>`;
    qsa("[data-when]", s).forEach(btn => {
      btn.addEventListener("click", () => {
        state.wizard.data.when = btn.dataset.when;
        qsa("[data-when]", s).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    qsa("[data-obs]", s).forEach(btn => {
      btn.addEventListener("click", () => {
        const o = btn.dataset.obs;
        const obs = state.wizard.data.obstacles || [];
        const idx = obs.indexOf(o);
        if (idx === -1) { obs.push(o); btn.classList.add("active"); }
        else { obs.splice(idx, 1); btn.classList.remove("active"); }
        state.wizard.data.obstacles = obs;
      });
    });
    return s;
  }

  function buildStep7() {
    const s = makeSlide();
    s.id = "wzStep7";
    const goals = [7, 14, 30, 60, 90];
    const goalChips = goals.map(g => {
      const a = state.wizard.data.goalDays === g ? " active" : "";
      return `<button class="wz-chip${a}" data-goal="${g}" type="button">${g} days</button>`;
    }).join("") + `<button class="wz-chip${!goals.includes(state.wizard.data.goalDays) ? " active" : ""}" data-goal="custom" type="button">Custom</button>`;
    const isCustomGoal = !goals.includes(state.wizard.data.goalDays);
    const g0 = state.wizard.data.goalDays || 30;
    s.innerHTML = `<div class="wz-slide-inner">
      <div class="wz-slide-title">${t("habits.wz.step7.title", "Set your goal")}</div>
      <div class="wz-slide-sub">${t("habits.wz.step7.sub", "How many days to complete your habit?")}</div>
      <div class="wz-preset-chips" id="wzGoalChips">${goalChips}</div>
      <div class="wz-custom-field" id="wzCustomGoalWrap" style="${isCustomGoal ? "" : "display:none"}">
        <div class="wz-field-label">${t("habits.wz.customDays", "Custom number of days")}</div>
        <input class="wz-input" id="wzCustomGoal" type="number" min="1" max="999" step="1" placeholder="e.g. 45" value="${isCustomGoal ? g0 : ""}" />
      </div>
      <div class="wz-goal-preview">
        <div class="wz-goal-ring-wrap">
          <svg class="wz-goal-ring-svg" viewBox="0 0 80 80">
            <circle class="wz-goal-track" cx="40" cy="40" r="${GOAL_R}"/>
            <circle class="wz-goal-fill" id="wzGoalRing" cx="40" cy="40" r="${GOAL_R}"
                    stroke-dasharray="${GOAL_CIRC.toFixed(2)}" stroke-dashoffset="${(GOAL_CIRC * 0.92).toFixed(2)}"
                    transform="rotate(-90 40 40)"/>
          </svg>
          <div class="wz-goal-label">
            <div class="wz-goal-num" id="wzGoalNum">${g0}</div>
            <div class="wz-goal-unit">${t("habits.wz.daysUnit", "days")}</div>
          </div>
        </div>
      </div>
      <div class="wz-summary-box" id="wzSummaryBox">
        <div class="wz-summary-name" id="wzSummaryName">${esc(state.wizard.data.name ? habitDisplayName({ name: state.wizard.data.name, category: state.wizard.data.category }) : t("habits.wz.summaryPlaceholder", "Your habit"))}</div>
        <div class="wz-summary-meta" id="wzSummaryMeta">${buildSummaryMeta()}</div>
      </div>
    </div>`;

    function setGoal(g) {
      state.wizard.data.goalDays = g;
      const num = $("wzGoalNum"); if (num) num.textContent = String(g);
      const ring = $("wzGoalRing");
      if (ring) ring.style.strokeDashoffset = String(GOAL_CIRC * (1 - Math.min(1, Math.max(0.04, g / 90))));
      const metaEl = $("wzSummaryMeta"); if (metaEl) metaEl.textContent = buildSummaryMeta();
    }

    qsa("[data-goal]", s).forEach(btn => {
      btn.addEventListener("click", () => {
        qsa("[data-goal]", s).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const cw = $("wzCustomGoalWrap");
        if (btn.dataset.goal === "custom") {
          if (cw) cw.style.display = "";
          const ci = $("wzCustomGoal");
          if (ci && ci.value) setGoal(parseInt(ci.value, 10) || 30);
        } else {
          if (cw) cw.style.display = "none";
          setGoal(parseInt(btn.dataset.goal, 10));
        }
      });
    });
    const ci = $("wzCustomGoal");
    if (ci) ci.addEventListener("input", () => { const v = parseInt(ci.value, 10); if (v > 0) setGoal(v); });
    return s;
  }

  function buildSummaryMeta() {
    const d = state.wizard.data;
    const parts = [];
    if (d.frequency) parts.push(d.frequency.charAt(0).toUpperCase() + d.frequency.slice(1));
    if (d.goalDays) parts.push(`${d.goalDays} days`);
    if (d.difficulty) parts.push(d.difficulty);
    return parts.join(" \u00b7 ") || "\u2014";
  }

  /* ── Wizard navigation ── */
  const WIZARD_TOTAL = 7;

  function showActiveSlide(step) {
    const container = $("wzSlides");
    if (!container) return;
    const slides = qsa(".wz-slide", container);
    slides.forEach((s, i) => {
      s.classList.toggle("wz-active", i === step);
    });
  }

  function syncWizardUI() {
    const step = state.wizard.step;

    showActiveSlide(step);

    const label = $("wzStepLabel");
    if (label) label.textContent = `${t("habits.wz.step", "Step")} ${step + 1} ${t("habits.wz.of", "of")} ${WIZARD_TOTAL}`;

    const fill = $("wzProgressFill");
    if (fill) fill.style.width = `${(step / (WIZARD_TOTAL - 1)) * 100}%`;

    qsa(".wz-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === step);
      dot.classList.toggle("done", i < step);
    });

    const backBtn = $("wzBack");
    const nextBtn = $("wzNext");
    if (backBtn) {
      backBtn.disabled = step === 0;
      backBtn.style.visibility = step === 0 ? "hidden" : "visible";
    }

    if (nextBtn) {
      nextBtn.disabled = false;
      if (step === WIZARD_TOTAL - 1) {
        nextBtn.textContent = state.wizard.editId ? t("habits.wz.saveEdit", "Save changes") : t("habits.wz.create", "Create habit");
        nextBtn.classList.add("wz-btn-save");
      } else {
        nextBtn.innerHTML = `${t("habits.wz.continue", "Continue")} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
        nextBtn.classList.remove("wz-btn-save");
      }
    }

    if (step === 6) {
      const sn = $("wzSummaryName");
      if (sn) {
        sn.textContent = state.wizard.data.name
          ? habitDisplayName({ name: state.wizard.data.name, category: state.wizard.data.category })
          : t("habits.wz.summaryPlaceholder", "Your habit");
      }
      const sm = $("wzSummaryMeta"); if (sm) sm.textContent = buildSummaryMeta();
    }

    if (step === 2) {
      refreshPresetChips();
    }
  }

  function goToStep(n) {
    const target = Math.max(0, Math.min(WIZARD_TOTAL - 1, n));
    state.wizard.step = target;
    syncWizardUI();
    autoFocusStep();
  }

  function autoFocusStep() {
    requestAnimationFrame(() => {
      const allSlides = qsa(".wz-slide");
      const slide = allSlides[state.wizard.step];
      if (!slide) return;
      const focusable = qs("input:not([type=hidden]), textarea, select", slide);
      if (focusable) focusable.focus();
    });
  }

  function validateStep() {
    const d = state.wizard.data;
    const step = state.wizard.step;
    switch (step) {
      case 0: return !!d.intent;
      case 1: return !!d.category;
      case 2: return !!(d.name && d.name.trim().length > 0);
      case 3: return true;
      case 4: return !!(d.frequency && d.difficulty);
      case 5: return !!d.when;
      case 6: return true;
      default: return true;
    }
  }

  function showStepError(msg) {
    const err = $("wzErrorMsg");
    if (!err) return;
    err.textContent = msg;
    err.classList.remove("shake");
    void err.offsetWidth;
    err.classList.add("shake");
    setTimeout(() => { if (err) err.textContent = ""; }, 2500);
  }

  /* ── Save habit ── */
  async function saveHabit() {
    const d = state.wizard.data;
    if (!d.name?.trim()) { showStepError(t("habits.wz.err.name", "Please enter a habit name.")); return; }
    if (!d.category) { showStepError(t("habits.wz.err.category", "Please choose a category.")); return; }

    if (!state.wizard.editId) {
      const nameNorm = d.name.trim().toLowerCase();
      const dup = state.habits.find(h => !h.archived && h.name.trim().toLowerCase() === nameNorm);
      if (dup) {
        showStepError(`"${d.name.trim()}" already exists.`);
        setTimeout(() => { closeWizard(); openWizard(dup); }, 1000);
        return;
      }
    }

    const btnNext = $("wzNext");
    if (btnNext) { btnNext.disabled = true; btnNext.textContent = t("habits.wz.saving", "Saving\u2026"); }

    try {
      const trimmedName = d.name.trim();
      const payload = {
        name: trimmedName, nameNormalized: trimmedName.toLowerCase(),
        category: d.category, intent: d.intent || "start",
        frequency: d.frequency || "daily", customDays: d.customDays || [],
        when: d.when || "flexible", goalDays: Number(d.goalDays) || 30,
        motivationTags: d.motivationTags || [], obstacles: d.obstacles || [],
        difficulty: d.difficulty || "moderate",
        archived: false, pinned: false, isActive: true,
        color: "#34D399", icon: "\u2726",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (state.wizard.editId) {
        await habitsCol().doc(state.wizard.editId).update(payload);
        const idx = state.habits.findIndex(x => x.id === state.wizard.editId);
        if (idx !== -1) state.habits[idx] = { ...state.habits[idx], ...payload };
      } else {
        payload.doneDays = 0;
        payload.order = state.habits.length;
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await habitsCol().add(payload);
        state.habits.unshift({ id: ref.id, ...payload, doneDays: 0 });
      }

      const onboardId = state.wizard.editId || (state.habits[0]?.id);
      if (onboardId) {
        onboardingCol().doc(onboardId).set({
          stepsData: {
            intent: d.intent, category: d.category, name: d.name,
            motivationTags: d.motivationTags, motivationNote: d.motivationNote || "",
            frequency: d.frequency, customDays: d.customDays,
            difficulty: d.difficulty, when: d.when,
            obstacles: d.obstacles, goalDays: d.goalDays,
          },
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }

    } catch (err) {
      console.error("[habits] saveHabit:", err);
      if (btnNext) { btnNext.disabled = false; btnNext.textContent = "Retry"; }
      return;
    }

    closeWizard();
    renderAll();
    window.dispatchEvent(new Event("hbit:data-changed"));
  }

  /* ── Archive / Delete / Pause ── */
  async function archiveHabit(habitId) {
    if (!habitId) return;
    try {
      await habitsCol().doc(habitId).update({ archived: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      const h = state.habits.find(x => x.id === habitId);
      if (h) h.archived = true;
    } catch (err) { /* silent */ }
    closeDetail(); renderAll();
    window.dispatchEvent(new Event("hbit:data-changed"));
  }

  async function deleteHabit(habitId) {
    if (!habitId) return;
    if (!confirm(t("habits.det.confirmDelete", "Delete this habit permanently?"))) return;
    try {
      await habitsCol().doc(habitId).delete();
      state.habits = state.habits.filter(x => x.id !== habitId);
      delete state.todayLogs[habitId];
    } catch (err) { /* silent */ }
    closeDetail(); renderAll();
    window.dispatchEvent(new Event("hbit:data-changed"));
  }

  async function restoreHabit(habitId) {
    if (!habitId) return;
    try {
      await habitsCol().doc(habitId).update({ archived: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      const h = state.habits.find(x => x.id === habitId);
      if (h) h.archived = false;
    } catch (err) { /* silent */ }
    renderAll();
  }

  async function pauseHabit(habitId) {
    if (!habitId) return;
    try {
      await habitsCol().doc(habitId).update({ paused: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      const h = state.habits.find(x => x.id === habitId);
      if (h) h.paused = true;
    } catch (err) { /* silent */ }
    closeDetail(); renderAll();
  }

  async function resumeHabit(habitId) {
    if (!habitId) return;
    try {
      await habitsCol().doc(habitId).update({ paused: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      const h = state.habits.find(x => x.id === habitId);
      if (h) h.paused = false;
    } catch (err) { /* silent */ }
    closeDetail(); renderAll();
  }

  /* ── Header date ── */
  function setHeaderDate() {
    const el = $("hbDate");
    if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  }

  /* ══════════════════════════════════════════════════════════
     EVENT BINDING
     ══════════════════════════════════════════════════════════ */
  function bindEvents() {
    [$("btnNewHabit"), $("btnEmptyNew")].forEach(btn => {
      btn?.addEventListener("click", () => openWizard());
    });

    $("wzClose")?.addEventListener("click", closeWizard);
    $("wzBack")?.addEventListener("click", () => { if (state.wizard.step > 0) goToStep(state.wizard.step - 1); });
    $("wzNext")?.addEventListener("click", () => {
      if (state.wizard.step === WIZARD_TOTAL - 1) { saveHabit(); return; }
      if (!validateStep()) {
        const msgs = {
          0: t("habits.wz.err.intent", "Choose a direction first."),
          1: t("habits.wz.err.category", "Pick a category to continue."),
          2: t("habits.wz.err.name", "Enter or choose a habit name."),
          4: t("habits.wz.err.freq", "Choose frequency and difficulty."),
          5: t("habits.wz.err.when", "Pick a time of day."),
        };
        showStepError(msgs[state.wizard.step] || t("habits.wz.err.generic", "Please complete this step."));
        return;
      }
      goToStep(state.wizard.step + 1);
    });

    $("wizardModal")?.addEventListener("click", e => { if (e.target === $("wizardModal")) closeWizard(); });

    $("detailClose")?.addEventListener("click", closeDetail);
    $("detailBackdrop")?.addEventListener("click", closeDetail);
    $("detailEdit")?.addEventListener("click", () => {
      const h = state.habits.find(x => x.id === state.detailId);
      if (!h || h.archived) return;
      closeDetail(); openWizard(h);
    });
    $("detailArchive")?.addEventListener("click", () => {
      const h = state.habits.find(x => x.id === state.detailId);
      if (!h) return;
      h.archived ? restoreHabit(state.detailId) : archiveHabit(state.detailId);
    });
    $("detailPause")?.addEventListener("click", () => {
      const h = state.habits.find(x => x.id === state.detailId);
      if (!h) return;
      h.paused ? resumeHabit(state.detailId) : pauseHabit(state.detailId);
    });
    $("detailDelete")?.addEventListener("click", () => deleteHabit(state.detailId));

    /* Filter chips */
    qsa(".hb-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        state.activeFilter = chip.dataset.filter;
        qsa(".hb-chip").forEach(c => {
          c.classList.toggle("active", c === chip);
          c.setAttribute("aria-selected", String(c === chip));
        });
        renderList();
      });
    });

    /* Heatmap collapse toggle */
    $("hbHeatmapToggle")?.addEventListener("click", () => {
      const wrap = $("hbHeatmapWrap");
      const btn = $("hbHeatmapToggle");
      if (!wrap || !btn) return;
      const collapsed = wrap.classList.toggle("collapsed");
      btn.setAttribute("aria-expanded", String(!collapsed));
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        if ($("wizardModal")?.getAttribute("aria-hidden") === "false") closeWizard();
        if ($("detailModal")?.getAttribute("aria-hidden") === "false") closeDetail();
      }
    });

    window.addEventListener("hbit:lang-changed", () => {
      setHeaderDate();
      renderAll();
      const wz = $("wizardModal");
      if (wz && wz.getAttribute("aria-hidden") === "false") {
        const s = state.wizard.step;
        buildWizardSlides();
        goToStep(s);
      }
      if (state.detailId) {
        const h = state.habits.find(x => x.id === state.detailId);
        const det = $("detailModal");
        if (h && det && det.getAttribute("aria-hidden") === "false") renderDetailContent(h);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     INIT
     ══════════════════════════════════════════════════════════ */
  let _eventsBound = false;
  let _helpModalBound = false;

  function init() {
    if (typeof firebase === "undefined") {
      console.error("[habits] Firebase not loaded.");
      return;
    }
    setHeaderDate();
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = "login.html"; return; }
      state.uid = user.uid;
      db = firebase.firestore();

      const av = $("hbAvatar");
      if (av && user.displayName) av.textContent = user.displayName.charAt(0).toUpperCase();
      else if (av && user.email) av.textContent = user.email.charAt(0).toUpperCase();

      loadData();
      if (!_eventsBound) { bindEvents(); _eventsBound = true; }
      if (!_helpModalBound && window.HBIT?.utils?.initHelpModal) {
        HBIT.utils.initHelpModal({
          openBtn: "hbHelpBtn",
          overlay: "hbHelpOverlay",
          closeBtn: "hbHelpClose",
        });
        _helpModalBound = true;
      }
    });
  }

  window.HBIT = window.HBIT || {};
  window.HBIT.pages = window.HBIT.pages || {};
  window.HBIT.pages.habits = { init };
})();
