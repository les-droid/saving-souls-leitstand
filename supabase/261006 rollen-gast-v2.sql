-- Saving Souls Leitstand – Rollen, Ergänzung (v2) zu `261006 rollen-gast.sql`: Gäste lesen nur Freigegebenes und schreiben Notizen
-- Stand 06.10.2026, Zusatzrunde der Cloud-Nacht (Positivliste und Claude-Aufträge, Entscheidungen E2/E3; davor nachgebessert nach der ersten und der zweiten
-- unabhängigen Prüfung). Voraussetzung: Stufe 1 (`261006 rollen-gast.sql`) ist eingespielt.
-- Einspielen: Supabase → SQL-Editor → ganze Datei einfügen → Run (nichts markieren). Alle Sonderzeichen des Skripts stehen als Schreibweise
-- mit Rückstrich (\uXXXX) im Text; das Skript enthält keine unsichtbaren Zeichen, die beim Einfügen verändert werden könnten.
-- DANACH `pruef-A-v2.sql` laufen lassen (nur Lesen): erwartet „STUFE 1 UND ERGÄNZUNG STEHEN“.
-- Zurück: `261006 rollen-gast-v2-rueckbau.sql` (stellt genau den Stand nach dem ersten Einspielen her; Achtung: bricht ab, solange Gäste Zugang haben und
-- für Gäste gesperrte Zeilen da sind — im echten Bestand praktisch immer, siehe unten bei 4).
--
-- Was das Skript ändert — genau vier Dinge, sonst nichts (alles in EINER Transaktion; bricht eine Zeile ab, bleibt alles wie vorher):
--   1) Gäste lesen nur, was ausdrücklich freigegeben ist (Entscheidung E2, Positivliste, Vertrag V2). Die Leseregel `docs_gast_lesen` auf public.docs
--      lässt Gäste genau diese zehn Sammlungen lesen, deren Name GENAU so geschrieben ist (Kleinbuchstaben, ohne Leerraum, ohne unsichtbare Zeichen):
--        stand             Eintrag stand/projekt: Projektzeile, Block »Neu«, Material, Stand-Angabe (Konzept 3.2 Blöcke 1 und 4, 6.1, 8, 10.2; Vertrag V1)
--        todos             Reiter »Aufgaben«, Block »Für dich offen« (Konzept 2.2, 3.2 Block 3, 5.2, 10.5: »Gäste lesen daraus nur Aufgaben für Menschen«)
--        notes             Notiz-Kanal (Konzept 5.4, 11.3 Nr. 1: Gäste lesen alle Notizen, auch ihre eigene)
--        hinweise          Block »Neu« (Konzept 3.2 Block 4, 10.5)
--        links             Block »Direkt zu«, Reiter »Zugänge & Dateien« (Konzept 3.2 Block 5, 4.3, 10.5: »links — für alle«)
--        clips, tonclip, aussagen, aussagen_sterne   Reiter »Transkripte« (Konzept 2.2, 6.3)
--        boards            Reiter »Boards« (Konzept 2.2, 6.2)
--      Herleitung: die sechs Gast-Reiter (Konzept 2.2), Konzept 6.4 und Anhang II.1 (was Gäste NICHT lesen), Konzept 10.5 (was die Seite daneben liest),
--      und die Lesestellen der Seite (Stand seite-ausgang: IX 2061–2078 todos, hinweise, notes, links, boards, clips, tonclip, aussagen, aussagen_sterne;
--      dazu stand/projekt nach Vertrag V1). Die Liste steht EINMAL unten in `leitstand.v2_sperre`.
--      ALLES ANDERE ist für Gäste zu — ausdrücklich praesenz und zeiten (Konzept 2.2, 6.4, Anhang II.1), archiv und intern (10.5, Anhang II.1), redaktion (E14),
--      reviews, review_kommentare, lagebericht, briefings, dateien, material (10.5: nicht mehr bzw. nie gelesen), jede Sammlung mit »_« am Anfang, jede
--      Schreibvariante eines erlaubten Namens (»Todos«, » todos«, »todos« mit unsichtbarem Zeichen) und JEDE KÜNFTIGE Sammlung. Wird eine Sammlung vergessen,
--      sieht ein Gast dort einen leeren Block — das ist der gewollte Fehlerfall; eine neue Sammlung für Gäste heißt: Liste hier ergänzen, neu einspielen.
--      In todos sieht ein Gast KEINE Claude-Aufträge und KEINE Nachrichten aus dem Reiter »Claude« (Vertrag V3; dieselben fünf Merkmale wie IX 1086):
--      ein Eintrag ist für Gäste zu, sobald EINES zutrifft — typ = claude · wer = Claude · quelle = chat (Nachricht aus dem Reiter »Claude«) ·
--      angefordert gesetzt · s11status gesetzt. Genauer, und an den Rändern bewusst weiter als die Seite (lieber zu als offen):
--        typ, wer, quelle: ohne Beachtung der Groß-/Kleinschreibung, Zeichen am Rand, die weder Buchstabe noch Ziffer sind, zählen nicht (» Claude«, »CLAUDE«);
--        angefordert: gesetzt bei JSON true UND bei jedem Text, den die Datenbank als »wahr« liest (»true«, »t«, »yes«, »on«, »1« … — so liest s11_claim
--          das Feld, `(data->>'angefordert')::boolean`); false, »nein«, fehlend oder JSON null = nicht gesetzt;
--        s11status: gesetzt, sobald das Feld da ist und nicht JSON null ist (auch »«, false, 0 — wie IX 1086 `v.s11status != null`); fehlend oder JSON null = nicht gesetzt;
--        ein Eintrag in todos, der kein JSON-Objekt ist, ist keine Aufgabe und für Gäste ebenfalls zu.
--      Alle anderen Aufgaben (für Menschen, auch Rückfragen typ = frage) lesen Gäste weiter.
--      DIE SPERRE GILT FÜR todos, NICHT FÜR KOPIEN IN notes: der Hintergrunddienst am Schnittplatz schreibt heute nach jedem Claude-Auftrag eine Notiz mit
--      wer = Claude (Titel des Auftrags bzw. der Nachricht und ein Teil des Ergebnisses), und notes ist für Gäste offen (Konzept 11.3 Nr. 1). Solche Notizen
--      sind erst mit der Umstellung des Dienstes (Konzept 5.7 Nr. 1, Entscheidung E5) und dem ersten Abräumen (Konzept Anhang II.2) weg — vorher kein
--      Gast-Passwort weitergeben (Zählung: Anleitung Abschnitt 6, Schritt 4, erwartet 0).
--      Die Sperre sitzt in der Datenbank-Regel: sie gilt für jede Abfrage der Gäste (Lesen, genaues Zählen, Filtern, die Funktion docs_patch) und für die
--      Echtzeit-Meldungen über neue und geänderte Zeilen (die Plattform prüft sie je Abonnent mit derselben Leseregel; an der Plattform nicht geprüft).
--      Admins ändern sich nicht: sie lesen und schreiben alles.
--      BEKANNTE GRENZEN: (a) Wird eine Aufgabe nachträglich zu einem Claude-Auftrag (z. B. »angefordert«), bekommt ein offenes Gast-Fenster dazu keine
--      Meldung mehr und zeigt die alte Fassung bis zum Neuladen (es erfährt nichts Neues). (b) Die GESCHÄTZTE Zeilenzahl des Planers (Kopfzeile
--      Prefer: count=planned) verrät auch einem anonymen Konto ohne Gast-Passwort ungefähre Mengen je Sammlung und je Schreiber und — über Bereichs- und
--      Anfangsfilter auf der Kennung — auch, mit welchen Anfängen Kennungen gehäuft vorkommen, auch in den gesperrten Sammlungen (z. B. »es gibt etwa 300
--      Kennungen, die mit todos- beginnen«; einzelne Kennungen und Inhalte nicht; am lokalen Postgres nachgestellt, an der Plattform nicht geprüft). Das lässt
--      sich mit einer Leseregel nicht schließen; sollen auch Mengen vertraulich sein, braucht es einen anderen Aufbau (eigener Entscheid).
--      (c) LÖSCHUNGEN: der Echtzeit-Dienst der Plattform wendet Leseregeln auf Lösch-Meldungen nicht an (laut Dokumentation der Plattform; nicht an der
--      Plattform geprüft). Wird eine für Gäste gesperrte Zeile GELÖSCHT (auch ein Claude-Auftrag in todos), erfährt jedes Konto, das die Tabelle
--      mithört (die Seite tut das), mindestens Sammlung und Kennung der gelöschten Zeile (laut Dokumentation nur diese, nicht den Inhalt) — VERMUTLICH AUCH
--      EIN AUFRUF GANZ OHNE ANMELDUNG: die Rolle anon behält auf public.docs die Standardrechte der Plattform (select, insert, update, delete; weder Stufe 1
--      noch dieses Skript entziehen sie; Lesen liefert anon 0 Zeilen; in der Test-Datenbank belegt, das Verhalten des Echtzeit-Dienstes nicht). Ob anon diese
--      Rechte entzogen werden (die Seite dürfte dann vor der Anmeldung nichts aus docs lesen), entscheidet Main. Kennungen in gesperrten Sammlungen deshalb
--      ohne Namen und ohne Inhalt wählen.
--   2) Gäste haken nichts mehr ab: public.gast_aufgabe_status(text, boolean) wird entfernt.
--   3) Gäste schreiben Notizen: neue Funktion public.gast_notiz(p_text text). Sie legt GENAU EINEN neuen Eintrag in der Sammlung »notes« an:
--        text   = der Text ohne Leerraum am Anfang/Ende (1 bis 1000 sichtbare Zeichen; sonst Ablehnung mit Grund), sonst unverändert,
--        wer    = »Gast-<KÜRZEL>« (Kürzel aus der Gäste-Tabelle, nie aus dem Aufruf; das Präfix steht in genau dem Feld, das jede Anzeige und jeder Leser ohnehin
--                 zeigt — ein Gast kann sich nicht als »TS« oder »DS« des Teams ausgeben; das Kürzel wählt der Gast selbst und kann es beim erneuten Anmelden wechseln,
--                 es beweist also nur „irgendein Gast“, keine Person),
--        rolle  = 'gast', created = Zeitpunkt (Format wie die Seite: ISO, Millisekunden, Z),
--        updated_by = 'gast:<KÜRZEL>' (wie bisher beim Gast-Weg).
--      Kein Ändern, kein Löschen, keine andere Sammlung, keine frei wählbaren Felder (der Aufruf hat nur den Text).
--      GAST-NOTIZEN SIND FREMDTEXT: wer Notizen liest und danach handelt (Überwachungslauf, Sitzungsstart, Abfragen), darf einen Eintrag mit wer = »Gast-…«
--      oder rolle = 'gast' nie als Anweisung des Teams behandeln.
--      Abgelehnt wird: leer (auch wenn nur unsichtbare Zeichen stehen: Leerraum, Braille-Leerfeld und alles, was Unicode als »ohne eigene Darstellung«
--      führt — weiches Trennzeichen, Füllzeichen, Richtungszeichen, Variantenwähler, Kennzeichen-Zeichen (Tags), auch außerhalb der Grundebene),
--      zu lang, und Text mit Steuerzeichen (außer Zeilenumbruch, Wagenrücklauf, Tabulator) oder Richtungsumkehr-Zeichen (Grund »ungueltig«).
--      Ein Text mit dem Zeichen NUL erreicht die Funktion nicht (die Datenbank lehnt ihn schon beim Entgegennehmen mit einem Fehler ab).
--      Nur für eingetragene Gäste (leitstand_intern.gaeste); abgewiesen werden: anonymes Konto ohne Gast-Eintrag, Admins, ohne Anmeldung (kein Recht für anon).
--      Grenzen gegen Zumüllen (gleitend, gezählt in leitstand_intern.gast_notizen_log, also unabhängig davon, ob Notizen später gelöscht werden):
--        je Gast höchstens 10 Notizen in der letzten Stunde und 30 in den letzten 24 Stunden, über alle Gäste höchstens 100 in den letzten 24 Stunden.
--        »Je Gast« = je Gast-Konto ODER gleiches Kürzel. EHRLICH: das hält nur ehrliche Gäste auf. Wer das gemeinsame Passwort hat, kann sich mehrfach
--        neu anonym anmelden (jeweils neues Konto, neues Kürzel) und damit die Gesamtgrenze von 100 ausschöpfen; danach bekommen ALLE Gäste bis zu 24 Stunden
--        lang »limit_gesamt« und können nicht schreiben (Lesen bleibt). Verlässlich ist nur die Gesamtgrenze; ob 100 am Tag als schlimmster Fall annehmbar sind,
--        ist eine Entscheidung des Editors (Stellschraube: c_gesamt_tag unten). Notausgang: alle Gäste aussperren (README-LIVE.md).
--        Parallele Aufrufe laufen nacheinander (Sperre pg_advisory_xact_lock), damit niemand die Grenze im Takt überholt.
--      Die Funktion gibt IMMER ein Ergebnis zurück (außer bei NUL, s. o.): {"ok":true,"id":…,"kuerzel":…} oder {"ok":false,"grund":…}.
--        Gründe: nicht_angemeldet, kein_gast, leer, zu_lang, ungueltig, limit_stunde, limit_tag, limit_gesamt, fehler.
--      Bauart: public.gast_notiz ist eine kleine SQL-Hülle (BEGIN ATOMIC) um leitstand_intern.gast_notiz_intern. Dadurch hängt sie in der Datenbank
--      sichtbar an dem Schema leitstand_intern: wer den Rückbau der ersten Stufe OHNE diesen Rückbau startet, nimmt die Hülle mit (siehe unten).
--   4) Rückbau und Verträglichkeit:
--      * `261006 rollen-gast-v2-rueckbau.sql` stellt den Stand nach dem ersten Einspielen her (auch gast_aufgabe_status im heutigen Wortlaut).
--        WARNUNG: dieser Stand ist der, in dem Gäste wieder ALLES lesen (praesenz, zeiten, archiv, intern, die Unterstrich-Sammlungen, die Claude-Aufträge).
--        Der Rückbau bricht deshalb ab, wenn für Gäste gesperrte Zeilen da sind (im echten Bestand praktisch immer: zeiten, praesenz, Claude-Aufträge)
--        UND Gäste Zugang haben (Gäste eingetragen oder ein Gast-Passwort gesetzt). Erst die Gäste aussperren (zwei Zeilen, steht in der
--        Meldung), dann zurückbauen. Der Rückbau wartet dabei gerade laufende Gast-Anmeldungen ab (dieselbe Sperre wie gast_anmelden) und zählt erst danach.
--        Intern und archiv erst füllen, wenn diese Ergänzung steht.
--      * Die Rückbau-Skripte der ersten Stufe laufen nach diesem Rückbau unverändert durch.
--      * Rückbau der ersten Stufe (Teil 1) OHNE den Rückbau der Ergänzung: Teil 1 löscht das Schema leitstand_intern samt allem darin
--        (drop schema … cascade); die Hülle gast_notiz hängt daran und wird mitgelöscht, die Leseregel wird von Teil 1 ohnehin ersetzt.
--        Ergebnis: derselbe Stand wie nach Teil 1 allein — vollständiger Rückbau, kein halber Zustand. Der Rückbau der Ergänzung bricht danach
--        mit dem Hinweis ab, dass Stufe 1 nicht (mehr) steht.
--      * Das ERSTE Skript (`261006 rollen-gast.sql`) erneut einzuspielen, solange die Ergänzung steht, bricht in dessen Vorab-Prüfung ab
--        (»Unbekannte Funktion … gast_notiz«), ohne etwas zu ändern: es würde sonst die Leseregel wieder öffnen.
--      Bereits geschriebene Gast-Notizen bleiben in jedem Fall stehen (kein Skript löscht Daten).
--
-- Vorab (0) prüft, ohne etwas zu ändern, und bricht mit einer lesbaren Liste ab, wenn eine Annahme nicht stimmt: Rechte (Probe in einem
-- zurückgerollten Unterblock), Stufe 1 steht genau wie erwartet (Schema, die fünf Tabellen mit Zeilenschutz, Wortlaut und Rechte der Funktionen,
-- die beiden Regeln auf docs im EXAKTEN Wortlaut — verglichen mit dem, was diese Datenbank aus dem erwarteten Text macht —, Trigger, genau die vier
-- Admin-Konten, keine fremde Regel/Funktion/ungeschützte Tabelle, s11_claim nicht für Angemeldete aufrufbar), und der Stand ist einer von dreien:
-- »nur Stufe 1«; »Stufe 1 und Ergänzung« (ein weiteres Einspielen setzt den Soll-Stand erneut; an einer unveränderten Ergänzung ändert es nichts);
-- »Stufe 1 und Ergänzung in der FRÜHEREN Fassung« (Leseregel mit der Sperrliste archiv/intern/_ vom 06.10., ohne Positivliste; laut Briefing E3 nie
-- eingespielt — nur für den Fall: das Skript ersetzt dann die Leseregel durch die Positivliste, alles andere ist gleich). Jede Mischung bricht ab.
-- Beliebig wiederholbar. Schlussprüfung vor dem Commit.
-- Passwörter, Namen und Hashes stehen hier nicht.

begin;

-- Die Bedingung der Leseregel steht hier EINMAL (die Vorab-Prüfung, der Einbau und die Schlussprüfung lesen sie von hier): Gäste lesen nur Zeilen der zehn
-- Sammlungen der Positivliste (Name genau so geschrieben), in todos nur JSON-Objekte ohne eines der fünf Claude-Merkmale (Kopf, Punkt 1).
-- Die Regel lautet dann ist_gast() und diese Bedingung.
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

-- ---------------------------------------------------------------------------------------------------
-- 0) Vorab: alle Befunde auf einmal als Liste; leer = in Ordnung
-- ---------------------------------------------------------------------------------------------------
do $vorab$
declare
  v_f text[] := array[]::text[];
  v_t text; v_n int; v_schritt text;
  v_s1 boolean; v_s2 boolean; v_inner boolean; v_log boolean; v_pol_alt boolean; v_pol_neu boolean; v_pol_frueher boolean;
  v_qual text; v_aq text; v_ac text;                  -- tatsächlicher Wortlaut der Regeln
  v_eg1 text; v_eg2 text; v_eg2f text; v_eaq text; v_eac text;     -- erwarteter Wortlaut, so wie ihn DIESE Datenbank ausgibt
  v_soll text := current_setting('leitstand.v2_sperre'); v_frueher text := current_setting('leitstand.v2_sperre_frueher');
begin
  if current_setting('server_version_num')::int < 140000 then
    raise exception 'Abbruch, nichts geändert: Postgres % ist zu alt (BEGIN ATOMIC braucht Version 14 oder neuer).', current_setting('server_version');
  end if;
  if to_regclass('public.docs') is null or to_regclass('auth.users') is null then
    raise exception 'Abbruch, nichts geändert: Tabelle public.docs oder auth.users fehlt.';
  end if;

  -- Rechte: Probe dessen, was dieses Skript tut, in einem Unterblock, der am Ende absichtlich scheitert und alles zurückrollt.
  begin
    v_schritt := 'Funktion in public mit SQL-Rumpf (BEGIN ATOMIC) anlegen';
    create function public.leitstand_v2_probe_fn() returns int language sql begin atomic select 1; end;
    v_schritt := 'Funktion in public entfernen';
    drop function public.leitstand_v2_probe_fn();
    v_schritt := 'Tabelle im Schema leitstand_intern anlegen';
    create table leitstand_intern.leitstand_v2_probe_t (x int);
    v_schritt := 'Tabelle im Schema leitstand_intern entfernen';
    drop table leitstand_intern.leitstand_v2_probe_t;
    v_schritt := 'Funktion im Schema leitstand_intern anlegen';
    create function leitstand_intern.leitstand_v2_probe_fn() returns int language sql as 'select 1';
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

  -- Stufe 1: Schema und die fünf Tabellen, alle mit Zeilenschutz und ohne Rechte für API-Rollen
  if to_regnamespace('leitstand_intern') is null then
    v_f := array_append(v_f, 'Stufe 1 fehlt: Schema leitstand_intern gibt es nicht (zuerst `261006 rollen-gast.sql` einspielen).'::text);
  else
    for v_t in
      select format('Stufe 1: Tabelle leitstand_intern.%s fehlt oder ist nicht wie erwartet (Zeilenschutz an, keine Rechte für anon/authenticated)', e.n)
        from unnest(array['admins', 'gaeste', 'gast_zugang', 'gast_versuche', 'sicherung']) e(n)
       where not coalesce((select c.relrowsecurity and not has_table_privilege('anon', c.oid, 'select,insert,update,delete')
                                and not has_table_privilege('authenticated', c.oid, 'select,insert,update,delete')
                             from pg_class c where c.oid = to_regclass('leitstand_intern.' || e.n) and c.relkind = 'r'), false)
    loop v_f := v_f || v_t; end loop;
  end if;

  -- Stufe 1: Funktionen im Wortlaut der ersten Stufe (Prüfsumme des Rumpfs) und mit den erwarteten Rechten
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
  -- s11_claim (löst Claude-Befehle aus) gehört dem Dienstschlüssel allein; ein Recht für Angemeldete hieße: ein Gast kann Befehle auf »läuft« setzen
  if to_regprocedure('public.s11_claim(text,text)') is not null
     and (has_function_privilege('anon', to_regprocedure('public.s11_claim(text,text)')::oid, 'execute')
          or has_function_privilege('authenticated', to_regprocedure('public.s11_claim(text,text)')::oid, 'execute')) then
    v_f := array_append(v_f, 'Stufe 1: public.s11_claim(text, text) ist für anon oder angemeldete Konten aufrufbar (nur der Dienstschlüssel darf das).'::text);
  end if;

  -- Regeln auf docs: Zeilenschutz an, genau docs_admin (alles) und docs_gast_lesen (nur lesen), beide für authenticated, im EXAKTEN Wortlaut.
  if not coalesce((select relrowsecurity from pg_class where oid = 'public.docs'::regclass), false) then
    v_f := array_append(v_f, 'Zeilenschutz auf public.docs ist nicht eingeschaltet.'::text);
  end if;
  select qual, with_check into v_aq, v_ac from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_admin'
     and cmd = 'ALL' and permissive = 'PERMISSIVE' and roles = array['authenticated']::name[];
  select qual into v_qual from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_gast_lesen'
     and cmd = 'SELECT' and permissive = 'PERMISSIVE' and roles = array['authenticated']::name[] and with_check is null;
  -- Erwarteter Wortlaut: in einem zurückgerollten Unterblock die Regeln probeweise mit dem erwarteten Text setzen und lesen, wie die Datenbank ihn ausgibt
  -- (so hängt der Vergleich nicht an der Postgres-Version). Die gelesenen Werte bleiben nach dem Zurückrollen in den Variablen.
  begin
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
  -- Fremde Regeln, fremde Funktionen, ungeschützte Tabellen, öffentliche Buckets (wie in Stufe 1): sie würden Gästen etwas geben
  for v_t in
    select format('Fremde Regel „%s“ auf %s.%s (%s, für %s)', policyname, schemaname, tablename, cmd, array_to_string(roles, ','))
      from pg_policies
     where schemaname in ('public', 'storage') and roles && array['authenticated', 'anon', 'public']::name[]
       and not (schemaname = 'public' and tablename = 'docs' and policyname in ('docs_admin', 'docs_gast_lesen')) order by 1
  loop v_f := v_f || v_t; end loop;
  if to_regclass('storage.buckets') is not null then
    for v_t in execute 'select name from storage.buckets where public order by 1' loop
      v_f := v_f || format('Öffentlicher Speicher-Bucket (jeder kann lesen): %s', v_t);
    end loop;
  end if;
  for v_t in
    select format('Ungeschützt für angemeldete Konten (Gäste): %s public.%s', case c.relkind when 'r' then 'Tabelle' when 'p' then 'Tabelle' when 'f' then 'Fremdtabelle' else 'Sicht' end, c.relname)
      from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f') and c.relname <> 'docs'
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
       and ((c.relkind in ('r', 'p') and not c.relrowsecurity
             and (has_table_privilege('anon', c.oid, 'select,insert,update,delete') or has_table_privilege('authenticated', c.oid, 'select,insert,update,delete')))
         or (c.relkind in ('v', 'm', 'f') and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select')))) order by 1
  loop v_f := v_f || v_t; end loop;
  for v_t in
    select 'public.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))
       and (p.proname || '(' || oidvectortypes(p.proargtypes) || ')') not in (
             'docs_patch(text, text, jsonb, text)', 's11_claim(text, text)', 'nur_team()', 'nur_team_aenderung()', 'meine_rolle()',
             'gast_anmelden(text, text)', 'gast_aufgabe_status(text, boolean)', 'gast_notiz(text)') order by 1
  loop v_f := v_f || ('Unbekannte Funktion, die ein angemeldetes Konto (auch ein Gast) aufrufen darf: ' || v_t); end loop;
  if exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'docs_patch' and p.prosecdef) then
    v_f := array_append(v_f, 'public.docs_patch läuft mit erhöhten Rechten (SECURITY DEFINER) und würde die Regeln auf docs umgehen — erwartet ist security invoker.'::text);
  end if;

  -- Trigger auf auth.users: beide da, eingeschaltet, vor dem Schreiben, je Zeile, an der erwarteten Funktion
  if (select count(*) from pg_trigger t
       where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
         and t.tgenabled in ('O', 'A') and t.tgqual is null and t.tgattr::text = '' and (t.tgtype::int & 3) = 3
         and ((t.tgname = 'nur_team_trg' and (t.tgtype::int & 4) = 4 and t.tgfoid = to_regprocedure('public.nur_team()')::oid)
           or (t.tgname = 'nur_team_aenderung_trg' and (t.tgtype::int & 16) = 16 and t.tgfoid = to_regprocedure('public.nur_team_aenderung()')::oid))) <> 2 then
    v_f := array_append(v_f, 'Trigger nur_team_trg / nur_team_aenderung_trg auf auth.users fehlen, sind abgeschaltet oder anders gebaut als in Stufe 1.'::text);
  end if;

  -- Konten: genau vier feste Konten, genau diese vier in der Admin-Tabelle
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

  -- Stand: nur Stufe 1 ODER Stufe 1 + Ergänzung; alles dazwischen bricht ab
  v_s1 := to_regprocedure('public.gast_aufgabe_status(text,boolean)') is not null;
  v_s2 := to_regprocedure('public.gast_notiz(text)') is not null;
  v_inner := to_regprocedure('leitstand_intern.gast_notiz_intern(text)') is not null;
  v_log := to_regclass('leitstand_intern.gast_notizen_log') is not null;
  if v_s1 then
    if md5((select prosrc from pg_proc where oid = to_regprocedure('public.gast_aufgabe_status(text,boolean)'))) <> 'de04e37fb1e47438e9a87f2770064b25'
       or has_function_privilege('anon', to_regprocedure('public.gast_aufgabe_status(text,boolean)')::oid, 'execute')
       or not has_function_privilege('authenticated', to_regprocedure('public.gast_aufgabe_status(text,boolean)')::oid, 'execute') then
      v_f := array_append(v_f, 'Stufe 1: public.gast_aufgabe_status(text, boolean) hat nicht den Wortlaut/die Rechte von `261006 rollen-gast.sql`.'::text);
    end if;
  end if;
  -- »Stufe 1 und Ergänzung in der früheren Fassung« (nur die Leseregel ist die alte Sperrliste) gilt als Ausgangsstand: das Skript ersetzt dann die Leseregel.
  if not ((v_s1 and not v_s2 and not v_inner and not v_log and v_pol_alt)
       or (not v_s1 and v_s2 and v_inner and v_log and (v_pol_neu or v_pol_frueher))) then
    v_f := v_f || format('Mischzustand (weder „nur Stufe 1“ noch „Stufe 1 und Ergänzung“): gast_aufgabe_status=%s, gast_notiz=%s, gast_notiz_intern=%s, Protokolltabelle=%s, Leseregel wie Stufe 1=%s, Leseregel wie Ergänzung=%s, Leseregel wie frühere Fassung der Ergänzung=%s.',
                         v_s1, v_s2, v_inner, v_log, v_pol_alt, v_pol_neu, v_pol_frueher);
  end if;

  if cardinality(v_f) > 0 then
    raise exception E'Abbruch, nichts geändert. % Befund(e) — diese Liste (ohne Passwörter, ohne Namen) an Main schicken, nicht „einfach durchlaufen lassen“:\n - %',
      cardinality(v_f), array_to_string(v_f, E'\n - ');
  end if;
end $vorab$;

-- ---------------------------------------------------------------------------------------------------
-- 1) Protokolltabelle für die Mengengrenzen (nur Admin-Funktionen/Eigentümer; für API-Rollen gesperrt)
-- ---------------------------------------------------------------------------------------------------
create table if not exists leitstand_intern.gast_notizen_log (
  id       bigserial primary key,
  zeit     timestamptz not null,
  user_id  uuid not null,          -- ohne Verweis auf auth.users: das Protokoll überlebt das Löschen eines Gast-Kontos
  kuerzel  text not null,
  notiz_id text not null
);
create index if not exists gast_notizen_log_zeit_idx on leitstand_intern.gast_notizen_log (zeit);
alter table leitstand_intern.gast_notizen_log enable row level security;
revoke all on table leitstand_intern.gast_notizen_log from public, anon, authenticated;
revoke all on sequence leitstand_intern.gast_notizen_log_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- 2) Die eigentliche Arbeit der Notiz-Funktion (Schema leitstand_intern: von der API aus nicht aufrufbar)
-- ---------------------------------------------------------------------------------------------------
create or replace function leitstand_intern.gast_notiz_intern(p_text text)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, pg_temp as $$
declare
  c_max_zeichen constant int := 1000;
  c_je_stunde   constant int := 10;
  c_je_tag      constant int := 30;
  c_gesamt_tag  constant int := 100;
  -- Alles mit Schreibweise \uXXXX (E-Zeichenfolgen), unabhängig von Kodierung und davon, wie der Editor beim Einfügen mit unsichtbaren Zeichen umgeht.
  -- Leerraum am Rand: Leerzeichen, Tabulator, Umbrüche, geschützte und andere Leerzeichen, Nullbreiten-Zeichen (außer den Zeichen, die Emoji verbinden: bleiben ungetrimmt)
  c_rand        constant text := E'[[:space:]\\u0085\\u00a0\\u180e\\u2000-\\u200d\\u2028\\u2029\\u202f\\u205f\\u2060\\u3000\\ufeff]';
  -- Zeichen ohne sichtbare Wirkung (nur für die Frage »ist nach dem Entfernen von allem Unsichtbaren noch etwas da?«): Leerraum, Braille-Leerfeld und die
  -- Zeichen, die Unicode als »ohne eigene Darstellung« führt (Default_Ignorable_Code_Point): weiches Trennzeichen, Füllzeichen (Hangul), Richtungszeichen,
  -- unsichtbare Rechenzeichen, Variantenwähler — auch außerhalb der Grundebene (Kurzschrift- und Musik-Steuerzeichen, Kennzeichen-Zeichen/Tags, weitere Variantenwähler)
  c_unsicht     constant text := E'[[:space:]\\u0085\\u00a0\\u00ad\\u034f\\u061c\\u115f\\u1160\\u1680\\u17b4\\u17b5\\u180b-\\u180f\\u2000-\\u200f\\u2028-\\u202f\\u205f-\\u206f\\u2800\\u3000\\u3164\\ufe00-\\ufe0f\\ufeff\\uffa0\\ufff0-\\ufff8\\U0001bca0-\\U0001bca3\\U0001d173-\\U0001d17a\\U000e0000-\\U000e0fff]';
  -- Abgelehnt im Text: Steuerzeichen außer Tabulator, Zeilenumbruch, Wagenrücklauf; Zeichen der Richtungsumkehr
  c_steuer      constant text := E'[\\u0001-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f\\u202a-\\u202e\\u2066-\\u2069]';
  v_uid uuid := auth.uid();
  v_k text; v_text text; v_jetzt timestamptz; v_id text; v_stunde int; v_tag int; v_gesamt int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'grund', 'nicht_angemeldet'); end if;
  -- Das Kürzel kommt aus der Gäste-Tabelle, nie aus dem Aufruf. Admins sind keine Gäste (auch nicht, wenn jemand sie dort eintrüge).
  select kuerzel into v_k from leitstand_intern.gaeste where user_id = v_uid;
  if v_k is null or exists (select 1 from leitstand_intern.admins where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'grund', 'kein_gast');
  end if;

  if p_text is null then return jsonb_build_object('ok', false, 'grund', 'leer'); end if;
  if length(p_text) > 20 * c_max_zeichen then   -- grob abweisen, bevor Text gerechnet wird
    return jsonb_build_object('ok', false, 'grund', 'zu_lang', 'max', c_max_zeichen);
  end if;
  v_text := regexp_replace(regexp_replace(p_text, '^' || c_rand || '+', ''), c_rand || '+$', '');
  if length(regexp_replace(v_text, c_unsicht || '+', '', 'g')) = 0 then return jsonb_build_object('ok', false, 'grund', 'leer'); end if;
  if length(v_text) > c_max_zeichen then return jsonb_build_object('ok', false, 'grund', 'zu_lang', 'max', c_max_zeichen); end if;
  if v_text ~ c_steuer then return jsonb_build_object('ok', false, 'grund', 'ungueltig'); end if;

  -- Alle Notiz-Aufrufe nacheinander: erst nach der Sperre wird gezählt, damit parallele Aufrufe die Grenze nicht überholen.
  perform pg_advisory_xact_lock(hashtext('leitstand_gast_notiz'));
  v_jetzt := clock_timestamp();
  delete from leitstand_intern.gast_notizen_log where zeit < v_jetzt - interval '2 days';
  select count(*) filter (where zeit > v_jetzt - interval '1 hour'), count(*)
    into v_stunde, v_tag
    from leitstand_intern.gast_notizen_log
   where (user_id = v_uid or kuerzel = v_k) and zeit > v_jetzt - interval '1 day';
  if v_stunde >= c_je_stunde then return jsonb_build_object('ok', false, 'grund', 'limit_stunde', 'max', c_je_stunde); end if;
  if v_tag >= c_je_tag then return jsonb_build_object('ok', false, 'grund', 'limit_tag', 'max', c_je_tag); end if;
  select count(*) into v_gesamt from leitstand_intern.gast_notizen_log where zeit > v_jetzt - interval '1 day';
  if v_gesamt >= c_gesamt_tag then return jsonb_build_object('ok', false, 'grund', 'limit_gesamt', 'max', c_gesamt_tag); end if;

  v_id := gen_random_uuid()::text;
  begin   -- beides oder nichts: scheitert eines, bleibt auch das Protokoll ohne Zeile
    insert into public.docs (collection, id, data, updated_by)
    values ('notes', v_id,
            jsonb_build_object('wer', 'Gast-' || v_k, 'text', v_text, 'rolle', 'gast',
                               'created', to_char(v_jetzt at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
            'gast:' || v_k);
    insert into leitstand_intern.gast_notizen_log (zeit, user_id, kuerzel, notiz_id) values (v_jetzt, v_uid, v_k, v_id);
  exception when others then
    return jsonb_build_object('ok', false, 'grund', 'fehler');
  end;
  return jsonb_build_object('ok', true, 'id', v_id, 'kuerzel', v_k);
end $$;

-- Die Hülle, die die Oberfläche aufruft. SQL-Rumpf (BEGIN ATOMIC): die Datenbank merkt sich den Verweis auf gast_notiz_intern
-- und damit auf das Schema leitstand_intern — der Rückbau der ersten Stufe (drop schema … cascade) nimmt die Hülle mit.
create or replace function public.gast_notiz(p_text text)
returns jsonb language sql volatile security definer set search_path = pg_catalog, pg_temp
begin atomic
  select leitstand_intern.gast_notiz_intern(p_text);
end;

-- ---------------------------------------------------------------------------------------------------
-- 3) Gäste lesen nur Freigegebenes (Positivliste, ohne Claude-Aufträge in todos): Leseregel ersetzen (alter policy ändert die Regel an Ort und Stelle,
--    nie ohne Regel)
-- ---------------------------------------------------------------------------------------------------
do $regel$
begin
  execute format('alter policy docs_gast_lesen on public.docs using ((select leitstand_intern.ist_gast()) and %s)', current_setting('leitstand.v2_sperre'));
end $regel$;

-- ---------------------------------------------------------------------------------------------------
-- 4) Gäste haken nichts mehr ab
-- ---------------------------------------------------------------------------------------------------
drop function if exists public.gast_aufgabe_status(text, boolean);

-- ---------------------------------------------------------------------------------------------------
-- 5) Rechte: für anon nichts; für angemeldete Konten nur gast_notiz (die Innenfunktion bleibt dem Eigentümer vorbehalten)
-- ---------------------------------------------------------------------------------------------------
revoke all on function public.gast_notiz(text) from public, anon;
grant execute on function public.gast_notiz(text) to authenticated;
revoke all on function leitstand_intern.gast_notiz_intern(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- 6) Schlussprüfung: sonst geht alles zurück
-- ---------------------------------------------------------------------------------------------------
do $schluss$
declare
  v_h oid := to_regprocedure('public.gast_notiz(text)')::oid; v_i oid := to_regprocedure('leitstand_intern.gast_notiz_intern(text)')::oid;
  v_q text; v_aq text; v_ac text; v_eg2 text; v_eaq text; v_eac text; v_schritt text; v_f text := '';
begin
  select qual into v_q from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_gast_lesen' and cmd = 'SELECT' and roles = array['authenticated']::name[] and with_check is null;
  select qual, with_check into v_aq, v_ac from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_admin' and cmd = 'ALL' and roles = array['authenticated']::name[];
  -- Wortlaut beider Regeln gegen das, was diese Datenbank aus dem erwarteten Text macht (zurückgerollte Probe)
  begin
    alter policy docs_admin on public.docs using ((select leitstand_intern.ist_admin())) with check ((select leitstand_intern.ist_admin()));
    select qual, with_check into v_eaq, v_eac from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_admin';
    execute format('alter policy docs_gast_lesen on public.docs using ((select leitstand_intern.ist_gast()) and %s)', current_setting('leitstand.v2_sperre'));
    select qual into v_eg2 from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname = 'docs_gast_lesen';
    raise exception 'Probe zu Ende' using errcode = 'LP002';
  exception
    when sqlstate 'LP002' then null;
    when others then v_f := sqlerrm;
  end;
  if v_f <> '' or v_q is distinct from v_eg2 or v_aq is distinct from v_eaq or v_ac is distinct from v_eac then
    raise exception 'Abbruch: Wortlaut der Regeln auf docs nicht wie erwartet, nichts geändert.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'docs' and policyname in ('docs_admin', 'docs_gast_lesen')) <> 2
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'docs') <> 2
     or v_q is null or position('ist_gast' in v_q) = 0 or position('aussagen_sterne' in v_q) = 0 or position('s11status' in v_q) = 0 then
    raise exception 'Abbruch: Regeln auf docs nicht wie erwartet, nichts geändert.';
  end if;
  if to_regprocedure('public.gast_aufgabe_status(text,boolean)') is not null or v_h is null or v_i is null
     or to_regclass('leitstand_intern.gast_notizen_log') is null then
    raise exception 'Abbruch: Funktionen/Tabelle der Ergänzung nicht wie erwartet, nichts geändert.';
  end if;
  if has_function_privilege('anon', v_h, 'execute') or not has_function_privilege('authenticated', v_h, 'execute')
     or has_function_privilege('anon', v_i, 'execute') or has_function_privilege('authenticated', v_i, 'execute')
     or (select count(*) from pg_proc where oid in (v_h, v_i) and prosecdef and exists (select 1 from unnest(proconfig) c where c like 'search_path=%')) <> 2 then
    raise exception 'Abbruch: Rechte/Bauart der Notiz-Funktionen nicht wie erwartet, nichts geändert.';
  end if;
  if to_regprocedure('public.s11_claim(text,text)') is not null
     and (has_function_privilege('anon', to_regprocedure('public.s11_claim(text,text)')::oid, 'execute')
          or has_function_privilege('authenticated', to_regprocedure('public.s11_claim(text,text)')::oid, 'execute')) then
    raise exception 'Abbruch: s11_claim ist für Angemeldete aufrufbar, nichts geändert.';
  end if;
  -- Die Hülle muss am Schema hängen (sonst nähme der Rückbau der ersten Stufe sie nicht mit)
  if not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = v_h and d.refclassid = 'pg_proc'::regclass and d.refobjid = v_i and d.deptype = 'n') then
    raise exception 'Abbruch: Die Hülle gast_notiz hängt nicht an gast_notiz_intern (Rückbau der ersten Stufe würde sie stehen lassen), nichts geändert.';
  end if;
  if not (select c.relrowsecurity and not has_table_privilege('anon', c.oid, 'select,insert,update,delete') and not has_table_privilege('authenticated', c.oid, 'select,insert,update,delete')
            from pg_class c where c.oid = 'leitstand_intern.gast_notizen_log'::regclass) then
    raise exception 'Abbruch: Protokolltabelle nicht gesperrt, nichts geändert.';
  end if;
  if (select count(*) from leitstand_intern.admins a join auth.users u on u.id = a.user_id) <> 4 or (select count(*) from leitstand_intern.admins) <> 4 then
    raise exception 'Abbruch: Admin-Tabelle enthält nicht genau die vier Konten.';
  end if;
end $schluss$;

commit;
