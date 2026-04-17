/* =========================
   Hbit - js/core/theme.js
   Four-palette theme system
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  const VALID = ["midnight", "obsidian", "ivory", "arctic"];
  const KEY = "hbit:palette";
  const LEGACY_KEY = HBIT.storage?.LS?.theme || "hbit:theme";

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function normalize(name) {
    if (VALID.includes(name)) return name;
    if (name === "light") return "arctic";
    if (name === "dark") return "midnight";
    return "midnight";
  }

  function savedPalette() {
    const saved = read(KEY);
    if (VALID.includes(saved)) return saved;

    const legacy = read(LEGACY_KEY);
    if (legacy === "light") return "arctic";
    if (legacy === "dark") return "midnight";
    return "midnight";
  }

  function labelFor(name) {
    const key = `palette.${name}`;
    return HBIT.i18n?.t ? HBIT.i18n.t(key) : name.charAt(0).toUpperCase() + name.slice(1);
  }

  function syncPickerUI(palette) {
    document.querySelectorAll(".palette-chip").forEach((el) => {
      el.setAttribute("aria-checked", el.dataset.palette === palette ? "true" : "false");
    });

    document.querySelectorAll("[data-palette-label]").forEach((el) => {
      el.textContent = labelFor(palette);
    });

    const hint = document.getElementById("themeHint");
    if (hint) hint.textContent = labelFor(palette);
  }

  function syncProfile(palette) {
    if (!HBIT.db?.users || typeof firebase === "undefined") return;
    const user = firebase.auth?.().currentUser;
    if (!user) return;
    HBIT.db.users.update({ "preferences.palette": palette }).catch(() => {});
  }

  function applyPalette(name, options = {}) {
    const palette = normalize(name);
    const isLight = palette === "ivory" || palette === "arctic";

    document.documentElement.setAttribute("data-palette", palette);
    document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");

    if (!options.skipStorage) {
      write(KEY, palette);
      write(LEGACY_KEY, isLight ? "light" : "dark");
    }

    syncPickerUI(palette);
    if (!options.skipRemote) syncProfile(palette);

    window.dispatchEvent(new CustomEvent("hbit:palette-changed", { detail: { palette } }));
    window.dispatchEvent(new CustomEvent("hbit:theme-changed", { detail: { mode: isLight ? "light" : "dark", palette } }));
  }

  function apply() {
    applyPalette(savedPalette(), { skipRemote: true });
  }

  function cycle() {
    const current = document.documentElement.getAttribute("data-palette") || savedPalette();
    const next = VALID[(VALID.indexOf(normalize(current)) + 1) % VALID.length];
    applyPalette(next);
    HBIT.i18n?.apply?.(document);
    HBIT.i18n?.updateToggle?.();
  }

  function bind() {
    const btn = document.getElementById("themeToggle");
    if (!btn || btn.dataset.bound) return;

    btn.dataset.bound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      cycle();
    });
  }

  document.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-palette]");
    if (!chip || !chip.classList.contains("palette-chip")) return;
    e.preventDefault();
    applyPalette(chip.dataset.palette);
    HBIT.i18n?.apply?.(chip.closest(".palette-picker") || document);
  });

  HBIT.palette = {
    valid: VALID.slice(),
    apply: applyPalette,
    get: () => document.documentElement.getAttribute("data-palette") || savedPalette(),
  };

  HBIT.theme = {
    apply,
    cycle,
    bind,
    getMode: () => document.documentElement.getAttribute("data-palette") || savedPalette(),
  };

  apply();
})();
