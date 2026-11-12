/**
 * Frostwake Active Spatial Opposition & Upgrade Stakes Engine
 * Anxiety-safe spatial stakes: zero lose-states, zero health bars, untimed,
 * and bitwise frozen whenever the Encounter Dock or an approach gate is active.
 */

import * as THREE from "../vendor/three.module.min.js";

export const PERMAFROST_BASE_DRAG = 0.42;
export const BASE_KNOCKBACK_RADIUS = 2.6;
export const WIDE_BLADE_KNOCKBACK_MULT = 3.0; // 7.8m wide knockback wave
export const HARPOON_GRAPPLE_RANGE = 16.0;
export const HARPOON_AUTO_RANGE = 14.5;
export const RIME_BLAST_RADIUS = 18.0;

export const FOX_DEN_SPECS = [
  { id: "den_west", x: -38, z: -4 },
  { id: "den_nw", x: -18, z: -38 },
  { id: "den_ne", x: 18, z: -38 },
  { id: "den_se", x: 22, z: 22 },
];

export const GEOTHERMAL_VENT_SPECS = [
  { id: "vent_west", x: -46, z: 5, linkedDenId: "den_west" },
  { id: "vent_nw", x: -26, z: -45, linkedDenId: "den_nw" },
  { id: "vent_ne", x: 26, z: -45, linkedDenId: "den_ne" },
  { id: "vent_se", x: 32, z: 19, linkedDenId: "den_se" },
];

export const GEOTHERMAL_GEYSER_SPECS = [
  { id: "geyser_west", x: -50, z: -14 },
  { id: "geyser_nw", x: -10, z: -44 },
  { id: "geyser_ne", x: 10, z: -44 },
  { id: "geyser_se", x: 28, z: 29 },
];

export const FISSURE_LANE_SPECS = [
  { id: "fissure_west", x: -61, z: -10, targetDenId: "den_west", hasCaptain: true },
  { id: "fissure_nw", x: -26, z: -58, targetDenId: "den_nw", hasCaptain: false },
  { id: "fissure_ne", x: 26, z: -58, targetDenId: "den_ne", hasCaptain: true },
  { id: "fissure_se", x: 44, z: 42, targetDenId: "den_se", hasCaptain: false },
];

export const PERMAFROST_DRIFT_SPECS = [
  { id: "drift_west", x: -34, z: -15, radius: 6.8 },
  { id: "drift_north", x: 2, z: -47, radius: 6.5 },
  { id: "drift_east", x: 28, z: -6, radius: 6.8 },
  { id: "drift_south", x: 14, z: 32, radius: 6.5 },
];

export const CHASM_SPEC = {
  rampStartX: 34.0,
  rampLipX: 40.0,
  landingBankX: 48.5,
  bankEndX: 55.0,
  centerZ: 10.0,
  halfWidthZ: 3.6,
  lipLiftY: 2.4,
  basinDipY: -1.6,
  landingLiftY: 1.1,
  cacheX: 51.5,
  cacheZ: 10.0,
};

export const ICE_POD_SPECS = [
  { id: "pod_0", x: -42, z: -20, elevated: false },
  { id: "pod_1", x: -45, z: -17, elevated: false },
  { id: "pod_2", x: -12, z: -32, elevated: false },
  { id: "pod_3", x: -8, z: -34, elevated: false },
  { id: "pod_4", x: 12, z: -32, elevated: false },
  { id: "pod_5", x: 8, z: -34, elevated: false },
  { id: "pod_6", x: 36, z: 24, elevated: false },
  { id: "pod_7", x: 39, z: 21, elevated: false },
  // 4 elevated spire pods (> 9m clear of quadrant Sky-Whale beacons)
  { id: "pod_8", x: -48, z: 14, elevated: true },
  { id: "pod_9", x: -42, z: -44, elevated: true },
  { id: "pod_10", x: 42, z: -44, elevated: true },
  { id: "pod_11", x: 52, z: -8, elevated: true },
];

function toFiniteNumber(val, fallback = NaN) {
  if (typeof val === "number") return Number.isFinite(val) ? val : fallback;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export class FrostwakeOpposition3D {
  constructor(opts = {}) {
    const safeOpts = opts && typeof opts === "object" ? opts : {};
    const {
      scene = null,
      baseHeightFn = null,
      createFoxMeshFn = null,
      tintSnowDiscFn = null,
      spawnCrystalBurstFn = null,
      audio = null,
      emitRewardFn = null,
    } = safeOpts;
    this.scene = scene;
    this.baseHeightFn = typeof baseHeightFn === "function" ? baseHeightFn : () => 0;
    this.createFoxMeshFn =
      typeof createFoxMeshFn === "function" ? createFoxMeshFn : () => new THREE.Group();
    this.tintSnowDiscFn = typeof tintSnowDiscFn === "function" ? tintSnowDiscFn : () => {};
    this.spawnCrystalBurstFn =
      typeof spawnCrystalBurstFn === "function" ? spawnCrystalBurstFn : () => {};
    this.audio = audio && typeof audio === "object" ? audio : null;
    this.emitRewardFn = typeof emitRewardFn === "function" ? emitRewardFn : () => {};

    this.paused = false;
    this.elapsed = 0;
    this.rigThermalChargeSec = 0;
    this.ventToastCooldown = 0;
    this.deflectCooldown = 0;
    this.harpoonAutoCooldown = 0;
    this.chasmJump = null;
    this.chasmBasinToastCooldown = 0;
    this.chasmCacheCooldown = 0;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "frostwake_opposition_root";
    if (this.scene) this.scene.add(this.rootGroup);

    this.foxDens = [];
    this.geothermalVents = [];
    this.geothermalGeysers = [];
    this.permafrostDrifts = [];
    this.icePods = [];
    this.rimeUnits = [];
    this.rimeCreeps = [];
    this.rimeCaptains = [];
    this.shockRings = [];
    this.harpoonCables = [];

    this._buildFoxDens();
    this._buildVentsAndGeysers();
    this._buildPermafrostDrifts();
    this._buildBrokenIceChasm();
    this._buildIcePods();
    this._buildRimeUnits();
    this._buildEffectPools();
  }

  setPaused(flag) {
    this.paused = Boolean(flag);
  }

  _buildFoxDens() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x243b55, roughness: 0.65 });
    const cocoonGeo = new THREE.SphereGeometry(0.84, 12, 10);

    for (const spec of FOX_DEN_SPECS) {
      const y = this.baseHeightFn(spec.x, spec.z);
      const group = new THREE.Group();
      group.position.set(spec.x, y, spec.z);
      group.userData = { denId: spec.id };

      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.3, 0.45, 10), stoneMat);
      baseRing.position.y = 0.22;
      group.add(baseRing);

      const hearthMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xf4a62a,
        emissiveIntensity: 0.95,
        roughness: 0.25,
      });
      const hearthMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), hearthMat);
      hearthMesh.position.y = 1.35;
      group.add(hearthMesh);

      const moatGeo = new THREE.RingGeometry(3.3, 4.25, 32);
      moatGeo.rotateX(-Math.PI / 2);
      const moatMat = new THREE.MeshBasicMaterial({
        color: 0xff9f43,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      const moatRing = new THREE.Mesh(moatGeo, moatMat);
      moatRing.position.y = 0.5;
      moatRing.visible = false;
      group.add(moatRing);

      const foxMeshes = [];
      const cocoonMeshes = [];
      const cocoonMat = new THREE.MeshStandardMaterial({
        color: 0x72efdd,
        emissive: 0x2ec4b6,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.52,
        roughness: 0.2,
      });

      for (let k = 0; k < 2; k++) {
        const fx = k === 0 ? -1.45 : 1.45;
        const fz = k === 0 ? 0.85 : -0.65;
        const fox = this.createFoxMeshFn();
        fox.position.set(fx, 0.35, fz);
        fox.rotation.y = k === 0 ? 0.7 : -2.1;
        group.add(fox);
        foxMeshes.push(fox);

        const cocoon = new THREE.Mesh(cocoonGeo, cocoonMat);
        cocoon.scale.set(1.12, 0.8, 1.12);
        cocoon.position.set(fx, 0.78, fz);
        cocoon.visible = false;
        group.add(cocoon);
        cocoonMeshes.push(cocoon);
      }

      this.rootGroup.add(group);
      this.foxDens.push({
        id: spec.id,
        x: spec.x,
        y,
        z: spec.z,
        chillLevel: 0,
        isChilled: false,
        thermalShieldSec: 0,
        group,
        hearthMesh,
        hearthMat,
        moatRing,
        foxMeshes,
        cocoonMeshes,
      });
    }
  }

  _buildVentsAndGeysers() {
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const magmaMat = new THREE.MeshStandardMaterial({
      color: 0xff8c42,
      emissive: 0xff6b2b,
      emissiveIntensity: 1.15,
      roughness: 0.25,
    });
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.38,
    });

    for (const spec of GEOTHERMAL_VENT_SPECS) {
      const y = this.baseHeightFn(spec.x, spec.z);
      const g = new THREE.Group();
      g.position.set(spec.x, y, spec.z);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.48, 8, 18), basaltMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.48;
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.32, 16), magmaMat);
      pool.position.y = 0.42;
      const plume = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.8, 10, 1, true), steamMat);
      plume.position.y = 2.3;
      g.add(rim, pool, plume);
      this.rootGroup.add(g);

      this.geothermalVents.push({
        id: spec.id,
        x: spec.x,
        y,
        z: spec.z,
        linkedDenId: spec.linkedDenId,
        group: g,
        plume,
      });
    }

    const geyserMat = new THREE.MeshBasicMaterial({
      color: 0x45f0df,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    });
    for (const spec of GEOTHERMAL_GEYSER_SPECS) {
      const y = this.baseHeightFn(spec.x, spec.z);
      const g = new THREE.Group();
      g.position.set(spec.x, y, spec.z);

      const basin = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.42, 8, 20), basaltMat);
      basin.rotation.x = Math.PI / 2;
      basin.position.y = 0.45;
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.35, 6.2, 12, 1, true), geyserMat);
      column.position.y = 3.3;
      g.add(basin, column);
      this.rootGroup.add(g);

      this.geothermalGeysers.push({
        id: spec.id,
        x: spec.x,
        y,
        z: spec.z,
        group: g,
        column,
      });
    }
  }

  _buildPermafrostDrifts() {
    const moundGeo = new THREE.DodecahedronGeometry(1.45, 0);
    for (const spec of PERMAFROST_DRIFT_SPECS) {
      const y = this.baseHeightFn(spec.x, spec.z);
      const group = new THREE.Group();
      group.position.set(spec.x, y, spec.z);
      group.userData = { driftId: spec.id };

      const driftMat = new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.55,
        roughness: 0.28,
        metalness: 0.15,
        transparent: true,
        opacity: 0.88,
      });

      const mounds = [];
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2;
        const r = i === 0 ? 0 : spec.radius * 0.56;
        const m = new THREE.Mesh(moundGeo, driftMat);
        const mx = Math.cos(ang) * r;
        const mz = Math.sin(ang) * r;
        m.position.set(mx, 0.55, mz);
        m.scale.set(i === 0 ? 1.8 : 1.35, 0.52, i === 0 ? 1.8 : 1.35);
        m.rotation.y = i * 0.9;
        group.add(m);
        mounds.push(m);
      }

      this.rootGroup.add(group);
      this.tintSnowDiscFn(spec.x, spec.z, spec.radius, "permafrost");

      this.permafrostDrifts.push({
        id: spec.id,
        x: spec.x,
        y,
        z: spec.z,
        radius: spec.radius,
        integrity: 1.0,
        refrostTimer: 0,
        group,
        mounds,
        driftMat,
      });
    }
  }

  reapplyPermafrostTint() {
    for (const d of this.permafrostDrifts) {
      if (d.integrity > 0.2) {
        this.tintSnowDiscFn(d.x, d.z, d.radius, "permafrost");
      }
    }
  }

  _buildBrokenIceChasm() {
    const g = new THREE.Group();
    g.name = "broken_ice_chasm";

    const iceRampMat = new THREE.MeshStandardMaterial({
      color: 0x5ce1e6,
      emissive: 0x1cb5a3,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      transparent: true,
      opacity: 0.86,
    });
    const rampLen = CHASM_SPEC.rampLipX - CHASM_SPEC.rampStartX;
    const rampMidX = (CHASM_SPEC.rampStartX + CHASM_SPEC.rampLipX) * 0.5;
    const rampBaseY = this.baseHeightFn(rampMidX, CHASM_SPEC.centerZ);
    const rampDeck = new THREE.Mesh(
      new THREE.BoxGeometry(rampLen, 0.45, CHASM_SPEC.halfWidthZ * 2),
      iceRampMat
    );
    rampDeck.position.set(rampMidX, rampBaseY + CHASM_SPEC.lipLiftY * 0.5, CHASM_SPEC.centerZ);
    rampDeck.rotation.z = Math.atan2(CHASM_SPEC.lipLiftY, rampLen);
    g.add(rampDeck);

    const bankLen = CHASM_SPEC.bankEndX - CHASM_SPEC.landingBankX;
    const bankMidX = (CHASM_SPEC.landingBankX + CHASM_SPEC.bankEndX) * 0.5;
    const bankBaseY = this.baseHeightFn(bankMidX, CHASM_SPEC.centerZ);
    const bankDeck = new THREE.Mesh(
      new THREE.BoxGeometry(bankLen, 0.55, CHASM_SPEC.halfWidthZ * 2.1),
      new THREE.MeshStandardMaterial({ color: 0xe2f4ff, roughness: 0.45 })
    );
    bankDeck.position.set(bankMidX, bankBaseY + CHASM_SPEC.landingLiftY * 0.7, CHASM_SPEC.centerZ);
    g.add(bankDeck);

    const cacheBaseY = this.baseHeightFn(CHASM_SPEC.cacheX, CHASM_SPEC.cacheZ);
    this.chasmStarCache = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xf4a62a,
        emissiveIntensity: 0.95,
        roughness: 0.18,
      })
    );
    this.chasmStarCache.position.set(
      CHASM_SPEC.cacheX,
      cacheBaseY + CHASM_SPEC.landingLiftY + 1.65,
      CHASM_SPEC.cacheZ
    );
    g.add(this.chasmStarCache);

    this.chasmGroup = g;
    this.rootGroup.add(g);
  }

  _buildIcePods() {
    const shellGeo = new THREE.OctahedronGeometry(0.95, 1);
    const coreGeo = new THREE.OctahedronGeometry(0.45, 0);
    const spireGeo = new THREE.ConeGeometry(1.4, 4.8, 6);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x274c77, roughness: 0.35, metalness: 0.2 });
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x72efdd,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.78,
      roughness: 0.15,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf4a62a,
      emissiveIntensity: 0.9,
    });

    for (const spec of ICE_POD_SPECS) {
      const groundY = this.baseHeightFn(spec.x, spec.z);
      const container = new THREE.Group();
      container.position.set(spec.x, groundY, spec.z);

      let podLocalY = 1.05;
      if (spec.elevated) {
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.y = 2.4;
        container.add(spire);
        podLocalY = 5.15;
      }

      const podMesh = new THREE.Group();
      podMesh.position.y = podLocalY;
      const shell = new THREE.Mesh(shellGeo, shellMat);
      const core = new THREE.Mesh(coreGeo, coreMat);
      podMesh.add(shell, core);
      container.add(podMesh);
      this.rootGroup.add(container);

      this.icePods.push({
        id: spec.id,
        x: spec.x,
        z: spec.z,
        groundY,
        worldY: groundY + podLocalY,
        elevated: spec.elevated,
        intact: true,
        respawnTimer: 0,
        container,
        podMesh,
      });
    }
  }

  _buildRimeUnits() {
    const slimeGeo = new THREE.SphereGeometry(0.92, 12, 10);
    const captainGeo = new THREE.SphereGeometry(1.28, 14, 12);
    const eyeGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const crownSpikeGeo = new THREE.ConeGeometry(0.22, 0.65, 5);
    const shieldGeo = new THREE.CylinderGeometry(1.85, 1.85, 2.2, 6, 1, true);

    const slimeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    });
    const captainMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.68,
      roughness: 0.22,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.65,
    });

    const createUnit = (lane, tSpawn, isCaptain, unitIdx) => {
      const den = this.foxDens.find((d) => d.id === lane.targetDenId) || this.foxDens[0];
      const sx = lane.x + (den.x - lane.x) * tSpawn;
      const sz = lane.z + (den.z - lane.z) * tSpawn;
      const sy = this.baseHeightFn(sx, sz) + 0.75;

      const group = new THREE.Group();
      group.position.set(sx, sy, sz);

      const body = new THREE.Mesh(isCaptain ? captainGeo : slimeGeo, isCaptain ? captainMat : slimeMat);
      body.scale.set(1.08, 0.84, 1.08);
      group.add(body);

      for (const ex of [-0.32, 0.32]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex * (isCaptain ? 1.35 : 1), isCaptain ? 0.35 : 0.24, isCaptain ? -1.08 : -0.78);
        group.add(eye);
      }

      const spike = new THREE.Mesh(crownSpikeGeo, spikeMat);
      spike.position.y = isCaptain ? 1.25 : 0.92;
      group.add(spike);

      let shieldMesh = null;
      if (isCaptain) {
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0x67e8f9,
          emissive: 0x22d3ee,
          emissiveIntensity: 0.75,
          transparent: true,
          opacity: 0.46,
          side: THREE.DoubleSide,
        });
        shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.y = 0.25;
        group.add(shieldMesh);
      }

      this.rootGroup.add(group);
      const unit = {
        id: isCaptain ? `captain_${lane.id}` : `creep_${lane.id}_${unitIdx}`,
        isCaptain,
        shieldIntact: Boolean(isCaptain),
        laneId: lane.id,
        fissureX: lane.x,
        fissureZ: lane.z,
        targetDenId: den.id,
        x: sx,
        y: sy,
        z: sz,
        vx: 0,
        vy: 0,
        vz: 0,
        state: "creeping",
        stateTimer: 0,
        respawnTimer: 0,
        hopPhase: unitIdx * 1.3,
        group,
        body,
        shieldMesh,
      };
      this.rimeUnits.push(unit);
      if (isCaptain) this.rimeCaptains.push(unit);
      else this.rimeCreeps.push(unit);
    };

    FISSURE_LANE_SPECS.forEach((lane, lIdx) => {
      createUnit(lane, 0.18, false, lIdx * 2);
      createUnit(lane, 0.44, false, lIdx * 2 + 1);
      if (lane.hasCaptain) {
        createUnit(lane, 0.31, true, lIdx * 10 + 9);
      }
    });
  }

  _buildEffectPools() {
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.RingGeometry(0.85, 1.35, 36);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x45f0df,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.rootGroup.add(mesh);
      this.shockRings.push({ mesh, mat, life: 0, maxLife: 0.75, maxRadius: 18 });
    }

    for (let i = 0; i < 3; i++) {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffd166,
          transparent: true,
          opacity: 0.95,
        })
      );
      cyl.visible = false;
      this.rootGroup.add(cyl);
      this.harpoonCables.push({ mesh: cyl, life: 0 });
    }
  }

  _spawnShockRing(x, z, maxRadius = RIME_BLAST_RADIUS, colorHex = 0x45f0df) {
    const slot = this.shockRings.find((r) => r.life <= 0) || this.shockRings[0];
    slot.life = 0.75;
    slot.maxLife = 0.75;
    slot.maxRadius = maxRadius;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.85;
    slot.mesh.position.set(x, this.baseHeightFn(x, z) + 0.68, z);
    slot.mesh.scale.setScalar(1);
    slot.mesh.visible = true;
  }

  _spawnHarpoonCable(ax, ay, az, bx, by, bz) {
    const slot = this.harpoonCables.find((c) => c.life <= 0) || this.harpoonCables[0];
    const start = new THREE.Vector3(ax, ay, az);
    const end = new THREE.Vector3(bx, by, bz);
    const dist = Math.max(0.2, start.distanceTo(end));
    slot.mesh.scale.set(1, dist, 1);
    slot.mesh.position.copy(start).lerp(end, 0.5);
    slot.mesh.lookAt(end);
    slot.mesh.rotateX(Math.PI / 2);
    slot.mesh.material.opacity = 0.96;
    slot.mesh.visible = true;
    slot.life = 0.45;
    return slot;
  }

  getPermafrostSpeedFactor(x, z, hasWideBlade = false) {
    for (const d of this.permafrostDrifts) {
      if (d.integrity <= 0.2) continue;
      if (Math.hypot(x - d.x, z - d.z) <= d.radius) {
        return hasWideBlade ? 1.0 : PERMAFROST_BASE_DRAG;
      }
    }
    return 1.0;
  }

  isInsideIntactPermafrost(x, z) {
    for (const d of this.permafrostDrifts) {
      if (d.integrity > 0.2 && Math.hypot(x - d.x, z - d.z) <= d.radius) {
        return true;
      }
    }
    return false;
  }

  computeChasmSurfaceY(x, z, baseY) {
    const safeBaseY = Number.isFinite(baseY) ? baseY : 0;
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(z - CHASM_SPEC.centerZ) > CHASM_SPEC.halfWidthZ) {
      return safeBaseY;
    }
    if (x >= CHASM_SPEC.rampStartX && x <= CHASM_SPEC.rampLipX) {
      const u = (x - CHASM_SPEC.rampStartX) / (CHASM_SPEC.rampLipX - CHASM_SPEC.rampStartX);
      return safeBaseY + u * CHASM_SPEC.lipLiftY;
    }
    if (x > CHASM_SPEC.rampLipX && x < CHASM_SPEC.landingBankX) {
      const u = (x - CHASM_SPEC.rampLipX) / (CHASM_SPEC.landingBankX - CHASM_SPEC.rampLipX);
      return safeBaseY + CHASM_SPEC.basinDipY * Math.sin(u * Math.PI);
    }
    if (x >= CHASM_SPEC.landingBankX && x <= CHASM_SPEC.bankEndX) {
      const u = (x - CHASM_SPEC.landingBankX) / (CHASM_SPEC.bankEndX - CHASM_SPEC.landingBankX);
      return safeBaseY + CHASM_SPEC.landingLiftY * Math.sin(u * Math.PI * 0.85 + 0.15);
    }
    return safeBaseY;
  }

  updateChasmJump(dt, rigState, hasIonBoosters = false) {
    if (!Number.isFinite(dt) || !(dt > 0) || !rigState || typeof rigState !== "object") {
      return false;
    }
    if (this.chasmBasinToastCooldown > 0) {
      this.chasmBasinToastCooldown = Math.max(0, this.chasmBasinToastCooldown - dt);
    }
    if (this.chasmCacheCooldown > 0) {
      this.chasmCacheCooldown = Math.max(0, this.chasmCacheCooldown - dt);
    }
    if (this.chasmStarCache) {
      this.chasmStarCache.rotation.y += dt * 2.4;
      this.chasmStarCache.visible = this.chasmCacheCooldown <= 0;
    }

    if (!this.chasmJump) {
      if (
        rigState.x >= 39.2 &&
        rigState.x <= 40.6 &&
        Math.abs(rigState.z - CHASM_SPEC.centerZ) <= 3.4
      ) {
        const vxEast = -Math.sin(rigState.heading) * rigState.speed;
        if (vxEast > 5.2) {
          const ionJump = Boolean(
            hasIonBoosters &&
              (rigState.boosting || rigState.inSurge || Math.abs(rigState.speed) >= 18.0)
          );
          const launchVx = ionJump
            ? Math.min(13.8, Math.max(12.6, vxEast * 0.65))
            : Math.min(7.6, vxEast * 0.55);
          const launchVy = ionJump ? 7.6 : 2.4;
          const launchVz = -Math.cos(rigState.heading) * rigState.speed * 0.22;
          const surfaceY = this.computeChasmSurfaceY(
            rigState.x,
            rigState.z,
            this.baseHeightFn(rigState.x, rigState.z)
          );
          rigState.y = Math.max(rigState.y, surfaceY + 0.16);
          this.chasmJump = {
            ionJump,
            vx: launchVx,
            vy: launchVy,
            vz: launchVz,
            peakY: rigState.y,
          };
          this.audio?.playChasmLaunch?.(ionJump);
        }
      }
    }

    if (!this.chasmJump) return false;

    const jump = this.chasmJump;
    rigState.x += jump.vx * dt;
    rigState.z += jump.vz * dt;
    jump.vy -= 18.0 * dt;
    rigState.y += jump.vy * dt;
    if (rigState.y > jump.peakY) jump.peakY = rigState.y;

    const groundY =
      this.computeChasmSurfaceY(
        rigState.x,
        rigState.z,
        this.baseHeightFn(rigState.x, rigState.z)
      ) + 0.16;

    if (rigState.y <= groundY && jump.vy < 0) {
      rigState.y = groundY;
      const clearedGap = rigState.x >= CHASM_SPEC.landingBankX;
      this.chasmJump = null;
      if (clearedGap) {
        if (this.chasmCacheCooldown <= 0) {
          this.chasmCacheCooldown = 18.0;
          this.spawnCrystalBurstFn(rigState.x, rigState.y + 1.5, rigState.z, 36);
          this.audio?.playCrystalShatter?.(true);
          this.emitRewardFn({
            kind: "chasm_jump_clear",
            shardsEarned: 15,
            message: "Ion jump cleared ice chasm!",
            metricKey: "chasmJumpsCleared",
          });
        }
      } else if (this.chasmBasinToastCooldown <= 0) {
        this.chasmBasinToastCooldown = 5.0;
        this.emitRewardFn({
          kind: "chasm_basin_cushion",
          shardsEarned: 0,
          message: "Soft basin! Add Ion Thrusters!",
          metricKey: null,
        });
      }
    }
    return true;
  }

  findNearestGrapplePod(rigX, rigZ, maxRange = HARPOON_GRAPPLE_RANGE, elevatedOnly = false) {
    if (!Number.isFinite(rigX) || !Number.isFinite(rigZ)) return null;
    const rangeNum = toFiniteNumber(maxRange, HARPOON_GRAPPLE_RANGE);
    let best = null;
    let bestDist = Math.max(0, rangeNum);
    for (const pod of this.icePods) {
      if (!pod.intact) continue;
      if (elevatedOnly && !pod.elevated) continue;
      const d = Math.hypot(pod.x - rigX, pod.z - rigZ);
      if (d <= bestDist) {
        bestDist = d;
        best = pod;
      }
    }
    return best;
  }

  grappleNearestIcePod(rigX, rigY, rigZ, hasTitanHarpoon = false) {
    if (!Number.isFinite(rigX) || !Number.isFinite(rigZ)) {
      return { grappled: false, smashedGround: false, podId: null };
    }
    const safeRigY = Number.isFinite(rigY) ? rigY : 0;
    if (!hasTitanHarpoon) {
      let smashedGround = false;
      for (const pod of this.icePods) {
        if (!pod.intact || pod.elevated) continue;
        if (Math.hypot(pod.x - rigX, pod.z - rigZ) <= 3.2) {
          this._shatterIcePod(pod, 5, "Plow shattered crystal ice pod!", "ice_pod_smashed");
          smashedGround = true;
        }
      }
      return { grappled: false, smashedGround, podId: null };
    }

    const pod = this.findNearestGrapplePod(rigX, rigZ, HARPOON_GRAPPLE_RANGE, false);
    if (!pod) {
      return { grappled: false, podId: null };
    }

    const cable = this._spawnHarpoonCable(rigX, safeRigY + 2.3, rigZ, pod.x, pod.worldY, pod.z);
    this._shatterIcePod(pod, 6, "Starlight winch shattered ice pod!", "ice_pod_grappled", true);
    return { grappled: true, podId: pod.id, cable };
  }

  _shatterIcePod(pod, shards, message, kind, viaHarpoon = false) {
    pod.intact = false;
    pod.respawnTimer = 32.0;
    pod.podMesh.visible = false;
    this.spawnCrystalBurstFn(pod.x, pod.worldY, pod.z, 26);
    if (viaHarpoon) {
      this.audio?.playHarpoonWinch?.();
    } else {
      this.audio?.playCrystalShatter?.(false);
    }
    this.emitRewardFn({
      kind,
      shardsEarned: shards,
      message,
      metricKey: "icePodsShattered",
    });
  }

  refreshIntactPods() {
    for (const pod of this.icePods) {
      pod.intact = true;
      pod.respawnTimer = 0;
      pod.podMesh.visible = true;
    }
  }

  triggerRimeBlast(originX, originZ, radius = RIME_BLAST_RADIUS) {
    const rawOx = toFiniteNumber(originX, 0);
    const rawOz = toFiniteNumber(originZ, 0);
    const rawRad = toFiniteNumber(radius, RIME_BLAST_RADIUS);
    const ox = Math.max(-120, Math.min(120, rawOx));
    const oz = Math.max(-120, Math.min(120, rawOz));
    const safeRadius = Math.max(0.5, Math.min(80, rawRad));
    this._spawnShockRing(ox, oz, safeRadius, 0x45f0df);
    this.audio?.playRimeBlast?.();

    for (const drift of this.permafrostDrifts) {
      if (drift.integrity > 0 && Math.hypot(drift.x - ox, drift.z - oz) <= safeRadius + drift.radius) {
        drift.integrity = 0;
        drift.refrostTimer = 42.0;
        drift.group.visible = false;
        this.tintSnowDiscFn(drift.x, drift.z, drift.radius, "thawed");
      }
    }

    for (const den of this.foxDens) {
      if (Math.hypot(den.x - ox, den.z - oz) <= safeRadius) {
        this._warmFoxDen(den, 18.0, false);
      }
    }

    let poppedCount = 0;
    for (const u of this.rimeUnits) {
      if (u.state === "respawning") continue;
      const dx = u.x - ox;
      const dz = u.z - oz;
      const dist = Math.hypot(dx, dz);
      if (dist <= safeRadius) {
        if (u.shieldIntact) {
          u.shieldIntact = false;
          if (u.shieldMesh) u.shieldMesh.visible = false;
        }
        if (dist <= 10.5) {
          this._popRimeUnit(u, 0, null);
          poppedCount += 1;
        } else {
          const inv = 1 / Math.max(0.01, dist);
          u.vx = dx * inv * 18.0;
          u.vz = dz * inv * 18.0;
          u.vy = 5.2;
          u.state = "knockback";
        }
      }
    }

    if (poppedCount > 0) {
      this.emitRewardFn({
        kind: "rime_blast_clear",
        shardsEarned: poppedCount * 6,
        message: "Gate blast cleared nearby rime!",
        metricKey: "rimeCreepsCleared",
        metricDelta: poppedCount,
      });
    }
  }

  _warmFoxDen(den, shieldSec = 28.0, emitReward = true) {
    den.chillLevel = 0;
    den.isChilled = false;
    den.thermalShieldSec = Math.max(den.thermalShieldSec, shieldSec);
    den.hearthMat.color.setHex(0xffd166);
    den.hearthMat.emissive.setHex(0xf4a62a);
    den.moatRing.visible = den.thermalShieldSec > 0;
    for (const c of den.cocoonMeshes) c.visible = false;

    for (const u of this.rimeUnits) {
      if (u.state !== "respawning" && Math.hypot(u.x - den.x, u.z - den.z) <= 6.5) {
        if (u.shieldIntact) {
          u.shieldIntact = false;
          if (u.shieldMesh) u.shieldMesh.visible = false;
        }
        this._popRimeUnit(u, 0, null);
      }
    }

    if (emitReward) {
      this.spawnCrystalBurstFn(den.x, den.y + 1.8, den.z, 34);
      this.audio?.playThermalTrenchThaw?.();
      this.emitRewardFn({
        kind: "fox_den_thawed",
        shardsEarned: 12,
        message: "Thermal trench warmed fox den!",
        metricKey: "foxDensThawed",
      });
    }
  }

  _popRimeUnit(u, shards = 6, eventPayload = null) {
    this.spawnCrystalBurstFn(u.x, u.y + 0.8, u.z, u.isCaptain ? 32 : 22);
    u.state = "respawning";
    u.respawnTimer = 15.0;
    u.vx = 0;
    u.vy = 0;
    u.vz = 0;
    u.group.visible = false;
    if (eventPayload && shards >= 0) {
      this.emitRewardFn({
        kind: eventPayload.kind,
        shardsEarned: shards,
        message: eventPayload.message,
        metricKey: "rimeCreepsCleared",
      });
    }
  }

  updateVisualFX(dt) {
    if (!Number.isFinite(dt) || !(dt > 0)) return;
    for (const r of this.shockRings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.mesh.visible = false;
        continue;
      }
      const p = 1 - r.life / r.maxLife;
      r.mesh.scale.setScalar(1 + p * r.maxRadius);
      r.mat.opacity = Math.max(0, (1 - p) * 0.85);
    }
    for (const c of this.harpoonCables) {
      if (c.life <= 0) continue;
      c.life -= dt;
      c.mesh.material.opacity = Math.max(0, c.life * 2.1);
      if (c.life <= 0) c.mesh.visible = false;
    }
  }

  update(dt, opts = {}) {
    const safeOpts = opts && typeof opts === "object" ? opts : {};
    const {
      paused = false,
      rigState = null,
      plowX = 0,
      plowZ = 0,
      hasWideBlade = false,
      hasIonBoosters = false,
      hasTitanHarpoon = false,
    } = safeOpts;
    // Line 1 Mandatory Math-Pause Guard: bitwise zero opposition delta while paused!
    if (
      paused ||
      this.paused ||
      !Number.isFinite(dt) ||
      !(dt > 0) ||
      !rigState ||
      typeof rigState !== "object"
    ) {
      return;
    }

    this.elapsed += dt;
    if (this.ventToastCooldown > 0) this.ventToastCooldown = Math.max(0, this.ventToastCooldown - dt);
    if (this.deflectCooldown > 0) this.deflectCooldown = Math.max(0, this.deflectCooldown - dt);
    if (this.harpoonAutoCooldown > 0) this.harpoonAutoCooldown = Math.max(0, this.harpoonAutoCooldown - dt);
    if (this.rigThermalChargeSec > 0) this.rigThermalChargeSec = Math.max(0, this.rigThermalChargeSec - dt);

    // 1. Geothermal Vent -> Thermal Trench -> Spirit-Fox Den Circuit
    for (const vent of this.geothermalVents) {
      vent.plume.scale.y = 0.88 + Math.sin(this.elapsed * 3.6 + vent.x) * 0.16;
      if (
        Math.hypot(plowX - vent.x, plowZ - vent.z) <= 3.8 ||
        Math.hypot(rigState.x - vent.x, rigState.z - vent.z) <= 3.8
      ) {
        const wasCold = this.rigThermalChargeSec <= 0.5;
        this.rigThermalChargeSec = 9.0;
        if (wasCold && this.ventToastCooldown <= 0) {
          this.ventToastCooldown = 5.0;
          this.audio?.playThermalCharge?.();
          this.emitRewardFn({
            kind: "thermal_vent_charged",
            shardsEarned: 0,
            message: "Blade charged with vent warmth!",
            metricKey: null,
          });
        }
      }
    }

    for (const geyser of this.geothermalGeysers) {
      geyser.column.scale.y = 0.85 + Math.sin(this.elapsed * 4.4 + geyser.z) * 0.22;
    }

    // 2. Permafrost Drift Melting with wide_blade & gentle refrost cycle
    for (const drift of this.permafrostDrifts) {
      if (drift.integrity <= 0) {
        drift.refrostTimer -= dt;
        if (drift.refrostTimer <= 0) {
          drift.integrity = 1.0;
          drift.group.visible = true;
          drift.group.scale.setScalar(1);
          this.tintSnowDiscFn(drift.x, drift.z, drift.radius, "permafrost");
        }
        continue;
      }
      if (
        hasWideBlade &&
        Math.abs(rigState.speed) > 1.0 &&
        (Math.hypot(plowX - drift.x, plowZ - drift.z) <= drift.radius + 1.5 ||
          Math.hypot(rigState.x - drift.x, rigState.z - drift.z) <= drift.radius + 0.5)
      ) {
        drift.integrity = 0;
        drift.refrostTimer = 42.0;
        drift.group.visible = false;
        this.tintSnowDiscFn(drift.x, drift.z, drift.radius, "melted");
        this.spawnCrystalBurstFn(drift.x, drift.y + 1.0, drift.z, 28);
        this.audio?.playPermafrostMelt?.();
        this.emitRewardFn({
          kind: "permafrost_melted",
          shardsEarned: 8,
          message: "Magma blade melted deep permafrost!",
          metricKey: "permafrostMelted",
        });
      }
    }

    // 3. Crystal Ice-Pod Plow Smash & Auto Spire Grapple
    const podHitRadius = hasWideBlade ? 3.8 : 2.6;
    for (const pod of this.icePods) {
      if (!pod.intact) {
        pod.respawnTimer -= dt;
        if (pod.respawnTimer <= 0) {
          pod.intact = true;
          pod.podMesh.visible = true;
        }
        continue;
      }
      pod.podMesh.rotation.y += dt * 1.6;
      if (!pod.elevated && Math.hypot(plowX - pod.x, plowZ - pod.z) <= podHitRadius && Math.abs(rigState.speed) > 0.8) {
        this._shatterIcePod(pod, 5, "Plow shattered crystal ice pod!", "ice_pod_smashed", false);
      } else if (
        pod.elevated &&
        hasTitanHarpoon &&
        this.harpoonAutoCooldown <= 0 &&
        Math.abs(rigState.speed) > 1.0 &&
        Math.hypot(rigState.x - pod.x, rigState.z - pod.z) <= HARPOON_AUTO_RANGE
      ) {
        this.harpoonAutoCooldown = 1.6;
        this._spawnHarpoonCable(rigState.x, rigState.y + 2.3, rigState.z, pod.x, pod.worldY, pod.z);
        this._shatterIcePod(pod, 6, "Starlight winch shattered ice pod!", "ice_pod_grappled", true);
      }
    }

    // 4. Spirit-Fox Den Thermal Trench Completion & Warm Hopping
    for (const den of this.foxDens) {
      if (den.thermalShieldSec > 0) {
        den.thermalShieldSec = Math.max(0, den.thermalShieldSec - dt);
        den.moatRing.visible = den.thermalShieldSec > 0;
        den.moatRing.rotation.z = this.elapsed * 0.9;
      }

      const dDenPlow = Math.hypot(plowX - den.x, plowZ - den.z);
      const dDenRig = Math.hypot(rigState.x - den.x, rigState.z - den.z);
      if (this.rigThermalChargeSec > 0 && Math.min(dDenPlow, dDenRig) <= 4.6) {
        const neededWarm = den.isChilled || den.chillLevel > 0 || den.thermalShieldSec <= 2.0;
        if (neededWarm) {
          this._warmFoxDen(den, 28.0, true);
        }
      } else if (
        den.isChilled &&
        (hasWideBlade || rigState.boosting || rigState.inSurge) &&
        Math.min(dDenPlow, dDenRig) <= 4.0
      ) {
        this._warmFoxDen(den, 10.0, false);
        this.emitRewardFn({
          kind: "fox_den_warmed_plow",
          shardsEarned: 6,
          message: "Warm plow woke sleepy foxes!",
          metricKey: "foxDensThawed",
        });
      }

      den.hearthMesh.rotation.y += dt * 1.4;
      if (den.isChilled) {
        const breathe = 1 + Math.sin(this.elapsed * 2.2) * 0.04;
        for (const c of den.cocoonMeshes) {
          c.visible = true;
          c.scale.set(1.12 * breathe, 0.8 * breathe, 1.12 * breathe);
        }
        for (const f of den.foxMeshes) {
          f.position.y = 0.25;
        }
      } else {
        for (const c of den.cocoonMeshes) c.visible = false;
        den.foxMeshes.forEach((f, idx) => {
          f.position.y = 0.35 + Math.abs(Math.sin(this.elapsed * 4.8 + idx * 1.6)) * 0.42;
        });
      }
    }

    // 5. Rime-Creeps & Shielded Rime-Captains Kinematics
    const knockRadius = hasWideBlade
      ? BASE_KNOCKBACK_RADIUS * WIDE_BLADE_KNOCKBACK_MULT
      : BASE_KNOCKBACK_RADIUS;
    const fwdX = -Math.sin(rigState.heading);
    const fwdZ = -Math.cos(rigState.heading);

    for (const u of this.rimeUnits) {
      if (u.state === "respawning") {
        u.respawnTimer -= dt;
        if (u.respawnTimer <= 0) {
          u.x = u.fissureX;
          u.z = u.fissureZ;
          u.y = this.baseHeightFn(u.x, u.z) + 0.75;
          u.vx = 0;
          u.vy = 0;
          u.vz = 0;
          u.state = "creeping";
          u.shieldIntact = Boolean(u.isCaptain);
          if (u.shieldMesh) u.shieldMesh.visible = u.shieldIntact;
          u.group.position.set(u.x, u.y, u.z);
          u.group.visible = true;
        }
        continue;
      }

      if (u.state === "geyser_launch") {
        u.stateTimer -= dt;
        u.y += u.vy * dt;
        u.group.position.set(u.x, u.y, u.z);
        u.group.rotation.y += dt * 9.0;
        if (u.stateTimer <= 0) {
          this.audio?.playGeyserBurst?.();
          this._popRimeUnit(u, u.isCaptain ? 12 : 6, {
            kind: "rime_geyser_burst",
            message: "Geyser popped rime into shards!",
          });
        }
        continue;
      }

      if (u.state === "knockback") {
        u.x += u.vx * dt;
        u.z += u.vz * dt;
        u.vy -= 16.0 * dt;
        const groundY = this.baseHeightFn(u.x, u.z) + 0.75;
        u.y = Math.max(groundY, u.y + u.vy * dt);
        const drag = Math.exp(-1.75 * dt);
        u.vx *= drag;
        u.vz *= drag;
        u.group.position.set(u.x, u.y, u.z);
        u.group.rotation.y += dt * 6.5;

        // Check Geothermal Geyser fountain launch
        let hitGeyser = false;
        for (const geyser of this.geothermalGeysers) {
          if (Math.hypot(u.x - geyser.x, u.z - geyser.z) <= 3.8) {
            u.x = geyser.x;
            u.z = geyser.z;
            u.vy = 22.0;
            u.state = "geyser_launch";
            u.stateTimer = 0.45;
            hitGeyser = true;
            break;
          }
        }
        if (hitGeyser) continue;

        // Check Outer Glacier Cliff Rim launch
        if (Math.hypot(u.x, u.z) >= 64.5) {
          this.audio?.playCrystalShatter?.(false);
          this._popRimeUnit(u, u.isCaptain ? 12 : 6, {
            kind: "rime_cliff_launch",
            message: "Launched rime over glacier cliff!",
          });
          continue;
        }

        if (Math.hypot(u.vx, u.vz) < 1.2 && u.y <= groundY + 0.05) {
          u.vx = 0;
          u.vy = 0;
          u.vz = 0;
          u.state = "creeping";
        }
        continue;
      }

      // State === "creeping"
      const den = this.foxDens.find((d) => d.id === u.targetDenId) || this.foxDens[0];
      const toDenX = den.x - u.x;
      const toDenZ = den.z - u.z;
      const distDen = Math.hypot(toDenX, toDenZ);

      // Shielded moat around warm den melts creeps on contact!
      if (den.thermalShieldSec > 0 && distDen <= 4.5) {
        this.audio?.playPermafrostMelt?.();
        this._popRimeUnit(u, 5, {
          kind: "rime_moat_melt",
          message: "Thermal moat melted rime slime!",
        });
        continue;
      }

      if (distDen > 2.6) {
        const creepSpd = u.isCaptain ? 1.1 : 1.35;
        u.x += (toDenX / distDen) * creepSpd * dt;
        u.z += (toDenZ / distDen) * creepSpd * dt;
      } else if (den.thermalShieldSec <= 0) {
        den.chillLevel = Math.min(1, den.chillLevel + 0.18 * dt);
        if (den.chillLevel >= 1 && !den.isChilled) {
          den.isChilled = true;
          den.hearthMat.color.setHex(0x62d8f5);
          den.hearthMat.emissive.setHex(0x0284c7);
        }
      }

      u.hopPhase += dt * 4.2;
      const hop = Math.sin(u.hopPhase);
      u.y = this.baseHeightFn(u.x, u.z) + 0.75 + Math.max(0, hop) * 0.26;
      u.body.scale.set(1.08 - 0.1 * hop, 0.84 + 0.12 * hop, 1.08 - 0.1 * hop);
      if (u.shieldMesh && u.shieldIntact) {
        u.shieldMesh.rotation.y += dt * 1.5;
      }
      u.group.position.set(u.x, u.y, u.z);
      u.group.rotation.y = Math.atan2(toDenX, toDenZ);

      // Check Plow Knockback / Captain Shield Interaction
      const dPlow = Math.hypot(u.x - plowX, u.z - plowZ);
      const dRig = Math.hypot(u.x - rigState.x, u.z - rigState.z);
      const hitDist = Math.min(dPlow, dRig);

      if (Math.abs(rigState.speed) > 0.9 && hitDist <= knockRadius) {
        if (u.isCaptain && u.shieldIntact) {
          const canShatter =
            hasIonBoosters &&
            (rigState.boosting || rigState.inSurge || Math.abs(rigState.speed) >= 18.0);
          if (canShatter) {
            u.shieldIntact = false;
            if (u.shieldMesh) u.shieldMesh.visible = false;
            this.spawnCrystalBurstFn(u.x, u.y + 1.1, u.z, 36);
            this.audio?.playShieldShatter?.();
            this._launchUnitKnockback(u, fwdX, fwdZ, rigState.speed, hasWideBlade);
            this.emitRewardFn({
              kind: "captain_shield_shatter",
              shardsEarned: 10,
              message: "Ion boost shattered frost shield!",
              metricKey: "rimeCaptainsShattered",
            });
          } else {
            rigState.speed = -Math.max(4.8, Math.abs(rigState.speed) * 0.5);
            const pushX = rigState.x - u.x;
            const pushZ = rigState.z - u.z;
            const pushLen = Math.max(0.01, Math.hypot(pushX, pushZ));
            rigState.x = u.x + (pushX / pushLen) * (knockRadius + 1.2);
            rigState.z = u.z + (pushZ / pushLen) * (knockRadius + 1.2);
            this.audio?.playMagneticRepel?.();
            if (this.deflectCooldown <= 0) {
              this.deflectCooldown = 2.2;
              this.emitRewardFn({
                kind: "captain_deflect",
                shardsEarned: 0,
                message: "Frost shield! Use Ion Thrusters!",
                metricKey: null,
              });
            }
          }
        } else {
          this.audio?.playRimeBoop?.();
          this._launchUnitKnockback(u, fwdX, fwdZ, rigState.speed, hasWideBlade);
        }
      }
    }

    this.updateVisualFX(dt);
  }

  _launchUnitKnockback(u, fwdX, fwdZ, rigSpeed, hasWideBlade) {
    const radLen = Math.max(0.01, Math.hypot(u.x, u.z));
    const radX = u.x / radLen;
    const radZ = u.z / radLen;

    let assistX = 0;
    let assistZ = 0;
    for (const g of this.geothermalGeysers) {
      const gx = g.x - u.x;
      const gz = g.z - u.z;
      const gd = Math.hypot(gx, gz);
      if (gd > 0.2 && gd <= 15.0) {
        const dot = (gx / gd) * fwdX + (gz / gd) * fwdZ;
        if (dot > 0.45) {
          assistX = (gx / gd) * 0.42;
          assistZ = (gz / gd) * 0.42;
          break;
        }
      }
    }

    let dirX = fwdX * 0.62 + radX * 0.38 + assistX;
    let dirZ = fwdZ * 0.62 + radZ * 0.38 + assistZ;
    const norm = Math.max(0.01, Math.hypot(dirX, dirZ));
    dirX /= norm;
    dirZ /= norm;

    const v0 = Math.max(14.5, Math.abs(rigSpeed) * 1.25) * (hasWideBlade ? 1.25 : 1.0);
    u.vx = dirX * v0;
    u.vz = dirZ * v0;
    u.vy = 5.4;
    u.state = "knockback";
  }
}
