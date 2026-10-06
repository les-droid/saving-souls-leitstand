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
  Datenbank-Regel**: die Admin-Policy `docs_admin` erlaubt beiden Editoren alles auf `docs` (Gäste dürfen nur lesen, Sterne setzen sie nie).
- **Lokale Demo:** `index.html?demo=1` (nur auf localhost, 127.0.0.1, [::1] oder als file:) lädt `aussagen-demo.js` mit
  erfundenen Beispieldaten; keine Datenbank, keine Anmeldung, Sterne nur im Speicher. Auf der Live-Seite wird die Datei nie geladen.

## Rollen und Gast-Zugang (seit 06.10.2026, nachgebessert nach zwei Prüfungen)
- **Admin** = die vier Team-Konten (GitHub und Kürzel-Konto von LES und JB): Vollzugriff wie bisher. Die Seite ist für sie
  unverändert, bis auf drei Dinge: (1) nach jeder Anmeldung wird „Ich bin“ auf das Kürzel des Kontos gesetzt (ein auf dem Gerät
  zurückgebliebenes Gast-Kürzel läuft nicht weiter); (2) Abhaken/Zurückholen einer Aufgabe schreibt zusätzlich `geaendert_von`,
  `geaendert_am`, `geaendert_rolle: "admin"` mit; (3) bei Netzfehlern wird die Rollenabfrage wiederholt (siehe „Fehlerwege“).
- **Gast** = weitere Kollegen und Praktikanten: Knopf „Als Gast anmelden“ im Anmeldefenster, Kürzel (2–8 Buchstaben/Ziffern; das
  Format prüft schon der Browser, bevor ein Konto entsteht) und das gemeinsame Gast-Passwort. TS und DS dürfen als Gast-Kürzel
  benutzt werden; LES, JB, CL, CLAUDE, SYSTEM, SEED, ADMIN, GAST (auch mit angehängten Ziffern, z. B. LES1) nicht.
- **Was Gäste dürfen:** alles lesen; den Status einer Aufgabe ändern (abhaken/zurückholen) — sonst nichts. Anlegen, Ändern, Löschen,
  Antworten, Zeiten, Reviews/Kommentare, Hinweise und Kommentare abhaken, Sterne, Befehle, der Reiter „Claude“ sind ausgeblendet
  bzw. deaktiviert und serverseitig gesperrt.
- **Gemeinsame Beschreibung „Gast darf abhaken“** (Server `gast_aufgabe_status`, Oberfläche `todoLi` in `index.html`, Demo
  `gast-demo.js` — alle drei gleich): ein Dokument der Sammlung `todos` mit Feld `text` (also eine Aufgabe), bei dem **keine** der
  Sperren gilt: `typ` = claude **oder** frage · `wer` = Claude · `quelle` = chat · `angefordert` = true · `s11status` gesetzt.
  Rückfragen (`typ: frage`) können Gäste weder beantworten noch abhaken. Entscheiden tut immer der Server; die Oberfläche
  deaktiviert nur dasselbe Häkchen, setzt es nach einer Ablehnung zurück und nennt den Grund als Hinweistext.
- **Wer hat zuletzt abgehakt:** an jeder Aufgabe steht „abgehakt von TS (Gast), 06.10. 11:34“ (bzw. „zurückgeholt von …“). Gäste
  setzen das serverseitig (`geaendert_von` = Kürzel aus der Gast-Tabelle, `geaendert_am`, `geaendert_rolle: "gast"`, außerdem
  `updated_by = gast:KÜRZEL`); Editoren schreiben es beim Abhaken in der Oberfläche mit. Ändert ein Hintergrunddienst `done`,
  ohne das mitzuschreiben, kann der Vermerk veraltet sein — Zeitpunkt lesen.
- **Was Gäste lesend sehen:** alle Seiten, die Statuszeile an Befehlen („Angefordert von …, läuft …“) und das Panel „Schnitt 11“
  (Status und Ergebnisse, ohne Bedienhinweis), Sterne (grau; Tipp „Sterne setzen nur die Editoren“), Zeiteinträge und Auswertung.
  **Nicht** sichtbar: Reiter „Claude“ (die Chat-Fernsteuerung mit Verlauf bräuchte einen Umbau — bewusst nicht gemacht),
  Briefing/JB-Karte, „Ich bin“, „Mein Zettel“ (privat im Browserspeicher des Geräts: Gäste sehen und löschen ihn nicht),
  die Stoppuhr-Karte (zeigt sonst die laufende Uhr einer anderen Person auf demselben Gerät).
- **Durchgesetzt wird es in der Datenbank**, nicht im Browser: Policies `docs_admin` / `docs_gast_lesen`, Funktionen
  `meine_rolle`, `gast_anmelden`, `gast_aufgabe_status` (siehe `supabase/schema.sql`, Abschnitt 8). Admin ist, wessen Konto-ID in
  `leitstand_intern.admins` steht — beim **ersten** Einspielen aus den Anmelde-Identitäten (`auth.identities`) gefüllt, danach nie
  wieder neu; das Skript bricht ab, wenn die Einträge nicht mehr genau den vier Konten entsprechen. Nie zählt, was ein Nutzer sich
  selbst in `user_metadata` schreibt. Ein Gast-Konto kann nicht nachträglich zu einem festen Konto gemacht werden (Trigger auf `auth.users`).
- **Gast-Passwort**: ein Passwort für alle Gäste; im Server als bcrypt-Hash, nie im Code. Der Server verlangt mindestens 16 Zeichen und
  mindestens 8 verschiedene; vorgesehen ist ein zufälliges mit 20+ Zeichen aus dem Passwortmanager. Fehlversuche: je Sitzung 5 in 15
  Minuten; gesamt ab 300 in 15 Minuten eine **wachsende Wartezeit** (2 s, verdoppelt je 20 weitere, höchstens 10 Minuten) statt harter
  Sperre — so kann ein Fremder mit ein paar neuen Sitzungen echte Gäste nicht aussperren. Admins sind davon nie betroffen. Neu setzen
  (wirft alle Gäste hinaus): `select leitstand_intern.gast_passwort_setzen('…');` im SQL-Editor — danach den Verlauf des Editors löschen.
  Alle Gäste sofort aussperren: `delete from leitstand_intern.gaeste;` (offene Gast-Fenster merken es spätestens nach einer Minute und
  zeigen „Dein Gast-Zugang wurde beendet“).
- **Weiteres Admin-Konto:** nicht vorgesehen ohne Eingriff, mit Absicht (so kann sich niemand einschleichen). Weg: Main passt
  `nur_team()` (neue Adresse/GitHub-Name) und die erwartete Konten-Zahl und -Liste im Einspiel-Skript an; dann Rückbau Teil 1, Konto
  anlegen, Skript neu einspielen. Ein von Hand in `leitstand_intern.admins` eingetragenes Konto wird beim nächsten Einspielen als
  Abweichung erkannt und führt zum Abbruch.
- **Einspielen / Zurück:** `supabase/261006 rollen-gast.sql` — prüft vorab selbst (Rechte des SQL-Editors, fremde Regeln in `public` und
  `storage`, öffentliche Buckets, ungeschützte Tabellen/Sichten, unbekannte Funktionen, Kontenbestand) und bricht mit einer Liste ab.
  Rückbau: `supabase/261006 rollen-gast-rueckbau.sql` (Teil 1: löscht alle anonymen Konten, schließt die Zugangsregel für anonyme
  Token auch bis zu deren Ablauf; Admins arbeiten unverändert) und optional `…-teil2.sql` (alter Wortlaut samt bekannter Lücke).
  Reihenfolge der Inbetriebnahme: SQL, Gast-Passwort setzen, erst dann der Schalter „Anonymous Sign-Ins“, zuletzt die Seite.
  Schritt für Schritt: `post/bau-261006-leitstand-rollen/261006 Einspielen und Testen CL LES.md` im privaten Gedächtnis-Repo.
- **Fehlerwege der Oberfläche:** Die Rolle wird mit Zeitgrenze (8 s) und bis zu drei Versuchen erfragt. Netz/Zeitüberschreitung/Serverausfall →
  Karte „Keine Verbindung zum Server“ mit „Erneut versuchen“ (Anmeldung bleibt bestehen). Ablehnung durch den Server (z. B. Code 42501) →
  Karte „Der Server hat die Prüfung abgelehnt“ mit Code, ohne Wiederholen; Neuanmelden würde nichts ändern. Fehlt die Funktion
  (SQL noch nicht eingespielt) gilt weiter: Team-Konto = Admin, anonyme Sitzung = nichts. Sitzungswechsel in einem anderen Fenster
  (Abmelden, anderes Konto) lädt dieses Fenster neu. Eine Restsitzung ohne Gast-Eintrag wird verworfen; ein Hinweis erscheint nur,
  wenn das Gerät schon einmal als Gast angemeldet war.
- **Was geprüft ist:** Datenbank-Seite mit der Test-Kette (Nachbau von Supabase in PGlite, `test-rollen.mjs` im privaten Repo),
  Zugriffsschicht und Fehlerwege mit `test-oberflaeche-db.html` und einer Prüfkopie mit Supabase-Attrappe. Die **Gast-Demo
  (`?demo=gast`) umgeht `leitstand-db.js`**: sie zeigt nur die Gast-Oberfläche, nicht Anmeldung, Rollenabfrage oder Fehlerwege.
  Nur an der echten Plattform prüfbar bleiben: Token-Laufzeit, die Dashboard-Schalter, echte Antwortzeiten, Verhalten von Realtime
  bei Löschungen (Blicktest: Gast-Eintrag löschen, im Gast-Fenster innerhalb einer Minute die Karte „Gast-Zugang beendet“ sehen).
- **Lokale Demo der Gast-Sicht:** `index.html?demo=gast` (nur auf localhost, 127.0.0.1, [::1] oder als file:) — `gast-demo.js`,
  erfundene Daten (auch Fälle, die der Server sperrt: Chat-Aufgabe, Aufgabe mit Lauf-Status, Aufgabe von Claude, Rückfrage,
  Dokument ohne Aufgaben-Merkmale); die Server-Funktion für den Statuswechsel ist nachgebildet, alles andere Schreiben wird
  abgelehnt. Unten rechts steht, was passiert ist.
