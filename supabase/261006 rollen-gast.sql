-- Saving Souls Leitstand – Rollen: Admin (die vier Konten) und Gast (gemeinsames Passwort, nur lesen)
-- Stand 06.10.2026 (Nachbesserung nach drei Prüfungen). Einspielen: Supabase → SQL-Editor → Datei einfügen → Run.
-- Zurück: `261006 rollen-gast-rueckbau.sql` (Teil 1; Teil 2 nur, wenn der alte Wortlaut gewünscht ist).
--
-- Was das Skript tut (alles in EINER Transaktion; bricht eine Zeile ab, bleibt alles wie vorher):
--   0) Prüft vorab, ohne etwas zu ändern, und bricht mit einer lesbaren Liste ab, wenn eine Annahme nicht stimmt:
--        - Rechte des ausführenden Nutzers: keine Frage nach „Eigentümer“, sondern eine PROBE in einem Unterblock, der am Ende
--          zurückgerollt wird (Trigger auf auth.users anlegen und wieder entfernen, eine Zeile in auth.users löschen, Tabelle mit Verweis darauf und
--          Schema anlegen, Regel auf docs und nur_team() ändern). Scheitert ein Schritt, bricht das Skript mit diesem Schritt ab.
--        - keine fremde Regel in `public` oder `storage`, die der Rolle authenticated/anon/public etwas erlaubt;
--          kein öffentlicher Speicher-Bucket,
--        - keine weitere Tabelle/Sicht ohne Schutz und keine weitere Funktion in `public`, die ein angemeldetes Konto
--          (also auch ein anonymer Gast) aufrufen darf, außer dem bekannten Bestand,
--        - Kontenbestand laut auth.identities: genau 2x GitHub (les-droid, jnbjonathan-beep) und 2x E-Mail
--          (les@…, jb@…), sonst nichts; beim ersten Einspielen keine anonymen Konten. Erkannt wird NIE über Angaben,
--          die ein Nutzer selbst setzen kann (user_metadata).
--        - Jedes weitere Einspielen füllt die Admin-Tabelle NICHT neu: es bricht ab, wenn die eingetragenen
--          Konto-IDs nicht mehr genau den vier Konten entsprechen.
--   1) Schema leitstand_intern (nicht über die API erreichbar, solange es nicht unter „Exposed schemas“ steht):
--      Admin-Tabelle, Gast-Tabelle, Passwort-Hash, Fehlversuche, Sicherung.
--   2) Policies auf public.docs: Admins alles, eingetragene Gäste nur lesen. Die alte Policy team_docs entfällt.
--   3) Funktionen für die Oberfläche: meine_rolle(), gast_anmelden(kuerzel, passwort), gast_aufgabe_status(id, done).
--   4) Trigger auf auth.users: nur_team() bindet die Zulassung an den ANBIETER, den der Anmeldedienst serverseitig setzt
--      (raw_app_meta_data->>'provider'): GitHub-Name nur bei Anbieter github, die zwei Kürzel-Adressen nur bei Anbieter email,
--      anonyme Konten (Gast-Anmeldung) wie bisher. Ein E-Mail-Konto mit selbst gesetztem user_name eines Admins wird
--      abgewiesen (das war die Lücke der alten Prüfung). nur_team_aenderung() verhindert, dass ein anonymes Konto
--      nachträglich in ein festes umgewandelt wird — auch nicht auf eine Team-Adresse.
--
-- Das Gast-Passwort setzt der Editor SELBST nach dem Einspielen mit einer Zeile (siehe Anleitung):
--   select leitstand_intern.gast_passwort_setzen('HIER-EIN-NEUES-PASSWORT');
-- Vorgabe: zufällig erzeugt (Passwortmanager). Der Server verlangt mindestens 20 Zeichen aus mindestens drei Klassen
-- (Kleinbuchstaben, Großbuchstaben, Ziffern, Sonderzeichen), mindestens 8 verschiedene Zeichen und weist den Platzhalter
-- „HIER-…“ ab; ob das Passwort wirklich zufällig ist, kann er nicht prüfen.
-- In der Datenbank steht nur ein Hash. Im Klartext steht das Passwort aber im VERLAUF des SQL-Editors (und je nach
-- Einstellung im Datenbankprotokoll): den Eintrag dort danach löschen (siehe Anleitung).
-- Bis dahin ist kein Gast-Zugang möglich (gast_anmelden meldet „nicht_eingerichtet“).

begin;

-- ---------------------------------------------------------------------------------------------------
-- 0a) Grundvoraussetzungen. Jede Verletzung bricht das ganze Skript ab, bevor irgendetwas geändert wurde.
-- ---------------------------------------------------------------------------------------------------
do $grund$
declare v_r text[] := array[]::text[]; v_t text; v_schritt text;
begin
  if to_regclass('public.docs') is null then
    raise exception 'Abbruch: Tabelle public.docs fehlt (schema.sql zuerst einspielen).';
  end if;
  if to_regclass('auth.identities') is null then
    raise exception 'Abbruch: Tabelle auth.identities nicht gefunden (Supabase Auth zu alt oder unerwartet aufgebaut).';
  end if;
  if not exists (select 1 from pg_attribute
                  where attrelid = 'auth.users'::regclass and attname = 'is_anonymous' and not attisdropped) then
    raise exception 'Abbruch: auth.users hat keine Spalte is_anonymous (Supabase Auth zu alt für anonyme Anmeldung).';
  end if;
  if not exists (select 1 from pg_namespace where nspname = 'extensions') then
    raise exception 'Abbruch: Schema extensions fehlt (pgcrypto wird dort erwartet).';
  end if;
  -- Rechte des ausführenden Nutzers. Der SQL-Editor läuft NICHT als Superuser. Statt zu fragen, ob er „Eigentümer“ von
  -- auth.users ist (das sagt nichts darüber, was die Plattform ihm erlaubt), wird das, was dieses Skript später tun muss,
  -- einmal ausprobiert — in einem Unterblock, der am Ende absichtlich scheitert und damit ALLES zurückrollt (nichts bleibt:
  -- keine Funktion, kein Trigger, kein Schema, keine Regel, keine gelöschte Zeile). Auch das ENTFERNEN
  -- eines Triggers auf auth.users wird geprobt: Das Skript selbst braucht es nicht, der Rückbau aber schon. Dürfte der
  -- Nutzer Trigger anlegen, aber nicht entfernen, liefe das Einspielen durch und der Rückbau scheiterte im Ernstfall —
  -- deshalb bricht das Einspielen dann ab. Vor allem anderen, damit die Liste lesbar ist (sonst
  -- bräche schon das Lesen von auth.identities mit einer Rohmeldung ab).
  foreach v_t in array array['auth.users', 'auth.identities'] loop
    if not has_table_privilege(current_user, v_t, 'SELECT') then
      v_r := v_r || format('Rechte: %s darf %s nicht lesen.', current_user, v_t);
    end if;
  end loop;
  begin
    v_schritt := 'Funktion in public anlegen';
    create function public.leitstand_probe_fn() returns trigger language plpgsql as $p$ begin return new; end $p$;
    v_schritt := 'Trigger auf auth.users anlegen';
    create trigger leitstand_probe_trg before insert on auth.users for each row execute function public.leitstand_probe_fn();
    v_schritt := 'Trigger auf auth.users entfernen';
    drop trigger leitstand_probe_trg on auth.users;
    v_schritt := 'eine Zeile in auth.users löschen (wird zurückgerollt)';
    delete from auth.users where id = (select id from auth.users order by coalesce(is_anonymous, false) desc, created_at desc limit 1);
    v_schritt := 'Schema anlegen';
    create schema leitstand_probe_schema;
    v_schritt := 'Tabelle mit Verweis auf auth.users anlegen';
    create table leitstand_probe_schema.t (user_id uuid primary key references auth.users (id) on delete cascade);
    v_schritt := 'Regel auf public.docs anlegen';
    create policy leitstand_probe_pol on public.docs for select to authenticated using (false);
    v_schritt := 'public.nur_team() ändern';
    if to_regprocedure('public.nur_team()') is not null then
      alter function public.nur_team() set search_path = public;
    end if;
    raise exception 'Probe zu Ende' using errcode = 'LP001';   -- rollt alles Obige zurück
  exception
    when sqlstate 'LP001' then null;                            -- alles gelang, alles zurückgerollt
    when others then
      v_r := v_r || format('Rechte: Probe fehlgeschlagen für %s — Schritt „%s“: %s', current_user, v_schritt, sqlerrm);
  end;
  -- Zeilenschutz: Die Prüfungen unten lesen auth.users, auth.identities und storage.buckets. Gilt für den ausführenden
  -- Nutzer dort Zeilenschutz (RLS), sähe er nur einen Teil der Zeilen — die Prüfungen wären dann grundlos „in Ordnung“
  -- (z. B. ein öffentlicher Bucket bliebe unbemerkt). Der SQL-Editor-Nutzer umgeht den Zeilenschutz (BYPASSRLS).
  foreach v_t in array array['auth.users', 'auth.identities', 'storage.buckets'] loop
    begin
      if to_regclass(v_t) is not null and row_security_active(to_regclass(v_t)) then
        v_r := v_r || format('Rechte: für %s gilt auf %s Zeilenschutz — die Vorab-Prüfungen sähen nicht alle Zeilen.', current_user, v_t);
      end if;
    exception when insufficient_privilege then
      v_r := v_r || format('Rechte: %s darf %s nicht ansehen (%s).', current_user, v_t, sqlerrm);
    end;
  end loop;
  if cardinality(v_r) > 0 then
    raise exception E'Abbruch, nichts geändert. Probe fehlgeschlagen (Rechte, Verweis oder Sperre) — gescheiterter Schritt und Meldung der Datenbank stehen je Zeile (%):\n - %', cardinality(v_r), array_to_string(v_r, E'\n - ');
  end if;
end $grund$;

-- Die Anmelde-Identitäten, wie sie jetzt in auth.identities stehen. Maßgeblich ist der ANBIETER (GitHub bzw. E-Mail),
-- nicht user_metadata. Nur für diese Transaktion.
create temp table _konten on commit drop as
select i.user_id,
       case
         when i.provider = 'github' and lower(i.identity_data->>'user_name') = 'les-droid'                 then 'LES'
         when i.provider = 'github' and lower(i.identity_data->>'user_name') = 'jnbjonathan-beep'          then 'JB'
         when i.provider = 'email'  and lower(i.identity_data->>'email')     = 'les@leitstand.dropout-films.de' then 'LES'
         when i.provider = 'email'  and lower(i.identity_data->>'email')     = 'jb@leitstand.dropout-films.de'  then 'JB'
       end as kuerzel,
       i.provider as anbieter
  from auth.identities i;

-- ---------------------------------------------------------------------------------------------------
-- 0b) Prüfungen der Annahmen über die Plattform und die Konten — alle auf einmal, als Liste.
-- ---------------------------------------------------------------------------------------------------
do $vorab$
declare
  v_f text[] := array[]::text[];          -- Befunde; leer = alles in Ordnung
  v_t text;
  n_ident int; n_unbekannt int; n_gh_les int; n_gh_jb int; n_em_les int; n_em_jb int;
  n_fest int; n_fest_ohne int; n_anon int; n_anon_ident int; n_user_ident int;
  v_erst boolean := true; n_admins int; n_admins_ok int;
begin
  -- (B) Regeln: in `public` und `storage` darf es keine Regel geben, die authenticated/anon/public etwas erlaubt,
  --     außer den eigenen auf public.docs (team_docs wird ersetzt, muss aber die bekannte Alles-Regel sein).
  --     Anonyme Gäste laufen als Rolle authenticated.
  for v_t in
    select format('Regel „%s“ auf %s.%s (%s, für %s)', policyname, schemaname, tablename, cmd, array_to_string(roles, ','))
      from pg_policies
     where schemaname in ('public', 'storage')
       and roles && array['authenticated', 'anon', 'public']::name[]
       and not (schemaname = 'public' and tablename = 'docs' and policyname in ('docs_admin', 'docs_gast_lesen'))
       and not (schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs'
                and cmd = 'ALL' and roles = array['authenticated']::name[]
                and ((qual = 'true' and with_check = 'true')                                   -- Stand vor der Umstellung
                     or (qual like '%team_konto_ok%' and with_check like '%team_konto_ok%')))  -- Stand nach Rückbau Teil 1
     order by 1
  loop
    v_f := v_f || ('Fremde Regel (würde einem anonymen Gast Zugriff geben): ' || v_t);
  end loop;
  if to_regclass('storage.buckets') is not null then
    for v_t in execute 'select name from storage.buckets where public order by 1' loop
      v_f := v_f || format('Öffentlicher Speicher-Bucket (jeder kann lesen): %s', v_t);
    end loop;
  end if;

  -- (C) Weitere Tabellen/Sichten in public ohne Schutz, weitere Funktionen, die ein angemeldetes Konto ausführen darf.
  for v_t in
    select format('%s public.%s', case c.relkind when 'v' then 'Sicht' when 'm' then 'Materialisierte Sicht' when 'f' then 'Fremdtabelle' else 'Tabelle' end, c.relname)
      from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f') and c.relname <> 'docs'
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
       and ( (c.relkind in ('r', 'p') and not c.relrowsecurity
              and (has_table_privilege('anon', c.oid, 'select,insert,update,delete') or has_table_privilege('authenticated', c.oid, 'select,insert,update,delete')))
          or (c.relkind in ('v', 'm', 'f')
              and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'))) )
     order by 1
  loop
    v_f := v_f || ('Ungeschützt für angemeldete Konten (Gäste): ' || v_t);
  end loop;
  for v_t in
    select 'public.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))
       and (p.proname || '(' || oidvectortypes(p.proargtypes) || ')') not in (
             'docs_patch(text, text, jsonb, text)', 's11_claim(text, text)', 'nur_team()',
             'nur_team_aenderung()', 'team_konto_ok()', 'meine_rolle()', 'gast_anmelden(text, text)', 'gast_aufgabe_status(text, boolean)')
     order by 1
  loop
    v_f := v_f || ('Unbekannte Funktion, die ein angemeldetes Konto (auch ein Gast) aufrufen darf: ' || v_t);
  end loop;
  -- docs_patch ist die einzige bekannte Funktion, die für angemeldete Konten aufrufbar BLEIBT und von diesem Skript
  -- nicht neu geschrieben wird. Sie muss mit den Rechten des Aufrufers laufen (security invoker, wie in schema.sql);
  -- mit erhöhten Rechten würde sie die Regeln auf docs umgehen — jedes anonyme Konto könnte dann alles überschreiben.
  for v_t in
    select 'public.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname = 'docs_patch' and p.prosecdef
     order by 1
  loop
    v_f := v_f || ('Funktion läuft mit erhöhten Rechten (SECURITY DEFINER) und würde die Regeln auf docs umgehen — erwartet ist security invoker: ' || v_t);
  end loop;

  -- (D) Die Trigger-Funktion nur_team() muss die bekannte Fassung sein (alt, oder neu aus einem früheren Lauf).
  select regexp_replace(lower(pg_get_functiondef(p.oid)), '\s', '', 'g') into v_t
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'nur_team' limit 1;
  if v_t is null then
    v_f := array_append(v_f, 'Trigger-Funktion public.nur_team() fehlt (schema.sql, Abschnitt 6, zuerst einspielen).'::text);
  elsif v_t not like '%array[''les-droid'',''jnbjonathan-beep'']%' or v_t not like '%''les@leitstand.dropout-films.de'',''jb@leitstand.dropout-films.de''%' then
    v_f := array_append(v_f, 'public.nur_team() weicht von der bekannten Fassung ab (andere Namen/Adressen?) — der Rückbau würde sie nicht wiederherstellen.'::text);
  end if;
  -- Vorhandene Trigger gleichen Namens bleiben weiter unten unangetastet. Deshalb hier prüfen, dass sie wirklich
  -- wirken: eingeschaltet, vor dem Schreiben, je Zeile, ohne Bedingung/Spaltenliste, und an der erwarteten Funktion.
  -- (Ein abgeschalteter oder anders gebauter Trigger mit dem richtigen Namen würde sonst als „vorhanden“ durchgehen.)
  for v_t in
    select t.tgname::text
      from pg_trigger t
     where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
       and t.tgname in ('nur_team_trg', 'nur_team_aenderung_trg')
       and not coalesce(                                                                        -- coalesce: „unbekannt“ (Funktion fehlt) zählt als falsch
                 t.tgenabled in ('O', 'A') and t.tgqual is null and t.tgattr::text = ''
                 and (t.tgtype::int & 3) = 3                                                   -- je Zeile (1), vorher (2)
                 and ( (t.tgname = 'nur_team_trg'           and (t.tgtype::int & 4)  = 4  and t.tgfoid = to_regprocedure('public.nur_team()')::oid)
                    or (t.tgname = 'nur_team_aenderung_trg' and (t.tgtype::int & 16) = 16 and t.tgfoid = to_regprocedure('public.nur_team_aenderung()')::oid) ), false)
     order by 1
  loop
    v_f := v_f || format('Trigger %s auf auth.users ist abgeschaltet oder anders gebaut als erwartet (er würde nicht schützen).', v_t);
  end loop;

  -- (E) Kontenbestand. Erster Lauf: genau die vier festen Konten, keine anonymen. Spätere Läufe: dieselben vier;
  --     anonyme Gäste dürfen da sein.
  if to_regclass('leitstand_intern.admins') is not null then
    execute 'select not exists (select 1 from leitstand_intern.admins)' into v_erst;
  end if;
  select count(*), count(*) filter (where kuerzel is null),
         count(*) filter (where kuerzel = 'LES' and anbieter = 'github'), count(*) filter (where kuerzel = 'JB' and anbieter = 'github'),
         count(*) filter (where kuerzel = 'LES' and anbieter = 'email'),  count(*) filter (where kuerzel = 'JB' and anbieter = 'email'),
         count(distinct user_id)
    into n_ident, n_unbekannt, n_gh_les, n_gh_jb, n_em_les, n_em_jb, n_user_ident
    from _konten;
  select count(*) filter (where not coalesce(is_anonymous, false)),
         count(*) filter (where not coalesce(is_anonymous, false) and id not in (select user_id from _konten)),
         count(*) filter (where coalesce(is_anonymous, false))
    into n_fest, n_fest_ohne, n_anon from auth.users;
  select count(*) into n_anon_ident from _konten k join auth.users u on u.id = k.user_id where coalesce(u.is_anonymous, false);
  if not (n_ident = 4 and n_unbekannt = 0 and n_gh_les = 1 and n_gh_jb = 1 and n_em_les = 1 and n_em_jb = 1
          and n_user_ident = 4 and n_fest = 4 and n_fest_ohne = 0 and n_anon_ident = 0) then
    v_f := v_f || format('Konten: erwartet genau 4 feste Konten (je Editor 1x GitHub, 1x E-Mail). Gefunden: feste Konten=%s, Anmelde-Identitäten=%s (davon unbekannt=%s, an anonymen Konten=%s), feste Konten ohne erkannte Identität=%s, GitHub LES=%s, GitHub JB=%s, E-Mail LES=%s, E-Mail JB=%s. Fehlt ein Konto oder musste es neu angelegt werden: zuerst das Konto anlegen bzw. sich einmal damit anmelden (Authentication → Users zeigt es), dann dieses Skript erneut starten.',
      n_fest, n_ident, n_unbekannt, n_anon_ident, n_fest_ohne, n_gh_les, n_gh_jb, n_em_les, n_em_jb);
  end if;
  if v_erst and n_anon <> 0 then
    v_f := v_f || format('Konten: beim ersten Einspielen darf es noch keine anonymen Konten geben (gefunden: %s). Schalter „Anonymous Sign-Ins“ aus lassen und die Konten unter Authentication → Users ansehen.', n_anon);
  end if;
  if not v_erst then
    execute 'select count(*) from leitstand_intern.admins' into n_admins;
    execute 'select count(*) from leitstand_intern.admins a join _konten k on k.user_id = a.user_id' into n_admins_ok;
  end if;
  if not v_erst and not (n_admins = 4 and n_admins_ok = 4) then
    v_f := array_append(v_f, 'Admin-Tabelle: die eingetragenen Konto-IDs entsprechen nicht mehr genau den vier festen Konten (Konto neu angelegt oder gelöscht?). Es wurde nichts verändert. HANDWEG, wenn eines der vier Konten neu angelegt werden musste (neue Konto-ID; das neue Konto hat bis dahin KEINEN Zugriff): 1) Authentication → Users: die Konto-ID (UUID) des NEUEN Kontos kopieren und prüfen, dass es das richtige ist (E-Mail bzw. GitHub-Name). 2) Im SQL-Editor, mit eingesetzter ID und dem Kürzel LES oder JB: insert into leitstand_intern.admins (user_id, kuerzel) select u.id, ''<LES oder JB>'' from auth.users u where u.id = ''<ID>'' and not coalesce(u.is_anonymous, false) on conflict (user_id) do nothing;  (Die Zeile des gelöschten Kontos ist von selbst weg.) Danach die Zahl der eingefügten Zeilen prüfen: erwartet 1 (bei 0 stimmt die ID nicht, oder das Konto ist anonym oder schon eingetragen — dann nichts weiter tun, Liste an Main). 3) Dieses Skript erneut starten. Alternativ: erst den Rückbau (Teil 1) — er bricht bei einem neuen Konto ebenfalls ab, solange es nicht eingetragen ist.'::text);
  end if;

  if cardinality(v_f) > 0 then
    raise exception E'Abbruch, nichts geändert. % Befund(e) — diese Liste (ohne Passwörter, ohne Namen) an Main schicken, nicht „einfach durchlaufen lassen“:\n - %',
      cardinality(v_f), array_to_string(v_f, E'\n - ');
  end if;
end $vorab$;

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
-- Admin-Konten eintragen: NUR beim ersten Einspielen (Admin-Tabelle leer). Jedes weitere Einspielen füllt sie nicht
-- neu — die Vorab-Prüfung oben hat bereits abgebrochen, falls die Einträge nicht mehr genau den vier Konten entsprechen.
-- ---------------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from leitstand_intern.admins) then
    insert into leitstand_intern.admins (user_id, kuerzel)
    select user_id, min(kuerzel) from _konten group by user_id;
  end if;
end $$;

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
-- bisherigen Gast-Einträge: wer das alte Passwort kannte, muss sich neu anmelden. Erzwungen werden hier: mindestens
-- 20 Zeichen (höchstens 72 Byte), Zeichen aus mindestens drei Klassen (Kleinbuchstaben, Großbuchstaben, Ziffern,
-- Sonderzeichen), mindestens 8 verschiedene Zeichen, nicht der Platzhalter aus Anleitung/Kopfzeile. Ob das Passwort
-- ZUFÄLLIG ist, kann der Server nicht prüfen („Passwort1234567890123“ nimmt er an): es soll aus dem Passwortmanager kommen.
-- Gespeichert wird nur ein Hash; im Klartext steht das Passwort im Verlauf des SQL-Editors — dort löschen.
create or replace function leitstand_intern.gast_passwort_setzen(p_passwort text)
returns text language plpgsql security definer set search_path = pg_catalog, extensions, public, pg_temp as $$
declare n int;
begin
  if p_passwort is null or length(p_passwort) < 20 or octet_length(p_passwort) > 72 then
    raise exception 'Passwort muss mindestens 20 Zeichen lang sein (höchstens 72 Byte).';
  end if;
  -- Der Platzhalter aus Anleitung und Kopfzeile („HIER-…“) steht im öffentlich lesbaren Repo und ist lang genug, um die
  -- Prüfungen unten zu bestehen. Wer die Zeile kopiert und das Ersetzen vergisst, hätte ein öffentlich bekanntes Passwort.
  if upper(btrim(p_passwort)) like 'HIER-%' then
    raise exception 'Das ist der Platzhalter aus der Anleitung, kein Passwort. Bitte ein zufälliges Passwort aus dem Passwortmanager einsetzen (20+ Zeichen).';
  end if;
  if (select count(distinct c) from regexp_split_to_table(p_passwort, '') as c) < 8 then
    raise exception 'Passwort zu einfach: mindestens 8 verschiedene Zeichen. Bitte aus dem Passwortmanager erzeugen (20+ Zeichen).';
  end if;
  if (p_passwort ~ '[[:lower:]]')::int + (p_passwort ~ '[[:upper:]]')::int + (p_passwort ~ '[[:digit:]]')::int
     + (p_passwort ~ '[^[:alnum:]]')::int < 3 then
    raise exception 'Passwort zu einfach: Zeichen aus mindestens drei Klassen (Kleinbuchstaben, Großbuchstaben, Ziffern, Sonderzeichen). Bitte aus dem Passwortmanager erzeugen (20+ Zeichen).';
  end if;
  -- Dieselbe Sperre wie gast_anmelden: Ohne sie könnte eine Anmeldung, die gerade noch das ALTE Passwort prüft, ihren
  -- Gast-Eintrag erst NACH dem Löschen unten schreiben — wer das alte Passwort kennt und im Takt weiter anmeldet,
  -- bliebe trotz Passwortwechsel Gast. Mit der Sperre wartet der Wechsel laufende Anmeldungen ab; spätere sehen den neuen Hash.
  perform pg_advisory_xact_lock(hashtext('leitstand_gast_anmelden'));
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
drop function if exists public.team_konto_ok();   -- Hilfe der verschärften Regel aus Rückbau Teil 1 (falls vorhanden)
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
-- gespeichert bleibt. Schutz vor Raten:
--   * Das Passwort soll lang und zufällig sein (Passwortmanager, 20+ Zeichen, drei Zeichenklassen): dann ist Raten
--     auch ohne jede Bremse aussichtslos.
--   * Je Sitzung 5 Fehlversuche in 15 Minuten, danach „gesperrt“ für diese Sitzung (abgelehnte Versuche zählen nicht mit).
--   * Parallele Aufrufe laufen nacheinander (Sperre unten), damit niemand die Grenze im Takt überholt.
--   * Das Rate-Limit der Plattform für anonyme Anmeldungen bremst das Anlegen immer neuer Sitzungen.
--   Bewusst NICHT mehr vorhanden: eine Wartezeit über alle Sitzungen zusammen. Sie ließ Fremde, die nur falsch rieten, echte
--   Gäste hinhalten, und schützte bei einem zufälligen 20-Zeichen-Passwort nichts. Die Tabelle gast_versuche bleibt als
--   Protokoll (Zeilen älter als ein Tag werden bei der nächsten Anmeldung entfernt) — daran erkennt man Rateversuche.
-- Admins brauchen diesen Weg nicht und werden von all dem nie berührt.
create or replace function public.gast_anmelden(p_kuerzel text, p_passwort text)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, extensions, public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  c_fenster     constant interval := interval '15 minutes';
  c_max_sitzung constant int := 5;
  v_k text; v_hash text; v_sitzung int;
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
  if v_sitzung >= c_max_sitzung then
    return jsonb_build_object('ok', false, 'grund', 'gesperrt');          -- zählt nicht als weiterer Fehlversuch
  end if;

  v_k := upper(btrim(coalesce(p_kuerzel, '')));
  if v_k !~ '^[A-Z0-9ÄÖÜ]{2,8}$' then return jsonb_build_object('ok', false, 'grund', 'kuerzel_ungueltig'); end if;
  -- Gesperrt: die Team-Kürzel (aus der Admin-Tabelle), feste Wörter und jeweils dasselbe mit angehängten Ziffern (LES1).
  -- TS und DS sind als Gast-Kürzel erlaubt; unterscheidbar bleibt es über updated_by = gast:<KÜRZEL> und geaendert_rolle.
  if exists (select 1 from unnest(array['CL', 'CLAUDE', 'SYSTEM', 'SEED', 'ADMIN', 'GAST']) w where v_k ~ ('^' || w || '[0-9]*$'))
     or exists (select 1 from leitstand_intern.admins a where v_k ~ ('^' || upper(a.kuerzel) || '[0-9]*$')) then
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

-- Statuswechsel einer Aufgabe durch einen Gast: setzt NUR done/erledigtAm (+ geaendert_von/geaendert_am/geaendert_rolle)
-- an einem Dokument der Sammlung todos, das eine Aufgabe ist (hat ein Feld text). Das Kürzel kommt aus der
-- Gast-Tabelle, nicht aus dem Aufruf. Ausgenommen: Claude-Aufgaben (Befehle) und Rückfragen (typ frage) — Gäste
-- dürfen weder Befehle noch Rückfragen abhaken.
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
                  then d.data || jsonb_build_object('done', true, 'erledigtAm', v_ts, 'geaendert_von', v_k, 'geaendert_am', v_ts, 'geaendert_rolle', 'gast')
                  else (d.data - 'erledigtAm') || jsonb_build_object('done', false, 'geaendert_von', v_k, 'geaendert_am', v_ts, 'geaendert_rolle', 'gast')
                end,
         updated_by = 'gast:' || v_k, updated_at = now()
   where d.collection = 'todos' and d.id = p_id
     and jsonb_typeof(d.data) = 'object'
     and d.data ? 'text'
     and coalesce(d.data ->> 'typ', '') not in ('claude', 'frage')
     and coalesce(d.data ->> 'wer', '') <> 'Claude'
     and coalesce(d.data ->> 'quelle', '') <> 'chat'
     and coalesce(d.data -> 'angefordert', 'false'::jsonb) <> 'true'::jsonb
     and (d.data ->> 's11status') is null;
  get diagnostics v_n = row_count;
  if v_n = 1 then return jsonb_build_object('ok', true, 'kuerzel', v_k, 'done', p_done); end if;
  if exists (select 1 from public.docs where collection = 'todos' and id = p_id) then
    return jsonb_build_object('ok', false, 'grund', 'gesperrt');   -- Claude-Aufgabe, Rückfrage oder keine Aufgabe
  end if;
  return jsonb_build_object('ok', false, 'grund', 'nicht_gefunden');
end $$;

-- ---------------------------------------------------------------------------------------------------
-- 5) Trigger auf auth.users
--    nur_team (beim Anlegen): die Zulassung hängt am ANBIETER, den der Anmeldedienst serverseitig setzt
--    (raw_app_meta_data->>'provider'; ein Nutzer kann ihn beim Registrieren nicht setzen, anders als raw_user_meta_data):
--      * GitHub-Weg: nur Anbieter github UND einer der zwei GitHub-Namen,
--      * Kürzel-Konten-Weg: nur Anbieter email UND eine der zwei Adressen,
--      * anonyme Konten (Gast-Anmeldung): wie bisher zugelassen.
--    Ein E-Mail-Konto mit selbst gesetztem user_name eines Admins wird damit abgewiesen — die alte Prüfung ließ es durch.
--    (Reine Verbesserung gegenüber dem Stand vor der Umstellung; der Rückbau stellt diese Fassung ohne die anonymen Konten her.)
--    nur_team_aenderung (beim Ändern): ein anonymes Konto darf nicht nachträglich zu einem festen werden (E-Mail/
--    Telefon setzen, is_anonymous umschalten) — auch nicht auf eine der Team-Adressen.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.nur_team()
returns trigger language plpgsql security definer set search_path = public as $$
declare erlaubt text[] := array['les-droid', 'jnbjonathan-beep'];   -- LES, JB; GitHub-Usernames von TS, DS hier ergänzen
begin
  -- coalesce(..., false): kein Treffer = abgewiesen (auch bei Konten ohne E-Mail oder ohne Anbieter).
  if not (
    coalesce(new.is_anonymous, false)
    or (coalesce(new.raw_app_meta_data->>'provider', '') = 'github'
        and coalesce(new.raw_user_meta_data->>'user_name', '') = any(erlaubt))
    or (coalesce(new.raw_app_meta_data->>'provider', '') = 'email'
        and coalesce(new.email = any(array['les@leitstand.dropout-films.de','jb@leitstand.dropout-films.de']), false))
  ) then
    raise exception 'Kein Team-Mitglied: %', new.raw_user_meta_data->>'user_name';
  end if;
  return new;
end $$;

create or replace function public.nur_team_aenderung()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(old.is_anonymous, false)
     and ( not coalesce(new.is_anonymous, false)
           or new.email is distinct from old.email
           or new.phone is distinct from old.phone ) then
    raise exception 'Ein Gast-Konto darf nicht in ein festes Konto umgewandelt werden.';
  end if;
  return new;
end $$;

do $$                                   -- nur anlegen, was fehlt (vorhandene Trigger bleiben unangetastet)
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'nur_team_trg' and not tgisinternal) then
    create trigger nur_team_trg before insert on auth.users for each row execute function public.nur_team();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'nur_team_aenderung_trg' and not tgisinternal) then
    create trigger nur_team_aenderung_trg before update on auth.users for each row execute function public.nur_team_aenderung();
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- 6) Rechte. Für anon ist nichts mit erhöhten Rechten aufrufbar; für angemeldete Konten nur die drei Oberflächen-
--    Funktionen (und die zwei Policy-Hilfen im nicht ausgelieferten Schema). Der Dienstschlüssel (service_role)
--    umgeht die Regeln ohnehin und behält die Standardrechte der Plattform: er gehört nur den Hintergrunddiensten.
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

revoke execute on function public.nur_team() from public, anon, authenticated;              -- nur Trigger
revoke execute on function public.nur_team_aenderung() from public, anon, authenticated;     -- nur Trigger
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
  if (select count(*) from leitstand_intern.admins a join auth.users u on u.id = a.user_id) <> 4
     or (select count(*) from leitstand_intern.admins) <> 4 then
    raise exception 'Abbruch: Admin-Tabelle enthält nicht genau die vier Konten.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'docs'
       and policyname in ('docs_admin', 'docs_gast_lesen')) <> 2
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs') then
    raise exception 'Abbruch: Policies auf docs nicht wie erwartet.';
  end if;
  if (select count(*) from pg_trigger t
       where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
         and t.tgenabled in ('O', 'A') and t.tgqual is null and t.tgattr::text = '' and (t.tgtype::int & 3) = 3
         and ( (t.tgname = 'nur_team_trg'           and (t.tgtype::int & 4)  = 4  and t.tgfoid = 'public.nur_team()'::regprocedure::oid)
            or (t.tgname = 'nur_team_aenderung_trg' and (t.tgtype::int & 16) = 16 and t.tgfoid = 'public.nur_team_aenderung()'::regprocedure::oid) )) <> 2 then
    raise exception 'Abbruch: Trigger auf auth.users nicht wie erwartet (fehlt, abgeschaltet oder anders gebaut).';
  end if;
end $$;

commit;
