import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as THREE from "../vendor/three.module.min.js";
import {
  BANNED_CHILD_WORDS,
  NODE_MAP,
  generateEncounter,
  applyBeamAction,
} from "../core/engine.js";
import { FrostwakeAudio } from "../frostwake/audio.js";
import {
  FrostwakeWorld3D,
  MAX_VALLEY_RADIUS,
  GRID_SEGMENTS,
} from "../frostwake/frostwake-3d.js";
import {
  PERMAFROST_BASE_DRAG,
  BASE_KNOCKBACK_RADIUS,
  WIDE_BLADE_KNOCKBACK_MULT,
  HARPOON_GRAPPLE_RANGE,
} from "../frostwake/opposition-3d.js";
import { CHASM_SPAN_M } from "../frostwake/encounters-3d.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOOM_N_DIR = path.resolve(__dirname, "..");
const FROSTWAKE_DIR = path.join(BLOOM_N_DIR, "frostwake");

const BANNED_SCHOOL_WORDS = [
  "pre-algebra",
  "pre-alg",
  "algebra 1",
  "algebra 2",
  "algebra i",
  "algebra ii",
  "algebra",
  "geometry",
  "trigonometry",
  "trig",
  "curriculum",
  "grade 6",
  "grade",
  "worksheet",
  "standardized",
];

function makeSeededRng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createHeadlessWorld(overrides = {}) {
  const events = [];
  const activities = [];
  const mysteries = [];
  const coinsGrabbed = [];
  let garageEnters = 0;

  const audio = overrides.audio || new FrostwakeAudio();
  const world = new FrostwakeWorld3D({
    canvas: null,
    audio,
    onWorldActivity: (amount, bonusFlux, metricKey) => {
      activities.push({ amount, bonusFlux, metricKey });
    },
    onMysteryFound: (id) => mysteries.push(id),
    onGaragePadEntered: () => {
      garageEnters += 1;
    },
    onOppositionEvent: (ev) => events.push(ev),
    onSharedCoinGrabbed: (coinId) => coinsGrabbed.push(coinId),
    ...overrides,
  });

  return {
    world,
    audio,
    events,
    activities,
    mysteries,
    coinsGrabbed,
    getGarageEnters: () => garageEnters,
  };
}

function extractCommentsAndStrings(src) {
  const chunks = [];
  const regex = /\/\*[\s\S]*?\*\/|\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gm;
  let m;
  while ((m = regex.exec(src)) !== null) {
    chunks.push(m[0]);
  }
  return chunks.join("\n").toLowerCase();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("F02: Frostwake JS/CSS files contain zero school/curriculum labels, zero shame words, zero #ff0000, zero countdowns, and zero n+4=10 fallback", () => {
  const jsFiles = fs
    .readdirSync(FROSTWAKE_DIR)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(FROSTWAKE_DIR, f));
  const optionalCss = path.join(BLOOM_N_DIR, "styles-frostwake.css");
  if (fs.existsSync(optionalCss)) jsFiles.push(optionalCss);

  assert.ok(jsFiles.length >= 6, "Expected all modular Frostwake files present");

  for (const fullPath of jsFiles) {
    const rel = path.relative(BLOOM_N_DIR, fullPath);
    const raw = fs.readFileSync(fullPath, "utf8");
    const rawLower = raw.toLowerCase();

    assert.ok(!rawLower.includes("#ff0000"), `Raw #ff0000 found in ${rel}`);
    assert.ok(!rawLower.includes("countdown"), `Raw countdown found in ${rel}`);
    assert.ok(!rawLower.includes("https://") && !rawLower.includes("http://"), `External URL in ${rel}`);
    assert.ok(!raw.includes("leftB: 4") && !raw.includes("rightB: 10"), `n+4=10 fallback found in ${rel}`);

    const commentsAndStrings = extractCommentsAndStrings(raw);
    for (const shame of BANNED_CHILD_WORDS) {
      const re = new RegExp(`\\b${escapeRegex(shame)}\\b`, "i");
      assert.ok(
        !re.test(commentsAndStrings) && !commentsAndStrings.includes(shame),
        `Banned shame word "${shame}" in ${rel}`
      );
    }
    for (const school of BANNED_SCHOOL_WORDS) {
      const re = new RegExp(`\\b${escapeRegex(school)}\\b`, "i");
      assert.ok(!re.test(commentsAndStrings), `Banned school word "${school}" in ${rel}`);
    }
  }
});

test("F05/F11/F12: Headless Node Scene-Graph Resilience & Complete Realm3DAdapter + RealmAudioAdapter Contract", () => {
  // Mock AudioContext to verify real procedural WebAudio synthesis & mute suppression
  const oscCalls = [];
  const gainTargets = [];
  const origAC = globalThis.AudioContext;
  class MockAudioContext {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 22050;
      this.state = "running";
      this.destination = {};
    }
    resume() {
      return Promise.resolve();
    }
    createOscillator() {
      const rec = {
        type: "sine",
        frequency: {
          value: 0,
          setValueAtTime: (v) => {
            rec.frequency.value = v;
          },
          exponentialRampToValueAtTime: (v) => {
            rec.slideTo = v;
          },
          setTargetAtTime: (v) => {
            rec.frequency.value = v;
          },
        },
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
      oscCalls.push(rec);
      return rec;
    }
    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
          setTargetAtTime: (v) => gainTargets.push(v),
        },
        connect: () => {},
      };
    }
    createBiquadFilter() {
      return {
        type: "lowpass",
        frequency: { value: 0, setTargetAtTime: (v) => { this.lastFilterFreq = v; } },
        Q: { value: 1, setTargetAtTime: () => {} },
        connect: () => {},
      };
    }
    createBuffer(_ch, len, sr) {
      const arr = new Float32Array(len);
      return { sampleRate: sr, getChannelData: () => arr };
    }
    createBufferSource() {
      return { buffer: null, loop: false, connect: () => {}, start: () => {}, stop: () => {} };
    }
  }

  try {
    globalThis.AudioContext = MockAudioContext;
    const synth = new FrostwakeAudio();
    synth.unlock();
    synth.updateRigHum(0.8, "aurora_sled");
    synth.updateSnowHiss(0.85, true, true);
    synth.playCrystalShatter(true);
    synth.playGeyserBurst();
    synth.playHarpoonWinch();
    synth.playGuardianAwakening();
    synth.playGarageLift();
    synth.playCoopFlare();
    synth.playCoinGrab();
    synth.playCoopGateBurst(true);
    assert.ok(oscCalls.length >= 20, "Procedural WebAudio oscillators should fire");

    const countBeforeMute = oscCalls.length;
    synth.setMuted(true);
    synth.playClear(true);
    assert.equal(oscCalls.length, countBeforeMute, "Muted audio must suppress new tones");
    synth.stopHum();
  } finally {
    globalThis.AudioContext = origAC;
  }

  const { world } = createHeadlessWorld();
  assert.equal(world.webglAvailable, false);
  assert.ok(world.scene instanceof THREE.Scene);
  assert.equal(world.snowMesh.geometry.attributes.position.count, (GRID_SEGMENTS + 1) ** 2);
  assert.equal(world.observatoryGroup.position.z, -60);
  assert.ok(world.guardianGroup instanceof THREE.Group);
  assert.ok(world.garageGroup instanceof THREE.Group);
  assert.ok(world.snowLilyMesh instanceof THREE.InstancedMesh);
  assert.ok(world.sprayInstMesh instanceof THREE.InstancedMesh);
  assert.ok(world.shardInstMesh instanceof THREE.InstancedMesh);
  assert.ok(world.pineMeshes.trunks instanceof THREE.InstancedMesh);

  // Verify every Realm3DAdapter + legacy method exists and runs cleanly
  world.resize();
  world.setObservatoryTier(4);
  world.setSurgeMode(true);
  world.setSurgeMode(false);
  world.start();
  world.step(1 / 60);
  world.stop();
  assert.equal(typeof world.getLocalMultiplayerPose, "function");
  assert.equal(typeof world.syncRemotePartners, "function");
  assert.equal(typeof world.playPartnerCoopEvent, "function");
  assert.equal(typeof world.playLocalFlare, "function");
  assert.equal(typeof world.syncSharedCoins, "function");
  assert.equal(typeof world.areAllEncountersCleared, "function");
  assert.equal(typeof world.triggerOverdriveStreakWonder, "function");
});

test("F05/F12: Valley r=68 Reachability to z=-60 Observatory, Spatial Clearances, Guardian Awakening & Garage Pad Hysteresis", () => {
  const rng = makeSeededRng(101);
  const { world, getGarageEnters } = createHeadlessWorld();
  const wave4 = [
    generateEncounter("W1.1", { rng }),
    generateEncounter("W1.2", { rng }),
    generateEncounter("W1.3", { rng }),
    generateEncounter("W1.4", { rng }),
  ];
  world.populateEncounters(wave4);
  assert.equal(world.gateSlots.length, 4, "4-item Surge wave must populate 4 distinct gates");

  // Verify Geothermal Vent -> Fox Den pairing distances in [10m..14m] and r <= 65m
  for (const vent of world.opposition.geothermalVents) {
    const den = world.opposition.foxDens.find((d) => d.id === vent.linkedDenId);
    assert.ok(den, `Missing linked den for ${vent.id}`);
    const pairDist = Math.hypot(vent.x - den.x, vent.z - den.z);
    assert.ok(pairDist >= 10.0 && pairDist <= 14.0, `Vent-Den pair distance out of range: ${pairDist}`);
    assert.ok(Math.hypot(vent.x, vent.z) <= 65, "Vent must sit inside drivable valley");
  }

  // Verify Permafrost Drifts do not overlap any Gate Slot
  for (const drift of world.opposition.permafrostDrifts) {
    for (const gate of world.gateSlots) {
      const dist = Math.hypot(drift.x - gate.x, drift.z - gate.z);
      assert.ok(dist > drift.radius + 3.0, `Drift ${drift.id} overlaps gate ${gate.index}`);
    }
  }

  // Drive straight north past z = -60 (r = 60 > old 52 fence) and clamp at MAX_VALLEY_RADIUS = 68
  world.rigState.x = 0;
  world.rigState.z = -46;
  world.rigState.heading = 0; // facing -Z north
  world.setDriveInputs(0, 1, true);
  for (let i = 0; i < 120; i++) world.step(1 / 30);
  assert.ok(world.rigState.z <= -60, `Expected rig to reach z<=-60 Observatory, got z=${world.rigState.z}`);
  assert.ok(Math.hypot(world.rigState.x, world.rigState.z) <= MAX_VALLEY_RADIUS + 0.01);

  // Garage Pad (-24, 16) hysteresis test
  world.setDriveInputs(0, 0, false);
  world.rigState.speed = 0;
  world.rigState.x = -24;
  world.rigState.z = 16;
  world.step(0.05);
  assert.equal(getGarageEnters(), 1, "Garage pad must trigger once on entry");

  // Stay parked on pad for 10s -> must NOT re-trigger modal loop
  for (let i = 0; i < 100; i++) world.step(0.1);
  assert.equal(getGarageEnters(), 1, "Garage pad must stay disarmed while parked on pad");

  // Drive > 8.5m clear of pad, then re-enter -> fires 2nd time
  world.rigState.x = -12;
  world.rigState.z = 16;
  world.step(0.1);
  assert.equal(world.garagePadArmed, true);
  world.rigState.x = -24;
  world.rigState.z = 16;
  world.step(0.1);
  assert.equal(getGarageEnters(), 2, "Garage pad must re-fire after exiting >8.5m and re-entering");

  // Frost Guardian Awakening burst
  world.triggerGuardianAwakening("W2");
  assert.equal(world.guardianBeam.visible, true);
  assert.equal(world.guardianAwakeningCount, 1);
  assert.ok(world.whaleTimer > 0);
  for (let i = 0; i < 55; i++) world.step(0.1);
  assert.equal(world.guardianBeam.visible, false);
});

test("F03: Mandatory Math-Pause Law freezes Rime-Creeps & Captains with bitwise 0.0 delta, and Gate-Clear unleashes 18m Rime-Blast", () => {
  const rng = makeSeededRng(202);
  const { world } = createHeadlessWorld();
  world.populateEncounters([generateEncounter("W0.1", { rng })]);

  const u0 = world.opposition.rimeUnits[0];
  const startPos = { x: u0.x, z: u0.z };

  // Unpaused: Rime-Creeps advance smoothly toward Fox Dens
  for (let i = 0; i < 10; i++) world.step(0.1);
  assert.ok(
    Math.hypot(u0.x - startPos.x, u0.z - startPos.z) > 0.5,
    "Rime-Creeps must advance when Encounter Dock is closed"
  );

  // Open Encounter Dock -> 600 ticks (10s) must produce BITWISE ZERO opposition movement
  world.setEncounterDockOpen(true);
  const unitSnap = world.opposition.rimeUnits.map((u) => ({ x: u.x, y: u.y, z: u.z }));
  const denSnap = world.opposition.foxDens.map((d) => ({
    chill: d.chillLevel,
    shield: d.thermalShieldSec,
  }));

  for (let i = 0; i < 600; i++) world.step(1 / 60);

  world.opposition.rimeUnits.forEach((u, idx) => {
    assert.ok(Object.is(u.x, unitSnap[idx].x), `Unit ${u.id} X drifted during dock pause`);
    assert.ok(Object.is(u.y, unitSnap[idx].y), `Unit ${u.id} Y drifted during dock pause`);
    assert.ok(Object.is(u.z, unitSnap[idx].z), `Unit ${u.id} Z drifted during dock pause`);
  });
  world.opposition.foxDens.forEach((d, idx) => {
    assert.ok(Object.is(d.chillLevel, denSnap[idx].chill), `Den ${d.id} chill drifted during pause`);
    assert.ok(
      Object.is(d.thermalShieldSec, denSnap[idx].shield),
      `Den ${d.id} shield timer drifted during pause`
    );
  });

  // Close dock, drive into Gate 0 approach zone -> activeGateSlot auto-pauses opposition too!
  world.setEncounterDockOpen(false);
  world.rigState.x = 0;
  world.rigState.z = -5.5;
  world.step(1 / 60);
  assert.ok(world.activeGateSlot !== null, "Rig inside approach zone must set activeGateSlot");

  const gatePauseSnap = world.opposition.rimeUnits.map((u) => ({ x: u.x, z: u.z }));
  for (let i = 0; i < 120; i++) world.step(1 / 60);
  world.opposition.rimeUnits.forEach((u, idx) => {
    assert.ok(Object.is(u.x, gatePauseSnap[idx].x) && Object.is(u.z, gatePauseSnap[idx].z));
  });

  // Place a creep 8m from Gate 0 (0, -11) and verify Gate-Clear 18m Rime-Blast clears it!
  const testCreep = world.opposition.rimeCreeps[0];
  testCreep.x = 4;
  testCreep.z = -14;
  testCreep.state = "creeping";
  world.playCommitVisual({ outcome: "clear", overdrive: true }, world.gateSlots[0].encounter);
  assert.equal(testCreep.state, "respawning", "18m Gate-Clear Rime-Blast must pop nearby Rime-Creep");
});

test("F03/F12: Visceral Upgrade Power — Permafrost 0.42x vs 1.0x wide_blade + 3x knockback, Thermal Trenches, ion_boosters Captain smash & Chasm jump, and titan_harpoon 16m spire grapple", () => {
  const { world, events } = createHeadlessWorld();

  // 1. Permafrost speed drag (0.42x un-upgraded vs 1.0x wide_blade melt)
  const driftEast = world.opposition.permafrostDrifts.find((d) => d.id === "drift_east");
  assert.equal(world.opposition.getPermafrostSpeedFactor(driftEast.x, driftEast.z, false), PERMAFROST_BASE_DRAG);
  assert.equal(world.opposition.getPermafrostSpeedFactor(driftEast.x, driftEast.z, true), 1.0);

  world.rebuildRig("terra_dozer", []);
  world.rigState.x = driftEast.x;
  world.rigState.z = driftEast.z + 3.0;
  world.rigState.heading = 0;
  world.setDriveInputs(0, 1, false);
  for (let i = 0; i < 35; i++) world.step(0.02);
  const boggedSpeed = world.rigState.speed;
  assert.ok(
    boggedSpeed > 6.5 && boggedSpeed < 8.2,
    `Basic rig in Permafrost should drag near 17.5*0.42=7.35 m/s, got ${boggedSpeed}`
  );
  assert.equal(driftEast.integrity, 1.0);

  const driftWest = world.opposition.permafrostDrifts.find((d) => d.id === "drift_west");
  world.rebuildRig("terra_dozer", ["wide_blade"]);
  world.rigState.x = driftWest.x;
  world.rigState.z = driftWest.z + 2.0;
  world.rigState.heading = 0;
  world.setDriveInputs(0, 1, false);
  for (let i = 0; i < 45; i++) world.step(0.02);
  assert.ok(world.rigState.speed > 16.2, `wide_blade must plow at ~100% speed, got ${world.rigState.speed}`);
  assert.equal(driftWest.integrity, 0, "wide_blade must melt Permafrost Drift");
  assert.ok(events.some((e) => e.kind === "permafrost_melted" && e.shardsEarned === 8));

  // 2. 3.0x Knockback Width Differential (2.6m vs 7.8m) + Geyser Burst
  assert.equal(WIDE_BLADE_KNOCKBACK_MULT, 3.0);
  assert.ok(Math.abs(BASE_KNOCKBACK_RADIUS * WIDE_BLADE_KNOCKBACK_MULT - 7.8) < 1e-9);
  const cA = world.opposition.rimeCreeps[1];
  const cB = world.opposition.rimeCreeps[2];

  world.rebuildRig("terra_dozer", []);
  world.rigState.x = 0;
  world.rigState.z = 10;
  world.rigState.heading = 0;
  world.rigState.speed = 12;
  cA.state = "creeping";
  cA.x = -5.5;
  cA.z = 8.0;
  cB.state = "creeping";
  cB.x = 5.5;
  cB.z = 8.0;
  world.step(1 / 60);
  assert.equal(cA.state, "creeping", "5.5m lateral creep is outside basic 2.6m blade");
  assert.equal(cB.state, "creeping");

  world.rebuildRig("terra_dozer", ["wide_blade"]);
  world.rigState.x = 0;
  world.rigState.z = 10;
  world.rigState.heading = 0;
  world.rigState.speed = 12;
  world.step(1 / 60);
  assert.equal(cA.state, "knockback", "5.5m lateral creep must be knocked by 7.8m (3x) wide_blade");
  assert.equal(cB.state, "knockback");

  // Knock creep into Geothermal Geyser (-50, -14)
  cA.x = -49.2;
  cA.z = -13.5;
  cA.vx = -4;
  cA.vz = -2;
  for (let i = 0; i < 40; i++) world.step(0.03);
  assert.ok(events.some((e) => e.kind === "rime_geyser_burst" && e.shardsEarned >= 6));

  // 3. Geothermal Vent (-46, 5) -> Thermal Trench -> Chilled Fox Den (-38, -4)
  const denWest = world.opposition.foxDens.find((d) => d.id === "den_west");
  denWest.chillLevel = 1.0;
  denWest.isChilled = true;
  world.rigState.x = -46;
  world.rigState.z = 5;
  world.rigState.heading = Math.atan2(-8, 9);
  world.setDriveInputs(0, 1, false);
  world.step(0.05);
  assert.ok(world.opposition.rigThermalChargeSec > 7.5, "Driving over Geothermal Vent must charge blade");

  // Carve straight from (-46, 5) to (-38, -4)
  for (let s = 0; s <= 12; s++) {
    const u = s / 12;
    world.rigState.x = -46 + 8 * u;
    world.rigState.z = 5 - 9 * u;
    world.rigState.speed = 14;
    world._carveSnowAt(world.rigState.x, world.rigState.z, 2.5);
    world.step(0.04);
  }
  assert.equal(denWest.isChilled, false, "Thermal Trench must thaw chilled Spirit-Fox Den");
  assert.ok(denWest.thermalShieldSec >= 25, "Thermal Trench must raise warm moat shield");
  assert.ok(events.some((e) => e.kind === "fox_den_thawed" && e.shardsEarned === 12));

  // 4. Shielded Rime-Captain deflect vs ion_boosters 1-charge shatter
  const captain = world.opposition.rimeCaptains[0];
  captain.state = "creeping";
  captain.shieldIntact = true;
  captain.x = -20;
  captain.z = 4;

  world.rebuildRig("terra_dozer", []);
  world.rigState.x = -20;
  world.rigState.z = 6.0;
  world.rigState.heading = 0;
  world.rigState.speed = 14;
  world.setDriveInputs(0, 1, false);
  world.step(1 / 60);
  assert.equal(captain.shieldIntact, true, "Unboosted basic rig must deflect off Captain Hex-Shield");
  assert.ok(world.rigState.speed < 0, "Deflected rig must bounce backward gently");

  world.rebuildRig("terra_dozer", ["ion_boosters"]);
  world.rigState.x = -20;
  world.rigState.z = 6.0;
  world.rigState.heading = 0;
  world.rigState.speed = 19;
  world.setDriveInputs(0, 1, true);
  world.step(1 / 60);
  assert.equal(captain.shieldIntact, false, "Ion Thrusters boost charge must shatter Captain shield");
  assert.ok(events.some((e) => e.kind === "captain_shield_shatter" && e.shardsEarned === 10));

  // 5. Broken Ice Chasm Jump (34..55, z=10): un-upgraded safe basin vs ion_boosters East Bank clear
  world.rebuildRig("terra_dozer", []);
  world.rigState.x = 34.2;
  world.rigState.z = 10.0;
  world.rigState.heading = -Math.PI / 2; // +X East
  world.rigState.speed = 14;
  world.rigState.vx = 14;
  world.rigState.vz = 0;
  world.setDriveInputs(0, 1, true);
  let basinLandX = null;
  let wasJumping = false;
  for (let i = 0; i < 90; i++) {
    world.step(1 / 60);
    if (world.opposition.chasmJump) wasJumping = true;
    else if (wasJumping && basinLandX === null) basinLandX = world.rigState.x;
  }
  assert.ok(
    basinLandX !== null && basinLandX > 40.0 && basinLandX < 48.5,
    `Un-upgraded rig should cushion safely in snow basin (40..48.5), landed at ${basinLandX}`
  );

  world.rebuildRig("terra_dozer", ["ion_boosters"]);
  world.rigState.x = 34.2;
  world.rigState.z = 10.0;
  world.rigState.heading = -Math.PI / 2;
  world.rigState.speed = 21;
  world.rigState.vx = 21;
  world.rigState.vz = 0;
  world.setDriveInputs(0, 1, true);
  let ionLandX = null;
  let peakAirY = -Infinity;
  wasJumping = false;
  for (let i = 0; i < 100; i++) {
    world.step(1 / 60);
    if (world.rigState.y > peakAirY) peakAirY = world.rigState.y;
    if (world.opposition.chasmJump) wasJumping = true;
    else if (wasJumping && ionLandX === null) ionLandX = world.rigState.x;
  }
  assert.ok(
    peakAirY > world._baseHeight(44, 10) + 3.5,
    `Ion jump should soar >3.5m above terrain, got peakY=${peakAirY}`
  );
  assert.ok(
    ionLandX !== null && ionLandX >= 48.5,
    `Ion jump must clear chasm onto East Bank (>=48.5), landed at ${ionLandX}`
  );
  assert.ok(events.some((e) => e.kind === "chasm_jump_clear" && e.shardsEarned === 15));

  // 6. Starlight Winch (titan_harpoon, 175 shards) 3D turret & <=16m elevated spire Ice-Pod grapple
  assert.equal(HARPOON_GRAPPLE_RANGE, 16.0);
  world.rebuildRig("terra_dozer", []);
  assert.equal(world.harpoonTurret, null);
  world.rebuildRig("terra_dozer", ["titan_harpoon"]);
  assert.ok(world.rigGroup.getObjectByName("titan_harpoon_turret"));
  world.rebuildRig("aurora_sled", ["titan_harpoon"]);
  assert.ok(world.rigGroup.getObjectByName("titan_harpoon_turret"));

  const spirePod = world.opposition.icePods.find((p) => p.id === "pod_8");
  assert.equal(spirePod.elevated, true);
  world.rebuildRig("terra_dozer", []);
  world.rigState.x = spirePod.x + 13.5; // 13.5m <= 16.0m
  world.rigState.z = spirePod.z;
  world.triggerRealmQuickAction();
  assert.equal(spirePod.intact, true, "Elevated 4.8m spire pod cannot be grappled without titan_harpoon");

  world.rebuildRig("terra_dozer", ["titan_harpoon"]);
  const grappleRes = world.triggerRealmQuickAction();
  assert.equal(grappleRes.grappled, true);
  assert.equal(spirePod.intact, false, "titan_harpoon must grapple & shatter 13.5m spire pod");
  assert.ok(events.some((e) => e.kind === "ice_pod_grappled" && e.shardsEarned === 6));

  // Verify every emitted opposition message obeys <= 6 words and zero banned words
  for (const ev of events) {
    const words = ev.message.trim().split(/\s+/).filter(Boolean);
    assert.ok(words.length <= 6, `Opposition message >6 words: "${ev.message}"`);
    const low = ev.message.toLowerCase();
    for (const banned of [...BANNED_CHILD_WORDS, ...BANNED_SCHOOL_WORDS]) {
      assert.ok(!low.includes(banned), `Banned word "${banned}" in opposition message "${ev.message}"`);
    }
  }
});

test("F11: Tactile Slope Pitch/Roll, 6-Wheel Independent Spring Crunch vs Sled Banking, O(Window) Snow Normals, Snow-Lilies & 60fps DPR Governor", () => {
  const { world } = createHeadlessWorld();

  world.rebuildRig("terra_dozer", ["prismatic_trail"]);
  assert.equal(world.rigWheels.length, 6);
  world.rigState.x = 18;
  world.rigState.z = -14;
  world.setDriveInputs(0.65, 1.0, false);
  for (let i = 0; i < 50; i++) world.step(1 / 30);

  assert.ok(Math.abs(world.rigState.pitch) > 0.004, "Rig must pitch with terrain gradient");
  const springSet = new Set(world.rigWheels.map((w) => Math.round(w.springY * 10000)));
  assert.ok(springSet.size >= 2, "6x6 wheels must compute independent vertical spring deflections");
  assert.ok(world.activeLilyCount > 0, "Carving snow must bloom InstancedMesh Snow-Lilies");
  const dozerSlip = Math.abs(world.rigState.lateralSlip);

  // Verify local snowbank vertex normals updated to non-vertical along carved ridges
  const normAttr = world.snowMesh.geometry.attributes.normal;
  let tiltedNormals = 0;
  for (let i = 0; i < normAttr.count; i++) {
    if (world.snowCarve[i] > 0.2 && Math.hypot(normAttr.getX(i), normAttr.getZ(i)) > 0.02) {
      tiltedNormals += 1;
    }
  }
  assert.ok(tiltedNormals > 5, "Carved snowbank ridges must have recomputed tilted vertex normals");

  // Switch to aurora_sled: verify banking roll & lateral glide drift
  world.rebuildRig("aurora_sled", []);
  world.rigState.x = -16;
  world.rigState.z = 8;
  world.rigState.speed = 0;
  world.setDriveInputs(1.0, 1.0, false);
  for (let i = 0; i < 35; i++) world.step(1 / 30);
  assert.ok(world.rigState.roll < -0.1, `Aurora sled must bank into turn, got roll=${world.rigState.roll}`);
  assert.ok(Math.abs(world.rigState.lateralSlip) > dozerSlip * 0.5);

  // Rolling 60fps DPR Governor step-down & recovery
  world.maxDpr = 2.0;
  world.currentDpr = 2.0;
  for (let i = 0; i < 45; i++) world._recordFrameSample(0.028); // ~35.7 fps
  assert.equal(world.currentDpr, 1.75);
  world._dprCooldown = 0;
  for (let i = 0; i < 45; i++) world._recordFrameSample(0.015); // ~66.7 fps
  assert.equal(world.currentDpr, 1.9);
});

test("F06/F09/F13: All 33 Curriculum Nodes (W0.1–W7.4) Build Dedicated 3D Set-Pieces & Quadrant Sky-Whale Beacons", () => {
  const rng = makeSeededRng(303);
  const { world, mysteries } = createHeadlessWorld();

  for (const nodeId of Object.keys(NODE_MAP)) {
    const enc = generateEncounter(nodeId, { rng });
    world.populateEncounters([enc]);
    const slot = world.gateSlots[0];
    assert.ok(slot.group instanceof THREE.Group, `Failed 3D build for ${nodeId}`);
    assert.ok(slot.caliperMesh, `Every gate must attach a universal delta-Y caliper (${nodeId})`);
  }

  // W0.4 / W2.1 seq_linear visual Base Stones + Frame Crystal Rows
  const seqEnc = {
    ...generateEncounter("W2.1", { rng }),
    patternMeta: {
      baseCount: 3,
      stepGrowth: 4,
      targetStep: 10,
      frames: [
        { step: 1, base: 3, groups: 1, perGroup: 4, total: 7 },
        { step: 2, base: 3, groups: 2, perGroup: 4, total: 11 },
        { step: 3, base: 3, groups: 3, perGroup: 4, total: 15 },
      ],
      ruleVisual: "Base + Frame × Group",
    },
  };
  world.populateEncounters([seqEnc]);
  const seqSlot = world.gateSlots[0];
  assert.equal(seqSlot.cascadePedestals.length, 4);
  const ped2 = seqSlot.cascadePedestals[1]; // Frame 2 -> 3 base stones + 2 rows of 4 crystals
  const baseStones = ped2.children.filter((c) => c.userData?.partType === "base_stone");
  const growthRows = ped2.children.filter((c) => c.userData?.partType === "growth_row");
  assert.equal(baseStones.length, 3);
  assert.equal(growthRows.length, 2);
  assert.equal(growthRows[0].children.length, 4);

  // W2.2 Distributive Array unpack
  let distEnc = generateEncounter("W2.2", { rng });
  const expectedRows = Math.abs(distEnc.towers.leftA);
  world.populateEncounters([distEnc]);
  assert.equal(world.gateSlots[0].distributiveRows.length, expectedRows);
  assert.equal(world.gateSlots[0].isUnpacked, false);
  const unpackedRes = applyBeamAction(distEnc, "unpack_array", { misconceptionTags: {} });
  world.refreshActiveEncounterVisual(unpackedRes.encounter);
  assert.equal(world.gateSlots[0].isUnpacked, true);

  // W2.3, W7.1, W7.2 Mycelium Cascades
  for (const expNode of ["W2.3", "W7.1", "W7.2"]) {
    world.populateEncounters([generateEncounter(expNode, { rng })]);
    assert.equal(world.gateSlots[0].myceliumStages.length, 4, `Expected 4 mycelium stages on ${expNode}`);
  }

  // W4.4 Dual-Rig Crossing + Mega-Geode collision
  let sysEnc = generateEncounter("W4.4", { rng });
  world.populateEncounters([sysEnc]);
  const sysSlot = world.gateSlots[0];
  assert.ok(sysSlot.companionRig && sysSlot.companionBridge && sysSlot.megaGeode);
  assert.equal(sysSlot.extrudedBridge.visible, false);
  assert.equal(sysSlot.companionBridge.visible, false);
  // Preserve both highways across symmetric zap_var step!
  const zapAct = sysEnc.beamActions.find((a) => a.kind === "sym_step");
  if (zapAct) {
    const stepped = applyBeamAction(sysEnc, zapAct.id, { misconceptionTags: {} });
    world.refreshActiveEncounterVisual(stepped.encounter);
    assert.ok(world.gateSlots[0].companionBridge, "System Highway 2 must remain intact after zap step");
  }
  world.playCommitVisual({ outcome: "clear", overdrive: true }, world.gateSlots[0].encounter);
  for (let i = 0; i < 30; i++) world.step(0.05);
  assert.equal(world.gateSlots[0].megaGeode.visible, false, "Dual-Rig collision must shatter Mega-Geode");

  // W5.1 Crystal Truss SSA wind-flop vs SSS/SAS gold lock
  world.populateEncounters([generateEncounter("W5.1", { rng })]);
  const trussSlot = world.gateSlots[0];
  world.step(0.22);
  assert.ok(Math.abs(trussSlot.ssaHingeGroup.rotation.z) > 0.05, "Unpinned SSA hinge must swing in wind");
  world.playCommitVisual({ outcome: "clear", overdrive: false }, trussSlot.encounter);
  assert.equal(trussSlot.trussLocked, true);
  assert.equal(trussSlot.ssaHingeGroup.rotation.z, 0);

  // W5.3 / W5.4 Harpoon Cliff a^2+b^2=c^2 squares + spire winch
  world.populateEncounters([generateEncounter("W5.3", { rng })]);
  const harpSlot = world.gateSlots[0];
  assert.ok(harpSlot.pythagorasSquares.aSquare && harpSlot.pythagorasSquares.bSquare && harpSlot.pythagorasSquares.cSquare);
  assert.equal(harpSlot.harpoonCableMesh.visible, false);
  const startRigY = world.rigState.y;
  world.playCommitVisual({ outcome: "clear", overdrive: true }, harpSlot.encounter);
  assert.equal(harpSlot.harpoonCableMesh.visible, true);
  world.step(0.5);
  assert.ok(world.rigState.y > startRigY + 3.5, "Harpoon winch must lift rig up glacier spire");

  // W6.3 Completing-the-Square Floor Slab Forge
  world.populateEncounters([generateEncounter("W6.3", { rng })]);
  const forgeSlot = world.gateSlots[0];
  assert.equal(forgeSlot.squareForge.cornerPlugMesh.visible, false);
  world.playCommitVisual({ outcome: "clear", overdrive: true }, forgeSlot.encounter);
  assert.equal(forgeSlot.squareForge.cornerPlugMesh.visible, true);
  assert.equal(forgeSlot.forgeCompleted, true);

  // W7.3 Multi-Crest Harmonic Wave Bridge (>= 3 local Y crests)
  world.populateEncounters([generateEncounter("W7.3", { rng })]);
  const waveSegs = world.gateSlots[0].extrudedBridge.children;
  let crests = 0;
  for (let i = 1; i < waveSegs.length - 1; i++) {
    if (
      waveSegs[i].position.y > waveSegs[i - 1].position.y &&
      waveSegs[i].position.y > waveSegs[i + 1].position.y
    ) {
      crests += 1;
    }
  }
  assert.ok(crests >= 3, `Expected >=3 harmonic wave crests on W7.3, got ${crests}`);

  // W7.4 90-Degree Quarter-Turn i-Portal Ring (proving i^2 = -1 -> 180 deg)
  const w74Enc = {
    uid: "W7.4-test",
    nodeId: "W7.4",
    worldId: "W7",
    kind: "complex_i_rotation",
    encounterType: "astrolabe_shrine",
    answer: -4,
    startDial: 4,
    portalMeta: {
      startReal: 4,
      quarterTurns: 2,
      angleDeg: 180,
      endReal: -4,
      endImag: 0,
      iPower: 2,
      isRealTarget: true,
    },
  };
  world.populateEncounters([w74Enc]);
  const iSlot = world.gateSlots[0];
  assert.equal(iSlot.iPortalRings.length, 2);
  world.playCommitVisual({ outcome: "clear", overdrive: true }, w74Enc);
  assert.ok(Math.abs(iSlot.iRotatedBeamGroup.rotation.z - Math.PI) < 1e-6, "2 quarter-turns (i^2) must rotate beam 180 deg");

  // Quadrant (±34, ±34) Sky-Whale Beacons
  world.rigAnim = null;
  for (const b of world.quadrantBeacons) {
    world.rigState.x = b.x;
    world.rigState.z = b.z;
    world.step(0.05);
    assert.equal(b.lit, true);
  }
  assert.ok(mysteries.includes("aurora_whale"));
  assert.ok(world.whaleTimer > 0);
});

test("F13: Strict <=15% Anti-Scrub Stub, W4.3 solveForB Pad Lift, Universal Delta-Y Miss Caliper, W1.2 Sign Sky-Pillar & W3.1 Repel Bounce", () => {
  const rng = makeSeededRng(404);
  const { world } = createHeadlessWorld();

  // 1. <= 15% Anti-Scrub across all curve/ramp nodes
  for (const nodeId of ["W0.6", "W4.1", "W4.2", "W4.3", "W4.4", "W6.1", "W6.2", "W7.3"]) {
    const enc = generateEncounter(nodeId, { rng });
    world.populateEncounters([enc]);
    const slot = world.gateSlots[0];
    for (const v of [-8, -3, -1, 0, 1, 2, 4, 7, enc.answer]) {
      world.updateDialPreview(v);
      assert.equal(slot.extrudedBridge.visible, false, `Anti-scrub violated pre-commit on ${nodeId}`);
    }
    const stubBox = new THREE.Box3().setFromObject(slot.tangentStub);
    const stubSpanZ = stubBox.max.z - stubBox.min.z;
    assert.ok(
      stubSpanZ <= CHASM_SPAN_M * 0.15 + 0.05,
      `Origin stub Z span ${stubSpanZ} exceeds 15% of ${CHASM_SPAN_M}m on ${nodeId}`
    );
  }

  // 2. W4.3 solveForB vertical pad lift with fixed slope m
  const w43 = generateEncounter("W4.3", { rng });
  world.populateEncounters([w43]);
  const slot43 = world.gateSlots[0];
  const fixedStubPitch = slot43.tangentStub.rotation.x;
  world.updateDialPreview(-2);
  const lowPadY = slot43.launchPadGroup.position.y;
  world.updateDialPreview(5);
  const highPadY = slot43.launchPadGroup.position.y;
  assert.ok(highPadY > lowPadY + 0.5, "W4.3 solveForB must lift launchPadGroup vertically");
  assert.equal(slot43.tangentStub.rotation.x, fixedStubPitch, "W4.3 slope m must stay fixed while dialing b");

  // 3. Universal Delta-Y Caliper + Dialed Curve on Nudge (and hidden on subsequent dial scrub!)
  const w42 = generateEncounter("W4.2", { rng });
  world.populateEncounters([w42]);
  const slot42 = world.gateSlots[0];
  world.playCommitVisual({ outcome: "nudge", delta: 3 }, w42);
  assert.equal(slot42.extrudedBridge.visible, false, "True bridge must remain hidden on nudge");
  assert.equal(slot42.dialedCurveMesh.visible, true, "Dialed trajectory must extrude on nudge");
  assert.equal(slot42.caliperMesh.visible, true, "Delta-Y caliper must appear on nudge");
  assert.ok(slot42.caliperSpan > 0);
  world.updateDialPreview(w42.answer);
  assert.equal(slot42.dialedCurveMesh.visible, false, "Post-miss dial scrub must immediately hide dialedCurveMesh");

  // 4. W1.2 Sub-Zero Opposite-Sign Sky-Pillar (+200 dialed when answer is -200)
  const w12 = { ...generateEncounter("W1.2", { rng }), answer: -200 };
  world.populateEncounters([w12]);
  const baseRigY = world._baseHeight(world.rigState.x, world.rigState.z);
  world.playCommitVisual({ outcome: "nudge", committedValue: 200, delta: 400 }, w12);
  assert.equal(world.signPillarMesh.visible, true, "Opposite-sign miss must erect golden sky-pillar");
  world.step(0.65);
  assert.ok(world.rigState.y > baseRigY + 6.0, "Rig must lift onto high sign-flip ice pillar");

  // 5. W3.1 Camouflaged Gate repel_trap physical cube/core slide, spark & bounce-apart
  const w31 = generateEncounter("W3.1", { rng, camouflage: true });
  world.populateEncounters([w31]);
  const slot31 = world.gateSlots[0];
  const rightTower = slot31.towerClusters.find((c) => c.hasBoth);
  const restSep = Math.abs(rightTower.baseConstX - rightTower.baseVarX);
  world.playTwinBeamVisual(true);

  world.step(0.15);
  const sepSlide = Math.abs(
    rightTower.constClusterGroup.position.x - rightTower.varClusterGroup.position.x
  );
  assert.ok(sepSlide < restSep * 0.75, "Cubes and cores must slide inward at t=0.15s");

  world.step(0.2); // t = 0.35s
  const sepBounce = Math.abs(
    rightTower.constClusterGroup.position.x - rightTower.varClusterGroup.position.x
  );
  assert.equal(rightTower.sparkMesh.visible, true, "Amber spark must flash during magnetic bounce");
  assert.ok(sepBounce > restSep * 1.2, "Cubes and cores must bounce apart wider at t=0.35s");

  world.step(0.45); // t = 0.80s
  const sepSettle = Math.abs(
    rightTower.constClusterGroup.position.x - rightTower.varClusterGroup.position.x
  );
  assert.ok(Math.abs(sepSettle - restSep) < 1e-6, "Cubes and cores must settle cleanly to rest");
  assert.equal(rightTower.sparkMesh.visible, false);
});

test("F14: Self-vs-Self 3D Ghost-Rig Recording/Pause/PB Law, Oddroot Cross-Realm Cosmetics & Non-Mutating Sibling Borrow", () => {
  const rng = makeSeededRng(505);
  const { world } = createHeadlessWorld();
  const prog = {
    equippedChassis: "terra_dozer",
    ownedUpgrades: ["wide_blade"],
    games: { frostwake: {} },
  };
  world.applyLoadout(prog);

  // Wave 1 baseline (3.0s driving across open snow, plus 5.0s paused in Encounter Dock which must NOT count!)
  world.rigState.x = -10;
  world.rigState.z = 26;
  world.rigState.heading = -Math.PI / 2; // East in open valley clear of Gate 0 approach zone
  world.populateEncounters([generateEncounter("W0.1", { rng })]);
  world.setDriveInputs(0, 1, false);
  for (let i = 0; i < 30; i++) world.step(0.1);
  world.setEncounterDockOpen(true);
  for (let i = 0; i < 50; i++) world.step(0.1); // Paused!
  world.setEncounterDockOpen(false);
  world.playCommitVisual({ outcome: "clear", overdrive: true }, world.gateSlots[0].encounter);

  assert.equal(world.lastGhostWaveResult.firstBaseline, true);
  assert.equal(world.lastGhostWaveResult.isNewRecord, false);
  assert.equal(world.lastGhostWaveResult.bannerText, null);
  assert.equal(world.ghostController.bestWaveSec, 3.0);
  assert.ok(prog.games.frostwake.ghostFrames.length >= 4);

  // Wave 2 faster run (2.0s < 3.0s) -> visible cyan ghost + "NEW PERSONAL RECORD! 🏆"
  world.rigAnim = null;
  world.rigState.x = -10;
  world.rigState.z = 26;
  world.rigState.heading = -Math.PI / 2;
  world.populateEncounters([generateEncounter("W0.1", { rng })]);
  assert.equal(world.ghostController.mesh.visible, true, "Ghost rig must appear on Wave 2");
  for (let i = 0; i < 20; i++) world.step(0.1);
  world.playCommitVisual({ outcome: "clear", overdrive: true }, world.gateSlots[0].encounter);
  assert.equal(world.lastGhostWaveResult.isNewRecord, true);
  assert.equal(world.lastGhostWaveResult.bannerText, "NEW PERSONAL RECORD! 🏆");
  assert.equal(world.ghostController.bestWaveSec, 2.0);

  // Wave 3 slower run (4.2s > 2.0s) -> ZERO negative delta, bestWaveSec stays 2.0s!
  world.rigAnim = null;
  world.rigState.x = -10;
  world.rigState.z = 26;
  world.rigState.heading = -Math.PI / 2;
  world.populateEncounters([generateEncounter("W0.1", { rng })]);
  for (let i = 0; i < 42; i++) world.step(0.1);
  world.playCommitVisual({ outcome: "clear", overdrive: false }, world.gateSlots[0].encounter);
  assert.equal(world.lastGhostWaveResult.isNewRecord, false);
  assert.equal(world.lastGhostWaveResult.bannerText, null);
  assert.equal(world.ghostController.bestWaveSec, 2.0);

  // Cross-Realm Oddroot visual unlocks + Non-Mutating Sibling Borrow on frozen progress
  const frozenDavidProg = Object.freeze({
    equippedChassis: "terra_dozer",
    ownedUpgrades: Object.freeze(["wide_blade"]),
  });
  const sarahBorrow = {
    owner: "sarah",
    displayName: "Sarah",
    frostwakeRig: { chassisId: "aurora_sled", upgrades: ["titan_harpoon", "ion_boosters"] },
  };
  world.applyLoadout(
    frozenDavidProg,
    {
      astroToadCabMascot: true,
      cryoBuoyancyTrim: true,
      bioluminescentSnowLilies: true,
      goldenMosaicPlowTrim: true,
    },
    sarahBorrow
  );
  assert.equal(world.rigState.chassisId, "aurora_sled");
  assert.ok(world.rigGroup.getObjectByName("titan_harpoon_turret"));
  assert.ok(world.rigGroup.getObjectByName("astro_toad_mascot"));
  assert.ok(world.rigGroup.getObjectByName("cryo_buoyancy_trim"));
  assert.ok(world.rigGroup.getObjectByName("golden_mosaic_trim"));
  assert.ok(world.rigGroup.getObjectByName("sibling_borrow_pennant"));
  assert.equal(frozenDavidProg.equippedChassis, "terra_dozer");
  assert.deepEqual(frozenDavidProg.ownedUpgrades, ["wide_blade"]);

  // Revert borrow cleanly
  world.applyLoadout(frozenDavidProg, {}, null);
  assert.equal(world.rigState.chassisId, "terra_dozer");
  assert.equal(world.rigGroup.getObjectByName("sibling_borrow_pennant"), undefined);
});

test("F21: Live 2-Player 3D Co-Op Partner Rigs, 60fps Lerp, Thinking/Surge Auras, Non-Stealable Gate Sky-Beams, Flares & Shared Star-Coins", () => {
  const rng = makeSeededRng(606);
  const { world, coinsGrabbed } = createHeadlessWorld();
  world.populateEncounters([
    generateEncounter("W1.1", { rng }),
    generateEncounter("W1.2", { rng }),
    generateEncounter("W1.3", { rng }),
  ]);

  // 1. Local multiplayer pose contract
  const pose = world.getLocalMultiplayerPose();
  assert.equal(pose.chassisOrMount, "terra_dozer");
  assert.ok(Number.isFinite(pose.x) && Number.isFinite(pose.z) && Number.isFinite(pose.heading));

  // 2. Remote partner spawn + headless Sprite badge + "thinking" Cyan Holo-Ring
  world.syncRemotePartners([
    {
      userId: "sarah",
      displayName: "Sarah",
      avatar: "🦊",
      x: 6,
      z: 12,
      heading: Math.PI,
      speed: 14,
      chassisOrMount: "aurora_sled",
      upgrades: ["wide_blade", "titan_harpoon"],
      status: "thinking",
    },
  ]);
  assert.equal(world.remotePartners.size, 1);
  const sarahRec = world.remotePartners.get("sarah");
  assert.equal(sarahRec.chassisId, "aurora_sled");
  assert.ok(sarahRec.nameSprite instanceof THREE.Sprite);
  assert.equal(sarahRec.thinkingHalo.visible, true);
  assert.equal(sarahRec.surgeComet.visible, false);

  // 3. 60fps smooth position + shortest-angle heading lerp + "surge" Golden Comet Aura
  world.syncRemotePartners([
    {
      userId: "sarah",
      displayName: "Sarah",
      avatar: "🦊",
      x: 18,
      z: -4,
      heading: -Math.PI + 0.4,
      speed: 19,
      chassisOrMount: "aurora_sled",
      upgrades: ["wide_blade", "titan_harpoon"],
      status: "surge",
    },
  ]);
  world.step(1 / 60);
  assert.ok(sarahRec.x > 6 && sarahRec.x < 18, `Expected smooth 60fps X lerp, got ${sarahRec.x}`);
  assert.ok(sarahRec.z < 12 && sarahRec.z > -4, `Expected smooth 60fps Z lerp, got ${sarahRec.z}`);
  assert.equal(sarahRec.thinkingHalo.visible, false);
  assert.equal(sarahRec.surgeComet.visible, true);

  // 4. Partner gate_burst spawns Aurora Sky-Beam + Resonance Pulse WITHOUT stealing local gates!
  const burstFx = world.playPartnerCoopEvent({
    type: "gate_burst",
    userId: "sarah",
    overdrive: true,
    x: 0,
    y: 1,
    z: -11,
  });
  assert.ok(burstFx && burstFx.skyBeam && burstFx.pulseRing);
  assert.ok(
    world.gateSlots.every((s) => s.cleared === false),
    "Partner gate_burst must NEVER steal or clear local player gates!"
  );

  // 5. Friendly Flare & Local Flare spawn 3D Starlight Heart/Star Fireworks
  const partnerFlare = world.playPartnerCoopEvent({ type: "friendly_flare", userId: "sarah" });
  const localFlare = world.playLocalFlare();
  assert.equal(partnerFlare.kind, "flare_firework");
  assert.equal(localFlare.kind, "flare_firework");
  world.step(0.1);

  // 6. Shared Loose Star-Coins (coin_0..coin_3): <=2.8m local pickup, syncSharedCoins & partner coin_grab
  assert.equal(world.sharedCoins.size, 4);
  const coin0 = world.sharedCoins.get("coin_0");
  assert.equal(coin0.group.visible, true);

  // Plow local rig within <= 2.8m of coin_0 (-13, 10)
  world.rigState.x = coin0.x + 1.5;
  world.rigState.z = coin0.z;
  world.step(1 / 60);
  assert.deepEqual(coinsGrabbed, ["coin_0"]);
  assert.equal(coin0.group.visible, false, "Grabbed Star-Coin must hide during cooldown");

  // Authoritative syncSharedCoins hides coin_0 & coin_1, then respawns coin_0 after 6s
  world.rigState.x = 0;
  world.rigState.z = 22;
  world.syncSharedCoins({
    coin_0: { coinId: "coin_0", available: false },
    coin_1: { coinId: "coin_1", available: false },
    coin_2: { coinId: "coin_2", available: true },
    coin_3: { coinId: "coin_3", available: true },
  });
  assert.equal(world.sharedCoins.get("coin_1").group.visible, false);
  world.syncSharedCoins({
    coin_0: { coinId: "coin_0", available: true },
    coin_1: { coinId: "coin_1", available: true },
  });
  assert.equal(coin0.group.visible, true, "Respawned Star-Coin must pop back into view");

  // Partner coin_grab pops coin_2 on both screens
  world.playPartnerCoopEvent({ type: "coin_grab", coinId: "coin_2" });
  assert.equal(world.sharedCoins.get("coin_2").group.visible, false);

  // Disconnecting partner cleans up scene graph
  world.syncRemotePartners([]);
  assert.equal(world.remotePartners.size, 0);
});

test("Fuzz & Hostile-Input Hardening Regression Suite: ±Infinity/NaN dial, O(1) 1e12 angle wrap, 1e200 peer coords, null ctor/commit, W7.4 string iPower, 25-wave wokenFoxes cleanup & cleared hysteresis", () => {
  const rng = makeSeededRng(707);

  function assertFiniteSceneGraph(root, label, checkVertices = false) {
    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      const { position: p, rotation: r, scale: s } = obj;
      assert.ok(
        Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
        `Non-finite position on ${obj.name || obj.type} (${label}): [${p.x}, ${p.y}, ${p.z}]`
      );
      assert.ok(
        Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.z),
        `Non-finite rotation on ${obj.name || obj.type} (${label}): [${r.x}, ${r.y}, ${r.z}]`
      );
      assert.ok(
        Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z),
        `Non-finite scale on ${obj.name || obj.type} (${label}): [${s.x}, ${s.y}, ${s.z}]`
      );
      const els = obj.matrixWorld.elements;
      for (let i = 0; i < els.length; i++) {
        assert.ok(
          Number.isFinite(els[i]),
          `Non-finite matrixWorld[${i}]=${els[i]} on ${obj.name || obj.type} (${label})`
        );
      }
      if (checkVertices && obj.geometry?.attributes?.position) {
        const arr = obj.geometry.attributes.position.array;
        for (let i = 0; i < arr.length; i++) {
          assert.ok(
            Number.isFinite(arr[i]),
            `Non-finite vertex[${i}]=${arr[i]} on ${obj.name || obj.type} (${label})`
          );
        }
      }
    });
  }

  // 1. [HIGH-1] FUZZ-DIAL-INF-NAN: updateDialPreview(±Infinity, NaN, ±1e308, hostile object) across all 33 nodes
  {
    const { world } = createHeadlessWorld();
    for (const nodeId of Object.keys(NODE_MAP)) {
      const enc = generateEncounter(nodeId, { rng });
      world.populateEncounters([enc]);

      for (const hostileVal of [
        Infinity,
        -Infinity,
        NaN,
        1e308,
        -1e308,
        { toString: 1, valueOf: 1 },
      ]) {
        world.updateDialPreview(hostileVal);
        assert.ok(
          Number.isFinite(world.dialPreviewValue) &&
            world.dialPreviewValue >= -10000 &&
            world.dialPreviewValue <= 10000,
          `dialPreviewValue out of [-10000, 10000] for ${String(nodeId)}: ${world.dialPreviewValue}`
        );
      }
      world.step(1 / 60);
      assertFiniteSceneGraph(world.scene, `${nodeId} +Infinity/-Infinity dial`);

      world.updateDialPreview(-Infinity);
      world.playCommitVisual({ outcome: "nudge", committedValue: Infinity, delta: -Infinity }, enc);
      world.step(1 / 60);
      assertFiniteSceneGraph(world.scene, `${nodeId} -Infinity nudge`);
    }
  }

  // 2. [HIGH-2] FUZZ-ANGLE-HANG: heading = ±1e12 / ±1e308 O(1) wrap < 20ms across Co-Op, Ghost-Rig & Autopilot
  {
    const { world } = createHeadlessWorld();
    world.applyLoadout({
      equippedChassis: "terra_dozer",
      ownedUpgrades: [],
      games: {
        frostwake: {
          bestWaveSec: 2.0,
          ghostFrames: [
            { t: 0, x: 1e200, z: -1e200, heading: 1e12 },
            { t: 2.0, x: 0, z: 0, heading: -1e12 },
          ],
        },
      },
    });
    world.populateEncounters([generateEncounter("W0.1", { rng })]);

    const t0 = performance.now();
    world.syncRemotePartners([{ userId: "p1", x: 0, z: 0, heading: 1e12 }]);
    world.syncRemotePartners([{ userId: "p1", x: 0, z: 0, heading: 0 }]);
    world.syncRemotePartners([{ userId: "p1", x: 0, z: 0, heading: -1e308 }]);
    world.syncRemotePartners([{ userId: "p1", x: 0, z: 0, heading: 1e308 }]);
    world.rigState.heading = 1e12;
    world.engageAutopilotToNextGate();
    world.step(1 / 60);
    world.step(0.1);
    const elapsedMs = performance.now() - t0;

    assert.ok(
      elapsedMs < 20,
      `Expected O(1) angle normalization < 20ms for heading=1e12, took ${elapsedMs.toFixed(2)}ms`
    );
    const p1 = world.remotePartners.get("p1");
    assert.ok(p1 && Math.abs(p1.heading) <= Math.PI + 1e-9);
    assertFiniteSceneGraph(world.scene, "heading 1e12 O(1) wrap");
  }

  // 3. [MEDIUM-1] FUZZ-PEER-EXTREME-COORDS + Malformed WebSocket Payloads & Prototype-Safe Coins
  {
    const { world } = createHeadlessWorld();
    world.syncRemotePartners([
      { userId: "evil_pos", x: 1e200, y: 1e200, z: 1e200, heading: 0, speed: 1e100 },
      { userId: "evil_neg", x: -1e200, y: -Infinity, z: -1e200, heading: Infinity, speed: NaN },
    ]);
    const evilPos = world.remotePartners.get("evil_pos");
    evilPos.targetX = 1e200;
    evilPos.y = Infinity;

    world.playPartnerCoopEvent({
      type: "gate_burst",
      userId: "evil_pos",
      x: 1e200,
      y: 1e200,
      z: -1e200,
      overdrive: true,
    });
    world.playPartnerCoopEvent({
      type: "friendly_flare",
      userId: "evil_neg",
      x: Infinity,
      y: NaN,
      z: -Infinity,
    });
    world.coop.playLocalFlare(null);
    world.coop.update(Infinity, null);
    world.step(1 / 60);

    for (const id of ["evil_pos", "evil_neg"]) {
      const rec = world.remotePartners.get(id);
      assert.ok(rec, `Missing partner record ${id}`);
      assert.ok(Number.isFinite(rec.x) && Math.abs(rec.x) <= 120, `Partner x not clamped: ${rec.x}`);
      assert.ok(Number.isFinite(rec.z) && Math.abs(rec.z) <= 120, `Partner z not clamped: ${rec.z}`);
      assert.ok(Number.isFinite(rec.y) && rec.y >= -20 && rec.y <= 80, `Partner y invalid: ${rec.y}`);
      assert.ok(Number.isFinite(rec.speed) && Math.abs(rec.speed) <= 60, `Partner speed invalid: ${rec.speed}`);
    }
    assertFiniteSceneGraph(world.scene, "remote partner 1e200 coords");

    // Malformed entries, hostile JSON objects, surrogate-safe long badges & prototype-safe coins
    world.syncRemotePartners([
      null,
      undefined,
      42,
      "str",
      [],
      { userId: { toString: 1, valueOf: 1 } },
      { userId: "__proto__", upgrades: "not_an_array", displayName: "🦊".repeat(50000) },
      { userId: "constructor", upgrades: [null, { toString: 1, valueOf: 1 }, "wide_blade"] },
    ]);
    assert.equal(({}).polluted, undefined);
    const protoPeer = world.remotePartners.get("__proto__");
    const ctorPeer = world.remotePartners.get("constructor");
    assert.ok(protoPeer && Array.from(protoPeer.badgeLabel).length <= 18);
    assert.ok(
      !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
        protoPeer.badgeLabel
      ),
      "badgeLabel must not contain lone UTF-16 surrogates"
    );
    assert.deepEqual(ctorPeer.upgrades, ["wide_blade"]);

    const coin0 = world.sharedCoins.get("coin_0");
    assert.equal(coin0.available, true);
    world.syncSharedCoins(Object.create({ coin_0: { available: false } }));
    assert.equal(coin0.available, true, "Inherited prototype keys must not mutate shared coins");
    const nullProtoCoins = Object.assign(Object.create(null), { coin_0: { available: false } });
    world.syncSharedCoins(nullProtoCoins);
    assert.equal(coin0.available, false, "Null-prototype coin map should update own keys cleanly");
    world.syncSharedCoins({ coin_1: [] });
    assert.equal(world.sharedCoins.get("coin_1").available, true);
  }

  // 4. [MEDIUM-2] FUZZ-CTOR-NULL, FUZZ-COMMIT-NULL & Boundary Method Guards
  {
    const wNull = new FrostwakeWorld3D(null);
    assert.ok(wNull.scene instanceof THREE.Scene);
    wNull.populateEncounters([generateEncounter("W1.1", { rng })]);
    wNull.playCommitVisual(null);
    wNull.playCommitVisual(null, null);
    wNull.playCommitVisual(undefined);
    wNull.setDriveInputs(NaN, Infinity, null);
    assert.equal(wNull.rigState.steerInput, 0);
    assert.equal(wNull.rigState.throttleInput, 0);
    wNull.setObservatoryTier(Infinity);
    assert.equal(wNull.rigState.observatoryTier, 0);
    const simBefore = wNull.simElapsed;
    wNull.step(Infinity);
    wNull.step(NaN);
    assert.equal(wNull.simElapsed, simBefore);
    wNull.audio.tone(Infinity, Infinity, "sine", Infinity, Infinity, Infinity);
    wNull.audio.playDetentClick(Infinity);
    wNull.step(1 / 60);
    assertFiniteSceneGraph(wNull.scene, "null constructor & playCommitVisual(null)");
  }

  // 5. [MEDIUM-3] FUZZ-W74-IPOWER-NAN + Malformed Encounter Metadata Builder Fuzz
  {
    const { world } = createHeadlessWorld();
    const w74Cases = [
      { portalMeta: { startReal: 4, iPower: "i" }, turns: 1 },
      { portalMeta: { startReal: 4, iPower: "i¹" }, turns: 1 },
      { portalMeta: { startReal: 4, iPower: "i²" }, turns: 2 },
      { portalMeta: { startReal: -5, quarterTurns: NaN, iPower: "i³" }, turns: 3 },
      { portalMeta: { startReal: 6, quarterTurns: Infinity, iPower: "i⁴" }, turns: 4 },
    ];
    for (const c of w74Cases) {
      world.populateEncounters([
        {
          uid: `w74-${c.portalMeta.iPower}`,
          nodeId: "W7.4",
          kind: "complex_i_rotation",
          answer: -4,
          portalMeta: c.portalMeta,
        },
      ]);
      const slot = world.gateSlots[0];
      assert.equal(
        slot.iPortalRings.length,
        c.turns,
        `Expected ${c.turns} sub-rings for ${c.portalMeta.iPower}`
      );
      world.playCommitVisual({ outcome: "clear" });
      world.step(1 / 60);
      assert.ok(
        Math.abs(slot.iRotatedBeamGroup.rotation.z - (c.turns * Math.PI) / 2) < 1e-6,
        `Expected ${c.turns} quarter-turn rotation for ${c.portalMeta.iPower}`
      );
      assertFiniteSceneGraph(world.scene, `W7.4 iPower=${c.portalMeta.iPower}`, true);
    }

    const hostileEncounters = [
      { nodeId: "W1.1", answer: Infinity, towers: { leftA: "bad", leftB: NaN, rightA: Infinity, rightB: -Infinity } },
      { nodeId: "W2.1", kind: "seq_linear", patternMeta: { baseCount: "bad", stepGrowth: NaN, targetStep: Infinity } },
      { nodeId: "W2.2", kind: "expr_distribute", towers: { leftA: Infinity, leftB: Infinity }, stepsUsed: NaN },
      { nodeId: "W2.3", kind: "exp_power", growthMeta: { a0: Infinity, ratio: "bad" } },
      { nodeId: "W3.4", kind: "geo_scale_area", startDial: Infinity, answer: Infinity },
      { nodeId: "W4.4", kind: "sys_intersection", rampMeta: { isSystem: true, m: Infinity, b: NaN, m2: "bad", targetX: Infinity } },
      { nodeId: "W5.1", kind: "geo_triangle_truss", astrolabeMeta: { mode: "truss", a1: Infinity, a2: "bad" } },
      { nodeId: "W5.3", kind: "geo_pythagoras", harpoonMeta: { legA: Infinity, legB: "bad", hyp: "bad" } },
      { nodeId: "W6.1", kind: "arch_vertex_eval", archMeta: { k: "bad" }, answer: NaN },
      { nodeId: "W6.3", kind: "quad_complete_sq", towers: { leftB: "bad" }, startDial: NaN },
    ];
    for (const hEnc of hostileEncounters) {
      world.populateEncounters([hEnc]);
      world.updateDialPreview(Infinity);
      world.playCommitVisual({ outcome: "nudge" }, hEnc);
      world.step(1 / 60);
      assertFiniteSceneGraph(world.gateSlots[0].group, `hostile ${hEnc.nodeId}`, true);
    }
  }

  // 6. [LOW-1] SCENE-WOKEN-FOX-ACCUM (25 waves / 75 clears) & PAUSE-CLEARED-HYSTERESIS
  {
    const { world: wWave } = createHeadlessWorld();
    wWave.populateEncounters([generateEncounter("W1.1", { rng })]);
    const baseChildren = wWave.scene.children.length;

    for (let wave = 0; wave < 25; wave++) {
      const encs = [
        generateEncounter("W1.1", { rng }),
        generateEncounter("W2.1", { rng }),
        generateEncounter("W4.2", { rng }),
      ];
      wWave.populateEncounters(encs);
      for (const e of encs) {
        wWave.playCommitVisual({ outcome: "clear", overdrive: true }, e);
      }
      wWave.step(1 / 60);
    }
    wWave.populateEncounters([generateEncounter("W1.1", { rng })]);
    const deltaChildren = wWave.scene.children.length - baseChildren;
    assert.equal(wWave.wokenFoxes.length, 0, "populateEncounters must reset wokenFoxes on new wave");
    assert.equal(deltaChildren, 0, `Expected 0 scene child leak across 25 waves, got ${deltaChildren}`);
    assertFiniteSceneGraph(wWave.scene, "25-wave wokenFoxes cleanup");

    // Cleared gate hysteresis release inside 9.2m..12.0m band of another uncleared gate
    const { world: wHyst } = createHeadlessWorld();
    wHyst.populateEncounters([
      generateEncounter("W5.3", { rng }),
      generateEncounter("W1.2", { rng }),
      generateEncounter("W1.3", { rng }),
      generateEncounter("W1.4", { rng }),
    ]);
    wHyst.rigState.x = 0;
    wHyst.rigState.z = -5;
    wHyst.step(1 / 60);
    assert.equal(wHyst.activeGateSlot, wHyst.gateSlots[0]);

    // Mark Gate 0 cleared and place rig at z = -19.5 (10.5m from Gate 3 approach pad at (0, -30))
    wHyst.gateSlots[0].cleared = true;
    wHyst.rigAnim = null;
    wHyst.rigState.x = 0;
    wHyst.rigState.z = -19.5;
    wHyst.step(1 / 60);
    assert.equal(
      wHyst.activeGateSlot,
      null,
      "Cleared activeGateSlot must release immediately even inside 9.2m..12.0m hysteresis band"
    );
    assert.equal(wHyst.isOppositionPaused(), false);
  }
});

test("Outer Frontier Biomes & 3-Way Cross-Realm Clockwork Crest: Thermal Caldera Geysers, Singing Crystal Chimes, Sequential Causeway Pylons & frostwake_clockwork_crest", () => {
  const { world, events } = createHeadlessWorld();

  const outerGroup = world.scene.getObjectByName("FrostwakeOuterBiomes");
  assert.ok(outerGroup, "FrostwakeOuterBiomes group must exist in scene");
  assert.ok(world.calderaGeyserVents.length >= 3);
  assert.ok(world.singingCrystalChimes.length >= 3);
  assert.equal(world.causewayPylons.length, 8);

  // 1. Biome resolution across valley & outer frontier
  world.rigState.x = 0;
  world.rigState.z = 0;
  assert.equal(world.getActiveBiome().id, "central_glacier");

  world.rigState.x = -44;
  world.rigState.z = 22;
  assert.equal(world.getActiveBiome().id, "caldera_springs");
  assert.equal(world.getActiveBiome().insideRadius, true);

  // 2. Thermal Geyser Caldera (-44, 22): gentle upward hop + speed boost + cooldown-guarded +3💎
  world.rigState.speed = 2.0;
  const baseCalderaY = world._baseHeight(-44, 22) + 0.14;
  world.step(1 / 60);
  const geyserEvts = events.filter((e) => e.type === "caldera_geyser");
  assert.equal(geyserEvts.length, 1, "Driving onto active caldera geyser must emit 1 event");
  assert.equal(geyserEvts[0].shardsEarned, 3);
  assert.ok(world.rigState.speed >= 13.8, "Caldera geyser must gently boost rig speed");
  assert.ok(world.rigState.y > baseCalderaY + 0.3, "Caldera geyser must gently hop the rig upward");

  // Cooldown guard prevents spam on subsequent frames at same vent
  world.rigState.x = -44;
  world.rigState.z = 22;
  world.step(0.05);
  assert.equal(
    events.filter((e) => e.type === "caldera_geyser").length,
    1,
    "Caldera geyser vent must respect cooldown"
  );

  // 3. Prism Ice-Crystal Ridge (45, -10): Singing Crystal Chimes pulse gold & chime harmonically
  world.rigState.x = 45;
  world.rigState.z = -10;
  assert.equal(world.getActiveBiome().id, "prism_cavern");
  world.step(0.05);
  const midChime = world.singingCrystalChimes[1];
  assert.equal(midChime.pulsingGold, true);
  assert.equal(midChime.chimeMat.color.getHex(), 0xffd166);
  assert.equal(midChime.chimeCount, 1);

  // 4. Northern Observatory Causeway: sequential starlight beacon pylons toward (0, -56)
  world.rigState.x = 0;
  world.rigState.z = -31; // within 9.5m of z=-38 stage 0, before z=-44 stage 1
  world.step(0.05);
  const litAt31 = world.causewayPylons.filter((p) => p.lit).map((p) => p.stageIndex);
  assert.deepEqual(litAt31, [0, 0]);

  world.rigState.z = -43; // lights stages 0, 1, 2 (z = -38, -44, -50)
  world.step(0.05);
  const litAt43 = world.causewayPylons.filter((p) => p.lit).map((p) => p.stageIndex);
  assert.deepEqual(litAt43, [0, 0, 1, 1, 2, 2]);

  world.rigState.z = -56;
  assert.equal(world.getActiveBiome().id, "aurora_causeway");
  world.step(0.05);
  assert.equal(world.causewayPylons.every((p) => p.lit), true);

  // 5. 3-Way Cross-Realm Ornament: Brass Clockwork Gear-Crest (frostwake_clockwork_crest)
  assert.equal(world.rigGroup.getObjectByName("frostwake_clockwork_crest") || null, null);
  world.applyLoadout({ equippedChassis: "terra_dozer" }, { clockworkCrestUnlocked: true });
  const dozerCrest = world.rigGroup.getObjectByName("frostwake_clockwork_crest");
  assert.ok(dozerCrest, "frostwake_clockwork_crest must mount on Terra-Rig when unlocked");
  const prevOuterRot = world.clockworkCrestOuter.rotation.z;
  const prevInnerRot = world.clockworkCrestInner.rotation.z;
  world.step(0.05);
  assert.notEqual(world.clockworkCrestOuter.rotation.z, prevOuterRot);
  assert.notEqual(world.clockworkCrestInner.rotation.z, prevInnerRot);

  world.applyLoadout({ equippedChassis: "aurora_sled" }, { clockworkCrestUnlocked: true });
  assert.ok(
    world.rigGroup.getObjectByName("frostwake_clockwork_crest"),
    "frostwake_clockwork_crest must also mount on Aurora Hover-Sled"
  );

  world.applyLoadout({ equippedChassis: "aurora_sled" }, { clockworkCrestUnlocked: false });
  assert.equal(world.rigGroup.getObjectByName("frostwake_clockwork_crest") || null, null);
});

test("3D Field Expeditions & Roblox Simulation Snapshot Parity: FrostwakeExpeditionBeacons, guardrails, single-counted rewards & getRobloxSimSnapshot()", () => {
  const { world, events, activities } = createHeadlessWorld();
  const prog = { games: { frostwake: { expeditionsCompleted: 0 } } };
  world.applyLoadout(prog);

  const beaconGroup = world.scene.getObjectByName("FrostwakeExpeditionBeacons");
  assert.ok(beaconGroup, "FrostwakeExpeditionBeacons group must exist in scene");
  assert.equal(world.expeditionBeacons.length, 3);
  assert.equal(world.expeditionBeacons.every((b) => b.group.visible), true);

  const exp0 = world.getFieldExpeditionState();
  assert.equal(exp0.expeditionId, "fw_caldera_geysers");
  const [wp0, wp1, wp2] = exp0.waypoints;

  // CRITICAL SHARD TIMING GUARDRAILS: must NOT collect when dock open, gate active, rigAnim active, or autopilot active
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.rigState.speed = 0;

  world.setEncounterDockOpen(true);
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0, "Dock open must block expedition pickup");
  world.setEncounterDockOpen(false);

  world.autopilotTarget = { x: 0, z: -5, slot: { rotY: 0 } };
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0, "Autopilot must block expedition pickup");
  world.autopilotTarget = null;

  world.rigAnim = { kind: "recoil_jack", t: 0, dur: 0.5, deltaSign: 1 };
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0, "rigAnim must block expedition pickup");
  world.rigAnim = null;

  const mockSlot = {
    x: wp0.x,
    z: wp0.z - 6.0,
    rotY: 0,
    cleared: false,
    encounter: { uid: "mock_gate" },
  };
  world.gateSlots = [mockSlot];
  world.activeGateSlot = mockSlot;
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0, "activeGateSlot must block expedition pickup");
  world.gateSlots = [];
  world.activeGateSlot = null;

  assert.equal(events.filter((e) => e.type?.startsWith("expedition_")).length, 0);
  assert.equal(activities.length, 0);

  // Pure free-roam pickup of Waypoint 1 & Waypoint 2 (+2💎 each via onOppositionEvent)
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 1);
  assert.equal(world.expeditionBeacons[0].group.visible, false);
  assert.equal(world.expeditionBeacons[1].group.visible, true);

  world.rigState.x = wp1.x;
  world.rigState.z = wp1.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 2);
  assert.equal(world.expeditionBeacons[1].group.visible, false);

  const wpEvents = events.filter((e) => e.type === "expedition_waypoint");
  assert.equal(wpEvents.length, 2);
  assert.equal(wpEvents[0].shardsEarned, 2);
  assert.equal(wpEvents[1].shardsEarned, 2);

  // Pure free-roam pickup of Waypoint 3 -> completes expedition, single-counts +14💎 on onWorldActivity, rotates to next expedition & respawns all 3 beacons!
  world.rigState.x = wp2.x;
  world.rigState.z = wp2.z;
  world.step(1 / 60);

  const expAfter = world.getFieldExpeditionState();
  assert.equal(expAfter.completedTotal, 1);
  assert.equal(expAfter.expeditionId, "fw_prism_chimes");
  assert.equal(expAfter.collectedCount, 0);
  assert.equal(prog.games.frostwake.expeditionsCompleted, 1);
  assert.equal(
    world.expeditionBeacons.every((b) => b.group.visible),
    true,
    "All 3 expedition beacons must respawn visibly at the rotated expedition coordinates"
  );
  assert.equal(world.expeditionBeacons[0].group.position.x, expAfter.waypoints[0].x);

  const expActivities = activities.filter((a) => a.metricKey === "expeditionsCompleted");
  const completeEvts = events.filter((e) => e.type === "expedition_complete");
  assert.equal(expActivities.length, 1);
  assert.equal(expActivities[0].bonusFlux, 14);
  assert.equal(completeEvts.length, 1);
  assert.equal(completeEvts[0].shardsEarned, 0, "Completion shards must not be double-counted");

  // Roblox simulation snapshot parity (3.5 studs/m & mathPaused reflection)
  world.rigState.x = 10;
  world.rigState.z = -20;
  const snapLive = world.getRobloxSimSnapshot();
  assert.equal(snapLive.v, 1);
  assert.equal(snapLive.realmId, "frostwake");
  assert.equal(snapLive.pose.studsX, 35);
  assert.equal(snapLive.pose.studsZ, -70);
  assert.equal(snapLive.mathPaused, false);
  assert.equal(snapLive.expedition.id, "fw_prism_chimes");

  world.setEncounterDockOpen(true);
  const snapPaused = world.getRobloxSimSnapshot();
  assert.equal(snapPaused.mathPaused, true);
  assert.equal(Object.is(world.simTimeState.oppositionDt, 0.0), true);
});



