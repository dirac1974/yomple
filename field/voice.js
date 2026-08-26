var Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
var voiceSupported = !!Reco;
var listening = false;
var rec = null;
var lincolnVoice = null;
var voicesReady = false;
var fieldAudio = null;
var warmedPlayers = {};
var warmedBlobs = {};
var warmFetchStarted = {};

/* Human public-domain recitations. No original Lincoln voice exists.
   Gettysburg: Britton Rea. Preamble: Kristen McQuillin / LibriVox. */
var GETTYSBURG_SRC = "https://archive.org/download/GettysburgAddress/gettysburg_address.mp3";
var GETTYSBURG_SPAN = {
  p1:  { start: 0.08,  end: 14.20 },
  p2:  { start: 14.20, end: 24.80 },
  p3:  { start: 24.80, end: 28.12 },
  p4:  { start: 28.12, end: 36.40 },
  p5:  { start: 36.40, end: 40.50 },
  p6:  { start: 40.50, end: 48.40 },
  p7:  { start: 48.40, end: 56.30 },
  p8:  { start: 56.30, end: 65.40 },
  p9:  { start: 65.40, end: 74.50 },
  p10: { start: 74.50, end: 79.90 },
  p11: { start: 79.90, end: 87.50 },
  p12: { start: 87.50, end: 107.20 }
};
var PREAMBLE_SRC = "https://archive.org/download/constitution/constitution_article_01_64kb.mp3";
var PREAMBLE_SPAN = {
  p1: { start: 16.20, end: 18.16 },
  p2: { start: 18.16, end: 20.08 },
  p3: { start: 20.04, end: 23.20 },
  p4: { start: 23.20, end: 25.16 },
  p5: { start: 25.16, end: 26.68 },
  p6: { start: 26.58, end: 30.30 },
  p7: { start: 30.28, end: 35.10 }
};
var RECITE = {
  gettysburg: { src: GETTYSBURG_SRC, span: GETTYSBURG_SPAN },
  preamble:   { src: PREAMBLE_SRC,   span: PREAMBLE_SPAN }
};

function refreshVoices(){
  if (!window.speechSynthesis) return [];
  var voices = window.speechSynthesis.getVoices() || [];
  if (voices.length) {
    voicesReady = true;
    lincolnVoice = pickLincolnVoice(voices);
  }
  return voices;
}

function pickLincolnVoice(voices){
  if (!voices || !voices.length) return null;
  var score = function(v){
    var n = (v.name || "") + " " + (v.lang || "");
    var s = 0;
    if (/^en(-|_)?us/i.test(v.lang)) s += 8;
    else if (/^en/i.test(v.lang)) s += 5;
    else return -1;
    if (/daniel|alex|fred|ralph|aaron|bruce|tom|nathan|reed|gordon|arthur|james|david|mark/i.test(n)) s += 12;
    if (/male/i.test(n)) s += 6;
    if (/female|woman|girl|zira|samantha|karen|moira|tessa|veena|fiona/i.test(n)) s -= 10;
    if (/premium|enhanced|neural|natural/i.test(n)) s += 3;
    if (/compact/i.test(n)) s -= 1;
    return s;
  };
  var best = null, bestScore = -999;
  for (var i = 0; i < voices.length; i++) {
    var sc = score(voices[i]);
    if (sc > bestScore) { bestScore = sc; best = voices[i]; }
  }
  return bestScore >= 0 ? best : null;
}

if (window.speechSynthesis) {
  refreshVoices();
  if (typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  } else {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}

function soundOff(){
  return typeof getFun === "function" && getFun().mute;
}

function clearAudioHandlers(a){
  if (!a) return;
  try {
    a.onended = null;
    a.onerror = null;
    a.ontimeupdate = null;
    a.onloadedmetadata = null;
    a.oncanplay = null;
    a.onseeked = null;
    a.onplaying = null;
  } catch (e) {}
}

function stopFieldAudio(){
  if (!fieldAudio) return;
  try { fieldAudio.pause(); } catch (e) {}
  clearAudioHandlers(fieldAudio);
}

function playerFor(src){
  var a = warmedPlayers[src];
  if (a) return a;
  a = new Audio();
  a.preload = "auto";
  a.crossOrigin = "anonymous";
  a.src = warmedBlobs[src] || src;
  warmedPlayers[src] = a;
  try { a.load(); } catch (e) {}
  return a;
}

function fetchReciteBlob(src){
  if (!src || warmFetchStarted[src]) return;
  warmFetchStarted[src] = true;
  try {
    fetch(src, { mode: "cors", credentials: "omit", cache: "force-cache" })
      .then(function(res){ return res.ok ? res.blob() : Promise.reject(); })
      .then(function(blob){
        var url = URL.createObjectURL(blob);
        warmedBlobs[src] = url;
        var a = warmedPlayers[src];
        if (a && a.paused) {
          var t = a.currentTime || 0;
          a.src = url;
          try { a.load(); } catch (e) {}
          if (t > 0.05) {
            a.addEventListener("loadedmetadata", function once(){
              a.removeEventListener("loadedmetadata", once);
              try { a.currentTime = t; } catch (e2) {}
            });
          }
        }
      })
      .catch(function(){ warmFetchStarted[src] = false; });
  } catch (err) {
    warmFetchStarted[src] = false;
  }
}

function warmFieldVoice(topicKey){
  var keys = topicKey ? [topicKey] : Object.keys(RECITE);
  keys.forEach(function(id){
    var pack = RECITE[id];
    if (!pack || !pack.src) return;
    playerFor(pack.src);
    fetchReciteBlob(pack.src);
  });
}

function preseekLantern(phrase){
  if (!phrase) return;
  var topic = (typeof currentTopic === "function" && currentTopic()) || {};
  var pack = RECITE[topic.id] || RECITE.gettysburg;
  var span = pack && pack.span && phrase.id ? pack.span[phrase.id] : null;
  if (!pack || !span) return;
  var a = playerFor(pack.src);
  if (!a.paused) return;
  function seek(){
    try {
      if (Math.abs((a.currentTime || 0) - span.start) > 0.12) a.currentTime = span.start;
    } catch (e) {}
  }
  if (a.readyState >= 1) seek();
  else a.addEventListener("loadedmetadata", function once(){
    a.removeEventListener("loadedmetadata", once);
    seek();
  });
}

warmFieldVoice();
if (typeof document !== "undefined") {
  ["pointerdown", "touchstart", "click"].forEach(function(ev){
    document.addEventListener(ev, function(){ warmFieldVoice(); }, { passive: true });
  });
}

function stopSpeak(){
  stopFieldAudio();
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
}

function hearLantern(phrase, done){
  if (!phrase) { if (done) done(); return; }
  if (soundOff()) {
    if (typeof toast === "function") toast("Sound is off \u2014 tap the speaker chip");
    if (done) done();
    return;
  }
  var topic = (typeof currentTopic === "function" && currentTopic()) || {};
  var pack = RECITE[topic.id] || RECITE.gettysburg;
  var span = pack && pack.span && phrase.id ? pack.span[phrase.id] : null;
  if (span) {
    playRange(pack.src, span.start, span.end, done);
    return;
  }
  speakSynth(phrase.text || phrase, done);
}

function playRange(src, start, end, done){
  stopSpeak();
  fetchReciteBlob(src);
  var a = playerFor(src);
  fieldAudio = a;
  var finished = false;
  var token = (a._playToken = (a._playToken || 0) + 1);

  function finish(){
    if (finished) return;
    finished = true;
    if (fieldAudio === a) {
      try { a.pause(); } catch (e) {}
      clearAudioHandlers(a);
    }
    if (typeof currentPhrase !== "undefined") preseekLantern(currentPhrase);
    if (done) done();
  }

  a.onerror = function(){
    if (finished || a._playToken !== token) return;
    if (typeof toast === "function") toast("Could not reach the field voice. Trying the device voice.");
    speakSynth((typeof currentPhrase !== "undefined" && currentPhrase && currentPhrase.text) || "", done);
  };

  a.ontimeupdate = function(){
    if (finished || a._playToken !== token) return;
    if (end && a.currentTime >= end) finish();
  };
  a.onended = function(){
    if (a._playToken !== token) return;
    finish();
  };

  function startPlayback(){
    if (finished || a._playToken !== token) return;
    var playPromise = a.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function(){
        if (finished || a._playToken !== token) return;
        if (typeof toast === "function") toast("Tap Hear it once more");
        finish();
      });
    }
  }

  function seekThenPlay(){
    if (finished || a._playToken !== token) return;
    var already = Math.abs((a.currentTime || 0) - start) <= 0.12;
    if (already || start <= 0.05) {
      startPlayback();
      return;
    }
    var armed = false;
    function go(){
      if (armed || finished || a._playToken !== token) return;
      armed = true;
      startPlayback();
    }
    a.onseeked = go;
    try { a.currentTime = start; } catch (e) { startPlayback(); return; }
    setTimeout(go, 280);
  }

  if (a.readyState >= 2) {
    seekThenPlay();
  } else {
    a.onloadedmetadata = seekThenPlay;
    a.oncanplay = function(){
      if (a.paused && !finished && a._playToken === token) seekThenPlay();
    };
    try { a.load(); } catch (err) {}
  }

  var cap = Math.max(2000, ((end - start) + 1.5) * 1000);
  setTimeout(function(){ if (a._playToken === token) finish(); }, cap);
}

function speakText(text, done){
  if (text && typeof text === "object") {
    hearLantern(text, done);
    return;
  }
  if (typeof currentPhrase !== "undefined" && currentPhrase && currentPhrase.text === text) {
    hearLantern(currentPhrase, done);
    return;
  }
  speakSynth(text, done);
}

function speakSynth(text, done){
  if (!text) { if (done) done(); return; }
  if (soundOff()) {
    if (typeof toast === "function") toast("Sound is off \u2014 tap the speaker chip");
    if (done) done();
    return;
  }
  if (!window.speechSynthesis) {
    if (typeof toast === "function") toast("This device cannot read the line aloud");
    if (done) done();
    return;
  }

  stopFieldAudio();
  refreshVoices();
  try { window.speechSynthesis.cancel(); } catch (e) {}
  try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch (e2) {}

  var u = new SpeechSynthesisUtterance(String(text));
  u.lang = "en-US";
  u.rate = 0.84;
  u.pitch = 0.82;
  u.volume = 1;
  if (lincolnVoice) u.voice = lincolnVoice;

  var finished = false;
  function finish(){
    if (finished) return;
    finished = true;
    if (done) done();
  }
  u.onend = finish;
  u.onerror = finish;

  setTimeout(function(){
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
      setTimeout(function(){
        try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch (e3) {}
      }, 120);
    } catch (err) {
      if (typeof toast === "function") toast("Could not start the voice");
      finish();
    }
  }, 40);
}

function normalizeTalk(s){
  return String(s || "")
    .toLowerCase()
    .replace(/[\u2014\u2013]/g, " ")
    .replace(/cannot/g, "can not")
    .replace(/battlefield/g, "battle field")
    .replace(/battle-field/g, "battle field")
    .replace(/fourscore/g, "four score")
    .replace(/honour/g, "honor")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(um|uh|er|ah|like)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

var STOP = {a:1,an:1,the:1,and:1,or:1,to:1,of:1,in:1,on:1,for:1,that:1,this:1,it:1,is:1,are:1,we:1,our:1,as:1,so:1,be:1,by:1,from:1,here:1,who:1,which:1,have:1,has:1,not:1,nor:1,but:1,than:1};

function tokens(s){
  return normalizeTalk(s).split(" ").filter(function(w){ return w && !STOP[w]; });
}

function scoreHeard(expected, heard){
  var exp = tokens(expected);
  var got = tokens(heard);
  if (!exp.length) return { ok:false, ratio:0 };
  var set = {};
  got.forEach(function(w){ set[w] = 1; });
  var hit = 0;
  exp.forEach(function(w){ if (set[w]) hit++; });
  var ratio = hit / exp.length;
  return { ok: ratio >= 0.7, ratio: ratio, hit: hit, need: exp.length };
}

function listenOnce(targetText, onResult){
  if (!voiceSupported) { onResult({ ok:false, heard:"", reason:"no-api" }); return; }
  stopListen();
  rec = new Reco();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 3;
  if (rec.phrases) {
    try { rec.phrases = [targetText]; } catch (e) {}
  }
  listening = true;
  var finalText = "";
  rec.onresult = function(ev){
    var t = "";
    for (var i = 0; i < ev.results.length; i++) {
      t += ev.results[i][0].transcript + " ";
      if (ev.results[i].isFinal) finalText = ev.results[i][0].transcript;
    }
    var live = document.getElementById("heard-box");
    if (live) live.textContent = "Heard: " + t.trim();
  };
  rec.onend = function(){
    listening = false;
    var heard = finalText || (document.getElementById("heard-box") && document.getElementById("heard-box").textContent.replace(/^Heard:\s*/, "")) || "";
    var sc = scoreHeard(targetText, heard);
    sc.heard = heard;
    onResult(sc);
  };
  rec.onerror = function(){
    listening = false;
    onResult({ ok:false, heard:"", reason:"error" });
  };
  try { rec.start(); }
  catch (e) { listening = false; onResult({ ok:false, heard:"", reason:"start" }); }
}

function stopListen(){
  listening = false;
  if (rec) { try { rec.abort(); } catch (e) {} rec = null; }
}
