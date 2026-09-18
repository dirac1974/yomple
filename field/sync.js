var SB_URL = "https://digcgqltrlmhgmzgmvwc.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZ2NncWx0cmxtaGdtemdtdndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODY4NjEsImV4cCI6MjA4OTE2Mjg2MX0.suxy0jXsIJqrJYbQuCc54sHbN5miCICxLUdOc9gUTkY";
var YOMPLE_SISTERS = ["hop_players","bloom_players","garden_players","star_players","field_players"];
var cloudTimer = null;

function sbHeaders(extra){
  var h = {
    apikey: SB_KEY,
    Authorization: "Bearer "+SB_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
  if (extra) Object.keys(extra).forEach(function(k){ h[k] = extra[k]; });
  return h;
}
function sbRpc(fn, args, token){
  return fetch(SB_URL+"/rest/v1/rpc/"+fn, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: "Bearer "+(token || SB_KEY),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(args || {})
  }).then(function(r){ return r.ok ? r.json() : null; });
}
function cloudGetTable(table, username){
  return sbRpc("yomple_player_find", { p_table: table, p_username: username })
    .catch(function(){ return null; });
}
function cloudGet(username){ return cloudGetTable(YOMPLE_TABLE, username); }
function findAnyYomplePerson(username){
  return sbRpc("yomple_player_find_any", { p_username: username, p_prefer: YOMPLE_TABLE })
    .then(function(row){ return row ? { table: row.table, row: row } : null; })
    .catch(function(){ return null; });
}
/* Rows come back without a PIN. When one is set the PIN must be typed, and the
   server compares it; the typed PIN is then cached locally as before. */
function yompleClaim(table, row){
  if (!row) return Promise.resolve(null);
  if (!row.has_pin) return Promise.resolve(row);
  var typed = window.prompt("PIN for "+(row.display_name || row.username));
  if (!typed) return Promise.resolve(null);
  return sbRpc("yomple_player_claim", { p_table: table, p_username: row.username, p_pin: typed })
    .then(function(full){ if (full) full.pin = typed; return full; })
    .catch(function(){ return null; });
}
function payloadForActive(){
  var p = (typeof getActiveProfile === "function")
    ? getActiveProfile()
    : (store.profiles||[]).find(function(x){ return x.id === store.activeId; });
  if (!p) return null;
  if (!p.username) p.username = slugName(p.name);
  var prog = (store.progress && store.progress[p.id]) || {};
  var fun = (store.fun && store.fun[p.id]) || {};
  return {
    username: p.username,
    display_name: p.name,
    avatar: p.avatar || "\uD83E\uDE94",
    pin: p.pin || null,
    family_code: store.familyCode || null,
    progress: prog,
    fun: fun,
    updated_at: new Date().toISOString()
  };
}
function cloudSaveActive(){
  var body = payloadForActive();
  if (!body) return;
  sbRpc("yomple_player_upsert", {
    p_table: YOMPLE_TABLE,
    p_username: body.username,
    p_pin: body.pin || null,
    p_row: {
      display_name: body.display_name,
      avatar: body.avatar,
      family_code: body.family_code || null,
      progress: body.progress,
      fun: body.fun
    }
  }).catch(function(){});
}
function scheduleCloudSave(){
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(cloudSaveActive, 700);
}
if (typeof saveStore === "function") {
  var _save = saveStore;
  saveStore = function(){
    _save();
    scheduleCloudSave();
  };
}
function adoptPerson(row, progress){
  var id = "u-"+row.username;
  var existing = (store.profiles||[]).find(function(p){ return p.id === id || p.username === row.username; });
  if (existing) {
    existing.name = row.display_name;
    existing.avatar = row.avatar;
    existing.username = row.username;
    existing.pin = row.pin || existing.pin || "";
    id = existing.id;
  } else {
    store.profiles = store.profiles || [];
    store.profiles.push({ id:id, name:row.display_name, avatar:row.avatar, username:row.username, pin:row.pin||"", created: Date.now() });
  }
  store.activeId = id;
  if (!store.progress) store.progress = {};
  store.progress[id] = progress || store.progress[id] || {};
  if (!store.fun) store.fun = {};
  store.fun[id] = row.fun || store.fun[id] || {};
  if (row.family_code) store.familyCode = row.family_code;
  if (typeof saveStore === "function") saveStore();
  else localStorage.setItem(YOMPLE_STORE, JSON.stringify(store));
  return id;
}
function applyCloudRow(row){
  adoptPerson(row, row.progress || {});
}
function findHall(){
  var input = document.getElementById("find-user");
  var username = slugName(input && input.value);
  if (!username || username === "player") { toast("Type the saved player name"); return; }
  toast("Looking for "+username+"\u2026");
  findAnyYomplePerson(username).then(function(hit){
    if (!hit) { toast("No Yomple player with that name yet"); return; }
    return yompleClaim(hit.table, hit.row).then(function(row){
      if (!row) { toast("PIN did not match"); return; }
      if (row.family_code) store.familyCode = row.family_code;
      if (hit.table === YOMPLE_TABLE) {
        applyCloudRow(row);
      } else {
        adoptPerson(row, {});
        seedIntroduced();
        cloudSaveActive();
      }
      toast("Welcome back, "+row.display_name);
      setTimeout(showHome, 400);
    });
  }).catch(function(){ toast("Could not reach the household just now"); });
}

function ensureFamily(){
  if (!store.familyCode) {
    var words = ["OAK","MAPLE","PINE","CEDAR","ELM","BIRCH","WILLOW","ASPEN","LAUREL","HOLLY"];
    var chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    var tail = "";
    for (var i=0;i<4;i++) tail += chars.charAt(Math.floor(Math.random()*chars.length));
    store.familyCode = words[Math.floor(Math.random()*words.length)] + "-" + tail;
    if (typeof saveStore === "function") saveStore();
    upsertFamilyRow();
  }
  return store.familyCode;
}
function upsertFamilyRow(){
  if (!store.familyCode) return;
  sbRpc("yomple_family_upsert", {
    p_code: store.familyCode,
    p_email: store.parentEmail || null
  }).catch(function(){});
}
function paintFamilyPanel(){
  ensureFamily();
  var el = document.getElementById("family-code-value");
  if (el) el.textContent = store.familyCode;
  var em = document.getElementById("parent-email");
  if (em && store.parentEmail) em.value = store.parentEmail;
}
function saveParentEmail(){
  var em = (document.getElementById("parent-email") && document.getElementById("parent-email").value || "").trim().toLowerCase();
  if (!em || em.indexOf("@") < 1) { toast("Add a parent email first"); return; }
  store.parentEmail = em;
  ensureFamily();
  saveStore();
  upsertFamilyRow();
  toast("Parent email saved for this household");
}
function emailCodeToMyself(){
  ensureFamily();
  var em = (document.getElementById("parent-email") && document.getElementById("parent-email").value || store.parentEmail || "").trim();
  var kids = (store.profiles||[]).map(function(p){ return p.name; }).join(", ") || "(no players yet)";
  var body = "Quiet Field / Yomple family code:\n\n"+store.familyCode+"\n\nPlayers: "+kids+"\n\nOn a new device: Parent recovery \u2192 type this code. Do not share it with the kids.";
  var href = "mailto:"+encodeURIComponent(em)+"?subject="+encodeURIComponent("Our Quiet Field family code")+"&body="+encodeURIComponent(body);
  window.location.href = href;
}
function sendEmailOtp(){
  var em = (document.getElementById("recover-email") && document.getElementById("recover-email").value || "").trim().toLowerCase();
  if (!em || em.indexOf("@") < 1) { toast("Type the parent email"); return; }
  toast("Sending a one-time code\u2026");
  fetch(SB_URL+"/auth/v1/otp", {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: "Bearer "+SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: em, create_user: true })
  }).then(function(r){
    if (!r.ok) throw new Error("otp");
    document.getElementById("otp-row").style.display = "block";
    toast("Check that inbox for a 6-digit code");
  }).catch(function(){
    toast("Inbox send did not go through. Email the family code to yourself from Parent / Progress instead.");
  });
}
function verifyEmailOtp(){
  var em = (document.getElementById("recover-email") && document.getElementById("recover-email").value || "").trim().toLowerCase();
  var token = (document.getElementById("recover-otp") && document.getElementById("recover-otp").value || "").trim();
  if (!token) { toast("Type the code from the email"); return; }
  fetch(SB_URL+"/auth/v1/verify", {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: "Bearer "+SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "email", email: em, token: token })
  }).then(function(r){ return r.json(); }).then(function(auth){
    if (!auth || auth.error || (!auth.access_token && !auth.token)) throw new Error("bad otp");
    return sbRpc("yomple_family_by_email", {}, auth.access_token || auth.token);
  }).then(function(code){
    if (!code) {
      toast("That email is not linked to a household yet. Open Parent / Progress on the old device and save the email.");
      return;
    }
    restoreFamily(code);
  }).catch(function(){
    toast("That code did not match. Try again, or use the family code from your self-email.");
  });
}
function restoreFamily(code){
  code = String(code || (document.getElementById("restore-code") && document.getElementById("restore-code").value) || "").trim().toUpperCase();
  if (!code || code.indexOf("-") < 0) { toast("Type the family code (like MAPLE-K7Q2)"); return; }
  store.familyCode = code;
  // a PIN-protected player needs its PIN once per device, so this device can
  // keep saving that player's progress
  function adoptAll(rows, table, own){
    var chain = Promise.resolve();
    rows.forEach(function(row, i){
      chain = chain.then(function(){
        return yompleClaim(table, row).then(function(full){
          if (own) applyCloudRow(full || row);
          else adoptPerson(full || row, {});
          if (own && i === 0) store.activeId = "u-"+row.username;
        });
      });
    });
    return chain;
  }
  sbRpc("yomple_family_players", { p_code: code, p_table: YOMPLE_TABLE })
    .then(function(rows){
      if (rows && rows.length) {
        return adoptAll(rows, YOMPLE_TABLE, true).then(function(){
          saveStore();
          toast("Household restored \u2014 "+rows.length+" player"+(rows.length===1?"":"s"));
          setTimeout(showProfiles, 400);
        });
      }
      return sbRpc("yomple_family_players", { p_code: code, p_table: "hop_players" })
        .then(function(people){
          if (!people || !people.length) {
            saveStore();
            toast("Code saved. Create the first player here.");
            return;
          }
          return adoptAll(people, "hop_players", false).then(function(){
            saveStore();
            cloudSaveActive();
            toast("Same household. Progress for this world starts fresh.");
            setTimeout(showProfiles, 400);
          });
        });
    });
}
function showRecover(){
  showScreen("screen-recover");
  var nav = document.getElementById("main-nav");
  if (nav) nav.style.display = "none";
}

if (typeof payloadForActive === "function") {
  var _payload = payloadForActive;
  payloadForActive = function(){
    var body = _payload();
    if (body) body.family_code = ensureFamily();
    return body;
  };
}
if (typeof store !== "undefined" && store && store.profiles && store.profiles.length) ensureFamily();
