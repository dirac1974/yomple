/* Quiet Field 2: Field Notes. One true, primary-source-backed card per lantern, found when that
   lantern is first lit. Every fact and its sources: docs/quiet-field/field-notes-sources.md.
   Classic script: window.QFNotes.

   QFNotes.all()          18 x {id, lantern, n, title, text}, in road order (n1-n3 are QF_DATA.notes)
   QFNotes.forLantern(id) one note
   QFNotes.found()        {g1:true, ...} lanterns whose note is found (= lit, now or ever)
   QFNotes.unseen()       found notes she has not opened the Field Notes screen on yet
   QFNotes.show()         paint and open the Field Notes screen (built on first use)

   Recognition and reading only: nothing here records evidence or changes a lantern.          */
(function (root) {
  "use strict";

  /* n1-n3 live in lanterns.js (checked first). These fifteen were added with sources. */
  var MORE = [
    { id: "n4", lantern: "g2", title: "Words from 1776",
      text: "“All men are created equal” comes from the Declaration of Independence of 1776. Lincoln opens by pointing back to it: eighty-seven years before, the nation began with that promise." },
    { id: "n5", lantern: "g3", title: "No foolish things",
      text: "The night before, a crowd came to the Wills House, where Lincoln was staying, and called for a speech. He told them, “I have no speech to make. In my position it is somewhat important that I should not say any foolish things.” A voice called out, “If you can help it.”" },
    { id: "n6", lantern: "g4", title: "On horseback",
      text: "On the day of the speech the procession set off along Baltimore Street toward the new cemetery, and Lincoln rode in it on horseback." },
    { id: "n7", lantern: "g5", title: "Three days in July",
      text: "The Battle of Gettysburg was fought on July 1, 2 and 3, 1863, four and a half months before Lincoln spoke. It is the largest battle ever fought in North America." },
    { id: "n8", lantern: "g6", title: "A few appropriate remarks",
      text: "Lincoln was not asked to give the main speech. On November 2, 1863, David Wills wrote inviting him, after the oration, to “formally set apart these grounds” with “a few appropriate remarks.”" },
    { id: "n9", lantern: "g7", title: "Side by side",
      text: "The soldiers’ graves are laid out in wide curved rows, grouped by state, and officers and ordinary soldiers lie side by side. When Lincoln spoke, the reburials had begun only about three weeks before. They went on until March 1864." },
    { id: "n10", lantern: "g9", title: "Hallow and Halloween",
      text: "To hallow means to make holy. Halloween comes from the same word: All Hallows’ Eve, the evening before All Saints’ Day. So Lincoln is saying: we can not make this ground holy. The next line tells you who already did." },
    { id: "n11", lantern: "g10", title: "A tiny figure in the crowd",
      text: "Only one photograph is known that probably shows Lincoln at Gettysburg that day. He is a tiny figure in the crowd, about three hours before he spoke. Josephine Cobb of the National Archives spotted him in 1952 while studying the old glass negative." },
    { id: "n12", lantern: "g12", title: "A town full to bursting",
      text: "About 2,400 people lived in Gettysburg. About 15,000 came to the dedication, more than six times the whole town." },
    { id: "n13", lantern: "g13", title: "They who fought here",
      text: "More than 165,000 soldiers, Union and Confederate, fought across the fields, hills and ridges around Gettysburg: nearly seventy times as many people as lived in the town." },
    { id: "n14", lantern: "g14", title: "One long last sentence",
      text: "The whole address is only ten sentences. The last one is by far the longest: it starts at “It is rather for us” and runs all the way to “perish from the earth.” That is lanterns 14 to 18, eighty-two words, held together by dashes." },
    { id: "n15", lantern: "g15", title: "Written to help soldiers",
      text: "The copy you are learning is the Bliss copy. Lincoln wrote it out in 1864 for a book sold at a fair in Baltimore to raise money to help Union soldiers. It is the only copy he signed." },
    { id: "n16", lantern: "g16", title: "Not on an envelope",
      text: "A famous story says Lincoln scribbled the speech on the back of an envelope on the train. It is a myth, made popular by a story printed in 1906. His earliest copy is partly in ink on Executive Mansion (White House) paper and partly in pencil, and he finished it at the Wills House." },
    { id: "n17", lantern: "g17", title: "Under God",
      text: "“Under God” is not in Lincoln’s two earliest copies. But reporters at the cemetery wrote it down as they heard him that day, and it is in all three copies he wrote afterwards. Some historians think he added it as he spoke." },
    { id: "n18", lantern: "g18", title: "Carved in stone",
      text: "The Gettysburg Address is carved into the south wall of the Lincoln Memorial in Washington, D.C. The words on the wall are the Bliss copy: the very words you are learning." }
  ];

  function D() { return root.QF_DATA || {}; }
  var cache = null;
  function all() {
    if (cache) return cache;
    var d = D(), byLantern = {};
    (d.notes || []).concat(MORE).forEach(function (nt) { if (!byLantern[nt.lantern]) byLantern[nt.lantern] = nt; });
    cache = (d.lanterns || []).map(function (L) {
      var nt = byLantern[L.id];
      return nt ? { id: nt.id, lantern: L.id, n: L.n, title: nt.title, text: nt.text } : null;
    }).filter(Boolean);
    return cache;
  }
  function forLantern(id) { return all().filter(function (x) { return x.lantern === id; })[0] || null; }

  function funQ() {
    try {
      var p = root.getActiveProfile && root.getActiveProfile();
      if (!p || !root.store) return null;
      if (!store.fun) store.fun = {};
      if (!store.fun[p.id]) store.fun[p.id] = {};
      if (!store.fun[p.id].qf2 || typeof store.fun[p.id].qf2 !== "object") store.fun[p.id].qf2 = {};
      return store.fun[p.id].qf2;
    } catch (e) { return null; }
  }
  /* found = the lantern is lit now (display level never goes down) or was ever recorded as lit */
  function found() {
    var out = {}, q = funQ() || {}, ever = Array.isArray(q.lit) ? q.lit : [];
    all().forEach(function (nt) {
      var it = null;
      try { it = root.QF && QF.item ? QF.item(nt.lantern) : null; } catch (e) {}
      if ((it && it.lit) || ever.indexOf(nt.lantern) >= 0) out[nt.lantern] = true;
    });
    return out;
  }
  function seenList() { var q = funQ(); return (q && Array.isArray(q.notesSeen)) ? q.notesSeen : []; }
  function unseen() {
    var f = found(), seen = seenList();
    return all().filter(function (nt) { return f[nt.lantern] && seen.indexOf(nt.lantern) < 0; }).map(function (nt) { return nt.lantern; });
  }
  function markSeen(ids) {
    var q = funQ(); if (!q || !ids.length) return;
    if (!Array.isArray(q.notesSeen)) q.notesSeen = [];
    ids.forEach(function (id) { if (q.notesSeen.indexOf(id) < 0) q.notesSeen.push(id); });
    if (typeof root.saveStore === "function") root.saveStore();
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function ensureScreen() {
    var el = document.getElementById("screen-notes");
    if (el) return el;
    el = document.createElement("section");
    el.id = "screen-notes";
    el.className = "screen screen-plain";
    el.innerHTML = "<div class='plain-wrap wide'><header class='plain-head row'><div><p class='eyebrow'>Collected on the road</p><h1>Field Notes</h1></div>" +
      "<button class='btn' data-go='path'>The path</button></header><p class='aids-sub' id='notes-count'></p><div class='notes-grid' id='notes-grid'></div></div>";
    el.querySelector("[data-go=path]").onclick = function () { if (typeof root.showPath === "function") root.showPath(); };
    var anchor = document.getElementById("screen-path");
    (anchor && anchor.parentNode ? anchor.parentNode : document.body).insertBefore(el, anchor ? anchor.nextSibling : null);
    return el;
  }

  function show() {
    if (typeof root.stopVoice === "function") { try { root.stopVoice(); } catch (e) {} }
    ensureScreen();
    if (typeof root.showScreen === "function") root.showScreen("screen-notes");
    var f = found(), fresh = unseen(), list = all(), got = 0;
    var html = list.map(function (nt) {
      var L = D().byId ? D().byId[nt.lantern] : null;
      if (!f[nt.lantern]) {
        return "<article class='fnote locked' aria-label='A note not yet found'>" +
          "<div class='fnote-seal' aria-hidden='true'></div>" +
          "<p class='fnote-kick'>Lantern " + nt.n + "</p><h2>" + esc(L ? L.title : "") + "</h2>" +
          "<p class='fnote-wait'>Found when this lantern is lit.</p></article>";
      }
      got++;
      var isNew = fresh.indexOf(nt.lantern) >= 0;
      return "<article class='fnote" + (isNew ? " new" : "") + "'>" +
        "<div class='fnote-pic'>" + (root.QFPictures ? QFPictures.svg(nt.lantern, { label: false }) : "") + "</div>" +
        "<p class='fnote-kick'>Lantern " + nt.n + " · " + esc(L ? L.title : "") + (isNew ? " <span class='fnote-new'>new</span>" : "") + "</p>" +
        "<h2>" + esc(nt.title) + "</h2><p class='fnote-text'>" + esc(nt.text) + "</p></article>";
    }).join("");
    document.getElementById("notes-grid").innerHTML = html;
    document.getElementById("notes-count").textContent = got
      ? (got === list.length ? "All eighteen notes found." : got + " of " + list.length + " notes found. Each lantern you light brings one more.")
      : "Light a lantern to find its note.";
    markSeen(fresh);
  }

  root.QFNotes = { all: all, forLantern: forLantern, found: found, unseen: unseen, show: show, MORE: MORE };
})(typeof window !== "undefined" ? window : this);
