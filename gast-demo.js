/* Lokale Demo der GAST-Sicht (?demo=gast) — ausschließlich mit ERFUNDENEN, neutralen Beispieldaten.
   Läuft nur auf localhost / 127.0.0.1 / [::1] / file: und setzt aussagen-demo.js voraus (lädt davor). Keine Datenbank,
   keine Anmeldung: die Rolle „gast“ ist hier fest eingestellt, und die Server-Funktion gast_aufgabe_status wird
   NACHGEBILDET (gleiche Regeln wie in supabase/261006 rollen-gast.sql). Alles andere Schreiben wird wie von der
   Datenbank abgelehnt. Was geschehen ist, steht unten rechts und in window.LEITSTAND_DEMO_LOG. */
(function () {
  "use strict";
  var h = location.hostname;
  var lokal = location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  if (!lokal || !/[?&]demo=gast(&|$)/.test(location.search) || !window.claude || !window.LEITSTAND_DEMO_STORE) return;

  var KUERZEL = "GST";
  var alt = null; try { alt = localStorage.getItem("ss-wer"); localStorage.setItem("ss-wer", KUERZEL); } catch (e) {}
  window.addEventListener("pagehide", function () { try { if (alt == null) localStorage.removeItem("ss-wer"); else localStorage.setItem("ss-wer", alt); } catch (e) {} });

  var store = window.LEITSTAND_DEMO_STORE;
  var jetzt = new Date().toISOString();
  store.todos = {
    d1: { text: "Beispiel-Aufgabe: Material sichten", typ: "aufgabe", wer: "alle", prio: 1, done: false, created: jetzt, beschreibung: "Erfundene Beschreibung für die Demo." },
    d2: { text: "Beispiel-Aufgabe: Liste prüfen", typ: "aufgabe", wer: "LES", prio: 2, done: false, created: jetzt },
    d3: { text: "Beispiel-Rückfrage", typ: "frage", wer: "alle", prio: 2, done: false, created: jetzt },
    d4: { text: "Beispiel-Aufgabe, schon erledigt", typ: "aufgabe", wer: "JB", prio: 3, done: true, created: jetzt },
    d5: { text: "Beispiel-Befehl an Claude (Gast darf nicht abhaken)", typ: "claude", wer: "Claude", prio: 2, done: false, created: jetzt, angefordert: true, angefordertVon: "LES", angefordertAm: jetzt, s11status: "wartet" },
    d6: { text: "Beispiel-Befehl, noch nicht angefordert", typ: "claude", wer: "Claude", prio: 2, done: false, created: jetzt, ziel: "egal" }
  };
  store.notes = { n1: { text: "Erfundene Beispiel-Notiz ans Team.", wer: "LES", created: jetzt } };
  store.links = { l1: { name: "Beispiel-Link", url: "https://example.org/", wer: "LES", created: jetzt } };
  store.hinweise = { h1: { kategorie: "tipp", titel: "Erfundener Hinweis", text: "Nur zur Demo.", created: jetzt, erledigt: false } };
  store.reviews = { r1: { titel: "Beispiel-Export V1", link: "https://example.org/review", wer: "JB", created: jetzt } };
  store.review_kommentare = { k1: { reviewId: "r1", tc: "00:01:23", text: "Erfundener Kommentar.", wer: "JB", erledigt: false, created: jetzt } };

  var LOG = window.LEITSTAND_DEMO_LOG = [];
  var box = null;
  function zeige(t) {
    LOG.push(t); try { console.info("[Gast-Demo] " + t); } catch (e) {}
    if (!box) { box = document.createElement("div"); box.id = "gastDemoLog"; box.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:90;max-width:340px;background:#162327;color:#E4ECEA;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:8px 12px;font:12px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35)"; document.body.appendChild(box); }
    box.textContent = "Gast-Demo: " + t;
  }
  function claudeAufgabe(v) { return v.typ === "claude" || v.wer === "Claude" || v.quelle === "chat" || v.angefordert === true || v.s11status != null; }

  function wrapDok(d, coll, id) {
    return {
      get: d.get, onSnapshot: d.onSnapshot,
      set: function () { zeige("abgelehnt (Datenbank): schreiben in " + coll + "/" + id); return Promise.reject(new Error("Gast: nur lesen")); },
      delete: function () { zeige("abgelehnt (Datenbank): löschen in " + coll + "/" + id); return Promise.reject(new Error("Gast: nur lesen")); },
      update: function (patch) {
        var keys = Object.keys(patch || {});
        if (coll !== "todos" || keys.length !== 1 || keys[0] !== "done" || typeof patch.done !== "boolean") { zeige("abgelehnt: " + coll + "/" + id + " ändern (" + keys.join(",") + ")"); return Promise.reject(new Error("Gast: nur lesen")); }
        return d.get().then(function (snap) {   /* Nachbildung von gast_aufgabe_status(p_id, p_done) */
          var v = snap.exists ? snap.data() : null;
          if (!v) { zeige("rpc gast_aufgabe_status(" + id + "): nicht_gefunden"); return Promise.reject(new Error("nicht_gefunden")); }
          if (claudeAufgabe(v)) { zeige("rpc gast_aufgabe_status(" + id + "): gesperrt (Befehl an Claude)"); return Promise.reject(new Error("gesperrt")); }
          var ts = new Date().toISOString(), neu = { done: patch.done, geaendert_von: KUERZEL, geaendert_am: ts };
          if (patch.done) neu.erledigtAm = ts; else neu.erledigtAm = undefined;
          zeige("rpc gast_aufgabe_status(" + id + ", " + patch.done + "): ok, geaendert_von=" + KUERZEL);
          return d.update(neu);
        });
      }
    };
  }
  function wrapSammlung(s, name) {
    return {
      orderBy: function (f, dir) { return wrapSammlung(s.orderBy(f, dir), name); },
      where: function (f, op, v) { return wrapSammlung(s.where(f, op, v), name); },
      limit: function (n) { return wrapSammlung(s.limit(n), name); },
      get: s.get, onSnapshot: s.onSnapshot,
      add: function () { zeige("abgelehnt (Datenbank): anlegen in " + name); return Promise.reject(new Error("Gast: nur lesen")); },
      doc: function (id) { return wrapDok(s.doc(id), name, id); }
    };
  }
  var origUse = window.claude.use;
  window.claude.use = function (w) {
    return origUse(w).then(function (d) {
      if (w !== "db" || !d) return d;
      return { collection: function (n) { return wrapSammlung(d.collection(n), n); }, collectionFelder: d.collectionFelder,
        doc: function (p) { var t = p.split("/"); return wrapDok(d.doc(p), t[0], t.slice(1).join("/")); } };
    });
  };
  window.claude.rolle = function () { return { rolle: "gast", kuerzel: KUERZEL }; };
  window.claude.istGast = function () { return true; };
  window.claude.kuerzel = function () { return null; };   /* wie live: Gäste haben kein Stern-Konto */
})();
