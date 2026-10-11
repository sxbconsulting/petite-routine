/* Passage de minuit avec l'app restée ouverte (audit V6.2 #2). */
const { suite, verifier, vraiesErreurs, telephone } = require("./outils");

async function nuit(navigateur, url, evenement){
  const t = await telephone(navigateur, url, { horloge: new Date("2026-10-12T21:00:00") });   /* lundi soir */
  await t.page.click("#tab-evening");
  const n = await t.page.locator(".task").count();
  for (let i = 0; i < n; i++) await t.page.locator(".task").nth(i).click();
  await t.page.click("#celebrateBtn");
  await t.ctx.clock.setFixedTime(new Date("2026-10-13T07:30:00"));                            /* mardi matin */
  if (evenement === "retour") await t.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  const avant = await t.page.evaluate(() => ({ date: document.getElementById("dayLabel").textContent, onglet: view }));
  await t.page.locator(".task").first().click();
  const r = await t.page.evaluate(() => {
    const j = k => { const v = localStorage.getItem("pr_day_" + k); return v ? JSON.parse(v) : null; };
    const lun = j("2026-10-12"), mar = j("2026-10-13");
    return { lundiSoir: lun.evening.done.filter(Boolean).length, mardi: mar,
             etoileLundi: !!(JSON.parse(localStorage.pr_stars || "{}")["2026-10-12"] || {}).evening,
             onglet: view, coches: dayState[view].done.filter(Boolean).length };
  });
  await t.ctx.close();
  return { avant, ...r, errs: vraiesErreurs(t.errs) };
}

suite("Passage de minuit", async ({ navigateur, url }) => {
  const a = await nuit(navigateur, url, "retour");
  verifier("au retour sur l'app, l'écran affiche mardi", a.avant.date === "Mardi 13 octobre", a.avant.date);
  verifier("au retour sur l'app, onglet du matin", a.avant.onglet === "morning", a.avant.onglet);
  verifier("le tap du matin coche mardi matin", a.onglet === "morning" && a.coches === 1, a);
  verifier("mardi soir reste à faire (pas « déjà fêté »)", a.mardi && a.mardi.evening.done.filter(Boolean).length === 0 && !a.mardi.evening.celebrated, a.mardi);
  verifier("lundi soir et son étoile restent intacts", a.lundiSoir === 5 && a.etoileLundi);

  const b = await nuit(navigateur, url, "tap");
  verifier("tap avant toute vérification : rien n'est coché", b.coches === 0, b);
  verifier("tap avant toute vérification : l'écran passe à mardi matin", b.onglet === "morning", b.onglet);
  verifier("tap avant toute vérification : lundi n'est pas recopié dans mardi", !b.mardi, b.mardi);
  verifier("passage de minuit sans erreur JavaScript", a.errs.length === 0 && b.errs.length === 0, [...a.errs, ...b.errs]);
});
