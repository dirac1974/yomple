# Quiet Field 2: memory and learning-science memo

## 1. What's wrong now

**The cuts** run from 9 to 46 words (p1, p4, p9 and p12 are 27 to 46). Verbatim recall works one breath group of about 8 to 20 words at a time, and bigger chunks get paraphrased. p1 is also missing the Bliss comma after "continent".

**The method** never trains the **chain**, which is where recitations fail.
- Lanterns are introduced out of order (p3, p5, p1).
- Walk cues every lantern with its picture, so she never produces a seam or a continuous run.
- Echo jumps from full text to none, so a perfectionist peeks and feels she failed.
- Three "I said it" taps in one sitting make a lantern "shining". That is massed practice and false mastery.
- The mic scores a bag of words (order ignored), and under 0.7 it calls `markHit(false)` and resets the streak. Mix also resets on a wrong tap.
- The emoji (✓, 🌍) are generic. Hall of Presidents used bizarre scenes in ordered rooms.
- The loop never changes and has no arc. That is the boredom.

## 2. New cuts: 18 lanterns, 3 movements

Every Bliss word appears exactly once, in order (checked by script). Both triplets and g15's "devotion … devotion" stay whole. New ids are `g1`–`g18`, so they don't collide with the `p` ids.

| # | Title | Text (Bliss) | W | Hinge → next | Old |
|---|---|---|---|---|---|
| **I. THEN** ||||||
| g1 | Four Score Fathers | Four score and seven years ago our fathers brought forth on this continent, a new nation, | 16 | nation → *conceived* | p1 |
| g2 | All Created Equal | conceived in Liberty, and dedicated to the proposition that all men are created equal. | 14 | equal → *Now* | p1 |
| **II. NOW** ||||||
| g3 | The Great Test | Now we are engaged in a great civil war, testing whether that nation, | 13 | that nation → *or any nation* | p2 |
| g4 | Can It Endure? | or any nation so conceived and so dedicated, can long endure. | 11 | endure → *We are met* | p2 |
| g5 | We Are Met | We are met on a great battle-field of that war. | 10 | that war → *We have come* | p3 |
| g6 | A Resting Place | We have come to dedicate a portion of that field, as a final resting place | 15 | resting place → *for those* | p4 |
| g7 | That That Nation | for those who here gave their lives that that nation might live. | 12 | live → *It is altogether* | p4 |
| g8 | Fitting and Proper | It is altogether fitting and proper that we should do this. | 11 | do this → *But* | p5 |
| g9 | Can Not Hallow | But, in a larger sense, we can not dedicate—we can not consecrate—we can not hallow—this ground. | 19 | ground → *The brave men* | p6 |
| g10 | Brave Men Consecrated | The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. | 21 | detract → *The world* | p7 |
| g11 | The World Forgets | The world will little note, nor long remember what we say here, but it can never forget what they did here. | 21 | they did → *us the living* | p8 |
| **III. AHEAD** ||||||
| g12 | Us the Living | It is for us the living, rather, to be dedicated here to the unfinished work | 15 | work → *which they* | p9 |
| g13 | Nobly Advanced | which they who fought here have thus far so nobly advanced. | 11 | advanced → *It is rather* | p9 |
| g14 | The Great Task | It is rather for us to be here dedicated to the great task remaining before us— | 16 | before us → *that from* | p10 |
| g15 | Full Measure | that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion— | 22 | devotion → *that we here* | p11 |
| g16 | Not in Vain | that we here highly resolve that these dead shall not have died in vain— | 14 | vain → *that this nation* | p12 |
| g17 | New Birth of Freedom | that this nation, under God, shall have a new birth of freedom— | 12 | freedom → *and that government* | p12 |
| g18 | Of, By, For | and that government of the people, by the people, for the people, shall not perish from the earth. | 18 | (end) | p12 |

**Teach these on purpose:**
- **The mirror lines, g12 and g14:** "the living, **rather**, … dedicated **here**" vs "**rather** for us … **here dedicated**". Show them side by side with the moved words lit.
- **The "that" staircase, g15 to g18:** *that from / that we / that this / and that*. One image chain: the dead hand their resolve to a reborn nation, which hands it to the people.

**Migrating progress:** each new lantern records its parent (`from:"pX"`). A split lantern gets the parent's state minus one level (never below "practicing") and is due today, so one recall restores it. Old `p` records stay for rollback, and seams start fresh.

## 3. Memory aids, ranked by evidence × fit

1. **Spaced retrieval with sleep** has the strongest evidence (Roediger & Karpicke 2006; Cepeda et al. 2006; Diekelmann & Born 2010; Dunlosky et al. 2013). **Every session opens with cold recall**, before any hearing.
2. **A cue-fading ladder** (vanishing cues: Glisky, Schacter & Tulving 1986). The rungs are:
   1. Full text.
   2. Function words blanked.
   3. First letters (`F s a s y a o f b f o t c, a n n,`).
   4. Content-word letters only.
   5. Title and picture.

   A success climbs one rung. A peek drops one rung, never to zero. This replaces all-or-nothing Echo.
3. **A memory palace on the real route.** Loci work well for ordered material (Bower 1970; Dresler et al. 2017), and she has already succeeded with one. Use Lincoln's actual day:
   **I** is the train depot and the Wills House. **II** goes up Baltimore Street to the cemetery gate, the graves and the platform. **III** faces out from the platform toward the road ahead.

   Each station image is bizarre and **contains the next hinge**: at g1, the fathers carry a baby nation wearing a "conceived" tag.
4. **Seam drills.** She gets the last 3 to 4 words of a lantern and says the first 4 of the next. Track the 17 seams as their own items.
5. **Meaning.** Actors recall verbatim by knowing why each line follows the last (Noice & Noice 2006). Ask "why does Lincoln say this next?" at each seam.
6. **Aloud, standing, with gesture** (production effect, MacLeod et al. 2010; enactment, Engelkamp). One gesture per lantern, plus a palm-down tap on each "here". The 8 "here"s, 6 "dedicate"s and 5 "nation"s become collectibles.
7. **Prosody.** The parallels carry the words (*can not ×3*, *of / by / for*, *little note / never forget*). A consistent melody aids recall (Wallace 1994), so keep the cadence the same in every recording.
8. **Her own mnemonics** (generation effect, Slamecka & Graf 1978): she can redraw or rename any station.
9. **Chaining order.** Forward *between* movements, so the story comes first. Backward-cumulative *within* each: learn the last lantern first, add the one before, and run forward into known ground. New seams get rehearsed in their real direction, and endings come out strongest.

Never show a misquoted version: error-spotting games plant intrusions.

**Dose:** 10 to 15 minutes a day, plus an optional 2-minute bedtime run, and at most 3 new lanterns a day.

**Plan:**
- **Day 1:** Hear the whole address with karaoke and the three movements shown. Learn g2, then g1, on the ladder. Drill their seam and walk two stations.
- **Day 2:** Cold-recall Movement I, then learn g11, g10, g9.
- **Day 3:** Cold recall and a no-cue run of I. Repair the 2 weakest. Add g8, g7, g6, then run g6→g11.
- **Days 4–6:** Finish II (g5→g3), then start III with g18, g17, g16.
- **Day 7:** Add g15→g12, so all lanterns are lit. Do the first **full rehearsal**, with letter cues on request, and log which seams needed one.
- **Days 8–13:** Cold-run one movement in rotation, do one full rehearsal, and repair the 3 weakest seams.
- **Day 14:** Offer Deliver if she meets the readiness rule. Otherwise keep rehearsing, with no deadline.

## 4. Evidence rules

- **A lantern is known** when she recalls it from title/picture only, with at least 90% of words in order, on **two days with sleep between**. Same-day repeats only reach "solid".
- **A seam is known** when she starts the next lantern unprompted after the end of the previous one, on two days.
- **Ready to deliver:** everything is known, plus two full runs on different days with 2 or fewer prompts each.
- **Speech recognition only helps.**
  - Score an ordered (longest-common-subsequence) alignment of content words, with fuzzy matches (*hollow/hallow*, *cannot*, *battlefield*, *4/four*, stems).
  - At 0.75 or more, give credit automatically.
  - Below that, show "Here's what I caught" with the matched words lit gold, ask "Did you say it all?", and trust her answer.
  - The mic never calls `markHit(false)`, never shows red and never resets a streak.
- **Rehearsal vs Performance.**
  - **Rehearsal** is the default: private, with free peeks and a **"Line!"** button that gives the next 2 words, like a theater prompter.
  - **Performance** ("Deliver the Address") is opt-in and unlocks at readiness. A stall quietly becomes a rehearsal and is never recorded as a failure.
  - Show progress as *seams connected* (n/17) and stations collected, never as errors.

## 5. Voice

- **Pace.** About 120 words per minute, with real pauses: 300 ms at commas, 500 ms at dashes, about 800 ms between lanterns. Slow mode is about 90 wpm, generated slow or played at 0.75× with `preservesPitch`.
- **Slicing:** use the word timestamps for karaoke and cut mid-silence with 80 ms padding, which fixes the clipped words.
- **Echo mode:** one breath group, then silence of about 1.3× its length for her to repeat, then the full lantern, then a silent "your turn". **Seam mode:** the end of lantern N, a pause, the start of N+1.
- **Atmosphere:** wind, crowd, reverb and crackle are seductive details (Harp & Mayer 1998) that hurt intelligibility while she copies words. Keep learning audio dry. Atmosphere belongs only in the whole-address listen and the Deliver ceremony, quiet and behind a toggle.
- In the final days, rehearse in different rooms (Smith, Glenberg & Bjork 1978) so the speech travels to a classroom.
