/* Demo-Daten des Leitstands — ausschließlich ERFUNDEN, neutral, ohne echte Namen, Zitate, Orte oder Adressen (nur example.org).
   Lädt nur über aussagen-demo.js (lokal, ?demo=1 bzw. ?demo=gast) und läuft vor gast-demo.js und vor der Seite.
   Füllt den Demo-Speicher: Eintrag stand/projekt (Bauart 3, Vertrag V1; alle Zeitpunkte relativ zu jetzt, damit „Stand heute“ stimmt),
   links, intern, archiv, hinweise, todos, notes, praesenz, zeiten, boards; rechnet die Vermerke von aussagen, clips und tonclip nach
   Vertrag V4 um (Kennzeichen im lesbaren Eintrag, Text im Begleit-Eintrag in intern). Kennungen in archiv und intern nach Vertrag V5.
   Die Zahlen im Eintrag stand/projekt sind erfunden und hängen nicht an den wenigen Demo-Einträgen der Sammlungen.

   FÄLLE des Eintrags — Adresse &fall=<name> (mehrere mit Komma), zur Laufzeit window.LEITSTAND_DEMO_FALL("<name>[,<name>]"):
     normal (Vorgabe: Rückstand nur bei den Aussagen, 717 am Schnittplatz gegen 728 im Leitstand)
     keine-verbindung   die Mini-Datenbank ruft die Fehler-Rückrufe aller Abos, get() und Schreiben scheitern
     ohne-eintrag       stand/projekt fehlt
     schema2            Bauart 2 statt 3
     erzeugt-fehlt      erzeugt_am fehlt            · erzeugt-unlesbar  erzeugt_am ist kein Zeitpunkt
     erzeugt-zukunft    erzeugt_am drei Stunden nach jetzt
     alt-3-tage         erzeugt_am (und jedes gemessen_am) drei Tage und zwei Stunden alt
     block-null         ein benutzter Block ist null (transkripte)
     block-uebernommen  ein Block ist aus einem früheren Lauf übernommen (drehtage, zwei Tage alt)
     gegenzaehlung-null eine Gegenzählung ist null (aussagen.gegenzaehlung_datenbank)
     bilder-abgelaufen  fristen.boards.abgelaufen über null
     link-abgelaufen    Download-Link des Premiere-Projekts abgelaufen (fristen.links[], premiere, links/premiere-projekt-aktuell)
     fassung-alt        premiere.aktuell.datei ist jünger als premiere.download_im_leitstand.datei
     bald-ab            Download-Link und Standbilder laufen in weniger als sieben Tagen ab
     ablauf-fehlt       premiere.download_im_leitstand fehlt (null), der Link-Eintrag premiere-projekt-aktuell steht in links
                        (ohne link_ablauf); dazu fristen.boards.ohne_ablauf über null
     abholen-alt        frameio.abgeholt_am älter als sieben Tage
     ohne-frameio       Block frameio ist null
     zwei-faelle        bilder-abgelaufen und fassung-alt zugleich
     rueckstand-leer    alle Gegenzählungen gleich, jeder Tag mit Dateien hat Clips im Leitstand
     dt12-neu           neuer Tag DT12 mit Dateien auf dem Laufwerk und ohne Clips im Leitstand (samt Meldung in neu[])
   Weitere Schalter: &altbestand=0 — auch der Altbestand (window.LEITSTAND_DEMO_ALTBESTAND) wird umgerechnet, also der Stand nach dem
   Umzug der Begründungen in der Datenbank. Für Prüfungen: window.LEITSTAND_DEMO_FAELLE (Namen), window.LEITSTAND_DEMO_FP (fp nach V5).
   Stufe 2 (Teil B): &xml=<zustand> legt den XML-Eintrag links/premiere-xml-aktuell an (normal, abgelaufen, bald-ab, ablauf-fehlt, passt-nicht;
   zur Laufzeit window.LEITSTAND_DEMO_XML); &austausch=1 schaltet den Anzeige-Schalter der Seite ein und legt, ohne &xml, den XML-Eintrag »normal« an. */
(function () {
  "use strict";
  var store = window.LEITSTAND_DEMO_STORE, DB = window.LEITSTAND_DEMO_DB;
  if (!window.LEITSTAND_DEMO || !store || !DB) return;

  /* ---- fp(x) nach Vertrag V5: die ersten 16 Hex-Zeichen von SHA-256 über den UTF-8-Text (eigene Umsetzung, ohne Bibliothek) ---- */
  var SHA_H = [], SHA_K = [];
  (function () {
    var n = 2, k = 0;
    function bruch(x) { return ((x - Math.floor(x)) * 0x100000000) | 0; }
    while (k < 64) {
      var prim = true;
      for (var f = 2; f * f <= n; f++) if (n % f === 0) { prim = false; break; }
      if (prim) { if (k < 8) SHA_H[k] = bruch(Math.pow(n, 1 / 2)); SHA_K[k] = bruch(Math.pow(n, 1 / 3)); k++; }
      n++;
    }
  })();
  function ror(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256hex(text) {
    var b = Array.prototype.slice.call(new TextEncoder().encode(String(text))), i, j, H = SHA_H.slice(), w = new Array(64);
    var bits = b.length * 8;
    b.push(0x80); while (b.length % 64 !== 56) b.push(0);
    b.push(0, 0, 0, 0, (bits >>> 24) & 255, (bits >>> 16) & 255, (bits >>> 8) & 255, bits & 255);
    for (i = 0; i < b.length; i += 64) {
      for (j = 0; j < 16; j++) w[j] = (b[i + 4 * j] << 24) | (b[i + 4 * j + 1] << 16) | (b[i + 4 * j + 2] << 8) | b[i + 4 * j + 3];
      for (j = 16; j < 64; j++) {
        var x = w[j - 15], y = w[j - 2];
        w[j] = (w[j - 16] + (ror(x, 7) ^ ror(x, 18) ^ (x >>> 3)) + w[j - 7] + (ror(y, 17) ^ ror(y, 19) ^ (y >>> 10))) | 0;
      }
      var a = H[0], c1 = H[1], c2 = H[2], d = H[3], e = H[4], f = H[5], g = H[6], hh = H[7];
      for (j = 0; j < 64; j++) {
        var t1 = (hh + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[j] + w[j]) | 0;
        var t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & c1) ^ (a & c2) ^ (c1 & c2))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c2; c2 = c1; c1 = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + c1) | 0; H[2] = (H[2] + c2) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + hh) | 0;
    }
    return H.map(function (v) { return ("00000000" + (v >>> 0).toString(16)).slice(-8); }).join("");
  }
  function fp(x) { return sha256hex(x).slice(0, 16); }
  window.LEITSTAND_DEMO_FP = fp;

  /* ---- Zeit: alles relativ zu jetzt; Tage als Berliner Kalendertage (FB Regel 6) ---- */
  var MIN = 60000, STD = 60 * MIN, TAG = 24 * STD;
  var JETZT = Date.now();
  var FMT_TAG = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });
  var FMT_UHR = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  function teile(fmt, ms) { var p = {}; fmt.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; }); return p; }
  function iso(ms) { return new Date(ms).toISOString(); }
  function tag(ms) { var p = teile(FMT_TAG, ms); return p.year + "-" + p.month + "-" + p.day; }
  function uhr(ms) { var p = teile(FMT_UHR, ms); return p.hour + ":" + p.minute; }
  function ttmm(ms) { var t = tag(ms); return t.slice(8, 10) + "." + t.slice(5, 7) + "."; }
  function vor(ms) { return iso(JETZT - ms); }
  /* Zeitpunkt im Archiv-Schlüssel (V5): ISO-Zeit ohne „-“, „:“ und „.“ */
  function zeitKennung(isoText) { return isoText.replace(/[-:.]/g, ""); }
  function archivKennung(herkunft, alt, archiviertAm) { return herkunft + "--" + fp(alt) + "--" + zeitKennung(archiviertAm); }
  /* „Stand heute“: erzeugt_am höchstens 20 Minuten zurück, aber nie vor Berliner Mitternacht */
  var seitMitternacht = (function () { var p = teile(FMT_UHR, JETZT); return (+p.hour) * 60 + (+p.minute); })();
  var T0 = JETZT - Math.min(20, Math.floor(seitMitternacht / 2)) * MIN;

  /* ---- Projektdatei (Name trägt Tag und Uhrzeit wie am Schnittplatz; alles erfunden) ---- */
  function projektDatei(ms) { return tag(ms).slice(2).replace(/-/g, "") + " " + uhr(ms).replace(":", "") + " Demo-Projekt.prproj"; }
  function projekt(ms, bytes) { return { datei: projektDatei(ms), geaendert: iso(ms + 2 * MIN), bytes: bytes, gespeichert_laut_name: { tag: tag(ms), uhr: uhr(ms) } }; }
  var DOWNLOAD_MS = T0 - 26 * STD, NEUER_MS = JETZT - 3 * STD, AELTER_MS = JETZT - 5 * TAG;   /* DOWNLOAD_MS wie im Normalfall (erzeugt_am − 26 Stunden) */

  /* ---- Drehtage: Kennung, Drehdatum (Tage zurück), Dateien, GB, Clips im Leitstand, Transkripte, Sichtung, Aussagen, davon mit Video ----
     AUSFLUG liegt zwischen DT4 und DT5 (Reihenfolge wie geliefert); EXTERN-DEMO kennen nur die Clip-Daten (Gegenzählung, Sammlung clips). */
  var TAGE = [
    ["DT1", 176, 412, 148.6, 96, 96, 103, 63, 49], ["DT2", 171, 368, 131.2, 88, 88, 95, 57, 45], ["DT3", 146, 290, 102.4, 70, 70, 77, 68, 52],
    ["DT4", 127, 336, 119.9, 81, 81, 90, 59, 44], ["AUSFLUG", 121, 96, 31.7, 21, 21, 24, 12, 8], ["DT5", 98, 402, 141.3, 93, 93, 101, 77, 60],
    ["DT6", 94, 255, 88.0, 61, 61, 66, 52, 41], ["DT7", 77, 380, 133.5, 90, 90, 98, 66, 50], ["DT8", 73, 441, 157.2, 106, 106, 113, 81, 63],
    ["DT9", 55, 318, 112.6, 76, 76, null, 54, 42], ["DT10", 34, 296, 104.8, 69, 69, 75, 62, 48], ["DT11", 13, 231, 79.4, 53, null, 58, 66, 34]
  ];
  /* Aussagen nur in der Datenbank (Rückstand im Normalfall): Datenbank = Summe der Tage plus diese Zahl */
  var AUSSAGEN_NUR_DB = 11;
  var FREMD_TAG = "EXTERN-DEMO", FREMD_CLIPS = 7;
  var BOARDS_JE_TAG = { DT1: 2, DT3: 1, AUSFLUG: 1, DT5: 2 };
  function runde(x) { return Math.round(x * 10) / 10; }
  function quelle(pfad, ms) { return [{ pfad: pfad, geaendert: ms == null ? null : iso(ms) }]; }

  function baueEintrag(t0) {
    var gm = iso(t0 + 2000);
    var tage = TAGE.map(function (z) {
      var dd = tag(JETZT - z[1] * TAG);
      return { kennung: z[0], ordner: "DEMO " + z[0], ordnerdatum: tag(JETZT - (z[1] - (z[0] === "DT3" ? 2 : 0)) * TAG), drehdatum: dd, dateien: z[2], gb: z[3], bytes: Math.round(z[3] * 1e9) };
    });
    var summeDateien = 0, summeGb = 0; tage.forEach(function (t) { summeDateien += t.dateien; summeGb += t.gb; });
    var clipsJeTag = {}, srt = {}, sicht = {}, aus = {}, ausFio = 0, ausSumme = 0, clipSumme = 0, srtSumme = 0;
    TAGE.forEach(function (z) {
      clipsJeTag[z[0]] = z[4]; clipSumme += z[4];
      if (z[5] != null) { srt[z[0]] = { srt: z[5], andere_dateien: 0 }; srtSumme += z[5]; }
      if (z[6] != null) sicht[z[0]] = { zeilen: z[6] };
      aus[z[0]] = { anzahl: z[7], mit_frameio_zeit: z[8] }; ausSumme += z[7]; ausFio += z[8];
    });
    clipsJeTag[FREMD_TAG] = FREMD_CLIPS; clipSumme += FREMD_CLIPS;
    var ausDb = ausSumme + AUSSAGEN_NUR_DB;
    var exporte = {};
    TAGE.slice(0, 11).forEach(function (z, i) {   /* DT11 ohne Sichtungsexport (Lücke), DT9 und DT10 ohne Datei in Frame.io */
      var ms = JETZT - (z[1] - 3) * TAG;
      exporte[z[0]] = { neueste: { datei: "DEMO Sichtung " + z[0] + " v01.mp4", ordner: "Demo-Sichtungsexporte", geaendert: iso(ms), datum: tag(ms), bytes: 1200000000 + i },
        anzahl_dateien: 1, frameio: i < 9 ? { datei: "DEMO Sichtung " + z[0] + " v01.mp4", url: "https://example.org/demo/sichtung/" + z[0] } : null };
    });
    var linkAblauf = JETZT + 25 * TAG, boardsAblauf = JETZT + 21 * TAG;
    var downloadMs = t0 - 26 * STD, download = projekt(downloadMs, 48211000);
    function vorT0(ms) { return iso(t0 - ms); }   /* gemessene Zeitpunkte liegen nie nach erzeugt_am (auch nicht im Fall alt-3-tage) */
    return {
      schema: 3, erzeugt_am: iso(t0), erzeuger: "Demo", rechner: "demo",
      neu: [
        { am: iso(t0 - 2 * STD), art: "Material", text: "DT11 ist im Leitstand: 53 Clips.", ziel: "transkripte", schluessel: "clips:DT11" },
        { am: iso(t0 - 26 * STD), art: "Projekt", text: "Neues Premiere-Projekt zum Herunterladen: " + download.datei + ".", ziel: "zugaenge", schluessel: "projekt:" + download.datei },
        { am: iso(t0 - 2 * TAG), art: "Aussagen", text: "Die Aussagen im Leitstand sind erneuert.", ziel: "transkripte", schluessel: "aussagen:" + tag(t0 - 2 * TAG) },
        { am: iso(t0 - 4 * TAG), art: "Standbilder", text: "Neue Standbilder: DT5.", ziel: "boards", schluessel: "standbilder:DT5:2" },
        { am: iso(t0 - 5 * TAG), art: "Material", text: "Neuer Ordner auf dem Laufwerk vom " + ttmm(JETZT - 5 * TAG), ziel: "material", schluessel: "ordner:" + tag(JETZT - 5 * TAG) },
        { am: iso(t0 - 6 * TAG), art: "Frame.io", text: "Neue Sichtungsexporte in Frame.io.", ziel: "frameio-3-demo", schluessel: "sichtung:DT10" },
        { am: iso(t0 - 10 * TAG), art: "Material", text: "Neuer Drehtag auf dem Laufwerk: DT11.", ziel: "material", schluessel: "laufwerk:DT11" }
      ],
      rueckgaenge: [],
      luecken: [
        { angabe: "Sichtungs-Tabelle DT9", grund: "keine Tabelle für diesen Tag (Demo)" },
        { angabe: "Transkripte DT11", grund: "kein Ordner für diesen Tag (Demo)" },
        { angabe: "sichtungsexporte DT11", grund: "kein Sichtungsexport für diesen Tag (Demo)" },
        { angabe: "Clip- und Sequenzzahl im Premiere-Projekt", grund: "steht nicht im Eintrag (Demo)" }
      ],
      abweichungen: [
        { angabe: "Aussagen: Zahl am Schnittplatz gegen Datenbank (Demo)", werte: [{ quelle: "Katalog am Schnittplatz (Demo)", wert: ausSumme }, { quelle: "Datenbank, Sammlung aussagen", wert: ausDb }] }
      ],
      drehtage: { gemessen_am: gm, quelle: quelle("Laufwerk/Demo", t0 - 30 * MIN), anzahl: tage.length, tage: tage,
        nicht_zugeordnet: [{ ordnerdatum: tag(JETZT - 5 * TAG), grund: "keine erkennbare Kennung im Ordnernamen (Demo)", dateien: 12, bytes: 9400000000, gb: 9.4 }],
        summe: { dateien: summeDateien, gb: runde(summeGb), bytes: Math.round(summeGb * 1e9), ohne_fremdmaterial: true },
        fremdmaterial: { dateien: 40, gb: 58.3, bytes: 58300000000, ordner: [] } },
      clips: { gemessen_am: gm, quelle: quelle("Gedächtnis/Demo-Vorauswahl.csv", t0 - 3 * TAG),
        je_tag: {}, summe: { vorauswahl: clipSumme },
        gegenzaehlung_datenbank: { gemessen_am: gm, sammlung: "clips", gesamt: clipSumme, je_tag: clipsJeTag } },
      sichtung: { gemessen_am: gm, quelle: quelle("Gedächtnis/Demo-Sichtung", t0 - 3 * TAG), je_tag: sicht },
      transkripte: { gemessen_am: gm, quelle: quelle("Gedächtnis/Demo-Transkripte", t0 - 2 * TAG), kamera_je_tag: srt,
        summe: { kamera_srt: srtSumme, externton_srt: 48 }, gegenzaehlung_datenbank: { gemessen_am: gm, clips: clipSumme, tonclip: 48 } },
      aussagen: { gemessen_am: gm, quelle: quelle("Gedächtnis/Demo-Aussagen", t0 - 2 * TAG), anzahl: ausSumme, mit_frameio_zeit: ausFio, je_tag: aus,
        gegenzaehlung_datenbank: { gemessen_am: gm, sammlung: "aussagen", anzahl: ausDb, nur_lokal: 0, nur_in_datenbank: AUSSAGEN_NUR_DB, mit_frameio_zeit: ausFio + 12 } },
      boards: { gemessen_am: gm, quelle: quelle("Ausgaben/Demo-Boards", t0 - 5 * TAG), ordner: "Demo-Boards", je_tag: BOARDS_JE_TAG, gesamt: 6,
        gegenzaehlung_datenbank: { gemessen_am: gm, sammlung: "boards", gesamt: 6, je_tag: BOARDS_JE_TAG } },
      sichtungsexporte: { gemessen_am: gm, quelle: quelle("Ausgaben/Demo-Sichtungsexporte", t0 - 6 * TAG), je_tag: exporte },
      premiere: { gemessen_am: gm, quelle: quelle("Ausgaben/Demo-Projekt", DOWNLOAD_MS),
        aktuell: Object.assign({ ordner: "Demo Aktuelles Projekt", im_gedaechtnis_repo: true }, download),
        projekte: [download, projekt(AELTER_MS, 47002111)],
        download_im_leitstand: { gemessen_am: gm, datei: download.datei, link_ablauf: iso(linkAblauf), eingetragen_am: iso(downloadMs + 30 * MIN) } },
      fristen: { gemessen_am: gm, quelle: quelle("Datenbank", null),
        links: [{ was: "Download des Premiere-Projekts", sammlung: "links", kennung: "premiere-projekt-aktuell", ablauf: iso(linkAblauf), tage_bis_ablauf: Math.floor((linkAblauf - t0) / TAG), abgelaufen: false }],
        boards: { was: "Bildadressen der Standbilder", sammlung: "boards", anzahl_boards: 6, mit_ablauf: 6, ohne_ablauf: 0, fruehester_ablauf: iso(boardsAblauf),
          spaetester_ablauf: iso(boardsAblauf + STD), tage_bis_fruehester_ablauf: Math.floor((boardsAblauf - t0) / TAG), abgelaufen: 0 } },
      datenbank: { gemessen_am: gm, quelle: quelle("Datenbank", null),
        sammlungen: { clips: { anzahl: clipSumme, juengste_aenderung: vorT0(3 * TAG) }, aussagen: { anzahl: ausDb, juengste_aenderung: vorT0(2 * TAG) },
          boards: { anzahl: 6, juengste_aenderung: vorT0(5 * TAG) }, tonclip: { anzahl: 48, juengste_aenderung: vorT0(9 * TAG) } },
        dateibaum: { anzahl: 6, stand: vorT0(TAG) }, materialfuehler: null },
      frameio: { abgeholt_am: vorT0(2 * TAG), gemessen_am: gm, quelle: quelle("Demo-Dienst/Demo-Abholung.json", t0 - 2 * TAG), hinweis: "Demo" }
    };
  }

  /* Link-Eintrag des Premiere-Downloads (gehört zu premiere.download_im_leitstand, deshalb mit dem Fall zusammen gebaut) */
  function premiereLink(e) {
    var d = e && e.premiere && e.premiere.download_im_leitstand;
    var datei = d ? d.datei : projektDatei(DOWNLOAD_MS), am = d ? d.eingetragen_am : iso(DOWNLOAD_MS + 30 * MIN);
    var l = { name: "Premiere-Projekt (Demo)", url: "https://example.org/demo/projekt.prproj", datei: datei, eingetragen_am: am, created: am,
      sha256: sha256hex("demo-projekt:" + datei), premiere_fassung: "26.3" };   /* Stufe 2: Prüfsumme (erfunden) und nötige Fassung wie das Hochlade-Skript der Stufe 2 */
    if (d && d.link_ablauf) l.link_ablauf = d.link_ablauf;
    return l;
  }
  /* Stufe 2 (Teil B): XML-Eintrag links/premiere-xml-aktuell wie das Hochlade-Skript der Stufe 2 ihn schreibt (Felder 5.4 b; alles erfunden). Er steht nur mit
     &xml=<zustand> (oder &austausch=1, dann »normal«) — sonst wie heute ohne XML. Zustände: normal, abgelaufen, bald-ab, ablauf-fehlt, passt-nicht. Den Eintrag
     in fristen.links[] bekommt der Erzeuger schon in Bauart 3, sobald der Link ein Ablaufdatum trägt. Zur Laufzeit: window.LEITSTAND_DEMO_XML("<zustand>" | null). */
  var XML_ZUSTAENDE = ["normal", "abgelaufen", "bald-ab", "ablauf-fehlt", "passt-nicht"], xmlZustand = null;
  function xmlLink(e, ctx) {
    var p = ctx.link, j = JETZT, ablauf = xmlZustand === "abgelaufen" ? j - 2 * TAG : xmlZustand === "bald-ab" ? j + 4 * TAG : xmlZustand === "ablauf-fehlt" ? null : j + 25 * TAG;
    var ausDatei = xmlZustand === "passt-nicht" ? projektDatei(AELTER_MS) : p.datei, am = iso(DOWNLOAD_MS + 25 * MIN);
    var x = { name: ausDatei.replace(/\.prproj$/, ".xml"), url: "https://example.org/demo/projekt.xml", wer: "LES", created: am, hinweis: "", datei: ausDatei.replace(/\.prproj$/, ".xml"),
      groesse: 23456789, sha256: sha256hex("demo-xml:" + ausDatei), speicher: "premiere-projekte/xml/demo.xml", premiere_fassung: null, art: "fcp-xml",
      aus_projekt: { datei: ausDatei, sha256: sha256hex("demo-projekt:" + ausDatei) } };
    if (ablauf != null) {
      x.link_ablauf = iso(ablauf);
      if (e && e.fristen && Array.isArray(e.fristen.links)) e.fristen.links.push({ was: "Link links/premiere-xml-aktuell", sammlung: "links", kennung: "premiere-xml-aktuell", ablauf: iso(ablauf),
        tage_bis_ablauf: Math.floor((ablauf - Date.parse(e.erzeugt_am || iso(j))) / TAG), abgelaufen: ablauf < j });
    }
    return x;
  }
  function lueckeDazu(e, angabe, grund) { e.luecken.push({ angabe: angabe, grund: grund + " (Demo)" }); }
  function setzeLinkAblauf(e, ms, ctx) {
    e.fristen.links[0].ablauf = iso(ms); e.fristen.links[0].tage_bis_ablauf = Math.floor((ms - Date.parse(e.erzeugt_am)) / TAG); e.fristen.links[0].abgelaufen = ms < JETZT;
    e.premiere.download_im_leitstand.link_ablauf = iso(ms); ctx.link.link_ablauf = iso(ms);
  }
  function setzeBoardsAblauf(e, ms, abgelaufen) {
    var b = e.fristen.boards; b.fruehester_ablauf = iso(ms); b.spaetester_ablauf = iso(ms + STD); b.tage_bis_fruehester_ablauf = Math.floor((ms - Date.parse(e.erzeugt_am)) / TAG); b.abgelaufen = abgelaufen;
  }
  /* Jeder Fall ändert den gebauten Eintrag e (und ctx.link); null als Ergebnis heißt: kein Eintrag */
  var FAELLE = {
    "normal": function () {},
    "keine-verbindung": function () {},
    "ohne-eintrag": function () { return null; },
    "schema2": function (e) { e.schema = 2; },
    "erzeugt-fehlt": function (e) { delete e.erzeugt_am; },
    "erzeugt-unlesbar": function (e) { e.erzeugt_am = "unlesbar (Demo)"; },
    "erzeugt-zukunft": function (e) { e.erzeugt_am = iso(JETZT + 3 * STD); },
    "alt-3-tage": function () {},   /* über die Bauzeit, siehe eintragFuer */
    "block-null": function (e) { e.transkripte = null; lueckeDazu(e, "transkripte", "Quelle nicht erreichbar"); },
    "block-uebernommen": function (e) {
      e.drehtage.uebernommen = true; e.drehtage.uebernommen_grund = "Laufwerk nicht eingehängt (Demo)";
      e.drehtage.gemessen_am = vor(2 * TAG + 3 * STD); e.drehtage.uebernommen_von = e.drehtage.gemessen_am;
      lueckeDazu(e, "drehtage", "Quelle nicht erreichbar, Block aus dem früheren Eintrag");
    },
    "gegenzaehlung-null": function (e) { e.aussagen.gegenzaehlung_datenbank = null; lueckeDazu(e, "Gegenzählung Aussagen in der Datenbank", "Datenbank nicht lesbar"); },
    "bilder-abgelaufen": function (e) { setzeBoardsAblauf(e, JETZT - TAG, 6); },
    "link-abgelaufen": function (e, ctx) { setzeLinkAblauf(e, JETZT - 2 * TAG, ctx); },
    "fassung-alt": function (e) { var n = projekt(NEUER_MS, 48960000); e.premiere.aktuell = Object.assign({ ordner: "Demo Aktuelles Projekt", im_gedaechtnis_repo: true }, n); e.premiere.projekte.unshift(n); },
    "bald-ab": function (e, ctx) { setzeLinkAblauf(e, JETZT + 4 * TAG, ctx); setzeBoardsAblauf(e, JETZT + 5 * TAG, 0); },
    "ablauf-fehlt": function (e, ctx) {
      e.premiere.download_im_leitstand = null; e.fristen.links = []; delete ctx.link.link_ablauf;
      e.fristen.boards.ohne_ablauf = 2; e.fristen.boards.mit_ablauf = 4;
      lueckeDazu(e, "Download des Premiere-Projekts", "Link-Eintrag premiere-projekt-aktuell ohne Ablaufdatum");
    },
    "abholen-alt": function (e) { e.frameio.abgeholt_am = vor(9 * TAG); },
    "ohne-frameio": function (e) { e.frameio = null; lueckeDazu(e, "frameio", "keine Zeitmarke des Abholens"); },
    "zwei-faelle": function (e, ctx) { FAELLE["bilder-abgelaufen"](e, ctx); FAELLE["fassung-alt"](e, ctx); },
    "rueckstand-leer": function (e) {
      var g = e.aussagen.gegenzaehlung_datenbank;   /* Schnittplatz zieht nach: so viele wie in der Datenbank, keine nur dort */
      if (g) { e.aussagen.anzahl = g.anzahl; e.aussagen.je_tag.DT11.anzahl += g.nur_in_datenbank; g.nur_in_datenbank = 0; }
      e.abweichungen = [];
    },
    "dt12-neu": function (e) {
      var ms = JETZT - TAG, t = { kennung: "DT12", ordner: "DEMO DT12", ordnerdatum: tag(ms), drehdatum: tag(ms), dateien: 188, gb: 66.9, bytes: 66900000000 };
      e.drehtage.tage.push(t); e.drehtage.anzahl += 1;
      e.drehtage.summe.dateien += t.dateien; e.drehtage.summe.gb = runde(e.drehtage.summe.gb + t.gb); e.drehtage.summe.bytes += t.bytes;
      e.neu.unshift({ am: e.erzeugt_am, art: "Material", text: "Neuer Drehtag auf dem Laufwerk: DT12.", ziel: "material", schluessel: "laufwerk:DT12" });
      lueckeDazu(e, "Sichtungs-Tabelle DT12", "keine Tabelle für diesen Tag");
    }
  };
  var NAMEN = Object.keys(FAELLE);
  window.LEITSTAND_DEMO_FAELLE = NAMEN.slice();
  function eintragFuer(liste) {
    var t0 = liste.indexOf("alt-3-tage") !== -1 ? JETZT - 3 * TAG - 2 * STD : T0;
    var e = baueEintrag(t0), ctx = { link: premiereLink(e) };
    for (var i = 0; i < liste.length; i++) if (FAELLE[liste[i]](e, ctx) === null) e = null;
    return { eintrag: e, link: ctx.link, xml: xmlZustand ? xmlLink(e, ctx) : null };
  }
  var aktuell = [];
  function setzeFall(text) {
    var liste = String(text || "normal").split(",").map(function (s) { return s.trim(); }).filter(Boolean), gut = [];
    liste.forEach(function (n) { if (FAELLE[n]) gut.push(n); else DB.log("unbekannter Fall: " + n); });
    if (!gut.length) gut = ["normal"];
    var r = eintragFuer(gut);
    store.stand = store.stand || {};
    if (r.eintrag) store.stand.projekt = r.eintrag; else delete store.stand.projekt;
    store.links = store.links || {};
    store.links["premiere-projekt-aktuell"] = r.link;
    if (r.xml) store.links["premiere-xml-aktuell"] = r.xml; else delete store.links["premiere-xml-aktuell"];   /* Stufe 2: nur mit &xml bzw. &austausch=1 */
    aktuell = gut;
    var verbunden = gut.indexOf("keine-verbindung") === -1;
    if (DB.verbunden() !== verbunden) DB.verbindung(verbunden); else { DB.melde("stand"); DB.melde("links"); }
    return gut.slice();
  }
  window.LEITSTAND_DEMO_FALL = function (name) { return name === undefined ? aktuell.slice() : setzeFall(name); };
  window.LEITSTAND_DEMO_XML = function (z) {
    if (z === undefined) return xmlZustand;
    if (z !== null && XML_ZUSTAENDE.indexOf(z) === -1) throw new Error("unbekannter XML-Zustand: " + z);
    xmlZustand = z; setzeFall(aktuell.join(",")); return xmlZustand;
  };

  /* ---- links: vier Frame.io-Ordner (gemischt gespeichert; Beschriftung mit Rückfall: name, titel, »Frame.io-Ordner {Nr}«),
     ein alter Frame.io-Link, der nie ein Knopf wird, ein öffentlicher weiterer Link; premiere-projekt-aktuell setzt setzeFall ---- */
  store.links = {
    "frameio-drive-share": { name: "Frame.io (alter Link, Demo)", url: "https://example.org/demo/frameio-alt", created: vor(60 * TAG) },
    "frameio-3-demo": { name: "Demo-Sichtung", url: "https://example.org/demo/frameio/3", hinweis: "Erfundene Erklärzeile zum dritten Ordner.", created: vor(50 * TAG) },
    "frameio-1-demo": { name: "Demo-Exporte", url: "https://example.org/demo/frameio/1", hinweis: "Erfundene Erklärzeile zum ersten Ordner.", created: vor(49 * TAG) },
    "frameio-4-demo": { url: "https://example.org/demo/frameio/4", hinweis: "Erfundene Erklärzeile zum vierten Ordner (ohne Namen).", created: vor(48 * TAG) },
    "frameio-2-demo": { titel: "Demo-Ordner mit Titel", url: "https://example.org/demo/frameio/2", hinweis: "Erfundene Erklärzeile zum zweiten Ordner (nur Titel).", created: vor(47 * TAG) },
    "demo-oeffentlich": { name: "Beispiel-Link für alle (erfunden)", url: "https://example.org/demo/oeffentlich", hinweis: "Öffentlicher weiterer Link der Demo.", created: vor(30 * TAG) }
  };

  /* ---- hinweise: vier gültige zugleich (der älteste ist der vierte), einer abgelaufen, einer ohne gilt_bis älter als sieben Tage.
     gilt_bis und faellig als Berliner Kalendertag (Annahme der Demo); ziel: Reiter, Link-Kennung, freie Adresse (nie ein Link) ---- */
  store.hinweise = {
    "demo-h1": { kategorie: "hinweis", titel: "Beispiel-Hinweis, gültig (Ziel Heute)", text: "Erfundener Hinweistext.", created: vor(STD), gilt_bis: tag(JETZT + 6 * TAG), ziel: "heute" },
    "demo-h2": { kategorie: "hinweis", titel: "Beispiel-Hinweis, gültig (Ziel Link-Eintrag)", text: "Erfundener Hinweistext.", created: vor(TAG), gilt_bis: tag(JETZT + 3 * TAG), ziel: "frameio-3-demo" },
    "demo-h3": { kategorie: "achtung", titel: "Beispiel-Hinweis, gültig (freie Adresse als Ziel)", text: "Erfundener Hinweistext.", created: vor(2 * TAG), gilt_bis: tag(JETZT + 10 * TAG), ziel: "https://example.org/demo/frei" },
    "demo-h4": { kategorie: "hinweis", titel: "Beispiel-Hinweis, gültig, aber der vierte", text: "Erfundener Hinweistext.", created: vor(3 * TAG), gilt_bis: tag(JETZT + 2 * TAG), ziel: "material" },
    "demo-h5": { kategorie: "hinweis", titel: "Beispiel-Hinweis, gestern abgelaufen", text: "Erfundener Hinweistext.", created: vor(5 * TAG), gilt_bis: tag(JETZT - TAG), ziel: "boards" },
    "demo-h6": { kategorie: "hinweis", titel: "Beispiel-Hinweis ohne gilt_bis, neun Tage alt", text: "Erfundener Hinweistext.", created: vor(9 * TAG), ziel: "transkripte" }
  };

  /* ---- todos: Aufgaben für Menschen (GST, alle, Editoren, LES, JB, ein anderes Kürzel; Fälligkeiten; Vorschlag von Claude),
     Rückfragen, Erledigtes vor 3 und vor 20 Tagen; Claude-Aufträge mit je einem der fünf Merkmale nach V3, eine Nachricht aus dem
     Reiter „Claude“ (quelle chat), ein erledigter Auftrag ohne geaendert_am mit s11beendetAm ---- */
  function aufgabe(text, wer, prio, alterMs, mehr) { return Object.assign({ text: text, typ: "aufgabe", wer: wer, prio: prio, done: false, created: vor(alterMs) }, mehr || {}); }
  var admin = function (vonMs, von) { return { geaendert_von: von || "LES", geaendert_am: vor(vonMs), geaendert_rolle: "admin" }; };
  store.todos = {
    "demo-t01": aufgabe("Beispiel-Aufgabe für alle: überfällig (erfunden)", "alle", 1, 2 * STD, { faellig: tag(JETZT - 2 * TAG) }),
    "demo-t02": aufgabe("Beispiel-Aufgabe für alle: fällig in sechs Tagen (erfunden)", "alle", 2, TAG, { faellig: tag(JETZT + 6 * TAG) }),
    "demo-t03": aufgabe("Beispiel-Aufgabe für alle: seit Wochen offen (erfunden)", "alle", 3, 30 * TAG),
    "demo-t04": aufgabe("Beispiel-Aufgabe für den Demo-Gast GST (erfunden)", "GST", 2, 3 * TAG),
    "demo-t05": aufgabe("Beispiel-Aufgabe für GST: fällig in zwanzig Tagen (erfunden)", "GST", 1, TAG, { faellig: tag(JETZT + 20 * TAG) }),
    "demo-t06": aufgabe("Beispiel-Aufgabe für GST mit Beschreibung (erfunden)", "GST", 3, 5 * TAG, { beschreibung: "Erfundene Beschreibung: woran man erkennt, dass es fertig ist." }),
    "demo-t07": aufgabe("Beispiel-Aufgabe für beide Editoren (erfunden)", "Editoren", 2, 4 * TAG),
    "demo-t08": aufgabe("Beispiel-Aufgabe für die Editoren mit Vorschlag von Claude (erfunden)", "Editoren", 1, 6 * TAG, { vorschlag: { art: "erledigt", text: "Erfundener Beleg in einem Halbsatz", zeit: vor(TAG) } }),
    "demo-t09": aufgabe("Beispiel-Aufgabe für LES (erfunden)", "LES", 2, 2 * TAG),
    "demo-t10": aufgabe("Beispiel-Aufgabe für LES mit Beleg (erfunden)", "LES", 2, 8 * TAG, { beleg: "Erfundener Beleg (Demo)" }),
    "demo-t11": aufgabe("Beispiel-Aufgabe für JB (erfunden)", "JB", 2, 3 * TAG),
    "demo-t12": aufgabe("Beispiel-Aufgabe für ein anderes Kürzel, XY (erfunden)", "XY", 2, 2 * TAG),
    "demo-t13": aufgabe("Beispiel-Rückfrage an alle (erfunden)", "alle", 2, TAG, { typ: "frage" }),
    "demo-t14": aufgabe("Beispiel-Rückfrage an LES (erfunden)", "LES", 1, 3 * TAG, { typ: "frage" }),
    "demo-t15": aufgabe("Beispiel-Aufgabe, vor drei Tagen erledigt (erfunden)", "alle", 2, 10 * TAG, Object.assign({ done: true, erledigtAm: vor(3 * TAG) }, admin(3 * TAG))),
    "demo-t16": aufgabe("Beispiel-Aufgabe, vor zwanzig Tagen erledigt (erfunden)", "JB", 2, 25 * TAG, Object.assign({ done: true, erledigtAm: vor(20 * TAG) }, admin(20 * TAG, "JB"))),
    "demo-c1": aufgabe("Beispiel-Auftrag an Claude, noch nicht angefordert (Merkmal typ)", "Claude", 2, TAG, { typ: "claude", ziel: "egal" }),
    "demo-c2": { text: "Beispiel-Auftrag ohne Art (Merkmal wer)", wer: "Claude", prio: 3, done: false, created: vor(2 * TAG) },
    "demo-c3": aufgabe("Beispiel-Auftrag mit Lauf-Status (Merkmal s11status)", "LES", 2, 3 * STD, { s11status: "laeuft", s11ziel: "schnitt11", s11fortschritt: "Erfundener Fortschritt …", s11gestartetAm: vor(20 * MIN) }),
    "demo-c4": aufgabe("Beispiel-Auftrag, angefordert (Merkmal angefordert)", "alle", 2, 5 * STD, { angefordert: true, angefordertVon: "LES", angefordertAm: vor(4 * STD) }),
    "demo-c5": aufgabe("Beispiel-Nachricht aus dem Reiter Claude (quelle chat)", "Claude", 2, 2 * STD, { typ: "claude", quelle: "chat", angefordert: true, angefordertVon: "LES", angefordertAm: vor(2 * STD),
      s11status: "fertig", done: true, s11gestartetAm: vor(2 * STD - MIN), s11beendetAm: vor(110 * MIN), s11ergebnis: "Erfundene Antwort (Demo).", chatNachricht: "Erfundene Frage (Demo)." }),
    "demo-c6": aufgabe("Beispiel-Aufgabe aus dem Chat ohne Befehls-Art (Merkmal quelle)", "JB", 2, 6 * STD, { quelle: "chat" }),
    "demo-c7": aufgabe("Beispiel-Auftrag, von Claude erledigt, ohne geaendert_am", "Claude", 2, 2 * TAG, { typ: "claude", angefordert: true, angefordertVon: "JB", angefordertAm: vor(TAG + 2 * STD),
      s11status: "fertig", done: true, s11gestartetAm: vor(TAG + STD), s11beendetAm: vor(TAG + 40 * MIN), beleg: "Erfundener Beleg (Demo)" }),
    "demo-c8": aufgabe("Beispiel-Auftrag, vor zwanzig Tagen erledigt", "Claude", 3, 22 * TAG, { typ: "claude", angefordert: true, s11status: "fertig", done: true,
      s11gestartetAm: vor(20 * TAG + STD), s11beendetAm: vor(20 * TAG) }),
    meta: { version: 3, hinweis: "Dokument der Sammlung todos, das keine Aufgabe ist (kein Feld text)" }
  };

  /* ---- notes: zwölf Einträge, elf davon sichtbar (einer ist 16 Tage nach seiner Übernahme); Gäste mit wer = Gast-{KÜRZEL} und rolle gast ---- */
  function notiz(wer, alterMs, text, mehr) { return Object.assign({ text: text, wer: wer, rolle: /^Gast-/.test(wer) ? "gast" : "admin", created: vor(alterMs) }, mehr || {}); }
  store.notes = {
    "demo-n01": notiz("Gast-GST", 40 * MIN, "Beispiel-Notiz des Demo-Gasts, noch nicht übernommen (erfunden)."),
    "demo-n02": notiz("Gast-GST", 3 * TAG, "Beispiel-Notiz des Demo-Gasts, übernommen (erfunden).", { uebernommen_am: vor(2 * TAG) }),
    "demo-n03": notiz("Gast-XY", 5 * STD, "Beispiel-Notiz mit einer Adresse im Text: https://example.org/demo/notiz — bleibt Text."),
    "demo-n04": notiz("Gast-XY", 2 * TAG, "Beispiel-Notiz, aus der eine Aufgabe wurde (erfunden).", { uebernommen_am: vor(TAG), aufgabe_am: vor(TAG) }),
    "demo-n05": notiz("LES", 6 * STD, "Beispiel-Notiz eines Editors (erfunden)."),
    "demo-n06": notiz("JB", 4 * TAG, "Beispiel-Notiz über mehrere Zeilen:\nZeile zwei\nZeile drei\nZeile vier\nZeile fünf\nZeile sechs (erfunden)", { uebernommen_am: vor(3 * TAG) }),
    "demo-n07": notiz("Gast-GST", 20 * TAG, "Beispiel-Notiz, 16 Tage nach der Übernahme — nicht mehr sichtbar (erfunden).", { uebernommen_am: vor(16 * TAG) }),
    "demo-n08": notiz("Gast-XY", 9 * TAG, "Beispiel-Notiz, seit neun Tagen ohne Übernahme (erfunden)."),
    "demo-n09": notiz("LES", TAG, "Beispiel-Notiz eines Editors, übernommen (erfunden).", { uebernommen_am: vor(12 * STD) }),
    "demo-n10": notiz("Gast-XY", 2 * TAG, "Beispiel-Notiz mit <b>Zeichen</b> & „Anführung“ (erfunden)."),
    "demo-n11": notiz("JB", 3 * TAG, "Beispiel-Notiz des zweiten Editors (erfunden).", { uebernommen_am: vor(2 * TAG) }),
    "demo-n12": notiz("Gast-GST", 10 * TAG, "Ältere Beispiel-Notiz des Demo-Gasts, vor neun Tagen übernommen (erfunden).", { uebernommen_am: vor(9 * TAG) })
  };

  /* ---- intern (nur Admins): vertrauliche Aufgabe, Hinweis, Link; Dokument dateibaum; Begleit-Einträge der Vermerke (unten) ---- */
  var dateien = [
    { p: "README.md", s: 2048 }, { p: "konzept/Demo-Konzept A.md", s: 12840 }, { p: "konzept/Demo-Konzept B.md", s: 8312 },
    { p: "material/Demo-Tabelle.csv", s: 40211 }, { p: "projekte/" + projektDatei(DOWNLOAD_MS), s: 48211000 }, { p: "projekte/" + projektDatei(AELTER_MS), s: 47002111 }
  ];
  store.intern = {
    "6f1e2d3c-4b5a-4c7d-8e9f-0a1b2c3d4e5f": { art: "aufgabe", text: "Vertrauliche Beispiel-Aufgabe (erfunden)", beschreibung: "Nur Editoren sehen sie (Demo).", typ: "aufgabe", wer: "Editoren", prio: 1, done: false, created: vor(2 * TAG), faellig: tag(JETZT + 3 * TAG) },
    dateibaum: { eintraege: dateien, anzahl: dateien.length, stand: vor(TAG), grundadresse: "https://example.org/demo-ablage/" }
  };
  store.intern["hinweis--" + fp("hinweise/demo-alt-h9")] = { art: "hinweis", kategorie: "hinweis", titel: "Vertraulicher Beispiel-Hinweis (erfunden)", text: "Nur für Editoren.", created: vor(TAG), gilt_bis: tag(JETZT + 5 * TAG), ziel: "aufgaben" };
  store.intern["link--" + fp("links/demo-vertraulich")] = { art: "link", name: "Vertraulicher Beispiel-Link (erfunden)", url: "https://example.org/demo/vertraulich", created: vor(40 * TAG) };

  /* ---- Vermerke nach Vertrag V4: Kennzeichen im lesbaren Eintrag, Text im Begleit-Eintrag intern/vermerk--{sammlung}--{fp(kennung)} ---- */
  var mitAltbestand = !/[?&]altbestand=0(&|$)/.test(location.search);
  var ALT = window.LEITSTAND_DEMO_ALTBESTAND || [];
  function hatText(v, feld) { if (typeof v !== "string") return false; var t = v.replace(/\s+/g, ""); return t !== "" && !(feld === "angefordert" && t.toLowerCase() === "nein"); }
  ["aussagen", "clips", "tonclip"].forEach(function (sammlung) {
    Object.keys(store[sammlung] || {}).forEach(function (kennung) {
      if (mitAltbestand && ALT.indexOf(sammlung + "/" + kennung) !== -1) return;
      var v = store[sammlung][kennung], text = {};
      ["sperre", "sensibel", "angefordert"].forEach(function (f) {
        if (typeof v[f] !== "string") return;   /* Kennzeichen (true/false) bleiben, wie sie sind */
        if (hatText(v[f], f)) { text[f] = v[f]; v[f] = true; } else v[f] = false;
      });
      if ("sensibel_grund" in v) { if (hatText(v.sensibel_grund, "sensibel_grund")) text.sensibel_grund = v.sensibel_grund; delete v.sensibel_grund; }
      if (Object.keys(text).length) store.intern["vermerk--" + sammlung + "--" + fp(kennung)] = Object.assign({ art: "vermerk", sammlung: sammlung, kennung: kennung }, text);
    });
  });
  if (!mitAltbestand) window.LEITSTAND_DEMO_ALTBESTAND = [];

  /* ---- archiv (nur Admins): Einträge verschiedener Herkunft nach Anhang II.4 und Vertrag V5 ---- */
  store.archiv = {};
  [
    ["todos", "demo-alt-t1", 10 * TAG, "Abräum-Skript", "erledigt seit 14 Tagen", { text: "Abgelegte Beispiel-Aufgabe (erfunden)", typ: "aufgabe", wer: "alle", prio: 2, done: true, created: vor(40 * TAG), geaendert_am: vor(30 * TAG), geaendert_von: "JB", geaendert_rolle: "admin" }],
    ["todos", "demo-alt-c1", 9 * TAG, "Abräum-Skript", "erstes Abräumen", { text: "Alter Beispiel-Auftrag an Claude (erfunden)", typ: "claude", wer: "Claude", done: true, s11status: "fertig", created: vor(45 * TAG) }],
    ["hinweise", "demo-alt-h1", 12 * TAG, "Abräum-Skript", "abgelaufen", { kategorie: "hinweis", titel: "Abgelaufener Beispiel-Hinweis (erfunden)", text: "Erfundener Hinweistext.", created: vor(20 * TAG), gilt_bis: tag(JETZT - 13 * TAG), ziel: "material" }],
    ["links", "frameio-gesamt", 9 * TAG, "Abräum-Skript", "erstes Abräumen", { name: "Frame.io (zweiter alter Link, Demo)", url: "https://example.org/demo/frameio-alt-2", created: vor(90 * TAG) }],
    ["notes", "demo-alt-n1", 10 * TAG, "Abräum-Skript", "übernommen seit 14 Tagen", { text: "Abgelegte Beispiel-Notiz (erfunden)", wer: "Gast-XY", rolle: "gast", created: vor(25 * TAG), uebernommen_am: vor(24 * TAG) }],
    ["intern", "4a5b6c7d-8e9f-4a0b-9c1d-2e3f4a5b6c7d", 3 * TAG, "LES", "von Hand", { art: "aufgabe", text: "Abgelegte vertrauliche Beispiel-Aufgabe (erfunden)", typ: "aufgabe", wer: "LES", prio: 2, done: false, created: vor(12 * TAG) }]
  ].forEach(function (a) {
    var am = vor(a[2]);
    store.archiv[archivKennung(a[0], a[1], am)] = { herkunft: a[0], herkunft_kennung: a[1], archiviert_am: am, archiviert_von: a[3], grund: a[4], daten: a[5] };
  });

  /* ---- praesenz und zeiten (nur Admins; Felder wie in leitstand-zeit.js) ---- */
  store.praesenz = {
    LES: { wer: "LES", aktiv: true, thema: "Beispiel-Thema (erfunden)", text: "Thema: Beispiel-Thema (erfunden)", seit: vor(35 * MIN), zuletztAm: vor(4 * MIN) },
    JB: { wer: "JB", aktiv: false, thema: "Älteres Beispiel-Thema (erfunden)", zuletztAm: vor(2 * TAG) },
    "Schnitt 11": { wer: "Schnitt 11", aktiv: true, art: "sitzung", seit: vor(2 * STD), zuletztAm: vor(3 * MIN), prozesse: 1, geprueft: vor(2 * MIN) }
  };
  store.zeiten = {
    "demo-z1": { wer: "LES", datum: tag(JETZT - TAG), von: "09:00", bis: "11:30", minuten: 150, kategorie: "schnitt", text: "Beispiel-Zeiteintrag (erfunden)", quelle: "manuell", geschaetzt: false, created: vor(TAG), createdBy: "LES" },
    "demo-z2": { wer: "JB", datum: tag(JETZT - 2 * TAG), von: "14:00", bis: "15:30", minuten: 90, kategorie: "konzept", text: "Beispiel-Zeiteintrag (erfunden)", quelle: "manuell", geschaetzt: false, created: vor(2 * TAG), createdBy: "JB" },
    "demo-z3": { wer: "LES", datum: tag(JETZT - 3 * TAG), von: null, bis: null, minuten: 45, kategorie: "claude", text: "Beispiel-Schätzung (erfunden)", quelle: "manuell", geschaetzt: true, created: vor(3 * TAG), createdBy: "LES" }
  };

  /* ---- boards: wenige Seiten ohne Bildadresse (kein Netz), Tage wie in BOARDS_JE_TAG ---- */
  store.boards = {};
  Object.keys(BOARDS_JE_TAG).forEach(function (t) {
    for (var s = 1; s <= BOARDS_JE_TAG[t]; s++) store.boards["demo-" + t + "-" + s] = { tag: t, seite: s, seiten: BOARDS_JE_TAG[t], clips: ["DEMO_" + t + "_A", "DEMO_" + t + "_B"], breite: 1600, hoehe: 900, created: vor(5 * TAG) };
  });

  /* ---- Server-Funktionen der Demo, Antwort wie supabase-js: { data, error, status }. Editoren sind keine Gäste: gast_notiz → kein_gast.
     Die Gast-Demo ersetzt gast_notiz durch die Nachbildung. Unbekannte Funktionen antworten wie die Datenbank (PGRST202). ---- */
  function antwort(data, error, status) { return Promise.resolve({ data: data, error: error || null, status: status !== undefined ? status : (error ? 400 : 200) }); }
  window.LEITSTAND_DEMO_RPC = function (name) {
    if (!DB.verbunden()) return antwort(null, { message: "TypeError: Failed to fetch", code: "" }, 0);
    if (name === "meine_rolle") return antwort(window.claude.rolle());
    if (name === "gast_notiz") return antwort({ ok: false, grund: "kein_gast" });
    DB.log("rpc " + name + ": unbekannte Funktion");
    return antwort(null, { code: "PGRST202", message: "Could not find the function public." + name + " in the schema cache" }, 404);
  };

  /* ---- Projekt-Austausch (Stufe 2, Teil B — Bauplan P2 Nr. 1): Eingänge, Server-Schalter, Server-Funktionen und Eingangs-Bucket der Demo, nachgebildet
     nach v3 (post/bau-261006-leitstand-rollen, 261007 rollen-gast-v3): Reihenfolge der Prüfungen, Gründe und Grenzen wie dort. Alles erfunden: Konten
     (aus fp gebildet), Kennungen, Zeitpunkte, Größen und Zahlen. Wer: LES und JB (Admins, laden nach F2 mit hoch), der Demo-Gast GST, ein anderer Gast XY.
     Server-Schalter: in der Demo OFFEN, damit die neuen Elemente zu sehen sind (live legt v3 ihn ZU an); &austausch=zu schließt ihn.
     Gesamtgrenze des Speichers: ein erfundener Demo-Wert (live ist sie leer = speicher_voll, bis Main sie setzt, V8).
     &eingang=<grund> erzwingt eine Antwort: ein Grund der Platz-Funktion (gast_eingang_anlegen), einer, den nur die Fertig-Funktion kennt
     (nicht_gefunden, nicht_deins, falscher_zustand, datei_fehlt), netz (die Platz-Funktion antwortet nicht) oder abgebrochen (Übertragung abgebrochen).
     Zur Laufzeit: window.LEITSTAND_DEMO_AUSTAUSCH.offen(true|false), .erzwinge(grund | null), .objekte(), .konto(kürzel), .grenzen.
     window.claude.hochladen, .meineEingaenge und .eingaengeAbo wie in der Zugriffsschicht (leitstand-db.js: gleicher Ablauf, gleiche Gründe, gleiche
     Nachfrage bei der Fertig-Funktion, wenn der Speicher ablehnt oder nicht antwortet); die Gast-Demo zeigt dazu, was der Server geantwortet hat. ---- */
  var MIB = 1048576;
  var EG = { max: 50 * MIB, stunde: 3, tag: 10, alle: 30, frist: 4 * STD, gesamt: 10 * 50 * MIB };   /* wie v3 (F5; Platzfrist: Annahme für den Bau) — gesamt ist ein erfundener Demo-Wert */
  var EG_ARTEN = ["ausgangsstand", "rueckgabe"];
  var EG_ANLEGEN = ["nicht_angemeldet", "abgeschaltet", "kein_gast", "art_ungueltig", "zu_gross", "grenze_stunde", "grenze_tag", "grenze_gesamt", "speicher_voll", "platz_offen", "unbekannt"];
  var EG_FERTIG = ["nicht_angemeldet", "abgeschaltet", "kein_gast", "nicht_gefunden", "nicht_deins", "falscher_zustand", "datei_fehlt"];
  var EG_SIEHT = ["art", "angelegt_am", "bytes_gemeldet", "hochgeladen_am", "status", "status_am", "grund"];
  var egOffen = !/[?&]austausch=zu(&|$)/.test(location.search), egErzwungen = null;
  function uuidAus(t) { var x = fp(t) + fp(t + "/2"); return x.slice(0, 8) + "-" + x.slice(8, 12) + "-4" + x.slice(13, 16) + "-8" + x.slice(17, 20) + "-" + x.slice(20, 32); }
  function sha(t) { return fp(t) + fp(t + "/2") + fp(t + "/3") + fp(t + "/4"); }
  var KONTEN = {}; ["LES", "JB", "GST", "XY"].forEach(function (k) { KONTEN[k] = uuidAus("demo-konto-" + k); });
  function egRolle() { var r = window.claude && window.claude.rolle ? window.claude.rolle() : null; return r && (r.rolle === "admin" || r.rolle === "gast") ? r : null; }
  function egKonto(r) { return KONTEN[r.kuerzel] || (r.rolle === "gast" ? KONTEN.GST : KONTEN.LES); }
  var egObjekte = {};   /* Name im Bucket projekt-eingaenge → { size, typ, am } — nur Angaben, keine Inhalte */
  store.eingaenge = {};
  function eingangDemo(n, k, art, alterMs, status, bytes, mehr) {
    var id = "eg-" + fp("demo-eingang-" + n) + fp("demo-eingang-" + n + "/2"), objekt = KONTEN[k] + "/" + id + ".prproj", da = status !== "reserviert" && status !== "verfallen";
    var rolle = k === "LES" || k === "JB" ? "admin" : "gast";
    var von = { reserviert: rolle, hochgeladen: rolle, uebernommen: "sitzung", nicht_uebernommen: "admin" }[status] || "schnittplatz";
    if (da) egObjekte[objekt] = { size: bytes, typ: "application/octet-stream", am: vor(alterMs - 2 * MIN) };
    var v = { art: art, kuerzel: k, rolle: rolle, konto: KONTEN[k], objekt: objekt, angelegt_am: vor(alterMs), bytes_gemeldet: bytes,
      angebot: { prproj_sha256: sha("demo-projekt-ausgabe"), xml_sha256: sha("demo-xml-ausgabe") }, status: status, status_am: vor(Math.max(alterMs - 30 * MIN, 0)), status_von: von };
    if (da) v.hochgeladen_am = vor(alterMs - 2 * MIN);
    if (da && status !== "hochgeladen") v.datei = { bytes: bytes, sha256: sha("demo-datei-" + n), abgeholt_am: vor(alterMs - 20 * MIN) };
    store.eingaenge[id] = Object.assign(v, mehr || {});
    return id;
  }
  function vergleichDemo(n, warnungen, mehr) {
    return Object.assign({ modus: ["gleiche_fassung"], sequenzen: { neu: 2, geaendert: 1, nicht_in_rueckgabe: 0, geloescht: 0, unveraendert: 31, nicht_lesbar: 0 },
      medienpfade: { raid: 87, laufwerk_abgebildet: 0, laufwerk_anderes: 0, benutzerordner: 0, netz: 0, laufwerksbuchstabe: 0, ohne_pfad: 3 },
      weitere_pfadfelder: { zwischendateien: { benutzerordner: 4, netz: 0, andere: 0 }, verlauf: { benutzerordner: 1, netz: 0, andere: 0 }, projektpfad: { benutzerordner: 1, netz: 0, andere: 0 }, sonstige: { benutzerordner: 0, netz: 0, andere: 0 } },
      benutzerordner_verschieden: 1, benutzerordner_nicht_in_basis: 1, objekte_uebersprungen: 0, warnungen: warnungen, werkzeug_sha256: sha("demo-werkzeug"), am: vor(n * STD) }, mehr || {});
  }
  var EG1 = eingangDemo(1, "GST", "rueckgabe", 50 * MIN, "hochgeladen", Math.round(7.4 * MIB));
  var EG2 = eingangDemo(2, "GST", "ausgangsstand", 3 * TAG, "erfasst", Math.round(4.6 * MIB), { premiere: { fassung: "23.1.0", projektformat: 41 }, art_vermutet: "ausgangsstand",
    vergleich: vergleichDemo(70, [], { modus: ["kontrolllauf"], sequenzen: { neu: 0, geaendert: 0, nicht_in_rueckgabe: 0, geloescht: 0, unveraendert: 33, nicht_lesbar: 0 } }), bericht: { ort: "schnittplatz", datei: "" } });
  store.eingaenge[EG2].bericht.datei = EG2 + ".bericht.md";
  var EG3 = eingangDemo(3, "GST", "rueckgabe", 2 * TAG, "verglichen", Math.round(4.8 * MIB), { premiere: { fassung: "23.1.0", projektformat: 41 }, art_vermutet: "rueckgabe",
    basis: { art: "eingang", eingang: EG2, konto_gleich: true, gemeinsame_kennungen: { sequenzen: [33, 33], clips: [90, 92] }, nur_in_basis: 0, gewaehlt: "kennungen" },
    vergleich: vergleichDemo(46, ["benutzerordner_fremd"]), bericht: { ort: "schnittplatz", datei: "" } });
  store.eingaenge[EG3].bericht.datei = EG3 + ".bericht.md";
  eingangDemo(4, "GST", "rueckgabe", 5 * TAG, "abgewiesen", Math.round(4.7 * MIB), { grund: "pfad_netz" });
  eingangDemo(5, "GST", "rueckgabe", 9 * TAG, "uebernommen", Math.round(4.9 * MIB), { premiere: { fassung: "23.1.0", projektformat: 41 },
    entscheidung: { uebernehmen: true, kuerzel_sequenz: "GST", von: "LES", am: vor(8 * TAG) }, uebernommen_in: { datei: "Demo-Projekt (erfunden).prproj", sha256: sha("demo-uebernommen"), am: vor(8 * TAG), sequenzen_neu: 2 } });
  eingangDemo(6, "GST", "rueckgabe", 6 * TAG, "verfallen", Math.round(5.1 * MIB), { grund: "frist" });
  eingangDemo(7, "XY", "rueckgabe", 20 * STD, "fehler", Math.round(6.2 * MIB), { grund: "werkzeugfehler", versuche: 3 });
  var EG8 = eingangDemo(8, "XY", "rueckgabe", 30 * STD, "verglichen", Math.round(5.3 * MIB), { premiere: { fassung: "23.1.0", projektformat: 41 }, art_vermutet: "rueckgabe",
    basis: { art: "eingang", eingang: EG2, konto_gleich: false, gemeinsame_kennungen: { sequenzen: [21, 33], clips: [55, 92] }, nur_in_basis: 4, gewaehlt: "kennungen" },
    vergleich: vergleichDemo(28, ["abstammung_fremd", "basis_anderes_konto"]), bericht: { ort: "schnittplatz", datei: "" } });
  store.eingaenge[EG8].bericht.datei = EG8 + ".bericht.md";
  eingangDemo(9, "LES", "rueckgabe", 2 * STD, "abgeholt", Math.round(9.6 * MIB));

  function egPlatzFrei(name) {   /* leitstand_intern.eingang_platz_frei */
    var r = egRolle(), jetzt = Date.now();
    if (!egOffen || !r) return false;
    var konto = egKonto(r);
    return Object.keys(store.eingaenge).some(function (id) { var v = store.eingaenge[id]; return v.status === "reserviert" && v.objekt === name && v.konto === konto && Date.parse(v.angelegt_am) > jetzt - EG.frist; });
  }
  function egAnlegen(p_art, p_bytes) {
    var r = egRolle();
    if (!r) return { ok: false, grund: "nicht_angemeldet" };
    if (egErzwungen && EG_ANLEGEN.indexOf(egErzwungen) !== -1) return { ok: false, grund: egErzwungen };
    if (!egOffen) return { ok: false, grund: "abgeschaltet" };
    if (EG_ARTEN.indexOf(p_art) === -1) return { ok: false, grund: "art_ungueltig" };
    if (typeof p_bytes !== "number" || !(p_bytes >= 1)) return { ok: false, grund: "unbekannt" };
    if (p_bytes > EG.max) return { ok: false, grund: "zu_gross" };
    var jetzt = Date.now(), konto = egKonto(r), alle = Object.keys(store.eingaenge).map(function (id) { return store.eingaenge[id]; });
    var an = function (v) { return v.status !== "reserviert" && v.status !== "verfallen"; }, am = function (v) { var t = Date.parse(v.angelegt_am); return isFinite(t) ? t : jetzt; };
    if (r.rolle === "gast") {
      if (alle.filter(function (v) { return v.konto === konto && an(v) && am(v) > jetzt - STD; }).length >= EG.stunde) return { ok: false, grund: "grenze_stunde" };
      if (alle.filter(function (v) { return v.konto === konto && an(v) && am(v) > jetzt - TAG; }).length >= EG.tag) return { ok: false, grund: "grenze_tag" };
      if (alle.filter(function (v) { return v.rolle !== "admin" && an(v) && am(v) > jetzt - TAG; }).length >= EG.alle) return { ok: false, grund: "grenze_gesamt" };
    }
    if (alle.some(function (v) { return v.konto === konto && v.status === "reserviert" && am(v) > jetzt - EG.frist; })) return { ok: false, grund: "platz_offen" };
    var belegt = 0; Object.keys(egObjekte).forEach(function (k) { belegt += egObjekte[k].size; });
    var offenOhne = alle.filter(function (v) { return v.status === "reserviert" && am(v) > jetzt - EG.frist && !egObjekte[v.objekt]; }).length;
    if (belegt + (offenOhne + 1) * EG.max > EG.gesamt) return { ok: false, grund: "speicher_voll" };
    var z = new Uint8Array(16); crypto.getRandomValues(z);
    var id = "eg-" + Array.prototype.map.call(z, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""), objekt = konto + "/" + id + ".prproj", ts = new Date(jetzt).toISOString();
    var link = store.links && store.links["premiere-projekt-aktuell"];
    store.eingaenge[id] = { art: p_art, kuerzel: r.kuerzel || (r.rolle === "gast" ? "GST" : "LES"), rolle: r.rolle, konto: konto, objekt: objekt, angelegt_am: ts, bytes_gemeldet: p_bytes,
      angebot: { prproj_sha256: link && typeof link.sha256 === "string" ? link.sha256 : null, xml_sha256: null }, status: "reserviert", status_am: ts, status_von: r.rolle };
    DB.melde("eingaenge");
    return { ok: true, id: id, objekt: objekt };
  }
  function egFertig(p_id) {
    var r = egRolle();
    if (!r) return { ok: false, grund: "nicht_angemeldet" };
    if (egErzwungen && EG_FERTIG.indexOf(egErzwungen) !== -1 && EG_ANLEGEN.indexOf(egErzwungen) === -1) return { ok: false, grund: egErzwungen };
    if (!egOffen) return { ok: false, grund: "abgeschaltet" };
    var v = Object.prototype.hasOwnProperty.call(store.eingaenge, p_id) ? store.eingaenge[p_id] : null;
    if (!v) return { ok: false, grund: "nicht_gefunden" };
    if (v.konto !== egKonto(r)) return { ok: false, grund: "nicht_deins" };
    if (v.status !== "reserviert") return { ok: false, grund: "falscher_zustand" };
    if (!egObjekte[v.objekt]) return { ok: false, grund: "datei_fehlt" };
    var ts = new Date().toISOString();
    store.eingaenge[p_id] = Object.assign({}, v, { status: "hochgeladen", hochgeladen_am: ts, status_am: ts, status_von: r.rolle });
    DB.melde("eingaenge");
    return { ok: true };
  }
  function egMeine() {
    var r = egRolle();
    if (!r) return { ok: false, grund: "nicht_angemeldet" };
    var konto = egKonto(r), ids = Object.keys(store.eingaenge).filter(function (id) { return store.eingaenge[id].konto === konto; })
      .sort(function (a, b) { var x = String(store.eingaenge[a].angelegt_am), y = String(store.eingaenge[b].angelegt_am); return x < y ? 1 : x > y ? -1 : a < b ? 1 : -1; });
    return { ok: true, offen: egOffen, eingaenge: ids.map(function (id) { var v = store.eingaenge[id], o = {}; EG_SIEHT.forEach(function (f) { o[f] = v[f] === undefined ? null : JSON.parse(JSON.stringify(v[f])); }); return o; }) };
  }
  var rpcBasis = window.LEITSTAND_DEMO_RPC;
  window.LEITSTAND_DEMO_RPC = function (name, args) {
    if (name !== "gast_eingang_anlegen" && name !== "gast_eingang_fertig" && name !== "gast_meine_eingaenge") return rpcBasis(name, args);
    if (!DB.verbunden() || (egErzwungen === "netz" && name === "gast_eingang_anlegen")) { DB.log("rpc " + name + ": keine Verbindung"); return antwort(null, { message: "TypeError: Failed to fetch", code: "" }, 0); }
    var a = args || {}, d = name === "gast_eingang_anlegen" ? egAnlegen(a.p_art, a.p_bytes) : name === "gast_eingang_fertig" ? egFertig(a.p_id) : egMeine();
    DB.log("rpc " + name + ": " + (d.ok ? "ok" : d.grund));
    return antwort(d);
  };
  /* Eingangs-Bucket mit genau der Regel aus v3; Antworten in der Form von supabase-js (StorageApiError mit status und statusCode, StorageUnknownError ohne Antwort) */
  function speicherNein(status, text) { return Promise.resolve({ data: null, error: { __isStorageError: true, name: "StorageApiError", message: text, status: status, statusCode: String(status) } }); }
  function egUpload(name, body, opt) {
    var o = opt || {}, n = body && typeof body.byteLength === "number" ? body.byteLength : body && typeof body.size === "number" ? body.size : 0;
    var typ = typeof Blob !== "undefined" && body instanceof Blob ? (body.type || "application/octet-stream") : (o.contentType || "text/plain;charset=UTF-8");
    DB.log("storage.upload projekt-eingaenge: " + n + " Byte, " + typ + (o.upsert ? ", upsert" : ""));
    if (egErzwungen === "abgebrochen") return Promise.resolve({ data: null, error: { __isStorageError: true, name: "StorageUnknownError", message: "abgebrochen (Demo)", originalError: { name: "AbortError" } } });
    if (!DB.verbunden()) return Promise.resolve({ data: null, error: { __isStorageError: true, name: "StorageUnknownError", message: "Failed to fetch", originalError: { name: "TypeError" } } });
    if (n > EG.max) return speicherNein(413, "The object exceeded the maximum allowed size");
    if (typ !== "application/octet-stream") return speicherNein(415, "mime type not supported");
    if (egObjekte[name]) return speicherNein(o.upsert ? 403 : 409, o.upsert ? "new row violates row-level security policy" : "The resource already exists");
    if (!egPlatzFrei(name)) return speicherNein(403, "new row violates row-level security policy");
    egObjekte[name] = { size: n, typ: typ, am: new Date().toISOString() };
    return Promise.resolve({ data: { path: name, fullPath: "projekt-eingaenge/" + name }, error: null });
  }
  /* window.claude wie die Zugriffsschicht (leitstand-db.js, Projekt-Austausch) — Ablauf und Gründe dort beschrieben */
  function egAntwort(r, gruende) {
    if (r.error) return { ok: false, grund: r.status === 0 || (!r.error.code && !r.status) ? "netz" : r.status === 401 ? "nicht_angemeldet" : r.error.code === "PGRST202" ? "abgeschaltet" : "unbekannt" };
    var d = r.data;
    if (d && typeof d === "object" && d.ok === true) return { ok: true, d: d };
    return { ok: false, grund: d && typeof d.grund === "string" && gruende.indexOf(d.grund) !== -1 ? d.grund : "unbekannt" };
  }
  function egAbbruch(e) { return !!e && /^AbortError$/.test(String(e.name || "")); }
  function egSpeicherArt(e) {
    if (egAbbruch(e) || egAbbruch(e.originalError)) return "abgebrochen";
    var st = +e.status || 0, sc = parseInt(e.statusCode, 10) || 0;
    if (st === 401 || sc === 401) return "nicht_angemeldet";
    if (st === 413 || sc === 413) return "zu_gross";
    if (st === 409 || sc === 409) return "vorhanden";
    if (st === 403 || sc === 403) return "abgelehnt";
    if ((!st && !sc) || st >= 500 || sc >= 500) return "netz";
    return "unbekannt";
  }
  if (window.claude) window.claude.hochladen = function (datei, art, beiFortschritt) {
    var schritt = function (s) { if (typeof beiFortschritt === "function") { try { beiFortschritt({ schritt: s }); } catch (e) {} } };
    var nein = function (g) { return { ok: false, grund: g }; }, r = egRolle(), vorab;
    try {
      vorab = !r ? "nicht_angemeldet" : !datei ? "abgebrochen" : !/\.prproj$/i.test(String(datei.name == null ? "" : datei.name)) ? "falsche_endung"
        : EG_ARTEN.indexOf(art) === -1 ? "art_ungueltig" : !(datei.size >= 1) ? "unbekannt" : datei.size > EG.max ? "zu_gross" : null;
    } catch (e) { vorab = "unbekannt"; }
    if (vorab) return Promise.resolve(nein(vorab));
    var konto = egKonto(r);
    schritt("lesen");
    return (typeof datei.arrayBuffer === "function" ? datei.arrayBuffer() : new Response(datei).arrayBuffer()).then(function (b) { return { b: b }; }, function (e) { return { e: e || {} }; }).then(function (g) {
      if (egAbbruch(g.e)) return nein("abgebrochen");
      var b = g.b, n = b && typeof b.byteLength === "number" ? b.byteLength : 0;
      if (!(n >= 1)) return nein("unbekannt");
      if (n > EG.max) return nein("zu_gross");
      schritt("platz");
      return window.LEITSTAND_DEMO_RPC("gast_eingang_anlegen", { p_art: art, p_bytes: n }).then(function (x) {
        var a = egAntwort(x, EG_ANLEGEN);
        if (!a.ok) return nein(a.grund);
        var id = a.d.id, objekt = a.d.objekt;
        if (typeof id !== "string" || !/^eg-[0-9a-f]{32}$/.test(id) || objekt !== konto + "/" + id + ".prproj") return nein("unbekannt");
        schritt("hochladen");
        return egUpload(objekt, b, { contentType: "application/octet-stream", upsert: false }).then(function (u) {
          var fehler = u.error ? egSpeicherArt(u.error) : null;
          if (fehler === "zu_gross" || fehler === "nicht_angemeldet" || fehler === "unbekannt") return nein(fehler);
          schritt("melden");
          return window.LEITSTAND_DEMO_RPC("gast_eingang_fertig", { p_id: id }).then(function (f) {
            var y = egAntwort(f, EG_FERTIG);
            if (y.ok) return { ok: true };
            if (!fehler) return nein(y.grund);
            if (y.grund === "netz") return nein(fehler === "abgebrochen" ? "abgebrochen" : "netz");
            if (y.grund === "datei_fehlt") return nein(fehler === "abgelehnt" ? "datei_fehlt" : fehler === "vorhanden" ? "unbekannt" : fehler);
            return nein(y.grund);
          });
        });
      });
    }).then(null, function () { return nein("unbekannt"); });
  };
  if (window.claude) window.claude.meineEingaenge = function () {
    if (!egRolle()) return Promise.resolve({ ok: false, grund: "nicht_angemeldet" });
    return window.LEITSTAND_DEMO_RPC("gast_meine_eingaenge").then(function (x) {
      var a = egAntwort(x, ["nicht_angemeldet"]);
      if (!a.ok) return { ok: false, grund: a.grund };
      if (!Array.isArray(a.d.eingaenge)) return { ok: false, grund: "unbekannt" };
      return { ok: true, offen: a.d.offen === true, eingaenge: a.d.eingaenge.filter(function (e) { return !!e && typeof e === "object" && !Array.isArray(e); }).map(function (e) {
        var v = {}; EG_SIEHT.forEach(function (f) { var w = e[f]; v[f] = f === "bytes_gemeldet" ? (typeof w === "number" && isFinite(w) ? w : null) : typeof w === "string" ? w : null; }); return v;
      }) };
    }).then(null, function () { return { ok: false, grund: "unbekannt" }; });
  };
  /* Abo der Sammlung eingaenge nur für Admins (die Gast-Demo setzt null, wie live); die Mini-Datenbank liefert sie über window.claude.use("db") */
  if (window.claude) window.claude.eingaengeAbo = function (cb, fehlerCb) {
    var r = egRolle(); if (!r || r.rolle !== "admin" || typeof cb !== "function") return null;
    var ab = null, weg = false;
    window.claude.use("db").then(function (d) { if (!weg && d) ab = d.collection("eingaenge").onSnapshot(cb, fehlerCb); });
    return function () { weg = true; if (ab) ab(); };
  };
  window.LEITSTAND_DEMO_AUSTAUSCH = {
    offen: function (an) { if (an === undefined) return egOffen; egOffen = !!an; DB.melde("eingaenge"); return egOffen; },
    erzwinge: function (g) { if (g && EG_ANLEGEN.concat(EG_FERTIG, ["netz", "abgebrochen"]).indexOf(g) === -1) throw new Error("unbekannter Grund: " + g); egErzwungen = g || null; },
    objekte: function () { return JSON.parse(JSON.stringify(egObjekte)); },
    konto: function (k) { return KONTEN[k] || null; },
    grenzen: { max_bytes: EG.max, je_konto_stunde: EG.stunde, je_konto_tag: EG.tag, alle_gaeste_tag: EG.alle, platzfrist_ms: EG.frist, gesamtgrenze_bytes: EG.gesamt }
  };
  var egQ = /[?&]eingang=([^&#]*)/.exec(location.search);
  if (egQ) { try { window.LEITSTAND_DEMO_AUSTAUSCH.erzwinge(decodeURIComponent(egQ[1]).trim()); } catch (e) { DB.log("unbekannter Eingangs-Schalter: " + egQ[1]); } }

  /* ---- Fall aus der Adresse (zuletzt, damit alle Sammlungen stehen, bevor die Verbindung ggf. „reißt“) ---- */
  var m = /[?&]fall=([^&#]*)/.exec(location.search), xq = /[?&]xml=([^&#]*)/.exec(location.search);
  if (xq) { var xz = decodeURIComponent(xq[1]).trim(); if (XML_ZUSTAENDE.indexOf(xz) !== -1) xmlZustand = xz; else DB.log("unbekannter XML-Zustand: " + xz); }
  else if (/[?&]austausch=1(&|$)/.test(location.search)) xmlZustand = "normal";   /* Stufe 2: mit dem Anzeige-Schalter auch die XML-Zeile */
  setzeFall(m ? decodeURIComponent(m[1]) : "normal");
})();
