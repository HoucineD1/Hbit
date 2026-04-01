/* =========================
   Hbit — js/core/storage.js
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});
  const LS = {
    theme: "hbit:theme",  // "auto" | "dark" | "light"
    lang: "hbit:lang",    // "en" | "fr"
  };

  function readStr(key, fallback = "") {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : String(v);
    } catch {
      return fallback;
    }
  }

  function writeStr(key, value) {
    try { localStorage.setItem(key, String(value)); } catch {}
  }

  HBIT.storage = { LS, readStr, writeStr };
})();
