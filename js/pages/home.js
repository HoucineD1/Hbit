/* ==========================================================
   Hbit — js/pages/home.js
   Dashboard · 6-card grid · SVG micro-charts
   Firebase / Firestore reads fully preserved.
   ========================================================== */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $    = (id) => document.getElementById(id);

  /* ──────────────────────────────────────────────────────────
     CIRCUMFERENCES for SVG ring animations
     ────────────────────────────────────────────────────────── */
  const DONUT_CIRC = 2 * Math.PI * 18;   // module cards  r=18  ≈113.097

  /* Weekly summary concentric rings (r=30, r=21, r=12) */
  const WK_HABITS_CIRC = 2 * Math.PI * 30; // ≈188.496
  const WK_BUDGET_CIRC = 2 * Math.PI * 21; // ≈131.947
  const WK_SLEEP_CIRC  = 2 * Math.PI * 12; // ≈ 75.398

  /* ──────────────────────────────────────────────────────────
     TIME HELPERS
     ────────────────────────────────────────────────────────── */
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function shortDate(d) {
    try {
      return d.toLocaleDateString(undefined, {
        weekday: "short", month: "short", day: "numeric"
      });
    } catch { return ""; }
  }

  /* ──────────────────────────────────────────────────────────
     SVG RING HELPERS
     ────────────────────────────────────────────────────────── */

  /** Animate a donut ring (module cards, r=18). */
  function setDonut(fillId, pct) {
    const el = $(fillId);
    if (!el) return;
    el.style.strokeDashoffset = String(DONUT_CIRC * (1 - Math.max(0, Math.min(1, pct || 0))));
  }

  /** Animate one of the weekly summary concentric rings. */
  function setWeeklyRing(fillId, pct, circ) {
    const el = $(fillId);
    if (!el) return;
    el.style.strokeDashoffset = String(circ * (1 - Math.max(0, Math.min(1, pct || 0))));
  }

  /* ──────────────────────────────────────────────────────────
     CARD FOOTER TEXT
     ────────────────────────────────────────────────────────── */
  function setFooter(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  /* ──────────────────────────────────────────────────────────
     WEEKLY SUMMARY STATS (right-side text)
     ────────────────────────────────────────────────────────── */
  function setWeeklySummaryStats({ habitsPct, budgetPct, sleepAvg, moodAvg }) {
    if ($("wkHabitsText"))
      $("wkHabitsText").textContent = habitsPct != null
        ? `${Math.round(habitsPct * 100)}%` : "—";

    if ($("wkBudgetText"))
      $("wkBudgetText").textContent = budgetPct != null
        ? `${Math.round(budgetPct * 100)}%` : "—";

    if ($("wkSleepText"))
      $("wkSleepText").textContent = sleepAvg != null && sleepAvg > 0
        ? `${sleepAvg.toFixed(1)} h` : "—";

    if ($("wkMoodText"))
      $("wkMoodText").textContent = moodAvg != null && moodAvg > 0
        ? `${moodAvg.toFixed(1)} / 10` : "—";
  }

  /* ──────────────────────────────────────────────────────────
     SVG CHART RENDERERS
     ────────────────────────────────────────────────────────── */

  /**
   * Render 7-day mini bar chart inside an inline SVG.
   * viewBox="0 0 56 28"
   */
  function renderSleepBars(svgId, values, color) {
    const svg = $(svgId);
    if (!svg) return;

    const data = (values || []).slice(-7);
    while (data.length < 7) data.unshift(0);

    const W = 56, H = 28, n = 7, barW = 5, gap = 3;
    const total = n * barW + (n - 1) * gap;
    const xOff  = (W - total) / 2;
    const maxV  = Math.max(9, ...data);
    const col   = color || "#60A5FA";
    const dim   = col + "28";

    svg.innerHTML = data.map((v, i) => {
      const x  = xOff + i * (barW + gap);
      const bh = Math.round((Math.max(0, v) / maxV) * (H - 4));
      const y  = H - bh - 2;
      const r  = Math.min(2, barW / 2);
      const op = (0.65 + (i / n) * 0.35).toFixed(2);
      return `
        <rect x="${x}" y="2" width="${barW}" height="${H - 4}" rx="${r}" fill="${dim}"/>
        ${bh > 1
          ? `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="${r}" fill="${col}" opacity="${op}"/>`
          : ""}
      `;
    }).join("");
  }

  /**
   * Render a 7-point sparkline polyline.
   * viewBox="0 0 56 28"  Values are 0–10.
   */
  function renderMoodSparkline(polylineId, values) {
    const el = $(polylineId);
    if (!el) return;

    const data = (values || []).slice(-7);
    while (data.length < 7) data.unshift(null);

    const W = 56, H = 28, PAD = 4;
    const stepX = (W - PAD * 2) / (data.length - 1);

    const pts = data
      .map((v, i) => {
        if (v == null) return null;
        return `${(PAD + i * stepX).toFixed(1)},${(H - PAD - (v / 10) * (H - PAD * 2)).toFixed(1)}`;
      })
      .filter(Boolean);

    el.setAttribute("points", pts.join(" "));

    /* Subtle area fill */
    const svgEl = el.closest("svg");
    if (svgEl && pts.length > 1) {
      let area = svgEl.querySelector(".hc-spark-area");
      if (!area) {
        area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        area.setAttribute("class", "hc-spark-area");
        area.style.fill = "rgba(167,139,250,0.10)";
        svgEl.insertBefore(area, el);
      }
      const [fx] = pts[0].split(",");
      const [lx] = pts[pts.length - 1].split(",");
      area.setAttribute("points", `${fx},${H} ${pts.join(" ")} ${lx},${H}`);
    }
  }

  /** Update schedule progress bar + dot indicators. */
  function renderSchedule(pct, total, done) {
    const bar = $("scheduleBar");
    if (bar) bar.style.width = Math.round((pct || 0) * 100) + "%";

    const metric = $("scheduleMetric");
    if (metric)
      metric.innerHTML = `${Math.round((pct || 0) * 100)}<span class="hc-unit">&thinsp;%</span>`;

    const dotsWrap = $("scheduleDots");
    if (!dotsWrap) return;
    const n = Math.min(total || 0, 8);
    dotsWrap.innerHTML = n === 0 ? "" :
      Array.from({ length: n }, (_, i) =>
        `<span class="hc-prog-dot${i < (done || 0) ? " done" : ""}"></span>`
      ).join("");
  }

  /* ──────────────────────────────────────────────────────────
     DATA STUBS  (replace with real Firestore reads)
     ────────────────────────────────────────────────────────── */

  /** Fetch aggregated home summary. Returns safe zeros when empty. */
  async function fetchHomeSummary(uid) {
    return {
      habits:   { done: 0, total: 0, pct: 0 },
      budget:   { spent: 0, goal: 0, pct: 0, left: 0 },
      sleep:    { last: 0, pct: 0, avg: 0 },
      mood:     { score: null, label: "—", avg: 0 },
      schedule: { done: 0, total: 0, pct: 0 },
      weekly:   { habitsPct: 0, budgetPct: 0, sleepAvg: 0, moodAvg: 0 },
    };
  }

  /** Fetch last 7 days from a Firestore collection. Returns [0×7] when empty. */
  async function fetchLast7Days(uid, collectionName) {
    if (!HBIT.db || !uid) return [0, 0, 0, 0, 0, 0, 0];
    try {
      const results = await HBIT.db[collectionName]?.recent?.(7) ?? [];
      return results.map(r => r.duration ?? r.score ?? r.value ?? 0).reverse();
    } catch {
      return [0, 0, 0, 0, 0, 0, 0];
    }
  }

  /* ──────────────────────────────────────────────────────────
     HEADER RENDER
     ────────────────────────────────────────────────────────── */
  function renderHeader(profile) {
    const now = new Date();

    if ($("homeDate"))     $("homeDate").textContent     = shortDate(now).toUpperCase();
    if ($("greetingDate")) $("greetingDate").textContent = shortDate(now);
    if ($("greetingLabel")) $("greetingLabel").textContent = getGreeting();

    const name = profile?.fullName || profile?.name
               || firebase.auth().currentUser?.displayName || "there";

    if ($("greetingName")) $("greetingName").textContent = name;
    if ($("profileBtn"))   $("profileBtn").textContent   = name.charAt(0).toUpperCase();
  }

  /* ──────────────────────────────────────────────────────────
     EMPTY STATE
     ────────────────────────────────────────────────────────── */
  function renderEmpty() {
    /* Habits */
    if ($("habitsMetric"))
      $("habitsMetric").innerHTML = `0<span class="hc-unit">&thinsp;/&thinsp;0</span>`;
    setDonut("habitsDonutFill", 0);
    setFooter("habitsFooter", "No habits yet \u00B7 Create one");

    /* Budget */
    if ($("budgetMetric"))
      $("budgetMetric").innerHTML = `\u2014<span class="hc-unit">&thinsp;left</span>`;
    setDonut("budgetDonutFill", 0);
    setFooter("budgetFooter", "No entries yet \u00B7 Add an expense");

    /* Sleep */
    if ($("sleepMetric"))
      $("sleepMetric").innerHTML = `\u2014<span class="hc-unit">&thinsp;hrs</span>`;
    renderSleepBars("sleepBarsChart", [0,0,0,0,0,0,0], "#60A5FA");
    setFooter("sleepFooter", "No sleep logged \u00B7 Log last night");

    /* Mood */
    if ($("moodMetric")) $("moodMetric").textContent = "\u2014";
    renderMoodSparkline("moodSparkLine", []);
    setFooter("moodFooter", "No check-in \u00B7 Quick mood log");

    /* Schedule */
    renderSchedule(0, 0, 0);
    setFooter("scheduleFooter", "No tasks \u00B7 Add your first task");

    /* Weekly summary */
    setWeeklyRing("wkHabitsFill", 0, WK_HABITS_CIRC);
    setWeeklyRing("wkBudgetFill", 0, WK_BUDGET_CIRC);
    setWeeklyRing("wkSleepFill",  0, WK_SLEEP_CIRC);
    setWeeklySummaryStats({ habitsPct: null, budgetPct: null, sleepAvg: null, moodAvg: null });
  }

  /* ──────────────────────────────────────────────────────────
     FULL RENDER  (live Firestore data)
     ────────────────────────────────────────────────────────── */
  async function renderWithData(user) {
    const today     = new Date().toISOString().slice(0, 10);
    const weekStart = (() => {
      const d = new Date(); d.setDate(d.getDate() - 6);
      return d.toISOString().slice(0, 10);
    })();
    const thisMonth = today.slice(0, 7);

    let habits       = [];
    let habitLogs    = [];
    let budgetList   = [];
    let budgetAccts  = [];
    let sleepList    = [];
    let moodToday    = null;
    let moodWeek     = [];

    try {
      habits     = await HBIT.db.habits.list();
      habitLogs  = await HBIT.db.habitLogs.range(weekStart, today);
      budgetList = await HBIT.db.budgetEntries.forMonth(thisMonth);
      budgetAccts = await HBIT.db.budgetAccounts.list().catch(() => []);
      sleepList  = await HBIT.db.sleepLogs.recent(7);
      moodToday  = await HBIT.db.moodLogs.get(today);
    } catch (err) {
      console.warn("[Hbit] Firestore home read:", err?.message);
    }

    /* ── Habits ──────────────────────────────────────────── */
    const todayLogs   = habitLogs.filter(l => l.dateKey === today && l.status === "done");
    const totalHabits = habits.length;
    const doneToday   = todayLogs.length;
    const habitPct    = totalHabits > 0 ? doneToday / totalHabits : 0;

    if ($("habitsMetric"))
      $("habitsMetric").innerHTML = totalHabits > 0
        ? `${doneToday}<span class="hc-unit">&thinsp;/&thinsp;${totalHabits}</span>`
        : `0<span class="hc-unit">&thinsp;/&thinsp;0</span>`;
    setDonut("habitsDonutFill", habitPct);
    setFooter("habitsFooter",
      totalHabits === 0
        ? "No habits yet \u00B7 Create one"
        : doneToday === totalHabits
          ? "All done today \u00B7 Great work!"
          : `${totalHabits - doneToday} remaining today`);

    /* Weekly habits: avg completion across 7 days */
    const weekHabitDays = new Set(habitLogs.filter(l => l.status === "done").map(l => l.dateKey));
    const weekHabitPct  = totalHabits > 0 ? Math.min(1, weekHabitDays.size / 7) : 0;

    /* ── Budget (try budgetMonths aggregate first, fallback to computation) ── */
    let budgetMonthData = null;
    try {
      budgetMonthData = HBIT.db?.budgetMonths
        ? await HBIT.db.budgetMonths.get(thisMonth).catch(() => null)
        : null;
    } catch { /* ignore */ }

    let monthlySpent, income, remaining;
    if (budgetMonthData) {
      income       = budgetMonthData.incomeTotal  || 0;
      monthlySpent = budgetMonthData.expenseTotal || 0;
      remaining    = budgetMonthData.remaining    ?? (income - monthlySpent);
    } else {
      monthlySpent = budgetList
        .filter(e => e.type === "expense")
        .reduce((s, e) => s + (e.amount || 0), 0);
      income = (budgetAccts || [])
        .filter(a => (a.type === "salary" || a.type === "cash") && (a.balance || 0) > 0)
        .reduce((s, a) => s + (a.balance || 0), 0);
      remaining = income - monthlySpent;
    }

    const debt = (budgetAccts || [])
      .filter(a => a.type === "debt")
      .reduce((s, a) => s + Math.abs(a.balance || 0), 0);

    let monthGoal = 0;
    try {
      const goalDoc = await HBIT.db.budgetGoals.get(thisMonth).catch(() => null);
      monthGoal = goalDoc?.budgetLimit || 0;
    } catch { /* ignore */ }
    const budgetPct  = monthGoal > 0 ? Math.min(1, monthlySpent / monthGoal)
      : income > 0 ? Math.min(1, monthlySpent / income) : 0;
    const budgetLeft = monthGoal > 0 ? Math.max(0, monthGoal - monthlySpent) : remaining;

    function fmtCur(n) {
      const v = Number.isFinite(n) ? n : 0;
      try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
      } catch { return v + " $"; }
    }

    if ($("budgetMetric")) {
      if (income > 0 || monthlySpent > 0) {
        $("budgetMetric").innerHTML =
          remaining >= 0
            ? `${fmtCur(remaining)}<span class="hc-unit">&thinsp;left</span>`
            : `${fmtCur(Math.abs(remaining))}<span class="hc-unit">&thinsp;over</span>`;
      } else {
        $("budgetMetric").innerHTML = `\u2014<span class="hc-unit">&thinsp;left</span>`;
      }
    }
    setDonut("budgetDonutFill", income > 0 ? Math.max(0, 1 - budgetPct) : budgetPct);
    setFooter("budgetFooter",
      monthlySpent === 0 && income === 0
        ? "No entries yet \u00B7 Add an expense"
        : income > 0
          ? `${fmtCur(monthlySpent)} spent \u00B7 Tap to see breakdown`
          : "Tap to manage budget");

    /* ── Sleep ───────────────────────────────────────────── */
    const lastSleep = sleepList[0];
    const sleepH    = lastSleep?.duration || 0;
    const sleepPct  = sleepH > 0 ? Math.min(1, sleepH / 8) : 0;

    if ($("sleepMetric"))
      $("sleepMetric").innerHTML = sleepH > 0
        ? `${sleepH.toFixed(1)}<span class="hc-unit">&thinsp;hrs</span>`
        : `\u2014<span class="hc-unit">&thinsp;hrs</span>`;
    setFooter("sleepFooter",
      sleepH === 0
        ? "No sleep logged \u00B7 Log last night"
        : sleepH >= 7.5
          ? "Great night! \u00B7 View history"
          : "Below target \u00B7 View details");

    const sleepVals = sleepList.map(l => l.duration || 0).reverse();
    while (sleepVals.length < 7) sleepVals.unshift(0);
    renderSleepBars("sleepBarsChart", sleepVals, "#60A5FA");

    const sleepAvg = sleepVals.filter(v => v > 0).length > 0
      ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.filter(v => v > 0).length
      : 0;
    const weekSleepPct = sleepAvg > 0 ? Math.min(1, sleepAvg / 8) : 0;

    /* ── Mood ────────────────────────────────────────────── */
    let moodScore = null;
    if (moodToday?.score) {
      moodScore = moodToday.score;
      const label = moodScore >= 8 ? "Great" : moodScore >= 6 ? "Good" : moodScore >= 4 ? "Okay" : "Rough";
      if ($("moodMetric")) $("moodMetric").textContent = label;
      setFooter("moodFooter", `Score ${moodScore}/10 today \u00B7 View trends`);
    } else {
      if ($("moodMetric")) $("moodMetric").textContent = "\u2014";
      setFooter("moodFooter", "No check-in \u00B7 Quick mood log");
    }

    try {
      moodWeek = await fetchLast7Days(user.uid, "moodLogs");
    } catch { moodWeek = []; }
    renderMoodSparkline("moodSparkLine", moodWeek);

    const moodAvg = moodWeek.filter(v => v > 0).length > 0
      ? moodWeek.reduce((a, b) => a + b, 0) / moodWeek.filter(v => v > 0).length
      : 0;

    /* ── Schedule ────────────────────────────────────────── */
    renderSchedule(0, 0, 0);
    setFooter("scheduleFooter", "No tasks \u00B7 Add your first task");

    /* ── Weekly summary rings + stats (budget = remaining %) ───────── */
    const budgetHealth = (monthGoal > 0 || income > 0) ? Math.max(0, 1 - budgetPct) : null;
    setWeeklyRing("wkHabitsFill", weekHabitPct, WK_HABITS_CIRC);
    setWeeklyRing("wkBudgetFill", budgetHealth != null ? budgetHealth : 0, WK_BUDGET_CIRC);
    setWeeklyRing("wkSleepFill",  weekSleepPct, WK_SLEEP_CIRC);
    setWeeklySummaryStats({
      habitsPct: weekHabitPct,
      budgetPct: budgetHealth,
      sleepAvg:  sleepAvg > 0 ? sleepAvg : null,
      moodAvg:   moodAvg > 0  ? moodAvg  : null,
    });
  }

  /* ──────────────────────────────────────────────────────────
     LOGOUT
     ────────────────────────────────────────────────────────── */
  function initLogout() {
    const btn = $("logoutBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await firebase.auth().signOut();
        window.location.replace("index.html");
      } catch (err) {
        console.error("[Hbit] Sign-out:", err.message);
        btn.disabled = false;
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     INIT + AUTH GUARD
     ────────────────────────────────────────────────────────── */
  function init() {
    if (document.body.id !== "homePage") return;

    /* Render static parts immediately */
    if ($("homeDate"))     $("homeDate").textContent     = shortDate(new Date()).toUpperCase();
    if ($("greetingDate")) $("greetingDate").textContent = shortDate(new Date());
    if ($("greetingLabel")) $("greetingLabel").textContent = getGreeting();

    initLogout();

    if (!window.firebase || !firebase.auth) { renderEmpty(); return; }

    /*
     * SESSION persistence — user signs out when the browser tab closes.
     * Change to LOCAL if you want the session to survive browser restarts.
     */
    firebase.auth()
      .setPersistence(firebase.auth.Auth.Persistence.SESSION)
      .catch(err => console.warn("[Hbit] Persistence:", err.message));

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) { window.location.replace("login.html"); return; }

      /* Load (or auto-create) Firestore profile */
      let profile = null;
      try {
        profile = await HBIT.getCurrentUserProfile();
        if (!profile && HBIT.createUserProfile) {
          const provider = user.providerData?.[0]?.providerId || "password";
          await HBIT.createUserProfile(user, provider);
          profile = await HBIT.getCurrentUserProfile();
        }
      } catch (err) {
        console.warn("[Hbit] Profile load:", err.message);
      }

      renderHeader(profile);

      if (HBIT.db) {
        await renderWithData(user);
      } else {
        renderEmpty();
      }
    });
  }

  /* Public stubs */
  HBIT.home = { fetchHomeSummary, fetchLast7Days };

  HBIT.pages      = HBIT.pages || {};
  HBIT.pages.home = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
