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
  };

  let acctEditType  = "salary";
  let expEditCat    = "other";
  let billEditCat   = "subscriptions";
  let limitEditCat  = null;

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

  /** Day-of-month for today */
  function todayDay() { return new Date().getDate(); }

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
    try {
      const snap = await acctCol().orderBy("createdAt", "asc").get();
      state.accounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("[Hbit] Budget loadAccounts:", err?.code, err?.message);
      state.accounts = [];
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

  /* ── Full re-render ───────────────────────────────────────────────── */
  function renderAll() {
    renderHeader();
    renderKpis();
    renderOverviewDonut();
    renderBudgetPlanner();
    renderBills();
    renderAccounts();
    renderPieChart();
    renderEntries();
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

  /* ── Budget Planner ───────────────────────────────────────────────── */
  function renderBudgetPlanner() {
    const list = $("plannerList");
    if (!list) return;
    const catMap = computeByCategory();

    /* Build rows for:
       1. categories that have a budget limit set
       2. categories that have actual spending this month
       (union of both) */
    const catIds = new Set([
      ...Object.keys(state.plan).filter(k => (state.plan[k] || 0) > 0),
      ...Object.keys(catMap).filter(k => (catMap[k] || 0) > 0),
      ...CATEGORIES.map(c => c.id), // always show all
    ]);

    const rows = CATEGORIES.filter(c => catIds.has(c.id)).map(c => ({
      ...c,
      spent: catMap[c.id] || 0,
      limit: state.plan[c.id] || 0,
    }));

    list.innerHTML = rows.map(row => {
      const pct   = row.limit > 0 ? Math.min((row.spent / row.limit) * 100, 100) : 0;
      const over  = row.limit > 0 && row.spent > row.limit;
      const warn  = row.limit > 0 && pct >= 80 && !over;
      const hasLimit = row.limit > 0;
      const barClass = over ? "over" : warn ? "warn" : hasLimit ? "good" : "";
      const barWidth = row.limit > 0 ? `${pct}%` : `${Math.min((row.spent / Math.max(computeExpenses(), 1)) * 100, 100)}%`;

      return `
        <div class="bg-planner-row" data-cat="${row.id}" role="listitem"
             tabindex="0" aria-label="Set budget for ${escHtml(row.label)}">
          <div class="bg-planner-icon" style="background:${row.color}22;color:${row.color}">${escHtml(row.icon)}</div>
          <div class="bg-planner-info">
            <div class="bg-planner-name">${escHtml(row.label)}</div>
            <div class="bg-planner-bar-wrap">
              <div class="bg-planner-bar-fill ${barClass}" style="width:${barWidth}"></div>
            </div>
          </div>
          <div class="bg-planner-amounts">
            <div class="bg-planner-spent" style="color:${row.color}">${fmtMoney(row.spent)}</div>
            <div class="bg-planner-limit ${hasLimit ? "" : "no-limit"}">
              ${hasLimit ? `/ ${fmtMoney(row.limit)}` : t("budget.planner.noLimit")}
            </div>
          </div>
        </div>`;
    }).join("");
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
  function openAccountSheet(account) {
    state.sheet  = { type: "account", data: account || null };
    acctEditType = account?.type || "salary";
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
      console.warn("[Hbit] Save account:", err?.message);
      showSheetError("acctSave", "Save failed — retry");
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
      console.warn("[Hbit] Delete account:", err?.message);
      showSheetError("acctDelete", "Error — retry");
    } finally {
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
      state.entries = state.entries.map(e => e.id === TEMP_ID ? { ...e, id: realId, _pending: false } : e);
      renderAll();
      updateBudgetMonthAggregate(month).catch(() => {});
    } catch (err) {
      console.warn("[Hbit] Save expense:", err?.message);
      state.entries = prev;
      renderAll();
      openExpenseSheet({ id: editId, amount, category: cat, description: desc, dateKey });
      showSheetError("expSave", "Save failed — check connection");
    }
  }

  async function submitDeleteExpense(id) {
    const removed = state.entries.find(e => e.id === id);
    state.entries = state.entries.filter(e => e.id !== id);
    closeOverlay("expOverlay");
    renderAll();
    try {
      await removeExpense(id);
      updateBudgetMonthAggregate(state.month).catch(() => {});
    } catch (err) {
      console.warn("[Hbit] Delete expense:", err?.message);
      if (removed) state.entries = [...state.entries, removed];
      renderAll();
    }
  }

  /* ════════════════════════════════════════════════════════════
     BILL SHEET
     ════════════════════════════════════════════════════════════ */
  function openBillSheet(bill) {
    state.sheet = { type: "bill", data: bill || null };
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
    closeFab();
    openOverlay("billOverlay");
    setTimeout(() => $("billAmount")?.focus?.(), 380);
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
      renderBills();
    } catch (err) {
      console.warn("[Hbit] Save bill:", err?.message);
      showSheetError("billSave", "Save failed — retry");
    } finally {
      setBusy("billSave", false, t("budget.sheet.save"));
    }
  }

  async function submitDeleteBill(id) {
    setBusy("billDelete", true);
    try {
      await deleteBill(id);
      closeOverlay("billOverlay");
      state.bills = state.bills.filter(b => b.id !== id);
      renderBills();
    } catch (err) {
      console.warn("[Hbit] Delete bill:", err?.message);
      showSheetError("billDelete", "Error — retry");
    } finally {
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
    closeOverlay("limitOverlay");
    renderBudgetPlanner();
    savePlan().catch(() => {});
  }

  async function removeLimit() {
    delete state.plan[limitEditCat];
    closeOverlay("limitOverlay");
    renderBudgetPlanner();
    savePlan().catch(() => {});
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
  function openOverlay(id) {
    const el = $(id);
    if (!el) return;
    el.setAttribute("aria-hidden", "false");
    el.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeOverlay(id) {
    const el = $(id);
    if (!el) return;
    el.setAttribute("aria-hidden", "true");
    el.classList.remove("open");
    document.body.style.overflow = "";
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
    const ov = $("helpOverlay");
    if (ov) { ov.setAttribute("aria-hidden", "false"); ov.classList.add("open"); document.body.style.overflow = "hidden"; }
  }

  function closeHelp() {
    const ov = $("helpOverlay");
    if (ov) { ov.setAttribute("aria-hidden", "true"); ov.classList.remove("open"); document.body.style.overflow = ""; }
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
    ($("acctSave")      || {}).onclick = submitAccount;
    ($("acctClose")     || {}).onclick = () => closeOverlay("acctOverlay");
    ($("acctDelete")    || {}).onclick = () => { const id = state.sheet.data?.id; if (id) submitDeleteAccount(id); };

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

    /* Limit sheet */
    ($("limitSave")   || {}).onclick = submitLimit;
    ($("limitClose")  || {}).onclick = () => closeOverlay("limitOverlay");
    ($("limitRemove") || {}).onclick = removeLimit;

    /* Backdrop close */
    ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay"].forEach(id => {
      ($(id) || {}).addEventListener?.("click", e => { if (e.target.id === id) closeOverlay(id); });
    });

    /* ESC key */
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay", "helpOverlay"].forEach(id => {
        if ($(id)?.classList.contains("open")) closeOverlay(id);
      });
      closeFab();
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

      /* Planner row → open limit sheet */
      const plannerRow = e.target.closest(".bg-planner-row");
      if (plannerRow) {
        openLimitSheet(plannerRow.dataset.cat);
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
    renderAll();

    if (!window.firebase?.auth) return;

    firebase.auth().onAuthStateChanged(async user => {
      if (!user) { window.location.replace("login.html"); return; }
      state.uid = user.uid;

      try {
        const profile = await HBIT.getCurrentUserProfile?.();
        const name = profile?.fullName || user.displayName || user.email || "U";
        const av   = $("bgAvatar");
        if (av) av.textContent = name.charAt(0).toUpperCase();
      } catch {}

      await Promise.all([loadAccounts(), loadEntries(), loadPlan(), loadBills()]);
      migrateLocalStorage().catch(() => {});
      renderAll();
    });
  }

  HBIT.pages        = HBIT.pages || {};
  HBIT.pages.budget = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
