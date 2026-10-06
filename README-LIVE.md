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

## Rollen und Gast-Zugang (seit 06.10.2026, nachgebessert nach drei Prüfungen)
- **Admin** = die vier Team-Konten (GitHub und Kürzel-Konto von LES und JB): Vollzugriff wie bisher. Die Seite ist für sie
  unverändert, bis auf drei Dinge: (1) nach jeder Anmeldung (Kürzel + Passwort oder Rückkehr von GitHub) wird „Ich bin“ auf das
  Kürzel des Kontos gesetzt (ein auf dem Gerät zurückgebliebenes Gast-Kürzel läuft nicht weiter) — **nicht** beim bloßen Neuladen
  mit bestehender Sitzung: die Wahl unter „Ich bin“ (z. B. TS/DS an einem Team-Konto) bleibt bis zur nächsten Anmeldung, und der
  Einführungs-Dialog erscheint nur nach einer Anmeldung, nicht bei jedem Seitenaufruf; (2) Abhaken/Zurückholen einer Aufgabe schreibt zusätzlich `geaendert_von`,
  `geaendert_am`, `geaendert_rolle: "admin"` mit (auch beim Beantworten einer Rückfrage und bei der JB-Karte); (3) bei Netzfehlern wird die Rollenabfrage wiederholt (siehe „Fehlerwege“).
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
- **Wer hat zuletzt abgehakt:** an jeder Aufgabe, die seit der Umstellung abgehakt oder zurückgeholt wurde, steht
  „abgehakt von TS (Gast), 06.10., 11:34“ (bzw. „zurückgeholt von …“). Gäste
  setzen das serverseitig (`geaendert_von` = Kürzel aus der Gast-Tabelle, `geaendert_am`, `geaendert_rolle: "gast"`, außerdem
  `updated_by = gast:KÜRZEL`); Editoren schreiben es in der Oberfläche überall mit, wo sie `done` setzen (Häkchen, Zurückholen,
  Antwort auf eine Rückfrage, JB-Karte). Ändert der Hintergrunddienst `done` (Claude-Aufgaben), steht dort kein Vermerk
  oder ein älterer — Zeitpunkt lesen.
- **Was Gäste lesend sehen:** alle Seiten, die Statuszeile an Befehlen („Angefordert von …, läuft …“) und das Panel „Schnitt 11“
  (Status und Ergebnisse, ohne Bedienhinweis), Sterne (grau; Tipp „Sterne setzen nur die Editoren“), Zeiteinträge und Auswertung.
  **Nicht** sichtbar: Reiter „Claude“ (die Chat-Fernsteuerung mit Verlauf bräuchte einen Umbau — bewusst nicht gemacht),
  Briefing/JB-Karte, „Ich bin“, „Mein Zettel“ (privat im Browserspeicher des Geräts: Gäste sehen und löschen ihn nicht),
  die Stoppuhr-Karte samt Lauf-Punkt am Reiter „Zeit“ (zeigt sonst die laufende Uhr einer anderen Person auf demselben Gerät).
- **Durchgesetzt wird es in der Datenbank**, nicht im Browser: Policies `docs_admin` / `docs_gast_lesen`, Funktionen
  `meine_rolle`, `gast_anmelden`, `gast_aufgabe_status` (siehe `supabase/schema.sql`, Abschnitt 8). Admin ist, wessen Konto-ID in
  `leitstand_intern.admins` steht — beim **ersten** Einspielen aus den Anmelde-Identitäten (`auth.identities`) gefüllt, danach nie
  wieder neu; das Skript bricht ab, wenn die Einträge nicht mehr genau den vier Konten entsprechen. Nie zählt, was ein Nutzer sich
  selbst in `user_metadata` schreibt. Ein Gast-Konto kann nicht nachträglich zu einem festen Konto gemacht werden (Trigger auf `auth.users`),
  auch nicht zu einem der beiden Kürzel-Konten.
- **Anmeldung neuer Konten (`nur_team`, Trigger beim Anlegen):** hängt am **Anbieter**, den der Anmeldedienst serverseitig setzt
  (`raw_app_meta_data->>'provider'`), nicht an Angaben des Nutzers: GitHub-Name nur bei Anbieter `github`, die zwei Kürzel-Adressen nur bei
  Anbieter `email`, anonyme Konten (Gast) wie bisher. Ein E-Mail-Konto mit selbst gesetztem `user_name` eines Admins wird abgewiesen —
  die alte Prüfung ließ es durch. Das ist eine reine Verbesserung gegenüber dem Stand vor der Umstellung; auch der Rückbau stellt
  `nur_team()` in dieser Fassung (ohne anonyme Konten) her, nicht den alten Wortlaut.
- **Gast-Passwort**: ein Passwort für alle Gäste; im Server als bcrypt-Hash, nie im Code. Der Server verlangt **mindestens 20 Zeichen**
  aus **mindestens drei Klassen** (Kleinbuchstaben, Großbuchstaben, Ziffern, Sonderzeichen) und mindestens 8 verschiedene Zeichen
  und weist den Platzhalter „HIER-…“ ab; vorgesehen ist ein zufälliges aus dem Passwortmanager (ob es zufällig ist, kann der Server nicht
  prüfen). Fehlversuche: je Sitzung 5 in 15 Minuten, danach „gesperrt“ für diese Sitzung; parallele Aufrufe laufen nacheinander; neue
  anonyme Sitzungen bremst das Rate-Limit der Plattform. Eine **Gesamtbremse über alle Sitzungen gibt es nicht mehr**: Sie ließ Fremde, die
  nur falsch rieten, echte Gäste hinhalten, und schützt bei einem zufälligen 20-Zeichen-Passwort nichts. Die Tabelle
  `leitstand_intern.gast_versuche` bleibt als Protokoll der Fehlversuche (Zeilen älter als ein Tag werden bei der nächsten Anmeldung
  entfernt) — Abfrage dazu in der Anleitung („woran man Rateversuche erkennt“). Admins sind davon nie betroffen. Neu setzen
  (wirft alle Gäste hinaus): `select leitstand_intern.gast_passwort_setzen('…');` im SQL-Editor — danach den Verlauf des Editors löschen.
  Alle Gäste sofort aussperren: `delete from leitstand_intern.gaeste;` (offene Gast-Fenster merken es spätestens nach einer Minute und
  zeigen „Dein Gast-Zugang wurde beendet“).
- **Weiteres Admin-Konto:** nicht vorgesehen ohne Eingriff, mit Absicht (so kann sich niemand einschleichen). Weg: Main passt
  `nur_team()` (neue Adresse/GitHub-Name) und die erwartete Konten-Zahl und -Liste im Einspiel-Skript an; dann Rückbau Teil 1, Konto
  anlegen, Skript neu einspielen.
- **Eines der vier Admin-Konten musste neu angelegt werden (neue Konto-ID)?** Das neue Konto hat bis dahin **keinen Zugriff** (Rolle
  „keine“), das Einspiel-Skript und der Rückbau brechen ab und nennen denselben Handweg: (1) Authentication → Users: die Konto-ID (UUID)
  des **neuen** Kontos kopieren und prüfen, dass es das richtige ist (E-Mail bzw. GitHub-Name); (2) im SQL-Editor, mit eingesetzter ID und
  dem Kürzel `LES` oder `JB`:
  `insert into leitstand_intern.admins (user_id, kuerzel) select u.id, '<LES oder JB>' from auth.users u where u.id = '<ID>' and not coalesce(u.is_anonymous, false) on conflict (user_id) do nothing;`
  (trägt nur ein vorhandenes, nicht anonymes Konto ein; die Zeile des gelöschten Kontos ist durch das Löschen von selbst weg);
  danach die Zahl der eingefügten Zeilen prüfen — **erwartet 1** (bei 0 stimmt die ID nicht, oder das Konto ist anonym oder schon eingetragen); (3) das Skript bzw. den Rückbau erneut starten. Ein auf
  anderem Weg eingetragenes Konto erkennt das Skript als Abweichung und bricht ab.
- **Einspielen / Zurück:** `supabase/261006 rollen-gast.sql` — prüft vorab selbst (Rechte des SQL-Editors, fremde Regeln in `public` und
  `storage`, öffentliche Buckets, ungeschützte Tabellen/Sichten, unbekannte Funktionen, Kontenbestand) und bricht mit einer Liste ab.
  Die Rechte des ausführenden Nutzers werden nicht erfragt („Eigentümer?“), sondern **ausprobiert**: das Skript legt probeweise Trigger an
  **und entfernt ihn wieder** (der Rückbau braucht das Entfernen; darf der Nutzer es nicht, bricht schon das Einspielen ab), dazu Schema,
  Tabelle mit Verweis auf `auth.users`, Regel und Funktion, und löscht eine Zeile in `auth.users` — alles in einem Unterblock, der
  zurückgerollt wird; scheitert ein Schritt, bricht es mit der Überschrift „Probe fehlgeschlagen (Rechte, Verweis oder Sperre)“, dem
  Schritt und der Meldung der Datenbank ab. Der Rückbau probt dasselbe noch einmal vor seinem Eingriff.
  Rückbau: `supabase/261006 rollen-gast-rueckbau.sql` (Teil 1: löscht alle anonymen Konten, schließt die Zugangsregel für anonyme
  Token auch bis zu deren Ablauf; Admins arbeiten unverändert) und optional `…-teil2.sql` (alter Wortlaut der Regel `team_docs` —
  **frühestens 7 Tage nach Teil 1**, das Skript erzwingt die Wartezeit, weil bereits ausgestellte Token gelöschter anonymer Konten
  bis zu ihrem Ablauf gültig bleiben; `nur_team()` bleibt dabei in der besseren Fassung).
  Reihenfolge der Inbetriebnahme: SQL, Gast-Passwort setzen, erst dann der Schalter „Anonymous Sign-Ins“, zuletzt die Seite.
  Schritt für Schritt: `post/bau-261006-leitstand-rollen/261006 Einspielen und Testen CL LES.md` im privaten Gedächtnis-Repo.
- **Fehlerwege der Oberfläche:** Auch das Holen der gespeicherten Sitzung beim Seitenaufruf: ein wiederholbarer Fehler (Netz weg,
  Serverausfall, Zeitgrenze) zeigt die Karte „Keine Verbindung zum Server“ mit „Erneut versuchen“ statt des Anmeldefensters (die
  Sitzung bleibt gespeichert). Die Rolle wird mit Zeitgrenze (8 s) und bis zu drei Versuchen erfragt. Netz/Zeitüberschreitung/Serverausfall →
  Karte „Keine Verbindung zum Server“ mit „Erneut versuchen“ (Anmeldung bleibt bestehen). **HTTP 401 / PGRST301 / PGRST303** (Zugangstoken
  ungültig oder abgelaufen) → Anmeldefenster mit „Anmeldung abgelaufen — bitte neu anmelden.“, die verbrauchte Sitzung wird lokal
  verworfen. Während die Rolle nach der Anmeldung geprüft wird, steht im Anmeldefenster „Anmeldung wird geprüft …“ und das Gast-Formular
  ist gesperrt; das Passwortfeld der Gast-Anmeldung wird nur bei falschem Passwort geleert. Ablehnung durch den Server (z. B. Code 42501) →
  Karte „Der Server hat die Prüfung abgelehnt“ mit Code, ohne selbsttätiges Wiederholen (der Knopf „Erneut versuchen“ steht auch
  dort, daneben „Abmelden“); Neuanmelden würde nichts ändern. Fehlt die Funktion
  (SQL noch nicht eingespielt) gilt weiter: Team-Konto = Admin, anonyme Sitzung = nichts. Sitzungswechsel in einem anderen Fenster
  (Abmelden, anderes Konto) lädt dieses Fenster neu. Ein Fenster, das noch am Anmeldefenster steht, startet nach einer
  Team-Anmeldung im anderen Fenster von selbst, nach einer Gast-Anmeldung dort **nicht** (neu laden oder hier ebenfalls als Gast
  anmelden — dabei wird die vorhandene Gast-Sitzung des Browsers weiterverwendet, kein zweites Konto angelegt; es gilt das zuletzt
  eingegebene Kürzel). Eine Restsitzung ohne Gast-Eintrag wird verworfen; ein Hinweis erscheint nur,
  wenn das Gerät schon einmal als Gast angemeldet war. Gast-Anmeldung: „Keine Verbindung“ (Netz/Serverausfall), „zu viele
  Gast-Anmeldungen von diesem Anschluss“ (Bremse der Plattform, HTTP 429) und „nicht freigeschaltet“ (Schalter aus) werden
  getrennt gemeldet.
- **Was geprüft ist:** Datenbank-Seite mit der Test-Kette (Nachbau von Supabase in PGlite, `test-rollen.mjs` im privaten Repo),
  Zugriffsschicht und Fehlerwege mit `test-oberflaeche-db.html` und einer Prüfkopie mit Supabase-Attrappe. Die **Gast-Demo
  (`?demo=gast`) umgeht `leitstand-db.js`**: sie zeigt nur die Gast-Oberfläche, nicht Anmeldung, Rollenabfrage oder Fehlerwege.
  Nur an der echten Plattform prüfbar bleiben: Token-Laufzeit, die Dashboard-Schalter, echte Antwortzeiten, ob der SQL-Editor-Nutzer
  die Proben des Skripts besteht (das Skript meldet es selbst), ob der Anmeldedienst den Anbieter schon beim Anlegen eines neuen Kontos
  in `raw_app_meta_data` setzt (Abfrage in der Anleitung), und das Verhalten von Realtime bei Löschungen — **bekannte Grenze:** bei
  Löschungen sieht jeder Abonnent, auch ein anonymes Konto ohne Gast-Passwort, Sammlung und Kennung des gelöschten Dokuments (nie
  Inhalte); Blicktest in der Anleitung (Gast-Eintrag löschen, im Gast-Fenster innerhalb einer Minute die Karte „Gast-Zugang beendet“ sehen).
- **Lokale Demo der Gast-Sicht:** `index.html?demo=gast` (nur auf localhost, 127.0.0.1, [::1] oder als file:) — `gast-demo.js`,
  erfundene Daten (auch Fälle, die der Server sperrt: Chat-Aufgabe, Aufgabe mit Lauf-Status, Aufgabe von Claude, Rückfrage,
  Dokument ohne Aufgaben-Merkmale); die Server-Funktion für den Statuswechsel ist nachgebildet, alles andere Schreiben wird
  abgelehnt. Unten rechts steht, was passiert ist.
