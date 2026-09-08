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
alter table public.docs enable row level security;
drop policy if exists team_docs on public.docs;
create policy team_docs on public.docs for all to authenticated using (true) with check (true);

-- 5) Realtime
alter publication supabase_realtime add table public.docs;
alter table public.docs replica identity full;

-- 6) Nur bekannte GitHub-Logins dürfen sich registrieren
create or replace function public.nur_team()
returns trigger language plpgsql security definer as $$
declare erlaubt text[] := array['les-droid', 'jnbjonathan-beep'];   -- LES, JB; GitHub-Usernames von TS, DS hier ergänzen
begin
  if not (coalesce(new.raw_user_meta_data->>'user_name','') = any(erlaubt)) then
    raise exception 'Kein Team-Mitglied: %', new.raw_user_meta_data->>'user_name';
  end if;
  return new;
end $$;
drop trigger if exists nur_team_trg on auth.users;
create trigger nur_team_trg before insert on auth.users for each row execute function public.nur_team();

-- 7) Härtung (Supabase Security Advisor): feste search_path, SECURITY-DEFINER-Funktionen nicht über die API aufrufbar
alter function public.docs_patch(text, text, jsonb, text) set search_path = public;
alter function public.s11_claim(text) set search_path = public;
alter function public.nur_team() set search_path = public;
revoke execute on function public.s11_claim(text) from public, anon, authenticated;   -- nur service_role (Listener Schnitt 11)
revoke execute on function public.nur_team() from public, anon, authenticated;        -- nur Trigger
