# Prompt Claude Code — Redesign Complet Budget Hbit v2
## Style: Revolut/Stripe — Finance Moderne Premium

---

## CONTEXTE

Tu travailles sur l'app Hbit, un tracker personnel de budget en vanilla JS + Firebase. La page `budget.html` (+ `css/pages/budget.css`, `css/core/tokens.css`, `css/core/nav.css`, `js/pages/budget.js`) a besoin d'un redesign complet côté UI/UX.

**Les fonctionnalités sont déjà codées et fonctionnelles — règle absolue :**
- Ne jamais modifier aucun `id=""` dans budget.html
- Ne jamais modifier la logique dans `js/pages/budget.js`
- Ne jamais modifier la structure HTML des formulaires (champs, labels, boutons submit)
- Ne jamais modifier `js/core/*.js`, `js/app.js`
- CSS et style visuel uniquement

---

## STEP 0 — INSTALL SKILLS (CRITIQUE, faire en premier)

```bash
claude mcp add nextlevelbuilder -- npx -y @nextlevelbuilder/mcp-server
```

Si indisponible, le prompt ci-dessous est suffisamment détaillé pour produire un excellent résultat sans ces skills.

---

## STEP 1 — TYPOGRAPHIE (PRIORITÉ HAUTE)

### Remplace le Google Fonts import dans `budget.html` `<head>`

```html
<!-- REMPLACE l'import Google Fonts existant par : -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Pourquoi DM Sans :** Police sans-serif optiquement corrigée, conçue pour les interfaces produits — plus premium que Inter, moins générique. Légèrement condensée aux grands corps, parfaite pour les chiffres financiers. Utilisée par Linear, Vercel, Stripe docs.

### Variables typo dans `css/core/tokens.css`

```css
--font-display: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
--font-body:    "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-sans:    "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono:    "DM Mono", "SF Mono", "JetBrains Mono", monospace;

--font-size-xs:   0.6875rem;   /* 11px */
--font-size-sm:   0.75rem;     /* 12px */
--font-size-base: 0.875rem;    /* 14px */
--font-size-md:   1rem;        /* 16px */
--font-size-lg:   1.125rem;    /* 18px */
--font-size-xl:   1.375rem;    /* 22px */
--font-size-2xl:  1.75rem;     /* 28px */
--font-size-3xl:  2.25rem;     /* 36px */
```

---

## STEP 2 — SYSTÈME DE COULEURS

### Dark Theme (défaut) — dans `css/core/tokens.css`

```css
--bg:      #070B14;
--panel:   #0D1117;
--panel2:  #111827;
--surface: rgba(255,255,255,0.04);
--text:    rgba(248, 250, 252, 0.95);
--muted:   rgba(148, 163, 184, 0.85);
--border:  rgba(255,255,255,0.08);
--brand:   #E63946;
```

### Budget-specific — dans `#budgetPage` de `css/pages/budget.css`

```css
--bgt-accent:      #6366F1;
--bgt-accent2:     #818CF8;
--bgt-green:       #10B981;
--bgt-red:         #EF4444;
--bgt-yellow:      #F59E0B;
--bgt-blue:        #3B82F6;
--bgt-purple:      #8B5CF6;
--bgt-cyan:        #06B6D4;
--bgt-orange:      #F97316;
--bgt-muted:       rgba(148, 163, 184, 0.6);

--bgt-salary-bg:   linear-gradient(135deg, #064E3B 0%, #065F46 100%);
--bgt-cash-bg:     linear-gradient(135deg, #1C1917 0%, #292524 100%);
--bgt-credit-bg:   linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);
--bgt-debt-bg:     linear-gradient(135deg, #450A0A 0%, #7F1D1D 100%);

--radius:    16px;
--radius-sm: 10px;
--radius-lg: 20px;
--radius-xl: 24px;
--radius-full: 9999px;

--shadow-sm:     0 1px 2px rgba(0,0,0,0.4);
--shadow-md:     0 4px 12px rgba(0,0,0,0.35);
--shadow-lg:     0 8px 24px rgba(0,0,0,0.45);
--shadow-xl:     0 16px 48px rgba(0,0,0,0.55);
--shadow-accent: 0 0 24px rgba(99,102,241,0.25);
```

### Light Theme

```css
html[data-theme="light"] {
  --bg:    #F8FAFC;
  --panel: #FFFFFF;
  --panel2:#F1F5F9;
  --text:  rgba(15, 23, 42, 0.95);
  --muted: rgba(71, 85, 105, 0.85);
  --border:rgba(15, 23, 42, 0.08);
}
```

---

## STEP 3 — REMPLACEMENT DES EMOJIS PAR DES ICÔNES SVG

**Problème actuel :** les emojis dans les category chips (Housing 🏠, Food 🍔, etc.) et les type buttons sont peu professionnels, mal alignés, et incohérents entre OS.

**Solution :** remplacer par des SVG inline via Lucide Icons (déjà disponible en CDN).

### Ajouter dans `budget.html` `<head>`

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
```

### Map des catégories → icônes Lucide

Dans `budget.js`, localise la constante ou la fonction qui génère les category chips (`.bg-cat-chip`) et remplace les emojis par des `<i data-lucide="..."></i>` :

```javascript
const CATEGORY_ICONS = {
  housing:       'home',
  food:          'utensils',
  transport:     'car',
  health:        'heart-pulse',
  fun:           'gamepad-2',
  subscriptions: 'repeat',
  shopping:      'shopping-bag',
  education:     'graduation-cap',
  savings:       'piggy-bank',
  other:         'more-horizontal'
};

// Après avoir injecté les chips dans le DOM, appelle :
lucide.createIcons();
```

### Map des account types → icônes

```javascript
const ACCOUNT_TYPE_ICONS = {
  salary: 'banknote',
  cash:   'wallet',
  credit: 'credit-card',
  debt:   'trending-down'
};
```

### CSS des icônes dans les chips

```css
#budgetPage .bg-cat-chip i[data-lucide],
#budgetPage .bg-type-btn i[data-lucide] {
  width: 18px;
  height: 18px;
  stroke-width: 1.75;
  display: block;
  flex-shrink: 0;
}

/* Taille icône dans les transaction entries */
#budgetPage .bg-entry-icon i[data-lucide] {
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
}
```

---

## STEP 4 — OVERLAYS : SHEETS ADAPTÉS DESKTOP ET MOBILE

**Problème actuel :** les sheets (Add Bill, Add Account) sont trop petites, mal centrées sur desktop, et pas adaptées mobile.

**Solution :** deux comportements selon la taille d'écran :
- **Mobile (< 768px)** → bottom sheet qui monte du bas, pleine largeur, max-height 92vh
- **Desktop (≥ 768px)** → modal centré, max-width 540px, animation scale-in depuis le centre

### Overlay backdrop

```css
#budgetPage .bg-overlay {
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.72);
  z-index: 10000;
  display: none;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
#budgetPage .bg-overlay.open {
  display: flex;
  opacity: 1;
  pointer-events: auto;
}

/* Desktop : centrer verticalement */
@media (min-width: 768px) {
  #budgetPage .bg-overlay {
    align-items: center;
  }
  #budgetPage .bg-overlay--flow {
    align-items: center;
  }
}
```

### Bottom sheet (mobile — expenses, notes)

```css
#budgetPage .bg-sheet {
  width: 100%;
  max-width: 540px;
  background: #0D1117;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
  max-height: min(92vh, calc(100dvh - 56px));
  padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  transform: translateY(100%);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
#budgetPage .bg-overlay.open .bg-sheet {
  transform: translateY(0);
}

/* Desktop : sheet devient modal centré */
@media (min-width: 768px) {
  #budgetPage .bg-sheet {
    border-radius: 20px;
    max-width: 540px;
    max-height: min(88vh, 720px);
    transform: scale(0.95) translateY(8px);
    opacity: 0;
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
  }
  #budgetPage .bg-overlay.open .bg-sheet {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}
```

### Flow overlay (Add Account / Add Bill) — modal centré

```css
#budgetPage .bg-overlay--flow {
  align-items: center;
  padding: 20px;
}

#budgetPage .bg-overlay--flow .bg-sheet--flow {
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  max-height: min(90vh, 700px);
  background: #0D1117;
  border: 1px solid rgba(255,255,255,0.09);
  box-shadow: 0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
  transform: scale(0.96) translateY(12px);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
  padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
}
#budgetPage .bg-overlay--flow.open .bg-sheet--flow {
  transform: scale(1) translateY(0);
  opacity: 1;
}

/* Mobile : flow devient aussi bottom sheet */
@media (max-width: 767px) {
  #budgetPage .bg-overlay--flow {
    align-items: flex-end;
    padding: 0;
  }
  #budgetPage .bg-overlay--flow .bg-sheet--flow {
    border-radius: 24px 24px 0 0;
    max-width: 100%;
    width: 100%;
    max-height: 92vh;
    transform: translateY(100%);
    opacity: 1;
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  #budgetPage .bg-overlay--flow.open .bg-sheet--flow {
    transform: translateY(0);
    opacity: 1;
  }
}
```

### Sheet header

```css
#budgetPage .bg-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  background: #0D1117;
  z-index: 1;
  gap: 12px;
}

/* Drag handle mobile */
#budgetPage .bg-sheet-head::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
}

@media (min-width: 768px) {
  #budgetPage .bg-sheet-head::before { display: none; }
  #budgetPage .bg-sheet-head { padding-top: 24px; }
}

#budgetPage .bg-sheet-title {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  flex: 1;
  text-align: center;
  letter-spacing: -0.01em;
}

#budgetPage .bg-sheet-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
#budgetPage .bg-sheet-close:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text);
}
```

### Sheet body et step indicator

```css
#budgetPage .bg-sheet-body {
  padding: 20px 24px 28px;
}

/* Step indicator "STEP 1 OF 2" — remplace le texte brut */
#budgetPage .bg-step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 24px 0;
}

#budgetPage .bg-step-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.15);
  transition: all 0.25s;
}
#budgetPage .bg-step-dot.active {
  width: 20px;
  background: var(--bgt-accent);
}
#budgetPage .bg-step-dot.done {
  background: var(--bgt-green);
}

/* Remplace le texte "STEP 1 OF 2" par des dots dans budget.js :
   Cherche l'élément qui affiche "STEP X OF Y" et remplace son innerHTML par les dots */
```

### Form fields

```css
#budgetPage .bg-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 18px;
}

#budgetPage .bg-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 6px;
}

#budgetPage .bg-input {
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 500;
  padding: 13px 16px;
  outline: none;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  width: 100%;
  box-sizing: border-box;
  -webkit-appearance: none;
}
#budgetPage .bg-input:focus {
  border-color: var(--bgt-accent);
  background: rgba(99,102,241,0.05);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
}
#budgetPage .bg-input::placeholder {
  color: rgba(148,163,184,0.35);
}

/* Amount input avec $ large */
#budgetPage .bg-amount-wrap {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 0 20px;
  gap: 8px;
  margin-bottom: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
#budgetPage .bg-amount-wrap:focus-within {
  border-color: var(--bgt-accent);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
}
#budgetPage .bg-currency-sym {
  font-size: 24px;
  font-weight: 700;
  color: var(--muted);
  font-family: var(--font-display);
  flex-shrink: 0;
}
#budgetPage .bg-amount-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 700;
  padding: 18px 0;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}
#budgetPage .bg-amount-input::placeholder { color: rgba(148,163,184,0.25); }
```

---

## STEP 5 — BUDGET PLANNER "PLAN" VIEW (REFONTE COMPLÈTE)

**Problème actuel :** la vue Plan affiche une liste dense de rangées catégorie + input texte "0" — c'est cramped, pas visuellement hiérarchisé, et peu engageant.

**Solution :** redesigner avec un layout card par catégorie, plus d'espace, slider ou input stylisé, et une barre de progression montrant l'allocation restante.

### Allocation bar en haut du Plan

```css
/* Barre globale d'allocation du revenu */
#budgetPage .bg-plan-alloc-bar {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#budgetPage .bg-plan-alloc-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#budgetPage .bg-plan-alloc-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
#budgetPage .bg-plan-alloc-value {
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
}
#budgetPage .bg-plan-alloc-track {
  height: 6px;
  background: rgba(255,255,255,0.07);
  border-radius: 999px;
  overflow: hidden;
}
#budgetPage .bg-plan-alloc-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--bgt-accent), var(--bgt-accent2));
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
#budgetPage .bg-plan-alloc-fill.over { background: var(--bgt-red); }
```

### Rangées catégories dans le planner

```css
/* Remplace le layout list cramped par des rangées plus aérées */
#budgetPage .bg-planner-row {
  display: grid;
  grid-template-columns: 40px 1fr auto 120px;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 8px;
  transition: background 0.15s, border-color 0.15s;
}
#budgetPage .bg-planner-row:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.09);
}

/* Icône catégorie */
#budgetPage .bg-planner-cat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(99,102,241,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bgt-accent2);
  flex-shrink: 0;
}
#budgetPage .bg-planner-cat-icon i[data-lucide] {
  width: 18px;
  height: 18px;
  stroke-width: 1.75;
}

/* Nom catégorie + sous-texte % d'allocation */
#budgetPage .bg-planner-cat-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}
#budgetPage .bg-planner-cat-pct {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

/* Barre de progression inline */
#budgetPage .bg-planner-bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
#budgetPage .bg-planner-bar-track {
  height: 4px;
  background: rgba(255,255,255,0.07);
  border-radius: 999px;
  overflow: hidden;
}
#budgetPage .bg-planner-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
#budgetPage .bg-planner-bar-fill.under { background: var(--bgt-green); }
#budgetPage .bg-planner-bar-fill.warn  { background: var(--bgt-yellow); }
#budgetPage .bg-planner-bar-fill.over  { background: var(--bgt-red); }

/* Input montant — stylisé, pas le champ texte brut */
#budgetPage .bg-planner-input-wrap {
  position: relative;
}
#budgetPage .bg-planner-input-wrap::before {
  content: "$";
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  pointer-events: none;
  font-family: var(--font-display);
}
#budgetPage .bg-planner-cat-input {
  width: 120px;
  background: rgba(255,255,255,0.05);
  border: 1.5px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: var(--text);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 9px 10px 9px 24px;
  outline: none;
  text-align: right;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  -moz-appearance: textfield;
  box-sizing: border-box;
}
#budgetPage .bg-planner-cat-input:focus {
  border-color: var(--bgt-accent);
  background: rgba(99,102,241,0.06);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
}
#budgetPage .bg-planner-cat-input::placeholder { color: rgba(148,163,184,0.3); }

/* Mobile : empiler icône+nom sur une ligne, input plein */
@media (max-width: 640px) {
  #budgetPage .bg-planner-row {
    grid-template-columns: 36px 1fr auto;
    grid-template-rows: auto auto;
  }
  #budgetPage .bg-planner-bar-wrap { grid-column: 1 / -1; }
  #budgetPage .bg-planner-cat-input { width: 100px; }
}

/* Bouton Save Plan — en bas de la section */
#budgetPage .bg-plan-save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: var(--bgt-accent);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  margin-top: 16px;
}
#budgetPage .bg-plan-save-btn:hover {
  background: var(--bgt-accent2);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99,102,241,0.45);
}
#budgetPage .bg-plan-save-btn:active { transform: scale(0.98); }
```

---

## STEP 6 — SPENDING ACTIVITY : REMPLACER LE CALENDRIER GITHUB

**Problème actuel :** le calendrier style GitHub (heatmap de carrés) ne fonctionne pas correctement, les labels de dates se chevauchent, et ça ne convient pas à une app budget.

**Solution :** remplacer par un bar chart SVG inline (barres verticales par semaine ou par jour) — plus lisible, plus pertinent pour visualiser les dépenses dans le temps.

### HTML à injecter dans la section Spending Activity

Dans `budget.js`, dans la fonction qui render le spending activity (cherche `SPENDING ACTIVITY` ou `activityGrid`), remplace la logique de génération de grille par :

```javascript
function renderSpendingActivity(data) {
  // data = array de { date: "2026-03-15", amount: 45.5 }
  // Groupe par semaine, calcule le max pour normaliser

  const container = document.getElementById('spendingActivityChart'); // cherche l'ID existant
  if (!container) return;

  const WEEKS = 12; // 12 semaines affichées
  const DAYS  = 7;
  
  // Calculer les semaines (du plus ancien au plus récent)
  const now = new Date();
  const weeklyTotals = [];
  
  for (let w = WEEKS - 1; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const total = data
      .filter(d => {
        const date = new Date(d.date);
        return date >= weekStart && date <= weekEnd;
      })
      .reduce((sum, d) => sum + d.amount, 0);
    
    const label = weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    weeklyTotals.push({ label, total });
  }
  
  const maxVal = Math.max(...weeklyTotals.map(w => w.total), 1);
  const BAR_H = 80; // hauteur max des barres en px
  
  container.innerHTML = weeklyTotals.map((week, i) => {
    const pct = week.total / maxVal;
    const h = Math.max(pct * BAR_H, 2);
    const isRecent = i === weeklyTotals.length - 1;
    return `
      <div class="bg-activity-col">
        <div class="bg-activity-tooltip">$${week.total.toFixed(0)}</div>
        <div class="bg-activity-bar ${isRecent ? 'current' : ''}"
             style="height: ${h}px; opacity: ${0.35 + pct * 0.65}"></div>
        <div class="bg-activity-label">${week.label}</div>
      </div>
    `;
  }).join('');
}
```

### CSS du bar chart

```css
/* Container de l'activité */
#budgetPage .bg-activity-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin-bottom: 16px;
}

#budgetPage .bg-activity-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 110px;        /* hauteur totale zone barres + labels */
  padding-top: 24px;    /* espace pour les tooltips */
  overflow-x: auto;
  scrollbar-width: none;
}
#budgetPage .bg-activity-chart::-webkit-scrollbar { display: none; }

#budgetPage .bg-activity-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 28px;
  position: relative;
  cursor: pointer;
}

#budgetPage .bg-activity-bar {
  width: 100%;
  max-width: 32px;
  background: var(--bgt-accent);
  border-radius: 6px 6px 2px 2px;
  transition: opacity 0.2s, transform 0.2s, background 0.2s;
  flex-shrink: 0;
}
#budgetPage .bg-activity-bar.current {
  background: var(--bgt-green);
}
#budgetPage .bg-activity-col:hover .bg-activity-bar {
  opacity: 1 !important;
  transform: scaleY(1.04);
  transform-origin: bottom;
}

#budgetPage .bg-activity-label {
  font-size: 10px;
  color: var(--muted);
  text-align: center;
  white-space: nowrap;
  font-weight: 500;
}

/* Tooltip au hover */
#budgetPage .bg-activity-tooltip {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  background: #1F2937;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
}
#budgetPage .bg-activity-col:hover .bg-activity-tooltip { opacity: 1; }

/* Si pas de données — empty state */
#budgetPage .bg-activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 90px;
  gap: 8px;
  color: var(--muted);
}
#budgetPage .bg-activity-empty i[data-lucide] { width: 28px; height: 28px; opacity: 0.4; }
#budgetPage .bg-activity-empty p {
  font-size: 13px;
  font-weight: 500;
  margin: 0;
}
```

---

## STEP 7 — CATEGORY CHIPS (grille catégories dans les sheets)

```css
#budgetPage .bg-cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

#budgetPage .bg-cat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 14px 8px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.08);
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.12s;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  letter-spacing: 0.01em;
}
#budgetPage .bg-cat-chip:hover {
  border-color: rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.07);
  color: var(--text);
}
#budgetPage .bg-cat-chip.active {
  background: rgba(99,102,241,0.12);
  border-color: rgba(99,102,241,0.45);
  color: #818CF8;
  transform: scale(1.03);
}
#budgetPage .bg-cat-chip i[data-lucide] {
  width: 20px;
  height: 20px;
  stroke-width: 1.75;
}

/* Mobile : 4 colonnes */
@media (max-width: 480px) {
  #budgetPage .bg-cat-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## STEP 8 — KPI CARDS

```css
#budgetPage .bg-kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

#budgetPage .bg-kpi {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}
#budgetPage .bg-kpi:hover {
  border-color: rgba(255,255,255,0.14);
  transform: translateY(-1px);
}

#budgetPage .bg-kpi--income::before,
#budgetPage .bg-kpi--spent::before,
#budgetPage .bg-kpi--remaining::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
}
#budgetPage .bg-kpi--income::before    { background: linear-gradient(90deg, var(--bgt-green), transparent); }
#budgetPage .bg-kpi--spent::before     { background: linear-gradient(90deg, var(--bgt-accent), transparent); }
#budgetPage .bg-kpi--remaining::before { background: linear-gradient(90deg, var(--bgt-blue), transparent); }

#budgetPage .bg-kpi-val {
  font-family: var(--font-display);
  font-size: clamp(20px, 3vw, 30px);
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin-bottom: 6px;
}
#budgetPage .bg-kpi-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
```

---

## STEP 9 — BOUTONS

```css
#budgetPage .bg-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 22px;
  background: var(--bgt-accent);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
#budgetPage .bg-btn-primary:hover {
  background: var(--bgt-accent2);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99,102,241,0.4);
}
#budgetPage .bg-btn-primary:active { transform: translateY(0); }

#budgetPage .bg-btn-ghost {
  width: 100%;
  padding: 11px;
  background: transparent;
  color: var(--muted);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  margin-top: 8px;
}
#budgetPage .bg-btn-ghost:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.16);
  color: var(--text);
}

#budgetPage .bg-btn-danger {
  width: 100%;
  padding: 11px;
  background: rgba(239,68,68,0.08);
  color: var(--bgt-red);
  border: 1.5px solid rgba(239,68,68,0.2);
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 8px;
}
#budgetPage .bg-btn-danger:hover { background: rgba(239,68,68,0.14); }

#budgetPage .bg-sheet-action {
  padding: 8px 18px;
  background: var(--bgt-accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s, transform 0.1s;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
#budgetPage .bg-sheet-action:hover  { background: var(--bgt-accent2); }
#budgetPage .bg-sheet-action:active { transform: scale(0.97); }
#budgetPage .bg-sheet-action:disabled { opacity: 0.4; cursor: default; box-shadow: none; }
```

---

## STEP 10 — FAB BUTTON

```css
#budgetPage .bg-fab-wrap {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

#budgetPage .bg-fab {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--bgt-accent);
  border: none;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.4);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s, background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
#budgetPage .bg-fab:hover {
  transform: scale(1.07);
  box-shadow: 0 6px 28px rgba(99,102,241,0.6);
  background: var(--bgt-accent2);
}
#budgetPage .bg-fab.open {
  transform: rotate(45deg);
  background: #374151;
}

#budgetPage .bg-fab-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(12px);
  transition: opacity 0.2s, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
#budgetPage .bg-fab-menu.open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

#budgetPage .bg-fab-sub {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px 0 12px;
  height: 44px;
  background: #111827;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  transition: background 0.15s, transform 0.15s;
  white-space: nowrap;
}
#budgetPage .bg-fab-sub:hover {
  background: #1f2937;
  transform: scale(1.03);
}
#budgetPage .bg-fab-sub-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(99,102,241,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bgt-accent2);
}
#budgetPage .bg-fab-sub-icon i[data-lucide] { width: 14px; height: 14px; stroke-width: 2; }
```

---

## STEP 11 — WIZARD ONBOARDING

```css
#budgetPage .bg-wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

#budgetPage .bg-wizard-card {
  background: #0D1117;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 24px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.8);
  overflow: hidden;
  position: relative;
}

#budgetPage .bg-wiz-progress-track {
  height: 3px;
  background: rgba(255,255,255,0.07);
  position: absolute;
  top: 0; left: 0; right: 0;
}
#budgetPage .bg-wiz-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--bgt-accent), var(--bgt-accent2));
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

#budgetPage .bg-wiz-stage {
  padding: 44px 32px 24px;
  min-height: 340px;
  display: flex;
  flex-direction: column;
}

#budgetPage .bg-wiz-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
#budgetPage .bg-wiz-subtitle {
  font-size: 15px;
  color: var(--muted);
  margin: 0 0 28px;
  line-height: 1.55;
}

#budgetPage .bg-wiz-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px 28px;
  border-top: 1px solid rgba(255,255,255,0.05);
  gap: 12px;
}

#budgetPage .bg-wiz-next {
  flex: 1;
  max-width: 200px;
  padding: 13px 24px;
  background: var(--bgt-accent);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 4px 16px rgba(99,102,241,0.4);
}
#budgetPage .bg-wiz-next:hover {
  background: var(--bgt-accent2);
  transform: translateY(-1px);
}

#budgetPage .bg-wiz-back {
  padding: 13px 20px;
  background: transparent;
  color: var(--muted);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
#budgetPage .bg-wiz-back:hover {
  color: var(--text);
  border-color: rgba(255,255,255,0.2);
}

#budgetPage .bg-wiz-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  border: 1.5px solid rgba(255,255,255,0.07);
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 8px;
  width: 100%;
  text-align: left;
}
#budgetPage .bg-wiz-option:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.14);
}
#budgetPage .bg-wiz-option.selected {
  background: rgba(99,102,241,0.1);
  border-color: rgba(99,102,241,0.4);
}
#budgetPage .bg-wiz-option-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(99,102,241,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bgt-accent2);
  flex-shrink: 0;
}
#budgetPage .bg-wiz-option-icon i[data-lucide] { width: 18px; height: 18px; stroke-width: 1.75; }
#budgetPage .bg-wiz-option-label { font-size: 14px; font-weight: 600; color: var(--text); }
#budgetPage .bg-wiz-option-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

@keyframes wizSlideIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes wizSlideOut {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-20px); }
}
#budgetPage .bg-wiz-slide          { animation: wizSlideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }
#budgetPage .bg-wiz-slide.leaving  { animation: wizSlideOut 0.2s ease-in both; }

/* Mobile wizard */
@media (max-width: 640px) {
  #budgetPage .bg-wizard-overlay { padding: 0; align-items: flex-end; }
  #budgetPage .bg-wizard-card {
    max-width: 100%;
    border-radius: 24px 24px 0 0;
    max-height: 95vh;
    overflow-y: auto;
  }
  #budgetPage .bg-wiz-stage { padding: 36px 20px 16px; min-height: 280px; }
  #budgetPage .bg-wiz-title { font-size: 22px; }
  #budgetPage .bg-wiz-nav   { padding: 12px 20px 28px; }
}
```

---

## STEP 12 — HEADER

```css
#budgetPage .bg-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 58px;
  background: rgba(7, 11, 20, 0.9);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

#budgetPage .bg-hdr-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
}

#budgetPage .bg-hdr-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
#budgetPage .bg-hdr-btn:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.08);
  color: var(--text);
}
```

---

## STEP 13 — SECTIONS CARDS, BILLS, ACCOUNTS, TRANSACTIONS

```css
/* Cards de section */
#budgetPage .bg-sec-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin-bottom: 14px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), var(--shadow-sm);
}

#budgetPage .bg-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
#budgetPage .bg-sec-title {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

/* Account cards */
#budgetPage .bg-account-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  min-width: 200px;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
#budgetPage .bg-account-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
#budgetPage .bg-acct-type--salary { background: var(--bgt-salary-bg); }
#budgetPage .bg-acct-type--cash   { background: var(--bgt-cash-bg);   }
#budgetPage .bg-acct-type--credit { background: var(--bgt-credit-bg); }
#budgetPage .bg-acct-type--debt   { background: var(--bgt-debt-bg);   }
#budgetPage .bg-acct-balance {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: #fff;
}

/* Bills */
#budgetPage .bg-bill-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  margin-bottom: 8px;
  transition: background 0.15s;
}
#budgetPage .bg-bill-card:hover { background: rgba(255,255,255,0.05); }
#budgetPage .bg-bill-card.paid {
  opacity: 0.6;
  border-color: rgba(16,185,129,0.2);
}

/* Transactions */
#budgetPage .bg-entry-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 16px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
#budgetPage .bg-entry-card:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.09);
}
#budgetPage .bg-entry-amount {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--bgt-red);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
```

---

## STEP 14 — RESPONSIVE COMPLET

### Mobile ≤ 640px

```css
@media (max-width: 640px) {
  #budgetPage .bg-main {
    padding: 14px 12px 100px;
  }

  #budgetPage .bg-kpi-row {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  #budgetPage .bg-kpi {
    padding: 12px 10px;
  }
  #budgetPage .bg-kpi-val {
    font-size: clamp(16px, 5vw, 22px);
  }
  #budgetPage .bg-kpi-label {
    font-size: 9px;
  }

  #budgetPage .bg-sec-card {
    padding: 16px;
  }

  #budgetPage .bg-fab-wrap {
    bottom: 20px;
    right: 14px;
  }
  #budgetPage .bg-fab {
    width: 52px;
    height: 52px;
    border-radius: 14px;
  }

  #budgetPage .bg-header {
    padding: 0 16px;
  }
}
```

### Desktop ≥ 1024px

```css
@media (min-width: 1024px) {
  #budgetPage .bg-main {
    padding: 32px 40px 120px;
    max-width: 960px;
  }

  #budgetPage .bg-kpi-row {
    gap: 16px;
  }
  #budgetPage .bg-kpi {
    padding: 24px;
  }

  /* Sur desktop, les overlays --flow sont toujours des modals centrés */
  #budgetPage .bg-overlay--flow {
    align-items: center;
    padding: 24px;
  }

  /* Planner : layout 2 colonnes sur grands écrans */
  #budgetPage .bg-planner-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  #budgetPage .bg-planner-grid .bg-planner-row {
    margin-bottom: 0;
  }
}
```

---

## STEP 15 — ANIMATIONS GLOBALES

```css
@keyframes hbitFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hbitScaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 0%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## STEP 16 — LIGHT THEME OVERRIDES

```css
html[data-theme="light"] #budgetPage .bg-sheet,
html[data-theme="light"] #budgetPage .bg-overlay--flow .bg-sheet--flow {
  background: #FFFFFF;
}
html[data-theme="light"] #budgetPage .bg-sheet-head { background: #FFFFFF; border-color: rgba(0,0,0,0.07); }
html[data-theme="light"] #budgetPage .bg-input { background: #F8FAFC; border-color: rgba(0,0,0,0.12); color: rgba(15,23,42,0.95); }
html[data-theme="light"] #budgetPage .bg-amount-wrap { background: #F8FAFC; border-color: rgba(0,0,0,0.12); }
html[data-theme="light"] #budgetPage .bg-cat-chip { background: #F1F5F9; border-color: rgba(0,0,0,0.1); color: rgba(71,85,105,0.9); }
html[data-theme="light"] #budgetPage .bg-cat-chip.active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); color: var(--bgt-accent); }
html[data-theme="light"] #budgetPage .bg-planner-row { background: #F8FAFC; border-color: rgba(0,0,0,0.07); }
html[data-theme="light"] #budgetPage .bg-planner-cat-input { background: #FFFFFF; border-color: rgba(0,0,0,0.12); color: rgba(15,23,42,0.95); }
html[data-theme="light"] #budgetPage .bg-entry-card { background: #FFFFFF; border-color: rgba(0,0,0,0.07); }
html[data-theme="light"] #budgetPage .bg-bill-card { background: #F8FAFC; border-color: rgba(0,0,0,0.07); }
html[data-theme="light"] #budgetPage .bg-wizard-card { background: #FFFFFF; }
html[data-theme="light"] #budgetPage .bg-wiz-option { background: #F8FAFC; border-color: rgba(0,0,0,0.08); }
html[data-theme="light"] #budgetPage .bg-activity-bar { background: var(--bgt-accent); }
html[data-theme="light"] #budgetPage .bg-activity-tooltip { background: #1F2937; }
```

---

## RÉSUMÉ DES FICHIERS À MODIFIER

| Fichier | Changements |
|---------|------------|
| `budget.html` `<head>` | Google Fonts → DM Sans + DM Mono ; ajouter Lucide CDN script |
| `css/core/tokens.css` | Nouvelles variables couleur, typo (DM Sans), spacing, radius, shadows |
| `css/pages/budget.css` | Réécriture complète des règles visuelles — garder TOUS les IDs et structures HTML |
| `js/pages/budget.js` | (1) Remplacer les emojis par `<i data-lucide="...">` dans les chips/options + appeler `lucide.createIcons()` ; (2) Remplacer le rendu du heatmap calendar par le bar chart `renderSpendingActivity()` ; (3) Textes du step indicator "STEP X OF Y" → dots |
| `css/core/nav.css` | Déjà modifié (transform:none sur body) — ne pas toucher |

**NE PAS TOUCHER :**
- Structure HTML des overlays, formulaires, IDs
- Logique Firestore dans budget.js
- `js/core/*.js`, `js/app.js`

---

## VÉRIFICATION FINALE

1. [ ] Budget page charge sans flash blanc ni écran noir
2. [ ] FAB → Add Expense → sheet monte, visible, bien dimensionné mobile ET desktop
3. [ ] FAB → Add Bill → modal centré desktop, bottom sheet mobile, taille correcte
4. [ ] Add Account → modal centré et visible, formulaire lisible
5. [ ] Fermer avec X → propre, overflow libéré
6. [ ] Budget Planner "Plan" → rangées avec icônes Lucide + input stylisé + barre progression
7. [ ] Spending Activity → bar chart weekly (pas la grille GitHub)
8. [ ] Category chips → icônes Lucide (pas d'emojis)
9. [ ] DM Sans chargée correctement (vérifier dans DevTools → Fonts)
10. [ ] Toggle dark/light → tout s'adapte proprement
11. [ ] Resize 375px (iPhone SE) → layout correct, rien ne déborde
12. [ ] Resize 1440px (desktop) → layout centré, modal centré, densité correcte
13. [ ] Console JS → aucune erreur
14. [ ] `lucide.createIcons()` appelé après chaque render des chips (pas seulement au load)
