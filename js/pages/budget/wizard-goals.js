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

    const WIZ_TOTAL = 4;

    if (n === 0) {
      slide.innerHTML = `
        <h2 class="bg-wiz-title">${escHtml(t("budget.wizard.income.title", "What comes in each month?"))}</h2>
        <p class="bg-wiz-sub">${escHtml(t("budget.wizard.income.sub", "Start with your usual monthly income. You can refine it later."))}</p>
        <label class="bg-wiz-money-field">
          <span>${escHtml(t("budget.wizard.income.label", "Monthly income"))}</span>
          <input class="bg-input bg-wiz-money-input" id="bgWizIncome" type="number" inputmode="decimal" min="0" step="0.01" placeholder="3200" value="${escHtml(wizardAnswers.monthlyIncome)}" />
        </label>`;
    } else if (n === 1) {
      slide.innerHTML = `
        <h2 class="bg-wiz-title">${escHtml(t("budget.wizard.fixed.title", "What is already spoken for?"))}</h2>
        <p class="bg-wiz-sub">${escHtml(t("budget.wizard.fixed.sub", "Add rent, subscriptions, debt payments, and other fixed expenses as one monthly total."))}</p>
        <label class="bg-wiz-money-field">
          <span>${escHtml(t("budget.wizard.fixed.label", "Fixed expenses"))}</span>
          <input class="bg-input bg-wiz-money-input" id="bgWizFixed" type="number" inputmode="decimal" min="0" step="0.01" placeholder="1450" value="${escHtml(wizardAnswers.fixedExpenses)}" />
        </label>`;
    } else if (n === 2) {
      slide.innerHTML = `
        <h2 class="bg-wiz-title">${escHtml(t("budget.wizard.savings.title", "What do you want to save?"))}</h2>
        <p class="bg-wiz-sub">${escHtml(t("budget.wizard.savings.sub", "Set a monthly savings goal. Use 0 if this month is only about stability."))}</p>
        <label class="bg-wiz-money-field">
          <span>${escHtml(t("budget.wizard.savings.label", "Monthly savings goal"))}</span>
          <input class="bg-input bg-wiz-money-input" id="bgWizSavings" type="number" inputmode="decimal" min="0" step="0.01" placeholder="400" value="${escHtml(wizardAnswers.savingsGoal)}" />
        </label>`;
    } else {
      const selected = Array.isArray(wizardAnswers.categories) ? wizardAnswers.categories : [];
      slide.innerHTML = `<h2 class="bg-wiz-title">${escHtml(t("budget.wizard.categories.title", "Which categories matter most?"))}</h2>
        <p class="bg-wiz-sub">${escHtml(t("budget.wizard.categories.sub", "Pick the budget rows you want front and center. You can add more later."))}</p>
        <div class="bg-wiz-goals-grid">
          ${CATEGORIES.filter(c => c.id !== "other").map((cat, i) => `
            <button type="button" class="bg-wiz-goal-chip${selected.includes(cat.id) ? " selected" : ""}" data-wiz-category="${cat.id}" style="--i:${i};--c:${cat.color}">
              ${catIconSvg(cat.id, 16)}
              <span>${escHtml(t("budget.category." + cat.id, cat.label))}</span>
            </button>`).join("")}
        </div>`;
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
    if (next) next.textContent = n === WIZ_TOTAL - 1
      ? t("budget.wizard.finish", "Build my budget")
      : t("budget.flow.continue", "Continue");
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
      monthlyIncome: "",
      fixedExpenses: "",
      savingsGoal: "",
      categories: ["housing", "food", "transport", "savings"],
      goal: "spend_track",
      mode: "plan",
      payFrequency: "monthly",
      level: "beginner",
      challenges: [],
      commitment: "moderate",
    });
    ov.style.display = "flex";
    ov.hidden = false;
    ov.removeAttribute("hidden");
    ov.classList.remove("bg-wizard-fade-out");
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
    ov.hidden = true;
    ov.setAttribute("hidden", "");
    ov.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
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
        ov.style.display = "none";
        ov.hidden = true;
        ov.setAttribute("hidden", "");
        ov.setAttribute("aria-hidden", "true");
        ov.classList.remove("bg-wizard-fade-out");
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
    syncWizardInputs();
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
        monthlyIncome: Number(wizardAnswers.monthlyIncome) || 0,
        fixedExpenses: Number(wizardAnswers.fixedExpenses) || 0,
        savingsGoal:   Number(wizardAnswers.savingsGoal) || 0,
        categories:    Array.isArray(wizardAnswers.categories) ? wizardAnswers.categories.slice() : [],
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
      monthlyIncome: Number(wizardAnswers.monthlyIncome) || 0,
      fixedExpenses: Number(wizardAnswers.fixedExpenses) || 0,
      savingsGoal:   Number(wizardAnswers.savingsGoal) || 0,
      categories:    Array.isArray(wizardAnswers.categories) ? wizardAnswers.categories.slice() : [],
    };
    initPlannerModeFromMeta();
    fadeOutWizardThen(() => {
      renderAll();
      showToast(t("budget.toast.ready", "You're all set! Let's build your budget."));
    });
  }

  function syncWizardInputs() {
    const income = $("bgWizIncome");
    const fixed = $("bgWizFixed");
    const savings = $("bgWizSavings");
    if (income) wizardAnswers.monthlyIncome = income.value;
    if (fixed) wizardAnswers.fixedExpenses = fixed.value;
    if (savings) wizardAnswers.savingsGoal = savings.value;
  }

  function wizardValidate(n) {
    syncWizardInputs();
    if (n === 0 && !(Number(wizardAnswers.monthlyIncome) > 0)) return false;
    if (n === 1 && !(Number(wizardAnswers.fixedExpenses) >= 0)) return false;
    if (n === 2 && !(Number(wizardAnswers.savingsGoal) >= 0)) return false;
    if (n === 3 && (!Array.isArray(wizardAnswers.categories) || wizardAnswers.categories.length === 0)) return false;
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
    if (wizardSlideIndex >= 3) {
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
    const cat = e.target.closest("[data-wiz-category]");
    if (cat) {
      const id = cat.dataset.wizCategory;
      if (!Array.isArray(wizardAnswers.categories)) wizardAnswers.categories = [];
      const i = wizardAnswers.categories.indexOf(id);
      if (i >= 0) {
        wizardAnswers.categories.splice(i, 1);
      } else {
        wizardAnswers.categories.push(id);
      }
      wizardAnswers.goal = wizardAnswers.categories.includes("savings") ? "save" : "spend_track";
      wizardAnswers.level = wizardAnswers.categories.length > 5 ? "intermediate" : "beginner";
      renderWizardSlideContent(wizardSlideIndex);
      return;
    }

    const legacyChallenge = e.target.closest("[data-challenge]");
    if (legacyChallenge) {
      const id = legacyChallenge.dataset.challenge;
      const i = wizardAnswers.challenges.indexOf(id);
      if (i >= 0) {
        wizardAnswers.challenges.splice(i, 1);
      } else {
        wizardAnswers.challenges.push(id);
      }
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

