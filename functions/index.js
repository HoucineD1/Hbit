"use strict";

const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { dateKey, generateInsights, weekKey } = require("./insightsCore");

admin.initializeApp();
const db = admin.firestore();

function startDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return dateKey(d);
}

function mapByDate(rows, dateField) {
  const out = new Map();
  rows.forEach((row) => {
    const key = row[dateField] || row.date || row.dateKey;
    if (!key) return;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(row);
  });
  return out;
}

async function readCollection(userRef, name, queryBuilder) {
  try {
    const col = userRef.collection(name);
    const snap = await (queryBuilder ? queryBuilder(col) : col).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    logger.warn(`insights read failed: ${name}`, { message: err.message });
    return [];
  }
}

async function buildUserInsightData(userRef) {
  const since = startDate(56);
  const month = dateKey(new Date()).slice(0, 7);
  const [
    habits,
    habitLogs,
    sleepLogs,
    moodLogs,
    budgetEntries,
    budgetPlanDoc,
    focusSessions,
  ] = await Promise.all([
    readCollection(userRef, "habits"),
    readCollection(userRef, "habitLogs", (col) => col.where("dateKey", ">=", since)),
    readCollection(userRef, "sleepLogs", (col) => col.where("date", ">=", since)),
    readCollection(userRef, "moodLogs", (col) => col.where("date", ">=", since)),
    readCollection(userRef, "budgetEntries", (col) => col.where("dateKey", ">=", since)),
    userRef.collection("budgetPlan").doc(month).get().catch(() => null),
    readCollection(userRef, "focus_sessions", (col) => col.where("dateKey", ">=", since)),
  ]);

  const activeHabits = habits.filter((habit) => !habit.archived);
  const logsByDate = mapByDate(habitLogs, "dateKey");
  const sleepByDate = mapByDate(sleepLogs, "date");
  const moodByDate = mapByDate(moodLogs, "date");
  const entriesByDate = mapByDate(budgetEntries, "dateKey");
  const focusByDate = mapByDate(focusSessions, "dateKey");
  const plan = budgetPlanDoc && budgetPlanDoc.exists ? budgetPlanDoc.data() : {};
  const monthlyBudget = Object.values(plan || {}).reduce((sum, value) => {
    const n = Number(value);
    return Number.isFinite(n) ? sum + Math.max(0, n) : sum;
  }, 0);
  const dailyBudget = monthlyBudget > 0 ? monthlyBudget / 30 : 0;

  const daily = [];
  for (let offset = 55; offset >= 0; offset -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const key = dateKey(d);
    const habitCompletions = (logsByDate.get(key) || []).filter((log) => log.status === "done").length;
    const sleep = (sleepByDate.get(key) || [])[0] || {};
    const mood = (moodByDate.get(key) || [])[0] || {};
    const spend = (entriesByDate.get(key) || [])
      .filter((entry) => (entry.type || "expense") === "expense")
      .reduce((sum, entry) => sum + Math.abs(Number(entry.amount) || 0), 0);
    const focusSessionsForDay = (focusByDate.get(key) || []).length;

    daily.push({
      date: key,
      activeHabits: activeHabits.length,
      habitCompletions,
      sleepHours: Number(sleep.duration || sleep.hours || 0),
      mood: Number(mood.score || mood.mood || 0),
      spend,
      dailyBudget,
      focusSessions: focusSessionsForDay,
    });
  }

  return { daily };
}

async function generateForUser(userDoc, now = new Date()) {
  const userRef = userDoc.ref;
  const key = weekKey(now);
  const insightRef = userRef.collection("insights").doc(key);
  const existing = await insightRef.get();
  if (existing.exists && existing.data()?.generatedAt) return { skipped: true, uid: userDoc.id };

  const data = await buildUserInsightData(userRef);
  const cards = generateInsights(data);
  await insightRef.set({
    id: key,
    weekKey: key,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: "weekly-cron",
    cards,
  }, { merge: true });
  return { skipped: false, uid: userDoc.id, count: cards.length };
}

exports.generateWeeklyInsights = onSchedule({
  schedule: "every monday 03:00",
  timeZone: "America/Toronto",
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 540,
}, async () => {
  const users = await db.collection("users").get();
  const results = [];
  for (const userDoc of users.docs) {
    results.push(await generateForUser(userDoc));
  }
  logger.info("weekly insights generated", { users: results.length, results });
});
