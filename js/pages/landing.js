/* ============================================================
   Hbit — js/pages/landing.js
   Background carousel · feature chip nav · touch/keyboard
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ── Boot i18n ──────────────────────────────────────── */
  window.HBIT?.i18n?.init?.();

  /* ── DOM refs ────────────────────────────────────────── */
  const bgSlides = Array.from(document.querySelectorAll(".ld-bg-slide"));
  const chipNavs = Array.from(document.querySelectorAll(".ld-chip-nav[data-idx]"));
  const dots     = Array.from(document.querySelectorAll(".ld-visual-dot"));
  const N        = bgSlides.length;

  if (N === 0) return;

  /* ── State ───────────────────────────────────────────── */
  let current     = 0;
  let autoTimer   = null;
  let touchStartX = 0;
  let touchStartY = 0;

  /* ── Core: go to slide ───────────────────────────────── */
  function goTo(idx) {
    const next = ((idx % N) + N) % N;
    if (next === current) return;

    /* Deactivate current */
    bgSlides[current].classList.remove("ld-bg-slide--active");
    chipNavs[current]?.classList.remove("ld-chip-nav--active");
    chipNavs[current]?.setAttribute("aria-selected", "false");

    current = next;

    /* Activate next */
    bgSlides[current].classList.add("ld-bg-slide--active");
    chipNavs[current]?.classList.add("ld-chip-nav--active");
    chipNavs[current]?.setAttribute("aria-selected", "true");
    dots.forEach((d, i) => d.classList.toggle("ld-visual-dot--active", i === current));
  }

  /* ── Auto-advance ────────────────────────────────────── */
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => goTo(current + 1), 5200);
  }
  function stopAuto() {
    clearInterval(autoTimer);
    autoTimer = null;
  }

  /* ── Feature chip clicks ─────────────────────────────── */
  chipNavs.forEach(chip => {
    chip.addEventListener("click", () => {
      goTo(+chip.dataset.idx);
      stopAuto();
      startAuto();
    });
  });

  /* ── Touch swipe ─────────────────────────────────────── */
  document.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", e => {
    const dx = touchStartX - e.changedTouches[0].clientX;
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
      goTo(dx > 0 ? current + 1 : current - 1);
      stopAuto();
      startAuto();
    }
  }, { passive: true });

  /* ── Keyboard ────────────────────────────────────────── */
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { goTo(current + 1); stopAuto(); startAuto(); }
    if (e.key === "ArrowLeft")  { goTo(current - 1); stopAuto(); startAuto(); }
  });

  /* ── Pause when tab hidden ───────────────────────────── */
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stopAuto() : startAuto();
  });

  /* ── Init ────────────────────────────────────────────── */
  startAuto();

  /* ── Nav scrolled state ──────────────────────────────── */
  (function initNavScrolled() {
    const nav  = document.querySelector('.ld-nav');
    const hero = document.querySelector('.ld-hero');
    if (!nav || !hero) return;

    const obs = new IntersectionObserver(([entry]) => {
      nav.classList.toggle('ld-nav--scrolled', !entry.isIntersecting);
    }, { threshold: 0.1 });

    obs.observe(hero);
  })();

  /* ── Line reveal ─────────────────────────────────────── */
  (function initLineReveal() {
    const lines = document.querySelectorAll('.ld-reveal-line');
    if (!lines.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const line  = entry.target;
        const delay = parseFloat(line.dataset.delay || 0) * 160;
        setTimeout(() => line.classList.add('ld-reveal-visible'), delay);
        obs.unobserve(line);
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -40px 0px' });

    lines.forEach(l => obs.observe(l));
  })();

  /* ── Generic scroll reveal (.ld-scroll-reveal) ─────── */
  (function initScrollReveal() {
    const els = document.querySelectorAll('.ld-scroll-reveal');
    if (!els.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('ld-reveal-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    els.forEach(el => obs.observe(el));
  })();

  /* ── Stat counters ───────────────────────────────────── */
  (function initCountUp() {
    const counters = document.querySelectorAll('.ld-count-up');
    if (!counters.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateStat(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach(el => obs.observe(el));

    function animateStat(el) {
      const target   = parseFloat(el.dataset.target);
      const suffix   = el.dataset.suffix   || '';
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const duration = 1600;
      const start    = performance.now();

      function tick(now) {
        const t       = Math.min((now - start) / duration, 1);
        const eased   = 1 - Math.pow(1 - t, 3); /* ease-out cubic */
        const current = (target * eased).toFixed(decimals);
        el.textContent = current + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  })();

});
