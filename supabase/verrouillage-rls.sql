-- ============================================================================
--  Petite Routine — fermeture de l'accès direct aux tables
--  À exécuter UNE FOIS dans le SQL Editor de Supabase.
-- ============================================================================
--
--  POURQUOI
--  La clé anon est publique par conception et visible dans index.html. Jusqu'ici
--  rien d'autre ne protégeait les données : une seule requête anonyme suffisait
--  à lire les huit familles et les quinze prénoms d'enfants, sans connaître le
--  moindre code famille. Vérifié le 29/10/2026.
--
--  CE QUE FAIT CE SCRIPT
--  1. Ferme tout accès direct aux tables depuis le client.
--  2. Expose à la place sept fonctions, seules portes d'entrée. Chacune exige
--     un identifiant que seul un membre de la famille possède : l'UUID de
--     l'enfant, l'UUID de la famille, ou le code PR-XXXX.
--
--  CE QUE ÇA NE FAIT PAS
--  Le code famille reste un secret à 4 caractères sur 31, soit 923 521
--  combinaisons. Ce script empêche de tout lire d'un coup ; il n'empêche pas
--  quelqu'un de très patient d'essayer les codes un par un. Allonger le code ou
--  limiter le débit est un chantier distinct.
--
--  ORDRE DE DÉPLOIEMENT — IMPORTANT
--  Mettre l'app en ligne AVANT d'exécuter ce script. Un téléphone qui porte
--  encore l'ancienne version cesserait de se synchroniser sans message
--  compréhensible pour le parent.
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. Les fonctions, seules portes d'entrée
-- ----------------------------------------------------------------------------
--  SECURITY DEFINER : la fonction s'exécute avec les droits de son
--  propriétaire, qui lui traverse la RLS. search_path figé pour qu'un objet
--  créé ailleurs ne puisse pas se substituer à une table attendue.

-- Créer une famille et son premier enfant, en une seule transaction.
create or replace function public.pr_creer_famille(
  p_code text, p_nom text, p_data jsonb
) returns table (family_id uuid, child_id uuid, code text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_fam uuid; v_enf uuid; v_nom text;
begin
  if p_code !~ '^PR-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$' then
    raise exception 'code invalide';
  end if;
  v_nom := left(btrim(coalesce(p_nom, '')), 20);
  if v_nom = '' then raise exception 'prenom requis'; end if;

  insert into pr_families (code) values (p_code) returning id into v_fam;
  insert into pr_children (family_id, name, data)
       values (v_fam, v_nom, coalesce(p_data, '{}'::jsonb))
    returning id into v_enf;

  return query select v_fam, v_enf, p_code;
end $$;

-- Rejoindre : le code famille est ici le seul secret présenté.
create or replace function public.pr_rejoindre(p_code text)
returns table (family_id uuid, code text)
language sql security definer set search_path = public, pg_temp as $$
  select id, code from pr_families
   where code = upper(btrim(p_code))
   limit 1;
$$;

-- Lister les enfants d'une famille. Exige l'UUID, jamais devinable.
create or replace function public.pr_enfants(p_famille uuid)
returns table (id uuid, name text)
language sql security definer set search_path = public, pg_temp as $$
  select c.id, c.name from pr_children c
   where c.family_id = p_famille
   order by c.created_at;
$$;

create or replace function public.pr_ajouter_enfant(
  p_famille uuid, p_nom text, p_data jsonb
) returns table (id uuid, name text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_enf uuid; v_nom text;
begin
  v_nom := left(btrim(coalesce(p_nom, '')), 20);
  if v_nom = '' then raise exception 'prenom requis'; end if;
  if not exists (select 1 from pr_families f where f.id = p_famille) then
    raise exception 'famille inconnue';
  end if;

  insert into pr_children (family_id, name, data)
       values (p_famille, v_nom, coalesce(p_data, '{}'::jsonb))
    returning pr_children.id into v_enf;

  return query select v_enf, v_nom;
end $$;

-- Lire un enfant. L'UUID de l'enfant est la clé de la synchronisation
-- quotidienne : 122 bits, hors de portée d'une énumération.
create or replace function public.pr_lire_enfant(p_enfant uuid)
returns table (id uuid, name text, data jsonb, code text)
language sql security definer set search_path = public, pg_temp as $$
  select c.id, c.name, c.data, f.code
    from pr_children c
    join pr_families f on f.id = c.family_id
   where c.id = p_enfant;
$$;

-- Mettre à jour un enfant. Un prénom vide ou absent laisse l'ancien en place :
-- c'est ce qui remplace le filet « renvoyer sans le prénom » de pushChild.
create or replace function public.pr_maj_enfant(
  p_enfant uuid, p_data jsonb, p_nom text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update pr_children
     set data       = coalesce(p_data, data),
         name       = coalesce(nullif(left(btrim(coalesce(p_nom, '')), 20), ''), name),
         updated_at = now()
   where id = p_enfant;
  if not found then raise exception 'enfant inconnu'; end if;
end $$;

-- Réveil du projet par le cron GitHub. Touche une table pour que Supabase
-- compte l'appel comme une vraie activité, sans rien divulguer.
create or replace function public.pr_ping()
returns text
language sql security definer set search_path = public, pg_temp as $$
  select coalesce((select 'ok' from pr_families limit 1), 'ok');
$$;


-- ----------------------------------------------------------------------------
--  2. Fermer les tables
-- ----------------------------------------------------------------------------
--  RLS activée sans aucune politique : tout accès direct est refusé.
--  Les fonctions ci-dessus ne sont pas concernées, leur propriétaire traverse
--  la RLS.

alter table public.pr_families enable row level security;
alter table public.pr_children enable row level security;

revoke all on public.pr_families from anon, authenticated;
revoke all on public.pr_children from anon, authenticated;


-- ----------------------------------------------------------------------------
--  3. N'ouvrir que les fonctions
-- ----------------------------------------------------------------------------

revoke execute on function public.pr_creer_famille(text, text, jsonb)  from public;
revoke execute on function public.pr_rejoindre(text)                   from public;
revoke execute on function public.pr_enfants(uuid)                     from public;
revoke execute on function public.pr_ajouter_enfant(uuid, text, jsonb) from public;
revoke execute on function public.pr_lire_enfant(uuid)                 from public;
revoke execute on function public.pr_maj_enfant(uuid, jsonb, text)     from public;
revoke execute on function public.pr_ping()                            from public;

grant execute on function public.pr_creer_famille(text, text, jsonb)  to anon;
grant execute on function public.pr_rejoindre(text)                   to anon;
grant execute on function public.pr_enfants(uuid)                     to anon;
grant execute on function public.pr_ajouter_enfant(uuid, text, jsonb) to anon;
grant execute on function public.pr_lire_enfant(uuid)                 to anon;
grant execute on function public.pr_maj_enfant(uuid, jsonb, text)     to anon;
grant execute on function public.pr_ping()                            to anon;


-- ============================================================================
--  VÉRIFIER QUE ÇA A MARCHÉ
--  Depuis un terminal, avec la clé anon publique. Le premier doit échouer,
--  le second doit répondre « ok ».
--
--    U=https://xkdymodyzktowuixpbzo.supabase.co
--    K=<la clé anon de index.html>
--
--    curl -s -o /dev/null -w '%{http_code}\n' "$U/rest/v1/pr_children?select=id" \
--      -H "apikey: $K" -H "Authorization: Bearer $K"      # attendu : 401 ou 403
--
--    curl -s -X POST "$U/rest/v1/rpc/pr_ping" \
--      -H "apikey: $K" -H "Authorization: Bearer $K"      # attendu : "ok"
-- ============================================================================
