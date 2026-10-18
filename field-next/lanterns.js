/* Quiet Field 2: the Gettysburg Address (Bliss copy) in 18 lanterns, three movements.
   Text, titles and hinges exactly as docs/quiet-field/memory-science.md section 2.
   Classic script: everything hangs off window.QF_DATA. */
(function (root) {
  "use strict";

  // [id, title, Bliss text, parent p id, station on the walk]
  var RAW = [
    ["g1", "Four Score Fathers", "Four score and seven years ago our fathers brought forth on this continent, a new nation,", "p1", "The railway depot"],
    ["g2", "All Created Equal", "conceived in Liberty, and dedicated to the proposition that all men are created equal.", "p1", "The Wills House"],
    ["g3", "The Great Test", "Now we are engaged in a great civil war, testing whether that nation,", "p2", "The Diamond"],
    ["g4", "Can It Endure?", "or any nation so conceived and so dedicated, can long endure.", "p2", "Baltimore Street"],
    ["g5", "We Are Met", "We are met on a great battle-field of that war.", "p3", "The hill road"],
    ["g6", "A Resting Place", "We have come to dedicate a portion of that field, as a final resting place", "p4", "The cemetery gatehouse"],
    ["g7", "That That Nation", "for those who here gave their lives that that nation might live.", "p4", "The new graves"],
    ["g8", "Fitting and Proper", "It is altogether fitting and proper that we should do this.", "p5", "The stone wall"],
    ["g9", "Can Not Hallow", "But, in a larger sense, we can not dedicate—we can not consecrate—we can not hallow—this ground.", "p6", "The open field"],
    ["g10", "Brave Men Consecrated", "The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract.", "p7", "The crowd's edge"],
    ["g11", "The World Forgets", "The world will little note, nor long remember what we say here, but it can never forget what they did here.", "p8", "The speakers' platform"],
    ["g12", "Us the Living", "It is for us the living, rather, to be dedicated here to the unfinished work", "p9", "The crowd below"],
    ["g13", "Nobly Advanced", "which they who fought here have thus far so nobly advanced.", "p9", "The far ridges"],
    ["g14", "The Great Task", "It is rather for us to be here dedicated to the great task remaining before us—", "p10", "The long road"],
    ["g15", "Full Measure", "that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—", "p11", "The last light"],
    ["g16", "Not in Vain", "that we here highly resolve that these dead shall not have died in vain—", "p12", "The flag"],
    ["g17", "New Birth of Freedom", "that this nation, under God, shall have a new birth of freedom—", "p12", "The dawn sky"],
    ["g18", "Of, By, For", "and that government of the people, by the people, for the people, shall not perish from the earth.", "p12", "The open country"]
  ];

  // Hinge -> next, from the memo's table (end words of this lantern, first words of the next).
  var HINGE = {
    g1: ["nation", "conceived"], g2: ["equal", "Now"], g3: ["that nation", "or any nation"],
    g4: ["endure", "We are met"], g5: ["that war", "We have come"], g6: ["resting place", "for those"],
    g7: ["live", "It is altogether"], g8: ["do this", "But"], g9: ["ground", "The brave men"],
    g10: ["detract", "The world"], g11: ["they did", "us the living"], g12: ["work", "which they"],
    g13: ["advanced", "It is rather"], g14: ["before us", "that from"], g15: ["devotion", "that we here"],
    g16: ["vain", "that this nation"], g17: ["freedom", "and that government"], g18: null
  };

  var MOVEMENTS = [
    { n: 1, name: "Then", ids: ["g1", "g2"] },
    { n: 2, name: "Now", ids: ["g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10", "g11"] },
    { n: 3, name: "Ahead", ids: ["g12", "g13", "g14", "g15", "g16", "g17", "g18"] }
  ];

  // Three checked facts. Kept to what the historical record states plainly.
  var NOTES = [
    { id: "n1", lantern: "g1", title: "Four score and seven",
      text: "A score is twenty. Four score and seven is 4 × 20 + 7 = 87. Counting back 87 years from 1863 lands on 1776, the year of the Declaration of Independence." },
    { id: "n2", lantern: "g8", title: "The two-hour speech",
      text: "Lincoln was not the main speaker. Edward Everett, a famous orator, spoke first, for about two hours. Lincoln's address took about two minutes." },
    { id: "n3", lantern: "g11", title: "Everett's letter",
      text: "The next day Everett wrote to Lincoln: “I should be glad, if I could flatter myself that I came as near to the central idea of the occasion, in two hours, as you did in two minutes.”" }
  ];

  // Small grammatical words, blanked on rung 1 and left without a letter on rung 3.
  var FUNCTION_WORDS = {};
  ("a an the and or but nor of in on to for by from that this these those it is are be we us our " +
   "they their who which what so as have has can not will shall should do did whether any all under above before might")
    .split(" ").forEach(function (w) { FUNCTION_WORDS[w] = true; });

  // The one tokenizer: whitespace and em-dashes separate words; punctuation stays on the word.
  function tokenize(s) {
    return String(s || "").split(/[\s—]+/).filter(function (w) { return w.length > 0; });
  }
  function bare(word) { return String(word || "").toLowerCase().replace(/[^a-z]/g, ""); }
  function firstLetter(word) { return bare(word).charAt(0); }
  function isFunctionWord(word) { return !!FUNCTION_WORDS[bare(word)]; }

  var lanterns = [], byId = {}, w = 0;
  RAW.forEach(function (r, i) {
    var words = tokenize(r[2]);
    var mv = 0;
    MOVEMENTS.forEach(function (m) { if (m.ids.indexOf(r[0]) >= 0) mv = m.n; });
    var note = null;
    NOTES.forEach(function (n) { if (n.lantern === r[0]) note = { title: n.title, text: n.text }; });
    var h = HINGE[r[0]];
    var L = {
      id: r[0], n: i + 1, movement: mv, title: r[1], text: r[2], words: words,
      w0: w, w1: w + words.length - 1,
      hinge: h ? { end: h[0], next: h[1] } : null,
      hingeText: h ? h[0] + " → " + h[1] : "",
      from: r[3], station: r[4], note: note, pic: null
    };
    w += words.length;
    lanterns.push(L);
    byId[L.id] = L;
  });

  // Canonical full text, joined the same way tools/voice_build.py does (no space after a dash).
  var text = lanterns.map(function (L) { return L.text; }).join(" ").replace(/— /g, "—");

  // Seams: last 3-4 words of lantern a, first 3-4 words of lantern b (4 unless the lantern is short).
  function seamLen(n) { return n >= 10 ? 4 : 3; }
  var seams = [];
  for (var i = 0; i < lanterns.length - 1; i++) {
    var a = lanterns[i], b = lanterns[i + 1];
    var tw = a.words.slice(a.words.length - seamLen(a.words.length));
    var hw = b.words.slice(0, seamLen(b.words.length));
    seams.push({ id: a.id + ">" + b.id, a: a.id, b: b.id, tail: tw.join(" "), head: hw.join(" "), tailWords: tw, headWords: hw });
  }

  // Ladder cue for one lantern at one rung.
  function cue(id, rung) {
    var L = byId[id];
    if (!L) return [];
    return L.words.map(function (wd) {
      var fw = isFunctionWord(wd), show;
      if (rung <= 0) show = "word";
      else if (rung === 1) show = fw ? "blank" : "word";
      else if (rung === 2) show = "letter";
      else if (rung === 3) show = fw ? "blank" : "letter";
      else show = "blank";
      return { w: wd, show: show, letter: firstLetter(wd) };
    });
  }

  root.QF_DATA = {
    lanterns: lanterns, movements: MOVEMENTS, seams: seams, notes: NOTES, text: text,
    byId: byId, tokenize: tokenize, bare: bare, firstLetter: firstLetter,
    isFunctionWord: isFunctionWord, cue: cue, WORDS: w
  };
})(typeof window !== "undefined" ? window : this);
