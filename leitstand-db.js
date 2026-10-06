/* Saving Souls Leitstand – Live-Datenbank (Supabase)
   Ersetzt den Artifact-Speicher von claude.ai. Bildet die Board-API nach:
     claude.use("db") → db.collection(name).orderBy().onSnapshot()/get()/add()/doc(id).get()/set()/update()/delete()
   Muss VOR dem Board-Script laufen (klassisches <script>, kein module). */
(function () {
  "use strict";
  if (window.LEITSTAND_DEMO) return;   /* lokale Demo (aussagen-demo.js): keine Datenbank, keine Anmeldung */
  /* Nur Darstellung, damit Gäste beim Laden keine Bearbeiten-Knöpfe aufblitzen sehen. Die Rolle entscheidet der
     SERVER (meine_rolle); das Gedächtnis hier ist nur ein Hinweis und wird nach der Anmeldung überschrieben. */
  try { if (localStorage.getItem("ss-rolle") === "gast") document.documentElement.classList.add("gast"); } catch (e) {}

  /* ---- Konfiguration (Supabase → Settings → API) ---- */
  var SUPABASE_URL  = "https://yfkckqbrksivksotopfo.supabase.co";
  var SUPABASE_ANON = "sb_publishable_XaI7tGTC3E7V2kWEI0j--A_cPeev7YG";   /* öffentlicher Publishable-Key (Legacy-Keys seit 08.09. deaktiviert); Daten schützt Row Level Security */
  var LOGIN_SITE    = location.origin + location.pathname;
  /* Kürzel + Passwort (Supabase Auth E-Mail/Passwort) — Hauptweg der Anmeldung. Die Konten legt
     bzw. aktualisiert serverseitig konto-anlegen.mjs; hier steht kein Passwort. */
  var KUERZEL_KONTEN = { LES: "les@leitstand.dropout-films.de", JB: "jb@leitstand.dropout-films.de" };
  /* GitHub-Login → Kürzel im Board (Zweitweg unter dem Formular; weitere Team-Mitglieder hier ergänzen) */
  var GITHUB_KUERZEL = { "les-droid": "LES", "jnbjonathan-beep": "JB" };

  var TABELLE = "docs";
  var sb = null, session = null, start;
  var rolle = null;             /* {rolle:"admin"|"gast", kuerzel} — vom Server (meine_rolle), nie aus Angaben des Nutzers */
  var gestartet = false;        /* start() läuft nur einmal je erfolgreicher Anmeldung */
  var gastLaeuft = false;       /* Gast-Anmeldung in Arbeit: der Auth-Listener darf start() nicht vorzeitig auslösen */
  var frischAngemeldet = false; /* true nur direkt nach einer Team-ANMELDUNG in diesem Fenster (Kürzel+Passwort oder Rückkehr von GitHub) — nicht beim bloßen Neuladen */
  var istGast = function () { return !!(rolle && rolle.rolle === "gast"); };
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

  /* ---- Login-Overlay: Kürzel + Passwort (Hauptweg), GitHub als Zweitweg darunter ---- */
  function overlay(zeige) {
    var el = document.getElementById("liveLogin");
    if (!zeige) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement("div"); el.id = "liveLogin";
    el.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;overflow:auto;padding:16px 0;box-sizing:border-box;background:rgba(14,24,27,.82);backdrop-filter:blur(8px)";
    var kuerzelBtns = Object.keys(KUERZEL_KONTEN).map(function (k) {
      return '<button type="button" class="liveLoginKuerzel" data-k="' + k + '" style="flex:1;font:700 16px -apple-system,system-ui,sans-serif;padding:12px 0;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#0E181B;color:#E4ECEA;cursor:pointer">' + k + "</button>";
    }).join("");
    el.innerHTML = '<div style="background:#162327;color:#E4ECEA;border:1px solid rgba(255,255,255,.1);padding:28px 30px;border-radius:18px;max-width:340px;width:calc(100% - 40px);margin:auto;text-align:center;font:15px -apple-system,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.4)">' +
      '<div style="font-size:20px;font-weight:600;margin-bottom:6px">Saving Souls Leitstand</div>' +
      '<div style="font-size:13px;color:#93A8AA;margin-bottom:16px">Kürzel wählen, Passwort eingeben. Danach sind To-dos, Notizen und Befehle live für alle.</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:14px">' + kuerzelBtns + "</div>" +
      '<form id="liveLoginForm">' +
        '<input id="liveLoginPw" type="password" autocomplete="current-password" placeholder="Passwort" style="font:inherit;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#0E181B;color:#E4ECEA;margin-bottom:10px">' +
        '<button type="submit" id="liveLoginBtn" style="font:inherit;font-weight:600;padding:12px 18px;border:0;border-radius:12px;background:#56ABB5;color:#0E181B;cursor:pointer;width:100%">Anmelden</button>' +
      "</form>" +
      '<div id="liveLoginErr" style="font-size:12px;color:#E87A46;margin-top:10px;min-height:14px"></div>' +
      '<button type="button" id="liveGithubBtn" style="margin-top:16px;font:600 12px -apple-system,system-ui,sans-serif;background:none;border:0;color:#93A8AA;text-decoration:underline;cursor:pointer">Mit GitHub anmelden</button>' +
      '<div style="margin-top:6px"><button type="button" id="liveGastBtn" style="font:600 12px -apple-system,system-ui,sans-serif;background:none;border:0;color:#93A8AA;text-decoration:underline;cursor:pointer">Als Gast anmelden</button></div>' +
      '<form id="liveGastForm" style="display:none;margin-top:12px;text-align:left;border-top:1px solid rgba(255,255,255,.1);padding-top:12px">' +
        '<div style="font-size:12px;color:#93A8AA;margin-bottom:8px">Gast: alles ansehen, Aufgaben abhaken. Bearbeiten und Befehle nur für das Team.</div>' +
        '<input id="liveGastKuerzel" type="text" autocomplete="off" autocapitalize="characters" maxlength="8" placeholder="Dein Kürzel (2–8 Zeichen)" style="font:inherit;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#0E181B;color:#E4ECEA;margin-bottom:10px">' +
        '<input id="liveGastPw" type="password" autocomplete="off" placeholder="Gast-Passwort" style="font:inherit;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#0E181B;color:#E4ECEA;margin-bottom:10px">' +
        '<button type="submit" id="liveGastSend" style="font:inherit;font-weight:600;padding:12px 18px;border:0;border-radius:12px;background:#56ABB5;color:#0E181B;cursor:pointer;width:100%">Als Gast anmelden</button>' +
      "</form>" +
      "</div>";
    document.body.appendChild(el);
    if (oauthFehler) { el.querySelector("#liveLoginErr").textContent = /Kein Team-Mitglied/.test(oauthFehler) ? "Dieses GitHub-Konto ist nicht in der Team-Liste. Bitte LES den GitHub-Namen schicken." : oauthFehler; oauthFehler = null; }
    var gewaehltesKuerzel = null;
    var kuerzelKnoepfe = el.querySelectorAll(".liveLoginKuerzel");
    var markiere = function () {
      Array.prototype.forEach.call(kuerzelKnoepfe, function (b) {
        var an = b.dataset.k === gewaehltesKuerzel;
        b.style.borderColor = an ? "#56ABB5" : "rgba(255,255,255,.18)"; b.style.color = an ? "#56ABB5" : "#E4ECEA";
      });
    };
    Array.prototype.forEach.call(kuerzelKnoepfe, function (b) {
      b.addEventListener("click", function () { gewaehltesKuerzel = b.dataset.k; markiere(); try { el.querySelector("#liveLoginPw").focus(); } catch (e) {} });
    });
    el.querySelector("#liveLoginForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var errEl = el.querySelector("#liveLoginErr"); errEl.textContent = "";
      if (!gewaehltesKuerzel) { errEl.textContent = "Bitte zuerst das Kürzel wählen."; return; }
      var pw = el.querySelector("#liveLoginPw").value;
      if (!pw) { errEl.textContent = "Bitte Passwort eingeben."; return; }
      var kuerzel = gewaehltesKuerzel;
      sb.auth.signInWithPassword({ email: KUERZEL_KONTEN[kuerzel], password: pw }).then(function (r) {
        if (r.error) { errEl.textContent = "Passwort falsch oder Konto noch nicht angelegt."; return; }
        session = r.data.session;
        try {
          localStorage.setItem("ss-wer", kuerzel);
          var b = document.querySelector('#whoModalBtns button[data-w="' + kuerzel + '"]'); if (b) b.click();
        } catch (e) {}
        frischAngemeldet = true;
        start();
      }, function (e) { errEl.textContent = "Keine Verbindung zum Server: " + (e && e.message ? e.message : e); });
    });
    el.querySelector("#liveGithubBtn").addEventListener("click", function () {
      sb.auth.signInWithOAuth({ provider: "github", options: { redirectTo: LOGIN_SITE } })
        .then(function (r) { if (r.error) el.querySelector("#liveLoginErr").textContent = r.error.message; });
    });
    var gastForm = el.querySelector("#liveGastForm");
    el.querySelector("#liveGastBtn").addEventListener("click", function () {
      gastForm.style.display = gastForm.style.display === "none" ? "block" : "none";
      if (gastForm.style.display === "block") { try { el.querySelector("#liveGastKuerzel").focus(); } catch (e) {} }
    });
    gastForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (el.querySelector("#liveGastSend").disabled) return;   /* gesperrt: Anmeldung/Prüfung läuft noch */
      var errEl = el.querySelector("#liveLoginErr"); errEl.textContent = "";
      var k = el.querySelector("#liveGastKuerzel").value, pw = el.querySelector("#liveGastPw").value;
      if (!k.trim()) { errEl.textContent = "Bitte dein Kürzel eintragen."; return; }
      if (!KUERZEL_FORMAT.test(k.trim())) { errEl.textContent = GAST_FEHLER.kuerzel_ungueltig; return; }   /* erst prüfen, dann ein Konto anlegen */
      if (!pw) { errEl.textContent = "Bitte das Gast-Passwort eingeben."; return; }
      gastFormularSperren(true);
      gastAnmelden(k, pw).then(function (f) {
        /* Erfolg (f = null): start() läuft jetzt (Rollenprüfung) — das Formular bleibt gesperrt, bis start() fertig ist
           (pruefungEnde). Fehler: entsperren; das Passwortfeld wird nur bei FALSCHEM Passwort geleert — bei Netzfehler,
           Sperre oder ungültigem Kürzel muss man es nicht noch einmal eintippen. */
        if (!f) return;
        gastFormularSperren(false);
        errEl.textContent = f.text;
        if (f.grund === "passwort") { var pf = el.querySelector("#liveGastPw"); if (pf) pf.value = ""; }
      });
    });
    if (gastHinweis) { el.querySelector("#liveLoginErr").textContent = gastHinweis; gastHinweis = null; }
  }

  /* ---- Rolle und Gast-Anmeldung (Server-Funktionen meine_rolle / gast_anmelden) ---- */
  var gastHinweis = null;
  /* Während start() die Rolle prüft, zeigt das Anmeldefenster „Anmeldung wird geprüft …“ und das Gast-Formular ist gesperrt
     (sonst ließe sich ein zweiter Versuch abschicken, während der erste noch läuft). Ohne Anmeldefenster passiert nichts. */
  var PRUEFTEXT = "Anmeldung wird geprüft …";
  function gastFormularSperren(an) {
    var el = document.getElementById("liveLogin"); if (!el) return;
    Array.prototype.forEach.call(el.querySelectorAll("#liveGastForm input, #liveGastForm button"), function (c) { c.disabled = an; });
  }
  function pruefungAnzeigen() {
    var el = document.getElementById("liveLogin"); if (!el) return;
    var err = el.querySelector("#liveLoginErr"); if (err) { err.textContent = PRUEFTEXT; err.style.color = "#93A8AA"; }
  }
  function pruefungEnde() {
    gastFormularSperren(false);
    var err = document.getElementById("liveLoginErr");
    if (err) { err.style.color = ""; if (err.textContent === PRUEFTEXT) err.textContent = ""; }
  }
  var KUERZEL_FORMAT = /^[A-Za-z0-9ÄÖÜäöü]{2,8}$/;   /* wie der Server (nach Großschreibung) — sonst entsteht ein Konto für nichts */
  var ROLLE_VERSUCHE = 3, ROLLE_ZEIT = 8000, ROLLE_PAUSE = 700;
  /* Eine Anfrage mit Zeitgrenze: kommt nie eine Antwort, wird daraus ein Fehler statt endlosem Warten. Nie ein Reject. */
  function mitZeit(p, ms) {
    return new Promise(function (resolve) {
      var fertig = false;
      var t = setTimeout(function () { if (!fertig) { fertig = true; resolve({ error: { code: "TIMEOUT", message: "Zeitüberschreitung" } }); } }, ms);
      Promise.resolve(p).then(function (r) { if (!fertig) { fertig = true; clearTimeout(t); resolve(r || { error: { code: "NETZ", message: "leere Antwort" } }); } },
        function (e) { if (!fertig) { fertig = true; clearTimeout(t); resolve({ error: { code: "NETZ", message: String(e && e.message || e) } }); } });
    });
  }
  /* "fehlt" = Funktion gibt es auf dem Server nicht (SQL noch nicht eingespielt); "netz" = Netz/Zeitgrenze/Serverausfall (lohnt
     ein neuer Versuch); "abgelehnt" = der Server hat geantwortet und die Abfrage verweigert (Neuanmelden hilft nicht);
     "abgelaufen" = HTTP 401 / PGRST301 / PGRST303: das Zugangstoken ist ungültig oder abgelaufen (Neuanmelden hilft). */
  function fehlerArt(err, status) {
    var c = err.code || "";
    if (c === "PGRST202" || c === "42883") return "fehlt";
    if (status === 401 || err.status === 401 || c === "PGRST301" || c === "PGRST303") return "abgelaufen";
    if (c === "TIMEOUT" || c === "NETZ" || status >= 500 || (!c && !status)) return "netz";
    return "abgelehnt";
  }
  function rolleHolen() {
    var n = 0;
    function los() {
      n++;
      return mitZeit(sb.rpc("meine_rolle"), ROLLE_ZEIT).then(function (r) {
        if (!r.error) return r.data && r.data.rolle ? { art: "ok", r: r.data } : { art: "abgelehnt", code: "leer", text: "keine Rolle in der Antwort" };
        var art = fehlerArt(r.error, r.status);
        if (art === "netz" && n < ROLLE_VERSUCHE) {
          banner("Verbindung wird geprüft … (Versuch " + (n + 1) + " von " + ROLLE_VERSUCHE + ")", ROLLE_ZEIT);
          return new Promise(function (res) { setTimeout(res, ROLLE_PAUSE * n); }).then(los);
        }
        return { art: art, code: r.error.code || "", text: r.error.message || "" };
      });
    }
    return los();
  }
  var GAST_FEHLER = {
    passwort: "Passwort falsch.", gesperrt: "Zu viele Fehlversuche in dieser Sitzung. Bitte in etwa 15 Minuten noch einmal versuchen.",
    nicht_eingerichtet: "Der Gast-Zugang ist noch nicht eingerichtet.", kuerzel_ungueltig: "Kürzel: 2 bis 8 Buchstaben oder Ziffern.",
    kuerzel_reserviert: "Dieses Kürzel ist dem Team vorbehalten. Bitte ein anderes wählen.", kein_gastkonto: "Dieses Konto ist kein Gast-Konto."
  };
  /* Rückgabe: null (Erfolg; start() läuft dann los) oder {text, grund} (grund: "passwort", "gesperrt", "netz", … — nur
     "passwort" leert das Passwortfeld). */
  function gastAnmelden(kuerzel, passwort) {
    gastLaeuft = true;
    /* Bestehende anonyme Sitzung weiterverwenden (die Fehlversuchs-Grenze gilt je Sitzung) — maßgeblich ist die Sitzung, die der
       Browser JETZT hat, nicht die hier gemerkte: ein zweites Fenster kann sie inzwischen verworfen oder ersetzt haben; mit der
       gemerkten ginge der Aufruf dann ohne Sitzung hinaus und scheiterte bis zum Neuladen bei jedem Versuch. */
    var konto = sb.auth.getSession().then(function (g) {
      var s = g && g.data ? g.data.session : null;
      return s && s.user && s.user.is_anonymous ? { data: { session: s }, error: null } : sb.auth.signInAnonymously();
    });
    return konto.then(function (r) {
      if (r.error || !r.data || !r.data.session) {
        /* Netzfehler/Serverausfall und Anmelde-Bremse der Plattform nicht als „nicht freigeschaltet“ ausgeben */
        var st = r.error ? r.error.status : null;
        if (r.error && (r.error.name === "AuthRetryableFetchError" || st === 0 || st >= 500)) return { text: "Keine Verbindung zum Server. Bitte noch einmal versuchen.", grund: "netz" };
        if (st === 429) return { text: "Gerade zu viele Gast-Anmeldungen von diesem Anschluss. Bitte in einigen Minuten noch einmal versuchen.", grund: "limit" };
        return { text: "Gast-Zugang ist derzeit nicht freigeschaltet.", grund: "aus" };
      }
      session = r.data.session;
      return mitZeit(sb.rpc("gast_anmelden", { p_kuerzel: kuerzel, p_passwort: passwort }), 15000).then(function (x) {
        if (x.error) {
          var art = fehlerArt(x.error, x.status);
          return { grund: art, text: art === "fehlt" ? "Der Gast-Zugang ist auf dem Server noch nicht eingerichtet."
            : art === "netz" ? "Keine Verbindung zum Server. Bitte noch einmal versuchen."
            : "Der Server hat die Gast-Anmeldung abgelehnt" + (x.error.code ? " (Code " + x.error.code + ")" : "") + "." };
        }
        var d = x.data;
        if (!d || !d.ok) {
          var t = GAST_FEHLER[d && d.grund] || "Gast-Anmeldung nicht möglich.";
          if (d && d.grund === "passwort" && typeof d.uebrig === "number") t = d.uebrig > 0 ? t + " Noch " + d.uebrig + " Versuch" + (d.uebrig === 1 ? "" : "e") + "." : "Passwort falsch. Das war der letzte Versuch dieser Sitzung.";
          return { text: t, grund: d && d.grund || "unbekannt" };
        }
        try { localStorage.setItem("ss-wer", d.kuerzel); localStorage.setItem("ss-rolle", "gast"); } catch (e) {}
        gastLaeuft = false; gestartet = false; start(); return null;
      });
    }, function (e) { return { text: "Keine Verbindung zum Server. Bitte noch einmal versuchen.", grund: "netz" }; })
      .then(function (t) { gastLaeuft = false; return t; });
  }
  /* Gäste lesen nur. Einzige Ausnahme: der Status (done) einer Aufgabe — über die Server-Funktion, die serverseitig
     alles andere ablehnt. Alles andere wird hier gar nicht erst abgeschickt (die Datenbank würde es ohnehin ablehnen). */
  function gastBlock() {
    banner("Als Gast kannst du nur lesen und Aufgaben abhaken.", 4000);
    return Promise.reject(new Error("Gast: nur lesen"));
  }
  function gastStatus(coll, id, patch) {
    var keys = Object.keys(patch || {});
    if (coll !== "todos" || keys.length !== 1 || keys[0] !== "done" || typeof patch.done !== "boolean") return gastBlock();
    return mitZeit(sb.rpc("gast_aufgabe_status", { p_id: id, p_done: patch.done }), 15000).then(function (r) {
      if (r.error) {
        var ga = fehlerArt(r.error, r.status);
        banner(ga === "netz" ? "Keine Verbindung — der Status wurde nicht geändert." : ga === "abgelaufen" ? "Anmeldung abgelaufen — bitte die Seite neu laden und neu anmelden." : "Der Server hat die Änderung abgelehnt.", 5000);
        throw new Error("Gast-Status: Fehler " + (r.error.code || r.error.message));
      }
      if (!r.data || !r.data.ok) {
        if (r.data && r.data.grund === "kein_gast") { pruefeGast(); }
        banner(r.data && r.data.grund === "gesperrt" ? "Befehle an Claude und Rückfragen ändern nur die Editoren." : r.data && r.data.grund === "kein_gast" ? "Dein Gast-Zugang ist nicht mehr eingetragen." : "Status konnte nicht geändert werden.", 5000);
        throw new Error("Gast-Status abgelehnt: " + (r.data && r.data.grund));
      }
    });
  }

  /* ---- Hinweiskarte (Verbindung / Berechtigung / Gast-Zugang beendet): kein Anmeldefenster, ein klarer Satz und ein Knopf ---- */
  function karteWeg() { var k = document.getElementById("liveKarte"); if (k) k.remove(); }
  function karte(titel, text, knoepfe) {
    karteWeg(); overlay(false);
    var el = document.createElement("div"); el.id = "liveKarte";
    el.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;overflow:auto;padding:16px 0;box-sizing:border-box;background:rgba(14,24,27,.82);backdrop-filter:blur(8px)";
    el.innerHTML = '<div style="background:#162327;color:#E4ECEA;border:1px solid rgba(255,255,255,.1);padding:28px 30px;border-radius:18px;max-width:340px;width:calc(100% - 40px);margin:auto;text-align:center;font:15px -apple-system,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.4)">' +
      '<div style="font-size:18px;font-weight:600;margin-bottom:8px">' + esc(titel) + '</div><div style="font-size:13px;color:#93A8AA;margin-bottom:16px">' + esc(text) + "</div>" +
      knoepfe.map(function (b, i) { return '<button type="button" data-i="' + i + '" style="display:block;width:100%;margin-top:8px;font:inherit;font-weight:600;padding:12px 18px;border:0;border-radius:12px;cursor:pointer;' + (i === 0 ? "background:#56ABB5;color:#0E181B" : "background:none;color:#93A8AA;text-decoration:underline;font-size:12px") + '">' + esc(b.t) + "</button>"; }).join("") + "</div>";
    document.body.appendChild(el);
    Array.prototype.forEach.call(el.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { knoepfe[+b.dataset.i].fn(); }); });
  }
  /* Gast-Zugang serverseitig beendet (Passwort neu gesetzt, Eintrag gelöscht)? Dann sieht die Seite sonst nur leere Listen. */
  var gastTimer = null;
  function pruefeGast() {
    if (!istGast() || !sb) return;
    mitZeit(sb.rpc("meine_rolle"), ROLLE_ZEIT).then(function (r) {
      if (r.error || !r.data || !r.data.rolle || r.data.rolle === "gast") return;   /* Netzfehler: nichts annehmen */
      try { localStorage.removeItem("ss-rolle"); } catch (e) {}
      var neu = function () { (sb.auth.signOut({ scope: "local" }) || Promise.resolve()).then(function () { location.reload(); }, function () { location.reload(); }); };
      karte("Dein Gast-Zugang wurde beendet", "Das Gast-Passwort wurde geändert oder der Zugang entzogen. Bitte neu als Gast anmelden.", [{ t: "Neu anmelden", fn: neu }]);
    });
  }
  function gastWaechter() {
    if (gastTimer) return;
    gastTimer = setInterval(pruefeGast, 60000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) pruefeGast(); });
  }
  /* Zwei Fenster / Abmeldung anderswo: wechselt die Sitzung, wird neu geladen (die Rolle gilt nur für die Sitzung des Starts). */
  var beobachter = false, startKontoId = null;
  function sitzungBeobachten() {
    if (beobachter) return; beobachter = true;
    sb.auth.onAuthStateChange(function (ev, s) {
      if (!gestartet || !rolle) return;
      var neu = s && s.user ? s.user.id : null;
      if (ev === "SIGNED_OUT" || (neu && startKontoId && neu !== startKontoId)) location.reload();
    });
  }
  /* Kürzel aus der ANMELDUNG (GitHub-Name oder Kürzel-Konto), nie aus dem frei wählbaren "Ich bin"; ohne eindeutige Zuordnung null. */
  function kontoKuerzel() {
    var u = session && session.user; if (!u || istGast()) return null;
    var gh = u.user_metadata && u.user_metadata.user_name; if (gh && GITHUB_KUERZEL[gh]) return GITHUB_KUERZEL[gh];
    var mail = String(u.email || "").toLowerCase();
    for (var k in KUERZEL_KONTEN) if (KUERZEL_KONTEN[k] === mail) return k;
    return null;
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
  /* Wie ladeCollection, aber lädt nur die genannten Felder aus der jsonb-Spalte "data" statt
     des ganzen Dokuments (PostgREST-JSON-Pfad "feld:data->feld" behält den echten Typ — Zahl
     bleibt Zahl, Bool bleibt Bool). Für Sammlungen, deren volle Dokumente mehrere MB groß sind
     (z. B. "clips" mit eingebettetem Transkript); das ausgesparte Feld lädt man einzeln über
     db.doc(name + "/" + id).get(). Seitenweise (PostgREST liefert sonst nur die ersten 1000 Zeilen). */
  function ladeCollectionFelder(name, felder) {
    var sel = "id," + felder.map(function (f) { return f + ":data->" + f; }).join(",");
    function seite(off, acc) {
      return sb.from(TABELLE).select(sel).eq("collection", name).range(off, off + 999).then(function (r) {
        if (r.error) throw r.error;
        acc = acc.concat(r.data);
        return r.data.length < 1000 ? acc : seite(off + 1000, acc);
      });
    }
    return seite(0, []).then(function (rows) {
      return rows.map(function (x) {
        var v = {}; felder.forEach(function (f) { v[f] = x[f]; });
        return snapDoc(x.id, v);
      });
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
        if (istGast()) return gastBlock();
        var id = uid();
        return sb.from(TABELLE).insert({ collection: name, id: id, data: data, updated_by: wer() }).then(function (r) { if (r.error) throw r.error; return { id: id }; });
      },
      doc: function (id) { return dokument(name + "/" + id); }
    };
    return self;
  }
  function sammlungFelder(name, felder) {
    return {
      get: function () { return ladeCollectionFelder(name, felder).then(function (docs) { return { docs: docs, empty: docs.length === 0, size: docs.length, forEach: function (fn) { docs.forEach(fn); } }; }); },
      onSnapshot: function (cb, err) {
        var laden = function () { ladeCollectionFelder(name, felder).then(function (docs) { cb({ docs: docs, empty: docs.length === 0, size: docs.length, forEach: function (fn) { docs.forEach(fn); } }); }).catch(function (e) { if (err) err(e); }); };
        laden();
        return on(name, function () { laden(); });
      }
    };
  }
  function dokument(pfad) {
    var t = pfad.split("/"); var coll = t[0], id = t.slice(1).join("/");
    var lade = function () { return sb.from(TABELLE).select("data").eq("collection", coll).eq("id", id).maybeSingle().then(function (r) { if (r.error) throw r.error; return snapDoc(id, r.data ? r.data.data : undefined); }); };
    return {
      get: lade,
      onSnapshot: function (cb, err) { lade().then(cb).catch(err || function () {}); return on(coll, function (row) { if (row.id === id) lade().then(cb).catch(err || function () {}); }); },
      set: function (data, opt) {
        if (istGast()) return gastBlock();
        if (opt && opt.merge) return this.update(data);
        return sb.from(TABELLE).upsert({ collection: coll, id: id, data: data, updated_by: wer(), updated_at: new Date().toISOString() }).then(function (r) { if (r.error) throw r.error; });
      },
      update: function (patch) {
        if (istGast()) return gastStatus(coll, id, patch);
        return sb.rpc("docs_patch", { p_collection: coll, p_id: id, p_patch: patch, p_by: wer() }).then(function (r) { if (r.error) throw r.error; });
      },
      /* Antwort: { geloescht: n } — n = 0, wenn die Datenbank nichts gelöscht hat (z. B. Recht entzogen); Aufrufer mit "Rückgängig"-Hinweis zeigen ihn nur bei n > 0 */
      delete: function () { if (istGast()) return gastBlock(); return sb.from(TABELLE).delete().eq("collection", coll).eq("id", id).select("id").then(function (r) { if (r.error) throw r.error; return { geloescht: r.data ? r.data.length : 0 }; }); }
    };
  }
  var db = { collection: function (n) { return sammlung(n); }, collectionFelder: sammlungFelder, doc: dokument };

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
    return { collection: function (n) { return coll(n); }, collectionFelder: function (n) { return coll(n); }, doc: doc };
  }

  ready = new Promise(function (resolve) {
    if (/DEIN-PROJEKT/.test(SUPABASE_URL) || /DEIN-ANON/.test(SUPABASE_ANON)) { resolve(nurLesen()); return; }
    if (!window.supabase) { console.error("supabase-js nicht geladen"); resolve(null); return; }
    /* detectSessionInUrl aus: die Tokens haben wir oben selbst gesichert (siehe oauth) */
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "implicit" } });
    /* Idempotent: der Kürzel+Passwort-Login ruft das hier direkt nach Erfolg auf, gleichzeitig
       feuert dieselbe Anmeldung den onAuthStateChange-Listener weiter unten — beide dürfen
       start() aufrufen, ausgeführt wird es nur einmal. */
    start = function () {
      if (gestartet) return; gestartet = true;
      pruefungAnzeigen();
      /* Erst die Rolle vom Server erfragen (mit Zeitgrenze und bis zu drei Versuchen). Ohne Rolle (nicht Admin, kein
         Gast-Eintrag) kommt niemand ans Board — die Datenbank würde ohnehin nichts herausgeben; hier zeigen wir es nur
         verständlich an. Netzfehler und Ablehnung durch den Server werden getrennt benannt; eine bestehende Sitzung wird
         dabei NICHT verworfen (Neuanmelden würde nichts ändern). */
      rolleHolen().then(function (x) {
        pruefungEnde();
        var anonym = !!(session && session.user && session.user.is_anonymous);
        if (x.art === "abgelaufen") {
          /* Zugangstoken ungültig/abgelaufen (HTTP 401, PGRST301/PGRST303): Neuanmelden hilft — also zurück zum Anmeldefenster
             mit klarem Satz; die verbrauchte Sitzung wird lokal verworfen. */
          gestartet = false; rolle = null; session = null;
          try { localStorage.removeItem("ss-rolle"); document.documentElement.classList.remove("gast"); } catch (e) {}
          try { (sb.auth.signOut({ scope: "local" }) || Promise.resolve()).then(function () {}, function () {}); } catch (e) {}
          karteWeg(); overlay(true);
          var ea = document.getElementById("liveLoginErr"); if (ea) { ea.style.color = ""; ea.textContent = "Anmeldung abgelaufen — bitte neu anmelden."; }
          return;
        }
        if (x.art === "fehlt") {
          /* Datenbank ohne Rollen-Umstellung (Funktion fehlt): Konto der Team-Anmeldung wie bisher als Admin behandeln —
             die Datenbank selbst entscheidet weiter über jeden Zugriff. Anonyme Konten nie. */
          x = session && session.user && !anonym ? { art: "ok", r: { rolle: "admin", kuerzel: null } } : { art: "ok", r: { rolle: "keine" }, ohneFunktion: true };
        }
        if (x.art === "netz" || x.art === "abgelehnt") {
          gestartet = false; rolle = null;
          var nochmal = function () { karteWeg(); start(); };
          karte(x.art === "netz" ? "Keine Verbindung zum Server" : "Der Server hat die Prüfung abgelehnt",
            x.art === "netz" ? "Die Berechtigung konnte nach " + ROLLE_VERSUCHE + " Versuchen nicht geprüft werden. Deine Anmeldung bleibt bestehen. Bitte die Verbindung prüfen und noch einmal versuchen."
              : "Die Antwort des Servers war eine Ablehnung" + (x.code ? " (Code " + x.code + ")" : "") + ". Neu anmelden hilft dabei nicht — bitte LES oder Main Bescheid geben.",
            [{ t: "Erneut versuchen", fn: nochmal }, { t: "Abmelden", fn: abmelden }]);
          return;
        }
        var r = x.r;
        if (!r || r.rolle === "keine") {
          gestartet = false; rolle = null;
          var warGast = false;
          try { warGast = localStorage.getItem("ss-rolle") === "gast"; localStorage.removeItem("ss-rolle"); document.documentElement.classList.remove("gast"); } catch (e) {}
          if (anonym) {
            /* Restsitzung ohne Gast-Eintrag verwerfen; Hinweis nur, wenn dieses Gerät schon einmal als Gast drin war */
            gastHinweis = x.ohneFunktion ? "Der Gast-Zugang ist auf dem Server noch nicht eingerichtet."
              : warGast ? "Dein Gast-Zugang ist nicht mehr eingetragen (Passwort geändert oder Zugang entzogen). Bitte als Gast neu anmelden." : null;
            session = null;
            try { (sb.auth.signOut({ scope: "local" }) || Promise.resolve()).then(function () {}, function () {}); } catch (e) {}
          } else gastHinweis = "Dieses Konto hat keinen Zugriff auf den Leitstand.";
          karteWeg(); overlay(true);
          var el = document.getElementById("liveLoginErr"); if (el && gastHinweis) { el.textContent = gastHinweis; gastHinweis = null; }
          return;
        }
        rolle = r; startKontoId = session && session.user ? session.user.id : null;
        karteWeg();
        var gastMarke = false;   /* stand dieses Gerät eben noch als Gast da? Dann ist ss-wer ein Gast-Kürzel. */
        try { gastMarke = localStorage.getItem("ss-rolle") === "gast"; } catch (e) {}
        try { if (r.rolle === "gast") localStorage.setItem("ss-rolle", "gast"); else localStorage.removeItem("ss-rolle"); } catch (e) {}
        overlay(false); startRealtime(); sitzungBeobachten();
        if (r.rolle === "gast") gastWaechter();
        /* Kürzel: bei Gästen das angemeldete Gast-Kürzel. Bei Admins nach jeder ANMELDUNG das Kürzel des Kontos (ein auf dem
           Gerät zurückgebliebenes Gast-Kürzel darf nicht als Absender weiterlaufen) — aber NICHT bei jedem Neuladen mit
           bestehender Sitzung: sonst wäre „Ich bin“ (TS/DS am Team-Konto) nach dem eigenen Neuladen sofort wieder
           überschrieben und der Einführungs-Dialog käme bei jedem Seitenaufruf. Ohne Anmeldung nur, wenn noch kein Kürzel
           gewählt ist (wie vor der Rollen-Umstellung) oder das Gerät eben noch als Gast markiert war. */
        try {
          var k = r.rolle === "admin" ? (kontoKuerzel() || r.kuerzel) : null;
          if (r.rolle === "gast") localStorage.setItem("ss-wer", r.kuerzel);
          else if (k && (frischAngemeldet || gastMarke || !localStorage.getItem("ss-wer"))) {
            localStorage.setItem("ss-wer", k);
            var b = document.querySelector('#whoModalBtns button[data-w="' + k + '"]'); if (b) b.click();
          }
        } catch (e) {}
        frischAngemeldet = false;
        if (r.rolle === "gast") { resolve(db); return; }   /* Gäste: kein Startbestand schreiben */
        seed().then(function () { resolve(db); }, function () { resolve(db); });
      });
    };
    /* Gespeicherte Sitzung holen (bzw. Rückkehr von GitHub: Tokens aus der URL setzen). Ein wiederholbarer Fehler
       (Netz weg, Serverausfall, Zeitgrenze) heißt NICHT „nicht angemeldet“: dann die Karte „Keine Verbindung“ mit
       „Erneut versuchen“ — ein Anmeldefenster würde jemanden mit gültiger Sitzung zum Neuanmelden schicken, obwohl nur
       das Netz fehlt. Nur ohne Sitzung und ohne wiederholbaren Fehler kommt das Anmeldefenster. */
    var wiederholbar = function (err) { return !!err && (err.name === "AuthRetryableFetchError" || err.code === "TIMEOUT" || err.code === "NETZ" || err.status === 0 || err.status >= 500); };
    var sitzungLaden = function () {
      var holen = oauth
        ? sb.auth.setSession({ access_token: oauth.access_token, refresh_token: oauth.refresh_token })
        : sb.auth.getSession();
      mitZeit(holen, 15000).then(function (r) {
        if (r && r.error && wiederholbar(r.error) && !(r.data && r.data.session)) {
          karte("Keine Verbindung zum Server", "Die gespeicherte Anmeldung konnte nicht geprüft werden. Deine Anmeldung bleibt bestehen. Bitte die Verbindung prüfen und noch einmal versuchen.",
            [{ t: "Erneut versuchen", fn: function () { karteWeg(); sitzungLaden(); } }]);
          return;
        }
        session = r && r.data ? r.data.session : null;
        if (r && r.error && !oauthFehler) oauthFehler = r.error.message;
        if (oauth && session) frischAngemeldet = true;   /* Rückkehr von der GitHub-Anmeldung */
        oauth = null;
        if (session) { start(); return; }
        overlay(true);
        /* Anonyme (Gast-)Sitzungen starten das Board nie von selbst: erst gast_anmelden macht aus ihnen einen Gast. */
        var sub = sb.auth.onAuthStateChange(function (_e, s) { if (s && !gastLaeuft && !(s.user && s.user.is_anonymous)) { session = s; sub.data.subscription.unsubscribe(); start(); } });
      });
    };
    sitzungLaden();
  });

  function abmelden() {
    try { localStorage.removeItem("ss-wer"); localStorage.removeItem("ss-rolle"); } catch (e) {}
    var fertig = function () { location.replace(LOGIN_SITE); };
    return (sb ? sb.auth.signOut() : Promise.resolve()).then(fertig, fertig);
  }
  window.claude = { use: function (was) { return was === "db" ? ready : Promise.resolve(null); }, live: true,
    logout: abmelden,
    user: function () { return session && session.user ? ((session.user.user_metadata && session.user.user_metadata.user_name) || session.user.email || (rolle && rolle.kuerzel) || null) : null; },
    /* Rolle laut Server: {rolle:"admin"|"gast", kuerzel} oder null (noch nicht angemeldet) */
    rolle: function () { return rolle ? { rolle: rolle.rolle, kuerzel: rolle.kuerzel || null } : null; },
    istGast: istGast,
    kuerzel: kontoKuerzel };

  /* ---- Nach dem Laden: Statuszeile, Projektdatei-Links, Schnitt-11-Panel ---- */
  document.addEventListener("DOMContentLoaded", function () {
    var p = document.querySelector("p.standline");
    if (p) {
      var s = document.createElement("span"); s.style.cssText = "color:#56ABB5"; s.textContent = " · live"; p.appendChild(s);
      var a = document.createElement("a"); a.href = "#"; a.textContent = "Abmelden"; a.title = "GitHub-Konto und Kürzel auf diesem Gerät wechseln";
      a.style.cssText = "margin-left:10px;color:var(--muted,#93A8AA);text-decoration:underline;font-size:12px";
      a.addEventListener("click", function (ev) { ev.preventDefault(); if (confirm(istGast() ? "Abmelden? Danach musst du dich wieder als Gast anmelden (Kürzel und Gast-Passwort)." : "Abmelden? Danach kann man sich mit einem anderen GitHub-Konto anmelden und das Kürzel neu wählen.")) abmelden(); });
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
      '<p class="muted s11bedienung" style="margin:0 0 10px;font-size:13px;color:var(--muted)">To-do mit Art „Claude-Aufgabe“ anlegen und auf „Jetzt erledigen“ tippen. Claude Code auf Schnitt 11 nimmt es in Sekunden auf; Ausgabe erscheint hier.</p>' +
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
