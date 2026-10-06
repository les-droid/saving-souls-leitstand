# Leitstand – Live-Betrieb (seit 04.09.2026)

Das Board auf GitHub Pages ist **nicht mehr die Lesefassung**, sondern die Live-Version:
alle To-dos, Notizen, Hinweise, Reviews liegen in Supabase (Tabelle `docs`) und sind für alle
Team-Mitglieder in Echtzeit geteilt – unabhängig vom Claude-Account.

**Für die Claude-Desktop-Session:** `index.html` bitte **nicht mehr** als Lesefassung neu generieren.
Änderungen am Board-Code direkt in `index.html` machen; die Datenbank-Schicht bleibt in `leitstand-db.js`.

## Dateien
- `index.html` – Board (Script 1 = Board-Logik; Kürzel-Dialog nur, solange auf dem Gerät keins gewählt ist)
- `leitstand-db.js` – Supabase-Anbindung, bildet `claude.use("db")` nach; Anmeldung mit Kürzel + Passwort
  (Supabase-Konten `les@…`/`jb@…`, `KUERZEL_KONTEN`), GitHub-Login als Zweitweg (Tokens werden vor dem
  Board-Routing aus der URL gesichert); Realtime; „Abmelden“ in der Statuszeile (wechselt Konto und Kürzel);
  Panel „Schnitt 11“
- `leitstand-zeit.js` – Seite „Zeit“ (Stoppuhr, rückwirkende Einträge, Auswertung je Person/Kategorie, Claude-Zeit
  automatisch aus erledigten Claude-Aufgaben) und Lagebericht-Karte auf der Startseite (Dokument `lagebericht/aktuell`,
  für TS/DS ganz oben; „Wer macht was“ aus offenen To-dos). Claude auf Schnitt 11 schreibt beides per
  `schnitt11/leitstand.mjs` im Gedächtnis-Repo.
- `supabase/schema.sql` – Datenbank (einmal im Supabase-SQL-Editor ausführen)
- Startbestand: am 04.09. importiert (59 Einträge); die Seed-Datei liegt seitdem nur noch im privaten Repo
  `saving-souls-gedaechtnis/leitstand/daten-seed-260904.js`, nicht mehr öffentlich auf GitHub Pages

## Zugang
- Seit 22.09.2026: Kürzel wählen (LES/JB) und Passwort eingeben. Das Passwort prüft der Server (Supabase-Auth,
  E-Mail-Konto je Kürzel aus `KUERZEL_KONTEN` in `leitstand-db.js`); die Anmeldung gilt je Browser und bleibt dort.
  Konto anlegen oder Passwort ändern: am Schnittplatz `node ~/saving-souls-listener/konto-anlegen.mjs`
  (fragt Kürzel und Passwort ab, braucht den Service-Key aus der `.env` des Listeners).
- GitHub-Login bleibt als Zweitweg; nur Konten aus `nur_team` in `supabase/schema.sql` kommen durch
  (GitHub-Namen und die zwei Kürzel-E-Mails). Neue Teammitglieder: dort ergänzen (Migration) und in
  `KUERZEL_KONTEN` bzw. `GITHUB_KUERZEL` in `leitstand-db.js` das Kürzel zuordnen.
- Das frühere Team-Passwort im Browser (`TOR_HASH`) ist entfallen — es wurde nur im Browser geprüft und schützte
  nichts auf dem Server.
## Einrichtung
1. Supabase-Projekt anlegen → SQL-Editor → `supabase/schema.sql` ausführen → Auth-Provider GitHub aktivieren
   (GitHub OAuth-App: Homepage `https://les-droid.github.io/saving-souls-leitstand/`, Callback aus Supabase)
   → Authentication → URL Configuration → Site URL = Homepage
2. `leitstand-db.js`: `SUPABASE_URL` und `SUPABASE_ANON` eintragen, committen
3. Board öffnen → Kürzel + Passwort (oder „Mit GitHub anmelden“) → Startbestand wird automatisch übernommen
4. Schnitt 11: `schnitt11/BOOTSTRAP.md` ausführen lassen (Cron/Claude Code) – oder von Hand nach README dort

## Claude-Aufgaben an Schnitt 11
To-do anlegen, Art „Claude-Aufgabe (Jetzt erledigen)“, dann „Jetzt erledigen“ drücken.
Der Listener nimmt es innerhalb von Sekunden, zeigt die Ausgabe live im Panel „Schnitt 11“,
hakt das To-do ab und schreibt eine Team-Notiz mit der Zusammenfassung.
Abbrechen: To-do löschen.

## Aussagen (Reiter „Transkripte“, Standardansicht seit 05.10.2026)
- Der Reiter zeigt zuerst **Aussagen** (Prio 1–10, nach Thema oder nur nach Prio, Filter, Sterne, Frame.io-Link);
  die bisherige Clip-Tabelle ist die zweite Ansicht („Clips“, Hash `#transkripte?v=clips&…`). Alte Clip-Links
  ohne `v=` (mit `q`, `tag`, `fach`, `extern`, `pers`, `sens` oder `sort`) öffnen weiter die Clip-Tabelle.
- Hash der Aussagen-Ansicht: `ans=prio` (sonst nach Thema), `ab=0..10` (Standard 6, 0 = alle), `spr`, `dt`, `s`, `stern=einer|beide`.
- Zeiten `t0`/`t1` gelten im Kameraclip; auch Externton-Aussagen öffnen den Kameraclip (Tontranskript als zweite Spalte).
- Frame.io: die Adresse trägt keinen Zeitparameter; der Link öffnet die Tagesdatei, die Zeit steht daneben als „kopieren“-Knopf.
  Ist die Zeit nur ungefähr (`fio_genau: false` – Zeit der Transkriptzeile, die Aussage beginnt wenige Sekunden später), heißt der Knopf „Zeit ca. HH:MM:SS kopieren“; bei `true` oder fehlendem Feld wie bisher.
- Daten: Sammlung `aussagen` (ein Dokument je Aussage, vom Datenweg `260922 sichtung-nach-leitstand CL LES.mjs`,
  Schritt `--nur aussagen`). Aussagen mit `regie` (wahrheitsähnlich) werden nie angezeigt; der Datenweg überschreibt schon hochgeladene zu einem leeren Regie-Dokument. Fehlende Felder
  (`prio`, `rubrik`, `kern`, `fio_*`) hält die Seite aus; ohne `prio` steht eine Aussage unter „noch nicht bewertet“.
  `ohne_bild: true` (Aussage ohne Kamerabild, nur Ton; der Datenweg setzt es für die Liste `aussagen_ohne_bild`) zeigt in der Zeile den Vermerk „nur Ton“.
- **Sterne** liegen in der eigenen Sammlung `aussagen_sterne` (Dokument-Id `<Aussage-Id>__<Kürzel>`, Felder
  `aussage`, `kuerzel`, `stern`), nie im Katalog-Dokument — ein erneutes Einspielen berührt sie nicht. Jeder schaltet in der
  Oberfläche nur den eigenen Stern; das Kürzel wird aus der **Anmeldung** abgeleitet (`claude.kuerzel()` in `leitstand-db.js`:
  GitHub-Name oder Kürzel-Konto), nicht aus „Ich bin“. Ohne eindeutige Zuordnung sind beide Sterne gesperrt. Die Sperre „nur der eigene“ ist **Oberfläche, keine
  Datenbank-Regel**: die bestehende Policy `team_docs` erlaubt allen Team-Konten alles auf `docs`.
- **Lokale Demo:** `index.html?demo=1` (nur auf localhost, 127.0.0.1, [::1] oder als file:) lädt `aussagen-demo.js` mit
  erfundenen Beispieldaten; keine Datenbank, keine Anmeldung, Sterne nur im Speicher. Auf der Live-Seite wird die Datei nie geladen.

## Rollen und Gast-Zugang (seit 06.10.2026)
- **Admin** = die vier Team-Konten (GitHub und Kürzel-Konto von LES und JB): Vollzugriff wie bisher, Seite unverändert.
- **Gast** = weitere Kollegen und Praktikanten: Knopf „Als Gast anmelden“ im Anmeldefenster, Kürzel (2–8 Zeichen) und das
  gemeinsame Gast-Passwort. Gäste sehen **alles**, können aber nur den **Status einer Aufgabe** (abhaken/zurückholen) ändern;
  Anlegen, Ändern, Löschen, Antworten, Zeiten, Reviews/Kommentare, Sterne, der Reiter „Claude“ und alle Befehle sind ausgeblendet
  und serverseitig gesperrt. Oben rechts steht „Gast · KÜRZEL · nur lesen“. Jeder Statuswechsel speichert `geaendert_von`
  (Kürzel aus der Gast-Tabelle, nicht aus dem Browser) und `geaendert_am` an der Aufgabe.
- **Durchgesetzt wird es in der Datenbank**, nicht im Browser: Policies `docs_admin` / `docs_gast_lesen`, Funktionen
  `meine_rolle`, `gast_anmelden`, `gast_aufgabe_status` (siehe `supabase/schema.sql`, Abschnitt 8). Admin ist, wessen Konto-ID in
  `leitstand_intern.admins` steht (vom Einspiel-Skript einmal gefüllt) — nie jemand, der sich irgendwelche Angaben selbst setzt.
  Die Oberfläche fragt die Rolle beim Server (`claude.rolle()` in `leitstand-db.js`) und blendet danach nur noch aus.
- **Gast-Passwort**: ein Passwort für alle Gäste; im Server als bcrypt-Hash, nie im Code. Fehlversuche sind begrenzt (je Sitzung 5,
  insgesamt 20 je 15 Minuten); Admins sind davon nie betroffen. Neu setzen (wirft alle Gäste hinaus):
  `select leitstand_intern.gast_passwort_setzen('…');` im SQL-Editor. Alle Gäste sofort aussperren: `delete from leitstand_intern.gaeste;`
- **Einspielen / Zurück:** `supabase/261006 rollen-gast.sql` (wiederholbar, bricht ab, wenn nicht genau die vier Konten da sind) und
  `supabase/261006 rollen-gast-rueckbau.sql`. Reihenfolge der Inbetriebnahme: erst die Datenbank (SQL), dann den Schalter
  „Anonymous Sign-Ins“, zuletzt die Seite.
- **Lokale Demo der Gast-Sicht:** `index.html?demo=gast` (nur auf localhost, 127.0.0.1, [::1] oder als file:) — `gast-demo.js`,
  erfundene Daten; die Server-Funktion für den Statuswechsel ist nachgebildet, alles andere Schreiben wird abgelehnt. Unten rechts
  steht, was passiert ist.

