var Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
var voiceSupported = !!Reco;
var listening = false;
var rec = null;
function speakText(text, done){
  if (!window.speechSynthesis || (store.fun && getFun().mute)) { if (done) done(); return; }
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92; u.pitch = 1;
  u.onend = function(){ if (done) done(); };
  u.onerror = function(){ if (done) done(); };
  window.speechSynthesis.speak(u);
}
function stopSpeak(){ if (window.speechSynthesis) window.speechSynthesis.cancel(); }
function normalizeTalk(s){
  return String(s||"").toLowerCase().replace(/[\u2014\u2013]/g," ").replace(/cannot/g,"can not").replace(/battlefield/g,"battle field").replace(/battle-field/g,"battle field").replace(/fourscore/g,"four score").replace(/honour/g,"honor").replace(/[^a-z0-9\s]/g," ").replace(/\b(um|uh|er|ah|like)\b/g," ").replace(/\s+/g," ").trim();
}
var STOP = {a:1,an:1,the:1,and:1,or:1,to:1,of:1,in:1,on:1,for:1,that:1,this:1,it:1,is:1,are:1,we:1,our:1,as:1,so:1,be:1,by:1,from:1,here:1,who:1,which:1,have:1,has:1,not:1,nor:1,but:1,than:1};
function tokens(s){ return normalizeTalk(s).split(" ").filter(function(w){ return w && !STOP[w]; }); }
function scoreHeard(expected, heard){
  var exp = tokens(expected); var got = tokens(heard);
  if (!exp.length) return { ok:false, ratio:0 };
  var set = {}; got.forEach(function(w){ set[w]=1; });
  var hit = 0; exp.forEach(function(w){ if (set[w]) hit++; });
  var ratio = hit / exp.length;
  return { ok: ratio >= 0.7, ratio: ratio, hit: hit, need: exp.length };
}
function listenOnce(targetText, onResult){
  if (!voiceSupported) { onResult({ ok:false, heard:"", reason:"no-api" }); return; }
  stopListen();
  rec = new Reco(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 3;
  listening = true; var finalText = "";
  rec.onresult = function(ev){
    var t = "";
    for (var i=0;i<ev.results.length;i++){
      t += ev.results[i][0].transcript + " ";
      if (ev.results[i].isFinal) finalText = ev.results[i][0].transcript;
    }
    var live = document.getElementById("heard-box");
    if (live) live.textContent = "Heard: " + t.trim();
  };
  rec.onend = function(){
    listening = false;
    var heard = finalText || (document.getElementById("heard-box") && document.getElementById("heard-box").textContent.replace(/^Heard:\s*/,"")) || "";
    var sc = scoreHeard(targetText, heard); sc.heard = heard; onResult(sc);
  };
  rec.onerror = function(){ listening = false; onResult({ ok:false, heard:"", reason:"error" }); };
  try { rec.start(); } catch(e){ listening = false; onResult({ ok:false, heard:"", reason:"start" }); }
}
function stopListen(){ listening = false; if (rec) { try { rec.abort(); } catch(e){} rec = null; } }
