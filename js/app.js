/* =========================
   Hbit - js/app.js
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
    if (id === "planPage") HBIT.pages?.plan?.init?.();
  }

  function bootAll() {
    HBIT.theme?.apply?.();
    HBIT.theme?.bind?.();
    HBIT.i18n?.apply?.(document);
    HBIT.i18n?.bind?.();
    HBIT.nav?.init?.();
    initByBodyId();
  }

  function start() {
    if (HBIT.core?.boot) {
      HBIT.core.boot();
      initByBodyId();
      return;
    }
    bootAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
