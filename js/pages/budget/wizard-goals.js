  /* ── Wizard ──────────────────────────────────────────────────────── */
  function spawnWizardConfetti(card) {
    if (!card) return;
      const colors = ["var(--bgt-accent)", "var(--bgt-income)", "var(--bgt-saved)", "var(--bgt-spent)", "var(--bgt-surface-1)"];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement("span");
      p.className = "bg-confetti-piece";
      const x = (Math.random() * 400 - 200).toFixed(0) + "px";
      const r = (Math.random() * 720).toFixed(0) + "deg";
      p.style.setProperty("--x", x);
      p.style.setProperty("--r", r);
      p.style.setProperty("--c", colors[i % colors.length]);
      p.style.setProperty("--delay", `${Math.floor(Math.random() * 120)}ms`);
      card.appendChild(p);
    }
    setTimeout(() => { card.querySelectorAll(".bg-confetti-piece").forEach(n => n.remove()); }, 900);
  }

  function renderWizardSlideContent(n) {
    const stage = $("bgWizStage");
    if (!stage) return;
    const slide = document.createElement("div");
    slide.className = "bg-wiz-slide entering";
    slide.tabIndex = -1;
    slide.setAttribute("role", "group");

    const WIZ_TOTAL = 7; // slides 0–6

    if (n === 0) {
      // Welcome — no answer required
      slide.innerHTML = `
        <div class="bg-wiz-welcome-icon" aria-hidden="true">
          ${svgIconLucide(`<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`, 48)}
        </div>
        <h2 class="bg-wiz-title">${escHtml(t("budget.wizard.welcome.title") || "Let's personalize your budget")}</h2>
        <p class="bg-wiz-sub">${escHtml(t("budget.wizard.welcome.sub") || "Answer 6 quick questions to build a dashboard that fits how you manage money.")}</p>`;

    } else if (n === 1) {
      // Primary goal
      const GOAL_ICONS = {
        spend_track: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
        save:        `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
        debt:        `<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>`,
        optimize:    `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
        insight:     `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
      };
      const goalDescs = {
        spend_track: "I want clear visibility every week",
        save:        "I end the month with little left",
        debt:        "Cards or loans are hard to control",
        optimize:    "I want to cut unnecessary spending",
        insight:     "I track already, but want smarter guidance",
      };
      const opts = ["spend_track", "save", "debt", "optimize", "insight"];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.goal") || "What's your biggest money priority right now?")}</h2>
        ${opts.map((id, i) => `
          <button type="button" class="bg-wiz-option${wizardAnswers.goal === id ? " selected" : ""}" data-wiz-goal="${id}" style="--i:${i}">
            <svg class="bg-wiz-check-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
            <span class="bg-wiz-option-lead">${svgIconLucide(GOAL_ICONS[id] || GOAL_ICONS.insight, 22)}</span>
            <span><span class="bg-wiz-option-label">${escHtml(t("budget.wizard.goal." + id) || id)}</span><span class="bg-wiz-option-desc">${escHtml(goalDescs[id] || "")}</span></span>
          </button>`).join("")}`;

    } else if (n === 2) {
      // Budgeting approach
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.mode") || "How do you prefer to manage your money?")}</h2>
        <div class="bg-wiz-mode-row">
          <button type="button" class="bg-wiz-mode-card${wizardAnswers.mode === "plan" ? " selected" : ""}" data-mode="plan">
            <span class="bg-wiz-mode-ico">${svgIconLucide(WIZ_MODE_INNER.plan, 26)}</span>
            <span class="bg-wiz-option-label">${escHtml(t("budget.wizard.planAhead", "Plan ahead"))}</span>
            <span class="bg-wiz-option-desc">${escHtml(t("budget.wizard.planAheadDesc", "Set budgets upfront, then track against them."))}</span>
          </button>
          <button type="button" class="bg-wiz-mode-card${wizardAnswers.mode === "track" ? " selected" : ""}" data-mode="track">
            <span class="bg-wiz-mode-ico">${svgIconLucide(WIZ_MODE_INNER.track, 26)}</span>
            <span class="bg-wiz-option-label">${escHtml(t("budget.wizard.trackFirst", "Track first"))}</span>
            <span class="bg-wiz-option-desc">${escHtml(t("budget.wizard.trackFirstDesc", "See what I spend, then decide where to adjust."))}</span>
          </button>
        </div>`;

    } else if (n === 3) {
      // Income frequency
      const payLabels = {
        weekly:    "Weekly",
        biweekly:  "Bi-weekly",
        monthly:   "Monthly",
        irregular: t("budget.wizard.irregular") || "Variable income",
      };
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.pay") || "How often do you get paid?")}</h2>
        <div class="bg-wiz-pay-row">
          ${["weekly", "biweekly", "monthly", "irregular"].map((id, i) => `
            <button type="button" class="bg-wiz-pay-chip${wizardAnswers.payFrequency === id ? " selected" : ""}" data-payf="${id}" style="--i:${i}">${escHtml(payLabels[id])}</button>`).join("")}
        </div>`;

    } else if (n === 4) {
      // Experience level
      const lv = [
        { id: "beginner",     t: "Beginner",     d: "Just getting started with budgeting" },
        { id: "intermediate", t: "Intermediate",  d: "I track sometimes, want better insights" },
        { id: "advanced",     t: "Advanced",      d: "Experienced, managing multiple accounts" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.level") || "What's your comfort level with finances?")}</h2>
        <div class="bg-wiz-level-row">
          ${lv.map((o, i) => `
            <button type="button" class="bg-wiz-level-card${wizardAnswers.level === o.id ? " selected" : ""}" data-level="${o.id}" style="--i:${i}">
              <span class="bg-wiz-level-ico">${svgIconLucide(WIZ_LEVEL_INNER[o.id] || WIZ_LEVEL_INNER.beginner, 22)}</span>
              <span class="bg-wiz-option-label">${escHtml(o.t)}</span>
              <span class="bg-wiz-option-desc">${escHtml(o.d)}</span>
            </button>`).join("")}
        </div>`;

    } else if (n === 5) {
      // Challenges — multi-select optional
      const challenges = [
        { id: "overspend",           t: t("budget.wizard.challenge.overspend")           || "I overspend in certain categories" },
        { id: "invisible_spending",  t: t("budget.wizard.challenge.invisible")            || "Spending happens without my awareness" },
        { id: "irregular_bills",     t: t("budget.wizard.challenge.irregular_bills")      || "Surprise bills stress me" },
        { id: "savings_discipline",  t: t("budget.wizard.challenge.savings_discipline")   || "Can't stick to savings goals" },
        { id: "multiple_accounts",   t: t("budget.wizard.challenge.multiple_accounts")    || "Money scattered across accounts" },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.challenges") || "Any challenges you face? (optional, pick up to 3)")}</h2>
        <div class="bg-wiz-goals-grid">
          ${challenges.map((o, i) => `
            <button type="button" class="bg-wiz-goal-chip${wizardAnswers.challenges.includes(o.id) ? " selected" : ""}" data-challenge="${o.id}" style="--i:${i}">${svgIconLucide(WIZ_GOAL_INNER, 16)}<span>${escHtml(o.t)}</span></button>`).join("")}
        </div>`;

    } else {
      // Commitment (slide 6)
      const cm = [
        { id: "all_in",   t: t("budget.wizard.commitment.all_in") || "Send me insights, tips, and alerts",    ico: WIZ_COMMIT_INNER.allin  },
        { id: "moderate", t: t("budget.wizard.commitment.mod")     || "Weekly summaries and key alerts",       ico: WIZ_COMMIT_INNER.mod    },
        { id: "light",    t: t("budget.wizard.commitment.light")   || "Alerts only if something's wrong",      ico: WIZ_COMMIT_INNER.casual },
        { id: "minimal",  t: t("budget.wizard.commitment.min")     || "No notifications, I'll check the app",  ico: WIZ_COMMIT_INNER.casual },
      ];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.step.commitment") || "How much guidance would you like?")}</h2>
        ${cm.map((o, i) => `
          <button type="button" class="bg-wiz-commit-card${wizardAnswers.commitment === o.id ? " selected" : ""}" data-commit="${o.id}" style="--i:${i}">
            <span class="bg-wiz-commit-ico">${svgIconLucide(o.ico, 22)}</span>
            <span class="bg-wiz-commit-text">
              <span class="bg-wiz-option-label">${escHtml(o.t)}</span>
            </span>
          </button>`).join("")}`;
    }

    stage.innerHTML = "";
    stage.appendChild(slide);
    const finishEnter = () => {
      slide.classList.remove("entering");
      slide.style.removeProperty("opacity");
    };
    const onAnimEnd = (ev) => {
      if (ev.target !== slide || ev.animationName !== "bg-wiz-in") return;
      slide.removeEventListener("animationend", onAnimEnd);
      finishEnter();
    };
    slide.addEventListener("animationend", onAnimEnd);
    window.setTimeout(() => {
      slide.removeEventListener("animationend", onAnimEnd);
      if (slide.classList.contains("entering")) finishEnter();
    }, 280);
    slide.focus();

    const pr = $("bgWizProgress");
    if (pr) pr.style.width = `${((n + 1) / WIZ_TOTAL) * 100}%`;
    setText("bgWizCounter", `${n + 1} / ${WIZ_TOTAL}`);
    const back = $("bgWizBack");
    if (back) back.style.visibility = n === 0 ? "hidden" : "visible";
    const next = $("bgWizNext");
    if (next) next.textContent = n === WIZ_TOTAL - 1 ? "Let's go \u2713" : "Next \u2192";
  }

  function transitionWizardSlide(fromN, toN, dir, done) {
    const stage = $("bgWizStage");
    const old = stage?.querySelector(".bg-wiz-slide");
    if (old && fromN !== toN) {
      old.classList.add("leaving");
      setTimeout(() => {
        wizardSlideIndex = toN;
        renderWizardSlideContent(toN);
        if (done) done();
      }, 100);
    } else {
      wizardSlideIndex = toN;
      renderWizardSlideContent(toN);
      if (done) done();
    }
  }

  function openWizard() {
    const ov = $("bg-wizard-overlay");
    if (!ov) return;
    Object.assign(wizardAnswers, {
      goal: null, mode: null, payFrequency: null, level: null, challenges: [], commitment: null,
    });
    ov.style.display = "flex";
    ov.setAttribute("aria-hidden", "false");
    wizardSlideIndex = 0;
    renderWizardSlideContent(0);
    document.body.style.overflow = "hidden";

    wizardTrapHandler = e => {
      const wov = $("bg-wizard-overlay");
      if (!wov || wov.style.display === "none") return;
      if (e.key === "Tab") {
        const focusables = ov.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = [...focusables].filter(el => !el.disabled && el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.key === "ArrowRight") { e.preventDefault(); wizardGoNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); wizardGoBack(); }
      if (e.key === "Enter" && !e.target.closest?.("button")) { e.preventDefault(); wizardGoNext(); }
    };
    document.addEventListener("keydown", wizardTrapHandler);
    setTimeout(() => $("bgWizNext")?.focus(), 200);
  }

  function closeWizardRemove() {
    const ov = $("bg-wizard-overlay");
    if (wizardTrapHandler) {
      document.removeEventListener("keydown", wizardTrapHandler);
      wizardTrapHandler = null;
    }
    if (!ov) return;
    ov.style.display = "none";
    ov.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    ov.remove();
  }

  function fadeOutWizardThen(cb) {
    const card = $("bgWizardCard");
    const ov = $("bg-wizard-overlay");
    if (card) card.classList.add("bg-wizard-fade-out");
    if (ov)   ov.classList.add("bg-wizard-fade-out");   // fade backdrop too — fixes black screen
    setTimeout(() => {
      if (typeof cb === "function") cb();
      if (ov && ov.parentNode) {
        if (wizardTrapHandler) document.removeEventListener("keydown", wizardTrapHandler);
        wizardTrapHandler = null;
        ov.remove();
        document.body.style.overflow = "";
      }
    }, 400);
  }

  async function skipWizard() {
    try {
      await saveWizardDoc({
        completed: true,
        wizardComplete: true,
        cards: DEFAULT_DASHBOARD_CARDS.slice(),
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, true);
      state.wizardMeta = { ...state.wizardMeta, completed: true, wizardComplete: true, cards: DEFAULT_DASHBOARD_CARDS.slice() };
      fadeOutWizardThen(() => {
        renderSetupChecklist();
        showToast(t("budget.toast.skipped", "Skipped — you can always revisit settings later."));
      });
    } catch (err) {
      /* silent */
      showToast(t("budget.toast.saveError", "Could not save: {error}", { error: err?.code || err?.message || "error" }));
    }
  }

  async function finishWizard() {
    const card = $("bgWizardCard");
    try {
      await saveWizardDoc({
        completed:    true,
        wizardComplete: true,
        completedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        cards:        DEFAULT_DASHBOARD_CARDS.slice(),
        goal:         wizardAnswers.goal,
        mode:         wizardAnswers.mode,
        payFrequency: wizardAnswers.payFrequency,
        level:        wizardAnswers.level,
        challenges:   wizardAnswers.challenges,
        commitment:   wizardAnswers.commitment,
      }, true);
    } catch (err) {
      showToast(t("budget.toast.saveError", "Could not save: {error}", { error: err?.code || err?.message || "error" }));
      return;
    }
    spawnWizardConfetti(card);
    state.wizardMeta = {
      completed:    true,
      wizardComplete: true,
      cards:        DEFAULT_DASHBOARD_CARDS.slice(),
      goal:         wizardAnswers.goal,
      mode:         wizardAnswers.mode,
      payFrequency: wizardAnswers.payFrequency,
      level:        wizardAnswers.level,
      challenges:   wizardAnswers.challenges,
      commitment:   wizardAnswers.commitment,
    };
    initPlannerModeFromMeta();
    fadeOutWizardThen(() => {
      renderAll();
      showToast(t("budget.toast.ready", "You're all set! Let's build your budget."));
    });
  }

  function wizardValidate(n) {
    // slide 0 = welcome (no answer), 5 & 6 = optional
    if (n === 1 && !wizardAnswers.goal) return false;
    if (n === 2 && !wizardAnswers.mode) return false;
    if (n === 3 && !wizardAnswers.payFrequency) return false;
    if (n === 4 && !wizardAnswers.level) return false;
    // n === 5 challenges: optional — always valid
    // n === 6 commitment: optional — always valid
    return true;
  }

  function wizardGoNext() {
    if (!wizardValidate(wizardSlideIndex)) {
      const st = $("bgWizStage");
      if (st) {
        st.classList.add("bg-shake");
        window.setTimeout(() => st.classList.remove("bg-shake"), 400);
      }
      showToast(t("budget.wizard.chooseOption"));
      return;
    }
    if (wizardSlideIndex >= 6) {
      finishWizard().catch(() => { /* silent */ });
      return;
    }
    transitionWizardSlide(wizardSlideIndex, wizardSlideIndex + 1, 1);
  }

  function wizardGoBack() {
    if (wizardSlideIndex <= 0) return;
    transitionWizardSlide(wizardSlideIndex, wizardSlideIndex - 1, -1);
  }

  function onWizardStageClick(e) {
    // Step 1 — primary goal
    const wg = e.target.closest("[data-wiz-goal]");
    if (wg) {
      wizardAnswers.goal = wg.dataset.wizGoal;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 2 — mode
    const md = e.target.closest("[data-mode]");
    if (md) {
      wizardAnswers.mode = md.dataset.mode;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 3 — pay frequency
    const pf = e.target.closest("[data-payf]");
    if (pf) {
      wizardAnswers.payFrequency = pf.dataset.payf;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 4 — experience level
    const lv = e.target.closest("[data-level]");
    if (lv) {
      wizardAnswers.level = lv.dataset.level;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 5 — challenges (multi-select, optional, max 3)
    const ch = e.target.closest("[data-challenge]");
    if (ch) {
      const id = ch.dataset.challenge;
      const i = wizardAnswers.challenges.indexOf(id);
      if (i >= 0) {
        wizardAnswers.challenges.splice(i, 1);
      } else if (wizardAnswers.challenges.length < 3) {
        wizardAnswers.challenges.push(id);
      } else {
        const grid = ch.closest(".bg-wiz-goals-grid");
        if (grid) { grid.classList.add("bg-shake"); setTimeout(() => grid.classList.remove("bg-shake"), 400); }
      }
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
    // Step 6 — commitment
    const cm = e.target.closest("[data-commit]");
    if (cm) {
      wizardAnswers.commitment = cm.dataset.commit;
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }
  }

  /* ── Trend chart (lazy) ─────────────────────────────────────────── */
  async function loadTrendData() {
    if (state.trendLoading || state.trendLoaded) return;
    state.trendLoading = true;
    const sk = $("bgTrendSkeleton");
    const wrap = $("bgTrendChartWrap");
    if (sk) sk.style.display = "";
    if (wrap) wrap.style.display = "none";

    const months = [];
    let d = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      months.push({ ym, label: dt.toLocaleDateString(undefined, { month: "short" }) });
    }
    const incomeArr = [];
    const spentArr = [];
    for (const m of months) {
      try {
        const entries = await HBIT.db.budgetEntries.forMonth(m.ym);
        incomeArr.push(sumEntryAmounts(entries, "income"));
        spentArr.push(sumEntryAmounts(entries, "expense"));
      } catch {
        incomeArr.push(0);
        spentArr.push(0);
      }
    }
    state.trendData = { months, income: incomeArr, spent: spentArr };
    state.trendLoaded = true;
    state.trendLoading = false;
    if (sk) sk.style.display = "none";
    if (wrap) {
      wrap.style.display = "";
      wrap.innerHTML = buildTrendSvg(months, incomeArr, spentArr);
    }
  }

  function buildTrendSvg(months, incomeArr, spentArr) {
    const W = 320;
    const H = 200;
    const padL = 36;
    const padB = 28;
    const padT = 16;
    const bw = 14;
    const gap = 8;
    const savings = months.map((_, i) => (incomeArr[i] || 0) - (spentArr[i] || 0));
    const maxVal = Math.max(...incomeArr, ...spentArr, ...savings.map(s => Math.max(0, s)), 1);
    const chartW = W - padL - 12;
    const chartH = H - padT - padB;
    const groupW = chartW / 6;

    let bars = "";
    let linePts = "";
    months.forEach((m, i) => {
      const cx = padL + i * groupW + groupW / 2;
      const income = incomeArr[i] || 0;
      const hInc = (income / maxVal) * chartH;
      const hSp = ((spentArr[i] || 0) / maxVal) * chartH;
      const x1 = cx - bw - gap / 2;
      const x2 = cx + gap / 2;
      const delayInc = i * 160;
      const delaySp = i * 160 + 80;
      bars += `<rect class="bg-trend-bar bg-trend-bar--income" x="${x1}" y="${padT + chartH - hInc}" width="${bw}" height="${hInc}" rx="2" style="animation-delay:${delayInc}ms"/>`;
      bars += `<rect class="bg-trend-bar bg-trend-bar--spent" x="${x2}" y="${padT + chartH - hSp}" width="${bw}" height="${hSp}" rx="2" style="animation-delay:${delaySp}ms"/>`;
      const sv = Math.max(0, savings[i]);
      const sy = padT + chartH - (sv / maxVal) * chartH;
      const sx = cx;
      linePts += (i === 0 ? "M" : "L") + `${sx},${sy} `;
    });

    const tooltipId = "bgTrendTip";
    let svg = `<svg class="bg-trend-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="${escHtml(t("budget.aria.trendChart", "Spending trend chart"))}">`;
    svg += bars;
    svg += `<path class="bg-trend-line" d="${linePts.trim()}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    months.forEach((m, i) => {
      const cx = padL + i * groupW + groupW / 2;
      const tip = `${m.label} · Income ${fmtMoney(incomeArr[i] || 0)} · Spent ${fmtMoney(spentArr[i] || 0)} · Saved ${fmtMoney(savings[i])}`;
      svg += `<rect x="${padL + i * groupW}" y="${padT}" width="${groupW}" height="${chartH}" fill="transparent" class="bg-trend-hit" data-tip="${escHtml(tip)}" data-i="${i}"/>`;
      svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--bgt-text-3)" font-family="system-ui,sans-serif">${escHtml(m.label)}</text>`;
    });
    svg += `</svg><div class="bg-trend-tooltip" id="${tooltipId}"></div>`;

    setTimeout(bindTrendTooltip, 0);

    return svg;
  }

  function bindTrendTooltip() {
    const host = $("bgTrendChartWrap");
    const tip = $("bgTrendTip");
    const svg = host?.querySelector?.(".bg-trend-svg");
    if (!host || !tip || !svg || trendTooltipBoundSvg === svg) return;
    trendTooltipBoundSvg = svg;
    svg.addEventListener("pointermove", onTrendPointerMove);
    svg.addEventListener("pointerleave", () => {
      tip.style.display = "none";
      tip.removeAttribute("data-current-idx");
    });
  }

  function onTrendPointerMove(ev) {
    const svg = ev.currentTarget;
    const host = $("bgTrendChartWrap");
    const tip = $("bgTrendTip");
    const hit = ev.target?.closest?.(".bg-trend-hit");
    if (!host || !tip || !hit || !svg.contains(hit)) {
      if (tip) tip.style.display = "none";
      return;
    }
    tip.textContent = hit.dataset.tip || "";
    tip.dataset.currentIdx = hit.dataset.i || "";
    tip.style.display = "block";
    const r = hit.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    tip.style.left = `${r.left - hr.left + r.width / 2 - tip.offsetWidth / 2}px`;
    tip.style.top = `${r.top - hr.top - tip.offsetHeight - 8}px`;
  }

  /* ── CSV export ───────────────────────────────────────────────────── */
  async function fetchEntriesForExport(range) {
    if (range === "month") {
      return state.entries.filter(e =>
        (e.month || (e.dateKey || "").slice(0, 7)) === state.month
      );
    }
    if (range === "all") {
      if (state.allEntriesCache) return state.allEntriesCache;
      const col = HBIT.userSubcollectionRef(state.uid, "budgetEntries");
      const snap = await col.get();
      state.allEntriesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return state.allEntriesCache;
    }
    const n = range === "3" ? 3 : 6;
    const months = [];
    let ym = state.month;
    for (let i = 0; i < n; i++) {
      months.push(ym);
      ym = prevMonth(ym);
    }
    const all = [];
    for (const m of months) {
      const rows = await HBIT.db.budgetEntries.forMonth(m);
      all.push(...rows);
    }
    return all;
  }

  function runCsvExport(range) {
    fetchEntriesForExport(range).then(rows => {
      const lines = ["Date,Category,Amount,Note,Month"];
      rows.forEach(e => {
        const dk = e.dateKey || e.date || "";
        const mo = e.month || dk.slice(0, 7);
        const cat = e.category || "other";
        const amt = (Math.abs(e.amount || 0)).toFixed(2);
        const note = String(e.description || "").replace(/"/g, '""');
        lines.push(`"${dk}","${cat}",${amt},"${note}","${mo}"`);
      });
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hbit-budget-${state.month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(() => {
      HBIT.toast?.show?.(HBIT.i18n?.t?.("budget.export.error", "Export failed"), "error");
    });
  }

  /* ── Savings goals CRUD ─────────────────────────────────────────── */
  function openGoalCreateSheet() {
    state.goalSheetMode = "create";
    state.goalEditId = null;
    setText("goalSheetTitle", t("budget.goal.newGoal", "New goal"));
    setVal("goalName", "");
    setVal("goalTargetAmt", "");
    setVal("goalTargetDate", "");
    setVal("goalMonthly", "");
    state.goalSelectedColor = GOAL_COLORS[0].hex;
    const createBtn = $("goalCreateBtn");
    if (createBtn) createBtn.textContent = t("budget.goal.create", "Create Goal");
    const sym = $("goalCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    renderGoalSwatches();
    openOverlay("goalOverlay");
  }

  function openGoalEditSheet(g) {
    state.goalSheetMode = "edit";
    state.goalEditId = g.id;
    setText("goalSheetTitle", t("budget.goal.edit", "Edit goal"));
    setVal("goalName", g.name || "");
    setVal("goalTargetAmt", g.targetAmount != null ? String(g.targetAmount) : "");
    setVal("goalTargetDate", g.targetDate || "");
    setVal("goalMonthly", g.monthlyTarget != null && g.monthlyTarget !== ""
      ? String(g.monthlyTarget) : "");
    state.goalSelectedColor = g.color || GOAL_COLORS[0].hex;
    const createBtn = $("goalCreateBtn");
    if (createBtn) createBtn.textContent = t("budget.goal.save", "Save goal");
    const sym = $("goalCurrencySym");
    if (sym) sym.textContent = currencySymbol();
    renderGoalSwatches();
    openOverlay("goalOverlay");
  }

  function renderGoalSwatches() {
    const row = $("goalSwatches");
    if (!row) return;
    row.innerHTML = GOAL_COLORS.map((c, i) =>
      `<button type="button" class="bg-goal-swatch${c.hex === state.goalSelectedColor ? " selected" : ""}" style="background:${c.hex}" data-hex="${c.hex}" aria-label="${escHtml(t("budget.goal.colorLabel", "Color {number}", { number: i + 1 }))}"></button>`
    ).join("");
  }

  async function submitGoalSheet() {
    const name = ($("goalName")?.value || "").trim();
    const tgt = parseFloat($("goalTargetAmt")?.value);
    const dt = ($("goalTargetDate")?.value || "").trim();
    const monthlyRaw = ($("goalMonthly")?.value || "").trim();
    const monthly = monthlyRaw ? parseFloat(monthlyRaw) : null;
    if (!name) { flashError("goalName"); return; }
    if (!tgt || tgt <= 0) { flashError("goalTargetAmt"); return; }
    if (!dt) { flashError("goalTargetDate"); return; }

    const ts = firebase.firestore.FieldValue.serverTimestamp();

    try {
      if (state.goalSheetMode === "edit" && state.goalEditId) {
        await savingsGoalsCol().doc(state.goalEditId).update({
          name,
          targetAmount: tgt,
          targetDate: dt,
          color: state.goalSelectedColor,
          monthlyTarget: monthly != null && Number.isFinite(monthly) ? monthly : null,
          updatedAt: ts,
        });
      } else {
        await savingsGoalsCol().add({
          uid: state.uid,
          name,
          targetAmount: tgt,
          savedAmount: 0,
          targetDate: dt,
          color: state.goalSelectedColor,
          monthlyTarget: monthly != null && Number.isFinite(monthly) ? monthly : null,
          createdAt: ts,
          updatedAt: ts,
        });
      }
      closeOverlay("goalOverlay");
      await loadSavingsGoals();
      renderGoalsSection();
      renderSetupChecklist();
    } catch (err) {
      fbErrRetry(err, submitGoalSheet);
    }
  }

  function openGoalDetail(g) {
    state.goalDetailId = g.id;
    setText("goalDetailTitle", g.name || "Goal");
    const tgt = Number(g.targetAmount) || 0;
    const saved = Number(g.savedAmount) || 0;
    const pct = tgt > 0 ? Math.min(100, (saved / tgt) * 100) : 0;
    const arc = $("goalDetailArc");
    if (arc) {
      const r = 40;
      const c = 2 * Math.PI * r * (pct / 100);
      arc.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="${escHtml(g.color || "var(--bgt-accent)")}" stroke-width="8"
          stroke-dasharray="${c.toFixed(1)} ${(2 * Math.PI * r).toFixed(1)}"
          transform="rotate(-90 50 50)" stroke-linecap="round"/></svg>`;
    }
    setText("goalDetailProgress", `${fmtMoney(saved)} of ${fmtMoney(tgt)} (${pct.toFixed(0)}%)`);
    const cf = $("goalContribField");
    if (cf) cf.style.display = "none";
    setVal("goalContribAmt", "");
    const sym = $("goalContribSym");
    if (sym) sym.textContent = currencySymbol();
    openOverlay("goalDetailOverlay");
  }

  async function submitGoalContrib() {
    const amt = parseFloat($("goalContribAmt")?.value);
    if (!amt || amt <= 0) { flashError("goalContribAmt"); return; }
    const g = state.savingsGoals.find(x => x.id === state.goalDetailId);
    if (!g) return;
    const newSaved = (Number(g.savedAmount) || 0) + amt;
    try {
      await savingsGoalsCol().doc(g.id).update({
        savedAmount: newSaved,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      closeOverlay("goalDetailOverlay");
      await loadSavingsGoals();
      renderGoalsSection();
    } catch (err) {
      fbErrRetry(err, () => addGoalContribution());
    }
  }

  async function deleteGoal() {
    const id = state.goalDetailId;
    if (!id) return;
    try {
      await savingsGoalsCol().doc(id).delete();
      closeOverlay("goalDetailOverlay");
      await loadSavingsGoals();
      renderGoalsSection();
      renderSetupChecklist();
    } catch (err) {
      fbErrRetry(err, deleteGoal);
    }
  }
