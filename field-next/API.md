# field-next public API (Builder A → Builder B)

All files are classic scripts (no modules). Load order in `index.html`:

```html
<script src="yomple-stay.js"></script>
<script src="store.js"></script>     <!-- store, saveStore, getActiveProfile, slugName, YOMPLE_* -->
<script src="lanterns.js"></script>  <!-- window.QF_DATA -->
<script src="memory.js"></script>    <!-- window.QF -->
<script src="voice.js"></script>     <!-- window.FieldVoice -->
<script src="app.js"></script>       <!-- B: toast, showScreen, showHome, showProfiles, seedIntroduced, ... -->
<script src="scene.js"></script><script src="games.js"></script>
<script src="sync.js"></script>
<script src="arrive.js"></script>
```

## store.js (globals; B must NOT redefine these)

| Global | What |
|---|---|
| `YOMPLE_MODULE` | `"field"` |
| `YOMPLE_TABLE` | `"field_players"` |
| `YOMPLE_STORE` | `"quiet-field-v2"` (own key; on first boot deep-copies `quiet-field-v1` when v2 is absent; v1 is never written) |
| `store` | `{profiles, activeId, familyCode, parentEmail, progress:{[pid]:{...}}, fun:{[pid]:{...}}, cloudBase}` |
| `loadStore()` | reads v2 into `store` (called by `QF.boot()`) |
| `saveStore()` | writes v2 (sync.js wraps it to schedule a cloud save) |
| `getActiveProfile()` | profile object `{id,name,avatar,username,pin,created}` or `null` |
| `slugName(s)` | username slug |
| `getProg()` / `getFun()` | active profile's `progress` / `fun` objects (created if missing) |

B defines in `app.js` (sync.js/arrive.js call them): `toast(msg)`, `showScreen(id)`, `showHome()`, `showProfiles()`, `seedIntroduced()`, `showRecover()`, plus the DOM ids `find-user, screen-recover, main-nav, family-code-value, parent-email, recover-email, recover-otp, otp-row, restore-code`.
`seedIntroduced()` should simply call `QF.seed()` (migrates + makes sure g2 and g1 are queued first).

## lanterns.js — `window.QF_DATA`

```js
QF_DATA.lanterns   // 18 × {id:'g1', n:1, movement:1|2|3, title, text, words:[...], w0, w1,
                   //       hinge:{end:'nation', next:'conceived'} | null (g18), hingeText:'nation → conceived',
                   //       from:'p1', station:'The railway depot', note:null|{title,text}, pic:null}
QF_DATA.movements  // [{n:1,name:'Then',ids:['g1','g2']}, {n:2,name:'Now',ids:[g3..g11]}, {n:3,name:'Ahead',ids:[g12..g18]}]
QF_DATA.seams      // 17 × {id:'g1>g2', a:'g1', b:'g2', tail:'a new nation,'(last 3–4 words of a), head:'conceived in Liberty, and'(first 3–4 of b),
                   //        tailWords:[...], headWords:[...]}
QF_DATA.notes      // 3 checked field notes [{id, lantern, title, text}]
QF_DATA.text       // canonical full Bliss text (271 words)
QF_DATA.tokenize(s)      // split on whitespace and '—'; punctuation stays on the word; 'battle-field' is one word
QF_DATA.bare(word)       // letters only, lowercase: 'Liberty,' → 'liberty', 'battle-field' → 'battlefield'
QF_DATA.firstLetter(word)// bare(word)[0]: 'battle-field' → 'b', 'But,' → 'b'
QF_DATA.isFunctionWord(word)
QF_DATA.cue(id, rung)    // → [{w, show:'word'|'letter'|'blank', letter}] one per word, for ladder rendering
```

## memory.js — `window.QF`

Everything reads the **active profile** (`store.activeId`). Data: `store.progress[pid].qf2` and `store.fun[pid].qf2`. Never touches `progress.gettysburg` / `preamble`.

| Call | Returns |
|---|---|
| `QF.boot()` | loads the store, migrates the active profile, wires `pageshow`/`visibilitychange` reload. Call once at startup before rendering. |
| `QF.onReload(fn)` | `fn()` after the store was reloaded from localStorage (tab came back): re-render. |
| `QF.reloadStore()` | re-reads localStorage now (also migrates). |
| `QF.seed()` | migrate + ensure g2/g1 are the first queued lanterns. Call from `seedIntroduced()`. |
| `QF.migrate(profileOrId?)` | fill-missing migration from `p` records (idempotent). |
| `QF.today()` | local `'YYYY-MM-DD'` |
| `QF.lanterns()` / `QF.movements()` / `QF.seams()` | the QF_DATA arrays |
| `QF.lantern(id)` / `QF.seam(id)` | one data object |
| `QF.item(id)` | state for a lantern or seam id: `{id, st, disp, rung, days, due, dueToday, lit, shining, byWindow, intro, last}` |
| `QF.rung(id)` | ladder rung 0–4: 0 full text · 1 function words blanked · 2 first letters of every word · 3 first letters of content words (function words blank) · 4 title + hinge only |
| `QF.startSession()` | call when "Tonight" is pressed (counts sessions; misses are counted per session) |
| `QF.buildTonight()` | steps, see below (pure; safe to call again after records) |
| `QF.record(id, r)` | see below |
| `QF.recordRun({ids, lines, peeks})` | a Night Walk finished; a full path (all 18) with `lines+peeks ≤ 2` is a "full run" for readiness. Never lantern evidence. |
| `QF.readiness()` | `{ready, missing:[{id, why}]}` (all lanterns + seams shining, plus 2 full runs on different days) |
| `QF.summary()` | `{lit, shining, lanterns:18, seamsDone, seamsShining, of:17, runs, introduced}` (display counts) |
| `QF.preview(daysAhead=1)` | `{cold:[ids], fresh:[ids]}` what that day would hold, for the "tomorrow" teaser |
| `QF.firstLetter`, `QF.tokenize`, `QF.cue` | same as QF_DATA |

### `QF.buildTonight()` → `[{kind, ids}]`

Order: `listen` (day 1 only: nothing introduced yet; `ids` = all 18, play `FieldVoice.play({full:true})` with karaoke) → `cold` (one step, many ids: lit lanterns due today at rung 4; run each at rung 4) → `ladder` (one step **per lantern**, ids:[one]; resume rung `QF.rung(id)`; repairs first, then ≤ 3 new lanterns/day in learning order) → `seam` (one step, ids = seam ids, ≤ 6) → `walk` (one step, ids in path order; rehearsal with Line!).
Day 1 = `listen → ladder g2 → ladder g1 → seam g1>g2 → walk [g1,g2]`.
Learning order: backward-cumulative within a movement (g2,g1 · g11…g3 · g18…g12), forward between movements; a new movement never starts on the same day as new lanterns of the previous one; no new lanterns when ≥ 3 lanterns introduced on earlier days are still unlit (repair first). Lanterns "set by the window" today are left out.

### `QF.record(id, r)` (saves once)

`r = {kind:'ladder'|'cold'|'seam'|'walk', ok, rung, peeks, misses, lines, ratio}`
- `ok`: the attempt succeeded. Suggested: she finished the lantern/seam with ratio ≥ 0.9 and no peek.
- `rung`: the rung it was played at (defaults to `QF.rung(id)`; cold = 4).
- `peeks`: times she revealed the text; `misses`: words that inked in gold; `lines`: Line! uses.
- `ratio`: words entered clean ÷ words (computed from misses+lines if omitted).

Returns `{state, rung, lit, shining, newlyLit, newlyShining, qualified, tomorrow, window, due}`
- `qualified`: counted as evidence. Only `cold`/`ladder` at rung 4 (seams: any rung), `ok`, `peeks===0`, `ratio ≥ 0.9`. `walk` never counts.
- `state` 0 new · 1 practicing · 2 lit (one qualifying day) · 3 shining (qualifying on 2 different local days). `lit`/`shining` use the display level, which never goes down.
- Ladder: success climbs one rung; a peek drops one (min 0); a failed cold recall drops to rung 3.
- `window: true` when this was the 2nd miss (`ok:false`) on this item in this session: "set by the window for tomorrow" — due tomorrow, nothing lost. Move on to the next step.
- `tomorrow`: true when the item is next due tomorrow; `due`: its next due date.

## voice.js — `window.FieldVoice`

| Call | |
|---|---|
| `FieldVoice.unlock()` | call synchronously inside `touchend`/`click` (every tap is fine): creates/resumes the AudioContext, plays a 1-sample silent buffer, sets `navigator.audioSession.type='playback'` when present, re-checks `interrupted`/`suspended`. |
| `FieldVoice.load()` | → Promise of `timing` (`{words, lanterns, duration}`); clips decode lazily. |
| `FieldVoice.preload(gid)` | decode a clip ahead of time (optional). |
| `FieldVoice.play({lantern:'g3'} \| {full:true} \| {from:'g1', to:'g2'})` | → playback `{on(evt, fn), stop()}`; returned synchronously. Events: `'word'` → `fn(i, w)` (i = global word index 0–270, `w` = timing word); `'start'`; `'end'` → `fn({stopped:bool, error:bool})` (fires exactly once, also after stop/error); `'error'`. A new `play()` stops the previous one. 15 ms gain ramps. |
| `FieldVoice.stop()` | stop whatever plays. |
| `FieldVoice.words()` | timing words (after `load()`), or `null`. |
| `FieldVoice.canPlay()` | WebAudio available. |
| `FieldVoice.muteHint()` | true on iOS without `navigator.audioSession` (ring/silent switch mutes WebAudio): show a quiet "Is the side switch on silent?" hint. |
| `FieldVoice.setVoice(id)` | switch folder `audio/<id>/` (default `'rea'`). |

No speech recognition tonight.

## Notes for B (added after implementation)

- `sync.js` loads after `app.js` and redefines `findHall()` and `showRecover()`; the app.js stubs are only placeholders.
- Also available: `QF.addDays(day, n)`, `QF.order()` (learning order), `QF.item(id).doneToday` (qualified today).
- A failed household lookup in `arrive.js` now creates nothing: it toasts "Could not reach the household just now. Trying again soon.", shows the profiles screen if nobody is active, and retries (4 s, 8 s, 16 s, 32 s, and on `online`).
- The first cloud save of a player in each page load first pulls that player's row and merges `qf2` record by record (so `QF.onReload` is not fired for that; re-read `QF.*` after a session step as usual).
- Tests: `node field-next/tests/run.js` (no dependencies, no network).
- Offline: `sw.js` (scope `/field-next/`), registered by `app.js` on load. **Bump `VERSION` at the top of `sw.js` on every deploy** (it names both caches; old ones are deleted on activate). Code/pages network-first (4 s stall → cache), `audio/<voice>/` cache-first and pre-fetched in the background (timing.json + 19 clips). Never intercepts other origins. Skip it with `?nosw` or `localStorage['qf2-no-sw']='1'` (tests). A new page or script is picked up automatically if `index.html` links it; other files (like `print.html`) go in `SHELL_FILES`.
- Typing: `Games.Keys` (games.js) owns the hidden `#catcher` input; screens just set `letters(fn)` / `onEnter` in app.js.
- Scene: `Scene.geometry(w, h)` is pure (post positions, tested in node); place names are positioned after drawing, clear of posts, the title and the placard.

## ceremony.js — `window.Ceremony` (the Dedication)

- `QF.markDelivered({mode:'page'|'memory', date})` → `{mode, date, at, count}`; appends to `fun.qf2.delivered[]` (date = local day by default). `QF.delivered()` → copies. Never touches lantern records or readiness. `sync.js` merges `delivered` from both sides (by date + mode + at).
- `Ceremony.paintHome()` is called by `showHome()` (one line in app.js). When `QF.readiness().ready` it adds `#ded-slot` (a daylight "The Dedication" button) to `#home-placard`; it also turns the scene's `text.plaque.dedication` into a tappable label (`g.ded-plaque`: "The Dedication" / "The Dedication waits here" → toast "N lanterns still to light"), with a "Delivered" ribbon once delivered. A MutationObserver on `#scene` re-applies it after every redraw, so scene.js needs no changes.
- `Ceremony.open({preview})` builds `#screen-dedication` on first use (a `.screen`, shown with `showScreen`). Preview (parent screen) works when not ready and records nothing (no `markDelivered`, recordings never stored).
- Recording: MediaRecorder + getUserMedia only after "Record myself"; tracks stopped right after; kept recordings live in IndexedDB `qf2-dedication/recordings` on the device only. Hidden when either API is missing.
- Own AudioContext (chorale, applause, atmosphere), closed on leaving. Atmosphere preference: `localStorage['qf2-ded-atmos']`.
- Tests: `tests/ceremony.test.js` (node); browser flow in the scratchpad `ded_test.py`.

## Integration notes

- `sync.js` merges `fun.qf2` field by field (`mergeFunQf2`): sets are unions deduped by a stable key (`lit`, `joined`, `runs`, `notesSeen`, `detective.here/.dedicate/.nation`, `delivered[]` by date|mode|at), counters take the max (`sessions`, `v`), `lastDay` the later day, `migrated` sticky, `detective.done` keeps every finished kind; anything else is local-wins with the cloud filling gaps. A new set-like field belongs in `FUN_SETS`.
- `sw.js` `SHELL_FILES` must list every file `index.html` / `print.html` load; `tests/sw.test.js` fails otherwise. Bump `VERSION` and the `?v=` query on every deploy.
- Phone landscape (`orientation: landscape` and `max-height: 500px`): the placard is a side column under the tools and the scene ends at it (with a short fade); `scene.js` only clears labels above the placard when it lies across the scene. `body.tiny` (visual viewport under 300 px, set by `Games.Keys`) is the keyboard-up compact session.
