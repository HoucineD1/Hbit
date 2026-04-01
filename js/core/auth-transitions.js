/* =========================
   Hbit — js/core/auth-transitions.js
   Page fade-in / fade-out transitions
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      document.body.classList.add("page-ready")
    )
  );

  const selectors = [
    ".auth-close-btn",
    ".auth-bottom-link a",
    ".auth-topbar-brand",
    ".ld-nav-ghost",
    ".ld-nav-solid",
    ".ld-cta-primary",
    ".ld-cta-secondary"
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.addEventListener("click", e => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const href = el.getAttribute("href");
        if (!href || href.startsWith("#") ||
            href.startsWith("http")) return;
        e.preventDefault();
        document.body.classList.add("page-exit");
        window.setTimeout(() => window.location.assign(href), 230);
      });
    });
  });
});
