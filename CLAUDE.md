# Petite Routine — guide pour Claude

> **Repo public.** Ce fichier est lisible par tout le monde : jamais de code
> famille, de mot de passe, de clé secrète ni de donnée personnelle ici.
> (La clé Supabase *anon* est publique par conception, la protection vient de
> la RLS.)

## LE PROJET

PWA pour les routines des jeunes enfants : routines du matin, de l'après-midi
et du soir, des étoiles à gagner, une roue des activités et une tirelire pour
échanger les étoiles contre des cadeaux. Les données d'un enfant sont
synchronisées entre les téléphones des parents par un **code famille**
(`PR-XXXX`).

- **En ligne** : GitHub Pages, branche `main` → https://sxbconsulting.github.io/petite-routine/
- **Installée** comme une app sur iPhone (Safari → Partager → Sur l'écran
  d'accueil), en plein écran.
- **Langues** : français et anglais (V6.3).

## LES FICHIERS

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'app : HTML, CSS et JS dans un seul fichier, sans build |
| `sw.js` | Service worker : ouverture hors ligne, `index.html` servi réseau d'abord |
| `manifest.json` | Manifeste PWA (en français, un seul par site) |
| `icon-*.png`, `apple-touch-icon.png`, `favicon.png` | Icônes |
| `.github/workflows/keep-alive.yml` | Cron qui empêche Supabase de se mettre en veille |
| `tests/` | Tests automatiques (voir plus bas) |

**Supabase** : tables `pr_families` (code) et `pr_children` (nom + colonne
`data` en jsonb : config, étoiles, tirelire, 14 derniers jours). Projet
`xkdymodyzktowuixpbzo`.

## LES RÈGLES DE TRAVAIL

- **Ne pas toucher à la direction artistique** sans demande explicite :
  polices Fredoka (titres, boutons) et Nunito (libellés), palette `--ink`
  `#3a2e52`, `--gold` `#ffb830`, `--mint` `#4ecb8f`, ciels qui changent selon
  le moment de la journée, emoji partout. L'app s'adresse à des enfants qui ne
  lisent pas encore : l'emoji porte le sens.
- **Un audit livre un rapport, pas des corrections.** Le propriétaire du
  projet tranche, puis on corrige. Format du rapport : fond blanc, texte noir,
  gravité distinguée par la forme (◆ ▲ ● ○), jamais par la couleur.
- **Vérifier plutôt que supposer** : reproduire un bug dans le navigateur
  avant de l'affirmer, et dire clairement ce qui est reproduit et ce qui est
  seulement lu dans le code.
- **Mise en ligne seulement sur feu vert explicite.** Travailler sur une
  branche, la pousser, puis fusionner dans `main` quand c'est demandé.
- Commentaires du code en français, qui expliquent le *pourquoi* (surtout
  l'historique d'un bug corrigé : « AUDIT V6.2 #1 — … »).

## ÉTAT D'AVANCEMENT

**En production : V6.3.2.** Tous les points de l'audit V6.2 sont corrigés.

| Version | Commit | Contenu |
|---|---|---|
| Tâche 0 | — | Vérification production, PWA plein écran sur iPhone |
| Cron | `b691912` | Réveil Supabase lundi et jeudi |
| Tâche 1 | `26709a6` | Audit index.html, 8 points corrigés |
| Tâche 2 | `8326c47` `4cafc03` | Service worker, hors ligne |
| Tâche 3 | `2105380` | Sauvegarde de secours, export / import JSON |
| Avatar | `71bb4b2` → `e2446ee` | Avatar en deux temps (genre, puis carnation) |
| V6.2 | `23a14a6` | Profils école / maison, semaine type, mode vacances |
| V6.3 | `a38ebcf` `130b7af` | Version anglaise |
| V6.3.1 | `e4c151f` | Synchro fiable, passage de minuit, drapeaux 🇫🇷 / 🇬🇧 |
| V6.3.2 | `7ac4c6c` | Fin de l'audit V6.2, croix pour fermer l'espace parents |
| Tests | `1346e9f` | Dossier `tests/` : 57 vérifications automatiques |
| CLAUDE.md | `f02ade1` | Ce fichier, versionné dans le repo |

Dernière vérification : 11/10/2026, 57 / 57 tests au vert sur `main`
(`f02ade1`). Aucune tâche en cours.

## LANGUES — FRANÇAIS ET ANGLAIS (V6.3)

- **`T`** : le dictionnaire, `T.fr` et `T.en`. Une valeur est un texte ou une
  fonction qui reçoit des paramètres : `p => "Bonjour"+nomFr(p)+" !"`.
- **`t(cle, params)`** : texte dans la langue active ; une clé absente en
  anglais retombe sur le français, puis sur la clé.
- **HTML fixe** : `data-i18n` (texte), `data-i18n-ph` (placeholder),
  `data-i18n-title`, `data-i18n-aria`, remplis par `appliquerTextes()`.
- **`CONTENU_DEFAUT`** : routines, roue et cadeaux d'une nouvelle famille,
  dans les deux langues, **aux mêmes positions** (c'est ce qui permet à
  `traduireContenuParDefaut()` de traduire). Ne jamais en ajouter ou en
  retirer d'un seul côté.
- **`WEEKMAP_PAR_LANGUE`** : en français pas d'école le mercredi, en anglais
  du lundi au vendredi. Nouvelles familles seulement.
- **La langue est un réglage du téléphone** (`pr_lang`), jamais synchronisé.
  Première ouverture : langue du téléphone (tout ce qui n'est pas du français
  passe en anglais). Une famille d'avant la V6.3 reste en français.
- **Changer de langue** traduit les étapes restées par défaut ; elles sont
  synchronisées, donc l'autre parent les voit traduites aussi. Ce que le
  parent a écrit n'est jamais touché.
- « Petite Routine » ne se traduit pas.

## SYNCHRONISATION

- **`enregistrerLocalement()`** : tout ce qu'`hydrate()` reçoit du serveur est
  aussi écrit sur le téléphone, avec les fonctions d'origine `_save*` (qui ne
  renvoient rien au serveur).
- **`modifsNonEnvoyees`** : modifications locales pas encore confirmées par le
  serveur. Tant qu'il y en a, on ne relit pas le serveur.
- **`rattraperServeur()`** : au retour sur l'app (`visibilitychange`,
  `pageshow`) et au retour du réseau (`online`). Envoie d'abord les
  modifications locales, sinon relit le serveur. Rien pendant que l'espace
  parents est ouvert.
- **`pullChild(true)`** : jette la réponse si un tap a eu lieu pendant la
  requête.
- **`revsEnvoyees`** : l'anti-écho reconnaît les 10 derniers envois.
- **`majEnfant()`** : le prénom part avec chaque envoi dans la colonne `name` ;
  si la base le refuse, le reste est renvoyé sans lui.
- **Limite connue** : si les deux parents modifient pendant que l'un est hors
  ligne, le dernier téléphone à synchroniser gagne.

## PASSAGE DE MINUIT

`verifierChangementDeJour()` compare `todayKey()` à `jourCharge` au retour sur
l'app, toutes les 30 s et au premier tap. Si la date a changé : la journée du
jour est rechargée, sur l'onglet de l'heure, et le tap déclencheur ne coche
rien.

## PIÈGES

- **Tout nouveau texte va dans `T.fr` ET `T.en`.** Jamais de texte en dur.
- **Ne jamais nommer une variable `t`** dans une fonction qui appelle `t()` :
  elle masque la fonction.
- **Zone morte temporelle** : `syncInfo`, `LANG`, `T`, `CONTENU_DEFAUT`,
  `WEEKMAP_PAR_LANGUE`, `PROFILS` et `PROFIL_META` doivent rester AVANT le
  premier appel à `loadConfig()`.
- **Deux numéros de version alignés** : `VERSION` dans `sw.js` et
  `VERSION_APP` dans `index.html` (vérifié par les tests). Les incrémenter à
  chaque mise en ligne.
- **Ne jamais appeler `hydrate()` sans enregistrer localement**, ni relire le
  serveur quand `modifsNonEnvoyees > 0`.
- **Profil figé** : chaque journée garde son profil (`_p`) ; les routines
  affichées viennent de `routinesDe(jour)`, jamais de `profileFor()`
  recalculé, sinon l'historique se réécrit.
- **Boutons** : `button{font-family:inherit}` en tête du CSS, sinon police du
  système.
- **Champ texte dans une ligne flex** : `min-width:0`, sinon il pousse les
  boutons voisins hors de l'écran.
- **Espace parents** : en-tête collant `.sheet-head` (titre + croix
  `fermerEspaceParents()`). Une croix flottant seule tombait sur les
  corbeilles.
- **Le cron se désactive après 60 jours sans commit** (GitHub envoie un mail
  de réactivation). Dernier commit au 11/10/2026 : échéance vers le
  **10 décembre 2026**, repoussée par chaque nouveau commit. Un ping ne réveille pas un projet déjà en pause : il faut
  « Restore project » dans le tableau de bord Supabase.
- **Le code famille est la seule clé de récupération** des données
  synchronisées, avec la sauvegarde JSON de l'espace parents.

## TESTS AUTOMATIQUES

Dossier `tests/`. L'app est ouverte dans Chromium (Playwright), les tests
tapent dessus et vérifient le résultat. **La vraie base Supabase n'est jamais
touchée** : la synchro est testée avec un faux serveur et deux téléphones
simulés.

```bash
node tests/lancer-tout.js            # tout, environ 2 minutes
node tests/lancer-tout.js synchro    # un seul fichier
```

- Session cloud Claude Code : rien à installer. Mac, la première fois :
  `cd tests && npm install && npx playwright install chromium`.
- **Avant chaque mise en ligne : tout doit être vert** (57 / 57 au
  11/10/2026).
- Une correction de bug s'accompagne d'un test qui échoue sur l'ancienne
  version et passe sur la nouvelle : `PR_APP=<dossier> node tests/lancer-tout.js`
  teste une autre copie de l'app.
- `node tests/comparer-textes.js <dossier> [locale]` liste les textes qui
  changent entre deux versions, écran par écran.
- Nouvelle requête Supabase dans l'app : l'ajouter au faux serveur
  (`tests/outils.js`, fonction `famille`).
- Ne jamais tester un texte qui dépend de l'heure sans figer l'horloge.
- Détails : `tests/README.md`.

## COMMENT ON DÉPLOIE

1. Travailler sur une branche, la pousser.
2. Lancer `node tests/lancer-tout.js` : tout doit être vert.
3. Sur feu vert : fusion en avance rapide dans `main`, push.
4. Suivre le déploiement : `gh run watch` sur le workflow
   `pages-build-deployment`, et vérifier qu'il porte le bon commit.
5. Vérification finale sur l'iPhone : la nouvelle version arrive à la
   prochaine ouverture avec du réseau (`index.html` est servi réseau d'abord).

**Depuis une session cloud Claude Code** : le container démarre vide, il faut
cloner le repo. Le réseau bloque `github.io` et `supabase.co`, donc on ne peut
ni ouvrir le site en ligne ni interroger Supabase depuis la session. Clone
partiel : si Git signale une branche « sans branche distante » alors qu'elle
est poussée, lancer
`git config --add remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"`
puis `git fetch`.

## CE FICHIER ET LES DOCUMENTS HORS REPO

- **Ce CLAUDE.md est la référence.** Il est versionné dans le repo depuis le
  11/10/2026 (`f02ade1`) et chargé automatiquement par chaque session cloud.
  Le mettre à jour à la fin de chaque session de travail, par une branche
  comme le reste du code.
- Il a été rédigé à partir du code et de l'historique. Une ancienne version
  de travail existe sur le Mac du propriétaire (dossier `V6/`) : si elle
  contient des règles absentes d'ici (direction artistique détaillée, renvois
  au PRD), les reporter ici puis abandonner la copie du Mac.
- Le PRD reste hors repo, sur le Mac.
