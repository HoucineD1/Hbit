/* =========================
   Hbit — js/core/toast.js
   Global toast notifications + offline banner
   ========================= */
(function () {
  "use strict";
  const HBIT = (window.HBIT = window.HBIT || {});

  /* ── Toast host ──────────────────────────────────────── */
  function getHost() {
    var host = document.getElementById("hbit-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "hbit-toast-host";
      host.setAttribute("aria-live", "polite");
      host.setAttribute("aria-atomic", "false");
      document.body.appendChild(host);
    }
    return host;
  }

  /* ── Show a single toast ─────────────────────────────── */
  function toast(msg, type) {
    var host = getHost();
    var el = document.createElement("div");
    el.className = "hbit-toast hbit-toast--" + (type || "info");
    el.setAttribute("role", "status");
    el.textContent = msg;
    host.appendChild(el);

    // Animate in on next frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add("hbit-toast--show");
      });
    });

    // Auto-dismiss after 4 s
    setTimeout(function () {
      el.classList.remove("hbit-toast--show");
      el.addEventListener("transitionend", function () { el.remove(); }, { once: true });
      // Fallback remove in case transition doesn't fire
      setTimeout(function () { el.remove(); }, 400);
    }, 4000);
  }

  /* ── Offline / online banner ─────────────────────────── */
  function tToast(key, fallback) {
    return HBIT.i18n && typeof HBIT.i18n.t === "function"
      ? HBIT.i18n.t(key, fallback)
      : fallback;
  }

  function showOfflineBanner() {
    if (document.getElementById("hbit-offline-banner")) return;
    var el = document.createElement("div");
    el.id = "hbit-offline-banner";
    el.className = "hbit-offline-banner";
    el.textContent = tToast(
      "toast.offline",
      "You\u2019re offline \u2014 changes will sync when you reconnect."
    );
    document.body.prepend(el);
  }

  function hideOfflineBanner() {
    var el = document.getElementById("hbit-offline-banner");
    if (el) el.remove();
  }

  window.addEventListener("offline", showOfflineBanner);
  window.addEventListener("online", function () {
    hideOfflineBanner();
    toast(
      tToast("toast.online", "Back online \u2014 syncing your data."),
      "success"
    );
  });

  // Show immediately if already offline
  if (!navigator.onLine) showOfflineBanner();

  /* ── Public API ──────────────────────────────────────── */
  HBIT.toast = {
    success : function (msg) { toast(msg, "success"); },
    error   : function (msg) { toast(msg, "error");   },
    info    : function (msg) { toast(msg, "info");    },
    warn    : function (msg) { toast(msg, "warn");    },
  };
})();
