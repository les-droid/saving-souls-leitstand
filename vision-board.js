/* Vision Board — Reiter »Vision« im Leitstand (Bauschritt 2 + Eingeben; Konzept »261009 Vision Board Konzept CL LES.md«, Antworten LES F1–F17).
   CL LES 09.10.2026. Überlagerung: ändert keine bestehende Datei. Wird in index.html direkt NACH redaktion.js geladen (anwenden.sh).
   Fassung »Eingeben« (Auftrag LES 09.10.): Ideen anlegen/bearbeiten/eigene löschen, Claude-Vorschläge übernehmen/verwerfen, Drehtage anlegen/
   bearbeiten (Name »DTxx (geplant)« automatisch, F13), Grundriss und Szenen als Formular mit Zahlen (F9; Himmelsrichtung nur als Winkel zum Zelt, F7).
   Vorbereitung, kein Material: Previs-Bilder (KI) tragen ihr Kennzeichen in jeder Bildfläche — Karte, Panel und Großansicht.

   Einhängen: der Reiter meldet sich über die Schnittstelle des Redaktions-Moduls an (window.LEITSTAND_REDAKTION, redaktion.js). Diese Datei legt
   eine Hülle darum, die eine Seite »vision« ergänzt; alles Übrige reicht sie unverändert an redaktion.js weiter. Damit gilt für »Vision«, was die
   Seite für die Redaktion schon tut: Reiter erst, wenn die Rolle feststeht und es kein Gast ist; Seite in NUR_ADMIN; Gast auf #vision… → »Heute«;
   kein Abo für Gäste; Abmelden mit der Redaktion. Ohne redaktion.js bleibt der Reiter aus.
   Gelesen werden (nur Admins, über den Zugriff der Seite für die Redaktion, nur onSnapshot): vision_tag, vision_idee, vision_bild, vision_szene,
   vision_zelt, vision_geraete und boards (Adresse der Stills); dazu stand/projekt (gedrehte Tage, nur für die Nummer »DTxx (geplant)«).
   Geschrieben wird (nur mit Schalter EIN.schreiben, nur Admins mit Kürzel LES oder JB aus der Anmeldung) über die Datenbank-Schicht der Seite
   (leitstand-db.js: doc(id).set/update/delete auf docs; die Datenbank-Regel docs_admin entscheidet am Server). Der Zugang, den die Seite der Redaktion
   gibt, kann nur lesen; deshalb holt sich das Vision Board die Schicht selbst (window.claude.use("db")) — erst NACHDEM die Seite es als Admin gestartet
   hat, nie für Gäste, und prüft Rolle und Kürzel vor jedem Schreiben noch einmal. Bilder hochladen bleibt beim Skript (vision-board CL LES.mjs).

   Für Gäste (Antwort LES F6, Vorschlag; Standard AUS): ein Block »Previs« im Reiter Boards aus der eigenen Sammlung vision_gast (fertige, freigegebene
   Previs, ohne Prompt, ohne Pfad). Die Datenbank lässt Gäste diese Sammlung heute NICHT lesen (Positivliste v2); erst nach Änderung und Gast-Probe einschalten.

   Schalter (alle Standard AUS, damit die eingespielten Dateien nichts zeigen): EIN.an (Reiter Vision für Admins), EIN.schreiben (Eingeben, nur wirksam
   mit EIN.an), EIN.gastPrevis (Block für Gäste; nach F17 zurückgestellt, bleibt aus).
   Nur lokal (localhost, 127.0.0.1, [::1], file:) auch über die Adresse: ?vision=1 schaltet Reiter und Eingeben ein, ?vision=lesen nur den Reiter,
   ?vision=gast zusätzlich den Gast-Block.
   Adressen: #vision (Drehtag-Ansicht, nächster geplanter Tag) · #vision?dt=<vt-Kennung>[&idee=<vi-Kennung>] · #vision?v=panel (»Alle Bildideen«).
   Jeder Text aus der Datenbank wird maskiert gesetzt (esc); Bildadressen nur https:. Prüfzugang: window.LEITSTAND_VISION. */
(function () {
  "use strict";

  var EIN = { an: true, schreiben: true, gastPrevis: false };   // 261012 CL LES: eingeschaltet (Freigabe LES 12.10.; Browser-Prüfung 80/80)
  var h = location.hostname;
  var LOKAL = location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  var SUCHE = String(location.search || "");
  if (LOKAL && /[?&]vision=(1|gast|lesen)(&|$)/.test(SUCHE)) { EIN.an = true; EIN.schreiben = !/[?&]vision=lesen(&|$)/.test(SUCHE); EIN.gastPrevis = /[?&]vision=gast(&|$)/.test(SUCHE); }
  var DEMO = LOKAL && /[?&]demo=(1|gast)(&|$)/.test(SUCHE);
  // Demo-Daten (erfunden) nur lokal und nur mit eingeschaltetem Vision Board — wie demo-redaktion.js
  if (DEMO && (EIN.an || EIN.gastPrevis) && document.readyState === "loading" && typeof document.write === "function") document.write('<script src="demo-vision.js"><\/script>');

  var SEITE = "vision", NAME = "Vision";
  var SAMMLUNGEN = ["vision_tag", "vision_idee", "vision_bild", "vision_szene", "vision_zelt", "vision_geraete"];
  var GAST_SAMMLUNG = "vision_gast";   // Vorschlag F6 — für Gäste erst nach Änderung der Leseregel lesbar
  var GRENZE_WARNEN = 900;             // leitstand-db.js lädt höchstens 1000 Zeilen je Sammlung (wie der Agenten-Kanal)
  var SPEICHER_PREVIS = "ss-vision-previs-aus";   // »Previs ausblenden« merkt sich je Gerät

  var ARTEN = [
    { k: "licht", n: "Licht" }, { k: "kamera", n: "Kamera und Bewegung" }, { k: "bildaufbau", n: "Bildaufbau" },
    { k: "farbe", n: "Farbe und Look" }, { k: "motiv", n: "Motiv und Detail" }
  ];
  var ZUSTAND = { vorschlag: "Vorschlag", offen: "offen", geplant: "geplant", gedreht: "gedreht", verworfen: "verworfen" };
  var TAG_ZUSTAND = { geplant: "geplant", gedreht: "gedreht", verschoben: "verschoben" };
  var HERKUNFT = ["LES", "JB", "Claude"];
  var PREVIS_BAND = "PREVIS · KI · NICHT FÜR DEN FILM";

  /* Wortlaute: aus dem freigegebenen Entwurf (LES 09.10.2026); neu gegenüber dem Entwurf sind mit »neu« vermerkt */
  var TEXT = {
    titel: "Vision",
    unter: "Bildideen je Drehtag – Vorbereitung, kein Material. Previs-Bilder (KI) sind gekennzeichnet und gehen nie in Sichtung, Schnitt oder Film.",
    tabTag: "Drehtag", tabPanel: "Alle Bildideen",
    previsAus: "Previs ausblenden",
    geplant: "Was inhaltlich geplant ist", geplantHint: "Verweise auf Redaktion und Szenenkatalog, keine Kopien",
    eigene: "Ideen von LES und JB", eigeneLeer: "Noch keine Ideen für diesen Tag.",
    claude: "Vorschläge von Claude", claudeHint: "gestrichelt · werden erst mit »übernehmen« zu Ideen", claudeLeer: "Keine Vorschläge.",
    stills: "Referenz-Stills", stillsHint: "aus den Kontaktboards, nur verwiesen", stillsLeer: "Keine Stills verknüpft.",
    previs: "Previs", previsHint: "KI-Bilder, nur intern · Entscheidung LES 09.10.2026", previsLeer: "Keine Previs-Bilder.", ausgeblendet: "Ausgeblendet.",
    ohneIdee: "Bilder ohne Idee", ohneIdeeHint: "hängen an keiner Karte",   // neu (Konzept Abschnitt 2)
    szenen: "Szenen und Licht", szenenHint: "Grundriss des Zelts, 1 Kästchen = 1 m", szenenLeer: "Noch keine Szene angelegt.", zeltLeer: "Noch kein Grundriss eingetragen.",
    notizen: "Notizen zum Tag", notizLeer: "–",
    tagLeer: "Noch kein Drehtag im Vision Board.",   // neu
    uebernehmen: "übernehmen", verwerfen: "verwerfen", knopfSpaeter: "Entscheiden nur LES oder JB",   // neu
    filterTag: "Drehtag", filterHer: "Herkunft", filterZu: "Zustand", alle: "alle", mitBild: "mit Bild", allgemein: "allgemein", keine: "keine",
    davon: " · davon ", gedrehtZ: " gedreht",
    laedt: "Vision Board lädt …", fehler: "Vision-Daten nicht geladen — Seite neu laden.",   // neu
    voll: "Mehr als 900 Einträge in einer Sammlung des Vision Boards — ab 1000 fehlen Einträge.",   // neu (wie der Kanal)
    grossZu: "Schließen (Esc)", grossLabel: "Großansicht",   // neu
    abgelaufen: "Adresse abgelaufen – das Skript erneuert sie",   // neu
    gastTitel: "Previs", gastHint: "KI-Bilder zur Vorbereitung · nicht für den Film",   // neu (Vorschlag F6)
    /* Eingeben — alles neu (Auftrag LES 09.10.); Wortlaute noch nicht von LES freigegeben */
    geplantName: " (geplant)", dtOhne: "DT ?",
    neuIdee: "+ Idee", neuTag: "+ Drehtag", neuSzene: "+ Szene", bearbeiten: "bearbeiten", loeschen: "löschen", grundrissBearb: "Grundriss bearbeiten",
    szeneBearb: "Szene bearbeiten", szeneLoeschen: "Szene löschen", tagBearb: "Drehtag bearbeiten",
    entschieden: "entschieden von ", nurKuerzel: "Eingeben nur mit Anmeldung als LES oder JB.",
    fIdeeNeu: "Neue Idee", fIdee: "Idee bearbeiten", fTagNeu: "Neuer Drehtag", fTag: "Drehtag bearbeiten", fSzeneNeu: "Neue Szene", fSzene: "Szene bearbeiten", fZelt: "Grundriss des Zelts",
    speichern: "speichern", abbrechen: "abbrechen", speichert: "speichert …", gespeichert: "Gespeichert.", geloescht: "Gelöscht.", nichtGespeichert: "Nicht gespeichert: ",
    nichtGeloescht: "Nicht gelöscht — keine Berechtigung oder schon weg.", schonEntschieden: "Schon entschieden — Ansicht ist neu geladen.", vorschlagErst: "Vorschläge erst übernehmen, dann bearbeiten.",
    fehlerTitel: "Bitte prüfen:", zeileNeu: "+ Zeile", zeileWeg: "Zeile entfernen",
    standort: "Keine Ortsangaben: nichts, was Ort, Umgebung oder Zufahrt des Zelts erkennbar macht. Maße nur im Zelt, in Metern.",
    richtungHint: "Richtung in Grad: 0° = entlang der Länge nach rechts im Plan, im Uhrzeigersinn. Ursprung (0/0) = Ecke oben links.",
    nordenHint: "Norden als Winkel zur Längsachse des Zelts (Grad, im Uhrzeigersinn wie »Richtung«), sonst nichts zur Lage. Leer lassen, wenn unbekannt.",
    kennungAuto: "Name automatisch: ", kennungGedreht: "Kennung (nur bei »gedreht«, z. B. DT12)",
    loeschenFrage: "Diese Idee löschen? Verknüpfte Bilder bleiben erhalten.", szeneLoeschenFrage: "Diese Szene löschen?",
    norden: "Norden"
  };
  var IDEE_ZUSTAENDE = ["offen", "geplant", "gedreht", "verworfen"];   // »vorschlag« setzt nur Claude (Skript), nie das Formular
  var OBJEKT_ARTEN = [{ k: "rumpf", n: "Rumpf" }, { k: "werkbank", n: "Werkbank" }, { k: "eingang", n: "Eingang (innen)" }, { k: "strom", n: "Strom" }, { k: "feuer", n: "Feuerstelle" }, { k: "anderes", n: "anderes" }];
  var EDITOREN = ["LES", "JB"];

  /* ---------- Hilfen ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function txt(v, max) { var s = typeof v === "string" ? v : typeof v === "number" && isFinite(v) ? String(v) : ""; return max && s.length > max ? s.slice(0, max - 1) + "…" : s; }
  function num(v) { return typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && isFinite(+v) ? +v : null; }
  function zahl(v) { var n = num(v); return n == null ? "–" : String(Math.round(n * 100) / 100).replace(".", ","); }
  function https(u) { return typeof u === "string" && /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : null; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : null; }
  function liste(v) { return Array.isArray(v) ? v : []; }
  function artName(k) { for (var i = 0; i < ARTEN.length; i++) if (ARTEN[i].k === k) return ARTEN[i].n; return txt(k) || "–"; }
  var WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  function datumKurz(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(txt(iso)); if (!m) return txt(iso);
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return WT[d.getUTCDay()] + " " + m[3] + "." + m[2] + ".";
  }
  function datumText(t) { var a = datumKurz(t.datum), b = t.datum_bis ? datumKurz(t.datum_bis) : ""; return b && b !== a ? a + " → " + b : a; }
  function istPrevis(b) { return !!b && b.quelle === "previs-ki"; }
  function abgelaufen(b) { var t = b && b.signed_url_ablauf ? Date.parse(b.signed_url_ablauf) : NaN; return isFinite(t) && t < Date.now(); }

  /* ---------- Daten aus den Abos ---------- */
  function leeresModell() { return { tag: {}, idee: {}, bild: {}, szene: {}, zelt: null, geraete: null, boards: {}, standTage: [], groesse: {}, fehler: false, geladen: {} }; }
  function docsAus(snap) {
    var docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
    var aus = {};
    docs.forEach(function (d) { if (!d) return; var id = d.id, v = typeof d.data === "function" ? d.data() : d.data; if (typeof id === "string" && obj(v)) aus[id] = v; });
    return { eintraege: aus, n: docs.length };
  }
  function uebernehme(M, sammlung, snap) {
    var r = docsAus(snap); M.groesse[sammlung] = r.n; M.geladen[sammlung] = true;
    var e = r.eintraege, gut = {};
    Object.keys(e).forEach(function (id) { var v = e[id]; if (v.schema == null || v.schema === 1) gut[id] = v; });   // nur Bauart 1
    if (sammlung === "vision_tag") M.tag = gut;
    else if (sammlung === "vision_idee") M.idee = gut;
    else if (sammlung === "vision_bild") M.bild = gut;
    else if (sammlung === "vision_szene") M.szene = gut;
    else if (sammlung === "vision_zelt") M.zelt = gut.grundriss || null;
    else if (sammlung === "vision_geraete") M.geraete = gut.liste || null;
    else if (sammlung === "boards") M.boards = e;
  }
  function tageGeordnet(M) {
    var t = Object.keys(M.tag).map(function (id) { return { id: id, v: M.tag[id] }; });
    function rang(x) { return x.v.zustand === "gedreht" ? 1 : 0; }
    return t.sort(function (a, b) {
      var r = rang(a) - rang(b); if (r) return r;
      var da = txt(a.v.datum), db = txt(b.v.datum);
      if (da !== db) return rang(a) ? (da < db ? 1 : -1) : (da < db ? -1 : 1);   // geplante: nächster zuerst; gedrehte: jüngster zuerst
      return (num(a.v.reihenfolge) || 0) - (num(b.v.reihenfolge) || 0);
    });
  }
  function ideenVon(M, tagId) {
    return Object.keys(M.idee).map(function (id) { return { id: id, v: M.idee[id] }; }).filter(function (x) { return tagId === undefined || (x.v.tag || null) === tagId; })
      .sort(function (a, b) { return (num(a.v.prio) || 9) - (num(b.v.prio) || 9) || (txt(a.v.created) < txt(b.v.created) ? -1 : 1); });
  }
  function bildVon(M, id) { var b = M.bild[id]; return b ? { id: id, v: b } : null; }
  /* Gedrehte Tage aus stand/projekt (drehtage.tage[].kennung) — nur die Kennungen, für die Nummer der geplanten Tage */
  function standUebernehme(M, d) { var t = obj(d) && obj(d.drehtage) ? liste(d.drehtage.tage) : []; M.standTage = t.map(function (x) { return obj(x) ? txt(x.kennung, 30) : ""; }).filter(Boolean); }
  function dtNummer(k) { var m = /^\s*DT\s*0*(\d{1,4})(?!\d)/i.exec(txt(k)); return m ? +m[1] : null; }
  /* Namen der Drehtage (F13): gedrehte und Tage mit Kennung heißen nach ihr; geplante/verschobene ohne Kennung heißen »DTxx (geplant)«, xx = die
     nächste freie Nummer nach dem höchsten gedrehten Tag (stand/projekt und vision_tag), in der Reihenfolge ihres Datums. Gespeichert wird der Name nicht —
     wird ein Tag gedreht oder verschoben, rücken die übrigen von selbst nach. */
  function tagNamen(M) {
    var max = 0, belegt = {}, namen = {};
    M.standTage.forEach(function (k) { var n = dtNummer(k); if (n != null) { belegt[n] = 1; if (n > max) max = n; } });
    Object.keys(M.tag).forEach(function (id) { var t = M.tag[id], n = dtNummer(t.kennung); if (n == null) return; belegt[n] = 1; if (t.zustand === "gedreht" && n > max) max = n; });
    var n = max;
    tageGeordnet(M).forEach(function (x) {
      var k = txt(x.v.kennung, 30).trim();
      if (k) { namen[x.id] = k; return; }
      if (x.v.zustand === "gedreht") { namen[x.id] = TEXT.dtOhne; return; }
      do n++; while (belegt[n]); belegt[n] = 1; namen[x.id] = "DT" + n + TEXT.geplantName;
    });
    return namen;
  }

  /* ---------- Bildflächen ---------- */
  function kennzeichen(b, M) {
    var q = b.quelle;
    if (q === "previs-ki") return PREVIS_BAND;
    if (q === "still") return "STILL " + (txt(b.tag, 20) || "DT ?") + (num(b.seite) != null ? " · S. " + num(b.seite) : "");
    if (q === "foto") return "FOTO " + (txt(b.von, 10) || "");
    if (q === "skizze") return "SKIZZE";
    if (q === "aussen") return "AUSSEN · NUR EDITOREN";
    return "BILD";
  }
  function bandKlasse(q) { return { "previs-ki": "previs", still: "still", foto: "foto", skizze: "skizze", aussen: "aussen" }[q] || "anders"; }
  var FORMEN = { fenster: 1, feuer: 1, linien: 1, skizze: 1, hand: 1, morgen: 1, regen: 1 };
  function farbe(c, alt) { return typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : alt; }
  var platzNr = 0;
  /* gezeichneter Platzhalter (nur Demo-Daten mit Feld platzhalter; aus dem Entwurf) — bewusst abstrakt */
  function platzhalter(p) {
    p = obj(p) || {}; var f = FORMEN[p.form] ? p.form : "", fa = liste(p.farbe), a = farbe(fa[0], "#1d2a2e"), c = farbe(fa[1], "#93a8aa"), m = "", gid = "vbg" + (++platzNr);
    if (f === "fenster") m = '<rect x="110" y="20" width="60" height="70" fill="' + c + '" opacity=".75"/><rect x="0" y="95" width="320" height="85" fill="#000" opacity=".35"/>';
    if (f === "feuer") m = '<ellipse cx="160" cy="150" rx="40" ry="14" fill="' + c + '" opacity=".9"/><path d="M150 150 Q160 95 170 150 Z" fill="#ffd27a"/><circle cx="90" cy="110" r="18" fill="' + c + '" opacity=".35"/><circle cx="230" cy="108" r="18" fill="' + c + '" opacity=".35"/>';
    if (f === "linien") m = '<path d="M0 180 L160 70 L320 180" stroke="' + c + '" stroke-width="3" fill="none"/><path d="M60 180 L160 95 L260 180" stroke="' + c + '" stroke-width="2" fill="none" opacity=".6"/>';
    if (f === "skizze") m = '<rect x="30" y="40" width="260" height="110" fill="none" stroke="' + c + '" stroke-dasharray="6 5"/><circle cx="60" cy="120" r="10" fill="none" stroke="' + c + '"/><path d="M70 115 L200 70" stroke="' + c + '"/>';
    if (f === "hand") m = '<rect x="90" y="80" width="140" height="40" rx="18" fill="' + c + '" opacity=".6"/><rect x="40" y="120" width="240" height="14" fill="' + c + '" opacity=".3"/>';
    if (f === "morgen") m = '<rect x="0" y="0" width="320" height="90" fill="' + c + '" opacity=".35"/><rect x="140" y="100" width="22" height="30" rx="4" fill="#d9e3ea" opacity=".8"/><path d="M151 98 q6 -12 0 -24" stroke="#d9e3ea" fill="none" opacity=".6"/>';
    if (f === "regen") { for (var i = 0; i < 18; i++) m += '<line x1="' + (15 + i * 17) + '" y1="' + (10 + (i % 5) * 9) + '" x2="' + (8 + i * 17) + '" y2="' + (50 + (i % 5) * 9) + '" stroke="' + c + '" opacity=".7"/>'; }
    return '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="#0b1416"/></linearGradient></defs><rect width="320" height="180" fill="url(#' + gid + ')"/>' + m + "</svg>";
  }
  /* Adresse eines Bildes: eigene signierte Adresse; bei Stills die des boards-Eintrags (nur verwiesen, nie kopiert) */
  function adresse(b, M) {
    if (b.quelle === "still" && !b.signed_url && M && typeof b.board === "string" && M.boards[b.board]) return https(M.boards[b.board].signed_url);
    return abgelaufen(b) ? null : https(b.signed_url);
  }
  /* Eine Bildfläche mit Kennzeichen IM Bild. opt: { gross, knopf (öffnet Großansicht), M } */
  function bildHtml(id, b, opt) {
    opt = opt || {};
    var M = opt.M, q = txt(b.quelle), band = kennzeichen(b, M), url = adresse(b, M);
    var alt = istPrevis(b) ? "Previs-Bild (KI), nicht für den Film" : band;
    var unter = istPrevis(b) ? [txt(b.werkzeug, 40), datumKurz(b.erzeugt_am)].filter(Boolean).join(" · ") : "";
    var inhalt = url ? '<img src="' + esc(url) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
      : b.platzhalter ? platzhalter(b.platzhalter) : '<span class="vb-ohnebild">' + esc(abgelaufen(b) ? TEXT.abgelaufen : "") + "</span>";
    var kopf = opt.knopf ? '<button type="button" class="vb-bild' + (opt.gross ? " vb-gross-bild" : "") + '" data-vb-gross="' + esc(id) + '" aria-label="' + esc(alt + " – " + TEXT.grossLabel) + '">'
      : '<div class="vb-bild' + (opt.gross ? " vb-gross-bild" : "") + '" role="img" aria-label="' + esc(alt) + '">';
    return kopf + inhalt + '<span class="vb-band vb-band-' + bandKlasse(q) + '" data-kennzeichen="' + esc(band) + '">' + esc(band) + "</span>" +
      (unter ? '<span class="vb-bildunter">' + esc(unter) + "</span>" : "") + (opt.knopf ? "</button>" : "</div>");
  }

  /* ---------- Karten ---------- */
  /* Knöpfe einer Idee: Vorschlag → übernehmen/verwerfen (ohne Recht sichtbar, aber gesperrt); sonst bearbeiten, eigene auch löschen */
  function ideeKnoepfe(x, r) {
    var d = x.v, her = HERKUNFT.indexOf(d.herkunft) !== -1 ? d.herkunft : "", zu = ZUSTAND[d.zustand] ? d.zustand : "offen", darf = !!(r && r.darf), id = esc(x.id), knoepfe = "";
    if (zu === "vorschlag") knoepfe = '<div class="vb-knoepfe">' + [["offen", TEXT.uebernehmen], ["verworfen", TEXT.verwerfen]].map(function (k) {
      return '<button type="button"' + (darf ? ' data-vb-aktion="entscheiden" data-vb-wie="' + k[0] + '" data-vb-id="' + id + '"' : ' disabled title="' + esc(TEXT.knopfSpaeter) + '"') + ">" + esc(k[1]) + "</button>";
    }).join("") + "</div>";
    else if (darf) knoepfe = '<div class="vb-knoepfe">' + '<button type="button" data-vb-aktion="idee-bearbeiten" data-vb-id="' + id + '">' + esc(TEXT.bearbeiten) + "</button>" +
      (her && her === r.ich ? '<button type="button" data-vb-aktion="idee-loeschen" data-vb-id="' + id + '">' + esc(TEXT.loeschen) + "</button>" : "") + "</div>";
    return knoepfe;
  }
  function ideeKarte(x, M, previsAus, r) {
    var d = x.v, her = HERKUNFT.indexOf(d.herkunft) !== -1 ? d.herkunft : "", zu = ZUSTAND[d.zustand] ? d.zustand : "offen", knoepfe = ideeKnoepfe(x, r);
    var ent = d.entschieden_von ? '<div class="vb-hint">' + esc(TEXT.entschieden + txt(d.entschieden_von, 10) + (d.entschieden_am ? " · " + datumKurz(d.entschieden_am) : "")) + "</div>" : "";
    var bilder = liste(d.bilder).map(function (bid) { var b = bildVon(M, bid); if (!b || (previsAus && istPrevis(b.v))) return ""; return bildHtml(b.id, b.v, { knopf: true, M: M }); }).join("");
    return '<article class="vb-idee' + (her === "Claude" ? " vb-claude" : "") + (zu === "verworfen" ? " vb-verworfen" : "") + '" id="vb-' + esc(x.id) + '" data-idee="' + esc(x.id) + '">' + bilder +
      '<div class="vb-txt"><div class="vb-meta"><span class="vb-art">' + esc(artName(d.art)) + "</span>" + (her ? '<span class="vb-chip vb-chip-' + her + '">' + her + "</span>" : "") +
      '<span class="vb-zustand vb-z-' + zu + '">' + esc(ZUSTAND[zu]) + "</span></div>" +
      '<div class="vb-t">' + esc(txt(d.titel, 80)) + "</div>" + (d.text ? "<div>" + esc(txt(d.text, 1000)) + "</div>" : "") +
      (her === "Claude" && d.begruendung ? '<div class="vb-begr">' + esc(txt(d.begruendung, 1000)) + "</div>" : "") +
      ent + knoepfe + "</div></article>";
  }
  function raster(inhalt, leer) { return inhalt.length ? '<div class="vb-raster">' + inhalt.join("") + "</div>" : '<div class="vb-leer">' + esc(leer) + "</div>"; }
  function karte(titel, hint, inhalt, klasse) { return '<section class="vb-karte' + (klasse ? " " + klasse : "") + '"><h2>' + esc(titel) + (hint != null && hint !== "" ? ' <span class="vb-hint">' + esc(hint) + "</span>" : "") + "</h2>" + inhalt + "</section>"; }

  /* ---------- Grundriss (SVG aus den Daten; Koordinaten relativ zum Zelt, Meter; nie Geokoordinaten) ---------- */
  var S = 40, RAND = 20;   // 1 m = 40 px
  function grundriss(Z, sz, geraete) {
    var L = num(Z.laenge_m), B = num(Z.breite_m);
    if (!(L > 0 && B > 0 && L <= 200 && B <= 200)) return '<div class="vb-leer">' + esc(TEXT.zeltLeer) + "</div>";
    var w = L * S + 2 * RAND, hh = B * S + 2 * RAND, o = [];
    function px(v) { return RAND + v * S; }
    o.push('<svg class="vb-grundriss" viewBox="0 0 ' + w + " " + hh + '" role="img" aria-label="' + esc("Grundriss des Zelts mit Kamera, Lampe und Lichtformer für die Szene " + txt(sz.titel, 80)) + '">');
    for (var gx = 0; gx <= L; gx++) o.push('<line x1="' + px(gx) + '" y1="' + px(0) + '" x2="' + px(gx) + '" y2="' + px(B) + '" stroke="#1c2b30"/>');
    for (var gy = 0; gy <= B; gy++) o.push('<line x1="' + px(0) + '" y1="' + px(gy) + '" x2="' + px(L) + '" y2="' + px(gy) + '" stroke="#1c2b30"/>');
    o.push('<rect x="' + px(0) + '" y="' + px(0) + '" width="' + L * S + '" height="' + B * S + '" fill="none" stroke="#93A8AA" stroke-width="2"/>');
    liste(Z.objekte).forEach(function (ob) {
      ob = obj(ob); if (!ob) return; var x = num(ob.x), y = num(ob.y), b = num(ob.b), l = num(ob.l), dr = num(ob.drehung) || 0;
      if (x == null || y == null || !(b > 0) || !(l > 0)) return;
      var f = ob.art === "rumpf" ? "#2a3c42" : ob.art === "feuer" ? "#5a2e1a" : "#22343a";
      o.push('<g transform="rotate(' + dr + " " + px(x) + " " + px(y) + ')"><rect x="' + px(x) + '" y="' + px(y) + '" width="' + b * S + '" height="' + l * S + '" rx="' + (ob.art === "rumpf" ? 40 : 3) + '" fill="' + f + '" stroke="#5C7075"/>' +
        '<text x="' + (px(x) + 4) + '" y="' + (px(y) + 13) + '" fill="#93A8AA" font-size="11">' + esc(txt(ob.name, 40)) + "</text></g>");
    });
    function strahl(x, y, r, len, breite, farbe, op) {
      var a1 = (r - breite / 2) * Math.PI / 180, a2 = (r + breite / 2) * Math.PI / 180;
      return '<path d="M' + px(x) + " " + px(y) + " L" + (px(x) + Math.cos(a1) * len * S) + " " + (px(y) + Math.sin(a1) * len * S) + " L" + (px(x) + Math.cos(a2) * len * S) + " " + (px(y) + Math.sin(a2) * len * S) + ' Z" fill="' + farbe + '" opacity="' + op + '"/>';
    }
    var lampen = liste(sz.lampen).map(obj).filter(function (l) { return l && num(l.x) != null && num(l.y) != null; });
    var kameras = liste(sz.kameras).map(obj).filter(function (k) { return k && num(k.x) != null && num(k.y) != null; });
    var former = liste(sz.former).map(obj).filter(function (f) { return f && num(f.x) != null && num(f.y) != null; });
    lampen.forEach(function (l) { o.push(strahl(num(l.x), num(l.y), num(l.richtung) || 0, 5, 50, "#E8C547", 0.18)); });
    kameras.forEach(function (k) {
      var f = num(k.brennweite_mm), winkel = f > 0 ? 2 * Math.atan(36 / (2 * f)) * 180 / Math.PI : 40;   // waagrechter Bildwinkel Vollformat
      o.push(strahl(num(k.x), num(k.y), num(k.richtung) || 0, 6, winkel, "#56ABB5", 0.16));
    });
    former.forEach(function (fm) {
      var a = (num(fm.richtung) || 0) * Math.PI / 180, dx = Math.cos(a + Math.PI / 2) * 0.45 * S, dy = Math.sin(a + Math.PI / 2) * 0.45 * S, x = px(num(fm.x)), y = px(num(fm.y));
      o.push('<line x1="' + (x - dx) + '" y1="' + (y - dy) + '" x2="' + (x + dx) + '" y2="' + (y + dy) + '" stroke="#E4ECEA" stroke-width="4" stroke-linecap="round"/>');
    });
    lampen.forEach(function (l) { o.push('<circle cx="' + px(num(l.x)) + '" cy="' + px(num(l.y)) + '" r="8" fill="#E8C547"/><text x="' + (px(num(l.x)) + 11) + '" y="' + (px(num(l.y)) - 8) + '" fill="#E8C547" font-size="12" font-weight="600">' + esc(txt(l.geraet, 12)) + "</text>"); });
    kameras.forEach(function (k, i) { o.push('<rect x="' + (px(num(k.x)) - 8) + '" y="' + (px(num(k.y)) - 6) + '" width="16" height="12" rx="2" fill="#56ABB5"/><text x="' + (px(num(k.x)) + 11) + '" y="' + (px(num(k.y)) + 16) + '" fill="#56ABB5" font-size="12" font-weight="600">' + esc(txt(k.name, 12) || "K" + (i + 1)) + "</text>"); });
    o.push('<line x1="' + px(0) + '" y1="' + (hh - 6) + '" x2="' + px(1) + '" y2="' + (hh - 6) + '" stroke="#93A8AA" stroke-width="2"/><text x="' + (px(1) + 6) + '" y="' + (hh - 2) + '" fill="#93A8AA" font-size="11">1 m</text>');
    var no = num(Z.norden_grad);   // F7: nur Winkel zur Längsachse des Zelts — Pfeil in der Ecke, keine Lage
    if (no != null) {
      var na = no * Math.PI / 180, cx = px(L) - 22, cy = px(0) + 22, tx = cx + Math.cos(na) * 16, ty = cy + Math.sin(na) * 16;
      o.push('<g class="vb-norden"><circle cx="' + cx + '" cy="' + cy + '" r="18" fill="#0b1416" stroke="#5C7075"/><line x1="' + cx + '" y1="' + cy + '" x2="' + tx + '" y2="' + ty + '" stroke="#E4ECEA" stroke-width="2"/>' +
        '<text x="' + (cx + Math.cos(na) * 9 - 4) + '" y="' + (cy + Math.sin(na) * 9 + 4) + '" fill="#E4ECEA" font-size="10" font-weight="700">' + esc(TEXT.norden.charAt(0)) + "</text></g>");
    }
    o.push("</svg>");
    return o.join("");
  }
  function lampenName(geraete, k) {
    var g = geraete ? liste(geraete.lampen).filter(function (x) { return obj(x) && x.kennung === k; })[0] : null;
    return txt(k, 12) + (g && g.typ ? " " + txt(g.typ, 60) : "");
  }
  function szenenListe(sz, geraete) {
    var z = [];
    liste(sz.kameras).map(obj).filter(Boolean).forEach(function (k, i) { z.push("<tr><td>Kamera</td><td>" + esc(txt(k.name, 12) || "K" + (i + 1)) + "</td><td>" + esc(zahl(k.brennweite_mm) + " mm · Höhe " + zahl(k.hoehe_m) + " m · Richtung " + zahl(k.richtung) + "°" + (k.notiz ? " · " + txt(k.notiz, 200) : "")) + "</td></tr>"); });
    liste(sz.lampen).map(obj).filter(Boolean).forEach(function (l) { z.push("<tr><td>Lampe</td><td>" + esc(lampenName(geraete, l.geraet)) + "</td><td>" + esc(zahl(l.kelvin) + " K · Höhe " + zahl(l.hoehe_m) + " m · Richtung " + zahl(l.richtung) + "°" + (l.leistung ? " · " + txt(l.leistung, 20) : "") + (l.notiz ? " · " + txt(l.notiz, 200) : "")) + "</td></tr>"); });
    liste(sz.former).map(obj).filter(Boolean).forEach(function (f) { z.push("<tr><td>Lichtformer</td><td>" + esc(txt(f.art, 60)) + "</td><td>" + esc((f.zu_lampe ? "an " + txt(f.zu_lampe, 12) : "frei") + " · Richtung " + zahl(f.richtung) + "°" + (f.notiz ? " · " + txt(f.notiz, 200) : "")) + "</td></tr>"); });
    return (sz.absicht ? '<p class="vb-absicht">' + esc(txt(sz.absicht, 300)) + "</p>" : "") +
      '<table class="vb-liste"><thead><tr><th>Art</th><th>Gerät</th><th>Einstellung</th></tr></thead><tbody>' + z.join("") + "</tbody></table>" +
      '<div class="vb-legende"><span style="--c:#56ABB5">Kamera, Bildwinkel</span><span style="--c:#E8C547">Lampe, Lichtkegel</span><span style="--c:#E4ECEA">Lichtformer</span></div>';
  }

  /* ---------- Ansicht Drehtag ---------- */
  function knopf(aktion, text, extra) { return '<button type="button" class="vb-aktion" data-vb-aktion="' + aktion + '"' + (extra || "") + ">" + esc(text) + "</button>"; }
  function previsSchalter(an) { return '<label class="vb-schalter"><input type="checkbox" data-vb-previs' + (an ? " checked" : "") + "> " + esc(TEXT.previsAus) + "</label>"; }
  function tagAnsicht(M, z) {
    var tage = tageGeordnet(M), akt = z.dt && M.tag[z.dt] ? z.dt : tage.length ? tage[0].id : null, namen = tagNamen(M), darf = !!(z.recht && z.recht.darf);
    var h = '<div class="vb-leiste">' + tage.map(function (x) {
      return '<button type="button" class="vb-tagknopf" data-vb-tag="' + esc(x.id) + '" aria-pressed="' + (x.id === akt) + '">' + esc(namen[x.id]) +
        "<small>" + esc(datumText(x.v) + " · " + (TAG_ZUSTAND[x.v.zustand] || "geplant")) + "</small></button>";
    }).join("") + (darf ? knopf("tag-neu", TEXT.neuTag) : "") + previsSchalter(z.previsAus) + "</div>";
    if (!akt) return h + '<div class="vb-leer">' + esc(TEXT.tagLeer) + "</div>";
    var t = M.tag[akt], ideen = ideenVon(M, akt), zu = TAG_ZUSTAND[t.zustand] ? t.zustand : "geplant";
    var eigene = ideen.filter(function (x) { return x.v.herkunft !== "Claude"; }), cl = ideen.filter(function (x) { return x.v.herkunft === "Claude"; });
    var verbunden = {}, stills = [], previs = [];
    ideen.forEach(function (x) { liste(x.v.bilder).forEach(function (bid) { verbunden[bid] = 1; var b = bildVon(M, bid); if (!b) return; if (b.v.quelle === "still" && stills.indexOf(bid) === -1) stills.push(bid); if (istPrevis(b.v) && previs.indexOf(bid) === -1) previs.push(bid); }); });
    Object.keys(M.idee).forEach(function (iid) { liste(M.idee[iid].bilder).forEach(function (bid) { verbunden[bid] = 1; }); });
    var ohne = Object.keys(M.bild).filter(function (bid) { return M.bild[bid].zu_tag === akt && !verbunden[bid]; });
    ohne.forEach(function (bid) { if (istPrevis(M.bild[bid]) && previs.indexOf(bid) === -1) previs.push(bid); });
    function flaeche(bid) { var b = bildVon(M, bid); return b ? '<div class="vb-idee">' + bildHtml(bid, b.v, { knopf: true, M: M }) + "</div>" : ""; }
    h += '<section class="vb-karte"><div class="vb-kopf"><div><div class="vb-titel">' + esc(namen[akt] + " · " + datumText(t)) + "</div><div>" + esc(txt(t.vorhaben, 300)) +
      '</div></div><div class="vb-kopfrechts"><span class="vb-zustand vb-z-' + zu + '">' + esc(TAG_ZUSTAND[zu]) + "</span>" +
      (darf ? knopf("tag-bearbeiten", TEXT.tagBearb, ' data-vb-id="' + esc(akt) + '"') : "") + "</div></div></section>";
    var bez = liste(t.bezuege).map(obj).filter(Boolean);
    h += karte(TEXT.geplant, TEXT.geplantHint, (t.beschreibung ? "<div>" + esc(txt(t.beschreibung, 2000)) + "</div>" : "") +
      (bez.length ? '<ul class="vb-bezuege">' + bez.map(function (b) { return "<li>" + esc(txt(b.titel, 120) || txt(b.ref, 80)) + "</li>"; }).join("") + "</ul>" : ""));
    h += karte(TEXT.eigene, String(eigene.length), (darf ? '<div class="vb-werkzeug">' + knopf("idee-neu", TEXT.neuIdee, ' data-vb-fuer="' + esc(akt) + '"') + "</div>" : "") +
      raster(eigene.map(function (x) { return ideeKarte(x, M, z.previsAus, z.recht); }), TEXT.eigeneLeer));
    h += karte(TEXT.claude, TEXT.claudeHint, raster(cl.map(function (x) { return ideeKarte(x, M, z.previsAus, z.recht); }), TEXT.claudeLeer));
    h += karte(TEXT.stills, TEXT.stillsHint, raster(stills.map(flaeche), TEXT.stillsLeer));
    h += karte(TEXT.previs, TEXT.previsHint, z.previsAus ? '<div class="vb-leer">' + esc(TEXT.ausgeblendet) + "</div>" : raster(previs.map(flaeche), TEXT.previsLeer), "vb-previsblock");
    var ohneZeigen = ohne.filter(function (bid) { return !(z.previsAus && istPrevis(M.bild[bid])); });
    if (ohneZeigen.length) h += karte(TEXT.ohneIdee, TEXT.ohneIdeeHint, raster(ohneZeigen.map(flaeche), ""));
    var szenen = Object.keys(M.szene).filter(function (sid) { return M.szene[sid].tag === akt; }).map(function (sid) { return { id: sid, v: M.szene[sid] }; });
    var sAkt = z.szene && szenen.some(function (s) { return s.id === z.szene; }) ? z.szene : szenen.length ? szenen[0].id : null;
    var sz = sAkt ? M.szene[sAkt] : null, sh = "";
    if (darf) sh += '<div class="vb-werkzeug">' + knopf("szene-neu", TEXT.neuSzene, ' data-vb-fuer="' + esc(akt) + '"') +
      (sz ? knopf("szene-bearbeiten", TEXT.szeneBearb, ' data-vb-id="' + esc(sAkt) + '"') + knopf("szene-loeschen", TEXT.szeneLoeschen, ' data-vb-id="' + esc(sAkt) + '"') : "") +
      knopf("zelt-bearbeiten", TEXT.grundrissBearb) + "</div>";
    if (sz) {
      sh += '<div class="vb-szenenwahl">' + szenen.map(function (s) { return '<button type="button" data-vb-szene="' + esc(s.id) + '" aria-pressed="' + (s.id === sAkt) + '">' + esc(txt(s.v.titel, 60) + (s.v.tageszeit ? " · " + txt(s.v.tageszeit, 30) : "")) + "</button>"; }).join("") + "</div>";
      sh += '<div class="vb-szenen"><div>' + (M.zelt ? grundriss(M.zelt, sz, M.geraete) : '<div class="vb-leer">' + esc(TEXT.zeltLeer) + "</div>") + "</div><div>" + szenenListe(sz, M.geraete) + "</div></div>";
    } else sh += (M.zelt && darf ? '<div class="vb-szenen"><div>' + grundriss(M.zelt, {}, M.geraete) + "</div><div></div></div>" : "") + '<div class="vb-leer">' + esc(TEXT.szenenLeer) + "</div>";
    var zeltHint = TEXT.szenenHint + (M.zelt && M.zelt.quelle === "geschätzt" ? " · Maße geschätzt" : "") + (M.zelt && num(M.zelt.norden_grad) != null ? " · " + TEXT.norden + " " + zahl(M.zelt.norden_grad) + "° zur Längsachse" : "");
    h += karte(TEXT.szenen, zeltHint, sh);
    h += karte(TEXT.notizen, "", t.notiz ? "<div>" + esc(txt(t.notiz, 2000)) + "</div>" : '<div class="vb-leer">' + esc(TEXT.notizLeer) + "</div>");
    return { html: h, tag: akt, szene: sAkt };
  }

  /* ---------- Panel »Alle Bildideen« ---------- */
  function panelAnsicht(M, z) {
    var f = z.filter, tage = tageGeordnet(M), namen = tagNamen(M), darf = !!(z.recht && z.recht.darf);
    var alle = ideenVon(M).filter(function (x) {
      var d = x.v; if (f.tag && (d.tag || "") !== f.tag) return false; if (f.herkunft && d.herkunft !== f.herkunft) return false; if (f.zustand && d.zustand !== f.zustand) return false;
      if (f.mitBild && !liste(d.bilder).some(function (bid) { var b = M.bild[bid]; return b && !(z.previsAus && istPrevis(b)); })) return false;
      return true;
    });
    function opt(wert, text, akt) { return '<option value="' + esc(wert) + '"' + (wert === akt ? " selected" : "") + ">" + esc(text) + "</option>"; }
    var h = '<div class="vb-filter"><label>' + esc(TEXT.filterTag) + ' <select data-vb-filter="tag">' + opt("", TEXT.alle, f.tag) + tage.map(function (t) { return opt(t.id, namen[t.id] + " · " + datumText(t.v), f.tag); }).join("") + "</select></label>" +
      "<label>" + esc(TEXT.filterHer) + ' <select data-vb-filter="herkunft">' + opt("", TEXT.alle, f.herkunft) + HERKUNFT.map(function (x) { return opt(x, x, f.herkunft); }).join("") + "</select></label>" +
      "<label>" + esc(TEXT.filterZu) + ' <select data-vb-filter="zustand">' + opt("", TEXT.alle, f.zustand) + Object.keys(ZUSTAND).map(function (x) { return opt(x, ZUSTAND[x], f.zustand); }).join("") + "</select></label>" +
      '<label class="vb-schalter vb-mitbild"><input type="checkbox" data-vb-filter="mitBild"' + (f.mitBild ? " checked" : "") + "> " + esc(TEXT.mitBild) + "</label>" + (darf ? knopf("idee-neu", TEXT.neuIdee, ' data-vb-fuer="' + esc(f.tag || "") + '"') : "") + previsSchalter(z.previsAus) + "</div>";
    h += '<div class="vb-zaehler">' + ARTEN.map(function (a) {
      var n = alle.filter(function (x) { return x.v.art === a.k; }), g = n.filter(function (x) { return x.v.zustand === "gedreht"; });
      return '<div class="' + (n.length ? "" : "vb-leerart") + '"><b>' + n.length + "</b><span>" + esc(a.n + TEXT.davon + g.length + TEXT.gedrehtZ) + "</span></div>";
    }).join("") + "</div>";
    h += '<div class="vb-panel">' + ARTEN.map(function (a) {
      var n = alle.filter(function (x) { return x.v.art === a.k; });
      return '<details class="vb-spalte" open><summary>' + esc(a.n) + ' <span class="vb-anz">' + n.length + "</span></summary>" + (n.length ? n.map(function (x) {
        var d = x.v, t = d.tag ? M.tag[d.tag] : null, her = HERKUNFT.indexOf(d.herkunft) !== -1 ? d.herkunft : "", zu = ZUSTAND[d.zustand] ? d.zustand : "offen";
        var erstes = liste(d.bilder).map(function (bid) { return bildVon(M, bid); }).filter(function (b) { return b && !(z.previsAus && istPrevis(b.v)); })[0];
        return '<div class="vb-mini' + (her === "Claude" ? " vb-claude" : "") + '" data-idee="' + esc(x.id) + '">' + (erstes ? bildHtml(erstes.id, erstes.v, { knopf: true, M: M }) : "") +
          '<button type="button" class="vb-minitxt" data-vb-spring="' + esc(x.id) + '" data-vb-springtag="' + esc(d.tag || "") + '"><span class="vb-t">' + esc(txt(d.titel, 80)) + '</span><span class="vb-meta">' +
          esc(t ? namen[d.tag] || datumText(t) : TEXT.allgemein) + (her ? ' <span class="vb-chip vb-chip-' + her + '">' + her + "</span>" : "") + '<span class="vb-zustand vb-z-' + zu + '">' + esc(ZUSTAND[zu]) + "</span></span></button>" + (darf ? ideeKnoepfe(x, z.recht).replace('class="vb-knoepfe"', 'class="vb-knoepfe vb-miniknoepfe"') : "") + "</div>";
      }).join("") : '<div class="vb-leer">' + esc(TEXT.keine) + "</div>") + "</details>";
    }).join("") + "</div>";
    return h;
  }

  /* ---------- Großansicht ---------- */
  function grossHtml(id, b, M) {
    var unter = [kennzeichen(b, M)];
    if (istPrevis(b) && b.prompt) unter.push("Prompt: " + txt(b.prompt, 400));
    if (b.quelle === "still") unter.push([txt(b.clip, 40), b.board ? "Board " + txt(b.board, 60) : ""].filter(Boolean).join(" · "));
    return '<div class="vb-grosskarte"><div class="vb-grossbar"><span>' + esc(TEXT.grossLabel) + '</span><button type="button" class="vb-grosszu" data-vb-zu>' + esc(TEXT.grossZu) + "</button></div>" +
      bildHtml(id, b, { gross: true, M: M }) + '<p class="vb-grossunter">' + esc(unter.filter(Boolean).join(" · ")) + "</p></div>";
  }

  /* ---------- Eingeben: Formulare (HTML) und Prüfung der Eingaben (reine Funktionen, Prüfzugang LEITSTAND_VISION.eingeben) ----------
     Jedes Formular liefert beim Absenden werte = { feld: "Text", …, zeilen: { kameras: [{ feld: "Text" }], … } } (formWerte). Die Prüfung
     macht daraus { fehler: [Text], daten: {…} }; geschrieben wird nur bei leerer Fehlerliste. Zahlen nehmen Komma oder Punkt. */
  function feld(name, label, wert, opt) {
    opt = opt || {}; var id = "vbf-" + name, art = opt.art || "text", attr = (opt.max ? ' maxlength="' + opt.max + '"' : "") + (opt.pflicht ? " required" : "") + (opt.aus ? " disabled" : "");
    var f = art === "textarea" ? '<textarea id="' + id + '" name="' + name + '" rows="' + (opt.zeilen || 3) + '"' + attr + ">" + esc(wert == null ? "" : wert) + "</textarea>"
      : art === "select" ? '<select id="' + id + '" name="' + name + '"' + attr + ">" + opt.wahl.map(function (w) { return '<option value="' + esc(w[0]) + '"' + (String(w[0]) === String(wert == null ? "" : wert) ? " selected" : "") + ">" + esc(w[1]) + "</option>"; }).join("") + "</select>"
      : '<input id="' + id + '" name="' + name + '" type="' + (art === "zahl" ? "text" : art) + '"' + (art === "zahl" ? ' inputmode="decimal"' : "") + ' value="' + esc(wert == null ? "" : art === "zahl" ? zahl(wert).replace("–", "") : wert) + '"' + attr + ">";
    return '<label class="vb-feld' + (opt.breit ? " vb-feld-breit" : "") + '" for="' + id + '"><span>' + esc(label) + (opt.pflicht ? " *" : "") + "</span>" + f + (opt.hint ? '<small>' + esc(opt.hint) + "</small>" : "") + "</label>";
  }
  /* Spalten der Zeilen (Grundriss-Objekte, Kameras, Lampen, Lichtformer): [schlüssel, Beschriftung, art, max] */
  var SPALTEN = {
    objekte: [["art", "Art", "objektart"], ["name", "Name", "text", 40], ["x", "x m", "zahl"], ["y", "y m", "zahl"], ["b", "Breite m", "zahl"], ["l", "Länge m", "zahl"], ["drehung", "Drehung °", "zahl"]],
    kameras: [["name", "Name", "text", 12], ["x", "x m", "zahl"], ["y", "y m", "zahl"], ["richtung", "Richtung °", "zahl"], ["brennweite_mm", "Brennweite mm", "zahl"], ["hoehe_m", "Höhe m", "zahl"], ["notiz", "Notiz", "text", 200]],
    lampen: [["geraet", "Gerät", "geraet", 12], ["x", "x m", "zahl"], ["y", "y m", "zahl"], ["richtung", "Richtung °", "zahl"], ["hoehe_m", "Höhe m", "zahl"], ["kelvin", "Kelvin", "zahl"], ["leistung", "Leistung", "text", 20], ["notiz", "Notiz", "text", 200]],
    former: [["art", "Art", "text", 60], ["x", "x m", "zahl"], ["y", "y m", "zahl"], ["richtung", "Richtung °", "zahl"], ["zu_lampe", "an Lampe", "text", 12], ["notiz", "Notiz", "text", 200]]
  };
  var ZEILEN_NAME = { objekte: "Objekte im Zelt", kameras: "Kameras", lampen: "Lampen", former: "Lichtformer" };
  function zeileHtml(gruppe, z) {
    z = obj(z) || {};
    return '<div class="vb-zeile" data-vb-zeile="' + gruppe + '">' + SPALTEN[gruppe].map(function (sp) {
      var k = sp[0], w = z[k], f;
      if (sp[2] === "objektart") f = '<select data-f="art">' + OBJEKT_ARTEN.map(function (a) { return '<option value="' + a.k + '"' + (a.k === w ? " selected" : "") + ">" + esc(a.n) + "</option>"; }).join("") + "</select>";
      else f = '<input data-f="' + k + '" type="text"' + (sp[2] === "zahl" ? ' inputmode="decimal"' : "") + (sp[3] ? ' maxlength="' + sp[3] + '"' : "") + (sp[2] === "geraet" ? ' list="vbf-geraete"' : "") +
        ' value="' + esc(w == null ? "" : sp[2] === "zahl" ? zahl(w).replace("–", "") : txt(w)) + '">';
      return '<label class="vb-zfeld"><span>' + esc(sp[1]) + "</span>" + f + "</label>";
    }).join("") + '<button type="button" class="vb-zeileweg" data-vb-zeileweg aria-label="' + esc(TEXT.zeileWeg) + '">×</button></div>';
  }
  function zeilenBlock(gruppe, werte) {
    return '<fieldset class="vb-zeilen"><legend>' + esc(ZEILEN_NAME[gruppe]) + '</legend><div data-vb-zeilen="' + gruppe + '">' + liste(werte).map(function (z) { return zeileHtml(gruppe, z); }).join("") +
      '</div><button type="button" class="vb-aktion" data-vb-zeileneu="' + gruppe + '">' + esc(TEXT.zeileNeu) + "</button></fieldset>";
  }
  function tagWahl(M, mitAllgemein) {
    var namen = tagNamen(M);
    return (mitAllgemein ? [["", TEXT.allgemein]] : []).concat(tageGeordnet(M).map(function (x) { return [x.id, namen[x.id] + " · " + datumText(x.v)]; }));
  }
  var STANDORT_HTML = function () { return '<p class="vb-standort">' + esc(TEXT.standort) + "</p>"; };
  function formIdee(M, d, fuer) {
    d = obj(d) || {}; var neu = !d.titel && !d.art;
    return STANDORT_HTML() +
      feld("art", "Art", d.art || "licht", { art: "select", wahl: ARTEN.map(function (a) { return [a.k, a.n]; }), pflicht: true }) +
      feld("titel", "Titel", d.titel, { pflicht: true, max: 80, breit: true }) +
      feld("text", "Text", d.text, { art: "textarea", max: 1000, breit: true, zeilen: 4 }) +
      feld("tag", "Drehtag", d.tag !== undefined ? d.tag || "" : fuer || "", { art: "select", wahl: tagWahl(M, true) }) +
      feld("zustand", "Zustand", neu ? "offen" : d.zustand, { art: "select", wahl: IDEE_ZUSTAENDE.map(function (k) { return [k, ZUSTAND[k]]; }) }) +
      feld("prio", "Wichtigkeit", d.prio == null ? "" : d.prio, { art: "select", wahl: [["", "–"], ["1", "1 hoch"], ["2", "2"], ["3", "3 niedrig"]] });
  }
  function formTag(M, d, id) {
    d = obj(d) || {}; var namen = tagNamen(M), vorschau = id && namen[id] ? namen[id] : naechsterName(M);
    return STANDORT_HTML() +
      feld("datum", "Datum", d.datum, { art: "date", pflicht: true }) + feld("datum_bis", "bis (bei mehreren Tagen)", d.datum_bis, { art: "date" }) +
      feld("zustand", "Zustand", d.zustand || "geplant", { art: "select", wahl: Object.keys(TAG_ZUSTAND).map(function (k) { return [k, TAG_ZUSTAND[k]]; }) }) +
      feld("kennung", TEXT.kennungGedreht, d.zustand === "gedreht" ? d.kennung : "", { max: 20, hint: TEXT.kennungAuto + vorschau }) +
      feld("vorhaben", "Vorhaben", d.vorhaben, { max: 300, breit: true }) +
      feld("beschreibung", "Was inhaltlich geplant ist", d.beschreibung, { art: "textarea", max: 2000, breit: true, zeilen: 4 }) +
      feld("notiz", "Notizen zum Tag", d.notiz, { art: "textarea", max: 2000, breit: true });
  }
  function formSzene(M, d, fuer) {
    d = obj(d) || {};
    var ger = M.geraete ? liste(M.geraete.lampen).map(obj).filter(Boolean).map(function (g) { return '<option value="' + esc(txt(g.kennung, 12)) + '">' + esc(txt(g.typ, 60)) + "</option>"; }).join("") : "";
    return STANDORT_HTML() + '<p class="vb-hint">' + esc(TEXT.richtungHint) + "</p>" +
      feld("tag", "Drehtag", d.tag || fuer || "", { art: "select", wahl: tagWahl(M, false), pflicht: true }) +
      feld("titel", "Titel", d.titel, { pflicht: true, max: 60 }) + feld("tageszeit", "Tageszeit", d.tageszeit, { max: 30 }) +
      feld("absicht", "Absicht", d.absicht, { max: 300, breit: true }) +
      '<datalist id="vbf-geraete">' + ger + "</datalist>" +
      zeilenBlock("kameras", d.kameras) + zeilenBlock("lampen", d.lampen) + zeilenBlock("former", d.former);
  }
  function formZelt(Z) {
    Z = obj(Z) || {};
    return STANDORT_HTML() + '<p class="vb-hint">' + esc(TEXT.richtungHint) + "</p>" +
      feld("laenge_m", "Länge m (x)", Z.laenge_m, { art: "zahl", pflicht: true }) + feld("breite_m", "Breite m (y)", Z.breite_m, { art: "zahl", pflicht: true }) +
      feld("firsthoehe_m", "Firsthöhe m", Z.firsthoehe_m, { art: "zahl" }) +
      feld("norden_grad", TEXT.norden + " °", Z.norden_grad, { art: "zahl", hint: TEXT.nordenHint, breit: true }) +
      feld("quelle", "Maße", Z.quelle || "geschätzt", { art: "select", wahl: [["geschätzt", "geschätzt"], ["gemessen", "gemessen"]] }) +
      feld("gemessen_am", "gemessen am", Z.gemessen_am, { art: "date" }) +
      zeilenBlock("objekte", Z.objekte);
  }
  function naechsterName(M) {   // Name, den ein neu angelegter geplanter Tag ohne Datum-Vorrang bekäme (nur Vorschau im Formular)
    var M2 = { tag: Object.assign({}, M.tag), standTage: M.standTage };
    M2.tag["vt-neu"] = { zustand: "geplant", datum: "9999-12-31", kennung: "" };
    return tagNamen(M2)["vt-neu"];
  }

  /* Prüfung */
  function zahlAus(v) { if (typeof v === "number") return isFinite(v) ? v : NaN; var s = String(v == null ? "" : v).trim().replace(",", "."); if (s === "") return null; return /^-?\d+(\.\d+)?$/.test(s) ? +s : NaN; }
  function textAus(v, max) { return String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim().slice(0, max); }
  function datumAus(v) { var s = String(v == null ? "" : v).trim(); if (s === "") return null; var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return NaN; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? s : NaN; }
  function pruefer() {
    var fehler = [];
    function zahlFeld(name, v, opt) {
      var n = zahlAus(v); opt = opt || {};
      if (n === null) { if (opt.pflicht) fehler.push(name + ": fehlt."); return null; }
      if (isNaN(n)) { fehler.push(name + ": keine Zahl."); return null; }
      if ((opt.min != null && n < opt.min) || (opt.max != null && n > opt.max) || (opt.groesser != null && !(n > opt.groesser))) {
        fehler.push(name + ": " + (opt.groesser != null ? "größer als " + opt.groesser + (opt.max != null ? " und höchstens " + opt.max : "") : "zwischen " + opt.min + " und " + opt.max) + "."); return null;
      }
      return n;
    }
    function winkel(name, v, pflicht) { var n = zahlFeld(name, v, { pflicht: pflicht, min: -360, max: 360 }); return n == null ? null : ((n % 360) + 360) % 360; }   // auf 0 … < 360
    return { fehler: fehler, zahl: zahlFeld, winkel: winkel };
  }
  function pruefeIdee(w, M) {
    var P = pruefer(), d = {};
    d.art = ARTEN.some(function (a) { return a.k === w.art; }) ? w.art : (P.fehler.push("Art: eine der fünf wählen."), null);
    d.titel = textAus(w.titel, 80); if (!d.titel) P.fehler.push("Titel: fehlt.");
    d.text = textAus(w.text, 1000);
    d.tag = w.tag ? String(w.tag) : null; if (d.tag && !(M && M.tag[d.tag])) P.fehler.push("Drehtag: unbekannt.");
    d.zustand = IDEE_ZUSTAENDE.indexOf(w.zustand) !== -1 ? w.zustand : (P.fehler.push("Zustand: ungültig."), null);
    d.prio = w.prio === "" || w.prio == null ? null : ["1", "2", "3"].indexOf(String(w.prio)) !== -1 ? +w.prio : (P.fehler.push("Wichtigkeit: 1 bis 3."), null);
    return { fehler: P.fehler, daten: d };
  }
  function pruefeTag(w, auto) {   // auto: Name, den der Tag gerade trägt (»DT12 (geplant)«) — wird beim Wechsel auf »gedreht« zur Kennung, wenn keine eingetragen ist
    var P = pruefer(), d = {};
    var da = datumAus(w.datum), bis = datumAus(w.datum_bis);
    if (da === null) P.fehler.push("Datum: fehlt."); else if (typeof da !== "string") P.fehler.push("Datum: ungültig.");
    if (bis !== null && typeof bis !== "string") P.fehler.push("bis: ungültig."); else if (typeof bis === "string" && typeof da === "string" && bis < da) P.fehler.push("bis: liegt vor dem Datum.");
    d.datum = typeof da === "string" ? da : null; d.datum_bis = typeof bis === "string" && bis !== da ? bis : null;
    d.zustand = TAG_ZUSTAND[w.zustand] ? w.zustand : (P.fehler.push("Zustand: ungültig."), null);
    var k = textAus(w.kennung, 20), ak = /^DT\d+/.exec(txt(auto));
    if (d.zustand === "gedreht" && !k && ak) k = ak[0];
    if (d.zustand === "gedreht") { if (!k) P.fehler.push("Kennung: bei »gedreht« nötig (z. B. DT12)."); else if (dtNummer(k) == null) P.fehler.push("Kennung: beginnt mit DT und einer Nummer."); d.kennung = k; }
    else d.kennung = "";   // F13: geplante und verschobene Tage heißen automatisch »DTxx (geplant)«
    d.vorhaben = textAus(w.vorhaben, 300); d.beschreibung = textAus(w.beschreibung, 2000); d.notiz = textAus(w.notiz, 2000);
    return { fehler: P.fehler, daten: d };
  }
  function imZelt(P, name, x, y, Z) {
    var L = Z ? num(Z.laenge_m) : null, B = Z ? num(Z.breite_m) : null;
    if (x != null && y != null && L > 0 && B > 0 && (x > L || y > B)) P.fehler.push(name + ": liegt außerhalb des Zelts (" + zahl(L) + " × " + zahl(B) + " m).");
  }
  function zeilenPruefen(P, gruppe, zeilen, Z) {
    return liste(zeilen).map(obj).filter(function (z) { return z && Object.keys(z).some(function (k) { return k !== "art" && String(z[k] == null ? "" : z[k]).trim() !== ""; }); }).map(function (z, i) {
      var n = ZEILEN_NAME[gruppe] + " " + (i + 1), o = {};
      SPALTEN[gruppe].forEach(function (sp) {
        var k = sp[0];
        if (sp[2] === "objektart") o[k] = OBJEKT_ARTEN.some(function (a) { return a.k === z[k]; }) ? z[k] : "anderes";
        else if (sp[2] !== "zahl") { var t = textAus(z[k], sp[3] || 60); if (t || k === "name" || k === "zu_lampe") o[k] = t; }
      });
      o.x = P.zahl(n + " x", z.x, { pflicht: true, min: 0, max: 200 }); o.y = P.zahl(n + " y", z.y, { pflicht: true, min: 0, max: 200 });
      if (gruppe === "objekte") { o.b = P.zahl(n + " Breite", z.b, { pflicht: true, groesser: 0, max: 200 }); o.l = P.zahl(n + " Länge", z.l, { pflicht: true, groesser: 0, max: 200 }); o.drehung = P.winkel(n + " Drehung", z.drehung) || 0; }
      else o.richtung = P.winkel(n + " Richtung", z.richtung, true);
      if (gruppe === "kameras") { o.brennweite_mm = P.zahl(n + " Brennweite", z.brennweite_mm, { min: 1, max: 2000 }); o.hoehe_m = P.zahl(n + " Höhe", z.hoehe_m, { min: 0, max: 30 }); if (!o.name) o.name = "K" + (i + 1); }
      if (gruppe === "lampen") { o.hoehe_m = P.zahl(n + " Höhe", z.hoehe_m, { min: 0, max: 30 }); o.kelvin = P.zahl(n + " Kelvin", z.kelvin, { min: 1000, max: 20000 }); if (!o.geraet) P.fehler.push(n + " Gerät: fehlt."); }
      if (gruppe === "former" && !o.art) P.fehler.push(n + " Art: fehlt.");
      if (gruppe !== "objekte") imZelt(P, n, o.x, o.y, Z);
      Object.keys(o).forEach(function (k) { if (o[k] === null || o[k] === "") delete o[k]; });
      return o;
    });
  }
  function pruefeSzene(w, M) {
    var P = pruefer(), d = {}, z = obj(w.zeilen) || {};
    d.tag = w.tag && M && M.tag[w.tag] ? String(w.tag) : (P.fehler.push("Drehtag: wählen."), null);
    d.titel = textAus(w.titel, 60); if (!d.titel) P.fehler.push("Titel: fehlt.");
    d.tageszeit = textAus(w.tageszeit, 30); d.absicht = textAus(w.absicht, 300);
    d.kameras = zeilenPruefen(P, "kameras", z.kameras, M && M.zelt); d.lampen = zeilenPruefen(P, "lampen", z.lampen, M && M.zelt); d.former = zeilenPruefen(P, "former", z.former, M && M.zelt);
    return { fehler: P.fehler, daten: d };
  }
  function pruefeZelt(w) {
    var P = pruefer(), d = {}, z = obj(w.zeilen) || {};
    d.laenge_m = P.zahl("Länge", w.laenge_m, { pflicht: true, groesser: 0, max: 200 }); d.breite_m = P.zahl("Breite", w.breite_m, { pflicht: true, groesser: 0, max: 200 });
    d.firsthoehe_m = P.zahl("Firsthöhe", w.firsthoehe_m, { min: 0, max: 50 });
    d.norden_grad = P.winkel(TEXT.norden, w.norden_grad, false);
    d.quelle = w.quelle === "gemessen" ? "gemessen" : "geschätzt";
    var gm = datumAus(w.gemessen_am); if (gm !== null && typeof gm !== "string") P.fehler.push("gemessen am: ungültig."); d.gemessen_am = typeof gm === "string" ? gm : null;
    d.objekte = zeilenPruefen(P, "objekte", z.objekte, null);
    if (d.laenge_m && d.breite_m) d.objekte.forEach(function (o, i) { imZelt(P, ZEILEN_NAME.objekte + " " + (i + 1), o.x, o.y, d); });
    return { fehler: P.fehler, daten: d };
  }
  /* Rechte (Seite; die Datenbank-Regel prüft am Server noch einmal): ich = Kürzel LES/JB aus der Anmeldung, sonst kein Schreiben */
  function rechte(EINS, cl) {
    var r = { darf: false, ich: null, grund: "" };
    if (!EINS.an || !EINS.schreiben || !cl) return r;
    var ro = typeof cl.rolle === "function" ? cl.rolle() : null, gast = typeof cl.istGast === "function" ? cl.istGast() : false;
    if (!ro || ro.rolle !== "admin" || gast) return r;
    var k = typeof cl.kuerzel === "function" ? cl.kuerzel() : null;
    if (EDITOREN.indexOf(k) === -1) { r.grund = TEXT.nurKuerzel; return r; }
    r.darf = true; r.ich = k; return r;
  }
  function kannEntscheiden(idee, r) { return !!(r && r.darf && idee && idee.zustand === "vorschlag"); }
  function kannBearbeiten(idee, r) { return !!(r && r.darf && idee && idee.zustand !== "vorschlag"); }
  function kannLoeschen(idee, r) { return !!(r && r.darf && idee && idee.herkunft === r.ich); }
  function stempel(d, ich, jetzt, neu) { d.updated = jetzt; d.updated_by = ich; if (neu) { d.schema = 1; d.created = jetzt; } return d; }
  function hexId(n) { var a = new Uint8Array(n), c = window.crypto; if (c && c.getRandomValues) c.getRandomValues(a); else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); return Array.prototype.map.call(a, function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join(""); }
  function uuid() { var c = window.crypto; if (c && typeof c.randomUUID === "function") return c.randomUUID(); var x = hexId(16); return x.slice(0, 8) + "-" + x.slice(8, 12) + "-4" + x.slice(13, 16) + "-8" + x.slice(17, 20) + "-" + x.slice(20, 32); }
  function neueKennung(art) { return art === "vt" ? "vt-" + hexId(8) : art + "-" + uuid(); }

  /* ---------- Eingeben: Schreiben (W = Datenbank-Schicht der Seite, leitstand-db.js) ----------
     Jede Aktion gibt ein Promise auf { ok: true, id } oder { fehler: [Text] } zurück, nie eine Ausnahme. Neu: doc(id).set(ganzer Eintrag);
     Ändern: doc(id).update(nur die Felder des Formulars) — docs_patch fügt sie oben in den Eintrag ein, Bilder, Bezüge, Herkunft und Begründung
     bleiben unberührt. Wer zuletzt speichert, gewinnt (wie überall im Board). */
  function schreibAuf(p, id) {
    return Promise.resolve(p).then(function (x) { return x && x.geloescht === 0 ? { fehler: [TEXT.nichtGeloescht] } : { ok: true, id: id }; },
      function (e) { return { fehler: [TEXT.nichtGespeichert + String(e && e.message ? e.message : e || "unbekannt").slice(0, 200)] }; });
  }
  function nein(t) { return Promise.resolve({ fehler: [t] }); }
  function aktionen(W, M, r, jetzt) {
    jetzt = jetzt || new Date().toISOString();
    function dok(s, id) { return W.collection(s).doc(id); }
    function bereit() { return !!(r && r.darf && W && typeof W.collection === "function"); }
    return {
      idee: function (id, werte) {
        if (!bereit()) return nein(TEXT.nurKuerzel);
        if (id && !kannBearbeiten(M.idee[id], r)) return nein(M.idee[id] ? TEXT.vorschlagErst : "Idee: nicht mehr da.");
        var p = pruefeIdee(werte, M); if (p.fehler.length) return Promise.resolve({ fehler: p.fehler });
        if (id) return schreibAuf(dok("vision_idee", id).update(stempel(p.daten, r.ich, jetzt)), id);
        var nid = neueKennung("vi"), d = stempel(p.daten, r.ich, jetzt, true); d.herkunft = r.ich; d.bilder = [];
        return schreibAuf(dok("vision_idee", nid).set(d), nid);
      },
      ideeLoeschen: function (id) {
        if (!bereit()) return nein(TEXT.nurKuerzel);
        if (!kannLoeschen(M.idee[id], r)) return nein(TEXT.nichtGeloescht);
        return schreibAuf(dok("vision_idee", id).delete(), id);
      },
      entscheiden: function (id, wie) {
        if (!bereit()) return nein(TEXT.nurKuerzel);
        if (wie !== "offen" && wie !== "verworfen") return nein("Entscheidung ungültig.");
        if (!kannEntscheiden(M.idee[id], r)) return nein(TEXT.schonEntschieden);
        return schreibAuf(dok("vision_idee", id).update(stempel({ zustand: wie, entschieden_von: r.ich, entschieden_am: jetzt }, r.ich, jetzt)), id);
      },
      tag: function (id, werte) {
        if (!bereit()) return nein(TEXT.nurKuerzel);
        if (id && !M.tag[id]) return nein("Drehtag: nicht mehr da.");
        var p = pruefeTag(werte, id ? tagNamen(M)[id] : ""); if (p.fehler.length) return Promise.resolve({ fehler: p.fehler });
        if (id) return schreibAuf(dok("vision_tag", id).update(stempel(p.daten, r.ich, jetzt)), id);
        var nid = neueKennung("vt"), d = stempel(p.daten, r.ich, jetzt, true); d.bezuege = [];
        return schreibAuf(dok("vision_tag", nid).set(d), nid);
      },
      szene: function (id, werte) {
        if (!bereit()) return nein(TEXT.nurKuerzel);
        if (id && !M.szene[id]) return nein("Szene: nicht mehr da.");
        var p = pruefeSzene(werte, M); if (p.fehler.length) return Promise.resolve({ fehler: p.fehler });
        if (id) return schreibAuf(dok("vision_szene", id).update(stempel(p.daten, r.ich, jetzt)), id);
        var nid = neueKennung("vs");
        return schreibAuf(dok("vision_szene", nid).set(stempel(p.daten, r.ich, jetzt, true)), nid);
      },
      szeneLoeschen: function (id) {
        if (!bereit()) return nein(TEXT.nurKuerzel);
        if (!M.szene[id]) return nein(TEXT.nichtGeloescht);
        return schreibAuf(dok("vision_szene", id).delete(), id);
      },
      zelt: function (werte) {
        if (!bereit()) return nein(TEXT.nurKuerzel);
        var p = pruefeZelt(werte); if (p.fehler.length) return Promise.resolve({ fehler: p.fehler });
        if (M.zelt) return schreibAuf(dok("vision_zelt", "grundriss").update(stempel(p.daten, r.ich, jetzt)), "grundriss");
        return schreibAuf(dok("vision_zelt", "grundriss").set(stempel(p.daten, r.ich, jetzt, true)), "grundriss");
      }
    };
  }

  /* Werte eines Formulars: benannte Felder außerhalb der Zeilen, dazu je Zeilengruppe eine Liste */
  function formWerte(form) {
    var w = { zeilen: {} };
    Array.prototype.forEach.call(form.querySelectorAll("[name]"), function (el) { if (!el.closest("[data-vb-zeile]")) w[el.name] = el.value; });
    Array.prototype.forEach.call(form.querySelectorAll("[data-vb-zeile]"), function (z) {
      var g = z.getAttribute("data-vb-zeile"), o = {};
      Array.prototype.forEach.call(z.querySelectorAll("[data-f]"), function (el) { o[el.getAttribute("data-f")] = el.value; });
      (w.zeilen[g] = w.zeilen[g] || []).push(o);
    });
    return w;
  }

  /* ---------- Gesamtansicht ---------- */
  function seiteHtml(M, z) {
    var h = '<div class="vb-seite"><header class="vb-head"><h1>' + esc(TEXT.titel) + '</h1><div class="vb-unter">' + esc(TEXT.unter) + "</div>" +
      '<nav class="vb-seg" aria-label="Ansicht"><a href="#vision' + (z.dt ? "?dt=" + encodeURIComponent(z.dt) : "") + '" data-vb-ansicht="tag"' + (z.v !== "panel" ? ' aria-current="page"' : "") + ">" + esc(TEXT.tabTag) + "</a>" +
      '<a href="#vision?v=panel" data-vb-ansicht="panel"' + (z.v === "panel" ? ' aria-current="page"' : "") + ">" + esc(TEXT.tabPanel) + "</a></nav></header>";
    if (M.fehler) h += '<div class="vb-warnung" role="alert">' + esc(TEXT.fehler) + "</div>";
    if (z.recht && z.recht.grund) h += '<div class="vb-leer">' + esc(z.recht.grund) + "</div>";
    h += '<div class="vb-meldung" role="status" aria-live="polite">' + esc(z.meldung || "") + "</div>";
    var voll = Object.keys(M.groesse).some(function (k) { return M.groesse[k] >= GRENZE_WARNEN; });
    if (voll) h += '<div class="vb-warnung" role="status">' + esc(TEXT.voll) + "</div>";
    var geladen = SAMMLUNGEN.every(function (k) { return M.geladen[k]; });
    if (!geladen && !M.fehler) h += '<div class="vb-leer">' + esc(TEXT.laedt) + "</div>";
    var r = null;
    if (z.v === "panel") h += '<div class="vb-ansicht" data-ansicht="panel">' + panelAnsicht(M, z) + "</div>";
    else { r = tagAnsicht(M, z); h += '<div class="vb-ansicht" data-ansicht="tag">' + r.html + "</div>"; }
    return { html: h + "</div>", tag: r ? r.tag : null, szene: r ? r.szene : null };
  }

  /* ---------- Gast-Block (Vorschlag F6) ---------- */
  function gastBlockHtml(eintraege) {
    var ids = Object.keys(eintraege).filter(function (id) { return obj(eintraege[id]); }).sort(function (a, b) { return txt(eintraege[a].freigegeben_am) < txt(eintraege[b].freigegeben_am) ? 1 : -1; });
    if (!ids.length) return "";
    return '<section class="card vb-gast" id="vbGast"><h2>' + esc(TEXT.gastTitel) + ' <span class="hint">' + esc(TEXT.gastHint) + '</span></h2><div class="vb-raster">' + ids.map(function (id) {
      var g = eintraege[id], b = { quelle: "previs-ki", signed_url: g.signed_url, signed_url_ablauf: g.signed_url_ablauf, werkzeug: g.werkzeug, erzeugt_am: g.erzeugt_am, platzhalter: g.platzhalter };
      return '<div class="vb-idee">' + bildHtml(id, b, { knopf: true }) + '<div class="vb-txt"><div class="vb-meta"><span class="vb-art">' + esc(artName(g.art)) + "</span>" + esc(txt(g.tag_kennung, 30)) +
        '</div><div class="vb-t">' + esc(txt(g.titel, 80)) + "</div></div></div>";
    }).join("") + "</div></section>";
  }

  /* ---------- Steuerung (Browser) ---------- */
  function previsAusGemerkt() { try { return localStorage.getItem(SPEICHER_PREVIS) === "1"; } catch (e) { return false; } }
  function hashTeile() {
    var hs = String(location.hash || "").replace(/^#/, ""), qi = hs.indexOf("?"), seite = qi >= 0 ? hs.slice(0, qi) : hs, q = {};
    if (qi >= 0) hs.slice(qi + 1).split("&").forEach(function (p) { var i = p.indexOf("="); if (i > 0) { try { q[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); } catch (e) {} } });
    return { seite: seite, q: q };
  }
  var grossOffen = null;
  function grossZeigen(html, zurueck) {
    grossSchliessen();
    var el = document.createElement("div"); el.className = "vb-gross"; el.id = "vbGross";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", TEXT.grossLabel);
    el.innerHTML = html; document.body.appendChild(el);
    grossOffen = { el: el, zurueck: zurueck };
    el.addEventListener("click", function (ev) { if (ev.target === el || (ev.target.closest && ev.target.closest("[data-vb-zu]"))) grossSchliessen(); });
    var zu = el.querySelector("[data-vb-zu]"); if (zu) zu.focus();
  }
  function grossSchliessen() {
    if (!grossOffen) return; var g = grossOffen; grossOffen = null;
    if (g.el.parentNode) g.el.parentNode.removeChild(g.el);
    if (g.zurueck && g.zurueck.focus && document.contains(g.zurueck)) { try { g.zurueck.focus(); } catch (e) {} }
  }
  /* Formular-Dialog (Eingeben): schließt mit »abbrechen« oder Esc, nicht durch Klick daneben (sonst gingen Eingaben verloren) */
  var formOffen = null;
  function formZeigen(titel, inhalt, senden, zurueck, danach, melde) {
    grossSchliessen(); formSchliessen();
    var el = document.createElement("div"); el.className = "vb-gross vb-formhuelle"; el.id = "vbForm";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "vbFormTitel");
    el.innerHTML = '<form class="vb-grosskarte vb-formular" novalidate><div class="vb-grossbar"><h2 id="vbFormTitel">' + esc(titel) + '</h2><button type="button" class="vb-grosszu" data-vb-zu>' + esc(TEXT.abbrechen) + "</button></div>" +
      '<div class="vb-felder">' + inhalt + '</div><div class="vb-formfehler" role="alert" tabindex="-1"></div><div class="vb-formknoepfe"><button type="submit" class="vb-speichern">' + esc(TEXT.speichern) +
      '</button><button type="button" class="vb-grosszu" data-vb-zu>' + esc(TEXT.abbrechen) + "</button></div></form>";
    document.body.appendChild(el);
    var form = el.querySelector("form"), box = el.querySelector(".vb-formfehler"), knopfS = el.querySelector(".vb-speichern"), laeuft = false;
    formOffen = { el: el, zurueck: zurueck };
    el.addEventListener("click", function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null; if (!t) return; var b;
      if (t.closest("[data-vb-zu]")) { formSchliessen(); return; }
      if ((b = t.closest("[data-vb-zeileneu]"))) {
        var g = b.getAttribute("data-vb-zeileneu"), c = el.querySelector('[data-vb-zeilen="' + g + '"]'); if (!c || !SPALTEN[g]) return;
        c.insertAdjacentHTML("beforeend", zeileHtml(g)); var neu = c.lastElementChild && c.lastElementChild.querySelector("input, select"); if (neu) neu.focus(); return;
      }
      if ((b = t.closest("[data-vb-zeileweg]"))) { var z = b.closest("[data-vb-zeile]"); if (z && z.parentNode) { var fs = z.closest("fieldset"); z.parentNode.removeChild(z); var n = fs && fs.querySelector("[data-vb-zeileneu]"); if (n) n.focus(); } }
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault(); if (laeuft) return; laeuft = true;
      knopfS.disabled = true; knopfS.textContent = TEXT.speichert; box.innerHTML = "";
      senden(formWerte(form)).then(function (res) {
        laeuft = false; knopfS.disabled = false; knopfS.textContent = TEXT.speichern;
        if (res && res.fehler && res.fehler.length) { box.innerHTML = "<b>" + esc(TEXT.fehlerTitel) + "</b><ul>" + res.fehler.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>"; try { box.focus(); } catch (e) {} return; }
        formSchliessen(); if (melde) melde(TEXT.gespeichert); if (danach) danach(res || {});
      });
    });
    var erstes = el.querySelector(".vb-felder input:not([disabled]), .vb-felder select, .vb-felder textarea"); if (erstes) erstes.focus();
  }
  function formSchliessen() {
    if (!formOffen) return; var f = formOffen; formOffen = null;
    if (f.el.parentNode) f.el.parentNode.removeChild(f.el);
    if (f.zurueck && f.zurueck.focus && document.contains(f.zurueck)) { try { f.zurueck.focus(); } catch (e) {} }
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (formOffen) { ev.preventDefault(); formSchliessen(); } else if (grossOffen) { ev.preventDefault(); grossSchliessen(); }
  });

  var lauf = null;
  function starteVision(ziel, db) {
    abmeldenVision();
    if (!ziel) return null;
    var L = { ziel: ziel, M: leeresModell(), abos: [], aus: false, uhr: null, W: null, meldeUhr: null,
      z: { v: "tag", dt: null, szene: null, idee: null, previsAus: previsAusGemerkt(), filter: { tag: "", herkunft: "", zustand: "", mitBild: false } } };
    lauf = L;
    function ausHash() { var t = hashTeile(); if (t.seite !== SEITE) return false; L.z.v = t.q.v === "panel" ? "panel" : "tag"; if (t.q.dt) L.z.dt = t.q.dt; L.z.idee = t.q.idee || null; return true; }
    function recht() { return L.W ? rechte(EIN, window.claude) : { darf: false, ich: null, grund: "" }; }
    function zeichnen() {
      L.uhr = null; if (L.aus) return;
      L.z.recht = recht();
      var y = window.scrollY, r = seiteHtml(L.M, L.z);
      // ein gerade angelegter Tag / eine gerade angelegte Szene ist noch nicht zurück aus der Datenbank: Wunsch stehen lassen, bis sie da ist
      if (r.tag && (!L.z.dt || L.M.tag[L.z.dt])) L.z.dt = r.tag;
      if (!L.z.szene || L.M.szene[L.z.szene]) L.z.szene = r.szene;
      ziel.innerHTML = r.html;
      if (L.z.idee) {
        var k = ziel.querySelector('[data-idee="' + (window.CSS && CSS.escape ? CSS.escape(L.z.idee) : L.z.idee) + '"]');
        if (k && ziel.classList.contains("on")) { k.classList.add("vb-markiert"); if (k.scrollIntoView) k.scrollIntoView({ block: "center" }); L.z.idee = null; return; }
      }
      if (ziel.classList.contains("on")) window.scrollTo(0, y);
    }
    function bald() { if (!L.uhr) L.uhr = setTimeout(zeichnen, 0); }
    L.zeichnen = bald;
    function melde(t) {
      if (L.aus) return; L.z.meldung = t; zeichnen();
      if (L.meldeUhr) clearTimeout(L.meldeUhr);
      L.meldeUhr = setTimeout(function () { L.meldeUhr = null; if (L.z.meldung === t) { L.z.meldung = ""; bald(); } }, 6000);
    }
    function ergebnis(res) { melde(res && res.fehler ? res.fehler.join(" ") : TEXT.gespeichert); return res; }
    function jetztAktionen() { return aktionen(L.W, L.M, recht()); }
    function aktion(b) {
      var a = b.getAttribute("data-vb-aktion"), id = b.getAttribute("data-vb-id") || null, fuer = b.getAttribute("data-vb-fuer") || "", r = recht(), M = L.M;
      if (!r.darf) { melde(r.grund || TEXT.nurKuerzel); return; }
      if (a === "entscheiden") { b.disabled = true; jetztAktionen().entscheiden(id, b.getAttribute("data-vb-wie")).then(function (x) { b.disabled = false; ergebnis(x); }); return; }
      if (a === "idee-loeschen") { if (!window.confirm(TEXT.loeschenFrage)) return; jetztAktionen().ideeLoeschen(id).then(function (x) { melde(x.fehler ? x.fehler.join(" ") : TEXT.geloescht); }); return; }
      if (a === "szene-loeschen") { if (!window.confirm(TEXT.szeneLoeschenFrage)) return; jetztAktionen().szeneLoeschen(id).then(function (x) { melde(x.fehler ? x.fehler.join(" ") : TEXT.geloescht); }); return; }
      if (a === "idee-neu") formZeigen(TEXT.fIdeeNeu, formIdee(M, {}, fuer), function (w) { return jetztAktionen().idee(null, w); }, b, function (x) { if (x.id) L.z.idee = x.id; }, melde);
      else if (a === "idee-bearbeiten" && M.idee[id]) formZeigen(TEXT.fIdee, formIdee(M, M.idee[id]), function (w) { return jetztAktionen().idee(id, w); }, b, null, melde);
      else if (a === "tag-neu") formZeigen(TEXT.fTagNeu, formTag(M, {}, null), function (w) { return jetztAktionen().tag(null, w); }, b, function (x) { if (x.id) location.hash = "#vision?dt=" + encodeURIComponent(x.id); }, melde);
      else if (a === "tag-bearbeiten" && M.tag[id]) formZeigen(TEXT.fTag, formTag(M, M.tag[id], id), function (w) { return jetztAktionen().tag(id, w); }, b, null, melde);
      else if (a === "szene-neu") formZeigen(TEXT.fSzeneNeu, formSzene(M, {}, fuer), function (w) { return jetztAktionen().szene(null, w); }, b, function (x) { if (x.id) { L.z.szene = x.id; bald(); } }, melde);
      else if (a === "szene-bearbeiten" && M.szene[id]) formZeigen(TEXT.fSzene, formSzene(M, M.szene[id]), function (w) { return jetztAktionen().szene(id, w); }, b, null, melde);
      else if (a === "zelt-bearbeiten") formZeigen(TEXT.fZelt, formZelt(M.zelt), function (w) { return jetztAktionen().zelt(w); }, b, null, melde);
    }
    function klick(ev) {
      var t = ev.target && ev.target.closest ? ev.target : null; if (!t) return;
      var b;
      if ((b = t.closest("[data-vb-aktion]"))) { aktion(b); return; }
      if ((b = t.closest("[data-vb-gross]"))) { var bid = b.getAttribute("data-vb-gross"), bv = L.M.bild[bid]; if (bv) grossZeigen(grossHtml(bid, bv, L.M), b); return; }
      if ((b = t.closest("[data-vb-tag]"))) { location.hash = "#vision?dt=" + encodeURIComponent(b.getAttribute("data-vb-tag")); return; }
      if ((b = t.closest("[data-vb-szene]"))) { L.z.szene = b.getAttribute("data-vb-szene"); zeichnen(); return; }
      if ((b = t.closest("[data-vb-spring]"))) {
        var tg = b.getAttribute("data-vb-springtag"), iid = b.getAttribute("data-vb-spring");
        if (!tg) return;   // allgemeine Idee ohne Drehtag: bleibt im Panel
        location.hash = "#vision?dt=" + encodeURIComponent(tg) + "&idee=" + encodeURIComponent(iid); return;
      }
    }
    function wechsel(ev) {
      var t = ev.target; if (!t || !t.getAttribute) return;
      if (t.hasAttribute("data-vb-previs")) { L.z.previsAus = !!t.checked; try { localStorage.setItem(SPEICHER_PREVIS, L.z.previsAus ? "1" : "0"); } catch (e) {} zeichnen(); return; }
      var f = t.getAttribute("data-vb-filter"); if (f) { L.z.filter[f] = f === "mitBild" ? !!t.checked : t.value; zeichnen(); }
    }
    function hash() { if (ausHash()) zeichnen(); }
    ziel.addEventListener("click", klick); ziel.addEventListener("change", wechsel); window.addEventListener("hashchange", hash);
    L.abmelden = function () {
      L.aus = true; if (L.uhr) clearTimeout(L.uhr);
      L.abos.forEach(function (a) { try { a(); } catch (e) {} }); L.abos = [];
      ziel.removeEventListener("click", klick); ziel.removeEventListener("change", wechsel); window.removeEventListener("hashchange", hash);
      if (L.meldeUhr) clearTimeout(L.meldeUhr);
      grossSchliessen(); formSchliessen(); ziel.innerHTML = "";
    };
    ausHash(); zeichnen();
    SAMMLUNGEN.concat(["boards"]).forEach(function (name) {
      try {
        var abo = db.collection(name).onSnapshot(function (snap) { if (L.aus) return; uebernehme(L.M, name, snap); bald(); }, function () { if (L.aus || name === "boards") return; L.M.fehler = true; bald(); });
        if (typeof abo === "function") L.abos.push(abo);
      } catch (e) { L.M.fehler = true; bald(); }
    });
    /* Datenbank-Schicht der Seite zum Schreiben und für stand/projekt — erst jetzt (die Seite hat das Vision Board als Admin gestartet), nie für Gäste */
    var cl = window.claude;
    if (cl && typeof cl.use === "function") {
      try {
        Promise.resolve(cl.use("db")).then(function (d) {
          var ro = typeof cl.rolle === "function" ? cl.rolle() : null;
          if (L.aus || !d || !ro || ro.rolle !== "admin" || (typeof cl.istGast === "function" && cl.istGast())) return;
          L.W = d;
          if (typeof d.doc === "function") {
            try { var a = d.doc("stand/projekt").onSnapshot(function (snap) { if (L.aus) return; standUebernehme(L.M, snap && typeof snap.data === "function" ? snap.data() : null); bald(); }, function () {}); if (typeof a === "function") L.abos.push(a); } catch (e) {}
          }
          bald();
        }, function () {});
      } catch (e) {}
    }
    return L;
  }
  function abmeldenVision() { if (lauf) { var L = lauf; lauf = null; L.abmelden(); } }

  /* Reiter nach »Boards« einordnen (Konzept Abschnitt 7; die Seite hängt ihn sonst hinter »Claude«/»Redaktion«) */
  function einordnen() {
    var a = document.querySelector('#nav a[data-page="' + SEITE + '"]'), b = document.getElementById("navBoards");
    if (a && b && b.parentNode === a.parentNode && b.nextSibling !== a) b.parentNode.insertBefore(a, b.nextSibling);
  }

  /* ---------- Hülle um die Redaktions-Schnittstelle ---------- */
  var R = window.LEITSTAND_REDAKTION;
  var eingehaengt = false;
  if (EIN.an && R && typeof R.reiter === "function" && typeof R.starte === "function" && typeof R.seite === "function" && Array.isArray(R.SEITEN)) {
    var H = {};
    Object.keys(R).forEach(function (k) { H[k] = R[k]; });
    H.SEITEN = R.SEITEN.concat([SEITE]);
    H.reiter = function (opt) { var r = R.reiter(opt) || []; return opt && opt.istGast ? r : r.concat([{ seite: SEITE, name: NAME, ansicht: null }]); };
    H.seite = function (p, opt) { return p === SEITE ? SEITE : R.seite(p, opt); };
    H.starte = function (ziel, db, opt) {
      var g = R.starte(ziel, db, opt) || {};
      abmeldenVision();
      if (!(opt && opt.istGast)) {
        var el = typeof ziel === "function" ? ziel(SEITE) : null; if (el && el.seite) el = el.seite;
        if (el && db && typeof db.collection === "function") starteVision(el, db);
        einordnen();
      }
      return { abmelden: function () { abmeldenVision(); if (g.abmelden) g.abmelden(); }, zeigeAnsicht: function (k) { if (g.zeigeAnsicht) g.zeigeAnsicht(k); },
        ansicht: function () { return g.ansicht ? g.ansicht() : null; }, lage: function () { return g.lage ? g.lage() : "aus"; } };
    };
    H.abmelden = function () { abmeldenVision(); if (R.abmelden) R.abmelden(); };
    window.LEITSTAND_REDAKTION = H;
    eingehaengt = true;
  }

  /* ---------- Gast-Block im Reiter Boards (nur mit EIN.gastPrevis; nur Gäste; nur vision_gast) ---------- */
  var gast = { abo: null, gestartet: false };
  function gastStarten() {
    if (!EIN.gastPrevis || gast.gestartet || !window.claude || typeof window.claude.use !== "function") return;
    gast.gestartet = true;
    window.claude.use("db").then(function (d) {
      var rl = window.claude.rolle ? window.claude.rolle() : null;
      if (!d || !rl || rl.rolle !== "gast") return;
      var host = document.querySelector("#page-boards .grid") || document.getElementById("page-boards"); if (!host) return;
      var platz = document.createElement("div"); platz.id = "vbGastPlatz"; host.appendChild(platz);
      platz.addEventListener("click", function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest("[data-vb-gross]") : null; if (!b) return;
        var g = gast.daten && gast.daten[b.getAttribute("data-vb-gross")]; if (!g) return;
        grossZeigen(grossHtml(b.getAttribute("data-vb-gross"), { quelle: "previs-ki", signed_url: g.signed_url, signed_url_ablauf: g.signed_url_ablauf, werkzeug: g.werkzeug, erzeugt_am: g.erzeugt_am, platzhalter: g.platzhalter }, null), b);
      });
      try {
        gast.abo = d.collection(GAST_SAMMLUNG).onSnapshot(function (snap) { gast.daten = docsAus(snap).eintraege; platz.innerHTML = gastBlockHtml(gast.daten); }, function () { platz.innerHTML = ""; });
      } catch (e) {}
    }, function () {});
  }
  if (EIN.gastPrevis) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", gastStarten); else gastStarten(); }

  /* ---------- Prüfzugang ---------- */
  window.LEITSTAND_VISION = {
    EIN: EIN, SEITE: SEITE, NAME: NAME, SAMMLUNGEN: SAMMLUNGEN.slice(), GAST_SAMMLUNG: GAST_SAMMLUNG, ARTEN: ARTEN, TEXT: TEXT, PREVIS_BAND: PREVIS_BAND,
    eingehaengt: function () { return eingehaengt; },
    modell: { leer: leeresModell, uebernehme: uebernehme, tageGeordnet: tageGeordnet },
    html: { seite: seiteHtml, tag: tagAnsicht, panel: panelAnsicht, gross: grossHtml, bild: bildHtml, karte: ideeKarte, gast: gastBlockHtml, grundriss: grundriss },
    eingeben: { rechte: rechte, aktionen: aktionen, tagNamen: tagNamen, standUebernehme: standUebernehme, naechsterName: naechsterName,
      pruefe: { idee: pruefeIdee, tag: pruefeTag, szene: pruefeSzene, zelt: pruefeZelt }, form: { idee: formIdee, tag: formTag, szene: formSzene, zelt: formZelt, zeile: zeileHtml },
      kann: { entscheiden: kannEntscheiden, bearbeiten: kannBearbeiten, loeschen: kannLoeschen }, IDEE_ZUSTAENDE: IDEE_ZUSTAENDE, OBJEKT_ARTEN: OBJEKT_ARTEN },
    lauf: function () { return lauf; }
  };
})();
