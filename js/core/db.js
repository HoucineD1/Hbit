/* =====================================================================
   Hbit — js/core/db.js
   Firestore data layer — all data stored under /users/{uid}/…

   NEW STRUCTURE (subcollections — no top-level collections):
   ───────────────────────────────────────────────────────────────────
   /users/{uid}                        ← profile doc
   /users/{uid}/habits/{habitId}       ← habit definitions
   /users/{uid}/habitLogs/{logId}      ← daily completion records
   /users/{uid}/budgetEntries/{id}     ← income & expense transactions
   /users/{uid}/budgetGoals/{YYYY-MM}  ← monthly budget targets
   /users/{uid}/sleepLogs/{YYYY-MM-DD} ← nightly sleep records
   /users/{uid}/sleepSettings/default ← sleep preferences (singleton)
   /users/{uid}/moodLogs/{YYYY-MM-DD}  ← daily mood / energy / stress

   FUTURE: wearable field schema (Apple Watch / Oura Ring — not yet implemented):
   wearable: {
     source:  'apple_watch' | 'oura',
     hrv:     Number,          // ms — Heart Rate Variability
     spo2:    Number,          // % — Blood Oxygen
     stages: {
       deep:  Number,          // minutes
       rem:   Number,          // minutes
       light: Number,          // minutes
       awake: Number,          // minutes
     }
   }

   KEY CHANGES vs. previous version:
   • All data lives under /users/{uid}/...  (no top-level collections)
   • Documents do NOT require a "userId" field — ownership is in the path
   • All .where("userId","==", …) filters removed
   • habitLogs schema aligned with habits.js: dateKey + status ('done'|'skip')
   • Compound doc-IDs no longer carry the uid prefix
   • getUidOrThrow(), userDocRef(), userSubcollectionRef() exposed globally
   • Every async method logs the real error before re-throwing
   ===================================================================== */

(function () {
  "use strict";

  window.HBIT = window.HBIT || {};
  const HBIT  = window.HBIT;

  /* ═══════════════════════════════════════════════════════════════
     INTERNAL PRIMITIVES
     ═══════════════════════════════════════════════════════════════ */

  /** Returns the Firestore instance (throws if not ready). */
  function fs() {
    if (!HBIT.fbFirestore)
      throw new Error("[Hbit db] Firestore not initialised — load firebase-init.js first");
    return HBIT.fbFirestore;
  }

  /**
   * Returns the current user's UID.
   * Throws immediately (synchronous) if nobody is signed in so callers
   * can catch it before making any network request.
   */
  function getUidOrThrow() {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("[Hbit db] No authenticated user");
    return user.uid;
  }

  /** DocumentReference for /users/{uid} */
  function userDocRef(uid) {
    return fs().collection("users").doc(uid);
  }

  /** CollectionReference for /users/{uid}/{name} (any subcollection) */
  function userSubcollectionRef(uid, name) {
    return userDocRef(uid).collection(name);
  }

  /** Server timestamp shorthand */
  function now() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  /** DocumentSnapshot → plain JS object (with `id`), or null if missing. */
  function snap2obj(doc) {
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  /** QuerySnapshot → array of plain JS objects. */
  function query2arr(qs) {
    return qs.docs.map(snap2obj);
  }

  /** Logs the real error then re-throws it (no more silent failures). */
  function logAndThrow(context, err) {
    console.error(`[Hbit db] ${context} —`, err?.code || "", err?.message || err);
    throw err;
  }

  /* ═══════════════════════════════════════════════════════════════
     USERS   /users/{uid}
     ═══════════════════════════════════════════════════════════════ */
  const users = {
    /** Fetch the current user's profile. Returns null if not found. */
    async get() {
      try {
        const doc = await userDocRef(getUidOrThrow()).get();
        return snap2obj(doc);
      } catch (err) { return logAndThrow("users.get", err); }
    },

    /** Fetch any user's profile by UID (for profile page). */
    async getById(userId) {
      try {
        const doc = await userDocRef(userId).get();
        return snap2obj(doc);
      } catch (err) { return logAndThrow("users.getById", err); }
    },

    /** Merge partial fields into the current user's profile. */
    async update(fields) {
      try {
        await userDocRef(getUidOrThrow()).update({ ...fields, updatedAt: now() });
      } catch (err) { return logAndThrow("users.update", err); }
    },

    /** Atomically increment one stats counter. */
    async incrementStat(key, delta = 1) {
      try {
        await userDocRef(getUidOrThrow()).update({
          [`stats.${key}`]: firebase.firestore.FieldValue.increment(delta),
          updatedAt: now()
        });
      } catch (err) { return logAndThrow("users.incrementStat", err); }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     HABITS   /users/{uid}/habits/{habitId}

     Schema (stored document — no userId field required):
       name          string
       description   string
       category      string   e.g. "health", "fitness", "mind"
       intent        string   "start" | "maintain" | "reset"
       frequency     string   "daily" | "weekdays" | "custom"
       customDays    string[] e.g. ["Mon","Wed","Fri"]
       when          string   "morning" | "afternoon" | "evening" | "flexible"
       goalDays      number
       motivationTags string[]
       obstacles     string[]
       difficulty    string   "easy" | "moderate" | "hard"
       doneDays      number   incremented on each 'done' log
       archived      boolean
       pinned        boolean
       color         string   hex
       icon          string   emoji / icon name
       order         number   display sort position
       isActive      boolean  (legacy compat — mirrors !archived)
       createdAt     Timestamp
       updatedAt     Timestamp
       milestonesShown number[]  streak tiers already celebrated (e.g. 7, 30, 100)
     ═══════════════════════════════════════════════════════════════ */
  const habits = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "habits"); },

    /** All active (non-archived) habits, ordered by creation time. */
    async list() {
      try {
        const qs = await this._col()
          .where("archived", "==", false)
          .orderBy("createdAt", "desc")
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("habits.list", err); }
    },

    /** All habits including archived, ordered by creation time. */
    async listAll() {
      try {
        const qs = await this._col()
          .orderBy("createdAt", "desc")
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("habits.listAll", err); }
    },

    /** Add a new habit. Returns the new document id. */
    async add(habit) {
      try {
        const col = this._col();
        const countSnap = await col.get();
        const ref = await col.add({
          name:          habit.name          || "New Habit",
          description:   habit.description   || "",
          category:      habit.category      || "lifestyle",
          intent:        habit.intent        || "start",
          frequency:     habit.frequency     || "daily",
          customDays:    habit.customDays    || [],
          when:          habit.when          || "flexible",
          goalDays:      habit.goalDays      || 30,
          motivationTags:habit.motivationTags|| [],
          obstacles:     habit.obstacles     || [],
          difficulty:    habit.difficulty    || "moderate",
          color:         habit.color         || "#34D399",
          icon:          habit.icon          || "✦",
          order:         countSnap.size,
          archived:      false,
          pinned:        false,
          isActive:      true,
          doneDays:      0,
          createdAt:     now(),
          updatedAt:     now()
        });
        await users.incrementStat("habitsCreated").catch(() => {});
        return ref.id;
      } catch (err) { return logAndThrow("habits.add", err); }
    },

    /** Update fields of an existing habit. */
    async update(habitId, fields) {
      try {
        await this._col().doc(habitId).update({ ...fields, updatedAt: now() });
      } catch (err) { return logAndThrow("habits.update", err); }
    },

    /** Soft-delete (archive) a habit. */
    async archive(habitId) {
      try {
        await this._col().doc(habitId).update({
          archived: true, isActive: false, updatedAt: now()
        });
      } catch (err) { return logAndThrow("habits.archive", err); }
    },

    /** Restore an archived habit. */
    async restore(habitId) {
      try {
        await this._col().doc(habitId).update({
          archived: false, isActive: true, updatedAt: now()
        });
      } catch (err) { return logAndThrow("habits.restore", err); }
    },

    /** Permanently delete a habit and all its logs in one batch. */
    async delete(habitId) {
      try {
        const uid  = getUidOrThrow();
        const batch = fs().batch();
        batch.delete(userSubcollectionRef(uid, "habits").doc(habitId));

        const logs = await userSubcollectionRef(uid, "habitLogs")
          .where("habitId", "==", habitId)
          .get();
        logs.docs.forEach(d => batch.delete(d.ref));

        await batch.commit();
      } catch (err) { return logAndThrow("habits.delete", err); }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     HABIT LOGS   /users/{uid}/habitLogs/{habitId}_{dateKey}

     Schema — aligned with habits.js (no userId field):
       habitId   string
       dateKey   string   YYYY-MM-DD
       status    string   "done" | "skip"
       createdAt Timestamp

     Doc-ID format: "{habitId}_{dateKey}"
     (deterministic → idempotent set; uid is already in the path)
     ═══════════════════════════════════════════════════════════════ */
  const habitLogs = {
    _col()                    { return userSubcollectionRef(getUidOrThrow(), "habitLogs"); },
    _id(habitId, dateKey)     { return `${habitId}_${dateKey}`; },

    /** Write (or overwrite) a log entry for a given habit and date. */
    async set(habitId, dateKey, status = "done") {
      try {
        await this._col().doc(this._id(habitId, dateKey)).set(
          { habitId, dateKey, status, createdAt: now() },
          { merge: true }
        );
      } catch (err) { return logAndThrow("habitLogs.set", err); }
    },

    /** Get one log entry. Returns null if not found. */
    async get(habitId, dateKey) {
      try {
        const doc = await this._col().doc(this._id(habitId, dateKey)).get();
        return snap2obj(doc);
      } catch (err) { return logAndThrow("habitLogs.get", err); }
    },

    /** Delete a log entry (undo). */
    async remove(habitId, dateKey) {
      try {
        await this._col().doc(this._id(habitId, dateKey)).delete();
      } catch (err) { return logAndThrow("habitLogs.remove", err); }
    },

    /**
     * Get all logs in a date range (inclusive).
     * Returns array sorted by Firestore natural order (by doc ID = habitId_date).
     */
    async range(startDate, endDate) {
      try {
        const qs = await this._col()
          .where("dateKey", ">=", startDate)
          .where("dateKey", "<=", endDate)
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("habitLogs.range", err); }
    },

    /** Get the last N logs for a specific habit, newest first. */
    async forHabit(habitId, limit = 30) {
      try {
        const qs = await this._col()
          .where("habitId", "==", habitId)
          .orderBy("dateKey", "desc")
          .limit(limit)
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("habitLogs.forHabit", err); }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     BUDGET ENTRIES   /users/{uid}/budgetEntries/{entryId}

     Schema (no userId field):
       type        "income" | "expense"
       amount      number  (always positive)
       category    string
       description string
       date        string  YYYY-MM-DD
       month       string  YYYY-MM  (denormalized for fast queries)
       createdAt   Timestamp
     ═══════════════════════════════════════════════════════════════ */
  const budgetEntries = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "budgetEntries"); },

    /** Add an income or expense entry. Returns the new document id. */
    async add(entry) {
      try {
        const date  = entry.dateKey || entry.date || new Date().toISOString().slice(0, 10);
        const month = entry.month   || date.slice(0, 7);
        const ref = await this._col().add({
          type:        entry.type        || "expense",
          amount:      Math.abs(entry.amount || 0),
          category:    entry.category    || "other",
          description: entry.description || "",
          date,
          dateKey:     date,   // stored explicitly so renders always have it
          month,
          createdAt:   now(),
          updatedAt:   now()
        });
        await users.incrementStat("budgetEntries").catch(() => {});
        return ref.id;
      } catch (err) { return logAndThrow("budgetEntries.add", err); }
    },

    /** Update an existing entry. Always stamps updatedAt. */
    async update(entryId, fields) {
      try {
        await this._col().doc(entryId).update({ ...fields, updatedAt: now() });
      } catch (err) { return logAndThrow("budgetEntries.update", err); }
    },

    /** Delete an entry. */
    async delete(entryId) {
      try {
        await this._col().doc(entryId).delete();
      } catch (err) { return logAndThrow("budgetEntries.delete", err); }
    },

    /**
     * Get all entries for a given month ("YYYY-MM"), sorted newest first.
     *
     * NOTE: We deliberately avoid combining .where("month") with
     * .orderBy("date") because that combination requires a Firestore composite
     * index that may not exist.  Sorting is done client-side instead.
     */
    async forMonth(month) {
      try {
        const qs   = await this._col().where("month", "==", month).get();
        const docs = query2arr(qs);
        docs.sort((a, b) =>
          (b.dateKey || b.date || "").localeCompare(a.dateKey || a.date || "")
        );
        return docs;
      } catch (err) { return logAndThrow("budgetEntries.forMonth", err); }
    },

    /** Get the last N entries across all months. */
    async recent(limit = 20) {
      try {
        const qs = await this._col()
          .orderBy("createdAt", "desc")
          .limit(limit)
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("budgetEntries.recent", err); }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     BUDGET GOALS   /users/{uid}/budgetGoals/{YYYY-MM}

     Doc-ID = month string, e.g. "2025-03"  (uid removed from ID).

     Schema (no userId field):
       month       string  YYYY-MM
       income      number
       budgetLimit number
       categories  { [category]: number }
       createdAt   Timestamp
       updatedAt   Timestamp
     ═══════════════════════════════════════════════════════════════ */
  const budgetGoals = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "budgetGoals"); },

    /** Get the budget goal for a month. Returns null if not set. */
    async get(month) {
      try {
        const doc = await this._col().doc(month).get();
        return snap2obj(doc);
      } catch (err) { return logAndThrow("budgetGoals.get", err); }
    },

    /** Create or replace a month's budget goal. */
    async set(month, goal) {
      try {
        await this._col().doc(month).set({
          month,
          income:      goal.income      || 0,
          budgetLimit: goal.budgetLimit || 0,
          categories:  goal.categories  || {},
          createdAt:   now(),
          updatedAt:   now()
        }, { merge: true });
      } catch (err) { return logAndThrow("budgetGoals.set", err); }
    },

    /** Update partial fields of a budget goal. */
    async update(month, fields) {
      try {
        await this._col().doc(month).update({ ...fields, updatedAt: now() });
      } catch (err) { return logAndThrow("budgetGoals.update", err); }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     BUDGET ACCOUNTS   /users/{uid}/budgetAccounts/{id}

     Used by Budget page and Home for income/debt breakdown.
     Schema: type, name, balance, limit?, apr?, note?, createdAt, updatedAt
     ═══════════════════════════════════════════════════════════════ */
  const budgetAccounts = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "budgetAccounts"); },

    /** List all accounts (for Home dashboard income/debt summary). */
    async list() {
      try {
        const snap = await this._col().orderBy("createdAt", "asc").get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        /* silent */
        return [];
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     BUDGET MONTHS   /users/{uid}/budgetMonths/{YYYY-MM}

     Doc-ID = month string, e.g. "2026-03".
     Written as an aggregate after every budgetEntries add/edit/delete
     so the Home page can read totals with a single document fetch.

     Schema (no userId field):
       month        string  YYYY-MM
       incomeTotal  number
       expenseTotal number
       remaining    number
       byCategory   { [category]: number }
       updatedAt    Timestamp
     ═══════════════════════════════════════════════════════════════ */
  const budgetMonths = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "budgetMonths"); },

    async get(month) {
      try {
        const doc = await this._col().doc(month).get();
        return snap2obj(doc);
      } catch (err) {
        /* silent */
        return null;
      }
    },

    async set(month, data) {
      try {
        await this._col().doc(month).set({
          month,
          incomeTotal:  typeof data.incomeTotal  === "number" ? data.incomeTotal  : 0,
          expenseTotal: typeof data.expenseTotal === "number" ? data.expenseTotal : 0,
          remaining:    typeof data.remaining    === "number" ? data.remaining    : 0,
          byCategory:   data.byCategory || {},
          updatedAt:    now(),
        }, { merge: true });
      } catch (err) {
        /* silent */
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     BUDGET PLAN   /users/{uid}/budgetPlan/{YYYY-MM}

     Doc-ID = month string, e.g. "2026-03".
     Stores per-category spending limits for a given month.

     Schema:
       month      string  YYYY-MM
       byCategory { [categoryId]: number }   e.g. { food: 500, housing: 1500 }
       updatedAt  Timestamp
     ═══════════════════════════════════════════════════════════════ */
  const budgetPlan = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "budgetPlan"); },

    async get(month) {
      try {
        const doc = await this._col().doc(month).get();
        return snap2obj(doc);
      } catch (err) {
        /* silent */
        return null;
      }
    },

    async set(month, byCategory) {
      const cleaned = {};
      const src = byCategory && typeof byCategory === "object" ? byCategory : {};
      Object.keys(src).forEach((k) => {
        const n = Number(src[k]);
        if (Number.isFinite(n) && n >= 0) cleaned[k] = n;
      });
      try {
        await this._col().doc(month).set({
          month,
          byCategory: cleaned,
          updatedAt:  now(),
        }, { merge: true });
      } catch (err) {
        return logAndThrow("budgetPlan.set", err);
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     BUDGET BILLS   /users/{uid}/budgetBills/{billId}

     Recurring bills tracked per user.  "Paid" state is kept
     client-side via paidMonth (YYYY-MM) so bills auto-reset.

     Schema:
       name       string
       amount     number
       dueDay     number  1–28 (day of month)
       category   string  matches expense categories
       note       string  (optional)
       paidMonth  string  YYYY-MM or "" if unpaid this month
       createdAt  Timestamp
       updatedAt  Timestamp
     ═══════════════════════════════════════════════════════════════ */
  const budgetBills = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "budgetBills"); },

    async list() {
      try {
        const snap = await this._col().orderBy("createdAt", "asc").get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        /* silent */
        return [];
      }
    },

    async add(bill) {
      try {
        const ref = await this._col().add({
          name:       bill.name      || "Bill",
          amount:     Math.abs(bill.amount || 0),
          dueDay:     bill.dueDay    || 1,
          category:   bill.category  || "subscriptions",
          note:       bill.note      || "",
          paidMonth:  "",
          createdAt:  now(),
          updatedAt:  now(),
        });
        return ref.id;
      } catch (err) { return logAndThrow("budgetBills.add", err); }
    },

    async update(billId, fields) {
      try {
        await this._col().doc(billId).update({ ...fields, updatedAt: now() });
      } catch (err) { return logAndThrow("budgetBills.update", err); }
    },

    async delete(billId) {
      try {
        await this._col().doc(billId).delete();
      } catch (err) { return logAndThrow("budgetBills.delete", err); }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     SLEEP LOGS   /users/{uid}/sleepLogs/{YYYY-MM-DD}

     Doc-ID = date string, e.g. "2025-03-04"  (uid removed from ID).

     Schema (no userId field):
       date      string  YYYY-MM-DD
       bedtime   string  "HH:MM"
       wakeTime  string  "HH:MM"
       duration  number  hours (decimal, e.g. 7.5)
       quality   number  1–10
       cycles    number
       notes     string
       sleepStart   string  (optional) ISO — "Ready to Sleep" timestamp
       planned      boolean (optional) pre-filled from sleepPlan
       windDownDone number  (optional) 0–4 checklist count
       planId       string  (optional) linked sleepPlan id
       wearable     object|null  (future — hook field)
       createdAt Timestamp
     ═══════════════════════════════════════════════════════════════ */
  const sleepLogs = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "sleepLogs"); },

    /** Save or overwrite a sleep log for a date. date = dateKey YYYY-MM-DD. */
    async set(date, log) {
      try {
        const bedtime  = log.sleepTime || log.bedtime || "23:00";
        const wakeTime = log.wakeTime || "07:00";
        const duration = log.duration != null ? log.duration : 0;
        const quality  = log.quality != null ? log.quality : 5;
        const notes    = log.notes || "";
        const cycles   = log.cycles != null ? log.cycles : (duration > 0 ? Math.round(duration * 60 / 90) : 0);
        await this._col().doc(date).set({
          date,
          dateKey:  date,
          bedtime,
          sleepTime: bedtime,
          wakeTime,
          duration,
          quality,
          cycles,
          notes,
          ...(log.sleepStart   != null && { sleepStart:   log.sleepStart }),
          ...(log.planned      != null && { planned:      log.planned }),
          ...(log.windDownDone != null && { windDownDone: log.windDownDone }),
          ...(log.planId       != null && { planId:       log.planId }),
          wearable: log.wearable != null ? log.wearable : null,
          createdAt: now(),
          updatedAt: now()
        }, { merge: true });
        await users.incrementStat("sleepLogs").catch(() => {});
      } catch (err) { return logAndThrow("sleepLogs.set", err); }
    },

    /** Get the sleep log for a specific date. Returns null if not found. */
    async get(date) {
      try {
        const doc = await this._col().doc(date).get();
        return snap2obj(doc);
      } catch (err) { return logAndThrow("sleepLogs.get", err); }
    },

    /** Get the last N days of sleep logs, newest first. */
    async recent(days = 7) {
      try {
        const qs = await this._col()
          .orderBy("date", "desc")
          .limit(days)
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("sleepLogs.recent", err); }
    },

    /** Permanently delete a sleep log for a date. */
    async delete(date) {
      try {
        await this._col().doc(date).delete();
      } catch (err) { return logAndThrow("sleepLogs.delete", err); }
    },

    /** Get sleep logs between two dates (inclusive), newest first. */
    async range(startDate, endDate) {
      try {
        const qs = await this._col()
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .orderBy("date", "desc")
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("sleepLogs.range", err); }
    },

    /** Get all sleep logs for a calendar month (YYYY-MM). Returns array keyed by date. */
    async getMonth(month) {
      const [y, m] = month.split("-").map(Number);
      const start = `${month}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${month}-${String(lastDay).padStart(2, "0")}`;
      const list = await this.range(start, end);
      return list;
    },

    /** Returns sleep stats: { avgDuration, avgQuality, totalDays, debtVsTarget, logs } */
    async getStats(days = 7, targetHours = 8) {
      try {
        const logs = await this.recent(days);
        const durations = logs.map(l => l.duration || 0).filter(d => d > 0);
        const qualities = logs.map(l => l.quality || 0).filter(q => q > 0);
        const avgDuration = durations.length
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;
        const avgQuality = qualities.length
          ? qualities.reduce((a, b) => a + b, 0) / qualities.length
          : 0;
        const totalActual = logs.reduce((s, l) => s + (l.duration || 0), 0);
        const debtVsTarget = (targetHours * logs.length) - totalActual;
        return { avgDuration, avgQuality, totalDays: logs.length, debtVsTarget, logs };
      } catch (err) { return logAndThrow("sleepLogs.getStats", err); }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     SLEEP SETTINGS   /users/{uid}/sleepSettings/default

     Singleton preferences (merge fields as needed):
       targetHours    number   daily sleep target (default 8)
       defaultWake    string   "HH:MM"
       windDownMins   number   minutes before bedtime to start wind-down (default 60)
       alarmEnabled   boolean
       updatedAt      Timestamp
     ═══════════════════════════════════════════════════════════════ */
  const sleepSettings = {
    _ref() {
      return userSubcollectionRef(getUidOrThrow(), "sleepSettings").doc("default");
    },

    async get() {
      try {
        const doc = await this._ref().get();
        return snap2obj(doc) || {};
      } catch (err) { return logAndThrow("sleepSettings.get", err); }
    },

    async set(fields) {
      try {
        const patch = { updatedAt: now() };
        if (fields && fields.targetHours != null) patch.targetHours = fields.targetHours;
        if (fields && fields.defaultWake != null) patch.defaultWake = fields.defaultWake;
        if (fields && fields.windDownMins != null) patch.windDownMins = fields.windDownMins;
        if (fields && fields.alarmEnabled != null) patch.alarmEnabled = fields.alarmEnabled;
        await this._ref().set(patch, { merge: true });
      } catch (err) { return logAndThrow("sleepSettings.set", err); }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     MOOD LOGS   /users/{uid}/moodLogs/{YYYY-MM-DD}

     Doc-ID = date string, e.g. "2025-03-04"  (uid removed from ID).

     Schema (no userId field):
       date      string  YYYY-MM-DD
       score     number  1–10  (overall mood)
       mood      number  1–5   (primary band)
       energy    number  1–10  or null if not rated
       stress    number  1–10
       focus     number  1–10
       social    number  1–10
       notes     string
       tags      string[]
       emotion, impact, impactQ, triggerQ, actionQ  strings
       createdAt Timestamp
     ═══════════════════════════════════════════════════════════════ */
  const moodLogs = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "moodLogs"); },

    /**
     * Save or merge a mood log for a date.
     * Numeric fields: pass null to clear “not rated”; omit key to leave Firestore unchanged on merge.
     */
    async set(date, log) {
      try {
        const patch = { date, createdAt: now() };
        const numericKeys = ["score", "energy", "stress", "focus", "social", "mood"];
        for (const k of numericKeys) {
          if (!Object.prototype.hasOwnProperty.call(log, k)) continue;
          const v = log[k];
          patch[k] = v === null ? null : Number(v);
        }
        if (Object.prototype.hasOwnProperty.call(log, "notes")) {
          patch.notes = log.notes == null ? "" : String(log.notes);
        }
        if (Object.prototype.hasOwnProperty.call(log, "tags")) {
          patch.tags = Array.isArray(log.tags) ? log.tags : [];
        }
        const stringKeys = ["emotion", "impact", "impactQ", "triggerQ", "actionQ"];
        for (const k of stringKeys) {
          if (!Object.prototype.hasOwnProperty.call(log, k)) continue;
          const v = log[k];
          patch[k] = v == null ? "" : String(v);
        }
        await this._col().doc(date).set(patch, { merge: true });
        await users.incrementStat("moodLogs").catch(() => {});
      } catch (err) { return logAndThrow("moodLogs.set", err); }
    },

    /** Get the mood log for a specific date. Returns null if not found. */
    async get(date) {
      try {
        const doc = await this._col().doc(date).get();
        return snap2obj(doc);
      } catch (err) { return logAndThrow("moodLogs.get", err); }
    },

    /** Get the last N days of mood logs, newest first. */
    async recent(days = 7) {
      try {
        const qs = await this._col()
          .orderBy("date", "desc")
          .limit(days)
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("moodLogs.recent", err); }
    },

    /** Get mood logs between two dates (inclusive), newest first. */
    async range(startDate, endDate) {
      try {
        const qs = await this._col()
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .orderBy("date", "desc")
          .get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("moodLogs.range", err); }
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
     TASKS   /users/{uid}/tasks/{taskId}
     ════════════════════════════════════════════════════════════════════════ */
  const tasks = {
    _col() { return userSubcollectionRef(getUidOrThrow(), "tasks"); },

    async list(date) {
      try {
        const qs = await this._col().where("date", "==", date).get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("tasks.list", err); }
    },

    async listAll() {
      try {
        const qs = await this._col().get();
        return query2arr(qs);
      } catch (err) { return logAndThrow("tasks.listAll", err); }
    },

    async add(task) {
      try {
        const ref = await this._col().add({ ...task, createdAt: now(), updatedAt: now() });
        return ref.id;
      } catch (err) { return logAndThrow("tasks.add", err); }
    },

    async update(taskId, fields) {
      try {
        await this._col().doc(taskId).update({ ...fields, updatedAt: now() });
      } catch (err) { return logAndThrow("tasks.update", err); }
    },

    async delete(taskId) {
      try {
        await this._col().doc(taskId).delete();
      } catch (err) { return logAndThrow("tasks.delete", err); }
    },

    onSnapshot(date, callback) {
      return this._col().where("date", "==", date).onSnapshot(snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     PUBLIC EXPORTS
     ═══════════════════════════════════════════════════════════════ */

  /** Throws synchronously if no user is signed in. */
  HBIT.getUidOrThrow = getUidOrThrow;

  /** DocumentReference helper: /users/{uid} */
  HBIT.userDocRef = userDocRef;

  /** CollectionReference helper: /users/{uid}/{name} */
  HBIT.userSubcollectionRef = userSubcollectionRef;

  HBIT.db = {
    users,
    habits,
    habitLogs,
    budgetEntries,
    budgetGoals,
    budgetAccounts,
    budgetMonths,
    budgetPlan,
    budgetBills,
    sleepLogs,
    sleepSettings,
    moodLogs,
    tasks,

    /** Today's date as YYYY-MM-DD (local time). */
    today() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },

    /** Current month as YYYY-MM. */
    thisMonth() {
      return this.today().slice(0, 7);
    }
  };
})();
