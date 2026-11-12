import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BANNED_CHILD_WORDS,
  BANNED_CHILD_CURRICULUM_WORDS,
  SUB_GAMES,
  RIG_CHASSIS,
  RIG_UPGRADES,
  MYSTERIES,
  ODDROOT_MOUNTS,
  ODDROOT_UPGRADES,
  ODDROOT_CREATURE_STAGES,
  ODDROOT_CREATURES,
  WORLDS,
  NODE_MAP,
  GROWN_UPS_CURRICULUM,
  getGrownUpsWorldCurriculum,
  getGrownUpsNodeTopic,
  createInitialProgress,
  createSessionState,
  generateEncounter,
  getTrickCardSpec,
  computeWorldProgress,
  applyBeamAction,
  evaluateCommit,
  unlockFrontierWorlds,
  queueOverdriveSurge,
  pickNextEncounter,
  getCrossRealmUnlocks,
  computeArchitectLevel,
  recordWeeklySunshine,
  getWeeklySunshineBonus,
  computeHeroTitle,
  mergeProgress,
} from "../core/engine.js";

import * as syncMod from "../core/sync.js";
import {
  SHARED_COIN_IDS,
  SHARED_COIN_REWARD_SHARDS,
  SHARED_COIN_RESPAWN_MS,
  buildRealtimeWsUrl,
  createMultiplayerClient,
} from "../core/multiplayer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOOM_N_DIR = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(BLOOM_N_DIR, "..");

const ALL_29_KINDS = [
  "eq_add",
  "eq_cross_zero",
  "eq_subzero_extreme",
  "int_double_neg",
  "int_polarity",
  "seq_linear",
  "expr_distribute",
  "exp_power",
  "geo_parallel_angles",
  "eq_twostep",
  "eq_twostep_camo",
  "eq_parens",
  "eq_both_sides",
  "geo_scale_area",
  "ramp_slope_only",
  "ramp_linear",
  "ramp_point_target",
  "sys_intersection",
  "geo_triangle_truss",
  "geo_astrolabe_thales",
  "geo_pythagoras",
  "geo_trig_ratio",
  "arch_vertex_eval",
  "arch_roots",
  "quad_complete_sq",
  "exp_growth",
  "log_stage",
  "trig_wave_crest",
  "complex_i_rotation",
];

function countWords(str) {
  const s = String(str || "").trim();
  return s ? s.split(/\s+/).length : 0;
}

function assertCleanChildText(text, contextLabel) {
  const low = String(text || "").toLowerCase();
  assert.ok(!low.includes("nan"), `Literal NaN leaked in ${contextLabel}: "${text}"`);
  for (const w of BANNED_CHILD_WORDS) {
    assert.ok(!low.includes(w), `Banned shame word "${w}" in ${contextLabel}: "${text}"`);
  }
  for (const cw of BANNED_CHILD_CURRICULUM_WORDS) {
    assert.ok(!low.includes(cw), `Banned curriculum label "${cw}" in ${contextLabel}: "${text}"`);
  }
}

function makeSeededRng(seed = 123456789) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// SUITE 1: F02 — Pure Game Ranks, Zero School Labels & GROWN_UPS_CURRICULUM
// ============================================================================

test("F02: Pure game Rank names, Oddroot live status, zero child curriculum/shame words, and isolated GROWN_UPS_CURRICULUM", () => {
  assert.equal(BANNED_CHILD_CURRICULUM_WORDS.length, 13);
  for (const reqWord of ["pre-algebra", "algebra 1", "algebra 2", "geometry", "trigonometry", "trig", "curriculum"]) {
    assert.ok(BANNED_CHILD_CURRICULUM_WORDS.includes(reqWord));
  }

  assert.equal(SUB_GAMES.length, 4);
  assert.equal(SUB_GAMES[0].id, "frostwake");
  assert.equal(SUB_GAMES[0].status, "live");
  assert.equal(SUB_GAMES[1].id, "oddroot");
  assert.equal(SUB_GAMES[1].status, "live");
  assert.equal(SUB_GAMES[1].badge, "REALM 2 · PLAY NOW · 3D LIVE");

  for (const g of SUB_GAMES) {
    assertCleanChildText(`${g.title} ${g.subtitle} ${g.badge} ${g.blurb}`, `SUB_GAMES[${g.id}]`);
  }
  for (const item of [...RIG_CHASSIS, ...RIG_UPGRADES, ...MYSTERIES, ...ODDROOT_MOUNTS, ...ODDROOT_UPGRADES, ...ODDROOT_CREATURES]) {
    assertCleanChildText(
      `${item.name || ""} ${item.title || ""} ${item.tag || ""} ${item.shortDesc || ""} ${item.clue || ""} ${item.reward || ""} ${item.desc || ""}`,
      `Catalog[${item.id}]`
    );
  }
  for (const stageName of Object.values(ODDROOT_CREATURE_STAGES)) {
    assertCleanChildText(stageName, "ODDROOT_CREATURE_STAGES");
  }

  const expectedRanks = [
    ["W0", "Prologue", "Awakening Glacier", "Aurora Scout"],
    ["W1", "Rank I", "Sub-Zero Core", "Cryo-Colossus"],
    ["W2", "Rank II", "Crystal Loom", "Prism Weaver"],
    ["W3", "Rank III", "Titan Monoliths", "Equilibrium Titan"],
    ["W4", "Rank IV", "Skyway Canyons", "Horizon Strider"],
    ["W5", "Rank V", "Star-Ring Peaks", "Astrolabe Phoenix"],
    ["W6", "Rank VI", "Solar Caldera", "Crown Leviathan"],
    ["W7", "Rank VII", "Aurora Crown", "Nebula Sovereign"],
  ];

  assert.equal(WORLDS.length, 8);
  for (let i = 0; i < 8; i++) {
    const w = WORLDS[i];
    const [id, rankLabel, name, guardianName] = expectedRanks[i];
    assert.equal(w.id, id);
    assert.equal(w.rankLabel, rankLabel);
    assert.equal(w.gradeSpan, rankLabel, `gradeSpan must equal pure game rankLabel on ${id}`);
    assert.equal(w.name, name);
    assert.equal(w.guardianName, guardianName);
    assertCleanChildText(
      `${w.rankLabel} ${w.name} ${w.guardianName} ${w.realmSubtitle} ${w.gradeSpan} ${w.summary} ${w.strand}`,
      `WORLDS[${id}]`
    );
    for (const n of w.nodes) {
      assertCleanChildText(`${n.title} ${n.strand}`, `Node[${n.id}]`);
    }
  }

  // Formal curriculum lives strictly inside GROWN_UPS_CURRICULUM covering all 8 worlds & 33 nodes
  assert.ok(GROWN_UPS_CURRICULUM.progressionSummary.includes("Pre-Algebra I"));
  assert.ok(GROWN_UPS_CURRICULUM.progressionSummary.includes("Algebra 2 Core"));
  assert.equal(Object.keys(GROWN_UPS_CURRICULUM.worlds).length, 8);
  assert.equal(Object.keys(GROWN_UPS_CURRICULUM.nodes).length, 33);
  for (const id of Object.keys(NODE_MAP)) {
    const topic = getGrownUpsNodeTopic(id);
    assert.ok(topic && topic.grownUpsTopic.length > 5, `Missing grown-ups topic for ${id}`);
    assert.ok(getGrownUpsWorldCurriculum(NODE_MAP[id].worldId));
  }
});

// ============================================================================
// SUITE 2: F05 — Zone Clear / Guardian Awakening Progress Helper
// ============================================================================

test("F05: computeWorldProgress aligns 100% with unlockFrontierWorlds and tracks stars & Guardian Awakening", () => {
  const prog = createInitialProgress("auto");
  prog.calibrated = true;
  prog.activeWorld = "W1";

  let wp1 = computeWorldProgress(prog, "W1");
  assert.equal(wp1.rankLabel, "Rank I");
  assert.equal(wp1.worldName, "Sub-Zero Core");
  assert.equal(wp1.guardianName, "Cryo-Colossus");
  assert.equal(wp1.beaconsLit, 0);
  assert.equal(wp1.beaconsTotal, 4);
  assert.equal(wp1.beaconsNeededForUnlock, 2);
  assert.equal(wp1.starsEarned, 0);
  assert.equal(wp1.starsMax, 12);
  assert.equal(wp1.completionPct, 0);
  assert.equal(wp1.guardianAwakened, false);
  assert.equal(wp1.nextWorldId, "W2");
  assert.equal(wp1.nextWorldRankLabel, "Rank II");
  assert.equal(wp1.nextWorldName, "Crystal Loom");

  // 1st solid beacon -> 25%, W2 still locked, guardianAwakened still false
  prog.nodes["W1.1"].stage = 2;
  unlockFrontierWorlds(prog);
  wp1 = computeWorldProgress(prog, "W1");
  assert.equal(wp1.beaconsLit, 1);
  assert.equal(wp1.completionPct, 25);
  assert.equal(wp1.guardianAwakened, false);
  assert.equal(prog.unlockedWorlds.includes("W2"), false);

  // 2nd solid beacon -> 50%, W2 unlocks AND guardianAwakened flips true on exact same threshold!
  prog.nodes["W1.2"].stage = 2;
  unlockFrontierWorlds(prog);
  wp1 = computeWorldProgress(prog, "W1");
  assert.equal(wp1.beaconsLit, 2);
  assert.equal(wp1.completionPct, 50);
  assert.equal(wp1.guardianAwakened, true);
  assert.equal(prog.unlockedWorlds.includes("W2"), true);

  // 3rd solid beacon -> 75%; then master all 4 -> 12/12 stars, 100%
  prog.nodes["W1.3"].stage = 2;
  assert.equal(computeWorldProgress(prog, "W1").completionPct, 75);
  for (const id of ["W1.1", "W1.2", "W1.3", "W1.4"]) prog.nodes[id].stage = 3;
  wp1 = computeWorldProgress(prog, "W1");
  assert.equal(wp1.starsEarned, 12);
  assert.equal(wp1.completionPct, 100);
  assert.deepEqual(wp1.nodeStatuses.map((n) => n.stars), [3, 3, 3, 3]);

  // W0 Prologue & W7 final world boundaries
  const uncal = createInitialProgress("auto");
  uncal.calibrationStep = 3;
  const wp0 = computeWorldProgress(uncal, "W0");
  assert.equal(wp0.beaconsLit, 3);
  assert.equal(wp0.beaconsTotal, 6);
  assert.equal(wp0.guardianAwakened, false);

  const wp7 = computeWorldProgress(prog, "W7");
  assert.equal(wp7.nextWorldId, null);
  assert.equal(wp7.beaconsTotal, 4);
});

// ============================================================================
// SUITE 3: F06 & F09 — Visual seq_linear, 29-Kind Trick Cards & W7.4 i-Portal
// ============================================================================

test("F06 & F09: Visual seq_linear frames, 29-kind Trick Cards (<=8 words), and W7.4 90-degree i-Portals", () => {
  const rng = makeSeededRng(42);
  assert.equal(Object.keys(NODE_MAP).length, 33);

  // Visual seq_linear verification across W0.4 and W2.1
  for (const nid of ["W0.4", "W2.1"]) {
    for (let i = 0; i < 25; i++) {
      const enc = generateEncounter(nid, { rng, camouflage: i % 2 === 1 });
      assert.equal(enc.kind, "seq_linear");
      assert.ok(!enc.equationText.includes("Step 1:"), `Dry Step string found: ${enc.equationText}`);
      assert.ok(enc.equationText.startsWith("Frame 1:"), `Expected Frame 1 visual header: ${enc.equationText}`);
      const pm = enc.patternMeta;
      assert.ok(pm.baseCount >= 1);
      assert.ok(pm.stepGrowth >= 2);
      assert.equal(pm.ruleVisual, "Base + Frame × Group");
      assert.equal(pm.frames.length, 3);
      for (let f = 0; f < 3; f++) {
        const fr = pm.frames[f];
        assert.equal(fr.step, f + 1);
        assert.equal(fr.base, pm.baseCount);
        assert.equal(fr.groups, f + 1);
        assert.equal(fr.perGroup, pm.stepGrowth);
        assert.equal(fr.total, pm.baseCount + (f + 1) * pm.stepGrowth);
      }
      assert.equal(enc.answer, pm.baseCount + pm.targetStep * pm.stepGrowth);
    }
  }

  // Trick Cards across all 29 bare kinds AND all 33 nodes x 20 trials (normal + camo)
  for (const bareKind of ALL_29_KINDS) {
    const spec = getTrickCardSpec(bareKind);
    assert.ok(spec && spec.familyId && spec.title);
    assert.ok(spec.beats.length >= 2 && spec.beats.length <= 3);
    assert.ok(countWords(spec.foxWhisper) <= 8, `foxWhisper > 8 words on ${bareKind}: "${spec.foxWhisper}"`);
    assertCleanChildText(`${spec.familyId} ${spec.title} ${spec.foxWhisper}`, `TrickCard[${bareKind}]`);
    for (const beat of spec.beats) {
      assert.ok(countWords(beat.caption) <= 8, `Caption > 8 words on ${bareKind}: "${beat.caption}"`);
      assert.ok(typeof beat.visualType === "string" && beat.visualType.length > 0);
      assert.ok(beat.visualProps && typeof beat.visualProps === "object");
      assertCleanChildText(beat.caption, `TrickCard[${bareKind}].beat`);
    }
  }

  for (const nodeId of Object.keys(NODE_MAP)) {
    for (let t = 0; t < 20; t++) {
      const enc = generateEncounter(nodeId, { rng, camouflage: t % 2 === 1 });
      const spec = getTrickCardSpec(enc);
      assert.ok(countWords(spec.foxWhisper) <= 8, `foxWhisper > 8 words on ${nodeId}: "${spec.foxWhisper}"`);
      assertCleanChildText(`${spec.familyId} ${spec.title} ${spec.foxWhisper}`, `TrickCard[${nodeId}]`);
      for (const beat of spec.beats) {
        assert.ok(countWords(beat.caption) <= 8, `Caption > 8 words on ${nodeId}: "${beat.caption}"`);
        assertCleanChildText(beat.caption, `TrickCard[${nodeId}].beat`);
      }
    }
  }

  // W7.4 complex_i_rotation 100-trial check
  let sawRealFlip = false;
  let sawFullTurn = false;
  let sawImagAxis = false;
  for (let i = 0; i < 100; i++) {
    const enc = generateEncounter("W7.4", { rng, camouflage: i % 3 === 0 });
    assert.equal(enc.kind, "complex_i_rotation");
    assert.equal(enc.encounterType, "astrolabe_shrine");
    assert.ok(Number.isFinite(enc.answer));
    const pm = enc.portalMeta;
    assert.deepEqual(pm, enc.iPortalMeta);
    assert.deepEqual(pm, enc.complexMeta);
    assert.equal(pm.turnAngleDeg, pm.quarterTurns * 90);
    if (pm.quarterTurns === 2) {
      sawRealFlip = true;
      assert.equal(pm.endReal, -pm.startReal);
      assert.equal(pm.endImag, 0);
      assert.equal(enc.answer, -pm.startReal);
    } else if (pm.quarterTurns === 4) {
      sawFullTurn = true;
      assert.equal(pm.endReal, pm.startReal);
      assert.equal(enc.answer, pm.startReal);
    } else {
      sawImagAxis = true;
      assert.equal(pm.isRealTarget, false);
      assert.equal(pm.endReal, 0);
      assert.equal(enc.answer, pm.quarterTurns === 1 ? pm.startReal : -pm.startReal);
    }
  }
  assert.ok(sawRealFlip && sawFullTurn && sawImagAxis);
});

// ============================================================================
// SUITE 4: F07, F08, F10 — W0 Determinism, Safety Guards, BKT+ & Cross-Realm
// ============================================================================

test("F07: 1,000-trial W0 Calibration determinism across both sequential and 3-gate wave spawns", () => {
  // Force rng() < 0.15 edge case on early trials to prove organic Surge never hijacks W0
  for (let r = 0; r < 1000; r++) {
    const rng = r < 50 ? () => 0.01 : makeSeededRng(1000 + r);

    // 1. Sequential 6-gate run
    const p1 = createInitialProgress("auto");
    const s1 = createSessionState();
    const seqIds = [];
    for (let i = 0; i < 6; i++) {
      const enc = pickNextEncounter(p1, s1, "W0", rng);
      seqIds.push(enc.nodeId);
      evaluateCommit({ encounter: enc, committedValue: enc.answer, progress: p1, session: s1, rng });
    }
    assert.equal(seqIds.join(","), "W0.1,W0.2,W0.3,W0.4,W0.5,W0.6");
    assert.equal(p1.calibrated, true);
    assert.equal(s1.inSurge, false);

    // 2. Synchronous 3-gate wave spawns (matching portal.js spawnValleyWave) + 1st-miss nudge
    const p2 = createInitialProgress("auto");
    const s2 = createSessionState();
    const w1 = [
      pickNextEncounter(p2, s2, "W0", rng),
      pickNextEncounter(p2, s2, "W0", rng),
      pickNextEncounter(p2, s2, "W0", rng),
    ];
    assert.equal(w1.map((e) => e.nodeId).join(","), "W0.1,W0.2,W0.3");
    evaluateCommit({ encounter: w1[0], committedValue: w1[0].answer + 5, progress: p2, session: s2, rng });
    for (const e of w1) {
      evaluateCommit({ encounter: e, committedValue: e.answer, progress: p2, session: s2, rng });
    }
    const w2 = [
      pickNextEncounter(p2, s2, "W0", rng),
      pickNextEncounter(p2, s2, "W0", rng),
      pickNextEncounter(p2, s2, "W0", rng),
    ];
    assert.equal(w2.map((e) => e.nodeId).join(","), "W0.4,W0.5,W0.6");
    for (const e of w2) {
      evaluateCommit({ encounter: e, committedValue: e.answer, progress: p2, session: s2, rng });
    }
    assert.equal(p2.calibrated, true);
  }
});

test("F08: All 33 nodes x 30 trials x {normal, camo} obey <= 6-word prompts/beamActions/cues and input guards", () => {
  const rng = makeSeededRng(98765);
  const prog = createInitialProgress("sarah");
  const session = createSessionState();

  for (const nodeId of Object.keys(NODE_MAP)) {
    for (const camouflage of [false, true]) {
      for (let trial = 0; trial < 30; trial++) {
        let enc = generateEncounter(nodeId, { rng, camouflage });
        assert.ok(Number.isFinite(enc.answer));
        if (camouflage) {
          assert.equal(enc.isCamouflage, true, `Expected isCamouflage=true on ${nodeId}`);
        }
        assert.ok(
          countWords(enc.promptShort) <= 6,
          `promptShort > 6 words on ${nodeId} (camo=${camouflage}): "${enc.promptShort}"`
        );
        assertCleanChildText(`${enc.promptShort} ${enc.equationText} ${enc.visualHint || ""}`, `${nodeId}`);

        // Walk all forward beam actions checking <= 6 words on label & cue
        let guard = 0;
        while (enc.beamActions && enc.beamActions.length > 0 && guard < 6) {
          for (const act of enc.beamActions) {
            assert.ok(
              countWords(act.label) <= 6,
              `beamAction label > 6 words on ${nodeId} (${act.id}): "${act.label}"`
            );
            assert.ok(
              countWords(act.cue) <= 6,
              `beamAction cue > 6 words on ${nodeId} (${act.id}): "${act.cue}"`
            );
            assertCleanChildText(`${act.id} ${act.label} ${act.cue}`, `${nodeId}.beamAction`);
          }
          const nextAct = enc.beamActions.find((a) => a.kind !== "repel_trap" && a.id !== "reset_steps");
          if (!nextAct) break;
          const stepRes = applyBeamAction(enc, nextAct.id, prog, session);
          assert.ok(countWords(stepRes.cue) <= 6);
          assertCleanChildText(stepRes.cue, `${nodeId}.stepCue`);
          enc = stepRes.encounter;
          guard++;
        }
      }
    }
  }

  // Invalid / non-finite input guards & planMs <= 12000ms cap
  const cleanProg = createInitialProgress("david");
  const cleanSess = createSessionState();
  const sampleEnc = generateEncounter("W1.1", { rng });
  const attemptsBefore = cleanProg.nodes["W1.1"].attempts;

  for (const badInput of ["", "   ", "abc", NaN, Infinity, -Infinity, null, undefined, true, {}]) {
    const res = evaluateCommit({
      encounter: sampleEnc,
      committedValue: badInput,
      progress: cleanProg,
      session: cleanSess,
    });
    assert.equal(res.outcome, "nudge");
    assert.equal(res.invalidInput, true);
    assert.equal(res.shardsEarned, 0);
    assert.equal(res.delta, 0);
    assert.ok(countWords(res.cue) <= 6);
    assertCleanChildText(res.cue, "invalidInputCue");
  }
  assert.equal(cleanProg.nodes["W1.1"].attempts, attemptsBefore);
  assert.equal(cleanSess.friction, 0);

  evaluateCommit({
    encounter: sampleEnc,
    committedValue: sampleEnc.answer,
    planMs: 99000,
    execMs: 500,
    progress: cleanProg,
    session: cleanSess,
  });
  assert.ok(cleanProg.nodes["W1.1"].avgPlanMs <= 12000);
});

test("F08: Path Efficiency eta, divide_outer shortcut, reset_steps, Pioneer 1.5x shards, camouflage gate, and Friction tiers", () => {
  const rng = makeSeededRng(777);

  // 1. W3.2 divide_outer shortcut + reset_steps
  const prog = createInitialProgress("sarah");
  const sess = createSessionState();
  let parensEnc = generateEncounter("W3.2", { rng });
  const origEq = parensEnc.equationText;
  const step1 = applyBeamAction(parensEnc, "divide_outer", prog, sess);
  assert.equal(step1.kind, "transformed");
  assert.equal(step1.encounter.usedShortcut, true);
  assert.ok(step1.encounter.beamActions.some((a) => a.id === "reset_steps"));

  const resetRes = applyBeamAction(step1.encounter, "reset_steps", prog, sess);
  assert.equal(resetRes.wasReset, true);
  assert.equal(resetRes.encounter.stepsUsed, 0);
  assert.equal(resetRes.encounter.equationText, origEq);

  // Re-apply divide_outer and solve in 1 step -> eta = 1.25, overdrive = true, 21 shards
  const shortcutStep = applyBeamAction(resetRes.encounter, "divide_outer", prog, sess).encounter;
  const clearShortcut = evaluateCommit({
    encounter: shortcutStep,
    committedValue: shortcutStep.answer,
    progress: prog,
    session: sess,
    rng,
  });
  assert.equal(clearShortcut.outcome, "clear");
  assert.equal(clearShortcut.eta, 1.25);
  assert.equal(clearShortcut.overdrive, true);
  assert.equal(clearShortcut.shardsEarned, 21);

  // 2. Frontier Pioneer 1.5x shards on multi-step solve when stage <= 1 vs stage >= 2
  const pioneerProg = createInitialProgress("sarah");
  const pioneerSess = createSessionState();
  let multiEnc = generateEncounter("W3.3", { rng });
  while (multiEnc.beamActions.length > 0) {
    multiEnc = applyBeamAction(multiEnc, multiEnc.beamActions[0].id, pioneerProg, pioneerSess).encounter;
  }
  assert.ok(multiEnc.stepsUsed >= 2);
  const pioneerRes = evaluateCommit({
    encounter: multiEnc,
    committedValue: multiEnc.answer,
    progress: pioneerProg,
    session: pioneerSess,
    rng,
  });
  assert.equal(pioneerRes.pioneerBonus, true);
  assert.equal(pioneerRes.shardsEarned, 21); // 1.5x Pioneer bonus despite multi-step!

  pioneerProg.nodes["W3.3"].stage = 2;
  let stage2Multi = generateEncounter("W3.3", { rng });
  while (stage2Multi.beamActions.length > 0) {
    stage2Multi = applyBeamAction(stage2Multi, stage2Multi.beamActions[0].id, pioneerProg, pioneerSess).encounter;
  }
  const stage2Res = evaluateCommit({
    encounter: stage2Multi,
    committedValue: stage2Multi.answer,
    progress: pioneerProg,
    session: pioneerSess,
    rng,
  });
  assert.equal(stage2Res.pioneerBonus, false);
  assert.equal(stage2Res.shardsEarned, 14);

  // 3. Stage 3 gated on camouflageCleared
  const camoProg = createInitialProgress("david");
  const camoSess = createSessionState();
  for (let i = 0; i < 6; i++) {
    const e = generateEncounter("W2.3", { rng, camouflage: false });
    evaluateCommit({ encounter: e, committedValue: e.answer, progress: camoProg, session: camoSess, rng: () => 0.99 });
  }
  assert.ok(camoProg.nodes["W2.3"].pKnow >= 0.9);
  assert.equal(camoProg.nodes["W2.3"].stage, 2, "Must stay at stage 2 before camouflageCleared");

  const camoGate = pickNextEncounter(camoProg, camoSess, "W2", () => 0.5);
  const explicitCamo = generateEncounter("W2.3", { rng, camouflage: true });
  assert.equal(explicitCamo.isCamouflage, true);
  assert.ok(camoGate.uid);
  evaluateCommit({
    encounter: explicitCamo,
    committedValue: explicitCamo.answer,
    progress: camoProg,
    session: camoSess,
    rng: () => 0.99,
  });
  assert.equal(camoProg.nodes["W2.3"].camouflageCleared, true);
  assert.equal(camoProg.nodes["W2.3"].stage, 3);

  // 4. Friction Soft-Swap (1.8 <= F_t < 2.8), Targeted Surge Repair (F_t >= 2.8), & Victory Cooldown (F_t >= 4.2)
  const fProg = createInitialProgress("sarah");
  const fSess = createSessionState();
  fSess.friction = 2.2;
  const swapped = pickNextEncounter(fProg, fSess, "W3", rng);
  assert.equal(swapped.softSwapped, true);

  queueOverdriveSurge(fProg, fSess, "W3.2");
  assert.equal(fSess.surgeQueue.length, 4);
  assert.equal(fSess.surgeQueue[2], "W2.2"); // ATOMIC_REPAIR_MAP["W3.2"] === "W2.2"
  for (let i = 0; i < 4; i++) {
    const se = pickNextEncounter(fProg, fSess, "W3", rng);
    assert.equal(se.isSurgeItem, true);
    assert.equal(fSess.inSurge, true);
    evaluateCommit({ encounter: se, committedValue: se.answer, progress: fProg, session: fSess, rng: () => 0.99 });
  }
  assert.equal(fSess.inSurge, false, "Surge exits synchronously after 4th item commit without timers");

  fSess.friction = 4.5;
  const cdEnc = pickNextEncounter(fProg, fSess, "W4", rng);
  assert.equal(cdEnc.cooldownItem, true);
  assert.equal(fSess.cooldownRemaining, 3);
});

test("F10: Cross-realm catalogs, getCrossRealmUnlocks, computeArchitectLevel, recordWeeklySunshine & mergeProgress", () => {
  assert.deepEqual(ODDROOT_MOUNTS.map((m) => m.id), ["bramble_boar", "starlight_glider"]);
  assert.ok(ODDROOT_MOUNTS[1].aliases.includes("glide_cape"));
  assert.equal(ODDROOT_UPGRADES.length, 6);
  assert.ok(ODDROOT_UPGRADES.every((u) => u.id.startsWith("or_")));
  assert.equal(ODDROOT_CREATURES.length, 8);

  const pA = createInitialProgress("david");
  pA.records.deepestSubZero = 150;
  pA.games.frostwake.snowClearedM2 = 420;
  pA.games.frostwake.foxDensThawed = 3;
  pA.games.frostwake.bestWaveSec = 38.4;
  pA.games.frostwake.ghostFrames = [{ t: 0, x: 1, z: 2 }];
  pA.games.oddroot.hatchedCreatures = ["zero_g_toad", "sun_oddling"];
  pA.games.oddroot.creatureStages = { zero_g_toad: 2, sun_oddling: 1 };
  pA.games.oddroot.bestCircuitSec = 52.0;

  const pB = createInitialProgress("david");
  pB.games.frostwake.bestWaveSec = 44.0;
  pB.games.frostwake.ghostFrames = [{ t: 0, x: 9, z: 9 }];
  pB.games.oddroot.hatchedCreatures = ["crystal_fox", "zero_g_toad"];
  pB.games.oddroot.creatureStages = { zero_g_toad: 3, crystal_fox: 2 };
  pB.games.oddroot.sanctuaryUpgrades = ["or_spore_wake", "or_antler_crown"];
  pB.games.oddroot.mosaicForged = true;
  pB.games.oddroot.bestCircuitSec = 41.2;
  pB.games.oddroot.ghostFrames = [{ t: 0, x: 5, z: -4 }];
  pB.discoveredMysteries = ["moon_center", "astrolabe_lock", "aurora_whale"];

  const merged = mergeProgress(pA, pB);
  assert.equal(merged.games.frostwake.bestWaveSec, 38.4);
  assert.deepEqual(merged.games.frostwake.ghostFrames, [{ t: 0, x: 1, z: 2 }]);
  assert.equal(merged.games.frostwake.foxDensThawed, 3);
  assert.equal(merged.games.oddroot.bestCircuitSec, 41.2);
  assert.deepEqual(merged.games.oddroot.ghostFrames, [{ t: 0, x: 5, z: -4 }]);
  assert.equal(merged.games.oddroot.creatureStages.zero_g_toad, 3);
  assert.equal(merged.games.oddroot.hatchedCreatures.length, 3);
  assert.equal(merged.games.oddroot.mosaicForged, true);

  const unlocks = getCrossRealmUnlocks(merged);
  for (const key of [
    "astroToadUnlocked",
    "astroToadCabMascot",
    "cryoToadMascot",
    "cryoBuoyancyTrim",
    "subZeroAbyssUnlocked",
    "subZeroUnlocked",
    "snowLiliesUnlocked",
    "bioluminescentSnowLilies",
    "goldenMosaicTrimUnlocked",
    "goldenMosaicPlowTrim",
    "goldenMosaicTrim",
    "mosaicUnlocked",
    "auroraBladeTrimUnlocked",
    "silverMoonLantern",
    "moonLanternUnlocked",
    "titanAstrolabeSynced",
    "astrolabeUnlocked",
    "starlightWhaleSynced",
    "skyWhaleUnlocked",
  ]) {
    assert.equal(unlocks[key], true, `Expected ${key} === true`);
  }
  assert.equal(unlocks.frostwakePlowTrim, "golden_mosaic");

  // Architect level never drops when spending fluxShards
  merged.fluxShards = 500;
  const lvBefore = computeArchitectLevel(merged);
  merged.fluxShards = 10;
  const lvAfter = computeArchitectLevel(merged);
  assert.equal(lvBefore.level, lvAfter.level);
  assert.ok(lvAfter.level >= 2 && lvAfter.level <= 99);
  assert.equal(Number(lvAfter), lvAfter.level);
  assertCleanChildText(computeHeroTitle(merged), "HeroTitle");

  // 4-Sun Weekly Sunshine check-ins
  const sunProg = createInitialProgress("sarah");
  const d1 = recordWeeklySunshine(sunProg, "2026-11-09T12:00:00Z"); // Monday
  assert.equal(d1.suns, 1);
  assert.equal(d1.addedToday, true);
  assert.equal(d1.bonusShards, 0);
  const d1Dup = recordWeeklySunshine(sunProg, "2026-11-09T18:00:00Z");
  assert.equal(d1Dup.suns, 1);
  assert.equal(d1Dup.addedToday, false);

  recordWeeklySunshine(sunProg, "2026-11-10T12:00:00Z");
  const d3 = recordWeeklySunshine(sunProg, "2026-11-11T12:00:00Z");
  assert.equal(d3.suns, 3);
  assert.equal(d3.bonusShards, 1);
  assert.equal(d3.richThicket, true);

  const d4 = recordWeeklySunshine(sunProg, "2026-11-12T12:00:00Z");
  assert.equal(d4.suns, 4);
  assert.equal(d4.bonusShards, 2);
  assert.equal(d4.shardBonus, 2);
  assert.equal(getWeeklySunshineBonus(sunProg).bonusShards, 2);

  // 5th day clamps to maxSuns = 4; next week resets cleanly with zero penalty
  const d5 = recordWeeklySunshine(sunProg, "2026-11-13T12:00:00Z");
  assert.equal(d5.suns, 4);
  const nextWk = recordWeeklySunshine(sunProg, "2026-11-17T12:00:00Z");
  assert.equal(nextWk.suns, 1);
});

// ============================================================================
// SUITE 5: F10 — sync.js, borrowSiblingToy, <38KB Bounding, hub.js:5 & SQL
// ============================================================================

test("F10 (Sync & SQL): Pure Node safety, borrowSiblingToy (+5 shards & null guards), <38KB bounding, hub.js:5, and SQL security", async () => {
  // 1. Verify all 20 original exports + 6 new exports
  const requiredExports = [
    "SB_URL",
    "SB_KEY",
    "STORE_KEY",
    "HUB_KEY",
    "MAX_FUN_BYTES",
    "onSyncUpdate",
    "setRpcTransport",
    "clearPendingSyncTimer",
    "slugName",
    "sbRpc",
    "loadStore",
    "saveStore",
    "ensureProfile",
    "getActiveProfile",
    "getActiveProgress",
    "updateHouseholdLocalHero",
    "computeObservatoryTier",
    "borrowSiblingToy",
    "compactGamesForCloud",
    "mergeGamesState",
    "readArrivalIdentity",
    "bootstrapYompleSession",
    "pullPlayerCloud",
    "scheduleCloudSync",
    "pushActiveCloud",
    "buildYompleHubReturnUrl",
  ];
  for (const exp of requiredExports) {
    assert.ok(exp in syncMod, `Missing sync.js export: ${exp}`);
  }

  const rpcCalls = [];
  syncMod.setRpcTransport(async (fn, args) => {
    rpcCalls.push({ fn, args });
    if (fn === "bloomn_player_merge") {
      return { ok: true, progress: args.p_progress, fun: args.p_fun };
    }
    if (fn === "bloomn_household_sync") {
      return {
        ok: true,
        family_code: args.p_family,
        total_flux: 320,
        observatory_tier: 2,
        heroes: {},
      };
    }
    return null;
  });

  try {
    // 2. Pure Node zero-DOM bootstrap & arrival parsing
    assert.equal(syncMod.readArrivalIdentity().username, "");
    const parsed = syncMod.readArrivalIdentity("?u=Sarah&from=yomple&f=maple-k7q2");
    assert.equal(parsed.username, "sarah");
    assert.equal(parsed.familyCode, "MAPLE-K7Q2");

    const store = syncMod.loadStore();
    await syncMod.bootstrapYompleSession(store);
    store.familyCode = "MAPLE-K7Q2";
    assert.equal(store.profiles.length, 2);
    assert.equal(syncMod.buildYompleHubReturnUrl(store), "/?u=david&f=MAPLE-K7Q2");

    // 3. borrowSiblingToy (+5💎 warm gift, null on self-borrow/invalid, anti-farm guard, zero borrower mutation)
    store.progressByUser.sarah.ownedUpgrades = ["wide_blade", "spirit_fox"];
    store.progressByUser.sarah.games.oddroot.sanctuaryUpgrades = ["or_glide_wings"];
    store.progressByUser.sarah.games.oddroot.hatchedCreatures = ["crystal_fox"];
    const davidShardsBefore = store.progressByUser.david.fluxShards;
    const sarahShardsBefore = store.progressByUser.sarah.fluxShards;

    assert.equal(syncMod.borrowSiblingToy(store, "david", "david", "frostwake"), null);
    assert.equal(syncMod.borrowSiblingToy(store, "david", "nonexistent", "frostwake"), null);
    assert.equal(syncMod.borrowSiblingToy(null, "david", "sarah", "frostwake"), null);
    assert.equal(syncMod.borrowSiblingToy(store, "", "sarah", "frostwake"), null);

    const borrowed1 = syncMod.borrowSiblingToy(store, "david", "sarah", "frostwake");
    assert.ok(borrowed1 && borrowed1.ok === true);
    assert.equal(borrowed1.owner, "sarah");
    assert.equal(borrowed1.giftShards, 5);
    assert.equal(borrowed1.alreadyGifted, false);
    assert.equal(borrowed1.chassisId, "aurora_sled");
    assert.equal(borrowed1.mountId, "starlight_glider");
    assert.equal(borrowed1.companionId, "crystal_fox");
    assert.deepEqual(borrowed1.frostwakeRig.chassisId, "aurora_sled");
    assert.ok(borrowed1.oddrootLoadout.upgrades.includes("or_glide_wings"));
    assert.equal(store.progressByUser.sarah.fluxShards, sarahShardsBefore + 5);
    assert.equal(store.progressByUser.david.fluxShards, davidShardsBefore);
    assert.equal(store.progressByUser.david.equippedChassis, "terra_dozer");
    assert.equal(store.householdWonder.sharedToys.david.owner, "sarah");

    // Defensive clone check & repeat session-pair anti-farm check
    borrowed1.upgrades.push("mutated_fake");
    assert.ok(!store.progressByUser.sarah.ownedUpgrades.includes("mutated_fake"));
    const borrowed2 = syncMod.borrowSiblingToy(store, "david", "sarah", "oddroot");
    assert.equal(borrowed2.ok, true);
    assert.equal(borrowed2.giftShards, 0);
    assert.equal(borrowed2.alreadyGifted, true);
    assert.equal(store.progressByUser.sarah.fluxShards, sarahShardsBefore + 5);

    // 4. < 38 KB p_fun.games bounding on 5,000 float keyframes across BOTH ghostFrames & ghostBest
    const hugeFrames = Array.from({ length: 5000 }, (_, i) => ({
      t: i * 0.0166666667,
      x: Math.sin(i) * 42.123456789,
      y: 1.23456789,
      z: Math.cos(i) * 38.987654321,
      heading: 2.3456789,
      speed: 18.7654321,
    }));
    const dProg = store.progressByUser.david;
    dProg.games.frostwake.bestWaveSec = 34.5;
    dProg.games.frostwake.ghostFrames = hugeFrames;
    dProg.games.frostwake.ghostBest = { frames: hugeFrames, sec: 34.5 };
    dProg.games.oddroot.bestCircuitSec = 40.2;
    dProg.games.oddroot.ghostFrames = hugeFrames;
    dProg.games.oddroot.ghostBest = hugeFrames;

    rpcCalls.length = 0;
    const pushed = await syncMod.pushActiveCloud(store);
    assert.equal(pushed, true);
    const mergeCall = rpcCalls.find((c) => c.fn === "bloomn_player_merge");
    assert.ok(mergeCall);
    const funBytes = new TextEncoder().encode(JSON.stringify(mergeCall.args.p_fun)).length;
    assert.ok(funBytes < 38 * 1024, `Expected p_fun < 38KB, got ${funBytes} bytes`);
    assert.equal(dProg.games.frostwake.ghostFrames.length, 5000, "In-memory ghostFrames must stay unmutated");
    assert.equal(store.householdWonder.sharedToys.david.owner, "sarah", "sharedToys preserved after household sync");

    // 5. Pre-migration PIN claim guard on fallback
    store.profiles[0].pin = "";
    syncMod.setRpcTransport(async (fn) => {
      if (fn === "bloomn_player_merge") return null;
      if (fn === "yomple_player_find") return { username: "david", has_pin: true };
      return null;
    });
    const pinBlocked = await syncMod.pushActiveCloud(store);
    assert.equal(pinBlocked, false);
  } finally {
    syncMod.clearPendingSyncTimer();
    syncMod.setRpcTransport(null);
  }

  // 6. Verify hub.js line 5 SISTERS & SQL migrations (000100 + 000200)
  const hubLines = fs.readFileSync(path.join(REPO_ROOT, "hub.js"), "utf8").split("\n");
  assert.equal(
    hubLines[4],
    'var SISTERS = ["hop_players","bloom_players","garden_players","star_players","field_players","bloomn_players"];'
  );

  for (const migName of [
    "20261112000100_bloom_n_players.sql",
    "20261112000200_bloom_n_rpc_hardening.sql",
  ]) {
    const sqlPath = path.join(REPO_ROOT, "supabase", "migrations", migName);
    const sql = fs.readFileSync(sqlPath, "utf8");
    const sqlLow = sql.toLowerCase();

    assert.ok(!/\breturns\s+(?:jsonb|setof\s+jsonb)\s+language\s+plpgsql\s+stable\b/i.test(sql), `STABLE found in ${migName}`);
    assert.ok(/yomple_player_find_any[\s\S]*?\bvolatile\b/i.test(sql), `find_any must be VOLATILE in ${migName}`);
    assert.ok(/yomple_player_search[\s\S]*?\bvolatile\b/i.test(sql), `search must be VOLATILE in ${migName}`);
    assert.ok(sql.includes("replace(replace(replace(v_name, '\\', '\\\\'), '%', '\\%'), '_', '\\_')"));
    assert.ok(sqlLow.includes("ilike $2 escape '\\'"));
    assert.ok(sqlLow.includes("yomple_lookup_ok('search'"));
    assert.ok(sqlLow.includes("yomple_lookup_miss('search')"));
    assert.ok(sqlLow.includes("yomple_pin_guard("));
    assert.ok(sqlLow.includes("yomple_pin_missed("));
    assert.ok(sqlLow.includes("yomple_write_ok("));
    assert.ok(sql.includes("^\\d{4}$"));
    assert.ok(!sql.includes("\\d{4,6}"), `5-6 digit plaintext PIN regex found in ${migName}`);
    assert.ok(sqlLow.includes("bloomn_merge_nodes("));
    assert.ok(sqlLow.includes("bloomn_jsonb_array_union("));
    assert.ok(sqlLow.includes("bloomn_merge_games("));

    for (const cw of BANNED_CHILD_CURRICULUM_WORDS) {
      if (cw === "trig") {
        assert.ok(!/\btrig\b/i.test(sqlLow), `Standalone "trig" found in ${migName}`);
      } else {
        assert.ok(!sqlLow.includes(cw), `Curriculum word "${cw}" found in ${migName}`);
      }
    }
  }
});

// ============================================================================
// SUITE 6: F21 — Live 2-Player WebSocket + BroadcastChannel Co-Op Engine
// ============================================================================

class MockPhoenixHub {
  constructor() {
    this.sockets = new Set();
    this.frames = [];
  }

  createWebSocketClass() {
    const hub = this;
    return class MockSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 0;
        this.listeners = { open: [], message: [], close: [], error: [] };
        hub.sockets.add(this);
        queueMicrotask(() => {
          if (this.readyState !== 0) return;
          this.readyState = 1;
          this._emit("open", {});
        });
      }

      addEventListener(type, fn) {
        if (this.listeners[type]) this.listeners[type].push(fn);
      }

      _emit(type, ev) {
        for (const fn of this.listeners[type] || []) fn(ev);
      }

      send(raw) {
        const frame = JSON.parse(raw);
        hub.frames.push({ sender: this, frame });
        if (frame.event === "phx_join") {
          this.topic = frame.topic;
          this.selfBroadcast = Boolean(frame.payload?.config?.broadcast?.self);
          queueMicrotask(() => {
            if (this.readyState !== 1) return;
            this._emit("message", {
              data: JSON.stringify({
                topic: frame.topic,
                event: "phx_reply",
                payload: { status: "ok", response: {} },
                ref: frame.ref,
                join_ref: frame.join_ref,
              }),
            });
          });
          return;
        }
        if (frame.event === "broadcast") {
          for (const peer of hub.sockets) {
            if (peer.readyState !== 1 || peer.topic !== frame.topic) continue;
            if (peer === this && !this.selfBroadcast) continue;
            queueMicrotask(() => {
              if (peer.readyState === 1) {
                peer._emit("message", { data: JSON.stringify(frame) });
              }
            });
          }
        }
      }

      close() {
        this.readyState = 3;
        hub.sockets.delete(this);
        this._emit("close", {});
      }
    };
  }
}

test("F21 (Multiplayer S5.1 & S5.2): Exports, WS URL/Topic formatting & Phoenix Channels v1.0.0 protocol", async () => {
  assert.deepEqual(SHARED_COIN_IDS, ["coin_0", "coin_1", "coin_2", "coin_3"]);
  assert.equal(SHARED_COIN_REWARD_SHARDS, 3);
  assert.equal(SHARED_COIN_RESPAWN_MS, 6000);

  const wsUrl = buildRealtimeWsUrl();
  assert.ok(wsUrl.startsWith("wss://digcgqltrlmhgmzgmvwc.supabase.co/realtime/v1/websocket?apikey="));
  assert.ok(wsUrl.endsWith("&vsn=1.0.0"));

  const mpSrc = fs.readFileSync(path.join(BLOOM_N_DIR, "core", "multiplayer.js"), "utf8").toLowerCase();
  for (const w of BANNED_CHILD_WORDS) {
    assert.ok(!mpSrc.includes(w), `Banned word "${w}" in multiplayer.js`);
  }
  for (const cw of BANNED_CHILD_CURRICULUM_WORDS) {
    assert.ok(!mpSrc.includes(cw), `Curriculum word "${cw}" in multiplayer.js`);
  }

  const defaultClient = createMultiplayerClient({ familyCode: "", realmId: "oddroot", WebSocketImpl: null, BroadcastChannelImpl: null });
  assert.equal(defaultClient.topic, "realtime:bloomn:OPEN-HOUSE:oddroot");
  assert.equal(defaultClient.broadcastChannelName, "bloomn-coop:OPEN-HOUSE:oddroot");

  const hub = new MockPhoenixHub();
  const MockWS = hub.createWebSocketClass();
  const sarahEvents = [];

  const david = createMultiplayerClient({
    realmId: "frostwake",
    familyCode: "maple-k7q2",
    userId: "david",
    displayName: "David",
    avatar: "🦁",
    WebSocketImpl: MockWS,
    BroadcastChannelImpl: null,
    throttleMs: 60,
    heartbeatIntervalMs: 35,
  });
  const sarah = createMultiplayerClient({
    realmId: "frostwake",
    familyCode: "MAPLE-K7Q2",
    userId: "sarah",
    displayName: "Sarah",
    avatar: "🦄",
    WebSocketImpl: MockWS,
    BroadcastChannelImpl: null,
    throttleMs: 60,
    heartbeatIntervalMs: 35,
    onRemoteEvent: (ev) => sarahEvents.push(ev),
  });

  try {
    david.connect();
    sarah.connect();
    await waitMs(20);

    const joinFrame = hub.frames.find((f) => f.frame.event === "phx_join")?.frame;
    assert.ok(joinFrame);
    assert.equal(joinFrame.topic, "realtime:bloomn:MAPLE-K7Q2:frostwake");
    assert.deepEqual(joinFrame.payload.config.broadcast, { self: false, ack: false });
    assert.equal(joinFrame.payload.config.presence.key, "david");

    // Throttled movement vs immediate status change
    assert.equal(david.publishLocalState({ x: 10, y: 0, z: -5, status: "roaming" }), true);
    assert.equal(david.publishLocalState({ x: 11, y: 0, z: -6, status: "roaming" }), false); // throttled
    assert.equal(david.publishLocalState({ x: 11, y: 0, z: -6, status: "thinking", zoneProgressRatio: 0.75 }), true); // immediate on status change!

    await waitMs(55);
    assert.ok(hub.frames.some((f) => f.frame.topic === "phoenix" && f.frame.event === "heartbeat"));
    const sPeers = sarah.getPeers();
    assert.equal(sPeers.length, 1);
    assert.equal(sPeers[0].userId, "david");
    assert.equal(sPeers[0].status, "thinking");
    assert.equal(sPeers[0].zoneProgressRatio, 0.75);

    david.sendGateBurst({ overdrive: true, worldId: "W1", nodeId: "W1.2", x: 11, y: 0, z: -6 });
    await waitMs(15);
    assert.equal(sarahEvents.length, 1);
    assert.equal(sarahEvents[0].type, "gate_burst");
    assert.equal(sarahEvents[0].overdrive, true);

    david.disconnect();
    await waitMs(15);
    assert.equal(sarah.getPeers().length, 0);
    assert.ok(hub.frames.some((f) => f.frame.event === "phx_leave"));
  } finally {
    david.disconnect();
    sarah.disconnect();
  }
});

test("F21 (Multiplayer S5.3, S5.4 & S5.5): Real BroadcastChannel offline sync, WS+BC msgId dedup, Star-Coin race & respawn, and resilient offline fallback", async () => {
  // 1. Offline mode (WebSocketImpl: null) using Node's real BroadcastChannel + simultaneous WS+BC deduplication
  const hub = new MockPhoenixHub();
  const MockWS = hub.createWebSocketClass();
  const receivedBySarah = [];

  const david = createMultiplayerClient({
    realmId: "oddroot",
    familyCode: "PINE-99",
    userId: "david",
    displayName: "David",
    avatar: "🦁",
    WebSocketImpl: MockWS, // BOTH MockWS AND real globalThis.BroadcastChannel active!
    respawnMs: 75,
    stalePeerMs: 120,
  });

  const sarah = createMultiplayerClient({
    realmId: "oddroot",
    familyCode: "PINE-99",
    userId: "sarah",
    displayName: "Sarah",
    avatar: "🦄",
    WebSocketImpl: MockWS,
    respawnMs: 75,
    stalePeerMs: 120,
    onRemoteEvent: (ev) => receivedBySarah.push(ev),
  });

  try {
    david.connect();
    sarah.connect();
    await waitMs(20);

    sarah.publishLocalState({ x: -4, y: 1, z: 8, chassisOrMount: "starlight_glider", status: "roaming" });
    david.publishLocalState({ x: 6, y: 0, z: -3, chassisOrMount: "bramble_boar", status: "surge" });
    await waitMs(25);

    // Reciprocal discovery
    assert.equal(sarah.getPeers().length, 1);
    assert.equal(sarah.getPeers()[0].chassisOrMount, "bramble_boar");
    assert.equal(sarah.getPeers()[0].status, "surge");
    assert.equal(sarah.getPeers()[0].streakActive, true);
    assert.equal(david.getPeers().length, 1);
    assert.equal(david.getPeers()[0].chassisOrMount, "starlight_glider");

    // Dual-transport msgId deduplication: sent over BOTH BroadcastChannel AND MockWebSocket, delivered ONCE!
    david.sendFriendlyFlare({ x: 6, y: 2, z: -3 });
    david.sendGateBurst({ overdrive: false, worldId: "W2", nodeId: "W2.1", x: 6, y: 0, z: -3 });
    await waitMs(25);
    assert.equal(receivedBySarah.filter((e) => e.type === "friendly_flare").length, 1);
    assert.equal(receivedBySarah.filter((e) => e.type === "gate_burst").length, 1);

    // Shared loose Star-Coin race lockout + auto-respawn
    assert.equal(david.getCoinStates().coin_2.available, true);
    assert.equal(david.getCoinStates().coin_2.rewardShards, 3);
    assert.equal(david.tryGrabSharedCoin("coin_2", { x: 4, y: 0, z: 6 }), true);
    assert.equal(david.tryGrabSharedCoin("coin_2", { x: 4, y: 0, z: 6 }), false);

    await waitMs(20);
    assert.equal(sarah.getCoinStates().coin_2.available, false);
    assert.equal(sarah.getCoinStates().coin_2.grabbedBy, "david");
    assert.equal(sarah.tryGrabSharedCoin("coin_2", { x: 4, y: 0, z: 6 }), false);
    assert.equal(sarah.getCoinStates().coin_0.available, true);
    const coinEvents = receivedBySarah.filter((e) => e.type === "coin_grab");
    assert.equal(coinEvents.length, 1);
    assert.equal(coinEvents[0].rewardShards, 3);
    assertCleanChildText(coinEvents[0].bannerText, "coinGrabBanner");

    // Wait past 75ms respawn cooldown -> both clients respawn coin_2!
    await waitMs(80);
    assert.equal(david.getCoinStates().coin_2.available, true);
    assert.equal(sarah.getCoinStates().coin_2.available, true);
    assert.equal(sarah.tryGrabSharedCoin("coin_2", { x: 4, y: 0, z: 6 }), true);

    // Stale peer pruning after stalePeerMs (120ms) of silence
    await waitMs(150);
    assert.equal(sarah.getPeers().length, 0);
  } finally {
    david.disconnect();
    sarah.disconnect();
  }

  // 2. Throwing WebSocketImpl resilience (offline airplane-mode browser)
  class ThrowingWS {
    constructor() {
      throw new Error("Network unreachable");
    }
  }
  const offlineA = createMultiplayerClient({
    realmId: "frostwake",
    familyCode: "OFFLINE-FAM",
    userId: "david",
    WebSocketImpl: ThrowingWS,
  });
  const offlineB = createMultiplayerClient({
    realmId: "frostwake",
    familyCode: "OFFLINE-FAM",
    userId: "sarah",
    WebSocketImpl: ThrowingWS,
  });
  try {
    offlineA.connect();
    offlineB.connect();
    offlineA.publishLocalState({ x: 3, y: 0, z: 4, status: "roaming" });
    await waitMs(20);
    assert.equal(offlineB.getPeers().length, 1);
    assert.equal(offlineB.getPeers()[0].userId, "david");
  } finally {
    offlineA.disconnect();
    offlineB.disconnect();
  }
});
