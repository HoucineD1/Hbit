/* =========================
   Hbit — js/pages/signup.js
   Sign-up page logic (Firebase Auth)
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  window.HBIT?.theme?.apply?.();
  window.HBIT?.i18n?.init?.();

  /* ── Panel keyword cycling ──────────────────────── */
  (function initPanelCycle() {
    const el = document.getElementById("panelCycleWord");
    if (!el) return;

    const words = [
      { en: "build habits.", fr: "créer des habitudes." },
      { en: "master your budget.", fr: "maîtriser ton budget." },
      { en: "optimize sleep.", fr: "optimiser ton sommeil." },
      { en: "track your mood.", fr: "suivre ton humeur." },
      { en: "stay focused.", fr: "rester concentré." },
      { en: "plan your day.", fr: "planifier ta journée." },
    ];

    let idx = 0;
    let timer = null;
    const lang = () => window.HBIT?.i18n?.getLang?.() || "en";

    function cycle() {
      el.classList.remove("cycle-active");
      el.classList.add("cycle-exit");
      setTimeout(() => {
        idx = (idx + 1) % words.length;
        el.textContent = words[idx][lang()];
        el.classList.remove("cycle-exit");
        el.classList.add("cycle-enter");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.classList.remove("cycle-enter");
            el.classList.add("cycle-active");
          });
        });
      }, 380);
    }

    function start() { if (!timer) timer = setInterval(cycle, 3200); }
    function stop()  { clearInterval(timer); timer = null; }

    el.classList.add("cycle-active");
    start();

    const panel = el.closest(".auth-panel");
    if (panel) {
      panel.addEventListener("mouseenter", stop);
      panel.addEventListener("mouseleave", start);
    }

    window.addEventListener("hbit:lang-changed", () => {
      el.textContent = words[idx][lang()];
    });
  })();

  /* ── Mobile module showcase pills ──────────────────── */
  (function initMobileShowcase() {
    const pills   = document.querySelectorAll(".auth-mobile-pill[data-module]");
    const content = document.getElementById("showcaseContent");
    const headline = document.getElementById("showcaseHeadline");
    const desc    = document.getElementById("showcaseDesc");
    if (!pills.length || !content || !headline || !desc) return;

    const lang = () => window.HBIT?.i18n?.getLang?.() || "en";

    const MODULES = {
      habits:  {
        en: { h: "Build streaks that stick.",          d: "Log habits daily, track your consistency, and watch your momentum grow over time." },
        fr: { h: "Construis des habitudes durables.",  d: "Enregistre tes habitudes, suis ta régularité et observe ta progression au fil du temps." }
      },
      budget:  {
        en: { h: "See where every dollar goes.",       d: "Track expenses, set spending limits, and stay in control of your finances effortlessly." },
        fr: { h: "Vois où va chaque centime.",         d: "Suis tes dépenses, fixe des limites et garde le contrôle total de tes finances." }
      },
      sleep:   {
        en: { h: "Wake up feeling restored.",          d: "Log bedtime and wake-up, track sleep quality, and understand your recovery patterns." },
        fr: { h: "Réveille-toi vraiment reposé.",      d: "Enregistre ton sommeil, suis ta qualité de repos et optimise ta récupération." }
      },
      mood:    {
        en: { h: "Understand your emotional patterns.",d: "Track how you feel daily and discover what truly influences your well-being." },
        fr: { h: "Comprends tes émotions.",            d: "Suis ton humeur chaque jour et découvre ce qui influence vraiment ton bien-être." }
      },
      focus:   {
        en: { h: "Stay in deep-work mode.",            d: "Pomodoro sessions, focus streaks, and a distraction-free space to get things done." },
        fr: { h: "Reste en mode concentration profonde.", d: "Sessions Pomodoro, suivi du focus et un espace sans distractions pour avancer." }
      },
      planner: {
        en: { h: "Plan your days with clarity.",       d: "Daily and weekly planning that syncs with your other modules for a unified view." },
        fr: { h: "Planifie tes journées avec clarté.", d: "Planification quotidienne et hebdomadaire liée à tes autres modules." }
      }
    };

    const DEFAULT = {
      en: { h: "Everything you need to grow \u2014 in one place.", d: "Tap a module below to discover what\u2019s inside." },
      fr: { h: "Tout ce qu\u2019il te faut pour progresser \u2014 au même endroit.", d: "Touche un module ci-dessous pour en savoir plus." }
    };

    let activeModule = null;

    function setContent(data, animate) {
      if (!animate) {
        headline.textContent = data.h;
        desc.textContent = data.d;
        return;
      }
      content.classList.add("is-fading");
      setTimeout(() => {
        headline.textContent = data.h;
        desc.textContent = data.d;
        content.classList.remove("is-fading");
      }, 200);
    }

    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        const mod = pill.dataset.module;
        const l = lang();
        if (activeModule === mod) {
          // deselect — go back to default
          activeModule = null;
          pills.forEach(p => p.classList.remove("is-active"));
          pill.setAttribute("aria-pressed", "false");
          setContent(DEFAULT[l] || DEFAULT.en, true);
        } else {
          activeModule = mod;
          pills.forEach(p => { p.classList.remove("is-active"); p.setAttribute("aria-pressed", "false"); });
          pill.classList.add("is-active");
          pill.setAttribute("aria-pressed", "true");
          const mdata = MODULES[mod]?.[l] || MODULES[mod]?.en;
          if (mdata) setContent(mdata, true);
        }
      });
    });

    window.addEventListener("hbit:lang-changed", () => {
      const l = lang();
      const data = activeModule
        ? (MODULES[activeModule]?.[l] || MODULES[activeModule]?.en)
        : (DEFAULT[l] || DEFAULT.en);
      if (data) setContent(data, false);
    });
  })();

  async function setSessionPersistence() {
    // TODO: Change to LOCAL persistence before public launch.
    // SESSION is intentional during beta testing so the dev can test signup repeatedly.
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
  }

  /*
   * _inProgress = true while we are actively signing up.
   * This prevents onAuthStateChanged from redirecting the user
   * before createUserProfile() has finished writing to Firestore.
   */
  let _inProgress = false;

  /* Redirect only if a user is ALREADY signed in on page load */
  firebase.auth().onAuthStateChanged(user => {
    if (user && !_inProgress) window.location.replace("home.html");
  });

  const form          = document.getElementById("signupForm");
  const nameInput     = document.getElementById("nameInput");
  const usernameInput = document.getElementById("usernameInput");
  const emailInput    = document.getElementById("emailInput");
  const passInput     = document.getElementById("passwordInput");
  const confirmInput  = document.getElementById("confirmInput");
  const confirmHint   = document.getElementById("confirmHint");
  const termsCheck    = document.getElementById("termsCheck");
  const errorBox      = document.getElementById("signupError");
  const submitBtn     = document.getElementById("signupSubmit");
  const btnLabel      = document.getElementById("signupBtnLabel");
  const spinner       = document.getElementById("signupSpinner");
  const arrowIcon     = document.getElementById("signupArrow");
  const eyeBtn        = document.getElementById("togglePassword");
  const confirmEyeBtn = document.getElementById("toggleConfirmPassword");

  /* ── Real-time password match validation ──────────────── */
  function validatePasswordMatch() {
    const pw      = passInput?.value  ?? "";
    const confirm = confirmInput?.value ?? "";

    if (!confirm) {
      confirmHint?.classList.add("hidden");
      confirmInput?.classList.remove("valid", "error");
      return;
    }

    if (pw === confirm) {
      if (confirmHint) confirmHint.textContent = "";
      confirmHint?.classList.add("hidden");
      confirmInput?.classList.add("valid");
      confirmInput?.classList.remove("error");
    } else {
      if (confirmHint) confirmHint.textContent = t("signup.confirm.mismatch", "Passwords do not match");
      confirmHint?.classList.remove("hidden");
      confirmInput?.classList.add("error");
      confirmInput?.classList.remove("valid");
    }
  }

  const t = (key, fb) => window.HBIT?.i18n?.t(key) || fb;

  confirmInput?.addEventListener("input", validatePasswordMatch);
  passInput?.addEventListener("input", validatePasswordMatch);

  /* ── Password visibility toggle ──────────────────── */
  if (eyeBtn && passInput) {
    eyeBtn.addEventListener("click", () => {
      const showing = passInput.type === "text";
      passInput.type = showing ? "password" : "text";
      eyeBtn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      const icon = eyeBtn.querySelector(".eye-icon");
      if (icon) {
        icon.innerHTML = showing
          ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
          : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
             <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
             <line x1="1" y1="1" x2="23" y2="23"/>`;
      }
    });
  }

  if (confirmEyeBtn && confirmInput) {
    confirmEyeBtn.addEventListener("click", () => {
      const showing = confirmInput.type === "text";
      confirmInput.type = showing ? "password" : "text";
      confirmEyeBtn.setAttribute("aria-label", showing ? "Show confirm password" : "Hide confirm password");
      const icon = confirmEyeBtn.querySelector(".eye-icon");
      if (icon) {
        icon.innerHTML = showing
          ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
          : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
             <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
             <line x1="1" y1="1" x2="23" y2="23"/>`;
      }
    });
  }

  /* ── Helpers ──────────────────────────────────────── */
  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }

  function clearError() {
    errorBox?.classList.add("hidden");
    [nameInput, emailInput, passInput, confirmInput].forEach(el => el?.classList.remove("error"));
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.classList.toggle("loading", on);
    btnLabel?.classList.toggle("hidden", on);
    arrowIcon?.classList.toggle("hidden", on);
    spinner?.classList.toggle("hidden", !on);
  }

  /* ── Firebase error → friendly message ───────────── */
  function firebaseErrMsg(code) {
    switch (code) {
      case "auth/email-already-in-use":
        return t("signup.error.taken", "This email is already in use.");
      case "auth/weak-password":
        return "Password is too weak. Please use at least 8 characters.";
      case "auth/invalid-email":
        return t("login.error.email", "Please enter a valid email address.");
      default:
        return "Something went wrong. Please try again.";
    }
  }

  /* ── Email / Password sign-up ─────────────────────── */
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();

      const name     = nameInput?.value?.trim()     ?? "";
      const username = usernameInput?.value?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "";
      const email    = emailInput?.value?.trim()    ?? "";
      const password = passInput?.value             ?? "";
      const confirm  = confirmInput?.value          ?? "";

      if (!name || !email || !password || !confirm) {
        nameInput?.classList.toggle("error", !name);
        emailInput?.classList.toggle("error", !email);
        passInput?.classList.toggle("error", !password);
        confirmInput?.classList.toggle("error", !confirm);
        showError(t("login.error.empty", "Please fill in all fields."));
        return;
      }

      if (!isValidEmail(email)) {
        emailInput.classList.add("error");
        showError(t("login.error.email", "Please enter a valid email address."));
        return;
      }

      if (password.length < 8) {
        passInput.classList.add("error");
        showError(t("signup.error.short", "Password must be at least 8 characters."));
        return;
      }

      if (password !== confirm) {
        confirmInput.classList.add("error");
        showError(t("signup.error.mismatch", "Passwords do not match."));
        return;
      }

      if (termsCheck && !termsCheck.checked) {
        showError(t("signup.error.terms", "Please accept the Terms of Service to continue."));
        return;
      }

      setLoading(true);
      _inProgress = true;

      try {
        /* ── Step 1: Create the Firebase Auth account ────
           Throws ONLY on auth errors (duplicate email, weak password…) */
        await setSessionPersistence();
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);

        /* ── Step 2: Save display name to Auth profile ── */
        await cred.user.updateProfile({ displayName: name });

        /* ── Step 3: Write Firestore document ────────────
           Wrapped in its own try/catch so a Firestore rules error
           does NOT show "Something went wrong" to the user.
           The document will be created again by home.js if missing. */
        try {
          await window.HBIT.createUserProfile(
            { ...cred.user, displayName: name },
            "password",
            { username, fullName: name }
          );
        } catch (fsErr) {
          console.error("[Hbit] Firestore write failed:", fsErr.code, fsErr.message);
          console.error("[Hbit] → Paste the rules from firestore.rules in Firebase Console > Firestore > Rules");
        }

        window.location.replace("welcome.html");

      } catch (err) {
        _inProgress = false;
        setLoading(false);
        if (err.code === "auth/email-already-in-use") {
          emailInput.classList.add("error");
        } else if (err.code === "auth/weak-password") {
          passInput.classList.add("error");
        }
        showError(firebaseErrMsg(err.code));
      }
    });

    [nameInput, emailInput, passInput, confirmInput].forEach(el => {
      el?.addEventListener("input", clearError);
    });
  }

  /* ── Google sign-up ───────────────────────────────── */
  const socialBtns = document.querySelectorAll(".auth-social-btn");

  if (socialBtns[0]) {
    socialBtns[0].addEventListener("click", async () => {
      clearError();
      _inProgress = true;
      try {
        await setSessionPersistence();
        const provider = new firebase.auth.GoogleAuthProvider();
        const cred     = await firebase.auth().signInWithPopup(provider);
        await window.HBIT.createUserProfile(cred.user, "google.com");
        window.location.replace("welcome.html");
      } catch (err) {
        _inProgress = false;
        if (err.code !== "auth/popup-closed-by-user") {
          showError("Google sign-in failed. Please try again.");
        }
      }
    });
  }

  /* ── Apple sign-up ────────────────────────────────── */
  if (socialBtns[1]) {
    socialBtns[1].addEventListener("click", async () => {
      clearError();
      _inProgress = true;
      try {
        await setSessionPersistence();
        const provider = new firebase.auth.OAuthProvider("apple.com");
        const cred     = await firebase.auth().signInWithPopup(provider);
        await window.HBIT.createUserProfile(cred.user, "apple.com");
        window.location.replace("welcome.html");
      } catch (err) {
        _inProgress = false;
        if (err.code !== "auth/popup-closed-by-user") {
          showError("Apple sign-in failed. Please try again.");
        }
      }
    });
  }

  /* ── Password strength ──────────────────────────────── */
  const pwStrength = document.getElementById("pwStrength");
  const pwLabel    = document.getElementById("pwLabel");
  if (passInput && pwStrength && pwLabel) {
    passInput.addEventListener("input", function () {
      const v = this.value;
      let level = 0, label = "";
      if (v.length >= 6)  { level=1; label="Weak"; }
      if (v.length >= 8  && /[A-Z]/.test(v)) { level=2; label="Fair"; }
      if (v.length >= 10 && /[0-9]/.test(v)) { level=3; label="Good"; }
      if (v.length >= 12 && /[^A-Za-z0-9]/.test(v)) { level=4; label="Strong 💪"; }
      pwStrength.dataset.level = level;
      pwLabel.textContent = level > 0 ? label : "";
      pwLabel.style.color = ["","#ef4444","#f97316","#eab308","#3ecf7f"][level];
    });
  }

  /* ── Is-ready CTA watcher ───────────────────────────── */
  function checkFormReady() {
    const ready =
      nameInput?.value.trim() &&
      emailInput?.value.includes("@") &&
      passInput?.value.length >= 8 &&
      passInput?.value === confirmInput?.value &&
      termsCheck?.checked;
    submitBtn?.classList.toggle("is-ready", !!ready);
  }
  ["nameInput","emailInput","passwordInput","confirmInput"]
    .forEach(id => document.getElementById(id)
      ?.addEventListener("input", checkFormReady));
  termsCheck?.addEventListener("change", checkFormReady);
});
