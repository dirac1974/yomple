/* Quiet Field 2: the scene. One inline SVG of Gettysburg at dusk, 18 November 1863: the railway
   depot, the Diamond, Baltimore Street, the cemetery gate, the graves and the speakers' platform,
   with the 18 lantern posts along the road. Built procedurally so it fits any screen without
   stretching: positions are fractions of the width, sizes come from depth.

   Scene.mount(el)                draw into el (redraws itself when the shape of el changes)
   Scene.update({g1:{lit,shining,next}, ...})
   Scene.ignite(id) -> Promise    flame jump, glow ring, embers (<= 3 s; reduced motion: a fade)
   Scene.place(id), Scene.teaser(ids)                                                          */
(function (root) {
  "use strict";

  var IDS = [];
  for (var k = 1; k <= 18; k++) IDS.push("g" + k);

  /* The memory palace: where each post stands on Lincoln's evening. */
  var PLACE = {
    g1: "depot", g2: "wills", g3: "diamond", g4: "street", g5: "street", g6: "gate",
    g7: "graves", g8: "graves", g9: "field", g10: "field", g11: "field",
    g12: "hill", g13: "hill", g14: "hill", g15: "hill", g16: "hill", g17: "hill", g18: "hill"
  };
  var PLACE_NAME = {
    depot: "the railway depot", wills: "the Wills House", diamond: "the Diamond", street: "Baltimore Street",
    gate: "the cemetery gate", graves: "the new graves", field: "the open field", hill: "the hill"
  };
  var PLACE_TEASE = {
    depot: "the lanterns by the depot", wills: "the lantern by the Wills House",
    diamond: "the lantern on the Diamond", street: "the Baltimore Street lanterns",
    gate: "the lantern at the cemetery gate", graves: "the lanterns by the new graves",
    field: "the lanterns across the open field", hill: "the lanterns on the hill"
  };
  var PLACE_ONE = {
    depot: "the lantern by the depot", wills: "the lantern by the Wills House", diamond: "the lantern on the Diamond",
    street: "a lantern on Baltimore Street", gate: "the lantern at the cemetery gate", graves: "a lantern by the new graves",
    field: "a lantern in the open field", hill: "a lantern on the hill"
  };

  var NS = "http://www.w3.org/2000/svg";
  var H = 1000;
  var state = { el: null, svg: null, W: 1600, layout: "", status: {}, pts: null, ro: null };

  function reduced() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function f(n) { return Math.round(n * 10) / 10; }

  /* ---------- layouts: the road's waypoints as fractions of (W, H) ---------- */
  var LAYOUTS = {
    wide: {
      horizon: 0.40,
      hill: [[0, 0.41], [0.30, 0.405], [0.46, 0.39], [0.62, 0.35], [0.78, 0.315], [0.90, 0.30], [1, 0.31]],
      town: [0.03, 0.44],
      road: [[-0.02, 0.816], [0.08, 0.800], [0.22, 0.790], [0.40, 0.780], [0.58, 0.765], [0.74, 0.735],
        [0.82, 0.690], [0.75, 0.645], [0.58, 0.619], [0.41, 0.597], [0.29, 0.565], [0.32, 0.516],
        [0.46, 0.486], [0.60, 0.454], [0.71, 0.425], [0.79, 0.392], [0.85, 0.360], [0.89, 0.335]],
      label: 26
    },
    tall: {
      horizon: 0.34,
      hill: [[0, 0.36], [0.25, 0.355], [0.45, 0.34], [0.62, 0.315], [0.78, 0.295], [0.92, 0.29], [1, 0.30]],
      town: [0.0, 0.5],
      road: [[-0.04, 0.835], [0.18, 0.825], [0.50, 0.81], [0.78, 0.79], [0.87, 0.755], [0.74, 0.718],
        [0.46, 0.70], [0.20, 0.675], [0.15, 0.635], [0.32, 0.605], [0.62, 0.585], [0.83, 0.56],
        [0.82, 0.52], [0.60, 0.49], [0.36, 0.47], [0.22, 0.44], [0.30, 0.405], [0.50, 0.385],
        [0.66, 0.36], [0.73, 0.335]],
      label: 22
    }
  };

  /* ---------- a sampled Catmull-Rom road ---------- */
  function buildRoad(way, W) {
    var P = way.map(function (p) { return [p[0] * W, p[1] * H]; });
    var out = [];
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (var s = 0; s < 24; s++) {
        var t = s / 24, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    out.push(P[P.length - 1]);
    var len = [0];
    for (var j = 1; j < out.length; j++) len.push(len[j - 1] + Math.hypot(out[j][0] - out[j - 1][0], out[j][1] - out[j - 1][1]));
    var total = len[len.length - 1];
    function at(t) {
      var d = Math.max(0, Math.min(1, t)) * total, lo = 0, hi = len.length - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (len[mid] < d) lo = mid; else hi = mid; }
      var seg = (len[hi] - len[lo]) || 1, u = (d - len[lo]) / seg;
      var x = out[lo][0] + (out[hi][0] - out[lo][0]) * u, y = out[lo][1] + (out[hi][1] - out[lo][1]) * u;
      var dx = out[hi][0] - out[lo][0], dy = out[hi][1] - out[lo][1], m = Math.hypot(dx, dy) || 1;
      return { x: x, y: y, tx: dx / m, ty: dy / m };
    }
    return { pts: out, at: at, total: total };
  }

  /* Posts spaced evenly, with a wider gap between the three movements. */
  function postT() {
    var u = [], acc = 0;
    for (var i = 0; i < 18; i++) {
      if (i === 2 || i === 11) acc += 0.9;
      u.push(acc); acc += 1;
    }
    var max = u[17];
    return u.map(function (v) { return 0.055 + (v / max) * (0.905 - 0.055); });
  }

  function depthOf(y, L) {
    var top = L.horizon * H - 70, bot = (L.bot || 0.83) * H;
    var d = (y - top) / (bot - top);
    return 0.42 + 0.58 * Math.max(0, Math.min(1, d));
  }

  /* ---------- pieces ---------- */
  function house(x, y, s, r, opt) {
    opt = opt || {};
    var w = (opt.w || (46 + r() * 40)) * s, h = (opt.h || (38 + r() * 46)) * s;
    var roofH = (opt.flat ? 4 : 12 + r() * 14) * s;
    var col = opt.col || "#151b2a";
    var g = "";
    var x0 = x - w / 2, y0 = y - h;
    if (opt.flat) g += '<rect x="' + f(x0 - 2 * s) + '" y="' + f(y0 - roofH) + '" width="' + f(w + 4 * s) + '" height="' + f(roofH) + '" fill="' + col + '"/>';
    else g += '<path d="M' + f(x0 - 3 * s) + ' ' + f(y0) + 'L' + f(x) + ' ' + f(y0 - roofH) + 'L' + f(x0 + w + 3 * s) + ' ' + f(y0) + 'Z" fill="' + col + '"/>';
    g += '<rect x="' + f(x0) + '" y="' + f(y0) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + col + '"/>';
    if (!opt.flat && r() < 0.7) {
      var cx = x0 + w * (0.2 + r() * 0.6);
      g += '<rect x="' + f(cx) + '" y="' + f(y0 - roofH * 0.9) + '" width="' + f(5 * s) + '" height="' + f(roofH * 0.7) + '" fill="' + col + '"/>';
    }
    var rows = Math.max(1, Math.floor(h / (22 * s))), cols = Math.max(1, Math.floor(w / (18 * s)));
    for (var a = 0; a < rows; a++) for (var b = 0; b < cols; b++) {
      if (r() > (opt.lit || 0.42)) continue;
      var wx = x0 + (b + 0.5) * (w / cols) - 3 * s, wy = y0 + (a + 0.35) * (h / rows);
      var op = 0.45 + r() * 0.5;
      g += '<rect class="win" x="' + f(wx) + '" y="' + f(wy) + '" width="' + f(6 * s) + '" height="' + f(8 * s) + '" fill="#ffcf7a" opacity="' + op.toFixed(2) + '"/>';
    }
    return g;
  }

  function steeple(x, y, s) {
    var c = "#141a28";
    return '<rect x="' + f(x - 9 * s) + '" y="' + f(y - 90 * s) + '" width="' + f(18 * s) + '" height="' + f(90 * s) + '" fill="' + c + '"/>' +
      '<rect x="' + f(x - 6 * s) + '" y="' + f(y - 112 * s) + '" width="' + f(12 * s) + '" height="' + f(24 * s) + '" fill="' + c + '"/>' +
      '<path d="M' + f(x - 7 * s) + ' ' + f(y - 112 * s) + 'L' + f(x) + ' ' + f(y - 160 * s) + 'L' + f(x + 7 * s) + ' ' + f(y - 112 * s) + 'Z" fill="' + c + '"/>' +
      '<rect x="' + f(x - 2 * s) + '" y="' + f(y - 104 * s) + '" width="' + f(4 * s) + '" height="' + f(8 * s) + '" fill="#ffcf7a" opacity=".55"/>';
  }

  function cupola(x, y, s) {
    var c = "#141a28";
    return '<rect x="' + f(x - 34 * s) + '" y="' + f(y - 58 * s) + '" width="' + f(68 * s) + '" height="' + f(58 * s) + '" fill="' + c + '"/>' +
      '<path d="M' + f(x - 38 * s) + ' ' + f(y - 58 * s) + 'L' + f(x) + ' ' + f(y - 74 * s) + 'L' + f(x + 38 * s) + ' ' + f(y - 58 * s) + 'Z" fill="' + c + '"/>' +
      '<rect x="' + f(x - 8 * s) + '" y="' + f(y - 92 * s) + '" width="' + f(16 * s) + '" height="' + f(22 * s) + '" fill="' + c + '"/>' +
      '<path d="M' + f(x - 10 * s) + ' ' + f(y - 92 * s) + 'Q' + f(x) + ' ' + f(y - 110 * s) + ' ' + f(x + 10 * s) + ' ' + f(y - 92 * s) + 'Z" fill="' + c + '"/>' +
      '<rect x="' + f(x - 3 * s) + '" y="' + f(y - 86 * s) + '" width="' + f(6 * s) + '" height="' + f(10 * s) + '" fill="#ffcf7a" opacity=".7"/>';
  }

  /* The Evergreen Cemetery gatehouse: a tall central arch between two wings. */
  function gatehouse(x, y, s) {
    var c = "#1a1f2c", d = "#0d1018";
    var g = '<g class="gatehouse">';
    g += '<rect x="' + f(x - 64 * s) + '" y="' + f(y - 48 * s) + '" width="' + f(40 * s) + '" height="' + f(48 * s) + '" fill="' + c + '"/>';
    g += '<rect x="' + f(x + 24 * s) + '" y="' + f(y - 48 * s) + '" width="' + f(40 * s) + '" height="' + f(48 * s) + '" fill="' + c + '"/>';
    g += '<path d="M' + f(x - 68 * s) + ' ' + f(y - 48 * s) + 'L' + f(x - 44 * s) + ' ' + f(y - 60 * s) + 'L' + f(x - 20 * s) + ' ' + f(y - 48 * s) + 'Z" fill="' + c + '"/>';
    g += '<path d="M' + f(x + 20 * s) + ' ' + f(y - 48 * s) + 'L' + f(x + 44 * s) + ' ' + f(y - 60 * s) + 'L' + f(x + 68 * s) + ' ' + f(y - 48 * s) + 'Z" fill="' + c + '"/>';
    g += '<rect x="' + f(x - 26 * s) + '" y="' + f(y - 92 * s) + '" width="' + f(52 * s) + '" height="' + f(92 * s) + '" fill="' + c + '"/>';
    g += '<path d="M' + f(x - 30 * s) + ' ' + f(y - 92 * s) + 'L' + f(x) + ' ' + f(y - 108 * s) + 'L' + f(x + 30 * s) + ' ' + f(y - 92 * s) + 'Z" fill="' + c + '"/>';
    g += '<path d="M' + f(x - 14 * s) + ' ' + f(y) + 'L' + f(x - 14 * s) + ' ' + f(y - 46 * s) + 'Q' + f(x) + ' ' + f(y - 66 * s) + ' ' + f(x + 14 * s) + ' ' + f(y - 46 * s) + 'L' + f(x + 14 * s) + ' ' + f(y) + 'Z" fill="#3a3046"/>';
    g += '<path d="M' + f(x - 14 * s) + ' ' + f(y) + 'L' + f(x - 14 * s) + ' ' + f(y - 46 * s) + 'Q' + f(x) + ' ' + f(y - 66 * s) + ' ' + f(x + 14 * s) + ' ' + f(y - 46 * s) + 'L' + f(x + 14 * s) + ' ' + f(y) + 'Z" fill="url(#archGlow)"/>';
    g += '<rect x="' + f(x - 50 * s) + '" y="' + f(y - 34 * s) + '" width="' + f(10 * s) + '" height="' + f(14 * s) + '" fill="#ffcf7a" opacity=".5"/>';
    g += '<rect x="' + f(x + 40 * s) + '" y="' + f(y - 34 * s) + '" width="' + f(10 * s) + '" height="' + f(14 * s) + '" fill="' + d + '"/>';
    g += '</g>';
    return g;
  }

  function stone(x, y, s, r) {
    var w = (8 + r() * 4) * s, h = (10 + r() * 8) * s;
    return '<path d="M' + f(x - w / 2) + ' ' + f(y) + 'L' + f(x - w / 2) + ' ' + f(y - h + w / 2) + 'Q' + f(x) + ' ' + f(y - h - w / 3) + ' ' + f(x + w / 2) + ' ' + f(y - h + w / 2) + 'L' + f(x + w / 2) + ' ' + f(y) + 'Z" fill="#2a3040"/>';
  }

  function tree(x, y, s, r) {
    var c = "#0f1519", h = (60 + r() * 50) * s, w = (34 + r() * 26) * s;
    return '<rect x="' + f(x - 3 * s) + '" y="' + f(y - h * 0.4) + '" width="' + f(6 * s) + '" height="' + f(h * 0.4) + '" fill="' + c + '"/>' +
      '<ellipse cx="' + f(x) + '" cy="' + f(y - h * 0.62) + '" rx="' + f(w / 2) + '" ry="' + f(h * 0.4) + '" fill="' + c + '"/>' +
      '<ellipse cx="' + f(x - w * 0.22) + '" cy="' + f(y - h * 0.5) + '" rx="' + f(w * 0.32) + '" ry="' + f(h * 0.28) + '" fill="' + c + '"/>';
  }

  /* The speakers' platform, a plain wooden stand with bunting, empty until the Dedication. */
  function platform(x, y, s) {
    var c = "#1c1712";
    var g = '<g class="platform">';
    g += '<ellipse cx="' + f(x) + '" cy="' + f(y + 2 * s) + '" rx="' + f(120 * s) + '" ry="' + f(22 * s) + '" fill="url(#platGlow)"/>';
    g += '<rect x="' + f(x - 70 * s) + '" y="' + f(y - 34 * s) + '" width="' + f(140 * s) + '" height="' + f(6 * s) + '" fill="#2b231b"/>';
    for (var i = 0; i < 6; i++) g += '<rect x="' + f(x - 66 * s + i * 26 * s) + '" y="' + f(y - 28 * s) + '" width="' + f(4 * s) + '" height="' + f(28 * s) + '" fill="' + c + '"/>';
    g += '<rect x="' + f(x - 66 * s) + '" y="' + f(y - 60 * s) + '" width="' + f(3 * s) + '" height="' + f(26 * s) + '" fill="' + c + '"/>';
    g += '<rect x="' + f(x + 63 * s) + '" y="' + f(y - 60 * s) + '" width="' + f(3 * s) + '" height="' + f(26 * s) + '" fill="' + c + '"/>';
    g += '<rect x="' + f(x - 66 * s) + '" y="' + f(y - 50 * s) + '" width="' + f(132 * s) + '" height="' + f(2.5 * s) + '" fill="' + c + '"/>';
    for (var b = 0; b < 5; b++) {
      var bx = x - 64 * s + b * 25.6 * s, col = ["#6e3b2e", "#c9c2b0", "#2b3a5c"][b % 3];
      g += '<path d="M' + f(bx) + ' ' + f(y - 34 * s) + 'Q' + f(bx + 12.8 * s) + ' ' + f(y - 24 * s) + ' ' + f(bx + 25.6 * s) + ' ' + f(y - 34 * s) + '" stroke="' + col + '" stroke-width="' + f(3 * s) + '" fill="none" opacity=".75"/>';
    }
    g += '<rect x="' + f(x - 1.5 * s) + '" y="' + f(y - 120 * s) + '" width="' + f(3 * s) + '" height="' + f(86 * s) + '" fill="' + c + '"/>';
    g += '<path class="flag" d="M' + f(x + 1.5 * s) + ' ' + f(y - 118 * s) + 'q' + f(14 * s) + ' ' + f(-4 * s) + ' ' + f(30 * s) + ' ' + f(2 * s) + 'l0 ' + f(18 * s) + 'q' + f(-16 * s) + ' ' + f(-6 * s) + ' ' + f(-30 * s) + ' ' + f(-2 * s) + 'Z" fill="#7a4434" opacity=".8"/>';
    g += '</g>';
    return g;
  }

  function depot(x, y, s) {
    var c = "#141a27";
    var g = '<g class="depot">';
    g += '<rect x="' + f(x - 90 * s) + '" y="' + f(y - 46 * s) + '" width="' + f(140 * s) + '" height="' + f(46 * s) + '" fill="' + c + '"/>';
    g += '<path d="M' + f(x - 104 * s) + ' ' + f(y - 46 * s) + 'L' + f(x - 70 * s) + ' ' + f(y - 70 * s) + 'L' + f(x + 30 * s) + ' ' + f(y - 70 * s) + 'L' + f(x + 64 * s) + ' ' + f(y - 46 * s) + 'Z" fill="' + c + '"/>';
    g += '<rect x="' + f(x - 34 * s) + '" y="' + f(y - 92 * s) + '" width="' + f(24 * s) + '" height="' + f(24 * s) + '" fill="' + c + '"/>';
    g += '<path d="M' + f(x - 38 * s) + ' ' + f(y - 92 * s) + 'L' + f(x - 22 * s) + ' ' + f(y - 104 * s) + 'L' + f(x - 6 * s) + ' ' + f(y - 92 * s) + 'Z" fill="' + c + '"/>';
    for (var i = 0; i < 4; i++) g += '<rect x="' + f(x - 80 * s + i * 32 * s) + '" y="' + f(y - 34 * s) + '" width="' + f(10 * s) + '" height="' + f(16 * s) + '" fill="#ffcf7a" opacity="' + (i === 2 ? ".25" : ".7") + '"/>';
    /* the locomotive standing at the platform, smoke going up */
    var lx = x + 90 * s;
    g += '<rect x="' + f(lx) + '" y="' + f(y - 26 * s) + '" width="' + f(56 * s) + '" height="' + f(18 * s) + '" rx="' + f(8 * s) + '" fill="' + c + '"/>';
    g += '<rect x="' + f(lx + 40 * s) + '" y="' + f(y - 42 * s) + '" width="' + f(24 * s) + '" height="' + f(34 * s) + '" fill="' + c + '"/>';
    g += '<path d="M' + f(lx + 6 * s) + ' ' + f(y - 26 * s) + 'L' + f(lx + 2 * s) + ' ' + f(y - 46 * s) + 'L' + f(lx + 18 * s) + ' ' + f(y - 46 * s) + 'L' + f(lx + 14 * s) + ' ' + f(y - 26 * s) + 'Z" fill="' + c + '"/>';
    g += '<circle cx="' + f(lx + 14 * s) + '" cy="' + f(y - 6 * s) + '" r="' + f(7 * s) + '" fill="' + c + '"/><circle cx="' + f(lx + 38 * s) + '" cy="' + f(y - 6 * s) + '" r="' + f(7 * s) + '" fill="' + c + '"/><circle cx="' + f(lx + 56 * s) + '" cy="' + f(y - 8 * s) + '" r="' + f(9 * s) + '" fill="' + c + '"/>';
    g += '<rect x="' + f(lx + 46 * s) + '" y="' + f(y - 36 * s) + '" width="' + f(10 * s) + '" height="' + f(9 * s) + '" fill="#ffcf7a" opacity=".6"/>';
    g += '<g class="smoke" fill="#5a6378">' +
      '<circle cx="' + f(lx + 10 * s) + '" cy="' + f(y - 58 * s) + '" r="' + f(9 * s) + '" opacity=".22"/>' +
      '<circle cx="' + f(lx + 2 * s) + '" cy="' + f(y - 78 * s) + '" r="' + f(13 * s) + '" opacity=".16"/>' +
      '<circle cx="' + f(lx - 12 * s) + '" cy="' + f(y - 102 * s) + '" r="' + f(18 * s) + '" opacity=".1"/></g>';
    g += '</g>';
    return g;
  }

  /* The Wills House, three storeys on the Diamond. Lincoln's window warms once Movement I is lit. */
  function willsHouse(x, y, s) {
    var c = "#171d2c";
    var w = 84 * s, h = 96 * s, x0 = x - w / 2, y0 = y - h;
    var g = '<g class="wills">';
    g += '<rect x="' + f(x0) + '" y="' + f(y0) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + c + '"/>';
    g += '<rect x="' + f(x0 - 3 * s) + '" y="' + f(y0 - 6 * s) + '" width="' + f(w + 6 * s) + '" height="' + f(6 * s) + '" fill="' + c + '"/>';
    g += '<rect x="' + f(x0 + 10 * s) + '" y="' + f(y0 - 18 * s) + '" width="' + f(6 * s) + '" height="' + f(12 * s) + '" fill="' + c + '"/><rect x="' + f(x0 + w - 16 * s) + '" y="' + f(y0 - 18 * s) + '" width="' + f(6 * s) + '" height="' + f(12 * s) + '" fill="' + c + '"/>';
    for (var r = 0; r < 3; r++) for (var q = 0; q < 4; q++) {
      var wx = x0 + 9 * s + q * 19 * s, wy = y0 + 10 * s + r * 29 * s;
      var cls = (r === 1 && q === 3) ? ' class="candle"' : "";
      var op = (r === 1 && q === 3) ? ".16" : ((r * 4 + q) % 3 === 0 ? ".62" : ".14");
      g += '<rect' + cls + ' x="' + f(wx) + '" y="' + f(wy) + '" width="' + f(8 * s) + '" height="' + f(13 * s) + '" fill="#ffcf7a" opacity="' + op + '"/>';
    }
    g += '<circle class="candle-glow" cx="' + f(x0 + 9 * s + 3 * 19 * s + 4 * s) + '" cy="' + f(y0 + 10 * s + 29 * s + 6 * s) + '" r="' + f(26 * s) + '" fill="url(#glow)" opacity="0"/>';
    g += '</g>';
    return g;
  }

  /* Crowd: small silhouettes drawn at the origin, standing on y = 0, about 60 units tall. */
  var FIGURES = {
    hat: '<rect x="-6" y="-70" width="12" height="13"/><rect x="-9.5" y="-58.5" width="19" height="2.6"/><circle cx="0" cy="-50" r="6"/><path d="M-10 -43Q0 -46 10 -43L12.5 -17L8 -17L7 0L2 0L1 -16L-1 -16L-2 0L-7 0L-8 -17L-12.5 -17Z"/>',
    bonnet: '<path d="M-8.5 -47Q-8 -60 0 -60Q8 -60 8.5 -47L6 -46Q5 -55 0 -55Q-5 -55 -6 -46Z"/><circle cx="0" cy="-49" r="5.6"/><path d="M-6 -42Q0 -45 6 -42L8.5 -27L17 0L-17 0L-8.5 -27Z"/><path d="M-6 -41L-13 -26L-10 -25L-4 -36Z"/>',
    kepi: '<path d="M-6.5 -56L4 -60.5L6.5 -54L-6.5 -53Z"/><path d="M-7 -53.5L-11 -52L-7 -51.5Z"/><circle cx="0" cy="-48" r="5.8"/><path d="M-9 -41Q0 -44 9 -41L10.5 -18L7 -18L6 0L1.5 0L0.8 -16L-0.8 -16L-1.5 0L-6 0L-7 -18L-10.5 -18Z"/><rect x="10.5" y="-74" width="1.8" height="62"/>',
    child: '<path d="M-5 -40Q0 -45 5 -40L5 -38L-5 -38Z"/><circle cx="0" cy="-34.5" r="4.6"/><path d="M-6.5 -29Q0 -31 6.5 -29L8 -12L5 -12L4.5 0L1 0L0.5 -11L-0.5 -11L-1 0L-4.5 0L-5 -12L-8 -12Z"/>',
    crutch: '<rect x="-5.5" y="-64" width="11" height="9"/><rect x="-8.5" y="-55.5" width="17" height="2.4"/><circle cx="0" cy="-48" r="5.8"/><path d="M-9 -41Q0 -44 9 -41L10 -17L6 -17L5 0L1 0L0 -16L-2 -16L-3 -10L-7 -10L-8 -17L-10 -17Z"/><path d="M-12 -39L-17 0L-15 0L-10 -38Z"/><rect x="-14.5" y="-41" width="7" height="2"/>',
    shawl: '<circle cx="0" cy="-47" r="5.6"/><path d="M-7 -52Q0 -58 7 -52L8 -44Q0 -48 -8 -44Z"/><path d="M-9 -42Q0 -46 9 -42L13 -24L15 0L-15 0L-13 -24Z"/>'
  };
  var FIG_ORDER = ["hat", "bonnet", "kepi", "child", "crutch", "shawl", "hat", "kepi", "bonnet", "child"];

  /* ---------- the drawing ---------- */
  function layoutFor(w, h) { return (w / Math.max(1, h)) >= 1.02 ? "wide" : "tall"; }

  function draw() {
    var el = state.el; if (!el) return;
    var w = el.clientWidth || 1024, h = el.clientHeight || 768;
    var lay = layoutFor(w, h), L = LAYOUTS[lay];
    if (!L.bot) L.bot = Math.max.apply(null, L.road.map(function (p) { return p[1]; })) - 0.01;
    var W = Math.round(H * Math.max(0.42, Math.min(2.4, w / Math.max(1, h))));
    state.W = W; state.layout = lay;
    var road = buildRoad(L.road, W);
    var ts = postT();
    var posts = ts.map(function (t, i) { var p = road.at(t); p.t = t; p.s = depthOf(p.y, L); p.id = IDS[i]; return p; });
    state.posts = posts; state.road = road;
    var r = rng(1863 + (lay === "wide" ? 0 : 7));
    var hz = L.horizon * H;
    var s = "";

    s += '<svg xmlns="' + NS + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Gettysburg at dusk: a road of lantern posts from the depot to the cemetery platform">';
    s += '<defs>' +
      '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#0c1322"/><stop offset=".38" stop-color="#17213a"/>' +
      '<stop offset=".66" stop-color="#2d2f4c"/><stop offset=".84" stop-color="#6a4a52"/>' +
      '<stop offset=".95" stop-color="#b8704a"/><stop offset="1" stop-color="#d48a55"/></linearGradient>' +
      '<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2423"/><stop offset=".5" stop-color="#121a1a"/><stop offset="1" stop-color="#0a0f12"/></linearGradient>' +
      '<linearGradient id="hillG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#222a2b"/><stop offset="1" stop-color="#151c1d"/></linearGradient>' +
      '<radialGradient id="sun" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="#e79a5c" stop-opacity=".55"/><stop offset="1" stop-color="#e79a5c" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset=".35" stop-color="#ffb35c" stop-opacity=".28"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="shine"><stop offset="0" stop-color="#fff4d0" stop-opacity=".9"/><stop offset=".3" stop-color="#ffd98a" stop-opacity=".35"/><stop offset="1" stop-color="#ffc46a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="pool"><stop offset="0" stop-color="#ffc56e" stop-opacity=".42"/><stop offset="1" stop-color="#ffc56e" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="archGlow" cx=".5" cy=".9" r=".8"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".5"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="platGlow"><stop offset="0" stop-color="#e8b070" stop-opacity=".22"/><stop offset="1" stop-color="#e8b070" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="vig" cx=".5" cy=".55" r=".75"><stop offset=".55" stop-color="#05070c" stop-opacity="0"/><stop offset="1" stop-color="#05070c" stop-opacity=".62"/></radialGradient>';
    Object.keys(FIGURES).forEach(function (k) { s += '<g id="fig-' + k + '">' + FIGURES[k] + '</g>'; });
    s += '</defs>';

    /* sky, stars, the last of the sun */
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';
    s += '<ellipse cx="' + f(W * 0.18) + '" cy="' + f(hz) + '" rx="' + f(W * 0.6) + '" ry="' + f(H * 0.22) + '" fill="url(#sun)"/>';
    s += '<g class="stars">';
    for (var i = 0; i < Math.round(W / 22); i++) {
      var sx = r() * W, sy = r() * hz * 0.62, sr = r() < 0.08 ? 1.6 : 0.7 + r() * 0.6;
      if (sx < Math.max(420, W * 0.36) && sy < 150) continue;
      s += '<circle cx="' + f(sx) + '" cy="' + f(sy) + '" r="' + f(sr) + '" fill="#e8e2d0" opacity="' + (0.25 + r() * 0.5 * (1 - sy / hz)).toFixed(2) + '"/>';
    }
    s += '<circle cx="' + f(W * 0.12) + '" cy="' + f(hz * 0.52) + '" r="2.4" fill="#fff3d6" opacity=".9"/>';
    s += '</g>';

    /* South Mountain, far and blue */
    var far = "M0 " + f(hz - 8);
    for (var fx = 0; fx <= W + 40; fx += 40) far += "L" + fx + " " + f(hz - 14 - 18 * Math.sin(fx / W * 5.2 + 1) - 10 * Math.sin(fx / W * 13) - r() * 4);
    far += "L" + W + " " + f(hz + 40) + "L0 " + f(hz + 40) + "Z";
    s += '<path d="' + far + '" fill="#262c48" opacity=".9"/>';

    /* the town on the horizon */
    s += '<g class="town">';
    var tx0 = L.town[0] * W, tx1 = L.town[1] * W, x = tx0, bi = 0;
    while (x < tx1) {
      var bs = 0.62 + r() * 0.12;
      var bw = 40 + r() * 46;
      if (bi === 3) s += steeple(x + 10, hz + 6, 0.72);
      else if (bi === 7) s += cupola(x + 30, hz + 6, 0.7);
      else s += house(x + bw * bs / 2, hz + 6, bs, r, { w: bw, lit: 0.5, col: "#161c2c" });
      x += bw * bs + 4 + r() * 10; bi++;
    }
    s += '</g>';

    /* ground and Cemetery Hill */
    var hp = L.hill.map(function (p) { return [p[0] * W, p[1] * H]; });
    var gd = "M0 " + f(hp[0][1]);
    for (var hi = 1; hi < hp.length; hi++) {
      var mx = (hp[hi - 1][0] + hp[hi][0]) / 2, my = (hp[hi - 1][1] + hp[hi][1]) / 2;
      gd += "Q" + f(hp[hi - 1][0]) + " " + f(hp[hi - 1][1]) + " " + f(mx) + " " + f(my);
    }
    gd += "L" + W + " " + f(hp[hp.length - 1][1]) + "L" + W + " " + H + "L0 " + H + "Z";
    s += '<path d="' + gd + '" fill="url(#ground)"/>';
    s += '<path d="' + gd + '" fill="url(#hillG)" opacity=".5"/>';
    /* a rim of last light along the crest */
    var crest = "M0 " + f(hp[0][1]);
    for (var ci = 1; ci < hp.length; ci++) {
      var cmx = (hp[ci - 1][0] + hp[ci][0]) / 2, cmy = (hp[ci - 1][1] + hp[ci][1]) / 2;
      crest += "Q" + f(hp[ci - 1][0]) + " " + f(hp[ci - 1][1]) + " " + f(cmx) + " " + f(cmy);
    }
    s += '<path d="' + crest + '" stroke="#c98a5e" stroke-opacity=".28" stroke-width="2" fill="none"/>';

    /* trees on the hill */
    var props = [];
    for (var tr = 0; tr < 9; tr++) {
      var tt = 0.55 + r() * 0.45, tpx = tt * W, tpy = hillY(hp, tpx) + 6;
      props.push({ y: tpy, svg: tree(tpx, tpy, 0.55 + (tpy / H) * 0.35, r) });
    }

    /* rail fences across the fields (the zigzag "worm" fences of Adams County) */
    s += '<g class="fences" stroke="#2c3434" stroke-width="2" fill="none" opacity=".8">';
    var fenceYs = [0.905, 0.955];
    fenceYs.forEach(function (fy, n) {
      var y0 = fy * H, step = 26 + n * 8, dz = "M-10 " + f(y0);
      for (var zx = 0; zx < W + 30; zx += step) dz += "L" + f(zx + step / 2) + " " + f(y0 - 10 - n * 4) + "L" + f(zx + step) + " " + f(y0);
      s += '<path d="' + dz + '" stroke-width="' + (2 + n) + '"/>';
    });
    s += '</g>';

    /* the road: drawn in short runs so it widens as it comes nearer */
    s += '<g class="road" stroke-linecap="round" stroke-linejoin="round" fill="none">';
    var rp = road.pts;
    for (var pass = 0; pass < 2; pass++) {
      for (var ri = 0; ri < rp.length - 1; ri += 6) {
        var seg = "M" + f(rp[ri][0]) + " " + f(rp[ri][1]);
        for (var rj = ri + 1; rj <= Math.min(rp.length - 1, ri + 6); rj++) seg += "L" + f(rp[rj][0]) + " " + f(rp[rj][1]);
        var dpt = depthOf(rp[ri][1], L);
        s += pass === 0
          ? '<path d="' + seg + '" stroke="#2a2621" stroke-width="' + f(46 * dpt) + '"/>'
          : '<path d="' + seg + '" stroke="#3b342b" stroke-width="' + f(30 * dpt) + '"/>';
      }
    }
    s += '</g>';

    /* light pools on the road under each post */
    s += '<g class="pools">';
    posts.forEach(function (p) {
      s += '<ellipse class="pool" data-id="' + p.id + '" cx="' + f(p.x) + '" cy="' + f(p.y + 4 * p.s) + '" rx="' + f(96 * p.s) + '" ry="' + f(26 * p.s) + '" fill="url(#pool)"/>';
    });
    s += '</g>';

    /* landmarks along the road */
    function side(p, dist, sgn) { return { x: p.x - p.ty * dist * sgn, y: p.y + p.tx * dist * sgn }; }
    var a;
    a = road.at(0.02); var dS = depthOf(a.y, L);
    props.push({ y: a.y - 40 * dS, svg: depot(a.x + 40 * dS, a.y - 40 * dS, dS) });
    var pw = posts[1], ws = side(pw, -60 * pw.s, 1), wsc = lay === "wide" ? 0.95 : 0.78;
    props.push({ y: ws.y - 6, svg: willsHouse(ws.x + 70 * pw.s, ws.y - 6, pw.s * wsc) });
    /* Baltimore Street: low houses shoulder to shoulder behind the road, where it runs level */
    var hs = rng(77);
    for (var ht = posts[2].t - 0.012; ht < posts[4].t + 0.02; ht += 0.0085) {
      var hp2 = road.at(ht), hd = depthOf(hp2.y, L);
      if (Math.abs(hp2.tx) < 0.8) continue;
      props.push({ y: hp2.y - 30 * hd, svg: house(hp2.x, hp2.y - 30 * hd, hd * 0.82, hs, { lit: 0.38, h: 30 + hs() * 26 }) });
    }
    var gp = road.at((posts[4].t + posts[5].t) / 2), gs = depthOf(gp.y, L), go = { x: gp.x, y: gp.y - 26 * gs };
    props.push({ y: go.y, svg: gatehouse(go.x, go.y, gs * 0.9) });
    var sr2 = rng(1119);
    for (var gi = 0; gi < 26; gi++) {
      var gt = posts[5].t + 0.01 + sr2() * (posts[9].t - posts[5].t), gpp = road.at(gt), gss = depthOf(gpp.y, L);
      var gsd = (sr2() < 0.5 ? -1 : 1) * (50 + sr2() * 90) * gss;
      var sp = side(gpp, gsd, 1);
      props.push({ y: sp.y, svg: stone(sp.x, sp.y, gss, sr2) });
    }
    var end = road.at(0.985), es = depthOf(end.y, L);
    props.push({ y: end.y - 4, svg: platform(end.x + 30 * es, end.y - 4, es * 1.15) });
    state.platform = { x: end.x + 30 * es, y: end.y - 4 - 130 * es * 1.15, s: es };

    /* posts */
    posts.forEach(function (p, i) {
      var fd = (2 + ((i * 37) % 10) / 10).toFixed(2), fdl = (-((i * 53) % 23) / 10).toFixed(2);
      var g = '<g class="post" data-id="' + p.id + '" transform="translate(' + f(p.x) + ' ' + f(p.y) + ') scale(' + p.s.toFixed(3) + ')" style="--fd:' + fd + 's;--fdl:' + fdl + 's">';
      g += '<circle class="p-glow" cx="0" cy="-90" r="92" fill="url(#glow)"/>';
      g += '<circle class="p-shine" cx="0" cy="-90" r="64" fill="url(#shine)"/>';
      g += '<circle class="p-ring" cx="0" cy="-90" r="30" fill="none" stroke="#ffe3a0" stroke-width="1.2"/>';
      g += '<rect x="-7" y="-4" width="14" height="5" fill="#0b0e15"/>';
      g += '<rect x="-2.6" y="-82" width="5.2" height="80" fill="#0b0e15"/>';
      g += '<path class="p-glass" d="M-9 -97L9 -97L7.2 -81L-7.2 -81Z" stroke="#0b0e15" stroke-width="2.6" stroke-linejoin="round"/>';
      g += '<path d="M-12 -97L0 -106L12 -97Z" fill="#0b0e15"/><rect x="-1.5" y="-111" width="3" height="6" fill="#0b0e15"/>';
      g += '<ellipse class="p-flame" cx="0" cy="-88.5" rx="3.2" ry="5.6"/>';
      g += '<text class="p-num" x="0" y="22" text-anchor="middle">' + (i + 1) + '</text>';
      g += '<g class="p-embers"></g>';
      g += '</g>';
      props.push({ y: p.y, svg: g, post: true });
    });

    props.sort(function (A, B) { return A.y - B.y; });
    s += '<g class="props">' + props.map(function (q) { return q.svg; }).join("") + '</g>';
    s += '<g class="crowd"></g>';

    /* place names, set like museum placards */
    var ls = L.label;
    function label(x, y, text, cls) {
      var half = text.length * ls * 0.29 + 10;
      x = Math.min(W - half, Math.max(half, x));
      return '<text class="plaque ' + (cls || "") + '" x="' + f(x) + '" y="' + f(y) + '" text-anchor="middle" font-size="' + ls + '">' + text + '</text>';
    }
    s += '<g class="labels">';
    var d0 = road.at(0.02);
    s += label(Math.max(d0.x + 60, 110), d0.y + 60, "Railroad depot");
    s += label(posts[2].x, posts[2].y + 54 * posts[2].s, "The Diamond");
    var bp = road.at((posts[3].t + posts[4].t) / 2);
    s += label(bp.x, bp.y + 58 * depthOf(bp.y, L), "Baltimore Street");
    s += label(go.x, gp.y + 54 * gs, "Cemetery gate");
    var half = ls * 6.4 + 12;
    var plx = Math.min(W - half, Math.max(half, state.platform.x));
    s += label(plx, state.platform.y - 14, "The Dedication waits here", "dedication");
    s += '</g>';

    s += '<rect class="vignette" width="' + W + '" height="' + H + '" fill="url(#vig)" pointer-events="none"/>';
    s += '</svg>';

    el.innerHTML = s;
    state.svg = el.firstChild;
    paint();
  }

  function hillY(hp, x) {
    for (var i = 1; i < hp.length; i++) if (x <= hp[i][0]) {
      var u = (x - hp[i - 1][0]) / ((hp[i][0] - hp[i - 1][0]) || 1);
      return hp[i - 1][1] + (hp[i][1] - hp[i - 1][1]) * u;
    }
    return hp[hp.length - 1][1];
  }

  /* ---------- state painting ---------- */
  function paint() {
    var svg = state.svg; if (!svg) return;
    var st = state.status || {};
    var lit = 0;
    IDS.forEach(function (id) {
      var g = svg.querySelector('.post[data-id="' + id + '"]'), pool = svg.querySelector('.pool[data-id="' + id + '"]');
      var o = st[id] || {};
      if (!g) return;
      g.classList.toggle("lit", !!o.lit);
      g.classList.toggle("shining", !!o.shining);
      g.classList.toggle("next", !!o.next && !o.lit);
      if (pool) pool.classList.toggle("lit", !!o.lit);
      if (o.lit) lit++;
    });
    var willsOn = !!((st.g1 || {}).lit && (st.g2 || {}).lit);
    var c = svg.querySelector(".wills .candle"), cg = svg.querySelector(".wills .candle-glow");
    if (c) c.setAttribute("opacity", willsOn ? ".95" : ".16");
    if (cg) cg.setAttribute("opacity", willsOn ? ".9" : "0");
    paintCrowd();
  }

  /* One or two people gather near each lit post and stay there. */
  function paintCrowd() {
    var svg = state.svg; if (!svg) return;
    var layer = svg.querySelector(".crowd"); if (!layer) return;
    var st = state.status || {}, out = [];
    (state.posts || []).forEach(function (p, i) {
      if (!(st[p.id] || {}).lit) return;
      var n = (i % 3 === 1) ? 2 : 1;
      for (var j = 0; j < n; j++) {
        var rr = rng(500 + i * 13 + j);
        var sgn = ((i + j) % 2) ? 1 : -1;
        var along = (j ? -1 : 1) * (26 + rr() * 30) * p.s;
        var across = sgn * (40 + rr() * 26) * p.s;
        var x = p.x + p.tx * along - p.ty * across, y = p.y + p.ty * along + p.tx * across;
        var kind = FIG_ORDER[(i * 3 + j * 5) % FIG_ORDER.length];
        var sc = p.s * (0.92 + rr() * 0.14);
        var dir = x < p.x ? 1.4 : -1.4;
        out.push({ y: y, svg: '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + sc.toFixed(3) + ')">' +
          '<use href="#fig-' + kind + '" x="' + dir + '" fill="#e9b468" opacity=".55"/>' +
          '<use href="#fig-' + kind + '" fill="#07090e"/></g>' });
      }
    });
    out.sort(function (A, B) { return A.y - B.y; });
    layer.innerHTML = out.map(function (q) { return q.svg; }).join("");
  }

  function ignite(id) {
    return new Promise(function (resolve) {
      var svg = state.svg; if (!svg) { resolve(); return; }
      var g = svg.querySelector('.post[data-id="' + id + '"]');
      if (!g) { resolve(); return; }
      state.status[id] = Object.assign({}, state.status[id] || {}, { lit: true, next: false });
      g.classList.remove("next");
      g.classList.add("igniting");
      paint();
      if (!reduced()) {
        var em = g.querySelector(".p-embers"), html = "";
        for (var i = 0; i < 9; i++) {
          var dx = (i - 4) * 5 + ((i * 7) % 5) - 2;
          html += '<circle class="ember" cx="' + dx + '" cy="-92" r="' + (1.6 + (i % 3) * 0.6) + '" style="--dx:' + (dx * 1.6) + 'px;--dl:' + (i * 0.07).toFixed(2) + 's"/>';
        }
        if (em) em.innerHTML = html;
      }
      var done = false;
      function finish() {
        if (done) return; done = true;
        g.classList.remove("igniting");
        var em2 = g.querySelector(".p-embers"); if (em2) em2.innerHTML = "";
        resolve();
      }
      ignite.skip = finish;
      setTimeout(finish, reduced() ? 700 : 2400);
    });
  }

  function mount(el) {
    state.el = el;
    draw();
    if (state.ro) state.ro.disconnect();
    var last = el.clientWidth + "x" + el.clientHeight;
    if (window.ResizeObserver) {
      state.ro = new ResizeObserver(function () {
        var now = el.clientWidth + "x" + el.clientHeight;
        if (now === last || !el.clientWidth) return;
        last = now;
        clearTimeout(mount._t);
        mount._t = setTimeout(draw, 120);
      });
      state.ro.observe(el);
    } else {
      window.addEventListener("resize", function () { clearTimeout(mount._t); mount._t = setTimeout(draw, 150); });
    }
  }

  function update(status) {
    state.status = Object.assign({}, status || {});
    paint();
  }

  function place(id) { return PLACE_NAME[PLACE[id]] || ""; }
  /* "Tomorrow: the Baltimore Street lanterns": named for where most of those posts stand. */
  function teaser(ids) {
    ids = (ids || []).filter(function (id) { return PLACE[id]; });
    if (!ids.length) return "";
    var count = {}, best = PLACE[ids[0]];
    ids.forEach(function (id) { var p = PLACE[id]; count[p] = (count[p] || 0) + 1; if (count[p] > count[best]) best = p; });
    return "Tomorrow: " + (count[best] === 1 ? PLACE_ONE[best] : PLACE_TEASE[best]);
  }

  root.Scene = { mount: mount, update: update, ignite: ignite, place: place, teaser: teaser, redraw: draw, IDS: IDS };
})(typeof window !== "undefined" ? window : this);
