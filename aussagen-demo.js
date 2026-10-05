/* Lokale Demo der Ansicht „Aussagen“ — ausschließlich mit ERFUNDENEN, neutralen Beispieldaten.
   Läuft nur auf localhost / 127.0.0.1 / [::1] / file: und nur mit ?demo=1. Keine Datenbank, keine Anmeldung;
   Sterne und alles andere leben nur im Speicher dieser Seite. Enthält keine echten Namen, Zitate oder Projektdaten. */
(function () {
  "use strict";
  var h = location.hostname;
  var lokal = location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  if (!lokal || !/[?&]demo=1(&|$)/.test(location.search)) return;
  window.LEITSTAND_DEMO = true;
  try { if (!localStorage.getItem("ss-wer")) localStorage.setItem("ss-wer", "LES"); } catch (e) {}   /* Demo: kein Kürzel-Dialog */

  var seed = 7;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  var TH = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"];
  var SATZ = ["Das ist ein erfundener Beispielsatz über %T", "Hier folgt Beispieltext zum Thema %T", "Dieser Absatz dient nur der Demonstration von %T", "Ein weiterer Platzhalter-Satz handelt von %T", "Zum Ausprobieren steht hier ein Satz zu %T"];
  var SPRECHER = ["Sprecherin Alpha", "Sprecher Beta", "Sprecher Gamma", "Sprecherin Delta"];
  var RUBRIKEN = [["Beispielrubrik C – Anfang", 1], ["Beispielrubrik A – Alltag", 2], ["Beispielrubrik E – Wendung", 3], ["Beispielrubrik B – Rückblick", 4], ["Beispielrubrik D – Ausblick", 5]];
  var TAGE_D = ["DT1", "DT2", "DT3", "DT5", "DT7"];

  var store = { clips: {}, tonclip: {}, aussagen: {}, aussagen_sterne: {} };
  var listeners = {};

  /* Clips mit Transkript: je 36 Blöcke à 10 s. Satznummern sind eindeutig → Kernstellen lassen sich exakt finden. */
  var clipListe = [];
  for (var c = 0; c < 14; c++) {
    var tag = TAGE_D[c % TAGE_D.length], name = "DEMO_C" + String(c + 1).padStart(3, "0");
    var bl = [];
    for (var b = 0; b < 36; b++) bl.push({ t0: b * 10, t1: b * 10 + 10, text: pick(SATZ).replace("%T", pick(TH)) + " (Nr. " + (c * 100 + b) + ")." });
    store.clips[tag + "__" + name] = { tag: tag, nr: c + 1, clip: name, datei: name + ".MXF", dauer_s: 360, woerter: 36 * 12, zuordnung: c % 5 === 4 ? "O-Ton situativ" : "Interview", jb_prio: ["hoch", "mittel", "niedrig"][c % 3], inhalt: "Erfundener Beispielclip " + (c + 1) + " für die Demo.", personen: SPRECHER[c % 4], adresse: "DEMO/" + name, sensibel: c === 6, sensibel_grund: c === 6 ? "Demo-Hinweis (erfunden)" : "", hat_transkript: true, transkript: bl };
    clipListe.push({ tag: tag, clip: name, bl: bl });
  }
  for (var t = 0; t < 2; t++) {
    var tb = [];
    for (var k = 0; k < 24; k++) tb.push({ t0: k * 10, t1: k * 10 + 10, text: pick(SATZ).replace("%T", pick(TH)) + " (Ton " + t + "-" + k + ")." });
    store.tonclip[TAGE_D[t] + "__DEMO_TON_0" + (t + 1)] = { tag: TAGE_D[t], tondatei: "DEMO_TON_0" + (t + 1), kameraclips: [{ tag: TAGE_D[t], kameraclip: "DEMO_C0" + (11 + t), konfidenz: "hoch", ton_start_im_clip_s: t === 0 ? 80 : 120 }], woerter: 24 * 11, hat_transkript: true, transkript: tb };
  }
  function hms(s) { return String(Math.floor(s / 3600)).padStart(2, "0") + ":" + String(Math.floor(s % 3600 / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }

  /* ≥ 40 Aussagen über alle Fälle */
  var n = 0;
  function neu(o) {
    var cl = o.ext ? null : clipListe[o.clip % clipListe.length];
    var blocks = o.ext ? store.tonclip[TAGE_D[o.ext - 1] + "__DEMO_TON_0" + o.ext].transkript : cl.bl;
    var von = o.von, bis = o.von + o.laenge;
    /* Katalogzeiten gelten im KAMERACLIP; das Tontranskript beginnt um ton_start_im_clip_s später (Sync-Versatz). */
    var tv = o.ext ? store.tonclip[TAGE_D[o.ext - 1] + "__DEMO_TON_0" + o.ext].kameraclips[0].ton_start_im_clip_s : 0;
    var teile = blocks.filter(function (x) { return x.t0 >= von - tv && x.t0 < bis - tv; });
    var zitat = teile.map(function (x) { return x.text; }).join(" ");
    var a = { tag: o.ext ? TAGE_D[o.ext - 1] : cl.tag, clip: o.ext ? "DEMO_C0" + (10 + o.ext) : cl.clip, quelle: o.ext ? "EXT" : "KAM", tondatei: o.ext ? "DEMO_TON_0" + o.ext + ".WAV" : "", t0: hms(von), t1: hms(bis),
      sprecher: o.sp || SPRECHER[n % 4], sprecher_sicher: o.sicher || ["sicher", "wahrscheinlich", "unsicher"][n % 3], zitat: zitat, kurz: o.kurz || ("Beispielaussage Nr. " + (n + 1) + " zum Thema " + TH[n % 6]), stufe: "B", sensibel: o.sens || "" };
    if (o.prio) a.prio = o.prio;
    if (o.prio) a.prio_grund = o.grund || ("Erfundene Begründung " + (n + 1) + ": trägt die Stelle bzw. nicht.");
    if (o.rub != null) { a.rubrik = RUBRIKEN[o.rub][0]; a.rubrik_nr = RUBRIKEN[o.rub][1]; }
    if (o.kern) a.kern = o.kern === true ? [teile[0].text.replace(/ \(Nr.*$/, "").split(" ").slice(2, 6).join(" ")] : o.kern;
    if (o.sperre) a.sperre = "einwilligung";
    if (o.angef) a.angefordert = o.angef;
    if (o.fio !== false) { a.fio_url = "https://example.com/sichtung/" + (n + 1); a.fio_tc = hms(von); a.fio_sek = von; }
    if (o.regie) a.regie = o.regie;
    store.aussagen[a.tag + "__" + a.clip + "__" + a.t0 + "__" + n] = a; n++;
  }
  for (var i = 0; i < 40; i++) {
    var prio = (i % 10) + 1;
    neu({ clip: i, von: (i % 6) * 40, laenge: 20, prio: prio, rub: i % 5, kern: i % 3 === 0 ? false : true, fio: i % 5 !== 3, sperre: i % 13 === 4, sens: i % 11 === 7 ? "Demo-Hinweis sensibel (erfunden)" : "", sp: i % 8 === 5 ? "unsicher" : null });
  }
  /* Sonderfälle */
  neu({ clip: 2, von: 0, laenge: 70, prio: 9, rub: 0, kern: true, kurz: "Langes Zitat über mehrere Zeilen (Demo)", grund: "Lange Stelle, Kern soll herausstechen." });
  neu({ clip: 3, von: 100, laenge: 60, prio: 7, rub: 1, kern: true, kurz: "Zweites langes Zitat (Demo)" });
  neu({ clip: 4, von: 200, laenge: 80, prio: 10, rub: 2, kern: true, kurz: "Drittes langes Zitat, höchste Prio (Demo)" });
  neu({ clip: 5, von: 0, laenge: 10, prio: 8, rub: 3, kern: ["<b>x</b> & \"q\""], kurz: "Test <b>Sonderzeichen</b> & \"Anführungszeichen\" — dürfen nicht als HTML laufen", sens: "Hinweis mit <i>Tags</i>" });
  neu({ clip: 6, von: 50, laenge: 10, prio: 6, rub: null, kern: true, kurz: "Bewertet, aber ohne Rubrik (Demo)" });
  neu({ clip: 7, von: 60, laenge: 20, prio: 5, rub: 4, kern: false, sperre: true, angef: "00:01:00", kurz: "Gesperrt und angefordert (Demo)" });
  neu({ ext: 1, von: 110, laenge: 30, prio: 8, rub: 1, kern: true, kurz: "Aussage aus Externton (Demo)", fio: false });
  neu({ ext: 2, von: 130, laenge: 20, prio: 4, rub: 2, kern: false, kurz: "Zweite Externton-Aussage (Demo)" });
  /* ohne prio (noch nicht bewertet) */
  for (var u = 0; u < 6; u++) neu({ clip: 8 + u, von: u * 30, laenge: 20, kurz: "Noch nicht bewertet Nr. " + (u + 1) + " (Demo)", fio: u % 2 === 0, sens: u === 3 ? "Demo-Hinweis" : "" });
  /* Regie unscharf: "ja" zählt als Regie (verborgen), "nein" nicht (sichtbar) */
  neu({ clip: 9, von: 310, laenge: 10, prio: 7, rub: 0, regie: "ja", kurz: "REGIE-JA DARF NICHT ERSCHEINEN" });
  neu({ clip: 9, von: 320, laenge: 10, prio: 7, rub: 0, regie: "nein", kurz: "Regie-Wert „nein“ bleibt sichtbar (Demo)" });
  /* Regie-Einträge: dürfen nirgends erscheinen */
  for (var r = 0; r < 3; r++) neu({ clip: r, von: 300, laenge: 10, prio: 3, rub: 0, regie: true, kurz: "REGIE-ANSAGE DARF NICHT ERSCHEINEN " + r });

  /* Sterne nur im Speicher */
  var ids = Object.keys(store.aussagen).filter(function (k) { return !store.aussagen[k].regie; });
  function stern(id, k) { store.aussagen_sterne[id + "__" + k] = { aussage: id, kuerzel: k, stern: true }; }
  stern(ids[9], "LES"); stern(ids[9], "JB"); stern(ids[19], "LES"); stern(ids[29], "JB"); stern(ids[39], "LES"); stern(ids[39], "JB");

  /* Mini-Datenbank mit der Schnittstelle von leitstand-db.js */
  function snapDoc(id, d) { return { id: id, exists: !!d, data: function () { return d ? JSON.parse(JSON.stringify(d)) : undefined; } }; }
  function alle(coll, felder) {
    var docs = Object.keys(store[coll] || {}).map(function (id) {
      var v = store[coll][id], o = v;
      if (felder) { o = {}; felder.forEach(function (f) { if (v[f] !== undefined) o[f] = v[f]; }); }
      return snapDoc(id, o);
    });
    return { docs: docs, empty: !docs.length, size: docs.length, forEach: function (fn) { docs.forEach(fn); } };
  }
  function on(coll, fn) { (listeners[coll] = listeners[coll] || []).push(fn); return function () { listeners[coll] = listeners[coll].filter(function (x) { return x !== fn; }); }; }
  function melde(coll) { (listeners[coll] || []).forEach(function (fn) { fn(); }); }
  function sammlung(name, felder) {
    var self = {
      orderBy: function () { return self; }, where: function () { return self; }, limit: function () { return self; },
      get: function () { return Promise.resolve(alle(name, felder)); },
      onSnapshot: function (cb) { var go = function () { cb(alle(name, felder)); }; setTimeout(go, 0); return on(name, go); },
      add: function (d) { var id = "demo" + Date.now(); store[name] = store[name] || {}; store[name][id] = d; melde(name); return Promise.resolve({ id: id }); },
      doc: function (id) { return dok(name + "/" + id); }
    };
    return self;
  }
  function dok(pfad) {
    var t = pfad.split("/"), coll = t[0], id = t.slice(1).join("/");
    var lade = function () { return Promise.resolve(snapDoc(id, (store[coll] || {})[id])); };
    return {
      get: lade, onSnapshot: function (cb) { setTimeout(function () { lade().then(cb); }, 0); return on(coll, function () { lade().then(cb); }); },
      set: function (d) { store[coll] = store[coll] || {}; store[coll][id] = d; melde(coll); return Promise.resolve(); },
      update: function (p) { store[coll] = store[coll] || {}; store[coll][id] = Object.assign({}, store[coll][id], p); melde(coll); return Promise.resolve(); },
      delete: function () { if (store[coll]) delete store[coll][id]; melde(coll); return Promise.resolve(); }
    };
  }
  var db = { collection: function (n) { return sammlung(n); }, collectionFelder: function (n, f) { return sammlung(n, f); }, doc: dok };
  window.claude = { use: function (w) { return Promise.resolve(w === "db" ? db : null); }, live: false, logout: function () {}, user: function () { return "Demo"; },
    /* Demo: Kürzel = lokale Wahl "Ich bin" (nur hier; live kommt es aus der Anmeldung) */
    kuerzel: function () { try { var k = localStorage.getItem("ss-wer"); return k === "LES" || k === "JB" ? k : null; } catch (e) { return null; } } };
  window.LEITSTAND_DEMO_STORE = store;
})();
