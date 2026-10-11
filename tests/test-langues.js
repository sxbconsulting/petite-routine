/* Langues (V6.3) : aucun reste de français en anglais, langue par défaut,
   changement de langue, semaine type selon la langue. */
const { suite, verifier, vraiesErreurs, telephone } = require("./outils");

/* Mots français qui ne doivent jamais apparaître sur l'app en anglais */
const FR = /\b(le|la|les|du|des|une?|et|pour|avec|dans|tes|mes|ton|ta|Bonjour|Coucou|Bonsoir|étoile|tirelire|cadeau|roue|enfant|Enregistrer|Ajouter|jour|matin|soir|Retour|Rejoindre|Prénom|famille|appui|maintenant|aujourd|sauvegarde|rappel|vacances|école|maison|facultatif|Touchez|touche)\b/i;

/* Tous les textes visibles + placeholder / title / aria-label */
async function textesVisibles(page){
  return page.evaluate(() => {
    const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const el = w.currentNode.parentElement; if (!el || el.closest("script,style")) continue;
      let cache = false; for (let e = el; e; e = e.parentElement) { if (getComputedStyle(e).display === "none") { cache = true; break; } }
      const v = w.currentNode.textContent.trim(); if (v && !cache) out.push(v);
    }
    document.querySelectorAll("[placeholder],[title],[aria-label]").forEach(e =>
      ["placeholder","title","aria-label"].forEach(a => { if (e.getAttribute(a)) out.push(e.getAttribute(a)); }));
    return out;
  });
}

suite("Langues", async ({ navigateur, url }) => {
  /* ── 1. Parcours complet en anglais ── */
  const { ctx, page, errs } = await telephone(navigateur, url, { locale: "en-US" });
  const vus = new Set(), restes = [];
  const relever = async (ecran) => { for (const t of await textesVisibles(page)) {
    if (vus.has(t)) continue; vus.add(t);
    if (FR.test(t.replace(/Petite Routine|PR-[A-Z0-9]+|Langue · Language|Français/g, ""))) restes.push(ecran + " : " + t);
  } };
  verifier("téléphone anglais → app en anglais (lang=en)", await page.evaluate(() => document.documentElement.lang) === "en");
  await page.evaluate(() => showOnboarding()); await relever("accueil");
  await page.click("#onb-home .onb-btn >> nth=1"); await relever("rejoindre");
  await page.click("#onb-join .onb-link"); await page.click("#onb-home .onb-btn >> nth=0"); await relever("créer");
  await page.click("#onb-create .onb-link"); await page.click("#onb-home .onb-link >> nth=0");
  for (const v of ["morning","afternoon","evening","wheel","bank"]) { await page.click("#tab-" + v); await relever(v); }
  await page.locator(".reward").first().click(); await relever("achat"); await page.click(".buy-cancel");
  await page.click("#tab-morning");
  const n = await page.locator(".task").count(); for (let i = 0; i < n; i++) await page.locator(".task").nth(i).click();
  await page.waitForTimeout(500); await relever("bravo"); await page.click("#celebrateBtn");
  await page.locator(".wd").first().click(); await relever("jour passé"); await page.click("#pastBanner button");
  await page.click("#parentBtn"); await relever("espace parents");
  await page.click("#avatarPickerParent .av-btn.gros >> nth=0"); await page.click("#vacSw"); await page.click("[data-p=home]");
  await page.click("text=+ Add a step"); await page.click("text=+ Add an activity"); await page.click("text=+ Add a reward");
  await relever("espace parents (suite)");
  await page.click(".btn-save");
  await page.click("#tab-wheel"); await page.click("#spinBtn"); await page.waitForTimeout(4700); await relever("roue");
  verifier("aucun mot français sur l'app en anglais (" + vus.size + " textes)", restes.length === 0, restes);
  verifier("anglais : semaine d'école du lundi au vendredi", await page.evaluate(() => config.weekMap.join(",")) === "home,school,school,school,school,school,home");
  verifier("parcours anglais sans erreur JavaScript", vraiesErreurs(errs).length === 0, vraiesErreurs(errs));
  await ctx.close();

  /* ── 2. Langue par défaut selon le téléphone et l'historique ── */
  const cas = async (locale, stockage) => { const t = await telephone(navigateur, url, { locale, stockage });
    const l = await t.page.evaluate(() => LANG); await t.ctx.close(); return l; };
  verifier("téléphone français → français", await cas("fr-FR") === "fr");
  verifier("téléphone allemand → anglais", await cas("de-DE") === "en");
  verifier("famille d'avant la V6.3 sur iPhone anglais → reste en français", await cas("en-US", { pr_config: '{"name":"Léa"}' }) === "fr");
  verifier("famille synchronisée sur iPhone anglais → reste en français", await cas("en-US", { pr_sync: '{"childId":"x"}' }) === "fr");
  verifier("choix English mémorisé → anglais", await cas("en-US", { pr_config: "{}", pr_lang: "en" }) === "en");
  {
    const t = await telephone(navigateur, url, { locale: "en-US" });
    await t.page.evaluate(() => { config.name = "Sam"; saveConfig(); });
    await t.page.reload();
    verifier("nouvel utilisateur anglais : toujours en anglais après relance", await t.page.evaluate(() => LANG) === "en");
    await t.ctx.close();
  }
  verifier("français : pas d'école le mercredi", await (async () => { const t = await telephone(navigateur, url);
    const w = await t.page.evaluate(() => config.weekMap.join(",")); await t.ctx.close(); return w; })() === "home,school,school,home,school,school,home");

  /* ── 3. Changer de langue : étapes par défaut traduites, étapes perso intactes ── */
  {
    const t = await telephone(navigateur, url, { horloge: new Date("2026-10-12T08:00:00") });   /* lundi : jour d'école */
    await t.page.evaluate(() => { config.profiles.school.morning[1].label = "Je mets ma robe préférée"; saveConfig(); });
    await t.page.reload();
    await t.page.click("#tab-morning"); await t.page.locator(".task").nth(0).click();
    await t.page.click("#parentBtn"); await t.page.click("[data-lang=en]");
    const ecole = await t.page.evaluate(() => config.profiles.school.morning.map(x => x.label));
    verifier("passage en anglais : étape par défaut traduite", ecole[0] === "Potty time", ecole);
    verifier("passage en anglais : étape personnalisée intacte", ecole[1] === "Je mets ma robe préférée", ecole);
    verifier("passage en anglais : les coches restent", await t.page.evaluate(() => !!dayState.morning.done[0]));
    verifier("sélecteur : drapeaux 🇫🇷 / 🇬🇧", await t.page.evaluate(() => [...document.querySelectorAll("[data-lang]")].map(b => b.textContent).join("|")) === "🇫🇷 Français|🇬🇧 English");
    await t.page.click(".btn-save");
    await t.page.reload();
    verifier("choix de langue gardé après relance", await t.page.evaluate(() => document.getElementById("greeting").textContent.startsWith("Good morning")));
    await t.page.click("#parentBtn"); await t.page.click("[data-lang=fr]"); await t.page.click(".btn-save");
    verifier("retour en français : étapes par défaut retraduites",
      await t.page.evaluate(() => config.profiles.school.morning.map(x => x.label).join("|")) === "Je vais au pot|Je mets ma robe préférée|Petit-déjeuner|Je brosse mes dents|Mes chaussures");
    verifier("changement de langue sans erreur JavaScript", vraiesErreurs(t.errs).length === 0, vraiesErreurs(t.errs));
    await t.ctx.close();
  }
});
