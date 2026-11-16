/**
 * Arc Bastion: Siegesmiths — All 33 Nodes (W0.1–W7.4) as 3D Sky-Bastion Siege Batteries
 * Wraps every Siege Battery in buildTempleSanctuaryFrame({ theme: "arc_bastion" }),
 * enforces the <= 12% Near-Field Anti-Scrub barrel-tangent stub law via sampleTrajectoryArc,
 * renders Splatoon-style Turquoise Cryo-Gel Coordinate Miss-Splatters + vertical delta-y calipers,
 * and bursts target Clockwork Contraptions into tumbling 3D wooden/brass gears & confetti on clear.
 */

import * as THREE from "../vendor/three.module.min.js";
import {
  buildTempleSanctuaryFrame,
  stepTempleSanctuaryFrame,
} from "../core/vfx-3d.js";
import {
  NEAR_FIELD_STUB_MAX_RATIO,
  sampleTrajectoryArc,
  computeCoordinateSplatter,
} from "../core/world-sim.js";

export const CANYON_TARGET_SPAN_M = 16.0;

function clampFinite(val, min, max, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function resolveBastionBatterySpec(enc = {}) {
  const nodeId = String(enc?.nodeId || "W1.1");
  const eType = String(enc?.encounterType || "");
  const gType = String(enc?.kind || enc?.generatorType || "");

  // 1. Exact curriculum generator kinds & nodeIds across all 33 W0.1–W7.4 nodes
  if (gType.startsWith("ramp_") || gType === "sys_intersection" || nodeId === "W0.6" || nodeId.startsWith("W4.")) {
    return {
      batteryFamily: "prism_rail_launcher",
      archetype: "ramp",
      antiScrub: true,
      isTwinSystem:
        nodeId === "W4.4" || gType === "sys_intersection" || Boolean(enc?.rampMeta?.isSystem),
    };
  }
  if (gType.startsWith("arch_") || nodeId === "W6.1" || nodeId === "W6.2") {
    return {
      batteryFamily: "parabolic_siege_mortar",
      archetype: "mortar",
      antiScrub: true,
      isRootSplitter: nodeId === "W6.2" || gType === "arch_roots",
    };
  }
  if (gType === "quad_complete_sq" || nodeId === "W6.3") {
    return {
      batteryFamily: "armor_slab_forge",
      archetype: "mosaic_forge",
      antiScrub: false,
    };
  }
  if (gType === "complex_i_rotation" || nodeId === "W7.4") {
    return {
      batteryFamily: "quarter_turn_i_portal",
      archetype: "astrolabe",
      antiScrub: false,
    };
  }
  if (gType === "trig_wave_crest" || nodeId === "W7.3") {
    return {
      batteryFamily: "harmonic_wave_piston",
      archetype: "wave_piston",
      antiScrub: true,
    };
  }
  if (gType === "exp_growth" || gType === "log_stage" || nodeId === "W7.1" || nodeId === "W7.2") {
    return {
      batteryFamily: "resonance_tesla_tower",
      archetype: "cascade_reactor",
      antiScrub: false,
    };
  }
  if (gType === "geo_pythagoras" || gType === "geo_trig_ratio" || nodeId === "W5.3" || nodeId === "W5.4") {
    return {
      batteryFamily: "ballista_rangefinder",
      archetype: "harpoon_cliff",
      antiScrub: false,
    };
  }
  if (gType === "geo_astrolabe_thales" || nodeId === "W5.2") {
    return {
      batteryFamily: "sky_astrolabe",
      archetype: "astrolabe",
      antiScrub: false,
    };
  }
  if (gType === "geo_parallel_angles" || gType === "geo_triangle_truss" || nodeId === "W2.4" || nodeId === "W5.1") {
    return {
      batteryFamily: "angle_mirror_array",
      archetype: "astrolabe",
      antiScrub: false,
    };
  }
  if (gType === "geo_scale_area" || nodeId === "W3.4") {
    return {
      batteryFamily: "scale_shield_bay",
      archetype: "scale_bay",
      antiScrub: false,
    };
  }
  if (gType === "seq_linear" || gType === "exp_power" || nodeId === "W0.4" || nodeId === "W2.1" || nodeId === "W2.3") {
    return {
      batteryFamily: "clockwork_loom",
      archetype: "pattern_loom",
      antiScrub: false,
    };
  }
  if (gType === "expr_distribute" || nodeId === "W2.2") {
    return {
      batteryFamily: "shield_area_forge",
      archetype: "area_forge",
      antiScrub: false,
    };
  }
  if (gType === "int_polarity" || gType === "int_double_neg" || nodeId === "W0.3" || nodeId === "W1.3" || nodeId === "W1.4") {
    return {
      batteryFamily: "cryo_hopper",
      archetype: "zero_pair_pond",
      antiScrub: false,
    };
  }
  if (gType === "eq_subzero_extreme" || gType === "eq_cross_zero") {
    return {
      batteryFamily: "sub_zero_cannon",
      archetype: "balance_gate",
      antiScrub: false,
    };
  }

  // 2. Fallbacks when custom encounters specify encounterType without curriculum kind
  if (eType === "holo_ramp") {
    return { batteryFamily: "prism_rail_launcher", archetype: "ramp", antiScrub: true, isTwinSystem: false };
  }
  if (eType === "parabola_arch" || eType === "rainbow_arch") {
    return { batteryFamily: "parabolic_siege_mortar", archetype: "mortar", antiScrub: true, isRootSplitter: false };
  }
  if (eType === "mosaic_forge") {
    return { batteryFamily: "armor_slab_forge", archetype: "mosaic_forge", antiScrub: false };
  }
  if (eType === "wave_piston") {
    return { batteryFamily: "harmonic_wave_piston", archetype: "wave_piston", antiScrub: true };
  }
  if (eType === "cascade_reactor" || eType === "aurora_cascade") {
    return { batteryFamily: "resonance_tesla_tower", archetype: "cascade_reactor", antiScrub: false };
  }
  if (eType === "harpoon_cliff") {
    return { batteryFamily: "ballista_rangefinder", archetype: "harpoon_cliff", antiScrub: false };
  }
  if (eType === "astrolabe_shrine") {
    return { batteryFamily: "angle_mirror_array", archetype: "astrolabe", antiScrub: false };
  }
  if (eType === "scale_bay") {
    return { batteryFamily: "scale_shield_bay", archetype: "scale_bay", antiScrub: false };
  }
  if (eType === "pattern_loom") {
    return { batteryFamily: "clockwork_loom", archetype: "pattern_loom", antiScrub: false };
  }
  if (eType === "area_forge") {
    return { batteryFamily: "shield_area_forge", archetype: "area_forge", antiScrub: false };
  }
  if (eType === "zero_pair_pond") {
    return { batteryFamily: "cryo_hopper", archetype: "zero_pair_pond", antiScrub: false };
  }
  if (nodeId === "W0.2" || nodeId === "W1.1" || nodeId === "W1.2") {
    return { batteryFamily: "sub_zero_cannon", archetype: "balance_gate", antiScrub: false };
  }
  return {
    batteryFamily: "charge_capacitor",
    archetype: "balance_gate",
    antiScrub: false,
  };
}

function createSharedBatteryMaterials() {
  return {
    brass: new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      emissive: 0x5c3d08,
      emissiveIntensity: 0.34,
      roughness: 0.26,
      metalness: 0.74,
    }),
    sapphire: new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.68,
      roughness: 0.22,
      metalness: 0.45,
    }),
    slate: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.52,
      metalness: 0.36,
    }),
    timber: new THREE.MeshStandardMaterial({
      color: 0x7c5333,
      roughness: 0.66,
      metalness: 0.14,
    }),
    solarGold: new THREE.MeshStandardMaterial({
      color: 0xffcf56,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.16,
      metalness: 0.48,
    }),
    deepIce: new THREE.MeshStandardMaterial({
      color: 0x4ad8ff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      roughness: 0.14,
      metalness: 0.35,
    }),
    cyanLaser: new THREE.MeshBasicMaterial({
      color: 0x7ee8fa,
      transparent: true,
      opacity: 0.92,
    }),
    amberLaser: new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.92,
    }),
    cryoGel: new THREE.MeshStandardMaterial({
      color: 0x3bf0e4,
      emissive: 0x14b8a6,
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.86,
      roughness: 0.12,
    }),
    caliperGold: new THREE.MeshBasicMaterial({
      color: 0xffdf7e,
      transparent: true,
      opacity: 0.95,
    }),
  };
}

function buildTargetClockworkContraption(mats, targetZ = -12.0, targetY = 1.6) {
  const target = new THREE.Group();
  target.name = "battery_target_contraption";
  target.position.set(0, targetY, targetZ);

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 1.5, 10), mats.timber);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.14, 8, 16), mats.brass);
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 0.55;
  const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), mats.deepIce);
  eye.position.set(0, 0.2, 0.95);
  const key = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.08, 8, 12), mats.solarGold);
  key.position.set(0, 1.12, 0);
  target.add(hull, crown, eye, key);
  return target;
}

function buildCryoSplatterAndCaliperRig(mats) {
  const splatGroup = new THREE.Group();
  splatGroup.name = "cryo_gel_splat";
  splatGroup.visible = false;

  const mainPool = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 0.14, 18), mats.cryoGel);
  splatGroup.add(mainPool);
  const lobeOffsets = [
    [1.15, 0.65, 0.62],
    [-1.2, 0.55, 0.54],
    [0.75, -1.05, 0.58],
    [-0.85, -0.95, 0.48],
  ];
  for (const [lx, lz, rad] of lobeOffsets) {
    const lobe = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.1, 0.12, 12), mats.cryoGel);
    lobe.position.set(lx, 0.01, lz);
    splatGroup.add(lobe);
  }

  const caliperGroup = new THREE.Group();
  caliperGroup.name = "miss_delta_caliper";
  caliperGroup.visible = false;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8), mats.caliperGold);
  stem.name = "miss_delta_caliper_stem";
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 0.14), mats.caliperGold);
  capTop.name = "miss_delta_caliper_top";
  capTop.position.y = 0.5;
  const capBot = capTop.clone();
  capBot.name = "miss_delta_caliper_bottom";
  capBot.position.y = -0.5;
  const midOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), mats.cryoGel);
  caliperGroup.add(stem, capTop, capBot, midOrb);

  const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), mats.cryoGel);
  shellMesh.name = "cryo_gel_shell";
  shellMesh.visible = false;

  return { splatGroup, caliperGroup, stem, capTop, capBot, shellMesh };
}

function buildGearBurstCluster(mats, originZ = -12.0, originY = 1.8) {
  const burstGroup = new THREE.Group();
  burstGroup.name = "battery_gear_burst";
  burstGroup.position.set(0, originY, originZ);
  burstGroup.visible = false;

  const pieces = [];
  for (let i = 0; i < 14; i++) {
    const isCog = i % 2 === 0;
    const mesh = new THREE.Mesh(
      isCog
        ? new THREE.TorusGeometry(0.32, 0.08, 6, 10)
        : new THREE.BoxGeometry(0.28, 0.08, 0.36),
      i % 3 === 0 ? mats.solarGold : isCog ? mats.brass : mats.deepIce
    );
    const ang = (i / 14) * Math.PI * 2;
    const spd = 3.2 + (i % 5) * 1.05;
    pieces.push({
      mesh,
      vx: Math.cos(ang) * spd,
      vy: 3.6 + (i % 4) * 1.15,
      vz: Math.sin(ang) * spd,
    });
    burstGroup.add(mesh);
  }
  return { burstGroup, pieces };
}

function buildOriginTangentStub(mats) {
  const stubGroup = new THREE.Group();
  stubGroup.name = "origin_tangent_stub";
  // 4 compact near-field barrel tangent segments (spanning <= 1.92m = 12% of 16m canyon!)
  const segments = [];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.16, 0.42),
      i % 2 === 0 ? mats.cyanLaser : mats.amberLaser
    );
    seg.name = `origin_tangent_seg_${i}`;
    seg.position.set(0, 1.35, -0.24 - i * 0.44);
    stubGroup.add(seg);
    segments.push(seg);
  }
  return { stubGroup, segments };
}

function buildCommittedTrajectorySpan(mats, name, segCount = 13) {
  const spanGroup = new THREE.Group();
  spanGroup.name = name;
  spanGroup.visible = false;

  const segments = [];
  for (let i = 0; i < segCount; i++) {
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.22, 1.08),
      i % 2 === 0 ? mats.cyanLaser : mats.solarGold
    );
    seg.name = `${name}_seg_${i}`;
    seg.position.set(0, 1.6, -(i + 1) * (CANYON_TARGET_SPAN_M / segCount));
    spanGroup.add(seg);
    segments.push(seg);
  }
  return { spanGroup, segments };
}

export function buildBastionEncounter3DGroup(slot, hasCryoMortar = false) {
  const enc = slot?.encounter || {};
  const spec = resolveBastionBatterySpec(enc);
  const mats = createSharedBatteryMaterials();

  const root = new THREE.Group();
  root.name = `bastion_battery_${enc.nodeId || "W1.1"}`;
  root.position.set(slot.x || 0, slot.y || 0, slot.z || 0);
  root.rotation.y = slot.rotY || 0;
  root.userData = {
    nodeId: enc.nodeId || "W1.1",
    encounterType: enc.encounterType || spec.archetype,
    batteryFamily: spec.batteryFamily,
  };

  slot.batterySpec = spec;
  slot.batteryFamily = spec.batteryFamily;
  slot.archetype = spec.archetype;
  slot.antiScrub = spec.antiScrub;
  slot.hasCryoMortar = Boolean(hasCryoMortar);
  slot.targetSpanMeters = CANYON_TARGET_SPAN_M;
  slot.stubSpanMeters = Number((CANYON_TARGET_SPAN_M * NEAR_FIELD_STUB_MAX_RATIO).toFixed(3));

  // 1. Sacred Temple Sanctuary Frame ("arc_bastion" theme)
  const templeFrame = buildTempleSanctuaryFrame({
    theme: "arc_bastion",
    archetype: spec.archetype,
  });
  slot.templeFrame = templeFrame;
  if (templeFrame && templeFrame.group) {
    root.add(templeFrame.group);
  }

  // 2. Approach Docking Ring in front of the Siege Battery (+5.8m local +Z)
  const dockRing = new THREE.Mesh(
    new THREE.RingGeometry(1.75, 2.15, 28),
    new THREE.MeshBasicMaterial({
      color: 0x7ee8fa,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  dockRing.rotation.x = -Math.PI / 2;
  dockRing.position.set(0, 0.08, 5.8);
  dockRing.name = "battery_dock_ring";
  slot.targetRing = dockRing;
  root.add(dockRing);

  // 3. Family-Specific 3D Siege Battery Architecture (covering all 33 W0.1–W7.4 nodes)
  const familyRoot = new THREE.Group();
  familyRoot.name = `family_${spec.batteryFamily}`;
  root.add(familyRoot);

  slot.extrudedBridge = null;
  slot.fullArch = null;
  slot.originTangentStub = null;
  slot._stubSegments = null;
  slot._bridgeSegments = null;
  slot._dialPreviewUpdater = null;

  let targetZ = -11.5;
  let targetY = 1.6;

  if (
    spec.batteryFamily === "charge_capacitor" ||
    spec.batteryFamily === "cryo_hopper" ||
    spec.batteryFamily === "sub_zero_cannon"
  ) {
    // Charge-Matcher Twin Capacitor Towers & Cryo-Hopper Cannons (+ Gold Solar vs - Deep Ice Coils)
    const plinthL = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.8, 10), mats.slate);
    plinthL.position.set(-2.9, 0.4, -1.2);
    const plinthR = plinthL.clone();
    plinthR.position.x = 2.9;
    familyRoot.add(plinthL, plinthR);

    const varTower = new THREE.Group();
    varTower.name = "solar_ice_capacitor_variable";
    varTower.position.set(-2.9, 0.8, -1.2);
    const solarStack = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 2.2, 12), mats.solarGold);
    solarStack.position.y = 1.1;
    const coilRings = [];
    for (let c = 0; c < 4; c++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.09, 8, 18), mats.brass);
      coil.rotation.x = Math.PI / 2;
      coil.position.y = 0.45 + c * 0.52;
      varTower.add(coil);
      coilRings.push(coil);
    }
    varTower.add(solarStack);

    const refTower = new THREE.Group();
    refTower.name = "solar_ice_capacitor_reference";
    refTower.position.set(2.9, 0.8, -1.2);
    const iceStack = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 2.2, 12), mats.deepIce);
    iceStack.position.y = 1.1;
    for (let c = 0; c < 4; c++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.09, 8, 18), mats.brass);
      coil.rotation.x = Math.PI / 2;
      coil.position.y = 0.45 + c * 0.52;
      refTower.add(coil);
    }
    refTower.add(iceStack);
    familyRoot.add(varTower, refTower);

    if (spec.batteryFamily === "cryo_hopper") {
      const hopper = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 0.95, 1.5, 12), mats.brass);
      hopper.position.set(0, 1.5, -1.8);
      const posOrb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mats.solarGold);
      posOrb.position.set(-0.55, 2.55, -1.8);
      const negOrb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mats.deepIce);
      negOrb.position.set(0.55, 2.55, -1.8);
      familyRoot.add(hopper, posOrb, negOrb);
    } else if (spec.batteryFamily === "sub_zero_cannon") {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.64, 3.2, 12), mats.deepIce);
      barrel.rotation.x = -Math.PI / 3;
      barrel.position.set(0, 1.9, -2.1);
      familyRoot.add(barrel);
    }

    slot._dialPreviewUpdater = (val) => {
      const norm = clampFinite(val / 25, -1.2, 1.6, 0);
      const scaleY = Math.max(0.35, 1.0 + norm * 0.45);
      solarStack.scale.y = scaleY;
      solarStack.position.y = 1.1 * scaleY;
      solarStack.material = val < 0 ? mats.deepIce : mats.solarGold;
    };
  } else if (
    spec.batteryFamily === "clockwork_loom" ||
    spec.batteryFamily === "shield_area_forge" ||
    spec.batteryFamily === "scale_shield_bay"
  ) {
    // Clockwork Gear-Looms & Modular Siege-Shield Frames (W0.4, W2.1–W2.3, W3.4)
    const loomFrame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 1.8), mats.brass);
    loomFrame.position.set(0, 0.35, -1.6);
    familyRoot.add(loomFrame);

    const previewShield = new THREE.Group();
    previewShield.name = "modular_siege_shield_preview";
    previewShield.position.set(0, 2.1, -1.6);
    familyRoot.add(previewShield);

    if (spec.batteryFamily === "clockwork_loom") {
      const gears = [];
      for (let i = 0; i < 4; i++) {
        const cog = new THREE.Mesh(
          new THREE.TorusGeometry(0.48 + i * 0.12, 0.1, 8, 12),
          i === 3 ? mats.solarGold : mats.brass
        );
        cog.position.set(-2.1 + i * 1.4, 1.9, -1.6);
        familyRoot.add(cog);
        gears.push(cog);
      }
      slot._dialPreviewUpdater = (val) => {
        const lastCog = gears[3];
        const s = clampFinite(0.65 + Math.abs(val) * 0.03, 0.5, 1.85, 1);
        lastCog.scale.set(s, s, 1);
        lastCog.rotation.z = val * 0.18;
      };
    } else {
      const slabL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.28), mats.sapphire);
      slabL.position.x = -1.0;
      const slabR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.28), mats.solarGold);
      slabR.position.x = 1.0;
      previewShield.add(slabL, slabR);

      slot._dialPreviewUpdater = (val) => {
        const s = clampFinite(0.6 + Math.sqrt(Math.max(1, Math.abs(val))) * 0.16, 0.55, 1.9, 1);
        previewShield.scale.set(s, s, 1);
      };
    }
  } else if (spec.batteryFamily === "prism_rail_launcher") {
    // Piercing Prism Rail-Launcher (W0.6, W4.1–W4.4) — Strict <= 12% Anti-Scrub Stub Law!
    targetZ = -CANYON_TARGET_SPAN_M;
    targetY = clampFinite(enc?.rampMeta?.targetY ?? 3.2, 0.8, 7.5, 3.2);

    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 0.85, 12), mats.slate);
    turretBase.position.set(0, 0.42, 0);
    const prismCradle = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 1.9), mats.brass);
    prismCradle.position.set(0, 1.15, -0.15);
    familyRoot.add(turretBase, prismCradle);

    if (spec.isTwinSystem) {
      const twinTurret = prismCradle.clone();
      twinTurret.position.set(2.4, 1.15, -0.15);
      familyRoot.add(twinTurret);
    }

    const { stubGroup, segments: stubSegs } = buildOriginTangentStub(mats);
    familyRoot.add(stubGroup);
    slot.originTangentStub = stubGroup;
    slot._stubSegments = stubSegs;

    const { spanGroup, segments: bridgeSegs } = buildCommittedTrajectorySpan(
      mats,
      "extruded_prism_rail_bridge",
      13
    );
    familyRoot.add(spanGroup);
    slot.extrudedBridge = spanGroup;
    slot._bridgeSegments = bridgeSegs;

    slot._dialPreviewUpdater = (val) => {
      const isRampLinear =
        enc?.kind === "ramp_linear" || enc?.generatorType === "ramp_linear";
      const slope =
        isRampLinear && Number.isFinite(enc?.rampMeta?.slope)
          ? Number(enc.rampMeta.slope)
          : clampFinite(val * 0.22, -1.8, 1.8, 0.35);
      const intercept = isRampLinear
        ? clampFinite(val * 0.18, -2.5, 4.5, 1.35)
        : 1.35;

      const stubSample = sampleTrajectoryArc({
        mode: "linear",
        m: slope,
        b: intercept,
        spanX: CANYON_TARGET_SPAN_M,
        sampleCount: stubSegs.length + 1,
        committed: false,
      });
      stubSample.ratio = stubSample.spanRatio;
      slot.lastTrajectorySample = stubSample;

      for (let i = 0; i < stubSegs.length; i++) {
        const pt = stubSample.points[i + 1] || stubSample.points[stubSample.points.length - 1];
        stubSegs[i].position.set(0, clampFinite(pt.y, 0.35, 6.5, 1.35), -pt.x);
        stubSegs[i].rotation.x = Math.atan(slope) * 0.65;
      }
    };
  } else if (
    spec.batteryFamily === "angle_mirror_array" ||
    spec.batteryFamily === "sky_astrolabe" ||
    spec.batteryFamily === "ballista_rangefinder"
  ) {
    // 3D Angle-Mirror Ricochet Array, Brass Sky-Astrolabe & Ballista Rangefinder (W2.4, W5.1–W5.4)
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.4, 1.1, 12), mats.slate);
    pedestal.position.set(0, 0.55, -1.2);
    familyRoot.add(pedestal);

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.12, 10, 32), mats.brass);
    outerRing.position.set(0, 2.85, -1.2);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.09, 10, 28), mats.solarGold);
    innerRing.position.set(0, 2.85, -1.2);
    const pointerArm = new THREE.Group();
    pointerArm.name = "astrolabe_rangefinder_arm";
    pointerArm.position.set(0, 2.85, -1.2);
    const armBar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.16), mats.cyanLaser);
    armBar.position.x = 0.85;
    pointerArm.add(armBar);
    familyRoot.add(outerRing, innerRing, pointerArm);

    slot.astrolabeRings = { core: innerRing, arm: pointerArm };
    slot._dialPreviewUpdater = (val) => {
      const deg = clampFinite(val, -180, 180, 45);
      pointerArm.rotation.z = (deg * Math.PI) / 180;
    };
  } else if (spec.batteryFamily === "parabolic_siege_mortar") {
    // Parabolic Siege Mortar (W6.1, W6.2) — Strict <= 12% Anti-Scrub Stub Law + Root-Splitter Shells!
    targetZ = -CANYON_TARGET_SPAN_M;
    targetY = 1.5;

    const mortarBase = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.6, 0.9, 12), mats.slate);
    mortarBase.position.set(0, 0.45, 0);
    const mortarTube = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.68, 2.1, 14), mats.brass);
    mortarTube.rotation.x = -Math.PI / 4;
    mortarTube.position.set(0, 1.45, -0.35);
    familyRoot.add(mortarBase, mortarTube);

    if (spec.isRootSplitter) {
      const rootPadL = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.35, 20), mats.solarGold);
      rootPadL.rotation.x = -Math.PI / 2;
      rootPadL.position.set(-2.6, 0.12, -12.5);
      const rootPadR = rootPadL.clone();
      rootPadR.position.x = 2.6;
      familyRoot.add(rootPadL, rootPadR);
    }

    const { stubGroup, segments: stubSegs } = buildOriginTangentStub(mats);
    familyRoot.add(stubGroup);
    slot.originTangentStub = stubGroup;
    slot._stubSegments = stubSegs;

    const { spanGroup, segments: archSegs } = buildCommittedTrajectorySpan(
      mats,
      "parabolic_mortar_full_arch",
      15
    );
    familyRoot.add(spanGroup);
    slot.fullArch = spanGroup;
    slot.extrudedBridge = spanGroup;
    slot._bridgeSegments = archSegs;

    slot._dialPreviewUpdater = (val) => {
      const peakK = clampFinite(2.8 + val * 0.16, 1.4, 8.2, 4.5);
      const hMid = CANYON_TARGET_SPAN_M * 0.5;
      const aCoeff = -(peakK - 1.35) / (hMid * hMid);

      const stubSample = sampleTrajectoryArc({
        mode: "quadratic_vertex",
        a: aCoeff,
        h: hMid,
        k: peakK,
        spanX: CANYON_TARGET_SPAN_M,
        sampleCount: stubSegs.length + 1,
        committed: false,
      });
      stubSample.ratio = stubSample.spanRatio;
      slot.lastTrajectorySample = stubSample;

      for (let i = 0; i < stubSegs.length; i++) {
        const pt = stubSample.points[i + 1] || stubSample.points[stubSample.points.length - 1];
        stubSegs[i].position.set(0, clampFinite(pt.y, 0.4, 8.5, 1.5), -pt.x);
      }
    };
  } else if (spec.batteryFamily === "armor_slab_forge") {
    // 3D Completing-the-Square Armor Slab Forge (W6.3)
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 4.6), mats.slate);
    anvil.position.set(0, 0.25, -2.0);
    const coreSquare = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.36, 2.1), mats.sapphire);
    coreSquare.position.set(-0.65, 0.68, -1.45);
    const flankA = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.36, 2.1), mats.brass);
    flankA.position.set(1.02, 0.68, -1.45);
    const flankB = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.36, 1.1), mats.brass);
    flankB.position.set(-0.65, 0.68, -3.12);
    const cornerPatch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 1.1), mats.solarGold);
    cornerPatch.name = "completing_square_keystone";
    cornerPatch.position.set(1.02, 1.25, -3.12);
    familyRoot.add(anvil, coreSquare, flankA, flankB, cornerPatch);

    slot._dialPreviewUpdater = (val) => {
      const s = clampFinite(0.45 + Math.sqrt(Math.max(0.25, Math.abs(val))) * 0.22, 0.4, 1.75, 1);
      cornerPatch.scale.set(s, 1, s);
    };
  } else if (spec.batteryFamily === "resonance_tesla_tower") {
    // 2^n Resonance Tesla Towers (W7.1, W7.2)
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 5.2, 12), mats.sapphire);
    spire.position.set(0, 2.6, -1.8);
    familyRoot.add(spire);

    const teslaRings = [];
    for (let r = 0; r < 5; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.65 - r * 0.22, 0.08, 8, 24),
        r % 2 === 0 ? mats.deepIce : mats.solarGold
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 1.0 + r * 0.92, -1.8);
      familyRoot.add(ring);
      teslaRings.push(ring);
    }
    slot._dialPreviewUpdater = (val) => {
      const activeStages = clampFinite(Math.round(Math.abs(val)), 1, 5, 2);
      teslaRings.forEach((ring, idx) => {
        const lit = idx < activeStages;
        ring.scale.setScalar(lit ? 1.16 : 0.88);
      });
    };
  } else if (spec.batteryFamily === "harmonic_wave_piston") {
    // Harmonic Wave Pistons (W7.3) — Near-field tangent stub pre-commit!
    targetZ = -CANYON_TARGET_SPAN_M;
    const bank = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.65, 1.6), mats.brass);
    bank.position.set(0, 0.35, 0);
    familyRoot.add(bank);

    const { stubGroup, segments: stubSegs } = buildOriginTangentStub(mats);
    familyRoot.add(stubGroup);
    slot.originTangentStub = stubGroup;
    slot._stubSegments = stubSegs;

    const { spanGroup, segments: waveSegs } = buildCommittedTrajectorySpan(
      mats,
      "harmonic_wave_extruded_bridge",
      14
    );
    familyRoot.add(spanGroup);
    slot.extrudedBridge = spanGroup;
    slot._bridgeSegments = waveSegs;

    slot._dialPreviewUpdater = (val) => {
      const ampSlope = clampFinite(val * 0.25, -1.6, 1.6, 0.5);
      const stubSample = sampleTrajectoryArc({
        mode: "linear",
        m: ampSlope,
        b: 1.5,
        spanX: CANYON_TARGET_SPAN_M,
        sampleCount: stubSegs.length + 1,
        committed: false,
      });
      stubSample.ratio = stubSample.spanRatio;
      slot.lastTrajectorySample = stubSample;
      for (let i = 0; i < stubSegs.length; i++) {
        const pt = stubSample.points[i + 1] || stubSample.points[stubSample.points.length - 1];
        stubSegs[i].position.set(0, clampFinite(pt.y, 0.4, 6.5, 1.5), -pt.x);
      }
    };
  } else {
    // 90-Degree Quarter-Turn i-Prism Portal (W7.4 complex_i_rotation)
    const compass = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.14, 10, 32), mats.brass);
    compass.rotation.x = Math.PI / 2;
    compass.position.set(0, 0.45, -2.0);
    familyRoot.add(compass);

    for (let q = 0; q < 4; q++) {
      const ang = (q * Math.PI) / 2;
      const pylon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 0),
        q % 2 === 0 ? mats.solarGold : mats.deepIce
      );
      pylon.position.set(Math.cos(ang) * 2.4, 0.95, -2.0 - Math.sin(ang) * 2.4);
      familyRoot.add(pylon);
    }

    const portalBeam = new THREE.Group();
    portalBeam.name = "quarter_turn_i_prism_arm";
    portalBeam.position.set(0, 0.95, -2.0);
    const lance = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.22), mats.cyanLaser);
    lance.position.x = 1.1;
    portalBeam.add(lance);
    familyRoot.add(portalBeam);

    slot._dialPreviewUpdater = (val) => {
      const quarterTurns = Math.round(clampFinite(val, -12, 12, 0));
      portalBeam.rotation.y = quarterTurns * (Math.PI / 2);
    };
  }

  // 4. Target Clockwork Contraption + Gear-Burst + Cryo-Gel Miss-Splatter Rig
  slot.targetContraption = buildTargetClockworkContraption(mats, targetZ, targetY);
  root.add(slot.targetContraption);

  const burstBuilt = buildGearBurstCluster(mats, targetZ, targetY);
  slot.gearBurstGroup = burstBuilt.burstGroup;
  slot.gearBurstPieces = burstBuilt.pieces;
  slot.gearBurstAnim = 0;
  root.add(slot.gearBurstGroup);

  const splatBuilt = buildCryoSplatterAndCaliperRig(mats);
  slot.cryoGelSplat = splatBuilt.splatGroup;
  slot.missDeltaCaliper = splatBuilt.caliperGroup;
  slot._caliperStem = splatBuilt.stem;
  slot._caliperTop = splatBuilt.capTop;
  slot._caliperBot = splatBuilt.capBot;
  slot.cryoGelShell = splatBuilt.shellMesh;
  slot.shellAnim = null;
  root.add(slot.cryoGelSplat, slot.missDeltaCaliper, slot.cryoGelShell);

  // Initialize pre-commit preview at 0
  updateBastionEncounterDialPreview(slot, 0);

  return root;
}

export function updateBastionEncounterDialPreview(slot, numericValue = 0) {
  if (!slot) return null;
  const val = clampFinite(numericValue, -10000, 10000, 0);
  slot.dialPreviewValue = val;
  if (typeof slot._dialPreviewUpdater === "function") {
    slot._dialPreviewUpdater(val);
  }
  return slot.lastTrajectorySample || null;
}

export function triggerBastionTwinBeamFX(slot, isRepel = false) {
  if (!slot || !slot.group) return;
  slot.repelPulseTimer = isRepel ? 0.45 : 0.25;
}

export function applyBastionEncounterCommitFX(slot, result = {}, enc = null, opts = {}) {
  if (!slot) return null;
  const safeRes = result && typeof result === "object" ? result : {};
  const activeEnc = enc && typeof enc === "object" ? enc : slot.encounter || {};
  const outcome = String(safeRes.outcome || "clear");
  const hasCryoMortar = Boolean(opts.hasCryoMortar ?? slot.hasCryoMortar);

  if (outcome === "miss_animate" || outcome === "nudge") {
    const targetVal = Number.isFinite(Number(safeRes.targetValue))
      ? Number(safeRes.targetValue)
      : Number.isFinite(Number(activeEnc.answer))
      ? Number(activeEnc.answer)
      : 0;
    const submittedVal = Number.isFinite(Number(safeRes.committedValue))
      ? Number(safeRes.committedValue)
      : Number.isFinite(Number(safeRes.submittedValue))
      ? Number(safeRes.submittedValue)
      : Number.isFinite(Number(safeRes.delta))
      ? targetVal + Number(safeRes.delta)
      : Number.isFinite(Number(slot.dialPreviewValue)) && slot.dialPreviewValue !== targetVal
      ? Number(slot.dialPreviewValue)
      : targetVal + 4;

    const splatZ = slot.antiScrub ? -CANYON_TARGET_SPAN_M : -11.5;
    const splat = computeCoordinateSplatter({
      committedValue: submittedVal,
      answer: targetVal,
      targetX: 0,
      targetY: 2.0,
      scaleY: 0.35,
    });
    const splatY = Math.max(0.12, splat.impactY);
    const caliperMidY = Math.max(0.5, (splat.impactY + splat.targetY) * 0.5);
    splat.splatX = splat.impactX;
    splat.splatY = splat.impactY;
    splat.splatZ = splatZ;
    splat.caliperMidY = caliperMidY;
    slot.lastSplatter = splat;

    if (slot.cryoGelSplat) {
      const poolScale = hasCryoMortar ? 1.55 : 1.0;
      slot.cryoGelSplat.position.set(splat.impactX, splatY, splatZ);
      slot.cryoGelSplat.scale.set(poolScale, 1, poolScale);
      slot.cryoGelSplat.visible = true;
    }

    if (slot.missDeltaCaliper) {
      const h = Math.max(0.45, splat.caliperHeight);
      slot.missDeltaCaliper.position.set(splat.impactX, caliperMidY, splatZ);
      if (slot._caliperStem) slot._caliperStem.scale.set(1, h, 1);
      if (slot._caliperTop) slot._caliperTop.position.y = h * 0.5;
      if (slot._caliperBot) slot._caliperBot.position.y = -h * 0.5;
      slot.missDeltaCaliper.visible = true;
    }

    if (slot.cryoGelShell) {
      slot.cryoGelShell.visible = true;
      slot.cryoGelShell.position.set(0, 1.5, 0);
      slot.shellAnim = {
        t: 0,
        dur: 0.42,
        endX: splat.impactX,
        endY: splatY,
        endZ: splatZ,
      };
    }

    return {
      cleared: false,
      outcome,
      splatter: splat,
    };
  }

  if (outcome === "clear" || outcome === "warm_reveal") {
    slot.cleared = true;
    slot.templeFrame?.setAwakened?.(true, Boolean(safeRes.overdrive));
    if (slot.cryoGelSplat) slot.cryoGelSplat.visible = false;
    if (slot.missDeltaCaliper) slot.missDeltaCaliper.visible = false;
    if (slot.cryoGelShell) slot.cryoGelShell.visible = false;

    // Reveal 100% full canyon rail / mortar trajectory ONLY AFTER COMMIT!
    if (slot.antiScrub && slot._bridgeSegments) {
      const isParabola = slot.batteryFamily === "parabolic_siege_mortar";
      const fullSample = sampleTrajectoryArc(
        isParabola
          ? {
              mode: "quadratic_vertex",
              a: -0.05,
              h: CANYON_TARGET_SPAN_M * 0.5,
              k: 4.6,
              spanX: CANYON_TARGET_SPAN_M,
              sampleCount: slot._bridgeSegments.length + 1,
              committed: true,
            }
          : {
              mode: "linear",
              m: 0.16,
              b: 1.4,
              spanX: CANYON_TARGET_SPAN_M,
              sampleCount: slot._bridgeSegments.length + 1,
              committed: true,
            }
      );
      fullSample.ratio = fullSample.spanRatio;
      slot.lastTrajectorySample = fullSample;

      for (let i = 0; i < slot._bridgeSegments.length; i++) {
        const pt = fullSample.points[i + 1] || fullSample.points[fullSample.points.length - 1];
        slot._bridgeSegments[i].position.set(0, clampFinite(pt.y, 0.5, 8.5, 2.0), -pt.x);
      }
      if (slot.extrudedBridge) slot.extrudedBridge.visible = true;
      if (slot.fullArch) slot.fullArch.visible = true;
    }

    // Explosive Gear-Burst on the target Clockwork Contraption!
    if (slot.targetContraption) {
      slot.targetContraption.visible = false;
    }
    if (slot.gearBurstGroup) {
      slot.gearBurstGroup.visible = true;
      slot.gearBurstAnim = 0.001;
      for (const p of slot.gearBurstPieces || []) {
        p.mesh.position.set(0, 0, 0);
      }
    }

    const genKind = String(activeEnc.kind || activeEnc.generatorType || "");
    const mysteryId =
      activeEnc.nodeId === "W5.2" || genKind === "geo_astrolabe_thales"
        ? "astrolabe_lock"
        : null;

    return {
      cleared: true,
      outcome,
      overdrive: Boolean(safeRes.overdrive),
      mysteryId,
      mosaicForged: activeEnc.nodeId === "W6.3" || genKind === "quad_complete_sq",
      subZeroClear:
        activeEnc.nodeId === "W1.2" ||
        activeEnc.nodeId === "W1.3" ||
        genKind === "eq_subzero_extreme",
    };
  }

  return { cleared: false, outcome };
}

export function updateBastionEncounterAnimations(gateSlots = [], dt = 0.016, elapsed = 0) {
  if (!Array.isArray(gateSlots) || !(dt > 0)) return;
  for (const slot of gateSlots) {
    if (!slot) continue;
    if (slot.templeFrame) {
      stepTempleSanctuaryFrame(slot.templeFrame, dt, elapsed);
    }
    if (slot.targetRing) {
      slot.targetRing.rotation.z += dt * 0.95;
    }
    if (slot.targetContraption && slot.targetContraption.visible) {
      slot.targetContraption.rotation.y = Math.sin(elapsed * 1.8 + (slot.index || 0)) * 0.25;
    }
    if (slot.shellAnim && slot.cryoGelShell) {
      slot.shellAnim.t += dt;
      const u = Math.min(1, slot.shellAnim.t / slot.shellAnim.dur);
      const arc = 4 * 2.8 * u * (1 - u);
      slot.cryoGelShell.position.set(
        slot.shellAnim.endX * u,
        1.5 + (slot.shellAnim.endY - 1.5) * u + arc,
        slot.shellAnim.endZ * u
      );
      if (u >= 1) {
        slot.cryoGelShell.visible = false;
        slot.shellAnim = null;
      }
    }
    if (slot.gearBurstAnim > 0 && slot.gearBurstAnim < 1.8 && slot.gearBurstPieces) {
      slot.gearBurstAnim += dt;
      const t = slot.gearBurstAnim;
      for (const p of slot.gearBurstPieces) {
        p.mesh.position.set(
          p.vx * t,
          Math.max(-1.4, p.vy * t - 6.8 * t * t),
          p.vz * t
        );
        p.mesh.rotation.x = t * 5.2;
        p.mesh.rotation.y = t * 6.4;
      }
      if (t >= 1.8 && slot.gearBurstGroup) {
        slot.gearBurstGroup.visible = false;
      }
    }
  }
}

export class BastionEncounters3D {
  constructor(opts = {}) {
    this.scene = opts?.scene || null;
  }

  buildBatterySlot(slot, hasCryoMortar = false) {
    return buildBastionEncounter3DGroup(slot, hasCryoMortar);
  }

  updateDialPreview(slot, value) {
    return updateBastionEncounterDialPreview(slot, value);
  }

  playCommitVisual(slot, result, enc, opts) {
    return applyBastionEncounterCommitFX(slot, result, enc, opts);
  }

  update(gateSlots, dt, elapsed) {
    updateBastionEncounterAnimations(gateSlots, dt, elapsed);
  }
}
