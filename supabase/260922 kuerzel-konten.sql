-- Saving Souls Leitstand – Kürzel+Passwort-Login zulassen (Fund 260922: „reicht nicht Kürzel + PW?“)
-- Eigenständig anwendbar (SQL-Editor → Run), ersetzt public.nur_team() um genau diese Zeile erweitert.
-- Entspricht der Fassung in schema.sql — dort steht die vollständige Historie, hier nur die Änderung
-- zum einzelnen Anwenden.

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
