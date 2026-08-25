var SB_URL = "https://digcgqltrlmhgmzgmvwc.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZ2NncWx0cmxtaGdtemdtdndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODY4NjEsImV4cCI6MjA4OTE2Mjg2MX0.suxy0jXsIJqrJYbQuCc54sHbN5miCICxLUdOc9gUTkY";
var YOMPLE_SISTERS = ["hop_players","bloom_players","garden_players","star_players","field_players"];
var cloudTimer = null;
function sbHeaders(extra){
  var h = {apikey: SB_KEY, Authorization: "Bearer "+SB_KEY, "Content-Type": "application/json", Prefer: "return=representation"};
  if (extra) Object.keys(extra).forEach(function(k){ h[k] = extra[k]; });
  return h;
}
function cloudGetTable(table, username){
  return fetch(SB_URL+"/rest/v1/"+table+"?username=eq."+encodeURIComponent(username), { headers: sbHeaders() })
    .then(function(r){ return r.json(); })
    .then(function(rows){ return (rows && rows[0]) || null; })
    .catch(function(){ return null; });
}
function cloudGet(username){ return cloudGetTable(YOMPLE_TABLE, username); }
function findAnyYomplePerson(username){
  var chain = Promise.resolve(null);
  YOMPLE_SISTERS.forEach(function(table){
    chain = chain.then(function(found){
      if (found) return found;
      return cloudGetTable(table, username).then(function(row){
        return row ? { table: table, row: row } : null;
      });
    });
  });
  return chain;
}
function payloadForActive(){
  var p = (typeof getActiveProfile === "function") ? getActiveProfile() : (store.profiles||[]).find(function(x){ return x.id === store.activeId; });
  if (!p) return null;
  if (!p.username) p.username = slugName(p.name);
  var prog = (store.progress && store.progress[p.id]) || {};
  var fun = (store.fun && store.fun[p.id]) || {};
  return {username: p.username, display_name: p.name, avatar: p.avatar || "\ud83e\ude94", pin: p.pin || null, family_code: store.familyCode || null, progress: prog, fun: fun, updated_at: new Date().toISOString()};
}
function cloudSaveActive(){
  var body = payloadForActive();
  if (!body) return;
  fetch(SB_URL+"/rest/v1/"+YOMPLE_TABLE, {method: "POST", headers: sbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(body)}).catch(function(){});
}
function scheduleCloudSave(){ clearTimeout(cloudTimer); cloudTimer = setTimeout(cloudSaveActive, 700); }
if (typeof saveStore === "function") { var _save = saveStore; saveStore = function(){ _save(); scheduleCloudSave(); }; }
function adoptPerson(row, progress){
  var id = "u-"+row.username;
  var existing = (store.profiles||[]).find(function(p){ return p.id === id || p.username === row.username; });
  if (existing) { existing.name = row.display_name; existing.avatar = row.avatar; existing.username = row.username; existing.pin = row.pin || ""; id = existing.id; }
  else { store.profiles = store.profiles || []; store.profiles.push({ id:id, name:row.display_name, avatar:row.avatar, username:row.username, pin:row.pin||"", created: Date.now() }); }
  store.activeId = id;
  if (!store.progress) store.progress = {};
  store.progress[id] = progress || store.progress[id] || {};
  if (!store.fun) store.fun = {};
  store.fun[id] = row.fun || store.fun[id] || {};
  if (row.family_code) store.familyCode = row.family_code;
  if (typeof saveStore === "function") saveStore(); else localStorage.setItem(YOMPLE_STORE, JSON.stringify(store));
  return id;
}
function applyCloudRow(row){ adoptPerson(row, row.progress || {}); }
function findHall(){
  var input = document.getElementById("find-user");
  var username = slugName(input && input.value);
  if (!username || username === "player") { toast("Type the saved player name"); return; }
  toast("Looking for "+username+"\u2026");
  findAnyYomplePerson(username).then(function(hit){
    if (!hit) { toast("No Yomple player with that name yet"); return; }
    var row = hit.row;
    if (row.pin) { var pin = window.prompt("PIN for "+row.display_name); if (pin !== row.pin) { toast("PIN did not match"); return; } }
    if (row.family_code) store.familyCode = row.family_code;
    if (hit.table === YOMPLE_TABLE) applyCloudRow(row);
    else { adoptPerson(row, {}); seedIntroduced(); cloudSaveActive(); }
    toast("Welcome back, "+row.display_name);
    setTimeout(showHome, 400);
  });
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
  fetch(SB_URL+"/rest/v1/hop_families", {method: "POST", headers: sbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify({family_code: store.familyCode, parent_email: store.parentEmail || null, updated_at: new Date().toISOString()})}).catch(function(){});
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
  store.parentEmail = em; ensureFamily(); saveStore(); upsertFamilyRow();
  toast("Parent email saved for this household");
}
function emailCodeToMyself(){
  ensureFamily();
  var em = (document.getElementById("parent-email") && document.getElementById("parent-email").value || store.parentEmail || "").trim();
  var kids = (store.profiles||[]).map(function(p){ return p.name; }).join(", ") || "(no players yet)";
  var body = "Quiet Field / Yomple family code:\n\n"+store.familyCode+"\n\nPlayers: "+kids+"\n\nOn a new device: Parent recovery \u2192 type this code. Do not share it with the kids.";
  window.location.href = "mailto:"+encodeURIComponent(em)+"?subject="+encodeURIComponent("Our Quiet Field family code")+"&body="+encodeURIComponent(body);
}
function sendEmailOtp(){
  var em = (document.getElementById("recover-email") && document.getElementById("recover-email").value || "").trim().toLowerCase();
  if (!em || em.indexOf("@") < 1) { toast("Type the parent email"); return; }
  toast("Sending a one-time code\u2026");
  fetch(SB_URL+"/auth/v1/otp", {method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer "+SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: em, create_user: true })})
    .then(function(r){ if (!r.ok) throw new Error("otp"); document.getElementById("otp-row").style.display = "block"; toast("Check that inbox for a 6-digit code"); })
    .catch(function(){ toast("Inbox send did not go through. Email the family code to yourself from Parent / Progress instead."); });
}
function verifyEmailOtp(){
  var em = (document.getElementById("recover-email") && document.getElementById("recover-email").value || "").trim().toLowerCase();
  var token = (document.getElementById("recover-otp") && document.getElementById("recover-otp").value || "").trim();
  if (!token) { toast("Type the code from the email"); return; }
  fetch(SB_URL+"/auth/v1/verify", {method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer "+SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ type: "email", email: em, token: token })})
    .then(function(r){ return r.json(); }).then(function(auth){
      if (!auth || auth.error || (!auth.access_token && !auth.token)) throw new Error("bad otp");
      return fetch(SB_URL+"/rest/v1/hop_families?parent_email=eq."+encodeURIComponent(em), { headers: sbHeaders() }).then(function(r){ return r.json(); });
    }).then(function(rows){
      if (!rows || !rows.length) { toast("That email is not linked to a household yet. Open Parent / Progress on the old device and save the email."); return; }
      restoreFamily(rows[0].family_code);
    }).catch(function(){ toast("That code did not match. Try again, or use the family code from your self-email."); });
}
function restoreFamily(code){
  code = String(code || (document.getElementById("restore-code") && document.getElementById("restore-code").value) || "").trim().toUpperCase();
  if (!code || code.indexOf("-") < 0) { toast("Type the family code (like MAPLE-K7Q2)"); return; }
  store.familyCode = code;
  fetch(SB_URL+"/rest/v1/"+YOMPLE_TABLE+"?family_code=eq."+encodeURIComponent(code), { headers: sbHeaders() })
    .then(function(r){ return r.json(); })
    .then(function(rows){
      if (rows && rows.length) {
        rows.forEach(function(row, i){ applyCloudRow(row); if (i === 0) store.activeId = "u-"+row.username; });
        saveStore(); toast("Household restored \u2014 "+rows.length+" player"+(rows.length===1?"":"s")); setTimeout(showProfiles, 400); return;
      }
      return fetch(SB_URL+"/rest/v1/hop_players?family_code=eq."+encodeURIComponent(code), { headers: sbHeaders() })
        .then(function(r){ return r.json(); })
        .then(function(people){
          if (!people || !people.length) { saveStore(); toast("Code saved. Create the first player here."); return; }
          people.forEach(function(row){ adoptPerson(row, {}); });
          saveStore(); cloudSaveActive();
          toast("Same household. Progress for this world starts fresh.");
          setTimeout(showProfiles, 400);
        });
    });
}
function showRecover(){ showScreen("screen-recover"); }
if (typeof payloadForActive === "function") {
  var _payload = payloadForActive;
  payloadForActive = function(){ var body = _payload(); if (body) body.family_code = ensureFamily(); return body; };
}
if (store && store.profiles && store.profiles.length) ensureFamily();
