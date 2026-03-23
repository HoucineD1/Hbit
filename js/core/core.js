/* =========================
   Hbit - js/core/core.js
   Global boot (theme + i18n + nav)
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  function boot() {
    HBIT.theme?.apply?.();
    HBIT.i18n?.apply?.(document);
    HBIT.theme?.bind?.();
    HBIT.i18n?.bind?.();
    HBIT.nav?.setActive?.();
  }

  HBIT.core = { boot };
})();
