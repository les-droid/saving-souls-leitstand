/* Demo-Einträge des Vision Boards (Sammlungen vision_*, Bauart 1) — ausschließlich FREI ERFUNDEN, aus dem freigegebenen Entwurf
   (261009 vision-board-entwurf CL LES.html): erfundene Drehtage (DT 89–91, Jahr 2029/2030), keine echten Namen, keine echten Stills, kein Ort,
   keine Zufahrt; Tag DT 9x ohne Kennung ab der Fassung »Eingeben«. Bilder sind gezeichnete Platzhalter (Feld `platzhalter`, nur in der Demo), keine Adressen. Grundriss mit erfundenen Maßen,
   ohne Himmelsrichtung. Dazu eine Probe, die als Text erscheinen muss („<img src=x onerror=…>“).
   Läuft nur lokal (localhost, 127.0.0.1, [::1], file:) und nur, wenn vision-board.js eingeschaltet ist (lädt diese Datei selbst bei ?demo=1 bzw.
   ?demo=gast). Stellt window.LEITSTAND_VISION_DEMO = { sammlungen: { vision_tag: { id: data }, … } } bereit und füllt den Demo-Speicher von
   aussagen-demo.js — die Admin-Sammlungen nur mit ?demo=1, die Gast-Sammlung vision_gast (Vorschlag F6) in beiden Demos; ob ein Gast sie lesen
   darf, entscheidet die Gast-Demo (Positivliste wie die Datenbank: heute nein). CL LES 09.10.2026 */
(function () {
  "use strict";
  var h = location.hostname;
  var lokal = location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  if (!lokal) return;

  var T = "2029-12-01T10:00:00.000Z";   // erfundener Zeitpunkt
  function m(data, wer) { data.schema = 1; data.created = T; data.updated = T; data.updated_by = wer || "LES"; return data; }

  var TAG = { a1: "vt-00000000000000a1", a2: "vt-00000000000000a2", a3: "vt-00000000000000a3", a4: "vt-00000000000000a4" };
  var vision_tag = {}, vision_idee = {}, vision_bild = {}, vision_szene = {}, vision_gast = {};
  vision_tag[TAG.a1] = m({ kennung: "DT 90", datum: "2030-01-01", datum_bis: "2030-01-02", zustand: "geplant",
    vorhaben: "Übernachtung in der Werkstatt: Arbeit bis in die Nacht, Gespräch am Feuer, Morgen danach.",
    beschreibung: "Beispiel: Der Tag soll zeigen, wie lang ein Arbeitstag wird. Drei Phasen – Abendarbeit, Nachtgespräch, erster Kaffee. Kein gestelltes Gespräch; Kamera wartet.",
    bezuege: [{ art: "redaktion", ref: "demo-1", titel: "Dramaturgie: Bogen »Erschöpfung« (Beispiel)" }, { art: "szenenkatalog", ref: "demo-2", titel: "Szenenkatalog: Lücke »Nacht« (Beispiel)" },
      { art: "aufgabe", ref: "demo-3", titel: "Aufgabe: Geräteliste klären (Beispiel)" }],
    notiz: "Akkus für die Nacht zählen. Feuer nur, wo es ohnehin brennt – nichts inszenieren.", reihenfolge: 1 });
  vision_tag[TAG.a2] = m({ kennung: "DT 91", datum: "2030-01-12", zustand: "geplant", vorhaben: "Großes Teil wird bewegt – Vorbereitung, Moment, Erleichterung.",
    beschreibung: "Beispiel: Ein Ereignis mit klarer Mitte. Zwei Kameras, eine fest, eine geführt.", bezuege: [{ art: "redaktion", ref: "demo-4", titel: "Dramaturgie: Wendepunkt (Beispiel)" }],
    notiz: "", reihenfolge: 2 });
  vision_tag[TAG.a3] = m({ kennung: "DT 89", datum: "2029-12-21", zustand: "gedreht", vorhaben: "Werkstatt im Regen, Detailarbeit.",
    beschreibung: "Beispiel eines schon gedrehten Tags: Ideen tragen den Zustand »gedreht«.", bezuege: [], notiz: "", reihenfolge: 3 });
  // Fassung »Eingeben« (F13): geplanter Tag ohne Kennung — die Seite nennt ihn »DTxx (geplant)« (nächste freie Nummer nach dem höchsten gedrehten Tag)
  vision_tag[TAG.a4] = m({ kennung: "", datum: "2030-01-20", zustand: "geplant", vorhaben: "Beispiel: Tag ohne Ordner, Name kommt von der Seite.",
    beschreibung: "", bezuege: [], notiz: "", reihenfolge: 4 });

  var B = {}; "b1 b2 b3 b4 b5 b6 b7 b8".split(" ").forEach(function (k, i) { B[k] = "vb-00000000-0000-4000-8000-00000000000" + (i + 1); });
  var GEPRUEFT = { von: "LES", am: "2029-12-01" };
  vision_bild[B.b1] = m({ quelle: "still", board: "demo-board-88-3", seite: 3, clip: "DEMO_C088", tag: "DT 88", metadaten_entfernt: true, standort_geprueft: GEPRUEFT,
    platzhalter: { form: "fenster", farbe: ["#2b3f45", "#c98a4b"] } }, "claude:vps");
  vision_bild[B.b2] = m({ quelle: "previs-ki", zu_tag: TAG.a1, werkzeug: "Beispiel-Werkzeug", prompt: "Beispiel: Feuer als einziges Licht, zwei Gesichter im Halbprofil, Nacht",
    erzeugt_am: "2029-12-01", erzeugt_von: "LES", metadaten_entfernt: true, standort_geprueft: GEPRUEFT, platzhalter: { form: "feuer", farbe: ["#1a1410", "#e0893a"] } });
  vision_bild[B.b3] = m({ quelle: "foto", zu_tag: TAG.a1, von: "LES", metadaten_entfernt: true, standort_geprueft: GEPRUEFT, platzhalter: { form: "linien", farbe: ["#22313a", "#7fa7c9"] } });
  vision_bild[B.b4] = m({ quelle: "skizze", zu_tag: TAG.a1, von: "LES", metadaten_entfernt: true, standort_geprueft: GEPRUEFT, platzhalter: { form: "skizze", farbe: ["#1d2a2e", "#93a8aa"] } });
  vision_bild[B.b5] = m({ quelle: "still", board: "demo-board-87-1", seite: 1, clip: "DEMO_C087", tag: "DT 87", metadaten_entfernt: true, standort_geprueft: GEPRUEFT,
    platzhalter: { form: "hand", farbe: ["#30383a", "#b9c6c2"] } });
  vision_bild[B.b6] = m({ quelle: "previs-ki", zu_tag: TAG.a1, werkzeug: "Beispiel-Werkzeug", prompt: "Beispiel: blaues Vorlicht am Morgen, Tasse mit Dampf, Innenraum",
    erzeugt_am: "2029-12-02", erzeugt_von: "claude:vps", metadaten_entfernt: true, standort_geprueft: GEPRUEFT, platzhalter: { form: "morgen", farbe: ["#0f1a24", "#5f86b8"] } }, "claude:vps");
  vision_bild[B.b7] = m({ quelle: "still", board: "demo-board-89-2", seite: 2, clip: "DEMO_C089", tag: "DT 89", metadaten_entfernt: true, standort_geprueft: GEPRUEFT,
    platzhalter: { form: "regen", farbe: ["#26363a", "#6f8f8a"] } });
  // Bild ohne Idee (Konzept Abschnitt 2: steht unter »ohne Idee« am Ende) — ein Außenbild nach F5, nur für Editoren; gezeichnet, ohne Umgebung
  vision_bild[B.b8] = m({ quelle: "aussen", zu_tag: TAG.a1, von: "LES", metadaten_entfernt: true, standort_geprueft: GEPRUEFT, platzhalter: { form: "linien", farbe: ["#1f2b2f", "#6f8f8a"] } });

  var I = function (n) { return "vi-00000000-0000-4000-8000-0000000000" + (n < 10 ? "0" : "") + n; };
  var S = { s1: "vs-00000000-0000-4000-8000-000000000001", s2: "vs-00000000-0000-4000-8000-000000000002", s3: "vs-00000000-0000-4000-8000-000000000003" };
  function idee(n, d, wer) { vision_idee[I(n)] = m(d, wer); }
  idee(1, { tag: TAG.a1, art: "licht", titel: "Arbeitslicht als einzige Quelle", text: "Nachts nur die Lampe an der Werkbank, Rest des Zelts säuft ab. Kein Aufheller.", herkunft: "LES", zustand: "geplant", bilder: [B.b4], szene: S.s1, prio: 1 });
  idee(2, { tag: TAG.a1, art: "kamera", titel: "Eine Fahrt durch die ganze Werkstatt", text: "Gimbal, ohne Schnitt, vom Eingang bis zur hinteren Wand, während gearbeitet wird.", herkunft: "LES", zustand: "offen", bilder: [B.b3], prio: 2 });
  idee(3, { tag: TAG.a1, art: "licht", titel: "Feuer als Schlüssellicht", text: "Gesichter nur vom Feuer, Kamera auf Augenhöhe, lange Brennweite, Abstand halten.", herkunft: "Claude", zustand: "vorschlag", bilder: [B.b2, B.b1],
    begruendung: "Beispiel: greift das warme Fensterlicht aus Still DT 88, S. 3 auf; Szenenkatalog nennt »Nacht« als Lücke." }, "claude:vps");
  idee(4, { tag: TAG.a1, art: "farbe", titel: "Morgen kühl gegen Nacht warm", text: "Erster Kaffee im blauen Vorlicht – Gegenstück zur warmen Nacht.", herkunft: "Claude", zustand: "vorschlag", bilder: [B.b6],
    begruendung: "Beispiel: Kontrast trägt den Zeitsprung ohne Off-Sprecher." }, "claude:vps");
  idee(5, { tag: TAG.a1, art: "motiv", titel: "Hände, die nicht aufhören", text: "Detail: Hände am Werkstück, während im Off weitergeredet wird.", herkunft: "JB", zustand: "offen", bilder: [B.b5] }, "JB");
  idee(6, { tag: TAG.a2, art: "bildaufbau", titel: "Totale von oben, fest", text: "Eine Kamera hoch und fest – der ganze Vorgang in einem Bild.", herkunft: "LES", zustand: "offen", bilder: [], szene: S.s3 });
  idee(7, { tag: TAG.a2, art: "kamera", titel: "Geführte Kamera bei der Person mit Kommando", text: "Nah bleiben, Gesicht im Moment der Entscheidung.", herkunft: "JB", zustand: "offen", bilder: [] }, "JB");
  idee(8, { tag: TAG.a2, art: "licht", titel: "Zusatzlicht vorab verwerfen", text: "Bei Tag kein Kunstlicht, Planen als Diffusor nutzen.", herkunft: "Claude", zustand: "verworfen", bilder: [],
    begruendung: "Beispiel: verworfen von LES – Licht wird vor Ort entschieden.", entschieden_von: "LES", entschieden_am: "2029-12-03" }, "claude:vps");
  idee(9, { tag: TAG.a3, art: "motiv", titel: "Tropfen auf der Plane", text: "Regen von innen, Gegenlicht.", herkunft: "LES", zustand: "gedreht", bilder: [B.b7] });
  // Probe: Text aus der Datenbank bleibt Text (allgemeine Idee ohne Drehtag)
  idee(10, { tag: null, art: "bildaufbau", titel: "Probe <b>kein Fett</b> <img src=x onerror=\"window.VB_XSS=1\">", text: "Probe: <script>window.VB_XSS=1</script> muss als Text erscheinen.", herkunft: "JB", zustand: "offen", bilder: [] }, "JB");

  vision_szene[S.s1] = m({ tag: TAG.a1, titel: "Abendarbeit", tageszeit: "21–23 Uhr", absicht: "Warmes Seitenlicht von der Werkbank, Hintergrund absaufen lassen.",
    kameras: [{ name: "K1", x: 6, y: 5.6, richtung: 200, brennweite_mm: 50, hoehe_m: 1.4 }],
    lampen: [{ geraet: "L1", x: 0.8, y: 5.6, richtung: 20, hoehe_m: 2.0, kelvin: 3200 }],
    former: [{ art: "Softbox klein", x: 1.3, y: 5.8, richtung: 20, zu_lampe: "L1" }, { art: "Flag (schwarz)", x: 3.6, y: 4.9, richtung: 90, zu_lampe: "L1" }] });
  vision_szene[S.s2] = m({ tag: TAG.a1, titel: "Nachtgespräch", tageszeit: "0–1 Uhr", absicht: "Feuer als Schlüssellicht, nur ein sehr schwacher Aufheller von der Gegenseite.",
    kameras: [{ name: "K1", x: 9.2, y: 5.2, richtung: 40, brennweite_mm: 85, hoehe_m: 1.1 }],
    lampen: [{ geraet: "L2", x: 13, y: 7.4, richtung: 220, hoehe_m: 0.6, kelvin: 2700 }],
    former: [{ art: "Diffusion ¼", x: 12.5, y: 7, richtung: 220, zu_lampe: "L2" }] });
  vision_szene[S.s3] = m({ tag: TAG.a2, titel: "Der Moment", tageszeit: "Vormittag", absicht: "Tageslicht durch die Planen, keine Lampe. Eine Kamera hoch, eine geführt.",
    kameras: [{ name: "K1", x: 13, y: 0.6, richtung: 150, brennweite_mm: 24, hoehe_m: 3.2 }, { name: "K2", x: 7, y: 6.2, richtung: 270, brennweite_mm: 35, hoehe_m: 1.6 }],
    lampen: [], former: [{ art: "Reflektor weiß", x: 9.5, y: 6.6, richtung: 300, zu_lampe: "" }] });

  var vision_zelt = { grundriss: m({ laenge_m: 14, breite_m: 8, firsthoehe_m: 4.5, quelle: "geschätzt", objekte: [
    { art: "rumpf", name: "Rumpf (Objekt)", x: 3, y: 2.5, b: 8, l: 3, drehung: 0 },
    { art: "werkbank", name: "Werkbank", x: 1, y: 6.6, b: 3, l: 0.9, drehung: 0 },
    { art: "eingang", name: "Eingang", x: 13.6, y: 3.2, b: 0.4, l: 1.6, drehung: 0 },
    { art: "strom", name: "Strom", x: 0.2, y: 0.2, b: 0.5, l: 0.5, drehung: 0 },
    { art: "feuer", name: "Feuerstelle", x: 11.5, y: 6.6, b: 1, l: 1, drehung: 0 }] }) };
  var vision_geraete = { liste: m({ lampen: [{ kennung: "L1", typ: "Beispiel-LED 60 W", leistung: "60 W", kelvin_von: 2700, kelvin_bis: 6500, akku: true },
    { kennung: "L2", typ: "Beispiel-Röhre 1,2 m", leistung: "30 W", kelvin_von: 2700, kelvin_bis: 6500, akku: true }], former: [], kameras: [], objektive: [] }) };

  // Vorschlag F6: für Gäste lesbare Kopie fertiger, freigegebener Previs (ohne Prompt, ohne Pfad, ohne Szene) — nur in der Demo
  vision_gast["vg-00000000-0000-4000-8000-000000000001"] = m({ titel: "Feuer als Schlüssellicht", tag_kennung: "DT 90", art: "licht", werkzeug: "Beispiel-Werkzeug",
    erzeugt_am: "2029-12-01", freigegeben_von: "LES", freigegeben_am: "2029-12-04", platzhalter: { form: "feuer", farbe: ["#1a1410", "#e0893a"] } });

  var SAMMLUNGEN = { vision_tag: vision_tag, vision_idee: vision_idee, vision_bild: vision_bild, vision_szene: vision_szene, vision_zelt: vision_zelt,
    vision_geraete: vision_geraete, vision_gast: vision_gast };
  window.LEITSTAND_VISION_DEMO = { sammlungen: SAMMLUNGEN };

  var store = window.LEITSTAND_DEMO_STORE;
  if (!store) return;
  var editor = /[?&]demo=1(&|$)/.test(location.search);
  Object.keys(SAMMLUNGEN).forEach(function (k) {
    if (k !== "vision_gast" && !editor) return;
    store[k] = JSON.parse(JSON.stringify(SAMMLUNGEN[k]));
  });
})();
