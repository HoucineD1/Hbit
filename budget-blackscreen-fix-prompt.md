# Cursor Prompt — Budget Black Screen Fix

## Contexte
Dans `budget.html` et `budget.js`, quand l'utilisateur clique sur "Add expense", "Add bill", ou "Add account" (boutons FAB ou `btnAddAccount`), l'écran devient noir. Le modal/sheet s'ouvre mais la page derrière est noire ou inaccessible. Ce bug est causé par 3 problèmes combinés dans la logique des overlays.

---

## Fichiers à modifier
- `js/pages/budget.js`
- `budget.html` (section overlays uniquement)
- `css/pages/budget.css`

---

## Bug #1 — `closeOverlay()` ne cache pas correctement l'overlay (CRITIQUE)

**Problème :** `openOverlay()` set `el.style.display = "flex"` en inline, mais `closeOverlay()` remet `el.style.display = ""`. Cela efface le style inline et fait retomber l'élément sur la règle CSS `#budgetPage .bg-overlay { display: flex; }` — l'overlay reste donc affiché (`display: flex`) même après fermeture, il est juste `opacity: 0`. Si le navigateur a un rendu intermédiaire ou si `overflow:hidden` reste sur le body, la page semble bloquée/noire.

**Fix dans `budget.js` — remplace les deux fonctions :**

```js
function openOverlay(id) {
  const all = ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay", "goalOverlay", "goalDetailOverlay", "helpOverlay"];
  all.forEach((oid) => {
    if (oid !== id) {
      const o = $(oid);
      if (o && (o.classList.contains("open") || o.style.display === "flex")) {
        closeOverlay(oid);
      }
    }
  });
  const el = $(id);
  if (!el) return;
  el.style.display = "flex";          // Force display FIRST
  el.style.visibility = "visible";
  // Trigger reflow so the CSS transition plays
  void el.offsetWidth;
  el.setAttribute("aria-hidden", "false");
  el.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeOverlay(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
  el.style.visibility = "";
  // Wait for CSS transition to finish before hiding
  const onEnd = () => {
    if (!el.classList.contains("open")) {
      el.style.display = "none";      // ← KEY FIX: hide after transition
    }
    el.removeEventListener("transitionend", onEnd);
  };
  el.addEventListener("transitionend", onEnd, { once: true });
  // Fallback: force hide after 350ms if transitionend doesn't fire
  setTimeout(() => {
    if (!el.classList.contains("open")) {
      el.style.display = "none";
    }
  }, 360);
  // Only remove overflow:hidden if NO other overlay is open
  const anyOpen = ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay", "goalOverlay", "goalDetailOverlay", "helpOverlay"]
    .some(oid => oid !== id && $(oid)?.classList.contains("open"));
  if (!anyOpen) {
    document.body.style.overflow = "";
  }
}
```

---

## Bug #2 — Les overlays HTML n'ont pas `display:none` initial (CRITIQUE)

**Problème :** Dans `budget.html`, tous les overlays sont déclarés sans `style="display:none"`. Au chargement, le CSS les met à `display:flex` avec `opacity:0`. Si JS crash ou charge lentement, ils peuvent rester visibles comme un écran noir transparent.

**Fix dans `budget.html` — ajouter `style="display:none"` à chaque overlay :**

Trouve ces lignes et ajoute `style="display:none"` :

```html
<!-- AVANT -->
<div class="bg-overlay bg-overlay--flow" id="acctOverlay" aria-hidden="true">
<div class="bg-overlay" id="expOverlay" aria-hidden="true">
<div class="bg-overlay bg-overlay--flow" id="billOverlay" aria-hidden="true">
<div class="bg-overlay" id="limitOverlay" aria-hidden="true">
<div class="bg-overlay" id="goalOverlay" aria-hidden="true">
<div class="bg-overlay" id="goalDetailOverlay" aria-hidden="true">
<div class="bg-overlay" id="helpOverlay" aria-hidden="true">

<!-- APRÈS -->
<div class="bg-overlay bg-overlay--flow" id="acctOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="expOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay bg-overlay--flow" id="billOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="limitOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="goalOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="goalDetailOverlay" aria-hidden="true" style="display:none">
<div class="bg-overlay" id="helpOverlay" aria-hidden="true" style="display:none">
```

---

## Bug #3 — `document.body.style.overflow = "hidden"` pas toujours nettoyé (IMPORTANT)

**Problème :** Si une fonction comme `submitAccount()` ou `submitDeleteAccount()` throw une erreur, `overflow:hidden` reste sur le body. La page est alors bloquée — on ne peut plus scroller et le fond semble figé/noir.

**Fix dans `budget.js` — dans TOUTES les fonctions submit qui appellent `openOverlay` ou `closeOverlay`, s'assurer que `overflow` est reset dans le `finally` :**

Cherche toutes les fonctions `submitAccount`, `submitDeleteAccount`, `submitExpense`, `submitDeleteExpense`, `submitBill`, `submitDeleteBill`, et ajoute cette ligne dans chaque bloc `finally` si elle n'y est pas :

```js
} finally {
  // Assure que le scroll est toujours restauré si l'overlay s'est fermé
  const anyOpen = ["acctOverlay", "expOverlay", "billOverlay", "limitOverlay", "goalOverlay", "goalDetailOverlay", "helpOverlay"]
    .some(id => $(id)?.classList.contains("open"));
  if (!anyOpen) document.body.style.overflow = "";

  setBusy("acctSave", false, t("budget.sheet.save")); // (garder la ligne existante)
}
```

---

## Bug #4 — CSS `.bg-overlay` a `display:flex` par défaut — le changer en `display:none` (OPTIONNEL mais propre)

**Dans `css/pages/budget.css`**, change la règle de base de `.bg-overlay` pour utiliser `display:none` par défaut au lieu de `opacity:0` + `pointer-events:none`. Cela évite tout risque de fuite visuelle.

```css
/* AVANT */
#budgetPage .bg-overlay {
  position: fixed;
  inset: 0;
  ...
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity .25s;
  ...
}

#budgetPage .bg-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

/* APRÈS */
#budgetPage .bg-overlay {
  position: fixed;
  inset: 0;
  ...
  display: none;            /* ← caché par défaut */
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity .25s;
  ...
}

#budgetPage .bg-overlay.open {
  display: flex;            /* ← montré via JS + classe */
  opacity: 1;
  pointer-events: auto;
}
```

**Note :** Si tu fais ce changement CSS (Bug #4), tu peux simplifier `openOverlay()` et retirer le `setTimeout` dans `closeOverlay()` car `display:none` sera géré par la classe CSS directement via `classList.remove("open")`. Dans ce cas, `openOverlay` doit set `display:flex` AVANT d'ajouter `.open` pour que la transition joue (comme dans le fix Bug #1 ci-dessus).

---

## Résumé des changements

| Fichier | Changement |
|---------|-----------|
| `budget.js` | Remplacer `openOverlay()` et `closeOverlay()` complets |
| `budget.js` | Ajouter cleanup `overflow` dans tous les blocs `finally` |
| `budget.html` | Ajouter `style="display:none"` aux 7 overlays |
| `budget.css` | (optionnel) Changer `.bg-overlay` de `display:flex/opacity:0` à `display:none` |

---

## Test après fix

1. Ouvrir budget.html connecté
2. Cliquer le bouton FAB `+` → cliquer "Add expense" → le sheet expense doit s'ouvrir proprement
3. Fermer avec le X → la page doit reprendre normalement, pas d'écran noir
4. Cliquer "Add bill" → même test
5. Cliquer "Add account" → même test
6. Tester sur mobile (viewport < 768px) — le sheet doit glisser du bas
7. Forcer une erreur Firestore (déconnecter WiFi) → fermer le sheet → vérifier que `document.body.style.overflow` est vide (via DevTools console : `document.body.style.overflow`)
