/* ═══════════════════════════════════════════════════════════════════
   OUTILS COMMUNS DES TESTS
   - un petit serveur qui sert le dossier de l'app (pas besoin de Python)
   - des téléphones simulés (Chromium via Playwright)
   - un faux Supabase, pour tester la synchro sans toucher à la vraie base
   - un compteur de vérifications ✔ / ✘
   ═══════════════════════════════════════════════════════════════════ */
const http = require("http");
const fs = require("fs");
const path = require("path");

/* Par défaut, l'app de ce repo. PR_APP=<dossier> teste une autre copie
   (par exemple une ancienne version, pour vérifier qu'un test attrape bien le bug). */
const RACINE_APP = process.env.PR_APP ? path.resolve(process.env.PR_APP) : path.resolve(__dirname, "..");

/* Playwright : celui du projet (npm install dans tests/), sinon celui
   préinstallé dans les sessions cloud Claude Code. */
function chargerPlaywright(){
  const essais = ["playwright", "/opt/node-tools/node_modules/playwright"];
  for (const m of essais) { try { return require(m); } catch (e) {} }
  console.error("Playwright introuvable. Dans le dossier tests : npm install && npx playwright install chromium");
  process.exit(2);
}
const { chromium } = chargerPlaywright();

/* ── Serveur statique ── */
const TYPES = { ".html":"text/html; charset=utf-8", ".js":"application/javascript; charset=utf-8",
  ".json":"application/json", ".png":"image/png", ".css":"text/css" };
function serveur(dossier = RACINE_APP){
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const chemin = decodeURIComponent(req.url.split("?")[0]);
      const fichier = path.join(dossier, chemin === "/" ? "index.html" : chemin);
      if (!fichier.startsWith(dossier) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(fichier)] || "application/octet-stream" });
      fs.createReadStream(fichier).pipe(res);
    });
    srv.listen(0, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${srv.address().port}/index.html`, fermer: () => srv.close() }));
  });
}

/* ── Vérifications ── */
const bilan = { ok: 0, ko: 0, echecs: [] };
function verifier(nom, condition, detail){
  if (condition) { bilan.ok++; console.log("  ✔ " + nom); }
  else { bilan.ko++; bilan.echecs.push(nom); console.log("  ✘ " + nom + (detail !== undefined ? "  →  " + JSON.stringify(detail) : "")); }
}
function terminer(){
  console.log(`\n${bilan.ok} vérification(s) réussie(s), ${bilan.ko} échec(s).`);
  process.exitCode = bilan.ko ? 1 : 0;
}

/* Erreur propre au banc de test : le service worker y est désactivé, et
   l'enregistrement renvoie alors undefined. N'existe pas sur un vrai téléphone. */
const ARTEFACT_SW = "reading 'update'";
const vraiesErreurs = (errs) => errs.filter(e => e.indexOf(ARTEFACT_SW) === -1);

/* ── Un téléphone sans synchro ──
   options : locale ('fr-FR'), largeur (375), horloge (Date), stockage {clé: valeur}, sansSkip */
async function telephone(navigateur, url, o = {}){
  const ctx = await navigateur.newContext({ viewport: { width: o.largeur || 375, height: 812 },
    locale: o.locale || "fr-FR", serviceWorkers: "block" });
  await ctx.route(/cdn\.jsdelivr|supabase\.co/, r => r.abort());   /* pas de Supabase : mode local */
  if (o.horloge) await ctx.clock.install({ time: o.horloge });
  await ctx.addInitScript(([stockage, skip]) => {
    try {
      if (skip) localStorage.setItem("pr_sync_skip", "1");
      Object.entries(stockage || {}).forEach(([k, v]) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, v); });
    } catch (e) {}
  }, [o.stockage || {}, !o.sansSkip]);
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.goto(url);
  return { ctx, page, errs };
}

/* ── Une famille synchronisée : deux téléphones et un faux serveur Supabase ──
   Chaque requête de l'app passe par window.__srv, exposée par Node, qui tient
   l'état du serveur. Le temps réel est rejoué vers chaque téléphone en ligne et
   éveillé, émetteur compris (c'est l'écho, que l'app doit reconnaître). */
const MOCK = fs.readFileSync(path.join(__dirname, "mock-supabase.js"), "utf8");
async function famille(navigateur, url){
  const serveurFaux = { row: { id: "c1", name: "Léa", data: null, code: "PR-TEST" },
                        enfants: null, refuseNom: false };
  const phones = {};
  async function phone(nom){
    const ctx = await navigateur.newContext({ viewport: { width: 375, height: 812 }, locale: "fr-FR", serviceWorkers: "block" });
    await ctx.route(/supabase\.co/, r => r.abort());
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: "application/javascript", body: MOCK }));
    const ph = { nom, ctx, offline: false, endormi: false, retardEcho: 0, errs: [] };
    await ctx.exposeFunction("__srv", async (json) => {
      const st = JSON.parse(json);
      const rep = (data, error) => JSON.stringify({ data, error });
      if (ph.offline) return rep(null, { message: "hors ligne" });

      /* V6.4.0 — Broadcast : relayé aux AUTRES téléphones, jamais à l'émetteur,
         comme le fait la configuration « self:false » du vrai client. */
      if (st.broadcast) {
        for (const [n, p] of Object.entries(phones)) {
          if (n === nom || p.offline || p.endormi) continue;
          const livrer = () => p.page.evaluate(m => { window.__rtcb && window.__rtcb(m); }, st.msg).catch(() => {});
          if (p.retardEcho) setTimeout(livrer, p.retardEcho); else livrer();
        }
        return rep(null, null);
      }

      if (st.rpc === "pr_lire_enfant")
        return rep(JSON.parse(JSON.stringify(serveurFaux.row)), null);

      if (st.rpc === "pr_enfants")
        return rep(serveurFaux.enfants || [{ id: "c1", name: serveurFaux.row.name }], null);

      if (st.rpc === "pr_rejoindre")
        return rep({ family_id: "f1", code: st.params.p_code }, null);

      if (st.rpc === "pr_creer_famille")
        return rep({ family_id: "f1", child_id: "c1", code: st.params.p_code }, null);

      if (st.rpc === "pr_ajouter_enfant")
        return rep({ id: "c2", name: st.params.p_nom }, null);

      if (st.rpc === "pr_maj_enfant") {
        /* Le coalesce du SQL : un prénom que la base ne peut pas stocker laisse
           l'ancien en place, sans faire échouer l'envoi des étoiles. */
        if (st.params.p_nom && !serveurFaux.refuseNom) serveurFaux.row.name = st.params.p_nom;
        serveurFaux.row.data = st.params.p_data;
        return rep(null, null);
      }

      return rep(null, { message: "requête non simulée" });
    });
    await ctx.addInitScript(() => { try {
      if (!localStorage.getItem("pr_sync"))
        localStorage.setItem("pr_sync", JSON.stringify({ familyId: "f1", code: "PR-TEST", childId: "c1", childName: "Léa" }));
    } catch (e) {} });
    ph.page = await ctx.newPage();
    ph.page.on("pageerror", e => ph.errs.push(e.message));
    await ph.page.goto(url);
    await ph.page.waitForTimeout(400);
    phones[nom] = ph;
    return ph;
  }
  return { serveur: serveurFaux, phone, phones };
}

const attendre = ms => new Promise(r => setTimeout(r, ms));
const etoilesDe = (stars) => Object.values(stars || {}).reduce((n, d) => n + !!d.morning + !!d.afternoon + !!d.evening, 0);

/* Lance un fichier de test : navigateur + serveur ouverts, fermés à la fin. */
async function suite(titre, corps){
  console.log("\n━━ " + titre + " ━━");
  const navigateur = await chromium.launch();
  const srv = await serveur();
  try { await corps({ navigateur, url: srv.url }); }
  catch (e) { verifier("le test s'exécute sans planter", false, e.message); }
  finally { await navigateur.close(); srv.fermer(); terminer(); }
}

module.exports = { chromium, serveur, verifier, terminer, vraiesErreurs, telephone, famille, attendre, etoilesDe, suite, RACINE_APP };
