/* Quiet Field 2: the games. One typing engine (the Ladder, cold recall, the Seams and the Night Walk
   all use it) and the small synthesized sounds that go with it.

   Juice.unlock()  call inside a tap. Juice.tick(k, n), .ink(), .bell(), .whoomp(), .step()
   Trail(el, {words, mode, rung, given, onWord, onDone})   renders words into el and takes letters
     .key(ch)  one typed character      .peek()  next word in faint gold      .line(n) next n words
     .stats()  {total, clean, misses, peeks, lines}   .done                                         */
(function (root) {
  "use strict";

  /* ---------- sound ---------- */
  var ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem("qf2-sound") === "off"; } catch (e) {}
  function ac() {
    if (ctx) return ctx;
    var C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.9;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function unlock() {
    var c = ac(); if (!c) return;
    try {
      if (c.state !== "running") c.resume();
      var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) {}
  }
  function live() { var c = ac(); return (!muted && c && c.state === "running") ? c : null; }

  /* D major pentatonic, two octaves: each lantern climbs it from its first word to its last. */
  var PENTA = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0, 987.77];
  function tone(freq, t0, dur, gain, type, dest) {
    var c = ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || "triangle"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function lowpass(freq) {
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq; f.connect(master); return f;
  }
  function noise(dur) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur)), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(); s.buffer = b; return s;
  }
  function tick(k, n) {
    var c = live(); if (!c) return;
    var idx = n > 1 ? Math.round((k / (n - 1)) * (PENTA.length - 1)) : 0;
    var t = c.currentTime + 0.005, lp = lowpass(2600);
    tone(PENTA[idx], t, 0.22, 0.11, "triangle", lp);
    tone(PENTA[idx] * 2, t, 0.09, 0.025, "sine", lp);
  }
  /* a soft brush of ink: the word writes itself in gold */
  function ink() {
    var c = live(); if (!c) return;
    var t = c.currentTime + 0.005, s = noise(0.28), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "bandpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.25); f.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.3);
    tone(220, t, 0.35, 0.03, "sine", lowpass(800));
  }
  /* a lantern catches: filtered-noise whoomp and a warm sixth */
  function whoomp() {
    var c = live(); if (!c) return;
    var t = c.currentTime + 0.01, s = noise(0.6), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "lowpass"; f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.18); f.frequency.exponentialRampToValueAtTime(300, t + 0.55);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.62);
    tone(293.66, t + 0.12, 1.4, 0.07, "sine");
    tone(493.88, t + 0.16, 1.3, 0.05, "sine");
  }
  /* one distant bell, inharmonic partials, long warm decay */
  function bell() {
    var c = live(); if (!c) return;
    var t = c.currentTime + 0.02, base = 196, lp = lowpass(3200);
    [[0.5, 0.10, 3.2], [1, 0.12, 2.6], [1.183, 0.05, 2.0], [1.506, 0.045, 1.7], [2, 0.04, 1.4], [2.514, 0.022, 1.0], [2.662, 0.018, 0.9], [3.011, 0.012, 0.7]]
      .forEach(function (p) { tone(base * p[0], t, p[2], p[1], "sine", lp); });
  }
  /* a quiet two-note step when a stage of the evening is done */
  function step() {
    var c = live(); if (!c) return;
    var t = c.currentTime + 0.01, lp = lowpass(2000);
    tone(440, t, 0.4, 0.06, "triangle", lp);
    tone(587.33, t + 0.12, 0.6, 0.06, "triangle", lp);
  }
  function setMuted(m) { muted = !!m; try { localStorage.setItem("qf2-sound", m ? "off" : "on"); } catch (e) {} }

  var Juice = { unlock: unlock, tick: tick, ink: ink, whoomp: whoomp, bell: bell, step: step,
    muted: function () { return muted; }, setMuted: setMuted };

  /* ---------- words ---------- */
  var D = function () { return root.QF_DATA || {}; };
  function bare(w) { return String(w || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function first(w) { var b = bare(w); return b.charAt(0); }
  function isFn(w) { var d = D(); return d.isFunctionWord ? d.isFunctionWord(w) : false; }
  /* Like QF_DATA.tokenize, but the dash stays printed on the word before it. */
  function displayWords(text, fallback) {
    var out = [];
    String(text || "").split(/\s+/).forEach(function (piece) {
      if (!piece) return;
      var parts = piece.split("—");
      parts.forEach(function (p, i) { if (p) out.push(p + (i < parts.length - 1 ? "—" : "")); });
    });
    if (fallback && fallback.length && out.length !== fallback.length) return fallback.slice();
    return out;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  /* how a waiting word looks on each rung */
  function showFor(word, rung) {
    var fw = isFn(word);
    if (rung <= 0) return "word";
    if (rung === 1) return fw ? "blank" : "word";
    if (rung === 2) return "letter";
    if (rung === 3) return fw ? "blank" : "letter";
    return "none";
  }

  /* ---------- the typing engine ---------- */
  function Trail(el, o) {
    o = o || {};
    var words = o.words || [], given = o.given || [], rung = typeof o.rung === "number" ? o.rung : 4;
    var pos = 0, misses = 0, peeks = 0, lines = 0, done = false, spans = [];
    var marks = [];

    var html = "";
    if (given.length) {
      html += '<span class="given">' + given.map(function (w, i) { return '<span class="gw">' + esc(w) + '</span>' + (i < given.length - 1 && !/\u2014$/.test(w) ? " " : ""); }).join("") + '</span>' + (/\u2014$/.test(given[given.length - 1]) ? "" : " ");
    }
    words.forEach(function (w, i) {
      var show = showFor(w, rung), b = bare(w);
      var inner;
      if (show === "letter") inner = '<span class="cue">' + esc(w.charAt(0) === b.charAt(0) ? w.charAt(0) : w.slice(0, w.search(/[A-Za-z0-9]/) + 1)) + '</span><span class="t rest">' + esc(w.slice(w.search(/[A-Za-z0-9]/) + 1)) + '</span><span class="t full">' + esc(w) + '</span>';
      else inner = '<span class="t full">' + esc(w) + '</span>';
      html += '<span class="w s-' + show + '" data-i="' + i + '">' + inner + '</span>' + (i < words.length - 1 && !/\u2014$/.test(w) ? " " : "");
    });
    html += '<span class="caret" aria-hidden="true"></span>';
    el.innerHTML = html;
    el.classList.toggle("rung-4", rung >= 4);
    spans = Array.prototype.slice.call(el.querySelectorAll(".w"));
    var caret = el.querySelector(".caret");
    paintCur();

    function paintCur() {
      spans.forEach(function (s, i) { s.classList.toggle("cur", i === pos && !done); });
      if (caret) {
        caret.style.display = (!done && rung >= 4) ? "" : "none";
        if (!done && rung >= 4 && spans[pos]) spans[pos].parentNode.insertBefore(caret, spans[pos]);
      }
      var cur = spans[pos];
      if (cur && o.scroll !== false) keepVisible(cur);
    }
    function keepVisible(node) {
      var box = o.scroller || el.parentNode;
      if (!box || !box.getBoundingClientRect) return;
      var r = node.getBoundingClientRect(), b = box.getBoundingClientRect();
      if (r.bottom > b.bottom - 12 || r.top < b.top + 8) {
        box.scrollTop += (r.top - b.top) - b.height * 0.4;
      }
    }
    function settle(i, how) {
      var s = spans[i]; if (!s) return;
      s.classList.add(how === "ok" ? "ok" : "hint");
      marks[i] = how;
      if (how === "ok") tick(i, words.length); else ink();
      if (o.onWord) o.onWord(i, how);
    }
    function advance() {
      pos++;
      if (pos >= words.length) { done = true; paintCur(); if (o.onDone) setTimeout(function () { o.onDone(stats()); }, 260); return; }
      paintCur();
    }
    function key(ch) {
      if (done) return;
      var c = String(ch || "").toLowerCase();
      if (!/^[a-z0-9]$/.test(c)) return;
      var want = first(words[pos]);
      if (c === want) settle(pos, "ok");
      else { misses++; settle(pos, "miss"); }
      advance();
    }
    function peek() {
      if (done) return;
      peeks++; settle(pos, "peek"); advance();
    }
    function line(n) {
      if (done) return;
      lines++;
      for (var k = 0; k < (n || 2) && !done; k++) { settle(pos, "line"); advance(); }
    }
    function stats() {
      var clean = marks.filter(function (m) { return m === "ok"; }).length;
      return { total: words.length, clean: clean, misses: misses, peeks: peeks, lines: lines, ratio: words.length ? clean / words.length : 1 };
    }
    return { key: key, peek: peek, line: line, stats: stats, get done() { return done; }, get pos() { return pos; } };
  }

  /* Karaoke: the whole text laid out for listening, lit word by word as the voice reaches it. */
  function karaokeHtml(lanterns) {
    var g = 0, html = "", lastMv = 0;
    var mvNames = {};
    ((root.QF_DATA && root.QF_DATA.movements) || []).forEach(function (m) { mvNames[m.n] = m.name; });
    lanterns.forEach(function (L) {
      if (L.movement !== lastMv) {
        if (lastMv) html += "</p>";
        html += '<p class="mv"><span class="mv-name">' + ["", "I", "II", "III"][L.movement] + ". " + esc(mvNames[L.movement] || "") + '</span>';
        lastMv = L.movement;
      }
      displayWords(L.text, L.words).forEach(function (w) { html += '<span class="kw" data-g="' + (g++) + '">' + esc(w) + '</span>' + (/\u2014$/.test(w) ? "" : " "); });
    });
    return html + "</p>";
  }

  root.Juice = Juice;
  root.Games = { Trail: Trail, displayWords: displayWords, karaokeHtml: karaokeHtml, first: first, showFor: showFor, esc: esc };
})(typeof window !== "undefined" ? window : this);
