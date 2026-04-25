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
    if (!uid || !HBIT.fbFirestore || !HBIT.db) {
      /* silent */
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
      plan: null,
      weekly: { habitsPct: null, budgetPct: null, sleepAvg: null, moodAvg: null },
    };

    try {
      const userRef = HBIT.fbFirestore.collection("users").doc(uid);

      const [
        habitsSnap,
        habitLogsSnap,
        budgetEntriesMonth,
        budgetMonthDoc,
        budgetGoalsDoc,
        budgetAccountsList,
        budgetBillsList,
        savingsGoalsSnap,
        sleepLogsRecent,
        sleepPlansUpcoming,
        moodToday,
        moodRecent,
        tasksSnap,
      ] = await Promise.all([
        userRef.collection("habits").get().catch((e) => { /* silent */ return { docs: [] }; }),
        userRef.collection("habitLogs").where("dateKey", ">=", weekStart).where("dateKey", "<=", today).get().catch((e) => { /* silent */ return { docs: [] }; }),
        HBIT.db.budgetEntries.forMonth(thisMonth).catch(() => []),
        HBIT.db.budgetMonths?.get?.(thisMonth).catch(() => null) ?? null,
        HBIT.db.budgetGoals.get(thisMonth).catch(() => null),
        HBIT.db.budgetAccounts?.list?.().catch(() => []) ?? [],
        HBIT.db.budgetBills?.list?.().catch(() => []) ?? [],
        userRef.collection("savingsGoals").get().catch((e) => { /* silent */ return { docs: [] }; }),
        userRef.collection("sleepLogs").orderBy("date", "desc").limit(7).get().catch((e) => { /* silent */ return { docs: [] }; }),
        fetchNextSleepPlan(uid),
        userRef.collection("moodLogs").doc(today).get().catch((e) => { /* silent */ return { exists: false }; }),
        userRef.collection("moodLogs").orderBy("date", "desc").limit(7).get().catch((e) => { /* silent */ return { docs: [] }; }),
        userRef.collection("tasks").get().catch((e) => { /* silent */ return { docs: [] }; }),
      ]);

      const habitsList = habitsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(h => !h.archived);
      const habitLogsRange = habitLogsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sleepLogsArr = sleepLogsRecent.docs ? sleepLogsRecent.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      const moodTodayObj = moodToday.exists ? { id: moodToday.id, ...moodToday.data() } : null;
      const moodRecentArr = moodRecent.docs ? moodRecent.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      const tasksArr = tasksSnap.docs ? tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];

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

      const savingsGoalDocs = savingsGoalsSnap.docs ? savingsGoalsSnap.docs : [];
      const savingsGoalsCount = savingsGoalDocs.length;
      const savingsGoalsSavedTotal = savingsGoalDocs.reduce((sum, doc) => {
        const g = doc.data();
        return sum + (Number(g.savedAmount) || 0);
      }, 0);

      const debtLiabilityTotal = (budgetAccountsList || [])
        .filter((a) => a.type === "debt")
        .reduce((s, a) => s + Math.abs(Number(a.balance) || 0), 0);
      const creditLiabilityTotal = (budgetAccountsList || [])
        .filter((a) => a.type === "credit_card")
        .reduce((s, a) => s + Math.abs(Number(a.balance) || 0), 0);

      /* Bills summary */
      const today2 = new Date();
      const todayDay = today2.getDate();
      const unpaidBills = (budgetBillsList || []).filter(b => b.paidMonth !== thisMonth);
      const overdueBills = unpaidBills.filter(b => (b.dueDay || 1) < todayDay);
      const billsTotal = unpaidBills.reduce((s, b) => s + Math.abs(b.amount || 0), 0);

      out.budget = {
        incomeTotal,
        expenseTotal,
        remaining,
        monthGoal,
        lastEntry,
        billsCount: unpaidBills.length,
        overdueBillsCount: overdueBills.length,
        billsTotal,
        debtLiabilityTotal,
        creditLiabilityTotal,
        savingsGoalsCount,
        savingsGoalsSavedTotal,
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
      const lastSleep = sleepLogsArr[0] || null;
      const sleepWithDuration = sleepLogsArr.filter((l) => l.duration > 0);
      const sleepAvg = sleepWithDuration.length > 0
        ? sleepWithDuration.reduce((a, l) => a + (l.duration || 0), 0) / sleepWithDuration.length
        : null;
      out.sleep = {
        lastLog: lastSleep,
        nextPlan: sleepPlansUpcoming,
        recentHours: sleepLogsArr.map((l) => l.duration || 0),
        sleepAvg,
        hasData: !!lastSleep || !!sleepPlansUpcoming,
      };
      out.weekly.sleepAvg = sleepAvg;
      out.weekly.sleepPct = sleepAvg != null && sleepAvg > 0 ? Math.min(1, sleepAvg / 8) : null;

      /* ── State of Mind ────────────────────────────────────── */
      const lastMood = moodTodayObj || moodRecentArr[0] || null;
      const moodScores = moodRecentArr.map((m) => m.score).filter((s) => s != null && s > 0);
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

      const openTasks = tasksArr
        .filter((task) => !task.done)
        .sort((a, b) => {
          const da = a.date || "9999-12-31";
          const db = b.date || "9999-12-31";
          if (da !== db) return da.localeCompare(db);
          return (a.time || "24:00").localeCompare(b.time || "24:00");
        });
      out.plan = {
        total: tasksArr.length,
        open: openTasks.length,
        next: openTasks[0] || null,
        hasData: tasksArr.length > 0,
      };
    } catch (err) {
      /* silent */
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
    } catch (e) {
      /* silent */
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
        billsCount: 0,
        overdueBillsCount: 0,
        billsTotal: 0,
        debtLiabilityTotal: 0,
        creditLiabilityTotal: 0,
        savingsGoalsCount: 0,
        savingsGoalsSavedTotal: 0,
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
      plan: {
        total: 0,
        open: 0,
        next: null,
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
