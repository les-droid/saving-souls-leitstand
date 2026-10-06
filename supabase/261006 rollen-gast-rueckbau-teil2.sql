-- Saving Souls Leitstand – Rückbau, TEIL 2 (OPTIONAL): alter Wortlaut der Regel team_docs wie vor der Umstellung
-- Nur nötig, wenn Teil 1 (`261006 rollen-gast-rueckbau.sql`) gelaufen ist UND der Zustand Byte für Byte wie vorher
-- gebraucht wird (die Prüfung nur_team() bleibt dabei in der besseren Fassung, siehe Punkt 3). Der Zustand nach Teil 1 ist für Admins gleichwertig und sicherer; er kann dauerhaft so bleiben.
--
-- ####################################################################################################
-- ACHTUNG — DIESES SKRIPT ÖFFNET DIE DATENBANK WIEDER FÜR JEDES ANGEMELDETE KONTO (alter Wortlaut).
-- Zur falschen Zeit ausgeführt, gibt es Fremden VOLLZUGRIFF (lesen, ändern, löschen). Vor dem Ausführen:
--
--   1) Schalter Authentication → „Allow anonymous sign-ins“ ist AUS — und bleibt aus. Das Skript KANN den Schalter
--      NICHT prüfen (er steht nicht in der Datenbank); es sieht nur, ob gerade anonyme Konten existieren.
--      (Seit Teil 1 lehnt nur_team() neue anonyme Konten ab, die Anmeldung scheitert dann schon dort — verlassen darf man
--      sich darauf nicht: Schalter aus lassen.)
--   2) Seit Teil 1 ist die TOKEN-LAUFZEIT vergangen. Ein anonymes Token bleibt bis zu seinem Ablauf gültig, auch wenn
--      sein Konto in Teil 1 gelöscht wurde — und der alte Wortlaut prüft das Konto nicht. Direkt nach Teil 1 ausgeführt,
--      hätte jeder, der in der letzten Stunde (bzw. in der eingestellten Laufzeit) auf „Als Gast anmelden“ geklickt hat,
--      Vollzugriff — auch OHNE das Gast-Passwort. Das Skript erzwingt deshalb eine Wartezeit seit Teil 1 (unten,
--      c_wartezeit). Voreinstellung 7 Tage = die größte Laufzeit, die sich bei Supabase einstellen lässt
--      (Einstellung „JWT expiry“ bzw. „Access token expiry time“ im Dashboard; die Obergrenze 604800 Sekunden steht
--      dort im Hilfetext neben dem Feld — bitte dort gegenlesen, sie ist hier nicht nachgeschlagen worden).
--      Wer seine Laufzeit dort nachgesehen hat, darf c_wartezeit auf diesen Wert setzen — nie kleiner.
--      Einzige Ausnahme (Notfall direkt nach dem ersten Einspielen): War der Schalter seit dem Einspielen NIE an,
--      gibt es keine anonymen Token; dann darf c_wartezeit auf interval '0' gesetzt werden.
--   3) Die Prüfung nur_team() bleibt dagegen so, wie Teil 1 sie hinterlassen hat: an den Anbieter gebunden, ohne anonyme
--      Konten. Das ist eine reine Verbesserung gegenüber dem Stand vor der Umstellung (die alte Prüfung ließ ein E-Mail-
--      Konto mit selbst gesetztem user_name eines Admins und Konten ohne E-Mail durch). Damit kann auch mit der offenen
--      Regel kein ANONYMES Konto neu angelegt werden; die Wartezeit unter 2) bleibt trotzdem nötig, weil bereits ausgestellte
--      Token gelöschter Konten weiter gelten.
-- ####################################################################################################
-- Einspielen: Supabase → SQL-Editor → Datei einfügen → Run. In einer Transaktion; wiederholbar.

begin;

do $vorab$
declare
  -- Wartezeit seit Teil 1 = Token-Laufzeit. Voreinstellung: größte bei Supabase einstellbare Laufzeit. Siehe Kopf, Punkt 2.
  c_wartezeit constant interval := interval '7 days';
  n int; v_marke text; v_seit timestamptz; v_offen boolean;
begin
  if to_regclass('leitstand_intern.admins') is not null then
    raise exception 'Abbruch, nichts geändert: Teil 1 (rollen-gast-rueckbau.sql) ist noch nicht gelaufen.';
  end if;
  if row_security_active('auth.users'::regclass) then
    raise exception 'Abbruch, nichts geändert: für % gilt auf auth.users Zeilenschutz — anonyme Konten wären nicht sichtbar.', current_user;
  end if;
  select count(*) into n from auth.users where coalesce(is_anonymous, false);
  if n > 0 then
    raise exception 'Abbruch, nichts geändert: es gibt noch % anonyme Konten. Schalter „Allow anonymous sign-ins“ aus, Teil 1 erneut ausführen.', n;
  end if;
  -- Wartezeit: maßgeblich ist der Zeitstempel, den Teil 1 an public.team_konto_ok() hinterlässt.
  if to_regprocedure('public.team_konto_ok()') is null then
    -- Kein Stand „nach Teil 1“. Weiter nur, wenn die Regel ohnehin schon den alten, offenen Wortlaut hat (dieses Skript
    -- lief bereits, oder es wurde nie umgestellt): dann ändert der Lauf nichts an der Offenheit.
    select exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs'
                    and cmd = 'ALL' and qual = 'true' and with_check = 'true') into v_offen;
    if not v_offen then
      raise exception 'Abbruch, nichts geändert: der Stand nach Teil 1 fehlt (keine Funktion public.team_konto_ok()). Zuerst Teil 1 (rollen-gast-rueckbau.sql) ausführen.';
    end if;
  else
    v_marke := substring(obj_description('public.team_konto_ok()'::regprocedure, 'pg_proc')
                         from 'rueckbau-teil1-am=([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)');
    if v_marke is null then
      raise exception 'Abbruch, nichts geändert: der Zeitstempel von Teil 1 fehlt. Teil 1 (rollen-gast-rueckbau.sql) erneut ausführen, dann die Token-Laufzeit abwarten.';
    end if;
    v_seit := v_marke::timestamptz;
    if now() < v_seit + c_wartezeit then
      raise exception 'Abbruch, nichts geändert: seit Teil 1 (%) ist die Wartezeit von % noch nicht vergangen — frühestens ab % (UTC). Bis dahin könnten noch gültige anonyme Token mit dem alten Wortlaut ALLES lesen und ändern. Der Stand nach Teil 1 ist sicher und kann so bleiben.',
        v_marke, c_wartezeit, to_char((v_seit + c_wartezeit) at time zone 'utc', 'YYYY-MM-DD HH24:MI');
    end if;
  end if;
end $vorab$;

drop policy if exists team_docs on public.docs;
create policy team_docs on public.docs for all to authenticated using (true) with check (true);
drop function if exists public.team_konto_ok();

-- nur_team() wird NICHT auf den alten Wortlaut zurückgesetzt (siehe Kopf, Punkt 3): anbietergebunden, ohne anonyme Konten.
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

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'team_docs' and qual = 'true')
     or to_regprocedure('public.team_konto_ok()') is not null then
    raise exception 'Abbruch: Rückbau Teil 2 unvollständig, nichts geändert.';
  end if;
end $$;

commit;
