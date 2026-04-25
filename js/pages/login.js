/* =========================
   Hbit — js/pages/login.js
   Sign-in page logic (Firebase Auth)
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  window.HBIT?.theme?.apply?.();
  window.HBIT?.i18n?.init?.();

  async function setSessionPersistence() {
    const persistence = firebase.auth.Auth.Persistence.LOCAL || firebase.auth.Auth.Persistence.SESSION;
    await firebase.auth().setPersistence(persistence);
  }

  /* Redirect to home if already signed in on page load */
  firebase.auth().onAuthStateChanged(user => {
    if (user) window.location.replace("home.html");
  });

  const form       = document.getElementById("loginForm");
  const emailInput = document.getElementById("emailInput");
  const passInput  = document.getElementById("passwordInput");
  const errorBox   = document.getElementById("loginError");
  const submitBtn  = document.getElementById("loginSubmit");
  const btnLabel   = document.getElementById("loginBtnLabel");
  const spinner    = document.getElementById("loginSpinner");
  const eyeBtn     = document.getElementById("togglePassword");

  /* ── Forgot-password panel refs ──────────────────── */
  const forgotLink      = document.getElementById("forgotLink");
  const forgotPanel     = document.getElementById("forgotPanel");
  const resetEmailInput = document.getElementById("resetEmailInput");
  const resetSendBtn    = document.getElementById("resetSendBtn");
  const resetBtnLabel   = document.getElementById("resetBtnLabel");
  const resetSpinner    = document.getElementById("resetSpinner");
  const resetMsg        = document.getElementById("resetMsg");

  const t = (key, fb) => window.HBIT?.i18n?.t?.(key, fb) ?? fb ?? key;

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

  /* ── Error helpers ────────────────────────────────── */
  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }

  function clearError() {
    errorBox?.classList.add("hidden");
    emailInput?.classList.remove("error");
    passInput?.classList.remove("error");
  }

  function markField(el, invalid) {
    el?.classList.toggle("error", invalid);
    if (invalid && el) {
      el.classList.remove("shake");
      void el.offsetWidth;
      el.classList.add("shake");
      el.addEventListener("animationend",
        () => el.classList.remove("shake"), { once: true });
    }
  }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.classList.toggle("loading", on);
    btnLabel?.classList.toggle("hidden", on);
    spinner?.classList.toggle("hidden", !on);
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  /* ── Auth-only error codes → friendly messages ────── */
  function authErrMsg(code) {
    switch (code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return t("login.error.invalid", "Invalid email or password.");
      case "auth/invalid-email":
        return t("login.error.email", "Please enter a valid email address.");
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      default:
        return "Sign-in failed. Please try again.";
    }
  }

  /* ── Forgot password: toggle panel ──────────────────
     Clicking the link opens/closes the inline reset section.
     On open, the reset email is prefilled from the main email field.  */
  if (forgotLink && forgotPanel) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = !forgotPanel.classList.contains("hidden");

      if (isOpen) {
        forgotPanel.classList.add("hidden");
        forgotLink.setAttribute("aria-expanded", "false");
      } else {
        forgotPanel.classList.remove("hidden");
        forgotLink.setAttribute("aria-expanded", "true");
        /* Prefill from main email field if it has a value */
        if (resetEmailInput && emailInput?.value?.trim()) {
          resetEmailInput.value = emailInput.value.trim();
        }
        resetMsg?.classList.add("hidden");
        resetEmailInput?.focus();
      }
    });
  }

  /* ── Forgot password: send reset email ─────────────── */
  if (resetSendBtn) {
    resetSendBtn.addEventListener("click", async () => {
      const email = resetEmailInput?.value?.trim() ?? "";
      if (!email) {
        resetEmailInput?.focus();
        return;
      }

      /* Loading state */
      if (resetBtnLabel) resetBtnLabel.textContent = "Sending…";
      resetSpinner?.classList.remove("hidden");
      resetSendBtn.disabled = true;
      resetMsg?.classList.add("hidden");

      try {
        await firebase.auth().sendPasswordResetEmail(email);
        /* Success */
        if (resetBtnLabel) resetBtnLabel.textContent = "Send reset link";
        resetSpinner?.classList.add("hidden");
        resetSendBtn.disabled = false;
        resetMsg?.classList.remove("hidden");
      } catch (err) {
        if (resetBtnLabel) resetBtnLabel.textContent = "Send reset link";
        resetSpinner?.classList.add("hidden");
        resetSendBtn.disabled = false;

        const msg = err.code === "auth/user-not-found"
          ? "No account found with this email."
          : err.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : "Failed to send reset link. Try again.";
        showError(msg);
      }
    });
  }

  /* ── Email / Password sign-in ─────────────────────── */
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();

      const email    = emailInput?.value?.trim() ?? "";
      const password = passInput?.value ?? "";

      if (!email || !password) {
        markField(emailInput, !email);
        markField(passInput, !password);
        showError(t("login.error.empty", "Please fill in all fields."));
        return;
      }

      if (!isValidEmail(email)) {
        markField(emailInput, true);
        showError(t("login.error.email", "Please enter a valid email address."));
        return;
      }

      setLoading(true);

      try {
        /* ── Step 1: Authenticate (throws on auth error) ── */
        await setSessionPersistence();
        const result = await firebase.auth().signInWithEmailAndPassword(email, password);

        /* ── Step 2: Sync Firestore profile — fire & don't block ──
           Firestore writes happen independently of navigation.
           If they fail (e.g. rules not yet set), the user still
           reaches home.html — home.js will retry the profile sync.  */
        window.HBIT?.createUserProfile?.(result.user, "password")
          .catch(() => {});

        window.location.replace("home.html");

      } catch (err) {
        /* Only Firebase AUTH errors land here now */
        setLoading(false);
        markField(emailInput, true);
        markField(passInput, true);
        showError(authErrMsg(err.code));
      }
    });

    [emailInput, passInput].forEach(el => {
      el?.addEventListener("input", () => {
        clearError();
        el.value.trim()
          ? el.classList.add("valid")
          : el.classList.remove("valid");
      });
    });
  }

  /* ── Google sign-in ───────────────────────────────── */
  const socialBtns = document.querySelectorAll(".auth-social-btn");

  if (socialBtns[0]) {
    socialBtns[0].addEventListener("click", async () => {
      clearError();
      try {
        await setSessionPersistence();
        const provider = new firebase.auth.GoogleAuthProvider();
        const result   = await firebase.auth().signInWithPopup(provider);
        window.HBIT?.createUserProfile?.(result.user, "google.com")
          .catch(() => {});
        window.location.replace("home.html");
      } catch (err) {
        if (err.code !== "auth/popup-closed-by-user") {
          showError(t("login.error.google", "Google sign-in failed. Please try again."));
        }
      }
    });
  }

  /* ── Apple sign-in ────────────────────────────────── */
  if (socialBtns[1]) {
    socialBtns[1].addEventListener("click", async () => {
      clearError();
      try {
        await setSessionPersistence();
        const provider = new firebase.auth.OAuthProvider("apple.com");
        const result   = await firebase.auth().signInWithPopup(provider);
        window.HBIT?.createUserProfile?.(result.user, "apple.com")
          .catch(() => {});
        window.location.replace("home.html");
      } catch (err) {
        if (err.code !== "auth/popup-closed-by-user") {
          showError(t("login.error.apple", "Apple sign-in failed. Please try again."));
        }
      }
    });
  }
});
