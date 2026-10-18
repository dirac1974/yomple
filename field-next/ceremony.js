/* Quiet Field 2: THE DEDICATION. 19 November 1863, daylight at last over the same road.

   A scene, not a test (spec decision 6, game design §4): the crowd, a short chorale, Everett's two
   hours, then she delivers the address "With my page" (a first-letter cue sheet) or "From memory"
   (lantern titles one at a time). Hint taps are allowed and never counted on screen. Both complete
   it. Optional on-device recording (never uploaded). A parchment certificate she can save.
   No timer, no score, no red; nothing moves behind the words while she recites.

   Ceremony.open({preview})   preview = the parent's look: works when not ready, records nothing
   Ceremony.paintHome()       app.js calls this from showHome(): the Dedication button + platform label
   Uses: QF.readiness(), QF.markDelivered(), QF.delivered(), QF.lanterns(), QF.movements(),
         toast(), showScreen(), showHome(), getActiveProfile(), Juice.muted()          Classic script. */
(function (root) {
  "use strict";
  var doc = root.document;
  var NS = "http://www.w3.org/2000/svg";

  /* ---------- small helpers ---------- */
  function $(id) { return doc.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function hasQF() { return typeof root.QF !== "undefined" && root.QF && typeof root.QF.readiness === "function"; }
  function profile() { try { return typeof root.getActiveProfile === "function" ? root.getActiveProfile() : null; } catch (e) { return null; } }
  function reduced() { try { return root.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function quiet() { try { return !!(root.Juice && root.Juice.muted()); } catch (e) { return false; } }
  function say(msg) { if (typeof root.toast === "function") root.toast(msg); }
  function f1(n) { return Math.round(n * 10) / 10; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
    "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen"];
  function numWord(n) { return NUM[n] || String(n); }
  function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function localDay() {
    if (hasQF() && root.QF.today) return root.QF.today();
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? "0" : "") + d.getDate();
  }
  function dayParts(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function longDate(s) { var d = dayParts(s); return DAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function shortDate(s) { var d = dayParts(s); return d.getDate() + " " + MONTHS[d.getMonth()]; }
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "speaker"; }

  /* ---------- readiness, gently said ---------- */
  function status() {
    if (!hasQF() || !profile()) return { ready: false, missing: [], delivered: [] };
    var r = root.QF.readiness();
    var d = root.QF.delivered ? root.QF.delivered() : [];
    return { ready: !!r.ready, missing: r.missing || [], delivered: d };
  }
  function waitingLine(st) {
    if (!hasQF() || !profile()) return "The Dedication waits here.";
    var unlit = 0, unshone = 0, seams = 0, runs = 0;
    root.QF.lanterns().forEach(function (L) {
      var it = root.QF.item(L.id) || {};
      if (!it.lit) unlit++; else if (!it.shining) unshone++;
    });
    (st.missing || []).forEach(function (m) {
      if (m.id === "runs") runs = parseInt(m.why, 10) || 1;
      else if (m.id.indexOf(">") > 0) seams++;
    });
    var line;
    if (unlit) line = capFirst(numWord(unlit)) + (unlit === 1 ? " lantern" : " lanterns") + " still to light.";
    else if (unshone) line = capFirst(numWord(unshone)) + (unshone === 1 ? " lantern" : " lanterns") + " still to shine.";
    else if (seams) line = capFirst(numWord(seams)) + (seams === 1 ? " join" : " joins") + " between lanterns still to make fast.";
    else if (runs) line = (runs === 1 ? "One more walk" : "Two walks") + " of the whole road, on different nights.";
    else line = "Nearly there.";
    return line + " The Dedication waits here.";
  }

  /* ---------- home: the button and the platform label ---------- */
  var SUN = '<svg class="ded-sun" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6.2"/>' +
    [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
      var r = a * Math.PI / 180;
      return '<path d="M' + f1(16 + Math.cos(r) * 9.5) + ' ' + f1(16 + Math.sin(r) * 9.5) + 'L' + f1(16 + Math.cos(r) * 13.5) + ' ' + f1(16 + Math.sin(r) * 13.5) + '"/>';
    }).join("") + '</svg>';
  function paintHome() {
    var pl = $("home-placard");
    var st = status();
    var slot = $("ded-slot");
    if (pl && st.ready) {
      if (!slot) {
        slot = doc.createElement("div");
        slot.id = "ded-slot";
        slot.className = "ded-slot";
        slot.innerHTML = '<button class="ded-call" id="btn-dedication" type="button">' + SUN +
          '<span class="ded-call-t">The Dedication</span><span class="ded-call-s" id="ded-call-s"></span></button>';
        var t = $("btn-tonight");
        if (t && t.parentNode === pl) pl.insertBefore(slot, t.nextSibling); else pl.appendChild(slot);
        $("btn-dedication").addEventListener("click", function () { open({}); });
      }
      slot.hidden = false;
      var last = st.delivered[st.delivered.length - 1];
      $("ded-call-s").textContent = last ? "Delivered " + shortDate(last.date) + ". Hold it again" : "19 November 1863. The platform is ready";
      if (pl) pl.classList.add("has-ded");
    } else {
      if (slot) slot.hidden = true;
      if (pl) pl.classList.remove("has-ded");
    }
    paintPlatform(st);
  }

  var sceneWatch = null;
  function watchScene() {
    var sc = $("scene");
    if (!sc || sceneWatch || !root.MutationObserver) return;
    sceneWatch = new root.MutationObserver(function () { paintPlatform(); });
    sceneWatch.observe(sc, { childList: true });
  }
  function paintPlatform(st) {
    watchScene();
    var sc = $("scene"), svg = sc && sc.querySelector("svg");
    if (!svg) return;
    var t = svg.querySelector("text.plaque.dedication");
    if (!t) return;
    st = st || status();
    var g = t.parentNode && t.parentNode.getAttribute && t.parentNode.getAttribute("class") === "ded-plaque" ? t.parentNode : null;
    if (!g) {
      g = doc.createElementNS(NS, "g");
      g.setAttribute("class", "ded-plaque");
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      t.parentNode.insertBefore(g, t);
      g.appendChild(t);
      g.addEventListener("click", onPlaque);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPlaque(); } });
    }
    t.textContent = st.ready ? "The Dedication" : "The Dedication waits here";
    g.setAttribute("aria-label", st.ready ? "The Dedication: begin" : "The Dedication waits here");
    g.classList.toggle("ready", !!st.ready);
    var fs = parseFloat(t.getAttribute("font-size")) || 24, x = parseFloat(t.getAttribute("x")) || 0, y = parseFloat(t.getAttribute("y")) || 0;
    var half = t.textContent.length * fs * 0.27 + 16;
    var hit = g.querySelector(".ded-hit");
    if (!hit) { hit = doc.createElementNS(NS, "rect"); hit.setAttribute("class", "ded-hit"); g.insertBefore(hit, t); }
    hit.setAttribute("x", f1(x - half)); hit.setAttribute("y", f1(y - fs * 1.15)); hit.setAttribute("width", f1(half * 2)); hit.setAttribute("height", f1(fs * 1.7));
    hit.setAttribute("rx", f1(fs * 0.3));
    var rib = g.querySelector(".ded-ribbon");
    if (st.delivered && st.delivered.length) {
      if (!rib) { rib = doc.createElementNS(NS, "g"); rib.setAttribute("class", "ded-ribbon"); g.appendChild(rib); }
      var rw = fs * 4.6, rh = fs * 1.15, ry = y - fs * 2.25, n = fs * 0.42;
      rib.innerHTML =
        '<path class="rib-tail" d="M' + f1(x - rw / 2 - fs * 0.9) + ' ' + f1(ry + rh * 0.18) + 'h' + f1(fs * 1.2) + 'v' + f1(rh) + 'h' + f1(-fs * 1.2) + 'l' + f1(n) + ' ' + f1(-rh / 2) + 'Z"/>' +
        '<path class="rib-tail" d="M' + f1(x + rw / 2 + fs * 0.9) + ' ' + f1(ry + rh * 0.18) + 'h' + f1(-fs * 1.2) + 'v' + f1(rh) + 'h' + f1(fs * 1.2) + 'l' + f1(-n) + ' ' + f1(-rh / 2) + 'Z"/>' +
        '<rect class="rib-band" x="' + f1(x - rw / 2) + '" y="' + f1(ry) + '" width="' + f1(rw) + '" height="' + f1(rh) + '"/>' +
        '<text class="rib-text" x="' + f1(x) + '" y="' + f1(ry + rh * 0.74) + '" text-anchor="middle" font-size="' + f1(fs * 0.78) + '">Delivered</text>';
    } else if (rib) rib.parentNode.removeChild(rib);
  }
  function onPlaque() {
    var st = status();
    if (st.ready) open({});
    else say(waitingLine(st));
  }

  /* ---------- the daylight scene ---------- */
  var FIG = {
    hat: '<rect x="-6" y="-70" width="12" height="13"/><rect x="-9.5" y="-58.5" width="19" height="2.6"/><circle cx="0" cy="-50" r="6"/><path d="M-10 -43Q0 -46 10 -43L12.5 -17L8 -17L7 0L2 0L1 -16L-1 -16L-2 0L-7 0L-8 -17L-12.5 -17Z"/>',
    bare: '<circle cx="0" cy="-50" r="6"/><path d="M-10 -43Q0 -46 10 -43L12.5 -17L8 -17L7 0L2 0L1 -16L-1 -16L-2 0L-7 0L-8 -17L-12.5 -17Z"/>',
    bonnet: '<path d="M-8.5 -47Q-8 -60 0 -60Q8 -60 8.5 -47L6 -46Q5 -55 0 -55Q-5 -55 -6 -46Z"/><circle cx="0" cy="-49" r="5.6"/><path d="M-6 -42Q0 -45 6 -42L8.5 -27L17 0L-17 0L-8.5 -27Z"/><path d="M-6 -41L-13 -26L-10 -25L-4 -36Z"/>',
    kepi: '<path d="M-6.5 -56L4 -60.5L6.5 -54L-6.5 -53Z"/><path d="M-7 -53.5L-11 -52L-7 -51.5Z"/><circle cx="0" cy="-48" r="5.8"/><path d="M-9 -41Q0 -44 9 -41L10.5 -18L7 -18L6 0L1.5 0L0.8 -16L-0.8 -16L-1.5 0L-6 0L-7 -18L-10.5 -18Z"/><rect x="10.5" y="-74" width="1.8" height="62"/>',
    cap: '<path d="M-6.5 -56L4 -60.5L6.5 -54L-6.5 -53Z"/><path d="M-7 -53.5L-11 -52L-7 -51.5Z"/><circle cx="0" cy="-48" r="5.8"/><path d="M-9 -41Q0 -44 9 -41L10.5 -18L7 -18L6 0L1.5 0L0.8 -16L-0.8 -16L-1.5 0L-6 0L-7 -18L-10.5 -18Z"/>',
    child: '<path d="M-5 -40Q0 -45 5 -40L5 -38L-5 -38Z"/><circle cx="0" cy="-34.5" r="4.6"/><path d="M-6.5 -29Q0 -31 6.5 -29L8 -12L5 -12L4.5 0L1 0L0.5 -11L-0.5 -11L-1 0L-4.5 0L-5 -12L-8 -12Z"/>',
    crutch: '<rect x="-5.5" y="-64" width="11" height="9"/><rect x="-8.5" y="-55.5" width="17" height="2.4"/><circle cx="0" cy="-48" r="5.8"/><path d="M-9 -41Q0 -44 9 -41L10 -17L6 -17L5 0L1 0L0 -16L-2 -16L-3 -10L-7 -10L-8 -17L-10 -17Z"/><path d="M-12 -39L-17 0L-15 0L-10 -38Z"/><rect x="-14.5" y="-41" width="7" height="2"/>',
    shawl: '<circle cx="0" cy="-47" r="5.6"/><path d="M-7 -52Q0 -58 7 -52L8 -44Q0 -48 -8 -44Z"/><path d="M-9 -42Q0 -46 9 -42L13 -24L15 0L-15 0L-13 -24Z"/>',
    seatedbare: '<circle cx="0" cy="-25" r="5.8"/><path d="M-10 -17Q0 -20 10 -17L12 0L-12 0Z"/>',
    seated: '<rect x="-5.5" y="-40" width="11" height="10"/><rect x="-8.5" y="-31" width="17" height="2.2"/><circle cx="0" cy="-24" r="5.6"/><path d="M-10 -17Q0 -20 10 -17L12 0L-12 0Z"/>',
    lincoln: '<rect x="-5.2" y="-91" width="10.4" height="19"/><rect x="-8.6" y="-73.4" width="17.2" height="2.4"/><circle cx="0" cy="-64.5" r="5.6"/>' +
      '<path d="M-4.6 -62Q0 -55 4.6 -62L4 -58.5Q0 -54.5 -4 -58.5Z"/><path d="M-9 -57Q0 -60 9 -57L10.5 -24L7 -22L6.2 0L2 0L1 -21L-1 -21L-2 0L-6.2 0L-7 -22L-10.5 -24Z"/>' +
      '<path d="M8.5 -50L14 -38L11.5 -36.8L7 -46Z"/><rect class="pages" x="11.2" y="-41" width="6.2" height="8.4" transform="rotate(-8 14 -37)"/>'
  };
  var KINDS = ["hat", "bonnet", "hat", "shawl", "cap", "hat", "child", "bonnet", "crutch", "hat", "shawl", "cap", "bare", "bonnet", "hat", "kepi"];

  function bareTree(x, y, h, r, col) {
    var lv = [[], [], [], [], [], [], []];
    function br(x0, y0, len, ang, d) {
      var x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      lv[d].push("M" + f1(x0) + " " + f1(y0) + "L" + f1(x1) + " " + f1(y1));
      if (d >= 6) return;
      var n = d < 2 ? 2 : (r() < 0.7 ? 2 : 3);
      for (var i = 0; i < n; i++) {
        var spread = 0.42 + r() * 0.36;
        br(x1, y1, len * (0.62 + r() * 0.16), ang + (i - (n - 1) / 2) * spread + (r() - 0.5) * 0.25, d + 1);
      }
    }
    br(x, y, h * 0.34, -Math.PI / 2 + (r() - 0.5) * 0.12, 0);
    var s = "";
    lv.forEach(function (p, d) {
      if (p.length) s += '<path d="' + p.join("") + '" stroke="' + col + '" stroke-width="' + f1(Math.max(0.5, h * 0.034 * Math.pow(0.64, d))) + '" stroke-linecap="round" fill="none"/>';
    });
    return s;
  }
  function gatehouseDay(x, y, s) {
    var b = "#9a6a55", st = "#cbbda3", dk = "#4b3a33";
    var g = '<g class="dd-gate">';
    g += '<rect x="' + f1(x - 64 * s) + '" y="' + f1(y - 48 * s) + '" width="' + f1(40 * s) + '" height="' + f1(48 * s) + '" fill="' + b + '"/>';
    g += '<rect x="' + f1(x + 24 * s) + '" y="' + f1(y - 48 * s) + '" width="' + f1(40 * s) + '" height="' + f1(48 * s) + '" fill="' + b + '"/>';
    g += '<path d="M' + f1(x - 68 * s) + ' ' + f1(y - 48 * s) + 'L' + f1(x - 44 * s) + ' ' + f1(y - 60 * s) + 'L' + f1(x - 20 * s) + ' ' + f1(y - 48 * s) + 'Z" fill="#6f5246"/>';
    g += '<path d="M' + f1(x + 20 * s) + ' ' + f1(y - 48 * s) + 'L' + f1(x + 44 * s) + ' ' + f1(y - 60 * s) + 'L' + f1(x + 68 * s) + ' ' + f1(y - 48 * s) + 'Z" fill="#6f5246"/>';
    g += '<rect x="' + f1(x - 26 * s) + '" y="' + f1(y - 92 * s) + '" width="' + f1(52 * s) + '" height="' + f1(92 * s) + '" fill="#a77562"/>';
    g += '<path d="M' + f1(x - 30 * s) + ' ' + f1(y - 92 * s) + 'L' + f1(x) + ' ' + f1(y - 108 * s) + 'L' + f1(x + 30 * s) + ' ' + f1(y - 92 * s) + 'Z" fill="#6f5246"/>';
    g += '<rect x="' + f1(x - 26 * s) + '" y="' + f1(y - 94 * s) + '" width="' + f1(52 * s) + '" height="' + f1(3 * s) + '" fill="' + st + '"/>';
    g += '<path d="M' + f1(x - 14 * s) + ' ' + f1(y) + 'L' + f1(x - 14 * s) + ' ' + f1(y - 46 * s) + 'Q' + f1(x) + ' ' + f1(y - 66 * s) + ' ' + f1(x + 14 * s) + ' ' + f1(y - 46 * s) + 'L' + f1(x + 14 * s) + ' ' + f1(y) + 'Z" fill="' + dk + '"/>';
    g += '<rect x="' + f1(x - 50 * s) + '" y="' + f1(y - 34 * s) + '" width="' + f1(9 * s) + '" height="' + f1(13 * s) + '" fill="#3f3530"/>';
    g += '<rect x="' + f1(x + 41 * s) + '" y="' + f1(y - 34 * s) + '" width="' + f1(9 * s) + '" height="' + f1(13 * s) + '" fill="#3f3530"/>';
    return g + '</g>';
  }
  function flag(x, y, w, h, cls) {
    var g = '<g class="' + (cls || "dd-flag") + '" style="transform-origin:' + f1(x) + 'px ' + f1(y + h / 2) + 'px">';
    for (var i = 0; i < 7; i++) g += '<rect x="' + f1(x) + '" y="' + f1(y + i * h / 7) + '" width="' + f1(w) + '" height="' + f1(h / 7 + 0.3) + '" fill="' + (i % 2 ? "#ece4d3" : "#a14c40") + '"/>';
    g += '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w * 0.42) + '" height="' + f1(h * 4 / 7) + '" fill="#3e4d6c"/>';
    return g + '</g>';
  }
  function platformDay(px, py, s) {
    var top = py - 42 * s, g = '<g class="dd-platform">';
    /* flags at the back corners */
    [-1, 1].forEach(function (k) {
      var fx = px + k * 118 * s;
      g += '<rect x="' + f1(fx - 1.4 * s) + '" y="' + f1(top - 150 * s) + '" width="' + f1(2.8 * s) + '" height="' + f1(150 * s) + '" fill="#4b3f33"/>';
      g += '<circle cx="' + f1(fx) + '" cy="' + f1(top - 152 * s) + '" r="' + f1(3 * s) + '" fill="#b98a2a"/>';
      g += flag(fx + 1.4 * s, top - 148 * s, 54 * s, 32 * s);
    });
    /* the dignitaries, seated, and the President among them */
    var seats = [-96, -74, -52, -30, 26, 48, 70, 94];
    seats.forEach(function (sx, i) {
      var bareHead = i === 2 || i === 5 || i === 7;
      g += '<use href="#dd-' + (bareHead ? "seatedbare" : "seated") + '" transform="translate(' + f1(px + (sx + (i % 2 ? 2 : -1.5)) * s) + ' ' + f1(top) + ') scale(' + f1(s * (0.94 + (i % 3) * 0.04)) + ')" fill="' + (i % 2 ? "#3a3a40" : "#303036") + '"/>';
    });
    g += '<g class="dd-lincoln" style="--rise:' + f1(40 * s) + '"><use href="#dd-lincoln" transform="translate(' + f1(px) + ' ' + f1(top) + ') scale(' + f1(s * 1.02) + ')" fill="#25252b"/></g>';
    /* front rail, then the deck front with its bunting */
    g += '<rect x="' + f1(px - 128 * s) + '" y="' + f1(top - 15 * s) + '" width="' + f1(256 * s) + '" height="' + f1(3 * s) + '" fill="#6b5038"/>';
    for (var b = 0; b <= 16; b++) g += '<rect x="' + f1(px - 127 * s + b * 15.8 * s) + '" y="' + f1(top - 13 * s) + '" width="' + f1(1.6 * s) + '" height="' + f1(13 * s) + '" fill="#6b5038"/>';
    g += '<rect x="' + f1(px - 132 * s) + '" y="' + f1(top) + '" width="' + f1(264 * s) + '" height="' + f1(42 * s) + '" fill="#8c6d4c"/>';
    for (var p = 1; p < 4; p++) g += '<rect x="' + f1(px - 132 * s) + '" y="' + f1(top + p * 10.5 * s) + '" width="' + f1(264 * s) + '" height="' + f1(0.9 * s) + '" fill="#6f553b" opacity=".7"/>';
    g += '<rect x="' + f1(px - 132 * s) + '" y="' + f1(top) + '" width="' + f1(264 * s) + '" height="' + f1(3.2 * s) + '" fill="#5e4632"/>';
    var cols = ["#a14c40", "#ece4d3", "#3e4d6c"];
    for (var sw = 0; sw < 6; sw++) {
      var x0 = px - 130 * s + sw * 43.3 * s, x1 = x0 + 43.3 * s;
      for (var c = 0; c < 3; c++) {
        var dy = (5 + c * 4.2) * s;
        g += '<path d="M' + f1(x0) + ' ' + f1(top + 3 * s + c * 3.4 * s) + 'Q' + f1((x0 + x1) / 2) + ' ' + f1(top + dy + 12 * s) + ' ' + f1(x1) + ' ' + f1(top + 3 * s + c * 3.4 * s) + '" stroke="' + cols[c] + '" stroke-width="' + f1(3.6 * s) + '" fill="none"/>';
      }
      g += '<circle cx="' + f1(x0) + '" cy="' + f1(top + 4 * s) + '" r="' + f1(2.6 * s) + '" fill="#b98a2a"/>';
    }
    /* a fan of bunting at the centre */
    for (var fc = 0; fc < 3; fc++) {
      var rr = (16 - fc * 5) * s;
      g += '<path d="M' + f1(px - rr) + ' ' + f1(top + 3 * s) + 'A' + f1(rr) + ' ' + f1(rr) + ' 0 0 0 ' + f1(px + rr) + ' ' + f1(top + 3 * s) + 'Z" fill="' + cols[fc] + '"/>';
    }
    g += '<rect x="' + f1(px - 134 * s) + '" y="' + f1(py - 3 * s) + '" width="' + f1(268 * s) + '" height="' + f1(4 * s) + '" fill="#5e4a3a" opacity=".55"/>';
    return g + '</g>';
  }

  var dayState = { el: null, ro: null, last: "" };
  function drawDay(el) {
    var w = el.clientWidth || root.innerWidth || 1024, h = el.clientHeight || root.innerHeight || 768;
    var asp = clamp(w / Math.max(1, h), 0.42, 2.4), tall = asp < 1.02;
    var H = 1000, W = Math.round(H * asp);
    var hz = (tall ? 0.31 : 0.43) * H, py = (tall ? 0.475 : 0.585) * H, px = (tall ? 0.5 : 0.585) * W;
    var s = tall ? clamp(W / 600, 0.62, 1.02) : 1;
    var r = rng(1119 + (tall ? 7 : 0));
    var out = '<svg xmlns="' + NS + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Cemetery Hill in daylight, 19 November 1863: the platform, the flags and the crowd">';
    out += '<defs>' +
      '<linearGradient id="ddSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9b9c8"/><stop offset=".45" stop-color="#c9d2d6"/><stop offset=".82" stop-color="#e3e0d3"/><stop offset="1" stop-color="#ece5d2"/></linearGradient>' +
      '<radialGradient id="ddSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbef" stop-opacity=".95"/><stop offset=".25" stop-color="#fff6de" stop-opacity=".55"/><stop offset="1" stop-color="#fff2d6" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="ddCloud" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fbfaf5" stop-opacity=".7"/><stop offset="1" stop-color="#fbfaf5" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="ddGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8b197"/><stop offset=".45" stop-color="#a39b7c"/><stop offset="1" stop-color="#7e7558"/></linearGradient>' +
      '<linearGradient id="ddDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1322"/><stop offset=".45" stop-color="#1c2338"/><stop offset=".8" stop-color="#3d3448"/><stop offset="1" stop-color="#5a3e44"/></linearGradient>' +
      '<linearGradient id="ddHaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eae6da" stop-opacity="0"/><stop offset=".6" stop-color="#eae6da" stop-opacity=".45"/><stop offset="1" stop-color="#eae6da" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="ddVig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#4a3c28" stop-opacity="0"/><stop offset="1" stop-color="#4a3c28" stop-opacity=".28"/></radialGradient>';
    Object.keys(FIG).forEach(function (k) { out += '<g id="dd-' + k + '">' + FIG[k] + '</g>'; });
    out += '</defs>';

    /* sky, a November sun, long thin clouds */
    out += '<rect width="' + W + '" height="' + H + '" fill="url(#ddSky)"/>';
    out += '<g class="dd-sunlight"><circle cx="' + f1(W * (tall ? 0.78 : 0.8)) + '" cy="' + f1(H * 0.1) + '" r="' + f1(H * 0.36) + '" fill="url(#ddSun)"/></g>';
    for (var c = 0; c < 6; c++) {
      out += '<ellipse cx="' + f1(r() * W) + '" cy="' + f1(H * (0.06 + r() * 0.2)) + '" rx="' + f1(160 + r() * 280) + '" ry="' + f1(10 + r() * 18) + '" fill="url(#ddCloud)"/>';
    }
    /* South Mountain, blue with distance, then the nearer ridges */
    var far = "M0 " + f1(hz - 14);
    for (var fx = 0; fx <= W + 40; fx += 40) far += "L" + fx + " " + f1(hz - 22 - 22 * Math.sin(fx / W * 4.4 + 1.2) - 8 * Math.sin(fx / W * 11) - r() * 3);
    out += '<path d="' + far + 'L' + W + ' ' + f1(hz + 40) + 'L0 ' + f1(hz + 40) + 'Z" fill="#9eaabb" opacity=".8"/>';
    var mid = "M0 " + f1(hz + 2);
    for (var mx = 0; mx <= W + 30; mx += 30) mid += "L" + mx + " " + f1(hz - 4 - 10 * Math.sin(mx / W * 6 + 0.4) - (mx > W * 0.7 ? 18 * Math.sin((mx / W - 0.7) / 0.3 * Math.PI) : 0));
    out += '<path d="' + mid + 'L' + W + ' ' + f1(hz + 60) + 'L0 ' + f1(hz + 60) + 'Z" fill="#a3a693" opacity=".9"/>';
    /* a far line of bare woods */
    var woods = "M0 " + f1(hz + 6);
    for (var wx = 0; wx <= W + 12; wx += 7 + r() * 6) woods += "L" + f1(wx) + " " + f1(hz + 4 - 3 - r() * 7);
    out += '<path d="' + woods + 'L' + W + ' ' + f1(hz + 14) + 'L0 ' + f1(hz + 14) + 'Z" fill="#8f8a7a" opacity=".75"/>';
    out += '<rect x="0" y="' + f1(hz - 70) + '" width="' + W + '" height="140" fill="url(#ddHaze)"/>';
    /* the hill */
    var crest = tall ? hz + 4 : py - 0.075 * H;
    out += '<path d="M0 ' + f1(hz + 10) + 'Q' + f1(W * 0.3) + ' ' + f1(hz + 2) + ' ' + f1(px) + ' ' + f1(crest) + 'Q' + f1(W * 0.85) + ' ' + f1(hz + 6) + ' ' + W + ' ' + f1(hz + 14) + 'L' + W + ' ' + H + 'L0 ' + H + 'Z" fill="url(#ddGround)"/>';
    /* the Evergreen gatehouse, and bare trees on the hill */
    out += gatehouseDay(tall ? W * 0.13 : W * 0.2, hz + 0.05 * H, (tall ? 0.42 : 0.55) * s);
    var tr = rng(23);
    var treeXs = tall ? [0.04, 0.3, 0.72, 0.93] : [0.06, 0.33, 0.41, 0.8, 0.9, 0.97];
    treeXs.forEach(function (tx, i) {
      var ty = hz + (0.035 + tr() * 0.03) * H;
      out += bareTree(tx * W, ty, (90 + tr() * 70) * s * (i % 2 ? 0.8 : 1), tr, "#77746a");
    });
    /* the new graves: rows of pale headboards in the half-circle */
    out += '<g class="dd-graves">';
    var gy = py - 0.055 * H;
    for (var a = 0; a < 4; a++) {
      var rx = (150 + a * 46) * s * (tall ? 0.85 : 1.2), ry = (16 + a * 7) * s;
      var n = Math.round(rx / (7.5 * s));
      for (var k = 0; k <= n; k++) {
        var th = Math.PI + (k / n) * Math.PI;
        var gx = px + Math.cos(th) * rx, gyy = gy - Math.abs(Math.sin(th)) * ry;
        var hs = (0.55 + a * 0.06) * s;
        out += '<rect x="' + f1(gx - 2 * hs) + '" y="' + f1(gyy - 7 * hs) + '" width="' + f1(4 * hs) + '" height="' + f1(7 * hs) + '" fill="#eee9dc"/>';
      }
    }
    out += '</g>';

    /* the platform first: the crowd stands in front of it */
    out += platformDay(px, py, s);

    /* far: a mass of heads and shoulders round the platform, too many to count */
    var y0 = py + 0.03 * H, y1 = H * 1.08;
    function scaleAt(yy) { var tt = clamp((yy - y0) / (y1 - y0), 0, 1); return s * (0.36 + 2.2 * Math.pow(tt, 1.55)); }
    var tNear = Math.pow((0.72 - 0.36) / 2.2, 1 / 1.55), yNear = y0 + tNear * (y1 - y0);
    var bands = Math.round(clamp((yNear - py) / 13, 6, 22));
    for (var band = 0; band < bands; band++) {
      var bu = band / (bands - 1);
      var by = py + 2 * s + bu * (yNear - py - 2 * s), hr = Math.max(1.8, scaleAt(by) * 7);
      var cv = Math.round(156 - bu * 48 + (band % 2 ? 7 : -3));
      var d = "M-10 " + f1(by + 90 * s), bx = -10 - r() * hr;
      while (bx < W + 10) {
        var lift = r() * hr * 0.8;
        d += "L" + f1(bx) + " " + f1(by + hr * 1.3 - lift) + "a" + f1(hr) + " " + f1(hr * 1.05) + " 0 0 1 " + f1(hr * 2) + " 0";
        bx += hr * (2.05 + r() * 0.7);
      }
      d += "L" + f1(W + 10) + " " + f1(by + 90 * s) + "Z";
      out += '<path d="' + d + '" fill="rgb(' + cv + ',' + (cv - 2) + ',' + (cv - 7) + ')"/>';
    }

    /* the same road, by day: it comes up through the crowd from where we stand to the platform */
    var r0 = { x: (tall ? 0.16 : 0.12) * W, y: H * 1.04 }, r1 = { x: (tall ? 0.1 : 0.16) * W, y: py + 0.1 * H }, r2 = { x: px - 150 * s, y: py + 8 * s };
    function road(t) {
      var u = 1 - t;
      return { x: u * u * r0.x + 2 * u * t * r1.x + t * t * r2.x, y: u * u * r0.y + 2 * u * t * r1.y + t * t * r2.y };
    }
    var rpts = [];
    for (var q = 0; q <= 80; q++) rpts.push(road(q / 80));
    function roadHalf(yy) { return 15 * scaleAt(yy); }
    function roadX(yy) {
      var best = rpts[0];
      rpts.forEach(function (p) { if (Math.abs(p.y - yy) < Math.abs(best.y - yy)) best = p; });
      return best.x;
    }
    out += '<g class="dd-road" stroke-linecap="round" fill="none">';
    for (var pass = 0; pass < 2; pass++) {
      for (var ri = 0; ri < rpts.length - 1; ri += 4) {
        var seg = "M" + f1(rpts[ri].x) + " " + f1(rpts[ri].y);
        for (var rj = ri + 1; rj <= Math.min(rpts.length - 1, ri + 4); rj++) seg += "L" + f1(rpts[rj].x) + " " + f1(rpts[rj].y);
        var hw = roadHalf(rpts[ri].y);
        out += '<path d="' + seg + '" stroke="' + (pass ? "#c2b597" : "#9c8f70") + '" stroke-width="' + f1(pass ? hw * 1.45 : hw * 2.1) + '"/>';
      }
    }
    out += '</g>';

    /* near: people, and the eighteen posts, sorted so the nearer stand in front */
    var items = [];
    var y = yNear, row = 0;
    while (y < y1) {
      var sc = scaleAt(y);
      var near = clamp((sc / s - 0.72) / 1.7, 0, 1);
      var cs = Math.round(108 - 72 * near);
      var shade = "rgb(" + cs + "," + (cs - 3) + "," + (cs - 8) + ")";
      var rim = sc > s * 1.0;
      var x = -24 * sc + r() * 12 * sc, rx0 = roadX(y), rh = roadHalf(y) + 9 * sc;
      while (x < W + 24 * sc) {
        if (Math.abs(x - rx0) > rh) {
          var kind = KINDS[Math.floor(r() * KINDS.length)];
          var jy = y + (r() - 0.5) * 4 * sc, js = sc * (0.9 + r() * 0.2), flip = r() < 0.5 ? -1 : 1;
          var lifter = kind === "hat" && near > 0.2 && r() < 0.34;
          var tf = 'translate(' + f1(x) + ' ' + f1(jy) + ') scale(' + f1(js * flip) + ' ' + f1(js) + ')';
          var g = "";
          if (rim) g += '<use href="#dd-' + (lifter ? "bare" : kind) + '" transform="translate(' + f1(x + 1.6 * sc) + ' ' + f1(jy - 0.8 * sc) + ') scale(' + f1(js * flip) + ' ' + f1(js) + ')" fill="#efe7d2" opacity=".32"/>';
          g += '<use href="#dd-' + (lifter ? "bare" : kind) + '" transform="' + tf + '" fill="' + shade + '"/>';
          if (lifter) {
            g += '<g class="dd-hat" style="--lift:' + f1(-18 * js) + 'px;--tilt:' + (flip * -12) + 'deg;--d:' + (0.1 + r() * 1.2).toFixed(2) + 's;transform-origin:' + f1(x) + 'px ' + f1(jy - 57 * js) + 'px">' +
              '<rect x="' + f1(x - 6 * js) + '" y="' + f1(jy - 70 * js) + '" width="' + f1(12 * js) + '" height="' + f1(13 * js) + '" fill="' + shade + '"/>' +
              '<rect x="' + f1(x - 9.5 * js) + '" y="' + f1(jy - 58.5 * js) + '" width="' + f1(19 * js) + '" height="' + f1(2.6 * js) + '" fill="' + shade + '"/></g>';
          }
          items.push({ y: jy, svg: g });
        }
        x += (19 + r() * 15) * sc;
      }
      y += (10 + r() * 4) * sc;
      row++;
    }
    for (var pi = 0; pi < 18; pi++) {
      var pt = road(0.07 + pi / 17 * 0.88), ps = scaleAt(pt.y) * 0.95;
      var side = pi % 2 ? 1 : -1, ox = pt.x + side * (roadHalf(pt.y) + 5 * ps);
      items.push({ y: pt.y + 0.5, svg: '<g transform="translate(' + f1(ox) + ' ' + f1(pt.y) + ') scale(' + f1(ps) + ')">' +
        '<rect x="-1.7" y="-60" width="3.4" height="60" fill="#3d3a36"/><rect x="-4" y="-2" width="8" height="3" fill="#3d3a36"/>' +
        '<path d="M-6.3 -70L6.3 -70L5 -59L-5 -59Z" fill="#e4dece" stroke="#3d3a36" stroke-width="1.7" stroke-linejoin="round"/>' +
        '<path d="M-8.2 -70L0 -77L8.2 -70Z" fill="#3d3a36"/><rect x="-1" y="-81" width="2" height="4.5" fill="#3d3a36"/></g>' });
    }
    items.sort(function (A, B) { return A.y - B.y; });
    out += '<g class="dd-crowd">' + items.map(function (it) { return it.svg; }).join("") + '</g>';

    out += '<rect width="' + W + '" height="' + H + '" fill="url(#ddVig)" pointer-events="none"/>';
    var stars = "";
    for (var sn = 0; sn < Math.round(W / 26); sn++) {
      var sx = r() * W, sy = r() * hz * 0.75;
      stars += '<circle cx="' + f1(sx) + '" cy="' + f1(sy) + '" r="' + f1(0.7 + r() * 0.9) + '" fill="#e8e2d0" opacity="' + (0.3 + r() * 0.5).toFixed(2) + '"/>';
    }
    out += '<g class="dd-dusk" pointer-events="none"><rect width="' + W + '" height="' + H + '" fill="url(#ddDusk)"/>' + stars + '</g>';
    out += '</svg>';
    el.innerHTML = out;
  }
  function mountDay(el) {
    dayState.el = el;
    drawDay(el);
    dayState.last = el.clientWidth + "x" + el.clientHeight;
    if (dayState.ro || !root.ResizeObserver) return;
    dayState.ro = new root.ResizeObserver(function () {
      var now = el.clientWidth + "x" + el.clientHeight;
      if (now === dayState.last || !el.clientWidth) return;
      dayState.last = now;
      clearTimeout(mountDay._t);
      mountDay._t = setTimeout(function () { drawDay(el); }, 140);
    });
    dayState.ro.observe(el);
  }

  /* ---------- sound: chorale, applause, and the optional atmosphere ---------- */
  var A = { ctx: null, master: null, wet: null, amb: null, wind: null, crowd: null, ambOn: false, noise: null };
  function audioStart() {
    var C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    if (!A.ctx || A.ctx.state === "closed") {
      try {
        A.ctx = new C();
        var c = A.ctx;
        var comp = c.createDynamicsCompressor();
        A.master = c.createGain(); A.master.gain.value = 0.9;
        A.master.connect(comp); comp.connect(c.destination);
        var conv = c.createConvolver(); conv.buffer = impulse(c);
        A.wet = c.createGain(); A.wet.gain.value = 1;
        A.wet.connect(conv); conv.connect(A.master);
        A.amb = c.createGain(); A.amb.gain.value = 0;
        A.amb.connect(A.master);
        var ambWet = c.createGain(); ambWet.gain.value = 0.35; A.amb.connect(ambWet); ambWet.connect(A.wet);
      } catch (e) { A.ctx = null; return null; }
    }
    try {
      if (A.ctx.state !== "running") A.ctx.resume();
      var b = A.ctx.createBuffer(1, 1, 22050), src = A.ctx.createBufferSource();
      src.buffer = b; src.connect(A.ctx.destination); src.start(0);
    } catch (e) {}
    return A.ctx;
  }
  /* 1.4 s of decaying stereo noise, softened above ~4 kHz, with one ground reflection at 40 ms */
  function impulse(c) {
    var sr = c.sampleRate, len = Math.floor(sr * 1.4), buf = c.createBuffer(2, len, sr);
    var a = 1 - Math.exp(-2 * Math.PI * 4000 / sr), refl = Math.floor(sr * 0.04);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), y = 0;
      for (var i = 0; i < len; i++) {
        y += a * ((Math.random() * 2 - 1) - y);
        d[i] = y * Math.exp(-6.9 * i / len) * 0.6;
      }
      d[refl] += 0.35;
    }
    return buf;
  }
  function noiseBuf(c, secs, pink) {
    var len = Math.floor(c.sampleRate * secs), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (pink) { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 2.2; }
      else d[i] = w;
    }
    return b;
  }
  function live() { return (A.ctx && A.ctx.state !== "closed") ? A.ctx : null; }

  /* "Old Hundredth" (1551), first line, for a reed organ: about 7.5 s, gone by 8 s */
  var CHORALE = [
    [1.1, [98.0, 196.0, 246.94, 293.66, 392.0]], [0.75, [164.81, 196.0, 246.94, 329.63, 392.0]],
    [0.75, [146.83, 220.0, 293.66, 369.99]], [0.75, [130.81, 196.0, 261.63, 329.63]],
    [0.75, [98.0, 196.0, 246.94, 293.66]], [0.75, [130.81, 261.63, 329.63, 392.0]],
    [0.75, [146.83, 293.66, 369.99, 440.0]], [1.9, [98.0, 196.0, 293.66, 392.0, 493.88]]
  ];
  function chorale() {
    var c = live(); if (!c || quiet()) return;
    var wave;
    try {
      var re = new Float32Array([0, 1, 0.42, 0.26, 0.14, 0.09, 0.05, 0.03]), im = new Float32Array(re.length);
      wave = c.createPeriodicWave(re, im);
    } catch (e) { wave = null; }
    var bus = c.createGain(), lp = c.createBiquadFilter(), send = c.createGain();
    lp.type = "lowpass"; lp.frequency.value = 2300;
    bus.gain.value = 0.9; send.gain.value = 0.55;
    bus.connect(lp); lp.connect(A.master); lp.connect(send); send.connect(A.wet);
    var t = c.currentTime + 0.12;
    CHORALE.forEach(function (ch) {
      var dur = ch[0];
      ch[1].forEach(function (fq, vi) {
        [-3, 3].forEach(function (cents) {
          var o = c.createOscillator(), g = c.createGain();
          if (wave) o.setPeriodicWave(wave); else o.type = "triangle";
          o.frequency.value = fq * Math.pow(2, cents / 1200);
          var peak = (vi === ch[1].length - 1 ? 0.034 : 0.022);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(peak, t + 0.16);
          g.gain.setValueAtTime(peak, t + dur - 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (dur > 1.5 ? 0.45 : 0.22));
          o.connect(g); g.connect(bus);
          o.start(t); o.stop(t + dur + 0.6);
        });
      });
      t += dur;
    });
  }
  /* applause from far across the field: claps thicken, hold, thin out (about 5.5 s) */
  function applause() {
    var c = live(); if (!c || quiet()) return;
    if (!A.noise) A.noise = noiseBuf(c, 2, false);
    var bus = c.createGain(), lp = c.createBiquadFilter(), send = c.createGain();
    lp.type = "lowpass"; lp.frequency.value = 3600;
    bus.gain.value = 0.55; send.gain.value = 0.7;
    bus.connect(lp); lp.connect(A.master); lp.connect(send); send.connect(A.wet);
    var t0 = c.currentTime + 0.15, T = 5.6, t = 0;
    while (t < T) {
      var dens = t < 0.9 ? 8 + t / 0.9 * 62 : (t < 3 ? 70 : 70 * Math.max(0.05, 1 - (t - 3) / (T - 3)));
      t += (0.4 + Math.random()) / dens;
      var s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), at = t0 + t;
      s.buffer = A.noise;
      bp.type = "bandpass"; bp.frequency.value = 900 + Math.random() * 1700; bp.Q.value = 1.1;
      var lvl = 0.05 + Math.random() * 0.09;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(lvl, at + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03 + Math.random() * 0.03);
      s.connect(bp); bp.connect(g); g.connect(bus);
      s.start(at, Math.random() * 1.9, 0.08); s.stop(at + 0.1);
    }
  }
  function ambienceBuild() {
    var c = live(); if (!c || A.wind) return;
    var pink = noiseBuf(c, 4, true), white = noiseBuf(c, 3, false);
    /* wind: band-passed pink noise drifting on a 0.07 Hz swell */
    var ws = c.createBufferSource(); ws.buffer = pink; ws.loop = true;
    var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 0.7;
    var wg = c.createGain(); wg.gain.value = 0;
    var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 210; lfo.connect(lg); lg.connect(bp.frequency);
    var lfo2 = c.createOscillator(), lg2 = c.createGain(); lfo2.frequency.value = 0.11; lg2.gain.value = 0.009; lfo2.connect(lg2); lg2.connect(wg.gain);
    ws.connect(bp); bp.connect(wg); wg.connect(A.amb);
    ws.start(); lfo.start(); lfo2.start();
    /* a distant crowd: low band-passed noise with a 3–5 Hz flutter, like far-off talk */
    var cs = c.createBufferSource(); cs.buffer = white; cs.loop = true;
    var cb = c.createBiquadFilter(); cb.type = "bandpass"; cb.frequency.value = 400; cb.Q.value = 1.2;
    var cl = c.createBiquadFilter(); cl.type = "lowpass"; cl.frequency.value = 1200;
    var cg = c.createGain(); cg.gain.value = 0;
    var flutter = c.createGain(); flutter.gain.value = 0.6;
    [3.1, 4.3, 5.2].forEach(function (hz) {
      var o = c.createOscillator(), og = c.createGain(); o.frequency.value = hz; og.gain.value = 0.14; o.connect(og); og.connect(flutter.gain); o.start();
    });
    cs.connect(cb); cb.connect(cl); cl.connect(flutter); flutter.connect(cg); cg.connect(A.amb);
    cs.start();
    A.wind = wg; A.crowd = cg;
  }
  /* levels by moment; the crowd falls quiet when the President rises; all out while recording */
  var LEVELS = { pre: [0.02, 0.012], dawn: [0.026, 0.013], everett: [0.022, 0.003], choose: [0.02, 0.002], recite: [0.012, 0], applause: [0.02, 0.016], cert: [0.018, 0.006] };
  function ambience() {
    var c = live(); if (!c) return;
    var on = C.atmos && !(REC.state === "recording" || REC.state === "asking");
    if (on) ambienceBuild();
    var t = c.currentTime, lv = LEVELS[C.phase] || [0.018, 0.006];
    try {
      A.amb.gain.cancelScheduledValues(t);
      A.amb.gain.setTargetAtTime(on ? 1 : 0, t, on ? 0.6 : 0.25);
      if (A.wind) { A.wind.gain.cancelScheduledValues(t); A.wind.gain.setTargetAtTime(lv[0], t, 0.8); }
      if (A.crowd) { A.crowd.gain.cancelScheduledValues(t); A.crowd.gain.setTargetAtTime(lv[1], t, C.phase === "everett" ? 1.2 : 0.8); }
    } catch (e) {}
  }
  function audioStop() {
    if (A.ctx) { try { A.ctx.close(); } catch (e) {} }
    A = { ctx: null, master: null, wet: null, amb: null, wind: null, crowd: null, ambOn: false, noise: null };
  }

  /* ---------- recording: on this device only ---------- */
  var REC = { state: "idle", stream: null, mr: null, chunks: [], mime: "", t0: 0, blob: null, url: null, dur: 0, kept: null, audio: null };
  function recSupported() {
    return !!(root.MediaRecorder && root.navigator && root.navigator.mediaDevices && typeof root.navigator.mediaDevices.getUserMedia === "function");
  }
  function isIOS() {
    var n = root.navigator || {};
    return /iPad|iPhone|iPod/.test(n.userAgent || "") || (n.platform === "MacIntel" && n.maxTouchPoints > 1);
  }
  function pickMime() {
    var MR = root.MediaRecorder;
    if (!MR || typeof MR.isTypeSupported !== "function") return "";
    var list = isIOS() ? ["audio/mp4", "audio/mp4;codecs=mp4a.40.2", "audio/aac", "audio/webm;codecs=opus", "audio/webm"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (var i = 0; i < list.length; i++) { try { if (MR.isTypeSupported(list[i])) return list[i]; } catch (e) {} }
    return "";
  }
  function session(type) { try { if (root.navigator.audioSession) root.navigator.audioSession.type = type; } catch (e) {} }
  function stopTracks(stream) {
    if (!stream) return;
    try { stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); } catch (e) {}
  }
  function recStart() {
    if (REC.state !== "idle" || !recSupported()) return;
    recDiscard();
    REC.state = "asking"; paintRec(); ambience();
    session("play-and-record");
    var run = C.run;
    root.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      if (run !== C.run || C.phase !== "recite") { stopTracks(stream); REC.state = "idle"; session("playback"); return; }
      var mime = pickMime(), mr;
      try { mr = mime ? new root.MediaRecorder(stream, { mimeType: mime }) : new root.MediaRecorder(stream); }
      catch (e) { try { mr = new root.MediaRecorder(stream); } catch (e2) { stopTracks(stream); REC.state = "idle"; session("playback"); paintRec(); return; } }
      REC.stream = stream; REC.mr = mr; REC.chunks = [];
      REC.mime = (mr.mimeType || mime || "audio/webm").split(";")[0];
      mr.ondataavailable = function (e) { if (e.data && e.data.size) REC.chunks.push(e.data); };
      mr.onstop = function () { recFinished(); };
      mr.start(1000);
      REC.t0 = Date.now(); REC.state = "recording";
      paintRec(); ambience();
    }, function () {
      REC.state = "idle"; session("playback"); paintRec(); ambience();
      say("The microphone is not available just now. The Dedication does not need it.");
    });
  }
  function recStop(done) {
    if (REC.state === "recording" && REC.mr) {
      REC.onDone = done;
      REC.dur = Date.now() - REC.t0;
      try { REC.mr.stop(); } catch (e) { recFinished(); return; }
      stopTracks(REC.stream);
      clearTimeout(recStop._t);
      recStop._t = setTimeout(function () { if (REC.state === "recording") recFinished(); }, 2500);
    } else if (done) done();
  }
  function recFinished() {
    if (REC.state !== "recording") return;
    stopTracks(REC.stream); REC.stream = null;
    var type = REC.mime || "audio/webm";
    REC.blob = REC.chunks.length ? new Blob(REC.chunks, { type: type }) : null;
    REC.chunks = []; REC.mr = null;
    REC.state = REC.blob && REC.blob.size ? "done" : "idle";
    REC.kept = null;
    session("playback");
    ambience();
    paintRec();
    var cb = REC.onDone; REC.onDone = null;
    if (cb) cb();
  }
  function recAbort() {
    if (REC.mr && REC.state === "recording") { REC.mr.onstop = null; try { REC.mr.stop(); } catch (e) {} }
    stopTracks(REC.stream);
    if (REC.state === "recording" || REC.state === "asking") session("playback");
    REC.stream = null; REC.mr = null; REC.chunks = [];
    if (REC.state === "recording" || REC.state === "asking") REC.state = "idle";
  }
  function recDiscard() {
    playerStop();
    if (REC.url) { try { URL.revokeObjectURL(REC.url); } catch (e) {} }
    REC.blob = null; REC.url = null; REC.kept = null; REC.dur = 0;
    if (REC.state === "done") REC.state = "idle";
  }
  function fmtDur(ms) { var s = Math.round((ms || 0) / 1000); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function extFor(mime) { return /mp4|aac/.test(mime || "") ? "m4a" : (/ogg/.test(mime || "") ? "ogg" : "webm"); }

  /* IndexedDB: {id, pid, date, at, mime, dur, data:ArrayBuffer}. Never uploaded anywhere. */
  var DB = "qf2-dedication", STORE = "recordings";
  function idb() {
    return new Promise(function (res, rej) {
      if (!root.indexedDB) { rej(new Error("no indexedDB")); return; }
      var rq;
      try { rq = root.indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
      rq.onupgradeneeded = function () { try { rq.result.createObjectStore(STORE, { keyPath: "id" }); } catch (e) {} };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  function idbDo(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, mode), st = tx.objectStore(STORE), out = fn(st);
        tx.oncomplete = function () { db.close(); res(out && out.result !== undefined ? out.result : out); };
        tx.onerror = function () { db.close(); rej(tx.error); };
        tx.onabort = function () { db.close(); rej(tx.error); };
      });
    });
  }
  function blobBuffer(b) {
    if (b.arrayBuffer) return b.arrayBuffer();
    return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsArrayBuffer(b); });
  }
  function keepRecording() {
    if (!REC.blob || C.preview) return Promise.resolve(null);
    var p = profile();
    var rec = { id: "r" + Date.now() + "-" + Math.floor(Math.random() * 1e6), pid: p ? p.id : "", date: localDay(), at: Date.now(), mime: REC.blob.type, dur: REC.dur };
    return blobBuffer(REC.blob).then(function (buf) {
      rec.data = buf;
      return idbDo("readwrite", function (st) { return st.put(rec); });
    }).then(function () {
      REC.kept = rec.id;
      try { if (root.navigator.storage && root.navigator.storage.persist) root.navigator.storage.persist(); } catch (e) {}
      return rec;
    });
  }
  function listRecordings() {
    var p = profile(), pid = p ? p.id : "";
    return idbDo("readonly", function (st) { return st.getAll(); }).then(function (all) {
      return (all || []).filter(function (r) { return r.pid === pid; }).sort(function (a, b) { return a.at - b.at; });
    }).catch(function () { return []; });
  }
  function deleteRecording(id) { return idbDo("readwrite", function (st) { return st.delete(id); }).catch(function () {}); }
  function recBlob(r) { return new Blob([r.data], { type: r.mime || "audio/webm" }); }

  /* one shared player */
  var PLAYER = { audio: null, url: null, key: "" };
  function playerStop() {
    if (PLAYER.audio) { try { PLAYER.audio.pause(); } catch (e) {} }
    if (PLAYER.url && PLAYER.own) { try { URL.revokeObjectURL(PLAYER.url); } catch (e) {} }
    var k = PLAYER.key;
    PLAYER = { audio: null, url: null, key: "" };
    if (k) paintPlayButtons();
  }
  function playBlob(blob, key) {
    if (PLAYER.key === key) { playerStop(); return; }
    playerStop();
    var url = URL.createObjectURL(blob), a = new Audio(url);
    PLAYER = { audio: a, url: url, key: key, own: true };
    a.onended = function () { if (PLAYER.audio === a) playerStop(); };
    var pr = a.play();
    if (pr && pr.catch) pr.catch(function () { if (PLAYER.audio === a) { playerStop(); say("It would not play just now. Try once more."); } });
    paintPlayButtons();
  }
  function paintPlayButtons() {
    var bs = doc.querySelectorAll("#screen-dedication [data-play]");
    Array.prototype.forEach.call(bs, function (b) { b.textContent = b.getAttribute("data-play") === PLAYER.key ? "Stop" : "Play it back"; });
  }

  /* share a file, or save it */
  function shareOrSave(blob, name, title) {
    var file = null;
    try { file = new File([blob], name, { type: blob.type }); } catch (e) { file = null; }
    var nav = root.navigator;
    if (file && nav.share && nav.canShare) {
      var ok = false;
      try { ok = nav.canShare({ files: [file] }); } catch (e) { ok = false; }
      if (ok) {
        return nav.share({ files: [file], title: title }).catch(function (e) {
          if (e && e.name === "AbortError") return;
          download(blob, name);
        });
      }
    }
    download(blob, name);
    return Promise.resolve();
  }
  function download(blob, name) {
    var url = URL.createObjectURL(blob), a = doc.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener"; a.style.display = "none";
    doc.body.appendChild(a); a.click();
    setTimeout(function () { try { doc.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 4000);
  }

  /* ---------- the certificate (drawn to a canvas, saved as PNG) ---------- */
  var SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif';
  function scPieces(text, size) {
    var out = [];
    String(text).split("").forEach(function (ch) {
      var low = ch !== ch.toUpperCase() && /[a-z]/.test(ch);
      out.push({ ch: ch.toUpperCase(), size: low ? size * 0.78 : size });
    });
    return out;
  }
  function scWidth(ctx, text, size, track) {
    var w = 0;
    scPieces(text, size).forEach(function (p) { ctx.font = p.size.toFixed(1) + "px " + SERIF; w += ctx.measureText(p.ch).width + track; });
    return w - track;
  }
  function scDraw(ctx, text, x, y, size, track) {
    scPieces(text, size).forEach(function (p) { ctx.font = p.size.toFixed(1) + "px " + SERIF; ctx.fillText(p.ch, x, y); x += ctx.measureText(p.ch).width + track; });
  }
  function diamond(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y); ctx.closePath(); ctx.fill(); }
  function drawCertificate(cv, o) {
    var portrait = !!o.portrait;
    var W = portrait ? 1240 : 1754, H = portrait ? 1754 : 1240;
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var r = rng(1863 + (o.seed || 0));
    /* laid paper, warm at the centre, browned at the edges, a little foxing */
    var bg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.72);
    bg.addColorStop(0, "#f6eed6"); bg.addColorStop(0.6, "#efe2c0"); bg.addColorStop(1, "#d9c393");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 46; i++) {
      var fx = r() * W, fy = r() * H, fr = 6 + r() * 40, fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      fg.addColorStop(0, "rgba(140,96,40," + (0.02 + r() * 0.035).toFixed(3) + ")"); fg.addColorStop(1, "rgba(140,96,40,0)");
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(120,90,50,.05)"; ctx.lineWidth = 1;
    for (var ln = 0; ln < H; ln += 9) { ctx.beginPath(); ctx.moveTo(0, ln + r()); ctx.lineTo(W, ln + r()); ctx.stroke(); }
    [[0, 0, W, 0, 0, 90], [0, H, W, H, 0, -90], [0, 0, 0, H, 90, 0], [W, 0, W, H, -90, 0]].forEach(function (e) {
      var g = ctx.createLinearGradient(e[0], e[1], e[0] + e[4], e[1] + e[5]);
      g.addColorStop(0, "rgba(110,70,25,.22)"); g.addColorStop(1, "rgba(110,70,25,0)");
      ctx.fillStyle = g;
      if (e[5]) ctx.fillRect(0, e[5] > 0 ? 0 : H - 90, W, 90); else ctx.fillRect(e[4] > 0 ? 0 : W - 90, 0, 90, H);
    });

    var BRICK = "#6e3b2e", INK = "#2a2016", SOFT = "#6b5a44", GILT = "#9c6508";
    var m = 64, band = 46, inner = m + 18 + band + 18;
    ctx.strokeStyle = BRICK; ctx.lineWidth = 4; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
    ctx.lineWidth = 1.2; ctx.strokeRect(m + 10, m + 10, W - 2 * m - 20, H - 2 * m - 20);
    ctx.strokeStyle = GILT; ctx.lineWidth = 1.4; ctx.strokeRect(inner - 8, inner - 8, W - 2 * inner + 16, H - 2 * inner + 16);
    ctx.strokeStyle = BRICK; ctx.lineWidth = 3; ctx.strokeRect(inner, inner, W - 2 * inner, H - 2 * inner);

    /* the eighteen lantern titles, in small caps, around the border */
    var titles = (o.titles || []).slice();
    var split = portrait ? [3, 6, 3, 6] : [5, 4, 5, 4];
    var sides = [], k0 = 0;
    split.forEach(function (n) { sides.push(titles.slice(k0, k0 + n)); k0 += n; });
    var bandMid = m + 10 + (inner - 8 - (m + 10)) / 2;
    var cornerPad = bandMid + 30;
    var lenH = W - 2 * cornerPad, lenV = H - 2 * cornerPad;
    var size = 25, track = 2.2;
    for (; size > 14; size -= 0.5) {
      var fits = sides.every(function (list, si) {
        var L = si % 2 ? lenV : lenH;
        var sum = list.reduce(function (a, t) { return a + scWidth(ctx, t, size, track); }, 0);
        return sum + (list.length + 1) * 26 <= L;
      });
      if (fits) break;
    }
    ctx.fillStyle = SOFT; ctx.textBaseline = "middle";
    sides.forEach(function (list, si) {
      var L = si % 2 ? lenV : lenH;
      var widths = list.map(function (t) { return scWidth(ctx, t, size, track); });
      var sum = widths.reduce(function (a, b) { return a + b; }, 0);
      var gap = (L - sum) / (list.length + 1);
      ctx.save();
      if (si === 0) ctx.translate(cornerPad, bandMid);
      else if (si === 1) { ctx.translate(W - bandMid, cornerPad); ctx.rotate(Math.PI / 2); }
      else if (si === 2) ctx.translate(cornerPad, H - bandMid);
      else { ctx.translate(bandMid, H - cornerPad); ctx.rotate(-Math.PI / 2); }
      var x = gap;
      list.forEach(function (t, ti) {
        ctx.fillStyle = SOFT;
        scDraw(ctx, t, x, 1, size, track);
        x += widths[ti];
        if (ti < list.length - 1) { ctx.fillStyle = GILT; diamond(ctx, x + gap / 2, 0, 5); }
        x += gap;
      });
      ctx.restore();
    });
    ctx.fillStyle = GILT;
    [[bandMid, bandMid], [W - bandMid, bandMid], [bandMid, H - bandMid], [W - bandMid, H - bandMid]].forEach(function (p) {
      diamond(ctx, p[0], p[1], 11);
      ctx.save(); ctx.strokeStyle = GILT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p[0], p[1], 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    });

    /* the words in the middle */
    var cx = W / 2, top = inner + (portrait ? 196 : 118);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    var eb = portrait ? ["Soldiers’ National Cemetery", "Gettysburg, 19 November 1863"] : ["Soldiers’ National Cemetery · Gettysburg · 19 November 1863"];
    ctx.fillStyle = BRICK;
    eb.forEach(function (line, li) {
      var ew = scWidth(ctx, line, 27, 3.2);
      scDraw(ctx, line, cx - ew / 2, top + li * 40, 27, 3.2);
    });
    var y = top + (eb.length - 1) * 40 + (portrait ? 78 : 64);
    ctx.strokeStyle = GILT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 150, y - 12); ctx.lineTo(cx - 18, y - 12); ctx.moveTo(cx + 18, y - 12); ctx.lineTo(cx + 150, y - 12); ctx.stroke();
    ctx.fillStyle = GILT; diamond(ctx, cx, y - 12, 8);
    ctx.textAlign = "center";
    y += portrait ? 150 : 112;
    ctx.fillStyle = INK;
    ctx.font = (portrait ? 92 : 104) + "px " + SERIF;
    if (portrait) { ctx.fillText("The Gettysburg", cx, y); y += 104; ctx.fillText("Address", cx, y); }
    else ctx.fillText("The Gettysburg Address", cx, y);
    y += portrait ? 128 : 92;
    ctx.fillStyle = SOFT; ctx.font = "italic 44px " + SERIF;
    ctx.fillText("delivered by", cx, y);
    y += portrait ? 172 : 148;
    var name = o.name || "a speaker on Cemetery Hill", ns = portrait ? 132 : 140;
    ctx.font = "italic " + ns + "px " + SERIF;
    while (ctx.measureText(name).width > W - 2 * inner - 120 && ns > 60) { ns -= 4; ctx.font = "italic " + ns + "px " + SERIF; }
    var ng = ctx.createLinearGradient(0, y - ns, 0, y + 10);
    ng.addColorStop(0, "#8a5a0e"); ng.addColorStop(0.55, "#6a4108"); ng.addColorStop(1, "#4e2f06");
    ctx.fillStyle = ng; ctx.fillText(name, cx, y);
    var nw = Math.min(ctx.measureText(name).width + 80, W - 2 * inner - 80);
    ctx.strokeStyle = GILT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx - nw / 2, y + 30); ctx.quadraticCurveTo(cx, y + 16, cx + nw / 2, y + 30); ctx.stroke();
    y += portrait ? 124 : 108;
    ctx.fillStyle = INK; ctx.font = "42px " + SERIF;
    ctx.fillText("on " + o.dateLine, cx, y);

    /* the last line of the address, quietly, and the seal */
    var qy = H - inner - (portrait ? 230 : 70);
    ctx.fillStyle = SOFT; ctx.font = "italic " + (portrait ? 28 : 29) + "px " + SERIF;
    var q1 = "“…that government of the people, by the people, for the people,", q2 = "shall not perish from the earth.”";
    if (portrait) { ctx.fillText(q1, cx, qy - 40); ctx.fillText(q2, cx, qy); }
    else { ctx.textAlign = "left"; ctx.fillText(q1, inner + 60, qy - 38); ctx.fillText(q2, inner + 60, qy); ctx.textAlign = "center"; }
    var sx = portrait ? cx : W - inner - 150, sy = portrait ? H - inner - 92 : H - inner - 150, sr = portrait ? 70 : 92;
    seal(ctx, sx, sy, sr, r);

    if (o.preview) {
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(-0.32);
      ctx.fillStyle = "rgba(110,59,46,.08)"; ctx.font = "bold " + (portrait ? 220 : 260) + "px " + SERIF;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("PREVIEW", 0, 0);
      ctx.restore();
      ctx.fillStyle = BRICK; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      var pl = "A preview · nothing kept";
      var pw = scWidth(ctx, pl, 22, 2);
      scDraw(ctx, pl, W / 2 - pw / 2, inner + 46, 22, 2);
    }
  }
  function seal(ctx, x, y, R, r) {
    /* ribbon tails */
    ctx.fillStyle = "#6e3b2e";
    [-1, 1].forEach(function (k) {
      ctx.beginPath();
      ctx.moveTo(x + k * R * 0.25, y + R * 0.4);
      ctx.lineTo(x + k * R * 0.75, y + R * 1.55);
      ctx.lineTo(x + k * R * 0.52, y + R * 1.38);
      ctx.lineTo(x + k * R * 0.38, y + R * 1.62);
      ctx.lineTo(x - k * R * 0.05, y + R * 0.5);
      ctx.closePath(); ctx.fill();
    });
    var g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R * 1.05);
    g.addColorStop(0, "#f3d58a"); g.addColorStop(0.45, "#cf9f3e"); g.addColorStop(1, "#8a5a12");
    ctx.fillStyle = g;
    ctx.beginPath();
    var n = 30;
    for (var i = 0; i <= n * 2; i++) {
      var a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? R * 0.93 : R;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(90,55,10,.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, R * 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, R * 0.56, 0, Math.PI * 2); ctx.stroke();
    /* words round the ring */
    var text = "GETTYSBURG · NOVEMBER XIX · MDCCCLXIII · ";
    ctx.fillStyle = "rgba(70,40,6,.85)"; ctx.font = "bold " + Math.round(R * 0.15) + "px " + SERIF;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var step = Math.PI * 2 / text.length;
    for (var c = 0; c < text.length; c++) {
      var ang = -Math.PI / 2 + c * step;
      ctx.save();
      ctx.translate(x + Math.cos(ang) * R * 0.68, y + Math.sin(ang) * R * 0.68);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillText(text[c], 0, 0);
      ctx.restore();
    }
    /* a lantern in the middle */
    ctx.fillStyle = "rgba(70,40,6,.85)";
    var u = R * 0.012;
    ctx.beginPath(); ctx.moveTo(x - 14 * u, y - 18 * u); ctx.lineTo(x, y - 30 * u); ctx.lineTo(x + 14 * u, y - 18 * u); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 12 * u, y - 16 * u); ctx.lineTo(x + 12 * u, y - 16 * u); ctx.lineTo(x + 9 * u, y + 12 * u); ctx.lineTo(x - 9 * u, y + 12 * u); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 12 * u, y + 13 * u, 24 * u, 4 * u);
    ctx.fillRect(x - 2.5 * u, y + 17 * u, 5 * u, 12 * u);
    ctx.fillStyle = "#f7e2a2";
    ctx.beginPath(); ctx.ellipse(x, y - 1 * u, 3.6 * u, 7 * u, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------- the ceremony ---------- */
  var C = { run: 0, phase: "", preview: false, mode: "", hints: 0, marked: false, at: 0, timers: [], memI: 0, memLine: 0, certDate: "", atmos: false };
  var MV_NUM = ["", "I", "II", "III"];

  function ensureScreen() {
    var el = $("screen-dedication");
    if (el) return el;
    el = doc.createElement("section");
    el.id = "screen-dedication";
    el.className = "screen screen-ded";
    el.setAttribute("aria-label", "The Dedication");
    el.innerHTML =
      '<div class="ded-scene" id="ded-scene" aria-hidden="true"></div>' +
      '<div class="ded-veil" aria-hidden="true"></div>' +
      '<header class="ded-head">' +
      '<button class="ded-tool" id="ded-leave" type="button">Leave</button>' +
      '<p class="ded-mark"><span>The Dedication</span><span class="ded-preview" id="ded-preview" hidden>Preview</span></p>' +
      '<button class="ded-tool" id="ded-atmos" type="button" aria-pressed="false" aria-label="Atmosphere" title="Atmosphere"><span class="ded-atmos-dot" aria-hidden="true"></span><span>Atmosphere</span></button>' +
      '</header>' +
      '<main class="ded-stage" id="ded-stage"></main>';
    doc.body.appendChild(el);
    $("ded-leave").addEventListener("click", leave);
    $("ded-atmos").addEventListener("click", function () {
      C.atmos = !C.atmos;
      try { localStorage.setItem("qf2-ded-atmos", C.atmos ? "on" : "off"); } catch (e) {}
      audioStart();
      paintAtmos(); ambience();
    });
    return el;
  }
  function paintAtmos() {
    var b = $("ded-atmos"); if (!b) return;
    b.setAttribute("aria-pressed", C.atmos ? "true" : "false");
    b.classList.toggle("on", C.atmos);
    b.setAttribute("aria-label", C.atmos ? "Atmosphere is on: wind and the distant crowd" : "Atmosphere is off");
  }
  function later(fn, ms) { var run = C.run; C.timers.push(setTimeout(function () { if (run === C.run) fn(); }, ms)); }
  function setPhase(p) {
    C.phase = p;
    var el = $("screen-dedication");
    el.setAttribute("data-phase", p);
    el.classList.toggle("still", p === "recite");
    ambience();
  }
  function stage(html, cls) {
    var st = $("ded-stage");
    st.className = "ded-stage" + (cls ? " " + cls : "");
    st.innerHTML = html;
    st.scrollTop = 0;
    var h = st.querySelector("[data-focus]");
    if (h) { try { h.focus({ preventScroll: true }); } catch (e) {} }
    return st;
  }
  function on(id, fn) { var b = $(id); if (b) b.addEventListener("click", fn); }

  function open(opts) {
    opts = opts || {};
    var st = status();
    if (!opts.preview && !st.ready) { say(waitingLine(st)); return; }
    try { if (typeof root.stopVoice === "function") root.stopVoice(); } catch (e) {}
    audioStart();
    var el = ensureScreen();
    C.run++;
    C.timers.forEach(clearTimeout); C.timers = [];
    C.preview = !!opts.preview; C.mode = ""; C.hints = 0; C.marked = false; C.memI = 0; C.memLine = 0;
    C.certDate = localDay();
    var pref = null;
    try { pref = localStorage.getItem("qf2-ded-atmos"); } catch (e) {}
    /* atmosphere: off under reduced motion or the quiet setting; otherwise her last choice (default on) */
    C.atmos = (quiet() || reduced()) ? false : (pref ? pref === "on" : true);
    REC.state = "idle"; recDiscard();
    $("ded-preview").hidden = !C.preview;
    el.classList.toggle("is-preview", C.preview);
    paintAtmos();
    if (typeof root.showScreen === "function") root.showScreen("screen-dedication"); else el.classList.add("on");
    setPhase("pre");
    mountDay($("ded-scene"));
    stage("");
    /* the light changes once: dusk gives way to the November afternoon */
    var go = function () { if (C.phase === "pre") phaseDawn(); };
    if (reduced()) go();
    else root.requestAnimationFrame(function () { root.requestAnimationFrame(go); });
  }

  function phaseDawn() {
    setPhase("dawn");
    chorale();
    stage(
      '<div class="ded-card ded-caption">' +
      '<p class="ded-eyebrow">The next afternoon</p>' +
      '<h1 class="ded-h" tabindex="-1" data-focus>Thursday, 19 November 1863</h1>' +
      '<p class="ded-p">Cemetery Hill, Gettysburg. Fifteen thousand people have come to dedicate the new cemetery. The band has played. The prayers are said.</p>' +
      '<div class="ded-actions"><button class="ded-btn primary" id="ded-next" type="button">Go on</button></div>' +
      '</div>', "at-foot");
    on("ded-next", phaseEverett);
  }
  function phaseEverett() {
    setPhase("everett");
    stage(
      '<div class="ded-card ded-caption">' +
      '<p class="ded-eyebrow">On the platform</p>' +
      '<p class="ded-quote" tabindex="-1" data-focus>Mr. Everett has spoken for two hours. Now the President rises.</p>' +
      '<div class="ded-actions"><button class="ded-btn primary" id="ded-next" type="button">Take your place</button></div>' +
      '</div>', "at-foot");
    on("ded-next", phaseChoose);
  }
  var ICON_PAGE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 6h18l8 8v28H12z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30 6v8h8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 21h4M24 21h3M30 21h3M17 27h3M23 27h5M31 27h2M17 33h5M25 33h3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var ICON_MEM = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 15L24 7L34 15Z" fill="currentColor"/><path d="M16 16H32L29.5 34H18.5Z" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="24" cy="26" rx="3" ry="5" fill="currentColor" opacity=".55"/><rect x="17" y="34" width="14" height="3" fill="currentColor"/><rect x="22.5" y="37" width="3" height="7" fill="currentColor"/></svg>';
  function phaseChoose() {
    setPhase("choose");
    stage(
      '<div class="ded-card ded-choose">' +
      '<p class="ded-eyebrow">Your turn</p>' +
      '<h2 class="ded-h2" tabindex="-1" data-focus>How will you deliver it?</h2>' +
      '<div class="ded-choices">' +
      '<button class="ded-choice" id="ded-page" type="button">' + ICON_PAGE +
      '<span class="ded-choice-t">With my page</span><span class="ded-choice-s">The first letter of every word, lantern by lantern. Lincoln held his pages too.</span></button>' +
      '<button class="ded-choice" id="ded-mem" type="button">' + ICON_MEM +
      '<span class="ded-choice-t">From memory</span><span class="ded-choice-s">Only the lantern titles, one at a time, when you tap Next.</span></button>' +
      '</div>' +
      '<p class="ded-fine">Either way, this is the Dedication. If a word hides, tap for it. Nobody keeps count.</p>' +
      '</div>', "at-foot");
    on("ded-page", function () { recite("page"); });
    on("ded-mem", function () { recite("memory"); });
  }

  /* the words of each lantern as printed (dashes stay on the word before) */
  function wordsOf(L) {
    if (root.Games && root.Games.displayWords) return root.Games.displayWords(L.text, L.words);
    return String(L.text).split(/\s+/);
  }
  function splitWord(w) {
    var m = String(w).match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/);
    return { lead: m ? m[1] : "", core: m ? m[2] : w, tail: m ? m[3] : "" };
  }
  function lanternsByMovement() {
    var out = [];
    if (!hasQF()) return out;
    var Ls = root.QF.lanterns(), byId = {};
    Ls.forEach(function (L) { byId[L.id] = L; });
    root.QF.movements().forEach(function (m) { out.push({ m: m, list: m.ids.map(function (id) { return byId[id]; }) }); });
    return out;
  }

  function recite(mode) {
    C.mode = mode;
    setPhase("recite");
    var head = '<header class="ded-sheet-head"><p class="ded-eyebrow">Gettysburg, 19 November 1863</p>' +
      '<h2 class="ded-sheet-title" tabindex="-1" data-focus>Address delivered at the dedication of the cemetery</h2></header>';
    var body = mode === "page" ? pageHtml() : memHtml();
    var recBtn = recSupported() ? '<div class="ded-rec-wrap"><button class="ded-rec" id="ded-rec" type="button"><span class="dot" aria-hidden="true"></span><span class="lbl">Record myself</span></button><span class="ded-rec-note" id="ded-rec-note">Stays on this device</span></div>' : '<div class="ded-rec-wrap"></div>';
    var acts = mode === "page"
      ? '<button class="ded-btn primary" id="ded-done" type="button">I have finished</button>'
      : '<button class="ded-btn" id="ded-line" type="button">Line!</button><button class="ded-btn primary" id="ded-next" type="button">Next</button>';
    stage('<div class="ded-sheet-wrap"><article class="ded-sheet ' + (mode === "page" ? "is-page" : "is-memory") + '">' + head + body + '</article></div>' +
      '<footer class="ded-bar">' + recBtn + '<div class="ded-bar-acts">' + acts + '</div></footer>', "reciting");
    on("ded-rec", function () { if (REC.state === "recording") recStop(); else if (REC.state === "idle" || REC.state === "done") recStart(); });
    paintRec();
    if (mode === "page") {
      on("ded-done", finish);
      var sheet = doc.querySelector("#screen-dedication .ded-sheet");
      sheet.addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest(".cue");
        if (!b) return;
        reveal(b, 2);
      });
    } else {
      on("ded-line", memLine);
      on("ded-next", memNext);
      paintMem();
    }
  }
  function pageHtml() {
    var h = "";
    lanternsByMovement().forEach(function (grp) {
      h += '<section class="ded-mv"><h3 class="ded-mv-h"><span class="ded-mv-n">' + MV_NUM[grp.m.n] + '</span>' + esc(grp.m.name) + '</h3>';
      grp.list.forEach(function (L) {
        h += '<div class="ded-lan"><h4 class="ded-lan-t">' + esc(L.title) + '</h4><p class="ded-cues">';
        wordsOf(L).forEach(function (w, k) {
          var p = splitWord(w), letter = (p.core.match(/[A-Za-z0-9]/) || [p.core.charAt(0)])[0];
          h += '<span class="cw">' + esc(p.lead) + '<button type="button" class="cue" data-g="' + L.id + '" data-k="' + k + '" aria-label="' + esc(letter) + ', tap for the word">' +
            '<span class="l">' + esc(letter) + '</span><span class="w">' + esc(p.core) + '</span></button>' + esc(p.tail) + '</span> ';
        });
        h += '</p></div>';
      });
      h += '</section>';
    });
    return '<div class="ded-page">' + h + '</div>';
  }
  /* a hint: this word and the next one show, quietly; nobody counts */
  function reveal(btn, n) {
    var g = btn.getAttribute("data-g"), k = +btn.getAttribute("data-k");
    var all = doc.querySelectorAll('#screen-dedication .cue[data-g="' + g + '"]');
    for (var i = k; i < Math.min(all.length, k + n); i++) all[i].classList.add("open");
    C.hints++;
  }
  function memHtml() {
    return '<div class="ded-mem">' +
      '<ol class="ded-mem-past" id="ded-mem-past" aria-label="Lanterns already said"></ol>' +
      '<div class="ded-mem-now" aria-live="polite">' +
      '<p class="ded-mem-mv" id="ded-mem-mv"></p>' +
      '<h3 class="ded-mem-title" id="ded-mem-title"></h3>' +
      '<p class="ded-mem-line" id="ded-mem-words"></p>' +
      '</div>' +
      '<p class="ded-mem-help" id="ded-mem-help">Say this lantern aloud, then tap Next for the one after. “Line!” gives the next two words.</p>' +
      '</div>';
  }
  function memList() { return hasQF() ? root.QF.lanterns() : []; }
  function paintMem() {
    var Ls = memList(), L = Ls[C.memI];
    if (!L) return;
    var mv = hasQF() ? root.QF.movements()[L.movement - 1] : null;
    $("ded-mem-mv").textContent = (mv ? MV_NUM[mv.n] + " · " + mv.name : "");
    $("ded-mem-title").textContent = L.title;
    var past = Ls.slice(Math.max(0, C.memI - 2), C.memI);
    $("ded-mem-past").innerHTML = past.map(function (P) { return "<li>" + esc(P.title) + "</li>"; }).join("");
    var w = wordsOf(L).slice(0, C.memLine);
    var words = $("ded-mem-words");
    words.textContent = w.length ? w.join(" ") + (C.memLine < wordsOf(L).length ? " …" : "") : "";
    words.classList.toggle("has", !!w.length);
    var help = $("ded-mem-help"); if (help) help.hidden = C.memI > 0;
    var next = $("ded-next");
    if (next) next.textContent = C.memI >= Ls.length - 1 ? "I have finished" : "Next";
    var line = $("ded-line");
    if (line) line.disabled = C.memLine >= wordsOf(L).length;
  }
  function memLine() { C.memLine += 2; C.hints++; paintMem(); }
  function memNext() {
    var Ls = memList();
    if (C.memI >= Ls.length - 1) { finish(); return; }
    C.memI++; C.memLine = 0;
    paintMem();
  }
  function paintRec() {
    var b = $("ded-rec"), note = $("ded-rec-note");
    if (!b) return;
    var lbl = b.querySelector(".lbl");
    b.classList.toggle("is-on", REC.state === "recording");
    b.disabled = REC.state === "asking";
    if (REC.state === "recording") { lbl.textContent = "Recording · tap to stop"; if (note) note.textContent = "On this device only"; }
    else if (REC.state === "asking") lbl.textContent = "Asking for the microphone…";
    else if (REC.state === "done") { lbl.textContent = "Record again"; if (note) note.textContent = "Recorded. It waits at the end"; }
    else { lbl.textContent = "Record myself"; if (note) note.textContent = "Stays on this device"; }
  }

  function finish() {
    if (C.phase !== "recite") return;
    var after = function () { phaseApplause(); };
    if (REC.state === "recording") recStop(after); else after();
  }
  function phaseApplause() {
    setPhase("applause");
    if (!C.preview && !C.marked && hasQF() && root.QF.markDelivered) {
      try { root.QF.markDelivered({ mode: C.mode === "memory" ? "memory" : "page", date: localDay() }); } catch (e) {}
      C.marked = true;
    }
    applause();
    stage(
      '<div class="ded-card ded-caption">' +
      '<p class="ded-eyebrow">Cemetery Hill</p>' +
      '<h1 class="ded-h" tabindex="-1" data-focus>It is delivered.</h1>' +
      '<p class="ded-p">Two hundred and seventy-one words, from “Four score” to “the earth.”</p>' +
      '<blockquote class="ded-letter"><p>“I should be glad, if I could flatter myself that I came as near to the central idea of the occasion, in two hours, as you did in two minutes.”</p>' +
      '<cite>Edward Everett to the President, the next day</cite></blockquote>' +
      '<div class="ded-actions"><button class="ded-btn primary" id="ded-next" type="button">' + (C.preview ? "See the certificate" : "Your certificate") + '</button></div>' +
      '</div>', "at-foot");
    on("ded-next", phaseCert);
  }

  function titles() { return hasQF() ? root.QF.lanterns().map(function (L) { return L.title; }) : []; }
  function paintCert() {
    var cv = $("ded-cert-canvas"); if (!cv) return;
    var p = profile();
    var portrait = (root.innerWidth || 1024) < (root.innerHeight || 768) * 0.9;
    if (cv.parentNode) cv.parentNode.classList.toggle("portrait", portrait);
    drawCertificate(cv, { name: p ? p.name : "", dateLine: longDate(C.certDate), titles: titles(), preview: C.preview, portrait: portrait, seed: C.certDate.length });
    cv.setAttribute("aria-label", "Certificate: The Gettysburg Address, delivered by " + (p ? p.name : "") + ", " + longDate(C.certDate));
  }
  function phaseCert() {
    setPhase("cert");
    var st = status();
    var dates = [];
    if (!C.preview) st.delivered.forEach(function (d) { if (dates.indexOf(d.date) < 0) dates.push(d.date); });
    var chips = dates.length > 1 ? '<div class="ded-dates"><span class="ded-dates-l">Your dedications</span>' + dates.map(function (d) {
      return '<button type="button" class="ded-chip' + (d === C.certDate ? " on" : "") + '" data-date="' + d + '">' + esc(shortDate(d)) + '</button>';
    }).join("") + '</div>' : "";
    stage(
      '<div class="ded-cert-wrap">' +
      '<h2 class="ded-vh" tabindex="-1" data-focus>Your certificate</h2>' +
      '<figure class="ded-cert"><canvas id="ded-cert-canvas" role="img"></canvas></figure>' +
      chips +
      '<div class="ded-cert-acts">' +
      '<button class="ded-btn primary" id="ded-save" type="button">Save image</button>' +
      '<button class="ded-btn" id="ded-again" type="button">Hold another dedication</button>' +
      '<button class="ded-btn" id="ded-home" type="button">Home</button>' +
      '</div>' +
      '<section class="ded-recs" id="ded-recs" hidden></section>' +
      '</div>', "scrolling");
    paintCert();
    on("ded-save", saveCert);
    on("ded-again", function () { open({ preview: C.preview }); });
    on("ded-home", leave);
    Array.prototype.forEach.call(doc.querySelectorAll("#screen-dedication .ded-chip"), function (b) {
      b.addEventListener("click", function () {
        C.certDate = b.getAttribute("data-date");
        Array.prototype.forEach.call(doc.querySelectorAll("#screen-dedication .ded-chip"), function (x) { x.classList.toggle("on", x === b); });
        paintCert();
      });
    });
    paintRecs();
  }
  function saveCert() {
    var cv = $("ded-cert-canvas"); if (!cv) return;
    var p = profile();
    var name = "gettysburg-address-" + slug(p ? p.name : "") + "-" + C.certDate + (C.preview ? "-preview" : "") + ".png";
    var done = function (blob) {
      if (!blob) { say("The image could not be made on this device."); return; }
      shareOrSave(blob, name, "The Gettysburg Address");
    };
    try { cv.toBlob(done, "image/png"); } catch (e) { say("The image could not be made on this device."); }
  }

  /* the recording, if she made one, and any she kept before */
  function paintRecs() {
    var box = $("ded-recs"); if (!box) return;
    if (!recSupported()) { box.hidden = true; return; }
    var run = C.run;
    (C.preview ? Promise.resolve([]) : listRecordings()).then(function (kept) {
      if (run !== C.run || C.phase !== "cert") return;
      var h = "";
      if (REC.blob && !REC.kept) {
        h += '<div class="ded-rec-card fresh"><p class="ded-rec-h">Your recording <span class="ded-rec-d">' + fmtDur(REC.dur) + '</span></p>' +
          '<div class="ded-rec-acts"><button class="ded-btn" type="button" data-play="fresh">Play it back</button>' +
          (C.preview ? "" : '<button class="ded-btn primary" type="button" id="ded-keep">Keep it</button>') +
          '<button class="ded-btn" type="button" id="ded-letgo">Let it go</button></div>' +
          '<p class="ded-rec-fine">' + (C.preview ? "A preview: this recording is not kept anywhere." : "Kept recordings stay on this device. Nothing is uploaded.") + '</p></div>';
      }
      var older = kept;
      if (older.length) {
        h += '<div class="ded-rec-card"><p class="ded-rec-h">Kept on this device</p><ul class="ded-rec-list">' + older.slice().reverse().map(function (k) {
          return '<li data-id="' + esc(k.id) + '"><span class="ded-rec-when">' + esc(shortDate(k.date)) + ' <span class="ded-rec-d">' + fmtDur(k.dur) + '</span></span>' +
            '<span class="ded-rec-acts"><button class="ded-btn small" type="button" data-play="' + esc(k.id) + '">Play it back</button>' +
            '<button class="ded-btn small" type="button" data-share="' + esc(k.id) + '">Share or save a copy</button>' +
            '<button class="ded-btn small quiet" type="button" data-del="' + esc(k.id) + '">Delete</button></span></li>';
        }).join("") + '</ul><p class="ded-rec-fine">Nothing here is uploaded. An iPad can clear stored recordings to make room, so save a copy of any you want to keep for good.</p></div>';
      }
      box.innerHTML = h;
      box.hidden = !h;
      var byId = {};
      kept.forEach(function (k) { byId[k.id] = k; });
      Array.prototype.forEach.call(box.querySelectorAll("[data-play]"), function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-play");
          if (id === "fresh") { if (REC.blob) playBlob(REC.blob, "fresh"); }
          else if (byId[id]) playBlob(recBlob(byId[id]), id);
        });
      });
      Array.prototype.forEach.call(box.querySelectorAll("[data-share]"), function (b) {
        b.addEventListener("click", function () {
          var k = byId[b.getAttribute("data-share")]; if (!k) return;
          var p = profile();
          shareOrSave(recBlob(k), "gettysburg-address-" + slug(p ? p.name : "") + "-" + k.date + "." + extFor(k.mime), "The Gettysburg Address");
        });
      });
      Array.prototype.forEach.call(box.querySelectorAll("[data-del]"), function (b) {
        b.addEventListener("click", function () {
          if (!b.classList.contains("confirm")) { b.classList.add("confirm"); b.textContent = "Tap again to delete"; return; }
          var id = b.getAttribute("data-del");
          if (PLAYER.key === id) playerStop();
          deleteRecording(id).then(paintRecs);
        });
      });
      on("ded-keep", function () {
        var btn = $("ded-keep"); if (btn) btn.disabled = true;
        keepRecording().then(function () { recDiscard(); paintRecs(); say("Kept on this device."); }, function () {
          if (btn) btn.disabled = false;
          say("This device would not keep it. Use Play it back, or try once more.");
        });
      });
      on("ded-letgo", function () { recDiscard(); REC.state = "idle"; paintRecs(); });
      paintPlayButtons();
    });
  }

  function leave() {
    C.run++;
    C.timers.forEach(clearTimeout); C.timers = [];
    recAbort(); recDiscard(); REC.state = "idle";
    playerStop();
    audioStop();
    C.phase = "";
    if (typeof root.showHome === "function") root.showHome();
  }

  /* leaving the page mid-recording: keep nothing half-made, free the microphone */
  root.addEventListener("pagehide", function () { recAbort(); });

  root.Ceremony = { open: open, paintHome: paintHome, paintPlatform: paintPlatform, waitingLine: function () { return waitingLine(status()); },
    _drawCertificate: drawCertificate, _state: function () { return { phase: C.phase, mode: C.mode, preview: C.preview, rec: REC.state, atmos: C.atmos }; } };

  /* app.js booted before this file loaded: paint the home once now */
  try { if (doc.body.getAttribute("data-screen") === "screen-home") paintHome(); } catch (e) {}
})(typeof window !== "undefined" ? window : this);
