/* Saving Souls Leitstand — Reiter "Claude" (Chat-Fernsteuerung vom Handy, nur LES + JB)
   Eigene Datei nach demselben Muster wie leitstand-db.js das Schnitt-11-Panel einhängt:
   der Seiten-Container in index.html bleibt leer (<div class="page" id="page-claude">),
   dieses Script füllt ihn per innerHTML und meldet sich selbst an die Todos-Sammlung an.
   Datenformat: Sammlung "todos" (siehe index.html #todoForm) — Claude-Aufgaben aus dem Chat
   bekommen zusätzlich quelle:"chat", damit dieser Reiter nur sein eigenes Gespräch zeigt;
   Aufgaben-Reiter und Schnitt-11-Panel sehen dieselben Einträge trotzdem ganz normal mit,
   weil an typ/wer/angefordert/s11status nichts geändert wird. */
(function () {
  "use strict";

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var me = function () { try { return localStorage.getItem("ss-wer") || "?"; } catch (e) { return "?"; } };
  var iso = function () { return new Date().toISOString(); };

  var TEMPLATE =
    '<div class="grid eins"><div>' +
    '<section class="card" id="claudeChatCard">' +
      '<h2>Claude <span class="hint">Chat mit Claude — läuft auf Schnitt 11 oder dem VPS</span></h2>' +
      '<p class="ccLesehinweis">Claude liest und antwortet — Änderungen an Dateien macht eine Sitzung am Schnittplatz.</p>' +
      '<div class="ccQuick">' +
        '<button type="button" class="ccQuickBtn" data-cmd="stand">Stand?</button>' +
        '<button type="button" class="ccQuickBtn" data-cmd="laeuft">Was läuft gerade?</button>' +
      '</div>' +
      '<ul class="ccVerlauf" id="ccVerlauf"><li class="empty">Noch keine Nachrichten — unten die erste Aufgabe schreiben oder diktieren.</li></ul>' +
      '<div class="ccReplyBar hidden" id="ccReplyBar">Nachfrage zu: <span id="ccReplyText"></span><button type="button" id="ccReplyCancel" aria-label="Nachfrage abbrechen">×</button></div>' +
      '<form class="add ccForm" id="ccForm">' +
        '<textarea id="ccInput" placeholder="Nachricht an Claude — auch per Diktat über die Handy-Tastatur …" maxlength="4000"></textarea>' +
        '<select id="ccZiel" aria-label="Wo soll Claude arbeiten" title="Wo soll Claude arbeiten">' +
          '<option value="egal">Ort egal (Repo, Texte)</option>' +
          '<option value="schnitt11">nur Schnitt 11 (RAID, Premiere)</option>' +
        '</select>' +
        '<button class="primary" type="submit">Senden</button>' +
      '</form>' +
      '<div id="ccStatus"></div>' +
    '</section>' +
    '</div></div>';

  var db = null, verlaufEl, replyBarEl, replyTextEl, inputEl, zielEl, statusEl, formEl;
  var replyTo = null;         // { id, frage, antwort } — gesetzt durch "Nachfrage"
  var letzteId = null;        // letztes gerenderte Todo-Id, für Auto-Scroll bei neuer Nachricht

  function kurztitel(t) { t = String(t).replace(/\s+/g, " ").trim(); return t.length > 140 ? t.slice(0, 139) + "…" : t; }

  function ccStatus(msg) { if (!statusEl) return; statusEl.style.display = msg ? "block" : "none"; statusEl.textContent = msg || ""; }

  function fmtZeit(isoStr) {
    if (!isoStr) return "";
    var d = new Date(isoStr); if (isNaN(d)) return "";
    var heute = new Date(); var istHeute = d.toDateString() === heute.toDateString();
    return d.toLocaleString("de-DE", istHeute ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function chip(wer) { return '<span class="chip ' + esc(wer || "alle") + '">' + esc(wer || "?") + "</span>"; }

  function bubble(id, v) {
    var st = v.s11status || (v.done ? "fertig" : "wartet");
    var STATUS_TXT = { wartet: "wartet", laeuft: "läuft seit " + fmtZeit(v.angefordertAm || v.created), fertig: "fertig", fehler: "Fehler", abgebrochen: "abgebrochen" };
    var text = v.chatNachricht != null ? v.chatNachricht : (v.beschreibung || v.text || "");
    var html = '<li class="ccMsg" data-id="' + esc(id) + '">' +
      '<div class="ccMeta">' + chip(v.angefordertVon || v.wer) + '<span>' + fmtZeit(v.angefordertAm || v.created) + "</span></div>" +
      '<div class="ccText">' + esc(text) + "</div>" +
      '<div class="ccStatusRow"><span class="ccStatus" data-s="' + esc(st) + '"><span class="ccDot"></span>' + esc(STATUS_TXT[st] || st) + "</span></div>";

    if (st === "laeuft" && v.s11fortschritt) {
      html += '<details class="ccFortschritt"><summary></summary><pre class="ccPre">' + esc(v.s11fortschritt) + "</pre></details>";
    }
    if ((st === "fertig" || st === "fehler") && v.s11ergebnis) {
      html += '<div class="ccAntwort"><div class="ccAntwortLabel">' + (st === "fehler" ? "Antwort (mit Fehler beendet)" : "Antwort") + '</div><div class="ccAntwortText">' + esc(v.s11ergebnis) + "</div></div>";
    }

    var btns = "";
    if ((st === "fertig" || st === "fehler") && v.s11ergebnis) {
      btns += '<button type="button" class="ccBtn ccNachfrage" data-act="nachfrage">Nachfrage</button>';
    }
    if ((st === "wartet" || st === "laeuft") && v.angefordertVon === me()) {
      btns += '<button type="button" class="ccBtn ccAbbrechen" data-act="abbrechen">Abbrechen</button>';
    }
    if (btns) html += '<div class="ccBtnRow">' + btns + "</div>";

    html += "</li>";
    return html;
  }

  function render(docs) {
    var rows = docs.map(function (d) { var v = d.data(); v = v || {}; return { id: d.id, v: v }; })
      .filter(function (r) { return r.v.typ === "claude" && r.v.quelle === "chat"; })
      .sort(function (a, b) { return String(a.v.angefordertAm || a.v.created || "").localeCompare(String(b.v.angefordertAm || b.v.created || "")); });
    if (!rows.length) { verlaufEl.innerHTML = '<li class="empty">Noch keine Nachrichten — unten die erste Aufgabe schreiben oder diktieren.</li>'; return; }
    verlaufEl.innerHTML = rows.map(function (r) { return bubble(r.id, r.v); }).join("");
    var neuId = rows[rows.length - 1].id;
    if (neuId !== letzteId) { letzteId = neuId; verlaufEl.scrollTop = verlaufEl.scrollHeight; }
  }

  // chatNachricht = was in der Sprechblase steht (die eigene, kurze Nachricht — bei einer
  // Nachfrage NUR die neue Frage, ohne den mitgeschickten Kontext). beschreibung = was Claude
  // tatsächlich bekommt (bei Nachfragen mit voriger Frage+Antwort als Kontext davor).
  function senden(chatNachricht, beschreibung, ziel) {
    if (!db) { ccStatus("Keine Verbindung zur Datenbank — kurz warten und noch einmal senden."); return; }
    var wer = me();
    if (wer !== "LES" && wer !== "JB") { ccStatus("Nur LES und JB können Claude hier Aufgaben geben."); return; }
    var jetzt = iso();
    db.collection("todos").add({
      text: kurztitel(chatNachricht),
      beschreibung: beschreibung,
      chatNachricht: chatNachricht,
      prio: 2, wer: "Claude", typ: "claude", ziel: ziel || "egal", quelle: "chat",
      done: false, created: jetzt,
      angefordert: true, angefordertVon: wer, angefordertAm: jetzt
    }).then(function () {
      ccStatus(""); replyTo = null; replyBarEl.classList.add("hidden");
    }).catch(function () { ccStatus("Senden fehlgeschlagen — kurz warten und noch einmal versuchen."); });
  }

  function mitKontext(neu, ctx) {
    var alt = String(ctx.antwort || "").trim(); if (alt.length > 1500) alt = alt.slice(0, 1500) + " …(gekürzt)";
    return "Vorherige Anfrage: " + ctx.frage + "\nVorherige Antwort:\n" + alt + "\n\nNeue Anfrage (Nachfrage im selben Gespräch):\n" + neu;
  }

  function wire() {
    formEl.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var t = inputEl.value.trim(); if (!t) return;
      var beschr = replyTo ? mitKontext(t, replyTo) : t;
      senden(t, beschr, zielEl.value, replyTo);
      inputEl.value = "";
    });
    document.getElementById("claudeChatCard").querySelectorAll(".ccQuickBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.cmd === "stand") {
          senden("Stand?", "Kurzer Lagebericht: aktuellster Stand aus LOG.md/STAND.md im Repo (oberste Einträge) sowie laufende Prozesse/Aufträge auf Schnitt 11. Antworte mit höchstens 10 Zeilen, klar und ohne Fachjargon.", "schnitt11");
        } else if (b.dataset.cmd === "laeuft") {
          senden("Was läuft gerade?", "Welche Claude-Läufe (Sitzung oder unbeaufsichtigt) sind gerade auf Schnitt 11 aktiv, und welche Claude-Aufgaben aus dem Leitstand sind gerade angefordert oder in Arbeit? Höchstens 10 Zeilen.", "schnitt11");
        }
      });
    });
    verlaufEl.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-act]"); if (!b) return;
      var li = b.closest("li.ccMsg"); if (!li) return;
      var id = li.dataset.id;
      if (b.dataset.act === "abbrechen") {
        if (!db) return;
        db.collection("todos").doc(id).update({ angefordert: false, s11status: "abgebrochen", s11beendetAm: iso() }).catch(function () { ccStatus("Abbrechen fehlgeschlagen — kurz warten und noch einmal versuchen."); });
        return;
      }
      if (b.dataset.act === "nachfrage") {
        var frageEl = li.querySelector(".ccText"), antwortEl = li.querySelector(".ccAntwortText");
        replyTo = { id: id, frage: frageEl ? frageEl.textContent : "", antwort: antwortEl ? antwortEl.textContent : "" };
        replyTextEl.textContent = replyTo.frage;
        replyBarEl.classList.remove("hidden");
        inputEl.focus();
      }
    });
    replyBarEl.querySelector("#ccReplyCancel").addEventListener("click", function () { replyTo = null; replyBarEl.classList.add("hidden"); });
  }

  function init() {
    var host = document.getElementById("page-claude");
    if (!host) return;
    host.innerHTML = TEMPLATE;
    verlaufEl = document.getElementById("ccVerlauf");
    replyBarEl = document.getElementById("ccReplyBar");
    replyTextEl = document.getElementById("ccReplyText");
    inputEl = document.getElementById("ccInput");
    zielEl = document.getElementById("ccZiel");
    statusEl = document.getElementById("ccStatus");
    formEl = document.getElementById("ccForm");
    wire();
    if (window.claude && window.claude.use) {
      window.claude.use("db").then(function (d) {
        if (!d) { ccStatus("Board im Übergangsmodus (nur lesen) — Chat wird erst live, sobald die Datenbank eingetragen ist."); return; }
        db = d;
        db.collection("todos").onSnapshot(function (snap) { render(snap.docs); }, function () { ccStatus("Live-Verbindung verloren — Seite neu laden."); });
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
