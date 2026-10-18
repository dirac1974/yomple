/* Quiet Field 2: the first-letter cue card (print.html) and the Word Detective counts.
   Pure functions over QF_DATA, no DOM. Classic script: window.QFCue.

   QFCue.letters(text)   "Four score and seven years ago our fathers brought forth on this continent, a new nation,"
                         -> "F s a s y a o f b f o t c, a n n,"
                         One letter per word (QF_DATA.tokenize's words: whitespace and em-dashes split them),
                         the letter keeps its case, and punctuation stays where it was: commas, full stops,
                         question marks and the em-dashes ("d—w c n c—"). A hyphenated word is one word
                         ("battle-field," -> "b,").
   QFCue.lines()         [{id, n, movement, title, letters, text}] in reading order.
   QFCue.targets()       the Word Detective words: {here:[global word index...], dedicate:[...], nation:[...]}  */
(function (root) {
  "use strict";
  function D() { return root.QF_DATA || {}; }

  /* one printed word -> its letter with the punctuation around it kept */
  function letterOf(piece) {
    var m = String(piece).match(/[A-Za-z0-9]/);
    if (!m) return piece;
    var i = m.index;
    var lead = piece.slice(0, i);
    var rest = piece.slice(i + 1).replace(/[A-Za-z0-9'’-]/g, ""); // keep only trailing punctuation
    return lead + m[0] + rest;
  }

  function letters(text) {
    var out = [];
    String(text || "").split(/\s+/).forEach(function (chunk) {
      if (!chunk) return;
      // em-dashes join words with no space ("dedicate—we"): letter each side, keep the dash
      var parts = chunk.split("—");
      out.push(parts.map(function (p) { return p ? letterOf(p) : ""; }).join("—"));
    });
    return out.join(" ");
  }

  function lines() {
    return (D().lanterns || []).map(function (L) {
      return { id: L.id, n: L.n, movement: L.movement, title: L.title, letters: letters(L.text), text: L.text };
    });
  }

  /* Word Detective. Counted over QF_DATA.tokenize's words with QF_DATA.bare() (letters only, lower case):
     "here" = bare word exactly "here" (8: g7, g10, g11 x2, g12, g13, g14, g16).
     "dedicate" = bare word "dedicate" OR "dedicated" (6: dedicated g2, dedicated g4, dedicate g6,
       dedicate g9, dedicated g12, dedicated g14). Both forms count, as one family.
     "nation" = bare word exactly "nation" (5: g1, g3, g4, g7, g17). */
  var RULES = {
    here: function (b) { return b === "here"; },
    dedicate: function (b) { return b === "dedicate" || b === "dedicated"; },
    nation: function (b) { return b === "nation"; }
  };
  var EXPECT = { here: 8, dedicate: 6, nation: 5 };

  function targets() {
    var d = D(), out = { here: [], dedicate: [], nation: [] };
    var words = d.tokenize ? d.tokenize(d.text) : [];
    words.forEach(function (w, i) {
      var b = d.bare ? d.bare(w) : String(w).toLowerCase().replace(/[^a-z]/g, "");
      Object.keys(RULES).forEach(function (k) { if (RULES[k](b)) out[k].push(i); });
    });
    return out;
  }
  function kindOf(word) {
    var d = D(), b = d.bare ? d.bare(word) : String(word).toLowerCase().replace(/[^a-z]/g, "");
    for (var k in RULES) if (RULES[k](b)) return k;
    return null;
  }

  root.QFCue = { letters: letters, letterOf: letterOf, lines: lines, targets: targets, kindOf: kindOf, EXPECT: EXPECT };
})(typeof window !== "undefined" ? window : this);
