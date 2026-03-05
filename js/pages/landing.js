/* ============================================================
   Hbit — js/pages/landing.js
   Landing page carousel · touch/swipe · keyboard · auto-advance
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ── Boot i18n (applies saved language + binds lang button) ── */
  window.HBIT?.i18n?.init?.();

  /* ── DOM refs ──────────────────────────────────────────── */
  const slidesWrap = document.getElementById("ldSlides");
  const dotsWrap   = document.getElementById("ldDots");
  const prevBtn    = document.getElementById("ldPrev");
  const nextBtn    = document.getElementById("ldNext");
  const card       = document.querySelector(".ld-carousel-card");

  if (!slidesWrap) return;

  const slides = Array.from(slidesWrap.querySelectorAll(".ld-slide"));
  const dots   = dotsWrap ? Array.from(dotsWrap.querySelectorAll("[data-idx]")) : [];
  const N      = slides.length;

  if (N === 0) return;

  /* ── State ─────────────────────────────────────────────── */
  let current     = 0;
  let autoTimer   = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let isDragging  = false;
  let dragStartX  = 0;

  /* ── Go to slide ────────────────────────────────────────── */
  function goTo(idx) {
    const next = ((idx % N) + N) % N;
    if (next === current) return;

    slides[current].classList.remove("ld-slide--active");
    dots[current]?.classList.remove("ld-dot--on");
    dots[current]?.setAttribute("aria-selected", "false");

    current = next;

    slides[current].classList.add("ld-slide--active");
    dots[current]?.classList.add("ld-dot--on");
    dots[current]?.setAttribute("aria-selected", "true");
  }

  /* ── Auto-advance ───────────────────────────────────────── */
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => goTo(current + 1), 5000);
  }
  function stopAuto() {
    clearInterval(autoTimer);
    autoTimer = null;
  }

  /* ── Dot clicks ─────────────────────────────────────────── */
  dots.forEach(dot => {
    dot.addEventListener("click", () => {
      goTo(+dot.dataset.idx);
      stopAuto();
      startAuto();
    });
  });

  /* ── Arrow buttons ──────────────────────────────────────── */
  prevBtn?.addEventListener("click", () => { goTo(current - 1); stopAuto(); startAuto(); });
  nextBtn?.addEventListener("click", () => { goTo(current + 1); stopAuto(); startAuto(); });

  /* ── Touch swipe ────────────────────────────────────────── */
  slidesWrap.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    stopAuto();
  }, { passive: true });

  slidesWrap.addEventListener("touchend", e => {
    const dx = touchStartX - e.changedTouches[0].clientX;
    const dy = touchStartY - e.changedTouches[0].clientY;
    /* Only horizontal swipe  */
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      goTo(dx > 0 ? current + 1 : current - 1);
    }
    startAuto();
  }, { passive: true });

  /* ── Mouse drag ─────────────────────────────────────────── */
  slidesWrap.addEventListener("mousedown", e => {
    dragStartX = e.clientX;
    isDragging = true;
    stopAuto();
    e.preventDefault();
  });

  document.addEventListener("mouseup", e => {
    if (!isDragging) return;
    isDragging = false;
    const dx = dragStartX - e.clientX;
    if (Math.abs(dx) > 40) goTo(dx > 0 ? current + 1 : current - 1);
    startAuto();
  });

  /* ── Keyboard ───────────────────────────────────────────── */
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { goTo(current + 1); stopAuto(); startAuto(); }
    if (e.key === "ArrowLeft")  { goTo(current - 1); stopAuto(); startAuto(); }
  });

  /* ── Pause on hover ─────────────────────────────────────── */
  card?.addEventListener("mouseenter", stopAuto);
  card?.addEventListener("mouseleave", startAuto);

  /* ── Pause when tab is hidden ───────────────────────────── */
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stopAuto() : startAuto();
  });

  /* ── Init ───────────────────────────────────────────────── */
  startAuto();
});
