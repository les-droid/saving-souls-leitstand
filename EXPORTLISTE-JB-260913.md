# Sichtungs-Exporte für JB (Segelurlaub) — Vorbereitung

**Stand:** 13.09.2026 · **erstellt von:** Claude (Cloud-Sitzung, Auftrag LES)
**Grundlage:** die acht Premiere-Projekte in `projekte/` (ausgelesen), Leitstand-Datenbank (`docs`),
Materialstand von Schnitt 11 vom 13.09.2026 13:12 Uhr.

**Zweck:** JB will unterwegs sichten — Interviews, situative O-Töne und längere dokumentarische
Strecken. Diese Liste sagt, was dafür da ist, was noch gebaut werden muss und was den Upload blockiert.

> **Wichtig:** Diese Liste ist aus Projekt- und Datenbankinhalten abgeleitet, **nicht aus gesichtetem Bild**.
> Wo unten „interessant“ oder „Highlight“ stünde, steht deshalb nichts — diese Bewertung steckt in
> keiner der ausgewerteten Quellen (siehe Abschnitt C).

---

## A. Schon exportiert — kann ohne Schnittarbeit hoch

Aus der Leitstand-Sammlung `reviews`; die Dateien liegen laut Materialstand unter `05 Export`
(22 Dateien, 12,3 GB, jüngste vom 08.09.). **Vor dem Upload auf Schnitt 11 gegenprüfen, ob alle
noch vorhanden sind** — der Materialstand nennt nur Summen, keine Dateinamen.

| Titel | Länge | Ablage laut Board |
|---|---|---|
| 260730 DT7 Interview Lennard + Yannick (uncut) | 19:13 | `05 Export/To Client` |
| 260730 DT7 Interview Theo + Yannick | 8:33 | `05 Export/To Client` |
| 260904 DT1 CUT rerender_JB.mov | 5:14 | Frame.io Drive → SAVING-SOULS/To Client : SoMe |
| 260904 O-Ton Strecke v04 CL LES | 5:55 | Frame.io Drive → SAVING-SOULS/Exporte |
| 260909 O-Ton Strecke v06 CL LES | 5:57 | bereits in Frame.io: https://f.io/t6ViBr-v |

Die beiden DT7-Interviews sind für JBs Zweck das Naheliegendste: echte Interviews, ungekürzt,
zusammen knapp 28 Minuten, und sie existieren bereits als fertige MP4.

O-Ton v06 liegt schon in Frame.io — falls JB nur den Link braucht, ist das ohne jeden Aufwand erledigt.

---

## B. Fertige Sequenzen im Projekt — Export nötig, Auswahl steht

Quelle: `projekte/260904 Saving Souls CL LES.prproj` (neueste Fassung im Repo; enthält alle
Sequenzen der älteren Fassungen). Pfadangaben sind die Bin-Pfade im Projekt.

### Interviews
| Sequenz | Bin-Pfad |
|---|---|
| 260413 DT2 Interview Philipp SLX LES | `01 Edit / 00 Selects and Syncs / SLX / einzelne Drehtage` |
| 260413 DT2 Interview Yannick SLX LES | `01 Edit / 00 Selects and Syncs / SLX / einzelne Drehtage` |
| 260413 DT2 Interview BROLL SLX LES | `01 Edit / 00 Selects and Syncs / SLX / einzelne Drehtage` |
| 260821 Interviews | `01 Edit / 00 Selects and Syncs / SLX` |

### Situative O-Töne
| Sequenz | Bin-Pfad |
|---|---|
| 260413 DT2 Interview Situative Otöne SLX LES | `01 Edit / 00 Selects and Syncs / SLX / einzelne Drehtage` |
| 260821 Situative Otöne | `01 Edit / 00 Selects and Syncs / SLX` |
| 260904 O-Ton Strecke v01–v04 CL LES | `01 Edit / 00 Selects and Syncs` |

### Längere dokumentarische Strecken (Selects je Drehtag)
| Sequenz | Drehtag | Bin-Pfad |
|---|---|---|
| 260410 DT1 SLX LES | DT1 09.04. | `… / SLX / einzelne Drehtage` |
| 260410 DT1 SLX LG | DT1 09.04. | `… / SLX / einzelne Drehtage` |
| 260410 1215 DT1 SLX LG | DT1 09.04. | `… / SLX / einzelne Drehtage` |
| 260519 DT3 SLX LES | DT3 19.05. | `… / SLX / einzelne Drehtage` |
| 260730 DT7 SLX LES | DT7 30.07. | `… / SLX / einzelne Drehtage` |
| 260801 DT8 SLX | DT8 01.08. | `01 Edit / 00 Selects and Syncs / SLX` |
| 260821 BROLL People | DT9 21.08. | `01 Edit / 00 Selects and Syncs / SLX` |
| 260821 BROLL ohne Personen | DT9 21.08. | `01 Edit / 00 Selects and Syncs / SLX` |
| 260413 CUT LES | DT2 | `01 Edit / 01 CUT` |

**Nicht im Repo, aber laut Board vorhanden:** `260911 DT10 SLX CL LES` (40:34, je Clip ein Marker mit
Länge und Tonpegel) im Projekt `260911 1521 Saving Souls CL LES.prproj` auf Schnitt 11. Das ist die
längste zusammenhängende Sichtungsstrecke und der aktuellste Drehtag — für JB wahrscheinlich
der interessanteste Posten, aber er liegt nicht in diesem Repo.

**Längen:** aus dem Premiere-Projektformat nicht zuverlässig auslesbar (ObjectIDs sind nur
klassenintern eindeutig, Sequenz und Name sind darüber nicht sicher verknüpfbar). Die Längen
müssen beim Export auf Schnitt 11 mitgeschrieben werden.

---

## C. Wo die Auswahlarbeit fehlt

JB fragt nach dem, „wo evtl. etwas Interessantes passiert ist“. Diese Bewertung liegt in **keiner**
auswertbaren Quelle vor:

* Im Sichtungsprojekt `260904 Saving Souls Sichtung v01 CL LES.prproj` existiert der Ordner
  `04 SICHTUNG (virtuell)` mit genau den passenden Fächern — **alle fünf sind leer**:
  `01 Interviews` [0] · `02 O-Toene situativ` [0] · `03 B-Roll` [0] · `04 Experimentell` [0] · `05 Highlights` [0].
  Die Struktur ist angelegt, die Einsortierung ist nie passiert.
* Die 1.235 Clips dieses Projekts tragen reine Kameranamen (`A001C005_260409IH_CANON`,
  `DJI_20260409183704_0002_D_P01.MP4`). Kein Clip-Name sagt, was drauf ist.
* Marker: im Sichtungsprojekt **null**, im Hauptprojekt 152 Marker-Objekte, davon **keiner**
  mit Namen oder Kommentar.

Sortiert ist damit nur DT2 (Interviews Philipp/Yannick, situative O-Töne) und DT9 (Interviews,
situative O-Töne, B-Roll) — **2 von 10 Drehtagen**. Für DT1, DT3, DT4, Ausflug, DT5, DT6, DT7, DT8
gibt es Selects je Drehtag, aber keine Aufteilung nach Interview / O-Ton / Rest.

Vorhanden ist laut Board eine Transkription (1.080 Dateien, 04.09.) — darüber ließe sich die
Einsortierung nachziehen, ohne alles neu zu sichten. Das ist eigene Arbeit, kein Nebenprodukt eines Exports.

---

## D. Warum Export und Upload hier nicht passiert sind

**Export:** Die Mediendateien liegen auf `/Volumes/Dropout Schnitt 11 RAID/260410 Safe Haven Crew/…`
und `/Volumes/Expansion/…`, also auf Schnitt 11. In dieser Cloud-Sitzung liegen nur die
`.prproj`-Dateien — kein Bild, kein Ton, kein Premiere, kein Media Encoder, kein ffmpeg.
Ein Export ist von hier aus technisch nicht möglich.

**Upload:** Für Frame.io ist in dieser Sitzung kein Zugang eingebunden. Dazu kommt der im Board
dokumentierte Blocker (To-do `frameio-api-v2`, erledigt 08.09.): *„der Blocker ist unverändert
Adobe-Rechte, nicht Technik“* — die Technik (`post/frameio/frameio_sync.py`) ist seit 04.09. fertig,
aber es fehlt weiterhin der Beleg, dass der Adobe-Admin `postproduction01@` Entwicklerrechte
erteilt und Client-ID/Secret an LES übergeben hat. Die bisherigen Uploads (O-Ton v05/v06, Reel v02)
sind in **interaktiven** Sitzungen auf Schnitt 11 entstanden, nicht automatisiert.

**Der Listener hilft hier nicht:** Laut Notiz vom 08.09. läuft der Claude-Aufruf des Listeners mit
`cwd`=Repo **ohne `--add-dir`** — das RAID ist für den Lauf nicht erreichbar (`ls`/`find` auf
`/Volumes` blockiert, obwohl gemountet) — und mit `acceptEdits` **ohne Befehlsrechte**. Der
v06-Bau am 09.09. hat nur als interaktive Sitzung mit LES funktioniert. Eine Board-Aufgabe
„exportieren und hochladen“ würde also voraussichtlich scheitern, wie am 08.09. schon einmal.

Schnitt 11 ist aktuell erreichbar (Listener läuft, PID 832, RAID gemountet, Stand 13.09. 13:12) —
für einen **interaktiven** Lauf sind die Voraussetzungen also da.

---

## E. Vorschlag

1. **Sofort, ohne Schnittarbeit:** JB den bestehenden Frame.io-Link zu O-Ton v06 schicken
   (https://f.io/t6ViBr-v) und die beiden fertigen DT7-Interviews (zusammen 27:46) hochladen.
   Das deckt „Interviews“ und „situative O-Töne“ schon zu einem guten Teil ab.
2. **Ein interaktiver Lauf auf Schnitt 11** für die Sequenzen aus Abschnitt B, plus
   `260911 DT10 SLX CL LES` (40:34) als aktuellsten Drehtag.
3. **Vorher klären:** ob der Adobe-Rechte-Blocker inzwischen weg ist. Wenn nein, läuft der Upload
   wie bisher von Hand über Frame.io Drive.
4. **Offen und nicht nebenbei zu erledigen:** die Einsortierung der acht unsortierten Drehtage
   (Abschnitt C). Ohne sie ist „die interessanten Stellen“ nicht lieferbar, sondern nur
   „alle Selects je Drehtag“.
