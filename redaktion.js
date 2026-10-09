/* Redaktion — JBs redaktionelle Arbeitsmappe im Leitstand (Paket 5, Entscheidung E14; CL LES 07.10.2026). Nur für Admins.
   Zeichnet die drei Ansichten „Experten & Gespräche“, „Figuren (Beziehungsdiagramm + Steckbriefe)“ und „Dramaturgie“ aus der
   Datenbank-Sammlung `redaktion` — genau nach der Feldbeschreibung der Sammlung (Bauart 1; liegt im privaten Repo).
   Form nach E14: EIN Reiter „Redaktion“ mit Umschalter für drei Unteransichten — oder, mit der Einstellung
   redaktionDreiReiter: true im Optionen-Objekt (die Seite übergibt EINST), drei eigene Reiter.
   Regeln: Inhalt nur aus den Daten, nichts davon im Code. Jeder Text aus der Datenbank wird als Textknoten gesetzt (textContent,
   createTextNode), nie als HTML. Verweise nur mit http:, https:, mailto: (rel="noopener noreferrer"); jede andere Adresse als Text.
   Einträge mit nicht_mehr_in_quelle, einer anderen Bauart oder unbekannter Art blendet das Modul aus. Das Beziehungsdiagramm entsteht
   aus Knoten und Kanten als SVG im Browser — kein Bild, keine Bibliothek, keine Adresse von außen.
   Schnittstelle (window.LEITSTAND_REDAKTION):
     reiter(opt)              → sichtbare Reiter je Einstellung: [{ seite, name, ansicht }] (eins oder drei; für Gäste leer)
     SEITEN                   → alle Seiten-Schlüssel beider Formen (für PAGES und NUR_ADMIN): redaktion, redaktion-experten, …
     seite(p, opt)            → Seiten-Schlüssel der anderen Form auf die gültige abbilden (alte Adressen führen weiter)
     starte(ziel, db, opt)    → abonniert db.collection("redaktion").onSnapshot(cb, fehlerCb) und zeichnet; ziel = Element (ein Reiter),
                                function (seite) → Element oder { seite: Element }; gibt einen Griff { abmelden, zeigeAnsicht, ansicht, lage }
     abmelden()               → beendet das Abo und nimmt die Inhalte aus der Seite
     zeichne(ziel, eintraege, opt) → zeichnet einmal ohne Abo (eintraege: [{ id, data }] oder Dokumente mit data())
   Optionen: { redaktionDreiReiter: bool, istGast: bool, texte: { laedt, leer, fehler, zurueck, quelltexte } }. */
(function () {
  "use strict";

  var SAMMLUNG = "redaktion";
  var BAUART = 1;                 // die einzige Bauart (schema), die das Modul liest (Feldbeschreibung, Abschnitt Bauart)
  var NAME = "Redaktion";         // Reitername (Entscheidung E14)
  var SEITE = "redaktion";        // Seiten-Schlüssel des einen Reiters (Adresse #redaktion)
  var ANSICHTEN = [               // Namen aus dem Auftrag (Paket 5); Reihenfolge der Reiter der Vorlage
    { schluessel: "experten", name: "Experten & Gespräche", seite: "redaktion-experten" },
    { schluessel: "figuren", name: "Figuren (Beziehungsdiagramm + Steckbriefe)", seite: "redaktion-figuren" },
    { schluessel: "dramaturgie", name: "Dramaturgie", seite: "redaktion-dramaturgie" }
  ];
  var ARTEN = { mappe: 1, ansicht: 1, abschnitt: 1, absatz: 1, hinweis: 1, tabelle: 1, zeile: 1, liste: 1, punkt: 1, diagramm: 1,
    knoten: 1, kante: 1, steckbrief: 1, quelltext: 1 };
  var BLOCK_ARTEN = { absatz: 1, hinweis: 1, tabelle: 1, liste: 1, diagramm: 1, steckbrief: 1 };
  var MARKEN = { ok: 1, warnung: 1, neutral: 1 };
  var RICHTUNGEN = { LR: "LR", RL: "RL", TB: "TB", TD: "TB", BT: "BT" };
  var SPEICHER = "ss-redaktion-ansicht";   // zuletzt gewählte Unteransicht (nur dieses Gerät)

  /* Bedientexte: im Konzept nicht vorgesehen — nicht erfunden. Die Seite kann sie über opt.texte setzen, sobald es Wortlaute gibt. */
  var TEXTE = {
    laedt: "",        // WORTLAUT FEHLT: Ladezustand, bevor die Sammlung `redaktion` geantwortet hat
    leer: "",         // WORTLAUT FEHLT: Leerzustand (Sammlung leer, keine Einträge der Bauart 1, Ansicht ohne Einträge); Feldbeschreibung nennt „keine Daten“
    fehler: "",       // WORTLAUT FEHLT: Lade-Fehler (Fehler-Rückruf des Abos, keine Datenbank)
    zurueck: "",      // WORTLAUT FEHLT: Hinweis an einem zurückgehaltenen Teil; Platzhalter {zeile} {bis} {datei}. Vorschlag der Feldbeschreibung:
                      //   „nicht übertragen — steht in der Datei, Zeile {zeile}–{bis}“. Leer: nur der Zeilenbereich aus den Daten im gestrichelten Kasten
    quelltexte: ""    // WORTLAUT FEHLT: Überschrift über den Quelltext-Abschnitten einer Ansicht (Feldbeschreibung: „darunter, z. B. aufklappbar“)
  };

  var lauf = null;   // das eine laufende Abo der Seite
  var nr = 0;        // Zähler für eindeutige ids im Dokument (Umschalter, Pfeilspitzen)
  var SVG = "http://www.w3.org/2000/svg";

  /* ---- kleine Hilfen ---- */
  function el(tag, klasse) { var e = document.createElement(tag); if (klasse) e.className = klasse; return e; }
  function tn(t) { return document.createTextNode(t); }
  function txt(x) { return x == null ? "" : String(x); }
  function zahl(x) { return typeof x === "number" && isFinite(x) ? x : null; }
  function liste(x) { return Array.isArray(x) ? x : []; }
  function leeren(e) { while (e && e.firstChild) e.removeChild(e.firstChild); }
  function fuelle(vorlage, werte) {
    return String(vorlage).replace(/\{(zeile|bis|datei)\}/g, function (m, k) { return werte[k] == null ? "" : String(werte[k]); });
  }
  // Bezeichnung (einfacher Text laut Feldbeschreibung); kommt doch eine Liste, zählen nur die Wortlaute
  function bez(x) {
    if (x == null) return "";
    if (Array.isArray(x)) return x.map(function (s) { return s && typeof s === "object" ? txt(s.text) : txt(s); }).join("");
    return typeof x === "object" ? "" : String(x);
  }
  function hat(o, k) { return typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k); }
  function istPlatzhalter(x) { return !!x && typeof x === "object" && !Array.isArray(x) && x.zurueckgehalten === true; }
  function dreiReiter(opt) { return !!(opt && opt.redaktionDreiReiter); }
  function istGast(opt) {
    if (opt && opt.istGast) return true;
    try { var r = window.claude && typeof window.claude.rolle === "function" ? window.claude.rolle() : null; return !!(r && r.rolle === "gast"); }
    catch (e) { return false; }
  }
  function texte(opt) {
    var t = {}, o = opt && opt.texte;
    for (var k in TEXTE) t[k] = o && typeof o[k] === "string" ? o[k] : TEXTE[k];
    return t;
  }
  function gueltigeAnsicht(k) { for (var i = 0; i < ANSICHTEN.length; i++) if (ANSICHTEN[i].schluessel === k) return k; return null; }
  function gemerkt() { try { return gueltigeAnsicht(localStorage.getItem(SPEICHER)); } catch (e) { return null; } }
  function merke(k) { try { localStorage.setItem(SPEICHER, k); } catch (e) {} }

  /* ---- Stil: gekapselt unter .rd, nur Farben der Seite (CSS-Variablen aus index.html) ---- */
  // Paket 6 Teil 3a, KO-2 (Entscheidung LES 07.10.): Schriftgrößen als calc(Nrem / 17) — bei 17 px Wurzel (index.html) genau wie vorher, mit »Größerer Text«
  // größer; die Beschriftungen im Diagramm (.rd-dg-*) bleiben in px, weil das Diagramm mit festen Maßen gezeichnet ist
  var CSS = [
    ".rd{color:var(--ink);min-width:0;max-width:100%}",
    ".rd *,.rd *::before,.rd *::after{box-sizing:border-box}",
    ".rd p,.rd li,.rd td,.rd th,.rd summary,.rd h2,.rd h3,.rd h4,.rd blockquote{overflow-wrap:break-word}",
    ".rd .rd-karte{background:var(--material,var(--surface));-webkit-backdrop-filter:blur(16px) saturate(160%);backdrop-filter:blur(16px) saturate(160%);border:1px solid var(--material-edge,var(--line));box-shadow:var(--shadow,none);border-radius:14px;padding:18px 18px 16px;min-width:0}",
    ".rd .rd-karte+.rd-karte{margin-top:22px}",
    ".rd .rd-meldung{margin:0 0 12px;font-size:calc(13rem / 17);color:var(--muted)}",
    ".rd .rd-meldung:empty{display:none}",
    ".rd .rd-mappe{margin:0 0 14px;min-width:0}",
    ".rd .rd-mappe-kopf{font:600 calc(11rem / 17) var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);overflow-wrap:anywhere}",
    ".rd .rd-mappe-titel{display:block;font-family:var(--font-display);font-weight:650;font-size:calc(20rem / 17);line-height:1.2;letter-spacing:-.015em;margin:3px 0 4px}",
    ".rd .rd-mappe-text{margin:0;color:var(--muted);max-width:72ch}",
    ".rd .rd-stand{display:block;margin-top:4px;font:500 calc(11rem / 17) var(--font-mono);color:var(--muted);overflow-wrap:anywhere}",
    ".rd .rd-umschalter{display:flex;flex-wrap:wrap;gap:2px;margin:0 0 18px;padding:3px;border-radius:12px;background:color-mix(in srgb,var(--surface2) 70%,transparent);width:max-content;max-width:100%}",
    ".rd .rd-tab{font:600 calc(13rem / 17) var(--font-ui);color:var(--muted);background:none;border:0;padding:6px 14px;border-radius:9px;cursor:pointer;text-align:left;white-space:normal;max-width:100%}",
    ".rd .rd-tab[aria-selected=\"true\"]{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}",
    ".rd .rd-tab:hover:not([aria-selected=\"true\"]){color:var(--ink)}",
    ".rd .rd-tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}",
    ".rd .rd-tab:active{background-color:color-mix(in srgb,var(--accent) 20%,transparent)}",   // Paket 6, GP-M08: Druckzustand
    "@media (prefers-contrast:more){.rd .rd-karte{-webkit-backdrop-filter:none;backdrop-filter:none}}",   // Paket 6, GP-M05: »Kontrast erhöhen« ohne Unschärfe
    ".rd .rd-tab[aria-selected=\"true\"]{background:color-mix(in srgb,var(--ink) 16%,var(--surface2));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 40%,transparent)}",   // Paket 6, GP-S04: Wahl mit Fläche und Ring
    ".rd .rd-tab[aria-selected=\"true\"]:active{background-color:color-mix(in srgb,var(--accent) 20%,transparent)}",   // GP-M08 auch am gewählten
    "@media (pointer:coarse){.rd .rd-tab{min-height:44px}}",   // Paket 6, GP-S03: Tippfläche am iPhone
    "@media (prefers-reduced-transparency:reduce){.rd .rd-karte{-webkit-backdrop-filter:none;backdrop-filter:none;background:var(--surface)}}",   // Paket 6, GP-S06
    ".rd .rd-ansicht[hidden]{display:none}",
    ".rd .rd-abschnitt+.rd-abschnitt{margin-top:22px}",
    ".rd .rd-h{display:block;font-family:var(--font-display);font-weight:650;font-size:calc(17rem / 17);line-height:1.3;letter-spacing:-.015em;margin:0 0 10px}",
    ".rd .rd-p{margin:0 0 10px;max-width:72ch}",
    ".rd .rd-unterzeile{margin:-4px 0 10px;font-size:calc(13rem / 17);color:var(--muted);max-width:72ch}",
    ".rd .rd-hinweis{margin:12px 0;padding:10px 12px;border-left:3px solid var(--signal);border-radius:0 8px 8px 0;background:color-mix(in srgb,var(--signal) 13%,transparent);font-size:calc(14rem / 17);overflow-wrap:anywhere}",
    ".rd .rd-scroll{overflow-x:auto;max-width:100%;margin:8px 0 12px}",
    ".rd table.rd-tabelle{border-collapse:collapse;width:100%;min-width:calc(544rem / 17);font-size:calc(13.5rem / 17)}",
    ".rd .rd-tabelle th,.rd .rd-tabelle td{text-align:left;vertical-align:top;padding:8px 10px 8px 0;border-bottom:1px solid var(--line)}",
    ".rd .rd-tabelle th{font:600 calc(11rem / 17) var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}",
    ".rd .rd-liste{margin:6px 0 12px;padding-left:22px}",
    ".rd .rd-liste li{margin:4px 0;max-width:72ch}",
    ".rd .rd-pt+.rd-pt{margin-top:4px}",
    ".rd code{font-family:var(--font-mono);font-size:.86em}",
    ".rd a{color:var(--accent)}",
    ".rd .rd-adresse{font-family:var(--font-mono);font-size:.86em;color:var(--muted);overflow-wrap:anywhere}",
    ".rd .rd-marke{display:inline-block;max-width:100%;padding:1px 8px;border-radius:999px;font:600 calc(11rem / 17)/1.6 var(--font-ui);background:color-mix(in srgb,var(--ink) 10%,transparent);color:var(--ink)}",   // Paket 6, GP-S05: neutral statt Akzent (Akzent nur für Bedienbares)
    ".rd .rd-marke-ok{background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok)}",
    ".rd .rd-marke-warnung{background:color-mix(in srgb,var(--signal) 8%,transparent);color:var(--signal)}",   // Paket 6, GP-M04: Fläche 8 % statt 16 % — Schrift 5,04:1 statt 4,46:1
    ".rd .rd-zitat{margin:8px 0 10px;padding:2px 0 2px 12px;border-left:3px solid var(--line);font-style:italic}",
    ".rd .rd-hr{border:0;border-top:1px solid var(--line);margin:14px 0}",
    ".rd .rd-zurueck{display:inline-block;padding:1px 8px;border:1px dashed var(--muted);border-radius:6px;font:500 calc(12rem / 17) var(--font-mono);color:var(--muted)}",
    ".rd div.rd-zurueck{display:block;width:max-content;max-width:100%;margin:8px 0}",
    ".rd .rd-steckbriefe{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(calc(256rem / 17),100%),1fr));gap:12px;margin:8px 0 12px}",
    ".rd .rd-steckbrief{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px 14px;min-width:0}",
    ".rd .rd-lbl{display:block;margin-bottom:2px;font:600 calc(11rem / 17) var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}",
    ".rd .rd-tabelle th{font:600 calc(12rem / 17)/1.3 var(--font-ui)}.rd .rd-tabelle th,.rd .rd-lbl,.rd .rd-mappe-kopf{text-transform:none;letter-spacing:normal}",   // Paket 6, GP-S08: ohne Versalien
    ".rd .rd-name{margin:0 0 4px;font-size:calc(15rem / 17);font-weight:650}",
    ".rd .rd-steckbrief .rd-p{margin:0;font-size:calc(14rem / 17)}",
    ".rd .rd-diagramm{margin:8px 0 14px;padding:12px;background:var(--surface);border:1px solid var(--line);border-radius:10px;overflow-x:auto;max-width:100%}",
    ".rd svg.rd-dg{display:block;height:auto;font-family:var(--font-ui)}",
    ".rd .rd-dg-box{fill:var(--surface2);stroke:var(--accent);stroke-width:1.2}",
    ".rd .rd-dg-name{fill:var(--ink);font-size:13px;font-weight:600}",
    ".rd .rd-dg-zeile{fill:var(--muted);font-size:12px}",
    ".rd .rd-dg-linie{fill:none;stroke:var(--muted);stroke-width:1.5}",
    ".rd .rd-dg-gestrichelt{stroke-dasharray:6 4}",
    ".rd .rd-dg-spitze{fill:var(--muted)}",
    ".rd .rd-dg-beschr{fill:var(--muted);font-size:11px;paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round}",
    ".rd .rd-quelle{margin:12px 0 6px;font:500 calc(11rem / 17) var(--font-mono);color:var(--muted);overflow-wrap:anywhere}",
    ".rd .rd-quelle:first-child{margin-top:0}",
    ".rd .rd-qt{border-top:1px solid var(--line);padding:6px 0}",
    ".rd .rd-qt>summary{cursor:pointer;font-weight:600}",
    ".rd .rd-qt-inhalt{padding:6px 0 4px 14px}",
    ".rd .rd-ebene-2{margin-left:12px}.rd .rd-ebene-3{margin-left:24px}.rd .rd-ebene-4{margin-left:36px}",
    "@media (max-width:600px){.rd .rd-karte{padding:14px 12px 12px}.rd .rd-qt-inhalt{padding-left:8px}.rd .rd-ebene-2{margin-left:6px}.rd .rd-ebene-3{margin-left:12px}.rd .rd-ebene-4{margin-left:18px}}"
  ].join("\n");
  function stil() {
    if (document.getElementById("rd-stil")) return;
    var s = document.createElement("style"); s.id = "rd-stil"; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---- Daten ordnen: nur gültige Einträge der Bauart 1, ohne nicht_mehr_in_quelle; Zusammenhänge nur über eltern ---- */
  function ausgeblendet(v) { return v.nicht_mehr_in_quelle != null && v.nicht_mehr_in_quelle !== false; }
  function nachReihenfolge(a, b) {
    var x = zahl(a.v.reihenfolge), y = zahl(b.v.reihenfolge);
    if (x == null) x = Infinity; if (y == null) y = Infinity;
    if (x !== y) return x < y ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }
  function ordne(docs) {
    var alle = [], kinder = Object.create(null);
    liste(docs).forEach(function (d) {
      if (!d || typeof d !== "object") return;
      var v; try { v = typeof d.data === "function" ? d.data() : d.data; } catch (e) { v = null; }
      if (!v || typeof v !== "object" || v.schema !== BAUART || !hat(ARTEN, v.art) || ausgeblendet(v)) return;
      if (typeof d.id !== "string" || !d.id) return;
      alle.push({ id: d.id, v: v });
    });
    alle.forEach(function (e) { var p = typeof e.v.eltern === "string" ? e.v.eltern : ""; (kinder[p] = kinder[p] || []).push(e); });
    for (var k in kinder) kinder[k].sort(nachReihenfolge);
    var mappen = alle.filter(function (e) { return e.v.art === "mappe"; }).sort(nachReihenfolge);
    return {
      anzahl: alle.length,
      mappe: mappen[0] || null,
      // Kinder eines Eintrags in Reihenfolge; art = Text oder Menge von Arten; nur Einträge derselben Ansicht
      kinder: function (id, art, ansicht) {
        return (kinder[id] || []).filter(function (e) {
          return (typeof art === "string" ? e.v.art === art : hat(art, e.v.art)) && e.v.ansicht === ansicht;
        });
      },
      ansicht: function (key) {
        return alle.filter(function (e) { return e.v.art === "ansicht" && e.v.ansicht === key; }).sort(nachReihenfolge)[0] || null;
      }
    };
  }

  /* ---- Textfolge: jedes Stück als Textknoten, Merkmale als Auszeichnung ---- */
  function sichererLink(adresse) {
    var u = String(adresse);
    if (/[\s\u0000-\u001f\u007f-\u009f]/.test(u)) return null;          // Leer- und Steuerzeichen: nie ein Verweis
    var m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(u); if (!m) return null;  // ohne Schema (relativ): als Text
    var s = m[1].toLowerCase();
    if (s !== "http" && s !== "https" && s !== "mailto") return null;
    if (s !== "mailto" && !/^https?:\/\/[^\/?#\\]/i.test(u)) return null;
    var a = document.createElement("a"); a.href = u;
    if (a.protocol !== "http:" && a.protocol !== "https:" && a.protocol !== "mailto:") return null;
    a.rel = "noopener noreferrer"; a.target = "_blank";
    return a;
  }
  function huelle(tag, inhalt) { var e = el(tag); e.appendChild(inhalt); return e; }
  function stueck(s) {
    var t = txt(s.text), k = tn(t);
    if (s.code === true) k = huelle("code", k);
    if (s.kursiv === true) k = huelle("em", k);
    if (s.fett === true) k = huelle("strong", k);
    if (s.durch === true) k = huelle("s", k);
    if (s.link != null && s.link !== "") {
      var a = sichererLink(s.link);
      if (a) { a.appendChild(k); k = a; }
      else if (String(s.link) !== t) {   // andere Adresse: als Text hinter dem Wortlaut (Feldbeschreibung, Feld link)
        var f = el("span", "rd-ohne-verweis"), ad = el("span", "rd-adresse");
        ad.textContent = String(s.link); f.appendChild(k); f.appendChild(tn(" ")); f.appendChild(ad); k = f;
      }
    }
    if (s.marke != null && s.marke !== "") {
      var m = el("span", "rd-marke rd-marke-" + (hat(MARKEN, s.marke) ? s.marke : "neutral")); m.appendChild(k); k = m;
    }
    return k;
  }
  function textfolge(ziel, folge) {
    if (typeof folge === "string") { ziel.appendChild(tn(folge)); return ziel; }
    liste(folge).forEach(function (s) {
      if (s == null) return;
      ziel.appendChild(typeof s === "object" ? stueck(s) : tn(String(s)));
    });
    return ziel;
  }

  /* Platzhalter eines zurückgehaltenen Teils: nie ein Text, nur der Zeilenbereich aus den Daten (und der Hinweis, sobald es ihn gibt) */
  function platzhalter(tag, p, datei, T) {
    var e = el(tag, "rd-zurueck"), z = zahl(p.zeile), b = zahl(p.bis);
    e.setAttribute("data-zeile", z == null ? "" : String(z));
    e.setAttribute("data-bis", b == null ? "" : String(b));
    var bereich = z == null ? "" : (b == null || b === z ? String(z) : z + "–" + b);
    e.textContent = T.zurueck ? fuelle(T.zurueck, { zeile: z, bis: b, datei: datei }) : bereich;
    return e;
  }

  /* ---- Ansichten ---- */
  function meldung(T, lage) {
    var m = el("p", "rd-meldung"); m.setAttribute("role", "status");
    m.textContent = lage === "laedt" ? T.laedt : lage === "leer" ? T.leer : lage === "fehler" ? T.fehler : "";
    return m;
  }
  function mappeKopf(m) {
    var k = el("header", "rd-mappe"), v = m.v; k.setAttribute("data-rd-id", m.id);
    if (bez(v.kopfzeile)) { var z = el("div", "rd-mappe-kopf"); z.textContent = bez(v.kopfzeile); k.appendChild(z); }
    if (bez(v.titel)) { var h = el("h2", "rd-mappe-titel"); h.textContent = bez(v.titel); k.appendChild(h); }
    if (v.text != null) k.appendChild(textfolge(el("p", "rd-mappe-text"), v.text));
    if (bez(v.stand)) { var s = el("span", "rd-stand"); s.textContent = bez(v.stand); k.appendChild(s); }
    return k;
  }
  function tabelle(o, t, key) {
    var w = el("div", "rd-scroll"), tab = el("table", "rd-tabelle"), sp = liste(t.v.spalten);
    if (sp.length) {
      var kopf = el("thead"), tr = el("tr");
      sp.forEach(function (s) { var th = el("th"); th.scope = "col"; th.textContent = bez(s); tr.appendChild(th); });
      kopf.appendChild(tr); tab.appendChild(kopf);
    }
    var rumpf = el("tbody");
    o.kinder(t.id, "zeile", key).forEach(function (z) {
      var r = el("tr"), zellen = liste(z.v.zellen), n = Math.max(sp.length, zellen.length);
      r.setAttribute("data-rd-id", z.id);
      for (var i = 0; i < n; i++) r.appendChild(textfolge(el("td"), zellen[i]));
      rumpf.appendChild(r);
    });
    tab.appendChild(rumpf); w.appendChild(tab);
    return w;
  }
  function vorlageListe(o, l, key) {
    var num = l.v.nummeriert === true, e = el(num ? "ol" : "ul", "rd-liste");
    o.kinder(l.id, "punkt", key).forEach(function (p) {
      var li = el("li"), n = zahl(p.v.nummer); li.setAttribute("data-rd-id", p.id);
      if (num && n != null) li.value = n;
      e.appendChild(textfolge(li, p.v.text));
    });
    return e;
  }
  function steckbrief(s) {
    var a = el("article", "rd-steckbrief"); a.setAttribute("data-rd-id", s.id);
    if (bez(s.v.marke)) { var m = el("span", "rd-lbl"); m.textContent = bez(s.v.marke); a.appendChild(m); }
    var h = el("h4", "rd-name"); h.textContent = bez(s.v.name); a.appendChild(h);
    a.appendChild(textfolge(el("p", "rd-p"), s.v.text));
    return a;
  }
  function block(o, b, key) {
    var v = b.v, e;
    if (v.art === "absatz") e = textfolge(el("p", v.form === "unterzeile" ? "rd-unterzeile" : "rd-p"), v.text);
    else if (v.art === "hinweis") e = textfolge(el("div", "rd-hinweis"), v.text);
    else if (v.art === "tabelle") e = tabelle(o, b, key);
    else if (v.art === "liste") e = vorlageListe(o, b, key);
    else if (v.art === "diagramm") e = diagramm(o, b, key);
    else return null;
    e.setAttribute("data-rd-id", b.id);
    return e;
  }
  function abschnitt(o, s, key) {
    var sec = el("section", "rd-abschnitt"), gitter = null;
    sec.setAttribute("data-rd-id", s.id);
    if (s.v.ueberschrift != null && bez(s.v.ueberschrift) !== "") { var h = el("h3", "rd-h"); h.textContent = bez(s.v.ueberschrift); sec.appendChild(h); }
    o.kinder(s.id, BLOCK_ARTEN, key).forEach(function (b) {
      if (b.v.art === "steckbrief") {   // Steckbriefe nebeneinander wie in der Vorlage (Karten im Raster)
        if (!gitter) { gitter = el("div", "rd-steckbriefe"); sec.appendChild(gitter); }
        gitter.appendChild(steckbrief(b)); return;
      }
      gitter = null;
      var e = block(o, b, key); if (e) sec.appendChild(e);
    });
    return sec;
  }

  /* Quelltext: Abschnitte der Markdown-Quellen, aufklappbar unter der Ansicht */
  function qListe(b, datei, T) {
    var num = b.nummeriert === true, e = el(num ? "ol" : "ul", "rd-liste");
    liste(b.punkte).forEach(function (p) {
      if (!p || typeof p !== "object") return;
      var li = el("li"), n = zahl(p.nummer);
      if (num && n != null) li.value = n;
      if (p.zurueckgehalten === true) li.appendChild(platzhalter("span", p, datei, T));
      else liste(p.teile).forEach(function (t) {
        if (!t || typeof t !== "object") return;
        li.appendChild(textfolge(t.form === "zitat" ? el("blockquote", "rd-zitat") : el("div", "rd-pt"), t.text));
      });
      e.appendChild(li);
    });
    return e;
  }
  function qTabelle(b, datei, T) {
    var w = el("div", "rd-scroll"), tab = el("table", "rd-tabelle"), sp = liste(b.spalten), rumpf = el("tbody");
    if (sp.length) {
      var kopf = el("thead"), tr = el("tr");
      sp.forEach(function (s) { var th = el("th"); th.scope = "col"; tr.appendChild(textfolge(th, s)); });
      kopf.appendChild(tr); tab.appendChild(kopf);
    }
    liste(b.zeilen).forEach(function (z) {
      var tr = el("tr");
      if (istPlatzhalter(z)) { var td = el("td"); td.colSpan = Math.max(1, sp.length); td.appendChild(platzhalter("span", z, datei, T)); tr.appendChild(td); }
      else if (Array.isArray(z)) { for (var i = 0, n = Math.max(sp.length, z.length); i < n; i++) tr.appendChild(textfolge(el("td"), z[i])); }
      else return;
      rumpf.appendChild(tr);
    });
    tab.appendChild(rumpf); w.appendChild(tab);
    return w;
  }
  function qBlock(b, datei, T) {
    if (!b || typeof b !== "object") return null;
    if (b.form === "zurueckgehalten" || b.zurueckgehalten === true) return platzhalter("div", b, datei, T);
    if (b.form === "absatz") return textfolge(el("p", "rd-p"), b.text);
    if (b.form === "zitat") return textfolge(el("blockquote", "rd-zitat"), b.text);
    if (b.form === "liste") return qListe(b, datei, T);
    if (b.form === "tabelle") return qTabelle(b, datei, T);
    if (b.form === "trennlinie") return el("hr", "rd-hr");
    return null;   // unbekannte Form (gibt es in Bauart 1 nicht): nichts zeichnen
  }
  function quelltext(L, q, datei) {
    var v = q.v, ebene = Math.max(0, Math.min(4, Math.round(zahl(v.ebene) || 0)));
    var d = el("details", "rd-qt rd-ebene-" + ebene), s = el("summary", "rd-qt-kopf"), inhalt = el("div", "rd-qt-inhalt");
    d.setAttribute("data-rd-id", q.id);
    if (L.offen[q.id]) d.open = true;
    d.addEventListener("toggle", function () { if (d.open) L.offen[q.id] = true; else delete L.offen[q.id]; });
    if (istPlatzhalter(v.ueberschrift)) s.appendChild(platzhalter("span", v.ueberschrift, datei, L.T));
    else if (v.ueberschrift != null) textfolge(s, v.ueberschrift);
    else s.appendChild(tn(datei));   // Text vor der ersten Überschrift (ebene 0): die Datei aus den Daten
    d.appendChild(s);
    liste(v.bloecke).forEach(function (b) { var e = qBlock(b, datei, L.T); if (e) inhalt.appendChild(e); });
    d.appendChild(inhalt);
    return d;
  }
  function quelltexte(L, qt) {
    var k = el("div", "rd-karte rd-quellen"), letzte = null;
    if (L.T.quelltexte) { var h = el("h3", "rd-h"); h.textContent = L.T.quelltexte; k.appendChild(h); }
    qt.forEach(function (q) {
      var datei = q.v.quelle && typeof q.v.quelle === "object" ? txt(q.v.quelle.datei) : "", stand = bez(q.v.stand);
      if (datei + "\n" + stand !== letzte) {   // Datei und Stand einmal je Quelle (aus den Daten)
        letzte = datei + "\n" + stand;
        var z = el("p", "rd-quelle"); z.textContent = datei + (datei && stand ? " · " : "") + stand; k.appendChild(z);
      }
      k.appendChild(quelltext(L, q, datei));
    });
    return k;
  }

  // Gibt es etwas zu zeigen? (Kopf der Mappe oder eine Ansicht mit Abschnitten bzw. Quelltexten; verwaiste Einträge zählen nicht)
  function hatInhalt(o) {
    if (o.mappe) return true;
    return ANSICHTEN.some(function (a) {
      var x = o.ansicht(a.schluessel);
      return !!x && (o.kinder(x.id, "abschnitt", a.schluessel).length > 0 || o.kinder(x.id, "quelltext", a.schluessel).length > 0);
    });
  }
  function ansichtPanel(L, o, key) {
    var p = el("div", "rd-ansicht"); p.setAttribute("data-rd-ansicht", key);
    if (!o) return p;
    var a = o.ansicht(key);
    var abschnitte = a ? o.kinder(a.id, "abschnitt", key) : [], qt = a ? o.kinder(a.id, "quelltext", key) : [];
    if (a) p.setAttribute("data-rd-id", a.id);
    if (!abschnitte.length && !qt.length) { p.setAttribute("data-lage", "leer"); p.appendChild(meldung(L.T, "leer")); return p; }
    if (abschnitte.length) {
      var k = el("div", "rd-karte rd-vorlage");
      abschnitte.forEach(function (s) { k.appendChild(abschnitt(o, s, key)); });
      p.appendChild(k);
    }
    if (qt.length) p.appendChild(quelltexte(L, qt));
    return p;
  }

  /* ---- Beziehungsdiagramm als SVG aus Knoten und Kanten ----
     Lage aus den Daten (knoten.lage = Spalte/Zeile, abgeleiteter Vorschlag), bei einem Kreis (lage null) selbst geordnet. Gerechnet wird in
     einer logischen Ebene (u = entlang der Spalten, v = quer); erst am Ende je richtung (LR, RL, TB/TD, BT) ins Bild gedreht. Kanten sind
     Bézier-Kurven; versperrt ein anderer Knoten den Weg, weicht die Kurve quer aus. Texte nur als Textknoten (tspan), umbrochen nur zur Anzeige. */
  var MASS = { padX: 12, padY: 9, zeile: 17, breiteMax: 240, breiteMin: 80, randAussen: 16, beschrMax: 180, beschrZeile: 13 };
  var messer = null;
  function schrift() {
    try { return getComputedStyle(document.documentElement).getPropertyValue("--font-ui").trim() || "system-ui, sans-serif"; }
    catch (e) { return "system-ui, sans-serif"; }
  }
  // Breite eines Texts in Pixeln (art: "name" 600 13px, "zeile" 400 12px, "beschr" 400 11px — wie im Stil unten)
  function messen(t, art, fam) {
    var f = art === "name" ? "600 13px " : art === "beschr" ? "400 11px " : "400 12px ";
    try {
      if (!messer) messer = document.createElement("canvas").getContext("2d");
      if (messer) { messer.font = f + fam; var w = messer.measureText(t).width; if (w > 0 || !t) return w; }
    } catch (e) {}
    return t.length * (art === "name" ? 7.6 : art === "beschr" ? 6.2 : 6.8);   // Schätzung, falls es kein Canvas gibt
  }
  // Zeile auf höchstens max Pixel umbrechen (nur Anzeige; der Wortlaut bleibt vollständig)
  function umbrechen(t, art, fam, max) {
    var roh = [], z = "";
    t.split(" ").forEach(function (w) {
      var probe = z ? z + " " + w : w;
      if (!z || messen(probe, art, fam) <= max) z = probe; else { roh.push(z); z = w; }
    });
    roh.push(z);
    var aus = [];
    roh.forEach(function (r) {
      // längstes passendes Anfangsstück: erst die Länge verdoppeln, bis ein Stück nicht mehr passt, dann dazwischen halbieren. Gemessen werden nur
      // Stücke bis etwa zur doppelten Zeilenlänge, nie der ganze Rest — der Aufwand wächst so nur noch mit der Länge des Worts (Befunde R-05, N-03)
      while (r.length > 1) {
        var gut = 0, schlecht = 0, k = 1;
        while (!schlecht && gut < r.length) { var m = Math.min(k, r.length); if (messen(r.slice(0, m), art, fam) <= max) { gut = m; k *= 2; } else schlecht = m; }
        if (!schlecht) break;   // der Rest passt ganz in die Zeile
        var lo = gut + 1, hi = schlecht - 1, n = Math.max(gut, 1);
        while (lo <= hi) { var mid = (lo + hi) >> 1; if (messen(r.slice(0, mid), art, fam) <= max) { n = mid; lo = mid + 1; } else hi = mid - 1; }
        aus.push(r.slice(0, n)); r = r.slice(n);
      }
      aus.push(r);
    });
    // Leerzeichen an der Bruchstelle bleibt am Zeilenende stehen: aneinandergereiht ergeben die Zeilen wieder genau den Wortlaut
    var pos = 0;
    return aus.map(function (z) { pos += z.length; if (t.charAt(pos) === " ") { pos++; return z + " "; } return z; });
  }
  function sv(tag, attr) { var e = document.createElementNS(SVG, tag); for (var k in attr) e.setAttribute(k, attr[k]); return e; }
  function r1(x) { return Math.round(x * 10) / 10; }
  // Punkt auf der Bézier-Kurve (vier Punkte) bei t
  function bezier(p, t) {
    var s = 1 - t, a = s * s * s, b = 3 * s * s * t, c = 3 * s * t * t, d = t * t * t;
    return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
  }
  // Lage selbst bestimmen (bei einem Kreis ist lage null): Spalte = längster Weg entlang der Kanten, Kreise in Knoten-Reihenfolge aufgebrochen
  function eigeneLage(N, kanten, idx) {
    var ein = N.map(function () { return 0; }), aus = N.map(function () { return []; }), fertig = N.map(function () { return false; }), rest = N.length;
    kanten.forEach(function (k) { var a = idx[k.v.von], b = idx[k.v.nach]; if (!a || !b || a === b) return; aus[a.i].push(b.i); ein[b.i]++; });
    N.forEach(function (n) { n.sp = 0; });
    while (rest > 0) {
      var frei = [], i;
      for (i = 0; i < N.length; i++) if (!fertig[i] && ein[i] <= 0) frei.push(i);
      if (!frei.length) for (i = 0; i < N.length; i++) if (!fertig[i]) { frei.push(i); break; }
      frei.forEach(function (j) {
        fertig[j] = true; rest--;
        aus[j].forEach(function (z) { if (!fertig[z]) { ein[z]--; if (N[z].sp < N[j].sp + 1) N[z].sp = N[j].sp + 1; } });
      });
    }
    var je = {};
    N.forEach(function (n) { je[n.sp] = (je[n.sp] || 0) + 1; n.ze = je[n.sp] - 1; });
  }
  function diagramm(o, d, key) {
    var fig = el("figure", "rd-diagramm");
    var kn = o.kinder(d.id, "knoten", key), ka = o.kinder(d.id, "kante", key);
    var richtung = hat(RICHTUNGEN, d.v.richtung) ? RICHTUNGEN[d.v.richtung] : "LR", hor = richtung === "LR" || richtung === "RL", fam = schrift(), n0 = ++nr;
    // Knoten messen: erste Zeile Name (fett), weitere Zeilen Rolle o. Ä.
    var N = kn.map(function (k, i) {
      var zl = Array.isArray(k.v.zeilen) ? k.v.zeilen.map(bez) : [bez(k.v.zeilen)], zeilen = [], w = 0;
      if (!zl.length) zl = [""];
      zl.forEach(function (z, j) { umbrechen(z, j === 0 ? "name" : "zeile", fam, MASS.breiteMax).forEach(function (t) { zeilen.push({ t: t, art: j === 0 ? "name" : "zeile" }); }); });
      zeilen.forEach(function (z) { w = Math.max(w, messen(z.t.replace(/ $/, ""), z.art, fam)); });
      return { id: k.id, i: i, k: k, zl: zl, zeilen: zeilen, w: Math.max(MASS.breiteMin, Math.ceil(w) + 2 * MASS.padX), h: zeilen.length * MASS.zeile + 2 * MASS.padY };
    });
    var idx = Object.create(null); N.forEach(function (n) { idx[n.id] = n; });
    // Lage aus den Daten, wenn jeder Knoten eine eigene ganze Spalte/Zeile hat; sonst selbst ordnen
    var belegt = Object.create(null), ok = N.length > 0 && N.every(function (n) {
      var l = n.k.v.lage; if (!l || typeof l !== "object") return false;
      var s = zahl(l.spalte), z = zahl(l.zeile);
      if (s == null || z == null || s < 0 || z < 0 || s % 1 || z % 1 || belegt[s + "/" + z]) return false;
      belegt[s + "/" + z] = 1; n.sp = s; n.ze = z; return true;
    });
    if (!ok) eigeneLage(N, ka, idx);
    // Spalten und Zeilen verdichten (keine leeren Spalten)
    var sp = [], ze = [];
    N.forEach(function (n) { if (sp.indexOf(n.sp) === -1) sp.push(n.sp); if (ze.indexOf(n.ze) === -1) ze.push(n.ze); });
    sp.sort(function (a, b) { return a - b; }); ze.sort(function (a, b) { return a - b; });
    var haupt = [], quer = [], querMax = 0;
    N.forEach(function (n) {
      n.c = sp.indexOf(n.sp); n.r = ze.indexOf(n.ze); n.m = hor ? n.w : n.h; n.q = hor ? n.h : n.w;
      haupt[n.c] = Math.max(haupt[n.c] || 0, n.m); quer[n.r] = Math.max(quer[n.r] || 0, n.q); querMax = Math.max(querMax, n.q);
    });
    // Kanten vorbereiten: gültig nur mit beiden Knoten; Beschriftung umbrechen und messen (für den Abstand der Spalten)
    var K = [], paare = Object.create(null), beschrHaupt = 0;
    ka.forEach(function (k) {
      var a = idx[k.v.von], b = idx[k.v.nach]; if (!a || !b) return;   // Kante ohne ihre Knoten (fremde Kennung): nicht zeichnen
      var text = bez(k.v.beschriftung), zl = text ? umbrechen(text, "beschr", fam, MASS.beschrMax) : [], bw = 0;
      zl.forEach(function (z) { bw = Math.max(bw, messen(z.replace(/ $/, ""), "beschr", fam)); });
      var e = { k: k, a: a, b: b, zl: zl, bw: Math.ceil(bw), bh: zl.length * MASS.beschrZeile, paar: a.id < b.id ? a.id + "|" + b.id : b.id + "|" + a.id };
      (paare[e.paar] = paare[e.paar] || []).push(e);
      if (a.c !== b.c && zl.length) beschrHaupt = Math.max(beschrHaupt, hor ? e.bw : e.bh);
      K.push(e);
    });
    var GH = hor ? Math.min(240, Math.max(120, beschrHaupt + 36)) : Math.min(140, Math.max(70, beschrHaupt + 44)), GQ = hor ? 22 : 30, u0 = [], v0 = [], u = 0, v = 0, c, r;
    for (c = 0; c < sp.length; c++) { u0[c] = u; u += haupt[c] + GH; }
    for (r = 0; r < ze.length; r++) { v0[r] = v; v += quer[r] + GQ; }
    N.forEach(function (n) { n.u = u0[n.c] + haupt[n.c] / 2; n.v = v0[n.r] + quer[n.r] / 2; });
    // Weg einer Kante: Treffer auf fremde Knoten zählen (Abtastung der Kurve), bei Bedarf quer ausweichen
    function treffer(e, pts) {
      var n = 0;
      for (var s = 1; s < 20; s++) {
        var p = bezier(pts, s / 20);
        for (var i = 0; i < N.length; i++) {
          var x = N[i]; if (x === e.a || x === e.b) continue;
          if (Math.abs(p[0] - x.u) < x.m / 2 + 6 && Math.abs(p[1] - x.v) < x.q / 2 + 6) { n++; break; }
        }
      }
      return n;
    }
    function bester(e, kandidaten) {
      var gut = null, wenig = Infinity;
      for (var i = 0; i < kandidaten.length; i++) { var t = treffer(e, kandidaten[i]); if (t < wenig) { wenig = t; gut = kandidaten[i]; } if (!t) break; }
      return gut;
    }
    function seitenLast(n, seite) { return K.filter(function (x) { return (x.a === n && Math.sign(x.b.c - n.c) === seite) || (x.b === n && Math.sign(x.a.c - n.c) === seite); }).length; }
    var schritt = (querMax / 2 + GQ / 2 + 6) / 0.75;
    K.forEach(function (e) {
      var a = e.a, b = e.b, p = paare[e.paar], off = (p.indexOf(e) - (p.length - 1) / 2) * 22, kand = [];
      if (a === b) {
        var x = a.u + a.m / 2; kand.push([[x, a.v - 6], [x + 46, a.v - 30], [x + 46, a.v + 30], [x, a.v + 6]]);
      } else if (a.c !== b.c) {
        var s = b.c > a.c ? 1 : -1, su = a.u + s * a.m / 2, eu = b.u - s * b.m / 2, dh = (eu - su) / 2;
        [0, -1, 1, -2, 2, -3, 3].forEach(function (f) { var q = off + f * schritt; kand.push([[su, a.v], [su + dh, a.v + q], [eu - dh, b.v + q], [eu, b.v]]); });
      } else {   // gleiche Spalte: Bogen an der Außenseite, wo weniger Kanten ansetzen
        var bo = Math.min(60, 26 + Math.abs(b.v - a.v) * 0.2) + Math.abs(off), seiten = seitenLast(a, 1) + seitenLast(b, 1) > seitenLast(a, -1) + seitenLast(b, -1) ? [-1, 1] : [1, -1];
        seiten.forEach(function (z) {
          var rand = z > 0 ? u0[a.c] + haupt[a.c] : u0[a.c];
          kand.push([[a.u + z * a.m / 2, a.v], [rand + z * bo, a.v], [rand + z * bo, b.v], [b.u + z * b.m / 2, b.v]]);
        });
      }
      e.pts = bester(e, kand); e.mitte = bezier(e.pts, 0.5);
    });
    // Ausdehnung: Knoten, abgetastete Kurven, Beschriftungen → Verschiebung und Größe
    var minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    function nimm(uu, vv) { if (uu < minU) minU = uu; if (uu > maxU) maxU = uu; if (vv < minV) minV = vv; if (vv > maxV) maxV = vv; }
    N.forEach(function (n) { nimm(n.u - n.m / 2, n.v - n.q / 2); nimm(n.u + n.m / 2, n.v + n.q / 2); });
    K.forEach(function (e) {
      for (var s = 0; s <= 20; s++) { var p = bezier(e.pts, s / 20); nimm(p[0], p[1]); }
      if (e.zl.length) { var hu = (hor ? e.bw : e.bh) / 2 + 3, hv = (hor ? e.bh : e.bw) / 2 + 3; nimm(e.mitte[0] - hu, e.mitte[1] - hv); nimm(e.mitte[0] + hu, e.mitte[1] + hv); }
    });
    if (!N.length) { minU = minV = 0; maxU = maxV = 0; }
    var R = MASS.randAussen, offU = R - minU, offV = R - minV, Ulen = maxU - minU + 2 * R, Vlen = maxV - minV + 2 * R;
    function P(a, b) {   // logische Lage → Bildpunkt je Richtung
      a += offU; b += offV;
      if (richtung === "LR") return [a, b];
      if (richtung === "RL") return [Ulen - a, b];
      if (richtung === "TB") return [b, a];
      return [b, Ulen - a];   // BT
    }
    function pt(p) { var q = P(p[0], p[1]); return r1(q[0]) + "," + r1(q[1]); }
    var W = Math.ceil(hor ? Ulen : Vlen), H = Math.ceil(hor ? Vlen : Ulen);
    var svg = sv("svg", { "class": "rd-dg", viewBox: "0 0 " + W + " " + H, width: W, height: H, focusable: "false" });
    svg.style.width = "100%"; svg.style.maxWidth = W + "px"; svg.style.minWidth = W + "px";   // Paket 6, GP-M07: nie kleiner als gezeichnet (Beschriftung ≥ 11 pt), .rd-diagramm rollt waagrecht
    var spitze = "rd-pfeil-" + n0, defs = sv("defs", {}), mk = sv("marker", { id: spitze, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", markerUnits: "strokeWidth" });
    mk.appendChild(sv("path", { d: "M0,0 L10,5 L0,10 z", "class": "rd-dg-spitze" })); defs.appendChild(mk); svg.appendChild(defs);
    var gL = sv("g", { "class": "rd-dg-kanten" }), gK = sv("g", { "class": "rd-dg-knoten" }), gB = sv("g", { "class": "rd-dg-beschriftungen" });
    // Kanten (unter den Knoten), Beschriftungen obenauf
    K.forEach(function (e) {
      var k = e.k, g = sv("g", { "class": "rd-kante", "data-linie": k.v.linie === "gestrichelt" ? "gestrichelt" : "durchgezogen", "data-pfeil": k.v.pfeil === true ? "ja" : "nein" });
      g.setAttribute("data-rd-id", k.id);
      var linie = sv("path", { d: "M" + pt(e.pts[0]) + " C" + pt(e.pts[1]) + " " + pt(e.pts[2]) + " " + pt(e.pts[3]), "class": "rd-dg-linie" + (k.v.linie === "gestrichelt" ? " rd-dg-gestrichelt" : "") });
      if (k.v.pfeil === true) linie.setAttribute("marker-end", "url(#" + spitze + ")");
      g.appendChild(linie); gL.appendChild(g);
      if (e.zl.length) {
        var m = P(e.mitte[0], e.mitte[1]), t = sv("text", { "text-anchor": "middle", "dominant-baseline": "central", "class": "rd-dg-beschr" });
        t.setAttribute("data-rd-kante", k.id);
        e.zl.forEach(function (z, j) {
          var s = sv("tspan", { x: r1(m[0]), y: r1(m[1] - e.bh / 2 + MASS.beschrZeile * (j + 0.5)) }); s.textContent = z; t.appendChild(s);
        });
        gB.appendChild(t);
      }
    });
    // Knoten: Kasten, erste Zeile = Name, weitere = Rolle o. Ä.; das Kürzel wird nicht gezeigt
    N.forEach(function (n) {
      var m = P(n.u, n.v), g = sv("g", { "class": "rd-knoten" }), ti = sv("title", {});
      g.setAttribute("data-rd-id", n.id);
      ti.textContent = n.zl.join("\n"); g.appendChild(ti);
      g.appendChild(sv("rect", { x: r1(m[0] - n.w / 2), y: r1(m[1] - n.h / 2), width: n.w, height: n.h, rx: 8, "class": "rd-dg-box" }));
      var t = sv("text", { "text-anchor": "middle", "dominant-baseline": "central" });
      n.zeilen.forEach(function (z, j) {
        var s = sv("tspan", { x: r1(m[0]), y: r1(m[1] - n.zeilen.length * MASS.zeile / 2 + MASS.zeile * (j + 0.5)), "class": z.art === "name" ? "rd-dg-name" : "rd-dg-zeile" });
        s.textContent = z.t; t.appendChild(s);
      });
      g.appendChild(t); gK.appendChild(g);
    });
    svg.appendChild(gL); svg.appendChild(gK); svg.appendChild(gB);
    fig.appendChild(svg);
    return fig;
  }

  /* ---- Hülle (ein Reiter mit Umschalter) und Einzelansicht (drei Reiter) ---- */
  function waehle(L, key, fokus) {
    key = gueltigeAnsicht(key) || ANSICHTEN[0].schluessel;
    L.gewaehlt = key; merke(key);
    var w = L.wurzeln[SEITE]; if (!w) return;
    var tabs = w.querySelectorAll(".rd-tab"), panels = w.querySelectorAll(".rd-ansicht");
    for (var i = 0; i < tabs.length; i++) {
      var an = tabs[i].getAttribute("data-rd-tab") === key;
      tabs[i].setAttribute("aria-selected", an ? "true" : "false"); tabs[i].tabIndex = an ? 0 : -1;
      if (an && fokus) tabs[i].focus();
    }
    for (var j = 0; j < panels.length; j++) panels[j].hidden = panels[j].getAttribute("data-rd-ansicht") !== key;
  }
  function huelleZeichnen(L, o) {
    var w = el("div", "rd rd-huelle"), n = ++nr, leiste = el("div", "rd-umschalter");
    w.setAttribute("data-lage", L.lage); w.setAttribute("data-rd-modus", "eins");
    w.appendChild(meldung(L.T, L.lage));
    if (o && o.mappe) w.appendChild(mappeKopf(o.mappe));
    leiste.setAttribute("role", "tablist"); leiste.setAttribute("aria-label", NAME);
    ANSICHTEN.forEach(function (a) {
      var b = el("button", "rd-tab"), an = a.schluessel === L.gewaehlt;
      b.type = "button"; b.id = "rd-tab-" + n + "-" + a.schluessel; b.textContent = a.name;
      b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "rd-panel-" + n + "-" + a.schluessel);
      b.setAttribute("data-rd-tab", a.schluessel); b.setAttribute("aria-selected", an ? "true" : "false"); b.tabIndex = an ? 0 : -1;
      leiste.appendChild(b);
    });
    leiste.addEventListener("click", function (ev) { var b = ev.target.closest(".rd-tab"); if (b) waehle(L, b.getAttribute("data-rd-tab"), false); });
    leiste.addEventListener("keydown", function (ev) {
      var i = -1; ANSICHTEN.forEach(function (a, j) { if (a.schluessel === L.gewaehlt) i = j; });
      var z = ev.key === "ArrowRight" ? i + 1 : ev.key === "ArrowLeft" ? i - 1 : ev.key === "Home" ? 0 : ev.key === "End" ? ANSICHTEN.length - 1 : null;
      if (z == null) return;
      ev.preventDefault(); waehle(L, ANSICHTEN[(z + ANSICHTEN.length) % ANSICHTEN.length].schluessel, true);
    });
    w.appendChild(leiste);
    ANSICHTEN.forEach(function (a) {
      var p = ansichtPanel(L, o, a.schluessel);
      p.id = "rd-panel-" + n + "-" + a.schluessel; p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "rd-tab-" + n + "-" + a.schluessel);
      p.hidden = a.schluessel !== L.gewaehlt;
      w.appendChild(p);
    });
    return w;
  }
  function einzelnZeichnen(L, o, a) {
    var w = el("div", "rd rd-einzeln");
    w.setAttribute("data-lage", L.lage); w.setAttribute("data-rd-modus", "drei");
    w.appendChild(meldung(L.T, L.lage));
    if (o && o.mappe) w.appendChild(mappeKopf(o.mappe));
    w.appendChild(ansichtPanel(L, o, a.schluessel));
    return w;
  }
  function zielFuer(ziel, seite) {
    if (!ziel) return null;
    if (typeof ziel === "function") { var e = ziel(seite); return e && e.nodeType === 1 ? e : null; }
    if (ziel.nodeType === 1) return seite === SEITE ? ziel : null;
    return ziel[seite] && ziel[seite].nodeType === 1 ? ziel[seite] : null;
  }
  function setze(L, seite, wurzel) {
    var c = zielFuer(L.ziel, seite); if (!c) return;
    var alt = L.wurzeln[seite], fokus = null;
    if (alt && document.activeElement && alt.contains(document.activeElement) && document.activeElement.getAttribute) fokus = document.activeElement.getAttribute("data-rd-tab");
    leeren(c); c.appendChild(wurzel); L.wurzeln[seite] = wurzel;
    if (fokus) { var b = wurzel.querySelector('.rd-tab[data-rd-tab="' + gueltigeAnsicht(fokus) + '"]'); if (b) b.focus(); }
  }
  function neuerLauf(ziel, opt) {
    var L = { ziel: ziel, opt: opt || {}, drei: dreiReiter(opt), T: texte(opt), docs: null, lage: "laedt", gewaehlt: gemerkt() || ANSICHTEN[0].schluessel,
      offen: Object.create(null), wurzeln: Object.create(null), abo: null, aus: false };
    L.zeichnen = function () {
      if (L.aus) return;
      var o = null;
      try {
        o = L.docs ? ordne(L.docs) : null;
        if (o && L.lage !== "fehler") L.lage = hatInhalt(o) ? "ok" : "leer";
        if (L.drei) ANSICHTEN.forEach(function (a) { setze(L, a.seite, einzelnZeichnen(L, o, a)); });
        else setze(L, SEITE, huelleZeichnen(L, o));
      } catch (e) {
        try { console.error("[Redaktion] Zeichnen fehlgeschlagen", e); } catch (x) {}
      }
    };
    L.daten = function (docs) { if (L.aus) return; L.docs = docs; L.lage = "ok"; L.zeichnen(); };
    L.fehler = function (e) {
      if (L.aus) return;
      L.lage = "fehler";
      try { console.warn("[Redaktion] Sammlung nicht geladen:", e && e.message ? e.message : e); } catch (x) {}
      L.zeichnen();
    };
    L.leeren = function () {
      L.aus = true;
      for (var s in L.wurzeln) { var c = zielFuer(L.ziel, s); if (c && L.wurzeln[s].parentNode === c) leeren(c); }
      L.wurzeln = Object.create(null);
    };
    L.griff = {
      abmelden: function () { if (lauf === L) abmelden(); else { try { if (L.abo) L.abo(); } catch (e) {} L.leeren(); } },
      zeigeAnsicht: function (k) { if (!L.drei && gueltigeAnsicht(k)) waehle(L, k, false); },
      ansicht: function () { return L.gewaehlt; },
      lage: function () { return L.aus ? "aus" : L.lage; }
    };
    return L;
  }

  /* ---- Schnittstelle ---- */
  function abmelden() {
    var L = lauf; if (!L) return;
    lauf = null;
    try { if (L.abo) L.abo(); } catch (e) {}
    L.leeren();
  }
  function starte(ziel, db, opt) {
    abmelden();
    var L = neuerLauf(ziel, opt);
    lauf = L;
    if (istGast(opt)) { L.aus = true; return L.griff; }   // Gäste: kein Abo, keine Abfrage an `redaktion`, nichts gezeichnet
    stil();
    L.zeichnen();
    try {
      if (!db || typeof db.collection !== "function") throw new Error("keine Datenbank");
      var abo = db.collection(SAMMLUNG).onSnapshot(function (snap) {
        if (lauf !== L) return;
        L.daten(snap && Array.isArray(snap.docs) ? snap.docs : liste(snap));
      }, function (e) { if (lauf === L) L.fehler(e); });
      L.abo = typeof abo === "function" ? abo : abo && typeof abo.unsubscribe === "function" ? function () { abo.unsubscribe(); } : null;
      if (lauf !== L) { try { if (L.abo) L.abo(); } catch (e) {} }   // schon wieder abgemeldet, während onSnapshot lief
    } catch (e) { L.fehler(e); }
    return L.griff;
  }
  function zeichne(ziel, eintraege, opt) {
    if (istGast(opt)) return null;
    stil();
    var L = neuerLauf(ziel, opt);
    L.daten(liste(eintraege));
    return L.griff;
  }
  function reiter(opt) {
    if (istGast(opt)) return [];
    if (dreiReiter(opt)) return ANSICHTEN.map(function (a) { return { seite: a.seite, name: a.name, ansicht: a.schluessel }; });
    return [{ seite: SEITE, name: NAME, ansicht: null }];
  }
  // Adresse der anderen Form auf die gültige abbilden: ein Reiter → #redaktion (Unteransicht gemerkt); drei Reiter → #redaktion-…
  function seite(p, opt) {
    var drei = dreiReiter(opt), i;
    if (p === SEITE && drei) { var k = gemerkt() || ANSICHTEN[0].schluessel; for (i = 0; i < ANSICHTEN.length; i++) if (ANSICHTEN[i].schluessel === k) return ANSICHTEN[i].seite; }
    for (i = 0; i < ANSICHTEN.length; i++) if (p === ANSICHTEN[i].seite) {
      if (drei) { merke(ANSICHTEN[i].schluessel); return p; }
      merke(ANSICHTEN[i].schluessel);
      if (lauf && !lauf.drei) waehle(lauf, ANSICHTEN[i].schluessel, false);
      return SEITE;
    }
    return p;
  }

  window.LEITSTAND_REDAKTION = {
    NAME: NAME, SEITE: SEITE, SAMMLUNG: SAMMLUNG, BAUART: BAUART,
    ANSICHTEN: ANSICHTEN.map(function (a) { return { schluessel: a.schluessel, name: a.name, seite: a.seite }; }),
    SEITEN: [SEITE].concat(ANSICHTEN.map(function (a) { return a.seite; })),
    reiter: reiter, seite: seite, starte: starte, abmelden: abmelden, zeichne: zeichne
  };
})();
