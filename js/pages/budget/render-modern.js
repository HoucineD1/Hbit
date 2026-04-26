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

  function renderHeader() {
    const d = new Date();
    setText("bgDate", d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase());
    setText("monthLabel", monthLabel(state.month));
    setText("bgHeaderTitle", t("nav.budget", "Budget"));
    const sel = $("currencySelect");
    if (sel) sel.value = state.currency;
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
          <div class="hbit-card bg-cat-row bg-planner-row bg-planner-row--plan" data-cat="${row.id}" role="listitem">
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
          <div class="hbit-card bg-cat-row bg-planner-row bg-planner-row--track" data-cat="${row.id}" data-has-limit="${limit > 0 ? "1" : "0"}" role="listitem" tabindex="0">
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
      <div class="hbit-card bg-tx-item bg-entry-card" data-id="${e.id}" ${e._pending ? 'data-pending="true"' : ""} role="listitem">
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
      <div class="hbit-sheet bg-monthend-card" role="dialog" aria-modal="true" aria-labelledby="bgMonthEndTitle">
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

  function renderOverviewDonut() {
    const ovIds = ["ovIncome", "ovSpent", "ovDebt", "ovRemaining"];
    if (!state.dataHydrated) {
      ovIds.forEach((id) => {
        const el = $(id);
        if (el) { el.classList.add("skeleton"); el.textContent = " "; }
      });
      const chip = $("netWorthChip");
      if (chip) { chip.classList.add("skeleton"); chip.textContent = " "; }
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

    setCountedMoney("ovIncome", income);
    setCountedMoney("ovSpent", spent);
    setCountedMoney("ovDebt", debt);
    setCountedMoney("ovRemaining", remaining);

    const remEl = $("ovRemaining");
    if (remEl) remEl.style.color = (income - spent) < 0 ? "var(--bgt-danger)" : "var(--bgt-text-1)";

    const chip = $("netWorthChip");
    if (chip) {
      chip.textContent = `${t("budget.networth", "Net worth")}: ${fmtMoney(netWorth)}`;
      chip.classList.toggle("negative", netWorth < 0);
    }

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
      return `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${s.color}" stroke-width="${SW}" stroke-dasharray="${len.toFixed(2)} ${CIRC.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${CX} ${CY})" style="transition:stroke-dasharray .5s ease"/>`;
    }).join("");

    const hole = `<circle cx="${CX}" cy="${CY}" r="${R - SW / 2 - 2}" fill="var(--bgt-surface-2)"/>`;
    const centerAmt   = fmtMoney(income);
    const centerLabel = income > 0 ? t("budget.income", "Income").toLowerCase() : "—";
    const textEls = `
      <text x="${CX}" y="${CY - 4}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--bgt-text-1)" font-family="system-ui,-apple-system,sans-serif">${escHtml(centerAmt)}</text>
      <text x="${CX}" y="${CY + 10}" text-anchor="middle" font-size="8" font-weight="600" fill="var(--bgt-text-3)" font-family="system-ui,-apple-system,sans-serif">${escHtml(centerLabel)}</text>`;

    svg.innerHTML = `<g>${track}${circles}</g>${hole}${textEls}`;
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
    if (state.billFilter === "paid") bills = bills.filter(b => isBillPaid(b));
    else if (state.billFilter === "unpaid") bills = bills.filter(b => !isBillPaid(b));
    else if (state.billFilter === "subscriptions") bills = bills.filter(b => b.category === "subscriptions" || b.frequency === "monthly");

    if (state.bills.length === 0) {
      list.innerHTML = "";
      list.style.display = "none";
      if (emptyEl) emptyEl.style.display = "";
      return;
    }

    list.style.display = "";
    if (emptyEl) emptyEl.style.display = bills.length ? "none" : "";

    const order = { overdue: 0, "due-soon": 1, upcoming: 2, paid: 3 };
    const sorted = [...bills].sort((a, b) => {
      const ao = order[billStatus(a, today)] ?? 2;
      const bo = order[billStatus(b, today)] ?? 2;
      if (ao !== bo) return ao - bo;
      return (Number(a.dueDay) || 1) - (Number(b.dueDay) || 1);
    });

    list.innerHTML = sorted.map(bill => {
      const cat    = getCat(bill.category);
      const status = billStatus(bill, today);
      const isPaid = status === "paid";
      const dueTxt = billDueText(bill, status);
      return `
        <div class="bg-bill-card ${escHtml(status)}" data-bill-id="${escHtml(bill.id)}" role="listitem">
          <div class="bg-bill-icon" style="background:${softColor(cat.color)};color:${cat.color}">${catIconSvg(cat.id, 18)}</div>
          <div class="bg-bill-info">
            <div class="bg-bill-name">${escHtml(bill.name || cat.label)}</div>
            <div class="bg-bill-meta">
              <span class="bg-bill-due">${escHtml(dueTxt)}</span>
              <span class="bg-bill-cat-tag">${escHtml(cat.label)}</span>
            </div>
          </div>
          <div class="bg-bill-right">
            <div class="bg-bill-amount">${fmtMoney(Number(bill.amount) || 0)}</div>
            <button class="bg-bill-paid-btn ${isPaid ? "paid" : "unpaid"}" data-pay="${escHtml(bill.id)}" type="button">
              ${escHtml(isPaid ? t("budget.bills.paid", "Paid") : t("budget.bills.markPaid", "Mark paid"))}
            </button>
          </div>
          <button class="bg-bill-edit-btn" data-edit-bill="${escHtml(bill.id)}" type="button" aria-label="${escHtml(t("budget.a11y.editRow", "Edit"))}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>`;
    }).join("");
  }

  function renderAccounts() {
    const list = $("accountsList");
    if (!list) return;
    list.innerHTML = "";

    if (!state.dataHydrated) {
      list.innerHTML = `<div class="bg-account-card skeleton" style="min-height:100px" aria-hidden="true"></div><div class="bg-account-card skeleton" style="min-height:100px" aria-hidden="true"></div>`;
      return;
    }

    if (state.accounts.length === 0) {
      const hint = document.createElement("div");
      hint.className = "bg-accounts-hint";
      hint.innerHTML = `
        <p class="bg-accounts-hint-text">${escHtml(t("budget.accounts.emptyHint", "No accounts yet. Add your first account to start tracking your budget."))}</p>
        <button class="bg-btn-primary" id="btnAddAccountHint" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          ${escHtml(t("budget.accounts.add", "Add account"))}
        </button>`;
      list.appendChild(hint);
      return;
    }

    state.accounts.forEach(acct => {
      const at   = getAcctType(acct.type);
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

      let utilBar = "";
      if (acct.type === "credit_card" && acct.limit) {
        const used     = Math.abs(acct.balance || 0);
        const pct      = Math.min((used / acct.limit) * 100, 100);
        const barColor = pct >= 80 ? "var(--bgt-spent)" : pct >= 50 ? "var(--bgt-orange)" : "var(--bgt-purple)";
        utilBar = `
          <div class="bg-acct-utilization-wrap">
            <div class="bg-acct-util-bar"><div class="bg-acct-util-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div></div>
            <div class="bg-acct-util-label">${pct.toFixed(0)}% used · ${fmtMoney(acct.limit)} limit</div>
          </div>`;
      }

      card.innerHTML = `
        <div class="bg-acct-head">
          <div class="bg-acct-name">${escHtml(acct.name)}</div>
          <span class="bg-acct-type-pill">${escHtml(at.label)}</span>
        </div>
        <div class="bg-acct-balance">${fmtMoney(acct.balance || 0)}</div>
        ${utilBar}
        ${acct.note ? `<div class="bg-acct-note">${escHtml(acct.note)}</div>` : `<div class="bg-acct-note">${escHtml(t("budget.accounts.noRecent", "No recent change"))}</div>`}
        <button class="bg-acct-edit" data-id="${escHtml(acct.id)}" type="button" aria-label="${escHtml(t("budget.a11y.editRow", "Edit"))}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>`;
      list.appendChild(card);
    });

    const addCard = document.createElement("div");
    addCard.className = "bg-account-add";
    addCard.id = "btnAddAccountCard";
    addCard.setAttribute("role", "button");
    addCard.setAttribute("tabindex", "0");
    addCard.setAttribute("aria-label", t("budget.accounts.add", "Add account"));
    addCard.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>${escHtml(t("budget.accounts.add", "Add account"))}</span>`;
    list.appendChild(addCard);
  }

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

