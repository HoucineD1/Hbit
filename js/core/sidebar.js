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
      <a class="sb-item" href="profile.html#appearance" data-page="profile-settings">
        <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.38 1.05V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.05-.38H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6A1.65 1.65 0 0 0 10.4 3V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.39.37.73.68 1 .3.26.67.4 1.05.4H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51.6z"/></svg></span>
        <span class="sb-item-label" data-i18n="nav.settings">Settings</span>
      </a>
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

  var BOTTOM_TABS_HTML = `
    <a class="hbit-bottom-tab" href="home.html" data-page="home.html" data-accent="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span data-i18n="nav.overview">Home</span>
    </a>
    <a class="hbit-bottom-tab" href="news.html" data-page="news.html" data-accent="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/></svg>
      <span data-i18n="nav.news">News</span>
    </a>
    <a class="hbit-bottom-tab" href="notifications.html" data-page="notifications.html" data-accent="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      <span data-i18n="nav.notifications">Inbox</span>
    </a>
    <a class="hbit-bottom-tab" href="profile.html" data-page="profile.html" data-accent="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span data-i18n="nav.profile">Profile</span>
    </a>`;

  function markActiveNav() {
    var navEl = document.querySelector("nav.sb");
    if (!navEl) return;
    var path = location.pathname.split("/").pop() || "home.html";
    navEl.querySelectorAll(".sb-item[data-page]").forEach(function (el) {
      if (el.dataset.page === path) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    document.querySelectorAll(".hbit-bottom-tab[data-page]").forEach(function (el) {
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

    if (!document.querySelector(".hbit-bottom-tabs")) {
      var tabs = document.createElement("nav");
      tabs.className = "hbit-bottom-tabs";
      tabs.setAttribute("aria-label", "Primary navigation");
      tabs.innerHTML = BOTTOM_TABS_HTML;
      document.body.appendChild(tabs);
    }

    if (!document.querySelector(".hbit-mobile-settings")) {
      var s = document.createElement("a");
      s.className = "hbit-mobile-settings";
      s.href = "profile.html#appearance";
      s.setAttribute("aria-label", "Settings");
      s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.38 1.05V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.05-.38H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6A1.65 1.65 0 0 0 10.4 3V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.39.37.73.68 1 .3.26.67.4 1.05.4H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51.6z"/></svg>';
      document.body.appendChild(s);
    }

    // Apply i18n if available
    nav = document.querySelector("nav.sb");
    if (window.HBIT && HBIT.i18n && HBIT.i18n.applyLang) {
      if (nav) HBIT.i18n.applyLang(nav);
      var bottomTabs = document.querySelector(".hbit-bottom-tabs");
      if (bottomTabs) HBIT.i18n.applyLang(bottomTabs);
    }

    markActiveNav();
  }

  /* ── Swipe gesture — ouvrir depuis le bord gauche ── */
  function initSwipeGesture() {
    var EDGE_ZONE   = 24;   // px depuis le bord gauche pour démarrer le swipe
    var MIN_DIST    = 60;   // distance min pour déclencher l'ouverture
    var MAX_VERT    = 80;   // déviation verticale max (évite scroll vertical)
    var VELOCITY    = 0.3;  // px/ms minimum pour déclencher

    var startX, startY, startTime, dragging = false;
    var nav = null;
    var overlay = null;

    function getSb() {
      nav     = document.querySelector('nav.sb');
      overlay = document.querySelector('.sb-overlay');
    }

    function isOpen() { return document.body.classList.contains('nav-open'); }

    function setDragging(val) {
      document.body.classList.toggle('sb-dragging', val);
      dragging = val;
    }

    function applyTranslate(x) {
      if (!nav) return;
      var w   = nav.offsetWidth;
      var clamped = Math.max(-w, Math.min(0, x - w));
      nav.style.transform = 'translateX(' + clamped + 'px)';
      var pct = (clamped + w) / w;
      if (overlay) {
        overlay.style.visibility = 'visible';
        overlay.style.opacity    = String(Math.min(pct * 0.6, 0.6));
        overlay.style.pointerEvents = 'auto';
      }
    }

    function clearTranslate() {
      if (!nav) return;
      nav.style.transform = '';
      if (overlay) {
        overlay.style.visibility = '';
        overlay.style.opacity    = '';
        overlay.style.pointerEvents = '';
      }
    }

    document.addEventListener('touchstart', function(e) {
      if (window.matchMedia && window.matchMedia("(max-width: 767px)").matches) return;
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      // Pour ouvrir : commencer dans la zone bord gauche quand fermé
      // Pour fermer : commencer n'importe où quand ouvert
      if (!isOpen() && t.clientX > EDGE_ZONE) return;
      getSb();
      startX    = t.clientX;
      startY    = t.clientY;
      startTime = Date.now();
      setDragging(true);
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!dragging) return;
      var t    = e.touches[0];
      var dx   = t.clientX - startX;
      var dy   = Math.abs(t.clientY - startY);

      // Si trop de déviation verticale → annuler
      if (dy > MAX_VERT) { setDragging(false); clearTranslate(); return; }

      // Empêcher le scroll si on gère le swipe
      if (Math.abs(dx) > 8) e.preventDefault();

      if (!isOpen()) {
        // Ouverture : on suit le doigt de gauche à droite
        if (dx < 0) return;
        var w = nav ? nav.offsetWidth : 280;
        applyTranslate(dx - w + startX);
      } else {
        // Fermeture : on suit le doigt de droite à gauche
        if (dx > 0) return;
        applyTranslate(dx);
      }
    }, { passive: false });

    document.addEventListener('touchend', function(e) {
      if (!dragging) return;
      setDragging(false);

      var t  = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dt = Date.now() - startTime;
      var velocity = Math.abs(dx) / dt;

      clearTranslate();

      if (!isOpen()) {
        // Ouvrir si distance ou vélocité suffisante vers la droite
        if (dx > MIN_DIST || velocity > VELOCITY) {
          document.body.classList.add('nav-open');
        }
      } else {
        // Fermer si swipe vers la gauche
        if (dx < -MIN_DIST || velocity > VELOCITY) {
          document.body.classList.remove('nav-open');
          document.body.classList.remove('nav-locked');
        }
      }
    }, { passive: true });
  }

  function initSwipeBackGesture() {
    var EDGE_ZONE = 24;
    var MIN_DIST = 72;
    var MAX_VERT = 70;
    var startX = 0;
    var startY = 0;
    var tracking = false;

    document.addEventListener("touchstart", function (e) {
      if (!window.matchMedia || !window.matchMedia("(max-width: 767px)").matches) return;
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      if (t.clientX > EDGE_ZONE) return;
      if (document.body.classList.contains("nav-open")) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    }, { passive: true });

    document.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = Math.abs(t.clientY - startY);
      if (dx > MIN_DIST && dy < MAX_VERT && history.length > 1) {
        history.back();
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      inject();
      initSwipeGesture();
      initSwipeBackGesture();
    });
  } else {
    inject();
    initSwipeGesture();
    initSwipeBackGesture();
  }
})();
