"use strict";
var assert = require("assert");
var H = require("./harness");
var J = function (x) { return JSON.parse(JSON.stringify(x)); };
var IDS = [];
for (var i = 1; i <= 18; i++) IDS.push("g" + i);

function sarahLike() {
  var g = {};
  for (var i = 1; i <= 12; i++) g["p" + i] = { state: 0, consec: 0, introduced: i === 1 || i === 3 || i === 5, last: 0 };
  return { gettysburg: g, preamble: { p1: { state: 2, consec: 2, introduced: true, last: 5 } } };
}
function fresh(day, progress) {
  var env = H.makeEnv();
  env.setDay(day || "2026-10-18");
  env.addPlayer("Sarah", progress);
  return env;
}

console.log("migration");
H.test("empty profile: 18 lanterns + 17 seams created, all new, nothing else written", function () {
  var env = fresh(), QF = env.QF;
  var r = QF.migrate();
  assert.strictEqual(r.created, 35);
  var prog = env.ctx.store.progress["u-sarah"];
  assert.deepStrictEqual(J(Object.keys(prog)), ["qf2"]);
  IDS.forEach(function (id) { assert.strictEqual(QF.item(id).st, 0); assert.strictEqual(QF.item(id).disp, 0); });
  assert.strictEqual(env.ctx.store.fun["u-sarah"].qf2.migrated, true);
  assert.strictEqual(QF.migrate().created, 0, "idempotent");
});
H.test("Sarah-like (all p at state 0): everything starts fresh, old records untouched", function () {
  var before = sarahLike();
  var env = fresh("2026-10-18", J(before)), QF = env.QF;
  QF.migrate();
  var prog = env.ctx.store.progress["u-sarah"];
  assert.deepStrictEqual(J(prog.gettysburg), J(before.gettysburg));
  assert.deepStrictEqual(J(prog.preamble), J(before.preamble));
  IDS.forEach(function (id) { var it = QF.item(id); assert.strictEqual(it.st, 0); assert.strictEqual(it.intro, ""); });
  assert.deepStrictEqual(J(QF.buildTonight().map(function (s) { return s.kind; })), ["listen", "ladder", "ladder", "seam", "walk"]);
});
H.test("p1 at state 3: g1/g2 get state 2 (split, minus one), display 3, due today, cold recall tonight", function () {
  var p = sarahLike(); p.gettysburg.p1.state = 3;
  var env = fresh("2026-10-18", p), QF = env.QF;
  QF.migrate();
  ["g1", "g2"].forEach(function (id) {
    var it = QF.item(id);
    assert.strictEqual(it.st, 2); assert.strictEqual(it.disp, 3); assert.strictEqual(it.due, "2026-10-18");
    assert.strictEqual(it.rung, 4); assert.ok(it.shining, "display keeps the parent's level");
  });
  assert.strictEqual(QF.item("g3").st, 0);
  var steps = QF.buildTonight();
  assert.strictEqual(steps[0].kind, "cold");
  assert.deepStrictEqual(J(steps[0].ids), ["g1", "g2"]);
  // one clean recall restores it
  var r = QF.record("g1", { kind: "cold", ok: true, rung: 4 });
  assert.strictEqual(r.state, 3);
});
H.test("unsplit parent copies its state; split parent minus one (min 0); legacy flat p keys read", function () {
  var env = fresh("2026-10-18", { p3: { state: 3, consec: 3, introduced: true, last: 1 }, p12: { state: 1, consec: 0, introduced: true, last: 1 }, p2: { state: 2 } });
  var QF = env.QF;
  QF.migrate();
  assert.strictEqual(QF.item("g5").st, 3);
  assert.strictEqual(QF.item("g5").disp, 3);
  ["g16", "g17", "g18"].forEach(function (id) { assert.strictEqual(QF.item(id).st, 0); assert.strictEqual(QF.item(id).disp, 1); });
  assert.strictEqual(QF.item("g3").st, 1);
  assert.strictEqual(QF.item("g4").st, 1);
  assert.ok(!env.ctx.store.progress["u-sarah"].gettysburg, "never creates progress.gettysburg");
});
H.test("fill-missing only: an existing g record is never overwritten", function () {
  var p = sarahLike(); p.gettysburg.p1.state = 3;
  var env = fresh("2026-10-18", p), QF = env.QF;
  QF.migrate();
  QF.record("g1", { kind: "cold", ok: true, rung: 4 });
  env.ctx.store.progress["u-sarah"].gettysburg.p1.state = 0;
  QF.migrate();
  assert.strictEqual(QF.item("g1").st, 3);
});
H.test("first boot deep-copies quiet-field-v1 into quiet-field-v2 and never writes v1", function () {
  var v1 = { profiles: [{ id: "u-sarah", name: "Sarah", username: "sarah" }], activeId: "u-sarah", familyCode: "OAK-AB12", progress: { "u-sarah": sarahLike() }, fun: { "u-sarah": { stars: 4 } } };
  var raw = JSON.stringify(v1);
  var env = H.makeEnv({ storage: { "quiet-field-v1": raw } });
  env.setDay("2026-10-18");
  env.QF.boot();
  var v2 = JSON.parse(env.ls.getItem("quiet-field-v2"));
  assert.strictEqual(v2.profiles[0].name, "Sarah");
  assert.ok(v2.progress["u-sarah"].qf2.g1);
  env.QF.record("g2", { kind: "ladder", ok: true, rung: 0 });
  assert.strictEqual(env.ls.getItem("quiet-field-v1"), raw, "v1 byte-for-byte unchanged");
  // a later boot with v2 present does not re-copy v1
  var env2 = H.makeEnv({ storage: { "quiet-field-v1": raw, "quiet-field-v2": env.ls.getItem("quiet-field-v2") } });
  env2.setDay("2026-10-18");
  env2.QF.boot();
  assert.strictEqual(env2.QF.item("g2").rung, 1);
});
H.test("reloadStore picks up a write from another tab and notifies", function () {
  var env = fresh(), QF = env.QF, n = 0;
  QF.migrate();
  env.ctx.saveStore();
  QF.onReload(function () { n++; });
  var other = JSON.parse(env.ls.getItem("quiet-field-v2"));
  other.progress["u-sarah"].qf2.g2.rung = 3;
  env.ls.setItem("quiet-field-v2", JSON.stringify(other));
  QF.boot();
  (env.listeners["doc:visibilitychange"] || []).forEach(function (f) { f(); });
  assert.strictEqual(QF.rung("g2"), 3);
  assert.ok(n >= 1);
});

console.log("evidence");
H.test("one qualifying day lights a lantern but is not shining", function () {
  var env = fresh(), QF = env.QF;
  var r = H.climb(QF, "g2");
  assert.ok(r.qualified); assert.strictEqual(r.state, 2); assert.ok(r.lit); assert.ok(!r.shining); assert.ok(r.newlyLit);
  var again = QF.record("g2", { kind: "cold", ok: true, rung: 4 });
  assert.ok(again.qualified); assert.strictEqual(again.state, 2, "same day again is still not shining");
});
H.test("qualifying recalls on two different local days = shining", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  H.climb(QF, "g2");
  assert.strictEqual(QF.item("g2").due, "2026-10-19");
  env.setDay("2026-10-19", 7);
  var r = QF.record("g2", { kind: "cold", ok: true, rung: 4 });
  assert.strictEqual(r.state, 3); assert.ok(r.shining); assert.ok(r.newlyShining);
  assert.deepStrictEqual(J(QF.item("g2").days), ["2026-10-18", "2026-10-19"]);
});
H.test("local calendar day, not UTC: 23:30 and 00:30 local are different days", function () {
  var env = fresh(), QF = env.QF;
  env.setDay("2026-10-18", 23);
  assert.strictEqual(QF.today(), "2026-10-18");
  H.climb(QF, "g2");
  env.setDay("2026-10-19", 0);
  assert.strictEqual(QF.today(), "2026-10-19");
  assert.strictEqual(QF.record("g2", { kind: "cold", ok: true, rung: 4 }).state, 3);
});
H.test("a peek voids evidence and drops one rung", function () {
  var env = fresh(), QF = env.QF;
  QF.record("g2", { kind: "ladder", ok: true, rung: 3 });
  assert.strictEqual(QF.rung("g2"), 4);
  var r = QF.record("g2", { kind: "ladder", ok: true, rung: 4, peeks: 1 });
  assert.ok(!r.qualified); assert.strictEqual(r.state, 1); assert.strictEqual(r.rung, 3);
  QF.record("g2", { kind: "ladder", ok: true, rung: 0, peeks: 2 });
  assert.strictEqual(QF.rung("g2"), 0, "never below 0");
});
H.test("gold ink: under 90% clean words does not count; one gold word in 16 does", function () {
  var env = fresh(), QF = env.QF;
  var r = QF.record("g1", { kind: "cold", ok: true, rung: 4, misses: 2 });
  assert.ok(!r.qualified, "14/16 = 87.5%");
  r = QF.record("g1", { kind: "cold", ok: true, rung: 4, misses: 1 });
  assert.ok(r.qualified, "15/16 = 93.8%");
  r = QF.record("g2", { kind: "cold", ok: true, rung: 4, ratio: 0.85 });
  assert.ok(!r.qualified);
  r = QF.record("g3", { kind: "cold", ok: true, rung: 4, lines: 2 });
  assert.ok(!r.qualified, "Line! words are not clean");
});
H.test("only rung 4 counts; walk and listen never count", function () {
  var env = fresh(), QF = env.QF;
  assert.ok(!QF.record("g2", { kind: "ladder", ok: true, rung: 3 }).qualified);
  for (var i = 0; i < 5; i++) {
    var w = QF.record("g1", { kind: "walk", ok: true, rung: 4 });
    assert.ok(!w.qualified); assert.strictEqual(w.state, 0);
  }
  QF.record("g1", { kind: "listen", ok: true });
  assert.strictEqual(QF.item("g1").days.length, 0);
  var run = QF.recordRun({ ids: IDS, lines: 0 });
  assert.ok(run.counted);
  assert.strictEqual(QF.item("g5").st, 0, "a full run is not lantern evidence");
});
H.test("display level never goes down", function () {
  var p = sarahLike(); p.gettysburg.p1.state = 3;
  var env = fresh("2026-10-18", p), QF = env.QF;
  QF.migrate();
  QF.record("g1", { kind: "cold", ok: false, rung: 4, misses: 9 });
  QF.record("g1", { kind: "ladder", ok: false, rung: 3, peeks: 1 });
  QF.record("g1", { kind: "ladder", ok: false, rung: 2, peeks: 3 });
  var it = QF.item("g1");
  assert.strictEqual(it.disp, 3); assert.ok(it.shining); assert.ok(it.st >= 2);
});
H.test("two misses in one session: set by the window for tomorrow, nothing lost", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  QF.startSession();
  H.climb(QF, "g2");
  env.setDay("2026-10-19");
  QF.startSession();
  var a = QF.record("g2", { kind: "cold", ok: false, rung: 4, misses: 5 });
  assert.ok(!a.window);
  var b = QF.record("g2", { kind: "ladder", ok: false, rung: 3, misses: 4 });
  assert.ok(b.window); assert.ok(b.tomorrow); assert.strictEqual(b.due, "2026-10-20");
  assert.strictEqual(b.state, 2, "no state loss"); assert.ok(b.lit);
  var it = QF.item("g2");
  assert.ok(it.byWindow);
  QF.buildTonight().forEach(function (s) { assert.ok(s.ids.indexOf("g2") < 0, s.kind + " must skip g2"); });
  // a new session starts the miss count over
  QF.startSession();
  assert.ok(!QF.record("g1", { kind: "ladder", ok: false, rung: 0 }).window);
  env.setDay("2026-10-20");
  QF.startSession();
  assert.ok(!QF.record("g2", { kind: "cold", ok: false, rung: 4 }).window);
});
H.test("ladder: success climbs one rung; a failed cold recall goes back to rung 3", function () {
  var env = fresh(), QF = env.QF;
  [0, 1, 2, 3].forEach(function (r) {
    assert.strictEqual(QF.record("g2", { kind: "ladder", ok: true, rung: r }).rung, r + 1);
  });
  assert.strictEqual(QF.record("g2", { kind: "ladder", ok: false, rung: 4 }).rung, 4);
  assert.strictEqual(QF.record("g2", { kind: "cold", ok: false, rung: 4 }).rung, 3);
});
H.test("seams: same two-day rule, and a gold word in the 4-word head does not count", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  assert.ok(!QF.record("g1>g2", { kind: "seam", ok: true, misses: 1 }).qualified);
  assert.strictEqual(QF.record("g1>g2", { kind: "seam", ok: true }).state, 2);
  env.setDay("2026-10-20");
  assert.strictEqual(QF.record("g1>g2", { kind: "seam", ok: true }).state, 3);
  assert.strictEqual(QF.summary().seamsShining, 1);
});
H.test("saveStore is called exactly once per record", function () {
  var env = fresh(), QF = env.QF, n = 0;
  QF.migrate();
  env.ctx.saveStore = function () { n++; };
  QF.record("g2", { kind: "ladder", ok: true, rung: 0 });
  assert.strictEqual(n, 1);
  QF.record("g1>g2", { kind: "seam", ok: false });
  assert.strictEqual(n, 2);
  QF.buildTonight(); QF.item("g3"); QF.summary(); QF.readiness();
  assert.strictEqual(n, 2, "reads never save");
});

console.log("tonight");
H.test("day 1: listen, ladder g2, ladder g1, seam g1>g2, walk g1-g2", function () {
  var env = fresh(), QF = env.QF;
  QF.seed();
  var steps = QF.buildTonight();
  assert.deepStrictEqual(J(steps), [
    { kind: "listen", ids: IDS },
    { kind: "ladder", ids: ["g2"] },
    { kind: "ladder", ids: ["g1"] },
    { kind: "seam", ids: ["g1>g2"] },
    { kind: "walk", ids: ["g1", "g2"] }
  ]);
});
H.test("no more than 3 new lanterns on one day, however much she plays", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  H.playTonight(QF);
  env.setDay("2026-10-19");
  for (var k = 0; k < 4; k++) H.playTonight(QF);
  var introduced = IDS.filter(function (id) { return QF.item(id).intro === "2026-10-19"; });
  assert.deepStrictEqual(J(introduced), ["g9", "g10", "g11"]);
  assert.ok(QF.buildTonight().every(function (s) { return s.kind !== "ladder"; }));
});
H.test("day 5 after four perfect days: cold recall, then g18 g17 g16, seams, walk of Ahead", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  ["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21"].forEach(function (d) { env.setDay(d); H.playTonight(QF); });
  env.setDay("2026-10-22");
  var steps = QF.buildTonight();
  assert.deepStrictEqual(J(steps.map(function (s) { return s.kind; })), ["cold", "ladder", "ladder", "ladder", "seam", "walk"]);
  assert.deepStrictEqual(J(steps[0].ids), ["g3", "g4", "g5", "g9", "g10", "g11"]);
  assert.deepStrictEqual(J(steps.slice(1, 4).map(function (s) { return s.ids[0]; })), ["g18", "g17", "g16"]);
  // the new joins tonight, then the joins first practised yesterday (due for their second day)
  assert.deepStrictEqual(J(steps[4].ids), ["g2>g3", "g3>g4", "g4>g5", "g5>g6", "g16>g17", "g17>g18"]);
  assert.deepStrictEqual(J(steps[5].ids), ["g16", "g17", "g18"]);
  H.playTonight(QF);
  var s = QF.summary();
  assert.strictEqual(s.lit, 14);
  assert.strictEqual(QF.item("g11").st, 3);
});
H.test("learning order: backward within a movement, forward between, all 18 by day 7", function () {
  var env = fresh("2026-10-18"), QF = env.QF, order = [];
  for (var d = 18; d <= 24; d++) {
    env.setDay("2026-10-" + d);
    H.playTonight(QF);
    QF.order().forEach(function (id) { if (QF.item(id).intro === "2026-10-" + d) order.push(id); });
  }
  assert.deepStrictEqual(J(order.slice(0, 2)), ["g2", "g1"]);
  assert.strictEqual(order.length, 18);
  assert.deepStrictEqual(J(order.slice(2, 11)), ["g11", "g10", "g9", "g8", "g7", "g6", "g5", "g4", "g3"]);
  assert.deepStrictEqual(J(order.slice(11)), ["g18", "g17", "g16", "g15", "g14", "g13", "g12"]);
  env.setDay("2026-10-25");
  var walk = QF.buildTonight().filter(function (s) { return s.kind === "walk"; })[0];
  assert.deepStrictEqual(J(walk.ids), IDS, "all lit: the walk is the whole path");
});
H.test("backlog guard: no new lanterns while 3 earlier ones are still unlit", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  ["g2", "g1"].forEach(function (id) { QF.record(id, { kind: "ladder", ok: true, rung: 0 }); });
  env.setDay("2026-10-19");
  QF.record("g11", { kind: "ladder", ok: true, rung: 0 });
  env.setDay("2026-10-20");
  var steps = QF.buildTonight();
  var ladder = steps.filter(function (s) { return s.kind === "ladder"; }).map(function (s) { return s.ids[0]; });
  assert.deepStrictEqual(J(ladder), ["g1", "g2", "g11"], "repairs only");
});
H.test("readiness needs everything shining and two full runs on different days", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  assert.ok(!QF.readiness().ready);
  QF.migrate();
  var q = env.ctx.store.progress["u-sarah"].qf2;
  Object.keys(q).forEach(function (k) { q[k].st = 3; q[k].disp = 3; });
  assert.deepStrictEqual(J(QF.readiness().missing.map(function (m) { return m.id; })), ["runs"]);
  QF.recordRun({ ids: IDS, lines: 2 });
  QF.recordRun({ ids: IDS, lines: 0 });
  assert.ok(!QF.readiness().ready, "two runs on one day");
  env.setDay("2026-10-19");
  assert.ok(!QF.recordRun({ ids: IDS, lines: 3 }).counted, "more than 2 prompts");
  assert.ok(!QF.recordRun({ ids: IDS.slice(1), lines: 0 }).counted, "not the full path");
  QF.recordRun({ ids: IDS, peeks: 1, lines: 1 });
  assert.ok(QF.readiness().ready);
});
H.test("preview gives tomorrow's cold list and new lanterns", function () {
  var env = fresh("2026-10-18"), QF = env.QF;
  H.playTonight(QF);
  var p = QF.preview(1);
  assert.deepStrictEqual(J(p.cold), ["g1", "g2"]);
  assert.deepStrictEqual(J(p.fresh), ["g11", "g10", "g9"]);
});
