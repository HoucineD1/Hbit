/* =========================
   Hbit — js/pages/welcome.js
   Welcome page: crossfade carousel + navigation
   ========================= */

document.addEventListener("DOMContentLoaded", () => {

  /* ── Boot i18n ────────────────────────────────────── */
  window.HBIT?.i18n?.init?.();

  /* ── Slide definitions ───────────────────────────── */
  const SLIDES = [
    {
      getTitleHTML:(t) =>
        `${t("welcome.greeting", "Welcome to ")}<span class="wlc-headline-accent">${t("brand.title", "Hbit")}</span>`,
      getDesc:     (t) => t("slide.overview.desc",
        "Your all-in-one personal dashboard — habits, budget, sleep and more."),
    },
    {
      getTitleHTML:(t) => t("slide.habits.title", "Build Better Habits"),
      getDesc:     (t) => t("slide.habits.desc",
        "Track daily habits, build streaks and reach your goals one day at a time."),
    },
    {
      getTitleHTML:(t) => t("slide.budget.title", "Manage your Budget"),
      getDesc:     (t) => t("slide.budget.desc",
        "Log income and expenses. See exactly what's left at the end of the month."),
    },
    {
      getTitleHTML:(t) => t("slide.sleep.title", "Plan your Sleep"),
      getDesc:     (t) => t("slide.sleep.desc",
        "Calculate optimal bedtimes based on 90-minute sleep cycles and wake up refreshed."),
    },
    {
      getTitleHTML:(t) => t("slide.mind.title", "State of Mind"),
      getDesc:     (t) => t("slide.mind.desc",
        "Check in daily with your mood, stress and energy. Spot patterns over time."),
    },
    {
      getTitleHTML:(t) => t("slide.plan.title", "Plan your Day"),
      getDesc:     (t) => t("slide.plan.desc",
        "Organise tasks, set priorities and stay focused with built-in Pomodoro sessions."),
    },
  ];

  /* ── DOM refs ─────────────────────────────────────── */
  const slideEls   = document.querySelectorAll(".wlc-slide");
  const dotsEl     = document.getElementById("wlcDots");
  const titleEl    = document.getElementById("wlcTitle");
  const descEl     = document.getElementById("wlcDesc");
  const carouselEl = document.getElementById("wlcCarousel");

  let current    = 0;
  let autoTimer  = null;
  let dragStartX = 0;
  let isDragging = false;

  const t = (key, fb) => window.HBIT?.i18n?.t?.(key) ?? fb ?? key;

  /* ── Update text ──────────────────────────────────── */
  function renderText(animate) {
    const slide = SLIDES[current];
    if (!titleEl || !descEl) return;

    if (animate) {
      titleEl.classList.add("wlc-text--out");
      descEl.classList.add("wlc-text--out");
      setTimeout(() => {
        titleEl.innerHTML  = slide.getTitleHTML(t);
        descEl.textContent = slide.getDesc(t);
        titleEl.classList.remove("wlc-text--out");
        descEl.classList.remove("wlc-text--out");
      }, 210);
    } else {
      titleEl.innerHTML  = slide.getTitleHTML(t);
      descEl.textContent = slide.getDesc(t);
    }
  }

  /* ── Navigate to slide (crossfade via CSS classes) ── */
  function goTo(idx, animate = true) {
    const n = SLIDES.length;
    current = ((idx % n) + n) % n;

    /* Toggle active class — CSS handles the fade+scale transition */
    slideEls.forEach((el, i) => {
      el.classList.toggle("wlc-slide--active", i === current);
    });

    /* Update dots */
    dotsEl?.querySelectorAll("[data-slide]").forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle("wlc-dot--on", active);
      dot.setAttribute("aria-selected", String(active));
    });

    renderText(animate);
  }

  /* ── Auto-advance ─────────────────────────────────── */
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => goTo(current + 1), 4500);
  }
  function stopAuto() { clearInterval(autoTimer); }

  /* ── Dot navigation ───────────────────────────────── */
  dotsEl?.querySelectorAll("[data-slide]").forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(+dot.dataset.slide);
      stopAuto();
      startAuto();
    });
  });

  /* ── Touch swipe ──────────────────────────────────── */
  carouselEl?.addEventListener("touchstart", (e) => {
    dragStartX = e.touches[0].clientX;
    stopAuto();
  }, { passive: true });

  carouselEl?.addEventListener("touchend", (e) => {
    const diff = dragStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
    startAuto();
  }, { passive: true });

  /* ── Mouse drag (desktop) ─────────────────────────── */
  carouselEl?.addEventListener("mousedown", (e) => {
    dragStartX = e.clientX;
    isDragging = true;
    stopAuto();
    e.preventDefault();
  });

  document.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = dragStartX - e.clientX;
    if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
    startAuto();
  });

  /* ── Keyboard arrows ──────────────────────────────── */
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { goTo(current + 1); stopAuto(); startAuto(); }
    if (e.key === "ArrowLeft")  { goTo(current - 1); stopAuto(); startAuto(); }
  });

  /* ── Re-render text when language changes ─────────── */
  window.addEventListener("hbit:lang-changed", () => renderText(false));

  /* ── Init ─────────────────────────────────────────── */
  /* First slide is already marked active in HTML, just sync text */
  renderText(false);
  startAuto();
});
