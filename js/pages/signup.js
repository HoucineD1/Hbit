/* =========================
   Hbit — js/pages/signup.js
   Sign-up page logic (Firebase Auth)
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  window.HBIT?.i18n?.init?.();

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
  const termsCheck    = document.getElementById("termsCheck");
  const errorBox      = document.getElementById("signupError");
  const submitBtn     = document.getElementById("signupSubmit");
  const btnLabel      = document.getElementById("signupBtnLabel");
  const spinner       = document.getElementById("signupSpinner");
  const arrowIcon     = document.getElementById("signupArrow");
  const eyeBtn        = document.getElementById("togglePassword");

  const t = (key, fb) => window.HBIT?.i18n?.t(key) || fb;

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

        window.location.replace("home.html");

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
        const provider = new firebase.auth.GoogleAuthProvider();
        const cred     = await firebase.auth().signInWithPopup(provider);
        await window.HBIT.createUserProfile(cred.user, "google.com");
        window.location.replace("home.html");
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
        const provider = new firebase.auth.OAuthProvider("apple.com");
        const cred     = await firebase.auth().signInWithPopup(provider);
        await window.HBIT.createUserProfile(cred.user, "apple.com");
        window.location.replace("home.html");
      } catch (err) {
        _inProgress = false;
        if (err.code !== "auth/popup-closed-by-user") {
          showError("Apple sign-in failed. Please try again.");
        }
      }
    });
  }
});
