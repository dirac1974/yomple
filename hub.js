var SB_URL = "https://digcgqltrlmhgmzgmvwc.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZ2NncWx0cmxtaGdtemdtdndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODY4NjEsImV4cCI6MjA4OTE2Mjg2MX0.suxy0jXsIJqrJYbQuCc54sHbN5miCICxLUdOc9gUTkY";
var HUB_KEY = "yomple-hub-v1";
var SISTERS = ["hop_players","bloom_players","garden_players","star_players","field_players"];
var AVATARS = ["\ud83e\udd81","\ud83d\udc3b","\ud83e\udd8a","\ud83e\udd84","\ud83d\udc3c","\ud83d\udc38","\ud83d\udc27","\ud83c\udf1f","\ud83d\ude80","\ud83c\udf88"];
var hub = { familyCode: null, parentEmail: "", profiles: [], activeUser: null };

function slugName(s){
  return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,18) || "player";
}
function sbHeaders(extra){
  var h = { apikey: SB_KEY, Authorization: "Bearer "+SB_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
  if (extra) Object.keys(extra).forEach(function(k){ h[k] = extra[k]; });
  return h;
}
function loadHub(){
  try { var raw = JSON.parse(localStorage.getItem(HUB_KEY)||"null"); if (raw) hub = Object.assign(hub, raw); } catch(e){}
  if (!hub.profiles) hub.profiles = [];
  if (!hub.familyCode && typeof readSisterHousehold === "function") {
    var sis = readSisterHousehold();
    if (sis && sis.code) { hub.familyCode = sis.code; hub.parentEmail = sis.email || ""; }
  }
}
function saveHub(){ localStorage.setItem(HUB_KEY, JSON.stringify(hub)); paintWho(); paintLinks(); }
function active(){ return (hub.profiles||[]).find(function(p){ return p.username === hub.activeUser; }) || null; }
function ensureFamily(){
  if (!hub.familyCode) {
    hub.familyCode = (typeof mintYompleFamilyCode === "function") ? mintYompleFamilyCode() : "MAPLE-K7Q2";
    saveHub();
    upsertFamily();
  }
  return hub.familyCode;
}
function upsertFamily(){
  if (!hub.familyCode) return;
  fetch(SB_URL+"/rest/v1/hop_families", {
    method: "POST",
    headers: sbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ family_code: hub.familyCode, parent_email: hub.parentEmail || null, updated_at: new Date().toISOString() })
  }).catch(function(){});
}
function cloudGetTable(table, username){
  return fetch(SB_URL+"/rest/v1/"+table+"?username=eq."+encodeURIComponent(username), { headers: sbHeaders() })
    .then(function(r){ return r.json(); })
    .then(function(rows){ return (rows && rows[0]) || null; })
    .catch(function(){ return null; });
}
function findAny(username){
  var chain = Promise.resolve(null);
  SISTERS.forEach(function(table){
    chain = chain.then(function(found){
      if (found) return found;
      return cloudGetTable(table, username).then(function(row){ return row ? { table: table, row: row } : null; });
    });
  });
  return chain;
}
function adoptRow(row){
  var u = row.username;
  var existing = hub.profiles.find(function(p){ return p.username === u; });
  var person = { username: u, name: row.display_name || u, avatar: row.avatar || "\u2b50", pin: row.pin || "" };
  if (existing) Object.assign(existing, person);
  else hub.profiles.push(person);
  hub.activeUser = u;
  if (row.family_code) hub.familyCode = row.family_code;
  saveHub();
}
function worldQuery(){
  var p = active();
  if (!p) return "";
  var q = "?u="+encodeURIComponent(p.username);
  if (hub.familyCode) q += "&f="+encodeURIComponent(hub.familyCode);
  return q;
}
function paintLinks(){
  var q = worldQuery();
  document.querySelectorAll("a.app[data-base]").forEach(function(a){
    a.href = a.getAttribute("data-base") + q;
  });
}
function paintWho(){
  var el = document.getElementById("who-pill");
  if (!el) return;
  var p = active();
  el.textContent = p ? (p.avatar+" "+p.name) : "Who?";
}
function openWho(tab){
  document.getElementById("who-sheet").classList.add("open");
  showWhoTab(tab || "kids");
  paintKids();
  var code = document.getElementById("hub-code");
  if (code) code.textContent = hub.familyCode || "—";
  var em = document.getElementById("hub-email");
  if (em && hub.parentEmail) em.value = hub.parentEmail;
}
function closeWho(){ document.getElementById("who-sheet").classList.remove("open"); }
function showWhoTab(tab){
  document.getElementById("who-kids").style.display = tab==="kids" ? "block" : "none";
  document.getElementById("who-new").style.display = tab==="new" ? "block" : "none";
  document.getElementById("who-parent").style.display = tab==="parent" ? "block" : "none";
}
function paintKids(){
  var grid = document.getElementById("who-grid");
  grid.innerHTML = "";
  hub.profiles.forEach(function(p){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "face" + (p.username===hub.activeUser ? " on" : "");
    b.innerHTML = "<span>"+p.avatar+"</span>"+p.name;
    b.onclick = function(){ hub.activeUser = p.username; saveHub(); closeWho(); };
    grid.appendChild(b);
  });
}
function hubFind(){
  var username = slugName(document.getElementById("hub-find").value);
  if (!username || username==="player") { ping("Type a name"); return; }
  ping("Looking…");
  findAny(username).then(function(hit){
    if (!hit) { ping("No Yomple player with that name yet"); return; }
    var row = hit.row;
    if (row.pin) {
      var pin = window.prompt("PIN for "+row.display_name);
      if (pin !== row.pin) { ping("PIN did not match"); return; }
    }
    adoptRow(row);
    ping("Hi, "+row.display_name);
    closeWho();
  });
}
function hubCreate(){
  var name = (document.getElementById("hub-name").value||"").trim() || "Player";
  var pin = (document.getElementById("hub-pin").value||"").trim();
  var avatar = document.getElementById("hub-avs").dataset.selected || AVATARS[0];
  var username = slugName(name);
  ping("Checking that name…");
  findAny(username).then(function(hit){
    if (hit) {
      ping("That name is already in Yomple. Use Find.");
      showWhoTab("kids");
      return;
    }
    ensureFamily();
    hub.profiles.push({ username: username, name: name, avatar: avatar, pin: pin });
    hub.activeUser = username;
    saveHub();
    ping("Welcome, "+name);
    closeWho();
  });
}
function hubSaveEmail(){
  var em = (document.getElementById("hub-email").value||"").trim().toLowerCase();
  if (!em || em.indexOf("@")<1) { ping("Add a parent email"); return; }
  hub.parentEmail = em;
  ensureFamily();
  saveHub();
  upsertFamily();
  ping("Email saved");
}
function hubEmailCode(){
  ensureFamily();
  var em = (document.getElementById("hub-email").value||hub.parentEmail||"").trim();
  var kids = hub.profiles.map(function(p){ return p.name; }).join(", ") || "(none yet)";
  var body = "Yomple family code:\n\n"+hub.familyCode+"\n\nKids: "+kids+"\n\nOn a new device open Who? then Parent and type this code.";
  location.href = "mailto:"+encodeURIComponent(em)+"?subject="+encodeURIComponent("Our Yomple family code")+"&body="+encodeURIComponent(body);
}
function hubRestore(){
  var code = (document.getElementById("hub-restore").value||"").trim().toUpperCase();
  if (!code || code.indexOf("-")<0) { ping("Type MAPLE-K7Q2"); return; }
  ping("Finding household…");
  var chain = Promise.resolve([]);
  SISTERS.forEach(function(table){
    chain = chain.then(function(all){
      return fetch(SB_URL+"/rest/v1/"+table+"?family_code=eq."+encodeURIComponent(code), { headers: sbHeaders() })
        .then(function(r){ return r.json(); })
        .then(function(rows){ return all.concat(rows||[]); })
        .catch(function(){ return all; });
    });
  });
  chain.then(function(rows){
    hub.familyCode = code;
    var seen = {};
    rows.forEach(function(row){
      if (!row.username || seen[row.username]) return;
      seen[row.username] = true;
      adoptRow(row);
    });
    hub.familyCode = code;
    saveHub();
    upsertFamily();
    ping(Object.keys(seen).length ? "Household restored" : "Code saved. Add a kid.");
    showWhoTab("kids");
    paintKids();
  });
}
function ping(msg){
  var t = document.getElementById("hub-toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function(){ t.classList.remove("show"); }, 2200);
}
function paintAvatars(){
  var box = document.getElementById("hub-avs");
  box.innerHTML = "";
  box.dataset.selected = AVATARS[0];
  AVATARS.forEach(function(a){
    var s = document.createElement("span");
    s.textContent = a;
    if (a===AVATARS[0]) s.classList.add("sel");
    s.onclick = function(){
      box.dataset.selected = a;
      box.querySelectorAll("span").forEach(function(x){ x.classList.remove("sel"); });
      s.classList.add("sel");
    };
    box.appendChild(s);
  });
}
loadHub();
document.addEventListener("DOMContentLoaded", function(){
  paintWho();
  paintLinks();
  paintAvatars();
  if (!hub.activeUser) openWho("kids");
});
