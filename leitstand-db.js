/* Saving Souls Leitstand – Live-Datenbank (Supabase)
   Ersetzt den Artifact-Speicher von claude.ai. Bildet die Board-API nach:
     claude.use("db") → db.collection(name).orderBy().onSnapshot()/get()/add()/doc(id).get()/set()/update()/delete()
   Muss VOR dem Board-Script laufen (klassisches <script>, kein module). */
(function () {
  "use strict";

  /* ---- Konfiguration (Supabase → Settings → API) ---- */
  var SUPABASE_URL  = "https://yfkckqbrksivksotopfo.supabase.co";
  var SUPABASE_ANON = "sb_publishable_XaI7tGTC3E7V2kWEI0j--A_cPeev7YG";   /* öffentlicher Publishable-Key (Legacy-Keys seit 08.09. deaktiviert); Daten schützt Row Level Security */
  var LOGIN_SITE    = location.origin + location.pathname;
  /* Team-Passwort (SHA-256, Klartext steht nicht im Code). Vorhang gegen Mitleser mit Link; die Daten
     schützt weiterhin der GitHub-Login + Team-Liste in der Datenbank. */
  var TOR_HASH      = "4a6dc797e7f4f79644c9394a1ec04da93b255226fefce205c7eead4c59dde387";
  /* GitHub-Login → Kürzel im Board (weitere Team-Mitglieder hier ergänzen) */
  var GITHUB_KUERZEL = { "les-droid": "LES", "jnbjonathan-beep": "JB" };

  var TABELLE = "docs";
  var sb = null, session = null;
  var ready;                    /* Promise<db> */
  var wer = function () { try { return localStorage.getItem("ss-wer") || "?"; } catch (e) { return "?"; } };

  /* ---- Rückkehr vom GitHub-Login: Tokens SOFORT aus der URL sichern ----
     Das Board-Script setzt beim Start per history.replaceState seinen Seiten-Hash und würde
     "#access_token=…" überschreiben, bevor supabase-js (asynchron) dazu kommt. Deshalb hier
     synchron einlesen, URL bereinigen und die Session später selbst setzen. */
  var oauth = null, oauthFehler = null;
  (function () {
    var h = location.hash || "";
    if (!/(^#|&)(access_token|error|error_description)=/.test(h)) return;
    var p = {};
    h.replace(/^#/, "").split("&").forEach(function (kv) { var t = kv.split("="); try { p[decodeURIComponent(t[0])] = decodeURIComponent((t[1] || "").replace(/\+/g, " ")); } catch (e) {} });
    if (p.access_token) oauth = p; else oauthFehler = p.error_description || p.error || "Anmeldung fehlgeschlagen";
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  })();

  /* ---- Hilfen ---- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid() { return (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10))); }
  function snapDoc(id, d) { return { id: id, exists: !!d, data: function () { return d ? JSON.parse(JSON.stringify(d)) : undefined; }, ref: null }; }
  function sortDocs(docs, order) {
    if (!order) return docs;
    return docs.slice().sort(function (a, b) {
      var x = (a.data() || {})[order.f], y = (b.data() || {})[order.f];
      x = x == null ? "" : x; y = y == null ? "" : y;
      return (x < y ? -1 : x > y ? 1 : 0) * (order.dir === "desc" ? -1 : 1);
    });
  }
  function banner(t, ms) {
    var b = document.getElementById("liveBanner");
    if (!b) { b = document.createElement("div"); b.id = "liveBanner"; b.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99;max-width:92vw;background:rgba(22,35,39,.94);color:#E4ECEA;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 14px;font:13px -apple-system,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.35)"; document.body.appendChild(b); }
    b.innerHTML = t; clearTimeout(b._t); b._t = setTimeout(function () { b.remove(); }, ms || 6000);
  }

  /* ---- Login-Overlay ---- */
  function overlay(zeige) {
    var el = document.getElementById("liveLogin");
    if (!zeige) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement("div"); el.id = "liveLogin";
    el.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(14,24,27,.82);backdrop-filter:blur(8px)";
    el.innerHTML = '<div style="background:#162327;color:#E4ECEA;border:1px solid rgba(255,255,255,.1);padding:28px 30px;border-radius:18px;max-width:340px;text-align:center;font:15px -apple-system,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.4)">' +
      '<div style="font-size:20px;font-weight:600;margin-bottom:6px">Saving Souls Leitstand</div>' +
      '<div style="font-size:13px;color:#93A8AA;margin-bottom:18px">Anmelden mit dem GitHub-Konto, das im Repo Collaborator ist. Danach sind To-dos, Notizen und Befehle live für alle.</div>' +
      '<button id="liveLoginBtn" style="font:inherit;font-weight:600;padding:12px 18px;border:0;border-radius:12px;background:#56ABB5;color:#0E181B;cursor:pointer;width:100%">Mit GitHub anmelden</button>' +
      '<div id="liveLoginErr" style="font-size:12px;color:#E87A46;margin-top:10px"></div></div>';
    document.body.appendChild(el);
    if (oauthFehler) { el.querySelector("#liveLoginErr").textContent = /Kein Team-Mitglied/.test(oauthFehler) ? "Dieses GitHub-Konto ist nicht in der Team-Liste. Bitte LES den GitHub-Namen schicken." : oauthFehler; oauthFehler = null; }
    el.querySelector("#liveLoginBtn").addEventListener("click", function () {
      sb.auth.signInWithOAuth({ provider: "github", options: { redirectTo: LOGIN_SITE } })
        .then(function (r) { if (r.error) document.getElementById("liveLoginErr").textContent = r.error.message; });
    });
  }

  /* ---- Team-Passwort: einmal je Gerät, danach gemerkt ---- */
  function sha256(s) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }
  function tor() {
    try { if (localStorage.getItem("ss-tor") === TOR_HASH.slice(0, 16)) return Promise.resolve(); } catch (e) {}
    return new Promise(function (resolve) {
      var el = document.createElement("div"); el.id = "liveTor";
      el.style.cssText = "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#0E181B";
      el.innerHTML = '<form style="background:#162327;color:#E4ECEA;border:1px solid rgba(255,255,255,.1);padding:28px 30px;border-radius:18px;width:min(340px,88vw);text-align:center;font:15px -apple-system,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.4)">' +
        '<div style="font-size:20px;font-weight:600;margin-bottom:6px">Saving Souls Leitstand</div>' +
        '<div style="font-size:13px;color:#93A8AA;margin-bottom:18px">Team-Passwort eingeben. Wird auf diesem Gerät gemerkt.</div>' +
        '<input id="liveTorPw" type="password" autocomplete="current-password" placeholder="Passwort" style="font:inherit;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#0E181B;color:#E4ECEA;margin-bottom:10px">' +
        '<button type="submit" style="font:inherit;font-weight:600;padding:12px 18px;border:0;border-radius:12px;background:#56ABB5;color:#0E181B;cursor:pointer;width:100%">Weiter</button>' +
        '<div id="liveTorErr" style="font-size:12px;color:#E87A46;margin-top:10px;min-height:14px"></div></form>';
      var anhaengen = function () { document.body.appendChild(el); try { el.querySelector("#liveTorPw").focus(); } catch (e) {} };
      if (document.body) anhaengen(); else document.addEventListener("DOMContentLoaded", anhaengen);
      el.querySelector("form").addEventListener("submit", function (ev) {
        ev.preventDefault();
        var v = el.querySelector("#liveTorPw").value.trim().toLowerCase();
        sha256(v).then(function (h) {
          if (h !== TOR_HASH) { el.querySelector("#liveTorErr").textContent = "Falsches Passwort."; return; }
          try { localStorage.setItem("ss-tor", TOR_HASH.slice(0, 16)); } catch (e) {}
          el.remove(); resolve();
        }, function () { el.querySelector("#liveTorErr").textContent = "Passwortprüfung nur über https möglich."; });
      });
    });
  }

  /* ---- Realtime: ein Kanal, Verteiler nach Collection ---- */
  var listeners = {};   /* coll -> Set<fn(row, evt)> */
  function on(coll, fn) { (listeners[coll] = listeners[coll] || new Set()).add(fn); return function () { listeners[coll].delete(fn); }; }
  function startRealtime() {
    sb.channel("docs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: TABELLE }, function (p) {
        var row = p.new && p.new.collection ? p.new : p.old; if (!row) return;
        var set = listeners[row.collection]; if (!set) return;
        set.forEach(function (fn) { try { fn(row, p.eventType); } catch (e) { console.error(e); } });
      })
      .subscribe(function (st) {
        if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") banner("Live-Verbindung unterbrochen – Seite neu laden.", 10000);
      });
  }

  /* ---- DB-API ---- */
  function ladeCollection(name) {
    return sb.from(TABELLE).select("id,data").eq("collection", name).then(function (r) {
      if (r.error) throw r.error;
      return r.data.map(function (x) { return snapDoc(x.id, x.data); });
    });
  }
  function sammlung(name, order, filter, lim) {
    var self = {
      orderBy: function (f, dir) { return sammlung(name, { f: f, dir: dir || "asc" }, filter, lim); },
      where: function (f, op, v) { return sammlung(name, order, (filter || []).concat([{ f: f, op: op, v: v }]), lim); },
      limit: function (n) { return sammlung(name, order, filter, n); },
      _form: function (docs) {
        if (filter) docs = docs.filter(function (d) { var x = d.data() || {}; return filter.every(function (c) { return c.op === "==" ? x[c.f] === c.v : c.op === "!=" ? x[c.f] !== c.v : true; }); });
        docs = sortDocs(docs, order); if (lim) docs = docs.slice(0, lim);
        return { docs: docs, empty: docs.length === 0, size: docs.length, forEach: function (fn) { docs.forEach(fn); } };
      },
      get: function () { return ladeCollection(name).then(self._form); },
      onSnapshot: function (cb, err) {
        var laden = function () { ladeCollection(name).then(function (d) { cb(self._form(d)); }).catch(function (e) { if (err) err(e); }); };
        laden();
        return on(name, function () { laden(); });   /* einfach + robust: bei jeder Änderung neu laden */
      },
      add: function (data) {
        var id = uid();
        return sb.from(TABELLE).insert({ collection: name, id: id, data: data, updated_by: wer() }).then(function (r) { if (r.error) throw r.error; return { id: id }; });
      },
      doc: function (id) { return dokument(name + "/" + id); }
    };
    return self;
  }
  function dokument(pfad) {
    var t = pfad.split("/"); var coll = t[0], id = t.slice(1).join("/");
    var lade = function () { return sb.from(TABELLE).select("data").eq("collection", coll).eq("id", id).maybeSingle().then(function (r) { if (r.error) throw r.error; return snapDoc(id, r.data ? r.data.data : undefined); }); };
    return {
      get: lade,
      onSnapshot: function (cb, err) { lade().then(cb).catch(err || function () {}); return on(coll, function (row) { if (row.id === id) lade().then(cb).catch(err || function () {}); }); },
      set: function (data, opt) {
        if (opt && opt.merge) return this.update(data);
        return sb.from(TABELLE).upsert({ collection: coll, id: id, data: data, updated_by: wer(), updated_at: new Date().toISOString() }).then(function (r) { if (r.error) throw r.error; });
      },
      update: function (patch) {
        return sb.rpc("docs_patch", { p_collection: coll, p_id: id, p_patch: patch, p_by: wer() }).then(function (r) { if (r.error) throw r.error; });
      },
      delete: function () { return sb.from(TABELLE).delete().eq("collection", coll).eq("id", id).then(function (r) { if (r.error) throw r.error; }); }
    };
  }
  var db = { collection: function (n) { return sammlung(n); }, doc: dokument };

  /* ---- Einmalige Übernahme des Startbestands ---- */
  function seed() {
    var S = window.LEITSTAND_SEED; if (!S) return Promise.resolve();
    return sb.from(TABELLE).select("id", { count: "exact", head: true }).then(function (r) {
      if (r.error || r.count > 0) return;
      var rows = [];
      Object.keys(S).forEach(function (coll) { Object.keys(S[coll] || {}).forEach(function (id) { rows.push({ collection: coll, id: id, data: S[coll][id], updated_by: "seed" }); }); });
      return sb.from(TABELLE).insert(rows).then(function (x) { if (!x.error) banner("Startbestand (" + rows.length + " Einträge, Stand " + (window.LEITSTAND_SEED_STAND || "") + ") übernommen – ab jetzt live.", 8000); });
    });
  }

  /* ---- Start ---- */
  /* Übergangsmodus: solange keine Supabase-Konfiguration eingetragen ist, Board nur lesbar aus dem Seed */
  function nurLesen() {
    var S = window.LEITSTAND_SEED || {};
    var schreib = function () { banner("Board ist im Übergangsmodus (nur lesen, Stand " + (window.LEITSTAND_SEED_STAND || "") + ") — Live-Betrieb folgt, sobald die Datenbank eingetragen ist.", 7000); return Promise.resolve(); };
    function coll(name, order) {
      var self = { orderBy: function (f, d) { return coll(name, { f: f, dir: d || "asc" }); }, where: function () { return self; }, limit: function () { return self; },
        _snap: function () { var c = S[name] || {}; var docs = sortDocs(Object.keys(c).map(function (k) { return snapDoc(k, c[k]); }), order); return { docs: docs, empty: !docs.length, size: docs.length, forEach: function (fn) { docs.forEach(fn); } }; },
        get: function () { return Promise.resolve(self._snap()); }, onSnapshot: function (cb) { try { cb(self._snap()); } catch (e) {} return function () {}; },
        add: schreib, doc: function (id) { return doc(name + "/" + id); } };
      return self;
    }
    function doc(p) { var t = p.split("/"), c = t[0], id = t.slice(1).join("/"); return { get: function () { return Promise.resolve(snapDoc(id, (S[c] || {})[id])); }, onSnapshot: function (cb) { try { cb(snapDoc(id, (S[c] || {})[id])); } catch (e) {} return function () {}; }, set: schreib, update: schreib, delete: schreib }; }
    return { collection: function (n) { return coll(n); }, doc: doc };
  }

  ready = new Promise(function (resolve) {
    if (/DEIN-PROJEKT/.test(SUPABASE_URL) || /DEIN-ANON/.test(SUPABASE_ANON)) { resolve(nurLesen()); return; }
    if (!window.supabase) { console.error("supabase-js nicht geladen"); resolve(null); return; }
    /* detectSessionInUrl aus: die Tokens haben wir oben selbst gesichert (siehe oauth) */
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "implicit" } });
    var start = function () {
      overlay(false); startRealtime();
      /* Kürzel aus dem GitHub-Login ableiten, falls auf diesem Gerät noch keins gewählt ist */
      try {
        var gh = session && session.user && session.user.user_metadata ? session.user.user_metadata.user_name : null;
        var k = gh && GITHUB_KUERZEL[gh];
        if (k && !localStorage.getItem("ss-wer")) {
          localStorage.setItem("ss-wer", k);
          var b = document.querySelector('#whoModalBtns button[data-w="' + k + '"]'); if (b) b.click();
        }
      } catch (e) {}
      seed().then(function () { resolve(db); }, function () { resolve(db); });
    };
    var sessionHolen = oauth
      ? sb.auth.setSession({ access_token: oauth.access_token, refresh_token: oauth.refresh_token })
      : sb.auth.getSession();
    tor().then(function () { return sessionHolen; }).then(function (r) {
      session = r && r.data ? r.data.session : null;
      if (r && r.error && !oauthFehler) oauthFehler = r.error.message;
      oauth = null;
      if (session) { start(); return; }
      overlay(true);
      var sub = sb.auth.onAuthStateChange(function (_e, s) { if (s) { session = s; sub.data.subscription.unsubscribe(); start(); } });
    });
  });

  function abmelden() {
    try { localStorage.removeItem("ss-wer"); } catch (e) {}
    var fertig = function () { location.replace(LOGIN_SITE); };
    return (sb ? sb.auth.signOut() : Promise.resolve()).then(fertig, fertig);
  }
  window.claude = { use: function (was) { return was === "db" ? ready : Promise.resolve(null); }, live: true,
    logout: abmelden,
    user: function () { return session && session.user ? (session.user.user_metadata.user_name || session.user.email) : null; } };

  /* ---- Nach dem Laden: Statuszeile, Projektdatei-Links, Schnitt-11-Panel ---- */
  document.addEventListener("DOMContentLoaded", function () {
    var p = document.querySelector("p.standline");
    if (p) {
      var s = document.createElement("span"); s.style.cssText = "color:#56ABB5"; s.textContent = " · live"; p.appendChild(s);
      var a = document.createElement("a"); a.href = "#"; a.textContent = "Abmelden"; a.title = "GitHub-Konto und Kürzel auf diesem Gerät wechseln";
      a.style.cssText = "margin-left:10px;color:var(--muted,#93A8AA);text-decoration:underline;font-size:12px";
      a.addEventListener("click", function (ev) { ev.preventDefault(); if (confirm("Abmelden? Danach kann man sich mit einem anderen GitHub-Konto anmelden und das Kürzel neu wählen.")) abmelden(); });
      p.appendChild(a);
    }

    /* Premiere-Projektdateien liegen als Kopie neben dieser Seite (projekte/) */
    setInterval(function () {
      var as = document.querySelectorAll('a[href*="/blob/main/projekte/"]');
      for (var i = 0; i < as.length; i++) { var a = as[i]; if (a.dataset.lokal) continue; var m = a.getAttribute("href").match(/\/blob\/main\/projekte\/([^?]+\.prproj)/i); if (!m) continue; a.dataset.lokal = "1"; if (/raw=true/.test(a.getAttribute("href")) || a.textContent.trim() === "Download") { a.setAttribute("href", "projekte/" + m[1]); a.removeAttribute("target"); a.setAttribute("download", ""); } }
    }, 700);

    /* Schnitt 11: Live-Status der Claude-Aufgaben („Jetzt erledigen“) */
    var host = document.querySelector("#page-aufgaben .grid > div:first-child");
    if (!host) return;
    var sec = document.createElement("section"); sec.className = "card"; sec.id = "schnitt11";
    sec.innerHTML = '<h2>Schnitt 11 <span class="hint">Claude-Aufgaben · läuft live auf dem Schnittrechner</span></h2>' +
      '<p class="muted" style="margin:0 0 10px;font-size:13px;color:var(--muted)">To-do mit Art „Claude-Aufgabe“ anlegen und auf „Jetzt erledigen“ tippen. Claude Code auf Schnitt 11 nimmt es in Sekunden auf; Ausgabe erscheint hier.</p>' +
      '<ul class="todos" id="s11List"><li class="empty">Keine laufenden oder kürzlich erledigten Claude-Aufgaben.</li></ul>' +
      '<style>#schnitt11 .s11st{font-size:12px;font-weight:600}#schnitt11 .s11st[data-s="offen"]{color:var(--muted)}#schnitt11 .s11st[data-s="wartet"]{color:var(--muted)}#schnitt11 .s11st[data-s="laeuft"]{color:var(--signal)}#schnitt11 .s11st[data-s="fertig"]{color:var(--ok)}#schnitt11 .s11st[data-s="fehler"]{color:#E87A46}#schnitt11 pre{margin:6px 0 0;max-height:220px;overflow:auto;font:12px var(--font-mono);background:#0E181B;color:#E4ECEA;padding:8px 10px;border-radius:8px;white-space:pre-wrap;border:1px solid var(--line)}#schnitt11 details summary{cursor:pointer;font-size:12px;color:var(--muted)}#schnitt11 li{list-style:none;padding:10px 0;border-top:1px solid var(--line)}#schnitt11 li:first-child{border-top:0}</style>';
    host.insertBefore(sec, host.firstChild.nextSibling);
    var ul = sec.querySelector("#s11List");
    var fmt = function (t) { try { return new Date(t).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
    ready.then(function (d) {
      if (!d) return;
      d.collection("todos").onSnapshot(function (snap) {
        var rows = snap.docs.map(function (x) { var v = x.data(); v._id = x.id; return v; })
          .filter(function (v) { return v.typ === "claude" && (v.angefordert || v.s11status); })
          .sort(function (a, b) { return String(b.angefordertAm || b.created || "").localeCompare(String(a.angefordertAm || a.created || "")); }).slice(0, 8);
        if (!rows.length) { ul.innerHTML = '<li class="empty">Keine laufenden oder kürzlich erledigten Claude-Aufgaben.</li>'; return; }
        ul.innerHTML = rows.map(function (v) {
          var st = v.s11status || (v.done ? "fertig" : "wartet");
          return '<li><div style="display:flex;justify-content:space-between;gap:8px"><span style="font-size:13px;color:var(--muted)">' + esc(v.angefordertVon || v.wer || "") + " · " + fmt(v.angefordertAm || v.created) + '</span><span class="s11st" data-s="' + esc(st) + '">' + esc(st) + "</span></div>" +
            '<div style="margin:4px 0">' + esc(v.text) + "</div>" +
            (st === "laeuft" && v.s11fortschritt ? "<pre>" + esc(v.s11fortschritt) + "</pre>" : "") +
            ((st === "fertig" || st === "fehler") && v.s11ergebnis ? "<details><summary>Ergebnis" + (v.s11beendetAm ? " (" + fmt(v.s11beendetAm) + ")" : "") + "</summary><pre>" + esc(v.s11ergebnis) + "</pre></details>" : "") +
            "</li>";
        }).join("");
      });
    });
  });
})();
