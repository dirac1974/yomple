/**
 * Frostwake Modular 3D Encounter Set-Pieces (W0.1 through W7.4)
 * Enforces the <= 15% Near-Field Origin Stub anti-scrub law, renders physical
 * 3D structure for all 33 nodes without generic tower fallbacks, and animates
 * universal delta-Y laser calipers, sign-flip sky-pillars, and dual-rig collisions.
 */

import * as THREE from "../vendor/three.module.min.js";

export const CHASM_SPAN_M = 16.0;
export const STUB_MAX_SPAN_M = 2.0; // 12.5% <= 15% of 16.0m chasm span

const NODE_FAMILY_BY_ID = {
  "W0.1": "eq_add",
  "W0.2": "eq_subzero_extreme",
  "W0.3": "int_polarity",
  "W0.4": "seq_linear",
  "W0.5": "eq_twostep",
  "W0.6": "ramp_linear",
  "W1.1": "eq_cross_zero",
  "W1.2": "eq_subzero_extreme",
  "W1.3": "int_double_neg",
  "W1.4": "int_polarity",
  "W2.1": "seq_linear",
  "W2.2": "expr_distribute",
  "W2.3": "exp_power",
  "W2.4": "geo_parallel_angles",
  "W3.1": "eq_twostep_camo",
  "W3.2": "eq_parens",
  "W3.3": "eq_both_sides",
  "W3.4": "geo_scale_area",
  "W4.1": "ramp_slope_only",
  "W4.2": "ramp_linear",
  "W4.3": "ramp_point_target",
  "W4.4": "sys_intersection",
  "W5.1": "geo_triangle_truss",
  "W5.2": "geo_astrolabe_thales",
  "W5.3": "geo_pythagoras",
  "W5.4": "harpoon_ratio",
  "W6.1": "arch_vertex_eval",
  "W6.2": "arch_roots",
  "W6.3": "quad_complete_sq",
  "W7.1": "exp_growth",
  "W7.2": "log_stage",
  "W7.3": "harmonic_wave_crest",
  "W7.4": "complex_i_rotation",
};

export const QUADRANT_BEACON_COORDS = [
  { id: "whale_ne", x: 34, z: -34 },
  { id: "whale_nw", x: -34, z: -34 },
  { id: "whale_sw", x: -34, z: 34 },
  { id: "whale_se", x: 34, z: 34 },
];

const SUPERSCRIPT_DIGITS = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function hasFiniteNum(val) {
  if (val === null || val === undefined || typeof val === "boolean" || typeof val === "symbol") {
    return false;
  }
  if (typeof val === "string" && val.trim() === "") return false;
  try {
    return Number.isFinite(Number(val));
  } catch (_) {
    return false;
  }
}

function safeNum(val, defaultVal = 0) {
  return hasFiniteNum(val) ? Number(val) : defaultVal;
}

function clampFinite(val, lo, hi, defaultVal = 0) {
  return clamp(safeNum(val, defaultVal), lo, hi);
}

export function parseIPortalQuarterTurns(pm = {}) {
  if (!pm || typeof pm !== "object") return 2;
  if (hasFiniteNum(pm.quarterTurns) && Number(pm.quarterTurns) > 0) {
    return clamp(Math.round(Number(pm.quarterTurns)), 1, 8);
  }
  const ip = pm.iPower;
  if (hasFiniteNum(ip) && Number(ip) > 0) {
    return clamp(Math.round(Number(ip)), 1, 8);
  }
  if (typeof ip === "string") {
    const norm = ip
      .trim()
      .toLowerCase()
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_DIGITS[ch] || "");
    if (/^[+×*x\s]*i$/.test(norm)) return 1;
    const m = norm.match(/i\s*\^?\s*(\d+)/);
    if (m) {
      const parsed = Number(m[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        return clamp(Math.round(parsed), 1, 8);
      }
    }
  }
  if (hasFiniteNum(pm.quarterTurns)) {
    return clamp(Math.round(Number(pm.quarterTurns)), 1, 8);
  }
  return 2;
}

export function resolveEncounterKind(enc) {
  if (!enc || typeof enc !== "object") return "eq_add";
  if (
    enc.nodeId === "W7.4" ||
    enc.kind === "complex_i_rotation" ||
    enc.portalMeta ||
    enc.iPortalMeta ||
    enc.complexMeta
  ) {
    return "complex_i_rotation";
  }
  const rawKind = typeof enc.kind === "string" ? enc.kind : "";
  if (rawKind.endsWith("_ratio")) return "harpoon_ratio";
  if (rawKind.endsWith("_wave_crest") || enc.archMeta?.isWave) return "harmonic_wave_crest";
  if (rawKind) return rawKind;
  if (enc.nodeId && NODE_FAMILY_BY_ID[enc.nodeId]) {
    return NODE_FAMILY_BY_ID[enc.nodeId];
  }
  if (enc.archMeta) return "arch_vertex_eval";
  if (enc.rampMeta?.isSystem) return "sys_intersection";
  if (enc.rampMeta?.solveForB) return "ramp_point_target";
  if (enc.rampMeta) return "ramp_linear";
  if (enc.harpoonMeta) return "geo_pythagoras";
  if (enc.astrolabeMeta?.mode === "truss") return "geo_triangle_truss";
  if (enc.astrolabeMeta?.mode === "thales") return "geo_astrolabe_thales";
  if (enc.astrolabeMeta) return "geo_parallel_angles";
  if (enc.patternMeta) return "seq_linear";
  return "eq_add";
}

export function normalizeSystemMeta(enc, slot) {
  if (slot && slot.initialSystemMeta) return slot.initialSystemMeta;
  const safeEnc = enc && typeof enc === "object" ? enc : {};
  if (safeEnc.rampMeta && typeof safeEnc.rampMeta === "object" && safeEnc.rampMeta.isSystem) {
    const rm = safeEnc.rampMeta;
    const m = clampFinite(rm.m, -1000, 1000, 3);
    const b = clampFinite(rm.b, -10000, 10000, 1);
    const m2 = clampFinite(rm.m2, -1000, 1000, 1);
    const b2 = clampFinite(rm.b2, -10000, 10000, 5);
    const defaultX = clampFinite(safeEnc.answer, -1000, 1000, 2);
    const targetX = clampFinite(rm.targetX, -1000, 1000, defaultX);
    const targetY = clampFinite(rm.targetY, -100000, 100000, m * targetX + b);
    return { ...rm, m, b, m2, b2, targetX, targetY, isSystem: true };
  }
  const m1 = clampFinite(safeEnc.left?.a, -1000, 1000, 3);
  const b1 = clampFinite(safeEnc.left?.b, -10000, 10000, 1);
  const m2 = clampFinite(safeEnc.right?.a, -1000, 1000, 1);
  const b2 = clampFinite(safeEnc.right?.b, -10000, 10000, 5);
  const targetX = clampFinite(safeEnc.answer, -1000, 1000, 2);
  const targetY = clampFinite(m1 * targetX + b1, -100000, 100000, 7);
  return { m: m1, b: b1, m2, b2, targetX, targetY, isSystem: true };
}

function createCaliperBar(g) {
  const caliper = new THREE.Group();
  caliper.name = "delta_y_caliper";
  caliper.visible = false;

  const mat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8), mat);
  shaft.name = "caliper_shaft";
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.35), mat);
  capTop.position.y = 0.5;
  capTop.name = "caliper_cap_top";
  const capBot = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.35), mat);
  capBot.position.y = -0.5;
  capBot.name = "caliper_cap_bot";

  caliper.add(shaft, capTop, capBot);
  caliper.position.set(0, 3.0, 0.45);
  g.add(caliper);
  return caliper;
}

function setCaliperVerticalSpan(slot, yA, yB, zPos = 0.45) {
  if (!slot || !slot.caliperMesh) return;
  const safeYA = clampFinite(yA, -50, 50, 2.0);
  const safeYB = clampFinite(yB, -50, 50, 3.0);
  const safeZ = clampFinite(zPos, -50, 50, 0.45);
  const lo = Math.min(safeYA, safeYB);
  const hi = Math.max(safeYA, safeYB);
  const span = Math.max(0.4, hi - lo);
  const mid = (lo + hi) * 0.5;
  slot.caliperSpan = span;
  slot.caliperMesh.position.set(0, mid, safeZ);
  const shaft = slot.caliperMesh.getObjectByName("caliper_shaft");
  const top = slot.caliperMesh.getObjectByName("caliper_cap_top");
  const bot = slot.caliperMesh.getObjectByName("caliper_cap_bot");
  if (shaft) shaft.scale.set(1, span, 1);
  if (top) top.position.y = span * 0.5;
  if (bot) bot.position.y = -span * 0.5;
  slot.caliperMesh.visible = true;
}

export function buildEncounter3DGroup(slot) {
  if (!slot || typeof slot !== "object") return new THREE.Group();
  const enc = slot.encounter && typeof slot.encounter === "object" ? slot.encounter : {};
  const kind = resolveEncounterKind(enc);
  slot.resolvedKind = kind;

  const g = new THREE.Group();
  g.position.set(
    clampFinite(slot.x, -200, 200, 0),
    clampFinite(slot.y, -50, 100, 0),
    clampFinite(slot.z, -200, 200, -11)
  );
  g.rotation.y = clampFinite(slot.rotY, -Math.PI * 4, Math.PI * 4, 0);
  g.userData = { nodeId: enc.nodeId || "W0.1", kind };

  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(5.6, 6.4, 36),
    new THREE.MeshBasicMaterial({
      color: 0x3bf0c5,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
  );
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(0, 0.52, 6.5);
  g.add(padRing);

  const isWarmBeacon =
    enc.encounterType === "holo_ramp" ||
    enc.encounterType === "rainbow_arch" ||
    kind === "complex_i_rotation";
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.55, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: isWarmBeacon ? 0xffd166 : 0x45f0df,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beacon.position.set(0, 13, 0);
  g.add(beacon);

  slot.caliperMesh = createCaliperBar(g);
  slot.caliperSpan = 0;

  if (kind === "complex_i_rotation") {
    populateIPortalRingMesh(g, enc, slot);
  } else if (
    kind === "seq_linear" ||
    kind === "exp_power" ||
    kind === "exp_growth" ||
    kind === "log_stage" ||
    enc.encounterType === "aurora_cascade"
  ) {
    populateAuroraCascadeMesh(g, enc, slot, kind);
  } else if (kind === "expr_distribute") {
    populateDistributiveGateMesh(g, enc, slot);
  } else if (kind === "quad_complete_sq") {
    populateSquareSlabForgeMesh(g, enc, slot);
  } else if (kind === "geo_triangle_truss") {
    populateCrystalTrussMesh(g, enc, slot);
  } else if (
    kind === "ramp_slope_only" ||
    kind === "ramp_linear" ||
    kind === "ramp_point_target" ||
    kind === "sys_intersection" ||
    kind === "arch_vertex_eval" ||
    kind === "arch_roots" ||
    kind === "harmonic_wave_crest" ||
    enc.encounterType === "holo_ramp" ||
    enc.encounterType === "rainbow_arch"
  ) {
    populateRampOrArchMesh(g, enc, slot, kind);
  } else if (
    kind === "geo_pythagoras" ||
    kind === "harpoon_ratio" ||
    enc.encounterType === "harpoon_cliff"
  ) {
    populateHarpoonCliffMesh(g, enc, slot);
  } else if (
    kind === "geo_parallel_angles" ||
    kind === "geo_scale_area" ||
    kind === "geo_astrolabe_thales" ||
    enc.encounterType === "astrolabe_shrine"
  ) {
    populateAstrolabeMesh(g, enc, slot, kind);
  } else {
    populateCryoTowersMesh(g, enc, slot, kind);
  }

  return g;
}

function populateCryoTowersMesh(g, enc, slot, kind) {
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffcf56,
    emissive: 0xd98a16,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0x48b8ff,
    emissive: 0x1665c1,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x45f0df,
    emissive: 0x1cb5a3,
    emissiveIntensity: 0.85,
    roughness: 0.15,
  });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffae42 });

  const defaultAns = clampFinite(enc.answer, -10000, 10000, 6);
  const rawTowers = enc.towers && typeof enc.towers === "object" ? enc.towers : null;
  const towers = {
    leftA: clampFinite(rawTowers ? rawTowers.leftA : enc.left?.a, -1000, 1000, 1),
    leftB: clampFinite(rawTowers ? rawTowers.leftB : enc.left?.b, -10000, 10000, 0),
    rightA: clampFinite(rawTowers ? rawTowers.rightA : enc.right?.a, -1000, 1000, 0),
    rightB: clampFinite(rawTowers ? rawTowers.rightB : enc.right?.b, -10000, 10000, defaultAns),
  };

  slot.towerClusters = [];

  const buildStack = (side, xPos, varCount, constVal, groupedMeta = null) => {
    const towerRoot = new THREE.Group();
    towerRoot.position.set(xPos, 0, 0);
    g.add(towerRoot);

    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 2.15, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x1d3554, roughness: 0.5 })
    );
    ped.position.y = 0.5;
    towerRoot.add(ped);

    const hasBoth = (varCount || 0) !== 0 && (constVal || 0) !== 0;
    const baseVarX = hasBoth ? -0.95 : 0;
    const baseConstX = hasBoth ? 0.95 : 0;

    const varClusterGroup = new THREE.Group();
    varClusterGroup.position.set(baseVarX, 1.25, 0);
    varClusterGroup.userData = { clusterType: "var_cores" };
    const vVis = Math.min(6, Math.abs(varCount || 0));
    for (let i = 0; i < vVis; i++) {
      const oct = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.58, 0),
        varCount < 0 ? iceMat : coreMat
      );
      oct.position.y = i * 1.08;
      varClusterGroup.add(oct);
    }
    towerRoot.add(varClusterGroup);

    const constClusterGroup = new THREE.Group();
    constClusterGroup.position.set(baseConstX, 1.25, 0);
    constClusterGroup.userData = { clusterType: "const_cubes" };
    if (constVal !== 0) {
      const divisor = Math.abs(constVal) >= 40 ? 25 : 3;
      const cVis = Math.min(7, Math.max(1, Math.round(Math.abs(constVal) / divisor)));
      for (let j = 0; j < cVis; j++) {
        const blk = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.68, 0.95),
          constVal > 0 ? goldMat : iceMat
        );
        blk.position.y = j * 0.78;
        constClusterGroup.add(blk);
      }
    }
    towerRoot.add(constClusterGroup);

    if (groupedMeta) {
      const bracket = new THREE.Mesh(
        new THREE.TorusGeometry(1.75, 0.08, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.75 })
      );
      bracket.position.y = 2.4;
      towerRoot.add(bracket);
    }

    const sparkMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), sparkMat);
    sparkMesh.position.set(0, 2.1, 0.45);
    sparkMesh.visible = false;
    towerRoot.add(sparkMesh);

    slot.towerClusters.push({
      side,
      towerRoot,
      varClusterGroup,
      constClusterGroup,
      baseVarX,
      baseConstX,
      hasBoth,
      sparkMesh,
    });
  };

  buildStack("left", -4.2, towers.leftA, towers.leftB, enc.left?.grouped || null);
  buildStack("right", 4.2, towers.rightA, towers.rightB, enc.right?.grouped || null);

  if (kind === "int_double_neg") {
    const siphonTube = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.14, 10, 24, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x5ce1e6 })
    );
    siphonTube.position.set(0, 5.4, 0);
    g.add(siphonTube);
  } else if (kind === "int_polarity") {
    const mirrorRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.12, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    mirrorRing.position.set(0, 5.6, 0);
    g.add(mirrorRing);
  }

  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 5.2, 0.45),
    new THREE.MeshStandardMaterial({
      color: 0x7ceeff,
      emissive: 0x1f8ea8,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.62,
      roughness: 0.12,
    })
  );
  barrier.position.set(0, 3.0, 0);
  g.add(barrier);
  slot.barrierMesh = barrier;
}

function populateAuroraCascadeMesh(g, enc, slot, kind) {
  const pedGeo = new THREE.CylinderGeometry(1.15, 1.35, 0.65, 8);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x1c3554, roughness: 0.5 });

  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 4.6, 0.38),
    new THREE.MeshStandardMaterial({
      color: 0x62f5e4,
      emissive: 0x1cb5a3,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.52,
    })
  );
  barrier.position.set(0, 2.8, -0.8);
  g.add(barrier);
  slot.barrierMesh = barrier;

  if (kind === "seq_linear" || enc.patternMeta) {
    const pm = enc.patternMeta && typeof enc.patternMeta === "object" ? enc.patternMeta : {};
    const stepGrowth = clampFinite(pm.stepGrowth ?? pm.m ?? pm.a, -100, 100, 3);
    const baseCount = clampFinite(pm.baseCount ?? pm.b, -100, 100, 2);
    const targetStep = clampFinite(pm.targetStep, 1, 1000, 10);
    const absBase = Math.min(8, Math.round(Math.abs(baseCount)));
    const perRow = Math.min(8, Math.max(1, Math.round(Math.abs(stepGrowth))));

    const baseStoneMat = new THREE.MeshStandardMaterial({
      color: baseCount >= 0 ? 0xffcf56 : 0x48b8ff,
      emissive: baseCount >= 0 ? 0xd98a16 : 0x1665c1,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    });
    const growthMat = new THREE.MeshStandardMaterial({
      color: 0x45f0df,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.85,
      roughness: 0.15,
    });

    slot.cascadePedestals = [];
    const xCoords = [-5.4, -1.8, 1.8, 5.4];

    for (let pIdx = 0; pIdx < 4; pIdx++) {
      const pedGroup = new THREE.Group();
      pedGroup.position.set(xCoords[pIdx], 0, 0);
      pedGroup.userData = { pedestalIndex: pIdx, frameStep: pIdx < 3 ? pIdx + 1 : targetStep };

      const pedMesh = new THREE.Mesh(pedGeo, pedMat);
      pedMesh.position.y = 0.35;
      pedGroup.add(pedMesh);

      let curY = 0.9;
      for (let b = 0; b < absBase; b++) {
        const stone = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.32, 0.46), baseStoneMat);
        const col = b % 2;
        const layer = Math.floor(b / 2);
        stone.position.set((col - 0.5) * 0.54, curY + layer * 0.36, 0);
        stone.userData = { partType: "base_stone", signedBase: baseCount };
        pedGroup.add(stone);
      }
      curY += Math.ceil(absBase / 2) * 0.38 + 0.25;

      if (pIdx < 3) {
        const stepNum = pIdx + 1;
        for (let r = 0; r < stepNum; r++) {
          const rowGroup = new THREE.Group();
          rowGroup.position.set(0, curY + r * 0.62, 0);
          rowGroup.userData = { partType: "growth_row", rowNumber: r + 1, perRow };
          for (let c = 0; c < perRow; c++) {
            const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.23, 0), growthMat);
            const spanOffset = (c - (perRow - 1) * 0.5) * 0.36;
            prism.position.set(spanOffset, 0, 0);
            prism.userData = { partType: "growth_crystal" };
            rowGroup.add(prism);
          }
          pedGroup.add(rowGroup);
        }
      } else {
        const targetHalo = new THREE.Mesh(
          new THREE.TorusGeometry(0.95, 0.1, 10, 24),
          new THREE.MeshBasicMaterial({ color: 0xffd166 })
        );
        targetHalo.position.y = curY + 1.4;
        targetHalo.userData = { partType: "target_frame_halo" };
        pedGroup.add(targetHalo);
      }

      g.add(pedGroup);
      slot.cascadePedestals.push(pedGroup);
    }
    return;
  }

  // Exponential / Logarithmic Bioluminescent Mycelium Cascade (W2.3, W7.1, W7.2)
  const eq = typeof enc.equationText === "string" ? enc.equationText : "";
  let a0 = 1;
  let base = 2;
  let isLog = kind === "log_stage";

  if (
    (enc.expMeta && typeof enc.expMeta === "object") ||
    (enc.growthMeta && typeof enc.growthMeta === "object")
  ) {
    const gm =
      (enc.expMeta && typeof enc.expMeta === "object" ? enc.expMeta : null) || enc.growthMeta;
    a0 = clampFinite(gm.a0, 1, 100, 1);
    base = clampFinite(gm.base ?? gm.ratio, 2, 20, 2);
  } else if (isLog) {
    const mLog = eq.match(/log_?(\d+)/i);
    base = mLog ? clampFinite(mLog[1], 2, 20, 2) : 2;
    a0 = 1;
  } else if (kind === "exp_growth") {
    const mGrow = eq.match(/(\d+)\s*[·*×x]\s*\(?(\d+)/i);
    if (mGrow) {
      a0 = clampFinite(mGrow[1], 1, 100, 1);
      base = clampFinite(mGrow[2], 2, 20, 2);
    }
  } else {
    const mPow = eq.match(/(\d+)\s*\^\s*(\d+)/);
    if (mPow) {
      base = clampFinite(mPow[1], 2, 20, 2);
    }
  }

  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x38d9c0,
    emissive: 0x1cb5a3,
    emissiveIntensity: 0.65,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x7ee081,
    emissive: 0x3bf0c5,
    emissiveIntensity: 0.85,
  });

  slot.myceliumStages = [];
  const xCoords = [-5.4, -1.8, 1.8, 5.4];
  for (let stage = 0; stage < 4; stage++) {
    const stageGroup = new THREE.Group();
    stageGroup.position.set(xCoords[stage], 0, 0);
    const rawCount = clampFinite(Math.round(a0 * Math.pow(base, stage)), 1, 27, 1);
    const capCount = Math.min(27, Math.max(1, rawCount));
    stageGroup.userData = { stageIndex: stage, rawCount, capCount };

    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    pedMesh.position.y = 0.35;
    stageGroup.add(pedMesh);

    const stemH = 1.1 + stage * 0.85;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, stemH, 8), stemMat);
    stem.position.y = 0.65 + stemH * 0.5;
    stageGroup.add(stem);

    for (let k = 0; k < capCount; k++) {
      const ring = Math.floor(k / 9);
      const ang = ((k % 9) / Math.min(9, capCount)) * Math.PI * 2;
      const rad = capCount === 1 ? 0 : 0.48 + ring * 0.34;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), capMat);
      cap.scale.set(1.2, 0.68, 1.2);
      cap.position.set(Math.cos(ang) * rad, 0.75 + stemH + ring * 0.32, Math.sin(ang) * rad);
      cap.userData = { partType: "mycelium_cap" };
      stageGroup.add(cap);
    }

    if (isLog) {
      const logHalo = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.08, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      logHalo.rotation.x = Math.PI / 2;
      logHalo.position.y = 0.8 + stemH;
      logHalo.userData = { partType: "log_stage_halo", stage };
      stageGroup.add(logHalo);
    }

    g.add(stageGroup);
    slot.myceliumStages.push(stageGroup);
  }
}

function populateDistributiveGateMesh(g, enc, slot) {
  const a = Math.max(
    1,
    Math.min(6, Math.round(Math.abs(clampFinite(enc.towers?.leftA, -6, 6, 3)) || 3))
  );
  const rawLeftB = clampFinite(enc.towers?.leftB, -1000, 1000, 6);
  const b = Math.round(rawLeftB / a) || 2;
  const absB = Math.min(6, Math.max(1, Math.abs(b)));
  const isUnpacked = safeNum(enc.stepsUsed, 0) >= 1;
  slot.isUnpacked = isUnpacked;

  const arrayGroup = new THREE.Group();
  arrayGroup.position.set(-3.6, 1.1, 0);
  arrayGroup.name = "distributive_array_group";

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x45f0df,
    emissive: 0x1cb5a3,
    emissiveIntensity: 0.85,
  });
  const cubeMat = new THREE.MeshStandardMaterial({
    color: b >= 0 ? 0xffcf56 : 0x48b8ff,
    emissive: b >= 0 ? 0xd98a16 : 0x1665c1,
    emissiveIntensity: 0.6,
  });

  slot.distributiveRows = [];
  const unpackGap = isUnpacked ? 0.95 : 0;

  for (let r = 0; r < a; r++) {
    const rowGroup = new THREE.Group();
    rowGroup.position.y = r * 0.86;
    rowGroup.userData = { rowIndex: r };

    const nCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), coreMat);
    nCore.position.x = -0.8 - unpackGap;
    nCore.userData = { partType: "n_core" };
    rowGroup.add(nCore);

    for (let c = 0; c < absB; c++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), cubeMat);
      cube.position.x = 0.05 + c * 0.56 + unpackGap;
      cube.userData = { partType: "b_cube" };
      rowGroup.add(cube);
    }

    arrayGroup.add(rowGroup);
    slot.distributiveRows.push(rowGroup);
  }

  g.add(arrayGroup);
  slot.distributiveArrayGroup = arrayGroup;

  const targetTower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.55, 3.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x24466e, emissive: 0x16324f, emissiveIntensity: 0.45 })
  );
  targetTower.position.set(4.1, 1.9, 0);
  g.add(targetTower);

  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(5.8, 4.8, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x7ceeff,
      emissive: 0x1f8ea8,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.58,
    })
  );
  barrier.position.set(0, 2.8, 0);
  g.add(barrier);
  slot.barrierMesh = barrier;
}

function populateSquareSlabForgeMesh(g, enc, slot) {
  const bCoeff = clampFinite(enc.towers?.leftB ?? enc.startDial, -100, 100, 6);
  const half = Math.max(1, Math.round(Math.abs(bCoeff) / 2));
  const wingScale = clamp(half * 0.28, 0.55, 1.95);
  const xSize = 2.4;

  const forgeRoot = new THREE.Group();
  forgeRoot.name = "square_slab_forge";
  forgeRoot.position.set(0, 2.8, -0.8);
  forgeRoot.rotation.x = -0.35;

  const xSqMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x45f0df,
    emissive: 0x1cb5a3,
    emissiveIntensity: 0.65,
    roughness: 0.22,
  });
  const socketMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    wireframe: true,
  });
  const plugMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xf4a62a,
    emissiveIntensity: 0.95,
    roughness: 0.18,
  });

  const cx = -(wingScale * 0.5);
  const cy = -(wingScale * 0.5);

  const xSqMesh = new THREE.Mesh(new THREE.BoxGeometry(xSize, xSize, 0.34), xSqMat);
  xSqMesh.position.set(cx, cy, 0);
  xSqMesh.userData = { partType: "x_squared_slab" };

  const wingRightMesh = new THREE.Mesh(new THREE.BoxGeometry(wingScale, xSize, 0.32), wingMat);
  wingRightMesh.position.set(cx + (xSize + wingScale) * 0.5 + 0.08, cy, 0);
  wingRightMesh.userData = { partType: "bx_half_wing_right", half };

  const wingTopMesh = new THREE.Mesh(new THREE.BoxGeometry(xSize, wingScale, 0.32), wingMat);
  wingTopMesh.position.set(cx, cy + (xSize + wingScale) * 0.5 + 0.08, 0);
  wingTopMesh.userData = { partType: "bx_half_wing_top", half };

  const cornerX = cx + (xSize + wingScale) * 0.5 + 0.08;
  const cornerY = cy + (xSize + wingScale) * 0.5 + 0.08;

  const cornerSocketGroup = new THREE.Group();
  cornerSocketGroup.position.set(cornerX, cornerY, 0);
  const socketFrame = new THREE.Mesh(
    new THREE.BoxGeometry(wingScale, wingScale, 0.28),
    socketMat
  );
  cornerSocketGroup.add(socketFrame);

  const cornerPlugMesh = new THREE.Mesh(
    new THREE.BoxGeometry(wingScale * 0.96, wingScale * 0.96, 0.38),
    plugMat
  );
  cornerPlugMesh.position.set(cornerX, cornerY, 0);
  cornerPlugMesh.visible = false;
  cornerPlugMesh.userData = { partType: "corner_square_plug", answer: half * half };

  forgeRoot.add(xSqMesh, wingRightMesh, wingTopMesh, cornerSocketGroup, cornerPlugMesh);
  g.add(forgeRoot);

  slot.squareForge = {
    forgeRoot,
    xSqMesh,
    wingRightMesh,
    wingTopMesh,
    cornerSocketGroup,
    cornerPlugMesh,
    half,
  };
  slot.forgeCompleted = false;
}

function populateCrystalTrussMesh(g, enc, slot) {
  const a1 = clampFinite(enc.astrolabeMeta?.a1, 5, 170, 55);
  const a2 = clampFinite(enc.astrolabeMeta?.a2, 5, 170, 60);

  const strutMat = new THREE.MeshStandardMaterial({
    color: 0x5ce1e6,
    emissive: 0x2ec4b6,
    emissiveIntensity: 0.65,
    metalness: 0.35,
    roughness: 0.22,
  });

  const trussGroup = new THREE.Group();
  trussGroup.position.set(-1.2, 1.1, 0);

  const baseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.2, 8), strutMat.clone());
  baseStrut.rotation.z = Math.PI / 2;
  baseStrut.position.set(0, 0, 0);

  const leftStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 8), strutMat.clone());
  leftStrut.position.set(-1.3, 1.9, 0);
  leftStrut.rotation.z = -((90 - a1) * Math.PI) / 180;

  const rightStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 8), strutMat.clone());
  rightStrut.position.set(1.3, 1.9, 0);
  rightStrut.rotation.z = ((90 - a2) * Math.PI) / 180;

  const apexPin = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xf4a62a, emissiveIntensity: 0.85 })
  );
  apexPin.position.set(0, 3.7, 0);

  trussGroup.add(baseStrut, leftStrut, rightStrut, apexPin);
  g.add(trussGroup);

  // Adjacent unpinned SSA hinge strut that swings in the alpine wind until locked!
  const ssaHingeGroup = new THREE.Group();
  ssaHingeGroup.name = "ssa_unpinned_hinge";
  ssaHingeGroup.position.set(4.8, 3.9, 0);
  const freeStrut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 2.8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff9b71, emissive: 0xd97706, emissiveIntensity: 0.55 })
  );
  freeStrut.position.y = -1.4;
  ssaHingeGroup.add(freeStrut);
  g.add(ssaHingeGroup);

  slot.trussStruts = [baseStrut, leftStrut, rightStrut];
  slot.ssaHingeGroup = ssaHingeGroup;
  slot.trussLocked = false;
}

function populateRampOrArchMesh(g, enc, slot, kind) {
  const isSystem = kind === "sys_intersection" || Boolean(enc.rampMeta?.isSystem);
  const isWave = kind === "harmonic_wave_crest" || Boolean(enc.archMeta?.isWave);
  const isArch =
    isWave ||
    kind === "arch_vertex_eval" ||
    kind === "arch_roots" ||
    enc.encounterType === "rainbow_arch";

  const sysMeta = isSystem ? normalizeSystemMeta(enc, slot) : null;
  if (sysMeta && !slot.initialSystemMeta) {
    slot.initialSystemMeta = sysMeta;
  }
  const rawRm =
    sysMeta || (enc.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : {});
  const rawAm = enc.archMeta && typeof enc.archMeta === "object" ? enc.archMeta : {};

  const mVal = clampFinite(rawRm.m, -1000, 1000, 1);
  const bVal = clampFinite(rawRm.b, -10000, 10000, 0);
  const m2Val = clampFinite(rawRm.m2, -1000, 1000, 1);
  const b2Val = clampFinite(rawRm.b2, -10000, 10000, 0);
  const targetX = clampFinite(Math.abs(safeNum(rawRm.targetX, 5)) || 5, 1, 1000, 5);
  const rmTargetY = clampFinite(rawRm.targetY, -100000, 100000, 6);
  const solveForB = Boolean(rawRm.solveForB);
  const amK = clampFinite(rawAm.k ?? enc.answer, -100000, 100000, 8);

  const sx = 13.5 / targetX;
  const refPeak = isArch ? Math.abs(amK) : Math.max(Math.abs(rmTargetY), Math.abs(bVal) + 2);
  const maxRef = Math.max(4, refPeak);
  const sy = clamp(6.2 / maxRef, 0.2, 0.82);
  const datumY = 2.1;
  const mapY = (mathY) => clamp(datumY + sy * clampFinite(mathY, -100000, 100000, 0), 0.5, 11.5);

  slot.mapY = mapY;
  slot.rampScale = { sx, sy, datumY, targetX };

  // Launch Emitter Pad Group (lifts vertically on W4.3 solveForB!)
  const launchPadGroup = new THREE.Group();
  launchPadGroup.name = "holo_launch_pad";
  const initialPadMathB = isArch ? 0 : bVal;
  launchPadGroup.position.set(isSystem ? -2.2 : 0, mapY(initialPadMathB) - 0.55, 2.2);

  const padMesh = new THREE.Mesh(
    new THREE.BoxGeometry(isSystem ? 3.6 : 4.8, 0.5, 4.0),
    new THREE.MeshStandardMaterial({
      color: 0x1e3858,
      emissive: 0x164c6b,
      emissiveIntensity: 0.5,
    })
  );
  launchPadGroup.add(padMesh);

  // Strict <= 15% Near-Field Origin Stub (spans z in [0, -1.9m] = 11.875% of 16.0m chasm!)
  const stubGroup = new THREE.Group();
  stubGroup.name = "origin_tangent_stub";
  stubGroup.position.set(0, 0.42, -1.8);
  for (let i = 0; i < 3; i++) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(3.1 - i * 0.35, 0.14, 0.55),
      new THREE.MeshBasicMaterial({
        color: 0x45f0df,
        transparent: true,
        opacity: 0.9 - i * 0.22,
      })
    );
    strip.position.set(0, 0, -i * 0.68); // max local extent -1.36m (< 2.0m total!)
    stubGroup.add(strip);
  }
  if (solveForB) {
    stubGroup.rotation.x = clamp(Math.atan2(sy * mVal, sx), -0.95, 0.95);
  } else if (isSystem) {
    stubGroup.rotation.x = clamp(
      Math.atan2(sy * clampFinite(rawRm.m, -1000, 1000, 2), sx),
      -0.95,
      0.95
    );
  }
  launchPadGroup.add(stubGroup);
  g.add(launchPadGroup);

  slot.launchPadGroup = launchPadGroup;
  slot.tangentStub = stubGroup;

  // Target Ring / Mega-Geode at z = -13.5m
  const targetMathY = isArch ? clampFinite(enc.answer ?? amK, -100000, 100000, 8) : rmTargetY;
  const ringWorldY = mapY(targetMathY);

  const targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.25, 0.26, 12, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf4a62a,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    })
  );
  targetRing.position.set(0, ringWorldY, -13.5);
  g.add(targetRing);
  slot.targetRing = targetRing;

  // Helper to evaluate true curve Y at normalized u in [0..1] across 16.0m chasm
  const evalTrueY = (u) => {
    const safeU = clampFinite(u, 0, 1, 0);
    if (isWave) {
      const midVal = clampFinite(enc.startDial, -10000, 10000, 4);
      const ansVal = clampFinite(enc.answer, -10000, 10000, 8);
      const ampVal = Math.max(1, ansVal - midVal);
      return mapY(midVal + ampVal * Math.sin(2 * Math.PI * 3.5 * safeU));
    }
    if (isArch) {
      const peakY = mapY(clampFinite(rawAm.k ?? enc.answer, -100000, 100000, 9));
      const baseY = mapY(0);
      return baseY + Math.sin(safeU * Math.PI) * Math.max(2.2, peakY - baseY);
    }
    const xVal = safeU * (targetX * (16.0 / 13.5));
    return mapY(mVal * xVal + bVal);
  };
  slot.evalTrueY = evalTrueY;

  // Extruded Full 3D Curve Bridge (STRICTLY HIDDEN pre-commit!)
  const segCount = isWave ? 48 : 20;
  const curveGroup = new THREE.Group();
  curveGroup.name = "extruded_curve_bridge";
  curveGroup.visible = false;
  for (let s = 0; s < segCount; s++) {
    const u = s / (segCount - 1);
    const zPos = -u * CHASM_SPAN_M;
    const yPos = evalTrueY(u);
    const xPos = isSystem ? -2.2 * (1 - Math.min(1, u / (13.5 / 16.0))) : 0;
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(isSystem ? 2.4 : 3.4, 0.18, CHASM_SPAN_M / segCount + 0.12),
      new THREE.MeshBasicMaterial({
        color: isArch ? 0xffb36b : 0x45f0df,
        transparent: true,
        opacity: 0.8,
      })
    );
    seg.position.set(xPos, yPos, zPos);
    curveGroup.add(seg);
  }
  g.add(curveGroup);
  slot.extrudedBridge = curveGroup;

  if (isWave) {
    const midY = mapY(clampFinite(enc.startDial, -10000, 10000, 4));
    const midLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, CHASM_SPAN_M),
      new THREE.MeshBasicMaterial({ color: 0xaee8ff, transparent: true, opacity: 0.45 })
    );
    midLine.position.set(0, midY, -CHASM_SPAN_M * 0.5);
    g.add(midLine);
  }

  // Dialed Off-Target Curve Extrusion (shown ONLY on 1st miss nudge alongside caliper!)
  const dialedCurveGroup = new THREE.Group();
  dialedCurveGroup.name = "dialed_miss_curve";
  dialedCurveGroup.visible = false;
  for (let s = 0; s < segCount; s++) {
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.15, CHASM_SPAN_M / segCount + 0.08),
      new THREE.MeshBasicMaterial({
        color: 0xffcf56,
        transparent: true,
        opacity: 0.68,
      })
    );
    dialedCurveGroup.add(seg);
  }
  g.add(dialedCurveGroup);
  slot.dialedCurveMesh = dialedCurveGroup;

  // W4.4 Dual-Rig Crossing: Companion Holo-Rig + Highway 2 + Mega-Geode at intersection!
  if (isSystem) {
    const compPadY = mapY(b2Val);
    const compRig = new THREE.Group();
    compRig.name = "companion_system_rig";
    const rigHull = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 3.2, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0x3bf0c5,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.85,
      })
    );
    rigHull.rotation.x = -Math.PI / 2;
    compRig.add(rigHull);
    compRig.position.set(2.4, compPadY + 0.35, 2.2);
    g.add(compRig);
    slot.companionRig = compRig;

    const compBridge = new THREE.Group();
    compBridge.name = "companion_system_bridge";
    compBridge.visible = false;
    for (let s = 0; s < 20; s++) {
      const u = s / 19;
      const zPos = -u * CHASM_SPAN_M;
      const xVal = u * (targetX * (16.0 / 13.5));
      const yPos = mapY(m2Val * xVal + b2Val);
      const xPos = 2.4 * (1 - Math.min(1, u / (13.5 / 16.0)));
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.16, 0.92),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.78 })
      );
      seg.position.set(xPos, yPos, zPos);
      compBridge.add(seg);
    }
    g.add(compBridge);
    slot.companionBridge = compBridge;

    const megaGeode = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.35, 0),
      new THREE.MeshStandardMaterial({
        color: 0x72efdd,
        emissive: 0xf4a62a,
        emissiveIntensity: 0.85,
        roughness: 0.18,
      })
    );
    megaGeode.name = "system_mega_geode";
    megaGeode.position.set(0, ringWorldY, -13.5);
    g.add(megaGeode);
    slot.megaGeode = megaGeode;
  }
}

function populateAstrolabeMesh(g, enc, slot, kind) {
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xf5c451,
    emissive: 0x9e6f14,
    emissiveIntensity: 0.45,
    metalness: 0.65,
    roughness: 0.25,
  });
  const starMat = new THREE.MeshStandardMaterial({
    color: 0x5ce1e6,
    emissive: 0x2ec4b6,
    emissiveIntensity: 0.8,
  });

  const outer = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.24, 12, 40), brassMat);
  outer.position.set(0, 5.2, 0);
  const mid = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.2, 12, 36), brassMat);
  mid.position.set(0, 5.2, 0);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.18, 10, 32), starMat);
  inner.position.set(0, 5.2, 0);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), starMat);
  core.position.set(0, 5.2, 0);
  g.add(outer, mid, inner, core);

  if (kind === "geo_astrolabe_thales") {
    const diam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8.4, 8), brassMat);
    diam.rotation.z = Math.PI / 2;
    diam.position.set(0, 5.2, 0);
    g.add(diam);
  } else if (kind === "geo_parallel_angles") {
    for (const ry of [3.4, 7.0]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 0.2), starMat);
      rail.position.set(0, ry, 0);
      g.add(rail);
    }
  } else if (kind === "geo_scale_area") {
    const startDial = clampFinite(Math.abs(safeNum(enc.startDial, 6)) || 6, 1, 100000, 6);
    const ans = clampFinite(Math.abs(safeNum(enc.answer, 24)) || 24, 4, 100000, 24);
    const rawK = hasFiniteNum(enc.scaleMeta?.k)
      ? Number(enc.scaleMeta.k)
      : Math.round(ans / startDial);
    const k = Math.round(clampFinite(rawK, 2, 5, 2));
    const sailGrid = new THREE.Group();
    sailGrid.position.set(0, 5.2, -0.6);
    for (let r = 0; r < k; r++) {
      for (let c = 0; c < k; c++) {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(0.68, 0.68, 0.08),
          new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.55 })
        );
        tile.position.set((c - (k - 1) * 0.5) * 0.78, (r - (k - 1) * 0.5) * 0.78, 0);
        sailGrid.add(tile);
      }
    }
    g.add(sailGrid);
    slot.scaleSailGrid = sailGrid;
  }

  slot.astrolabeRings = { outer, mid, inner, core };
}

function populateHarpoonCliffMesh(g, enc, slot) {
  const hm = enc.harpoonMeta && typeof enc.harpoonMeta === "object" ? enc.harpoonMeta : {};
  const legA = clampFinite(Math.abs(safeNum(hm.legA, 6)) || 6, 3, 200, 6);
  const legB = clampFinite(Math.abs(safeNum(hm.legB, 8)) || 8, 3, 200, 8);
  const hyp = clampFinite(Math.abs(safeNum(hm.hyp ?? enc.answer, 10)) || 10, 4, 300, 10);
  const scaleF = clamp(3.2 / hyp, 0.18, 0.45);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 12.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x2b5d8c, roughness: 0.3, metalness: 0.25 })
  );
  spire.position.set(0, 6.25, -3.5);
  g.add(spire);

  const anchor = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.24, 10, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf4a62a,
      emissiveIntensity: 0.9,
    })
  );
  anchor.position.set(0, 12.2, -3.5);
  g.add(anchor);
  slot.harpoonAnchor = anchor;

  // Visual a^2 + b^2 = c^2 translucent ice-square slabs alongside spire!
  const makeSq = (sideLen, hex, x, y, rotZ = 0) => {
    const s = Math.max(0.9, sideLen * scaleF);
    const sq = new THREE.Mesh(
      new THREE.BoxGeometry(s, s, 0.18),
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.68,
      })
    );
    sq.position.set(x, y, -2.0);
    sq.rotation.z = rotZ;
    g.add(sq);
    return sq;
  };

  const aSquare = makeSq(legA, 0x45f0df, -4.4, 2.6, 0);
  const bSquare = makeSq(legB, 0x5ce1e6, -4.4, 5.8, 0);
  const cSquare = makeSq(hyp, 0xffd166, 4.4, 4.6, 0.62);
  slot.pythagorasSquares = { aSquare, bSquare, cSquare };

  const cableMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 14.2, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd166 })
  );
  cableMesh.position.set(0, 6.4, 1.2);
  cableMesh.rotation.x = -0.58;
  cableMesh.visible = false;
  cableMesh.name = "harpoon_winch_cable";
  g.add(cableMesh);
  slot.harpoonCableMesh = cableMesh;
}

function populateIPortalRingMesh(g, enc, slot) {
  const rawPm =
    (enc.portalMeta && typeof enc.portalMeta === "object" ? enc.portalMeta : null) ||
    (enc.iPortalMeta && typeof enc.iPortalMeta === "object" ? enc.iPortalMeta : null) ||
    (enc.complexMeta && typeof enc.complexMeta === "object" ? enc.complexMeta : null) || {
      startReal: 4,
      quarterTurns: 2,
      endReal: clampFinite(enc.answer, -10000, 10000, -4),
      endImag: 0,
      angleDeg: 180,
      iPower: 2,
    };
  const quarterTurns = parseIPortalQuarterTurns(rawPm);
  const startReal = clampFinite(rawPm.startReal, -10000, 10000, 4);
  slot.portalMeta = { ...rawPm, startReal, quarterTurns };

  const centerY = 5.2;
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x66e3ff,
    emissive: 0x3bf0c5,
    emissiveIntensity: 0.75,
  });
  const mainRing = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.2, 12, 44), ringMat);
  mainRing.position.set(0, centerY, 0);
  g.add(mainRing);

  // 4 Cardinal beacons (+1, +i, -1, -i)
  const cardColors = [0xffd166, 0x45f0df, 0xff9b71, 0x7ee081];
  for (let c = 0; c < 4; c++) {
    const ang = (c * Math.PI) / 2;
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.38, 0),
      new THREE.MeshBasicMaterial({ color: cardColors[c] })
    );
    beacon.position.set(Math.cos(ang) * 4.0, centerY + Math.sin(ang) * 4.0, 0);
    g.add(beacon);
  }

  // Quarter-Turn x-i Portal Sub-Rings along the arc
  slot.iPortalRings = [];
  const subRingMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  for (let q = 1; q <= quarterTurns; q++) {
    const ang = (q * Math.PI) / 2 - Math.PI / 4;
    const subRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 8, 20), subRingMat);
    subRing.position.set(Math.cos(ang) * 3.8, centerY + Math.sin(ang) * 3.8, 0.25);
    subRing.userData = { quarterStep: q };
    g.add(subRing);
    slot.iPortalRings.push(subRing);
  }

  // Starting Real Beam (+startReal along +X)
  const startSign = startReal >= 0 ? 1 : -1;
  const startBeam = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.16, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xaee8ff, transparent: true, opacity: 0.65 })
  );
  startBeam.position.set(startSign * 1.8, centerY, 0.1);
  g.add(startBeam);
  slot.iStartBeam = startBeam;

  // Rotating i-Beam Group (sweeps 90 deg per quarterTurn on clear!)
  const iRotatedBeamGroup = new THREE.Group();
  iRotatedBeamGroup.name = "i_rotated_beam_group";
  iRotatedBeamGroup.position.set(0, centerY, 0.22);
  const rotShaft = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.24, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xffd166 })
  );
  rotShaft.position.x = startSign * 1.85;
  iRotatedBeamGroup.add(rotShaft);
  g.add(iRotatedBeamGroup);
  slot.iRotatedBeamGroup = iRotatedBeamGroup;
}

export function updateEncounterDialPreview(slot, val) {
  if (!slot || typeof slot !== "object") return;
  const num = clampFinite(val, -10000, 10000, 0);

  // Anti-Scrub Post-Miss Rule: immediately hide any prior miss curve/caliper when dialing!
  if (slot.dialedCurveMesh) slot.dialedCurveMesh.visible = false;
  if (slot.caliperMesh) slot.caliperMesh.visible = false;
  if (slot.extrudedBridge && !slot.cleared) slot.extrudedBridge.visible = false;
  if (slot.companionBridge && !slot.cleared) slot.companionBridge.visible = false;

  const enc = slot.encounter && typeof slot.encounter === "object" ? slot.encounter : {};
  const rm = enc.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : {};

  if (slot.launchPadGroup && slot.mapY && rm.solveForB) {
    // W4.3: slope m is fixed; dialing adjusts vertical launch pad lift b!
    slot.launchPadGroup.position.y = slot.mapY(num) - 0.55;
  } else if (slot.tangentStub) {
    const scale = slot.rampScale || { sx: 2.5, sy: 0.5 };
    const sx = clampFinite(scale.sx, 0.01, 1000, 2.5);
    const sy = clampFinite(scale.sy, 0.01, 100, 0.5);
    const clampedAngle = clamp(Math.atan2(sy * num, sx), -0.85, 0.85);
    slot.tangentStub.rotation.x = clampedAngle;
  }

  if (slot.astrolabeRings) {
    const rad = (num * Math.PI) / 180;
    slot.astrolabeRings.mid.rotation.z = rad;
    slot.astrolabeRings.inner.rotation.y = rad * 1.3;
  }
}

export function triggerTwinBeamEncounterFX(slot, isRepel = false) {
  if (!slot || !isRepel || !slot.towerClusters) return;
  slot.repelAnim = { t: 0, dur: 0.72 };
  slot.repelPhase = "slide_in";
}

export function applyEncounterCommitFX(world, slot, commitResult = {}, encOverride = null) {
  if (!world || !slot || typeof slot !== "object") return;
  const safeCommit = commitResult && typeof commitResult === "object" ? commitResult : {};
  const enc =
    (encOverride && typeof encOverride === "object" ? encOverride : null) ||
    (slot.encounter && typeof slot.encounter === "object" ? slot.encounter : null) ||
    {};
  const kind = slot.resolvedKind || resolveEncounterKind(enc);
  const isClear = safeCommit.outcome === "clear" || safeCommit.outcome === "warm_reveal";

  if (isClear) {
    slot.cleared = true;
    if (slot.dialedCurveMesh) slot.dialedCurveMesh.visible = false;
    if (slot.caliperMesh) slot.caliperMesh.visible = false;

    if (kind === "sys_intersection" && slot.extrudedBridge && slot.companionBridge) {
      slot.extrudedBridge.visible = true;
      slot.companionBridge.visible = true;
      world.rigAnim = {
        kind: "surf_dual_system",
        t: 0,
        dur: 1.2,
        startX: clampFinite(world.rigState?.x, -200, 200, 0),
        startZ: clampFinite(world.rigState?.z, -200, 200, 0),
        slot,
        peakH: slot.targetRing ? clampFinite(slot.targetRing.position.y, 0.5, 20, 6.2) : 6.2,
      };
    } else if (slot.extrudedBridge) {
      slot.extrudedBridge.visible = true;
      world.rigAnim = {
        kind: "surf_ramp",
        t: 0,
        dur: 1.15,
        startX: clampFinite(world.rigState?.x, -200, 200, 0),
        startZ: clampFinite(world.rigState?.z, -200, 200, 0),
        slot,
        peakH: slot.targetRing ? clampFinite(slot.targetRing.position.y, 0.5, 20, 6.4) : 6.4,
      };
    } else if (slot.harpoonCableMesh && slot.harpoonAnchor) {
      slot.harpoonCableMesh.visible = true;
      world._spawnCrystalBurst?.(slot.x, slot.y + 9.0, slot.z - 2.5, 48);
      world.rigAnim = {
        kind: "winch_harpoon",
        t: 0,
        dur: 1.25,
        startX: clampFinite(world.rigState?.x, -200, 200, 0),
        startZ: clampFinite(world.rigState?.z, -200, 200, 0),
        startY: clampFinite(world.rigState?.y, -50, 100, 0),
        slot,
        summitH: 10.2,
      };
    } else {
      if (slot.barrierMesh) slot.barrierMesh.visible = false;
      if (slot.squareForge && slot.squareForge.cornerPlugMesh) {
        slot.squareForge.cornerPlugMesh.visible = true;
        slot.forgeCompleted = true;
      }
      if (slot.trussStruts) {
        slot.trussLocked = true;
        for (const s of slot.trussStruts) {
          s.material.color.setHex(0xffd166);
          s.material.emissive.setHex(0xf4a62a);
        }
        if (slot.ssaHingeGroup) slot.ssaHingeGroup.rotation.z = 0;
      }
      if (slot.iRotatedBeamGroup && slot.portalMeta) {
        const qt = parseIPortalQuarterTurns(slot.portalMeta);
        const targetRot = (qt * Math.PI) / 2;
        slot.iRotatedBeamGroup.rotation.z = targetRot;
        slot.iPortalAnim = { t: 0, dur: 0.65, targetRot };
      }

      const rotY = clampFinite(slot.rotY, -Math.PI * 4, Math.PI * 4, 0);
      world._spawnCrystalBurst?.(
        slot.x,
        slot.y + 3.0,
        slot.z,
        safeCommit.overdrive ? 72 : 42
      );
      world.rigAnim = {
        kind: "ram_surge",
        t: 0,
        dur: 0.65,
        startX: clampFinite(world.rigState?.x, -200, 200, 0),
        startZ: clampFinite(world.rigState?.z, -200, 200, 0),
        endX: clampFinite(slot.x, -200, 200, 0) - Math.sin(rotY) * 3.5,
        endZ: clampFinite(slot.z, -200, 200, -11) - Math.cos(rotY) * 3.5,
      };
    }
    return;
  }

  // Deterministic 1st-Miss Nudge Visual: Universal Delta-Y Caliper + Dialed Curve + Sign Sky-Pillar!
  const targetAns = clampFinite(enc.answer, -10000, 10000, 0);
  const rawDialed = hasFiniteNum(safeCommit.committedValue)
    ? Number(safeCommit.committedValue)
    : hasFiniteNum(safeCommit.delta)
    ? targetAns + Number(safeCommit.delta)
    : safeNum(world.dialPreviewValue, 0);
  const dialedVal = clampFinite(rawDialed, -10000, 10000, 0);

  if (slot.dialedCurveMesh && slot.mapY && slot.targetRing) {
    const rm =
      slot.initialSystemMeta ||
      (enc.rampMeta && typeof enc.rampMeta === "object" ? enc.rampMeta : { m: 1, b: 0, targetX: 5 });
    const targetX = clampFinite(slot.rampScale?.targetX, 1, 1000, 5);
    const isWave = kind === "harmonic_wave_crest" || Boolean(enc.archMeta?.isWave);
    const isArch =
      isWave ||
      kind === "arch_vertex_eval" ||
      kind === "arch_roots" ||
      enc.encounterType === "rainbow_arch";

    const children = slot.dialedCurveMesh.children;
    const nSeg = children.length;
    let endDialY = slot.mapY(dialedVal);

    for (let s = 0; s < nSeg; s++) {
      const u = s / Math.max(1, nSeg - 1);
      const zPos = -u * CHASM_SPAN_M;
      let yPos = 2.0;
      if (isWave) {
        const midVal = clampFinite(enc.startDial, -10000, 10000, 4);
        const dialAmp = dialedVal - midVal;
        yPos = slot.mapY(midVal + dialAmp * Math.sin(2 * Math.PI * 3.5 * u));
      } else if (isArch) {
        const baseY = slot.mapY(0);
        const dialPeak = slot.mapY(dialedVal);
        yPos = baseY + Math.sin(u * Math.PI) * (dialPeak - baseY);
      } else if (rm.solveForB) {
        const xVal = u * (targetX * (16.0 / 13.5));
        yPos = slot.mapY(clampFinite(rm.m, -1000, 1000, 1) * xVal + dialedVal);
      } else {
        const xVal = u * (targetX * (16.0 / 13.5));
        yPos = slot.mapY(dialedVal * xVal + clampFinite(rm.b, -10000, 10000, 0));
      }
      children[s].position.set(0, yPos, zPos);
      if (Math.abs(zPos - -13.5) < 1.2) endDialY = yPos;
    }

    slot.dialedCurveMesh.visible = true;
    setCaliperVerticalSpan(slot, endDialY, slot.targetRing.position.y, -13.5);
  } else {
    const deltaScaled = clamp((dialedVal - targetAns) * 0.18, -2.6, 2.6);
    const nonZeroOffset =
      Math.abs(deltaScaled) < 0.45 ? (dialedVal >= targetAns ? 0.65 : -0.65) : deltaScaled;
    setCaliperVerticalSpan(slot, 3.0, 3.0 + nonZeroOffset, 0.45);
  }

  // Opposite-Sign Sub-Zero Sky-Pillar (e.g., dialing +200 when answer is -200 on W1.2!)
  if ((dialedVal > 0 && targetAns < 0) || (dialedVal < 0 && targetAns > 0)) {
    const pillarH = clamp(3.5 + 0.06 * Math.abs(dialedVal), 4.5, 14.5);
    if (!world.signPillarMesh && world.scene) {
      world.signPillarMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.65, 1.0, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffcf56,
          emissive: 0xd98a16,
          emissiveIntensity: 0.7,
          transparent: true,
          opacity: 0.88,
        })
      );
      world.signPillarMesh.name = "sign_flip_sky_pillar";
      world.scene.add(world.signPillarMesh);
    }
    const rx = clampFinite(world.rigState?.x, -200, 200, 0);
    const rz = clampFinite(world.rigState?.z, -200, 200, 0);
    const groundY = clampFinite(world._baseHeight?.(rx, rz), -50, 100, 0);
    if (world.signPillarMesh) {
      world.signPillarMesh.scale.set(1, pillarH, 1);
      world.signPillarMesh.position.set(rx, groundY + pillarH * 0.5, rz);
      world.signPillarMesh.visible = true;
      slot.signPillarMesh = world.signPillarMesh;
    }
    world.rigAnim = {
      kind: "sign_pillar_jack",
      t: 0,
      dur: 1.35,
      baseY: groundY,
      peakH: pillarH,
    };
    return;
  }

  world.rigAnim = {
    kind: "recoil_jack",
    t: 0,
    dur: 0.48,
    baseY: clampFinite(world.rigState?.y, -50, 100, 0),
    deltaSign: dialedVal >= targetAns ? 1 : -1,
  };
}

export function updateEncounterAnimations(world, dt, elapsed) {
  if (!world || !world.gateSlots || !Number.isFinite(dt) || !Number.isFinite(elapsed)) return;
  for (const slot of world.gateSlots) {
    if (slot.ssaHingeGroup && !slot.trussLocked) {
      slot.ssaHingeGroup.rotation.z = Math.sin(elapsed * 3.8) * 0.42;
    }

    if (slot.repelAnim && slot.towerClusters) {
      slot.repelAnim.t += dt;
      const t = slot.repelAnim.t;
      if (t < 0.22) {
        slot.repelPhase = "slide_in";
        const u = t / 0.22;
        const shrink = 1 - 0.72 * Math.sin(u * Math.PI * 0.5);
        for (const c of slot.towerClusters) {
          if (!c.hasBoth) continue;
          c.varClusterGroup.position.x = c.baseVarX * shrink;
          c.constClusterGroup.position.x = c.baseConstX * shrink;
          c.sparkMesh.visible = false;
        }
      } else if (t < 0.54) {
        slot.repelPhase = "bounce_apart";
        const u = (t - 0.22) / 0.32;
        const expand = 1 + 0.55 * Math.sin(u * Math.PI);
        for (const c of slot.towerClusters) {
          if (!c.hasBoth) continue;
          c.varClusterGroup.position.x = c.baseVarX * expand;
          c.constClusterGroup.position.x = c.baseConstX * expand;
          c.sparkMesh.visible = true;
          c.sparkMesh.rotation.z += dt * 12;
        }
      } else if (t < slot.repelAnim.dur) {
        slot.repelPhase = "settle";
        const u = (t - 0.54) / (slot.repelAnim.dur - 0.54);
        const blend = 1 + 0.1 * (1 - u);
        for (const c of slot.towerClusters) {
          if (!c.hasBoth) continue;
          c.varClusterGroup.position.x = c.baseVarX * blend;
          c.constClusterGroup.position.x = c.baseConstX * blend;
          c.sparkMesh.visible = false;
        }
      } else {
        for (const c of slot.towerClusters) {
          c.varClusterGroup.position.x = c.baseVarX;
          c.constClusterGroup.position.x = c.baseConstX;
          c.sparkMesh.visible = false;
        }
        slot.repelPhase = "settled";
        slot.repelAnim = null;
      }
    }
  }
}

export function buildQuadrantWhaleBeacons(scene, baseHeightFn) {
  const beacons = [];
  const ringGeo = new THREE.RingGeometry(2.1, 2.8, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const crystalGeo = new THREE.OctahedronGeometry(0.75, 0);

  for (const spec of QUADRANT_BEACON_COORDS) {
    const y = baseHeightFn(spec.x, spec.z);
    const group = new THREE.Group();
    group.position.set(spec.x, y, spec.z);
    group.userData = { beaconId: spec.id };

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3bf0c5,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.5;

    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x5ce1e6,
      emissive: 0x1cb5a3,
      emissiveIntensity: 0.4,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 1.8;

    group.add(ring, crystal);
    if (scene) scene.add(group);
    beacons.push({
      id: spec.id,
      x: spec.x,
      y,
      z: spec.z,
      lit: false,
      group,
      ringMat,
      crystal,
      crystalMat,
    });
  }
  return beacons;
}

export function updateQuadrantWhaleBeacons(world, dt, elapsed) {
  if (!world || !world.quadrantBeacons || !Number.isFinite(elapsed)) return;
  let litCount = 0;
  for (const b of world.quadrantBeacons) {
    b.crystal.rotation.y = elapsed * 1.4;
    if (!b.lit && Math.hypot(world.rigState.x - b.x, world.rigState.z - b.z) <= 4.8) {
      b.lit = true;
      b.ringMat.color.setHex(0xffd166);
      b.ringMat.opacity = 0.9;
      b.crystalMat.color.setHex(0xffd166);
      b.crystalMat.emissive.setHex(0xf4a62a);
      b.crystalMat.emissiveIntensity = 1.05;
      world._spawnCrystalBurst(b.x, b.y + 2.0, b.z, 24);
      world.audio?.playSnowShardTick?.();
    }
    if (b.lit) litCount += 1;
  }

  if (litCount === world.quadrantBeacons.length && !world._quadrantWhaleTriggered) {
    world._quadrantWhaleTriggered = true;
    world.triggerSkyWhale();
    world.onMysteryFound("aurora_whale");
  }
}
