# Leitstand – Live-Betrieb (seit 04.09.2026)

Das Board auf GitHub Pages ist **nicht mehr die Lesefassung**, sondern die Live-Version:
alle To-dos, Notizen, Hinweise, Reviews liegen in Supabase (Tabelle `docs`) und sind für alle
Team-Mitglieder in Echtzeit geteilt – unabhängig vom Claude-Account.

**Für die Claude-Desktop-Session:** `index.html` bitte **nicht mehr** als Lesefassung neu generieren.
Änderungen am Board-Code direkt in `index.html` machen; die Datenbank-Schicht bleibt in `leitstand-db.js`.

## Dateien
- `index.html` – Board (Script 1 = unverändert; Lesefassungs-Shim durch drei Script-Tags ersetzt)
- `leitstand-db.js` – Supabase-Anbindung, bildet `claude.use("db")` nach; GitHub-Login; Realtime; Panel „Schnitt 11“
- `daten-seed.js` – Startbestand aus der letzten Lesefassung, wird beim ersten Start einmalig importiert
- `supabase/schema.sql` – Datenbank (einmal im Supabase-SQL-Editor ausführen)
- `schnitt11/` – Listener für den Schnittrechner: arbeitet Claude-Aufgaben („Jetzt erledigen“) mit Claude Code ab
  (gehört ins Repo `saving-souls-gedaechtnis`, das der Cron auf Schnitt 11 zieht; liegt hier nur als Kopie)

## Einrichtung
1. Supabase-Projekt anlegen → SQL-Editor → `supabase/schema.sql` ausführen → Auth-Provider GitHub aktivieren
   (GitHub OAuth-App: Homepage `https://les-droid.github.io/saving-souls-leitstand/`, Callback aus Supabase)
   → Authentication → URL Configuration → Site URL = Homepage
2. `leitstand-db.js`: `SUPABASE_URL` und `SUPABASE_ANON` eintragen, committen
3. Board öffnen → „Mit GitHub anmelden“ → Startbestand wird automatisch übernommen
4. Schnitt 11: `schnitt11/BOOTSTRAP.md` ausführen lassen (Cron/Claude Code) – oder von Hand nach README dort

## Claude-Aufgaben an Schnitt 11
To-do anlegen, Art „Claude-Aufgabe (Jetzt erledigen)“, dann „Jetzt erledigen“ drücken.
Der Listener nimmt es innerhalb von Sekunden, zeigt die Ausgabe live im Panel „Schnitt 11“,
hakt das To-do ab und schreibt eine Team-Notiz mit der Zusammenfassung.
Abbrechen: To-do löschen.
