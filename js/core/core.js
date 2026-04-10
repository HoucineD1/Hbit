/* =========================
   Hbit - js/core/core.js
   Global boot (theme + i18n + nav + auth guard)
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  function boot() {
    HBIT.theme?.apply?.();
    HBIT.i18n?.apply?.(document);
    HBIT.theme?.bind?.();
    HBIT.i18n?.bind?.();
    HBIT.nav?.init?.();
  }

  /**
   * A0 — Shared auth guard.
   * Resolves with the signed-in user or redirects to the login page.
   * Usage: HBIT.requireAuth().then(user => { ... }).catch(() => {});
   */
  HBIT.requireAuth = function (redirectTo) {
    return new Promise(function (resolve, reject) {
      if (typeof firebase === "undefined") {
        resolve(null);
        return;
      }
      var unsub = firebase.auth().onAuthStateChanged(function (user) {
        unsub();
        if (!user) {
          window.location.replace(redirectTo || "login.html");
          reject(new Error("unauthenticated"));
        } else {
          resolve(user);
        }
      });
    });
  };

  HBIT.core = { boot: boot };
})();
