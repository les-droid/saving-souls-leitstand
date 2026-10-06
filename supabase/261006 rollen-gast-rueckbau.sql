-- Saving Souls Leitstand – Rückbau von `261006 rollen-gast.sql`, TEIL 1 (der eigentliche Rückbau)
-- Einspielen: Supabase → SQL-Editor → Datei einfügen → Run. In einer Transaktion; wiederholbar.
--
-- Reihenfolge (Details in der Anleitung):
--   1) Authentication → „Allow anonymous sign-ins“ AUS.
--   2) Dieses Skript (Teil 1) ausführen.
--   3) Die Seite zurücksetzen oder stehen lassen (ohne Gast-Funktionen zeigt sie Gästen nur eine Fehlermeldung).
--   4) Teil 2 (`261006 rollen-gast-rueckbau-teil2.sql`) ist OPTIONAL und nur für den Fall, dass der alte Wortlaut der
--      Regeln gebraucht wird. Für Teil 1 braucht es keine Wartezeit (siehe unten). Für Teil 2 DOCH: der alte Wortlaut
--      lässt jedes angemeldete Konto alles tun — auch ein anonymes Token, dessen Konto hier gelöscht wurde, das aber bis
--      zu seinem Ablauf gültig bleibt. Teil 2 deshalb frühestens nach Ablauf der Token-Laufzeit (Teil 2 prüft das anhand
--      des Zeitstempels, den dieses Skript hinterlässt).
--
-- Was Teil 1 herstellt:
--   * Alle anonymen Konten (und damit alle Gast-Einträge) sind gelöscht. Ein Gast, der gerade angemeldet war, behält sein
--     Zugangstoken bis zum Ablauf (die Laufzeit ist im Dashboard einstellbar) — das ist KEIN Risiko mehr, weil
--   * die Regel `team_docs` auf public.docs ab jetzt nur noch FESTE Konten zulässt, die es in auth.users noch gibt
--     (Token-Merkmal is_anonymous UND Eintrag in auth.users). Ein anonymes Token liest und ändert nichts, auch nicht
--     bis zum Ablauf. Für die Admins ändert sich nichts: sie dürfen weiter alles wie vorher.
--   * Die Trigger-Funktion nur_team() lehnt anonyme Konten wieder ab und bleibt an den ANBIETER gebunden (GitHub-Name nur bei
--     Anbieter github, die zwei Kürzel-Adressen nur bei Anbieter email; die NULL-Lücke bleibt geschlossen).
--   * Alle neuen Tabellen, Funktionen, Policies und das Schema leitstand_intern sind entfernt; pgcrypto nur, wenn wir es
--     angelegt hatten. Übrig bleibt EINE kleine Hilfsfunktion public.team_konto_ok() für die Regel (Teil 2 entfernt sie).
--     An ihr hängt als Kommentar der Zeitstempel dieses Rückbaus (für die Wartezeit vor Teil 2).
--   * BESSER als vor der Umstellung (reine Verbesserung, kein Rückbau auf den alten Stand): Die alte Prüfung nur_team() ließ ein
--     E-Mail-Konto mit selbst gesetztem user_name eines Admins durch; dieses Konto durfte dank der offenen Regel alles. Diese
--     Lücke wird NICHT wieder geöffnet — die zurückgestellte nur_team()-Fassung prüft den Anbieter (raw_app_meta_data), den der
--     Anmeldedienst setzt. Die Rückbau-Skripte stellen also bewusst nicht Byte für Byte den alten Wortlaut von nur_team() her.
-- Bricht ab (ohne etwas zu ändern), wenn es außer den vier Admin-Konten noch andere FESTE Konten gibt (z. B. ein
-- nachträglich umgewandeltes oder ein neu angelegtes Admin-Konto) — dann steht die Liste in der Meldung; die Entscheidung
-- trifft ein Mensch. Bricht ab, wenn der ausführende Nutzer Trigger auf auth.users nicht entfernen oder Zeilen dort nicht
-- löschen darf (Probe, siehe unten).

begin;

-- 0) Vorab: Rechte und fremde feste Konten
do $vorab$
declare v_liste text; v_schritt text;
begin
  if not has_table_privilege(current_user, 'auth.users', 'SELECT') then
    raise exception 'Abbruch, nichts geändert: % hat kein SELECT-Recht auf auth.users.', current_user;
  end if;
  -- Probe statt Eigentümer-Frage: dieser Rückbau muss Trigger auf auth.users entfernen und neu anlegen und dort Zeilen
  -- löschen. Das wird hier einmal ausprobiert, in einem Unterblock, der absichtlich scheitert und damit alles zurückrollt.
  begin
    v_schritt := 'Funktion in public anlegen';
    create function public.leitstand_probe_fn() returns trigger language plpgsql as $p$ begin return new; end $p$;
    v_schritt := 'Trigger auf auth.users anlegen';
    create trigger leitstand_probe_trg before insert on auth.users for each row execute function public.leitstand_probe_fn();
    v_schritt := 'Trigger auf auth.users entfernen';
    drop trigger leitstand_probe_trg on auth.users;
    v_schritt := 'eine Zeile in auth.users löschen (wird zurückgerollt)';
    delete from auth.users where id = (select id from auth.users order by coalesce(is_anonymous, false) desc, created_at desc limit 1);
    v_schritt := 'Regel auf public.docs anlegen';
    create policy leitstand_probe_pol on public.docs for select to authenticated using (false);
    v_schritt := 'public.nur_team() ändern';
    if to_regprocedure('public.nur_team()') is not null then
      alter function public.nur_team() set search_path = public;
    end if;
    raise exception 'Probe zu Ende' using errcode = 'LP001';   -- rollt alles Obige zurück
  exception
    when sqlstate 'LP001' then null;
    when others then
      raise exception E'Abbruch, nichts geändert. Rechte: Probe fehlgeschlagen für % — Schritt „%“: %', current_user, v_schritt, sqlerrm;
  end;
  -- Gilt für den ausführenden Nutzer Zeilenschutz auf auth.users, sähe (und löschte) er die anonymen Konten nicht —
  -- der Rückbau meldete dann Erfolg, obwohl sie noch da sind.
  if row_security_active('auth.users'::regclass) then
    raise exception 'Abbruch, nichts geändert: für % gilt auf auth.users Zeilenschutz — die anonymen Konten wären nicht sichtbar.', current_user;
  end if;
  if to_regclass('leitstand_intern.admins') is not null then
    execute $q$select string_agg(format('%s (angelegt %s, Anbieter %s)', u.id, u.created_at::date, coalesce(u.raw_app_meta_data->>'provider', '?')), E'\n - ')
                 from auth.users u
                where not coalesce(u.is_anonymous, false) and u.id not in (select user_id from leitstand_intern.admins)$q$ into v_liste;
    if v_liste is not null then
      raise exception E'Abbruch, nichts geändert: es gibt feste Konten außer den vier Admin-Konten (nachträglich umgewandelt oder angelegt?). Liste an Main:\n - %\nWar eines der vier Admin-Konten neu anzulegen (neue Konto-ID, steht hier in der Liste)? Dann Handweg: Konto-ID prüfen (Authentication → Users) und im SQL-Editor eintragen: insert into leitstand_intern.admins (user_id, kuerzel) select u.id, ''<LES oder JB>'' from auth.users u where u.id = ''<ID>'' and not coalesce(u.is_anonymous, false) on conflict (user_id) do nothing;  — danach die Zahl der eingefügten Zeilen prüfen (erwartet 1; bei 0 stimmt die ID nicht oder das Konto ist anonym oder schon eingetragen: Liste an Main) und diesen Rückbau erneut starten.', v_liste;
    end if;
  end if;
end $vorab$;

-- 1) Hilfsfunktion und verschärfte Regel zuerst (zu keinem Zeitpunkt ohne Zugangsregel für die Admins, nie offen)
create or replace function public.team_konto_ok()
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
  select not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
         and exists (select 1 from auth.users u where u.id = auth.uid() and not coalesce(u.is_anonymous, false));
$$;
revoke all on function public.team_konto_ok() from public, anon;
grant execute on function public.team_konto_ok() to authenticated;
drop policy if exists team_docs on public.docs;
create policy team_docs on public.docs for all to authenticated
  using ((select public.team_konto_ok())) with check ((select public.team_konto_ok()));
drop policy if exists docs_admin on public.docs;
drop policy if exists docs_gast_lesen on public.docs;

-- 2) Trigger auf auth.users: Änderungs-Trigger weg; nur_team() ohne Zulassung anonymer Konten
drop trigger if exists nur_team_aenderung_trg on auth.users;
drop function if exists public.nur_team_aenderung();
create or replace function public.nur_team()
returns trigger language plpgsql security definer set search_path = public as $$
declare erlaubt text[] := array['les-droid', 'jnbjonathan-beep'];   -- LES, JB; GitHub-Usernames von TS, DS hier ergänzen
begin
  -- Anbieter-gebunden (raw_app_meta_data setzt der Anmeldedienst, nicht der Nutzer); keine anonymen Konten mehr.
  if not (
    (coalesce(new.raw_app_meta_data->>'provider', '') = 'github'
     and coalesce(new.raw_user_meta_data->>'user_name', '') = any(erlaubt))
    or (coalesce(new.raw_app_meta_data->>'provider', '') = 'email'
        and coalesce(new.email = any(array['les@leitstand.dropout-films.de','jb@leitstand.dropout-films.de']), false))
  ) then
    raise exception 'Kein Team-Mitglied: %', new.raw_user_meta_data->>'user_name';
  end if;
  return new;
end $$;
revoke execute on function public.nur_team() from public, anon, authenticated;
drop trigger if exists nur_team_trg on auth.users;
create trigger nur_team_trg before insert on auth.users for each row execute function public.nur_team();

-- 3) Anonyme Konten entfernen (Gast-Einträge gehen über die Verweise mit, Fehlversuche mit dem Schema in Schritt 4).
--    Zeitstempel für Teil 2 an team_konto_ok() hängen: gesetzt beim ersten Lauf und jedes Mal neu, wenn dieser Lauf
--    noch anonyme Konten gelöscht hat — deren Token bleiben bis zum Ablauf gültig, erst danach ist Teil 2 unbedenklich.
do $$
declare n int; v_alt text;
begin
  delete from auth.users where coalesce(is_anonymous, false);
  get diagnostics n = row_count;
  v_alt := obj_description('public.team_konto_ok()'::regprocedure, 'pg_proc');
  if n > 0 or v_alt is null or v_alt !~ 'rueckbau-teil1-am=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' then
    execute format('comment on function public.team_konto_ok() is %L',
      'Hilfsfunktion der Regel team_docs nach Rückbau Teil 1. rueckbau-teil1-am='
      || to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      || ' (Zeitpunkt, zu dem zuletzt anonyme Konten gelöscht wurden; Teil 2 wartet ab hier die Token-Laufzeit ab)');
  end if;
end $$;

-- 4) Neue Funktionen und das ganze Schema entfernen; pgcrypto nur, wenn wir es angelegt haben
do $$
declare v_pg text;
begin
  if to_regclass('leitstand_intern.sicherung') is not null then
    execute 'select ddl from leitstand_intern.sicherung where name = ''erweiterung:pgcrypto_vorher''' into v_pg;
  end if;
  execute 'drop function if exists public.meine_rolle()';
  execute 'drop function if exists public.gast_anmelden(text, text)';
  execute 'drop function if exists public.gast_aufgabe_status(text, boolean)';
  execute 'drop schema if exists leitstand_intern cascade';
  if v_pg = 'nein' then execute 'drop extension if exists pgcrypto'; end if;
end $$;

-- 5) Schlussprüfung: team_docs steht (verschärft), keine neue Policy, kein neues Schema, kein anonymes Konto
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs')
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname in ('docs_admin', 'docs_gast_lesen'))
     or exists (select 1 from pg_namespace where nspname = 'leitstand_intern')
     or exists (select 1 from auth.users where coalesce(is_anonymous, false)) then
    raise exception 'Abbruch: Rückbau unvollständig, nichts geändert.';
  end if;
end $$;

commit;
