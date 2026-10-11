/* Espace parents : avatar, croix, corbeilles, calendrier, sauvegarde, police.
   Audit V6.2 #3, #7, #8 et la croix de fermeture (V6.3.2). */
const { suite, verifier, vraiesErreurs, telephone } = require("./outils");

suite("Espace parents", async ({ navigateur, url }) => {
  const t = await telephone(navigateur, url, { horloge: new Date("2026-10-12T08:00:00") });
  const { page } = t;
  /* Capture des fichiers générés (calendrier, sauvegarde) */
  await page.evaluate(() => { window.__fichiers = []; const o = URL.createObjectURL;
    URL.createObjectURL = (b) => { b.text().then(x => window.__fichiers.push(x)); return o(b); }; });

  /* ── Avatar (audit #3) ── */
  await page.click("#parentBtn");
  await page.click("#avatarPickerParent .av-btn.gros >> nth=1");   /* 👧 */
  await page.click(".btn-save");
  verifier("l'avatar choisi survit à « Enregistrer »", await page.evaluate(() => config.avatar) === "👧");

  /* ── Croix et en-tête collant ── */
  await page.click("#parentBtn");
  const croix = await page.isVisible(".sheet-close");
  verifier("la croix est visible à l'ouverture", croix);
  if (croix) {
  await page.evaluate(() => { document.querySelector(".sheet-inner").scrollTop = 1500; }); await page.waitForTimeout(200);
  const pos = await page.evaluate(() => { const c = document.querySelector(".sheet-close").getBoundingClientRect(),
    s = document.querySelector(".sheet-inner").getBoundingClientRect(); return { haut: c.top - s.top, bas: c.bottom - s.top }; });
  verifier("après défilement, la croix reste en haut du panneau", pos.haut >= -1 && pos.bas <= 64, pos);
  const recouvre = await page.evaluate(() => { const c = document.querySelector(".sheet-close").getBoundingClientRect();
    const el = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2); return !!(el && el.closest(".sheet-close")); });
  verifier("la croix n'est recouverte par rien (contenu dessous)", recouvre);
  }

  /* ── Corbeilles dans l'écran, pas de défilement horizontal ── */
  for (const largeur of [320, 375, 390]) {
    await page.setViewportSize({ width: largeur, height: 812 }); await page.waitForTimeout(100);
    const m = await page.evaluate(() => { const s = document.querySelector(".sheet-inner");
      return { deborde: s.scrollWidth - s.clientWidth,
               corbeille: Math.max(...[...document.querySelectorAll(".edit-row .del")].map(d => d.getBoundingClientRect().right)) - s.getBoundingClientRect().right };
    });
    verifier("corbeilles dans l'écran à " + largeur + " px", m.deborde <= 0 && m.corbeille <= 0, m);
  }
  await page.setViewportSize({ width: 375, height: 812 });

  /* ── Calendrier : rappel à 23 h 50 (audit #7) ── */
  await page.evaluate(() => { editState.profiles.school.reminders[2].time = "23:50"; editState.profiles.home.reminders[2].time = "23:50"; addRemindersToCalendar(); });
  await page.waitForTimeout(300);
  const ics = await page.evaluate(() => window.__fichiers.find(x => x.includes("VCALENDAR")) || "");
  const ev = ics.split("BEGIN:VEVENT").find(e => e.includes("T235000")) || "";
  const debut = (ev.match(/DTSTART:(\S+)/) || [])[1], fin = (ev.match(/DTEND:(\S+)/) || [])[1];
  verifier("rappel à 23 h 50 : fin le lendemain à 00 h 05", debut && fin && fin > debut && fin.endsWith("T000500"), { debut, fin });

  /* ── Sauvegarde : vraie version (audit #8) ── */
  await page.evaluate(() => exporterEnfant()); await page.waitForTimeout(300);
  const version = await page.evaluate(() => { const x = window.__fichiers.find(f => f.includes('"petite-routine"')); return x ? JSON.parse(x)._app : null; });
  verifier("la sauvegarde porte la version de l'app", version === "V" + await page.evaluate(() => typeof VERSION_APP !== "undefined" ? VERSION_APP : null), version);

  /* ── Croix : ferme le panneau ── */
  await page.evaluate(() => { document.querySelector(".sheet-inner").scrollTop = 0; });
  if (croix) await page.click(".sheet-close");
  verifier("la croix ferme l'espace parents", croix && !(await page.evaluate(() => document.getElementById("sheet").classList.contains("show"))));
  await page.evaluate(() => document.getElementById("sheet").classList.remove("show"));

  /* ── Police des cartes (audit #8) ── */
  verifier("cartes de tâche en Fredoka", (await page.evaluate(() => getComputedStyle(document.querySelector(".task .label")).fontFamily)).startsWith("Fredoka"));
  await page.click("#tab-bank");
  verifier("cartes de cadeau en Fredoka", (await page.evaluate(() => getComputedStyle(document.querySelector(".reward .r-label")).fontFamily)).startsWith("Fredoka"));

  /* ── Versions alignées ── */
  const sw = require("fs").readFileSync(require("path").join(__dirname, "..", "sw.js"), "utf8");
  const vSw = (sw.match(/const VERSION = "([^"]+)"/) || [])[1];
  verifier("VERSION de sw.js = VERSION_APP d'index.html", vSw === await page.evaluate(() => typeof VERSION_APP !== "undefined" ? VERSION_APP : null), { sw: vSw });

  verifier("espace parents sans erreur JavaScript", vraiesErreurs(t.errs).length === 0, vraiesErreurs(t.errs));
  await t.ctx.close();
});
