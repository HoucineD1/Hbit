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
});
