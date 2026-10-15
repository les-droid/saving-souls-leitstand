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
   Bauschritt 3 (13.10.2026): Konto und Arbeitsplatz als zwei Marken (nie in einem Wort), »Konto nicht gemeldet« statt »Claude (Konto offen)«, »Arbeitsplatz« statt »Ort«/»Rechner«,
   feste Zeilen im Kasten einer Sitzung und des Hintergrunddienstes, »nicht gemeldet« statt nichts, abgemeldete Einträge ohne Kasten — alles nur mit der Lesart (leitstand-lesart.js).
   Bauschritt 4 (14.10.2026): das Lagebild zeigt jede offene Claude-Aufgabe, genau einen Kasten je Aufgabe und nur für offene (Plätze »wartet auf Übernahme« und »Warten auf dich« je Arbeitsplatz, Ruhendes klein,
   Chat-Nachricht als eigener Kasten, Legende zählt getrennt, Einzelheiten haften unten oder stehen unter dem Kasten); »Warten auf dich« heißt und zählt im Kanal, im Lagebild und in der Sprungzeile gleich;
   Sprungzeile im Reiter »Claude«; Schnittstelle window.LEITSTAND_KANAL und Ereignis leitstand:kanal — alles nur mit der Lesart von Bauschritt 4.
   Bauschritt 5 (14.10.2026): der Satz am Sendefeld, wer den Auftrag übernimmt (nur mit dem Brett: window.leitstandSpalten, gesetzt von index.html); Kennung des Laufs vor Status einer Sitzung (Auflage aus Bauschritt 4);
   ein Neuzeichnen rollt die Seite nicht zurück, wenn der Mensch sie weggerollt hat.
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
    absenderUnbekannt: "Absender unbekannt",                                                    // Bauschritt 1a: Vorschlag ohne vorgeschlagenVon (Wortlaut: Vorgabe 261012, vom Editor frei zu geben)
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
  /* Bauschritt 2: die gemeinsame Lesart (leitstand-lesart.js, Bauvorlage Fassung 2, § 3). Fehlt sie oder hat sie eine andere Fassung, tut diese Datei, was sie vor dem Schritt tat. */
  function lesart() { var l = window.LEITSTAND_LESART; return l && l.fassung === 1 ? l : null; }
  if (lesart()) KANAL_TEXT.ortName = lesart().ortNamen();   // »Schnitt 11«, »VPS«, »Remote«, »LES MacBook (privat)«; andere Arbeitsplätze wie gespeichert
  /* Bauschritt 3: die zwei Marken (Konto, Arbeitsplatz) und die festen Zeilen (Bauvorlage Fassung 2, § 2.4 und § 4). Fehlt die Lesart, hat sie eine andere Fassung oder kennt sie die Marken nicht (eine ältere
     leitstand-lesart.js aus dem Zwischenspeicher), tut diese Datei, was sie vor dem Schritt tat — Wörter und Formen eingeschlossen. */
  function marken() {
    var l = lesart();
    return l && typeof l.kennungMarken === "function" && typeof l.markenPaar === "function" && typeof l.abgemeldet === "function" && typeof l.ortDesLaufs === "function" && typeof l.istDienst === "function" ? l : null;
  }
  /* Wörter des Schritts: Bauvorlage § 4 (»Arbeitsplatz« statt »Ort«, »Rechner«, »Ziel«; »gewünschter Arbeitsplatz«; »Mensch an der Sitzung«; »Konto nicht gemeldet«), § 2.4 (feste Zeilen), § 2.3 (»nicht gemeldet«,
     »genaue Fassung nicht gemeldet«) und der statische Entwurf der Bauvorlage (Konto · Arbeitsplatz, Konto je Auftrag, je Auftrag, Anwesenheit nicht gemeldet, keine Helfer, abgemeldet) */
  var FEST = { ng: "nicht gemeldet", fassungNg: "genaue Fassung nicht gemeldet", keinAuftrag: "kein Auftrag übernommen", nichts: "Modell, Effort, Helfer nicht gemeldet · kein Auftrag übernommen",
    anwesenheitNg: "Anwesenheit nicht gemeldet", kontoJeAuftrag: "Konto je Auftrag", jeAuftrag: "je Auftrag", keineHelfer: "keine Helfer", helfer: "Helfer",
    auftrag: "Auftrag", dieseAufgabe: "diese Aufgabe", menschSitzung: "Mensch an der Sitzung", abgemeldet: "abgemeldet", dienstWort: "Hintergrunddienst", sitzung: "Sitzung", gesehen: "zuletzt gesehen", konto: "Konto", arbeitsplatz: "Arbeitsplatz",
    nennt: function (roh) { return "Kennung »" + roh + "« nennt kein Konto"; } };
  if (marken()) {
    KANAL_TEXT.ziel = "gewünschter Arbeitsplatz"; KANAL_TEXT.kontoOffen = marken().TEXT.kontoOffen;                 // AK29 »Ort«, AK37 »Claude (Konto offen)«
    LAGE_TEXT.rechner = FEST.arbeitsplatz; LAGE_TEXT.zoneEgal = "Arbeitsplatz egal"; LAGE_TEXT.zoneOffen = "Arbeitsplatz offen";   // AL24 »Rechner«, AL58, AL59
    LAGE_TEXT.mensch = "Mensch am Arbeitsplatz"; LAGE_TEXT.spalten = ["Mitarbeiter", "Konto · Arbeitsplatz", "Aufgabe", "Speicher"];   // AL66, AL55
  }
  /* Bauschritt 4: die Lesart mit der Liste »Warten auf dich« samt Nachrichten und dem Zustand einer Chat-Nachricht (`schritt` 4). Fehlt sie, hat sie die Marken von Schritt 3 nicht (marken()) oder ist es eine ältere Lesart
     aus dem Zwischenspeicher, tut diese Datei, was sie vor dem Schritt tat — das Lagebild zeigt dann wieder nur Laufendes, Gehaltenes und Abgesprochenes. */
  function vier() {
    var l = marken();
    if (window.leitstandZeigeAufgabe !== true) return null;   // Runde 2 (Prüfbericht Bedienung, Befund 1): eine index.html von vor dem Schritt (aus dem Zwischenspeicher) hört den Sprung in die Aufgaben nicht — mit ihr tut diese Datei, was sie vor dem Schritt tat
    return l && l.schritt >= 4 && typeof l.chatZustand === "function" && typeof l.laeuftOderPausiert === "function" && typeof l.kern === "function" && typeof l.wartenAufDich === "function" ? l : null;
  }
  /* Bauschritt 5: der Satz am Sendefeld gehört zum Brett — nur mit dem Schalter (index.html setzt window.leitstandSpalten, wenn das Brett steht) und einer Lesart, die den Satz liefert (nimmt). Sonst tut diese Datei, was sie vorher tat. */
  function fuenf() { var l = marken(); return window.leitstandSpalten === true && l && l.brett === 1 && typeof l.nimmt === "function" ? l : null; }
  /* Wörter des Schritts, alle aus der Bauvorlage Fassung 2 (§ 2.4, § 2.7, § 3.3, »Schritt 4«) oder ihrem statischen Entwurf: »Warten auf dich« (Name überall gleich), »Nichts wartet auf dich.«, »Nachricht an dich«,
     »in den Aufgaben zeigen«, »Aufgabe nicht mehr vorhanden«, »jetzt« vor der Marke, die Kennzeichen BEREIT, DU, CHAT, die Legende und die Sprungzeile */
  var FEST4 = { warten: "Warten auf dich", nichtsWartet: "Nichts wartet auf dich.", nachrichtAnDich: "Nachricht an dich", inAufgaben: "in den Aufgaben zeigen", nichtMehr: "Aufgabe nicht mehr vorhanden", jetzt: "jetzt",
    genannt: "erledigt, der Status nennt ihn noch", dranSatz: "freigeben, bestätigen, neu anfordern oder antworten", chat: "Chat: ", von: "von", aufgabe1: " Claude-Aufgabe", aufgabeN: " Claude-Aufgaben",
    aufgaben: "Claude-Aufgaben", sitzungen: "Claude-Sitzungen", dienste: "Hintergrunddienste", chatLeg: "Chat-Nachrichten", chatLegZusatz: " (zählen nicht mit)", sprungLabel: "Im Reiter Claude springen",
    sprung: { warten: "Warten auf dich", lagebild: "Lagebild", kanal: "Agenten-Kanal", chat: "Chat mit Claude" } };
  if (vier()) { LAGE_TEXT.sigel.warte = "BEREIT"; LAGE_TEXT.sigel.dran = "DU"; LAGE_TEXT.sigel.chat = "CHAT"; KANAL_TEXT.keineVorschlaege = FEST4.nichtsWartet; }   // AL73 »OFFEN« wird BEREIT (AK 105); neu DU und CHAT; AK9 »Keine Vorschläge offen.« wird »Nichts wartet auf dich.«
  else { try { document.documentElement.removeAttribute("data-lesart-schritt"); } catch (e) {} }   // Runde 2: zeichnet diese Datei wie vor dem Schritt, gelten auch die Stilregeln des Schritts nicht (sie hängen an diesem Merkmal, das die Lesart von Schritt 4 setzt)
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
  function ortName(o) { return (Object.prototype.hasOwnProperty.call(KANAL_TEXT.ortName, o) && KANAL_TEXT.ortName[o]) || o; }   // Runde 3 (C7): nur eigene Namen — eine Zone »constructor« hieß sonst »function Object() …«
  function anzeige(k) {
    k = String(k == null ? "" : k);
    var m = /^([^@]+)@(.+)$/.exec(k);
    if (m) return (m[1] === "?" ? KANAL_TEXT.kontoOffen : m[1] === "Dienst" ? "Dienst" : m[1] + " " + KANAL_TEXT.claude) + " @ " + ortName(m[2]);   // »Dienst« (VPS-Wächter) ist keine Claude-Sitzung (KB6)
    if (KANAL_TEXT.anWahl[k]) return KANAL_TEXT.anWahl[k];
    if (k === "alle" || k === "egal") return k;
    return "@ " + ortName(k);
  }
  function anName(a) { return anzeige(a || "alle"); }
  function ngHtml(t) { return '<span class="llFehlt">' + esc(t) + "</span>"; }   // eine fehlende Angabe, ehrlich benannt
  /* Kennung oder Ziel als HTML: mit den Marken (Bauschritt 3) zwei Marken — Konto und Arbeitsplatz —, sonst der Text von anzeige() wie zuvor */
  function anzeigeHtml(k) {
    var L = marken(); k = String(k == null ? "" : k);
    if (!L || k === "") return esc(anzeige(k));
    if (/^([^@]+)@(.+)$/.test(k)) return L.kennungMarken(k);
    if (KANAL_TEXT.anWahl[k]) return esc(KANAL_TEXT.anWahl[k]);
    if (k === "alle" || k === "egal") return esc(k);
    return '<span class="llKp">' + L.platzMarke(k) + "</span>";
  }
  /* Gewünschter Arbeitsplatz eines Auftrags (`ziel`): egal → die gestrichelte Marke, alle → »alle Agenten«, eine Kennung → zwei Marken, sonst ein Arbeitsplatz */
  function zielHtml(z) {
    var L = marken(); z = String(z == null || z === "" ? "egal" : z);
    if (!L) return esc(anName(z));
    if (z === "egal") return '<span class="llKp">' + L.platzMarke("egal") + "</span>";
    if (z === "alle") return esc(KANAL_TEXT.anWahl.agenten);
    return /@/.test(z) ? L.kennungMarken(z) : '<span class="llKp">' + L.platzMarke(z) + "</span>";
  }

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
    if (k && k !== document.activeElement && k.focus) {
      /* Auflage aus Bauschritt 4: Das Neuzeichnen holt den Fokus nur zurück, es rollt nichts — hat der Mensch die Seite weggerollt, bleibt sie dort, in jeder Richtung. Die Hörer, die einen Fokus ins Fenster holen
         (index.html fokusUnterKopf, der Hörer für die Tastatur unten), lassen dieses eine Fokussieren aus. Ein Kasten, den die Tastatur gerade erreicht, wird weiter ins Fenster geholt. */
      window.leitstandFokusWieder = true;
      try { k.focus({ preventScroll: true }); } finally { window.leitstandFokusWieder = false; }
    }
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
  /* Bauschritt 4 (§ 2.7 Nr. 3): eine Zeile mit Verweisfeld auf einen Auftrag trägt dieselbe Zustandsmarke wie überall, »jetzt« davor, gelesen aus `todos` über das Verweisfeld und nicht aus dem Wortlaut der Zeile; der Titel der
     Aufgabe ist der Sprung in die Aufgaben. Gibt es die Aufgabe nicht mehr: »Aufgabe nicht mehr vorhanden«. Ohne die Lesart von Schritt 4 zeichnet die Zeile das Verweisfeld wie zuvor gar nicht. */
  var FELD_VERWEIS = "bez" + "ug";   // Feldname der Datenbank, hier in zwei Teilen: der Suchlauf des Prüfstands hält das Wort für einen Namen
  function bezugHtml(verweis) {
    var V = vier(); if (!V || typeof verweis !== "string" || verweis === "") return "";
    var t = todoVon(verweis);
    if (!t) return '<div class="akBezug akBezugWeg" data-verweis="' + esc(verweis) + '">' + esc(FEST4.nichtMehr) + "</div>";
    var a = V.art(t), titel = V.textDa(t.text) ? String(t.text) : FEST.ng;
    return '<div class="akBezug" data-verweis="' + esc(verweis) + '"><button type="button" class="akLnk akTitelLnk" data-act="zeige" data-id="' + esc(verweis) + '" title="' + esc(FEST4.inAufgaben) + '">' + esc(titel) + "</button>" +
      (a === "offen" || a === "erledigt" ? ' <span class="akJetzt">' + esc(FEST4.jetzt) + "</span> " + V.markeHtml(V.zustand(t)) : "") + "</div>";
  }
  function zeileNachricht(id, v) {
    var agent = v.rolle === "agent", system = v.rolle === "system", artTxt = v.art && v.art !== "nachricht" ? KANAL_TEXT.art[v.art] || v.art : "";
    var von = agent ? anzeige(v.von) : system ? KANAL_TEXT.system : v.von, eigen = !agent && !system && !!v.von && v.von === ich();
    var gel = v.gelesen && typeof v.gelesen === "object" ? Object.keys(v.gelesen).sort().map(function (p) { return anzeigeHtml(p) + " " + esc(uhr(v.gelesen[p])); }).join(" · ") : "";
    var Lm = marken(), vonDa = typeof v.von === "string" && v.von.replace(/\s+/g, "") !== "";
    var vonH = agent ? (Lm && !vonDa ? ngHtml(FEST.ng) : anzeigeHtml(v.von)) : esc(von), anH = anzeigeHtml(v.an || "alle");   // Bauschritt 3 (»Schritt 3«: jede fehlende Angabe — auch Zeit und Name — heißt »nicht gemeldet«): Agent ohne Absender
    var zeitH = esc(uhr(v.created) || (Lm ? FEST.ng : ""));                                                                  // … und eine Nachricht ohne lesbare Zeit
    var was = (artTxt ? '<div class="akWas">' + esc(artTxt) + (v.titel ? " · <q>" + esc(v.titel) + "</q>" : "") + "</div>" : "") + bezugHtml(v[FELD_VERWEIS]);
    var vb = vier() && typeof v[FELD_VERWEIS] === "string" && v[FELD_VERWEIS] !== "" ? ' data-' + FELD_VERWEIS + '="' + esc(v[FELD_VERWEIS]) + '" tabindex="-1"' : "";   // Bauschritt 6: der Sprung aus einer Aufgabe in den Kanal findet seine Zeilen an diesem Merkmal; die Zeile ist ein Ziel für den Fokus
    if (system) return '<li class="akMsg akSystem" data-id="' + esc(id) + '"' + vb + '><div class="akPille"><span class="akVon">' + vonH + "</span>" + was +
      '<span class="akAn">' + esc(KANAL_TEXT.an) + " " + anH + '</span><time class="akUhr">' + zeitH + "</time></div></li>";
    return '<li class="akMsg' + (agent ? " akAgent" : " akTeam") + (eigen ? " akEigen" : "") + '" data-id="' + esc(id) + '"' + vb + '>' +
      (eigen ? "" : '<span class="akBild' + (agent ? " akBildAgent" : " " + esc(String(v.von || ""))) + '" aria-hidden="true">' + esc(bildText(v, agent)) + "</span>") +
      '<div class="akBlase"><div class="akMeta">' + (agent ? '<span class="akArt">' + esc(KANAL_TEXT.agent) + "</span>" : "") +
        (eigen ? "" : '<span class="akVon">' + vonH + "</span>") + '<span class="akAn">' + esc(KANAL_TEXT.an) + " " + anH + "</span></div>" +
        was + (v.text ? '<div class="akText">' + esc(v.text) + "</div>" : "") + '<time class="akUhr">' + zeitH + "</time></div>" +
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
  function zeileVorschlag(id, v, mitLink) {
    return '<li class="akVorschlag" data-id="' + esc(id) + '" tabindex="-1">' +   // tabindex -1: »Zum Vorschlag →« der Aufgabenzeile setzt den Fokus auf die Karte, nicht auf einen Knopf
      '<div class="akMeta">' + (typeof v.vorgeschlagenVon === "string" && v.vorgeschlagenVon.replace(/\s+/g, "") !== "" ? '<span class="akArt">' + esc(KANAL_TEXT.vorschlagVon) + "</span>" + (marken() ? anzeigeHtml(v.vorgeschlagenVon) : chip(anzeige(v.vorgeschlagenVon))) : '<span class="akArt">' + esc(KANAL_TEXT.absenderUnbekannt) + "</span>") +
        "<span>" + esc(KANAL_TEXT.ziel) + ": " + zielHtml(v.ziel || "egal") + "</span><span>" + esc(fmtZeit(v.vorgeschlagenAm || v.created)) + "</span></div>" +
      '<div class="akTitel">' + esc(v.text) + "</div>" +
      (v.beschreibung ? beschreibungHtml(v.beschreibung) : "") +
      (obj(v.planVorschlag) && planZeile(v.planVorschlag, true) ? '<div class="akPlan">' + esc(KANAL_TEXT.planVorschlag) + ": " + esc(planZeile(v.planVorschlag, true)) + "</div>" : "") +
      '<div class="akKnoepfe">' + (mitLink ? '<button type="button" class="akLnk" data-act="zeige" data-id="' + esc(id) + '">' + esc(FEST4.inAufgaben) + "</button>" : "") + '<button type="button" class="akBtn akJa" data-act="ja">' + esc(KANAL_TEXT.bestaetigen) + '</button>' +   // Bauschritt 6 (§ 2.2): von der Sache zurück in die Aufgaben — nie ein Knopf, der freigibt
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
  var kanalSig = "", kanalAlle = [], kanalGezeigt = Object.create(null);   // Bauschritt 6: die geladenen Zeilen des Kanals (zeilenZu) und welche davon im Bild stehen (die letzten 100)
  var kanalSnap = null;   // Bauschritt 4: der letzte Stand des Kanals, damit die Marke »jetzt …« an Zeilen mit Verweisfeld neu gezeichnet werden kann, wenn sich die Aufgaben ändern
  function renderKanal(snap) {
    kanalSnap = snap;
    var alle = snap.docs.map(function (d) { return { id: d.id, v: d.data() || {} }; }).filter(function (r) { return r.v && typeof r.v === "object"; });
    var voll = alle.length >= KANAL_GRENZE;   // die Datenbank liefert höchstens 1000 Zeilen, ungeordnet: dann können die neuesten fehlen
    var rows = alle.sort(function (a, b) { return String(a.v.created || "").localeCompare(String(b.v.created || "")); });
    kanalAlle = rows;   // Bauschritt 6: alle geladenen Zeilen, älteste zuerst — zeilenZu liest daraus; gezeigt werden davon die letzten MAX_ANZEIGE
    if (rows.length > MAX_ANZEIGE) rows = rows.slice(rows.length - MAX_ANZEIGE);
    kanalGezeigt = Object.create(null); rows.forEach(function (r) { kanalGezeigt[r.id] = true; });
    var sigK = alle.length + ":" + alle.map(function (r) { return r.id + String(r.v[FELD_VERWEIS] || ""); }).join(",");
    if (vier() && sigK !== kanalSig) { kanalSig = sigK; setTimeout(function () { document.dispatchEvent(new CustomEvent("leitstand:kanal", { detail: { was: "zeilen" } })); }, 0); }   // Bauschritt 6: der Block im Feld liest die Zeilen des Kanals — kommt eine hinzu, zeichnet er neu
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
  function angefordertWahr(v) { return /^[^\p{L}\p{N}]*(?:t|tr|tru|true|y|ye|yes|on|1)[^\p{L}\p{N}]*$/iu.test(v.angefordert == null ? "" : String(v.angefordert)); }
  function offenerVorschlag(v) {
    if (lesart()) return lesart().vorschlagKarte(v);   // Bauschritt 2: dieselbe Regel wie die Zeile im Reiter »Aufgaben« (Lesart, Zustand »Vorschlag«)
    /* Bauschritt 1a: Vorschlag = Auftrag aus dem Kanal (quelle »kanal« oder ein vorgeschlagenVon mit irgendeinem Wert außer fehlend/null — auch leer, nur Leerzeichen oder eine Liste), nicht angefordert, nicht erledigt — ohne Pflicht
       vorgeschlagenVon (dann »Absender unbekannt«) und ohne Ausschluss abgelehntVon (ein zurückgeholter Vorschlag steht wieder hier). Jede Zeile, die in
       index.html »Zum Vorschlag →« trägt (istVorschlag), hat hier ihre Karte; dazu bleibt die Karte eines schon einmal bestätigten Eintrags stehen. */
    return v && (v.typ === "claude" || (!v.typ && v.wer === "Claude")) && (/^[^\p{L}\p{N}]*kanal[^\p{L}\p{N}]*$/iu.test(v.quelle == null ? "" : String(v.quelle)) || v.vorgeschlagenVon != null) && !angefordertWahr(v) && !v.done;
  }
  /* Bauschritt 4 (§ 3.3, § 2.7): der Kasten »Warten auf dich« zeigt genau die Liste der Lesart — Aufgaben in den Zuständen Vorschlag, Fehler, abgebrochen, nicht freigegeben und die Nachrichten an das Kürzel —,
     am längsten Wartendes zuerst, mit derselben Zahl wie Lagebild und Sprungzeile. Freigegeben wird hier nur ein Vorschlag, nach dem Lesen (Karte wie zuvor); alles andere führt in die Aufgaben. */
  function wartZeit(e) { return e.seit != null ? fmtZeit(new Date(e.seit).toISOString()) || FEST.ng : FEST.ng; }
  function wartZeile(e, V) {
    var m, titel;
    if (e.art === "nachricht") {
      m = e.v; titel = V.textDa(m.text) ? V.kern(m.text) : FEST.ng;
      return '<li class="akWart akWartNachricht" data-wart="nachricht" data-id="' + esc(e.id) + '" tabindex="-1"><div class="akWKopf"><span class="akWMarke">' + esc(FEST4.nachrichtAnDich) + '</span><time class="akWZeit">' + esc(wartZeit(e)) + '</time></div><div class="akWTitel">' + esc(titel) + "</div>" +
        (V.textDa(m.von) ? '<div class="akWVon">' + esc(FEST4.von) + " " + anzeigeHtml(m.von) + "</div>" : "") + "</li>";
    }
    if (V.vorschlagKarte(e.v)) return zeileVorschlag(e.id, e.v, true).replace('<li class="akVorschlag"', '<li class="akVorschlag" data-wart="aufgabe" data-kl="' + esc(e.zustand.klasse) + '"');
    titel = V.textDa(e.v.text) ? String(e.v.text) : FEST.ng;
    return '<li class="akWart" data-wart="aufgabe" data-id="' + esc(e.id) + '" data-kl="' + esc(e.zustand.klasse) + '" tabindex="-1"><div class="akWKopf">' + V.markeHtml(e.zustand) + '<time class="akWZeit">' + esc(wartZeit(e)) + '</time></div><div class="akWTitel">' + esc(titel) + "</div>" +
      '<div class="akKnoepfe"><button type="button" class="akLnk" data-act="zeige" data-id="' + esc(e.id) + '">' + esc(FEST4.inAufgaben) + "</button></div></li>";
  }
  var nachAktion = null;   // Bauschritt 6: nach Bestätigen oder Ablehnen geht der Fokus an die nächste Sache, sonst an »Warten auf dich« — nie ins Leere, und frei im Fenster
  function fokusNachAktion() {
    var a = nachAktion; if (!a) return;
    if (Date.now() > a.bis) { nachAktion = null; return; }
    var liste = [].slice.call(vorschlagEl.querySelectorAll("li[data-id]"));
    if (liste.some(function (x) { return x.dataset.id === a.id; })) return;   // die Karte steht noch da: der Eintrag hat sich noch nicht geändert
    nachAktion = null;
    var af = document.activeElement; if (af && af !== document.body && karte && karte.contains(af)) return;   // der Mensch hat den Fokus schon selbst gesetzt
    fokusFrei(liste[Math.min(Math.max(a.idx, 0), liste.length - 1)] || (karte && karte.querySelector("#akWartenTitel")));
  }
  function renderWarten(V) {
    var W = V.wartenAufDich(ich(), todos), zahl = karte && karte.querySelector("#akWartenZahl");   // der Kasten ist immer da (kein hidden mit der Lesart): die Sprungzeile hat ein Ziel, auch wenn nichts wartet
    if (zahl) zahl.textContent = String(W.length);
    var sz = document.getElementById("akSprungZahl"); if (sz) sz.textContent = String(W.length);   // dieselbe Zahl in der Sprungzeile
    var f = fokusVon(vorschlagEl);
    if (!setzeHtml(vorschlagEl, W.length ? W.map(function (e) { return wartZeile(e, V); }).join("") : '<li class="empty">' + esc(KANAL_TEXT.keineVorschlaege) + "</li>")) return;
    [].forEach.call(vorschlagEl.querySelectorAll("li.akVorschlag"), function (li) {
      var d = li.querySelector("details.akMehr"), v = todoVon(li.dataset.id); if (d && v && vorschlagOffen[li.dataset.id] && vorschlagGelesen[li.dataset.id] === v.beschreibung) d.open = true; });
    fokusZurueck(vorschlagEl, f); fokusNachAktion();
  }
  function renderVorschlaege() {
    if (!vorschlagEl) return;
    if (vier()) { renderWarten(vier()); return; }
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
  /* Bauschritt 5 (Schritt 5 der Bauvorlage: »derselbe Satz am Sendefeld des Kanals«): zum gewählten Empfänger sagt ein Satz, wer den Auftrag übernimmt — nur an Schnitt 11, am VPS und bei »alle Agenten« ein Hintergrunddienst,
     sonst nur eine Sitzung, die dort gerade läuft. An LES oder JB geht kein Auftrag. Der Satz kommt aus der Lesart (nimmt), derselbe wie im Aufgeklappten einer Claude-Zeile. */
  function uebernimmtZeigen() {
    var el = karte && karte.querySelector("#akUebernimmt"), F = fuenf(); if (!el || !F || !anEl) return;
    var w = anEl.value, n = w === "LES" || w === "JB" ? { warn: true, t: "Ein Auftrag geht an einen Arbeitsplatz, eine Kennung oder alle Agenten — nicht an LES oder JB." } : F.nimmt({ ziel: !w || w === "agenten" ? "alle" : w }, { anwesenheit: anwesenheit, jetzt: Date.now() });
    el.textContent = n.t; el.className = "akUebernimmt" + (n.warn ? " akWarn" : "");
  }
  function renderAnwesenheit() {
    var rows = anwesenheit.filter(function (v) { return v && v.kennung; })
      .sort(function (a, b) { return String(b.zuletzt || "").localeCompare(String(a.zuletzt || "")); });
    var jetztMs = Date.now();
    var L = marken();
    setzeHtml(anwEl, rows.length ? esc(KANAL_TEXT.zuletzt) + ": " + rows.slice(0, 12).map(function (v) { var z = ms(v.zuletzt), an = z != null && jetztMs - z <= AKTIV_MS;
      if (L) return '<span class="akAnw' + (an ? " akDa" : "") + '">' + L.kennungMarken(v.kennung) + (L.istDienst(v) ? " " + FEST.dienstWort : "") + " " + esc(fmtZeit(v.zuletzt) || FEST.ng) + (L.abgemeldet(v) ? " · " + FEST.abgemeldet : "") + "</span>";   // Bauschritt 3
      return '<span class="akAnw' + (an ? " akDa" : "") + '">' + esc(anzeige(v.kennung)) + " " + esc(fmtZeit(v.zuletzt)) + "</span>"; }).join(" · ") : "");
    anwEl.hidden = !rows.length;
    kennungen = rows.map(function (v) { return v.kennung; }).filter(function (x, i, a) { return x.indexOf("?@") !== 0 && a.indexOf(x) === i; }).sort();
    anOptionen(); uebernimmtZeigen();
  }
  function zeigeAufgabe(id) { if (typeof id === "string" && id) document.dispatchEvent(new CustomEvent("leitstand:zeige", { detail: { art: "aufgabe", id: id } })); }   // index.html wechselt in den Reiter »Aufgaben« und setzt den Fokus auf die Zeile
  function aktion(ev) {
    var b = ev.target.closest("button[data-act]"); if (!b) return;
    if (b.dataset.act === "zeige") { zeigeAufgabe(b.dataset.id); return; }   // Bauschritt 4: eine Sache unter »Warten auf dich«, die keine Karte ist, und der Titel einer Zeile mit Verweisfeld führen in die Aufgaben
    var li = b.closest("li.akVorschlag"); if (!li || !db) return;
    var k = ich(); if (!k) { meldung(KANAL_TEXT.nurEditoren); return; }
    var jetzt = iso(), id = li.dataset.id, v = todoVon(id) || {};
    if (b.dataset.act === "ja") {   // Beschreibung mit langem Rest: Bestätigen erst, nachdem »mehr« einmal aufgeklappt war — das Aufklappen zählt, der erste Klick nicht
      var mehr = li.querySelector("details.akMehr");
      if (mehr && vorschlagGelesen[id] !== v.beschreibung) { mehr.open = true; var sm = mehr.querySelector("summary"); if (sm) sm.focus(); meldung(KANAL_TEXT.erstLesen); return; }
    }
    var patch = b.dataset.act === "ja"
      ? { angefordert: true, angefordertVon: k, angefordertAm: jetzt, bestaetigtVon: k, bestaetigtAm: jetzt, abgelehntVon: "", abgelehntAm: "" }   // wie „Jetzt erledigen“, dazu wer bestätigt hat; eine frühere Ablehnung wird geleert (Bauschritt 1a)
      : { done: true, abgelehntVon: k, abgelehntAm: jetzt };
    if (b.dataset.act === "ja" && obj(v.planVorschlag) && !obj(v.plan)) { patch.plan = v.planVorschlag; patch.planVon = k; patch.planAm = jetzt; }   // was LES/JB bestätigen, gilt als Absprache
    var knoepfe = [].slice.call(li.querySelectorAll("button[data-act]")); knoepfe.forEach(function (x) { x.disabled = true; });
    if (blockDa()) nachAktion = { id: id, idx: [].slice.call(vorschlagEl.querySelectorAll("li[data-id]")).indexOf(li), bis: Date.now() + 8000 };   // Bauschritt 6: wohin der Fokus geht, wenn die Karte verschwindet
    db.collection("todos").doc(id).update(patch)
      .then(function () { meldung(b.dataset.act === "ja" ? KANAL_TEXT.bestaetigtMeldung : KANAL_TEXT.abgelehntMeldung); })
      .catch(function () { nachAktion = null; knoepfe.forEach(function (x) { x.disabled = false; }); meldung(KANAL_TEXT.aktionFehler); });
  }

  /* ================= Lagebild und Absprache (Fassung 3) ================= */
  function obj(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : null; }
  function ms(isoStr) { var t = isoStr ? new Date(isoStr).getTime() : NaN; return isNaN(t) ? null : t; }
  function todoVon(id) { return Object.prototype.hasOwnProperty.call(todoIndex, id) ? todoIndex[id] : null; }
  function texte(a) { return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string" && x; }) : []; }
  function eigenName(t, k) { return t && Object.prototype.hasOwnProperty.call(t, k) ? t[k] : undefined; }   // Runde 2 (Befund »geerbte Namen«): nur eigene Einträge, wie ortName (C7) — sonst stünde für »constructor« Programmtext im Block
  function kontoText(k) { return eigenName(LAGE_TEXT.kontoName, k) || (k ? k + " " + KANAL_TEXT.claude : ""); }
  function zugriffText(a) { return texte(a).map(function (z) { return eigenName(LAGE_TEXT.zugriffName, z) || z; }).join(", "); }
  function wieText(m, e, a) { return [m ? eigenName(LAGE_TEXT.modellName, m) || m : "", e || "", a ? eigenName(LAGE_TEXT.arbeitsweiseName, a) || a : ""].filter(Boolean).join(" · "); }
  function kuerzen(s, n) { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  /* Bauschritt 6 (G2): an einer Wortgrenze gekürzt — nie mitten im Wort; höchstens `n` Zeichen samt »…«. Ein einziges Wort, das länger ist, bleibt ganz (der Kasten bricht es nur, wenn es als Ganzes nicht in eine Zeile passt). */
  var FOLGEZEILE = 40;   // gesetzt: eine kurze Folgezeile (Material, Premiere-Fassung) im kleinen Kasten
  function wortKuerzen(s, n) {
    s = String(s).replace(/\s+/g, " ").trim(); if (s.length <= n) return s;
    var teil = s.slice(0, n - 1), i = teil.lastIndexOf(" "), erstes = s.indexOf(" ");
    if (i === -1) return erstes === -1 ? s : s.slice(0, erstes) + " …";
    return teil.slice(0, i).replace(/[\s,;:·—\-–]+$/, "") + " …";
  }
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
    if (pl.stand) t.push(eigenName(T.standName, pl.stand) || String(pl.stand));
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
  var PLATZ_RANG = { claude: 0, mensch: 1, dienst: 2, warte: 3, dran: 4 };

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
  function ortVonZiel(z) { if (lesart()) return lesart().ortVonZiel(z); z = String(z || ""); var m = /@(.+)$/.exec(z); return m ? m[1] : ORTE.indexOf(z) !== -1 || /^[a-z0-9-]+$/.test(z) && z !== "egal" && z !== "alle" ? z : "egal"; }
  /* Nach fehler/abgebrochen ist ein Auftrag erst wieder frei, wenn danach erneut angefordert wurde (angefordertAm nach s11beendetAm) — wie kanal_frei (SQL) und der Listener */
  function neuAngefordert(v) { if (lesart()) return lesart().neuAngefordert(v); var a = ms(v.angefordertAm), b = ms(v.s11beendetAm); return v.angefordert === true && a != null && (b == null || a > b); }
  /* Bauschritt 2: das Wort einer Claude-Aufgabe ist das der Lesart (§ 3.2); was die Seite dahinter schon sagt (Ort, Fortschritt), bleibt, wenn der Satz mit dem Wort beginnt */
  function statusAufgabe(v) {
    var s = statusAufgabeAlt(v), L = lesart(), a = L ? L.art(v) : "", V = vier();
    if (V && a === "offen") {   // Bauschritt 4: jede offene Claude-Aufgabe nach der Regel der Lesart trägt ihr Wort — auch eine, die nur über `s11status` oder `angefordert` als Claude-Aufgabe erkennbar ist
      var z4 = V.zustand(v); s.wort = z4.wort; s.zst = z4; if (!s.t || s.t.indexOf(z4.wort) !== 0) s.t = z4.wort;
      s.k = z4.nr === 6 || z4.nr === 7 ? "fehler" : s.k === "fehler" ? "" : s.k;   // Warnfarbe nur für Fehler und abgebrochen — ein Vorschlag mit Fehlerstatus bleibt ein Vorschlag (§ 3.2)
      return s;
    }
    if (V && a === "chat") { var cz = V.chatZustand(v); if (cz) { s.wort = cz.wort; s.zst = cz; if (!s.t || s.t.indexOf(cz.wort) !== 0) s.t = cz.wort; } return s; }   // eine laufende oder pausierte Chat-Nachricht trägt das Wort ihres Zustands
    if (!L || !s.t || !L.claudeArt(v) || !(a === "offen" || (a === "erledigt" && !L.wahrWert(v.done)))) return s;   // wie im Reiter: nur Claude-Aufgaben nach typ/wer — offen, oder fertig gemeldet und zurückgeholt (nicht abgehakt)
    var z = L.zustand(v);
    s.wort = z.wort; s.zst = z; if (s.t.indexOf(z.wort) !== 0) s.t = z.wort;
    return s;
  }
  function statusAufgabeAlt(v) {
    var T = LAGE_TEXT, pl = obj(v.plan), claude = (v.typ === "claude" || v.wer === "Claude") && !v.done;
    if (v.s11status === "laeuft") {
      /* Bauschritt 3: sagt der Lauf nichts, steht dort nur »läuft«. Nichts gesagt heißt auch: Kennung oder s11ziel bestehen aus Leerzeichen; und der Text der Datenbank in s11ziel (»Konto @ Arbeitsplatz«,
         ohne s11kennung nur in Altbestand) ist keine Ortsangabe — die Seite liest für die Anzeige nie den Text in s11ziel (§ 4) */
      var L = marken(), kDa = L ? L.textDa(v.s11kennung) : !!v.s11kennung, zDa = L ? L.textDa(v.s11ziel) && !/\s@\s/.test(String(v.s11ziel)) : !!v.s11ziel;
      var wo = kDa ? anzeige(v.s11kennung) : zDa ? ortName(v.s11ziel) : "";
      if (L) return { t: wo ? T.laeuftAuf + wo : T.laeuftAuf.replace(/\s+auf\s*$/, ""), k: "laeuft", auf: kDa ? { kennung: v.s11kennung } : zDa ? { ziel: v.s11ziel } : null };
      return { t: T.laeuftAuf + wo, k: "laeuft" };
    }
    if (v.s11status === "wartet") return { t: T.wartet + (v.s11fortschritt ? " — " + v.s11fortschritt : ""), k: "wartet" };
    if (claude && (v.s11status === "fehler" || v.s11status === "abgebrochen") && !neuAngefordert(v)) return { t: T.endstand[v.s11status], k: "fehler" };   // tot, bis jemand neu anfordert: kein »wartet«
    if (claude && v.s11status === "zurueckgegeben" && v.angefordert === true) return { t: T.endstand.zurueckgegeben, k: "frei" };
    if (claude) return v.angefordert === true ? { t: T.freigegeben, k: "frei" } : { t: T.nichtFreigegeben, k: "offen" };
    return pl && pl.stand ? { t: T.standName[pl.stand] || pl.stand, k: pl.stand } : { t: "", k: "" };
  }

  function lageModell(jetztMs) {
    var T = LAGE_TEXT, K = {}, kanten = [], kSet = {}, zonen = Object.create(null), erreichbar = {};   // Runde 3 (C7): Zonen ohne Vorfahren — ein Arbeitsplatz »constructor« oder »__proto__« bekommt seine Zone wie seine Gruppe im Brett
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
      var n = knoten("t:" + id, "aufgabe", { id: id, v: v, titel: V && v ? (V.textDa(v.text) ? String(v.text) : FEST.ng) : v && v.text || titel || id });   // Bauschritt 4: ohne Titel heißt es »nicht gemeldet« (§ 2.3), die Aufgabe hat trotzdem ihren Kasten
      if (V && v) { var ar = V.art(v); if (ar === "offen") n.cl = true; else if (ar === "chat") { n.chatN = true; n.sorte = "chat"; } }   // cl: eine offene Claude-Aufgabe (zählt); chatN: eine Chat-Nachricht (eigener Kasten, zählt nicht)
      if (v) texte(obj(v.plan) && v.plan.zugriff).forEach(function (z) { kante(n.key, speicher(z).key, ""); });
      return n;
    };
    var gezeigt = Object.create(null), M = marken(), V = vier();   // Runde 2 (Prüfbericht Bedienung, Befund 6): ohne geerbte Namen — eine Aufgabe mit einer Kennung wie »constructor« gilt sonst als schon gezeigt
    // 1. Claude-Sitzungen der letzten 12 Stunden (mit der Lesart, Bauschritt 3: auch ein Eintrag ohne Zeit — sein Kasten sagt »zuletzt nicht gemeldet« —; abgemeldete Einträge haben keinen Kasten; ein Eintrag mit
    //    status.dienst ist ein Hintergrunddienst und bekommt den Kasten DIENST, keinen Sitzungskasten)
    anwesenheit.filter(function (a) { var z = ms(a.zuletzt); return a.kennung && (M ? (z == null || jetztMs - z <= SICHTBAR_MS) && !M.abgemeldet(a) : z != null && jetztMs - z <= SICHTBAR_MS); })
      .sort(function (a, b) { return String(b.zuletzt || "").localeCompare(String(a.zuletzt || "")); })
      .forEach(function (a) {
        var st = obj(a.status) || {}, aktiv = jetztMs - ms(a.zuletzt) <= AKTIV_MS, au = gehaltenerAuftrag(a, st), genannt = null, ruht = false;
        /* Bauschritt 4 (§ 2.4): Nennt der Status einen Auftrag, der nicht mehr offen ist (erledigt, gelöscht, ohne Text), entsteht kein Kasten AUFGABE; die Zeile »Auftrag« des Sitzungskastens sagt es. Eine offene Claude-Aufgabe,
           die weder läuft noch pausiert, steht an ihrem Platz (»wartet auf Übernahme« oder »Warten auf dich«), nicht an der Sitzung — die Sitzung nennt sie nur in ihrer Zeile. */
        /* Runde 2 (Prüfbericht Zählungen, Befund 1; § 3.1): Auch eine Chat-Nachricht, die der Status nennt, hat ihren Kasten CHAT nur, solange sie läuft oder pausiert. Ist sie erledigt, sagt es die Zeile »Auftrag« wie bei jeder
           erledigten Aufgabe; sonst (abgebrochen, mit Fehler beendet, freigegeben und nicht begonnen) nennt die Sitzung sie nur in ihrer Zeile. */
        if (V && au) {
          var aart = au.v ? V.art(au.v) : "keine";
          if (aart === "chat" && V.erledigt(au.v)) aart = "erledigt";
          if (aart === "erledigt" || aart === "keine") { genannt = { titel: au.v && V.textDa(au.v.text) ? String(au.v.text) : au.titel || au.id }; au = null; }
          else ruht = aart === "chat" ? !V.chatZustand(au.v) : aart === "offen" && !V.laeuftOderPausiert(au.v);
          /* Bauschritt 5 (Auflage aus Bauschritt 4, Entscheidung B2): Widersprechen sich der Status dieser Sitzung und die Kennung des Laufs der Aufgabe (s11kennung), gilt die Kennung des Laufs: Zone und Platz der Aufgabe
             kommen aus ihr (unten, Teil 2), diese Sitzung nennt sie nur in ihrer Zeile »Auftrag«. */
          if (!ruht && aart === "offen" && V.laeuftOderPausiert(au.v) && V.textDa(au.v.s11kennung) && String(au.v.s11kennung) !== String(a.kennung)) ruht = true;
        }
        var pl = au && au.v ? obj(au.v.plan) : null;
        if (M && M.istDienst(a)) {
          var dz = zone(a.ort || ortVonZiel(a.kennung)), dn = knoten("p:dienst:" + dz, "platz", { sorte: "dienst", zone: dz, ort: dz, laeufe: [] });
          if (!dn.anw) { dn.anw = a; dn.st = st; dn.aktiv = aktiv; }
          return;
        }
        var p = knoten("p:" + a.kennung, "platz", { sorte: "claude", anw: a, st: st, aktiv: aktiv, abw: pl ? abweichungen(a, st, pl) : [], auftrag: au, genannt: genannt,
          zone: zone(a.ort || ortVonZiel(a.kennung)), wer: MITARBEITER.indexOf(st.mitarbeiter) !== -1 ? st.mitarbeiter : null });
        if (p.wer) kante(mensch(p.wer).key, p.key, aktiv ? "" : "blass");
        texte(st.zugriff_verfuegbar).forEach(function (z) { (erreichbar[z] = erreichbar[z] || []).push(a.kennung); });
        var t = null;
        if (au && ruht) return;
        if (au) { gezeigt[au.id] = true; t = aufgabe(au.id, au.v, au.titel); }
        else if (st.thema) t = knoten("t:thema:" + a.kennung, "aufgabe", { sorte: "thema", titel: st.thema });
        if (!t) return;
        if (V && !t.zone) t.zone = p.zone;
        kante(p.key, t.key, p.abw.length ? "abweichung" : aktiv && st.zustand === "arbeitet" ? "laeuft" : aktiv ? "" : "blass");
        texte(st.zugriff).forEach(function (z) { kante(t.key, speicher(z).key, aktiv ? "" : "blass"); });
      });
    // 2. Aufgaben aus todos: Läufe ohne Kennung (Hintergrunddienst), gehaltene ohne Sitzung im Lagebild, sonst nur mit Absprache
    /* Bauschritt 4 (§ 2.4, § 3.1): Jede offene Claude-Aufgabe nach der Regel der Lesart bekommt genau einen Kasten — auch ohne Absprache, auch ohne Text (dann heißt der Titel »nicht gemeldet«) — und nur eine offene.
       Eine Chat-Nachricht hat nur einen Kasten, solange sie läuft oder pausiert. Aufgaben für Menschen bleiben wie zuvor: mit Text, nicht erledigt, nur mit Absprache. */
    todos.filter(function (x) {
      if (gezeigt[x.id]) return false;
      if (!V) return !x.v.done && typeof x.v.text === "string" && x.v.text;
      var a = V.art(x.v);
      return a === "offen" || (a === "chat" && !V.erledigt(x.v)) || (a === "mensch" && !V.wahrWert(x.v.done) && typeof x.v.text === "string" && x.v.text);
    }).forEach(function (x) {
      var v = x.v, pl = obj(v.plan), a4 = V ? V.art(v) : "", claude = V ? a4 === "offen" || a4 === "chat" : v.typ === "claude" || v.wer === "Claude", lauf = V ? V.laeuftOderPausiert(v) : v.s11status === "laeuft" || v.s11status === "wartet", p, kennungDa = M ? M.textDa(v.s11kennung) : !!v.s11kennung;
      if (claude && lauf && !kennungDa) {
        if (M) { var oz = zone(M.ortDesLaufs(v)); p = knoten("p:dienst:" + oz, "platz", { sorte: "dienst", zone: oz, ort: oz, laeufe: [] }); (p.laeufe = p.laeufe || []).push(v); }   // E1: sagt der Lauf nichts, gilt das Ziel, wenn es ein fester Arbeitsplatz ist
        else p = knoten("p:dienst:" + (v.s11ziel || "?"), "platz", { sorte: "dienst", zone: zone(ortVonZiel(v.s11ziel)), ort: v.s11ziel });
      }
      else if (claude && lauf && kennungDa) {
        p = K["p:" + v.s11kennung];
        if (!p) {   // die Kennung hat oben keinen Kasten bekommen. Mit der Lesart (Bauschritt 3): Gibt es ihren Eintrag der Anwesenheit doch (älter als 12 Stunden oder abgemeldet), zeigt der Kasten, was er meldet — sonst hieße »nicht gemeldet«, was gemeldet ist
          var ea = M ? anwesenheit.filter(function (a) { return a && a.kennung === v.s11kennung; })[0] : null;
          /* Runde 3 (§ 2.4, »Schritt 3«): Ein Eintrag mit status.dienst ist ein Hintergrunddienst — auch hier entsteht für ihn kein Sitzungskasten. Die Aufgabe, die unter seiner Kennung läuft, hängt am Kasten DIENST seines Arbeitsplatzes. */
          if (ea && M.istDienst(ea)) { var ez = zone(ea.ort || ortVonZiel(ea.kennung)); p = knoten("p:dienst:" + ez, "platz", { sorte: "dienst", zone: ez, ort: ez, laeufe: [] }); (p.laeufe = p.laeufe || []).push(v); }
          else p = knoten("p:" + v.s11kennung, "platz", { sorte: "claude", anw: ea || { kennung: v.s11kennung }, st: (ea && obj(ea.status)) || {}, aktiv: false, abw: [], zone: zone((ea && ea.ort) || ortVonZiel(v.s11kennung)) });
        }
        /* Bauschritt 3 (§ 2.4: »nichts gemeldet und nichts übernommen«): Die laufende oder pausierte Aufgabe, die hier an den Kasten gehängt wird, steht auch in seiner Zeile »Auftrag« — der Kasten sagt nicht
           »kein Auftrag übernommen«, während sie an ihm hängt. Nennt der Status schon einen Auftrag, bleibt der; eine laufende geht einer pausierten vor. */
        if (M && p.sorte === "claude" && (v.s11status === "laeuft" || !neuAngefordert(v)) && (!p.auftrag || (p.auftragAusLauf && p.auftrag.v.s11status !== "laeuft" && v.s11status === "laeuft"))) { p.auftrag = { id: x.id, v: v, titel: null }; p.auftragAusLauf = true; }
        if (M && p.auftragAusLauf && p.auftrag.id === x.id) p.abw = pl ? abweichungen(p.anw, p.st, pl) : [];   // Runde 3: Steht die Aufgabe so in der Zeile »Auftrag«, gilt für sie dieselbe Prüfung wie oben — das Ist der Sitzung gegen ihre Absprache (»weicht ab«), ob sie läuft oder pausiert
      }
      else if (V && claude) {   // Bauschritt 4: nicht laufend, nicht pausiert — der Platz richtet sich nach dem Zustand der Lesart (A3: auch eine neu angeforderte Aufgabe steht hier, nicht mehr am Kasten, der sie zuletzt hielt)
        if (a4 === "chat") return;
        var zs = V.zustand(v), zo = zone(V.arbeitsplatz(v));
        if (zs.warten) p = knoten("p:dran:" + zo, "platz", { sorte: "dran", zone: zo });
        else { var ziel4 = v.ziel || "egal"; p = knoten("p:warte:" + ziel4, "platz", { sorte: "warte", ziel: ziel4, zone: zo }); if (pl && MITARBEITER.indexOf(pl.mitarbeiter) !== -1) kante(mensch(pl.mitarbeiter).key, p.key, "plan"); }
      }
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
      if (V && !t.zone) t.zone = p.zone;
      kante(p.key, t.key, v.s11status === "laeuft" ? "laeuft" : claude && !lauf ? "plan" : pl && pl.stand === "geplant" ? "plan" : "");
    });
    // Bauschritt 4 (§ 3.3, § 2.4): Nachrichten an das Kürzel, über die Schnittstelle des Kanals — je ein kleiner Kasten »Nachricht an dich« am Platz »Warten auf dich« des Arbeitsplatzes ihres Absenders
    if (V) V.wartenAufDich(ich(), todos).forEach(function (e) {
      if (e.art !== "nachricht") return;
      var m = e.v, nz = zone(typeof m.von === "string" && /@/.test(m.von) ? V.kennungTeile(m.von).ort : "egal"), np = knoten("p:dran:" + nz, "platz", { sorte: "dran", zone: nz });
      var nn = knoten("t:nachricht:" + e.id, "aufgabe", { sorte: "nachricht", id: e.id, m: m, titel: V.textDa(m.text) ? V.kern(m.text) : FEST.ng, zone: nz });
      kante(np.key, nn.key, "plan");
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
  /* Bauschritt 3 (§ 2.4, § 2.3): Modell, Effort und Helfer einer Sitzung oder eines Laufs als Zeilen; was fehlt, heißt »nicht gemeldet« */
  function modellHtml(d) { var T = LAGE_TEXT; return d.modell_genau ? "<code>" + esc(d.modell_genau) + "</code>" : d.modell ? esc(T.modellName[d.modell] || d.modell) + ' <span class="llFehlt">— ' + esc(FEST.fassungNg) + "</span>" : ngHtml(FEST.ng); }
  function effortHtml(d) { return d.effort ? esc(d.effort) : ngHtml(FEST.ng); }
  function helferKurz(d) { return d.helfer ? (d.helfer.length ? d.helfer.length + " " + FEST.helfer : FEST.keineHelfer) : d.arbeitsweise === "einzeln" ? FEST.keineHelfer : ""; }
  function helferDaten(st) { return { modell_genau: typeof st.modell_genau === "string" ? st.modell_genau : "", modell: st.modell || "", effort: st.effort || "", arbeitsweise: st.arbeitsweise || "", helfer: Array.isArray(st.helfer) ? st.helfer.filter(obj) : null }; }
  function dienstLauf(v) {   // was ein Lauf des Hintergrunddienstes über sich meldet (s11lauf, schreibt der Dienst erst mit Bauschritt 10); sonst nichts
    var l = obj(v.s11lauf) || {}, L = marken();
    return { konto: L.textDa(l.konto) && l.konto !== "offen" ? String(l.konto) : "?", modell_genau: typeof l.modell_genau === "string" ? l.modell_genau : "", modell: typeof l.modell === "string" ? l.modell : "", effort: typeof l.effort === "string" ? l.effort : "" };
  }
  /* Bauschritt 6 (Entscheidung G4): Die Zeile zu den Helfern trägt kein doppeltes Wort (»Helfer keine Helfer«, »Helfer 1 Helfer«): ohne vorangestellte Beschriftung steht dort »keine Helfer«, »1 Helfer«, »n Helfer« oder »Helfer nicht gemeldet« */
  function helferText(hk) { return hk ? esc(hk) : ngHtml(FEST.helfer + " " + FEST.ng); }
  function helferZeile(hk) { return '<span class="llZeile">' + helferText(hk) + "</span>"; }
  function zeileKasten(label, html, extra) { return '<span class="llZeile' + (extra ? " " + extra : "") + '"><span class="llLb">' + esc(label) + "</span> " + html + "</span>"; }
  function zustandWort(st) { return st.zustand ? LAGE_TEXT.zustand[st.zustand] || st.zustand : "Zustand " + FEST.ng; }
  function sitzungTeile(n, L) {   // Kasten einer Sitzung: Konto-Marke, Arbeitsplatz-Marke, Zustand oder »zuletzt …«, dann vier feste Zeilen — Modell, Effort, Auftrag, Helfer
    var T = LAGE_TEXT, st = n.st || {}, a = n.anw || {}, kt = L.kennungTeile(a.kennung), au = n.auftrag, sd = helferDaten(st), hk = helferKurz(sd), nichts = !au && !n.genannt && !sd.modell_genau && !sd.modell && !sd.effort && !hk;
    var held = au ? (au.v && au.v.text) || au.titel || au.id : "";
    return { neu: true, kopf: "", kp: L.markenPaar(kt.konto, n.zone, false), klein: n.aktiv ? zustandWort(st) : T.zuletzt + " " + (a.zuletzt && fmtZeit(a.zuletzt) ? fmtZeit(a.zuletzt) : FEST.ng),   // Runde 3: nicht von heute → Tag und Uhrzeit, wie »Zuletzt gesehen« und die Einzelheiten (fmtZeit); von heute nur die Uhrzeit
      zeilenH: nichts ? ['<span class="llZeile">' + ngHtml(FEST.nichts) + "</span>"]
        : [zeileKasten(T.modell, modellHtml(sd)), zeileKasten(T.effort, effortHtml(sd)), zeileKasten(FEST.auftrag, held ? esc(held) : n.genannt ? genanntHtml(n.genannt) : ngHtml(FEST.keinAuftrag), "llAuftrag"), helferZeile(hk)],
      marke: n.abw && n.abw.length ? T.abweichung + ": " + n.abw.join(", ") : "", zst: null };
  }
  function genanntHtml(g) { return ngHtml("»" + g.titel + "« — " + FEST4.genannt); }   // der Status nennt einen Auftrag, der nicht mehr offen ist (§ 2.4): kein Kasten AUFGABE, nur dieser Satz in der Zeile »Auftrag«
  function dienstKonten(n) { var laeufe = (n.laeufe || []).map(dienstLauf); return { laeufe: laeufe, konten: laeufe.map(function (d) { return d.konto; }).filter(function (k, i, arr) { return arr.indexOf(k) === i; }) }; }
  /* Modell oder Effort des Dienstes (§ 2.4): bei einem Lauf, was er meldet; bei mehreren »je Auftrag« — aber nur, wenn überhaupt ein Lauf etwas gemeldet hat. Meldet keiner etwas, heißt es »nicht gemeldet«.
     Kein Verweis auf Einzelheiten: je Lauf zeigen sie Modell und Konto erst mit den Schritten 6 und 9. */
  function dienstWie(d, effort) {
    var eine = d.laeufe.length === 1 ? d.laeufe[0] : null, gemeldet = d.laeufe.some(function (l) { return effort ? !!l.effort : !!(l.modell_genau || l.modell); });
    return eine ? (effort ? effortHtml(eine) : modellHtml(eine)) : gemeldet ? ngHtml(FEST.jeAuftrag) : ngHtml(FEST.ng);
  }
  function dienstTeile(n, L) {   // Kasten des Hintergrunddienstes: Konto-Marke des Laufs (Quadrat) oder »Konto nicht gemeldet« / »Konto je Auftrag«, Arbeitsplatz-Marke, Anwesenheit, Modell und Effort
    var T = LAGE_TEXT, a = n.anw, d = dienstKonten(n), st = n.st || {};
    return { neu: true, kopf: T.dienst, kp: d.konten.length === 1 ? L.markenPaar(d.konten[0], n.zone, true) : d.konten.length > 1 ? '<span class="llKp">' + ngHtml(FEST.kontoJeAuftrag) + " " + L.platzMarke(n.zone) + "</span>" : L.markenPaar("?", n.zone, true),
      klein: a ? zustandWort(st) + " · " + T.zuletzt + " " + (a.zuletzt && uhr(a.zuletzt) ? uhr(a.zuletzt) : FEST.ng) : FEST.anwesenheitNg,
      zeilenH: [zeileKasten(T.modell, dienstWie(d, false)), zeileKasten(T.effort, dienstWie(d, true))],
      marke: "", zst: null };
  }
  function kastenTeile(n) {
    var L = marken(), t;
    if (L && n.art === "platz" && n.sorte === "claude") return sitzungTeile(n, L);
    if (L && n.art === "platz" && n.sorte === "dienst") return dienstTeile(n, L);
    if (vier() && n.art === "platz" && n.sorte === "dran") return { neu: true, kopf: KANAL_TEXT.vorschlaegeTitel, kp: '<span class="llKp">' + L.platzMarke(n.zone) + "</span>", klein: "", zeilenH: ['<span class="alKZeile">' + esc(FEST4.dranSatz) + "</span>"], marke: "", zst: null };   // Platz »Warten auf dich« (DU)
    t = kastenTeileAlt(n);
    if (L && n.art === "platz" && n.sorte === "warte") { t.neu = true; t.kp = /@/.test(String(n.ziel)) ? L.kennungMarken(n.ziel) : '<span class="llKp">' + L.platzMarke(n.zone) + "</span>"; t.zeilenH = []; t.klein = ""; }   // §4: der gewünschte Arbeitsplatz als Marke statt »Ort: …«
    else if (L && n.art === "platz" && n.sorte === "mensch") { var ko = n.konto && n.konto !== "egal" && n.konto !== "ohne"; t.neu = true; t.kp = ko ? '<span class="llKp">' + L.kontoMarke(n.konto, false) + "</span>" : ""; t.zeilenH = ko || !n.konto ? [] : [ '<span class="alKZeile">' + esc(kontoText(n.konto)) + "</span>" ]; t.klein = ""; }
    else if (L && n.art === "aufgabe" && n.v) t.auf = statusAufgabe(n.v).auf || null;   // auch ohne Zustand der Lesart (eine laufende Chat-Nachricht): der Ort des Laufs als die zwei Marken
    return t;
  }
  function kastenTeileAlt(n) {
    var T = LAGE_TEXT, st = n.st || {}, z = [], kopf = "", klein = "", marke = "", zst = null;
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
        if (s.k === "fehler") { marke = s.t; if (n.v.s11ergebnis && !vier()) z.push(kuerzen(n.v.s11ergebnis, 90)); } else klein = s.t;   // Warnfarbe und letztes Ergebnis statt »freigegeben«; Bauschritt 6 (G2): mit der Lesart steht das Ergebnis nur in den Einzelheiten, nicht im kleinen Kasten
        zst = s.zst || null;
        if (texte(pl.material).length) z.push(texte(pl.material).join("; ")); if (pl.premiere) z.push(T.premiere + " " + pl.premiere); }
    }
    else if (n.art === "speicher") { kopf = T.zugriffName[n.z] || n.z; }
    return { kopf: kopf, klein: klein, zeilen: z.filter(Boolean), marke: marke, zst: zst };
  }
  /* »auf …« hinter »läuft«: der Ort, an dem der Lauf steht, als die zwei Marken (Kennung) oder die Arbeitsplatz-Marke (Ort des Dienstes); sonst der Text, wie ihn der Lauf meldet */
  function aufHtml(auf, L) {
    return esc(LAGE_TEXT.laeuftAuf.trim().split(/\s+/).slice(1).join(" ")) + " " +
      (auf.kennung ? L.kennungMarken(auf.kennung) : /^[a-z0-9-]+$/.test(String(auf.ziel)) ? '<span class="llKp">' + L.platzMarke(auf.ziel) + "</span>" : esc(ortName(auf.ziel)));
  }
  function kleinHtml(t) {   // mit der Lesart: die Marke des Zustands, dahinter, was die Seite schon sagte (Ort, Fortschritt); sonst der Text wie zuvor
    var L = lesart(), s = t.zst ? (t.marke || t.klein) : "", M = marken();
    if (M && !t.zst && t.auf) return '<span class="alKKlein">' + standHtml({ auf: t.auf }) + "</span>";   // Bauschritt 3: »läuft auf« und die zwei Marken auch dort, wo kein Zustand der Lesart steht (laufende Chat-Nachricht) — nie »Konto @ Arbeitsplatz« als ein Wort
    if (!L || !t.zst) return t.klein ? '<span class="alKKlein">' + esc(t.klein) + "</span>" : "";
    var rest = s.indexOf(t.zst.wort) === 0 ? s.slice(t.zst.wort.length) : "";
    if (M) {   // Bauschritt 3: die Zeile hinter der Marke beginnt mit keinem Komma und keinem anderen Trennzeichen; die Wörter bleiben. Läuft die Aufgabe, stehen dort die zwei Marken des Ortes.
      rest = rest.replace(/^(?:[\s,;:·•\u2010-\u2015\-]|\.{2,}|\.(?![A-Za-z0-9\u00c0-\u024f]))+/, "");   // ein Punkt, der zu einem Wort gehört (».env«), ist kein Trennzeichen und bleibt; mehrere Punkte hintereinander sind eines (Runde 3)
      if (t.auf && t.zst.nr === 3) return '<span class="alKKlein">' + L.markeHtml(t.zst) + " " + aufHtml(t.auf, L) + "</span>";
      return '<span class="alKKlein">' + L.markeHtml(t.zst) + (rest ? " " + esc(rest).replace(/ ([·•\u2010-\u2015\-]) /g, "\u00a0$1 ") : "") + "</span>";   // ein Strich mitten im Text bleibt am Wort davor (geschütztes Leerzeichen): auch eine umbrochene Zeile beginnt mit keinem Trennzeichen
    }
    return '<span class="alKKlein">' + L.markeHtml(t.zst) + esc(rest) + "</span>";
  }
  function kastenHtml(n, breite) {
    var t = kastenTeile(n), kl = "alKasten alArt-" + n.art + (n.sorte ? " alSorte-" + n.sorte : "") + (n.wer && n.art === "mitarbeiter" ? " alWer-" + n.wer : "") +
      (n.art === "platz" && n.sorte === "claude" && !n.aktiv ? " alBlass" : "") + (t.marke ? " alWarn" : ""), V = vier(), attr = "", breiteAttr = breite ? ' style="width:' + breite + 'px"' : "";
    if (V && n.art === "aufgabe" && n.sorte === "nachricht")   // Nachricht an dich: ein kleiner Kasten, der in den Kanal führt (§ 2.4)
      return '<button type="button" class="' + esc(kl) + ' alKlein" data-key="' + esc(n.key) + '" data-nachricht="' + esc(n.id) + '" data-sprung="warten" aria-pressed="false"' + breiteAttr + '><span class="alKrow"><span class="alKMarkeN">' + esc(FEST4.nachrichtAnDich) +
        '</span><span class="alKTitel">' + esc(n.titel) + "</span></span></button>";
    if (V && n.art === "aufgabe" && n.cl && n.v && t.zst) {   // jede offene Claude-Aufgabe: Kennung, Wort und Stufe am Kasten; was läuft oder pausiert, hängt groß an Sitzung oder Dienst, alles andere klein
      attr = ' data-lid="' + esc(n.id) + '" data-kl="' + esc(t.zst.klasse) + '" data-stufe="' + esc(t.zst.stufe) + '"';
      if (t.zst.nr !== 3 && t.zst.nr !== 4) return '<button type="button" class="' + esc(kl) + ' alKlein" data-key="' + esc(n.key) + '"' + attr + ' aria-pressed="false"' + breiteAttr + '><span class="alKrow">' + kleinHtml(t) + '<span class="alKKopf alKTitel">' + esc(t.kopf) + "</span></span>" +
        t.zeilen.slice(0, 1).map(function (x) { return '<span class="alKZeile">' + esc(wortKuerzen(x, FOLGEZEILE)) + "</span>"; }).join("") + "</button>";   // Bauschritt 6 (G2): höchstens eine kurze Folgezeile
    }
    if (V && n.art === "aufgabe" && n.chatN && n.v) { attr = ' data-chat="' + esc(n.id) + '"'; t.kopf = FEST4.chat + t.kopf; }   // eine laufende oder pausierte Chat-Nachricht: eigener Kasten CHAT, zählt nicht mit
    if (t.neu) return '<button type="button" class="' + esc(kl) + '" data-key="' + esc(n.key) + '" aria-pressed="false"' + (breite ? ' style="width:' + breite + 'px"' : "") + ">" +   // Bauschritt 3: Sitzung, Dienst, Warte- und Mensch-Platz mit den zwei Marken
      '<span class="alSigel" aria-hidden="true">' + esc(LAGE_TEXT.sigel[n.sorte] || "") + "</span>" + (t.kopf ? '<span class="alKKopf">' + esc(t.kopf) + "</span>" : "") + (t.kp || "") +
      (t.klein ? '<span class="alKKlein">' + esc(t.klein) + "</span>" : "") + t.zeilenH.join("") + (t.marke ? '<span class="alKMarke">' + esc(t.marke) + "</span>" : "") + "</button>";
    return '<button type="button" class="' + esc(kl) + '" data-key="' + esc(n.key) + '"' + attr + ' aria-pressed="false"' + (breite ? ' style="width:' + breite + 'px"' : "") + ">" +
      '<span class="alSigel" aria-hidden="true">' + esc(LAGE_TEXT.sigel[n.art === "platz" || n.sorte === "thema" || n.sorte === "chat" ? n.sorte : n.art] || "") + "</span>" +
      '<span class="alKKopf">' + esc(t.kopf) + "</span>" + kleinHtml(t) +
      t.zeilen.map(function (x) { return '<span class="alKZeile">' + esc(x) + "</span>"; }).join("") + (t.marke && !t.zst ? '<span class="alKMarke">' + esc(t.marke) + "</span>" : "") + "</button>";
  }
  function zoneMarke(o) { return o === "offen" ? '<span class="llPlatz egal">' + esc(LAGE_TEXT.zoneOffen) + "</span>" : marken().platzMarke(o); }
  function kurzNameH(n) {   // wie kurzName, mit den Marken: die Sitzung als Konto und Arbeitsplatz, Dienst und Mensch-Platz mit der Marke des Arbeitsplatzes
    var L = marken();
    if (!L || n.art !== "platz" || n.sorte === "warte") return esc(kurzName(n));
    if (n.sorte === "claude") return L.markenPaar(L.kennungTeile(n.anw.kennung).konto, n.zone, false);
    return esc(kastenTeile(n).kopf) + " " + zoneMarke(n.zone);
  }
  function kurzName(n) { var t = kastenTeile(n); return n.art === "platz" && n.sorte === "claude" ? anzeige(n.anw.kennung) : n.art === "platz" && n.sorte !== "warte" ? t.kopf + " @ " + zoneName(n.zone) : t.kopf; }
  function zoneName(o) { return o === "egal" ? LAGE_TEXT.zoneEgal : o === "offen" ? LAGE_TEXT.zoneOffen : ortName(o); }
  function zeileH(label, html) { return html ? '<div class="alZeile"><span class="alLabel">' + esc(label) + "</span> " + html + "</div>" : ""; }   // wie zeile, der Wert ist schon HTML
  function standHtml(s) { var L = marken(); return L && s.auf ? esc(LAGE_TEXT.laeuftAuf.trim().split(/\s+/)[0]) + " " + aufHtml(s.auf, L) : esc(s.t); }
  /* Einzelheiten einer Sitzung (Bauschritt 3, AK 553–566): Konto und Arbeitsplatz als Marken; jede fehlende Angabe heißt »nicht gemeldet« */
  function sitzungDetail(n, L) {
    var T = LAGE_TEXT, st = n.st || {}, a = n.anw || {}, au = n.auftrag, pl = au && au.v ? obj(au.v.plan) : null, kt = L.kennungTeile(a.kennung), sd = helferDaten(st), hk = helferKurz(sd);
    var quelle = function (q) { return q ? " (" + (T.quelle[q] || q) + ")" : ""; };
    return zeileH(FEST.konto, L.kontoMarke(kt.konto, false) + (kt.roh ? " " + ngHtml("— " + FEST.nennt(kt.roh)) : "")) +
      zeileH(FEST.arbeitsplatz, L.platzMarke(n.zone) + (!n.aktiv ? " " + ngHtml("· " + FEST.gesehen + " " + (a.zuletzt && fmtZeit(a.zuletzt) ? fmtZeit(a.zuletzt) : FEST.ng)) : "")) +
      zeileH(FEST.menschSitzung, st.mitarbeiter ? esc(st.mitarbeiter + quelle(st.mitarbeiter_quelle)) : ngHtml(FEST.ng)) +
      zeileH(FEST.sitzung, st.sitzung ? "<code>" + esc(st.sitzung) + "</code>" : ngHtml("Kennung " + FEST.ng)) +
      zeileH(T.zustandWort, st.zustand ? esc(T.zustand[st.zustand] || st.zustand) : ngHtml(FEST.ng)) + zeileH(T.zuletzt, a.zuletzt && fmtZeit(a.zuletzt) ? esc(fmtZeit(a.zuletzt)) : ngHtml(FEST.ng)) +
      zeileH(T.modell, modellHtml(sd) + (sd.modell && st.modell_quelle ? " " + esc("(" + T.modell + " " + (T.quelle[st.modell_quelle] || st.modell_quelle) + ")") : "")) + zeileH(T.effort, effortHtml(sd)) +
      zeileH(T.arbeitsweise, sd.arbeitsweise ? esc(T.arbeitsweiseName[sd.arbeitsweise] || sd.arbeitsweise) : "") + '<div class="alZeile">' + helferText(hk) + "</div>" +
      zeileH(T.aufgabe, au ? esc((au.v && au.v.text) || au.titel || au.id) : n.genannt ? genanntHtml(n.genannt) : ngHtml(FEST.keinAuftrag)) + zeile(T.thema, st.thema || "") +
      (pl ? '<div class="alZeile' + (n.abw.length ? " alAbweichung" : "") + '"><span class="alLabel">' + esc(T.absprache) + "</span> " + esc(planZeile(pl, true)) +
        (n.abw.length ? ' <span class="alMarke">' + esc(T.abweichung + ": " + n.abw.join(", ")) + "</span>" : "") + "</div>" : "") +
      zeile(T.material, texte(st.material).join("; ")) + zeile(T.zugriff, zugriffText(st.zugriff)) +
      zeile(T.erreichbar, Array.isArray(st.zugriff_verfuegbar) ? zugriffText(st.zugriff_verfuegbar) || "—" : "") +
      zeile(T.premiere, st.premiere ? st.premiere + (st.premiere_quelle ? " (" + (T.quelle[st.premiere_quelle] || st.premiere_quelle) + ")" : "") : "") +
      zeile(T.projekt, st.projekt || "") + (st.details ? '<div class="alZeile"><span class="alLabel">' + esc(T.details) + '</span><div class="akText">' + esc(st.details) + "</div></div>" : "");
  }
  function platzDetail(n, L) {   // Hintergrunddienst, Platz »wartet auf Übernahme« und Mensch am Arbeitsplatz
    var T = LAGE_TEXT, a = n.anw, st = n.st || {};
    if (n.sorte === "dienst") {
      var d = dienstKonten(n);
      return zeileH(T.art, esc(T.dienst)) + zeileH(FEST.konto, d.konten.length === 1 ? L.kontoMarke(d.konten[0], true) : d.konten.length > 1 ? ngHtml(FEST.kontoJeAuftrag) : L.kontoMarke("?", true)) + zeileH(FEST.arbeitsplatz, zoneMarke(n.zone)) +
        (a ? zeileH(T.zustandWort, esc(zustandWort(st))) + zeileH(T.zuletzt, a.zuletzt && fmtZeit(a.zuletzt) ? esc(fmtZeit(a.zuletzt)) : ngHtml(FEST.ng)) : zeileH(T.zustandWort, ngHtml(FEST.anwesenheitNg))) +
        zeileH(T.modell, dienstWie(d, false)) + zeileH(T.effort, dienstWie(d, true));
    }
    return zeileH(T.art, esc(n.sorte === "mensch" ? (n.konto ? kontoText(n.konto) : T.mensch) : T.warteTitel)) + zeileH(T.rechner, zoneMarke(n.zone)) +
      (n.sorte === "warte" ? zeileH(KANAL_TEXT.ziel, zielHtml(n.ziel)) : "") + (n.sorte === "mensch" ? zeile(T.mitarbeiter, n.wer || "") : "");
  }
  /* Bauschritt 6: der Block der Lesart (§ 2.3) — derselbe Baustein wie im Aufgeklappten des Brettes. Er steht, wenn die Lesart ihn liefert UND ihre Stildatei da ist (Eigenschaft --ll-block); sonst gelten die Einzelheiten wie zuvor. */
  function blockDa() {
    var L = vier(), css = "";
    try { css = getComputedStyle(document.documentElement).getPropertyValue("--ll-block").trim(); } catch (e) { css = ""; }
    return L && L.block === 1 && typeof L.detailBlock === "function" && css === "1" ? L : null;
  }
  function detailHtml(n) {
    var T = LAGE_TEXT, M = lage.modell, h = "", knopf = null, L = marken(), BL = n.art === "aufgabe" && n.cl && n.v ? blockDa() : null;
    if (BL) return '<div class="alDetailKopf"><span class="alKKopf' + (L ? " llKopfMarken" : "") + '">' + kurzNameH(n) + '</span><button type="button" class="akBtn akNein" data-act="schliessen">' + esc(T.schliessen) + "</button></div>" +
      BL.detailBlock({ id: n.id, v: n.v }, { wo: "lage", jetzt: Date.now() }) + '<div class="akKnoepfe"><button type="button" class="akBtn akNein" data-act="absprache" data-id="' + esc(n.id) + '">' + esc(T.aendern) + "</button></div>";
    var namen = function (keys) { return keys.map(function (k) { return kurzNameH(M.knoten[k]); }).join(" · "); };
    if (n.art === "mitarbeiter") h = zeile(T.mitarbeiter, n.wer) + zeile(T.praesenzWort, n.praesenz || "") + (n.ohneMeldung ? zeile("", T.ohneMeldung) : "");
    else if (L && n.art === "platz" && n.sorte === "claude") { h = sitzungDetail(n, L); if (n.auftrag && n.auftrag.v && !n.auftrag.v.done) knopf = n.auftrag.id; }
    else if (L && n.art === "platz") h = platzDetail(n, L);
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
      h = zeile(T.aufgabe, v.text) + zeileH(T.stand, standHtml(s)) + (s.k === "fehler" && v.s11ergebnis ? zeile(T.ergebnis, kuerzen(v.s11ergebnis, 600)) : "") +
        zeile(T.absprache, planZeile(v.plan, true)) + (v.planVon ? zeile(T.festgelegt, v.planVon + (v.planAm ? " " + fmtZeit(v.planAm) : "")) : "") +
        (v.beschreibung ? '<div class="alZeile"><span class="alLabel">' + esc(KANAL_TEXT.beschreibung) + '</span><div class="akText">' + esc(String(v.beschreibung).slice(0, 1200)) + "</div></div>" : "");
      knopf = n.id;
    }
    else if (n.art === "aufgabe") h = zeile(T.thema, n.titel);
    else if (n.art === "speicher") h = zeile(T.zugriff, T.zugriffName[n.z] || n.z) +
      (L ? zeileH(T.erreichbar, (M.erreichbar[n.z] || []).map(function (k) { return L.kennungMarken(k); }).join(" · ") || "—")   // Bauschritt 3: je Sitzung die zwei Marken, nicht »Konto @ Arbeitsplatz« als ein Wort
        : zeile(T.erreichbar, (M.erreichbar[n.z] || []).map(function (k) { return anzeige(k); }).join(" · ") || "—"));
    var st = strang(n.key), nh = Object.keys(st.hoch).length, nr = Object.keys(st.runter).length;
    h += zeileH(T.links + " (" + n.links.length + ")", namen(n.links)) + zeileH(T.rechts + " (" + n.rechts.length + ")", namen(n.rechts)) +
      zeile(T.reichweite, T.aufwaerts + " " + nh + " · " + T.abwaerts + " " + nr);
    return '<div class="alDetailKopf"><span class="alKKopf' + (L ? " llKopfMarken" : "") + '">' + kurzNameH(n) + '</span><button type="button" class="akBtn akNein" data-act="schliessen">' + esc(T.schliessen) + "</button></div>" + h +
      (knopf ? '<div class="akKnoepfe"><button type="button" class="akBtn akNein" data-act="absprache" data-id="' + esc(knopf) + '">' + esc(T.aendern) + "</button></div>" : "");
  }

  /* Bauschritt 6 (§ 2.3): die Zeilen des Kanals, die auf eine Aufgabe zeigen — für den Block der Lesart. Der Kanal behält dafür die geladenen Zeilen (älteste zuerst); `gezeigt` sind die, die er zeichnet (die letzten 100).
     Je Zeile fertig gesetzt: Zeit, Absender (HTML, geprüft mit esc), was sie tut, Text. */
  function zeilenZu(id) {
    if (typeof id !== "string" || id === "") return [];
    return kanalAlle.filter(function (r) { return r.v && r.v[FELD_VERWEIS] === id; }).map(function (r) {
      var v = r.v, agent = v.rolle === "agent", system = v.rolle === "system", vonDa = typeof v.von === "string" && v.von.replace(/\s+/g, "") !== "";
      return { id: r.id, gezeigt: kanalGezeigt[r.id] === true, zeit: fmtZeit(v.created) || FEST.ng,
        von: agent ? (vonDa ? anzeigeHtml(v.von) : ngHtml(FEST.ng)) : system ? esc(KANAL_TEXT.system) : vonDa ? chip(v.von) : ngHtml(FEST.ng),
        was: v.art && v.art !== "nachricht" ? eigenName(KANAL_TEXT.art, v.art) || String(v.art) : "", text: typeof v.text === "string" && v.text ? kurztitel(v.text) : "" };
    });
  }
  /* Die Kette im Lagebild: die Kästen, an denen die Aufgabe hängt — Mensch, Platz (Sitzung, Dienst, »Warten auf dich« oder »wartet auf Übernahme«), die Aufgabe selbst, ihr Speicher. null, wenn sie keinen Kasten hat. */
  function kette(id) {
    var M = lage.modell, n = M && typeof id === "string" ? M.knoten["t:" + id] : null; if (!n || !n.cl || !n.v) return null;
    var k = [], p = n.links.map(function (x) { return M.knoten[x]; }).filter(function (x) { return x && x.art === "platz"; })[0], zs = vier() ? vier().zustand(n.v) : null;
    if (p) {
      var m = p.links.map(function (x) { return M.knoten[x]; }).filter(function (x) { return x && x.art === "mitarbeiter"; })[0]; if (m) k.push(["m", m.wer]);
      k.push([p.sorte === "dienst" ? "d" : p.sorte === "claude" ? "p" : "w", p.sorte === "claude" ? anzeige(p.anw.kennung) : p.sorte === "dienst" ? FEST.dienstWort + " @ " + zoneName(p.zone) : (p.sorte === "dran" ? FEST4.warten : LAGE_TEXT.warteTitel) + " · " + zoneName(p.zone)]);
    }
    k.push(["a", FEST.dieseAufgabe + " · " + (zs ? zs.wort : "")]);
    n.rechts.forEach(function (x) { var s = M.knoten[x]; if (s && s.art === "speicher") k.push(["s", eigenName(LAGE_TEXT.zugriffName, s.z) || s.z]); });
    return k;
  }

  /* ---- Setzen und Zeichnen ---- */
  function renderLage() {
    if (!lageEl) return;
    lage.modell = lageModell(Date.now());
    if (lage.wahl && !lage.modell.knoten[lage.wahl]) lage.wahl = null;
    zeichnen(false);
  }
  function zonenReihe(zonen) {
    if (lesart()) return lesart().zonenReihe(zonen);   // feste Arbeitsplätze in fester Reihenfolge, andere nach dem Alphabet, zuletzt »egal« und »offen«
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
    var y0 = window.pageYOffset;   // Runde 2 (M2, zu B3): der Rollstand vor dem Neuschreiben des Bildes
    var V = vier(), fk = fokusVon(lageEl), dfk = V ? detailHeim() : null, fertig = function () { hervorheben(); detailZeigen(dfk);
      if (Math.abs(window.pageYOffset - y0) > 1) window.scrollTo(0, y0);   // Runde 2 (M2, zu B3): beim Neuschreiben ist das Bild kurz kürzer (schmal gehen die Einzelheiten unter dem Kasten heraus und wieder hinein, breit wird erst eingesetzt, dann gemessen) — der Browser rückt die Seite dabei nach; sie bleibt, wo der Mensch sie hatte
      fokusZurueck(lageEl, fk); };   // ein fokussierter Kasten behält den Fokus über das Neuzeichnen; Bauschritt 4: die Einzelheiten gehen vorher an ihren Platz zurück
    if (!alle.length) { lageEl.innerHTML = '<p class="alLeer">' + esc(T.leer) + "</p>"; detailZeigen(dfk); return; }
    var kopf = function (i) { return '<div class="alSpKopf"' + (breit ? ' style="left:' + (PAD + i * (BW + GX)) + "px;width:" + BW + 'px"' : "") + ">" + esc(T.spalten[i]) + "</div>"; };
    var zahlJeZone = Object.create(null); if (V) alle.forEach(function (n) { if (n.cl && n.zone) zahlJeZone[n.zone] = (zahlJeZone[n.zone] || 0) + 1; });   // Bauschritt 4: die Zahl der Claude-Aufgaben je Arbeitsplatz-Gruppe (die Summe ist die Zahl in der Legende)
    var zoneHtml = function (o) { var z = M.zonen[o], zn = zahlJeZone[o] || 0; return '<div class="alZone" data-ort="' + esc(o) + '"><div class="alZoneKopf"><span>' + esc(zoneName(o)) + "</span>" + (V ? '<span class="alZoneZahl" data-n="' + zn + '">' + zn + esc(zn === 1 ? FEST4.aufgabe1 : FEST4.aufgabeN) + "</span>" : "") + (z.badge ? '<span class="alZoneMarke">' + esc(z.badge) + "</span>" : "")+ "</div>"; };
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
    if (V) { var kh = 0; [].forEach.call(g.querySelectorAll(".alSpKopf"), function (b) { kh = Math.max(kh, b.offsetHeight); }); top0 = Math.max(top0, 10 + kh + 8); }   // Bauschritt 4 (A6): bricht ein Spaltenkopf um (»Konto · Arbeitsplatz« bei 1280 px), beginnt die erste Zone darunter, nicht darüber
    var mitte = function (k) { return pos[k].y + hoch[k] / 2; };
    var setzeSpalte = function (liste, x, ziel) {   // nach Zielhöhe sortiert, ohne Überlappung
      var y = top0;
      liste.map(function (n) { return { n: n, z: ziel(n) }; }).sort(function (a, b) { return a.z - b.z || a.n.key.localeCompare(b.n.key); }).forEach(function (o) {
        var yy = Math.max(y, Math.round(o.z - hoch[o.n.key] / 2)); pos[o.n.key] = { x: x, y: yy }; y = yy + hoch[o.n.key] + LUECKE;
      });
    };
    // Arbeitsplätze in Zonen
    var y = top0, zonenPos = {};
    var schnitt = function (keys, rueck) { var w = keys.filter(function (k) { return pos[k]; }).map(mitte); return w.length ? w.reduce(function (s, v) { return s + v; }, 0) / w.length : rueck; };
    if (V) {
      /* Bauschritt 6 (Entscheidung G1): Die Kästen einer Zone stehen in ihrem Band. Wächst die Spalte rechts neben einer Zone (Aufgaben, Themen, Nachrichten), wird die Zone so hoch, dass alle ihre Kästen neben ihr stehen;
         die nächste Zone beginnt darunter. Ein Mitarbeiter gehört der Zone seines ersten Platzes (Zonen in ihrer Reihenfolge), ein Speicher der Zone seiner ersten Aufgabe; Kästen ohne Zone stehen unter der letzten Zone.
         Linien zwischen Kästen derselben Zone bleiben so im Band; nur die Linie eines Mitarbeiters oder Speichers zu einer anderen Zone läuft durch fremde Zonen (bekannte Grenze). */
      var zi = function (o) { return zr.indexOf(o); };
      var ersteZone = function (n, seite) { var b = null; n[seite].forEach(function (k) { var m = M.knoten[k], o = m && m.zone; if (o != null && zi(o) !== -1 && (b == null || zi(o) < zi(b))) b = o; }); return b; };
      var band = {};
      alle.forEach(function (n) {
        var o = n.zone != null ? n.zone : n.art === "mitarbeiter" ? ersteZone(n, "rechts") : n.art === "aufgabe" || n.art === "speicher" ? ersteZone(n, "links") : null;
        band[n.key] = o != null && zi(o) !== -1 ? o : null;
      });
      var stapel = function (liste, x, ziel, start) {   // nach Zielhöhe sortiert, ohne Überlappung; liefert die Unterkante des letzten Kastens
        var yy = start, ende = start - LUECKE;
        liste.map(function (n) { return { n: n, z: ziel(n) }; }).sort(function (a, b) { return a.z - b.z || a.n.key.localeCompare(b.n.key); }).forEach(function (o) {
          var p = Math.max(yy, Math.round(o.z - hoch[o.n.key] / 2)); pos[o.n.key] = { x: x, y: p }; yy = p + hoch[o.n.key] + LUECKE; ende = p + hoch[o.n.key]; });
        return ende;
      };
      var imBand = function (keys, o) { return keys.filter(function (k) { return band[k] === o; }); };
      var bandSetzen = function (o, oben, kopf) {
        var von = oben + kopf, mit = alle.filter(function (n) { return band[n.key] === o; }), ende = von - LUECKE, py = von;
        mit.filter(function (n) { return n.art === "platz"; }).sort(platzOrdnung).forEach(function (n) { pos[n.key] = { x: X[1], y: py }; py += hoch[n.key] + LUECKE; });
        ende = Math.max(ende, py - LUECKE);
        ende = Math.max(ende, stapel(mit.filter(function (n) { return n.art === "aufgabe"; }).sort(ordnung.aufgabe), X[2], function (n) { return schnitt(imBand(n.links, o), von); }, von));
        ende = Math.max(ende, stapel(mit.filter(function (n) { return n.art === "mitarbeiter"; }).sort(ordnung.mitarbeiter), X[0], function (n) { return schnitt(imBand(n.rechts, o), von); }, von));
        ende = Math.max(ende, stapel(mit.filter(function (n) { return n.art === "speicher"; }).sort(ordnung.speicher), X[3], function (n) { return schnitt(imBand(n.links, o), von); }, von));
        return ende;
      };
      zr.forEach(function (o) { var oben = y, ende = bandSetzen(o, oben, 44); zonenPos[o] = { y: oben, h: ende - oben + 10 }; y = ende + LUECKE + 18; });
      if (alle.some(function (n) { return band[n.key] == null; })) y = bandSetzen(null, y, 0) + LUECKE;
    } else {
      zr.forEach(function (o) {
        var oben = y; y += 30;
        spalte("platz").filter(function (n) { return n.zone === o; }).sort(platzOrdnung).forEach(function (n) { pos[n.key] = { x: X[1], y: y }; y += hoch[n.key] + LUECKE; });
        zonenPos[o] = { y: oben, h: y - oben - LUECKE + 10 }; y += 18;
      });
      setzeSpalte(spalte("mitarbeiter"), X[0], function (n) { return schnitt(n.rechts, 1e6 + MITARBEITER.indexOf(n.wer)); });
      setzeSpalte(spalte("aufgabe"), X[2], function (n) { return schnitt(n.links, 1e6); });
      setzeSpalte(spalte("speicher"), X[3], function (n) { return schnitt(n.links, 1e6); });
    }
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
  /* Bauschritt 4 (§ 2.4): Die Legende zählt getrennt — Claude-Aufgaben (offene, dieselbe Zahl wie »Bei Claude« im Reiter »Aufgaben«), je Stufe, »Warten auf dich«, Claude-Sitzungen, Hintergrunddienste, Chat-Nachrichten
     (zählen nicht mit); dazu wie zuvor die Kästen für Mitarbeiter, Aufgaben für Menschen, »wartet auf Übernahme«, Speicher und die Linienarten */
  function legendeZahlen() {
    var z = { aufgaben: 0, vor: 0, bereit: 0, laeuft: 0, haengt: 0, dran: 0, sitzungen: 0, dienste: 0, chat: 0, mitarbeiter: 0, mensch: 0, warte: 0, speicher: 0 };
    Object.keys(lage.modell.knoten).forEach(function (k) {
      var n = lage.modell.knoten[k];
      if (n.art === "platz") { if (n.sorte === "claude") z.sitzungen++; else if (n.sorte === "dienst") z.dienste++; else if (n.sorte === "mensch") z.mensch++; else if (n.sorte === "warte") z.warte++; }
      else if (n.art === "mitarbeiter") z.mitarbeiter++; else if (n.art === "speicher") z.speicher++;
      else if (n.art === "aufgabe") {
        if (n.sorte === "nachricht") z.dran++;
        else if (n.chatN) z.chat++;
        else if (n.cl && n.v) { var zs = vier().zustand(n.v); z.aufgaben++; z[zs.stufe]++; if (zs.warten) z.dran++; }
      }
    });
    return z;
  }
  function legendeVier(el, V) {
    var z = legendeZahlen(), S = V.STUFEN, T = LAGE_TEXT, eins = function (k, label, zahl, extra) { return '<span class="alLeg alLeg-' + k + '" data-leg="' + k + '"><i></i>' + esc(label) + (zahl != null ? ' <b class="alLegZahl">' + zahl + "</b>" : "") + (extra ? esc(extra) : "") + "</span>"; };
    var html = eins("mitarbeiter", "Mitarbeiter", z.mitarbeiter) + eins("claude", FEST4.sitzungen, z.sitzungen) + (z.mensch ? eins("mensch", "ohne Claude / mit Absprache", z.mensch) : "") + eins("dienst", FEST4.dienste, z.dienste) +
      (z.warte ? eins("warte", T.legende[4][1], z.warte) : "") + eins("aufgabe", FEST4.aufgaben, z.aufgaben) + ["vor", "bereit", "laeuft", "haengt"].map(function (k) { return eins("stufe", S[k], z[k]).replace('data-leg="stufe"', 'data-leg="stufe" data-lstufe="' + k + '"'); }).join("") +
      eins("dran", FEST4.warten, z.dran) + (z.chat ? eins("chat", FEST4.chatLeg, z.chat, FEST4.chatLegZusatz) : "") + (z.speicher ? eins("speicher", "Speicher", z.speicher) : "") +
      ["laeuft", "plan", "abweichung"].map(function (k) { var l = T.legende.filter(function (x) { return x[0] === k; })[0]; return eins(k, l[1], null); }).join("");
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
  }
  function legendeZeigen() {   // wie Archify: je Kategorie die Zahl der Kästen; Linienarten ohne Zahl
    var el = karte && karte.querySelector("#alLegende"); if (!el || !lage.modell) return;
    if (vier()) { legendeVier(el, vier()); return; }
    var zahl = {}; Object.keys(lage.modell.knoten).forEach(function (k) { var n = lage.modell.knoten[k], c = n.art === "platz" ? n.sorte : n.art; zahl[c] = (zahl[c] || 0) + 1; });
    var html = LAGE_TEXT.legende.map(function (l) {
      var z = zahl[l[0]], linie = ["laeuft", "plan", "abweichung"].indexOf(l[0]) !== -1;
      return linie || z ? '<span class="alLeg alLeg-' + l[0] + '"><i></i>' + esc(l[1]) + (z ? ' <b class="alLegZahl">' + z + "</b>" : "") + "</span>" : "";
    }).join("");
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
  }
  /* Bauschritt 4 (§ 2.4): Breit haften die Einzelheiten unten an der Karte (höchstens 46 % der Fensterhöhe); schmal stehen sie unter dem gewählten Kasten, nichts haftet, nichts rollt in sich. Vor dem Neuschreiben des Bildes
     gehen sie an ihren Platz neben der Legende zurück (detailHeim) und mit ihnen der Fokus, der in ihnen lag. */
  function detailHeim() {
    var d = karte && karte.querySelector("#alDetail"), h = karte && karte.querySelector("#alDetailHeim");
    if (!d || !h || d.parentNode === h) return null;
    var f = d.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.act || null : null;
    h.appendChild(d); return f;
  }
  /* Runde 2 (B3): das fokussierte Element in den Einzelheiten, beschrieben durch Art, Sprung und Aktion — nach dem Neuzeichnen bekommt das gleiche Element den Fokus zurück, ohne zu rollen (wie fokusZurueck) */
  function blockFokusVon(d) {
    var a = document.activeElement; if (!a || a === document.body || a === d || !d.contains(a)) return null;
    return { tag: a.tagName, sprung: a.getAttribute("data-sprung"), act: a.getAttribute("data-act") };
  }
  function blockFokusZurueck(d, f) {
    var k = [].filter.call(d.querySelectorAll(f.tag.toLowerCase()), function (e) { return e.getAttribute("data-sprung") === f.sprung && e.getAttribute("data-act") === f.act; })[0];
    if (!k || k === document.activeElement || !k.focus) return;
    window.leitstandFokusWieder = true;
    try { k.focus({ preventScroll: true }); } finally { window.leitstandFokusWieder = false; }
  }
  function detailZeigen(dfk) {
    legendeZeigen();
    var d = karte && karte.querySelector("#alDetail"); if (!d) return;
    var n = lage.wahl && lage.modell && lage.modell.knoten[lage.wahl];
    var V = vier();
    if (V) {
      var h = karte.querySelector("#alDetailHeim"), schmal = !!(lageEl && lageEl.querySelector(".alSchmal")),
        b = n && lageEl ? [].filter.call(lageEl.querySelectorAll(".alKasten"), function (x) { return x.dataset.key === n.key; })[0] : null, unter = !!(n && b && schmal);
      if (unter) { if (b.nextSibling !== d) b.insertAdjacentElement("afterend", d); } else if (h && d.parentNode !== h) h.appendChild(d);
      d.classList.toggle("alUnten", unter); d.classList.toggle("alHaftet", !!n && !unter);
    }
    var html = n ? detailHtml(n) : '<p class="akHinweis">' + esc(LAGE_TEXT.tippHinweis) + "</p>";
    if (d._html !== html) { var fd = blockFokusVon(d); d.innerHTML = html; d._html = html; if (fd) blockFokusZurueck(d, fd); }   // Runde 2 (B3): zeichnet der Block neu (eine Zeile des Kanals kam dazu), bleibt der Fokus auf seinem Element
    d.classList.toggle("alOffen", !!n);
    if (V && dfk) { var fb = d.querySelector('[data-act="' + dfk + '"]'); if (fb) fb.focus({ preventScroll: true }); }
  }

  /* ---- Absprache festlegen (nur LES/JB; schreibt todos.plan, planVon, planAm) ---- */
  function optionen(werte, namen, leer) {
    return (leer ? '<option value="">' + esc(LAGE_TEXT.leerWahl) + "</option>" : "") + werte.map(function (w) { return '<option value="' + esc(w) + '">' + esc((namen && namen[w]) || w) + "</option>"; }).join("");
  }
  function lageKarteHtml() {
    var T = LAGE_TEXT, f = function (id, label, inner) { return '<label class="alFeld" for="' + id + '"><span>' + esc(label) + "</span>" + inner + "</label>"; };
    var ortNamen = {}; ORTE.forEach(function (o) { ortNamen[o] = ortName(o); });
    var kontoNamen = { egal: T.kontoName.egal, ohne: T.kontoName.ohne }; KONTEN.forEach(function (k) { kontoNamen[k] = kontoText(k); });
    return '<section class="card" id="alKarte" aria-labelledby="alTitel"><h2 id="alTitel"' + (vier() ? ' tabindex="-1"' : "") + '>' + esc(T.titel) + ' <span class="hint">' + esc(T.hint) + "</span></h2>" +
      '<div id="alInhalt" class="alInhalt"><p class="alLeer">' + esc(T.leer) + "</p></div>" +
      '<div class="alLegende" id="alLegende" aria-hidden="true"></div>' +
      (vier() ? '<div id="alDetailHeim" class="alDetailHeim"><div id="alDetail" class="alDetail" aria-live="polite"></div></div>' : '<div id="alDetail" class="alDetail" aria-live="polite"></div>') +   // Bauschritt 4: der Heimplatz bleibt stehen, wenn die Einzelheiten unter einen Kasten ziehen
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
  /* Bauschritt 4 (§ 2.4, § 2.6): Der gewählte Kasten steht frei im Fenster — unter dem haftenden Kopf und, wenn die Einzelheiten unten haften, über ihnen; ein Kasten, der höher ist als der freie Teil, beginnt gleich unter dem Kopf */
  function kopfUnten() { var k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--kopfhoehe")) || 0; if (!k) { var hd = document.querySelector("header.top"); k = hd && getComputedStyle(hd).position === "sticky" ? hd.getBoundingClientRect().height : 0; } return k; }
  function kastenInsFenster(b) {
    if (!b || !b.isConnected) return;
    var d = karte && karte.querySelector("#alDetail"), kopf = kopfUnten(), haftet = !!(d && d.classList.contains("alHaftet") && d.classList.contains("alOffen")), r = b.getBoundingClientRect(),
      unten = window.innerHeight - (haftet ? d.getBoundingClientRect().height : 0), dy = 0;
    if (r.top < kopf + 8) dy = r.top - kopf - 8; else if (r.bottom > unten - 8) dy = Math.min(r.bottom - unten + 8, r.top - kopf - 8);
    if (dy) window.scrollBy({ top: dy, behavior: "auto" });
  }
  function zumKasten(key) { var b = lageEl && [].filter.call(lageEl.querySelectorAll(".alKasten"), function (x) { return x.dataset.key === key; })[0]; if (b) { b.focus({ preventScroll: true }); if (blockDa()) kastenInsFenster(b); } }   // Bauschritt 6: nach jedem Fokus der Seite wird nachgerollt
  /* Bauschritt 6 (§ 2.6): Fokus setzen und frei rollen — die Seite (index.html) liefert die Funktion; Zeilen im Verlauf des Kanals rollen zusätzlich in ihrem Rollbereich. Ohne sie: fokussieren und selbst unter den Kopf rollen (Runde 2, B5). */
  function fokusFrei(el) {
    if (!el) return;
    var v = el.closest && el.closest("ul.akVerlauf");
    if (v && v !== el) { var vb = v.getBoundingClientRect(), eb = el.getBoundingClientRect(); if (eb.top < vb.top) v.scrollTop -= vb.top - eb.top + 4; else if (eb.bottom > vb.bottom) v.scrollTop += eb.bottom - vb.bottom + 4; }
    if (typeof window.leitstandFokus === "function") window.leitstandFokus(el);
    else {   // Runde 2 (B5): eine index.html von vor dem Schritt (Zwischenspeicher) hat die Funktion nicht — dann rollt der Kanal selbst, bis das Ziel unter dem Kopf im Fenster steht
      el.focus({ preventScroll: true });
      var r = el.getBoundingClientRect(), kopf = kopfUnten();
      if (r.top < kopf || r.bottom > window.innerHeight) window.scrollBy({ top: r.top - kopf - 12, behavior: "auto" });
    }
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
      if (k && lageEl.contains(k)) {
        if (vier() && k.dataset.sprung === "warten") { springeZu("warten", k.dataset.nachricht); return; }   // Bauschritt 4: die Nachricht an dich führt in den Kanal, sie wählt nichts
        lage.wahl = lage.wahl === k.dataset.key ? null : k.dataset.key; hervorheben(); detailZeigen(); if (vier() && lage.wahl) kastenInsFenster(k); return;
      }
      if (ev.target.closest('button[data-act="schliessen"]')) { var war = lage.wahl; lage.wahl = null; hervorheben(); detailZeigen(); if (vier() && war) zumKasten(war); return; }
      var bk = ev.target.closest && ev.target.closest(".llBlock [data-act], .llBlock [data-sprung]");   // Bauschritt 6: der Knopf im Block ruft den einen Schreibweg der Lesart, die Sprünge führen in die Aufgaben, zu den Zeilen im Kanal und zu ihrer Sache
      if (bk && blockDa()) {
        var bid = bk.dataset.id, ba = bk.dataset.act, bs = bk.dataset.sprung;
        if (ba === "jetzt" || ba === "neu") { vier().freigeben(bid, ba, bk.closest(".llBlock")); return; }
        if (ba === "vorschlag" || bs === "vorschlag") { springeZu("warten", bid); return; }
        if (bs === "feld") { zeigeAufgabe(bid); return; }
        if (bs === "kanal") { springeZeile(bid); return; }
        return;
      }
      var b = ev.target.closest('button[data-act="absprache"]'); if (!b) return;
      aufgabenWahl(); edWahl.value = b.dataset.id; if (edWahl.value !== b.dataset.id) return;
      editorFuellen(b.dataset.id); lageMeldung("");
      var d = karte.querySelector("#alEditor"); d.open = true; edWahl.focus();
      if (d.scrollIntoView) d.scrollIntoView({ block: "nearest" });
    });
    var schweben = function (ev, an) { var k = ev.target.closest && ev.target.closest(".alKasten"); var neu = an && k ? k.dataset.key : null; if (neu !== lage.schwebe) { lage.schwebe = neu; hervorheben(); } };
    lageEl.addEventListener("mouseover", function (ev) { schweben(ev, true); }); lageEl.addEventListener("mouseleave", function (ev) { schweben(ev, false); });
    lageEl.addEventListener("focusin", function (ev) { schweben(ev, true); }); lageEl.addEventListener("focusout", function (ev) { schweben(ev, false); });
    /* Runde 2 (Prüfbericht Bedienung, Befund 2): Haften die Einzelheiten unten, verdecken sie keinen Kasten, den die Tastatur erreicht — er wird über sie ins Fenster geholt. Nur der Fokus der Tastatur (:focus-visible):
       holt ein Maus- oder Fingerdruck den Fokus, rollt nichts, sonst ginge der Klick verloren (Auflage A2). */
    lageEl.addEventListener("focusin", function (ev) {
      var k = ev.target && ev.target.closest ? ev.target.closest(".alKasten") : null, d = karte.querySelector("#alDetail"), taste = false;
      if (!k || !d.classList.contains("alHaftet") || !d.classList.contains("alOffen") || window.leitstandFokusWieder === true) return;
      try { taste = k.matches(':focus-visible'); } catch (e) { taste = false; }
      if (taste) kastenInsFenster(k);
    });
    document.addEventListener("focusin", function (ev) {   // Bauschritt 6 (§ 2.6): Fokus nie unter den haftenden Einzelheiten — ein Halt der Tastatur außerhalb des Lagebilds (Chat, Kanal, Absprache), den sie verdecken würden, wird über sie gerollt
      var d = karte && karte.querySelector("#alDetail"), e = ev.target;
      if (!blockDa() || !d || !d.classList.contains("alHaftet") || !d.classList.contains("alOffen") || window.leitstandFokusWieder === true || !e || !e.getBoundingClientRect || !e.closest || d.contains(e) || e.closest("header.top") || lageEl.contains(e)) return;
      var taste = false; try { taste = e.matches(":focus-visible"); } catch (x) { taste = false; }
      var r = e.getBoundingClientRect(), dr = d.getBoundingClientRect(), boden = dr.bottom >= window.innerHeight - 2 ? dr.top : window.innerHeight;   // sie decken nur, solange sie am unteren Fensterrand kleben
      if (taste && r.height && r.bottom > boden - 4) window.scrollBy({ top: Math.min(r.bottom - boden + 8, r.top - kopfUnten() - 8), behavior: "auto" });
    });
    lk.addEventListener("keydown", function (ev) {   // Bauschritt 4: Escape schließt die Einzelheiten und gibt den Fokus an den Kasten zurück; Bauschritt 6: zuerst die Meldung (der Seite und des Kanals), und wer das Escape verbraucht, ruft preventDefault
      if (ev.key !== "Escape" || ev.defaultPrevented || !(lage.wahl || lage.schwebe)) return;
      var toast = document.getElementById("toast");
      if (blockDa() && ((toast && toast.classList.contains("on")) || (meldungEl && !meldungEl.hidden))) return;
      var war = lage.wahl; lage.wahl = null; lage.schwebe = null; hervorheben(); detailZeigen(); if (vier() && war) { ev.preventDefault(); zumKasten(war); }
    });
    karte.addEventListener("keydown", function (ev) {   // Bauschritt 6 (§ 2.6): die Meldung unten, »mehr« am Vorschlag
      if (ev.key !== "Escape" || ev.defaultPrevented || !blockDa()) return;
      var toast = document.getElementById("toast"); if (toast && toast.classList.contains("on")) return;   // die Meldung der Seite schließt ihr eigener Hörer
      var a = document.activeElement, d = a && a.closest ? a.closest("details[open]") : null;   // »mehr« am Vorschlag und »Details« im Block
      if (meldungEl && !meldungEl.hidden) { ev.preventDefault(); meldung(""); return; }
      if (d) { ev.preventDefault(); d.open = false; fokusFrei(d.querySelector("summary")); }
    });
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

  /* Bauschritt 4 (§ 2.4): Im Reiter »Claude« steht oben eine Zeile mit vier Knöpfen — »Warten auf dich n«, »Lagebild«, »Agenten-Kanal«, »Chat mit Claude«. Ein Klick bringt das Ziel frei unter den haftenden Kopf und setzt den
     Fokus auf das Ziel selbst — nie auf einen Knopf, der etwas freigibt. Die Reihenfolge der Karten bleibt, wie sie veröffentlicht ist. */
  function sprungzeileBauen(host) {
    var nav = document.createElement("nav"); nav.className = "akSprungzeile"; nav.id = "akSprungzeile"; nav.setAttribute("aria-label", FEST4.sprungLabel);
    nav.innerHTML = '<button type="button" class="akSprung akSprungDran" data-sprung="warten">' + esc(FEST4.sprung.warten) + ' <b id="akSprungZahl">0</b></button>' +
      ["lagebild", "kanal", "chat"].map(function (k) { return '<button type="button" class="akSprung" data-sprung="' + k + '">' + esc(FEST4.sprung[k]) + "</button>"; }).join("");
    host.insertBefore(nav, host.firstChild);
    nav.addEventListener("click", function (ev) { var b = ev.target.closest("button[data-sprung]"); if (b) springeZu(b.dataset.sprung); });
    var h = host.querySelector("#claudeChatCard h2"); if (h) h.tabIndex = -1;   // das Ziel »Chat mit Claude« ist die Überschrift der Karte (claude-chat.js bleibt unverändert)
  }
  /* Bauschritt 6: »im Kanal zeigen« — die erste Zeile im Verlauf, die auf die Aufgabe zeigt; sie steht frei im Fenster und hat den Fokus */
  function springeZeile(id) {
    var z = verlaufEl && [].filter.call(verlaufEl.querySelectorAll("li[data-" + FELD_VERWEIS + "]"), function (x) { return x.getAttribute("data-" + FELD_VERWEIS) === String(id); })[0];
    if (z) fokusFrei(z);
  }
  /* Bauschritt 6: »im Lagebild zeigen« — der Kasten der Aufgabe steht frei im Fenster und hat den Fokus. Zeichnet das Lagebild gerade nicht (der Reiter wurde eben erst gezeigt), wird kurz gewartet. */
  function zeigeKasten(id, versuch) {
    var key = "t:" + id; if (!lage.modell || !lage.modell.knoten[key]) return;
    if (!lageEl || !lageEl.clientWidth) { if ((versuch || 0) < 20) setTimeout(function () { zeigeKasten(id, (versuch || 0) + 1); }, 50); return; }
    var kasten = function () { return [].filter.call(lageEl.querySelectorAll(".alKasten"), function (x) { return x.dataset.key === key; })[0]; }, b = kasten();
    if (!b) { renderLage(); b = kasten(); }
    if (b) { b.focus({ preventScroll: true }); kastenInsFenster(b); }   // der Kasten hat den Fokus (sein Strang leuchtet auf) und ist nicht gewählt: die erste Eingabetaste öffnet die Einzelheiten, nicht schließt sie (Prüfbericht Entwurf im Browser, Befund 9)
  }
  function springeZiel(el) {
    if (!el) return;
    var kopf = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--kopfhoehe")) || 0;
    if (!kopf) { var hd = document.querySelector("header.top"); kopf = hd && getComputedStyle(hd).position === "sticky" ? hd.getBoundingClientRect().height : 0; }
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - kopf - 12), behavior: "auto" });
    el.focus({ preventScroll: true });
  }
  function springeZu(wohin, id) {
    var ziel = null;
    if (wohin === "warten") ziel = (id && vorschlagEl && [].filter.call(vorschlagEl.querySelectorAll("li[data-id]"), function (x) { return x.dataset.id === String(id); })[0]) || (karte && karte.querySelector("#akWartenTitel"));
    else if (wohin === "lagebild") ziel = karte && karte.querySelector("#alTitel");
    else if (wohin === "kanal") ziel = karte && karte.querySelector("#akTitel");
    else if (wohin === "chat") ziel = document.querySelector("#page-claude #claudeChatCard h2");
    if (wohin === "warten" && id && ziel && ziel.dataset && ziel.dataset.id === String(id) && blockDa()) { fokusFrei(ziel); return; }   // Bauschritt 6: die Sache selbst, frei im Fenster
    springeZiel(ziel);
  }
  function aufbauen(host) {
    karte = document.createElement("div");
    karte.className = "grid akGrid";   // zwei Spalten wie auf der übrigen Seite: links breit das Lagebild, rechts (390 px) der Messenger; schmal Messenger zuerst
    karte.innerHTML = '<div class="akSpalteChat"><section class="card akMessenger" id="akKarte" aria-labelledby="akTitel">' +
      '<h2 id="akTitel"' + (vier() ? ' tabindex="-1"' : "") + '>' + esc(KANAL_TEXT.titel) + ' <span class="hint">' + esc(KANAL_TEXT.hint) + "</span></h2>" +
      '<p class="akAnwesenheit" id="akAnwesenheit" hidden></p>' +
      '<div class="akAngeheftet" id="akAngeheftet"' + (vier() ? "" : " hidden") + '><h3 class="akUnter"' + (vier() ? ' id="akWartenTitel" tabindex="-1"' : "") + ">" + esc(KANAL_TEXT.vorschlaegeTitel) + (vier() ? ' <b class="akZahl" id="akWartenZahl">0</b>' : "") + '</h3><ul class="akVorschlaege" id="akVorschlaege"><li class="empty">' + esc(KANAL_TEXT.keineVorschlaege) + "</li></ul></div>" +
      '<ul class="akVerlauf" id="akVerlauf"><li class="empty">' + esc(KANAL_TEXT.leer) + "</li></ul>" +
      '<div class="akSrNur" id="akAnsage" role="status" aria-live="polite" aria-atomic="true"></div>' +
      '<form class="add akForm" id="akForm"><textarea id="akText" rows="1" maxlength="4000" placeholder="' + esc(KANAL_TEXT.platzhalter) + '" aria-label="' + esc(KANAL_TEXT.platzhalter) + '" title="' + esc(KANAL_TEXT.enterHinweis) + '"></textarea>' +
      '<select id="akAn" aria-label="' + esc(KANAL_TEXT.an) + '"></select>' +
      '<label class="akAuftrag"><input type="checkbox" id="akAlsAuftrag"> ' + esc(KANAL_TEXT.alsAuftrag) + "</label>" +
      '<button class="primary akSenden" type="submit">' + esc(KANAL_TEXT.senden) + "</button></form>" +
      (fuenf() ? '<p class="akUebernimmt" id="akUebernimmt" role="status"></p>' : "") +
      '<p class="akHinweis akFussHinweis">' + esc(KANAL_TEXT.hinweis) + "</p>" +
      '<div id="akMeldung" role="status" hidden></div></section></div>' +
      '<div class="akSpalteLage">' + lageKarteHtml() + "</div>";
    host.appendChild(karte);
    if (vier()) sprungzeileBauen(host);
    verlaufEl = karte.querySelector("#akVerlauf"); vorschlagEl = karte.querySelector("#akVorschlaege");
    formEl = karte.querySelector("#akForm"); textEl = karte.querySelector("#akText"); anEl = karte.querySelector("#akAn"); meldungEl = karte.querySelector("#akMeldung");
    auftragEl = karte.querySelector("#akAlsAuftrag"); anwEl = karte.querySelector("#akAnwesenheit");
    anOptionen(); uebernimmtZeigen(); anEl.addEventListener("change", uebernimmtZeigen);
    verlaufEl.addEventListener("click", function (ev) { var b = ev.target.closest && ev.target.closest('button[data-act="zeige"]'); if (b) zeigeAufgabe(b.dataset.id); });   // Bauschritt 4: der Titel einer Zeile mit Verweisfeld führt in die Aufgaben
    formEl.addEventListener("submit", senden);
    textEl.addEventListener("keydown", taste); textEl.addEventListener("input", hoehe);
    vorschlagEl.addEventListener("click", sprungSchutz, true);   // vor aktion und vor dem Aufklappen: der Folgeklick eines Doppelklicks auf »Zum Vorschlag →« zählt nicht
    vorschlagEl.addEventListener("click", aktion); vorschlagEl.addEventListener("toggle", mehrUmgeschaltet, true);
    if (typeof ResizeObserver === "function") new ResizeObserver(verlaufSichtbar).observe(verlaufEl); window.addEventListener("hashchange", function () { setTimeout(verlaufSichtbar, 0); });
    lageVerdrahten();
  }

  /* Bauschritt 1a: »Zum Vorschlag →« in der Aufgabenzeile (index.html) meldet leitstand:zeige {art:"vorschlag", id}; die Karte kommt ins Fenster und
     bekommt den Fokus (tabindex -1) — nie ein Knopf. Gibt es die Karte nicht, bleibt der Reiter stehen; die Liste sagt dort selbst, was wartet. */
  /* Sperre nach dem Sprung: Der zweite Klick eines Doppelklicks (oder Doppeltipps) auf »Zum Vorschlag →« landet nach dem Reiterwechsel dort, wo vorher die
     Aufgabenzeile stand — bei schmalem Fenster auf »Bestätigen« oder »Ablehnen« der Karte. Darum nimmt die Liste der Vorschläge SPRUNG_SPERRE_MS lang nach
     dem Sprung keinen Klick an (auch kein Aufklappen von »mehr«), und ein Klick, dessen Druck (Maus oder Finger) vor dem Sprung begann, zählt nicht — gleich,
     wie spät er endet; ein Klick über die Tastatur hat keinen Druck und fällt nur unter die Sperrzeit. 700 ms: über der üblichen Doppelklick-Grenze der
     Systeme (500 ms) und der Doppeltipp-Grenze (um 300 ms), unter der Sekunde, nach der ein bewusster Klick kommt. */
  var SPRUNG_SPERRE_MS = 700, sprungAm = -Infinity, druckAb = -Infinity;
  ["pointerdown", "mousedown", "touchstart"].forEach(function (n) { document.addEventListener(n, function () { druckAb = performance.now(); }, { capture: true, passive: true }); });
  function sprungSchutz(ev) {
    var jetztMs = performance.now(), vorDemSprung = sprungAm > -Infinity && ev.detail > 0 && druckAb <= sprungAm;
    if (vorDemSprung) druckAb = jetztMs;   // genau dieser eine Klick zählt nicht; der nächste beginnt mit einem neuen Druck
    if (jetztMs - sprungAm < SPRUNG_SPERRE_MS || vorDemSprung) { ev.preventDefault(); ev.stopPropagation(); }
  }
  document.addEventListener("leitstand:zeige", function (ev) {   // Bauschritt 5: der Satz am Formular und die Zeile der Nachrichten im Claude-Feld führen auf das Sendefeld bzw. zu »Warten auf dich« im Kanal
    var d = ev && ev.detail; if (!d || !fuenf()) return;
    if (d.art === "senden" && anEl) springeZiel(anEl); else if (d.art === "warten") springeZu("warten");
  });
  document.addEventListener("leitstand:zeige", function (ev) {   // Bauschritt 6: aus einer Aufgabe ins Lagebild und zu ihren Zeilen im Kanal
    var d = ev && ev.detail; if (!d || !blockDa() || typeof d.id !== "string") return;
    if (d.art === "lage") zeigeKasten(d.id); else if (d.art === "kanal") springeZeile(d.id);
  });
  document.addEventListener("leitstand:zeige", function (ev) {
    var d = ev && ev.detail; if (!d || d.art !== "vorschlag" || !vorschlagEl) return;
    sprungAm = performance.now();
    var li = [].filter.call(vorschlagEl.querySelectorAll("li.akVorschlag"), function (x) { return x.dataset.id === String(d.id); })[0]; if (!li) return;
    try { li.scrollIntoView({ block: "center" }); } catch (e) {}
    li.focus({ preventScroll: true });
    if (blockDa()) fokusFrei(li);   // Bauschritt 6 (§ 2.6): nach dem Fokus der Seite wird nachgerollt, bis das Ziel frei im Fenster steht — auch über den haftenden Einzelheiten des Lagebilds
  });

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
        if (admin) { renderVorschlaege(); renderLage(); aufgabenWahl(); if (vier() && kanalSnap) renderKanal(kanalSnap); if (blockDa()) document.dispatchEvent(new CustomEvent("leitstand:kanal", { detail: { was: "aufgaben" } })); }   // Bauschritt 4: die Marke »jetzt …« an den Zeilen mit Verweisfeld liest die Aufgaben; Bauschritt 6: die Kette im Lagebild liest sie auch — der Block im Feld zeichnet neu
        schmuecken();
      }, function () {});
      if (!admin || !host) return;                                      // Gäste: weder Kanal noch Lagebild; "kanal", "kanal_anwesenheit", "praesenz" nie abgefragt
      /* Bauschritt 4: die Schnittstelle des Kanals (nur für Editoren): die Anwesenheit, wie sie gerade gilt, und die Nachrichten an ein Kürzel, die noch auf Antwort oder »Gesehen« warten — leer, bis der Kanal
         »Antworten« und »Gesehen« schreibt (eigener, späterer Umbau). Ändert sich etwas, kommt das Ereignis leitstand:kanal; wer die Liste braucht, fragt dann neu. */
      window.LEITSTAND_KANAL = { anwesenheit: function () { try { return JSON.parse(JSON.stringify(anwesenheit)); } catch (e) { return []; } }, wartendeNachrichten: function () { return []; },
        zeilenZu: zeilenZu, kette: kette, planZeile: function (pl) { return planZeile(pl, true); }, abweichungen: function (a, st, pl) { return obj(a) && obj(st) && obj(pl) ? abweichungen(a, st, pl) : []; } };   // Bauschritt 6: für den Block der Lesart
      document.addEventListener("leitstand:kanal", function () { renderVorschlaege(); renderLage(); });
      if (!document.getElementById("akKarte")) aufbauen(host);
      db.collection("kanal").onSnapshot(renderKanal, function () { meldung(KANAL_TEXT.keineVerbindung); });
      db.collection("kanal_anwesenheit").onSnapshot(function (snap) { anwesenheit = snap.docs.map(function (x) { return x.data() || {}; }).filter(obj); renderAnwesenheit(); renderLage(); document.dispatchEvent(new CustomEvent("leitstand:kanal", { detail: { was: "anwesenheit" } })); }, function () {});
      db.collection("praesenz").onSnapshot(function (snap) { praesenz = snap.docs.map(function (x) { return x.data() || {}; }).filter(obj); renderLage(); }, function () {});
      setInterval(renderLage, 60000);                                   // »zuletzt« und aktiv/blass laufen mit der Uhr
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
