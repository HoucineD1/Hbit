/* =========================
   Hbit — js/core/theme.js
   Modes: auto → dark → light
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});
  const storage = HBIT.storage;

  const KEY = storage?.LS?.theme || "hbit:theme";
  const MODES = ["auto", "dark", "light"];

  function getStoredMode() {
    try {
      const m = localStorage.getItem(KEY);
      return MODES.includes(m) ? m : "auto";
    } catch {
      return "auto";
    }
  }

  function setStoredMode(mode) {
    try {
      localStorage.setItem(KEY, mode);
    } catch {}
  }

  function systemPrefersDark() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function resolveTheme(mode) {
    if (mode === "auto") {
      return systemPrefersDark() ? "dark" : "light";
    }
    return mode;
  }

  function updateHint(mode, resolved) {
    const hint = document.getElementById("themeHint");
    if (!hint) return;

    if (mode === "auto") {
      hint.textContent = `Auto (${resolved.charAt(0).toUpperCase() + resolved.slice(1)})`;
    } else {
      hint.textContent = resolved.charAt(0).toUpperCase() + resolved.slice(1);
    }
  }

  function apply() {
    const mode = getStoredMode();
    const resolved = resolveTheme(mode);

    // 🔑 CSS hook
    document.documentElement.dataset.theme = resolved;

    updateHint(mode, resolved);
  }

  function cycle() {
    const current = getStoredMode();
    const idx = MODES.indexOf(current);
    const next = MODES[(idx + 1) % MODES.length];

    setStoredMode(next);
    apply();

    window.dispatchEvent(
      new CustomEvent("hbit:theme-changed", { detail: { mode: next } })
    );
  }

  function bind() {
    const btn = document.getElementById("themeToggle");
    if (!btn || btn.dataset.bound) return;

    btn.dataset.bound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      cycle();
    });

    // 🔁 Si le système change (AUTO seulement)
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        if (getStoredMode() === "auto") apply();
      };

      try {
        mq.addEventListener("change", handler);
      } catch {
        mq.addListener(handler); // fallback anciens navigateurs
      }
    }
  }

  HBIT.theme = {
    apply,
    cycle,
    bind,
    getMode: getStoredMode,
  };
})();

