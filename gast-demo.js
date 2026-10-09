/* Lokale Demo der GAST-Sicht (?demo=gast) — ausschließlich mit ERFUNDENEN, neutralen Beispieldaten.
   Läuft nur auf localhost / 127.0.0.1 / [::1] / file: und setzt aussagen-demo.js und demo-daten.js voraus (laden davor). Keine Datenbank,
   keine Anmeldung: die Rolle „gast“ mit dem Kürzel GST ist hier fest eingestellt. Die Demo antwortet wie die Datenbank nach der Ergänzung
   supabase/261006 rollen-gast-v2.sql (Verträge V2 und V3):
   LESEN nur die Sammlungen der Positivliste; in todos ohne Aufträge an Claude und ohne Nachrichten aus dem Reiter „Claude“. Jede Abfrage an
   eine andere Sammlung liefert nichts und steht in window.LEITSTAND_DEMO_LOG als „gesperrte Abfrage: <name>“.
   SCHREIBEN nur Notizen über die nachgebildete Server-Funktion gast_notiz (die Seite ruft sie über window.claude.notiz, B3) —
   window.LEITSTAND_DEMO_RPC("gast_notiz", { p_text }), Antwort wie
   supabase-js { data, error, status } — mit allen Ablehnungsgründen und Grenzen des Skripts (1.000 Zeichen, 10 je Stunde, 30 je Tag je Gast,
   100 je Tag für alle Gäste; ungueltig bei Steuer- und Richtungszeichen). Jede andere Schreibaktion lehnt die Demo ab wie die Datenbank.
   Schalter in der Adresse: &notiz=<grund> erzwingt diese Antwort (nicht_angemeldet, kein_gast, leer, zu_lang, ungueltig, limit_stunde,
   limit_tag, limit_gesamt, fehler; netz = keine Antwort); &notiz=zuruecksetzen leert den Zähler der Grenzen; mehrere mit Komma.
   Zur Laufzeit: window.LEITSTAND_DEMO_NOTIZ.erzwinge(grund | null), .zuruecksetzen(), .zaehler().
   WICHTIG: Diese Demo umgeht leitstand-db.js (Anmeldung, Rollenabfrage, Fehlerwege) — sie zeigt nur die Gast-OBERFLÄCHE; die
   Zugriffsschicht wird an der Prüfkopie mit Supabase-Attrappe geprüft. Was geschehen ist, steht unten rechts und in window.LEITSTAND_DEMO_LOG. */
(function () {
  "use strict";
  var h = location.hostname;
  var lokal = location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  if (!lokal || !/[?&]demo=gast(&|$)/.test(location.search) || !window.claude || !window.LEITSTAND_DEMO_STORE || !window.LEITSTAND_DEMO_DB) return;

  var KUERZEL = "GST";
  var alt = null; try { alt = localStorage.getItem("ss-wer"); localStorage.setItem("ss-wer", KUERZEL); } catch (e) {}
  window.addEventListener("pagehide", function () { try { if (alt == null) localStorage.removeItem("ss-wer"); else localStorage.setItem("ss-wer", alt); } catch (e) {} });

  var store = window.LEITSTAND_DEMO_STORE, DB = window.LEITSTAND_DEMO_DB;
  var box = null;
  function zeige(t) {   /* sichtbar unten rechts und im Protokoll */
    DB.log(t);
    if (!box) { box = document.createElement("div"); box.id = "gastDemoLog"; box.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:90;max-width:340px;background:#162327;color:#E4ECEA;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:8px 12px;font:12px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35)"; document.body.appendChild(box); }
    box.textContent = "Gast-Demo: " + t;
  }

  /* ---- Lesen: Positivliste (Vertrag V2) und Claude-Aufträge in todos (Vertrag V3) ---- */
  var POSITIV = ["stand", "todos", "notes", "hinweise", "links", "clips", "tonclip", "aussagen", "aussagen_sterne", "boards"];
  function frei(name) { return POSITIV.indexOf(name) !== -1; }
  /* wie die Leseregel im Skript: Merkmal, auch mit anderer Schreibweise oder Zeichen davor/dahinter */
  function merkmal(wert, muster) { return new RegExp("^[^\\p{L}\\p{N}]*(?:" + muster + ")[^\\p{L}\\p{N}]*$", "iu").test(wert == null ? "" : String(wert)); }
  function claudeAuftrag(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return true;   /* kein JSON-Objekt: für Gäste nicht lesbar */
    return merkmal(v.typ, "claude") || merkmal(v.wer, "claude") || merkmal(v.quelle, "chat") ||
      merkmal(v.angefordert, "t|tr|tru|true|y|ye|yes|on|1") || v.s11status != null;
  }
  function liste(docs) { return { docs: docs, empty: docs.length === 0, size: docs.length, forEach: function (fn) { docs.forEach(fn); } }; }
  function sicht(snap, name) { return !frei(name) ? liste([]) : name === "todos" ? liste(snap.docs.filter(function (d) { return !claudeAuftrag(d.data()); })) : snap; }
  function gesperrt(name) { if (!frei(name)) DB.log("gesperrte Abfrage: " + name); }
  function nein(was) { zeige("abgelehnt (Datenbank): " + was); return Promise.reject(new Error("Gast: nur lesen")); }

  function wrapDok(d, coll, id) {
    var leer = function (snap) {
      var v = snap.exists ? snap.data() : undefined;
      return !frei(coll) || (coll === "todos" && snap.exists && claudeAuftrag(v)) ? { id: id, exists: false, data: function () { return undefined; }, ref: null } : snap;
    };
    return {
      get: function () { gesperrt(coll); return d.get().then(leer); },
      onSnapshot: function (cb, err) { gesperrt(coll); return d.onSnapshot(function (s) { cb(leer(s)); }, err); },
      set: function () { return nein("schreiben in " + coll + "/" + id); },
      update: function (patch) { return nein("ändern in " + coll + "/" + id + " (" + Object.keys(patch || {}).join(",") + ")"); },
      delete: function () { return nein("löschen in " + coll + "/" + id); }
    };
  }
  function wrapSammlung(s, name) {
    return {
      orderBy: function (f, dir) { return wrapSammlung(s.orderBy(f, dir), name); },
      where: function (f, op, v) { return wrapSammlung(s.where(f, op, v), name); },
      limit: function (n) { return wrapSammlung(s.limit(n), name); },
      get: function () { gesperrt(name); return s.get().then(function (snap) { return sicht(snap, name); }); },
      onSnapshot: function (cb, err) { gesperrt(name); return s.onSnapshot(function (snap) { cb(sicht(snap, name)); }, err); },
      add: function () { return nein("anlegen in " + name); },
      doc: function (id) { return wrapDok(s.doc(id), name, id); }
    };
  }
  var origUse = window.claude.use;
  window.claude.use = function (w) {
    return origUse(w).then(function (d) {
      if (w !== "db" || !d) return d;
      return { collection: function (n) { return wrapSammlung(d.collection(n), n); },
        collectionFelder: function (n, f) { return wrapSammlung(d.collectionFelder(n, f), n); },
        doc: function (p) { var t = String(p).split("/"); return wrapDok(d.doc(p), t[0], t.slice(1).join("/")); } };
    });
  };
  window.claude.rolle = function () { return { rolle: "gast", kuerzel: KUERZEL }; };
  window.claude.istGast = function () { return true; };
  window.claude.kuerzel = function () { return null; };   /* wie live: Gäste haben kein Stern-Konto */

  /* ---- Schreiben: Nachbildung der Server-Funktion gast_notiz (leitstand_intern.gast_notiz_intern im Skript v2) ---- */
  var MAX_ZEICHEN = 1000, JE_STUNDE = 10, JE_TAG = 30, GESAMT_TAG = 100;   /* c_max_zeichen, c_je_stunde, c_je_tag, c_gesamt_tag */
  var STD = 3600000, TAG = 24 * STD;
  var RAND = "[\\s\\u0085\\u00a0\\u180e\\u2000-\\u200d\\u2028\\u2029\\u202f\\u205f\\u2060\\u3000\\ufeff]";
  var RAND_ANFANG = new RegExp("^" + RAND + "+"), RAND_ENDE = new RegExp(RAND + "+$");
  var UNSICHTBAR = /[\s\u0085\u00a0\u00ad\u034f\u061c\u115f\u1160\u1680\u17b4\u17b5\u180b-\u180f\u2000-\u200f\u2028-\u202f\u205f-\u206f\u2800\u3000\u3164\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufff8\u{1bca0}-\u{1bca3}\u{1d173}-\u{1d17a}\u{e0000}-\u{e0fff}]/gu;
  var STEUER = /[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;
  var GRUENDE = ["nicht_angemeldet", "kein_gast", "leer", "zu_lang", "ungueltig", "limit_stunde", "limit_tag", "limit_gesamt", "fehler", "netz"];
  var MAX_JE_GRUND = { zu_lang: MAX_ZEICHEN, limit_stunde: JE_STUNDE, limit_tag: JE_TAG, limit_gesamt: GESAMT_TAG };
  var ZAEHLER = "leitstand-demo-notizen";   /* gesendete Notizen dieses Geräts (Zeitpunkt, Kürzel), wie das Protokoll der Datenbank */
  function zeichen(s) { return Array.from(s).length; }   /* Zeichen wie length() der Datenbank, nicht UTF-16-Einheiten */
  function zaehlerLesen() { try { var z = JSON.parse(localStorage.getItem(ZAEHLER) || "[]"); return Array.isArray(z) ? z : []; } catch (e) { return []; } }
  function zaehlerSchreiben(z) { try { localStorage.setItem(ZAEHLER, JSON.stringify(z)); } catch (e) {} }
  /* Grundbestand des Protokolls: die Gast-Notizen, die schon im Demo-Speicher stehen */
  var GRUNDBESTAND = Object.keys(store.notes || {}).map(function (id) { return store.notes[id]; })
    .filter(function (v) { return v && v.rolle === "gast" && /^Gast-/.test(v.wer || ""); })
    .map(function (v) { return { t: Date.parse(v.created), k: v.wer.slice(5) }; });
  function protokoll(jetzt) { return GRUNDBESTAND.concat(zaehlerLesen()).filter(function (x) { return x.t > jetzt - TAG; }); }
  var erzwungen = null;
  function antwort(data, error, status) { return Promise.resolve({ data: data, error: error || null, status: status !== undefined ? status : (error ? 400 : 200) }); }
  function ergebnis(e) { zeige("rpc gast_notiz: " + (e.ok ? "ok, wer=Gast-" + e.kuerzel : e.grund + (e.max ? " (max " + e.max + ")" : ""))); return antwort(e); }
  function gastNotiz(p_text) {
    if (!DB.verbunden() || erzwungen === "netz") { zeige("rpc gast_notiz: keine Verbindung"); return antwort(null, { message: "TypeError: Failed to fetch", code: "" }, 0); }
    if (typeof p_text === "string" && p_text.indexOf("\u0000") !== -1) { zeige("rpc gast_notiz: Text mit NUL, von der Datenbank abgewiesen"); return antwort(null, { code: "22P05", message: "unsupported Unicode escape sequence" }, 400); }
    if (erzwungen) { var x = { ok: false, grund: erzwungen }; if (MAX_JE_GRUND[erzwungen]) x.max = MAX_JE_GRUND[erzwungen]; return ergebnis(x); }
    /* angemeldet und als Gast eingetragen: in der Demo immer (nicht_angemeldet, kein_gast nur erzwungen) */
    if (p_text == null) return ergebnis({ ok: false, grund: "leer" });
    p_text = String(p_text);
    if (zeichen(p_text) > 20 * MAX_ZEICHEN) return ergebnis({ ok: false, grund: "zu_lang", max: MAX_ZEICHEN });
    var text = p_text.replace(RAND_ANFANG, "").replace(RAND_ENDE, "");
    if (zeichen(text.replace(UNSICHTBAR, "")) === 0) return ergebnis({ ok: false, grund: "leer" });
    if (zeichen(text) > MAX_ZEICHEN) return ergebnis({ ok: false, grund: "zu_lang", max: MAX_ZEICHEN });
    if (STEUER.test(text)) return ergebnis({ ok: false, grund: "ungueltig" });
    var jetzt = Date.now(), alle = protokoll(jetzt), eigene = alle.filter(function (z) { return z.k === KUERZEL; });
    if (eigene.filter(function (z) { return z.t > jetzt - STD; }).length >= JE_STUNDE) return ergebnis({ ok: false, grund: "limit_stunde", max: JE_STUNDE });
    if (eigene.length >= JE_TAG) return ergebnis({ ok: false, grund: "limit_tag", max: JE_TAG });
    if (alle.length >= GESAMT_TAG) return ergebnis({ ok: false, grund: "limit_gesamt", max: GESAMT_TAG });
    var id = DB.neueId();
    store.notes = store.notes || {};
    store.notes[id] = { wer: "Gast-" + KUERZEL, text: text, rolle: "gast", created: new Date(jetzt).toISOString() };
    zaehlerSchreiben(zaehlerLesen().filter(function (z) { return z.t > jetzt - 2 * TAG; }).concat([{ t: jetzt, k: KUERZEL }]));
    DB.melde("notes");
    return ergebnis({ ok: true, id: id, kuerzel: KUERZEL });
  }
  var basisRpc = window.LEITSTAND_DEMO_RPC;
  window.LEITSTAND_DEMO_RPC = function (name, args) { return name === "gast_notiz" ? gastNotiz(args ? args.p_text : null) : basisRpc(name, args); };
  /* ---- Projekt-Austausch (Stufe 2, Teil B — Bauplan P2 Nr. 1 und 4): Sicht des Gasts. Platz-, Fertig- und Listen-Funktion und den Eingangs-Bucket bildet
     demo-daten.js nach (hier mit dem Konto des Demo-Gasts GST und den Grenzen für Gäste); window.claude.hochladen und .meineEingaenge kommen von dort.
     Hier: kein Abo der Sammlung eingaenge — window.claude.eingaengeAbo liefert null wie die Zugriffsschicht für Gäste (keine Abfrage; eingaenge steht
     auch nicht auf der Positivliste oben). Was Platz- und Fertig-Funktion geantwortet haben, steht unten rechts (die Liste der eigenen Uploads nur im
     Protokoll, sie wird beim Laden gefragt). ---- */
  window.claude.eingaengeAbo = function () { return null; };
  var notizRpc = window.LEITSTAND_DEMO_RPC;
  window.LEITSTAND_DEMO_RPC = function (name, args) {
    var p = notizRpc(name, args);
    if (name !== "gast_eingang_anlegen" && name !== "gast_eingang_fertig") return p;
    return p.then(function (r) { zeige("rpc " + name + ": " + (r.error ? "keine Verbindung" : r.data && r.data.ok ? "ok" : String(r.data && r.data.grund))); return r; });
  };
  /* window.claude.notiz wie in der Zugriffsschicht (B3): gast_notiz mit genau dem Text; Antwort { ok, id } bzw. { ok: false, grund[, max] }, nie ein
     Fehler — ohne Antwort »netz«, HTTP 401 »nicht_angemeldet«, 22P05 (NUL) »ungueltig«, sonst »unbekannt« */
  window.claude.notiz = function (text) {
    return window.LEITSTAND_DEMO_RPC("gast_notiz", { p_text: text }).then(function (r) {
      if (r.error) return { ok: false, grund: r.status === 0 || (!r.error.code && !r.status) ? "netz" : r.status === 401 ? "nicht_angemeldet" : r.error.code === "22P05" ? "ungueltig" : "unbekannt" };
      var d = r.data, x = { ok: !!(d && d.ok === true) };
      if (x.ok) { x.id = d.id; return x; }
      x.grund = d && typeof d.grund === "string" ? d.grund : "unbekannt";
      if (d && typeof d.max === "number") x.max = d.max;
      return x;
    });
  };
  window.LEITSTAND_DEMO_NOTIZ = {
    erzwinge: function (g) { if (g && GRUENDE.indexOf(g) === -1) throw new Error("unbekannter Grund: " + g); erzwungen = g || null; },
    zuruecksetzen: function () { try { localStorage.removeItem(ZAEHLER); } catch (e) {} },
    zaehler: function () { var j = Date.now(), a = protokoll(j), e = a.filter(function (z) { return z.k === KUERZEL; }); return { stunde: e.filter(function (z) { return z.t > j - STD; }).length, tag: e.length, gesamt: a.length }; },
    grenzen: { zeichen: MAX_ZEICHEN, stunde: JE_STUNDE, tag: JE_TAG, gesamt: GESAMT_TAG }
  };
  var q = /[?&]notiz=([^&#]*)/.exec(location.search);
  if (q) decodeURIComponent(q[1]).split(",").forEach(function (s) {
    s = s.trim();
    if (s === "zuruecksetzen") window.LEITSTAND_DEMO_NOTIZ.zuruecksetzen();
    else if (GRUENDE.indexOf(s) !== -1) erzwungen = s;
    else if (s) DB.log("unbekannter Notiz-Schalter: " + s);
  });
})();
