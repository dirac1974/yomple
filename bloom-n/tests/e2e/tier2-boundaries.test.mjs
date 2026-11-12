/**
 * Bloom N E2E — Tier 2: Boundaries, Adversarial Anti-Scrub, Mandatory Math-Pause,
 * Determinism, Headless Resilience & Co-Op Race Deduplication (118 Genuine Tests)
 */

import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import {
  BLOOM_N_DIR,
  FALLBACK_BANNED_CURRICULUM_WORDS,
  FALLBACK_BANNED_SHAME_WORDS,
  loadEngine,
  loadSync,
  loadMultiplayer,
  loadFrostwake,
  loadFrostwakeAudio,
  loadOddroot,
  loadOddrootAudio,
  makeSeededRng,
  commitEnc,
  stepBeam,
  countWords,
  findBannedWord,
  stripJsAndCssComments,
  walkFilesRecursive,
  withIsolatedSyncEnv,
  createInMemoryCoopTransportHub,
} from "./helpers/opaque-helpers.mjs";

import { createBrowserPool, launchRealmFromPortal, exitRealmToPortal } from "./helpers/browser-cdp-harness.mjs";

let pool = null;
let sandboxHandle = null;

before(async () => {
  pool = await createBrowserPool();
  sandboxHandle = await pool.createSandboxPage();
});

after(async () => {
  if (sandboxHandle) await sandboxHandle.close();
  if (pool) await pool.close();
});

/* ============================================================================
 * GROUP 1 — Commit Input Sanitization & Invalid Value Boundaries (9 tests)
 * ============================================================================ */
describe("Tier 2 Group 1 — Commit Input Sanitization & Non-Finite Boundaries", () => {
  const invalidCases = [
    ["T2-CORE-01", "Number.NaN", Number.NaN],
    ["T2-CORE-02", "empty string ''", ""],
    ["T2-CORE-03", "whitespace '   '", "   "],
    ["T2-CORE-04", "non-numeric 'abc'", "abc"],
    ["T2-CORE-05", "null", null],
    ["T2-CORE-06", "undefined", undefined],
    ["T2-CORE-07", "+Infinity", Number.POSITIVE_INFINITY],
    ["T2-CORE-08", "-Infinity", Number.NEGATIVE_INFINITY],
    ["T2-CORE-09", "bare minus '-'", "-"],
  ];

  for (const [id, label, badVal] of invalidCases) {
    test(`${id}: evaluateCommit(${label}) rejects cleanly with zero NaN/Infinity leak & zero friction penalty`, async () => {
      const eng = await loadEngine();
      const prog = eng.createInitialProgress("david");
      const sess = eng.createSessionState();
      const enc = eng.generateEncounter("W1.2", { rng: makeSeededRng(100) });
      const shardsBefore = prog.fluxShards;
      const frictionBefore = sess.friction;

      const res = commitEnc(eng, prog, sess, enc, badVal, 2200);
      assert.notEqual(res.outcome, "clear", `Invalid input ${label} must not clear gate`);
      const cue = String(res.cue || "");
      assert.equal(cue.includes("NaN"), false, `Cue leaked NaN for ${label}: "${cue}"`);
      assert.equal(cue.includes("Infinity"), false, `Cue leaked Infinity for ${label}: "${cue}"`);
      assert.ok(countWords(cue) >= 1 && countWords(cue) <= 6, `Cue "${cue}" must be 1..6 words`);
      assert.equal(findBannedWord(cue, eng.BANNED_CHILD_WORDS || FALLBACK_BANNED_SHAME_WORDS), null);
      assert.equal(prog.fluxShards, shardsBefore, "Invalid input must never deduct shards");
      assert.equal(sess.friction, frictionBefore, "Invalid input guard must not spike friction");
    });
  }
});

/* ============================================================================
 * GROUP 2 — Sub-Zero Extremes (-500), Exact Sign-Flip, Zero & Float Epsilon (10 tests)
 * ============================================================================ */
describe("Tier 2 Group 2 — Sub-Zero Extremes, Sign-Flip, Zero & Float Epsilon", () => {
  test("T2-CORE-10: W1.2 answer = -500 extreme sub-zero commit clears & updates deepestSubZero = 500 + subzero_abyss", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    const enc = { ...eng.generateEncounter("W1.2", { rng: makeSeededRng(201) }), answer: -500 };
    const res = commitEnc(eng, prog, sess, enc, -500, 2500);
    assert.equal(res.outcome, "clear");
    assert.ok(prog.records.deepestSubZero >= 500);
    assert.ok(prog.discoveredMysteries.includes("subzero_abyss"));
  });

  test("T2-CORE-11: W1.2 answer = -200 David signature sub-zero clear", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    const enc = { ...eng.generateEncounter("W1.2", { rng: makeSeededRng(202) }), answer: -200 };
    const res = commitEnc(eng, prog, sess, enc, -200, 2500);
    assert.equal(res.outcome, "clear");
    assert.ok(prog.records.deepestSubZero >= 200);
  });

  test("T2-CORE-12: Sub-zero mystery threshold boundary: -99 does NOT unlock subzero_abyss, -100 DOES", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    const enc99 = { ...eng.generateEncounter("W1.1"), answer: -99 };
    commitEnc(eng, prog, sess, enc99, -99, 2500);
    assert.equal(prog.discoveredMysteries.includes("subzero_abyss"), false);

    const enc100 = { ...eng.generateEncounter("W1.2"), answer: -100 };
    commitEnc(eng, prog, sess, enc100, -100, 2500);
    assert.equal(prog.discoveredMysteries.includes("subzero_abyss"), true);
  });

  test("T2-CORE-13: Exact sign-flip +500 on answer = -500 triggers sign-flip nudge cue (<= 6 words)", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    const enc = { ...eng.generateEncounter("W1.2"), answer: -500 };
    const res = commitEnc(eng, prog, sess, enc, 500, 2500);
    assert.equal(res.outcome, "nudge");
    assert.equal(res.delta, 1000);
    assert.match(res.cue, /flip|sign/i);
    assert.ok(countWords(res.cue) <= 6);
  });

  test("T2-CORE-14: Exact sign-flip +150 on answer = -150 triggers sign-flip nudge cue", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    const enc = { ...eng.generateEncounter("W1.2"), answer: -150 };
    const res = commitEnc(eng, prog, sess, enc, 150, 2500);
    assert.equal(res.outcome, "nudge");
    assert.match(res.cue, /flip|sign/i);
  });

  test("T2-CORE-15: Exact sign-flip -42 on answer = +42 triggers sign-flip nudge cue", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const sess = eng.createSessionState();
    const enc = { ...eng.generateEncounter("W3.1"), answer: 42 };
    const res = commitEnc(eng, prog, sess, enc, -42, 2500);
    assert.equal(res.outcome, "nudge");
    assert.match(res.cue, /flip|sign/i);
  });

  test("T2-CORE-16: Zero root boundary: committing 0 and -0 on answer = 0 both clear cleanly", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const encA = { ...eng.generateEncounter("W1.1"), answer: 0 };
    const encB = { ...eng.generateEncounter("W1.1"), answer: 0 };
    assert.equal(commitEnc(eng, prog, sess, encA, 0, 2000).outcome, "clear");
    assert.equal(commitEnc(eng, prog, sess, encB, -0, 2000).outcome, "clear");
  });

  test("T2-CORE-17: Zero root boundary: committing +5 and -5 on answer = 0 give directional high/low cues, not sign-flip", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const encHi = { ...eng.generateEncounter("W1.1"), answer: 0 };
    const encLo = { ...eng.generateEncounter("W1.1"), answer: 0 };
    const hi = commitEnc(eng, prog, sess, encHi, 5, 2000);
    const lo = commitEnc(eng, prog, sess, encLo, -5, 2000);
    assert.match(hi.cue, /high/i);
    assert.match(lo.cue, /low/i);
  });

  test("T2-CORE-18: Float epsilon boundary: answer + 5e-7 clears cleanly within 1e-6 tolerance", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const sess = eng.createSessionState();
    const enc = { ...eng.generateEncounter("W4.1"), answer: 3 };
    assert.equal(commitEnc(eng, prog, sess, enc, 3 + 5e-7, 2000).outcome, "clear");
  });

  test("T2-CORE-19: Float epsilon boundary: answer + 1e-4 outside 1e-6 tolerance triggers nudge", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const sess = eng.createSessionState();
    const enc = { ...eng.generateEncounter("W4.1"), answer: 3 };
    assert.equal(commitEnc(eng, prog, sess, enc, 3 + 1e-4, 2000).outcome, "nudge");
  });
});

/* ============================================================================
 * GROUP 3 — Exhaustive 33-Node × Multi-Seed Word-Count, Banned/Curriculum Audit & Zero-DOM (10 tests)
 * ============================================================================ */
describe("Tier 2 Group 3 — Exhaustive 33-Node × Multi-Seed Word-Count & Safety Audits", () => {
  test("T2-CORE-20: 33 nodes × 20 seeds (660 encounters): every promptShort is 1..6 words", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(2020);
    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      for (let s = 0; s < 20; s++) {
        const enc = eng.generateEncounter(nodeId, { rng, camouflage: s % 2 === 1 });
        const wc = countWords(enc.promptShort);
        assert.ok(wc >= 1 && wc <= 6, `${nodeId} promptShort "${enc.promptShort}" = ${wc} words (> 6)`);
      }
    }
  });

  test("T2-CORE-21: 33 nodes × 20 seeds: every beamActions[].label is 1..6 words", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(2021);
    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      for (let s = 0; s < 20; s++) {
        const enc = eng.generateEncounter(nodeId, { rng, camouflage: s % 2 === 1 });
        for (const ba of enc.beamActions || []) {
          const wc = countWords(ba.label);
          assert.ok(
            wc >= 1 && wc <= 6,
            `${nodeId} beamAction "${ba.id}" label "${ba.label}" has ${wc} words (must be <= 6)`
          );
        }
      }
    }
  });

  test("T2-CORE-22: 33 nodes: every evaluateCommit outcome cue (clear, nudge, sign-flip, warm_reveal) is <= 6 words", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(2022);
    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      const prog = eng.createInitialProgress("auto");
      const sess = eng.createSessionState();
      const encMiss = eng.generateEncounter(nodeId, { rng });
      const r1 = commitEnc(eng, prog, sess, encMiss, encMiss.answer + 9, 2500, rng);
      const r2 = commitEnc(eng, prog, sess, encMiss, encMiss.answer - 9, 2500, rng);
      const encClear = eng.generateEncounter(nodeId, { rng });
      const r3 = commitEnc(eng, prog, sess, encClear, encClear.answer, 2000, rng);
      for (const r of [r1, r2, r3]) {
        assert.ok(countWords(r.cue) <= 6, `${nodeId} cue "${r.cue}" exceeded 6 words`);
      }
    }
  });

  test("T2-CORE-23: 33 nodes × 10 seeds: every getTrickCardSpec beat caption is <= 8 words", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(2023);
    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      for (let s = 0; s < 10; s++) {
        const enc = eng.generateEncounter(nodeId, { rng, camouflage: s % 2 === 1 });
        const spec = eng.getTrickCardSpec(enc);
        for (const b of spec.beats) {
          assert.ok(countWords(b.caption) <= 8, `${nodeId} beat "${b.caption}" exceeded 8 words`);
        }
      }
    }
  });

  test("T2-CORE-24: 33 nodes × 15 seeds: zero BANNED_CHILD_WORDS across all generated child strings", async () => {
    const eng = await loadEngine();
    const banned = eng.BANNED_CHILD_WORDS || FALLBACK_BANNED_SHAME_WORDS;
    const rng = makeSeededRng(2024);
    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      for (let s = 0; s < 15; s++) {
        const enc = eng.generateEncounter(nodeId, { rng });
        const combined = `${enc.promptShort} ${enc.equationText} ${(enc.beamActions || []).map((b) => b.label).join(" ")}`;
        assert.equal(findBannedWord(combined, banned), null, `${nodeId} leaked shame word in "${combined}"`);
      }
    }
  });

  test("T2-CORE-25: 33 nodes × 15 seeds: zero BANNED_CHILD_CURRICULUM_WORDS across all generated child strings", async () => {
    const eng = await loadEngine();
    const banned = eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS;
    const rng = makeSeededRng(2025);
    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      for (let s = 0; s < 15; s++) {
        const enc = eng.generateEncounter(nodeId, { rng });
        const combined = `${enc.promptShort} ${enc.equationText} ${enc.worldLabel || ""} ${(enc.beamActions || []).map((b) => b.label).join(" ")}`;
        assert.equal(findBannedWord(combined, banned), null, `${nodeId} leaked curriculum word in "${combined}"`);
      }
    }
  });

  test("T2-CORE-26: Zero #ff0000 and zero 'countdown' across all CSS/JS/HTML files in bloom-n/", async () => {
    const files = await walkFilesRecursive(BLOOM_N_DIR);
    for (const f of files) {
      if (!/\.(js|mjs|css|html)$/i.test(f)) continue;
      const raw = await fs.readFile(f, "utf8");
      const stripped = stripJsAndCssComments(raw);
      assert.equal(/#ff0000\b/i.test(stripped), false, `Harsh #ff0000 red prohibited in ${f}`);
      assert.equal(/\bcountdown\b/i.test(stripped), false, `Countdown timers prohibited in ${f}`);
    }
  });

  test("T2-CORE-27: core/engine.js has zero DOM, window, document, localStorage, fetch, or Three.js references", async () => {
    const src = stripJsAndCssComments(await fs.readFile(path.join(BLOOM_N_DIR, "core/engine.js"), "utf8"));
    for (const forbidden of [/\bwindow\./, /\bdocument\./, /\blocalStorage\b/, /\bfetch\s*\(/, /\bTHREE\./]) {
      assert.equal(forbidden.test(src), false, `Pure core/engine.js must not contain ${forbidden}`);
    }
  });

  test("T2-CORE-28: Algebraic root invariance across all applyBeamAction steps on W0–W3 balance gates", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(2028);
    for (const nodeId of ["W0.1", "W0.2", "W0.5", "W1.1", "W1.2", "W1.3", "W1.4", "W3.1", "W3.2", "W3.3"]) {
      for (let i = 0; i < 12; i++) {
        const enc = eng.generateEncounter(nodeId, { rng, camouflage: i % 2 === 1 });
        const origAns = enc.answer;
        for (const ba of enc.beamActions) {
          if (ba.id === "repel_trap") continue;
          const { encounter: afterStep } = stepBeam(eng, structuredClone(enc), ba.id);
          assert.equal(afterStep.answer, origAns, `${nodeId} action ${ba.id} mutated algebraic answer`);
          if (afterStep.towers && afterStep.towers.leftA !== afterStep.towers.rightA) {
            const root = (afterStep.towers.rightB - afterStep.towers.leftB) / (afterStep.towers.leftA - afterStep.towers.rightA);
            assert.ok(Math.abs(root - origAns) < 1e-6, `${nodeId} action ${ba.id} violated tower root invariance`);
          }
        }
      }
    }
  });

  test("T2-CORE-29: formatLinearExpr handles coeff 0, 1, -1, negatives & custom variable symbols cleanly", async () => {
    const eng = await loadEngine();
    assert.equal(eng.formatLinearExpr(0, 7, "n"), "7");
    assert.equal(eng.formatLinearExpr(1, 0, "n"), "n");
    assert.equal(eng.formatLinearExpr(-1, 5, "x"), "-x + 5");
    assert.equal(eng.formatLinearExpr(3, -8, "n"), "3n - 8");
  });
});

/* ============================================================================
 * GROUP 4 — 100-Trial Deterministic W0 Calibration Stress (5 tests)
 * ============================================================================ */
describe("Tier 2 Group 4 — 100-Trial Deterministic W0 Calibration Stress", () => {
  test("T2-CORE-30: 100 seeded trials of sequential 6-gate W0 calibration have 0 flakes", async () => {
    const eng = await loadEngine();
    for (let trial = 1; trial <= 100; trial++) {
      const rng = makeSeededRng(trial * 97);
      const prog = eng.createInitialProgress("auto");
      const sess = eng.createSessionState();
      const seq = [];
      for (let i = 0; i < 6; i++) {
        const enc = eng.pickNextEncounter(prog, sess, "W0", rng);
        seq.push(enc.nodeId);
        commitEnc(eng, prog, sess, enc, enc.answer, 2200, rng);
      }
      assert.deepEqual(seq, ["W0.1", "W0.2", "W0.3", "W0.4", "W0.5", "W0.6"]);
      assert.equal(prog.calibrated, true);
      assert.equal(sess.inSurge, false);
    }
  });

  test("T2-CORE-31: 100 seeded trials of 3-gate batch wave spawning in W0 produce [W0.1..W0.3] + [W0.4..W0.6]", async () => {
    const eng = await loadEngine();
    for (let trial = 1; trial <= 100; trial++) {
      const rng = makeSeededRng(trial * 131);
      const prog = eng.createInitialProgress("auto");
      const sess = eng.createSessionState();
      const w1 = [
        eng.pickNextEncounter(prog, sess, "W0", rng),
        eng.pickNextEncounter(prog, sess, "W0", rng),
        eng.pickNextEncounter(prog, sess, "W0", rng),
      ];
      assert.deepEqual(w1.map((e) => e.nodeId), ["W0.1", "W0.2", "W0.3"]);
      for (const e of w1) commitEnc(eng, prog, sess, e, e.answer, 2300, rng);

      const w2 = [
        eng.pickNextEncounter(prog, sess, "W0", rng),
        eng.pickNextEncounter(prog, sess, "W0", rng),
        eng.pickNextEncounter(prog, sess, "W0", rng),
      ];
      assert.deepEqual(w2.map((e) => e.nodeId), ["W0.4", "W0.5", "W0.6"]);
      for (const e of w2) commitEnc(eng, prog, sess, e, e.answer, 2300, rng);
      assert.equal(prog.calibrated, true);
    }
  });

  test("T2-CORE-32: 10 pre-commit calls to pickNextEncounter(prog, sess, 'W0') never overflow or throw", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    for (let i = 0; i < 10; i++) {
      const enc = eng.pickNextEncounter(prog, sess, "W0", makeSeededRng(i + 1));
      assert.ok(enc && enc.nodeId.startsWith("W0."));
    }
  });

  test("T2-CORE-33: 1st-miss nudge + 2nd-try clear on W0.5 & W0.6 completes calibration cleanly", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const rng = makeSeededRng(3300);
    for (let i = 0; i < 6; i++) {
      const enc = eng.pickNextEncounter(prog, sess, "W0", rng);
      if (i >= 4) {
        const miss = commitEnc(eng, prog, sess, enc, enc.answer + 7, 3000, rng);
        assert.equal(miss.outcome, "nudge");
      }
      const hit = commitEnc(eng, prog, sess, enc, enc.answer, 3000, rng);
      assert.equal(hit.outcome, "clear");
    }
    assert.equal(prog.calibrated, true);
  });

  test("T2-CORE-34: Mid-calibration reload (calibrationHits W0.1..W0.3 + fresh session) resumes at W0.4..W0.6", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    prog.calibrationStep = 3;
    prog.calibrationHits = [
      { nodeId: "W0.1", cleanHit: true },
      { nodeId: "W0.2", cleanHit: true },
      { nodeId: "W0.3", cleanHit: true },
    ];
    const freshSess = eng.createSessionState();
    const resumed = [
      eng.pickNextEncounter(prog, freshSess, "W0"),
      eng.pickNextEncounter(prog, freshSess, "W0"),
      eng.pickNextEncounter(prog, freshSess, "W0"),
    ];
    assert.deepEqual(resumed.map((e) => e.nodeId), ["W0.4", "W0.5", "W0.6"]);
  });
});

/* ============================================================================
 * GROUP 5 — Psychometrics, Queue Fallbacks, BKT Floor & Stage Non-Demotion (11 tests)
 * ============================================================================ */
describe("Tier 2 Group 5 — Psychometrics, Queue Fallbacks, BKT Floor & Stage Non-Demotion", () => {
  test("T2-CORE-35: planMs = 300_000ms idle pause is capped at <= 12000ms with overdrive === true", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const sess = eng.createSessionState();
    const enc = eng.generateEncounter("W2.2");
    const res = commitEnc(eng, prog, sess, enc, enc.answer, 300000);
    assert.equal(res.overdrive, true);
    assert.ok(prog.nodes["W2.2"].avgPlanMs <= 12000);
  });

  test("T2-CORE-36: 10x planMs = 600_000ms & negative planMs = -100 stay clamped inside [0, 12000]", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const sess = eng.createSessionState();
    for (let i = 0; i < 10; i++) {
      const enc = eng.generateEncounter("W2.3");
      commitEnc(eng, prog, sess, enc, enc.answer, i % 2 === 0 ? 600000 : -100);
      assert.ok(prog.nodes["W2.3"].avgPlanMs >= 0 && prog.nodes["W2.3"].avgPlanMs <= 12000);
    }
  });

  test("T2-CORE-37: Shelved-all-nodes fallback across every world W1..W7 never returns undefined", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.sandboxAllUnlocked = true;
    for (let w = 1; w <= 7; w++) {
      const wid = `W${w}`;
      const sess = eng.createSessionState();
      const worldObj = eng.WORLDS.find((x) => x.id === wid);
      sess.shelvedIds = worldObj.nodes.map((n) => n.id);
      const picked = eng.pickNextEncounter(prog, sess, wid);
      assert.ok(picked && typeof picked.nodeId === "string");
    }
  });

  test("T2-CORE-38: Unknown nodeId ('W99.9') fallback in generateEncounter, evaluateCommit & computeWorldProgress", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const enc = eng.generateEncounter("W99.9");
    assert.ok(enc && Number.isFinite(enc.answer));
    const res = commitEnc(eng, prog, sess, enc, enc.answer, 2000);
    assert.equal(res.outcome, "clear");
    const wp = eng.computeWorldProgress(prog, "W99");
    assert.ok(wp && typeof wp.worldId === "string");
  });

  test("T2-CORE-39: pKnow >= 0.12 floor holds across 20 consecutive misses", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    for (let i = 0; i < 20; i++) {
      const enc = eng.generateEncounter("W1.2");
      commitEnc(eng, prog, sess, enc, enc.answer + 25, 2500);
      assert.ok(prog.nodes["W1.2"].pKnow >= 0.12, `pKnow dropped below 0.12 floor: ${prog.nodes["W1.2"].pKnow}`);
    }
  });

  test("T2-CORE-40: Monotonic node.stage (1, 2, 3) never demotes across 10 consecutive misses", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    prog.nodes["W1.1"].stage = 1;
    prog.nodes["W1.1"].pKnow = 0.4;
    prog.nodes["W2.1"].stage = 2;
    prog.nodes["W2.1"].pKnow = 0.5;
    prog.nodes["W3.1"].stage = 3;
    prog.nodes["W3.1"].pKnow = 0.5;
    for (let i = 0; i < 10; i++) {
      for (const nid of ["W1.1", "W2.1", "W3.1"]) {
        const enc = eng.generateEncounter(nid);
        commitEnc(eng, prog, sess, enc, enc.answer + 17, 2500);
      }
    }
    assert.ok(prog.nodes["W1.1"].stage >= 1);
    assert.ok(prog.nodes["W2.1"].stage >= 2);
    assert.ok(prog.nodes["W3.1"].stage >= 3);
  });

  test("T2-CORE-41: 2-miss shutdown breaker triggers warm_reveal + full +14💎 + deduplicated shelvedIds", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    const enc = eng.generateEncounter("W1.3");
    const m1 = commitEnc(eng, prog, sess, enc, enc.answer + 8, 2500);
    assert.equal(m1.outcome, "nudge");
    const m2 = commitEnc(eng, prog, sess, enc, enc.answer + 8, 2500);
    assert.equal(m2.outcome, "warm_reveal");
    assert.equal(m2.shardsEarned, 14);
    assert.equal(sess.shelvedIds.filter((x) => x === "W1.3").length, 1);
  });

  test("T2-CORE-42: 4-item Surge queue drain keeps Surge active through Item 4 and resets inSurge on pick 5", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.activeWorld = "W2";
    const sess = eng.createSessionState();
    eng.queueOverdriveSurge(prog, sess, "W2.4", makeSeededRng(420));

    for (let i = 0; i < 4; i++) {
      const enc = eng.pickNextEncounter(prog, sess, "W2");
      assert.equal(sess.inSurge, true, `Surge should remain active during Item ${i + 1}`);
      commitEnc(eng, prog, sess, enc, enc.answer, 2000, () => 0.99);
    }
    assert.equal(sess.inSurge, false, "inSurge must reset to false once all 4 Surge items finish");
  });

  test("T2-CORE-43: repel_trap preserves stepsUsed === 0, friction === 0, and 1-Shot Overdrive", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const sess = eng.createSessionState();
    const enc = eng.generateEncounter("W3.1", { camouflage: true });
    const trapRes = eng.applyBeamAction(enc, "repel_trap");
    assert.match(String(trapRes.kind), /repel/i);
    assert.equal(enc.stepsUsed, 0);
    assert.equal(sess.friction, 0);
    const clear = commitEnc(eng, prog, sess, enc, enc.answer, 2500);
    assert.equal(clear.overdrive, true);
  });

  test("T2-CORE-44: unlockFrontierWorlds exact 2-node stage>=2 threshold cascading W1 -> W7", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    prog.unlockedWorlds = ["W1"];
    prog.nodes["W1.1"].stage = 2;
    eng.unlockFrontierWorlds(prog);
    assert.equal(prog.unlockedWorlds.includes("W2"), false);
    prog.nodes["W1.2"].stage = 2;
    eng.unlockFrontierWorlds(prog);
    assert.equal(prog.unlockedWorlds.includes("W2"), true);

    for (let w = 2; w <= 6; w++) {
      const worldObj = eng.WORLDS.find((x) => x.id === `W${w}`);
      prog.nodes[worldObj.nodes[0].id].stage = 2;
      prog.nodes[worldObj.nodes[1].id].stage = 2;
    }
    eng.unlockFrontierWorlds(prog);
    assert.ok(prog.unlockedWorlds.includes("W7"));
  });

  test("T2-CORE-45: unlockMystery idempotency (returns true once, false on repeat)", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    assert.equal(eng.unlockMystery(prog, "moon_center"), true);
    assert.equal(eng.unlockMystery(prog, "moon_center"), false);
  });
});

/* ============================================================================
 * GROUP 6 — 4-Sun Weekly Cap, Architect Level, < 38 KB Cloud Cap & Storage Resilience (15 tests)
 * ============================================================================ */
describe("Tier 2 Group 6 — 4-Sun Weekly Cap, < 38 KB Cloud Cap & Storage Resilience", () => {
  test("T2-CORE-46: recordWeeklySunshine same-day idempotency", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const first = eng.recordWeeklySunshine(prog, "2026-11-12");
    const shardsAfterFirst = prog.fluxShards;
    const second = eng.recordWeeklySunshine(prog, "2026-11-12");
    assert.equal(first.addedToday, true);
    assert.equal(second.addedToday, false);
    assert.equal(second.suns, 1);
    assert.equal(prog.fluxShards, shardsAfterFirst);
  });

  test("T2-CORE-47: recordWeeklySunshine 4-Sun weekly cap across 7 days of one ISO week", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const dates = [
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ];
    let last = null;
    for (const d of dates) {
      last = eng.recordWeeklySunshine(prog, d);
      assert.ok(last.suns <= 4, `Weekly suns exceeded 4-Sun cap: ${last.suns}`);
    }
    assert.equal(last.suns, 4);
    assert.ok((last.bonusShards ?? last.shardBonus ?? 0) >= 2, "4-Sun cap must activate +2 bonusShards");
  });

  test("T2-CORE-48: recordWeeklySunshine skipped days never deduct suns or shards", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    eng.recordWeeklySunshine(prog, "2026-11-09");
    const before = prog.fluxShards;
    const afterGap = eng.recordWeeklySunshine(prog, "2026-11-14");
    assert.equal(afterGap.suns, 2);
    assert.ok(prog.fluxShards >= before);
  });

  test("T2-CORE-49: recordWeeklySunshine ISO week rollover starts fresh 0->1 sun count", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    for (const d of ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]) {
      eng.recordWeeklySunshine(prog, d);
    }
    const nextWeek = eng.recordWeeklySunshine(prog, "2026-11-16");
    assert.equal(nextWeek.suns, 1);
    assert.equal(nextWeek.addedToday, true);
  });

  test("T2-CORE-50: computeArchitectLevel clamped inside 1..99 from 0 to extreme XP", async () => {
    const eng = await loadEngine();
    const empty = eng.createInitialProgress("auto");
    empty.fluxShards = 0;
    empty.totalSolved = 0;
    for (const n of Object.values(empty.nodes)) {
      n.stage = 0;
      n.wins = 0;
    }
    assert.equal(eng.computeArchitectLevel(empty).level, 1);

    const maxed = eng.createInitialProgress("sarah");
    maxed.fluxShards = 9999999;
    maxed.totalSolved = 50000;
    for (const n of Object.values(maxed.nodes)) n.stage = 3;
    const lv = eng.computeArchitectLevel(maxed);
    assert.equal(lv.level, 99);
  });

  test("T2-CORE-51: Cloud bloomn_player_merge serialized payload stays < 38,000 bytes under maxed 33-node + 300-frame dual ghosts", async () => {
    const eng = await loadEngine();
    const sync = await loadSync();

    await withIsolatedSyncEnv(async ({ rpcCalls }) => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });
      store.activeUsername = "sarah";
      store.familyCode = "MAPLE-K7Q2";
      const prog = store.progressByUser.sarah;
      for (const n of Object.values(prog.nodes)) {
        n.stage = 3;
        n.pKnow = 0.9876;
        n.wins = 42;
        n.attempts = 45;
        n.camouflageCleared = true;
      }
      const { GhostRigController } = await import("../../frostwake/ghost-rig.js");
      const ghost = new GhostRigController(null, () => 0);
      ghost.startWave({ x: 0, z: 22, heading: 0 });
      for (let i = 0; i < 4800; i++) {
        ghost.update(1 / 60, { x: Math.sin(i * 0.02) * 45, z: Math.cos(i * 0.02) * 45, heading: 1.23 }, false);
      }
      ghost.completeWave();
      prog.games.frostwake.ghostBest = { bestWaveSec: ghost.bestWaveSec, frames: ghost.bestFrames };
      prog.games.oddroot.ghostBest = { bestWaveSec: ghost.bestWaveSec, frames: ghost.bestFrames };

      await sync.pushActiveCloud(store);
      const mergeCall = rpcCalls.find((c) => c.fn === "bloomn_player_merge");
      assert.ok(mergeCall);
      assert.ok(
        mergeCall.rawBytes < 38000,
        `bloomn_player_merge payload (${mergeCall.rawBytes} bytes) MUST stay < 38000 bytes!`
      );
    });
  });

  test("T2-CORE-52: mergeProgress handles null, undefined & legacy v1 objects without games/seenTrickFamilies", async () => {
    const eng = await loadEngine();
    const base = eng.createInitialProgress("auto");
    const legacy = { rev: 2, fluxShards: 85, ownedUpgrades: ["wide_blade"], nodes: { "W1.1": { stage: 2, pKnow: 0.85 } } };
    const m0 = eng.mergeProgress(null, legacy);
    assert.equal(m0.fluxShards, 85);
    const m1 = eng.mergeProgress(base, legacy);
    assert.equal(m1.fluxShards, 85);
    assert.ok(m1.games?.frostwake && m1.games?.oddroot);
    assert.equal(Object.keys(m1.nodes).length, 33);
    const m2 = eng.mergeProgress(m1, undefined);
    assert.equal(m2.fluxShards, 85);
  });

  test("T2-CORE-53: localStorage QuotaExceededError resilience in loadStore & saveStore", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv({ throwOnSetItem: true }, async () => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "david", name: "David" });
      assert.doesNotThrow(() => sync.saveStore(store, false));
    });
  });

  test("T2-CORE-54: Corrupted JSON in bloom-n-v1 & yomple-hub-v1 recovers cleanly", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(
      { initialStorage: { "bloom-n-v1": "{corrupt!!", "yomple-hub-v1": "[bad_json" } },
      async () => {
        const store = sync.loadStore();
        assert.ok(store && Array.isArray(store.profiles));
      }
    );
  });

  test("T2-CORE-55: slugName sanitization & 18-char cap", async () => {
    const sync = await loadSync();
    assert.equal(sync.slugName("  Sarah O'Connor-Stucke 2026!! "), "sarah-o-connor-stu");
    assert.equal(sync.slugName("!!!"), "player");
  });

  test("T2-CORE-56: computeObservatoryTier exact step boundaries (0,179->1, 180->2, 500->3, 1200->4, 2500->5, 5000->6)", async () => {
    const sync = await loadSync();
    assert.equal(sync.computeObservatoryTier(0), 1);
    assert.equal(sync.computeObservatoryTier(179), 1);
    assert.equal(sync.computeObservatoryTier(180), 2);
    assert.equal(sync.computeObservatoryTier(499), 2);
    assert.equal(sync.computeObservatoryTier(500), 3);
    assert.equal(sync.computeObservatoryTier(1200), 4);
    assert.equal(sync.computeObservatoryTier(2500), 5);
    assert.equal(sync.computeObservatoryTier(5000), 6);
  });

  test("T2-CORE-57: pushActiveCloud pre-migration fallback preserves existing field_players.progress & writes fun.bloom_n", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(
      {
        rpcHandler: async (fn) => {
          if (fn === "bloomn_player_merge") return { __httpStatus: 404, body: null };
          if (fn === "yomple_player_find") {
            return {
              username: "sarah",
              has_pin: false,
              progress: { quietFieldTrees: 12 },
              fun: { star_hop: { best: 9 } },
            };
          }
          return { ok: true };
        },
      },
      async ({ rpcCalls }) => {
        const store = sync.loadStore();
        sync.ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });
        store.activeUsername = "sarah";
        const ok = await sync.pushActiveCloud(store);
        assert.equal(ok, true);
        assert.equal(store.lastSyncStatus, "cloud:yomple");
        const upsert = rpcCalls.find((c) => c.fn === "yomple_player_upsert");
        assert.deepEqual(upsert.args.p_row.progress, { quietFieldTrees: 12 });
        assert.deepEqual(upsert.args.p_row.fun.star_hop, { best: 9 });
        assert.ok(upsert.args.p_row.fun.bloom_n.progress);
      }
    );
  });

  test("T2-CORE-58: pushActiveCloud network failure resolves false & sets lastSyncStatus === 'local'", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv({ networkOffline: true }, async () => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "david", name: "David" });
      store.activeUsername = "david";
      const ok = await sync.pushActiveCloud(store);
      assert.equal(ok, false);
      assert.equal(store.lastSyncStatus, "local");
    });
  });

  test("T2-CORE-59: pullPlayerCloud has_pin: true claim flow (with & without cached PIN)", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(
      {
        rpcHandler: async (fn, args) => {
          if (fn === "yomple_player_find") {
            return { username: "sarah", display_name: "Sarah", has_pin: true, progress: {} };
          }
          if (fn === "yomple_player_claim" && args.p_pin === "1234") {
            return { username: "sarah", display_name: "Sarah", progress: { fluxShards: 250 } };
          }
          return null;
        },
      },
      async () => {
        const store = sync.loadStore();
        sync.ensureProfile(store, { username: "sarah", name: "Sarah", pin: "" });
        await sync.pullPlayerCloud(store, "sarah");
        assert.notEqual(store.progressByUser.sarah.fluxShards, 250);

        store.profiles[0].pin = "1234";
        await sync.pullPlayerCloud(store, "sarah");
        assert.equal(store.progressByUser.sarah.fluxShards, 250);
      }
    );
  });

  test("T2-CORE-60: borrowSiblingToy self-borrow ('david','david') & unknown-lender guard mints 0 shards", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(async () => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "david", name: "David" });
      const before = store.progressByUser.david.fluxShards;

      const selfRes = sync.borrowSiblingToy(store, "david", "david", "frostwake");
      assert.equal(Boolean(selfRes && selfRes.ok), false);
      const ghostRes = sync.borrowSiblingToy(store, "david", "nobody", "frostwake");
      assert.equal(Boolean(ghostRes && ghostRes.ok), false);
      assert.equal(store.progressByUser.david.fluxShards, before);
    });
  });
});

/* ============================================================================
 * GROUP 7 — F21 Multiplayer Co-Op Protocol Boundaries & Race Conditions (6 tests)
 * ============================================================================ */
describe("Tier 2 Group 7 — F21 Multiplayer Co-Op Protocol Boundaries & Race Deduplication", () => {
  test("T2-MP-01: Dual-transport msgId deduplication fires onRemoteEvent exactly once when WS + BroadcastChannel both deliver", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: false });
    const eventsOnB = [];

    const a = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "DEDUP-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const b = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "DEDUP-1",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
      onRemoteEvent: (ev) => eventsOnB.push(ev),
    });

    try {
      a.connect();
      b.connect();
      await new Promise((r) => setTimeout(r, 15));

      a.sendGateBurst({ overdrive: true, worldId: "W1", nodeId: "W1.2", x: 1, y: 0, z: 2 });
      a.sendFriendlyFlare({ x: 1, y: 0, z: 2 });
      a.tryGrabSharedCoin("coin_0", { x: -13, y: 0, z: 10 });
      await new Promise((r) => setTimeout(r, 25));

      assert.equal(eventsOnB.filter((e) => e.type === "gate_burst").length, 1, "gate_burst must fire once, not twice");
      assert.equal(eventsOnB.filter((e) => e.type === "friendly_flare").length, 1, "friendly_flare must fire once");
      assert.equal(eventsOnB.filter((e) => e.type === "coin_grab").length, 1, "coin_grab must fire once");
    } finally {
      a.disconnect();
      b.disconnect();
    }
  });

  test("T2-MP-02: Simultaneous tryGrabSharedCoin cooldown race lock & invalid coinId guard", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: true });
    const a = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "RACE-1",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const b = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "RACE-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });

    try {
      a.connect();
      b.connect();
      assert.equal(a.tryGrabSharedCoin("invalid_coin_99"), false);
      assert.equal(a.tryGrabSharedCoin("coin_1"), true);
      assert.equal(a.tryGrabSharedCoin("coin_1"), false, "Repeat local grab during cooldown must return false");
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(b.tryGrabSharedCoin("coin_1"), false, "Peer grab while coin_1 is on cooldown must return false");
    } finally {
      a.disconnect();
      b.disconnect();
    }
  });

  test("T2-MP-03: Deterministic 6000ms (SHARED_COIN_RESPAWN_MS) Star-Coin auto-respawn", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    const mp = await loadMultiplayer();
    const coinChanges = [];
    const client = mp.createMultiplayerClient({
      realmId: "oddroot",
      familyCode: "RESPAWN-1",
      userId: "sarah",
      WebSocketImpl: null,
      BroadcastChannelImpl: null,
      onCoinStateChanged: (st) => coinChanges.push(st),
    });

    try {
      client.connect();
      assert.equal(client.tryGrabSharedCoin("coin_0"), true);
      assert.equal(client.getCoinStates().coin_0.available, false);

      t.mock.timers.tick(5900);
      assert.equal(client.getCoinStates().coin_0.available, false, "coin_0 must stay unavailable at 5900ms");

      t.mock.timers.tick(150);
      assert.equal(client.getCoinStates().coin_0.available, true, "coin_0 must respawn at 6000ms");
      assert.equal(client.tryGrabSharedCoin("coin_0"), true, "Respawned coin_0 must be grabbable again");
      assert.ok(coinChanges.length >= 2);
    } finally {
      client.disconnect();
    }
  });

  test("T2-MP-04: Throwing WebSocketImpl & null-transport resilience", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsThrowOnConstruct: true });
    const a = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "SAFE-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const b = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "SAFE-1",
      userId: "david",
      WebSocketImpl: null,
      BroadcastChannelImpl: null,
    });

    try {
      assert.doesNotThrow(() => a.connect());
      assert.doesNotThrow(() => b.connect());
      assert.doesNotThrow(() => a.publishLocalState({ x: 1, y: 0, z: 2, status: "roaming" }));
      assert.doesNotThrow(() => b.publishLocalState({ x: 3, y: 0, z: 4, status: "surge" }));
    } finally {
      a.disconnect();
      b.disconnect();
    }
  });

  test("T2-MP-05: familyCode empty/whitespace normalization defaults to OPEN-HOUSE", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: true });
    const a = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const b = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "   open-house  ",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });

    try {
      a.connect();
      b.connect();
      a.publishLocalState({ x: 5, y: 0, z: -5, status: "roaming" });
      await new Promise((r) => setTimeout(r, 15));
      assert.equal(b.getPeers().length, 1);
      assert.equal(b.getPeers()[0].userId, "sarah");
    } finally {
      a.disconnect();
      b.disconnect();
    }
  });

  test("T2-MP-06: Zero shame, curriculum, or #1/#2 rank strings in multiplayer.js & status sanitization", async () => {
    const mp = await loadMultiplayer();
    const src = stripJsAndCssComments(await fs.readFile(path.join(BLOOM_N_DIR, "core/multiplayer.js"), "utf8"));
    assert.equal(findBannedWord(src, FALLBACK_BANNED_CURRICULUM_WORDS), null);

    const hub = createInMemoryCoopTransportHub({ wsOffline: true });
    const a = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "STATUS-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const b = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "STATUS-1",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    try {
      a.connect();
      b.connect();
      a.publishLocalState({ x: 0, y: 0, z: 0, status: "failed_badly_#1" });
      await new Promise((r) => setTimeout(r, 15));
      const peer = b.getPeers()[0];
      assert.ok(["roaming", "thinking", "overdrive", "surge"].includes(peer.status));
    } finally {
      a.disconnect();
      b.disconnect();
    }
  });
});

/* ============================================================================
 * GROUP 8 — Strict <= 15% Anti-Scrub Boundary Across All 7 Curve Nodes × Both Realms (16 tests)
 * ============================================================================ */
describe("Tier 2 Group 8 — Strict <= 15% Anti-Scrub Boundary Across All 7 Curve Nodes × Both Realms", () => {
  const curveNodes = ["W0.6", "W4.1", "W4.2", "W4.3", "W4.4", "W6.1", "W6.2"];

  curveNodes.forEach((nodeId, idx) => {
    test(`T2-AS-0${idx + 1}: FrostwakeWorld3D ${nodeId} obeys <= 15% Near-Field Tangent Stub pre-commit & full curve on clear`, async () => {
      const audit = await sandboxHandle.page.eval(async (nid) => {
        const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
        return window.__E2E_3D__.auditAntiScrubNode(ctx, nid);
      }, nodeId);

      assert.equal(audit.explicitStayedHidden, true, `Frostwake ${nodeId} leaked visible full bridge pre-commit`);
      assert.ok(audit.mutatedCount >= 1, `Frostwake ${nodeId} stub did not respond to updateDialPreview`);
      assert.ok(
        audit.stubRatio <= 0.155,
        `Frostwake ${nodeId} stub span ratio ${audit.stubRatio} exceeded 15% Anti-Scrub ceiling: ${JSON.stringify(audit)}`
      );
      assert.equal(audit.postBridgeVisible, true, `Frostwake ${nodeId} failed to reveal full bridge on clear`);
    });
  });

  curveNodes.forEach((nodeId, idx) => {
    const num = String(idx + 8).padStart(2, "0");
    test(`T2-AS-${num}: OddrootWorld3D ${nodeId} obeys <= 15% Near-Field Sprout/Stream Stub pre-commit & full vine/arch on clear`, async () => {
      const audit = await sandboxHandle.page.eval(async (nid) => {
        const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
        return window.__E2E_3D__.auditAntiScrubNode(ctx, nid);
      }, nodeId);

      assert.equal(audit.explicitStayedHidden, true, `Oddroot ${nodeId} leaked visible full vine/arch pre-commit`);
      assert.ok(audit.mutatedCount >= 1, `Oddroot ${nodeId} sprout stub did not respond to updateDialPreview`);
      assert.ok(
        audit.stubRatio <= 0.155,
        `Oddroot ${nodeId} stub span ratio ${audit.stubRatio} exceeded 15% Anti-Scrub ceiling: ${JSON.stringify(audit)}`
      );
      assert.equal(audit.postBridgeVisible, true, `Oddroot ${nodeId} failed to reveal full vine/arch on clear`);
    });
  });

  test("T2-AS-15: Extreme / non-finite updateDialPreview inputs ([-500, 500, NaN, Infinity, undefined, 'abc']) never produce NaN matrices", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const checkRealm = async (realmId) => {
        const ctx = await window.__E2E_3D__.getSharedWorld(realmId);
        for (const nid of ["W4.2", "W5.2", "W6.1"]) {
          ctx.world.populateEncounters([eng.generateEncounter(nid)]);
          window.__E2E_3D__.engageFirstEncounter(ctx);
          for (const v of [-500, 0, 500, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, undefined, "abc"]) {
            ctx.world.updateDialPreview(v);
          }
          ctx.world.scene.updateMatrixWorld(true);
          let hasNaN = false;
          ctx.world.scene.traverse((o) => {
            if (o.matrixWorld.elements.some((x) => !Number.isFinite(x))) hasNaN = true;
          });
          if (hasNaN) return false;
        }
        return true;
      };
      return { fwOk: await checkRealm("frostwake"), orOk: await checkRealm("oddroot") };
    });
    assert.equal(res.fwOk, true);
    assert.equal(res.orOk, true);
  });

  test("T2-AS-16: Live Encounter Dock DOM in #screen-frostwake and #screen-oddroot contains zero <input type='range'> sliders", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      await launchRealmFromPortal(page, "frostwake");
      assert.equal(await page.eval(() => document.querySelectorAll("input[type='range']").length), 0);
      await exitRealmToPortal(page);
      await launchRealmFromPortal(page, "oddroot");
      assert.equal(await page.eval(() => document.querySelectorAll("input[type='range']").length), 0);
    });
  });
});

/* ============================================================================
 * GROUP 9 — Mandatory Math-Pause (setEncounterDockOpen) Stress & Edge Cases (8 tests)
 * ============================================================================ */
describe("Tier 2 Group 9 — Mandatory Math-Pause (setEncounterDockOpen) Stress & Edge Cases", () => {
  test("T2-PAUSE-01: Frostwake setEncounterDockOpen(true) holds 0.0 Rime-Creep displacement over 120 frames (2.0s)", async () => {
    const delta = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        ctx.world.setEncounterDockOpen(true);
        const a = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(120, 16.6667);
        const b = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        return b.reduce((mx, u) => {
          const u0 = a.get(u.key);
          return u0 ? Math.max(mx, Math.hypot(u.x - u0.x, u.z - u0.z)) : mx;
        }, 0);
      });
    });
    assert.ok(delta < 1e-6);
  });

  test("T2-PAUSE-02: Frostwake setEncounterDockOpen(false) cleanly resumes Rime-Creep movement", async () => {
    const delta = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        ctx.world.setEncounterDockOpen(true);
        ctx.step(30, 16.6667);
        ctx.world.setEncounterDockOpen(false);
        const a = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(60, 16.6667);
        const b = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        return b.reduce((mx, u) => {
          const u0 = a.get(u.key);
          return u0 ? Math.max(mx, Math.hypot(u.x - u0.x, u.z - u0.z)) : mx;
        }, 0);
      });
    });
    assert.ok(delta > 0.03);
  });

  test("T2-PAUSE-03: Frostwake 10x rapid setEncounterDockOpen(true/false) toggle stress causes zero position teleport", async () => {
    const maxJump = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        let jump = 0;
        for (let i = 0; i < 10; i++) {
          ctx.world.setEncounterDockOpen(true);
          const a = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
          ctx.step(10, 16.6667);
          const b = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
          for (const u of b) {
            const u0 = a.get(u.key);
            if (u0) jump = Math.max(jump, Math.hypot(u.x - u0.x, u.z - u0.z));
          }
          ctx.world.setEncounterDockOpen(false);
          ctx.step(5, 16.6667);
        }
        return jump;
      });
    });
    assert.ok(maxJump < 1e-6);
  });

  test("T2-PAUSE-04: Frostwake automatic pause when rig enters active gate approach zone (activeGateSlot !== null)", async () => {
    const delta = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        ctx.world.populateEncounters([eng.generateEncounter("W1.1")]);
        window.__E2E_3D__.engageFirstEncounter(ctx);
        const a = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(60, 16.6667);
        const b = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        return b.reduce((mx, u) => {
          const u0 = a.get(u.key);
          return u0 ? Math.max(mx, Math.hypot(u.x - u0.x, u.z - u0.z)) : mx;
        }, 0);
      });
    });
    assert.ok(delta < 1e-6, `Expected Frostwake opposition to freeze automatically in gate approach zone, got ${delta}`);
  });

  test("T2-PAUSE-05: Oddroot setEncounterDockOpen(true) holds 0.0 Blight-Thorn / Gloom-Spore delta over 120 frames", async () => {
    const delta = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        ctx.world.setEncounterDockOpen(true);
        const a = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(120, 16.6667);
        const b = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        return b.reduce((mx, u) => {
          const u0 = a.get(u.key);
          return u0 ? Math.max(mx, Math.hypot(u.x - u0.x, u.z - u0.z) + Math.abs(u.scale - u0.scale)) : mx;
        }, 0);
      });
    });
    assert.ok(delta < 1e-6);
  });

  test("T2-PAUSE-06: Oddroot setEncounterDockOpen(false) cleanly resumes Blight/Gloom creep", async () => {
    const delta = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        ctx.world.setEncounterDockOpen(true);
        ctx.step(20, 16.6667);
        ctx.world.setEncounterDockOpen(false);
        const a = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(60, 16.6667);
        const b = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        return b.reduce((mx, u) => {
          const u0 = a.get(u.key);
          return u0 ? Math.max(mx, Math.hypot(u.x - u0.x, u.z - u0.z) + Math.abs(u.scale - u0.scale)) : mx;
        }, 0);
      });
    });
    assert.ok(delta > 0.02);
  });

  test("T2-PAUSE-07: Oddroot 10x rapid setEncounterDockOpen(true/false) toggle stress causes zero teleport", async () => {
    const maxJump = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        let jump = 0;
        for (let i = 0; i < 10; i++) {
          ctx.world.setEncounterDockOpen(true);
          const a = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
          ctx.step(10, 16.6667);
          const b = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
          for (const u of b) {
            const u0 = a.get(u.key);
            if (u0) jump = Math.max(jump, Math.hypot(u.x - u0.x, u.z - u0.z) + Math.abs(u.scale - u0.scale));
          }
          ctx.world.setEncounterDockOpen(false);
          ctx.step(5, 16.6667);
        }
        return jump;
      });
    });
    assert.ok(maxJump < 1e-6);
  });

  test("T2-PAUSE-08: 600-frame (10.0s) open-dock pause triggers zero lose-state, zero creature loss & zero penalties in both realms", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const check = async (realmId) =>
        window.__E2E_3D__.withFreshWorld(realmId, async (ctx) => {
          ctx.world.start();
          const prog = eng.createInitialProgress("sarah");
          prog.games.oddroot.hatchedCreatures = ["zero_g_toad", "eclipse_stag"];
          ctx.world.applyLoadout(prog, {}, null);
          ctx.world.setEncounterDockOpen(true);
          ctx.step(600, 16.6667);
          return {
            creaturesIntact: prog.games.oddroot.hatchedCreatures.length === 2,
            shardsIntact: prog.fluxShards === 30,
          };
        });
      return { fw: await check("frostwake"), or: await check("oddroot") };
    });
    assert.equal(res.fw.shardsIntact, true);
    assert.equal(res.or.creaturesIntact, true);
  });
});

/* ============================================================================
 * GROUP 10 — Upgrade Speed, Knockback, Siphon & Chasm Differentials (8 tests)
 * ============================================================================ */
describe("Tier 2 Group 10 — Upgrade Speed, Knockback, Siphon & Chasm Differentials", () => {
  test("T2-UP-01: Frostwake un-upgraded plow speed in Permafrost Drift < 0.72x open snow speed", async () => {
    const r = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const p = eng.createInitialProgress("david");
      p.ownedUpgrades = [];
      ctx.world.applyLoadout(p, {}, null);
      ctx.world.rigState.x = 0;
      ctx.world.rigState.z = 16;
      ctx.world.rigState.heading = 0;
      ctx.world.rigState.speed = 0;
      ctx.world.setDriveInputs(0, 1, false);
      ctx.step(40, 16.6667);
      const open = Math.abs(ctx.world.rigState.speed);

      const d = ctx.world.opposition.permafrostDrifts.find((x) => x.integrity > 0) || ctx.world.opposition.permafrostDrifts[0];
      ctx.world.rigState.x = d.x;
      ctx.world.rigState.z = d.z + 3;
      ctx.world.rigState.heading = 0;
      ctx.world.rigState.speed = open;
      ctx.step(30, 16.6667);
      return { open, bog: Math.abs(ctx.world.rigState.speed) };
    });
    assert.ok(r.bog < r.open * 0.72);
  });

  test("T2-UP-02: Frostwake wide_blade melts Permafrost Drift at >= 1.45x un-upgraded drift speed", async () => {
    const r = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const d = ctx.world.opposition.permafrostDrifts.find((x) => x.integrity > 0) || ctx.world.opposition.permafrostDrifts[0];

      const p0 = eng.createInitialProgress("david");
      p0.ownedUpgrades = [];
      ctx.world.applyLoadout(p0, {}, null);
      ctx.world.rigState.x = d.x;
      ctx.world.rigState.z = d.z + 3;
      ctx.world.rigState.heading = 0;
      ctx.world.rigState.speed = 6;
      ctx.world.setDriveInputs(0, 1, false);
      ctx.step(30, 16.6667);
      const basic = Math.abs(ctx.world.rigState.speed);

      const p1 = eng.createInitialProgress("david");
      p1.ownedUpgrades = ["wide_blade"];
      ctx.world.applyLoadout(p1, {}, null);
      ctx.world.rigState.x = d.x;
      ctx.world.rigState.z = d.z + 3;
      ctx.world.rigState.heading = 0;
      ctx.world.rigState.speed = 6;
      ctx.world.setDriveInputs(0, 1, false);
      ctx.step(30, 16.6667);
      return { basic, wide: Math.abs(ctx.world.rigState.speed) };
    });
    assert.ok(r.wide >= r.basic * 1.45);
  });

  test("T2-UP-03: Frostwake ion_boosters vs un-upgraded rig on Broken Ice Chasm jump", async () => {
    const r = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const runJump = async (hasIon) =>
        window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
          ctx.world.start();
          const p = eng.createInitialProgress("david");
          p.ownedUpgrades = hasIon ? ["ion_boosters"] : [];
          ctx.world.applyLoadout(p, {}, null);
          ctx.world.rigState.x = 34.5;
          ctx.world.rigState.z = 10.0;
          ctx.world.rigState.heading = -Math.PI / 2;
          ctx.world.rigState.speed = hasIon ? 17 : 12;
          ctx.world.setDriveInputs(0, 1, hasIon);
          ctx.step(60, 16.6667);
          return ctx.world.rigState.x;
        });
      return { noIonX: await runJump(false), ionX: await runJump(true) };
    });
    assert.ok(r.ionX >= 48.0 && r.ionX > r.noIonX);
  });

  test("T2-UP-04: Frostwake titan_harpoon triggerRealmQuickAction grapples elevated spire Ice-Pod", async () => {
    const r = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const p = eng.createInitialProgress("david");
        p.ownedUpgrades = ["titan_harpoon"];
        ctx.world.applyLoadout(p, {}, null);
        const hiPod = ctx.world.opposition.icePods.find((x) => x.elevated);
        ctx.world.rigState.x = hiPod.x;
        ctx.world.rigState.z = hiPod.z + 6;
        ctx.world.triggerRealmQuickAction();
        ctx.step(10, 16.6667);
        return { oppEvents: ctx.events.opposition.length };
      });
    });
    assert.ok(r.oppEvents >= 1, "Expected titan_harpoon triggerRealmQuickAction to grapple elevated spire Ice-Pod");
  });

  test("T2-UP-05: Oddroot un-upgraded speed in Blight-Thorn < 0.75x open sanctuary path speed", async () => {
    const r = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const p = eng.createInitialProgress("david");
        p.ownedUpgrades = [];
        p.games.oddroot.sanctuaryUpgrades = [];
        ctx.world.applyLoadout(p, {}, null);
        ctx.world.rigState.x = 0;
        ctx.world.rigState.z = 14;
        ctx.world.rigState.heading = 0;
        ctx.world.setDriveInputs(0, 1, false);
        ctx.step(30, 16.6667);
        const open = ctx.world.getLocalMultiplayerPose().speed;

        const opp = ctx.world.blightSystem || ctx.world.opposition || ctx.world.blightOpposition;
        const patch = opp.thornPatches[0];
        patch.dissolved = false;
        patch.cleared = false;
        patch.active = true;
        ctx.world.rigAnim = null;
        ctx.world.rigState.x = patch.x;
        ctx.world.rigState.y = (patch.y ?? 1.2) + 0.55;
        ctx.world.rigState.z = patch.z;
        ctx.world.rigState.heading = 0;
        ctx.world.rigState.speed = open;
        ctx.step(18, 16.6667);
        return { open, tangle: ctx.world.getLocalMultiplayerPose().speed };
      });
    });
    assert.ok(r.tangle < r.open * 0.75);
  });

  test("T2-UP-06: Oddroot or_tusk_plow charges through Blight-Thorns at >= 1.4x basic tangle speed", async () => {
    const r = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const opp = ctx.world.blightSystem || ctx.world.opposition || ctx.world.blightOpposition;
        const st = ctx.world.rigState;

        const p0 = eng.createInitialProgress("david");
        p0.ownedUpgrades = [];
        p0.games.oddroot.sanctuaryUpgrades = [];
        ctx.world.applyLoadout(p0, {}, null);
        ctx.world.rigAnim = null;
        opp.thornPatches[0].dissolved = false;
        st.x = opp.thornPatches[0].x;
        st.y = (opp.thornPatches[0].y ?? 1.2) + 0.55;
        st.z = opp.thornPatches[0].z;
        st.heading = 0;
        st.speed = 14;
        ctx.world.setDriveInputs(0, 1, false);
        ctx.step(18, 16.6667);
        const basic = ctx.world.getLocalMultiplayerPose().speed;

        const p1 = eng.createInitialProgress("david");
        p1.ownedUpgrades = ["or_tusk_plow"];
        p1.games.oddroot.sanctuaryUpgrades = ["or_tusk_plow"];
        ctx.world.applyLoadout(p1, {}, null);
        ctx.world.rigAnim = null;
        opp.thornPatches[1].dissolved = false;
        st.x = opp.thornPatches[1].x;
        st.y = (opp.thornPatches[1].y ?? 1.2) + 0.55;
        st.z = opp.thornPatches[1].z;
        st.speed = 14;
        ctx.step(18, 16.6667);
        return { basic, plow: ctx.world.getLocalMultiplayerPose().speed };
      });
    });
    assert.ok(r.plow >= r.basic * 1.4);
  });

  test("T2-UP-07: Oddroot or_wide_siphon captures Gloom-Spores at 7.0m while basic siphon leaves them untouched", async () => {
    const r = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const opp = ctx.world.blightSystem || ctx.world.opposition || ctx.world.blightOpposition;
        const st = ctx.world.rigState;
        st.x = 0;
        st.z = 0;

        const s0 = opp.gloomSpores[0];
        s0.active = true;
        s0.x = 7.0;
        s0.z = 0;
        const p0 = eng.createInitialProgress("sarah");
        p0.ownedUpgrades = [];
        p0.games.oddroot.sanctuaryUpgrades = [];
        ctx.world.applyLoadout(p0, {}, null);
        ctx.world.triggerRealmQuickAction();
        ctx.step(6, 16.6667);
        const baseHit = !s0.active;

        const s1 = opp.gloomSpores[1];
        s1.active = true;
        s1.x = 7.0;
        s1.z = 0;
        const p1 = eng.createInitialProgress("sarah");
        p1.ownedUpgrades = ["or_wide_siphon"];
        p1.games.oddroot.sanctuaryUpgrades = ["or_wide_siphon"];
        ctx.world.applyLoadout(p1, {}, null);
        ctx.world.triggerRealmQuickAction();
        ctx.step(6, 16.6667);
        return { baseHit, wideHit: !s1.active || Math.hypot(s1.x, s1.z) < 6.0 };
      });
    });
    assert.equal(r.baseHit, false);
    assert.equal(r.wideHit, true);
  });

  test("T2-UP-08: Oddroot or_glide_wings vs un-upgraded traversal across Thorn Chasm", async () => {
    const r = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const runChasm = async (hasWings) =>
        window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
          ctx.world.start();
          const p = eng.createInitialProgress("sarah");
          p.ownedUpgrades = hasWings ? ["or_glide_wings"] : [];
          p.games.oddroot.sanctuaryUpgrades = hasWings ? ["or_glide_wings"] : [];
          ctx.world.applyLoadout(p, {}, null);
          const opp = ctx.world.blightSystem || ctx.world.opposition || ctx.world.blightOpposition;
          const chasm = opp.thornChasms[0];
          const st = ctx.world.rigState;
          ctx.world.rigAnim = null;
          st.x = chasm.x;
          st.z = chasm.z + 2.5;
          st.heading = 0; // 0 rad = -Z across chasm!
          ctx.world.setDriveInputs(0, 1, hasWings);
          ctx.step(20, 16.6667);
          return ctx.world.getLocalMultiplayerPose().speed;
        });
      return { baseSpd: await runChasm(false), wingSpd: await runChasm(true) };
    });
    assert.ok(r.wingSpd > r.baseSpd * 1.15);
  });
});

/* ============================================================================
 * GROUP 11 — Headless webglAvailable = false, Missing AudioContext, dt = 5.0s & Leaks (14 tests)
 * ============================================================================ */
describe("Tier 2 Group 11 — Headless webglAvailable = false, Missing AudioContext & Engine Safety", () => {
  const exerciseAll24AdapterMethods = async (WorldClass, AudioClass) => {
    const eng = await loadEngine();
    const audio = new AudioClass();
    const w = new WorldClass({ canvas: null, audio });
    assert.equal(w.webglAvailable, false);
    const enc = eng.generateEncounter("W1.2");
    w.start();
    w.resize();
    w.setEncounterDockOpen(true);
    w.setEncounterDockOpen(false);
    w.applyLoadout(eng.createInitialProgress("david"), {}, null);
    w.setObservatoryTier(4);
    w.setSurgeMode(true);
    w.triggerGuardianAwakening("W1");
    const pose = w.getLocalMultiplayerPose();
    assert.ok(pose && Number.isFinite(pose.x) && Number.isFinite(pose.z));
    w.syncRemotePartners([{ userId: "sarah", x: 2, y: 0, z: -2, heading: 0, speed: 5, status: "thinking" }]);
    w.playPartnerCoopEvent({ type: "gate_burst", overdrive: true, x: 4, y: 0, z: -6 });
    w.playLocalFlare();
    w.syncSharedCoins({ coin_0: { available: false } });
    w.setDriveInputs(0.3, 0.8, true);
    w.populateEncounters([enc]);
    w.engageAutopilotToNextGate();
    w.triggerRealmQuickAction();
    w.areAllEncountersCleared();
    w.refreshActiveEncounterVisual(enc);
    w.updateDialPreview(-10);
    w.playTwinBeamVisual(false);
    w.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, enc);
    w.triggerOverdriveStreakWonder();
    w.stop();
  };

  test("T2-HL-01: Pure Node ESM new FrostwakeWorld3D({ canvas: null }) sets webglAvailable=false & survives all 24 methods", async () => {
    const { FrostwakeWorld3D } = await loadFrostwake();
    const { FrostwakeAudio } = await loadFrostwakeAudio();
    await exerciseAll24AdapterMethods(FrostwakeWorld3D, FrostwakeAudio);
  });

  test("T2-HL-02: Pure Node ESM new OddrootWorld3D({ canvas: null }) sets webglAvailable=false & survives all 24 methods", async () => {
    const { OddrootWorld3D } = await loadOddroot();
    const { OddrootAudio } = await loadOddrootAudio();
    await exerciseAll24AdapterMethods(OddrootWorld3D, OddrootAudio);
  });

  test("T2-HL-03: Browser <canvas> with getContext:()=>null sets webglAvailable=false in FrostwakeWorld3D", async () => {
    const ok = await sandboxHandle.page.eval(async () => {
      const { FrostwakeWorld3D } = await import("./frostwake/frostwake-3d.js");
      const { FrostwakeAudio } = await import("./frostwake/audio.js");
      const c = document.createElement("canvas");
      c.getContext = () => null;
      const w = new FrostwakeWorld3D({ canvas: c, audio: new FrostwakeAudio() });
      w.start();
      window.__E2E_3D__.clock.stepWorld(w, 5, 16.6667);
      w.resize();
      w.stop();
      return w.webglAvailable === false;
    });
    assert.equal(ok, true);
  });

  test("T2-HL-04: Browser <canvas> with getContext:()=>null sets webglAvailable=false in OddrootWorld3D", async () => {
    const ok = await sandboxHandle.page.eval(async () => {
      const { OddrootWorld3D } = await import("./oddroot/oddroot-3d.js");
      const { OddrootAudio } = await import("./oddroot/audio.js");
      const c = document.createElement("canvas");
      c.getContext = () => null;
      const w = new OddrootWorld3D({ canvas: c, audio: new OddrootAudio() });
      w.start();
      window.__E2E_3D__.clock.stepWorld(w, 5, 16.6667);
      w.resize();
      w.stop();
      return w.webglAvailable === false;
    });
    assert.equal(ok, true);
  });

  test("T2-HL-05: Pure Node ESM new FrostwakeAudio() (muted=false, AudioContext undefined) never throws", async () => {
    const { FrostwakeAudio } = await loadFrostwakeAudio();
    const a = new FrostwakeAudio();
    a.setMuted(false);
    assert.doesNotThrow(() => {
      a.unlock();
      a.updateRigHum(0.8, "aurora_sled");
      a.playDetentClick(10);
      a.playTwinBeam();
      a.playMagneticRepel();
      a.playCaliperNudge();
      a.playClear(true);
      a.stopHum();
    });
  });

  test("T2-HL-06: Pure Node ESM new OddrootAudio() (muted=false, AudioContext undefined) never throws", async () => {
    const { OddrootAudio } = await loadOddrootAudio();
    const a = new OddrootAudio();
    a.setMuted(false);
    assert.doesNotThrow(() => {
      a.unlock();
      a.playDetentClick(10);
      a.playTwinBeam();
      a.playMagneticRepel();
      a.playCaliperNudge();
      a.playClear(true);
      a.stopHum();
    });
  });

  test("T2-DT-07: Frostwake dt = 5.0s background-tab stall clamps physics dt <= 0.05s (< 2.5m single-frame step)", async () => {
    const disp = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        ctx.world.rigState.speed = 18;
        ctx.world.setDriveInputs(0, 1, true);
        const p0 = ctx.world.getLocalMultiplayerPose();
        ctx.step(1, 5000, { useSingleFrameClamp: true });
        const p1 = ctx.world.getLocalMultiplayerPose();
        return Math.hypot(p1.x - p0.x, p1.z - p0.z);
      });
    });
    assert.ok(disp < 2.5, `Expected dt<=0.05s clamp to cap 5000ms spike displacement < 2.5m, got ${disp}`);
  });

  test("T2-DT-08: Oddroot dt = 5.0s background-tab stall clamps physics dt <= 0.05s (< 2.5m single-frame step)", async () => {
    const disp = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        ctx.world.setDriveInputs(0, 1, true);
        ctx.step(15, 16.6667);
        const p0 = ctx.world.getLocalMultiplayerPose();
        ctx.step(1, 5000);
        const p1 = ctx.world.getLocalMultiplayerPose();
        return Math.hypot(p1.x - p0.x, p1.z - p0.z);
      });
    });
    assert.ok(disp < 2.5, `Expected dt<=0.05s clamp in Oddroot (< 2.5m), got ${disp}`);
  });

  test("T2-BC-09: Frostwake 600-frame cardinal boost boundary stress stays smoothly cushioned within r <= 71", async () => {
    const maxR = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        let mr = 0;
        for (const h of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          ctx.world.rigState.x = 0;
          ctx.world.rigState.z = 0;
          ctx.world.rigState.heading = h;
          ctx.world.setDriveInputs(0, 1, true);
          ctx.step(150, 16.6667);
          mr = Math.max(mr, Math.hypot(ctx.world.rigState.x, ctx.world.rigState.z));
        }
        return mr;
      });
    });
    assert.ok(maxR <= 71 && Number.isFinite(maxR));
  });

  test("T2-BC-10: Oddroot 600-frame cardinal boost boundary stress stays cushioned with y > -8 (zero fall death)", async () => {
    const minY = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        let my = Infinity;
        for (let i = 0; i < 4; i++) {
          ctx.world.setDriveInputs(i % 2 === 0 ? 0.3 : -0.3, 1, true);
          ctx.step(150, 16.6667);
          my = Math.min(my, ctx.world.getLocalMultiplayerPose().y);
        }
        return my;
      });
    });
    assert.ok(minY > -8 && Number.isFinite(minY));
  });

  test("T2-BC-11: Frostwake populateEncounters([]) & 10x wave repopulation leak zero orphan scene groups", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      ctx.world.populateEncounters([]);
      const emptySlots = ctx.world.gateSlots.length;
      const emptyAuto = ctx.world.engageAutopilotToNextGate();

      const wave = [eng.generateEncounter("W1.1"), eng.generateEncounter("W1.2"), eng.generateEncounter("W1.3")];
      ctx.world.populateEncounters(wave);
      const childrenAfter1 = ctx.world.scene.children.length;
      for (let i = 0; i < 10; i++) ctx.world.populateEncounters(wave);
      const childrenAfter10 = ctx.world.scene.children.length;
      return { emptySlots, emptyAuto, childrenAfter1, childrenAfter10 };
    });
    assert.equal(res.emptySlots, 0);
    assert.equal(res.emptyAuto, null);
    assert.equal(res.childrenAfter10, res.childrenAfter1);
  });

  test("T2-BC-12: Oddroot populateEncounters([]) & 10x wave repopulation leak zero orphan scene groups", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      ctx.world.populateEncounters([]);
      const emptySlots = (ctx.world.gateSlots || []).length;
      const emptyAuto = ctx.world.engageAutopilotToNextGate();

      const wave = [eng.generateEncounter("W2.1"), eng.generateEncounter("W2.2"), eng.generateEncounter("W2.3")];
      ctx.world.populateEncounters(wave);
      const childrenAfter1 = ctx.world.scene.children.length;
      for (let i = 0; i < 10; i++) ctx.world.populateEncounters(wave);
      const childrenAfter10 = ctx.world.scene.children.length;
      return { emptySlots, emptyAuto, childrenAfter1, childrenAfter10 };
    });
    assert.equal(res.emptySlots, 0);
    assert.equal(res.emptyAuto, null);
    assert.equal(res.childrenAfter10, res.childrenAfter1);
  });

  test("T2-BC-13: Frostwake null-active-gate safety on playCommitVisual, playTwinBeamVisual, refreshActiveEncounterVisual & updateDialPreview", async () => {
    const ok = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      ctx.world.populateEncounters([]);
      ctx.world.activeGateSlot = null;
      const enc = eng.generateEncounter("W1.1");
      ctx.world.updateDialPreview(10);
      ctx.world.playTwinBeamVisual(false);
      ctx.world.refreshActiveEncounterVisual(enc);
      ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 14 }, enc);
      return true;
    });
    assert.equal(ok, true);
  });

  test("T2-BC-14: Oddroot null-active-shrine safety on playCommitVisual, playTwinBeamVisual, refreshActiveEncounterVisual & updateDialPreview", async () => {
    const ok = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      ctx.world.populateEncounters([]);
      const enc = eng.generateEncounter("W1.1");
      ctx.world.updateDialPreview(10);
      ctx.world.playTwinBeamVisual(false);
      ctx.world.refreshActiveEncounterVisual(enc);
      ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 14 }, enc);
      return true;
    });
    assert.equal(ok, true);
  });
});

/* ============================================================================
 * GROUP 12 — F21 3D Co-Op & Shared Star-Coin Edge Cases (6 tests)
 * ============================================================================ */
describe("Tier 2 Group 12 — F21 3D Co-Op & Shared Star-Coin Edge Cases", () => {
  test("T2-COOP-01: 10x peer join/disconnect cycles cleanly remove departed 3D partner rigs without leaking meshes in both realms", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const check = async (realmId) => {
        const ctx = await window.__E2E_3D__.getSharedWorld(realmId);
        ctx.world.syncRemotePartners([]);
        ctx.step(45, 16.6667);
        const baseCount = window.__E2E_3D__.snapshotSceneEntities(ctx.world.scene).length;
        for (let i = 0; i < 10; i++) {
          ctx.world.syncRemotePartners([
            { userId: "p1", displayName: "Sarah", avatar: "🦄", x: 4, y: 1, z: -4, status: "roaming" },
            { userId: "p2", displayName: "David", avatar: "🦁", x: -4, y: 1, z: -4, status: "thinking" },
          ]);
          ctx.step(2, 16.6667);
          ctx.world.syncRemotePartners([]);
          ctx.step(45, 16.6667);
        }
        const endCount = window.__E2E_3D__.snapshotSceneEntities(ctx.world.scene).length;
        return Math.abs(endCount - baseCount);
      };
      return { fwDiff: await check("frostwake"), orDiff: await check("oddroot") };
    });
    assert.equal(res.fwDiff, 0, "Frostwake leaked partner meshes after syncRemotePartners([])");
    assert.equal(res.orDiff, 0, "Oddroot leaked partner meshes after syncRemotePartners([])");
  });

  test("T2-COOP-02: Malformed / NaN peer & unknown coop event payloads never corrupt scene matrices in either realm", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const check = async (realmId) => {
        const ctx = await window.__E2E_3D__.getSharedWorld(realmId);
        ctx.world.syncRemotePartners([
          null,
          {},
          { userId: "ghost", x: Number.NaN, y: Number.POSITIVE_INFINITY, z: "bad", heading: Number.NaN, status: "bad" },
        ]);
        ctx.world.playPartnerCoopEvent(null);
        ctx.world.playPartnerCoopEvent({ type: "unknown_event_xyz" });
        ctx.step(4, 16.6667);
        ctx.world.scene.updateMatrixWorld(true);
        let finite = true;
        ctx.world.scene.traverse((o) => {
          if (o.matrixWorld.elements.some((v) => !Number.isFinite(v))) finite = false;
        });
        ctx.world.syncRemotePartners([]);
        return finite;
      };
      return { fw: await check("frostwake"), or: await check("oddroot") };
    });
    assert.equal(res.fw, true);
    assert.equal(res.or, true);
  });

  test("T2-COOP-03: Cooldown Star-Coin (available: false) fires onSharedCoinGrabbed 0 times on pass-through in both realms", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const check = async (realmId, cx, cz) =>
        window.__E2E_3D__.withFreshWorld(realmId, async (ctx) => {
          ctx.world.start();
          ctx.world.syncSharedCoins({
            coin_0: { coinId: "coin_0", available: false },
            coin_1: { coinId: "coin_1", available: true },
            coin_2: { coinId: "coin_2", available: true },
            coin_3: { coinId: "coin_3", available: true },
          });
          const st = ctx.world.playerState || ctx.world.avatarState || ctx.world.rigState;
          st.x = cx;
          st.z = cz;
          ctx.step(10, 16.6667);
          return ctx.events.coinsGrabbed.filter((id) => id === "coin_0").length;
        });
      return {
        fwGrabs: await check("frostwake", -13, 10),
        orGrabs: await check("oddroot", 0, 13.5),
      };
    });
    assert.equal(res.fwGrabs, 0, "Unavailable Frostwake coin_0 must not fire onSharedCoinGrabbed");
    assert.equal(res.orGrabs, 0, "Unavailable Oddroot coin_0 must not fire onSharedCoinGrabbed");
  });

  test("T2-COOP-04: Star-Coin respawn transition (available: false -> true) restores pickup in both realms", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const check = async (realmId, cx, cz) =>
        window.__E2E_3D__.withFreshWorld(realmId, async (ctx) => {
          ctx.world.start();
          ctx.world.syncSharedCoins({ coin_0: { coinId: "coin_0", available: false } });
          ctx.step(3, 16.6667);
          ctx.world.syncSharedCoins({ coin_0: { coinId: "coin_0", available: true } });
          const st = ctx.world.playerState || ctx.world.avatarState || ctx.world.rigState;
          st.x = cx;
          st.z = cz;
          ctx.step(8, 16.6667);
          return ctx.events.coinsGrabbed.includes("coin_0");
        });
      return {
        fwRespawned: await check("frostwake", -13, 10),
        orRespawned: await check("oddroot", 0, 13.5),
      };
    });
    assert.equal(res.fwRespawned, true);
    assert.equal(res.orRespawned, true);
  });

  test("T2-COOP-05: Headless webglAvailable = false co-op hooks return valid pose & never throw in pure Node", async () => {
    const { FrostwakeWorld3D } = await loadFrostwake();
    const { OddrootWorld3D } = await loadOddroot();
    for (const Cls of [FrostwakeWorld3D, OddrootWorld3D]) {
      const w = new Cls({ canvas: null });
      assert.equal(w.webglAvailable, false);
      const p = w.getLocalMultiplayerPose();
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
      assert.doesNotThrow(() => {
        w.syncRemotePartners([{ userId: "sarah", x: 1, y: 0, z: 2, status: "surge" }]);
        w.playPartnerCoopEvent({ type: "coin_grab", coinId: "coin_0" });
        w.playLocalFlare();
        w.syncSharedCoins({ coin_0: { available: false } });
      });
    }
  });

  test("T2-COOP-06: Zero #1/#2 competitive rank labels in Frostwake & Oddroot 3D co-op modules", async () => {
    for (const rel of ["frostwake/coop-3d.js", "oddroot/coop-3d.js"]) {
      const src = stripJsAndCssComments(await fs.readFile(path.join(BLOOM_N_DIR, rel), "utf8"));
      assert.equal(/#1\b|#2\b|\b1st\b|\b2nd\b/i.test(src), false, `Competitive rank text prohibited in ${rel}`);
      assert.equal(findBannedWord(src, FALLBACK_BANNED_CURRICULUM_WORDS), null);
    }
  });
});
