/* Staying signed in on a phone — the same file in every Yomple app.

   A sign-in lives in localStorage, and on a phone localStorage is a loan. iOS clears a site's
   script-written storage after about a week without a visit; Private Browsing starts empty every
   time; and a link opened inside Messages, Instagram or Facebook runs in that app's own web view,
   with its own jar, thrown away when the sheet closes. The sign-in on the server is untouched the
   whole time — the phone simply forgets who it is and asks again.

   So the URL carries the sign-in too. After a successful sign-in the address becomes
   ?u=<username>&from=yomple&f=<CODE>, which costs nothing and which a bookmark — above all an Add
   to Home Screen icon, the only durable thing iOS gives a web app — freezes. Opening that icon on a
   wiped phone hands the app the name and the household code again, and the arrival path signs back
   in without asking for either.

   Nothing here blocks play, and nothing here is a guess: the storage test is a real write read back,
   and the browser is only ever called forgetful when its own user agent says it belongs to another
   app. */
(function (root) {
  "use strict";

  var IN_APP = /(FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|Twitter|MicroMessenger|WeChat|WhatsApp|Snapchat|Pinterest|LinkedInApp|TikTok|musical_ly|GSA\/)/i;
  var NOTE_KEY = "yomple-stay-note";
  var FORGETS = "This browser forgets logins. Open in Safari to stay signed in.";
  var ADD_HOME = "Add this to your Home Screen to stay signed in: tap Share, then Add to Home Screen.";

  // A write that does not read back is the honest test: storage can be blocked (it throws) or
  // accepted and quietly dropped.
  function storageWorks() {
    try {
      localStorage.setItem("yomple-probe", "1");
      var ok = localStorage.getItem("yomple-probe") === "1";
      localStorage.removeItem("yomple-probe");
      return ok;
    } catch (e) { return false; }
  }

  var ua = String(navigator.userAgent || "");
  // iPadOS calls itself Macintosh; the touch points give it away.
  var IOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  var facts = {
    ios: IOS,
    inApp: IN_APP.test(ua),
    storage: storageWorks(),
    // Real Safari on iOS sets navigator.standalone: false in a tab and true from a Home Screen icon.
    // An embedded web view leaves it undefined, which is the second way to spot one.
    standalone: navigator.standalone === true,
    canAddToHome: IOS && navigator.standalone === false && !IN_APP.test(ua)
  };

  function seen(id) {
    try { return localStorage.getItem(NOTE_KEY + ":" + id) === "1"; } catch (e) { return false; }
  }
  // Best effort: on a phone whose storage does not work the dismissal cannot be remembered either,
  // and a line that comes back is better than a sign-in that vanishes with no explanation.
  function remember(id) {
    try { localStorage.setItem(NOTE_KEY + ":" + id, "1"); } catch (e) {}
  }

  function note(id, text) {
    if (!text || seen(id) || document.getElementById("yomple-stay-note")) return;
    var bar = document.createElement("div");
    bar.id = "yomple-stay-note";
    bar.setAttribute("role", "status");
    bar.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;display:flex;" +
      "gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:#1f2430;color:#fff;" +
      "font:15px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.28)";
    var p = document.createElement("span");
    p.style.cssText = "flex:1";
    p.textContent = text;
    var x = document.createElement("button");
    x.type = "button";
    x.textContent = "got it";
    x.style.cssText = "flex:none;border:0;border-radius:10px;padding:6px 10px;background:#fff;color:#1f2430;font:inherit;font-weight:600";
    x.onclick = function () { remember(id); if (bar.parentNode) bar.parentNode.removeChild(bar); };
    bar.appendChild(p); bar.appendChild(x);
    (document.body || document.documentElement).appendChild(bar);
  }

  /* The URL becomes the sign-in. Called after the app knows who it is, so that whatever the parent
     pins or bookmarks from this moment on is already signed in. */
  function stamp(username, familyCode) {
    var u = String(username || "").trim();
    if (!u) return;
    try {
      var q = new URLSearchParams(location.search);
      q.set("u", u);
      q.set("from", "yomple");
      if (familyCode) q.set("f", String(familyCode).toUpperCase());
      else q.delete("f");
      var next = location.pathname + "?" + q.toString() + location.hash;
      if (next !== location.pathname + location.search + location.hash) {
        history.replaceState(null, "", next);
      }
    } catch (e) {}
  }

  // One call for the whole job at the moment a sign-in succeeds: freeze it into the URL, then say
  // the one useful thing about this browser, if there is one.
  function arrived(username, familyCode) {
    stamp(username, familyCode);
    if (!facts.storage || facts.inApp) return note("forgets", FORGETS);
    if (facts.canAddToHome) note("addhome", ADD_HOME);
  }

  function warnIfForgetful() {
    if (!facts.storage || facts.inApp) note("forgets", FORGETS);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", warnIfForgetful);
  else warnIfForgetful();

  root.YompleStay = { facts: facts, stamp: stamp, arrived: arrived, note: note, storageWorks: storageWorks };
})(typeof window !== "undefined" ? window : this);
