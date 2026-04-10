/* Hbit — lightweight canvas confetti (60 particles, ~1.5s) */
(function () {
  "use strict";
  const HBIT = (window.HBIT = window.HBIT || {});

  function readCssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch {
      return fallback;
    }
  }

  function palette() {
    return [
      "#E63946",
      "#34D399",
      "#F59E0B",
      readCssVar("--sleep", "#818CF8"),
      readCssVar("--mind", "#A78BFA"),
      readCssVar("--focus", "#F97316"),
      readCssVar("--habit", "#00e676"),
    ];
  }

  /**
   * @param {{ duration?: number, count?: number }} [opts]
   */
  function burst(opts) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const duration = (opts && opts.duration) || 1500;
    const count = Math.min(120, Math.max(20, (opts && opts.count) || 60));
    const colors = palette();

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10050;";
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }

    const particles = [];
    const cx = w * 0.5;
    const cy = h * 0.35;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.8;
      const sp = 4 + Math.random() * 10;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * sp + (Math.random() - 0.5) * 3,
        vy: Math.sin(ang) * sp - Math.random() * 4,
        g: 0.12 + Math.random() * 0.1,
        r: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        c: colors[(Math.random() * colors.length) | 0],
        a: 0.85 + Math.random() * 0.15,
      });
    }

    const t0 = performance.now();
    function frame(now) {
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / duration);
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.a *= 0.992;

        ctx.save();
        ctx.globalAlpha = p.a * (1 - t * 0.35);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
        ctx.restore();
      }

      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);
  }

  HBIT.confetti = { burst };
})();
