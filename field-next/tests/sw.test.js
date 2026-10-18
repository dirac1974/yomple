"use strict";
/* sw.js against fake caches + fetch: what it intercepts, how it keys, network-first vs cache-first. */
var assert = require("assert"), fs = require("fs"), path = require("path"), vm = require("vm");
var H = require("./harness");
var SRC = fs.readFileSync(path.join(H.ROOT, "sw.js"), "utf8");
var ORIGIN = "https://yomple.com", SCOPE = ORIGIN + "/field-next/";

function env(opts) {
  opts = opts || {};
  var stores = {}, listeners = {}, fetched = [], online = opts.online !== false;
  function Store() { this.m = {}; }
  Store.prototype.put = function (k, res) { this.m[typeof k === "string" ? k : k.url] = res; return Promise.resolve(); };
  Store.prototype.match = function (req, o) {
    var u = typeof req === "string" ? req : req.url;
    if (o && o.ignoreSearch) u = u.split("?")[0];
    return Promise.resolve(this.m[u]);
  };
  Store.prototype.keys = function () { return Promise.resolve(Object.keys(this.m).map(function (u) { return { url: u }; })); };
  function Res(body, init) { init = init || {}; this.body = body; this.status = init.status || 200; this.ok = this.status < 300; this.type = "basic"; this.redirected = false; this.headers = {}; }
  Res.prototype.clone = function () { return new Res(this.body, { status: this.status }); };
  Res.prototype.text = function () { return Promise.resolve(String(this.body)); };
  Res.prototype.blob = function () { return Promise.resolve(this.body); };
  var caches = {
    open: function (n) { return Promise.resolve(stores[n] = stores[n] || new Store()); },
    keys: function () { return Promise.resolve(Object.keys(stores)); },
    delete: function (n) { delete stores[n]; return Promise.resolve(true); },
    match: function (req, o) {
      var names = Object.keys(stores), i = 0;
      function next() { if (i >= names.length) return Promise.resolve(undefined); return stores[names[i++]].match(req, o).then(function (r) { return r || next(); }); }
      return next();
    }
  };
  var self = {
    location: { href: SCOPE + "sw.js", origin: ORIGIN },
    registration: { scope: SCOPE },
    addEventListener: function (t, f) { listeners[t] = f; },
    skipWaiting: function () {}, clients: { claim: function () { return Promise.resolve(); } }
  };
  var ctx = {
    self: self, caches: caches, URL: URL, Promise: Promise, Response: Res, setTimeout: setTimeout, clearTimeout: clearTimeout, console: console,
    fetch: function (req) {
      var u = typeof req === "string" ? req : req.url;
      fetched.push(u);
      if (!online) return Promise.reject(new TypeError("offline"));
      if (/index\.html|\/field-next\/(\?|$)/.test(u)) return Promise.resolve(new Res('<script src="app.js?v=1"></script><script src="ceremony.js?v=1"></script>'));
      return Promise.resolve(new Res("net:" + u.replace(ORIGIN, "")));
    }
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  function Req(url, o) { o = o || {}; this.url = url; this.method = o.method || "GET"; this.mode = o.mode || "cors"; this.headers = { has: function (h) { return !!(o.headers && o.headers[h]); } }; }
  function fire(url, o) {
    var responded = null;
    listeners.fetch({ request: new Req(url, o), respondWith: function (p) { responded = p; } });
    return responded;
  }
  function lifecycle(name) {
    var waits = [];
    listeners[name]({ waitUntil: function (p) { waits.push(p); } });
    return Promise.all(waits);
  }
  return { fire: fire, lifecycle: lifecycle, stores: stores, fetched: fetched, setOnline: function (v) { online = v; }, listeners: listeners,
    version: vm.runInContext("VERSION", ctx) };
}

var pending = [];
function atest(name, fn) {
  pending.push(function () {
    return Promise.resolve().then(fn).then(function () { console.log("  ok   " + name); },
      function (e) { process.exitCode = 1; console.log("  FAIL " + name + "\n       " + (e && e.stack || e)); });
  });
}

atest("never intercepts other origins (Supabase), non-GET or range requests", function () {
  var E = env();
  assert.strictEqual(E.fire("https://digcgqltrlmhgmzgmvwc.supabase.co/rest/v1/rpc/yomple_player_find"), null);
  assert.strictEqual(E.fire("https://fonts.example.com/x.css"), null);
  assert.strictEqual(E.fire(SCOPE + "app.js", { method: "POST" }), null);
  assert.strictEqual(E.fire(SCOPE + "audio/rea/g1.mp3", { headers: { range: "bytes=0-" } }), null);
  assert.strictEqual(E.fire(ORIGIN + "/field/index.html"), null);
  assert.strictEqual(E.fetched.length, 0);
});

atest("install precaches the shell (plus scripts named in index.html) without query strings", function () {
  var E = env();
  return E.lifecycle("install").then(function () {
    var shell = E.stores["qf2-shell-" + E.version];
    var keys = Object.keys(shell.m);
    assert.ok(keys.indexOf(SCOPE) >= 0, "page under its directory");
    assert.ok(keys.indexOf(SCOPE + "ceremony.js") >= 0, "found in index.html");
    assert.ok(keys.indexOf(SCOPE + "app.js") >= 0);
    assert.ok(keys.every(function (k) { return k.indexOf("?") < 0; }));
    assert.ok(!E.fetched.some(function (u) { return /audio\//.test(u); }), "install does not fetch audio");
  });
});

atest("activate deletes old qf2 caches only, then warms the voice in the background", function () {
  var E = env();
  return Promise.all([caches(E, "qf2-shell-old"), caches(E, "qf2-media-old"), caches(E, "someone-else")]).then(function () {
    return E.lifecycle("activate");
  }).then(function () {
    assert.ok(!E.stores["qf2-shell-old"] && !E.stores["qf2-media-old"]);
    assert.ok(E.stores["someone-else"]);
    return new Promise(function (r) { setTimeout(r, 20); });
  }).then(function () {
    var media = E.stores["qf2-media-" + E.version];
    assert.strictEqual(Object.keys(media.m).length, 20, "timing.json + 19 clips");
    assert.ok(media.m[SCOPE + "audio/rea/timing.json"] && media.m[SCOPE + "audio/rea/full.mp3"] && media.m[SCOPE + "audio/rea/g18.mp3"]);
  });
  function caches(E, n) { E.stores[n] = { m: {} }; return Promise.resolve(); }
});

atest("navigations: network first, cached copy (any query string) when offline", function () {
  var E = env();
  return E.fire(SCOPE + "?u=sarah&from=yomple&f=MAPLE-K7Q2", { mode: "navigate" }).then(function (res) {
    assert.ok(/<script/.test(res.body));
    E.setOnline(false);
    return E.fire(SCOPE + "?u=other&from=yomple", { mode: "navigate" });
  }).then(function (res) {
    assert.ok(res && /<script/.test(res.body), "served from cache offline");
    return E.fire(SCOPE + "index.html?x=1", { mode: "navigate" });
  }).then(function (res) { assert.ok(res && /<script/.test(res.body), "index.html is the same page"); });
});

atest("code: network first (new deploys arrive at once), cache when offline", function () {
  var E = env();
  return E.fire(SCOPE + "games.js?v=qf2-1").then(function (res) {
    assert.strictEqual(res.body, "net:/field-next/games.js?v=qf2-1");
    E.setOnline(false);
    return E.fire(SCOPE + "games.js?v=qf2-2");
  }).then(function (res) {
    assert.strictEqual(res.body, "net:/field-next/games.js?v=qf2-1");
    E.setOnline(true);
    return E.fire(SCOPE + "games.js?v=qf2-2");
  }).then(function (res) { assert.strictEqual(res.body, "net:/field-next/games.js?v=qf2-2"); });
});

atest("audio and timing: cache first", function () {
  var E = env();
  return E.fire(SCOPE + "audio/rea/g3.mp3").then(function (res) {
    assert.strictEqual(res.body, "net:/field-next/audio/rea/g3.mp3");
    var n = E.fetched.length;
    E.setOnline(false);
    return E.fire(SCOPE + "audio/rea/g3.mp3").then(function (res2) {
      assert.strictEqual(res2.body, "net:/field-next/audio/rea/g3.mp3");
      assert.strictEqual(E.fetched.length, n, "no network for a cached clip");
    });
  });
});

atest("page message warms another voice", function () {
  var E = env();
  var waits = [];
  E.listeners.message({ data: { type: "warm", voice: "lincoln" }, waitUntil: function (p) { waits.push(p); } });
  return Promise.all(waits).then(function () {
    var media = E.stores["qf2-media-" + E.version];
    assert.ok(media.m[SCOPE + "audio/lincoln/g1.mp3"] && media.m[SCOPE + "audio/lincoln/timing.json"]);
  });
});

pending.reduce(function (p, f) { return p.then(f); }, Promise.resolve());
