/* =========================
   Hbit - js/core/components.js
   Shared UI primitives for vanilla modules.
   ========================= */
(function () {
  "use strict";

  var HBIT = (window.HBIT = window.HBIT || {});
  var previousFocus = null;

  function t(key, fallback, params) {
    return HBIT.i18n && typeof HBIT.i18n.t === "function"
      ? HBIT.i18n.t(key, fallback, params)
      : fallback;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getFocusable(root) {
    return Array.from(root.querySelectorAll([
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(","))).filter(function (el) {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    });
  }

  function closeTopLayer(result) {
    var layer = document.querySelector(".hbit-confirm-overlay.is-open");
    if (!layer) return;
    var resolver = layer._hbitResolve;
    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");
    setTimeout(function () { layer.remove(); }, 180);
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    previousFocus = null;
    if (typeof resolver === "function") resolver(!!result);
  }

  function trapTab(event, root) {
    if (event.key !== "Tab") return;
    var focusable = getFocusable(root);
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function confirmDialog(options) {
    options = options || {};
    previousFocus = document.activeElement;

    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "hbit-confirm-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay._hbitResolve = resolve;

      var title = options.title || t("confirm.title", "Are you sure?");
      var body = options.body || "";
      var confirmText = options.confirmText || t("common.confirm", "Confirm");
      var cancelText = options.cancelText || t("common.cancel", "Cancel");
      var tone = options.tone || "danger";

      overlay.innerHTML = [
        '<section class="hbit-confirm-card" role="dialog" aria-modal="true" aria-labelledby="hbitConfirmTitle" aria-describedby="hbitConfirmBody" data-tone="', escapeHtml(tone), '">',
        '  <div class="hbit-confirm-icon" aria-hidden="true">!</div>',
        '  <div class="hbit-confirm-copy">',
        '    <h2 id="hbitConfirmTitle">', escapeHtml(title), '</h2>',
        '    <p id="hbitConfirmBody">', escapeHtml(body), '</p>',
        "  </div>",
        '  <div class="hbit-confirm-actions">',
        '    <button type="button" class="hbit-confirm-secondary" data-hbit-confirm-cancel>', escapeHtml(cancelText), "</button>",
        '    <button type="button" class="hbit-confirm-primary" data-hbit-confirm-ok>', escapeHtml(confirmText), "</button>",
        "  </div>",
        "</section>",
      ].join("");

      overlay.addEventListener("click", function (event) {
        if (event.target === overlay || event.target.closest("[data-hbit-confirm-cancel]")) closeTopLayer(false);
        if (event.target.closest("[data-hbit-confirm-ok]")) closeTopLayer(true);
      });
      overlay.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeTopLayer(false);
        }
        if (event.key !== "Tab") return;
        trapTab(event, overlay);
      });

      document.body.appendChild(overlay);
      requestAnimationFrame(function () {
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
        var primary = overlay.querySelector("[data-hbit-confirm-ok]");
        if (primary) primary.focus();
      });
    });
  }

  function moduleHeader(options) {
    options = options || {};
    var accent = options.accent || "brand";
    var icon = options.icon || "H";
    var title = options.title || "";
    var subtitle = options.subtitle || "";
    return [
      '<header class="hbit-module-header" data-accent="', escapeHtml(accent), '">',
      '  <div class="hbit-module-mark" aria-hidden="true">', icon, "</div>",
      '  <div class="hbit-module-copy">',
      '    <p>', escapeHtml(subtitle), "</p>",
      '    <h1>', escapeHtml(title), "</h1>",
      "  </div>",
      '  <div class="hbit-module-actions">', options.actions || "", "</div>",
      "</header>",
    ].join("");
  }

  function stat(options) {
    options = options || {};
    return [
      '<article class="hbit-stat">',
      "  <span>", escapeHtml(options.kicker || ""), "</span>",
      "  <strong>", escapeHtml(options.value || ""), "</strong>",
      "  <small>", escapeHtml(options.meta || ""), "</small>",
      "</article>",
    ].join("");
  }

  function card(content, options) {
    options = options || {};
    return '<article class="hbit-card" data-tone="' + escapeHtml(options.tone || "neutral") + '">' + (content || "") + "</article>";
  }

  function pill(options) {
    options = options || {};
    return '<span class="hbit-pill" data-tone="' + escapeHtml(options.tone || "neutral") + '">' + escapeHtml(options.label || "") + "</span>";
  }

  function emptyState(options) {
    options = options || {};
    var tips = (options.tips || []).map(function (tip) { return "<li>" + escapeHtml(tip) + "</li>"; }).join("");
    return [
      '<section class="hbit-empty-state">',
      '  <div class="hbit-empty-icon" aria-hidden="true">', options.icon || "", "</div>",
      "  <h2>", escapeHtml(options.title || ""), "</h2>",
      "  <p>", escapeHtml(options.body || ""), "</p>",
      tips ? "<ul>" + tips + "</ul>" : "",
      options.cta || "",
      "</section>",
    ].join("");
  }

  function skeleton(options) {
    options = options || {};
    var rows = Math.max(1, Number(options.rows) || 1);
    var html = "";
    for (var i = 0; i < rows; i += 1) {
      html += '<span class="hbit-skeleton-line" style="--w:' + escapeHtml(options.width || (i === rows - 1 ? "62%" : "100%")) + '"></span>';
    }
    return '<div class="hbit-skeleton" aria-hidden="true">' + html + "</div>";
  }

  function openSheet(sheet) {
    if (!sheet) return;
    previousFocus = document.activeElement;
    sheet.hidden = false;
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    var first = getFocusable(sheet)[0];
    if (first) first.focus();
  }

  function closeSheet(sheet) {
    if (!sheet) return;
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    setTimeout(function () { sheet.hidden = true; }, 180);
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    previousFocus = null;
  }

  function bindSheet(sheet) {
    if (!sheet || sheet.dataset.hbitSheetBound === "1") return;
    sheet.dataset.hbitSheetBound = "1";
    sheet.addEventListener("click", function (event) {
      if (event.target === sheet || event.target.closest("[data-hbit-sheet-close]")) closeSheet(sheet);
    });
    sheet.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet(sheet);
      }
      trapTab(event, sheet);
    });
  }

  function init(root) {
    Array.from((root || document).querySelectorAll("[data-hbit-sheet]")).forEach(bindSheet);
  }

  var deferredInstallPrompt = null;

  function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  }

  function noteInstallSession() {
    try {
      if (sessionStorage.getItem("hbit:pwa:session-counted") === "1") return;
      sessionStorage.setItem("hbit:pwa:session-counted", "1");
      var next = Number(localStorage.getItem("hbit:pwa:sessionCount") || "0") + 1;
      localStorage.setItem("hbit:pwa:sessionCount", String(next));
    } catch (_) {}
  }

  function shouldShowInstallPrompt() {
    try {
      if (isStandalone()) return false;
      if (localStorage.getItem("hbit:pwa:dismissed") === "1") return false;
      return Number(localStorage.getItem("hbit:pwa:sessionCount") || "0") >= 3;
    } catch (_) {
      return false;
    }
  }

  function closeInstallPrompt(overlay, dismissed) {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (dismissed) {
      try { localStorage.setItem("hbit:pwa:dismissed", "1"); } catch (_) {}
    }
    setTimeout(function () { overlay.remove(); }, 180);
  }

  function showInstallPrompt() {
    if (!shouldShowInstallPrompt() || document.querySelector(".hbit-install-overlay")) return;
    var overlay = document.createElement("div");
    overlay.className = "hbit-install-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = [
      '<section class="hbit-install-card" role="dialog" aria-modal="true" aria-labelledby="hbitInstallTitle">',
      '  <h2 id="hbitInstallTitle">', escapeHtml(t("pwa.install.title", "Add Hbit to your home screen")), "</h2>",
      "  <p>", escapeHtml(t("pwa.install.body", "Open Hbit faster and keep your daily dashboard one tap away.")), "</p>",
      '  <div class="hbit-install-actions">',
      '    <button type="button" data-hbit-install-dismiss>', escapeHtml(t("common.notNow", "Not now")), "</button>",
      '    <button type="button" class="hbit-install-primary" data-hbit-install-ok>', escapeHtml(deferredInstallPrompt ? t("pwa.install.cta", "Install") : t("common.done", "Done")), "</button>",
      "  </div>",
      "</section>",
    ].join("");
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target.closest("[data-hbit-install-dismiss]")) closeInstallPrompt(overlay, true);
      if (event.target.closest("[data-hbit-install-ok]")) {
        if (deferredInstallPrompt && typeof deferredInstallPrompt.prompt === "function") {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt.userChoice.finally(function () {
            deferredInstallPrompt = null;
            closeInstallPrompt(overlay, true);
          });
        } else {
          closeInstallPrompt(overlay, true);
        }
      }
    });
    overlay.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeInstallPrompt(overlay, true);
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
    });
  }

  function initInstallPrompt() {
    noteInstallSession();
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      setTimeout(showInstallPrompt, 1200);
    });
    setTimeout(showInstallPrompt, 1600);
  }

  HBIT.components = {
    confirm: confirmDialog,
    closeConfirm: closeTopLayer,
    moduleHeader: moduleHeader,
    card: card,
    stat: stat,
    pill: pill,
    emptyState: emptyState,
    skeleton: skeleton,
    openSheet: openSheet,
    closeSheet: closeSheet,
    bindSheet: bindSheet,
    init: init,
    initInstallPrompt: initInstallPrompt,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init(document);
      initInstallPrompt();
    });
  } else {
    init(document);
    initInstallPrompt();
  }
})();
