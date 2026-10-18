/* Quiet Field 2: the household store and the globals sync.js / arrive.js rely on.
   Classic script. app.js must not redefine anything here.

   field-next keeps its own localStorage key, quiet-field-v2. The first time it runs on a device it
   deep-copies quiet-field-v1 (the live /field/ app) so nobody loses a profile; it never writes v1. */
var YOMPLE_MODULE = "field", YOMPLE_TABLE = "field_players", YOMPLE_STORE = "quiet-field-v2";
var YOMPLE_STORE_V1 = "quiet-field-v1";
var SISTER_KEYS = ["presidents-palace-v2", "bloom.v1", "word-garden-v1", "star-map-v1", "quiet-field-v1"];
var store = { profiles: [], activeId: null, familyCode: "", parentEmail: "", progress: {}, fun: {}, lastFirst: false, cloudBase: {} };

function slugName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 18) || "player";
}
function freshStore() {
  return { profiles: [], activeId: null, familyCode: "", parentEmail: "", progress: {}, fun: {}, lastFirst: false, cloudBase: {} };
}
function readKey(key) {
  try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function loadStore() {
  var next = freshStore();
  var v2 = readKey(YOMPLE_STORE);
  var copiedV1 = false;
  if (!v2) {
    var v1 = readKey(YOMPLE_STORE_V1);
    if (v1) { v2 = JSON.parse(JSON.stringify(v1)); copiedV1 = true; }
  }
  if (v2) Object.keys(v2).forEach(function (k) { next[k] = v2[k]; });
  if (!next.profiles) next.profiles = [];
  if (!next.progress) next.progress = {};
  if (!next.fun) next.fun = {};
  if (!next.cloudBase) next.cloudBase = {};
  if (!next.familyCode) {
    for (var i = 0; i < SISTER_KEYS.length; i++) {
      var sib = readKey(SISTER_KEYS[i]);
      if (sib && sib.familyCode) { next.familyCode = sib.familyCode; break; }
    }
  }
  store = next;
  if (copiedV1) writeStore();
  return store;
}
function writeStore() {
  try { localStorage.setItem(YOMPLE_STORE, JSON.stringify(store)); return true; } catch (e) { return false; }
}
function saveStore() { writeStore(); }
function getActiveProfile() {
  return (store.profiles || []).find(function (p) { return p.id === store.activeId; }) || null;
}
function pid() { return store.activeId; }
function getProg() {
  if (!pid()) return {};
  if (!store.progress[pid()]) store.progress[pid()] = {};
  return store.progress[pid()];
}
function getFun() {
  if (!pid()) return { stars: 0, mute: false, topic: "gettysburg" };
  if (!store.fun[pid()]) store.fun[pid()] = { stars: 0, mute: false, questDay: "", questN: 0, topic: "gettysburg" };
  return store.fun[pid()];
}
loadStore();
