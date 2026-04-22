/* =========================
   Hbit - js/core/theme.js
   Four-palette theme system
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  const VALID = ["midnight", "obsidian", "sage", "arctic"];
  const KEY = "hbit:palette";
  const LEGACY_KEY = HBIT.storage?.LS?.theme || "hbit:theme";
  const LEGACY_MAP = {
    dark:    "midnight",
    light:   "arctic",
    terra:   "obsidian",
    prism:   "arctic",
    aurora:  "obsidian",
  };

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function normalize(name) {
    const value = String(name || "").toLowerCase();
    if (VALID.includes(value)) return value;
    return LEGACY_MAP[value] || "midnight";
  }

  function isLightPalette(palette) {
    return palette === "sage" || palette === "arctic";
  }

  function savedPalette() {
    const saved = read(KEY);
    if (VALID.includes(saved)) return saved;
    if (saved) write(KEY, "midnight");

    const legacy = read(LEGACY_KEY);
    if (legacy && LEGACY_MAP[legacy]) return LEGACY_MAP[legacy];
    return "midnight";
  }

  function labelFor(name) {
    const key = `theme.${name}`;
    const fallbackKey = `palette.${name}`;
    const fallback = name.charAt(0).toUpperCase() + name.slice(1);
    if (!HBIT.i18n?.t) return fallback;
    return HBIT.i18n.t(key, HBIT.i18n.t(fallbackKey, fallback));
  }

  function syncPickerUI(palette) {
    document.querySelectorAll(".palette-chip").forEach((el) => {
      const checked = el.dataset.palette === palette;
      el.setAttribute("aria-checked", checked ? "true" : "false");
      el.classList.toggle("is-active", checked);
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
    const mode = isLightPalette(palette) ? "light" : "dark";

    document.documentElement.setAttribute("data-palette", palette);
    document.documentElement.setAttribute("data-theme", mode);

    if (!options.skipStorage) {
      write(KEY, palette);
      write(LEGACY_KEY, mode);
    }

    syncPickerUI(palette);
    if (!options.skipRemote) syncProfile(palette);

    window.dispatchEvent(new CustomEvent("hbit:palette-changed", { detail: { palette } }));
    window.dispatchEvent(new CustomEvent("hbit:theme-changed", { detail: { mode, palette } }));
    return palette;
  }

  function apply() {
    return applyPalette(savedPalette(), { skipRemote: true });
  }

  function current() {
    return normalize(document.documentElement.getAttribute("data-palette") || savedPalette());
  }

  function cycle() {
    const active = current();
    const next = VALID[(VALID.indexOf(active) + 1) % VALID.length];
    applyPalette(next);
    HBIT.i18n?.apply?.(document);
    HBIT.i18n?.updateToggle?.();
    return next;
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
    get: current,
  };

  HBIT.theme = {
    apply,
    set: applyPalette,
    current,
    cycle,
    bind,
    getMode: () => (isLightPalette(current()) ? "light" : "dark"),
  };

  apply();
})();
