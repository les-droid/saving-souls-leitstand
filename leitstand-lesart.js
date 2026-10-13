/* Saving Souls Leitstand — Lesart der Claude-Aufgaben (Bauschritt 2: eine Regel, eine Lesart, ein Schreibweg).
   Diese Datei enthält, was Reiter »Aufgaben«, Agenten-Kanal, Lagebild, Panel »Schnitt 11« und Chat gemeinsam brauchen:
     · die Regel, was als offene Claude-Aufgabe zählt (Bauvorlage Fassung 2, § 3.1),
     · die Lesart: elf Zustände mit Wort, Stufe, Knopf und »Warten auf dich« (§ 3.2),
     · die Liste »Warten auf dich« als Funktion (§ 3.3),
     · den einen Schreibweg `freigeben` (§ 3.4) — außer ihm schreibt kein Knopf `angefordert`,
     · Namen der Arbeitsplätze, ihre Reihenfolge und die Marke als HTML (§ 4).
   Rückfall: Fehlt diese Datei oder hat sie eine andere `fassung`, fragen die vier Aufrufer (index.html, agenten-kanal.js, leitstand-db.js,
   claude-chat.js) `window.LEITSTAND_LESART` ab und tun, was sie vor dem Schritt taten. Die Datei kennt keine Datenbank von sich aus: Der Schreibweg
   bekommt sie über `verbinde`. Sichtbarer Text: nur Wortlaut der Bauvorlage oder der veröffentlichten Seite. */
(function (root) {
  "use strict";

  var FASSUNG = 1;
  var FREIGEBER = ["LES", "JB"];

  var TEXT = {
    nurLesJb: "Nur LES und JB können Aufträge freigeben — die Anmeldung hat kein Kürzel.",        // Bauvorlage § 3.4 Nr. 4
    speichernFehl: "Speichern fehlgeschlagen — kurz warten und noch einmal versuchen.",             // Wortlaut der veröffentlichten Seite (Formular »+ Aufgabe«)
    zurueckgeholt: "zurückgeholt — läuft nicht noch einmal, dafür eine neue Aufgabe anlegen",       // Bauvorlage § 3.1
    herkunft: "Hier wird dieser Auftrag nicht freigegeben — seine Herkunft ist nicht erkennbar. Neu anlegen, dann »Jetzt erledigen«.",   // Bauvorlage § 3.2
    alsText: "»angefordert« ist als Text gespeichert — kein Hintergrunddienst nimmt es so",         // Bauvorlage § 3.2
    knopf: { zum: "Zum Vorschlag →", jetzt: "Jetzt erledigen", neu: "Neu anfordern" }
  };

  /* Die elf Zustände (§ 3.2). Das Wort nennt den Zustand, Klasse und Stufe die Farbe und Form. */
  var STUFEN = { vor: "Vor Freigabe", bereit: "Bereit", laeuft: "Läuft", haengt: "Hängt", erledigt: "Erledigt" };
  var ZUSTAENDE = {
    1: { nr: 1, wort: "abgelehnt", klasse: "abgelehnt", stufe: "erledigt", warten: false },
    2: { nr: 2, wort: "fertig", klasse: "fertig", stufe: "erledigt", warten: false },
    3: { nr: 3, wort: "läuft", klasse: "laeuft", stufe: "laeuft", warten: false },
    4: { nr: 4, wort: "pausiert", klasse: "pausiert", stufe: "haengt", warten: false },
    5: { nr: 5, wort: "Vorschlag", klasse: "vorschlag", stufe: "vor", warten: true },
    6: { nr: 6, wort: "Fehler", klasse: "fehler", stufe: "haengt", warten: true },
    7: { nr: 7, wort: "abgebrochen", klasse: "abgebrochen", stufe: "haengt", warten: true },
    8: { nr: 8, wort: "zurückgegeben", klasse: "zurueck", stufe: "bereit", warten: false },
    9: { nr: 9, wort: "neu angefordert", klasse: "neuang", stufe: "bereit", warten: false },
    10: { nr: 10, wort: "freigegeben", klasse: "bereit", stufe: "bereit", warten: false },
    11: { nr: 11, wort: "nicht freigegeben", klasse: "nichtfrei", stufe: "vor", warten: true }
  };

  /* Arbeitsplätze (§ 4): technischer Ort → Anzeige; andere wie gespeichert. `cloud` bleibt in den Daten, nur die Anzeige heißt »Remote«. */
  var FESTE_ORTE = ["schnitt11", "vps", "cloud", "macbook12", "macbook-les"];
  var ORT_NAMEN = { schnitt11: "Schnitt 11", vps: "VPS", cloud: "Remote", macbook12: "macbook12", "macbook-les": "LES MacBook (privat)" };

  function merkmal(wert, muster) { return new RegExp("^[^\\p{L}\\p{N}]*(?:" + muster + ")[^\\p{L}\\p{N}]*$", "iu").test(wert == null ? "" : String(wert)); }
  function wahrWert(x) { return merkmal(x, "t|tr|tru|true|y|ye|yes|on|1"); }
  function textDa(x) { return x != null && String(x).replace(/\s+/g, "") !== ""; }
  function ms(x) { var t = x ? new Date(x).getTime() : NaN; return isNaN(t) ? null : t; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---- § 3.1: was zählt ---- */
  function istAufgabe(v) { return !!v && typeof v === "object" && "text" in v; }   // ein Dokument ohne Feld text ist keine Aufgabe
  function istChat(v) { return !!v && merkmal(v.quelle, "chat"); }
  function claudeAuftrag(v) { return !!v && (merkmal(v.typ, "claude") || merkmal(v.wer, "claude") || istChat(v) || wahrWert(v.angefordert) || v.s11status != null); }
  function erledigt(v) { return !!v && (wahrWert(v.done) || v.s11status === "fertig"); }
  /* keine · chat · offen · erledigt · mensch */
  function art(v) {
    if (!istAufgabe(v)) return "keine";
    if (istChat(v)) return "chat";
    if (claudeAuftrag(v)) return erledigt(v) ? "erledigt" : "offen";
    return "mensch";
  }

  /* ---- Herkunft und Vorschlag (wie Bauschritt 1a) ---- */
  function claudeArt(v) { return v.typ === "claude" || (!v.typ && v.wer === "Claude"); }
  function quelleFehlt(v) { return v.quelle == null || (typeof v.quelle === "string" && v.quelle.replace(/\s+/g, "") === ""); }   // fehlt, null oder Text aus nichts: wie ein fehlendes Feld
  function ausKanal(v) { return merkmal(v.quelle, "kanal") || v.vorgeschlagenVon != null; }
  function vonMenschBestaetigt(v) { return FREIGEBER.indexOf(v.bestaetigtVon) !== -1 && !textDa(v.abgelehntVon); }
  function herkunftOk(v) { return ausKanal(v) ? vonMenschBestaetigt(v) : quelleFehlt(v) || v.quelle === "formular" || v.quelle === "repo-eingang"; }
  /* Die Karte im Kanal: Claude-Aufgabe aus dem Kanal, nicht angefordert (in keiner Schreibweise), nicht erledigt. Bestätigt oder nicht. */
  function vorschlagKarte(v) { return !!v && typeof v === "object" && claudeArt(v) && ausKanal(v) && !wahrWert(v.angefordert) && !wahrWert(v.done); }
  function istVorschlag(v) { return vorschlagKarte(v) && !vonMenschBestaetigt(v); }
  function jetztErlaubt(v) { return art(v) === "offen" && claudeArt(v) && !wahrWert(v.angefordert) && herkunftOk(v); }   // nur an einer offenen Claude-Aufgabe (§ 3.1): keine Chat-Nachricht, nichts Erledigtes
  function neuErlaubt(v) { return art(v) === "offen" && claudeArt(v) && (herkunftOk(v) || FREIGEBER.indexOf(v.angefordertVon) !== -1); }
  /* »angefordert« heißt hier der echte Wahrheitswert (so lesen die Hintergrunddienste); neu angefordert: beide Zeiten da, angefordertAm nach s11beendetAm */
  function neuAngefordert(v) { var a = ms(v.angefordertAm), b = ms(v.s11beendetAm); return v.angefordert === true && a != null && b != null && a > b; }

  /* ---- § 3.2: die Lesart. Die erste zutreffende Zeile gilt. ---- */
  function nummer(v) {
    var s = v.s11status, neu = neuAngefordert(v);
    if (wahrWert(v.done) && textDa(v.abgelehntVon)) return 1;
    if (erledigt(v)) return 2;
    if (s === "laeuft") return 3;
    if (s === "wartet" && !neu) return 4;
    if (istVorschlag(v)) return 5;                                      // ein Vorschlag bleibt ein Vorschlag, was immer sonst an ihm steht
    if (s === "fehler" && !neu) return 6;
    if (s === "abgebrochen" && !neu) return 7;
    if (v.angefordert === true && s === "zurueckgegeben") return 8;
    if (v.angefordert === true && (s === "fehler" || s === "abgebrochen" || s === "wartet")) return 9;
    if (v.angefordert === true) return 10;
    return 11;
  }
  /* Ergebnis: Wort, Klasse, Stufe, warten; dazu knopf (null · zum · jetzt · neu), hinweis (null · herkunft · text), zusatz (null · zurueckgeholt) */
  function zustand(v) {
    v = v && typeof v === "object" ? v : {};
    var n = nummer(v), z = {}, k;
    for (k in ZUSTAENDE[n]) z[k] = ZUSTAENDE[n][k];
    z.knopf = null; z.hinweis = null; z.zusatz = null;
    if (n === 5) z.knopf = "zum";
    else if (n === 6 || n === 7) { if (neuErlaubt(v)) z.knopf = "neu"; else if (claudeArt(v)) z.hinweis = "herkunft"; }
    else if (n === 11) { if (jetztErlaubt(v)) z.knopf = "jetzt"; else if (wahrWert(v.angefordert)) z.hinweis = "text"; else if (claudeArt(v)) z.hinweis = "herkunft"; }
    else if (n === 2 && !wahrWert(v.done)) z.zusatz = "zurueckgeholt";
    return z;
  }
  function hinweisText(z) { return z.hinweis === "herkunft" ? TEXT.herkunft : z.hinweis === "text" ? TEXT.alsText : z.zusatz === "zurueckgeholt" ? TEXT.zurueckgeholt : ""; }
  function markeHtml(z) {
    return '<span class="llMarke ' + esc(z.klasse) + '" data-zustand="' + esc(z.klasse) + '" data-stufe="' + esc(z.stufe) + '"><i aria-hidden="true"></i>' + esc(z.wort) + "</span>";
  }

  /* ---- Arbeitsplatz einer Aufgabe, Namen, Reihenfolge der Zonen (§ 4) ---- */
  function ortVonZiel(z) { z = String(z == null ? "" : z); var m = /@(.+)$/.exec(z); return m ? m[1] : FESTE_ORTE.indexOf(z) !== -1 || /^[a-z0-9-]+$/.test(z) && z !== "egal" && z !== "alle" ? z : "egal"; }
  function laeuftOderPausiert(v) { return v.s11status === "laeuft" || (v.s11status === "wartet" && !neuAngefordert(v)); }
  /* Läuft oder pausiert eine Aufgabe, zählt, wo sie läuft (Kennung oder Ort des Dienstes); sonst, wohin sie soll */
  function arbeitsplatz(v) { v = v || {}; return laeuftOderPausiert(v) ? ortVonZiel(v.s11kennung || v.s11ziel) : ortVonZiel(v.ziel || "egal"); }
  function arbeitsplatzName(o) { return o === "egal" ? "Arbeitsplatz egal" : Object.prototype.hasOwnProperty.call(ORT_NAMEN, o) ? ORT_NAMEN[o] : String(o); }   // kein fester Arbeitsplatz: »Arbeitsplatz egal«
  function ortNamen() { var a = {}; Object.keys(ORT_NAMEN).forEach(function (k) { a[k] = ORT_NAMEN[k]; }); return a; }
  /* feste Arbeitsplätze in fester Reihenfolge, andere nach dem Alphabet, zuletzt »egal« und »offen« */
  function zonenReihe(zonen) {
    var rest = Object.keys(zonen).filter(function (o) { return FESTE_ORTE.indexOf(o) === -1 && o !== "egal" && o !== "offen"; }).sort();
    return FESTE_ORTE.concat(rest).concat(["egal", "offen"]).filter(function (o) { return zonen[o]; });
  }

  /* ---- § 3.3: Warten auf dich ---- */
  var quellFn = null;
  function quelle(fn) { quellFn = typeof fn === "function" ? fn : null; }
  function anAm(v, z) { return ms(z.nr === 5 ? v.vorgeschlagenAm || v.created : z.nr === 11 ? v.created : v.s11beendetAm || v.angefordertAm || v.created); }
  /* Aufgaben in den Zuständen Vorschlag, Fehler, abgebrochen, nicht freigegeben — für LES und JB, am längsten Wartendes zuerst; Gäste und alle anderen: leer.
     Nachrichten an das Kürzel (Teil 2 der Festlegung) liefert der Kanal erst mit Bauschritt 4; bis dahin hat die Liste nur Aufgaben. */
  function wartenAufDich(kuerzel, liste) {
    if (FREIGEBER.indexOf(kuerzel) === -1) return [];
    var quellen = liste || (quellFn ? quellFn() : []), aus = [];
    (quellen || []).forEach(function (x) {
      if (!x || art(x.v) !== "offen") return;
      var z = zustand(x.v);
      if (z.warten) aus.push({ art: "aufgabe", id: x.id, v: x.v, zustand: z, seit: anAm(x.v, z) });
    });
    return aus.sort(function (a, b) { return (a.seit == null) - (b.seit == null) || (a.seit || 0) - (b.seit || 0) || String(a.id).localeCompare(String(b.id)); });
  }

  /* ---- § 3.4: ein Schreibweg ---- */
  var wege = { db: null, meldung: null, vorschlag: null };
  function verbinde(w) { wege = { db: w && w.db, meldung: w && w.meldung, vorschlag: w && w.vorschlag }; }
  function anmeldeKuerzel() {   // Kürzel der ANMELDUNG, nie die Auswahl »Ich bin«; nur für einen Editor (Rolle admin) mit LES oder JB, sonst null
    var c = root.claude || {}, k = null, r = null;
    try { r = c.rolle ? c.rolle() : null; k = r && r.rolle === "admin" ? ((c.kuerzel && c.kuerzel()) || r.kuerzel || null) : null; } catch (e) { k = null; }
    return FREIGEBER.indexOf(k) !== -1 ? k : null;
  }
  /* `art`: »jetzt« nur im Zustand 11, »neu« nur in 6 und 7, je mit erkennbarer Herkunft. Liest die Aufgabe beim Klick neu aus der Datenbank, nie aus dem Bild.
     Ein Vorschlag führt in den Kanal und schreibt nichts. Schreibt genau drei Felder. Fehlt eine Verbindung, wird nichts geschrieben. Das Versprechen löst sich immer auf. */
  function freigeben(id, was, li) {
    var melde = function (t) { if (typeof wege.meldung === "function") wege.meldung(id, li, t); };
    var ref = null;
    return Promise.resolve().then(function () {
      var d = typeof wege.db === "function" ? wege.db() : null;
      if (!d || !id || (was !== "jetzt" && was !== "neu")) throw new Error("keine Verbindung");
      ref = d.collection("todos").doc(id); return ref.get();
    }).then(function (s) {
      var v = s && s.exists ? s.data() : null;
      if (!v) { melde(TEXT.speichernFehl); return; }
      if (zustand(v).knopf !== was) { if (istVorschlag(v) && typeof wege.vorschlag === "function") wege.vorschlag(id); return; }
      var k = anmeldeKuerzel();
      if (!k) { melde(TEXT.nurLesJb); return; }
      return ref.update({ angefordert: true, angefordertVon: k, angefordertAm: new Date().toISOString() });
    }).catch(function () { melde(TEXT.speichernFehl); });
  }

  var API = {
    fassung: FASSUNG, TEXT: TEXT, STUFEN: STUFEN, FREIGEBER: FREIGEBER.slice(),
    merkmal: merkmal, wahrWert: wahrWert, textDa: textDa,
    istAufgabe: istAufgabe, istChat: istChat, claudeAuftrag: claudeAuftrag, erledigt: erledigt, art: art,
    claudeArt: claudeArt, ausKanal: ausKanal, vorschlagKarte: vorschlagKarte, istVorschlag: istVorschlag, jetztErlaubt: jetztErlaubt, neuErlaubt: neuErlaubt, neuAngefordert: neuAngefordert,
    zustand: zustand, hinweisText: hinweisText, markeHtml: markeHtml,
    ortVonZiel: ortVonZiel, arbeitsplatz: arbeitsplatz, arbeitsplatzName: arbeitsplatzName, ortNamen: ortNamen, zonenReihe: zonenReihe,
    quelle: quelle, wartenAufDich: wartenAufDich, verbinde: verbinde, anmeldeKuerzel: anmeldeKuerzel, freigeben: freigeben
  };
  root.LEITSTAND_LESART = API;
  try { if (root.document && root.document.documentElement) root.document.documentElement.setAttribute("data-lesart", String(FASSUNG)); } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
