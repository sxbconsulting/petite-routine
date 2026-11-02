/* Faux client Supabase, servi à la place de la librairie pendant les tests.
   Il reproduit les seules méthodes qu'utilise l'app ; chaque requête part vers
   window.__srv (fonction exposée par le test, qui tient l'état du serveur).

   V6.4.0 — l'app n'interroge plus les tables : elle appelle des fonctions
   (.rpc) et reçoit le temps réel par Broadcast. Le mock suit.
   Le temps réel : le serveur de test appelle window.__rtcb({ payload }). */
window.supabase = { createClient(){
  function envoyer(st){
    return window.__srv(JSON.stringify(st)).then(r => JSON.parse(r));
  }

  /* Appel de fonction : sb.rpc("nom", { … }) — avec .single() facultatif. */
  function rpc(nom, params){
    const st = { rpc: nom, params: params || {}, single: false };
    const b = {
      single(){ st.single = true; return b; },
      then(ok, ko){ return envoyer(st).then(ok, ko); }
    };
    return b;
  }

  return {
    rpc,
    channel(nom, opts){
      const ch = {
        nom,
        on(type, filtre, cb){ if (type === "broadcast") window.__rtcb = cb; return ch; },
        subscribe(){ return ch; },
        /* Ce que diffuserMaj() envoie : le serveur de test le relaie aux autres
           téléphones, jamais à celui qui l'émet (config broadcast self:false). */
        send(msg){ return envoyer({ broadcast: ch.nom, msg }); }
      };
      return ch;
    },
    removeChannel(){ window.__rtcb = null; }
  };
}};
