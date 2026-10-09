# Leitstand — lokale Vorschau (Demo)

Die Demo zeigt die Seite ohne Datenbank und ohne Anmeldung, nur mit **erfundenen** Beispieldaten. Sie läuft nur auf
`localhost`, `127.0.0.1`, `[::1]` oder als `file:`; auf der veröffentlichten Seite werden die Demo-Dateien nie geladen.

## Starten — ein Befehl

Im Ordner dieser Datei:

```
python3 -m http.server 8000
```

Dann im Browser:

| Sicht | Adresse |
|---|---|
| Editor (Admin, Kürzel LES) | <http://localhost:8000/index.html?demo=1> |
| Gast (Kürzel GST) | <http://localhost:8000/index.html?demo=gast> |

Ein Reiter lässt sich direkt öffnen, z. B. `…?demo=gast#zugaenge`. Als Gast führen `#zeit`, `#claude` und `#redaktion…` auf »Heute«,
auch beim Neuladen.

## Zwischen Editor und Gast umschalten

Nur über die Adresse: `?demo=1` ↔ `?demo=gast`. Die Gast-Demo setzt für die Dauer des Besuchs das Kürzel GST und stellt beim
Verlassen das vorige wieder her. Die Gast-Demo antwortet wie die Datenbank **nach** der Ergänzung `supabase/261006 rollen-gast-v2.sql`:
sie liest nur die zehn freigegebenen Sammlungen, ohne Aufträge an Claude, und schreibt nur Notizen. Was sie abgelehnt hat, steht
unten rechts und in `window.LEITSTAND_DEMO_LOG`.

Wichtig: Die Demo umgeht `leitstand-db.js`. Anmeldefenster, Rollenabfrage und Fehlerwege zeigt sie nicht; die prüft eine Prüfkopie mit
Supabase-Attrappe im privaten Repo.

## Störfälle des Projektstands — `&fall=…`

An die Adresse anhängen, mehrere mit Komma, z. B. `index.html?demo=1&fall=alt-3-tage` oder `…&fall=link-abgelaufen,abholen-alt`.
Zur Laufzeit in der Konsole: `LEITSTAND_DEMO_FALL("alt-3-tage")`.

| Fall | Was er nachbildet |
|---|---|
| `normal` | Vorgabe: Rückstand nur bei den Aussagen |
| `keine-verbindung` | keine Verbindung zur Datenbank (Sammelzeile Fall 1) |
| `ohne-eintrag` | Eintrag `stand/projekt` fehlt (keine Zahl auf der Seite) |
| `schema2` | Eintrag in alter Bauart (gilt als fehlend) |
| `erzeugt-fehlt`, `erzeugt-unlesbar`, `erzeugt-zukunft` | Zeitpunkt des Eintrags fehlt, ist unlesbar bzw. liegt in der Zukunft |
| `alt-3-tage` | Eintrag drei Tage alt (Zahlen grau, Sammelzeile) |
| `block-null` | ein Bereich ohne Angabe (Transkripte) |
| `block-uebernommen` | ein Bereich aus einem früheren Lauf übernommen (Drehtage) |
| `gegenzaehlung-null` | Gegenzählung der Datenbank fehlt (Aussagen) |
| `bilder-abgelaufen` | Bildadressen der Boards abgelaufen |
| `link-abgelaufen` | Download-Link des Premiere-Projekts abgelaufen |
| `fassung-alt` | hinter dem Premiere-Knopf liegt nicht die neueste Fassung |
| `bald-ab` | Download-Link und Bildadressen laufen in weniger als sieben Tagen ab (nur Editoren) |
| `ablauf-fehlt` | Ablaufdatum unbekannt (nur Editoren) |
| `abholen-alt` | Frame.io-Rückmeldungen seit mehr als sieben Tagen nicht abgeholt (nur Editoren) |
| `ohne-frameio` | der Erzeuger liefert keine Zeitmarke fürs Abholen (Zeile und Fall entfallen) |
| `zwei-faelle` | zwei Warnungen zugleich (eine Zeile mit »und 1 weitere«) |
| `rueckstand-leer` | kein Rückstand |
| `dt12-neu` | neuer Drehtag DT12 mit Dateien, noch ohne Clips |

Weitere Schalter: `&altbestand=0` rechnet auch den Altbestand der Vermerke um (Stand nach dem Abräumen). `&gerade=1` schaltet
die Zeile »Gerade aktiv« auf »Heute« ein (live steht sie hinter der Einstellung `EINST.geradeAktiv`, Standard aus; Gäste sehen sie nie).

## Notiz-Antworten der Gast-Demo — `&notiz=…`

Nur mit `?demo=gast`: `&notiz=<grund>` erzwingt eine Antwort des Servers — `nicht_angemeldet`, `kein_gast`, `leer`, `zu_lang`,
`ungueltig`, `limit_stunde`, `limit_tag`, `limit_gesamt`, `fehler`, `netz` (keine Antwort). `&notiz=zuruecksetzen` leert den Zähler
der Grenzen (er liegt im Gerätespeicher). Zur Laufzeit: `LEITSTAND_DEMO_NOTIZ.erzwinge("limit_tag")`.

## Reiter »Redaktion« (nur Editoren)

In der Editor-Demo steht hinter »Claude« der Reiter »Redaktion« mit drei Unteransichten — »Experten & Gespräche«, »Figuren
(Beziehungsdiagramm + Steckbriefe)«, »Dramaturgie« — aus **erfundenen** Einträgen (`demo-redaktion.js`, lädt nur mit `?demo=1`). Adressen:
`#redaktion`, dazu `#redaktion-experten`, `#redaktion-figuren`, `#redaktion-dramaturgie` (wählen die Unteransicht). Drei eigene Reiter statt
einem gibt es über die Einstellung `EINST.redaktionDreiReiter: true` in `index.html` (kein Demo-Schalter). In der Gast-Demo gibt es den Reiter
nicht; jede Redaktions-Adresse führt auf »Heute«.

## Rundgang

Der Rundgang wird je Kürzel einmal angeboten (Gerätespeicher `ss-rundgang`). Die Gast-Demo bietet ihn beim ersten Besuch an; Angebot
noch einmal sehen: in der Konsole `localStorage.removeItem("ss-rundgang")` und neu laden. In der Editor-Demo erscheint das Angebot nie:
Editoren bekommen es nach der Wahl im Dialog »Wer arbeitet gerade?«, und die Demo setzt das Kürzel LES selbst, bevor die Seite fragt —
auch nach `localStorage.removeItem("ss-wer")` kommt der Dialog deshalb nicht. Das Angebot für Editoren zeigt nur die Prüfkopie mit
Supabase-Attrappe im privaten Repo (Anmeldung als LES). Der Knopf »Einführung« im Kopf startet den Rundgang in beiden Sichten jederzeit.

## Projekt-Austausch (Stufe 2) — `&austausch=1`, `&xml=…`

Auf der veröffentlichten Seite steht der Anzeige-Schalter `EINST.projektAustausch` in `index.html` auf **aus**; dann gibt es weder
Hochlade-Bereich noch »eigene Uploads« noch den Block »Eingänge«, und die Seite fragt danach auch nicht. In der Demo schaltet ihn
`&austausch=1` ein (nur lokal, wie `&gerade=1`). Die Demo bildet dazu die Server-Funktionen der Ergänzung v3 und den Eingangs-Bucket nach
(`demo-daten.js`, nur erfundene Konten, Kennungen und Größen).

- Editor: `index.html?demo=1&austausch=1#zugaenge` — in Block A die XML-Zeile, darunter Hochladen (Art wählen, dann der Knopf öffnet die
  Dateiwahl) und »eigene Uploads«; direkt hinter Block A der Block »Eingänge« mit allen Eingängen der Demo, die wartenden zuerst, und
  »nicht übernehmen« (mit Rückfrage) bei »verglichen« und »fehler«.
- Gast: `index.html?demo=gast&austausch=1#zugaenge` — XML-Zeile, Hochladen und nur die eigenen Uploads des Demo-Gasts; kein Block »Eingänge«.

**Alle Beschriftungen, Meldungen und Sätze dieser Teile fehlen noch** (WORTLAUT FEHLT, Liste im Bauprotokoll der Seite im privaten Repo):
Überschriften und Zustandswörter fehlen; zu sehen sind die Angaben aus den Daten (Zeit, Größe, Datei, Fassung, Kürzel). Was ohne Wort
einen Knopf ohne Namen ergäbe, entfällt ganz: das Hochladen erscheint erst mit Knopf-Wort und den zwei Arten, „nicht übernehmen“ erst mit
Knopf-Wort und Rückfrage — in der Demo also noch nicht. Zum Ausprobieren lassen sich Platzhalter nur im Speicher der geöffneten Seite
setzen (Konsole: Werte in `LEITSTAND_DEMO_SEITE.austausch.TEXT` eintragen, dann `LEITSTAND_DEMO_SEITE.austausch.neu()`); so machen es
auch die Prüfungen. Erst mit den Wortlauten von LES wird der Schalter live eingeschaltet.

| Schalter | Wirkung |
|---|---|
| `&austausch=1` | Anzeige-Schalter an; ohne `&xml` legt die Demo dazu den XML-Eintrag »normal« an |
| `&austausch=zu` | Server-Schalter zu (live legt v3 ihn zu an; in der Demo ist er sonst offen): kein Hochlade-Bereich, die eigenen Uploads bleiben — zusammen mit `&austausch=1` |
| `&xml=normal` | XML-Eintrag `links/premiere-xml-aktuell` passend zum Projekt; auch ohne `&austausch=1` (die XML-Zeile hängt nicht am Schalter) |
| `&xml=abgelaufen`, `&xml=bald-ab`, `&xml=ablauf-fehlt`, `&xml=passt-nicht` | XML-Link abgelaufen (grauer Knopf), läuft in wenigen Tagen ab, ohne Ablaufdatum, stammt von einer älteren Projektfassung |
| `&eingang=<grund>` | erzwingt eine Antwort: ein Grund der Platz- oder der Fertig-Funktion, `netz` oder `abgebrochen` |

Zur Laufzeit in der Konsole: `LEITSTAND_DEMO_AUSTAUSCH.offen(false)`, `.erzwinge("platz_offen")`, `.erzwinge(null)`;
`LEITSTAND_DEMO_XML("abgelaufen")` bzw. `LEITSTAND_DEMO_XML(null)`. Die Zugriffsschicht direkt:

```
await claude.hochladen(new File([new Uint8Array(1000)], "Probe.prproj"), "rueckgabe")
await claude.meineEingaenge()
```

Die Gast-Demo zeigt die Antworten von Platz- und Fertig-Funktion unten rechts; Gäste bekommen kein Abo der Eingänge
(`eingaengeAbo` liefert `null`).

## Was die Demo nicht zeigt

- echte Inhalte (alles ist erfunden; Adressen nur `example.org`/`.com`/`.net`),
- Anmeldung, Rollenabfrage, Fehlerwege der Zugriffsschicht (siehe Prüfkopie),
- die Reiter »Boards« und »Transkripte« mit echten Bildern (Demo-Boards haben keine Bildadresse).
