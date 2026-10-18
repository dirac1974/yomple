/* Quiet Field 2: the voice (window.FieldVoice).
   Plays per-lantern MP3 clips (audio/<voice>/<gid>.mp3) through WebAudio, never an <audio> element,
   so there is no streamed seeking and no iOS session hang. Word events come from timing.json:
   word times are relative to the full recording, and clip gN starts at lanterns[gN].s.
   Classic script; iOS 15+ Safari. No speech recognition tonight. */
(function (root) {
  "use strict";
  var AC = root.AudioContext || root.webkitAudioContext;
  var BASE = "audio/";
  var RAMP = 0.015, LEAD = 0.03, KEEP = 4;
  var voice = "rea";
  var ctx = null;
  var timing = null, timingP = null;
  var buffers = {}, pending = {}, lru = [];
  var current = null;

  function ua() { return String((root.navigator && root.navigator.userAgent) || ""); }
  function isIOS() {
    var u = ua(), nav = root.navigator || {};
    return /iPad|iPhone|iPod/.test(u) || (/Macintosh/.test(u) && (nav.maxTouchPoints || 0) > 1);
  }
  function setSession() {
    try {
      var s = root.navigator && root.navigator.audioSession;
      if (s && s.type !== "playback") s.type = "playback";
    } catch (e) {}
  }
  function ensureCtx() {
    if (!AC) return null;
    if (!ctx || ctx.state === "closed") {
      try { ctx = new AC(); } catch (e) { ctx = null; }
    }
    return ctx;
  }
  function wake() {
    var c = ensureCtx();
    if (!c) return null;
    if (c.state === "suspended" || c.state === "interrupted") {
      try { var p = c.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }
    return c;
  }

  // Call inside a touchend/click handler. Cheap enough to call on every tap.
  function unlock() {
    setSession();
    var c = wake();
    if (!c) return false;
    try {
      var b = c.createBuffer(1, 1, 22050);
      var s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      if (s.start) s.start(0); else s.noteOn(0);
    } catch (e) {}
    return c.state === "running";
  }

  function url(name) { return BASE + voice + "/" + name; }
  function load() {
    if (timingP) return timingP;
    var v = voice;
    timingP = fetch(url("timing.json"), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("timing " + r.status); return r.json(); })
      .then(function (t) { if (v === voice) timing = t; return t; })
      .catch(function (e) { timingP = null; throw e; });
    return timingP;
  }
  function decode(c, arr) {
    return new Promise(function (resolve, reject) {
      try {
        var p = c.decodeAudioData(arr, resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      } catch (e) { reject(e); }
    });
  }
  function touch(key) {
    var i = lru.indexOf(key);
    if (i >= 0) lru.splice(i, 1);
    lru.push(key);
    while (lru.length > KEEP) { var old = lru.shift(); delete buffers[old]; }
  }
  function clip(name) {
    var key = voice + "/" + name;
    if (buffers[key]) { touch(key); return Promise.resolve(buffers[key]); }
    if (pending[key]) return pending[key];
    var c = ensureCtx();
    if (!c) return Promise.reject(new Error("no audio"));
    pending[key] = fetch(url(name + ".mp3"))
      .then(function (r) { if (!r.ok) throw new Error(name + " " + r.status); return r.arrayBuffer(); })
      .then(function (a) { return decode(c, a); })
      .then(function (buf) { delete pending[key]; buffers[key] = buf; touch(key); return buf; })
      .catch(function (e) { delete pending[key]; throw e; });
    return pending[key];
  }
  function preload(gid) { return load().then(function () { return clip(gid); }).catch(function () { return null; }); }

  function Playback() {
    this.handlers = {};
    this.done = false;
    this.src = null; this.gain = null; this.timer = null;
  }
  Playback.prototype.on = function (evt, fn) {
    (this.handlers[evt] = this.handlers[evt] || []).push(fn);
    return this;
  };
  Playback.prototype.emit = function (evt, a, b) {
    (this.handlers[evt] || []).forEach(function (fn) { try { fn(a, b); } catch (e) {} });
  };
  Playback.prototype.finish = function (info) {
    if (this.done) return;
    this.done = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    var src = this.src, g = this.gain;
    if (src) {
      try {
        if (ctx && g && info.stopped) {
          var t = ctx.currentTime;
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.linearRampToValueAtTime(0, t + RAMP);
          src.stop(t + RAMP + 0.005);
        }
      } catch (e) { try { src.stop(); } catch (e2) {} }
      src.onended = null;
    }
    if (current === this) current = null;
    this.emit("end", info);
  };
  Playback.prototype.stop = function () { this.finish({ stopped: true, error: false }); };

  // opts: {lantern:'g3'} | {full:true} | {from:'g1', to:'g2'}
  function play(opts) {
    opts = opts || {};
    if (current) current.stop();
    var pb = new Playback();
    current = pb;
    setSession();
    var c = wake();
    if (!c) {
      setTimeout(function () { pb.emit("error", new Error("no audio")); pb.finish({ stopped: false, error: true }); }, 0);
      return pb;
    }
    load().then(function (t) {
      if (pb.done) return null;
      var name, offset = 0, dur, base = 0, w0 = 0, w1 = t.words.length - 1;
      if (opts.lantern && t.lanterns[opts.lantern]) {
        var L = t.lanterns[opts.lantern];
        name = opts.lantern; base = L.s; w0 = L.w0; w1 = L.w1;
      } else if (opts.from && t.lanterns[opts.from]) {
        var A = t.lanterns[opts.from], B = t.lanterns[opts.to] || A;
        name = "full"; offset = A.s; dur = B.e - A.s; base = 0; w0 = A.w0; w1 = B.w1;
      } else {
        name = "full";
      }
      return clip(name).then(function (buf) {
        if (pb.done) return;
        var c2 = wake();
        var src = c2.createBufferSource(), g = c2.createGain();
        src.buffer = buf;
        src.connect(g); g.connect(c2.destination);
        if (dur === undefined) dur = buf.duration - offset;
        dur = Math.max(0.05, Math.min(dur, buf.duration - offset));
        var at = c2.currentTime + LEAD;
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(1, at + RAMP);
        g.gain.setValueAtTime(1, at + Math.max(RAMP, dur - RAMP));
        g.gain.linearRampToValueAtTime(0, at + dur);
        src.start(at, offset, dur);
        pb.src = src; pb.gain = g;
        src.onended = function () { pb.finish({ stopped: false, error: false }); };
        pb.emit("start");
        // Word events: clip-relative time + where the clip starts in the full recording.
        var next = w0;
        var tick = function () {
          if (pb.done) return;
          var pos = (c2.currentTime - at) + offset + base;
          while (next <= w1 && t.words[next].s <= pos) { pb.emit("word", next, t.words[next]); next++; }
          if (c2.currentTime - at > dur + 0.5) { pb.finish({ stopped: false, error: false }); return; }
          pb.timer = setTimeout(tick, 30);
        };
        tick();
      });
    }).catch(function (e) {
      if (pb.done) return;
      pb.emit("error", e);
      pb.finish({ stopped: false, error: true });
    });
    return pb;
  }

  function stop() { if (current) current.stop(); }
  function setVoice(id) {
    id = String(id || "rea").replace(/[^a-z0-9_-]/gi, "") || "rea";
    if (id === voice) return voice;
    stop();
    voice = id; timing = null; timingP = null;
    return voice;
  }

  if (ctx === null && AC) {
    // Re-check after iOS interruptions (phone call, Siri): the next tap resumes it.
    var watch = function () { if (ctx && ctx.state !== "running") wake(); };
    if (root.document && root.document.addEventListener) {
      root.document.addEventListener("visibilitychange", function () {
        if (root.document.visibilityState === "visible") watch();
      });
    }
  }

  root.FieldVoice = {
    unlock: unlock, load: load, preload: preload, play: play, stop: stop, setVoice: setVoice,
    voice: function () { return voice; },
    words: function () { return timing ? timing.words : null; },
    timing: function () { return timing; },
    canPlay: function () { return !!AC && typeof root.fetch === "function"; },
    muteHint: function () { return isIOS() && !(root.navigator && root.navigator.audioSession); },
    state: function () { return ctx ? ctx.state : "none"; }
  };
})(typeof window !== "undefined" ? window : this);
