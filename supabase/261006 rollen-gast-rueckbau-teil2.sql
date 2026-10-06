-- Saving Souls Leitstand – Rückbau, TEIL 2 (OPTIONAL): alter Wortlaut der Regeln wie vor der Umstellung
-- Nur nötig, wenn Teil 1 (`261006 rollen-gast-rueckbau.sql`) gelaufen ist UND der Zustand Byte für Byte wie vorher
-- gebraucht wird. Der Zustand nach Teil 1 ist für Admins gleichwertig und sicherer; er kann dauerhaft so bleiben.
--
-- ACHTUNG: Der alte Wortlaut hat eine bekannte Lücke: Wird der Schalter „Anonymous Sign-Ins“ später wieder eingeschaltet,
-- bekommt jeder anonyme Besucher mit `team_docs` (jedes angemeldete Konto darf alles) VOLLZUGRIFF. Schalter deshalb
-- aus lassen. Eine Wartezeit macht nichts davon sicherer; entscheidend ist nur, dass der Schalter aus ist und keine
-- anonymen Konten mehr existieren (das prüft dieses Skript).
-- Einspielen: Supabase → SQL-Editor → Datei einfügen → Run. In einer Transaktion; wiederholbar.

begin;

do $vorab$
declare n int;
begin
  if to_regclass('leitstand_intern.admins') is not null then
    raise exception 'Abbruch, nichts geändert: Teil 1 (rollen-gast-rueckbau.sql) ist noch nicht gelaufen.';
  end if;
  select count(*) into n from auth.users where coalesce(is_anonymous, false);
  if n > 0 then
    raise exception 'Abbruch, nichts geändert: es gibt noch % anonyme Konten. Schalter „Allow anonymous sign-ins“ aus, Teil 1 erneut ausführen.', n;
  end if;
end $vorab$;

drop policy if exists team_docs on public.docs;
create policy team_docs on public.docs for all to authenticated using (true) with check (true);
drop function if exists public.team_konto_ok();

create or replace function public.nur_team()
returns trigger language plpgsql security definer set search_path = public as $$
declare erlaubt text[] := array['les-droid', 'jnbjonathan-beep'];   -- LES, JB; GitHub-Usernames von TS, DS hier ergänzen
begin
  if not (
    coalesce(new.raw_user_meta_data->>'user_name','') = any(erlaubt)
    or new.email = any(array['les@leitstand.dropout-films.de','jb@leitstand.dropout-films.de'])
  ) then
    raise exception 'Kein Team-Mitglied: %', new.raw_user_meta_data->>'user_name';
  end if;
  return new;
end $$;
revoke execute on function public.nur_team() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs' and qual = 'true')
     or to_regprocedure('public.team_konto_ok()') is not null then
    raise exception 'Abbruch: Rückbau Teil 2 unvollständig, nichts geändert.';
  end if;
end $$;

commit;
