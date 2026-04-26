/* =========================
   Hbit - js/pages/onboarding.js
   Six-step activation wizard
   Seeds the first useful dashboard state after signup.
   ========================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  window.HBIT?.theme?.apply?.();
  window.HBIT?.i18n?.init?.();

  const STEPS_TOTAL = 6;
  const FORCE_PARAM = new URLSearchParams(window.location.search).has("force");
  const t = (key, fb) => window.HBIT?.i18n?.t?.(key, fb) ?? fb ?? key;

  const GOALS = [
    { id: "sleep", label: "Better sleep", sub: "Wind-down, targets, recovery", tone: "sleep" },
    { id: "budget", label: "Save money", sub: "Budget limits and spending rhythm", tone: "budget" },
    { id: "habits", label: "Build habits", sub: "Small daily wins that compound", tone: "habit" },
    { id: "quit", label: "Quit something", sub: "Replace a pattern with a better one", tone: "mood" },
    { id: "focus", label: "Focus better", sub: "Plan deep work and breathe breaks", tone: "focus" },
    { id: "clarity", label: "More clarity", sub: "Mood, plan, and weekly insights", tone: "plan" },
  ];

  const HABITS = {
    sleep: [
      habit("No phone in bed", "sleep", "evening", "Put the phone away 30 minutes before bed."),
      habit("Wind-down reset", "sleep", "evening", "A short routine that tells your body the day is closing."),
      habit("Morning light", "sleep", "morning", "Step outside or sit near daylight after waking."),
    ],
    budget: [
      habit("Log spending", "budget", "evening", "A 2-minute check-in keeps money visible."),
      habit("No impulse buys", "budget", "flexible", "Pause before small purchases that add up."),
      habit("Pack one meal", "budget", "morning", "Protect the budget before the day gets busy."),
    ],
    habits: [
      habit("Drink water", "health", "morning", "Start the day with one glass of water."),
      habit("10-minute walk", "health", "flexible", "A reliable baseline for body and mood."),
      habit("Plan tomorrow", "planning", "evening", "Close the day with the next one prepared."),
    ],
    quit: [
      habit("Craving pause", "mindset", "flexible", "Wait 10 minutes before acting on an urge."),
      habit("Replace the cue", "mindset", "flexible", "Swap the old pattern for a tiny better one."),
      habit("Evening reflection", "mindset", "evening", "Name what triggered you and what worked."),
    ],
    focus: [
      habit("First focus block", "focus", "morning", "Protect one uninterrupted work block."),
      habit("2-minute breathing", "focus", "flexible", "Reset your nervous system between sessions."),
      habit("Clear tomorrow's top 3", "planning", "evening", "Decide what deserves attention."),
    ],
    clarity: [
      habit("Mood check-in", "mood", "evening", "One honest tap before the day disappears."),
      habit("Brain dump", "planning", "evening", "Move loose thoughts into tomorrow's plan."),
      habit("Weekly review", "planning", "flexible", "Look for the pattern behind the week."),
    ],
  };

  const state = {
    step: 0,
    goals: [],
    starterHabits: [],
    sleepTarget: 8,
    currency: "CAD",
    monthlyBudget: 1200,
    focusBlock: true,
    focusTime: "09:00",
    moodBaseline: 3,
    saving: false,
  };

  const main = document.getElementById("main-content");
  const progress = document.querySelector(".wl-progress");
  const userReady = waitForUser();

  userReady.then(user => {
    if (!user) return;
    render();
  });

  async function waitForUser() {
    return new Promise(resolve => {
      firebase.auth().onAuthStateChanged(async user => {
        if (!user) {
          window.location.href = "login.html";
          resolve(null);
          return;
        }

        try {
          const doc = await firebase.firestore().collection("users").doc(user.uid).get();
          if (doc.exists && doc.data()?.onboardingCompleted && !FORCE_PARAM) {
            window.location.href = "home.html";
            resolve(null);
            return;
          }
        } catch (err) {
          console.warn("[Hbit] Onboarding profile check failed:", err);
        }

        resolve(user);
      });
    });
  }

  function habit(name, category, when, description) {
    return { id: slug(name), name, category, when, description };
  }

  function render() {
    renderProgress();
    if (!main) return;

    main.innerHTML = `
      <section class="wl-step wl-step--active" aria-labelledby="wlStepTitle">
        <div class="wl-card wl-card--setup">
          ${renderStep()}
          <div class="wl-actions">
            ${state.step > 0 ? `<button class="wl-back" type="button" data-action="back">Back</button>` : ""}
            <button class="wl-cta wl-cta--ready" type="button" data-action="${state.step === STEPS_TOTAL - 1 ? "finish" : "next"}" ${canAdvance() ? "" : "disabled"}>
              ${state.step === STEPS_TOTAL - 1 ? (state.saving ? "Building your dashboard..." : "Build my dashboard") : "Continue"}
            </button>
          </div>
        </div>
      </section>
    `;

    bindStep();
  }

  function renderProgress() {
    if (!progress) return;
    progress.setAttribute("aria-valuemin", "1");
    progress.setAttribute("aria-valuemax", String(STEPS_TOTAL));
    progress.setAttribute("aria-valuenow", String(state.step + 1));
    progress.setAttribute("aria-label", `Step ${state.step + 1} of ${STEPS_TOTAL}`);
    progress.innerHTML = Array.from({ length: STEPS_TOTAL }, (_, index) => `
      <span class="wl-dot ${index === state.step ? "wl-dot--active" : ""} ${index < state.step ? "wl-dot--complete" : ""}" data-step="${index + 1}"></span>
    `).join("");
  }

  function renderStep() {
    switch (state.step) {
      case 0: return stepGoals();
      case 1: return stepHabits();
      case 2: return stepSleep();
      case 3: return stepBudget();
      case 4: return stepFocus();
      default: return stepMood();
    }
  }

  function stepHead(kicker, title, sub) {
    return `
      <div class="wl-card-eyebrow">${kicker}</div>
      <h1 class="wl-card-title" id="wlStepTitle">${title}</h1>
      <p class="wl-card-sub">${sub}</p>
    `;
  }

  function stepGoals() {
    return `
      ${stepHead("Step 1 of 6", "What do you want Hbit to help with first?", "Pick every goal that matters. This decides what your dashboard is ready to track on day one.")}
      <div class="wl-chip-grid" role="group" aria-label="Goals">
        ${GOALS.map(goal => `
          <button class="wl-setup-chip ${state.goals.includes(goal.id) ? "is-selected" : ""}" type="button" data-goal="${goal.id}" data-tone="${goal.tone}">
            <span class="wl-chip-label">${goal.label}</span>
            <span class="wl-chip-sub">${goal.sub}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function stepHabits() {
    const presets = habitChoices();
    return `
      ${stepHead("Step 2 of 6", "Choose three starter habits", "Small enough to start today, specific enough to create real data for insights.")}
      <div class="wl-habit-count">${state.starterHabits.length}/3 selected</div>
      <div class="wl-chip-grid wl-chip-grid--habits" role="group" aria-label="Starter habits">
        ${presets.map(item => `
          <button class="wl-setup-chip ${state.starterHabits.includes(item.id) ? "is-selected" : ""}" type="button" data-habit="${item.id}">
            <span class="wl-chip-label">${item.name}</span>
            <span class="wl-chip-sub">${item.description}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function stepSleep() {
    return `
      ${stepHead("Step 3 of 6", "Set your sleep target", "This becomes the target line in Sleep and feeds your weekly insight cards.")}
      <div class="wl-number-picker">
        <button class="wl-stepper" type="button" data-sleep-delta="-0.5" aria-label="Decrease sleep target">-</button>
        <div class="wl-number-readout">
          <strong>${formatHours(state.sleepTarget)}</strong>
          <span>hours per night</span>
        </div>
        <button class="wl-stepper" type="button" data-sleep-delta="0.5" aria-label="Increase sleep target">+</button>
      </div>
    `;
  }

  function stepBudget() {
    return `
      ${stepHead("Step 4 of 6", "Set a monthly spending target", "A simple cap is enough to make Budget useful before the first manual transaction.")}
      <div class="wl-budget-row">
        <label class="wl-field">
          <span class="wl-label">Currency</span>
          <select class="wl-select" id="wlCurrency">
            ${["CAD", "USD", "EUR", "GBP"].map(code => `<option value="${code}" ${state.currency === code ? "selected" : ""}>${code}</option>`).join("")}
          </select>
        </label>
        <label class="wl-field">
          <span class="wl-label">Monthly target</span>
          <input class="wl-input" id="wlBudgetAmount" inputmode="numeric" type="number" min="0" step="50" value="${state.monthlyBudget}">
        </label>
      </div>
      <div class="wl-budget-presets">
        ${[800, 1200, 1800, 2500].map(amount => `<button class="wl-mini-chip ${state.monthlyBudget === amount ? "is-selected" : ""}" type="button" data-budget="${amount}">${money(amount)}</button>`).join("")}
      </div>
    `;
  }

  function stepFocus() {
    return `
      ${stepHead("Step 5 of 6", "Protect one focus block today?", "This creates the first task in Plan so the dashboard starts with an action, not an empty state.")}
      <div class="wl-toggle-row">
        <button class="wl-setup-chip ${state.focusBlock ? "is-selected" : ""}" type="button" data-focus-choice="yes">
          <span class="wl-chip-label">Yes, schedule it</span>
          <span class="wl-chip-sub">25 minutes in today's planner</span>
        </button>
        <button class="wl-setup-chip ${!state.focusBlock ? "is-selected" : ""}" type="button" data-focus-choice="no">
          <span class="wl-chip-label">Not today</span>
          <span class="wl-chip-sub">Keep Plan clean for now</span>
        </button>
      </div>
      ${state.focusBlock ? `
        <label class="wl-field">
          <span class="wl-label">Start time</span>
          <input class="wl-input" id="wlFocusTime" type="time" value="${state.focusTime}">
        </label>
      ` : ""}
    `;
  }

  function stepMood() {
    const moods = [
      { value: 1, label: "Low" },
      { value: 2, label: "Heavy" },
      { value: 3, label: "Okay" },
      { value: 4, label: "Good" },
      { value: 5, label: "Great" },
    ];
    return `
      ${stepHead("Step 6 of 6", "How do you feel today?", "One baseline mood log makes Home and Weekly Insights feel alive immediately.")}
      <div class="wl-mood-scale" role="radiogroup" aria-label="Mood baseline">
        ${moods.map(item => `
          <button class="wl-mood-tap ${state.moodBaseline === item.value ? "is-selected" : ""}" type="button" data-mood="${item.value}" aria-checked="${state.moodBaseline === item.value}">
            <strong>${item.value}</strong>
            <span>${item.label}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function bindStep() {
    document.querySelectorAll("[data-goal]").forEach(button => {
      button.addEventListener("click", () => toggleArray(state.goals, button.dataset.goal));
    });

    document.querySelectorAll("[data-habit]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.habit;
        if (state.starterHabits.includes(id)) {
          state.starterHabits = state.starterHabits.filter(item => item !== id);
        } else if (state.starterHabits.length < 3) {
          state.starterHabits.push(id);
        }
        render();
      });
    });

    document.querySelectorAll("[data-sleep-delta]").forEach(button => {
      button.addEventListener("click", () => {
        state.sleepTarget = clamp(state.sleepTarget + Number(button.dataset.sleepDelta), 5, 10);
        render();
      });
    });

    document.querySelectorAll("[data-budget]").forEach(button => {
      button.addEventListener("click", () => {
        state.monthlyBudget = Number(button.dataset.budget);
        render();
      });
    });

    document.querySelectorAll("[data-focus-choice]").forEach(button => {
      button.addEventListener("click", () => {
        state.focusBlock = button.dataset.focusChoice === "yes";
        render();
      });
    });

    document.querySelectorAll("[data-mood]").forEach(button => {
      button.addEventListener("click", () => {
        state.moodBaseline = Number(button.dataset.mood);
        render();
      });
    });

    document.querySelector("[data-action='back']")?.addEventListener("click", () => {
      state.step = Math.max(0, state.step - 1);
      render();
    });

    document.querySelector("[data-action='next']")?.addEventListener("click", () => {
      captureInputs();
      if (!canAdvance()) return;
      state.step = Math.min(STEPS_TOTAL - 1, state.step + 1);
      render();
    });

    document.querySelector("[data-action='finish']")?.addEventListener("click", async () => {
      captureInputs();
      if (!canAdvance() || state.saving) return;
      await finish();
    });

    document.getElementById("wlCurrency")?.addEventListener("change", event => {
      state.currency = event.target.value;
    });
    document.getElementById("wlBudgetAmount")?.addEventListener("input", event => {
      state.monthlyBudget = Math.max(0, Number(event.target.value || 0));
    });
    document.getElementById("wlFocusTime")?.addEventListener("input", event => {
      state.focusTime = event.target.value || "09:00";
    });
  }

  function captureInputs() {
    const currency = document.getElementById("wlCurrency");
    const budget = document.getElementById("wlBudgetAmount");
    const focusTime = document.getElementById("wlFocusTime");
    if (currency) state.currency = currency.value;
    if (budget) state.monthlyBudget = Math.max(0, Number(budget.value || 0));
    if (focusTime) state.focusTime = focusTime.value || "09:00";
  }

  function canAdvance() {
    if (state.step === 0) return state.goals.length > 0;
    if (state.step === 1) return state.starterHabits.length === 3;
    if (state.step === 3) return state.monthlyBudget > 0;
    return true;
  }

  async function finish() {
    state.saving = true;
    render();

    try {
      const user = await userReady;
      if (!user) return;
      const db = firebase.firestore();
      const root = db.collection("users").doc(user.uid);
      const setup = {
        goals: state.goals,
        starterHabits: selectedHabitObjects(),
        sleepTarget: state.sleepTarget,
        monthlyBudget: state.monthlyBudget,
        currency: state.currency,
        focusBlock: state.focusBlock,
        focusTime: state.focusTime,
        moodBaseline: state.moodBaseline,
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await root.collection("onboarding").doc("setup").set(setup, { merge: true });
      await root.set({
        onboardingCompleted: true,
        onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        onboarding: setup,
        profile: { goals: state.goals, currency: state.currency },
      }, { merge: true });

      await seedDashboard();
      sessionStorage.setItem("hbit:onboarding:justCompleted", "1");
      window.location.href = "home.html";
    } catch (err) {
      console.warn("[Hbit] Could not finish onboarding:", err);
      state.saving = false;
      render();
      window.HBIT?.components?.toast?.("Setup could not be saved. Try again in a moment.", { type: "error" });
    }
  }

  async function seedDashboard() {
    const db = window.HBIT?.db;
    if (!db) throw new Error("HBIT.db unavailable");
    const today = db.today?.() || dateKey(new Date());
    const month = today.slice(0, 7);
    const habits = selectedHabitObjects();

    await Promise.allSettled(habits.map(item => db.habits.add({
      name: item.name,
      description: item.description,
      category: item.category,
      when: item.when,
      intent: item.category === "mindset" ? "quit" : "start",
      difficulty: "easy",
      frequency: "daily",
      goalDays: 30,
      motivationTags: state.goals,
      icon: "*",
    })));

    await Promise.allSettled([
      db.sleepSettings.set({
        targetHours: state.sleepTarget,
        defaultWake: "07:00",
        windDownMins: 45,
        alarmEnabled: false,
      }),
      db.budgetGoals.set(month, {
        income: 0,
        budgetLimit: state.monthlyBudget,
        categories: {
          essentials: Math.round(state.monthlyBudget * 0.45),
          food: Math.round(state.monthlyBudget * 0.2),
          transport: Math.round(state.monthlyBudget * 0.1),
          savings: Math.round(state.monthlyBudget * 0.15),
          flexible: Math.round(state.monthlyBudget * 0.1),
        },
      }),
      db.moodLogs.set(today, {
        score: state.moodBaseline * 2,
        mood: state.moodBaseline * 2,
        energy: null,
        stress: null,
        focus: null,
        notes: "Baseline from onboarding.",
        tags: ["onboarding"],
      }),
      state.focusBlock ? db.tasks.add({
        title: "First focus block",
        date: today,
        time: state.focusTime,
        duration: 25,
        priority: "medium",
        done: false,
        tags: ["focus"],
        source: "onboarding",
      }) : Promise.resolve(),
    ]);
  }

  function habitChoices() {
    const chosen = state.goals.length ? state.goals : ["habits"];
    const all = chosen.flatMap(goal => HABITS[goal] || []);
    const unique = new Map();
    all.concat(HABITS.habits).forEach(item => unique.set(item.id, item));
    return Array.from(unique.values()).slice(0, 9);
  }

  function selectedHabitObjects() {
    const all = habitChoices();
    return state.starterHabits.map(id => all.find(item => item.id === id)).filter(Boolean);
  }

  function toggleArray(list, value) {
    const next = list.includes(value) ? list.filter(item => item !== value) : list.concat(value);
    state.goals = next;
    state.starterHabits = state.starterHabits.filter(id => habitChoices().some(item => item.id === id));
    render();
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatHours(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function money(amount) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: state.currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (_) {
      return `${state.currency} ${amount}`;
    }
  }
});
