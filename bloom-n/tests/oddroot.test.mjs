/**
 * Oddroot Wilds: Alchemy Sanctuary — Comprehensive Deterministic Node + Three.js r170 Test Suite
 * Exercises real OddrootWorld3D, OddrootShrineManager, BlightOppositionSystem, SanctuaryMenagerie3D,
 * OddrootCoopManager, OddrootAudio, and getSanctuaryJournalEntries across all 6 Pillars (Suites 1-13).
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as THREE from "../vendor/three.module.min.js";
import * as CoreEngine from "../core/engine.js";
import { OddrootAudio } from "../oddroot/audio.js";
import {
  OddrootWorld3D,
  getSanctuaryJournalEntries,
  SANCTUARY_ISLANDS,
  SANCTUARY_BRIDGES,
  SHRINE_ANCHORS,
  ODDROOT_MOUNT_SPECS,
  SHARED_COIN_IDS,
} from "../oddroot/oddroot-3d.js";
import {
  BASE_SIPHON_RADIUS,
  WIDE_SIPHON_MULTIPLIER,
  BRAMBLE_DRAG_FACTOR,
  PLOW_FULL_SPEED_FACTOR,
} from "../oddroot/blight-opposition.js";
import {
  elixirLevelToY,
  SHRINE_CHASM_SPAN_Z,
  SHRINE_STUB_SPAN_Z,
} from "../oddroot/shrines-3d.js";
import { SHARED_COIN_POSITIONS } from "../oddroot/coop-3d.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BLOOM_N_DIR = path.resolve(__dirname, "..");
const ODDROOT_DIR = path.join(BLOOM_N_DIR, "oddroot");

function createMockCanvas(width = 1280, height = 720) {
  return {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    parentElement: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
    getContext: () => null,
  };
}

function makeSeededRng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function stepFrames(world, frames, dt = 1 / 60) {
  for (let i = 0; i < frames; i++) {
    world.step(dt);
  }
}

function makeW74Fixture(quarterTurns = 2, startReal = 4) {
  const mod = ((quarterTurns % 4) + 4) % 4;
  const endReal = startReal * [1, 0, -1, 0][mod];
  const endImag = startReal * [0, 1, 0, -1][mod];
  return {
    uid: `W7.4-fixture-${quarterTurns}`,
    nodeId: "W7.4",
    worldId: "W7",
    kind: "complex_i_rotation",
    encounterType: "astrolabe_shrine",
    title: "Quarter-Turn Star Portal",
    promptShort: "Dial final beam target",
    equationText: `${startReal} · i^${quarterTurns} = ?`,
    targetLabel: "Beam",
    answer: endReal,
    startDial: startReal,
    detents: [-8, -4, -2, 0, 2, 4, 8],
    beamActions: [],
    portalMeta: {
      startReal,
      startAngleDeg: 0,
      quarterTurns,
      angleDeg: quarterTurns * 90,
      endReal,
      endImag,
      iPower: quarterTurns,
    },
  };
}

test("Suite 1: Vendored Three.js r170 headless scene graph, Toon+Fresnel materials & full Realm3DAdapter surface", () => {
  assert.equal(THREE.REVISION, "170");
  const audio = new OddrootAudio();
  const events = [];
  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    audio,
    onOppositionEvent: (e) => events.push(e),
  });

  assert.equal(world.webglAvailable, false);
  assert.ok(world.scene.isScene);
  assert.ok(world.scene.children.length >= 8);
  assert.ok(world.toonGradientTex.isDataTexture);
  assert.equal(world.observatoryRings.length, 6);
  assert.equal(SANCTUARY_ISLANDS.length, 8);
  assert.equal(SANCTUARY_BRIDGES.length, 9);
  assert.equal(SHRINE_ANCHORS.length, 4);

  // Verify Fresnel rim shader hook on Toon materials
  let foundRimMaterial = false;
  world.scene.traverse((obj) => {
    if (obj.isMesh && obj.material?.userData?.rimUniforms) {
      foundRimMaterial = true;
      assert.equal(typeof obj.material.customProgramCacheKey, "function");
    }
  });
  assert.equal(foundRimMaterial, true);

  // Verify Observatory tier lighting (1..6)
  world.setObservatoryTier(4);
  assert.equal(world.rigState.observatoryTier, 4);
  assert.ok(world.observatoryRings[3].mat.emissiveIntensity > 0.8);
  assert.ok(world.observatoryRings[4].mat.emissiveIntensity < 0.25);

  // Lifecycle & wonder hooks
  world.start();
  assert.equal(world.running, true);
  world.resize();
  world.setSurgeMode(true);
  assert.equal(world.rigState.inSurge, true);
  world.setSurgeMode(false);
  assert.equal(world.rigState.inSurge, false);

  world.triggerGuardianAwakening("W1");
  assert.ok(world.guardianAnim !== null);
  stepFrames(world, 10, 0.05);

  const enc = CoreEngine.generateEncounter("W0.1", { rng: makeSeededRng(1) });
  world.populateEncounters([enc]);
  assert.equal(world.areAllEncountersCleared(), false);
  const autoSlot = world.engageAutopilotToNextGate();
  assert.ok(autoSlot !== null);
  stepFrames(world, 15, 1 / 60);

  world.stop();
  assert.equal(world.running, false);
  world.dispose();
});

test("Suite 2: Active spatial opposition — creeping Blight-Thorns, drifting Gloom-Spores & sleepy creature spore-bubbles", () => {
  const world = new OddrootWorld3D({ canvas: createMockCanvas() });
  world.setEncounterDockOpen(false);

  const patch0 = world.blightPatches[0];
  const spore0 = world.gloomClouds[0];
  const beforePatchDist = Math.hypot(patch0.targetX - patch0.x, patch0.targetZ - patch0.z);
  const beforeRadius = patch0.currentRadius;
  const beforeSporeDist = Math.hypot(spore0.targetX - spore0.x, spore0.targetZ - spore0.z);

  stepFrames(world, 90, 1 / 60);

  const afterPatchDist = Math.hypot(patch0.targetX - patch0.x, patch0.targetZ - patch0.z);
  const afterSporeDist = Math.hypot(spore0.targetX - spore0.x, spore0.targetZ - spore0.z);

  assert.ok(afterPatchDist < beforePatchDist, "Blight-Thorns must creep closer to creature nests");
  assert.ok(patch0.currentRadius > beforeRadius, "Blight-Thorns must thicken radially while unpaused");
  assert.ok(afterSporeDist < beforeSporeDist, "Gloom-Spores must drift closer to creature nests");

  // Advance until a nest reaches sleepiness 1.0 -> harmless sleepy spore-bubble, zero deletion
  const creatureCountBefore = world.menagerie.creatures.size;
  stepFrames(world, 320, 0.05);

  const oddling = world.menagerie.getCreature("luminous_oddling");
  assert.equal(oddling.asleepInBubble, true);
  assert.equal(oddling.sleepBubbleMesh.visible, true);
  assert.equal(world.menagerie.creatures.size, creatureCountBefore);
});

test("Suite 3: Mandatory Math-Pause Law — setEncounterDockOpen(true) & shrine proximity produce exact 0.0 IEEE-754 delta", () => {
  const world = new OddrootWorld3D({ canvas: createMockCanvas() });
  stepFrames(world, 10, 1 / 60);

  world.setEncounterDockOpen(true);
  assert.equal(world.isOppositionPaused(), true);

  const patchSnap = world.blightPatches.map((p) => ({
    x: p.x,
    y: p.y,
    z: p.z,
    currentRadius: p.currentRadius,
    density: p.density,
  }));
  const sporeSnap = world.gloomClouds.map((s) => ({
    x: s.x,
    y: s.y,
    z: s.z,
    bobPhase: s.bobPhase,
  }));

  // Step 100 frames (5.0 simulated seconds) while dock is open!
  stepFrames(world, 100, 0.05);

  world.blightPatches.forEach((p, idx) => {
    assert.strictEqual(p.x, patchSnap[idx].x);
    assert.strictEqual(p.y, patchSnap[idx].y);
    assert.strictEqual(p.z, patchSnap[idx].z);
    assert.strictEqual(p.currentRadius, patchSnap[idx].currentRadius);
    assert.strictEqual(p.density, patchSnap[idx].density);
  });
  world.gloomClouds.forEach((s, idx) => {
    assert.strictEqual(s.x, sporeSnap[idx].x);
    assert.strictEqual(s.y, sporeSnap[idx].y);
    assert.strictEqual(s.z, sporeSnap[idx].z);
    assert.strictEqual(s.bobPhase, sporeSnap[idx].bobPhase);
  });

  // Closing dock immediately resumes creeping
  world.setEncounterDockOpen(false);
  assert.equal(world.isOppositionPaused(), false);
  stepFrames(world, 20, 0.05);
  assert.notStrictEqual(world.blightPatches[0].x, patchSnap[0].x);

  // Approaching an uncleared shrine also auto-pauses opposition
  const enc = CoreEngine.generateEncounter("W0.1", { rng: makeSeededRng(3) });
  const slots = world.populateEncounters([enc]);
  const s0 = slots[0];
  world.rigState.x = s0.x + Math.sin(s0.rotY) * 6.0;
  world.rigState.z = s0.z + Math.cos(s0.rotY) * 6.0;
  world.step(1 / 60);
  assert.equal(world.activeGateSlot, s0);
  assert.equal(world.isOppositionPaused(), true);

  const autoPauseX = world.blightPatches[0].x;
  stepFrames(world, 30, 0.05);
  assert.strictEqual(world.blightPatches[0].x, autoPauseX);
});

test("Suite 4: Upgrade Payoff #1 — 0.45x Blight-Thorn drag vs 1.0x or_tusk_plow (and wide_blade alias) full-speed smash", () => {
  assert.equal(BRAMBLE_DRAG_FACTOR, 0.45);
  assert.equal(PLOW_FULL_SPEED_FACTOR, 1.0);

  const worldBasic = new OddrootWorld3D({ canvas: createMockCanvas() });
  worldBasic.applyLoadout({ games: { oddroot: { equippedMount: "bramble_boar", sanctuaryUpgrades: [] } } });

  const eventsPlow = [];
  const worldPlow = new OddrootWorld3D({
    canvas: createMockCanvas(),
    onOppositionEvent: (e) => eventsPlow.push(e),
  });
  worldPlow.applyLoadout({
    games: { oddroot: { equippedMount: "bramble_boar", sanctuaryUpgrades: ["or_tusk_plow"] } },
  });

  // Place large thick Blight-Thorn patches directly along the drive path (0, 22 -> 0, 8)
  for (const w of [worldBasic, worldPlow]) {
    w.rigState.x = 0;
    w.rigState.z = 16;
    w.rigState.heading = Math.PI;
    w.blightPatches[0].x = 0;
    w.blightPatches[0].z = 14.5;
    w.blightPatches[0].currentRadius = 8.5;
    w.blightPatches[0].radius = 8.5;
    w.blightPatches[0].dissolved = false;
    w.setDriveInputs(0, 1.0, false);
  }

  stepFrames(worldBasic, 45, 1 / 60);
  stepFrames(worldPlow, 45, 1 / 60);

  const distBasic = Math.abs(worldBasic.rigState.z - 16);
  const distPlow = Math.abs(worldPlow.rigState.z - 16);

  assert.equal(worldBasic.blightPatches[0].dissolved, false);
  assert.equal(worldPlow.blightPatches[0].dissolved, true);
  assert.ok(worldPlow.blightPatches[0].bloomFlowerTimer > 0);
  assert.equal(worldPlow.blightPatches[0].flowerGroup.visible, true);
  assert.ok(
    distPlow > distBasic * 1.85,
    `Expected or_tusk_plow distance (${distPlow.toFixed(2)}) > 1.85x basic (${distBasic.toFixed(2)})`
  );
  assert.ok(eventsPlow.some((e) => e.kind === "bramble_plowed" && e.shardsEarned > 0));

  // Verify Frostwake cross-realm "wide_blade" alias also smashes at 1.0x full speed
  const worldAlias = new OddrootWorld3D({ canvas: createMockCanvas() });
  worldAlias.applyLoadout({ ownedUpgrades: ["wide_blade"] });
  const resAlias = worldAlias.blightSystem.evaluateBrambleContact(
    worldAlias.blightPatches[0].x,
    worldAlias.blightPatches[0].z,
    0,
    5.0,
    worldAlias.rigState.upgradesSet,
    {}
  );
  assert.equal(resAlias.dragMultiplier, 1.0);
  assert.equal(worldAlias.blightPatches[0].dissolved, true);
});

test("Suite 5: Upgrade Payoff #2 — 1x (3.2m) vs 3x (9.6m) or_wide_siphon Gloom-Spore purification vortex", () => {
  assert.equal(BASE_SIPHON_RADIUS, 3.2);
  assert.equal(WIDE_SIPHON_MULTIPLIER, 3.0);

  const setupWorldWithSpores = (upgrades) => {
    const world = new OddrootWorld3D({ canvas: createMockCanvas() });
    world.applyLoadout({ games: { oddroot: { sanctuaryUpgrades: upgrades } } });
    world.rigState.x = 0;
    world.rigState.z = 0;

    const distances = [1.8, 2.9, 4.2, 5.8, 7.6, 9.1];
    world.gloomClouds.forEach((sp, idx) => {
      if (idx < distances.length) {
        sp.active = true;
        sp.x = distances[idx];
        sp.z = 0;
      } else {
        sp.active = false;
      }
    });
    return world;
  };

  const worldBase = setupWorldWithSpores([]);
  assert.equal(worldBase.getSiphonRadius(), 3.2);
  const resBase = worldBase.triggerRealmQuickAction();
  assert.equal(resBase.purifiedSpores, 2);

  const worldWide = setupWorldWithSpores(["or_wide_siphon"]);
  worldWide.menagerie.nudgeNestSleepiness(0, 1.2);
  // Move nest 0 creature within 9.6m to verify wake-up
  worldWide.menagerie.nests[0].x = 6.0;
  worldWide.menagerie.nests[0].z = 0.0;
  assert.equal(worldWide.getSiphonRadius(), 9.6);
  const resWide = worldWide.triggerRealmQuickAction();
  assert.equal(resWide.purifiedSpores, 6);
  assert.equal(worldWide.menagerie.getCreature("luminous_oddling").asleepInBubble, false);
});

test("Suite 6: Upgrade Payoff #3 — or_glide_wings chasm soar, Archipelago Updraft Cushion & Elixir Pushback Wave", () => {
  const events = [];
  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    onOppositionEvent: (e) => events.push(e),
  });
  world.applyLoadout({
    games: { oddroot: { equippedMount: "starlight_glider", sanctuaryUpgrades: ["or_glide_wings"] } },
  });

  const chasm = world.blightSystem.thornChasms[0];
  world.rigState.x = chasm.x;
  world.rigState.z = chasm.z + 1.2;
  world.rigState.heading = Math.PI;
  world.setDriveInputs(0, 1.0, true);
  stepFrames(world, 20, 1 / 60);

  assert.equal(world.rigState.glidingAirborne, true);
  assert.ok(world.rigState.y > chasm.y + 2.0, "or_glide_wings must lift explorer cleanly over thorn chasm");
  assert.ok(events.some((e) => e.kind === "chasm_soar"));

  // Archipelago Updraft Cushion: step off outer island rim -> zero fall death, lifted safely onto moss
  world.rigAnim = null;
  world.rigState.x = 55;
  world.rigState.z = 55;
  world.rigState.speed = 0;
  world.setDriveInputs(0, 0, false);
  world.step(0.05);
  assert.equal(world.rigAnim?.kind, "updraft_lift");
  stepFrames(world, 20, 0.05);
  assert.equal(world._sampleArchipelago(world.rigState.x, world.rigState.z).onGround, true);

  // Bioluminescent Elixir Pushback Wave on shrine clear dissolves Blight-Thorns & wakes creatures
  const enc = CoreEngine.generateEncounter("W0.1", { rng: makeSeededRng(6) });
  const [slot] = world.populateEncounters([enc]);
  world.activeGateSlot = slot;
  world.blightPatches[0].dissolved = false;
  world.blightPatches[0].x = slot.x + 5.0;
  world.blightPatches[0].z = slot.z + 5.0;
  world.menagerie.nests[0].x = slot.x + 6.0;
  world.menagerie.nests[0].z = slot.z + 6.0;
  world.menagerie.nudgeNestSleepiness(0, 1.2);
  assert.equal(world.menagerie.getCreature("luminous_oddling").asleepInBubble, true);

  world.playCommitVisual({ outcome: "clear", overdrive: true, shardsEarned: 21 }, enc);
  stepFrames(world, 25, 0.05);

  assert.equal(world.blightPatches[0].dissolved, true);
  assert.equal(world.menagerie.getCreature("luminous_oddling").asleepInBubble, false);
  assert.ok(events.some((e) => e.kind === "elixir_wave"));
});

test("Suite 7: Mount toggle, cross-realm cosmetics, Sibling borrowedToy & 3D Siphon-Staff 4 orb species", () => {
  const world = new OddrootWorld3D({ canvas: createMockCanvas() });

  world.applyLoadout(
    {
      ownedUpgrades: ["or_crystal_fox", "or_antler_crown"],
      games: { oddroot: { equippedMount: "glide_cape", mosaicForged: true } },
      discoveredMysteries: ["moon_center", "astrolabe_lock"],
    },
    { auroraBladeTrimUnlocked: true },
    { ok: true, owner: "david", displayName: "David", upgrades: ["or_tusk_plow"] }
  );

  assert.equal(world.rigState.mountId, "starlight_glider");
  assert.equal(world.avatarGroup.userData.goldenMosaicTrim, true);
  assert.equal(world.avatarGroup.userData.auroraTrim, true);
  assert.equal(world.avatarGroup.userData.borrowedFrom, "david");
  assert.ok(world.companionFox !== null);

  assert.equal(world.toggleMountMode(), "bramble_boar");
  assert.equal(world.rigState.mountId, "bramble_boar");
  assert.ok(world.boarLegs.length === 4);
  assert.equal(ODDROOT_MOUNT_SPECS.length, 2);

  // Fire all 4 Siphon-Staff orb species and verify buoyant -x helium_puff arcs higher
  const target = { x: 0, y: 1.5, z: 10 };
  const pSun = world.fireSiphonOrb("sun_orb", target, 0.6);
  const pFrost = world.fireSiphonOrb("frost_spore", target, 0.6);
  const pPod = world.fireSiphonOrb("rune_pod", target, 0.6);
  const pPuff = world.fireSiphonOrb("helium_puff", target, 0.6);

  stepFrames(world, 6, 0.05); // t = 0.30s -> u = 0.5 midpoint
  assert.notEqual(pSun.mesh.geometry, pFrost.mesh.geometry);
  assert.notEqual(pPod.mesh.geometry, pPuff.mesh.geometry);
  assert.ok(
    pPuff.mesh.position.y > pSun.mesh.position.y + 1.5,
    "Buoyant -x helium_puff must arc visibly higher than + sun_orb"
  );
});

test("Suite 8: All 33 W0-W7 braided 3D Sanctuary Shrines & defensive payload normalizers", () => {
  const world = new OddrootWorld3D({ canvas: createMockCanvas() });
  const rng = makeSeededRng(88);

  const nodeIds = Object.keys(CoreEngine.NODE_MAP || {});
  if (!nodeIds.includes("W7.4")) {
    nodeIds.push("W7.4");
  }
  assert.ok(nodeIds.length >= 33, `Expected >= 33 curriculum nodes, got ${nodeIds.length}`);

  for (const nodeId of nodeIds) {
    const enc =
      nodeId === "W7.4" && !CoreEngine.NODE_MAP?.["W7.4"]
        ? makeW74Fixture(2, 5)
        : CoreEngine.generateEncounter(nodeId, { rng });
    const [slot] = world.populateEncounters([enc]);
    assert.ok(slot, `Failed to build shrine slot for ${nodeId}`);
    assert.ok(slot.contentGroup.children.length > 0, `Empty shrine content for ${nodeId}`);
    assert.equal(slot.caliperMesh.visible, false);
  }

  // 1. Unclamped sub-zero cauldron (-500..+500) + W1.3 double-negative vacuum lift + W1.4 180° polarity flip
  assert.ok(elixirLevelToY(-500) < elixirLevelToY(-200));
  assert.ok(elixirLevelToY(-200) < elixirLevelToY(-100));
  assert.ok(elixirLevelToY(-100) < elixirLevelToY(0));
  assert.ok(elixirLevelToY(0) < elixirLevelToY(200));

  const encW13 = CoreEngine.generateEncounter("W1.3", { rng: makeSeededRng(13) });
  const [slotW13] = world.populateEncounters([encW13]);
  world.activeGateSlot = slotW13;
  const yBeforeScoop = slotW13.cauldronState.elixirColumn.position.y;
  world.refreshActiveEncounterVisual({ ...encW13, stepsUsed: 1 });
  const yAfterScoop = slotW13.cauldronState.elixirColumn.position.y;
  assert.ok(yAfterScoop > yBeforeScoop, "W1.3 vacuum-scooping -b Frost-Spores must raise elixir level");

  const encW14 = CoreEngine.generateEncounter("W1.4", { rng: makeSeededRng(14) });
  const [slotW14] = world.populateEncounters([encW14]);
  world.activeGateSlot = slotW14;
  world.refreshActiveEncounterVisual({ ...encW14, stepsUsed: 1 });
  assert.ok(Math.abs(slotW14.cauldronState.polarityMirror.rotation.z - Math.PI) < 1e-4);

  // 2. W3.1 Balance Bridge pre-commit torque lock + Magnetic Like-Term Repulsion
  const encW31 = CoreEngine.generateEncounter("W3.1", { rng: makeSeededRng(31) });
  const [slotW31] = world.populateEncounters([encW31]);
  world.activeGateSlot = slotW31;
  world.updateDialPreview(encW31.answer);
  assert.equal(slotW31.balanceState.beamPivot.rotation.z, 0, "Pre-commit dial must not unlock torque");

  world.playTwinBeamVisual(true);
  assert.equal(slotW31.balanceState.repelAnim?.active, true);
  assert.equal(slotW31.balanceState.repelSparkRing.visible, true);
  stepFrames(world, 12, 1 / 60);
  assert.notEqual(slotW31.balanceState.repelConstantCluster.position.x, 0);

  world.playCommitVisual({ outcome: "nudge", delta: 3 }, encW31);
  assert.notEqual(slotW31.balanceState.beamPivot.rotation.z, 0);
  assert.equal(slotW31.caliperMesh.visible, true);

  world.playCommitVisual({ outcome: "clear", delta: 0 }, encW31);
  assert.equal(slotW31.balanceState.beamPivot.rotation.z, 0);
  assert.equal(slotW31.balanceState.bridgePlanks.visible, true);

  // 3. W2.1 Pattern Conservatory (both legacy & M1 frames + negative base) & W2.2 Crystal Loom & W3.4 k^2 Canopy
  const [slotSeq] = world.populateEncounters([
    {
      nodeId: "W2.1",
      kind: "seq_linear",
      answer: 27,
      patternMeta: { baseCount: -2, stepGrowth: 3, targetStep: 10 },
    },
  ]);
  assert.equal(slotSeq.loomState.framePedestals.length, 3);
  assert.equal(slotSeq.loomState.framePedestals[0].baseStoneGroup.children.length, 2);
  assert.equal(slotSeq.loomState.framePedestals[1].baseStoneGroup.children.length, 2);
  assert.equal(slotSeq.loomState.framePedestals[0].growthRowGroups.length, 1);
  assert.equal(slotSeq.loomState.framePedestals[1].growthRowGroups.length, 2);
  assert.equal(slotSeq.loomState.framePedestals[2].growthRowGroups.length, 3);

  const encW22 = CoreEngine.generateEncounter("W2.2", { rng: makeSeededRng(22) });
  const [slotW22] = world.populateEncounters([encW22]);
  world.activeGateSlot = slotW22;
  const spreadBefore =
    slotW22.loomState.loomOrbGroup.position.x - slotW22.loomState.loomPodGroup.position.x;
  world.refreshActiveEncounterVisual({ ...encW22, stepsUsed: 1 });
  const spreadAfter =
    slotW22.loomState.loomOrbGroup.position.x - slotW22.loomState.loomPodGroup.position.x;
  assert.ok(spreadAfter > spreadBefore + 1.5, "W2.2 unpack_array must slide Rune-Pods apart from Orb array");

  const encW34 = CoreEngine.generateEncounter("W3.4", { rng: makeSeededRng(34) });
  const [slotW34] = world.populateEncounters([encW34]);
  assert.ok(slotW34.loomState.canopyInstancedMesh.isInstancedMesh);
  assert.equal(
    slotW34.loomState.canopyInstancedMesh.count,
    slotW34.loomState.meta.k * slotW34.loomState.meta.k
  );

  // 4. W4.4 Crossed Spore-Streams preserves both slopes after zap_var mutation
  const encW44 = CoreEngine.generateEncounter("W4.4", { rng: makeSeededRng(44) });
  const [slotW44] = world.populateEncounters([encW44]);
  world.activeGateSlot = slotW44;
  const origM2 = slotW44.vineState.meta.m2;
  assert.ok(slotW44.vineState.megaSeedPod !== null);
  world.refreshActiveEncounterVisual({
    ...encW44,
    left: { a: (encW44.left?.a || 3) - (encW44.right?.a || 1), b: encW44.left?.b || 2 },
    right: { a: 0, b: encW44.right?.b || 8 },
    stepsUsed: 1,
  });
  assert.equal(slotW44.vineState.meta.m2, origM2, "W4.4 must preserve Stream 2 slope via initialSystemMeta");

  // 5. W5.2 Moonwell Starlight Ring ("the moon is in the middle")
  const mysteries = [];
  const worldM5 = new OddrootWorld3D({
    canvas: createMockCanvas(),
    onMysteryFound: (id) => mysteries.push(id),
  });
  const encW52 = CoreEngine.generateEncounter("W5.2", { rng: makeSeededRng(52) });
  const [slotW52] = worldM5.populateEncounters([encW52]);
  worldM5.activeGateSlot = slotW52;
  assert.equal(slotW52.moonwellState.moonLantern.position.x, 0);
  assert.equal(slotW52.moonwellState.moonLantern.position.z, 0);
  assert.ok(slotW52.moonwellState.diameterChord !== null);
  assert.ok(slotW52.moonwellState.rimSunMirror !== null);
  assert.ok(slotW52.moonwellState.rightAngleMarker !== null);
  worldM5.playCommitVisual({ outcome: "clear" }, encW52);
  assert.ok(mysteries.includes("astrolabe_lock"));

  // 6. W6.3 3D Mosaic Slab Forge (x^2 slab + two (b/2)x wings + (b/2)^2 corner socket)
  const encW63 = CoreEngine.generateEncounter("W6.3", { rng: makeSeededRng(63) });
  const [slotW63] = world.populateEncounters([encW63]);
  world.activeGateSlot = slotW63;
  assert.equal(slotW63.archetype, "mosaic_or_arch");
  assert.equal(slotW63.mosaicState.mode, "mosaic_forge");
  assert.ok(slotW63.mosaicState.xSquaredSlab);
  assert.ok(slotW63.mosaicState.wingEast);
  assert.ok(slotW63.mosaicState.wingNorth);
  assert.ok(slotW63.mosaicState.cornerSocket);
  assert.equal(slotW63.mosaicState.cornerCrystal.visible, false);
  world.playCommitVisual({ outcome: "clear" }, encW63);
  assert.equal(slotW63.mosaicState.cornerCrystal.visible, true);
  assert.equal(world.rigState.mosaicForged, true);

  // 7. W7.4 Emerald 90° Quarter-Turn i-Portals (both live engine generator & explicit 2-turn i^2 = -1)
  if (CoreEngine.NODE_MAP?.["W7.4"]) {
    const encLiveW74 = CoreEngine.generateEncounter("W7.4", { rng: makeSeededRng(74) });
    const [slotLiveW74] = world.populateEncounters([encLiveW74]);
    assert.equal(slotLiveW74.w7State.mode, "i_portal");
    assert.equal(slotLiveW74.w7State.portalRings.length, encLiveW74.portalMeta.quarterTurns);
  }
  const encW74 = makeW74Fixture(2, 4);
  const [slotW74] = world.populateEncounters([encW74]);
  world.activeGateSlot = slotW74;
  assert.equal(slotW74.w7State.mode, "i_portal");
  assert.equal(slotW74.w7State.portalRings.length, 2);
  assert.equal(slotW74.w7State.meta.endReal, -4);
  assert.equal(slotW74.w7State.fullBeamGroup.visible, false);
  world.playCommitVisual({ outcome: "clear" }, encW74);
  assert.equal(slotW74.w7State.fullBeamGroup.visible, true);
});

test("Suite 9: Strict <= 15% Anti-Scrub Protocol, post-nudge re-dial reset & deterministic Δy caliper", () => {
  assert.ok(SHRINE_STUB_SPAN_Z / SHRINE_CHASM_SPAN_Z <= 0.15);

  const mysteries = [];
  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    onMysteryFound: (m) => mysteries.push(m),
  });
  const rng = makeSeededRng(99);
  const curveNodes = ["W0.6", "W4.1", "W4.2", "W4.3", "W4.4", "W6.1", "W6.2", "W7.3"];

  for (const nodeId of curveNodes) {
    const enc = CoreEngine.generateEncounter(nodeId, { rng });
    const [slot] = world.populateEncounters([enc]);
    world.activeGateSlot = slot;

    assert.ok(slot.originStub !== null);
    assert.equal(slot.originStub.visible, true);
    assert.ok(slot.stubSpanRatio <= 0.15);
    assert.ok(slot.extrudedVine !== null);
    assert.equal(slot.extrudedBridge, slot.extrudedVine);
    assert.equal(slot.extrudedVine.visible, false);

    // Sweep dial across wide values + NaN before commit -> extrudedVine MUST stay invisible!
    for (const v of [-200, -8, -2, 0, 3, 9, 200, Number.NaN]) {
      world.updateDialPreview(v);
      assert.equal(
        slot.extrudedVine.visible,
        false,
        `Anti-Scrub violation on ${nodeId} for dial=${v}`
      );
    }

    if (nodeId === "W4.3") {
      world.updateDialPreview(1);
      const y1 = slot.originStub.position.y;
      world.updateDialPreview(7);
      const y7 = slot.originStub.position.y;
      assert.ok(y7 > y1, "W4.3 updateDialPreview must lift originStub vertically along b");
    }

    // 1st-miss nudge shows splatter + Δy caliper
    world.playCommitVisual({ outcome: "nudge", delta: 3 }, enc);
    assert.equal(slot.caliperMesh.visible, true);
    assert.equal(slot.splatterMesh.visible, true);

    // Re-dialing after a 1st-miss nudge MUST immediately hide extrudedVine again!
    world.updateDialPreview(enc.answer);
    assert.equal(
      slot.extrudedVine.visible,
      false,
      `Post-nudge re-dial must reset extrudedVine.visible=false on ${nodeId}`
    );

    // Clear extrudes full curve and rides explorer across
    world.playCommitVisual({ outcome: "clear", delta: 0 }, enc);
    assert.equal(slot.extrudedVine.visible, true);
    assert.equal(slot.caliperMesh.visible, false);
    assert.equal(world.rigAnim?.kind, "grind_vine");
    stepFrames(world, 30, 0.05);
  }

  assert.ok(mysteries.includes("rainbow_surfer"));
});

test("Suite 10: Upside-down Zero-G Astro-Toad (rotation.z === Math.PI) + Sky-Chest bonk & Sanctuary Journal", () => {
  const hatched = [];
  const mysteries = [];
  const activities = [];
  const oppEvents = [];

  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    onCreatureHatched: (c) => hatched.push(c),
    onMysteryFound: (m) => mysteries.push(m),
    onWorldActivity: (amt, flux, key) => activities.push({ amt, flux, key }),
    onOppositionEvent: (e) => oppEvents.push(e),
  });

  const subZeroEnc = {
    uid: "W1.2-subzero-test",
    nodeId: "W1.2",
    worldId: "W1",
    kind: "eq_subzero_extreme",
    encounterType: "cryo_gate",
    equationText: "n + 100 = 100 - 200",
    answer: -200,
    startDial: 0,
    left: { a: 1, b: 100 },
    right: { a: 0, b: -100 },
    detents: [-200, -100, 0, 100],
  };

  const [slot] = world.populateEncounters([subZeroEnc]);
  world.activeGateSlot = slot;
  world.playCommitVisual({ outcome: "clear", overdrive: true, shardsEarned: 21 }, subZeroEnc);

  const toad = world.menagerie.getCreature("zero_g_toad");
  assert.ok(hatched.some((c) => c.id === "zero_g_toad"));
  assert.ok(mysteries.includes("subzero_abyss"));
  assert.equal(toad.mesh.rotation.z, Math.PI, "Zero-G Astro-Toad must flip upside-down (Math.PI)");
  assert.ok(toad.vy > 0, "Zero-G Astro-Toad must float upward (vy > 0)");

  const initialY = toad.y;
  stepFrames(world, 5, 0.05);
  assert.ok(toad.y > initialY, "Zero-G Astro-Toad y coordinate must rise upward");

  stepFrames(world, 40, 0.05);
  const totalBonks = world.menagerie.skyChests.reduce((acc, c) => acc + c.bonkCount, 0);
  assert.ok(totalBonks >= 1, "Zero-G Astro-Toad must bonk a suspended Sky-Chest");
  assert.equal(toad.mesh.rotation.z, Math.PI);
  assert.ok(activities.some((a) => a.key === "skyChestBonk" && a.flux > 0));
  assert.ok(oppEvents.some((e) => e.kind === "sky_chest_bonk"));

  // Morphogenesis stages 1 -> 2 -> 3 & pure Sanctuary Evolution Journal
  const jSprout = getSanctuaryJournalEntries({ totalSolved: 1 });
  assert.equal(jSprout.length, 5);
  assert.equal(jSprout.find((e) => e.id === "luminous_oddling").stageLabel, "Sprout");

  const jLum = getSanctuaryJournalEntries({
    totalSolved: 8,
    unlockedWorlds: ["W0", "W1", "W2"],
    records: { deepestSubZero: 50 },
  });
  assert.equal(jLum.find((e) => e.id === "zero_g_toad").stageLabel, "Luminous");

  const jAstral = getSanctuaryJournalEntries({
    totalSolved: 20,
    unlockedWorlds: ["W0", "W1", "W2", "W3", "W4"],
    discoveredMysteries: ["subzero_abyss", "astrolabe_lock", "aurora_whale"],
    games: { oddroot: { mosaicForged: true } },
  });
  for (const entry of jAstral) {
    assert.equal(entry.stage, 3);
    assert.equal(entry.stageLabel, "Astral");
    assert.equal("accuracy" in entry, false);
    assert.equal("misses" in entry, false);
    assert.equal("avgTime" in entry, false);
  }
});

test("Suite 11: Moonwell (0,0) mystery, Workshop pad hysteresis, Self-Ghost PB & OddrootAudio mute/headless safety", () => {
  const mysteries = [];
  let workshopEnters = 0;
  const oppEvents = [];

  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    onMysteryFound: (m) => mysteries.push(m),
    onGaragePadEntered: () => {
      workshopEnters += 1;
    },
    onOppositionEvent: (e) => oppEvents.push(e),
  });

  // 1. Resting at (0,0) Moonwell > 1.4s fires moon_center once (no spam)
  world.rigState.x = 0;
  world.rigState.z = 0;
  world.rigState.speed = 0;
  stepFrames(world, 45, 0.05);
  assert.deepEqual(
    mysteries.filter((m) => m === "moon_center"),
    ["moon_center"]
  );

  // 2. Workshop pad (-7.5, 23.5) hysteresis (<3.4m enter, >5.2m re-arm)
  world.rigState.x = -7.5;
  world.rigState.z = 23.5;
  stepFrames(world, 10, 0.05);
  assert.equal(workshopEnters, 1);

  world.rigState.x = -7.5 + 4.0; // 4.0m (< 5.2m) -> still armed/latched
  stepFrames(world, 5, 0.05);
  world.rigState.x = -7.5;
  stepFrames(world, 5, 0.05);
  assert.equal(workshopEnters, 1);

  world.rigState.x = 0; // > 5.2m away -> re-arms!
  stepFrames(world, 5, 0.05);
  world.rigState.x = -7.5;
  stepFrames(world, 5, 0.05);
  assert.equal(workshopEnters, 2);

  // 3. Overdrive Sky-Whale & Self-Ghost promotion-only PB
  world.triggerOverdriveStreakWonder();
  assert.equal(world.skyWhale.visible, true);
  assert.ok(mysteries.includes("aurora_whale"));

  const enc = CoreEngine.generateEncounter("W0.1", { rng: makeSeededRng(11) });
  world.populateEncounters([enc]);
  stepFrames(world, 30, 0.1); // 3.0s slower first run
  world.playCommitVisual({ outcome: "clear" }, enc);
  const pbCountAfterFirst = oppEvents.filter((e) => e.kind === "personal_record").length;
  assert.equal(pbCountAfterFirst, 1);

  // Slower second run (5.0s > 3.0s) -> ZERO negative delta or record spam!
  world.populateEncounters([enc]);
  stepFrames(world, 100, 0.05);
  world.playCommitVisual({ outcome: "clear" }, enc);
  assert.equal(oppEvents.filter((e) => e.kind === "personal_record").length, 1);

  // Faster third run (1.0s < 3.0s) -> celebrates NEW PERSONAL RECORD!
  world.populateEncounters([enc]);
  stepFrames(world, 20, 0.05);
  world.playCommitVisual({ outcome: "clear" }, enc);
  assert.equal(oppEvents.filter((e) => e.kind === "personal_record").length, 2);

  // 4. OddrootAudio headless + mock AudioContext mute safety
  const headlessAudio = new OddrootAudio();
  const allAudioMethods = [
    () => headlessAudio.unlock(),
    () => headlessAudio.updateMovementHum(0.8, "bramble_boar"),
    () => headlessAudio.updateMovementHum(0.6, "starlight_glider"),
    () => headlessAudio.playDetentClick(15),
    () => headlessAudio.playSiphonPop(1.1),
    () => headlessAudio.playZeroPairPoof(),
    () => headlessAudio.playTwinBeam(),
    () => headlessAudio.playMagneticRepel(),
    () => headlessAudio.playCaliperNudge(),
    () => headlessAudio.playAstrolabeLock(),
    () => headlessAudio.playClear(true),
    () => headlessAudio.playFoxReveal(),
    () => headlessAudio.playCreatureHatch(2),
    () => headlessAudio.playWhaleSong(),
    () => headlessAudio.playElixirWave(),
    () => headlessAudio.playBrambleSmash(),
    () => headlessAudio.playUpdraftLift(),
    () => headlessAudio.playWorkshopChime(),
    () => headlessAudio.playGuardianAwakening(),
    () => headlessAudio.playCoopFlare(),
    () => headlessAudio.playCoinGrab(),
    () => headlessAudio.playCoopGateBurst(true),
    () => headlessAudio.setMuted(true),
    () => headlessAudio.playClear(false),
    () => headlessAudio.stopHum(),
  ];
  for (const fn of allAudioMethods) {
    assert.doesNotThrow(fn);
  }

  let lastGainTarget = null;
  const prevAC = globalThis.AudioContext;
  globalThis.AudioContext = class MockAudioContext {
    constructor() {
      this.currentTime = 1.0;
      this.sampleRate = 44100;
      this.state = "running";
      this.destination = {};
    }
    createOscillator() {
      return {
        type: "sine",
        frequency: {
          value: 200,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          setTargetAtTime() {},
        },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createBiquadFilter() {
      return {
        type: "lowpass",
        frequency: { value: 500, setTargetAtTime() {} },
        Q: { value: 1 },
        connect() {},
      };
    }
    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
          setTargetAtTime(v) {
            lastGainTarget = v;
          },
        },
        connect() {},
      };
    }
    createBuffer(_ch, len) {
      return { getChannelData: () => new Float32Array(len) };
    }
    createBufferSource() {
      return { buffer: null, loop: false, connect() {}, start() {}, stop() {} };
    }
  };
  try {
    const mockAudio = new OddrootAudio();
    mockAudio.unlock();
    mockAudio.updateMovementHum(0.9, "starlight_glider");
    assert.ok(lastGainTarget > 0);
    mockAudio.setMuted(true);
    assert.equal(lastGainTarget, 0);
  } finally {
    if (prevAC === undefined) {
      delete globalThis.AudioContext;
    } else {
      globalThis.AudioContext = prevAC;
    }
  }
});

test("Suite 12: Exhaustive static & runtime safety — zero school words, zero shame words, zero CDN & <=6-word callouts", () => {
  const bannedCurriculumWords = [
    "pre-algebra",
    "pre-alg",
    "algebra",
    "algebraic",
    "geometry",
    "geometric",
    "trigonometry",
    "trigonometric",
    "trig",
    "curriculum",
    "grade",
    "worksheet",
    "standardized",
  ];
  const bannedShameWords = [
    ...(CoreEngine.BANNED_CHILD_WORDS || []),
    "game over",
    "you lost",
    "countdown",
  ];

  const filesToScan = [
    ...fs
      .readdirSync(ODDROOT_DIR)
      .filter((f) => f.endsWith(".js"))
      .map((f) => path.join(ODDROOT_DIR, f)),
    path.join(BLOOM_N_DIR, "styles-oddroot.css"),
  ];

  const extractStringLiteralsAndComments = (src) => {
    const matches = [];
    const rx =
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g;
    let m;
    while ((m = rx.exec(src)) !== null) {
      matches.push(m[0]);
    }
    return matches.join("\n");
  };

  for (const filePath of filesToScan) {
    const raw = fs.readFileSync(filePath, "utf8");
    const lowerRaw = raw.toLowerCase();
    const base = path.basename(filePath);

    assert.equal(lowerRaw.includes("#ff0000"), false, `Forbidden #ff0000 in ${base}`);
    assert.equal(lowerRaw.includes("0xff0000"), false, `Forbidden 0xff0000 in ${base}`);
    assert.equal(/https?:\/\//i.test(raw), false, `Forbidden external URL in ${base}`);

    const textToInspect = filePath.endsWith(".css")
      ? lowerRaw
      : extractStringLiteralsAndComments(raw).toLowerCase();

    for (const w of bannedCurriculumWords) {
      const wordRx = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      assert.equal(wordRx.test(textToInspect), false, `Forbidden school label "${w}" in ${base}`);
    }
    for (const w of bannedShameWords) {
      const wordRx = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      assert.equal(wordRx.test(textToInspect), false, `Forbidden shame word "${w}" in ${base}`);
    }
    assert.equal(/"nan"|'nan'|`nan`/i.test(textToInspect), false, `Forbidden "NaN" cue in ${base}`);
  }

  // Runtime strings & <= 6-word opposition event check
  const runtimeBlob = JSON.stringify({
    journal: getSanctuaryJournalEntries({ totalSolved: 10 }),
    mounts: ODDROOT_MOUNT_SPECS,
    islands: SANCTUARY_ISLANDS,
  }).toLowerCase();

  for (const w of [...bannedCurriculumWords, ...bannedShameWords]) {
    assert.equal(runtimeBlob.includes(w), false, `Forbidden word "${w}" in runtime metadata`);
  }

  const emittedMessages = [];
  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    onOppositionEvent: (e) => emittedMessages.push(e.message),
  });
  world.applyLoadout({
    games: { oddroot: { sanctuaryUpgrades: ["or_tusk_plow", "or_wide_siphon", "or_glide_wings"] } },
  });
  world.blightSystem.evaluateBrambleContact(
    world.blightPatches[0].x,
    world.blightPatches[0].z,
    0,
    5,
    world.rigState.upgradesSet,
    { onOppositionEvent: (e) => emittedMessages.push(e.message) }
  );
  world.triggerRealmQuickAction();
  world.triggerGuardianAwakening("W1");
  const toad = world.menagerie.triggerSubZeroToadAscent(-120);
  toad.y = 8.0;
  world.step(0.05);

  assert.ok(emittedMessages.length >= 3);
  for (const msg of emittedMessages) {
    const words = msg.trim().split(/\s+/);
    assert.ok(words.length <= 6, `Opposition message "${msg}" exceeds 6 words (${words.length})`);
  }
});

test("Suite 13: F21 Live 2-Player 3D Co-Op — partner 60fps lerp, status auras, non-stealable gate_burst, flares & Shared Star-Coins", () => {
  assert.deepEqual(SHARED_COIN_IDS, ["coin_0", "coin_1", "coin_2", "coin_3"]);

  const grabbedCoins = [];
  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    onSharedCoinGrabbed: (coinId) => grabbedCoins.push(coinId),
  });

  // 1. Local multiplayer pose
  world.applyLoadout({ games: { oddroot: { equippedMount: "bramble_boar" } } });
  const pose = world.getLocalMultiplayerPose();
  assert.equal(pose.chassisOrMount, "bramble_boar");
  assert.equal(typeof pose.x, "number");
  assert.equal(typeof pose.heading, "number");

  // 2. Remote partner spawn, Sprite badge, 60fps lerp & graphical status auras
  world.syncRemotePartners([
    {
      userId: "sarah",
      displayName: "Sarah",
      avatar: "🦋",
      x: -10,
      y: 0.6,
      z: 5,
      heading: 1.2,
      speed: 8,
      chassisOrMount: "starlight_glider",
      upgrades: ["or_glide_wings"],
      status: "thinking",
    },
  ]);

  const partner = world.coop.partners.get("sarah");
  assert.ok(partner, "Remote partner entry must be created");
  assert.equal(partner.badgeSprite.isSprite, true);
  assert.equal(partner.thinkingHaloGroup.visible, true, "Thinking status must show Cyan Holo-Ring");
  assert.equal(partner.surgeAuraGroup.visible, false);

  // Move partner target -> verify smooth 60fps lerp (partial after 1 frame, converged after 30 frames)
  world.syncRemotePartners([
    {
      userId: "sarah",
      displayName: "Sarah",
      avatar: "🦋",
      x: 2,
      y: 0.6,
      z: -5,
      heading: 2.0,
      speed: 12,
      chassisOrMount: "starlight_glider",
      upgrades: ["or_glide_wings"],
      status: "surge",
    },
  ]);

  assert.equal(partner.thinkingHaloGroup.visible, false);
  assert.equal(partner.surgeAuraGroup.visible, true, "Surge status must show Golden Comet Aura");

  world.step(1 / 60);
  assert.ok(
    partner.rootGroup.position.x > -10 && partner.rootGroup.position.x < 2,
    "Partner position must smoothly lerp at 60fps rather than teleporting"
  );
  stepFrames(world, 35, 1 / 60);
  assert.ok(Math.abs(partner.rootGroup.position.x - 2) < 0.08);
  assert.ok(Math.abs(partner.rootGroup.position.z - -5) < 0.08);

  // Overdrive also lights Golden Comet Aura
  world.syncRemotePartners([
    { userId: "sarah", displayName: "Sarah", x: 2, z: -5, status: "overdrive" },
  ]);
  assert.equal(partner.surgeAuraGroup.visible, true);

  // 3. STRICT RESOURCE FAIRNESS: partner gate_burst launches 3D Aurora Sky-Beam & steals ZERO local shrines!
  const wave = [
    CoreEngine.generateEncounter("W0.1", { rng: makeSeededRng(101) }),
    CoreEngine.generateEncounter("W1.1", { rng: makeSeededRng(102) }),
    CoreEngine.generateEncounter("W2.1", { rng: makeSeededRng(103) }),
  ];
  world.populateEncounters(wave);
  assert.equal(world.gateSlots.length, 3);

  const beam = world.playPartnerCoopEvent({
    type: "gate_burst",
    overdrive: true,
    x: world.gateSlots[0].x,
    y: world.gateSlots[0].y,
    z: world.gateSlots[0].z,
  });
  assert.equal(beam.active, true);
  assert.equal(beam.group.visible, true);
  assert.equal(
    world.gateSlots.every((s) => s.cleared === false),
    true,
    "Partner gate_burst MUST NEVER steal or clear any local shrine!"
  );

  // 4. Partner friendly_flare, local playLocalFlare & remote coin_grab shower
  const remoteFlare = world.playPartnerCoopEvent({ type: "friendly_flare", x: 2, y: 0.6, z: -5 });
  assert.equal(remoteFlare.active, true);
  assert.equal(remoteFlare.group.visible, true);

  const localFlare = world.playLocalFlare();
  assert.equal(localFlare.active, true);
  assert.equal(localFlare.group.visible, true);

  const coinShower = world.playPartnerCoopEvent({ type: "coin_grab", coinId: "coin_2" });
  assert.equal(coinShower.active, true);
  assert.equal(world.coop.coins.get("coin_2").group.visible, false);

  // 5. Shared Star-Coins (coin_0..coin_3): <= 2.8m pickup latch + 6s cooldown hide + respawn pop-in
  world.syncSharedCoins({
    coin_0: { coinId: "coin_0", available: true },
    coin_1: { coinId: "coin_1", available: true },
    coin_2: { coinId: "coin_2", available: true },
    coin_3: { coinId: "coin_3", available: true },
  });
  for (const cid of SHARED_COIN_IDS) {
    assert.equal(world.coop.coins.get(cid).group.visible, true);
  }

  // Move local player within <= 2.8m of coin_0 -> fires onSharedCoinGrabbed("coin_0") ONCE (no per-frame spam)
  const c0Pos = SHARED_COIN_POSITIONS.coin_0;
  world.rigState.x = c0Pos.x + 1.5; // 1.5m <= 2.8m
  world.rigState.z = c0Pos.z;
  stepFrames(world, 10, 1 / 60);
  assert.deepEqual(grabbedCoins, ["coin_0"]);
  assert.equal(world.coop.coins.get("coin_0").group.visible, false);

  // Server/multiplayer confirms cooldown (available: false) -> stays hidden
  world.syncSharedCoins({ coin_0: { coinId: "coin_0", available: false } });
  assert.equal(world.coop.coins.get("coin_0").group.visible, false);

  // Move away, then coin_0 respawns after 6s (available: true) -> pops back in & can be grabbed again!
  world.rigState.x = 0;
  world.rigState.z = 22;
  world.syncSharedCoins({ coin_0: { coinId: "coin_0", available: true } });
  assert.equal(world.coop.coins.get("coin_0").group.visible, true);

  world.rigState.x = c0Pos.x;
  world.rigState.z = c0Pos.z;
  world.step(1 / 60);
  assert.deepEqual(grabbedCoins, ["coin_0", "coin_0"]);

  // Disconnect remote partner cleanly
  world.syncRemotePartners([]);
  assert.equal(world.coop.partners.size, 0);
});

test("Suite 14: Outer Archipelago Biomes & 3-Way Cross-Realm Clockwork Charm — grotto & skyroot walkability, autopilot routing, Soaring Updraft Wind Rings (Glider & Boar) & oddroot_clockwork_charm", () => {
  const events = [];
  const audio = new OddrootAudio();
  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    audio,
    onOppositionEvent: (e) => events.push(e),
  });

  // 1. Verify original 6 islands + grotto & skyroot + continuous bridge walkability
  assert.deepEqual(
    SANCTUARY_ISLANDS.map((i) => i.id),
    ["center", "south", "west", "east", "north", "obs", "grotto", "skyroot"]
  );
  const grottoIsl = SANCTUARY_ISLANDS.find((i) => i.id === "grotto");
  const skyrootIsl = SANCTUARY_ISLANDS.find((i) => i.id === "skyroot");
  assert.deepEqual(grottoIsl, {
    id: "grotto",
    name: "Sunken Starlight Grotto",
    x: -41,
    z: 10,
    radius: 11.5,
    topY: 0.8,
  });
  assert.deepEqual(skyrootIsl, {
    id: "skyroot",
    name: "Sky-Root Windward Spire",
    x: 41,
    z: 10,
    radius: 11.5,
    topY: 1.8,
  });

  // Sample 20 points along both new outer bridges -> 100% solid ground, zero chasm gaps
  for (const brIdx of [7, 8]) {
    const br = SANCTUARY_BRIDGES[brIdx];
    for (let k = 0; k <= 20; k++) {
      const u = k / 20;
      const sx = br.ax + (br.bx - br.ax) * u;
      const sz = br.az + (br.bz - br.az) * u;
      assert.equal(
        world._sampleArchipelago(sx, sz).onGround,
        true,
        `Bridge ${brIdx} sample u=${u} at (${sx.toFixed(1)}, ${sz.toFixed(1)}) must be solid ground`
      );
    }
  }

  // Autopilot routing across grotto <-> west <-> center and skyroot <-> east <-> north <-> obs
  assert.deepEqual(world._findIslandRoute("grotto", "center"), ["grotto", "west", "center"]);
  assert.deepEqual(world._findIslandRoute("skyroot", "obs"), ["skyroot", "east", "north", "obs"]);
  const wpsFromGrotto = world._buildAutopilotWaypoints(-41, 10, 0, 0);
  assert.ok(wpsFromGrotto.length >= 5);

  // 2. Verify OddrootOuterBiomes landmarks & getActiveBiome()
  assert.ok(world.scene.getObjectByName("OddrootOuterBiomes"));
  assert.ok(world.grottoLagoonPools.length >= 2);
  assert.ok(world.grottoSporeCaps.length >= 4);
  assert.ok(world.skyrootWindRings.length >= 3);

  world.rigState.x = 0;
  world.rigState.z = 0;
  assert.equal(world.getActiveBiome().id, "world_tree_heart");

  world.rigState.x = -41;
  world.rigState.z = 10;
  assert.equal(world.getActiveBiome().id, "starlight_grotto");

  world.rigState.x = 41;
  world.rigState.z = 10;
  assert.equal(world.getActiveBiome().id, "skyroot_canopy");

  // 3. Golden Soaring Updraft Wind Rings give exhilarating upward lift & speed shimmer to BOTH Glider & Boar!
  world.applyLoadout({ games: { oddroot: { equippedMount: "starlight_glider" } } });
  const ring0 = world.skyrootWindRings[0];
  world.rigState.x = ring0.x;
  world.rigState.z = ring0.z;
  world.rigState.y = 1.8 + 0.55;
  world.rigState.speed = 2.0;
  world.step(1 / 60);

  const windEvts = events.filter((e) => e.type === "skyroot_wind_ring");
  assert.equal(windEvts.length, 1);
  assert.equal(windEvts[0].shardsEarned, 3);
  assert.equal(world.rigState.glidingAirborne, true);
  assert.ok(world.rigState.speed >= 15.2);
  assert.ok(world.rigState.y > 1.8 + 0.9, "Wind ring must lift Starlight Glider upward");
  assert.equal(world.getSlipstreamBoostState().active, true);

  // Cooldown guard prevents duplicate +3💎 at same ring
  world.rigState.x = ring0.x;
  world.rigState.z = ring0.z;
  world.step(0.05);
  assert.equal(events.filter((e) => e.type === "skyroot_wind_ring").length, 1);

  // Switch to Bramble-Boar and ride through Ring 1 -> also receives upward lift & speed boost!
  world.setMountMode("bramble_boar");
  world._skyrootLiftTimer = 0;
  const ring1 = world.skyrootWindRings[1];
  world.rigState.x = ring1.x;
  world.rigState.z = ring1.z;
  world.rigState.y = 1.8 + 0.55;
  world.rigState.speed = 1.0;
  world.step(1 / 60);
  assert.equal(events.filter((e) => e.type === "skyroot_wind_ring").length, 2);
  assert.ok(world.rigState.speed >= 15.2);
  assert.ok(world.rigState.y > 1.8 + 0.9, "Wind ring must also lift Bramble-Boar upward");

  // 4. 3-Way Cross-Realm Ornament: spinning golden Clockwork Gear-Charm (oddroot_clockwork_charm)
  assert.equal(world.avatarGroup.getObjectByName("oddroot_clockwork_charm") || null, null);
  world.applyLoadout(
    { games: { oddroot: { equippedMount: "starlight_glider" } } },
    { clockworkCrestUnlocked: true }
  );
  const gliderCharm = world.avatarGroup.getObjectByName("oddroot_clockwork_charm");
  assert.ok(gliderCharm, "oddroot_clockwork_charm must mount on Starlight Glider staff");
  const outerBefore = world.clockworkCharmOuter.rotation.z;
  const innerBefore = world.clockworkCharmInner.rotation.z;
  world.step(0.05);
  assert.notEqual(world.clockworkCharmOuter.rotation.z, outerBefore);
  assert.notEqual(world.clockworkCharmInner.rotation.z, innerBefore);

  world.setMountMode("bramble_boar");
  assert.ok(
    world.avatarGroup.getObjectByName("oddroot_clockwork_charm"),
    "oddroot_clockwork_charm must remain mounted when switching to Bramble-Boar"
  );

  world.applyLoadout(
    { games: { oddroot: { equippedMount: "bramble_boar" } } },
    { clockworkCrestUnlocked: false }
  );
  assert.equal(world.avatarGroup.getObjectByName("oddroot_clockwork_charm") || null, null);
});

test("Suite 15: 3D Field Expeditions & Roblox Simulation Snapshot Parity — OddrootExpeditionBeacons, shard-timing guardrails, single-counted completion & getRobloxSimSnapshot()", () => {
  const events = [];
  const activities = [];
  const world = new OddrootWorld3D({
    canvas: createMockCanvas(),
    audio: new OddrootAudio(),
    onWorldActivity: (amount, bonusFlux, metricKey) => {
      activities.push({ amount, bonusFlux, metricKey });
    },
    onOppositionEvent: (e) => events.push(e),
  });

  const prog = { games: { oddroot: { expeditionsCompleted: 0 } } };
  world.applyLoadout(prog);

  assert.ok(world.scene.getObjectByName("OddrootExpeditionBeacons"));
  assert.equal(world.expeditionBeacons.length, 3);
  assert.equal(world.expeditionBeacons.every((b) => b.group.visible), true);

  const exp0 = world.getFieldExpeditionState();
  assert.equal(exp0.expeditionId, "or_grotto_pearls");
  const [wp0, wp1, wp2] = exp0.waypoints;

  // CRITICAL SHARD TIMING GUARDRAILS: zero waypoint collection while dock open, shrine active, rigAnim active, or autopilot active
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.rigState.speed = 0;

  world.setEncounterDockOpen(true);
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0);
  world.setEncounterDockOpen(false);

  world.autopilotTarget = { x: 0, z: 0, waypoints: [{ x: 0, z: 0 }], wpIndex: 0 };
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0);
  world.autopilotTarget = null;

  world.rigAnim = {
    kind: "updraft_lift",
    t: 0,
    dur: 0.55,
    startX: wp0.x,
    startY: 1.35,
    startZ: wp0.z,
    endX: wp0.x,
    endY: 1.35,
    endZ: wp0.z,
  };
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0);
  world.rigAnim = null;

  world.activeGateSlot = { x: wp0.x, z: wp0.z, rotY: 0, cleared: false };
  world._gateAutoPause = true;
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0);
  world.activeGateSlot = null;
  world._gateAutoPause = false;

  assert.equal(events.filter((e) => e.type?.startsWith("expedition_")).length, 0);
  assert.equal(activities.filter((a) => a.metricKey === "expeditionsCompleted").length, 0);

  // Free-roam collection of Waypoint 1 & Waypoint 2 (+2💎 each via onOppositionEvent)
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 1);
  assert.equal(world.expeditionBeacons[0].group.visible, false);

  world.rigState.x = wp1.x;
  world.rigState.z = wp1.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 2);
  assert.equal(world.expeditionBeacons[1].group.visible, false);

  const wpEvts = events.filter((e) => e.type === "expedition_waypoint");
  assert.equal(wpEvts.length, 2);
  assert.equal(wpEvts[0].shardsEarned, 2);
  assert.equal(wpEvts[1].shardsEarned, 2);

  // Free-roam collection of Waypoint 3 -> completes expedition, single-counts +14💎, rotates to Sky-Root Updrafts & respawns beacons
  world.rigState.x = wp2.x;
  world.rigState.z = wp2.z;
  world.step(1 / 60);

  const expAfter = world.getFieldExpeditionState();
  assert.equal(expAfter.completedTotal, 1);
  assert.equal(expAfter.expeditionId, "or_skyroot_updrafts");
  assert.equal(prog.games.oddroot.expeditionsCompleted, 1);
  assert.equal(world.expeditionBeacons.every((b) => b.group.visible), true);
  assert.equal(world.expeditionBeacons[0].group.position.x, expAfter.waypoints[0].x);

  const expActs = activities.filter((a) => a.metricKey === "expeditionsCompleted");
  const compEvts = events.filter((e) => e.type === "expedition_complete");
  assert.equal(expActs.length, 1);
  assert.equal(expActs[0].bonusFlux, 14);
  assert.equal(compEvts.length, 1);
  assert.equal(compEvts[0].shardsEarned, 0, "Completion shards must not be double-counted");

  // Roblox simulation snapshot parity (3.5 studs/m & mathPaused reflection)
  world.rigState.x = 40;
  world.rigState.z = 10;
  const snapLive = world.getRobloxSimSnapshot();
  assert.equal(snapLive.v, 1);
  assert.equal(snapLive.realmId, "oddroot");
  assert.equal(snapLive.pose.studsX, 140);
  assert.equal(snapLive.pose.studsZ, 35);
  assert.equal(snapLive.biomeId, "skyroot_canopy");
  assert.equal(snapLive.mathPaused, false);
  assert.equal(snapLive.expedition.id, "or_skyroot_updrafts");

  world.setEncounterDockOpen(true);
  const snapPaused = world.getRobloxSimSnapshot();
  assert.equal(snapPaused.mathPaused, true);
  assert.equal(Object.is(world.simTimeState.oppositionDt, 0.0), true);
});


