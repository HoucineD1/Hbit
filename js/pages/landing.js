/* ============================================================
   Hbit - js/pages/landing.js
   Landing interactions - manual carousel, theme, reveal, stats
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  window.HBIT?.i18n?.init?.();

  const bgSlides = Array.from(document.querySelectorAll(".ld-bg-slide"));
  const chipNavs = Array.from(document.querySelectorAll(".ld-chip-nav[data-idx]"));
  const dots = Array.from(document.querySelectorAll(".ld-visual-dot"));
  const visualWrap = document.querySelector(".ld-visual-wrap");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const total = bgSlides.length;

  if (!total) return;

  let current = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  function centerSlide(idx, behavior = "smooth") {
    if (!visualWrap || !bgSlides[idx]) return;
    const slide = bgSlides[idx];
    const targetLeft = slide.offsetLeft - ((visualWrap.clientWidth - slide.clientWidth) / 2);
    visualWrap.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: prefersReducedMotion.matches ? "auto" : behavior,
    });
  }

  function setActive(idx) {
    const next = ((idx % total) + total) % total;
    if (next === current) return false;

    bgSlides[current]?.classList.remove("ld-bg-slide--active");
    chipNavs[current]?.classList.remove("ld-chip-nav--active");
    chipNavs[current]?.setAttribute("aria-selected", "false");

    current = next;

    bgSlides[current]?.classList.add("ld-bg-slide--active");
    chipNavs[current]?.classList.add("ld-chip-nav--active");
    chipNavs[current]?.setAttribute("aria-selected", "true");
    dots.forEach((dot, index) => dot.classList.toggle("ld-visual-dot--active", index === current));
    return true;
  }

  function goTo(idx, options = {}) {
    const { center = true, behavior = "smooth" } = options;
    if (!setActive(idx)) return;
    if (center) centerSlide(current, behavior);
  }

  (function initCarousel() {
    centerSlide(0, "auto");

    chipNavs.forEach((chip) => {
      chip.addEventListener("click", () => {
        goTo(Number(chip.dataset.idx), { center: true });
      });
    });

    visualWrap?.addEventListener("scroll", () => {
      clearTimeout(initCarousel.scrollTimer);
      initCarousel.scrollTimer = setTimeout(() => {
        const wrapCenter = visualWrap.getBoundingClientRect().left + (visualWrap.offsetWidth / 2);
        let bestIdx = current;
        let bestDist = Number.POSITIVE_INFINITY;

        bgSlides.forEach((slide, index) => {
          const rect = slide.getBoundingClientRect();
          const slideCenter = rect.left + (rect.width / 2);
          const dist = Math.abs(slideCenter - wrapCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = index;
          }
        });

        setActive(bestIdx);
      }, 90);
    }, { passive: true });

    visualWrap?.addEventListener("touchstart", (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    visualWrap?.addEventListener("touchend", (event) => {
      const dx = touchStartX - event.changedTouches[0].clientX;
      const dy = touchStartY - event.changedTouches[0].clientY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 56) {
        goTo(dx > 0 ? current + 1 : current - 1, { center: true });
      }
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") goTo(current + 1, { center: true });
      if (event.key === "ArrowLeft") goTo(current - 1, { center: true });
    });

    const prevBtn = document.getElementById("carouselPrev");
    const nextBtn = document.getElementById("carouselNext");
    prevBtn?.addEventListener("click", () => goTo(current - 1, { center: true }));
    nextBtn?.addEventListener("click", () => goTo(current + 1, { center: true }));
  })();

  (function initCriticalNav() {
    document.querySelectorAll(".ld-nav-ghost, .ld-nav-solid, .ld-cta-primary, .ld-cta-secondary").forEach((link) => {
      link.addEventListener("click", () => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        window.setTimeout(() => {
          if (document.visibilityState === "visible" && window.location.pathname.endsWith("/index.html")) {
            window.location.assign(href);
          }
        }, 320);
      });
    });
  })();

  (function initThemeToggle() {
    const btn = document.getElementById("themeToggle");
    const page = document.getElementById("landingPage");
    if (!btn || !page) return;

    const key = "hbit-theme";
    const saved = localStorage.getItem(key);

    if (saved === "light") page.classList.add("ld-light");
    if (saved === "dark") page.classList.remove("ld-light");

    btn.addEventListener("click", () => {
      page.classList.toggle("ld-light");
      localStorage.setItem(key, page.classList.contains("ld-light") ? "light" : "dark");
    });
  })();

  (function initNavScrolled() {
    const nav = document.querySelector(".ld-nav");
    const hero = document.querySelector(".ld-hero");
    if (!nav || !hero) return;

    const observer = new IntersectionObserver(([entry]) => {
      nav.classList.toggle("ld-nav--scrolled", !entry.isIntersecting);
    }, { threshold: 0.1 });

    observer.observe(hero);
  })();

  (function initLineReveal() {
    const lines = document.querySelectorAll(".ld-reveal-line");
    if (!lines.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.delay || 0) * 100;
        window.setTimeout(() => entry.target.classList.add("ld-reveal-visible"), delay);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -32px 0px" });

    lines.forEach((line) => observer.observe(line));
  })();

  (function initScrollReveal() {
    const elements = document.querySelectorAll(".ld-scroll-reveal");
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("ld-reveal-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });

    elements.forEach((element) => observer.observe(element));
  })();

  (function initCountUp() {
    const counters = document.querySelectorAll(".ld-count-up");
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateStat(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.55 });

    counters.forEach((counter) => observer.observe(counter));

    function animateStat(element) {
      const target = Number.parseFloat(element.dataset.target || "0");
      const suffix = element.dataset.suffix || "";
      const decimals = Number.parseInt(element.dataset.decimals || "0", 10);
      const duration = prefersReducedMotion.matches ? 0 : 1200;

      if (!duration) {
        element.textContent = target.toFixed(decimals) + suffix;
        return;
      }

      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }
  })();
});
