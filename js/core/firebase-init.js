/* =========================
   Hbit — Firebase initialization
   Compat SDK loaded via CDN before this script.
   ========================= */

// Phase 1.7a — flipped to LOCAL persistence so users stay signed in
// across browser closes. To force re-login during dev, sign out manually
// or clear application storage.
const firebaseConfig = {
  apiKey:            "AIzaSyBipZqtsB69eDF5dAFiAijIjNUfO_nkg6s",
  authDomain:        "hbit-d62a6.firebaseapp.com",
  databaseURL:       "https://hbit-d62a6-default-rtdb.firebaseio.com",
  projectId:         "hbit-d62a6",
  storageBucket:     "hbit-d62a6.firebasestorage.app",
  messagingSenderId: "899212575906",
  appId:             "1:899212575906:web:e044f135ce135b9c8683fb"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.HBIT             = window.HBIT || {};
window.HBIT.fbAuth      = firebase.auth();
window.HBIT.fbDb        = firebase.database();
window.HBIT.fbFirestore = firebase.firestore();

// Phase 1.7a — LOCAL persistence keeps the user signed in across tab
// closes; falls back to SESSION only if the SDK lacks LOCAL on this
// platform (very old browsers).
if (firebase.auth?.Auth?.Persistence?.LOCAL) {
  window.HBIT.fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((err) => console.warn("[Hbit] Auth persistence fallback:", err?.code || err));
} else if (firebase.auth?.Auth?.Persistence?.SESSION) {
  window.HBIT.fbAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .catch((err) => console.warn("[Hbit] Auth persistence fallback:", err?.code || err));
}

/* ─────────────────────────────────────────────────────────
   clearLocalData()
   Wipes ALL module data from localStorage so the next user
   always starts with a clean slate (no leftover fake data).
   ───────────────────────────────────────────────────────── */
window.HBIT.clearLocalData = function () {
  const keys = [
    /* Budget */
    "hbit:budget:currency", "hbit:budget:mode",
    "hbit:budget:pay",      "hbit:budget:expenses",
    /* Sleep */
    "life_sleep_state_v2",  "life_sleep_history_v2",
    /* Mood */
    "life_mood7_today",     "life_mood7_history", "life_mood7_ui",
    /* Habits */
    "hbit:habits",          "hbit:habitLogs",
    /* Home series / range */
    "hbit.dailySeries",     "hbit.home.range",
  ];
  keys.forEach(k => {
    try { localStorage.removeItem(k); } catch {}
  });
};

/* ─────────────────────────────────────────────────────────
   Auth state watcher — clears localStorage when a different
   user logs in (or when the user logs out) so no data
   leaks between accounts.
   ───────────────────────────────────────────────────────── */
firebase.auth().onAuthStateChanged(function (user) {
  const prevUid = localStorage.getItem("hbit_uid");

  if (user) {
    if (prevUid && prevUid !== user.uid) {
      /* Different user signed in — clear previous user's local data */
      window.HBIT.clearLocalData();
    }
    localStorage.setItem("hbit_uid", user.uid);
  } else {
    /* Signed out — clear data and forget UID */
    window.HBIT.clearLocalData();
    localStorage.removeItem("hbit_uid");
  }
});

/* ─────────────────────────────────────────────────────────
   Helper — derive a @username from the full name
   e.g. "Hassan Houcine" → "hassanh"
   ───────────────────────────────────────────────────────── */
function _makeUsername(fullName, email) {
  if (fullName) {
    const parts = fullName.trim().toLowerCase().split(/\s+/);
    if (parts.length >= 2) return parts[0] + parts[1].charAt(0);
    return parts[0];
  }
  return (email || "user").split("@")[0].toLowerCase();
}

/* ═══════════════════════════════════════════════════════════
   createUserProfile(user, provider, extra)

   Writes the full user document to Firestore /users/{uid}.
   Call this right after createUserWithEmailAndPassword or
   signInWithPopup.

   - First-time users  → creates the complete document
   - Returning users   → only updates updatedAt

   extra = { username? }   (passed from signup form)
   ═══════════════════════════════════════════════════════════ */
window.HBIT.createUserProfile = async function (user, provider = "password", extra = {}) {
  const fs  = firebase.firestore();
  const ref = fs.collection("users").doc(user.uid);
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const langKey = window.HBIT?.storage?.LS?.lang || "hbit:lang";
  const themeKey = window.HBIT?.storage?.LS?.theme || "hbit:theme";

  /* ── Read existing document ────────────────────────── */
  let snap;
  try {
    snap = await ref.get();
  } catch (err) {
    console.error("[Hbit] Firestore read error:", err.code, err.message);
    throw err;
  }

  if (!snap.exists) {
    /* ── Brand-new user — write the full profile ─────── */
    const fullName = user.displayName || extra.fullName || "";
    const username = extra.username   || _makeUsername(fullName, user.email);

    const doc = {
      uid:       user.uid,
      fullName,
      username,
      email:     user.email    || "",
      photoURL:  user.photoURL || null,
      age:       null,                       // filled in on Profile page
      bio:       "",
      gender:    null,
      birthdate: null,
      timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
      provider,

      preferences: {
        language: localStorage.getItem(langKey) || "en",
        theme:    localStorage.getItem(themeKey) || "dark"
      },

      /* ── All module counters start at 0 (no fake data) ── */
      stats: {
        habitsCreated:   0,
        habitsCompleted: 0,
        currentStreak:   0,
        longestStreak:   0,
        budgetEntries:   0,
        sleepLogs:       0,
        moodLogs:        0,
        focusSessions:   0
      },

      createdAt: now,
      updatedAt: now
    };

    try {
      await ref.set(doc);
    } catch (err) {
      console.error("[Hbit] Firestore write error:", err.code, err.message);
      console.error("[Hbit] → Check Firestore security rules in the Firebase Console.");
      throw err;
    }

  } else {
    /* ── Returning user — only refresh timestamp ────── */
    try {
      await ref.update({ updatedAt: now });
    } catch (err) {
      /* silent */
      /* Non-blocking — don't throw */
    }
  }

  /* ── Mirror lightweight record to Realtime DB ────── */
  try {
    await firebase.database().ref("users/" + user.uid).update({
      uid:         user.uid,
      email:       user.email || "",
      lastLoginAt: firebase.database.ServerValue.TIMESTAMP
    });
  } catch (_) { /* non-blocking */ }
};

/* ─────────────────────────────────────────────────────────
   getCurrentUserProfile()
   Returns the signed-in user's Firestore document, or null.
   ───────────────────────────────────────────────────────── */
window.HBIT.getCurrentUserProfile = async function () {
  const user = firebase.auth().currentUser;
  if (!user) return null;
  try {
    const snap = await firebase.firestore().collection("users").doc(user.uid).get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    console.error("[Hbit] Could not fetch profile:", err.message);
    return null;
  }
};

/* ─────────────────────────────────────────────────────────
   updateUserProfile(fields)
   Merges partial fields into the current user's document.
   ───────────────────────────────────────────────────────── */
window.HBIT.updateUserProfile = async function (fields) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Not authenticated");
  const now = firebase.firestore.FieldValue.serverTimestamp();
  await firebase.firestore()
    .collection("users").doc(user.uid)
    .update({ ...fields, updatedAt: now });
};
