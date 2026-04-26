/* Hbit — Notifications inbox: renders Weekly Insights cards. */
(function () {
  "use strict";
  function tr(key, fallback) {
    if (window.HBIT && HBIT.i18n && HBIT.i18n.t) return HBIT.i18n.t(key, fallback);
    return fallback;
  }

  function renderCards(cards) {
    const host = document.getElementById("homeInsightsList");
    const empty = document.getElementById("notifEmpty");
    if (!host) return;
    if (!cards.length) {
      host.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    host.innerHTML = cards.map((card) => {
      const conf = Math.round((Number(card.confidence) || 0) * 100);
      return `
        <article class="hc-insight-card">
          <header><h3>${esc(card.title || "")}</h3><span class="hc-insight-confidence">${conf}%</span></header>
          <p>${esc(card.body || "")}</p>
          ${card.math ? `<details><summary>${esc(tr("insights.why", "Why?"))}</summary><div>${esc(card.math)}</div></details>` : ""}
          ${card.href ? `<a href="${esc(card.href)}">${esc(tr("insights.takeMeThere", "Take me there"))}</a>` : ""}
        </article>`;
    }).join("");
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
  }

  async function init(uid) {
    let cards = [];
    try {
      cards = await (HBIT.insights?.loadLatest?.(uid) || Promise.resolve([]));
    } catch (_) { cards = []; }
    if (!cards.length) {
      const data = await (HBIT.dashboardData?.fetch?.(uid) || Promise.resolve({}));
      cards = HBIT.insights?.generateFromDashboard?.(data || {}, tr) || [];
    }
    renderCards(cards);
  }

  function start() {
    if (!window.firebase || !firebase.auth) { renderCards([]); return; }
    firebase.auth().onAuthStateChanged((user) => {
      if (!user) { window.location.replace("login.html"); return; }
      init(user.uid);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
