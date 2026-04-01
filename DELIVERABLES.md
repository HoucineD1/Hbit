# Hbit — Livrables (phases 0–7)

## 1. Liste des fichiers modifiés

| Fichier | Modifications |
|---------|----------------|
| `js/core/dashboardData.js` | **Nouveau** — Module unique qui récupère tout le "last data" Firestore (Budget, Habits, Sleep, State of Mind) pour HOME/OVERVIEW. |
| `js/core/db.js` | Ajout du champ `focus` (1–10) dans `moodLogs.set()`. |
| `js/core/nav.js` | Fermeture du drawer au ESC uniquement si `body.nav-open`. |
| `js/pages/home.js` | `renderFromDashboard(data)` (source unique), appel à `HBIT.dashboardData.fetch(uid)` quand disponible, affichage des suggestions Pomodoro/Méditation selon stress/focus. |
| `js/pages/habits.js` | `nameNormalized` dans le payload de création, bouton "Start now" + statut `start`, log "start" → "Mark done" sans incrément jusqu’à "done", détail modal gère Start now / Mark done. |
| `js/pages/mood.js` | Sync Firestore : envoi de `focus` dans `moodLogs.set()`. |
| `home.html` | Script `dashboardData.js`, carte State of Mind en wrapper + bloc `#moodSuggestions` (Pomodoro, Méditation). |
| `css/core/nav.css` | Breakpoint 768px (au lieu de 640px), `body.nav-open { overflow: hidden }`, Monthly Overview en pleine largeur. |
| `css/pages/budget.css` | Row 1 pleine largeur : top-row + summary + breakdown (Monthly Overview). |
| `css/pages/habits.css` | Classes `.hb-status--start`, `.hb-act-btn--start`, `.hb-act-btn.primary`. |
| `css/pages/home.css` | Styles `.hc-card--mood-wrap`, `.hc-card--link`, `.hc-mood-suggestions`, `.hc-mood-sugg-btn`. |
| `sleep.html` | Ordre des onglets : Plan, Log Past Sleep, History ; libellé "Log Past Sleep". |

---

## 2. Résumé des changements par module

- **Phase 0** — Audit + `dashboardData.js` : une seule source pour alimenter HOME/OVERVIEW (Budget, Habits, Sleep, Mind + weekly).
- **Phase 1** — Sidebar mobile : breakpoint 768px, drawer caché par défaut, overlay, overflow hidden quand ouvert, fermeture au clic overlay / lien / ESC.
- **Phase 2** — HOME/OVERVIEW : lecture Firestore via `dashboardData.fetch(uid)` et rendu avec `renderFromDashboard()` ; états vides conservés ("No entries yet" + CTA).
- **Phase 3** — Habits : `nameNormalized` + détection doublon → ouverture en édition ; "Start now" (log `start`), "Mark done" / "Skip", Pause/Resume/Archive inchangés.
- **Phase 4** — Budget : layout desktop avec Monthly Overview (summary + breakdown) en pleine largeur, puis 2 colonnes (chart | accounts + transactions).
- **Phase 5** — Sleep : onglets Plan (défaut), Log Past Sleep, History ; libellé "Log Past Sleep".
- **Phase 6** — State of Mind : `focus` en Firestore ; sync mood avec `focus` ; sur HOME, suggestions Pomodoro / Méditation si stress ≥ 7 ou focus ≤ 3 (scale 1–10).

---

## 3. Étapes de test

1. **Sidebar mobile (< 768px)**  
   - Ouvrir une page (ex. home).  
   - Vérifier que le menu est caché et qu’un bouton ☰ apparaît.  
   - Clic ☰ → drawer s’ouvre, overlay visible.  
   - Clic overlay ou lien ou ESC → drawer se ferme, `body` n’a plus `nav-open`, scroll débloqué.

2. **HOME / Overview — données Firestore**  
   - Se connecter, avoir des données en Firestore (habits, budget, sleep, mood).  
   - Aller sur Home : les cartes doivent afficher les vraies valeurs (habits done/total, budget restant, dernier sommeil, dernier mood).  
   - Vider une collection : la carte doit afficher un état vide type "No … yet" + CTA, pas de données fantômes.

3. **Habits**  
   - Créer une habitude avec un nom déjà existant (même nom normalisé) → message + ouverture en édition.  
   - Sur une habitude sans log aujourd’hui : "Start now" → log `start` ; puis "Mark done" → log `done` et incrément de `doneDays`.  
   - Pause / Resume / Archive depuis le détail : comportement inchangé.

4. **Budget desktop**  
   - Écran ≥ 960px : en haut, une ligne pleine largeur (date, summary, breakdown "Money overview").  
   - En dessous, 2 colonnes : chart à gauche ; accounts + transactions à droite.  
   - Mobile : une seule colonne.

5. **Sleep**  
   - Onglet par défaut = "Plan".  
   - Second onglet = "Log Past Sleep", troisième = "History".  
   - Plan → "Log it" ouvre le log avec heures pré-remplies ; après enregistrement, dernier sommeil visible sur Home.

6. **State of Mind**  
   - Sur la page Mood : sauvegarder avec focus renseigné → vérifier en Firestore que le doc du jour a `focus`.  
   - Sur Home : si dernier mood a stress ≥ 7 ou focus ≤ 3, la zone "Suggestions" avec Pomodoro et Méditation (liens vers focus.html) doit s’afficher sous la carte State of Mind.

---

## 4. Notes techniques

- **Firestore** : tout reste sous `/users/{uid}/...` (habits, habitLogs, budgetEntries, budgetGoals, budgetMonths, budgetAccounts, sleepLogs, sleepPlans, moodLogs).  
- **dashboardData.js** : à charger après `db.js` (dépend de `HBIT.db` et `HBIT.fbFirestore`).  
- **Habits** : les logs "start" n’incrémentent pas `doneDays` ; seul le passage à "done" (depuis "start" ou rien) l’incrémente.
