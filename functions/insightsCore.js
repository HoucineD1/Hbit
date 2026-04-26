"use strict";

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + 1);
  return dateKey(d);
}

function mean(values) {
  const nums = (values || []).map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function correlate(seriesA, seriesB) {
  const byDate = new Map();
  (seriesA || []).forEach((point) => {
    if (!point || !point.date || !Number.isFinite(Number(point.value))) return;
    byDate.set(String(point.date), Number(point.value));
  });
  const pairs = [];
  (seriesB || []).forEach((point) => {
    if (!point || !point.date || !Number.isFinite(Number(point.value))) return;
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
  return { r, n: pairs.length, confidence: Math.min(1, pairs.length / 28) };
}

function streakAnalysis(events, predicate) {
  const sorted = (events || [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => String(a.date || a.dateKey || "").localeCompare(String(b.date || b.dateKey || "")));
  let run = 0;
  let longest = 0;
  sorted.forEach((event) => {
    if (predicate(event)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  });
  return { current: run, longest, total: sorted.length };
}

function cohort({ slice, items }) {
  const filtered = (items || []).filter((item) => {
    if (slice === "high-spend") return Number(item.spend || 0) > Number(item.budget || 0);
    if (slice === "low-mood") return Number(item.mood || 0) > 0 && Number(item.mood || 0) <= 4;
    if (slice === "low-sleep") return Number(item.sleepHours || 0) > 0 && Number(item.sleepHours || 0) < 6;
    if (slice === "high-habit") return Number(item.habitCompletions || 0) >= 4;
    return false;
  });
  return { slice, items: filtered, count: filtered.length, total: (items || []).length };
}

function insight(id, title, body, math, sourceModules, href, confidence) {
  return {
    id,
    title,
    body,
    math,
    sourceModules,
    href,
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
  };
}

function generateInsights(data) {
  const daily = data.daily || [];
  const out = [];

  const sleepSeries = daily.map((d) => ({ date: d.date, value: d.sleepHours })).filter((d) => d.value > 0);
  const moodSeries = daily.map((d) => ({ date: d.date, value: d.mood })).filter((d) => d.value > 0);
  const habitSeries = daily.map((d) => ({ date: d.date, value: d.habitCompletions || 0 }));
  const spendSeries = daily.map((d) => ({ date: d.date, value: d.spend || 0 }));
  const focusSeries = daily.map((d) => ({ date: d.date, value: d.focusSessions || 0 }));

  const sleepMood = correlate(sleepSeries, moodSeries);
  if (sleepMood.n >= 4 && Math.abs(sleepMood.r) >= 0.25) {
    out.push(insight(
      "sleep-mood-correlation",
      "Sleep is shaping your mood",
      sleepMood.r > 0
        ? `Higher-sleep days are tracking with better mood across ${sleepMood.n} matched days.`
        : `Your sleep and mood moved in opposite directions across ${sleepMood.n} matched days.`,
      `Pearson r=${sleepMood.r.toFixed(2)} over ${sleepMood.n} date-aligned sleep and mood samples.`,
      ["sleep", "mood"],
      "sleep.html",
      sleepMood.confidence * Math.abs(sleepMood.r)
    ));
  }

  const habitFocus = correlate(habitSeries, focusSeries);
  if (habitFocus.n >= 4 && habitFocus.r >= 0.2) {
    out.push(insight(
      "habits-focus-correlation",
      "Habits are feeding focus",
      `Days with more habit completions are also showing more focus sessions.`,
      `Pearson r=${habitFocus.r.toFixed(2)} over ${habitFocus.n} aligned habit/focus days.`,
      ["habits", "focus"],
      "focus.html",
      habitFocus.confidence * habitFocus.r
    ));
  }

  const highSpendDays = daily.filter((d) => Number(d.spend || 0) > Number(d.dailyBudget || 0) && Number(d.dailyBudget || 0) > 0);
  if (highSpendDays.length >= 3 && sleepSeries.length >= 4) {
    const highSpendSleep = mean(highSpendDays.map((d) => d.sleepHours).filter((v) => v > 0));
    const normalSleep = mean(daily.filter((d) => !highSpendDays.includes(d)).map((d) => d.sleepHours).filter((v) => v > 0));
    if (highSpendSleep && normalSleep && Math.abs(highSpendSleep - normalSleep) >= 0.3) {
      const deltaMin = Math.round((normalSleep - highSpendSleep) * 60);
      out.push(insight(
        "spend-sleep-delta",
        "Spending days change your sleep",
        deltaMin > 0
          ? `On over-budget days, you slept ${Math.abs(deltaMin)} minutes less on average.`
          : `On over-budget days, you slept ${Math.abs(deltaMin)} minutes more on average.`,
        `Compared ${highSpendDays.length} over-budget days against baseline sleep across the 8-week window.`,
        ["budget", "sleep"],
        "budget.html",
        Math.min(1, highSpendDays.length / 8)
      ));
    }
  }

  const lowSleepNextHabits = daily.slice(0, -1)
    .filter((d) => d.sleepHours > 0 && d.sleepHours < 6)
    .map((d) => {
      const idx = daily.indexOf(d);
      return daily[idx + 1]?.habitCompletions;
    })
    .filter(Number.isFinite);
  if (lowSleepNextHabits.length >= 3) {
    const lowSleepAvg = mean(lowSleepNextHabits);
    const allHabitAvg = mean(daily.map((d) => d.habitCompletions || 0));
    if (allHabitAvg != null && lowSleepAvg != null && lowSleepAvg < allHabitAvg) {
      const drop = Math.round(((allHabitAvg - lowSleepAvg) / Math.max(1, allHabitAvg)) * 100);
      out.push(insight(
        "sleep-habits-next-day",
        "Low sleep weakens tomorrow",
        `After nights under 6h, habit completions drop about ${drop}% the next day.`,
        `Compared next-day habit completions after ${lowSleepNextHabits.length} low-sleep nights against all-day habit average.`,
        ["sleep", "habits"],
        "habits.html",
        Math.min(1, lowSleepNextHabits.length / 8)
      ));
    }
  }

  const habitStreak = streakAnalysis(daily, (d) => Number(d.habitCompletions || 0) > 0);
  if (habitStreak.longest >= 3) {
    out.push(insight(
      "habit-streak",
      "Your consistency has a spine",
      `Your longest recent habit streak is ${habitStreak.longest} days.`,
      `Computed from daily habit completions over ${habitStreak.total} days.`,
      ["habits"],
      "habits.html",
      Math.min(1, habitStreak.longest / 14)
    ));
  }

  out.sort((a, b) => b.confidence - a.confidence);
  while (out.length < 3) {
    out.push(insight(
      `fallback-${out.length}`,
      "Check back next Monday",
      "Keep logging sleep, mood, habits, budget and focus so Hbit can connect stronger patterns.",
      "Minimum guard: correlation cards need enough date-aligned samples before claiming a pattern.",
      ["overview"],
      "home.html",
      0.1
    ));
  }
  return out.slice(0, 3);
}

module.exports = {
  cohort,
  correlate,
  dateKey,
  generateInsights,
  streakAnalysis,
  weekKey,
};
