/* Hbit - client-side demo data mode for investor walkthroughs */
(function () {
  "use strict";

  window.HBIT = window.HBIT || {};
  const KEY = "hbit:demoData:enabled";

  function isEnabled() {
    return localStorage.getItem(KEY) === "1";
  }

  function setEnabled(on) {
    localStorage.setItem(KEY, on ? "1" : "0");
    window.dispatchEvent(new CustomEvent("hbit:demo-data-change", { detail: { enabled: !!on } }));
  }

  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function monthKey(date = new Date()) {
    return dateKey(date).slice(0, 7);
  }

  function generate() {
    const now = new Date();
    const recentScores = [6, 7, 6, 8, 7, 8, 9];
    const recentHours = [6.8, 7.1, 7.4, 6.2, 7.8, 8.0, 7.6];
    return {
      budget: {
        incomeTotal: 5200,
        expenseTotal: 3180,
        remaining: 2020,
        monthGoal: 3900,
        lastEntry: { amount: 18.75, type: "expense", category: "food", currency: "CAD", dateKey: dateKey(now) },
        billsCount: 3,
        overdueBillsCount: 0,
        billsTotal: 410,
        debtLiabilityTotal: 1200,
        creditLiabilityTotal: 460,
        savingsGoalsCount: 2,
        savingsGoalsSavedTotal: 1850,
        hasData: true,
      },
      habits: {
        totalActive: 5,
        doneToday: 4,
        pct: 0.8,
        weekDoneDays: 6,
        topHabits: [
          { id: "demo-water", name: "Drink water", status: "done", doneDays: 24, goalDays: 30 },
          { id: "demo-walk", name: "10-minute walk", status: "done", doneDays: 19, goalDays: 30 },
          { id: "demo-plan", name: "Plan tomorrow", status: "done", doneDays: 16, goalDays: 30 },
        ],
        hasData: true,
      },
      sleep: {
        lastLog: { id: dateKey(now), date: dateKey(now), duration: 7.6, quality: 82 },
        nextPlan: { date: dateKey(now), bedtime: "22:45", wakeTime: "06:45", status: "planned" },
        recentHours,
        sleepAvg: 7.27,
        hasData: true,
      },
      mind: {
        lastEntry: { id: dateKey(now), date: dateKey(now), score: 8, energy: 7, stress: 3, focus: 8 },
        score: 8,
        energy: 7,
        stress: 3,
        focus: 8,
        recentScores,
        hasData: true,
      },
      plan: {
        total: 9,
        open: 3,
        next: { title: "Investor demo polish", date: dateKey(now), time: "14:30", priority: "high" },
        hasData: true,
      },
      streaks: {
        habits: 6,
        sleep: 5,
        mood: 7,
        budget: 4,
        focus: 3,
        plan: 2,
      },
      weekly: {
        habitsPct: 0.86,
        budgetPct: 0.72,
        sleepAvg: 7.27,
        sleepPct: 0.91,
        moodAvg: 7.3,
      },
      insights: [
        {
          id: "demo-sleep-budget",
          title: "Sleep protects spending",
          body: "On nights above 7.3h, daily spending is 24% lower the next day.",
          math: "Compared 42 nights of sleep against next-day budget entries.",
          confidence: 0.84,
          href: "budget.html",
        },
        {
          id: "demo-habits-focus",
          title: "Habits unlock focus",
          body: "Focus sessions are 68% more likely after two morning habits are completed.",
          math: "Cohort: mornings with 2+ habit logs vs mornings with 0-1.",
          confidence: 0.79,
          href: "focus.html",
        },
        {
          id: "demo-mood-plan",
          title: "Planning steadies mood",
          body: "Mood averages 1.4 points higher on days with a completed Plan task.",
          math: "Compared mood logs against completed planner days over 6 weeks.",
          confidence: 0.76,
          href: "plan.html",
        },
      ],
      demo: {
        enabled: true,
        generatedAt: new Date().toISOString(),
        month: monthKey(now),
      },
    };
  }

  window.HBIT.demoData = { isEnabled, setEnabled, generate };
})();
