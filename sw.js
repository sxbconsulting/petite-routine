/* ═══════════════════════════════════════════════════════════════════
   PETITE ROUTINE — SERVICE WORKER
   Permet à l'app de s'ouvrir et de fonctionner sans réseau.

   ─── LA SEULE CHOSE À SAVOIR ───────────────────────────────────────
   Quand tu déploies une nouvelle version, incrémente VERSION ci-dessous.
   Exemple : "6.1.1" devient "6.1.2".

   Si tu oublies, ce n'est pas grave : index.html — c'est-à-dire toute
   l'app — est servi RÉSEAU D'ABORD. Tes modifications arrivent donc
   chez les familles même sans changer VERSION. Le numéro ne sert qu'à
   renouveler les icônes, le manifeste et les polices, qui ne bougent
   presque jamais.

   C'est délibéré : le piège classique du service worker est de servir
   l'ancienne version depuis le cache pendant des semaines. Ici, c'est
   structurellement impossible tant qu'il y a du réseau.
   ═══════════════════════════════════════════════════════════════════ */

const VERSION = "6.1.3";
const CACHE   = "petite-routine-" + VERSION;

/* Le strict nécessaire pour que l'app s'ouvre : même origine, doit réussir. */
const COQUILLE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon.png"
];

/* Utile mais pas vital : si le CDN ne répond pas le jour de l'installation,
   on installe quand même. L'app fonctionne sans, en mode local. */
const EXTERNES = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@600;700;800&display=swap"
];

/* ── Installation : on remplit le cache ── */
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(COQUILLE);
    await Promise.allSettled(EXTERNES.map((u) => cache.add(u)));
    /* On prend la main tout de suite au lieu d'attendre la fermeture
       de tous les onglets — sinon une mise à jour peut dormir des jours. */
    await self.skipWaiting();
  })());
});

/* ── Activation : on jette les caches des versions précédentes ── */
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(
      noms.filter((n) => n.startsWith("petite-routine-") && n !== CACHE)
          .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

/* ── Petit utilitaire : abandonner une requête qui traîne ──
   Un wifi « présent mais mort » est pire qu'une absence de réseau :
   sans délai maximum, l'app resterait bloquée sur un écran blanc. */
function avecDelai(promesse, ms) {
  return new Promise((resoudre, rejeter) => {
    const t = setTimeout(() => rejeter(new Error("délai dépassé")), ms);
    promesse.then(
      (r) => { clearTimeout(t); resoudre(r); },
      (err) => { clearTimeout(t); rejeter(err); }
    );
  });
}

/* ── Stratégie 1 : RÉSEAU D'ABORD, pour l'app elle-même ──
   Garantit qu'une nouvelle version déployée est vue immédiatement.
   Si le réseau manque ou traîne, on sert la copie en cache. */
async function reseauDabord(requete) {
  const cache = await caches.open(CACHE);
  try {
    /* cache:"reload" force un vrai aller sur le reseau.
       Sans ça, GitHub Pages sert le HTML avec une duree de vie de 10 minutes,
       et le navigateur nous rendrait sa propre copie perimee : le "reseau
       d'abord" n'aurait alors de reseau que le nom, et une nouvelle version
       pourrait rester invisible dix minutes de plus que necessaire. */
    const reponse = await avecDelai(fetch(requete.url, {cache: "reload"}), 4000);
    if (reponse && reponse.ok) {
      cache.put("./index.html", reponse.clone());
    }
    return reponse;
  } catch (err) {
    const secours = await cache.match("./index.html") || await cache.match("./");
    if (secours) return secours;
    return new Response(
      "<!doctype html><meta charset=utf-8><p>Petite Routine n'a pas encore été enregistrée hors ligne. Ouvre l'app une fois avec du réseau.",
      { headers: { "Content-Type": "text/html;charset=utf-8" }, status: 503 }
    );
  }
}

/* ── Stratégie 2 : CACHE D'ABORD, rafraîchi en arrière-plan ──
   Pour les icônes, le manifeste, les polices et la librairie Supabase :
   affichage instantané, et la copie se met à jour discrètement. */
async function cacheDabord(requete) {
  const cache = await caches.open(CACHE);
  const enCache = await cache.match(requete);

  const reseau = fetch(requete)
    .then((reponse) => {
      if (reponse && (reponse.ok || reponse.type === "opaque")) {
        cache.put(requete, reponse.clone());
      }
      return reponse;
    })
    .catch(() => null);

  if (enCache) return enCache;
  const frais = await reseau;
  return frais || Response.error();
}

/* ── Aiguillage ── */
self.addEventListener("fetch", (e) => {
  const requete = e.request;

  /* On ne touche qu'aux lectures : les écritures ne se mettent pas en cache. */
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);

  /* Supabase : jamais de cache. Une routine cochée doit partir sur le réseau,
     et une réponse périmée serait pire que pas de réponse du tout.
     Le temps réel (websocket) n'est pas concerné, il ne passe pas par fetch. */
  if (url.hostname.endsWith(".supabase.co")) return;

  /* L'app elle-même */
  if (requete.mode === "navigate" || requete.destination === "document") {
    e.respondWith(reseauDabord(requete));
    return;
  }

  /* Tout le reste : icônes, polices, librairie */
  if (url.origin === self.location.origin ||
      url.hostname === "fonts.googleapis.com" ||
      url.hostname === "fonts.gstatic.com" ||
      url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(cacheDabord(requete));
  }
});
