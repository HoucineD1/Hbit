# Prompt Claude Code — Fix Budget Page: Black Screen + UI Issues

## Contexte

L'app Hbit est une app vanilla JS + Firebase. La page `budget.html` a deux bugs visuels sérieux :

1. **Écran noir** quand on clique "Add Income" (Add Account) ou "Add Bills" — l'overlay s'ouvre mais la page derrière devient noire
2. **UI non-premium** — les sheets (panneaux) qui s'ouvrent ont un rendu cassé ou désaligné

---

## Architecture de la page

```
budget.html
├── css/core/tokens.css     → variables CSS (--bg, --panel, etc.)
├── css/core/nav.css        → sidebar fixe desktop (256px), drawer mobile
├── css/pages/budget.css    → tous les styles budget
├── js/core/nav.js          → sidebar controller
└── js/pages/budget.js      → toute la logique budget (overlays, sheets, etc.)
```

**Sur desktop (≥768px)** : la sidebar est fixe à gauche, 256px de large, fond `rgba(9,11,17,0.98)` (quasi noir). Le body a `padding-left: 256px`. C'est NORMAL — c'est le design.

---

## Bug #1 — Écran noir quand on ouvre un overlay (CRITIQUE)

### Symptôme (screenshots fournis)

- Screenshot 1 : état normal de la page — sidebar noire à gauche (normal), contenu centré
- Screenshot 2 : après interaction — la page a un overlay semi-transparent qui couvre tout, MAIS le sheet (panneau du bas) n'est pas visible ou mal positionné

### Cause racine identifiée

**Dans `css/pages/budget.css`**, les overlays utilisent maintenant `visibility:hidden` + `opacity:0` (après une tentative de fix précédente). Le problème est que quand `.open` est ajouté, la transition `opacity` joue mais le `.bg-sheet` à l'intérieur reste en `transform: translateY(100%)` hors écran — la feuille ne slide pas dans le viewport.

**Raison** : La transition du `.bg-sheet` est déclenchée par `.bg-overlay.open .bg-sheet`, ce qui dépend que `.bg-overlay` soit dans le DOM avec `display:flex`. Avec `visibility:hidden`, le layout existe mais le navigateur peut ne pas déclencher le reflow correctement.

**Deuxième problème** : Dans `openOverlay()` (budget.js ~ligne 1816), la fonction appelle `el.style.removeProperty("display")` et `el.style.removeProperty("visibility")`. Si l'overlay avait été marqué `visibility:hidden` inline par une opération précédente, ce removeProperty est nécessaire — mais si le CSS computed value de l'élément est déjà `visibility:hidden` via la classe CSS (sans inline style), le removeProperty ne fait rien. Le `void el.offsetWidth` pour forcer le reflow ne suffit pas toujours.

### Fix à appliquer

#### A. Dans `css/pages/budget.css` — Remettre le système display:none/flex propre

Trouve la règle `.bg-overlay` et `.bg-overlay.open` et remplace par :

```css
#budgetPage .bg-overlay {
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: rgba(0,0,0,.55);
  z-index: 10000;
  display: none;                    /* ← caché par défaut */
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity .25s;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
#budgetPage .bg-overlay.open {
  display: flex;                    /* ← montré quand ouvert */
  opacity: 1;
  pointer-events: auto;
}
```

**Pourquoi** : `display:none` est géré par JS (openOverlay set `display:flex` avant d'ajouter `.open`), et `.open` ne change plus `display`. La transition `opacity` joue parce que JS force le reflow entre `display:flex` et l'ajout de `.open`.

#### B. Dans `js/pages/budget.js` — Corriger `openOverlay()` et `closeOverlay()`

Trouve les deux fonctions et remplace-les par :

```javascript
function openOverlay(id) {
  BUDGET_OVERLAY_IDS.forEach((oid) => {
    if (oid !== id) {
      const o = $(oid);
      if (o && o.classList.contains("open")) {
        closeOverlay(oid);
      }
    }
  });
  const el = $(id);
  if (!el) return;
  el.style.display = "flex";          // 1. Force display:flex (sinon la transition ne peut pas jouer)
  el.style.removeProperty("visibility");
  void el.offsetWidth;                // 2. Force reflow — maintenant la transition opacity peut interpoler
  el.setAttribute("aria-hidden", "false");
  el.classList.add("open");           // 3. Déclenche la transition CSS opacity 0→1
  document.body.style.overflow = "hidden";
}

function closeOverlay(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("open");        // Déclenche transition opacity 1→0
  el.setAttribute("aria-hidden", "true");
  el.style.removeProperty("visibility");
  // Attendre la fin de la transition avant de cacher
  const onEnd = (e) => {
    if (e.target !== el) return;
    if (!el.classList.contains("open")) {
      el.style.display = "none";
    }
    el.removeEventListener("transitionend", onEnd);
  };
  el.addEventListener("transitionend", onEnd);
  // Fallback si transitionend ne se déclenche pas (ex: overlay déjà invisible)
  setTimeout(() => {
    if (!el.classList.contains("open")) {
      el.style.display = "none";
    }
    el.removeEventListener("transitionend", onEnd);
  }, 350);
  clearBodyScrollUnlessOverlayOpen();
}
```

#### C. Dans `budget.html` — S'assurer que TOUS les overlays ont `style="display:none"` initial

Vérifie ces 7 lignes et ajoute `style="display:none"` à celles qui en manquent :

```html
<!-- Ces 7 overlays doivent TOUS avoir style="display:none" -->
<div class="bg-overlay bg-overlay--flow" id="acctOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="expOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay bg-overlay--flow" id="billOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="limitOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="goalOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="goalDetailOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="helpOverlay" aria-hidden="true" style="display:none">
```

---

## Bug #2 — UI non-premium des sheets (IMPORTANT)

### Symptôme

Les panneaux Add Income / Add Bills ont un rendu qui semble "cassé" ou peu soigné — boutons mal alignés, spacing incorrect, ou le sheet ne couvre pas bien.

### Cause identifiée

Le `.bg-sheet--flow` (utilisé pour Add Account et Add Bill) est un panneau **centré** (pas un bottom sheet) grâce à `.bg-overlay--flow`. Mais sur mobile, ce centrage peut échouer si le viewport est petit ou si le `max-height` est trop grand.

De plus, le `.bg-sheet` (bottom sheet standard, pour Add Expense) utilise `transform: translateY(100%)` comme état initial. Si la transition ne joue pas correctement (à cause du bug display), le sheet peut apparaître déjà en position finale sans animation, ou hors écran.

### Fix à appliquer

#### A. Dans `css/pages/budget.css` — Améliorer le `.bg-overlay--flow` sur mobile

Trouve `.bg-overlay--flow` et assure-toi qu'il a un bon padding sur mobile :

```css
#budgetPage .bg-overlay--flow {
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top, 12px)) 16px
           max(16px, env(safe-area-inset-bottom, 12px)) 16px;
}
```

#### B. Dans `css/pages/budget.css` — S'assurer que `.bg-sheet--flow` a une bonne taille minimum

```css
#budgetPage .bg-overlay--flow .bg-sheet--flow {
  /* ... garder les règles existantes ... */
  min-height: 320px;   /* ← ajouter cette ligne pour éviter les sheets trop petits */
}
```

---

## Bug #3 — `body.style.overflow = "hidden"` peut rester bloqué (IMPORTANT)

### Cause

Si une erreur Firestore survient dans `submitAccount()` ou autres, le `finally` ne restore pas toujours `overflow`. Résultat : la page est figée, impossible de scroller.

### Fix dans `js/pages/budget.js`

Dans la fonction `submitAccount()`, le bloc `finally` est :
```javascript
} finally {
  setBusy("acctSave", false, t("budget.sheet.save"));
}
```

Il manque `clearBodyScrollUnlessOverlayOpen()`. Remplace par :
```javascript
} finally {
  clearBodyScrollUnlessOverlayOpen();
  setBusy("acctSave", false, t("budget.sheet.save"));
}
```

Vérifie que TOUTES ces fonctions ont `clearBodyScrollUnlessOverlayOpen()` dans leur `finally` :
- `submitAccount()` ← manquant
- `submitDeleteAccount()` ← déjà présent
- `submitExpense()` ← déjà présent
- `submitDeleteExpense()` ← déjà présent
- `submitBill()` ← déjà présent
- `submitDeleteBill()` ← déjà présent

---

## Tests à effectuer après les fixes

1. **Ouvrir budget.html connecté**
2. **Cliquer le bouton FAB `+`** → "Add expense" → le sheet doit glisser du bas proprement
3. **Fermer avec X** → la page doit reprendre normalement, pas d'écran noir
4. **Cliquer "Add account"** (bouton dans la section Accounts OU dans le setup checklist) → le panneau centré doit apparaître
5. **Fermer avec X** → retour normal
6. **Cliquer "Add bill"** → même test
7. **Sur mobile** (resize à <768px) → vérifier que les sheets glissent du bas
8. **Vérifier dans la console** : après fermeture, `document.body.style.overflow` doit être vide (taper dans DevTools)
9. **Simuler erreur** : déconnecter WiFi et essayer de sauvegarder → vérifier que la page reste scrollable après l'erreur

---

## Résumé des fichiers à modifier

| Fichier | Section | Changement |
|---------|---------|-----------|
| `css/pages/budget.css` | `.bg-overlay` + `.bg-overlay.open` | Remettre `display:none` → `display:flex` pattern |
| `css/pages/budget.css` | `.bg-overlay--flow` | Améliorer padding mobile |
| `css/pages/budget.css` | `.bg-overlay--flow .bg-sheet--flow` | Ajouter `min-height: 320px` |
| `js/pages/budget.js` | `openOverlay()` | Restaurer le pattern `display:flex` + `void offsetWidth` + `.open` |
| `js/pages/budget.js` | `closeOverlay()` | Utiliser `transitionend` + fallback `setTimeout` pour `display:none` |
| `js/pages/budget.js` | `submitAccount()` finally | Ajouter `clearBodyScrollUnlessOverlayOpen()` |
| `budget.html` | 7 overlays | Ajouter `style="display:none"` aux overlays qui en manquent (`billOverlay`, `goalOverlay`) |
