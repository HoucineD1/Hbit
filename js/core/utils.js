/* =========================
   Hbit — js/core/utils.js
   ========================= */
(function () {
  const HBIT = (window.HBIT = window.HBIT || {});

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function on(elOrSel, evt, fn, opts) {
    const el = typeof elOrSel === "string" ? qs(elOrSel) : elOrSel;
    if (!el) return;
    el.addEventListener(evt, fn, opts);
  }

  const num = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  function setText(idOrEl, text) {
    const el = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
    if (el) el.textContent = String(text);
  }

  function formatDateNice(d = new Date(), lang = "en") {
    try {
      return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch {
      return "";
    }
  }

  /**
   * Shared help modal (`.hbit-help-overlay` + `.hbit-help-card`): open/close, Escape, focus trap.
   * Budget uses `openOverlay` in budget.js instead.
   */
  function initHelpModal(opts) {
    const openBtn = typeof opts.openBtn === "string" ? qs(opts.openBtn) : opts.openBtn;
    const overlay = typeof opts.overlay === "string" ? qs(opts.overlay) : opts.overlay;
    const closeBtn =
      typeof opts.closeBtn === "string"
        ? qs(opts.closeBtn)
        : opts.closeBtn || overlay?.querySelector(".hbit-help-close");
    const card = overlay?.querySelector(".hbit-help-card") || overlay;
    let lastFocus = null;
    let onKey = null;

    function focusables() {
      if (!card) return [];
      return qsa(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        card
      ).filter((el) => el.getClientRects().length > 0);
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.setAttribute("aria-hidden", "false");
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      const first = closeBtn || focusables()[0];
      requestAnimationFrame(() => first?.focus?.());

      onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          return;
        }
        if (e.key !== "Tab" || !card) return;
        const nodes = focusables();
        if (nodes.length === 0) return;
        const firstN = nodes[0];
        const lastN = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === firstN) {
          e.preventDefault();
          lastN.focus();
        } else if (!e.shiftKey && document.activeElement === lastN) {
          e.preventDefault();
          firstN.focus();
        }
      };
      document.addEventListener("keydown", onKey);
      opts.onOpen?.();
    }

    function close() {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (onKey) document.removeEventListener("keydown", onKey);
      onKey = null;
      lastFocus?.focus?.();
      opts.onClose?.();
    }

    openBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    });
    closeBtn?.addEventListener("click", close);
    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    return { open, close };
  }

  /**
   * Remove .skeleton class from elements and fade them in.
   * @param {string|Element|NodeList} target - CSS selector, element, or NodeList
   * @param {Element} [root=document] - scope for selector queries
   */
  function hideSkeletons(target, root) {
    let els;
    if (typeof target === "string") {
      els = qsa(target, root || document);
    } else if (target instanceof Element) {
      els = [target];
    } else if (target && typeof target.forEach === "function") {
      els = Array.from(target);
    } else {
      els = qsa(".skeleton", root || document);
    }
    els.forEach(function (el) {
      if (!el.classList.contains("skeleton")) return;
      el.classList.remove("skeleton");
      el.style.opacity = "0";
      requestAnimationFrame(function () {
        el.style.transition = "opacity 0.2s ease";
        el.style.opacity = "1";
        el.addEventListener("transitionend", function handler() {
          el.style.transition = "";
          el.style.opacity = "";
          el.removeEventListener("transitionend", handler);
        }, { once: true });
      });
    });
  }

  HBIT.utils = { qs, qsa, on, num, setText, formatDateNice, initHelpModal, hideSkeletons };
})();
