-- Saving Souls Leitstand – Rückbau von `261006 rollen-gast.sql`
-- Stellt den Zustand von vor der Umstellung her: Policy team_docs (jedes angemeldete Konto darf alles) und die
-- bisherige Trigger-Funktion nur_team(); entfernt alle neuen Objekte und alle anonymen Gast-Konten.
-- Einspielen: Supabase → SQL-Editor → Datei einfügen → Run. In einer Transaktion; wiederholbar.
--
-- WICHTIG, in dieser Reihenfolge:
--   1) In Supabase → Authentication → Sign In / Providers den Schalter „Allow anonymous sign-ins“ AUS.
--   2) Dieses Skript ausführen.
--   3) Die Seite auf den Stand VOR der Gast-Umstellung zurücksetzen (oder die Gast-Oberfläche stehen lassen —
--      ohne Gast-Funktionen zeigt sie Gästen nur eine Fehlermeldung; Admins sind nicht betroffen).
-- Hinweis: Ein Gast, der gerade angemeldet ist, behält sein Zugangstoken bis zu dessen Ablauf (Supabase-Standard:
-- höchstens eine Stunde), obwohl sein Konto gelöscht ist. Mit der wiederhergestellten Policy team_docs hätte er in
-- dieser Zeit dieselben Rechte wie ein Team-Konto. Wer das nicht will, wartet nach Schritt 2 eine Stunde, bevor die
-- Seite zurückgesetzt wird — oder lässt den Rückbau bis zum Feierabend liegen.

begin;

-- 1) Anonyme Konten entfernen (sie würden sonst mit team_docs Vollzugriff bekommen)
delete from auth.users where coalesce(is_anonymous, false);

-- 2) Alte Policy wiederherstellen (aus der Sicherung; ohne Sicherung die bekannte Fassung), dann die neuen entfernen.
--    Reihenfolge: erst die alte da, dann die neuen weg — zu keinem Zeitpunkt ohne Zugangsregel für die Admins.
do $$
declare v_ddl text;
begin
  if to_regclass('leitstand_intern.sicherung') is not null then
    execute 'select ddl from leitstand_intern.sicherung where name = ''policy:team_docs''' into v_ddl;
  end if;
  execute 'drop policy if exists team_docs on public.docs';
  execute coalesce(v_ddl, 'create policy team_docs on public.docs for all to authenticated using (true) with check (true)');
end $$;
drop policy if exists docs_admin on public.docs;
drop policy if exists docs_gast_lesen on public.docs;

-- 3) Bisherige Trigger-Funktion nur_team() wiederherstellen
do $$
declare v_ddl text;
begin
  if to_regclass('leitstand_intern.sicherung') is not null then
    execute 'select ddl from leitstand_intern.sicherung where name = ''funktion:nur_team''' into v_ddl;
  end if;
  if v_ddl is not null then
    execute v_ddl;
  elsif to_regprocedure('public.nur_team()') is null
     or pg_get_functiondef(to_regprocedure('public.nur_team()')) like '%is_anonymous%' then
    -- keine Sicherung (z. B. Rückbau zum zweiten Mal): nur dann die bekannte Fassung laut schema.sql einsetzen, wenn
    -- noch die NEUE Fassung steht oder die Funktion fehlt; steht schon die alte, bleibt sie.
    execute $f$
      create or replace function public.nur_team()
      returns trigger language plpgsql security definer set search_path = public as $b$
declare erlaubt text[] := array['les-droid', 'jnbjonathan-beep'];   -- LES, JB; GitHub-Usernames von TS, DS hier ergänzen
begin
  if not (
    coalesce(new.raw_user_meta_data->>'user_name','') = any(erlaubt)
    or new.email = any(array['les@leitstand.dropout-films.de','jb@leitstand.dropout-films.de'])
  ) then
    raise exception 'Kein Team-Mitglied: %', new.raw_user_meta_data->>'user_name';
  end if;
  return new;
end $b$
    $f$;
  end if;
end $$;
revoke execute on function public.nur_team() from public, anon, authenticated;

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

-- 5) Schlussprüfung: team_docs steht, keine neue Policy, kein neues Schema
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs')
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname in ('docs_admin', 'docs_gast_lesen'))
     or exists (select 1 from pg_namespace where nspname = 'leitstand_intern') then
    raise exception 'Abbruch: Rückbau unvollständig, nichts geändert.';
  end if;
end $$;

commit;
