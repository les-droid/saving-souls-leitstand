/* Saving Souls Leitstand — Lesart der Claude-Aufgaben (Bauschritt 2: eine Regel, eine Lesart, ein Schreibweg).
   Diese Datei enthält, was Reiter »Aufgaben«, Agenten-Kanal, Lagebild, Panel »Schnitt 11« und Chat gemeinsam brauchen:
     · die Regel, was als offene Claude-Aufgabe zählt (Bauvorlage Fassung 2, § 3.1),
     · die Lesart: elf Zustände mit Wort, Stufe, Knopf und »Warten auf dich« (§ 3.2),
     · die Liste »Warten auf dich« als Funktion (§ 3.3),
     · den einen Schreibweg `freigeben` (§ 3.4) — außer ihm schreibt kein Knopf `angefordert`,
     · Namen der Arbeitsplätze, ihre Reihenfolge und die Marke als HTML (§ 4),
     · (Bauschritt 3) die zwei Marken für Konto (wer) und Arbeitsplatz (wo), nie in einem Wort verschmolzen, und die Regel, wann ein Eintrag der Anwesenheit abgemeldet ist,
     · (Bauschritt 4) die Liste »Warten auf dich« mit den Nachrichten an das Kürzel (über die Schnittstelle des Kanals, window.LEITSTAND_KANAL), der Zustand einer laufenden oder pausierten Chat-Nachricht
       und die erste Zeile einer Nachricht (kern),
     · (Bauschritt 5, Brett) die Sätze des Aufgeklappten: Stand als Satz, wer als Nächstes dran ist, wer den Auftrag übernimmt, »liegt seit … min«, die Konto-Marke dessen, der eine Aufgabe hält, und die Reihenfolge in einer Gruppe.
   Rückfall: Fehlt diese Datei oder hat sie eine andere `fassung`, fragen die vier Aufrufer (index.html, agenten-kanal.js, leitstand-db.js,
   claude-chat.js) `window.LEITSTAND_LESART` ab und tun, was sie vor dem Schritt taten. Die Datei kennt keine Datenbank von sich aus: Der Schreibweg
   bekommt sie über `verbinde`. Sichtbarer Text: nur Wortlaut der Bauvorlage oder der veröffentlichten Seite. */
(function (root) {
  "use strict";

  var FASSUNG = 1;
  var SCHRITT = 4;   // Das Merkmal data-lesart-schritt bleibt »4«: die Stilregeln des Lagebilds hängen daran. Wer die Sätze für das Brett braucht (Bauschritt 5), fragt `brett` (Funktionen, nicht Fassung). Bauschritt 4: wer die Lesart mit der Liste der Nachrichten und dem Chat-Zustand braucht, fragt `schritt`; die Fassung bleibt 1, damit die vier Dateien aus Paket 2 sie weiter annehmen
  var FREIGEBER = ["LES", "JB"];

  var TEXT = {
    nurLesJb: "Nur LES und JB können Aufträge freigeben — die Anmeldung hat kein Kürzel.",        // Bauvorlage § 3.4 Nr. 4
    speichernFehl: "Speichern fehlgeschlagen — kurz warten und noch einmal versuchen.",             // Wortlaut der veröffentlichten Seite (Formular »+ Aufgabe«)
    zurueckgeholt: "zurückgeholt — läuft nicht noch einmal, dafür eine neue Aufgabe anlegen",       // Bauvorlage § 3.1
    herkunft: "Hier wird dieser Auftrag nicht freigegeben — seine Herkunft ist nicht erkennbar. Neu anlegen, dann »Jetzt erledigen«.",   // Bauvorlage § 3.2
    herkunftNeu: "Kein »Neu anfordern« bei diesem Auftrag — seine Herkunft ist nicht erkennbar. Neu anlegen, dann »Jetzt erledigen«.",   // Wortlaut abgenommen 13.10.2026 (Wortlaut Herkunft an Fehler und Abbruch): an »Fehler« und »abgebrochen« ohne erkennbare Herkunft; der Satz bei »nicht freigegeben« bleibt
    alsText: "»angefordert« ist als Text gespeichert — kein Hintergrunddienst nimmt es so",         // Bauvorlage § 3.2
    knopf: { zum: "Zum Vorschlag →", jetzt: "Jetzt erledigen", neu: "Neu anfordern" },
    kontoOffen: "Konto nicht gemeldet",                                                             // Bauvorlage § 4 (Tabelle »Konto«), Schritt 3
    dienst: "Dienst"                                                                                // Name des Zustell-Wächters am VPS als Konto der Kennung »Dienst@…« (Entwurf der Bauvorlage, kennungChips)
  };
  /* Konten (§ 4): »LES Claude«, »Dropout Claude«, »JB Claude«; andere Kürzel mit »Claude« dahinter wie bisher (agenten-kanal.js, anzeige); fehlt die Angabe: »Konto nicht gemeldet« */
  var KONTO_NAMEN = { LES: "LES Claude", Dropout: "Dropout Claude", JB: "JB Claude" };

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
  function hinweisText(z) { return z.hinweis === "herkunft" ? (z.nr === 6 || z.nr === 7 ? TEXT.herkunftNeu : TEXT.herkunft) : z.hinweis === "text" ? TEXT.alsText : z.zusatz === "zurueckgeholt" ? TEXT.zurueckgeholt : ""; }
  function markeHtml(z) {
    return '<span class="llMarke ' + esc(z.klasse) + '" data-zustand="' + esc(z.klasse) + '" data-stufe="' + esc(z.stufe) + '"><i aria-hidden="true"></i>' + esc(z.wort) + "</span>";
  }

  /* ---- Arbeitsplatz einer Aufgabe, Namen, Reihenfolge der Zonen (§ 4) ---- */
  function ortVonZiel(z) { z = String(z == null ? "" : z); var m = /@(.+)$/.exec(z); return m ? m[1] : FESTE_ORTE.indexOf(z) !== -1 || /^[a-z0-9-]+$/.test(z) && z !== "egal" && z !== "alle" ? z : "egal"; }
  function laeuftOderPausiert(v) { return v.s11status === "laeuft" || (v.s11status === "wartet" && !neuAngefordert(v)); }
  /* Wo ein Lauf steht (E1, Bauschritt 3): was der Lauf selbst meldet — die Kennung der Sitzung, sonst der Ort des Dienstes (s11ziel). Meldet er nichts (beide fehlen oder bestehen
     aus nichts), steht er am Arbeitsplatz seines `ziel`, wenn das ein fester ist (ein Auftrag mit festem Ziel wird nur dort übernommen: Listener `istOffen`, SQL `kanal_darf`);
     ist das Ziel egal, alle oder fehlt es, steht er unter »Arbeitsplatz egal«. Der Text der Datenbank in s11ziel (»Konto @ Arbeitsplatz«; ohne s11kennung nur in Altbestand) ist keine Meldung des Ortes:
     Die Seite liest für die Anzeige nie den Text in s11ziel (§ 4). */
  function ortDesLaufs(v) { v = v || {}; return ortVonZiel(textDa(v.s11kennung) ? v.s11kennung : textDa(v.s11ziel) && !/\s@\s/.test(String(v.s11ziel)) ? v.s11ziel : (v.ziel || "egal")); }
  /* Läuft oder pausiert eine Aufgabe, zählt, wo sie läuft (Kennung oder Ort des Dienstes, sonst das Ziel: E1); sonst, wohin sie soll.
     Runde 3 (Entscheidung C1): Trägt der Lauf keine Kennung und nennt der Status einer Sitzung die Aufgabe (`id`) als ihren Auftrag, gilt der Arbeitsplatz dieser Sitzung — er ist dann die einzige Meldung, wo sie läuft.
     Die Anwesenheit kommt in `ctx` (über window.LEITSTAND_KANAL.anwesenheit, Schnittstelle aus Schritt 4). Es zählt dieselbe Sitzung wie im Lagebild (agenten-kanal.js, lageModell, Teil 1): ein Eintrag mit Kennung, gesehen
     in den letzten 12 Stunden oder ohne Zeit, nicht abgemeldet, kein Hintergrunddienst; nennen ihn mehrere, der zuletzt gesehene; ihr Arbeitsplatz wie ihre Zone dort (`ort`, sonst aus der Kennung). Ohne `ctx` oder `id`: E1. */
  var SICHTBAR_MS = 12 * 3600000;
  function nennendeSitzung(id, ctx) {
    if (!textDa(id) || !ctx || !Array.isArray(ctx.anwesenheit)) return null;
    var jetzt = ctx.jetzt != null ? ctx.jetzt : Date.now();
    return ctx.anwesenheit.filter(function (a) { if (!a || typeof a !== "object" || !a.kennung) return false; var z = ms(a.zuletzt); return (z == null || jetzt - z <= SICHTBAR_MS) && !abgemeldet(a) && !istDienst(a); })
      .sort(function (a, b) { return String(b.zuletzt || "").localeCompare(String(a.zuletzt || "")); })
      .filter(function (a) { var au = stat(a).auftrag; return (typeof au === "string" ? au : au && typeof au === "object" && !Array.isArray(au) && typeof au.id === "string" ? au.id : null) === String(id); })[0] || null;
  }
  function arbeitsplatz(v, ctx, id) {
    v = v || {}; if (!laeuftOderPausiert(v)) return ortVonZiel(v.ziel || "egal");
    var s = textDa(v.s11kennung) ? null : nennendeSitzung(id, ctx);
    return s ? String(s.ort || ortVonZiel(s.kennung)) : ortDesLaufs(v);
  }
  function arbeitsplatzName(o) { return o === "egal" ? "Arbeitsplatz egal" : Object.prototype.hasOwnProperty.call(ORT_NAMEN, o) ? ORT_NAMEN[o] : String(o); }   // kein fester Arbeitsplatz: »Arbeitsplatz egal«
  function ortNamen() { var a = {}; Object.keys(ORT_NAMEN).forEach(function (k) { a[k] = ORT_NAMEN[k]; }); return a; }
  /* feste Arbeitsplätze in fester Reihenfolge, andere nach dem Alphabet, zuletzt »egal« und »offen« */
  function zonenReihe(zonen) {
    var rest = Object.keys(zonen).filter(function (o) { return FESTE_ORTE.indexOf(o) === -1 && o !== "egal" && o !== "offen"; }).sort();
    return FESTE_ORTE.concat(rest).concat(["egal", "offen"]).filter(function (o) { return zonen[o]; });
  }

  /* ---- Die zwei Marken (§ 4, Bauschritt 3): Konto = wer, Arbeitsplatz = wo. Überall dieselben zwei, nie in einem Wort verschmolzen. ---- */
  function hat(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function kontoName(k) { return textDa(k) && k !== "?" ? (hat(KONTO_NAMEN, k) ? KONTO_NAMEN[k] : String(k).trim() + " Claude") : TEXT.kontoOffen; }
  function kontoKlasse(k) { return !textDa(k) || k === "?" ? "offen" : hat(KONTO_NAMEN, k) ? String(k) : "andere"; }
  /* Pille mit Punkt; Quadrat statt Punkt für den Lauf des Hintergrunddienstes; gestrichelt mit Ring: nicht gemeldet */
  function kontoMarke(k, dienst) {
    if (k === TEXT.dienst) return '<span class="llKonto dienstkonto" data-konto="' + esc(TEXT.dienst) + '"><i aria-hidden="true"></i>' + esc(TEXT.dienst) + "</span>";   // das Konto »Dienst« (Zustell-Wächter am VPS) ist keine Claude-Sitzung — überall dasselbe Wort, auch in den Einzelheiten
    var kl = kontoKlasse(k);
    return '<span class="llKonto ' + esc(kl) + (dienst ? " dienst" : "") + '" data-konto="' + esc(kl === "offen" ? "" : String(k).trim()) + '"><i aria-hidden="true"></i>' + esc(kontoName(k)) + "</span>";
  }
  /* Rechteck mit Bildschirm; kein fester Arbeitsplatz: »Arbeitsplatz egal« (gestrichelt, ohne Bildschirm) */
  function platzMarke(o) {
    return o === "egal" ? '<span class="llPlatz egal" data-platz="egal">' + esc(arbeitsplatzName("egal")) + "</span>"
      : '<span class="llPlatz" data-platz="' + esc(o) + '"><i aria-hidden="true"></i>' + esc(arbeitsplatzName(o)) + "</span>";
  }
  /* Eine Kennung (»Konto@arbeitsplatz«) in ihre zwei Teile; ohne »@« kennt sie kein Konto (»Konto nicht gemeldet«), der Rest ist der Arbeitsplatz */
  function kennungTeile(k) {
    var s = String(k == null ? "" : k).trim(), m = /^([^@]+)@(.+)$/.exec(s);
    return m ? { konto: m[1].trim(), ort: m[2].trim() } : { konto: "?", ort: ortVonZiel(s), roh: s };
  }
  /* Die zwei Marken nebeneinander. `lauf`: das Konto gehört einem Lauf des Hintergrunddienstes (Quadrat). Zwischen den zwei Marken steht ein Leerzeichen: Mit leitstand-lesart.css trägt es nichts auf
     (die Marken stehen in einer Flex-Zeile mit Abstand); ohne sie — ältere Stildatei aus dem Zwischenspeicher, Stildatei nicht geladen — kleben Konto und Arbeitsplatz sonst zu einem Wort zusammen. */
  function markenPaar(konto, ort, lauf) {
    return '<span class="llKp">' + kontoMarke(konto, lauf) + " " + platzMarke(ort) + "</span>";
  }
  function kennungMarken(k) { var t = kennungTeile(k); return markenPaar(t.konto, t.ort, false); }
  /* Abgemeldet (§ 4): `abgemeldet` nicht vor `zuletzt`, und `abgemeldetSitzung` ist die Sitzung des Status (`status.sitzung`). Nennt der Eintrag eine andere Sitzung, oder fehlt
     eine der beiden Angaben, bleibt er; meldet sich die Kennung danach wieder, ist `zuletzt` jünger, und der Kasten ist wieder da. Nichts wird gelöscht. */
  function abgemeldet(a) {
    a = a && typeof a === "object" ? a : {};
    var st = a.status && typeof a.status === "object" ? a.status : {}, ab = ms(a.abgemeldet), z = ms(a.zuletzt);
    return ab != null && (z == null || ab >= z) && textDa(a.abgemeldetSitzung) && textDa(st.sitzung) && a.abgemeldetSitzung === st.sitzung;
  }
  /* Ein Eintrag der Anwesenheit mit `status.dienst` ist ein Hintergrunddienst, keine Sitzung (§ 2.4) */
  function istDienst(a) { var st = a && typeof a === "object" && a.status && typeof a.status === "object" ? a.status : {}; return typeof st.dienst === "string" && textDa(st.dienst); }

  /* ---- § 3.3: Warten auf dich ---- */
  var quellFn = null;
  function quelle(fn) { quellFn = typeof fn === "function" ? fn : null; }
  function anAm(v, z) { return ms(z.nr === 5 ? v.vorgeschlagenAm || v.created : z.nr === 11 ? v.created : v.s11beendetAm || v.angefordertAm || v.created); }
  /* Nachrichten an das Kürzel (Teil 2 der Festlegung, § 3.3): sie kommen über die Schnittstelle des Kanals (window.LEITSTAND_KANAL.wartendeNachrichten, Bauschritt 4). Sie liefert eine leere Liste, bis der Kanal
     »Antworten« und »Gesehen« schreibt. Fehlt die Schnittstelle, wirft sie oder liefert sie etwas anderes als eine Liste von Einträgen mit Kennung, bleibt die Liste leer — es entsteht nie eine halbe Zeile. */
  function nachrichtenFuer(kuerzel) {
    var K = root.LEITSTAND_KANAL, aus = [], gesehen = Object.create(null);   // Runde 2 (Prüfbericht Bedienung, Befund 6): ohne geerbte Namen — eine Nachricht mit einer Kennung wie »constructor« gilt sonst als schon gesehen
    try {
      var l = K && typeof K.wartendeNachrichten === "function" ? K.wartendeNachrichten(kuerzel) : [];
      if (Array.isArray(l)) l.forEach(function (m) { if (m && typeof m === "object" && !Array.isArray(m) && typeof m.id === "string" && m.id && !gesehen[m.id]) { gesehen[m.id] = true; aus.push({ art: "nachricht", id: m.id, v: m, seit: ms(m.created) }); } });
    } catch (e) { aus = []; }
    return aus;
  }
  /* Aufgaben in den Zuständen Vorschlag, Fehler, abgebrochen, nicht freigegeben — für LES und JB — und die Nachrichten an das Kürzel; am längsten Wartendes zuerst; Gäste und alle anderen: leer. */
  function wartenAufDich(kuerzel, liste) {
    if (FREIGEBER.indexOf(kuerzel) === -1) return [];
    var quellen = liste || (quellFn ? quellFn() : []), aus = [];
    (quellen || []).forEach(function (x) {
      if (!x || art(x.v) !== "offen") return;
      var z = zustand(x.v);
      if (z.warten) aus.push({ art: "aufgabe", id: x.id, v: x.v, zustand: z, seit: anAm(x.v, z) });
    });
    return aus.concat(nachrichtenFuer(kuerzel)).sort(function (a, b) { return (a.seit == null) - (b.seit == null) || (a.seit || 0) - (b.seit || 0) || String(a.id).localeCompare(String(b.id)); });
  }
  /* Chat-Nachricht (Bauschritt 4, § 2.4): nur solange sie läuft oder pausiert ein eigener Kasten, mit dem Wort ihres Zustands; sonst null. Sie zählt nicht als Claude-Aufgabe. */
  function chatZustand(v) {
    if (art(v) !== "chat" || erledigt(v) || !laeuftOderPausiert(v)) return null;
    var z = {}, k, q = ZUSTAENDE[v.s11status === "laeuft" ? 3 : 4];
    for (k in q) z[k] = q[k];
    z.knopf = null; z.hinweis = null; z.zusatz = null;
    return z;
  }
  /* Die erste Zeile einer Nachricht, höchstens 90 Zeichen, an einer Wortgrenze gekürzt (Entwurf der Bauvorlage, `kern`) */
  function kern(t) { t = String(t == null ? "" : t).split("\n")[0].trim(); if (t.length <= 90) return t; t = t.slice(0, 90); var i = t.lastIndexOf(" "); return (i > 40 ? t.slice(0, i) : t) + " …"; }

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

  /* ---- Bauschritt 5 (Brett): die Sätze des Aufgeklappten und was eine Zeile braucht. Wortlaut: Entwurf der Bauvorlage Fassung 2 (lesart, naechster, nimmt, anwText) und § 2.2, § 2.3, § 4.
     Jede fehlende Angabe heißt »nicht gemeldet« (§ 2.3). Zeiten: von heute die Uhrzeit, sonst Tag und Uhrzeit (Berliner Zeit, wie »Zuletzt gesehen« im Kanal). ---- */
  var NG = "nicht gemeldet", LIEGT_MIN = 30, AKTIV_MS = 45 * 60000;   // 30 Minuten: gesetzt wie die Wartezeit des Wächters (§ 2.2); 45 Minuten: aktiv wie im Kanal
  var DIENST_ORTE = ["schnitt11", "vps"];                              // nur hier übernimmt ein Hintergrunddienst von selbst
  var RANG = { fehler: 0, abgebrochen: 1, vorschlag: 2, nichtfrei: 3, laeuft: 4, pausiert: 5, zurueck: 6, neuang: 7, bereit: 8 };   // in jeder Arbeitsplatz-Gruppe zuerst, was auf dich wartet
  var ZUSTAND_NAME = { arbeitet: "arbeitet", wartet: "wartet", pause: "Pause", fertig: "fertig" };
  var ZEIT_BERLIN = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  function rang(z) { return hat(RANG, z.klasse) ? RANG[z.klasse] : 9; }
  function zeitTeile(t) { var p = {}; ZEIT_BERLIN.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; }); return p; }
  function zeitKurz(x, jetzt) {   // von heute: HH:MM; sonst TT.MM. HH:MM; fehlt oder unlesbar: leer
    var t = ms(x); if (t == null) return "";
    var a = zeitTeile(t), b = zeitTeile(jetzt == null ? Date.now() : jetzt);
    return a.year === b.year && a.month === b.month && a.day === b.day ? a.hour + ":" + a.minute : a.day + "." + a.month + ". " + a.hour + ":" + a.minute;
  }
  function satz(a) { return a.filter(Boolean).join(" · "); }
  function kennungText(k) {   // als reiner Text (Sätze): »LES Claude @ Schnitt 11«; ohne »@« wie gespeichert; fehlt sie: »nicht gemeldet«
    if (!textDa(k)) return NG;
    var t = kennungTeile(k); if (t.roh !== undefined) return t.roh;
    return (t.konto === TEXT.dienst ? TEXT.dienst : kontoName(t.konto)) + " @ " + arbeitsplatzName(t.ort);
  }
  function freiTeil(v) {   // wer hat wann freigegeben
    var von = textDa(v.angefordertVon) ? String(v.angefordertVon) : "", am = zeitKurz(v.angefordertAm);
    return von && am ? "freigegeben von " + von + " " + am : von ? "freigegeben von " + von + ", Zeit der Freigabe " + NG : am ? "freigegeben " + am + ", Freigeber " + NG : "Freigeber und Zeit der Freigabe " + NG;
  }
  /* Ein freigegebener Auftrag (freigegeben, neu angefordert, zurückgegeben), der 30 Minuten oder länger nicht übernommen ist: »liegt seit … min«; sonst leer */
  function liegtSeit(v, jetzt) {
    v = v && typeof v === "object" ? v : {};
    var z = zustand(v); if (z.nr !== 8 && z.nr !== 9 && z.nr !== 10) return "";
    var seit = ms(z.nr === 8 ? v.s11zurueckAm : v.angefordertAm); if (seit == null) return "";
    var min = Math.floor(((jetzt == null ? Date.now() : jetzt) - seit) / 60000);
    return min >= LIEGT_MIN ? "liegt seit " + min + " min" : "";
  }
  /* Stand als Satz (erste Zeile des Aufgeklappten) */
  function standSatz(v, z, jetzt) {
    v = v && typeof v === "object" ? v : {}; z = z || zustand(v);
    var s = v.s11status, an = v.angefordert === true, frei = an ? freiTeil(v) : "", ende = zeitKurz(v.s11beendetAm, jetzt), start = zeitKurz(v.s11gestartetAm, jetzt);
    switch (z.nr) {
      case 1: return "abgelehnt von " + (textDa(v.abgelehntVon) ? v.abgelehntVon : NG) + (zeitKurz(v.abgelehntAm, jetzt) ? " " + zeitKurz(v.abgelehntAm, jetzt) : ", Zeit " + NG);
      case 2: return satz(["fertig " + (ende || "— Ende " + NG), wahrWert(v.done) ? "" : TEXT.zurueckgeholt]);
      case 3: return satz([start ? "läuft seit " + start : "läuft — Beginn " + NG, frei]);
      case 4: return satz([ende ? "pausiert seit " + ende : "pausiert — Beginn der Pause " + NG, frei]);
      case 5: return satz(["Vorschlag " + (textDa(v.vorgeschlagenVon) ? "von " + kennungText(v.vorgeschlagenVon) : "— Absender " + NG) + (zeitKurz(v.vorgeschlagenAm, jetzt) ? " " + zeitKurz(v.vorgeschlagenAm, jetzt) : ", Zeit " + NG) + " — noch nicht bestätigt",
        textDa(v.abgelehntVon) ? "war abgelehnt von " + v.abgelehntVon + (zeitKurz(v.abgelehntAm, jetzt) ? " " + zeitKurz(v.abgelehntAm, jetzt) : "") + ", zurückgeholt" : ""]);
      case 6: case 7: return satz([(s === "fehler" ? "mit Fehler beendet " : "abgebrochen ") + (ende || "— Ende " + NG), frei, z.knopf ? "" : "Herkunft nicht erkennbar"]);
      case 8: return satz(["zurückgegeben, wieder offen" + (zeitKurz(v.s11zurueckAm, jetzt) ? " seit " + zeitKurz(v.s11zurueckAm, jetzt) : " — Zeit " + NG), frei]);
      case 9: return "neu angefordert" + frei.replace(/^freigegeben/, "") + " — nach " + (s === "fehler" ? "Fehler " : s === "abgebrochen" ? "Abbruch " : "Pause ") + (ende || NG);
      case 10: return satz(["freigegeben, noch nicht übernommen", frei.replace(/^freigegeben /, "")]);
      default: return satz(["noch nicht freigegeben", "angelegt " + (zeitKurz(v.created, jetzt) || NG), z.hinweis === "text" ? TEXT.alsText : "", z.knopf || z.hinweis === "text" ? "" : "Herkunft nicht erkennbar"]);
    }
  }
  /* Was am gewünschten Arbeitsplatz besonders ist (steht rechts in der Zeile und im Aufgeklappten) */
  function zielMarke(v) {
    v = v || {}; var z = String(v.ziel == null || v.ziel === "" ? "egal" : v.ziel), m = /^([^@]+)@(.+)$/.exec(z);
    return z === "alle" ? "für alle Agenten" : m && !textDa(v.s11kennung) ? "nur für " + kontoName(m[1].trim()) : "";
  }
  function sitzungenAn(ctx) { return ((ctx && ctx.anwesenheit) || []).filter(function (a) { return a && typeof a === "object" && textDa(a.kennung) && !abgemeldet(a) && !istDienst(a); }); }
  function stat(a) { return a && a.status && typeof a.status === "object" && !Array.isArray(a.status) ? a.status : {}; }
  function aktivA(a, jetzt) { var t = ms(a.zuletzt); return t != null && jetzt - t <= AKTIV_MS; }
  /* Wer übernimmt einen freigegebenen Auftrag? Nur an Schnitt 11, am VPS und bei »Arbeitsplatz egal« ein Hintergrunddienst — sonst nur eine Sitzung, die dort gerade läuft. */
  function nimmt(v, ctx) {
    v = v && typeof v === "object" ? v : {}; ctx = ctx || {};
    var jetzt = ctx.jetzt != null ? ctx.jetzt : Date.now(), z = String(v.ziel == null || v.ziel === "" ? "egal" : v.ziel), o = ortVonZiel(z), pl = v.plan && typeof v.plan === "object" && !Array.isArray(v.plan) ? v.plan : null;
    var nur = pl && textDa(pl.konto) && pl.konto !== "egal" ? " Abgesprochen: nur " + kontoName(pl.konto) + " übernimmt." : "", S = sitzungenAn(ctx), m = /^([^@]+)@(.+)$/.exec(z);
    if (v.ziel !== null && typeof v.ziel === "object" && !Array.isArray(v.ziel)) return { t: "", keine: true };   // Bauschritt 6 (G7): ein Ziel, das ein Objekt ist, ist keine lesbare Angabe — »Arbeitsplatz egal« wäre erfunden, also auch kein Hintergrunddienst, der es von selbst übernimmt
    if (z === "egal") return { t: "Übernimmt der Hintergrunddienst von selbst (Schnitt 11 oder VPS)." + nur };
    if (z === "alle") return { warn: true, t: "Liegt, bis irgendeine laufende Sitzung den Auftrag holt — kein Hintergrunddienst übernimmt »für alle Agenten«." + nur };
    if (m) { var a = S.filter(function (x) { return x.kennung === z; })[0];
      return { warn: !(a && aktivA(a, jetzt)), t: "Nur " + kennungText(z) + " darf ihn holen" + (a && aktivA(a, jetzt) ? " — die Sitzung läuft." : a ? " — zuletzt gesehen " + (zeitKurz(a.zuletzt, jetzt) || NG) + "." : " — dort läuft keine Sitzung.") }; }
    if (DIENST_ORTE.indexOf(o) !== -1) return { t: "Übernimmt der Hintergrunddienst an " + arbeitsplatzName(o) + " von selbst" + (o === "schnitt11" ? ", wenn Schnitt 11 an ist." : ".") + nur };
    var s = S.filter(function (x) { return ortVonZiel(x.kennung) === o; }), akt = s.filter(function (x) { return aktivA(x, jetzt); });
    return { warn: !akt.length, t: "Liegt, bis an " + arbeitsplatzName(o) + " eine Sitzung den Auftrag holt — dort gibt es keinen Hintergrunddienst. " +
      (akt.length ? "Gerade läuft dort " + kontoName(kennungTeile(akt[0].kennung).konto) + "." : s.length ? "Zuletzt gesehen: " + kontoName(kennungTeile(s[0].kennung).konto) + " " + (zeitKurz(s[0].zuletzt, jetzt) || NG) + "." : "Dort hat sich noch keine Sitzung gemeldet.") + nur };
  }
  /* Wer ist als Nächstes dran? Ein Satz mit seiner Tönung (»du«, »warn«, leer), oder null. Ohne Knopf (Herkunft nicht erkennbar) steht der Satz der Lesart (hinweisText, bei Fehler und Abbruch der abgenommene Wortlaut). */
  function naechster(v, z, ctx, id) {   // id: die Kennung der Aufgabe (Runde 3, C1: für arbeitsplatz)
    v = v && typeof v === "object" ? v : {}; z = z || zustand(v); ctx = ctx || {};
    var k = z.klasse, jetzt = ctx.jetzt, n, liegt;
    if (k === "nichtfrei") return z.knopf === "jetzt" ? ["du", "Du bist dran: »Jetzt erledigen« gibt den Auftrag frei. Als Freigeber steht das Kürzel deiner Anmeldung."] : z.hinweis !== "text" && hinweisText(z) ? ["du", hinweisText(z)] : null;   // Runde 2 (Befund 6): »als Text gespeichert« steht schon im Stand-Satz
    if (k === "vorschlag") return ["du", "Du bist dran: im Agenten-Kanal die Beschreibung lesen, dann bestätigen oder ablehnen. Hier wird ein Vorschlag nicht freigegeben."];
    if (k === "fehler" || k === "abgebrochen") return z.knopf === "neu" ? ["du", "Du bist dran: " + (k === "fehler" ? "Ergebnis lesen, dann " : "") + "»Neu anfordern« — von selbst läuft der Auftrag nicht wieder an."] : hinweisText(z) ? ["du", hinweisText(z)] : null;
    if (k === "pausiert") return ["", zeitKurz(v.s11wiederAb, jetzt) ? "Geht von selbst weiter ab " + zeitKurz(v.s11wiederAb, jetzt) + "." : "Geht von selbst weiter — wann, ist " + NG + "."];
    if (k === "bereit" || k === "neuang" || k === "zurueck") {
      n = nimmt(v, ctx); liegt = liegtSeit(v, jetzt);
      var satz6 = (k === "zurueck" ? "Zurückgegeben von " + kennungText(v.s11zurueckVon) + (zeitKurz(v.s11zurueckAm, jetzt) ? " " + zeitKurz(v.s11zurueckAm, jetzt) : "") +
        (textDa(v.s11zurueckGrund) ? ": »" + v.s11zurueckGrund + "«. " : " — Grund " + NG + ". ") : "") + n.t + (liegt ? " Der Auftrag " + liegt + "." : "");
      if (n.keine) { satz6 = satz6.trim(); if (!satz6) return null; }   // G7: wer übernimmt, ist nicht zu sagen — dann steht dort nichts statt eines erfundenen Satzes
      return [n.warn || liegt ? "warn" : "", satz6];
    }
    if (k === "laeuft") { var wunsch = ortVonZiel(v.ziel == null || v.ziel === "" ? "egal" : v.ziel), lauf = arbeitsplatz(v, ctx, id);
      if (wunsch !== lauf) return ["", "Gewünscht war »" + arbeitsplatzName(wunsch) + "«; übernommen hat " + arbeitsplatzName(lauf) + "."]; }
    return null;
  }
  /* Rechts im Kopf einer Arbeitsplatz-Gruppe: wer dort gerade da ist — als Wort, ohne Punkt */
  function anwText(o, ctx) {
    ctx = ctx || {}; var jetzt = ctx.jetzt != null ? ctx.jetzt : Date.now();
    if (o === "egal") return { t: "kein fester Arbeitsplatz" };
    var s = sitzungenAn(ctx).filter(function (a) { return ortVonZiel(a.kennung) === o; }), akt = s.filter(function (a) { return aktivA(a, jetzt); });
    if (akt.length) return { da: true, t: akt.map(function (a) { return kontoName(kennungTeile(a.kennung).konto) + " " + (hat(ZUSTAND_NAME, stat(a).zustand) ? ZUSTAND_NAME[stat(a).zustand] : "· Zustand " + NG); }).join(" · ") };
    if (s.length) return { t: kontoName(kennungTeile(s[0].kennung).konto) + " · zuletzt " + (zeitKurz(s[0].zuletzt, jetzt) || NG) };
    return { t: DIENST_ORTE.indexOf(o) !== -1 ? "Hintergrunddienst" : "keine Sitzung" };
  }
  /* Die Konto-Marke dessen, der die Aufgabe hält (läuft oder pausiert): das Konto der Kennung des Laufs; ein Lauf des Hintergrunddienstes (ohne Kennung) trägt das Konto, das er über sich meldet
     (s11lauf, schreibt der Dienst erst mit Bauschritt 10), sonst »Konto nicht gemeldet«. An Aufgaben, die niemand hält, steht kein Konto: leer. */
  function halterMarke(v) {
    v = v && typeof v === "object" ? v : {};
    if (!laeuftOderPausiert(v)) return "";
    if (!textDa(v.s11kennung)) { var l = v.s11lauf && typeof v.s11lauf === "object" && !Array.isArray(v.s11lauf) ? v.s11lauf : {}; return kontoMarke(textDa(l.konto) && l.konto !== "offen" ? String(l.konto) : "?", true); }
    return kontoMarke(kennungTeile(v.s11kennung).konto, false);
  }

  /* ---- Bauschritt 6: der Detailblock — ein Baustein für das Aufgeklappte unter dem Titel im Brett und die Einzelheiten unter dem Lagebild (Bauvorlage Fassung 2, § 2.3, § 2.2).
     Wortlaut: Entwurf der Bauvorlage (detailHtml, werHtml, kette) und § 2.3; was fehlt, heißt »nicht gemeldet«. Verschieden sind an den zwei Stellen nur die Sprünge am Ende (`wo`).
     Die Anwesenheit und die Zeilen des Kanals kommen über window.LEITSTAND_KANAL (anwesenheit, zeilenZu, kette, planZeile, abweichungen); fehlt die Schnittstelle (Gast, Rückfall), entfallen die Teile,
     die sie brauchen — der Block behauptet dann nichts über Kanal und Lagebild. Angaben, die es erst mit späteren Schritten gibt (Datenbank, Werkzeug, Dienst), lesen wir, wo sie da sind; sonst steht »nicht gemeldet«. ---- */
  var BL = {
    auftrag: "Auftrag", details: "Details", ohneBeschr: "ohne Beschreibung", angelegt: "angelegt", gewuenscht: "gewünschter Arbeitsplatz", alleAgenten: "alle Agenten", fortschritt: "Fortschritt", ergebnis: "Ergebnis des letzten Laufs",
    wer: "Wer arbeitet daran", niemand: "noch niemand", niemandMehr: "niemand mehr — erledigt", konto: "Konto", arbeitsplatz: "Arbeitsplatz", sitzung: "Sitzung", modell: "Modell", effort: "Effort", helfer: "Helfer", hinweis: "Hinweis", absprache: "Absprache",
    ueberWeg: " über den Weg ", keinWeg: "— der Hintergrunddienst hat keinen Weg gemeldet", dienstWort: "Hintergrunddienst", keineSitzung: "keine — ein Lauf des Hintergrunddienstes",
    mensch: " Mensch an der Sitzung: ", gesehen: "· zuletzt gesehen ", kennungNg: "Kennung " + NG, zustandNg: "Zustand " + NG, rolleNg: "Rolle " + NG, rollenbildNg: "Rollenbild " + NG, fassungNg: "— genaue Fassung " + NG,
    nennt: function (roh) { return "— Kennung »" + roh + "« nennt kein Konto"; },
    nichtsGemeldet: "Für diesen Auftrag hat die Sitzung nichts gemeldet", statusNennt: function (t) { return " — ihr Status nennt »" + t + "«."; }, nichtInAnwesenheit: " — sie steht nicht in der Anwesenheit.",
    einzeln: "keine — arbeitet einzeln", welcheHelfer: "— welche Helfer, ist " + NG, weichtAb: "weicht ab: ",
    gemeldet: "gemeldet ", angabe: "Angabe, kein Nachweis", sitzungNichts: "die Sitzung hat nichts gemeldet", dienstNichts: "der Hintergrunddienst hat nichts gemeldet",
    kanal: "Im Agenten-Kanal", lagebild: "Im Lagebild", keineZeile: "Keine Zeile im Kanal", vomDienst: " — der Hintergrunddienst schreibt dort nicht", ausFormular: " — die Aufgabe kam aus dem Formular", aelter: "älter als die gezeigten Zeilen",
    inAufgaben: "in den Aufgaben zeigen", imLagebild: "im Lagebild zeigen", imKanal: "im Kanal zeigen", zumVorschlag: "zum Vorschlag im Kanal", absender: "Absender " + NG, zeit: "Zeit " + NG
  };
  var MODELL_NAME = { opus: "Opus", sonnet: "Sonnet", haiku: "Haiku" }, WEISE_NAME = { einzeln: "einzeln", subagenten: "mit Sub-Agenten", workflow: "Workflow" };
  var QUELLE_NAME = { git: "aus git", laufend: "läuft gerade", protokoll: "aus dem Sitzungsprotokoll", umgebung: "aus der Umgebung", angabe: "angegeben", dienst: "vom Hintergrunddienst gemeldet" };
  var WEGART_NAME = { api: "API-Guthaben", abo: "Abo", rechner: "Anmeldung am Arbeitsplatz" };
  function obj(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : null; }
  function pfeil(s) { return esc(s).replace(/ →$/, ' <span aria-hidden="true">→</span>'); }   // der Pfeil am Ende eines Verweises wird gezeigt, nicht vorgelesen (wie die Seite)
  function fehlt(t) { return '<span class="fehlt">' + esc(t == null ? NG : t) + "</span>"; }
  function kanalSchnittstelle() { var K = root.LEITSTAND_KANAL; return K && typeof K === "object" ? K : null; }
  function kanalFn(name) { var K = kanalSchnittstelle(); return K && typeof K[name] === "function" ? K[name] : null; }
  function aufgabeVon(id) { try { var l = quellFn ? quellFn() : []; for (var i = 0; i < l.length; i++) if (l[i] && l[i].id === id) return l[i].v; } catch (e) {} return null; }
  function auftragId(st) { var a = st.auftrag; return typeof a === "string" ? a : obj(a) && typeof a.id === "string" ? a.id : null; }
  /* Wer hält die Aufgabe: niemand · der Hintergrunddienst (ein Lauf ohne Kennung) · eine Sitzung. Die Regel gegen falsche Zuordnung (§ 2.3): Modell, Effort und Helfer einer Sitzung gelten für eine Aufgabe nur,
     wenn `status.auftrag` genau diese Aufgabe nennt (als Kennung oder als Objekt mit `id`). */
  function werDaten(id, v, ctx) {
    if (!laeuftOderPausiert(v)) return { art: "niemand" };
    var l, st, a, ja, anderer, t, o = arbeitsplatz(v, ctx, id);
    if (!textDa(v.s11kennung)) {
      l = obj(v.s11lauf) || {};
      return { art: "dienst", konto: textDa(l.konto) && l.konto !== "offen" ? String(l.konto) : "?", ort: o, weg: textDa(l.weg) ? String(l.weg) : "", wegart: textDa(l.art) ? String(l.art) : "", modell_genau: textDa(l.modell_genau) ? String(l.modell_genau) : "",
        modell: textDa(l.modell) ? String(l.modell) : "", effort: textDa(l.effort) ? String(l.effort) : "", gemeldet: textDa(l.gemeldet) ? String(l.gemeldet) : "" };
    }
    t = kennungTeile(v.s11kennung); a = ((ctx && ctx.anwesenheit) || []).filter(function (x) { return x && typeof x === "object" && x.kennung === v.s11kennung; })[0] || null; st = stat(a);
    ja = auftragId(st) === id; anderer = !ja && auftragId(st) ? aufgabeVon(auftragId(st)) : null;
    return { art: "sitzung", konto: t.konto, roh: t.roh || "", ort: o, anw: a, sitzung: textDa(st.sitzung) ? String(st.sitzung) : "", zustand: textDa(st.zustand) ? String(st.zustand) : "", mitarbeiter: textDa(st.mitarbeiter) ? String(st.mitarbeiter) : "",
      passt: ja, anderer: anderer, anderId: !ja ? auftragId(st) : null, modell_genau: ja && textDa(st.modell_genau) ? String(st.modell_genau) : "", modell: ja && textDa(st.modell) ? String(st.modell) : "", effort: ja && textDa(st.effort) ? String(st.effort) : "",
      arbeitsweise: ja && textDa(st.arbeitsweise) ? String(st.arbeitsweise) : "", helfer: ja && Array.isArray(st.helfer) ? st.helfer.filter(obj) : null, gemeldet: ja && textDa(st.gesetzt) ? String(st.gesetzt) : "", quelle: ja && textDa(st.modell_quelle) ? String(st.modell_quelle) : "" };
  }
  function modellHtml(d) { return d.modell_genau ? "<code>" + esc(d.modell_genau) + "</code>" : d.modell ? esc(hat(MODELL_NAME, d.modell) ? MODELL_NAME[d.modell] : d.modell) + " " + fehlt(BL.fassungNg) : fehlt(); }
  function effortHtml(d) { return d.effort ? esc(d.effort) : fehlt(); }
  function werHtml(id, v, ctx, jetzt, fertig) {
    var d = werDaten(id, v, ctx), h, gem = "", zk = function (x) { return zeitKurz(x, jetzt) || NG; };
    if (d.art === "niemand") return '<section class="wer" data-baustein="wer"><h5>' + esc(BL.wer) + '</h5><p class="fehlt">' + esc(fertig ? BL.niemandMehr : BL.niemand) + "</p></section>";
    if (d.art === "dienst") {
      h = "<dt>" + esc(BL.konto) + "</dt><dd>" + kontoMarke(d.konto, true) + (d.weg ? esc(BL.ueberWeg) + "<code>" + esc(d.weg) + "</code>" + (hat(WEGART_NAME, d.wegart) ? " · " + esc(WEGART_NAME[d.wegart]) : "") : " " + fehlt(BL.keinWeg)) + "</dd>" +
        "<dt>" + esc(BL.arbeitsplatz) + "</dt><dd>" + platzMarke(d.ort) + " " + esc(BL.dienstWort) + "</dd><dt>" + esc(BL.sitzung) + "</dt><dd>" + esc(BL.keineSitzung) + "</dd>" +
        "<dt>" + esc(BL.modell) + "</dt><dd>" + modellHtml(d) + "</dd><dt>" + esc(BL.effort) + "</dt><dd>" + effortHtml(d) + "</dd><dt>" + esc(BL.helfer) + "</dt><dd>" + fehlt() + "</dd>";
      gem = d.gemeldet ? BL.gemeldet + zk(d.gemeldet) + " · " + QUELLE_NAME.dienst : BL.dienstNichts;
    } else {
      var hl = d.helfer, pf = kanalFn("planZeile"), pl = obj(v.plan), abw = pl && d.anw && kanalFn("abweichungen") ? (kanalFn("abweichungen")(d.anw, stat(d.anw), pl) || []) : [];
      h = "<dt>" + esc(BL.konto) + "</dt><dd>" + kontoMarke(d.konto, false) + (d.roh ? " " + fehlt(BL.nennt(d.roh)) : "") + "</dd>" +
        "<dt>" + esc(BL.arbeitsplatz) + "</dt><dd>" + platzMarke(d.ort) + (d.mitarbeiter ? esc(BL.mensch + d.mitarbeiter) : "") + (d.anw && !aktivA(d.anw, jetzt) ? " " + fehlt(BL.gesehen + zk(d.anw.zuletzt)) : "") + "</dd>" +
        "<dt>" + esc(BL.sitzung) + "</dt><dd>" + (d.sitzung ? "<code>" + esc(d.sitzung) + "</code>" : fehlt(BL.kennungNg)) + " · " + (d.zustand ? esc(hat(ZUSTAND_NAME, d.zustand) ? ZUSTAND_NAME[d.zustand] : d.zustand) : fehlt(BL.zustandNg)) + "</dd>" +
        (d.passt ? "" : '<dt class="vh">' + esc(BL.hinweis) + '</dt><dd class="voll fehlt">' + esc(BL.nichtsGemeldet + (d.anderId && d.anderer ? BL.statusNennt(textDa(d.anderer.text) ? String(d.anderer.text) : NG) : d.anderId ? BL.statusNennt(NG) : d.anw ? "." : BL.nichtInAnwesenheit)) + "</dd>") +
        "<dt>" + esc(BL.modell) + "</dt><dd>" + modellHtml(d) + "</dd><dt>" + esc(BL.effort) + "</dt><dd>" + effortHtml(d) + "</dd>" +
        "<dt>" + esc(BL.helfer) + "</dt><dd>" + (hl ? (hl.length ? hl.length + (d.arbeitsweise ? " · " + esc(hat(WEISE_NAME, d.arbeitsweise) ? WEISE_NAME[d.arbeitsweise] : d.arbeitsweise) : "") +
            '<ul class="helfer">' + hl.map(function (x) { return '<li><span class="rolle">' + (textDa(x.rolle) ? esc(x.rolle) : esc(BL.rolleNg)) + '</span><span class="bild">' + (textDa(x.rollenbild) ? esc(x.rollenbild) : fehlt(BL.rollenbildNg)) + "</span><span>" +
              (textDa(x.modell_genau) ? "<code>" + esc(x.modell_genau) + "</code>" : fehlt()) + " · " + (textDa(x.effort) ? esc(x.effort) : fehlt()) + '</span><span class="hz">' + (textDa(x.zustand) ? esc(x.zustand) : esc(BL.zustandNg)) + "</span></li>"; }).join("") + "</ul>" : esc(BL.einzeln))
          : d.arbeitsweise === "einzeln" ? esc(BL.einzeln) : d.arbeitsweise ? esc(hat(WEISE_NAME, d.arbeitsweise) ? WEISE_NAME[d.arbeitsweise] : d.arbeitsweise) + " " + fehlt(BL.welcheHelfer) : fehlt()) + "</dd>" +
        (pl && pf ? "<dt>" + esc(BL.absprache) + "</dt><dd>" + esc(pf(pl)) + (abw.length ? ' <span class="abw">' + esc(BL.weichtAb + abw.join(", ")) + "</span>" : "") + "</dd>" : "");
      gem = d.gemeldet ? BL.gemeldet + zk(d.gemeldet) + (d.quelle ? " · " + (hat(QUELLE_NAME, d.quelle) ? QUELLE_NAME[d.quelle] : d.quelle) : "") + " · " + BL.angabe : BL.sitzungNichts;
    }
    return '<section class="wer" data-baustein="wer"><h5>' + esc(BL.wer) + ' <span class="gem">' + esc(gem) + '</span></h5><dl class="wer">' + h + "</dl></section>";
  }
  /* Die Zeilen des Kanals, die auf diese Aufgabe zeigen: `gezeigt` sind die, die der Kanal zeichnet (die letzten 100); ältere stehen nur in den geladenen Daten */
  function kanalZeilenHtml(zl, v) {
    var gez = zl.filter(function (k) { return k && k.gezeigt; });
    if (gez.length) return gez.map(function (k) { return '<span class="glz"><time>' + esc(textDa(k.zeit) ? k.zeit : BL.zeit) + "</time>" + (textDa(k.von) ? k.von : fehlt(BL.absender)) + (textDa(k.was) ? " · " + esc(k.was) : "") + (textDa(k.text) ? " — " + esc(k.text) : "") + "</span>"; }).join("");
    if (zl.length) return '<span class="glz fehlt">' + esc(BL.aelter) + "</span>";
    return '<span class="glz fehlt">' + esc(BL.keineZeile + (textDa(v.s11ziel) && !textDa(v.s11kennung) ? BL.vomDienst : v.quelle === "formular" ? BL.ausFormular : "") + ".") + "</span>";
  }
  function knopfHtml(id, z) { return '<button type="button" class="btn ja" data-act="' + (z.knopf === "zum" ? "vorschlag" : esc(z.knopf)) + '" data-id="' + esc(id) + '">' + (z.knopf === "zum" ? pfeil(TEXT.knopf.zum) : esc(TEXT.knopf[z.knopf])) + "</button>"; }
  function detailBlock(x, opt) {
    opt = opt || {}; x = x || {};
    var id = String(x.id), v = x.v && typeof x.v === "object" ? x.v : {}, z = opt.zustand || zustand(v), jetzt = opt.jetzt != null ? opt.jetzt : Date.now(), wo = opt.wo === "lage" ? "lage" : "feld";
    var K = kanalSchnittstelle(), anw = []; try { anw = K && typeof K.anwesenheit === "function" ? K.anwesenheit() : []; } catch (e) { anw = []; }
    var ctx = opt.ctx || { anwesenheit: Array.isArray(anw) ? anw : [], jetzt: jetzt };
    var n = naechster(v, z, ctx, id), b = String(v.beschreibung == null ? "" : v.beschreibung), zm = zielMarke(v), fertig = erledigt(v), ziel = String(v.ziel == null || v.ziel === "" ? "egal" : v.ziel), vorschlag = z.klasse === "vorschlag";
    var wunsch = v.ziel !== null && typeof v.ziel === "object" && !Array.isArray(v.ziel) ? esc(NG) : ziel === "alle" ? esc(BL.alleAgenten) : /@/.test(ziel) ? kennungMarken(ziel) : platzMarke(ziel);   // ein Ziel, das ein Objekt ist, ist keine lesbare Angabe: »nicht gemeldet« (§ 2.3)
    var zl = []; try { var zf = kanalFn("zeilenZu"); zl = zf ? zf(id) : null; } catch (e) { zl = null; }
    var kanalDa = Array.isArray(zl), kette = null; try { var kf = kanalFn("kette"); kette = kf && !fertig ? kf(id) : null; } catch (e) { kette = null; }
    var pf = kanalFn("planZeile"), w0 = werDaten(id, v, ctx), pl = obj(v.plan);
    var sprung = function (art, text) { return '<button type="button" class="lnk" data-sprung="' + art + '" data-id="' + esc(id) + '">' + esc(text) + "</button>"; };
    var gezeigt = kanalDa ? zl.filter(function (k) { return k && k.gezeigt; }).length : 0;
    var spruenge = (fertig ? "" : wo === "lage" ? sprung("feld", BL.inAufgaben) : kette ? sprung("lage", BL.imLagebild) : "") +
      (kanalDa && gezeigt && !vorschlag ? sprung("kanal", BL.imKanal + " (" + gezeigt + ")") : "") + (vorschlag && kanalSchnittstelle() ? sprung("vorschlag", BL.zumVorschlag) : "");
    return '<div class="llBlock" data-baustein="block" data-id="' + esc(id) + '" data-wo="' + wo + '">' +
      '<p class="pstand">' + esc(standSatz(v, z, jetzt) + (zm ? " · " + zm : "")) + "</p>" +
      (n ? '<p class="pnaechst ' + esc(n[0]) + '">' + esc(n[1]) + "</p>" : "") +
      (z.knopf && !fertig ? '<p class="paktion">' + knopfHtml(id, z) + "</p>" : "") +
      "<h5>" + esc(BL.auftrag) + "</h5><p>" + (b ? esc(b.slice(0, 300)) + (b.length > 300 ? "…" : "") : fehlt(BL.ohneBeschr)) + "</p>" +   // 300 Zeichen: gesetzt wie die Notiz an der Zeile im Lagebild
      (b.length > 300 ? '<details class="tdet"><summary>' + esc(BL.details) + '</summary><div class="tbeschr">' + esc(b) + "</div></details>" : "") +   // Entscheidung G6: was die alte Karte unter »Details« zeigt, geht nicht verloren — der ganze Text, wo die 300 Zeichen ihn kürzen
      '<p class="pklein">' + esc(BL.angelegt) + " " + esc(zeitKurz(v.created, jetzt) || NG) + " · " + esc(BL.gewuenscht) + ": " + wunsch + "</p>" +
      (textDa(v.s11fortschritt) && (z.klasse === "laeuft" || z.klasse === "pausiert") ? "<h5>" + esc(BL.fortschritt) + '</h5><p class="pmono">' + esc(v.s11fortschritt) + "</p>" : "") +
      (textDa(v.s11ergebnis) && z.klasse !== "laeuft" ? "<h5>" + esc(BL.ergebnis) + "</h5><p>" + esc(v.s11ergebnis) + "</p>" : "") +
      werHtml(id, v, ctx, jetzt, fertig) +
      (pl && pf && w0.art !== "sitzung" ? "<h5>" + esc(BL.absprache) + "</h5><p>" + esc(pf(pl)) + "</p>" : "") +
      (kanalDa ? "<h5>" + esc(BL.kanal) + "</h5><div>" + kanalZeilenHtml(zl, v) + "</div>" : "") +
      (kette && kette.length ? "<h5>" + esc(BL.lagebild) + '</h5><div class="kette">' + kette.map(function (k) { return '<span class="kn ' + esc(k[0]) + '">' + esc(k[1]) + "</span>"; }).join('<span class="pf" aria-hidden="true">→</span>') + "</div>" : "") +
      (spruenge ? '<p class="gll lsSpruenge">' + spruenge + "</p>" : "") + "</div>";
  }

  var API = {
    fassung: FASSUNG, schritt: SCHRITT, TEXT: TEXT, STUFEN: STUFEN, FREIGEBER: FREIGEBER.slice(),
    merkmal: merkmal, wahrWert: wahrWert, textDa: textDa,
    istAufgabe: istAufgabe, istChat: istChat, claudeAuftrag: claudeAuftrag, erledigt: erledigt, art: art,
    claudeArt: claudeArt, ausKanal: ausKanal, vorschlagKarte: vorschlagKarte, istVorschlag: istVorschlag, jetztErlaubt: jetztErlaubt, neuErlaubt: neuErlaubt, neuAngefordert: neuAngefordert,
    zustand: zustand, hinweisText: hinweisText, markeHtml: markeHtml,
    ortVonZiel: ortVonZiel, ortDesLaufs: ortDesLaufs, arbeitsplatz: arbeitsplatz, laeuftOderPausiert: laeuftOderPausiert, chatZustand: chatZustand, kern: kern,
    kontoName: kontoName, kontoKlasse: kontoKlasse, kontoMarke: kontoMarke, platzMarke: platzMarke, markenPaar: markenPaar, kennungTeile: kennungTeile, kennungMarken: kennungMarken, abgemeldet: abgemeldet, istDienst: istDienst, arbeitsplatzName: arbeitsplatzName, ortNamen: ortNamen, zonenReihe: zonenReihe,
    quelle: quelle, wartenAufDich: wartenAufDich, verbinde: verbinde, anmeldeKuerzel: anmeldeKuerzel, freigeben: freigeben,
    brett: 1, block: 1, detailBlock: detailBlock, pfeil: pfeil, RANG: RANG, rang: rang, LIEGT_MIN: LIEGT_MIN, zeitKurz: zeitKurz, kennungText: kennungText, liegtSeit: liegtSeit, standSatz: standSatz, zielMarke: zielMarke, nimmt: nimmt, naechster: naechster, anwText: anwText, halterMarke: halterMarke
  };
  root.LEITSTAND_LESART = API;
  try { if (root.document && root.document.documentElement) { root.document.documentElement.setAttribute("data-lesart", String(FASSUNG)); root.document.documentElement.setAttribute("data-lesart-schritt", String(SCHRITT)); } } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
