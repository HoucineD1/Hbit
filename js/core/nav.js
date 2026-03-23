/* =========================
   Hbit - js/core/nav.js
   Nav active state + mobile drawer
   ========================= */
(function () {
  "use strict";

  if (typeof document !== "undefined" && document.body) {
    document.body.classList.remove("nav-open");
  }

  const HBIT = (window.HBIT = window.HBIT || {});
  const qsa = HBIT.utils?.qsa || ((sel, root = document) => Array.from(root.querySelectorAll(sel)));

  function currentKeyFromFile() {
    const file = (location.pathname || "").toLowerCase().split("/").pop() || "home.html";
    const map = {
      "home.html": "overview",
      "plan.html": "plan",
      "profile.html": "profile",
      "budget.html": "budget",
      "sleep.html": "sleep",
      "mood.html": "mood",
      "habits.html": "habits",
      "focus.html": "focus",
    };
    return map[file] || "";
  }

  function setActive() {
    const key = currentKeyFromFile();
    if (!key) return;

    qsa(".bottom-nav .nav-item").forEach((a) => {
      const active = (a.getAttribute("data-nav") || "") === key;
      a.classList.toggle("active", active);
      a.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function initMobileDrawer() {
    const nav = document.querySelector(".bottom-nav");
    if (!nav || document.getElementById("navMenuBtn")) return;

    document.body.classList.remove("nav-open");

    const overlay = document.createElement("div");
    overlay.id = "navOverlay";
    overlay.className = "nav-overlay";
    overlay.setAttribute("role", "button");
    overlay.setAttribute("aria-label", "Close menu");
    overlay.setAttribute("tabindex", "-1");
    document.body.appendChild(overlay);

    if (!nav.querySelector(".nav-drawer-head")) {
      const head = document.createElement("div");
      head.className = "nav-drawer-head";
      head.innerHTML = `
        <div class="nav-drawer-title">Hbit</div>
        <button class="nav-close-btn" id="navCloseBtn" type="button" aria-label="Close menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      nav.insertBefore(head, nav.firstChild);
    }

    const btn = document.createElement("button");
    btn.id = "navMenuBtn";
    btn.className = "nav-menu-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Menu");
    btn.setAttribute("aria-expanded", "false");
    document.body.appendChild(btn);
    const closeBtn = nav.querySelector("#navCloseBtn");

    function syncToggleUi() {
      const open = document.body.classList.contains("nav-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      btn.innerHTML = open
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    }

    function openNav() {
      document.body.classList.add("nav-open");
      syncToggleUi();
    }

    function closeNav() {
      if (!document.body.classList.contains("nav-open")) return;
      document.body.classList.remove("nav-open");
      syncToggleUi();
    }

    function toggleNavFromEvent(e) {
      e.preventDefault();
      e.stopPropagation();
      if (document.body.classList.contains("nav-open")) closeNav();
      else openNav();
    }

    btn.addEventListener("pointerdown", toggleNavFromEvent);
    closeBtn?.addEventListener("click", closeNav);

    overlay.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeNav();
    });

    overlay.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeNav();
    });

    qsa(".bottom-nav .nav-item").forEach((el) => {
      el.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 640) closeNav();
    });

    syncToggleUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileDrawer);
  } else {
    initMobileDrawer();
  }

  HBIT.nav = { setActive, initMobileDrawer };
})();
