/* Quiet Field 2: memory aids and collectibles, wired into the screens app.js draws.
   app.js calls two hooks (marked "memory aids hook" there):
     Aids.sheet(o)   after every sheet() paint: shows the lantern's picture next to its title on the
                     ladder, cold recall and night walk cards (rung 4 is "title + picture").
     Aids.path(box)  after the Path list is drawn: a picture per station, and the Field Notes,
                     Word Detective and cue card tiles.
   The picture is painted once per card and never re-rendered while she types. Classic script.      */
(function (root) {
  "use strict";
  function D() { return root.QF_DATA || {}; }
  function byTitle(t) { return (D().lanterns || []).filter(function (L) { return L.title === t; })[0] || null; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function sheet(o) {
    try {
      var head = document.querySelector("#sheet .sheet-head");
      if (!head) return;
      var box = document.getElementById("sheet-pic");
      var L = (o && /\b(ladder|cold|walk)\b/.test(o.cls || "")) ? byTitle(o.title) : null;
      if (!L || !root.QFPictures) { if (box) { box.hidden = true; box.removeAttribute("data-id"); } return; }
      if (!box) {
        box = document.createElement("div");
        box.id = "sheet-pic";
        box.className = "sheet-pic";
        head.appendChild(box);
      }
      box.hidden = false;
      if (box.getAttribute("data-id") !== L.id) {
        box.innerHTML = QFPictures.svg(L.id, { label: false });
        box.setAttribute("data-id", L.id);
        box.title = QFPictures.caption(L.id);
      }
    } catch (e) {}
  }

  function idOf(li) {
    var b = li.querySelector("button");
    var m = b && String(b.getAttribute("onclick") || "").match(/'(g\d+)'/);
    return m ? m[1] : null;
  }

  function path(box) {
    try {
      if (!box) return;
      if (root.QFPictures) {
        Array.prototype.forEach.call(box.querySelectorAll(".station"), function (li) {
          var id = idOf(li);
          if (!id || li.querySelector(".st-pic")) return;
          var span = document.createElement("span");
          span.className = "st-pic";
          span.innerHTML = QFPictures.svg(id, { label: false });
          var body = li.querySelector(".st-body");
          if (body) body.parentNode.insertBefore(span, body);
        });
      }
      var old = document.getElementById("aids-tiles");
      if (old) old.parentNode.removeChild(old);
      var tiles = document.createElement("div");
      tiles.id = "aids-tiles";
      tiles.className = "aids-tiles";

      var notes = root.QFNotes ? QFNotes : null, nf = 0, fresh = 0, total = 18;
      if (notes) { var f = notes.found(); nf = Object.keys(f).length; fresh = notes.unseen().length; total = notes.all().length; }
      var det = root.QFDetective ? QFDetective : null, open = det && det.unlocked(), dp = det ? det.progress() : {};
      var dfound = 0, dof = 0;
      Object.keys(dp).forEach(function (k) { dfound += dp[k].found; dof += dp[k].of; });

      tiles.innerHTML =
        "<button class='aids-tile' id='tile-notes'><span class='at-k'>Field Notes</span>" +
        "<span class='at-v'>" + nf + " of " + total + " found" + (fresh ? " <span class='fnote-new'>" + fresh + " new</span>" : "") + "</span></button>" +
        "<button class='aids-tile' id='tile-detective'" + (open ? "" : " disabled") + "><span class='at-k'>Word Detective</span>" +
        "<span class='at-v'>" + (open ? (dfound === dof && dof ? "Case closed" : dfound + " of " + dof + " words found") : "Opens when Movement II is lit") + "</span></button>" +
        "<a class='aids-tile' id='tile-print' href='print.html'><span class='at-k'>Cue card</span><span class='at-v'>Print the first letters</span></a>";
      box.parentNode.insertBefore(tiles, box);
      tiles.querySelector("#tile-notes").onclick = function () { if (notes) notes.show(); };
      tiles.querySelector("#tile-detective").onclick = function () { if (det && det.unlocked()) det.show(); };
    } catch (e) {}
  }

  root.Aids = { sheet: sheet, path: path };
})(typeof window !== "undefined" ? window : this);
