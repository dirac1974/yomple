/* Quiet Field 2: the service worker, scoped to /field-next/. It lets the walk go on with no
   network once it has been opened online.

   - Code and pages (HTML/JS/CSS, anything else of ours that is not audio): network first, so a new
     deploy arrives the moment she is online; the cached copy only when the network fails or stalls.
   - The voice (audio/<voice>/*.mp3 and timing.json): cache first. timing.json and all 19 clips of
     the current voice are fetched in the background after install, and again when the page asks
     (message {type:'warm', voice}); install never waits for audio.
   - Navigations (/field-next/?u=…&from=yomple&f=…) are matched without their query string.
   - Never touches another origin (Supabase, fonts, anything): those requests are not intercepted.
   - Range requests and non-GET requests pass straight through.

   Bump VERSION on every deploy: old caches are deleted on activate. */
"use strict";

var VERSION = "qf2-2026-10-18a";
var PREFIX = "qf2-";
var SHELL = PREFIX + "shell-" + VERSION;
var MEDIA = PREFIX + "media-" + VERSION;
var DEFAULT_VOICE = "rea";
var CLIPS = ["full"];
for (var n = 1; n <= 18; n++) CLIPS.push("g" + n);
/* The page's own files. index.html is also read at install for any script or stylesheet added
   later, so new modules are picked up without editing this list. */
var SHELL_FILES = ["./", "styles.css", "yomple-stay.js", "store.js", "lanterns.js", "memory.js", "voice.js",
  "scene.js", "games.js", "app.js", "sync.js", "arrive.js"];
var NET_TIMEOUT = 4000;

var scope = self.registration ? self.registration.scope : new URL("./", self.location.href).href;
function abs(p) { return new URL(p, scope).href; }

/* One key per file: no query string, and a directory's index.html is the directory itself. */
function keyFor(url) {
  var u = new URL(url, scope);
  u.search = ""; u.hash = "";
  if (/\/index\.html$/.test(u.pathname)) u.pathname = u.pathname.replace(/index\.html$/, "");
  return u.href;
}
function isMedia(url) {
  var u = new URL(url);
  return u.pathname.indexOf(new URL("audio/", scope).pathname) === 0;
}

/* A navigation response must not carry a redirect (Safari refuses it): copy it into a clean one. */
function clean(res) {
  if (!res || !res.redirected) return Promise.resolve(res);
  return res.blob().then(function (b) {
    return new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers });
  });
}
function cacheable(res) { return res && res.ok && res.status === 200 && res.type !== "opaque"; }

function precacheShell() {
  return caches.open(SHELL).then(function (cache) {
    return fetch(abs("./"), { cache: "reload" }).then(function (res) {
      if (!cacheable(res)) return SHELL_FILES;
      return clean(res.clone()).then(function (c) { return cache.put(keyFor(abs("./")), c); }).then(function () {
        return res.text();
      }).then(function (html) {
        var found = [], re = /(?:src|href)\s*=\s*["']([^"'#?]+\.(?:js|css))(?:\?[^"']*)?["']/gi, m;
        while ((m = re.exec(html))) if (!/^[a-z]+:|^\/\//i.test(m[1])) found.push(m[1]);
        return SHELL_FILES.slice(1).concat(found);
      });
    }).catch(function () { return SHELL_FILES; }).then(function (list) {
      var seen = {};
      return Promise.all(list.filter(function (p) {
        var k = keyFor(abs(p)); if (seen[k]) return false; seen[k] = 1; return true;
      }).map(function (p) {
        return fetch(abs(p), { cache: "reload" }).then(function (res) {
          if (cacheable(res)) return clean(res).then(function (c) { return cache.put(keyFor(abs(p)), c); });
        }).catch(function () { /* a missing file must not fail the install */ });
      }));
    });
  });
}

/* timing.json and every clip of one voice, skipping what is already there. */
function warmVoice(voice) {
  voice = String(voice || DEFAULT_VOICE).replace(/[^a-z0-9_-]/gi, "") || DEFAULT_VOICE;
  var files = ["timing.json"].concat(CLIPS.map(function (c) { return c + ".mp3"; }));
  return caches.open(MEDIA).then(function (cache) {
    /* one at a time: gentle on a phone connection, and the first clips are usable sooner */
    return files.reduce(function (p, f) {
      return p.then(function () {
        var url = abs("audio/" + voice + "/" + f);
        return cache.match(url).then(function (hit) {
          if (hit) return;
          return fetch(url).then(function (res) { if (cacheable(res)) return cache.put(url, res); }).catch(function () {});
        });
      });
    }, Promise.resolve());
  });
}

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(precacheShell());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf(PREFIX) === 0 && k !== SHELL && k !== MEDIA;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }).then(function () {
    /* the voice, in the background: activation does not wait for 2.6 MB */
    warmVoice(DEFAULT_VOICE);
  }));
});

self.addEventListener("message", function (event) {
  var d = event.data || {};
  if (d.type === "warm") {
    var p = warmVoice(d.voice);
    if (event.waitUntil) event.waitUntil(p);
  } else if (d.type === "version" && event.source && event.source.postMessage) {
    event.source.postMessage({ type: "version", version: VERSION });
  }
});

function networkFirst(req) {
  var key = keyFor(req.url);
  return caches.open(SHELL).then(function (cache) {
    var fromNet = fetch(req).then(function (res) {
      if (!cacheable(res)) return res;
      return clean(res).then(function (c) {
        cache.put(key, c.clone()).catch(function () {});
        return c;
      });
    });
    var fallback = function () {
      return cache.match(key).then(function (hit) {
        return hit || caches.match(req, { ignoreSearch: true });
      });
    };
    /* the network wins unless it fails, or stalls for NET_TIMEOUT while a cached copy is waiting */
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        fallback().then(function (hit) { if (hit && !settled) { settled = true; resolve(hit); } });
      }, NET_TIMEOUT);
      fromNet.then(function (res) {
        clearTimeout(timer);
        if (!settled) { settled = true; resolve(res); }
      }, function (err) {
        clearTimeout(timer);
        fallback().then(function (hit) {
          if (settled) return;
          settled = true;
          if (hit) resolve(hit); else reject(err);
        });
      });
    });
  });
}

function cacheFirst(req) {
  return caches.open(MEDIA).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (cacheable(res)) cache.put(keyFor(req.url), res.clone()).catch(function () {});
        return res;
      });
    });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;          /* Supabase and every other host: hands off */
  if (url.href.indexOf(scope) !== 0) return;
  if (req.headers.has("range")) return;
  if (isMedia(url.href)) { event.respondWith(cacheFirst(req)); return; }
  event.respondWith(networkFirst(req));
});
