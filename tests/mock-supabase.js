/* Faux client Supabase, servi à la place de la librairie pendant les tests.
   Il reproduit les seules méthodes qu'utilise l'app ; chaque requête part vers
   window.__srv (fonction exposée par le test, qui tient l'état du serveur).
   Le temps réel : le test appelle window.__rtcb(payload). */
window.supabase = { createClient(){
  function requete(table){
    const st = { table, op: "select", filters: {}, single: false };
    const b = {
      select(c){ if (st.op !== "update" && st.op !== "insert") st.op = "select"; st.cols = c; return b; },
      update(v){ st.op = "update"; st.values = v; return b; },
      insert(v){ st.op = "insert"; st.values = v; return b; },
      eq(k, v){ st.filters[k] = v; return b; },
      order(){ return b; },
      single(){ st.single = true; return b; },
      then(ok, ko){ return window.__srv(JSON.stringify(st)).then(r => JSON.parse(r)).then(ok, ko); }
    };
    return b;
  }
  return {
    from: requete,
    channel(){ const ch = { on(e, f, cb){ window.__rtcb = cb; return ch; }, subscribe(){ return ch; } }; return ch; },
    removeChannel(){ window.__rtcb = null; }
  };
}};
