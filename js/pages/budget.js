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
    { id: "housing",       icon: "🏠", color: "#60A5FA", label: "Housing"       },
    { id: "food",          icon: "🍔", color: "#34D399", label: "Food"          },
    { id: "transport",     icon: "🚗", color: "#F59E0B", label: "Transport"     },
    { id: "health",        icon: "❤️",  color: "#F87171", label: "Health"        },
    { id: "entertainment", icon: "🎬", color: "#A78BFA", label: "Fun"           },
    { id: "subscriptions", icon: "📱", color: "#22D3EE", label: "Subscriptions" },
    { id: "shopping",      icon: "🛍",  color: "#FB923C", label: "Shopping"      },
    { id: "education",     icon: "📚", color: "#818CF8", label: "Education"     },
    { id: "savings",       icon: "💰", color: "#4ADE80", label: "Savings"       },
    { id: "other",         icon: "⋯",  color: "#6B7280", label: "Other"         },
  ];

  const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
  function getCat(id) { return CAT_MAP[id] || CATEGORIES[CATEGORIES.length - 1]; }

  /* ── Account type definitions ─────────────────────────────────────── */
  const ACCOUNT_TYPES = [
    { id: "salary",      icon: "💼", label: "Salary",  color: "#34D399" },
    { id: "cash",        icon: "💵", label: "Cash",    color: "#F59E0B" },
    { id: "credit_card", icon: "💳", label: "Credit",  color: "#A78BFA" },
    { id: "debt",        icon: "📉", label: "Debt",    color: "#F87171" },
  ];

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
  };

  const GOAL_COLORS = [
    { hex: "#F59E0B" },
    { hex: "#34D399" },
    { hex: "#60A5FA" },
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
      console.warn("[Hbit] budgetMeta:", err?.message);
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
      console.warn("[Hbit] savingsGoals:", err?.message);
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
  function t(key) {
    return (typeof HBIT?.i18n?.t === "function" ? HBIT.i18n.t(key) : null) || key;
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
      console.warn("[Hbit] Budget loadAccounts:", err?.code, err?.message);
      try {
        const snap = await acctCol().get();
        state.accounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        state.accounts.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return ta - tb;
        });
      } catch (err2) {
        console.warn("[Hbit] Budget loadAccounts fallback:", err2?.code, err2?.message);
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
    catch (err) { console.warn("[Hbit] Budget loadEntries:", err?.code, err?.message); state.entries = []; }
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
      console.warn("[Hbit] Budget loadPlan:", err?.message);
      state.plan = {};
    }
  }

  async function savePlan() {
    try { await HBIT.db.budgetPlan.set(state.month, state.plan); }
    catch (err) { console.warn("[Hbit] Budget savePlan:", err?.message); }
  }

  /* ── Firestore — bills ────────────────────────────────────────────── */
  async function loadBills() {
    try { state.bills = await HBIT.db.budgetBills.list(); }
    catch (err) { console.warn("[Hbit] Budget loadBills:", err?.message); state.bills = []; }
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
    } catch (err) { console.warn("[Hbit] Budget aggregate:", err?.message); }
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
    const byDay = {};
    state.entries.forEach(e => {
      if (e._pending) return;
      const dk = e.dateKey || e.date || "";
      if (!dk) return;
      if (!byDay[dk]) byDay[dk] = { sum: 0, n: 0 };
      byDay[dk].sum += Math.abs(e.amount || 0);
      byDay[dk].n += 1;
    });
    const plan = totalMonthlyPlan();
    const inc = computeIncome();
    const dailyAvg = plan > 0 ? plan / 30 : (inc > 0 ? inc / 30 : 1);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 83);
    const monday0 = new Date(start);
    const dow = (monday0.getDay() + 6) % 7;
    monday0.setDate(monday0.getDate() - dow);

    let html = `<div class="bg-cal-corner"></div>`;
    for (let w = 0; w < 12; w++) {
      const monday = new Date(monday0);
      monday.setDate(monday.getDate() + w * 7);
      const lbl = monday.toLocaleDateString(undefined, { month: "short" });
      html += `<div class="bg-cal-month-lbl" style="grid-column:${w + 2};grid-row:1">${escHtml(lbl)}</div>`;
    }
    const dayLblRows = [1, 3, 5];
    const dayLetters = ["M", "W", "F"];
    for (let i = 0; i < 3; i++) {
      html += `<div class="bg-cal-day-lbl" style="grid-column:1;grid-row:${dayLblRows[i] + 1}">${dayLetters[i]}</div>`;
    }
    for (let w = 0; w < 12; w++) {
      for (let r = 0; r < 7; r++) {
        const d = new Date(monday0);
        d.setDate(d.getDate() + w * 7 + r);
        const dk = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, "0"),
          String(d.getDate()).padStart(2, "0"),
        ].join("-");
        const isFuture = d > today;
        const info = byDay[dk];
        const spent = info ? info.sum : 0;
        let bg = "rgba(255,255,255,0.05)";
        if (spent > 0 && dailyAvg > 0) {
          const ratio = spent / dailyAvg;
          if (spent > dailyAvg * 1.15) bg = "#F87171";
          else if (ratio < 0.25) bg = "rgba(245,158,11,0.2)";
          else if (ratio <= 0.75) bg = "rgba(245,158,11,0.5)";
          else bg = "rgba(245,158,11,0.85)";
        }
        const tip = `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${fmtMoney(spent)} spent · ${info ? info.n : 0} transaction${(info?.n || 0) === 1 ? "" : "s"}`;
        const futCls = isFuture ? " future" : "";
        html += `<div class="bg-cal-cell${futCls}" style="grid-column:${w + 2};grid-row:${r + 2};background:${bg}" data-tip="${escHtml(tip)}" tabindex="0" role="img" aria-label="${escHtml(tip)}"></div>`;
      }
    }
    wrap.innerHTML = html;
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
    const income    = computeIncome();
    const expenses  = computeExpenses();
    const remaining = income - expenses;
    setText("sumIncome",    fmtMoney(income));
    setText("sumExpenses",  fmtMoney(expenses));
    setText("sumRemaining", fmtMoney(remaining));
    const remEl = $("sumRemaining");
    if (remEl) remEl.style.color = remaining < 0 ? "var(--bgt-red)" : remaining > 0 && income > 0 ? "var(--bgt-green)" : "";
  }

  /* ── Overview donut + net worth ───────────────────────────────────── */
  function renderOverviewDonut() {
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
      { frac: remaining / total, color: "#60A5FA" },
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
        <div class="bg-planner-row bg-planner-row--plan" data-cat="${row.id}" role="listitem">
          <div class="bg-planner-icon" style="background:${row.color}22;color:${row.color}">${escHtml(row.icon)}</div>
          <div class="bg-planner-info">
            <div class="bg-planner-name">${escHtml(row.label)}</div>
            <input class="bg-planner-plan-input" type="number" min="0" step="1" data-plan-cat="${row.id}"
                   value="${escHtml(val)}" placeholder="0" aria-label="Limit for ${escHtml(row.label)}" />
            <div class="bg-planner-plan-hint"></div>
          </div>
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
          <div class="bg-planner-icon" style="background:${row.color}22;color:${row.color}">${escHtml(row.icon)}</div>
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
          <div class="bg-bill-icon" style="background:${cat.color}22;color:${cat.color}">${escHtml(cat.icon)}</div>
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
    const text = t("budget.bills.dueOn").replace("{day}", String(day));
    if (status === "overdue")  return `${text} · ${t("budget.bills.overdue")}`;
    if (status === "upcoming") return `${text} · ${t("budget.bills.upcoming")}`;
    return text;
  }

  /* ── Accounts section ─────────────────────────────────────────────── */
  function renderAccounts() {
    const list = $("accountsList");
    if (!list) return;
    list.innerHTML = "";

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
      const card = document.createElement("div");
      card.className = "bg-account-card";
      card.style.background = `var(--bgt-${slug}-bg)`;
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
        <div class="bg-acct-type">${escHtml(t2.icon)}&nbsp;${escHtml(t2.label)}</div>
        <div class="bg-acct-name">${escHtml(acct.name)}</div>
        <div class="bg-acct-balance" style="color:${t2.color}">${fmtMoney(acct.balance || 0)}</div>
        ${utilBar}
        ${acct.note ? `<div class="bg-acct-note">${escHtml(acct.note)}</div>` : ""}
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
            <span class="bg-leg-name">${escHtml(s.icon)}&nbsp;${escHtml(s.label)}</span>
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
    return `
      <div class="bg-entry-card" data-id="${e.id}"
           ${e._pending ? 'data-pending="true"' : ""} role="listitem">
        <div class="bg-entry-icon" style="background:${cat.color}22;color:${cat.color}" aria-hidden="true">${escHtml(cat.icon)}</div>
        <div class="bg-entry-info">
          <div class="bg-entry-desc">${escHtml(e.description || cat.label)}</div>
          <div class="bg-entry-meta">
            <span class="bg-entry-cat">${escHtml(cat.label)}</span>
          </div>
        </div>
        <div class="bg-entry-right">
          <div class="bg-entry-amt" style="color:${cat.color}">&minus;${fmtMoney(Math.abs(e.amount))}</div>
          <button class="bg-entry-del" data-id="${e.id}" type="button" aria-label="Delete expense">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
        <div class="bg-entry-swipe-del" data-del="${e.id}">Delete</div>
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
    const tpl = t("budget.flow.stepOf");
    if (tpl && tpl.includes("{")) {
      return tpl.replace("{current}", String(current)).replace("{total}", String(total));
    }
    return `Step ${current} of ${total}`;
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
        <span class="bg-type-icon">${escHtml(t2.icon)}</span>
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
      console.warn("[Hbit] Save account:", err?.code, err?.message);
      const code = err?.code || "";
      const detail = err?.message || "Save failed";
      const short = code === "permission-denied"
        ? "Permission denied — sign in and try again"
        : (code ? `${code}: ` : "") + detail;
      const btnMsg = short.length > 52 ? short.slice(0, 49) + "…" : short;
      showSheetError("acctSave", btnMsg);
      showToast(short.length > 120 ? short.slice(0, 117) + "…" : short);
    } finally {
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
      console.warn("[Hbit] Delete account:", err?.code, err?.message);
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
        <span class="bg-cat-icon">${escHtml(c.icon)}</span>
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
      console.warn("[Hbit] Save expense:", err?.message);
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
      console.warn("[Hbit] Delete expense:", err?.message);
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
      console.warn("[Hbit] Save bill:", err?.message);
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
      console.warn("[Hbit] Delete bill:", err?.message);
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
    if (info) info.innerHTML = `<span style="font-size:18px">${escHtml(cat.icon)}</span><span>${escHtml(cat.label)}</span>`;
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
        if (o && (o.classList.contains("open") || o.style.display === "flex")) {
          closeOverlay(oid);
        }
      }
    });
    const el = $(id);
    if (!el) return;
    el.style.display = "flex";
    el.style.visibility = "visible";
    void el.offsetWidth;
    el.setAttribute("aria-hidden", "false");
    el.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeOverlay(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
    el.style.visibility = "";
    const onEnd = (e) => {
      if (e.target !== el) return;
      if (!el.classList.contains("open")) {
        el.style.display = "none";
      }
      el.removeEventListener("transitionend", onEnd);
    };
    el.addEventListener("transitionend", onEnd);
    setTimeout(() => {
      if (!el.classList.contains("open")) {
        el.style.display = "none";
      }
      el.removeEventListener("transitionend", onEnd);
    }, 360);
    clearBodyScrollUnlessOverlayOpen();
  }

  /* ── Help tour ───────────────────────────────────────────────────── */
  const HELP_STEPS = [
    { titleKey: "budget.help.step1.title", bodyKey: "budget.help.step1.body" },
    { titleKey: "budget.help.step2.title", bodyKey: "budget.help.step2.body" },
    { titleKey: "budget.help.step3.title", bodyKey: "budget.help.step3.body" },
    { titleKey: "budget.help.step4.title", bodyKey: "budget.help.step4.body" },
  ];
  let helpStepIndex = 0;

  function openHelp() {
    helpStepIndex = 0;
    updateHelpContent();
    openOverlay("helpOverlay");
  }

  function closeHelp() {
    closeOverlay("helpOverlay");
  }

  function updateHelpContent() {
    setText("helpTitle", t("budget.help.title"));
    const step = HELP_STEPS[helpStepIndex];
    if (step) { setText("helpStepTitle", t(step.titleKey)); setText("helpStepBody", t(step.bodyKey)); }
    const backBtn = $("helpBack");
    const nextBtn = $("helpNext");
    if (backBtn) { backBtn.textContent = t("budget.help.back"); backBtn.style.display = helpStepIndex === 0 ? "none" : ""; }
    if (nextBtn) { nextBtn.textContent = helpStepIndex === HELP_STEPS.length - 1 ? t("budget.help.close") : t("budget.help.next"); }
    const dotsEl = $("helpDots");
    if (dotsEl) {
      dotsEl.innerHTML = HELP_STEPS.map((_, i) =>
        `<span class="${i === helpStepIndex ? "active" : ""}" aria-hidden="true"></span>`).join("");
    }
  }

  function helpNext() {
    if (helpStepIndex >= HELP_STEPS.length - 1) { closeHelp(); return; }
    helpStepIndex++;
    updateHelpContent();
  }
  function helpBack() {
    if (helpStepIndex <= 0) return;
    helpStepIndex--;
    updateHelpContent();
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
    const colors = ["#F59E0B", "#34D399", "#60A5FA", "#FB7185", "#ffffff"];
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
        <div class="bg-wiz-welcome-icon" aria-hidden="true">👛</div>
        <h2 class="bg-wiz-title">Let's understand how you manage money</h2>
        <p class="bg-wiz-sub">8 quick questions. No judgment. We'll set things up your way.</p>`;
    } else if (n === 1) {
      const opts = [
        { id: "spend_track", icon: "😅", t: "I spend without tracking", d: "Money disappears and I don't know where" },
        { id: "save", icon: "😰", t: "I never save enough", d: "Month ends and savings is zero" },
        { id: "debt", icon: "💳", t: "Debt stress", d: "Credit cards or loans weighing on me" },
        { id: "avoid", icon: "🙈", t: "Avoiding my finances", d: "I'd rather not look" },
        { id: "insight", icon: "📊", t: "I track but want better insights", d: "I use spreadsheets, want something smarter" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">What's your biggest challenge with money right now?</h2>
        ${opts.map((o, i) => `
          <button type="button" class="bg-wiz-option${wizardAnswers.struggle === o.id ? " selected" : ""}" data-struggle="${o.id}" style="--i:${i}">
            <svg class="bg-wiz-check-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
            <span><span class="bg-wiz-option-label">${o.icon} ${escHtml(o.t)}</span><span class="bg-wiz-option-desc">${escHtml(o.d)}</span></span>
          </button>`).join("")}`;
    } else if (n === 2) {
      const opts = [
        { id: "save_more", icon: "🎯", t: "Save more each month" },
        { id: "debt_pay", icon: "💳", t: "Pay off debt faster" },
        { id: "know", icon: "📊", t: "Know where my money goes" },
        { id: "big", icon: "🏠", t: "Save for a big purchase" },
        { id: "impulse", icon: "🧾", t: "Stop impulse spending" },
        { id: "emergency", icon: "🚀", t: "Build an emergency fund" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">What do you want to achieve? Pick up to 3.</h2>
        <div class="bg-wiz-goals-grid">
        ${opts.map((o, i) => `
          <button type="button" class="bg-wiz-goal-chip${wizardAnswers.goals.includes(o.id) ? " selected" : ""}" data-goal="${o.id}" style="--i:${i}">${o.icon} ${escHtml(o.t)}</button>`).join("")}
        </div>`;
    } else if (n === 3) {
      slide.innerHTML = `<h2 class="bg-wiz-title">How often do you get paid?</h2>
        <div class="bg-wiz-pay-row">
          ${["weekly", "biweekly", "monthly"].map((id, i) => {
            const labels = { weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly" };
            return `<button type="button" class="bg-wiz-pay-chip${wizardAnswers.payFrequency === id ? " selected" : ""}" data-payf="${id}" style="--i:${i}">${labels[id]}</button>`;
          }).join("")}
        </div>`;
    } else if (n === 4) {
      slide.innerHTML = `<h2 class="bg-wiz-title">How do you like to budget?</h2>
        <div class="bg-wiz-mode-row">
          <button type="button" class="bg-wiz-mode-card${wizardAnswers.mode === "plan" ? " selected" : ""}" data-mode="plan">
            <span class="bg-wiz-option-label">📋 Plan first</span><span class="bg-wiz-option-desc">I want to set limits before the month starts. Keep me accountable.</span>
          </button>
          <button type="button" class="bg-wiz-mode-card${wizardAnswers.mode === "reactive" ? " selected" : ""}" data-mode="reactive">
            <span class="bg-wiz-option-label">📝 Track as I go</span><span class="bg-wiz-option-desc">I'll log spending and see where I land. No pressure.</span>
          </button>
        </div>`;
    } else if (n === 5) {
      slide.innerHTML = `<h2 class="bg-wiz-title">Where does most of your money go?</h2>
        <div class="bg-wiz-cat-scroll">
          ${CATEGORIES.map((c, i) => `
            <button type="button" class="bg-wiz-cat-chip${wizardAnswers.topCategory === c.id ? " selected" : ""}" data-topcat="${c.id}" style="--i:${i}">${escHtml(c.icon)} ${escHtml(c.label)}</button>`).join("")}
        </div>`;
    } else if (n === 6) {
      const lv = [
        { id: "beginner", icon: "🌱", t: "Beginner", d: "Just getting started" },
        { id: "intermediate", icon: "🌿", t: "Intermediate", d: "I track sometimes" },
        { id: "advanced", icon: "🌳", t: "Advanced", d: "I know my numbers" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">How comfortable are you with budgeting?</h2>
        <div class="bg-wiz-level-row">
          ${lv.map((o, i) => `
            <button type="button" class="bg-wiz-level-card${wizardAnswers.level === o.id ? " selected" : ""}" data-level="${o.id}" style="--i:${i}">
              <span class="bg-wiz-option-label">${o.icon} ${escHtml(o.t)}</span><span class="bg-wiz-option-desc">${escHtml(o.d)}</span>
            </button>`).join("")}
        </div>`;
    } else {
      const cm = [
        { id: "allin", icon: "🔥", t: "All in", d: "Check in daily, set goals, push me" },
        { id: "mod", icon: "⚡", t: "Moderate", d: "Weekly check-ins, gentle nudges" },
        { id: "casual", icon: "🌊", t: "Casual", d: "Just track, no pressure" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">How committed are you to improving your finances?</h2>
        ${cm.map((o, i) => `
          <button type="button" class="bg-wiz-commit-card${wizardAnswers.commitment === o.id ? " selected" : ""}" data-commit="${o.id}" style="--i:${i}">
            <span class="bg-wiz-option-label">${o.icon} ${escHtml(o.t)}</span><span class="bg-wiz-option-desc">${escHtml(o.d)}</span>
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
      console.warn("[Hbit] skipWizard:", err?.code, err?.message);
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
      console.warn("[Hbit] finishWizard:", err?.code, err?.message);
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
      finishWizard().catch(err => console.warn(err));
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
    svg += `<path d="${linePts.trim()}" fill="none" stroke="#60A5FA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
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
    }).catch(err => console.warn("[Hbit] CSV export:", err));
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
      console.warn("[Hbit] goal save:", err);
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
    } catch (err) { console.warn(err); }
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
    } catch (err) { console.warn(err); }
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
    ($("helpBack")  || {}).onclick = helpBack;
    ($("helpNext")  || {}).onclick = helpNext;
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
      if (card && !e.target.closest(".bg-entry-del") && !e.target.closest(".bg-entry-swipe-del")) {
        const entry = state.entries.find(x => x.id === card.dataset.id);
        if (entry && !entry._pending) openExpenseSheet(entry);
        return;
      }

      /* Delete button */
      const delBtn = e.target.closest(".bg-entry-del");
      if (delBtn) { submitDeleteExpense(delBtn.dataset.id); return; }

      /* Swipe delete */
      const swipeDel = e.target.closest(".bg-entry-swipe-del");
      if (swipeDel) { submitDeleteExpense(swipeDel.dataset.del); return; }

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
    } catch (err) { console.warn("[Hbit] Budget migration:", err?.message); }
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
