"use strict";
/* Memory aids: the printed cue card's first letters, Word Detective counts (and that it never
   touches lantern evidence), Field Notes, and the eighteen pictures. */
var assert = require("assert");
var H = require("./harness");
var env = H.makeEnv({ files: ["store.js", "lanterns.js", "memory.js", "pictures.js", "cuecard.js", "notes.js", "detective.js"] });
var C = env.ctx, D = C.QF_DATA, QF = C.QF;
var J = function (x) { return JSON.parse(JSON.stringify(x)); };

console.log("aids");
H.test("cue card: first letter of every word, punctuation kept (memo example for g1)", function () {
  assert.strictEqual(C.QFCue.letters(D.byId.g1.text), "F s a s y a o f b f o t c, a n n,");
  assert.strictEqual(C.QFCue.letters(D.byId.g2.text), "c i L, a d t t p t a m a c e.");
});
H.test("cue card: em-dashes stay between letters, hyphenated word is one letter", function () {
  assert.strictEqual(C.QFCue.letters(D.byId.g9.text), "B, i a l s, w c n d—w c n c—w c n h—t g.");
  assert.strictEqual(C.QFCue.letters(D.byId.g5.text), "W a m o a g b o t w.");
  assert.strictEqual(C.QFCue.letters(D.byId.g14.text), "I i r f u t b h d t t g t r b u—");
  assert.strictEqual(C.QFCue.letters(D.byId.g17.text), "t t n, u G, s h a n b o f—");
  assert.strictEqual(C.QFCue.letters(D.byId.g18.text), "a t g o t p, b t p, f t p, s n p f t e.");
});
H.test("cue card: one letter per tokenizer word for all 18 lanterns, in reading order", function () {
  var lines = C.QFCue.lines();
  assert.strictEqual(lines.length, 18);
  lines.forEach(function (r, i) {
    var L = D.lanterns[i];
    assert.strictEqual(r.id, L.id);
    var n = r.letters.split(/[\s—]+/).filter(Boolean).length;
    assert.strictEqual(n, L.words.length, L.id);
    L.words.forEach(function (w, j) {
      var got = r.letters.split(/[\s—]+/).filter(Boolean)[j].replace(/[^A-Za-z]/g, "");
      assert.strictEqual(got.toLowerCase(), D.firstLetter(w), L.id + " word " + j);
    });
  });
});
H.test("word detective: 8 here, 6 dedicate/dedicated, 5 nation over the tokenizer's 271 words", function () {
  var t = C.QFCue.targets();
  assert.strictEqual(t.here.length, 8);
  assert.strictEqual(t.dedicate.length, 6);
  assert.strictEqual(t.nation.length, 5);
  assert.deepStrictEqual(J(C.QFCue.EXPECT), { here: 8, dedicate: 6, nation: 5 });
  var words = D.tokenize(D.text);
  var ded = t.dedicate.map(function (i) { return D.bare(words[i]); });
  assert.deepStrictEqual(J(ded), ["dedicated", "dedicated", "dedicate", "dedicate", "dedicated", "dedicated"]);
  function lanternOf(i) { return D.lanterns.filter(function (L) { return i >= L.w0 && i <= L.w1; })[0].id; }
  assert.deepStrictEqual(J(t.here.map(lanternOf)), ["g7", "g10", "g11", "g11", "g12", "g13", "g14", "g16"]);
  assert.deepStrictEqual(J(t.nation.map(lanternOf)), ["g1", "g3", "g4", "g7", "g17"]);
});
H.test("word detective: locked until Movement II is lit; finds never touch lantern records", function () {
  var pid = env.addPlayer("Sleuth");
  env.setDay("2026-11-02");
  QF.migrate();
  assert.strictEqual(C.QFDetective.unlocked(), false);
  QF.movements()[1].ids.forEach(function (id) { H.climb(QF, id); });
  assert.strictEqual(C.QFDetective.unlocked(), true);
  var before = JSON.stringify(C.store.progress[pid]);
  var litBefore = J(C.store.fun[pid].qf2.lit);
  var t = C.QFCue.targets(), words = D.tokenize(D.text), last;
  assert.strictEqual(C.QFDetective.find(0, words[0]), null, "a non-target word does nothing");
  t.here.forEach(function (g) { last = C.QFDetective.find(g, words[g]); });
  assert.strictEqual(last.kind, "here");
  assert.strictEqual(last.justDone, true);
  assert.strictEqual(C.QFDetective.find(t.here[0], words[t.here[0]]).justDone, false, "done only once");
  var p = C.QFDetective.progress();
  assert.deepStrictEqual(J(p.here), { found: 8, of: 8, done: true });
  assert.deepStrictEqual(J(p.nation), { found: 0, of: 5, done: false });
  assert.strictEqual(JSON.stringify(C.store.progress[pid]), before, "progress untouched");
  assert.deepStrictEqual(J(C.store.fun[pid].qf2.lit), litBefore);
  assert.strictEqual(C.store.fun[pid].qf2.detective.here.length, 8);
  assert.ok(JSON.parse(env.ls.getItem("quiet-field-v2")).fun[pid].qf2.detective.here.length === 8, "saved with saveStore");
});
H.test("field notes: 18, one per lantern in road order, the 3 checked notes kept word for word", function () {
  var all = C.QFNotes.all();
  assert.strictEqual(all.length, 18);
  all.forEach(function (nt, i) { assert.strictEqual(nt.lantern, D.lanterns[i].id); assert.ok(nt.title && nt.text.length > 40, nt.id); });
  D.notes.forEach(function (orig) {
    var nt = C.QFNotes.forLantern(orig.lantern);
    assert.strictEqual(nt.id, orig.id); assert.strictEqual(nt.text, orig.text);
  });
  var ids = all.map(function (x) { return x.id; });
  assert.strictEqual(new Set(ids).size, 18);
  assert.ok(!/envelope/.test(C.QFNotes.forLantern("g16").text) || /myth/.test(C.QFNotes.forLantern("g16").text), "the envelope story is only told as a myth");
});
H.test("field notes: found when the lantern is lit, never before", function () {
  env.addPlayer("Finder");
  env.setDay("2026-11-03");
  QF.migrate();
  assert.deepStrictEqual(Object.keys(C.QFNotes.found()), []);
  H.climb(QF, "g2");
  assert.deepStrictEqual(Object.keys(C.QFNotes.found()), ["g2"]);
  assert.deepStrictEqual(J(C.QFNotes.unseen()), ["g2"]);
});
H.test("pictures: 18 distinct inline SVGs, 120x90, ink only, no text, no animation", function () {
  var P = C.QFPictures;
  assert.deepStrictEqual(J(P.ids), J(D.lanterns.map(function (L) { return L.id; })));
  var seen = {};
  P.ids.forEach(function (id) {
    var s = P.svg(id, { size: 96 });
    assert.ok(/^<svg [^>]*viewBox="0 0 120 90"/.test(s), id);
    assert.ok(/width="96" height="72"/.test(s), id);
    assert.ok(!/<text|<animate|<image|https?:\/\/(?!www\.w3\.org)/.test(s), id + " has no text, animation or external asset");
    assert.ok(P.caption(id).length > 20, id + " caption");
    var body = s.replace(/qfp\d+-/g, "");
    assert.ok(!seen[body], id + " differs from the others");
    seen[body] = true;
    var opens = (s.match(/<(svg|g|defs|pattern)\b/g) || []).length, closes = (s.match(/<\/(svg|g|defs|pattern)>/g) || []).length;
    assert.strictEqual(opens, closes, id + " balanced");
  });
  var a = P.svg("g1"), b = P.svg("g1");
  assert.notStrictEqual(a.match(/id="(qfp\d+)-h"/)[1], b.match(/id="(qfp\d+)-h"/)[1], "pattern ids are unique per drawing");
});
H.results.fail ? process.exit(1) : null;
