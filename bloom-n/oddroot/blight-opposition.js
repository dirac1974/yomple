/**
 * Oddroot Wilds — Active Spatial Opposition & Upgrade/Elixir Stakes System
 * Creeping Blight-Thorns and drifting Gloom-Spores spread from 4 Twilight Shadow Fissures
 * toward World-Tree creature nests (anxiety-safe: zero timers, zero damage, 100% frozen
 * during active encounter dock thinking).
 */

import * as THREE from "../vendor/three.module.min.js";
import {
  createSlimeDropletGeometry,
  getCharacterFaceTexture,
  createSplineTubeGeometry,
} from "../core/character-graphics-3d.js";

export const BASE_SIPHON_RADIUS = 3.2;
export const WIDE_SIPHON_MULTIPLIER = 3.0;
export const BRAMBLE_DRAG_FACTOR = 0.45;
export const PLOW_FULL_SPEED_FACTOR = 1.0;

export const OPPOSITION_LANES = [
  { laneIdx: 0, originX: -29.0, originZ: -18.0, targetX: -9.5, targetZ: -7.5 },
  { laneIdx: 1, originX: 29.0, originZ: -18.0, targetX: 9.5, targetZ: -7.5 },
  { laneIdx: 2, originX: -10.5, originZ: 27.0, targetX: -8.5, targetZ: 8.5 },
  { laneIdx: 3, originX: 10.5, originZ: 27.0, targetX: 8.5, targetZ: 8.5 },
];

export const THORN_CHASM_SPECS = [
  { id: "chasm_west", x: -14.2, z: -6.4, radius: 3.6 },
  { id: "chasm_east", x: 14.2, z: -6.4, radius: 3.6 },
  { id: "chasm_nw", x: -13.2, z: -21.0, radius: 3.6 },
  { id: "chasm_ne", x: 13.2, z: -21.0, radius: 3.6 },
];

export class BlightOppositionSystem {
  constructor({ scene, toonGradientMap = null, sampleGroundY = null } = {}) {
    this.scene = scene;
    this.toonGradientMap = toonGradientMap;
    this.sampleGroundY = sampleGroundY || (() => 0.2);

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "BlightOppositionRoot";
    if (this.scene) {
      this.scene.add(this.rootGroup);
    }

    this.fissures = [];
    this.thornPatches = [];
    this.gloomSpores = [];
    this.thornChasms = [];
    this.elixirWaves = [];

    this._buildMaterialsAndGeometries();
    this._buildFissures();
    this._buildThornPatches();
    this._buildGloomSpores();
    this._buildThornChasms();
    this._buildElixirWaves();
  }

  _buildMaterialsAndGeometries() {
    const grad = this.toonGradientMap || null;
    this.fissureMat = new THREE.MeshToonMaterial({
      color: 0x3b235a,
      emissive: 0x6d3fc4,
      emissiveIntensity: 0.55,
      gradientMap: grad,
    });
    this.thornMat = new THREE.MeshToonMaterial({
      color: 0x4b2668,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.35,
      gradientMap: grad,
    });
    this.flowerPetalMat = new THREE.MeshToonMaterial({
      color: 0x68f0b8,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.6,
      gradientMap: grad,
    });
    this.flowerCoreMat = new THREE.MeshToonMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.7,
      gradientMap: grad,
    });
    const wispFaceTex = getCharacterFaceTexture("wisp_gloom");
    this.sporePlusMat = new THREE.MeshToonMaterial({
      map: wispFaceTex,
      color: 0xd8b4fe,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.36,
      transparent: true,
      opacity: 0.9,
      gradientMap: grad,
    });
    this.sporeMinusMat = new THREE.MeshToonMaterial({
      map: wispFaceTex,
      color: 0xc4b5fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.36,
      transparent: true,
      opacity: 0.9,
      gradientMap: grad,
    });
    this.sporePlusTendrilMat = new THREE.MeshToonMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.58,
      transparent: true,
      opacity: 0.86,
      gradientMap: grad,
    });
    this.sporeMinusTendrilMat = new THREE.MeshToonMaterial({
      color: 0x7dd3fc,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.58,
      transparent: true,
      opacity: 0.86,
      gradientMap: grad,
    });
    this.chasmRimMat = new THREE.MeshToonMaterial({
      color: 0x331d4a,
      emissive: 0x5b328a,
      emissiveIntensity: 0.38,
      gradientMap: grad,
    });
    this.waveMatTemplate = new THREE.MeshBasicMaterial({
      color: 0x5ef2c8,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });

    this.thornRingGeo = new THREE.TorusKnotGeometry(0.62, 0.14, 28, 6, 2, 3);
    this.thornSpikeGeo = new THREE.ConeGeometry(0.18, 0.75, 6);
    this.flowerPetalGeo = new THREE.OctahedronGeometry(0.26, 0);
    this.flowerCoreGeo = new THREE.DodecahedronGeometry(0.22, 0);
    this.sporeGeo = createSlimeDropletGeometry(0.52);
    this.sporeRimGeo = new THREE.TorusGeometry(0.52, 0.042, 8, 18);
    this.sporeTendrilGeos = [
      createSplineTubeGeometry(
        [
          [-0.18, 0.04, 0.0],
          [-0.24, -0.26, 0.08],
          [-0.14, -0.54, -0.05],
        ],
        0.032,
        10,
        6
      ),
      createSplineTubeGeometry(
        [
          [0.0, 0.04, -0.18],
          [0.05, -0.28, -0.25],
          [-0.04, -0.58, -0.16],
        ],
        0.034,
        10,
        6
      ),
      createSplineTubeGeometry(
        [
          [0.18, 0.04, 0.06],
          [0.25, -0.24, 0.14],
          [0.15, -0.52, 0.04],
        ],
        0.032,
        10,
        6
      ),
    ];
    this.fissureRingGeo = new THREE.TorusGeometry(2.1, 0.28, 8, 24);
    this.waveRingGeo = new THREE.RingGeometry(0.84, 1.0, 40);
  }

  _buildFissures() {
    for (const lane of OPPOSITION_LANES) {
      const fy = this.sampleGroundY(lane.originX, lane.originZ);
      const grp = new THREE.Group();
      grp.position.set(lane.originX, fy + 0.12, lane.originZ);

      const ring = new THREE.Mesh(this.fissureRingGeo, this.fissureMat);
      ring.rotation.x = -Math.PI / 2;
      grp.add(ring);

      this.rootGroup.add(grp);
      this.fissures.push({
        laneIdx: lane.laneIdx,
        x: lane.originX,
        y: fy,
        z: lane.originZ,
        targetX: lane.targetX,
        targetZ: lane.targetZ,
        group: grp,
      });
    }
  }

  _buildThornPatches() {
    let idx = 0;
    for (const lane of OPPOSITION_LANES) {
      for (let k = 0; k < 3; k++) {
        const frac = 0.18 + k * 0.24;
        const px = lane.originX + (lane.targetX - lane.originX) * frac;
        const pz = lane.originZ + (lane.targetZ - lane.originZ) * frac;
        const py = this.sampleGroundY(px, pz);

        const mesh = new THREE.Group();
        mesh.position.set(px, py + 0.08, pz);

        const thornGroup = new THREE.Group();
        const knot = new THREE.Mesh(this.thornRingGeo, this.thornMat);
        knot.rotation.x = Math.PI / 2;
        knot.scale.set(1.2, 1.2, 0.55);
        thornGroup.add(knot);
        for (let s = 0; s < 5; s++) {
          const ang = (s / 5) * Math.PI * 2;
          const spike = new THREE.Mesh(this.thornSpikeGeo, this.thornMat);
          spike.position.set(Math.cos(ang) * 0.68, 0.28, Math.sin(ang) * 0.68);
          spike.rotation.z = -Math.cos(ang) * 0.35;
          spike.rotation.x = Math.sin(ang) * 0.35;
          thornGroup.add(spike);
        }
        mesh.add(thornGroup);

        const flowerGroup = new THREE.Group();
        flowerGroup.visible = false;
        for (let f = 0; f < 4; f++) {
          const ang = (f / 4) * Math.PI * 2 + 0.4;
          const core = new THREE.Mesh(this.flowerCoreGeo, this.flowerCoreMat);
          core.position.set(Math.cos(ang) * 0.55, 0.24, Math.sin(ang) * 0.55);
          flowerGroup.add(core);
          const petal = new THREE.Mesh(this.flowerPetalGeo, this.flowerPetalMat);
          petal.position.set(Math.cos(ang) * 0.55, 0.12, Math.sin(ang) * 0.55);
          petal.scale.set(1.6, 0.45, 1.6);
          flowerGroup.add(petal);
        }
        mesh.add(flowerGroup);

        const initialRadius = 3.5 + k * 0.25;
        thornGroup.scale.setScalar(initialRadius / 2.2);

        this.rootGroup.add(mesh);
        this.thornPatches.push({
          id: `thorn_${idx}`,
          index: idx,
          laneIdx: lane.laneIdx,
          fissureIndex: lane.laneIdx,
          x: px,
          y: py,
          z: pz,
          originX: lane.originX,
          originZ: lane.originZ,
          targetX: lane.targetX,
          targetZ: lane.targetZ,
          currentRadius: initialRadius,
          radius: initialRadius,
          maxRadius: 4.8,
          creepSpeed: 0.46,
          growthRate: 0.09,
          density: 1.0,
          active: true,
          dissolved: false,
          regrowCooldown: 0,
          bloomFlowerTimer: 0,
          mesh,
          thornGroup,
          flowerGroup,
        });
        idx++;
      }
    }
  }

  _buildGloomSpores() {
    let idx = 0;
    for (const lane of OPPOSITION_LANES) {
      for (let k = 0; k < 5; k++) {
        const frac = 0.12 + k * 0.17;
        const lat = (k % 2 === 0 ? 1 : -1) * 1.1;
        const sx = lane.originX + (lane.targetX - lane.originX) * frac + lat * 0.4;
        const sz = lane.originZ + (lane.targetZ - lane.originZ) * frac - lat * 0.4;
        const baseY = this.sampleGroundY(sx, sz) + 1.35;
        const bobPhase = idx * 0.85;
        const sy = baseY + Math.sin(bobPhase) * 0.22;
        const polarity = idx % 2 === 0 ? "+" : "-";
        const tendrilMat =
          polarity === "+" ? this.sporePlusTendrilMat : this.sporeMinusTendrilMat;

        const mesh = new THREE.Mesh(
          this.sporeGeo,
          polarity === "+" ? this.sporePlusMat : this.sporeMinusMat
        );
        mesh.name = `GloomSporeWisp_${idx}`;

        const collarRim = new THREE.Mesh(this.sporeRimGeo, tendrilMat);
        collarRim.rotation.x = Math.PI / 2;
        collarRim.position.y = -0.14;
        mesh.add(collarRim);

        for (const tGeo of this.sporeTendrilGeos) {
          const tendril = new THREE.Mesh(tGeo, tendrilMat);
          tendril.position.y = -0.1;
          mesh.add(tendril);
        }

        mesh.position.set(sx, sy, sz);
        mesh.rotation.y = Math.atan2(-(lane.targetX - sx), -(lane.targetZ - sz));
        this.rootGroup.add(mesh);

        this.gloomSpores.push({
          id: `spore_${idx}`,
          index: idx,
          laneIdx: lane.laneIdx,
          x: sx,
          y: sy,
          z: sz,
          baseY,
          originX: lane.originX,
          originZ: lane.originZ,
          targetX: lane.targetX,
          targetZ: lane.targetZ,
          driftSpeed: 0.72,
          bobPhase,
          phase: bobPhase,
          radius: 1.1,
          active: true,
          respawnCooldown: 0,
          polarity,
          mesh,
        });
        idx++;
      }
    }
  }

  _buildThornChasms() {
    for (const spec of THORN_CHASM_SPECS) {
      const cy = this.sampleGroundY(spec.x, spec.z);
      const grp = new THREE.Group();
      grp.position.set(spec.x, cy + 0.04, spec.z);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(spec.radius * 0.82, 0.22, 8, 24),
        this.chasmRimMat
      );
      rim.rotation.x = -Math.PI / 2;
      grp.add(rim);

      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(this.thornSpikeGeo, this.thornMat);
        spike.position.set(Math.cos(ang) * (spec.radius * 0.55), 0.22, Math.sin(ang) * (spec.radius * 0.55));
        grp.add(spike);
      }

      this.rootGroup.add(grp);
      this.thornChasms.push({
        id: spec.id,
        x: spec.x,
        y: cy,
        z: spec.z,
        radius: spec.radius,
        soarCooldown: 0,
        group: grp,
      });
    }
  }

  _buildElixirWaves() {
    for (let i = 0; i < 4; i++) {
      const mat = this.waveMatTemplate.clone();
      const ringMesh = new THREE.Mesh(this.waveRingGeo, mat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.visible = false;
      this.rootGroup.add(ringMesh);
      this.elixirWaves.push({
        active: false,
        cx: 0,
        cy: 0.5,
        cz: 0,
        radius: 1.0,
        maxRadius: 26.0,
        duration: 1.0,
        elapsed: 0,
        isOverdrive: false,
        dissolvedCount: 0,
        ringMesh,
        mat,
      });
    }
  }

  getSiphonRadius(upgradesSet) {
    const hasWide =
      upgradesSet instanceof Set
        ? upgradesSet.has("or_wide_siphon")
        : Array.isArray(upgradesSet) && upgradesSet.includes("or_wide_siphon");
    return hasWide
      ? Number((BASE_SIPHON_RADIUS * WIDE_SIPHON_MULTIPLIER).toFixed(4))
      : BASE_SIPHON_RADIUS;
  }

  evaluateBrambleContact(px, pz, pyAboveGround, speed, upgradesSet, callbacks = {}) {
    const hasTuskPlow =
      upgradesSet instanceof Set
        ? upgradesSet.has("or_tusk_plow") || upgradesSet.has("wide_blade")
        : Array.isArray(upgradesSet) &&
          (upgradesSet.includes("or_tusk_plow") || upgradesSet.includes("wide_blade"));
    const hasGlideWings =
      upgradesSet instanceof Set
        ? upgradesSet.has("or_glide_wings") || upgradesSet.has("ion_boosters")
        : Array.isArray(upgradesSet) &&
          (upgradesSet.includes("or_glide_wings") || upgradesSet.includes("ion_boosters"));

    let chasmLift = 0;
    let chasmBoost = 1.0;
    let inChasmHazard = false;

    for (const chasm of this.thornChasms) {
      const dChasm = Math.hypot(px - chasm.x, pz - chasm.z);
      if (dChasm < chasm.radius) {
        if (hasGlideWings) {
          chasmLift = 2.8;
          chasmBoost = 1.24;
          if (chasm.soarCooldown <= 0 && Math.abs(speed) > 0.6) {
            chasm.soarCooldown = 4.5;
            callbacks.audio?.playUpdraftLift?.();
            callbacks.onWorldActivity?.(1, 2, "chasmSoar");
            callbacks.onOppositionEvent?.({
              kind: "chasm_soar",
              shardsEarned: 2,
              message: "Glided cleanly above thorn chasm!",
            });
          }
        } else {
          inChasmHazard = true;
        }
      }
    }

    if (pyAboveGround >= 1.25 || chasmLift > 0) {
      return {
        inBramble: false,
        dragMultiplier: 1.0,
        chasmLift,
        speedBoostMultiplier: chasmBoost,
      };
    }

    let touchedActiveBramble = false;
    for (const patch of this.thornPatches) {
      if (patch.dissolved) continue;
      const dist = Math.hypot(px - patch.x, pz - patch.z);
      if (dist < patch.currentRadius) {
        touchedActiveBramble = true;
        if (hasTuskPlow) {
          if (Math.abs(speed) > 0.35) {
            this._dissolvePatchIntoFlowers(patch, 15.0, 22.0);
            callbacks.menagerie?.wakeCreatureAtLane?.(patch.laneIdx);
            callbacks.audio?.playBrambleSmash?.();
            const areaM2 = Math.max(4, Math.round(Math.PI * patch.currentRadius * patch.currentRadius));
            callbacks.onWorldActivity?.(areaM2, 2, "blightClearedM2");
            callbacks.onOppositionEvent?.({
              kind: "bramble_plowed",
              shardsEarned: 2,
              message: "Tusk plow smashed blight thorns!",
            });
          }
        }
      }
    }

    if (touchedActiveBramble || inChasmHazard) {
      return {
        inBramble: true,
        dragMultiplier: hasTuskPlow ? PLOW_FULL_SPEED_FACTOR : BRAMBLE_DRAG_FACTOR,
        chasmLift: 0,
        speedBoostMultiplier: 1.0,
      };
    }

    return {
      inBramble: false,
      dragMultiplier: 1.0,
      chasmLift: 0,
      speedBoostMultiplier: 1.0,
    };
  }

  _dissolvePatchIntoFlowers(patch, flowerSec = 14.0, regrowSec = 20.0) {
    patch.dissolved = true;
    patch.active = false;
    patch.density = 0;
    patch.bloomFlowerTimer = flowerSec;
    patch.regrowCooldown = regrowSec;
    patch.thornGroup.visible = false;
    patch.flowerGroup.visible = true;
  }

  vacuumSporesAt(px, pz, upgradesSet, siphonOrbs = null, menagerie = null, callbacks = {}) {
    const radius = this.getSiphonRadius(upgradesSet);
    let purifiedCount = 0;

    for (const spore of this.gloomSpores) {
      if (!spore.active) continue;
      const dist = Math.hypot(spore.x - px, spore.z - pz);
      if (dist <= radius) {
        spore.active = false;
        spore.respawnCooldown = 16.0;
        spore.mesh.visible = false;
        purifiedCount++;
        if (siphonOrbs) {
          if (spore.polarity === "+") {
            siphonOrbs.pos = (siphonOrbs.pos || 0) + 1;
            siphonOrbs.sun_orb = (siphonOrbs.sun_orb || 0) + 1;
          } else {
            siphonOrbs.neg = (siphonOrbs.neg || 0) + 1;
            siphonOrbs.frost_spore = (siphonOrbs.frost_spore || 0) + 1;
          }
        }
      }
    }

    if (menagerie && typeof menagerie.wakeCreaturesNear === "function") {
      menagerie.wakeCreaturesNear(px, pz, radius + 2.5);
    }

    if (purifiedCount > 0) {
      callbacks.audio?.playSiphonPop?.(1.15);
      callbacks.onWorldActivity?.(purifiedCount, purifiedCount, "sporesPurified");
      callbacks.onOppositionEvent?.({
        kind: "spores_purified",
        shardsEarned: purifiedCount,
        message: "Siphon purified gloom spores!",
      });
    }

    return { purifiedCount, radius };
  }

  triggerElixirPushbackWave(cx, cy, cz, isOverdrive = false, menagerie = null, callbacks = {}) {
    let slot = this.elixirWaves.find((w) => !w.active);
    if (!slot) slot = this.elixirWaves[0];

    const maxRadius = isOverdrive ? 35.0 : 26.0;
    slot.active = true;
    slot.cx = cx;
    slot.cy = cy + 0.45;
    slot.cz = cz;
    slot.radius = 2.0;
    slot.maxRadius = maxRadius;
    slot.duration = 1.0;
    slot.elapsed = 0;
    slot.isOverdrive = Boolean(isOverdrive);
    slot.dissolvedCount = 0;
    slot.ringMesh.position.set(cx, cy + 0.45, cz);
    slot.ringMesh.scale.setScalar(2.0);
    slot.mat.color.setHex(isOverdrive ? 0xffd166 : 0x5ef2c8);
    slot.mat.opacity = 0.85;
    slot.ringMesh.visible = true;

    const initialSweep = 15.0;
    const clearedNow = this._sweepWaveRadius(cx, cz, initialSweep, menagerie);
    slot.dissolvedCount += clearedNow;

    const bonusShards = isOverdrive ? 5 : 3;
    callbacks.audio?.playElixirWave?.();
    callbacks.onWorldActivity?.(Math.max(1, clearedNow), bonusShards, "elixirWavesCast");
    callbacks.onOppositionEvent?.({
      kind: "elixir_wave",
      shardsEarned: bonusShards,
      message: "Elixir wave bloomed blight away!",
    });

    return slot;
  }

  _sweepWaveRadius(cx, cz, radius, menagerie = null) {
    let count = 0;
    for (const patch of this.thornPatches) {
      if (!patch.dissolved && Math.hypot(patch.x - cx, patch.z - cz) <= radius) {
        this._dissolvePatchIntoFlowers(patch, 16.0, 24.0);
        menagerie?.wakeCreatureAtLane?.(patch.laneIdx);
        count++;
      }
    }
    for (const spore of this.gloomSpores) {
      if (spore.active && Math.hypot(spore.x - cx, spore.z - cz) <= radius) {
        spore.active = false;
        spore.respawnCooldown = 18.0;
        spore.mesh.visible = false;
        count++;
      }
    }
    if (menagerie && typeof menagerie.wakeCreaturesNear === "function") {
      menagerie.wakeCreaturesNear(cx, cz, radius + 2.0);
    }
    return count;
  }

  step(dt, context = {}) {
    const {
      paused = false,
      menagerie = null,
      onWorldActivity = null,
    } = context;

    // Strict Math-Pause Law: ZERO coordinate, radius, density, or phase mutation while paused!
    if (paused) {
      return;
    }

    for (const chasm of this.thornChasms) {
      if (chasm.soarCooldown > 0) {
        chasm.soarCooldown = Math.max(0, chasm.soarCooldown - dt);
      }
    }

    this._advanceThornsAndSpores(dt, menagerie);
    this._stepElixirWaves(dt, menagerie, onWorldActivity);
  }

  _advanceThornsAndSpores(dt, menagerie) {
    for (const patch of this.thornPatches) {
      if (patch.dissolved) {
        if (patch.bloomFlowerTimer > 0) {
          patch.bloomFlowerTimer = Math.max(0, patch.bloomFlowerTimer - dt);
          if (patch.bloomFlowerTimer <= 0) {
            patch.flowerGroup.visible = false;
          }
        }
        if (patch.regrowCooldown > 0) {
          patch.regrowCooldown -= dt;
          if (patch.regrowCooldown <= 0) {
            patch.dissolved = false;
            patch.active = true;
            patch.density = 1.0;
            patch.x = patch.originX;
            patch.z = patch.originZ;
            patch.y = this.sampleGroundY(patch.x, patch.z);
            patch.currentRadius = 1.9;
            patch.radius = 1.9;
            patch.thornGroup.visible = true;
            patch.flowerGroup.visible = false;
            patch.thornGroup.scale.setScalar(patch.currentRadius / 2.2);
            patch.mesh.position.set(patch.x, patch.y + 0.08, patch.z);
          }
        }
        continue;
      }

      const dx = patch.targetX - patch.x;
      const dz = patch.targetZ - patch.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 1.6) {
        const stepDist = Math.min(dist - 1.6, patch.creepSpeed * dt);
        patch.x += (dx / dist) * stepDist;
        patch.z += (dz / dist) * stepDist;
        patch.y = this.sampleGroundY(patch.x, patch.z);
      } else if (menagerie && typeof menagerie.nudgeNestSleepiness === "function") {
        menagerie.nudgeNestSleepiness(patch.laneIdx, 0.52 * dt);
      }

      if (patch.currentRadius < patch.maxRadius) {
        patch.currentRadius = Math.min(patch.maxRadius, patch.currentRadius + patch.growthRate * dt);
        patch.radius = patch.currentRadius;
      }

      patch.thornGroup.scale.setScalar(patch.currentRadius / 2.2);
      patch.mesh.position.set(patch.x, patch.y + 0.08, patch.z);
    }

    for (const spore of this.gloomSpores) {
      if (!spore.active) {
        if (spore.respawnCooldown > 0) {
          spore.respawnCooldown -= dt;
          if (spore.respawnCooldown <= 0) {
            spore.active = true;
            spore.x = spore.originX;
            spore.z = spore.originZ;
            spore.baseY = this.sampleGroundY(spore.x, spore.z) + 1.35;
            spore.y = spore.baseY + Math.sin(spore.bobPhase) * 0.22;
            spore.mesh.position.set(spore.x, spore.y, spore.z);
            spore.mesh.visible = true;
          }
        }
        continue;
      }

      if (!spore.mesh.visible) {
        spore.mesh.visible = true;
      }

      const dx = spore.targetX - spore.x;
      const dz = spore.targetZ - spore.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 1.4) {
        const stepDist = Math.min(dist - 1.4, spore.driftSpeed * dt);
        spore.x += (dx / dist) * stepDist;
        spore.z += (dz / dist) * stepDist;
        spore.baseY = this.sampleGroundY(spore.x, spore.z) + 1.35;
      } else if (menagerie && typeof menagerie.nudgeNestSleepiness === "function") {
        menagerie.nudgeNestSleepiness(spore.laneIdx, 0.48 * dt);
      }

      spore.bobPhase += dt * 2.6;
      spore.phase = spore.bobPhase;
      spore.y = spore.baseY + Math.sin(spore.bobPhase) * 0.22;
      spore.mesh.position.set(spore.x, spore.y, spore.z);
      const bellPulse = Math.sin(spore.bobPhase * 1.35) * 0.055;
      spore.mesh.scale.set(1 + bellPulse, 1 - bellPulse * 0.6, 1 + bellPulse);
      if (dist > 0.05) {
        spore.mesh.rotation.y = Math.atan2(-dx, -dz);
      }
    }
  }

  _stepElixirWaves(dt, menagerie, onWorldActivity) {
    for (const wave of this.elixirWaves) {
      if (!wave.active) continue;
      wave.elapsed += dt;
      const u = Math.min(1, wave.elapsed / wave.duration);
      wave.radius = 2.0 + (wave.maxRadius - 2.0) * (1 - Math.pow(1 - u, 2));
      wave.ringMesh.scale.setScalar(wave.radius);
      wave.mat.opacity = Math.max(0, 0.85 * (1 - u));

      const newlyCleared = this._sweepWaveRadius(wave.cx, wave.cz, wave.radius, menagerie);
      if (newlyCleared > 0) {
        wave.dissolvedCount += newlyCleared;
        onWorldActivity?.(newlyCleared * 6, 0, "blightClearedM2");
      }

      if (u >= 1) {
        wave.active = false;
        wave.ringMesh.visible = false;
      }
    }
  }
}
