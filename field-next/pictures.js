/* Quiet Field 2: eighteen small engravings, one per lantern. Classic script: window.QFPictures.

   QFPictures.svg(id, {size, label})  -> inline <svg> string (120 x 90 viewBox, ink on transparent).
     size: CSS width in px (height follows 3:4); omit to fill the container.
     label: false to hide it from screen readers (when the title is already beside it).
   QFPictures.caption(id)             -> one line saying what the picture shows (alt text, print).
   QFPictures.ids                      -> ["g1".."g18"]

   Each picture is the memory hook for its words (memory-science.md section 2: the station on the walk
   and the meaning of the line, holding the hinge to the next lantern where it can). They are relevant
   cues, not decoration: if a picture stopped meaning its words it should be redrawn, not kept.
   Style: museum engraving. Ink #2a2016, 1.5 px strokes, hatching for shade, no text, no faces,
   nothing animated (she types beside them).                                                         */
(function (root) {
  "use strict";
  var INK = "#2a2016";
  var uid = 0;

  /* ---------- a small engraver's kit (all coordinates in the 120 x 90 box) ---------- */
  function n(v) { return Math.round(v * 10) / 10; }
  function P(d, extra) { return '<path d="' + d + '"' + (extra ? " " + extra : "") + "/>"; }
  function L(x1, y1, x2, y2, extra) { return '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '"' + (extra ? " " + extra : "") + "/>"; }
  function C(cx, cy, r, extra) { return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '"' + (extra ? " " + extra : "") + "/>"; }
  var PAPER = 'style="fill:var(--qf-pic-bg,#ebdcb9)"';
  var HATCH = 'fill="url(#@h)"', CROSS = 'fill="url(#@x)"', SOLID = 'fill="' + INK + '"', THIN = 'stroke-width=".9"', FAINT = 'stroke-width=".8" opacity=".55"';

  /* ground: a line with a few engraver's flicks under it */
  function ground(y, x0, x1, seed) {
    x0 = x0 == null ? 6 : x0; x1 = x1 == null ? 114 : x1;
    var s = L(x0, y, x1, y), r = seed || 3;
    for (var x = x0 + 4; x < x1 - 6; x += 9) {
      r = (r * 37 + 11) % 23;
      var w = 4 + (r % 4), dy = 3 + (r % 3) * 1.6;
      s += L(x + r % 5, y + dy, x + r % 5 + w, y + dy, FAINT);
    }
    return s;
  }

  /* a standing person seen from a distance: no face, a hat that says who they are */
  function person(x, y, h, o) {
    o = o || {};
    var k = h / 26, s = "";
    var hy = y - 23 * k, sh = y - 19.5 * k, hem = y - (o.skirt ? 1.5 : 8) * k;
    s += C(x, hy, 2.6 * k, SOLID);
    if (o.skirt) {
      var dress = "M" + n(x - 3.2 * k) + "," + n(sh) + " L" + n(x + 3.2 * k) + "," + n(sh) + " L" + n(x + 6.2 * k) + "," + n(hem) + " L" + n(x - 6.2 * k) + "," + n(hem) + " Z";
      s += P(dress, PAPER) + P(dress, HATCH);
    } else {
      var coat = "M" + n(x - 3.5 * k) + "," + n(sh) + " L" + n(x + 3.5 * k) + "," + n(sh) + " L" + n(x + 4.2 * k) + "," + n(hem) + " L" + n(x - 4.2 * k) + "," + n(hem) + " Z";
      s += P(coat, PAPER) + P(coat, HATCH);
      s += L(x - 1.7 * k, hem, x - 2 * k, y) + L(x + 1.7 * k, hem, x + 2 * k, y);
    }
    /* a raised arm ends in an open hand, so it never reads as a rifle */
    function hand(sx) { return '<ellipse cx="' + n(x + sx * 5.9 * k) + '" cy="' + n(y - 34.2 * k) + '" rx="' + n(1.15 * k) + '" ry="' + n(1.7 * k) + '" fill="' + INK + '" stroke-width="1"/>'; }
    if (o.armUp === "right" || o.armUp === "both") s += L(x + 3.2 * k, sh + 1 * k, x + 5.6 * k, y - 32.6 * k) + hand(1);
    if (o.armUp === "both") s += L(x - 3.2 * k, sh + 1 * k, x - 5.6 * k, y - 32.6 * k) + hand(-1);
    var t = y - 25.4 * k;
    if (o.hat === "top") s += P("M" + n(x - 2.3 * k) + "," + n(t) + " L" + n(x - 2.1 * k) + "," + n(t - 5.4 * k) + " L" + n(x + 2.1 * k) + "," + n(t - 5.4 * k) + " L" + n(x + 2.3 * k) + "," + n(t) + " Z", SOLID) + L(x - 3.8 * k, t, x + 3.8 * k, t);
    if (o.hat === "tricorn") s += P("M" + n(x - 4.6 * k) + "," + n(t + .3 * k) + " Q" + n(x) + "," + n(t - 6.5 * k) + " " + n(x + 4.6 * k) + "," + n(t + .3 * k) + " Q" + n(x) + "," + n(t - 2 * k) + " " + n(x - 4.6 * k) + "," + n(t + .3 * k) + " Z", SOLID);
    if (o.hat === "kepi") s += P("M" + n(x - 2.6 * k) + "," + n(t + .6 * k) + " L" + n(x - 2 * k) + "," + n(t - 3.2 * k) + " L" + n(x + 2.6 * k) + "," + n(t - 2.2 * k) + " L" + n(x + 2.6 * k) + "," + n(t + .6 * k) + " Z", SOLID) + L(x + 2.6 * k, t + .6 * k, x + 4.4 * k, t + 1.2 * k);
    if (o.hat === "bonnet") s += P("M" + n(x - 3.4 * k) + "," + n(hy + 2 * k) + " Q" + n(x - 4.2 * k) + "," + n(hy - 5.2 * k) + " " + n(x + 1 * k) + "," + n(hy - 4.4 * k) + " Q" + n(x + 4.6 * k) + "," + n(hy - 3 * k) + " " + n(x + 3.8 * k) + "," + n(hy + 1.6 * k), HATCH);
    return s;
  }

  /* a hand lantern, like the posts on the road */
  function lantern(x, y, s, flame) {
    var k = s;
    var out = P("M" + n(x - 5 * k) + "," + n(y - 18 * k) + " L" + n(x) + "," + n(y - 23 * k) + " L" + n(x + 5 * k) + "," + n(y - 18 * k) + " Z", SOLID);
    out += P("M" + n(x - 4.4 * k) + "," + n(y - 17.5 * k) + " L" + n(x + 4.4 * k) + "," + n(y - 17.5 * k) + " L" + n(x + 3.4 * k) + "," + n(y - 3 * k) + " L" + n(x - 3.4 * k) + "," + n(y - 3 * k) + " Z");
    out += P("M" + n(x - 4.6 * k) + "," + n(y - 3 * k) + " L" + n(x + 4.6 * k) + "," + n(y - 3 * k) + " L" + n(x + 4.6 * k) + "," + n(y) + " L" + n(x - 4.6 * k) + "," + n(y) + " Z", SOLID);
    if (flame) out += P("M" + n(x) + "," + n(y - 15 * k) + " C" + n(x + 2.6 * k) + "," + n(y - 11 * k) + " " + n(x + 2.2 * k) + "," + n(y - 6.4 * k) + " " + n(x) + "," + n(y - 6 * k) + " C" + n(x - 2.2 * k) + "," + n(y - 6.4 * k) + " " + n(x - 2.6 * k) + "," + n(y - 11 * k) + " " + n(x) + "," + n(y - 15 * k) + " Z", SOLID);
    return out;
  }

  /* rays from a point, as an engraver draws light */
  function rays(cx, cy, r0, r1, a0, a1, count, extra) {
    var s = "";
    for (var i = 0; i < count; i++) {
      var a = (a0 + (a1 - a0) * (count === 1 ? .5 : i / (count - 1))) * Math.PI / 180;
      s += L(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, extra || THIN);
    }
    return s;
  }

  /* a dressed stone, slightly irregular */
  function stone(x, y, w, h, fill, j) {
    j = j || 0;
    var a = .9 + (j % 3) * .5, b = .6 + ((j * 7) % 4) * .4;
    return P("M" + n(x + a) + "," + n(y) + " L" + n(x + w - b) + "," + n(y + .4) + " Q" + n(x + w) + "," + n(y + .5) + " " + n(x + w) + "," + n(y + 2) +
      " L" + n(x + w - .3) + "," + n(y + h - 1) + " Q" + n(x + w - .4) + "," + n(y + h) + " " + n(x + w - 2) + "," + n(y + h) +
      " L" + n(x + 1.6) + "," + n(y + h - .3) + " Q" + n(x) + "," + n(y + h - .4) + " " + n(x + .2) + "," + n(y + h - 2) +
      " L" + n(x) + "," + n(y + 1.8) + " Q" + n(x) + "," + n(y) + " " + n(x + a) + "," + n(y) + " Z", fill || "");
  }

  /* a flag on a pole: the canton cross-hatched, the stripes as ruled lines */
  function flag(px, top, w, h, wave) {
    var x0 = px, x1 = px + w, y0 = top, y1 = top + h, q = wave || 0;
    function edge(y) { return "M" + n(x0) + "," + n(y) + " C" + n(x0 + w * .33) + "," + n(y - q) + " " + n(x0 + w * .66) + "," + n(y + q) + " " + n(x1) + "," + n(y - q * .4); }
    var s = P(edge(y0) + " L" + n(x1) + "," + n(y1 - q * .4) + " C" + n(x0 + w * .66) + "," + n(y1 + q) + " " + n(x0 + w * .33) + "," + n(y1 - q) + " " + n(x0) + "," + n(y1) + " Z");
    for (var i = 1; i < 7; i++) {
      var y = y0 + h * i / 7;
      var d = edge(y);
      if (y < y0 + h * .5) d = "M" + n(x0 + w * .42) + "," + n(y - q * .55) + " C" + n(x0 + w * .6) + "," + n(y + q * .6) + " " + n(x0 + w * .8) + "," + n(y + q * .1) + " " + n(x1) + "," + n(y - q * .4);
      s += P(d, THIN);
    }
    s += P("M" + n(x0) + "," + n(y0) + " C" + n(x0 + w * .2) + "," + n(y0 - q * .7) + " " + n(x0 + w * .34) + "," + n(y0 - q * .5) + " " + n(x0 + w * .42) + "," + n(y0 - q * .2) +
      " L" + n(x0 + w * .42) + "," + n(y0 + h * .5 - q * .2) + " C" + n(x0 + w * .3) + "," + n(y0 + h * .5 - q * .5) + " " + n(x0 + w * .15) + "," + n(y0 + h * .5 - q * .6) + " " + n(x0) + "," + n(y0 + h * .5) + " Z", CROSS);
    return s;
  }

  /* ---------- the eighteen ---------- */
  var ART = {};
  var CAPTION = {};

  /* g1 Four Score Fathers. The railway depot. The founding fathers (tricorn hats) carry a newborn
     nation in a cradle across the land; its tag is the next word, "conceived". */
  CAPTION.g1 = "Two founding fathers carry a baby nation in a cradle beside the railway; a tag hangs from it.";
  ART.g1 = function () {
    var s = "";
    s += P("M6,50 Q30,42 52,48 T96,44 T114,47", FAINT);
    s += person(28, 79, 32, { hat: "tricorn" }) + person(92, 79, 32, { hat: "tricorn" });
    s += L(31.5, 57, 42, 60) + L(88.5, 57, 78, 60);
    s += P("M41,59 L79,59 Q78,71 60,71 Q42,71 41,59 Z", PAPER) + P("M41,59 L79,59 Q78,71 60,71 Q42,71 41,59 Z", HATCH);
    s += P("M41,59 Q40,47 52,46.5 Q55,52 55,59", PAPER) + P("M41,59 Q40,47 52,46.5 Q55,52 55,59", CROSS);
    s += C(59.5, 54.6, 3.4, PAPER) + P("M62.5,56.5 Q70,51 77,55.5 L78.6,59", PAPER) + L(58, 59, 78.6, 59);
    s += P("M66,55 Q68,57.6 70,55.2", THIN);
    s += L(74, 63, 75.6, 67.4, THIN) + P("M73.4,67 L79.6,66 L81.6,72.6 L75.4,73.6 Z", PAPER) + C(76.4, 68.6, .9, SOLID);
    s += L(6, 83, 114, 83) + L(6, 87.4, 114, 87.4);
    for (var x = 10; x < 114; x += 8) s += L(x, 81.4, x - 1.2, 89, 'stroke-width="2.2"');
    return s;
  };

  /* g2 All Created Equal. The Wills House. The Liberty Bell (conceived in Liberty) above a row of
     people all exactly the same height (all men are created equal), ruled level. */
  CAPTION.g2 = "The Liberty Bell hangs above a row of people who are all exactly the same height.";
  ART.g2 = function () {
    var s = "";
    s += P("M46,8 L74,8 L72,12.5 L48,12.5 Z", CROSS) + L(60, 12.5, 60, 15);
    s += P("M54,15 Q53.2,15 53,17 C52.6,25 51.6,30 46.5,35.5 L73.5,35.5 C68.4,30 67.4,25 67,17 Q66.8,15 66,15 Z", HATCH);
    s += P("M45.5,35.5 Q60,40 74.5,35.5", 'stroke-width="2"');
    s += P("M57.5,37 L58.6,32 L56.8,28 L58.2,23", 'stroke-width="1.2"');
    s += L(12, 45, 108, 45, 'stroke-dasharray="2.2 2.4" ' + THIN);
    [22, 41, 60, 79, 98].forEach(function (x) { s += person(x, 78, 30); });
    s += ground(78, 8, 112, 5);
    return s;
  };

  /* g3 The Great Test. The Diamond. A flag on its pole tested by a storm (a great civil war, testing
     whether that nation...); crossed muskets at its foot. */
  CAPTION.g3 = "A flag on a tall pole strains in a storm, with two crossed muskets at its foot.";
  ART.g3 = function () {
    var s = "";
    s += P("M70,8 Q78,2 86,7 Q94,2 102,8 Q112,8 110,15 L72,15 Q64,13 70,8 Z", HATCH);
    for (var i = 0; i < 12; i++) { var rx = 14 + (i * 23) % 96, ry = 18 + (i * 17) % 50; s += L(rx, ry, rx - 3, ry + 7, FAINT); }
    s += L(34, 82, 37, 10, 'stroke-width="2.2"') + C(37, 8.8, 1.6, SOLID);
    s += flag(37, 12, 50, 28, 7);
    s += P("M100,40 Q108,44 112,40", FAINT) + P("M96,48 Q106,53 113,47", FAINT);
    s += L(60, 84, 96, 60, 'stroke-width="1.8"') + L(96, 84, 60, 60, 'stroke-width="1.8"');
    s += P("M58,85 L63,81 L65.5,84 L61,87 Z", SOLID) + P("M98,85 L93,81 L90.5,84 L95,87 Z", SOLID);
    s += ground(82, 6, 54, 2) + L(102, 82, 114, 82);
    return s;
  };

  /* g4 Can It Endure? Baltimore Street. An old oak with deep roots stands against the wind; an
     hourglass at its foot (can long endure). */
  CAPTION.g4 = "An old oak with deep roots stands in a hard wind; an hourglass rests at its foot.";
  ART.g4 = function () {
    var s = "";
    s += P("M36,44 Q30,30 42,24 Q44,12 58,13 Q66,6 76,12 Q90,12 90,24 Q100,30 94,42 Q90,52 78,50 Q70,56 60,52 Q48,57 42,50 Q34,52 36,44 Z", CROSS);
    s += P("M56,78 L57.5,52 Q54,46 47,44 M57.5,52 L58.5,46 Q62,40 70,38 M63,78 L61.5,50 Q66,46 74,46", 'stroke-width="1.6"');
    s += P("M54,78 L56,52 L63.5,52 L66,78 Z", HATCH);
    s += P("M54,78 Q46,82 38,88 M57,78 Q54,84 50,90 M63,78 Q68,84 74,89 M66,78 Q76,81 84,86", THIN);
    s += P("M8,30 Q18,27 28,31", THIN) + P("M6,40 Q16,37 26,41", THIN) + P("M10,50 Q20,47 30,51", THIN);
    s += L(92, 66, 104, 66, 'stroke-width="1.8"') + L(92, 78, 104, 78, 'stroke-width="1.8"');
    s += P("M93.5,66.5 L102.5,66.5 L98,72 Z M98,72 L102.5,77.5 L93.5,77.5 Z");
    s += P("M95.5,77.4 L98,74.6 L100.5,77.4 Z", SOLID);
    s += ground(78, 6, 114, 7);
    return s;
  };

  /* g5 We Are Met. The hill road. People gathered on a battle-field: a cannon, a rail fence. */
  CAPTION.g5 = "Townspeople gather on a battlefield beside a cannon and a zig-zag rail fence.";
  ART.g5 = function () {
    var s = "";
    s += L(6, 58, 114, 58, THIN) + L(6, 52, 114, 52, THIN);
    for (var fp = 10; fp < 114; fp += 13) s += L(fp, 49, fp, 60, THIN);
    s += P("M18,57 L46,49.5 L47.5,53.5 L20,62 Z", CROSS) + C(47.4, 51.4, 2.2, SOLID);
    s += C(28, 68, 10) + C(28, 68, 2, SOLID);
    for (var a = 0; a < 6; a++) { var t = a * Math.PI / 3 + .3; s += L(28 + Math.cos(t) * 2, 68 + Math.sin(t) * 2, 28 + Math.cos(t) * 9.6, 68 + Math.sin(t) * 9.6, THIN); }
    s += P("M20,62 L6,78 L10,78 L23,63");
    s += person(74, 80, 28, { hat: "top" }) + person(87, 80, 26, { hat: "bonnet", skirt: true }) + person(100, 80, 27, { hat: "kepi" });
    s += ground(78.5, 6, 64, 1) + L(64, 80, 114, 80);
    return s;
  };

  /* g6 A Resting Place. The cemetery gatehouse. The arched gatehouse, and beside it a portion of the
     field marked out with stakes and a cord (to dedicate a portion of that field). */
  CAPTION.g6 = "The arched cemetery gatehouse, and beside it a piece of the field marked out with stakes and cord.";
  ART.g6 = function () {
    var s = "";
    s += P("M12,78 L12,42 L66,42 L66,78", HATCH) + L(10, 42, 68, 42, 'stroke-width="2"') + P("M14,42 L39,32 L64,42", 'fill="none"');
    s += P("M34,32 L34,24 L44,24 L44,32", HATCH) + P("M33,24 Q39,17 45,24 Z", SOLID);
    s += P("M18,78 L18,60 Q25,49 32,60 L32,78 Z", PAPER) + P("M46,78 L46,60 Q53,49 60,60 L60,78 Z", PAPER);
    s += P("M18,78 L18,60 Q25,49 32,60 L32,78 Z", CROSS) + P("M46,78 L46,60 Q53,49 60,60 L60,78 Z", CROSS);
    s += P("M36.5,58 L41.5,58 L41.5,66 L36.5,66 Z", SOLID);
    var q = [[76, 66], [108, 66], [113, 80], [72, 80]];
    s += P("M76,66 L108,66 L113,80 L72,80 Z", 'stroke-dasharray="1.6 1.8" ' + THIN);
    q.forEach(function (p, i) { s += L(p[0], p[1] + 1, p[0], p[1] - (i < 2 ? 6 : 8), 'stroke-width="2"'); });
    for (var g = 0; g < 9; g++) { var gx = 78 + (g * 13) % 30, gy = 69 + (g * 5) % 9; s += L(gx, gy, gx + 1, gy - 2, FAINT); }
    s += ground(78, 6, 70, 4);
    return s;
  };

  /* g7 That That Nation. The new graves. Low headstones in curved rows, as the national cemetery
     is laid out, and in the middle a young tree growing (that that nation might live). */
  CAPTION.g7 = "Low headstones in curved rows, and in the middle a young tree putting out new leaves.";
  ART.g7 = function () {
    var s = "";
    function row(rx, ry, cy, count, w, h) {
      var out = "";
      for (var i = 0; i < count; i++) {
        var a = Math.PI + (Math.PI * (i + .5) / count);
        var x = 60 + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
        out += P("M" + n(x - w / 2) + "," + n(y) + " L" + n(x - w / 2) + "," + n(y - h + w / 2) + " Q" + n(x) + "," + n(y - h - w * .25) + " " + n(x + w / 2) + "," + n(y - h + w / 2) + " L" + n(x + w / 2) + "," + n(y) + " Z", HATCH);
      }
      return out;
    }
    s += row(50, 20, 76, 13, 4.2, 6.4) + row(34, 13, 78, 9, 4.8, 7.4);
    s += P("M60,80 L60,50 M60,62 Q55,58 52,52 M60,56 Q65,52 68,46 M60,50 Q58,45 60,40", 'stroke-width="1.6"');
    function leaf(x, y, deg) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="3.4" ry="1.5" transform="rotate(' + deg + " " + x + " " + y + ')" fill="url(#@h)" stroke-width="1"/>'; }
    s += leaf(50.6, 50.6, 40) + leaf(69.4, 44.4, -40) + leaf(60, 37.6, 90) + leaf(54, 58.6, -30) + leaf(66.4, 52.6, 30) + leaf(57, 45, 60) + leaf(63, 47, -60);
    s += ground(80, 6, 114, 6);
    return s;
  };

  /* g8 Fitting and Proper. The stone wall. The last stone lowered into the gap that fits it exactly,
     a plumb line hanging true beside it (fitting and proper). */
  CAPTION.g8 = "A stone is lowered into the one gap in a stone wall that fits it exactly; a plumb line hangs true.";
  ART.g8 = function () {
    var s = "";
    var rows = [[58, [[8, 15], [23, 14], [37, 15], [52, 16, "gap"], [68, 15], [83, 13], [96, 16]]],
      [66, [[8, 10], [18, 16], [34, 13], [47, 15], [62, 16], [78, 14], [92, 20]]],
      [74, [[8, 17], [25, 14], [39, 16], [55, 13], [68, 15], [83, 13], [96, 16]]]];
    var j = 0;
    rows.forEach(function (r) {
      r[1].forEach(function (st) {
        j++;
        if (st[2] === "gap") { s += P("M" + st[0] + "," + r[0] + " L" + st[0] + "," + (r[0] + 8) + " L" + (st[0] + st[1]) + "," + (r[0] + 8) + " L" + (st[0] + st[1]) + "," + r[0], 'stroke-dasharray="1.2 1.6" ' + THIN); return; }
        s += stone(st[0] + .5, r[0] + .5, st[1] - 1, 7, j % 3 === 0 ? CROSS : (j % 3 === 1 ? HATCH : ""), j);
      });
    });
    s += stone(52.5, 38, 15, 7, HATCH, 4);
    s += L(54, 30, 54, 36, THIN) + L(66, 30, 66, 36, THIN) + L(60, 27, 60, 34, THIN);
    s += L(96, 10, 106, 10, 'stroke-width="2"') + L(101, 10, 101, 44, ".9");
    s += P("M101,44 L103.4,48.5 L101,54 L98.6,48.5 Z", SOLID);
    s += ground(82, 6, 114, 8);
    return s;
  };

  /* g9 Can Not Hallow. The open field. Light already rises out of the ground; in front, three
     candles that will not be lit (we can not dedicate, can not consecrate, can not hallow). */
  CAPTION.g9 = "Light rises out of an open field; in front stand three unlit candles with thin curls of smoke.";
  ART.g9 = function () {
    var s = "";
    s += L(6, 54, 114, 54);
    s += rays(60, 54, 6, 40, 192, 348, 15, FAINT) + rays(60, 54, 8, 26, 200, 340, 8, THIN);
    for (var i = -4; i <= 4; i++) s += L(60 + i * 3, 55, 60 + i * 16, 90, FAINT);
    [36, 60, 84].forEach(function (x) {
      s += P("M" + (x - 3) + ",86 L" + (x - 3) + ",70 Q" + x + ",68.6 " + (x + 3) + ",70 L" + (x + 3) + ",86 Z", PAPER);
      s += P("M" + (x - 3) + ",86 L" + (x - 3) + ",70 Q" + x + ",68.6 " + (x + 3) + ",70 L" + (x + 3) + ",86 Z", HATCH);
      s += L(x, 69.2, x, 66.4) + P("M" + x + ",65 q-2.6,-3 0,-6 t0,-6", FAINT);
      s += P("M" + (x - 6.5) + ",86.4 L" + (x + 6.5) + ",86.4", 'stroke-width="2"');
    });
    return s;
  };

  /* g10 Brave Men Consecrated. The crowd's edge. A balance: a soldier's cap weighs its pan right
     down; a writer's quill sits high and light on the other (far above our poor power to add or detract). */
  CAPTION.g10 = "A balance: a soldier's cap weighs one pan right down, while a light quill sits high on the other.";
  ART.g10 = function () {
    var s = "";
    s += L(60, 84, 60, 22, 'stroke-width="2.2"') + P("M47,86 L73,86 L66,82 L54,82 Z", SOLID) + C(60, 22, 2.2, SOLID);
    s += L(24, 34, 96, 12, 'stroke-width="2"');
    s += L(24, 34, 14, 58, THIN) + L(24, 34, 34, 58, THIN) + P("M10,58 L38,58 Q24,68 10,58 Z", HATCH);
    s += P("M16,58 L17.5,49 L29,50.5 L29.5,58 Z", CROSS) + L(29.5, 57.6, 34, 58.4, 'stroke-width="2"');
    s += L(96, 12, 86, 36, THIN) + L(96, 12, 106, 36, THIN) + P("M82,36 L110,36 Q96,46 82,36 Z");
    s += P("M88,35.5 Q96,30 106,20 Q102,28 90,35.6 Z", HATCH) + L(87, 36.4, 103, 23, THIN);
    s += ground(86, 6, 114, 2);
    return s;
  };

  /* g11 The World Forgets. The speakers' platform. The world's pages blow away (the world will little
     note, nor long remember what we say here); the stone monument stays (it can never forget what they did). */
  CAPTION.g11 = "Written pages blow away from a globe, while a stone monument stands firm.";
  ART.g11 = function () {
    var s = "";
    s += C(30, 42, 17, HATCH);
    s += P("M30,25 Q20,42 30,59 M30,25 Q40,42 30,59", THIN) + L(13, 42, 47, 42, THIN) + P("M15.5,33 Q30,37 44.5,33 M15.5,51 Q30,47 44.5,51", THIN);
    s += P("M10,46 Q14,64 30,64 Q46,64 50,46", 'fill="none"') + L(30, 64, 30, 74) + P("M20,78 L40,78 L36,74 L24,74 Z", SOLID);
    function page(x, y, w, h, r) {
      return '<g transform="translate(' + x + "," + y + ") rotate(" + r + ')">' + P("M0,0 L" + w + ",0 L" + w + "," + h + " L0," + h + " Z", PAPER) +
        L(w * .18, h * .3, w * .82, h * .3, FAINT) + L(w * .18, h * .55, w * .82, h * .55, FAINT) + L(w * .18, h * .8, w * .6, h * .8, FAINT) + "</g>";
    }
    s += page(48, 26, 10, 13, -18) + page(61, 14, 8, 10, 14) + page(70, 31, 6.5, 8, -32) + '<g opacity=".6">' + page(74, 8, 5, 6.5, 24) + "</g>";
    s += P("M84,78 L88.5,26 L93,19 L97.5,26 L102,78 Z") + P("M93,19 L97.5,26 L102,78 L93,78 Z", HATCH);
    s += P("M79,78 L107,78 L107,82 L79,82 Z", CROSS);
    s += ground(82, 6, 114, 9);
    return s;
  };

  /* g12 Us the Living. The crowd below. An arch half built, the other half only drawn in, a ladder and
     the mason's tools waiting for the living (the unfinished work). */
  CAPTION.g12 = "A stone arch only half built, the rest just marked out, with a ladder and a mason's tools waiting.";
  ART.g12 = function () {
    var s = "";
    s += P("M18,80 L18,42 L32,42 L32,80", HATCH) + L(16, 42, 34, 42, 'stroke-width="2"');
    s += P("M88,80 L88,60 L102,60 L102,80", HATCH);
    var cx = 60, cy = 44, r0 = 28, r1 = 37;
    for (var i = 0; i < 9; i++) {
      var a0 = Math.PI + i * Math.PI / 9, a1 = Math.PI + (i + 1) * Math.PI / 9;
      var d = "M" + n(cx + Math.cos(a0) * r0) + "," + n(cy + Math.sin(a0) * r0) + " L" + n(cx + Math.cos(a0) * r1) + "," + n(cy + Math.sin(a0) * r1) +
        " L" + n(cx + Math.cos(a1) * r1) + "," + n(cy + Math.sin(a1) * r1) + " L" + n(cx + Math.cos(a1) * r0) + "," + n(cy + Math.sin(a1) * r0) + " Z";
      s += i < 4 ? P(d, i % 2 ? CROSS : HATCH) : P(d, 'stroke-dasharray="1.4 1.8" ' + FAINT);
    }
    s += L(108, 80, 96, 44) + L(114, 80, 102, 44);
    for (var k = 0; k < 6; k++) { var t = (k + .6) / 6.4; s += L(108 - 12 * t, 80 - 36 * t, 114 - 12 * t, 80 - 36 * t, THIN); }
    s += P("M40,80 L44,73 L58,73 L54,80", 'fill="none" ' + THIN);
    s += P("M42,76 L54,72", 'stroke-width="2"') + P("M52.5,69.5 L58.5,67.5 L60,72 L54,74 Z", SOLID);
    s += P("M64,79 L74,79 L71,74.5 Z", HATCH) + L(71, 74.5, 72.6, 71, 'stroke-width="2"');
    s += ground(80, 6, 114, 3);
    return s;
  };

  /* g13 Nobly Advanced. The far ridges. Footsteps climb from here to a flag planted part-way up the
     ridge, and go on, fainter, beyond it (which they who fought here have thus far so nobly advanced). */
  CAPTION.g13 = "Footsteps climb from the foreground to a flag planted part-way up a ridge, then go on, fainter, beyond it.";
  ART.g13 = function () {
    var s = "";
    s += P("M6,34 Q22,24 38,30 T70,24 T102,26 T114,24", THIN);
    s += P("M6,56 Q26,46 46,44 Q62,40 76,36 Q94,38 114,48");
    for (var i = 0; i < 9; i++) s += L(84 + i * 3.4, 40 + i * 1.2, 80 + i * 3.4, 52 + i * 1.6, FAINT);
    var steps = [[42, 86], [50, 80], [56, 73], [63, 66], [68, 59], [72, 52], [75, 46]];
    steps.forEach(function (p, k) { s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + n(1.8 - k * .12) + '" ry="' + n(1.1 - k * .07) + '" fill="' + INK + '"/>'; });
    [[82, 34], [88, 31], [94, 28.5], [99, 27]].forEach(function (p) { s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx=".9" ry=".55" fill="' + INK + '" opacity=".45"/>'; });
    s += L(77, 40, 77, 14, 'stroke-width="1.8"') + flag(77, 14, 20, 12, 2.4);
    return s;
  };

  /* g14 The Great Task. The long road. A road that runs straight to the far horizon, milestones beside
     it, and a traveller's pack and staff set down at the start (the great task remaining before us). */
  CAPTION.g14 = "A long straight road runs to the far horizon past milestones; a traveller's pack and staff wait at the start.";
  ART.g14 = function () {
    var s = "";
    s += L(6, 40, 114, 40) + P("M6,40 Q20,34 34,38 M80,38 Q96,33 114,37", FAINT);
    s += L(64, 40, 98, 90) + L(66, 40, 118, 90) + L(65, 44, 65, 46, FAINT) + L(68, 54, 69, 58, THIN) + L(75, 70, 77, 76, THIN) + L(84, 84, 86.5, 90, THIN);
    [[104, 78, 6], [87, 60, 4.2], [77, 50, 3], [71, 44.5, 2]].forEach(function (m) { var x = m[0], y = m[1], w = m[2]; s += P("M" + (x - w / 2) + "," + y + " L" + (x - w / 2) + "," + n(y - w) + " Q" + x + "," + n(y - w * 1.7) + " " + (x + w / 2) + "," + n(y - w) + " L" + (x + w / 2) + "," + y + " Z", HATCH); });
    s += P("M22,84 Q20,70 30,66 L42,66 Q50,70 48,84 Z", CROSS) + P("M28,66 Q35,58 42,66", 'stroke-width="2"') + L(22, 74, 48, 74, 'stroke-width="2"');
    s += L(54, 86, 60, 52, 'stroke-width="2"');
    s += ground(86, 6, 56, 10);
    return s;
  };

  /* g15 Full Measure. The last light. At the last light of day, a small lantern at a soldier's
     headstone passes its flame to a bigger lantern that burns brighter (from these honored dead we
     take increased devotion). */
  CAPTION.g15 = "At sunset a small lantern by a headstone passes its flame to a bigger lantern that burns brighter.";
  ART.g15 = function () {
    var s = "";
    s += L(6, 58, 114, 58) + P("M90,58 A13,13 0 0 1 116,58", HATCH) + rays(103, 58, 16, 22, 200, 340, 7, FAINT);
    s += P("M14,80 L14,50 Q24,40 34,50 L34,80 Z", CROSS);
    s += lantern(42, 80, .62, true);
    s += P("M45,64 Q58,46 72,52", 'stroke-dasharray="1 2.4" stroke-width="1.4"');
    s += lantern(80, 82, 1.25, true);
    s += rays(80, 69, 9, 15, 120, 420, 10, FAINT);
    s += ground(82, 6, 114, 11);
    return s;
  };

  /* g16 Not in Vain. The flag. People raise their right hands high beneath the flag (that we here
     highly resolve that these dead shall not have died in vain). */
  CAPTION.g16 = "People raise their right hands high beneath a flag flying calm on its pole.";
  ART.g16 = function () {
    var s = "";
    s += L(60, 82, 60, 8, 'stroke-width="2.2"') + C(60, 6.8, 1.6, SOLID) + flag(60, 10, 38, 22, 2);
    [[18, 27, "top"], [32, 25, "bonnet"], [80, 26, "kepi"], [96, 27, "top"]].forEach(function (p) {
      s += person(p[0], 82, p[1], { hat: p[2], armUp: "right", skirt: p[2] === "bonnet" });
    });
    s += ground(82, 6, 114, 12);
    return s;
  };

  /* g17 New Birth of Freedom. The dawn sky. The sun is born on the horizon; a broken chain lies on
     the ground and a bird flies free. */
  CAPTION.g17 = "The sun rises on the horizon; a broken chain lies on the ground and a bird flies free.";
  ART.g17 = function () {
    var s = "";
    s += L(6, 60, 114, 60) + P("M44,60 A16,16 0 0 1 76,60", HATCH) + rays(60, 60, 20, 36, 196, 344, 13, THIN);
    s += P("M86,22 q4,-4 8,0 q4,-4 8,0", 'stroke-width="1.6"') + P("M74,34 q2.4,-2.4 4.8,0 q2.4,-2.4 4.8,0", THIN);
    function link(x, y, r) { return '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="4.4" ry="2.4" transform="rotate(' + r + " " + n(x) + " " + n(y) + ')" stroke-width="1.6"/>'; }
    for (var i = 0; i < 5; i++) s += link(14 + i * 6.6, 79 - i * .6, i % 2 ? 0 : -8);
    s += P("M49,76.6 q4,-3 5.6,0.4", 'stroke-width="1.6"') + P("M66,76.4 q1.6,-3.4 5.6,-0.4", 'stroke-width="1.6"');
    for (var j = 0; j < 5; j++) s += link(76 + j * 6.6, 76.6 + j * .6, j % 2 ? 0 : 8);
    s += L(52, 72, 54, 69, FAINT) + L(62, 71, 61, 68, FAINT) + L(68, 72, 70, 69.5, FAINT);
    s += ground(84, 6, 114, 13);
    return s;
  };

  /* g18 Of, By, For. The open country. The roof of government held up by the people themselves, three
     of them, standing on the curve of the earth (of the people, by the people, for the people, shall not
     perish from the earth). */
  CAPTION.g18 = "Three people hold up the roof of a government building, standing on the curve of the earth.";
  ART.g18 = function () {
    var s = "";
    s += P("M22,28 L60,10 L98,28 Z", HATCH) + P("M18,28 L102,28 L102,34 L18,34 Z", CROSS);
    s += person(34, 76, 40, { armUp: "both" }) + person(60, 76, 40, { armUp: "both" }) + person(86, 76, 40, { armUp: "both" });
    s += P("M2,90 Q60,66 118,90", 'stroke-width="1.8"') + P("M14,90 Q60,72 106,90", FAINT) + P("M30,90 Q60,78 90,90", FAINT);
    return s;
  };

  var IDS = Object.keys(ART);

  function svg(id, o) {
    o = o || {};
    var art = ART[id];
    if (!art) return "";
    var p = "qfp" + (++uid);
    var size = o.size ? ' width="' + o.size + '" height="' + Math.round(o.size * .75) + '"' : "";
    var a11y = o.label === false ? ' aria-hidden="true" focusable="false"' : ' role="img" aria-label="' + CAPTION[id].replace(/"/g, "&quot;") + '"';
    var body = art().replace(/@/g, p + "-");
    return '<svg class="qf-pic" viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg"' + size + a11y + ">" +
      "<defs>" +
      '<pattern id="' + p + '-h" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2.6" stroke="' + INK + '" stroke-width=".75"/></pattern>' +
      '<pattern id="' + p + '-x" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0 V2.4 M0,0 H2.4" stroke="' + INK + '" stroke-width=".8"/></pattern>' +
      "</defs>" +
      '<g fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + body + "</g></svg>";
  }

  root.QFPictures = { svg: svg, caption: function (id) { return CAPTION[id] || ""; }, ids: IDS };
})(typeof window !== "undefined" ? window : this);
