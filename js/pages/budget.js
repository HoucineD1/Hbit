/* =====================================================================
   Hbit — js/pages/budget.js   (v2 — fixed saves + optimistic UI)

   Architecture:
   • Accounts  → /users/{uid}/budgetAccounts/{id}   (direct Firestore)
   • Expenses  → /users/{uid}/budgetEntries/{id}    (via HBIT.db.budgetEntries)
   • Currency  → localStorage

   Key fix (v2):
   • db.js.budgetEntries.forMonth no longer uses a composite orderBy
     so Firestore never needs a manual composite index.
   • state.entries is updated OPTIMISTICALLY before the Firestore write
     so the pie chart and list react instantly.
   • saveExpense() returns the new doc-id so the optimistic entry can
     carry the real id immediately.
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
    { id: "health",        icon: "❤️", color: "#F87171", label: "Health"        },
    { id: "entertainment", icon: "🎬", color: "#A78BFA", label: "Fun"           },
    { id: "subscriptions", icon: "📱", color: "#22D3EE", label: "Subscriptions" },
    { id: "shopping",      icon: "🛍", color: "#FB923C", label: "Shopping"      },
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
  const LS_EXPENSES = "hbit:budget:expenses"; // legacy migration key

  /* ── State ────────────────────────────────────────────────────────── */
  const state = {
    uid:        null,
    currency:   "CAD",
    month:      todayKey().slice(0, 7),
    accounts:   [],
    entries:    [],   // expense entries for selected month
    focusedCat: null, // pie slice highlight
    sheet: { type: null, data: null },
  };

  /* current type / category in open sheet */
  let acctEditType = "salary";
  let expEditCat   = "other";

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
    return m === 1
      ? `${y - 1}-12`
      : `${y}-${String(m - 1).padStart(2, "0")}`;
  }

  function nextMonth(ym) {
    const [y, m] = ym.split("-").map(Number);
    return m === 12
      ? `${y + 1}-01`
      : `${y}-${String(m + 1).padStart(2, "0")}`;
  }

  function monthLabel(ym) {
    const [y, m] = ym.split("-");
    return new Date(+y, +m - 1, 1).toLocaleDateString(undefined, {
      month: "long", year: "numeric",
    });
  }

  /* ── Currency / formatting ────────────────────────────────────────── */
  function getCurrency() {
    try { return localStorage.getItem(LS_CURRENCY) || "CAD"; } catch { return "CAD"; }
  }
  function saveCurrency(c) {
    try { localStorage.setItem(LS_CURRENCY, c); } catch {}
  }

  function fmtMoney(n) {
    const cur  = state.currency;
    const intl = cur === "CAF" ? "XAF" : cur;
    const val  = Number.isFinite(n) ? n : 0;
    const loc  = (document.documentElement.lang || "en") === "fr" ? "fr-CA" : "en-CA";
    try {
      const f = new Intl.NumberFormat(loc, {
        style: "currency", currency: intl, maximumFractionDigits: 2,
      }).format(val);
      return cur === "CAF" ? `${f} CAF` : f;
    } catch {
      return `${val.toFixed(2)} ${cur}`;
    }
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

  /* ── Firestore — accounts ─────────────────────────────────────────── */
  function acctCol() {
    return HBIT.userSubcollectionRef(state.uid, "budgetAccounts");
  }

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
        type:      data.type,
        name:      data.name,
        balance:   +data.balance  || 0,
        limit:     data.limit  != null ? +data.limit  : null,
        apr:       data.apr    != null ? +data.apr    : null,
        note:      data.note   || "",
        updatedAt: ts,
      });
    } else {
      await acctCol().add({
        type:      data.type,
        name:      data.name,
        balance:   +data.balance  || 0,
        limit:     data.limit  != null ? +data.limit  : null,
        apr:       data.apr    != null ? +data.apr    : null,
        note:      data.note   || "",
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  async function deleteAccount(id) {
    await acctCol().doc(id).delete();
  }

  /* ── Firestore — expenses ─────────────────────────────────────────── */
  async function loadEntries() {
    try {
      state.entries = await HBIT.db.budgetEntries.forMonth(state.month);
    } catch (err) {
      console.warn("[Hbit] Budget loadEntries:", err?.code, err?.message);
      state.entries = [];
    }
  }

  /**
   * Persist one expense.
   * Returns the Firestore document id (new id on add, existing id on update).
   *
   * Callers should update state.entries BEFORE calling this so the UI
   * already looks correct by the time the network round-trip completes.
   */
  async function persistExpense(data) {
    const dateKey = data.dateKey || todayKey();
    const month   = dateKey.slice(0, 7);

    if (data.id) {
      await HBIT.db.budgetEntries.update(data.id, {
        type:        "expense",
        amount:      Math.abs(+data.amount || 0),
        category:    data.category    || "other",
        description: data.description || "",
        date:        dateKey,
        dateKey,
        month,
      });
      return data.id;
    } else {
      const newId = await HBIT.db.budgetEntries.add({
        type:        "expense",
        amount:      Math.abs(+data.amount || 0),
        category:    data.category    || "other",
        description: data.description || "",
        date:        dateKey,
        dateKey,
        month,
      });
      return newId;
    }
  }

  async function removeExpense(id) {
    await HBIT.db.budgetEntries.delete(id);
  }

  /* ── Budget month aggregate ───────────────────────────────────────── */
  /**
   * Recomputes totals from state.entries + state.accounts and writes
   * the aggregate to users/{uid}/budgetMonths/{month}.
   * Called after every add / edit / delete of entries and after
   * account saves so Home always has up-to-date data.
   */
  async function updateBudgetMonthAggregate(month) {
    if (!state.uid || !HBIT.db?.budgetMonths) return;
    try {
      const incomeTotal = state.accounts
        .filter(a => (a.type === "salary" || a.type === "cash") && (a.balance || 0) > 0)
        .reduce((s, a) => s + (a.balance || 0), 0);

      const monthEntries = state.entries.filter(e =>
        (e.month || (e.dateKey || e.date || "").slice(0, 7)) === month &&
        !e._pending
      );

      const expenseTotal = monthEntries
        .filter(e => e.type !== "income")
        .reduce((s, e) => s + Math.abs(e.amount || 0), 0);

      const byCategory = {};
      monthEntries.forEach(e => {
        if (e.type === "income") return;
        const cat = e.category || "other";
        byCategory[cat] = (byCategory[cat] || 0) + Math.abs(e.amount || 0);
      });

      await HBIT.db.budgetMonths.set(month, {
        incomeTotal,
        expenseTotal,
        remaining: incomeTotal - expenseTotal,
        byCategory,
      });
    } catch (err) {
      console.warn("[Hbit] Budget aggregate:", err?.code, err?.message);
    }
  }

  /* ── Computed values ──────────────────────────────────────────────── */
  function computeSummary() {
    const income = state.accounts
      .filter(a => (a.type === "salary" || a.type === "cash") && (a.balance || 0) > 0)
      .reduce((s, a) => s + (a.balance || 0), 0);
    const expenses = state.entries.reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    return { income, expenses, remaining: income - expenses };
  }

  function computeByCategory() {
    const map = {};
    state.entries.forEach(e => {
      const cat = e.category || "other";
      map[cat] = (map[cat] || 0) + Math.abs(e.amount || 0);
    });
    return map;
  }

  /** Full money breakdown: income, spent, debt (owed), remaining. */
  function computeBreakdown() {
    const income = state.accounts
      .filter(a => (a.type === "salary" || a.type === "cash") && (a.balance || 0) > 0)
      .reduce((s, a) => s + (a.balance || 0), 0);
    const spent = state.entries.reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    const debt = state.accounts
      .filter(a => a.type === "debt")
      .reduce((s, a) => s + Math.abs(a.balance || 0), 0);
    const remaining = income - spent;
    return { income, spent, debt, remaining };
  }

  /* ── Full re-render ───────────────────────────────────────────────── */
  function renderAll() {
    renderHeader();
    renderSummary();
    renderBreakdown();
    renderAccounts();
    renderPieChart();
    renderEntries();
  }

  /* ── Header ───────────────────────────────────────────────────────── */
  function renderHeader() {
    const d = new Date();
    setText("bgDate", d.toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric",
    }).toUpperCase());
    setText("monthLabel", monthLabel(state.month));
    const sym = $("expCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    const sel = $("currencySelect");
    if (sel) sel.value = state.currency;
  }

  /* ── Money overview breakdown ─────────────────────────────────────── */
  function renderBreakdown() {
    const { income, spent, debt, remaining } = computeBreakdown();
    setText("breakdownIncome",    fmtMoney(income));
    setText("breakdownSpent",    fmtMoney(spent));
    setText("breakdownDebt",     fmtMoney(debt));
    setText("breakdownRemaining", fmtMoney(remaining));

    const remEl = $("breakdownRemaining");
    if (remEl) {
      remEl.style.color = remaining < 0 ? "var(--bgt-red)" : "";
    }

    const wrap = $("breakdownDonutWrap");
    const svg  = $("breakdownDonut");
    if (svg && wrap) {
      const total = income || (spent + debt + Math.max(0, remaining));
      if (total <= 0) {
        svg.innerHTML = `<circle cx="50" cy="50" r="40" fill="none"
          stroke="rgba(255,255,255,0.06)" stroke-width="12"/>`;
      } else {
        const CIRC = 2 * Math.PI * 40;
        const r40 = 40;
        const sw  = 12;
        const segs = [
          { frac: spent / total,    color: "var(--bgt-accent,#F59E0B)" },
          { frac: Math.max(0, remaining) / total, color: "var(--bgt-green,#34D399)" },
          { frac: debt / total,     color: "var(--bgt-red,#F87171)" },
        ].filter(s => s.frac > 0);
        let acc = 0;
        const circles = segs.map(s => {
          const len = s.frac * CIRC;
          const off = -(acc * CIRC);
          acc += s.frac;
          return `<circle cx="50" cy="50" r="${r40}" fill="none" stroke="${s.color}"
            stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${CIRC.toFixed(2)}"
            stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 50 50)"
            style="transition: stroke-dasharray .5s ease"/>`;
        }).join("");
        svg.innerHTML = `<circle cx="50" cy="50" r="${r40}" fill="none"
          stroke="rgba(255,255,255,0.06)" stroke-width="${sw}"/>${circles}`;
      }
    }
  }

  /* ── Summary strip ────────────────────────────────────────────────── */
  function renderSummary() {
    const { income, expenses, remaining } = computeSummary();
    setText("sumIncome",    fmtMoney(income));
    setText("sumExpenses",  fmtMoney(expenses));
    setText("sumRemaining", fmtMoney(remaining));
    const remEl = $("sumRemaining");
    if (remEl) {
      remEl.style.color =
        remaining < 0 ? "var(--bgt-red)" :
        remaining > 0 && income > 0 ? "var(--bgt-green)" : "";
    }
  }

  /* ── Accounts section ─────────────────────────────────────────────── */
  function renderAccounts() {
    const list = $("accountsList");
    if (!list) return;
    list.innerHTML = "";

    if (state.accounts.length === 0) {
      /* Guided empty state inside the account row */
      const hint = document.createElement("div");
      hint.className = "bg-accounts-hint";
      hint.innerHTML = `
        <p class="bg-accounts-hint-text">
          No accounts yet. Add your first account to start tracking your budget.
        </p>
        <button class="bg-btn-primary" id="btnAddAccountHint" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add account
        </button>
      `;
      list.appendChild(hint);
      return;
    }

    state.accounts.forEach(acct => {
      const t    = getAcctType(acct.type);
      const slug = acct.type === "credit_card" ? "credit" : acct.type;
      const card = document.createElement("div");
      card.className = "bg-account-card";
      card.style.background = `var(--bgt-${slug}-bg)`;
      card.setAttribute("role", "listitem");
      card.innerHTML = `
        <div class="bg-acct-type">${escHtml(t.icon)}&nbsp;${escHtml(t.label)}</div>
        <div class="bg-acct-name">${escHtml(acct.name)}</div>
        <div class="bg-acct-balance" style="color:${t.color}">${fmtMoney(acct.balance || 0)}</div>
        ${acct.type === "credit_card" && acct.limit
          ? `<div class="bg-acct-limit">/ ${fmtMoney(acct.limit)} limit</div>` : ""}
        ${acct.note ? `<div class="bg-acct-note">${escHtml(acct.note)}</div>` : ""}
        <button class="bg-acct-edit" data-id="${acct.id}" type="button"
                aria-label="Edit ${escHtml(acct.name)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      `;
      list.appendChild(card);
    });

    /* "+ Add account" card always last */
    const addCard = document.createElement("div");
    addCard.className = "bg-account-add";
    addCard.id        = "btnAddAccountCard";
    addCard.setAttribute("role", "button");
    addCard.setAttribute("tabindex", "0");
    addCard.setAttribute("aria-label", "Add account");
    addCard.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Add account</span>
    `;
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

    /* Build slice list — known categories sorted by amount */
    const known = new Set(CATEGORIES.map(c => c.id));
    let extraAmt = 0;
    Object.keys(catMap).forEach(k => { if (!known.has(k)) extraAmt += catMap[k]; });

    const slices = CATEGORIES
      .filter(c => (catMap[c.id] || 0) > 0)
      .map(c => ({ ...c, amount: catMap[c.id] }))
      .sort((a, b) => b.amount - a.amount);

    if (extraAmt > 0) {
      const o = slices.find(s => s.id === "other");
      if (o) { o.amount += extraAmt; }
      else slices.push({ ...getCat("other"), amount: extraAmt });
    }

    slices.forEach(s => { s.frac = s.amount / total; });

    /* SVG donut geometry */
    const CX = 90, CY = 90, R = 65, SW = 32;
    const CIRC = 2 * Math.PI * R;

    const track = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="rgba(255,255,255,0.04)" stroke-width="${SW}"/>`;

    let accumulated = 0;
    const sliceEls = slices.map(s => {
      const len    = s.frac * CIRC;
      const offset = -(accumulated * CIRC);
      accumulated += s.frac;
      const dim = state.focusedCat && state.focusedCat !== s.id ? "0.18" : "1";
      return `<circle
        cx="${CX}" cy="${CY}" r="${R}" fill="none"
        stroke="${s.color}" stroke-width="${SW}"
        stroke-dasharray="${len.toFixed(3)} ${CIRC.toFixed(3)}"
        stroke-dashoffset="${offset.toFixed(3)}"
        transform="rotate(-90 ${CX} ${CY})"
        opacity="${dim}"
        data-cat="${s.id}"
        class="bg-pie-slice"
        style="cursor:pointer;transition:opacity .2s,stroke-dasharray .5s cubic-bezier(.34,1.56,.64,1);"
      />`;
    }).join("");

    /* Center text */
    const focused = state.focusedCat ? slices.find(s => s.id === state.focusedCat) : null;
    const cAmt    = fmtMoney(focused ? focused.amount : total);
    const cLabel  = escHtml(focused ? focused.label : "total");
    const cPct    = focused ? `${Math.round(focused.frac * 100)}%` : "";
    const hole    = `<circle cx="${CX}" cy="${CY}" r="${R - SW / 2 - 2}"
      fill="var(--panel,#111117)"/>`;

    const cy1 = focused ? CY - 11 : CY - 5;
    const cy2 = focused ? CY + 5  : CY + 10;
    const cy3 = CY + 19;
    const textEls = `
      <text x="${CX}" y="${cy1}" text-anchor="middle"
            font-size="12" font-weight="800" fill="var(--text,#f2f2f5)"
            font-family="system-ui,-apple-system,sans-serif">${cAmt}</text>
      <text x="${CX}" y="${cy2}" text-anchor="middle"
            font-size="9" font-weight="600" fill="var(--muted,#a0a0aa)"
            font-family="system-ui,-apple-system,sans-serif">${cLabel}</text>
      ${focused ? `<text x="${CX}" y="${cy3}" text-anchor="middle"
            font-size="8" font-weight="700" fill="var(--muted,#a0a0aa)"
            font-family="system-ui,-apple-system,sans-serif">${cPct}</text>` : ""}
    `;

    const pieSVG = $("pieSVG");
    if (pieSVG) {
      pieSVG.innerHTML = `<g>${track}${sliceEls}</g>${hole}${textEls}`;
    }

    /* Legend / breakdown list */
    const pieLegend = $("pieLegend");
    if (pieLegend) {
      pieLegend.innerHTML = slices.map(s => `
        <div class="bg-leg-row${state.focusedCat === s.id ? " focused" : ""}"
             data-cat="${s.id}" role="listitem">
          <span class="bg-leg-dot" style="background:${s.color}"></span>
          <div class="bg-leg-info">
            <span class="bg-leg-name">${escHtml(s.icon)}&nbsp;${escHtml(s.label)}</span>
            <span class="bg-leg-pct">${Math.round(s.frac * 100)}%</span>
          </div>
          <div class="bg-leg-amt">${fmtMoney(s.amount)}</div>
        </div>
      `).join("");
    }
  }

  /* ── Transactions list ────────────────────────────────────────────── */
  function renderEntries() {
    const list    = $("entriesList");
    const emptyEl = $("entriesEmpty");
    const badge   = $("entriesBadge");
    if (!list) return;

    const sorted = [...state.entries].sort((a, b) =>
      (b.dateKey || b.date || "").localeCompare(a.dateKey || a.date || "")
    );

    if (sorted.length === 0) {
      list.style.display = "none";
      if (badge) badge.textContent = "";
      if (emptyEl) {
        emptyEl.style.display = "";
        updateEntriesEmptyState(emptyEl);
      }
      return;
    }

    list.style.display = "";
    if (badge)   badge.textContent   = String(sorted.length);
    if (emptyEl) emptyEl.style.display = "none";

    list.innerHTML = sorted.map(e => {
      const cat = getCat(e.category);
      const ds  = e.dateKey || e.date || "";
      let disp  = "";
      if (ds) {
        try {
          disp = new Date(ds + "T00:00:00").toLocaleDateString(undefined, {
            month: "short", day: "numeric",
          });
        } catch { disp = ds; }
      }
      return `
        <div class="bg-entry-card" data-id="${e.id}"
             ${e._pending ? 'data-pending="true"' : ""} role="listitem">
          <div class="bg-entry-icon"
               style="background:${cat.color}22;color:${cat.color}"
               aria-hidden="true">${escHtml(cat.icon)}</div>
          <div class="bg-entry-info">
            <div class="bg-entry-desc">${escHtml(e.description || cat.label)}</div>
            <div class="bg-entry-meta">
              <span class="bg-entry-cat">${escHtml(cat.label)}</span>
              ${disp ? `<span class="bg-entry-date">${escHtml(disp)}</span>` : ""}
            </div>
          </div>
          <div class="bg-entry-right">
            <div class="bg-entry-amt" style="color:${cat.color}">
              &minus;${fmtMoney(Math.abs(e.amount))}
            </div>
            <button class="bg-entry-del" data-id="${e.id}" type="button"
                    aria-label="Delete expense">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                   aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4
                         a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
          <div class="bg-entry-swipe-del" data-del="${e.id}">Delete</div>
        </div>
      `;
    }).join("");

    bindEntrySwipe();
  }

  /**
   * Updates the text/CTA inside the entries empty state based on whether
   * the user has accounts yet.  Guides the flow without a step-by-step wizard.
   */
  function updateEntriesEmptyState(emptyEl) {
    const hasAccounts = state.accounts.length > 0;
    const titleEl = emptyEl.querySelector(".bg-empty-title");
    const subEl   = emptyEl.querySelector(".bg-empty-sub");
    const ctaEl   = emptyEl.querySelector("#btnAddExpenseEmpty");

    if (titleEl) {
      titleEl.textContent = hasAccounts
        ? "No expenses yet"
        : "Start by adding an account";
    }
    if (subEl) {
      subEl.textContent = hasAccounts
        ? "Add an expense to see your spending breakdown."
        : "Add your first account (salary, cash, credit card\u2026) to begin tracking your budget.";
    }
    if (ctaEl) {
      /* Update button text and store intended action */
      ctaEl.dataset.emptyAction = hasAccounts ? "expense" : "account";
      ctaEl.innerHTML = hasAccounts
        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
             <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
           </svg>
           Add expense`
        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
             <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
           </svg>
           Add account`;
    }
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
        const cur = parseFloat(
          card.style.transform.replace("translateX(", "") || "0"
        );
        if (cur <= -55) {
          card.classList.add("swiped");
          card.style.transform = "translateX(-80px)";
        } else {
          card.classList.remove("swiped");
          card.style.transform = "";
        }
      });
    });
  }

  /* ════════════════════════════════════════════════════════════
     ACCOUNT SHEET
     ════════════════════════════════════════════════════════════ */
  function openAccountSheet(account) {
    state.sheet  = { type: "account", data: account || null };
    acctEditType = account?.type || "salary";

    setText("acctTitle",   account ? "Edit account" : "Add account");
    setVal("acctName",     account?.name    ?? "");
    setVal("acctBalance",  account?.balance ?? "");
    setVal("acctLimit",    account?.limit   ?? "");
    setVal("acctApr",      account?.apr     ?? "");
    setVal("acctNote",     account?.note    ?? "");

    renderAccountTypeRow(acctEditType);
    updateAccountFields(acctEditType);

    const del = $("acctDelete");
    if (del) del.style.display = account ? "" : "none";

    openOverlay("acctOverlay");
  }

  function renderAccountTypeRow(sel) {
    const row = $("acctTypeRow");
    if (!row) return;
    row.innerHTML = ACCOUNT_TYPES.map(t => `
      <button class="bg-type-btn${t.id === sel ? " active" : ""}"
              data-acct-type="${t.id}" type="button">
        <span class="bg-type-icon">${escHtml(t.icon)}</span>
        <span>${escHtml(t.label)}</span>
      </button>
    `).join("");
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
      isDebt ? "Amount owed" : isCredit ? "Current balance" : "Balance";
  }

  async function submitAccount() {
    const name = ($("acctName")?.value || "").trim();
    if (!name) { flashError("acctName"); return; }

    const balance = parseFloat($("acctBalance")?.value)  || 0;
    const limit   = $("acctLimit")?.value.trim()
      ? parseFloat($("acctLimit").value) : null;
    const apr     = $("acctApr")?.value.trim()
      ? parseFloat($("acctApr").value)   : null;
    const note    = ($("acctNote")?.value || "").trim();

    setBusy("acctSave", true);
    try {
      await saveAccount({
        id: state.sheet.data?.id, type: acctEditType, name, balance, limit, apr, note,
      });
      closeOverlay("acctOverlay");
      await loadAccounts();
      renderAll();
      updateBudgetMonthAggregate(state.month).catch(() => {});
    } catch (err) {
      console.warn("[Hbit] Save account:", err?.code, err?.message);
      showSheetError("acctSave", "Save failed — retry");
    } finally {
      setBusy("acctSave", false, "Save");
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
      showSheetError("acctDelete", "Error — retry");
    } finally {
      setBusy("acctDelete", false, "Delete account");
    }
  }

  /* ════════════════════════════════════════════════════════════
     EXPENSE SHEET
     ════════════════════════════════════════════════════════════ */
  function openExpenseSheet(expense) {
    state.sheet = { type: "expense", data: expense || null };
    expEditCat  = expense?.category || "other";

    setText("expTitle", expense ? "Edit expense" : "Add expense");
    setVal("expAmount", expense ? String(expense.amount) : "");
    setVal("expDesc",   expense?.description ?? "");
    setVal("expDate",   expense?.dateKey || expense?.date || todayKey());

    renderCatGrid(expEditCat);

    const del = $("expDelete");
    if (del) del.style.display = expense ? "" : "none";

    const sym = $("expCurrencySym");
    if (sym) sym.textContent = currencySymbol();

    openOverlay("expOverlay");
    setTimeout(() => $("expAmount")?.focus?.(), 380);
  }

  function renderCatGrid(sel) {
    const grid = $("catGrid");
    if (!grid) return;
    grid.innerHTML = CATEGORIES.map(c => `
      <button class="bg-cat-chip${c.id === sel ? " active" : ""}"
              data-exp-cat="${c.id}" type="button"
              style="--cat-color:${c.color}">
        <span class="bg-cat-icon">${escHtml(c.icon)}</span>
        <span class="bg-cat-name">${escHtml(c.label)}</span>
      </button>
    `).join("");
  }

  /**
   * Save an expense with OPTIMISTIC UI:
   * 1. Build the entry object locally.
   * 2. Add/replace it in state.entries immediately.
   * 3. Re-render instantly → pie + list update with zero perceived latency.
   * 4. Then write to Firestore in the background.
   * 5. On success: update the entry's id (for new entries).
   * 6. On failure: revert state.entries and show error.
   */
  async function submitExpense() {
    const rawAmount = parseFloat($("expAmount")?.value);
    if (!rawAmount || rawAmount <= 0) { flashError("expAmount"); return; }
    const amount  = Math.abs(rawAmount);
    const desc    = ($("expDesc")?.value  || "").trim();
    const dateKey = $("expDate")?.value   || todayKey();
    const month   = dateKey.slice(0, 7);
    const cat     = expEditCat;
    const editId  = state.sheet.data?.id || null;

    /* ── Step 1: close sheet immediately for premium feel ── */
    closeOverlay("expOverlay");

    /* ── Step 2: build local entry ── */
    const TEMP_ID = editId || ("tmp_" + Date.now());
    const localEntry = {
      id:          TEMP_ID,
      type:        "expense",
      amount,
      category:    cat,
      description: desc,
      dateKey,
      date:        dateKey,
      month,
      _pending:    true, // flag: Firestore write in-progress
    };

    /* ── Step 3: optimistic state update ── */
    const prevEntries = [...state.entries]; // snapshot for potential rollback
    if (editId) {
      state.entries = state.entries.map(e => e.id === editId ? localEntry : e);
    } else {
      state.entries = [...state.entries, localEntry];
    }
    renderAll(); // instant UI feedback

    /* ── Step 4: persist to Firestore ── */
    try {
      const realId = await persistExpense({
        id:          editId,
        amount,
        category:    cat,
        description: desc,
        dateKey,
      });

      /* replace temp entry with confirmed entry (real id) */
      state.entries = state.entries.map(e =>
        e.id === TEMP_ID
          ? { ...e, id: realId, _pending: false }
          : e
      );
      renderAll();
      updateBudgetMonthAggregate(month).catch(() => {});

    } catch (err) {
      console.warn("[Hbit] Save expense:", err?.code, err?.message);
      /* rollback optimistic update */
      state.entries = prevEntries;
      renderAll();
      /* re-open sheet with the user's values pre-filled so they can retry */
      openExpenseSheet({
        id:          editId,
        amount,
        category:    cat,
        description: desc,
        dateKey,
      });
      showSheetError("expSave", "Save failed — check connection and retry");
    }
  }

  /**
   * Delete an expense with OPTIMISTIC UI:
   * Remove from state first, render, then hit Firestore.
   */
  async function submitDeleteExpense(id) {
    const removed = state.entries.find(e => e.id === id);
    state.entries = state.entries.filter(e => e.id !== id);
    closeOverlay("expOverlay");
    renderAll(); // instant removal

    try {
      await removeExpense(id);
      updateBudgetMonthAggregate(state.month).catch(() => {});
    } catch (err) {
      console.warn("[Hbit] Delete expense:", err?.code, err?.message);
      /* revert */
      if (removed) state.entries = [...state.entries, removed];
      renderAll();
    }
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

  function t(key) {
    return (typeof HBIT?.i18n?.t === "function" ? HBIT.i18n.t(key) : null) || key;
  }

  function openHelp() {
    helpStepIndex = 0;
    updateHelpContent();
    const ov = $("helpOverlay");
    if (ov) {
      ov.setAttribute("aria-hidden", "false");
      ov.classList.add("open");
      document.body.style.overflow = "hidden";
    }
  }

  function closeHelp() {
    const ov = $("helpOverlay");
    if (ov) {
      ov.setAttribute("aria-hidden", "true");
      ov.classList.remove("open");
      document.body.style.overflow = "";
    }
  }

  function updateHelpContent() {
    setText("helpTitle", t("budget.help.title"));
    const step = HELP_STEPS[helpStepIndex];
    if (step) {
      setText("helpStepTitle", t(step.titleKey));
      setText("helpStepBody", t(step.bodyKey));
    }
    const backBtn = $("helpBack");
    const nextBtn = $("helpNext");
    if (backBtn) {
      backBtn.textContent = t("budget.help.back");
      backBtn.style.display = helpStepIndex === 0 ? "none" : "";
    }
    if (nextBtn) {
      nextBtn.textContent = helpStepIndex === HELP_STEPS.length - 1 ? t("budget.help.close") : t("budget.help.next");
    }
    const dotsEl = $("helpDots");
    if (dotsEl) {
      dotsEl.innerHTML = HELP_STEPS.map((_, i) =>
        `<span class="${i === helpStepIndex ? "active" : ""}" aria-hidden="true"></span>`
      ).join("");
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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
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
    setTimeout(() => {
      el.textContent = orig;
      el.style.background = "";
    }, 3000);
  }

  /* ── Event delegation ────────────────────────────────────────────── */
  function bindEvents() {
    /* Month navigation */
    ($("monthPrev") || {}).onclick = async () => {
      state.month = prevMonth(state.month);
      try { localStorage.setItem(LS_MONTH, state.month); } catch {}
      setText("monthLabel", monthLabel(state.month));
      await loadEntries();
      renderAll();
    };
    ($("monthNext") || {}).onclick = async () => {
      state.month = nextMonth(state.month);
      try { localStorage.setItem(LS_MONTH, state.month); } catch {}
      setText("monthLabel", monthLabel(state.month));
      await loadEntries();
      renderAll();
    };

    /* Help (lightbulb) */
    ($("bgHelpBtn") || {}).onclick = openHelp;
    ($("helpClose") || {}).onclick = closeHelp;
    ($("helpBack")  || {}).onclick = helpBack;
    ($("helpNext")  || {}).onclick = helpNext;
    ($("helpOverlay") || {}).addEventListener?.("click", e => {
      if (e.target.id === "helpOverlay") closeHelp();
    });

    /* Currency selector */
    ($("currencySelect") || {}).onchange = e => {
      state.currency = e.target.value || "CAD";
      saveCurrency(state.currency);
      renderAll();
    };

    /* FAB */
    ($("fabAdd") || {}).onclick = () => openExpenseSheet(null);

    /* Empty-state CTA — opens account sheet OR expense sheet depending on state */
    document.addEventListener("click", e => {
      const cta = e.target.closest("#btnAddExpenseEmpty");
      if (cta) {
        const action = cta.dataset.emptyAction;
        if (action === "account") openAccountSheet(null);
        else openExpenseSheet(null);
        return;
      }
    });

    /* Account sheet */
    ($("btnAddAccount") || {}).onclick = () => openAccountSheet(null);
    ($("acctSave")      || {}).onclick = submitAccount;
    ($("acctClose")     || {}).onclick = () => closeOverlay("acctOverlay");
    ($("acctDelete")    || {}).onclick = () => {
      const id = state.sheet.data?.id;
      if (id) submitDeleteAccount(id);
    };

    /* Expense sheet */
    ($("expSave")   || {}).onclick = submitExpense;
    ($("expClose")  || {}).onclick = () => closeOverlay("expOverlay");
    ($("expDelete") || {}).onclick = () => {
      const id = state.sheet.data?.id;
      if (id) submitDeleteExpense(id);
    };

    /* Close overlay by clicking backdrop */
    ($("acctOverlay") || {}).addEventListener?.("click", e => {
      if (e.target === $("acctOverlay")) closeOverlay("acctOverlay");
    });
    ($("expOverlay") || {}).addEventListener?.("click", e => {
      if (e.target === $("expOverlay")) closeOverlay("expOverlay");
    });

    /* ESC key */
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if ($("acctOverlay")?.classList.contains("open")) closeOverlay("acctOverlay");
      if ($("expOverlay")?.classList.contains("open"))  closeOverlay("expOverlay");
    });

    /* Global delegation for dynamically rendered elements */
    document.addEventListener("click", e => {

      /* Edit account (pencil on card) */
      const editBtn = e.target.closest(".bg-acct-edit");
      if (editBtn) {
        const a = state.accounts.find(x => x.id === editBtn.dataset.id);
        if (a) openAccountSheet(a);
        return;
      }

      /* Add account card (rendered by renderAccounts) */
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

      /* Category chip */
      const catChip = e.target.closest("[data-exp-cat]");
      if (catChip) {
        expEditCat = catChip.dataset.expCat;
        renderCatGrid(expEditCat);
        return;
      }

      /* Click entry card → open edit sheet */
      const card = e.target.closest(".bg-entry-card");
      if (card
          && !e.target.closest(".bg-entry-del")
          && !e.target.closest(".bg-entry-swipe-del")) {
        const entry = state.entries.find(x => x.id === card.dataset.id);
        if (entry && !entry._pending) openExpenseSheet(entry);
        return;
      }

      /* Delete button (desktop hover) */
      const delBtn = e.target.closest(".bg-entry-del");
      if (delBtn) { submitDeleteExpense(delBtn.dataset.id); return; }

      /* Swipe-reveal delete */
      const swipeDel = e.target.closest(".bg-entry-swipe-del");
      if (swipeDel) { submitDeleteExpense(swipeDel.dataset.del); return; }

      /* Pie slice focus */
      const pieSlice = e.target.closest(".bg-pie-slice");
      if (pieSlice) {
        const cat = pieSlice.dataset.cat;
        state.focusedCat = state.focusedCat === cat ? null : cat;
        renderPieChart();
        return;
      }

      /* Legend row focus */
      const legRow = e.target.closest(".bg-leg-row");
      if (legRow) {
        const cat = legRow.dataset.cat;
        state.focusedCat = state.focusedCat === cat ? null : cat;
        renderPieChart();
        return;
      }
    });

    /* Language change → reformat + update help if open */
    window.addEventListener("hbit:lang-changed", () => {
      renderAll();
      if ($("helpOverlay")?.classList.contains("open")) updateHelpContent();
    });

    /* Logout */
    ($("logoutBtn") || {}).addEventListener?.("click", async () => {
      try {
        await firebase.auth().signOut();
        window.location.replace("login.html");
      } catch (err) {
        console.error("[Hbit] Sign-out:", err.message);
      }
    });
  }

  /* ── One-time migration: old localStorage → Firestore ────────────── */
  async function migrateLocalStorage() {
    try {
      const raw = localStorage.getItem(LS_EXPENSES);
      if (!raw) return;
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) {
        localStorage.removeItem(LS_EXPENSES);
        return;
      }
      if (state.entries.length > 0) {
        localStorage.removeItem(LS_EXPENSES);
        return;
      }
      const today = todayKey();
      for (const exp of items) {
        if (!exp.name && !exp.amount) continue;
        await HBIT.db.budgetEntries.add({
          type:        "expense",
          amount:      Math.abs(+(exp.amount || 0)),
          category:    exp.category || "other",
          description: exp.name     || "",
          dateKey:     today,
          date:        today,
          month:       today.slice(0, 7),
        });
      }
      localStorage.removeItem(LS_EXPENSES);
      await loadEntries();
      renderAll();
    } catch (err) {
      console.warn("[Hbit] Budget migration:", err?.message);
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
    renderAll(); // immediate empty-state paint

    if (!window.firebase?.auth) return;

    firebase.auth().onAuthStateChanged(async user => {
      if (!user) { window.location.replace("login.html"); return; }

      state.uid = user.uid;

      /* Set avatar */
      try {
        const profile = await HBIT.getCurrentUserProfile?.();
        const name = profile?.fullName || user.displayName || user.email || "U";
        const av   = $("bgAvatar");
        if (av) av.textContent = name.charAt(0).toUpperCase();
      } catch { /* non-blocking */ }

      /* Load data from Firestore, then render */
      await Promise.all([loadAccounts(), loadEntries()]);
      migrateLocalStorage().catch(() => {});
      renderAll();
    });
  }

  HBIT.pages        = HBIT.pages || {};
  HBIT.pages.budget = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
