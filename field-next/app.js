/* Quiet Field 2, "The Night Before": screens, the session runner and the glue between the scene
   (scene.js), the games (games.js), the memory engine (memory.js, window.QF) and the voice
   (voice.js, window.FieldVoice). Classic script.

   Globals sync.js / arrive.js call: toast, showScreen, showHome, showProfiles, seedIntroduced,
   showRecover (store, saveStore, getActiveProfile, slugName, YOMPLE_* come from store.js). */

var QF2_AVATAR = "🪔";
var RUNG_NAMES = ["Trace the words", "Small words hidden", "First letters", "Key letters only", "From memory"];
var STEP_NAMES = { listen: "Listen", cold: "From memory", ladder: "The ladder", seam: "The seams", walk: "Night walk" };

/* ---------- small helpers ---------- */
function $(id) { return document.getElementById(id); }
function esc(s) { return (window.Games && Games.esc) ? Games.esc(s) : String(s); }
function hasQF() { return typeof QF !== "undefined" && QF && typeof QF.buildTonight === "function"; }
function voiceOk() { return typeof FieldVoice !== "undefined" && FieldVoice && typeof FieldVoice.play === "function"; }
function lowerFirst(s) { s = String(s || ""); return s.charAt(0).toLowerCase() + s.slice(1); }
function numberWord(n) { return ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen"][n] || String(n); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function lanternOf(id) { return hasQF() ? QF.lantern(id) : null; }
function kickerFor(L) { return "Lantern " + L.n + ", " + lowerFirst(L.station || ""); }
function hingeFor(L) {
  if (!L || !L.hinge) return "The last lantern on the road.";
  return "It ends on “" + L.hinge.end + "” and hands on to “" + L.hinge.next + "”.";
}
function unlockAudio() {
  try { if (window.Juice) Juice.unlock(); } catch (e) {}
  try { if (voiceOk() && FieldVoice.unlock) FieldVoice.unlock(); } catch (e) {}
}

function toast(msg) {
  var el = $("toast"); if (!el) return;
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.classList.remove("show"); }, 2600);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("on"); });
  var el = $(id); if (el) el.classList.add("on");
  var nav = $("main-nav"); if (nav) nav.style.display = "none";
  document.body.setAttribute("data-screen", id);
  if (id !== "screen-session") { sessionActive = false; blurCatcher(); }
  window.scrollTo(0, 0);
}

function seedIntroduced() { if (hasQF() && QF.seed) QF.seed(); }

/* ---------- players ---------- */
function showProfiles() {
  stopVoice();
  showScreen("screen-profiles");
  var grid = $("profile-grid"); if (!grid) return;
  grid.innerHTML = "";
  (store.profiles || []).forEach(function (p) {
    var b = document.createElement("button");
    b.className = "face";
    b.innerHTML = "<span class='av'>" + esc(p.avatar || QF2_AVATAR) + "</span><span class='nm'>" + esc(p.name) + "</span>";
    b.onclick = function () { pickPlayer(p); };
    grid.appendChild(b);
  });
}
function pickPlayer(p) {
  if (p.pin) {
    var pin = window.prompt("PIN for " + p.name);
    if (pin !== p.pin) { toast("That PIN did not match."); return; }
  }
  store.activeId = p.id;
  if (hasQF()) QF.migrate();
  saveStore();
  showHome();
}
function showCreateProfile() { showScreen("screen-create"); var n = $("new-name"); if (n) n.value = ""; }
function createProfile() {
  var name = ($("new-name").value || "").trim() || "Field walker";
  var pin = (($("new-pin") && $("new-pin").value) || "").trim();
  var username = slugName(name), id = "u-" + username;
  if ((store.profiles || []).some(function (p) { return p.username === username; })) { toast("That name is already here."); return; }
  function finish(family) {
    if (family) store.familyCode = family;
    store.profiles.push({ id: id, name: name, avatar: QF2_AVATAR, username: username, pin: pin, created: Date.now() });
    store.activeId = id;
    if (!store.progress[id]) store.progress[id] = {};
    if (!store.fun[id]) store.fun[id] = { stars: 0, mute: false, questDay: "", questN: 0, topic: "gettysburg" };
    seedIntroduced();
    if (typeof ensureFamily === "function") ensureFamily();
    saveStore();
    toast("Welcome, " + name + ".");
    setTimeout(showHome, 300);
  }
  if (typeof findAnyYomplePerson === "function") {
    findAnyYomplePerson(username).then(function (hit) {
      if (hit && hit.table === YOMPLE_TABLE) { toast("That name is already saved. Use Find."); return; }
      if (hit && hit.row) { finish(hit.row.family_code); return; }
      finish();
    });
  } else finish();
}
function findHall() { toast("The household lookup is still waking up. Try Find once more."); }
function showRecover() { stopVoice(); showScreen("screen-recover"); }

/* ---------- home ---------- */
var sceneMounted = false;
function lanternStatus(nextIds) {
  var out = {};
  if (!hasQF()) return out;
  QF.lanterns().forEach(function (L) {
    var it = QF.item(L.id) || {};
    out[L.id] = { lit: !!it.lit, shining: !!it.shining, next: (nextIds || []).indexOf(L.id) >= 0 };
  });
  return out;
}
function tonightPlan() {
  var steps = hasQF() ? QF.buildTonight() : [];
  var plan = { steps: steps, fresh: [], cold: [], listen: false, repairs: [] };
  steps.forEach(function (s) {
    if (s.kind === "listen") plan.listen = true;
    if (s.kind === "cold") plan.cold = s.ids.slice();
    if (s.kind === "ladder") {
      var it = QF.item(s.ids[0]) || {};
      if (it.st >= 1 && it.intro !== QF.today()) plan.repairs.push(s.ids[0]);
      else plan.fresh.push(s.ids[0]);
    }
  });
  return plan;
}
function placePhrase(ids) {
  var t = (window.Scene && Scene.teaser) ? Scene.teaser(ids) : "";
  return t.replace(/^Tomorrow: /, "");
}
function showHome() {
  stopVoice();
  if (!getActiveProfile()) { showProfiles(); return; }
  showScreen("screen-home");
  var p = getActiveProfile();
  $("current-kid-badge").innerHTML = "<span class='av'>" + esc(p.avatar || QF2_AVATAR) + "</span><span>" + esc(p.name) + "</span>";
  paintSoundChip();
  $("close-placard").hidden = true;
  $("home-placard").hidden = false;
  var plan = tonightPlan();
  paintPlacard(plan);
  /* the Dedication (ceremony.js): its button on the placard, the platform label */
  if (window.Ceremony) Ceremony.paintHome();
  fitPlacard();
  if (!sceneMounted && window.Scene) { Scene.mount($("scene")); sceneMounted = true; }
  if (window.Scene) Scene.update(lanternStatus(plan.fresh));
}
/* the scene ends where the placard begins, so no lantern ever hides behind it */
function fitPlacard() {
  var pl = $("home-placard");
  if (!pl || pl.hidden || !pl.offsetHeight) return;
  var cs = getComputedStyle(pl), bottom = parseFloat(cs.bottom) || 18;
  document.documentElement.style.setProperty("--placard-h", Math.max(0, Math.round(pl.offsetHeight + bottom - 28)) + "px");
}
window.addEventListener("resize", function () { clearTimeout(fitPlacard._t); fitPlacard._t = setTimeout(fitPlacard, 80); });
function paintPlacard(plan) {
  var lede = $("home-lede"), note = $("home-note"), btn = $("btn-tonight");
  var sum = hasQF() ? QF.summary() : { lit: 0, lanterns: 18, seamsDone: 0, of: 17 };
  var bits = [];
  if (plan.listen) {
    lede.textContent = "Lincoln’s train is in. Hear the whole address once, then light the first two lanterns by the depot.";
  } else if (plan.steps.length === 0) {
    lede.textContent = sum.lit
      ? "Every lantern you lit is resting until tomorrow. You can still walk the road."
      : "The road is quiet. Walk it once more before bed.";
  } else {
    if (plan.cold.length) bits.push("walk past " + (plan.cold.length === 1 ? "one lit lantern" : numberWord(plan.cold.length) + " lit lanterns") + " from memory");
    if (plan.repairs.length) bits.push("trim " + (plan.repairs.length === 1 ? "one lantern" : numberWord(plan.repairs.length) + " lanterns") + " that need oil");
    if (plan.fresh.length) bits.push("light " + placePhrase(plan.fresh));
    if (!bits.length) bits.push("walk the road you have lit");
    var s = bits.length > 1 ? bits.slice(0, -1).join(", ") + ", then " + bits[bits.length - 1] : bits[0];
    lede.textContent = "Tonight: " + s + ".";
  }
  btn.querySelector("span").textContent = plan.steps.length ? "Tonight" : "Walk the road";
  btn.disabled = !plan.steps.length && !sum.lit;
  if (btn.disabled) btn.querySelector("span").textContent = "Tonight";
  note.textContent = sum.lit
    ? cap(numberWord(sum.lit)) + " of eighteen lanterns lit" + (sum.seamsDone ? ", " + numberWord(sum.seamsDone) + " of seventeen seams joined" : "")
    : "Eighteen posts between the depot and the platform";
}

/* ---------- sound ---------- */
var SPEAKER_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
var SPEAKER_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
function paintSoundChip() {
  var m = window.Juice && Juice.muted();
  var c = $("sound-chip");
  if (c) { c.innerHTML = m ? SPEAKER_OFF : SPEAKER_ON; c.setAttribute("aria-label", m ? "Sound is off" : "Sound is on"); }
  var b = $("parent-sound"); if (b) b.textContent = m ? "Turn sound on" : "Turn sound off";
}
function toggleSound() {
  unlockAudio();
  if (window.Juice) Juice.setMuted(!Juice.muted());
  if (window.Juice && Juice.muted()) stopVoice();
  paintSoundChip();
}

/* ---------- the hidden input (games.js Keys does the iPad work) ---------- */
var sessionActive = false, onLetter = null, onEnter = null, keys = null;
function catcher() { return $("catcher"); }
function focusCatcher() { if (keys && sessionActive) keys.focus(); }
function blurCatcher() { if (keys) keys.blur(); }
function wireInput() {
  var c = catcher();
  if (c && window.Games && Games.Keys) {
    keys = Games.Keys({
      input: c, frame: $("sess-frame"), root: $("screen-session"),
      active: function () { return sessionActive; }, wants: function () { return !!onLetter; },
      letter: function (ch) { if (onLetter) onLetter(ch); }, enter: function () { if (onEnter) onEnter(); },
      tap: unlockAudio, resize: function () { if (S && S.trail && S.trail.reveal) S.trail.reveal(); }
    });
  }
  /* sound may only start inside a tap: every touchend and click unlocks it (Tonight included) */
  document.addEventListener("touchend", unlockAudio, { passive: true });
  document.addEventListener("click", unlockAudio, true);
  var t = $("btn-tonight"); if (t) t.addEventListener("touchend", unlockAudio, { passive: true });
}

/* ---------- session runner ---------- */
var S = null;
function stopVoice() {
  if (S && S.play) { try { S.play.stop(); } catch (e) {} S.play = null; }
  if (voiceOk() && FieldVoice.stop) { try { FieldVoice.stop(); } catch (e) {} }
}
function startTonight() {
  unlockAudio();
  if (!hasQF() || !getActiveProfile()) { toast("Pick a player first."); return; }
  var steps = QF.buildTonight();
  if (!steps.length) {
    var lit = QF.lanterns().filter(function (L) { return (QF.item(L.id) || {}).lit; }).map(function (L) { return L.id; });
    if (!lit.length) return;
    steps = [{ kind: "walk", ids: lit }];
  }
  QF.startSession();
  runSession(steps);
}
function practiceLantern(id) {
  unlockAudio();
  if (!hasQF()) return;
  QF.startSession();
  runSession([{ kind: "ladder", ids: [id] }]);
}
function runSession(steps) {
  S = { steps: steps, k: -1, newlyLit: [], newlyShining: [], play: null, trail: null };
  showScreen("screen-session");
  sessionActive = true;
  focusCatcher();
  maybeMuteHint();
  if (voiceOk() && FieldVoice.load) { try { FieldVoice.load(); } catch (e) {} }
  nextStep();
}
function maybeMuteHint() {
  try {
    if (!voiceOk() || !FieldVoice.muteHint || !FieldVoice.muteHint()) return;
    if (localStorage.getItem("qf2-mutehint") === "1") return;
    localStorage.setItem("qf2-mutehint", "1");
    setTimeout(function () { toast("No sound? Check that the side switch is not on silent."); }, 900);
  } catch (e) {}
}
function leaveSession() { stopVoice(); S = null; showHome(); }
function paintDots() {
  var ol = $("sess-dots"); if (!ol || !S) return;
  ol.innerHTML = S.steps.map(function (s, i) {
    return "<li class='" + (i < S.k ? "done" : (i === S.k ? "now" : "")) + "'></li>";
  }).join("");
}
function nextStep() {
  if (!S) return;
  stopVoice();
  if (S.steps[S.k] && S.steps[S.k].kind === "cold") {
    /* cold recall can send a lantern back to the ladder tonight: pick up what the engine now says */
    var rest = QF.buildTonight().filter(function (s) { return s.kind !== "listen" && s.kind !== "cold"; });
    S.steps = S.steps.slice(0, S.k + 1).concat(rest);
  }
  S.k++;
  if (S.k >= S.steps.length) { closeSession(); return; }
  var step = S.steps[S.k];
  $("sess-step").textContent = STEP_NAMES[step.kind] || "";
  document.body.setAttribute("data-step", step.kind);
  paintDots();
  if (step.kind === "listen") runListen(step);
  else if (step.kind === "cold") runCold(step.ids.slice());
  else if (step.kind === "ladder") runLadder(step.ids[0]);
  else if (step.kind === "seam") runSeams(step.ids.slice());
  else if (step.kind === "walk") runWalk(step.ids.slice());
  else nextStep();
}

/* sheet painting */
function sheet(o) {
  $("sheet-kicker").textContent = o.kicker || "";
  $("sheet-title").textContent = o.title || "";
  var h = $("sheet-hinge"); h.textContent = o.hinge || ""; h.hidden = !o.hinge;
  msg(o.msg || "");
  $("sheet").className = "sheet " + (o.cls || "");
  lanternGlow(o.glow || 0);
  if (window.Aids) Aids.sheet(o); /* memory aids hook: the lantern's picture beside its title */
  $("sess-body").scrollTop = 0;
}
function msg(text, cls) {
  var m = $("sheet-msg");
  m.textContent = text || "";
  m.className = "sheet-msg" + (cls ? " " + cls : "");
}
function lanternGlow(v) {
  var ml = $("mini-lantern"); if (!ml) return;
  ml.style.setProperty("--g", Math.max(0, Math.min(1, v)).toFixed(3));
  ml.classList.toggle("lit", v >= 1);
}
function jumpMini() {
  var ml = $("mini-lantern"); if (!ml) return;
  ml.classList.remove("jump"); void ml.getBoundingClientRect(); ml.classList.add("jump");
}
function actions(list) {
  var box = $("sess-actions"); box.innerHTML = "";
  onEnter = null;
  list.forEach(function (a) {
    var b = document.createElement("button");
    b.className = "btn " + (a.cls || "") + (a.note ? " has-note" : "");
    b.textContent = a.label;
    if (a.note) { var nt = document.createElement("small"); nt.className = "btn-note"; nt.textContent = a.note; b.appendChild(nt); }
    if (a.id) b.id = a.id;
    if (a.keep === false) b.setAttribute("data-blur", "");
    b.addEventListener("touchend", unlockAudio, { passive: true });
    b.onclick = function (e) {
      e.stopPropagation();
      unlockAudio();
      a.fn();
      if (a.keep !== false) focusCatcher();
    };
    if (a.enter) onEnter = function () { b.click(); };
    box.appendChild(b);
  });
}
function letters(fn) { onLetter = fn; if (keys) keys.refresh(); }

/* karaoke over one lantern (or the whole address) */
function playLantern(id, root) {
  stopVoice();
  if (!voiceOk()) { toast("The voice is not ready on this device."); return null; }
  var L = lanternOf(id);
  var pb;
  try { pb = FieldVoice.play({ lantern: id }); } catch (e) { return null; }
  if (!pb) return null;
  S.play = pb;
  var spans = root ? root.querySelectorAll(".w") : [];
  pb.on("word", function (i) {
    var k = i - L.w0;
    Array.prototype.forEach.call(spans, function (s, j) { s.classList.toggle("sung", j === k); });
  });
  pb.on("end", function () {
    Array.prototype.forEach.call(spans, function (s) { s.classList.remove("sung"); });
    if (S && S.play === pb) S.play = null;
  });
  return pb;
}

/* ---- listen: the whole address once, with the words lit as he says them ---- */
function runListen() {
  sheet({ kicker: "Gettysburg, 19 November 1863", title: "The whole address", hinge: "Listen once, all the way through. Three movements: then, now, and ahead.", cls: "listen" });
  var sp = $("speech");
  sp.className = "speech karaoke";
  sp.innerHTML = Games.karaokeHtml(QF.lanterns());
  letters(null);
  blurCatcher();
  var kws = sp.querySelectorAll(".kw");
  function start() {
    stopVoice();
    if (!voiceOk()) { msg("The voice is not ready on this device. Read it through once, then go on."); return; }
    var pb;
    try { pb = FieldVoice.play({ full: true }); } catch (e) { pb = null; }
    if (!pb) return;
    S.play = pb;
    var last = -1;
    pb.on("word", function (i) {
      for (var j = last + 1; j < i && j < kws.length; j++) kws[j].classList.add("heard");
      if (kws[last]) { kws[last].classList.remove("sung"); kws[last].classList.add("heard"); }
      if (kws[i]) {
        kws[i].classList.add("sung");
        var box = $("sess-body"), r = kws[i].getBoundingClientRect(), b = box.getBoundingClientRect();
        if (r.bottom > b.bottom - 40 || r.top < b.top) box.scrollTo({ top: box.scrollTop + (r.top - b.top) - b.height * 0.35, behavior: reducedMotion() ? "auto" : "smooth" });
      }
      last = i;
    });
    pb.on("end", function (o) {
      if (S && S.play === pb) S.play = null;
      if (o && !o.stopped) {
        Array.prototype.forEach.call(kws, function (k) { k.classList.remove("sung"); k.classList.add("heard"); });
        msg("That is the whole of it: two hundred and seventy-one words. Now the first two lanterns.", "warm");
        actions([{ label: "Hear it again", fn: start, keep: false }, { label: "Go on", cls: "primary", fn: nextStep, enter: true }]);
        if (window.Juice) Juice.step();
      }
    });
  }
  actions([{ label: "Hear it again", fn: start, keep: false }, { label: "Skip to the lanterns", cls: "primary", fn: nextStep, enter: true }]);
  start();
}

/* ---- the ladder: one lantern, rung by rung ---- */
function runLadder(id) {
  var L = lanternOf(id); if (!L) { nextStep(); return; }
  var passes = 0;
  var words = Games.displayWords(L.text, L.words);
  function pass() {
    passes++;
    var rung = QF.rung(id);
    var heard = 0;
    sheet({ kicker: kickerFor(L), title: L.title, hinge: rung >= 3 ? hingeFor(L) : "", cls: "ladder rung-" + rung });
    paintRungs(rung);
    msg(rung === 0 ? "Type the first letter of each word." : (rung >= 4 ? "From memory. Type the first letter of each word." : "Type the first letter of each word, even the hidden ones."));
    var sp = $("speech"); sp.className = "speech";
    var tr = Games.Trail(sp, {
      words: words, rung: rung, scroller: $("sess-body"),
      onWord: function (i) { lanternGlow((i + 1) / words.length * 0.85); },
      onDone: function (st) { finish(rung, st, heard); }
    });
    S.trail = tr;
    letters(function (ch) { tr.key(ch); });
    /* from rung 2 up, hearing it turns this pass into practice (it counts like a peek): say so on
       the button before, and on the card after; never red, never a count */
    var hear = { label: "Hear it", id: "btn-hear", note: rung >= 2 ? "(this pass becomes practice)" : "", fn: function () {
      if (rung >= 2 && !tr.done) {
        if (!heard) msg("Practice pass — the next one counts.", "soft practice");
        heard++;
      }
      playLantern(id, sp);
    } };
    actions([hear, { label: "Peek", fn: function () { tr.peek(); } }]);
  }
  function finish(rung, st, heard) {
    letters(null);
    /* a pass she heard is practice: it is recorded with the hearing as a peek (one rung down, never
       evidence), but typed cleanly it is not a miss, so it never sets the lantern by the window */
    var practice = heard > 0 && st.peeks === 0;
    var peeks = st.peeks + heard;
    var ok = st.peeks === 0 && st.ratio >= 0.9;
    var res = QF.record(id, { kind: "ladder", ok: ok, rung: rung, peeks: peeks, misses: st.misses, ratio: st.ratio }) || {};
    if (res.newlyLit) S.newlyLit.push(id);
    if (res.newlyShining) S.newlyShining.push(id);
    if (res.window) {
      lanternGlow(0.5);
      msg("Set by the window for tomorrow. Nothing is lost.", "soft");
      actions([{ label: "Go on", cls: "primary", fn: nextStep, enter: true }]);
      return;
    }
    if (practice && !res.newlyLit) {
      paintRungs(res.rung, rung);
      msg("That was a practice pass. The next one counts" + (res.rung < rung ? ", " + ["with every word showing", "with the small words hidden", "with first letters", "with key letters only", "from memory"][res.rung] : "") + ".", "soft practice");
    } else if (res.lit && (rung >= 4 || res.newlyLit)) {
      lanternGlow(1); jumpMini();
      if (window.Juice) { Juice.whoomp(); }
      msg(res.newlyLit ? "Lantern " + L.n + " is lit." : "Still burning bright.", "warm");
      actions([{ label: "Go on", cls: "primary", fn: nextStep, enter: true }]);
      return;
    }
    var climbed = res.rung > rung, fell = res.rung < rung;
    if (!practice) {
      paintRungs(res.rung, rung);
      if (climbed) { if (window.Juice) Juice.step(); msg("Up a rung: " + lowerFirst(RUNG_NAMES[res.rung]) + ".", "warm"); }
      else if (fell) msg("One rung down, to " + lowerFirst(RUNG_NAMES[res.rung]) + ". Climb again.", "soft");
      else msg("Once more on this rung.", "soft");
    }
    if (passes >= 8) {
      actions([{ label: "Go on", cls: "primary", fn: nextStep, enter: true }]);
      return;
    }
    actions([
      { label: "Leave it for tonight", fn: nextStep },
      { label: climbed ? "Climb" : "Again", cls: "primary", fn: pass, enter: true }
    ]);
  }
  pass();
}
function paintRungs(rung, from) {
  var k = $("sheet-kicker");
  /* a little ladder: five rungs from the bottom (full text) to the top (from memory) */
  var svg = "<svg class='rungs' viewBox='0 0 22 40' aria-hidden='true'><rect class='rail' x='2' y='1' width='2' height='38'/><rect class='rail' x='18' y='1' width='2' height='38'/>";
  for (var i = 0; i < 5; i++) {
    var y = 34 - i * 7.5;
    svg += "<rect class='" + (i < rung ? "past" : (i === rung ? "now" : "")) + "' x='4' y='" + y + "' width='14' height='2.2'/>";
  }
  svg += "</svg>";
  var html = svg + "<span class='rung-name'>" + esc(RUNG_NAMES[rung]) + "</span>";
  var holder = $("sheet-rungs");
  if (!holder) {
    holder = document.createElement("div"); holder.id = "sheet-rungs"; holder.className = "sheet-rungs";
    k.parentNode.appendChild(holder);
  }
  holder.innerHTML = html;
  holder.hidden = false;
}
function hideRungs() { var h = $("sheet-rungs"); if (h) h.hidden = true; }

/* ---- cold recall: lit lanterns from their title alone ---- */
function runCold(ids) {
  var i = 0;
  function one() {
    if (i >= ids.length) { nextStep(); return; }
    var id = ids[i], L = lanternOf(id);
    if (!L) { i++; one(); return; }
    var words = Games.displayWords(L.text, L.words);
    sheet({ kicker: kickerFor(L) + (ids.length > 1 ? "  (" + (i + 1) + " of " + ids.length + ")" : ""), title: L.title, hinge: hingeFor(L), cls: "cold", glow: 0.6 });
    hideRungs();
    msg("From memory. Type the first letter of each word.");
    var sp = $("speech"); sp.className = "speech";
    var tr = Games.Trail(sp, {
      words: words, rung: 4, scroller: $("sess-body"),
      onWord: function (k) { lanternGlow(0.6 + (k + 1) / words.length * 0.4); },
      onDone: function (st) {
        letters(null);
        var ok = st.peeks === 0 && st.ratio >= 0.9;
        var res = QF.record(id, { kind: "cold", ok: ok, rung: 4, peeks: st.peeks, misses: st.misses, ratio: st.ratio }) || {};
        if (res.newlyShining) S.newlyShining.push(id);
        if (res.window) msg("Set by the window for tomorrow. Nothing is lost.", "soft");
        else if (res.newlyShining) { jumpMini(); if (window.Juice) Juice.bell(); msg("Lantern " + L.n + " is shining now. Two nights running.", "warm"); }
        else if (res.qualified) { jumpMini(); if (window.Juice) Juice.whoomp(); msg("Still burning.", "warm"); }
        else msg("It will come back on the ladder tonight.", "soft");
        i++;
        actions([{ label: "Go on", cls: "primary", fn: one, enter: true }]);
      }
    });
    S.trail = tr;
    letters(function (ch) { tr.key(ch); });
    actions([{ label: "Peek", fn: function () { tr.peek(); } }]);
  }
  one();
}

/* ---- the seams: end of one lantern, start of the next ---- */
function runSeams(ids) {
  var i = 0;
  function one() {
    if (i >= ids.length) { nextStep(); return; }
    var sm = QF.seam(ids[i]);
    if (!sm) { i++; one(); return; }
    var A = lanternOf(sm.a), B = lanternOf(sm.b);
    var aw = Games.displayWords(A.text, A.words), bw = Games.displayWords(B.text, B.words);
    var tail = aw.slice(aw.length - sm.tailWords.length), head = bw.slice(0, sm.headWords.length);
    sheet({ kicker: "Lantern " + A.n + " into lantern " + B.n, title: "What comes next?", hinge: "The end of “" + A.title + "” is written. Type how “" + B.title + "” begins.", cls: "seam", glow: 0.4 });
    hideRungs();
    msg("Type the first letters of the next " + numberWord(head.length) + " words.");
    var sp = $("speech"); sp.className = "speech seam-speech";
    var tr = Games.Trail(sp, {
      words: head, rung: 4, given: ["…"].concat(tail), scroller: $("sess-body"),
      onWord: function (k) { lanternGlow(0.4 + (k + 1) / head.length * 0.6); },
      onDone: function (st) {
        letters(null);
        var ok = st.peeks === 0 && st.ratio >= 0.9;
        var res = QF.record(sm.id, { kind: "seam", ok: ok, rung: 4, peeks: st.peeks, misses: st.misses, ratio: st.ratio }) || {};
        if (res.window) msg("Set by the window for tomorrow.", "soft");
        else if (ok) { jumpMini(); if (window.Juice) Juice.step(); msg(res.newlyLit ? "Joined. The two lanterns are strung together." : "Joined.", "warm"); }
        else msg("That join will come round again.", "soft");
        i++;
        actions([{ label: "Go on", cls: "primary", fn: one, enter: true }]);
      }
    });
    S.trail = tr;
    letters(function (ch) { tr.key(ch); });
    actions([{ label: "Peek", fn: function () { tr.peek(); } }]);
  }
  one();
}

/* ---- the night walk: a whole stretch from titles alone, with a prompter ---- */
function runWalk(ids) {
  var i = 0, lines = 0, peeks = 0;
  function one() {
    if (i >= ids.length) {
      letters(null);
      try { QF.recordRun({ ids: ids, lines: lines, peeks: peeks }); } catch (e) {}
      nextStep();
      return;
    }
    var L = lanternOf(ids[i]), moved = false;
    function go() { if (moved) return; moved = true; letters(null); i++; one(); }
    var words = Games.displayWords(L.text, L.words);
    sheet({ kicker: kickerFor(L) + "  (" + (i + 1) + " of " + ids.length + ")", title: L.title, hinge: hingeFor(L), cls: "walk", glow: 1 });
    hideRungs();
    msg(i === 0 ? "A rehearsal. Say it aloud as you go; type the first letters if you like. “Line!” gives you the next two words." : "");
    var sp = $("speech"); sp.className = "speech";
    var tr = Games.Trail(sp, {
      words: words, rung: 4, scroller: $("sess-body"),
      onDone: function () {
        letters(null);
        if (window.Juice) Juice.step();
        var here = S;
        setTimeout(function () { if (S && S === here && S.steps[S.k] && S.steps[S.k].kind === "walk") go(); }, 650);
      }
    });
    S.trail = tr;
    letters(function (ch) { tr.key(ch); });
    actions([
      { label: "Line!", fn: function () { lines++; tr.line(2); } },
      { label: i === ids.length - 1 ? "Finish the walk" : "Next lantern", cls: "primary", enter: true, fn: function () {
        if (moved) return;
        if (!tr.done) { var left = words.length - tr.pos; lines += Math.ceil(left / 2); }
        go();
      } }
    ]);
  }
  one();
}

/* ---- close: back to the road, where the new posts catch ---- */
var closing = null;
function closeSession() {
  var lit = S ? S.newlyLit.slice() : [], shone = S ? S.newlyShining.slice() : [];
  S = null;
  sessionActive = false;
  showHome();
  var plan = hasQF() ? QF.preview(1) : { fresh: [], cold: [] };
  var tease = window.Scene ? Scene.teaser(plan.fresh) : "";
  if (!tease) tease = plan.cold && plan.cold.length ? "Tomorrow: a walk past the lanterns you lit tonight." : "Tomorrow: the lanterns will be waiting.";
  var lede;
  if (lit.length) {
    var Ls = lit.map(lanternOf);
    lede = lit.length === 1 ? "Lantern " + Ls[0].n + " is lit." : cap(numberWord(lit.length)) + " new lanterns burn on the road tonight.";
  } else if (shone.length) lede = shone.length === 1 ? "Lantern " + lanternOf(shone[0]).n + " is shining." : cap(numberWord(shone.length)) + " lanterns are shining now.";
  else lede = "The lanterns you lit are still burning.";
  $("home-placard").hidden = true;
  $("close-placard").hidden = false;
  $("close-lede").textContent = lede;
  $("close-tease").textContent = tease;
  document.body.classList.add("closing");
  if (window.Scene) {
    var st = lanternStatus([]);
    lit.forEach(function (id) { if (st[id]) st[id].lit = false; });
    Scene.update(st);
    closing = { ids: lit.slice(), timers: [] };
    lit.slice(0, 3).forEach(function (id, n) {
      closing.timers.push(setTimeout(function () {
        if (window.Juice) { Juice.whoomp(); if (n === Math.min(lit.length, 3) - 1) setTimeout(Juice.bell, 380); }
        Scene.ignite(id);
      }, 450 + n * 650));
    });
    if (!lit.length && shone.length && window.Juice) setTimeout(Juice.bell, 400);
    closing.timers.push(setTimeout(endSpectacle, 450 + Math.min(3, lit.length) * 650 + 1900));
  }
}
function endSpectacle() {
  if (!closing) return;
  closing.timers.forEach(clearTimeout);
  closing = null;
  if (window.Scene) { if (Scene.ignite.skip) Scene.ignite.skip(); Scene.update(lanternStatus([])); }
}
function finishClose() {
  endSpectacle();
  document.body.classList.remove("closing");
  showHome();
}

/* ---------- the path ---------- */
function showPath() {
  stopVoice();
  if (!getActiveProfile()) { showProfiles(); return; }
  showScreen("screen-path");
  var box = $("path-list"); if (!box || !hasQF()) return;
  var html = "";
  QF.movements().forEach(function (m) {
    html += "<section class='mv-group'><h2><span class='mv-num'>" + ["", "I", "II", "III"][m.n] + "</span> " + esc(m.name) + "</h2><ol>";
    m.ids.forEach(function (id) {
      var L = lanternOf(id), it = QF.item(id) || {};
      var state = it.shining ? "Shining" : (it.lit ? "Lit" : (it.st >= 1 ? "Practising" : "Ahead"));
      if (it.byWindow) state = "By the window";
      var known = it.st >= 1 || it.lit;
      html += "<li class='station s-" + state.toLowerCase().replace(/\s+/g, "-") + "'>" +
        "<button " + (known ? "" : "disabled ") + "onclick=\"practiceLantern('" + id + "')\">" +
        "<span class='st-n'>" + L.n + "</span>" +
        "<span class='st-body'><span class='st-title'>" + esc(L.title) + "</span>" +
        "<span class='st-place'>" + esc(L.station) + "</span></span>" +
        "<span class='st-state'>" + state + "</span></button></li>";
    });
    html += "</ol></section>";
  });
  box.innerHTML = html;
  if (window.Aids) Aids.path(box); /* memory aids hook: station pictures, Field Notes, Word Detective, cue card */
}

/* ---------- grown-ups ---------- */
function prettyDay(s) {
  if (!s) return "Not yet";
  var p = String(s).split("-");
  var d = new Date(+p[0], +p[1] - 1, +p[2], 12);
  if (isNaN(d)) return s;
  var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var t = hasQF() ? QF.today() : "";
  if (s === t) return "Today";
  if (hasQF() && QF.addDays && QF.addDays(s, 1) === t) return "Yesterday";
  return days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()];
}
function showParent() { stopVoice(); showScreen("screen-parent"); paintParent(); }
function paintParent() {
  var p = getActiveProfile();
  $("parent-name").textContent = p ? p.name : "Progress";
  var sum = hasQF() ? QF.summary() : { lit: 0, shining: 0, lanterns: 18, seamsDone: 0, of: 17, runs: 0 };
  var f = (p && store.fun && store.fun[p.id] && store.fun[p.id].qf2) || {};
  var rows = [
    ["Lanterns lit", sum.lit + " of " + sum.lanterns],
    ["Lanterns shining", sum.shining + " of " + sum.lanterns],
    ["Seams joined", sum.seamsDone + "/" + sum.of],
    ["Full rehearsals", String(sum.runs || 0)],
    ["Last played", prettyDay(f.lastDay)]
  ];
  $("stats-list").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("");
  $("stats-note").textContent = "A lantern is lit after one clean recall from its title, and shining after a second on a later day, with sleep between. The Dedication opens when every lantern and seam is shining.";
  var link = $("preamble-link");
  if (link && p) {
    var q = "?u=" + encodeURIComponent(p.username || slugName(p.name)) + "&from=yomple" + (store.familyCode ? "&f=" + encodeURIComponent(store.familyCode) : "");
    link.href = "../field/" + q;
  }
  if (typeof paintFamilyPanel === "function") paintFamilyPanel();
  else { var fc = $("family-code-value"); if (fc) fc.textContent = store.familyCode || "—"; }
  paintSoundChip();
}

/* ---------- offline (sw.js): register, keep the voice warm, ask once for lasting storage ---------- */
function registerOffline() {
  try {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    if (/[?&]nosw\b/.test(location.search) || localStorage.getItem("qf2-no-sw") === "1") return;
    if (navigator.storage && navigator.storage.persist && !localStorage.getItem("qf2-persist")) {
      localStorage.setItem("qf2-persist", "1");
      navigator.storage.persist().catch(function () {});
    }
  } catch (e) { return; }
  navigator.serviceWorker.register("sw.js", { scope: "./" }).then(function () {
    return navigator.serviceWorker.ready;
  }).then(function (reg) {
    var v = (voiceOk() && FieldVoice.voice) ? FieldVoice.voice() : "rea";
    if (reg.active) reg.active.postMessage({ type: "warm", voice: v });
  }).catch(function () {});
}
window.addEventListener("load", registerOffline);

function reducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
}

/* ---------- boot ---------- */
(function boot() {
  try {
    wireInput();
    if (hasQF()) {
      QF.boot();
      QF.onReload(function () {
        if (document.body.getAttribute("data-screen") === "screen-home" && !closing) showHome();
      });
    }
    document.addEventListener("click", function (e) {
      if (closing && e.target && e.target.closest && e.target.closest("#screen-home") && !e.target.closest("button")) endSpectacle();
    });
    if (store.activeId && getActiveProfile()) showHome(); else showProfiles();
  } catch (e) {
    try { showProfiles(); } catch (e2) {}
  }
})();
