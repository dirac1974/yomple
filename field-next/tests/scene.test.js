"use strict";
/* The scene's geometry: on every tall screen no lantern post (cap to number) touches another, all
   stay on screen, and the steps between neighbours look even. */
var assert = require("assert"), path = require("path");
var H = require("./harness");
var Scene = require(path.join(H.ROOT, "scene.js")).Scene;

function hit(a, b) { return !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]); }

H.test("tall screens: posts never overlap and stay inside (820 shapes)", function () {
  var n = 0;
  for (var w = 320; w <= 1000; w += 17) for (var asp = 0.42; asp < 1.02; asp += 0.03) {
    var g = Scene.geometry(w, Math.round(w / asp));
    if (g.lay !== "tall") continue;
    n++;
    var B = g.posts.map(Scene.postBox);
    for (var i = 0; i < 18; i++) {
      assert.ok(B[i][0] > 0 && B[i][2] < g.W, w + "x" + Math.round(w / asp) + " " + g.posts[i].id + " off the side");
      for (var j = i + 1; j < 18; j++) assert.ok(!hit(B[i], B[j]), w + "x" + Math.round(w / asp) + " " + g.posts[i].id + " touches " + g.posts[j].id);
    }
  }
  assert.ok(n > 500);
});

H.test("tall screens: even steps (the named sizes)", function () {
  [[768, 835], [390, 633], [390, 453]].forEach(function (sz) {
    var g = Scene.geometry(sz[0], sz[1]), P = g.posts;
    assert.strictEqual(g.lay, "tall");
    /* step between neighbours in lamp widths (18 units at depth 1); turns and the two movement
       breaks are allowed to differ, ordinary steps must agree within 15% */
    var steps = [];
    for (var i = 0; i < 17; i++) {
      if (i === 1 || i === 10) continue;
      if (Math.abs(P[i].tx) < 0.95 || Math.abs(P[i + 1].tx) < 0.95 || P[i].tx * P[i + 1].tx < 0) continue;
      steps.push(Math.hypot(P[i].x - P[i + 1].x, P[i].y - P[i + 1].y) / (9 * (P[i].s + P[i + 1].s)));
    }
    assert.ok(steps.length >= 9, "enough straight steps " + steps.length);
    var lo = Math.min.apply(null, steps), hi = Math.max.apply(null, steps);
    assert.ok(hi / lo < 1.15, sz + " steps " + steps.map(function (x) { return x.toFixed(1); }).join(" "));
    assert.ok(lo > 7, "posts at least seven lamp widths apart: " + lo.toFixed(1));
  });
});

H.test("wide screens keep their road", function () {
  var g = Scene.geometry(1024, 600);
  assert.strictEqual(g.lay, "wide");
  assert.ok(Math.abs(g.posts[0].t - 0.055) < 1e-9 && Math.abs(g.posts[17].t - 0.905) < 1e-9);
});
