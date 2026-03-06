/* =========================
   Hbit — js/core/nav.js
   Nav active state + mobile drawer
   ========================= */
(function () {
  "use strict";
  if (typeof document !== "undefined" && document.body) document.body.classList.remove("nav-open");

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

  /* ── Mobile drawer (ChatGPT-style): one ☰, overlay close, nav link close ── */
  function initMobileDrawer() {
    var nav = document.querySelector(".bottom-nav");
    if (!nav) return;
    if (document.getElementById("navMenuBtn")) return;

    /* Start closed: no stuck open state */
    document.body.classList.remove("nav-open");

    var overlay = document.createElement("div");
    overlay.id = "navOverlay";
    overlay.className = "nav-overlay";
    overlay.setAttribute("role", "button");
    overlay.setAttribute("aria-label", "Close menu");
    overlay.setAttribute("tabindex", "-1");
    document.body.appendChild(overlay);

    var btn = document.createElement("button");
    btn.id = "navMenuBtn";
    btn.className = "nav-menu-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Menu");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    document.body.appendChild(btn);

    function openNav() {
      document.body.classList.add("nav-open");
      btn.setAttribute("aria-expanded", "true");
    }
    function closeNav() {
      if (!document.body.classList.contains("nav-open")) return;
      document.body.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
    }

    function toggleNavFromEvent(e) {
      e.preventDefault();
      e.stopPropagation();
      if (document.body.classList.contains("nav-open")) closeNav();
      else openNav();
    }

    /* Use pointerdown so both touch and mouse work; click would fire again on touch and double-toggle */
    btn.addEventListener("pointerdown", toggleNavFromEvent);

    overlay.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeNav();
    });
    overlay.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeNav();
    });

    qsa(".bottom-nav .nav-item").forEach(function (el) {
      el.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
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
