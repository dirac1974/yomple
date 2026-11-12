import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BANNED_CHILD_WORDS,
  SUB_GAMES,
  WORLDS,
  NODE_MAP,
  createInitialProgress,
  createSessionState,
  generateEncounter,
  applyBeamAction,
  evaluateCommit,
  pickNextEncounter,
  mergeProgress,
} from "../core/engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOOM_N_DIR = path.resolve(__dirname, "..");

test("Sub-game lineup matches exact user selection (#1 Frostwake live, #2 Oddroot, #3 Stardrift+Astrolabes, #4 Arc Bastion, #5 skipped)", () => {
  assert.equal(SUB_GAMES.length, 4);
  assert.deepEqual(
    SUB_GAMES.map((g) => g.id),
    ["frostwake", "oddroot", "stardrift", "arc_bastion"]
  );
  assert.equal(SUB_GAMES[0].status, "live");
  assert.ok(!SUB_GAMES.some((g) => g.id.includes("echo")));
});

test("All 24 curriculum nodes (W0-W7) generate valid 3D encounters with <= 6-word micro-prompts and zero shame words", () => {
  const nodeIds = Object.keys(NODE_MAP);
  assert.equal(WORLDS.length, 8);
  assert.ok(nodeIds.length >= 24);

  for (const nodeId of nodeIds) {
    for (let trial = 0; trial < 15; trial++) {
      const enc = generateEncounter(nodeId);
      assert.ok(Number.isFinite(enc.answer), `Non-finite answer on ${nodeId}: ${enc.answer}`);
      const wordCount = enc.promptShort.trim().split(/\s+/).length;
      assert.ok(wordCount <= 6, `Prompt exceeds 6 words on ${nodeId}: "${enc.promptShort}" (${wordCount})`);

      const combinedCopy = `${enc.promptShort} ${enc.equationText} ${enc.visualHint || ""}`.toLowerCase();
      for (const banned of BANNED_CHILD_WORDS) {
        assert.ok(!combinedCopy.includes(banned), `Banned word "${banned}" in ${nodeId}: ${combinedCopy}`);
      }
    }
  }
});

test("Static HTML, CSS, and UI JS pass Bloom anxiety-safety rails (no shame words, no timers, no raw #ff0000)", () => {
  const files = ["index.html", "styles.css", "portal.js", "frostwake/frostwake-3d.js"];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(BLOOM_N_DIR, rel), "utf8").toLowerCase();
    assert.ok(!src.includes("#ff0000"), `Raw #ff0000 found in ${rel}`);
    assert.ok(!src.includes("countdown"), `Countdown timer found in ${rel}`);
    for (const banned of ["wrong", "incorrect", "time's up", "defeated", "stupid"]) {
      // Allow comments only by stripping JS/HTML comments before checking child-facing literals
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/<!--[\s\S]*?-->/g, "");
      assert.ok(!stripped.includes(banned), `Banned child-facing word "${banned}" found in ${rel}`);
    }
  }
});

test("Dual-Path Parity: 1-Shot Mental Overdrive earns 1.5x Flux, and Twin-Beam steps preserve algebraic truth", () => {
  const prog = createInitialProgress("sarah");
  const session = createSessionState();

  // 1-Shot Mental Overdrive on W3.3 Twin-Tower Clash
  const enc1 = generateEncounter("W3.3");
  const res1 = evaluateCommit({
    encounter: enc1,
    committedValue: enc1.answer,
    planMs: 1800,
    execMs: 400,
    progress: prog,
    session,
  });
  assert.equal(res1.outcome, "clear");
  assert.equal(res1.overdrive, true);
  assert.equal(res1.shardsEarned, 21); // 14 * 1.5

  // Step-by-step Twin-Beam Slicer on W3.3 preserves exact root n
  let enc2 = generateEncounter("W3.3");
  const originalAnswer = enc2.answer;
  let guard = 0;
  while (enc2.beamActions && enc2.beamActions.length > 0 && guard < 5) {
    const stepRes = applyBeamAction(enc2, enc2.beamActions[0].id, prog);
    assert.equal(stepRes.kind, "transformed");
    enc2 = stepRes.encounter;
    const lhsVal = enc2.left.a * originalAnswer + enc2.left.b;
    const rhsVal = enc2.right.a * originalAnswer + enc2.right.b;
    assert.ok(Math.abs(lhsVal - rhsVal) < 1e-6, `Equivalence broken: ${enc2.equationText} for n=${originalAnswer}`);
    guard++;
  }
  assert.ok(enc2.stepsUsed >= 1);
});

test("Camouflaged 2-step gate (c = b - an) triggers zero-penalty magnetic repulsion on like-term trap", () => {
  const prog = createInitialProgress("sarah");
  const enc = generateEncounter("W3.1", { camouflage: true });
  const trap = enc.beamActions.find((a) => a.kind === "repel_trap");
  assert.ok(trap, "Expected repel_trap on camouflaged W3.1 encounter");

  const res = applyBeamAction(enc, trap.id, prog);
  assert.equal(res.kind, "magnetic_repel");
  assert.equal(prog.misconceptionTags.like_term_repulsion, 1);
});

test("Dynamic Friction Cushion: 2nd miss triggers warm Fox reveal + full shards + shelve, and consecutive misses trigger 4-item Surge Wave", () => {
  const prog = createInitialProgress("david");
  const session = createSessionState();

  const encA = generateEncounter("W1.2");
  // 1st miss -> directional nudge
  const m1 = evaluateCommit({
    encounter: encA,
    committedValue: encA.answer + 50,
    progress: prog,
    session,
  });
  assert.equal(m1.outcome, "nudge");
  assert.equal(m1. cue.includes("high"), true);

  // 2nd miss on same item -> warm Fox reveal + full 14 shards + shelved!
  const shardsBefore = prog.fluxShards;
  const m2 = evaluateCommit({
    encounter: encA,
    committedValue: encA.answer - 25,
    progress: prog,
    session,
  });
  assert.equal(m2.outcome, "warm_reveal");
  assert.equal(prog.fluxShards - shardsBefore, 14);
  assert.ok(session.shelvedIds.includes("W1.2"));

  // Next item missed twice pushes friction >= 2.8 -> triggers 4-item Overdrive Surge Wave!
  const encB = generateEncounter("W1.4");
  evaluateCommit({ encounter: encB, committedValue: encB.answer + 10, progress: prog, session });
  const m4 = evaluateCommit({ encounter: encB, committedValue: encB.answer + 5, progress: prog, session });
  assert.equal(m4.outcome, "warm_reveal");
  assert.equal(m4.surgeTriggered, true);
  assert.equal(session.inSurge, true);
  assert.equal(session.surgeQueue.length, 4);

  const surgeEnc = pickNextEncounter(prog, session, "W1");
  assert.ok(surgeEnc.uid);
});

test("Calibration Glacier (W0) routes Sarah-style solver to W2+W4 and David-style solver to W1", () => {
  const progSarah = createInitialProgress("auto");
  const sessS = createSessionState();
  for (let i = 0; i < 6; i++) {
    const enc = pickNextEncounter(progSarah, sessS, "W0");
    evaluateCommit({ encounter: enc, committedValue: enc.answer, progress: progSarah, session: sessS });
  }
  assert.equal(progSarah.calibrated, true);
  assert.equal(progSarah.activeWorld, "W2");
  assert.ok(progSarah.unlockedWorlds.includes("W4"));

  const progDavid = createInitialProgress("auto");
  const sessD = createSessionState();
  for (let i = 0; i < 6; i++) {
    const enc = pickNextEncounter(progDavid, sessD, "W0");
    const hit = i < 2; // Clears W0.1 and W0.2 (n + 100 = 100 - 200), misses higher algebra
    if (hit) {
      evaluateCommit({ encounter: enc, committedValue: enc.answer, progress: progDavid, session: sessD });
    } else {
      evaluateCommit({ encounter: enc, committedValue: enc.answer + 99, progress: progDavid, session: sessD });
      evaluateCommit({ encounter: enc, committedValue: enc.answer + 99, progress: progDavid, session: sessD });
    }
  }
  assert.equal(progDavid.calibrated, true);
  assert.equal(progDavid.activeWorld, "W1");
});

test("Monotonic mergeProgress never loses shards, upgrades, mysteries, or personal records across devices", () => {
  const ipad = createInitialProgress("david");
  ipad.fluxShards = 140;
  ipad.ownedUpgrades = ["wide_blade"];
  ipad.records.deepestSubZero = 200;

  const phone = createInitialProgress("david");
  phone.fluxShards = 95;
  phone.ownedUpgrades = ["spirit_fox"];
  phone.discoveredMysteries = ["moon_center"];
  phone.records.longestRampM = 64;

  const merged = mergeProgress(ipad, phone);
  assert.equal(merged.fluxShards, 140);
  assert.deepEqual(merged.ownedUpgrades.sort(), ["spirit_fox", "wide_blade"]);
  assert.ok(merged.discoveredMysteries.includes("moon_center"));
  assert.equal(merged.records.deepestSubZero, 200);
  assert.equal(merged.records.longestRampM, 64);
});
