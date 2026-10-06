-- Saving Souls Leitstand – Rollen: Admin (die vier Konten) und Gast (gemeinsames Passwort, nur lesen)
-- Stand 06.10.2026. Einspielen: Supabase → SQL-Editor → Datei einfügen → Run. Beliebig oft wiederholbar.
-- Zurück: `261006 rollen-gast-rueckbau.sql`.
--
-- Was das Skript tut (alles in EINER Transaktion; bricht eine Zeile ab, bleibt alles wie vorher):
--   0) Prüft vorab, ohne etwas zu ändern: Tabelle docs da, pgcrypto da, Spalte auth.users.is_anonymous da und
--      GENAU die vier bekannten Konten (GitHub les-droid, GitHub jnbjonathan-beep, E-Mail les@…, E-Mail jb@…) —
--      sonst Abbruch. Niemand kann sich aussperren.
--   1) Neues Schema leitstand_intern (nicht über die API erreichbar, solange es nicht unter „Exposed schemas“
--      steht — Standard ist: nicht): Admin-Tabelle (Konto-IDs), Gast-Tabelle, Passwort-Hash, Fehlversuche, Sicherung.
--   2) Policies auf public.docs: Admins alles, eingetragene Gäste nur lesen. Die alte Policy team_docs entfällt.
--   3) Funktionen für die Oberfläche: meine_rolle(), gast_anmelden(kuerzel, passwort), gast_aufgabe_status(id, done).
--   4) Trigger-Funktion nur_team() lässt zusätzlich anonyme Konten zu (nötig für die Gast-Anmeldung).
--
-- Das Gast-Passwort setzt der Editor SELBST nach dem Einspielen mit einer Zeile (siehe Anleitung):
--   select leitstand_intern.gast_passwort_setzen('HIER-EIN-NEUES-PASSWORT');
-- Bis dahin ist kein Gast-Zugang möglich (gast_anmelden meldet „nicht_eingerichtet“).

begin;

-- ---------------------------------------------------------------------------------------------------
-- 0) Voraussetzungen. Jede Verletzung bricht das ganze Skript ab, bevor irgendetwas geändert wurde.
-- ---------------------------------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.docs') is null then
    raise exception 'Abbruch: Tabelle public.docs fehlt (schema.sql zuerst einspielen).';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous') then
    raise exception 'Abbruch: auth.users hat keine Spalte is_anonymous (Supabase Auth zu alt für anonyme Anmeldung).';
  end if;
end $$;

-- Die vier Konten, wie sie jetzt in auth.users stehen (anonyme Gäste zählen nicht). Nur für diese Transaktion.
create temp table _konten on commit drop as
select u.id as user_id,
       case
         when u.raw_app_meta_data->>'provider' = 'github' and u.raw_user_meta_data->>'user_name' = 'les-droid'          then 'LES'
         when u.raw_app_meta_data->>'provider' = 'github' and u.raw_user_meta_data->>'user_name' = 'jnbjonathan-beep'   then 'JB'
         when u.raw_app_meta_data->>'provider' = 'email'  and lower(u.email) = 'les@leitstand.dropout-films.de'         then 'LES'
         when u.raw_app_meta_data->>'provider' = 'email'  and lower(u.email) = 'jb@leitstand.dropout-films.de'          then 'JB'
       end as kuerzel,
       case when u.raw_app_meta_data->>'provider' = 'github' then 'github' else 'email' end as anbieter
  from auth.users u
 where not coalesce(u.is_anonymous, false);

do $$
declare
  n_alle int; n_erkannt int; n_gh_les int; n_gh_jb int; n_em_les int; n_em_jb int;
begin
  select count(*) into n_alle from _konten;
  select count(*) into n_erkannt from _konten where kuerzel is not null;
  select count(*) into n_gh_les from _konten where kuerzel = 'LES' and anbieter = 'github';
  select count(*) into n_gh_jb  from _konten where kuerzel = 'JB'  and anbieter = 'github';
  select count(*) into n_em_les from _konten where kuerzel = 'LES' and anbieter = 'email';
  select count(*) into n_em_jb  from _konten where kuerzel = 'JB'  and anbieter = 'email';
  if not (n_alle = 4 and n_erkannt = 4 and n_gh_les = 1 and n_gh_jb = 1 and n_em_les = 1 and n_em_jb = 1) then
    raise exception 'Abbruch, nichts geändert: erwartet genau 4 Konten (je Editor 1x GitHub, 1x E-Mail). Gefunden: nicht-anonyme Konten=%, davon erkannt=%, GitHub LES=%, GitHub JB=%, E-Mail LES=%, E-Mail JB=%.',
      n_alle, n_erkannt, n_gh_les, n_gh_jb, n_em_les, n_em_jb;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- 1) Schema und Tabellen. RLS an, KEINE Policies (= für API-Rollen gesperrt), keine Rechte für anon/authenticated.
-- ---------------------------------------------------------------------------------------------------
create schema if not exists leitstand_intern;
revoke all on schema leitstand_intern from public;
grant usage on schema leitstand_intern to authenticated;   -- nur, damit die Policy-Hilfsfunktionen aufrufbar sind

create table if not exists leitstand_intern.admins (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  kuerzel        text not null,
  eingetragen_am timestamptz not null default now()
);
create table if not exists leitstand_intern.gaeste (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kuerzel text not null,
  seit    timestamptz not null default now(),
  zuletzt timestamptz not null default now()
);
create table if not exists leitstand_intern.gast_zugang (
  id         int primary key check (id = 1),
  hash       text,                       -- bcrypt; null = noch kein Gast-Passwort gesetzt
  gesetzt_am timestamptz
);
create table if not exists leitstand_intern.gast_versuche (   -- nur FEHLversuche
  id      bigserial primary key,
  zeit    timestamptz not null default now(),
  user_id uuid
);
create index if not exists gast_versuche_zeit_idx on leitstand_intern.gast_versuche (zeit);
create table if not exists leitstand_intern.sicherung (       -- Stand vor der Umstellung, für den Rückbau
  name       text primary key,
  ddl        text not null,
  erstellt_am timestamptz not null default now()
);
insert into leitstand_intern.gast_zugang (id) values (1) on conflict (id) do nothing;

-- pgcrypto (bcrypt für das Gast-Passwort): vorhanden? Merken, damit der Rückbau es nur entfernt, wenn wir es angelegt haben.
insert into leitstand_intern.sicherung (name, ddl)
select 'erweiterung:pgcrypto_vorher', case when exists (select 1 from pg_extension where extname = 'pgcrypto') then 'ja' else 'nein' end
on conflict (name) do nothing;
create extension if not exists pgcrypto with schema extensions;
do $$
begin
  if to_regprocedure('extensions.crypt(text,text)') is null and to_regprocedure('public.crypt(text,text)') is null then
    raise exception 'Abbruch: pgcrypto (crypt) nicht gefunden.';
  end if;
end $$;

alter table leitstand_intern.admins      enable row level security;
alter table leitstand_intern.gaeste      enable row level security;
alter table leitstand_intern.gast_zugang enable row level security;
alter table leitstand_intern.gast_versuche enable row level security;
alter table leitstand_intern.sicherung   enable row level security;
revoke all on all tables    in schema leitstand_intern from public, anon, authenticated;
revoke all on all sequences in schema leitstand_intern from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Sicherung des heutigen Stands (nur beim ERSTEN Einspielen; spätere Läufe lassen sie unangetastet)
-- ---------------------------------------------------------------------------------------------------
insert into leitstand_intern.sicherung (name, ddl)
select 'policy:team_docs',
       format('create policy team_docs on public.docs as %s for %s to %s using (%s)%s',
              lower(permissive), lower(cmd), array_to_string(roles, ', '), qual,
              case when with_check is null then '' else ' with check (' || with_check || ')' end)
  from pg_policies
 where schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs'
on conflict (name) do nothing;

insert into leitstand_intern.sicherung (name, ddl)
select 'funktion:nur_team', pg_get_functiondef(to_regprocedure('public.nur_team()'))
 where to_regprocedure('public.nur_team()') is not null
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------------------------------
-- Admin-Konten eintragen (aus der geprüften Liste; sonst nichts)
-- ---------------------------------------------------------------------------------------------------
delete from leitstand_intern.admins where user_id not in (select user_id from _konten);
insert into leitstand_intern.admins (user_id, kuerzel)
select user_id, kuerzel from _konten
on conflict (user_id) do update set kuerzel = excluded.kuerzel;

-- ---------------------------------------------------------------------------------------------------
-- 2) Hilfsfunktionen für die Policies (Schema leitstand_intern, nicht über die API aufrufbar)
-- ---------------------------------------------------------------------------------------------------
create or replace function leitstand_intern.ist_admin()
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
  select exists (select 1 from leitstand_intern.admins where user_id = auth.uid());
$$;
create or replace function leitstand_intern.ist_gast()
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
  select exists (select 1 from leitstand_intern.gaeste where user_id = auth.uid());
$$;

-- Das Passwort setzt der Editor selbst (läuft nur mit Eigentümer-Rechten im SQL-Editor). Setzen löscht alle
-- bisherigen Gast-Einträge: wer das alte Passwort kannte, muss sich neu anmelden. Das Passwort steht nirgends im Klartext.
create or replace function leitstand_intern.gast_passwort_setzen(p_passwort text)
returns text language plpgsql security definer set search_path = pg_catalog, extensions, public, pg_temp as $$
declare n int;
begin
  if p_passwort is null or length(p_passwort) < 10 or length(p_passwort) > 72 then
    raise exception 'Passwort muss zwischen 10 und 72 Zeichen lang sein.';
  end if;
  update leitstand_intern.gast_zugang set hash = crypt(p_passwort, gen_salt('bf', 10)), gesetzt_am = now() where id = 1;
  delete from leitstand_intern.gast_versuche;
  delete from leitstand_intern.gaeste;
  get diagnostics n = row_count;
  return 'Gast-Passwort gesetzt. Bisherige Gast-Einträge entfernt: ' || n;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- 3) Policies auf public.docs
-- ---------------------------------------------------------------------------------------------------
alter table public.docs enable row level security;
drop policy if exists team_docs on public.docs;
drop policy if exists docs_admin on public.docs;
drop policy if exists docs_gast_lesen on public.docs;
create policy docs_admin on public.docs for all to authenticated
  using ((select leitstand_intern.ist_admin())) with check ((select leitstand_intern.ist_admin()));
create policy docs_gast_lesen on public.docs for select to authenticated
  using ((select leitstand_intern.ist_gast()));

-- ---------------------------------------------------------------------------------------------------
-- 4) Funktionen für die Oberfläche (öffentlich aufrufbar, aber nur für angemeldete Konten)
-- ---------------------------------------------------------------------------------------------------
-- Rolle des angemeldeten Kontos: {"rolle":"admin"|"gast"|"keine","kuerzel":…}. Maßgeblich ist die Konto-ID.
create or replace function public.meine_rolle()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, pg_temp as $$
declare v_k text;
begin
  select kuerzel into v_k from leitstand_intern.admins where user_id = auth.uid();
  if found then return jsonb_build_object('rolle', 'admin', 'kuerzel', v_k); end if;
  select kuerzel into v_k from leitstand_intern.gaeste where user_id = auth.uid();
  if found then return jsonb_build_object('rolle', 'gast', 'kuerzel', v_k); end if;
  return jsonb_build_object('rolle', 'keine');
end $$;

-- Gast-Anmeldung. Nur für ANONYME Konten. Gibt immer ein Ergebnis zurück (kein Fehler), damit ein Fehlversuch
-- gespeichert bleibt. Grenzen: je Sitzung 5 Fehlversuche, insgesamt 20 Fehlversuche in 15 Minuten; danach wird auch
-- das richtige Passwort abgelehnt, bis die Fehlversuche aus dem Fenster gelaufen sind. Admins brauchen diesen Weg
-- nicht und werden von der Sperre nie berührt.
create or replace function public.gast_anmelden(p_kuerzel text, p_passwort text)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, extensions, public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  c_fenster constant interval := interval '15 minutes';
  c_max_sitzung constant int := 5;
  c_max_gesamt  constant int := 20;
  v_k text; v_hash text; v_sitzung int; v_gesamt int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'grund', 'nicht_angemeldet'); end if;
  if not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return jsonb_build_object('ok', false, 'grund', 'kein_gastkonto');
  end if;

  perform pg_advisory_xact_lock(hashtext('leitstand_gast_anmelden'));   -- Versuche nacheinander, nicht parallel
  delete from leitstand_intern.gast_versuche where zeit < now() - interval '1 day';

  select hash into v_hash from leitstand_intern.gast_zugang where id = 1;
  if v_hash is null then return jsonb_build_object('ok', false, 'grund', 'nicht_eingerichtet'); end if;

  select count(*) into v_sitzung from leitstand_intern.gast_versuche where user_id = v_uid and zeit > now() - c_fenster;
  select count(*) into v_gesamt  from leitstand_intern.gast_versuche where zeit > now() - c_fenster;
  if v_sitzung >= c_max_sitzung or v_gesamt >= c_max_gesamt then
    return jsonb_build_object('ok', false, 'grund', 'gesperrt');          -- zählt nicht als weiterer Fehlversuch
  end if;

  v_k := upper(btrim(coalesce(p_kuerzel, '')));
  if v_k !~ '^[A-Z0-9ÄÖÜ]{2,8}$' then return jsonb_build_object('ok', false, 'grund', 'kuerzel_ungueltig'); end if;
  if v_k in ('CL', 'CLAUDE', 'SYSTEM', 'SEED', 'ADMIN', 'GAST')
     or exists (select 1 from leitstand_intern.admins where upper(kuerzel) = v_k) then
    return jsonb_build_object('ok', false, 'grund', 'kuerzel_reserviert');
  end if;

  if p_passwort is null or length(p_passwort) = 0 or length(p_passwort) > 200 or crypt(p_passwort, v_hash) <> v_hash then
    insert into leitstand_intern.gast_versuche (user_id) values (v_uid);
    return jsonb_build_object('ok', false, 'grund', 'passwort', 'uebrig', greatest(c_max_sitzung - v_sitzung - 1, 0));
  end if;

  insert into leitstand_intern.gaeste (user_id, kuerzel) values (v_uid, v_k)
  on conflict (user_id) do update set kuerzel = excluded.kuerzel, zuletzt = now();
  return jsonb_build_object('ok', true, 'rolle', 'gast', 'kuerzel', v_k);
end $$;

-- Statuswechsel einer Aufgabe durch einen Gast: setzt NUR done/erledigtAm (+ geaendert_von/geaendert_am) an einem
-- Dokument der Sammlung todos. Das Kürzel kommt aus der Gast-Tabelle, nicht aus dem Aufruf. Claude-Aufgaben
-- (Befehle) sind ausgenommen.
create or replace function public.gast_aufgabe_status(p_id text, p_done boolean)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_k text;
  v_ts text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  v_n int;
begin
  select kuerzel into v_k from leitstand_intern.gaeste where user_id = auth.uid();
  if v_k is null then return jsonb_build_object('ok', false, 'grund', 'kein_gast'); end if;
  if p_id is null or p_done is null then return jsonb_build_object('ok', false, 'grund', 'ungueltig'); end if;

  update public.docs d
     set data = case when p_done
                  then d.data || jsonb_build_object('done', true, 'erledigtAm', v_ts, 'geaendert_von', v_k, 'geaendert_am', v_ts)
                  else (d.data - 'erledigtAm') || jsonb_build_object('done', false, 'geaendert_von', v_k, 'geaendert_am', v_ts)
                end,
         updated_by = v_k, updated_at = now()
   where d.collection = 'todos' and d.id = p_id
     and jsonb_typeof(d.data) = 'object'
     and coalesce(d.data ->> 'typ', '') <> 'claude'
     and coalesce(d.data ->> 'wer', '') <> 'Claude'
     and coalesce(d.data ->> 'quelle', '') <> 'chat'
     and coalesce(d.data -> 'angefordert', 'false'::jsonb) <> 'true'::jsonb
     and (d.data ->> 's11status') is null;
  get diagnostics v_n = row_count;
  if v_n = 1 then return jsonb_build_object('ok', true, 'kuerzel', v_k, 'done', p_done); end if;
  if exists (select 1 from public.docs where collection = 'todos' and id = p_id) then
    return jsonb_build_object('ok', false, 'grund', 'gesperrt');   -- Claude-Aufgabe
  end if;
  return jsonb_build_object('ok', false, 'grund', 'nicht_gefunden');
end $$;

-- ---------------------------------------------------------------------------------------------------
-- 5) Trigger-Funktion: wie bisher, zusätzlich anonyme Konten (Gast-Anmeldung) und die NULL-Lücke geschlossen (s. u.).
-- ---------------------------------------------------------------------------------------------------
create or replace function public.nur_team()
returns trigger language plpgsql security definer set search_path = public as $$
declare erlaubt text[] := array['les-droid', 'jnbjonathan-beep'];   -- LES, JB; GitHub-Usernames von TS, DS hier ergänzen
begin
  -- coalesce(..., false): bisher ergab der Vergleich bei Konten OHNE E-Mail "unbekannt" statt "falsch" — solche Konten
  -- kamen durch. Jetzt gilt: kein Treffer = abgewiesen. Anonyme Konten (Gäste) sind ausdrücklich erlaubt.
  if not (
    coalesce(new.is_anonymous, false)
    or coalesce(new.raw_user_meta_data->>'user_name','') = any(erlaubt)
    or coalesce(new.email = any(array['les@leitstand.dropout-films.de','jb@leitstand.dropout-films.de']), false)
  ) then
    raise exception 'Kein Team-Mitglied: %', new.raw_user_meta_data->>'user_name';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- 6) Rechte: nichts mit erhöhten Rechten ist für anon aufrufbar; für angemeldete Konten nur die drei Oberflächen-Funktionen
-- ---------------------------------------------------------------------------------------------------
revoke all on function public.meine_rolle()                      from public, anon;
revoke all on function public.gast_anmelden(text, text)          from public, anon;
revoke all on function public.gast_aufgabe_status(text, boolean) from public, anon;
grant execute on function public.meine_rolle()                      to authenticated;
grant execute on function public.gast_anmelden(text, text)          to authenticated;
grant execute on function public.gast_aufgabe_status(text, boolean) to authenticated;

revoke all on function leitstand_intern.ist_admin()                  from public, anon, authenticated;
revoke all on function leitstand_intern.ist_gast()                   from public, anon, authenticated;
revoke all on function leitstand_intern.gast_passwort_setzen(text)   from public, anon, authenticated;
grant execute on function leitstand_intern.ist_admin() to authenticated;   -- nötig, damit die Policies auswertbar sind
grant execute on function leitstand_intern.ist_gast()  to authenticated;

revoke execute on function public.nur_team() from public, anon, authenticated;   -- nur Trigger
do $$                                   -- Befehls-Funktion bleibt dem Dienstschlüssel vorbehalten (Absicherung, falls älterer Stand)
begin
  if to_regprocedure('public.s11_claim(text,text)') is not null then
    revoke execute on function public.s11_claim(text, text) from public, anon, authenticated;
  end if;
  if to_regprocedure('public.s11_claim(text)') is not null then
    revoke execute on function public.s11_claim(text) from public, anon, authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- 7) Schlussprüfung: alle vier Konten sind Admin, beide Policies stehen, die alte ist weg. Sonst alles zurück.
-- ---------------------------------------------------------------------------------------------------
do $$
begin
  if (select count(*) from leitstand_intern.admins a join auth.users u on u.id = a.user_id) <> 4 then
    raise exception 'Abbruch: Admin-Tabelle enthält nicht genau die vier Konten.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'docs'
       and policyname in ('docs_admin', 'docs_gast_lesen')) <> 2
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs') then
    raise exception 'Abbruch: Policies auf docs nicht wie erwartet.';
  end if;
end $$;

commit;
