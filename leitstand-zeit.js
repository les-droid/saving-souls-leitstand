/* Saving Souls Leitstand – Zeiterfassung + Lagebericht
   Läuft NACH dem Board-Script. Nutzt dieselbe Datenbank (claude.use("db")).
   Collections: zeiten (Einträge), lagebericht/aktuell (Dokument), todos (für Claude-Zeit + „Wer macht was“). */
(function () {
  "use strict";

  var WER = ["LES", "JB", "TS", "DS", "CL"];
  var WER_NAME = { LES: "LES", JB: "JB", TS: "TS", DS: "DS", CL: "Claude" };
  var KAT = [
    ["dreh", "Dreh"], ["schnitt", "Schnitt"], ["sichtung", "Sichtung / Transkript"], ["konzept", "Konzept / Dramaturgie"],
    ["orga", "Orga / Kommunikation"], ["claude", "Arbeit mit Claude"], ["technik", "Technik / Setup"], ["sonstiges", "Sonstiges"]
  ];
  var KAT_NAME = {}; KAT.forEach(function (k) { KAT_NAME[k[0]] = k[1]; });
  var QUELLE_NAME = { timer: "Stoppuhr", manuell: "eingetragen", rekonstruiert: "rekonstruiert", listener: "Schnitt 11", aufgabe: "Claude-Aufgabe" };

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var me = function () { try { return localStorage.getItem("ss-wer") || "LES"; } catch (e) { return "LES"; } };
  var heute = function () { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
  var hhmm = function (d) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); };
  var fmtDatum = function (iso) { if (!iso) return ""; var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "." + m[2] + "." + m[1].slice(2) : ""; };
  var fmtStd = function (min) { var h = (min || 0) / 60; return (Math.round(h * 4) / 4).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " h"; };
  var minuten = function (von, bis) { if (!von || !bis) return null; var a = von.split(":"), b = bis.split(":"); var m = (Number(b[0]) * 60 + Number(b[1])) - (Number(a[0]) * 60 + Number(a[1])); if (m < 0) m += 24 * 60; return m; };

  /* ---- Mini-Markdown (Absätze, Listen, fett) ---- */
  function md(text) {
    var inline = function (s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>"); };
    var out = [], liste = false;
    String(text || "").split("\n").forEach(function (z) {
      var t = z.replace(/\s+$/, ""); var m = t.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
      if (m) { if (!liste) { out.push('<ul style="margin:4px 0 4px 18px;padding:0">'); liste = true; } out.push('<li style="margin:2px 0">' + inline(m[2]) + "</li>"); return; }
      if (liste) { out.push("</ul>"); liste = false; }
      if (t === "") return;
      out.push('<p style="margin:4px 0">' + inline(t) + "</p>");
    });
    if (liste) out.push("</ul>");
    return out.join("");
  }

  var db = null, zeiten = [], todos = [], zeigeAlle = false;
  (function () { var st = document.createElement("style"); st.textContent = ".chip.CL{color:var(--chip-claude)} #page-zeit .pill{font:500 11px var(--font-mono);letter-spacing:.04em;padding:2px 7px;border-radius:999px;border:1px solid var(--muted);color:var(--muted);white-space:nowrap}"; document.head.appendChild(st); })();

  /* ================= Lagebericht ================= */
  var lageCard = document.getElementById("lageCard");
  function renderLage(v) {
    var body = document.getElementById("lageBody"), meta = document.getElementById("lageMeta");
    if (!v) { body.innerHTML = '<p style="color:var(--muted);margin:0">Noch kein Lagebericht hinterlegt. Claude schreibt ihn nach jedem Überwachungslauf auf Schnitt 11.</p>'; return; }
    meta.textContent = "Stand " + (v.stand || "");
    /* Startseite knapp: Kurzfassung + je drei Punkte „Neu“, „Ansteht“, „Achtung“; alles Weitere aufklappbar */
    var punkte = function (text, n) { return String(text || "").split("\n").filter(function (z) { return /^\s*([-*]|\d+\.)\s+/.test(z); }).slice(0, n).join("\n"); };
    var spalte = function (titel, text, n) { var p = punkte(text, n); return p ? '<div style="flex:1 1 200px;min-width:0"><div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:2px">' + esc(titel) + "</div>" + md(p) + "</div>" : ""; };
    var abschnitt = function (titel, text) { return text ? '<h3 style="margin:12px 0 4px;font-size:14px">' + esc(titel) + "</h3>" + md(text) : ""; };
    body.innerHTML = (v.kurz ? '<p style="margin:0 0 10px;font-weight:600">' + esc(v.kurz) + "</p>" : "") +
      '<div style="display:flex;gap:16px;flex-wrap:wrap">' + spalte("Neu", v.verlauf, 3) + spalte("Ansteht", v.ansteht, 3) + spalte("Achtung", v.probleme, 2) + "</div>" +
      '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:13px;color:var(--muted)">Ganzer Lagebericht' + (v.von ? " · " + esc(v.von) : "") + "</summary>" +
      abschnitt("Gedreht", v.gedreht) + abschnitt("Was schiefging / Risiken", v.probleme) + abschnitt("Was ansteht", v.ansteht) + abschnitt("Wer macht was", v.wer) + abschnitt("Zuletzt passiert", v.verlauf) + "</details>";
  }
  function renderLageWer() {
    var el = document.getElementById("lageWerBody"); if (!el) return;
    var gruppen = {};
    todos.forEach(function (d) { var v = d.data(); if (!v || v.done) return; var w = v.wer || "alle"; (gruppen[w] = gruppen[w] || []).push(v); });
    var reihenfolge = ["LES", "JB", "TS", "DS", "Claude", "alle"];
    var keys = Object.keys(gruppen).sort(function (a, b) { return (reihenfolge.indexOf(a) + 1 || 99) - (reihenfolge.indexOf(b) + 1 || 99); });
    if (!keys.length) { el.innerHTML = '<p style="color:var(--muted);margin:0">Keine offenen To-dos.</p>'; return; }
    el.innerHTML = keys.map(function (w) {
      var l = gruppen[w].sort(function (a, b) { return (Number(a.prio) || 2) - (Number(b.prio) || 2); });
      return '<div style="margin:0 0 8px"><span class="chip ' + esc(w) + '">' + esc(w) + "</span> <span style=\"color:var(--muted)\">" + l.length + " offen</span><ul style=\"margin:4px 0 0 18px;padding:0\">" +
        l.slice(0, 6).map(function (v) { return '<li style="margin:2px 0">' + (Number(v.prio) === 1 ? "<strong>" : "") + esc(v.text) + (Number(v.prio) === 1 ? "</strong>" : "") + (v.typ === "claude" && v.s11status ? ' <span style="color:var(--muted)">(' + esc(v.s11status) + ")</span>" : "") + "</li>"; }).join("") +
        (l.length > 6 ? '<li style="color:var(--muted)">… und ' + (l.length - 6) + " weitere</li>" : "") + "</ul></div>";
    }).join("");
  }
  /* Startseite entschlacken: Projektstand-Phasen erst auf Klick */
  (function () {
    var ul = document.querySelector("#page-start ul.phasen"); if (!ul) return;
    var det = document.createElement("details"); det.innerHTML = '<summary style="cursor:pointer;font-size:13px;color:var(--muted)">Phasen anzeigen</summary>';
    ul.parentNode.insertBefore(det, ul); det.appendChild(ul);
  })();
  function lageOben() {
    /* Geschäftsleitung: Lagebericht ganz oben, „Wer macht was“ aufgeklappt */
    var k = me(); if (k !== "TS" && k !== "DS") return;
    var tiles = document.getElementById("tiles"); if (tiles && lageCard && lageCard.parentNode) { tiles.parentNode.insertBefore(lageCard, tiles); lageCard.style.marginBottom = "14px"; }
    var det = document.getElementById("lageWer"); if (det) det.open = true;
  }

  /* ================= Wer ist gerade dran? (Präsenz) =================
     Sammlung praesenz/<LES|JB>: schreibt der Listener aus den Commits auf main (Autor „CL LES“/„CL JB“,
     Marken „Sitzung gestartet“/„Sitzung beendet“). Dazu laufende Claude-Aufgaben aus todos. */
  var praesenz = [];
  var praesenzEl = (function () {
    var start = document.getElementById("page-start"); if (!start) return null;
    var el = document.createElement("div"); el.id = "praesenz";
    el.style.cssText = "display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;font-size:13px;color:var(--muted);margin:-8px 0 16px";
    var anker = start.querySelector(".standline");
    if (anker && anker.parentNode) anker.parentNode.insertBefore(el, anker.nextSibling); else start.insertBefore(el, start.firstChild);
    var st = document.createElement("style");
    st.textContent = "#praesenz .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--muted);opacity:.5;margin-right:6px;vertical-align:1px}#praesenz .dot.on{opacity:1;background:#2fa84f;box-shadow:0 0 0 0 rgba(47,168,79,.6);animation:ssPuls 1.6s infinite}@keyframes ssPuls{to{box-shadow:0 0 0 7px rgba(47,168,79,0)}}#praesenz strong{color:var(--ink)}";
    document.head.appendChild(st);
    return el;
  })();
  var ORT_NAME = { schnitt11: "Schnitt 11", vps: "dem VPS", cloud: "Claude in der Cloud" };
  function renderPraesenz() {
    if (!praesenzEl) return;
    var jetzt = Date.now(), teile = [];
    var zeit = function (iso) { var d = new Date(iso); return isNaN(d) ? "" : hhmm(d); };
    praesenz.forEach(function (d) {
      var v = d.data(); if (!v || !v.aktiv) return;
      if (!(v.zuletztAm && jetzt - new Date(v.zuletztAm).getTime() < 45 * 60000)) return;   /* Fallback, falls der Listener aus ist */
      teile.push('<span><span class="dot on"></span><strong>' + esc(v.wer) + "</strong> arbeitet gerade mit Claude · seit " + zeit(v.seit) +
        (v.text && !/Sitzung gestartet/i.test(v.text) ? " · zuletzt " + zeit(v.zuletztAm) + " „" + esc(v.text) + "“" : "") + "</span>");
    });
    todos.forEach(function (d) {
      var v = d.data(); if (!v || v.s11status !== "laeuft") return;
      teile.push('<span><span class="dot on"></span><strong>Claude-Aufgabe</strong> läuft auf ' + esc(ORT_NAME[v.s11ziel] || "Schnitt 11") + " · „" + esc(v.text) + "“</span>");
    });
    if (!teile.length) {
      var letzte = praesenz.map(function (d) { return d.data(); }).filter(function (v) { return v && v.zuletztAm; })
        .sort(function (a, b) { return a.zuletztAm < b.zuletztAm ? 1 : -1; })[0];
      teile.push('<span><span class="dot"></span>Gerade arbeitet niemand mit Claude' + (letzte ? " · zuletzt " + esc(letzte.wer) + " am " + fmtDatum(letzte.zuletztAm) + " " + zeit(letzte.zuletztAm) : "") + "</span>");
    }
    praesenzEl.innerHTML = teile.join("");
  }
  setInterval(renderPraesenz, 60000);

  /* ================= Zeiterfassung ================= */
  function selectFuellen(sel, liste, name, wert) {
    sel.innerHTML = liste.map(function (k) { return '<option value="' + esc(k) + '"' + (k === wert ? " selected" : "") + ">" + esc(name[k] || k) + "</option>"; }).join("");
  }
  var timerForm = document.getElementById("zeitTimerForm"), timerBtn = document.getElementById("zeitTimerBtn"), timerLauf = document.getElementById("zeitTimerLauf");
  var zeitForm = document.getElementById("zeitForm");
  selectFuellen(document.getElementById("zeitWer"), WER, WER_NAME, me());
  selectFuellen(document.getElementById("zeitKat"), KAT.map(function (k) { return k[0]; }), KAT_NAME, "schnitt");
  selectFuellen(document.getElementById("zeitTimerKat"), KAT.map(function (k) { return k[0]; }), KAT_NAME, "schnitt");
  document.getElementById("zeitDatum").value = heute();

  /* Stoppuhr: Zustand in localStorage, überlebt Neuladen */
  var timerTick = null;
  function timerLesen() { try { return JSON.parse(localStorage.getItem("ss-timer") || "null"); } catch (e) { return null; } }
  function timerSchreiben(t) { try { if (t) localStorage.setItem("ss-timer", JSON.stringify(t)); else localStorage.removeItem("ss-timer"); } catch (e) {} }
  function timerAnzeigen() {
    var t = timerLesen();
    clearInterval(timerTick); timerTick = null;
    if (!t) { timerLauf.style.display = "none"; timerBtn.textContent = "Start"; document.getElementById("zeitTimerText").disabled = false; document.getElementById("zeitTimerKat").disabled = false; return; }
    document.getElementById("zeitTimerText").value = t.text || ""; document.getElementById("zeitTimerKat").value = t.kat || "schnitt";
    document.getElementById("zeitTimerText").disabled = true; document.getElementById("zeitTimerKat").disabled = true;
    timerBtn.textContent = "Stopp"; timerLauf.style.display = "";
    var zeichnen = function () {
      var min = Math.max(0, Math.round((Date.now() - t.start) / 60000));
      timerLauf.innerHTML = '<span class="chip ' + esc(t.wer) + '">' + esc(t.wer) + "</span> läuft seit " + hhmm(new Date(t.start)) + " · <strong>" + fmtStd(min) + "</strong>" + (min < 15 ? " (" + min + " min)" : "");
    };
    zeichnen(); timerTick = setInterval(zeichnen, 30000);
  }
  timerForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var t = timerLesen();
    if (!t) {
      var text = document.getElementById("zeitTimerText").value.trim();
      timerSchreiben({ start: Date.now(), wer: me(), text: text, kat: document.getElementById("zeitTimerKat").value });
      timerAnzeigen(); return;
    }
    var ende = Date.now(), start = new Date(t.start), min = Math.max(1, Math.round((ende - t.start) / 60000));
    if (!db) return;
    db.collection("zeiten").add({ wer: t.wer, datum: start.getFullYear() + "-" + ("0" + (start.getMonth() + 1)).slice(-2) + "-" + ("0" + start.getDate()).slice(-2), von: hhmm(start), bis: hhmm(new Date(ende)), minuten: min, kategorie: t.kat, text: t.text || "", quelle: "timer", geschaetzt: false, created: new Date().toISOString(), createdBy: me() })
      .then(function () { timerSchreiben(null); document.getElementById("zeitTimerText").value = ""; timerAnzeigen(); })
      .catch(function (e) { alert("Konnte nicht speichern: " + (e && e.message ? e.message : e)); });
  });
  timerAnzeigen();

  /* Manueller / rückwirkender Eintrag */
  zeitForm.addEventListener("submit", function (ev) {
    ev.preventDefault(); if (!db) return;
    var von = document.getElementById("zeitVon").value, bis = document.getElementById("zeitBis").value;
    var dauer = parseFloat(String(document.getElementById("zeitDauer").value).replace(",", "."));
    var min = (von && bis) ? minuten(von, bis) : (dauer > 0 ? Math.round(dauer * 60) : null);
    if (!min) { alert("Bitte Von und Bis oder eine Dauer in Stunden angeben."); return; }
    var datum = document.getElementById("zeitDatum").value; if (!datum) { alert("Bitte ein Datum wählen."); return; }
    var eintrag = { wer: document.getElementById("zeitWer").value, datum: datum, von: von || null, bis: bis || null, minuten: min, kategorie: document.getElementById("zeitKat").value,
      text: document.getElementById("zeitText").value.trim(), quelle: "manuell", geschaetzt: document.getElementById("zeitSchaetzung").checked, created: new Date().toISOString(), createdBy: me() };
    db.collection("zeiten").add(eintrag).then(function () {
      document.getElementById("zeitVon").value = ""; document.getElementById("zeitBis").value = ""; document.getElementById("zeitDauer").value = ""; document.getElementById("zeitText").value = ""; document.getElementById("zeitSchaetzung").checked = false;
    }).catch(function (e) { alert("Konnte nicht speichern: " + (e && e.message ? e.message : e)); });
  });

  /* Liste */
  var zeitList = document.getElementById("zeitList");
  function eintragLi(id, v) {
    var q = QUELLE_NAME[v.quelle] || v.quelle || "";
    var badge = v.geschaetzt ? '<span class="pill" style="font-size:11px">Schätzung' + (v.quelle === "rekonstruiert" ? " · rekonstruiert" : "") + "</span>" : (v.quelle && v.quelle !== "manuell" ? '<span style="font-size:11px;color:var(--muted)">' + esc(q) + "</span>" : "");
    return '<li data-id="' + esc(id) + '"><div class="nmeta"><span class="chip ' + esc(v.wer) + '">' + esc(WER_NAME[v.wer] || v.wer) + "</span><span>" + fmtDatum(v.datum) + (v.von && v.bis ? " · " + esc(v.von) + "–" + esc(v.bis) : "") + " · <strong>" + fmtStd(v.minuten) + "</strong> · " + esc(KAT_NAME[v.kategorie] || v.kategorie || "") + "</span>" + badge +
      '<button class="del" title="Löschen" aria-label="Löschen" style="margin-left:auto">×</button></div>' + (v.text ? '<div class="ntext">' + esc(v.text) + (v.basis ? ' <span style="color:var(--muted)">(' + esc(v.basis) + ")</span>" : "") + "</div>" : "") + "</li>";
  }
  function renderZeiten() {
    var rows = zeiten.slice().sort(function (a, b) { return String(b.data().datum + (b.data().von || "")).localeCompare(String(a.data().datum + (a.data().von || ""))); });
    var n = zeigeAlle ? rows.length : Math.min(rows.length, 40);
    zeitList.innerHTML = rows.length ? rows.slice(0, n).map(function (d) { return eintragLi(d.id, d.data()); }).join("") : '<li class="empty">Noch keine Zeiten. Stoppuhr starten oder rückwirkend eintragen.</li>';
    document.getElementById("zeitMehr").style.display = rows.length > n ? "" : "none";
    renderSumme();
  }
  document.getElementById("zeitMehr").addEventListener("click", function () { zeigeAlle = true; renderZeiten(); });
  zeitList.addEventListener("click", function (ev) {
    var b = ev.target.closest("button.del"); if (!b || !db) return;
    var li = b.closest("li"); if (!li || !confirm("Diesen Zeiteintrag löschen?")) return;
    db.collection("zeiten").doc(li.dataset.id).delete().catch(function () {});
  });

  /* Claude-Zeit aus erledigten Claude-Aufgaben (Listener setzt s11gestartetAm / s11beendetAm) */
  function claudeAufgabenMinuten() {
    var sum = 0, n = 0;
    todos.forEach(function (d) { var v = d.data(); if (!v || !v.s11gestartetAm || !v.s11beendetAm) return; var m = (new Date(v.s11beendetAm) - new Date(v.s11gestartetAm)) / 60000; if (m > 0 && m < 24 * 60) { sum += m; n++; } });
    return { minuten: Math.round(sum), anzahl: n };
  }

  /* Auswertung */
  function renderSumme() {
    var tot = {}, sicher = {}, kat = {};
    WER.forEach(function (w) { tot[w] = 0; sicher[w] = 0; });
    zeiten.forEach(function (d) { var v = d.data(); if (!v || !v.minuten) return; var w = WER.indexOf(v.wer) >= 0 ? v.wer : "LES"; tot[w] += v.minuten; if (!v.geschaetzt) sicher[w] += v.minuten; var k = v.kategorie || "sonstiges"; kat[k] = kat[k] || {}; kat[k][w] = (kat[k][w] || 0) + v.minuten; });
    var ca = claudeAufgabenMinuten(); tot.CL += ca.minuten; sicher.CL += ca.minuten; kat.claude = kat.claude || {}; kat.claude.CL = (kat.claude.CL || 0) + ca.minuten;
    var tb = document.querySelector("#zeitSumme tbody");
    tb.innerHTML = WER.map(function (w) { return "<tr><td><span class=\"chip " + esc(w) + "\">" + esc(WER_NAME[w]) + "</span></td><td class=\"num\"><strong>" + fmtStd(tot[w]) + "</strong></td><td class=\"num\">" + fmtStd(sicher[w]) + "</td><td class=\"num\">" + fmtStd(tot[w] - sicher[w]) + "</td></tr>"; }).join("") +
      "<tr><td><strong>Team (ohne Claude)</strong></td><td class=\"num\"><strong>" + fmtStd(tot.LES + tot.JB + tot.TS + tot.DS) + "</strong></td><td class=\"num\">" + fmtStd(sicher.LES + sicher.JB + sicher.TS + sicher.DS) + "</td><td class=\"num\">" + fmtStd((tot.LES - sicher.LES) + (tot.JB - sicher.JB) + (tot.TS - sicher.TS) + (tot.DS - sicher.DS)) + "</td></tr>";
    var tk = document.querySelector("#zeitKatSumme tbody");
    var katKeys = KAT.map(function (k) { return k[0]; }).filter(function (k) { return kat[k]; });
    tk.innerHTML = katKeys.length ? katKeys.map(function (k) { return "<tr><td>" + esc(KAT_NAME[k]) + "</td>" + WER.map(function (w) { return '<td class="num">' + (kat[k][w] ? fmtStd(kat[k][w]) : "–") + "</td>"; }).join("") + "</tr>"; }).join("") : '<tr><td colspan="6" style="color:var(--muted)">Noch keine Einträge.</td></tr>';
    var mitMensch = 0; zeiten.forEach(function (d) { var v = d.data(); if (v && v.kategorie === "claude" && v.wer !== "CL") mitMensch += v.minuten || 0; });
    var claudeAllein = tot.CL;
    document.getElementById("zeitClaude").innerHTML =
      "<div><strong>" + fmtStd(claudeAllein) + "</strong> hat Claude ohne euer Zutun gearbeitet: " + ca.anzahl + " Claude-Aufgaben aus dem Board (" + fmtStd(ca.minuten) + ") plus Läufe auf Schnitt 11 und Sessions (" + fmtStd(claudeAllein - ca.minuten) + ").</div>" +
      "<div><strong>" + fmtStd(mitMensch) + "</strong> habt ihr selbst mit Claude gearbeitet (Kategorie „Arbeit mit Claude“, zählt zu eurer Arbeitszeit).</div>";
    document.getElementById("zeitStand").textContent = zeiten.length ? zeiten.length + " Einträge" : "";
    var nav = document.getElementById("navZeit"); if (nav) nav.textContent = timerLesen() ? "●" : "";
  }

  /* CSV */
  document.getElementById("zeitCsv").addEventListener("click", function (ev) {
    ev.preventDefault();
    var zeilen = [["wer", "datum", "von", "bis", "minuten", "stunden", "kategorie", "text", "quelle", "geschaetzt", "basis"]];
    zeiten.slice().sort(function (a, b) { return String(a.data().datum).localeCompare(String(b.data().datum)); }).forEach(function (d) { var v = d.data(); zeilen.push([v.wer, v.datum, v.von || "", v.bis || "", v.minuten, (v.minuten / 60).toFixed(2), v.kategorie, v.text || "", v.quelle || "", v.geschaetzt ? "ja" : "nein", v.basis || ""]); });
    var csv = zeilen.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(";"); }).join("\n");
    var a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8,﻿" + encodeURIComponent(csv); a.download = "saving-souls-zeiten-" + heute() + ".csv"; document.body.appendChild(a); a.click(); a.remove();
  });

  /* ================= Start ================= */
  lageOben();
  if (!(window.claude && window.claude.use)) return;
  window.claude.use("db").then(function (d) {
    if (!d) return; db = d;
    db.doc("lagebericht/aktuell").onSnapshot(function (snap) { renderLage(snap.exists ? snap.data() : null); }, function () { renderLage(null); });
    db.collection("todos").onSnapshot(function (snap) { todos = snap.docs; renderLageWer(); renderSumme(); renderPraesenz(); }, function () {});
    db.collection("praesenz").onSnapshot(function (snap) { praesenz = snap.docs; renderPraesenz(); }, function () {});
    db.collection("zeiten").onSnapshot(function (snap) { zeiten = snap.docs; renderZeiten(); }, function () {});
  });
  /* Kürzel-Wechsel im Kopf: Vorgabe im Formular nachziehen */
  document.addEventListener("click", function (ev) { if (ev.target.closest("#whoPick button, #whoModalBtns button")) setTimeout(function () { document.getElementById("zeitWer").value = me(); lageOben(); }, 0); });
})();
