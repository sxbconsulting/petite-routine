/* Sécurité de l'accès aux données (29/10/2026).

   Jusqu'à la V6.3.2, la clé anon publique donnait un accès anonyme complet :
   une seule requête suffisait à lire toutes les familles et tous les prénoms
   d'enfants, sans connaître le moindre code famille. La V6.4.0 ferme les
   tables et ne laisse que des fonctions.

   Ce test est statique : il lit le code servi, sans navigateur. Il échoue sur
   la V6.3.2 et passe sur la V6.4.0 —
     PR_APP=<dossier d'une ancienne copie> node tests/test-securite.js */

const fs = require("fs");
const path = require("path");
const { verifier, terminer, RACINE_APP } = require("./outils");

console.log("\n━━ Sécurité de l'accès aux données ━━");

const lire = (rel) => {
  const f = path.join(RACINE_APP, rel);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
};

const app  = lire("index.html");
const cron = lire(".github/workflows/keep-alive.yml");
const sql  = lire("supabase/verrouillage-rls.sql");

/* 1 — la porte qu'on vient de fermer */
const direct = app.match(/\.from\(\s*["']pr_[a-z_]+["']\s*\)/g) || [];
verifier("l'app n'interroge plus aucune table directement",
         direct.length === 0,
         direct.length ? "trouvé : " + direct.join(", ") : "");

/* 2 — elle passe bien par des fonctions, et pas une poignée */
const appels = [...app.matchAll(/\.rpc\(\s*["']([a-z_]+)["']/g)].map(m => m[1]);
const uniques = [...new Set(appels)];
verifier("l'app passe par des fonctions nommées",
         uniques.length >= 6,
         uniques.join(", "));

/* 3 — le piège le plus probable : une faute de frappe sur un nom de fonction
   ne se verrait qu'en production, une fois la table déjà fermée. */
const manquantes = uniques.filter(n => !sql.includes("function public." + n + "("));
verifier("chaque fonction appelée est définie par la migration",
         sql !== "" && manquantes.length === 0,
         sql === "" ? "migration introuvable" : "absentes : " + manquantes.join(", "));

/* 4 — le temps réel : les changements de table ne passent plus la RLS */
verifier("le temps réel ne s'abonne plus aux changements de table",
         !app.includes("postgres_changes"));
verifier("le temps réel passe par Broadcast",
         /\.on\(\s*["']broadcast["']/.test(app));

/* 5 — le cron de réveil, qui tomberait en silence et endormirait le projet */
verifier("le cron de réveil n'interroge plus une table",
         cron !== "" && !/rest\/v1\/pr_(families|children)\?/.test(cron),
         cron === "" ? "workflow introuvable" : "");

/* 6 — la clé exposée reste une clé anon, jamais une clé de service */
verifier("aucune clé de service dans le code servi",
         !/service_role/.test(app) && !/service_role/.test(cron));

terminer();
