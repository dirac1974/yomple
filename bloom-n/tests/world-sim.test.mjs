import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORLD_SIM_VERSION,
  BULLET_TIME_SCALE,
  NORMAL_TIME_SCALE,
  NEAR_FIELD_STUB_MAX_RATIO,
  REALM_BIOME_ATLAS,
  EXPEDITION_CATALOG,
  computeSimulationTimeScale,
  stepVehicleKinematics,
  resolveActiveBiome,
  createFieldExpeditionState,
  stepFieldExpedition,
  sampleTrajectoryArc,
  computeCoordinateSplatter,
  exportRobloxSimSnapshot,
} from "../core/world-sim.js";

import {
  BANNED_CHILD_WORDS,
  BANNED_CHILD_CURRICULUM_WORDS,
  SUB_GAMES,
  BASTION_RIGS,
  BASTION_CHASSIS,
  BASTION_UPGRADES,
  createInitialProgress,
  createSessionState,
  getCrossRealmUnlocks,
  computeArchitectLevel,
  computeHeroTitle,
  computeNextWonderTeaser,
  mergeProgress,
} from "../core/engine.js";

import * as syncMod from "../core/sync.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOOM_N_DIR = path.resolve(__dirname, "..");
const WORLD_SIM_PATH = path.join(BLOOM_N_DIR, "core", "world-sim.js");
const SELF_TEST_PATH = fileURLToPath(import.meta.url);

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function countWords(str) {
  const s = String(str || "").trim();
  return s ? s.split(/\s+/).length : 0;
}

function findBannedWord(text, bannedList) {
  const lower = String(text ?? "").toLowerCase();
  for (const w of bannedList || []) {
    const needle = String(w).toLowerCase();
    if (!needle) continue;
    if (needle.includes(" ") || needle.includes("-")) {
      if (lower.includes(needle)) return w;
    } else {
      const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(lower)) return w;
    }
  }
  return null;
}

function assertCleanChildText(text, label) {
  const low = String(text || "").toLowerCase();
  assert.equal(/\bnan\b/i.test(low), false, `Literal NaN leaked in ${label}: "${text}"`);
  const shameHit = findBannedWord(text, BANNED_CHILD_WORDS);
  assert.equal(shameHit, null, `Banned shame word "${shameHit}" in ${label}: "${text}"`);
  const currHit = findBannedWord(text, BANNED_CHILD_CURRICULUM_WORDS);
  assert.equal(currHit, null, `Banned curriculum word "${currHit}" in ${label}: "${text}"`);
}

// ============================================================================
// 1. Static Purity & Safety Invariants on core/world-sim.js
// ============================================================================

test("WS-01: core/world-sim.js has zero DOM, window, document, localStorage, fetch, or Three.js references", () => {
  const raw = fs.readFileSync(WORLD_SIM_PATH, "utf8");
  const stripped = stripJsComments(raw);

  for (const forbidden of [
    /\bwindow\b/,
    /\bdocument\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bTHREE\b/,
    /\bWebGLRenderer\b/,
    /\brequestAnimationFrame\b/,
  ]) {
    assert.equal(
      forbidden.test(stripped),
      false,
      `Zero-DOM core/world-sim.js must not reference ${forbidden}`
    );
  }

  assert.equal(WORLD_SIM_VERSION, 1);
  assert.equal(BULLET_TIME_SCALE, 0.08);
  assert.equal(NORMAL_TIME_SCALE, 1.0);
  assert.equal(NEAR_FIELD_STUB_MAX_RATIO, 0.12);
  assert.ok(NEAR_FIELD_STUB_MAX_RATIO <= 0.15);
});

test("WS-02: core/world-sim.js and world-sim.test.mjs obey static anxiety-safety color and timer bans", () => {
  const harshHexPattern = new RegExp("#" + "ff" + "0000\\b", "i");
  const timerWordPattern = new RegExp("\\bcount" + "down\\b", "i");

  for (const filePath of [WORLD_SIM_PATH, SELF_TEST_PATH]) {
    const raw = fs.readFileSync(filePath, "utf8");
    const stripped = stripJsComments(raw);
    assert.equal(harshHexPattern.test(stripped), false, `Prohibited harsh red hex in ${filePath}`);
    assert.equal(timerWordPattern.test(stripped), false, `Prohibited timer term in ${filePath}`);
  }
});

// ============================================================================
// 2. REALM_BIOME_ATLAS & EXPEDITION_CATALOG Contracts
// ============================================================================

test("WS-03: REALM_BIOME_ATLAS defines inner and outer frontier biomes across frostwake, oddroot, and arc_bastion with pure child-safe copy", () => {
  assert.deepEqual(Object.keys(REALM_BIOME_ATLAS), ["frostwake", "oddroot", "arc_bastion"]);
  assert.equal(REALM_BIOME_ATLAS.frostwake.length, 6);
  assert.equal(REALM_BIOME_ATLAS.oddroot.length, 7);
  assert.equal(REALM_BIOME_ATLAS.arc_bastion.length, 6);

  for (const [realmId, biomes] of Object.entries(REALM_BIOME_ATLAS)) {
    const seenIds = new Set();
    let innerCount = 0;
    let outerCount = 0;

    for (const b of biomes) {
      assert.ok(b.id && !seenIds.has(b.id), `Duplicate or empty biome id in ${realmId}: ${b.id}`);
      seenIds.add(b.id);
      assert.ok(typeof b.name === "string" && b.name.length >= 4);
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.z) && Number.isFinite(b.elevationY));
      assert.ok(Number.isFinite(b.radius) && b.radius >= 10);
      assert.equal(typeof b.accentHex, "number");
      assert.equal(typeof b.isOuterFrontier, "boolean");
      if (b.isOuterFrontier) outerCount += 1;
      else innerCount += 1;

      assertCleanChildText(`${b.id} ${b.name} ${b.wonderCue}`, `REALM_BIOME_ATLAS.${realmId}.${b.id}`);
    }

    assert.ok(innerCount >= 2, `Expected >= 2 inner biomes in ${realmId}`);
    assert.ok(outerCount >= 2, `Expected >= 2 outer frontier biomes in ${realmId}`);
  }
});

test("WS-04: EXPEDITION_CATALOG enforces <= 6-word promptShort and zero banned/curriculum words across all 3 realms", () => {
  assert.deepEqual(Object.keys(EXPEDITION_CATALOG), ["frostwake", "oddroot", "arc_bastion"]);

  for (const realmId of ["frostwake", "oddroot", "arc_bastion"]) {
    const list = EXPEDITION_CATALOG[realmId];
    assert.equal(list.length, 3, `Expected 3 expeditions in ${realmId}`);
    const expIds = new Set();

    for (const exp of list) {
      assert.ok(exp.id && !expIds.has(exp.id));
      expIds.add(exp.id);
      assert.ok(countWords(exp.promptShort) > 0 && countWords(exp.promptShort) <= 6, `promptShort > 6 words on ${exp.id}: "${exp.promptShort}"`);
      assert.ok(exp.shardReward >= 14 && exp.shardReward <= 20);
      assert.equal(exp.waypoints.length, 3);
      assertCleanChildText(`${exp.title} ${exp.promptShort}`, `EXPEDITION_CATALOG.${realmId}.${exp.id}`);

      const wpIds = new Set();
      for (const wp of exp.waypoints) {
        assert.ok(wp.id && !wpIds.has(wp.id));
        wpIds.add(wp.id);
        assert.ok(Number.isFinite(wp.x) && Number.isFinite(wp.y) && Number.isFinite(wp.z));
        assertCleanChildText(wp.label, `Waypoint.${exp.id}.${wp.id}`);
      }
    }
  }
});

// ============================================================================
// 3. computeSimulationTimeScale — Mandatory Math-Pause & 0.08x Bullet-Time
// ============================================================================

test("WS-05: computeSimulationTimeScale guarantees bitwise 0.0 oppositionDt whenever encounterDockOpen or activeGateSlot is true across all 3 realms", () => {
  for (const realmId of ["frostwake", "oddroot", "arc_bastion"]) {
    for (const flags of [
      { encounterDockOpen: true, activeGateSlot: false, bulletTimeRequested: false },
      { encounterDockOpen: false, activeGateSlot: true, bulletTimeRequested: false },
      { encounterDockOpen: true, activeGateSlot: true, bulletTimeRequested: true },
    ]) {
      const res = computeSimulationTimeScale({ dt: 1 / 60, realmId, ...flags });
      assert.equal(res.mathPaused, true);
      assert.equal(Object.is(res.oppositionDt, 0), true, `Expected bitwise +0.0 oppositionDt in ${realmId}`);
      assert.ok(Math.abs(res.worldDt - 1 / 60) < 1e-9);
    }
  }

  // Frame-spike and invalid dt clamping
  const spiked = computeSimulationTimeScale({ dt: 2.5, realmId: "frostwake" });
  assert.equal(spiked.rawDt, 0.1);
  assert.equal(spiked.oppositionDt, 0.1);

  const negativeDt = computeSimulationTimeScale({ dt: -1, realmId: "oddroot" });
  assert.equal(negativeDt.rawDt, 0);
  assert.equal(Object.is(negativeDt.oppositionDt, 0), true);

  const nanDt = computeSimulationTimeScale({ dt: NaN, realmId: "frostwake" });
  assert.ok(Math.abs(nanDt.rawDt - 1 / 60) < 1e-9);
});

test("WS-06: computeSimulationTimeScale activates 0.08x Tactician Bullet-Time when requested or when arc_bastion dock is open", () => {
  const dt = 0.05;

  // Normal free-roam across realms -> 1.0x
  const normal = computeSimulationTimeScale({ dt, realmId: "arc_bastion", encounterDockOpen: false, bulletTimeRequested: false });
  assert.equal(normal.bulletTimeActive, false);
  assert.equal(normal.mathPaused, false);
  assert.equal(normal.timeScale, 1.0);
  assert.ok(Math.abs(normal.ambientDt - 0.05) < 1e-9);
  assert.ok(Math.abs(normal.oppositionDt - 0.05) < 1e-9);

  // Explicit bulletTimeRequested in free-roam -> 0.08x on both ambientDt and oppositionDt
  const freeRoamBullet = computeSimulationTimeScale({ dt, realmId: "arc_bastion", encounterDockOpen: false, bulletTimeRequested: true });
  assert.equal(freeRoamBullet.bulletTimeActive, true);
  assert.equal(freeRoamBullet.mathPaused, false);
  assert.equal(freeRoamBullet.timeScale, 0.08);
  assert.ok(Math.abs(freeRoamBullet.ambientDt - 0.004) < 1e-9);
  assert.ok(Math.abs(freeRoamBullet.oppositionDt - 0.004) < 1e-9);

  // Arc Bastion encounterDockOpen automatically engages 0.08x ambient aura while keeping oppositionDt === 0.0
  const bastionDock = computeSimulationTimeScale({ dt, realmId: "arc_bastion", encounterDockOpen: true, bulletTimeRequested: false });
  assert.equal(bastionDock.bulletTimeActive, true);
  assert.equal(bastionDock.mathPaused, true);
  assert.equal(bastionDock.timeScale, 0.08);
  assert.ok(Math.abs(bastionDock.ambientDt - 0.004) < 1e-9);
  assert.equal(Object.is(bastionDock.oppositionDt, 0), true);

  // Frostwake / Oddroot dock without bulletTimeRequested keeps ambient timeScale at 1.0 while oppositionDt === 0.0
  const frostwakeDock = computeSimulationTimeScale({ dt, realmId: "frostwake", encounterDockOpen: true, bulletTimeRequested: false });
  assert.equal(frostwakeDock.bulletTimeActive, false);
  assert.equal(frostwakeDock.timeScale, 1.0);
  assert.ok(Math.abs(frostwakeDock.ambientDt - 0.05) < 1e-9);
  assert.equal(Object.is(frostwakeDock.oppositionDt, 0), true);
});

// ============================================================================
// 4. stepVehicleKinematics — Acceleration, Reverse, Heading Wrap, Boost & Clamp
// ============================================================================

test("WS-07: stepVehicleKinematics handles forward acceleration, 0.58x reverse cap, and deadzone coasting stop", () => {
  const spec = { topSpeed: 20, accelRate: 10, decelRate: 8, turnRate: 2.6, maxRadius: 68 };
  let state = { x: 0, y: 0.5, z: 0, heading: 0, speed: 0, distTraveled: 0 };

  // Accelerate forward along -Z (heading = 0)
  for (let i = 0; i < 60; i++) {
    state = stepVehicleKinematics(state, { throttle: 1, steer: 0 }, spec, 1 / 30);
  }
  assert.ok(state.speed > 19.5 && state.speed <= 20.0);
  assert.ok(state.z < -25, `Expected forward travel along -Z, got z=${state.z}`);
  assert.ok(Math.abs(state.x) < 1e-6);
  assert.ok(state.distTraveled > 25);

  // Reverse throttle caps target speed at -0.58 * topSpeed (-11.6 m/s)
  let revState = { x: 0, y: 0, z: 0, heading: 0, speed: 0 };
  for (let i = 0; i < 80; i++) {
    revState = stepVehicleKinematics(revState, { throttle: -1, steer: 0 }, spec, 1 / 30);
  }
  assert.ok(revState.speed < -11.4 && revState.speed >= -11.601, `Unexpected reverse speed: ${revState.speed}`);
  assert.ok(revState.z > 15, `Expected reverse travel along +Z, got z=${revState.z}`);

  // Coasting deadzone snaps tiny residual speed to exact 0
  const stopped = stepVehicleKinematics({ x: 0, y: 0, z: 0, heading: 0, speed: 0.02 }, { throttle: 0, steer: 0 }, spec, 1 / 60);
  assert.equal(stopped.speed, 0);
});

test("WS-08: stepVehicleKinematics wraps heading cleanly across [-PI, PI], inverts reverse steering, and bounds tilt", () => {
  const spec = { topSpeed: 18, turnRate: 3.0, maxRadius: 80 };

  // Wrap across +PI / -PI boundary without discontinuity
  const nearPi = { x: 0, y: 0, z: 0, heading: Math.PI - 0.02, speed: 12 };
  const wrapped = stepVehicleKinematics(nearPi, { throttle: 1, steer: -1 }, spec, 0.05);
  assert.ok(wrapped.heading >= -Math.PI && wrapped.heading <= Math.PI);
  assert.ok(wrapped.heading < 0, `Expected wrap across +PI to negative angle, got ${wrapped.heading}`);

  // Reverse steering flips turn direction when speed < -0.25
  const fwdTurn = stepVehicleKinematics({ x: 0, y: 0, z: 0, heading: 0, speed: 8 }, { throttle: 1, steer: 1 }, spec, 0.05);
  const revTurn = stepVehicleKinematics({ x: 0, y: 0, z: 0, heading: 0, speed: -5 }, { throttle: -1, steer: 1 }, spec, 0.05);
  assert.ok(fwdTurn.heading < 0);
  assert.ok(revTurn.heading > 0);

  // Roll and pitch stay strictly within clinical comfort bounds
  assert.ok(Math.abs(fwdTurn.roll) <= 0.22);
  assert.ok(Math.abs(fwdTurn.pitch) <= 0.18);
});

test("WS-09: stepVehicleKinematics applies boost, slipstream, and surface multipliers and clamps to maxRadius", () => {
  const spec = { topSpeed: 18, boostMultiplier: 1.3, accelRate: 20, maxRadius: 50 };
  let boosted = { x: 0, y: 0, z: 0, heading: 0, speed: 18 };

  for (let i = 0; i < 40; i++) {
    boosted = stepVehicleKinematics(
      boosted,
      { throttle: 1, steer: 0, boostActive: true, slipstreamMultiplier: 1.5, surfaceSpeedFactor: 1.1 },
      spec,
      0.05
    );
  }
  // Expected topSpeed = 18 * 1.3 * 1.5 * 1.1 = 38.61, but hitting maxRadius=50 dampens speed * 0.78
  const radialDist = Math.hypot(boosted.x, boosted.z);
  assert.ok(Math.abs(radialDist - 50) < 1e-6, `Expected clamp at maxRadius=50, got ${radialDist}`);

  // Verify unclamped multiplier speed inside large arena
  let openArena = { x: 0, y: 0, z: 0, heading: 0, speed: 0 };
  for (let i = 0; i < 60; i++) {
    openArena = stepVehicleKinematics(
      openArena,
      { throttle: 1, steer: 0, boostActive: true, slipstreamMultiplier: 2.0, surfaceSpeedFactor: 1.0 },
      { topSpeed: 18, boostMultiplier: 1.25, accelRate: 25, maxRadius: 5000 },
      0.05
    );
  }
  // slipstreamMultiplier clamps at 1.65 -> 18 * 1.25 * 1.65 = 37.125
  assert.ok(Math.abs(openArena.speed - 37.125) < 0.05, `Expected clamped slipstream top speed ~37.125, got ${openArena.speed}`);
});

// ============================================================================
// 5. resolveActiveBiome & Field Expeditions
// ============================================================================

test("WS-10: resolveActiveBiome accurately resolves inner hubs and outer frontier landmarks across all 3 realms", () => {
  const fwCenter = resolveActiveBiome("frostwake", 2, -3);
  assert.equal(fwCenter.id, "central_glacier");
  assert.equal(fwCenter.insideRadius, true);
  assert.equal(fwCenter.isOuterFrontier, false);

  const fwCaldera = resolveActiveBiome("frostwake", -44, 22);
  assert.equal(fwCaldera.id, "caldera_springs");
  assert.equal(fwCaldera.isOuterFrontier, true);
  assert.equal(fwCaldera.distanceM, 0);

  const orGrotto = resolveActiveBiome("oddroot", -40, 11);
  assert.equal(orGrotto.id, "starlight_grotto");
  assert.equal(orGrotto.isOuterFrontier, true);
  assert.equal(orGrotto.insideRadius, true);

  const abCourtyard = resolveActiveBiome("arc_bastion", 0, 14);
  assert.equal(abCourtyard.id, "citadel_courtyard");
  assert.equal(abCourtyard.isOuterFrontier, false);

  const abCanyon = resolveActiveBiome("arc_bastion", 1, -52);
  assert.equal(abCanyon.id, "canyon_terraces");
  assert.equal(abCanyon.isOuterFrontier, true);
  assert.equal(abCanyon.insideRadius, true);

  // Far outside radius marks insideRadius = false while still returning closest normalized biome
  const farOut = resolveActiveBiome("arc_bastion", 0, -120);
  assert.equal(farOut.id, "canyon_terraces");
  assert.equal(farOut.insideRadius, false);

  // Unknown realm gracefully falls back to frostwake
  const fallback = resolveActiveBiome("unknown_realm", 0, 0);
  assert.equal(fallback.id, "central_glacier");
});

test("WS-11: createFieldExpeditionState and stepFieldExpedition award +2 intermediate shards, full completion reward, and auto-rotate templates", () => {
  for (const realmId of ["frostwake", "oddroot", "arc_bastion"]) {
    let exp = createFieldExpeditionState(realmId, 0);
    const firstTemplateId = exp.expeditionId;
    const expectedCompletionShards = exp.shardReward;
    assert.equal(exp.templateIndex, 0);
    assert.equal(exp.collectedCount, 0);
    assert.equal(exp.targetCount, 3);

    // Far away -> no hit
    const missStep = stepFieldExpedition(exp, 999, 999);
    assert.equal(missStep.shardsEarned, 0);
    assert.equal(missStep.justCollectedWaypoint, null);

    // Waypoint 1 -> +2 shards
    const wp0 = exp.waypoints[0];
    const s1 = stepFieldExpedition(exp, wp0.x + 1.0, wp0.z - 1.0);
    assert.equal(s1.shardsEarned, 2);
    assert.equal(s1.justCollectedWaypoint.id, wp0.id);
    assert.equal(s1.justCompletedExpedition, null);
    assert.equal(s1.state.collectedCount, 1);

    // Re-stepping on already-collected Waypoint 1 does not double-award
    const dup = stepFieldExpedition(s1.state, wp0.x, wp0.z);
    assert.equal(dup.shardsEarned, 0);
    assert.equal(dup.justCollectedWaypoint, null);

    // Waypoint 2 -> +2 shards
    const wp1 = s1.state.waypoints[1];
    const s2 = stepFieldExpedition(s1.state, wp1.x, wp1.z);
    assert.equal(s2.shardsEarned, 2);
    assert.equal(s2.state.collectedCount, 2);
    assert.equal(s2.justCompletedExpedition, null);

    // Waypoint 3 -> completes expedition, awards shardReward, and auto-rotates to templateIndex 1!
    const wp2 = s2.state.waypoints[2];
    const s3 = stepFieldExpedition(s2.state, wp2.x, wp2.z);
    assert.equal(s3.shardsEarned, expectedCompletionShards);
    assert.ok(s3.justCompletedExpedition);
    assert.equal(s3.justCompletedExpedition.expeditionId, firstTemplateId);
    assert.equal(s3.justCompletedExpedition.completedTotal, 1);
    assert.equal(s3.state.templateIndex, 1);
    assert.notEqual(s3.state.expeditionId, firstTemplateId);
    assert.equal(s3.state.collectedCount, 0);
    assert.equal(s3.state.completedTotal, 1);
  }

  // Wrap-around modulo 3 on completedCount = 3 and graceful recovery from null state
  const wrapped = createFieldExpeditionState("arc_bastion", 3);
  assert.equal(wrapped.templateIndex, 0);
  assert.equal(wrapped.expeditionId, EXPEDITION_CATALOG.arc_bastion[0].id);

  const recovered = stepFieldExpedition(null, 0, 0);
  assert.equal(recovered.shardsEarned, 0);
  assert.equal(recovered.state.realmId, "frostwake");
});

// ============================================================================
// 6. sampleTrajectoryArc, computeCoordinateSplatter & exportRobloxSimSnapshot
// ============================================================================

test("WS-12: sampleTrajectoryArc strictly enforces <= 0.12 Anti-Scrub preview ratio pre-commit and 1.0 full span post-commit across all 3 curve modes", () => {
  // 1. Linear y = mx + b
  const linPre = sampleTrajectoryArc({ mode: "linear", m: 2, b: 3, spanX: 20, committed: false, sampleCount: 16 });
  assert.equal(linPre.committed, false);
  assert.equal(linPre.spanRatio, 0.12);
  assert.ok(linPre.spanRatio <= 0.15);
  assert.equal(linPre.renderedSpanX, 2.4);
  assert.equal(linPre.points.length, 16);
  assert.ok(linPre.points.every((p) => p.x <= 2.4 + 1e-6));
  assert.equal(linPre.points[0].y, 3);
  assert.equal(linPre.points[linPre.points.length - 1].y, 7.8); // 2 * 2.4 + 3

  const linPost = sampleTrajectoryArc({ mode: "linear", m: 2, b: 3, spanX: 20, committed: true, sampleCount: 16 });
  assert.equal(linPost.committed, true);
  assert.equal(linPost.spanRatio, 1.0);
  assert.equal(linPost.renderedSpanX, 20);
  assert.equal(linPost.points[linPost.points.length - 1].x, 20);
  assert.equal(linPost.points[linPost.points.length - 1].y, 43);

  // 2. Quadratic vertex y = a(x - h)^2 + k
  const qvPre = sampleTrajectoryArc({ mode: "quadratic_vertex", a: -0.5, h: 4, k: 12, spanX: 10, committed: false });
  assert.equal(qvPre.spanRatio, 0.12);
  assert.equal(qvPre.renderedSpanX, 1.2);

  const qvPost = sampleTrajectoryArc({ mode: "quadratic_vertex", a: -0.5, h: 4, k: 12, spanX: 8, committed: true, sampleCount: 5 });
  // With 5 points on spanX=8, index 2 is x = 4 (exact vertex!) -> y = 12
  assert.equal(qvPost.points[2].x, 4);
  assert.equal(qvPost.points[2].y, 12);
  assert.equal(qvPost.points[0].y, 4); // -0.5 * (0 - 4)^2 + 12 = 4

  // 3. Quadratic roots y = a(x - r1)(x - r2)
  const qrPre = sampleTrajectoryArc({ mode: "quadratic_roots", a: -1, r1: 2, r2: 6, spanX: 10, committed: false });
  assert.equal(qrPre.spanRatio, 0.12);
  assert.ok(qrPre.renderedSpanX <= 1.2);

  const qrPost = sampleTrajectoryArc({ mode: "quadratic_roots", a: -1, r1: 2, r2: 6, spanX: 8, committed: true, sampleCount: 5 });
  // Points at x = 0, 2, 4, 6, 8 -> roots at x=2 and x=6 equal y=0, apex at x=4 equals y=4
  assert.equal(qrPost.points[1].x, 2);
  assert.ok(qrPost.points[1].y === 0);
  assert.equal(qrPost.points[2].x, 4);
  assert.equal(qrPost.points[2].y, 4);
  assert.equal(qrPost.points[3].x, 6);
  assert.ok(qrPost.points[3].y === 0);
});

test("WS-13: computeCoordinateSplatter computes exact hit vs clamped algebraic miss splatter and caliper height", () => {
  const exact = computeCoordinateSplatter({ committedValue: -200, answer: -200, targetX: 10, targetY: 6 });
  assert.equal(exact.hit, true);
  assert.equal(exact.algebraicDelta, 0);
  assert.equal(exact.impactX, 10);
  assert.equal(exact.impactY, 6);
  assert.equal(exact.caliperHeight, 0);
  assert.equal(exact.cryoSlowRadiusM, 6.5);

  const lowMiss = computeCoordinateSplatter({ committedValue: 22, answer: 26, targetX: 10, targetY: 8, scaleY: 0.5 });
  assert.equal(lowMiss.hit, false);
  assert.equal(lowMiss.algebraicDelta, -4);
  assert.equal(lowMiss.impactY, 6); // 8 + (-4 * 0.5)
  assert.equal(lowMiss.caliperHeight, 2);

  // Extreme delta clamps vertical offset within [-8.5, +8.5]
  const hugeMiss = computeCoordinateSplatter({ committedValue: 500, answer: -200, targetX: 12, targetY: 5, scaleY: 0.35 });
  assert.equal(hugeMiss.hit, false);
  assert.equal(hugeMiss.algebraicDelta, 700);
  assert.equal(hugeMiss.impactY, 13.5); // 5 + 8.5
  assert.equal(hugeMiss.caliperHeight, 8.5);
});

test("WS-14: exportRobloxSimSnapshot converts meters to Roblox studs (1m = 3.5 studs) and round-trips cleanly via JSON", () => {
  const vehicleState = { x: -10, y: 0.2, z: 26, heading: 1.2566, speed: 14.2 };
  const timeScaleState = computeSimulationTimeScale({
    dt: 1 / 60,
    realmId: "arc_bastion",
    encounterDockOpen: true,
  });
  const expeditionState = createFieldExpeditionState("arc_bastion", 1);

  const snap = exportRobloxSimSnapshot({
    realmId: "arc_bastion",
    vehicleState,
    timeScaleState,
    expeditionState,
  });

  assert.equal(snap.v, WORLD_SIM_VERSION);
  assert.equal(snap.realmId, "arc_bastion");
  assert.equal(snap.pose.x, -10);
  assert.equal(snap.pose.y, 0.2);
  assert.equal(snap.pose.z, 26);
  assert.equal(snap.pose.studsX, -35);
  assert.equal(snap.pose.studsY, 0.7);
  assert.equal(snap.pose.studsZ, 91);
  assert.equal(snap.biomeId, "clockwork_foundry");
  assert.equal(snap.timeScale, 0.08);
  assert.equal(snap.bulletTimeActive, true);
  assert.equal(snap.mathPaused, true);
  assert.deepEqual(snap.expedition, {
    id: "ab_tesla_ramparts",
    collectedCount: 0,
    targetCount: 3,
    completedTotal: 1,
  });

  const roundTrip = JSON.parse(JSON.stringify(snap));
  assert.deepEqual(roundTrip, snap);

  const snapNoExp = exportRobloxSimSnapshot({ realmId: "frostwake", vehicleState: { x: 0, y: 0, z: 0 } });
  assert.equal(snapNoExp.expedition, null);
  assert.equal(snapNoExp.pose.studsX, 0);
});

// ============================================================================
// 7. Arc Bastion Cross-Realm Contracts in core/engine.js & core/sync.js
// ============================================================================

test("WS-15: SUB_GAMES, BASTION_RIGS, BASTION_UPGRADES (ab_*), and initial presets wire arc_bastion live with clean child copy", () => {
  const abGame = SUB_GAMES.find((g) => g.id === "arc_bastion");
  assert.ok(abGame);
  assert.equal(abGame.status, "live");
  assert.ok(abGame.badge.includes("3D LIVE"));
  assertCleanChildText(`${abGame.title} ${abGame.subtitle} ${abGame.badge} ${abGame.blurb}`, "SUB_GAMES.arc_bastion");

  assert.equal(BASTION_RIGS, BASTION_CHASSIS);
  assert.equal(BASTION_RIGS.length, 2);
  assert.deepEqual(
    BASTION_RIGS.map((r) => r.id),
    ["iron_ballista", "prism_rail_skiff"]
  );
  for (const r of BASTION_RIGS) {
    assertCleanChildText(`${r.name} ${r.tag}`, `BASTION_RIGS.${r.id}`);
  }

  assert.equal(BASTION_UPGRADES.length, 6);
  for (const u of BASTION_UPGRADES) {
    assert.ok(u.id.startsWith("ab_"), `Expected ab_* upgrade id, got ${u.id}`);
    assert.ok(u.cost >= 45 && u.cost <= 240);
    assertCleanChildText(`${u.name} ${u.shortDesc}`, `BASTION_UPGRADES.${u.id}`);
  }

  const davidProg = createInitialProgress("david");
  const sarahProg = createInitialProgress("sarah");
  assert.equal(davidProg.games.arc_bastion.equippedRig, "iron_ballista");
  assert.equal(sarahProg.games.arc_bastion.equippedRig, "prism_rail_skiff");

  // Next Wonder Teaser in Armory mode for arc_bastion once active world guardian is awakened
  davidProg.nodes["W1.2"].stage = 2;
  davidProg.fluxShards = 60;
  const teaser = computeNextWonderTeaser(davidProg, createSessionState(), "arc_bastion");
  assert.equal(teaser.action, "garage");
  assert.ok(teaser.headline.includes("Armory"));
  assertCleanChildText(`${teaser.kicker} ${teaser.headline} ${teaser.hint}`, "Teaser.arc_bastion");
});

test("WS-20: Deterministic Roblox parity round-trip combining stepVehicleKinematics, sampleTrajectoryArc, computeCoordinateSplatter, and exportRobloxSimSnapshot", () => {
  const rigSpec = BASTION_RIGS.find((r) => r.id === "prism_rail_skiff");
  let pose = { x: 0, y: 0.4, z: 14, heading: 0, speed: 0, distTraveled: 0 };

  for (let frame = 0; frame < 30; frame++) {
    const ts = computeSimulationTimeScale({
      dt: 1 / 60,
      realmId: "arc_bastion",
      encounterDockOpen: false,
      bulletTimeRequested: frame >= 20,
    });
    pose = stepVehicleKinematics(pose, { throttle: 1, steer: 0.25, boostActive: true }, rigSpec, ts.worldDt);
  }

  // Dock opens -> bullet-time 0.08x + oppositionDt === 0.0 + <= 12% trajectory stub
  const dockTs = computeSimulationTimeScale({ dt: 1 / 60, realmId: "arc_bastion", encounterDockOpen: true });
  assert.equal(Object.is(dockTs.oppositionDt, 0), true);
  assert.equal(dockTs.timeScale, 0.08);

  const previewStub = sampleTrajectoryArc({ mode: "linear", m: 3, b: -2, spanX: 15, committed: false });
  assert.equal(previewStub.spanRatio, 0.12);
  assert.equal(previewStub.renderedSpanX, 1.8);

  // Player commits dial = 2 instead of m = 3 on ring (5, 13) -> deterministic miss splatter + post-commit full arc
  const splatter = computeCoordinateSplatter({ committedValue: 2, answer: 3, targetX: 5, targetY: 13, scaleY: 0.4 });
  assert.equal(splatter.hit, false);
  assert.equal(splatter.algebraicDelta, -1);
  assert.equal(splatter.impactY, 12.6);

  const committedArc = sampleTrajectoryArc({ mode: "linear", m: 2, b: -2, spanX: 15, committed: true });
  assert.equal(committedArc.spanRatio, 1.0);
  assert.equal(committedArc.renderedSpanX, 15);

  const snap = exportRobloxSimSnapshot({
    realmId: "arc_bastion",
    vehicleState: pose,
    timeScaleState: dockTs,
    expeditionState: createFieldExpeditionState("arc_bastion", 2),
  });
  assert.ok(Math.abs(snap.pose.studsX - Math.round(snap.pose.x * 3.5 * 1000) / 1000) < 0.01);
  assert.equal(snap.expedition.id, "ab_origami_targets");
});

test("WS-16: getCrossRealmUnlocks, computeArchitectLevel, and computeHeroTitle propagate arc_bastion mastery & upgrades bidirectionally", () => {
  // 1. Sub-Zero mastery in Frostwake/Oddroot unlocks cryoCannonUnlocked in Arc Bastion
  const pSubZero = createInitialProgress("david");
  assert.equal(getCrossRealmUnlocks(pSubZero).cryoCannonUnlocked, false);
  pSubZero.records.deepestSubZero = 200;
  assert.equal(getCrossRealmUnlocks(pSubZero).cryoCannonUnlocked, true);

  // Conversely, forging ab_cryo_mortar in Arc Bastion unlocks cryo/astro-toad cross-realm perks
  const pMortar = createInitialProgress("auto");
  pMortar.games.arc_bastion.bastionUpgrades = ["ab_cryo_mortar"];
  const uMortar = getCrossRealmUnlocks(pMortar);
  assert.equal(uMortar.cryoCannonUnlocked, true);
  assert.equal(uMortar.astroToadUnlocked, true);

  // 2. Clockwork crest unlocks via ab_auto_turret, ab_chronos_harp, or >= 5 contraptionsShattered
  const pClock = createInitialProgress("auto");
  assert.equal(getCrossRealmUnlocks(pClock).clockworkCrestUnlocked, false);
  pClock.games.arc_bastion.contraptionsShattered = 5;
  assert.equal(getCrossRealmUnlocks(pClock).clockworkCrestUnlocked, true);
  assert.equal(getCrossRealmUnlocks(pClock).clockworkSentinelSynced, true);

  // 3. Mosaic & Aurora Blade trims sync with ab_citadel_crown and ab_prism_pierce
  const pCrown = createInitialProgress("sarah");
  pCrown.games.arc_bastion.bastionUpgrades = ["ab_prism_pierce"];
  assert.equal(getCrossRealmUnlocks(pCrown).auroraBladeTrimUnlocked, true);
  assert.equal(getCrossRealmUnlocks(pCrown).bastionMosaicTrim, false);

  pCrown.games.arc_bastion.bastionUpgrades.push("ab_citadel_crown");
  const uCrown = getCrossRealmUnlocks(pCrown);
  assert.equal(uCrown.bastionMosaicTrim, true);
  assert.equal(uCrown.goldenMosaicTrimUnlocked, true);
  assert.equal(uCrown.frostwakePlowTrim, "golden_mosaic");

  // 4. Architect Level & Sky-Bastion Siegesmith Hero Title
  const baseLv = computeArchitectLevel(createInitialProgress("auto"));
  pCrown.games.arc_bastion.contraptionsShattered = 10;
  pCrown.games.arc_bastion.expeditionsCompleted = 4;
  const boostedLv = computeArchitectLevel(pCrown);
  assert.ok(boostedLv.xp > baseLv.xp);
  assert.equal(computeHeroTitle(pCrown), "Sky-Bastion Siegesmith");
});

test("WS-17: mergeProgress and sync.mergeGamesState monotonically merge arc_bastion upgrades, stats, and fastest ghost raids", () => {
  const webProg = createInitialProgress("david");
  webProg.rev = 1000;
  webProg.games.arc_bastion = {
    equippedRig: "iron_ballista",
    bastionUpgrades: ["ab_cryo_mortar", "ab_auto_turret"],
    contraptionsShattered: 14,
    cryoGelSplats: 6,
    expeditionsCompleted: 2,
    bestRaidSec: 41.5,
    ghostFrames: [{ t: 0, x: 0, z: 0 }, { t: 1, x: 4, z: -8 }],
    ghostBest: { sec: 41.5 },
  };

  const robloxProg = createInitialProgress("david");
  robloxProg.rev = 2000;
  robloxProg.games.arc_bastion = {
    equippedRig: "prism_rail_skiff",
    bastionUpgrades: ["ab_prism_pierce", "ab_auto_turret"],
    contraptionsShattered: 9,
    cryoGelSplats: 11,
    expeditionsCompleted: 5,
    bestRaidSec: 48.2,
    ghostFrames: [{ t: 0, x: 1, z: 1 }],
    ghostBest: { sec: 48.2 },
  };

  const merged = mergeProgress(webProg, robloxProg);
  const ab = merged.games.arc_bastion;
  assert.equal(ab.equippedRig, "prism_rail_skiff"); // newer rev wins active rig choice
  assert.deepEqual(ab.bastionUpgrades.sort(), ["ab_auto_turret", "ab_cryo_mortar", "ab_prism_pierce"]);
  assert.equal(ab.contraptionsShattered, 14);
  assert.equal(ab.cryoGelSplats, 11);
  assert.equal(ab.expeditionsCompleted, 5);
  assert.equal(ab.bestRaidSec, 41.5); // faster positive raid retained even from older rev!
  assert.equal(ab.ghostFrames.length, 2);
  assert.deepEqual(ab.ghostBest, { sec: 41.5 });

  // Direct sync.mergeGamesState parity check
  const syncMerged = syncMod.mergeGamesState(webProg.games, robloxProg.games);
  assert.equal(syncMerged.arc_bastion.bestRaidSec, 41.5);
  assert.equal(syncMerged.arc_bastion.contraptionsShattered, 14);
  assert.deepEqual(syncMerged.arc_bastion.bastionUpgrades.sort(), ["ab_auto_turret", "ab_cryo_mortar", "ab_prism_pierce"]);
});

test("WS-18: compactGamesForCloud bounds massive 3-realm ghost payloads (including arc_bastion) strictly under 38 KB without mutating live arrays", async () => {
  const hugeFrames = Array.from({ length: 4500 }, (_, i) => ({
    t: i * 0.05,
    x: Math.sin(i * 0.1) * 30,
    y: 1.25,
    z: -i * 0.08,
    heading: 0.42,
    speed: 18.4,
    extraDebugField: "strip-me",
  }));

  const store = syncMod.loadStore();
  store.familyCode = "BASTION-77";
  syncMod.ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });
  store.activeUsername = "sarah";

  const prog = store.progressByUser.sarah;
  prog.games.frostwake.bestWaveSec = 35.1;
  prog.games.frostwake.ghostFrames = hugeFrames;
  prog.games.oddroot.bestCircuitSec = 38.4;
  prog.games.oddroot.ghostFrames = hugeFrames;
  prog.games.arc_bastion.bestRaidSec = 32.8;
  prog.games.arc_bastion.ghostFrames = hugeFrames;
  prog.games.arc_bastion.ghostBest = { frames: hugeFrames, raidSec: 32.8 };

  const compacted = syncMod.compactGamesForCloud(prog.games);
  const byteLen = new TextEncoder().encode(JSON.stringify(compacted)).length;
  assert.ok(byteLen < 38000, `Expected compacted 3-realm games < 38000 bytes, got ${byteLen}`);
  assert.equal(prog.games.arc_bastion.ghostFrames.length, 4500, "Live arc_bastion ghostFrames must not be mutated");

  const rpcCalls = [];
  syncMod.setRpcTransport(async (fn, args) => {
    rpcCalls.push({ fn, args });
    if (fn === "bloomn_player_merge") {
      return { ok: true, progress: args.p_progress, fun: args.p_fun };
    }
    if (fn === "bloomn_household_sync") {
      return { ok: true, total_flux: 300, observatory_tier: 2, heroes: {} };
    }
    return null;
  });

  try {
    const ok = await syncMod.pushActiveCloud(store);
    assert.equal(ok, true);
    const mergeCall = rpcCalls.find((c) => c.fn === "bloomn_player_merge");
    assert.ok(mergeCall);
    const funBytes = new TextEncoder().encode(JSON.stringify(mergeCall.args.p_fun)).length;
    assert.ok(funBytes < 38000, `Expected p_fun < 38000 bytes, got ${funBytes}`);
    assert.equal(
      store.progressByUser.sarah.games.arc_bastion.ghostFrames.length,
      4500,
      "High-res local arc_bastion ghostFrames preserved after cloud echo"
    );
  } finally {
    syncMod.clearPendingSyncTimer();
    syncMod.setRpcTransport(null);
  }
});

test("WS-19: borrowSiblingToy shares arc_bastion rig + combined upgrades, gifts +5 shards once per pair, and never mutates borrower", () => {
  const store = {
    familyCode: "CITADEL-9",
    activeUsername: "david",
    profiles: [],
    progressByUser: {},
    householdWonder: { totalFlux: 100, observatoryTier: 1, heroes: {}, sharedToys: {} },
  };
  syncMod.ensureProfile(store, { username: "david", name: "David", avatar: "🦁" });
  syncMod.ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });

  const sarahProg = store.progressByUser.sarah;
  const davidProg = store.progressByUser.david;
  sarahProg.fluxShards = 80;
  davidProg.fluxShards = 45;
  sarahProg.ownedUpgrades = ["wide_blade"];
  sarahProg.games.oddroot.sanctuaryUpgrades = ["or_glide_wings"];
  sarahProg.games.oddroot.hatchedCreatures = ["eclipse_stag"];
  sarahProg.games.arc_bastion.equippedRig = "prism_rail_skiff";
  sarahProg.games.arc_bastion.bastionUpgrades = ["ab_prism_pierce", "ab_chronos_harp"];

  const borrow1 = syncMod.borrowSiblingToy(store, "david", "sarah", "arc_bastion");
  assert.ok(borrow1 && borrow1.ok);
  assert.equal(borrow1.realmId, "arc_bastion");
  assert.equal(borrow1.bastionRigId, "prism_rail_skiff");
  assert.equal(borrow1.bastionLoadout.rigId, "prism_rail_skiff");
  assert.ok(borrow1.bastionLoadout.upgrades.includes("ab_prism_pierce"));
  assert.ok(borrow1.bastionLoadout.upgrades.includes("ab_chronos_harp"));
  assert.ok(borrow1.bastionLoadout.upgrades.includes("wide_blade"));
  assert.equal(borrow1.companionId, "eclipse_stag");
  assert.equal(borrow1.giftShards, 5);
  assert.equal(borrow1.alreadyGifted, false);
  assert.equal(sarahProg.fluxShards, 85);
  assert.equal(davidProg.fluxShards, 45, "Borrower shards must never mutate");
  assert.equal(davidProg.games.arc_bastion.equippedRig, "iron_ballista", "Borrower saved rig must never mutate");

  // Repeat borrow in same session does not double-gift
  const borrow2 = syncMod.borrowSiblingToy(store, "david", "sarah", "arc_bastion");
  assert.equal(borrow2.alreadyGifted, true);
  assert.equal(borrow2.giftShards, 0);
  assert.equal(sarahProg.fluxShards, 85);

  // Self-borrow and unknown lender return null
  assert.equal(syncMod.borrowSiblingToy(store, "david", "david", "arc_bastion"), null);
  assert.equal(syncMod.borrowSiblingToy(store, "david", "ghost_user", "arc_bastion"), null);
  syncMod.clearPendingSyncTimer();
});
