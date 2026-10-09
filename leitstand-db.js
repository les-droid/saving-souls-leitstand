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

  /* ---- Login-Overlay: Kürzel + Passwort (Hauptweg), GitHub als Zweitweg darunter ----
     Paket 6 Teil 3b, KO-5 Möglichkeit 2 (Entscheidung LES 07.10.; HIG modality:39, accessibility:61/129, toggles:22, text-fields:16, dark-mode:30/35):
     ein Dialog für Tastatur und VoiceOver (role, aria-modal, Titel und Zeile darunter als Name und Beschreibung, Startfokus auf dem ersten Kürzel,
     alles dahinter inert, danach Fokus zurück); das gewählte Kürzel mit aria-pressed und gefüllter Fläche; Fehlermeldung als role=alert, bei leerem
     Feld aria-invalid und Fokus ins Feld; Felder mit dem Platzhaltertext als Namen; Farben über die Marken der Seite (Ersatzwert = bisherige Farbe),
     Platzhalter, Feldränder, Unschärfe und deckende Fläche bei »Transparenz reduzieren« bzw. »Kontrast erhöhen« über die Stilregel am Ende.
     Texte, Reihenfolge, Ablauf und Anmeldewege wie bisher (K 2.5). */
  var hinterGesperrt = [], fokusVorLogin = null;
  function hinterSperren(el) {   // alles neben dem Anmeldefenster inert — nur, was es nicht schon war (das gibt hinterFrei zurück)
    Array.prototype.forEach.call(document.body.children, function (c) { if (c === el || c.inert || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(c.tagName)) return; c.inert = true; hinterGesperrt.push(c); });
  }
  function hinterFrei() { hinterGesperrt.forEach(function (c) { c.inert = false; }); hinterGesperrt = []; }
  function overlay(zeige) {
    var el = document.getElementById("liveLogin");
    if (!zeige) {
      if (el) { el.remove(); hinterFrei(); var f = fokusVorLogin; fokusVorLogin = null; if (f && f !== document.body && document.contains(f)) { try { f.focus({ preventScroll: true }); } catch (e) {} } }
      return;
    }
    if (el) { hinterSperren(el); return; }
    fokusVorLogin = document.activeElement;
    el = document.createElement("div"); el.id = "liveLogin";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "liveLoginTitel"); el.setAttribute("aria-describedby", "liveLoginZeile");
    el.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;overflow:auto;padding:16px 0;box-sizing:border-box";
    var kuerzelBtns = Object.keys(KUERZEL_KONTEN).map(function (k) {
      return '<button type="button" class="liveLoginKuerzel" data-k="' + k + '" aria-pressed="false" style="flex:1;font:700 16px -apple-system,system-ui,sans-serif;padding:12px 0;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:var(--bg,#0E181B);color:var(--ink,#E4ECEA);cursor:pointer">' + k + "</button>";
    }).join("");
    el.innerHTML = '<div style="background:var(--surface,#162327);color:var(--ink,#E4ECEA);border:1px solid rgba(255,255,255,.1);padding:28px 30px;border-radius:18px;max-width:340px;width:calc(100% - 40px);margin:auto;text-align:center;font:15px -apple-system,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.4)">' +
      '<div id="liveLoginTitel" style="font-size:20px;font-weight:600;margin-bottom:6px">Saving Souls Leitstand</div>' +
      '<div id="liveLoginZeile" style="font-size:13px;color:var(--muted,#93A8AA);margin-bottom:16px">Editoren: Kürzel wählen und Passwort eingeben. Gäste: unten „Als Gast anmelden“.</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:14px">' + kuerzelBtns + "</div>" +
      '<form id="liveLoginForm">' +
        '<input id="liveLoginPw" type="password" autocomplete="current-password" placeholder="Passwort" aria-label="Passwort" style="font:inherit;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid var(--field-edge,#5C7075);background:var(--bg,#0E181B);color:var(--ink,#E4ECEA);margin-bottom:10px">' +
        '<button type="submit" id="liveLoginBtn" style="font:inherit;font-weight:600;padding:12px 18px;border:0;border-radius:12px;background:var(--accent,#56ABB5);color:var(--accent-ink,#0E181B);cursor:pointer;width:100%">Anmelden</button>' +
      "</form>" +
      '<div id="liveLoginErr" role="alert" style="font-size:12px;margin-top:10px;min-height:14px"></div>' +
      '<button type="button" id="liveGithubBtn" style="margin-top:16px;padding:12px;font:600 12px -apple-system,system-ui,sans-serif;background:none;border:0;color:var(--muted,#93A8AA);text-decoration:underline;cursor:pointer">Mit GitHub anmelden</button>' +
      '<div style="margin-top:16px;border-top:1px solid rgba(255,255,255,.1);padding-top:16px"><button type="button" id="liveGastBtn" style="font:inherit;font-weight:600;padding:12px 18px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:none;color:var(--ink,#E4ECEA);cursor:pointer;width:100%">Als Gast anmelden</button></div>' +
      '<form id="liveGastForm" style="display:none;margin-top:12px;text-align:left;border-top:1px solid rgba(255,255,255,.1);padding-top:12px">' +
        '<div style="font-size:12px;line-height:1.35;color:var(--muted,#93A8AA);margin-bottom:8px">Als Gast liest du mit und schreibst den Editoren Notizen. Dein Kürzel wählst du selbst (2 bis 8 Zeichen), das Gast-Passwort bekommst du von den Editoren.</div>' +
        '<input id="liveGastKuerzel" type="text" autocomplete="off" autocapitalize="characters" maxlength="8" placeholder="Dein Kürzel (2–8 Zeichen)" aria-label="Dein Kürzel (2–8 Zeichen)" style="font:inherit;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid var(--field-edge,#5C7075);background:var(--bg,#0E181B);color:var(--ink,#E4ECEA);margin-bottom:10px">' +
        '<input id="liveGastPw" type="password" autocomplete="off" placeholder="Gast-Passwort" aria-label="Gast-Passwort" style="font:inherit;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid var(--field-edge,#5C7075);background:var(--bg,#0E181B);color:var(--ink,#E4ECEA);margin-bottom:10px">' +
        '<button type="submit" id="liveGastSend" style="font:inherit;font-weight:600;padding:12px 18px;border:0;border-radius:12px;background:var(--accent,#56ABB5);color:var(--accent-ink,#0E181B);cursor:pointer;width:100%">Als Gast anmelden</button>' +
      "</form>" +
      "</div>" +
      "<style>#liveLogin{background:rgba(14,24,27,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}#liveLoginErr{color:var(--danger,#FF6B6F)}" +
      "#liveLogin [aria-invalid=\"true\"]{border-color:var(--danger,#FF6B6F)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--danger,#FF6B6F) 25%,transparent)}#liveLogin ::placeholder{color:var(--muted,#93A8AA);opacity:1}" +
      "@media (prefers-reduced-transparency: reduce){#liveLogin{background:var(--bg,#0E181B);-webkit-backdrop-filter:none;backdrop-filter:none}}" +
      "@media (prefers-contrast: more){#liveLogin{background:var(--bg,#0E181B);-webkit-backdrop-filter:none;backdrop-filter:none}}</style>";
    document.body.prepend(el);
    hinterSperren(el);
    if (oauthFehler) { el.querySelector("#liveLoginErr").textContent = /Kein Team-Mitglied/.test(oauthFehler) ? "Dieses GitHub-Konto ist nicht in der Team-Liste. Bitte LES den GitHub-Namen schicken." : oauthFehler; oauthFehler = null; }
    var gewaehltesKuerzel = null;
    var kuerzelKnoepfe = el.querySelectorAll(".liveLoginKuerzel");
    var markiere = function () {
      Array.prototype.forEach.call(kuerzelKnoepfe, function (b) {
        var an = b.dataset.k === gewaehltesKuerzel;
        b.setAttribute("aria-pressed", an ? "true" : "false");
        b.style.borderColor = an ? "var(--accent,#56ABB5)" : "rgba(255,255,255,.18)"; b.style.background = an ? "var(--accent,#56ABB5)" : "var(--bg,#0E181B)"; b.style.color = an ? "var(--accent-ink,#0E181B)" : "var(--ink,#E4ECEA)";
      });
    };
    var feldFehler = function (id) { var f = el.querySelector(id); if (!f) return; f.setAttribute("aria-invalid", "true"); try { f.focus(); } catch (e) {} };
    Array.prototype.forEach.call(el.querySelectorAll("input"), function (f) { f.addEventListener("input", function () { f.removeAttribute("aria-invalid"); }); });
    try { kuerzelKnoepfe[0].focus({ preventScroll: true }); } catch (e) {}
    Array.prototype.forEach.call(kuerzelKnoepfe, function (b) {
      b.addEventListener("click", function () { gewaehltesKuerzel = b.dataset.k; markiere(); try { el.querySelector("#liveLoginPw").focus(); } catch (e) {} });
    });
    el.querySelector("#liveLoginForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var errEl = el.querySelector("#liveLoginErr"); errEl.textContent = "";
      if (!gewaehltesKuerzel) { errEl.textContent = "Wähl oben dein Kürzel. Bist du Gast, nimm unten „Als Gast anmelden“."; return; }
      var pw = el.querySelector("#liveLoginPw").value;
      if (!pw) { errEl.textContent = "Bitte Passwort eingeben."; feldFehler("#liveLoginPw"); return; }
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
      if (!k.trim()) { errEl.textContent = "Bitte dein Kürzel eintragen."; feldFehler("#liveGastKuerzel"); return; }
      if (!KUERZEL_FORMAT.test(k.trim())) { errEl.textContent = GAST_FEHLER.kuerzel_ungueltig; feldFehler("#liveGastKuerzel"); return; }   /* erst prüfen, dann ein Konto anlegen */
      if (!pw) { errEl.textContent = "Bitte das Gast-Passwort eingeben."; feldFehler("#liveGastPw"); return; }
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
    var err = el.querySelector("#liveLoginErr"); if (err) { err.textContent = PRUEFTEXT; err.style.color = "var(--muted,#93A8AA)"; }
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
  /* Gäste lesen und schreiben Notizen (K 2.4, 9.1 Z26). Jede andere Schreibaktion eines Gasts endet hier und wird gar nicht erst
     abgeschickt (die Datenbank würde sie ohnehin ablehnen); einen Abhak-Weg für Gäste gibt es nicht mehr (A4). */
  function gastBlock() {
    banner("Als Gast liest du mit und schreibst den Editoren Notizen.", 4000);
    return Promise.reject(new Error("Gast: nur lesen"));
  }
  /* Notiz schreiben (B3; K 5.4, Bauplan 2.3): window.claude.notiz(text) → Promise, nie ein Fehler: { ok: true, id } oder { ok: false, grund[, max] }.
     Gast: Server-Funktion gast_notiz mit genau dem eingegebenen Text; ihre Gründe kommen unverändert zurück (leer, zu_lang, ungueltig, limit_stunde,
     limit_tag, limit_gesamt, fehler, nicht_angemeldet, kein_gast). Dazu »netz« (keine Antwort, Zeitgrenze, Serverausfall), »nicht_angemeldet«
     (Zugang abgelaufen: HTTP 401, PGRST301/303), »ungueltig« (ein Zeichen, das die Datenbank gar nicht annimmt: 22P05), sonst »unbekannt«.
     Den Satz je Grund wählt die Seite. Editor: ein Eintrag in notes mit dem Kürzel der ANMELDUNG (wie bei den Sternen, nie aus »Ich bin«),
     rolle admin, höchstens 1.000 Zeichen wie beim Server (Bauplan Annahme A-6). Kein anderer Schreibweg für Notizen. */
  var NOTIZ_ZEICHEN = 1000;
  function notizGrund(err, status) { var a = fehlerArt(err, status); return a === "netz" ? "netz" : a === "abgelaufen" ? "nicht_angemeldet" : err.code === "22P05" ? "ungueltig" : "unbekannt"; }
  function notiz(text) {
    if (!sb || !rolle) return Promise.resolve({ ok: false, grund: "nicht_angemeldet" });
    if (istGast()) return mitZeit(sb.rpc("gast_notiz", { p_text: text }), 15000).then(function (r) {
      if (r.error) return { ok: false, grund: notizGrund(r.error, r.status) };
      var d = r.data, x = { ok: !!(d && d.ok === true) };
      if (x.ok) { x.id = d.id; return x; }
      x.grund = d && typeof d.grund === "string" ? d.grund : "unbekannt";
      if (d && typeof d.max === "number") x.max = d.max;
      return x;
    });
    var k = kontoKuerzel() || rolle.kuerzel || null, t = String(text == null ? "" : text).replace(/^\s+|\s+$/g, ""), id = uid();
    if (!k) return Promise.resolve({ ok: false, grund: "unbekannt" });   /* ohne Kürzel der Anmeldung keine Notiz */
    if (!t) return Promise.resolve({ ok: false, grund: "leer" });
    if (Array.from(t).length > NOTIZ_ZEICHEN) return Promise.resolve({ ok: false, grund: "zu_lang", max: NOTIZ_ZEICHEN });
    return mitZeit(sb.from(TABELLE).insert({ collection: "notes", id: id, data: { text: t, wer: k, rolle: "admin", created: new Date().toISOString() }, updated_by: k }), 15000)
      .then(function (r) { return r.error ? { ok: false, grund: notizGrund(r.error, r.status) } : { ok: true, id: id }; });
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
        /* Kanalfehler und Wiederverbindung an EINE Stelle (A7, Fall 1 der Sammelzeile): Ereignis "leitstand-verbindung" an die Seite.
           Übernimmt die Seite es (preventDefault), zeigt die Zugriffsschicht kein eigenes Band mehr — sonst wie bisher. */
        if (st !== "CHANNEL_ERROR" && st !== "TIMED_OUT" && st !== "SUBSCRIBED") return;
        var ok = st === "SUBSCRIBED", ev = null;
        try { ev = new CustomEvent("leitstand-verbindung", { detail: { ok: ok, quelle: "kanal" }, cancelable: true }); } catch (e) {}
        var uebernommen = !!ev && !window.dispatchEvent(ev);
        if (!ok && !uebernommen) banner("Live-Verbindung unterbrochen – Seite neu laden.", 10000);
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
        if (istGast()) return gastBlock();
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
    notiz: notiz,   /* B3: Notiz schreiben (Gast über gast_notiz, Editor direkt in notes) */
    kuerzel: kontoKuerzel };
  /* ---- Projekt-Austausch (Stufe 2, Teil B: Bauplan P2 Nr. 1 und 4; Datenvertrag B 2.1–2.3, 2.7, 2.8; Entscheidungen 5.4 a, h, m) ----
     window.claude.hochladen(datei, art, beiFortschritt) → Promise, nie ein Fehler: { ok: true } oder { ok: false, grund }.
       Ablauf: Datei, Endung .prproj, Art und Größe vorab prüfen → die Datei hier im Browser lesen → gast_eingang_anlegen(p_art, p_bytes) →
       Hochladen in den privaten Bucket projekt-eingaenge unter genau dem Namen »objekt« aus der Antwort, als namenloser Datenblock: die
       gelesenen Bytes, nicht das Datei-Objekt (der Originalname geht nicht mit), Typ application/octet-stream von der Seite gesetzt, upsert aus
       (kein Überschreiben; P1-08) → gast_eingang_fertig(p_id). In docs schreibt die Seite dabei nichts selbst.
       Gründe: die vereinbarten der zwei Server-Funktionen (B 2.7, E 5.4 h) — anlegen: nicht_angemeldet, abgeschaltet, kein_gast, art_ungueltig,
       zu_gross, grenze_stunde, grenze_tag, grenze_gesamt, speicher_voll, platz_offen, unbekannt; fertig: nicht_angemeldet, abgeschaltet,
       kein_gast, nicht_gefunden, nicht_deins, falscher_zustand, datei_fehlt —, dazu die Seiten-Codes netz (keine Antwort, Zeitgrenze,
       Serverausfall), falsche_endung (nicht .prproj) und abgebrochen (keine Datei übergeben; Lesen oder Übertragung vom Browser abgebrochen).
       Jeder andere Grund des Servers wird »unbekannt«; eine leere Datei ist »unbekannt« wie beim Server (p_bytes unter 1).
       Lehnt der Speicher die Datei ab oder bleibt seine Antwort aus, fragt die Seite bei gast_eingang_fertig nach (die Funktion prüft nur, ob die
       Datei unter dem Namen liegt): liegt sie da, ist der Upload gelungen; sonst nennt der Server den Grund (abgeschaltet, kein_gast …; ein
       verfallener Platz heißt datei_fehlt); bleibt auch diese Antwort aus, bleibt es netz bzw. abgebrochen.
       Fehlt eine der Funktionen auf dem Server (v3 nicht eingespielt), gilt das als »abgeschaltet«: das Hochladen gibt es dort nicht.
       beiFortschritt({ schritt }) mit schritt "lesen", "platz", "hochladen", "melden"; ein Fehler im Rückruf hält nichts an. Fortschritt in
       Byte liefert die Bibliothek beim Hochladen nicht (fetch ohne Ereignisse für den Upload) [offen].
     window.claude.meineEingaenge() → { ok: true, offen, eingaenge: [{ art, angelegt_am, bytes_gemeldet, hochgeladen_am, status, status_am,
       grund }] } — nur die eigenen, neueste zuerst, nur die Felder der Spalte »Gast sieht« (B 2.2; jedes andere Feld fällt hier weg, Text bleibt
       Text, Zahl bleibt Zahl, alles andere wird null) — oder { ok: false, grund } (nicht_angemeldet, abgeschaltet, netz, unbekannt).
       offen ist der Stand des Server-Schalters; nur bei offen: true zeigt die Seite das Hochladen (P2 Nr. 7). Werte bleiben Daten: die Seite
       setzt sie nur maskiert ein (P2 Nr. 8).
     window.claude.eingaengeAbo(cb, fehlerCb) → Abmelde-Funktion oder null. Abo der Sammlung eingaenge erst, wenn die Rolle feststeht und Admin
       ist (P2 Nr. 4, wie beim Reiter »Redaktion«); Gäste und eine unbekannte Rolle bekommen null: keine Abfrage, kein Abo. Auch über
       db.collection, db.collectionFelder und db.doc fragt nur ein Admin die Sammlung an (Gäste bekämen von der Datenbank ohnehin nichts). */
  var EINGANG_BUCKET = "projekt-eingaenge";
  var EINGANG_MAX_BYTES = 52428800;   /* 50 MiB je Datei: F5 (Vorschlag), wie file_size_limit des Buckets und max_bytes in v3 — ändert Main die Grenze, dann an allen drei Stellen */
  var EINGANG_ZEIT = 15000;           /* Antwortgrenze der Server-Funktionen, wie bei notiz */
  var HOCHLADEN_ZEIT = 1200000;       /* Antwortgrenze des Hochladens: 20 Minuten, damit 50 MiB auch über ein langsames Mobilnetz durchgehen [Annahme für den Bau, offen] */
  var LESEN_ZEIT = 120000;            /* Grenze für das Lesen der Datei im Browser: 2 Minuten — hängt das Lesen, endet hochladen() mit »unbekannt« statt nie (Prüfrunde 1 zu Teil B, T-11) [Annahme für den Bau, offen] */
  var EINGANG_ARTEN = ["ausgangsstand", "rueckgabe"];
  var GRUENDE_ANLEGEN = ["nicht_angemeldet", "abgeschaltet", "kein_gast", "art_ungueltig", "zu_gross", "grenze_stunde", "grenze_tag", "grenze_gesamt", "speicher_voll", "platz_offen", "unbekannt"];
  var GRUENDE_FERTIG = ["nicht_angemeldet", "abgeschaltet", "kein_gast", "nicht_gefunden", "nicht_deins", "falscher_zustand", "datei_fehlt"];
  var GAST_SIEHT = ["art", "angelegt_am", "bytes_gemeldet", "hochgeladen_am", "status", "status_am", "grund"];
  function abbruch(e) { return !!e && /^AbortError$/.test(String(e.name || "")); }
  /* Antwort einer Server-Funktion → { ok: true, d } oder { ok: false, grund } (nur vereinbarte Gründe; Fehlerwege wie bei notiz, »fehlt« = abgeschaltet) */
  function austauschAntwort(r, gruende) {
    if (r.error) { var a = fehlerArt(r.error, r.status); return { ok: false, grund: a === "netz" ? "netz" : a === "abgelaufen" ? "nicht_angemeldet" : a === "fehlt" ? "abgeschaltet" : "unbekannt" }; }
    var d = r.data;
    if (d && typeof d === "object" && d.ok === true) return { ok: true, d: d };
    return { ok: false, grund: d && typeof d.grund === "string" && gruende.indexOf(d.grund) !== -1 ? d.grund : "unbekannt" };
  }
  /* Datei im Browser lesen → { b: ArrayBuffer } | { e: Fehler } | { abbruch: true } (FileReader nur, wo Blob.arrayBuffer fehlt) */
  function dateiLesen(datei) {
    return new Promise(function (fertig) {
      try {
        if (typeof datei.arrayBuffer === "function") { datei.arrayBuffer().then(function (b) { fertig({ b: b }); }, function (e) { fertig({ e: e || {} }); }); return; }
        var fr = new FileReader();
        fr.onload = function () { fertig({ b: fr.result }); };
        fr.onerror = function () { fertig({ e: fr.error || {} }); };
        fr.onabort = function () { fertig({ abbruch: true }); };
        fr.readAsArrayBuffer(datei);
      } catch (e) { fertig({ e: e || {} }); }
    });
  }
  /* Fehler des Speichers beim Hochladen → netz, abgebrochen, zu_gross, nicht_angemeldet, unbekannt oder (nur intern, die Nachfrage bei
     gast_eingang_fertig klärt sie) »vorhanden« (Name schon belegt: ein früherer Versuch kam an) bzw. »abgelehnt« (Regel des Speichers: kein
     offener Platz). Der Status steht je nach Fassung der Plattform im HTTP-Status oder nur im Feld statusCode — beides zählt. */
  function speicherArt(e) {
    if (abbruch(e) || abbruch(e.originalError)) return "abgebrochen";
    var st = +e.status || 0, sc = parseInt(e.statusCode, 10) || 0;
    if (st === 401 || sc === 401) return "nicht_angemeldet";
    if (st === 413 || sc === 413) return "zu_gross";
    if (st === 409 || sc === 409) return "vorhanden";
    if (st === 403 || sc === 403) return "abgelehnt";
    if ((!st && !sc) || st >= 500 || sc >= 500) return "netz";
    return "unbekannt";
  }
  function hochladen(datei, art, beiFortschritt) {
    var schritt = function (s) { if (typeof beiFortschritt === "function") { try { beiFortschritt({ schritt: s }); } catch (e) {} } };
    var nein = function (g) { return { ok: false, grund: g }; };
    var vorab;
    try {
      vorab = !sb || !rolle || !session || !session.user || !session.user.id ? "nicht_angemeldet"
        : !datei ? "abgebrochen"
        : !/\.prproj$/i.test(String(datei.name == null ? "" : datei.name)) ? "falsche_endung"
        : EINGANG_ARTEN.indexOf(art) === -1 ? "art_ungueltig"
        : !(datei.size >= 1) ? "unbekannt"
        : datei.size > EINGANG_MAX_BYTES ? "zu_gross" : null;
    } catch (e) { vorab = "unbekannt"; }
    if (vorab) return Promise.resolve(nein(vorab));
    var konto = String(session.user.id);
    schritt("lesen");
    return mitZeit(dateiLesen(datei), LESEN_ZEIT).then(function (g) {   /* nach der Zeitgrenze: { error } ohne Bytes → unbekannt */
      if (g.abbruch || abbruch(g.e)) return nein("abgebrochen");
      var b = g.b, n = b && typeof b.byteLength === "number" ? b.byteLength : 0;
      if (!(n >= 1)) return nein("unbekannt");
      if (n > EINGANG_MAX_BYTES) return nein("zu_gross");
      schritt("platz");
      return mitZeit(sb.rpc("gast_eingang_anlegen", { p_art: art, p_bytes: n }), EINGANG_ZEIT).then(function (r) {
        var a = austauschAntwort(r, GRUENDE_ANLEGEN);
        if (!a.ok) return nein(a.grund);
        var id = a.d.id, objekt = a.d.objekt;
        /* nur auf genau den vereinbarten Namen <Konto>/<Kennung>.prproj (B 2.1, E 5.4 a) — sonst nichts hochladen */
        if (typeof id !== "string" || !/^eg-[0-9a-f]{32}$/.test(id) || konto.indexOf("/") !== -1 || objekt !== konto + "/" + id + ".prproj") return nein("unbekannt");
        schritt("hochladen");
        return mitZeit(sb.storage.from(EINGANG_BUCKET).upload(objekt, b, { contentType: "application/octet-stream", upsert: false }), HOCHLADEN_ZEIT).then(function (u) {
          var fehler = u.error ? speicherArt(u.error) : null;
          if (fehler === "zu_gross" || fehler === "nicht_angemeldet" || fehler === "unbekannt") return nein(fehler);
          schritt("melden");
          return mitZeit(sb.rpc("gast_eingang_fertig", { p_id: id }), EINGANG_ZEIT).then(function (f) {
            var x = austauschAntwort(f, GRUENDE_FERTIG);
            if (x.ok) return { ok: true };
            if (!fehler) return nein(x.grund);
            if (x.grund === "netz") return nein(fehler === "abgebrochen" ? "abgebrochen" : "netz");
            if (x.grund === "datei_fehlt") return nein(fehler === "abgelehnt" ? "datei_fehlt" : fehler === "vorhanden" ? "unbekannt" : fehler);
            return nein(x.grund);
          });
        });
      });
    }).then(null, function () { return nein("unbekannt"); });
  }
  function meineEingaenge() {
    if (!sb || !rolle) return Promise.resolve({ ok: false, grund: "nicht_angemeldet" });
    return mitZeit(sb.rpc("gast_meine_eingaenge"), EINGANG_ZEIT).then(function (r) {
      var a = austauschAntwort(r, ["nicht_angemeldet"]);
      if (!a.ok) return { ok: false, grund: a.grund };
      if (!Array.isArray(a.d.eingaenge)) return { ok: false, grund: "unbekannt" };
      return { ok: true, offen: a.d.offen === true, eingaenge: a.d.eingaenge.filter(function (e) { return !!e && typeof e === "object" && !Array.isArray(e); }).map(function (e) {
        var v = {};
        GAST_SIEHT.forEach(function (f) { var x = e[f]; v[f] = f === "bytes_gemeldet" ? (typeof x === "number" && isFinite(x) ? x : null) : typeof x === "string" ? x : null; });
        return v;
      }) };
    }).then(null, function () { return { ok: false, grund: "unbekannt" }; });
  }
  function nurAdmins(name) { return name === "eingaenge" && !(rolle && rolle.rolle === "admin"); }
  function eingaengeAbo(cb, fehlerCb) {
    if (!sb || typeof cb !== "function" || nurAdmins("eingaenge")) return null;
    return sammlung("eingaenge").onSnapshot(cb, fehlerCb);
  }
  /* allgemeine Wege für Nicht-Admins: lesen liefert nichts, ein Abo ruft nie zurück, keine Abfrage; Schreiben bleibt, wie es ist (Gäste: gastBlock) */
  var dbAllgemein = { collection: db.collection, collectionFelder: db.collectionFelder, doc: db.doc };
  function ohneAbfrage(name) {
    var leer = { docs: [], empty: true, size: 0, forEach: function () {} }, self = {
      orderBy: function () { return self; }, where: function () { return self; }, limit: function () { return self; },
      get: function () { return Promise.resolve(leer); }, onSnapshot: function () { return function () {}; },
      add: function (data) { return dbAllgemein.collection(name).add(data); }, doc: function (id) { return db.doc(name + "/" + id); } };
    return self;
  }
  db.collection = function (n) { return nurAdmins(n) ? ohneAbfrage(n) : dbAllgemein.collection(n); };
  db.collectionFelder = function (n, f) { return nurAdmins(n) ? ohneAbfrage(n) : dbAllgemein.collectionFelder(n, f); };
  db.doc = function (p) {
    var t = String(p).split("/"), d = dbAllgemein.doc(p);
    if (!nurAdmins(t[0])) return d;
    return { get: function () { return Promise.resolve(snapDoc(t.slice(1).join("/"), undefined)); }, onSnapshot: function () { return function () {}; }, set: d.set, update: d.update, delete: d.delete };
  };
  if (window.claude) {   /* ohne window.claude (Ausweichweg der Prüfungen) bleibt es dabei */
    window.claude.hochladen = hochladen;
    window.claude.meineEingaenge = meineEingaenge;
    window.claude.eingaengeAbo = eingaengeAbo;
  }

  /* ---- Nach dem Laden: Abmelden im Kopf, Schnitt-11-Panel (B4: keine Umschreibung der Projektdatei-Links mehr, K 4.5, 9.1 Z14) ---- */
  document.addEventListener("DOMContentLoaded", function () {
    /* Abmelden (K 2.4): Knopf #abmelden im Kopf der Seite, auf jedem Reiter; Rückfrage je Rolle. Ohne Knopf geschieht nichts. */
    var ab = document.getElementById("abmelden");
    if (ab) ab.addEventListener("click", function (ev) { ev.preventDefault(); if (confirm(istGast() ? "Abmelden? Danach musst du dich wieder als Gast anmelden (Kürzel und Gast-Passwort)." : "Abmelden? Danach meldest du dich neu an.")) abmelden(); });


    /* Schnitt 11: Live-Status der Claude-Aufgaben („Jetzt erledigen“) — B1: im Abschnitt »Bei Claude« des Reiters Aufgaben (K 5.2 Nr. 6), nur für
       Editoren; Nachrichten aus dem Reiter „Claude“ (quelle chat, Schreibweisen wie die Leseregel, Vertrag V3) stehen nicht darin (Prüfbericht Bauplan Nr. 14) */
    var host = document.getElementById("beiClaudeInhalt");
    if (!host) return;
    var sec = document.createElement("section"); sec.className = "card"; sec.id = "schnitt11";
    sec.innerHTML = '<h2>Schnitt 11 <span class="hint">Claude-Aufgaben · läuft live auf dem Schnittrechner</span></h2>' +
      '<p class="muted s11bedienung" style="margin:0 0 10px;font-size:13px;color:var(--muted)">To-do mit Art „Claude-Aufgabe“ anlegen und auf „Jetzt erledigen“ tippen. Claude Code auf Schnitt 11 nimmt es in Sekunden auf; Ausgabe erscheint hier.</p>' +
      '<ul class="todos" id="s11List"><li class="empty">Keine laufenden oder kürzlich erledigten Claude-Aufgaben.</li></ul>' +
      '<style>#schnitt11 .s11st{font-size:12px;font-weight:600}#schnitt11 .s11st[data-s="offen"]{color:var(--muted)}#schnitt11 .s11st[data-s="wartet"]{color:var(--muted)}#schnitt11 .s11st[data-s="laeuft"]{color:var(--signal)}#schnitt11 .s11st[data-s="fertig"]{color:var(--ok)}#schnitt11 .s11st[data-s="fehler"]{color:#E87A46}#schnitt11 pre{margin:6px 0 0;max-height:220px;overflow:auto;font:12px var(--font-mono);background:#0E181B;color:#E4ECEA;padding:8px 10px;border-radius:8px;white-space:pre-wrap;border:1px solid var(--line)}#schnitt11 details summary{cursor:pointer;font-size:12px;color:var(--muted)}#schnitt11 li{list-style:none;padding:10px 0;border-top:1px solid var(--line)}#schnitt11 li:first-child{border-top:0}</style>';
    host.insertBefore(sec, host.firstChild);
    var ul = sec.querySelector("#s11List");
    var fmt = function (t) { try { return new Date(t).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
    var chat = function (v) { return /^[^\p{L}\p{N}]*chat[^\p{L}\p{N}]*$/iu.test(v.quelle == null ? "" : String(v.quelle)); };
    ready.then(function (d) {
      if (!d) return;
      if (istGast()) { if (sec.parentNode) sec.parentNode.removeChild(sec); return; }   /* Gäste: keine Karte, keine Abfrage (Bauplan 3) */
      d.collection("todos").onSnapshot(function (snap) {
        var rows = snap.docs.map(function (x) { var v = x.data(); if (!v || typeof v !== "object") return {}; v._id = x.id; return v; })   /* ein Eintrag, der kein Objekt ist, fällt weg, statt die Karte still anzuhalten (Prüfrunde 2, Befund S-07) */
          .filter(function (v) { return v.typ === "claude" && (v.angefordert || v.s11status) && !chat(v); })
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
