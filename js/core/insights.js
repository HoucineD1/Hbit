/* ==========================================================
   Hbit - js/core/insights.js
   Pure helpers for cross-module insight generation.
   ========================================================== */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});

  function mean(values) {
    const nums = (values || []).map(Number).filter(Number.isFinite);
    if (!nums.length) return null;
    return nums.reduce((sum, value) => sum + value, 0) / nums.length;
  }

  function correlate(seriesA, seriesB) {
    const pairs = [];
    const byDate = new Map();
    (seriesA || []).forEach((point) => {
      if (!point || point.date == null || !Number.isFinite(Number(point.value))) return;
      byDate.set(String(point.date), Number(point.value));
    });
    (seriesB || []).forEach((point) => {
      if (!point || point.date == null || !Number.isFinite(Number(point.value))) return;
      const a = byDate.get(String(point.date));
      if (Number.isFinite(a)) pairs.push([a, Number(point.value)]);
    });
    if (pairs.length < 4) return { r: 0, n: pairs.length, confidence: 0 };
    const xs = pairs.map((p) => p[0]);
    const ys = pairs.map((p) => p[1]);
    const mx = mean(xs);
    const my = mean(ys);
    let num = 0;
    let dx = 0;
    let dy = 0;
    pairs.forEach(([x, y]) => {
      const ax = x - mx;
      const ay = y - my;
      num += ax * ay;
      dx += ax * ax;
      dy += ay * ay;
    });
    const denom = Math.sqrt(dx * dy);
    const r = denom ? num / denom : 0;
    return { r, n: pairs.length, confidence: Math.min(1, pairs.length / 21) };
  }

  function streakAnalysis(events, predicate) {
    const sorted = (events || [])
      .filter(Boolean)
      .slice()
      .sort((a, b) => String(a.date || a.dateKey || "").localeCompare(String(b.date || b.dateKey || "")));
    let current = 0;
    let longest = 0;
    let run = 0;
    sorted.forEach((event) => {
      if (predicate(event)) {
        run += 1;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    });
    current = run;
    return { current, longest, total: sorted.length };
  }

  function cohort(options) {
    const items = (options && options.items) || [];
    const slice = options && options.slice;
    const filtered = items.filter((item) => {
      if (slice === "high-spend") return Number(item.spend || item.expense || 0) > Number(item.budget || item.limit || 0);
      if (slice === "low-mood") return Number(item.mood || item.score || 0) > 0 && Number(item.mood || item.score || 0) <= 4;
      if (slice === "low-sleep") return Number(item.sleepHours || item.sleep || 0) > 0 && Number(item.sleepHours || item.sleep || 0) < 6;
      if (slice === "high-habit") return Number(item.habitCompletions || item.habits || 0) >= 4;
      return false;
    });
    return { slice, items: filtered, count: filtered.length, total: items.length };
  }

  function insight(id, title, body, math, modules, href, confidence) {
    return {
      id,
      title,
      body,
      math,
      sourceModules: modules,
      href,
      confidence: confidence == null ? 0.5 : confidence,
    };
  }

  function generateFromDashboard(summary, t) {
    const tr = typeof t === "function" ? t : function (_key, fallback, vars) {
      return String(fallback || "").replace(/\{(\w+)\}/g, function (_, key) {
        return vars && vars[key] != null ? String(vars[key]) : "";
      });
    };
    const data = summary || {};
    if (Array.isArray(data.insights) && data.insights.length) {
      return data.insights.slice(0, 3);
    }
    const weekly = data.weekly || {};
    const habits = data.habits || {};
    const budget = data.budget || {};
    const sleep = data.sleep || {};
    const mind = data.mind || {};
    const cards = [];

    if (weekly.sleepAvg > 0 && weekly.moodAvg > 0) {
      const sleepLabel = weekly.sleepAvg >= 7 ? tr("insights.sleep.good", "strong") : tr("insights.sleep.low", "thin");
      cards.push(insight(
        "sleep-mood",
        tr("insights.sleepMood.title", "Sleep is your mood lever"),
        tr("insights.sleepMood.body", "This week your average sleep was {sleep}h and your mood averaged {mood}/10.", {
          sleep: Number(weekly.sleepAvg).toFixed(1),
          mood: Number(weekly.moodAvg).toFixed(1),
        }),
        tr("insights.sleepMood.math", "7-day averages: sleep {sleep}h, mood {mood}/10. Signal strength: {label}.", {
          sleep: Number(weekly.sleepAvg).toFixed(1),
          mood: Number(weekly.moodAvg).toFixed(1),
          label: sleepLabel,
        }),
        ["sleep", "mood"],
        "sleep.html",
        0.62
      ));
    }

    if (habits.totalActive > 0) {
      const pct = Math.round((habits.pct || 0) * 100);
      cards.push(insight(
        "habit-momentum",
        tr("insights.habitMomentum.title", "Habit momentum is your anchor"),
        tr("insights.habitMomentum.body", "You completed {done}/{total} habits today. Keep the first win early and Plan gets easier.", {
          done: habits.doneToday || 0,
          total: habits.totalActive || 0,
        }),
        tr("insights.habitMomentum.math", "Today completion: {pct}%. Source: Habits + Plan readiness.", { pct }),
        ["habits", "plan"],
        "habits.html",
        Math.max(0.35, (habits.pct || 0))
      ));
    }

    if (budget.hasData) {
      const remaining = Number(budget.remaining || 0);
      cards.push(insight(
        "budget-pressure",
        remaining >= 0
          ? tr("insights.budgetPressure.goodTitle", "Budget pressure is contained")
          : tr("insights.budgetPressure.overTitle", "Budget pressure needs attention"),
        remaining >= 0
          ? tr("insights.budgetPressure.goodBody", "You still have room this month. Pair spending reviews with your weekly planning block.")
          : tr("insights.budgetPressure.overBody", "You are over your current monthly budget. Review bills and variable spend before adding new goals."),
        tr("insights.budgetPressure.math", "Month signal: income {income}, expenses {expenses}, remaining {remaining}.", {
          income: Math.round(Number(budget.incomeTotal || 0)),
          expenses: Math.round(Number(budget.expenseTotal || 0)),
          remaining: Math.round(remaining),
        }),
        ["budget", "plan"],
        "budget.html",
        budget.monthGoal > 0 ? 0.68 : 0.42
      ));
    }

    if (cards.length < 3 && mind.score > 0) {
      cards.push(insight(
        "mood-checkin",
        tr("insights.moodCheck.title", "Mood data is coming online"),
        tr("insights.moodCheck.body", "Your latest mood score is {score}/10. A few more check-ins will unlock stronger weekly patterns.", {
          score: mind.score,
        }),
        tr("insights.moodCheck.math", "Minimum guard: 4+ weeks gives stronger correlations. Current card uses latest mood score.", {}),
        ["mood"],
        "mood.html",
        0.3
      ));
    }

    if (cards.length === 0) {
      cards.push(insight(
        "fallback-0",
        tr("insights.fallback.title", "Check back next Monday"),
        tr("insights.fallback.body", "Log sleep, mood, habits, budget and focus for a few more days so Hbit can connect the dots."),
        tr("insights.fallback.math", "Insight rules need enough samples before showing correlation claims."),
        ["overview"],
        "home.html",
        0.1
      ));
    }

    return cards.slice(0, 3);
  }

  async function loadLatest(uid) {
    if (!uid || !HBIT.fbFirestore) return [];
    const snap = await HBIT.fbFirestore
      .collection("users")
      .doc(uid)
      .collection("insights")
      .orderBy("weekKey", "desc")
      .limit(1)
      .get();
    if (snap.empty) return [];
    const doc = snap.docs[0];
    const data = doc.data() || {};
    return Array.isArray(data.cards) ? data.cards : [];
  }

  HBIT.insights = {
    correlate,
    streakAnalysis,
    cohort,
    generateFromDashboard,
    loadLatest,
  };
})();
