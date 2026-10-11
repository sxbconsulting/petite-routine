/* Synchronisation entre deux téléphones, avec un faux Supabase.
   Audit V6.2 #1 (données de l'autre parent), #4 (écho tardif), #5 et #6 (prénom). */
const { suite, verifier, vraiesErreurs, famille, attendre, etoilesDe } = require("./outils");
const NEUF_ETOILES = { "2026-10-01": { morning: true, afternoon: true, evening: true },
                       "2026-10-02": { morning: true, afternoon: true, evening: true },
                       "2026-10-03": { morning: true, afternoon: true, evening: true } };

suite("Synchronisation", async ({ navigateur, url }) => {
  /* ── 1. B fait gagner des étoiles ; A, relancé hors ligne, coche ; le réseau revient ── */
  {
    const f = await famille(navigateur, url);
    const A = await f.phone("A"), B = await f.phone("B");
    await B.page.evaluate((s) => { stars = s; saveStars(); }, NEUF_ETOILES);
    await attendre(1500);
    verifier("A reçoit en temps réel les étoiles gagnées sur B", await A.page.evaluate(() => totalEarned()) === 9);
    A.offline = true;
    await A.page.reload(); await A.page.waitForTimeout(400);
    verifier("A relancé hors ligne garde les étoiles reçues", await A.page.evaluate(() => totalEarned()) === 9);
    await A.page.click("#tab-morning"); await A.page.locator(".task").first().click();
    await attendre(1200);
    A.offline = false;
    await A.page.evaluate(() => window.dispatchEvent(new Event("online")));
    await attendre(6500);   /* au-delà des 5 s de relance : une version qui écrase le serveur se fait prendre */
    verifier("au retour du réseau, le serveur garde les 9 étoiles", etoilesDe(f.serveur.row.data.stars) === 9, etoilesDe(f.serveur.row.data.stars));
    verifier("et reçoit le tap fait hors ligne",
      Object.values(f.serveur.row.data.days || {}).some(d => d.morning && d.morning.done && d.morning.done[0]));
    verifier("scénario 1 sans erreur JavaScript", vraiesErreurs([...A.errs, ...B.errs]).length === 0, vraiesErreurs([...A.errs, ...B.errs]));
    await A.ctx.close(); await B.ctx.close();
  }

  /* ── 2. A dort (temps réel coupé) pendant que B modifie ; A se réveille, puis coche ── */
  {
    const f = await famille(navigateur, url);
    const A = await f.phone("A"), B = await f.phone("B");
    A.endormi = true;
    await B.page.evaluate(() => { config.name = "Léa-Rose"; saveConfig(); stars = { "2026-10-05": { morning: true, afternoon: true } }; saveStars(); });
    await attendre(1500);
    A.endormi = false;
    await A.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await attendre(600);
    const salut = await A.page.evaluate(() => document.getElementById("greeting").textContent);   /* Bonjour / Coucou / Bonsoir selon l'heure */
    verifier("au réveil, A affiche ce que B a modifié", salut.includes("Léa-Rose"), salut);
    await A.page.click("#tab-evening"); await A.page.locator(".task").first().click();
    await attendre(1500);
    verifier("le tap de A n'efface pas le prénom changé par B", f.serveur.row.data.config.name === "Léa-Rose");
    verifier("le tap de A n'efface pas les étoiles de B", etoilesDe(f.serveur.row.data.stars) === 2);
    await A.ctx.close(); await B.ctx.close();
  }

  /* ── 3. Un tap pendant la relecture du serveur ── */
  {
    const f = await famille(navigateur, url);
    const A = await f.phone("A");
    await A.page.click("#tab-morning");
    await A.page.evaluate(() => { const vrai = window.__srv; window.__srv = (j) => new Promise(r => setTimeout(() => r(vrai(j)), 800)); });
    await A.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await attendre(150);
    await A.page.locator(".task").nth(1).click();
    await attendre(2500);
    verifier("tap pendant la relecture : gardé à l'écran", await A.page.evaluate(() => !!dayState.morning.done[1]));
    verifier("tap pendant la relecture : envoyé au serveur",
      Object.values(f.serveur.row.data.days || {}).some(d => d.morning && d.morning.done && d.morning.done[1]));
    await A.ctx.close();
  }

  /* ── 4. Écho tardif sur réseau lent (audit #4) ── */
  {
    const f = await famille(navigateur, url);
    const A = await f.phone("A");
    A.retardEcho = 2500;
    await A.page.click("#tab-morning");
    await A.page.locator(".task").nth(0).click();
    await attendre(1300);
    await A.page.locator(".task").nth(1).click();
    await attendre(4000);
    verifier("écho tardif : les deux coches restent", await A.page.evaluate(() => dayState.morning.done.filter(Boolean).length) === 2);
    await A.ctx.close();
  }

  /* ── 5. Pastille, liste des enfants, renommage (audit #5 et #6) ── */
  for (const refuseNom of [false, true]) {
    const f = await famille(navigateur, url);
    f.serveur.refuseNom = refuseNom;
    f.serveur.enfants = [{ id: "c1", name: "Léa" }, { id: "c2", name: "<b>Tom</b>" }];
    const A = await f.phone("A");
    const pastille = () => A.page.evaluate(() => document.getElementById("childChip").innerText.replace(/\n/g, " "));
    await A.page.evaluate(() => { config.avatar = "👦"; renderChildChip(); });
    if (!refuseNom) verifier("pastille : un seul avatar, celui de l'enfant", (await pastille()).startsWith("👦 Léa"), await pastille());
    await A.page.click("#parentBtn"); await A.page.fill("#childName", "Léon"); await A.page.click(".btn-save");
    await attendre(1500);
    if (!refuseNom) {
      verifier("renommage : la pastille suit", (await pastille()).startsWith("👦 Léon"), await pastille());
      verifier("renommage : la colonne name du serveur suit", f.serveur.row.name === "Léon", f.serveur.row.name);
      await A.page.evaluate(() => openChildPicker()); await attendre(300);
      const liste = await A.page.evaluate(() => [...document.querySelectorAll(".onb-child")].map(b => b.innerHTML));
      verifier("liste des enfants : avatar neutre et prénom échappé", liste[1] === "🧒 <span>&lt;b&gt;Tom&lt;/b&gt;</span>", liste);
    } else {
      verifier("prénom refusé par la base : la synchro passe quand même", !!f.serveur.row.data && f.serveur.row.data.config.name === "Léon");
    }
    await A.ctx.close();
  }
});
