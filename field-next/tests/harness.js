/* Plain-node test harness: loads the classic scripts into a vm context with a fake
   localStorage, document, timers and fetch. Never touches the network. */
"use strict";
var vm = require("vm"), fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");

function fakeStorage(init) {
  var m = {};
  Object.keys(init || {}).forEach(function (k) { m[k] = String(init[k]); });
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; },
    _m: m
  };
}

function makeEnv(opts) {
  opts = opts || {};
  var ls = fakeStorage(opts.storage);
  var listeners = {}, timers = [], calls = [], warns = [];
  var el = function () {
    return { style: {}, classList: { add: function () {}, remove: function () {} }, appendChild: function () {}, set textContent(v) {}, set innerHTML(v) {} };
  };
  var ctx = {
    console: { log: function () {}, warn: function () { warns.push([].slice.call(arguments).join(" ")); }, error: function () {} },
    localStorage: ls, JSON: JSON, Math: Math, Date: Date, Promise: Promise, URLSearchParams: URLSearchParams,
    setTimeout: function (fn, ms) { timers.push({ fn: fn, ms: ms }); return timers.length; },
    clearTimeout: function () {},
    navigator: { userAgent: "node-test" },
    location: { search: opts.search || "", pathname: "/field-next/", hash: "" },
    history: { replaceState: function () {} },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); },
    document: {
      readyState: "complete", visibilityState: "visible",
      addEventListener: function (t, f) { (listeners["doc:" + t] = listeners["doc:" + t] || []).push(f); },
      getElementById: function () { return null; }, querySelector: function () { return null; },
      querySelectorAll: function () { return []; }, createElement: el, body: el(), documentElement: el()
    },
    fetch: function (url, init) {
      var fn = String(url).split("/rpc/")[1] || String(url);
      var args = {};
      try { args = JSON.parse((init && init.body) || "{}"); } catch (e) {}
      calls.push({ fn: fn, args: args });
      if (!opts.rpc) return Promise.reject(new Error("no network in tests"));
      return Promise.resolve().then(function () { return opts.rpc(fn, args); }).then(function (res) {
        if (res && res.__fail) throw new Error("network");
        var status = (res && res.__status) || 200;
        var body = res === undefined ? null : res;
        return {
          ok: status >= 200 && status < 300, status: status,
          json: function () { return Promise.resolve(body); },
          text: function () { return Promise.resolve(body === null ? "null" : JSON.stringify(body)); }
        };
      });
    }
  };
  ctx.window = ctx;
  ctx.toast = function () {};
  ctx.showScreen = function () {};
  ctx.showHome = function () {};
  ctx.showProfiles = function () {};
  ctx.seedIntroduced = function () { if (ctx.QF) ctx.QF.seed(); };
  vm.createContext(ctx);
  var files = opts.files || ["store.js", "lanterns.js", "memory.js"];
  files.forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  });
  var env = { ctx: ctx, ls: ls, listeners: listeners, timers: timers, calls: calls, warns: warns, QF: ctx.QF };
  env.setDay = function (s, hour) {
    var p = s.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2], hour === undefined ? 19 : hour, 0, 0);
    ctx.QF._setClock(function () { return d; });
  };
  env.addPlayer = function (name, progress) {
    var u = name.toLowerCase();
    var id = "u-" + u;
    ctx.store.profiles.push({ id: id, name: name, username: u, avatar: "", pin: "", created: 1 });
    ctx.store.activeId = id;
    ctx.store.progress[id] = progress || {};
    ctx.store.fun[id] = {};
    return id;
  };
  env.load = function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }); };
  return env;
}

// Play a lantern up the whole ladder from its current rung with no help.
function climb(QF, id) {
  var last = null, guard = 0;
  do { last = QF.record(id, { kind: "ladder", ok: true, rung: QF.rung(id), peeks: 0, misses: 0 }); }
  while (!last.qualified && guard++ < 6);
  return last;
}
// Run one whole "Tonight" perfectly.
function playTonight(QF) {
  QF.startSession();
  var steps = QF.buildTonight();
  steps.forEach(function (s) {
    if (s.kind === "cold") s.ids.forEach(function (id) { QF.record(id, { kind: "cold", ok: true, rung: 4 }); });
    if (s.kind === "ladder") s.ids.forEach(function (id) { climb(QF, id); });
    if (s.kind === "seam") s.ids.forEach(function (id) { QF.record(id, { kind: "seam", ok: true }); });
    if (s.kind === "walk") QF.recordRun({ ids: s.ids, lines: 0 });
  });
  return steps;
}

var results = { pass: 0, fail: 0 };
function test(name, fn) {
  try { var r = fn(); if (r && r.then) return r.then(function () { ok(name); }, function (e) { bad(name, e); }); ok(name); }
  catch (e) { bad(name, e); }
  return Promise.resolve();
}
function ok(name) { results.pass++; console.log("  ok   " + name); }
function bad(name, e) { results.fail++; process.exitCode = 1; console.log("  FAIL " + name + "\n       " + (e && e.stack || e)); }

module.exports = { makeEnv: makeEnv, climb: climb, playTonight: playTonight, test: test, results: results, ROOT: ROOT };
