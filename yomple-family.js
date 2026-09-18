/* Shared Yomple household helper. Copy into each module.
   Relies on: SB_URL, SB_KEY, sbHeaders(), store-or-DB with familyCode + parentEmail. */
var YOMPLE_WORDS = ["OAK","MAPLE","PINE","CEDAR","ELM","BIRCH","WILLOW","ASPEN","LAUREL","HOLLY"];
var YOMPLE_TAIL = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function yompleSlug(s){
  return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,18) || "player";
}
function isYompleFamilyCode(c){ return /^[A-Z]+-[A-Z0-9]{4}$/.test(String(c||"").toUpperCase()); }
function mintYompleFamilyCode(){
  var tail = "";
  for (var i=0;i<4;i++) tail += YOMPLE_TAIL.charAt(Math.floor(Math.random()*YOMPLE_TAIL.length));
  return YOMPLE_WORDS[Math.floor(Math.random()*YOMPLE_WORDS.length)] + "-" + tail;
}
function readSisterHousehold(){
  var keys = ["presidents-palace-v2","bloom.v1","word-garden-v1"];
  for (var i=0;i<keys.length;i++){
    try {
      var raw = JSON.parse(localStorage.getItem(keys[i]) || "null");
      if (!raw) continue;
      var code = raw.familyCode || (raw.settings && raw.settings.familyCode);
      var email = raw.parentEmail || (raw.settings && raw.settings.parentEmail);
      if (code) return { code: String(code).toUpperCase(), email: (email||"").toLowerCase() };
    } catch (e) {}
  }
  return null;
}
function upsertHopFamily(code, email){
  if (!code || typeof sbRpc !== "function") return;
  sbRpc("yomple_family_upsert", { p_code: code, p_email: email || null }).catch(function(){});
}
