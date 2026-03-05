/* =========================
   Hbit — js/pages/profile.js
   Load & save user profile from Firestore
   ========================= */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $    = (id) => document.getElementById(id);

  /* ── Helpers ──────────────────────────────────────────────── */
  function fmtDate(ts) {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch { return "—"; }
  }

  function providerLabel(str) {
    if (!str) return "—";
    if (str.includes("google"))   return "Google";
    if (str.includes("apple"))    return "Apple";
    if (str.includes("password")) return "Email / Password";
    return str;
  }

  function setLoading(on) {
    const btn    = $("saveProfileBtn");
    const label  = $("saveBtnLabel");
    const spinner = $("saveSpinner");
    const topBtn = $("saveTopBtn");
    if (!btn) return;
    btn.disabled    = on;
    topBtn && (topBtn.disabled = on);
    label?.classList.toggle("hidden", on);
    spinner?.classList.toggle("hidden", !on);
  }

  function showMsg(text, isError = false) {
    const el = $("pfSaveMsg");
    if (!el) return;
    el.textContent = text;
    el.className = "pf-save-msg " + (isError ? "pf-save-msg--error" : "pf-save-msg--ok");
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3000);
  }

  /* ── Populate form from profile data ─────────────────────── */
  function populate(profile, user) {
    /* Avatar */
    const name  = profile?.fullName || user?.displayName || "";
    const initials = name
      ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
      : (user?.email?.[0] || "?").toUpperCase();

    if ($("pfAvatar"))   $("pfAvatar").textContent   = initials;
    if ($("pfHeroName")) $("pfHeroName").textContent = name || user?.email || "—";
    if ($("pfHeroMeta")) {
      const username = profile?.username ? `@${profile.username}` : "";
      $("pfHeroMeta").textContent = username || user?.email || "—";
    }

    /* Form fields */
    if ($("pfFullName"))  $("pfFullName").value  = profile?.fullName  || name || "";
    if ($("pfUsername"))  $("pfUsername").value  = profile?.username  || "";
    if ($("pfAge"))       $("pfAge").value        = profile?.age       || "";
    if ($("pfGender"))    $("pfGender").value     = profile?.gender    || "";
    if ($("pfBio")) {
      $("pfBio").value = profile?.bio || "";
      updateCharCount();
    }

    /* Account info */
    if ($("pfEmailDisplay"))    $("pfEmailDisplay").textContent    = user?.email || "—";
    if ($("pfProviderDisplay")) $("pfProviderDisplay").textContent = providerLabel(profile?.provider);
    if ($("pfCreatedAt"))       $("pfCreatedAt").textContent       = fmtDate(profile?.createdAt);

    /* Stats */
    const s = profile?.stats || {};
    if ($("psHabits")) $("psHabits").textContent = s.habitsCreated   ?? 0;
    if ($("psStreak")) $("psStreak").textContent = s.currentStreak   ?? 0;
    if ($("psSleep"))  $("psSleep").textContent  = s.sleepLogs       ?? 0;
    if ($("psMood"))   $("psMood").textContent   = s.moodLogs        ?? 0;
    if ($("psBudget")) $("psBudget").textContent = s.budgetEntries   ?? 0;
  }

  /* ── Bio character counter ───────────────────────────────── */
  function updateCharCount() {
    const bio = $("pfBio");
    const cnt = $("pfBioCount");
    if (bio && cnt) cnt.textContent = bio.value.length;
  }

  /* ── Save profile to Firestore ───────────────────────────── */
  async function saveProfile() {
    setLoading(true);

    const fullName = $("pfFullName")?.value.trim() || "";
    const username = ($("pfUsername")?.value.trim() || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
    const age      = parseInt($("pfAge")?.value || "", 10) || null;
    const gender   = $("pfGender")?.value || null;
    const bio      = $("pfBio")?.value.trim() || "";

    if (!fullName) {
      showMsg("Full name is required.", true);
      setLoading(false);
      return;
    }

    try {
      await HBIT.updateUserProfile({ fullName, username, age, gender, bio });

      /* Update Firebase Auth displayName */
      const user = firebase.auth().currentUser;
      if (user && user.displayName !== fullName) {
        await user.updateProfile({ displayName: fullName });
      }

      /* Refresh avatar / hero */
      const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      if ($("pfAvatar"))   $("pfAvatar").textContent   = initials;
      if ($("pfHeroName")) $("pfHeroName").textContent = fullName;
      if ($("pfHeroMeta") && username) $("pfHeroMeta").textContent = `@${username}`;

      /* Also update the home avatar if stored */
      const homeAvatar = document.getElementById("profileBtn");
      if (homeAvatar) homeAvatar.textContent = initials[0];

      showMsg("Profile saved ✓");
    } catch (err) {
      console.error("[Hbit] Save profile error:", err.message);
      showMsg("Could not save. Check your connection.", true);
    }

    setLoading(false);
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    if (document.body.id !== "profilePage") return;

    /* Bio char counter */
    $("pfBio")?.addEventListener("input", updateCharCount);

    /* Save buttons */
    $("saveProfileBtn")?.addEventListener("click", saveProfile);
    $("saveTopBtn")?.addEventListener("click", saveProfile);

    /* Logout */
    $("pfLogoutBtn")?.addEventListener("click", async () => {
      try {
        await firebase.auth().signOut();
        window.location.replace("index.html");
      } catch (err) {
        console.error("[Hbit] Logout error:", err.message);
      }
    });

    /* Wait for auth */
    if (!window.firebase || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.replace("login.html");
        return;
      }

      /* Load from Firestore */
      let profile = null;
      try {
        profile = await HBIT.getCurrentUserProfile();
      } catch (err) {
        console.warn("[Hbit] Could not load profile:", err.message);
      }

      populate(profile, user);
    });
  }

  HBIT.pages = HBIT.pages || {};
  HBIT.pages.profile = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
