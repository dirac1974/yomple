var SB_URL = "https://digcgqltrlmhgmzgmvwc.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZ2NncWx0cmxtaGdtemdtdndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODY4NjEsImV4cCI6MjA4OTE2Mjg2MX0.suxy0jXsIJqrJYbQuCc54sHbN5miCICxLUdOc9gUTkY";
var HUB_KEY = "yomple-hub-v1";
var ADMIN_EMAIL = "davidstucke@gmail.com";
var SISTERS = ["hop_players","bloom_players","garden_players","star_players","field_players"];
var AVATARS = ["\ud83e\udd81","\ud83d\udc3b","\ud83e\udd8a","\ud83e\udd84","\ud83d\udc3c","\ud83d\udc38","\ud83d\udc27","\ud83c\udf1f","\ud83d\ude80","\ud83c\udf88"];
var hub = { familyCode: null, parentEmail: "", profiles: [], activeUser: null };
var pendingWorld = null;
var pendingFind = null;

function slugName(s){
  return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,18) || "player";
}
function sbHeaders(extra){
  var h = { apikey: SB_KEY, Authorization: "Bearer "+SB_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
  if (extra) Object.keys(extra).forEach(function(k){ h[k] = extra[k]; });
  return h;
}
/* Every table is closed to this key; the hub talks to the yomple_* functions,
   which check PINs server side and never hand a PIN back. */
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
  sbRpc("yomple_family_upsert", { p_code: hub.familyCode, p_email: hub.parentEmail || null }).catch(function(){});
}
function cloudGetTable(table, username){
  return sbRpc("yomple_player_find", { p_table: table, p_username: username })
    .catch(function(){ return null; });
}
function findAny(username){
  // the household is tried first, then every world, as before
  return sbRpc("yomple_player_search", { p_query: username, p_family: hub.familyCode || null })
    .then(function(rows){
      var row = rows && rows[0];
      return row ? { table: row.table, row: row } : null;
    })
    .catch(function(){ return null; });
}
function adoptRow(row){
  var u = row.username;
  var existing = hub.profiles.find(function(p){ return p.username === u; });
  var person = {
    username: u,
    name: row.display_name || u,
    avatar: row.avatar || "\u2b50",
    pin: row.pin || (existing && existing.pin) || "",
    hasPin: !!row.has_pin
  };
  if (existing) Object.assign(existing, person);
  else hub.profiles.push(person);
  hub.activeUser = u;
  if (row.family_code) hub.familyCode = row.family_code;
  saveHub();
}
function worldQuery(){
  var p = active();
  if (!p) return "";
  var q = "?u="+encodeURIComponent(p.username)+"&from=yomple";
  if (hub.familyCode) q += "&f="+encodeURIComponent(hub.familyCode);
  return q;
}
var SHOCKMATE_BASE = "https://dirac1974.github.io/shockmate/";
/* Shockmate keys its family on this household code but lives on another origin, so it cannot read
   it from here: the link carries it as ?family=CODE, the same shape as Shockmate's own share link. */
function worldUrl(base){
  var q = worldQuery();
  if (base === SHOCKMATE_BASE && hub.familyCode) q += (q ? "&" : "?") + "family=" + encodeURIComponent(hub.familyCode);
  return (base || "") + q;
}
function paintLinks(){
  document.querySelectorAll("a.app[data-base]").forEach(function(a){
    a.href = worldUrl(a.getAttribute("data-base"));
  });
}
function paintWho(){
  var el = document.getElementById("who-pill");
  if (!el) return;
  var p = active();
  el.textContent = p ? (p.avatar+" "+p.name) : "Who?";
}
function worldTitle(href){
  var a = document.querySelector('a.app[data-base="'+href+'"] h2');
  return (a && a.textContent) || "that world";
}
function goPending(){
  paintLinks();
  if (!pendingWorld || !active()) { closeWho(); return; }
  var url = worldUrl(pendingWorld);
  pendingWorld = null;
  closeWho();
  location.href = url;
}
function gateWorld(ev){
  var a = ev.target.closest("a.app");
  if (!a) return;
  var base = a.getAttribute("data-base") || a.getAttribute("href");
  if (active()) {
    a.href = worldUrl(base);
    return;
  }
  ev.preventDefault();
  pendingWorld = base;
  ping("Choose who is playing first");
  openWho("kids");
  var h = document.querySelector("#who-kids h2");
  if (h) h.textContent = "Who is opening " + worldTitle(base) + "?";
}
function ensureFindPin(){
  if (document.getElementById("hub-find-pin")) return;
  var find = document.getElementById("hub-find");
  if (!find || !find.parentNode) return;
  var lab = document.createElement("label");
  lab.id = "hub-find-pin-lab";
  lab.textContent = "PIN (only if this name has one)";
  lab.style.display = "none";
  var inp = document.createElement("input");
  inp.id = "hub-find-pin";
  inp.type = "password";
  inp.inputMode = "numeric";
  inp.maxLength = 6;
  inp.placeholder = "PIN";
  inp.style.display = "none";
  find.parentNode.insertBefore(lab, find.nextSibling);
  find.parentNode.insertBefore(inp, lab.nextSibling);
}
function openWho(tab){
  document.getElementById("who-sheet").classList.add("open");
  ensureFindPin();
  showWhoTab(tab || "kids");
  paintKids();
  paintHouse();
  var code = document.getElementById("hub-code");
  if (code) code.textContent = hub.familyCode || "\u2014";
  var em = document.getElementById("hub-email");
  if (em && hub.parentEmail) em.value = hub.parentEmail;
}
function closeWho(){
  document.getElementById("who-sheet").classList.remove("open");
  var h = document.querySelector("#who-kids h2");
  if (h && !pendingWorld) h.textContent = "Who is playing?";
}
function showWhoTab(tab){
  document.getElementById("who-kids").style.display = tab==="kids" ? "block" : "none";
  document.getElementById("who-new").style.display = tab==="new" ? "block" : "none";
  document.getElementById("who-parent").style.display = tab==="parent" ? "block" : "none";
  if (tab==="parent") paintHouse();
}
function paintKids(){
  var grid = document.getElementById("who-grid");
  grid.innerHTML = "";
  hub.profiles.forEach(function(p){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "face" + (p.username===hub.activeUser ? " on" : "");
    b.innerHTML = "<span>"+p.avatar+"</span>"+p.name;
    b.onclick = function(){ hub.activeUser = p.username; saveHub(); goPending(); };
    grid.appendChild(b);
  });
}
function paintHouse(){
  var box = document.getElementById("hub-house");
  if (!box){
    var parent = document.getElementById("who-parent");
    if (!parent) return;
    var lab = document.createElement("label");
    lab.textContent = "Household players";
    box = document.createElement("div");
    box.id = "hub-house";
    parent.insertBefore(box, parent.querySelector(".row"));
    parent.insertBefore(lab, box);
  }
  box.innerHTML = "";
  if (!hub.profiles.length){
    box.innerHTML = "<p class='fine'>Restore the family code first, then unused names can be removed here.</p>";
    return;
  }
  hub.profiles.forEach(function(p){
    var row = document.createElement("div");
    row.className = "row";
    row.style.marginTop = "6px";
    row.innerHTML = "<span style='flex:1;font-weight:800'>"+p.avatar+" "+p.name+"</span>";
    var del = document.createElement("button");
    del.type = "button";
    del.textContent = "Remove";
    del.onclick = function(){ hubRemove(p.username, p.name); };
    row.appendChild(del);
    box.appendChild(row);
  });
}
function hubRemove(username, name){
  if (!username) return;
  if (!window.confirm("Remove "+name+" from this household? Progress for that name goes away.")) return;
  var prof = hub.profiles.find(function(p){ return p.username === username; });
  var pin = (prof && prof.pin) || "";
  if (prof && prof.hasPin && !pin) pin = (window.prompt("PIN for "+name) || "").trim();
  ping("Removing\u2026");
  var chain = Promise.resolve();
  SISTERS.forEach(function(table){
    chain = chain.then(function(){
      return sbRpc("yomple_player_delete", {
        p_table: table,
        p_username: username,
        p_pin: pin || null
      }).catch(function(){});
    });
  });
  chain.then(function(){
    hub.profiles = hub.profiles.filter(function(p){ return p.username !== username; });
    if (hub.activeUser === username) hub.activeUser = hub.profiles[0] ? hub.profiles[0].username : null;
    saveHub();
    paintKids();
    paintHouse();
    ping(name+" removed");
  });
}
function hubFind(){
  var typed = (document.getElementById("hub-find").value||"").trim();
  var username = slugName(typed);
  if (!username || username==="player") { ping("Type a name"); return; }
  var pinBox = document.getElementById("hub-find-pin");
  var pinLab = document.getElementById("hub-find-pin-lab");
  if (pendingFind && pendingFind.username === username && pendingFind.row && pendingFind.row.has_pin){
    var pin = pinBox ? (pinBox.value||"").trim() : "";
    sbRpc("yomple_player_claim", {
      p_table: pendingFind.row.table,
      p_username: pendingFind.row.username,
      p_pin: pin
    }).then(function(full){
      if (!full){ ping("PIN did not match"); return; }
      full.pin = pin;
      finishFind(full);
    });
    return;
  }
  ping("Looking\u2026");
  findAny(username).then(function(hit){
    if (!hit) { ping("No approved Yomple player with that name yet"); return; }
    var row = hit.row;
    if (row.has_pin) {
      pendingFind = { username: username, row: row };
      if (pinLab) pinLab.style.display = "block";
      if (pinBox){ pinBox.style.display = "block"; pinBox.focus(); }
      ping("Type the PIN, then Find again");
      return;
    }
    finishFind(row);
  });
}
function finishFind(row){
  pendingFind = null;
  adoptRow(row);
  ping("Hi, "+row.display_name);
  refreshHousehold(true);
  goPending();
}
function requestBody(){
  var name = (document.getElementById("hub-name").value||"").trim();
  var pin = (document.getElementById("hub-pin").value||"").trim();
  var contact = (document.getElementById("hub-contact") && document.getElementById("hub-contact").value || "").trim();
  var note = (document.getElementById("hub-note") && document.getElementById("hub-note").value || "").trim();
  var avatar = (document.getElementById("hub-avs") && document.getElementById("hub-avs").dataset.selected) || AVATARS[0];
  return { name: name, username: slugName(name), pin: pin, avatar: avatar, contact: contact, note: note, when: new Date().toISOString() };
}
function emailRequest(req){
  var body = "Yomple account request (approval needed)\n\nName: "+req.name+"\nUsername: "+req.username+"\n";
  var subject = "Yomple account request: " + (req.name || req.username);
  fetch("https://formsubmit.co/ajax/"+ADMIN_EMAIL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ _subject: subject, _template: "box", name: req.name, username: req.username, message: body })
  }).catch(function(){});
  location.href = "mailto:"+encodeURIComponent(ADMIN_EMAIL)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
}
function saveRequestCloud(req){
  return sbRpc("yomple_join_request", {
    p_payload: {
      username: req.username,
      display_name: req.name,
      avatar: req.avatar,
      pin: req.pin || null,
      contact_email: req.contact || null,
      note: req.note || null,
      when: req.when
    }
  }).catch(function(){ return null; });
}
function hubRequest(){
  var req = requestBody();
  if (!req.name || req.username==="player") { ping("Type the player name"); return; }
  ping("Checking that name\u2026");
  findAny(req.username).then(function(hit){
    if (hit) { ping("That name is already approved. Use Find."); showWhoTab("kids"); return; }
    ping("Sending the request to the administrator\u2026");
    return saveRequestCloud(req).then(function(){ emailRequest(req); ping("Requested. Wait for the administrator to approve."); showWhoTab("kids"); });
  });
}
function hubCreate(){ hubRequest(); }
function hubSaveEmail(){
  var em = (document.getElementById("hub-email").value||"").trim().toLowerCase();
  if (!em || em.indexOf("@")<1) { ping("Add a parent email"); return; }
  hub.parentEmail = em;
  ensureFamily(); saveHub(); upsertFamily(); ping("Email saved");
}
function hubEmailCode(){
  ensureFamily();
  var em = (document.getElementById("hub-email").value||hub.parentEmail||"").trim();
  var kids = hub.profiles.map(function(p){ return p.name; }).join(", ") || "(none yet)";
  var body = "Yomple family code:\n\n"+hub.familyCode+"\n\nKids: "+kids+"\n\nOn a new device open Who? then Parent and type this code.";
  location.href = "mailto:"+encodeURIComponent(em)+"?subject="+encodeURIComponent("Our Yomple family code")+"&body="+encodeURIComponent(body);
}
function refreshHousehold(quiet){
  if (!hub.familyCode) return Promise.resolve();
  var code = hub.familyCode;
  var chain = Promise.resolve([]);
  SISTERS.forEach(function(table){
    chain = chain.then(function(all){
      return sbRpc("yomple_family_players", { p_code: code, p_table: table })
        .then(function(rows){ return all.concat(rows||[]); })
        .catch(function(){ return all; });
    });
  });
  return chain.then(function(rows){
    var seen = {};
    var keepActive = hub.activeUser;
    rows.forEach(function(row){
      if (!row.username || seen[row.username]) return;
      seen[row.username] = true;
      var existing = hub.profiles.find(function(p){ return p.username === row.username; });
      var person = {
        username: row.username,
        name: row.display_name || row.username,
        avatar: row.avatar || "\u2b50",
        pin: (existing && existing.pin) || "",
        hasPin: !!row.has_pin
      };
      if (existing) Object.assign(existing, person);
      else hub.profiles.push(person);
    });
    if (keepActive) hub.activeUser = keepActive;
    hub.familyCode = code;
    saveHub(); paintKids(); paintHouse();
    if (!quiet && Object.keys(seen).length) ping("Household ready \u2014 pick a face");
  });
}
function hubRestore(){
  var code = (document.getElementById("hub-restore").value||"").trim().toUpperCase();
  if (!code || code.indexOf("-")<0) { ping("Type MAPLE-K7Q2"); return; }
  ping("Finding household\u2026");
  hub.familyCode = code;
  refreshHousehold(false).then(function(){ upsertFamily(); showWhoTab("kids"); });
}
function ping(msg){
  var t = document.getElementById("hub-toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function(){ t.classList.remove("show"); }, 2800);
}
function paintAvatars(){
  var box = document.getElementById("hub-avs");
  if (!box) return;
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
  ensureFindPin();
  document.querySelectorAll("a.app").forEach(function(a){ a.addEventListener("click", gateWorld); });
  var q = new URLSearchParams(location.search);
  if (q.get("request") === "1") openWho("new");
  if (hub.familyCode) refreshHousehold(true);
});
