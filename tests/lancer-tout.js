/* Lance tous les tests l'un après l'autre et fait le bilan.
   Usage : node tests/lancer-tout.js        (depuis la racine du repo)
           node tests/lancer-tout.js minuit (seulement les fichiers dont le nom contient « minuit ») */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const filtre = process.argv[2] || "";
const fichiers = fs.readdirSync(__dirname).filter(f => /^test-.*\.js$/.test(f) && f.includes(filtre)).sort();
const resultats = [];
for (const f of fichiers) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: "inherit" });
  resultats.push({ f, ok: r.status === 0 });
}
console.log("\n══════════ BILAN ══════════");
resultats.forEach(r => console.log((r.ok ? "  ✔ " : "  ✘ ") + r.f));
const ko = resultats.filter(r => !r.ok).length;
console.log(ko ? `\n${ko} fichier(s) en échec.` : "\nTout est vert.");
process.exitCode = ko ? 1 : 0;
