/* =========================
   Hbit — js/app.js (bulletproof)
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  function initByBodyId() {
    const id = document.body && document.body.id;
    if (id === "homePage") HBIT.pages?.home?.init?.();
    if (id === "budgetPage") HBIT.pages?.budget?.init?.();
    if (id === "moodPage") HBIT.pages?.mood?.init?.();
    if (id === "sleepPage") HBIT.pages?.sleep?.init?.();
    if (id === "habitsPage") HBIT.pages?.habits?.init?.();
  }

  function bootAll() {
    // ✅ Boot even if core.js isn't loaded
    HBIT.theme?.apply?.();
    HBIT.theme?.bind?.();

    HBIT.i18n?.apply?.(document);
    HBIT.i18n?.bind?.();

    HBIT.nav?.setActive?.();

    initByBodyId();

    console.log("HBIT boot OK (safe)", {
      hasCore: !!HBIT.core,
      hasTheme: !!HBIT.theme,
      hasI18n: !!HBIT.i18n,
      hasUtils: !!HBIT.utils,
    });
  }

  function bindGlobalToggles() {
    if (document.documentElement.dataset.hbitToggleBound) return;
    document.documentElement.dataset.hbitToggleBound = "1";

    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!target || !target.closest) return;

      const langBtn = target.closest("#langToggle");
      if (langBtn) {
        e.preventDefault();
        const html = document.documentElement;
        const current = HBIT.i18n?.getLang ? HBIT.i18n.getLang() : (html.lang || "en");
        const next = current === "fr" ? "en" : "fr";

        if (HBIT.i18n?.setLang) {
          HBIT.i18n.setLang(next);
        } else if (HBIT.i18n?.applyLang) {
          HBIT.i18n.applyLang(document, next);
        } else {
          html.lang = next;
          const label = document.getElementById("langLabel");
          if (label) label.textContent = next === "en" ? "FR" : "EN";
        }
      }

      const themeBtn = target.closest("#themeToggle");
      if (themeBtn) {
        e.preventDefault();
        if (HBIT.theme?.cycle) HBIT.theme.cycle();
        else {
          const html = document.documentElement;
          const next = html.dataset.theme === "light" ? "dark" : "light";
          html.dataset.theme = next;
        }
      }
    });
  }

  function bindLangButtonDirect() {
    const btn = document.getElementById("langToggle");
    if (!btn || btn.dataset.boundApp) return;
    btn.dataset.boundApp = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const html = document.documentElement;
      const current = HBIT.i18n?.getLang ? HBIT.i18n.getLang() : (html.lang || "en");
      const next = current === "fr" ? "en" : "fr";

      if (HBIT.i18n?.setLang) {
        HBIT.i18n.setLang(next);
      } else if (HBIT.i18n?.applyLang) {
        HBIT.i18n.applyLang(document, next);
      } else {
        html.lang = next;
      }
    });
  }

  function start() {
    bindGlobalToggles();
    bindLangButtonDirect();
    // if core exists, use it, otherwise fallback
    if (HBIT.core?.boot) {
      HBIT.core.boot();
      // core.boot does not init pages; do it here
      initByBodyId();
    } else {
      bootAll();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
