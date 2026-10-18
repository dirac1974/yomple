"use strict";
/* The Dedication's data: readiness (the unlock) and QF.markDelivered. */
var assert = require("assert");
var H = require("./harness");
var J = function (x) { return JSON.parse(JSON.stringify(x)); };
var IDS = [];
for (var i = 1; i <= 18; i++) IDS.push("g" + i);

function fresh(day, files) {
  var env = H.makeEnv(files ? { files: files } : undefined);
  env.setDay(day || "2026-10-18");
  env.addPlayer("Sarah");
  return env;
}
function allShining(env) {
  env.QF.migrate();
  var q = env.ctx.store.progress["u-sarah"].qf2;
  Object.keys(q).forEach(function (k) { q[k].st = 3; q[k].disp = 3; q[k].days = ["2026-10-01", "2026-10-02"]; });
}

console.log("dedication: readiness");
H.test("a real fortnight: perfect nightly sessions light and shine every lantern and seam; runs open the Dedication", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  var day = "2026-10-18", n = 0;
  while (n++ < 40) {
    H.playTonight(QF);
    var miss = QF.readiness().missing.filter(function (m) { return m.id !== "runs"; });
    if (!miss.length) break;
    day = QF.addDays(day, 1); env.setDay(day);
  }
  assert.ok(n < 40, "everything shone within 40 days (took " + n + ")");
  QF.lanterns().forEach(function (L) { assert.ok(QF.item(L.id).shining, L.id + " shining"); });
  QF.seams().forEach(function (s) { assert.ok(QF.item(s.id).shining, s.id + " shining"); });
  /* the nightly walks of the whole path already counted as full runs on different days */
  assert.ok(QF.readiness().ready, JSON.stringify(QF.readiness().missing));
});
H.test("not ready while one lantern is only lit, and says which", function () {
  var env = fresh(), QF = env.QF;
  allShining(env);
  env.ctx.store.progress["u-sarah"].qf2.g7.st = 2;
  QF.recordRun({ ids: IDS, lines: 0 });
  env.setDay("2026-10-19");
  QF.recordRun({ ids: IDS, lines: 0 });
  var r = QF.readiness();
  assert.strictEqual(r.ready, false);
  assert.deepStrictEqual(J(r.missing.map(function (m) { return m.id; })), ["g7"]);
});
H.test("not ready while a seam is not shining", function () {
  var env = fresh(), QF = env.QF;
  allShining(env);
  env.ctx.store.progress["u-sarah"].qf2["g11>g12"].st = 2;
  QF.recordRun({ ids: IDS, lines: 0 });
  env.setDay("2026-10-19");
  QF.recordRun({ ids: IDS, lines: 0 });
  assert.deepStrictEqual(J(QF.readiness().missing.map(function (m) { return m.id; })), ["g11>g12"]);
});
H.test("two runs either side of local midnight are two different days", function () {
  var env = fresh(), QF = env.QF;
  allShining(env);
  env.setDay("2026-10-18", 23);
  QF.recordRun({ ids: IDS, lines: 2 });
  env.setDay("2026-10-19", 0);
  QF.recordRun({ ids: IDS, peeks: 2 });
  assert.ok(QF.readiness().ready);
});
H.test("three prompts in a run do not count; the missing note counts down", function () {
  var env = fresh(), QF = env.QF;
  allShining(env);
  assert.ok(/2 more full runs/.test(QF.readiness().missing[0].why));
  QF.recordRun({ ids: IDS, lines: 1 });
  assert.ok(/1 more full run /.test(QF.readiness().missing[0].why));
  env.setDay("2026-10-19");
  assert.strictEqual(QF.recordRun({ ids: IDS, lines: 2, peeks: 1 }).counted, false);
  assert.strictEqual(QF.readiness().ready, false);
});

console.log("dedication: markDelivered");
H.test("markDelivered stores {mode, date, at} in fun.qf2.delivered, today by local day", function () {
  var env = fresh("2026-11-19"), QF = env.QF;
  env.setDay("2026-11-19", 23);
  var r = QF.markDelivered({ mode: "memory" });
  assert.strictEqual(r.mode, "memory");
  assert.strictEqual(r.date, "2026-11-19");
  assert.strictEqual(r.count, 1);
  var f = env.ctx.store.fun["u-sarah"].qf2;
  assert.strictEqual(f.delivered.length, 1);
  assert.strictEqual(f.delivered[0].date, "2026-11-19");
  assert.strictEqual(typeof f.delivered[0].at, "number");
  var saved = JSON.parse(env.ls.getItem("quiet-field-v2"));
  assert.strictEqual(saved.fun["u-sarah"].qf2.delivered[0].mode, "memory", "saved to localStorage");
});
H.test("always repeatable; mode defaults to page; a given date is kept; delivered() is a copy", function () {
  var env = fresh(), QF = env.QF;
  QF.markDelivered({ mode: "page", date: "2026-11-02" });
  QF.markDelivered({ mode: "nonsense" });
  QF.markDelivered({ mode: "memory", date: "not a date" });
  var d = QF.delivered();
  assert.deepStrictEqual(J(d.map(function (x) { return x.mode + "@" + x.date; })), ["page@2026-11-02", "page@2026-10-18", "memory@2026-10-18"]);
  d[0].mode = "x";
  assert.strictEqual(QF.delivered()[0].mode, "page");
});
H.test("markDelivered touches no lantern record and no readiness input", function () {
  var env = fresh(), QF = env.QF;
  QF.migrate();
  var before = J(env.ctx.store.progress["u-sarah"]);
  var runs = J(env.ctx.store.fun["u-sarah"].qf2.runs);
  QF.markDelivered({ mode: "page" });
  assert.deepStrictEqual(J(env.ctx.store.progress["u-sarah"]), before);
  assert.deepStrictEqual(J(env.ctx.store.fun["u-sarah"].qf2.runs), runs);
});
H.test("no player: markDelivered records nothing", function () {
  var env = H.makeEnv();
  assert.strictEqual(env.QF.markDelivered({ mode: "page" }), null);
  assert.deepStrictEqual(J(env.QF.delivered()), []);
});
H.test("each player keeps their own deliveries", function () {
  var env = fresh(), QF = env.QF;
  QF.markDelivered({ mode: "page" });
  env.addPlayer("David");
  assert.strictEqual(QF.delivered().length, 0);
  QF.markDelivered({ mode: "memory" });
  env.ctx.store.activeId = "u-sarah";
  assert.deepStrictEqual(J(QF.delivered().map(function (x) { return x.mode; })), ["page"]);
});
H.test("sync merge keeps deliveries from both devices, once each, in order", function () {
  var env = fresh("2026-10-18", ["yomple-stay.js", "store.js", "lanterns.js", "memory.js", "sync.js"]);
  var a = { mode: "page", date: "2026-11-01", at: 100 }, b = { mode: "memory", date: "2026-11-03", at: 300 }, c = { mode: "page", date: "2026-11-02", at: 200 };
  var out = env.ctx.mergeFunQf2({ v: 1, lit: [], joined: [], runs: [], delivered: [a, b] }, { v: 1, lit: [], joined: [], runs: [], delivered: [c, a] });
  assert.deepStrictEqual(J(out.delivered.map(function (d) { return d.at; })), [100, 200, 300]);
  var none = env.ctx.mergeFunQf2({ v: 1, lit: [], joined: [], runs: [] }, { v: 1, lit: [], joined: [], runs: [] });
  assert.strictEqual(none.delivered, undefined, "no key invented when neither side has one");
});
