/* =====================================================================
   Hbit — js/pages/budget.js   (v3 — full rebuild)

   Architecture:
   • Accounts   → /users/{uid}/budgetAccounts/{id}
   • Entries    → /users/{uid}/budgetEntries/{id}  (via HBIT.db)
   • Budget Plan→ /users/{uid}/budgetPlan/{month}   (via HBIT.db)
   • Bills      → /users/{uid}/budgetBills/{id}     (via HBIT.db)
   • Currency   → localStorage

   Features:
   • KPI summary cards (Income | Spent | Remaining)
   • Money Overview donut (Income, Spent, Debt, Remaining) + Net Worth chip
   • Budget Planner — Excel-like rows per category with progress bars
   • Bills Tracker — recurring bills with paid/unpaid toggle per month
   • Accounts — horizontal scroll, credit utilization bars
   • Spending by category donut chart + legend
   • Transactions — grouped by date, client-side search filter
   • Speed-dial FAB (Income + Expense + Bill)
   • Help tour (4 steps)
   • Full i18n
   ===================================================================== */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $    = (id) => document.getElementById(id);

  /* ── Category definitions ─────────────────────────────────────────── */
  const CATEGORIES = [
    { id: "housing",       color: "var(--bgt-saved)", label: "Housing"       },
    { id: "food",          color: "var(--bgt-income)", label: "Food"          },
    { id: "transport",     color: "var(--bgt-accent)", label: "Transport"     },
    { id: "health",        color: "var(--bgt-spent)", label: "Health"        },
    { id: "entertainment", color: "var(--bgt-purple)", label: "Fun"           },
    { id: "subscriptions", color: "var(--bgt-cyan)", label: "Subscriptions" },
    { id: "shopping",      color: "var(--bgt-orange)", label: "Shopping"      },
    { id: "education",     color: "var(--bgt-saved)", label: "Education"     },
    { id: "savings",       color: "var(--bgt-success)", label: "Savings"       },
    { id: "other",         color: "var(--bgt-text-3)", label: "Other"         },
  ];

  const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
  function getCat(id) { return CAT_MAP[id] || CATEGORIES[CATEGORIES.length - 1]; }
  function softColor(color, pct = 14) { return `color-mix(in srgb, ${color} ${pct}%, transparent)`; }

  /* Lucide-style SVG icons (stroke currentColor) */
  function svgIconLucide(inner, size) {
    const s = size || 18;
    return `<svg class="bg-icon-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }
  const CAT_SVG_INNER = {
    housing: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
    food: `<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>`,
    transport: `<path d="M5 17h14v-5H5v5zM5 9h14V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>`,
    health: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
    entertainment: `<rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>`,
    subscriptions: `<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>`,
    shopping: `<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
    education: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`,
    savings: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
    other: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
  };
  function catIconSvg(id, size) {
    return svgIconLucide(CAT_SVG_INNER[id] || CAT_SVG_INNER.other, size);
  }

  /* ── Account type definitions ─────────────────────────────────────── */
  const ACCOUNT_TYPES = [
    { id: "salary",      label: "Salary",  color: "var(--bgt-income)" },
    { id: "cash",        label: "Cash",    color: "var(--bgt-accent)" },
    { id: "credit_card", label: "Credit",  color: "var(--bgt-purple)" },
    { id: "debt",        label: "Debt",    color: "var(--bgt-spent)" },
  ];
  const ACCT_SVG_INNER = {
    salary: `<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
    cash: `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>`,
    credit_card: `<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>`,
    debt: `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
  };
  function acctTypeIconSvg(id, size) {
    return svgIconLucide(ACCT_SVG_INNER[id] || ACCT_SVG_INNER.salary, size);
  }

  const WIZ_STRUGGLE_INNER = {
    spend_track: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><line x1="1" y1="1" x2="23" y2="23"/>`,
    save: `<path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/><polyline points="17 21 17 13 7 13 7 21"/><line x1="12" y1="7" x2="12" y2="3"/><line x1="8" y1="5" x2="16" y2="5"/>`,
    debt: ACCT_SVG_INNER.credit_card,
    avoid: `<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`,
    insight: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  };
  const WIZ_GOAL_INNER = `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>`;
  const WIZ_MODE_INNER = {
    plan: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`,
    track: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  };
  const WIZ_LEVEL_INNER = {
    beginner: `<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`,
    intermediate: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
    advanced: `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>`,
  };
  const WIZ_COMMIT_INNER = {
    allin: `<path d="M8.5 14.5A2.5 2.5 0 0 0 12 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`,
    mod: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
    casual: `<path d="M2 12h20"/><path d="M6 8l-4 4 4 4"/><path d="M18 16l4-4-4-4"/>`,
  };

  const TYPE_MAP = Object.fromEntries(ACCOUNT_TYPES.map(t => [t.id, t]));
  function getAcctType(id) { return TYPE_MAP[id] || ACCOUNT_TYPES[0]; }

  /* ── Constants ────────────────────────────────────────────────────── */
  const LS_CURRENCY = "hbit:budget:currency";
  const LS_MONTH    = "hbit:budget:month";
  const LS_EXPENSES = "hbit:budget:expenses";
  const LS_PLANNER  = "hbit:budget:plannerMode";
  const BASE_LAYOUT_SECTION_IDS = Object.freeze({
    goals:        "bgGoalsSection",
    overview:     "overviewSection",
    planner:      "bgSecPlanner",
    bills:        "bgSecBills",
    accounts:     "bgSecAccounts",
    chart:        "bgSecChart",
    calendar:     "bgCalendarSection",
    trend:        "bgTrendSection",
    transactions: "bgSecTransactions",
  });
  const BASE_LAYOUT_ORDERS = Object.freeze({
    default: Object.freeze(["overview", "chart", "transactions", "goals", "planner", "bills", "calendar", "trend", "accounts"]),
    plan:    Object.freeze(["planner", "overview", "goals", "bills", "calendar", "accounts", "chart", "trend", "transactions"]),
    track:   Object.freeze(["overview", "chart", "transactions", "goals", "planner", "bills", "calendar", "accounts", "trend"]),
  });
  const DEFAULT_DASHBOARD_CARDS = Object.freeze(["hero", "top3", "bills"]);
  const CARD_SECTION_MAP = Object.freeze({
    top3: "chart",
    bills: "bills",
    accounts: "accounts",
    savings: "goals",
    networth: "overview",
    calendar: "calendar",
    trend: "trend",
  });

  /* ── State ────────────────────────────────────────────────────────── */
  const state = {
    uid:         null,
    currency:    "CAD",
    month:       todayKey().slice(0, 7),
    accounts:    [],
    entries:     [],
    plan:        {},   // { [categoryId]: limit }
    bills:       [],   // all bills for this user
    searchQuery: "",
    focusedCat:  null,
    sheet: { type: null, data: null },
    fabOpen: false,
    savingsGoals:      [],
    wizardMeta:        null,
    setupDone:         false,
    plannerMode:       "track",
    plannerDraft:      {},
    plannerInView:     false,
    plannerShowAll:    false,
    trendLoaded:       false,
    trendLoading:      false,
    trendData:         null,
    allEntriesCache:   null,
    exportOpen:        false,
    billFilter:        "all",
    streakLastRendered: null,
    budgetAuthSubscribed: false,
    goalSheetMode:     "create",
    goalEditId:        null,
    goalSelectedColor: "var(--bgt-accent)",
    goalDetailId:      null,
    dataHydrated:      false,
    expenseDeleteConfirmId: null,
    kpiComparison:      null,
    entryTypeFilter:    "all",
  };

  const GOAL_COLORS = [
    { hex: "var(--bgt-accent)" },
    { hex: "var(--bgt-income)" },
    { hex: "var(--bgt-saved)" },
    { hex: "var(--bgt-spent)" },
    { hex: "var(--bgt-purple)" },
    { hex: "var(--bgt-cyan)" },
  ];

  function budgetMetaCol() {
    return HBIT.userSubcollectionRef(state.uid, "budgetMeta");
  }
  function budgetSettingsDoc() {
    return HBIT.userSubcollectionRef(state.uid, "budget").doc("settings");
  }
  function savingsGoalsCol() {
    return HBIT.userSubcollectionRef(state.uid, "savingsGoals");
  }

  let acctEditType   = "salary";
  let expEditCat     = "other";
  let billEditCat    = "subscriptions";
  let billFrequency  = "monthly";
  let limitEditCat   = null;
  let acctFlowStep   = 1;
  let billFlowStep   = 1;

  let wizardSlideIndex = 0;
  const entrySwipeState = new WeakMap();
  let entrySwipeList = null;
  const overlayTrapHandlers = new WeakMap();
  let trendTooltipBoundSvg = null;
  const wizardAnswers = {
    goal:         null,   // step 1: spend_track | save | debt | optimize | insight
    mode:         null,   // step 2: plan | track
    payFrequency: null,   // step 3: weekly | biweekly | monthly | irregular
    level:        null,   // step 4: beginner | intermediate | advanced
    challenges:   [],     // step 5: multi-select optional
    commitment:   null,   // step 6: all_in | moderate | light | minimal
  };
  let wizardTrapHandler = null;

  /* ── Date helpers ─────────────────────────────────────────────────── */
  function todayKey() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function prevMonth(ym) {
    const [y, m] = ym.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  }
  function nextMonth(ym) {
    const [y, m] = ym.split("-").map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  function monthLabel(ym) {
    const [y, m] = ym.split("-");
    return new Date(+y, +m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function daysInMonthYm(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }

  function totalMonthlyPlan() {
    return Object.values(state.plan).reduce((s, v) => s + (Number(v) || 0), 0);
  }

  /** Day-of-month for today */
  function todayDay() { return new Date().getDate(); }

  function monthsBetweenDates(start, end) {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  function showToast(msg, opts) {
    // If caller provides an action (e.g. retry), route through the global
    // toast system which supports action buttons. Otherwise keep the legacy
    // page-local toast host for backwards compatibility.
    if (opts && opts.action && typeof opts.onAction === "function"
        && window.HBIT && HBIT.toast && typeof HBIT.toast.error === "function") {
      HBIT.toast.error(msg, opts);
      return;
    }
    const host = $("bgToastHost");
    if (!host) {
      if (window.HBIT && HBIT.toast) HBIT.toast.error(msg);
      return;
    }
    const el = document.createElement("div");
    el.className = "bg-toast";
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.25s ease";
      setTimeout(() => el.remove(), 280);
    }, 3000);
  }

  // Build a translated retry label + "Save failed" fallback.
  function fbErrMsg(err) {
    const code = err?.code || "";
    if (code === "permission-denied") {
      return t("budget.toast.permissionDenied", "Permission denied \u2014 sign in and try again");
    }
    if (code === "unavailable" || code === "deadline-exceeded" || err?.name === "TypeError") {
      return t("budget.toast.offlineSave", "Can\u2019t reach the server \u2014 check your connection");
    }
    const base = t("budget.toast.saveError", "Couldn\u2019t save \u2014 please retry");
    return (code ? code + ": " : "") + (err?.message || base);
  }
  function fbErrRetry(err, retryFn) {
    const msg = fbErrMsg(err);
    const short = msg.length > 120 ? msg.slice(0, 117) + "\u2026" : msg;
    if (typeof retryFn === "function") {
      showToast(short, { action: t("budget.toast.retry", "Retry"), onAction: retryFn });
    } else {
      showToast(short);
    }
  }

  async function loadBudgetMeta() {
    state.wizardMeta = null;
    state.setupDone = false;
    if (!state.uid) return;
    try {
      const settingsSnap = await budgetSettingsDoc().get();
      if (settingsSnap.exists) {
        const data = settingsSnap.data() || {};
        state.wizardMeta = {
          ...data,
          completed: data.wizardComplete === true,
          cards: Array.isArray(data.cards) && data.cards.length ? data.cards : DEFAULT_DASHBOARD_CARDS.slice(),
        };
      } else {
        const wizSnap = await budgetMetaCol().doc("wizard").get();
        state.wizardMeta = wizSnap.exists ? {
          ...wizSnap.data(),
          cards: DEFAULT_DASHBOARD_CARDS.slice(),
          wizardComplete: wizSnap.data()?.completed === true,
        } : null;
      }
      const setupSnap = await budgetMetaCol().doc("setup").get();
      state.setupDone = !!(setupSnap.exists && setupSnap.data()?.done);
    } catch (err) {
      /* silent */
    }
  }

  async function saveWizardDoc(data, merge = true) {
    const cards = Array.isArray(data.cards) && data.cards.length ? data.cards : DEFAULT_DASHBOARD_CARDS.slice();
    const payload = {
      ...data,
      cards,
      wizardComplete: data.wizardComplete ?? data.completed ?? true,
      completed: data.completed ?? data.wizardComplete ?? true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await budgetSettingsDoc().set(payload, { merge });
    await budgetMetaCol().doc("wizard").set(payload, { merge }).catch(() => {});
  }

  async function saveSetupDone() {
    await budgetMetaCol().doc("setup").set({
      done: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    state.setupDone = true;
  }

  async function loadSavingsGoals() {
    if (!state.uid) { state.savingsGoals = []; return; }
    try {
      const snap = await savingsGoalsCol().get();
      state.savingsGoals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.savingsGoals.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return ta - tb;
      });
    } catch (err) {
      /* silent */
      state.savingsGoals = [];
    }
  }

  async function loadKpiComparison() {
    state.kpiComparison = null;
    if (!state.uid) return;
    try {
      const prev = prevMonth(state.month);
      const prevEntries = await HBIT.db.budgetEntries.forMonth(prev);
      state.kpiComparison = {
        income: sumEntryAmounts(prevEntries, "income"),
        expenses: sumEntryAmounts(prevEntries, "expense"),
      };
    } catch (err) {
      state.kpiComparison = null;
    }
  }

  function initPlannerModeFromMeta() {
    try {
      const saved = localStorage.getItem(LS_PLANNER);
      if (saved === "track" || saved === "plan") {
        state.plannerMode = saved;
        return;
      }
    } catch {}
    // wizard mode "plan" → planner plan mode; anything else → track
    state.plannerMode = state.wizardMeta?.mode === "plan" ? "plan" : "track";
  }

  /* ── Layout engine ────────────────────────────────────────────────── */
  function moveToFront(arr, key) {
    const i = arr.indexOf(key);
    if (i > 0) { arr.splice(i, 1); arr.unshift(key); }
  }
  function cloneLayoutOrder(name) {
    const base = BASE_LAYOUT_ORDERS[name] || BASE_LAYOUT_ORDERS.default;
    return typeof structuredClone === "function" ? structuredClone(base) : [...base];
  }

  function buildLayoutConfig() {
    const m          = state.wizardMeta || {};
    const goal       = m.goal       || "spend_track";
    const mode       = m.mode       || "track";
    const level      = m.level      || "beginner";
    const commitment = m.commitment || "moderate";
    const challenges = Array.isArray(m.challenges) ? m.challenges : [];

    /* Section keys → HTML element IDs */
    const SECTION_IDS = BASE_LAYOUT_SECTION_IDS;

    if (Array.isArray(m.cards) && m.cards.length) {
      const keys = [];
      m.cards.forEach((card) => {
        const key = CARD_SECTION_MAP[card];
        if (key && !keys.includes(key)) keys.push(key);
      });
      return keys
        .map((key) => ({ id: SECTION_IDS[key], expanded: true }))
        .filter((item) => item.id);
    }

    let order = cloneLayoutOrder("default");
    const hidden   = new Set();
    const expanded = new Set(["overview"]);

    /* ── Mode rules ── */
    if (mode === "plan") {
      order = cloneLayoutOrder("plan");
      expanded.add("planner");
    } else {
      order = cloneLayoutOrder("track");
      expanded.add("chart");
      expanded.add("transactions");
    }

    /* ── Goal rules ── */
    if (goal === "spend_track") {
      if (mode === "track") { moveToFront(order, "transactions"); moveToFront(order, "chart"); }
      expanded.add("transactions");
      expanded.add("chart");
    } else if (goal === "save") {
      moveToFront(order, "goals");
      expanded.add("goals");
    } else if (goal === "debt") {
      moveToFront(order, "bills");
      expanded.add("bills");
      expanded.add("accounts");
    } else if (goal === "optimize") {
      moveToFront(order, "chart");
      expanded.add("chart");
      expanded.add("trend");
    } else if (goal === "insight") {
      expanded.add("overview");
      expanded.add("trend");
      expanded.add("chart");
    }

    /* ── Level rules ── */
    if (level === "beginner") {
      hidden.add("trend");
      if (goal !== "debt") hidden.add("accounts");
    } else if (level === "advanced") {
      expanded.add("accounts");
      expanded.add("trend");
      hidden.delete("accounts");
      hidden.delete("trend");
    }

    /* ── Commitment rules ── */
    if (commitment === "minimal" || commitment === "light") {
      hidden.add("trend");
      hidden.add("calendar");
      if (goal !== "save") hidden.add("goals");
    } else if (commitment === "all_in") {
      expanded.add("trend");
      expanded.add("calendar");
      hidden.delete("trend");
      hidden.delete("calendar");
    }

    /* ── Challenge rules ── */
    if (challenges.includes("irregular_bills"))   expanded.add("bills");
    if (challenges.includes("savings_discipline")) { expanded.add("goals"); hidden.delete("goals"); moveToFront(order, "goals"); }
    if (challenges.includes("multiple_accounts"))  { expanded.add("accounts"); hidden.delete("accounts"); }

    /* Build final array — KPI row stays fixed at top, not included here */
    return order
      .filter(key => !hidden.has(key))
      .map(key => ({ key, id: SECTION_IDS[key], expanded: expanded.has(key) }));
  }

  function persistPlannerMode() {
    try { localStorage.setItem(LS_PLANNER, state.plannerMode); } catch {}
    syncPlannerToggleUi();
  }

  function syncPlannerToggleUi() {
    const tr = $("bgPlannerTrack");
    const pl = $("bgPlannerPlan");
    const hint = $("bgPlannerHint");
    const saveBtn = $("bgPlannerSaveBtn");
    if (tr) {
      tr.classList.toggle("active", state.plannerMode === "track");
      tr.setAttribute("aria-selected", state.plannerMode === "track" ? "true" : "false");
    }
    if (pl) {
      pl.classList.toggle("active", state.plannerMode === "plan");
      pl.setAttribute("aria-selected", state.plannerMode === "plan" ? "true" : "false");
    }
    if (hint) {
      hint.textContent = state.plannerMode === "plan"
        ? t("budget.planner.planHint", "Set limits per category, then Save plan.")
        : (typeof HBIT?.i18n?.t === "function" ? HBIT.i18n.t("budget.planner.tapToSet") : "Tap a category to adjust its limit.");
    }
    if (saveBtn) saveBtn.style.display = state.plannerMode === "plan" ? "" : "none";
  }

  /* ── Currency / formatting ────────────────────────────────────────── */
  function getCurrency() { try { return localStorage.getItem(LS_CURRENCY) || "CAD"; } catch { return "CAD"; } }
  function saveCurrency(c) { try { localStorage.setItem(LS_CURRENCY, c); } catch {} }

  function fmtMoney(n) {
    const cur  = state.currency;
    const intl = cur === "CAF" ? "XAF" : cur;
    const val  = Number.isFinite(n) ? n : 0;
    const loc  = (document.documentElement.lang || "en") === "fr" ? "fr-CA" : "en-CA";
    try {
      const f = new Intl.NumberFormat(loc, { style: "currency", currency: intl, maximumFractionDigits: 2 }).format(val);
      return cur === "CAF" ? `${f} CAF` : f;
    } catch { return `${val.toFixed(2)} ${cur}`; }
  }

  function currencySymbol() {
    const cur  = state.currency;
    const intl = cur === "CAF" ? "XAF" : cur;
    const loc  = (document.documentElement.lang || "en") === "fr" ? "fr-CA" : "en-CA";
    try {
      const p = new Intl.NumberFormat(loc, { style: "currency", currency: intl }).formatToParts(0);
      return p.find(x => x.type === "currency")?.value || cur;
    } catch { return cur; }
  }

  /* ── Number-only formatter (no currency symbol) ──────────────────── */
  function fmt(n) {
    const val = Number.isFinite(n) ? n : 0;
    const loc = (document.documentElement.lang || "en") === "fr" ? "fr-CA" : "en-CA";
    try { return new Intl.NumberFormat(loc, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val); }
    catch { return val.toFixed(2); }
  }

  /* ── i18n helper ──────────────────────────────────────────────────── */
  function t(key, fallback, params) {
    // 1. Ask the global i18n bundle (shared across the app). If the key is
    //    registered there, use it.
    try {
      const out = typeof HBIT?.i18n?.t === "function" ? HBIT.i18n.t(key, fallback, params) : null;
      // The global t() returns the fallback (English) when the key is missing;
      // detect that by comparing and fall through to BUDGET_COPY so FR keeps working.
      if (out != null && out !== "" && out !== fallback) return out;
    } catch (_) {
      /* fallback below */
    }
    // 2. Page-local dictionary: if BUDGET_COPY has a translation for the
    //    current language, use it (so calling t("budget.foo", "English") from
    //    render code still reaches the FR copy).
    let base = fallback;
    try {
      if (typeof BUDGET_COPY !== "undefined" && BUDGET_COPY[key]) {
        const lang = (HBIT?.i18n?.getLang?.() || document.documentElement.lang || "en").slice(0, 2);
        const local = BUDGET_COPY[key];
        base = lang === "fr" ? local[1] : local[0];
      }
    } catch (_) { /* ignore */ }
    // 3. Interpolate {placeholder} tokens.
    let s = base != null ? base : (fallback != null ? fallback : key);
    if (params && typeof params === "object" && typeof s === "string") {
      s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? String(params[k]) : `{${k}}`);
    }
    return s;
  }

  const BUDGET_COPY = {
    "budget.documentTitle": ["Hbit - Budget", "Hbit - Budget"],
    "budget.hero.leftToSpend": ["Left to spend", "Reste a depenser"],
    "budget.hero.spentThisMonth": ["Spent this month", "Depense ce mois-ci"],
    "budget.hero.ofBudgeted": ["of {amount} budgeted", "sur {amount} prevus"],
    "budget.hero.noBudget": ["Set a plan to track budget usage.", "Cree un plan pour suivre ton budget."],
    "budget.status.checking": ["Checking", "Verification"],
    "budget.status.setup": ["No budget set", "Aucun budget defini"],
    "budget.status.over": ["Over budget", "Budget depasse"],
    "budget.status.close": ["Close watch", "A surveiller"],
    "budget.status.onTrack": ["On track", "Sur la bonne voie"],
    "budget.streak.dayLabel": ["Day", "Jour"],
    "budget.quick.expense": ["Expense", "Depense"],
    "budget.quick.income": ["Income", "Revenu"],
    "budget.quick.bill": ["Bill", "Facture"],
    "budget.quick.account": ["Account", "Compte"],
    "budget.quick.goal": ["Goal", "Objectif"],
    "budget.health.title": ["Financial Health", "Sante financiere"],
    "budget.health.details": ["Details", "Details"],
    "budget.health.excellent": ["Excellent", "Excellent"],
    "budget.health.good": ["Good", "Bon"],
    "budget.health.fair": ["Fair", "Moyen"],
    "budget.health.poor": ["Poor", "Fragile"],
    "budget.health.savingsRate": ["Savings rate", "Taux d'epargne"],
    "budget.health.adherence": ["Budget adherence", "Respect du budget"],
    "budget.health.goalSet": ["Savings goal set", "Objectif d'epargne actif"],
    "budget.planner.autofill": ["Auto-fill 50/30/20", "Remplir 50/30/20"],
    "budget.planner.autofillApply": ["Apply Plan", "Appliquer le plan"],
    "budget.planner.autofillNoIncome": ["Log your income first to use this feature.", "Ajoute d'abord ton revenu pour utiliser cette fonction."],
    "budget.planner.autofillBased": ["Based on your income of", "Base sur ton revenu de"],
    "budget.planner.autofillApplied": ["50/30/20 plan applied.", "Plan 50/30/20 applique."],
    "budget.planner.needs": ["Needs", "Besoins"],
    "budget.planner.wants": ["Wants", "Envies"],
    "budget.planner.savings": ["Savings", "Epargne"],
    "budget.bills.all": ["All", "Tout"],
    "budget.bills.unpaidTab": ["Unpaid", "Non payees"],
    "budget.bills.subscriptions": ["Subscriptions", "Abonnements"],
    "budget.bills.dueSoon": ["Due soon", "Bientot due"],
    "budget.bills.overdue": ["Overdue", "En retard"],
    "budget.bills.upcoming": ["Upcoming", "A venir"],
    "budget.flow.billCatLead": ["Choose a bill category", "Choisis une categorie de facture"],
    "budget.flow.billAmountLead": ["How much is this bill?", "Quel est le montant?"],
    "budget.flow.billDetailsLead": ["Bill details", "Details de la facture"],
    "budget.import.label": ["Attach receipt or statement", "Joindre un recu ou releve"],
    "budget.import.mobile": ["Mobile", "Mobile"],
    "budget.export.pdfTitle": ["PDF report", "Rapport PDF"],
    "budget.export.pdfBtn": ["Download PDF Report", "Telecharger le rapport PDF"],
    "budget.monthend.saved": ["You saved", "Tu as economise"],
    "budget.monthend.net": ["Net result", "Resultat net"],
    "budget.monthend.income": ["Income", "Revenu"],
    "budget.monthend.spent": ["Spent", "Depense"],
    "budget.monthend.bills": ["Bills paid", "Factures payees"],
    "budget.monthend.vsLast": ["Vs last month", "Vs mois dernier"],
    "budget.monthend.quoteGood": ["Small money choices added up nicely.", "Les petits choix ont fait une belle difference."],
    "budget.monthend.quoteTight": ["A tight month still teaches useful patterns.", "Un mois serre revele quand meme des tendances utiles."],
    "budget.monthend.share": ["Share", "Partager"],
    "budget.monthend.close": ["Done", "Termine"],

    /* KPI summary cards (also bound via data-bg-i18n="budget.income/spent/remaining") */
    "budget.income": ["Income", "Revenu"],
    "budget.spent": ["Spent", "Depense"],
    "budget.remaining": ["Remaining", "Restant"],
    "budget.kpi.income": ["Income", "Revenu"],
    "budget.kpi.spent": ["Spent", "Depense"],
    "budget.kpi.remaining": ["Remaining", "Restant"],

    /* Accounts */
    "budget.accounts.title": ["Accounts", "Comptes"],
    "budget.accounts.add": ["Add account", "Ajouter un compte"],
    "budget.accounts.addHint": ["Add your first account to track balances.", "Ajoute ton premier compte pour suivre les soldes."],
    "budget.accounts.salary": ["Salary", "Salaire"],
    "budget.accounts.cash": ["Cash", "Especes"],
    "budget.accounts.credit": ["Credit card", "Carte de credit"],
    "budget.accounts.debt": ["Debt", "Dette"],
    "budget.accounts.noRecent": ["No recent change", "Pas de changement recent"],
    "budget.accounts.edit": ["Edit account", "Modifier le compte"],
    "budget.accounts.emptyHint": ["No accounts yet. Add your first account to start tracking your budget.", "Aucun compte pour l'instant. Ajoute ton premier compte pour suivre ton budget."],

    /* Financial Health / networth */
    "budget.health.sub": ["Details", "Details"],
    "budget.networth": ["Net worth", "Valeur nette"],

    /* Money Overview donut legend */
    "budget.overview.title": ["Money Overview", "Apercu financier"],
    "budget.overview.income": ["Income", "Revenu"],
    "budget.overview.spent": ["Spent", "Depense"],
    "budget.overview.debt": ["Debt", "Dette"],
    "budget.overview.remaining": ["Remaining", "Restant"],

    /* Spending by category */
    "budget.pie.title": ["Spending by category", "Depenses par categorie"],
    "budget.pie.total": ["total", "total"],
    "budget.pie.empty": ["No expenses this month", "Aucune depense ce mois-ci"],

    /* Transactions */
    "budget.tx.title": ["Transactions", "Transactions"],
    "budget.tx.search": ["Search transactions...", "Rechercher une transaction..."],
    "budget.tx.all": ["All", "Tout"],
    "budget.tx.income": ["Income", "Revenu"],
    "budget.tx.expenses": ["Expenses", "Depenses"],
    "budget.tx.empty": ["No transactions yet", "Aucune transaction"],
    "budget.tx.emptySub": ["Log your first expense or income to get started.", "Enregistre une depense ou un revenu pour commencer."],
    "budget.tx.logExpense": ["+ Log an expense", "+ Ajouter une depense"],
    "budget.tx.defaultLabel": ["Transaction", "Transaction"],

    /* Savings Goals */
    "budget.goals.title": ["Savings Goals", "Objectifs d'epargne"],
    "budget.goals.emptyTitle": ["Create a savings goal to stay motivated", "Cree un objectif d'epargne pour rester motive"],
    "budget.goals.emptySub": ["Save for a vacation, emergency fund, or down payment.", "Epargne pour des vacances, un fonds d'urgence ou un acompte."],
    "budget.goals.set": ["Set a Goal", "Definir un objectif"],
    "budget.goals.new": ["+ New Goal", "+ Nouvel objectif"],
    "budget.goals.defaultName": ["Goal", "Objectif"],
    "budget.goals.savedOf": ["{saved} saved of {target}", "{saved} economises sur {target}"],
    "budget.goals.byDate": ["By {date}", "D'ici {date}"],
    "budget.goals.toStayOnTrack": ["+{amount} to stay on track", "+{amount} pour rester sur la bonne voie"],
    "budget.goals.pastDue": ["Past due", "En retard"],
    "budget.goals.onTrack": ["On track ✓", "Sur la bonne voie ✓"],
    "budget.goals.behind": ["Behind ⚠", "En retard ⚠"],
    "budget.goals.setMonthlyTarget": ["Set monthly target", "Definir une cible mensuelle"],

    /* Budget Planner */
    "budget.planner.title": ["Budget Planner", "Planification du budget"],
    "budget.planner.sub": ["Tap to set a monthly limit", "Touche pour definir une limite mensuelle"],
    "budget.planner.track": ["Track", "Suivre"],
    "budget.planner.plan": ["Plan", "Planifier"],
    "budget.planner.remaining": ["Remaining", "Restant"],
    "budget.planner.noLimit": ["No limit set", "Aucune limite"],
    "budget.planner.setLimit": ["Set limit", "Definir"],
    "budget.planner.overBudget": ["Over budget", "Hors budget"],
    "budget.planner.summary": ["Budgeted: {budgeted} - Spent: {spent} - Remaining: {remaining}", "Prevu: {budgeted} - Depense: {spent} - Restant: {remaining}"],

    /* Category names */
    "budget.cat.housing": ["Housing", "Logement"],
    "budget.cat.food": ["Food", "Alimentation"],
    "budget.cat.transport": ["Transport", "Transport"],
    "budget.cat.health": ["Health", "Sante"],
    "budget.cat.fun": ["Fun", "Loisirs"],
    "budget.cat.subscriptions": ["Subscriptions", "Abonnements"],
    "budget.cat.shopping": ["Shopping", "Achats"],
    "budget.cat.education": ["Education", "Education"],
    "budget.cat.savings": ["Savings", "Epargne"],
    "budget.cat.other": ["Other", "Autre"],

    /* Bills */
    "budget.bills.title": ["Bills", "Factures"],
    "budget.bills.add": ["Add bill", "Ajouter une facture"],
    "budget.bills.paid": ["Paid", "Payees"],
    "budget.bills.unpaid": ["Unpaid", "Non payees"],
    "budget.bills.empty": ["No bills yet", "Aucune facture"],
    "budget.bills.emptySub": ["Add recurring bills like rent, utilities or subscriptions.", "Ajoute des factures recurrentes : loyer, services, abonnements."],
    "budget.bills.emptyDebtTitle": ["Add bills to track minimum payments", "Ajoute tes factures pour suivre les paiements minimums"],
    "budget.bills.emptyDebtSub": ["Never miss a due date - critical for your debt payoff plan.", "Ne manque aucune echeance - essentiel pour ton plan de remboursement."],
    "budget.bills.statusPaid": ["Paid", "Payée"],
    "budget.bills.statusLate": ["Late", "En retard"],
    "budget.bills.statusDue": ["Due", "À venir"],
    "budget.bills.statusOverdue": ["Overdue", "En retard"],
    "budget.bills.statusDueSoon": ["Due soon", "Bientot due"],
    "budget.a11y.editRow": ["Edit", "Modifier"],

    /* Spending Activity */
    "budget.activity.title": ["Spending Activity", "Activite des depenses"],
    "budget.activity.daily": ["Daily spending", "Depenses quotidiennes"],
    "budget.activity.weekly": ["Weekly spending", "Depenses hebdomadaires"],

    /* Setup checklist */
    "budget.setup.title": ["Set up your budget", "Configure ton budget"],
    "budget.setup.sub": ["Complete these to unlock the full dashboard.", "Termine ces etapes pour debloquer tout le tableau de bord."],
    "budget.setup.count": ["{done} / {total} done", "{done} / {total} termine"],
    "budget.setup.logIncome": ["Log your first income", "Enregistre ton premier revenu"],
    "budget.setup.setPlan": ["Set your monthly plan", "Definis ton plan mensuel"],
    "budget.setup.logExpense": ["Log your first expense", "Enregistre ta premiere depense"],
    "budget.setup.addBill": ["Add a recurring bill", "Ajoute une facture recurrente"],
    "budget.setup.createGoal": ["Create a savings goal", "Cree un objectif d'epargne"],
    "budget.empty.goals.title": ["Create a savings goal to stay motivated", "Cree un objectif d'epargne pour rester motive"],
    "budget.empty.goals.sub": ["Save for a vacation, emergency fund, or down payment.", "Epargne pour des vacances, un fonds d'urgence ou un acompte."],
    "budget.empty.goals.cta": ["Set a Goal", "Definir un objectif"],
    "budget.empty.planner.title": ["Set budget limits to take control", "Definis des limites pour prendre le controle"],
    "budget.empty.planner.sub": ["Choose categories and set monthly targets.", "Choisis des categories et definis des cibles mensuelles."],
    "budget.empty.planner.cta": ["Create a budget", "Creer un budget"],
    "budget.empty.tx.title": ["Add your first transaction to start tracking", "Ajoute ta premiere transaction pour commencer le suivi"],
    "budget.empty.tx.sub": ["Track cash, transfers, or anything missing from your bank.", "Suis l'argent comptant, les transferts ou ce qui manque a ta banque."],

    /* Smart alerts */
    "budget.alert.overCategory": ["You've exceeded your {category} budget by {amount} this month.", "Tu as depasse ton budget {category} de {amount} ce mois-ci."],
    "budget.alert.incomeHint": ["Income uses Salary and Cash account balances. Add an account to set income.", "Le revenu utilise les soldes Salaire et Especes. Ajoute un compte pour definir ton revenu."],
    "budget.alert.dismiss": ["Dismiss alert", "Fermer l'alerte"],
    "budget.alert.setNow": ["Set it now", "Definir maintenant"],
    "budget.alert.startPlanning": ["Start planning", "Commencer la planification"],

    /* Add-expense modal */
    "budget.modal.addExpense": ["Add expense", "Ajouter une depense"],
    "budget.modal.addIncome": ["Add income", "Ajouter un revenu"],
    "budget.modal.addBill": ["Add a bill", "Ajouter une facture"],
    "budget.modal.addAccount": ["Add account", "Ajouter un compte"],
    "budget.modal.addGoal": ["Add savings goal", "Ajouter un objectif d'epargne"],
    "budget.modal.save": ["Save", "Enregistrer"],
    "budget.modal.cancel": ["Cancel", "Annuler"],

    /* Daily allowance chip */
    "budget.daily.leftToday": ["{amount} left today", "{amount} restant aujourd'hui"],
  };

  function budgetCopy(key, fallback, params) {
    const lang = (HBIT?.i18n?.getLang?.() || document.documentElement.lang || "en").slice(0, 2);
    const local = BUDGET_COPY[key];
    const base = local ? (lang === "fr" ? local[1] : local[0]) : fallback;
    return t(key, base != null ? base : fallback, params);
  }

  function applyBudgetI18n(root = document) {
    const yr = new Date().getFullYear();
    root.querySelectorAll?.("[data-bg-i18n]").forEach((el) => {
      const key = el.getAttribute("data-bg-i18n");
      if (key === "footer.copyright") {
        el.textContent = budgetCopy(key, "\u00a9 " + yr + " Hbit", { year: yr });
        return;
      }
      el.textContent = budgetCopy(key, el.textContent);
    });
    root.querySelectorAll?.("[data-bg-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-bg-i18n-placeholder");
      el.setAttribute("placeholder", budgetCopy(key, el.getAttribute("placeholder") || ""));
    });
    root.querySelectorAll?.("[data-bg-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-bg-i18n-title");
      el.setAttribute("title", budgetCopy(key, el.getAttribute("title") || ""));
    });
    root.querySelectorAll?.("[data-bg-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-bg-i18n-aria-label");
      el.setAttribute("aria-label", budgetCopy(key, el.getAttribute("aria-label") || ""));
    });
    const title = document.querySelector("title[data-bg-i18n]");
    if (title) title.textContent = budgetCopy(title.getAttribute("data-bg-i18n"), title.textContent);
  }

  /* ── Firestore — accounts ─────────────────────────────────────────── */
  function acctCol() { return HBIT.userSubcollectionRef(state.uid, "budgetAccounts"); }

  async function loadAccounts() {
    if (!state.uid) {
      state.accounts = [];
      return;
    }
    try {
      const snap = await acctCol().orderBy("createdAt", "asc").get();
      state.accounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      /* silent */
      try {
        const snap = await acctCol().get();
        state.accounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        state.accounts.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return ta - tb;
        });
      } catch (err2) {
        /* silent */
        state.accounts = [];
      }
    }
  }

  async function saveAccount(data) {
    const ts = firebase.firestore.FieldValue.serverTimestamp();
    if (data.id) {
      await acctCol().doc(data.id).update({
        type: data.type, name: data.name, balance: +data.balance || 0,
        limit: data.limit != null ? +data.limit : null,
        apr: data.apr != null ? +data.apr : null,
        note: data.note || "", updatedAt: ts,
      });
    } else {
      await acctCol().add({
        type: data.type, name: data.name, balance: +data.balance || 0,
        limit: data.limit != null ? +data.limit : null,
        apr: data.apr != null ? +data.apr : null,
        note: data.note || "", createdAt: ts, updatedAt: ts,
      });
    }
  }

  async function deleteAccount(id) { await acctCol().doc(id).delete(); }

  /* ── Firestore — entries ───────────────────────────────────────────── */
  async function loadEntries() {
    try { state.entries = await HBIT.db.budgetEntries.forMonth(state.month); }
    catch (err) {
      state.entries = [];
      fbErrRetry(err, () => loadEntries().then(renderAll));
    }
  }

  async function persistEntry(data) {
    const dateKey = data.dateKey || todayKey();
    const month   = dateKey.slice(0, 7);
    const type    = data.type === "income" ? "income" : "expense";
    const category = type === "income" ? (data.category || "income") : (data.category || "other");
    if (data.id) {
      await HBIT.db.budgetEntries.update(data.id, {
        type, amount: Math.abs(+data.amount || 0),
        category, description: data.description || "",
        note: data.note || "",
        date: dateKey, dateKey, month,
      });
      return data.id;
    } else {
      return await HBIT.db.budgetEntries.add({
        type, amount: Math.abs(+data.amount || 0),
        category, description: data.description || "",
        note: data.note || "",
        date: dateKey, dateKey, month,
      });
    }
  }

  async function removeEntry(id) { await HBIT.db.budgetEntries.delete(id); }

  /* ── Firestore — budget plan ──────────────────────────────────────── */
  async function loadPlan() {
    try {
      const doc = await HBIT.db.budgetPlan.get(state.month);
      state.plan = doc?.byCategory || {};
    } catch (err) {
      state.plan = {};
      fbErrRetry(err, () => loadPlan().then(renderAll));
    }
  }

  async function savePlan() {
    await HBIT.db.budgetPlan.set(state.month, state.plan);
  }

  /* ── Firestore — bills ────────────────────────────────────────────── */
  async function loadBills() {
    try { state.bills = await HBIT.db.budgetBills.list(); }
    catch (err) {
      state.bills = [];
      fbErrRetry(err, () => loadBills().then(renderAll));
    }
  }

  async function saveBill(data) {
    if (data.id) {
      await HBIT.db.budgetBills.update(data.id, {
        name: data.name, amount: Math.abs(+data.amount || 0),
        dueDay: +data.dueDay || 1, category: data.category || "subscriptions",
        frequency: data.frequency || "monthly",
        note: data.note || "",
      });
    } else {
      const newId = await HBIT.db.budgetBills.add({
        name: data.name, amount: Math.abs(+data.amount || 0),
        dueDay: +data.dueDay || 1, category: data.category || "subscriptions",
        frequency: data.frequency || "monthly",
        note: data.note || "",
      });
      return newId;
    }
  }

  async function deleteBill(id) { await HBIT.db.budgetBills.delete(id); }

  async function toggleBillPaid(bill) {
    const isCurrentlyPaid = bill.paidMonth === state.month;
    const newPaidMonth    = isCurrentlyPaid ? "" : state.month;
    await HBIT.db.budgetBills.update(bill.id, { paidMonth: newPaidMonth });
    const idx = state.bills.findIndex(b => b.id === bill.id);
    if (idx >= 0) state.bills[idx] = { ...state.bills[idx], paidMonth: newPaidMonth };
    renderBills();
  }

  /* ── Budget month aggregate (for Home dashboard) ──────────────────── */
  async function updateBudgetMonthAggregate(month) {
    if (!state.uid || !HBIT.db?.budgetMonths) return;
    try {
      const monthEntries  = state.entries.filter(e =>
        (e.month || (e.dateKey || "").slice(0, 7)) === month && !e._pending
      );
      const incomeTotal   = sumEntryAmounts(monthEntries, "income");
      const expenseTotal  = sumEntryAmounts(monthEntries, "expense");
      const byCategory    = {};
      monthEntries
        .filter(e => (e.type || "expense") === "expense")
        .forEach(e => {
        const cat = e.category || "other";
        byCategory[cat] = (byCategory[cat] || 0) + Math.abs(e.amount || 0);
        });
      await HBIT.db.budgetMonths.set(month, {
        incomeTotal, expenseTotal, remaining: incomeTotal - expenseTotal, byCategory,
      });
    } catch (err) {
      fbErrRetry(err, () => updateBudgetMonthAggregate(month));
    }
  }

  /* ── Computed values ──────────────────────────────────────────────── */
  function sumEntryAmounts(entries, type) {
    return (entries || []).reduce((sum, entry) => {
      if ((entry.type || "expense") !== type) return sum;
      return sum + Math.abs(Number(entry.amount) || 0);
    }, 0);
  }

  function computeIncome() {
    return sumEntryAmounts(state.entries, "income");
  }

  function computeExpenses() {
    return sumEntryAmounts(state.entries, "expense");
  }

  function computeDebt() {
    return state.accounts
      .filter(a => a.type === "debt" || a.type === "credit_card")
      .reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  }

  function computeNetWorth() {
    // Net worth = Σ(asset account balances) − Σ(liability account balances)
    // Return 0 when no accounts exist (instead of falling back to Income−Expenses,
    // which was misleading because it equalled "Remaining").
    const assets = state.accounts
      .filter(a => a.type === "salary" || a.type === "cash")
      .reduce((s, a) => s + Math.max(0, a.balance || 0), 0);
    const liabilities = state.accounts
      .filter(a => a.type === "debt" || a.type === "credit_card")
      .reduce((s, a) => s + Math.abs(a.balance || 0), 0);
    return assets - liabilities;
  }

  function computeByCategory() {
    const map = {};
    state.entries
      .filter(e => (e.type || "expense") === "expense")
      .forEach(e => {
      const cat = e.category || "other";
      map[cat] = (map[cat] || 0) + Math.abs(e.amount || 0);
      });
    return map;
  }

  function hasIncomeEntries() {
    return state.entries.some(e =>
      !e._pending && (e.type || "expense") === "income" && Math.abs(e.amount || 0) > 0
    );
  }

  function hasAnyPlanLimit() {
    return Object.values(state.plan).some(v => Number(v) > 0);
  }

  function setupChecklistStatus() {
    return {
      income:   hasIncomeEntries(),
      plan:     hasAnyPlanLimit(),
      expense:  state.entries.some(e => !e._pending && (e.type || "expense") === "expense" && Math.abs(e.amount || 0) > 0),
      bill:     state.bills.length > 0,
      goal:     state.savingsGoals.length > 0,
    };
  }

  function renderSetupChecklist() {
    const box = $("bgSetupChecklist");
    if (!box) return;
    if (!state.uid || state.setupDone || !state.wizardMeta?.completed) {
      box.style.display = "none";
      return;
    }
    const st = setupChecklistStatus();
    const items = [
      { key: "income",  done: st.income,  label: t("budget.setup.logIncome",  "Log your first income"),  action: "income" },
      { key: "plan",    done: st.plan,    label: t("budget.setup.setPlan",    "Set your monthly plan"),  action: "planner" },
      { key: "expense", done: st.expense, label: t("budget.setup.logExpense", "Log your first expense"), action: "expense" },
      { key: "bill",    done: st.bill,    label: t("budget.setup.addBill",    "Add a recurring bill"),   action: "bills" },
      { key: "goal",    done: st.goal,    label: t("budget.setup.createGoal", "Create a savings goal"),  action: "goals" },
    ];
    const doneN = items.filter(i => i.done).length;
    if (doneN >= items.length) {
      saveSetupDone().then(() => { box.style.display = "none"; }).catch((err) => fbErrRetry(err, () => saveSetupDone()));
      return;
    }
    box.style.display = "";
    setText("bgSetupCount", t("budget.setup.count", `${doneN} / ${items.length} done`, { done: doneN, total: items.length }));
    const pct = (doneN / items.length) * 100;
    const fill = $("bgSetupProgressFill");
    if (fill) fill.style.width = `${pct}%`;
    const list = $("bgSetupList");
    if (!list) return;
    list.innerHTML = items.map(i => `
      <li class="bg-setup-item${i.done ? " done" : ""}" data-setup-action="${i.action}" role="listitem">
        <span class="bg-setup-check" aria-hidden="true">${i.done ? "✓" : ""}</span>
        <span class="bg-setup-item-text">${escHtml(i.label)}</span>
      </li>`).join("");
  }

  function sessionAlertKey(id) { return `hbit:budget:alert:${id}`; }

  function renderSmartAlerts() {
    const host = $("bgAlerts");
    if (!host || !state.uid) return;
    const dismissed = (id) => {
      try { return sessionStorage.getItem(sessionAlertKey(id)) === "1"; } catch { return false; }
    };
    const catMap = computeByCategory();
    const income = computeIncome();
    const planTotal = totalMonthlyPlan();
    const daysLeft = daysInMonthYm(state.month) - todayDay();
    const monthName = monthLabel(state.month).split(" ")[0];

    let alert = null;

    for (const c of CATEGORIES) {
      const lim = state.plan[c.id] || 0;
      const sp = catMap[c.id] || 0;
      if (lim > 0 && sp > lim) {
        alert = {
          id: `over-${c.id}-${state.month}`,
          type: "err",
          html: `You've exceeded your <strong>${escHtml(c.label)}</strong> budget by ${fmtMoney(sp - lim)} this month.`,
          auto: false,
        };
        break;
      }
    }

    if (!alert) {
      for (const c of CATEGORIES) {
        const lim = state.plan[c.id] || 0;
        const sp = catMap[c.id] || 0;
        if (lim > 0 && sp >= lim * 0.8 && sp <= lim && daysLeft > 0) {
          alert = {
            id: `near-${c.id}-${state.month}`,
            type: "warn",
            html: `You're ${Math.round((sp / lim) * 100)}% through your <strong>${escHtml(c.label)}</strong> budget with ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`,
            auto: true,
          };
          break;
        }
      }
    }

    if (!alert && planTotal <= 0) {
      alert = {
        id: `noplan-${state.month}`,
        type: "info",
        html: `You haven't set a budget plan for <strong>${escHtml(monthName)}</strong> yet.`,
        link: "setplan",
        auto: true,
      };
    }

    if (!alert) {
      const dim = daysInMonthYm(state.month);
      if (todayDay() > dim - 3) {
        const next = nextMonth(state.month);
        alert = {
          id: `ahead-${state.month}`,
          type: "info",
          html: `${escHtml(monthName)} ends in ${dim - todayDay()} day${dim - todayDay() === 1 ? "" : "s"}. Ready to plan <strong>${escHtml(monthLabel(next).split(" ")[0])}</strong>?`,
          link: "nextmonth",
          auto: true,
        };
      }
    }

    if (!alert && income > 0 && planTotal > 0) {
      const spent = computeExpenses();
      const mid = daysInMonthYm(state.month) / 2;
      if (todayDay() >= mid && spent < planTotal * 0.5) {
        const id = `ontrack-${state.month}`;
        if (!dismissed(id)) {
          alert = {
            id,
            type: "ok",
            html: `Great job — you're ${fmtMoney(planTotal - spent)} under budget halfway through the month!`,
            auto: true,
          };
        }
      }
    }

    if (!alert || dismissed(alert.id)) {
      host.style.display = "none";
      host.innerHTML = "";
      return;
    }

    const cls = alert.type === "err" ? "bg-alert-card--err"
      : alert.type === "warn" ? "bg-alert-card--warn"
      : alert.type === "ok" ? "bg-alert-card--ok" : "bg-alert-card--info";
    host.style.display = "";
    host.innerHTML = `
      <div class="bg-alert-card ${cls}" data-alert-id="${escHtml(alert.id)}">
        <div class="bg-alert-msg">${alert.html}</div>
        ${alert.link === "setplan" ? `<button type="button" class="bg-alert-link" data-alert-jump="planner">${escHtml(t("budget.alert.setNow", "Set it now"))}</button>` : ""}
        ${alert.link === "nextmonth" ? `<button type="button" class="bg-alert-link" data-alert-jump="nextmonth">${escHtml(t("budget.alert.startPlanning", "Start planning"))}</button>` : ""}
        <button type="button" class="bg-alert-dismiss" aria-label="${escHtml(t("budget.alert.dismiss", "Dismiss alert"))}">×</button>
      </div>`;

    if (alert.auto && alert.type !== "err" && alert.type !== "warn") {
      const card = host.querySelector(".bg-alert-card");
      setTimeout(() => {
        if (card) card.classList.add("fade-out");
        setTimeout(() => {
          try { sessionStorage.setItem(sessionAlertKey(alert.id), "1"); } catch {}
          renderSmartAlerts();
        }, 400);
      }, 8000);
    }
  }

  function renderDailyAllowanceChip() {
    const chip = $("bgDailyChip");
    const tx = $("bgDailyChipText");
    const bar = $("bgDailyChipBar");
    if (!chip || !tx || !bar) return;
    const dim = daysInMonthYm(state.month);
    const plan = totalMonthlyPlan();
    const fallbackInc = computeIncome();
    const dailyBase = plan > 0 ? plan / dim : (fallbackInc > 0 ? fallbackInc / 30 : 0);
    const today = todayKey();
    const todaySpent = state.entries
      .filter(e => (e.dateKey || e.date || "") === today && !e._pending && (e.type || "expense") === "expense")
      .reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    if (dailyBase <= 0) {
      chip.style.display = "none";
      return;
    }
    chip.style.display = "";
    const left = dailyBase - todaySpent;
    const pct = Math.max(0, Math.min(100, (left / dailyBase) * 100));
    bar.style.width = `${pct}%`;
    if (left >= 0) {
      tx.textContent = budgetCopy("budget.daily.leftToday", "{amount} left today", { amount: fmtMoney(left) });
      chip.classList.remove("bg-daily-chip--bad", "bg-daily-chip--mid");
      chip.classList.add(left / dailyBase > 0.35 ? "bg-daily-chip--ok" : "bg-daily-chip--mid");
      bar.style.background = left / dailyBase > 0.35 ? "var(--bgt-income)" : "var(--bgt-warning)";
    } else {
      tx.textContent = budgetCopy("budget.daily.overToday", "{amount} over today", { amount: fmtMoney(Math.abs(left)) });
      chip.classList.remove("bg-daily-chip--ok", "bg-daily-chip--mid");
      chip.classList.add("bg-daily-chip--bad");
      bar.style.background = "var(--bgt-spent)";
    }
  }

  function goalStatusLabel(g) {
    const end = new Date((g.targetDate || "").slice(0, 10) + "T12:00:00");
    if (Number.isNaN(end.getTime())) return { text: "—", cls: "" };
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    if (end < today) return { text: t("budget.goals.pastDue", "Past due"), cls: "past" };
    const monthsLeft = Math.max(1, monthsBetweenDates(today, end));
    const tgt = Number(g.targetAmount) || 0;
    const saved = Number(g.savedAmount) || 0;
    const need = tgt - saved;
    const neededPerMo = need / monthsLeft;
    const mt = g.monthlyTarget != null && g.monthlyTarget !== "" ? Number(g.monthlyTarget) : null;
    if (mt != null && Number.isFinite(mt)) {
      const on = mt + 1e-6 >= neededPerMo;
      return { text: on ? t("budget.goals.onTrack", "On track ✓") : t("budget.goals.behind", "Behind ⚠"), cls: on ? "on" : "behind" };
    }
    return { text: t("budget.goals.setMonthlyTarget", "Set monthly target"), cls: "" };
  }

  function renderGoalsSection() {
    const row = $("bgGoalsRow");
    if (!row) return;
    row.innerHTML = "";
    state.savingsGoals.forEach(g => {
      const tgt = Number(g.targetAmount) || 0;
      const saved = Number(g.savedAmount) || 0;
      const pct = tgt > 0 ? Math.min(100, (saved / tgt) * 100) : 0;
      const end = g.targetDate ? new Date(g.targetDate.slice(0, 10) + "T12:00:00") : null;
      const endStr = end && !Number.isNaN(end.getTime())
        ? end.toLocaleDateString(undefined, { month: "short", year: "numeric" })
        : "—";
      const st = goalStatusLabel(g);
      const mt = g.monthlyTarget != null && Number(g.monthlyTarget) > 0
        ? `${fmtMoney(g.monthlyTarget)}/mo`
        : "";
      const card = document.createElement("div");
      card.className = "bg-goal-card";
      card.style.setProperty("--goal-accent", g.color || "var(--bgt-accent)");
      card.dataset.goalId = g.id;
      card.setAttribute("role", "listitem");
      card.innerHTML = `
          <div class="bg-goal-card-name"><span class="bg-goal-card-dot" style="background:${escHtml(g.color || "var(--bgt-accent)")}"></span>${escHtml(g.name || t("budget.goals.defaultName", "Goal"))}</div>
        <div class="bg-goal-card-amt">${escHtml(t("budget.goals.savedOf", "{saved} saved of {target}", { saved: fmtMoney(saved), target: fmtMoney(tgt) }))}</div>
          <div class="bg-goal-card-bar"><div class="bg-goal-card-bar-fill" style="width:${pct.toFixed(1)}%;background:${escHtml(g.color || "var(--bgt-accent)")}"></div></div>
        <div class="bg-goal-card-meta">${pct.toFixed(0)}% - ${escHtml(t("budget.goals.byDate", "By {date}", { date: endStr }))}${mt ? ` - ${escHtml(t("budget.goals.toStayOnTrack", "+{amount} to stay on track", { amount: mt }))}` : ""}</div>
        <div class="bg-goal-card-status ${st.cls}">${escHtml(st.text)}</div>`;
      row.appendChild(card);
    });
    /* Personalised empty state when no goals exist */
    if (state.savingsGoals.length === 0 && state.wizardMeta?.completed) {
      const empty = document.createElement("div");
      empty.className = "bg-empty bg-empty--goals";
      empty.innerHTML = `
        <div class="bg-empty-icon bg-empty-icon--green" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <p class="bg-empty-title">${escHtml(t("budget.empty.goals.title") || "Create a savings goal to stay motivated")}</p>
        <p class="bg-empty-sub">${escHtml(t("budget.empty.goals.sub") || "Save for a vacation, emergency fund, or down payment.")}</p>
        <button class="bg-btn-primary bg-empty-cta" id="btnAddGoalEmpty" type="button">${escHtml(t("budget.empty.goals.cta") || "Set a Goal")}</button>`;
      row.appendChild(empty);
    }

    const add = document.createElement("button");
    add.type = "button";
    add.className = "bg-goal-add-card";
    add.id = "bgGoalAddCard";
    add.textContent = t("budget.goals.new", "+ New Goal");
    row.appendChild(add);
  }

  function renderActivityCalendar() {
    const wrap = $("bgCalendarWrap");
    if (!wrap) return;
    const parts = (state.month || "").split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      wrap.innerHTML = "";
      return;
    }
    const lastDay = new Date(y, m, 0).getDate();
    const prefix = `${y}-${String(m).padStart(2, "0")}-`;
    const byDayNum = {};
    for (let d = 1; d <= lastDay; d++) byDayNum[d] = { sum: 0, n: 0 };
    state.entries.forEach(e => {
      if (e._pending) return;
      if ((e.type || "expense") !== "expense") return;
      const dk = e.dateKey || e.date || "";
      if (!dk || dk.slice(0, 7) !== state.month) return;
      const dayNum = parseInt(dk.slice(8, 10), 10);
      if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > lastDay) return;
      byDayNum[dayNum].sum += Math.abs(e.amount || 0);
      byDayNum[dayNum].n += 1;
    });
    const totals = Object.values(byDayNum).map(v => v.sum);
    const maxSpent = Math.max(1, ...totals);
    const monthTitle = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const todayDateNum = new Date().getDate();
    const isCurrentMonth = state.month === todayKey().slice(0, 7);
    let bars = "";
    for (let d = 1; d <= lastDay; d++) {
      const info = byDayNum[d];
      const pct = Math.round((info.sum / maxSpent) * 100);
      const dkFull = `${prefix}${String(d).padStart(2, "0")}`;
      const tip = `${dkFull} · ${fmtMoney(info.sum)} · ${info.n} transaction${info.n === 1 ? "" : "s"}`;
      const showLbl = d === 1 || d === lastDay || d % 5 === 0;
      const isToday = isCurrentMonth && d === todayDateNum;
      bars += `<div class="bg-activity-bar-col${isToday ? " is-today" : ""}" title="${escHtml(tip)}">
        <div class="bg-activity-bar-fill-wrap" aria-hidden="true">
          <div class="bg-activity-bar-fill" style="height:${pct}%"></div>
        </div>
        <span class="bg-activity-bar-day${showLbl ? " bg-activity-bar-day--show" : ""}">${d}</span>
      </div>`;
    }
    wrap.innerHTML = `
      <div class="bg-activity-chart" role="region" aria-label="${escHtml(t("budget.activity.dailySpendingMonth", "Daily spending {month}", { month: monthTitle }))}">
        <div class="bg-activity-chart-head">
          <span class="bg-activity-chart-title">${escHtml(t("budget.activity.dailySpending", "Daily spending"))}</span>
          <span class="bg-activity-chart-sub">${escHtml(monthTitle)}</span>
        </div>
        <div class="bg-activity-chart-scroll">
          <div class="bg-activity-chart-bars" role="list">${bars}</div>
        </div>
      </div>`;
  }

  /* ── All section IDs (used by layout engine) ─────────────────────── */
  const ALL_SECTION_IDS = [
    "bgGoalsSection","overviewSection","bgSecPlanner","bgSecBills",
    "bgSecAccounts","bgSecChart","bgCalendarSection","bgTrendSection","bgSecTransactions",
  ];

  /* ── Full re-render ───────────────────────────────────────────────── */
  /* ════════════════════════════════════════════════════════════
     FINANCIAL HEALTH SCORE
     ════════════════════════════════════════════════════════════ */
  function computeHealthScore() {
    let score = 0;
    const income = computeIncome();
    const expenses = computeExpenses();
    const saved = Math.max(0, income - expenses);
    const savingsRate = income > 0 ? saved / income : 0;

    // Savings rate: up to 25pts
    if (savingsRate >= 0.20) score += 25;
    else if (savingsRate >= 0.10) score += 15;
    else if (savingsRate > 0) score += 5;

    // Budget adherence: up to 25pts
    const catMap = computeByCategory();
    const planCats = Object.keys(state.plan).filter(k => (state.plan[k] || 0) > 0);
    if (planCats.length > 0) {
      const pts = 25 / planCats.length;
      let adh = 0;
      planCats.forEach(cat => {
        if ((catMap[cat] || 0) <= (state.plan[cat] || 0)) adh += pts;
      });
      score += Math.round(adh);
    } else if (income > 0) {
      score += 10;
    }

    // Bills paid on time: up to 20pts
    if (state.bills.length > 0) {
      const paid = state.bills.filter(b => b.paidMonth === state.month).length;
      score += Math.round((paid / state.bills.length) * 20);
    } else {
      score += 10;
    }

    // No overspent categories: up to 20pts
    if (planCats.length > 0) {
      const okCount = planCats.filter(cat => (catMap[cat] || 0) <= (state.plan[cat] || 0)).length;
      score += Math.round((okCount / planCats.length) * 20);
    } else {
      score += 10;
    }

    // Has active savings goal: 10pts
    if (state.savingsGoals.length > 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  function renderHealthScore() {
    const section = $("bgHealthScoreSection");
    if (!section) return;
    if (!state.dataHydrated || (!hasIncomeEntries() && state.bills.length === 0 && Object.keys(state.plan).length === 0)) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    const score = computeHealthScore();
    const scoreEl = $("bgHealthScoreValue");
    const labelEl = $("bgHealthScoreLabel");
    const fillEl  = $("bgHsgFill");
    const bdEl    = $("bgHealthScoreBreakdown");

    if (scoreEl) scoreEl.textContent = String(score);

    let label, color;
    if (score >= 80)      { label = t("budget.health.excellent", "Excellent"); color = "var(--bgt-success)"; }
    else if (score >= 60) { label = t("budget.health.good",      "Good");      color = "var(--bgt-accent)"; }
    else if (score >= 40) { label = t("budget.health.fair",      "Fair");      color = "var(--bgt-orange)"; }
    else                  { label = t("budget.health.poor",      "Poor");      color = "var(--bgt-spent)"; }

    if (labelEl) { labelEl.textContent = label; labelEl.style.color = color; }

    // Arc fill (π × r = π × 55 ≈ 172.8px track length)
    const arcLen  = Math.PI * 55;
    const fillLen = (score / 100) * arcLen;
    if (fillEl) {
      fillEl.setAttribute("stroke", color);
      fillEl.setAttribute("stroke-dasharray", `${fillLen.toFixed(1)} ${(arcLen + 4).toFixed(1)}`);
    }

    if (bdEl) {
      const catMap  = computeByCategory();
      const planCats = Object.keys(state.plan).filter(k => (state.plan[k] || 0) > 0);
      const allOk   = planCats.length === 0 || planCats.every(c => (catMap[c] || 0) <= (state.plan[c] || 0));
      const income  = computeIncome();
      const expenses = computeExpenses();
      const sr      = income > 0 ? Math.round((Math.max(0, income - expenses) / income) * 100) : 0;
      const billsPaid = state.bills.filter(b => b.paidMonth === state.month).length;
      const items = [
        { ok: sr >= 10,                  label: `${t("budget.health.savingsRate","Savings rate")} ${sr}%` },
        { ok: planCats.length > 0 && allOk, na: planCats.length === 0, label: t("budget.health.adherence","Budget adherence") },
        { ok: state.bills.length > 0 && billsPaid === state.bills.length, na: state.bills.length === 0, label: `${t("budget.bills.title","Bills")} ${billsPaid}/${state.bills.length} ${t("budget.bills.paid","paid")}` },
        { ok: state.savingsGoals.length > 0, label: t("budget.health.goalSet","Savings goal set") },
      ];
      bdEl.innerHTML = items.map(item =>
        `<div class="bg-hsc-item">
          <span class="bg-hsc-icon">${item.na ? "—" : item.ok ? "✅" : "❌"}</span>
          <span class="bg-hsc-label">${escHtml(item.label)}</span>
        </div>`
      ).join("");
    }
  }

  /* ════════════════════════════════════════════════════════════
     SPENDING STREAK
     ════════════════════════════════════════════════════════════ */
  function renderSpendingStreak() {
    const el = $("bgSpendingStreak");
    if (!el) return;
    const totalPlan = totalMonthlyPlan();
    if (!totalPlan || !state.dataHydrated || state.month !== todayKey().slice(0, 7)) {
      el.style.display = "none";
      return;
    }
    const daysInMonth = daysInMonthYm(state.month);
    const dailyBudget = totalPlan / daysInMonth;
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < today.getDate(); i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dk = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
      const daySpend = state.entries
        .filter(e => (e.dateKey || e.date || "") === dk && (e.type || "expense") === "expense")
        .reduce((s, e) => s + Math.abs(e.amount || 0), 0);
      if (daySpend <= dailyBudget) streak++;
      else break;
    }
    if (streak === 0) { el.style.display = "none"; return; }
    const color = streak >= 3 ? "var(--bgt-success)" : "var(--bgt-accent)";
    el.style.display = "";
    el.style.setProperty("--streak-color", color);
    el.textContent = `🔥 ${t("budget.streak.day", "Day {n} under budget", { n: streak })}`;
  }

  /* ════════════════════════════════════════════════════════════
     BILLS SUMMARY META
     ════════════════════════════════════════════════════════════ */
  /* ════════════════════════════════════════════════════════════
     50/30/20 AUTO-FILL
     ════════════════════════════════════════════════════════════ */
  function open5030Sheet() {
    const income  = computeIncome();
    const preview = $("bgAutofillPreview");
    const applyBtn = $("bgAutofillApply");
    if (!preview) return;
    if (!income) {
      preview.innerHTML = `<p class="bg-autofill-note">${escHtml(t("budget.planner.autofillNoIncome","Log your income first to use this feature."))}</p>`;
      if (applyBtn) applyBtn.style.display = "none";
    } else {
      const needs   = income * 0.50;
      const wants   = income * 0.30;
      const savings = income * 0.20;
      preview.innerHTML = `
        <div class="bg-autofill-info">${escHtml(t("budget.planner.autofillBased","Based on your income of"))} <strong>${fmtMoney(income)}</strong></div>
        <div class="bg-autofill-row"><div class="bg-autofill-label"><span class="bg-autofill-dot" style="background:var(--bgt-saved)"></span><span>${escHtml(t("budget.planner.needs", "Needs (50%)"))}</span></div><span class="bg-autofill-amount">${fmtMoney(needs)}</span></div>
        <div class="bg-autofill-cats">Housing · Transport · Health · Subscriptions</div>
        <div class="bg-autofill-row"><div class="bg-autofill-label"><span class="bg-autofill-dot" style="background:var(--bgt-accent)"></span><span>${escHtml(t("budget.planner.wants", "Wants (30%)"))}</span></div><span class="bg-autofill-amount">${fmtMoney(wants)}</span></div>
        <div class="bg-autofill-cats">Food · Fun · Shopping</div>
        <div class="bg-autofill-row"><div class="bg-autofill-label"><span class="bg-autofill-dot" style="background:var(--bgt-success)"></span><span>${escHtml(t("budget.planner.savingsSplit", "Savings (20%)"))}</span></div><span class="bg-autofill-amount">${fmtMoney(savings)}</span></div>
        <div class="bg-autofill-cats">Savings · Education</div>`;
      if (applyBtn) applyBtn.style.display = "";
    }
    openOverlay("autofillOverlay");
  }

  async function apply5030Plan() {
    const income = computeIncome();
    if (!income) return;
    const needsCats   = ["housing", "transport", "health", "subscriptions"];
    const wantsCats   = ["food", "entertainment", "shopping"];
    const savingsCats = ["savings", "education"];
    const needsEach   = Math.round((income * 0.50) / needsCats.length);
    const wantsEach   = Math.round((income * 0.30) / wantsCats.length);
    const savingsEach = Math.round((income * 0.20) / savingsCats.length);
    needsCats.forEach(c => { state.plan[c] = needsEach; });
    wantsCats.forEach(c => { state.plan[c] = wantsEach; });
    savingsCats.forEach(c => { state.plan[c] = savingsEach; });
    await savePlan();
    closeOverlay("autofillOverlay");
    state.plannerMode = "track";
    persistPlannerMode();
    renderAll();
    showToast(t("budget.planner.autofillApplied", "50/30/20 plan applied! ✨"));
  }

  /* ════════════════════════════════════════════════════════════
     PDF EXPORT
     ════════════════════════════════════════════════════════════ */
  function exportPDF() {
    const sym = currencySymbol();
    const totalIncome = sumEntryAmounts(state.entries, "income");
    const totalSpent  = sumEntryAmounts(state.entries, "expense");
    const saved       = totalIncome - totalSpent;
    const rate        = totalIncome > 0 ? Math.round((Math.max(0, saved) / totalIncome) * 100) : 0;

    const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v); };
    set("prIncome",      sym + fmt(totalIncome));
    set("prSpent",       sym + fmt(totalSpent));
    set("prSaved",       sym + fmt(Math.max(0, saved)));
    set("prSavingsRate", rate + "%");
    set("prSubLine",     monthLabel(state.month) + " · " + new Date().toLocaleDateString());

    const tbody = $("prCategoryBody");
    if (tbody) {
      tbody.innerHTML = "";
      CATEGORIES.forEach(cat => {
        const actual    = state.entries.filter(e => e.type === "expense" && e.category === cat.id)
          .reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const budgeted  = Number(state.plan[cat.id]) || 0;
        if (actual === 0 && budgeted === 0) return;
        const remaining = budgeted - actual;
        const status    = budgeted === 0 ? "—" : actual > budgeted ? "⚠ Over" : "✓ OK";
        tbody.innerHTML += `<tr>
          <td>${escHtml(cat.label)}</td>
          <td>${budgeted > 0 ? sym + fmt(budgeted) : "—"}</td>
          <td>${sym + fmt(actual)}</td>
          <td>${budgeted > 0 ? sym + fmt(remaining) : "—"}</td>
          <td>${status}</td>
        </tr>`;
      });
    }

    const billsEl = $("prBillsList");
    if (billsEl) {
      billsEl.innerHTML = state.bills.length === 0 ? `<p>${escHtml(t("budget.empty.bills", "No bills."))}</p>` :
        state.bills.map(b => {
          const paid = b.paidMonth === state.month;
          return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bgt-border)">
            <span>${escHtml(b.name || t("budget.pdf.billFallback", "Bill"))}</span>
            <span>${sym + fmt(b.amount)} - ${escHtml(paid ? t("budget.bill.paid", "✓ Paid") : t("budget.bill.unpaid", "✗ Unpaid"))}</span>
          </div>`;
        }).join("");
    }

    const goalsEl = $("prGoalsList");
    if (goalsEl) {
      goalsEl.innerHTML = state.savingsGoals.length === 0 ? `<p>${escHtml(t("budget.empty.goals", "No savings goals."))}</p>` :
        state.savingsGoals.map(g => {
          const curr   = Number(g.currentAmount) || 0;
          const target = Number(g.targetAmount)  || 0;
          const pct    = target > 0 ? Math.round((curr / target) * 100) : 0;
          return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bgt-border)">
            <span>${escHtml(g.name || t("budget.goal.title", "Goal"))}</span>
            <span>${sym + fmt(curr)} / ${sym + fmt(target)} (${pct}%)</span>
          </div>`;
        }).join("");
    }

    const assets      = state.accounts.filter(a => a.type !== "debt" && a.type !== "credit_card").reduce((s, a) => s + (Number(a.balance) || 0), 0);
    const liabilities = state.accounts.filter(a => a.type === "debt" || a.type === "credit_card").reduce((s, a) => s + (Number(a.balance) || 0), 0);
    set("prNetWorth", sym + fmt(assets - liabilities));

    const report = $("bgPrintReport");
    if (report) report.style.removeProperty("display");
    window.print();
    setTimeout(() => { if (report) report.style.display = "none"; }, 1200);
  }

  function renderAll() {
    renderHeader();
    renderKpis();
    renderPremiumBudgetHome();
    renderSetupChecklist();
    renderSmartAlerts();

    /* ── Apply personalised layout ── */
    if (state.wizardMeta?.completed) {
      const config = buildLayoutConfig();
      const main = document.getElementById("main-content");

      /* Re-order sections in the DOM and set open/hidden state */
      config.forEach(({ id, expanded }) => {
        const el = document.getElementById(id);
        if (!el) return;
        main.appendChild(el);          // moves to end — config order maintained
        el.style.display = "";
        if (el.tagName === "DETAILS") {
          if (expanded) el.setAttribute("open", "");
          else          el.removeAttribute("open");
        }
      });

      /* Hide sections not in config */
      const visibleIds = new Set(config.map(c => c.id));
      ALL_SECTION_IDS.forEach(id => {
        if (!visibleIds.has(id)) {
          const el = document.getElementById(id);
          if (el) el.style.display = "none";
        }
      });
    }

    /* ── Render content into all sections ── */
    renderGoalsSection();
    renderOverviewDonut();
    renderBudgetPlanner();
    renderBills();
    renderBillsSummary();
    renderAccounts();
    renderActivityCalendar();
    renderPieChart();
    renderEntries();
    renderDailyAllowanceChip();
    renderHealthScore();
    renderSpendingStreak();
    applyPremiumBudgetStructure();

    if (!state.trendLoaded && !state.trendLoading) {
      const sk = $("bgTrendSkeleton");
      if (sk && !sk.dataset.built) {
        sk.dataset.built = "1";
        sk.innerHTML = Array.from({ length: 6 }, () =>
          `<div class="bg-trend-sk-pair"><div class="bg-trend-sk-bar"></div><div class="bg-trend-sk-bar"></div></div>`
        ).join("");
      }
    }
  }

  /* ── Header ───────────────────────────────────────────────────────── */
  function renderHeader() {
    const d = new Date();
    setText("bgDate", d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase());
    setText("monthLabel", monthLabel(state.month));
    const identity = getPrimaryMoneyIdentity();
    setText("bgHeaderTitle", identity.title || t("nav.budget", "Budget"));
    const sel = $("currencySelect");
    if (sel) sel.value = state.currency;
  }

  /* ── KPI cards ────────────────────────────────────────────────────── */
  function renderKpis() {
    const incEl = $("sumIncome");
    const expEl = $("sumExpenses");
    const remEl = $("sumRemaining");
    if (!state.dataHydrated) {
      [incEl, expEl, remEl].forEach((el) => {
        if (!el) return;
        el.classList.add("skeleton");
        el.textContent = "\u00a0";
      });
      return;
    }
    [incEl, expEl, remEl].forEach((el) => el && el.classList.remove("skeleton"));
    const income    = computeIncome();
    const expenses  = computeExpenses();
    const remaining = income - expenses;
    setText("sumIncome",    fmtMoney(income));
    setText("sumExpenses",  fmtMoney(expenses));
    setText("sumRemaining", fmtMoney(remaining));
    if (remEl) remEl.style.color = remaining < 0 ? "var(--bgt-red)" : remaining > 0 && income > 0 ? "var(--bgt-green)" : "";

    const prevIncome = state.kpiComparison?.income;
    const prevExpenses = state.kpiComparison?.expenses;
    const prevRemaining = prevIncome - prevExpenses;
    const fmtTrend = (curr, prev) => {
      if (!Number.isFinite(prev) || Math.abs(prev) < 0.01) return "—";
      const delta = ((curr - prev) / Math.abs(prev)) * 100;
      const arrow = delta > 0 ? "^" : delta < 0 ? "v" : "-";
      return `${arrow} ${Math.abs(delta).toFixed(0)}%`;
    };
    const trendIncomeEl = $("sumIncomeTrend");
    const trendSpentEl = $("sumExpensesTrend");
    const trendRemainingEl = $("sumRemainingTrend");
    if (trendIncomeEl) {
      trendIncomeEl.textContent = fmtTrend(income, prevIncome);
      const pos = Number.isFinite(prevIncome) ? income >= prevIncome : null;
      trendIncomeEl.className = `bg-kpi-trend ${pos == null ? "bg-kpi-trend--neutral" : (pos ? "bg-kpi-trend--pos" : "bg-kpi-trend--neg")}`;
    }
    if (trendSpentEl) {
      trendSpentEl.textContent = fmtTrend(expenses, prevExpenses);
      const up = expenses > prevExpenses;
      trendSpentEl.className = `bg-kpi-trend ${up ? "bg-kpi-trend--neg" : "bg-kpi-trend--pos"}`;
    }
    if (trendRemainingEl) {
      trendRemainingEl.textContent = fmtTrend(remaining, prevRemaining);
      const pos = remaining >= prevRemaining;
      trendRemainingEl.className = `bg-kpi-trend ${pos ? "bg-kpi-trend--pos" : "bg-kpi-trend--neg"}`;
    }
  }

  function getPrimaryMoneyIdentity() {
    const assetAccounts = state.accounts.filter(a => a.type === "salary" || a.type === "cash");
    const preferredAccount = assetAccounts[0] || state.accounts[0] || null;
    const incomeEntries = state.entries
      .filter(e => (e.type || "expense") === "income" && !e._pending)
      .sort((a, b) => (b.dateKey || b.date || "").localeCompare(a.dateKey || a.date || ""));
    const namedIncome = incomeEntries.find(e => (e.description || "").trim());

    if (preferredAccount) {
      return {
        title: preferredAccount.name || t("budget.identity.account", "Account"),
        type: preferredAccount.type,
        balance: Number(preferredAccount.balance) || 0,
        count: state.accounts.length,
      };
    }
    if (namedIncome) {
      const uniqueNames = new Set(incomeEntries.map(e => (e.description || "").trim()).filter(Boolean));
      return {
        title: uniqueNames.size > 1 ? t("budget.identity.incomeSources", "Income sources") : namedIncome.description.trim(),
        type: "income",
        balance: computeIncome(),
        count: uniqueNames.size || incomeEntries.length,
      };
    }
    return {
      title: t("nav.budget", "Budget"),
      type: "budget",
      balance: computeIncome() - computeExpenses(),
      count: 0,
    };
  }

  function renderPremiumBudgetHome() {
    const titleEl = $("bgPremiumTitle");
    if (!titleEl) return;

    const income = computeIncome();
    const spent = computeExpenses();
    const remainingRaw = income - spent;
    const remaining = Math.max(0, remainingRaw);
    const debt = computeDebt();
    const netWorth = computeNetWorth();
    const planTotal = totalMonthlyPlan();
    const savingsSaved = state.savingsGoals.reduce((s, g) => s + (Number(g.saved) || 0), 0);
    const billsDue = state.bills
      .filter(b => b.paidMonth !== state.month)
      .reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const identity = getPrimaryMoneyIdentity();
    const month = monthLabel(state.month);
    const spentPct = income > 0 ? Math.min(999, (spent / income) * 100) : (planTotal > 0 ? Math.min(999, (spent / planTotal) * 100) : 0);

    const hasData = state.dataHydrated && (income > 0 || spent > 0 || state.accounts.length > 0 || state.savingsGoals.length > 0 || state.bills.length > 0);
    const heroMode = chooseHeroMode();
    const heroValue = heroMode === "balance"
      ? netWorth
      : heroMode === "spent"
        ? spent
        : heroMode === "debt"
          ? debt
          : remainingRaw;

    titleEl.textContent = identity.title || t("nav.budget", "Budget");
    setText("bgPremiumEyebrow", month);
    setText("bgPremiumMainValue", state.dataHydrated ? fmtMoney(heroValue) : "...");
    setText("bgPremiumMainSub", getHeroSubline(heroMode, { income, spent, remainingRaw, planTotal, netWorth, debt }));

    const chip = $("bgPremiumStatusChip");
    const note = $("bgPremiumStatusNote");
    if (chip) {
      chip.className = "bg-premium-status-chip";
      if (!state.dataHydrated) {
        chip.textContent = t("budget.status.checking", "Checking");
      } else if (!hasData) {
        chip.textContent = t("budget.status.setup", "Set up");
        chip.classList.add("is-warn");
      } else if (remainingRaw < 0) {
        chip.textContent = t("budget.status.over", "Over budget");
        chip.classList.add("is-danger");
      } else if (spentPct >= 80) {
        chip.textContent = t("budget.status.close", "Close watch");
        chip.classList.add("is-warn");
      } else {
        chip.textContent = t("budget.status.onTrack", "On track");
        chip.classList.add("is-good");
      }
    }
    if (note) {
      note.textContent = !state.dataHydrated
        ? t("budget.status.loading", "Loading your money picture.")
        : !hasData
          ? t("budget.status.setupNote", "Add income, expenses, or accounts to personalize this view.")
          : t("budget.status.note", "{spent} spent in {month}", { spent: fmtMoney(spent), month });
    }

    const acctText = $("bgPremiumAccountText");
    if (acctText) {
      if (identity.type === "income" && identity.count > 1) {
        acctText.textContent = t("budget.identity.incomeCount", "{count} incomes", { count: String(identity.count) });
      } else if (state.accounts.length > 1) {
        acctText.textContent = t("budget.identity.accountCount", "{count} accounts", { count: String(state.accounts.length) });
      } else {
        acctText.textContent = identity.title || t("budget.accounts", "Accounts");
      }
    }
    setPremiumActionLabels();

    renderPremiumSummaryCards({ income, spent, remainingRaw, debt, netWorth, planTotal, savingsSaved, billsDue, spentPct });
    renderPremiumInsightCards({ income, spent, remainingRaw, debt, savingsSaved, billsDue, spentPct });
  }

  function setPremiumActionLabels() {
    const labels = [
      ["bgQuickExpense", "budget.quick.expense", "Expense"],
      ["bgQuickIncome", "budget.quick.income", "Income"],
      ["bgQuickBill", "budget.quick.bill", "Bill"],
      ["bgQuickAccount", "budget.quick.account", "Account"],
      ["bgQuickGoal", "budget.quick.goal", "Goal"],
    ];
    labels.forEach(([id, key, fallback]) => {
      const el = $(id)?.querySelector(".bg-premium-action-label");
      if (el) el.textContent = t(key, fallback);
    });
  }

  function chooseHeroMode() {
    const m = state.wizardMeta || {};
    if (m.goal === "debt") return "debt";
    if (m.goal === "insight" || m.level === "advanced") return "balance";
    if (m.goal === "spend_track") return "spent";
    return "remaining";
  }

  function getHeroSubline(mode, values) {
    if (!state.dataHydrated) return t("budget.hero.loading", "Loading budget");
    if (mode === "balance") return t("budget.hero.balanceSub", "Total balance after debt");
    if (mode === "debt") return t("budget.hero.debtSub", "Debt and credit tracked");
    if (mode === "spent") {
      const base = values.planTotal > 0 ? values.planTotal : values.income;
      return base > 0
        ? t("budget.hero.spentSub", "{spent} of {base} used", { spent: fmtMoney(values.spent), base: fmtMoney(base) })
        : t("budget.hero.spentNoBase", "Spent this month");
    }
    return values.income > 0
      ? t("budget.hero.remainingSub", "{spent} spent from {income}", { spent: fmtMoney(values.spent), income: fmtMoney(values.income) })
      : t("budget.hero.remainingNoIncome", "Log income to calculate what is left");
  }

  function buildSummaryCandidates(values) {
    const cards = [
      {
        key: "remaining",
        title: t("budget.summary.remaining", "Budget left"),
        value: fmtMoney(values.remainingRaw),
        meta: values.income > 0
          ? t("budget.summary.remainingMeta", "{pct}% used", { pct: String(Math.round(values.spentPct || 0)) })
          : t("budget.summary.needsIncome", "Needs income"),
        tone: values.remainingRaw < 0 ? "danger" : "orange",
        bars: values.spentPct,
      },
      {
        key: "balance",
        title: t("budget.summary.balance", "Total balance"),
        value: fmtMoney(values.netWorth),
        meta: t("budget.networth", "Net worth"),
        tone: values.netWorth < 0 ? "danger" : "blue",
        bars: 65,
      },
      {
        key: "savings",
        title: t("budget.summary.savings", "Savings"),
        value: fmtMoney(values.savingsSaved),
        meta: t("budget.summary.savingsMeta", "{count} goals", { count: String(state.savingsGoals.length) }),
        tone: "green",
        bars: state.savingsGoals.length ? 74 : 18,
      },
      {
        key: "debt",
        title: t("budget.summary.debt", "Debt"),
        value: fmtMoney(values.debt),
        meta: t("budget.summary.debtMeta", "Cards and loans"),
        tone: values.debt > 0 ? "danger" : "muted",
        bars: values.debt > 0 ? 82 : 8,
      },
      {
        key: "bills",
        title: t("budget.summary.bills", "Bills due"),
        value: fmtMoney(values.billsDue),
        meta: t("budget.summary.billsMeta", "{count} unpaid", {
          count: String(state.bills.filter(b => b.paidMonth !== state.month).length),
        }),
        tone: values.billsDue > 0 ? "olive" : "muted",
        bars: values.billsDue > 0 ? 56 : 10,
      },
    ];

    const priority = [];
    const m = state.wizardMeta || {};
    if (m.goal === "save") priority.push("savings", "remaining", "balance");
    else if (m.goal === "debt") priority.push("debt", "bills", "remaining");
    else if (m.goal === "insight") priority.push("balance", "remaining", "spent");
    else priority.push("remaining", "balance", "bills");
    if (values.debt > 0 && !priority.includes("debt")) priority.splice(1, 0, "debt");
    if (values.savingsSaved > 0 && !priority.includes("savings")) priority.splice(1, 0, "savings");
    if (values.billsDue > 0 && !priority.includes("bills")) priority.splice(1, 0, "bills");

    const orderedKeys = [...new Set(priority)].filter(k => cards.some(c => c.key === k));
    cards.forEach(c => { if (!orderedKeys.includes(c.key)) orderedKeys.push(c.key); });
    return orderedKeys.map(k => cards.find(c => c.key === k)).filter(Boolean).slice(0, 3);
  }

  function renderPremiumSummaryCards(values) {
    const host = $("bgPremiumSummaryCards");
    if (!host) return;
    if (!state.dataHydrated) {
      host.innerHTML = Array.from({ length: 3 }, () => `<div class="bg-premium-summary-card skeleton" aria-hidden="true"></div>`).join("");
      return;
    }
    host.innerHTML = buildSummaryCandidates(values).map(card => {
      const pct = Math.max(0, Math.min(100, Number(card.bars) || 0));
      const blocks = [22, 44, 68, pct].map((h, i) =>
        `<span class="bg-premium-mini-bar${i === 3 ? " is-active" : ""}" style="height:${Math.max(12, Math.min(92, h))}%"></span>`
      ).join("");
      return `
        <article class="bg-premium-summary-card bg-premium-summary-card--${escHtml(card.tone)}">
          <div class="bg-premium-summary-copy">
            <span class="bg-premium-summary-title">${escHtml(card.title)}</span>
            <strong>${escHtml(card.value)}</strong>
            <span>${escHtml(card.meta)}</span>
          </div>
          <div class="bg-premium-mini-bars" aria-hidden="true">${blocks}</div>
        </article>`;
    }).join("");
  }

  function renderPremiumInsightCards(values) {
    const host = $("bgPremiumInsightCards");
    if (!host) return;
    if (!state.dataHydrated) {
      host.innerHTML = `<article class="bg-premium-guidance-card skeleton" aria-hidden="true"></article>`;
      return;
    }
    const cards = [];
    if (!hasIncomeEntries()) {
      cards.push({
        tone: "slate",
        title: t("budget.guidance.income.title", "Add income"),
        body: t("budget.guidance.income.body", "Log paychecks or other incoming money so your remaining budget is accurate."),
        action: "income",
      });
    }
    if (state.bills.length === 0 || values.billsDue > 0) {
      cards.push({
        tone: "olive",
        title: state.bills.length === 0 ? t("budget.guidance.bills.title", "Set up bills") : t("budget.guidance.billsDue.title", "Bills need attention"),
        body: state.bills.length === 0
          ? t("budget.guidance.bills.body", "Add rent, subscriptions, and card payments so nothing sneaks up.")
          : t("budget.guidance.billsDue.body", "{amount} is still unpaid this month.", { amount: fmtMoney(values.billsDue) }),
        action: "bill",
      });
    }
    if (!hasAnyPlanLimit()) {
      cards.push({
        tone: "orange",
        title: t("budget.guidance.plan.title", "Plan your categories"),
        body: t("budget.guidance.plan.body", "Set limits for food, transport, and fun to make the month easier to read."),
        action: "planner",
      });
    }
    if (values.spentPct >= 80) {
      cards.push({
        tone: "danger",
        title: t("budget.guidance.watch.title", "Slow the pace"),
        body: t("budget.guidance.watch.body", "Spending is close to the budget line. Check Activity before the next purchase."),
        action: "activity",
      });
    }
    if (cards.length === 0) {
      cards.push({
        tone: "slate",
        title: t("budget.guidance.ready.title", "Your month is readable"),
        body: t("budget.guidance.ready.body", "Activity, bills, and goals are connected. Keep logging small changes."),
        action: "activity",
      });
    }

    host.innerHTML = cards.slice(0, 3).map(card => `
      <article class="bg-premium-guidance-card bg-premium-guidance-card--${escHtml(card.tone)}" data-guidance-action="${escHtml(card.action)}">
        <button type="button" class="bg-premium-guidance-close" aria-label="${escHtml(t("common.dismiss", "Dismiss"))}">×</button>
        <strong>${escHtml(card.title)}</strong>
        <p>${escHtml(card.body)}</p>
        <button type="button" class="bg-premium-guidance-arrow" aria-label="${escHtml(card.title)}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </article>`).join("");
  }

  function applyPremiumBudgetStructure() {
    // Layout is now handled by buildLayoutConfig() + CSS grid only.
    const tx = $("bgSecTransactions");
    if (tx) {
      tx.style.display = "";
      if (tx.tagName === "DETAILS") tx.setAttribute("open", "");
    }
    const insightsMeta = $("bgInsightsMeta");
    if (insightsMeta) {
      const visibleCount = ALL_SECTION_IDS.filter(id => {
        const el = $(id);
        return el && el.style.display !== "none";
      }).length;
      insightsMeta.textContent = t("budget.insights.meta", "{count} sections", { count: String(visibleCount) });
    }
  }

  /* ── Overview donut + net worth ───────────────────────────────────── */
  function renderOverviewDonut() {
    const ovIds = ["ovIncome", "ovSpent", "ovDebt", "ovRemaining"];
    if (!state.dataHydrated) {
      ovIds.forEach((id) => {
        const el = $(id);
        if (el) {
          el.classList.add("skeleton");
          el.textContent = "\u00a0";
        }
      });
      const chip = $("netWorthChip");
      if (chip) {
        chip.classList.add("skeleton");
        chip.textContent = "\u00a0";
      }
      return;
    }
    ovIds.forEach((id) => {
      const el = $(id);
      if (el) el.classList.remove("skeleton");
    });
    const nw = $("netWorthChip");
    if (nw) nw.classList.remove("skeleton");

    const income    = computeIncome();
    const spent     = computeExpenses();
    const debt      = computeDebt();
    const remaining = Math.max(0, income - spent);
    const netWorth  = computeNetWorth();

    setText("ovIncome",    fmtMoney(income));
    setText("ovSpent",     fmtMoney(spent));
    setText("ovDebt",      fmtMoney(debt));
    setText("ovRemaining", fmtMoney(remaining));

    const remEl = $("ovRemaining");
    if (remEl) remEl.style.color = (income - spent) < 0 ? "var(--bgt-red)" : "var(--bgt-blue)";

    /* Net worth chip */
    const chip = $("netWorthChip");
    if (chip) {
      chip.textContent = `${t("budget.networth")}: ${fmtMoney(netWorth)}`;
      chip.classList.toggle("negative", netWorth < 0);
    }

    /* SVG donut */
    const svg = $("overviewDonut");
    if (!svg) return;

    const total = income || (spent + debt + remaining) || 1;
    const CX = 80, CY = 80, R = 58, SW = 20;
    const CIRC = 2 * Math.PI * R;

    const segs = [
      { frac: spent / total,     color: "var(--bgt-accent)" },
      { frac: remaining / total, color: "var(--bgt-saved)" },
      { frac: debt / total,      color: "var(--bgt-spent)" },
    ].filter(s => s.frac > 0.001);

    const track = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${SW}"/>`;
    let acc = 0;
    const circles = segs.map(s => {
      const len = s.frac * CIRC;
      const off = -(acc * CIRC);
      acc += s.frac;
      return `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${s.color}"
        stroke-width="${SW}" stroke-dasharray="${len.toFixed(2)} ${CIRC.toFixed(2)}"
        stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${CX} ${CY})"
        style="transition:stroke-dasharray .5s ease"/>`;
    }).join("");

    /* Center: income label */
    const hole = `<circle cx="${CX}" cy="${CY}" r="${R - SW / 2 - 2}" fill="var(--bgt-surface-2)"/>`;
    const centerAmt   = fmtMoney(income);
    const centerLabel = income > 0 ? "income" : "—";
    const textEls = `
      <text x="${CX}" y="${CY - 4}" text-anchor="middle" font-size="11" font-weight="800"
      fill="var(--bgt-text-1)" font-family="system-ui,-apple-system,sans-serif">${escHtml(centerAmt)}</text>
      <text x="${CX}" y="${CY + 10}" text-anchor="middle" font-size="8" font-weight="600"
      fill="var(--bgt-text-3)" font-family="system-ui,-apple-system,sans-serif">${centerLabel}</text>`;

    svg.innerHTML = `<g>${track}${circles}</g>${hole}${textEls}`;
  }

  function fmtHtmlMoney(n) {
    return escHtml(fmtMoney(Number(n) || 0));
  }

  function readPlannerDraftFromDom() {
    const list = $("plannerList");
    if (!list) return;
    state.plannerDraft = {};
    list.querySelectorAll("[data-plan-cat]").forEach(inp => {
      const raw = parseFloat(inp.value);
      if (Number.isFinite(raw) && raw > 0) state.plannerDraft[inp.dataset.planCat] = raw;
    });
  }

  function updatePlannerPlanHints(listEl) {
    const list = listEl || $("plannerList");
    if (!list) return;
    const income = computeIncome();
    const draft = {};
    list.querySelectorAll("[data-plan-cat]").forEach(inp => {
      const raw = parseFloat(inp.value);
      if (Number.isFinite(raw) && raw > 0) draft[inp.dataset.planCat] = raw;
    });
    const sumDraft = CATEGORIES.reduce((s, c) => s + (Number(draft[c.id]) || 0), 0);
    const txt = `${fmtMoney(Math.max(0, income - sumDraft))} of income unallocated`;
    list.querySelectorAll(".bg-planner-plan-hint").forEach(h => { h.textContent = txt; });
  }

  /* ── Budget Planner ───────────────────────────────────────────────── */
  function renderBudgetPlanner() {
    const list = $("plannerList");
    const sumEl = $("bgPlannerSummary");
    if (!list) return;
    syncPlannerToggleUi();
    list.classList.toggle("bg-planner-inview", state.plannerInView);
    const catMap = computeByCategory();
    const mode = state.plannerMode;

    if (mode === "plan") {
      list.innerHTML = CATEGORIES.map(row => {
        const v = state.plannerDraft[row.id] != null ? state.plannerDraft[row.id] : (state.plan[row.id] || "");
        const val = v === "" || v == null ? "" : String(v);
        return `
        <div class="bg-planner-row bg-planner-row--plan bg-planner-plan-card" data-cat="${row.id}" role="listitem">
          <div class="bg-planner-plan-card-top">
            <div class="bg-planner-icon" style="background:${softColor(row.color)};color:${row.color}">${catIconSvg(row.id, 20)}</div>
            <div class="bg-planner-plan-head">
              <div class="bg-planner-name">${escHtml(row.label)}</div>
              <div class="bg-planner-plan-field">
                <label class="bg-planner-plan-lbl" for="planInp-${row.id}">${escHtml(t("budget.limit.monthlyLimit", "Monthly limit"))}</label>
                <input id="planInp-${row.id}" class="bg-planner-plan-input" type="number" min="0" step="1" data-plan-cat="${row.id}"
                       value="${escHtml(val)}" placeholder="0" aria-label="${escHtml(t("budget.aria.limitFor", "Limit for {category}", { category: row.label }))}" />
              </div>
            </div>
          </div>
          <div class="bg-planner-plan-hint"></div>
        </div>`;
      }).join("");
      updatePlannerPlanHints(list);
    } else {
      const catIds = new Set([
        ...Object.keys(state.plan).filter(k => (state.plan[k] || 0) > 0),
        ...Object.keys(catMap).filter(k => (catMap[k] || 0) > 0),
      ]);
      const allTrackRows = CATEGORIES.filter(c => catIds.has(c.id)).map(c => ({
        ...c,
        spent: catMap[c.id] || 0,
        limit: state.plan[c.id] || 0,
      }));
      const cap = 6;
      const capped = !state.plannerShowAll && allTrackRows.length > cap;
      const rows = capped ? allTrackRows.slice(0, cap) : allTrackRows;

      let rowsHtml = rows.map(row => {
        const hasLimit = row.limit > 0;
        const displayPct = hasLimit
          ? Math.min((row.spent / row.limit) * 100, 999)
          : 0;
        const pctClamped = hasLimit ? Math.min((row.spent / row.limit) * 100, 100) : 0;
        const over = hasLimit && row.spent > row.limit;
        const warn = hasLimit && !over && pctClamped >= 80;
        let barColor = "var(--bgt-text-3)";
        if (hasLimit) {
          if (over) barColor = "var(--bgt-spent)";
          else if (warn) barColor = "var(--bgt-warning)";
          else barColor = "var(--bgt-accent)";
        } else if (row.spent > 0) {
          barColor = "var(--bgt-accent)";
        }
        const barWidth = hasLimit
          ? `${Math.min(displayPct, 100)}%`
          : `${Math.min((row.spent / Math.max(computeExpenses(), 1)) * 100, 100)}%`;
        const animClass = state.plannerInView ? "bg-planner-anim" : "";
        return `
        <div class="bg-planner-row bg-planner-row--track${hasLimit ? "" : " bg-planner-row--nolimit"}" data-cat="${row.id}" data-mode="track" data-has-limit="${hasLimit ? "1" : "0"}" role="listitem" tabindex="0"
             aria-label="${escHtml(t("budget.aria.budgetFor", "Budget {category}", { category: row.label }))}">
          <div class="bg-planner-icon" style="background:${softColor(row.color)};color:${row.color}">${catIconSvg(row.id, 20)}</div>
          <div class="bg-planner-info">
            <div class="bg-planner-name">${escHtml(row.label)}</div>
            <div class="bg-planner-bar-wrap">
              <div class="bg-planner-bar-fill ${animClass}" style="width:${barWidth};background:${barColor}"></div>
            </div>
          </div>
          <div class="bg-planner-amounts">
            <div class="bg-planner-topline" style="display:flex;align-items:center;gap:6px;justify-content:flex-end;flex-wrap:wrap">
              <span class="bg-planner-spent" style="color:${row.color}">${fmtMoney(row.spent)}</span>
              <span class="bg-planner-limit ${hasLimit ? "" : "no-limit"}">
                ${hasLimit ? "/ " + fmtHtmlMoney(row.limit) : escHtml(t("budget.planner.noLimit"))}
                ${!hasLimit ? `<button type="button" class="bg-planner-set-limit" data-set-plan-cat="${row.id}">${escHtml(t("budget.planner.setLimitCta", "+ Set limit"))}</button>` : ""}
              </span>
              ${hasLimit ? `<span class="bg-planner-pct">${Math.round(Math.min((row.spent / row.limit) * 100, 999))}%</span>` : ""}
              ${over ? `<span class="bg-planner-over-badge">${escHtml(t("budget.status.overShort", "OVER"))}</span>` : ""}
            </div>
          </div>
        </div>`;
      }).join("");
      if (capped) {
        rowsHtml += `<div class="bg-planner-more-row" role="presentation">
          <button type="button" class="bg-btn-ghost bg-planner-show-all" aria-label="${escHtml(t("budget.planner.showAllCategories"))}">${escHtml(t("budget.planner.showAllCategories"))}</button>
        </div>`;
      } else if (state.plannerShowAll && allTrackRows.length > cap) {
        rowsHtml += `<div class="bg-planner-more-row" role="presentation">
          <button type="button" class="bg-btn-ghost bg-planner-show-less" aria-label="${escHtml(t("budget.planner.showFewerCategories"))}">${escHtml(t("budget.planner.showFewerCategories"))}</button>
        </div>`;
      }
      /* Personalised empty state in track mode when no data at all */
      if (allTrackRows.length === 0 && state.wizardMeta?.completed) {
        list.innerHTML = `
          <div class="bg-empty bg-empty--planner">
            <div class="bg-empty-icon bg-empty-icon--accent" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="13" height="4" rx="1"/>
                <rect x="3" y="17" width="8" height="4" rx="1"/>
              </svg>
            </div>
            <p class="bg-empty-title">${escHtml(t("budget.empty.planner.title") || "Set budget limits to take control")}</p>
            <p class="bg-empty-sub">${escHtml(t("budget.empty.planner.sub") || "Choose categories and set monthly targets.")}</p>
            <button class="bg-btn-primary bg-empty-cta" id="btnCreateBudgetEmpty" type="button">${escHtml(t("budget.empty.planner.cta") || "Create a budget")}</button>
          </div>`;
      } else {
        list.innerHTML = rowsHtml;
      }
    }

    const totalBudgeted = CATEGORIES.reduce((s, c) => s + (Number(state.plan[c.id]) || 0), 0);
    const totalSpent = computeExpenses();
    const rem = totalBudgeted - totalSpent;
    if (sumEl) {
      sumEl.innerHTML = `
        <span>Total budgeted: <strong>${fmtMoney(totalBudgeted)}</strong></span>
        <span>·</span>
        <span>Total spent: <strong>${fmtMoney(totalSpent)}</strong></span>
        <span>·</span>
        <span>Remaining: <strong class="${rem >= 0 ? "rem-pos" : "rem-neg"}">${fmtMoney(rem)}</strong></span>`;
    }
  }

  /* ── Bills section ────────────────────────────────────────────────── */
  function billStatusGlyph(status) {
    if (status === "paid") {
      return `<span class="bg-bill-status bg-bill-status--paid" aria-label="${escHtml(t("budget.bills.statusPaid", "Paid"))}">✓</span>`;
    }
    if (status === "overdue") {
      return `<span class="bg-bill-status bg-bill-status--late" aria-label="${escHtml(t("budget.bills.statusLate", "Late"))}">⚠</span>`;
    }
    return `<span class="bg-bill-status bg-bill-status--due" aria-label="${escHtml(t("budget.bills.statusDue", "Due"))}">•</span>`;
  }

  function renderBills() {
    const list    = $("billsList");
    const emptyEl = $("billsEmpty");
    if (!list) return;

    const today = todayDay();
    const tabs = $("bgBillsTabs");
    tabs?.querySelectorAll("[data-bill-filter]").forEach(btn => {
      const active = (btn.dataset.billFilter || "all") === state.billFilter;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    let bills = [...state.bills];
    if (state.billFilter === "paid") bills = bills.filter(b => billStatus(b, today) === "paid");
    if (state.billFilter === "unpaid") bills = bills.filter(b => billStatus(b, today) !== "paid");
    if (state.billFilter === "subscriptions") bills = bills.filter(b => b.category === "subscriptions" || b.frequency === "monthly");

    if (state.bills.length === 0) {
      list.innerHTML = "";
      list.style.display = "none";
      if (emptyEl) {
        /* Personalised bills empty state for debt-focused users */
        if (state.wizardMeta?.completed && state.wizardMeta.goal === "debt") {
          emptyEl.innerHTML = `
            <div class="bg-empty-icon bg-empty-icon--warning" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
              </svg>
            </div>
            <p class="bg-empty-title">${escHtml(t("budget.bills.emptyDebtTitle", "Add bills to track minimum payments"))}</p>
            <p class="bg-empty-sub">${escHtml(t("budget.bills.emptyDebtSub", "Never miss a due date - critical for your debt payoff plan."))}</p>
            <button class="bg-btn-primary bg-empty-cta" id="btnAddBillEmptyDebt" type="button">+ ${escHtml(t("budget.bills.add", "Add bill"))}</button>`;
        }
        emptyEl.style.display = "";
      }
      return;
    }

    list.style.display = "";
    if (emptyEl) emptyEl.style.display = bills.length ? "none" : "";

    /* Sort: unpaid overdue → unpaid upcoming → unpaid rest → paid */
    const sorted = [...bills].sort((a, b) => {
      const aStatus = billStatus(a, today);
      const bStatus = billStatus(b, today);
      const order = { overdue: 0, "due-soon": 1, upcoming: 2, unpaid: 2, paid: 3 };
      const ao = order[aStatus] ?? 2;
      const bo = order[bStatus] ?? 2;
      if (ao !== bo) return ao - bo;
      return (a.dueDay || 1) - (b.dueDay || 1);
    });

    list.innerHTML = sorted.map(bill => {
      const cat    = getCat(bill.category);
      const status = billStatus(bill, today);
      const isPaid = status === "paid";
      const dueTxt = billDueText(bill, status);
      return `
        <div class="bg-bill-card ${escHtml(status)} ${isPaid ? "paid" : ""}" data-bill-id="${bill.id}" role="listitem">
          ${billStatusGlyph(status)}
          <div class="bg-bill-icon" style="background:${softColor(cat.color)};color:${cat.color}">${catIconSvg(cat.id, 18)}</div>
          <div class="bg-bill-info">
            <div class="bg-bill-name">${escHtml(bill.name)}</div>
            <div class="bg-bill-meta">
              <span class="bg-bill-due ${status === "overdue" ? "overdue" : status === "due-soon" ? "upcoming" : status === "upcoming" ? "upcoming" : ""}">${escHtml(dueTxt)}</span>
              <span class="bg-bill-cat-tag">${escHtml(cat.label)}</span>
            </div>
          </div>
          <div class="bg-bill-right">
            <div class="bg-bill-amount">${fmtMoney(bill.amount)}</div>
            <button class="bg-bill-paid-btn ${isPaid ? "paid" : "unpaid"}"
                    data-pay="${bill.id}" type="button">
              ${isPaid ? t("budget.bills.paid", "Paid") : t("budget.bills.markPaid", "Mark paid")}
            </button>
          </div>
          <button class="bg-bill-edit-btn" data-edit-bill="${bill.id}" type="button" aria-label="${escHtml(t("budget.a11y.editRow", "Edit"))}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>`;
    }).join("");
  }

  function billStatus(bill, today) {
    if (bill.paidMonth === state.month) return "paid";
    const day = bill.dueDay || 1;
    if (day < today)    return "overdue";
    if (day <= today + 3) return "upcoming";
    return "unpaid";
  }

  function billDueText(bill, status) {
    const day  = bill.dueDay || 1;
    const text = t("budget.bills.dueOn", "Due {day}", { day: String(day) });
    if (status === "overdue")  return `${text} · ${t("budget.bills.overdue")}`;
    if (status === "upcoming") return `${text} · ${t("budget.bills.upcoming")}`;
    return text;
  }

  /* ── Accounts section ─────────────────────────────────────────────── */
  function renderAccounts() {
    const list = $("accountsList");
    if (!list) return;
    list.innerHTML = "";

    if (!state.dataHydrated) {
      list.innerHTML = `<div class="bg-account-card skeleton" style="min-height:100px" aria-hidden="true"></div>
        <div class="bg-account-card skeleton" style="min-height:100px" aria-hidden="true"></div>`;
      return;
    }

    if (state.accounts.length === 0) {
      const hint = document.createElement("div");
      hint.className = "bg-accounts-hint";
      hint.innerHTML = `
        <p class="bg-accounts-hint-text">${escHtml(t("budget.accounts.emptyHint", "No accounts yet. Add your first account to start tracking your budget."))}</p>
        <button class="bg-btn-primary" id="btnAddAccountHint" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          ${escHtml(t("budget.accounts.add", "Add account"))}
        </button>`;
      list.appendChild(hint);
      return;
    }

    state.accounts.forEach(acct => {
      const t2   = getAcctType(acct.type);
      const slug = acct.type === "credit_card" ? "credit" : acct.type;
      const accentByType = {
      salary: "var(--bgt-income)",
      cash: "var(--bgt-accent)",
      credit: "var(--bgt-saved)",
      debt: "var(--bgt-spent)",
      };
      const accent = accentByType[slug] || "var(--bgt-accent)";
      const card = document.createElement("div");
      card.className = "bg-account-card";
      card.dataset.type = acct.type || "cash";
      card.style.setProperty("--acct-accent", accent);
      card.setAttribute("role", "listitem");

      /* Credit utilization bar */
      let utilBar = "";
      if (acct.type === "credit_card" && acct.limit) {
        const used    = Math.abs(acct.balance || 0);
        const pct     = Math.min((used / acct.limit) * 100, 100);
      const barColor = pct >= 80 ? "var(--bgt-spent)" : pct >= 50 ? "var(--bgt-orange)" : "var(--bgt-purple)";
        utilBar = `
          <div class="bg-acct-utilization-wrap">
            <div class="bg-acct-util-bar">
              <div class="bg-acct-util-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div>
            </div>
            <div class="bg-acct-util-label">${pct.toFixed(0)}% used · ${fmtMoney(acct.limit)} limit</div>
          </div>`;
      }

      card.innerHTML = `
        <div class="bg-acct-head">
          <div class="bg-acct-name">${escHtml(acct.name)}</div>
          <span class="bg-acct-type-pill">${escHtml(t2.label)}</span>
        </div>
        <div class="bg-acct-balance">${fmtMoney(acct.balance || 0)}</div>
        ${utilBar}
        ${acct.note ? `<div class="bg-acct-note">${escHtml(acct.note)}</div>` : `<div class="bg-acct-note">${escHtml(t("budget.accounts.noRecent", "No recent change"))}</div>`}
        <button class="bg-acct-edit" data-id="${acct.id}" type="button"
                aria-label="${escHtml(t("budget.a11y.editRow", "Edit"))}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>`;
      list.appendChild(card);
    });

    /* Add card always last */
    const addCard = document.createElement("div");
    addCard.className  = "bg-account-add";
    addCard.id         = "btnAddAccountCard";
    addCard.setAttribute("role", "button");
    addCard.setAttribute("tabindex", "0");
    addCard.setAttribute("aria-label", t("budget.accounts.add", "Add account"));
    addCard.innerHTML  = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>${escHtml(t("budget.accounts.add", "Add account"))}</span>`;
    list.appendChild(addCard);
  }

  /* ── SVG Donut pie chart ──────────────────────────────────────────── */
  function animateDonutSweep(svg) {
    if (!svg) return;
    svg.querySelectorAll(".bg-pie-slice").forEach((circle, idx) => {
      const arc = Number(circle.dataset.arc || 0);
      const circ = Number(circle.dataset.circ || 0);
      const targetOffset = Number(circle.dataset.targetOffset || circle.getAttribute("stroke-dashoffset") || 0);
      if (!Number.isFinite(arc) || !Number.isFinite(circ) || circ <= 0) return;
      if (prefersReducedMotion()) {
        circle.style.transition = "none";
        circle.style.strokeDasharray = `${arc.toFixed(3)} ${circ.toFixed(3)}`;
        circle.style.strokeDashoffset = `${targetOffset.toFixed(3)}`;
        return;
      }
      circle.style.transition = "none";
      circle.style.strokeDasharray = `0 ${circ.toFixed(3)}`;
      circle.style.strokeDashoffset = `${circ.toFixed(3)}`;
      requestAnimationFrame(() => {
        circle.style.transition = "stroke-dasharray 600ms cubic-bezier(0.4,0,0.2,1), stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)";
        circle.style.transitionDelay = `${idx * 100}ms`;
        circle.style.strokeDasharray = `${arc.toFixed(3)} ${circ.toFixed(3)}`;
        circle.style.strokeDashoffset = `${targetOffset.toFixed(3)}`;
      });
    });
  }

  function renderPieChart() {
    const catMap = computeByCategory();
    const total  = Object.values(catMap).reduce((s, v) => s + v, 0);
    const chartSection = $("chartSection");
    const chartEmpty   = $("chartEmpty");

    if (total === 0) {
      if (chartSection) chartSection.style.display = "none";
      if (chartEmpty)   chartEmpty.style.display   = "";
      return;
    }
    if (chartSection) chartSection.style.display = "";
    if (chartEmpty)   chartEmpty.style.display   = "none";

    const known = new Set(CATEGORIES.map(c => c.id));
    let extraAmt = 0;
    Object.keys(catMap).forEach(k => { if (!known.has(k)) extraAmt += catMap[k]; });

    const slices = CATEGORIES
      .filter(c => (catMap[c.id] || 0) > 0)
      .map(c => ({ ...c, amount: catMap[c.id] }))
      .sort((a, b) => b.amount - a.amount);

    if (extraAmt > 0) {
      const o = slices.find(s => s.id === "other");
      if (o) o.amount += extraAmt;
      else slices.push({ ...getCat("other"), amount: extraAmt });
    }
    slices.forEach(s => { s.frac = s.amount / total; });

    const CX = 90, CY = 90, R = 65, SW = 32;
    const CIRC = 2 * Math.PI * R;
    const track = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="${SW}"/>`;

    let accumulated = 0;
    const sliceEls = slices.map(s => {
      const len    = s.frac * CIRC;
      const offset = -(accumulated * CIRC);
      accumulated += s.frac;
      const dim = state.focusedCat && state.focusedCat !== s.id ? "0.18" : "1";
      return `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
        stroke="${s.color}" stroke-width="${SW}"
        stroke-dasharray="${len.toFixed(3)} ${CIRC.toFixed(3)}"
        stroke-dashoffset="${offset.toFixed(3)}"
        transform="rotate(-90 ${CX} ${CY})"
        opacity="${dim}" data-cat="${s.id}" data-arc="${len.toFixed(3)}" data-circ="${CIRC.toFixed(3)}" data-target-offset="${offset.toFixed(3)}" class="bg-pie-slice"
        style="cursor:pointer;transition:opacity .2s;"/>`;
    }).join("");

    const focused = state.focusedCat ? slices.find(s => s.id === state.focusedCat) : null;
    const cAmt    = fmtMoney(focused ? focused.amount : total);
    const cLabel  = escHtml(focused ? focused.label : "total");
    const cPct    = focused ? `${Math.round(focused.frac * 100)}%` : "";
    const hole    = `<circle cx="${CX}" cy="${CY}" r="${R - SW / 2 - 2}" fill="var(--bgt-surface-2)"/>`;
    const cy1 = focused ? CY - 11 : CY - 5;
    const cy2 = focused ? CY + 5  : CY + 10;
    const cy3 = CY + 19;
    const textEls = `
      <text x="${CX}" y="${cy1}" text-anchor="middle" font-size="12" font-weight="800"
        fill="var(--bgt-text-1)" font-family="system-ui,-apple-system,sans-serif">${cAmt}</text>
      <text x="${CX}" y="${cy2}" text-anchor="middle" font-size="9" font-weight="600"
        fill="var(--bgt-text-3)" font-family="system-ui,-apple-system,sans-serif">${cLabel}</text>
      ${focused ? `<text x="${CX}" y="${cy3}" text-anchor="middle" font-size="8" font-weight="700"
        fill="var(--bgt-text-3)" font-family="system-ui,-apple-system,sans-serif">${cPct}</text>` : ""}`;

    const pieSVG = $("pieSVG");
    if (pieSVG) {
      pieSVG.innerHTML = `<g>${track}${sliceEls}</g>${hole}${textEls}`;
      animateDonutSweep(pieSVG);
    }

    const pieLegend = $("pieLegend");
    if (pieLegend) {
      pieLegend.innerHTML = slices.map(s => `
        <div class="bg-leg-row${state.focusedCat === s.id ? " focused" : ""}" data-cat="${s.id}" role="listitem">
          <span class="bg-leg-dot" style="background:${s.color}"></span>
          <div class="bg-leg-info">
            <span class="bg-leg-name"><span class="bg-leg-cat-ico">${catIconSvg(s.id, 14)}</span>${escHtml(s.label)}</span>
            <span class="bg-leg-pct">${Math.round(s.frac * 100)}%</span>
          </div>
          <div class="bg-leg-amt">${fmtMoney(s.amount)}</div>
        </div>`).join("");
    }
  }

  /* ── Transactions (grouped by date + search) ──────────────────────── */
  function renderEntries() {
    const list    = $("entriesList");
    const emptyEl = $("entriesEmpty");
    const badge   = $("entriesBadge");
    const filterRow = $("txFilterRow");
    if (!list) return;

    if (state.expenseDeleteConfirmId && !state.entries.some(e => e.id === state.expenseDeleteConfirmId)) {
      state.expenseDeleteConfirmId = null;
    }

    if (!state.dataHydrated) {
      list.style.display = "";
      if (emptyEl) emptyEl.style.display = "none";
      if (badge) badge.textContent = "";
      list.innerHTML = Array.from({ length: 5 }, () =>
        '<div class="skeleton" style="min-height:52px;margin-bottom:10px;border-radius:12px" aria-hidden="true"></div>'
      ).join("");
      return;
    }

    /* Filter by search query */
    const q = state.searchQuery.trim().toLowerCase();
    const filtered = state.entries.filter(e => {
      const type = e.type || "expense";
      if (state.entryTypeFilter !== "all" && type !== state.entryTypeFilter) return false;
      if (!q) return true;
      const cat = type === "income" ? { label: "Income" } : getCat(e.category);
      return (
        (e.description || "").toLowerCase().includes(q) ||
        cat.label.toLowerCase().includes(q)
      );
    });

    if (filterRow) {
      filterRow.querySelectorAll("[data-entry-filter]").forEach((btn) => {
        const active = btn.dataset.entryFilter === state.entryTypeFilter;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    if (state.expenseDeleteConfirmId && !filtered.some(e => e.id === state.expenseDeleteConfirmId)) {
      state.expenseDeleteConfirmId = null;
    }

    const sorted = [...filtered].sort((a, b) =>
      (b.dateKey || b.date || "").localeCompare(a.dateKey || a.date || "")
    );

    if (sorted.length === 0) {
      list.style.display = "none";
      if (badge) badge.textContent = "";
      if (emptyEl) {
        /* Personalised empty state for first-time wizard users */
        if (state.wizardMeta?.completed) {
          const isTrack = (state.wizardMeta.mode || "track") === "track";
          const isAdv   = state.wizardMeta.level === "advanced";
          emptyEl.innerHTML = `
            <div class="bg-empty-icon bg-empty-icon--accent" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="7" y1="15" x2="10" y2="15"/>
              </svg>
            </div>
            <p class="bg-empty-title">${escHtml(t("budget.empty.tx.title") || (isTrack ? "Add your first transaction to start tracking" : "No transactions yet"))}</p>
            <p class="bg-empty-sub">${escHtml(t("budget.empty.tx.sub") || (isAdv ? "Search or filter once you've added transactions." : "Track cash, transfers, or anything missing from your bank."))}</p>
            <button class="bg-btn-primary bg-empty-cta" id="btnAddExpenseEmptyPersonalized" type="button">+ ${escHtml(t("budget.transactions.addFirst") || "Log an expense")}</button>`;
        }
        emptyEl.style.display = "";
      }
      return;
    }

    list.style.display = "";
    if (badge)   badge.textContent    = String(filtered.length);
    if (emptyEl) emptyEl.style.display = "none";

    /* Group by date */
    const groups = {};
    sorted.forEach(e => {
      const dk = e.dateKey || e.date || "";
      if (!groups[dk]) groups[dk] = [];
      groups[dk].push(e);
    });

    let html = "";
    Object.entries(groups).forEach(([dk, items]) => {
      let dateLabel = dk;
      try {
        dateLabel = new Date(dk + "T00:00:00").toLocaleDateString(undefined, {
          weekday: "short", month: "short", day: "numeric",
        });
      } catch {}
      html += `<div class="bg-date-group-header">${escHtml(dateLabel)}</div>`;
      html += items.map(e => renderEntryCard(e)).join("");
    });

    list.innerHTML = html;
    bindEntrySwipe();
  }

  /* ── Touch swipe-to-delete ────────────────────────────────────────── */
  function bindEntrySwipe() {
    const list = $("entriesList");
    if (!list) return;
    if (entrySwipeList === list) return;
    entrySwipeList = list;
    list.addEventListener("touchstart", onEntrySwipeStart, { passive: true });
    list.addEventListener("touchmove", onEntrySwipeMove, { passive: false });
    list.addEventListener("touchend", onEntrySwipeEnd);
    list.addEventListener("touchcancel", onEntrySwipeEnd);
  }

  function getSwipeCard(target) {
    const card = target?.closest?.(".bg-entry-card");
    return card && $("entriesList")?.contains(card) ? card : null;
  }

  function onEntrySwipeStart(e) {
    const card = getSwipeCard(e.target);
    if (!card || !e.touches?.length) return;
    entrySwipeState.set(card, {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      moved: false,
    });
    card.style.transition = "none";
  }

  function onEntrySwipeMove(e) {
    const card = getSwipeCard(e.target);
    const swipe = card ? entrySwipeState.get(card) : null;
    if (!card || !swipe || !e.touches?.length) return;
    const dx = e.touches[0].clientX - swipe.startX;
    const dy = e.touches[0].clientY - swipe.startY;
    if (!swipe.moved && Math.abs(dy) > Math.abs(dx)) return;
    swipe.moved = true;
    if (dx > 0) {
      card.style.transform = "";
      return;
    }
    card.style.transform = `translateX(${Math.max(-80, dx)}px)`;
    if (e.cancelable) e.preventDefault();
  }

  function onEntrySwipeEnd(e) {
    const card = getSwipeCard(e.target);
    if (!card) return;
    card.style.transition = "";
    const match = card.style.transform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
    const cur = match ? parseFloat(match[1]) : 0;
    if (cur <= -55) {
      card.classList.add("swiped");
      card.style.transform = "translateX(-80px)";
    } else {
      card.classList.remove("swiped");
      card.style.transform = "";
    }
    entrySwipeState.delete(card);
  }

  /* ════════════════════════════════════════════════════════════
     ACCOUNT SHEET
     ════════════════════════════════════════════════════════════ */
  function flowStepLabel(current, total) {
    return t("budget.flow.stepOf", "Step {current} of {total}", { current, total });
  }

  function syncAcctFlowUI() {
    const editing = !!(state.sheet?.type === "account" && state.sheet.data?.id);
    const addMode = state.sheet?.type === "account" && !state.sheet.data?.id;
    const bType = $("acctBlockType");
    const bDet = $("acctBlockDetails");
    const foot = $("acctFlowFooter");
    const prog = $("acctFlowProgress");
    const save = $("acctSave");
    const next = $("acctFlowNext");
    const back = $("acctFlowBack");
    if (!bType || !bDet) return;

    const renderDots = (current) => {
      if (!prog) return;
      if (current == null) { prog.innerHTML = ""; return; }
      prog.innerHTML = Array.from({ length: 2 }, (_, i) =>
        `<span class="bg-flow-step-dot${i < current ? " active" : ""}"></span>`
      ).join("");
    };

    if (editing) {
      bType.style.display = "";
      bDet.style.display = "";
      if (foot) foot.style.display = "none";
      renderDots(null);
      if (save) {
        save.style.visibility = "visible";
        save.style.pointerEvents = "";
      }
      if (next) next.style.display = "";
      if (back) back.textContent = t("budget.flow.back");
      return;
    }

    if (addMode && acctFlowStep === 1) {
      bType.style.display = "";
      bDet.style.display = "none";
      if (foot) foot.style.display = "flex";
      renderDots(1);
      if (save) {
        save.style.visibility = "hidden";
        save.style.pointerEvents = "none";
      }
      if (next) next.style.display = "";
      if (back) back.textContent = t("budget.flow.cancel");
    } else if (addMode && acctFlowStep === 2) {
      bType.style.display = "none";
      bDet.style.display = "";
      if (foot) foot.style.display = "flex";
      renderDots(2);
      if (save) {
        save.style.visibility = "visible";
        save.style.pointerEvents = "";
      }
      if (next) next.style.display = "none";
      if (back) back.textContent = t("budget.flow.back");
    }
  }

  function syncBillFlowUI() {
    const editing = !!(state.sheet?.type === "bill" && state.sheet.data?.id);
    const addMode = state.sheet?.type === "bill" && !state.sheet.data?.id;
    const b1 = $("billBlockAmountCat");
    const b2 = $("billBlockDetails");
    const foot = $("billFlowFooter");
    const prog = $("billFlowProgress");
    const save = $("billSave");
    const next = $("billFlowNext");
    const back = $("billFlowBack");
    if (!b1 || !b2) return;

    if (editing) {
      b1.style.display = "";
      b2.style.display = "";
      if (foot) foot.style.display = "none";
      if (prog) prog.textContent = "";
      if (save) {
        save.style.visibility = "visible";
        save.style.pointerEvents = "";
      }
      if (next) next.style.display = "";
      if (back) back.textContent = t("budget.flow.back");
      return;
    }

    if (addMode && billFlowStep === 1) {
      b1.style.display = "";
      b2.style.display = "none";
      if (foot) foot.style.display = "flex";
      if (prog) prog.textContent = flowStepLabel(1, 2);
      if (save) {
        save.style.visibility = "hidden";
        save.style.pointerEvents = "none";
      }
      if (next) next.style.display = "";
      if (back) back.textContent = t("budget.flow.cancel");
    } else if (addMode && billFlowStep === 2) {
      b1.style.display = "none";
      b2.style.display = "";
      if (foot) foot.style.display = "flex";
      if (prog) prog.textContent = flowStepLabel(2, 2);
      if (save) {
        save.style.visibility = "visible";
        save.style.pointerEvents = "";
      }
      if (next) next.style.display = "none";
      if (back) back.textContent = t("budget.flow.back");
    }
  }

  function openAccountSheet(account) {
    state.sheet  = { type: "account", data: account || null };
    acctEditType = account?.type || "salary";
    acctFlowStep = account ? 0 : 1;
    setText("acctTitle", account ? t("budget.sheet.editAccount") : t("budget.sheet.addAccount"));
    setVal("acctName",    account?.name    ?? "");
    setVal("acctBalance", account?.balance ?? "");
    setVal("acctLimit",   account?.limit   ?? "");
    setVal("acctApr",     account?.apr     ?? "");
    setVal("acctNote",    account?.note    ?? "");
    renderAccountTypeRow(acctEditType);
    updateAccountFields(acctEditType);
    const del = $("acctDelete");
    if (del) del.style.display = account ? "" : "none";
    syncAcctFlowUI();
    openOverlay("acctOverlay");
  }

  function renderAccountTypeRow(sel) {
    const row = $("acctTypeRow");
    if (!row) return;
    row.innerHTML = ACCOUNT_TYPES.map(t2 => `
      <button class="bg-type-btn${t2.id === sel ? " active" : ""}"
              data-acct-type="${t2.id}" type="button">
        <span class="bg-type-icon">${acctTypeIconSvg(t2.id, 20)}</span>
        <span>${escHtml(t2.label)}</span>
      </button>`).join("");
  }

  function updateAccountFields(type) {
    const isCredit = type === "credit_card";
    const isDebt   = type === "debt";
    const limitRow = $("acctLimitRow");
    const aprRow   = $("acctAprRow");
    const balLbl   = $("acctBalanceLbl");
    if (limitRow) limitRow.style.display = isCredit ? "" : "none";
    if (aprRow)   aprRow.style.display   = isCredit || isDebt ? "" : "none";
    if (balLbl)   balLbl.textContent     =
      isDebt ? t("budget.sheet.balanceOwed", "Amount owed") : isCredit ? t("budget.sheet.balanceCurrent", "Current balance") : t("budget.sheet.balance", "Current balance");
  }

  async function submitAccount() {
    const name = ($("acctName")?.value || "").trim();
    if (!name) { flashError("acctName"); return; }
    const balance = parseFloat($("acctBalance")?.value) || 0;
    const limit   = $("acctLimit")?.value.trim() ? parseFloat($("acctLimit").value) : null;
    const apr     = $("acctApr")?.value.trim()   ? parseFloat($("acctApr").value)   : null;
    const note    = ($("acctNote")?.value || "").trim();
    setBusy("acctSave", true);
    try {
      await saveAccount({ id: state.sheet.data?.id, type: acctEditType, name, balance, limit, apr, note });
      closeOverlay("acctOverlay");
      await loadAccounts();
      renderAll();
      updateBudgetMonthAggregate(state.month).catch((err) => fbErrRetry(err, () => updateBudgetMonthAggregate(state.month)));
    } catch (err) {
      const msg = fbErrMsg(err);
      showSheetError("acctSave", msg.length > 52 ? msg.slice(0, 49) + "\u2026" : msg);
      fbErrRetry(err, () => submitAccount());
    } finally {
      clearBodyScrollUnlessOverlayOpen();
      setBusy("acctSave", false, t("budget.sheet.save"));
    }
  }

  async function submitDeleteAccount(id) {
    setBusy("acctDelete", true);
    try {
      await deleteAccount(id);
      closeOverlay("acctOverlay");
      await loadAccounts();
      renderAll();
      updateBudgetMonthAggregate(state.month).catch((err) => fbErrRetry(err, () => updateBudgetMonthAggregate(state.month)));
    } catch (err) {
      const msg = fbErrMsg(err);
      showSheetError("acctDelete", msg.length > 52 ? msg.slice(0, 49) + "\u2026" : msg);
      fbErrRetry(err, () => submitDeleteAccount(id));
    } finally {
      clearBodyScrollUnlessOverlayOpen();
      setBusy("acctDelete", false, t("budget.sheet.deleteAccount"));
    }
  }

  /* ════════════════════════════════════════════════════════════
     TRANSACTION SHEET
     ════════════════════════════════════════════════════════════ */
  function openTransactionSheet(type, entry) {
    const txType = type === "income" ? "income" : "expense";
    state.sheet = { type: txType, data: entry || null };
    expEditCat  = txType === "income" ? "income" : (entry?.category || "other");
    setText("expTitle", entry
      ? (txType === "income" ? t("budget.sheet.editIncome", "Edit income") : t("budget.sheet.editExpense", "Edit expense"))
      : (txType === "income" ? t("budget.sheet.addIncome", "Log income") : t("budget.sheet.addExpense", "Log expense")));
    setText("expIntro", txType === "income"
      ? t("budget.sheet.incomeIntro", "Record money that came in. This powers your remaining budget.")
      : t("budget.sheet.expenseIntro", "Enter what left your wallet. Category keeps your monthly breakdown honest."));
    setVal("expAmount", entry ? String(entry.amount) : "");
    setVal("expDesc",   entry?.description ?? "");
    setVal("expNote",   entry?.note        ?? "");
    setVal("expDate",   entry?.dateKey || entry?.date || todayKey());
    renderCatGrid(expEditCat, "catGrid", val => { expEditCat = val; });
    const grid = $("catGrid");
    if (grid) grid.style.display = txType === "income" ? "none" : "";
    const desc = $("expDesc");
    if (desc) desc.placeholder = txType === "income"
      ? t("budget.tx.incomePlaceholder", "What money came in?")
      : t("budget.tx.expensePlaceholder", "Groceries, rent, coffee...");
    const del = $("expDelete");
    if (del) {
      del.style.display = entry ? "" : "none";
      del.textContent = txType === "income" ? t("budget.sheet.deleteIncome", "Delete income") : t("budget.sheet.deleteExpense", "Delete expense");
    }
    const sym = $("expCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    closeFab();
    openOverlay("expOverlay");
    setTimeout(() => $("expAmount")?.focus?.(), 380);
  }

  function openExpenseSheet(expense) {
    openTransactionSheet("expense", expense);
  }

  function openIncomeSheet(income) {
    openTransactionSheet("income", income);
  }

  async function submitExpense() {
    const txType = state.sheet.type === "income" ? "income" : "expense";
    const rawAmount = parseFloat($("expAmount")?.value);
    if (!rawAmount || rawAmount <= 0) { flashError("expAmount"); return; }
    const amount  = Math.abs(rawAmount);
    const desc    = ($("expDesc")?.value  || "").trim();
    const note    = ($("expNote")?.value  || "").trim();
    const dateKey = $("expDate")?.value   || todayKey();
    const month   = dateKey.slice(0, 7);
    const cat     = txType === "income" ? "income" : expEditCat;
    const editId  = state.sheet.data?.id || null;

    closeOverlay("expOverlay");

    const TEMP_ID    = editId || ("tmp_" + Date.now());
    const localEntry = { id: TEMP_ID, type: txType, amount, category: cat, description: desc, note, dateKey, date: dateKey, month, _pending: true };
    const prev       = [...state.entries];

    if (editId) state.entries = state.entries.map(e => e.id === editId ? localEntry : e);
    else        state.entries = [...state.entries, localEntry];
    renderAll();

    try {
      const realId = await persistEntry({ id: editId, type: txType, amount, category: cat, description: desc, note, dateKey });
      state.allEntriesCache = null;
      await loadEntries();
      await loadKpiComparison();
      renderAll();
      updateBudgetMonthAggregate(month).catch((err) => fbErrRetry(err, () => updateBudgetMonthAggregate(month)));
    } catch (err) {
      state.entries = prev;
      renderAll();
      openTransactionSheet(txType, { id: editId, amount, category: cat, description: desc, note, dateKey, type: txType });
      const msg = fbErrMsg(err);
      showSheetError("expSave", msg.length > 52 ? msg.slice(0, 49) + "\u2026" : msg);
      fbErrRetry(err, () => submitExpense());
    } finally {
      clearBodyScrollUnlessOverlayOpen();
    }
  }

  async function submitDeleteExpense(id) {
    const removed = state.entries.find(e => e.id === id);
    state.entries = state.entries.filter(e => e.id !== id);
    closeOverlay("expOverlay");
    renderAll();
    try {
      await removeEntry(id);
      state.allEntriesCache = null;
      await loadEntries();
      await loadKpiComparison();
      renderAll();
      updateBudgetMonthAggregate(state.month).catch((err) => fbErrRetry(err, () => updateBudgetMonthAggregate(state.month)));
    } catch (err) {
      if (removed) state.entries = [...state.entries, removed];
      renderAll();
      fbErrRetry(err, () => submitDeleteExpense(id));
    } finally {
      clearBodyScrollUnlessOverlayOpen();
    }
  }

  /* ════════════════════════════════════════════════════════════
     BILL SHEET
     ════════════════════════════════════════════════════════════ */
  function openBillSheet(bill) {
    state.sheet = { type: "bill", data: bill || null };
    billFlowStep = bill ? 0 : 1;
    billEditCat  = bill?.category  || "subscriptions";
    billFrequency = bill?.frequency || "monthly";
    setText("billTitle", bill ? t("budget.sheet.editBill") : t("budget.sheet.addBill"));
    setVal("billAmount", bill ? String(bill.amount) : "");
    setVal("billName",   bill?.name    ?? "");
    setVal("billDueDay", bill?.dueDay  ?? "");
    setVal("billNote",   bill?.note    ?? "");
    renderCatGrid(billEditCat, "billCatGrid", val => { billEditCat = val; });
    syncBillFreqPills();
    const del = $("billDelete");
    if (del) del.style.display = bill ? "" : "none";
    const sym = $("billCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    syncBillFlowUI();
    closeFab();
    openOverlay("billOverlay");
    setTimeout(() => {
      if (bill) $("billAmount")?.focus?.();
      else if (billFlowStep === 1) $("billAmount")?.focus?.();
      else $("billName")?.focus?.();
    }, 380);
  }

  function syncBillFreqPills() {
    const pills = $("billFreqPills");
    if (!pills) return;
    pills.querySelectorAll(".bg-freq-pill").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.freq === billFrequency);
    });
  }

  async function submitBill() {
    const name   = ($("billName")?.value || "").trim();
    const rawAmt = parseFloat($("billAmount")?.value);
    const dueDay = parseInt($("billDueDay")?.value) || 1;
    if (!name) { flashError("billName"); return; }
    if (!rawAmt || rawAmt <= 0) { flashError("billAmount"); return; }
    const amount = Math.abs(rawAmt);
    const note   = ($("billNote")?.value || "").trim();
    const editId = state.sheet.data?.id || null;

    setBusy("billSave", true);
    try {
      await saveBill({ id: editId, name, amount, dueDay, category: billEditCat, frequency: billFrequency, note });
      closeOverlay("billOverlay");
      await loadBills();
      renderAll();
    } catch (err) {
      const msg = fbErrMsg(err);
      showSheetError("billSave", msg.length > 52 ? msg.slice(0, 49) + "\u2026" : msg);
      fbErrRetry(err, () => submitBill());
    } finally {
      clearBodyScrollUnlessOverlayOpen();
      setBusy("billSave", false, t("budget.sheet.save"));
    }
  }

  async function submitDeleteBill(id) {
    setBusy("billDelete", true);
    try {
      await deleteBill(id);
      closeOverlay("billOverlay");
      state.bills = state.bills.filter(b => b.id !== id);
      renderAll();
    } catch (err) {
      const msg = fbErrMsg(err);
      showSheetError("billDelete", msg.length > 52 ? msg.slice(0, 49) + "\u2026" : msg);
      fbErrRetry(err, () => submitDeleteBill(id));
    } finally {
      clearBodyScrollUnlessOverlayOpen();
      setBusy("billDelete", false, t("budget.sheet.deleteBill"));
    }
  }

  /* ════════════════════════════════════════════════════════════
     BUDGET LIMIT SHEET
     ════════════════════════════════════════════════════════════ */
  function openLimitSheet(catId) {
    limitEditCat = catId;
    const cat    = getCat(catId);
    const current = state.plan[catId] || 0;
    setText("limitTitle", t("budget.limit.title"));
    const info = $("limitCatInfo");
    if (info) info.innerHTML = `<span class="bg-limit-cat-ico">${catIconSvg(cat.id, 20)}</span><span>${escHtml(cat.label)}</span>`;
    setVal("limitAmount", current > 0 ? String(current) : "");
    const sym = $("limitCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    const removeBtn = $("limitRemove");
    if (removeBtn) removeBtn.style.display = current > 0 ? "" : "none";
    openOverlay("limitOverlay");
    setTimeout(() => $("limitAmount")?.focus?.(), 300);
  }

  async function submitLimit() {
    const raw = parseFloat($("limitAmount")?.value);
    if (!raw || raw <= 0) { flashError("limitAmount"); return; }
    state.plan[limitEditCat] = raw;
    state.plannerDraft = { ...state.plan };
    closeOverlay("limitOverlay");
    renderBudgetPlanner();
    savePlan().catch((err) => fbErrRetry(err, () => submitLimit()));
    renderSetupChecklist();
    renderSmartAlerts();
  }

  async function removeLimit() {
    delete state.plan[limitEditCat];
    state.plannerDraft = { ...state.plan };
    closeOverlay("limitOverlay");
    renderBudgetPlanner();
    savePlan().catch((err) => fbErrRetry(err, () => removeLimit()));
    renderSetupChecklist();
    renderSmartAlerts();
  }

  /* ── Speed-dial FAB ──────────────────────────────────────────────── */
  function toggleFab() {
    state.fabOpen = !state.fabOpen;
    const fab  = $("fabAdd");
    const menu = $("fabMenu");
    if (fab)  fab.classList.toggle("open", state.fabOpen);
    if (fab)  fab.setAttribute("aria-expanded", String(state.fabOpen));
    if (menu) menu.classList.toggle("open", state.fabOpen);
    if (menu) menu.setAttribute("aria-hidden", String(!state.fabOpen));
  }

  function closeFab() {
    state.fabOpen = false;
    const fab  = $("fabAdd");
    const menu = $("fabMenu");
    if (fab)  { fab.classList.remove("open"); fab.setAttribute("aria-expanded", "false"); }
    if (menu) { menu.classList.remove("open"); menu.setAttribute("aria-hidden", "true"); }
  }

  /* ── Overlay helpers ─────────────────────────────────────────────── */
  const BUDGET_OVERLAY_IDS = ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay", "goalOverlay", "goalDetailOverlay", "helpOverlay", "autofillOverlay"];

  function clearBodyScrollUnlessOverlayOpen() {
    const anyOpen = BUDGET_OVERLAY_IDS.some(oid => $(oid)?.classList.contains("open"));
    if (!anyOpen) document.body.style.overflow = "";
  }

  function getFocusableEls(modal) {
    return [...(modal?.querySelectorAll?.('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])]
      .filter(el => !el.disabled && el.offsetParent !== null);
  }

  function focusFirstInOverlay(modal) {
    const first = getFocusableEls(modal)[0];
    first?.focus?.();
  }

  function trapFocus(modal) {
    if (!modal) return;
    if (!overlayTrapHandlers.has(modal)) {
      const handler = (e) => {
        if (e.key !== "Tab" || modal.getAttribute("aria-hidden") === "true") return;
        const list = getFocusableEls(modal);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      modal.addEventListener("keydown", handler);
      overlayTrapHandlers.set(modal, handler);
    }
    focusFirstInOverlay(modal);
  }

  function openOverlay(id) {
    BUDGET_OVERLAY_IDS.forEach((oid) => {
      if (oid !== id) {
        const o = $(oid);
        if (o && o.classList.contains("open")) {
          closeOverlay(oid);
        }
      }
    });
    const el = $(id);
    if (!el) return;
    el.style.removeProperty("visibility");
    el.setAttribute("aria-hidden", "false");
    el.classList.add("open");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => trapFocus(el));
  }

  function closeOverlay(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
    el.style.removeProperty("visibility");
    clearBodyScrollUnlessOverlayOpen();
  }

  function smokeTestBudgetOverlaysHidden() {
    requestAnimationFrame(() => {
      document.querySelectorAll("#budgetPage .bg-overlay").forEach((overlay) => {
        const shown = getComputedStyle(overlay).display !== "none";
        if (shown && !overlay.classList.contains("open")) {
          console.warn("[Hbit Budget] Overlay visible at rest:", overlay.id || overlay);
          overlay.setAttribute("aria-hidden", "true");
          overlay.classList.remove("open");
        }
      });
    });
  }

  function initFabPortal() {
    const fab = $("fabWrap");
    if (!fab || fab.closest("#bg-fab-portal")) return;
    let portal = document.getElementById("bg-fab-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "bg-fab-portal";
      document.body.appendChild(portal);
    }
    portal.appendChild(fab);
  }

  /* ── Help modal (single page, i18n-driven) ─────────────────────── */
  function openHelp() {
    updateHelpContent();
    openOverlay("helpOverlay");
    requestAnimationFrame(() => $("helpClose")?.focus?.());
  }

  function closeHelp() {
    closeOverlay("helpOverlay");
  }

  function updateHelpContent() {
    const root = $("helpOverlay");
    if (root && HBIT.i18n?.apply) HBIT.i18n.apply(root);
  }

  /* ── Micro helpers ───────────────────────────────────────────────── */
  function setText(id, v) { const el = $(id); if (el) el.textContent = String(v); }
  function setVal(id, v)  { const el = $(id); if (el) el.value = String(v ?? ""); }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function flashError(inputId) {
    const el = $(inputId);
    if (!el) return;
    el.classList.add("error");
    el.focus();
    setTimeout(() => el.classList.remove("error"), 2200);
  }

  function setBusy(id, busy, label) {
    const el = $(id);
    if (!el) return;
    el.disabled = busy;
    el.textContent = busy ? "…" : (label || "");
  }

  function showSheetError(btnId, msg) {
    const el = $(btnId);
    if (!el) return;
    const orig = el.textContent;
    el.textContent = msg;
    el.style.background = "var(--bgt-red)";
    setTimeout(() => { el.textContent = orig; el.style.background = ""; }, 3000);
  }

  /* ── Wizard ──────────────────────────────────────────────────────── */
  function spawnWizardConfetti(card) {
    if (!card) return;
      const colors = ["var(--bgt-accent)", "var(--bgt-income)", "var(--bgt-saved)", "var(--bgt-spent)", "var(--bgt-surface-1)"];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement("span");
      p.className = "bg-confetti-piece";
      const x = (Math.random() * 400 - 200).toFixed(0) + "px";
      const r = (Math.random() * 720).toFixed(0) + "deg";
      p.style.setProperty("--x", x);
      p.style.setProperty("--r", r);
      p.style.setProperty("--c", colors[i % colors.length]);
      p.style.setProperty("--delay", `${Math.floor(Math.random() * 120)}ms`);
      card.appendChild(p);
    }
    setTimeout(() => { card.querySelectorAll(".bg-confetti-piece").forEach(n => n.remove()); }, 900);
  }

  function renderWizardSlideContent(n) {
    const stage = $("bgWizStage");
    if (!stage) return;
    const slide = document.createElement("div");
    slide.className = "bg-wiz-slide entering";
    slide.tabIndex = -1;
    slide.setAttribute("role", "group");

    const WIZ_TOTAL = 7; // slides 0–6

    if (n === 0) {
      // Welcome — no answer required
      slide.innerHTML = `
        <div class="bg-wiz-welcome-icon" aria-hidden="true">
          ${svgIconLucide(`<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`, 48)}
        </div>
        <h2 class="bg-wiz-title">${escHtml(t("budget.wizard.welcome.title") || "Let's personalize your budget")}</h2>
        <p class="bg-wiz-sub">${escHtml(t("budget.wizard.welcome.sub") || "Answer 6 quick questions to build a dashboard that fits how you manage money.")}</p>`;

    } else if (n === 1) {
      // Primary goal
      const GOAL_ICONS = {
        spend_track: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
        save:        `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
        debt:        `<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>`,
        optimize:    `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
        insight:     `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
      };
      const goalDescs = {
        spend_track: "I want clear visibility every week",
        save:        "I end the month with little left",
        debt:        "Cards or loans are hard to control",
        optimize:    "I want to cut unnecessary spending",
        insight:     "I track already, but want smarter guidance",
      };
      const opts = ["spend_track", "save", "debt", "optimize", "insight"];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.goal") || "What's your biggest money priority right now?")}</h2>
        ${opts.map((id, i) => `
          <button type="button" class="bg-wiz-option${wizardAnswers.goal === id ? " selected" : ""}" data-wiz-goal="${id}" style="--i:${i}">
            <svg class="bg-wiz-check-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
            <span class="bg-wiz-option-lead">${svgIconLucide(GOAL_ICONS[id] || GOAL_ICONS.insight, 22)}</span>
            <span><span class="bg-wiz-option-label">${escHtml(t("budget.wizard.goal." + id) || id)}</span><span class="bg-wiz-option-desc">${escHtml(goalDescs[id] || "")}</span></span>
          </button>`).join("")}`;

    } else if (n === 2) {
      // Budgeting approach
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.mode") || "How do you prefer to manage your money?")}</h2>
        <div class="bg-wiz-mode-row">
          <button type="button" class="bg-wiz-mode-card${wizardAnswers.mode === "plan" ? " selected" : ""}" data-mode="plan">
            <span class="bg-wiz-mode-ico">${svgIconLucide(WIZ_MODE_INNER.plan, 26)}</span>
            <span class="bg-wiz-option-label">${escHtml(t("budget.wizard.planAhead", "Plan ahead"))}</span>
            <span class="bg-wiz-option-desc">${escHtml(t("budget.wizard.planAheadDesc", "Set budgets upfront, then track against them."))}</span>
          </button>
          <button type="button" class="bg-wiz-mode-card${wizardAnswers.mode === "track" ? " selected" : ""}" data-mode="track">
            <span class="bg-wiz-mode-ico">${svgIconLucide(WIZ_MODE_INNER.track, 26)}</span>
            <span class="bg-wiz-option-label">${escHtml(t("budget.wizard.trackFirst", "Track first"))}</span>
            <span class="bg-wiz-option-desc">${escHtml(t("budget.wizard.trackFirstDesc", "See what I spend, then decide where to adjust."))}</span>
          </button>
        </div>`;

    } else if (n === 3) {
      // Income frequency
      const payLabels = {
        weekly:    "Weekly",
        biweekly:  "Bi-weekly",
        monthly:   "Monthly",
        irregular: t("budget.wizard.irregular") || "Variable income",
      };
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.pay") || "How often do you get paid?")}</h2>
        <div class="bg-wiz-pay-row">
          ${["weekly", "biweekly", "monthly", "irregular"].map((id, i) => `
            <button type="button" class="bg-wiz-pay-chip${wizardAnswers.payFrequency === id ? " selected" : ""}" data-payf="${id}" style="--i:${i}">${escHtml(payLabels[id])}</button>`).join("")}
        </div>`;

    } else if (n === 4) {
      // Experience level
      const lv = [
        { id: "beginner",     t: "Beginner",     d: "Just getting started with budgeting" },
        { id: "intermediate", t: "Intermediate",  d: "I track sometimes, want better insights" },
        { id: "advanced",     t: "Advanced",      d: "Experienced, managing multiple accounts" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.level") || "What's your comfort level with finances?")}</h2>
        <div class="bg-wiz-level-row">
          ${lv.map((o, i) => `
            <button type="button" class="bg-wiz-level-card${wizardAnswers.level === o.id ? " selected" : ""}" data-level="${o.id}" style="--i:${i}">
              <span class="bg-wiz-level-ico">${svgIconLucide(WIZ_LEVEL_INNER[o.id] || WIZ_LEVEL_INNER.beginner, 22)}</span>
              <span class="bg-wiz-option-label">${escHtml(o.t)}</span>
              <span class="bg-wiz-option-desc">${escHtml(o.d)}</span>
            </button>`).join("")}
        </div>`;

    } else if (n === 5) {
      // Challenges — multi-select optional
      const challenges = [
        { id: "overspend",           t: t("budget.wizard.challenge.overspend")           || "I overspend in certain categories" },
        { id: "invisible_spending",  t: t("budget.wizard.challenge.invisible")            || "Spending happens without my awareness" },
        { id: "irregular_bills",     t: t("budget.wizard.challenge.irregular_bills")      || "Surprise bills stress me" },
        { id: "savings_discipline",  t: t("budget.wizard.challenge.savings_discipline")   || "Can't stick to savings goals" },
        { id: "multiple_accounts",   t: t("budget.wizard.challenge.multiple_accounts")    || "Money scattered across accounts" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.challenges") || "Any challenges you face? (optional, pick up to 3)")}</h2>
        <div class="bg-wiz-goals-grid">
          ${challenges.map((o, i) => `
            <button type="button" class="bg-wiz-goal-chip${wizardAnswers.challenges.includes(o.id) ? " selected" : ""}" data-challenge="${o.id}" style="--i:${i}">${svgIconLucide(WIZ_GOAL_INNER, 16)}<span>${escHtml(o.t)}</span></button>`).join("")}
        </div>`;

    } else {
      // Commitment (slide 6)
      const cm = [
        { id: "all_in",   t: t("budget.wizard.commitment.all_in") || "Send me insights, tips, and alerts",    ico: WIZ_COMMIT_INNER.allin  },
        { id: "moderate", t: t("budget.wizard.commitment.mod")     || "Weekly summaries and key alerts",       ico: WIZ_COMMIT_INNER.mod    },
        { id: "light",    t: t("budget.wizard.commitment.light")   || "Alerts only if something's wrong",      ico: WIZ_COMMIT_INNER.casual },
        { id: "minimal",  t: t("budget.wizard.commitment.min")     || "No notifications, I'll check the app",  ico: WIZ_COMMIT_INNER.casual },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.commitment") || "How much guidance would you like?")}</h2>
        ${cm.map((o, i) => `
          <button type="button" class="bg-wiz-commit-card${wizardAnswers.commitment === o.id ? " selected" : ""}" data-commit="${o.id}" style="--i:${i}">
            <span class="bg-wiz-commit-ico">${svgIconLucide(o.ico, 22)}</span>
            <span class="bg-wiz-commit-text">
              <span class="bg-wiz-option-label">${escHtml(o.t)}</span>
            </span>
          </button>`).join("")}`;
    }

    stage.innerHTML = "";
    stage.appendChild(slide);
    const finishEnter = () => {
      slide.classList.remove("entering");
      slide.style.removeProperty("opacity");
    };
    const onAnimEnd = (ev) => {
      if (ev.target !== slide || ev.animationName !== "bg-wiz-in") return;
      slide.removeEventListener("animationend", onAnimEnd);
      finishEnter();
    };
    slide.addEventListener("animationend", onAnimEnd);
    window.setTimeout(() => {
      slide.removeEventListener("animationend", onAnimEnd);
      if (slide.classList.contains("entering")) finishEnter();
    }, 280);
    slide.focus();

    const pr = $("bgWizProgress");
    if (pr) pr.style.width = `${((n + 1) / WIZ_TOTAL) * 100}%`;
    setText("bgWizCounter", `${n + 1} / ${WIZ_TOTAL}`);
    const back = $("bgWizBack");
    if (back) back.style.visibility = n === 0 ? "hidden" : "visible";
    const next = $("bgWizNext");
    if (next) next.textContent = n === WIZ_TOTAL - 1 ? "Let's go \u2713" : "Next \u2192";
  }

  function transitionWizardSlide(fromN, toN, dir, done) {
    const stage = $("bgWizStage");
    const old = stage?.querySelector(".bg-wiz-slide");
    if (old && fromN !== toN) {
      old.classList.add("leaving");
      setTimeout(() => {
        wizardSlideIndex = toN;
        renderWizardSlideContent(toN);
        if (done) done();
      }, 100);
    } else {
      wizardSlideIndex = toN;
      renderWizardSlideContent(toN);
      if (done) done();
    }
  }

  function openWizard() {
    const ov = $("bg-wizard-overlay");
    if (!ov) return;
    Object.assign(wizardAnswers, {
      goal: null, mode: null, payFrequency: null, level: null, challenges: [], commitment: null,
    });
    ov.style.display = "flex";
    ov.setAttribute("aria-hidden", "false");
    wizardSlideIndex = 0;
    renderWizardSlideContent(0);
    document.body.style.overflow = "hidden";

    wizardTrapHandler = e => {
      const wov = $("bg-wizard-overlay");
      if (!wov || wov.style.display === "none") return;
      if (e.key === "Tab") {
        const focusables = ov.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = [...focusables].filter(el => !el.disabled && el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.key === "ArrowRight") { e.preventDefault(); wizardGoNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); wizardGoBack(); }
      if (e.key === "Enter" && !e.target.closest?.("button")) { e.preventDefault(); wizardGoNext(); }
    };
    document.addEventListener("keydown", wizardTrapHandler);
    setTimeout(() => $("bgWizNext")?.focus(), 200);
  }

  function closeWizardRemove() {
    const ov = $("bg-wizard-overlay");
    if (wizardTrapHandler) {
      document.removeEventListener("keydown", wizardTrapHandler);
      wizardTrapHandler = null;
    }
    if (!ov) return;
    ov.style.display = "none";
    ov.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    ov.remove();
  }

  function fadeOutWizardThen(cb) {
    const card = $("bgWizardCard");
    const ov = $("bg-wizard-overlay");
    if (card) card.classList.add("bg-wizard-fade-out");
    if (ov)   ov.classList.add("bg-wizard-fade-out");   // fade backdrop too — fixes black screen
    setTimeout(() => {
      if (typeof cb === "function") cb();
      if (ov && ov.parentNode) {
        if (wizardTrapHandler) document.removeEventListener("keydown", wizardTrapHandler);
        wizardTrapHandler = null;
        ov.remove();
        document.body.style.overflow = "";
      }
    }, 400);
  }

  async function skipWizard() {
    try {
      await saveWizardDoc({
        completed: true,
        wizardComplete: true,
        cards: DEFAULT_DASHBOARD_CARDS.slice(),
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, true);
      state.wizardMeta = { ...state.wizardMeta, completed: true, wizardComplete: true, cards: DEFAULT_DASHBOARD_CARDS.slice() };
      fadeOutWizardThen(() => {
        renderSetupChecklist();
        showToast(t("budget.toast.skipped", "Skipped — you can always revisit settings later."));
      });
    } catch (err) {
      /* silent */
      showToast(t("budget.toast.saveError", "Could not save: {error}", { error: err?.code || err?.message || "error" }));
    }
  }

  async function finishWizard() {
    const card = $("bgWizardCard");
    try {
      await saveWizardDoc({
        completed:    true,
        wizardComplete: true,
        completedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        cards:        DEFAULT_DASHBOARD_CARDS.slice(),
        goal:         wizardAnswers.goal,
        mode:         wizardAnswers.mode,
        payFrequency: wizardAnswers.payFrequency,
        level:        wizardAnswers.level,
        challenges:   wizardAnswers.challenges,
        commitment:   wizardAnswers.commitment,
      }, true);
    } catch (err) {
      showToast(t("budget.toast.saveError", "Could not save: {error}", { error: err?.code || err?.message || "error" }));
      return;
    }
    spawnWizardConfetti(card);
    state.wizardMeta = {
      completed:    true,
      wizardComplete: true,
      cards:        DEFAULT_DASHBOARD_CARDS.slice(),
      goal:         wizardAnswers.goal,
      mode:         wizardAnswers.mode,
      payFrequency: wizardAnswers.payFrequency,
      level:        wizardAnswers.level,
      challenges:   wizardAnswers.challenges,
      commitment:   wizardAnswers.commitment,
    };
    initPlannerModeFromMeta();
    fadeOutWizardThen(() => {
      renderAll();
      showToast(t("budget.toast.ready", "You're all set! Let's build your budget."));
    });
  }

  function wizardValidate(n) {
    // slide 0 = welcome (no answer), 5 & 6 = optional
    if (n === 1 && !wizardAnswers.goal) return false;
    if (n === 2 && !wizardAnswers.mode) return false;
    if (n === 3 && !wizardAnswers.payFrequency) return false;
    if (n === 4 && !wizardAnswers.level) return false;
    // n === 5 challenges: optional — always valid
    // n === 6 commitment: optional — always valid
    return true;
  }

  function wizardGoNext() {
    if (!wizardValidate(wizardSlideIndex)) {
      const st = $("bgWizStage");
      if (st) {
        st.classList.add("bg-shake");
        window.setTimeout(() => st.classList.remove("bg-shake"), 400);
      }
      showToast(t("budget.wizard.chooseOption"));
      return;
    }
    if (wizardSlideIndex >= 6) {
      finishWizard().catch(() => { /* silent */ });
      return;
    }
    transitionWizardSlide(wizardSlideIndex, wizardSlideIndex + 1, 1);
  }

  function wizardGoBack() {
    if (wizardSlideIndex <= 0) return;
    transitionWizardSlide(wizardSlideIndex, wizardSlideIndex - 1, -1);
  }

  function onWizardStageClick(e) {
    // Step 1 — primary goal
    const wg = e.target.closest("[data-wiz-goal]");
    if (wg) {
      wizardAnswers.goal = wg.dataset.wizGoal;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 2 — mode
    const md = e.target.closest("[data-mode]");
    if (md) {
      wizardAnswers.mode = md.dataset.mode;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 3 — pay frequency
    const pf = e.target.closest("[data-payf]");
    if (pf) {
      wizardAnswers.payFrequency = pf.dataset.payf;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 4 — experience level
    const lv = e.target.closest("[data-level]");
    if (lv) {
      wizardAnswers.level = lv.dataset.level;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 5 — challenges (multi-select, optional, max 3)
    const ch = e.target.closest("[data-challenge]");
    if (ch) {
      const id = ch.dataset.challenge;
      const i = wizardAnswers.challenges.indexOf(id);
      if (i >= 0) {
        wizardAnswers.challenges.splice(i, 1);
      } else if (wizardAnswers.challenges.length < 3) {
        wizardAnswers.challenges.push(id);
      } else {
        const grid = ch.closest(".bg-wiz-goals-grid");
        if (grid) { grid.classList.add("bg-shake"); setTimeout(() => grid.classList.remove("bg-shake"), 400); }
      }
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 6 — commitment
    const cm = e.target.closest("[data-commit]");
    if (cm) {
      wizardAnswers.commitment = cm.dataset.commit;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
  }

  /* ── Trend chart (lazy) ─────────────────────────────────────────── */
  async function loadTrendData() {
    if (state.trendLoading || state.trendLoaded) return;
    state.trendLoading = true;
    const sk = $("bgTrendSkeleton");
    const wrap = $("bgTrendChartWrap");
    if (sk) sk.style.display = "";
    if (wrap) wrap.style.display = "none";

    const months = [];
    let d = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      months.push({ ym, label: dt.toLocaleDateString(undefined, { month: "short" }) });
    }
    const incomeArr = [];
    const spentArr = [];
    for (const m of months) {
      try {
        const entries = await HBIT.db.budgetEntries.forMonth(m.ym);
        incomeArr.push(sumEntryAmounts(entries, "income"));
        spentArr.push(sumEntryAmounts(entries, "expense"));
      } catch {
        incomeArr.push(0);
        spentArr.push(0);
      }
    }
    state.trendData = { months, income: incomeArr, spent: spentArr };
    state.trendLoaded = true;
    state.trendLoading = false;
    if (sk) sk.style.display = "none";
    if (wrap) {
      wrap.style.display = "";
      wrap.innerHTML = buildTrendSvg(months, incomeArr, spentArr);
    }
  }

  function buildTrendSvg(months, incomeArr, spentArr) {
    const W = 320;
    const H = 200;
    const padL = 36;
    const padB = 28;
    const padT = 16;
    const bw = 14;
    const gap = 8;
    const savings = months.map((_, i) => (incomeArr[i] || 0) - (spentArr[i] || 0));
    const maxVal = Math.max(...incomeArr, ...spentArr, ...savings.map(s => Math.max(0, s)), 1);
    const chartW = W - padL - 12;
    const chartH = H - padT - padB;
    const groupW = chartW / 6;

    let bars = "";
    let linePts = "";
    months.forEach((m, i) => {
      const cx = padL + i * groupW + groupW / 2;
      const income = incomeArr[i] || 0;
      const hInc = (income / maxVal) * chartH;
      const hSp = ((spentArr[i] || 0) / maxVal) * chartH;
      const x1 = cx - bw - gap / 2;
      const x2 = cx + gap / 2;
      const delayInc = i * 160;
      const delaySp = i * 160 + 80;
      bars += `<rect class="bg-trend-bar bg-trend-bar--income" x="${x1}" y="${padT + chartH - hInc}" width="${bw}" height="${hInc}" rx="2" style="animation-delay:${delayInc}ms"/>`;
      bars += `<rect class="bg-trend-bar bg-trend-bar--spent" x="${x2}" y="${padT + chartH - hSp}" width="${bw}" height="${hSp}" rx="2" style="animation-delay:${delaySp}ms"/>`;
      const sv = Math.max(0, savings[i]);
      const sy = padT + chartH - (sv / maxVal) * chartH;
      const sx = cx;
      linePts += (i === 0 ? "M" : "L") + `${sx},${sy} `;
    });

    const tooltipId = "bgTrendTip";
    let svg = `<svg class="bg-trend-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="${escHtml(t("budget.aria.trendChart", "Spending trend chart"))}">`;
    svg += bars;
    svg += `<path class="bg-trend-line" d="${linePts.trim()}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    months.forEach((m, i) => {
      const cx = padL + i * groupW + groupW / 2;
      const tip = `${m.label} · Income ${fmtMoney(incomeArr[i] || 0)} · Spent ${fmtMoney(spentArr[i] || 0)} · Saved ${fmtMoney(savings[i])}`;
      svg += `<rect x="${padL + i * groupW}" y="${padT}" width="${groupW}" height="${chartH}" fill="transparent" class="bg-trend-hit" data-tip="${escHtml(tip)}" data-i="${i}"/>`;
      svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--bgt-text-3)" font-family="system-ui,sans-serif">${escHtml(m.label)}</text>`;
    });
    svg += `</svg><div class="bg-trend-tooltip" id="${tooltipId}"></div>`;

    setTimeout(bindTrendTooltip, 0);

    return svg;
  }

  function bindTrendTooltip() {
    const host = $("bgTrendChartWrap");
    const tip = $("bgTrendTip");
    const svg = host?.querySelector?.(".bg-trend-svg");
    if (!host || !tip || !svg || trendTooltipBoundSvg === svg) return;
    trendTooltipBoundSvg = svg;
    svg.addEventListener("pointermove", onTrendPointerMove);
    svg.addEventListener("pointerleave", () => {
      tip.style.display = "none";
      tip.removeAttribute("data-current-idx");
    });
  }

  function onTrendPointerMove(ev) {
    const svg = ev.currentTarget;
    const host = $("bgTrendChartWrap");
    const tip = $("bgTrendTip");
    const hit = ev.target?.closest?.(".bg-trend-hit");
    if (!host || !tip || !hit || !svg.contains(hit)) {
      if (tip) tip.style.display = "none";
      return;
    }
    tip.textContent = hit.dataset.tip || "";
    tip.dataset.currentIdx = hit.dataset.i || "";
    tip.style.display = "block";
    const r = hit.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    tip.style.left = `${r.left - hr.left + r.width / 2 - tip.offsetWidth / 2}px`;
    tip.style.top = `${r.top - hr.top - tip.offsetHeight - 8}px`;
  }

  /* ── CSV export ───────────────────────────────────────────────────── */
  async function fetchEntriesForExport(range) {
    if (range === "month") {
      return state.entries.filter(e =>
        (e.month || (e.dateKey || "").slice(0, 7)) === state.month
      );
    }
    if (range === "all") {
      if (state.allEntriesCache) return state.allEntriesCache;
      const col = HBIT.userSubcollectionRef(state.uid, "budgetEntries");
      const snap = await col.get();
      state.allEntriesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return state.allEntriesCache;
    }
    const n = range === "3" ? 3 : 6;
    const months = [];
    let ym = state.month;
    for (let i = 0; i < n; i++) {
      months.push(ym);
      ym = prevMonth(ym);
    }
    const all = [];
    for (const m of months) {
      const rows = await HBIT.db.budgetEntries.forMonth(m);
      all.push(...rows);
    }
    return all;
  }

  function runCsvExport(range) {
    fetchEntriesForExport(range).then(rows => {
      const lines = ["Date,Category,Amount,Note,Month"];
      rows.forEach(e => {
        const dk = e.dateKey || e.date || "";
        const mo = e.month || dk.slice(0, 7);
        const cat = e.category || "other";
        const amt = (Math.abs(e.amount || 0)).toFixed(2);
        const note = String(e.description || "").replace(/"/g, '""');
        lines.push(`"${dk}","${cat}",${amt},"${note}","${mo}"`);
      });
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hbit-budget-${state.month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(() => {
      HBIT.toast?.show?.(HBIT.i18n?.t?.("budget.export.error", "Export failed"), "error");
    });
  }

  /* ── Savings goals CRUD ─────────────────────────────────────────── */
  function openGoalCreateSheet() {
    state.goalSheetMode = "create";
    state.goalEditId = null;
    setText("goalSheetTitle", t("budget.goal.newGoal", "New goal"));
    setVal("goalName", "");
    setVal("goalTargetAmt", "");
    setVal("goalTargetDate", "");
    setVal("goalMonthly", "");
    state.goalSelectedColor = GOAL_COLORS[0].hex;
    const createBtn = $("goalCreateBtn");
    if (createBtn) createBtn.textContent = t("budget.goal.create", "Create Goal");
    const sym = $("goalCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    renderGoalSwatches();
    openOverlay("goalOverlay");
  }

  function openGoalEditSheet(g) {
    state.goalSheetMode = "edit";
    state.goalEditId = g.id;
    setText("goalSheetTitle", t("budget.goal.edit", "Edit goal"));
    setVal("goalName", g.name || "");
    setVal("goalTargetAmt", g.targetAmount != null ? String(g.targetAmount) : "");
    setVal("goalTargetDate", g.targetDate || "");
    setVal("goalMonthly", g.monthlyTarget != null && g.monthlyTarget !== ""
      ? String(g.monthlyTarget) : "");
    state.goalSelectedColor = g.color || GOAL_COLORS[0].hex;
    const createBtn = $("goalCreateBtn");
    if (createBtn) createBtn.textContent = t("budget.goal.save", "Save goal");
    const sym = $("goalCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    renderGoalSwatches();
    openOverlay("goalOverlay");
  }

  function renderGoalSwatches() {
    const row = $("goalSwatches");
    if (!row) return;
    row.innerHTML = GOAL_COLORS.map((c, i) =>
      `<button type="button" class="bg-goal-swatch${c.hex === state.goalSelectedColor ? " selected" : ""}" style="background:${c.hex}" data-hex="${c.hex}" aria-label="${escHtml(t("budget.goal.colorLabel", "Color {number}", { number: i + 1 }))}"></button>`
    ).join("");
  }

  async function submitGoalSheet() {
    const name = ($("goalName")?.value || "").trim();
    const tgt = parseFloat($("goalTargetAmt")?.value);
    const dt = ($("goalTargetDate")?.value || "").trim();
    const monthlyRaw = ($("goalMonthly")?.value || "").trim();
    const monthly = monthlyRaw ? parseFloat(monthlyRaw) : null;
    if (!name) { flashError("goalName"); return; }
    if (!tgt || tgt <= 0) { flashError("goalTargetAmt"); return; }
    if (!dt) { flashError("goalTargetDate"); return; }

    const ts = firebase.firestore.FieldValue.serverTimestamp();

    try {
      if (state.goalSheetMode === "edit" && state.goalEditId) {
        await savingsGoalsCol().doc(state.goalEditId).update({
          name,
          targetAmount: tgt,
          targetDate: dt,
          color: state.goalSelectedColor,
          monthlyTarget: monthly != null && Number.isFinite(monthly) ? monthly : null,
          updatedAt: ts,
        });
      } else {
        await savingsGoalsCol().add({
          uid: state.uid,
          name,
          targetAmount: tgt,
          savedAmount: 0,
          targetDate: dt,
          color: state.goalSelectedColor,
          monthlyTarget: monthly != null && Number.isFinite(monthly) ? monthly : null,
          createdAt: ts,
          updatedAt: ts,
        });
      }
      closeOverlay("goalOverlay");
      await loadSavingsGoals();
      renderGoalsSection();
      renderSetupChecklist();
    } catch (err) {
      fbErrRetry(err, submitGoalSheet);
    }
  }

  function openGoalDetail(g) {
    state.goalDetailId = g.id;
    setText("goalDetailTitle", g.name || "Goal");
    const tgt = Number(g.targetAmount) || 0;
    const saved = Number(g.savedAmount) || 0;
    const pct = tgt > 0 ? Math.min(100, (saved / tgt) * 100) : 0;
    const arc = $("goalDetailArc");
    if (arc) {
      const r = 40;
      const c = 2 * Math.PI * r * (pct / 100);
      arc.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="${escHtml(g.color || "var(--bgt-accent)")}" stroke-width="8"
          stroke-dasharray="${c.toFixed(1)} ${(2 * Math.PI * r).toFixed(1)}"
          transform="rotate(-90 50 50)" stroke-linecap="round"/></svg>`;
    }
    setText("goalDetailProgress", `${fmtMoney(saved)} of ${fmtMoney(tgt)} (${pct.toFixed(0)}%)`);
    const cf = $("goalContribField");
    if (cf) cf.style.display = "none";
    setVal("goalContribAmt", "");
    const sym = $("goalContribSym");
    if (sym) sym.textContent = currencySymbol();
    openOverlay("goalDetailOverlay");
  }

  async function submitGoalContrib() {
    const amt = parseFloat($("goalContribAmt")?.value);
    if (!amt || amt <= 0) { flashError("goalContribAmt"); return; }
    const g = state.savingsGoals.find(x => x.id === state.goalDetailId);
    if (!g) return;
    const newSaved = (Number(g.savedAmount) || 0) + amt;
    try {
      await savingsGoalsCol().doc(g.id).update({
        savedAmount: newSaved,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      closeOverlay("goalDetailOverlay");
      await loadSavingsGoals();
      renderGoalsSection();
    } catch (err) {
      fbErrRetry(err, () => addGoalContribution());
    }
  }

  async function deleteGoal() {
    const id = state.goalDetailId;
    if (!id) return;
    try {
      await savingsGoalsCol().doc(id).delete();
      closeOverlay("goalDetailOverlay");
      await loadSavingsGoals();
      renderGoalsSection();
      renderSetupChecklist();
    } catch (err) {
      fbErrRetry(err, deleteGoal);
    }
  }

  /* ── Event delegation ────────────────────────────────────────────── */
  function bindEvents() {
    /* Month navigation */
    ($("monthPrev") || {}).onclick = async () => {
      state.month = prevMonth(state.month);
      try { localStorage.setItem(LS_MONTH, state.month); } catch {}
      setText("monthLabel", monthLabel(state.month));
      await Promise.all([loadEntries(), loadPlan(), loadKpiComparison()]);
      renderAll();
    };
    ($("monthNext") || {}).onclick = async () => {
      state.month = nextMonth(state.month);
      try { localStorage.setItem(LS_MONTH, state.month); } catch {}
      setText("monthLabel", monthLabel(state.month));
      await Promise.all([loadEntries(), loadPlan(), loadKpiComparison()]);
      renderAll();
    };

    /* Help */
    ($("bgHelpBtn") || {}).onclick = openHelp;
    ($("helpClose") || {}).onclick = closeHelp;
    ($("helpOverlay") || {}).addEventListener?.("click", e => { if (e.target.id === "helpOverlay") closeHelp(); });

    /* Currency */
    ($("currencySelect") || {}).onchange = e => {
      state.currency = e.target.value || "CAD";
      saveCurrency(state.currency);
      renderAll();
    };

    /* FAB */
    ($("fabAdd")     || {}).onclick = toggleFab;
    ($("fabIncome")  || {}).onclick = () => openIncomeSheet(null);
    ($("fabExpense") || {}).onclick = () => openExpenseSheet(null);
    ($("fabBill")    || {}).onclick = () => openBillSheet(null);

    /* Premium quick actions */
    ($("bgQuickExpense") || {}).onclick = () => openExpenseSheet(null);
    ($("bgQuickIncome")  || {}).onclick = () => openIncomeSheet(null);
    ($("bgQuickBill")    || {}).onclick = () => openBillSheet(null);
    ($("bgQuickAccount") || {}).onclick = () => openAccountSheet(null);
    ($("bgQuickGoal")    || {}).onclick = () => openGoalCreateSheet();
    ($("bgPremiumAccountChip") || {}).onclick = () => {
      const sec = $("bgSecAccounts");
      if (sec) {
        $("bgSecInsights")?.setAttribute("open", "");
        if (sec.tagName === "DETAILS") sec.setAttribute("open", "");
        sec.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    /* Account sheet */
    ($("btnAddAccount") || {}).onclick = () => openAccountSheet(null);
    ($("btnIncomeHintAdd") || {}).onclick = () => openIncomeSheet(null);
    ($("acctSave")      || {}).onclick = submitAccount;
    ($("acctClose")     || {}).onclick = () => closeOverlay("acctOverlay");
    ($("acctDelete")    || {}).onclick = () => { const id = state.sheet.data?.id; if (id) submitDeleteAccount(id); };
    ($("acctFlowBack")  || {}).onclick = () => {
      const editing = state.sheet?.type === "account" && state.sheet.data?.id;
      if (editing) return;
      if (acctFlowStep <= 1) closeOverlay("acctOverlay");
      else {
        acctFlowStep = 1;
        syncAcctFlowUI();
      }
    };
    ($("acctFlowNext")  || {}).onclick = () => {
      if (state.sheet?.type !== "account" || state.sheet.data?.id) return;
      if (acctFlowStep !== 1) return;
      acctFlowStep = 2;
      syncAcctFlowUI();
      updateAccountFields(acctEditType);
      setTimeout(() => $("acctName")?.focus?.(), 80);
    };

    /* Expense sheet */
    ($("expSave")   || {}).onclick = submitExpense;
    ($("expClose")  || {}).onclick = () => closeOverlay("expOverlay");
    ($("expDelete") || {}).onclick = () => { const id = state.sheet.data?.id; if (id) submitDeleteExpense(id); };

    /* Bill sheet */
    ($("btnAddBill")     || {}).onclick = () => openBillSheet(null);
    ($("btnAddBillEmpty")||{}).addEventListener?.("click", () => openBillSheet(null));
    // Debt-focused personalised empty bill CTA is dynamically injected; delegate via main click handler
    ($("billSave")  || {}).onclick = submitBill;
    ($("billClose") || {}).onclick = () => closeOverlay("billOverlay");
    ($("billDelete")||{}).onclick  = () => { const id = state.sheet.data?.id; if (id) submitDeleteBill(id); };
    ($("billFlowBack") || {}).onclick = () => {
      if (state.sheet?.type !== "bill" || state.sheet.data?.id) return;
      if (billFlowStep <= 1) closeOverlay("billOverlay");
      else {
        billFlowStep -= 1;
        syncBillFlowUI();
      }
    };
    ($("billFlowNext") || {}).onclick = () => {
      if (state.sheet?.type !== "bill" || state.sheet.data?.id) return;
      if (billFlowStep === 1) {
        billFlowStep = 2;
        syncBillFlowUI();
        setTimeout(() => $("billAmount")?.focus?.(), 80);
        return;
      }
      const rawAmt = parseFloat($("billAmount")?.value);
      if (!rawAmt || rawAmt <= 0) { flashError("billAmount"); return; }
      billFlowStep = 3;
      syncBillFlowUI();
      setTimeout(() => $("billName")?.focus?.(), 80);
    };

    /* Limit sheet */
    ($("limitSave")   || {}).onclick = submitLimit;
    ($("limitClose")  || {}).onclick = () => closeOverlay("limitOverlay");
    ($("limitRemove") || {}).onclick = removeLimit;

    /* Autofill 50/30/20 */
    ($("bgAutofillBtn") || $("bgAutofill5030") || {}).onclick = () => open5030Sheet();
    ($("bgAutofillApply")  || {}).onclick = () => apply5030Plan().catch(() => showToast("Error applying plan"));
    ($("bgAutofillCancel") || {}).onclick = () => closeOverlay("autofillOverlay");
    ($("autofillClose")    || {}).onclick = () => closeOverlay("autofillOverlay");
    ($("bgHealthScoreSection") || {}).onclick = (e) => {
      if (e.target.closest("button") && e.target.id !== "bgHealthToggle") return;
      $("bgHealthScoreSection")?.classList.toggle("expanded");
    };

    /* PDF export */
    ($("bgExportPdf") || {}).onclick = () => {
      state.exportOpen = false;
      const dd = $("bgExportDropdown");
      if (dd) { dd.hidden = true; dd.setAttribute("aria-hidden", "true"); }
      $("bgExportBtn")?.setAttribute("aria-expanded", "false");
      exportPDF();
    };

    /* Bill frequency pills */
    document.addEventListener("click", e => {
      const pill = e.target.closest(".bg-freq-pill");
      if (pill && $("billFreqPills")?.contains(pill)) {
        billFrequency = pill.dataset.freq || "monthly";
        syncBillFreqPills();
      }
      const due = e.target.closest("[data-due-day]");
      if (due && $("billDueDayGrid")?.contains(due)) {
        setVal("billDueDay", due.dataset.dueDay || "1");
        renderDueDayGrid(Number(due.dataset.dueDay) || 1);
      }
      const preset = e.target.closest("[data-bill-preset]");
      if (preset) {
        setVal("billName", preset.dataset.billPreset || "");
        billFlowStep = Math.max(billFlowStep, 2);
        syncBillFlowUI();
        setTimeout(() => $("billAmount")?.focus?.(), 80);
      }
      const tab = e.target.closest("[data-bill-filter]");
      if (tab) {
        state.billFilter = tab.dataset.billFilter || "all";
        renderBills();
      }
      if (e.target.closest("#bgMonthEndClose") || e.target.id === "bgMonthEndOverlay") {
        const ov = $("bgMonthEndOverlay");
        if (ov) {
          ov.style.display = "none";
          ov.setAttribute("aria-hidden", "true");
        }
      }
    });

    /* Backdrop close */
    ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay", "goalOverlay", "goalDetailOverlay", "autofillOverlay"].forEach(id => {
      ($(id) || {}).addEventListener?.("click", e => { if (e.target.id === id) closeOverlay(id); });
    });

    /* Wizard buttons */
    ($("bgWizNext") || {}).onclick = () => wizardGoNext();
    ($("bgWizBack") || {}).onclick = () => wizardGoBack();
    ($("bgWizSkip") || {}).onclick = () => skipWizard().catch((err) => fbErrRetry(err, skipWizard));
    ($("bgWizStage") || {}).addEventListener?.("click", onWizardStageClick);

    /* Planner mode */
    ($("bgPlannerTrack") || {}).onclick = () => {
      state.plannerMode = "track";
      state.plannerShowAll = false;
      persistPlannerMode();
      renderBudgetPlanner();
    };
    ($("bgPlannerPlan") || {}).onclick = () => {
      state.plannerMode = "plan";
      state.plannerDraft = { ...state.plan };
      persistPlannerMode();
      renderBudgetPlanner();
    };
    ($("bgPlannerSaveBtn") || {}).onclick = async () => {
      readPlannerDraftFromDom();
      state.plan = { ...state.plannerDraft };
      try {
        await savePlan();
        showToast(t("budget.toast.planSaved", "Plan saved."));
        renderBudgetPlanner();
        renderSmartAlerts();
        renderSetupChecklist();
      } catch (err) {
        fbErrRetry(err, () => $("bgPlannerSaveBtn")?.click());
      }
    };

    document.addEventListener("click", (e) => {
      if (e.target.closest?.(".bg-planner-show-all")) {
        state.plannerShowAll = true;
        renderBudgetPlanner();
        return;
      }
      if (e.target.closest?.(".bg-planner-show-less")) {
        state.plannerShowAll = false;
        renderBudgetPlanner();
      }
    });

    ($("bgDailyChip") || {}).onclick = () => {
      const cal = $("bgCalendarSection");
      if (cal && cal.tagName === "DETAILS") cal.open = true;
      cal?.scrollIntoView({ behavior: "smooth", block: "start" });
      cal?.classList.add("bg-section-pulse");
      setTimeout(() => cal?.classList.remove("bg-section-pulse"), 2000);
    };

    /* Export */
    ($("bgExportBtn") || {}).onclick = e => {
      e.stopPropagation();
      state.exportOpen = !state.exportOpen;
      const dd = $("bgExportDropdown");
      const btn = $("bgExportBtn");
      if (dd) {
        dd.hidden = !state.exportOpen;
        dd.setAttribute("aria-hidden", state.exportOpen ? "false" : "true");
      }
      if (btn) btn.setAttribute("aria-expanded", state.exportOpen ? "true" : "false");
    };
    ($("bgExportRun") || {}).onclick = () => {
      const r = document.querySelector('input[name="bgExportRange"]:checked');
      runCsvExport(r?.value || "month");
      state.exportOpen = false;
      const dd = $("bgExportDropdown");
      if (dd) { dd.hidden = true; dd.setAttribute("aria-hidden", "true"); }
      $("bgExportBtn")?.setAttribute("aria-expanded", "false");
    };
    document.addEventListener("click", e => {
      if (e.target.closest("#bgExportWrapHeader") || e.target.closest(".bg-export-wrap--header")) return;
      state.exportOpen = false;
      const dd = $("bgExportDropdown");
      if (dd && !dd.hidden) { dd.hidden = true; dd.setAttribute("aria-hidden", "true"); }
      $("bgExportBtn")?.setAttribute("aria-expanded", "false");
    });

    /* Goal sheets */
    ($("goalClose") || {}).onclick = () => closeOverlay("goalOverlay");
    ($("goalCreateBtn") || {}).onclick = () => submitGoalSheet();
    ($("goalDetailClose") || {}).onclick = () => closeOverlay("goalDetailOverlay");
    ($("goalAddContribBtn") || {}).onclick = () => {
      const cf = $("goalContribField");
      if (cf) cf.style.display = "";
      $("goalContribAmt")?.focus();
    };
    ($("goalContribConfirm") || {}).onclick = () => submitGoalContrib();
    ($("goalDeleteBtn") || {}).onclick = () => deleteGoal();
    ($("goalEditBtn") || {}).onclick = () => {
      const g = state.savingsGoals.find(x => x.id === state.goalDetailId);
      if (g) { closeOverlay("goalDetailOverlay"); openGoalEditSheet(g); }
    };

    document.addEventListener("click", e => {
      const sw = e.target.closest(".bg-goal-swatch");
      if (sw && $("goalSwatches")?.contains(sw)) {
        state.goalSelectedColor = sw.dataset.hex;
        renderGoalSwatches();
      }
    });

    /* Plan inputs */
    document.addEventListener("input", e => {
      const inp = e.target.closest?.("[data-plan-cat]");
      if (inp && $("plannerList")?.contains(inp)) updatePlannerPlanHints();
    });

    /* Planner intersection */
    const ioPl = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.target.id === "bgSecPlanner" && en.isIntersecting) {
          state.plannerInView = true;
          $("plannerList")?.classList.add("bg-planner-inview");
          renderBudgetPlanner();
          ioPl.disconnect();
        }
      });
    }, { threshold: 0.08 });
    const plSec = $("bgSecPlanner");
    if (plSec) ioPl.observe(plSec);

    const ioTrend = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.target.id === "bgTrendSection" && en.isIntersecting) {
          loadTrendData().catch((err) => fbErrRetry(err, () => loadTrendData()));
          ioTrend.disconnect();
        }
      });
    }, { threshold: 0.15 });
    const trSec = $("bgTrendSection");
    if (trSec) ioTrend.observe(trSec);
    if (trSec && trSec.tagName === "DETAILS") {
      trSec.addEventListener("toggle", () => {
        if (trSec.open) loadTrendData().catch((err) => fbErrRetry(err, () => loadTrendData()));
      });
    }

    /* ESC key */
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      BUDGET_OVERLAY_IDS.forEach(oid => {
        if ($(oid)?.classList.contains("open")) closeOverlay(oid);
      });
      closeFab();
      state.exportOpen = false;
      const dd = $("bgExportDropdown");
      if (dd) { dd.hidden = true; dd.setAttribute("aria-hidden", "true"); }
    });

    /* Search input */
    ($("txSearch") || {}).addEventListener?.("input", e => {
      state.searchQuery = e.target.value || "";
      renderEntries();
    });
    $("txFilterRow")?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-entry-filter]");
      if (!chip) return;
      state.entryTypeFilter = chip.dataset.entryFilter || "all";
      renderEntries();
    });

    /* Global delegation */
    document.addEventListener("click", e => {
      const kpiCard = e.target.closest("[data-kpi-target]");
      if (kpiCard) {
        const target = kpiCard.dataset.kpiTarget;
        if (target === "income") {
          focusTransactionView("income");
          return;
        }
        if (target === "expense") {
          focusTransactionView("expense");
          return;
        }
        if (target === "remaining") {
          openBudgetDetailsSection("overviewSection");
          openBudgetDetailsSection("bgSecPlanner");
          $("overviewSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      /* Empty state CTAs */
      if (e.target.closest("#btnAddExpenseEmpty") || e.target.closest("#btnAddExpenseEmptyPersonalized")) {
        openExpenseSheet(null); return;
      }
      if (e.target.closest("#btnCreateBudgetEmpty")) {
        state.plannerMode = "plan";
        persistPlannerMode();
        const sec = $("bgSecPlanner");
        if (sec) { sec.style.display = ""; sec.setAttribute("open", ""); sec.scrollIntoView({ behavior: "smooth" }); }
        renderBudgetPlanner();
        return;
      }
      if (e.target.closest("#btnAddGoalEmpty")) { openGoalCreateSheet?.(); return; }
      if (e.target.closest("#btnAddBillEmptyDebt")) { openBillSheet(null); return; }

      const guide = e.target.closest(".bg-premium-guidance-card");
      if (guide && !e.target.closest(".bg-premium-guidance-close")) {
        const action = guide.dataset.guidanceAction;
        if (action === "income") { openIncomeSheet(null); return; }
        if (action === "bill") { openBillSheet(null); return; }
        if (action === "planner") {
          state.plannerMode = "plan";
          state.plannerDraft = { ...state.plan };
          persistPlannerMode();
          $("bgSecInsights")?.setAttribute("open", "");
          openBudgetDetailsSection("bgSecPlanner");
          $("bgSecPlanner")?.scrollIntoView({ behavior: "smooth", block: "center" });
          renderBudgetPlanner();
          return;
        }
        if (action === "activity") {
          $("bgSecTransactions")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      if (e.target.closest(".bg-premium-guidance-close")) {
        e.target.closest(".bg-premium-guidance-card")?.remove();
        return;
      }

      /* Edit account */
      const editBtn = e.target.closest(".bg-acct-edit");
      if (editBtn) {
        const a = state.accounts.find(x => x.id === editBtn.dataset.id);
        if (a) openAccountSheet(a);
        return;
      }

      /* Add account card / hint */
      if (e.target.closest("#btnAddAccountCard") || e.target.closest("#btnAddAccountHint")) {
        openAccountSheet(null); return;
      }

      /* Account type selector */
      const typeBtn = e.target.closest("[data-acct-type]");
      if (typeBtn) {
        acctEditType = typeBtn.dataset.acctType;
        renderAccountTypeRow(acctEditType);
        updateAccountFields(acctEditType);
        return;
      }

      /* Category chip (generic via data-cat-id + data-grid) */
      const catChip = e.target.closest("[data-cat-id]");
      if (catChip) {
        const catId  = catChip.dataset.catId;
        const gridId = catChip.dataset.grid;
        if (gridId === "catGrid")     { expEditCat  = catId; renderCatGrid(catId, "catGrid"); }
        if (gridId === "billCatGrid") { billEditCat = catId; renderCatGrid(catId, "billCatGrid"); }
        return;
      }

      /* Edit bill pencil */
      const editBillBtn = e.target.closest("[data-edit-bill]");
      if (editBillBtn) {
        const bill = state.bills.find(b => b.id === editBillBtn.dataset.editBill);
        if (bill) openBillSheet(bill);
        return;
      }

      /* Bill pay/unpay toggle */
      const payBtn = e.target.closest("[data-pay]");
      if (payBtn) {
        const bill = state.bills.find(b => b.id === payBtn.dataset.pay);
        if (bill) toggleBillPaid(bill).catch((err) => fbErrRetry(err, () => toggleBillPaid(bill)));
        return;
      }

      const billCard = e.target.closest(".bg-bill-card[data-bill-id]");
      if (billCard) {
        const bill = state.bills.find(b => b.id === billCard.dataset.billId);
        if (bill) openBillSheet(bill);
        return;
      }

      const setLim = e.target.closest("[data-set-plan-cat]");
      if (setLim) {
        state.plannerMode = "plan";
        state.plannerDraft = { ...state.plan };
        persistPlannerMode();
        renderBudgetPlanner();
        requestAnimationFrame(() => {
          const inp = $("plannerList")?.querySelector(`[data-plan-cat="${setLim.dataset.setPlanCat}"]`);
          inp?.focus?.();
        });
        return;
      }

      const plannerRow = e.target.closest(".bg-planner-row--track");
      if (plannerRow && !e.target.closest(".bg-planner-set-limit")) {
        openLimitSheet(plannerRow.dataset.cat);
        return;
      }

      const setupItem = e.target.closest(".bg-setup-item");
      if (setupItem && !setupItem.classList.contains("done")) {
        const act = setupItem.dataset.setupAction;
        if (act === "account") { openAccountSheet(null); return; }
        if (act === "income") { openIncomeSheet(null); return; }
        if (act === "planner") {
          state.plannerMode = "plan";
          state.plannerDraft = { ...state.plan };
          persistPlannerMode();
          openBudgetDetailsSection("bgSecPlanner");
          $("bgSecPlanner")?.scrollIntoView({ behavior: "smooth" });
          $("bgSecPlanner")?.classList.add("bg-section-pulse");
          setTimeout(() => $("bgSecPlanner")?.classList.remove("bg-section-pulse"), 2000);
          renderBudgetPlanner();
          return;
        }
        if (act === "expense") { openExpenseSheet(null); return; }
        if (act === "bills") {
          $("bgSecBills")?.scrollIntoView({ behavior: "smooth" });
          $("bgSecBills")?.classList.add("bg-section-pulse");
          setTimeout(() => $("bgSecBills")?.classList.remove("bg-section-pulse"), 2000);
          openBillSheet(null);
          return;
        }
        if (act === "goals") {
          openBudgetDetailsSection("bgGoalsSection");
          $("bgGoalsSection")?.scrollIntoView({ behavior: "smooth" });
          $("bgGoalsSection")?.classList.add("bg-section-pulse");
          setTimeout(() => $("bgGoalsSection")?.classList.remove("bg-section-pulse"), 2000);
          openGoalCreateSheet();
          return;
        }
      }

      const alertDismiss = e.target.closest(".bg-alert-dismiss");
      if (alertDismiss) {
        const card = alertDismiss.closest(".bg-alert-card");
        const id = card?.dataset.alertId;
        if (id) try { sessionStorage.setItem(sessionAlertKey(id), "1"); } catch {}
        renderSmartAlerts();
        return;
      }
      const alertJump = e.target.closest("[data-alert-jump]");
      if (alertJump?.dataset.alertJump === "planner") {
        state.plannerMode = "plan";
        state.plannerDraft = { ...state.plan };
        persistPlannerMode();
        openBudgetDetailsSection("bgSecPlanner");
        $("bgSecPlanner")?.scrollIntoView({ behavior: "smooth" });
        renderBudgetPlanner();
        return;
      }
      if (alertJump?.dataset.alertJump === "nextmonth") {
        state.month = nextMonth(state.month);
        try { localStorage.setItem(LS_MONTH, state.month); } catch {}
        Promise.all([loadEntries(), loadPlan(), loadKpiComparison()]).then(() => renderAll());
        return;
      }

      if (e.target.closest("#bgGoalAddCard")) {
        openGoalCreateSheet();
        return;
      }
      const goalCard = e.target.closest(".bg-goal-card");
      if (goalCard?.dataset.goalId) {
        const g = state.savingsGoals.find(x => x.id === goalCard.dataset.goalId);
        if (g) openGoalDetail(g);
        return;
      }

      /* Click entry card → edit */
      const card = e.target.closest(".bg-entry-card");
      if (card && !e.target.closest(".bg-entry-del") && !e.target.closest(".bg-entry-swipe-del")
          && !e.target.closest(".bg-entry-del-confirm")) {
        const entry = state.entries.find(x => x.id === card.dataset.id);
      if (entry && !entry._pending) {
        if ((entry.type || "expense") === "income") openIncomeSheet(entry);
        else openExpenseSheet(entry);
      }
        return;
      }

      const confirmExp = e.target.closest("[data-action='confirm-exp-del']");
      if (confirmExp) {
        const id = confirmExp.getAttribute("data-id") || confirmExp.dataset.del;
        if (id) {
          state.expenseDeleteConfirmId = null;
          submitDeleteExpense(id);
        }
        return;
      }
      const cancelExp = e.target.closest("[data-action='cancel-exp-del']");
      if (cancelExp) {
        state.expenseDeleteConfirmId = null;
        renderEntries();
        return;
      }

      /* Delete button — first step */
      const delBtn = e.target.closest(".bg-entry-del[data-action='start-exp-del']");
      if (delBtn) {
        state.expenseDeleteConfirmId = delBtn.dataset.id;
        renderEntries();
        return;
      }

      /* Swipe strip */
      const swipeDel = e.target.closest(".bg-entry-swipe-del");
      if (swipeDel) {
        const id = swipeDel.dataset.del;
        const action = swipeDel.getAttribute("data-action");
        if (action === "confirm-exp-del" && id) {
          state.expenseDeleteConfirmId = null;
          submitDeleteExpense(id);
        } else if (action === "start-exp-del" && id) {
          state.expenseDeleteConfirmId = id;
          renderEntries();
        }
        return;
      }

      /* Pie slice */
      const pieSlice = e.target.closest(".bg-pie-slice");
      if (pieSlice) {
        const cat = pieSlice.dataset.cat;
        state.focusedCat = state.focusedCat === cat ? null : cat;
        renderPieChart();
        return;
      }

      /* Legend row */
      const legRow = e.target.closest(".bg-leg-row");
      if (legRow) {
        const cat = legRow.dataset.cat;
        state.focusedCat = state.focusedCat === cat ? null : cat;
        renderPieChart();
        return;
      }

      /* Close FAB menu when clicking outside */
      if (state.fabOpen && !e.target.closest(".bg-fab-wrap")) {
        closeFab();
      }
    });

    /* Language change */
    window.addEventListener("hbit:lang-changed", () => {
      renderAll();
      if ($("helpOverlay")?.classList.contains("open")) updateHelpContent();
    });
  }

  /* ── One-time migration: old localStorage → Firestore ────────────── */
  /* Modern Budget v3 render overrides */
  function prefersReducedMotion() {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch (_) {
      return false;
    }
  }

  function countUpNumber(el, from, to, duration = 600, formatter = fmtMoney) {
    if (!el) return;
    if (prefersReducedMotion() || !window.requestAnimationFrame || duration <= 0) {
      el.textContent = formatter(to);
      return;
    }
    const start = performance.now();
    const diff = to - from;
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatter(from + diff * ease);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setCountedMoney(id, value) {
    const el = $(id);
    if (!el) return;
    const from = Number(el.dataset.value || 0);
    el.dataset.value = String(value);
    if (Math.abs(value - from) > 1) countUpNumber(el, from, value);
    else el.textContent = fmtMoney(value);
  }

  function animateCountUp(el, to, duration = 800) {
    if (!el) return;
    const from = Number(el.dataset.value || 0);
    el.dataset.value = String(to);
    if (prefersReducedMotion() || Math.abs(to - from) <= 1) {
      el.textContent = fmtMoney(to);
      return;
    }
    countUpNumber(el, from, to, duration, fmtMoney);
  }

  function renderAll() {
    renderHeader();
    renderKpis();
    renderPremiumBudgetHome();
    renderSetupChecklist();
    renderSmartAlerts();

    const DEFAULT_SECTION_ORDER = [
      { id: "bgCalendarSection", expanded: true },
      { id: "bgSecTransactions", expanded: true },
      { id: "bgSecBills",        expanded: true },
      { id: "bgSecPlanner",      expanded: true },
      { id: "bgGoalsSection",    expanded: true },
      { id: "bgSecAccounts",     expanded: true },
      { id: "bgSecChart",        expanded: true },
      { id: "overviewSection",   expanded: false },
      { id: "bgTrendSection",    expanded: false },
    ];
    const grid = document.querySelector(".bg-dashboard-grid") || document.getElementById("main-content");
    if (state.wizardMeta?.completed) {
      const config = buildLayoutConfig();
      config.forEach(({ id, expanded }) => {
        const el = document.getElementById(id);
        if (!el || !grid) return;
        grid.appendChild(el);
        el.style.display = "";
        if (el.tagName === "DETAILS") {
          if (expanded) el.setAttribute("open", "");
          else el.removeAttribute("open");
        }
      });
      const visibleIds = new Set(config.map(c => c.id));
      ALL_SECTION_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && !visibleIds.has(id)) el.style.display = "none";
      });
    } else if (grid) {
      DEFAULT_SECTION_ORDER.forEach(({ id, expanded }) => {
        const el = document.getElementById(id);
        if (!el) return;
        grid.appendChild(el);
        el.style.display = "";
        if (el.tagName === "DETAILS") {
          if (expanded) el.setAttribute("open", "");
          else el.removeAttribute("open");
        }
      });
    }

    renderGoalsSection();
    renderOverviewDonut();
    renderBudgetPlanner();
    renderBills();
    renderBillsSummary();
    renderAccounts();
    renderActivityCalendar();
    renderPieChart();
    renderEntries();
    renderDailyAllowanceChip();
    renderHealthScore();
    renderSpendingStreak();
    updateStreak().catch((err) => fbErrRetry(err, () => updateStreak()));
    maybeShowMonthEndSummary();
    applyBudgetI18n(document);

    if (!state.trendLoaded && !state.trendLoading) {
      const sk = $("bgTrendSkeleton");
      if (sk && !sk.dataset.built) {
        sk.dataset.built = "1";
        sk.innerHTML = Array.from({ length: 6 }, () =>
          `<div class="bg-trend-sk-pair"><div class="bg-trend-sk-bar"></div><div class="bg-trend-sk-bar"></div></div>`
        ).join("");
      }
    }
  }

  function renderKpis() {
    const incEl = $("sumIncome");
    const expEl = $("sumExpenses");
    const remEl = $("sumRemaining");
    if (!state.dataHydrated) {
      [incEl, expEl, remEl].forEach(el => {
        if (!el) return;
        el.classList.add("skeleton");
        el.textContent = "\u00a0";
      });
      return;
    }
    [incEl, expEl, remEl].forEach(el => el && el.classList.remove("skeleton"));
    const income = computeIncome();
    const expenses = computeExpenses();
    const remaining = income - expenses;
    setCountedMoney("sumIncome", income);
    setCountedMoney("sumExpenses", expenses);
    setCountedMoney("sumRemaining", remaining);
    if (remEl) remEl.style.color = remaining < 0 ? "var(--bgt-danger)" : remaining > 0 && income > 0 ? "var(--bgt-income)" : "";

    const prevIncome = state.kpiComparison?.income;
    const prevExpenses = state.kpiComparison?.expenses;
    const prevRemaining = prevIncome - prevExpenses;
    const fmtTrend = (curr, prev) => {
      if (!Number.isFinite(prev) || Math.abs(prev) < 0.01) return "—";
      const delta = ((curr - prev) / Math.abs(prev)) * 100;
      if (Math.abs(delta) < 0.5) return "—";
      const arrow = delta > 0
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`
        : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
      return `${arrow} ${Math.abs(delta).toFixed(0)}%`;
    };
    [
      ["sumIncomeTrend", income, prevIncome, income >= prevIncome],
      ["sumExpensesTrend", expenses, prevExpenses, expenses <= prevExpenses],
      ["sumRemainingTrend", remaining, prevRemaining, remaining >= prevRemaining],
    ].forEach(([id, curr, prev, good]) => {
      const el = $(id);
      if (!el) return;
      el.innerHTML = fmtTrend(curr, prev);
      el.className = `bg-kpi-trend ${Number.isFinite(prev) ? (good ? "up" : "down") : ""}`;
    });
  }

  function renderPremiumBudgetHome() {
    const hero = $("bgHero");
    if (!hero) return;
    const income = computeIncome();
    const spent = computeExpenses();
    const planTotal = totalMonthlyPlan();
    const budgetBase = planTotal > 0 ? planTotal : income;
    const remaining = budgetBase - spent;
    const pct = budgetBase > 0 ? Math.min(999, (spent / budgetBase) * 100) : 0;
    const month = monthLabel(state.month);

    setText("bgHeroMonth", month);
    setText("bgHeroLabel", remaining < 0 ? budgetCopy("budget.status.over", "Over budget") : budgetCopy("budget.hero.leftToSpend", "Left to spend"));
    const valueEl = $("bgPremiumMainValue");
    if (valueEl) {
      valueEl.classList.toggle("overspent", remaining < 0);
      valueEl.classList.toggle("on-track", remaining >= 0 && budgetBase > 0);
      animateCountUp(valueEl, remaining);
    }
    setText("bgPremiumMainSub", budgetBase > 0
      ? budgetCopy("budget.hero.ofBudgeted", "of {amount} budgeted", { amount: fmtMoney(budgetBase) })
      : budgetCopy("budget.hero.noBudget", "Set a plan to track budget usage."));

    const fill = $("bgHeroBarFill");
    if (fill) {
      fill.style.width = `${Math.min(pct, 100).toFixed(1)}%`;
      fill.classList.toggle("danger", remaining < 0);
    }
    setText("bgHeroBarSpent", `${fmtMoney(spent)} ${t("budget.spent", "spent").toLowerCase()}`);
    setText("bgHeroBarPct", `${Math.round(pct)}%`);

    const chip = $("bgHeroStatusChip");
    if (chip) {
      chip.className = "bg-hero-chip";
      if (!budgetBase) {
        chip.textContent = budgetCopy("budget.status.setup", "No budget set");
        chip.classList.add("bg-hero-chip--amber");
      } else if (remaining < 0) {
        chip.textContent = budgetCopy("budget.status.over", "Over budget");
        chip.classList.add("bg-hero-chip--red");
      } else if (pct >= 80) {
        chip.textContent = budgetCopy("budget.status.close", "Close watch");
        chip.classList.add("bg-hero-chip--amber");
      } else {
        chip.textContent = budgetCopy("budget.status.onTrack", "On track");
        chip.classList.add("bg-hero-chip--green");
      }
    }

    const acctText = $("bgPremiumAccountText");
    if (acctText) {
      acctText.textContent = state.accounts.length
        ? t("budget.identity.accountCount", "{count} accounts", { count: String(state.accounts.length) })
        : t("budget.accounts", "Accounts");
    }
    setPremiumActionLabels();
  }

  function setPremiumActionLabels() {
    [
      ["bgQuickExpense", "budget.quick.expense", "Expense"],
      ["bgQuickIncome", "budget.quick.income", "Income"],
      ["bgQuickBill", "budget.quick.bill", "Bill"],
      ["bgQuickAccount", "budget.quick.account", "Account"],
      ["bgQuickGoal", "budget.quick.goal", "Goal"],
    ].forEach(([id, key, fallback]) => {
      const el = $(id)?.querySelector(".bg-action-label, .bg-premium-action-label");
      if (el) el.textContent = budgetCopy(key, fallback);
    });
  }

  function renderHealthScore() {
    const section = $("bgHealthScoreSection");
    if (!section) return;
    if (!state.dataHydrated) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    const score = computeHealthScore();
    const scoreEl = $("bgHealthScoreValue");
    const labelEl = $("bgHealthScoreLabel");
    const fillEl = $("bgHsgFill");
    const bdEl = $("bgHealthScoreBreakdown");
    if (scoreEl) {
      const prev = Number(scoreEl.dataset.value || 0);
      scoreEl.dataset.value = String(score);
      countUpNumber(scoreEl, prev, score, 700, n => String(Math.round(n)));
    }
    let label, cls;
    if (score >= 85) { label = budgetCopy("budget.health.excellent", "Excellent"); cls = "excellent"; }
    else if (score >= 65) { label = budgetCopy("budget.health.good", "Good"); cls = "good"; }
    else if (score >= 40) { label = budgetCopy("budget.health.fair", "Fair"); cls = "fair"; }
    else { label = budgetCopy("budget.health.poor", "Poor"); cls = "poor"; }
    if (labelEl) labelEl.textContent = label;
    if (fillEl) {
      const arcLen = 226;
      const fillLen = (score / 100) * arcLen;
      fillEl.classList.remove("poor", "fair", "good", "excellent");
      fillEl.classList.add(cls);
      fillEl.style.strokeDasharray = `0 ${arcLen}`;
      requestAnimationFrame(() => { fillEl.style.strokeDasharray = `${fillLen.toFixed(1)} ${arcLen}`; });
    }
    if (bdEl) {
      const income = computeIncome();
      const spent = computeExpenses();
      const saveRate = income > 0 ? Math.round((Math.max(0, income - spent) / income) * 100) : 0;
      const planCats = Object.keys(state.plan).filter(k => (Number(state.plan[k]) || 0) > 0);
      const byCat = computeByCategory();
      const okCats = planCats.filter(cid => (byCat[cid] || 0) <= (Number(state.plan[cid]) || 0)).length;
      const paidBills = state.bills.filter(b => isBillPaid(b)).length;
      const rows = [
        { label: `${budgetCopy("budget.health.savingsRate", "Savings rate")} ${saveRate}%`, pts: saveRate >= 20 ? 25 : saveRate >= 10 ? 15 : saveRate > 0 ? 5 : 0 },
        { label: budgetCopy("budget.health.adherence", "Budget adherence"), pts: planCats.length ? Math.round((okCats / planCats.length) * 25) : 0 },
        { label: `${t("budget.bills.title", "Bills")} ${paidBills}/${state.bills.length} ${t("budget.bills.paid", "paid")}`, pts: state.bills.length ? Math.round((paidBills / state.bills.length) * 20) : 10 },
        { label: budgetCopy("budget.health.goalSet", "Savings goal set"), pts: state.savingsGoals.length ? 10 : 0 },
      ];
      bdEl.innerHTML = rows.map(row => `
        <div class="bg-health-row">
          <span class="bg-health-row-left"><span>${row.pts > 0 ? "+" : ""}${row.pts}</span><span>${escHtml(row.label)}</span></span>
          <span class="bg-health-row-pts">${row.pts} pts</span>
        </div>`).join("");
    }
  }

  function renderStreak(n) {
    const chip = $("bgStreakChip");
    const num = $("bgStreakNum");
    if (!chip) return;
    if (n >= 1) {
      chip.style.display = "inline-flex";
      if (num) num.textContent = String(n);
    } else {
      chip.style.display = "none";
    }
  }

  function renderSpendingStreak() {
    const totalPlan = totalMonthlyPlan();
    if (!totalPlan || !state.dataHydrated || state.month !== todayKey().slice(0, 7)) {
      renderStreak(0);
      return;
    }
    const daysInMonth = daysInMonthYm(state.month);
    const dailyBudget = totalPlan / daysInMonth;
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < today.getDate(); i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dk = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
      const daySpend = state.entries
        .filter(e => (e.dateKey || e.date || "") === dk && (e.type || "expense") === "expense")
        .reduce((s, e) => s + Math.abs(e.amount || 0), 0);
      if (daySpend <= dailyBudget) streak++;
      else break;
    }
    renderStreak(streak);
  }

  async function updateStreak() {
    if (!state.uid || !state.dataHydrated || state.month !== todayKey().slice(0, 7)) return;
    const today = todayKey();
    const guard = `${state.uid}:${state.month}:${today}:${state.entries.length}:${totalMonthlyPlan()}`;
    if (state.streakLastRendered === guard) return;
    state.streakLastRendered = guard;
    const monthlyBudget = totalMonthlyPlan();
    if (monthlyBudget === 0) { renderStreak(0); return; }
    try {
      const meta = await budgetMetaCol().doc("streak").get();
      const data = meta.exists ? meta.data() : {};
      const lastCheck = data.lastCheck || "";
      let streak = data.streak || 0;
      if (lastCheck === today) {
        renderStreak(streak);
        return;
      }
      const dailyLimit = monthlyBudget / daysInMonthYm(state.month);
      const todaySpent = state.entries
        .filter(e => (e.type || "expense") === "expense" && (e.dateKey || e.date) === today)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      streak = todaySpent <= dailyLimit ? streak + 1 : 0;
      await budgetMetaCol().doc("streak").set({ streak, lastCheck: today }, { merge: true });
      renderStreak(streak);
    } catch (_) {
      renderSpendingStreak();
    }
  }

  function renderBudgetPlanner() {
    const list = $("plannerList");
    const sumEl = $("bgPlannerSummary");
    if (!list) return;
    syncPlannerToggleUi();
    const catMap = computeByCategory();
    const totalBudgeted = CATEGORIES.reduce((s, c) => s + (Number(state.plan[c.id]) || 0), 0);
    const totalSpent = computeExpenses();

    if (state.plannerMode === "plan") {
      list.innerHTML = CATEGORIES.map(row => {
        const v = state.plannerDraft[row.id] != null ? state.plannerDraft[row.id] : (state.plan[row.id] || "");
        const val = v === "" || v == null ? "" : String(v);
        return `
          <div class="bg-cat-row bg-planner-row bg-planner-row--plan" data-cat="${row.id}" role="listitem">
            <div class="bg-cat-row-top">
              <div class="bg-cat-row-left">
            <div class="bg-cat-icon-badge" style="background:${softColor(row.color)};color:${row.color}">${catIconSvg(row.id, 18)}</div>
                <div class="bg-cat-name">${escHtml(row.label)}</div>
              </div>
              <input id="planInp-${row.id}" class="bg-input" type="number" min="0" step="1" data-plan-cat="${row.id}" value="${escHtml(val)}" placeholder="0" aria-label="${escHtml(t("budget.aria.limitFor", "Limit for {category}", { category: row.label }))}" style="max-width:116px;text-align:right">
            </div>
            <div class="bg-cat-status"><span class="bg-cat-status-left bg-planner-plan-hint"></span><span class="bg-cat-status-right">${fmtMoney(Number(v) || 0)}</span></div>
          </div>`;
      }).join("");
      updatePlannerPlanHints(list);
    } else {
      list.innerHTML = CATEGORIES.map(row => {
        const spent = catMap[row.id] || 0;
        const limit = Number(state.plan[row.id]) || 0;
        const pct = limit > 0 ? (spent / limit) * 100 : 0;
        const width = limit > 0 ? Math.min(pct, 100) : (totalSpent > 0 ? Math.min((spent / totalSpent) * 100, 100) : 0);
        const stateCls = limit <= 0 ? "unset" : pct > 100 ? "over" : pct >= 75 ? "warning" : "ok";
        const remaining = limit - spent;
        const statusText = limit <= 0
          ? t("budget.planner.noLimit", "No limit")
          : remaining >= 0
            ? t("budget.remaining", "Remaining")
            : t("budget.status.over", "Over budget");
        return `
          <div class="bg-cat-row bg-planner-row bg-planner-row--track" data-cat="${row.id}" data-has-limit="${limit > 0 ? "1" : "0"}" role="listitem" tabindex="0">
            <div class="bg-cat-row-top">
              <div class="bg-cat-row-left">
            <div class="bg-cat-icon-badge" style="background:${softColor(row.color)};color:${row.color}">${catIconSvg(row.id, 18)}</div>
                <div class="bg-cat-name">${escHtml(row.label)}</div>
              </div>
              <div class="bg-cat-row-right">
                <div><div class="bg-cat-spent">${fmtMoney(spent)}</div><div class="bg-cat-limit">${limit > 0 ? fmtMoney(limit) : t("budget.planner.noLimit", "No limit")}</div></div>
              </div>
            </div>
            <div class="bg-cat-bar-track"><div class="bg-cat-bar-fill ${stateCls}" style="width:${width.toFixed(1)}%"></div></div>
            <div class="bg-cat-status">
              <span class="bg-cat-status-left">${escHtml(statusText)}</span>
              <span class="bg-cat-status-right ${stateCls}">${limit > 0 ? fmtMoney(Math.abs(remaining)) : (spent > 0 ? fmtMoney(spent) : t("budget.planner.setLimit", "Set limit"))}</span>
            </div>
          </div>`;
      }).join("");
    }

    if (sumEl) {
      const rem = totalBudgeted - totalSpent;
      sumEl.innerHTML = `
        <span>${t("budget.planner.budgeted", "Budgeted")}: <strong>${fmtMoney(totalBudgeted)}</strong></span>
        <span> - </span>
        <span>${t("budget.spent", "Spent")}: <strong>${fmtMoney(totalSpent)}</strong></span>
        <span> - </span>
        <span>${t("budget.remaining", "Remaining")}: <strong class="${rem >= 0 ? "rem-pos" : "rem-neg"}">${fmtMoney(rem)}</strong></span>`;
    }
  }

  function isBillPaid(bill) {
    return bill?.paidMonth === state.month || !!bill?.paidMonths?.[state.month];
  }

  function billStatus(bill, today = todayDay()) {
    if (isBillPaid(bill)) return "paid";
    const day = Number(bill.dueDay) || 1;
    if (day < today) return "overdue";
    if (day <= today + 3) return "due-soon";
    return "upcoming";
  }

  function billDueText(bill, status) {
    const day = Number(bill.dueDay) || 1;
    const base = t("budget.bills.dueOn", "Due {day}", { day: String(day) });
    if (status === "overdue") return `${base} - ${budgetCopy("budget.bills.overdue", "Overdue")}`;
    if (status === "due-soon") return `${base} - ${budgetCopy("budget.bills.dueSoon", "Due soon")}`;
    if (status === "paid") return t("budget.bills.paid", "Paid");
    return `${base} - ${budgetCopy("budget.bills.upcoming", "Upcoming")}`;
  }

  function renderBillsSummary() {
    const meta = $("bgBillsSummaryMeta");
    if (!meta || state.bills.length === 0) {
      if (meta) meta.textContent = "";
      return;
    }
    const paid = state.bills.filter(isBillPaid).length;
    const unpaid = state.bills.length - paid;
    const total = state.bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    meta.textContent = `${paid} ${t("budget.bills.paid", "paid")} - ${unpaid} ${t("budget.bills.unpaid", "unpaid")} - ${fmtMoney(total)}/mo`;
  }

  function renderPieChart() {
    const catMap = computeByCategory();
    const total = Object.values(catMap).reduce((s, v) => s + v, 0);
    const chartSection = $("chartSection");
    const chartEmpty = $("chartEmpty");
    if (total === 0) {
      if (chartSection) chartSection.style.display = "none";
      if (chartEmpty) chartEmpty.style.display = "";
      return;
    }
    if (chartSection) chartSection.style.display = "";
    if (chartEmpty) chartEmpty.style.display = "none";
    const slices = CATEGORIES
      .filter(c => (catMap[c.id] || 0) > 0)
      .map(c => ({ ...c, amount: catMap[c.id], frac: (catMap[c.id] || 0) / total }))
      .sort((a, b) => b.amount - a.amount);
    const CX = 90, CY = 90, R = 65, SW = 32;
    const CIRC = 2 * Math.PI * R;
    let acc = 0;
    const circles = slices.map((s, i) => {
      const len = s.frac * CIRC;
      const off = -(acc * CIRC);
      acc += s.frac;
      const dim = state.focusedCat && state.focusedCat !== s.id ? "0.18" : "1";
      return `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${s.color}" stroke-width="${SW}" stroke-dasharray="${len.toFixed(3)} ${CIRC.toFixed(3)}" data-arc="${len.toFixed(3)}" data-circ="${CIRC.toFixed(3)}" data-target-offset="${off.toFixed(3)}" stroke-dashoffset="${off.toFixed(3)}" transform="rotate(-90 ${CX} ${CY})" opacity="${dim}" data-cat="${s.id}" data-idx="${i}" class="bg-pie-slice" style="cursor:pointer"/>`;
    }).join("");
    const focused = state.focusedCat ? slices.find(s => s.id === state.focusedCat) : null;
    const hole = `<circle cx="${CX}" cy="${CY}" r="${R - SW / 2 - 2}" fill="var(--bgt-surface-1)"/>`;
    const textEls = `
      <text x="${CX}" y="${focused ? CY - 8 : CY - 3}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--bgt-text-1)" font-family="system-ui,-apple-system,sans-serif">${fmtMoney(focused ? focused.amount : total)}</text>
      <text x="${CX}" y="${focused ? CY + 8 : CY + 12}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--bgt-text-3)" font-family="system-ui,-apple-system,sans-serif">${escHtml(focused ? focused.label : t("common.total", "total"))}</text>`;
    const pieSVG = $("pieSVG");
    if (pieSVG) {
      pieSVG.innerHTML = `<g><circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--bgt-surface-3)" stroke-width="${SW}"/>${circles}</g>${hole}${textEls}`;
      animateDonutSweep(pieSVG);
    }
    const pieLegend = $("pieLegend");
    if (pieLegend) {
      pieLegend.innerHTML = slices.map(s => `
        <div class="bg-legend-item bg-leg-row${state.focusedCat === s.id ? " focused" : ""}" data-cat="${s.id}" role="listitem">
          <span class="bg-legend-dot bg-leg-dot" style="background:${s.color}"></span>
          <span class="bg-legend-name bg-leg-name">${escHtml(s.label)}</span>
          <span class="bg-legend-pct bg-leg-pct">${Math.round(s.frac * 100)}%</span>
          <span class="bg-legend-amt bg-leg-amt">${fmtMoney(s.amount)}</span>
        </div>`).join("");
    }
  }

  function renderEntries() {
    const list = $("entriesList");
    const emptyEl = $("entriesEmpty");
    const badge = $("entriesBadge");
    const filterRow = $("txFilterRow");
    if (!list) return;
    if (!state.dataHydrated) {
      list.style.display = "";
      if (emptyEl) emptyEl.style.display = "none";
      if (badge) badge.textContent = "";
      list.innerHTML = Array.from({ length: 5 }, () => '<div class="skeleton" style="min-height:52px;margin-bottom:10px;border-radius:12px" aria-hidden="true"></div>').join("");
      return;
    }
    const q = state.searchQuery.trim().toLowerCase();
    const filtered = state.entries.filter(e => {
      const type = e.type || "expense";
      if (state.entryTypeFilter !== "all" && type !== state.entryTypeFilter) return false;
      if (!q) return true;
      const cat = type === "income" ? { label: t("budget.income", "Income") } : getCat(e.category);
      return (e.description || "").toLowerCase().includes(q) || (e.note || "").toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
    });
    filterRow?.querySelectorAll("[data-entry-filter]").forEach(btn => {
      const active = btn.dataset.entryFilter === state.entryTypeFilter;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    const sorted = [...filtered].sort((a, b) => (b.dateKey || b.date || "").localeCompare(a.dateKey || a.date || ""));
    if (!sorted.length) {
      list.style.display = "none";
      if (badge) badge.textContent = "";
      if (emptyEl) emptyEl.style.display = "";
      return;
    }
    list.style.display = "";
    if (badge) badge.textContent = String(filtered.length);
    if (emptyEl) emptyEl.style.display = "none";
    const groups = {};
    sorted.forEach(e => {
      const dk = e.dateKey || e.date || "";
      if (!groups[dk]) groups[dk] = [];
      groups[dk].push(e);
    });
    let html = "";
    Object.entries(groups).forEach(([dk, items]) => {
      let dateLabel = dk;
      try {
        dateLabel = new Date(dk + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      } catch {}
      const dayTotal = items.reduce((s, e) => s + ((e.type || "expense") === "income" ? Number(e.amount) || 0 : -(Number(e.amount) || 0)), 0);
      html += `<div class="bg-tx-date-header bg-date-group-header"><span class="bg-tx-date-label bg-date-label">${escHtml(dateLabel)}</span><span class="bg-tx-date-total bg-date-total">${fmtMoney(dayTotal)}</span></div>`;
      html += items.map(e => renderEntryCard(e)).join("");
    });
    list.innerHTML = html;
    bindEntrySwipe();
  }

  function renderEntryCard(e) {
    const isIncome = (e.type || "expense") === "income";
    const cat = isIncome ? { id: "income", color: "var(--bgt-income)", label: t("budget.income", "Income") } : getCat(e.category);
    const confirming = state.expenseDeleteConfirmId === e.id;
    const amount = `${isIncome ? "+" : "-"}${fmtMoney(Math.abs(Number(e.amount) || 0))}`;
    const rightBlock = confirming
      ? `<div class="bg-entry-del-confirm" role="group" aria-label="${escHtml(t("budget.delete.confirm", "Delete this transaction?"))}">
           <button type="button" class="bg-entry-del-yes" data-action="confirm-exp-del" data-id="${e.id}">${escHtml(t("common.confirm", "Confirm"))}</button>
           <button type="button" class="bg-entry-del-no" data-action="cancel-exp-del" data-id="${e.id}">${escHtml(t("common.cancel", "Cancel"))}</button>
         </div>`
      : `<div class="bg-tx-amount bg-entry-amount ${isIncome ? "income" : "expense"}">${amount}</div>
         <button class="bg-entry-del" data-action="start-exp-del" data-id="${e.id}" type="button" aria-label="${escHtml(t("budget.delete.aria", "Delete transaction"))}">x</button>`;
    return `
      <div class="bg-tx-item bg-entry-card" data-id="${e.id}" ${e._pending ? 'data-pending="true"' : ""} role="listitem">
        <div class="bg-tx-icon bg-entry-icon" style="background:${softColor(cat.color)};color:${cat.color}" aria-hidden="true">${catIconSvg(cat.id, 18)}</div>
        <div class="bg-tx-info bg-entry-main bg-entry-info">
          <div class="bg-tx-desc bg-entry-title bg-entry-desc">${escHtml(e.description || cat.label)}</div>
          ${e.note ? `<div class="bg-tx-note bg-entry-note">${escHtml(e.note)}</div>` : ""}
          <div class="bg-tx-cat bg-entry-meta"><span class="bg-entry-cat">${escHtml(cat.label)}</span></div>
        </div>
        <div class="bg-entry-right">${rightBlock}</div>
        <div class="bg-entry-swipe-del" data-action="${confirming ? "confirm-exp-del" : "start-exp-del"}" data-del="${e.id}">${escHtml(confirming ? t("common.confirm", "Confirm") : t("budget.delete.short", "Delete"))}</div>
      </div>`;
  }

  function renderBillPresets() {
    const row = $("billPresetRow");
    if (!row) return;
    const presets = billEditCat === "subscriptions"
      ? ["Netflix", "Spotify", "YouTube", "iCloud", "Gym"]
      : [];
    row.innerHTML = presets.map(name => `<button type="button" class="bg-bill-preset-chip" data-bill-preset="${escHtml(name)}">${escHtml(name)}</button>`).join("");
  }

  function renderDueDayGrid(selected = 1) {
    const grid = $("billDueDayGrid");
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 28 }, (_, i) => i + 1).map(day =>
      `<button type="button" class="bg-due-day-dot${day === Number(selected) ? " selected" : ""}" data-due-day="${day}">${day}</button>`
    ).join("");
  }

  function renderCatGrid(sel, gridId, onSelect) {
    const grid = $(gridId);
    if (!grid) return;
    const isBill = gridId === "billCatGrid";
    grid.innerHTML = CATEGORIES.map(c => `
      <button class="${isBill ? "bg-bill-cat-item" : "bg-cat-item"}${c.id === sel ? " selected active" : ""}"
              data-cat-id="${c.id}" data-grid="${gridId}" type="button">
        <span class="icon-wrap" style="background:${softColor(c.color)};color:${c.color}">${catIconSvg(c.id, 18)}</span>
        <span class="cat-label">${escHtml(c.label)}</span>
      </button>`).join("");
    if (isBill) renderBillPresets();
  }

  function syncBillFlowUI() {
    const editing = !!(state.sheet?.type === "bill" && state.sheet.data?.id);
    const addMode = state.sheet?.type === "bill" && !state.sheet.data?.id;
    const bCat = $("billBlockCategory");
    const bAmt = $("billBlockAmount");
    const bDet = $("billBlockDetails");
    const foot = $("billFlowFooter");
    const prog = $("billFlowProgress");
    const save = $("billSave");
    const next = $("billFlowNext");
    const back = $("billFlowBack");
    if (!bCat || !bAmt || !bDet) return;
    if (editing) {
      bCat.style.display = "";
      bAmt.style.display = "";
      bDet.style.display = "";
      if (foot) foot.style.display = "none";
      if (prog) prog.textContent = "";
      if (save) { save.style.visibility = "visible"; save.style.pointerEvents = ""; }
      return;
    }
    if (!addMode) return;
    bCat.style.display = billFlowStep === 1 ? "" : "none";
    bAmt.style.display = billFlowStep === 2 ? "" : "none";
    bDet.style.display = billFlowStep === 3 ? "" : "none";
    if (foot) foot.style.display = "flex";
    if (prog) prog.textContent = flowStepLabel(billFlowStep, 3);
    if (save) {
      save.style.visibility = billFlowStep === 3 ? "visible" : "hidden";
      save.style.pointerEvents = billFlowStep === 3 ? "" : "none";
    }
    if (next) next.style.display = billFlowStep === 3 ? "none" : "";
    if (back) back.textContent = billFlowStep === 1 ? t("budget.flow.cancel", "Cancel") : t("budget.flow.back", "Back");
  }

  function openBillSheet(bill) {
    state.sheet = { type: "bill", data: bill || null };
    billFlowStep = bill ? 0 : 1;
    billEditCat = bill?.category || "subscriptions";
    billFrequency = bill?.frequency || "monthly";
    setText("billTitle", bill ? t("budget.sheet.editBill", "Edit bill") : t("budget.sheet.addBill", "Add bill"));
    setVal("billAmount", bill ? String(bill.amount) : "");
    setVal("billName", bill?.name ?? "");
    setVal("billDueDay", bill?.dueDay ?? "1");
    setVal("billNote", bill?.note ?? "");
    renderCatGrid(billEditCat, "billCatGrid");
    renderDueDayGrid(Number(bill?.dueDay) || 1);
    syncBillFreqPills();
    const del = $("billDelete");
    if (del) del.style.display = bill ? "" : "none";
    const sym = $("billCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    syncBillFlowUI();
    closeFab();
    openOverlay("billOverlay");
    setTimeout(() => {
      if (bill) $("billName")?.focus?.();
    }, 240);
  }

  function open5030Sheet() {
    const income = computeIncome();
    const preview = $("bgAutofillPreview");
    const applyBtn = $("bgAutofillApply");
    if (!preview) return;
    if (!income) {
      preview.innerHTML = `<p class="bg-autofill-note">${escHtml(budgetCopy("budget.planner.autofillNoIncome", "Log your income first to use this feature."))}</p>`;
      if (applyBtn) applyBtn.style.display = "none";
    } else {
      const needs = income * 0.50;
      const wants = income * 0.30;
      const savings = income * 0.20;
      preview.innerHTML = `
        <div class="bg-autofill-info">${escHtml(budgetCopy("budget.planner.autofillBased", "Based on your income of"))} <strong>${fmtMoney(income)}</strong></div>
        <div class="bg-autofill-row"><div><strong>${escHtml(budgetCopy("budget.planner.needs", "Needs"))}</strong><div class="bg-cat-status-left">Housing, transport, health, subscriptions</div></div><span>${fmtMoney(needs)}</span></div>
        <div class="bg-autofill-row"><div><strong>${escHtml(budgetCopy("budget.planner.wants", "Wants"))}</strong><div class="bg-cat-status-left">Food, fun, shopping</div></div><span>${fmtMoney(wants)}</span></div>
        <div class="bg-autofill-row"><div><strong>${escHtml(budgetCopy("budget.planner.savings", "Savings"))}</strong><div class="bg-cat-status-left">Savings, education</div></div><span>${fmtMoney(savings)}</span></div>`;
      if (applyBtn) applyBtn.style.display = "";
    }
    openOverlay("autofillOverlay");
  }

  async function apply5030Plan() {
    const income = computeIncome();
    if (!income) return;
    const needsCats = ["housing", "transport", "health", "subscriptions"];
    const wantsCats = ["food", "entertainment", "shopping"];
    const savingsCats = ["savings", "education"];
    const needsEach = Math.round((income * 0.50) / needsCats.length);
    const wantsEach = Math.round((income * 0.30) / wantsCats.length);
    const savingsEach = Math.round((income * 0.20) / savingsCats.length);
    needsCats.forEach(c => { state.plan[c] = needsEach; });
    wantsCats.forEach(c => { state.plan[c] = wantsEach; });
    savingsCats.forEach(c => { state.plan[c] = savingsEach; });
    await savePlan();
    closeOverlay("autofillOverlay");
    state.plannerMode = "track";
    persistPlannerMode();
    renderAll();
    showToast(budgetCopy("budget.planner.autofillApplied", "50/30/20 plan applied."));
  }

  function exportPDF() {
    const totalIncome = sumEntryAmounts(state.entries, "income");
    const totalSpent = sumEntryAmounts(state.entries, "expense");
    const saved = totalIncome - totalSpent;
    const rate = totalIncome > 0 ? Math.round((Math.max(0, saved) / totalIncome) * 100) : 0;
    const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v); };
    set("prIncome", fmtMoney(totalIncome));
    set("prSpent", fmtMoney(totalSpent));
    set("prSaved", fmtMoney(Math.max(0, saved)));
    set("prSavingsRate", `${rate}%`);
    set("prSubLine", `${monthLabel(state.month)} - ${new Date().toLocaleDateString()}`);
    const tbody = $("prCategoryBody");
    if (tbody) {
      tbody.innerHTML = "";
      CATEGORIES.forEach(cat => {
        const actual = state.entries
          .filter(e => (e.type || "expense") === "expense" && e.category === cat.id)
          .reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const budgeted = Number(state.plan[cat.id]) || 0;
        if (actual === 0 && budgeted === 0) return;
        const remaining = budgeted - actual;
        const status = budgeted === 0 ? "-" : actual > budgeted ? "Over" : "OK";
        tbody.innerHTML += `<tr><td>${escHtml(cat.label)}</td><td>${budgeted > 0 ? fmtMoney(budgeted) : "-"}</td><td>${fmtMoney(actual)}</td><td>${budgeted > 0 ? fmtMoney(remaining) : "-"}</td><td>${status}</td></tr>`;
      });
    }
    const bills = $("prBillsList");
    if (bills) {
      bills.innerHTML = state.bills.length
        ? state.bills.map(b => `<div class="bg-pr-line"><span>${escHtml(b.name || "Bill")}</span><span>${fmtMoney(Number(b.amount) || 0)} - ${isBillPaid(b) ? t("budget.bills.paid", "paid") : t("budget.bills.unpaid", "unpaid")}</span></div>`).join("")
        : `<div class="bg-pr-line"><span>${escHtml(t("budget.bills.empty", "No bills yet"))}</span><span>-</span></div>`;
    }
    const goals = $("prGoalsList");
    if (goals) {
      goals.innerHTML = state.savingsGoals.length
        ? state.savingsGoals.map(g => `<div class="bg-pr-line"><span>${escHtml(g.name || "Goal")}</span><span>${fmtMoney(Number(g.savedAmount) || 0)} / ${fmtMoney(Number(g.targetAmount) || 0)}</span></div>`).join("")
        : `<div class="bg-pr-line"><span>${escHtml(t("budget.goals.empty", "No savings goals"))}</span><span>-</span></div>`;
    }
    set("prNetWorth", fmtMoney(computeNetWorth()));
    const report = $("bgPrintReport");
    if (report) {
      report.style.removeProperty("display");
      report.setAttribute("aria-hidden", "false");
    }
    window.print();
    setTimeout(() => {
      if (report) {
        report.style.display = "none";
        report.setAttribute("aria-hidden", "true");
      }
    }, 1200);
  }

  function maybeShowMonthEndSummary() {
    if (!state.dataHydrated) return;
    const now = new Date();
    if (now.getDate() !== 1) return;
    const prev = prevMonth(todayKey().slice(0, 7));
    const key = `hbit:budget:monthend:${state.uid || "local"}:${prev}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    showMonthEndSummary(prev);
  }

  function showMonthEndSummary(ym) {
    const overlay = $("bgMonthEndOverlay");
    if (!overlay) return;
    const income = sumEntryAmounts(state.entries, "income");
    const spent = sumEntryAmounts(state.entries, "expense");
    const saved = income - spent;
    const billsPaid = state.bills.filter(isBillPaid).length;
    overlay.innerHTML = `
      <div class="bg-monthend-card" role="dialog" aria-modal="true" aria-labelledby="bgMonthEndTitle">
        <div class="bg-monthend-handle"></div>
        <div class="bg-monthend-month">${escHtml(monthLabel(ym))}</div>
        <div class="bg-monthend-hero-label" id="bgMonthEndTitle">${escHtml(saved >= 0 ? budgetCopy("budget.monthend.saved", "You saved") : budgetCopy("budget.monthend.net", "Net result"))}</div>
        <div class="bg-monthend-hero-number${saved < 0 ? " negative" : ""}" id="bgMonthEndNumber">${fmtMoney(saved)}</div>
        <div class="bg-monthend-hero-sub">${escHtml(t("budget.overview.title", "Money Overview"))}</div>
        <div class="bg-monthend-stats">
          <div class="bg-monthend-stat"><div class="bg-monthend-stat-val">${fmtMoney(income)}</div><div class="bg-monthend-stat-lbl">${escHtml(budgetCopy("budget.monthend.income", "Income"))}</div></div>
          <div class="bg-monthend-stat"><div class="bg-monthend-stat-val">${fmtMoney(spent)}</div><div class="bg-monthend-stat-lbl">${escHtml(budgetCopy("budget.monthend.spent", "Spent"))}</div></div>
          <div class="bg-monthend-stat"><div class="bg-monthend-stat-val">${billsPaid}/${state.bills.length}</div><div class="bg-monthend-stat-lbl">${escHtml(budgetCopy("budget.monthend.bills", "Bills paid"))}</div></div>
        </div>
        <div class="bg-monthend-vs">
          <div class="bg-monthend-vs-title">${escHtml(budgetCopy("budget.monthend.vsLast", "Vs last month"))}</div>
          <div class="bg-monthend-vs-row"><span class="bg-monthend-vs-label">${escHtml(budgetCopy("budget.monthend.spent", "Spent"))}</span><span class="bg-monthend-vs-track"><span class="bg-monthend-vs-fill" style="width:${Math.min(100, spent / Math.max(income, 1) * 100).toFixed(0)}%"></span></span><span class="bg-monthend-vs-pct ${saved >= 0 ? "up" : "down"}">${income ? Math.round((saved / income) * 100) : 0}%</span></div>
        </div>
        <div class="bg-monthend-quote">${escHtml(saved >= 0 ? budgetCopy("budget.monthend.quoteGood", "Small money choices added up nicely.") : budgetCopy("budget.monthend.quoteTight", "A tight month still teaches useful patterns."))}</div>
        <div class="bg-monthend-actions"><button type="button" class="bg-monthend-share" id="bgMonthEndShare">${escHtml(budgetCopy("budget.monthend.share", "Share"))}</button><button type="button" class="bg-monthend-close" id="bgMonthEndClose">${escHtml(budgetCopy("budget.monthend.close", "Done"))}</button></div>
      </div>`;
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    const num = $("bgMonthEndNumber");
    if (num) countUpNumber(num, 0, saved);
  }

  async function migrateLocalStorage() {
    try {
      const raw = localStorage.getItem(LS_EXPENSES);
      if (!raw) return;
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0 || state.entries.length > 0) {
        localStorage.removeItem(LS_EXPENSES);
        return;
      }
      const today2 = todayKey();
      for (const exp of items) {
        if (!exp.name && !exp.amount) continue;
        await HBIT.db.budgetEntries.add({
          type: "expense", amount: Math.abs(+(exp.amount || 0)),
          category: exp.category || "other", description: exp.name || "",
          dateKey: today2, date: today2, month: today2.slice(0, 7),
        });
      }
      localStorage.removeItem(LS_EXPENSES);
      await loadEntries();
      renderAll();
    } catch (err) {
      fbErrRetry(err, () => migrateLocalStorage());
    }
  }

  function openBudgetDetailsSection(id) {
    const el = $(id);
    if (el && el.tagName === "DETAILS") el.open = true;
  }

  function focusTransactionView(type) {
    state.entryTypeFilter = type || "all";
    openBudgetDetailsSection("bgSecTransactions");
    $("bgSecTransactions")?.scrollIntoView({ behavior: "smooth", block: "start" });
    renderEntries();
    setTimeout(() => $("txSearch")?.focus?.(), 220);
  }

  function applyBudgetDetailsDefaults() {
    const pl = $("bgSecPlanner");
    if (!pl || pl.tagName !== "DETAILS") return;
    try {
      if (window.matchMedia("(min-width: 768px)").matches) pl.setAttribute("open", "");
    } catch (_) {
      pl.setAttribute("open", "");
    }
  }

  /* ── Init ────────────────────────────────────────────────────────── */
  function init() {
    if (document.body.id !== "budgetPage") return;
    if (document.body.dataset.budgetInit) return;
    document.body.dataset.budgetInit = "1";

    state.currency = getCurrency();
    try {
      const saved = localStorage.getItem(LS_MONTH);
      if (saved && /^\d{4}-\d{2}$/.test(saved)) state.month = saved;
    } catch {}

    initFabPortal();
    bindEvents();
    applyBudgetDetailsDefaults();
    renderAll();

    function subscribeBudgetAuth() {
      if (!window.firebase?.auth || state.budgetAuthSubscribed) return;
      state.budgetAuthSubscribed = true;
      firebase.auth().onAuthStateChanged(async user => {
        if (!user) { window.location.replace("login.html"); return; }
        state.uid = user.uid;

        try {
          const profile = await HBIT.getCurrentUserProfile?.();
          const name = profile?.fullName || user.displayName || user.email || "U";
          const av   = $("bgAvatar");
          if (av) av.textContent = name.charAt(0).toUpperCase();
        } catch {}

        await loadBudgetMeta();
        initPlannerModeFromMeta();
        await Promise.all([loadAccounts(), loadEntries(), loadPlan(), loadBills(), loadSavingsGoals(), loadKpiComparison()]);
        state.plannerDraft = { ...state.plan };
        migrateLocalStorage().catch((err) => fbErrRetry(err, () => migrateLocalStorage()));
        state.dataHydrated = true;
        const needsWizard = !state.wizardMeta || state.wizardMeta.completed !== true;
        if (needsWizard) openWizard();
        applyBudgetDetailsDefaults();
        renderAll();
      });
    }

    subscribeBudgetAuth();
    window.addEventListener("load", () => subscribeBudgetAuth(), { once: true });
    window.addEventListener("load", smokeTestBudgetOverlaysHidden, { once: true });
  }

  HBIT.pages        = HBIT.pages || {};
  HBIT.pages.budget = { init };
  HBIT.budget       = HBIT.budget || {};
  HBIT.budget.wizard = { openWizard, skipWizard, finishWizard };
  document.addEventListener("DOMContentLoaded", init);
})();
