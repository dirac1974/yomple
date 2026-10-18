#!/usr/bin/env python3
"""Build the "imagined Lincoln" voice for Quiet Field 2 through the field-voice-build edge function.

  python3 voice_build.py design            # 3 prompts x 1 model -> preview MP3s (listen, pick one)
  python3 voice_build.py save <generated_voice_id>
  python3 voice_build.py takes <voice_id>  # full address normal (3 seeds) + slow, cut into lanterns

Needs: the ELEVENLABS_API_KEY secret set on the Supabase project, and the admin token in
$FIELD_VOICE_ADMIN_FILE. Output lands in ../field-next/audio/lincoln[ -slow]/ (same format as audio/rea/).
"""
import json, os, re, subprocess, sys, urllib.request, wave
import numpy as np

URL = "https://digcgqltrlmhgmzgmvwc.supabase.co/functions/v1/field-voice-build"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "field-next", "audio")
WORK = os.environ.get("VOICE_WORK", "/tmp/voice-work")
TOKEN = open(os.environ["FIELD_VOICE_ADMIN_FILE"]).read().strip()

L = [("g1", "Four score and seven years ago our fathers brought forth on this continent, a new nation,"),
     ("g2", "conceived in Liberty, and dedicated to the proposition that all men are created equal."),
     ("g3", "Now we are engaged in a great civil war, testing whether that nation,"),
     ("g4", "or any nation so conceived and so dedicated, can long endure."),
     ("g5", "We are met on a great battle-field of that war."),
     ("g6", "We have come to dedicate a portion of that field, as a final resting place"),
     ("g7", "for those who here gave their lives that that nation might live."),
     ("g8", "It is altogether fitting and proper that we should do this."),
     ("g9", "But, in a larger sense, we can not dedicate—we can not consecrate—we can not hallow—this ground."),
     ("g10", "The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract."),
     ("g11", "The world will little note, nor long remember what we say here, but it can never forget what they did here."),
     ("g12", "It is for us the living, rather, to be dedicated here to the unfinished work"),
     ("g13", "which they who fought here have thus far so nobly advanced."),
     ("g14", "It is rather for us to be here dedicated to the great task remaining before us—"),
     ("g15", "that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—"),
     ("g16", "that we here highly resolve that these dead shall not have died in vain—"),
     ("g17", "that this nation, under God, shall have a new birth of freedom—"),
     ("g18", "and that government of the people, by the people, for the people, shall not perish from the earth.")]
TEXT = " ".join(t for _, t in L).replace("— ", "—")
# What the voice reads: the canonical text, with short breaks at the dashes (v2 supports <break/>).
SPOKEN = TEXT.replace("—", ' <break time="0.4s"/> ')

PROMPTS = {
    "plain": "A 54-year-old American man in the 1860s, born in Kentucky and raised on the Indiana frontier. High, clear tenor that carries across an open field without shouting; slightly thin and reedy, never deep or booming. Plain backcountry accent, unhurried vowels. Speaks slowly and deliberately, pausing at each comma, as if to a large outdoor crowd. Dignified, solemn, sincere, weary but steady. Not theatrical, not preachy, no vibrato. Clean, close recording.",
    "lawyer": "Tall, lean frontier lawyer in his fifties, 1860s America. Bright, high tenor with a touch of nasal edge and remarkable projection. Kentucky-Indiana hill-country speech softened by years in Illinois courtrooms. Measured cadence of a man weighing every word. Grave and humble at a cemetery dedication. Calm conviction, no drama.",
    "weary": "Older nineteenth-century American statesman, worn by war. Light, high, penetrating tenor, clear diction, rural Midwestern-Southern drawl. Very deliberate pace, short sentences landing quietly. Quiet authority, gentle, plain-spoken, restrained emotion.",
}


def call(body):
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method="POST",
                                 headers={"content-type": "application/json", "x-admin": TOKEN})
    with urllib.request.urlopen(req, timeout=150) as r:
        return json.loads(r.read())


def get(url, path):
    with urllib.request.urlopen(url, timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())


def words_from_alignment(al, text):
    """Word times from ElevenLabs character alignment of SPOKEN; words are the canonical TEXT tokens."""
    chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    spoken = "".join(chars)
    # map each canonical token to its span in the spoken string (break tags are skipped by searching forward)
    toks = [t for t in re.split(r"[\s—]+", text) if t]
    words, pos = [], 0
    for i, t in enumerate(toks):
        core = re.sub(r"^[^\w]+|[^\w]+$", "", t)
        k = spoken.find(core, pos)
        if k < 0:
            raise SystemExit(f"alignment lost at word {i} {t!r}")
        a, b = k, k + len(core) - 1
        words.append({"i": i, "w": t, "s": round(st[a], 3), "e": round(en[b], 3)})
        pos = b + 1
    return words


def cut(take_mp3, words, dest, label):
    os.makedirs(dest, exist_ok=True)
    wav = os.path.join(WORK, "take16.wav")
    subprocess.run(["ffmpeg", "-loglevel", "quiet", "-y", "-i", take_mp3, "-ar", "16000", "-ac", "1", wav], check=True)
    wf = wave.open(wav); sr = wf.getframerate()
    x = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32)
    fr = int(0.01 * sr); rms = np.sqrt(np.convolve(x ** 2, np.ones(fr) / fr, mode="same"))
    dur = len(x) / sr
    lan, i = {}, 0
    for g, t in L:
        n = len([w for w in re.split(r"[\s—]+", t) if w]); lan[g] = {"w0": i, "w1": i + n - 1}; i += n
    assert i == len(words), (i, len(words))
    ids = [g for g, _ in L]
    lan[ids[0]]["s"] = round(max(0, words[0]["s"] - 0.12), 3)
    lan[ids[-1]]["e"] = round(min(dur, words[-1]["e"] + 0.4), 3)
    for n in range(len(ids) - 1):
        g, h = ids[n], ids[n + 1]
        we, ns = words[lan[g]["w1"]]["e"], words[lan[h]["w0"]]["s"]
        a, b = int(we * sr), max(int(we * sr) + 1, int(ns * sr))
        c = (a + int(np.argmin(rms[a:b]))) / sr
        lan[g]["e"], lan[h]["s"] = round(min(c + 0.06, ns - 0.01), 3), round(max(c - 0.06, we + 0.01), 3)
    for g in ids:
        s, e = lan[g]["s"], lan[g]["e"]; d = e - s
        subprocess.run(["ffmpeg", "-loglevel", "quiet", "-y", "-ss", str(s), "-t", f"{d:.3f}", "-i", take_mp3,
                        "-af", f"afade=t=in:d=0.012,afade=t=out:st={max(0, d - 0.03):.3f}:d=0.03",
                        "-ac", "1", "-b:a", "96k", os.path.join(dest, g + ".mp3")], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "quiet", "-y", "-i", take_mp3, "-ac", "1", "-b:a", "96k",
                    os.path.join(dest, "full.mp3")], check=True)
    json.dump({"v": 1, "voice": os.path.basename(dest), "label": label, "duration": round(dur, 2),
               "words": words, "lanterns": lan}, open(os.path.join(dest, "timing.json"), "w"))
    print("wrote", dest)


def main():
    os.makedirs(WORK, exist_ok=True)
    cmd = sys.argv[1]
    if cmd == "design":
        sample = L[0][1] + " " + L[1][1] + " " + L[2][1]
        for name, desc in PROMPTS.items():
            r = call({"action": "design", "description": desc, "text": sample, "out": f"gettysburg/design/{name}"})
            for k, p in enumerate(r["previews"]):
                print(name, k, p["generated_voice_id"], p["url"])
    elif cmd == "save":
        print(call({"action": "save", "generated_voice_id": sys.argv[2]}))
    elif cmd == "takes":
        vid = sys.argv[2]
        for tag, speed, seeds in (("lincoln", 0.9, (1863, 1119, 4)), ("lincoln-slow", 0.75, (1863,))):
            for seed in seeds:
                r = call({"action": "tts", "voice_id": vid, "text": SPOKEN, "speed": speed, "seed": seed,
                          "out": f"gettysburg/{tag}/s{seed}"})
                mp3 = os.path.join(WORK, f"{tag}-{seed}.mp3"); get(r["audio"], mp3)
                aj = os.path.join(WORK, f"{tag}-{seed}.json"); get(r["align"], aj)
                words = words_from_alignment(json.load(open(aj))["alignment"], TEXT)
                cut(mp3, words, os.path.join(OUT, tag if seed == seeds[0] else f"{tag}-s{seed}"),
                    "An imagined Lincoln voice, made by computer" + (" (slow)" if "slow" in tag else ""))
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
