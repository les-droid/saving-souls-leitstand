/* Baukasten — »Fragensammlung« und »Drehplan« im Reiter Redaktion des Leitstands. CL JB 12.10.2026 (Auftrag JB 12.10.).
   Überlagerung wie das Vision Board (CL LES 09.10.): ändert keine bestehende Datei. Wird in index.html direkt NACH redaktion.js geladen (anwenden.sh)
   und legt eine Hülle um window.LEITSTAND_REDAKTION. Damit gilt, was die Seite für die Redaktion schon tut: nur Admins, erst wenn die Rolle feststeht,
   Gäste bekommen weder Reiter noch Abfrage.

   Form: Ein Reiter »Redaktion« (Standard) → oben ein Umschalter »Arbeitsmappe · Fragensammlung · Drehplan«; unter »Arbeitsmappe« zeichnet redaktion.js
   wie bisher (Experten, Figuren, Dramaturgie). Mit EINST.redaktionDreiReiter → zwei eigene Reiter »Fragen« und »Drehplan« neben den dreien.
   Adressen: #redaktion-fragen, #redaktion-drehplan (in beiden Formen gültig).

   Inhalt nur aus der Datenbank, nichts davon im Code (die Seite ist öffentlich): Sammlung `baukasten`, Eintrag `katalog` (bauart 1) mit regeln, module,
   vorlagen, dreh_bausteine — übertragen von »261012 baukasten-nach-leitstand CL JB.mjs« aus konzept/interviews/…Fragenbaukasten Daten CL JB.json.
   Gelesen wird nur über den Zugriff, den die Seite der Redaktion gibt (onSnapshot); geschrieben wird nichts. Was man zusammenstellt (Leitfaden, Drehplan),
   bleibt auf diesem Gerät (localStorage) und wird als Markdown kopiert. Jeder Text aus der Datenbank wird maskiert gesetzt (esc).

   Schalter: EIN.an (Standard AUS — eingehängt heißt noch nicht sichtbar). Nur lokal auch über die Adresse: ?baukasten=1; mit ?demo=1 zusätzlich erfundene
   Demo-Daten (demo-baukasten.js). Prüfzugang: window.LEITSTAND_BAUKASTEN. */
(function () {
  "use strict";

  var EIN = { an: true };   // 261012 CL LES: eingeschaltet (Freigabe LES 12.10.)
  var h = location.hostname;
  var LOKAL = location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  var SUCHE = String(location.search || "");
  if (LOKAL && /[?&]baukasten=1(&|$)/.test(SUCHE)) EIN.an = true;
  if (LOKAL && EIN.an && /[?&]demo=1(&|$)/.test(SUCHE) && document.readyState === "loading" && typeof document.write === "function") document.write('<script src="demo-baukasten.js"><\/script>');

  var SAMMLUNG = "baukasten", KATALOG = "katalog", BAUART = 1;
  var ANSICHTEN = [
    { k: "mappe", n: "Arbeitsmappe" },
    { k: "fragen", n: "Fragensammlung", seite: "redaktion-fragen", reiter: "Fragen" },
    { k: "drehplan", n: "Drehplan", seite: "redaktion-drehplan", reiter: "Drehplan" }
  ];
  var EIGENE_SEITEN = ["redaktion-fragen", "redaktion-drehplan"];
  var SP = { ansicht: "ss-baukasten-ansicht", interview: "ss-baukasten-interview", plan: "ss-baukasten-drehplan" };
  var TEXT = {
    laedt: "Katalog wird geladen …",
    fehlt: "Der Fragen- und Drehplan-Katalog ist noch nicht im Leitstand (Sammlung baukasten). Übertragen mit »261012 baukasten-nach-leitstand CL JB.mjs« an Schnitt 11.",
    fehler: "Katalog nicht geladen.",
    keinOrt: "Sonnenzeiten: kein Ort hinterlegt",
    lokal: "Bleibt auf diesem Gerät · als Markdown kopieren und ins Repo legen"
  };

  /* ---------- Hilfen ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lies(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function schreib(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function str(x) { return typeof x === "string" ? x : x == null ? "" : String(x); }
  function zahl(x, d) { x = Number(x); return isFinite(x) ? x : d; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function gemerkt() { var k = lies(SP.ansicht, null); return ansicht(k) ? k : "mappe"; }
  function ansicht(k) { for (var i = 0; i < ANSICHTEN.length; i++) if (ANSICHTEN[i].k === k) return ANSICHTEN[i]; return null; }
  function ansichtZuSeite(p) { for (var i = 0; i < ANSICHTEN.length; i++) if (ANSICHTEN[i].seite === p) return ANSICHTEN[i].k; return null; }
  function istGast(opt) { return !!(opt && opt.istGast); }
  function drei(opt) { return !!(opt && opt.redaktionDreiReiter); }

  /* Ort für die Sonnenzeiten: kommt nur aus dem Katalog, nie aus dem Code (die Seite ist öffentlich). Unvollständig oder außerhalb des Wertebereichs = null. */
  function ortAus(o) {
    if (!o || typeof o !== "object" || typeof o.lat !== "number" || typeof o.lon !== "number" || !isFinite(o.lat) || !isFinite(o.lon)) return null;
    var name = str(o.name).trim();
    return name && Math.abs(o.lat) <= 90 && Math.abs(o.lon) <= 180 ? { lat: o.lat, lon: o.lon, name: name } : null;
  }

  /* ---------- Katalog prüfen (nur bekannte Felder, alles als Text) ---------- */
  function katalogAus(roh) {
    if (!roh || roh.bauart !== BAUART) return null;
    var k = { stand: str(roh.stand), regeln: arr(roh.regeln).map(str), module: [], vorlagen: [], bausteine: [], ort: ortAus(roh.ort) };
    arr(roh.module).forEach(function (m) {
      if (!m || !m.id) return;
      k.module.push({ id: str(m.id), titel: str(m.titel), min: zahl(m.min, 0), zweck: str(m.zweck),
        fragen: arr(m.fragen).filter(function (q) { return q && q.id && q.text; }).map(function (q) {
          return { id: str(q.id), text: str(q.text), ziel: str(q.ziel), pflicht: !!q.pflicht, fuer: arr(q.fuer).map(str), rueck: str(q.rueck), nach: arr(q.nach).map(str), hinweis: str(q.hinweis) };
        }) });
    });
    arr(roh.vorlagen).forEach(function (v) { if (v && v.id) k.vorlagen.push({ id: str(v.id), titel: str(v.titel), person: str(v.person), module: arr(v.module).map(str) }); });
    arr(roh.dreh_bausteine).forEach(function (b) { if (b && b.id) k.bausteine.push({ id: str(b.id), titel: str(b.titel), min: Math.max(5, zahl(b.min, 30)), art: str(b.art) || "orga", notiz: str(b.notiz) }); });
    return k;
  }
  function docsAus(snap) {
    var d = snap && Array.isArray(snap.docs) ? snap.docs : arr(snap), out = {};
    d.forEach(function (x) { if (!x) return; var data = typeof x.data === "function" ? x.data() : x.data; if (x.id) out[x.id] = data; });
    return out;
  }

  /* ---------- Sonne (NOAA, Ort aus dem Katalog) ---------- */
  function sonne(datum, zen, ORT) {
    if (!ORT) return [null, null];
    var y = datum.getFullYear(), N = Math.floor((datum - new Date(y, 0, 0)) / 864e5), out = [];
    var r = function (x) { return x * Math.PI / 180; }, dg = function (x) { return x * 180 / Math.PI; };
    [true, false].forEach(function (auf) {
      var lngH = ORT.lon / 15, t = N + ((auf ? 6 : 18) - lngH) / 24, M = 0.9856 * t - 3.289;
      var L = (M + 1.916 * Math.sin(r(M)) + 0.020 * Math.sin(r(2 * M)) + 282.634) % 360;
      var RA = (dg(Math.atan(0.91764 * Math.tan(r(L)))) + 360) % 360; RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
      var sd = 0.39782 * Math.sin(r(L)), cd = Math.cos(Math.asin(sd));
      var cH = (Math.cos(r(zen)) - sd * Math.sin(r(ORT.lat))) / (cd * Math.cos(r(ORT.lat)));
      if (cH > 1 || cH < -1) { out.push(null); return; }
      var H = (auf ? 360 - dg(Math.acos(cH)) : dg(Math.acos(cH))) / 15;
      var UT = (((H + RA - 0.06571 * t - 6.622) - lngH) % 24 + 24) % 24;
      var d = new Date(Date.UTC(y, datum.getMonth(), datum.getDate())); d.setUTCMinutes(Math.round(UT * 60)); out.push(d);
    });
    return out;
  }
  function uhrBerlin(d) { return d ? d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }) : "–"; }
  function uhr(d) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function heute() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

  function kopiere(text, knopf) {
    var fertig = function () { var t = knopf.textContent; knopf.textContent = "Kopiert ✓"; setTimeout(function () { knopf.textContent = t; }, 1500); };
    var notfall = function () { var ta = el("textarea", "bk-notfall"); ta.value = text; knopf.parentNode.appendChild(ta); ta.select(); };
    try { navigator.clipboard.writeText(text).then(fertig, notfall); } catch (e) { notfall(); }
  }

  /* ================= Fragensammlung ================= */
  function Fragen(wurzel, K) {
    var modBy = {}; K.module.forEach(function (m) { modBy[m.id] = m; });
    var personen = []; function plus(p) { if (p && p !== "alle" && personen.indexOf(p) === -1) personen.push(p); }
    K.vorlagen.forEach(function (v) { plus(v.person); }); K.module.forEach(function (m) { m.fragen.forEach(function (q) { q.fuer.forEach(plus); }); });
    var S = lies(SP.interview, null);
    if (!S || typeof S !== "object" || !Array.isArray(S.order)) S = null;
    function passt(q, p) { return !q.fuer.length || q.fuer.indexOf("alle") !== -1 || q.fuer.indexOf(p) !== -1 || p === "Gruppe"; }
    function speichern() { schreib(SP.interview, S); }
    function alle(mid) { return (modBy[mid] ? modBy[mid].fragen : []).concat(arr(S.eigen).filter(function (e) { return e.mod === mid; })); }
    function vorlage(id) {
      var v = null; K.vorlagen.forEach(function (x) { if (x.id === id) v = x; }); if (!v) v = K.vorlagen[0];
      S = { vorlage: v ? v.id : "", person: v ? v.person : (personen[0] || ""), order: v ? v.module.filter(function (m) { return modBy[m]; }) : [], sel: {}, eigen: S ? arr(S.eigen) : [] };
      S.order.forEach(function (mid) { alle(mid).forEach(function (q) { if (passt(q, S.person)) S.sel[q.id] = true; }); });
      speichern(); zeichne();
    }
    function vorlageTitel() { for (var i = 0; i < K.vorlagen.length; i++) if (K.vorlagen[i].id === S.vorlage) return K.vorlagen[i].titel; return "eigene Auswahl"; }

    wurzel.innerHTML =
      '<div class="bk-kopf"><h2>Fragensammlung</h2><span class="bk-hint">Katalog ' + esc(K.stand) + ' · ' + K.module.length + ' Module · ' + TEXT.lokal + '</span></div>' +
      '<div class="bk-zwei"><section class="bk-karte"><div class="bk-leiste">' +
      '<label>Vorlage <select data-bk="vorlage">' + K.vorlagen.map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.titel) + '</option>'; }).join("") + '</select></label>' +
      '<label>Für <select data-bk="person">' + personen.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join("") + '</select></label></div>' +
      '<div class="bk-leiste"><button type="button" class="bk-knopf" data-bk="nurPerson">Nur Fragen für die Person</button><button type="button" class="bk-knopf" data-bk="alleAus">Alle abwählen</button></div>' +
      '<details class="bk-regeln"><summary>Regeln fürs Fragen (' + K.regeln.length + ')</summary><ol>' + K.regeln.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + '</ol></details>' +
      '<div data-bk="module"></div>' +
      '<div class="bk-eigen"><label>Eigene Frage <input type="text" data-bk="eigen" maxlength="400" placeholder="Frage eintippen …"></label>' +
      '<select data-bk="eigenMod" aria-label="Modul">' + K.module.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.id + " · " + m.titel) + '</option>'; }).join("") + '</select>' +
      '<button type="button" class="bk-knopf" data-bk="eigenPlus">Hinzufügen</button></div></section>' +
      '<section class="bk-karte bk-blatt"><div data-bk="blatt"></div><div class="bk-leiste"><button type="button" class="bk-knopf bk-haupt" data-bk="kopieren">Leitfaden als Markdown kopieren</button></div></section></div>';
    var $ = function (n) { return wurzel.querySelector('[data-bk="' + n + '"]'); };

    function zeichne() {
      $("vorlage").value = S.vorlage; $("person").value = S.person;
      var box = $("module"); box.innerHTML = "";
      K.module.forEach(function (m) {
        var qs = alle(m.id), n = qs.filter(function (q) { return S.sel[q.id]; }).length;
        var d = el("details", "bk-modul"); d.open = S.order.indexOf(m.id) !== -1;
        d.innerHTML = '<summary><span class="bk-mid">' + esc(m.id) + '</span><span class="bk-mt">' + esc(m.titel) + '</span><span class="bk-mm">' + n + ' gewählt · ~' + m.min + ' Min.</span></summary>' + (m.zweck ? '<div class="bk-zweck">' + esc(m.zweck) + '</div>' : "");
        qs.forEach(function (q) {
          var l = el("label", "bk-frage" + (passt(q, S.person) ? "" : " bk-fremd"));
          l.innerHTML = '<input type="checkbox"' + (S.sel[q.id] ? " checked" : "") + '><div><div class="bk-qt">' + esc(q.text) +
            (q.pflicht ? '<span class="bk-tag bk-pflicht">Pflicht</span>' : "") + (q.fuer && q.fuer.length ? '<span class="bk-tag">' + esc(q.fuer.join(", ")) + "</span>" : "") + (q.eigen ? '<span class="bk-tag">eigene</span>' : "") + "</div>" +
            (q.ziel ? '<div class="bk-meta">Ziel: ' + esc(q.ziel) + "</div>" : "") + (q.rueck ? '<div class="bk-rueck">Rückgriff: ' + esc(q.rueck) + "</div>" : "") +
            (q.nach && q.nach.length ? '<div class="bk-meta">Nachfragen: ' + esc(q.nach.join(" · ")) + "</div>" : "") + (q.hinweis ? '<div class="bk-warn">' + esc(q.hinweis) + "</div>" : "") + "</div>";
          l.querySelector("input").addEventListener("change", function (ev) {
            S.sel[q.id] = ev.target.checked;
            if (ev.target.checked && S.order.indexOf(m.id) === -1) { S.order.push(m.id); S.order.sort(function (a, b) { return K.module.indexOf(modBy[a]) - K.module.indexOf(modBy[b]); }); }
            speichern(); zeichne();
          });
          d.appendChild(l);
        });
        box.appendChild(d);
      });
      blatt();
    }
    function blatt() {
      var mods = S.order.filter(function (mid) { return alle(mid).some(function (q) { return S.sel[q.id]; }); });
      var min = 0, anz = 0, md = [], html = "";
      mods.forEach(function (mid) {
        var m = modBy[mid] || { id: mid, titel: "eigene", min: 0 }, qs = alle(mid).filter(function (q) { return S.sel[q.id]; });
        min += m.min; anz += qs.length;
        html += '<div class="bk-sm"><span class="bk-mid">' + esc(m.id) + '</span><span class="bk-mt">' + esc(m.titel) + '</span><span class="bk-ctrl">' +
          '<button type="button" data-mv="' + esc(mid) + '" data-d="-1" aria-label="Modul nach oben">↑</button><button type="button" data-mv="' + esc(mid) + '" data-d="1" aria-label="Modul nach unten">↓</button></span></div><ol class="bk-ql">';
        md.push("## " + m.id + " · " + m.titel, "");
        qs.forEach(function (q) {
          html += "<li>" + esc(q.text) + (q.hinweis ? '<span class="bk-n">⚠ ' + esc(q.hinweis) + "</span>" : "") + (q.nach && q.nach.length ? '<span class="bk-n">↳ ' + esc(q.nach.join(" · ")) + "</span>" : "") + "</li>";
          md.push("- " + q.text + (q.hinweis ? "  \n  ⚠ " + q.hinweis : "") + (q.nach && q.nach.length ? "  \n  ↳ " + q.nach.join(" · ") : ""));
        });
        html += "</ol>"; md.push("");
      });
      var kopf = "<h3>" + esc(S.person) + ' <span class="bk-hint">' + esc(vorlageTitel()) + '</span></h3><div class="bk-hint">' + anz + " Fragen · " + mods.length + (mods.length === 1 ? " Modul" : " Module") + " · ca. " + min + " Min.</div>";
      if (!mods.length) html = '<p class="bk-hint">Noch keine Frage gewählt — links eine Vorlage oder einzelne Fragen wählen.</p>';
      html += '<div class="bk-fuss">Vorher: Ton prüfen, Klappe, Einverständnis aufnehmen. Am Ende: Sperrwünsche notieren (Uhrzeit/Clip).</div>';
      $("blatt").innerHTML = kopf + html;
      md.unshift("# Leitfaden " + S.person + " — " + vorlageTitel(), anz + " Fragen · ca. " + min + " Min.", "");
      blatt.md = md.join("\n");
      Array.prototype.forEach.call($("blatt").querySelectorAll("[data-mv]"), function (b) {
        b.addEventListener("click", function () {
          var i = S.order.indexOf(b.getAttribute("data-mv")), j = i + Number(b.getAttribute("data-d"));
          if (i < 0 || j < 0 || j >= S.order.length) return; var t = S.order[i]; S.order[i] = S.order[j]; S.order[j] = t; speichern(); blatt();
        });
      });
    }
    $("vorlage").addEventListener("change", function (e) { vorlage(e.target.value); });
    $("person").addEventListener("change", function (e) { S.person = e.target.value; speichern(); zeichne(); });
    $("nurPerson").addEventListener("click", function () { K.module.forEach(function (m) { alle(m.id).forEach(function (q) { if (S.sel[q.id] && !passt(q, S.person)) S.sel[q.id] = false; }); }); speichern(); zeichne(); });
    $("alleAus").addEventListener("click", function () { S.sel = {}; speichern(); zeichne(); });
    $("eigenPlus").addEventListener("click", function () {
      var t = $("eigen").value.trim(); if (!t) return; var mod = $("eigenMod").value;
      S.eigen = arr(S.eigen); var id = mod + ".e" + (S.eigen.length + 1) + "-" + Date.now().toString(36);
      S.eigen.push({ id: id, mod: mod, text: t, eigen: true, fuer: [], nach: [] }); S.sel[id] = true;
      if (S.order.indexOf(mod) === -1) S.order.push(mod);
      $("eigen").value = ""; speichern(); zeichne();
    });
    $("kopieren").addEventListener("click", function (e) { kopiere(blatt.md || "", e.currentTarget); });
    if (S) { S.sel = S.sel || {}; S.order = S.order.filter(function (m) { return modBy[m] || arr(S.eigen).some(function (e) { return e.mod === m; }); }); zeichne(); } else vorlage(K.vorlagen.length ? K.vorlagen[0].id : "");
    return { markdown: function () { return blatt.md || ""; }, zustand: function () { return S; } };
  }

  /* ================= Drehplan ================= */
  function Drehplan(wurzel, K) {
    var ORT = K.ort;
    var BB = {}; K.bausteine.forEach(function (b) { BB[b.id] = b; });
    var P = lies(SP.plan, null);
    if (!P || typeof P !== "object" || !Array.isArray(P.rows)) P = { titel: "Neuer Drehplan", datum: heute(), zeit: "09:00", rows: [] };
    function speichern() { schreib(SP.plan, P); }
    var arten = []; K.bausteine.forEach(function (b) { if (arten.indexOf(b.art) === -1) arten.push(b.art); });

    wurzel.innerHTML =
      '<div class="bk-kopf"><h2>Drehplan</h2><span class="bk-hint">' + K.bausteine.length + " Bausteine · " + (ORT ? "Sonnenzeiten für " + esc(ORT.name) : TEXT.keinOrt) + " · " + TEXT.lokal + "</span></div>" +
      '<div class="bk-zwei bk-zwei-dreh"><section class="bk-karte"><h3>Bausteine</h3><p class="bk-hint">Antippen hängt ihn hinten an.</p><div class="bk-lib" data-bk="lib"></div></section>' +
      '<section class="bk-karte"><div class="bk-leiste">' +
      '<label class="bk-breit">Titel <input type="text" data-bk="titel" maxlength="120"></label>' +
      '<label>Datum <input type="date" data-bk="datum"></label><label>Beginn <input type="time" data-bk="zeit"></label></div>' +
      '<div class="bk-sonne" data-bk="sonne"></div>' +
      '<div class="bk-tabelle"><table><thead><tr><th>Zeit</th><th>Was</th><th>Min.</th><th>Wer</th><th><span class="bk-weg">Aktionen</span></th></tr></thead><tbody data-bk="plan"></tbody></table></div>' +
      '<p class="bk-hint">∥ = parallel zum vorigen Baustein (zweite Einheit, z. B. Drohne draußen und Frühstück drinnen).</p>' +
      '<div class="bk-leiste"><button type="button" class="bk-knopf bk-haupt" data-bk="kopieren">Drehplan als Markdown kopieren</button><button type="button" class="bk-knopf" data-bk="leeren">Plan leeren</button></div></section></div>';
    var $ = function (n) { return wurzel.querySelector('[data-bk="' + n + '"]'); };

    $("lib").innerHTML = arten.map(function (a) {
      return '<div class="bk-art"><div class="bk-artname">' + esc(a) + "</div>" + K.bausteine.filter(function (b) { return b.art === a; }).map(function (b) {
        return '<button type="button" class="bk-baustein" data-art="' + esc(b.art) + '" data-plus="' + esc(b.id) + '"><span class="bk-bt">' + esc(b.titel) + '</span><span class="bk-hint">' + b.min + " Min.</span>" + (b.notiz ? '<span class="bk-bn">' + esc(b.notiz) + "</span>" : "") + "</button>";
      }).join("") + "</div>";
    }).join("");
    Array.prototype.forEach.call($("lib").querySelectorAll("[data-plus]"), function (b) {
      b.addEventListener("click", function () { var x = BB[b.getAttribute("data-plus")]; if (!x) return; P.rows.push({ id: x.id, min: x.min, wer: "", par: false }); speichern(); zeichne(); });
    });

    function zeichne() {
      $("titel").value = P.titel; $("datum").value = P.datum; $("zeit").value = P.zeit;
      var dt = String(P.datum).split("-").map(Number), hz = String(P.zeit).split(":").map(Number);
      if (dt.length !== 3 || dt.some(isNaN)) { P.datum = heute(); dt = P.datum.split("-").map(Number); }
      if (hz.length < 2 || hz.some(isNaN)) { P.zeit = "09:00"; hz = [9, 0]; }
      var d0 = new Date(dt[0], dt[1] - 1, dt[2]), d1 = new Date(dt[0], dt[1] - 1, dt[2] + 1);
      var s0 = sonne(d0, 90.833, ORT), c0 = sonne(d0, 96, ORT), s1 = sonne(d1, 90.833, ORT), c1 = sonne(d1, 96, ORT);
      var tg = function (d) { return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); };
      var sonneTxt = !ORT ? TEXT.keinOrt : tg(d0) + ": Aufgang " + uhrBerlin(s0[0]) + " · Untergang " + uhrBerlin(s0[1]) + " · blaue Stunde bis " + uhrBerlin(c0[1]) +
        " — " + tg(d1) + ": Dämmerung " + uhrBerlin(c1[0]) + " · Aufgang " + uhrBerlin(s1[0]);
      $("sonne").textContent = sonneTxt;
      var t = new Date(dt[0], dt[1] - 1, dt[2], hz[0], hz[1]), vorStart = t, body = $("plan");
      /* Das kopierte Markdown verlässt die Seite (Repo, Notiz, Weitergabe): der Ortsname steht dort nie, nur auf dem Bildschirm der Editoren (Kopfzeile). */
      var md = ["# " + P.titel, "", (ORT ? "Sonne: " + sonneTxt : sonneTxt), "", "| Zeit | Baustein | Min. | Wer | Notiz |", "|---|---|---|---|---|"];
      body.innerHTML = "";
      P.rows.forEach(function (r, i) {
        var b = BB[r.id] || { titel: r.id, art: "orga", notiz: "" };
        var par = r.par && i > 0, start = par ? vorStart : t, ende = new Date(start.getTime() + r.min * 6e4);
        if (!par) { vorStart = start; t = ende; } else if (ende > t) t = ende;
        var tag = start.getDate() !== dt[2] ? ' <span class="bk-tagwechsel">' + esc(start.toLocaleDateString("de-DE", { weekday: "short" })) + "</span>" : "";
        var tr = el("tr", par ? "bk-par" : ""); tr.setAttribute("data-art", b.art);
        tr.innerHTML = '<td class="bk-zeit">' + (par ? "∥ " : "") + uhr(start) + "–" + uhr(ende) + tag + '</td><td><div class="bk-bt">' + esc(b.titel) + '</div><div class="bk-hint">' + esc(b.notiz) + "</div></td>" +
          '<td><input type="number" min="5" step="5" value="' + r.min + '" aria-label="Dauer in Minuten" data-i="' + i + '" data-f="min"></td>' +
          '<td><input type="text" value="' + esc(r.wer || "") + '" aria-label="Wer" maxlength="80" data-i="' + i + '" data-f="wer"></td>' +
          '<td class="bk-akt"><button type="button" data-i="' + i + '" data-a="par" aria-pressed="' + (r.par ? "true" : "false") + '" aria-label="parallel zum vorigen" title="parallel zum vorigen">∥</button>' +
          '<button type="button" data-i="' + i + '" data-a="hoch" aria-label="nach oben">↑</button><button type="button" data-i="' + i + '" data-a="runter" aria-label="nach unten">↓</button>' +
          '<button type="button" data-i="' + i + '" data-a="weg" aria-label="entfernen">×</button></td>';
        body.appendChild(tr);
        md.push("| " + (par ? "∥ " : "") + uhr(start) + "–" + uhr(ende) + " | " + b.titel + " | " + r.min + " | " + (r.wer || "") + " | " + b.notiz + " |");
      });
      if (!P.rows.length) body.innerHTML = '<tr><td colspan="5" class="bk-hint">Noch leer — Bausteine links antippen.</td></tr>';
      zeichne.md = md.join("\n");
      Array.prototype.forEach.call(body.querySelectorAll("input"), function (inp) {
        inp.addEventListener("change", function (e) {
          var i = Number(e.target.getAttribute("data-i")), f = e.target.getAttribute("data-f");
          P.rows[i][f] = f === "min" ? Math.max(5, Math.round(Number(e.target.value)) || 5) : e.target.value; speichern(); zeichne();
        });
      });
      Array.prototype.forEach.call(body.querySelectorAll("button[data-a]"), function (bt) {
        bt.addEventListener("click", function () {
          var i = Number(bt.getAttribute("data-i")), a = bt.getAttribute("data-a"), R = P.rows;
          if (a === "weg") R.splice(i, 1); else if (a === "par") R[i].par = !R[i].par;
          else { var j = i + (a === "hoch" ? -1 : 1); if (j >= 0 && j < R.length) { var x = R[i]; R[i] = R[j]; R[j] = x; } }
          speichern(); zeichne();
        });
      });
    }
    $("titel").addEventListener("change", function (e) { P.titel = e.target.value; speichern(); zeichne(); });
    $("datum").addEventListener("change", function (e) { if (e.target.value) { P.datum = e.target.value; speichern(); zeichne(); } });
    $("zeit").addEventListener("change", function (e) { if (e.target.value) { P.zeit = e.target.value; speichern(); zeichne(); } });
    $("leeren").addEventListener("click", function () { if (!P.rows.length || window.confirm("Plan leeren?")) { P.rows = []; speichern(); zeichne(); } });
    $("kopieren").addEventListener("click", function (e) { kopiere(zeichne.md || "", e.currentTarget); });
    P.rows = P.rows.filter(function (r) { return r && r.id; }).map(function (r) { return { id: str(r.id), min: Math.max(5, zahl(r.min, 30)), wer: str(r.wer), par: !!r.par }; });
    zeichne();
    return { markdown: function () { return zeichne.md || ""; }, zustand: function () { return P; } };
  }

  /* ================= Lauf: Abo der Sammlung baukasten, Zeichnen in die Flächen ================= */
  var lauf = null;
  function starteBaukasten(flaechen, db) {
    var L = { flaechen: flaechen, abo: null, aus: false, lage: "laedt", teile: {} };
    function fuellen(k, inhalt) { var f = L.flaechen[k]; if (f) { f.innerHTML = ""; f.appendChild(inhalt); } }
    function hinweis(t) { return el("p", "bk-hinweis", esc(t)); }
    function zeichne(K) {
      ["fragen", "drehplan"].forEach(function (k) {
        if (!L.flaechen[k]) return;
        if (!K) { fuellen(k, hinweis(L.lage === "fehler" ? TEXT.fehler : L.lage === "laedt" ? TEXT.laedt : TEXT.fehlt)); return; }
        var w = el("div", "bk-ansicht"); fuellen(k, w);
        try { L.teile[k] = k === "fragen" ? Fragen(w, K) : Drehplan(w, K); } catch (e) { try { console.error("[Baukasten] Zeichnen fehlgeschlagen", e); } catch (x) {} }
      });
    }
    zeichne(null);
    try {
      var abo = db.collection(SAMMLUNG).onSnapshot(function (snap) {
        if (L.aus) return;
        var K = katalogAus(docsAus(snap)[KATALOG]); L.lage = K ? "ok" : "leer"; L.katalog = K; zeichne(K);
      }, function () { if (L.aus) return; L.lage = "fehler"; zeichne(null); });
      L.abo = typeof abo === "function" ? abo : abo && typeof abo.unsubscribe === "function" ? function () { abo.unsubscribe(); } : null;
    } catch (e) { L.lage = "fehler"; zeichne(null); }
    L.abmelden = function () { L.aus = true; try { if (L.abo) L.abo(); } catch (e) {} for (var k in L.flaechen) if (L.flaechen[k]) L.flaechen[k].innerHTML = ""; };
    return L;
  }
  function abmeldenBaukasten() { if (lauf) { var L = lauf; lauf = null; L.abmelden(); } }

  /* ---------- ein Reiter: Umschalter über der Arbeitsmappe ---------- */
  var huelle = null;
  function waehle(k, fokus) {
    if (!ansicht(k)) k = "mappe"; schreib(SP.ansicht, k);
    if (!huelle) return;
    Array.prototype.forEach.call(huelle.querySelectorAll(".bk-tab"), function (b) {
      var an = b.getAttribute("data-bk-tab") === k; b.setAttribute("aria-selected", an ? "true" : "false"); b.tabIndex = an ? 0 : -1; if (an && fokus) b.focus();
    });
    Array.prototype.forEach.call(huelle.querySelectorAll(".bk-panel"), function (p) { p.hidden = p.getAttribute("data-bk-panel") !== k; });
  }
  function huelleBauen(seiteEl) {
    var w = el("div", "bk-huelle"), leiste = el("div", "bk-umschalter"), gew = gemerkt(), fl = {};
    leiste.setAttribute("role", "tablist"); leiste.setAttribute("aria-label", "Redaktion");
    ANSICHTEN.forEach(function (a) {
      var b = el("button", "bk-tab"); b.type = "button"; b.textContent = a.n; b.id = "bk-tab-" + a.k;
      b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "bk-panel-" + a.k); b.setAttribute("data-bk-tab", a.k);
      leiste.appendChild(b);
      var p = el("div", "bk-panel"); p.id = "bk-panel-" + a.k; p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", b.id); p.setAttribute("data-bk-panel", a.k);
      fl[a.k] = p;
    });
    leiste.addEventListener("click", function (ev) { var b = ev.target.closest ? ev.target.closest(".bk-tab") : null; if (b) waehle(b.getAttribute("data-bk-tab"), false); });
    leiste.addEventListener("keydown", function (ev) {
      var i = -1; ANSICHTEN.forEach(function (a, j) { if (a.k === gemerkt()) i = j; });
      var z = ev.key === "ArrowRight" ? i + 1 : ev.key === "ArrowLeft" ? i - 1 : ev.key === "Home" ? 0 : ev.key === "End" ? ANSICHTEN.length - 1 : null;
      if (z == null) return; ev.preventDefault(); waehle(ANSICHTEN[(z + ANSICHTEN.length) % ANSICHTEN.length].k, true);
    });
    w.appendChild(leiste); ANSICHTEN.forEach(function (a) { w.appendChild(fl[a.k]); });
    while (seiteEl.firstChild) seiteEl.removeChild(seiteEl.firstChild);
    seiteEl.appendChild(w); huelle = w; waehle(gew, false);
    return fl;
  }
  function huelleWeg() { if (huelle && huelle.parentNode) huelle.parentNode.removeChild(huelle); huelle = null; }

  /* ---------- Hülle um die Redaktions-Schnittstelle ---------- */
  var R = window.LEITSTAND_REDAKTION;
  var eingehaengt = false;
  if (EIN.an && R && typeof R.reiter === "function" && typeof R.starte === "function" && typeof R.seite === "function" && Array.isArray(R.SEITEN)) {
    var HAUPT = R.SEITE || "redaktion";
    var H = {};
    Object.keys(R).forEach(function (k) { H[k] = R[k]; });
    H.SEITEN = R.SEITEN.concat(EIGENE_SEITEN.filter(function (s) { return R.SEITEN.indexOf(s) === -1; }));
    H.reiter = function (opt) {
      var r = R.reiter(opt) || [];
      if (istGast(opt) || !drei(opt)) return r;
      return r.concat(ANSICHTEN.filter(function (a) { return a.seite; }).map(function (a) { return { seite: a.seite, name: a.reiter, ansicht: null }; }));
    };
    H.seite = function (p, opt) {
      var k = ansichtZuSeite(p);
      if (k) { if (drei(opt)) return p; waehle(k, false); return HAUPT; }
      var z = R.seite(p, opt);
      if (!drei(opt) && z === HAUPT && p !== HAUPT && R.SEITEN.indexOf(p) !== -1) waehle("mappe", false);   // #redaktion-experten u. a. → Arbeitsmappe
      return z;
    };
    H.starte = function (ziel, db, opt) {
      abmeldenBaukasten(); huelleWeg();
      if (istGast(opt)) return R.starte(ziel, db, opt);
      var zielFn = function (sk) { var e = typeof ziel === "function" ? ziel(sk) : ziel && ziel.nodeType === 1 ? (sk === HAUPT ? ziel : null) : ziel ? ziel[sk] : null; return e && e.seite ? e.seite : e; };
      var fl = {}, zielNeu = ziel;
      if (!drei(opt)) {
        var hs = zielFn(HAUPT);
        if (hs && hs.nodeType === 1) {
          fl = huelleBauen(hs);
          zielNeu = function (sk) { return sk === HAUPT ? fl.mappe : zielFn(sk); };
        }
      } else {
        fl = { fragen: zielFn("redaktion-fragen"), drehplan: zielFn("redaktion-drehplan") };
      }
      var g = R.starte(zielNeu, db, opt) || {};
      if (db && typeof db.collection === "function" && (fl.fragen || fl.drehplan)) lauf = starteBaukasten({ fragen: fl.fragen || null, drehplan: fl.drehplan || null }, db);
      return {
        abmelden: function () { abmeldenBaukasten(); if (g.abmelden) g.abmelden(); huelleWeg(); },
        zeigeAnsicht: function (k) { if (ansicht(k)) waehle(k, false); else { waehle("mappe", false); if (g.zeigeAnsicht) g.zeigeAnsicht(k); } },
        ansicht: function () { return g.ansicht ? g.ansicht() : null; },
        lage: function () { return g.lage ? g.lage() : "aus"; }
      };
    };
    H.abmelden = function () { abmeldenBaukasten(); if (R.abmelden) R.abmelden(); huelleWeg(); };
    window.LEITSTAND_REDAKTION = H;
    eingehaengt = true;
  }

  /* ---------- Prüfzugang ---------- */
  window.LEITSTAND_BAUKASTEN = {
    EIN: EIN, SAMMLUNG: SAMMLUNG, KATALOG: KATALOG, BAUART: BAUART, ANSICHTEN: ANSICHTEN, SEITEN: EIGENE_SEITEN.slice(),
    eingehaengt: function () { return eingehaengt; }, katalogAus: katalogAus, sonne: sonne, lauf: function () { return lauf; }, waehle: waehle
  };
})();
