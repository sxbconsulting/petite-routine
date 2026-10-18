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

## CONTRAINTES NON NÉGOCIABLES

1. **Aucun framework.** Pas de React, Vue, Svelte. JavaScript vanilla.
2. **Aucune chaîne de build pour l'app.** Ce que GitHub Pages sert doit rester
   du HTML/CSS/JS tel quel. Un découpage éventuel se ferait en modules ES
   natifs (`<script type="module">`), jamais avec un bundler.
3. **Chemins relatifs partout.** Le site est servi sur `/petite-routine/`, pas
   à la racine du domaine : un chemin absolu (`/icon.png`) casse tout. Vaut
   aussi pour le service worker, dont la portée dépend de son emplacement.
4. **La clé anon Supabase reste dans le code.** Elle est publique par
   conception, la protection vient de la RLS. Ne pas proposer de la « sécuriser »
   par des variables d'environnement : GitHub Pages n'en a pas.
5. **Pas de dépendance npm dans l'app.** Supabase est chargé par CDN. Seul le
   dossier `tests/` a des dépendances, et il n'est jamais servi.
6. **Pas d'authentification par compte.** Le code famille `PR-XXXX` est un
   choix assumé : l'inscription tuerait l'adoption sur une app familiale.

## DIRECTION ARTISTIQUE

Ne pas y toucher sans demande explicite.

| Élément | Valeur |
|---|---|
| Titres, boutons | **Fredoka** |
| Libellés, texte courant | **Nunito** |
| Encre | `#3a2e52` · encre douce `#7a6f96` |
| Or | `#ffb830` · menthe `#4ecb8f` · corail `#ff6e5c` |
| Rayon des angles | 28 px |

- **Les ciels animés sont la signature du produit** : matin doré avec nuages,
  après-midi bleu, soir indigo avec lune et étoiles, roue rose avec ballons,
  tirelire dorée avec pièces. Ne jamais les simplifier au nom de la performance.
- **Avatar de l'enfant**, en deux temps : « Choisis ton avatar » propose garçon
  ou fille en gros boutons, la rangée des carnations n'apparaît qu'ensuite sous
  « Personnalise-le ». **Ne jamais nommer le genre ni la couleur de peau dans
  l'interface** — les emoji portent l'information. Le 🧒 neutre n'est plus
  proposé mais reste la valeur par défaut, et reste reconnu au chargement.
  Cibles tactiles larges, quitte à passer sur deux lignes en petit écran.
- **Cheveux et yeux sont impossibles** : les emoji enfants n'acceptent pas les
  composants cheveux (`🧒‍🦱` se rend en deux glyphes) et aucun emoji Unicode
  n'encode la couleur des yeux. Vérifié au canvas — ne pas réessayer.
- Le 🐷 est réservé à la tirelire, à ses quatre emplacements.

## PRINCIPES UX

1. **Une action par écran.** L'enfant ne doit jamais choisir entre deux choses.
2. **Aucun texte indispensable.** Emoji, couleur et mouvement portent le sens :
   l'app s'adresse à des enfants qui ne lisent pas encore.
3. **Feedback en moins de 100 ms.**
4. **La découvrabilité prime sur la protection.** Seul l'achat d'un cadeau est
   derrière un appui long. Ne rien cacher d'autre derrière un geste : trois
   testeurs avaient cru que le bouton parents « ne marchait pas ».
5. **Jamais d'écran vide.** Enfant neuf, jour sans étoile, famille sans cadeau :
   tous doivent afficher quelque chose de compréhensible.

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

Dernière vérification : 17/10/2026, 57 / 57 tests au vert, lancés sur le Mac.
Le code de l'app (`index.html`, `sw.js`) n'a pas changé depuis la V6.3.2
(`7ac4c6c`) ; les commits suivants ne touchent que `tests/` et ce fichier.
Aucune tâche en cours.
(Ne pas citer ici le dernier commit : mettre ce fichier à jour en crée un
nouveau, et la mention serait périmée aussitôt.)

## CE QUI EST GELÉ

Rien de tout cela ne se lance sans accord explicite du propriétaire.

- **V7 « Sorties »** (organisateur de rencontres entre familles, tables
  `pr_friendships` / `pr_events`, code `PRS-XXXX`). La spec existe. Elle
  changerait la nature du produit — d'un outil familial à un réseau — et
  doublerait la surface de maintenance.
- **Découpage de `index.html`** en modules ES. Le fichier est long, mais sa
  longueur n'a bloqué aucune des tâches livrées jusqu'ici.
- **App native et App Store.** Un projet Xcode existe hors repo (Swift +
  `WKWebView`, sans Capacitor ni npm). Depuis le 18/10/2026 il embarque la
  V6.3.2, compile et tourne, avec un **widget d'écran d'accueil** et des
  **rappels locaux programmés** — vérifiés en simulateur. Rien n'est soumis.
  Obstacles inchangés : 99 $/an, catégorie Enfants très stricte, politique de
  confidentialité obligatoire (un prénom d'enfant est stocké, donc RGPD), et
  risque de rejet sous la règle 4.2 « fonctionnalité minimale », qui vise
  précisément les sites web empaquetés.
  **Trois leçons techniques à ne pas réapprendre :**
  1. Avec `loadFileURL`, l'app s'affiche mais `localStorage` ne persiste pas —
     WebKit refuse le stockage aux origines `file://`. Il faut servir les
     fichiers embarqués par un `WKURLSchemeHandler` sous un schéma maison,
     qui donne une vraie origine.
  2. **La notification n'est pas l'argument qu'on croit.** Depuis iOS 16.4 une
     PWA ajoutée à l'écran d'accueil reçoit des notifications web push. Ce que
     le web ne sait pas faire, c'est en *programmer* une à heure fixe sans
     serveur. Le widget, lui, est hors de portée du web — c'est le seul
     argument solide face à la règle 4.2.
  3. **L'App Group exige le compte développeur sur un appareil réel.** En
     simulateur la signature ad hoc suffit ; sur iPhone, sans profil de
     provisionnement, le widget s'affiche vide. Les rappels, eux, n'ont besoin
     d'aucun compte.
- **Ces trois chantiers attendent la validation de la rétention**, telle que
  définie dans le PRD : 3 familles sur 5 qui rouvrent l'app entre J+5 et J+7.
  Ne pas construire de nouvelle fonctionnalité sans le rappeler d'abord.

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
  de réactivation). Dernier commit au 17/10/2026 : échéance vers le
  **16 décembre 2026**, repoussée par chaque nouveau commit. Un ping ne réveille pas un projet déjà en pause : il faut
  « Restore project » dans le tableau de bord Supabase.
- **Le code famille est la seule clé de récupération** des données
  synchronisées, avec la sauvegarde JSON de l'espace parents.
- **Cloisonnement par enfant** : toute clé localStorage passe par `ck()`, qui
  la suffixe par l'identifiant de l'enfant. Bug critique deux fois — une clé
  oubliée, puis un ordre de déclaration.
- **Anti-écho** : chaque envoi porte un marqueur `_rev` unique, comparé au
  retour. **Ne jamais revenir à une comparaison de `JSON.stringify`** : la
  colonne `data` est de type `jsonb` et Postgres réordonne les clés au
  stockage, donc deux textes ne sont jamais égaux à donnée identique.
- **Service worker** : `index.html` est servi réseau d'abord, avec
  `cache:"reload"`. GitHub Pages envoie le HTML en `max-age=600` ; un `fetch`
  ordinaire rendrait la copie du navigateur, vieille de dix minutes. Ne jamais
  passer `index.html` en cache-d'abord.
- **Appui long d'achat** : écouter `touchcancel` autant que `touchend`. Sur
  iPhone, une notification ou un début de défilement annulent le toucher sans
  le terminer — le cadeau partait doigt levé.
- **Texte inséré dans du HTML** : tout libellé ou emoji passe par `esc()` avant
  un `innerHTML`. Les données arrivent aussi par la synchronisation, donc
  d'ailleurs que du clavier du parent.
- **Réordonnancement** : le marqueur `_oi`, posé à l'ouverture de l'espace
  parents, remappe les coches. `saveParent()` réaligne les jours du serveur
  **et** ceux gardés seulement sur l'appareil (`clesJoursLocaux()`) — sinon une
  famille sans synchronisation voit ses coches passées glisser.
- **Une seule `migrateConfig()`**, appelée par `loadConfig()` **et** par
  `hydrate()`. Deux copies avaient divergé et une fonctionnalité entière
  disparaissait en silence.
- **Aucun `try/catch` autour de `migrateConfig()`** dans `loadConfig()` :
  l'ancien filet avalait toute erreur et remplaçait la configuration par les
  valeurs par défaut, aussitôt sauvegardée. La configuration d'avant la V6.2
  est conservée sous `pr_config_avant_v62`.
- **Après un import JSON**, `editState` est remis à `null` et l'espace parents
  se ferme : il contient l'ancienne configuration, et « Enregistrer »
  annulerait la restauration d'un clic.
- **L'export JSON rassemble les jours depuis localStorage**, pas depuis
  `remoteDays` : le serveur n'en garde que quatorze.
- **Les noms des globales d'`index.html` sont un contrat avec l'app native.**
  Le projet Xcode hors repo n'injecte aucun code dans la page : il la *lit*,
  via `config`, `dayState`, `ROUTINES`, `routinesDe()`, `todayReminders()`,
  `remMeta()` et `t()`. Renommer l'une d'elles ne cassera rien ici — le pont
  est défensif et renvoie `nil` — mais **le widget et les rappels deviendront
  muets en silence, sans erreur visible**. Si tu touches à l'une de ces sept
  globales, préviens le pont (`ios/PetiteRoutine/PontWeb.swift`).

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
- **Sur ce Mac, `playwright install` n'extrait pas les navigateurs.** L'archive
  se télécharge entière, puis l'extraction se fige vers 38 fichiers, processus
  inerte et sans aucune entrée/sortie : c'est son décompresseur interne, pas une
  vérification de sécurité de macOS. Contournement vérifié le 17/10/2026 :
  récupérer les archives sous
  `https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/<révision>/`,
  les extraire avec `ditto -x -k` dans `~/Library/Caches/ms-playwright/`, puis y
  poser un fichier vide `INSTALLATION_COMPLETE`. `ditto` fait en une seconde ce
  qui bloquait plus d'une heure. **Il faut deux paquets, pas un** :
  `chromium-<révision>` et `chromium_headless_shell-<révision>` — c'est le
  second que les tests lancent. La révision se lit dans
  `tests/node_modules/playwright-core/browsers.json`.
- **Avant chaque mise en ligne : tout doit être vert** (57 / 57 au
  17/10/2026).
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

- **Ce CLAUDE.md est la référence.** Versionné dans le repo depuis le
  11/10/2026 (`f02ade1`), chargé automatiquement par chaque session.
  Le mettre à jour en fin de session de travail, par une branche comme le
  reste du code.
- **L'ancienne copie du Mac (`V6/CLAUDE.md`) a été fusionnée ici puis
  supprimée** le 16/10/2026. Direction artistique, principes UX, contraintes,
  pièges et chantiers gelés en proviennent. Le dossier `V6/files/` du Mac est
  figé à la V6.2 : **ne jamais y repartir pour déployer**, il écraserait la
  V6.3. Le repo est la seule source de vérité.
- **Rien de personnel ici : le repo est public.** Le contexte propre au
  propriétaire — sa façon de travailler, ses priorités, les codes famille des
  testeurs, les chiffres de la bêta — vit dans un fichier privé sur son Mac,
  à la racine du dossier de travail, hors repo.
- Le **PRD** (`PRD_PETITE_ROUTINE.html`) reste hors repo, sur le Mac :
  personas, métriques, périmètre, 43 specs fonctionnelles, modèle de données,
  risques et décisions actées. À lire avant toute proposition d'architecture.
