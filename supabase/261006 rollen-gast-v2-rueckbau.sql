-- Saving Souls Leitstand – Rückbau der Ergänzung `261006 rollen-gast-v2.sql`
-- Stand 06.10.2026, Zusatzrunde der Cloud-Nacht (Positivliste und Claude-Aufträge; davor nachgebessert nach der ersten und der zweiten unabhängigen Prüfung).
-- Einspielen: Supabase → SQL-Editor → ganze Datei einfügen → Run.
-- In einer Transaktion; wiederholbar.
--
-- Stellt genau den Stand nach dem ersten Einspielen (`261006 rollen-gast.sql`) wieder her:
--   * Leseregel docs_gast_lesen wieder im Wortlaut der ersten Stufe (Gäste lesen alles),
--   * public.gast_aufgabe_status(text, boolean) wieder da — im Wortlaut der ersten Stufe, mit denselben Rechten,
--   * public.gast_notiz, leitstand_intern.gast_notiz_intern und die Protokolltabelle leitstand_intern.gast_notizen_log sind entfernt.
-- Nichts anderes wird angefasst. Bereits geschriebene Gast-Notizen (Sammlung notes) bleiben stehen: kein Skript hier löscht Daten.
--
-- ACHTUNG — WARNUNG: dieser Stand ist der, in dem Gäste WIEDER ALLES LESEN: praesenz, zeiten, archiv, intern, die Sammlungen mit »_« am Anfang, jede andere
-- Sammlung außerhalb der Positivliste und die Claude-Aufträge in todos. Deshalb bricht dieses Skript ab (ohne etwas zu ändern), wenn für Gäste gesperrte
-- Zeilen da sind (im echten Bestand praktisch immer: zeiten, praesenz, Claude-Aufträge) UND Gäste Zugang haben (Einträge in leitstand_intern.gaeste ODER
-- ein gesetztes Gast-Passwort).
-- Weg: erst den Gast-Zugang schließen, dann zurückbauen, danach (falls gewünscht) ein Gast-Passwort neu setzen:
--     delete from leitstand_intern.gaeste;
--     update leitstand_intern.gast_zugang set hash = null, gesetzt_am = null where id = 1;
-- Eine Gast-Anmeldung, die in diesem Augenblick noch läuft (Passwort schon geprüft, Eintrag noch nicht bestätigt), wird abgewartet: das Skript nimmt vor dem
-- Zählen dieselbe Sperre wie gast_anmelden. Ohne das trüge sich ein solcher Gast erst NACH der Zählung ein und läse nach dem Rückbau alles Gesperrte.
--
-- Danach laufen die Rückbau-Skripte der ersten Stufe (`261006 rollen-gast-rueckbau.sql`, Teil 2) unverändert.
-- Reihenfolge der Rückwege: ERST dieses Skript, DANN Teil 1 der ersten Stufe. Wird Teil 1 ohne dieses Skript gestartet, ist das ebenfalls
-- sauber: Teil 1 löscht das Schema leitstand_intern samt Inhalt, die Hülle public.gast_notiz hängt daran und geht mit (Ergebnis wie Teil 1 allein);
-- dieses Skript bricht danach ab mit „Stufe 1 fehlt“ und ändert nichts.
--
-- Vorab (0) prüft ohne Änderung und bricht mit lesbarer Liste ab: Rechte (Probe, zurückgerollt), Stufe 1 steht wie erwartet
-- (Schema, Tabellen, Funktionen im Wortlaut der ersten Stufe, beide Regeln auf docs im exakten Wortlaut, Trigger, vier Admins) und der Stand ist
-- „Stufe 1 und Ergänzung“ (auch in der früheren Fassung mit der Sperrliste archiv/intern/_ statt der Positivliste) oder bereits „nur Stufe 1“ (dann ändert
-- der Lauf nichts). Teile der Ergänzung selbst (Hülle, Innenfunktion, Protokolltabelle)
-- werden NICHT auf Wortlaut geprüft: sie werden ohnehin entfernt; ein Stand, in dem Teile fehlen, bricht als Mischzustand ab. Schlussprüfung vor dem Commit.

begin;

-- Dieselbe Bedingung wie in `261006 rollen-gast-v2.sql` (ein Test vergleicht beide Texte): hier nur, um den Stand „Ergänzung steht“ zu erkennen und zu zählen,
-- was die Regel Gästen sperrt. Dazu die Bedingung der früheren Fassung, um auch diesen Stand zurückbauen zu können.
select set_config('leitstand.v2_sperre',
  $regel$collection in ('stand', 'todos', 'notes', 'hinweise', 'links', 'clips', 'tonclip', 'aussagen', 'aussagen_sterne', 'boards')
  and (collection <> 'todos'
       or (jsonb_typeof(data) = 'object'
           and coalesce(data ->> 'typ', '') !~* '^[^[:alnum:]]*claude[^[:alnum:]]*$'
           and coalesce(data ->> 'wer', '') !~* '^[^[:alnum:]]*claude[^[:alnum:]]*$'
           and coalesce(data ->> 'quelle', '') !~* '^[^[:alnum:]]*chat[^[:alnum:]]*$'
           and coalesce(data ->> 'angefordert', '') !~* '^[^[:alnum:]]*(t|tr|tru|true|y|ye|yes|on|1)[^[:alnum:]]*$'
           and data ->> 's11status' is null))$regel$,
  true);
-- Die Bedingung der FRÜHEREN Fassung dieser Ergänzung (Sperrliste vom 06.10., ohne Positivliste), Zeichen für Zeichen wie damals — nur, um diesen Stand
-- zu ERKENNEN (Vorab-Prüfung, nur probeweise in einem zurückgerollten Unterblock); als Regel eingebaut wird sie nie.
select set_config('leitstand.v2_sperre_frueher',
  $regel$regexp_replace(collection, E'^[[:space:]\\u0085\\u00a0\\u180e\\u2000-\\u200d\\u2028\\u2029\\u202f\\u205f\\u2060\\u3000\\ufeff]+|[[:space:]\\u0085\\u00a0\\u180e\\u2000-\\u200d\\u2028\\u2029\\u202f\\u205f\\u2060\\u3000\\ufeff]+$', '', 'g') !~* E'^((archiv|intern)$|_)'$regel$,
  true);

do $vorab$
declare
  v_f text[] := array[]::text[];
  v_t text; v_n int; v_schritt text; v_s1 boolean; v_s2 boolean; v_inner boolean; v_log boolean; v_pol_alt boolean; v_pol_neu boolean; v_pol_frueher boolean; v_qual text;
  v_aq text; v_ac text; v_eg1 text; v_eg2 text; v_eg2f text; v_eaq text; v_eac text; v_soll text := current_setting('leitstand.v2_sperre');
  v_frueher text := current_setting('leitstand.v2_sperre_frueher');
  v_gesperrt int; v_gaeste int; v_pw boolean;
begin
  if to_regclass('public.docs') is null or to_regclass('auth.users') is null then
    raise exception 'Abbruch, nichts geändert: Tabelle public.docs oder auth.users fehlt.';
  end if;
  if to_regnamespace('leitstand_intern') is null then
    raise exception 'Abbruch, nichts geändert: Stufe 1 fehlt — das Schema leitstand_intern gibt es nicht (Stufe 1 nie eingespielt oder schon zurückgebaut; dann ist auch die Ergänzung nicht mehr da). Nichts zu tun.';
  end if;

  begin   -- Rechte: Probe in einem Unterblock, der am Ende absichtlich scheitert und alles zurückrollt
    v_schritt := 'Funktion in public anlegen';
    create function public.leitstand_v2_probe_fn() returns int language sql as 'select 1';
    v_schritt := 'Funktion in public entfernen';
    drop function public.leitstand_v2_probe_fn();
    v_schritt := 'Tabelle im Schema leitstand_intern anlegen und entfernen';
    create table leitstand_intern.leitstand_v2_probe_t (x int);
    drop table leitstand_intern.leitstand_v2_probe_t;
    v_schritt := 'Regel auf public.docs ändern';
    alter policy docs_gast_lesen on public.docs using (false);
    raise exception 'Probe zu Ende' using errcode = 'LP002';
  exception
    when sqlstate 'LP002' then null;
    when others then
      v_f := v_f || format('Rechte: Probe fehlgeschlagen für %s — Schritt „%s“: %s', current_user, v_schritt, sqlerrm);
  end;
  if row_security_active('auth.users'::regclass) then
    v_f := v_f || format('Rechte: für %s gilt auf auth.users Zeilenschutz — die Prüfung der Konten sähe nicht alle Zeilen.', current_user);
  end if;
  if row_security_active('public.docs'::regclass) then
    v_f := v_f || format('Rechte: für %s gilt auf public.docs Zeilenschutz — die Zählung der gesperrten Sammlungen sähe nicht alle Zeilen.', current_user);
  end if;

  for v_t in
    select format('Stufe 1: Tabelle leitstand_intern.%s fehlt oder ist nicht wie erwartet (Zeilenschutz an, keine Rechte für anon/authenticated)', e.n)
      from unnest(array['admins', 'gaeste', 'gast_zugang', 'gast_versuche', 'sicherung']) e(n)
     where not coalesce((select c.relrowsecurity and not has_table_privilege('anon', c.oid, 'select,insert,update,delete')
                              and not has_table_privilege('authenticated', c.oid, 'select,insert,update,delete')
                           from pg_class c where c.oid = to_regclass('leitstand_intern.' || e.n) and c.relkind = 'r'), false)
  loop v_f := v_f || v_t; end loop;

  for v_t in
    select case when p.oid is null then format('Stufe 1: Funktion %s fehlt.', e.f)
                when md5(p.prosrc) <> e.m then format('Stufe 1: Funktion %s hat nicht den Wortlaut von `261006 rollen-gast.sql` (Prüfsumme %s statt %s).', e.f, md5(p.prosrc), e.m)
                when has_function_privilege('anon', p.oid, 'execute') then format('Stufe 1: Funktion %s ist für anon aufrufbar.', e.f)
                when has_function_privilege('authenticated', p.oid, 'execute') <> e.au then format('Stufe 1: Funktion %s hat für angemeldete Konten nicht das erwartete Recht (aufrufbar sein soll: %s).', e.f, e.au) end
      from (values ('public.meine_rolle()', 'f99bbe5c389673617b7dd6032f8599ef', true),
                   ('public.gast_anmelden(text,text)', '1a36e3574794769ab55491906fce9332', true),
                   ('public.nur_team()', '71a25449266f2833a36daa8d09061631', false),
                   ('public.nur_team_aenderung()', '64d9a1b6f2888c7b676313818495e9be', false),
                   ('leitstand_intern.ist_admin()', '9c26d6c2f617b007da6214b255a43980', true),
                   ('leitstand_intern.ist_gast()', '7d817ce834ab5ba9da239366dce2aace', true),
                   ('leitstand_intern.gast_passwort_setzen(text)', '7dbe8e0489eae4d26322bc23c550cc4f', false)) e(f, m, au)
      left join pg_proc p on p.oid = to_regprocedure(e.f)
     where p.oid is null or md5(p.prosrc) <> e.m or has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute') <> e.au
  loop v_f := v_f || v_t; end loop;

  if not coalesce((select relrowsecurity from pg_class where oid = 'public.docs'::regclass), false) then
    v_f := array_append(v_f, 'Zeilenschutz auf public.docs ist nicht eingeschaltet.'::text);
  end if;
  select qual, with_check into v_aq, v_ac from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_admin'
     and cmd = 'ALL' and permissive = 'PERMISSIVE' and roles = array['authenticated']::name[];
  select qual into v_qual from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_gast_lesen'
     and cmd = 'SELECT' and permissive = 'PERMISSIVE' and roles = array['authenticated']::name[] and with_check is null;
  begin   -- erwarteter Wortlaut, wie diese Datenbank ihn ausgibt (zurückgerollte Probe; die gelesenen Werte bleiben in den Variablen)
    v_schritt := 'Regel docs_admin mit dem erwarteten Text setzen';
    alter policy docs_admin on public.docs using ((select leitstand_intern.ist_admin())) with check ((select leitstand_intern.ist_admin()));
    select qual, with_check into v_eaq, v_eac from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_admin';
    v_schritt := 'Regel docs_gast_lesen mit dem Wortlaut der ersten Stufe setzen';
    alter policy docs_gast_lesen on public.docs using ((select leitstand_intern.ist_gast()));
    select qual into v_eg1 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_gast_lesen';
    v_schritt := 'Regel docs_gast_lesen mit dem Wortlaut der Ergänzung setzen';
    execute format('alter policy docs_gast_lesen on public.docs using ((select leitstand_intern.ist_gast()) and %s)', v_soll);
    select qual into v_eg2 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_gast_lesen';
    v_schritt := 'Regel docs_gast_lesen mit dem Wortlaut der früheren Fassung der Ergänzung setzen';
    execute format('alter policy docs_gast_lesen on public.docs using ((select leitstand_intern.ist_gast()) and %s)', v_frueher);
    select qual into v_eg2f from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_gast_lesen';
    raise exception 'Probe zu Ende' using errcode = 'LP002';
  exception
    when sqlstate 'LP002' then null;
    when others then
      v_f := v_f || format('Regeln: Wortlaut-Probe fehlgeschlagen für %s — Schritt „%s“: %s', current_user, v_schritt, sqlerrm);
  end;
  select count(*) into v_n from pg_policies where schemaname = 'public' and tablename = 'docs';
  if v_n <> 2 or v_aq is null then
    v_f := v_f || format('Regeln auf public.docs: erwartet genau docs_admin (ALL, authenticated) und docs_gast_lesen; gefunden: %s Regel(n), docs_admin %s.', v_n, case when v_aq is null then 'fehlt oder ist nicht wie erwartet' else 'ok' end);
  elsif v_aq is distinct from v_eaq or v_ac is distinct from v_eac then
    v_f := array_append(v_f, 'Regel docs_admin hat nicht den erwarteten Wortlaut (ist_admin() für Lesen und Schreiben, ohne Zusatz).'::text);
  end if;
  v_pol_alt := coalesce(v_qual = v_eg1, false);
  v_pol_neu := coalesce(v_qual = v_eg2, false);
  v_pol_frueher := coalesce(v_qual = v_eg2f, false);
  if v_qual is null then
    v_f := array_append(v_f, 'Regel docs_gast_lesen fehlt oder ist nicht wie erwartet (SELECT, authenticated, ohne Schreibprüfung).'::text);
  elsif not v_pol_alt and not v_pol_neu and not v_pol_frueher then
    v_f := array_append(v_f, 'Regel docs_gast_lesen hat weder den Wortlaut der ersten Stufe noch den der Ergänzung (verändert?).'::text);
  end if;

  if (select count(*) from pg_trigger t
       where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
         and t.tgenabled in ('O', 'A') and t.tgqual is null and t.tgattr::text = '' and (t.tgtype::int & 3) = 3
         and ((t.tgname = 'nur_team_trg' and (t.tgtype::int & 4) = 4 and t.tgfoid = to_regprocedure('public.nur_team()')::oid)
           or (t.tgname = 'nur_team_aenderung_trg' and (t.tgtype::int & 16) = 16 and t.tgfoid = to_regprocedure('public.nur_team_aenderung()')::oid))) <> 2 then
    v_f := array_append(v_f, 'Trigger nur_team_trg / nur_team_aenderung_trg auf auth.users fehlen, sind abgeschaltet oder anders gebaut als in Stufe 1.'::text);
  end if;
  if to_regclass('leitstand_intern.admins') is not null then
    begin
      execute 'select count(*) from leitstand_intern.admins a join auth.users u on u.id = a.user_id where not coalesce(u.is_anonymous, false)' into v_n;
      if v_n <> 4 or (select count(*) from auth.users where not coalesce(is_anonymous, false)) <> 4 or (select count(*) from leitstand_intern.admins) <> 4 then
        v_f := v_f || format('Konten: erwartet genau 4 feste Konten, alle in der Admin-Tabelle. Gefunden: Admin-Einträge mit festem Konto=%s, feste Konten insgesamt=%s.',
                             v_n, (select count(*) from auth.users where not coalesce(is_anonymous, false)));
      end if;
    exception when others then
      v_f := v_f || format('Konten: die Admin-Tabelle ist für %s nicht lesbar (%s).', current_user, sqlerrm);
    end;
  end if;

  v_s1 := to_regprocedure('public.gast_aufgabe_status(text,boolean)') is not null;
  v_s2 := to_regprocedure('public.gast_notiz(text)') is not null;
  v_inner := to_regprocedure('leitstand_intern.gast_notiz_intern(text)') is not null;
  v_log := to_regclass('leitstand_intern.gast_notizen_log') is not null;
  if v_s1 and (md5((select prosrc from pg_proc where oid = to_regprocedure('public.gast_aufgabe_status(text,boolean)'))) <> 'de04e37fb1e47438e9a87f2770064b25'
       or has_function_privilege('anon', to_regprocedure('public.gast_aufgabe_status(text,boolean)')::oid, 'execute')
       or not has_function_privilege('authenticated', to_regprocedure('public.gast_aufgabe_status(text,boolean)')::oid, 'execute')) then
    v_f := array_append(v_f, 'Stufe 1: public.gast_aufgabe_status(text, boolean) hat nicht den Wortlaut/die Rechte von `261006 rollen-gast.sql`.'::text);
  end if;
  if not ((v_s1 and not v_s2 and not v_inner and not v_log and v_pol_alt)
       or (not v_s1 and v_s2 and v_inner and v_log and (v_pol_neu or v_pol_frueher))) then
    v_f := v_f || format('Mischzustand (weder „nur Stufe 1“ noch „Stufe 1 und Ergänzung“): gast_aufgabe_status=%s, gast_notiz=%s, gast_notiz_intern=%s, Protokolltabelle=%s, Leseregel wie Stufe 1=%s, Leseregel wie Ergänzung=%s, Leseregel wie frühere Fassung der Ergänzung=%s.',
                         v_s1, v_s2, v_inner, v_log, v_pol_alt, v_pol_neu, v_pol_frueher);
  end if;

  -- Schutz vor dem stillen Öffnen: steht die Ergänzung und gibt es Zeilen, die Gäste jetzt NICHT lesen (nach dem Rückbau aber schon), dürfen keine Gäste
  -- Zugang haben. Gezählt wird mit der Bedingung, die gerade gilt (Positivliste bzw. frühere Fassung).
  if v_s2 and (v_pol_neu or v_pol_frueher) and not row_security_active('public.docs'::regclass) then
    -- Dieselbe Sperre wie gast_anmelden und gast_passwort_setzen: laufende Anmeldungen zu Ende kommen lassen, BEVOR die Gäste gezählt werden; bis zum
    -- Ende dieses Skripts wartet jede neue Anmeldung (und sieht danach den dann gültigen Stand des Gast-Passworts).
    perform pg_advisory_xact_lock(hashtext('leitstand_gast_anmelden'));
    execute format('select count(*) from public.docs where not (%s)', case when v_pol_neu then v_soll else v_frueher end) into v_gesperrt;
    select count(*) into v_gaeste from leitstand_intern.gaeste;
    select coalesce((select hash is not null from leitstand_intern.gast_zugang where id = 1), false) into v_pw;
    if v_gesperrt > 0 and (v_gaeste > 0 or v_pw) then
      v_f := v_f || format('Gäste würden für sie gesperrte Zeilen lesen (praesenz, zeiten, archiv, intern, _…, alles außerhalb der Positivliste, Claude-Aufträge in todos): es gibt %s solche Zeile(n), und Gäste haben Zugang (%s Gast-Eintrag/Einträge, Gast-Passwort %s). Erst den Gast-Zugang schließen: delete from leitstand_intern.gaeste;  update leitstand_intern.gast_zugang set hash = null, gesetzt_am = null where id = 1;  — dann diesen Rückbau erneut starten.',
                           v_gesperrt, v_gaeste, case when v_pw then 'gesetzt' else 'nicht gesetzt' end);
    end if;
  end if;

  if cardinality(v_f) > 0 then
    raise exception E'Abbruch, nichts geändert. % Befund(e) — diese Liste (ohne Passwörter, ohne Namen) an Main schicken, nicht „einfach durchlaufen lassen“:\n - %',
      cardinality(v_f), array_to_string(v_f, E'\n - ');
  end if;
end $vorab$;

-- 1) Leseregel zurück auf den Wortlaut der ersten Stufe (an Ort und Stelle, nie ohne Regel)
alter policy docs_gast_lesen on public.docs using ((select leitstand_intern.ist_gast()));

-- 2) gast_aufgabe_status zurück — Wortlaut Zeichen für Zeichen aus `261006 rollen-gast.sql`
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

revoke all on function public.gast_aufgabe_status(text, boolean) from public, anon;
grant execute on function public.gast_aufgabe_status(text, boolean) to authenticated;

-- 3) Die Ergänzung entfernen (zuerst die Hülle, sie hängt an der Innenfunktion)
drop function if exists public.gast_notiz(text);
drop function if exists leitstand_intern.gast_notiz_intern(text);
drop table if exists leitstand_intern.gast_notizen_log;

-- 4) Schlussprüfung: Stand wie nach dem ersten Einspielen, sonst geht alles zurück
do $schluss$
declare v_q text; v_g oid := to_regprocedure('public.gast_aufgabe_status(text,boolean)')::oid;
begin
  select qual into v_q from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_gast_lesen' and cmd = 'SELECT' and roles = array['authenticated']::name[];
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'docs') <> 2
     or v_q is null or position('ist_gast' in v_q) = 0 or position('archiv' in v_q) > 0 or position('|_)' in v_q) > 0 or position('regexp_replace' in v_q) > 0
     or position('collection' in v_q) > 0 or position('s11status' in v_q) > 0 then
    raise exception 'Abbruch: Regeln auf docs nicht wie in der ersten Stufe, nichts geändert.';
  end if;
  if v_g is null or md5((select prosrc from pg_proc where oid = v_g)) <> 'de04e37fb1e47438e9a87f2770064b25'
     or has_function_privilege('anon', v_g, 'execute') or not has_function_privilege('authenticated', v_g, 'execute') then
    raise exception 'Abbruch: gast_aufgabe_status nicht wie in der ersten Stufe, nichts geändert.';
  end if;
  if to_regprocedure('public.gast_notiz(text)') is not null or to_regprocedure('leitstand_intern.gast_notiz_intern(text)') is not null
     or to_regclass('leitstand_intern.gast_notizen_log') is not null then
    raise exception 'Abbruch: Reste der Ergänzung, nichts geändert.';
  end if;
end $schluss$;

commit;
