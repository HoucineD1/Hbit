/* ==========================================================
   Hbit - js/pages/home.js
   Dashboard rendering from a single shared data source
   ========================================================== */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $ = (id) => document.getElementById(id);
  const PLANNER_KEY = "hbit:plan:items";

  const DONUT_CIRC = 2 * Math.PI * 18;
  const WK_HABITS_CIRC = 2 * Math.PI * 30;
  const WK_BUDGET_CIRC = 2 * Math.PI * 21;
  const WK_SLEEP_CIRC = 2 * Math.PI * 12;

  const state = {
    user: null,
    profile: null,
    listenersBound: false,
  };

  function getLang() {
    return HBIT.i18n?.getLang?.() || document.documentElement.lang || "en";
  }

  function tr(key, fallback, vars) {
    let text = HBIT.i18n?.t ? HBIT.i18n.t(key, fallback, getLang()) : fallback;
    if (!vars || typeof text !== "string") return text;
    return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
  }

  function shortDate(date) {
    try {
      const locale = getLang() === "fr" ? "fr-CA" : "en-CA";
      return new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return "";
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return tr("home.greeting.morning", "Good morning");
    if (hour < 18) return tr("home.greeting.afternoon", "Good afternoon");
    return tr("home.greeting.evening", "Good evening");
  }

  function formatCurrency(value, currency = "CAD") {
    const amount = Number.isFinite(value) ? value : 0;
    const locale = getLang() === "fr" ? "fr-CA" : "en-CA";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return String(Math.round(amount));
    }
  }

  function setMetricHtml(id, value, unit) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = `${value}<span class="hc-unit">&thinsp;${unit}</span>`;
  }

  function setFooter(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function readPlannerItems() {
    try {
      const raw = localStorage.getItem(PLANNER_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  function getPlannerSummary() {
    const items = readPlannerItems().filter((item) => item && typeof item.text === "string");
    const openItems = items.filter((item) => !item.done);
    return {
      total: items.length,
      open: openItems.length,
      next: openItems[0] || null,
      hasData: items.length > 0,
    };
  }

  function setDonut(fillId, pct) {
    const el = $(fillId);
    if (!el) return;
    const clamped = Math.max(0, Math.min(1, pct || 0));
    el.style.strokeDashoffset = String(DONUT_CIRC * (1 - clamped));
  }

  function setWeeklyRing(fillId, pct, circ) {
    const el = $(fillId);
    if (!el) return;
    const clamped = Math.max(0, Math.min(1, pct || 0));
    el.style.strokeDashoffset = String(circ * (1 - clamped));
  }

  function setWeeklySummaryStats({ habitsPct, budgetPct, sleepAvg, moodAvg }) {
    if ($("wkHabitsText")) {
      $("wkHabitsText").textContent = habitsPct != null ? `${Math.round(habitsPct * 100)}%` : "—";
    }
    if ($("wkBudgetText")) {
      $("wkBudgetText").textContent = budgetPct != null ? `${Math.round(budgetPct * 100)}%` : "—";
    }
    if ($("wkSleepText")) {
      $("wkSleepText").textContent = sleepAvg != null && sleepAvg > 0
        ? `${sleepAvg.toFixed(1)} ${tr("home.sleep.unit", "hrs")}`
        : "—";
    }
    if ($("wkMoodText")) {
      $("wkMoodText").textContent = moodAvg != null && moodAvg > 0
        ? `${moodAvg.toFixed(1)} / 10`
        : "—";
    }
  }

  function renderSleepBars(svgId, values, color) {
    const svg = $(svgId);
    if (!svg) return;

    const data = (values || []).slice(-7);
    while (data.length < 7) data.unshift(0);

    const width = 56;
    const height = 28;
    const barWidth = 5;
    const gap = 3;
    const total = data.length * barWidth + (data.length - 1) * gap;
    const xOffset = (width - total) / 2;
    const maxValue = Math.max(9, ...data);
    const dim = `${color}28`;

    svg.innerHTML = data.map((value, index) => {
      const x = xOffset + index * (barWidth + gap);
      const barHeight = Math.round((Math.max(0, value) / maxValue) * (height - 4));
      const y = height - barHeight - 2;
      const radius = Math.min(2, barWidth / 2);
      const opacity = (0.65 + (index / data.length) * 0.35).toFixed(2);
      return `
        <rect x="${x}" y="2" width="${barWidth}" height="${height - 4}" rx="${radius}" fill="${dim}"/>
        ${barHeight > 1
          ? `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="${radius}" fill="${color}" opacity="${opacity}"/>`
          : ""}
      `;
    }).join("");
  }

  function renderMoodSparkline(polylineId, values) {
    const line = $(polylineId);
    if (!line) return;

    const data = (values || []).slice(-7);
    while (data.length < 7) data.unshift(null);

    const width = 60;
    const height = 30;
    const pad = 5;
    const stepX = (width - pad * 2) / (data.length - 1);

    const points = data
      .map((value, index) => {
        if (value == null) return null;
        const x = (pad + index * stepX).toFixed(1);
        const y = (height - pad - (value / 10) * (height - pad * 2)).toFixed(1);
        return `${x},${y}`;
      })
      .filter(Boolean);

    line.setAttribute("points", points.join(" "));

    const svg = line.closest("svg");
    if (!svg) return;

    let area = svg.querySelector(".hc-spark-area");
    if (!area) {
      area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      area.setAttribute("class", "hc-spark-area");
      area.style.fill = "rgba(167,139,250,0.12)";
      svg.insertBefore(area, line);
    }

    if (points.length > 1) {
      const [firstX] = points[0].split(",");
      const [lastX] = points[points.length - 1].split(",");
      area.setAttribute("points", `${firstX},${height} ${points.join(" ")} ${lastX},${height}`);
    } else {
      area.setAttribute("points", "");
    }
  }

  function renderHeader(profile = state.profile) {
    const now = new Date();
    const currentUser = window.firebase?.auth ? firebase.auth().currentUser : null;
    const name = profile?.fullName || profile?.name || currentUser?.displayName || "there";

    if ($("homeDate")) $("homeDate").textContent = shortDate(now).toUpperCase();
    if ($("greetingDate")) $("greetingDate").textContent = shortDate(now);
    if ($("greetingLabel")) $("greetingLabel").textContent = getGreeting();
    if ($("greetingName")) $("greetingName").textContent = name;
    if ($("profileBtn")) $("profileBtn").textContent = (name.charAt(0) || "H").toUpperCase();
  }

  function renderEmpty() {
    setMetricHtml("habitsMetric", "0", "/ 0");
    setDonut("habitsDonutFill", 0);
    setFooter("habitsFooter", tr("home.habits.footer.empty", "No habits yet · Create one"));

    setMetricHtml("budgetMetric", "—", tr("home.budget.unit.left", "left"));
    setDonut("budgetDonutFill", 0);
    setFooter("budgetFooter", tr("home.budget.footer.empty", "No entries yet · Add an expense"));

    setMetricHtml("sleepMetric", "—", tr("home.sleep.unit", "hrs"));
    renderSleepBars("sleepBarsChart", [0, 0, 0, 0, 0, 0, 0], "#60A5FA");
    setFooter("sleepFooter", tr("home.sleep.footer.empty", "No sleep logged · Log last night"));

    if ($("moodMetric")) $("moodMetric").textContent = "—";
    renderMoodSparkline("moodSparkLine", []);
    setFooter("moodFooter", tr("home.mood.footer.empty", "No check-in · Quick mood log"));

    setMetricHtml("planMetric", "0", tr("home.plan.unit.open", "open"));
    setFooter("planFooter", tr("home.plan.footer.empty", "No tasks yet - Add your first one"));

    const suggestions = $("moodSuggestions");
    if (suggestions) suggestions.style.display = "none";

    setWeeklyRing("wkHabitsFill", 0, WK_HABITS_CIRC);
    setWeeklyRing("wkBudgetFill", 0, WK_BUDGET_CIRC);
    setWeeklyRing("wkSleepFill", 0, WK_SLEEP_CIRC);
    setWeeklySummaryStats({ habitsPct: null, budgetPct: null, sleepAvg: null, moodAvg: null });
  }

  function renderFromDashboard(data) {
    const habits = data?.habits || {};
    const budget = data?.budget || {};
    const sleep = data?.sleep || {};
    const mind = data?.mind || {};
    const weekly = data?.weekly || {};
    const planner = getPlannerSummary();

    setMetricHtml(
      "habitsMetric",
      String(habits.doneToday || 0),
      `/ ${habits.totalActive || 0}`
    );
    setDonut("habitsDonutFill", habits.pct || 0);
    setFooter(
      "habitsFooter",
      habits.totalActive === 0
        ? tr("home.habits.footer.empty", "No habits yet · Create one")
        : habits.doneToday === habits.totalActive
          ? tr("home.habits.footer.done", "All done today · Great work!")
          : tr("home.habits.footer.remaining", "{n} remaining today", {
              n: habits.totalActive - habits.doneToday,
            })
    );

    if (budget.hasData) {
      const currency = budget.lastEntry?.currency || "CAD";
      const unit = budget.remaining >= 0
        ? tr("home.budget.unit.left", "left")
        : tr("home.budget.unit.over", "over");
      setMetricHtml(
        "budgetMetric",
        formatCurrency(Math.abs(budget.remaining), currency),
        unit
      );
    } else {
      setMetricHtml("budgetMetric", "—", tr("home.budget.unit.left", "left"));
    }

    const budgetPct = budget.monthGoal > 0
      ? Math.min(1, (budget.expenseTotal || 0) / budget.monthGoal)
      : (budget.incomeTotal > 0 ? Math.min(1, (budget.expenseTotal || 0) / budget.incomeTotal) : 0);
    setDonut("budgetDonutFill", budget.incomeTotal > 0 ? Math.max(0, 1 - budgetPct) : budgetPct);
    /* Budget footer — prioritise bills alert over generic tip */
    let budgetFooterText;
    if (!budget.hasData && budget.billsCount === 0) {
      budgetFooterText = tr("home.budget.footer.empty", "No entries yet · Add an expense");
    } else if (budget.overdueBillsCount > 0) {
      budgetFooterText = getLang() === "fr"
        ? `${budget.overdueBillsCount} facture${budget.overdueBillsCount > 1 ? "s" : ""} en retard · Voir les factures`
        : `${budget.overdueBillsCount} overdue bill${budget.overdueBillsCount > 1 ? "s" : ""} · Tap to review`;
    } else if (budget.billsCount > 0) {
      budgetFooterText = getLang() === "fr"
        ? `${budget.billsCount} facture${budget.billsCount > 1 ? "s" : ""} à payer · ${formatCurrency(budget.billsTotal, "CAD")}`
        : `${budget.billsCount} bill${budget.billsCount > 1 ? "s" : ""} due · ${formatCurrency(budget.billsTotal, "CAD")}`;
    } else if (budget.incomeTotal > 0) {
      budgetFooterText = tr("home.budget.footer.spent", "{amount} spent · Tap to see breakdown", {
        amount: formatCurrency(budget.expenseTotal || 0, budget.lastEntry?.currency || "CAD"),
      });
    } else {
      budgetFooterText = tr("home.budget.footer.manage", "Tap to manage budget");
    }
    setFooter("budgetFooter", budgetFooterText);

    const lastSleepHours = sleep.lastLog?.duration || 0;
    setMetricHtml(
      "sleepMetric",
      lastSleepHours > 0 ? lastSleepHours.toFixed(1) : "—",
      tr("home.sleep.unit", "hrs")
    );
    setFooter(
      "sleepFooter",
      lastSleepHours === 0
        ? tr("home.sleep.footer.empty", "No sleep logged · Log last night")
        : lastSleepHours >= 7.5
          ? tr("home.sleep.footer.great", "Great night! · View history")
          : tr("home.sleep.footer.low", "Below target · View details")
    );
    renderSleepBars("sleepBarsChart", sleep.recentHours || [], "#60A5FA");

    const score = mind.score != null ? Number(mind.score) : null;
    if ($("moodMetric")) {
      $("moodMetric").textContent = score == null || score <= 0
        ? "—"
        : score >= 8
          ? tr("home.mood.label.great", "Great")
          : score >= 6
            ? tr("home.mood.label.good", "Good")
            : score >= 4
              ? tr("home.mood.label.okay", "Okay")
              : tr("home.mood.label.rough", "Rough");
    }
    setFooter(
      "moodFooter",
      score == null || score <= 0
        ? tr("home.mood.footer.empty", "No check-in · Quick mood log")
        : tr("home.mood.footer.score", "Score {score}/10 today · View trends", { score })
    );
    renderMoodSparkline("moodSparkLine", mind.recentScores || []);

    const suggestions = $("moodSuggestions");
    if (suggestions) {
      const show = mind.hasData && (mind.stress >= 7 || (mind.focus != null && mind.focus <= 3));
      suggestions.style.display = show ? "flex" : "none";
    }

    setMetricHtml("planMetric", String(planner.open), tr("home.plan.unit.open", "open"));
    setFooter(
      "planFooter",
      !planner.hasData
        ? tr("home.plan.footer.empty", "No tasks yet - Add your first one")
        : planner.open === 0
          ? tr("home.plan.footer.done", "All clear - Plan your next win")
          : tr("home.plan.footer.next", "Next: {task}", {
              task: planner.next?.text?.trim() || tr("home.plan.fallback", "Open planner"),
            })
    );

    setWeeklyRing("wkHabitsFill", weekly.habitsPct ?? 0, WK_HABITS_CIRC);
    setWeeklyRing("wkBudgetFill", weekly.budgetPct ?? 0, WK_BUDGET_CIRC);
    setWeeklyRing("wkSleepFill", weekly.sleepPct ?? 0, WK_SLEEP_CIRC);
    setWeeklySummaryStats({
      habitsPct: weekly.habitsPct ?? null,
      budgetPct: weekly.budgetPct ?? null,
      sleepAvg: weekly.sleepAvg ?? null,
      moodAvg: weekly.moodAvg ?? null,
    });
  }

  async function fetchHomeSummary(uid) {
    if (!uid || !HBIT.dashboardData?.fetch) {
      return HBIT.dashboardData?.getEmpty?.() || {};
    }
    return HBIT.dashboardData.fetch(uid);
  }

  async function refreshDashboard(user = state.user) {
    const planner = getPlannerSummary();

    if (!user) {
      renderEmpty();
      return;
    }

    try {
      const data = await fetchHomeSummary(user.uid);
      const hasAny = data?.budget?.hasData || data?.habits?.hasData || data?.sleep?.hasData || data?.mind?.hasData || planner.hasData;
      if (!hasAny) {
        renderEmpty();
        return;
      }
      renderFromDashboard(data);
    } catch {
      renderEmpty();
    }
  }

  function bindRefreshListeners() {
    if (state.listenersBound) return;
    state.listenersBound = true;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        renderHeader();
        refreshDashboard().catch(() => renderEmpty());
      }
    });

    window.addEventListener("focus", () => {
      renderHeader();
      refreshDashboard().catch(() => renderEmpty());
    });

    window.addEventListener("pageshow", () => {
      renderHeader();
      refreshDashboard().catch(() => renderEmpty());
    });

    window.addEventListener("hbit:lang-changed", () => {
      renderHeader();
      refreshDashboard().catch(() => renderEmpty());
    });

    window.addEventListener("hbit:data-changed", () => {
      refreshDashboard().catch(() => renderEmpty());
    });
  }

  function initLogout() {
    const btn = $("logoutBtn");
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await firebase.auth().signOut();
        window.location.replace("index.html");
      } catch {
        btn.disabled = false;
      }
    });
  }

  async function loadProfile(user) {
    try {
      let profile = await HBIT.getCurrentUserProfile?.();
      if (!profile && HBIT.createUserProfile) {
        const provider = user.providerData?.[0]?.providerId || "password";
        await HBIT.createUserProfile(user, provider);
        profile = await HBIT.getCurrentUserProfile?.();
      }
      state.profile = profile || null;
    } catch {
      state.profile = null;
    }
  }

  function init() {
    if (document.body.id !== "homePage") return;
    if (document.body.dataset.homeInit) return;
    document.body.dataset.homeInit = "1";

    bindRefreshListeners();
    initLogout();
    renderHeader();
    renderEmpty();

    if (!window.firebase || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        state.user = null;
        state.profile = null;
        window.location.replace("login.html");
        return;
      }

      state.user = user;
      await loadProfile(user);
      renderHeader();
      await refreshDashboard(user);
    });
  }

  HBIT.home = { fetchHomeSummary, refresh: refreshDashboard };
  HBIT.pages = HBIT.pages || {};
  HBIT.pages.home = { init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
