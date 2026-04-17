/* =========================
   Hbit — js/pages/onboarding.js
   Post-signup onboarding wizard — 3 steps
   Collects: goal, name, ageRange, reminderTime
   Saves to Firestore users/{uid} via merge
   ========================= */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  window.HBIT?.theme?.apply?.();
  window.HBIT?.i18n?.init?.();

  const STEPS = ['step1', 'step2', 'step3'];
  let currentStep = 0;
  const collected = { goal: null, name: '', ageRange: '', reminderTime: null };

  const t = (key, fb) => window.HBIT?.i18n?.t?.(key, fb) ?? fb ?? key;

  // ── DOM refs ─────────────────────────────────────────────
  const stepEls = STEPS.map(id => document.getElementById(id));
  const dots    = document.querySelectorAll('.wl-dot');

  const step1Next   = document.getElementById('step1Next');
  const step1Skip   = document.getElementById('step1Skip');
  const step2Next   = document.getElementById('step2Next');
  const step2Skip   = document.getElementById('step2Skip');
  const step2Back   = document.getElementById('step2Back');
  const welcomeName = document.getElementById('welcomeName');
  const welcomeAge  = document.getElementById('welcomeAge');
  const step3Finish = document.getElementById('step3Finish');
  const step3Skip   = document.getElementById('step3Skip');
  const step3Back   = document.getElementById('step3Back');

  // ── Navigation helpers ───────────────────────────────────
  function goToStep(idx) {
    stepEls.forEach((el, i) => {
      el.classList.toggle('wl-step--active', i === idx);
      el.setAttribute('aria-hidden', i !== idx ? 'true' : 'false');
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('wl-dot--active', i === idx);
      dot.classList.toggle('wl-dot--complete', i < idx);
    });
    const progressBar = document.querySelector('.wl-progress');
    if (progressBar) progressBar.setAttribute('aria-valuenow', idx + 1);
    currentStep = idx;
  }

  // ── Option selection (radio-button style) ────────────────
  function initOptions(stepEl, onSelect) {
    if (!stepEl) return;
    const options = stepEl.querySelectorAll('.wl-option');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => {
          o.classList.remove('wl-option--selected');
          o.setAttribute('aria-checked', 'false');
        });
        opt.classList.add('wl-option--selected');
        opt.setAttribute('aria-checked', 'true');
        if (onSelect) onSelect(opt.dataset.value);
      });
    });
  }

  // Step 1 options → enable Continue button
  initOptions(stepEls[0], (value) => {
    collected.goal = value;
    if (step1Next) {
      step1Next.disabled = false;
      step1Next.classList.add('wl-cta--ready');
    }
  });

  // Step 3 options → enable Finish button
  initOptions(stepEls[2], (value) => {
    collected.reminderTime = value;
    if (step3Finish) {
      step3Finish.classList.add('wl-cta--ready');
    }
  });

  // ── Step navigation ──────────────────────────────────────
  step1Next?.addEventListener('click', () => {
    goToStep(1);
    // Pre-fill name from Firebase auth display name if available
    firebase.auth().onAuthStateChanged(user => {
      if (user?.displayName && welcomeName && !welcomeName.value) {
        welcomeName.value = user.displayName.split(' ')[0];
      }
    });
  });

  step1Skip?.addEventListener('click', () => goToStep(1));

  step2Next?.addEventListener('click', () => {
    collected.name     = welcomeName?.value.trim() ?? '';
    collected.ageRange = welcomeAge?.value ?? '';
    goToStep(2);
  });

  step2Skip?.addEventListener('click', () => goToStep(2));
  step2Back?.addEventListener('click', () => goToStep(0));

  // ── Finish & save ────────────────────────────────────────
  async function finishOnboarding(skipAll = false) {
    if (!skipAll) {
      collected.reminderTime = document.querySelector('#step3 .wl-option--selected')?.dataset.value || null;
      collected.name         = welcomeName?.value.trim() || collected.name;
      collected.ageRange     = welcomeAge?.value || collected.ageRange;
    }

    try {
      const user = firebase.auth().currentUser;
      if (user) {
        await firebase.firestore()
          .collection('users').doc(user.uid)
          .set({
            onboardingCompleted: true,
            onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            profile: {
              goal:         collected.goal         || null,
              ageRange:     collected.ageRange      || null,
              reminderTime: collected.reminderTime  || null,
            }
          }, { merge: true });

        if (collected.name && !user.displayName) {
          await user.updateProfile({ displayName: collected.name });
        }
      }
    } catch (err) {
      console.warn('[Hbit] Could not save onboarding data:', err);
      // Non-blocking — proceed to dashboard regardless
    }

    window.location.href = 'home.html';
  }

  step3Finish?.addEventListener('click', () => finishOnboarding(false));
  step3Skip?.addEventListener('click',   () => finishOnboarding(true));
  step3Back?.addEventListener('click',   () => goToStep(1));

  // ── Auth guard ───────────────────────────────────────────
  firebase.auth().onAuthStateChanged(async user => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // If already onboarded, skip to home
    try {
      const doc = await firebase.firestore().collection('users').doc(user.uid).get();
      if (doc.exists && doc.data()?.onboardingCompleted) {
        window.location.href = 'home.html';
      }
    } catch (_) {
      // Silently ignore — let user proceed with onboarding
    }
  });
});
