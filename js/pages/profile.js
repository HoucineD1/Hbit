/* Hbit — profile.js — achievement dashboard + account */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const $ = (id) => document.getElementById(id);

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return "—";
    }
  }

  function shortDate() {
    try {
      const locale = HBIT.i18n?.getLang?.() === "fr" ? "fr-CA" : "en-CA";
      return new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date());
    } catch {
      return "—";
    }
  }

  function providerLabel(str) {
    if (!str) return "—";
    if (str.includes("google")) return HBIT.i18n?.t?.("profile.provider.google", "Google") || "Google";
    if (str.includes("apple")) return HBIT.i18n?.t?.("profile.provider.apple", "Apple") || "Apple";
    if (str.includes("password")) return HBIT.i18n?.t?.("profile.provider.password", "Email / Password") || "Email / Password";
    return str;
  }

  function bestRunLength(sortedDateKeys) {
    if (!sortedDateKeys.length) return 0;
    let best = 1;
    let run = 1;
    for (let i = 1; i < sortedDateKeys.length; i++) {
      const a = new Date(sortedDateKeys[i - 1] + "T12:00:00");
      const b = new Date(sortedDateKeys[i] + "T12:00:00");
      const diff = (b - a) / 86400000;
      if (diff === 1) {
        run++;
        best = Math.max(best, run);
      } else if (diff > 1) {
        run = 1;
      }
    }
    return best;
  }

  function computeMaxBestStreakAcrossHabits(logs) {
    const byHabit = {};
    logs.forEach((l) => {
      if (l.status !== "done") return;
      if (!byHabit[l.habitId]) byHabit[l.habitId] = [];
      byHabit[l.habitId].push(l.dateKey);
    });
    let max = 0;
    Object.keys(byHabit).forEach((hid) => {
      const uniq = [...new Set(byHabit[hid])].sort();
      max = Math.max(max, bestRunLength(uniq));
    });
    return max;
  }

  async function loadAchievementStats(uid) {
    const db = firebase.firestore();
    let longest = 0;
    let habitCount = 0;
    try {
      const [habitsSnap, logsSnap] = await Promise.all([
        db.collection("users").doc(uid).collection("habits").get(),
        db.collection("users").doc(uid).collection("habitLogs").limit(3000).get(),
      ]);
      habitCount = habitsSnap.size;
      const logs = logsSnap.docs.map((d) => d.data());
      longest = computeMaxBestStreakAcrossHabits(logs);
    } catch (e) {
      /* silent */
    }
    return { longest, habitCount };
  }

  function setLoading(on) {
    const btn = $("saveProfileBtn");
    const label = $("saveBtnLabel");
    const spinner = $("saveSpinner");
    if (!btn) return;
    btn.disabled = on;
    label?.classList.toggle("hidden", on);
    spinner?.classList.toggle("hidden", !on);
  }

  function showMsg(text, isError = false) {
    const el = $("pfSaveMsg");
    if (!el) return;
    el.textContent = text;
    el.className = "pf-save-msg " + (isError ? "pf-save-msg--error" : "pf-save-msg--ok");
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3200);
  }

  function animateStatValues() {
    qsa(".pf-stat-value").forEach((el) => {
      const target = parseInt(el.textContent, 10) || 0;
      if (!target) return;
      const t0 = performance.now();
      const dur = 650;
      function frame(now) {
        const u = Math.min(1, (now - t0) / dur);
        const ease = 1 - Math.pow(1 - u, 3);
        el.textContent = String(Math.round(target * ease));
        if (u < 1) requestAnimationFrame(frame);
        else el.textContent = String(target);
      }
      el.textContent = "0";
      requestAnimationFrame(frame);
    });
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  async function populate(profile, user, ach) {
    const name = profile?.fullName || user?.displayName || "";
    const initials = name
      ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
      : (user?.email?.[0] || "?").toUpperCase();

    if ($("pfAvatar")) $("pfAvatar").textContent = initials;
    if ($("profileBtn")) $("profileBtn").textContent = initials[0] || "H";
    if ($("pfHeroName")) $("pfHeroName").textContent = name || user?.email || "—";

    const username = profile?.username ? `@${profile.username}` : "";
    if ($("pfHeroMeta")) $("pfHeroMeta").textContent = username || user?.email || "—";

    if ($("pfCreatedAtHero")) $("pfCreatedAtHero").textContent = fmtDate(profile?.createdAt);

    if ($("pfFullName")) $("pfFullName").value = profile?.fullName || name || "";
    if ($("pfUsername")) $("pfUsername").value = profile?.username || "";
    if ($("pfAge")) $("pfAge").value = profile?.age || "";
    if ($("pfGender")) $("pfGender").value = profile?.gender || "";
    if ($("pfBio")) {
      $("pfBio").value = profile?.bio || "";
      updateCharCount();
    }

    if ($("pfEmailDisplay")) $("pfEmailDisplay").textContent = user?.email || "—";
    if ($("pfProviderDisplay")) $("pfProviderDisplay").textContent = providerLabel(profile?.provider);
    if ($("pfCreatedAt")) $("pfCreatedAt") && ($("pfCreatedAt").textContent = fmtDate(profile?.createdAt));

    const s = profile?.stats || {};
    const habitsTracked = ach?.habitCount ?? s.habitsCreated ?? 0;
    const longest = ach?.longest ?? s.longestStreak ?? 0;

    if ($("psHabits")) $("psHabits").textContent = habitsTracked;
    if ($("psLongest")) $("psLongest").textContent = longest;
    if ($("psSleep")) $("psSleep").textContent = s.sleepLogs ?? 0;
    if ($("psMood")) $("psMood").textContent = s.moodLogs ?? 0;
    if ($("psBudget")) $("psBudget").textContent = s.budgetEntries ?? 0;
    if ($("psFocus")) $("psFocus").textContent = s.focusSessions ?? 0;

    const pwd = $("pfChangePwd");
    if (pwd) {
      const pwdProvider = (user?.providerData || []).some((p) => p.providerId === "password");
      pwd.hidden = !pwdProvider;
      pwd.onclick = (e) => {
        e.preventDefault();
        if (!user?.email) return;
        firebase.auth().sendPasswordResetEmail(user.email).then(() => {
          showMsg(HBIT.i18n?.t?.("profile.account.pwdSent", "Password reset email sent.") || "Sent.");
        }).catch(() => showMsg(HBIT.i18n?.t?.("profile.account.pwdErr", "Could not send email.") || "Error", true));
      };
    }

    requestAnimationFrame(() => animateStatValues());
  }

  function updateCharCount() {
    const bio = $("pfBio");
    const cnt = $("pfBioCount");
    if (bio && cnt) cnt.textContent = bio.value.length;
  }

  async function saveProfile() {
    setLoading(true);

    const fullName = $("pfFullName")?.value.trim() || "";
    const username = ($("pfUsername")?.value.trim() || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
    const age = parseInt($("pfAge")?.value || "", 10) || null;
    const gender = $("pfGender")?.value || null;
    const bio = $("pfBio")?.value.trim() || "";

    if (!fullName) {
      showMsg(HBIT.i18n?.t?.("profile.error.fullName", "Full name is required.") || "Full name required.", true);
      setLoading(false);
      return;
    }

    try {
      await HBIT.updateUserProfile({ fullName, username, age, gender, bio });

      const user = firebase.auth().currentUser;
      if (user && user.displayName !== fullName) {
        await user.updateProfile({ displayName: fullName });
      }

      const initials = fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
      if ($("pfAvatar")) $("pfAvatar").textContent = initials;
      if ($("pfHeroName")) $("pfHeroName").textContent = fullName;
      if ($("pfHeroMeta") && username) $("pfHeroMeta").textContent = `@${username}`;

      const homeAvatar = document.getElementById("profileBtn");
      if (homeAvatar) homeAvatar.textContent = initials[0];

      showMsg(HBIT.i18n?.t?.("profile.saved", "Profile saved ✓") || "Saved");
    } catch (err) {
      showMsg(HBIT.i18n?.t?.("profile.saveError", "Could not save.") || "Error", true);
    }

    setLoading(false);
  }

  function bindPersonalToggle() {
    const btn = $("pfTogglePersonal");
    const panel = $("pfPersonalPanel");
    const editHero = $("pfEditHeroBtn");
    if (!btn || !panel) return;
    btn.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    editHero?.addEventListener("click", () => {
      panel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      $("pfFullName")?.focus();
    });
  }

  function bindDeleteModal() {
    const overlay = $("pfDeleteModal");
    const openBtn = $("pfDeleteAccount");
    const cancel = $("pfDeleteCancel");
    const confirm = $("pfDeleteConfirm");
    const dialog = overlay?.querySelector(".pf-modal");
    if (!overlay || !openBtn) return;

    let lastFocus = null;
    let onKey = null;

    function focusables() {
      return Array.from(
        dialog?.querySelectorAll('button:not([disabled]), [href], input:not([disabled])') || []
      ).filter((el) => el.getClientRects().length > 0);
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      (cancel || confirm)?.focus?.();
      onKey = (e) => {
        if (!overlay.classList.contains("open")) return;
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          return;
        }
        if (e.key !== "Tab" || !dialog) return;
        const nodes = focusables();
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", onKey);
    }

    function close() {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      if (onKey) document.removeEventListener("keydown", onKey);
      onKey = null;
      lastFocus?.focus?.();
    }

    openBtn.addEventListener("click", () => open());
    cancel?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    confirm?.addEventListener("click", async () => {
      const user = firebase.auth().currentUser;
      if (!user) return;
      try {
        await user.delete();
        window.location.replace("index.html");
      } catch {
        showMsg(HBIT.i18n?.t?.("profile.delete.reauth", "Sign in again, then try deleting.") || "Error", true);
        close();
      }
    });
  }

  function init() {
    if (document.body.id !== "profilePage") return;
    if (document.body.dataset.profileInit) return;
    document.body.dataset.profileInit = "1";

    const d = $("profileDate");
    if (d) d.textContent = shortDate();

    $("pfBio")?.addEventListener("input", updateCharCount);
    $("saveProfileBtn")?.addEventListener("click", saveProfile);
    bindPersonalToggle();
    bindDeleteModal();

    $("pfLogoutBtn")?.addEventListener("click", async () => {
      try {
        await firebase.auth().signOut();
        window.location.replace("index.html");
      } catch (err) {
        showMsg(HBIT.i18n?.t?.("profile.logoutError", "Could not log out.") || "Error", true);
      }
    });

    if (!window.firebase || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.replace("login.html");
        return;
      }

      let profile = null;
      try {
        profile = await HBIT.getCurrentUserProfile();
      } catch (err) {
        /* silent */
      }

      const ach = await loadAchievementStats(user.uid);
      await populate(profile, user, ach);
      HBIT.i18n?.apply?.(document);
      HBIT.i18n?.updateToggle?.();
    });
  }

  HBIT.pages = HBIT.pages || {};
  HBIT.pages.profile = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
