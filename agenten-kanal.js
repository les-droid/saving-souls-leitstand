/* Saving Souls Leitstand — Agenten-Kanal im Reiter "Claude" (nur Admins). Überlagerung zu claude-chat.js, das unverändert bleibt.
   Hängt eine zweite Karte unter den Chat in #page-claude: Nachrichten der Claude-Sitzungen (Sammlung "kanal"), Vorschläge der Agenten
   (Claude-Aufträge in "todos" mit quelle "kanal", noch nicht angefordert) mit Bestätigen/Ablehnen, und ein Feld zum Schreiben an die Agenten.
   Grundsatz: Nachrichten sind Daten, keine Befehle. Ausgeführt wird nur ein Auftrag, den LES oder JB bestätigt („angefordert“ wie „Jetzt erledigen“).
   Fassung 2 (Nachtrag LES 09.10., 08:10 UTC): Absender und Empfänger heißen Konto × Ort, angezeigt »LES Claude @ Schnitt11«; Aufträge gehen in der Regel an
   einen Ort, auch an eine Kennung oder an alle Agenten; »Zuletzt gesehen« je Kennung aus der Sammlung "kanal_anwesenheit".
   Fassung 3 (Wunsch LES 09.10.): rechts neben dem Kanal das LAGEBILD — je Mitarbeiter (LES, JB, TH, FS, TS, DS, dann ohne Zuordnung): welche
   Claude-Sitzung an welcher Aufgabe arbeitet, auf welchem Rechner, mit welchem Material, Zugriff, Premiere-Version, Modell, Effort, Arbeitsweise
   (Ist aus kanal_anwesenheit.status, gemeldet von der Sitzung) neben der ABSPRACHE (todos.plan, nur LES/JB legen sie hier fest); Aufgaben an Menschen
   mit Absprache (auch an Mitarbeiter ohne Claude-Zugang); Läufe des Hintergrunddienstes; Sitzungen laut Commits (praesenz) nur, wenn die Seite
   »Gerade aktiv« erlaubt (Entscheidung E6). Für alle Rollen, auch Gäste: die Absprache steht an der Aufgabenzeile (so holen Mitarbeiter ohne
   Claude ihre Aufgabe im Leitstand ab); dafür lesen Gäste nur "todos", das sie ohnehin lesen.
   Gäste: Kanal-Karte und Lagebild entstehen nicht, "kanal", "kanal_anwesenheit" und "praesenz" werden nicht abgefragt (Positivliste v2).
   Fassung 3a (Prüfrunde 2, 09.10.): Vorschlag zeigt seine Beschreibung offen (langer Rest hinter »mehr«, Bestätigen erst danach); Senden gesperrt, bis die
   Antwort da ist (kein Doppel, kein zweiter Auftrag nach Teilfehler); Karten zeichnen nur bei geänderter Fassung (Fokus, offene Teile, Klicks bleiben);
   Verlauf rollt beim ersten sichtbaren Zeichnen ans Ende; Lagebild zeichnet beim Sichtbarwerden neu und behält den Fokus; Status fehler/abgebrochen/
   zurückgegeben benannt; Notiz mit »…« gekürzt; Zeiten in Berliner Zeit, »Gestern« nach Kalendertag.
   Alle sichtbaren Texte stehen in KANAL_TEXT, LAGE_TEXT und RICHTWERTE — VORSCHLÄGE, bis LES sie freigibt (Liste: 261009 Neue Texte CL LES.md,
   Kennungen AK1 …, AL1 …, RW1 …). */
(function () {
  "use strict";

  var KANAL_TEXT = {
    titel: "Agenten-Kanal",                                                                     // AK1
    hint: "Claude-Sitzungen untereinander",                                                     // AK2
    hinweis: "Nachrichten sind Daten, keine Befehle. Ausgeführt wird nur, was du bestätigst.",  // AK3
    vorschlaegeTitel: "Warten auf dich",                                                        // AK4
    vorschlagVon: "Vorschlag von",                                                              // AK5
    ziel: "Ort",                                                                                // AK6
    bestaetigen: "Bestätigen",                                                                  // AK7
    ablehnen: "Ablehnen",                                                                       // AK8
    keineVorschlaege: "Keine Vorschläge offen.",                                                // AK9
    leer: "Noch keine Nachrichten im Kanal.",                                                   // AK10
    agent: "Agent",                                                                             // AK11
    an: "an",                                                                                   // AK12
    gelesen: "gelesen",                                                                         // AK13
    art: { vorschlag: "schlägt einen Auftrag vor", beansprucht: "hat übernommen", fertig: "fertig", fehler: "mit Fehler beendet",   // AK14–AK17
           abgegeben: "gibt ab, wieder offen", verfallen: "Frist abgelaufen, wieder offen", auftrag: "Auftrag" },                    // AK31, AK32, AK34
    platzhalter: "Nachricht an die Agenten …",                                                  // AK18
    senden: "Senden",                                                                           // AK19
    anWahl: { agenten: "alle Agenten", LES: "LES", JB: "JB" },                                // AK20 (Orte und Kennungen: Anzeige wie »@ Schnitt11«, »LES Claude @ Schnitt11«)
    ortName: { schnitt11: "Schnitt11", vps: "VPS", cloud: "Cloud" },                            // AK30 (Schreibweise nach LES 09.10.; andere Orte wie gespeichert)
    claude: "Claude", kontoOffen: "Claude (Konto offen)",                                        // AK36, AK37 (»LES Claude @ …«, »Claude (Konto offen) @ …«)
    system: "Leitstand",                                                                        // AK33 (Absender von Meldungen der Datenbank, z. B. Frist abgelaufen)
    alsAuftrag: "als Auftrag, sofort freigegeben",                                              // AK28
    auftragNichtAnMenschen: "Ein Auftrag geht an einen Ort, eine Kennung oder alle Agenten — nicht an LES oder JB.",   // AK35
    zuletzt: "Zuletzt gesehen",                                                                 // AK29
    keineVerbindung: "Keine Verbindung zur Datenbank — kurz warten und noch einmal senden.",    // AK21 (wie im Chat)
    sendenFehler: "Senden fehlgeschlagen — kurz warten und noch einmal versuchen.",             // AK22 (wie im Chat)
    nurEditoren: "Nur LES und JB schreiben in den Kanal und bestätigen Aufträge.",              // AK23
    bestaetigtMeldung: "Bestätigt — der Auftrag ist freigegeben.",                              // AK24
    abgelehntMeldung: "Abgelehnt.",                                                             // AK25
    aktionFehler: "Nicht gespeichert — kurz warten und noch einmal versuchen.",                 // AK26
    beschreibung: "Beschreibung",                                                               // AK27
    planVorschlag: "Absprache-Vorschlag",                                                       // AK38 (an einem Vorschlag; Bestätigen übernimmt ihn als Absprache)
    heute: "Heute", gestern: "Gestern",                                                         // AK39, AK40 (Trenner zwischen den Tagen im Verlauf)
    enterHinweis: "Enter sendet, Umschalt+Enter macht eine neue Zeile.",                        // AK41 (Titel am Eingabefeld; nur mit Maus/Tastatur)
    mehr: "mehr", zeichen: "Zeichen",                                                           // AK42, AK43 (langer Rest der Beschreibung: »mehr (1234 Zeichen)«)
    erstLesen: "Erst die ganze Beschreibung lesen — dann bestätigen.",                          // AK44
    sendenTeil: "Der Auftrag ist angelegt, nur die Zeile im Kanal fehlt — Text nicht ändern und noch einmal senden.",   // AK45
    verlaufVoll: "Der Verlauf ist unvollständig — die Datenbank liefert höchstens 1000 Einträge, die neuesten können fehlen."   // AK46
  };
  var LAGE_TEXT = {
    titel: "Lagebild",                                                                          // AL1
    hint: "wer an was, wo, womit",                                                              // AL2
    leer: "Gerade arbeitet niemand an einer abgesprochenen Aufgabe, und keine Claude-Sitzung meldet sich.",   // AL3
    commits: "Sitzung laut Commits seit ",                                                      // AL6 (+ HH:MM; wie »Gerade aktiv«)
    ohneMeldung: "meldet sich nicht im Kanal",                                                  // AL7
    schnitt11: "Schnitt 11: Sitzung läuft seit ",                                               // AL8 (wie »Gerade aktiv«)
    dienst: "Hintergrund\u00addienst",                                                         // AL9 (Listener ohne Kennung; weiches Trennzeichen für schmale Kästen)
    aufgabe: "Aufgabe", thema: "Thema", ist: "Ist", absprache: "Absprache", abweichung: "weicht ab",   // AL10–AL14
    material: "Material", zugriff: "Zugriff", erreichbar: "erreichbar", premiere: "Premiere", projekt: "Projekt",   // AL15–AL19
    details: "Details", notiz: "Notiz", rechner: "Rechner", konto: "Konto", modell: "Modell", effort: "Effort",   // AL20–AL25
    arbeitsweise: "Arbeitsweise", stand: "Stand", mitarbeiter: "Mitarbeiter", zuletzt: "zuletzt",                 // AL26–AL29
    laeuftAuf: "läuft auf ", wartet: "pausiert", freigegeben: "freigegeben, noch nicht übernommen",                // AL30–AL32
    aendern: "Absprache ändern",                                                                // AL33
    zustand: { arbeitet: "arbeitet", wartet: "wartet", pause: "Pause", fertig: "fertig" },       // AL34
    standName: { geplant: "geplant", in_arbeit: "in Arbeit", pausiert: "pausiert" },              // AL35
    kontoName: { egal: "Konto egal", ohne: "ohne Claude" },                                     // AL36 (sonst »LES Claude«, »Dropout Claude«)
    modellName: { opus: "Opus", sonnet: "Sonnet", haiku: "Haiku" },                             // AL37
    arbeitsweiseName: { einzeln: "einzeln", subagenten: "mit Sub-Agenten", workflow: "Workflow" },   // AL38
    zugriffName: { "raid-s11": "RAID Schnitt 11", expansion: "Expansion", "backup-327": "Backup 327", frameio: "Frame.io", repo: "Repo", "cloud-xml": "Cloud-XML", lokal: "lokal" },   // AL39 (wie kanal CL LES.mjs)
    quelle: { git: "aus git", umgebung: "aus der Umgebung", angabe: "angegeben", laufend: "läuft gerade" },   // AL40
    editorTitel: "Absprache festlegen",                                                         // AL41
    editorHinweis: "Gilt für Claude-Aufträge und Aufgaben an Menschen. Bei Claude-Aufträgen übernimmt nur das abgesprochene Konto; Modell, Effort und Arbeitsweise meldet die Sitzung, das Lagebild zeigt Abweichungen.",   // AL42
    waehlen: "— Aufgabe wählen —", leerWahl: "—",                                                 // AL43, AL44
    richtwert: "Richtwert", richtwertHinweis: "Richtwerte aus dem Entwurf Nachtbetrieb und Rechenverteilung, noch nicht entschieden. Übernommen werden Modell und Effort, Ort und Konto nur, wo der Entwurf sie nennt.",   // AL45, AL46
    pruefungLaut: "Prüfung laut Entwurf: ",                                                     // AL71
    materialHinweis: "mehrere mit ; trennen",                                                    // AL47
    speichern: "Speichern", entfernen: "Absprache entfernen",                                    // AL48, AL49
    gespeichert: "Absprache gespeichert.", entfernt: "Absprache entfernt.",                      // AL50, AL51
    keineAufgabe: "Erst eine Aufgabe wählen.",                                                   // AL52
    ungueltig: "Nicht gespeichert — bitte die markierten Angaben prüfen.",                        // AL53
    claudeAuftrag: "Claude",                                                                    // AL54 (Zusatz in der Aufgabenwahl)
    spalten: ["Mitarbeiter", "Arbeitsplatz · Rechner", "Aufgabe", "Speicher"],                  // AL55 (Spaltenköpfe der Grafik)
    warteTitel: "wartet auf Übernahme", nichtFreigegeben: "noch nicht freigegeben",             // AL56, AL57
    zoneEgal: "Ort egal", zoneOffen: "Rechner offen",                                           // AL58, AL59 (Zonen ohne festen Rechner)
    tippHinweis: "Auf einen Kasten zeigen oder tippen — der ganze Strang leuchtet auf, die Einzelheiten stehen hier.",   // AL60
    schliessen: "Schließen", links: "davor", rechts: "danach", kennung: "Kennung", zustandWort: "Zustand",   // AL61–AL65
    praesenzWort: "laut Commits", art: "Art", mensch: "Mensch am Rechner", festgelegt: "Absprache von",     // AL66–AL69
    gaesteHinweis: "Achtung: Bei Aufgaben für Menschen steht die Absprache an der Aufgabenzeile — auch Gäste lesen sie. Nichts Internes eintragen.",   // AL74 (im Formular)
    endstand: { fehler: "mit Fehler beendet", abgebrochen: "abgebrochen", zurueckgegeben: "zurückgegeben, wieder offen" },   // AL75–AL77 (Stand eines Claude-Auftrags nach Ende ohne Erfolg)
    ergebnis: "Ergebnis",                                                                       // AL78 (Zeile in den Details: was der Lauf zuletzt gemeldet hat)
    reichweite: "Strang", aufwaerts: "aufwärts", abwaerts: "abwärts",                           // AL72 (Zahl der Kästen davor/danach über alle Stufen)
    sigel: { mitarbeiter: "MENSCH", claude: "CLAUDE", mensch: "OHNE CLAUDE", dienst: "DIENST", warte: "OFFEN", aufgabe: "AUFGABE", thema: "THEMA", speicher: "SPEICHER" },   // AL73 (Kennzeichen oben im Kasten)
    legende: [["mitarbeiter", "Mitarbeiter"], ["claude", "Claude-Sitzung"], ["mensch", "ohne Claude / mit Absprache"], ["dienst", "Hintergrunddienst"],
              ["warte", "wartet auf Übernahme"], ["aufgabe", "Aufgabe"], ["speicher", "Speicher"], ["laeuft", "läuft"], ["plan", "abgesprochen"], ["abweichung", "weicht ab"]]   // AL70
  };
  /* Richtwerte (RW1–RW11) aus dem Entwurf »Nachtbetrieb und Rechenverteilung« (konzept/betrieb-261009 CL LES/, § 3, Matrix Aufgabe → Ort → Konto →
     Modell, Aufwand → Prüfung) — von LES noch NICHT entschieden, daher nur Vorschlag. Aufgaben ohne Claude (Skript, Transkription) fehlen. Übernommen werden
     Modell und Aufwand, dazu Ort und Konto nur, wo der Entwurf sie eindeutig nennt; »Konto mit mehr Rest«, »Konto der Sitzung«, »VPS oder Schnitt 11«
     bleiben offen. Die Arbeitsweise nennt der Entwurf nicht — sie bleibt frei. Die Prüfung steht als Hinweis unter der Auswahl. */
  var RICHTWERTE = [
    { name: "Überwachungslauf, Lagebericht", ort: "vps", konto: "Dropout", modell: "sonnet", effort: "low", pruefung: "Shell; Ausfall als Warnung" },                       // RW1
    { name: "Board-Chat, Lesefragen", ort: "vps", konto: "Dropout", modell: "sonnet", effort: "medium", pruefung: "Vermerk »ungeprüfter Vorschlag«" },                // RW2
    { name: "Board »Jetzt erledigen« (lesend)", konto: "Dropout", modell: "opus", effort: "medium", pruefung: "Mensch" },                                            // RW3
    { name: "Projekt bauen (nachts)", ort: "cloud", modell: "sonnet", effort: "medium", pruefung: "Prüfskript; zweiter Bau byte-gleich" },                          // RW4
    { name: "Plan bei Konflikten", ort: "cloud", modell: "opus", effort: "medium", pruefung: "frischer Prüfer Sonnet, high" },                                       // RW5
    { name: "Premiere-Schritt von Hand", ort: "schnitt11", konto: "LES", modell: "opus", effort: "medium", pruefung: "Zählskript, Mensch" },                         // RW6
    { name: "Sichtungsexport, Render", ort: "schnitt11", modell: "sonnet", effort: "medium", pruefung: "Zählskript" },                                              // RW7
    { name: "Zahlen und Zitate nachprüfen", modell: "sonnet", effort: "high", pruefung: "Vollzähl-Tabelle" },                                                       // RW8
    { name: "Redaktion, Sperren, Einwilligung", modell: "opus", effort: "high", pruefung: "frische Prüfer für Kritik und Zuschauerblick (Opus), höchstens 2 Runden" },      // RW9
    { name: "Leitstand-Code", ort: "cloud", modell: "opus", effort: "medium", pruefung: "Prüfer Opus high, Gegenprüfer Sonnet high" },                           // RW10 (Entwurf: bei der Datenbank Aufwand high — steht nur in der Textliste)
    { name: "Förder-Scan", konto: "JB", modell: "sonnet", effort: "medium", pruefung: "JB" }                                                                       // RW11
  ];
  var MITARBEITER = ["LES", "JB", "TH", "FS", "TS", "DS"], KONTEN = ["LES", "JB", "Dropout"];
  var MODELLE = ["opus", "sonnet", "haiku"], EFFORTS = ["low", "medium", "high", "xhigh", "max"], ARBEITSWEISEN = ["einzeln", "subagenten", "workflow"];
  var ZUGRIFFE = ["raid-s11", "expansion", "backup-327", "frameio", "repo", "cloud-xml", "lokal"], STAENDE = ["geplant", "in_arbeit", "pausiert"];
  var PREMIERE = /^[0-9]{1,2}(\.[0-9]{1,2}){0,2}$/;                                           // wie kanal_felder (SQL)
  var STEUER = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;   // wie kanal_text (SQL): Steuer- und Richtungszeichen
  var FMT_HHMM = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });   // wie »Gerade aktiv«
  var AKTIV_MS = 45 * 60000, SICHTBAR_MS = 12 * 3600000;                                       // aktiv wie »Wer arbeitet gerade« (45 min); ältere Sitzungen bis 12 h blass
  var ORTE = ["schnitt11", "vps", "cloud", "macbook12"];                                       // feste Auswahl; weitere Kennungen kommen aus der Anwesenheit
  var MAX_ANZEIGE = 100;

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var iso = function () { return new Date().toISOString(); };
  function ich() {   // Kürzel aus der Anmeldung, nicht aus „Ich bin“
    var c = window.claude || {}, k = null;
    try { k = (c.kuerzel && c.kuerzel()) || (c.rolle && c.rolle() && c.rolle().kuerzel) || null; } catch (e) { k = null; }
    return k === "LES" || k === "JB" ? k : null;
  }
  /* Alle Zeiten und Kalendertage in Berliner Zeit (wie die übrige Seite), nie in der Zeit des Geräts; »Gestern« über die Tagesrechnung, nicht über −24 h */
  var FMT_TAGTEILE = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });
  var FMT_DATUMZEIT = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  function berlinTag(t) {   // Kalendertag in Berlin als JJJJ-MM-TT
    var p = {}; FMT_TAGTEILE.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day;
  }
  function tagPlus(tag, n) {   // reine Kalenderrechnung (UTC), unabhängig von Sommer-/Winterzeit
    var m = /^(\d+)-(\d+)-(\d+)$/.exec(tag), d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n));
    return d.toISOString().slice(0, 10);
  }
  function fmtZeit(isoStr) {
    var t = ms(isoStr); if (t == null) return "";
    return berlinTag(t) === berlinTag(Date.now()) ? FMT_HHMM.format(new Date(t)) : FMT_DATUMZEIT.format(new Date(t));
  }
  function istAgent(v, upd) { return v.rolle === "agent" || /^agent:/.test(String(upd || "")); }
  function chip(wer) { return '<span class="chip ' + (wer === "LES" || wer === "JB" ? esc(wer) : "Claude") + '">' + esc(wer || "?") + "</span>"; }
  /* Anzeige einer Kennung oder eines Ziels — dieselbe Regel wie kanal_anzeige (SQL) und kanal CL LES.mjs */
  function ortName(o) { return KANAL_TEXT.ortName[o] || o; }
  function anzeige(k) {
    k = String(k == null ? "" : k);
    var m = /^([^@]+)@(.+)$/.exec(k);
    if (m) return (m[1] === "?" ? KANAL_TEXT.kontoOffen : m[1] === "Dienst" ? "Dienst" : m[1] + " " + KANAL_TEXT.claude) + " @ " + ortName(m[2]);   // »Dienst« (VPS-Wächter) ist keine Claude-Sitzung (KB6)
    if (KANAL_TEXT.anWahl[k]) return KANAL_TEXT.anWahl[k];
    if (k === "alle" || k === "egal") return k;
    return "@ " + ortName(k);
  }
  function anName(a) { return anzeige(a || "alle"); }

  var db = null, karte, verlaufEl, vorschlagEl, formEl, textEl, anEl, auftragEl, meldungEl, anwEl;
  var letzteId = null, kennungen = [];
  var todos = [], todoIndex = {}, anwesenheit = [], praesenz = [];
  var lageEl, lageMeldEl, edForm, edWahl;
  var KANAL_GRENZE = 1000;   // mehr liefert die Datenbank je Abfrage nicht (leitstand-db.js, ladeCollection ohne Seiten): ab hier kann der Verlauf unvollständig sein

  function meldung(t) { if (!meldungEl) return; meldungEl.textContent = t || ""; meldungEl.hidden = !t; }
  /* Nur schreiben, wenn sich der Inhalt geändert hat (wie setzeHtml der Seite): sonst gehen offene Teile, Fokus, markierter Text und halbe Klicks verloren */
  function setzeHtml(el, html) { if (!el || el._html === html) return false; el.innerHTML = html; el._html = html; return true; }
  function fokusVon(wurzel) {   // das fokussierte Element in dieser Wurzel, beschrieben durch Karten-ID, Aktion und Kasten-Schlüssel
    var a = document.activeElement; if (!a || a === document.body || !wurzel || !wurzel.contains(a)) return null;
    var li = a.closest ? a.closest("li[data-id]") : null;
    return { id: li ? li.dataset.id : null, act: a.dataset ? a.dataset.act || null : null, key: a.dataset ? a.dataset.key || null : null, tag: a.tagName };
  }
  function fokusZurueck(wurzel, f) {
    if (!f || !wurzel) return;
    var k = [].filter.call(wurzel.querySelectorAll(f.key ? "[data-key]" : f.act ? "button[data-act]" : f.tag.toLowerCase()), function (e) {
      if (f.key) return e.dataset.key === f.key;
      var li = e.closest("li[data-id]"); return !!li && li.dataset.id === f.id && (e.dataset.act || null) === f.act;
    })[0];
    if (k && k !== document.activeElement && k.focus) k.focus({ preventScroll: true });
  }

  /* Verlauf wie ein Messenger: eigene Nachrichten rechts (Kürzel der Anmeldung), Team und Agenten links mit Kürzel-Bild, Meldungen des Leitstands
     mittig als Pille, Trenner je Tag (Berliner Zeit wie die übrige Seite). Kein Text aus der Datenbank ohne esc(). */
  var FMT_TAGKURZ = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit" });
  function uhr(isoStr) { var t = ms(isoStr); return t == null ? "" : FMT_HHMM.format(new Date(t)); }
  function tagText(isoStr) {
    var t = ms(isoStr); if (t == null) return "";
    var k = berlinTag(t), heute = berlinTag(Date.now());
    return k === heute ? KANAL_TEXT.heute : k === tagPlus(heute, -1) ? KANAL_TEXT.gestern : FMT_TAGKURZ.format(new Date(t));
  }
  function bildText(v, agent) {   // Kürzel im runden Bild: Konto des Agenten (»?« offen) bzw. Kürzel im Team
    var k = agent ? String(v.konto || (/^([^@]+)@/.exec(String(v.von || "")) || [])[1] || "?") : String(v.von || "?");
    return k === "Dropout" ? "DO" : k.slice(0, 3);
  }
  function zeileNachricht(id, v) {
    var agent = v.rolle === "agent", system = v.rolle === "system", artTxt = v.art && v.art !== "nachricht" ? KANAL_TEXT.art[v.art] || v.art : "";
    var von = agent ? anzeige(v.von) : system ? KANAL_TEXT.system : v.von, eigen = !agent && !system && !!v.von && v.von === ich();
    var gel = v.gelesen && typeof v.gelesen === "object" ? Object.keys(v.gelesen).sort().map(function (p) { return esc(anzeige(p)) + " " + esc(uhr(v.gelesen[p])); }).join(" · ") : "";
    var was = artTxt ? '<div class="akWas">' + esc(artTxt) + (v.titel ? " · <q>" + esc(v.titel) + "</q>" : "") + "</div>" : "";
    if (system) return '<li class="akMsg akSystem" data-id="' + esc(id) + '"><div class="akPille"><span class="akVon">' + esc(von) + "</span>" + was +
      '<span class="akAn">' + esc(KANAL_TEXT.an) + " " + esc(anName(v.an || "alle")) + '</span><time class="akUhr">' + esc(uhr(v.created)) + "</time></div></li>";
    return '<li class="akMsg' + (agent ? " akAgent" : " akTeam") + (eigen ? " akEigen" : "") + '" data-id="' + esc(id) + '">' +
      (eigen ? "" : '<span class="akBild' + (agent ? " akBildAgent" : " " + esc(String(v.von || ""))) + '" aria-hidden="true">' + esc(bildText(v, agent)) + "</span>") +
      '<div class="akBlase"><div class="akMeta">' + (agent ? '<span class="akArt">' + esc(KANAL_TEXT.agent) + "</span>" : "") +
        (eigen ? "" : '<span class="akVon">' + esc(von) + "</span>") + '<span class="akAn">' + esc(KANAL_TEXT.an) + " " + esc(anName(v.an || "alle")) + "</span></div>" +
        was + (v.text ? '<div class="akText">' + esc(v.text) + "</div>" : "") + '<time class="akUhr">' + esc(uhr(v.created)) + "</time></div>" +
      (gel ? '<div class="akGelesen">✓ ' + esc(KANAL_TEXT.gelesen) + ": " + gel + "</div>" : "") +
      "</li>";
  }
  /* Was bestätigt wird, steht vor dem Knopf: die Beschreibung (sie wird später ausgeführt) offen, nur ein langer Rest hinter »mehr« — und Bestätigen
     erst, nachdem »mehr« einmal aufgeklappt war (aktion). */
  var BESCHR_SICHTBAR = 500, BESCHR_ZEILEN = 10, vorschlagOffen = {}, vorschlagGelesen = {};   // offen: die ersten 500 Zeichen, höchstens 10 Zeilen; je Vorschlag: »mehr« offen / aufgeklappt gewesen
  function beschreibungTeile(b) {   // [offener Anfang, Rest]; trennt kein Zeichenpaar; viele Zeilenumbrüche schieben nichts aus dem Blick
    var n = Math.min(b.length, BESCHR_SICHTBAR), zeilen = 0;
    for (var i = 0; i < n; i++) if (b.charAt(i) === "\n" && ++zeilen >= BESCHR_ZEILEN) { n = i; break; }
    if (n < b.length && n > 0 && b.charCodeAt(n - 1) >= 0xd800 && b.charCodeAt(n - 1) <= 0xdbff) n -= 1;
    return n < b.length ? [b.slice(0, n), b.slice(n)] : [b, ""];
  }
  function beschreibungHtml(b) {
    var t = beschreibungTeile(String(b));
    return '<div class="akBeschr"><span class="akLabel">' + esc(KANAL_TEXT.beschreibung) + '</span><div class="akText">' + esc(t[0]) + (t[1] ? "…" : "") + "</div>" +
      (t[1] ? '<details class="akMehr"><summary>' + esc(KANAL_TEXT.mehr) + " (" + t[1].length + " " + esc(KANAL_TEXT.zeichen) + ')</summary><div class="akText">' + esc(t[1]) + "</div></details>" : "") + "</div>";
  }
  function zeileVorschlag(id, v) {
    return '<li class="akVorschlag" data-id="' + esc(id) + '">' +
      '<div class="akMeta"><span class="akArt">' + esc(KANAL_TEXT.vorschlagVon) + "</span>" + chip(anzeige(v.vorgeschlagenVon)) +
        "<span>" + esc(KANAL_TEXT.ziel) + ": " + esc(anName(v.ziel || "egal")) + "</span><span>" + esc(fmtZeit(v.vorgeschlagenAm || v.created)) + "</span></div>" +
      '<div class="akTitel">' + esc(v.text) + "</div>" +
      (v.beschreibung ? beschreibungHtml(v.beschreibung) : "") +
      (obj(v.planVorschlag) && planZeile(v.planVorschlag, true) ? '<div class="akPlan">' + esc(KANAL_TEXT.planVorschlag) + ": " + esc(planZeile(v.planVorschlag, true)) + "</div>" : "") +
      '<div class="akKnoepfe"><button type="button" class="akBtn akJa" data-act="ja">' + esc(KANAL_TEXT.bestaetigen) + '</button>' +
      '<button type="button" class="akBtn akNein" data-act="nein">' + esc(KANAL_TEXT.ablehnen) + "</button></div></li>";
  }

  /* Verlauf: nur bei geänderter Fassung neu geschrieben (Lesestelle, markierter Text bleiben); neue Nachrichten sagt ein eigener, unsichtbarer Bereich an,
     nicht der ganze Verlauf; war der Reiter beim ersten Zeichnen verborgen, rollt der Verlauf beim ersten Sichtbarwerden ans Ende. */
  var verlaufRoll = { offen: false, neu: null }, angesagt = null;
  function kurzNachricht(v) {   // wie in der Blase: Absender, Empfänger, Art und Titel, Text
    var agent = v.rolle === "agent", system = v.rolle === "system", artTxt = v.art && v.art !== "nachricht" ? KANAL_TEXT.art[v.art] || v.art : "";
    var von = agent ? anzeige(v.von) : system ? KANAL_TEXT.system : v.von;
    return [von, KANAL_TEXT.an + " " + anName(v.an || "alle") + ":", artTxt, v.titel, v.text ? kurztitel(v.text) : ""].filter(Boolean).join(" ");
  }
  function ansagen(rows) {
    var el = karte && karte.querySelector("#akAnsage"), bekannt = {}; if (!el) return;
    rows.forEach(function (r) { bekannt[r.id] = true; });
    if (angesagt) {
      var neu = rows.filter(function (r) { return !angesagt[r.id] && !(r.v.rolle === "team" && r.v.von && r.v.von === ich()); });
      if (neu.length) el.textContent = neu.slice(-3).map(function (r) { return kurzNachricht(r.v); }).join(" · ");
    }
    angesagt = bekannt;
  }
  function verlaufSichtbar() {
    if (!verlaufRoll.offen || !verlaufEl || !verlaufEl.clientHeight) return;
    verlaufRoll.offen = false; letzteId = verlaufRoll.neu; verlaufEl.scrollTop = verlaufEl.scrollHeight;
  }
  function renderKanal(snap) {
    var alle = snap.docs.map(function (d) { return { id: d.id, v: d.data() || {} }; }).filter(function (r) { return r.v && typeof r.v === "object"; });
    var voll = alle.length >= KANAL_GRENZE;   // die Datenbank liefert höchstens 1000 Zeilen, ungeordnet: dann können die neuesten fehlen
    var rows = alle.sort(function (a, b) { return String(a.v.created || "").localeCompare(String(b.v.created || "")); });
    if (rows.length > MAX_ANZEIGE) rows = rows.slice(rows.length - MAX_ANZEIGE);
    var warnung = voll ? '<li class="akWarnung" role="note">' + esc(KANAL_TEXT.verlaufVoll) + "</li>" : "", tag = null;
    var html = warnung + (rows.length ? rows.map(function (r) {
      var t = tagText(r.v.created), trenner = t && t !== tag ? '<li class="akTag" role="presentation"><span>' + esc(t) + "</span></li>" : "";
      if (t) tag = t; return trenner + zeileNachricht(r.id, r.v);
    }).join("") : '<li class="empty">' + esc(KANAL_TEXT.leer) + "</li>");
    var amEnde = verlaufEl.scrollHeight - verlaufEl.scrollTop - verlaufEl.clientHeight < 40, stelle = verlaufEl.scrollTop;
    ansagen(rows);
    if (!setzeHtml(verlaufEl, html)) return;
    var neu = rows.length ? rows[rows.length - 1].id : null; verlaufRoll.neu = neu;
    if (!verlaufEl.clientHeight) { verlaufRoll.offen = true; return; }   // Reiter verborgen: rollt verlaufSichtbar(), sobald er zu sehen ist (letzteId bleibt, wie sie war)
    if (verlaufRoll.offen) { verlaufSichtbar(); return; }
    if (neu !== letzteId || amEnde) { letzteId = neu; verlaufEl.scrollTop = verlaufEl.scrollHeight; } else verlaufEl.scrollTop = stelle;
  }
  function offenerVorschlag(v) {
    return v && v.typ === "claude" && v.quelle === "kanal" && v.vorgeschlagenVon && v.angefordert !== true && !v.done && !v.abgelehntVon;
  }
  function renderVorschlaege() {
    if (!vorschlagEl) return;
    var rows = todos.filter(function (r) { return offenerVorschlag(r.v); })
      .sort(function (a, b) { return String(a.v.vorgeschlagenAm || "").localeCompare(String(b.v.vorgeschlagenAm || "")); });
    var box = karte && karte.querySelector("#akAngeheftet"); if (box) box.hidden = !rows.length;   // angeheftet über dem Verlauf, nur wenn etwas wartet
    var f = fokusVon(vorschlagEl);
    if (!setzeHtml(vorschlagEl, rows.length ? rows.map(function (r) { return zeileVorschlag(r.id, r.v); }).join("") : '<li class="empty">' + esc(KANAL_TEXT.keineVorschlaege) + "</li>")) return;
    [].forEach.call(vorschlagEl.querySelectorAll("li.akVorschlag"), function (li) {   // aufgeklappt bleibt nur, was mit genau diesem Text aufgeklappt war
      var d = li.querySelector("details.akMehr"), v = todoVon(li.dataset.id); if (d && v && vorschlagOffen[li.dataset.id] && vorschlagGelesen[li.dataset.id] === v.beschreibung) d.open = true; });
    fokusZurueck(vorschlagEl, f);
  }
  function mehrUmgeschaltet(ev) {   // "toggle" steigt nicht auf: wird im Abfangen gehört
    var d = ev.target; if (!d || !d.matches || !d.matches("details.akMehr")) return;
    var li = d.closest("li.akVorschlag"), v = li ? todoVon(li.dataset.id) : null; if (!li) return;
    vorschlagOffen[li.dataset.id] = d.open; if (d.open && v) vorschlagGelesen[li.dataset.id] = v.beschreibung;
  }

  function kurztitel(t) { t = String(t).replace(/\s+/g, " ").trim(); return t.length > 140 ? t.slice(0, 139) + "…" : t; }
  /* Senden: solange eine Antwort aussteht, sendet nichts (Enter-Wiederholung, Doppeltipp). Ein Auftrag besteht aus zwei Schritten (Auftrag in todos, dann die Zeile im
     Kanal); steht der Auftrag und scheitert nur die Zeile, legt das nächste Senden mit demselben Text nur die Zeile nach — nie einen zweiten Auftrag. */
  var sendet = false, teilVersuch = null;
  function sendeSperre(an) {
    var b = formEl && formEl.querySelector(".akSenden"); sendet = an; if (!b) return;
    if (an) { sendeSperre.fokus = document.activeElement === b; b.disabled = true; }
    else { b.disabled = false; if (sendeSperre.fokus) b.focus({ preventScroll: true }); sendeSperre.fokus = false; }
  }
  function sendeAuftrag(t, an, k, jetzt) {
    var ziel = an === "agenten" ? "alle" : an, sig = ziel + "\n" + t;
    /* Auftrag an einen Ort, eine Kennung oder alle Agenten — wie „Jetzt erledigen“ sofort freigegeben (angefordert durch das Kürzel der Anmeldung) */
    return (teilVersuch && teilVersuch.sig === sig ? Promise.resolve({ id: teilVersuch.id }) :
      db.collection("todos").add({ text: kurztitel(t), beschreibung: t.slice(0, 8000), prio: 2, wer: "Claude", typ: "claude", ziel: ziel, quelle: "kanal",
        done: false, created: jetzt, angefordert: true, angefordertVon: k, angefordertAm: jetzt }))
      .then(function (r) {
        teilVersuch = { sig: sig, id: r && r.id };
        return db.collection("kanal").add({ von: k, rolle: "team", an: ziel, art: "auftrag", titel: kurztitel(t), bezug: r && r.id, created: jetzt })
          .catch(function (e) { throw { teil: true, e: e }; });
      })
      .then(function () { teilVersuch = null; textEl.value = ""; auftragEl.checked = false; meldung(""); hoehe(); });
  }
  function senden(ev) {
    ev.preventDefault();
    if (sendet) return;
    var t = textEl.value.replace(/^\s+|\s+$/g, ""); if (!t) return;
    if (!db) { meldung(KANAL_TEXT.keineVerbindung); return; }
    var k = ich(); if (!k) { meldung(KANAL_TEXT.nurEditoren); return; }
    var an = anEl.value || "agenten", jetzt = iso(), auftrag = auftragEl.checked;
    if (auftrag && (an === "LES" || an === "JB")) { meldung(KANAL_TEXT.auftragNichtAnMenschen); return; }
    sendeSperre(true);
    Promise.resolve().then(function () {
      return auftrag ? sendeAuftrag(t, an, k, jetzt) :
        db.collection("kanal").add({ von: k, rolle: "team", an: an, text: t.slice(0, 4000), art: "nachricht", created: jetzt })
          .then(function () { textEl.value = ""; meldung(""); hoehe(); });
    }).catch(function (e) { meldung(e && e.teil ? KANAL_TEXT.sendenTeil : KANAL_TEXT.sendenFehler); })
      .then(function () { sendeSperre(false); });
  }
  function hoehe() { if (!textEl) return; textEl.style.height = "auto"; textEl.style.height = Math.min(textEl.scrollHeight + 2, 168) + "px"; }   // Eingabefeld wächst bis etwa sechs Zeilen
  function taste(ev) {   // Enter sendet (Maus/Tastatur), Umschalt+Enter neue Zeile; auf Touch bleibt Enter die neue Zeile
    if (ev.key !== "Enter" || ev.shiftKey || ev.isComposing || ev.altKey) return;
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches && !(ev.metaKey || ev.ctrlKey)) return;
    ev.preventDefault(); if (ev.repeat) return;                         // gehaltene Taste sendet einmal, nicht im Takt
    if (formEl.requestSubmit) formEl.requestSubmit(); else senden(ev);
  }
  function anOptionen() {
    var wahl = anEl.value, feste = ["agenten"].concat(ORTE).concat(kennungen).concat(["LES", "JB"]);
    if (!setzeHtml(anEl, feste.map(function (a) { return '<option value="' + esc(a) + '">' + esc(anzeige(a)) + "</option>"; }).join(""))) return;   // unverändert: Auswahl, Fokus und offene Liste bleiben
    if (wahl && feste.indexOf(wahl) !== -1) anEl.value = wahl;
  }
  function renderAnwesenheit() {
    var rows = anwesenheit.filter(function (v) { return v && v.kennung; })
      .sort(function (a, b) { return String(b.zuletzt || "").localeCompare(String(a.zuletzt || "")); });
    var jetztMs = Date.now();
    setzeHtml(anwEl, rows.length ? esc(KANAL_TEXT.zuletzt) + ": " + rows.slice(0, 12).map(function (v) { var z = ms(v.zuletzt), an = z != null && jetztMs - z <= AKTIV_MS;
      return '<span class="akAnw' + (an ? " akDa" : "") + '">' + esc(anzeige(v.kennung)) + " " + esc(fmtZeit(v.zuletzt)) + "</span>"; }).join(" · ") : "");
    anwEl.hidden = !rows.length;
    kennungen = rows.map(function (v) { return v.kennung; }).filter(function (x, i, a) { return x.indexOf("?@") !== 0 && a.indexOf(x) === i; }).sort();
    anOptionen();
  }
  function aktion(ev) {
    var b = ev.target.closest("button[data-act]"); if (!b) return;
    var li = b.closest("li.akVorschlag"); if (!li || !db) return;
    var k = ich(); if (!k) { meldung(KANAL_TEXT.nurEditoren); return; }
    var jetzt = iso(), id = li.dataset.id, v = todoVon(id) || {};
    if (b.dataset.act === "ja") {   // Beschreibung mit langem Rest: Bestätigen erst, nachdem »mehr« einmal aufgeklappt war — das Aufklappen zählt, der erste Klick nicht
      var mehr = li.querySelector("details.akMehr");
      if (mehr && vorschlagGelesen[id] !== v.beschreibung) { mehr.open = true; var sm = mehr.querySelector("summary"); if (sm) sm.focus(); meldung(KANAL_TEXT.erstLesen); return; }
    }
    var patch = b.dataset.act === "ja"
      ? { angefordert: true, angefordertVon: k, angefordertAm: jetzt, bestaetigtVon: k, bestaetigtAm: jetzt }   // wie „Jetzt erledigen“, dazu wer bestätigt hat
      : { done: true, abgelehntVon: k, abgelehntAm: jetzt };
    if (b.dataset.act === "ja" && obj(v.planVorschlag) && !obj(v.plan)) { patch.plan = v.planVorschlag; patch.planVon = k; patch.planAm = jetzt; }   // was LES/JB bestätigen, gilt als Absprache
    var knoepfe = [].slice.call(li.querySelectorAll("button[data-act]")); knoepfe.forEach(function (x) { x.disabled = true; });
    db.collection("todos").doc(id).update(patch)
      .then(function () { meldung(b.dataset.act === "ja" ? KANAL_TEXT.bestaetigtMeldung : KANAL_TEXT.abgelehntMeldung); })
      .catch(function () { knoepfe.forEach(function (x) { x.disabled = false; }); meldung(KANAL_TEXT.aktionFehler); });
  }

  /* ================= Lagebild und Absprache (Fassung 3) ================= */
  function obj(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : null; }
  function ms(isoStr) { var t = isoStr ? new Date(isoStr).getTime() : NaN; return isNaN(t) ? null : t; }
  function todoVon(id) { return Object.prototype.hasOwnProperty.call(todoIndex, id) ? todoIndex[id] : null; }
  function texte(a) { return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string" && x; }) : []; }
  function kontoText(k) { return LAGE_TEXT.kontoName[k] || (k ? k + " " + KANAL_TEXT.claude : ""); }
  function zugriffText(a) { return texte(a).map(function (z) { return LAGE_TEXT.zugriffName[z] || z; }).join(", "); }
  function wieText(m, e, a) { return [m ? LAGE_TEXT.modellName[m] || m : "", e || "", a ? LAGE_TEXT.arbeitsweiseName[a] || a : ""].filter(Boolean).join(" · "); }
  function kuerzen(s, n) { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  /* Eine Absprache als Text — dieselbe Reihenfolge wie planText in kanal CL LES.mjs. voll = false (Zeile an der Aufgabe): die Notiz höchstens 300 Zeichen, mit »…« gekürzt;
     voll = true (Details, Vorschlag): bis 1000 Zeichen, so lang wie das Formular erlaubt. */
  function planTeile(pl, voll) {
    pl = obj(pl); if (!pl) return [];
    var T = LAGE_TEXT, t = [];
    if (pl.mitarbeiter) t.push(String(pl.mitarbeiter));
    if (pl.konto) t.push(kontoText(pl.konto));
    var wie = wieText(pl.modell, pl.effort, pl.arbeitsweise); if (wie) t.push(wie);
    if (pl.ort) t.push(T.rechner + " " + ortName(pl.ort));
    if (texte(pl.material).length) t.push(T.material + ": " + texte(pl.material).join("; "));
    if (texte(pl.zugriff).length) t.push(T.zugriff + ": " + zugriffText(pl.zugriff));
    if (pl.premiere) t.push(T.premiere + " " + pl.premiere);
    if (pl.projekt) t.push(T.projekt + " " + pl.projekt);
    if (pl.stand) t.push(T.standName[pl.stand] || String(pl.stand));
    if (pl.notiz) t.push(T.notiz + ": " + kuerzen(pl.notiz, voll ? 1000 : 300));
    return t;
  }
  function planZeile(pl, voll) { return planTeile(pl, voll).join(" · "); }
  function zeile(label, wert) { return wert ? '<div class="alZeile"><span class="alLabel">' + esc(label) + "</span> " + esc(wert) + "</div>" : ""; }

  /* ---- Lagebild als Architektur-Grafik (Vorbild Archify, Wunsch LES 09.10.): vier Spalten Mitarbeiter → Arbeitsplatz (in Zonen je Rechner) → Aufgabe
     → Speicher. Arbeitsplatz = Claude-Sitzung (Kennung, Ist aus kanal_anwesenheit.status), Mensch am Rechner der Absprache (mit oder ohne Claude),
     Hintergrunddienst (Lauf ohne Kennung) oder »wartet auf Übernahme« (abgesprochener Claude-Auftrag, noch nicht beansprucht). Kanten nur zwischen
     Nachbarspalten. Breit: Kästen frei gesetzt, Linien rechtwinklig (SVG), laufende Arbeit mit Fluss; schmal: dieselben Kästen als Liste ohne Linien.
     Zeigen oder Tippen hebt den ganzen Strang hervor, Tippen öffnet die Details darunter. */
  var lage = { modell: null, wahl: null, schwebe: null, sig: "", ro: null };
  var PLATZ_RANG = { claude: 0, mensch: 1, dienst: 2, warte: 3 };

  function abweichungen(anw, st, pl) {   // Ist der Sitzung gegen die Absprache des gehaltenen Auftrags — nur wo beides angegeben ist
    var w = [];
    if (pl.konto && pl.konto !== "egal" && (pl.konto === "ohne" || (anw.konto && pl.konto !== anw.konto))) w.push(LAGE_TEXT.konto);
    ["modell", "effort", "arbeitsweise"].forEach(function (f) { if (pl[f] && st[f] && pl[f] !== st[f]) w.push(LAGE_TEXT[f]); });
    return w;
  }
  function gehaltenerAuftrag(anw, st) {
    var a = st.auftrag, id = typeof a === "string" ? a : obj(a) && typeof a.id === "string" ? a.id : null;
    if (!id) { var t = todos.filter(function (x) { return !x.v.done && x.v.s11status === "laeuft" && x.v.s11kennung === anw.kennung; })[0]; if (t) id = t.id; }
    return id ? { id: id, v: todoVon(id), titel: obj(a) && typeof a.titel === "string" ? a.titel : null } : null;
  }
  function praesenzAktiv(v, jetztMs) {   // dieselbe Regel wie »Gerade aktiv« (leitstand-zeit.js)
    var lebt = v.prozesse > 0 ? (v.geprueft && jetztMs - new Date(v.geprueft).getTime() < 12 * 60000) : (v.zuletztAm && jetztMs - new Date(v.zuletztAm).getTime() < 45 * 60000);
    var s = ms(v.seit); return v.aktiv && lebt && s != null ? s : null;
  }
  function ortVonZiel(z) { z = String(z || ""); var m = /@(.+)$/.exec(z); return m ? m[1] : ORTE.indexOf(z) !== -1 || /^[a-z0-9-]+$/.test(z) && z !== "egal" && z !== "alle" ? z : "egal"; }
  /* Nach fehler/abgebrochen ist ein Auftrag erst wieder frei, wenn danach erneut angefordert wurde (angefordertAm nach s11beendetAm) — wie kanal_frei (SQL) und der Listener */
  function neuAngefordert(v) { var a = ms(v.angefordertAm), b = ms(v.s11beendetAm); return v.angefordert === true && a != null && (b == null || a > b); }
  function statusAufgabe(v) {
    var T = LAGE_TEXT, pl = obj(v.plan), claude = (v.typ === "claude" || v.wer === "Claude") && !v.done;
    if (v.s11status === "laeuft") return { t: T.laeuftAuf + (v.s11kennung ? anzeige(v.s11kennung) : KANAL_TEXT.ortName[v.s11ziel] || v.s11ziel || ""), k: "laeuft" };
    if (v.s11status === "wartet") return { t: T.wartet + (v.s11fortschritt ? " — " + v.s11fortschritt : ""), k: "wartet" };
    if (claude && (v.s11status === "fehler" || v.s11status === "abgebrochen") && !neuAngefordert(v)) return { t: T.endstand[v.s11status], k: "fehler" };   // tot, bis jemand neu anfordert: kein »wartet«
    if (claude && v.s11status === "zurueckgegeben" && v.angefordert === true) return { t: T.endstand.zurueckgegeben, k: "frei" };
    if (claude) return v.angefordert === true ? { t: T.freigegeben, k: "frei" } : { t: T.nichtFreigegeben, k: "offen" };
    return pl && pl.stand ? { t: T.standName[pl.stand] || pl.stand, k: pl.stand } : { t: "", k: "" };
  }

  function lageModell(jetztMs) {
    var T = LAGE_TEXT, K = {}, kanten = [], kSet = {}, zonen = {}, erreichbar = {};
    var knoten = function (key, art, d) { if (!K[key]) { K[key] = d || {}; K[key].key = key; K[key].art = art; K[key].links = []; K[key].rechts = []; } return K[key]; };
    var kante = function (von, zu, art) {
      var k = von + ">" + zu, e = kSet[k];
      if (e) { if (art === "abweichung" || (art === "laeuft" && e.art !== "abweichung")) e.art = art; return; }
      kSet[k] = { von: von, zu: zu, art: art || "" }; kanten.push(kSet[k]);
    };
    var mensch = function (m) { return knoten("m:" + m, "mitarbeiter", { wer: m }); };
    var zone = function (o) { o = o || "offen"; if (!zonen[o]) zonen[o] = { ort: o, badge: "" }; return o; };
    var speicher = function (z) { return knoten("s:" + z, "speicher", { z: z }); };
    var aufgabe = function (id, v, titel) {
      var n = knoten("t:" + id, "aufgabe", { id: id, v: v, titel: v && v.text || titel || id });
      if (v) texte(obj(v.plan) && v.plan.zugriff).forEach(function (z) { kante(n.key, speicher(z).key, ""); });
      return n;
    };
    var gezeigt = {};
    // 1. Claude-Sitzungen der letzten 12 Stunden
    anwesenheit.filter(function (a) { var z = ms(a.zuletzt); return a.kennung && z != null && jetztMs - z <= SICHTBAR_MS; })
      .sort(function (a, b) { return String(b.zuletzt || "").localeCompare(String(a.zuletzt || "")); })
      .forEach(function (a) {
        var st = obj(a.status) || {}, aktiv = jetztMs - ms(a.zuletzt) <= AKTIV_MS, au = gehaltenerAuftrag(a, st), pl = au && au.v ? obj(au.v.plan) : null;
        var p = knoten("p:" + a.kennung, "platz", { sorte: "claude", anw: a, st: st, aktiv: aktiv, abw: pl ? abweichungen(a, st, pl) : [], auftrag: au,
          zone: zone(a.ort || ortVonZiel(a.kennung)), wer: MITARBEITER.indexOf(st.mitarbeiter) !== -1 ? st.mitarbeiter : null });
        if (p.wer) kante(mensch(p.wer).key, p.key, aktiv ? "" : "blass");
        texte(st.zugriff_verfuegbar).forEach(function (z) { (erreichbar[z] = erreichbar[z] || []).push(a.kennung); });
        var t = null;
        if (au) { gezeigt[au.id] = true; t = aufgabe(au.id, au.v, au.titel); }
        else if (st.thema) t = knoten("t:thema:" + a.kennung, "aufgabe", { sorte: "thema", titel: st.thema });
        if (!t) return;
        kante(p.key, t.key, p.abw.length ? "abweichung" : aktiv && st.zustand === "arbeitet" ? "laeuft" : aktiv ? "" : "blass");
        texte(st.zugriff).forEach(function (z) { kante(t.key, speicher(z).key, aktiv ? "" : "blass"); });
      });
    // 2. Aufgaben aus todos: Läufe ohne Kennung (Hintergrunddienst), gehaltene ohne Sitzung im Lagebild, sonst nur mit Absprache
    todos.filter(function (x) { return !x.v.done && typeof x.v.text === "string" && x.v.text && !gezeigt[x.id]; }).forEach(function (x) {
      var v = x.v, pl = obj(v.plan), claude = v.typ === "claude" || v.wer === "Claude", lauf = v.s11status === "laeuft" || v.s11status === "wartet", p;
      if (claude && lauf && !v.s11kennung) p = knoten("p:dienst:" + (v.s11ziel || "?"), "platz", { sorte: "dienst", zone: zone(ortVonZiel(v.s11ziel)), ort: v.s11ziel });
      else if (claude && lauf && v.s11kennung) p = K["p:" + v.s11kennung] || knoten("p:" + v.s11kennung, "platz", { sorte: "claude", anw: { kennung: v.s11kennung }, st: {}, aktiv: false, abw: [], zone: zone(ortVonZiel(v.s11kennung)) });
      else if (!pl) return;
      else if (claude && statusAufgabe(v).k === "fehler") { aufgabe(x.id, v); return; }   // mit Fehler beendet/abgebrochen und nicht neu angefordert: nur die Aufgabe, kein Platz »wartet«
      else if (claude) {
        var ziel = v.ziel || "egal";
        p = knoten("p:warte:" + ziel, "platz", { sorte: "warte", ziel: ziel, zone: zone(ortVonZiel(ziel)) });
        if (MITARBEITER.indexOf(pl.mitarbeiter) !== -1) kante(mensch(pl.mitarbeiter).key, p.key, "plan");
      } else {
        var wer = MITARBEITER.indexOf(pl.mitarbeiter) !== -1 ? pl.mitarbeiter : MITARBEITER.indexOf(v.wer) !== -1 ? v.wer : null, ort = pl.ort || "offen";
        p = knoten("p:mensch:" + (wer || "?") + "@" + ort + "~" + (pl.konto || ""), "platz", { sorte: "mensch", wer: wer, konto: pl.konto || "", zone: zone(ort) });
        if (wer) kante(mensch(wer).key, p.key, "");
      }
      var t = aufgabe(x.id, v);
      kante(p.key, t.key, v.s11status === "laeuft" ? "laeuft" : claude && !lauf ? "plan" : pl && pl.stand === "geplant" ? "plan" : "");
    });
    // 3. Sitzungen laut Commits (praesenz) nur, wenn die Seite »Gerade aktiv« erlaubt (Entscheidung E6)
    if (typeof window.leitstandGeradeAktiv === "function" && window.leitstandGeradeAktiv() === true) praesenz.forEach(function (v) {
      var s = praesenzAktiv(v, jetztMs); if (s == null) return;
      var u = FMT_HHMM.format(new Date(s));
      if (v.wer === "Schnitt 11") { zonen[zone("schnitt11")].badge = T.schnitt11 + u; return; }
      if (MITARBEITER.indexOf(v.wer) === -1) return;
      var n = mensch(v.wer);
      n.praesenz = T.commits + u + (typeof v.thema === "string" && v.thema.trim() ? " · „" + v.thema.trim() + "“" : "");
      n.ohneMeldung = !anwesenheit.some(function (a) { var st = obj(a.status) || {}; return st.mitarbeiter === v.wer && jetztMs - ms(a.zuletzt) <= AKTIV_MS; });
    });
    kanten.forEach(function (e) { K[e.von].rechts.push(e.zu); K[e.zu].links.push(e.von); });
    return { knoten: K, kanten: kanten, zonen: zonen, erreichbar: erreichbar };
  }

  /* ---- Kästen und Details ---- */
  function kastenTeile(n) {
    var T = LAGE_TEXT, st = n.st || {}, z = [], kopf = "", klein = "", marke = "";
    if (n.art === "mitarbeiter") { kopf = n.wer; if (n.praesenz) z.push(n.praesenz); if (n.ohneMeldung) marke = T.ohneMeldung; }
    else if (n.art === "platz" && n.sorte === "claude") {
      var a = n.anw || {}, m = /^([^@]+)@/.exec(String(a.kennung || ""));
      kopf = m && m[1] !== "?" ? m[1] + " " + KANAL_TEXT.claude : KANAL_TEXT.kontoOffen;
      klein = !n.aktiv && a.zuletzt ? T.zuletzt + " " + uhr(a.zuletzt) : st.zustand ? T.zustand[st.zustand] || st.zustand : "";   // ohne Lebenszeichen seit 45 min: veraltet, blass mit Uhrzeit
      z.push(wieText(st.modell, st.effort, st.arbeitsweise)); if (st.premiere) z.push(T.premiere + " " + st.premiere);
      if (n.abw && n.abw.length) marke = T.abweichung + ": " + n.abw.join(", ");
    }
    else if (n.art === "platz" && n.sorte === "mensch") { kopf = n.wer || "?"; z.push(n.konto ? kontoText(n.konto) : ""); }
    else if (n.art === "platz" && n.sorte === "dienst") { kopf = T.dienst; }
    else if (n.art === "platz") { kopf = T.warteTitel; z.push(KANAL_TEXT.ziel + ": " + anName(n.ziel)); }
    else if (n.art === "aufgabe") {
      kopf = n.titel; if (n.sorte === "thema") { klein = T.thema; } else if (n.v) { var s = statusAufgabe(n.v), pl = obj(n.v.plan) || {};
        if (s.k === "fehler") { marke = s.t; if (n.v.s11ergebnis) z.push(kuerzen(n.v.s11ergebnis, 90)); } else klein = s.t;   // Warnfarbe und letztes Ergebnis statt »freigegeben«
        if (texte(pl.material).length) z.push(texte(pl.material).join("; ")); if (pl.premiere) z.push(T.premiere + " " + pl.premiere); }
    }
    else if (n.art === "speicher") { kopf = T.zugriffName[n.z] || n.z; }
    return { kopf: kopf, klein: klein, zeilen: z.filter(Boolean), marke: marke };
  }
  function kastenHtml(n, breite) {
    var t = kastenTeile(n), kl = "alKasten alArt-" + n.art + (n.sorte ? " alSorte-" + n.sorte : "") + (n.wer && n.art === "mitarbeiter" ? " alWer-" + n.wer : "") +
      (n.art === "platz" && n.sorte === "claude" && !n.aktiv ? " alBlass" : "") + (t.marke ? " alWarn" : "");
    return '<button type="button" class="' + esc(kl) + '" data-key="' + esc(n.key) + '" aria-pressed="false"' + (breite ? ' style="width:' + breite + 'px"' : "") + ">" +
      '<span class="alSigel" aria-hidden="true">' + esc(LAGE_TEXT.sigel[n.art === "platz" || n.sorte === "thema" ? n.sorte : n.art] || "") + "</span>" +
      '<span class="alKKopf">' + esc(t.kopf) + "</span>" + (t.klein ? '<span class="alKKlein">' + esc(t.klein) + "</span>" : "") +
      t.zeilen.map(function (x) { return '<span class="alKZeile">' + esc(x) + "</span>"; }).join("") + (t.marke ? '<span class="alKMarke">' + esc(t.marke) + "</span>" : "") + "</button>";
  }
  function kurzName(n) { var t = kastenTeile(n); return n.art === "platz" && n.sorte === "claude" ? anzeige(n.anw.kennung) : n.art === "platz" && n.sorte !== "warte" ? t.kopf + " @ " + zoneName(n.zone) : t.kopf; }
  function zoneName(o) { return o === "egal" ? LAGE_TEXT.zoneEgal : o === "offen" ? LAGE_TEXT.zoneOffen : ortName(o); }
  function detailHtml(n) {
    var T = LAGE_TEXT, M = lage.modell, h = "", knopf = null;
    var namen = function (keys) { return keys.map(function (k) { return kurzName(M.knoten[k]); }).join(" · "); };
    if (n.art === "mitarbeiter") h = zeile(T.mitarbeiter, n.wer) + zeile(T.praesenzWort, n.praesenz || "") + (n.ohneMeldung ? zeile("", T.ohneMeldung) : "");
    else if (n.art === "platz" && n.sorte === "claude") {
      var st = n.st || {}, a = n.anw || {}, au = n.auftrag, pl = au && au.v ? obj(au.v.plan) : null;
      var ist = wieText(st.modell, st.effort, st.arbeitsweise); if (ist && st.modell && st.modell_quelle) ist += " (" + T.modell + " " + (T.quelle[st.modell_quelle] || st.modell_quelle) + ")";
      h = zeile(T.kennung, anzeige(a.kennung)) + zeile(T.rechner, zoneName(n.zone)) + zeile(T.mitarbeiter, st.mitarbeiter ? st.mitarbeiter + (st.mitarbeiter_quelle ? " (" + (T.quelle[st.mitarbeiter_quelle] || st.mitarbeiter_quelle) + ")" : "") : "") +
        zeile(T.zustandWort, st.zustand ? T.zustand[st.zustand] || st.zustand : "") + zeile(T.zuletzt, a.zuletzt ? fmtZeit(a.zuletzt) : "") +
        zeile(T.aufgabe, au ? (au.v && au.v.text) || au.titel || au.id : "") + zeile(T.thema, st.thema || "") + zeile(T.ist, ist) +
        (pl ? '<div class="alZeile' + (n.abw.length ? " alAbweichung" : "") + '"><span class="alLabel">' + esc(T.absprache) + "</span> " + esc(planZeile(pl, true)) +
          (n.abw.length ? ' <span class="alMarke">' + esc(T.abweichung + ": " + n.abw.join(", ")) + "</span>" : "") + "</div>" : "") +
        zeile(T.material, texte(st.material).join("; ")) + zeile(T.zugriff, zugriffText(st.zugriff)) +
        zeile(T.erreichbar, Array.isArray(st.zugriff_verfuegbar) ? zugriffText(st.zugriff_verfuegbar) || "—" : "") +
        zeile(T.premiere, st.premiere ? st.premiere + (st.premiere_quelle ? " (" + (T.quelle[st.premiere_quelle] || st.premiere_quelle) + ")" : "") : "") +
        zeile(T.projekt, st.projekt || "") + (st.details ? '<div class="alZeile"><span class="alLabel">' + esc(T.details) + '</span><div class="akText">' + esc(st.details) + "</div></div>" : "");
      if (au && au.v && !au.v.done) knopf = au.id;
    }
    else if (n.art === "platz") h = zeile(T.art, n.sorte === "mensch" ? (n.konto ? kontoText(n.konto) : T.mensch) : n.sorte === "dienst" ? T.dienst : T.warteTitel) +
      zeile(T.rechner, zoneName(n.zone)) + (n.sorte === "warte" ? zeile(KANAL_TEXT.ziel, anName(n.ziel)) : "") + (n.sorte === "mensch" ? zeile(T.mitarbeiter, n.wer || "") : "");
    else if (n.art === "aufgabe" && n.v) {
      var v = n.v, s = statusAufgabe(v);
      h = zeile(T.aufgabe, v.text) + zeile(T.stand, s.t) + (s.k === "fehler" && v.s11ergebnis ? zeile(T.ergebnis, kuerzen(v.s11ergebnis, 600)) : "") +
        zeile(T.absprache, planZeile(v.plan, true)) + (v.planVon ? zeile(T.festgelegt, v.planVon + (v.planAm ? " " + fmtZeit(v.planAm) : "")) : "") +
        (v.beschreibung ? '<div class="alZeile"><span class="alLabel">' + esc(KANAL_TEXT.beschreibung) + '</span><div class="akText">' + esc(String(v.beschreibung).slice(0, 1200)) + "</div></div>" : "");
      knopf = n.id;
    }
    else if (n.art === "aufgabe") h = zeile(T.thema, n.titel);
    else if (n.art === "speicher") h = zeile(T.zugriff, T.zugriffName[n.z] || n.z) +
      zeile(T.erreichbar, (M.erreichbar[n.z] || []).map(function (k) { return anzeige(k); }).join(" · ") || "—");
    var st = strang(n.key), nh = Object.keys(st.hoch).length, nr = Object.keys(st.runter).length;
    h += zeile(T.links + " (" + n.links.length + ")", namen(n.links)) + zeile(T.rechts + " (" + n.rechts.length + ")", namen(n.rechts)) +
      zeile(T.reichweite, T.aufwaerts + " " + nh + " · " + T.abwaerts + " " + nr);
    return '<div class="alDetailKopf"><span class="alKKopf">' + esc(kurzName(n)) + '</span><button type="button" class="akBtn akNein" data-act="schliessen">' + esc(T.schliessen) + "</button></div>" + h +
      (knopf ? '<div class="akKnoepfe"><button type="button" class="akBtn akNein" data-act="absprache" data-id="' + esc(knopf) + '">' + esc(T.aendern) + "</button></div>" : "");
  }

  /* ---- Setzen und Zeichnen ---- */
  function renderLage() {
    if (!lageEl) return;
    lage.modell = lageModell(Date.now());
    if (lage.wahl && !lage.modell.knoten[lage.wahl]) lage.wahl = null;
    zeichnen(false);
  }
  function zonenReihe(zonen) {
    var rest = Object.keys(zonen).filter(function (o) { return ORTE.indexOf(o) === -1 && o !== "egal" && o !== "offen"; }).sort();
    return ORTE.concat(rest).concat(["egal", "offen"]).filter(function (o) { return zonen[o]; });
  }
  function zeichnen(erzwingen) {
    if (!lageEl || !lage.modell) return;
    var M = lage.modell, T = LAGE_TEXT, W = lageEl.clientWidth, alle = Object.keys(M.knoten).map(function (k) { return M.knoten[k]; });
    if (!W) return;                                                      // Reiter nicht sichtbar: der ResizeObserver zeichnet, sobald er es ist
    var breit = W >= 600, PAD = breit ? 12 : 0, GX = breit ? Math.max(30, Math.min(56, Math.round(W / 16))) : 0, BW = breit ? Math.floor((W - 2 * PAD - 3 * GX) / 4) : 0;
    var platzOrdnung = function (a, b) { return (PLATZ_RANG[a.sorte] - PLATZ_RANG[b.sorte]) || (MITARBEITER.indexOf(a.wer) - MITARBEITER.indexOf(b.wer)) || a.key.localeCompare(b.key); };
    var rangA = function (n) { var v = n.v || {}; return v.s11status === "laeuft" ? 0 : obj(v.plan) && v.plan.stand === "in_arbeit" ? 1 : v.s11status === "wartet" ? 2 : n.sorte === "thema" ? 3 : 4; };
    var ordnung = { mitarbeiter: function (a, b) { return MITARBEITER.indexOf(a.wer) - MITARBEITER.indexOf(b.wer); },
      aufgabe: function (a, b) { return rangA(a) - rangA(b) || String(a.titel).localeCompare(String(b.titel), "de"); },
      speicher: function (a, b) { return ZUGRIFFE.indexOf(a.z) - ZUGRIFFE.indexOf(b.z) || String(a.z).localeCompare(String(b.z)); }, platz: platzOrdnung };
    var spalte = function (art) { return alle.filter(function (n) { return n.art === art; }).sort(ordnung[art]); };   // schmal: diese Reihenfolge; breit: nach den Nachbarn
    var zr = zonenReihe(M.zonen);
    var sig = (breit ? "B" + W : "S") + "|" + alle.map(function (n) { return n.key + ":" + kastenHtml(n, 0); }).join("|") + "|" + M.kanten.map(function (e) { return e.von + ">" + e.zu + ":" + e.art; }).join("|") +
      "|" + zr.map(function (o) { return o + M.zonen[o].badge; }).join("|");
    if (!erzwingen && sig === lage.sig) { hervorheben(); detailZeigen(); return; }
    lage.sig = sig;
    var fk = fokusVon(lageEl), fertig = function () { hervorheben(); detailZeigen(); fokusZurueck(lageEl, fk); };   // ein fokussierter Kasten behält den Fokus über das Neuzeichnen
    if (!alle.length) { lageEl.innerHTML = '<p class="alLeer">' + esc(T.leer) + "</p>"; detailZeigen(); return; }
    var kopf = function (i) { return '<div class="alSpKopf"' + (breit ? ' style="left:' + (PAD + i * (BW + GX)) + "px;width:" + BW + 'px"' : "") + ">" + esc(T.spalten[i]) + "</div>"; };
    var zoneHtml = function (o) { var z = M.zonen[o]; return '<div class="alZone" data-ort="' + esc(o) + '"><div class="alZoneKopf"><span>' + esc(zoneName(o)) + "</span>" + (z.badge ? '<span class="alZoneMarke">' + esc(z.badge) + "</span>" : "") + "</div>"; };
    if (!breit) {   // schmal: Liste je Spalte, Arbeitsplätze in ihren Zonen
      lageEl.innerHTML = '<div class="alGraph alSchmal">' + ["mitarbeiter", "platz", "aufgabe", "speicher"].map(function (art, i) {
        var inhalt = art === "platz" ? zr.map(function (o) { return zoneHtml(o) + spalte("platz").filter(function (n) { return n.zone === o; }).sort(platzOrdnung).map(function (n) { return kastenHtml(n, 0); }).join("") + "</div>"; }).join("")
          : spalte(art).map(function (n) { return kastenHtml(n, 0); }).join("");
        return inhalt ? '<section class="alSpalte">' + kopf(i) + inhalt + "</section>" : "";
      }).join("") + "</div>";
      fertig(); return;
    }
    // breit: erst einsetzen, dann messen und setzen
    lageEl.innerHTML = '<div class="alGraph alBreit"><svg class="alKanten" aria-hidden="true"><defs><marker id="alPfeil" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z"></path></marker></defs></svg>' +
      [0, 1, 2, 3].map(kopf).join("") + zr.map(function (o) { return zoneHtml(o) + "</div>"; }).join("") + alle.map(function (n) { return kastenHtml(n, BW); }).join("") + "</div>";
    var g = lageEl.firstChild, el = {}, hoch = {};
    [].forEach.call(g.querySelectorAll(".alKasten"), function (b) { el[b.dataset.key] = b; hoch[b.dataset.key] = b.offsetHeight; });
    var X = [0, 1, 2, 3].map(function (i) { return PAD + i * (BW + GX); }), top0 = 34, LUECKE = 10, pos = {};
    var mitte = function (k) { return pos[k].y + hoch[k] / 2; };
    var setzeSpalte = function (liste, x, ziel) {   // nach Zielhöhe sortiert, ohne Überlappung
      var y = top0;
      liste.map(function (n) { return { n: n, z: ziel(n) }; }).sort(function (a, b) { return a.z - b.z || a.n.key.localeCompare(b.n.key); }).forEach(function (o) {
        var yy = Math.max(y, Math.round(o.z - hoch[o.n.key] / 2)); pos[o.n.key] = { x: x, y: yy }; y = yy + hoch[o.n.key] + LUECKE;
      });
    };
    // Arbeitsplätze in Zonen
    var y = top0, zonenPos = {};
    zr.forEach(function (o) {
      var oben = y; y += 30;
      spalte("platz").filter(function (n) { return n.zone === o; }).sort(platzOrdnung).forEach(function (n) { pos[n.key] = { x: X[1], y: y }; y += hoch[n.key] + LUECKE; });
      zonenPos[o] = { y: oben, h: y - oben - LUECKE + 10 }; y += 18;
    });
    var schnitt = function (keys, rueck) { var w = keys.filter(function (k) { return pos[k]; }).map(mitte); return w.length ? w.reduce(function (s, v) { return s + v; }, 0) / w.length : rueck; };
    setzeSpalte(spalte("mitarbeiter"), X[0], function (n) { return schnitt(n.rechts, 1e6 + MITARBEITER.indexOf(n.wer)); });
    setzeSpalte(spalte("aufgabe"), X[2], function (n) { return schnitt(n.links, 1e6); });
    setzeSpalte(spalte("speicher"), X[3], function (n) { return schnitt(n.links, 1e6); });
    var unten = 0;
    Object.keys(pos).forEach(function (k) { var e = el[k]; e.style.left = pos[k].x + "px"; e.style.top = pos[k].y + "px"; unten = Math.max(unten, pos[k].y + hoch[k]); });
    [].forEach.call(g.querySelectorAll(".alZone"), function (z) { var p = zonenPos[z.dataset.ort]; z.style.left = (X[1] - 8) + "px"; z.style.width = (BW + 16) + "px"; z.style.top = (p.y) + "px"; z.style.height = p.h + "px"; unten = Math.max(unten, p.y + p.h); });
    g.style.height = (unten + 12) + "px";
    // Kanten: rechtwinklig mit gerundeten Ecken, je Quelle leicht versetzt
    var svg = g.querySelector("svg"), proQuelle = {};
    svg.setAttribute("width", W); svg.setAttribute("height", unten + 12);
    var pfade = M.kanten.map(function (e) {
      var a = pos[e.von], b = pos[e.zu]; if (!a || !b) return "";
      var x1 = a.x + BW, y1 = mitte(e.von), x2 = b.x - 2, y2 = mitte(e.zu);
      var nr = proQuelle[e.von] = (proQuelle[e.von] || 0) + 1, mx = Math.round(x1 + GX / 2 + ((nr % 3) - 1) * 4), d;
      if (Math.abs(y1 - y2) < 2) d = "M" + x1 + "," + y1 + " H" + x2;
      else { var r = Math.min(8, Math.abs(y2 - y1) / 2, GX / 4), s = y2 > y1 ? 1 : -1;
        d = "M" + x1 + "," + y1 + " H" + (mx - r) + " Q" + mx + "," + y1 + " " + mx + "," + (y1 + s * r) + " V" + (y2 - s * r) + " Q" + mx + "," + y2 + " " + (mx + r) + "," + y2 + " H" + x2; }
      return '<path class="alKante' + (e.art ? " alKante-" + e.art : "") + '" data-von="' + esc(e.von) + '" data-zu="' + esc(e.zu) + '" d="' + d + '" marker-end="url(#alPfeil)"></path>';
    }).join("");
    svg.insertAdjacentHTML("beforeend", pfade);
    fertig();
  }
  /* Strang eines Kastens: alles, was links davor und rechts danach hängt */
  function erreichbarVon(key, r) {   // alle Kästen aufwärts (links) bzw. abwärts (rechts) — wie »Upstream/Downstream« in Archify
    var M = lage.modell, stapel = [key], gesehen = {};
    while (stapel.length) { M.knoten[stapel.pop()][r].forEach(function (n) { if (!gesehen[n]) { gesehen[n] = true; stapel.push(n); } }); }
    return gesehen;
  }
  function strang(key) {
    var hoch = erreichbarVon(key, "links"), runter = erreichbarVon(key, "rechts"), an = {}; an[key] = true;
    Object.keys(hoch).concat(Object.keys(runter)).forEach(function (k) { an[k] = true; });
    return { an: an, hoch: hoch, runter: runter, ursprung: key };
  }
  function hervorheben() {
    var g = lageEl && lageEl.querySelector(".alGraph"); if (!g || !lage.modell) return;
    var k = lage.schwebe || lage.wahl, st = k && lage.modell.knoten[k] ? strang(k) : null, an = st && st.an;
    g.classList.toggle("alFokus", !!an);
    [].forEach.call(g.querySelectorAll(".alKasten"), function (b) {
      var x = b.dataset.key;
      b.classList.toggle("alAn", !!(an && an[x])); b.classList.toggle("alUrsprung", !!(st && x === st.ursprung));
      b.classList.toggle("alHoch", !!(st && st.hoch[x])); b.classList.toggle("alRunter", !!(st && st.runter[x]));
      b.setAttribute("aria-pressed", x === lage.wahl ? "true" : "false");
    });
    [].forEach.call(g.querySelectorAll(".alKante"), function (p) {
      var v = p.getAttribute("data-von"), z = p.getAttribute("data-zu");
      var hoch = !!(st && st.hoch[v] && (st.hoch[z] || z === st.ursprung)), runter = !!(st && st.runter[z] && (st.runter[v] || v === st.ursprung));
      p.classList.toggle("alAn", hoch || runter); p.classList.toggle("alHoch", hoch); p.classList.toggle("alRunter", runter);
    });
  }
  function legendeZeigen() {   // wie Archify: je Kategorie die Zahl der Kästen; Linienarten ohne Zahl
    var el = karte && karte.querySelector("#alLegende"); if (!el || !lage.modell) return;
    var zahl = {}; Object.keys(lage.modell.knoten).forEach(function (k) { var n = lage.modell.knoten[k], c = n.art === "platz" ? n.sorte : n.art; zahl[c] = (zahl[c] || 0) + 1; });
    var html = LAGE_TEXT.legende.map(function (l) {
      var z = zahl[l[0]], linie = ["laeuft", "plan", "abweichung"].indexOf(l[0]) !== -1;
      return linie || z ? '<span class="alLeg alLeg-' + l[0] + '"><i></i>' + esc(l[1]) + (z ? ' <b class="alLegZahl">' + z + "</b>" : "") + "</span>" : "";
    }).join("");
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
  }
  function detailZeigen() {
    legendeZeigen();
    var d = karte && karte.querySelector("#alDetail"); if (!d) return;
    var n = lage.wahl && lage.modell && lage.modell.knoten[lage.wahl];
    var html = n ? detailHtml(n) : '<p class="akHinweis">' + esc(LAGE_TEXT.tippHinweis) + "</p>";
    if (d._html !== html) { d.innerHTML = html; d._html = html; }
    d.classList.toggle("alOffen", !!n);
  }

  /* ---- Absprache festlegen (nur LES/JB; schreibt todos.plan, planVon, planAm) ---- */
  function optionen(werte, namen, leer) {
    return (leer ? '<option value="">' + esc(LAGE_TEXT.leerWahl) + "</option>" : "") + werte.map(function (w) { return '<option value="' + esc(w) + '">' + esc((namen && namen[w]) || w) + "</option>"; }).join("");
  }
  function lageKarteHtml() {
    var T = LAGE_TEXT, f = function (id, label, inner) { return '<label class="alFeld" for="' + id + '"><span>' + esc(label) + "</span>" + inner + "</label>"; };
    var ortNamen = {}; ORTE.forEach(function (o) { ortNamen[o] = ortName(o); });
    var kontoNamen = { egal: T.kontoName.egal, ohne: T.kontoName.ohne }; KONTEN.forEach(function (k) { kontoNamen[k] = kontoText(k); });
    return '<section class="card" id="alKarte" aria-labelledby="alTitel"><h2 id="alTitel">' + esc(T.titel) + ' <span class="hint">' + esc(T.hint) + "</span></h2>" +
      '<div id="alInhalt" class="alInhalt"><p class="alLeer">' + esc(T.leer) + "</p></div>" +
      '<div class="alLegende" id="alLegende" aria-hidden="true"></div>' +
      '<div id="alDetail" class="alDetail" aria-live="polite"></div>' +
      '<details class="alEditor" id="alEditor"><summary>' + esc(T.editorTitel) + "</summary>" +
      '<form class="alForm" id="alForm" novalidate><p class="akHinweis">' + esc(T.editorHinweis) + '</p><p class="akHinweis alGaeste" id="alGaeste" role="note">' + esc(T.gaesteHinweis) + "</p>" +
      f("alAufgabe", T.aufgabe, '<select id="alAufgabe"><option value="">' + esc(T.waehlen) + "</option></select>") +
      f("alRichtwert", T.richtwert, '<select id="alRichtwert"><option value="">' + esc(T.leerWahl) + "</option>" + RICHTWERTE.map(function (r, i) { return '<option value="' + i + '">' + esc(r.name) + "</option>"; }).join("") + "</select>") +
      '<p class="akHinweis alKlein">' + esc(T.richtwertHinweis) + '</p><p class="akHinweis alKlein" id="alRwPruefung" hidden></p>' +
      '<div class="alFelder">' +
      f("alMitarbeiter", T.mitarbeiter, '<select id="alMitarbeiter">' + optionen(MITARBEITER, null, true) + "</select>") +
      f("alKonto", T.konto, '<select id="alKonto">' + optionen(["egal"].concat(KONTEN).concat(["ohne"]), kontoNamen, true) + "</select>") +
      f("alModell", T.modell, '<select id="alModell">' + optionen(MODELLE, T.modellName, true) + "</select>") +
      f("alEffort", T.effort, '<select id="alEffort">' + optionen(EFFORTS, null, true) + "</select>") +
      f("alArbeitsweise", T.arbeitsweise, '<select id="alArbeitsweise">' + optionen(ARBEITSWEISEN, T.arbeitsweiseName, true) + "</select>") +
      f("alOrt", T.rechner, '<select id="alOrt">' + optionen(ORTE, ortNamen, true) + "</select>") +
      f("alPremiere", T.premiere, '<input type="text" id="alPremiere" maxlength="8" inputmode="decimal" placeholder="26.5.2">') +
      f("alStand", T.stand, '<select id="alStand">' + optionen(STAENDE, T.standName, true) + "</select>") +
      "</div>" +
      f("alMaterial", T.material + " (" + T.materialHinweis + ")", '<input type="text" id="alMaterial" maxlength="1000">') +
      '<fieldset class="alZugriff" id="alZugriff"><legend>' + esc(T.zugriff) + "</legend>" + ZUGRIFFE.map(function (z) {
        return '<label class="akAuftrag"><input type="checkbox" value="' + esc(z) + '"> ' + esc(T.zugriffName[z] || z) + "</label>"; }).join("") + "</fieldset>" +
      f("alProjekt", T.projekt, '<input type="text" id="alProjekt" maxlength="120">') +
      f("alNotiz", T.notiz, '<textarea id="alNotiz" maxlength="1000"></textarea>') +
      '<div class="akKnoepfe"><button type="submit" class="akBtn akJa">' + esc(T.speichern) + '</button><button type="button" class="akBtn akNein" id="alEntfernen">' + esc(T.entfernen) + "</button></div>" +
      "</form></details>" + '<div id="alMeldung" role="status" hidden></div></section>';
  }
  function lageMeldung(t) { if (!lageMeldEl) return; lageMeldEl.textContent = t || ""; lageMeldEl.hidden = !t; }
  function aufgabenWahl() {
    if (!edWahl) return;
    var wahl = edWahl.value;
    var rows = todos.filter(function (x) { return !x.v.done && typeof x.v.text === "string" && x.v.text; })
      .sort(function (a, b) { return String(a.v.text).localeCompare(String(b.v.text), "de"); });
    var html = '<option value="">' + esc(LAGE_TEXT.waehlen) + "</option>" + rows.map(function (x) {
      var claude = x.v.typ === "claude" || x.v.wer === "Claude";
      return '<option value="' + esc(x.id) + '">' + esc(kurztitel(x.v.text).slice(0, 90) + " · " + (claude ? LAGE_TEXT.claudeAuftrag : x.v.wer || "alle")) + "</option>"; }).join("");
    if (edWahl._html !== html) { edWahl.innerHTML = html; edWahl._html = html; }
    if (wahl && todoVon(wahl) && !todoVon(wahl).done) edWahl.value = wahl;
  }
  function feld(id) { return edForm.querySelector("#" + id); }
  function editorFuellen(id) {
    var v = todoVon(id) || {}, pl = obj(v.plan) || obj(v.planVorschlag) || {};
    ["alMitarbeiter", "alKonto", "alModell", "alEffort", "alArbeitsweise", "alOrt", "alStand"].forEach(function (f) {
      var k = f.slice(2).toLowerCase(), el = feld(f), w = typeof pl[k] === "string" ? pl[k] : "";
      el.value = [].some.call(el.options, function (o) { return o.value === w; }) ? w : "";
    });
    feld("alPremiere").value = typeof pl.premiere === "string" ? pl.premiere : "";
    feld("alProjekt").value = typeof pl.projekt === "string" ? pl.projekt : "";
    feld("alNotiz").value = typeof pl.notiz === "string" ? pl.notiz : "";
    feld("alMaterial").value = texte(pl.material).join("; ");
    [].forEach.call(edForm.querySelectorAll("#alZugriff input"), function (c) { c.checked = texte(pl.zugriff).indexOf(c.value) !== -1; });
    feld("alRichtwert").value = ""; feld("alRwPruefung").hidden = true;
    [].forEach.call(edForm.querySelectorAll("[aria-invalid]"), function (e) { e.removeAttribute("aria-invalid"); });
  }
  function editorLesen() {   // gibt { plan } oder { falsch: [Feld-Elemente] }
    var pl = {}, falsch = [];
    ["alMitarbeiter", "alKonto", "alModell", "alEffort", "alArbeitsweise", "alOrt", "alStand"].forEach(function (f) { var w = feld(f).value; if (w) pl[f.slice(2).toLowerCase()] = w; });
    var t = function (id, max) { var el = feld(id), w = el.value.replace(/^\s+|\s+$/g, ""); if (w && (w.length > max || STEUER.test(w))) falsch.push(el); return w; };
    var pr = t("alPremiere", 8); if (pr) { if (PREMIERE.test(pr)) pl.premiere = pr; else falsch.push(feld("alPremiere")); }
    var pj = t("alProjekt", 120); if (pj) pl.projekt = pj;
    var no = t("alNotiz", 1000); if (no) pl.notiz = no;
    var ma = feld("alMaterial").value.split(";").map(function (x) { return x.replace(/^\s+|\s+$/g, ""); }).filter(Boolean);
    if (ma.length > 12 || ma.some(function (x) { return x.length > 80 || STEUER.test(x); })) falsch.push(feld("alMaterial")); else if (ma.length) pl.material = ma;
    var zu = [].filter.call(edForm.querySelectorAll("#alZugriff input"), function (c) { return c.checked; }).map(function (c) { return c.value; });
    if (zu.length) pl.zugriff = zu;
    return falsch.length ? { falsch: falsch } : { plan: pl };
  }
  function editorSpeichern(ev, entfernen) {
    if (ev) ev.preventDefault();
    var id = edWahl.value, T = LAGE_TEXT; if (!id || !todoVon(id)) { lageMeldung(T.keineAufgabe); return; }
    var k = ich(); if (!k) { lageMeldung(KANAL_TEXT.nurEditoren); return; }
    [].forEach.call(edForm.querySelectorAll("[aria-invalid]"), function (e) { e.removeAttribute("aria-invalid"); });
    var r = entfernen ? { plan: null } : editorLesen();
    if (r.falsch) { r.falsch.forEach(function (e) { e.setAttribute("aria-invalid", "true"); }); r.falsch[0].focus(); lageMeldung(T.ungueltig); return; }
    var pl = r.plan && Object.keys(r.plan).length ? r.plan : null;   // nichts eingetragen = keine Absprache
    db.collection("todos").doc(id).update({ plan: pl, planVon: k, planAm: iso() })
      .then(function () { lageMeldung(pl ? T.gespeichert : T.entfernt); if (!pl) editorFuellen(id); })
      .catch(function () { lageMeldung(KANAL_TEXT.aktionFehler); });
  }
  function lageVerdrahten() {
    lageEl = karte.querySelector("#alInhalt"); lageMeldEl = karte.querySelector("#alMeldung"); edForm = karte.querySelector("#alForm"); edWahl = karte.querySelector("#alAufgabe");
    var lk = karte.querySelector("#alKarte");
    edWahl.addEventListener("change", function () { editorFuellen(edWahl.value); lageMeldung(""); });
    feld("alRichtwert").addEventListener("change", function () {
      var rw = RICHTWERTE[Number(this.value)], hp = feld("alRwPruefung");
      hp.hidden = !(this.value && rw); hp.textContent = this.value && rw ? LAGE_TEXT.pruefungLaut + rw.pruefung : "";
      if (!this.value || !rw) return;
      feld("alModell").value = rw.modell; feld("alEffort").value = rw.effort;
      if (rw.ort) feld("alOrt").value = rw.ort;
      if (rw.konto) feld("alKonto").value = rw.konto;
    });
    edForm.addEventListener("submit", function (ev) { editorSpeichern(ev, false); });
    feld("alEntfernen").addEventListener("click", function () { editorSpeichern(null, true); });
    lk.addEventListener("click", function (ev) {
      var k = ev.target.closest(".alKasten");
      if (k && lageEl.contains(k)) { lage.wahl = lage.wahl === k.dataset.key ? null : k.dataset.key; hervorheben(); detailZeigen(); return; }
      if (ev.target.closest('button[data-act="schliessen"]')) { lage.wahl = null; hervorheben(); detailZeigen(); return; }
      var b = ev.target.closest('button[data-act="absprache"]'); if (!b) return;
      aufgabenWahl(); edWahl.value = b.dataset.id; if (edWahl.value !== b.dataset.id) return;
      editorFuellen(b.dataset.id); lageMeldung("");
      var d = karte.querySelector("#alEditor"); d.open = true; edWahl.focus();
      if (d.scrollIntoView) d.scrollIntoView({ block: "nearest" });
    });
    var schweben = function (ev, an) { var k = ev.target.closest && ev.target.closest(".alKasten"); var neu = an && k ? k.dataset.key : null; if (neu !== lage.schwebe) { lage.schwebe = neu; hervorheben(); } };
    lageEl.addEventListener("mouseover", function (ev) { schweben(ev, true); }); lageEl.addEventListener("mouseleave", function (ev) { schweben(ev, false); });
    lageEl.addEventListener("focusin", function (ev) { schweben(ev, true); }); lageEl.addEventListener("focusout", function (ev) { schweben(ev, false); });
    lk.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && (lage.wahl || lage.schwebe)) { lage.wahl = null; lage.schwebe = null; hervorheben(); detailZeigen(); } });
    /* Breite 0 = Reiter verborgen: b0 vergessen, damit das Sichtbarwerden auch bei gleicher Breite neu zeichnet (und zwar mit dem Stand von jetzt, nicht von vorher) */
    if (typeof ResizeObserver === "function") { var b0 = 0; lage.ro = new ResizeObserver(function () {
      var w = lageEl.clientWidth; if (!w) { b0 = 0; return; }
      if (w !== b0) { var warVerborgen = b0 === 0; b0 = w; if (warVerborgen) renderLage(); else zeichnen(false); } }); lage.ro.observe(lageEl); }
    else window.addEventListener("resize", function () { zeichnen(false); });
    renderLage(); aufgabenWahl();
  }


  /* ---- Absprache an den Aufgabenzeilen der Seite (alle Rollen; nur Text, keine Knöpfe) ---- */
  function schmuecken() {
    [].forEach.call(document.querySelectorAll('li[data-coll="todos"][data-id]'), function (li) {
      var v = todoVon(li.dataset.id), txt = v && !v.done ? planZeile(v.plan) : "", alt = li.querySelector(".akAbsprache");
      if (!txt) { if (alt) alt.parentNode.removeChild(alt); return; }
      var voll = LAGE_TEXT.absprache + ": " + planZeile(v.plan, true), titel = voll === LAGE_TEXT.absprache + ": " + txt ? "" : voll;   // gekürzte Notiz: der ganze Text als Tooltip
      txt = LAGE_TEXT.absprache + ": " + txt;
      if (alt && alt.textContent === txt && alt.title === titel) return;
      var el = alt || document.createElement("span"); el.className = "akAbsprache"; el.textContent = txt; if (titel) el.title = titel; else el.removeAttribute("title");
      if (!alt) (li.querySelector(".tbody") || li.querySelector(".fdtitel") || li).appendChild(el);
    });
  }
  var schmuckGeplant = false;
  function beobachten() {
    if (typeof MutationObserver !== "function" || beobachten.da) return; beobachten.da = true;
    new MutationObserver(function (recs) {
      var fremd = recs.some(function (r) { return [].some.call(r.addedNodes, function (n) { return n.nodeType === 1 && !(n.classList && n.classList.contains("akAbsprache")); }); });
      if (!fremd || schmuckGeplant) return;                             // eigene Zusätze lösen keinen neuen Durchgang aus
      schmuckGeplant = true; setTimeout(function () { schmuckGeplant = false; schmuecken(); }, 0);
    }).observe(document.body, { childList: true, subtree: true });
  }

  function aufbauen(host) {
    karte = document.createElement("div");
    karte.className = "grid akGrid";   // zwei Spalten wie auf der übrigen Seite: links breit das Lagebild, rechts (390 px) der Messenger; schmal Messenger zuerst
    karte.innerHTML = '<div class="akSpalteChat"><section class="card akMessenger" id="akKarte" aria-labelledby="akTitel">' +
      '<h2 id="akTitel">' + esc(KANAL_TEXT.titel) + ' <span class="hint">' + esc(KANAL_TEXT.hint) + "</span></h2>" +
      '<p class="akAnwesenheit" id="akAnwesenheit" hidden></p>' +
      '<div class="akAngeheftet" id="akAngeheftet" hidden><h3 class="akUnter">' + esc(KANAL_TEXT.vorschlaegeTitel) + '</h3><ul class="akVorschlaege" id="akVorschlaege"><li class="empty">' + esc(KANAL_TEXT.keineVorschlaege) + "</li></ul></div>" +
      '<ul class="akVerlauf" id="akVerlauf"><li class="empty">' + esc(KANAL_TEXT.leer) + "</li></ul>" +
      '<div class="akSrNur" id="akAnsage" role="status" aria-live="polite" aria-atomic="true"></div>' +
      '<form class="add akForm" id="akForm"><textarea id="akText" rows="1" maxlength="4000" placeholder="' + esc(KANAL_TEXT.platzhalter) + '" aria-label="' + esc(KANAL_TEXT.platzhalter) + '" title="' + esc(KANAL_TEXT.enterHinweis) + '"></textarea>' +
      '<select id="akAn" aria-label="' + esc(KANAL_TEXT.an) + '"></select>' +
      '<label class="akAuftrag"><input type="checkbox" id="akAlsAuftrag"> ' + esc(KANAL_TEXT.alsAuftrag) + "</label>" +
      '<button class="primary akSenden" type="submit">' + esc(KANAL_TEXT.senden) + "</button></form>" +
      '<p class="akHinweis akFussHinweis">' + esc(KANAL_TEXT.hinweis) + "</p>" +
      '<div id="akMeldung" role="status" hidden></div></section></div>' +
      '<div class="akSpalteLage">' + lageKarteHtml() + "</div>";
    host.appendChild(karte);
    verlaufEl = karte.querySelector("#akVerlauf"); vorschlagEl = karte.querySelector("#akVorschlaege");
    formEl = karte.querySelector("#akForm"); textEl = karte.querySelector("#akText"); anEl = karte.querySelector("#akAn"); meldungEl = karte.querySelector("#akMeldung");
    auftragEl = karte.querySelector("#akAlsAuftrag"); anwEl = karte.querySelector("#akAnwesenheit");
    anOptionen();
    formEl.addEventListener("submit", senden);
    textEl.addEventListener("keydown", taste); textEl.addEventListener("input", hoehe);
    vorschlagEl.addEventListener("click", aktion); vorschlagEl.addEventListener("toggle", mehrUmgeschaltet, true);
    if (typeof ResizeObserver === "function") new ResizeObserver(verlaufSichtbar).observe(verlaufEl); window.addEventListener("hashchange", function () { setTimeout(verlaufSichtbar, 0); });
    lageVerdrahten();
  }

  function init() {
    var host = document.getElementById("page-claude");
    if (!window.claude || !window.claude.use) return;
    window.claude.use("db").then(function (d) {
      if (!d) return;                                                   // Übergangsmodus ohne Datenbank: keine Karte, kein Lagebild
      var r = window.claude.rolle ? window.claude.rolle() : null;
      if (!r) return;                                                   // Unbekannte: nichts abfragen, nichts zeigen
      var admin = r.rolle === "admin" && !(window.claude.istGast && window.claude.istGast());
      db = d;
      beobachten();                                                     // alle Rollen: Absprache an den Aufgabenzeilen
      db.collection("todos").onSnapshot(function (snap) {               // eine Abfrage für Vorschläge, Lagebild, Aufgabenwahl und Zeilen
        todos = snap.docs.map(function (x) { return { id: x.id, v: x.data() || {} }; }).filter(function (x) { return obj(x.v); });
        todoIndex = {}; todos.forEach(function (x) { todoIndex[x.id] = x.v; });
        if (admin) { renderVorschlaege(); renderLage(); aufgabenWahl(); }
        schmuecken();
      }, function () {});
      if (!admin || !host) return;                                      // Gäste: weder Kanal noch Lagebild; "kanal", "kanal_anwesenheit", "praesenz" nie abgefragt
      if (!document.getElementById("akKarte")) aufbauen(host);
      db.collection("kanal").onSnapshot(renderKanal, function () { meldung(KANAL_TEXT.keineVerbindung); });
      db.collection("kanal_anwesenheit").onSnapshot(function (snap) { anwesenheit = snap.docs.map(function (x) { return x.data() || {}; }).filter(obj); renderAnwesenheit(); renderLage(); }, function () {});
      db.collection("praesenz").onSnapshot(function (snap) { praesenz = snap.docs.map(function (x) { return x.data() || {}; }).filter(obj); renderLage(); }, function () {});
      setInterval(renderLage, 60000);                                   // »zuletzt« und aktiv/blass laufen mit der Uhr
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
