/* Quiet Field 2: Word Detective. An optional quest on the Path screen, open once every lantern of
   Movement II is lit. She taps words in the full text: every "here" (8), every "dedicate" or
   "dedicated" (6, one family: see QFCue.targets in cuecard.js) and every "nation" (5). Each find
   inks gold; finishing a word gives its memory hook.

   Recognition only: it NEVER calls QF.record, never touches progress.qf2 and never changes a
   lantern. Progress lives in store.fun[pid].qf2.detective = {here:[word index], dedicate:[], nation:[],
   done:{here:'YYYY-MM-DD'}} and is saved with saveStore(). A tap on any other word does nothing.
   Classic script: window.QFDetective.                                                              */
(function (root) {
  "use strict";
  var KINDS = [
    { k: "here", label: "here", hook: "“Here” is said 8 times: the speech keeps pointing at the ground they stand on." },
    { k: "dedicate", label: "dedicate, dedicated", hook: "“Dedicate” comes 6 times: first the nation was dedicated, then this field, and at the end it is us, the living, who must be dedicated." },
    { k: "nation", label: "nation", hook: "“Nation” comes 5 times: born in the first line, tested in the middle, given a new birth near the end." }
  ];
  function D() { return root.QF_DATA || {}; }
  function today() { try { return QF.today(); } catch (e) { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); } }

  function unlocked() {
    try {
      var mv = QF.movements().filter(function (m) { return m.n === 2; })[0];
      return !!mv && mv.ids.every(function (id) { return (QF.item(id) || {}).lit; });
    } catch (e) { return false; }
  }
  function state() {
    var p = root.getActiveProfile && root.getActiveProfile();
    if (!p || !root.store) return null;
    if (!store.fun) store.fun = {};
    if (!store.fun[p.id]) store.fun[p.id] = {};
    var f = store.fun[p.id];
    if (!f.qf2 || typeof f.qf2 !== "object") f.qf2 = {};
    var d = f.qf2.detective;
    if (!d || typeof d !== "object") d = f.qf2.detective = {};
    KINDS.forEach(function (K) { if (!Array.isArray(d[K.k])) d[K.k] = []; });
    if (!d.done || typeof d.done !== "object") d.done = {};
    return d;
  }
  function progress() {
    var d = state() || {}, t = root.QFCue ? QFCue.targets() : {};
    var out = {};
    KINDS.forEach(function (K) {
      var want = t[K.k] || [], got = (d[K.k] || []).filter(function (i) { return want.indexOf(i) >= 0; });
      out[K.k] = { found: got.length, of: want.length, done: want.length > 0 && got.length === want.length };
    });
    return out;
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function words(L) { return (root.Games && Games.displayWords) ? Games.displayWords(L.text, L.words) : L.words; }

  function ensureScreen() {
    var el = document.getElementById("screen-detective");
    if (el) return el;
    el = document.createElement("section");
    el.id = "screen-detective";
    el.className = "screen screen-plain";
    el.innerHTML = "<div class='plain-wrap wide'><header class='plain-head row'><div><p class='eyebrow'>A quest on the road</p><h1>Word Detective</h1></div>" +
      "<button class='btn' data-go='path'>The path</button></header>" +
      "<p class='aids-sub'>Three words keep coming back. Tap every one you can find in the whole address.</p>" +
      "<div class='det-tally' id='det-tally'></div><div class='det-hooks' id='det-hooks' aria-live='polite'></div>" +
      "<div class='det-text' id='det-text'></div></div>";
    el.querySelector("[data-go=path]").onclick = function () { if (typeof root.showPath === "function") root.showPath(); };
    el.querySelector("#det-text").addEventListener("click", onTap);
    var anchor = document.getElementById("screen-path");
    (anchor && anchor.parentNode ? anchor.parentNode : document.body).insertBefore(el, anchor ? anchor.nextSibling : null);
    return el;
  }

  function paintTally(justDone) {
    var pr = progress();
    document.getElementById("det-tally").innerHTML = KINDS.map(function (K) {
      var p = pr[K.k];
      var dots = "";
      for (var i = 0; i < p.of; i++) dots += "<span class='det-dot" + (i < p.found ? " on" : "") + "'></span>";
      return "<div class='det-word" + (p.done ? " done" : "") + "'><span class='det-name'>" + esc(K.label) + "</span>" +
        "<span class='det-dots' aria-label='" + p.found + " of " + p.of + " found'>" + dots + "</span></div>";
    }).join("");
    document.getElementById("det-hooks").innerHTML = KINDS.filter(function (K) { return pr[K.k].done; }).map(function (K) {
      return "<p class='det-hook" + (justDone === K.k ? " fresh" : "") + "'>" + esc(K.hook) + "</p>";
    }).join("");
  }

  function show() {
    if (typeof root.stopVoice === "function") { try { root.stopVoice(); } catch (e) {} }
    ensureScreen();
    if (typeof root.showScreen === "function") root.showScreen("screen-detective");
    var d = state() || {}, mvName = {}, html = "", lastMv = 0;
    (D().movements || []).forEach(function (m) { mvName[m.n] = m.name; });
    (D().lanterns || []).forEach(function (L) {
      if (L.movement !== lastMv) {
        if (lastMv) html += "</p>";
        html += "<p class='det-mv'><span class='mv-name'>" + ["", "I", "II", "III"][L.movement] + ". " + esc(mvName[L.movement] || "") + "</span>";
        lastMv = L.movement;
      }
      words(L).forEach(function (w, j) {
        var g = L.w0 + j, kind = root.QFCue ? QFCue.kindOf(w) : null;
        var got = kind && (d[kind] || []).indexOf(g) >= 0;
        html += "<span class='dw" + (got ? " found" : "") + "' data-g='" + g + "'>" + esc(w) + "</span>" + (/—$/.test(w) ? "" : " ");
      });
    });
    document.getElementById("det-text").innerHTML = html + "</p>";
    paintTally();
  }

  /* one find: word index g (global, QF_DATA.tokenize order) holding the printed word w.
     -> {kind, found, of, justDone} or null when it is not a target. Saves fun.qf2.detective only. */
  function find(g, w) {
    var kind = root.QFCue ? QFCue.kindOf(w) : null;
    if (!kind) return null;
    var t = QFCue.targets()[kind] || [];
    if (t.indexOf(g) < 0) return null;
    var d = state(); if (!d) return null;
    if (d[kind].indexOf(g) < 0) d[kind].push(g);
    var p = progress()[kind], justDone = false;
    if (p.done && !d.done[kind]) { d.done[kind] = today(); justDone = true; }
    if (typeof root.saveStore === "function") root.saveStore();
    return { kind: kind, found: p.found, of: p.of, justDone: justDone };
  }

  function onTap(e) {
    var s = e.target && e.target.closest ? e.target.closest(".dw") : null;
    if (!s || s.classList.contains("found")) return;
    var r = find(+s.getAttribute("data-g"), s.textContent);
    if (!r) return; /* any other word: nothing happens, nothing is wrong */
    s.classList.add("found");
    try { if (root.Juice) { if (r.justDone) Juice.bell(); else Juice.tick(r.found - 1, r.of); } } catch (err) {}
    paintTally(r.justDone ? r.kind : null);
  }

  root.QFDetective = { show: show, unlocked: unlocked, progress: progress, find: find, KINDS: KINDS };
})(typeof window !== "undefined" ? window : this);
