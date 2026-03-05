/* =========================
   Hbit — js/core/nav.js
   Nav active state + mobile drawer
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});
  const qsa = HBIT.utils?.qsa || ((sel, root = document) => Array.from(root.querySelectorAll(sel)));

  function currentKeyFromFile() {
    const file = (location.pathname || "").toLowerCase().split("/").pop() || "home.html";
    const map = {
      "home.html": "overview",
      "plan.html": "plan",
      "settings.html": "settings",
      "profile.html": "profile",
      "budget.html": "budget",
      "sleep.html": "sleep",
      "mood.html": "mood",
      "habits.html": "habits",
      "focus.html": "focus",
      "quit.html": "quit",
    };
    return map[file] || "";
  }

  function setActive() {
    const key = currentKeyFromFile();
    if (!key) return;
    qsa(".bottom-nav .nav-item").forEach((a) => {
      const k = a.getAttribute("data-nav") || "";
      const active = k === key;
      a.classList.toggle("active", active);
      a.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  /* ── Mobile drawer : déployée uniquement au clic sur le bouton ☰ ── */
  function initMobileDrawer() {
    if (!document.querySelector(".bottom-nav")) return;
    if (document.getElementById("navMenuBtn")) return;

    document.body.classList.remove("nav-open");

    const btn = document.createElement("button");
    btn.id = "navMenuBtn";
    btn.className = "nav-menu-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Open navigation");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>`;
    document.body.appendChild(btn);

    function openNav() {
      document.body.classList.add("nav-open");
      btn.setAttribute("aria-expanded", "true");
    }
    function closeNav() {
      document.body.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.classList.contains("nav-open") ? closeNav() : openNav();
    });

    document.addEventListener("click", (e) => {
      if (!document.body.classList.contains("nav-open")) return;
      if (!e.target.closest(".bottom-nav") && !e.target.closest("#navMenuBtn")) closeNav();
    }, true);

    qsa(".bottom-nav .nav-item").forEach((item) => {
      item.addEventListener("click", () => closeNav());
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) closeNav();
    });
  }

  // Auto-init once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileDrawer);
  } else {
    initMobileDrawer();
  }

  HBIT.nav = { setActive, initMobileDrawer };
})();
