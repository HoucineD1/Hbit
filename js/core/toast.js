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
  // opts: { action?: string, onAction?: () => void, duration?: number }
  function toast(msg, type, opts) {
    opts = opts || {};
    var host = getHost();
    var el = document.createElement("div");
    el.className = "hbit-toast hbit-toast--" + (type || "info");
    el.setAttribute("role", type === "error" ? "alert" : "status");

    var msgEl = document.createElement("span");
    msgEl.className = "hbit-toast-msg";
    msgEl.textContent = msg;
    el.appendChild(msgEl);

    var dismissTimer = null;
    function dismiss() {
      if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
      el.classList.remove("hbit-toast--show");
      el.addEventListener("transitionend", function () { el.remove(); }, { once: true });
      setTimeout(function () { el.remove(); }, 400);
    }

    if (opts.action && typeof opts.onAction === "function") {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hbit-toast-action";
      btn.textContent = opts.action;
      btn.addEventListener("click", function () {
        try { opts.onAction(); } catch (_) {}
        dismiss();
      });
      el.appendChild(btn);
    }
    host.appendChild(el);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add("hbit-toast--show");
      });
    });

    var duration = typeof opts.duration === "number"
      ? opts.duration
      : (opts.action ? 6000 : 3000);
    if (duration > 0) {
      dismissTimer = setTimeout(dismiss, duration);
    }
    return { dismiss: dismiss, el: el };
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
    show    : toast,
    success : function (msg, opts) { return toast(msg, "success", opts); },
    error   : function (msg, opts) { return toast(msg, "error",   opts); },
    info    : function (msg, opts) { return toast(msg, "info",    opts); },
    warn    : function (msg, opts) { return toast(msg, "warn",    opts); },
  };
})();
