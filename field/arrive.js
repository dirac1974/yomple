function hubPerson(){
  var q = new URLSearchParams(location.search);
  if (q.get("u")) return { u: q.get("u"), f: q.get("f"), from: q.get("from") };
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
    if (hit && hit.table === "field_players" && typeof applyCloudRow==="function") {
      applyCloudRow(hit.row);
    } else if (hit && hit.row && typeof adoptPerson==="function") {
      adoptPerson(hit.row, {});
      if (typeof seedIntroduced==="function") seedIntroduced();
      if (typeof cloudSaveActive==="function") cloudSaveActive();
    } else if (typeof adoptPerson==="function") {
      adoptPerson({ username: username, display_name: raw, avatar: "\ud83e\ude94", family_code: store.familyCode || f }, {});
      if (typeof seedIntroduced==="function") seedIntroduced();
      if (typeof cloudSaveActive==="function") cloudSaveActive();
    }
    return land();
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
function startFieldHandoff(){
  consumeYompleHandoff();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFieldHandoff);
} else {
  startFieldHandoff();
}
