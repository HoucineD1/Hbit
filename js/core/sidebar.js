/* =========================
   Hbit — js/core/sidebar.js
   Single-source sidebar injection
   ========================= */
(function () {
  var SIDEBAR_HTML = `
    <div class="sb-head">
      <div class="sb-brand">
        <div class="sb-mark">H</div>
        <span class="sb-title">Hbit</span>
      </div>
      <button class="sb-close" aria-label="Close menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <button class="sb-collapse" aria-label="Collapse sidebar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="15 9 12 12 15 15"/></svg>
      </button>
    </div>
    <div class="sb-sep"></div>
    <div class="sb-content">
      <div class="sb-group">
        <div class="sb-group-label" data-i18n="nav.menuLabel">Menu</div>
        <ul class="sb-menu">
          <li><a class="sb-item" href="home.html" data-page="home.html">
            <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
            <span class="sb-item-label" data-i18n="nav.overview">Overview</span>
          </a></li>
          <li><a class="sb-item" href="habits.html" data-page="habits.html">
            <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
            <span class="sb-item-label" data-i18n="nav.habits">Habits</span>
          </a></li>
          <li><a class="sb-item" href="budget.html" data-page="budget.html">
            <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
            <span class="sb-item-label" data-i18n="nav.budget">Budget</span>
          </a></li>
          <li><a class="sb-item" href="sleep.html" data-page="sleep.html">
            <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
            <span class="sb-item-label" data-i18n="nav.sleep">Sleep</span>
          </a></li>
          <li><a class="sb-item" href="mood.html" data-page="mood.html">
            <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></span>
            <span class="sb-item-label" data-i18n="nav.mood">State of Mind</span>
          </a></li>
          <li><a class="sb-item" href="focus.html" data-page="focus.html">
            <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            <span class="sb-item-label" data-i18n="nav.focus">Focus</span>
          </a></li>
          <li><a class="sb-item" href="plan.html" data-page="plan.html">
            <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
            <span class="sb-item-label" data-i18n="nav.plan">Planner</span>
          </a></li>
        </ul>
      </div>
    </div>
    <div class="sb-foot">
      <a class="sb-item" href="profile.html" data-page="profile.html">
        <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
        <span class="sb-item-label" data-i18n="nav.profile">Profile</span>
      </a>
      <button class="sb-item sb-item--logout" id="sbLogout" type="button">
        <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
        <span class="sb-item-label" data-i18n="nav.logout">Sign out</span>
      </button>
    </div>`;

  var TRIGGER_HTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="7" rx="1"/><rect x="3" y="13" width="7" height="4" rx="1"/></svg>';

  function markActiveNav() {
    var navEl = document.querySelector("nav.sb");
    if (!navEl) return;
    var path = location.pathname.split("/").pop() || "home.html";
    navEl.querySelectorAll(".sb-item[data-page]").forEach(function (el) {
      if (el.dataset.page === path) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    if (window.HBIT && HBIT.nav && typeof HBIT.nav.setActive === "function") {
      HBIT.nav.setActive();
    }
  }

  function inject() {
    // Inject overlay if missing
    if (!document.querySelector('.sb-overlay')) {
      var overlay = document.createElement('div');
      overlay.className = 'sb-overlay';
      var nav = document.querySelector('nav.sb');
      if (nav) nav.parentNode.insertBefore(overlay, nav);
    }

    // Populate nav
    var nav = document.querySelector('nav.sb');
    if (nav) {
      nav.innerHTML = SIDEBAR_HTML;
    }

    // Inject trigger if missing
    if (!document.querySelector('.sb-trigger')) {
      var nav = document.querySelector('nav.sb');
      if (nav) {
        var btn = document.createElement('button');
        btn.className = 'sb-trigger';
        btn.setAttribute('aria-label', 'Open menu');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = TRIGGER_HTML;
        nav.parentNode.insertBefore(btn, nav.nextSibling);
      }
    }

    // Apply i18n if available
    nav = document.querySelector("nav.sb");
    if (window.HBIT && HBIT.i18n && HBIT.i18n.applyLang && nav) {
      HBIT.i18n.applyLang(nav);
    }

    markActiveNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
