/* =====================================================================
   Hbit — js/pages/budget.js   (v3 — full rebuild)

   Architecture:
   • Accounts   → /users/{uid}/budgetAccounts/{id}
   • Expenses   → /users/{uid}/budgetEntries/{id}  (via HBIT.db)
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
   • Speed-dial FAB (Expense + Bill)
   • Help tour (4 steps)
   • Full i18n
   ===================================================================== */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $    = (id) => document.getElementById(id);

  /* ── Category definitions ─────────────────────────────────────────── */
  const CATEGORIES = [
    { id: "housing",       color: "#818CF8", label: "Housing"       },
    { id: "food",          color: "#34D399", label: "Food"          },
    { id: "transport",     color: "#F59E0B", label: "Transport"     },
    { id: "health",        color: "#F87171", label: "Health"        },
    { id: "entertainment", color: "#A78BFA", label: "Fun"           },
    { id: "subscriptions", color: "#22D3EE", label: "Subscriptions" },
    { id: "shopping",      color: "#FB923C", label: "Shopping"      },
    { id: "education",     color: "#818CF8", label: "Education"     },
    { id: "savings",       color: "#4ADE80", label: "Savings"       },
    { id: "other",         color: "#6B7280", label: "Other"         },
  ];

  const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
  function getCat(id) { return CAT_MAP[id] || CATEGORIES[CATEGORIES.length - 1]; }

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
    { id: "salary",      label: "Salary",  color: "#34D399" },
    { id: "cash",        label: "Cash",    color: "#F59E0B" },
    { id: "credit_card", label: "Credit",  color: "#A78BFA" },
    { id: "debt",        label: "Debt",    color: "#F87171" },
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
    budgetAuthSubscribed: false,
    goalSheetMode:     "create",
    goalEditId:        null,
    goalSelectedColor: "#F59E0B",
    goalDetailId:      null,
    dataHydrated:      false,
    expenseDeleteConfirmId: null,
  };

  const GOAL_COLORS = [
    { hex: "#F59E0B" },
    { hex: "#34D399" },
    { hex: "#818CF8" },
    { hex: "#FB7185" },
    { hex: "#A78BFA" },
    { hex: "#2DD4BF" },
  ];

  function budgetMetaCol() {
    return HBIT.userSubcollectionRef(state.uid, "budgetMeta");
  }
  function savingsGoalsCol() {
    return HBIT.userSubcollectionRef(state.uid, "savingsGoals");
  }

  let acctEditType  = "salary";
  let expEditCat    = "other";
  let billEditCat   = "subscriptions";
  let limitEditCat  = null;
  let acctFlowStep  = 1;
  let billFlowStep  = 1;

  let wizardSlideIndex = 0;
  const wizardAnswers = {
    struggle: null, goals: [], payFrequency: null, mode: null, topCategory: null, level: null, commitment: null,
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

  function showToast(msg) {
    const host = $("bgToastHost");
    if (!host) return;
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

  async function loadBudgetMeta() {
    state.wizardMeta = null;
    state.setupDone = false;
    if (!state.uid) return;
    try {
      const wizSnap = await budgetMetaCol().doc("wizard").get();
      state.wizardMeta = wizSnap.exists ? wizSnap.data() : null;
      const setupSnap = await budgetMetaCol().doc("setup").get();
      state.setupDone = !!(setupSnap.exists && setupSnap.data()?.done);
    } catch (err) {
      /* silent */
    }
  }

  async function saveWizardDoc(data, merge = true) {
    await budgetMetaCol().doc("wizard").set(data, { merge });
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

  function initPlannerModeFromMeta() {
    try {
      const saved = localStorage.getItem(LS_PLANNER);
      if (saved === "track" || saved === "plan") {
        state.plannerMode = saved;
        return;
      }
    } catch {}
    state.plannerMode = state.wizardMeta?.mode === "reactive" ? "track" : "plan";
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
        ? "Set limits per category, then Save plan."
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

  /* ── i18n helper ──────────────────────────────────────────────────── */
  function t(key, fallback, params) {
    try {
      const out = typeof HBIT?.i18n?.t === "function" ? HBIT.i18n.t(key, fallback, params) : null;
      return out != null && out !== "" ? out : (fallback != null ? fallback : key);
    } catch (_) {
      return fallback != null ? fallback : key;
    }
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

  /* ── Firestore — expenses ─────────────────────────────────────────── */
  async function loadEntries() {
    try { state.entries = await HBIT.db.budgetEntries.forMonth(state.month); }
    catch (err) { /* silent */ state.entries = []; }
  }

  async function persistExpense(data) {
    const dateKey = data.dateKey || todayKey();
    const month   = dateKey.slice(0, 7);
    if (data.id) {
      await HBIT.db.budgetEntries.update(data.id, {
        type: "expense", amount: Math.abs(+data.amount || 0),
        category: data.category || "other", description: data.description || "",
        date: dateKey, dateKey, month,
      });
      return data.id;
    } else {
      return await HBIT.db.budgetEntries.add({
        type: "expense", amount: Math.abs(+data.amount || 0),
        category: data.category || "other", description: data.description || "",
        date: dateKey, dateKey, month,
      });
    }
  }

  async function removeExpense(id) { await HBIT.db.budgetEntries.delete(id); }

  /* ── Firestore — budget plan ──────────────────────────────────────── */
  async function loadPlan() {
    try {
      const doc = await HBIT.db.budgetPlan.get(state.month);
      state.plan = doc?.byCategory || {};
    } catch (err) {
      /* silent */
      state.plan = {};
    }
  }

  async function savePlan() {
    try { await HBIT.db.budgetPlan.set(state.month, state.plan); }
    catch (err) { /* silent */ }
  }

  /* ── Firestore — bills ────────────────────────────────────────────── */
  async function loadBills() {
    try { state.bills = await HBIT.db.budgetBills.list(); }
    catch (err) { /* silent */ state.bills = []; }
  }

  async function saveBill(data) {
    if (data.id) {
      await HBIT.db.budgetBills.update(data.id, {
        name: data.name, amount: Math.abs(+data.amount || 0),
        dueDay: +data.dueDay || 1, category: data.category || "subscriptions",
        note: data.note || "",
      });
    } else {
      const newId = await HBIT.db.budgetBills.add({
        name: data.name, amount: Math.abs(+data.amount || 0),
        dueDay: +data.dueDay || 1, category: data.category || "subscriptions",
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
      const incomeTotal   = computeIncome();
      const monthEntries  = state.entries.filter(e =>
        (e.month || (e.dateKey || "").slice(0, 7)) === month && !e._pending
      );
      const expenseTotal  = monthEntries.reduce((s, e) => s + Math.abs(e.amount || 0), 0);
      const byCategory    = {};
      monthEntries.forEach(e => {
        const cat = e.category || "other";
        byCategory[cat] = (byCategory[cat] || 0) + Math.abs(e.amount || 0);
      });
      await HBIT.db.budgetMonths.set(month, {
        incomeTotal, expenseTotal, remaining: incomeTotal - expenseTotal, byCategory,
      });
    } catch (err) { /* silent */ }
  }

  /* ── Computed values ──────────────────────────────────────────────── */
  function computeIncome() {
    return state.accounts
      .filter(a => (a.type === "salary" || a.type === "cash") && (a.balance || 0) > 0)
      .reduce((s, a) => s + (a.balance || 0), 0);
  }

  function computeExpenses() {
    return state.entries.reduce((s, e) => s + Math.abs(e.amount || 0), 0);
  }

  function computeDebt() {
    return state.accounts
      .filter(a => a.type === "debt")
      .reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  }

  function computeNetWorth() {
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
    state.entries.forEach(e => {
      const cat = e.category || "other";
      map[cat] = (map[cat] || 0) + Math.abs(e.amount || 0);
    });
    return map;
  }

  function hasSalaryIncome() {
    return state.accounts.some(a =>
      (a.type === "salary" || a.type === "cash") && (a.balance || 0) > 0
    );
  }

  function hasAnyPlanLimit() {
    return Object.values(state.plan).some(v => Number(v) > 0);
  }

  function setupChecklistStatus() {
    return {
      income:   hasSalaryIncome(),
      plan:     hasAnyPlanLimit(),
      expense:  state.entries.some(e => !e._pending && Math.abs(e.amount || 0) > 0),
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
      { key: "income", done: st.income, label: "Add your income source", action: "account" },
      { key: "plan", done: st.plan, label: "Set your monthly plan", action: "planner" },
      { key: "expense", done: st.expense, label: "Log your first expense", action: "expense" },
      { key: "bill", done: st.bill, label: "Add a recurring bill", action: "bills" },
      { key: "goal", done: st.goal, label: "Create a savings goal", action: "goals" },
    ];
    const doneN = items.filter(i => i.done).length;
    if (doneN >= items.length) {
      saveSetupDone().then(() => { box.style.display = "none"; }).catch(() => {});
      return;
    }
    box.style.display = "";
    setText("bgSetupCount", `${doneN} / ${items.length} done`);
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
        ${alert.link === "setplan" ? `<button type="button" class="bg-alert-link" data-alert-jump="planner">Set it now</button>` : ""}
        ${alert.link === "nextmonth" ? `<button type="button" class="bg-alert-link" data-alert-jump="nextmonth">Start planning</button>` : ""}
        <button type="button" class="bg-alert-dismiss" aria-label="Dismiss alert">×</button>
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
      .filter(e => (e.dateKey || e.date || "") === today && !e._pending)
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
      tx.textContent = `💚 ${fmtMoney(left)} left today`;
      chip.classList.remove("bg-daily-chip--bad", "bg-daily-chip--mid");
      chip.classList.add(left / dailyBase > 0.35 ? "bg-daily-chip--ok" : "bg-daily-chip--mid");
      bar.style.background = left / dailyBase > 0.35 ? "#34D399" : "#FBBF24";
    } else {
      tx.textContent = `🔴 ${fmtMoney(Math.abs(left))} over today`;
      chip.classList.remove("bg-daily-chip--ok", "bg-daily-chip--mid");
      chip.classList.add("bg-daily-chip--bad");
      bar.style.background = "#F87171";
    }
  }

  function goalStatusLabel(g) {
    const end = new Date((g.targetDate || "").slice(0, 10) + "T12:00:00");
    if (Number.isNaN(end.getTime())) return { text: "—", cls: "" };
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    if (end < today) return { text: "Past due", cls: "past" };
    const monthsLeft = Math.max(1, monthsBetweenDates(today, end));
    const tgt = Number(g.targetAmount) || 0;
    const saved = Number(g.savedAmount) || 0;
    const need = tgt - saved;
    const neededPerMo = need / monthsLeft;
    const mt = g.monthlyTarget != null && g.monthlyTarget !== "" ? Number(g.monthlyTarget) : null;
    if (mt != null && Number.isFinite(mt)) {
      const on = mt + 1e-6 >= neededPerMo;
      return { text: on ? "On track ✓" : "Behind ⚠️", cls: on ? "on" : "behind" };
    }
    return { text: "Set monthly target", cls: "" };
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
      card.style.setProperty("--goal-accent", g.color || "#F59E0B");
      card.dataset.goalId = g.id;
      card.setAttribute("role", "listitem");
      card.innerHTML = `
        <div class="bg-goal-card-name"><span class="bg-goal-card-dot" style="background:${escHtml(g.color || "#F59E0B")}"></span>${escHtml(g.name || "Goal")}</div>
        <div class="bg-goal-card-amt">${fmtMoney(saved)} saved of ${fmtMoney(tgt)}</div>
        <div class="bg-goal-card-bar"><div class="bg-goal-card-bar-fill" style="width:${pct.toFixed(1)}%;background:${escHtml(g.color || "#F59E0B")}"></div></div>
        <div class="bg-goal-card-meta">${pct.toFixed(0)}% · By ${escHtml(endStr)}${mt ? ` · +${escHtml(mt)} to stay on track` : ""}</div>
        <div class="bg-goal-card-status ${st.cls}">${escHtml(st.text)}</div>`;
      row.appendChild(card);
    });
    const add = document.createElement("button");
    add.type = "button";
    add.className = "bg-goal-add-card";
    add.id = "bgGoalAddCard";
    add.textContent = "+ New Goal";
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
    let bars = "";
    for (let d = 1; d <= lastDay; d++) {
      const info = byDayNum[d];
      const pct = Math.round((info.sum / maxSpent) * 100);
      const dkFull = `${prefix}${String(d).padStart(2, "0")}`;
      const tip = `${dkFull} · ${fmtMoney(info.sum)} · ${info.n} transaction${info.n === 1 ? "" : "s"}`;
      const showLbl = d === 1 || d === lastDay || d % 5 === 0;
      bars += `<div class="bg-activity-bar-col" title="${escHtml(tip)}">
        <div class="bg-activity-bar-fill-wrap" aria-hidden="true">
          <div class="bg-activity-bar-fill" style="height:${pct}%"></div>
        </div>
        <span class="bg-activity-bar-day${showLbl ? " bg-activity-bar-day--show" : ""}">${d}</span>
      </div>`;
    }
    wrap.innerHTML = `
      <div class="bg-activity-chart" role="region" aria-label="Daily spending ${escHtml(monthTitle)}">
        <div class="bg-activity-chart-head">
          <span class="bg-activity-chart-title">Daily spending</span>
          <span class="bg-activity-chart-sub">${escHtml(monthTitle)}</span>
        </div>
        <div class="bg-activity-chart-scroll">
          <div class="bg-activity-chart-bars" role="list">${bars}</div>
        </div>
      </div>`;
  }

  /* ── Full re-render ───────────────────────────────────────────────── */
  function renderAll() {
    renderHeader();
    renderKpis();
    renderSetupChecklist();
    renderSmartAlerts();
    renderGoalsSection();
    renderOverviewDonut();
    renderBudgetPlanner();
    renderBills();
    renderAccounts();
    renderActivityCalendar();
    renderPieChart();
    renderEntries();
    renderDailyAllowanceChip();
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

    const prevMonth = monthShift(state.month, -1);
    const prevExpenses = state.entries
      .filter((e) => (e.month || "").slice(0, 7) === prevMonth)
      .reduce((s, e) => s + Math.abs(Number(e.amount) || 0), 0);
    const prevIncome = income;
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
      trendIncomeEl.className = "bg-kpi-trend bg-kpi-trend--neutral";
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
      { frac: spent / total,     color: "#F59E0B" },
      { frac: remaining / total, color: "#818CF8" },
      { frac: debt / total,      color: "#F87171" },
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
    const hole = `<circle cx="${CX}" cy="${CY}" r="${R - SW / 2 - 2}" fill="var(--panel,#17171e)"/>`;
    const centerAmt   = fmtMoney(income);
    const centerLabel = income > 0 ? "income" : "—";
    const textEls = `
      <text x="${CX}" y="${CY - 4}" text-anchor="middle" font-size="11" font-weight="800"
            fill="var(--text,#f2f2f5)" font-family="system-ui,-apple-system,sans-serif">${escHtml(centerAmt)}</text>
      <text x="${CX}" y="${CY + 10}" text-anchor="middle" font-size="8" font-weight="600"
            fill="var(--muted,#a0a0aa)" font-family="system-ui,-apple-system,sans-serif">${centerLabel}</text>`;

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
            <div class="bg-planner-icon" style="background:${row.color}22;color:${row.color}">${catIconSvg(row.id, 20)}</div>
            <div class="bg-planner-plan-head">
              <div class="bg-planner-name">${escHtml(row.label)}</div>
              <div class="bg-planner-plan-field">
                <label class="bg-planner-plan-lbl" for="planInp-${row.id}">Monthly limit</label>
                <input id="planInp-${row.id}" class="bg-planner-plan-input" type="number" min="0" step="1" data-plan-cat="${row.id}"
                       value="${escHtml(val)}" placeholder="0" aria-label="Limit for ${escHtml(row.label)}" />
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
        let barColor = "#6B7280";
        if (hasLimit) {
          if (over) barColor = "#F87171";
          else if (warn) barColor = "#FBBF24";
          else barColor = "#F59E0B";
        } else if (row.spent > 0) {
          barColor = "#F59E0B";
        }
        const barWidth = hasLimit
          ? `${Math.min(displayPct, 100)}%`
          : `${Math.min((row.spent / Math.max(computeExpenses(), 1)) * 100, 100)}%`;
        const animClass = state.plannerInView ? "bg-planner-anim" : "";
        return `
        <div class="bg-planner-row bg-planner-row--track${hasLimit ? "" : " bg-planner-row--nolimit"}" data-cat="${row.id}" data-mode="track" data-has-limit="${hasLimit ? "1" : "0"}" role="listitem" tabindex="0"
             aria-label="Budget ${escHtml(row.label)}">
          <div class="bg-planner-icon" style="background:${row.color}22;color:${row.color}">${catIconSvg(row.id, 20)}</div>
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
                ${!hasLimit ? `<button type="button" class="bg-planner-set-limit" data-set-plan-cat="${row.id}">+ Set limit</button>` : ""}
              </span>
              ${hasLimit ? `<span class="bg-planner-pct">${Math.round(Math.min((row.spent / row.limit) * 100, 999))}%</span>` : ""}
              ${over ? `<span class="bg-planner-over-badge">OVER</span>` : ""}
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
      list.innerHTML = rowsHtml;
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
  function renderBills() {
    const list    = $("billsList");
    const emptyEl = $("billsEmpty");
    if (!list) return;

    const today = todayDay();

    if (state.bills.length === 0) {
      list.innerHTML = "";
      list.style.display = "none";
      if (emptyEl) emptyEl.style.display = "";
      return;
    }

    list.style.display = "";
    if (emptyEl) emptyEl.style.display = "none";

    /* Sort: unpaid overdue → unpaid upcoming → unpaid rest → paid */
    const sorted = [...state.bills].sort((a, b) => {
      const aStatus = billStatus(a, today);
      const bStatus = billStatus(b, today);
      const order = { overdue: 0, upcoming: 1, unpaid: 2, paid: 3 };
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
        <div class="bg-bill-card ${isPaid ? "paid" : ""}" data-bill-id="${bill.id}" role="listitem">
          <span class="bg-bill-status ${status}" aria-hidden="true"></span>
          <div class="bg-bill-icon" style="background:${cat.color}22;color:${cat.color}">${catIconSvg(cat.id, 18)}</div>
          <div class="bg-bill-info">
            <div class="bg-bill-name">${escHtml(bill.name)}</div>
            <div class="bg-bill-meta">
              <span class="bg-bill-due ${status === "overdue" ? "overdue" : status === "upcoming" ? "upcoming" : ""}">${escHtml(dueTxt)}</span>
              <span class="bg-bill-cat-tag">${escHtml(cat.label)}</span>
            </div>
          </div>
          <div class="bg-bill-right">
            <div class="bg-bill-amount">${fmtMoney(bill.amount)}</div>
            <button class="bg-bill-pay-btn ${isPaid ? "paid-state" : "unpaid"}"
                    data-pay="${bill.id}" type="button">
              ${isPaid ? t("budget.bills.paid") : t("budget.bills.markPaid")}
            </button>
          </div>
          <button class="bg-bill-edit-btn" data-edit-bill="${bill.id}" type="button" aria-label="Edit bill">
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
        <p class="bg-accounts-hint-text">No accounts yet. Add your first account to start tracking your budget.</p>
        <button class="bg-btn-primary" id="btnAddAccountHint" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add account
        </button>`;
      list.appendChild(hint);
      return;
    }

    state.accounts.forEach(acct => {
      const t2   = getAcctType(acct.type);
      const slug = acct.type === "credit_card" ? "credit" : acct.type;
      const accentByType = {
        salary: "var(--habit, #34D399)",
        cash: "var(--budget, #F59E0B)",
        credit: "var(--sleep, #818CF8)",
        debt: "var(--brand, #E63946)",
      };
      const accent = accentByType[slug] || "var(--bgt-accent)";
      const card = document.createElement("div");
      card.className = "bg-account-card";
      card.style.setProperty("--acct-accent", accent);
      card.setAttribute("role", "listitem");

      /* Credit utilization bar */
      let utilBar = "";
      if (acct.type === "credit_card" && acct.limit) {
        const used    = Math.abs(acct.balance || 0);
        const pct     = Math.min((used / acct.limit) * 100, 100);
        const barColor = pct >= 80 ? "#F87171" : pct >= 50 ? "#FB923C" : "#A78BFA";
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
                aria-label="Edit ${escHtml(acct.name)}">
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
    addCard.setAttribute("aria-label", "Add account");
    addCard.innerHTML  = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Add account</span>`;
    list.appendChild(addCard);
  }

  /* ── SVG Donut pie chart ──────────────────────────────────────────── */
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
        opacity="${dim}" data-cat="${s.id}" class="bg-pie-slice"
        style="cursor:pointer;transition:opacity .2s,stroke-dasharray .5s cubic-bezier(.34,1.56,.64,1);"/>`;
    }).join("");

    const focused = state.focusedCat ? slices.find(s => s.id === state.focusedCat) : null;
    const cAmt    = fmtMoney(focused ? focused.amount : total);
    const cLabel  = escHtml(focused ? focused.label : "total");
    const cPct    = focused ? `${Math.round(focused.frac * 100)}%` : "";
    const hole    = `<circle cx="${CX}" cy="${CY}" r="${R - SW / 2 - 2}" fill="var(--panel,#17171e)"/>`;
    const cy1 = focused ? CY - 11 : CY - 5;
    const cy2 = focused ? CY + 5  : CY + 10;
    const cy3 = CY + 19;
    const textEls = `
      <text x="${CX}" y="${cy1}" text-anchor="middle" font-size="12" font-weight="800"
            fill="var(--text,#f2f2f5)" font-family="system-ui,-apple-system,sans-serif">${cAmt}</text>
      <text x="${CX}" y="${cy2}" text-anchor="middle" font-size="9" font-weight="600"
            fill="var(--muted,#a0a0aa)" font-family="system-ui,-apple-system,sans-serif">${cLabel}</text>
      ${focused ? `<text x="${CX}" y="${cy3}" text-anchor="middle" font-size="8" font-weight="700"
            fill="var(--muted,#a0a0aa)" font-family="system-ui,-apple-system,sans-serif">${cPct}</text>` : ""}`;

    const pieSVG = $("pieSVG");
    if (pieSVG) pieSVG.innerHTML = `<g>${track}${sliceEls}</g>${hole}${textEls}`;

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
      if (!q) return true;
      const cat = getCat(e.category);
      return (
        (e.description || "").toLowerCase().includes(q) ||
        cat.label.toLowerCase().includes(q)
      );
    });

    if (state.expenseDeleteConfirmId && !filtered.some(e => e.id === state.expenseDeleteConfirmId)) {
      state.expenseDeleteConfirmId = null;
    }

    const sorted = [...filtered].sort((a, b) =>
      (b.dateKey || b.date || "").localeCompare(a.dateKey || a.date || "")
    );

    if (sorted.length === 0) {
      list.style.display = "none";
      if (badge)   badge.textContent   = "";
      if (emptyEl) emptyEl.style.display = "";
      return;
    }

    list.style.display = "";
    if (badge)   badge.textContent    = String(state.entries.length);
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

  function renderEntryCard(e) {
    const cat = getCat(e.category);
    const confirming = state.expenseDeleteConfirmId === e.id;
    const rightBlock = confirming
      ? `<div class="bg-entry-del-confirm" role="group" aria-label="${escHtml(t("budget.delete.confirm", "Delete this expense?"))}">
           <span class="bg-entry-del-msg">${escHtml(t("budget.delete.confirm", "Delete this expense?"))}</span>
           <button type="button" class="bg-entry-del-yes" data-action="confirm-exp-del" data-id="${e.id}">${escHtml(t("common.confirm", "Confirm"))}</button>
           <button type="button" class="bg-entry-del-no" data-action="cancel-exp-del" data-id="${e.id}">${escHtml(t("common.cancel", "Cancel"))}</button>
         </div>`
      : `<div class="bg-entry-amt" style="color:${cat.color}">&minus;${fmtMoney(Math.abs(e.amount))}</div>
          <button class="bg-entry-del" data-action="start-exp-del" data-id="${e.id}" type="button" aria-label="${escHtml(t("budget.delete.aria", "Delete expense"))}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>`;
    const swipeLabel = confirming
      ? escHtml(t("common.confirm", "Confirm"))
      : escHtml(t("budget.delete.short", "Delete"));
    return `
      <div class="bg-entry-card" data-id="${e.id}"
           ${e._pending ? 'data-pending="true"' : ""} role="listitem">
        <div class="bg-entry-icon" style="background:${cat.color}22;color:${cat.color}" aria-hidden="true">${catIconSvg(cat.id, 18)}</div>
        <div class="bg-entry-info">
          <div class="bg-entry-desc">${escHtml(e.description || cat.label)}</div>
          <div class="bg-entry-meta">
            <span class="bg-entry-cat">${escHtml(cat.label)}</span>
          </div>
        </div>
        <div class="bg-entry-right">
          ${rightBlock}
        </div>
        <div class="bg-entry-swipe-del" data-action="${confirming ? "confirm-exp-del" : "start-exp-del"}" data-del="${e.id}">${swipeLabel}</div>
      </div>`;
  }

  /* ── Touch swipe-to-delete ────────────────────────────────────────── */
  function bindEntrySwipe() {
    const list = $("entriesList");
    if (!list) return;
    list.querySelectorAll(".bg-entry-card").forEach(card => {
      let startX = 0, startY = 0, moved = false;
      card.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moved  = false;
        card.style.transition = "none";
      }, { passive: true });
      card.addEventListener("touchmove", e => {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (!moved && Math.abs(dy) > Math.abs(dx)) return;
        moved = true;
        if (dx > 0) { card.style.transform = ""; return; }
        card.style.transform = `translateX(${Math.max(-80, dx)}px)`;
        e.preventDefault();
      }, { passive: false });
      card.addEventListener("touchend", () => {
        card.style.transition = "";
        const cur = parseFloat(card.style.transform.replace("translateX(", "") || "0");
        if (cur <= -55) { card.classList.add("swiped"); card.style.transform = "translateX(-80px)"; }
        else { card.classList.remove("swiped"); card.style.transform = ""; }
      });
    });
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

    if (editing) {
      bType.style.display = "";
      bDet.style.display = "";
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

    if (addMode && acctFlowStep === 1) {
      bType.style.display = "";
      bDet.style.display = "none";
      if (foot) foot.style.display = "flex";
      if (prog) prog.textContent = flowStepLabel(1, 2);
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
      if (prog) prog.textContent = flowStepLabel(2, 2);
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
      isDebt ? t("budget.sheet.balanceOwed") : isCredit ? t("budget.sheet.balanceCurrent") : t("budget.sheet.balance");
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
      updateBudgetMonthAggregate(state.month).catch(() => {});
    } catch (err) {
      /* silent */
      const code = err?.code || "";
      const detail = err?.message || "Save failed";
      const short = code === "permission-denied"
        ? "Permission denied — sign in and try again"
        : (code ? `${code}: ` : "") + detail;
      const btnMsg = short.length > 52 ? short.slice(0, 49) + "…" : short;
      showSheetError("acctSave", btnMsg);
      showToast(short.length > 120 ? short.slice(0, 117) + "…" : short);
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
      updateBudgetMonthAggregate(state.month).catch(() => {});
    } catch (err) {
      /* silent */
      const code = err?.code || "";
      const msg = code === "permission-denied" ? "Permission denied" : (code ? `${code}: ` : "") + (err?.message || "Error");
      showSheetError("acctDelete", msg.length > 52 ? msg.slice(0, 49) + "…" : msg);
      showToast(msg.length > 120 ? msg.slice(0, 117) + "…" : msg);
    } finally {
      clearBodyScrollUnlessOverlayOpen();
      setBusy("acctDelete", false, t("budget.sheet.deleteAccount"));
    }
  }

  /* ════════════════════════════════════════════════════════════
     EXPENSE SHEET
     ════════════════════════════════════════════════════════════ */
  function openExpenseSheet(expense) {
    state.sheet = { type: "expense", data: expense || null };
    expEditCat  = expense?.category || "other";
    setText("expTitle", expense ? t("budget.sheet.editExpense") : t("budget.sheet.addExpense"));
    setVal("expAmount", expense ? String(expense.amount) : "");
    setVal("expDesc",   expense?.description ?? "");
    setVal("expDate",   expense?.dateKey || expense?.date || todayKey());
    renderCatGrid(expEditCat, "catGrid", val => { expEditCat = val; });
    const del = $("expDelete");
    if (del) del.style.display = expense ? "" : "none";
    const sym = $("expCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    closeFab();
    openOverlay("expOverlay");
    setTimeout(() => $("expAmount")?.focus?.(), 380);
  }

  function renderCatGrid(sel, gridId, onSelect) {
    const grid = $(gridId);
    if (!grid) return;
    grid.innerHTML = CATEGORIES.map(c => `
      <button class="bg-cat-chip${c.id === sel ? " active" : ""}"
              data-cat-id="${c.id}" data-grid="${gridId}" type="button"
              style="--cat-color:${c.color}">
        <span class="bg-cat-icon">${catIconSvg(c.id, 18)}</span>
        <span class="bg-cat-name">${escHtml(c.label)}</span>
      </button>`).join("");
  }

  async function submitExpense() {
    const rawAmount = parseFloat($("expAmount")?.value);
    if (!rawAmount || rawAmount <= 0) { flashError("expAmount"); return; }
    const amount  = Math.abs(rawAmount);
    const desc    = ($("expDesc")?.value  || "").trim();
    const dateKey = $("expDate")?.value   || todayKey();
    const month   = dateKey.slice(0, 7);
    const cat     = expEditCat;
    const editId  = state.sheet.data?.id || null;

    closeOverlay("expOverlay");

    const TEMP_ID    = editId || ("tmp_" + Date.now());
    const localEntry = { id: TEMP_ID, type: "expense", amount, category: cat, description: desc, dateKey, date: dateKey, month, _pending: true };
    const prev       = [...state.entries];

    if (editId) state.entries = state.entries.map(e => e.id === editId ? localEntry : e);
    else        state.entries = [...state.entries, localEntry];
    renderAll();

    try {
      const realId = await persistExpense({ id: editId, amount, category: cat, description: desc, dateKey });
      state.allEntriesCache = null;
      state.entries = state.entries.map(e => e.id === TEMP_ID ? { ...e, id: realId, _pending: false } : e);
      renderAll();
      updateBudgetMonthAggregate(month).catch(() => {});
    } catch (err) {
      /* silent */
      state.entries = prev;
      renderAll();
      openExpenseSheet({ id: editId, amount, category: cat, description: desc, dateKey });
      showSheetError("expSave", "Save failed — check connection");
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
      await removeExpense(id);
      state.allEntriesCache = null;
      updateBudgetMonthAggregate(state.month).catch(() => {});
    } catch (err) {
      /* silent */
      if (removed) state.entries = [...state.entries, removed];
      renderAll();
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
    billEditCat = bill?.category || "subscriptions";
    setText("billTitle", bill ? t("budget.sheet.editBill") : t("budget.sheet.addBill"));
    setVal("billAmount", bill ? String(bill.amount) : "");
    setVal("billName",   bill?.name    ?? "");
    setVal("billDueDay", bill?.dueDay  ?? "");
    setVal("billNote",   bill?.note    ?? "");
    renderCatGrid(billEditCat, "billCatGrid", val => { billEditCat = val; });
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
      await saveBill({ id: editId, name, amount, dueDay, category: billEditCat, note });
      closeOverlay("billOverlay");
      await loadBills();
      renderAll();
    } catch (err) {
      /* silent */
      showSheetError("billSave", "Save failed — retry");
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
      /* silent */
      showSheetError("billDelete", "Error — retry");
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
    savePlan().catch(() => {});
    renderSetupChecklist();
    renderSmartAlerts();
  }

  async function removeLimit() {
    delete state.plan[limitEditCat];
    state.plannerDraft = { ...state.plan };
    closeOverlay("limitOverlay");
    renderBudgetPlanner();
    savePlan().catch(() => {});
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
  const BUDGET_OVERLAY_IDS = ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay", "goalOverlay", "goalDetailOverlay", "helpOverlay"];

  function clearBodyScrollUnlessOverlayOpen() {
    const anyOpen = BUDGET_OVERLAY_IDS.some(oid => $(oid)?.classList.contains("open"));
    if (!anyOpen) document.body.style.overflow = "";
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
    el.style.display = "flex";          // 1. Force display:flex so transition can play
    el.style.removeProperty("visibility");
    void el.offsetWidth;                // 2. Force reflow — allows opacity 0→1 transition
    el.setAttribute("aria-hidden", "false");
    el.classList.add("open");           // 3. Triggers CSS opacity transition
    document.body.style.overflow = "hidden";
  }

  function closeOverlay(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove("open");        // Triggers opacity 1→0 transition
    el.setAttribute("aria-hidden", "true");
    el.style.removeProperty("visibility");
    // Hide after transition completes
    const onEnd = (e) => {
      if (e.target !== el) return;
      if (!el.classList.contains("open")) {
        el.style.display = "none";
      }
      el.removeEventListener("transitionend", onEnd);
    };
    el.addEventListener("transitionend", onEnd);
    // Fallback in case transitionend doesn't fire
    setTimeout(() => {
      if (!el.classList.contains("open")) {
        el.style.display = "none";
      }
      el.removeEventListener("transitionend", onEnd);
    }, 350);
    clearBodyScrollUnlessOverlayOpen();
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
    const colors = ["#F59E0B", "#34D399", "#818CF8", "#FB7185", "#ffffff"];
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

    if (n === 0) {
      slide.innerHTML = `
        <div class="bg-wiz-welcome-icon" aria-hidden="true">${svgIconLucide(`<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`, 40)}</div>
        <h2 class="bg-wiz-title">Build your money system in 60 seconds</h2>
        <p class="bg-wiz-sub">Answer 8 quick questions and Hbit will personalize your budget flow.</p>`;
    } else if (n === 1) {
      const opts = [
        { id: "spend_track", t: "I lose track of spending", d: "I want clear visibility every week" },
        { id: "save", t: "Saving feels impossible", d: "I end the month with little left" },
        { id: "debt", t: "Debt creates pressure", d: "Cards or loans are hard to control" },
        { id: "avoid", t: "I avoid checking finances", d: "I need a simpler, lower-stress flow" },
        { id: "insight", t: "I need better insights", d: "I track already, but want smarter guidance" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">What is your main money challenge right now?</h2>
        ${opts.map((o, i) => `
          <button type="button" class="bg-wiz-option${wizardAnswers.struggle === o.id ? " selected" : ""}" data-struggle="${o.id}" style="--i:${i}">
            <svg class="bg-wiz-check-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
            <span class="bg-wiz-option-lead">${svgIconLucide(WIZ_STRUGGLE_INNER[o.id] || WIZ_STRUGGLE_INNER.insight, 22)}</span>
            <span><span class="bg-wiz-option-label">${escHtml(o.t)}</span><span class="bg-wiz-option-desc">${escHtml(o.d)}</span></span>
          </button>`).join("")}`;
    } else if (n === 2) {
      const opts = [
        { id: "save_more", t: "Save more each month" },
        { id: "debt_pay", t: "Pay off debt faster" },
        { id: "know", t: "Know where my money goes" },
        { id: "big", t: "Save for a big purchase" },
        { id: "impulse", t: "Stop impulse spending" },
        { id: "emergency", t: "Build an emergency fund" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">What outcomes matter most? Pick up to 3.</h2>
        <div class="bg-wiz-goals-grid">
        ${opts.map((o, i) => `
          <button type="button" class="bg-wiz-goal-chip${wizardAnswers.goals.includes(o.id) ? " selected" : ""}" data-goal="${o.id}" style="--i:${i}">${svgIconLucide(WIZ_GOAL_INNER, 16)}<span>${escHtml(o.t)}</span></button>`).join("")}
        </div>`;
    } else if (n === 3) {
      slide.innerHTML = `<h2 class="bg-wiz-title">How often do you receive income?</h2>
        <div class="bg-wiz-pay-row">
          ${["weekly", "biweekly", "monthly"].map((id, i) => {
            const labels = { weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly" };
            return `<button type="button" class="bg-wiz-pay-chip${wizardAnswers.payFrequency === id ? " selected" : ""}" data-payf="${id}" style="--i:${i}">${labels[id]}</button>`;
          }).join("")}
        </div>`;
    } else if (n === 4) {
      slide.innerHTML = `<h2 class="bg-wiz-title">Choose your budgeting style</h2>
        <div class="bg-wiz-mode-row">
          <button type="button" class="bg-wiz-mode-card${wizardAnswers.mode === "plan" ? " selected" : ""}" data-mode="plan">
            <span class="bg-wiz-mode-ico">${svgIconLucide(WIZ_MODE_INNER.plan, 24)}</span>
            <span class="bg-wiz-option-label">Plan</span><span class="bg-wiz-option-desc">Set category limits upfront and follow a clear monthly plan.</span>
          </button>
          <button type="button" class="bg-wiz-mode-card${wizardAnswers.mode === "reactive" ? " selected" : ""}" data-mode="reactive">
            <span class="bg-wiz-mode-ico">${svgIconLucide(WIZ_MODE_INNER.track, 24)}</span>
            <span class="bg-wiz-option-label">Track</span><span class="bg-wiz-option-desc">Log expenses as you go and adjust in real time.</span>
          </button>
        </div>`;
    } else if (n === 5) {
      slide.innerHTML = `<h2 class="bg-wiz-title">Which category is your biggest focus?</h2>
        <div class="bg-wiz-cat-scroll">
          ${CATEGORIES.map((c, i) => `
            <button type="button" class="bg-wiz-cat-chip${wizardAnswers.topCategory === c.id ? " selected" : ""}" data-topcat="${c.id}" style="--i:${i}">${catIconSvg(c.id, 16)}<span>${escHtml(c.label)}</span></button>`).join("")}
        </div>`;
    } else if (n === 6) {
      const lv = [
        { id: "beginner", t: "Beginner", d: "Just getting started" },
        { id: "intermediate", t: "Intermediate", d: "I track sometimes" },
        { id: "advanced", t: "Advanced", d: "I know my numbers" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">What is your budgeting level?</h2>
        <div class="bg-wiz-level-row">
          ${lv.map((o, i) => `
            <button type="button" class="bg-wiz-level-card${wizardAnswers.level === o.id ? " selected" : ""}" data-level="${o.id}" style="--i:${i}">
              <span class="bg-wiz-level-ico">${svgIconLucide(WIZ_LEVEL_INNER[o.id] || WIZ_LEVEL_INNER.beginner, 22)}</span>
              <span class="bg-wiz-option-label">${escHtml(o.t)}</span><span class="bg-wiz-option-desc">${escHtml(o.d)}</span>
            </button>`).join("")}
        </div>`;
    } else {
      const cm = [
        { id: "allin", t: "Daily", d: "I want strong momentum and daily check-ins" },
        { id: "mod", t: "Weekly", d: "A balanced rhythm with weekly review prompts" },
        { id: "casual", t: "Flexible", d: "Light guidance and simple tracking only" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">How often should Hbit check in with you?</h2>
        ${cm.map((o, i) => `
          <button type="button" class="bg-wiz-commit-card${wizardAnswers.commitment === o.id ? " selected" : ""}" data-commit="${o.id}" style="--i:${i}">
            <span class="bg-wiz-commit-ico">${svgIconLucide(WIZ_COMMIT_INNER[o.id] || WIZ_COMMIT_INNER.mod, 22)}</span>
            <span class="bg-wiz-commit-text">
              <span class="bg-wiz-option-label">${escHtml(o.t)}</span>
              <span class="bg-wiz-option-desc">${escHtml(o.d)}</span>
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
    if (pr) pr.style.width = `${((n + 1) / 8) * 100}%`;
    setText("bgWizCounter", `${n + 1} / 8`);
    const back = $("bgWizBack");
    if (back) back.style.visibility = n === 0 ? "hidden" : "visible";
    const next = $("bgWizNext");
    if (next) next.textContent = n === 7 ? "Let's go ✓" : "Next →";
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
      struggle: null, goals: [], payFrequency: null, mode: null, topCategory: null, level: null, commitment: null,
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
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, true);
      state.wizardMeta = { ...state.wizardMeta, completed: true };
      fadeOutWizardThen(() => {
        renderSetupChecklist();
        showToast("Skipped — you can always revisit settings later.");
      });
    } catch (err) {
      /* silent */
      showToast(`Could not save: ${err?.code || err?.message || "error"}`);
    }
  }

  async function finishWizard() {
    const card = $("bgWizardCard");
    try {
      await saveWizardDoc({
        completed: true,
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        struggle: wizardAnswers.struggle,
        goals: wizardAnswers.goals,
        payFrequency: wizardAnswers.payFrequency,
        mode: wizardAnswers.mode,
        topCategory: wizardAnswers.topCategory,
        level: wizardAnswers.level,
        commitment: wizardAnswers.commitment,
      }, true);
    } catch (err) {
      /* silent */
      showToast(`Could not save: ${err?.code || err?.message || "error"}`);
      return;
    }
    spawnWizardConfetti(card);
    state.wizardMeta = {
      completed: true,
      mode: wizardAnswers.mode,
    };
    initPlannerModeFromMeta();
    fadeOutWizardThen(() => {
      renderAll();
      showToast("You're all set! Let's build your budget. 🎉");
    });
  }

  function wizardValidate(n) {
    if (n === 1 && !wizardAnswers.struggle) return false;
    if (n === 2 && wizardAnswers.goals.length === 0) return false;
    if (n === 3 && !wizardAnswers.payFrequency) return false;
    if (n === 4 && !wizardAnswers.mode) return false;
    if (n === 5 && !wizardAnswers.topCategory) return false;
    if (n === 6 && !wizardAnswers.level) return false;
    if (n === 7 && !wizardAnswers.commitment) return false;
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
    if (wizardSlideIndex >= 7) {
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
    const str = e.target.closest("[data-struggle]");
    if (str) {
      wizardAnswers.struggle = str.dataset.struggle;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    const g = e.target.closest("[data-goal]");
    if (g) {
      const id = g.dataset.goal;
      const i = wizardAnswers.goals.indexOf(id);
      if (i >= 0) wizardAnswers.goals.splice(i, 1);
      else if (wizardAnswers.goals.length < 3) wizardAnswers.goals.push(id);
      else {
        const grid = g.closest(".bg-wiz-goals-grid");
        if (grid) { grid.classList.add("bg-shake"); setTimeout(() => grid.classList.remove("bg-shake"), 400); }
      }
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    const pf = e.target.closest("[data-payf]");
    if (pf) {
      wizardAnswers.payFrequency = pf.dataset.payf;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    const md = e.target.closest("[data-mode]");
    if (md) {
      wizardAnswers.mode = md.dataset.mode;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    const tc = e.target.closest("[data-topcat]");
    if (tc) {
      wizardAnswers.topCategory = tc.dataset.topcat;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    const lv = e.target.closest("[data-level]");
    if (lv) {
      wizardAnswers.level = lv.dataset.level;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
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
    const income = computeIncome();
    const spentArr = [];
    for (const m of months) {
      try {
        const entries = await HBIT.db.budgetEntries.forMonth(m.ym);
        const sum = entries.reduce((s, e) => s + Math.abs(e.amount || 0), 0);
        spentArr.push(sum);
      } catch { spentArr.push(0); }
    }
    state.trendData = { months, income, spent: spentArr };
    state.trendLoaded = true;
    state.trendLoading = false;
    if (sk) sk.style.display = "none";
    if (wrap) {
      wrap.style.display = "";
      wrap.innerHTML = buildTrendSvg(months, income, spentArr);
    }
  }

  function buildTrendSvg(months, income, spentArr) {
    const W = 320;
    const H = 200;
    const padL = 36;
    const padB = 28;
    const padT = 16;
    const bw = 14;
    const gap = 8;
    const savings = months.map((_, i) => income - (spentArr[i] || 0));
    const maxVal = Math.max(income, ...spentArr, ...savings.map(s => Math.max(0, s)), 1);
    const chartW = W - padL - 12;
    const chartH = H - padT - padB;
    const groupW = chartW / 6;

    let bars = "";
    let linePts = "";
    months.forEach((m, i) => {
      const cx = padL + i * groupW + groupW / 2;
      const hInc = (income / maxVal) * chartH;
      const hSp = ((spentArr[i] || 0) / maxVal) * chartH;
      const x1 = cx - bw - gap / 2;
      const x2 = cx + gap / 2;
      const delayInc = i * 160;
      const delaySp = i * 160 + 80;
      bars += `<rect class="bg-trend-bar" x="${x1}" y="${padT + chartH - hInc}" width="${bw}" height="${hInc}" fill="#34D399" rx="2" style="animation-delay:${delayInc}ms"/>`;
      bars += `<rect class="bg-trend-bar" x="${x2}" y="${padT + chartH - hSp}" width="${bw}" height="${hSp}" fill="#F59E0B" rx="2" style="animation-delay:${delaySp}ms"/>`;
      const sv = Math.max(0, savings[i]);
      const sy = padT + chartH - (sv / maxVal) * chartH;
      const sx = cx;
      linePts += (i === 0 ? "M" : "L") + `${sx},${sy} `;
    });

    const tooltipId = "bgTrendTip";
    let svg = `<svg class="bg-trend-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="Spending trend chart">`;
    svg += bars;
    svg += `<path d="${linePts.trim()}" fill="none" stroke="#818CF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    months.forEach((m, i) => {
      const cx = padL + i * groupW + groupW / 2;
      const tip = `${m.label} · Income ${fmtMoney(income)} · Spent ${fmtMoney(spentArr[i] || 0)} · Saved ${fmtMoney(savings[i])}`;
      svg += `<rect x="${padL + i * groupW}" y="${padT}" width="${groupW}" height="${chartH}" fill="transparent" class="bg-trend-hit" data-tip="${escHtml(tip)}" data-i="${i}"/>`;
      svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#a0a0aa" font-family="system-ui,sans-serif">${escHtml(m.label)}</text>`;
    });
    svg += `</svg><div class="bg-trend-tooltip" id="${tooltipId}"></div>`;

    setTimeout(() => {
      const host = $("bgTrendChartWrap");
      const tip = $("bgTrendTip");
      if (!host || !tip) return;
      host.querySelectorAll(".bg-trend-hit").forEach(h => {
        h.addEventListener("mouseenter", ev => {
          tip.textContent = h.dataset.tip || "";
          tip.style.display = "block";
          const r = h.getBoundingClientRect();
          const hr = host.getBoundingClientRect();
          tip.style.left = `${r.left - hr.left + r.width / 2 - tip.offsetWidth / 2}px`;
          tip.style.top = `${r.top - hr.top - tip.offsetHeight - 8}px`;
        });
        h.addEventListener("mouseleave", () => { tip.style.display = "none"; });
      });
    }, 0);

    return svg;
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
    setText("goalSheetTitle", "New goal");
    setVal("goalName", "");
    setVal("goalTargetAmt", "");
    setVal("goalTargetDate", "");
    setVal("goalMonthly", "");
    state.goalSelectedColor = GOAL_COLORS[0].hex;
    const createBtn = $("goalCreateBtn");
    if (createBtn) createBtn.textContent = "Create Goal";
    const sym = $("goalCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    renderGoalSwatches();
    openOverlay("goalOverlay");
  }

  function openGoalEditSheet(g) {
    state.goalSheetMode = "edit";
    state.goalEditId = g.id;
    setText("goalSheetTitle", "Edit goal");
    setVal("goalName", g.name || "");
    setVal("goalTargetAmt", g.targetAmount != null ? String(g.targetAmount) : "");
    setVal("goalTargetDate", g.targetDate || "");
    setVal("goalMonthly", g.monthlyTarget != null && g.monthlyTarget !== ""
      ? String(g.monthlyTarget) : "");
    state.goalSelectedColor = g.color || GOAL_COLORS[0].hex;
    const createBtn = $("goalCreateBtn");
    if (createBtn) createBtn.textContent = "Save goal";
    const sym = $("goalCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    renderGoalSwatches();
    openOverlay("goalOverlay");
  }

  function renderGoalSwatches() {
    const row = $("goalSwatches");
    if (!row) return;
    row.innerHTML = GOAL_COLORS.map((c, i) =>
      `<button type="button" class="bg-goal-swatch${c.hex === state.goalSelectedColor ? " selected" : ""}" style="background:${c.hex}" data-hex="${c.hex}" aria-label="Color ${i + 1}"></button>`
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
      /* silent */
      const msg = err?.message || "Could not save goal — check connection and try again.";
      showToast(msg.length > 140 ? msg.slice(0, 137) + "…" : msg);
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
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="${escHtml(g.color || "#F59E0B")}" stroke-width="8"
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
    } catch (err) { /* silent */ }
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
    } catch (err) { /* silent */ }
  }

  /* ── Event delegation ────────────────────────────────────────────── */
  function bindEvents() {
    /* Month navigation */
    ($("monthPrev") || {}).onclick = async () => {
      state.month = prevMonth(state.month);
      try { localStorage.setItem(LS_MONTH, state.month); } catch {}
      setText("monthLabel", monthLabel(state.month));
      await Promise.all([loadEntries(), loadPlan()]);
      renderAll();
    };
    ($("monthNext") || {}).onclick = async () => {
      state.month = nextMonth(state.month);
      try { localStorage.setItem(LS_MONTH, state.month); } catch {}
      setText("monthLabel", monthLabel(state.month));
      await Promise.all([loadEntries(), loadPlan()]);
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
    ($("fabExpense") || {}).onclick = () => openExpenseSheet(null);
    ($("fabBill")    || {}).onclick = () => openBillSheet(null);

    /* Account sheet */
    ($("btnAddAccount") || {}).onclick = () => openAccountSheet(null);
    ($("btnIncomeHintAdd") || {}).onclick = () => openAccountSheet(null);
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
    ($("billSave")  || {}).onclick = submitBill;
    ($("billClose") || {}).onclick = () => closeOverlay("billOverlay");
    ($("billDelete")||{}).onclick  = () => { const id = state.sheet.data?.id; if (id) submitDeleteBill(id); };
    ($("billFlowBack") || {}).onclick = () => {
      if (state.sheet?.type !== "bill" || state.sheet.data?.id) return;
      if (billFlowStep <= 1) closeOverlay("billOverlay");
      else {
        billFlowStep = 1;
        syncBillFlowUI();
      }
    };
    ($("billFlowNext") || {}).onclick = () => {
      if (state.sheet?.type !== "bill" || state.sheet.data?.id) return;
      const rawAmt = parseFloat($("billAmount")?.value);
      if (!rawAmt || rawAmt <= 0) { flashError("billAmount"); return; }
      billFlowStep = 2;
      syncBillFlowUI();
      setTimeout(() => $("billName")?.focus?.(), 80);
    };

    /* Limit sheet */
    ($("limitSave")   || {}).onclick = submitLimit;
    ($("limitClose")  || {}).onclick = () => closeOverlay("limitOverlay");
    ($("limitRemove") || {}).onclick = removeLimit;

    /* Backdrop close */
    ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay", "goalOverlay", "goalDetailOverlay"].forEach(id => {
      ($(id) || {}).addEventListener?.("click", e => { if (e.target.id === id) closeOverlay(id); });
    });

    /* Wizard buttons */
    ($("bgWizNext") || {}).onclick = () => wizardGoNext();
    ($("bgWizBack") || {}).onclick = () => wizardGoBack();
    ($("bgWizSkip") || {}).onclick = () => skipWizard().catch(() => {});
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
      await savePlan();
      showToast("Plan saved.");
      renderBudgetPlanner();
      renderSmartAlerts();
      renderSetupChecklist();
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
          loadTrendData().catch(() => {});
          ioTrend.disconnect();
        }
      });
    }, { threshold: 0.15 });
    const trSec = $("bgTrendSection");
    if (trSec) ioTrend.observe(trSec);
    if (trSec && trSec.tagName === "DETAILS") {
      trSec.addEventListener("toggle", () => {
        if (trSec.open) loadTrendData().catch(() => {});
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

    /* Global delegation */
    document.addEventListener("click", e => {

      /* Empty state CTA */
      const cta = e.target.closest("#btnAddExpenseEmpty");
      if (cta) { openExpenseSheet(null); return; }

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
        if (bill) toggleBillPaid(bill);
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
      if (plannerRow && plannerRow.dataset.hasLimit === "1" && !e.target.closest(".bg-planner-set-limit")) {
        openLimitSheet(plannerRow.dataset.cat);
        return;
      }

      const setupItem = e.target.closest(".bg-setup-item");
      if (setupItem && !setupItem.classList.contains("done")) {
        const act = setupItem.dataset.setupAction;
        if (act === "account") { openAccountSheet(null); return; }
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
        Promise.all([loadEntries(), loadPlan()]).then(() => renderAll());
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
        if (entry && !entry._pending) openExpenseSheet(entry);
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
    } catch (err) { /* silent */ }
  }

  function openBudgetDetailsSection(id) {
    const el = $(id);
    if (el && el.tagName === "DETAILS") el.open = true;
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
        await Promise.all([loadAccounts(), loadEntries(), loadPlan(), loadBills(), loadSavingsGoals()]);
        state.plannerDraft = { ...state.plan };
        migrateLocalStorage().catch(() => {});
        state.dataHydrated = true;
        const needsWizard = !state.wizardMeta || state.wizardMeta.completed !== true;
        if (needsWizard) openWizard();
        applyBudgetDetailsDefaults();
        renderAll();
      });
    }

    subscribeBudgetAuth();
    window.addEventListener("load", () => subscribeBudgetAuth(), { once: true });
  }

  HBIT.pages        = HBIT.pages || {};
  HBIT.pages.budget = { init };
  HBIT.budget       = HBIT.budget || {};
  HBIT.budget.wizard = { openWizard, skipWizard, finishWizard };
  document.addEventListener("DOMContentLoaded", init);
})();
