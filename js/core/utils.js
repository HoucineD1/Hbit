/* =========================
   Hbit — js/core/utils.js
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function on(elOrSel, evt, fn, opts) {
    const el = typeof elOrSel === "string" ? qs(elOrSel) : elOrSel;
    if (!el) return;
    el.addEventListener(evt, fn, opts);
  }

  const num = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  function setText(idOrEl, text) {
    const el = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
    if (el) el.textContent = String(text);
  }

  function formatDateNice(d = new Date(), lang = "en") {
    try {
      return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch {
      return "";
    }
  }

  HBIT.utils = { qs, qsa, on, num, setText, formatDateNice };
})();
