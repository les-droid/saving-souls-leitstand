/* Demo-Einträge der Sammlung `redaktion` (Bauart 1) — ausschließlich FREI ERFUNDEN: neutrale Platzhalter („Figur A“, „Expertin Beta“),
   keine echten Namen, Orte, Zitate oder Inhalte aus JBs Dateien; Adressen nur example.org. Form genau nach der Feldbeschreibung
   der Sammlung (Bauart 1). Deckt ab: alle 14 Arten, alle Block-Formen der Quelltexte (absatz, zitat, liste,
   tabelle, trennlinie, zurueckgehalten), alle Textstück-Merkmale (fett, kursiv, code, durch, link, marke ok/warnung/neutral),
   alle Platzhalter (Überschrift, Tabellenzeile, Block, Listenpunkt), alle Kanten-Arten (durchgezogen/gestrichelt × mit/ohne Pfeil,
   mit/ohne Beschriftung, zwei Kanten zwischen denselben Knoten, Kante in derselben Spalte), Diagramme in vier Richtungen (LR, TD mit
   Kreis und lage null, BT, RL) und drei ausgeblendete Einträge (nicht_mehr_in_quelle: eine Tabellenzeile, ein Steckbrief, ein Listenpunkt).
   Dazu Proben, die als Text erscheinen müssen: „<img src=x onerror=…>“, „<script>“, javascript:-, data:- und relative Verweise.
   Läuft nur lokal (localhost, 127.0.0.1, [::1], file:). Stellt window.LEITSTAND_REDAKTION_DEMO = { eintraege: [{ id, data }] } bereit und
   füllt — nur mit ?demo=1 (Editor), nie mit ?demo=gast — den Demo-Speicher von aussagen-demo.js (Sammlung redaktion), wenn es ihn gibt.
   Kennungen: Form wie die echten ({art}--16 Hex-Zeichen), aber aus einer einfachen Prüfsumme statt SHA-256 — die Seite leitet aus
   Kennungen nichts ab. CL LES 07.10.2026 */
(function () {
  "use strict";
  var h = location.hostname;
  var lokal = location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  if (!lokal) return;

  /* ---- Kennung: zwei 32-Bit-FNV-1a über den Schlüssel → 16 Hex-Zeichen ---- */
  function fnv(t, start) {
    var x = start >>> 0;
    for (var i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
    return ("0000000" + x.toString(16)).slice(-8);
  }
  function kennung(art, schluessel) { var t = "demo-redaktion/" + art + "/" + schluessel; return art + "--" + fnv(t, 2166136261) + fnv(t, 3735928559); }

  var QUELLE = {
    vorlage: { datei: "konzept/DEMO Arbeitsmappe (erfunden).html", md5: "00000000000000000000000000d3a0a1" },
    experten: { datei: "konzept/DEMO Experten (erfunden).md", md5: "00000000000000000000000000d3a0b2" },
    figuren: { datei: "konzept/DEMO Figuren (erfunden).md", md5: "00000000000000000000000000d3a0c3" },
    dramaturgie: { datei: "konzept/DEMO Dramaturgie (erfunden).md", md5: "00000000000000000000000000d3a0d4" }
  };
  var STAND = { vorlage: "Stand 01.10.2026", experten: "Angelegt 260930", figuren: "Stand 28.09.2026", dramaturgie: null };
  var UEBERTRAGEN = "2026-10-07T05:00:00.000Z";   // erfundener Zeitpunkt eines scharfen Laufs
  var BLOCK = { absatz: 1, hinweis: 1, tabelle: 1, liste: 1, diagramm: 1, steckbrief: 1 };
  var E = [], folge = {}, zeile = {};

  // Eintrag anlegen: reihenfolge lückenlos je eltern und Gruppe (die sechs Block-Arten unter einem Abschnitt sind eine Gruppe)
  function neu(art, ansicht, eltern, q, felder, zeilen) {
    var gruppe = BLOCK[art] ? "block" : art, k = (eltern || "-") + "|" + gruppe;
    folge[k] = (folge[k] || 0) + 1;
    var z = (zeile[q] || 0) + 1, bis = z + (zeilen || 1) - 1; zeile[q] = bis + 1;
    var data = { schema: 1, art: art, ansicht: ansicht, eltern: eltern, reihenfolge: folge[k],
      quelle: { datei: QUELLE[q].datei, zeile: z, bis: bis, md5: QUELLE[q].md5 }, stand: STAND[q], uebertragen_am: UEBERTRAGEN };
    for (var f in felder) data[f] = felder[f];
    var id = kennung(art, k + "/" + folge[k]);
    E.push({ id: id, data: data });
    return id;
  }
  function weg(id) { E.forEach(function (e) { if (e.id === id) e.data.nicht_mehr_in_quelle = "2026-10-06T21:00:00.000Z"; }); }
  function t(text, merkmale) { var s = { text: text }; for (var k in merkmale) s[k] = merkmale[k]; return s; }
  function ph(z, b) { return { zurueckgehalten: true, zeile: z, bis: b }; }

  var XSS = "<img src=x onerror=\"window.__rdXss=(window.__rdXss||0)+1\">";
  var JS = "javascript:window.__rdXss=(window.__rdXss||0)+1";

  /* ---- Mappe ---- */
  var mappe = neu("mappe", null, null, "vorlage", { dokumenttitel: "Demo-Arbeitsmappe (erfunden)", kopfzeile: "Demo · erfunden",
    titel: "Demo-Arbeitsmappe Redaktion", text: [t("Erfundene Beispieleinträge für die Vorschau, "), t("keine echten Inhalte", { fett: true }), t(".")] }, 4);

  /* ---- Ansicht experten ---- */
  var ex = neu("ansicht", "experten", mappe, "vorlage", { titel: "Demo-Reiter Eins" });
  var exA1 = neu("abschnitt", "experten", ex, "vorlage", { ueberschrift: null });
  neu("absatz", "experten", exA1, "vorlage", { form: "absatz", text: [t("Einleitung der Demo-Ansicht mit "), t("fettem", { fett: true }),
    t(" und "), t("kursivem", { kursiv: true }), t(" Text, "), t("Beispiel-Datei.md", { code: true }), t(" und einer Marke "), t("neutral", { marke: "neutral" }), t(".")] }, 2);
  var exA2 = neu("abschnitt", "experten", ex, "vorlage", { ueberschrift: "Gesprächsliste (Demo)" });
  neu("absatz", "experten", exA2, "vorlage", { form: "unterzeile", text: [t("Kleine graue Zeile unter der Überschrift (Demo).")] });
  var exT = neu("tabelle", "experten", exA2, "vorlage", { spalten: ["Person", "Thema", "Lage", "Datei " + XSS] }, 2);
  neu("zeile", "experten", exT, "vorlage", { zellen: [[t("Expertin Beta", { fett: true })], [t("Beispielthema eins")], [t("vereinbart", { marke: "ok" })], [t("DEMO_beta.md", { code: true })]] });
  neu("zeile", "experten", exT, "vorlage", { zellen: [[t("Experte Gamma", { fett: true })], [t("Beispielthema zwei")], [t("offen", { marke: "warnung" })], [t("DEMO_gamma.md", { code: true })]] });
  neu("zeile", "experten", exT, "vorlage", { zellen: [[t("Expertin Delta")], [t("Beispielthema drei, Probe " + XSS)], [t("angefragt", { marke: "neutral" })], [t("—")]] });
  weg(neu("zeile", "experten", exT, "vorlage", { zellen: [[t("Experte Omega")], [t("aus der Quelle entfernt")], [t("alt", { marke: "warnung" })], [t("—")]] }));
  neu("hinweis", "experten", exA2, "vorlage", { text: [t("Hinweis-Kasten (Demo): "), t("erledigte Frage", { durch: true }), t(", ein Verweis auf die "),
    t("Beispielseite", { link: "https://example.org/demo" }), t(" und ein "), t("alter Verweis", { link: "http://example.org/alt", kursiv: true }), t(".")] }, 2);
  var exA3 = neu("abschnitt", "experten", ex, "vorlage", { ueberschrift: "Nächste Schritte (Demo)" });
  var exL1 = neu("liste", "experten", exA3, "vorlage", { nummeriert: true });
  neu("punkt", "experten", exL1, "vorlage", { nummer: 1, text: [t("Erster Schritt", { fett: true }), t(" mit erfundenem Text.")] });
  neu("punkt", "experten", exL1, "vorlage", { nummer: 2, text: [t("Zweiter Schritt mit "), t("Code", { code: true }), t(" und "), t("fett-kursiv", { fett: true, kursiv: true }), t(".")] });
  neu("punkt", "experten", exL1, "vorlage", { nummer: 3, text: [t("Dritter Schritt mit Probe-Verweis "), t("Klick mich", { link: JS }), t(".")] });
  var exL2 = neu("liste", "experten", exA3, "vorlage", { nummeriert: false });
  neu("punkt", "experten", exL2, "vorlage", { nummer: null, text: [t("Ungeordneter Punkt A")] });
  neu("punkt", "experten", exL2, "vorlage", { nummer: null, text: [t("Postfach "), t("demo@example.org", { link: "mailto:demo@example.org" })] });
  // Quelltexte der Ansicht (Markdown-Quelle „experten“)
  neu("quelltext", "experten", ex, "experten", { ebene: 0, ueberschrift: null, teile_zurueckgehalten: 0,
    bloecke: [{ form: "absatz", text: [t("Text vor der ersten Überschrift der Demo-Quelle.")] }] });
  neu("quelltext", "experten", ex, "experten", { ebene: 1, ueberschrift: [t("Demo-Quelle Gespräche")], teile_zurueckgehalten: 1, bloecke: [
    { form: "absatz", text: [t("Absatz mit "), t("fett", { fett: true }), t(", "), t("kursiv", { kursiv: true }), t(", "), t("code", { code: true }), t(" und "), t("durch", { durch: true }), t(".")] },
    { form: "trennlinie" },
    { form: "tabelle", spalten: [[t("Name")], [t("Notiz", { kursiv: true })], [t("Verweis")]], zeilen: [
      [[t("Expertin Beta")], [t("Notiz eins")], [t("Beispielseite", { link: "https://example.org/beta" })]],
      ph(14, 14),
      [[t("Experte Gamma")], [t("Notiz zwei")], [t("Probe-Verweis", { link: JS })]]
    ] }
  ] }, 9);
  neu("quelltext", "experten", ex, "experten", { ebene: 2, ueberschrift: [t("Unterabschnitt "), t("(Demo)", { kursiv: true })], teile_zurueckgehalten: 2, bloecke: [
    { form: "zitat", text: [t("Erfundener Zitat-Block der Demo — kein echtes Zitat.")] },
    { form: "liste", nummeriert: false, punkte: [
      { nummer: null, teile: [{ form: "absatz", text: [t("Punkt mit zwei Teilen: Absatz …")] }, { form: "zitat", text: [t("… und eingerücktes Beispiel.")] }] },
      { nummer: null, teile: [], zurueckgehalten: true, zeile: 22, bis: 23 },
      { nummer: null, teile: [{ form: "absatz", text: [t("Verweis mit Leerraum", { link: " javascript:void(0)" }), t(", "), t("Daten-Verweis", { link: "data:text/html,<b>x</b>" }),
        t(", "), t("Datei im Repo", { link: "konzept/DEMO.md" }), t(", "), t("getarnt", { link: "java\tscript:void(0)" })] }] }
    ] },
    { form: "zurueckgehalten", zurueckgehalten: true, zeile: 25, bis: 27 }
  ] }, 10);
  neu("quelltext", "experten", ex, "experten", { ebene: 2, ueberschrift: ph(30, 36), teile_zurueckgehalten: 3, bloecke: [] }, 7);

  /* ---- Ansicht figuren ---- */
  var fi = neu("ansicht", "figuren", mappe, "vorlage", { titel: "Demo-Reiter Zwei" });
  var fiA1 = neu("abschnitt", "figuren", fi, "vorlage", { ueberschrift: null });
  neu("absatz", "figuren", fiA1, "vorlage", { form: "absatz", text: [t("Wer mit wem (Demo). "), t("gesammelt", { marke: "neutral" })] });
  var fiA2 = neu("abschnitt", "figuren", fi, "vorlage", { ueberschrift: "Beziehungen (Demo)" });
  var dg = neu("diagramm", "figuren", fiA2, "vorlage", { form: "flowchart", richtung: "LR" }, 20);
  var kA = neu("knoten", "figuren", dg, "vorlage", { kuerzel: "A", zeilen: ["Figur A", "Hauptrolle (Demo)"], lage: { spalte: 0, zeile: 0 } });
  var kE = neu("knoten", "figuren", dg, "vorlage", { kuerzel: "E", zeilen: ["Expertin Beta", "Beratung"], lage: { spalte: 0, zeile: 1 } });
  var kB = neu("knoten", "figuren", dg, "vorlage", { kuerzel: "B", zeilen: ["Figur B", "Begleitung"], lage: { spalte: 1, zeile: 0 } });
  var kC = neu("knoten", "figuren", dg, "vorlage", { kuerzel: "C", zeilen: ["Figur C", "Gegenüber"], lage: { spalte: 1, zeile: 1 } });
  var kD = neu("knoten", "figuren", dg, "vorlage", { kuerzel: "D", zeilen: ["Gruppe Delta", "Hintergrund"], lage: { spalte: 2, zeile: 0 } });
  var kF = neu("knoten", "figuren", dg, "vorlage", { kuerzel: "F", zeilen: ["Figur F " + XSS], lage: { spalte: 2, zeile: 1 } });
  neu("kante", "figuren", dg, "vorlage", { von: kA, nach: kB, linie: "durchgezogen", pfeil: true, beschriftung: "begleitet" });
  neu("kante", "figuren", dg, "vorlage", { von: kA, nach: kB, linie: "gestrichelt", pfeil: false, beschriftung: "zweite Linie" });
  neu("kante", "figuren", dg, "vorlage", { von: kA, nach: kC, linie: "gestrichelt", pfeil: true, beschriftung: "trifft" });
  neu("kante", "figuren", dg, "vorlage", { von: kB, nach: kD, linie: "durchgezogen", pfeil: false, beschriftung: null });
  neu("kante", "figuren", dg, "vorlage", { von: kC, nach: kD, linie: "gestrichelt", pfeil: false, beschriftung: "kennt" });
  neu("kante", "figuren", dg, "vorlage", { von: kE, nach: kA, linie: "durchgezogen", pfeil: true, beschriftung: null });
  neu("kante", "figuren", dg, "vorlage", { von: kC, nach: kF, linie: "gestrichelt", pfeil: true, beschriftung: "Probe <script>window.__rdXss=1</script>" });
  var fiA3 = neu("abschnitt", "figuren", fi, "vorlage", { ueberschrift: "Steckbriefe (Demo)" });
  neu("steckbrief", "figuren", fiA3, "vorlage", { marke: "Hauptfigur", name: "Figur A", text: [t("Erfundener Steckbrief, "), t("kam im Sommer dazu", { kursiv: true }), t(".")] }, 3);
  neu("steckbrief", "figuren", fiA3, "vorlage", { marke: "Nebenfigur", name: "Figur B", text: [t("Begleitet Figur A (Demo). "), t("bestätigt", { marke: "ok" })] }, 3);
  neu("steckbrief", "figuren", fiA3, "vorlage", { marke: null, name: "Gruppe Delta " + XSS, text: [t("Steckbrief ohne Marke; "), t("unklar", { marke: "warnung" })] }, 3);
  weg(neu("steckbrief", "figuren", fiA3, "vorlage", { marke: "Beispielmarke", name: "Figur Z", text: [t("Aus der Quelle entfernt (Demo).")] }, 3));
  neu("hinweis", "figuren", fiA3, "vorlage", { text: [t("Hinweis nach den Steckbriefen (Demo).")] });
  var fiA4 = neu("abschnitt", "figuren", fi, "vorlage", { ueberschrift: "Kreis (Demo, Lage selbst geordnet)" });
  var dg2 = neu("diagramm", "figuren", fiA4, "vorlage", { form: "flowchart", richtung: "TD" }, 6);
  var kP = neu("knoten", "figuren", dg2, "vorlage", { kuerzel: "P", zeilen: ["Figur P", "erste Rolle"], lage: null });
  var kQ = neu("knoten", "figuren", dg2, "vorlage", { kuerzel: "Q", zeilen: ["Figur Q"], lage: null });
  var kR = neu("knoten", "figuren", dg2, "vorlage", { kuerzel: "R", zeilen: ["Figur R mit einer sehr langen Beschriftung, die im Kasten umbrechen muss"], lage: null });
  neu("kante", "figuren", dg2, "vorlage", { von: kP, nach: kQ, linie: "durchgezogen", pfeil: true, beschriftung: "eins" });
  neu("kante", "figuren", dg2, "vorlage", { von: kQ, nach: kR, linie: "durchgezogen", pfeil: true, beschriftung: "zwei" });
  neu("kante", "figuren", dg2, "vorlage", { von: kR, nach: kP, linie: "gestrichelt", pfeil: true, beschriftung: "zurück" });
  neu("quelltext", "figuren", fi, "figuren", { ebene: 1, ueberschrift: [t("Demo-Quelle Figuren")], teile_zurueckgehalten: 0, bloecke: [
    { form: "absatz", text: [t("Erfundener Absatz der Figuren-Quelle.")] },
    { form: "liste", nummeriert: true, punkte: [
      { nummer: 1, teile: [{ form: "absatz", text: [t("Nummerierter Punkt eins")] }] },
      { nummer: 2, teile: [{ form: "absatz", text: [t("Nummerierter Punkt zwei mit "), t("Beispielseite", { link: "https://example.org/zwei" })] }] }
    ] }
  ] }, 8);
  neu("quelltext", "figuren", fi, "figuren", { ebene: 3, ueberschrift: [t("Figur A", { fett: true })], teile_zurueckgehalten: 0, bloecke: [
    { form: "absatz", text: [t("Erfundener Steckbrief-Text in der Quelle.")] }
  ] }, 3);

  /* ---- Ansicht dramaturgie ---- */
  var dr = neu("ansicht", "dramaturgie", mappe, "vorlage", { titel: "Demo-Reiter Drei" });
  var drA1 = neu("abschnitt", "dramaturgie", dr, "vorlage", { ueberschrift: null });
  neu("absatz", "dramaturgie", drA1, "vorlage", { form: "absatz", text: [t("Gliederung der Demo in Teile.")] });
  var drT = neu("tabelle", "dramaturgie", drA1, "vorlage", { spalten: ["Teil", "Inhalt", "Länge"] }, 2);
  neu("zeile", "dramaturgie", drT, "vorlage", { zellen: [[t("Teil 1", { fett: true })], [t("Beispielinhalt Anfang")], [t("10 min", { code: true })]] });
  neu("zeile", "dramaturgie", drT, "vorlage", { zellen: [[t("Teil 2", { fett: true })], [t("Beispielinhalt Mitte")], [t("20 min", { code: true })]] });
  neu("zeile", "dramaturgie", drT, "vorlage", { zellen: [[t("Teil 3", { fett: true })], [t("Beispielinhalt Ende")], [t("offen", { marke: "warnung" })]] });
  var drA2 = neu("abschnitt", "dramaturgie", dr, "vorlage", { ueberschrift: "Bögen (Demo)" });
  var drL = neu("liste", "dramaturgie", drA2, "vorlage", { nummeriert: false });
  neu("punkt", "dramaturgie", drL, "vorlage", { nummer: null, text: [t("Bogen eins:", { fett: true }), t(" erfundene Entwicklung.")] });
  weg(neu("punkt", "dramaturgie", drL, "vorlage", { nummer: null, text: [t("Entfernter Bogen (Demo)")] }));
  neu("punkt", "dramaturgie", drL, "vorlage", { nummer: null, text: [t("Bogen drei:", { fett: true }), t(" "), t("verworfen", { durch: true })] });
  var drA3 = neu("abschnitt", "dramaturgie", dr, "vorlage", { ueberschrift: "Richtungen (Demo)" });
  var dg3 = neu("diagramm", "dramaturgie", drA3, "vorlage", { form: "flowchart", richtung: "BT" }, 4);
  var k1 = neu("knoten", "dramaturgie", dg3, "vorlage", { kuerzel: "T1", zeilen: ["Teil 1", "Anfang"], lage: { spalte: 0, zeile: 0 } });
  var k2 = neu("knoten", "dramaturgie", dg3, "vorlage", { kuerzel: "T2", zeilen: ["Teil 2"], lage: { spalte: 1, zeile: 0 } });
  var k3 = neu("knoten", "dramaturgie", dg3, "vorlage", { kuerzel: "T3", zeilen: ["Teil 3"], lage: { spalte: 1, zeile: 1 } });
  neu("kante", "dramaturgie", dg3, "vorlage", { von: k1, nach: k2, linie: "durchgezogen", pfeil: true, beschriftung: "danach" });
  neu("kante", "dramaturgie", dg3, "vorlage", { von: k1, nach: k3, linie: "gestrichelt", pfeil: false, beschriftung: null });
  var dg4 = neu("diagramm", "dramaturgie", drA3, "vorlage", { form: "flowchart", richtung: "RL" }, 3);
  var k4 = neu("knoten", "dramaturgie", dg4, "vorlage", { kuerzel: "X", zeilen: ["Ende"], lage: { spalte: 0, zeile: 0 } });
  var k5 = neu("knoten", "dramaturgie", dg4, "vorlage", { kuerzel: "Y", zeilen: ["Anfang"], lage: { spalte: 1, zeile: 0 } });
  neu("kante", "dramaturgie", dg4, "vorlage", { von: k4, nach: k5, linie: "durchgezogen", pfeil: true, beschriftung: "rückwärts" });
  neu("quelltext", "dramaturgie", dr, "dramaturgie", { ebene: 1, ueberschrift: [t("Demo-Quelle Bögen")], teile_zurueckgehalten: 0, bloecke: [
    { form: "absatz", text: [t("Erfundene Einleitung mit "), t("fett-kursiv", { fett: true, kursiv: true }), t(" und "), t("durchgestrichen", { durch: true }), t(".")] },
    { form: "liste", nummeriert: true, punkte: [
      { nummer: 3, teile: [{ form: "absatz", text: [t("Liste beginnt bei drei")] }] },
      { nummer: 4, teile: [{ form: "absatz", text: [t("und zählt weiter")] }] }
    ] }
  ] }, 6);
  neu("quelltext", "dramaturgie", dr, "dramaturgie", { ebene: 2, ueberschrift: [t("Tabelle der Bögen")], teile_zurueckgehalten: 0, bloecke: [
    { form: "tabelle", spalten: [[t("Bogen")], [t("Stand", { fett: true })]], zeilen: [
      [[t("eins")], [t("steht", { marke: "ok" })]],
      [[t("zwei")], [t("offen", { marke: "neutral" })]]
    ] },
    { form: "trennlinie" }
  ] }, 6);

  window.LEITSTAND_REDAKTION_DEMO = { eintraege: E };

  /* Demo-Speicher der Seite (aussagen-demo.js): nur Editor-Demo ?demo=1 — die Gast-Demo liefert redaktion ohnehin nicht */
  var store = window.LEITSTAND_DEMO_STORE;
  if (store && /[?&]demo=1(&|$)/.test(location.search)) {
    store.redaktion = {};
    E.forEach(function (e) { store.redaktion[e.id] = JSON.parse(JSON.stringify(e.data)); });
  }
})();
