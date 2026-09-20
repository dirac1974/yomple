function hubPerson(){
  var q = new URLSearchParams(location.search);
  // `who`/`family` are the spellings the sister apps use; take them as well as the hub's own pair,
  // so a household code is never dropped just because it arrived under the other name.
  var u = (q.get("u") || q.get("who") || "").trim();
  if (u) return { u: u, f: (q.get("f") || q.get("family") || ""), from: q.get("from") };
  try {
    var hub = JSON.parse(localStorage.getItem("yomple-hub-v1") || "null");
    if (hub && hub.activeUser) return { u: hub.activeUser, f: hub.familyCode, from: "yomple" };
  } catch (e) {}
  return null;
}
function hideFieldFind(){
  var card = document.getElementById("find-card") || document.querySelector("#screen-profiles .card");
  if (card) card.style.display = "none";
}
function consumeYompleHandoff(){
  var who = hubPerson();
  if (!who || !who.u) return Promise.resolve(false);
  var raw = String(who.u).trim();
  var username = (typeof slugName==="function" ? slugName(raw) : raw.toLowerCase());
  var f = String(who.f || "").trim().toUpperCase();
  window.YOMPLE_HANDSHAKE = true;
  window.YOMPLE_FROM_HUB = true;
  if (f && f.indexOf("-") > 0) store.familyCode = f;
  hideFieldFind();
  function land(){
    if (typeof showHome === "function") showHome();
    // Freeze the sign-in into the address bar: a wiped phone reopening this link lands here again
    // instead of on the roster.
    if (window.YompleStay) window.YompleStay.arrived(username, store.familyCode);
    return true;
  }
  var local = (store.profiles||[]).find(function(p){
    return p.username === username || (typeof slugName==="function" && slugName(p.name)===username);
  });
  if (local) {
    store.activeId = local.id;
    if (typeof saveStore==="function") saveStore();
    return Promise.resolve(land());
  }
  var finder = (typeof findAnyYomplePerson==="function") ? findAnyYomplePerson(username) : Promise.resolve(null);
  return finder.then(function(hit){
    if (!hit || !hit.row) {
      if (typeof adoptPerson==="function") {
        adoptPerson({ username: username, display_name: raw, avatar: "\ud83e\ude94", family_code: store.familyCode || f }, {});
        if (typeof seedIntroduced==="function") seedIntroduced();
        if (typeof cloudSaveActive==="function") cloudSaveActive();
      }
      return land();
    }
    var claim = (typeof yompleClaim==="function") ? yompleClaim(hit.table, hit.row) : Promise.resolve(hit.row);
    return claim.then(function(row){
      if (!row) return land();
      if (hit.table === "field_players" && typeof applyCloudRow==="function") {
        applyCloudRow(row);
      } else if (typeof adoptPerson==="function") {
        adoptPerson(row, {});
        if (typeof seedIntroduced==="function") seedIntroduced();
        if (typeof cloudSaveActive==="function") cloudSaveActive();
      }
      return land();
    });
  }).catch(function(){
    if (typeof adoptPerson==="function") adoptPerson({ username: username, display_name: raw, family_code: store.familyCode || f }, {});
    return land();
  });
}
if (typeof showProfiles === "function") {
  var _showProfilesField = showProfiles;
  showProfiles = function(){
    _showProfilesField();
    if (window.YOMPLE_HANDSHAKE || window.YOMPLE_FROM_HUB) hideFieldFind();
  };
}
// Whoever is signed in, the address bar says so, so a bookmark or an Add to Home Screen icon taken
// at any moment comes back signed in. Stamping the same URL twice is a no-op.
if (typeof showHome === "function") {
  var _showHomeStay = showHome;
  showHome = function(){
    _showHomeStay();
    var me = typeof getActiveProfile === "function" ? getActiveProfile() : null;
    if (me && window.YompleStay) {
      window.YompleStay.stamp(me.username || (typeof slugName === "function" ? slugName(me.name) : ""), store.familyCode);
    }
  };
}
function startFieldHandoff(){
  consumeYompleHandoff();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFieldHandoff);
} else {
  startFieldHandoff();
}
