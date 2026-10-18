/* Quiet Field 2: the memory engine (window.QF).

   State lives in the active profile:
     store.progress[pid].qf2 = { g1:{st,disp,days,due,miss,missKey,last,rung,intro,win,from}, ..., "g1>g2":{...} }
     store.fun[pid].qf2      = { v:1, lit:[ids], joined:[seam ids], sessions:n, lastDay, runs:[days], migrated:true }
   st   0 new · 1 practicing · 2 lit (a qualifying recall on one day) · 3 shining (two different days)
   disp display level: max ever, never goes down (migration may set it above st)
   days local dates ('YYYY-MM-DD') of qualifying recalls
   Never writes progress.gettysburg or progress.preamble. Classic script. */
(function (root) {
  "use strict";
  var D = root.QF_DATA;
  var LANTERNS = D.lanterns, SEAMS = D.seams, MOVES = D.movements;
  var SEAM_BY_ID = {};
  SEAMS.forEach(function (s) { SEAM_BY_ID[s.id] = s; });

  // Learning order: forward between movements, backward within each (memory memo 3.9).
  var ORDER = [];
  MOVES.forEach(function (m) { ORDER = ORDER.concat(m.ids.slice().reverse()); });
  var SPLIT = {};
  LANTERNS.forEach(function (L) { SPLIT[L.from] = (SPLIT[L.from] || 0) + 1; });

  var NEW_PER_DAY = 3, BACKLOG_HOLD = 3, COLD_CAP = 9, SEAM_CAP = 6;

  /* ---------- dates: local calendar days only ---------- */
  var clock = function () { return new Date(); };
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dstr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dstr(clock()); }
  function addDays(s, n) {
    var p = String(s).split("-");
    return dstr(new Date(+p[0], +p[1] - 1, +p[2] + n, 12));
  }

  /* ---------- store access ---------- */
  function S() { return root.store; }
  function activeId() { var s = S(); return s && s.activeId; }
  function pidOf(p) { return (p && typeof p === "object") ? p.id : (p || activeId()); }
  function progressOf(id) {
    var s = S();
    if (!s || !id) return null;
    if (!s.progress) s.progress = {};
    if (!s.progress[id] || typeof s.progress[id] !== "object") s.progress[id] = {};
    return s.progress[id];
  }
  function funOf(id) {
    var s = S();
    if (!s || !id) return null;
    if (!s.fun) s.fun = {};
    if (!s.fun[id] || typeof s.fun[id] !== "object") s.fun[id] = {};
    var f = s.fun[id];
    if (!f.qf2 || typeof f.qf2 !== "object") f.qf2 = {};
    var q = f.qf2;
    if (!q.v) q.v = 1;
    if (!Array.isArray(q.lit)) q.lit = [];
    if (!Array.isArray(q.joined)) q.joined = [];
    if (!Array.isArray(q.runs)) q.runs = [];
    if (typeof q.sessions !== "number") q.sessions = 0;
    if (typeof q.lastDay !== "string") q.lastDay = "";
    return q;
  }
  function save() {
    if (typeof root.saveStore === "function") root.saveStore();
  }
  function writeLocal() {
    if (typeof root.writeStore === "function") root.writeStore();
    else save();
  }

  function fresh() {
    return { st: 0, disp: 0, days: [], due: "", miss: 0, missKey: "", last: 0, rung: 0, intro: "", win: "" };
  }
  function norm(r) {
    var f = fresh();
    Object.keys(f).forEach(function (k) { if (r[k] === undefined || r[k] === null) r[k] = f[k]; });
    if (!Array.isArray(r.days)) r.days = [];
    r.st = Math.max(0, Math.min(3, r.st | 0));
    r.disp = Math.max(r.st, Math.max(0, Math.min(3, r.disp | 0)));
    r.rung = Math.max(0, Math.min(4, r.rung | 0));
    return r;
  }
  function isSeamId(id) { return !!SEAM_BY_ID[id]; }
  function isLanternId(id) { return !!D.byId[id]; }

  /* ---------- migration (fill missing only; idempotent) ---------- */
  function parentRecord(prog, pX) {
    var g = prog.gettysburg;
    var r = (g && typeof g === "object" && g[pX]) || prog[pX];
    return (r && typeof r === "object" && typeof r.state === "number") ? r : null;
  }
  function migrate(profile) {
    var id = pidOf(profile);
    var prog = progressOf(id);
    if (!prog) return { created: 0 };
    if (!prog.qf2 || typeof prog.qf2 !== "object" || Array.isArray(prog.qf2)) prog.qf2 = {};
    var q = prog.qf2, T = today(), created = 0;
    LANTERNS.forEach(function (L) {
      if (q[L.id] && typeof q[L.id] === "object") { norm(q[L.id]); return; }
      var par = parentRecord(prog, L.from);
      var ps = par ? Math.max(0, Math.min(3, par.state | 0)) : 0;
      var st = SPLIT[L.from] > 1 ? Math.max(0, ps - 1) : ps;
      var r = fresh();
      r.st = st; r.disp = Math.max(st, ps); r.due = T; r.from = L.from;
      r.rung = st >= 2 ? 4 : (st === 1 ? 1 : 0);
      if (st >= 1) r.intro = "migrated";
      q[L.id] = r;
      created++;
    });
    SEAMS.forEach(function (s) {
      if (q[s.id] && typeof q[s.id] === "object") { norm(q[s.id]); return; }
      q[s.id] = fresh();
      created++;
    });
    var f = funOf(id);
    var changed = created > 0 || !f.migrated;
    f.migrated = true;
    syncLit(id);
    if (changed) writeLocal();
    return { created: created };
  }
  function qf2(id) {
    id = id || activeId();
    var prog = progressOf(id);
    if (!prog) return null;
    if (!prog.qf2 || !prog.qf2.g1) migrate(id);
    return prog.qf2;
  }
  function syncLit(id) {
    var prog = progressOf(id), f = funOf(id);
    if (!prog || !prog.qf2) return;
    LANTERNS.forEach(function (L) {
      var r = prog.qf2[L.id];
      if (r && r.disp >= 2 && f.lit.indexOf(L.id) < 0) f.lit.push(L.id);
    });
    SEAMS.forEach(function (s) {
      var r = prog.qf2[s.id];
      if (r && r.disp >= 2 && f.joined.indexOf(s.id) < 0) f.joined.push(s.id);
    });
  }

  /* ---------- reading ---------- */
  function raw(id) {
    var q = qf2();
    if (!q) return fresh();
    if (!q[id]) q[id] = fresh();
    return norm(q[id]);
  }
  function view(id, day) {
    day = day || today();
    var r = raw(id);
    return {
      id: id, st: r.st, disp: r.disp, rung: r.rung, days: r.days.slice(), due: r.due,
      dueToday: !!r.due && r.due <= day, lit: r.disp >= 2, shining: r.disp >= 3,
      byWindow: r.win === day, intro: r.intro, last: r.last, doneToday: r.days.indexOf(day) >= 0
    };
  }
  function interval(r) {
    if (r.st < 3) return 1;
    var k = r.days.length;
    return k <= 2 ? 2 : (k === 3 ? 4 : 7);
  }
  function sessionKey() { var f = funOf(activeId()); return (f ? f.sessions : 0) + ":" + today(); }

  /* ---------- recording one result ---------- */
  function record(id, r) {
    r = r || {};
    var seam = isSeamId(id);
    if (!seam && !isLanternId(id)) return null;
    if (!activeId()) return null;
    var it = raw(id), T = today(), f = funOf(activeId());
    var kind = r.kind || (seam ? "seam" : "ladder");
    var before = { st: it.st, disp: it.disp };
    var out = { qualified: false, window: false };
    it.last = Date.now();

    if (kind === "walk" || kind === "listen") {
      it.walked = T;
      f.lastDay = T;
      save();
      return result(it, before, out, T);
    }

    var peeks = Math.max(0, r.peeks | 0), misses = Math.max(0, r.misses | 0), lines = Math.max(0, r.lines | 0);
    var rung = seam ? 4 : (typeof r.rung === "number" ? Math.max(0, Math.min(4, r.rung | 0)) : (kind === "cold" ? 4 : it.rung));
    var n = seam ? SEAM_BY_ID[id].headWords.length : D.byId[id].words.length;
    var ratio = typeof r.ratio === "number" ? r.ratio : Math.max(0, (n - misses - lines) / n);
    var ok = !!r.ok;
    if (!it.intro) it.intro = T;
    if (it.st < 1) it.st = 1;

    var evidenceKind = kind === "cold" || kind === "ladder" || kind === "seam";
    if (evidenceKind && ok && peeks === 0 && ratio >= 0.9 && rung === 4) {
      out.qualified = true;
      if (it.days.indexOf(T) < 0) {
        it.days.push(T);
        it.st = it.st < 2 ? 2 : 3;
      }
    }

    if (!seam) {
      if (peeks > 0) it.rung = Math.max(0, rung - 1);
      else if (ok) it.rung = Math.min(4, rung + 1);
      else if (kind === "cold") it.rung = 3;
      else it.rung = rung;
    }

    if (!ok) {
      var key = sessionKey();
      if (it.missKey !== key) { it.missKey = key; it.miss = 0; }
      it.miss++;
      if (it.miss >= 2) { it.win = T; out.window = true; }
    }

    if (out.window) it.due = addDays(T, 1);
    else if (out.qualified) it.due = addDays(T, interval(it));
    else it.due = T;

    it.disp = Math.max(it.disp, it.st);
    syncLit(activeId());
    f.lastDay = T;
    save();
    return result(it, before, out, T);
  }
  function result(it, before, out, T) {
    return {
      state: it.st, rung: it.rung, lit: it.disp >= 2, shining: it.disp >= 3,
      newlyLit: before.disp < 2 && it.disp >= 2, newlyShining: before.disp < 3 && it.disp >= 3,
      qualified: out.qualified, window: out.window,
      tomorrow: it.due === addDays(T, 1), due: it.due
    };
  }

  function recordRun(o) {
    o = o || {};
    if (!activeId()) return null;
    var ids = o.ids || [], T = today(), f = funOf(activeId());
    var full = ids.length === LANTERNS.length && LANTERNS.every(function (L, i) { return ids[i] === L.id; });
    var counted = full && ((o.lines | 0) + (o.peeks | 0)) <= 2;
    if (counted && f.runs.indexOf(T) < 0) f.runs.push(T);
    f.lastDay = T;
    save();
    return { full: full, counted: counted, runs: f.runs.length };
  }

  function startSession() {
    if (!activeId()) return 0;
    qf2();
    var f = funOf(activeId());
    f.sessions++;
    writeLocal();
    return f.sessions;
  }

  /* ---------- tonight's session ---------- */
  function build(day) {
    var V = {};
    LANTERNS.forEach(function (L) { V[L.id] = view(L.id, day); });
    var f = funOf(activeId());
    var steps = [];
    var anyIntro = LANTERNS.some(function (L) { return V[L.id].st >= 1; });
    if (!anyIntro) steps.push({ kind: "listen", ids: LANTERNS.map(function (L) { return L.id; }) });

    var free = function (id) { return !V[id].byWindow && !V[id].doneToday; };
    var cold = LANTERNS.filter(function (L) {
      var v = V[L.id];
      return v.st >= 2 && v.rung === 4 && v.dueToday && free(L.id);
    }).map(function (L) { return L.id; });
    cold.sort(function (a, b) { return V[a].due < V[b].due ? -1 : (V[a].due > V[b].due ? 1 : D.byId[a].n - D.byId[b].n); });
    cold = cold.slice(0, COLD_CAP).sort(function (a, b) { return D.byId[a].n - D.byId[b].n; });
    if (cold.length) steps.push({ kind: "cold", ids: cold });

    var inProgress = LANTERNS.filter(function (L) {
      var v = V[L.id];
      return v.st >= 1 && free(L.id) && (v.st < 2 || v.rung < 4);
    }).map(function (L) { return L.id; });
    var repairs = inProgress.filter(function (id) { return V[id].intro !== day; });
    var todays = ORDER.filter(function (id) { return inProgress.indexOf(id) >= 0 && V[id].intro === day; });

    var introducedToday = LANTERNS.filter(function (L) { return V[L.id].intro === day; });
    var backlog = LANTERNS.filter(function (L) { var v = V[L.id]; return v.st === 1 && v.intro && v.intro !== day; }).length;
    var quota = backlog >= BACKLOG_HOLD ? 0 : Math.max(0, NEW_PER_DAY - introducedToday.length);
    var lock = introducedToday.length ? D.byId[introducedToday[0].id].movement : 0;
    var picks = [];
    for (var i = 0; i < ORDER.length && picks.length < quota; i++) {
      var id = ORDER[i], v = V[id];
      if (v.st >= 1 || v.intro) continue;
      var mv = D.byId[id].movement;
      if (lock && mv !== lock) break;
      lock = mv;
      picks.push(id);
    }
    repairs.concat(todays, picks).forEach(function (id) { steps.push({ kind: "ladder", ids: [id] }); });

    var known = function (id) { return V[id].st >= 1 || picks.indexOf(id) >= 0; };
    var walkable = function (id) { return known(id) && !V[id].byWindow; };
    var tonightNew = todays.concat(picks);
    var p1 = [], p2 = [], p3 = [];
    SEAMS.forEach(function (s) {
      if (!known(s.a) || !known(s.b) || V[s.a].byWindow || V[s.b].byWindow) return;
      var sv = view(s.id, day);
      if (sv.byWindow || sv.doneToday) return;
      if (sv.st < 2 && (tonightNew.indexOf(s.a) >= 0 || tonightNew.indexOf(s.b) >= 0)) p1.push(s.id);
      else if (sv.st >= 1 && sv.dueToday) p2.push(s.id);
      else if (sv.st === 0) p3.push(s.id);
    });
    var seamIds = p1.concat(p2, p3).slice(0, SEAM_CAP);
    seamIds.sort(function (a, b) { return D.byId[SEAM_BY_ID[a].a].n - D.byId[SEAM_BY_ID[b].a].n; });
    if (seamIds.length) steps.push({ kind: "seam", ids: seamIds });

    var allLit = LANTERNS.every(function (L) { return V[L.id].st >= 2; });
    var walk;
    if (allLit) walk = LANTERNS.map(function (L) { return L.id; }).filter(walkable);
    else {
      var focus = tonightNew.length ? D.byId[tonightNew[0]].movement : 0;
      if (!focus) {
        var ready = MOVES.filter(function (m) { return m.ids.filter(known).length >= 2; });
        if (ready.length) focus = ready[(f.sessions || 0) % ready.length].n;
      }
      walk = focus ? MOVES[focus - 1].ids.filter(walkable) : [];
    }
    if (walk.length >= 2) steps.push({ kind: "walk", ids: walk });
    return { steps: steps, cold: cold, fresh: picks };
  }
  function buildTonight(opts) {
    if (!activeId()) return [];
    qf2();
    return build((opts && opts.day) || today()).steps;
  }
  function preview(daysAhead) {
    if (!activeId()) return { cold: [], fresh: [] };
    qf2();
    var b = build(addDays(today(), daysAhead === undefined ? 1 : daysAhead));
    return { cold: b.cold, fresh: b.fresh };
  }

  /* ---------- readiness and summary ---------- */
  function readiness() {
    var missing = [];
    if (!activeId()) return { ready: false, missing: [{ id: "profile", why: "no player" }] };
    qf2();
    LANTERNS.forEach(function (L) { if (raw(L.id).st < 3) missing.push({ id: L.id, why: "not shining yet" }); });
    SEAMS.forEach(function (s) { if (raw(s.id).st < 3) missing.push({ id: s.id, why: "seam not shining yet" }); });
    var runs = funOf(activeId()).runs.length;
    if (runs < 2) missing.push({ id: "runs", why: (2 - runs) + " more full run" + (runs === 1 ? "" : "s") + " on different days" });
    return { ready: missing.length === 0, missing: missing };
  }
  function summary() {
    var out = { lit: 0, shining: 0, lanterns: LANTERNS.length, seamsDone: 0, seamsShining: 0, of: SEAMS.length, runs: 0, introduced: 0 };
    if (!activeId()) return out;
    qf2();
    LANTERNS.forEach(function (L) {
      var r = raw(L.id);
      if (r.disp >= 2) out.lit++;
      if (r.disp >= 3) out.shining++;
      if (r.st >= 1) out.introduced++;
    });
    SEAMS.forEach(function (s) {
      var r = raw(s.id);
      if (r.disp >= 2) out.seamsDone++;
      if (r.disp >= 3) out.seamsShining++;
    });
    out.runs = funOf(activeId()).runs.length;
    return out;
  }

  /* ---------- the Dedication (ceremony.js) ---------- */
  /* fun.qf2.delivered = [{mode:'page'|'memory', date:'YYYY-MM-DD', at:ms}], newest last. Always
     repeatable; never touches lantern records or readiness. */
  function deliveredList(id) {
    var f = funOf(id || activeId());
    if (!f) return [];
    if (!Array.isArray(f.delivered)) f.delivered = [];
    return f.delivered;
  }
  function markDelivered(o) {
    o = o || {};
    if (!activeId()) return null;
    var list = deliveredList();
    var mode = o.mode === "memory" ? "memory" : "page";
    var date = (typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date)) ? o.date : today();
    var entry = { mode: mode, date: date, at: Date.now() };
    list.push(entry);
    funOf(activeId()).lastDay = today();
    save();
    return { mode: entry.mode, date: entry.date, at: entry.at, count: list.length };
  }
  function delivered() {
    if (!activeId()) return [];
    return deliveredList().map(function (d) { return { mode: d.mode, date: d.date, at: d.at }; });
  }

  /* ---------- boot / reload ---------- */
  var reloadFns = [], wired = false;
  function reloadStore() {
    if (typeof root.loadStore === "function") root.loadStore();
    if (activeId()) migrate();
    reloadFns.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function boot() {
    if (typeof root.loadStore === "function") root.loadStore();
    if (activeId()) migrate();
    if (!wired && typeof root.addEventListener === "function") {
      wired = true;
      root.addEventListener("pageshow", function (e) { if (e && e.persisted) reloadStore(); });
      if (root.document && root.document.addEventListener) {
        root.document.addEventListener("visibilitychange", function () {
          if (root.document.visibilityState === "visible") reloadStore();
        });
      }
    }
    return QF;
  }
  function seed() {
    if (!activeId()) return;
    migrate();
    raw("g2"); raw("g1");
  }

  var QF = {
    boot: boot, reloadStore: reloadStore, onReload: function (fn) { if (typeof fn === "function") reloadFns.push(fn); },
    seed: seed, migrate: migrate, today: today, addDays: addDays,
    lanterns: function () { return LANTERNS; }, movements: function () { return MOVES; }, seams: function () { return SEAMS; },
    lantern: function (id) { return D.byId[id] || null; }, seam: function (id) { return SEAM_BY_ID[id] || null; },
    order: function () { return ORDER.slice(); },
    item: function (id) { return (isLanternId(id) || isSeamId(id)) && activeId() ? view(id) : null; },
    rung: function (id) { return activeId() && isLanternId(id) ? raw(id).rung : 0; },
    startSession: startSession, buildTonight: buildTonight, preview: preview,
    record: record, recordRun: recordRun, readiness: readiness, summary: summary,
    markDelivered: markDelivered, delivered: delivered,
    firstLetter: D.firstLetter, tokenize: D.tokenize, cue: D.cue,
    _setClock: function (fn) { clock = fn || function () { return new Date(); }; }
  };
  root.QF = QF;
})(typeof window !== "undefined" ? window : this);
