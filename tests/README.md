# Tests automatiques — Petite Routine

Ces tests ouvrent l'app dans un vrai navigateur (Chromium, piloté par
Playwright), tapent dessus comme un enfant ou un parent, et vérifient le
résultat. Ils ne touchent jamais à la vraie base Supabase : la synchronisation
est testée avec un faux serveur et deux téléphones simulés.

## Lancer les tests

Depuis la racine du repo :

```bash
node tests/lancer-tout.js            # tout (environ 2 minutes)
node tests/lancer-tout.js synchro    # seulement les fichiers dont le nom contient « synchro »
```

Chaque vérification affiche ✔ ou ✘ ; le bilan final dit « Tout est vert » ou
liste les fichiers en échec (code de sortie 1).

**Dans une session cloud Claude Code** : rien à installer, Playwright et
Chromium y sont déjà.

**Sur le Mac**, la première fois :

```bash
cd tests
npm install
npx playwright install chromium
cd ..
```

## Ce qui est testé

| Fichier | Ce qu'il vérifie |
|---|---|
| `test-langues.js` | Aucun mot français sur l'app en anglais (tous les écrans) ; langue par défaut selon le téléphone ; une famille d'avant la V6.3 reste en français ; changer de langue traduit les étapes par défaut et laisse intactes celles écrites par le parent ; semaine d'école selon la langue ; drapeaux. |
| `test-synchro.js` | Deux parents : les étoiles reçues survivent à une relance hors ligne et ne sont jamais effacées du serveur ; rattrapage au réveil ; un tap pendant la relecture est gardé ; écho tardif sur réseau lent ; pastille, liste des enfants, renommage ; prénom refusé par la base. |
| `test-minuit.js` | App restée ouverte la nuit : le lendemain s'ouvre sur la bonne journée, le soir de la veille n'est pas recopié. |
| `test-espace-parents.js` | Avatar et « Enregistrer » ; croix de fermeture et en-tête collant ; corbeilles dans l'écran à 320, 375 et 390 px ; rappel calendrier après 23 h 45 ; version dans les sauvegardes ; police des cartes ; `VERSION` de `sw.js` alignée sur `VERSION_APP`. |

Ces tests ont été écrits pour les correctifs de l'audit V6.2. Lancés sur la
V6.3 d'avant les correctifs (`130b7af`), ils échouent sur chacun des bugs.

## Tester une autre copie de l'app

`PR_APP` désigne le dossier à tester à la place du repo. Pratique pour vérifier
qu'un nouveau test attrape bien le bug sur l'ancienne version :

```bash
git worktree add /tmp/ancienne 130b7af
PR_APP=/tmp/ancienne node tests/lancer-tout.js     # doit échouer
git worktree remove /tmp/ancienne
```

## Comparer les textes avec une autre version

`comparer-textes.js` relève tous les textes affichés, écran par écran, sur la
version actuelle et sur une autre copie, et liste les écarts. C'est ainsi qu'on
a prouvé que la version française n'avait pas bougé avec la V6.3. Ce n'est pas
un test : c'est à toi de juger si chaque écart est voulu.

```bash
git worktree add /tmp/ancienne main
node tests/comparer-textes.js /tmp/ancienne         # en français
node tests/comparer-textes.js /tmp/ancienne en-US   # en anglais
git worktree remove /tmp/ancienne
```

## Bon à savoir

- Le service worker est désactivé pendant les tests : sinon le cache d'un test
  déborderait sur le suivant. L'erreur « reading 'update' » qui en découle est
  propre au banc de test et filtrée.
- Les dates sont figées quand le résultat en dépend (le lundi 12 octobre 2026
  est un jour d'école).
- Le faux Supabase (`mock-supabase.js`) ne connaît que les requêtes de l'app.
  Une nouvelle requête vers Supabase devra y être ajoutée, sinon elle renvoie
  « requête non simulée ».
- Ajouter un test : copier la structure d'un fichier `test-*.js` (une
  `suite(…)`, des `verifier(nom, condition, détail)`). `lancer-tout.js` le
  trouve tout seul.
