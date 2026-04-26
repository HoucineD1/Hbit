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
  const HBIT = (window.HBIT = window.HBIT || {});
  const $    = (id) => document.getElementById(id);
  function budgetPartText(src) {
    const req = new XMLHttpRequest();
    req.open("GET", src, false);
    req.send(null);
    if (req.status < 200 || req.status >= 300) throw new Error("Failed to load " + src);
    return req.responseText;
  }

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

  eval(budgetPartText("js/pages/budget/copy.js").replace("const BUDGET_COPY", "var BUDGET_COPY"));

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

  function computeHealthScore() {
    const income = computeIncome();
    const spent = computeExpenses();
    const saveRate = income > 0 ? ((Math.max(0, income - spent) / income) * 100) : 0;
    const savingsPts = saveRate >= 20 ? 25 : saveRate >= 10 ? 15 : saveRate > 0 ? 5 : 0;

    const planCats = Object.keys(state.plan).filter(k => (Number(state.plan[k]) || 0) > 0);
    const byCat = computeByCategory();
    const okCats = planCats.filter(cid => (byCat[cid] || 0) <= (Number(state.plan[cid]) || 0)).length;
    const adherencePts = planCats.length ? Math.round((okCats / planCats.length) * 25) : 0;

    const paidBills = state.bills.filter(b => Array.isArray(b.paidMonths) && b.paidMonths.includes(state.month)).length;
    const billsPts = state.bills.length ? Math.round((paidBills / state.bills.length) * 20) : 10;

    const goalPts = state.savingsGoals.length ? 10 : 0;
    const debt = computeDebt();
    const debtRatio = income > 0 ? debt / income : (debt > 0 ? Infinity : 0);
    const debtPts = debtRatio === 0 ? 20 : debtRatio <= 0.3 ? 15 : debtRatio <= 0.75 ? 8 : 0;

    return Math.max(0, Math.min(100, Math.round(savingsPts + adherencePts + billsPts + goalPts + debtPts)));
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
      card.className = "hbit-card bg-goal-card";
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
      empty.className = "hbit-empty-state bg-empty bg-empty--goals";
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
    add.className = "hbit-card bg-goal-add-card";
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
  /* Legacy Budget render layer removed in Phase 2; render-modern.js is canonical. */
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
    if (HBIT.components?.openSheet) {
      HBIT.components.openSheet(el);
    } else {
      el.removeAttribute("hidden");
      el.style.removeProperty("visibility");
      el.setAttribute("aria-hidden", "false");
      el.classList.add("open", "is-open");
      document.body.style.overflow = "hidden";
    }
    requestAnimationFrame(() => trapFocus(el));
  }

  function closeOverlay(id) {
    const el = $(id);
    if (!el) return;
    if (HBIT.components?.closeSheet) {
      HBIT.components.closeSheet(el);
    } else {
      el.classList.remove("open", "is-open");
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("hidden", "");
      el.style.removeProperty("visibility");
    }
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

  eval(budgetPartText("js/pages/budget/wizard-goals.js"));

  /* Event delegation
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
  eval(budgetPartText("js/pages/budget/render-modern.js"));

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
