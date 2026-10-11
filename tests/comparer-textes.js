/* Compare tous les textes affichés entre la version actuelle et une autre copie
   de l'app : sert à prouver qu'une modification ne change rien d'autre que ce
   qu'elle doit changer (c'est ainsi qu'on a vérifié que la version française
   n'avait pas bougé avec la V6.3).

   Usage :
     git worktree add /tmp/ancienne main          (la version de référence)
     node tests/comparer-textes.js /tmp/ancienne        → en français
     node tests/comparer-textes.js /tmp/ancienne en-US  → en anglais
     git worktree remove /tmp/ancienne

   Ce n'est pas un test : il liste les écarts, à toi de juger s'ils sont voulus. */
const path = require("path");
const { chromium, serveur, RACINE_APP } = require("./outils");

const dossierRef = process.argv[2];
const locale = process.argv[3] || "fr-FR";
if (!dossierRef) { console.error("Usage : node tests/comparer-textes.js <dossier de la version de référence> [locale]"); process.exit(2); }

async function releve(url){
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, locale, serviceWorkers: "block" });
  await ctx.route(/cdn\.jsdelivr|fonts\.g|supabase\.co/, r => r.abort());
  await ctx.clock.setFixedTime(new Date("2026-10-12T08:00:00"));
  const p = await ctx.newPage();
  await p.addInitScript(() => { Math.random = () => 0.42; });   /* même tirage de roue des deux côtés */
  await p.goto(url);
  const out = [];
  const grab = async (ecran) => out.push(...(await p.evaluate(() => {
    const o = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const el = w.currentNode.parentElement; if (!el || el.closest("script,style,.confetti,.burst")) continue;
      let h = false; for (let e = el; e; e = e.parentElement) { if (getComputedStyle(e).display === "none") { h = true; break; } } if (h) continue;
      const v = w.currentNode.textContent.replace(/\s+/g, " ").trim(); if (v) o.push(v); }
    document.querySelectorAll("[placeholder],[title],[aria-label]").forEach(e => e.getClientRects().length && ["placeholder","title","aria-label"].forEach(a => { if (e.getAttribute(a)) o.push("@" + a + "=" + e.getAttribute(a)); }));
    return o; })).map(t => ecran + " │ " + t));
  await p.evaluate(() => showOnboarding()); await grab("accueil");
  await p.click("#onb-home .onb-btn >> nth=1"); await grab("rejoindre");
  await p.click("#onb-join .onb-link"); await p.click("#onb-home .onb-btn >> nth=0"); await grab("créer");
  await p.click("#onb-create .onb-link"); await p.click("#onb-home .onb-link >> nth=0");
  for (const v of ["morning","afternoon","evening","wheel","bank"]) { await p.click("#tab-" + v); await grab(v); }
  await p.locator(".reward").first().click(); await grab("achat"); await p.click(".buy-cancel");
  await p.click("#tab-morning"); const n = await p.locator(".task").count(); for (let i = 0; i < n; i++) await p.locator(".task").nth(i).click();
  await p.waitForTimeout(500); await grab("bravo"); await p.click("#celebrateBtn");
  await p.locator(".wd").first().click(); await grab("jour passé"); await p.click("#pastBanner button");
  await p.click("#parentBtn"); await grab("parents");
  await p.click("#vacSw"); await p.click("[data-p=home]"); await grab("parents 2");
  await b.close();
  return out;
}

(async () => {
  const actuel = await serveur(RACINE_APP), ref = await serveur(path.resolve(dossierRef));
  const [a, b] = [await releve(ref.url), await releve(actuel.url)];
  actuel.fermer(); ref.fermer();
  const compte = arr => arr.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
  const ca = compte(a), cb = compte(b);
  const ecarts = Object.keys({ ...ca, ...cb }).filter(k => (ca[k] || 0) !== (cb[k] || 0));
  console.log(`Référence : ${a.length} textes · actuelle : ${b.length} textes · locale ${locale}`);
  if (!ecarts.length) { console.log("Aucun écart."); return; }
  ecarts.forEach(k => console.log(((ca[k] || 0) < (cb[k] || 0) ? "  + " : "  − ") + k + `   (${ca[k] || 0} → ${cb[k] || 0})`));
})();
