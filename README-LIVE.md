# Leitstand – Live-Betrieb (seit 04.09.2026)

Das Board auf GitHub Pages ist **nicht mehr die Lesefassung**, sondern die Live-Version:
alle To-dos, Notizen, Hinweise, Reviews liegen in Supabase (Tabelle `docs`) und sind für alle
Team-Mitglieder in Echtzeit geteilt – unabhängig vom Claude-Account.

**Für die Claude-Desktop-Session:** `index.html` bitte **nicht mehr** als Lesefassung neu generieren.
Änderungen am Board-Code direkt in `index.html` machen; die Datenbank-Schicht bleibt in `leitstand-db.js`.

## Dateien
- `index.html` – Board (Script 1 = Board-Logik; Kürzel-Dialog nur, solange auf dem Gerät keins gewählt ist)
- `leitstand-db.js` – Supabase-Anbindung, bildet `claude.use("db")` nach; Team-Passwort (Vorhang, einmal je Gerät);
  GitHub-Login (Tokens werden vor dem Board-Routing aus der URL gesichert); Realtime; „Abmelden“ in der Statuszeile
  (wechselt GitHub-Konto und Kürzel); Panel „Schnitt 11“
- `supabase/schema.sql` – Datenbank (einmal im Supabase-SQL-Editor ausführen)
- Startbestand: am 04.09. importiert (59 Einträge); die Seed-Datei liegt seitdem nur noch im privaten Repo
  `saving-souls-gedaechtnis/leitstand/daten-seed-260904.js`, nicht mehr öffentlich auf GitHub Pages

## Zugang
- Team-Passwort: Klartext nur im Team, im Code steht der SHA-256-Hash (`TOR_HASH` in `leitstand-db.js`).
  Ändern: neuen Hash eintragen (`printf '%s' 'neues-passwort' | sha256sum`), alle Geräte fragen dann einmal neu.
- Danach GitHub-Login; nur Konten aus `nur_team` in `supabase/schema.sql` kommen durch. Neue Teammitglieder:
  GitHub-Namen dort ergänzen (Migration) und in `GITHUB_KUERZEL` in `leitstand-db.js` das Kürzel zuordnen.
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
