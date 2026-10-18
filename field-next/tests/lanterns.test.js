"use strict";
var assert = require("assert"), fs = require("fs"), path = require("path");
var H = require("./harness");
var env = H.makeEnv();
var D = env.ctx.QF_DATA;
var J = function (x) { return JSON.parse(JSON.stringify(x)); };
var timing = JSON.parse(fs.readFileSync(path.join(H.ROOT, "audio/rea/timing.json"), "utf8"));

console.log("lanterns");
H.test("tokenizer: 271 words, identical to timing.json words", function () {
  var toks = D.tokenize(D.text);
  assert.strictEqual(toks.length, 271);
  assert.strictEqual(D.WORDS, 271);
  assert.deepStrictEqual(J(toks), timing.words.map(function (w) { return w.w; }));
  timing.words.forEach(function (w, i) { assert.strictEqual(w.i, i); });
});
H.test("each lantern's word range matches timing.json lanterns", function () {
  D.lanterns.forEach(function (L) {
    var t = timing.lanterns[L.id];
    assert.strictEqual(L.w0, t.w0, L.id + " w0");
    assert.strictEqual(L.w1, t.w1, L.id + " w1");
    assert.deepStrictEqual(J(L.words), J(timing.words.slice(t.w0, t.w1 + 1).map(function (w) { return w.w; })));
  });
});
H.test("lantern texts are exactly tools/voice_build.py list L and concatenate to the canonical text", function () {
  var src = fs.readFileSync(path.join(H.ROOT, "../tools/voice_build.py"), "utf8");
  var re = /\("(g\d+)", "([^"]*)"\)/g, m, L = [];
  while ((m = re.exec(src))) L.push([m[1], m[2]]);
  assert.strictEqual(L.length, 18);
  L.forEach(function (row, i) {
    assert.strictEqual(D.lanterns[i].id, row[0]);
    assert.strictEqual(D.lanterns[i].text, row[1], row[0]);
  });
  var joined = L.map(function (r) { return r[1]; }).join(" ").replace(/— /g, "—");
  assert.strictEqual(D.text, joined);
  assert.ok(D.text.indexOf("before us—that from") > 0);
  assert.ok(/^Four score and seven years ago/.test(D.text) && /perish from the earth\.$/.test(D.text));
});
H.test("titles, word counts, hinges and parents match memory-science.md section 2", function () {
  var md = fs.readFileSync(path.join(H.ROOT, "../docs/quiet-field/memory-science.md"), "utf8");
  var rows = md.split("\n").filter(function (l) { return /^\| g\d+ \|/.test(l); });
  assert.strictEqual(rows.length, 18);
  rows.forEach(function (l, i) {
    var c = l.split("|").map(function (s) { return s.trim(); });
    var L = D.lanterns[i];
    assert.strictEqual(c[1], L.id);
    assert.strictEqual(c[2], L.title);
    assert.strictEqual(c[3], L.text, L.id + " text");
    assert.strictEqual(+c[4], L.words.length, L.id + " count");
    assert.strictEqual(c[6], L.from);
    if (L.hinge) assert.strictEqual(c[5].replace(/\*/g, ""), L.hinge.end + " → " + L.hinge.next);
    else assert.strictEqual(c[5], "(end)");
  });
});
H.test("movements Then/Now/Ahead cover g1-g18 in order", function () {
  assert.deepStrictEqual(J(D.movements.map(function (m) { return m.name; })), ["Then", "Now", "Ahead"]);
  var all = [].concat.apply([], D.movements.map(function (m) { return m.ids; }));
  assert.deepStrictEqual(J(all), J(D.lanterns.map(function (L) { return L.id; })));
  D.lanterns.forEach(function (L) { assert.ok(D.movements[L.movement - 1].ids.indexOf(L.id) >= 0); });
});
H.test("17 seams: tail is the end of a, head the start of b (3-4 words)", function () {
  assert.strictEqual(D.seams.length, 17);
  D.seams.forEach(function (s, i) {
    var a = D.lanterns[i], b = D.lanterns[i + 1];
    assert.strictEqual(s.id, a.id + ">" + b.id);
    assert.ok(s.tailWords.length >= 3 && s.tailWords.length <= 4);
    assert.ok(s.headWords.length >= 3 && s.headWords.length <= 4);
    assert.deepStrictEqual(J(s.tailWords), J(a.words.slice(a.words.length - s.tailWords.length)));
    assert.deepStrictEqual(J(s.headWords), J(b.words.slice(0, s.headWords.length)));
    assert.strictEqual(s.tail, s.tailWords.join(" "));
  });
});
H.test("firstLetter: letters only, lowercase", function () {
  assert.strictEqual(D.firstLetter("battle-field"), "b");
  assert.strictEqual(D.firstLetter("But,"), "b");
  assert.strictEqual(D.firstLetter("Liberty,"), "l");
  assert.strictEqual(D.firstLetter("“quote"), "q");
  assert.strictEqual(D.tokenize("we can not dedicate—we can").length, 6);
  assert.strictEqual(D.bare("battle-field"), "battlefield");
});
H.test("at most 3 field notes, each attached to a lantern", function () {
  assert.ok(D.notes.length <= 3);
  D.notes.forEach(function (n) { assert.ok(D.byId[n.lantern].note); });
});
H.test("ladder cues per rung", function () {
  var c0 = D.cue("g1", 0), c1 = D.cue("g1", 1), c2 = D.cue("g1", 2), c3 = D.cue("g1", 3), c4 = D.cue("g1", 4);
  assert.ok(c0.every(function (x) { return x.show === "word"; }));
  assert.strictEqual(c1[2].show, "blank");                     // "and"
  assert.strictEqual(c1[1].show, "word");                      // "score"
  assert.ok(c2.every(function (x) { return x.show === "letter"; }));
  assert.strictEqual(c3[2].show, "blank");
  assert.strictEqual(c3[0].show, "letter");
  assert.ok(c4.every(function (x) { return x.show === "blank"; }));
  assert.strictEqual(c2.map(function (x) { return x.letter; }).join(""), "fsasyaofbfotcann");
});
H.test("no emoji in the data strings", function () {
  var s = JSON.stringify([D.lanterns, D.notes, D.movements]);
  assert.ok(!/[\u{1F000}-\u{1FFFF}☀-➿]/u.test(s));
});
