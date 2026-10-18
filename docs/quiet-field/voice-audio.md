# Quiet Field 2: Voice and Audio Plan

## 1. What goes wrong today (`field/voice.js`, `app.js`)

- **Cuts fall in the wrong place.** The spans in `GETTYSBURG_SPAN` are hard-coded and butt against each other (p2 ends at 24.80 and p3 starts at 24.80), so there is no gap to absorb error. The stop check runs in `ontimeupdate`, which fires only every ~15–250 ms (worst in Safari), so a clip runs into the next word or stops late. In `seekThenPlay`, a 280 ms `setTimeout(go)` starts playback even when the seek hasn't finished, and the code accepts being up to 0.12 s off. Seeking inside a streamed MP3 with no index is a byte guess, and Safari is often off by hundreds of ms. The spans came from Vosk running on the stream (see the comment), not on the decoded file.
- **Cross-origin streaming.** The `archive.org/download` URL redirects to an `ia*.archive.org` host, and `crossOrigin="anonymous"` needs CORS headers on that redirect target. When they're missing, `onerror` switches to the device voice. `fetchReciteBlob` swaps `a.src` in the middle of a session, which reloads the element and races the `_playToken`. `preseekLantern` changes the one shared element.
- **iOS audio unlock.** `startLook` calls `hearLantern` straight away, but `play()` only runs after an async seek or `loadedmetadata`. By then the tap's user activation has expired, so `play()` is rejected and the user sees "Tap Hear it once more". `warmFieldVoice` on `pointerdown` only loads the file; it never unlocks audio.
- **No offline support.** There is no service worker anywhere in the repo. The only caching is `cache:"force-cache"` (HTTP cache) and a blob URL that lasts one page load. Offline, the app falls back to the device voice.
- **`speechSynthesis`.** `pitch = 0.82` pushes the voice *lower*, the opposite of Lincoln's historical tenor. `pickLincolnVoice` guesses by name, so the voice differs per device. Chrome's Google voices often stop partway through long utterances (p12 is ~20 s). Lanterns can come out in different voices.
- **Hear it, then Speak (iOS).** Playing an `<audio>` element reconfigures the iOS audio session, and the recognizer can then hang with no `onresult`, `onend` or `onerror`. `listenOnce` has no watchdog, so the screen can stay on "Listening…" for good.
- **Scoring hurts progress.** The scorer is a set match at 0.7 with a stop list. The Speak handler calls `markHit(id, !!sc.ok)`, so when the *recognizer* fails, `consec` resets to 0. A recognition error demotes the lantern, which is bad for a perfectionist. Also, `rec.phrases=[targetText]` passes a plain string, but the spec expects `SpeechRecognitionPhrase` objects.

## 2. ElevenLabs plan (checked against the current docs)

**Voice design**
- **Preview:** `POST /v1/text-to-voice/design` with `voice_description`, `model_id` (`eleven_ttv_v3` or `eleven_multilingual_ttv_v2`), `text` (100–1000 characters), `seed`, `guidance_scale` (default 5), `loudness`, `should_enhance`. It returns `previews[]` with `generated_voice_id` and base64 MP3.
- **Save:** `POST /v1/text-to-voice` with the chosen `generated_voice_id`.

**Text-to-speech with timestamps**
- `POST /v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128` (this is the default format).
- It returns `audio_base64`, `alignment` and `normalized_alignment` (`characters[]`, `character_start_times_seconds[]`, `character_end_times_seconds[]`).
- Body: `voice_settings` (`stability`, `similarity_boost`, `style`, `use_speaker_boost`, `speed` 0.7–1.2), `seed`, `previous_text`/`next_text`, `previous_request_ids`/`next_request_ids` (up to 3 each, no older than 2 hours).

**Forced alignment**
- `POST /v1/forced-alignment` (multipart `file` + `text`) returns `words[]` with `start`, `end` and `loss`.
- It works on *any* audio, including the old Rea recording.

**Model choice**
- **Primary: `eleven_multilingual_v2`.**
  - The docs call it "most stable on long-form", and its 10k-character limit holds the whole address in one request.
  - It supports `<break time="…"/>` tags (up to 3 s), speed and request stitching, and its with-timestamps alignment is documented.
- **A/B candidate: `eleven_v4`** (released 2026-09-28).
  - More expressive, and it takes bracketed audio tags.
  - It does not support SSML break tags. A third-party source says it has no speed or style controls. The changelog places stitching on the Text-to-Dialogue API.
- **Not `eleven_v3`.** The docs say it has no request stitching, no speed setting and no break tags.
- Whichever model wins, timings come from forced alignment, so changing models never breaks the cuts.

**Settings for v2**
- Normal: `stability` 0.6, `similarity_boost` 0.8, `style` 0–0.1, `use_speaker_boost` true, `speed` 0.9, fixed `seed`.
- Slow version: `speed` 0.75.

**Usage terms.** A designed voice is not a clone (no recording of Lincoln exists). The Use Policy has sections on "Deception, Manipulation and Impersonation" and "AI Transparency"; I could not read their full text, so read them before generating. For private family use:
- Don't put Lincoln's name in the prompt.
- Label it on screen as "An imagined Lincoln voice, made by computer."
- Never present it as a real recording.

### (a) Voice-design prompts (preview each with `text` = lanterns 1+2, 306 characters, on both TTV models, then let Sarah vote)

1. **Plain:** "A 54-year-old American man in the 1860s, born in Kentucky and raised on the Indiana frontier. High, clear tenor that carries across an open field without shouting; slightly thin and reedy, never deep or booming. Plain backcountry accent, unhurried vowels. Speaks slowly and deliberately, pausing at each comma, as if to a large outdoor crowd. Dignified, solemn, sincere, weary but steady. Not theatrical, not preachy, no vibrato. Clean, close recording."
2. **Lawyer:** "Tall, lean frontier lawyer in his fifties, 1860s America. Bright, high tenor with a touch of nasal edge and remarkable projection. Kentucky–Indiana hill-country speech softened by years in Illinois courtrooms. Measured cadence of a man weighing every word. Grave and humble at a cemetery dedication. Calm conviction, no drama."
3. **Weary:** "Older nineteenth-century American statesman, worn by war. Light, high, penetrating tenor, clear diction, rural Midwestern-Southern drawl. Very deliberate pace, short sentences landing quietly. Quiet authority, gentle, plain-spoken, restrained emotion."

Use `guidance_scale` 5 first, then 7.

### (b) Takes to generate
- **Full address:** one request (1,465 characters), so the delivery is consistent from start to finish. Generate 3 seeds and pick the best.
- **Per-lantern takes:** one request per lantern, with `previous_text`/`next_text` set to the neighbouring text so each clip sounds like part of the speech yet ends cleanly. Lock the phrase cuts first, since p12 is 46 words and may be split.
- **Slow:** per-lantern takes at `speed` 0.75. The slow full address is assembled in the client from those takes with 1.2 s gaps, so the pauses are exact and controlled in code.
- **Text prep:** keep the canonical text from `phrases.js` and its punctuation. Use a v2 `<break time="0.4s"/>` only at the em-dashes.

### (c) Exact timings
- Run forced alignment on the *final stored* MP3 against the canonical text, and treat it as the authority. The with-timestamps alignment is a cross-check, and any word with high `loss` gets a manual listen.
- **Building words:** tokenize the canonical text with character offsets. Each word's start is the start time of its first letter and its end is the end time of its last letter, ignoring punctuation.
- **Lantern cuts:** start = max(previous word's end, first word's start − 0.12 s), end = min(next word's start, last word's end + 0.25 s). Add 10 ms gain fades. The padding also covers MP3 decoder delay (about 26 ms).
- **`timing.json`:**
  ```
  {v, voice, duration, words:[{i, w, s, e}], lanterns:{p1:{w0, w1, s, e}}, speed}
  ```
  One file per audio file. Lanterns are word ranges, so re-cutting lanterns needs no regeneration for the full recording.
- Karaoke highlighting and vanishing-word games read `words[]` directly.

### (d) Storage, serving and budget
- **Generation:** a Supabase edge function `field-voice-build`.
  - It holds `ELEVENLABS_API_KEY` as a secret and checks an admin secret header.
  - It does one item per invocation to stay within time limits, and is never called by the app.
  - It runs generation and alignment, then writes to a public bucket `field-audio` under immutable versioned paths: `gettysburg/v1/full.mp3`, `p1.mp3`…, `slow/p1.mp3`…, `*.timing.json`, `manifest.json` (with hashes).
- **Serving (recommended):** copy the approved files into the repo at `/field-next/audio/` so they're same-origin on GitHub Pages, which removes CORS problems on iOS. The Supabase URLs stay as the source and archive.
- **Size:** about 2 MB for the full take, 2 MB for the lantern takes and 2.5 MB for the slow takes, roughly 7 MB in all.
- **Service worker (new):** add `sw.js` scoped to `/field-next/`.
  - Precache the shell, `manifest.json` and all timing files. Cache audio when it's first played, and offer a "Save for offline" button.
  - Call `navigator.storage.persist()`. iOS can still clear this storage after about 7 idle days, so re-fetch quietly when it's gone.
  - Audio is loaded with `fetch` and `decodeAudioData`, so the service worker needs no Range-request handling.
- **Budget:**
  - Gettysburg is 1,465 characters per take. Full + lanterns + slow lanterns × 3 seeds ≈ 13k characters. The Preamble adds ≈ 3k. Voice-design previews come on top.
  - About 20k characters in all, which fits one month of Starter (30k credits; $6 per a third-party article dated Oct 2026). The cost per character for v2 is unverified (a third-party article gives conflicting figures), so check the pricing page.
  - It's a one-time cost.

## 3. Atmosphere (WebAudio, generated at playback time)

**Signal chain:** speech → dry gain, plus a send to a `ConvolverNode` → master.
- **Impulse response:** generated in code as 1.4 s of stereo noise with an exponential decay, low-passed at 4 kHz, plus one faint ground reflection at about 40 ms. Wet level about −18 dB.
- **Wind:** looped pink noise through a band-pass at 300–800 Hz, with a 0.07 Hz LFO on frequency and gain, at about −32 dBFS.
- **Distant crowd:** band-passed noise, low-passed at 1.2 kHz, with 3–5 Hz amplitude modulation that sounds like faint far-off talking, at about −38 dB.
- **Crackle (optional, "pretend phonograph"):** sparse random clicks, high-passed at 2 kHz. Label it honestly: there were no recordings in 1863.
- **Ducking:** the word times are known, so schedule the ambience gain −8 dB across each speech span (150 ms attack, 400 ms release). Keep speech at least 20 dB above the ambience.
- **Setting:** an "Atmosphere" toggle stored in `getFun().atmos`.
- **Learning-science caveat:** seductive details and the coherence principle say extra sound can hurt encoding.
  - **On:** only for "Listen to the whole address", the ceremonial moment.
  - **Off:** Look, Echo, Walk, the vanishing-word games and slow mode.

## 4. "Speak" (speech recognition)

**Lenient matching**
- Score only the lantern's existing `keys`, in order (longest common subsequence), checked against all `maxAlternatives` (5).
- Accept close spellings (a small edit distance after a sound-alike reduction) and a table of common mishearings:
  - score: store, scored, forescore
  - consecrate: consecrated, can secrete, concentrate
  - hallow: hollow, hello, halo, allow
  - detract: the tract, distract, retract
  - perish: parish, paris, perished
  - also: endure (in door), vain (vein, vane), forth (fourth)
- Show matched words in gold and leave the rest neutral.
- **The mic can only promote.** It never calls `markHit(false)`. When it misses, show "I didn't catch every word — tap I said it if you did."

**Availability**
- **Chrome on desktop and Android:** uses Google's servers by default (needs a network). Newer Chrome adds on-device recognition (`processLocally`, `SpeechRecognition.available()`/`install()`) and `phrases` biasing with `new SpeechRecognitionPhrase(word, boost)`. Feature-detect each one.
- **iOS and iPadOS:** `webkitSpeechRecognition` (Safari 14.5+) needs Siri and Dictation turned on and runs through Apple's servers. Every iOS browser uses WebKit, so they all behave the same.
  - Mitigate the hang: play audio through WebAudio, not `<audio>`; create a new recognizer each time; add an 8 s watchdog that calls `abort()`.
- **Firefox:** no recognition.

**Fallback when it's unavailable:** hide Speak and keep "I said it". Add "Record & compare" (MediaRecorder plays back her echo, then Lincoln's) and typed recall of the hidden words, which counts as evidence under the Bloom rule.

## 5. New `voice.js` API

```js
FieldVoice.unlock()            // call synchronously in the first tap: new/resume AudioContext,
                               // play a 1-sample silent buffer; navigator.audioSession.type='playback'
                               // where supported (plays through the iOS mute switch)
FieldVoice.load(topic)         // → Promise; manifest + timing JSON, decode lazily (keep up to 3 decoded clips)
FieldVoice.play({topic, lantern:'p3' | from:'p1', to:'p5' | full:true,
                 speed:'normal'|'slow', atmosphere:bool, fromWord, untilWord}) // → Playback
playback.on('word', ({i, w, lantern}))   // rAF loop comparing ctx.currentTime with words[]
playback.on('lantern' | 'end' | 'error')
playback.stop()
FieldVoice.words(topic)        // timing data for vanishing-word and karaoke games
FieldVoice.setAtmosphere({on, level})
FieldVoice.canListen()         // {api, onDevice, phrases}
FieldVoice.listen(lanternId, {timeoutMs:8000}) // → Promise<{heard, matched, ratio, reason}>
```

- **iOS autoplay:** once the AudioContext has been resumed inside a tap, later `source.start()` calls work even after async decoding. That fixes the auto-play in `startLook`. If the context state is `interrupted` or `suspended`, resume it on the next tap.
- **Around Speak:** set `audioSession.type='play-and-record'` while listening and restore it afterwards. This needs device testing.
- **Fallback chain:** designed voice (cache) → designed voice (network) → Britton Rea recording, hosted same-origin and re-cut with forced alignment, still labelled → `speechSynthesis` with `pitch` ≥ 1.0, one lantern per utterance.
- **Compatibility shims, so `app.js` keeps working:** `hearLantern(phrase, done)`, `speakText`, `stopSpeak`, `warmFieldVoice` (now calls `load`), `preseekLantern` (no-op), `listenOnce`, `stopListen`, `voiceSupported`.

**Sources and checks:** ElevenLabs docs pages for voice design, convert-with-timestamps, forced alignment, request stitching, models, best practices and the changelog. The details for v4 and pricing come partly from third-party pages (Morphic, Activepieces), so confirm them. The first direct fetches of `elevenlabs.io/docs/api-reference/text-to-voice/design` and `/text-to-speech/convert-with-timestamps` were blocked by a permission prompt; I read the `.md` versions instead.
