/* Injection par les données synchronisées (audit du 27/11/2026).

   Les libellés et emoji passent par esc(), mais trois valeurs entraient brutes
   dans du HTML : le coût d'un cadeau, le coût d'un achat passé, et l'heure d'un
   rappel. Or ces valeurs arrivent aussi du serveur, donc du téléphone de
   l'autre parent — ou de quiconque sait écrire dans la ligne de l'enfant.

   Ce test écrit une charge dans ces trois champs, ouvre l'espace parents, et
   vérifie qu'il ne se passe rien. Il échoue sur la V6.4.2 et passe après. */

const { suite, verifier, telephone } = require("./outils");

/* Sort de l'attribut, ouvre une balise, déclenche un gestionnaire. */
const CHARGE = '1"><img src="x" onerror="window.__xss=(window.__xss||0)+1">';

suite("Injection par les données synchronisées", async ({ navigateur, url }) => {
  const t = await telephone(navigateur, url, { horloge: new Date("2026-10-12T08:00:00") });
  const { page } = t;

  /* On simule ce qu'hydrate() ferait d'une réponse serveur falsifiée. */
  await page.evaluate((charge) => {
    window.__xss = 0;
    config.rewards[0].cost = charge;
    config.profiles[PROFILS[0]].reminders[0].time = charge;
    bank.purchases = [{ emoji: "🍬", label: "Test", cost: charge }];
    saveConfig();
  }, CHARGE);

  await page.click("#parentBtn");
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => ({
    xss: window.__xss || 0,
    images: document.querySelectorAll('#sheet img[src="x"]').length,
    /* La valeur doit rester du texte : présente, mais inerte. */
    coutAffiche: (document.querySelector("#edit-rewards .cost") || {}).value,
  }));

  verifier("un coût falsifié n'exécute aucun script", r.xss === 0, JSON.stringify(r));
  verifier("un coût falsifié n'insère aucune balise", r.images === 0, JSON.stringify(r));
  verifier("le champ coût reste numérique", !isNaN(Number(r.coutAffiche)), JSON.stringify(r));
});
