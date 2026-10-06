-- Saving Souls Leitstand – Rückbau von `261006 rollen-gast.sql`, TEIL 1 (der eigentliche Rückbau)
-- Einspielen: Supabase → SQL-Editor → Datei einfügen → Run. In einer Transaktion; wiederholbar.
--
-- Reihenfolge (Details in der Anleitung):
--   1) Authentication → „Allow anonymous sign-ins“ AUS.
--   2) Dieses Skript (Teil 1) ausführen.
--   3) Die Seite zurücksetzen oder stehen lassen (ohne Gast-Funktionen zeigt sie Gästen nur eine Fehlermeldung).
--   4) Teil 2 (`261006 rollen-gast-rueckbau-teil2.sql`) ist OPTIONAL und nur für den Fall, dass der alte Wortlaut der
--      Regeln gebraucht wird. Es besteht keine Eile und keine Wartezeit macht etwas sicherer — siehe unten.
--
-- Was Teil 1 herstellt:
--   * Alle anonymen Konten (und damit alle Gast-Einträge) sind gelöscht. Ein Gast, der gerade angemeldet war, behält sein
--     Zugangstoken bis zum Ablauf (die Laufzeit ist im Dashboard einstellbar) — das ist KEIN Risiko mehr, weil
--   * die Regel `team_docs` auf public.docs ab jetzt nur noch FESTE Konten zulässt, die es in auth.users noch gibt
--     (Token-Merkmal is_anonymous UND Eintrag in auth.users). Ein anonymes Token liest und ändert nichts, auch nicht
--     bis zum Ablauf. Für die Admins ändert sich nichts: sie dürfen weiter alles wie vorher.
--   * Die Trigger-Funktion nur_team() lehnt anonyme Konten wieder ab (und die NULL-Lücke bleibt geschlossen).
--   * Alle neuen Tabellen, Funktionen, Policies und das Schema leitstand_intern sind entfernt; pgcrypto nur, wenn wir es
--     angelegt hatten. Übrig bleibt EINE kleine Hilfsfunktion public.team_konto_ok() für die Regel (Teil 2 entfernt sie).
-- Bricht ab (ohne etwas zu ändern), wenn es außer den vier Admin-Konten noch andere FESTE Konten gibt (z. B. ein
-- nachträglich umgewandeltes) — dann steht die Liste in der Meldung; die Entscheidung trifft ein Mensch.

begin;

-- 0) Vorab: Rechte und fremde feste Konten
do $vorab$
declare v_liste text; v_t text;
begin
  foreach v_t in array array['DELETE', 'SELECT'] loop
    if not has_table_privilege(current_user, 'auth.users', v_t) then
      raise exception 'Abbruch, nichts geändert: % hat kein %-Recht auf auth.users.', current_user, v_t;
    end if;
  end loop;
  if to_regclass('leitstand_intern.admins') is not null then
    execute $q$select string_agg(format('%s (angelegt %s, Anbieter %s)', u.id, u.created_at::date, coalesce(u.raw_app_meta_data->>'provider', '?')), E'\n - ')
                 from auth.users u
                where not coalesce(u.is_anonymous, false) and u.id not in (select user_id from leitstand_intern.admins)$q$ into v_liste;
    if v_liste is not null then
      raise exception E'Abbruch, nichts geändert: es gibt feste Konten außer den vier Admin-Konten (nachträglich umgewandelt oder angelegt?). Liste an Main:\n - %', v_liste;
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
  if not (
    coalesce(new.raw_user_meta_data->>'user_name','') = any(erlaubt)
    or coalesce(new.email = any(array['les@leitstand.dropout-films.de','jb@leitstand.dropout-films.de']), false)
  ) then
    raise exception 'Kein Team-Mitglied: %', new.raw_user_meta_data->>'user_name';
  end if;
  return new;
end $$;
revoke execute on function public.nur_team() from public, anon, authenticated;
drop trigger if exists nur_team_trg on auth.users;
create trigger nur_team_trg before insert on auth.users for each row execute function public.nur_team();

-- 3) Anonyme Konten entfernen (Gast-Einträge und Fehlversuche gehen über die Verweise mit)
delete from auth.users where coalesce(is_anonymous, false);

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
