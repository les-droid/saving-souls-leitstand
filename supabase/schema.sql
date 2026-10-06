-- Saving Souls Leitstand – Live-Datenbank
-- Einmal im Supabase SQL-Editor ausführen (Run). Danach Auth → Provider GitHub aktivieren.

-- 1) Alle Board-Daten: eine Tabelle, Firestore-artig (collection / id / data)
create table if not exists public.docs (
  collection  text not null,
  id          text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_by  text,
  updated_at  timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists docs_coll_idx on public.docs (collection);

-- 2) Teil-Update (entspricht doc.update({...}) im Board)
create or replace function public.docs_patch(p_collection text, p_id text, p_patch jsonb, p_by text default null)
returns void language sql security invoker as $$
  insert into public.docs (collection, id, data, updated_by, updated_at)
  values (p_collection, p_id, p_patch, p_by, now())
  on conflict (collection, id) do update
    set data = public.docs.data || excluded.data, updated_by = excluded.updated_by, updated_at = now();
$$;

-- 3) Atomares Beanspruchen einer Claude-Aufgabe (verhindert Doppelausführung, auch bei mehreren Listenern)
--    p_ziel = Name des Rechners ('schnitt11', 'cloud', …). Aufgaben mit ziel='schnitt11' nimmt nur Schnitt 11;
--    ziel fehlt oder 'egal' = jeder darf.
drop function if exists public.s11_claim(text);
create or replace function public.s11_claim(p_id text, p_ziel text default 'schnitt11')
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  update public.docs
     set data = data || jsonb_build_object('s11status','laeuft','s11ziel',p_ziel,'s11gestartetAm',to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'s11fortschritt','gestartet …'),
         updated_by = p_ziel, updated_at = now()
   where collection = 'todos' and id = p_id
     and coalesce(data->>'typ','') = 'claude'
     and coalesce((data->>'angefordert')::boolean,false)
     and coalesce((data->>'done')::boolean,false) = false
     and coalesce(data->>'s11status','') not in ('laeuft','fertig')
     and (coalesce(data->>'ziel','egal') = 'egal' or data->>'ziel' = p_ziel)
  returning data into r;
  return r;
end $$;
revoke execute on function public.s11_claim(text, text) from public, anon, authenticated;

-- 4) Zugriff: nur eingeloggte Team-Mitglieder (GitHub-Login), volle Rechte
--    (seit 06.10.2026 abgelöst durch Abschnitt 8: Rollen Admin/Gast; team_docs gibt es dann nicht mehr)
alter table public.docs enable row level security;
drop policy if exists team_docs on public.docs;
create policy team_docs on public.docs for all to authenticated using (true) with check (true);

-- 5) Realtime
alter publication supabase_realtime add table public.docs;
alter table public.docs replica identity full;

-- 6) Nur bekannte GitHub-Logins ODER die Kürzel-Konten (Kürzel+Passwort-Login) dürfen sich registrieren
create or replace function public.nur_team()
returns trigger language plpgsql security definer as $$
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
drop trigger if exists nur_team_trg on auth.users;
create trigger nur_team_trg before insert on auth.users for each row execute function public.nur_team();

-- 7) Härtung (Supabase Security Advisor): feste search_path, SECURITY-DEFINER-Funktionen nicht über die API aufrufbar
alter function public.docs_patch(text, text, jsonb, text) set search_path = public;
alter function public.s11_claim(text, text) set search_path = public;
alter function public.nur_team() set search_path = public;
revoke execute on function public.s11_claim(text, text) from public, anon, authenticated;   -- nur service_role (Listener Schnitt 11)
revoke execute on function public.nur_team() from public, anon, authenticated;        -- nur Trigger

-- 8) Rollen und Gast-Zugang (seit 06.10.2026, nachgebessert nach drei Prüfungen) — Gesamtbild; eingespielt wird NICHT
--    dieser Abschnitt, sondern `261006 rollen-gast.sql` (Zurück: `261006 rollen-gast-rueckbau.sql` = Teil 1, optional
--    `…-teil2.sql`). Auf einer neuen Datenbank: Abschnitte 1–7, dann die vier Konten anlegen, dann `261006 rollen-gast.sql`,
--    dann das Gast-Passwort setzen. Das Einspiel-Skript prüft seine Annahmen selbst und bricht mit einer Liste ab:
--    Rechte des ausführenden Nutzers (als Probe in einem zurückgerollten Unterblock, nicht als Eigentümer-Frage; geprobt wird auch das Entfernen eines Triggers auf auth.users, das der Rückbau braucht), fremde Regeln in public/storage, öffentliche Buckets, ungeschützte Tabellen/
--    Sichten, unbekannte Funktionen, Kontenbestand (laut auth.identities genau 2x GitHub, 2x E-Mail).
--    Stand danach:
--    * Schema leitstand_intern (nicht über die API ausgeliefert; nicht unter „Exposed schemas“ eintragen!):
--        admins (Konto-IDs der vier Admin-Konten; wird nur beim ERSTEN Einspielen gefüllt), gaeste (anonyme Konten mit
--        Gast-Kürzel), gast_zugang (bcrypt-Hash), gast_versuche (Fehlversuche), sicherung (pgcrypto-Vermerk für den
--        Rückbau). Alle: RLS an, keine Policies, keine Rechte für anon/authenticated.
--        Funktionen: ist_admin(), ist_gast() (für die Policies), gast_passwort_setzen(text) (nur Eigentümer, im SQL-Editor;
--        mindestens 20 Zeichen aus mindestens drei Klassen (klein, groß, Ziffer, Sonderzeichen), mindestens 8 verschiedene,
--        nicht der Platzhalter „HIER-…“; ob es zufällig ist, prüft der Server nicht. Nimmt dieselbe Sperre wie gast_anmelden, damit ein Passwortwechsel keine laufende Anmeldung überholt).
--    * public.docs: Policy team_docs entfällt. docs_admin = alles für Admins (Prüfung über die Konto-ID, nie über
--      user_metadata/E-Mail zur Laufzeit); docs_gast_lesen = nur Lesen für eingetragene Gäste.
--    * public.meine_rolle()                        → {"rolle":"admin"|"gast"|"keine","kuerzel":…}
--      public.gast_anmelden(kuerzel, passwort)     → nur anonyme Konten; bcrypt-Prüfung; je Sitzung 5 Fehlversuche je 15 Minuten
--                                                    (danach „gesperrt“); KEINE Gesamtbremse über alle Sitzungen (sie ließ Fremde echte Gäste
--                                                    hinhalten); gast_versuche bleibt als Protokoll (Zeilen älter als ein Tag werden entfernt);
--                                                    Team-Kürzel, feste Wörter und beides mit angehängten Ziffern gesperrt (TS und DS sind
--                                                    als Gast-Kürzel erlaubt)
--      public.gast_aufgabe_status(id, done)        → setzt NUR done/erledigtAm (+ geaendert_von/geaendert_am/geaendert_rolle,
--                                                    updated_by = gast:<KÜRZEL>) an einer AUFGABE der Sammlung todos (Feld text);
--                                                    nie bei Claude-Aufgaben (Befehlen) und nie bei Rückfragen (typ frage)
--      (alle drei: nur für angemeldete Konten ausführbar, nicht für anon; feste search_path)
--    * public.nur_team() (beim Anlegen): an den ANBIETER gebunden (raw_app_meta_data->>'provider', vom Anmeldedienst gesetzt):
--      GitHub-Name nur bei Anbieter github, die zwei Kürzel-Adressen nur bei Anbieter email, anonyme Konten (Gast) zusätzlich
--      zugelassen; Konten ohne Treffer (auch ohne E-Mail) werden abgewiesen. Ein E-Mail-Konto mit selbst gesetztem user_name
--      eines Admins kommt nicht mehr durch (reine Verbesserung gegenüber dem Stand oben in Abschnitt 6).
--      public.nur_team_aenderung() (beim Ändern): ein anonymes Konto darf nicht nachträglich zu einem festen werden (E-Mail,
--      Telefon, is_anonymous) — auch nicht auf eine Team-Adresse. Beide Trigger auf auth.users.
--    * Dienstschlüssel (service_role) umgeht die Regeln wie bisher; s11_claim bleibt ihm vorbehalten.
--    * Rückbau Teil 1: anonyme Konten gelöscht, team_docs nur noch für feste, existierende Konten (anonyme Token lesen
--      auch bis zum Ablauf nichts), Schema und neue Funktionen entfernt; übrig bleibt public.team_konto_ok() (mit dem
--      Zeitstempel des Rückbaus als Kommentar). Teil 2 (optional): alter Wortlaut der Regel team_docs — frühestens nach
--      Ablauf der Token-Laufzeit seit Teil 1 (das Skript erzwingt eine Wartezeit, Voreinstellung 7 Tage), weil der alte
--      Wortlaut auch noch gültigen anonymen Token gelöschter Konten alles erlaubt. Beide Rückbau-Teile stellen nur_team()
--      in der anbietergebundenen Fassung ohne anonyme Konten her, nicht den alten Wortlaut von Abschnitt 6.
