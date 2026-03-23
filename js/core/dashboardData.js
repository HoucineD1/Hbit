/* =====================================================================
   Hbit — js/core/dashboardData.js
   Single source of truth for HOME / OVERVIEW: fetches "last data" from
   Firestore for Budget, Habits, Sleep, State of Mind.
   Paths: /users/{uid}/budgetEntries, budgetMonths, budgetGoals,
          habits, habitLogs, sleepLogs, sleepPlans, moodLogs
   ===================================================================== */
(function () {
  "use strict";

  window.HBIT = window.HBIT || {};
  const HBIT = window.HBIT;

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function localMonthKey(date = new Date()) {
    return localDateKey(date).slice(0, 7);
  }

  /**
   * Fetch all dashboard summary data for the current user.
   * Call only when user is authenticated and HBIT.db is ready.
   * @param {string} uid - Current user UID
   * @returns {Promise<DashboardData>}
   */
  async function fetchDashboardData(uid) {
    if (!uid || !HBIT.db) {
      return getEmptyDashboard();
    }

    const now = new Date();
    const today = localDateKey(now);
    const thisMonth = localMonthKey(now);
    const weekStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return localDateKey(d);
    })();

    const out = {
      budget: null,
      habits: null,
      sleep: null,
      mind: null,
      weekly: { habitsPct: null, budgetPct: null, sleepAvg: null, moodAvg: null },
    };

    try {
      const [
        habitsList,
        habitLogsRange,
        budgetEntriesMonth,
        budgetMonthDoc,
        budgetGoalsDoc,
        budgetAccountsList,
        sleepLogsRecent,
        sleepPlansUpcoming,
        moodToday,
        moodRecent,
      ] = await Promise.all([
        HBIT.db.habits.list().catch(() => []),
        HBIT.db.habitLogs.range(weekStart, today).catch(() => []),
        HBIT.db.budgetEntries.forMonth(thisMonth).catch(() => []),
        HBIT.db.budgetMonths?.get?.(thisMonth).catch(() => null) ?? null,
        HBIT.db.budgetGoals.get(thisMonth).catch(() => null),
        HBIT.db.budgetAccounts?.list?.().catch(() => []) ?? [],
        HBIT.db.sleepLogs.recent(7).catch(() => []),
        fetchNextSleepPlan(uid),
        HBIT.db.moodLogs.get(today).catch(() => null),
        HBIT.db.moodLogs.recent(7).catch(() => []),
      ]);

      /* ── Budget ───────────────────────────────────────────── */
      let incomeTotal = 0, expenseTotal = 0, remaining = 0, monthGoal = 0;
      if (budgetMonthDoc) {
        incomeTotal = budgetMonthDoc.incomeTotal || 0;
        expenseTotal = budgetMonthDoc.expenseTotal || 0;
        remaining = budgetMonthDoc.remaining != null ? budgetMonthDoc.remaining : incomeTotal - expenseTotal;
      } else {
        expenseTotal = (budgetEntriesMonth || [])
          .filter((e) => e.type === "expense")
          .reduce((s, e) => s + (e.amount || 0), 0);
        incomeTotal = (budgetAccountsList || [])
          .filter((a) => (a.type === "salary" || a.type === "cash") && (a.balance || 0) > 0)
          .reduce((s, a) => s + (a.balance || 0), 0);
        remaining = incomeTotal - expenseTotal;
      }
      if (budgetGoalsDoc && budgetGoalsDoc.budgetLimit) {
        monthGoal = budgetGoalsDoc.budgetLimit;
      }
      const lastEntry = (budgetEntriesMonth || [])[0] || null;
      out.budget = {
        incomeTotal,
        expenseTotal,
        remaining,
        monthGoal,
        lastEntry,
        hasData: incomeTotal > 0 || expenseTotal > 0,
      };

      /* ── Habits ────────────────────────────────────────────── */
      const activeHabits = (habitsList || []).filter((h) => !h.archived);
      const todayDone = (habitLogsRange || []).filter((l) => l.dateKey === today && l.status === "done");
      const doneTodayCount = todayDone.length;
      const totalActive = activeHabits.length;
      const habitPct = totalActive > 0 ? doneTodayCount / totalActive : 0;
      const topHabits = activeHabits.slice(0, 5).map((h) => {
        const log = todayDone.find((l) => l.habitId === h.id);
        return {
          id: h.id,
          name: h.name,
          category: h.category,
          status: log?.status || null,
          doneDays: h.doneDays || 0,
          goalDays: h.goalDays || 30,
        };
      });
      const weekDoneDays = new Set((habitLogsRange || []).filter((l) => l.status === "done").map((l) => l.dateKey)).size;
      out.habits = {
        totalActive,
        doneToday: doneTodayCount,
        pct: habitPct,
        topHabits,
        weekDoneDays,
        hasData: totalActive > 0,
      };
      out.weekly.habitsPct = totalActive > 0 ? Math.min(1, weekDoneDays / 7) : null;

      /* ── Sleep ─────────────────────────────────────────────── */
      const lastSleep = (sleepLogsRecent || [])[0] || null;
      const sleepAvg =
        (sleepLogsRecent || []).filter((l) => l.duration > 0).length > 0
          ? (sleepLogsRecent || [])
              .filter((l) => l.duration > 0)
              .reduce((a, l) => a + (l.duration || 0), 0) /
            (sleepLogsRecent || []).filter((l) => l.duration > 0).length
          : null;
      out.sleep = {
        lastLog: lastSleep,
        nextPlan: sleepPlansUpcoming,
        recentHours: (sleepLogsRecent || []).map((l) => l.duration || 0),
        sleepAvg,
        hasData: !!lastSleep || !!sleepPlansUpcoming,
      };
      out.weekly.sleepAvg = sleepAvg;
      out.weekly.sleepPct = sleepAvg != null && sleepAvg > 0 ? Math.min(1, sleepAvg / 8) : null;

      /* ── State of Mind ────────────────────────────────────── */
      const lastMood = moodToday || (moodRecent || [])[0] || null;
      const moodScores = (moodRecent || []).map((m) => m.score).filter((s) => s != null && s > 0);
      const moodAvg = moodScores.length > 0 ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : null;
      out.mind = {
        lastEntry: lastMood,
        score: lastMood?.score ?? null,
        energy: lastMood?.energy ?? null,
        stress: lastMood?.stress ?? null,
        focus: lastMood?.focus ?? null,
        recentScores: moodScores.slice().reverse(),
        hasData: !!lastMood,
      };
      out.weekly.moodAvg = moodAvg;
      out.weekly.budgetPct =
        out.budget.monthGoal > 0 || out.budget.incomeTotal > 0
          ? Math.max(0, 1 - (out.budget.expenseTotal / (out.budget.monthGoal || out.budget.incomeTotal || 1)))
          : null;
    } catch (err) {
      console.warn("[Hbit dashboardData] fetch error:", err?.message);
      return getEmptyDashboard();
    }

    return out;
  }

  async function fetchNextSleepPlan(uid) {
    if (!HBIT.fbFirestore || !uid) return null;
    try {
      const col = HBIT.fbFirestore.collection("users").doc(uid).collection("sleepPlans");
      const snap = await col
        .where("status", "==", "planned")
        .orderBy("date", "asc")
        .limit(1)
        .get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch {
      return null;
    }
  }

  function getEmptyDashboard() {
    return {
      budget: {
        incomeTotal: 0,
        expenseTotal: 0,
        remaining: 0,
        monthGoal: 0,
        lastEntry: null,
        hasData: false,
      },
      habits: {
        totalActive: 0,
        doneToday: 0,
        pct: 0,
        topHabits: [],
        weekDoneDays: 0,
        hasData: false,
      },
      sleep: {
        lastLog: null,
        nextPlan: null,
        recentHours: [],
        sleepAvg: null,
        hasData: false,
      },
      mind: {
        lastEntry: null,
        score: null,
        energy: null,
        stress: null,
        focus: null,
        recentScores: [],
        hasData: false,
      },
      weekly: { habitsPct: null, budgetPct: null, sleepAvg: null, moodAvg: null },
    };
  }

  HBIT.dashboardData = {
    fetch: fetchDashboardData,
    getEmpty: getEmptyDashboard,
  };
})();
