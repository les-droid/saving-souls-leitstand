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
