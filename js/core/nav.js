/* =========================
   Hbit — nav.js
   Sidebar drawer (all screens)
   ========================= */
(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const qsa = HBIT.utils?.qsa || ((s, r = document) => Array.from(r.querySelectorAll(s)));

  /* ── Highlight current page in nav ── */
  function setActive() {
    const file = (location.pathname || "").toLowerCase().split("/").pop() || "home.html";
    const map = {
      "home.html": "overview", "plan.html": "plan", "profile.html": "profile",
      "budget.html": "budget", "sleep.html": "sleep", "mood.html": "mood",
      "habits.html": "habits", "focus.html": "focus",
    };
    const key = map[file] || "";
    if (!key) return;
    qsa(".bottom-nav .nav-item").forEach((a) => {
      const on = (a.getAttribute("data-nav") || "") === key;
      a.classList.toggle("active", on);
      a.setAttribute("aria-current", on ? "page" : "false");
    });
  }

  /* ── Build drawer chrome + wire events ── */
  function init() {
    const nav = document.querySelector(".bottom-nav");
    if (!nav || document.getElementById("navMenuBtn")) return;

    document.body.classList.remove("nav-open");
    document.body.classList.remove("nav-collapsed");
    try { localStorage.removeItem("hbit:nav-collapsed"); } catch (_) {}

    /* Overlay */
    const overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    overlay.setAttribute("role", "button");
    overlay.setAttribute("aria-label", "Close menu");
    overlay.setAttribute("tabindex", "-1");
    document.body.appendChild(overlay);

    /* Drawer header (brand + close) */
    if (!nav.querySelector(".nav-drawer-head")) {
      const head = document.createElement("div");
      head.className = "nav-drawer-head";
      head.innerHTML =
        '<div class="nav-drawer-brand">' +
          '<div class="nav-drawer-mark" aria-hidden="true">H</div>' +
          '<span class="nav-drawer-title">Hbit</span>' +
        '</div>' +
        '<button class="nav-close-btn" id="navCloseBtn" type="button" aria-label="Close sidebar">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>';
      nav.insertBefore(head, nav.firstChild);
    }

    /* Hamburger button */
    const menuBtn = document.createElement("button");
    menuBtn.id = "navMenuBtn";
    menuBtn.className = "nav-menu-btn";
    menuBtn.type = "button";
    menuBtn.setAttribute("aria-label", "Open menu");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="3" y1="6" x2="21" y2="6"/>' +
        '<line x1="3" y1="12" x2="21" y2="12"/>' +
        '<line x1="3" y1="18" x2="21" y2="18"/>' +
      '</svg>';
    document.body.appendChild(menuBtn);

    const closeBtn = document.getElementById("navCloseBtn");

    /* ── Open / close helpers ── */
    function open() {
      document.body.classList.add("nav-open");
      menuBtn.setAttribute("aria-expanded", "true");
    }

    function close() {
      document.body.classList.remove("nav-open");
      menuBtn.setAttribute("aria-expanded", "false");
    }

    /* ── Event wiring ── */
    menuBtn.addEventListener("click", (e) => { e.stopPropagation(); open(); });

    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => { e.stopPropagation(); close(); });
    }

    overlay.addEventListener("click", (e) => { e.stopPropagation(); close(); });

    qsa(".bottom-nav .nav-item").forEach((el) => {
      el.addEventListener("click", close);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) close();
    });
  }

  /* ── Boot ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  HBIT.nav = { setActive, init };
})();
