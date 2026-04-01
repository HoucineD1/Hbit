(function () {
  "use strict";

  const HBIT = (window.HBIT = window.HBIT || {});
  const KEY = "hbit:plan:items";
  const $ = (id) => document.getElementById(id);

  const state = {
    user: null,
    profile: null,
  };

  function getLang() {
    return HBIT.i18n?.getLang?.() || document.documentElement.lang || "en";
  }

  function tr(key, fallback) {
    return HBIT.i18n?.t ? HBIT.i18n.t(key, fallback, getLang()) : fallback;
  }

  function shortDate(date) {
    try {
      return new Intl.DateTimeFormat(getLang() === "fr" ? "fr-CA" : "en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return "";
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readItems() {
    try {
      const raw = localStorage.getItem(KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  function writeItems(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("hbit:data-changed", { detail: { area: "plan" } }));
  }

  function renderHeader() {
    if ($("planDate")) $("planDate").textContent = shortDate(new Date()).toUpperCase();
    const currentUser = window.firebase?.auth ? firebase.auth().currentUser : null;
    const name = state.profile?.fullName || currentUser?.displayName || "H";
    if ($("planAvatar")) $("planAvatar").textContent = (name.charAt(0) || "H").toUpperCase();
  }

  function renderList() {
    const list = $("planList");
    const empty = $("planEmpty");
    if (!list || !empty) return;

    const items = readItems();
    empty.style.display = items.length ? "none" : "grid";
    list.innerHTML = items.map((item) => `
      <article class="pl-item ${item.done ? "is-done" : ""}" data-id="${item.id}">
        <button class="pl-check" type="button" data-action="toggle" aria-label="${item.done ? tr("plan.status.done", "Done") : tr("plan.status.open", "Open")}">
          <span class="pl-check-dot"></span>
        </button>
        <div class="pl-item-copy">
          <div class="pl-item-text">${escapeHtml(item.text)}</div>
          <div class="pl-item-meta">${item.done ? tr("plan.status.done", "Done") : tr("plan.status.open", "Open")}</div>
        </div>
        <button class="pl-delete" type="button" data-action="delete" aria-label="Delete task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/>
            <path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </article>
    `).join("");
  }

  function addItem(text) {
    const value = text.trim();
    if (!value) return;
    const items = readItems();
    items.unshift({ id: `${Date.now()}`, text: value, done: false, createdAt: Date.now() });
    writeItems(items);
    renderList();
  }

  function toggleItem(id) {
    const items = readItems().map((item) => item.id === id ? { ...item, done: !item.done } : item);
    writeItems(items);
    renderList();
  }

  function deleteItem(id) {
    writeItems(readItems().filter((item) => item.id !== id));
    renderList();
  }

  function bindUi() {
    const form = $("planForm");
    const input = $("planInput");
    const list = $("planList");
    const logout = $("logoutBtn");

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      addItem(input?.value || "");
      if (input) input.value = "";
      input?.focus();
    });

    list?.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      const item = e.target.closest(".pl-item");
      if (!actionEl || !item) return;
      const id = item.getAttribute("data-id");
      const action = actionEl.getAttribute("data-action");
      if (action === "toggle") toggleItem(id);
      if (action === "delete") deleteItem(id);
    });

    logout?.addEventListener("click", async () => {
      logout.disabled = true;
      try {
        await firebase.auth().signOut();
        window.location.replace("index.html");
      } catch {
        logout.disabled = false;
      }
    });
  }

  async function loadProfile(user) {
    try {
      state.profile = await HBIT.getCurrentUserProfile?.();
      if (!state.profile && HBIT.createUserProfile) {
        const provider = user.providerData?.[0]?.providerId || "password";
        await HBIT.createUserProfile(user, provider);
        state.profile = await HBIT.getCurrentUserProfile?.();
      }
    } catch {
      state.profile = null;
    }
  }

  function init() {
    if (document.body.id !== "planPage") return;
    if (document.body.dataset.planInit) return;
    document.body.dataset.planInit = "1";

    renderHeader();
    renderList();
    bindUi();

    window.addEventListener("hbit:lang-changed", () => {
      renderHeader();
      renderList();
    });

    if (!window.firebase || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        state.user = null;
        state.profile = null;
        window.location.replace("login.html");
        return;
      }

      state.user = user;
      await loadProfile(user);
      renderHeader();
      renderList();
    });
  }

  HBIT.pages = HBIT.pages || {};
  HBIT.pages.plan = { init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
