"use strict";
/* FieldVoice against a fake WebAudio + fetch: word events, offsets, ramps, end/stop. */
var assert = require("assert"), fs = require("fs"), path = require("path");
var vm = require("vm");
var H = require("./harness");
var timing = JSON.parse(fs.readFileSync(path.join(H.ROOT, "audio/rea/timing.json"), "utf8"));

function makeVoiceEnv(opts) {
  opts = opts || {};
  var timers = [], fetched = [], starts = [], ramps = [];
  var ctxObj = null;
  function FakeCtx() {
    ctxObj = this;
    this.state = opts.startState || "suspended";
    this.currentTime = 0;
    this.destination = {};
  }
  FakeCtx.prototype.resume = function () { this.state = "running"; return Promise.resolve(); };
  FakeCtx.prototype.createBuffer = function () { return { duration: 0 }; };
  FakeCtx.prototype.createGain = function () {
    return { connect: function () {}, gain: { value: 1,
      setValueAtTime: function (v, t) { ramps.push(["set", v, t]); },
      linearRampToValueAtTime: function (v, t) { ramps.push(["ramp", v, t]); },
      cancelScheduledValues: function () {} } };
  };
  FakeCtx.prototype.createBufferSource = function () {
    var s = { connect: function () {}, start: function (at, off, dur) { if (s.buffer && s.buffer.name) starts.push({ at: at, off: off, dur: dur, buf: s.buffer }); },
      stop: function () { s.stopped = true; } };
    return s;
  };
  FakeCtx.prototype.decodeAudioData = function (arr, ok) {
    var name = arr.name, L = timing.lanterns[name];
    var buf = { name: name, duration: name === "full" ? timing.duration : (L.e - L.s) };
    setTimeout(function () { ok(buf); }, 0);
  };
  var ctx = {
    console: console, Promise: Promise, JSON: JSON, Math: Math,
    setTimeout: function (fn, ms) { timers.push(fn); return timers.length; }, clearTimeout: function () {},
    navigator: opts.navigator || { userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)" },
    AudioContext: FakeCtx,
    document: { addEventListener: function () {}, visibilityState: "visible" },
    fetch: function (url) {
      fetched.push(url);
      var name = String(url).split("/").pop().replace(".mp3", "");
      return Promise.resolve({ ok: true, status: 200,
        json: function () { return Promise.resolve(timing); },
        arrayBuffer: function () { return Promise.resolve({ name: name }); } });
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(H.ROOT, "voice.js"), "utf8"), ctx, { filename: "voice.js" });
  // Let promises settle, then run queued timers, advancing the audio clock.
  function pump(seconds, step) {
    step = step || 0.03;
    var t0 = ctxObj ? ctxObj.currentTime : 0;
    var p = Promise.resolve();
    for (var i = 0; i <= Math.ceil(seconds / step); i++) {
      p = p.then(function () { return new Promise(function (r) { setImmediate(r); }); }).then(function () {
        if (ctxObj) ctxObj.currentTime += step;
        var q = timers.splice(0);
        q.forEach(function (fn) { fn(); });
      });
    }
    return p;
  }
  return { ctx: ctx, FV: ctx.FieldVoice, timers: timers, fetched: fetched, starts: starts, ramps: ramps, pump: pump, ac: function () { return ctxObj; } };
}

console.log("voice");
var all = [];
all.push(H.test("unlock resumes the context and sets the iOS audio session", function () {
  var nav = { userAgent: "x", audioSession: { type: "auto" } };
  var e = makeVoiceEnv({ navigator: nav });
  e.FV.unlock();
  assert.strictEqual(e.ac().state, "running");
  assert.strictEqual(nav.audioSession.type, "playback");
  assert.strictEqual(e.FV.muteHint(), false);
  var e2 = makeVoiceEnv();
  assert.strictEqual(e2.FV.muteHint(), true, "iOS with no audioSession: show the mute-switch hint");
  e2.ac && e2.FV.unlock();
  e2.ac().state = "interrupted";
  e2.FV.unlock();
  assert.strictEqual(e2.ac().state, "running", "re-checks interrupted on every call");
}));
all.push(H.test("play({lantern}) plays the clip file from 0 and emits that lantern's words in order, then end", function () {
  var e = makeVoiceEnv();
  e.FV.unlock();
  var words = [], ends = [];
  var pb = e.FV.play({ lantern: "g3" });
  pb.on("word", function (i) { words.push(i); }).on("end", function (info) { ends.push(info); });
  var L = timing.lanterns.g3;
  return e.pump((L.e - L.s) + 1).then(function () {
    assert.ok(e.fetched.some(function (u) { return /audio\/rea\/g3\.mp3$/.test(u); }));
    assert.strictEqual(e.starts.length, 1);
    assert.strictEqual(e.starts[0].off, 0);
    var expect = []; for (var i = L.w0; i <= L.w1; i++) expect.push(i);
    assert.deepStrictEqual(words, expect);
    assert.strictEqual(ends.length, 1);
    assert.strictEqual(ends[0].stopped, false);
    var r = e.ramps.filter(function (x) { return x[0] === "ramp"; });
    assert.ok(Math.abs((r[0][2] - e.starts[0].at) - 0.015) < 1e-9, "15 ms fade in");
  });
}));
all.push(H.test("word events use clip time + lanterns[g].s (first word fires near its own start)", function () {
  var e = makeVoiceEnv();
  e.FV.unlock();
  var firstAt = null;
  var pb = e.FV.play({ lantern: "g10" });
  pb.on("word", function (i) { if (firstAt === null) firstAt = e.ac().currentTime - e.starts[0].at; });
  var L = timing.lanterns.g10, w = timing.words[L.w0];
  return e.pump(2).then(function () {
    assert.ok(firstAt !== null);
    assert.ok(Math.abs(firstAt - (w.s - L.s)) < 0.07, "first word at clip time " + (w.s - L.s) + ", got " + firstAt);
    pb.stop();
  });
}));
all.push(H.test("play({from,to}) uses full.mp3 with an exact offset and duration", function () {
  var e = makeVoiceEnv();
  e.FV.unlock();
  e.FV.play({ from: "g1", to: "g2" });
  return e.pump(0.2).then(function () {
    var s = e.starts[0];
    assert.strictEqual(s.buf.name, "full");
    assert.strictEqual(s.off, timing.lanterns.g1.s);
    assert.ok(Math.abs(s.dur - (timing.lanterns.g2.e - timing.lanterns.g1.s)) < 1e-9);
    e.FV.stop();
  });
}));
all.push(H.test("stop() ends once; a new play() stops the previous one", function () {
  var e = makeVoiceEnv();
  e.FV.unlock();
  var ends = 0, ends2 = 0;
  var a = e.FV.play({ full: true });
  a.on("end", function (info) { ends++; assert.strictEqual(info.stopped, true); });
  return e.pump(0.5).then(function () {
    var b = e.FV.play({ lantern: "g1" });
    b.on("end", function () { ends2++; });
    b.stop(); b.stop();
    return e.pump(0.1);
  }).then(function () {
    assert.strictEqual(ends, 1);
    assert.strictEqual(ends2, 1);
  });
}));
all.push(H.test("setVoice switches the folder", function () {
  var e = makeVoiceEnv();
  e.FV.unlock();
  e.FV.setVoice("lincoln");
  e.FV.play({ lantern: "g2" });
  return e.pump(0.2).then(function () {
    assert.ok(e.fetched.some(function (u) { return u === "audio/lincoln/timing.json"; }));
    assert.ok(e.fetched.some(function (u) { return u === "audio/lincoln/g2.mp3"; }));
    e.FV.stop();
  });
}));
Promise.all(all).then(function () { console.log("voice: " + H.results.pass + " passed, " + H.results.fail + " failed"); });
