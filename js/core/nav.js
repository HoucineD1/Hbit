/* =========================
   Hbit — js/core/nav.js
   Sidebar controller + swipe gestures
   ========================= */
(function () {
  var HBIT = (window.HBIT = window.HBIT || {});
  var MOBILE = 768;
  var EDGE_ZONE = 28;
  var VELOCITY_THRESHOLD = 0.35;
  var SNAP_THRESHOLD = 0.35;

  var sidebar, overlay, trigger, closeBtn;
  var sidebarWidth = 300;

  function isMobile() {
    return window.innerWidth < MOBILE;
  }

  function getSidebarWidth() {
    return sidebar ? sidebar.offsetWidth : 300;
  }

  /* ── Open / Close (class-based, with transitions) ── */
  function open() {
    document.body.classList.add("nav-open");
    sidebar && sidebar.setAttribute("aria-hidden", "false");
    trigger && trigger.setAttribute("aria-expanded", "true");
    clearInlineTransform();
  }

  function close() {
    document.body.classList.remove("nav-open");
    sidebar && sidebar.setAttribute("aria-hidden", "true");
    trigger && trigger.setAttribute("aria-expanded", "false");
    clearInlineTransform();
  }

  function clearInlineTransform() {
    if (sidebar) sidebar.style.transform = "";
    if (overlay) overlay.style.opacity = "";
  }

  function toggle() {
    if (isMobile()) {
      document.body.classList.contains("nav-open") ? close() : open();
    } else {
      document.body.classList.toggle("sb-collapsed");
      var collapsed = document.body.classList.contains("sb-collapsed");
      try { localStorage.setItem("hbit:sb-collapsed", collapsed ? "1" : ""); } catch (_) {}
    }
  }

  /* ── Active page highlight ── */
  function setActive() {
    if (!sidebar) return;
    var path = location.pathname.split("/").pop() || "home.html";
    sidebar.querySelectorAll(".sb-item[data-page]").forEach(function (el) {
      if (el.dataset.page === path) {
        el.setAttribute("aria-current", "page");
      } else {
        el.removeAttribute("aria-current");
      }
    });
  }

  /* ── Resize handler ── */
  function handleResize() {
    if (!isMobile()) {
      document.body.classList.remove("nav-open");
      sidebar && sidebar.setAttribute("aria-hidden", "false");
    } else {
      if (!document.body.classList.contains("nav-open")) {
        sidebar && sidebar.setAttribute("aria-hidden", "true");
      }
    }
    sidebarWidth = getSidebarWidth();
  }

  /* ═══════════════════════════════════════════════════════
     SWIPE GESTURE — mobile only
     Drag from left edge to open, swipe left to close.
     Sidebar follows the finger in real-time.
     ═══════════════════════════════════════════════════════ */
  var touch = {
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    isOpen: false,
    locked: false
  };

  function onTouchStart(e) {
    if (!isMobile() || !sidebar) return;

    var t = e.touches[0];
    var isOpen = document.body.classList.contains("nav-open");

    if (!isOpen && t.clientX > EDGE_ZONE) return;
    if (isOpen && t.clientX > sidebarWidth + 20) {
      return;
    }

    touch.active = true;
    touch.startX = t.clientX;
    touch.startY = t.clientY;
    touch.startTime = Date.now();
    touch.currentX = t.clientX;
    touch.isOpen = isOpen;
    touch.locked = false;
  }

  function onTouchMove(e) {
    if (!touch.active) return;

    var t = e.touches[0];
    var dx = t.clientX - touch.startX;
    var dy = t.clientY - touch.startY;

    if (!touch.locked) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        touch.active = false;
        return;
      }
      if (Math.abs(dx) > 8) {
        touch.locked = true;
        document.body.classList.add("sb-dragging");
        sidebarWidth = getSidebarWidth();
      } else {
        return;
      }
    }

    touch.currentX = t.clientX;

    var offset;
    if (touch.isOpen) {
      offset = Math.min(0, dx);
      var pct = 1 + (offset / sidebarWidth);
      pct = Math.max(0, Math.min(1, pct));
      sidebar.style.transform = "translateX(" + (offset) + "px)";
      if (overlay) overlay.style.opacity = pct;
    } else {
      offset = Math.min(t.clientX, sidebarWidth);
      var translate = -sidebarWidth + offset;
      translate = Math.min(0, translate);
      var pctOpen = offset / sidebarWidth;
      pctOpen = Math.max(0, Math.min(1, pctOpen));
      sidebar.style.transform = "translateX(" + translate + "px)";
      if (overlay) {
        overlay.style.visibility = "visible";
        overlay.style.pointerEvents = "auto";
        overlay.style.opacity = pctOpen;
      }
    }

    if (touch.locked) {
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    if (!touch.active || !touch.locked) {
      touch.active = false;
      return;
    }

    document.body.classList.remove("sb-dragging");

    var dx = touch.currentX - touch.startX;
    var dt = (Date.now() - touch.startTime) / 1000;
    var velocity = dt > 0 ? dx / dt / sidebarWidth : 0;

    if (touch.isOpen) {
      var shouldClose = velocity < -VELOCITY_THRESHOLD || (dx < 0 && Math.abs(dx) > sidebarWidth * SNAP_THRESHOLD);
      if (shouldClose) {
        close();
      } else {
        open();
      }
    } else {
      var progress = Math.min(touch.currentX, sidebarWidth) / sidebarWidth;
      var shouldOpen = velocity > VELOCITY_THRESHOLD || progress > SNAP_THRESHOLD;
      if (shouldOpen) {
        open();
      } else {
        close();
      }
    }

    if (overlay) {
      overlay.style.visibility = "";
      overlay.style.pointerEvents = "";
    }

    touch.active = false;
    touch.locked = false;
  }

  /* ── Init ── */
  function init() {
    sidebar  = document.querySelector(".sb");
    overlay  = document.querySelector(".sb-overlay");
    trigger  = document.querySelector(".sb-trigger");
    closeBtn = document.querySelector(".sb-close");

    if (!sidebar) return;

    document.body.classList.add("has-sidebar");
    sidebarWidth = getSidebarWidth();

    var collapseBtn = document.querySelector(".sb-collapse");

    if (trigger)    trigger.addEventListener("click", toggle);
    if (closeBtn)   closeBtn.addEventListener("click", close);
    if (collapseBtn) collapseBtn.addEventListener("click", function () {
      document.body.classList.add("sb-collapsed");
      try { localStorage.setItem("hbit:sb-collapsed", "1"); } catch (_) {}
    });
    if (overlay)    overlay.addEventListener("click", close);

    sidebar.querySelectorAll(".sb-item[data-page]").forEach(function (el) {
      el.addEventListener("click", function () {
        if (isMobile()) close();
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        close();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggle();
      }
    });

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    var logoutBtn = document.getElementById("sbLogout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        if (typeof firebase !== "undefined" && firebase.auth) {
          firebase.auth().signOut().then(function () {
            window.location.href = "index.html";
          }).catch(function () {
            window.location.href = "index.html";
          });
        } else {
          window.location.href = "index.html";
        }
      });
    }

    window.addEventListener("resize", handleResize);

    var saved = "";
    try { saved = localStorage.getItem("hbit:sb-collapsed"); } catch (_) {}
    if (saved === "1" && !isMobile()) {
      document.body.classList.add("sb-collapsed");
    }

    setActive();
    handleResize();
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || href.indexOf("http") === 0 || href.indexOf("mailto:") === 0) return;
    if (a.target && a.target !== "_self") return;
    if (!document.startViewTransition) return;
    e.preventDefault();
    document.startViewTransition(function () {
      window.location.href = href;
    });
  });

  HBIT.nav = { init: init, setActive: setActive, open: open, close: close, toggle: toggle };
})();
