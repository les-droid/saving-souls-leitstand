/* Demo-Katalog der Sammlung `baukasten` (Bauart 1) — FREI ERFUNDEN: neutrale Platzhalter („Person A“), keine echten Namen, Orte oder Fragen aus
   JBs Dateien. Läuft nur lokal und nur mit ?demo=1&baukasten=1 (baukasten.js lädt die Datei selbst). Füllt den Demo-Speicher von aussagen-demo.js.
   Enthält eine Probe, die als Text erscheinen muss: „<img src=x onerror=alert(1)>“. CL JB 12.10.2026 */
(function () {
  "use strict";
  var h = location.hostname;
  if (!(location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]")) return;
  var K = { bauart: 1, stand: "DEMO", quelle: "erfunden",
    ort: { lat: 51.48, lon: 0.0, name: "Demo-Ort" },
    regeln: ["Offene Fragen stellen.", "Stille aushalten.", "In ganzen Sätzen antworten lassen."],
    module: [
      { id: "D0", titel: "Ankommen", min: 5, zweck: "Ton prüfen, Einverständnis.", fragen: [
        { id: "D0.1", text: "Ist es in Ordnung, dass wir aufnehmen?", pflicht: true, ziel: "Einverständnis im Ton" },
        { id: "D0.2", text: "Stell dich bitte kurz vor.", fuer: ["Person A", "Person B"] } ] },
      { id: "D1", titel: "Rückblick", min: 15, zweck: "Erinnerung an den Anfang.", fragen: [
        { id: "D1.1", text: "Wie hat alles angefangen?", nach: ["Wann genau?", "Wer war dabei?"] },
        { id: "D1.2", text: "Probe <img src=x onerror=alert(1)>", fuer: ["Person B"], hinweis: "Nur fragen, wenn es passt.", rueck: "DEMO-Interview, Minute 3" } ] }
    ],
    vorlagen: [
      { id: "demo-a", titel: "Demo: Gespräch Person A", person: "Person A", module: ["D0", "D1"] },
      { id: "demo-b", titel: "Demo: Kurzporträt Person B", person: "Person B", module: ["D0"] } ],
    dreh_bausteine: [
      { id: "ankunft", titel: "Ankunft", min: 30, art: "orga", notiz: "Absprache vor Ort." },
      { id: "arbeit", titel: "Arbeit beobachten", min: 90, art: "dreh", notiz: "Ruhige Kamera." },
      { id: "essen", titel: "Gemeinsam essen", min: 60, art: "pause", notiz: "Zwei Kameras." },
      { id: "gespraech", titel: "Gesetztes Interview", min: 60, art: "interview", notiz: "Neutraler Hintergrund." } ]
  };
  window.LEITSTAND_BAUKASTEN_DEMO = K;
  var store = window.LEITSTAND_DEMO_STORE;
  if (store && /[?&]demo=1(&|$)/.test(location.search)) { store.baukasten = {}; store.baukasten.katalog = JSON.parse(JSON.stringify(K)); }
})();
