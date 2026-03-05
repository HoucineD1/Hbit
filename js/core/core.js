/* =========================
   Hbit — js/core/core.js
   Global boot (theme + i18n + nav)
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  function boot() {
    // Apply prefs first
    HBIT.theme?.apply?.();
    HBIT.i18n?.apply?.(document);

    // Bind buttons
    HBIT.theme?.bind?.();
    HBIT.i18n?.bind?.();

    // Set nav active
    HBIT.nav?.setActive?.();

    // Optional: keep date formatting updated when lang changes
    // (home.js listens to hbit:lang-changed already)
  }

  HBIT.core = { boot };
})();
