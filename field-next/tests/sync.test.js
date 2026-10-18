"use strict";
/* sync.js / arrive.js against a fake Supabase (the harness fetch); the real one is never contacted. */
var assert = require("assert");
var H = require("./harness");
var J = function (x) { return JSON.parse(JSON.stringify(x)); };
var FILES = ["yomple-stay.js", "store.js", "lanterns.js", "memory.js", "sync.js"];

function touchedQf2(n) {
  var q = {};
  for (var i = 1; i <= n; i++) q["g" + i] = { st: 2, disp: 2, days: ["2026-10-17"], due: "2026-10-18", rung: 4, last: 100 + i, intro: "2026-10-17", miss: 0, missKey: "", win: "" };
  return q;
}
function upserts(env) { return env.calls.filter(function (c) { return c.fn === "yomple_player_upsert"; }); }

console.log("sync");
var all = [];
all.push(H.test("never uploads a qf2 with fewer records than last loaded from the cloud", function () {
  var env = H.makeEnv({ files: FILES, rpc: function (fn) { return fn === "yomple_player_upsert" ? { ok: true } : null; } });
  env.setDay("2026-10-18");
  env.ctx.applyCloudRow({ username: "sarah", display_name: "Sarah", avatar: "", progress: { qf2: touchedQf2(5), gettysburg: { p1: { state: 0 } } }, fun: {} });
  assert.strictEqual(env.ctx.store.cloudBase.sarah, 5);
  assert.strictEqual(env.QF.item("g3").st, 2, "cloud qf2 adopted");
  // simulate a shrink: local qf2 loses records
  env.ctx.store.progress["u-sarah"].qf2 = {};
  env.ctx.QF.migrate();
  return env.ctx.cloudSaveActive().then(function (sent) {
    assert.strictEqual(sent, false);
    assert.strictEqual(upserts(env).length, 0);
    assert.ok(env.warns.some(function (w) { return /refusing to upload/.test(w); }));
  });
}));
all.push(H.test("uploads normally when qf2 has at least as many records; sends old keys back unchanged", function () {
  var env = H.makeEnv({ files: FILES, rpc: function (fn) { return fn === "yomple_player_upsert" ? { ok: true, created: false } : null; } });
  env.setDay("2026-10-18");
  env.ctx.applyCloudRow({ username: "sarah", display_name: "Sarah", avatar: "", progress: { qf2: touchedQf2(5), gettysburg: { p1: { state: 1 } } }, fun: { stars: 3 } });
  env.QF.record("g6", { kind: "ladder", ok: true, rung: 0 });
  return env.ctx.cloudSaveActive().then(function (sent) {
    assert.strictEqual(sent, true);
    var u = upserts(env);
    assert.strictEqual(u.length, 1);
    var prog = u[0].args.p_row.progress;
    assert.deepStrictEqual(prog.gettysburg, { p1: { state: 1 } });
    assert.strictEqual(prog.qf2.g6.st, 1);
    assert.strictEqual(env.ctx.store.cloudBase.sarah, 6);
  });
}));
all.push(H.test("pull before the first push: a device that never saw the cloud merges it first", function () {
  var cloud = { username: "sarah", display_name: "Sarah", avatar: "", has_pin: false,
    progress: { qf2: touchedQf2(4) }, fun: { qf2: { v: 1, lit: ["g1", "g2", "g3", "g4"], sessions: 3, runs: [] } } };
  var env = H.makeEnv({ files: FILES, rpc: function (fn) {
    if (fn === "yomple_player_find") return cloud;
    if (fn === "yomple_player_upsert") return { ok: true };
    return null;
  } });
  env.setDay("2026-10-18");
  env.addPlayer("Sarah");
  env.QF.record("g2", { kind: "ladder", ok: true, rung: 0 });   // local fresh progress on this device
  return env.ctx.cloudSaveActive().then(function () {
    var player = env.calls.map(function (c) { return c.fn; }).filter(function (f) { return /^yomple_player_/.test(f); });
    assert.deepStrictEqual(player, ["yomple_player_find", "yomple_player_upsert"]);
    var q = upserts(env)[0].args.p_row.progress.qf2;
    assert.strictEqual(q.g1.st, 2); assert.strictEqual(q.g3.st, 2);
    assert.strictEqual(q.g2.st, 2, "merged keeps the better record");
    assert.strictEqual(upserts(env)[0].args.p_row.fun.qf2.sessions, 3);
    // second save does not pull again
    return env.ctx.cloudSaveActive().then(function () {
      assert.strictEqual(env.calls.filter(function (c) { return c.fn === "yomple_player_find"; }).length, 1);
    });
  });
}));
all.push(H.test("a failed pull blocks the upload and schedules a retry", function () {
  var env = H.makeEnv({ files: FILES, rpc: function (fn) { return fn === "yomple_player_find" ? { __status: 503 } : { ok: true }; } });
  env.setDay("2026-10-18");
  env.addPlayer("Sarah");
  env.QF.record("g2", { kind: "ladder", ok: true, rung: 0 });
  var before = env.timers.length;
  return env.ctx.cloudSaveActive().then(function (sent) {
    assert.strictEqual(sent, false);
    assert.strictEqual(upserts(env).length, 0);
    assert.ok(env.timers.length > before, "retry scheduled");
  });
}));
all.push(H.test("{ok:false} from the upsert is logged and retried", function () {
  var env = H.makeEnv({ files: FILES, rpc: function (fn) { return fn === "yomple_player_upsert" ? { ok: false, error: "busy" } : null; } });
  env.setDay("2026-10-18");
  env.addPlayer("Sarah");
  env.QF.record("g2", { kind: "ladder", ok: true, rung: 0 });
  var before = env.timers.length;
  return env.ctx.cloudSaveActive().then(function (sent) {
    assert.strictEqual(sent, false);
    assert.ok(env.warns.some(function (w) { return /not accepted/.test(w) && /busy/.test(w); }));
    assert.ok(env.timers.length > before, "retry scheduled");
    assert.ok(!env.ctx.store.cloudBase.sarah, "baseline not raised by a refused save");
  });
}));
all.push(H.test("applyCloudRow keeps local qf2 progress and local-only keys", function () {
  var env = H.makeEnv({ files: FILES });
  env.setDay("2026-10-18");
  env.addPlayer("Sarah", { preamble: { p1: { state: 2 } } });
  H.climb(env.QF, "g2");
  env.ctx.applyCloudRow({ username: "sarah", display_name: "Sarah", avatar: "", progress: { gettysburg: { p1: { state: 0 } } }, fun: {} });
  assert.strictEqual(env.QF.item("g2").st, 2);
  assert.deepStrictEqual(J(env.ctx.store.progress["u-sarah"].preamble), { p1: { state: 2 } });
  assert.deepStrictEqual(J(env.ctx.store.progress["u-sarah"].gettysburg), { p1: { state: 0 } });
}));

console.log("arrive");
function arriveEnv(rpc) {
  var env = H.makeEnv({ files: FILES.concat(["arrive.js"]), search: "?u=sarah&f=OAK-AB12&from=yomple", rpc: rpc });
  return env;
}
function settle() { return new Promise(function (r) { setTimeout(r, 20); }); }
all.push(H.test("failed household lookup: no profile created, nothing uploaded, retry scheduled", function () {
  var env = arriveEnv(function (fn) { if (fn === "yomple_player_find_any") return { __fail: true }; return { ok: true }; });
  return settle().then(function () {
    assert.strictEqual(env.ctx.store.profiles.length, 0);
    assert.strictEqual(upserts(env).length, 0);
    assert.ok(env.timers.some(function (t) { return t.ms >= 4000; }), "retry scheduled");
  });
}));
all.push(H.test("HTTP error on lookup is also not a not-found", function () {
  var env = arriveEnv(function (fn) { if (fn === "yomple_player_find_any") return { __status: 500 }; return { ok: true }; });
  return settle().then(function () {
    assert.strictEqual(env.ctx.store.profiles.length, 0);
    assert.strictEqual(upserts(env).length, 0);
  });
}));
all.push(H.test("confirmed not-found: a fresh profile is created, seeded and saved", function () {
  var env = arriveEnv(function (fn) {
    if (fn === "yomple_player_find_any" || fn === "yomple_player_find") return null;
    if (fn === "yomple_player_upsert") return { ok: true, created: true };
    return null;
  });
  return settle().then(function () {
    assert.strictEqual(env.ctx.store.profiles.length, 1);
    assert.strictEqual(env.ctx.store.activeId, "u-sarah");
    assert.ok(env.ctx.store.progress["u-sarah"].qf2.g2, "seeded");
    assert.strictEqual(upserts(env).length, 1);
  });
}));
all.push(H.test("found in field_players: cloud row applied and migrated", function () {
  var row = { table: "field_players", username: "sarah", display_name: "Sarah", avatar: "", has_pin: false,
    progress: { gettysburg: { p1: { state: 3 } } }, fun: {} };
  var env = arriveEnv(function (fn) { return fn === "yomple_player_find_any" ? row : { ok: true }; });
  env.setDay("2026-10-18");
  return settle().then(function () {
    assert.strictEqual(env.ctx.store.activeId, "u-sarah");
    assert.strictEqual(env.QF.item("g1").st, 2);
    assert.strictEqual(env.QF.item("g1").disp, 3);
  });
}));

Promise.all(all).then(function () {
  console.log("sync/arrive: " + H.results.pass + " passed, " + H.results.fail + " failed");
});
