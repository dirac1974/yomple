import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BANNED_CHILD_WORDS,
  BANNED_CHILD_CURRICULUM_WORDS,
  BASTION_RIGS,
  BASTION_UPGRADES,
  NODE_MAP,
  createInitialProgress,
  generateEncounter,
  getCrossRealmUnlocks,
} from "../core/engine.js";
import {
  BULLET_TIME_SCALE,
  EXPEDITION_CATALOG,
  computeCoordinateSplatter,
} from "../core/world-sim.js";
import { BastionAudio } from "../bastion/audio.js";
import {
  BastionWorld3D,
  GEAR_FOUNDRY_PAD_COORD,
  CANYON_LANE_MARKERS,
  SHARED_COIN_IDS,
} from "../bastion/bastion-3d.js";
import { SHARED_COIN_SPECS } from "../bastion/coop-3d.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOOM_N_DIR = path.resolve(__dirname, "..");

const BASTION_OWNED_CODE_FILES = [
  "bastion/audio.js",
  "bastion/opposition-3d.js",
  "bastion/encounters-3d.js",
  "bastion/coop-3d.js",
  "bastion/ghost-rover.js",
  "bastion/bastion-3d.js",
  "styles-bastion.css",
];

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function createHeadlessBastionWorld(callbacks = {}) {
  const events = {
    activity: [],
    approach: [],
    leave: 0,
    mysteries: [],
    garage: 0,
    opposition: [],
    coins: [],
  };
  const audio = new BastionAudio();
  audio.setMuted(true);

  const world = new BastionWorld3D({
    canvas: null,
    audio,
    onWorldActivity: (amt, bonus, key) => {
      events.activity.push({ amt, bonus, key });
      callbacks.onWorldActivity?.(amt, bonus, key);
    },
    onApproachGate: (enc, slot) => {
      events.approach.push({ enc, slot });
      callbacks.onApproachGate?.(enc, slot);
    },
    onLeaveGate: () => {
      events.leave += 1;
      callbacks.onLeaveGate?.();
    },
    onMysteryFound: (id) => {
      events.mysteries.push(id);
      callbacks.onMysteryFound?.(id);
    },
    onGaragePadEntered: () => {
      events.garage += 1;
      callbacks.onGaragePadEntered?.();
    },
    onOppositionEvent: (ev) => {
      events.opposition.push(ev);
      callbacks.onOppositionEvent?.(ev);
    },
    onSharedCoinGrabbed: (coinId) => {
      events.coins.push(coinId);
      callbacks.onSharedCoinGrabbed?.(coinId);
    },
  });

  return { world, audio, events };
}

test("1. Static hygiene: zero http:// or https:// strings anywhere in bastion/* or styles-bastion.css", () => {
  const httpScheme = "ht" + "tp://";
  const httpsScheme = "ht" + "tps://";
  for (const rel of BASTION_OWNED_CODE_FILES) {
    const full = path.join(BLOOM_N_DIR, rel);
    assert.ok(fs.existsSync(full), `Expected ${rel} to exist`);
    const raw = fs.readFileSync(full, "utf8").toLowerCase();
    assert.equal(raw.includes(httpScheme), false, `Forbidden external URL scheme in ${rel}`);
    assert.equal(raw.includes(httpsScheme), false, `Forbidden external URL scheme in ${rel}`);
  }
});

test("2. Static hygiene: zero #ff0000, countdown, #1/#2 ranks, or banned child/curriculum words", () => {
  const redHex = "#" + "ff0000";
  const countWord = "count" + "down";
  const rank1 = "#" + "1";
  const rank2 = "#" + "2";

  for (const rel of BASTION_OWNED_CODE_FILES) {
    const raw = fs.readFileSync(path.join(BLOOM_N_DIR, rel), "utf8");
    const lower = raw.toLowerCase();
    assert.equal(lower.includes(redHex), false, `Forbidden ${redHex} in ${rel}`);
    assert.equal(lower.includes(countWord), false, `Forbidden ${countWord} in ${rel}`);
    assert.equal(lower.includes(rank1), false, `Forbidden rank marker ${rank1} in ${rel}`);
    assert.equal(lower.includes(rank2), false, `Forbidden rank marker ${rank2} in ${rel}`);

    const codeOnly = stripComments(lower);
    // Extract string literals from JS files for child-facing copy verification
    const literals =
      rel.endsWith(".js")
        ? (codeOnly.match(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g) || []).join(" ")
        : codeOnly;

    for (const word of BANNED_CHILD_WORDS) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      assert.equal(re.test(literals), false, `Banned child word "${word}" in ${rel}`);
    }
    for (const word of BANNED_CHILD_CURRICULUM_WORDS) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      assert.equal(re.test(literals), false, `Banned curriculum word "${word}" in ${rel}`);
    }
  }
});

test("3. styles-bastion.css scopes #screen-bastion HUD pills, 0.08x Bullet-Time button, mobile dock & reduced-motion", () => {
  const css = fs.readFileSync(path.join(BLOOM_N_DIR, "styles-bastion.css"), "utf8");
  for (const selector of [
    "#screen-bastion",
    '[data-realm="arc_bastion"]',
    "#bastion-canvas",
    "#ab-shard-pill",
    "#ab-boost-pill",
    "#ab-wonder-chip",
    "#ab-partner-pill",
    "#ab-bullettime-btn",
    "#ab-rig-btn",
    "#ab-flare-btn",
    "#screen-bastion.dock-open .drive-cluster",
    "prefers-reduced-motion: reduce",
  ]) {
    assert.ok(css.includes(selector), `Expected styles-bastion.css to style ${selector}`);
  }
});

test("4. BastionAudio implements full RealmAudioAdapter contract safely in headless Node & mock WebAudio", () => {
  const audio = new BastionAudio();
  const requiredMethods = [
    "setMuted",
    "unlock",
    "stopHum",
    "updateRigHum",
    "playDetentClick",
    "playBeamSlice",
    "playTwinBeam",
    "playMagneticRepel",
    "playClear",
    "playGentleMiss",
    "playCaliperNudge",
    "playFoxReveal",
    "playSnowShardTick",
    "playSlipstreamBoost",
    "playRelicChime",
    "playBulletTimeChime",
    "playGearBurst",
  ];
  for (const fn of requiredMethods) {
    assert.equal(typeof audio[fn], "function", `Missing BastionAudio.${fn}`);
    assert.doesNotThrow(() => audio[fn](1));
  }

  // Verify mock AudioContext oscillator synthesis & mute gating
  let oscCreated = 0;
  const prevAC = globalThis.AudioContext;
  globalThis.AudioContext = class MockAC {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 22050;
      this.state = "running";
      this.destination = {};
    }
    createOscillator() {
      oscCreated += 1;
      return {
        type: "sine",
        frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} },
        connect() {},
      };
    }
    createBiquadFilter() {
      return { type: "lowpass", frequency: { value: 240, setTargetAtTime() {} }, Q: { value: 1 }, connect() {} };
    }
  };

  try {
    const liveAudio = new BastionAudio();
    liveAudio.setMuted(true);
    liveAudio.playClear(true);
    assert.equal(oscCreated, 0, "Muted BastionAudio must not spawn oscillators");

    liveAudio.setMuted(false);
    liveAudio.playBulletTimeChime(true);
    liveAudio.playGearBurst(true);
    assert.ok(oscCreated >= 5, "Unmuted BastionAudio should synthesize harmonic tones");
  } finally {
    globalThis.AudioContext = prevAC;
  }
});

test("5. BastionWorld3D headless lifecycle & complete Realm3DAdapter method surface", () => {
  const { world } = createHeadlessBastionWorld();
  assert.equal(world.webglAvailable, false);
  assert.equal(world.renderer, null);
  assert.ok(world.scene, "Expected Three.js Scene in headless mode");
  assert.ok(world.camera, "Expected PerspectiveCamera in headless mode");

  const adapterMethods = [
    "start",
    "stop",
    "step",
    "_step",
    "_update",
    "resize",
    "dispose",
    "applyLoadout",
    "rebuildRig",
    "setRigMode",
    "toggleRigMode",
    "setObservatoryTier",
    "setSurgeMode",
    "setEncounterDockOpen",
    "isOppositionPaused",
    "toggleBulletTime",
    "setBulletTimeRequested",
    "getBulletTimeState",
    "getActiveBiome",
    "getFieldExpeditionState",
    "getRobloxSimSnapshot",
    "populateEncounters",
    "areAllEncountersCleared",
    "engageAutopilotToNextGate",
    "setDriveInputs",
    "updateDialPreview",
    "previewDialOnActiveGate",
    "refreshActiveEncounterVisual",
    "playTwinBeamVisual",
    "playCommitVisual",
    "resolveActiveGateCommit",
    "triggerRealmQuickAction",
    "resetFreshSnow",
    "triggerGuardianAwakening",
    "triggerSkyWhale",
    "getSlipstreamBoostState",
    "setZoneProgressRatio",
    "getLocalMultiplayerPose",
    "syncRemotePartners",
    "playPartnerCoopEvent",
    "playLocalFlare",
    "syncSharedCoins",
  ];
  for (const m of adapterMethods) {
    assert.equal(typeof world[m], "function", `Missing BastionWorld3D.${m}`);
  }

  world.resize(1280, 720);
  assert.ok(Math.abs(world.camera.aspect - 1280 / 720) < 1e-6);
  world.step(1 / 60);
  world.dispose();
});

test("6. Sky-Bastion world landmarks, Celestial Sky Dome, Brass Clockwork Sky-Rings & Canyon Lanes (-20, 0, +40)", () => {
  const { world } = createHeadlessBastionWorld();
  const expectedNames = [
    "CelestialSkyDome_arc_bastion",
    "celestial_clockwork_rings",
    "sky_citadel_courtyard",
    "west_prism_rampart",
    "east_mortar_bastion",
    "north_ballista_overlook",
    "siegesmith_gear_foundry_pad",
    "moonwell_sundial",
    "northern_observatory_spire",
    "canyon_lane_-20",
    "canyon_lane_0",
    "canyon_lane_+40",
  ];
  for (const name of expectedNames) {
    const obj = world.scene.getObjectByName(name);
    assert.ok(obj, `Expected 3D landmark "${name}" in Sky-Bastion scene`);
  }
  assert.deepEqual(CANYON_LANE_MARKERS, [-20, 0, 40]);
  world.dispose();
});

test("7. Both playable Siege-Rovers (iron_ballista & prism_rail_skiff) build distinct sculpted 3D meshes", () => {
  const { world } = createHeadlessBastionWorld();
  assert.equal(BASTION_RIGS.length, 2);
  assert.equal(world.rigState.rigId, "iron_ballista");
  assert.equal(world.rigWheels.length, 6, "6x6 Siege-Ballista Rover should have 6 independent wheels");
  assert.ok(world.scene.getObjectByName("ballista_rotating_turret"));
  assert.ok(world.scene.getObjectByName("ballista_front_gear_ram"));
  assert.ok(world.scene.getObjectByName("ballista_amber_reactor_core"));

  const switched = world.toggleRigMode();
  assert.equal(switched, "prism_rail_skiff");
  assert.equal(world.rigState.rigId, "prism_rail_skiff");
  assert.ok(world.scene.getObjectByName("skiff_twin_rail_prisms"));
  assert.equal(world.skiffThrusterCones.length, 2);
  world.dispose();
});

test("8. All 6 BASTION_UPGRADES render visible 3D attachments on rover, ramparts & canyon", () => {
  const { world } = createHeadlessBastionWorld();
  const allUpgradeIds = BASTION_UPGRADES.map((u) => u.id);
  assert.equal(allUpgradeIds.length, 6);

  const prog = createInitialProgress("sarah");
  prog.games.arc_bastion.bastionUpgrades = [...allUpgradeIds];
  world.applyLoadout(prog, getCrossRealmUnlocks(prog));

  for (const upId of allUpgradeIds) {
    const mesh = world.rigGroup.getObjectByName(`upgrade_${upId}`);
    assert.ok(mesh && mesh.visible, `Expected visible 3D rover attachment for ${upId}`);
  }
  assert.equal(world.opposition.autoTurretGroup.visible, true, "Rampart Clockwork Sentinel should be visible");
  assert.equal(world.opposition.angleMirrorsGroup.visible, true, "Canyon Ricochet Mirrors should be visible");
  world.dispose();
});

test("9. Cross-Realm unlocks (cryoCannonUnlocked & bastionMosaicTrim) and Sibling Borrow Pennant render cleanly", () => {
  const { world } = createHeadlessBastionWorld();
  const prog = createInitialProgress("sarah");
  prog.records.deepestSubZero = -65;
  prog.games.oddroot.mosaicForged = true;
  prog.discoveredMysteries.push("moon_center");
  const unlocks = getCrossRealmUnlocks(prog);
  assert.equal(unlocks.cryoCannonUnlocked, true);
  assert.equal(unlocks.bastionMosaicTrim, true);

  world.applyLoadout(prog, unlocks, {
    owner: "david",
    displayName: "David",
    bastionRig: { rigId: "prism_rail_skiff", upgrades: ["ab_citadel_crown"] },
  });

  assert.ok(world.rigGroup.getObjectByName("cross_realm_cryo_cannon_trim"));
  assert.ok(world.rigGroup.getObjectByName("cross_realm_bastion_mosaic_trim"));
  assert.ok(world.rigGroup.getObjectByName("silver_moon_lantern"));
  assert.ok(world.rigGroup.getObjectByName("sibling_borrow_pennant"));
  world.dispose();
});

test("10. Northern Household Observatory Spire scales visibly across setObservatoryTier(1..5)", () => {
  const { world } = createHeadlessBastionWorld();
  world.setObservatoryTier(1);
  const scale1 = world.observatoryGroup.scale.x;
  const vis1 = world.observatoryTierMeshes.filter((m) => m.visible).length;
  assert.equal(vis1, 1);

  world.setObservatoryTier(5);
  const scale5 = world.observatoryGroup.scale.x;
  const vis5 = world.observatoryTierMeshes.filter((m) => m.visible).length;
  assert.equal(vis5, 5);
  assert.ok(scale5 > scale1, "Tier 5 Observatory Spire must scale larger than Tier 1");
  world.dispose();
});

test("11. Siegesmith Gear-Foundry Pad (-10, 26) triggers onGaragePadEntered with spatial hysteresis", () => {
  const { world, events } = createHeadlessBastionWorld();
  world.rigState.x = GEAR_FOUNDRY_PAD_COORD.x;
  world.rigState.z = GEAR_FOUNDRY_PAD_COORD.z;
  world.step(1 / 60);
  assert.equal(events.garage, 1, "Entering Gear-Foundry Pad should fire onGaragePadEntered()");

  // Parking on pad must not spam callback
  world.step(0.5);
  assert.equal(events.garage, 1);

  // Driving away (>7.5m) and waiting out cooldown re-arms the pad
  world.rigState.x = 0;
  world.rigState.z = 14;
  world.step(4.0);
  world.rigState.x = GEAR_FOUNDRY_PAD_COORD.x;
  world.rigState.z = GEAR_FOUNDRY_PAD_COORD.z;
  world.step(1 / 60);
  assert.equal(events.garage, 2);
  world.dispose();
});

test("12. Central Moonwell Sundial (0, 0) triggers moon_center ONLY when !encounterDockOpen && !activeGateSlot", () => {
  const { world, events } = createHeadlessBastionWorld();
  world.rigState.x = 0;
  world.rigState.z = 0;
  world.rigState.speed = 0;

  // Blocked while encounterDockOpen is true
  world.setEncounterDockOpen(true);
  world.step(2.0);
  assert.equal(events.mysteries.includes("moon_center"), false);

  // Fires once dock is closed and rover rests quietly
  world.setEncounterDockOpen(false);
  world.step(1.6);
  assert.equal(events.mysteries.includes("moon_center"), true);
  world.dispose();
});

test("13. Active Clockwork Opposition roams across canyon lanes when undocked", () => {
  const { world } = createHeadlessBastionWorld();
  const snap0 = world.opposition.getSnapshots();
  assert.ok(snap0.length >= 16, "Expected walkers, blimps, barricades, and gear-pods");
  const kinds = new Set(snap0.map((s) => s.kind));
  assert.ok(kinds.has("clockwork_walker"));
  assert.ok(kinds.has("origami_blimp"));
  assert.ok(kinds.has("gear_barricade"));
  assert.ok(kinds.has("gear_pod"));

  world.step(0.5);
  const snap1 = world.opposition.getSnapshots();
  let movedCount = 0;
  for (let i = 0; i < snap0.length; i++) {
    const a = snap0[i];
    const b = snap1.find((x) => x.key === a.key);
    if (b && Math.hypot(b.x - a.x, b.z - a.z) > 0.01) movedCount += 1;
  }
  assert.ok(movedCount >= 10, `Expected active roaming movement, got ${movedCount} moved units`);
  world.dispose();
});

test("14. Mandatory Math-Pause Law: exact bitwise 0.0 opposition delta when encounterDockOpen is true", () => {
  const { world } = createHeadlessBastionWorld();
  world.step(0.2);
  world.setEncounterDockOpen(true);
  const before = world.opposition.getSnapshots();

  for (let i = 0; i < 30; i++) {
    world.step(1 / 60);
    assert.equal(world.lastTimeScale.oppositionDt, 0.0);
    assert.equal(Object.is(world.lastTimeScale.oppositionDt, 0), true);
  }

  const after = world.opposition.getSnapshots();
  assert.deepEqual(after, before, "Opposition coordinates must remain bitwise identical while docked");
  world.dispose();
});

test("15. Mandatory Math-Pause Law: exact bitwise 0.0 opposition delta when activeGateSlot is engaged", () => {
  const { world, events } = createHeadlessBastionWorld();
  const enc = generateEncounter("W1.1");
  world.populateEncounters([enc]);
  const slot = world.gateSlots[0];

  // Teleport rover onto docking pad of slot 0
  world.rigState.x = slot.x + Math.sin(slot.rotY) * 5.6;
  world.rigState.z = slot.z + Math.cos(slot.rotY) * 5.6;
  world.step(1 / 60);

  assert.equal(events.approach.length, 1);
  assert.equal(world.activeGateSlot, slot);
  assert.equal(world.isOppositionPaused(), true);

  const before = world.opposition.getSnapshots();
  for (let i = 0; i < 25; i++) {
    world.step(1 / 60);
    assert.equal(world.lastTimeScale.oppositionDt, 0.0);
  }
  const after = world.opposition.getSnapshots();
  assert.deepEqual(after, before, "Opposition must stay frozen at 0.0 delta while docked at a battery");
  world.dispose();
});

test("16. Signature 0.08x Crystal Bullet-Time Aura slows roaming opposition to 0.08x while rover stays 1.0x", () => {
  const { world: normalWorld } = createHeadlessBastionWorld();
  const { world: btWorld } = createHeadlessBastionWorld();

  const wNorm0 = normalWorld.opposition.walkers[0].z;
  const wBt0 = btWorld.opposition.walkers[0].z;

  const btState = btWorld.toggleBulletTime();
  assert.equal(btState.active, true);
  assert.equal(btState.scaleFactor, BULLET_TIME_SCALE);
  assert.equal(BULLET_TIME_SCALE, 0.08);

  normalWorld.setDriveInputs(0, 1, false);
  btWorld.setDriveInputs(0, 1, false);

  normalWorld.step(0.5);
  btWorld.step(0.5);

  const normWalkerDz = normalWorld.opposition.walkers[0].z - wNorm0;
  const btWalkerDz = btWorld.opposition.walkers[0].z - wBt0;
  const ratio = btWalkerDz / normWalkerDz;
  assert.ok(Math.abs(ratio - 0.08) < 0.005, `Expected 0.08x opposition motion ratio, got ${ratio}`);
  assert.equal(btWorld.opposition.bulletTimeDome.visible, true, "Crystal Bullet-Time Dome must be visible");

  // Player rover stays at full responsive 1.0x speed
  assert.ok(
    Math.abs(btWorld.rigState.z - normalWorld.rigState.z) < 0.05,
    "Player rover kinematics must stay 1.0x responsive during Bullet-Time"
  );

  normalWorld.dispose();
  btWorld.dispose();
});

test("17. Ramming Clockwork Walkers & Gear-Pods awards Flux Shards, and gate arrival triggers Confetti Gear-Juggle Stall", () => {
  const { world, events } = createHeadlessBastionWorld();
  const walker = world.opposition.walkers[0];
  world.rigState.x = walker.x;
  world.rigState.z = walker.z;
  world.rigState.speed = 10;
  world.step(1 / 60);

  assert.equal(walker.active, false, "Rammed Clockwork Walker should burst into gears");
  assert.ok(
    events.activity.some((a) => a.key === "contraptionsShattered" && a.bonus === 3),
    "Expected +3 bonus shards on contraption shatter"
  );

  const pod = world.opposition.gearPods[0];
  world.rigState.x = pod.x;
  world.rigState.z = pod.z;
  world.step(1 / 60);
  assert.equal(pod.active, false, "Driven-over Golden Gear-Pod should pop");
  assert.ok(
    events.opposition.some((e) => e.kind === "gear_pod_smashed" && e.shardsEarned === 2),
    "Expected +2 shards on Golden Gear-Pod smash"
  );

  // Move walker_1 right to its gateZ to verify harmless Confetti Gear-Juggle Stall
  const walker2 = world.opposition.walkers[1];
  world.rigState.x = 0;
  world.rigState.z = 14;
  walker2.z = walker2.gateZ - 0.05;
  world.step(0.1);
  assert.ok(world.opposition.juggleStallCount >= 1, "Walker at gate should trigger Confetti Gear-Juggle Stall");
  assert.equal(walker2.juggleCluster.visible, true);

  // Finish juggle stall -> resets cleanly back down canyon with zero damage
  world.step(2.0);
  assert.equal(walker2.juggleCluster.visible, false);
  assert.ok(walker2.z < walker2.gateZ - 10, "Walker should reset cleanly back down canyon lane");
  world.dispose();
});

test("18. Friendly Sentinel Auto-Turret (ab_auto_turret) & Piercing Prism Rail (ab_prism_pierce) shatter contraptions", () => {
  const { world, events } = createHeadlessBastionWorld();
  world.rebuildRig("prism_rail_skiff", ["ab_auto_turret", "ab_prism_pierce", "ab_angle_mirrors"]);

  // Auto-turret fires after cooldown when roaming
  world.step(2.8);
  assert.ok(
    events.opposition.some((e) => e.source === "Clockwork Sentinel"),
    "Expected Clockwork Sentinel rampart turret to shatter an opposition unit"
  );

  // Place two walkers in front of rover and fire Piercing Prism Pulse
  const wA = world.opposition.walkers[2];
  const wB = world.opposition.walkers[3];
  wA.active = true;
  wB.active = true;
  wA.x = 0;
  wA.z = 6;
  wB.x = 0;
  wB.z = 1;
  world.rigState.x = 0;
  world.rigState.z = 14;
  world.rigState.heading = 0;

  const pierceRes = world.triggerRealmQuickAction();
  assert.ok(pierceRes.hitCount >= 2, "Piercing Prism Pulse should shatter multiple contraptions in line");
  world.dispose();
});

test("19. All 33 curriculum nodes (W0.1–W7.4) build distinct 3D Siege Batteries wrapped in buildTempleSanctuaryFrame", () => {
  const { world } = createHeadlessBastionWorld();
  const nodeIds = Object.keys(NODE_MAP);
  assert.equal(nodeIds.length, 33, "Expected all 33 W0.1–W7.4 curriculum nodes");

  const familiesSeen = new Set();
  for (const nodeId of nodeIds) {
    const enc = generateEncounter(nodeId);
    world.populateEncounters([enc]);
    assert.equal(world.gateSlots.length, 1);
    const slot = world.gateSlots[0];
    assert.ok(slot.group, `Missing 3D group for ${nodeId}`);
    assert.ok(slot.templeFrame?.group, `Missing TempleSanctuaryFrame group for ${nodeId}`);
    assert.ok(slot.templeFrame.group.name.includes("arc_bastion"));
    familiesSeen.add(slot.batteryFamily);
    world.updateDialPreview(5);
    world.step(1 / 60);
  }

  for (const expectedFamily of [
    "charge_capacitor",
    "cryo_hopper",
    "sub_zero_cannon",
    "clockwork_loom",
    "shield_area_forge",
    "scale_shield_bay",
    "prism_rail_launcher",
    "angle_mirror_array",
    "sky_astrolabe",
    "ballista_rangefinder",
    "parabolic_siege_mortar",
    "armor_slab_forge",
    "resonance_tesla_tower",
    "harmonic_wave_piston",
    "quarter_turn_i_portal",
  ]) {
    assert.ok(familiesSeen.has(expectedFamily), `Expected Siege Battery family ${expectedFamily}`);
  }
  world.dispose();
});

test("20. Near-Field Anti-Scrub Law on W0.6 & W4.1–W4.4 (holo_ramp <= 12% pre-commit stub, 100% post-commit rail)", () => {
  const { world } = createHeadlessBastionWorld();
  for (const nodeId of ["W0.6", "W4.1", "W4.2", "W4.3", "W4.4"]) {
    const enc = generateEncounter(nodeId);
    world.populateEncounters([enc]);
    const slot = world.gateSlots[0];

    assert.equal(slot.extrudedBridge.visible, false, `${nodeId}: full rail must start hidden`);
    assert.ok(slot.originTangentStub, `${nodeId}: expected origin_tangent_stub`);

    for (const dialVal of [-40, -10, -2, 0, 2, 10, 40]) {
      const sample = world.previewDialOnActiveGate(dialVal);
      assert.equal(slot.extrudedBridge.visible, false, `${nodeId}: full rail must stay hidden during dial scrub`);
      assert.ok(sample.ratio <= 0.15, `${nodeId}: stub ratio ${sample.ratio} must be <= 0.15`);
      assert.equal(sample.ratio, 0.12);
    }

    world.resolveActiveGateCommit({ outcome: "clear", overdrive: true }, enc);
    assert.equal(slot.extrudedBridge.visible, true, `${nodeId}: full canyon rail must reveal on commit`);
    assert.equal(slot.lastTrajectorySample.ratio, 1.0);
  }
  world.dispose();
});

test("21. Near-Field Anti-Scrub Law on W6.1 & W6.2 (Parabolic Siege Mortar <= 12% pre-commit stub, 100% post-commit arch)", () => {
  const { world } = createHeadlessBastionWorld();
  for (const nodeId of ["W6.1", "W6.2"]) {
    const enc = generateEncounter(nodeId);
    world.populateEncounters([enc]);
    const slot = world.gateSlots[0];

    assert.equal(slot.fullArch.visible, false, `${nodeId}: parabolic mortar arch must start hidden`);
    for (const dialVal of [-25, -5, 0, 6, 25]) {
      const sample = world.updateDialPreview(dialVal);
      assert.equal(slot.fullArch.visible, false);
      assert.ok(sample.ratio <= 0.15);
      assert.equal(sample.ratio, 0.12);
    }

    world.playCommitVisual({ outcome: "clear", overdrive: true }, enc);
    assert.equal(slot.fullArch.visible, true, `${nodeId}: full parabolic arch must fire across 100% of canyon`);
    assert.equal(slot.lastTrajectorySample.ratio, 1.0);
  }
  world.dispose();
});

test("22. engageAutopilotToNextGate smoothly steers and cruises rover into nearest uncleared Siege Battery", () => {
  const { world, events } = createHeadlessBastionWorld();
  world.populateEncounters([
    generateEncounter("W1.1"),
    generateEncounter("W1.2"),
    generateEncounter("W1.3"),
  ]);
  assert.equal(world.gateSlots.length, 3);

  const chosen = world.engageAutopilotToNextGate();
  assert.ok(chosen);

  for (let i = 0; i < 140 && events.approach.length === 0; i++) {
    world.step(1 / 30);
  }
  assert.equal(events.approach.length, 1, "Autopilot should smoothly dock into nearest Siege Battery");
  assert.ok(world.activeGateSlot);
  world.dispose();
});

test("23. Splatoon Cryo-Gel Coordinate Miss-Splatter & vertical delta-y Caliper on miss_animate / nudge", () => {
  const { world, events } = createHeadlessBastionWorld();
  world.rebuildRig("iron_ballista", ["ab_cryo_mortar"]);
  const enc = generateEncounter("W4.2");
  world.populateEncounters([enc]);
  const slot = world.gateSlots[0];

  const submitted = enc.answer + 6;
  const expectedSplat = computeCoordinateSplatter({
    committedValue: submitted,
    answer: enc.answer,
    targetX: 0,
    targetY: 2.0,
    scaleY: 0.35,
  });

  const fx = world.resolveActiveGateCommit(
    {
      outcome: "miss_animate",
      committedValue: submitted,
      targetValue: enc.answer,
      delta: 6,
    },
    enc
  );

  const splatObj = slot.group.getObjectByName("cryo_gel_splat");
  const caliperObj = slot.group.getObjectByName("miss_delta_caliper");
  assert.ok(splatObj && splatObj.visible, "cryo_gel_splat pool must be visible on miss");
  assert.ok(caliperObj && caliperObj.visible, "miss_delta_caliper must be visible on miss");
  assert.equal(fx.splatter.impactY, expectedSplat.impactY);
  assert.equal(fx.splatter.caliperHeight, expectedSplat.caliperHeight);
  assert.ok(Number.isFinite(splatObj.position.y));
  assert.equal(splatObj.scale.x, 1.55, "ab_cryo_mortar should widen Cryo-Gel pool scale");
  assert.ok(events.activity.some((a) => a.key === "cryoGelSplats"));
  world.dispose();
});

test("24. Explosive Gear-Burst, Temple Sky-Pillar awakening & Slipstream Speed Boost on clear", () => {
  const { world } = createHeadlessBastionWorld();
  const enc = generateEncounter("W2.2");
  world.populateEncounters([enc]);
  const slot = world.gateSlots[0];

  world.playCommitVisual({ outcome: "clear", overdrive: true, shardsEarned: 21 }, enc);
  assert.equal(slot.cleared, true);
  assert.equal(slot.templeFrame.awakened, true);
  assert.equal(slot.targetContraption.visible, false);
  assert.equal(slot.gearBurstGroup.visible, true);

  const boostState = world.getSlipstreamBoostState();
  assert.equal(boostState.active, true);
  assert.equal(boostState.overdrive, true);
  assert.ok(boostState.multiplier >= 1.4, `Expected >=1.4x overdrive Slipstream boost, got ${boostState.multiplier}`);
  assert.ok(world.rigState.speed >= 11.5, "Expected immediate forward Slipstream surge when roaming free");
  world.dispose();
});

test("25. Slipstream immediate speed surge is guarded when autopilotTarget is active", () => {
  const { world } = createHeadlessBastionWorld();
  const enc1 = generateEncounter("W1.1");
  const enc2 = generateEncounter("W1.2");
  world.populateEncounters([enc1, enc2]);
  world.engageAutopilotToNextGate();
  world.rigState.speed = 0;

  world.playCommitVisual({ outcome: "clear", overdrive: true }, enc2);
  assert.equal(world.getSlipstreamBoostState().active, true);
  assert.equal(world.rigState.speed, 0, "Immediate velocity surge must not hijack active autopilot");
  world.dispose();
});

test("26. W5.2 Sky-Astrolabe clear unlocks astrolabe_lock & triggerSkyWhale unlocks aurora_whale", () => {
  const { world, events } = createHeadlessBastionWorld();
  const enc = generateEncounter("W5.2");
  world.populateEncounters([enc]);
  world.playCommitVisual({ outcome: "clear", overdrive: true }, enc);
  assert.ok(events.mysteries.includes("astrolabe_lock"));

  world.triggerSkyWhale();
  assert.equal(world.skyWhale.visible, true);
  assert.ok(events.mysteries.includes("aurora_whale"));

  world.triggerGuardianAwakening("W5");
  assert.equal(world.guardianAwakeningCount, 1);
  assert.equal(world.guardianBeam.visible, true);
  world.dispose();
});

test("27. 2-Player Live Co-Op renders remote partner Siege-Rover, floating badge, Sky-Flare & Gate Burst", () => {
  const { world } = createHeadlessBastionWorld();
  world.syncRemotePartners([
    {
      peerId: "peer_david",
      displayName: "David",
      avatar: "🛡️",
      chassisOrMount: "prism_rail_skiff",
      status: "overdrive",
      upgrades: ["ab_citadel_crown", "ab_chronos_harp"],
      x: 8,
      y: 1,
      z: 10,
      heading: 0.4,
    },
  ]);

  assert.equal(world.coop.remotePartners.size, 1);
  const partner = world.coop.remotePartners.get("peer_david");
  assert.ok(partner.group.getObjectByName("partner_status_ring"));
  assert.ok(partner.group.getObjectByName("partner_name_badge"));

  partner.targetX = 12;
  world.step(0.1);
  assert.ok(partner.x > 8.0, "Partner rover should smoothly interpolate toward target pose");

  const flare = world.playLocalFlare();
  assert.equal(flare.kind, "flare");
  const burst = world.playPartnerCoopEvent({ kind: "gate_clear", x: -24, z: -12 });
  assert.ok(burst);

  const localPose = world.getLocalMultiplayerPose();
  assert.equal(localPose.chassisOrMount, "iron_ballista");
  world.dispose();
});

test("28. 4 Shared Star-Coins (SHARED_COIN_IDS) sync & trigger onSharedCoinGrabbed on pickup", () => {
  const { world, events } = createHeadlessBastionWorld();
  assert.equal(SHARED_COIN_IDS.length, 4);
  assert.equal(world.coop.sharedCoins.size, 4);

  const c0 = SHARED_COIN_SPECS[0];
  world.rigState.x = c0.x;
  world.rigState.z = c0.z;
  world.step(1 / 60);
  assert.deepEqual(events.coins, ["coin_0"]);

  world.syncSharedCoins({
    coin_0: { available: true },
    coin_1: { available: false },
  });
  assert.equal(world.coop.sharedCoins.get("coin_0").group.visible, true);
  assert.equal(world.coop.sharedCoins.get("coin_1").group.visible, false);
  world.dispose();
});

test("29. Self-Ghost PB Rover records raid, pauses during thinking, persists bestRaidSec & replays with zero negative deltas", () => {
  const { world } = createHeadlessBastionWorld();
  const prog = createInitialProgress("sarah");
  world.applyLoadout(prog);

  const enc = generateEncounter("W1.1");
  world.populateEncounters([enc]);

  world.setDriveInputs(0, 1, false);
  world.step(1.2);
  const elapsedBeforeDock = world.ghostController.waveElapsedSec;
  assert.ok(elapsedBeforeDock > 1.0);

  // Open dock -> ghost timer must freeze completely!
  world.setEncounterDockOpen(true);
  world.step(2.0);
  assert.equal(world.ghostController.waveElapsedSec, elapsedBeforeDock);

  world.setEncounterDockOpen(false);
  world.playCommitVisual({ outcome: "clear", overdrive: true }, enc);

  assert.ok(world.lastGhostWaveResult?.isNewRecord);
  assert.ok(prog.games.arc_bastion.bestRaidSec > 0);
  assert.ok(prog.games.arc_bastion.ghostFrames.length >= 2);
  assert.equal(world.lastGhostWaveResult.bannerText.includes("-"), false);

  // Next wave replays translucent self_ghost_rover
  world.populateEncounters([generateEncounter("W1.2")]);
  assert.equal(world.ghostController.mesh.visible, true);
  world.dispose();
});

test("30. Field Expeditions (EXPEDITION_CATALOG.arc_bastion) & portable getRobloxSimSnapshot()", () => {
  const { world, events } = createHeadlessBastionWorld();
  const catalog = EXPEDITION_CATALOG.arc_bastion;
  assert.equal(catalog.length, 3);

  // Waypoint advancement is strictly gated off while encounterDockOpen is true
  const wp0 = catalog[0].waypoints[0];
  world.setEncounterDockOpen(true);
  world.rigState.x = wp0.x;
  world.rigState.z = wp0.z;
  world.step(1 / 60);
  assert.equal(world.getFieldExpeditionState().collectedCount, 0);

  // Close dock -> drive through all waypoints of Expedition 1
  world.setEncounterDockOpen(false);
  for (const wp of catalog[0].waypoints) {
    world.rigState.x = wp.x;
    world.rigState.z = wp.z;
    world.step(1 / 60);
  }

  const expState = world.getFieldExpeditionState();
  assert.equal(expState.completedTotal, 1);
  assert.equal(expState.completedCount, 1);
  assert.ok(events.activity.some((a) => a.key === "expeditionsCompleted"));

  const snap = world.getRobloxSimSnapshot();
  assert.equal(snap.v, 1);
  assert.equal(snap.realmId, "arc_bastion");
  assert.ok(snap.biomeId);
  assert.ok(snap.pose);
  assert.equal(snap.expedition.completedTotal, 1);
  assert.ok(Array.isArray(snap.opposition));
  assert.ok(snap.opposition.length >= 10);
  world.dispose();
});

test("31. Custom 3D Character Pilots, Sculpted Rigs, Guardian Colossus, Sky-Whale, Spirit Fox & Astro-Toad Mascot", () => {
  const { world } = createHeadlessBastionWorld();

  // 1. Iron Ballista 6x6 Crawler + Heroic Standing Goggled Siegesmith Pilot
  assert.equal(world.rigGroup.name, "bastion_rover_iron_ballista");
  assert.equal(world.wheels.length, 6, "Expected 6 spoked wheels on Iron Ballista");
  const siegesmithPilot = world.rigGroup.getObjectByName("custom_character_siegesmith");
  assert.ok(siegesmithPilot, "Expected custom_character_siegesmith pilot standing on Iron Ballista");

  world.setDriveInputs(0.6, 1.0, true);
  world.step(0.25);
  assert.ok(
    Math.abs(world.wheels[0].mesh.rotation.x) > 0.01,
    "Iron Ballista 6x6 wheels must spin with velocity"
  );
  assert.ok(
    Math.abs(siegesmithPilot.userData.animRefs.headPivot.rotation.y) > 0.01,
    "Siegesmith pilot must animate with steering and motion"
  );

  // 2. Prism Rail Skiff Twin-Prong Hover-Skiff + Seated Chrono-Tactician Pilot + Chronos Core + Holo Slate
  world.setRigMode("prism_rail_skiff");
  assert.equal(world.rigGroup.name, "bastion_rover_prism_rail_skiff");
  const tacticianPilot = world.rigGroup.getObjectByName("custom_character_chrono_tactician");
  assert.ok(tacticianPilot, "Expected custom_character_chrono_tactician seated in Prism Rail Skiff");
  assert.ok(world.rigGroup.getObjectByName("skiff_hourglass_chronos_core"));
  assert.ok(world.rigGroup.getObjectByName("skiff_holo_hud_slate"));
  world.step(0.2);
  assert.ok(
    Math.abs(tacticianPilot.userData.animRefs.headPivot.rotation.y) > 0.01,
    "Chrono-Tactician pilot must animate with steering and motion"
  );

  // 3. Cross-Realm Zero-G Astro-Toad Mascot + extra ab_* upgrade invariants
  const prog = createInitialProgress("sarah");
  prog.records.deepestSubZero = -60;
  const unlocks = getCrossRealmUnlocks(prog);
  world.rebuildRig(
    "iron_ballista",
    ["ab_repulsor_prow", "ab_prism_pierce", "ab_cryo_mortar", "ab_chronos_lens", "ab_angle_mirrors", "ab_sky_grapnel"],
    unlocks,
    { active: true, owner: "david", displayName: "David" }
  );
  const astroToad = world.rigGroup.getObjectByName("astro_toad_mascot");
  assert.ok(astroToad, "Expected sculpted astro_toad_mascot when cross-realm unlocked");
  assert.ok(Math.abs(astroToad.scale.x - 0.38) < 0.02);
  for (const upId of [
    "ab_repulsor_prow",
    "ab_prism_pierce",
    "ab_cryo_mortar",
    "ab_chronos_lens",
    "ab_angle_mirrors",
    "ab_sky_grapnel",
  ]) {
    assert.ok(world.rigGroup.getObjectByName(`upgrade_${upId}`), `Expected upgrade_${upId}`);
  }

  // 4. Sculpted Citadel Guardian Colossus + rotating Astrolabe Halo + Sky-Whale + Spirit Fox warm_reveal
  const sculptedGuardian = world.scene.getObjectByName("sculpted_guardian_arc_bastion");
  assert.ok(sculptedGuardian, "Expected sculpted_guardian_arc_bastion in scene graph");
  const haloRot0 = world.guardianHalo.rotation.z;
  world.step(0.4);
  assert.ok(
    Math.abs(world.guardianHalo.rotation.z - haloRot0) > 0.01,
    "Guardian golden Astrolabe Halo must rotate gently"
  );
  assert.ok(world.scene.getObjectByName("custom_sky_whale_arc_bastion"));

  const enc = generateEncounter("W1.1");
  world.populateEncounters([enc]);
  world.playCommitVisual({ outcome: "warm_reveal", overdrive: false }, enc);
  const spiritFox = world.scene.getObjectByName("custom_spirit_fox");
  assert.ok(spiritFox && spiritFox.visible, "Spirit Fox 3D companion should appear on warm_reveal");

  world.dispose();
});

test("32. Sculpted Clockwork Striders, Gear-Hounds, Hover-Zeppelins, Co-Op Partner Pilots & Ghost Silhouettes", () => {
  const { world } = createHeadlessBastionWorld();

  // Clockwork Striders, Gear-Hounds & Hover-Zeppelins
  assert.ok(world.opposition.walkers.length >= 6);
  assert.ok(world.opposition.walkers[0].group.getObjectByName("walker_monocle_eye"));
  assert.ok(world.opposition.walkers[0].group.getObjectByName("walker_dorsal_gear"));
  assert.ok(world.opposition.gearHounds.length >= 4, "Expected playful mechanical Gear-Hounds");
  assert.ok(world.opposition.gearHounds[0].group.getObjectByName("gear_hound_head"));
  assert.ok(world.opposition.gearHounds[0].group.getObjectByName("gear_hound_tail"));
  assert.equal(world.opposition.blimps[0].group.name, "hover_zeppelin_mesh");
  assert.ok(world.opposition.blimps[0].group.getObjectByName("zeppelin_rear_propeller"));

  const kinds = new Set(world.opposition.getSnapshots().map((s) => s.kind));
  assert.ok(kinds.has("gear_hound"));

  // Co-Op Partner Rover Pilots (both Siegesmith and Chrono-Tactician)
  world.syncRemotePartners([
    { peerId: "p_ballista", displayName: "Ava", chassisOrMount: "iron_ballista", x: -6, z: 12 },
    { peerId: "p_skiff", displayName: "Leo", chassisOrMount: "prism_rail_skiff", x: 6, z: 12 },
  ]);
  const pBallista = world.coop.remotePartners.get("p_ballista");
  const pSkiff = world.coop.remotePartners.get("p_skiff");
  assert.ok(pBallista.group.getObjectByName("custom_character_siegesmith"));
  assert.ok(pSkiff.group.getObjectByName("custom_character_chrono_tactician"));

  // Ghost-Rover sculpted silhouettes + pilot hologram
  assert.ok(world.ghostController.mesh.getObjectByName("ghost_pilot_silhouette"));
  world.ghostController.setRigAppearance("prism_rail_skiff");
  assert.ok(world.ghostController.mesh.getObjectByName("ghost_pilot_silhouette"));

  world.dispose();
});

